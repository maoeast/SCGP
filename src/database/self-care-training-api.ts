import { TrainingSessionWriter } from '@/database/training-session-writer'
import {
  TASK_TRAINING_ENTRY_CODE,
  TASK_TRAINING_MODE,
  TASK_TRAINING_MODULE_CODE,
  TASK_TRAINING_RESOURCE_TYPE,
  type TaskTrainingCompletionLevel,
  type TaskTrainingExecutionResult,
  type TaskTrainingStepResult,
} from '@/features/self-care/task-training-contract'

type DbLike = {
  get: (sql: string, params?: any[]) => any
  run: (sql: string, params?: any[]) => any
  lastInsertId?: () => number
  saveNow?: () => Promise<void>
  getRawDB?: () => any
}

function getActiveDb(): DbLike {
  const activeDb = (globalThis as typeof globalThis & {
    window?: { db?: DbLike }
  }).window?.db

  if (!activeDb) {
    throw new Error('Database is not initialized on window.db')
  }

  return activeDb
}

export interface SaveSelfCareTrainingSessionInput {
  studentId: number
  resourceId: number
  startedAt: number
  endedAt?: number | null
  completionStatus: 'completed' | 'cancelled' | 'interrupted' | 'aborted'
  executionResult: TaskTrainingExecutionResult
}

export interface SaveSelfCareTrainingSessionResult {
  trainingRecordId: number
  sessionId: number
}

export interface SelfCareTrainingRecordDetail {
  id: number
  studentId: number
  studentName: string
  resourceId: number
  resourceName: string
  timestamp: number
  durationMs: number
  stepCount: number
  completedStepCount: number
  completionBreakdown: Record<TaskTrainingCompletionLevel, number>
  teacherNotes: string | null
  stepResults: TaskTrainingStepResult[]
}

function getTransactionalDb(db: DbLike) {
  return typeof db.getRawDB === 'function' ? db.getRawDB() : db
}

function toIsoStringFromTimestamp(value: number | null | undefined): string {
  const normalized = Number(value)
  if (Number.isFinite(normalized)) {
    return new Date(normalized).toISOString()
  }

  return new Date().toISOString()
}

function normalizeDurationSeconds(startedAt: number, endedAt?: number | null): number {
  const start = Number(startedAt)
  const end = Number(endedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 0
  }

  return Math.max(0, Math.round((end - start) / 1000))
}

function normalizeDurationMs(startedAt: number, endedAt?: number | null): number {
  const start = Number(startedAt)
  const end = Number(endedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 0
  }

  return Math.max(0, Math.round(end - start))
}

function buildCompletionBreakdown(
  stepResults: TaskTrainingExecutionResult['stepResults']
): Record<TaskTrainingCompletionLevel, number> {
  const breakdown: Record<TaskTrainingCompletionLevel, number> = {
    independent: 0,
    prompt: 0,
    assist: 0,
    unable: 0,
  }

  for (const step of stepResults) {
    breakdown[step.completionLevel] += 1
  }

  return breakdown
}

function buildAverageResponseTime(stepCount: number, durationMs: number): number {
  if (!Number.isFinite(stepCount) || stepCount <= 0) {
    return 0
  }

  return Math.round(durationMs / stepCount)
}

function buildSummaryPayload(executionResult: TaskTrainingExecutionResult) {
  return {
    trainingMode: TASK_TRAINING_MODE,
    stepCount: executionResult.stepCount,
    completedStepCount: executionResult.completedStepCount,
    errorType: executionResult.errorType,
    teacherNotes: executionResult.teacherNotes || null,
    completionBreakdown: buildCompletionBreakdown(executionResult.stepResults),
    stepResults: executionResult.stepResults.map((step) => ({
      seq: step.seq,
      stepId: step.stepId || null,
      completionLevel: step.completionLevel,
      errorType: step.errorType ?? null,
      teacherNotes: step.teacherNotes || null,
      recordedAt: step.recordedAt || null,
    })),
  }
}

function buildAccuracyRate(executionResult: TaskTrainingExecutionResult): number {
  if (!Number.isFinite(executionResult.stepCount) || executionResult.stepCount <= 0) {
    return 0
  }

  return Math.max(
    0,
    Math.min(1, executionResult.completedStepCount / executionResult.stepCount),
  )
}

export class SelfCareTrainingAPI {
  private readonly db: DbLike

  constructor(db?: DbLike) {
    this.db = db ?? getActiveDb()
  }

  private queryOne(sql: string, params: any[] = []) {
    return this.db.get(sql, params)
  }

  private execute(sql: string, params: any[] = []) {
    this.db.run(sql, params)
  }

  private getLastInsertId(): number {
    if (typeof this.db.lastInsertId === 'function') {
      return this.db.lastInsertId()
    }

    return Number(this.db.get('SELECT last_insert_rowid() as id')?.id || 0)
  }

  getTrainingRecordDetail(recordId: number): SelfCareTrainingRecordDetail | null {
    const row = this.queryOne(`
      SELECT tr.id, tr.student_id, st.name AS student_name, tr.resource_id,
        COALESCE(r.name, '原任务已不可用') AS resource_name, tr.timestamp,
        tr.duration, tr.raw_data, ts.duration_ms
      FROM training_records tr
      INNER JOIN student st ON st.id = tr.student_id
      LEFT JOIN sys_training_resource r ON r.id = tr.resource_id
      LEFT JOIN training_session ts ON ts.source_table = 'training_records' AND ts.source_record_id = tr.id
      WHERE tr.id = ? AND tr.resource_type = ?
    `, [recordId, TASK_TRAINING_RESOURCE_TYPE])
    if (!row) return null

    let raw: Record<string, any>
    try {
      raw = JSON.parse(row.raw_data || '{}')
    } catch {
      throw new Error(`自理训练记录 ${recordId} 的历史步骤无法解析`)
    }
    const stepResults = Array.isArray(raw.stepResults)
      ? [...raw.stepResults].sort((a, b) => Number(a.seq) - Number(b.seq)) as TaskTrainingStepResult[]
      : []
    const emptyBreakdown: Record<TaskTrainingCompletionLevel, number> = { independent: 0, prompt: 0, assist: 0, unable: 0 }
    return {
      id: Number(row.id),
      studentId: Number(row.student_id),
      studentName: String(row.student_name || ''),
      resourceId: Number(row.resource_id),
      resourceName: String(row.resource_name),
      timestamp: Number(row.timestamp),
      durationMs: Number(row.duration_ms ?? Number(row.duration || 0) * 1000),
      stepCount: Number(raw.stepCount || stepResults.length),
      completedStepCount: Number(raw.completedStepCount || 0),
      completionBreakdown: { ...emptyBreakdown, ...(raw.completionBreakdown || {}) },
      teacherNotes: typeof raw.teacherNotes === 'string' ? raw.teacherNotes : null,
      stepResults,
    }
  }

  async saveTrainingSession(
    input: SaveSelfCareTrainingSessionInput
  ): Promise<SaveSelfCareTrainingSessionResult> {
    const student = this.queryOne(
      'SELECT name, current_class_id, current_class_name FROM student WHERE id = ?',
      [input.studentId]
    )
    const resource = this.queryOne(
      'SELECT id, name, module_code, resource_type FROM sys_training_resource WHERE id = ?',
      [input.resourceId]
    )

    if (!resource) {
      throw new Error(`自理任务资源不存在: ${input.resourceId}`)
    }

    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null
    const durationMs = normalizeDurationMs(input.startedAt, input.endedAt)
    const durationSeconds = normalizeDurationSeconds(input.startedAt, input.endedAt)
    const accuracyRate = buildAccuracyRate(input.executionResult)
    const averageResponseTime = buildAverageResponseTime(input.executionResult.stepCount, durationMs)
    const rawPayload = buildSummaryPayload(input.executionResult)
    const rawDb = getTransactionalDb(this.db)

    rawDb.run('BEGIN TRANSACTION')

    try {
      this.execute(`
        INSERT INTO training_records (
          student_id, task_id, resource_id, resource_type, session_type,
          entry_code, timestamp, duration, accuracy_rate, avg_response_time, raw_data,
          class_id, class_name, module_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        input.studentId,
        null,
        input.resourceId,
        TASK_TRAINING_RESOURCE_TYPE,
        TASK_TRAINING_RESOURCE_TYPE,
        TASK_TRAINING_ENTRY_CODE,
        input.startedAt,
        durationSeconds,
        accuracyRate,
        averageResponseTime,
        JSON.stringify(rawPayload),
        classId,
        className,
        TASK_TRAINING_MODULE_CODE,
      ])

      const trainingRecordId = this.getLastInsertId()
      const sessionId = new TrainingSessionWriter(this.db).upsertSession({
        studentId: input.studentId,
        moduleCode: TASK_TRAINING_MODULE_CODE,
        entryCode: TASK_TRAINING_ENTRY_CODE,
        sessionFamily: TASK_TRAINING_RESOURCE_TYPE,
        resourceId: input.resourceId,
        resourceType: TASK_TRAINING_RESOURCE_TYPE,
        taskId: null,
        taskNameSnapshot: resource.name || null,
        classId,
        className,
        startedAt: toIsoStringFromTimestamp(input.startedAt),
        endedAt: input.endedAt ? toIsoStringFromTimestamp(input.endedAt) : null,
        durationMs,
        completionStatus: input.completionStatus,
        accuracyRate,
        avgResponseTimeMs: averageResponseTime,
        summaryPayload: rawPayload,
        sourceTable: 'training_records',
        sourceRecordId: trainingRecordId,
      })

      rawDb.run('COMMIT')

      if (typeof this.db.saveNow === 'function') {
        await this.db.saveNow()
      }

      return {
        trainingRecordId,
        sessionId,
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
}
