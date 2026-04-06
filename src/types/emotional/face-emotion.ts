/**
 * Face emotion detection types for the "表情能量球" mini-game.
 *
 * Based on MediaPipe FaceLandmarker blendshapes output,
 * with game-specific emotion scoring and calibration.
 */

// ---------------------------------------------------------------------------
// MediaPipe raw output
// ---------------------------------------------------------------------------

/** A single normalized face landmark point (0–1 range). */
export interface FaceLandmarkPoint {
  x: number
  y: number
  z: number
}

/** Key landmark indices used by the visual overlay. */
export const FACE_LANDMARK_INDICES = {
  /** Left mouth corner */
  mouthLeft: 61,
  /** Right mouth corner */
  mouthRight: 291,
  /** Upper lip center */
  upperLipCenter: 13,
  /** Lower lip center */
  lowerLipCenter: 14,
  /** Left inner eyebrow */
  leftInnerBrow: 107,
  /** Right inner eyebrow */
  rightInnerBrow: 336,
  /** Nose tip */
  noseTip: 1,
  /** Left eye outer */
  leftEyeOuter: 33,
  /** Right eye outer */
  rightEyeOuter: 263,
  /** Chin */
  chin: 152,
  /** Forehead center (approximate) */
  foreheadCenter: 10,
} as const

/**
 * Named blendshape categories from MediaPipe FaceLandmarker.
 * Only the ones we actually use for emotion scoring.
 */
export interface BlendshapeScores {
  mouthSmileLeft: number
  mouthSmileRight: number
  jawOpen: number
  eyeWideLeft: number
  eyeWideRight: number
  browDownLeft: number
  browDownRight: number
  browInnerUp: number
  mouthOpen: number
  eyeSquintLeft: number
  eyeSquintRight: number
  noseSneerLeft: number
  noseSneerRight: number
  mouthFrownLeft: number
  mouthFrownRight: number
  cheekPuff: number
  cheekSquintLeft: number
  cheekSquintRight: number
  mouthPucker: number
  mouthFunnel: number
  eyeBlinkLeft: number
  eyeBlinkRight: number
}

// ---------------------------------------------------------------------------
// Game-level types
// ---------------------------------------------------------------------------

export type EmotionType = 'Happy' | 'Surprised' | 'Angry' | 'Neutral'

export type AppState = 'CALIBRATION' | 'PLAYING' | 'RESTING'

/** Real-time emotion scores (0–1) derived from blendshapes. */
export interface EmotionScores {
  Happy: number
  Surprised: number
  Angry: number
  Neutral: number
}

/** Calibration baseline captured during the 3-second rest phase. */
export interface EmotionBaseline {
  blendshapes: Partial<BlendshapeScores>
  capturedAt: number
  sampleCount: number
}

/** A single frame result from the face detector. */
export interface FaceDetectionFrame {
  landmarks: FaceLandmarkPoint[]
  blendshapes: BlendshapeScores
  scores: EmotionScores
  dominantEmotion: EmotionType
  timestamp: number
}

// ---------------------------------------------------------------------------
// Composable configuration
// ---------------------------------------------------------------------------

export interface EmotionDetectorOptions {
  /** Path to the local face_landmarker.task model file. */
  modelAssetPath?: string
  /** Path to the MediaPipe WASM files. */
  wasmBasePath?: string
  /** Delegate: 'GPU' (default) or 'CPU'. */
  delegate?: 'GPU' | 'CPU'
  /** Smoothing factor (0–1) for score interpolation. Higher = smoother. Default 0.35 */
  smoothingFactor?: number
  /** Minimum confidence to accept a face detection. Default 0.5 */
  minFaceDetectionConfidence?: number
  /** How many calibration frames to collect. Default 30 (~3s at 10fps) */
  calibrationFrames?: number
}

/** The shape returned by useEmotionDetector. */
export interface EmotionDetectorReturn {
  /** Whether the detector is initialized and ready. */
  isReady: import('vue').Ref<boolean>
  /** Whether a face is currently detected in the frame. */
  faceDetected: import('vue').Ref<boolean>
  /** Initialization error message, if any. */
  initError: import('vue').Ref<string | null>
  /** Real-time emotion scores. */
  scores: import('vue').Ref<EmotionScores>
  /** The current dominant emotion. */
  dominantEmotion: import('vue').Ref<EmotionType>
  /** Latest face landmarks for overlay rendering. */
  landmarks: import('vue').Ref<FaceLandmarkPoint[]>
  /** Latest raw blendshapes. */
  blendshapes: import('vue').Ref<BlendshapeScores | null>
  /** Current app state. */
  appState: import('vue').Ref<AppState>
  /** Whether baseline calibration is in progress. */
  isCalibrating: import('vue').Ref<boolean>
  /** Calibration progress (0–1). */
  calibrationProgress: import('vue').Ref<number>
  /** The captured baseline, if any. */
  baseline: import('vue').Ref<EmotionBaseline | null>

  /** Initialize detector and start processing from the given video element. */
  initialize: (videoElement: HTMLVideoElement) => Promise<void>
  /** Start the 3-second baseline calibration. */
  startCalibration: () => Promise<void>
  /** Start playing the game (detection continues). */
  startPlaying: () => void
  /** Pause detection loop. */
  pause: () => void
  /** Resume detection loop. */
  resume: () => void
  /** Tear down detector and release all resources. */
  dispose: () => void
}
