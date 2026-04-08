export interface ITTSService {
  play(text: string, signal?: AbortSignal): Promise<void>
  stop(): void
  pause(): void
  resume(): void
  isAvailable(signal?: AbortSignal): Promise<boolean>
}

export interface EdgeTTSSynthesizeRequest {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  format?: string
}

export interface EdgeTTSSynthesizeResponse {
  audioUrl?: string
  audioBase64?: string
  mimeType?: string
}

export interface EdgeTTSServiceOptions {
  endpoint: string
  healthcheckUrl?: string
  voice?: string
  rate?: string
  pitch?: string
  format?: string
  headers?: HeadersInit
  fetchImpl?: typeof fetch
}
