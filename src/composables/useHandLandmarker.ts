import { ref } from 'vue'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { HandPoint } from '@/utils/hand-game-gestures'

export interface HandObservation {
  landmarks: HandPoint[]
  handedness: string
  score: number
}

export interface HandLandmarkerOptions {
  modelAssetPath?: string
  wasmBasePath?: string
  delegate?: 'GPU' | 'CPU'
  numHands?: number
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

export function useHandLandmarker(options: HandLandmarkerOptions = {}) {
  const {
    modelAssetPath: rawModelAssetPath = '/models/hand_landmarker.task',
    wasmBasePath: rawWasmBasePath = '/models/wasm',
    delegate = 'GPU',
    numHands = 2,
  } = options

  const modelAssetPath = resolveAssetUrl(rawModelAssetPath)
  const wasmBasePath = ensureTrailingSlash(resolveAssetUrl(rawWasmBasePath))
  const hands = ref<HandObservation[]>([])
  const isReady = ref(false)
  const initError = ref<string | null>(null)

  let landmarker: HandLandmarker | null = null
  let videoElement: HTMLVideoElement | null = null
  let animationFrameId: number | null = null
  let running = false
  let paused = false
  let lastTimestamp = -1

  async function initialize(video: HTMLVideoElement): Promise<void> {
    dispose()
    videoElement = video
    initError.value = null

    try {
      const vision = await FilesetResolver.forVisionTasks(wasmBasePath)
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate,
        },
        runningMode: 'VIDEO',
        numHands,
      })

      isReady.value = true
      running = true
      detectLoop()
    } catch (error) {
      initError.value = `MediaPipe Hands 初始化失败: ${formatInitError(error)}`
    }
  }

  function detectLoop(): void {
    if (!running || !landmarker || !videoElement || paused) {
      if (running) {
        animationFrameId = requestAnimationFrame(detectLoop)
      }
      return
    }

    const now = performance.now()
    if (now <= lastTimestamp) {
      animationFrameId = requestAnimationFrame(detectLoop)
      return
    }
    lastTimestamp = now

    try {
      if (videoElement.readyState >= 2) {
        const result = landmarker.detectForVideo(videoElement, now)
        hands.value = (result.landmarks || []).map((landmarks, index) => {
          const category = result.handedness?.[index]?.[0]
          return {
            landmarks: landmarks as HandPoint[],
            handedness: category?.categoryName || '',
            score: category?.score || 0,
          }
        })
      }
    } catch (error) {
      initError.value = `手势识别失败: ${formatInitError(error)}`
    }

    animationFrameId = requestAnimationFrame(detectLoop)
  }

  function setPaused(value: boolean): void {
    paused = value
  }

  function dispose(): void {
    running = false
    isReady.value = false
    hands.value = []
    lastTimestamp = -1

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (landmarker) {
      landmarker.close()
      landmarker = null
    }
  }

  return {
    hands,
    isReady,
    initError,
    initialize,
    setPaused,
    dispose,
  }
}
