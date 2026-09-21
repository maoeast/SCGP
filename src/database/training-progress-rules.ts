/**
 * 首页看板「训练进度概览」：数据来源与聚合口径（纯函数单一真源）
 *
 * 口径要点（详见 docs/planning/2026-09-21-首页训练进度概览-判定口径.md）：
 *   ① 数据源必须是统一训练主表 `training_session`——旧实现直扫 legacy 表
 *      `training_records`，漏掉只写统一主表的入口（认知内联游戏）以及器材 / 情绪小游戏
 *      （它们写自己的旧表），实测只覆盖约 77% 的会话。
 *   ② 时间字段取 `started_at`（会话发生时间），窗口 = 最近 N 个**本地自然日**（含今天），
 *      按本地日分桶在 JS 侧完成——不依赖 SQLite 的 'localtime'（wasm 构建的时区行为
 *      不可靠，且不可单测）。
 *   ③ 时长一律用 `training_session.duration_ms`；legacy `training_records.duration` 单位
 *      混杂（同列既有秒又有毫秒，实测 min 480 / max 598000），不得作为时长来源。
 *   ④ 完成率 = completion_status = 'completed' 的会话占比；无会话时为 null（不猜 0）。
 *
 * 本模块零依赖（不引 '@/' 别名模块，便于 jiti 单测直跑）：只负责数值聚合与枚举口径，
 * 模块展示名由 API 层按 training-plan-module 单一真源填充。
 */

/** 卡片可切换的时间窗（固定枚举，禁止在视图层内联字面量） */
export const TRAINING_PROGRESS_WINDOW_OPTIONS = [7, 30] as const
export type TrainingProgressWindowDays = typeof TRAINING_PROGRESS_WINDOW_OPTIONS[number]

export const DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS: TrainingProgressWindowDays = 7

/** `training_session.completion_status` 的枚举单一真源（与建表 CHECK 约束一致） */
export const TRAINING_COMPLETION_STATUSES = [
  'completed',
  'cancelled',
  'interrupted',
  'aborted',
] as const
export type TrainingCompletionStatus = typeof TRAINING_COMPLETION_STATUSES[number]

/** 完成态：完成率的分子口径 */
export const COMPLETED_TRAINING_STATUS: TrainingCompletionStatus = 'completed'

/** 会话级原始行（由 dashboard-api 的 SQL 取出，时间戳保持原始文本） */
export interface TrainingProgressSessionRow {
  startedAt: unknown
  durationMs: unknown
  studentId: unknown
  moduleCode: unknown
  completionStatus: unknown
}

/** 上一窗口的行：范围已由 SQL 限定，聚合只需要这三项 */
export interface TrainingProgressPreviousRow {
  durationMs: unknown
  studentId: unknown
  completionStatus: unknown
}

export interface TrainingProgressDayPoint {
  /** 本地日 YYYY-MM-DD */
  date: string
  count: number
  durationMs: number
  studentCount: number
  completedCount: number
}

export interface TrainingProgressModuleSlice {
  moduleCode: string
  count: number
  durationMs: number
  studentCount: number
  /** 次数占比 0–1（用于分布条宽度；会话数为 0 时为 0） */
  share: number
}

export interface TrainingProgressMetrics {
  sessionCount: number
  durationMs: number
  studentCount: number
  completedCount: number
  /** 0–1；无会话时 null */
  completionRate: number | null
}

export interface TrainingProgressSummary extends TrainingProgressMetrics {
  /** 窗口内有训练的自然日天数 */
  activeDayCount: number
  /** 今日会话数（窗口无关，日程面板进度条分子用） */
  todayCount: number
  /** 上一等长窗口的同口径指标；无任何上一期数据时为 null */
  previous: TrainingProgressMetrics | null
}

export interface TrainingProgress {
  windowDays: TrainingProgressWindowDays
  /** 恒为 windowDays 个点（含无训练的 0 值天），供图表直接消费 */
  points: TrainingProgressDayPoint[]
  /** 仅含有会话的模块，按次数倒序 */
  modules: TrainingProgressModuleSlice[]
  summary: TrainingProgressSummary
  /** 窗口内是否有任何会话（空态判定：false 显示「暂无训练数据」） */
  hasData: boolean
  /** 时间戳无法解析而被跳过的行数（数据质量观测，不静默吞） */
  skippedRowCount: number
}

export function isTrainingProgressWindowDays(value: unknown): value is TrainingProgressWindowDays {
  return (TRAINING_PROGRESS_WINDOW_OPTIONS as readonly number[]).includes(Number(value))
}

export function normalizeTrainingProgressWindowDays(value: unknown): TrainingProgressWindowDays {
  return isTrainingProgressWindowDays(value)
    ? (Number(value) as TrainingProgressWindowDays)
    : DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS
}

function pad2(value: number): string {
  return `${value}`.padStart(2, '0')
}

/** 本地日 key（YYYY-MM-DD） */
export function formatLocalDayKey(instant: number): string {
  const date = new Date(instant)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** SQL 比较用的 UTC 文本（`YYYY-MM-DD HH:MM:SS`）——与 SQLite datetime() 的 UTC 语义一致 */
export function toSqlUtcDateTime(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace('T', ' ')}`
}

/** 本地自然日起点（00:00:00.000） */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const NAIVE_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/

/**
 * 解析训练时间戳 → epoch ms；无法解析返回 null（调用方计入 skippedRowCount）。
 *
 * 兼容两类写入：
 *   · 应用写入：ISO 8601 带时区（`new Date().toISOString()`，含末尾 Z）；
 *   · 演示种子：`YYYY-MM-DD HH:MM:SS` 裸文本——按**本地时刻**理解（种子语义即「当天 10:00
 *     这类本地课程时间」，且 SQLite 会把裸文本当 UTC，两者不一致时以日期可读为准）。
 */
export function parseTrainingInstant(value: unknown): number | null {
  if (value instanceof Date) {
    const instant = value.getTime()
    return Number.isFinite(instant) ? instant : null
  }

  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null

  const naive = NAIVE_LOCAL_PATTERN.exec(text)
  if (naive && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const [, year, month, day, hours, minutes, seconds] = naive
    const instant = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds ?? 0),
    ).getTime()
    return Number.isFinite(instant) ? instant : null
  }

  const parsed = Date.parse(text)
  return Number.isFinite(parsed) ? parsed : null
}

/** 会话完成态：非法/缺失值返回 null（由调用方决定回退口径） */
export function normalizeTrainingCompletionStatus(
  value: unknown,
): TrainingCompletionStatus | null {
  return toCompletionStatus(value)
}

/** 本地时刻 HH:mm（无法解析时间戳时为空串） */
export function formatLocalTimeLabel(value: unknown): string {
  const instant = parseTrainingInstant(value)
  if (instant === null) return ''
  const date = new Date(instant)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** 本地日 key（YYYY-MM-DD）→ 本地零点；格式非法时 null */
export function parseLocalDayKey(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isFinite(date.getTime()) ? date : null
}

export interface TrainingProgressWindowRange {
  /** 当前窗口的本地日起点（含） */
  start: Date
  /** 下一窗口的本地日起点（不含），即当前窗口的右开边界 */
  end: Date
  /** 上一等长窗口的起点（含） */
  previousStart: Date
  /** 上一等长窗口的终点（不含）= 当前窗口起点 */
  previousEnd: Date
  /** 窗口内本地日 key（升序，含今天） */
  dayKeys: string[]
}

/** 最近 windowDays 个本地自然日（含今天）+ 上一等长窗口的范围 */
export function resolveTrainingProgressWindow(
  windowDays: number,
  now: Date,
): TrainingProgressWindowRange {
  const days = normalizeTrainingProgressWindowDays(windowDays)
  const today = startOfLocalDay(now)
  const start = addLocalDays(today, -(days - 1))
  const end = addLocalDays(today, 1)

  const dayKeys: string[] = []
  for (let offset = 0; offset < days; offset += 1) {
    dayKeys.push(formatLocalDayKey(addLocalDays(start, offset).getTime()))
  }

  return {
    start,
    end,
    previousStart: addLocalDays(start, -days),
    previousEnd: start,
    dayKeys,
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNonNegative(value: unknown): number {
  return Math.max(0, toNumber(value))
}

function toCompletionStatus(value: unknown): TrainingCompletionStatus | null {
  const text = typeof value === 'string' ? value.trim() : ''
  return (TRAINING_COMPLETION_STATUSES as readonly string[]).includes(text)
    ? (text as TrainingCompletionStatus)
    : null
}

function completionRateOf(sessionCount: number, completedCount: number): number | null {
  if (sessionCount <= 0) return null
  return completedCount / sessionCount
}

interface DayAccumulator {
  count: number
  durationMs: number
  students: Set<number>
  completedCount: number
}

interface ModuleAccumulator {
  count: number
  durationMs: number
  students: Set<number>
}

function summarizeRows(
  rows: readonly TrainingProgressPreviousRow[],
): TrainingProgressMetrics & { sessionCount: number } {
  const students = new Set<number>()
  let sessionCount = 0
  let durationMs = 0
  let completedCount = 0

  for (const row of rows) {
    sessionCount += 1
    durationMs += toNonNegative(row.durationMs)
    const studentId = toNumber(row.studentId)
    if (studentId) students.add(studentId)
    if (toCompletionStatus(row.completionStatus) === COMPLETED_TRAINING_STATUS) {
      completedCount += 1
    }
  }

  return {
    sessionCount,
    durationMs,
    studentCount: students.size,
    completedCount,
    completionRate: completionRateOf(sessionCount, completedCount),
  }
}

/**
 * 窗口内行 → 卡片数据（日趋势 / 模块分布 / 汇总 / 环比）。
 *
 * @param input.windowRows   当前窗口内的会话行（SQL 已按窗口起点过滤，含教师隔离）
 * @param input.previousRows 上一等长窗口的行（SQL 已限定范围）
 * @param input.now          参考时刻（本地时区语义由运行环境决定）
 */
export function buildTrainingProgress(input: {
  windowRows: readonly TrainingProgressSessionRow[]
  previousRows?: readonly TrainingProgressPreviousRow[]
  windowDays: number
  now: Date
}): TrainingProgress {
  const windowDays = normalizeTrainingProgressWindowDays(input.windowDays)
  const range = resolveTrainingProgressWindow(windowDays, input.now)
  const todayKey = formatLocalDayKey(input.now.getTime())

  const dayMap = new Map<string, DayAccumulator>()
  for (const key of range.dayKeys) {
    dayMap.set(key, { count: 0, durationMs: 0, students: new Set(), completedCount: 0 })
  }

  const moduleMap = new Map<string, ModuleAccumulator>()
  const windowStudents = new Set<number>()
  let skippedRowCount = 0
  let sessionCount = 0
  let durationMs = 0
  let completedCount = 0

  for (const row of input.windowRows) {
    const instant = parseTrainingInstant(row.startedAt)
    if (instant === null) {
      skippedRowCount += 1
      continue
    }

    // 本地日兜底：SQL 按瞬时过滤，跨时区/未来时间的脏行在这里被挡掉
    const dayKey = formatLocalDayKey(instant)
    const day = dayMap.get(dayKey)
    if (!day) continue

    const rowDurationMs = toNonNegative(row.durationMs)
    const studentId = toNumber(row.studentId)
    const isCompleted = toCompletionStatus(row.completionStatus) === COMPLETED_TRAINING_STATUS

    sessionCount += 1
    durationMs += rowDurationMs
    if (isCompleted) completedCount += 1
    if (studentId) windowStudents.add(studentId)

    day.count += 1
    day.durationMs += rowDurationMs
    if (studentId) day.students.add(studentId)
    if (isCompleted) day.completedCount += 1

    const moduleCode = typeof row.moduleCode === 'string' && row.moduleCode.trim()
      ? row.moduleCode.trim()
      : 'unknown'
    const moduleEntry = moduleMap.get(moduleCode)
      ?? { count: 0, durationMs: 0, students: new Set<number>() }
    moduleEntry.count += 1
    moduleEntry.durationMs += rowDurationMs
    if (studentId) moduleEntry.students.add(studentId)
    moduleMap.set(moduleCode, moduleEntry)
  }

  const points: TrainingProgressDayPoint[] = range.dayKeys.map((date) => {
    const day = dayMap.get(date) as DayAccumulator
    return {
      date,
      count: day.count,
      durationMs: day.durationMs,
      studentCount: day.students.size,
      completedCount: day.completedCount,
    }
  })

  const modules: TrainingProgressModuleSlice[] = [...moduleMap.entries()]
    .map(([moduleCode, entry]) => ({
      moduleCode,
      count: entry.count,
      durationMs: entry.durationMs,
      studentCount: entry.students.size,
      share: sessionCount > 0 ? entry.count / sessionCount : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.durationMs - a.durationMs
    })

  const previousRows = input.previousRows ?? []
  const previous = previousRows.length > 0 ? summarizeRows(previousRows) : null

  return {
    windowDays,
    points,
    modules,
    summary: {
      sessionCount,
      durationMs,
      studentCount: windowStudents.size,
      completedCount,
      completionRate: completionRateOf(sessionCount, completedCount),
      activeDayCount: points.filter((point) => point.count > 0).length,
      todayCount: points.find((point) => point.date === todayKey)?.count ?? 0,
      previous,
    },
    hasData: sessionCount > 0,
    skippedRowCount,
  }
}
