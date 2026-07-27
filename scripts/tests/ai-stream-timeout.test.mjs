import test from 'node:test'
import assert from 'node:assert/strict'
import { AIStreamTimeoutError, consumeAIStream } from '../../electron/handlers/ai-stream.mjs'

function chunk(text) {
  return new TextEncoder().encode(text)
}

function createReader(controller, steps) {
  let index = 0

  return {
    read() {
      const step = steps[index++] || { done: true, value: undefined, delayMs: 0 }
      return new Promise((resolve, reject) => {
        let settled = false
        const abortError = () => {
          if (settled) return
          settled = true
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        }
        controller.signal.addEventListener('abort', abortError, { once: true })

        const finish = () => {
          if (settled) return
          settled = true
          resolve({ done: !!step.done, value: step.value })
        }

        if (step.delayMs > 0) setTimeout(finish, step.delayMs)
        else finish()
      })
    },
    cancel() {
      return Promise.resolve()
    },
  }
}

function createResponse(controller, steps) {
  const reader = createReader(controller, steps)
  return { body: { getReader: () => reader } }
}

function streamEvent(content) {
  return chunk(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
}

function emptyRoleEvent() {
  return chunk(`data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant', content: '' } }] })}\n\n`)
}

async function consume(response, controller, idleTimeoutMs = 20) {
  const deltas = []
  const result = await consumeAIStream({
    response,
    controller,
    mapUsage: (value) => value,
    onDelta: (delta) => deltas.push(delta),
    idleTimeoutMs,
  })
  return { ...result, deltas }
}

test('首个流数据即使晚于 idle 阈值也不会被总时长计时器误杀', async () => {
  const controller = new AbortController()
  const response = createResponse(controller, [
    { value: emptyRoleEvent() },
    { value: streamEvent('慢首 token'), delayMs: 40 },
    { done: true },
  ])

  const result = await consume(response, controller, 10)

  assert.equal(result.content, '慢首 token')
  assert.deepEqual(result.deltas, ['慢首 token'])
  assert.equal(controller.signal.aborted, false)
})

test('流式数据持续到达时，每个 chunk 都会刷新 idle watchdog', async () => {
  const controller = new AbortController()
  const response = createResponse(controller, [
    { value: streamEvent('第一段') },
    { value: streamEvent('第二段'), delayMs: 8 },
    { value: streamEvent('第三段'), delayMs: 8 },
    { done: true },
  ])

  const result = await consume(response, controller, 15)

  assert.equal(result.content, '第一段第二段第三段')
  assert.deepEqual(result.deltas, ['第一段', '第二段', '第三段'])
})

test('首个 chunk 后长时间没有新数据时才返回流式超时', async () => {
  const controller = new AbortController()
  const response = createResponse(controller, [
    { value: streamEvent('已收到') },
    { value: streamEvent('永远等不到'), delayMs: 100 },
  ])

  await assert.rejects(
    consume(response, controller, 10),
    (error) => error instanceof AIStreamTimeoutError && error.timeoutMs === 10,
  )
  assert.equal(controller.signal.aborted, true)
})
