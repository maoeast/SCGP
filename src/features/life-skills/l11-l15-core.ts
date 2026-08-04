import type { EmotionGameDifficulty } from '@/types/emotional/games'

export const L11_L15_GAME_CODES = [
  'L12_POUR_WATER',
] as const

export type L11L15GameCode = (typeof L11_L15_GAME_CODES)[number]

// ========== L12: 倒水小帮手 ==========

export interface PourWaterDifficultyConfig {
  targetCups: number
  /** 允许的填充误差（相对于目标水位的比例） */
  fillToleranceRatio: number
  /** 水流速度倍率 */
  flowSpeedMultiplier: number
  /** 刻度线是否隐藏 */
  hideMarkLine: boolean
}

export const POUR_WATER_DIFFICULTIES: Record<EmotionGameDifficulty, PourWaterDifficultyConfig> = {
  1: { targetCups: 3, fillToleranceRatio: 0.15, flowSpeedMultiplier: 0.6, hideMarkLine: false },
  2: { targetCups: 4, fillToleranceRatio: 0.10, flowSpeedMultiplier: 0.8, hideMarkLine: false },
  3: { targetCups: 5, fillToleranceRatio: 0.06, flowSpeedMultiplier: 1.0, hideMarkLine: true },
}

export type FillResult = 'exact' | 'overflow' | 'underfill'

export function checkFillResult(fillRatio: number, targetRatio: number, tolerance: number): FillResult {
  const diff = fillRatio - targetRatio
  if (Math.abs(diff) <= tolerance) return 'exact'
  return diff > 0 ? 'overflow' : 'underfill'
}

// ========== 图片资源路径（resource:// 协议） ==========

/** 场景底图 */
export const L12_SCENE_URL = 'resource://images/self-care/scenes/pourwater-table-scene.png'

// ========== 共用工具 ==========

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
