import { computed, reactive, ref } from 'vue'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import {
  createMagicGloveOverlayModel,
  LEFT_ELBOW_INDEX,
  LEFT_SHOULDER_INDEX,
  LEFT_WRIST_INDEX,
  RIGHT_ELBOW_INDEX,
  RIGHT_SHOULDER_INDEX,
  RIGHT_WRIST_INDEX,
  type MagicGloveOverlayModel,
  type RawPoseLandmark,
} from '@/components/games/pose/pose-overlay'

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

const VISIBILITY_THRESHOLD = 0.6
const FPS_SAMPLE_WINDOW_MS = 1000
const DEFAULT_STAGE_PADDING = 0.05

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, precision = 1000): number {
  return Math.round(value * precision) / precision
}

function projectStageX(value: number, width: number): number {
  const normalized = clamp(value, 0, 1)
  return roundTo(width * (DEFAULT_STAGE_PADDING + normalized * (1 - DEFAULT_STAGE_PADDING * 2)), 100)
}

function projectStageY(value: number, height: number): number {
  const normalized = clamp(value, 0, 1)
  return roundTo(height * (DEFAULT_STAGE_PADDING + normalized * (1 - DEFAULT_STAGE_PADDING * 2)), 100)
}

function drawSoftLine(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  colorStart: string,
  colorEnd: string,
  width: number,
) {
  const gradient = context.createLinearGradient(startX, startY, endX, endY)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)
  context.save()
  context.strokeStyle = gradient
  context.lineWidth = width
  context.lineCap = 'round'
  context.shadowBlur = width * 1.6
  context.shadowColor = colorEnd
  context.beginPath()
  context.moveTo(startX, startY)
  context.lineTo(endX, endY)
  context.stroke()
  context.restore()
}

function drawMagicGlove(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  intensity: number,
) {
  const coreRadius = 10 + intensity * 10
  const ringRadius = 22 + intensity * 12
  const outerRadius = 34 + intensity * 20

  context.save()

  const outerGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerRadius)
  outerGradient.addColorStop(0, 'rgba(255,255,255,0.98)')
  outerGradient.addColorStop(0.32, 'rgba(123, 224, 210, 0.92)')
  outerGradient.addColorStop(0.72, 'rgba(101, 184, 255, 0.24)')
  outerGradient.addColorStop(1, 'rgba(101, 184, 255, 0)')
  context.fillStyle = outerGradient
  context.beginPath()
  context.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = `rgba(123, 224, 210, ${0.38 + intensity * 0.34})`
  context.lineWidth = 2.2 + intensity * 1.4
  context.beginPath()
  context.arc(centerX, centerY, ringRadius, 0, Math.PI * 2)
  context.stroke()

  context.fillStyle = 'rgba(255,255,255,0.94)'
  context.beginPath()
  context.arc(centerX, centerY, coreRadius * 0.6, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = `rgba(255, 255, 255, ${0.52 + intensity * 0.24})`
  context.lineWidth = 1.4
  context.beginPath()
  context.arc(centerX, centerY, coreRadius, 0, Math.PI * 2)
  context.stroke()

  context.restore()
}

function drawShoulderAura(
  context: CanvasRenderingContext2D,
  model: MagicGloveOverlayModel,
  width: number,
  height: number,
) {
  if (!model.shoulderCenter || !model.chestCenter) {
    return
  }

  const centerX = projectStageX(model.shoulderCenter.x, width)
  const centerY = projectStageY(model.chestCenter.y, height)
  const radiusX = Math.max(34, width * Math.max(0.045, model.shoulderSpan * 0.28))
  const radiusY = Math.max(28, height * Math.max(0.035, model.shoulderSpan * 0.22))

  context.save()
  const aura = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusX * 1.1)
  aura.addColorStop(0, 'rgba(255,255,255,0.32)')
  aura.addColorStop(0.45, 'rgba(123, 224, 210, 0.18)')
  aura.addColorStop(1, 'rgba(123, 224, 210, 0)')
  context.fillStyle = aura
  context.beginPath()
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawMagicGloveOverlay(
  context: CanvasRenderingContext2D,
  model: MagicGloveOverlayModel,
  width: number,
  height: number,
) {
  drawShoulderAura(context, model, width, height)

  const leftShoulder = model.leftShoulder?.visible ? model.leftShoulder : null
  const rightShoulder = model.rightShoulder?.visible ? model.rightShoulder : null
  const leftElbow = model.leftElbow?.visible ? model.leftElbow : null
  const rightElbow = model.rightElbow?.visible ? model.rightElbow : null
  const leftWrist = model.leftWrist?.visible ? model.leftWrist : null
  const rightWrist = model.rightWrist?.visible ? model.rightWrist : null

  if (leftShoulder && rightShoulder) {
    drawSoftLine(
      context,
      projectStageX(leftShoulder.x, width),
      projectStageY(leftShoulder.y, height),
      projectStageX(rightShoulder.x, width),
      projectStageY(rightShoulder.y, height),
      'rgba(255,255,255,0.36)',
      'rgba(123, 224, 210, 0.34)',
      10,
    )
  }

  if (model.shoulderCenter && model.chestCenter) {
    drawSoftLine(
      context,
      projectStageX(model.shoulderCenter.x, width),
      projectStageY(model.shoulderCenter.y, height),
      projectStageX(model.chestCenter.x, width),
      projectStageY(model.chestCenter.y, height),
      'rgba(255,255,255,0.22)',
      'rgba(101, 184, 255, 0.24)',
      12,
    )
  }

  if (leftShoulder && leftElbow) {
    drawSoftLine(
      context,
      projectStageX(leftShoulder.x, width),
      projectStageY(leftShoulder.y, height),
      projectStageX(leftElbow.x, width),
      projectStageY(leftElbow.y, height),
      'rgba(255,255,255,0.72)',
      'rgba(123, 224, 210, 0.72)',
      13,
    )
  }

  if (leftElbow && leftWrist) {
    drawSoftLine(
      context,
      projectStageX(leftElbow.x, width),
      projectStageY(leftElbow.y, height),
      projectStageX(leftWrist.x, width),
      projectStageY(leftWrist.y, height),
      'rgba(255,255,255,0.84)',
      'rgba(101, 184, 255, 0.88)',
      11 + model.leftIntensity * 3,
    )
  }

  if (rightShoulder && rightElbow) {
    drawSoftLine(
      context,
      projectStageX(rightShoulder.x, width),
      projectStageY(rightShoulder.y, height),
      projectStageX(rightElbow.x, width),
      projectStageY(rightElbow.y, height),
      'rgba(255,255,255,0.72)',
      'rgba(123, 224, 210, 0.72)',
      13,
    )
  }

  if (rightElbow && rightWrist) {
    drawSoftLine(
      context,
      projectStageX(rightElbow.x, width),
      projectStageY(rightElbow.y, height),
      projectStageX(rightWrist.x, width),
      projectStageY(rightWrist.y, height),
      'rgba(255,255,255,0.84)',
      'rgba(101, 184, 255, 0.88)',
      11 + model.rightIntensity * 3,
    )
  }

  if (leftWrist) {
    drawMagicGlove(
      context,
      projectStageX(leftWrist.x, width),
      projectStageY(leftWrist.y, height),
      model.leftIntensity,
    )
  }

  if (rightWrist) {
    drawMagicGlove(
      context,
      projectStageX(rightWrist.x, width),
      projectStageY(rightWrist.y, height),
      model.rightIntensity,
    )
  }
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

  function drawCurrentPose(result: { landmarks?: Array<Array<RawPoseLandmark>> }) {
    if (!canvasContext || !canvasElement) {
      return
    }

    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height)
    const landmarks = result.landmarks?.[0]
    if (!landmarks) {
      return
    }
    const overlayModel = createMagicGloveOverlayModel(landmarks)
    if (!overlayModel) {
      return
    }
    drawMagicGloveOverlay(canvasContext, overlayModel, canvasElement.width, canvasElement.height)
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
