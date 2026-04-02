type DbLike = {
  get: (sql: string, params?: any[]) => any
  run: (sql: string, params?: any[]) => any
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

function serializeSummaryPayload(payload: Record<string, any> | null | undefined): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  return JSON.stringify(payload)
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
      serializeSummaryPayload(input.summaryPayload),
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
