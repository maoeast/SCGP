/**
 * AI 智能体 function calling：渲染端 tool 执行循环。
 *
 * Phase 2 骨架（plan §Phase 2）：tool 执行放渲染进程。
 * 流程：带 tools 的【非流式】aiChat → 若返回 tool_calls，逐个本地 dispatchTool →
 * 结果以 {role:'tool'} 回传 → 再调，直到无 tool_calls（最终答案）或达轮次上限。
 *
 * 协议要点（OpenAI 兼容，DeepSeek/豆包通用）：tool 结果消息前必须有一条带 tool_calls 的
 * assistant 消息，否则服务端拒绝下一轮请求。
 *
 * 计费：tool 循环可能多轮，累计各轮 usage 再回传 store，estimateCostYuan 更接近真实花费。
 */
import { AI_TOOLS, dispatchTool, toolLabel, type AiToolCall, type AiToolDef, type ToolStep } from '@/services/ai-tools'
import type { DeepSeekUsage } from '@/database/ai-api'

// 典型报告流程（search_students→get_student→get_assessment→list_training_sessions→generate_report）已 5 轮，留 2 轮余量
const MAX_TOOL_ROUNDS = 7

/** 多模态内容（Phase 3 vision）：OpenAI content 数组（image_url 在前、text 在后，对齐豆包官方示例） */
type MultimodalContent = Array<
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'text'; text: string }
>

type LoopMessage =
  | { role: 'user' | 'system'; content: string | MultimodalContent }
  | { role: 'assistant'; content?: string; tool_calls?: AiToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string }

export interface RunToolLoopParams {
  encKey: string
  baseUrl: string
  model: string
  systemPrompt: string
  supportsThinking: boolean
  providerName: string
  /** 初始对话历史（user/system/assistant 可见消息，由 store 从 currentMessages 映射；Phase 3 支持多模态数组 content） */
  messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string | MultimodalContent }>
  /**
   * Phase 5：该 agent 挂载的工具子集（store 用 filterTools(getAgentToolCodes) 算出后传入）。
   * 不传 → 全量 AI_TOOLS（兼容/兜底）。本数组同时作 dispatchTool 的白名单防御源。
   */
  tools?: AiToolDef[]
  /** 每次工具调用完成时回调（供 UI 展示 tool 气泡） */
  onToolStep?: (step: ToolStep) => void
}

export interface RunToolLoopResult {
  content: string
  usage: DeepSeekUsage
  toolSteps: ToolStep[]
}

/** 执行 tool 循环，返回最终回答正文 + 累计 usage + 工具步骤。网络层失败时抛错（带 errorKind）。 */
export async function runToolLoop(params: RunToolLoopParams): Promise<RunToolLoopResult> {
  const messages: LoopMessage[] = []
  for (const m of params.messages) {
    if (m.role === 'assistant') {
      // assistant 消息不带图，content 收窄为 string（LoopMessage assistant 分支只接受 string）
      messages.push({ role: 'assistant', content: typeof m.content === 'string' ? m.content : '' })
    } else {
      messages.push({ role: m.role === 'system' ? 'system' : 'user', content: m.content })
    }
  }
  const toolSteps: ToolStep[] = []
  let lastTextContent = ''
  let promptTokens = 0
  let completionTokens = 0
  let promptCacheHitTokens = 0
  let promptCacheMissTokens = 0

  const addUsage = (u: { promptTokens?: number; completionTokens?: number; promptCacheHitTokens?: number; promptCacheMissTokens?: number } | undefined) => {
    if (!u) return
    promptTokens += Number(u.promptTokens || 0)
    completionTokens += Number(u.completionTokens || 0)
    promptCacheHitTokens += Number(u.promptCacheHitTokens || 0)
    promptCacheMissTokens += Number(u.promptCacheMissTokens || 0)
  }

  // Phase 5：按 agent 挂载的工具子集（未传则全量兜底）；allowedToolNames 同时作 dispatch 白名单防御。
  const activeTools = params.tools ?? AI_TOOLS
  const allowedToolNames = new Set(activeTools.map((t) => t.function.name))

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await window.electronAPI.aiChat({
      encKey: params.encKey,
      messages,
      systemPrompt: params.systemPrompt,
      model: params.model,
      baseUrl: params.baseUrl,
      stream: false,
      supportsThinking: params.supportsThinking,
      providerName: params.providerName,
      tools: activeTools,
    })

    if (!res.success) {
      const err = new Error(res.error || 'AI 请求失败') as Error & { errorKind?: string }
      err.errorKind = res.errorKind
      throw err
    }

    addUsage(res.usage)
    if (res.content) lastTextContent = res.content

    const toolCalls = res.toolCalls
    if (!toolCalls || toolCalls.length === 0) {
      // 无工具调用 → 本轮正文即最终答案
      return {
        content: lastTextContent,
        usage: { promptTokens, completionTokens, promptCacheHitTokens, promptCacheMissTokens },
        toolSteps,
      }
    }

    // 回填带 tool_calls 的 assistant 消息（OpenAI 协议要求）
    messages.push({
      role: 'assistant',
      content: res.content || '',
      tool_calls: toolCalls,
    })

    // 逐个执行工具，结果作为 tool 消息回传
    for (const tc of toolCalls) {
      const step: ToolStep = { name: tc.function.name, label: toolLabel(tc.function.name), ok: false }
      const result = await dispatchTool(tc.function.name, tc.function.arguments || '{}', allowedToolNames)
      step.ok = result.ok
      toolSteps.push(step)
      params.onToolStep?.(step)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result.content })
    }
  }

  // 达上限仍有 tool_calls：返回最后已知正文 + 提示
  return {
    content: lastTextContent + '\n\n（已达工具调用轮次上限，以上为当前可提供的信息。）',
    usage: { promptTokens, completionTokens, promptCacheHitTokens, promptCacheMissTokens },
    toolSteps,
  }
}
