import type { StageSize } from '@/utils/hand-game-gestures'
import { getWoodenShapeBlockSvgMarkup } from '@/components/games/shared/wooden-shape-block'

export type WoodBlockShapeId = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'diamond'
export type WoodBlockDifficultyId = 'low' | 'mid' | 'high'

export interface WoodBlockShapeDefinition {
  id: WoodBlockShapeId
  label: string
  color: string
  svgPath: string
}

export interface WoodBlockDifficultyConfig {
  label: string
  shapeCount: number
  piecesRotated: boolean
  slotSize: number
  pieceSize: number
  snapDistance: number
  timeLimit: number
  maxTries: number
}

export interface WoodBlockSlotLayout {
  id: WoodBlockShapeId
  label: string
  color: string
  x: number
  y: number
  size: number
}

export interface WoodBlockPieceLayout extends WoodBlockSlotLayout {
  homeX: number
  homeY: number
  rotation: number
  homeRotation: number
}

export interface WoodBlockSessionSummaryInput {
  shapeCount: number
  matchedCount: number
  failedAttempts: number
  startedAt: number
  endedAt?: number
}

export interface WoodBlockSessionSummary {
  durationSeconds: number
  totalTrials: number
  correctTrials: number
  accuracy: number
  avgResponseTime: number
  omissionErrors: number
  commissionErrors: number
  completionScore: number
  impulsivityScore: number
}

export interface WoodBlockNearestTarget {
  id: WoodBlockShapeId
  x: number
  y: number
}

export type WoodBlockDropOutcome<TSlot extends WoodBlockNearestTarget> =
  | { type: 'return' }
  | { type: 'match'; slot: TSlot }
  | { type: 'miss'; slot: TSlot }

const SVG_VIEWBOX = '0 0 100 100'

export const WOOD_BLOCK_SHAPES: readonly WoodBlockShapeDefinition[] = [
  {
    id: 'circle',
    label: '圆形',
    color: '#E8680A',
    svgPath: getWoodenShapeBlockSvgMarkup('circle'),
  },
  {
    id: 'square',
    label: '方形',
    color: '#2F9E44',
    svgPath: getWoodenShapeBlockSvgMarkup('square'),
  },
  {
    id: 'triangle',
    label: '三角形',
    color: '#228BE6',
    svgPath: getWoodenShapeBlockSvgMarkup('triangle'),
  },
  {
    id: 'star',
    label: '星形',
    color: '#F59F00',
    svgPath: getWoodenShapeBlockSvgMarkup('star'),
  },
  {
    id: 'heart',
    label: '心形',
    color: '#E64980',
    svgPath: getWoodenShapeBlockSvgMarkup('heart'),
  },
  {
    id: 'diamond',
    label: '菱形',
    color: '#8E59D1',
    svgPath: getWoodenShapeBlockSvgMarkup('diamond'),
  },
] as const

export const WOOD_BLOCK_DIFFICULTIES: Record<WoodBlockDifficultyId, WoodBlockDifficultyConfig> = {
  low: {
    label: '🐣 简单',
    shapeCount: 3,
    piecesRotated: false,
    slotSize: 140,
    pieceSize: 110,
    snapDistance: 80,
    timeLimit: 0,
    maxTries: 99,
  },
  mid: {
    label: '🐥 普通',
    shapeCount: 4,
    piecesRotated: false,
    slotSize: 120,
    pieceSize: 100,
    snapDistance: 55,
    timeLimit: 60,
    maxTries: 6,
  },
  high: {
    label: '🦅 困难',
    shapeCount: 6,
    piecesRotated: true,
    slotSize: 100,
    pieceSize: 90,
    snapDistance: 35,
    timeLimit: 40,
    maxTries: 4,
  },
}

const SLOT_POSITIONS: Record<number, Array<{ x: number; y: number }>> = {
  3: [
    { x: 0.24, y: 0.27 },
    { x: 0.5, y: 0.27 },
    { x: 0.76, y: 0.27 },
  ],
  4: [
    { x: 0.18, y: 0.28 },
    { x: 0.39, y: 0.28 },
    { x: 0.61, y: 0.28 },
    { x: 0.82, y: 0.28 },
  ],
  6: [
    { x: 0.22, y: 0.24 },
    { x: 0.5, y: 0.24 },
    { x: 0.78, y: 0.24 },
    { x: 0.22, y: 0.43 },
    { x: 0.5, y: 0.43 },
    { x: 0.78, y: 0.43 },
  ],
}

const PIECE_POSITIONS: Record<number, Array<{ x: number; y: number }>> = {
  3: [
    { x: 0.24, y: 0.79 },
    { x: 0.5, y: 0.79 },
    { x: 0.76, y: 0.79 },
  ],
  4: [
    { x: 0.18, y: 0.79 },
    { x: 0.39, y: 0.79 },
    { x: 0.61, y: 0.79 },
    { x: 0.82, y: 0.79 },
  ],
  6: [
    { x: 0.11, y: 0.8 },
    { x: 0.27, y: 0.8 },
    { x: 0.43, y: 0.8 },
    { x: 0.59, y: 0.8 },
    { x: 0.75, y: 0.8 },
    { x: 0.89, y: 0.8 },
  ],
}

export function sanitizeWoodBlockDifficulty(
  value: unknown,
  fallback: WoodBlockDifficultyId = 'mid',
): WoodBlockDifficultyId {
  return typeof value === 'string' && value in WOOD_BLOCK_DIFFICULTIES
    ? value as WoodBlockDifficultyId
    : fallback
}

export function getWoodBlockDifficultyLabel(difficulty: WoodBlockDifficultyId): string {
  return WOOD_BLOCK_DIFFICULTIES[difficulty].label
}

export function getWoodBlockShape(shapeId: WoodBlockShapeId): WoodBlockShapeDefinition {
  const shape = WOOD_BLOCK_SHAPES.find((item) => item.id === shapeId)
  if (!shape) {
    throw new Error(`Unknown wood block shape: ${shapeId}`)
  }
  return shape
}

export function renderWoodBlockShapeSvg(
  shapeId: WoodBlockShapeId,
  variant: 'piece' | 'slot',
  color?: string,
): string {
  const shape = getWoodBlockShape(shapeId)
  const strokeAttrs = variant === 'slot'
    ? 'stroke="#bba880" stroke-width="3" stroke-dasharray="6 4" stroke-linejoin="round" stroke-linecap="round"'
    : ''
  const fill = variant === 'slot' ? 'none' : (color || 'rgba(255,255,255,0.92)')

  return `<svg viewBox="${SVG_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shape.svgPath
    .replace('FILL', fill)
    .replace('STROKE_ATTRS', strokeAttrs)}</svg>`
}

export function shuffleWoodBlockShapes<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = copy[index]
    const swapTarget = copy[swapIndex]
    if (current === undefined || swapTarget === undefined) {
      continue
    }
    copy[index] = swapTarget
    copy[swapIndex] = current
  }
  return copy
}

function getRequiredLayoutPositions(
  positions: Partial<Record<number, Array<{ x: number; y: number }>>>,
  count: number,
  label: string,
) {
  const resolved = positions[count]
  if (!resolved) {
    throw new Error(`Missing ${label} layout for wood block count: ${count}`)
  }
  return resolved
}

export function createWoodBlockLayout(
  difficulty: WoodBlockDifficultyId,
  random: () => number = Math.random,
): {
  difficulty: WoodBlockDifficultyConfig
  slots: WoodBlockSlotLayout[]
  pieces: WoodBlockPieceLayout[]
} {
  const config = WOOD_BLOCK_DIFFICULTIES[difficulty]
  const shapes = shuffleWoodBlockShapes(WOOD_BLOCK_SHAPES.slice(0, config.shapeCount), random)
  const slotPositions = getRequiredLayoutPositions(SLOT_POSITIONS, config.shapeCount, 'slot')
  const piecePositions = shuffleWoodBlockShapes(
    getRequiredLayoutPositions(PIECE_POSITIONS, config.shapeCount, 'piece'),
    random,
  )

  const slots = shapes.map((shape, index) => {
    const slotPosition = slotPositions[index]
    if (!slotPosition) {
      throw new Error(`Missing slot position at index ${index} for difficulty ${difficulty}`)
    }

    return {
      id: shape.id,
      label: shape.label,
      color: shape.color,
      size: config.slotSize,
      x: slotPosition.x,
      y: slotPosition.y,
    }
  })

  const pieces = shapes.map((shape, index) => {
    const rotation = config.piecesRotated ? Math.floor(random() * 4) * 90 : 0
    const home = piecePositions[index]
    if (!home) {
      throw new Error(`Missing piece home position at index ${index} for difficulty ${difficulty}`)
    }
    return {
      id: shape.id,
      label: shape.label,
      color: shape.color,
      size: config.pieceSize,
      x: home.x,
      y: home.y,
      homeX: home.x,
      homeY: home.y,
      rotation,
      homeRotation: rotation,
    }
  })

  return {
    difficulty: config,
    slots,
    pieces,
  }
}

export function distanceToSlotPx(
  piece: { x: number; y: number },
  slot: { x: number; y: number },
  stageSize: StageSize,
): number {
  return Math.hypot(
    (piece.x - slot.x) * Math.max(stageSize.width, 1),
    (piece.y - slot.y) * Math.max(stageSize.height, 1),
  )
}

export function isWoodBlockWithinSnapDistance(
  piece: { x: number; y: number },
  slot: { x: number; y: number },
  stageSize: StageSize,
  snapDistance: number,
): boolean {
  return distanceToSlotPx(piece, slot, stageSize) <= snapDistance
}

export function isWoodBlockMatch(pieceId: WoodBlockShapeId, slotId: WoodBlockShapeId) {
  return pieceId === slotId
}

export function findNearestWoodBlockPiece<TPiece extends {
  x: number
  y: number
  placed?: boolean
  animating?: boolean
}>(
  point: { x: number; y: number },
  pieces: readonly TPiece[],
  stageSize: StageSize,
  thresholdPx: number,
): TPiece | null {
  return pieces
    .filter((piece) => !piece.placed && !piece.animating)
    .map((piece) => ({
      piece,
      distance: Math.hypot(
        (point.x - piece.x) * Math.max(stageSize.width, 1),
        (point.y - piece.y) * Math.max(stageSize.height, 1),
      ),
    }))
    .filter((entry) => entry.distance <= thresholdPx)
    .sort((left, right) => left.distance - right.distance)[0]?.piece || null
}

export function resolveWoodBlockDropOutcome<TSlot extends WoodBlockNearestTarget>(
  piece: { id: WoodBlockShapeId; x: number; y: number },
  slots: readonly TSlot[],
  stageSize: StageSize,
  snapDistance: number,
): WoodBlockDropOutcome<TSlot> {
  const nearestSlotEntry = slots
    .map((slot) => ({
      slot,
      distance: distanceToSlotPx(piece, slot, stageSize),
    }))
    .sort((left, right) => left.distance - right.distance)[0]

  if (!nearestSlotEntry) {
    return { type: 'return' }
  }

  const { slot } = nearestSlotEntry
  if (!isWoodBlockWithinSnapDistance(piece, slot, stageSize, snapDistance)) {
    return { type: 'return' }
  }

  if (isWoodBlockMatch(piece.id, slot.id)) {
    return { type: 'match', slot }
  }

  return { type: 'miss', slot }
}

export function summarizeWoodBlockSession(
  input: WoodBlockSessionSummaryInput,
): WoodBlockSessionSummary {
  const endedAt = input.endedAt ?? Date.now()
  const durationSeconds = Math.max(1, Math.round((endedAt - input.startedAt) / 1000))
  const totalTrials = Math.max(input.matchedCount + input.failedAttempts, input.matchedCount)
  const correctTrials = input.matchedCount
  const accuracy = totalTrials > 0 ? correctTrials / totalTrials : 0
  const avgResponseTime = totalTrials > 0 ? (durationSeconds * 1000) / totalTrials : durationSeconds * 1000
  const omissionErrors = Math.max(0, input.shapeCount - input.matchedCount)
  const commissionErrors = input.failedAttempts
  const completionScore = Math.round((input.matchedCount / Math.max(1, input.shapeCount)) * 100)
  const impulsivityScore = Math.min(100, commissionErrors * 12)

  return {
    durationSeconds,
    totalTrials,
    correctTrials,
    accuracy,
    avgResponseTime,
    omissionErrors,
    commissionErrors,
    completionScore,
    impulsivityScore,
  }
}
