import { computed, reactive, ref } from 'vue'
import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export interface PoseStageSize {
  width: number
  height: number
}

export interface PosePoint {
  x: number
  y: number
  z?: number
  visible: boolean
}

export interface PoseFrame {
  leftShoulder: PosePoint | null
  rightShoulder: PosePoint | null
  leftElbow: PosePoint | null
  rightElbow: PosePoint | null
  leftWrist: PosePoint | null
  rightWrist: PosePoint | null
  timestamp: number
}

export interface UsePoseTrackerOptions {
  paused?: boolean
  modelAssetPath?: string
  wasmBasePath?: string
  delegate?: 'GPU' | 'CPU'
}

function resolveAssetUrl(assetPath: string): string {
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

function formatInitError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof Event !== 'undefined' && error instanceof Event) {
    const eventTarget = error.target as { src?: string } | null
    return eventTarget?.src ? `资源加载失败: ${eventTarget.src}` : `资源加载失败: ${error.type || '未知事件'}`
  }

  return String(error)
}

const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS
const LEFT_SHOULDER_INDEX = 11
const RIGHT_SHOULDER_INDEX = 12
const LEFT_ELBOW_INDEX = 13
const RIGHT_ELBOW_INDEX = 14
const LEFT_WRIST_INDEX = 15
const RIGHT_WRIST_INDEX = 16
const VISIBILITY_THRESHOLD = 0.6
const FPS_SAMPLE_WINDOW_MS = 1000

function normalizePoint(landmark: { x: number; y: number; z?: number; visibility?: number } | undefined): PosePoint | null {
  if (!landmark) {
    return null
  }

  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visible: (landmark.visibility ?? 0) >= VISIBILITY_THRESHOLD,
  }
}

function extractPoseFrame(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | undefined,
  timestamp: number,
): PoseFrame | null {
  if (!landmarks || landmarks.length <= RIGHT_WRIST_INDEX) {
    return null
  }

  return {
    leftShoulder: normalizePoint(landmarks[LEFT_SHOULDER_INDEX]),
    rightShoulder: normalizePoint(landmarks[RIGHT_SHOULDER_INDEX]),
    leftElbow: normalizePoint(landmarks[LEFT_ELBOW_INDEX]),
    rightElbow: normalizePoint(landmarks[RIGHT_ELBOW_INDEX]),
    leftWrist: normalizePoint(landmarks[LEFT_WRIST_INDEX]),
    rightWrist: normalizePoint(landmarks[RIGHT_WRIST_INDEX]),
    timestamp,
  }
}

function normalizeDrawingLandmarks(
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | undefined,
) {
  return (landmarks || []).map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z ?? 0,
    visibility: landmark.visibility ?? 0,
  }))
}

function isFrameVisible(frame: PoseFrame | null): boolean {
  return Boolean(
    frame
    && frame.leftShoulder?.visible
    && frame.rightShoulder?.visible
    && frame.leftElbow?.visible
    && frame.rightElbow?.visible
    && frame.leftWrist?.visible
    && frame.rightWrist?.visible,
  )
}

export function usePoseTracker(options: UsePoseTrackerOptions = {}) {
  const {
    paused: initiallyPaused = false,
    modelAssetPath: rawModelAssetPath = '/models/pose_landmarker_lite.task',
    wasmBasePath: rawWasmBasePath = '/models/wasm',
    delegate = 'GPU',
  } = options

  const modelAssetPath = resolveAssetUrl(rawModelAssetPath)
  const wasmBasePath = ensureTrailingSlash(resolveAssetUrl(rawWasmBasePath))
  const isReady = ref(false)
  const isTracking = ref(false)
  const initError = ref<string | null>(null)
  const offFrame = ref(false)
  const fps = ref(0)
  const stageSize = reactive<PoseStageSize>({ width: 1, height: 1 })
  const poseFrame = ref<PoseFrame | null>(null)
  const statusText = computed(() => {
    if (initError.value) {
      return initError.value
    }

    if (!isReady.value) {
      return 'Pose 相机层准备中'
    }

    if (!isTracking.value) {
      return 'Pose 跟踪已暂停'
    }

    if (offFrame.value) {
      return '请回到摄像头取景范围内'
    }

    return 'Pose 跟踪已连接'
  })

  let paused = Boolean(initiallyPaused)
  let landmarker: PoseLandmarker | null = null
  let drawingUtils: DrawingUtils | null = null
  let videoElement: HTMLVideoElement | null = null
  let canvasElement: HTMLCanvasElement | null = null
  let canvasContext: CanvasRenderingContext2D | null = null
  let animationFrameId: number | null = null
  let running = false
  let lastVideoTime = -1
  let lastFpsWindowAt = 0
  let framesInCurrentWindow = 0

  async function initialize(video: HTMLVideoElement, canvas?: HTMLCanvasElement | null): Promise<void> {
    dispose()
    videoElement = video
    canvasElement = canvas || null
    canvasContext = canvasElement?.getContext('2d') || null
    drawingUtils = canvasContext ? new DrawingUtils(canvasContext) : null
    initError.value = null

    try {
      const vision = await FilesetResolver.forVisionTasks(wasmBasePath)
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate,
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      })

      isReady.value = true
      isTracking.value = !paused
      running = true
      detectLoop()
    } catch (error) {
      initError.value = `MediaPipe Pose 初始化失败: ${formatInitError(error)}`
    }
  }

  function drawCurrentPose(result: { landmarks?: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>> }) {
    if (!canvasContext || !canvasElement || !drawingUtils) {
      return
    }

    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
    const landmarks = result.landmarks?.[0]
    if (!landmarks) {
      return
    }
    const drawingLandmarks = normalizeDrawingLandmarks(landmarks)

    drawingUtils.drawConnectors(drawingLandmarks, POSE_CONNECTIONS, {
      color: '#38BDF8',
      lineWidth: 4,
    })
    drawingUtils.drawLandmarks(drawingLandmarks, {
      color: '#F8FAFC',
      fillColor: '#0EA5E9',
      lineWidth: 1.5,
      radius: 4,
    })
  }

  function updateFps(now: number) {
    if (lastFpsWindowAt <= 0) {
      lastFpsWindowAt = now
      framesInCurrentWindow = 1
      return
    }

    framesInCurrentWindow += 1
    const elapsed = now - lastFpsWindowAt
    if (elapsed >= FPS_SAMPLE_WINDOW_MS) {
      fps.value = Math.round((framesInCurrentWindow * 1000) / elapsed)
      lastFpsWindowAt = now
      framesInCurrentWindow = 0
    }
  }

  function detectLoop() {
    if (!running) {
      return
    }

    animationFrameId = requestAnimationFrame(detectLoop)

    if (paused || !landmarker || !videoElement) {
      isTracking.value = isReady.value && !paused
      return
    }

    if (videoElement.readyState < 2) {
      return
    }

    const now = performance.now()
    if (videoElement.currentTime === lastVideoTime) {
      return
    }
    lastVideoTime = videoElement.currentTime

    try {
      const result = landmarker.detectForVideo(videoElement, now)
      const nextFrame = extractPoseFrame(result.landmarks?.[0], now)
      poseFrame.value = nextFrame
      offFrame.value = !isFrameVisible(nextFrame)
      isTracking.value = isReady.value && !paused
      drawCurrentPose(result)
      updateFps(now)
    } catch (error) {
      initError.value = `Pose 跟踪失败: ${formatInitError(error)}`
    }
  }

  function updateStageSize(nextSize: PoseStageSize) {
    stageSize.width = Math.max(1, nextSize.width)
    stageSize.height = Math.max(1, nextSize.height)
  }

  function setPaused(value: boolean) {
    paused = value
    isTracking.value = isReady.value && !paused
  }

  function dispose() {
    running = false
    isReady.value = false
    isTracking.value = false
    poseFrame.value = null
    fps.value = 0
    offFrame.value = false
    lastVideoTime = -1
    lastFpsWindowAt = 0
    framesInCurrentWindow = 0

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (landmarker) {
      landmarker.close()
      landmarker = null
    }

    if (canvasContext && canvasElement) {
      canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
    }

    drawingUtils = null
    videoElement = null
    canvasElement = null
    canvasContext = null
  }

  return {
    poseFrame,
    stageSize,
    fps,
    offFrame,
    isReady,
    isTracking,
    initError,
    statusText,
    initialize,
    updateStageSize,
    setPaused,
    dispose,
  }
}
