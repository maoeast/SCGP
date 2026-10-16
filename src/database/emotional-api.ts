import type {
  EmotionalBaseEmotion,
  EmotionalCareType,
  EmotionalTrainingSummaryRawData,
  PersistEmotionalSessionInput,
  PersistEmotionalSessionResult,
} from '../types/emotional'
import { getEmotionCatalogEntry, parseEmotionalBaseEmotion } from '@/features/emotional/emotion-catalog'
import { resolveTrainingEntryCode } from '@/utils/training-entry'
import { TrainingSessionWriter } from './training-session-writer'

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
  averageHintLevel: number | null
  completionStatus: 'completed' | 'cancelled' | 'interrupted'
  createdAt: string
}

export interface EmotionalTrendPoint {
  label: string
  accuracy: number
}

export interface EmotionalPerformancePoint {
  emotion: string
  accuracy: number
  averageHintLevel: number | null
  color: string
}

export interface EmotionalReportCoverage {
  emotionSessions: number
  emotionChoiceSamples: number
  emotionChoiceMissing: number
  hintSamples: number
  careSessions: number
  classifiedCareSessions: number
  unclassifiedCareSessions: number
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
  averageHintLevel: number | null
  totalDurationMinutes: number
  coverage: EmotionalReportCoverage
  coverageText: string
  trend: EmotionalTrendPoint[]
  emotionPerformance: EmotionalPerformancePoint[]
  carePreference: EmotionalPreferencePoint[]
  sceneMastery: EmotionalSceneMasteryPoint[]
  sceneDomainMastery: EmotionalSceneMasteryPoint[]
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

type ReportEmotionKey = EmotionalBaseEmotion | 'unknown'
type ReportCareTypeKey = EmotionalCareType | 'unknown'

const CARE_TYPE_LABEL_MAP: Record<EmotionalCareType, string> = {
  empathy: '共情式',
  advice: '建议式',
  action: '行动式',
}

const REPORT_CATEGORY_LABEL_MAP: Record<string, string> = {
  imported_emotion_scene: '导入情绪场景',
  imported_care_scene: '导入关心情境',
  unknown: '未分类',
}

function normalizeReportEmotionKey(value: unknown): ReportEmotionKey {
  return parseEmotionalBaseEmotion(value) || 'unknown'
}

function getReportEmotionLabel(value: ReportEmotionKey): string {
  return value === 'unknown'
    ? '未知情绪'
    : getEmotionCatalogEntry(value, value).label
}

function normalizeReportCareTypeKey(value: unknown): ReportCareTypeKey {
  return value === 'empathy' || value === 'advice' || value === 'action'
    ? value
    : 'unknown'
}

function getReportCareTypeLabel(value: ReportCareTypeKey): string {
  return value === 'unknown' ? '未分类' : CARE_TYPE_LABEL_MAP[value]
}

function getReportCategoryLabel(value: unknown): string {
  if (typeof value !== 'string') {
    return '未分类'
  }

  const normalized = value.trim()
  if (!normalized) {
    return '未分类'
  }

  return REPORT_CATEGORY_LABEL_MAP[normalized] || normalized
}

export class EmotionalTrainingAPI {
  async persistSession(input: PersistEmotionalSessionInput): Promise<PersistEmotionalSessionResult> {
    const db = getActiveDb()
    const rawDb = getRawDb(db)

    const student = db.get(
      'SELECT name, current_class_id, current_class_name FROM student WHERE id = ?',
      [input.studentId]
    )
    const resource = db.get(
      'SELECT name FROM sys_training_resource WHERE id = ?',
      [input.resourceId]
    )
    const classId = student?.current_class_id || null
    const className = student?.current_class_name || null
    const studentName = student?.name || `学生${input.studentId}`
    const taskNameSnapshot = resource?.name || input.summary.sessionType || input.subModule

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
    const entryCode = resolveTrainingEntryCode(undefined, 'emotional')

    rawDb.run('BEGIN TRANSACTION')

    try {
      db.run(`
        INSERT INTO training_records (
          student_id, task_id, resource_id, resource_type, session_type,
          entry_code, timestamp, duration, accuracy_rate, avg_response_time, raw_data,
          class_id, class_name, module_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        input.studentId,
        null,
        input.resourceId,
        input.resourceType,
        input.subModule,
        entryCode,
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

      new TrainingSessionWriter(db).upsertSession({
        studentId: input.studentId,
        moduleCode: 'emotional',
        entryCode,
        sessionFamily: 'emotional_scene',
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        taskNameSnapshot,
        classId,
        className,
        startedAt: toIsoString(input.startedAt),
        endedAt: toIsoString(input.endedAt),
        durationMs,
        completionStatus: input.completionStatus,
        accuracyRate,
        avgResponseTimeMs: avgResponseTime,
        summaryPayload: summaryRawData,
        sourceTable: 'training_records',
        sourceRecordId: trainingRecordId,
      })

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

      if (input.completionStatus === 'completed') {
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
        s.completion_status,
        (
          SELECT AVG(d.hint_level)
          FROM emotional_training_detail d
          WHERE d.session_id = s.id
        ) AS average_hint_level,
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
      averageHintLevel: row.average_hint_level === null || row.average_hint_level === undefined
        ? null
        : round(Number(row.average_hint_level), 2),
      completionStatus: row.completion_status || 'completed',
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
        averageHintLevel: null,
        totalDurationMinutes: 0,
        coverage: { emotionSessions: 0, emotionChoiceSamples: 0, emotionChoiceMissing: 0, hintSamples: 0, careSessions: 0, classifiedCareSessions: 0, unclassifiedCareSessions: 0 },
        coverageText: '当前没有可统计的情绪训练会话。',
        trend: [],
        emotionPerformance: [],
        carePreference: [],
        sceneMastery: [],
        sceneDomainMastery: [],
        suggestions: ['当前还没有情绪模块训练记录，完成训练后这里会显示趋势和建议。'],
      }
    }

    const studentName = records[0]?.studentName || `学生 #${studentId}`
    const averageAccuracy = round(records.reduce((sum, item) => sum + item.accuracyRate, 0) / records.length * 100, 1)
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

    const hintValues = sessionDetails.flatMap((item) => item.detailRows
      .filter((detail: any) => detail.hint_level !== null && detail.hint_level !== undefined && Number.isFinite(Number(detail.hint_level)))
      .map((detail: any) => Number(detail.hint_level)))
    const averageHintLevel = hintValues.length > 0
      ? round(hintValues.reduce((sum, value) => sum + value, 0) / hintValues.length, 2)
      : null
    const coverage: EmotionalReportCoverage = {
      emotionSessions: records.filter((item) => item.subModule === 'emotion_scene').length,
      emotionChoiceSamples: 0,
      emotionChoiceMissing: 0,
      hintSamples: hintValues.length,
      careSessions: records.filter((item) => item.subModule === 'care_scene').length,
      classifiedCareSessions: 0,
      unclassifiedCareSessions: 0,
    }

    const emotionAgg = new Map<ReportEmotionKey, { hits: number; total: number; hintSum: number; hintCount: number; color: string }>()
    sessionDetails
      .filter((item) => item.record.subModule === 'emotion_scene')
      .forEach((item) => {
        const targetEmotion = normalizeReportEmotionKey(item.metadata?.targetEmotion)
        const detail = item.detailRows.filter((row: any) => row.step_type === 'emotion_choice').slice(-1)[0]
        if (targetEmotion === 'unknown' || !detail || detail.is_correct === null || detail.is_correct === undefined
          || ![0, 1].includes(Number(detail.is_correct))) return
        coverage.emotionChoiceSamples += 1
        const bucket = emotionAgg.get(targetEmotion) || {
          hits: 0,
          total: 0,
          hintSum: 0,
          hintCount: 0,
          color: item.metadata?.emotionColorHex || '#909399',
        }
        bucket.total += 1
        bucket.hits += Number(detail.is_correct)
        if (detail.hint_level !== null && detail.hint_level !== undefined && Number.isFinite(Number(detail.hint_level))) {
          bucket.hintSum += Number(detail.hint_level)
          bucket.hintCount += 1
        }
        emotionAgg.set(targetEmotion, bucket)
      })
    coverage.emotionChoiceMissing = coverage.emotionSessions - coverage.emotionChoiceSamples

    const emotionPerformance = Array.from(emotionAgg.entries()).map(([emotion, stats]) => ({
      emotion: getReportEmotionLabel(emotion),
      accuracy: stats.total > 0 ? round((stats.hits / stats.total) * 100, 1) : 0,
      averageHintLevel: stats.hintCount > 0 ? round(stats.hintSum / stats.hintCount, 2) : null,
      color: stats.color,
    }))

    const carePreferenceMap = new Map<ReportCareTypeKey, number>()
    sessionDetails
      .filter((item) => item.record.subModule === 'care_scene')
      .forEach((item) => {
        const summaryType = item.record.trainingRecordId
          ? db.get('SELECT raw_data FROM training_records WHERE id = ?', [item.record.trainingRecordId])?.raw_data
          : null
        const parsed = summaryType ? JSON.parse(summaryType) : null
        const key = normalizeReportCareTypeKey(parsed?.dominantChoiceType)
        if (key === 'unknown') {
          coverage.unclassifiedCareSessions += 1
          return
        }
        coverage.classifiedCareSessions += 1
        carePreferenceMap.set(key, (carePreferenceMap.get(key) || 0) + 1)
      })

    const carePreference = Array.from(carePreferenceMap.entries()).map(([name, value]) => ({
      name: getReportCareTypeLabel(name),
      value,
    }))
    const coverageText = `逐题情绪识别 ${coverage.emotionChoiceSamples}/${coverage.emotionSessions} 次可核验；提示明细 ${coverage.hintSamples} 条；关心表达 ${coverage.classifiedCareSessions}/${coverage.careSessions} 次可分类。缺失明细与未分类记录不计为错误、零提示或偏好；趋势与场景分布仍使用已存会话汇总。`

    const sceneMasteryMap = new Map<string, { total: number; accuracySum: number }>()
    records
      .filter((item) => item.subModule === 'emotion_scene')
      .forEach((item) => {
        const category = getReportCategoryLabel(item.resourceCategory)
        const bucket = sceneMasteryMap.get(category) || { total: 0, accuracySum: 0 }
        bucket.total += 1
        bucket.accuracySum += item.accuracyRate * 100
        sceneMasteryMap.set(category, bucket)
      })

    const sceneMastery = Array.from(sceneMasteryMap.entries()).map(([category, stats]) => ({
      category,
      accuracy: stats.total > 0 ? round(stats.accuracySum / stats.total, 1) : 0,
    }))

    const sceneDomainMasteryMap = new Map<string, { total: number; accuracySum: number }>()
    sessionDetails
      .filter((item) => item.record.subModule === 'emotion_scene')
      .forEach((item) => {
        const sceneDomain = item.metadata?.sceneDomain || '未分类'
        const bucket = sceneDomainMasteryMap.get(sceneDomain) || { total: 0, accuracySum: 0 }
        bucket.total += 1
        bucket.accuracySum += item.record.accuracyRate * 100
        sceneDomainMasteryMap.set(sceneDomain, bucket)
      })

    const sceneDomainMastery = Array.from(sceneDomainMasteryMap.entries()).map(([category, stats]) => ({
      category,
      accuracy: stats.total > 0 ? round(stats.accuracySum / stats.total, 1) : 0,
    }))

    const weakestEmotion = emotionPerformance.slice().sort((a, b) => a.accuracy - b.accuracy)[0]
    const highestHintEmotion = emotionPerformance.filter((item) => item.averageHintLevel !== null)
      .sort((a, b) => (b.averageHintLevel ?? 0) - (a.averageHintLevel ?? 0))[0]
    const preferredCare = carePreference.slice().sort((a, b) => b.value - a.value)[0]

    const suggestions: string[] = []
    if (coverage.emotionChoiceMissing > 0 || coverage.unclassifiedCareSessions > 0) {
      suggestions.push('部分历史会话缺少可核验明细或关心类型，相关图表与偏好只使用已注明覆盖范围的数据。')
    }
    if (weakestEmotion && weakestEmotion.accuracy < 80) {
      suggestions.push(`在可核验的情绪识别明细中，“${weakestEmotion.emotion}”正确率为 ${weakestEmotion.accuracy}%；请结合具体题目和日常观察核对。`)
    }
    if (highestHintEmotion && highestHintEmotion.averageHintLevel !== null && highestHintEmotion.averageHintLevel >= 1.5) {
      suggestions.push(`可核验的“${highestHintEmotion.emotion}”情绪识别明细平均提示层级为 ${highestHintEmotion.averageHintLevel}，请核对具体提示记录。`)
    }
    if (preferredCare && coverage.classifiedCareSessions >= 3) {
      suggestions.push(`在 ${coverage.classifiedCareSessions} 次可分类关心会话中，“${preferredCare.name}”记录最多；该统计仅描述软件内选择。`)
    }
    if (suggestions.length === 0) {
      suggestions.push('当前可核验的逐题样本不足以形成具体表现建议，请结合原始记录与日常观察。')
    }

    return {
      studentId,
      studentName,
      totalSessions: records.length,
      averageAccuracy,
      averageHintLevel,
      totalDurationMinutes,
      coverage,
      coverageText,
      trend,
      emotionPerformance,
      carePreference,
      sceneMastery,
      sceneDomainMastery,
      suggestions,
    }
  }
}

export default {
  EmotionalTrainingAPI,
}
