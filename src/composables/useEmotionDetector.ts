import { ref, shallowRef } from 'vue'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'
import type {
  EmotionDetectorOptions,
  EmotionDetectorReturn,
  EmotionScores,
  EmotionType,
  EmotionBaseline,
  FaceDetectionFrame,
  FaceLandmarkPoint,
  BlendshapeScores,
  AppState,
} from '@/types/emotional/face-emotion'
import { FACE_LANDMARK_INDICES } from '@/types/emotional/face-emotion'

// ---------------------------------------------------------------------------
// Blendshape name → key mapping (MediaPipe category names → our interface)
// ---------------------------------------------------------------------------

const BLENDSHAPE_MAP: Record<string, keyof BlendshapeScores> = {
  'mouthSmileLeft': 'mouthSmileLeft',
  'mouthSmileRight': 'mouthSmileRight',
  'jawOpen': 'jawOpen',
  'eyeWideLeft': 'eyeWideLeft',
  'eyeWideRight': 'eyeWideRight',
  'browDownLeft': 'browDownLeft',
  'browDownRight': 'browDownRight',
  'browInnerUp': 'browInnerUp',
  'mouthOpen': 'mouthOpen',
  'eyeSquintLeft': 'eyeSquintLeft',
  'eyeSquintRight': 'eyeSquintRight',
  'noseSneerLeft': 'noseSneerLeft',
  'noseSneerRight': 'noseSneerRight',
  'mouthFrownLeft': 'mouthFrownLeft',
  'mouthFrownRight': 'mouthFrownRight',
  'cheekPuff': 'cheekPuff',
  'cheekSquintLeft': 'cheekSquintLeft',
  'cheekSquintRight': 'cheekSquintRight',
  'mouthPucker': 'mouthPucker',
  'mouthFunnel': 'mouthFunnel',
  'eyeBlinkLeft': 'eyeBlinkLeft',
  'eyeBlinkRight': 'eyeBlinkRight',
}

const EMPTY_SCORES: EmotionScores = { Happy: 0, Surprised: 0, Angry: 0, Neutral: 0 }

// ---------------------------------------------------------------------------
// Emotion scoring from blendshapes (PRD formulas)
// ---------------------------------------------------------------------------

function computeScores(blendshapes: BlendshapeScores, baseline: EmotionBaseline | null): EmotionScores {
  let smileL = blendshapes.mouthSmileLeft
  let smileR = blendshapes.mouthSmileRight
  let jawOpen = blendshapes.jawOpen
  let eyeWideL = blendshapes.eyeWideLeft
  let eyeWideR = blendshapes.eyeWideRight
  let browDownL = blendshapes.browDownLeft
  let browDownR = blendshapes.browDownRight

  // Subtract baseline so individual resting offsets don't bias scores
  if (baseline) {
    const b = baseline.blendshapes
    smileL = Math.max(0, smileL - (b.mouthSmileLeft ?? 0))
    smileR = Math.max(0, smileR - (b.mouthSmileRight ?? 0))
    jawOpen = Math.max(0, jawOpen - (b.jawOpen ?? 0))
    eyeWideL = Math.max(0, eyeWideL - (b.eyeWideLeft ?? 0))
    eyeWideR = Math.max(0, eyeWideR - (b.eyeWideRight ?? 0))
    browDownL = Math.max(0, browDownL - (b.browDownLeft ?? 0))
    browDownR = Math.max(0, browDownR - (b.browDownRight ?? 0))
  }

  const happy = (smileL + smileR) / 2
  const surprised = jawOpen * 0.6 + eyeWideL * 0.2 + eyeWideR * 0.2
  const angry = (browDownL + browDownR) / 2

  // Neutral: all primary muscle weights < 0.2
  const neutral = (happy < 0.2 && surprised < 0.2 && angry < 0.2) ? 1 : 0

  return {
    Happy: clamp01(happy),
    Surprised: clamp01(surprised),
    Angry: clamp01(angry),
    Neutral: clamp01(neutral),
  }
}

function getDominantEmotion(scores: EmotionScores): EmotionType {
  if (scores.Neutral >= 0.5) return 'Neutral'
  let max: EmotionType = 'Happy'
  let maxVal = scores.Happy
  if (scores.Surprised > maxVal) { max = 'Surprised'; maxVal = scores.Surprised }
  if (scores.Angry > maxVal) { max = 'Angry'; maxVal = scores.Angry }
  return maxVal > 0.15 ? max : 'Neutral'
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

// ---------------------------------------------------------------------------
// Extract blendshapes from MediaPipe result
// ---------------------------------------------------------------------------

function extractBlendshapes(categories: Array<{ categoryName: string; score: number }>): BlendshapeScores {
  const result: Record<string, number> = {}
  for (const cat of categories) {
    const key = BLENDSHAPE_MAP[cat.categoryName]
    if (key) {
      result[key] = cat.score
    }
  }
  // Fill defaults for any missing keys
  for (const key of Object.values(BLENDSHAPE_MAP)) {
    if (result[key] === undefined) {
      result[key] = 0
    }
  }
  return result as unknown as BlendshapeScores
}

// ---------------------------------------------------------------------------
// Smoothed score interpolation
// ---------------------------------------------------------------------------

function lerpScores(current: EmotionScores, target: EmotionScores, factor: number): EmotionScores {
  return {
    Happy: current.Happy + (target.Happy - current.Happy) * factor,
    Surprised: current.Surprised + (target.Surprised - current.Surprised) * factor,
    Angry: current.Angry + (target.Angry - current.Angry) * factor,
    Neutral: current.Neutral + (target.Neutral - current.Neutral) * factor,
  }
}

function resolveDetectorAssetUrl(assetPath: string): string {
  if (/^(https?:|file:|blob:|data:)/i.test(assetPath)) {
    return assetPath
  }

  const cleanPath = assetPath.replace(/^\/+/, '')
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  return new URL(`${normalizedBase}${cleanPath}`, window.location.href).toString()
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

function formatDetectorInitError(err: unknown): string {
  if (err instanceof Error) {
    return err.message
  }

  if (typeof Event !== 'undefined' && err instanceof Event) {
    const eventTarget = err.target as { src?: string } | null
    if (eventTarget?.src) {
      return `资源加载失败: ${eventTarget.src}`
    }

    return `资源加载失败: ${err.type || '未知事件'}`
  }

  return String(err)
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useEmotionDetector(options: EmotionDetectorOptions = {}): EmotionDetectorReturn {
  const {
    modelAssetPath: rawModelAssetPath = '/models/face_landmarker.task',
    wasmBasePath: rawWasmBasePath = '/models/wasm',
    delegate = 'GPU',
    smoothingFactor = 0.35,
    minFaceDetectionConfidence = 0.5,
    calibrationFrames = 30,
  } = options

  const modelAssetPath = resolveDetectorAssetUrl(rawModelAssetPath)
  const wasmBasePath = ensureTrailingSlash(resolveDetectorAssetUrl(rawWasmBasePath))

  // Reactive state
  const isReady = ref(false)
  const faceDetected = ref(false)
  const initError = ref<string | null>(null)
  const scores = ref<EmotionScores>({ ...EMPTY_SCORES })
  const dominantEmotion = ref<EmotionType>('Neutral')
  const landmarks = ref<FaceLandmarkPoint[]>([])
  const blendshapes = ref<BlendshapeScores | null>(null)
  const appState = ref<AppState>('CALIBRATION')
  const isCalibrating = ref(false)
  const calibrationProgress = ref(0)
  const baseline = shallowRef<EmotionBaseline | null>(null)

  // Internal state (not reactive to avoid overhead)
  let faceLandmarker: FaceLandmarker | null = null
  let videoElement: HTMLVideoElement | null = null
  let animationFrameId: number | null = null
  let lastTimestamp = -1
  let running = false
  let paused = false
  let calibrationSamples: BlendshapeScores[] = []

  // -----------------------------------------------------------------------
  // Initialize
  // -----------------------------------------------------------------------

  async function initialize(video: HTMLVideoElement): Promise<void> {
    if (faceLandmarker) {
      dispose()
    }

    videoElement = video
    initError.value = null

    try {
      const vision = await FilesetResolver.forVisionTasks(wasmBasePath)

      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate,
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
        minFaceDetectionConfidence,
      })

      isReady.value = true
      running = true
      detectLoop()
    } catch (err) {
      const message = formatDetectorInitError(err)
      initError.value = `MediaPipe 初始化失败: ${message}`
      console.error('[useEmotionDetector] Init failed:', err)
    }
  }

  // -----------------------------------------------------------------------
  // Detection loop
  // -----------------------------------------------------------------------

  function detectLoop(): void {
    if (!running || !faceLandmarker || !videoElement || paused) {
      if (running) {
        animationFrameId = requestAnimationFrame(detectLoop)
      }
      return
    }

    const now = performance.now()
    // MediaPipe requires monotonically increasing timestamps
    if (now <= lastTimestamp) {
      animationFrameId = requestAnimationFrame(detectLoop)
      return
    }
    lastTimestamp = now

    try {
      if (videoElement.readyState < 2) {
        animationFrameId = requestAnimationFrame(detectLoop)
        return
      }

      const result = faceLandmarker.detectForVideo(videoElement, now)

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        faceDetected.value = true
        landmarks.value = result.faceLandmarks[0] as FaceLandmarkPoint[]

        if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
          const firstBlendshape = result.faceBlendshapes[0]
          const categories = firstBlendshape?.categories?.map((category) => ({
            categoryName: category.categoryName ?? category.displayName,
            score: category.score,
          }))

          if (!categories || categories.length === 0) {
            animationFrameId = requestAnimationFrame(detectLoop)
            return
          }

          const rawBlendshapes = extractBlendshapes(categories)
          blendshapes.value = rawBlendshapes

          // Handle calibration frame collection
          if (isCalibrating.value) {
            calibrationSamples.push(rawBlendshapes)
            calibrationProgress.value = calibrationSamples.length / calibrationFrames

            if (calibrationSamples.length >= calibrationFrames) {
              finalizeCalibration()
            }
          }

          // Compute emotion scores
          const rawScores = computeScores(rawBlendshapes, baseline.value)
          scores.value = lerpScores(scores.value, rawScores, smoothingFactor)
          dominantEmotion.value = getDominantEmotion(scores.value)
        }
      } else {
        faceDetected.value = false
        // Smoothly decay scores when no face
        const decayed = lerpScores(scores.value, EMPTY_SCORES, 0.15)
        scores.value = decayed
        dominantEmotion.value = 'Neutral'
      }
    } catch (err) {
      // Non-fatal: a single frame failure shouldn't crash the loop
      console.warn('[useEmotionDetector] Frame error:', err)
    }

    animationFrameId = requestAnimationFrame(detectLoop)
  }

  // -----------------------------------------------------------------------
  // Calibration
  // -----------------------------------------------------------------------

  async function startCalibration(): Promise<void> {
    if (!isReady.value) return
    appState.value = 'CALIBRATION'
    isCalibrating.value = true
    calibrationProgress.value = 0
    calibrationSamples = []
    baseline.value = null
  }

  function finalizeCalibration(): void {
    if (calibrationSamples.length === 0) return

    // Average all collected blendshape samples into a baseline
    const keys = Object.keys(BLENDSHAPE_MAP) as (keyof BlendshapeScores)[]
    const averaged: Partial<BlendshapeScores> = {}

    for (const key of keys) {
      let sum = 0
      let count = 0
      for (const sample of calibrationSamples) {
        const val = sample[key]
        if (val !== undefined) {
          sum += val
          count++
        }
      }
      if (count > 0) {
        (averaged as any)[key] = sum / count
      }
    }

    baseline.value = {
      blendshapes: averaged,
      capturedAt: Date.now(),
      sampleCount: calibrationSamples.length,
    }

    isCalibrating.value = false
    calibrationProgress.value = 1
    calibrationSamples = []
  }

  // -----------------------------------------------------------------------
  // State transitions
  // -----------------------------------------------------------------------

  function startPlaying(): void {
    appState.value = 'PLAYING'
    isCalibrating.value = false
  }

  function pause(): void {
    paused = true
  }

  function resume(): void {
    paused = false
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  function dispose(): void {
    running = false
    paused = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (faceLandmarker) {
      faceLandmarker.close()
      faceLandmarker = null
    }

    videoElement = null
    isReady.value = false
    faceDetected.value = false
    scores.value = { ...EMPTY_SCORES }
    dominantEmotion.value = 'Neutral'
    landmarks.value = []
    blendshapes.value = null
    appState.value = 'CALIBRATION'
    isCalibrating.value = false
    calibrationProgress.value = 0
    calibrationSamples = []
    lastTimestamp = -1
    initError.value = null
  }

  return {
    isReady,
    faceDetected,
    initError,
    scores,
    dominantEmotion,
    landmarks,
    blendshapes,
    appState,
    isCalibrating,
    calibrationProgress,
    baseline,
    initialize,
    startCalibration,
    startPlaying,
    pause,
    resume,
    dispose,
  }
}
