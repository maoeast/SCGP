import type {
  EmotionGameBadgePayload,
  EmotionGameCode,
  EmotionGameCompletionStatus,
  EmotionGameDifficulty,
  GameEmotionRecord,
} from '@/types/emotional/games'
import { TrainingSessionWriter } from './training-session-writer'

type DbLike = {
  all?: (sql: string, params?: any[]) => any[]
  get: (sql: string, params?: any[]) => any
  run: (sql: string, params?: any[]) => any
  getRawDB?: () => any
  lastInsertId?: () => number
  saveNow?: () => Promise<void>
}

interface PersistEmotionGameSessionInput {
  studentId: number
  gameCode: EmotionGameCode
  startedAt: string
  durationMs: number
  difficultyLevel: EmotionGameDifficulty
  completionStatus: EmotionGameCompletionStatus
  performanceData: Record<string, any>
  badge?: EmotionGameBadgePayload
}

interface PersistEmotionGameSessionResult {
  recordId: number
  badgeId?: number
  badgeUnlockCount?: number
}

export interface EmotionalGameTrainingRecordItem {
  id: number
  student_id: number
  task_id: null
  task_name: string
  resource_id: null
  resource_type: 'game'
  session_type: 'emotion_game'
  entry_code: 'emotional-regulation'
  timestamp: number
  duration: number
  difficulty_level: EmotionGameDifficulty
  accuracy_rate: number | null
  avg_response_time: number | null
  raw_data: Record<string, any>
  class_id: null
  class_name: null
  module_code: 'emotional'
  created_at: string
  completion_status: EmotionGameCompletionStatus
  game_code: EmotionGameCode
  record_source: 'emotional_game'
}

const EMOTIONAL_GAME_ENTRY_CODE = 'emotional-regulation'

const EMOTIONAL_GAME_TITLE_MAP: Record<EmotionGameCode, string> = {
  G01_BALLOON: '深呼吸热气球',
  G03_FOREST: '音量魔法森林',
  G04_WIPE_ICE: '擦亮坏心情',
  G07_MONSTER: '喂食情绪小怪兽',
  G08_ENERGY_BALL: '表情能量球',
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

function queryAll(db: DbLike, sql: string, params: any[] = []) {
  if (typeof db.all === 'function') {
    return db.all(sql, params)
  }

  const rawDb = getRawDb(db)

  if (typeof rawDb.all === 'function') {
    return rawDb.all(sql, params)
  }

  if (typeof rawDb.prepare === 'function') {
    const stmt = rawDb.prepare(sql)
    if (params.length > 0 && typeof stmt.bind === 'function') {
      stmt.bind(params.map((param) => param === undefined ? null : param))
    }

    const rows: any[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  }

  return []
}

function getLastInsertId(db: DbLike): number {
  if (typeof db.lastInsertId === 'function') {
    return db.lastInsertId()
  }

  const row = db.get('SELECT last_insert_rowid() as id')
  return row?.id || 0
}

function parsePerformanceData(raw: unknown): Record<string, any> {
  if (!raw) {
    return {}
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  if (typeof raw === 'object') {
    return raw as Record<string, any>
  }

  return {}
}

function averageNumericValues(values: unknown): number | null {
  if (!Array.isArray(values)) {
    return null
  }

  const normalized = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0)

  if (normalized.length === 0) {
    return null
  }

  return Math.round(normalized.reduce((sum, value) => sum + value, 0) / normalized.length)
}

function deriveAccuracyRate(
  gameCode: EmotionGameCode,
  performanceData: Record<string, any>,
  completionStatus: EmotionGameCompletionStatus,
): number | null {
  switch (gameCode) {
    case 'G01_BALLOON': {
      const successfulCycles = Number(performanceData.successful_cycles || 0)
      const failedReleases = Number(performanceData.failed_releases || 0)
      const autoReleaseCount = Number(performanceData.auto_release_count || 0)
      const totalAttempts = successfulCycles + failedReleases + autoReleaseCount
      if (totalAttempts > 0) {
        return successfulCycles / totalAttempts
      }
      break
    }
    case 'G03_FOREST': {
      const targetHits = Number(performanceData.target_hits || 0)
      const warningCount = Number(performanceData.warning_count || 0)
      const totalChecks = targetHits + warningCount
      if (totalChecks > 0) {
        return targetHits / totalChecks
      }

      const stableVoiceMs = Number(performanceData.stable_voice_ms || 0)
      const difficultyGoalMs = Number(performanceData.difficulty_goal_ms || 0)
      if (difficultyGoalMs > 0) {
        return Math.max(0, Math.min(1, stableVoiceMs / difficultyGoalMs))
      }
      break
    }
    case 'G04_WIPE_ICE': {
      const clearedRatioPeak = Number(performanceData.cleared_ratio_peak)
      if (Number.isFinite(clearedRatioPeak)) {
        return Math.max(0, Math.min(1, clearedRatioPeak))
      }
      break
    }
    case 'G07_MONSTER': {
      const correctDrops = Number(performanceData.correct_drops || 0)
      const wrongDrops = Number(performanceData.wrong_drops || 0)
      const totalDrops = correctDrops + wrongDrops
      if (totalDrops > 0) {
        return correctDrops / totalDrops
      }
      break
    }
  }

  return completionStatus === 'completed' ? 1 : null
}

function deriveAvgResponseTime(
  gameCode: EmotionGameCode,
  performanceData: Record<string, any>,
): number | null {
  switch (gameCode) {
    case 'G01_BALLOON':
      return averageNumericValues(performanceData.inhale_samples_ms)
    case 'G03_FOREST': {
      const stableVoiceMs = Number(performanceData.stable_voice_ms || 0)
      const targetHits = Number(performanceData.target_hits || 0)
      if (stableVoiceMs > 0 && targetHits > 0) {
        return Math.round(stableVoiceMs / targetHits)
      }
      return null
    }
    default:
      return null
  }
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

function normalizeTrainingRecord(row: any): EmotionalGameTrainingRecordItem {
  const performanceData = parsePerformanceData(row.performance_data)
  const completionStatus = (row.completion_status || 'completed') as EmotionGameCompletionStatus
  const gameCode = row.game_code as EmotionGameCode
  const startedAt = Date.parse(row.start_time || row.created_at || '')
  const createdAt = row.created_at || row.start_time || ''
  const timestamp = Number.isFinite(startedAt) ? startedAt : 0

  return {
    id: Number(row.id),
    student_id: Number(row.student_id),
    task_id: null,
    task_name: EMOTIONAL_GAME_TITLE_MAP[gameCode] || '情绪小游戏',
    resource_id: null,
    resource_type: 'game',
    session_type: 'emotion_game',
    entry_code: EMOTIONAL_GAME_ENTRY_CODE,
    timestamp,
    duration: Number(row.duration_ms || 0),
    difficulty_level: Number(row.difficulty_level || 1) as EmotionGameDifficulty,
    accuracy_rate: deriveAccuracyRate(gameCode, performanceData, completionStatus),
    avg_response_time: deriveAvgResponseTime(gameCode, performanceData),
    raw_data: performanceData,
    class_id: null,
    class_name: null,
    module_code: 'emotional',
    created_at: createdAt,
    completion_status: completionStatus,
    game_code: gameCode,
    record_source: 'emotional_game',
  }
}

/**
 * 运行时迁移: 如果 game_emotion_records 的 CHECK 约束不包含新游戏代码，重建表
 * SQLite 不支持 ALTER CONSTRAINT，只能 rename → create → copy → drop
 */
function ensureGameCodeConstraint(rawDb: any, gameCode: string): void {
  try {
    // Probe: try a lightweight INSERT-then-ROLLBACK to test the constraint
    rawDb.run('SAVEPOINT _constraint_probe')
    try {
      rawDb.run(
        `INSERT INTO game_emotion_records (student_id, game_code, start_time, duration_ms, difficulty_level, completion_status, performance_data)
         VALUES (-1, ?, '', 0, 1, 'aborted', '{}')`,
        [gameCode],
      )
      // Constraint accepts this game code — no migration needed
      rawDb.run('ROLLBACK TO _constraint_probe')
      rawDb.run('RELEASE _constraint_probe')
      return
    } catch {
      rawDb.run('ROLLBACK TO _constraint_probe')
      rawDb.run('RELEASE _constraint_probe')
    }

    // Constraint rejected → rebuild the table
    console.log(`[EmotionalGamesAPI] 迁移 game_emotion_records 以支持 ${gameCode}`)
    rawDb.run('ALTER TABLE game_emotion_records RENAME TO _game_emotion_records_old')
    rawDb.run(`
      CREATE TABLE game_emotion_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        game_code TEXT NOT NULL
          CHECK(game_code IN ('G01_BALLOON', 'G03_FOREST', 'G04_WIPE_ICE', 'G07_MONSTER', 'G08_ENERGY_BALL')),
        start_time TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        difficulty_level INTEGER DEFAULT 1
          CHECK(difficulty_level IN (1, 2, 3)),
        completion_status TEXT NOT NULL
          CHECK(completion_status IN ('completed', 'aborted')),
        performance_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES student(id)
      )
    `)
    rawDb.run(`INSERT INTO game_emotion_records SELECT * FROM _game_emotion_records_old`)
    rawDb.run('DROP TABLE _game_emotion_records_old')
    rawDb.run(`CREATE INDEX IF NOT EXISTS idx_game_emotion_records_student ON game_emotion_records(student_id, created_at DESC)`)
    rawDb.run(`CREATE INDEX IF NOT EXISTS idx_game_emotion_records_code ON game_emotion_records(game_code, created_at DESC)`)
    console.log('[EmotionalGamesAPI] ✅ game_emotion_records 迁移完成')
  } catch (err) {
    console.error('[EmotionalGamesAPI] ❌ game_emotion_records 迁移失败:', err)
    throw err
  }
}

export class EmotionalGamesAPI {
  async persistSession(input: PersistEmotionGameSessionInput): Promise<PersistEmotionGameSessionResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)

    // Ensure the CHECK constraint supports this game code
    ensureGameCodeConstraint(rawDb, input.gameCode)

    const student = db.get(
      'SELECT current_class_id, current_class_name FROM student WHERE id = ?',
      [input.studentId]
    )
    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null
    const accuracyRate = deriveAccuracyRate(input.gameCode, input.performanceData, input.completionStatus)
    const avgResponseTimeMs = deriveAvgResponseTime(input.gameCode, input.performanceData)

    rawDb.run('BEGIN TRANSACTION')

    try {
      db.run(
        `INSERT INTO game_emotion_records (
          student_id, game_code, start_time, duration_ms, difficulty_level, completion_status, performance_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.studentId,
          input.gameCode,
          input.startedAt,
          input.durationMs,
          input.difficultyLevel,
          input.completionStatus,
          JSON.stringify(input.performanceData || {}),
        ],
      )

      const recordId = getLastInsertId(db)

      let badgeResult: { badgeId: number; unlockCount: number } | null = null
      if (input.completionStatus === 'completed' && input.badge) {
        badgeResult = this.upsertBadge(db, input.studentId, input.gameCode, input.badge)
      }

      new TrainingSessionWriter(db).upsertSession({
        studentId: input.studentId,
        moduleCode: 'emotional',
        entryCode: EMOTIONAL_GAME_ENTRY_CODE,
        sessionFamily: 'emotional_game',
        resourceType: 'game',
        taskNameSnapshot: EMOTIONAL_GAME_TITLE_MAP[input.gameCode] || '情绪小游戏',
        classId,
        className,
        startedAt: input.startedAt,
        endedAt: deriveEndedAt(input.startedAt, input.durationMs),
        durationMs: input.durationMs,
        completionStatus: input.completionStatus,
        accuracyRate,
        avgResponseTimeMs,
        summaryPayload: {
          gameCode: input.gameCode,
          difficultyLevel: input.difficultyLevel,
          badgeCode: input.badge?.badgeCode || null,
          badgeName: input.badge?.badgeName || null,
          badgeUnlockCount: badgeResult?.unlockCount || null,
          metrics: pickScalarSummaryMetrics(input.performanceData || {}),
        },
        sourceTable: 'game_emotion_records',
        sourceRecordId: recordId,
      })

      rawDb.run('COMMIT')

      if (typeof db.saveNow === 'function') {
        await db.saveNow()
      }

      return {
        recordId,
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

  private upsertBadge(
    db: DbLike,
    studentId: number,
    gameCode: EmotionGameCode,
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

  getLatestRecord(studentId: number, gameCode: EmotionGameCode): GameEmotionRecord | null {
    const db = getActiveDb()
    const row = db.get(
      `SELECT *
       FROM game_emotion_records
       WHERE student_id = ? AND game_code = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [studentId, gameCode],
    )

    if (!row) {
      return null
    }

    return {
      ...row,
      performance_data: row.performance_data ? JSON.parse(row.performance_data) : {},
    }
  }

  getRecordById(recordId: number): EmotionalGameTrainingRecordItem | null {
    const row = getActiveDb().get(`
      SELECT *
      FROM game_emotion_records
      WHERE id = ?
    `, [recordId])

    if (!row) {
      return null
    }

    return normalizeTrainingRecord(row)
  }

  getStudentRecords(studentId: number): EmotionalGameTrainingRecordItem[] {
    const db = getActiveDb()
    const rows = queryAll(db, `
      SELECT *
      FROM game_emotion_records
      WHERE student_id = ?
      ORDER BY created_at DESC, id DESC
    `, [studentId])

    return rows.map(normalizeTrainingRecord)
  }

  countRecordsByEntry(entryCode: string, studentId?: number): number {
    if (entryCode !== EMOTIONAL_GAME_ENTRY_CODE) {
      return 0
    }

    let sql = 'SELECT COUNT(*) as count FROM game_emotion_records WHERE 1 = 1'
    const params: any[] = []

    if (studentId) {
      sql += ' AND student_id = ?'
      params.push(studentId)
    }

    const result = getActiveDb().get(sql, params)
    return Number(result?.count || 0)
  }
}
