export interface NormalizedPoint {
  x: number
  y: number
}

export interface StageSize {
  width: number
  height: number
}

export interface TrackingSample {
  time: number
  onTarget: boolean
  distancePx: number
  pointer?: NormalizedPoint | null
  target?: NormalizedPoint
}

export interface TrackingSummary {
  timeOnTarget: number
  totalTime: number
  timeOnTargetPercent: number
  breakCount: number
  longestStreakMs: number
  followStability: number
}

export interface ResolveTrackingTargetOptions {
  elapsedMs: number
  durationMs: number
  speed?: number
  safePadding?: number
}

export interface CreateTrackingSampleInput {
  time: number
  pointer: NormalizedPoint | null
  target: NormalizedPoint
  stageSize: StageSize
  hitRadiusPx: number
}

export interface SummarizeTrackingSamplesOptions {
  sampleIntervalMs?: number
  hitRadiusPx: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toPixelPoint(point: NormalizedPoint, stageSize: StageSize) {
  return {
    x: point.x * stageSize.width,
    y: point.y * stageSize.height,
  }
}

export function resolveTrackingTarget(options: ResolveTrackingTargetOptions): NormalizedPoint {
  const safePadding = clamp(options.safePadding ?? 0.1, 0.05, 0.3)
  const durationMs = Math.max(1000, options.durationMs)
  const speed = Math.max(0.4, options.speed ?? 1)
  const progress = Math.max(0, options.elapsedMs) / durationMs
  const phase = progress * Math.PI * 2 * speed
  const amplitude = 0.5 - safePadding

  const x = 0.5 + amplitude * (0.72 * Math.sin(phase) + 0.2 * Math.sin(phase * 2.1))
  const y = 0.5 + amplitude * (0.58 * Math.cos(phase * 0.85) + 0.24 * Math.sin(phase * 1.45))

  return {
    x: clamp(x, safePadding, 1 - safePadding),
    y: clamp(y, safePadding, 1 - safePadding),
  }
}

export function createTrackingSample(input: CreateTrackingSampleInput): TrackingSample {
  if (!input.pointer) {
    return {
      time: input.time,
      onTarget: false,
      distancePx: Number.POSITIVE_INFINITY,
      pointer: null,
      target: input.target,
    }
  }

  const pointerPx = toPixelPoint(input.pointer, input.stageSize)
  const targetPx = toPixelPoint(input.target, input.stageSize)
  const distancePx = Math.hypot(pointerPx.x - targetPx.x, pointerPx.y - targetPx.y)

  return {
    time: input.time,
    onTarget: distancePx <= input.hitRadiusPx,
    distancePx,
    pointer: input.pointer,
    target: input.target,
  }
}

export function summarizeTrackingSamples(
  samples: TrackingSample[],
  options: SummarizeTrackingSamplesOptions,
): TrackingSummary {
  const sampleIntervalMs = Math.max(1, options.sampleIntervalMs ?? 100)
  const totalTime = samples.length * sampleIntervalMs
  const timeOnTarget = samples.filter((sample) => sample.onTarget).length * sampleIntervalMs

  let breakCount = 0
  let currentStreak = 0
  let longestStreakMs = 0
  let wasOnTarget = false

  for (const sample of samples) {
    if (sample.onTarget) {
      currentStreak += sampleIntervalMs
      longestStreakMs = Math.max(longestStreakMs, currentStreak)
    } else {
      if (wasOnTarget) {
        breakCount += 1
      }
      currentStreak = 0
    }
    wasOnTarget = sample.onTarget
  }

  const finiteDistances = samples
    .map((sample) => sample.distancePx)
    .filter((distance) => Number.isFinite(distance))
  const averageDistance = finiteDistances.length
    ? finiteDistances.reduce((sum, distance) => sum + distance, 0) / finiteDistances.length
    : options.hitRadiusPx * 2
  const followStability = clamp(1 - averageDistance / Math.max(1, options.hitRadiusPx * 2), 0, 1)

  return {
    timeOnTarget,
    totalTime,
    timeOnTargetPercent: totalTime > 0 ? Number((timeOnTarget / totalTime).toFixed(4)) : 0,
    breakCount,
    longestStreakMs,
    followStability: Math.round(followStability * 100),
  }
}
