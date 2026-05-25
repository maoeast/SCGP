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

const THUMB_TIP = 4
const INDEX_TIP = 8
const MIDDLE_TIP = 12
const RING_TIP = 16
const PINKY_TIP = 20
const PALM_CENTER = 9

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

export function classifyHandPose(landmarks: HandPoint[]): HandPose {
  if (landmarks.length < 21) {
    return 'unknown'
  }

  if (isPinching(landmarks)) {
    return 'pinch'
  }

  const palm = landmarks[PALM_CENTER]
  if (!palm) {
    return 'unknown'
  }

  const fingertipIndexes = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
  const distances = fingertipIndexes
    .map((index) => landmarks[index])
    .filter((point): point is HandPoint => Boolean(point))
    .map((point) => distance2d(point, palm))

  if (distances.length !== fingertipIndexes.length) {
    return 'unknown'
  }

  const averageDistance = distances.reduce((sum, value) => sum + value, 0) / distances.length

  if (averageDistance <= 0.105) {
    return 'fist'
  }

  if (averageDistance >= 0.18) {
    return 'open'
  }

  return 'unknown'
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
