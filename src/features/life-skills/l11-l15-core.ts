import type { EmotionGameDifficulty } from '@/types/emotional/games'

export const L11_L15_GAME_CODES = [
  'L11_FACE_WASH',
  'L12_POUR_WATER',
  'L13_ROAD_CROSS',
  'L14_FOLD_CLOTHES',
  'L15_SWEEP_FLOOR',
] as const

export type L11L15GameCode = (typeof L11_L15_GAME_CODES)[number]

// ========== L11: 洗脸小镜子 ==========

export interface FaceWashDifficultyConfig {
  targetZones: number
  /** 最小弧度覆盖（度数）才算洗净该区域 */
  minArcDegrees: number
  /** 目标区域半径（占容器比例） */
  zoneRadiusRatio: number
  /** 是否显示下一区域提示 */
  showNextHint: boolean
}

export const FACE_WASH_DIFFICULTIES: Record<EmotionGameDifficulty, FaceWashDifficultyConfig> = {
  1: { targetZones: 3, minArcDegrees: 270, zoneRadiusRatio: 0.18, showNextHint: true },
  2: { targetZones: 4, minArcDegrees: 320, zoneRadiusRatio: 0.15, showNextHint: true },
  3: { targetZones: 5, minArcDegrees: 360, zoneRadiusRatio: 0.12, showNextHint: false },
}

export interface FaceZone {
  id: string
  label: string
  /** 中心 x 比例 (0-1) */
  cx: number
  /** 中心 y 比例 (0-1) */
  cy: number
}

export const FACE_ZONES: ReadonlyArray<FaceZone> = [
  { id: 'forehead', label: '额头', cx: 0.5, cy: 0.22 },
  { id: 'left-cheek', label: '左脸', cx: 0.3, cy: 0.5 },
  { id: 'right-cheek', label: '右脸', cx: 0.7, cy: 0.5 },
  { id: 'nose', label: '鼻子', cx: 0.5, cy: 0.48 },
  { id: 'chin', label: '下巴', cx: 0.5, cy: 0.75 },
]

export function getFaceWashZones(difficulty: EmotionGameDifficulty): FaceZone[] {
  const count = FACE_WASH_DIFFICULTIES[difficulty].targetZones
  return FACE_ZONES.slice(0, count)
}

export function isZoneCleaned(arcDegrees: number, difficulty: EmotionGameDifficulty): boolean {
  return arcDegrees >= FACE_WASH_DIFFICULTIES[difficulty].minArcDegrees
}

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

// ========== L13: 安全过马路 ==========

export interface RoadCrossDifficultyConfig {
  targetCrossings: number
  /** 绿灯持续时间（秒） */
  greenDurationSec: number
  /** 是否显示倒计时 */
  showCountdown: boolean
  /** 是否有转弯车辆干扰 */
  hasTurningCar: boolean
}

export const ROAD_CROSS_DIFFICULTIES: Record<EmotionGameDifficulty, RoadCrossDifficultyConfig> = {
  1: { targetCrossings: 3, greenDurationSec: 6, showCountdown: true, hasTurningCar: false },
  2: { targetCrossings: 4, greenDurationSec: 4, showCountdown: false, hasTurningCar: false },
  3: { targetCrossings: 5, greenDurationSec: 3, showCountdown: false, hasTurningCar: true },
}

export type TrafficLight = 'red' | 'green' | 'yellow'

export function isCrossingSafe(light: TrafficLight, hasTurningCar: boolean): boolean {
  if (light !== 'green') return false
  if (hasTurningCar) return false
  return true
}

// ========== L14: 叠衣小能手 ==========

export interface FoldClothesDifficultyConfig {
  targetItems: number
  /** 每件衣物需要折叠的次数 */
  foldsPerItem: number
  /** 对齐容差（占衣物宽度比例） */
  alignmentToleranceRatio: number
  /** 是否显示动画引导 */
  showGuideAnimation: boolean
}

export const FOLD_CLOTHES_DIFFICULTIES: Record<EmotionGameDifficulty, FoldClothesDifficultyConfig> = {
  1: { targetItems: 3, foldsPerItem: 1, alignmentToleranceRatio: 0.2, showGuideAnimation: true },
  2: { targetItems: 4, foldsPerItem: 2, alignmentToleranceRatio: 0.15, showGuideAnimation: true },
  3: { targetItems: 5, foldsPerItem: 3, alignmentToleranceRatio: 0.1, showGuideAnimation: false },
}

export type FoldDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top'

export function isFoldAligned(offsetRatio: number, tolerance: number): boolean {
  return Math.abs(offsetRatio) <= tolerance
}

// ========== L15: 扫地小旋风 ==========

export interface SweepFloorDifficultyConfig {
  targetPiles: number
  /** 簸箕宽度（占容器宽度比例） */
  dustpanWidthRatio: number
  /** 每堆碎屑数 */
  debrisPerPile: number
  /** 是否显示方向箭头 */
  showDirectionArrow: boolean
}

export const SWEEP_FLOOR_DIFFICULTIES: Record<EmotionGameDifficulty, SweepFloorDifficultyConfig> = {
  1: { targetPiles: 3, dustpanWidthRatio: 0.25, debrisPerPile: 4, showDirectionArrow: true },
  2: { targetPiles: 4, dustpanWidthRatio: 0.2, debrisPerPile: 5, showDirectionArrow: true },
  3: { targetPiles: 5, dustpanWidthRatio: 0.16, debrisPerPile: 6, showDirectionArrow: false },
}

export type SweepDirection = 'left' | 'right' | 'up' | 'down'

export function isSweepDirectionCorrect(
  sweepDirection: SweepDirection,
  dustpanDirection: SweepDirection,
): boolean {
  return sweepDirection === dustpanDirection
}

// ========== 图片资源路径（resource:// 协议） ==========

/** 场景底图 */
export const L11_SCENE_URL = 'resource://images/self-care/scenes/facewash-basin-scene.png'
export const L12_SCENE_URL = 'resource://images/self-care/scenes/pourwater-table-scene.png'
export const L13_SCENE_URL = 'resource://images/self-care/scenes/roadcross-intersection-scene.png'
export const L14_SCENE_URL = 'resource://images/self-care/scenes/foldclothes-bed-scene.png'
export const L15_SCENE_URL = 'resource://images/self-care/scenes/sweepfloor-room-scene.png'

/** L11 洗脸进度图（浅绿底，后续色键去底） */
export const FACE_WASH_PROGRESS_IMAGES = {
  dirty: 'resource://images/self-care/progress/facewash-dirty.png',
  'forehead-clean': 'resource://images/self-care/progress/facewash-forehead-clean.png',
  'cheeks-clean': 'resource://images/self-care/progress/facewash-cheeks-clean.png',
  'all-clean': 'resource://images/self-care/progress/facewash-all-clean.png',
} as const

export type FaceWashProgressKey = keyof typeof FACE_WASH_PROGRESS_IMAGES

/** L13 过马路进度图 */
export const ROAD_CROSS_PROGRESS_IMAGES = {
  redlight: 'resource://images/self-care/progress/roadcross-redlight.png',
  greenlight: 'resource://images/self-care/progress/roadcross-greenlight.png',
  crossing: 'resource://images/self-care/progress/roadcross-crossing.png',
  safe: 'resource://images/self-care/progress/roadcross-safe.png',
} as const

export type RoadCrossProgressKey = keyof typeof ROAD_CROSS_PROGRESS_IMAGES

/** L14 叠衣进度图 */
export const FOLD_CLOTHES_PROGRESS_IMAGES = {
  spread: 'resource://images/self-care/progress/foldclothes-spread.png',
  left: 'resource://images/self-care/progress/foldclothes-left.png',
  right: 'resource://images/self-care/progress/foldclothes-right.png',
  bottom: 'resource://images/self-care/progress/foldclothes-bottom.png',
} as const

export type FoldClothesProgressKey = keyof typeof FOLD_CLOTHES_PROGRESS_IMAGES

/** L15 扫地进度图 */
export const SWEEP_FLOOR_PROGRESS_IMAGES = {
  messy: 'resource://images/self-care/progress/sweepfloor-messy.png',
  'left-done': 'resource://images/self-care/progress/sweepfloor-left-done.png',
  'mid-done': 'resource://images/self-care/progress/sweepfloor-mid-done.png',
  'all-clean': 'resource://images/self-care/progress/sweepfloor-all-clean.png',
} as const

export type SweepFloorProgressKey = keyof typeof SWEEP_FLOOR_PROGRESS_IMAGES

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
