import type {
  EmotionalTrainingSummaryRawData,
  PersistEmotionalSessionInput,
  PersistEmotionalSessionResult,
} from '../types/emotional'

export interface EmotionalSessionRecordItem {
  sessionId: number
  trainingRecordId: number
  studentId: number
  studentName: string
  resourceId: number
  resourceName: string
  resourceCategory: string
  subModule: string
  sessionType: string
  durationMs: number
  questionCount: number
  correctCount: number
  accuracyRate: number
  hintCount: number
  retryCount: number
  averageHintLevel: number
  createdAt: string
}

export interface EmotionalTrendPoint {
  label: string
  accuracy: number
}

export interface EmotionalPerformancePoint {
  emotion: string
  accuracy: number
  averageHintLevel: number
  color: string
}

export interface EmotionalPreferencePoint {
  name: string
  value: number
}

export interface EmotionalSceneMasteryPoint {
  category: string
  accuracy: number
}

export interface EmotionalStudentReportPayload {
  studentId: number
  studentName: string
  totalSessions: number
  averageAccuracy: number
  averageHintLevel: number
  totalDurationMinutes: number
  trend: EmotionalTrendPoint[]
  emotionPerformance: EmotionalPerformancePoint[]
  carePreference: EmotionalPreferencePoint[]
  sceneMastery: EmotionalSceneMasteryPoint[]
  suggestions: string[]
}

type DbLike = {
  get: (sql: string, params?: any[]) => any
  all?: (sql: string, params?: any[]) => any[]
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

function queryAll(db: DbLike, sql: string, params: any[] = []): any[] {
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

function toIsoString(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export class EmotionalTrainingAPI {
  async persistSession(input: PersistEmotionalSessionInput): Promise<PersistEmotionalSessionResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)

    const student = db.get(
      'SELECT name, current_class_id, current_class_name FROM student WHERE id = ?',
      [input.studentId]
    )
    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null
    const studentName = student?.name || `学生${input.studentId}`

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

      const reportTitle = `${studentName} - 情绪行为调节训练报告`
      const existingReport = db.get(
        `SELECT id
         FROM report_record
         WHERE student_id = ? AND report_type = 'emotional'`,
        [input.studentId]
      )

      if (existingReport?.id) {
        db.run(`
          UPDATE report_record
          SET training_record_id = ?, title = ?, class_id = ?, class_name = ?,
              module_code = 'emotional', created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [trainingRecordId, reportTitle, classId, className, existingReport.id])
      } else {
        db.run(`
          INSERT INTO report_record (
            student_id, report_type, training_record_id, title,
            class_id, class_name, module_code, created_at, updated_at
          ) VALUES (?, 'emotional', ?, ?, ?, ?, 'emotional', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [input.studentId, trainingRecordId, reportTitle, classId, className])
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
    return queryAll(db, `
      SELECT *
      FROM emotional_training_detail
      WHERE session_id = ?
      ORDER BY step_index ASC, id ASC
    `, [sessionId])
  }

  getRecordList(filters?: {
    studentId?: number
    subModule?: string
    startDate?: string
    endDate?: string
  }): EmotionalSessionRecordItem[] {
    const db = getActiveDb()

    let sql = `
      SELECT
        s.id AS session_id,
        s.training_record_id,
        s.student_id,
        st.name AS student_name,
        s.resource_id,
        r.name AS resource_name,
        r.category AS resource_category,
        s.sub_module,
        tr.session_type,
        s.duration_ms,
        s.question_count,
        s.correct_count,
        s.accuracy_rate,
        s.hint_count,
        s.retry_count,
        COALESCE((
          SELECT AVG(d.hint_level)
          FROM emotional_training_detail d
          WHERE d.session_id = s.id
        ), 0) AS average_hint_level,
        s.created_at
      FROM emotional_training_session s
      INNER JOIN student st ON st.id = s.student_id
      LEFT JOIN sys_training_resource r ON r.id = s.resource_id
      LEFT JOIN training_records tr ON tr.id = s.training_record_id
      WHERE 1 = 1
    `
    const params: any[] = []

    if (filters?.studentId) {
      sql += ' AND s.student_id = ?'
      params.push(filters.studentId)
    }

    if (filters?.subModule) {
      sql += ' AND s.sub_module = ?'
      params.push(filters.subModule)
    }

    if (filters?.startDate) {
      sql += ' AND s.created_at >= ?'
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      sql += ' AND s.created_at <= ?'
      params.push(filters.endDate)
    }

    sql += ' ORDER BY s.created_at DESC'

    return queryAll(db, sql, params).map((row: any) => ({
      sessionId: row.session_id,
      trainingRecordId: row.training_record_id,
      studentId: row.student_id,
      studentName: row.student_name || '未知学生',
      resourceId: row.resource_id,
      resourceName: row.resource_name || '未命名资源',
      resourceCategory: row.resource_category || '未分类',
      subModule: row.sub_module,
      sessionType: row.session_type || row.sub_module,
      durationMs: row.duration_ms || 0,
      questionCount: row.question_count || 0,
      correctCount: row.correct_count || 0,
      accuracyRate: row.accuracy_rate || 0,
      hintCount: row.hint_count || 0,
      retryCount: row.retry_count || 0,
      averageHintLevel: round(Number(row.average_hint_level || 0), 2),
      createdAt: row.created_at,
    }))
  }

  getStudentsWithEmotionalSessions(): Array<{ id: number; name: string }> {
    const db = getActiveDb()
    return queryAll(db, `
      SELECT DISTINCT st.id, st.name
      FROM emotional_training_session s
      INNER JOIN student st ON st.id = s.student_id
      ORDER BY st.name ASC
    `)
  }

  getStudentReportPayload(studentId: number): EmotionalStudentReportPayload {
    const db = getActiveDb()
    const records = this.getRecordList({ studentId })
    if (records.length === 0) {
      return {
        studentId,
        studentName: `学生 #${studentId}`,
        totalSessions: 0,
        averageAccuracy: 0,
        averageHintLevel: 0,
        totalDurationMinutes: 0,
        trend: [],
        emotionPerformance: [],
        carePreference: [],
        sceneMastery: [],
        suggestions: ['当前还没有情绪模块训练记录，完成训练后这里会显示趋势和建议。'],
      }
    }

    const studentName = records[0]?.studentName || `学生 #${studentId}`
    const averageAccuracy = round(records.reduce((sum, item) => sum + item.accuracyRate, 0) / records.length * 100, 1)
    const averageHintLevel = round(records.reduce((sum, item) => sum + item.averageHintLevel, 0) / records.length, 2)
    const totalDurationMinutes = round(records.reduce((sum, item) => sum + item.durationMs, 0) / 60000, 1)

    const trend = records
      .filter((item) => item.subModule === 'emotion_scene')
      .slice()
      .reverse()
      .map((item) => ({
        label: `${new Date(item.createdAt).toLocaleDateString('zh-CN')}`,
        accuracy: round(item.accuracyRate * 100, 1),
      }))

    const sessionDetails = records.map((record) => {
      const session = this.getSessionByTrainingRecordId(record.trainingRecordId)
      const detailRows = this.getSessionDetails(record.sessionId)
      const resourceRow = db.get(
        'SELECT meta_data FROM sys_training_resource WHERE id = ?',
        [record.resourceId]
      )
      const metadata = resourceRow?.meta_data ? JSON.parse(resourceRow.meta_data) : {}
      return { record, session, detailRows, metadata }
    })

    const emotionAgg = new Map<string, { hits: number; total: number; hintSum: number; color: string }>()
    sessionDetails
      .filter((item) => item.record.subModule === 'emotion_scene')
      .forEach((item) => {
        const targetEmotion = item.metadata?.targetEmotion || 'unknown'
        const detail = item.detailRows.filter((row: any) => row.step_type === 'emotion_choice').slice(-1)[0]
        const bucket = emotionAgg.get(targetEmotion) || {
          hits: 0,
          total: 0,
          hintSum: 0,
          color: item.metadata?.emotionColorHex || '#909399',
        }
        bucket.total += 1
        bucket.hits += detail?.is_correct ? 1 : 0
        bucket.hintSum += Number(detail?.hint_level || 0)
        emotionAgg.set(targetEmotion, bucket)
      })

    const emotionPerformance = Array.from(emotionAgg.entries()).map(([emotion, stats]) => ({
      emotion,
      accuracy: stats.total > 0 ? round((stats.hits / stats.total) * 100, 1) : 0,
      averageHintLevel: stats.total > 0 ? round(stats.hintSum / stats.total, 2) : 0,
      color: stats.color,
    }))

    const carePreferenceMap = new Map<string, number>()
    sessionDetails
      .filter((item) => item.record.subModule === 'care_scene')
      .forEach((item) => {
        const summaryType = item.record.trainingRecordId
          ? db.get('SELECT raw_data FROM training_records WHERE id = ?', [item.record.trainingRecordId])?.raw_data
          : null
        const parsed = summaryType ? JSON.parse(summaryType) : null
        const key = parsed?.dominantChoiceType || 'unknown'
        carePreferenceMap.set(key, (carePreferenceMap.get(key) || 0) + 1)
      })

    const carePreference = Array.from(carePreferenceMap.entries()).map(([name, value]) => ({
      name,
      value,
    }))

    const sceneMasteryMap = new Map<string, { total: number; accuracySum: number }>()
    records.forEach((item) => {
      const bucket = sceneMasteryMap.get(item.resourceCategory) || { total: 0, accuracySum: 0 }
      bucket.total += 1
      bucket.accuracySum += item.accuracyRate * 100
      sceneMasteryMap.set(item.resourceCategory, bucket)
    })

    const sceneMastery = Array.from(sceneMasteryMap.entries()).map(([category, stats]) => ({
      category,
      accuracy: stats.total > 0 ? round(stats.accuracySum / stats.total, 1) : 0,
    }))

    const weakestEmotion = emotionPerformance.slice().sort((a, b) => a.accuracy - b.accuracy)[0]
    const highestHintEmotion = emotionPerformance.slice().sort((a, b) => b.averageHintLevel - a.averageHintLevel)[0]
    const preferredCare = carePreference.slice().sort((a, b) => b.value - a.value)[0]

    const suggestions: string[] = []
    if (weakestEmotion) {
      suggestions.push(`孩子在“${weakestEmotion.emotion}”情绪识别上的正确率约为 ${weakestEmotion.accuracy}%，建议结合真实情境做更多泛化练习。`)
    }
    if (highestHintEmotion && highestHintEmotion.averageHintLevel >= 1.5) {
      suggestions.push(`“${highestHintEmotion.emotion}”相关任务平均仍需要 ${highestHintEmotion.averageHintLevel} 级提示，可先加强表情线索和场景线索配对。`)
    }
    if (preferredCare) {
      suggestions.push(`当前孩子更常选择“${preferredCare.name}”式关心表达，后续可有意识补充其他表达方式的练习。`)
    }
    if (suggestions.length === 0) {
      suggestions.push('孩子在情绪模块中整体表现稳定，可以继续通过日常场景做自然巩固。')
    }

    return {
      studentId,
      studentName,
      totalSessions: records.length,
      averageAccuracy,
      averageHintLevel,
      totalDurationMinutes,
      trend,
      emotionPerformance,
      carePreference,
      sceneMastery,
      suggestions,
    }
  }
}

export default {
  EmotionalTrainingAPI,
}
