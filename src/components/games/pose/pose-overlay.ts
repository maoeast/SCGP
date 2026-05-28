export interface RawPoseLandmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

export interface OverlayAnchor {
  x: number
  y: number
  z?: number
  visible: boolean
}

export interface OverlayCenter {
  x: number
  y: number
}

export interface MagicGloveOverlayModel {
  leftShoulder: OverlayAnchor | null
  rightShoulder: OverlayAnchor | null
  leftElbow: OverlayAnchor | null
  rightElbow: OverlayAnchor | null
  leftWrist: OverlayAnchor | null
  rightWrist: OverlayAnchor | null
  shoulderCenter: OverlayCenter | null
  chestCenter: OverlayCenter | null
  shoulderSpan: number
  leftIntensity: number
  rightIntensity: number
}

export const LEFT_SHOULDER_INDEX = 11
export const RIGHT_SHOULDER_INDEX = 12
export const LEFT_ELBOW_INDEX = 13
export const RIGHT_ELBOW_INDEX = 14
export const LEFT_WRIST_INDEX = 15
export const RIGHT_WRIST_INDEX = 16
export const POSE_OVERLAY_VISIBILITY_THRESHOLD = 0.6
export const MAGIC_GLOVE_REACH_NORMALIZER = 0.45

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, precision = 1000): number {
  return Math.round(value * precision) / precision
}

export function normalizeOverlayAnchor(landmark: RawPoseLandmark | undefined): OverlayAnchor | null {
  if (!landmark) {
    return null
  }

  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visible: (landmark.visibility ?? 0) >= POSE_OVERLAY_VISIBILITY_THRESHOLD,
  }
}

export function calculateMagicGloveIntensity(
  shoulder: OverlayAnchor | null,
  wrist: OverlayAnchor | null,
  normalizer = MAGIC_GLOVE_REACH_NORMALIZER,
): number {
  if (!shoulder?.visible || !wrist?.visible) {
    return 0
  }

  return roundTo(clamp((shoulder.y - wrist.y) / normalizer, 0, 1))
}

export function createMagicGloveOverlayModel(
  landmarks: RawPoseLandmark[] | undefined,
): MagicGloveOverlayModel | null {
  if (!landmarks || landmarks.length <= RIGHT_WRIST_INDEX) {
    return null
  }

  const leftShoulder = normalizeOverlayAnchor(landmarks[LEFT_SHOULDER_INDEX])
  const rightShoulder = normalizeOverlayAnchor(landmarks[RIGHT_SHOULDER_INDEX])
  const leftElbow = normalizeOverlayAnchor(landmarks[LEFT_ELBOW_INDEX])
  const rightElbow = normalizeOverlayAnchor(landmarks[RIGHT_ELBOW_INDEX])
  const leftWrist = normalizeOverlayAnchor(landmarks[LEFT_WRIST_INDEX])
  const rightWrist = normalizeOverlayAnchor(landmarks[RIGHT_WRIST_INDEX])

  let shoulderCenter: OverlayCenter | null = null
  let chestCenter: OverlayCenter | null = null
  let shoulderSpan = 0

  if (leftShoulder?.visible && rightShoulder?.visible) {
    shoulderCenter = {
      x: roundTo((leftShoulder.x + rightShoulder.x) / 2),
      y: roundTo((leftShoulder.y + rightShoulder.y) / 2),
    }
    shoulderSpan = roundTo(Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y))
    chestCenter = {
      x: shoulderCenter.x,
      y: roundTo(shoulderCenter.y + Math.max(0.055, shoulderSpan * 0.38)),
    }
  }

  return {
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftWrist,
    rightWrist,
    shoulderCenter,
    chestCenter,
    shoulderSpan,
    leftIntensity: calculateMagicGloveIntensity(leftShoulder, leftWrist),
    rightIntensity: calculateMagicGloveIntensity(rightShoulder, rightWrist),
  }
}
