import type { ITTSService } from './ITTSService'

const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural'

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function createAbortError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

/**
 * 基于 Electron IPC 的 Edge TTS 服务
 *
 * 通过 window.electronAPI.ttsSynthesize 调用 Main 进程的 msedge-tts，
 * 拿到 MP3 音频后在渲染进程用 HTMLAudioElement 播放。
 * 不需要外部服务端，客户零配置。
 */
class EdgeTTSServiceIPC implements ITTSService {
  private readonly voice: string
  private readonly rate: string | undefined
  private readonly pitch: string | undefined
  private audio: HTMLAudioElement | null = null
  private activeObjectUrl: string | null = null
  private activeAbortController: AbortController | null = null

  constructor(options?: { voice?: string; rate?: string; pitch?: string }) {
    this.voice = options?.voice ?? DEFAULT_VOICE
    this.rate = options?.rate
    this.pitch = options?.pitch
  }

  async play(text: string, signal?: AbortSignal): Promise<void> {
    const normalizedText = text.trim()
    if (!normalizedText) return

    this.stop()

    const controller = new AbortController()
    this.activeAbortController = controller

    // 监听外部取消信号
    if (signal?.aborted) {
      controller.abort(signal.reason)
    } else if (signal) {
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
    }

    try {
      const result = await window.electronAPI.ttsSynthesize(normalizedText, {
        voice: this.voice,
        rate: this.rate,
        pitch: this.pitch,
      })

      if (controller.signal.aborted) {
        throw createAbortError('TTS playback aborted after synthesis.')
      }

      if (!result.success || !result.audioBase64) {
        throw new Error(result.error || 'TTS synthesis returned no audio data.')
      }

      const binary = atob(result.audioBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const objectUrl = URL.createObjectURL(blob)
      this.activeObjectUrl = objectUrl

      await this.playAudio(objectUrl, controller.signal)
    } finally {
      if (this.activeAbortController === controller) {
        this.activeAbortController = null
      }
    }
  }

  stop(): void {
    if (this.activeAbortController && !this.activeAbortController.signal.aborted) {
      this.activeAbortController.abort()
    }
    this.activeAbortController = null

    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
    this.revokeActiveObjectUrl()
  }

  pause(): void {
    this.audio?.pause()
  }

  resume(): void {
    void this.audio?.play().catch((error) => {
      console.warn('[TTS-IPC] resume failed:', error)
    })
  }

  async isAvailable(_signal?: AbortSignal): Promise<boolean> {
    // IPC 方式只要 electronAPI 存在就可用，不需要健康检查
    return typeof window !== 'undefined'
      && typeof window.electronAPI?.ttsSynthesize === 'function'
  }

  private playAudio(src: string, signal: AbortSignal): Promise<void> {
    // 不要在这里 revoke，blob URL 还在用

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio()
      this.audio = audio
      audio.preload = 'auto'
      audio.src = src

      const cleanup = () => {
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        signal.removeEventListener('abort', handleAbort)
      }

      const handleEnded = () => {
        cleanup()
        resolve()
      }

      const handleError = () => {
        cleanup()
        reject(new Error('[TTS-IPC] audio playback failed.'))
      }

      const handleAbort = () => {
        cleanup()
        audio.pause()
        reject(createAbortError('[TTS-IPC] playback aborted.'))
      }

      audio.addEventListener('ended', handleEnded, { once: true })
      audio.addEventListener('error', handleError, { once: true })
      signal.addEventListener('abort', handleAbort, { once: true })

      void audio.play().catch((error) => {
        cleanup()
        if (isAbortError(error)) {
          reject(error)
        } else {
          reject(new Error('[TTS-IPC] audio.play() failed.'))
        }
      })
    }).finally(() => {
      this.revokeActiveObjectUrl()
      if (this.audio) {
        this.audio = null
      }
    })
  }

  private revokeActiveObjectUrl(): void {
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl)
      this.activeObjectUrl = null
    }
  }
}

export function createEdgeTTSServiceIPC(options?: {
  voice?: string
  rate?: string
  pitch?: string
}): ITTSService {
  return new EdgeTTSServiceIPC(options)
}
