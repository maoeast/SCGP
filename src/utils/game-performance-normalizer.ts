/**
 * 游戏训练 performanceData 归一化适配器
 *
 * 职责：把各游戏组件emit的、命名/量纲各异的 performanceData，
 * 统一归一化为 { accuracy(0-1), avgResponseTimeMs, durationSec, hasRealData }。
 *
 * 为什么需要它：21 个非感官经典游戏没有一个直接用 accuracy / avgResponseTime / durationMs
 * 这套标准字段名（见 docs/plans/2026-07-07-game-iep-extension-plan.md §4.2/4.3）。
 * 落库链路(runModuleIepChain)、生成器(IEPGenerator)、渲染(IEPReport.vue) 三处
 * 全部只调本函数，杜绝各自重复提取与量纲误判。
 *
 * 扩展指南（Phase 2/3）：直接在 GAME_EXTRACTION_RULES 里加一行 gameCode → 提取规则即可，
 * 无需改动 normalizeGameMetrics 主体逻辑。
 */

/**
 * 归一化后的游戏指标
 */
export interface NormalizedGameMetrics {
  /** 正确率，统一归一到 0-1；null 表示该游戏本局未采集到正确率口径 */
  accuracy: number | null
  /** 平均反应时（毫秒）；null 表示未采集到 */
  avgResponseTimeMs: number | null
  /** 训练时长（秒），缺失时用 sessionDurationMs/1000 兜底，恒为 >= 0 的有限数 */
  durationSec: number
  /** gameCode 专属指标的透传对象（原 performanceData 引用，供生成器取额外字段） */
  extra: Record<string, any>
  /**
   * 是否为真实采集数据。false 表示是 buildDefaultPerformanceData 产出的 {event} 空壳，
   * 下游应降级（不出统计卡 / 报告里提示“未采集到量化指标”）。
   */
  hasRealData: boolean
}

// ========== 提取规则类型 ==========

type AccuracyScale = 'ratio' | 'percent'

/**
 * 时长提取规则（判别联合，覆盖三种来源）：
 * - session: 无专属时长字段，直接用 sessionDurationMs/1000（如 F03）
 * - seconds: 字段值本身就是秒（如 L03 的 duration_seconds、L05 的 total_duration_seconds）
 * - msHeuristic: 社交遗留的“字段名/数值>10000 判 ms”启发式（社交 performanceData 既有 ms 也有秒）
 */
type DurationRule =
  | { kind: 'session' }
  | { kind: 'seconds'; fields: string[] }
  | { kind: 'msHeuristic'; fields: string[] }

/**
 * 单个 gameCode 的提取规则
 */
interface GameExtractionRule {
  /** 判定字段：其中任一存在且为有效数值，即视为真实数据（非空壳） */
  realityFields: string[]
  /** accuracy 源字段（按顺序尝试）；不声明则该游戏无正确率口径 */
  accuracyFields?: string[]
  /** accuracy 量纲：ratio=0-1 直接用，percent=0-100 需 ÷100 */
  accuracyScale?: AccuracyScale
  /** 平均反应时源字段（按顺序尝试，单位 ms）；不声明则无反应时口径 */
  reactionFields?: string[]
  /** 时长提取规则；不声明则等价于 { kind: 'session' } */
  duration?: DurationRule
}

// ========== gameCode → 提取规则表 ==========
//
// Phase 1 只填 Tier 1 三游戏（F03/L03/L05）；social 六个 code 共享同一条遗留规则，
// 行为与原 runSocialIepChain 的手写提取保持一致（不破坏社交闭环）。
// Phase 2/3 直接在此加行即可。

const SOCIAL_GAME_CODES = [
  'S01_BURGER',
  'S02_EMOTION_MIRROR',
  'S03_STORY_SEQ',
  'S04_GIFT_MATCH',
  'S05_ECHO_PARROT',
  'S06_EXPRESSION_DUEL',
]

/** 社交遗留规则：沿用 runSocialIepChain / resolveDurationSeconds 的既有口径 */
const SOCIAL_RULE: GameExtractionRule = {
  realityFields: ['accuracy', 'accuracyRate'],
  accuracyFields: ['accuracy', 'accuracyRate'],
  accuracyScale: 'ratio',
  reactionFields: ['avgResponseTime', 'avgResponseTimeMs', 'reactionTime'],
  duration: { kind: 'msHeuristic', fields: ['durationMs', 'durationSec', 'duration'] },
}

const GAME_EXTRACTION_RULES: Record<string, GameExtractionRule> = {
  // ===== Tier 1：精细动作 =====
  F03_RECYCLING: {
    // 分拣小能手：accuracy_ratio(0-1) + average_sort_ms；无专属时长→会话兜底
    realityFields: ['accuracy_ratio'],
    accuracyFields: ['accuracy_ratio'],
    accuracyScale: 'ratio',
    reactionFields: ['average_sort_ms'],
    duration: { kind: 'session' },
  },

  // ===== Tier 1：生活自理 =====
  L03_BRUSH_TEETH: {
    // 刷牙小卫士：directional_accuracy_score(0-1) + average_swipe_ms + duration_seconds(秒)
    // 注意字段名是 duration_seconds，不是 total_duration_seconds
    realityFields: ['directional_accuracy_score'],
    accuracyFields: ['directional_accuracy_score'],
    accuracyScale: 'ratio',
    reactionFields: ['average_swipe_ms'],
    duration: { kind: 'seconds', fields: ['duration_seconds'] },
  },
  L05_PACK_BAG: {
    // 上学包包装一装：context_understanding_score(0-100，需÷100) + average_selection_ms + total_duration_seconds(秒)
    realityFields: ['context_understanding_score'],
    accuracyFields: ['context_understanding_score'],
    accuracyScale: 'percent',
    reactionFields: ['average_selection_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
}

// social 六个 code 共享同一条规则
for (const code of SOCIAL_GAME_CODES) {
  GAME_EXTRACTION_RULES[code] = SOCIAL_RULE
}

// ========== 工具函数 ==========

function numOr(value: unknown, fallback: number): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return fallback
  }
  if (num < min) return min
  if (num > max) return max
  return num
}

/** 字段值是否为有效数值（接受 number 或数字字符串） */
function isValidNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value))
  }
  return false
}

/** 按字段顺序取第一个存在且为有效数值的字段值 */
function pickFirstValid(data: Record<string, any>, fields: string[] | undefined): { field: string; value: number } | null {
  if (!fields || fields.length === 0) {
    return null
  }
  for (const field of fields) {
    const raw = data[field]
    if (isValidNumber(raw)) {
      return { field, value: Number(raw) }
    }
  }
  return null
}

function resolveAccuracy(rule: GameExtractionRule, data: Record<string, any>): number | null {
  const picked = pickFirstValid(data, rule.accuracyFields)
  if (!picked) {
    return null
  }
  const scaled = rule.accuracyScale === 'percent' ? picked.value / 100 : picked.value
  // 归一到 0-1 并兜底裁剪，避免脏数据越界
  const clamped = clampNum(scaled, 0, 1, NaN)
  return Number.isFinite(clamped) ? clamped : null
}

function resolveReaction(rule: GameExtractionRule, data: Record<string, any>): number | null {
  const picked = pickFirstValid(data, rule.reactionFields)
  if (!picked) {
    return null
  }
  return Math.max(0, picked.value)
}

function resolveDuration(
  rule: GameExtractionRule,
  data: Record<string, any>,
  sessionDurationMs: number,
): number {
  const durationRule = rule.duration ?? { kind: 'session' as const }

  if (durationRule.kind === 'session') {
    return Math.max(0, Math.round(numOr(sessionDurationMs, 0) / 1000))
  }

  if (durationRule.kind === 'seconds') {
    const picked = pickFirstValid(data, durationRule.fields)
    if (picked && picked.value >= 0) {
      return Math.round(picked.value)
    }
    return Math.max(0, Math.round(numOr(sessionDurationMs, 0) / 1000))
  }

  // msHeuristic：复刻原 resolveDurationSeconds 的“字段名/数值>10000 判 ms”启发式（社交遗留）
  const fields = durationRule.fields
  const fieldName = fields.find((key) => data[key] !== undefined)
  const raw = fieldName !== undefined ? data[fieldName] : undefined
  const looksLikeMs = fieldName === 'durationMs' || numOr(raw, 0) > 10000
  const valueMs = looksLikeMs
    ? numOr(raw, sessionDurationMs)
    : numOr(raw, numOr(sessionDurationMs, 0) / 1000) * 1000
  const seconds = Math.round((valueMs || numOr(sessionDurationMs, 0)) / 1000)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 0
}

// ========== 主导出 ==========

/**
 * 把游戏 performanceData 归一化为标准指标。
 *
 * @param gameCode 游戏 code（如 F03_RECYCLING / L03_BRUSH_TEETH / L05_PACK_BAG / S01_BURGER）
 * @param performanceData 游戏组件 emit 的原始数据（可能是空壳 {event}）
 * @param sessionDurationMs 本局会话时长（毫秒），duration 缺失时的兜底来源
 */
export function normalizeGameMetrics(
  gameCode: string,
  performanceData: Record<string, any> | null | undefined,
  sessionDurationMs: number,
): NormalizedGameMetrics {
  const data = performanceData && typeof performanceData === 'object' ? performanceData : {}
  const rule = GAME_EXTRACTION_RULES[gameCode]

  if (!rule) {
    // 未知 gameCode：保守降级，不出准确率/反应时，时长走会话兜底
    return {
      accuracy: null,
      avgResponseTimeMs: null,
      durationSec: Math.max(0, Math.round(numOr(sessionDurationMs, 0) / 1000)),
      extra: data,
      hasRealData: false,
    }
  }

  const hasRealData = rule.realityFields.some((field) => isValidNumber(data[field]))

  return {
    accuracy: resolveAccuracy(rule, data),
    avgResponseTimeMs: resolveReaction(rule, data),
    durationSec: resolveDuration(rule, data, sessionDurationMs),
    extra: data,
    hasRealData,
  }
}
