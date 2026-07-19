import { getCustomGameDefinition } from '@/data/custom-game-registry'
import type {
  CustomGameCode,
  CustomGameExitTrigger,
  EmotionGameBadgePayload,
  EmotionGameCompletionStatus,
  EmotionGameDifficulty,
} from '@/types/emotional/games'
import type { TrainingEntryCode } from '@/utils/training-entry'
import { TrainingSessionWriter } from './training-session-writer'

// 认知游戏家族落库 API（K 系列）。
// 与 EmotionalGamesAPI 同签名，供 GameContainer 按 moduleCode dispatch。
// 关键差异：认知游戏不写 game_emotion_records（emotional 专线明细表），
// 只写统一主表 training_session，source_table 用合成名 cognitive_game_inline
// （符合 PRD §3.3 + unified schema §3.2「不新建游戏表」），
// actual_params 显式透传进 summary_payload 顶层以支撑 IEP 级纵向追踪。

type DbLike = {
  all?: (sql: string, params?: any[]) => any[]
  get: (sql: string, params?: any[]) => any
  run: (sql: string, params?: any[]) => any
  getRawDB?: () => any
  lastInsertId?: () => number
  saveNow?: () => Promise<void>
}

interface CognitiveGameSessionInput {
  studentId: number
  gameCode: CustomGameCode
  startedAt: string
  durationMs: number
  difficultyLevel: EmotionGameDifficulty
  completionStatus: EmotionGameCompletionStatus
  performanceData: Record<string, any>
  badge?: EmotionGameBadgePayload
  exitTrigger?: CustomGameExitTrigger | null
  sessionGroupId?: string | null
  sessionParticipants?: number[]
}

interface CognitiveGameSessionResult {
  recordId: number
  badgeId?: number
  badgeUnlockCount?: number
}

function getActiveDb(): DbLike {
  const activeDb = (window as Window & { db?: DbLike }).db
  if (!activeDb) {
    throw new Error('Database is not initialized on window.db')
  }
  return activeDb
}

function getRawDb(db: DbLike) {
  return typeof db.getRawDB === 'function' ? db.getRawDB() : db
}

function getLastInsertId(db: DbLike): number {
  if (typeof db.lastInsertId === 'function') {
    return db.lastInsertId()
  }

  const row = db.get('SELECT last_insert_rowid() as id')
  return row?.id || 0
}

function resolveCustomGameDefinition(gameCode: string) {
  const definition = getCustomGameDefinition(gameCode)
  if (!definition) {
    throw new Error(`Unknown custom game definition: ${gameCode}`)
  }

  return definition
}

function normalizeStudentId(value: unknown): number | null {
  const resolved = Number(value)
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return null
  }

  return Math.floor(resolved)
}

function normalizeParticipantStudentIds(studentIds: unknown[]): number[] {
  return Array.from(new Set(
    studentIds
      .map((value) => normalizeStudentId(value))
      .filter((value): value is number => value !== null),
  ))
}

function normalizeSessionGroupId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

function deriveExitTrigger(
  completionStatus: EmotionGameCompletionStatus,
  performanceData: Record<string, any>,
  explicitTrigger?: CustomGameExitTrigger | null,
): CustomGameExitTrigger | null {
  if (explicitTrigger) {
    return explicitTrigger
  }

  if (completionStatus === 'completed') {
    return 'game_complete'
  }

  return performanceData.event === 'quiet_exit' ? 'user_exit' : null
}

function deriveEndedAt(startedAt: string, durationMs: number): string | null {
  const startedTimestamp = Date.parse(startedAt)
  if (!Number.isFinite(startedTimestamp)) {
    return null
  }

  return new Date(startedTimestamp + Math.max(0, durationMs)).toISOString()
}

function pickScalarSummaryMetrics(performanceData: Record<string, any>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(performanceData).filter(([, value]) =>
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ),
  )
}

function getStudentTrainingContext(db: DbLike, studentId: number) {
  const student = db.get(
    'SELECT id, current_class_id, current_class_name FROM student WHERE id = ?',
    [studentId],
  )

  if (!student?.id) {
    throw new Error(`Student not found for cognitive game persistence: ${studentId}`)
  }

  return {
    studentId,
    classId: student.current_class_id || null,
    className: student.current_class_name || null,
  }
}

// 认知游戏的 accuracy / avgResponseTimeMs 直接从 performanceData 取
// （K03 在组件 buildPerformanceData 里已算好 accuracy_ratio / average_response_ms），
// 不走 emotional 的 deriveAccuracyRate gameCode switch。
function resolveAccuracyFromPerformance(
  performanceData: Record<string, any>,
  completionStatus: EmotionGameCompletionStatus,
): number | null {
  const raw = performanceData?.accuracy_ratio
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(1, raw))
  }

  return completionStatus === 'completed' ? 1 : null
}

function resolveAvgResponseFromPerformance(performanceData: Record<string, any>): number | null {
  const raw = performanceData?.average_response_ms
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.round(raw)
  }

  return null
}

// 合成 source_record_id：同进程内严格递增，跨进程靠 ms 时间差规避。
// UNIQUE(source_table, source_record_id) 在极端同 ms 撞库时由 upsert ON CONFLICT 兜底（UPDATE 而非 INSERT）。
let cognitiveInlineCounter = 0
function nextCognitiveInlineId(): number {
  cognitiveInlineCounter = (cognitiveInlineCounter + 1) % 1000
  return Date.now() * 1000 + cognitiveInlineCounter
}

function buildCognitiveSummaryPayload(input: {
  gameCode: CustomGameCode
  trainingEntryCode: TrainingEntryCode
  difficultyLevel: EmotionGameDifficulty
  sessionGroupId?: string | null
  sessionParticipants: number[]
  exitTrigger: CustomGameExitTrigger | null
  badge?: EmotionGameBadgePayload
  badgeUnlockCount?: number | null
  performanceData: Record<string, any>
}) {
  return {
    gameCode: input.gameCode,
    trainingEntryCode: input.trainingEntryCode,
    difficultyLevel: input.difficultyLevel,
    sessionGroupId: input.sessionGroupId || null,
    sessionParticipants: [...input.sessionParticipants],
    exitTrigger: input.exitTrigger,
    badgeCode: input.badge?.badgeCode || null,
    badgeName: input.badge?.badgeName || null,
    badgeUnlockCount: input.badgeUnlockCount ?? null,
    metrics: pickScalarSummaryMetrics(input.performanceData || {}),
    // 显式透传 actual_params（pickScalarSummaryMetrics 会过滤嵌套对象），
    // IEP 级纵向追踪的本局实际生成参数靠这里保留。
    actual_params: input.performanceData?.actual_params ?? null,
  }
}

export class CognitiveGamesAPI {
  async persistSession(input: CognitiveGameSessionInput): Promise<CognitiveGameSessionResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)
    const definition = resolveCustomGameDefinition(input.gameCode)
    const studentContext = getStudentTrainingContext(db, input.studentId)
    const accuracyRate = resolveAccuracyFromPerformance(input.performanceData, input.completionStatus)
    const avgResponseTimeMs = resolveAvgResponseFromPerformance(input.performanceData)
    const exitTrigger = deriveExitTrigger(input.completionStatus, input.performanceData, input.exitTrigger)
    const sessionParticipants = normalizeParticipantStudentIds(
      input.sessionParticipants?.length
        ? input.sessionParticipants
        : [input.studentId],
    )
    const sessionGroupId = normalizeSessionGroupId(input.sessionGroupId)

    rawDb.run('BEGIN TRANSACTION')

    try {
      const sourceRecordId = nextCognitiveInlineId()

      let badgeResult: { badgeId: number; unlockCount: number } | null = null
      if (input.completionStatus === 'completed' && input.badge) {
        badgeResult = this.upsertBadge(db, input.studentId, input.gameCode, input.badge)
      }

      new TrainingSessionWriter(db).upsertSession({
        studentId: input.studentId,
        moduleCode: definition.moduleCode,
        entryCode: definition.trainingEntryCode,
        sessionFamily: 'cognitive_game',
        resourceType: 'game',
        taskNameSnapshot: definition.name,
        classId: studentContext.classId,
        className: studentContext.className,
        startedAt: input.startedAt,
        endedAt: deriveEndedAt(input.startedAt, input.durationMs),
        durationMs: input.durationMs,
        completionStatus: input.completionStatus,
        accuracyRate,
        avgResponseTimeMs,
        summaryPayload: buildCognitiveSummaryPayload({
          gameCode: input.gameCode,
          trainingEntryCode: definition.trainingEntryCode,
          difficultyLevel: input.difficultyLevel,
          sessionGroupId,
          sessionParticipants,
          exitTrigger,
          badge: input.badge,
          badgeUnlockCount: badgeResult?.unlockCount || null,
          performanceData: input.performanceData,
        }),
        sharedSession: null,
        sourceTable: 'cognitive_game_inline',
        sourceRecordId,
      })

      rawDb.run('COMMIT')

      if (typeof db.saveNow === 'function') {
        await db.saveNow()
      }

      return {
        recordId: sourceRecordId,
        badgeId: badgeResult?.badgeId,
        badgeUnlockCount: badgeResult?.unlockCount,
      }
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  // Phase 0 认知游戏均为单人（maxPlayers: 1），不实现组持久化。
  // 若未来加入双人认知游戏，再仿 EmotionalGamesAPI.persistSessionGroup 实现。
  async persistSessionGroup(): Promise<never> {
    throw new Error('CognitiveGamesAPI.persistSessionGroup is not supported in Phase 0 (cognitive games are single-player)')
  }

  private upsertBadge(
    db: DbLike,
    studentId: number,
    gameCode: CustomGameCode,
    badge: EmotionGameBadgePayload,
  ) {
    const existing = db.get(
      `SELECT id, unlock_count
       FROM student_badges
       WHERE student_id = ? AND badge_code = ?`,
      [studentId, badge.badgeCode],
    )

    if (existing?.id) {
      db.run(
        `UPDATE student_badges
         SET unlock_count = unlock_count + 1,
             badge_name = ?,
             game_code = ?,
             last_earned_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [badge.badgeName, gameCode, existing.id],
      )

      return {
        badgeId: Number(existing.id),
        unlockCount: Number(existing.unlock_count || 0) + 1,
      }
    }

    db.run(
      `INSERT INTO student_badges (
        student_id, badge_code, badge_name, game_code, unlock_count, first_earned_at, last_earned_at
      ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [studentId, badge.badgeCode, badge.badgeName, gameCode],
    )

    return {
      badgeId: getLastInsertId(db),
      unlockCount: 1,
    }
  }
}
