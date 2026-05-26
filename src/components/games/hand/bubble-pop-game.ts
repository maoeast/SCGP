import { TaskID, type GameSessionData } from '@/types/games'
import type { StagePoint, StageSize } from '@/utils/hand-game-gestures'

export type BubblePopModeId = 'free' | 'color'
export type BubblePopDifficultyId = 'easy' | 'normal' | 'hard'
export type BubblePopColorId = 'red' | 'yellow' | 'green' | 'blue' | 'pink' | 'orange'
export type BubblePopFinishReason = 'timeout' | 'goal'

export interface BubblePopColorDefinition {
  id: BubblePopColorId
  hex: string
  name: string
}

export interface BubblePopDifficultyConfig {
  id: BubblePopDifficultyId
  label: string
  bubbleMinR: number
  bubbleMaxR: number
  maxCount: number
  riseSpeed: number
  riseVariance: number
  spawnInterval: number
  colorCount: number
  rotationEnabled: boolean
  splitOnPop: boolean
}

export interface BubblePopBubble {
  id: number
  x: number
  y: number
  radius: number
  vx: number
  vy: number
  wobble: number
  wobbleSpeed: number
  colorId: BubblePopColorId
  colorHex: string
  alpha: number
  popped: boolean
  rotation: number
  rotationSpeed: number
  splitDepth: number
  shakeUntil: number
}

export interface BubblePopRing {
  id: number
  x: number
  y: number
  radius: number
  maxRadius: number
  color: string
  life: number
}

export interface BubblePopParticle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
}

export interface BubblePopFloatText {
  id: number
  x: number
  y: number
  text: string
  color: string
  life: number
  vy: number
}

export interface BubblePopComboBurst {
  id: number
  x: number
  y: number
  text: string
  color: string
  expiresAt: number
}

export interface BubblePopContactResult {
  bubbleId: number
  bubbleColorId: BubblePopColorId
  isCorrect: boolean
  scoreDelta: number
}

export interface BubblePopApplyResult {
  hits: BubblePopContactResult[]
}

export interface BubblePopState {
  mode: BubblePopModeId
  difficulty: BubblePopDifficultyId
  stageSize: StageSize
  startedAt: number
  lastUpdateAt: number
  lastSpawnAt: number
  lastSuccessfulHitAt: number
  score: number
  combo: number
  maxCombo: number
  correctHits: number
  wrongHits: number
  poppedCount: number
  targetColorId: BubblePopColorId | null
  targetProgress: number
  finishReason: BubblePopFinishReason | null
  finishedAt: number | null
  isFinished: boolean
  bubbles: BubblePopBubble[]
  rings: BubblePopRing[]
  particles: BubblePopParticle[]
  floatTexts: BubblePopFloatText[]
  comboBursts: BubblePopComboBurst[]
}

interface CreateBubblePopStateOptions {
  mode?: BubblePopModeId
  difficulty?: BubblePopDifficultyId
  stageSize?: StageSize
  now?: number
  random?: () => number
}

interface AdvanceBubblePopStateOptions {
  now: number
  stageSize?: StageSize
  random?: () => number
}

interface SummarizeBubblePopSessionOptions {
  taskId?: TaskID
  studentId: number
  handTrackingUsed: boolean
  pointerFallbackUsed: boolean
}

const REFERENCE_STAGE_WIDTH = 1920
const DEFAULT_STAGE_SIZE: StageSize = { width: 1280, height: 720 }
const DEFAULT_DURATION_MS = 60_000
const COLOR_MODE_GOAL = 20
const TARGET_SWITCH_BATCH = 5
const COMBO_RESET_MS = 2500
const COLLISION_SCALE = 0.88
const SHAKE_DURATION_MS = 420
const BURST_DURATION_MS = 800

const COMBO_BURST_RULES = [
  { combo: 10, text: '传说级！', color: '#9C27B0' },
  { combo: 8, text: 'x8 无敌！', color: '#E91E63' },
  { combo: 5, text: 'x5 超棒！', color: '#FF5722' },
  { combo: 3, text: 'x3 连击！', color: '#FF9800' },
] as const

export const BUBBLE_POP_COLORS: readonly BubblePopColorDefinition[] = [
  { id: 'red', hex: '#FF6B6B', name: '红色' },
  { id: 'yellow', hex: '#FFD93D', name: '黄色' },
  { id: 'green', hex: '#6BCB77', name: '绿色' },
  { id: 'blue', hex: '#4D96FF', name: '蓝色' },
  { id: 'pink', hex: '#FF9FF3', name: '粉色' },
  { id: 'orange', hex: '#FFA552', name: '橙色' },
] as const

export const BUBBLE_POP_DIFFICULTIES: Record<BubblePopDifficultyId, BubblePopDifficultyConfig> = {
  easy: {
    id: 'easy',
    label: '🐣 简单',
    bubbleMinR: 38,
    bubbleMaxR: 58,
    maxCount: 8,
    riseSpeed: 0.35,
    riseVariance: 0.2,
    spawnInterval: 1500,
    colorCount: 3,
    rotationEnabled: false,
    splitOnPop: false,
  },
  normal: {
    id: 'normal',
    label: '🐥 普通',
    bubbleMinR: 28,
    bubbleMaxR: 46,
    maxCount: 12,
    riseSpeed: 0.6,
    riseVariance: 0.35,
    spawnInterval: 900,
    colorCount: 4,
    rotationEnabled: false,
    splitOnPop: false,
  },
  hard: {
    id: 'hard',
    label: '🦅 困难',
    bubbleMinR: 20,
    bubbleMaxR: 36,
    maxCount: 18,
    riseSpeed: 0.9,
    riseVariance: 0.5,
    spawnInterval: 550,
    colorCount: 6,
    rotationEnabled: true,
    splitOnPop: true,
  },
}

let bubbleId = 0
let effectId = 0

function scaleByStage(stageSize: StageSize) {
  return Math.max(0.45, stageSize.width / REFERENCE_STAGE_WIDTH)
}

function currentDifficulty(state: BubblePopState) {
  return BUBBLE_POP_DIFFICULTIES[state.difficulty]
}

function availableColorsForDifficulty(difficulty: BubblePopDifficultyId) {
  const count = BUBBLE_POP_DIFFICULTIES[difficulty].colorCount
  return BUBBLE_POP_COLORS.slice(0, count)
}

function randomFrom<T>(items: readonly T[], random: () => number) {
  if (items.length === 0) {
    throw new Error('No items available')
  }

  const index = Math.min(items.length - 1, Math.floor(random() * items.length))
  return items[index]!
}

function actualRadiusPx(radius: number, stageSize: StageSize) {
  return radius * scaleByStage(stageSize)
}

function isBubbleOffScreen(bubble: BubblePopBubble, stageSize: StageSize) {
  const radiusPx = actualRadiusPx(bubble.radius, stageSize)
  return bubble.y + radiusPx / Math.max(1, stageSize.height) < -20 / Math.max(1, stageSize.height)
}

function bubbleDistancePx(point: StagePoint, bubble: BubblePopBubble, stageSize: StageSize) {
  return Math.hypot(
    (point.x - bubble.x) * Math.max(1, stageSize.width),
    (point.y - bubble.y) * Math.max(1, stageSize.height),
  )
}

function bubbleCollisionThresholdPx(bubble: BubblePopBubble, stageSize: StageSize) {
  return actualRadiusPx(bubble.radius, stageSize) * COLLISION_SCALE
}

function cleanupEffects(state: BubblePopState, now: number) {
  state.rings = state.rings.filter((ring) => ring.life > 0)
  state.particles = state.particles.filter((particle) => particle.life > 0)
  state.floatTexts = state.floatTexts.filter((text) => text.life > 0)
  state.comboBursts = state.comboBursts.filter((burst) => burst.expiresAt > now)
}

function resetCounters(state: BubblePopState, now: number, random: () => number) {
  state.startedAt = now
  state.lastUpdateAt = now
  state.lastSpawnAt = now - currentDifficulty(state).spawnInterval
  state.lastSuccessfulHitAt = now
  state.score = 0
  state.combo = 1
  state.maxCombo = 1
  state.correctHits = 0
  state.wrongHits = 0
  state.poppedCount = 0
  state.finishReason = null
  state.finishedAt = null
  state.isFinished = false
  state.bubbles = []
  state.rings = []
  state.particles = []
  state.floatTexts = []
  state.comboBursts = []
  state.targetProgress = 0
  state.targetColorId = state.mode === 'color'
    ? randomFrom(availableColorsForDifficulty(state.difficulty), random).id
    : null
}

export function sanitizeBubblePopMode(value: unknown, fallback: BubblePopModeId = 'free'): BubblePopModeId {
  return value === 'free' || value === 'color' ? value : fallback
}

export function sanitizeBubblePopDifficulty(
  value: unknown,
  fallback: BubblePopDifficultyId = 'normal',
): BubblePopDifficultyId {
  return value === 'easy' || value === 'normal' || value === 'hard' ? value : fallback
}

export function createBubblePopState(options: CreateBubblePopStateOptions = {}): BubblePopState {
  const random = options.random || Math.random
  const now = options.now ?? 0
  const state: BubblePopState = {
    mode: sanitizeBubblePopMode(options.mode),
    difficulty: sanitizeBubblePopDifficulty(options.difficulty),
    stageSize: options.stageSize || { ...DEFAULT_STAGE_SIZE },
    startedAt: now,
    lastUpdateAt: now,
    lastSpawnAt: now,
    lastSuccessfulHitAt: now,
    score: 0,
    combo: 1,
    maxCombo: 1,
    correctHits: 0,
    wrongHits: 0,
    poppedCount: 0,
    targetColorId: null,
    targetProgress: 0,
    finishReason: null,
    finishedAt: null,
    isFinished: false,
    bubbles: [],
    rings: [],
    particles: [],
    floatTexts: [],
    comboBursts: [],
  }

  resetCounters(state, now, random)
  return state
}

export function createBubblePopBubble(
  state: BubblePopState,
  stageSize: StageSize = state.stageSize,
  random: () => number = Math.random,
): BubblePopBubble {
  const difficulty = currentDifficulty(state)
  const scale = scaleByStage(stageSize)
  const radius = difficulty.bubbleMinR + random() * (difficulty.bubbleMaxR - difficulty.bubbleMinR)
  const radiusPx = radius * scale
  const safeX = radiusPx / Math.max(1, stageSize.width)
  const color = randomFrom(availableColorsForDifficulty(state.difficulty), random)

  return {
    id: bubbleId += 1,
    x: safeX + random() * Math.max(0.05, 1 - safeX * 2),
    y: 1 + radiusPx / Math.max(1, stageSize.height),
    radius,
    vx: (random() - 0.5) * 0.5,
    vy: difficulty.riseSpeed + random() * difficulty.riseVariance,
    wobble: random() * Math.PI * 2,
    wobbleSpeed: 0.018 + random() * 0.015,
    colorId: color.id,
    colorHex: color.hex,
    alpha: 0,
    popped: false,
    rotation: random() * Math.PI * 2,
    rotationSpeed: difficulty.rotationEnabled ? (random() - 0.5) * 0.06 : 0,
    splitDepth: 0,
    shakeUntil: 0,
  }
}

function createSplitBubble(
  source: BubblePopBubble,
  state: BubblePopState,
  stageSize: StageSize,
  random: () => number,
  direction: -1 | 1,
): BubblePopBubble {
  const split = createBubblePopBubble(state, stageSize, random)
  split.radius = 14 + random() * 8
  split.x = Math.min(0.96, Math.max(0.04, source.x + direction * 0.028))
  split.y = source.y
  split.colorId = source.colorId
  split.colorHex = source.colorHex
  split.alpha = 1
  split.vx = direction * (0.18 + random() * 0.18)
  split.vy = currentDifficulty(state).riseSpeed + 0.2 + random() * 0.3
  split.splitDepth = source.splitDepth + 1
  return split
}

function spawnPopEffects(
  state: BubblePopState,
  bubble: BubblePopBubble,
  now: number,
  random: () => number,
  isCorrect: boolean,
  scoreDelta: number,
) {
  const color = isCorrect ? bubble.colorHex : '#9CA3AF'

  for (let index = 0; index < 3; index += 1) {
    state.rings.push({
      id: effectId += 1,
      x: bubble.x,
      y: bubble.y,
      radius: bubble.radius * (0.9 + index * 0.08),
      maxRadius: bubble.radius * 2.5,
      color,
      life: 1 - index * 0.14,
    })
  }

  const particleCount = 24
  for (let index = 0; index < particleCount; index += 1) {
    const angle = ((Math.PI * 2) / particleCount) * index + random() * 0.3
    const speed = 3 + random() * 5
    state.particles.push({
      id: effectId += 1,
      x: bubble.x,
      y: bubble.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + random() * 6,
      color,
      life: 1,
    })
  }

  state.floatTexts.push({
    id: effectId += 1,
    x: bubble.x,
    y: bubble.y,
    text: scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`,
    color: scoreDelta >= 0 ? '#16A34A' : '#EF4444',
    life: 1,
    vy: -2.5,
  })

  const comboLevel = Math.max(1, state.combo - 1)
  const comboRule = COMBO_BURST_RULES.find((rule) => comboLevel >= rule.combo)
  if (comboRule) {
    state.comboBursts.push({
      id: effectId += 1,
      x: bubble.x,
      y: bubble.y,
      text: comboRule.text,
      color: comboRule.color,
      expiresAt: now + BURST_DURATION_MS,
    })
  }
}

function selectNextTargetColor(state: BubblePopState, random: () => number) {
  const colors = availableColorsForDifficulty(state.difficulty)
    .filter((color) => color.id !== state.targetColorId)
  state.targetColorId = randomFrom(colors.length > 0 ? colors : availableColorsForDifficulty(state.difficulty), random).id
  state.targetProgress = 0
}

export function advanceBubblePopState(state: BubblePopState, options: AdvanceBubblePopStateOptions) {
  const random = options.random || Math.random
  const stageSize = options.stageSize || state.stageSize
  const now = options.now
  state.stageSize = stageSize

  const deltaMs = Math.max(0, now - state.lastUpdateAt)
  const deltaFrames = deltaMs / 16.6667
  const scale = scaleByStage(stageSize)

  if (state.isFinished) {
    state.lastUpdateAt = now
    cleanupEffects(state, now)
    return
  }

  if (state.combo > 1 && now - state.lastSuccessfulHitAt >= COMBO_RESET_MS) {
    state.combo = 1
  }

  const difficulty = currentDifficulty(state)
  while (now - state.lastSpawnAt >= difficulty.spawnInterval && state.bubbles.filter((bubble) => !bubble.popped).length < difficulty.maxCount) {
    state.bubbles.push(createBubblePopBubble(state, stageSize, random))
    state.lastSpawnAt += difficulty.spawnInterval
  }

  state.bubbles.forEach((bubble) => {
    if (bubble.popped) {
      return
    }

    bubble.wobble += bubble.wobbleSpeed * deltaFrames
    bubble.rotation += bubble.rotationSpeed * deltaFrames
    bubble.x += ((bubble.vx + Math.sin(bubble.wobble) * 0.45) * scale * deltaFrames) / Math.max(1, stageSize.width)
    bubble.y -= (bubble.vy * scale * deltaFrames) / Math.max(1, stageSize.height)
    bubble.alpha = Math.min(1, bubble.alpha + 0.04 * deltaFrames)

    const radiusPx = actualRadiusPx(bubble.radius, stageSize)
    const minX = radiusPx / Math.max(1, stageSize.width)
    const maxX = 1 - minX
    if (bubble.x < minX) {
      bubble.x = minX
      bubble.vx = Math.abs(bubble.vx)
    } else if (bubble.x > maxX) {
      bubble.x = maxX
      bubble.vx = -Math.abs(bubble.vx)
    }
  })

  state.bubbles = state.bubbles.filter((bubble) => !bubble.popped && !isBubbleOffScreen(bubble, stageSize))

  state.rings.forEach((ring) => {
    ring.radius += 4 * deltaFrames
    ring.life -= 0.07 * deltaFrames
  })
  state.particles.forEach((particle) => {
    particle.x += (particle.vx * scale * deltaFrames) / Math.max(1, stageSize.width)
    particle.y += (particle.vy * scale * deltaFrames) / Math.max(1, stageSize.height)
    particle.vy += 0.22 * deltaFrames
    particle.life -= 0.038 * deltaFrames
  })
  state.floatTexts.forEach((text) => {
    text.y += (text.vy * scale * deltaFrames) / Math.max(1, stageSize.height)
    text.life -= 0.028 * deltaFrames
  })
  cleanupEffects(state, now)

  if (state.mode === 'free' && now - state.startedAt >= DEFAULT_DURATION_MS) {
    state.isFinished = true
    state.finishReason = 'timeout'
    state.finishedAt = now
  }

  if (state.mode === 'color' && state.correctHits >= COLOR_MODE_GOAL) {
    state.isFinished = true
    state.finishReason = 'goal'
    state.finishedAt = now
  }

  state.lastUpdateAt = now
}

function markCorrectHit(state: BubblePopState, bubble: BubblePopBubble, now: number, random: () => number) {
  bubble.popped = true
  const scoreDelta = 10 * state.combo
  state.score += scoreDelta
  state.correctHits += 1
  state.poppedCount += 1
  state.maxCombo = Math.max(state.maxCombo, state.combo)
  spawnPopEffects(state, bubble, now, random, true, scoreDelta)
  state.combo += 1
  state.lastSuccessfulHitAt = now

  if (state.mode === 'color') {
    state.targetProgress += 1
    if (state.targetProgress >= TARGET_SWITCH_BATCH) {
      selectNextTargetColor(state, random)
    }
  }

  if (currentDifficulty(state).splitOnPop && bubble.radius > 28 && bubble.splitDepth < 1) {
    state.bubbles.push(createSplitBubble(bubble, state, state.stageSize, random, -1))
    state.bubbles.push(createSplitBubble(bubble, state, state.stageSize, random, 1))
  }

  return scoreDelta
}

function markWrongHit(state: BubblePopState, bubble: BubblePopBubble, now: number, random: () => number) {
  state.wrongHits += 1
  state.score = Math.max(0, state.score - 5)
  state.combo = 1
  bubble.shakeUntil = now + SHAKE_DURATION_MS
  spawnPopEffects(state, bubble, now, random, false, -5)
}

export function applyBubblePopContacts(
  state: BubblePopState,
  points: readonly StagePoint[],
  now: number,
  random: () => number = Math.random,
): BubblePopApplyResult {
  if (state.isFinished || points.length === 0) {
    return { hits: [] }
  }

  const hits: BubblePopContactResult[] = []
  const hitBubbleIds = new Set<number>()

  for (const point of points) {
    const targetBubble = state.bubbles
      .filter((bubble) => !bubble.popped && !hitBubbleIds.has(bubble.id))
      .map((bubble) => ({
        bubble,
        distance: bubbleDistancePx(point, bubble, state.stageSize),
      }))
      .filter((entry) => entry.distance <= bubbleCollisionThresholdPx(entry.bubble, state.stageSize))
      .sort((left, right) => left.distance - right.distance)[0]?.bubble

    if (!targetBubble) {
      continue
    }

    hitBubbleIds.add(targetBubble.id)

    if (state.mode === 'color' && state.targetColorId && targetBubble.colorId !== state.targetColorId) {
      markWrongHit(state, targetBubble, now, random)
      hits.push({
        bubbleId: targetBubble.id,
        bubbleColorId: targetBubble.colorId,
        isCorrect: false,
        scoreDelta: -5,
      })
      continue
    }

    const scoreDelta = markCorrectHit(state, targetBubble, now, random)
    hits.push({
      bubbleId: targetBubble.id,
      bubbleColorId: targetBubble.colorId,
      isCorrect: true,
      scoreDelta,
    })
  }

  return { hits }
}

export function switchBubblePopMode(
  state: BubblePopState,
  mode: BubblePopModeId,
  now: number,
  random: () => number = Math.random,
) {
  state.mode = sanitizeBubblePopMode(mode)
  resetCounters(state, now, random)
}

export function switchBubblePopDifficulty(
  state: BubblePopState,
  difficulty: BubblePopDifficultyId,
  now: number,
  random: () => number = Math.random,
) {
  state.difficulty = sanitizeBubblePopDifficulty(difficulty)
  resetCounters(state, now, random)
}

export function getBubblePopDifficultyLabel(difficulty: BubblePopDifficultyId) {
  return BUBBLE_POP_DIFFICULTIES[difficulty].label
}

export function getBubblePopModeLabel(mode: BubblePopModeId) {
  return mode === 'color' ? '🎨 分类' : '🎯 自由'
}

export function getBubblePopTargetColor(state: BubblePopState) {
  if (!state.targetColorId) {
    return null
  }

  return BUBBLE_POP_COLORS.find((color) => color.id === state.targetColorId) || null
}

export function summarizeBubblePopSession(
  state: BubblePopState,
  options: SummarizeBubblePopSessionOptions,
): GameSessionData {
  const endTime = state.finishedAt ?? state.lastUpdateAt
  const durationSeconds = Math.max(1, Math.round((endTime - state.startedAt) / 1000))
  const hitTrials = state.correctHits + state.wrongHits
  const totalTrials = state.mode === 'color'
    ? Math.max(COLOR_MODE_GOAL, hitTrials)
    : Math.max(hitTrials, state.correctHits)
  const correctTrials = state.correctHits
  const accuracy = hitTrials > 0 ? correctTrials / hitTrials : 0
  const omission = state.mode === 'color'
    ? Math.max(0, COLOR_MODE_GOAL - state.correctHits)
    : 0
  const completionScore = state.mode === 'color'
    ? Math.min(100, Math.round((state.correctHits / COLOR_MODE_GOAL) * 100))
    : Math.min(100, Math.round((state.score / 500) * 100))

  return {
    taskId: options.taskId || TaskID.HAND_BUBBLE_POP,
    studentId: options.studentId,
    startTime: state.startedAt,
    endTime,
    duration: durationSeconds,
    trials: [],
    totalTrials,
    correctTrials,
    accuracy,
    avgResponseTime: hitTrials > 0 ? Math.round((durationSeconds * 1000) / hitTrials) : durationSeconds * 1000,
    errors: {
      omission,
      commission: state.wrongHits,
    },
    behavior: {
      impulsivityScore: Math.min(100, state.wrongHits * 12),
      fatigueIndex: 1,
      distractorPattern: state.mode === 'color' ? 'target_color_bubble' : 'free_bubble_pop',
    },
    handGameStats: {
      handTrackingUsed: options.handTrackingUsed,
      pointerFallbackUsed: options.pointerFallbackUsed,
      gestureEvents: hitTrials,
      completionScore,
    },
  }
}
