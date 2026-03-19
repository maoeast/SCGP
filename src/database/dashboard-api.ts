import { DatabaseAPI } from './api'

export interface DashboardOverview {
  studentCount: number
  pendingAssessmentCount: number
  todayTaskCount: number
  weeklyAnomalyCount: number
}

export interface DashboardScheduleItem {
  planId: number
  planName: string
  moduleCode: string
  studentId: number
  studentName: string
  avatarPath: string | null
  startDate: string
  endDate: string
  resourceCount: number
}

export interface DashboardAnomalyItem {
  id: string
  source: 'training' | 'emotional'
  studentId: number
  studentName: string
  avatarPath: string | null
  moduleCode: string
  moduleLabel: string
  sessionLabel: string
  accuracyRate: number | null
  averageHintLevel: number | null
  createdAt: string
  reason: string
}

export interface DashboardAssessmentAlertItem {
  studentId: number
  studentName: string
  avatarPath: string | null
  disorder: string | null
  lastAssessmentAt: string | null
  daysSinceLastAssessment: number | null
  suggestion: string
}

export interface DashboardSnapshot {
  overview: DashboardOverview
  schedule: DashboardScheduleItem[]
  anomalies: DashboardAnomalyItem[]
  assessmentAlerts: DashboardAssessmentAlertItem[]
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  const seconds = `${date.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function daysBetweenNow(dateText: string | null): number | null {
  if (!dateText) return null
  const target = new Date(dateText)
  if (Number.isNaN(target.getTime())) return null
  const diffMs = Date.now() - target.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export class DashboardAPI extends DatabaseAPI {
  async getSnapshot(): Promise<DashboardSnapshot> {
    const [schedule, anomalies, assessmentAlerts, studentCount] = await Promise.all([
      this.getTodaySchedule(),
      this.getWeeklyAnomalies(),
      this.getAssessmentAlerts(),
      this.getStudentCount(),
    ])

    return {
      overview: {
        studentCount,
        pendingAssessmentCount: assessmentAlerts.length,
        todayTaskCount: schedule.length,
        weeklyAnomalyCount: anomalies.length,
      },
      schedule,
      anomalies,
      assessmentAlerts,
    }
  }

  async getStudentCount(): Promise<number> {
    const row = await this.queryOneAsync(`
      SELECT COUNT(*) AS count
      FROM student
    `)

    return normalizeNumber(row?.count)
  }

  async getTodaySchedule(): Promise<DashboardScheduleItem[]> {
    const today = formatDate(new Date())
    const rows = await this.queryAsync(
      `
        SELECT
          tp.id AS plan_id,
          tp.name AS plan_name,
          tp.module_code,
          tp.start_date,
          tp.end_date,
          tp.student_id,
          s.name AS student_name,
          s.avatar_path,
          COUNT(prm.id) AS resource_count
        FROM sys_training_plan tp
        INNER JOIN student s ON s.id = tp.student_id
        LEFT JOIN sys_plan_resource_map prm ON prm.plan_id = tp.id
        WHERE tp.is_active = 1
          AND tp.status = 'active'
          AND date(tp.start_date) <= date(?)
          AND date(tp.end_date) >= date(?)
        GROUP BY
          tp.id,
          tp.name,
          tp.module_code,
          tp.start_date,
          tp.end_date,
          tp.student_id,
          s.name,
          s.avatar_path
        ORDER BY date(tp.end_date) ASC, datetime(tp.updated_at) DESC
      `,
      [today, today],
    )

    return rows.map((row) => ({
      planId: normalizeNumber(row.plan_id),
      planName: row.plan_name || '未命名计划',
      moduleCode: row.module_code || 'all',
      studentId: normalizeNumber(row.student_id),
      studentName: row.student_name || `学生 #${row.student_id}`,
      avatarPath: row.avatar_path || null,
      startDate: row.start_date || '',
      endDate: row.end_date || '',
      resourceCount: normalizeNumber(row.resource_count),
    }))
  }

  async getWeeklyAnomalies(): Promise<DashboardAnomalyItem[]> {
    const since = formatDateTime(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    const rows = await this.queryAsync(
      `
        WITH emotional_anomalies AS (
          SELECT
            ets.id AS id,
            'emotional' AS source,
            ets.student_id,
            s.name AS student_name,
            s.avatar_path,
            ets.module_code,
            ets.sub_module AS session_label,
            ets.accuracy_rate,
            ROUND(COALESCE(AVG(etd.hint_level), 0), 2) AS average_hint_level,
            ets.created_at
          FROM emotional_training_session ets
          INNER JOIN student s ON s.id = ets.student_id
          LEFT JOIN emotional_training_detail etd ON etd.session_id = ets.id
          WHERE datetime(ets.created_at) >= datetime(?)
          GROUP BY
            ets.id,
            ets.student_id,
            s.name,
            s.avatar_path,
            ets.module_code,
            ets.sub_module,
            ets.accuracy_rate,
            ets.created_at
          HAVING ets.accuracy_rate < 0.5 OR COALESCE(AVG(etd.hint_level), 0) > 2
        )
        SELECT
          'training-' || tr.id AS item_id,
          'training' AS source,
          tr.student_id,
          s.name AS student_name,
          s.avatar_path,
          tr.module_code,
          COALESCE(tr.session_type, tr.resource_type, '训练任务') AS session_label,
          tr.accuracy_rate,
          NULL AS average_hint_level,
          tr.created_at,
          '正确率低于 50%' AS reason
        FROM training_records tr
        INNER JOIN student s ON s.id = tr.student_id
        WHERE datetime(tr.created_at) >= datetime(?)
          AND COALESCE(tr.module_code, 'sensory') != 'emotional'
          AND tr.accuracy_rate < 0.5

        UNION ALL

        SELECT
          'emotional-' || ea.id AS item_id,
          ea.source,
          ea.student_id,
          ea.student_name,
          ea.avatar_path,
          ea.module_code,
          ea.session_label,
          ea.accuracy_rate,
          ea.average_hint_level,
          ea.created_at,
          CASE
            WHEN ea.accuracy_rate < 0.5 AND ea.average_hint_level > 2 THEN '正确率偏低且提示依赖较高'
            WHEN ea.accuracy_rate < 0.5 THEN '正确率低于 50%'
            ELSE '平均提示层级高于 2'
          END AS reason
        FROM emotional_anomalies ea

        ORDER BY datetime(created_at) DESC
      `,
      [since, since],
    )

    return rows.map((row) => ({
      id: row.item_id,
      source: row.source,
      studentId: normalizeNumber(row.student_id),
      studentName: row.student_name || `学生 #${row.student_id}`,
      avatarPath: row.avatar_path || null,
      moduleCode: row.module_code || 'sensory',
      moduleLabel: this.getModuleLabel(row.module_code || 'sensory'),
      sessionLabel: this.getSessionLabel(row.module_code || 'sensory', row.session_label || ''),
      accuracyRate: row.accuracy_rate === null || row.accuracy_rate === undefined
        ? null
        : Number(row.accuracy_rate),
      averageHintLevel: row.average_hint_level === null || row.average_hint_level === undefined
        ? null
        : Number(row.average_hint_level),
      createdAt: row.created_at || '',
      reason: row.reason || '发现需要关注的训练波动',
    }))
  }

  async getAssessmentAlerts(): Promise<DashboardAssessmentAlertItem[]> {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 6)
    const cutoff = formatDateTime(cutoffDate)
    const rows = await this.queryAsync(
      `
        WITH assessment_union AS (
          SELECT student_id, created_at FROM sm_assess
          UNION ALL
          SELECT student_id, created_at FROM weefim_assess
          UNION ALL
          SELECT student_id, created_at FROM csirs_assess
          UNION ALL
          SELECT student_id, created_at FROM conners_psq_assess
          UNION ALL
          SELECT student_id, created_at FROM conners_trs_assess
          UNION ALL
          SELECT student_id, created_at FROM sdq_assess
          UNION ALL
          SELECT student_id, created_at FROM srs2_assess
          UNION ALL
          SELECT student_id, created_at FROM cbcl_assess
        ),
        latest_assessment AS (
          SELECT
            student_id,
            MAX(created_at) AS last_assessment_at
          FROM assessment_union
          GROUP BY student_id
        )
        SELECT
          s.id AS student_id,
          s.name AS student_name,
          s.avatar_path,
          s.disorder,
          la.last_assessment_at
        FROM student s
        LEFT JOIN latest_assessment la ON la.student_id = s.id
        WHERE la.last_assessment_at IS NULL
           OR datetime(la.last_assessment_at) < datetime(?)
        ORDER BY
          CASE WHEN la.last_assessment_at IS NULL THEN 0 ELSE 1 END ASC,
          datetime(la.last_assessment_at) ASC,
          datetime(s.created_at) DESC
      `,
      [cutoff],
    )

    return rows.map((row) => {
      const lastAssessmentAt = row.last_assessment_at || null
      const daysSince = daysBetweenNow(lastAssessmentAt)

      return {
        studentId: normalizeNumber(row.student_id),
        studentName: row.student_name || `学生 #${row.student_id}`,
        avatarPath: row.avatar_path || null,
        disorder: row.disorder || null,
        lastAssessmentAt,
        daysSinceLastAssessment: daysSince,
        suggestion: lastAssessmentAt
          ? `${row.student_name} 距离上次评估已超过 6 个月，建议安排复测。`
          : `${row.student_name} 尚无评估记录，建议尽快建立基线评估。`,
      }
    })
  }

  private getModuleLabel(moduleCode: string): string {
    const labels: Record<string, string> = {
      all: '综合训练',
      sensory: '感官训练',
      emotional: '情绪行为',
      social: '社交互动',
      cognitive: '认知训练',
      life_skills: '生活技能',
    }

    return labels[moduleCode] || moduleCode || '训练模块'
  }

  private getSessionLabel(moduleCode: string, sessionLabel: string): string {
    if (moduleCode === 'emotional') {
      const emotionalLabels: Record<string, string> = {
        emotion_scene: '情绪与场景',
        care_scene: '表达关心',
      }
      return emotionalLabels[sessionLabel] || '情绪训练'
    }

    return sessionLabel || '训练任务'
  }
}
