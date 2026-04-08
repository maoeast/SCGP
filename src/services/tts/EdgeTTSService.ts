import type {
  EdgeTTSServiceOptions,
  EdgeTTSSynthesizeRequest,
  EdgeTTSSynthesizeResponse,
  ITTSService,
} from './ITTSService'

interface ResolvedAudioSource {
  src: string
  revoke: () => void
}

const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural'
const DEFAULT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3'

function createAbortError(message: string): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }

  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function combineAbortSignals(externalSignal?: AbortSignal): AbortController {
  const controller = new AbortController()

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason)
    return controller
  }

  if (externalSignal) {
    externalSignal.addEventListener(
      'abort',
      () => {
        controller.abort(externalSignal.reason)
      },
      { once: true },
    )
  }

  return controller
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new Blob([bytes], { type: mimeType })
}

class EdgeTTSService implements ITTSService {
  private readonly endpoint: string
  private readonly healthcheckUrl: string | null
  private readonly voice: string
  private readonly rate: string | undefined
  private readonly pitch: string | undefined
  private readonly format: string
  private readonly headers: HeadersInit | undefined
  private readonly fetchImpl: typeof fetch

  private audio: HTMLAudioElement | null = null
  private activeObjectUrl: string | null = null
  private activeAbortController: AbortController | null = null

  constructor(options: EdgeTTSServiceOptions) {
    this.endpoint = options.endpoint
    this.healthcheckUrl = options.healthcheckUrl ?? null
    this.voice = options.voice ?? DEFAULT_VOICE
    this.rate = options.rate
    this.pitch = options.pitch
    this.format = options.format ?? DEFAULT_FORMAT
    this.headers = options.headers
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async play(text: string, signal?: AbortSignal): Promise<void> {
    const normalizedText = text.trim()
    if (!normalizedText) {
      return
    }

    this.stop()

    const controller = combineAbortSignals(signal)
    this.activeAbortController = controller

    try {
      const source = await this.synthesize(normalizedText, controller.signal)
      if (controller.signal.aborted) {
        throw createAbortError('Edge TTS playback aborted before audio playback started.')
      }

      await this.playResolvedAudioSource(source, controller.signal)
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
      console.warn('Edge TTS resume failed:', error)
    })
  }

  async isAvailable(signal?: AbortSignal): Promise<boolean> {
    const targetUrl = this.healthcheckUrl ?? this.endpoint

    try {
      const response = await this.fetchImpl(targetUrl, {
        method: this.healthcheckUrl ? 'GET' : 'HEAD',
        signal,
      })

      return response.ok
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }

      return false
    }
  }

  private async synthesize(text: string, signal: AbortSignal): Promise<ResolvedAudioSource> {
    const payload: EdgeTTSSynthesizeRequest = {
      text,
      voice: this.voice,
      rate: this.rate,
      pitch: this.pitch,
      format: this.format,
    }

    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(payload),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Edge TTS synthesize request failed with status ${response.status}.`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.startsWith('audio/')) {
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      return {
        src: objectUrl,
        revoke: () => URL.revokeObjectURL(objectUrl),
      }
    }

    const result = await response.json() as EdgeTTSSynthesizeResponse
    if (result.audioUrl) {
      return {
        src: result.audioUrl,
        revoke: () => undefined,
      }
    }

    if (!result.audioBase64) {
      throw new Error('Edge TTS response did not include audioUrl or audioBase64.')
    }

    const blob = base64ToBlob(result.audioBase64, result.mimeType || 'audio/mpeg')
    const objectUrl = URL.createObjectURL(blob)

    return {
      src: objectUrl,
      revoke: () => URL.revokeObjectURL(objectUrl),
    }
  }

  private async playResolvedAudioSource(source: ResolvedAudioSource, signal: AbortSignal): Promise<void> {
    this.revokeActiveObjectUrl()
    this.activeObjectUrl = source.src.startsWith('blob:') ? source.src : null

    try {
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio()
        this.audio = audio
        audio.preload = 'auto'
        audio.src = source.src

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
          reject(new Error('Edge TTS audio playback failed.'))
        }

        const handleAbort = () => {
          cleanup()
          audio.pause()
          reject(createAbortError('Edge TTS playback aborted.'))
        }

        audio.addEventListener('ended', handleEnded, { once: true })
        audio.addEventListener('error', handleError, { once: true })
        signal.addEventListener('abort', handleAbort, { once: true })

        void audio.play().catch((error) => {
          cleanup()
          reject(error)
        })
      })
    } finally {
      source.revoke()
      if (this.audio) {
        this.audio = null
      }
      this.revokeActiveObjectUrl()
    }
  }

  private revokeActiveObjectUrl(): void {
    if (!this.activeObjectUrl) {
      return
    }

    URL.revokeObjectURL(this.activeObjectUrl)
    this.activeObjectUrl = null
  }
}

export function createEdgeTTSService(options: EdgeTTSServiceOptions): ITTSService {
  return new EdgeTTSService(options)
}
