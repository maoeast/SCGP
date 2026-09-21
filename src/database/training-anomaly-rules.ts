/**
 * 首页看板「本周异常预警」判定口径（纯函数，零依赖，可 jiti 单测）
 *
 * 数据源：统一训练主表 `training_session`（2026-04-01 统一训练记录计划的 Phase B 双写产物）。
 * 原先看板直接扫 `training_records` + `emotional_training_session` 两张旧表，导致：
 *   ① 只在统一主表落库的入口（如 `cognitive_game_inline` 20 条）完全不进扫描；
 *   ② `module_code='emotional'` 被整段排除，217 条情绪训练两头不看；
 *   ③ 器材 / 情绪游戏的「得分率」被当成「答对率」套阈值（实测 55 条器材行会被误标）。
 *
 * 判定与数据获取分离：SQL 只取窗口内的原始行，是否异常由本模块的纯函数决定——
 * 规则只有一处真源，改阈值/加信号不会漏改 SQL。
 *
 * @module database/training-anomaly-rules
 */

/** 观察窗（天）：滚动 7×24h，与看板其它「过去 7 天」口径一致（不是自然周） */
export const ANOMALY_WINDOW_DAYS = 7

/** 低正确率阈值（仅对「答对率」语义的家族生效，见 ACCURACY_RATIO_FAMILIES） */
export const ACCURACY_ANOMALY_THRESHOLD = 0.5

/**
 * `accuracy_rate` 具备「答对率」语义的 session_family 白名单。
 *
 * 为什么用白名单而不是排除名单：器材（`equipment_training_records`）与情绪游戏
 * （`game_emotion_records`）**源表本身没有 accuracy_rate 列**，统一主表里的值是从
 * `score` 推导的得分率（实测器材 score=2 → 0.4）。对这类家族套「正确率低于 50%」
 * 属于错误归因；将来新增家族默认不参与该判定，需显式登记。
 */
export const ACCURACY_RATIO_FAMILIES: readonly string[] = [
  'game',
  'task_training',
  'care_scene',
  'emotion_scene',
  'cognitive_game',
]

/**
 * 「提示依赖」适用的会话家族（情绪场景：情绪行为调节 / 表达关心）。
 *
 * 显式限定而非「有数据就算」：提示计数来自 `emotional_training_session` 的
 * hint_count / question_count，只有情绪场景家族会有值；将来新增家族即使恰巧
 * 带上同名字段，也不应静默进入该判定。
 */
export const HINT_RATIO_FAMILIES: readonly string[] = ['care_scene', 'emotion_scene']

/**
 * 情绪场景「提示依赖」阈值：平均每题提示次数 = hint_count / question_count。
 *
 * 口径变更（2026-09-21）：原实现取 `emotional_training_detail.hint_level` 的平均值 > 2，
 * 但该明细表在演示库为 0 行（演示脚本只清不写），规则永不触发；会话表自带
 * hint_count / question_count，既有数据也更好解释。
 */
export const HINT_RATIO_ANOMALY_THRESHOLD = 0.5

/**
 * 器材训练「高辅助」阈值：提示层级 ≥ 4。
 * 等级语义取自应用自身的等级表（`src/views/equipment/Records.vue` getPromptLevelLabel）：
 * 1 独立完成 / 2 口头提示 / 3 视觉提示 / 4 手触引导 / 5 身体辅助。
 */
export const EQUIPMENT_PROMPT_LEVEL_THRESHOLD = 4

/** 器材家族标识（用于把提示层级规则限定在器材训练上） */
export const EQUIPMENT_SESSION_FAMILY = 'equipment'

/** 器材提示层级 → 中文标签（与 equipment/Records.vue 的等级表同源语义） */
export const PROMPT_LEVEL_LABELS: Readonly<Record<number, string>> = {
  1: '独立完成',
  2: '口头提示',
  3: '视觉提示',
  4: '手触引导',
  5: '身体辅助',
}

/** 未完成状态（统一枚举，见 docs/planning/2026-04-01-unified-training-record-schema-plan.md §7.2） */
export const INCOMPLETE_COMPLETION_STATUSES: readonly string[] = [
  'interrupted',
  'aborted',
  'cancelled',
]

/** 判定输入：统一训练主表一行（外加情绪会话的提示计数、器材的提示层级） */
export interface TrainingAnomalyRow {
  /** session_family（统一主表的家族标识） */
  sessionFamily: string | null
  /** accuracy_rate（仅答对率语义的家族有意义） */
  accuracyRate: number | null
  /** completion_status（统一枚举） */
  completionStatus: string | null
  /** 情绪场景会话的提示次数（emotional_training_session.hint_count） */
  hintCount?: number | null
  /** 情绪场景会话的题目数（emotional_training_session.question_count） */
  questionCount?: number | null
  /** 器材训练的提示层级（summary_payload.promptLevel） */
  promptLevel?: number | null
}

export type TrainingAnomalyKind =
  | 'low_accuracy'
  | 'high_hint_ratio'
  | 'high_prompt_level'
  | 'incomplete'

export interface TrainingAnomalyVerdict {
  /** 命中的全部信号（按严重度排序） */
  kinds: TrainingAnomalyKind[]
  /** 面板直接展示的文案（多信号用「；」连接） */
  reason: string
  /** 仅当家族具备答对率语义时给出，避免把得分率显示成「正确率」 */
  accuracyRate: number | null
  /** 平均每题提示次数（仅在可计算时给出） */
  hintRatio: number | null
  /** 器材提示层级（仅器材家族给出） */
  promptLevel: number | null
}

/** 平均每题提示次数；缺数据或题数为 0 时返回 null（不猜 0） */
export function computeHintRatio(row: TrainingAnomalyRow): number | null {
  const hintCount = row.hintCount
  const questionCount = row.questionCount
  if (typeof hintCount !== 'number' || typeof questionCount !== 'number') return null
  if (!Number.isFinite(hintCount) || !Number.isFinite(questionCount)) return null
  if (questionCount <= 0) return null
  return hintCount / questionCount
}

/** 该家族是否具备「答对率」语义 */
export function isAccuracyRatioFamily(sessionFamily: string | null): boolean {
  return sessionFamily !== null && ACCURACY_RATIO_FAMILIES.includes(sessionFamily)
}

/**
 * 信号严重度排序（数值越小越紧急）。
 *
 * 为什么需要：器材高辅助在该群体里是常态（实测 7 天 76 条），若面板仍按时间倒序，
 * 前 4 条会全是器材；按严重度排后，真正紧急的「中断 / 低正确率 / 提示依赖」先出。
 * 用户拍板先上严重度排序，不动阈值；「相对基线」方案待专门一轮验证基线质量。
 */
export const ANOMALY_SEVERITY_RANK: Readonly<Record<TrainingAnomalyKind, number>> = {
  incomplete: 0,
  low_accuracy: 1,
  high_hint_ratio: 2,
  high_prompt_level: 3,
}

/** 取一条结论的严重度（多信号取最紧急的那条） */
export function anomalySeverityRank(kinds: readonly TrainingAnomalyKind[]): number {
  let best = Number.POSITIVE_INFINITY
  for (const kind of kinds) {
    const rank = ANOMALY_SEVERITY_RANK[kind]
    if (typeof rank === 'number' && rank < best) best = rank
  }
  return best
}

/**
 * 统一训练主表一行 → 异常判定（命中 0 条信号返回 null）。
 *
 * 规则（全部来自真实字段，阈值见上方常量）：
 *   1. 低正确率：答对率语义家族 且 accuracy_rate < 0.5
 *   2. 提示依赖：情绪场景 且 平均每题提示次数 > 0.5
 *   3. 高辅助：器材训练 且 提示层级 ≥ 4
 *   4. 未完成：completion_status ∈ {interrupted, aborted, cancelled}
 */
export function evaluateTrainingAnomaly(row: TrainingAnomalyRow): TrainingAnomalyVerdict | null {
  const kinds: TrainingAnomalyKind[] = []
  const reasons: string[] = []

  const accuracyFamily = isAccuracyRatioFamily(row.sessionFamily)
  const lowAccuracy = accuracyFamily
    && row.accuracyRate !== null
    && Number.isFinite(row.accuracyRate)
    && row.accuracyRate < ACCURACY_ANOMALY_THRESHOLD
  if (lowAccuracy) {
    kinds.push('low_accuracy')
    reasons.push(`正确率低于 ${Math.round(ACCURACY_ANOMALY_THRESHOLD * 100)}%`)
  }

  const hintRatio = HINT_RATIO_FAMILIES.includes(row.sessionFamily || '')
    ? computeHintRatio(row)
    : null
  const highHintRatio = hintRatio !== null && hintRatio > HINT_RATIO_ANOMALY_THRESHOLD
  if (highHintRatio) {
    kinds.push('high_hint_ratio')
    reasons.push(`提示依赖较高（平均每题 ${hintRatio!.toFixed(2)} 次提示）`)
  }

  const promptLevel = row.sessionFamily === EQUIPMENT_SESSION_FAMILY
    && typeof row.promptLevel === 'number'
    && Number.isFinite(row.promptLevel)
    ? row.promptLevel
    : null
  const highPromptLevel = promptLevel !== null && promptLevel >= EQUIPMENT_PROMPT_LEVEL_THRESHOLD
  if (highPromptLevel) {
    kinds.push('high_prompt_level')
    const label = PROMPT_LEVEL_LABELS[promptLevel!] || '高辅助'
    reasons.push(`训练需「${label}」辅助`)
  }

  const incomplete = row.completionStatus !== null
    && INCOMPLETE_COMPLETION_STATUSES.includes(row.completionStatus)
  if (incomplete) {
    kinds.push('incomplete')
    reasons.push('训练未完成（中断或退出）')
  }

  if (kinds.length === 0) return null

  return {
    kinds,
    reason: reasons.join('；'),
    accuracyRate: accuracyFamily ? row.accuracyRate : null,
    hintRatio,
    promptLevel,
  }
}
