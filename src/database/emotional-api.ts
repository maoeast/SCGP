import type {
  EmotionalTrainingSummaryRawData,
  PersistEmotionalSessionInput,
  PersistEmotionalSessionResult,
} from '../types/emotional'

type DbLike = {
  get: (sql: string, params?: any[]) => any
  run: (sql: string, params?: any[]) => any
  exec?: (sql: string) => any
  getRawDB?: () => any
  lastInsertId?: () => number
  saveNow?: () => Promise<void>
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

function toIsoString(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

export class EmotionalTrainingAPI {
  async persistSession(input: PersistEmotionalSessionInput): Promise<PersistEmotionalSessionResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)

    const student = db.get(
      'SELECT current_class_id, current_class_name FROM student WHERE id = ?',
      [input.studentId]
    )
    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null

    const durationMs = Math.max(0, input.endedAt - input.startedAt)
    const accuracyRate = input.summary.questionCount > 0
      ? input.summary.correctCount / input.summary.questionCount
      : 0
    const avgResponseTime = input.details.length > 0
      ? Math.round(input.details.reduce((sum, item) => sum + (item.response_time_ms || 0), 0) / input.details.length)
      : 0

    const summaryRawData: EmotionalTrainingSummaryRawData = {
      ...input.summary,
      sessionType: input.summary.sessionType || input.subModule,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      subModule: input.subModule,
    }

    rawDb.run('BEGIN TRANSACTION')

    try {
      db.run(`
        INSERT INTO training_records (
          student_id, task_id, resource_id, resource_type, session_type,
          timestamp, duration, accuracy_rate, avg_response_time, raw_data,
          class_id, class_name, module_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        input.studentId,
        null,
        input.resourceId,
        input.resourceType,
        input.subModule,
        input.startedAt,
        durationMs,
        accuracyRate,
        avgResponseTime,
        JSON.stringify(summaryRawData),
        classId,
        className,
        'emotional',
      ])

      const trainingRecordId = getLastInsertId(db)

      db.run(`
        INSERT INTO emotional_training_session (
          training_record_id, student_id, module_code, sub_module,
          resource_id, resource_type, start_time, end_time, duration_ms,
          question_count, correct_count, accuracy_rate, hint_count, retry_count,
          completion_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        trainingRecordId,
        input.studentId,
        'emotional',
        input.subModule,
        input.resourceId,
        input.resourceType,
        toIsoString(input.startedAt),
        toIsoString(input.endedAt),
        durationMs,
        input.summary.questionCount,
        input.summary.correctCount,
        accuracyRate,
        input.summary.hintCount,
        input.summary.retryCount,
        input.completionStatus,
      ])

      const sessionId = getLastInsertId(db)
      const detailIds: number[] = []

      for (const detail of input.details) {
        db.run(`
          INSERT INTO emotional_training_detail (
            session_id, student_id, resource_id, step_type, step_index,
            prompt_id, selected_value, selected_label, is_correct, is_acceptable,
            hint_level, retry_count, response_time_ms, feedback_code, perspective
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          sessionId,
          detail.student_id,
          detail.resource_id,
          detail.step_type,
          detail.step_index,
          detail.prompt_id || null,
          detail.selected_value || null,
          detail.selected_label || null,
          detail.is_correct,
          detail.is_acceptable,
          detail.hint_level,
          detail.retry_count,
          detail.response_time_ms || null,
          detail.feedback_code || null,
          detail.perspective,
        ])

        detailIds.push(getLastInsertId(db))
      }

      rawDb.run('COMMIT')
      if (typeof db.saveNow === 'function') {
        await db.saveNow()
      }

      return {
        trainingRecordId,
        sessionId,
        detailIds,
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

  getSessionByTrainingRecordId(trainingRecordId: number) {
    const db = getActiveDb()
    return db.get(`
      SELECT *
      FROM emotional_training_session
      WHERE training_record_id = ?
    `, [trainingRecordId])
  }

  getSessionDetails(sessionId: number) {
    const db = getActiveDb()
    const rawDb = getRawDb(db)
    if (typeof rawDb.all === 'function') {
      return rawDb.all(`
        SELECT *
        FROM emotional_training_detail
        WHERE session_id = ?
        ORDER BY step_index ASC, id ASC
      `, [sessionId])
    }
    return []
  }
}

export default {
  EmotionalTrainingAPI,
}
