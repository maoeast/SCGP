/**
 * Electron AI IPC Handlers
 *
 * 在主进程代理调用 DeepSeek（OpenAI 兼容协议）。
 * - API Key 以【密文】由渲染进程经 IPC 传入（渲染进程永不持有明文 Key）；
 * - 主进程解密后发起请求，明文 Key 仅存在于主进程内存，不回传渲染进程；
 * - 流式（stream:true）：逐 chunk 经 event.sender.send('ai:chunk') 回推，末尾 'ai:done'/'ai:error'；
 *   使用 handler 自带 event.sender，无需 mainWindow 引用。
 *
 * 安全边界注记：AES_SECRET 与 src/utils/crypto.ts 同源（用户选定「可随备份跨机迁移」方案），
 * 属「防明文落盘」级别保护，不承诺防能读源码者。详见 A4 AI 智能体接入计划。
 */

import CryptoJS from 'crypto-js'

// 必须与 src/utils/crypto.ts 的 AES_SECRET 完全一致（渲染侧 encryptData 用同一常量加密 API Key）
const AES_SECRET = 'SPED-PASSWORD-SECURITY-KEY-2025'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const REQUEST_TIMEOUT_MS = 60_000

/** 复刻 src/utils/crypto.ts 的 decryptData（主进程为 .mjs，无法直接 import .ts） */
function decryptData(encryptedData, key) {
  try {
    const useKey = key || AES_SECRET
    const decrypted = CryptoJS.AES.decrypt(encryptedData, useKey)
    const jsonStr = decrypted.toString(CryptoJS.enc.Utf8)
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('[AI] API Key 解密失败:', error)
    return null
  }
}

/** 把 DeepSeek 返回的 usage 映射为前端 DeepSeekUsage 结构 */
function mapUsage(usage) {
  if (!usage) return null
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    promptCacheHitTokens: usage.prompt_cache_hit_tokens ?? 0,
    promptCacheMissTokens: usage.prompt_cache_miss_tokens ?? 0,
  }
}

/** 将 HTTP 错误状态码映射为可读中文提示（含 DeepSeek error.message） */
function describeHttpError(status, body, providerName = '模型服务') {
  let providerMessage = ''
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body
    providerMessage = parsed?.error?.message || parsed?.message || ''
  } catch {
    /* ignore */
  }
  const suffix = providerMessage ? `（${providerMessage}）` : ''

  if (status === 401) return { kind: 'auth', message: `${providerName} 的 API Key 无效或已失效，请在系统设置检查。${suffix}` }
  if (status === 402) return { kind: 'insufficient_balance', message: `${providerName} 账户余额不足，请登录对应平台充值。${suffix}` }
  if (status === 429) return { kind: 'rate_limit', message: `请求过于频繁或触发限流，请稍后再试。${suffix}` }
  return { kind: 'http_error', message: `${providerName} 返回错误（HTTP ${status}）${providerMessage ? '：' + providerMessage : ''}` }
}

function buildMessages(messages, systemPrompt) {
  const full = []
  if (systemPrompt) full.push({ role: 'system', content: systemPrompt })
  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (!m || !m.role) continue
      // function calling：工具结果消息（role:'tool'，必须带 tool_call_id）
      if (m.role === 'tool') {
        if (typeof m.content === 'string' && m.tool_call_id) {
          full.push({ role: 'tool', tool_call_id: m.tool_call_id, content: m.content })
        }
        continue
      }
      // function calling：上一轮请求调用工具的 assistant 消息需原样回填（含 tool_calls）
      if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        full.push({
          role: 'assistant',
          content: typeof m.content === 'string' ? m.content : '',
          tool_calls: m.tool_calls,
        })
        continue
      }
      // 普通消息（user / system / 纯文本 assistant）
      if (typeof m.content === 'string') {
        full.push({ role: m.role, content: m.content })
      } else if (Array.isArray(m.content)) {
        // 多模态（Phase 3 vision）：content 为 OpenAI 数组 [{type:'text'},{type:'image_url'}]，原样透传
        full.push({ role: m.role, content: m.content })
      }
    }
  }
  return full
}

/** 流式调用：边收边 event.sender.send('ai:chunk')，最终 invoke 返回完整结果（与 done 事件一致） */
async function streamChat(event, apiKey, apiBase, model, messages, systemPrompt, supportsThinking, providerName) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(messages, systemPrompt),
        stream: true,
        stream_options: { include_usage: true },
        ...(supportsThinking ? { thinking: { type: 'disabled' } } : {}),
      }),
      signal: controller.signal,
    })
  } catch (networkError) {
    clearTimeout(timer)
    if (networkError?.name === 'AbortError') {
      return { success: false, errorKind: 'timeout', error: `请求超时（${REQUEST_TIMEOUT_MS / 1000}s），请稍后重试。` }
    }
    return { success: false, errorKind: 'network', error: `网络请求失败：${networkError?.message || String(networkError)}` }
  }

  if (!response.ok) {
    clearTimeout(timer)
    const errBody = await response.text().catch(() => '')
    const info = describeHttpError(response.status, errBody, providerName)
    try {
      event?.sender?.send('ai:error', { errorKind: info.kind, error: info.message })
    } catch {
      /* sender 不可用时忽略 */
    }
    return { success: false, errorKind: info.kind, error: info.message, httpStatus: response.status }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let fullContent = ''
  let usage = null

  try {
    while (true) {
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
              fullContent += delta
              try {
                event?.sender?.send('ai:chunk', { delta })
              } catch {
                /* ignore */
              }
            }
            if (json?.usage) usage = mapUsage(json.usage)
          } catch {
            /* 忽略不完整的 JSON 片段 */
          }
        }
      }
    }
  } finally {
    clearTimeout(timer)
  }

  try {
    event?.sender?.send('ai:done', { content: fullContent, usage })
  } catch {
    /* ignore */
  }
  return { success: true, content: fullContent, usage }
}

export function initAIHandlers(ipcMain) {
  ipcMain.handle('ai:chat', async (event, payload) => {
    try {
      const { encKey, messages, systemPrompt, model, baseUrl, stream, supportsThinking, providerName, tools } = payload || {}
      const label = providerName || '模型服务'

      if (!encKey) {
        return { success: false, errorKind: 'no_key', error: `尚未配置 ${label} 的 API Key，请先在系统设置中配置。` }
      }

      const apiKey = decryptData(encKey)
      if (!apiKey || typeof apiKey !== 'string') {
        return { success: false, errorKind: 'decrypt_failed', error: 'API Key 解密失败，请重新配置。' }
      }

      const fullMessages = buildMessages(messages, systemPrompt)
      const hasUserMessage = fullMessages.some((m) => m.role === 'user' || m.role === 'assistant')
      if (!hasUserMessage) {
        return { success: false, errorKind: 'empty', error: '没有可发送的对话内容。' }
      }

      const apiBase = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
      const useModel = model || 'deepseek-v4-flash'

      if (stream) {
        return await streamChat(event, apiKey, apiBase, useModel, messages, systemPrompt, supportsThinking, providerName)
      }

      // 非流式（用于连接测试等）
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const response = await fetch(`${apiBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: useModel,
            messages: fullMessages,
            stream: false,
            ...(supportsThinking ? { thinking: { type: 'disabled' } } : {}),
            ...(Array.isArray(tools) && tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errBody = await response.text().catch(() => '')
          const info = describeHttpError(response.status, errBody, providerName)
          return { success: false, errorKind: info.kind, error: info.message, httpStatus: response.status }
        }

        const data = await response.json()
        const toolCalls = data?.choices?.[0]?.message?.tool_calls
        return {
          success: true,
          content: data?.choices?.[0]?.message?.content || '',
          usage: mapUsage(data?.usage),
          model: data?.model || useModel,
          toolCalls: Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls : undefined,
        }
      } catch (networkError) {
        if (networkError?.name === 'AbortError') {
          return { success: false, errorKind: 'timeout', error: `请求超时（${REQUEST_TIMEOUT_MS / 1000}s），请稍后重试。` }
        }
        return { success: false, errorKind: 'network', error: `网络请求失败：${networkError?.message || String(networkError)}` }
      } finally {
        clearTimeout(timer)
      }
    } catch (error) {
      console.error('[AI] ai:chat 处理异常:', error)
      return {
        success: false,
        errorKind: 'internal',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  console.log('[AI] AI 处理器已注册（多 provider 代理，支持流式）')
}
