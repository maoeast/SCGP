export interface HandPoint {
  x: number
  y: number
  z?: number
}

export interface StageSize {
  width: number
  height: number
}

export interface StagePoint {
  x: number
  y: number
}

export interface NormalizedRect {
  left: number
  right: number
  top: number
  bottom: number
}

export type HandPose = 'open' | 'fist' | 'pinch' | 'unknown'

export interface HandPoseAnalysis {
  averageDistance: number
  confidence: number
  openness: number
  pinchDistance: number
  pose: HandPose
}

const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_TIP = 12
const RING_TIP = 16
const PINKY_TIP = 20
const PALM_CENTER = 9
const FIST_REFERENCE = 0.095
const OPEN_REFERENCE = 0.215

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function distance2d(a: HandPoint, b: HandPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function isPinching(landmarks: HandPoint[], threshold = 0.055): boolean {
  const thumb = landmarks[THUMB_TIP]
  const index = landmarks[INDEX_TIP]
  if (!thumb || !index) {
    return false
  }

  return distance2d(thumb, index) <= threshold
}

export function analyzeHandPose(landmarks: HandPoint[]): HandPoseAnalysis {
  if (landmarks.length < 21) {
    return {
      averageDistance: 0,
      confidence: 0,
      openness: 0,
      pinchDistance: Number.POSITIVE_INFINITY,
      pose: 'unknown',
    }
  }

  const palm = landmarks[PALM_CENTER]
  const thumb = landmarks[THUMB_TIP]
  const index = landmarks[INDEX_TIP]
  if (!palm) {
    return {
      averageDistance: 0,
      confidence: 0,
      openness: 0,
      pinchDistance: Number.POSITIVE_INFINITY,
      pose: 'unknown',
    }
  }

  const fingertipIndexes = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
  const distances = fingertipIndexes
    .map((index) => landmarks[index])
    .filter((point): point is HandPoint => Boolean(point))
    .map((point) => distance2d(point, palm))

  if (distances.length !== fingertipIndexes.length) {
    return {
      averageDistance: 0,
      confidence: 0,
      openness: 0,
      pinchDistance: Number.POSITIVE_INFINITY,
      pose: 'unknown',
    }
  }

  const averageDistance = distances.reduce((sum, value) => sum + value, 0) / distances.length
  const pinchDistance = thumb && index ? distance2d(thumb, index) : Number.POSITIVE_INFINITY

  if (pinchDistance <= 0.055) {
    return {
      averageDistance,
      confidence: clamp01(1 - pinchDistance / 0.055),
      openness: clamp01((averageDistance - FIST_REFERENCE) / (OPEN_REFERENCE - FIST_REFERENCE)),
      pinchDistance,
      pose: 'pinch',
    }
  }

  const openness = clamp01((averageDistance - FIST_REFERENCE) / (OPEN_REFERENCE - FIST_REFERENCE))
  const pose = openness >= 0.5 ? 'open' : 'fist'
  const confidence = clamp01(Math.abs(openness - 0.5) * 2)

  return {
    averageDistance,
    confidence,
    openness,
    pinchDistance,
    pose: confidence < 0.04 ? 'unknown' : pose,
  }
}

export function classifyHandPose(landmarks: HandPoint[]): HandPose {
  return analyzeHandPose(landmarks).pose
}

export function detectDownwardStrike(
  previous: StagePoint | null,
  current: StagePoint | null,
  target: NormalizedRect,
  minDeltaY = 0.08,
): boolean {
  if (!previous || !current) {
    return false
  }

  const crossesTop = previous.y < target.top && current.y >= target.top
  const landsInsideX = current.x >= target.left && current.x <= target.right
  const landsInsideY = current.y >= target.top && current.y <= target.bottom
  return crossesTop && landsInsideX && landsInsideY && current.y - previous.y >= minDeltaY
}

export function mapLandmarkToStagePoint(
  point: HandPoint,
  size: StageSize,
  options: { mirror?: boolean } = { mirror: true },
): StagePoint {
  const x = (options.mirror === false ? point.x : 1 - point.x) * size.width
  return {
    x: Math.round(x),
    y: Math.round(point.y * size.height),
  }
}

export function mapLandmarkToNormalizedStagePoint(
  point: HandPoint,
  options: { mirror?: boolean } = { mirror: true },
): StagePoint {
  return {
    x: options.mirror === false ? point.x : 1 - point.x,
    y: point.y,
  }
}

export function normalizeStagePoint(point: StagePoint, size: StageSize): StagePoint {
  return {
    x: size.width > 0 ? point.x / size.width : 0,
    y: size.height > 0 ? point.y / size.height : 0,
  }
}

export function findRectHit(point: StagePoint, rects: NormalizedRect[]): number {
  return rects.findIndex((rect) => (
    point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom
  ))
}

export function getPrimaryFingerPoint(landmarks: HandPoint[]): HandPoint | null {
  return landmarks[INDEX_TIP] || null
}

export function getCollisionFingerPoints(
  landmarks: HandPoint[],
  indexes: number[] = [INDEX_TIP, MIDDLE_TIP],
): HandPoint[] {
  return indexes
    .map((index) => landmarks[index])
    .filter((point): point is HandPoint => Boolean(point))
}
