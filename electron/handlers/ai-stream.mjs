/**
 * OpenAI-compatible SSE response reader.
 *
 * The first content token is intentionally not guarded by the idle timeout.
 * A provider can send response headers and empty role frames while its model
 * is still preparing the first token, and that preparation may legitimately
 * take longer than the request timeout. Once content starts arriving, the
 * timeout is measured between chunks instead of from the beginning.
 */

export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 60_000

export class AIStreamTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`流式响应超过 ${timeoutMs / 1000}s 未收到新数据，请稍后重试。`)
    this.name = 'AIStreamTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * Consume an OpenAI-compatible SSE response until the stream ends.
 *
 * The caller owns the AbortController used for the fetch. When an idle
 * timeout fires we abort that controller as well, so the underlying HTTP
 * request is released instead of leaving a pending reader behind.
 */
export async function consumeAIStream({
  response,
  controller,
  mapUsage,
  onDelta,
  idleTimeoutMs = DEFAULT_STREAM_IDLE_TIMEOUT_MS,
}) {
  const reader = response?.body?.getReader?.()
  if (!reader) throw new Error('模型服务未返回可读取的流式响应。')

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let fullContent = ''
  let usage = null
  let idleTimer = null
  let hasToken = false
  let timedOut = false

  const clearIdleTimer = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  const armIdleTimer = () => {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      timedOut = true
      controller?.abort?.()
    }, idleTimeoutMs)
  }

  try {
    while (true) {
      // Do not start the idle watchdog until a content token arrives. This
      // keeps model preparation and empty role frames outside stream timing.
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let idx
      // SSE 事件以空行（\n\n）分隔
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const rawEvent = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        for (const line of rawEvent.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json?.choices?.[0]?.delta?.content
            if (delta) {
              hasToken = true
              fullContent += delta
              onDelta?.(delta)
            }
            if (json?.usage) usage = mapUsage(json.usage)
          } catch {
            // 忽略不完整的 JSON 片段，后续数据会继续拼接到 buffer。
          }
        }
      }

      // Once the first token exists, every body chunk resets the idle window.
      if (hasToken) armIdleTimer()
    }
  } catch (error) {
    if (timedOut || error?.name === 'AbortError') {
      throw new AIStreamTimeoutError(idleTimeoutMs)
    }
    throw error
  } finally {
    clearIdleTimer()
    if (timedOut && typeof reader.cancel === 'function') {
      try {
        await reader.cancel()
      } catch {
        // The AbortController may have already closed the response body.
      }
    }
  }

  return { content: fullContent, usage }
}
