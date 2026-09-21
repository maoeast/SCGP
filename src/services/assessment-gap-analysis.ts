/**
 * 首页看板「评估缺口与优先建议」分析（纯函数，零 DB 依赖）。
 *
 * 背景：看板上的「智能特教助理」面板原先只有一条「超过 6 个月未评估」阈值规则，
 * 副标题却承诺「根据真实评估缺口提供优先干预建议」。本模块把该承诺做实：
 * 用**真实评估记录**回答两件事——「这个孩子哪里偏弱」「这个孩子还缺哪些评估」。
 *
 * 四条信号（全部来自已持久化的评估记录，不做任何推断性诊断）：
 *   1. 结果偏弱：按 5 大发展领域聚合各量表最近一次的等级文本（复用跨量表画像口径），
 *      并再分两级——「明显偏弱」（重度/异常/明显落后，建议优先干预）与「偏弱」（轻度/中度/边缘，建议交叉验证）
 *   2. 评估缺口：该学生从未测过的发展领域（缺失达阈值才单独构成待办）
 *   3. 从未评估：全量表库无任何记录
 *   4. 超期未复评：最近一次评估早于阈值（默认 6 个月，与看板既有口径一致）
 *
 * 口径单一真源：
 *   - 领域与量表映射 / 中文名 / 强弱判定 → `assessment-profile`（跨量表画像同源）
 *   - 分数与等级归一化 → `SCORE_ADAPTERS[code].normalizeRow`（纵向趋势同源）
 *
 * 明确不做：不给医学结论、不给器材推荐（severity 未落库，推荐引擎无法从历史数据复现）。
 *
 * @module services/assessment-gap-analysis
 */

import {
  DOMAIN_LABELS,
  SCALE_DOMAIN_MAP,
  aggregateStrengthFromLevels,
  strengthFromLevel,
  type DevelopmentDomain,
} from './assessment-profile'

/** 发展领域固定顺序（与画像/雷达图轴顺序一致）。 */
const DOMAIN_ORDER: readonly DevelopmentDomain[] = [
  'sensory',
  'emotional',
  'social',
  'cognitive',
  'life_skills',
]

/**
 * 只参与「覆盖度」、不参与「强弱判定」的量表。
 *
 * - crt / cognitive_self：实验性占位常模（与 assessment-score-adapters 的
 *   UNSUPPORTED_SCALE_CODES 同一决策），等级语义不足以支撑强弱结论。
 * - cpep_3：等级字段是「总发展当量 N 月」（发展当量月龄），不是强弱等级。
 */
export const COVERAGE_ONLY_SCALE_CODES: readonly string[] = ['crt', 'cognitive_self', 'cpep_3']

/** 默认超期阈值（月）：与看板既有「超过 6 个月未评估」口径一致。 */
export const DEFAULT_OVERDUE_MONTHS = 6

/** 展示用标签最多列几个领域（超出用汇总标签收口）。 */
const MAX_DOMAIN_TAGS = 2

/**
 * 入列阈值：缺失领域数达到该值才单独构成「基线不完整」理由。
 *
 * 为什么需要阈值：5 大发展领域中任意一个未测都算缺口，若把缺口单独作为入列理由，
 * 实测（真实库 43 名学生）会导致 23 人全部上榜——面板退化成全员名册，失去待办意义。
 * 取 3 表示「覆盖不足半数领域」才算基线明显不完整；未达阈值的缺口仍会作为
 * 标签/建议句的一部分出现在该学生的条目上（若他因其他信号入列）。
 */
export const MIN_MISSING_DOMAINS_FOR_BASELINE_INSIGHT = 3

/** 单量表的最近一次快照（由 DB 层查好，本模块不查库）。 */
export interface ScaleLatestSnapshot {
  /** 量表代码（与 SCORE_ADAPTERS / SCALE_DOMAIN_MAP 同口径，如 conners_psq / cpep_3）。 */
  scaleCode: string
  /** 量表中文名（建议文案里引用；无适配器的量表可省略，仅计覆盖时不展示）。 */
  scaleName?: string
  /** 评估时间（ISO 或 'YYYY-MM-DD HH:mm:ss'）。 */
  date: string
  /** 等级文本（各量表的等级；空表示无等级数据）。 */
  level: string
}

/** 单个学生的评估档案输入（学生基础信息 + 各量表最近一次快照）。 */
export interface StudentAssessmentInput {
  studentId: number
  studentName: string
  avatarPath?: string | null
  disorder?: string | null
  /** 建档时间（同优先级下的排序兜底：新建档在前）。 */
  createdAt?: string | null
  snapshots: readonly ScaleLatestSnapshot[]
}

export type AssessmentInsightTagKind = 'weak' | 'watch' | 'gap' | 'never' | 'overdue'

/** 面板依据标签（前端直接渲染，不必二次加工）。 */
export interface AssessmentInsightTag {
  kind: AssessmentInsightTagKind
  label: string
}

/** 单个学生的评估缺口结论。 */
export interface StudentAssessmentInsight {
  studentId: number
  studentName: string
  avatarPath: string | null
  disorder: string | null
  /** 最近一次任何量表的评估时间（null = 从未评估）。 */
  lastAssessmentAt: string | null
  /** 距今天数（null = 从未评估）。 */
  daysSinceLastAssessment: number | null
  /** 依据标签（偏弱领域 / 缺口领域 / 从未评估 / 超期）。 */
  tags: AssessmentInsightTag[]
  /** 由真实数据拼装的建议句（面向教师下一步动作）。 */
  suggestion: string
  /** 优先级分（越大越靠前；规则见 buildPriority）。 */
  priority: number
  /** 是否构成待办（未构成待办的学生不出现在返回清单里）。 */
  actionable: boolean
}

/**
 * 是否属于「优先处理」档：明显偏弱（danger）或尚无任何评估记录。
 *
 * 用途：面板角标与 hero 文案的「优先 N · 共 M」拆分。
 * 为何要拆：特教学生基数大，待办总数常常接近学生总数（真实库实测 43/43），
 * 总数单独展示信息量低；「明显偏弱/无基线」才是真正需要插队的少数。
 */
export function isPriorityInsight(insight: StudentAssessmentInsight): boolean {
  return insight.tags.some((tag) => tag.kind === 'weak' || tag.kind === 'never')
}

export interface AnalyzeAssessmentGapsOptions {
  /** 超期阈值（月）。 */
  overdueMonths?: number
  /** 当前时间（可注入，便于测试）。 */
  now?: Date
}

interface WeakDomainHit {
  domain: DevelopmentDomain
  label: string
  /** danger=明显偏弱（优先干预）；warning=偏弱（先交叉验证） */
  severity: DomainSeverity
  primaryScaleName: string
  primaryLevel: string
  primaryDate: string
}

/** 领域严重度（在弱/正常之上再加一层区分）。 */
export type DomainSeverity = 'danger' | 'warning'

/**
 * 「明显偏弱」等级关键词（与 recommendation-engine 的 DANGER_LEVEL_TOKENS 同一取向）。
 *
 * 不直接复用那份常量：引擎判定的是 levelCode（英文枚举），本模块判定的是各量表
 * 的中文/英文等级文本（如「极重度」「severe」「异常」），取值域不同。
 */
const DANGER_LEVEL_TOKENS = [
  '极重度', '重度', '严重', '明显落后', '异常', '临床', '迟缓',
  'severe', 'extreme', 'abnormal', 'clinical', 'delayed', 'verylow',
]

/** 等级文本是否命中关键词（大小写不敏感）。 */
function matchesTokens(level: string, tokens: readonly string[]): boolean {
  const text = (level || '').toLowerCase()
  return tokens.some((token) => text.includes(token.toLowerCase()))
}

/**
 * 领域严重度判定 + 触发溯源（单一口径来自 aggregateStrengthFromLevels）。
 *
 * 为何要分级：特教群体里「轻度/中度/边缘」是常态，若把全部非正常都当作「优先干预」，
 * 面板会把整所学校标成待办（真实库实测 43/43）；真正需要插队的只有明显偏弱。
 *
 * 为何要返回触发快照：判定是「同域取最差」，而溯源展示必须是**触发判定的那条等级**。
 * 若展示该域日期最新的量表，会出现「明显偏弱（某量表 · 等级「正常」）」这类自相矛盾的引用
 * （同域多量表时很常见，如情绪调节有 Conners PSQ/TRS/CBCL 三张）。
 */
function resolveDomainSeverity(
  snapshots: readonly ScaleLatestSnapshot[],
): { severity: DomainSeverity; primary: ScaleLatestSnapshot } | null {
  const byRecent = [...snapshots].sort(
    (a, b) => (parseTime(b.date) ?? 0) - (parseTime(a.date) ?? 0),
  )
  const danger = byRecent.find((item) => matchesTokens(item.level, DANGER_LEVEL_TOKENS))

  // 危险词本身就是「明显偏弱」的直接证据（doc §3.1）：不能因为聚合判为 normal 就把这条信号丢掉
  // ——个别危险词（如 extreme / verylow）不在 strengthFromLevel 的负向词表里，靠聚合门会漏报。
  if (danger) return { severity: 'danger', primary: danger }

  const strength = aggregateStrengthFromLevels(snapshots.map((item) => item.level))
  if (strength !== 'weak' && strength !== 'mixed') return null
  const weak = byRecent.find((item) => strengthFromLevel(item.level) === 'weak')
  return { severity: 'warning', primary: weak ?? byRecent[0]! }
}

/** 时间戳解析：失败返回 null（脏数据不参与比较，但不崩）。 */
function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

/** 取该学生最近一次评估时间（按时间戳取最大；全脏数据时退回字典序最大）。 */
function latestAssessmentAt(snapshots: readonly ScaleLatestSnapshot[]): string | null {
  let best: string | null = null
  let bestTime = -Infinity
  for (const snapshot of snapshots) {
    if (!snapshot.date) continue
    const time = parseTime(snapshot.date)
    if (time === null) {
      if (best === null || snapshot.date > best) best = snapshot.date
      continue
    }
    if (time > bestTime) {
      bestTime = time
      best = snapshot.date
    }
  }
  return best
}

/** 距今整数天数（负值归 0；无日期返回 null）。 */
function daysSince(dateText: string | null, now: Date): number | null {
  const time = parseTime(dateText)
  if (time === null) return null
  return Math.max(0, Math.floor((now.getTime() - time) / (1000 * 60 * 60 * 24)))
}

/**
 * 超期阈值对应的截止时间（now 往前推 N 个月）。
 *
 * 逐月减时先归一到 1 号再减，最后 clamp 到目标月实际天数：避免 JS 日期溢出
 * （如 3 月 31 日减 6 个月 → 9 月 31 日非法 → 溢出为 10 月 1 日，截止点晚 1-2 天）。
 */
function overdueCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now.getTime())
  const day = cutoff.getDate()
  cutoff.setDate(1)
  cutoff.setMonth(cutoff.getMonth() - months)
  const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate()
  cutoff.setDate(Math.min(day, lastDay))
  return cutoff
}

/**
 * 按发展领域聚合强弱（只统计有强弱语义的量表）。
 * 同域取最差：一个量表偏弱即整体 weak/mixed。
 */
function collectWeakDomains(snapshots: readonly ScaleLatestSnapshot[]): WeakDomainHit[] {
  const byDomain = new Map<DevelopmentDomain, ScaleLatestSnapshot[]>()
  for (const snapshot of snapshots) {
    if (COVERAGE_ONLY_SCALE_CODES.includes(snapshot.scaleCode)) continue
    const domain = SCALE_DOMAIN_MAP[snapshot.scaleCode]
    if (!domain) continue
    const list = byDomain.get(domain)
    if (list) list.push(snapshot)
    else byDomain.set(domain, [snapshot])
  }

  const hits: WeakDomainHit[] = []
  for (const domain of DOMAIN_ORDER) {
    const list = byDomain.get(domain)
    if (!list || list.length === 0) continue
    const resolved = resolveDomainSeverity(list)
    if (!resolved) continue
    const { severity, primary } = resolved
    hits.push({
      domain,
      label: DOMAIN_LABELS[domain],
      severity,
      primaryScaleName: primary.scaleName || primary.scaleCode,
      primaryLevel: primary.level || '未评定',
      primaryDate: primary.date,
    })
  }
  return hits
}

/** 已覆盖的发展领域（任何量表测过即算覆盖）。 */
function collectCoveredDomains(snapshots: readonly ScaleLatestSnapshot[]): Set<DevelopmentDomain> {
  const covered = new Set<DevelopmentDomain>()
  for (const snapshot of snapshots) {
    const domain = SCALE_DOMAIN_MAP[snapshot.scaleCode]
    if (domain) covered.add(domain)
  }
  return covered
}

/**
 * 优先级分（越大越靠前）。
 *
 * 次序（用户口径）：结果偏弱 > 从未评估 > 有占比缺口 > 超期未复评。
 * 同一档内缺口越多越靠前；同分由排序键（最久未评估 → 新建档）决定。
 */
function buildPriority(input: {
  weakDomains: readonly WeakDomainHit[]
  neverAssessed: boolean
  untestedCount: number
  overdue: boolean
}): number {
  let priority = 0
  if (input.weakDomains.some((hit) => hit.severity === 'danger')) priority += 1000
  else if (input.weakDomains.length > 0) priority += 300
  if (input.neverAssessed) priority += 500
  priority += Math.min(input.untestedCount, 5) * 10
  if (input.overdue) priority += 5
  return priority
}

/**
 * 是否构成一条待办。
 *
 * 四个理由：① 有偏弱领域 ② 从未评估 ③ 超期未复评 ④ 基线明显不完整（缺领域达阈值）。
 * 缺口未达阈值时不单独入列（否则等于全员名册，见 MIN_MISSING_DOMAINS_FOR_BASELINE_INSIGHT）。
 */
function isActionable(input: {
  weakDomains: readonly WeakDomainHit[]
  neverAssessed: boolean
  overdue: boolean
  missingDomainCount: number
}): boolean {
  if (input.weakDomains.length > 0) return true
  if (input.neverAssessed) return true
  if (input.overdue) return true
  return input.missingDomainCount >= MIN_MISSING_DOMAINS_FOR_BASELINE_INSIGHT
}

/** 领域标签（超出上限时收口成汇总标签）。 */
function buildDomainTags(
  kind: AssessmentInsightTagKind,
  labels: readonly string[],
  suffix: string,
): AssessmentInsightTag[] {
  const shown = labels.slice(0, MAX_DOMAIN_TAGS).map((label) => ({ kind, label: `${label} ${suffix}` }))
  const rest = labels.length - shown.length
  if (rest > 0) {
    shown.push({ kind, label: `另有 ${rest} 个领域${suffix}` })
  }
  return shown
}

/** 由真实数据拼装建议句（最多两段：最强信号 + 一条缺口/超期提醒）。 */
function buildSuggestion(input: {
  weakDomains: readonly WeakDomainHit[]
  neverAssessed: boolean
  untestedLabels: readonly string[]
  overdue: boolean
  lastAt: string | null
  overdueMonths: number
}): string {
  const parts: string[] = []

  if (input.neverAssessed) {
    parts.push('尚无任何评估记录，建议尽快建立基线评估。')
  } else {
    const danger = input.weakDomains.find((hit) => hit.severity === 'danger')
    const watch = input.weakDomains.find((hit) => hit.severity === 'warning')
    const hit = danger ?? watch
    if (hit) {
      parts.push(
        `「${hit.label}」领域评估结果${danger ? '明显偏弱' : '偏弱'}（${hit.primaryScaleName} · ${hit.primaryDate.slice(0, 10)} · 等级「${hit.primaryLevel}」），建议${
          danger ? '优先安排干预' : '结合其他量表交叉验证后安排训练'
        }。`,
      )
    }
  }

  // 从未评估的学生已被第一句覆盖（所有领域都没记录），不再重复列缺口
  if (parts.length < 2 && !input.neverAssessed && input.untestedLabels.length > 0) {
    parts.push(`评估缺口：${input.untestedLabels.join('、')}领域尚无记录，建议补测。`)
  }

  if (parts.length < 2 && input.overdue && input.lastAt) {
    parts.push(`最近评估为 ${input.lastAt.slice(0, 10)}，已超过 ${input.overdueMonths} 个月，建议安排复评。`)
  }

  if (parts.length === 0) {
    parts.push('评估记录完整且无明显短板，建议按学期节奏保持复评。')
  }

  return parts.join('')
}

/**
 * 分析全校（或任教范围内）学生的评估缺口与优先建议。
 *
 * 纯函数：输入已查好的「每生每量表最新快照」，输出按优先级降序的清单。
 * 每个学生至多产出一条结论；未构成待办（无偏弱、非未评估、非超期、缺口未达阈值）的学生
 * 不出现在返回清单中——面板是待办清单，不是花名册。
 */
export function analyzeAssessmentGaps(
  students: readonly StudentAssessmentInput[],
  options: AnalyzeAssessmentGapsOptions = {},
): StudentAssessmentInsight[] {
  const now = options.now ?? new Date()
  const overdueMonths = options.overdueMonths ?? DEFAULT_OVERDUE_MONTHS
  const cutoff = overdueCutoff(now, overdueMonths).getTime()

  const decorated = students.map((student) => {
    const snapshots = student.snapshots ?? []
    const weakDomains = collectWeakDomains(snapshots)
    const coveredDomains = collectCoveredDomains(snapshots)
    const untestedLabels = DOMAIN_ORDER.filter((domain) => !coveredDomains.has(domain)).map(
      (domain) => DOMAIN_LABELS[domain],
    )
    const lastAt = latestAssessmentAt(snapshots)
    const neverAssessed = snapshots.length === 0
    const lastTime = parseTime(lastAt)
    const overdue = !neverAssessed && lastTime !== null && lastTime < cutoff

    const tags: AssessmentInsightTag[] = [
      ...buildDomainTags(
        'weak',
        weakDomains.filter((hit) => hit.severity === 'danger').map((hit) => hit.label),
        '明显偏弱',
      ),
      ...buildDomainTags(
        'watch',
        weakDomains.filter((hit) => hit.severity === 'warning').map((hit) => hit.label),
        '偏弱',
      ),
    ]
    if (neverAssessed) {
      tags.push({ kind: 'never', label: '尚无评估记录' })
    } else {
      tags.push(...buildDomainTags('gap', untestedLabels, '未评估'))
      if (overdue) {
        tags.push({ kind: 'overdue', label: `超 ${overdueMonths} 个月未复评` })
      }
    }

    const insight: StudentAssessmentInsight = {
      studentId: student.studentId,
      studentName: student.studentName,
      avatarPath: student.avatarPath ?? null,
      disorder: student.disorder ?? null,
      lastAssessmentAt: lastAt,
      daysSinceLastAssessment: daysSince(lastAt, now),
      tags,
      suggestion: buildSuggestion({
        weakDomains,
        neverAssessed,
        untestedLabels,
        overdue,
        lastAt,
        overdueMonths,
      }),
      priority: buildPriority({
        weakDomains,
        neverAssessed,
        untestedCount: neverAssessed ? 0 : untestedLabels.length,
        overdue,
      }),
      actionable: isActionable({
        weakDomains,
        neverAssessed,
        overdue,
        missingDomainCount: untestedLabels.length,
      }),
    }

    return { insight, createdAt: student.createdAt ?? null }
  })

  return decorated
    .filter((item) => item.insight.actionable)
    .sort((a, b) => {
      if (b.insight.priority !== a.insight.priority) return b.insight.priority - a.insight.priority
      const aTime = parseTime(a.insight.lastAssessmentAt) ?? 0
      const bTime = parseTime(b.insight.lastAssessmentAt) ?? 0
      if (aTime !== bTime) return aTime - bTime // 最久未评估（含从未评估）优先
      const aCreated = parseTime(a.createdAt) ?? 0
      const bCreated = parseTime(b.createdAt) ?? 0
      if (aCreated !== bCreated) return bCreated - aCreated // 新建档在前
      return a.insight.studentId - b.insight.studentId // 稳定兜底
    })
    .map((item) => item.insight)
}
