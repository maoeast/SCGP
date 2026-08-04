import type { EmotionGameDifficulty } from '@/types/emotional/games'

export const NEW_LIFE_SKILLS_GAME_CODES = [
  'L06_STEADY_SPOON',
  'L07_BODY_SIGNAL',
  'L08_TOWEL_TWIST',
  'L09_HOME_SOUND',
  'L10_MARKET_PAY',
] as const

export type NewLifeSkillsGameCode = (typeof NEW_LIFE_SKILLS_GAME_CODES)[number]

export interface SteadySpoonDifficultyConfig {
  targetScoops: number
  speedLimitPxPerSecond: number
  corridorHalfWidthRatio: number
  spillSampleLimit: number
  showFullGuide: boolean
}

export const STEADY_SPOON_DIFFICULTIES: Record<EmotionGameDifficulty, SteadySpoonDifficultyConfig> = {
  1: {
    targetScoops: 3,
    speedLimitPxPerSecond: 720,
    corridorHalfWidthRatio: 0.2,
    spillSampleLimit: 8,
    showFullGuide: true,
  },
  2: {
    targetScoops: 4,
    speedLimitPxPerSecond: 620,
    corridorHalfWidthRatio: 0.16,
    spillSampleLimit: 7,
    showFullGuide: true,
  },
  3: {
    targetScoops: 5,
    speedLimitPxPerSecond: 540,
    corridorHalfWidthRatio: 0.14,
    spillSampleLimit: 6,
    showFullGuide: false,
  },
}

export interface SpoonMotionSample {
  difficulty: EmotionGameDifficulty
  progress: number
  yRatio: number
  speedPxPerSecond: number
  abruptTurn: boolean
}

export interface SpoonMotionEvaluation {
  expectedYRatio: number
  deviationRatio: number
  stable: boolean
  instabilityWeight: number
}

export function getSpoonPathY(difficulty: EmotionGameDifficulty, progress: number): number {
  const boundedProgress = clamp(progress, 0, 1)
  const base = 0.72 - boundedProgress * 0.3
  if (difficulty === 1) return base
  const curve = Math.sin(boundedProgress * Math.PI) * (difficulty === 2 ? -0.08 : 0.1)
  return clamp(base + curve, 0.18, 0.82)
}

export function evaluateSpoonMotion(sample: SpoonMotionSample): SpoonMotionEvaluation {
  const config = STEADY_SPOON_DIFFICULTIES[sample.difficulty]
  const expectedYRatio = getSpoonPathY(sample.difficulty, sample.progress)
  const deviationRatio = Math.abs(sample.yRatio - expectedYRatio)
  const tooFast = sample.speedPxPerSecond > config.speedLimitPxPerSecond
  const outsideGuide = deviationRatio > config.corridorHalfWidthRatio
  const stable = !tooFast && !outsideGuide && !sample.abruptTurn

  return {
    expectedYRatio,
    deviationRatio,
    stable,
    instabilityWeight: (tooFast ? 1 : 0) + (outsideGuide ? 1 : 0) + (sample.abruptTurn ? 1 : 0),
  }
}

export interface BodySignalScenario {
  id: string
  cueEmoji: string
  cueTitle: string
  cueText: string
  correctSignal: 'toilet' | 'hungry' | 'tired'
  choices: ReadonlyArray<{ id: 'toilet' | 'hungry' | 'tired'; emoji: string; label: string }>
}

const BODY_SIGNAL_CHOICES = [
  { id: 'toilet', emoji: '🚻', label: '想上厕所' },
  { id: 'hungry', emoji: '🍎', label: '肚子饿了' },
  { id: 'tired', emoji: '😴', label: '身体累了' },
] as const

export const BODY_SIGNAL_SCENARIOS: ReadonlyArray<BodySignalScenario> = [
  {
    id: 'wiggle',
    cueEmoji: '🦵',
    cueTitle: '双腿夹一夹',
    cueText: '小乐坐着时扭来扭去，双腿夹得紧紧的。',
    correctSignal: 'toilet',
    choices: BODY_SIGNAL_CHOICES,
  },
  {
    id: 'bladder',
    cueEmoji: '💧',
    cueTitle: '小肚子胀胀的',
    cueText: '小乐觉得小肚子下面胀胀的，越来越想离开座位。',
    correctSignal: 'toilet',
    choices: BODY_SIGNAL_CHOICES,
  },
  {
    id: 'meal',
    cueEmoji: '🍽️',
    cueTitle: '肚子咕咕叫',
    cueText: '午饭前，小乐的肚子咕咕叫，想吃点东西。',
    correctSignal: 'hungry',
    choices: BODY_SIGNAL_CHOICES,
  },
  {
    id: 'yawn',
    cueEmoji: '🥱',
    cueTitle: '眼睛睁不开',
    cueText: '活动结束后，小乐一直打哈欠，眼睛快要睁不开了。',
    correctSignal: 'tired',
    choices: BODY_SIGNAL_CHOICES,
  },
  {
    id: 'urgent',
    cueEmoji: '🚶',
    cueTitle: '马上想去厕所',
    cueText: '小乐突然停下游戏，捂住小肚子，想马上去一个地方。',
    correctSignal: 'toilet',
    choices: BODY_SIGNAL_CHOICES,
  },
]

export const BODY_SIGNAL_DIFFICULTIES: Record<EmotionGameDifficulty, { targetRounds: number; choiceCount: number; holdToRequestMs: number }> = {
  1: { targetRounds: 3, choiceCount: 2, holdToRequestMs: 500 },
  2: { targetRounds: 4, choiceCount: 3, holdToRequestMs: 650 },
  3: { targetRounds: 5, choiceCount: 3, holdToRequestMs: 800 },
}

export function getBodySignalScenario(roundIndex: number): BodySignalScenario {
  return BODY_SIGNAL_SCENARIOS[((roundIndex % BODY_SIGNAL_SCENARIOS.length) + BODY_SIGNAL_SCENARIOS.length) % BODY_SIGNAL_SCENARIOS.length]!
}

export function getBodySignalChoices(
  scenario: BodySignalScenario,
  difficulty: EmotionGameDifficulty,
): BodySignalScenario['choices'] {
  const choiceCount = BODY_SIGNAL_DIFFICULTIES[difficulty].choiceCount
  if (choiceCount >= scenario.choices.length) return scenario.choices

  const correct = scenario.choices.find((choice) => choice.id === scenario.correctSignal)!
  const distractor = scenario.choices.find((choice) => choice.id !== scenario.correctSignal)!
  return [correct, distractor]
}

export type TwistDirection = 'up' | 'down'

export const TOWEL_TWIST_DIFFICULTIES: Record<EmotionGameDifficulty, { targetTwists: number; travelRatio: number; showArrows: boolean }> = {
  1: { targetTwists: 3, travelRatio: 0.18, showArrows: true },
  2: { targetTwists: 4, travelRatio: 0.23, showArrows: true },
  3: { targetTwists: 5, travelRatio: 0.28, showArrows: false },
}

export function getTwistTargets(completedTwists: number): { left: TwistDirection; right: TwistDirection } {
  return completedTwists % 2 === 0
    ? { left: 'up', right: 'down' }
    : { left: 'down', right: 'up' }
}

export function isTwistGestureAccepted(
  leftDirection: TwistDirection | null,
  rightDirection: TwistDirection | null,
  completedTwists: number,
): boolean {
  const target = getTwistTargets(completedTwists)
  return leftDirection === target.left && rightDirection === target.right
}

export interface HomeSoundRound {
  id: string
  soundCue: string
  sourceEmoji: string
  sourceLabel: string
  safeAction: string
  unsafeAction: string
}

export const HOME_SOUND_ROUNDS: ReadonlyArray<HomeSoundRound> = [
  {
    id: 'doorbell',
    soundCue: '叮咚，叮咚。',
    sourceEmoji: '🚪',
    sourceLabel: '门铃',
    safeAction: '先告诉大人，再一起看看是谁',
    unsafeAction: '马上自己开门',
  },
  {
    id: 'smoke-alarm',
    soundCue: '滴，滴，滴，急促的提醒声。',
    sourceEmoji: '🚨',
    sourceLabel: '烟雾报警器',
    safeAction: '离开危险处，马上找大人',
    unsafeAction: '躲起来不告诉别人',
  },
  {
    id: 'kettle',
    soundCue: '咕嘟，咕嘟，水壶响了。',
    sourceEmoji: '♨️',
    sourceLabel: '烧水壶',
    safeAction: '不碰热水壶，告诉大人',
    unsafeAction: '伸手摸摸热不热',
  },
  {
    id: 'running-water',
    soundCue: '哗啦啦，水一直在流。',
    sourceEmoji: '🚰',
    sourceLabel: '水龙头',
    safeAction: '站稳后关水，关不了就找大人',
    unsafeAction: '踩着湿地跑过去',
  },
  {
    id: 'phone',
    soundCue: '铃铃铃，铃铃铃。',
    sourceEmoji: '☎️',
    sourceLabel: '电话',
    safeAction: '告诉身边的大人电话响了',
    unsafeAction: '把陌生信息告诉电话里的人',
  },
]

export const HOME_SOUND_DIFFICULTIES: Record<EmotionGameDifficulty, { targetRounds: number; sourceChoiceCount: number; autoReplay: boolean }> = {
  1: { targetRounds: 3, sourceChoiceCount: 2, autoReplay: true },
  2: { targetRounds: 4, sourceChoiceCount: 3, autoReplay: false },
  3: { targetRounds: 5, sourceChoiceCount: 3, autoReplay: false },
}

export function getHomeSoundRound(roundIndex: number): HomeSoundRound {
  return HOME_SOUND_ROUNDS[((roundIndex % HOME_SOUND_ROUNDS.length) + HOME_SOUND_ROUNDS.length) % HOME_SOUND_ROUNDS.length]!
}

export function buildHomeSoundSourceChoices(roundIndex: number, difficulty: EmotionGameDifficulty): HomeSoundRound[] {
  const current = getHomeSoundRound(roundIndex)
  const count = HOME_SOUND_DIFFICULTIES[difficulty].sourceChoiceCount
  const choices = [current]

  for (let offset = 1; choices.length < count; offset += 1) {
    const candidate = getHomeSoundRound(roundIndex + offset)
    if (!choices.some((choice) => choice.id === candidate.id)) choices.push(candidate)
  }

  return choices.sort((left, right) => left.id.localeCompare(right.id))
}

export interface MarketRound {
  id: string
  itemEmoji: string
  itemName: string
  price: number
}

export const MARKET_ROUNDS: ReadonlyArray<MarketRound> = [
  { id: 'banana', itemEmoji: '🍌', itemName: '香蕉', price: 3 },
  { id: 'milk', itemEmoji: '🥛', itemName: '牛奶', price: 4 },
  { id: 'bread', itemEmoji: '🍞', itemName: '面包', price: 5 },
  { id: 'apple', itemEmoji: '🍎', itemName: '苹果', price: 6 },
  { id: 'notebook', itemEmoji: '📒', itemName: '小本子', price: 7 },
]

export const MARKET_PAY_DIFFICULTIES: Record<EmotionGameDifficulty, { targetPurchases: number; coinValues: readonly number[] }> = {
  1: { targetPurchases: 3, coinValues: [1] },
  2: { targetPurchases: 4, coinValues: [1, 2] },
  3: { targetPurchases: 5, coinValues: [1, 2, 5] },
}

export function getMarketRound(roundIndex: number, difficulty: EmotionGameDifficulty): MarketRound {
  const base = MARKET_ROUNDS[((roundIndex % MARKET_ROUNDS.length) + MARKET_ROUNDS.length) % MARKET_ROUNDS.length]!
  if (difficulty === 1) {
    return { ...base, price: Math.min(4, base.price) }
  }
  return base
}

export type PaymentCheckResult = 'exact' | 'under' | 'over'

export function checkPayment(total: number, price: number): PaymentCheckResult {
  if (total === price) return 'exact'
  return total < price ? 'under' : 'over'
}

export function averageNonNegative(values: readonly number[]): number {
  const usable = values.filter((value) => Number.isFinite(value) && value >= 0)
  if (usable.length === 0) return 0
  return Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length)
}

export function ratio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0
  return clamp(numerator / denominator, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
