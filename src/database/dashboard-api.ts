import { DatabaseAPI } from './api'
import { QUALITY_TABLES } from './assessment-quality-api'
import { getCurrentTeacherStudentScope } from './teacher-scope-auth'
import { SCORE_ADAPTERS } from '@/services/assessment-score-adapters'
import {
  analyzeAssessmentGaps,
  isPriorityInsight,
  type ScaleLatestSnapshot,
  type StudentAssessmentInsight,
} from '@/services/assessment-gap-analysis'
import {
  ANOMALY_WINDOW_DAYS,
  anomalySeverityRank,
  evaluateTrainingAnomaly,
} from './training-anomaly-rules'
import {
  addLocalDays,
  buildTrainingProgress,
  COMPLETED_TRAINING_STATUS,
  DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS,
  formatLocalTimeLabel,
  normalizeTrainingCompletionStatus,
  normalizeTrainingProgressWindowDays,
  parseLocalDayKey,
  resolveTrainingProgressWindow,
  toSqlUtcDateTime,
  type TrainingCompletionStatus,
  type TrainingProgress,
  type TrainingProgressModuleSlice,
} from './training-progress-rules'
import { TASK_TRAINING_RESOURCE_TYPE } from '@/features/self-care/task-training-contract'
import { getTrainingPlanModuleLabel } from '@/utils/training-plan-module'

export interface DashboardOverview {
  studentCount: number
  /** 待办总数（= 面板清单长度） */
  pendingAssessmentCount: number
  /** 其中「优先处理」条数（明显偏弱 or 尚无评估记录） */
  pendingPriorityCount: number
  /** 其中「待补齐基线」条数（偏弱需关注 / 评估缺口 / 超期未复评） */
  pendingBaselineCount: number
  todayTaskCount: number
  weeklyAnomalyCount: number
  completedPlanCount: number
}

export interface DashboardRecentStudent {
  id: number
  name: string
  student_no: string
  avatar_path: string | null
  created_at: string
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
  launchResourceId: number | null
  launchResourceType: string | null
  launchResourceName: string | null
  launchResourceModuleCode: string | null
}

export interface DashboardAnomalyItem {
  id: string
  /** 统一主表来源（追溯用：training_records / equipment_training_records / game_emotion_records …） */
  source: string
  studentId: number
  studentName: string
  avatarPath: string | null
  moduleCode: string
  moduleLabel: string
  sessionLabel: string
  /** 正确率（仅答对率语义家族；器材/情绪游戏的得分率不透出，避免误读） */
  accuracyRate: number | null
  /** 平均每题提示次数（情绪场景会话级口径） */
  hintRatio: number | null
  /** 器材训练提示层级（1 独立完成 … 5 身体辅助） */
  promptLevel: number | null
  createdAt: string
  reason: string
}

export interface DashboardTrainingModuleSlice extends TrainingProgressModuleSlice {
  /** 模块展示名（API 层按 training-plan-module 单一真源填充） */
  moduleLabel: string
}

export interface DashboardTrainingProgress extends Omit<TrainingProgress, 'modules'> {
  modules: DashboardTrainingModuleSlice[]
}

export interface DashboardTrainingDayItem {
  sessionId: number
  studentId: number
  studentName: string
  avatarPath: string | null
  moduleCode: string
  moduleLabel: string
  taskLabel: string
  durationMs: number
  completionStatus: TrainingCompletionStatus
  /** 本地时刻 HH:mm（无法解析时为空串） */
  startedAtLabel: string
}

export interface DashboardSnapshot {
  overview: DashboardOverview
  schedule: DashboardScheduleItem[]
  anomalies: DashboardAnomalyItem[]
  /** 评估缺口与优先建议（「智能特教助理」面板） */
  assessmentInsights: StudentAssessmentInsight[]
  recentStudents: DashboardRecentStudent[]
  /** 训练进度概览（默认窗口；卡片内切换窗口时另行调用 getTrainingProgress） */
  trainingProgress: DashboardTrainingProgress
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

function normalizeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** 可空数值：脏数据/缺字段一律给 null（不猜 0，避免把「无数据」当「异常」） */
function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const LAUNCHABLE_TRAINING_RESOURCE_TYPES = [
  'equipment',
  'game',
  'flashcard',
  'emotion_scene',
  'care_scene',
  TASK_TRAINING_RESOURCE_TYPE,
] as const

const launchableTrainingResourceTypesSql = LAUNCHABLE_TRAINING_RESOURCE_TYPES
  .map((type) => `'${type}'`)
  .join(', ')

export class DashboardAPI extends DatabaseAPI {
  async getSnapshot(): Promise<DashboardSnapshot> {
    const [
      schedule,
      anomalies,
      assessmentInsights,
      studentCount,
      completedPlanCount,
      recentStudents,
      trainingProgress,
    ] = await Promise.all([
      this.getTodaySchedule(),
      this.getWeeklyAnomalies(),
      this.getAssessmentInsights(),
      this.getStudentCount(),
      this.getCompletedPlanCount(),
      this.getRecentStudents(),
      this.getTrainingProgress(),
    ])

    // 拆分口径：优先 = 明显偏弱 or 尚无评估记录（面板角标 / hero 文案用）
    const pendingPriorityCount = assessmentInsights.filter(isPriorityInsight).length

    return {
      overview: {
        studentCount,
        pendingAssessmentCount: assessmentInsights.length,
        pendingPriorityCount,
        pendingBaselineCount: assessmentInsights.length - pendingPriorityCount,
        todayTaskCount: schedule.length,
        weeklyAnomalyCount: anomalies.length,
        completedPlanCount,
      },
      schedule,
      anomalies,
      assessmentInsights,
      recentStudents,
      trainingProgress,
    }
  }

  async getStudentCount(): Promise<number> {
    const scope = getCurrentTeacherStudentScope('s')
    const row = await this.queryOneAsync(`
      SELECT COUNT(*) AS count
      FROM student s
      WHERE 1=1${scope.sql}
    `, scope.params)

    return normalizeNumber(row?.count)
  }

  async getCompletedPlanCount(): Promise<number> {
    const scope = getCurrentTeacherStudentScope('s')
    const row = await this.queryOneAsync(`
      SELECT COUNT(*) AS count
      FROM sys_training_plan tp
      LEFT JOIN student s ON s.id = tp.student_id
      WHERE tp.status = 'completed'${scope.sql}
    `, scope.params)

    return normalizeNumber(row?.count)
  }

  async getRecentStudents(): Promise<DashboardRecentStudent[]> {
    const scope = getCurrentTeacherStudentScope('s')
    const rows = await this.queryAsync(`
      SELECT id, name, student_no, avatar_path, created_at
      FROM student s
      WHERE 1=1${scope.sql}
      ORDER BY created_at DESC
      LIMIT 5
    `, scope.params)

    return rows.map((row) => ({
      id: normalizeNumber(row.id),
      name: row.name || `学生 #${row.id}`,
      student_no: row.student_no || '',
      avatar_path: row.avatar_path || null,
      created_at: row.created_at || '',
    }))
  }

  /**
   * 训练进度概览（首页看板卡片）。
   *
   * 数据源：统一训练主表 `training_session`。旧实现直扫 legacy 表 `training_records`，
   * 实测只覆盖约 77% 的会话（器材 / 情绪小游戏写自己的旧表，认知内联游戏只写统一主表）；
   * 时长一律取 `duration_ms`（legacy `duration` 单位混杂：同列既有秒又有毫秒）。
   * 窗口 = 最近 N 个本地自然日（含今天）＋ 上一等长窗口（环比）；分桶与聚合全部交给
   * 纯函数 buildTrainingProgress（口径单一真源，见 training-progress-rules）。
   */
  async getTrainingProgress(
    windowDays: number = DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS,
  ): Promise<DashboardTrainingProgress> {
    const days = normalizeTrainingProgressWindowDays(windowDays)
    const now = new Date()
    const range = resolveTrainingProgressWindow(days, now)
    const scope = getCurrentTeacherStudentScope('s')

    const [windowRows, previousRows] = await Promise.all([
      this.queryAsync(
        `
          SELECT ts.started_at, ts.duration_ms, ts.student_id, ts.module_code, ts.completion_status
          FROM training_session ts
          INNER JOIN student s ON s.id = ts.student_id
          WHERE datetime(ts.started_at) >= datetime(?)
            AND datetime(ts.started_at) < datetime(?)${scope.sql}
          ORDER BY ts.started_at ASC
        `,
        [toSqlUtcDateTime(range.start), toSqlUtcDateTime(range.end), ...scope.params],
      ),
      this.queryAsync(
        `
          SELECT ts.duration_ms, ts.student_id, ts.completion_status
          FROM training_session ts
          INNER JOIN student s ON s.id = ts.student_id
          WHERE datetime(ts.started_at) >= datetime(?)
            AND datetime(ts.started_at) < datetime(?)${scope.sql}
        `,
        [
          toSqlUtcDateTime(range.previousStart),
          toSqlUtcDateTime(range.previousEnd),
          ...scope.params,
        ],
      ),
    ])

    const progress = buildTrainingProgress({
      windowRows: windowRows.map((row) => ({
        startedAt: row.started_at,
        durationMs: row.duration_ms,
        studentId: row.student_id,
        moduleCode: row.module_code,
        completionStatus: row.completion_status,
      })),
      previousRows: previousRows.map((row) => ({
        durationMs: row.duration_ms,
        studentId: row.student_id,
        completionStatus: row.completion_status,
      })),
      windowDays: days,
      now,
    })

    return {
      ...progress,
      modules: progress.modules.map((slice) => ({
        ...slice,
        moduleLabel: this.getModuleLabel(slice.moduleCode),
      })),
    }
  }

  /**
   * 某个本地自然日的训练会话明细（卡片日趋势下钻）。
   * 日期参数为图表点上的 `YYYY-MM-DD` 本地日 key。
   */
  async getTrainingDayDetail(date: string): Promise<DashboardTrainingDayItem[]> {
    const dayStart = parseLocalDayKey(date)
    if (!dayStart) return []

    const scope = getCurrentTeacherStudentScope('s')
    const rows = await this.queryAsync(
      `
        SELECT ts.id, ts.student_id, s.name AS student_name, s.avatar_path,
               ts.module_code, ts.task_name_snapshot, ts.entry_code,
               ts.duration_ms, ts.completion_status, ts.started_at
        FROM training_session ts
        INNER JOIN student s ON s.id = ts.student_id
        WHERE datetime(ts.started_at) >= datetime(?)
          AND datetime(ts.started_at) < datetime(?)${scope.sql}
        ORDER BY ts.started_at ASC
      `,
      [
        toSqlUtcDateTime(dayStart),
        toSqlUtcDateTime(addLocalDays(dayStart, 1)),
        ...scope.params,
      ],
    )

    return rows.map((row) => {
      const moduleCode = row.module_code || 'sensory'
      return {
        sessionId: normalizeNumber(row.id),
        studentId: normalizeNumber(row.student_id),
        studentName: row.student_name || `学生 #${row.student_id}`,
        avatarPath: row.avatar_path || null,
        moduleCode,
        moduleLabel: this.getModuleLabel(moduleCode),
        taskLabel: row.task_name_snapshot || row.entry_code || '训练任务',
        durationMs: normalizeNumber(row.duration_ms),
        // 建表 CHECK 保证枚举合法；脏数据回退到默认完成态（与建表 DEFAULT 一致）
        completionStatus: normalizeTrainingCompletionStatus(row.completion_status)
          ?? COMPLETED_TRAINING_STATUS,
        startedAtLabel: formatLocalTimeLabel(row.started_at),
      }
    })
  }

  async getTodaySchedule(): Promise<DashboardScheduleItem[]> {
    const today = formatDate(new Date())
    const scope = getCurrentTeacherStudentScope('s')
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
          COUNT(prm.id) AS resource_count,
          (
            SELECT prm2.resource_id
            FROM sys_plan_resource_map prm2
            INNER JOIN sys_training_resource tr2 ON tr2.id = prm2.resource_id
            WHERE prm2.plan_id = tp.id
              AND tr2.is_active = 1
              AND tr2.resource_type IN (${launchableTrainingResourceTypesSql})
            ORDER BY prm2.sort_order ASC, prm2.created_at ASC
            LIMIT 1
          ) AS launch_resource_id,
          (
            SELECT tr3.resource_type
            FROM sys_plan_resource_map prm3
            INNER JOIN sys_training_resource tr3 ON tr3.id = prm3.resource_id
            WHERE prm3.plan_id = tp.id
              AND tr3.is_active = 1
              AND tr3.resource_type IN (${launchableTrainingResourceTypesSql})
            ORDER BY prm3.sort_order ASC, prm3.created_at ASC
            LIMIT 1
          ) AS launch_resource_type,
          (
            SELECT tr4.name
            FROM sys_plan_resource_map prm4
            INNER JOIN sys_training_resource tr4 ON tr4.id = prm4.resource_id
            WHERE prm4.plan_id = tp.id
              AND tr4.is_active = 1
              AND tr4.resource_type IN (${launchableTrainingResourceTypesSql})
            ORDER BY prm4.sort_order ASC, prm4.created_at ASC
            LIMIT 1
          ) AS launch_resource_name,
          (
            SELECT tr5.module_code
            FROM sys_plan_resource_map prm5
            INNER JOIN sys_training_resource tr5 ON tr5.id = prm5.resource_id
            WHERE prm5.plan_id = tp.id
              AND tr5.is_active = 1
              AND tr5.resource_type IN (${launchableTrainingResourceTypesSql})
            ORDER BY prm5.sort_order ASC, prm5.created_at ASC
            LIMIT 1
          ) AS launch_resource_module_code
        FROM sys_training_plan tp
        INNER JOIN student s ON s.id = tp.student_id
        LEFT JOIN sys_plan_resource_map prm ON prm.plan_id = tp.id
        WHERE tp.is_active = 1
          AND tp.status = 'active'
          AND date(tp.start_date) <= date(?)
          AND date(tp.end_date) >= date(?)${scope.sql}
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
      [today, today, ...scope.params],
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
      launchResourceId: row.launch_resource_id === null || row.launch_resource_id === undefined
        ? null
        : Number(row.launch_resource_id),
      launchResourceType: row.launch_resource_type || null,
      launchResourceName: row.launch_resource_name || null,
      launchResourceModuleCode: row.launch_resource_module_code || null,
    }))
  }

  /**
   * 本周异常预警（首页看板面板）。
   *
   * 数据源：统一训练主表 `training_session`（统一训练记录计划 Phase B 双写产物）。
   * 旧实现直扫 `training_records` + `emotional_training_session` 两张旧表，有两个缺陷：
   *   ① 只写统一主表的入口（如 cognitive_game_inline）完全不进扫描（实测 20 条）；
   *   ② 器材 / 情绪游戏的「得分率」被当「答对率」套阀值（实测 55 条器材行会被误标）。
   * SQL 只负责取窗口内的原始行（含教师隔离），是否异常由纯函数 evaluateTrainingAnomaly
   * 判定——规则单一真源见 `training-anomaly-rules`。
   */
  async getWeeklyAnomalies(): Promise<DashboardAnomalyItem[]> {
    const since = formatDateTime(new Date(Date.now() - ANOMALY_WINDOW_DAYS * 24 * 60 * 60 * 1000))
    const scope = getCurrentTeacherStudentScope('s')
    const rows = await this.queryAsync(
      `
        SELECT
          ts.id AS id,
          ts.source_table,
          ts.session_family,
          ts.module_code,
          ts.student_id,
          s.name AS student_name,
          s.avatar_path,
          ts.task_name_snapshot,
          ts.entry_code,
          ts.accuracy_rate,
          ts.completion_status,
          ts.created_at,
          ets.hint_count AS hint_count,
          ets.question_count AS question_count,
          CASE
            WHEN json_valid(ts.summary_payload) THEN json_extract(ts.summary_payload, '$.promptLevel')
          END AS prompt_level
        FROM training_session ts
        INNER JOIN student s ON s.id = ts.student_id
        LEFT JOIN emotional_training_session ets
          ON ts.source_table = 'training_records'
         AND ets.training_record_id = ts.source_record_id
        WHERE datetime(ts.created_at) >= datetime(?)${scope.sql}
        ORDER BY ts.created_at DESC
      `,
      [since, ...scope.params],
    )

    const items: Array<{ item: DashboardAnomalyItem; severity: number }> = []
    for (const row of rows) {
      const verdict = evaluateTrainingAnomaly({
        sessionFamily: row.session_family || null,
        accuracyRate: toNullableNumber(row.accuracy_rate),
        completionStatus: row.completion_status || null,
        hintCount: toNullableNumber(row.hint_count),
        questionCount: toNullableNumber(row.question_count),
        promptLevel: toNullableNumber(row.prompt_level),
      })
      if (!verdict) continue

      const moduleCode = row.module_code || 'sensory'
      const sessionLabel = row.task_name_snapshot || row.entry_code || '训练任务'
      items.push({
        severity: anomalySeverityRank(verdict.kinds),
        item: {
        id: `session-${row.id}`,
        source: row.source_table || 'training_session',
        studentId: normalizeNumber(row.student_id),
        studentName: row.student_name || `学生 #${row.student_id}`,
        avatarPath: row.avatar_path || null,
        moduleCode,
        moduleLabel: this.getModuleLabel(moduleCode),
        sessionLabel: this.getSessionLabel(moduleCode, sessionLabel),
        accuracyRate: verdict.accuracyRate,
        hintRatio: verdict.hintRatio,
        promptLevel: verdict.promptLevel,
        createdAt: row.created_at || '',
        reason: verdict.reason,
        },
      })
    }

    // 严重度优先（中断 > 低正确率 > 提示依赖 > 器材高辅助），同级按时间倒序：
    // 器材高辅助在该群体里是常态，不能让它把真正紧急的条目挤出面板前 4 条。
    return items
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity - b.severity
        return (b.item.createdAt || '').localeCompare(a.item.createdAt || '')
      })
      .map((entry) => entry.item)
  }

  /**
   * 评估缺口与优先建议（「智能特教助理」面板的数据源）。
   *
   * 数据链：18 张量表主表各取「每生最新一行」→ 交 SCORE_ADAPTERS 归一化
   * （与 AI 纵向趋势同一口径）取等级 → 由纯函数 analyzeAssessmentGaps 产出结论。
   *
   * 表清单来自 QUALITY_TABLES（单一真源）：新增量表自动进入覆盖度统计；是否具备
   * 强弱语义取决于是否注册了适配器（crt / cognitive_self 为占位常模，只计覆盖）。
   * 历史事故：本方法的前身硬编码过 8 张表，导致只在新增量表建过基线的学生被误判
   * 「尚无评估记录」——覆盖度由 scripts/tests/dashboard-assessment-coverage.test.mjs 守卫。
   */
  async getAssessmentInsights(): Promise<StudentAssessmentInsight[]> {
    const scope = getCurrentTeacherStudentScope('s')

    const studentRows = await this.queryAsync(
      `SELECT s.id, s.name, s.avatar_path, s.disorder, s.created_at
         FROM student s
        WHERE 1 = 1${scope.sql}
        ORDER BY s.id ASC`,
      [...scope.params],
    )

    const snapshotsByStudent = new Map<number, ScaleLatestSnapshot[]>()
    for (const { table, code } of QUALITY_TABLES) {
      // 适配器键口径：catalog 用连字符（conners-psq），适配器与领域映射用下划线（conners_psq）
      const scaleCode = code.replace(/-/g, '_')
      const adapter = SCORE_ADAPTERS[scaleCode]
      const rows = await this.queryAsync(
        `SELECT t.*
           FROM ${table} t
           JOIN (
             SELECT student_id, MAX(created_at) AS latest_at
               FROM ${table}
              GROUP BY student_id
           ) latest
             ON latest.student_id = t.student_id
            AND latest.latest_at = t.created_at
          WHERE EXISTS (SELECT 1 FROM student s WHERE s.id = t.student_id${scope.sql})`,
        [...scope.params],
      )

      const seen = new Set<number>()
      for (const row of rows) {
        const studentId = normalizeNumber(row.student_id)
        // 同一 created_at 并列时可能返回多行：取首行即可（日期相同，结论等价）
        if (!studentId || seen.has(studentId)) continue
        seen.add(studentId)

        const snapshot = adapter ? adapter.normalizeRow(row) : null
        const item: ScaleLatestSnapshot = {
          scaleCode,
          scaleName: adapter?.scaleName,
          date: String(snapshot?.date ?? row.created_at ?? ''),
          level: String(snapshot?.level ?? ''),
        }
        const list = snapshotsByStudent.get(studentId)
        if (list) list.push(item)
        else snapshotsByStudent.set(studentId, [item])
      }
    }

    return analyzeAssessmentGaps(
      studentRows.map((row) => {
        const studentId = normalizeNumber(row.id)
        return {
          studentId,
          studentName: row.name || `学生 #${studentId}`,
          avatarPath: row.avatar_path || null,
          disorder: row.disorder || null,
          createdAt: row.created_at || null,
          snapshots: snapshotsByStudent.get(studentId) ?? [],
        }
      }),
    )
  }

  private getModuleLabel(moduleCode: string): string {
    return getTrainingPlanModuleLabel(moduleCode) || '训练模块'
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
