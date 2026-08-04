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
  /**
   * 派生正确率：correct/(correct+wrong)。优先于 accuracyFields。
   * 用于没有单一正确率字段、只能由正确/错误计数派生的游戏（Tier 2）。
   * 要求 correct 与 wrong 都为有效数值、且 correct+wrong > 0，否则该游戏本局正确率记为 null。
   * 派生结果天然在 0-1，不读 accuracyScale（正确率本就是比值）。
   */
  accuracyDerived?: {
    correctFields: string[]
    wrongFields: string[]
    /**
     * true 时 correctFields / wrongFields 内全部有效字段求和后参与派生
     * （用于正确数分布在多个字段的游戏，如 L09 的 source_matches + safe_responses）。
     * 默认 false：与既有行为一致，只取每侧第一个有效字段。
     */
    sumCorrect?: boolean
  }
  /** 平均反应时源字段（按顺序尝试，单位 ms）；不声明则无反应时口径 */
  reactionFields?: string[]
  /**
   * 数组型反应时：取该字段数组元素（ms）的平均。优先于 reactionFields。
   * 用于只产出“每次反应时数组”、没有标量均值的游戏（如 F05 的 window_response_ms）。
   */
  reactionArrayField?: string
  /** 时长提取规则；不声明则等价于 { kind: 'session' } */
  duration?: DurationRule
}

// ========== gameCode → 提取规则表 ==========
//
// Phase 1 填 Tier 1 三游戏（F03/L03/L05）；Phase 2 补 Tier 2 四游戏（F04/L01/L02/L04，用 accuracyDerived 派生正确率）；
// Phase 3 补 Tier 3 三游戏（F02/F01/F05，近似指标口径；F05 用 reactionArrayField 取数组反应时均值）。
// social 六个 code 共享同一条遗留规则，行为与原 runSocialIepChain 的手写提取保持一致（不破坏社交闭环）。
// cognitive K01-K10 十条规则：correct/total 计数，无反应时，时长走会话兜底。
// 后续扩展（如 G07）直接在此加行即可。

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

  // ===== Tier 3：生活自理（L06–L10 新增） =====
  L06_STEADY_SPOON: {
    // 稳稳送一勺：stable_motion_ratio(0-1) 稳定采样占比 + average_delivery_ms + total_duration_seconds(秒)
    realityFields: ['stable_motion_ratio', 'delivered_scoops'],
    accuracyFields: ['stable_motion_ratio'],
    accuracyScale: 'ratio',
    reactionFields: ['average_delivery_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L07_BODY_SIGNAL: {
    // 身体信号小灯塔：派生 recognized_signals/(recognized+wrong)_signal_choices + average_response_ms + total_duration_seconds(秒)
    realityFields: ['recognized_signals'],
    accuracyDerived: {
      correctFields: ['recognized_signals'],
      wrongFields: ['wrong_signal_choices'],
    },
    reactionFields: ['average_response_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L08_TOWEL_TWIST: {
    // 毛巾拧拧工坊：coordinated_motion_ratio(0-1) 双侧协调占比 + average_twist_ms + total_duration_seconds(秒)
    realityFields: ['coordinated_motion_ratio', 'completed_twists'],
    accuracyFields: ['coordinated_motion_ratio'],
    accuracyScale: 'ratio',
    reactionFields: ['average_twist_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L09_HOME_SOUND: {
    // 家里声音小侦探：派生 (source_matches+safe_responses)/(全部来源与行动选择) + average_response_ms + total_duration_seconds(秒)
    // 正确数分布在两个字段，用 sumCorrect 求和后参与派生
    realityFields: ['source_matches', 'safe_responses'],
    accuracyDerived: {
      correctFields: ['source_matches', 'safe_responses'],
      wrongFields: ['wrong_source_choices', 'unsafe_response_choices'],
      sumCorrect: true,
    },
    reactionFields: ['average_response_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L10_MARKET_PAY: {
    // 超市付款小能手：派生 exact_payments/(exact+incorrect)_payment_checks + average_payment_ms + total_duration_seconds(秒)
    realityFields: ['exact_payments'],
    accuracyDerived: {
      correctFields: ['exact_payments'],
      wrongFields: ['incorrect_payment_checks'],
    },
    reactionFields: ['average_payment_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L11_FACE_WASH: {
    // 洗脸小镜子：cleaned_zones/(cleaned+incomplete) 派生 + average_circle_time_ms + total_duration_seconds
    realityFields: ['cleaned_zones'],
    accuracyDerived: { correctFields: ['cleaned_zones'], wrongFields: ['incomplete_circles'] },
    reactionFields: ['average_circle_time_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L12_POUR_WATER: {
    // 倒水小帮手：fill_accuracy_ratio 直接 ratio + average_fill_time_ms + total_duration_seconds
    realityFields: ['fill_accuracy_ratio', 'filled_cups'],
    accuracyFields: ['fill_accuracy_ratio'],
    accuracyScale: 'ratio',
    reactionFields: ['average_fill_time_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L13_ROAD_CROSS: {
    // 安全过马路：safe_crossings/(safe+red_light_attempts+incomplete) 派生 + average_crossing_ms + total_duration_seconds
    realityFields: ['safe_crossings'],
    accuracyDerived: {
      correctFields: ['safe_crossings'],
      wrongFields: ['red_light_attempts', 'incomplete_crossings'],
      sumCorrect: false,
    },
    reactionFields: ['average_crossing_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L14_FOLD_CLOTHES: {
    // 叠衣小能手：fold_accuracy_ratio 直接 ratio + average_fold_time_ms + total_duration_seconds
    realityFields: ['fold_accuracy_ratio', 'folded_items'],
    accuracyFields: ['fold_accuracy_ratio'],
    accuracyScale: 'ratio',
    reactionFields: ['average_fold_time_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L15_SWEEP_FLOOR: {
    // 扫地小旋风：cleared_piles/(cleared+wrong_direction) 派生 + average_pile_time_ms + total_duration_seconds
    realityFields: ['cleared_piles'],
    accuracyDerived: { correctFields: ['cleared_piles'], wrongFields: ['wrong_direction_swipes'] },
    reactionFields: ['average_pile_time_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },

  // ===== Tier 2：精细动作 =====
  F04_TRACK_BUILD: {
    // 轨道修补匠：派生正确率 correct_placements/(correct+wrong)_placements + average_placement_ms
    // 时长：无 total_duration_seconds；average_layout_ms 是“每个关卡布局的平均耗时”（非总训练时长），
    // 故用会话兜底（与 F03 一致），避免把单关平均误当总时长。
    realityFields: ['correct_placements'],
    accuracyDerived: { correctFields: ['correct_placements'], wrongFields: ['wrong_placements'] },
    reactionFields: ['average_placement_ms'],
    duration: { kind: 'session' },
  },

  // ===== Tier 3：精细动作（近似指标，非经典正确率） =====
  F02_STAR_TRACE: {
    // 连线小星座：path_precision_ratio(0-1，可能为 null) 轨迹精度 + average_constellation_ms；无总时长
    // realityFields 含 completed_constellations：精度为 null 的中断局仍判为真实数据（accuracy 走 null 降级）
    realityFields: ['path_precision_ratio', 'completed_constellations'],
    accuracyFields: ['path_precision_ratio'],
    accuracyScale: 'ratio',
    reactionFields: ['average_constellation_ms'],
    duration: { kind: 'session' },
  },
  F01_CLOUD_ERASE: {
    // 云朵擦擦擦：cleared_ratio_peak(0-1) 覆盖率峰值；无反应时指标；无总时长
    realityFields: ['cleared_ratio_peak'],
    accuracyFields: ['cleared_ratio_peak'],
    accuracyScale: 'ratio',
    duration: { kind: 'session' },
  },
  F05_BALLOONS: {
    // 刺破慢气球：无经典正确率（核心是抑制控制 early_taps，由生成器读 extra）；
    // 反应时 window_response_ms 是数组→用 reactionArrayField 取均值；无总时长
    realityFields: ['successful_pops'],
    reactionArrayField: 'window_response_ms',
    duration: { kind: 'session' },
  },

  // ===== Tier 2：生活自理 =====
  L01_WASH_HANDS: {
    // 洗手小能手：派生 correct_action_count/(correct+wrong)_action + average_action_ms + total_duration_seconds(秒)
    realityFields: ['correct_action_count'],
    accuracyDerived: { correctFields: ['correct_action_count'], wrongFields: ['wrong_action_count'] },
    reactionFields: ['average_action_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L02_DRESS_UP: {
    // 我会穿衣服：派生 completed_item_count/(completed+wrong)_placements + average_selection_ms + total_duration_seconds(秒)
    realityFields: ['completed_item_count'],
    accuracyDerived: { correctFields: ['completed_item_count'], wrongFields: ['wrong_placements'] },
    reactionFields: ['average_selection_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
  L04_SET_TABLE: {
    // 摆桌子帮帮忙：派生 completed_places/(completed+wrong)_placements + average_placement_ms + total_duration_seconds(秒)
    realityFields: ['completed_places'],
    accuracyDerived: { correctFields: ['completed_places'], wrongFields: ['wrong_placements'] },
    reactionFields: ['average_placement_ms'],
    duration: { kind: 'seconds', fields: ['total_duration_seconds'] },
  },
}

// social 六个 code 共享同一条规则
for (const code of SOCIAL_GAME_CODES) {
  GAME_EXTRACTION_RULES[code] = SOCIAL_RULE
}

// cognitive K 系列 10 游戏：correct/total 计数，无反应时/正确率，时长走会话兜底
const COGNITIVE_GAME_CODES = [
  'K01_MEMORY_MATCH', 'K02_MISSING_ITEM', 'K03_PATTERN_NEXT',
  'K04_ODD_ONE_OUT', 'K05_NUMBER_SENSE', 'K06_SIZE_ORDER',
  'K07_SPOT_DIFF', 'K08_MAZE_RUN', 'K09_ECHO_SEQ', 'K10_STORY_ORDER',
]
const COGNITIVE_RULE: GameExtractionRule = {
  realityFields: ['correct', 'total'],
  duration: { kind: 'session' },
}
for (const code of COGNITIVE_GAME_CODES) {
  GAME_EXTRACTION_RULES[code] = COGNITIVE_RULE
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

/**
 * 对字段列表内全部有效数值求和（至少一个有效才返回）。
 * 用于正确数/错误数分布在多个字段、需要按同一口径合并的规则（如 L09）。
 */
function sumValidFields(data: Record<string, any>, fields: string[] | undefined): { field: string; value: number } | null {
  if (!fields || fields.length === 0) {
    return null
  }
  let total = 0
  let found = false
  for (const field of fields) {
    if (isValidNumber(data[field])) {
      total += Number(data[field])
      found = true
    }
  }
  return found ? { field: fields.join('+'), value: total } : null
}

function resolveAccuracy(rule: GameExtractionRule, data: Record<string, any>): number | null {
  // 派生正确率优先：correct/(correct+wrong)。需二者都有效且分母 > 0，否则记 null（渲染层隐藏准确率卡）。
  if (rule.accuracyDerived) {
    const correct = rule.accuracyDerived.sumCorrect
      ? sumValidFields(data, rule.accuracyDerived.correctFields)
      : pickFirstValid(data, rule.accuracyDerived.correctFields)
    const wrong = rule.accuracyDerived.sumCorrect
      ? sumValidFields(data, rule.accuracyDerived.wrongFields)
      : pickFirstValid(data, rule.accuracyDerived.wrongFields)
    if (!correct || !wrong) {
      return null
    }
    const denom = correct.value + wrong.value
    if (!(denom > 0)) {
      return null
    }
    // correct/denom 本就在 0-1，clamp 仅作脏数据兜底
    const clamped = clampNum(correct.value / denom, 0, 1, NaN)
    return Number.isFinite(clamped) ? clamped : null
  }

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
  // 数组型反应时优先：取数组有效非负元素的平均（如 F05 的 window_response_ms）
  if (rule.reactionArrayField) {
    const arr = data[rule.reactionArrayField]
    if (Array.isArray(arr) && arr.length > 0) {
      const nums = arr
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n >= 0)
      if (nums.length > 0) {
        const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length
        return Math.max(0, Math.round(avg))
      }
    }
    return null
  }

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
