type DbLike = {
  get: (sql: string, params?: any[]) => any
  run: (sql: string, params?: any[]) => any
}

export interface SharedTrainingSessionSummary {
  sessionGroupId: string
  participantStudentIds: number[]
  exitTrigger?: string | null
}

export interface UpsertTrainingSessionInput {
  studentId: number
  moduleCode: string
  entryCode: string
  sessionFamily: string
  resourceId?: number | null
  resourceType?: string | null
  taskId?: number | null
  taskNameSnapshot?: string | null
  classId?: number | null
  className?: string | null
  startedAt: string
  endedAt?: string | null
  durationMs: number
  completionStatus: 'completed' | 'cancelled' | 'interrupted' | 'aborted'
  accuracyRate?: number | null
  avgResponseTimeMs?: number | null
  summaryPayload?: Record<string, any> | null
  sharedSession?: SharedTrainingSessionSummary | null
  sourceTable: string
  sourceRecordId: number
}

function clampAccuracyRate(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null
  }

  return Math.max(0, Math.min(1, value))
}

function normalizeDuration(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.round(Number(value)))
}

function normalizeSharedTrainingSessionSummary(
  sharedSession: SharedTrainingSessionSummary | null | undefined,
): Record<string, any> | null {
  if (!sharedSession || typeof sharedSession !== 'object') {
    return null
  }

  const sessionGroupId = typeof sharedSession.sessionGroupId === 'string'
    ? sharedSession.sessionGroupId.trim()
    : ''
  const participantStudentIds = Array.from(new Set(
    Array.isArray(sharedSession.participantStudentIds)
      ? sharedSession.participantStudentIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
      : [],
  ))

  if (!sessionGroupId || participantStudentIds.length === 0) {
    return null
  }

  return {
    sessionGroupId,
    participantStudentIds,
    participantCount: participantStudentIds.length,
    exitTrigger: sharedSession.exitTrigger ?? null,
  }
}

function buildSummaryPayload(
  payload: Record<string, any> | null | undefined,
  sharedSession: SharedTrainingSessionSummary | null | undefined,
): Record<string, any> | null {
  const normalizedPayload = payload && typeof payload === 'object'
    ? { ...payload }
    : {}
  const normalizedSharedSession = normalizeSharedTrainingSessionSummary(sharedSession)

  if (normalizedSharedSession) {
    normalizedPayload.sharedSession = normalizedSharedSession
  }

  if (Object.keys(normalizedPayload).length === 0) {
    return null
  }

  return normalizedPayload
}

function serializeSummaryPayload(
  payload: Record<string, any> | null | undefined,
  sharedSession: SharedTrainingSessionSummary | null | undefined,
): string | null {
  const normalizedPayload = buildSummaryPayload(payload, sharedSession)
  if (!normalizedPayload) {
    return null
  }

  return JSON.stringify(normalizedPayload)
}

export class TrainingSessionWriter {
  constructor(private readonly db: DbLike) {}

  upsertSession(input: UpsertTrainingSessionInput): number {
    this.db.run(`
      INSERT INTO training_session (
        student_id, module_code, entry_code, session_family,
        resource_id, resource_type, task_id, task_name_snapshot,
        class_id, class_name, started_at, ended_at, duration_ms,
        completion_status, accuracy_rate, avg_response_time_ms,
        summary_payload, source_table, source_record_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_table, source_record_id) DO UPDATE SET
        student_id = excluded.student_id,
        module_code = excluded.module_code,
        entry_code = excluded.entry_code,
        session_family = excluded.session_family,
        resource_id = excluded.resource_id,
        resource_type = excluded.resource_type,
        task_id = excluded.task_id,
        task_name_snapshot = excluded.task_name_snapshot,
        class_id = excluded.class_id,
        class_name = excluded.class_name,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        duration_ms = excluded.duration_ms,
        completion_status = excluded.completion_status,
        accuracy_rate = excluded.accuracy_rate,
        avg_response_time_ms = excluded.avg_response_time_ms,
        summary_payload = excluded.summary_payload,
        updated_at = CURRENT_TIMESTAMP
    `, [
      input.studentId,
      input.moduleCode,
      input.entryCode,
      input.sessionFamily,
      input.resourceId ?? null,
      input.resourceType ?? null,
      input.taskId ?? null,
      input.taskNameSnapshot ?? null,
      input.classId ?? null,
      input.className ?? null,
      input.startedAt,
      input.endedAt ?? null,
      normalizeDuration(input.durationMs),
      input.completionStatus,
      clampAccuracyRate(input.accuracyRate),
      input.avgResponseTimeMs ?? null,
      serializeSummaryPayload(input.summaryPayload, input.sharedSession),
      input.sourceTable,
      input.sourceRecordId,
    ])

    const row = this.db.get(
      `SELECT id
       FROM training_session
       WHERE source_table = ? AND source_record_id = ?`,
      [input.sourceTable, input.sourceRecordId],
    )

    if (!row?.id) {
      throw new Error(`training_session upsert failed for ${input.sourceTable}:${input.sourceRecordId}`)
    }

    return Number(row.id)
  }
}
