/**
 * Electron AI IPC Handlers
 *
 * 在主进程代理调用 DeepSeek（OpenAI 兼容协议）。
 * - API Key 以【密文】由渲染进程经 IPC 传入（渲染进程永不持有明文 Key）；
 * - 主进程解密后发起请求，明文 Key 仅存在于主进程内存，不回传渲染进程；
 * - 流式（stream:true）：逐 chunk 经 event.sender.send('ai:chunk') 回推，末尾 'ai:done'/'ai:error'；
 *   使用 handler 自带 event.sender，无需 mainWindow 引用。
 *
 * 安全边界注记：C05 起 provider API Key 使用 Electron Main 的 safeStorage 保护；
 * 旧 AES 密文仅由 ai-secrets.mjs 的迁移入口只读兼容。
 */

import { safeStorage } from 'electron'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { registerAISecretHandlers } from './ai-secrets.mjs'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const REQUEST_TIMEOUT_MS = 60_000

// Phase 4：文档文本抽取上限（字符数）。超长截断，防 token 预算爆炸。
const MAX_EXTRACT_CHARS = 20_000

/** 把 OpenAI 兼容 provider 返回的 usage 映射为前端统一结构 */
function mapUsage(usage) {
  if (!usage) return null
  const promptTokens = usage.prompt_tokens ?? 0
  const completionTokens = usage.completion_tokens ?? 0
  const promptCacheHitTokens =
    usage.prompt_cache_hit_tokens ??
    usage.prompt_tokens_details?.cached_tokens ??
    0
  return {
    totalTokens: usage.total_tokens ?? promptTokens + completionTokens,
    promptTokens,
    completionTokens,
    promptCacheHitTokens,
    promptCacheMissTokens:
      usage.prompt_cache_miss_tokens ??
      Math.max(0, promptTokens - promptCacheHitTokens),
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

/**
 * Phase 4：文档文本抽取器（PDF / Word .docx / Excel .xlsx → 纯文本）。
 * 三库均在调用时 dynamic import，首次抽取才加载，AI 模块启动零成本。
 * 全部纯 JS、零原生依赖（pdfjs-dist / mammoth / exceljs），符合 AGENTS §5 红线。
 */

/** PDF → 文本：pdfjs-dist v6 在 Node 必须用 legacy/build（含 Node 兼容，不依赖 DOMMatrix 等 DOM 全局）。
 *  workerSrc 指向已安装的 legacy worker（pdf.js 在 worker_threads 解析）。 */
async function extractPdfText(bytes) {
  const { createRequire } = await import('node:module')
  const nodeRequire = createRequire(import.meta.url)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // Windows 上 resolve 返回裸盘符路径（如 E:\...）会被 ESM loader 误判为协议 'e:'，
  // 必须 pathToFileURL 转成 file:///E:/... 才能被 Node worker 加载。
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    nodeRequire.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ).href

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) })
  const doc = await loadingTask.promise
  const pageCount = doc.numPages
  let text = ''
  try {
    for (let i = 1; i <= pageCount; i += 1) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map((it) => it.str || '').join(' ') + '\n'
      // 早停：已远超上限就不读后续页，防超大 PDF 拖慢抽取
      if (text.length > MAX_EXTRACT_CHARS * 2) break
    }
  } finally {
    // v6 清理用 loadingTask.destroy()（doc.destroy 在 v6 已移除）
    await loadingTask.destroy().catch(() => {})
  }
  return { text, pageCount }
}

/** Word .docx → 文本：mammoth extractRawText（接受 Node Buffer） */
async function extractDocxText(bytes) {
  const mod = await import('mammoth')
  const mammoth = mod.default || mod
  const result = await mammoth.extractRawText({ buffer: bytes })
  return { text: result.value || '' }
}

/** Excel .xlsx → 文本：exceljs 逐工作表逐行拼成 TSV 样式（含工作表名标题） */
async function extractXlsxText(bytes) {
  const mod = await import('exceljs')
  const ExcelJS = mod.default || mod
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(bytes)
  const lines = []
  wb.eachSheet((sheet) => {
    lines.push(`【工作表：${sheet.name}】`)
    sheet.eachRow({ includeEmpty: false }, (row) => {
      // row.values 为 1-based（[0] 恒 undefined），从 1 起取实际单元格
      const cells = (row.values || []).slice(1).map((v) => (v == null ? '' : String(v)))
      lines.push(cells.join('\t'))
    })
  })
  return { text: lines.join('\n') }
}

export function initAIHandlers(ipcMain) {
  const aiSecretService = registerAISecretHandlers(ipcMain, safeStorage)

  ipcMain.handle('ai:chat', async (event, payload) => {
    try {
      const { encKey, messages, systemPrompt, model, baseUrl, stream, supportsThinking, providerName, tools } = payload || {}
      const label = providerName || '模型服务'

      if (!encKey) {
        return { success: false, errorKind: 'no_key', error: `尚未配置 ${label} 的 API Key，请先在系统设置中配置。` }
      }

      const secretResult = aiSecretService.decryptApiKey(encKey)
      if (!secretResult.success) {
        return {
          success: false,
          errorKind: secretResult.errorKind || 'decrypt_failed',
          error: secretResult.error || 'API Key 解密失败，请重新配置。',
        }
      }
      const apiKey = secretResult.apiKey

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

  // Phase 4：文档文本抽取（PDF / Word .docx / Excel .xlsx → 纯文本，供 AI 阅读）
  // 输入绝对路径，按扩展名分发到对应 extractor；超长截断到 MAX_EXTRACT_CHARS；扫描件/损坏返回失败。
  ipcMain.handle('extract-document-text', async (event, absPath) => {
    try {
      if (!absPath || typeof absPath !== 'string') {
        return { success: false, error: '未提供文档路径。' }
      }
      const ext = (absPath.toLowerCase().split('.').pop() || '').trim()
      if (!['pdf', 'docx', 'xlsx'].includes(ext)) {
        return {
          success: false,
          error: `暂不支持的文档格式 .${ext}（支持 PDF、Word .docx、Excel .xlsx）。旧版 .doc/.xls 请另存为对应格式后上传。`,
        }
      }
      const bytes = await fs.readFile(absPath)

      const result =
        ext === 'pdf' ? await extractPdfText(bytes)
          : ext === 'docx' ? await extractDocxText(bytes)
            : await extractXlsxText(bytes)

      let text = (result.text || '').replace(/\u0000/g, '').trim()
      let truncated = false
      if (text.length > MAX_EXTRACT_CHARS) {
        text = text.slice(0, MAX_EXTRACT_CHARS)
        truncated = true
      }
      if (!text) {
        return {
          success: false,
          error: '未能从文档提取到文本（可能是扫描件 PDF 或不含文本层的文档），请提供可选中文本层的文件。',
        }
      }
      return { success: true, text, truncated, pageCount: result.pageCount }
    } catch (error) {
      console.error('[AI] 文档文本抽取失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  console.log('[AI] AI 处理器已注册（多 provider 代理，支持流式 + Phase 4 文档抽取）')
}
