import { getCustomGameDefinition, getCustomGamesByTrainingEntry } from '@/data/custom-game-registry'
import { ModuleCode } from '@/types/module'
import type {
  CustomGameCode,
  CustomGameExitTrigger,
  EmotionGameBadgePayload,
  EmotionGameCompletionStatus,
  EmotionGameDifficulty,
  GameEmotionRecord,
} from '@/types/emotional/games'
import type { TrainingEntryCode } from '@/utils/training-entry'
import { ensureCustomGamePhase0Schema } from './init'
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

interface PersistEmotionGameSessionResult {
  recordId: number
  badgeId?: number
  badgeUnlockCount?: number
}

interface PersistEmotionGameSessionGroupInput {
  gameCode: CustomGameCode
  participantStudentIds: number[]
  startedAt: string
  durationMs: number
  difficultyLevel: EmotionGameDifficulty
  completionStatus: EmotionGameCompletionStatus
  performanceData: Record<string, any>
  sessionGroupId: string
  exitTrigger?: CustomGameExitTrigger | null
  sharedBadge?: EmotionGameBadgePayload
  badgesByStudentId?: Record<number, EmotionGameBadgePayload | undefined>
  participantRoles?: Record<number, string | undefined>
}

interface PersistEmotionGameSessionGroupResult {
  sessionGroupId: string
  recordIds: number[]
  badgeResults: Array<{
    studentId: number
    badgeId?: number
    badgeUnlockCount?: number
  }>
}

export interface EmotionalGameTrainingRecordItem {
  id: number
  student_id: number
  task_id: null
  task_name: string
  resource_id: null
  resource_type: 'game'
  session_type: 'emotion_game'
  entry_code: TrainingEntryCode
  timestamp: number
  duration: number
  difficulty_level: EmotionGameDifficulty
  accuracy_rate: number | null
  avg_response_time: number | null
  raw_data: Record<string, any>
  class_id: null
  class_name: null
  module_code: ModuleCode
  created_at: string
  completion_status: EmotionGameCompletionStatus
  game_code: CustomGameCode
  session_group_id: string | null
  exit_trigger: CustomGameExitTrigger | null
  session_participants: number[]
  record_source: 'emotional_game'
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
  gameCode: CustomGameCode,
  performanceData: Record<string, any>,
  completionStatus: EmotionGameCompletionStatus,
): number | null {
  switch (gameCode) {
    case 'C02_PUDDLE': {
      const promptHits = Number(performanceData.prompt_hits || 0)
      const promptMisses = Number(performanceData.prompt_misses || 0)
      const guidedPromptCount = Number(performanceData.guided_prompt_count || 0)
      const totalChecks = guidedPromptCount > 0 ? guidedPromptCount : promptHits + promptMisses

      if (totalChecks > 0) {
        return Math.max(0, Math.min(1, promptHits / totalChecks))
      }
      break
    }
    case 'C03_XYLOPHONE': {
      const promptHits = Number(performanceData.prompt_hits || 0)
      const promptMisses = Number(performanceData.prompt_misses || 0)
      const guidedPromptCount = Number(performanceData.guided_prompt_count || 0)
      const totalChecks = guidedPromptCount > 0 ? guidedPromptCount : promptHits + promptMisses

      if (totalChecks > 0) {
        return Math.max(0, Math.min(1, promptHits / totalChecks))
      }
      break
    }
    case 'C01_DANDELION':
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
    case 'G04_WIPE_ICE':
    case 'F01_CLOUD_ERASE': {
      const clearedRatioPeak = Number(performanceData.cleared_ratio_peak)
      if (Number.isFinite(clearedRatioPeak)) {
        return Math.max(0, Math.min(1, clearedRatioPeak))
      }
      break
    }
    case 'F02_STAR_TRACE': {
      const pathPrecisionRatio = Number(performanceData.path_precision_ratio)
      if (Number.isFinite(pathPrecisionRatio)) {
        return Math.max(0, Math.min(1, pathPrecisionRatio))
      }

      const checkpointHits = Number(performanceData.checkpoint_hits || 0)
      const targetCheckpointCount = Number(performanceData.target_checkpoint_count || 0)
      if (targetCheckpointCount > 0) {
        return Math.max(0, Math.min(1, checkpointHits / targetCheckpointCount))
      }
      break
    }
    case 'F03_RECYCLING': {
      const sortedItems = Number(performanceData.sorted_items || 0)
      const wrongDrops = Number(performanceData.wrong_drops || 0)
      const missedItems = Number(performanceData.missed_items || 0)
      const totalAttempts = sortedItems + wrongDrops + missedItems
      if (totalAttempts > 0) {
        return Math.max(0, Math.min(1, sortedItems / totalAttempts))
      }

      const targetItemCount = Number(performanceData.target_item_count || 0)
      if (targetItemCount > 0) {
        return Math.max(0, Math.min(1, sortedItems / targetItemCount))
      }
      break
    }
    case 'F04_TRACK_BUILD': {
      const correctPlacements = Number(performanceData.correct_placements || 0)
      const wrongPlacements = Number(performanceData.wrong_placements || 0)
      const totalAttempts = correctPlacements + wrongPlacements
      if (totalAttempts > 0) {
        return Math.max(0, Math.min(1, correctPlacements / totalAttempts))
      }

      const targetGapCount = Number(performanceData.target_gap_count || 0)
      if (targetGapCount > 0) {
        return Math.max(0, Math.min(1, correctPlacements / targetGapCount))
      }
      break
    }
    case 'F05_BALLOONS': {
      const successfulPops = Number(performanceData.successful_pops || 0)
      const earlyTaps = Number(performanceData.early_taps || 0)
      const wrongRestTaps = Number(performanceData.wrong_rest_taps || 0)
      const missedWindows = Number(performanceData.missed_windows || 0)
      const totalChecks = successfulPops + earlyTaps + wrongRestTaps + missedWindows
      if (totalChecks > 0) {
        return Math.max(0, Math.min(1, successfulPops / totalChecks))
      }

      const targetBalloonCount = Number(performanceData.target_balloon_count || 0)
      if (targetBalloonCount > 0) {
        return Math.max(0, Math.min(1, successfulPops / targetBalloonCount))
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
    case 'S03_STORY_SEQ': {
      const correctSteps = Number(performanceData.correct_steps || 0)
      const wrongSteps = Number(performanceData.wrong_steps || 0)
      const totalAttempts = correctSteps + wrongSteps
      if (totalAttempts > 0) {
        return Math.max(0, Math.min(1, correctSteps / totalAttempts))
      }

      const completedStories = Number(performanceData.completed_stories || 0)
      const targetStoryCount = Number(performanceData.target_story_count || 0)
      if (targetStoryCount > 0) {
        return Math.max(0, Math.min(1, completedStories / targetStoryCount))
      }
      break
    }
    case 'S01_BURGER': {
      const correctPlacements = Number(performanceData.correct_placements || 0)
      const wrongPlacements = Number(performanceData.wrong_placements || 0)
      const totalActions = correctPlacements + wrongPlacements
      if (totalActions > 0) {
        return Math.max(0, Math.min(1, correctPlacements / totalActions))
      }

      const completedLayerCount = Number(performanceData.completed_layer_count || 0)
      const targetLayerCount = Number(performanceData.target_layer_count || 0)
      if (targetLayerCount > 0) {
        return Math.max(0, Math.min(1, completedLayerCount / targetLayerCount))
      }
      break
    }
    case 'S05_ECHO_PARROT': {
      const firstTryRounds = Number(performanceData.first_try_rounds || 0)
      const targetRoundCount = Number(performanceData.target_round_count || 0)
      if (targetRoundCount > 0) {
        return Math.max(0, Math.min(1, firstTryRounds / targetRoundCount))
      }

      const completedRounds = Number(performanceData.completed_rounds || 0)
      const voiceAttemptCount = Number(performanceData.voice_attempt_count || 0)
      if (voiceAttemptCount > 0) {
        return Math.max(0, Math.min(1, completedRounds / voiceAttemptCount))
      }
      break
    }
  }

  return completionStatus === 'completed' ? 1 : null
}

function deriveAvgResponseTime(
  gameCode: CustomGameCode,
  performanceData: Record<string, any>,
): number | null {
  switch (gameCode) {
    case 'C02_PUDDLE':
      return averageNumericValues(performanceData.prompt_response_times_ms)
        ?? averageNumericValues(performanceData.hold_samples_ms)
    case 'C03_XYLOPHONE':
      return averageNumericValues(performanceData.prompt_response_times_ms)
        ?? averageNumericValues(performanceData.tap_intervals_ms)
    case 'C01_DANDELION':
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
    case 'F02_STAR_TRACE':
      return averageNumericValues(performanceData.constellation_durations_ms)
    case 'F03_RECYCLING':
      return averageNumericValues(performanceData.sort_times_ms)
    case 'F04_TRACK_BUILD':
      return averageNumericValues(performanceData.placement_times_ms)
        ?? (Number.isFinite(Number(performanceData.average_placement_ms))
          ? Number(performanceData.average_placement_ms)
          : null)
    case 'F05_BALLOONS':
      return averageNumericValues(performanceData.window_response_ms)
    case 'S03_STORY_SEQ':
      return averageNumericValues(performanceData.response_times_ms)
    case 'S01_BURGER':
      return averageNumericValues(performanceData.turn_times_ms)
    case 'S05_ECHO_PARROT':
      return averageNumericValues(performanceData.response_times_ms)
        ?? (Number.isFinite(Number(performanceData.average_response_ms))
          ? Number(performanceData.average_response_ms)
          : null)
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

function normalizeExitTrigger(raw: unknown): CustomGameExitTrigger | null {
  if (
    raw === 'game_complete' ||
    raw === 'user_exit' ||
    raw === 'teacher_exit' ||
    raw === 'timer_end' ||
    raw === 'system_interrupt'
  ) {
    return raw
  }

  return null
}

function parseSessionParticipants(raw: unknown): number[] {
  if (!raw) {
    return []
  }

  if (Array.isArray(raw)) {
    return raw
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parseSessionParticipants(parsed)
    } catch {
      return []
    }
  }

  return []
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

function buildTrainingSessionSummaryPayload(input: {
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
  }
}

function getStudentTrainingContext(db: DbLike, studentId: number) {
  const student = db.get(
    'SELECT id, current_class_id, current_class_name FROM student WHERE id = ?',
    [studentId],
  )

  if (!student?.id) {
    throw new Error(`Student not found for custom game persistence: ${studentId}`)
  }

  return {
    studentId,
    classId: student.current_class_id || null,
    className: student.current_class_name || null,
  }
}

function insertGameSessionParticipants(
  db: DbLike,
  sessionGroupId: string,
  participantStudentIds: number[],
  participantRoles?: Record<number, string | undefined>,
) {
  db.run('DELETE FROM game_session_participants WHERE session_group_id = ?', [sessionGroupId])

  for (const studentId of participantStudentIds) {
    db.run(
      `INSERT INTO game_session_participants (
        session_group_id, student_id, role
      ) VALUES (?, ?, ?)`,
      [
        sessionGroupId,
        studentId,
        participantRoles?.[studentId] || null,
      ],
    )
  }
}

function normalizeTrainingRecord(row: any): EmotionalGameTrainingRecordItem {
  const performanceData = parsePerformanceData(row.performance_data)
  const completionStatus = (row.completion_status || 'completed') as EmotionGameCompletionStatus
  const gameCode = row.game_code as CustomGameCode
  const definition = getCustomGameDefinition(String(gameCode))
  const startedAt = Date.parse(row.start_time || row.created_at || '')
  const createdAt = row.created_at || row.start_time || ''
  const timestamp = Number.isFinite(startedAt) ? startedAt : 0

  return {
    id: Number(row.id),
    student_id: Number(row.student_id),
    task_id: null,
    task_name: definition?.name || '自定义小游戏',
    resource_id: null,
    resource_type: 'game',
    session_type: 'emotion_game',
    entry_code: definition?.trainingEntryCode || 'emotional-regulation',
    timestamp,
    duration: Number(row.duration_ms || 0),
    difficulty_level: Number(row.difficulty_level || 1) as EmotionGameDifficulty,
    accuracy_rate: deriveAccuracyRate(gameCode, performanceData, completionStatus),
    avg_response_time: deriveAvgResponseTime(gameCode, performanceData),
    raw_data: performanceData,
    class_id: null,
    class_name: null,
    module_code: definition?.moduleCode || ModuleCode.EMOTIONAL,
    created_at: createdAt,
    completion_status: completionStatus,
    game_code: gameCode,
    session_group_id: typeof row.session_group_id === 'string' ? row.session_group_id : null,
    exit_trigger: normalizeExitTrigger(row.exit_trigger),
    session_participants: parseSessionParticipants(row.session_participants),
    record_source: 'emotional_game',
  }
}

export class EmotionalGamesAPI {
  async persistSession(input: PersistEmotionGameSessionInput): Promise<PersistEmotionGameSessionResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)
    ensureCustomGamePhase0Schema(rawDb)
    const definition = resolveCustomGameDefinition(input.gameCode)
    const studentContext = getStudentTrainingContext(db, input.studentId)
    const accuracyRate = deriveAccuracyRate(input.gameCode, input.performanceData, input.completionStatus)
    const avgResponseTimeMs = deriveAvgResponseTime(input.gameCode, input.performanceData)
    const exitTrigger = deriveExitTrigger(input.completionStatus, input.performanceData, input.exitTrigger)
    const sessionParticipants = normalizeParticipantStudentIds(
      input.sessionParticipants?.length
        ? input.sessionParticipants
        : [input.studentId],
    )
    const sessionGroupId = normalizeSessionGroupId(input.sessionGroupId)

    rawDb.run('BEGIN TRANSACTION')

    try {
      db.run(
        `INSERT INTO game_emotion_records (
          student_id, game_code, start_time, duration_ms, difficulty_level,
          completion_status, performance_data, session_group_id, exit_trigger, session_participants
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.studentId,
          input.gameCode,
          input.startedAt,
          input.durationMs,
          input.difficultyLevel,
          input.completionStatus,
          JSON.stringify(input.performanceData || {}),
          sessionGroupId,
          exitTrigger,
          JSON.stringify(sessionParticipants),
        ],
      )

      const recordId = getLastInsertId(db)

      let badgeResult: { badgeId: number; unlockCount: number } | null = null
      if (input.completionStatus === 'completed' && input.badge) {
        badgeResult = this.upsertBadge(db, input.studentId, input.gameCode, input.badge)
      }

      new TrainingSessionWriter(db).upsertSession({
        studentId: input.studentId,
        moduleCode: definition.moduleCode,
        entryCode: definition.trainingEntryCode,
        sessionFamily: 'emotional_game',
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
        summaryPayload: buildTrainingSessionSummaryPayload({
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
        sharedSession: sessionGroupId && sessionParticipants.length > 1
          ? {
              sessionGroupId,
              participantStudentIds: sessionParticipants,
              exitTrigger,
            }
          : null,
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

  async persistSessionGroup(
    input: PersistEmotionGameSessionGroupInput,
  ): Promise<PersistEmotionGameSessionGroupResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)
    ensureCustomGamePhase0Schema(rawDb)
    const definition = resolveCustomGameDefinition(input.gameCode)
    const sessionGroupId = normalizeSessionGroupId(input.sessionGroupId)
    const participantStudentIds = normalizeParticipantStudentIds(input.participantStudentIds)

    if (!sessionGroupId) {
      throw new Error('persistSessionGroup requires a non-empty sessionGroupId')
    }

    if (participantStudentIds.length < 2) {
      throw new Error('persistSessionGroup requires at least 2 participantStudentIds')
    }

    if (participantStudentIds.length > 2) {
      throw new Error('Phase 0 custom games do not support more than 2 participants')
    }

    if (participantStudentIds.length > definition.maxPlayers) {
      throw new Error(
        `Game ${input.gameCode} only supports ${definition.maxPlayers} participant(s), got ${participantStudentIds.length}`,
      )
    }

    const exitTrigger = deriveExitTrigger(input.completionStatus, input.performanceData, input.exitTrigger)
    const accuracyRate = deriveAccuracyRate(input.gameCode, input.performanceData, input.completionStatus)
    const avgResponseTimeMs = deriveAvgResponseTime(input.gameCode, input.performanceData)
    const studentContexts = participantStudentIds.map((studentId) => getStudentTrainingContext(db, studentId))
    const recordIds: number[] = []
    const badgeResults: PersistEmotionGameSessionGroupResult['badgeResults'] = []

    rawDb.run('BEGIN TRANSACTION')

    try {
      insertGameSessionParticipants(db, sessionGroupId, participantStudentIds, input.participantRoles)

      for (const studentContext of studentContexts) {
        db.run(
          `INSERT INTO game_emotion_records (
            student_id, game_code, start_time, duration_ms, difficulty_level,
            completion_status, performance_data, session_group_id, exit_trigger, session_participants
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            studentContext.studentId,
            input.gameCode,
            input.startedAt,
            input.durationMs,
            input.difficultyLevel,
            input.completionStatus,
            JSON.stringify(input.performanceData || {}),
            sessionGroupId,
            exitTrigger,
            JSON.stringify(participantStudentIds),
          ],
        )

        const recordId = getLastInsertId(db)
        recordIds.push(recordId)

        const badge = input.badgesByStudentId?.[studentContext.studentId] ?? input.sharedBadge
        let badgeResult: { badgeId: number; unlockCount: number } | null = null
        if (input.completionStatus === 'completed' && badge) {
          badgeResult = this.upsertBadge(db, studentContext.studentId, input.gameCode, badge)
        }

        new TrainingSessionWriter(db).upsertSession({
          studentId: studentContext.studentId,
          moduleCode: definition.moduleCode,
          entryCode: definition.trainingEntryCode,
          sessionFamily: 'emotional_game',
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
          summaryPayload: buildTrainingSessionSummaryPayload({
            gameCode: input.gameCode,
            trainingEntryCode: definition.trainingEntryCode,
            difficultyLevel: input.difficultyLevel,
            sessionGroupId,
            sessionParticipants: participantStudentIds,
            exitTrigger,
            badge,
            badgeUnlockCount: badgeResult?.unlockCount || null,
            performanceData: input.performanceData,
          }),
          sharedSession: {
            sessionGroupId,
            participantStudentIds,
            exitTrigger,
          },
          sourceTable: 'game_emotion_records',
          sourceRecordId: recordId,
        })

        badgeResults.push({
          studentId: studentContext.studentId,
          badgeId: badgeResult?.badgeId,
          badgeUnlockCount: badgeResult?.unlockCount,
        })
      }

      rawDb.run('COMMIT')

      if (typeof db.saveNow === 'function') {
        await db.saveNow()
      }

      return {
        sessionGroupId,
        recordIds,
        badgeResults,
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

  getLatestRecord(studentId: number, gameCode: CustomGameCode): GameEmotionRecord | null {
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
      session_group_id: typeof row.session_group_id === 'string' ? row.session_group_id : null,
      exit_trigger: normalizeExitTrigger(row.exit_trigger),
      session_participants: parseSessionParticipants(row.session_participants),
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

  getStudentRecordsByEntry(
    studentId: number,
    entryCode: TrainingEntryCode,
  ): EmotionalGameTrainingRecordItem[] {
    const supportedGames = getCustomGamesByTrainingEntry(entryCode)
    if (supportedGames.length === 0) {
      return []
    }

    const db = getActiveDb()
    const params: any[] = [studentId, ...supportedGames.map((game) => game.gameCode)]
    const rows = queryAll(db, `
      SELECT *
      FROM game_emotion_records
      WHERE student_id = ?
        AND game_code IN (${supportedGames.map(() => '?').join(', ')})
      ORDER BY created_at DESC, id DESC
    `, params)

    return rows.map(normalizeTrainingRecord)
  }

  countRecordsByEntry(entryCode: string, studentId?: number): number {
    const supportedGames = getCustomGamesByTrainingEntry(entryCode as TrainingEntryCode)
    if (supportedGames.length === 0) {
      return 0
    }

    let sql = 'SELECT COUNT(*) as count FROM game_emotion_records WHERE 1 = 1'
    const params: any[] = supportedGames.map((game) => game.gameCode)

    sql += ` AND game_code IN (${supportedGames.map(() => '?').join(', ')})`

    if (studentId) {
      sql += ' AND student_id = ?'
      params.push(studentId)
    }

    const result = getActiveDb().get(sql, params)
    return Number(result?.count || 0)
  }
}
