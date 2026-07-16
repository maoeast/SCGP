import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  AIApi,
  estimateCostYuan,
  type AiAgent,
  type AiProvider,
  type AiChatMessage,
  type AiProviderConfig,
  type AiAttachmentRef,
  type DeepSeekUsage,
} from '@/database/ai-api'
import { encryptData } from '@/utils/crypto'
import { useAuthStore } from '@/stores/auth'
import { runToolLoop } from '@/services/ai-tool-loop'
import type { ToolStep } from '@/services/ai-tools'
import { aiAttachmentManager } from '@/utils/ai-attachment-manager'
import { ElMessage } from 'element-plus'

/** 图片附件扩展名集合（Phase 4：文档附件文本已进 content，多模态只把图片附件做成 image_url） */
const IMAGE_FILE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'])
function isImageFileExt(fileType: string): boolean {
  return IMAGE_FILE_EXTS.has((fileType || '').toLowerCase())
}

/**
 * AI 智能体子系统 store（setup 风格，仿 systemConfig.ts）。
 *
 * 职责：
 * - provider 配置（含 API Key 加密保存）、连接测试、智能体 CRUD、本月用量；
 * - 当前会话、流式接收（ai:chunk 事件由 AiAssistant 组件注册后回调 onChunk）。
 *
 * 安全：本 store 只持有/写入 API Key 的【密文】；明文 Key 由 Electron Main 进程解密，
 * 渲染进程（含本 store）永不持有明文。
 */
export const useAiStore = defineStore('ai', () => {
  const agents = ref<AiAgent[]>([])
  const providers = ref<AiProvider[]>([])
  const providerConfig = ref<AiProviderConfig | null>(null)
  const monthUsage = ref<{ costYuan: number; assistantCount: number; period: string }>({
    costYuan: 0,
    assistantCount: 0,
    period: '',
  })
  const loading = ref(false)
  const testing = ref(false)
  const lastTestResult = ref<{ ok: boolean; message: string } | null>(null)

  const isConfigured = computed(() => !!providerConfig.value?.apiKeyEnc)
  const enabledAgents = computed(() => agents.value.filter((a) => a.enabled))

  function api(): AIApi {
    return new AIApi()
  }

  async function ensureDb() {
    const { initDatabase } = await import('@/database/init')
    await initDatabase()
  }

  async function loadAll() {
    loading.value = true
    try {
      await ensureDb()
      const a = api()
      agents.value = a.listAgents()
      providers.value = a.listProviders()
      providerConfig.value = a.getProviderConfig()
      monthUsage.value = a.getMonthUsage()
      // 默认选中第一个启用智能体
      if (!currentAgentCode.value && enabledAgents.value.length > 0) {
        currentAgentCode.value = enabledAgents.value[0]?.code || ''
      }
      // 恢复当前用户的历史会话（无活动会话则默认选中最近一条）；admin 额外加载全部会话
      await loadSessions()
      if (isAdmin()) allSessions.value = a.listAllSessions()
    } catch (e) {
      console.error('[aiStore] 加载 AI 配置失败:', e)
    } finally {
      loading.value = false
    }
  }

  async function reloadUsage() {
    try {
      await ensureDb()
      monthUsage.value = api().getMonthUsage()
    } catch (e) {
      console.error('[aiStore] 刷新用量失败:', e)
    }
  }

  /**
   * 保存配置：写入【当前 active provider】的 key/baseUrl/model（per-provider 行），
   * 以及全局的 budget/enabled/blockOnOverage（system_config KV）。
   * - apiKeyPlain（明文）：非空加密存密文，空串清除 Key，不传保留；
   * - baseUrl/defaultModel 写入 active provider 行；
   * - monthlyBudgetYuan/blockOnOverage/enabled 写入全局 KV。
   */
  async function saveProviderConfig(input: {
    apiKeyPlain?: string
    baseUrl?: string
    defaultModel?: string
    providerEnabled?: boolean
    monthlyBudgetYuan?: number
    blockOnOverage?: boolean
    enabled?: boolean
  }) {
    await ensureDb()
    const a = api()
    const code = a.getActiveProviderCode()
    const providerInput: {
      code: string
      apiKeyEnc?: string
      baseUrl?: string
      defaultModel?: string
      enabled?: boolean
    } = { code }
    if (input.apiKeyPlain !== undefined) {
      providerInput.apiKeyEnc = input.apiKeyPlain.trim() ? encryptData(input.apiKeyPlain.trim()) : ''
    }
    if (input.baseUrl !== undefined) providerInput.baseUrl = input.baseUrl
    if (input.defaultModel !== undefined) providerInput.defaultModel = input.defaultModel
    if (input.providerEnabled !== undefined) providerInput.enabled = input.providerEnabled
    a.saveProvider(providerInput)
    a.saveGlobalConfig({
      monthlyBudgetYuan: input.monthlyBudgetYuan,
      blockOnOverage: input.blockOnOverage,
      enabled: input.enabled,
    })
    providers.value = a.listProviders()
    providerConfig.value = a.getProviderConfig()
  }

  /** 切换当前生效 provider（并刷新 providerConfig 视图） */
  async function setActiveProvider(code: string) {
    await ensureDb()
    const a = api()
    a.setActiveProvider(code)
    providerConfig.value = a.getProviderConfig()
  }

  /** 测试 DeepSeek 连接（用已配置的密文 Key 调一次最小问答，明文 Key 不进渲染进程） */
  async function testConnection(): Promise<{ ok: boolean; message: string }> {
    testing.value = true
    try {
      await ensureDb()
      const cfg = api().getProviderConfig()
      if (!cfg.apiKeyEnc) {
        lastTestResult.value = { ok: false, message: '尚未配置 API Key，请先填写并保存。' }
        return lastTestResult.value
      }
      const res = await window.electronAPI.aiChat({
        encKey: cfg.apiKeyEnc,
        messages: [{ role: 'user', content: '请回复"连接正常"四个字。' }],
        systemPrompt: '你是连通性测试助手，请极简回复。',
        model: cfg.defaultModel,
        baseUrl: cfg.baseUrl,
        supportsThinking: cfg.supportsThinking,
        providerName: cfg.providerName,
      })
      if (res.success) {
        lastTestResult.value = { ok: true, message: '连接成功：' + (res.content?.trim().slice(0, 40) || '已响应') }
      } else {
        lastTestResult.value = { ok: false, message: res.error || '连接失败' }
      }
      return lastTestResult.value
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      lastTestResult.value = { ok: false, message }
      return lastTestResult.value
    } finally {
      testing.value = false
    }
  }

  async function saveAgent(input: Parameters<AIApi['saveAgent']>[0]) {
    await ensureDb()
    api().saveAgent(input)
    agents.value = api().listAgents()
  }

  async function deleteAgent(id: number) {
    await ensureDb()
    api().deleteAgent(id)
    agents.value = api().listAgents()
  }

  // ==================== Phase 4：会话与流式 ====================
  const currentAgentCode = ref('')
  const currentSessionId = ref<number | null>(null)
  const currentMessages = ref<AiChatMessage[]>([])
  const streamingContent = ref('')
  const sending = ref(false)
  const lastError = ref('')
  /** 本次 sendChat 的工具调用步骤（仅 sending 期间有值，供 UI 展示气泡；不入库） */
  const toolSteps = ref<ToolStep[]>([])

  // ==================== 会话隔离（按登录用户）====================
  type SessionRow = {
    id: number
    agent_code: string
    title: string
    message_count: number
    created_at: string
    updated_at: string
  }
  type AllSessionRow = SessionRow & { user_id: number | null; username: string | null; role: string | null }
  const sessions = ref<SessionRow[]>([])
  const allSessions = ref<AllSessionRow[]>([])

  function currentUserId(): number {
    return useAuthStore().user?.id || 0
  }
  function isAdmin(): boolean {
    return useAuthStore().isAdmin
  }

  const currentAgent = computed(
    () => agents.value.find((a) => a.code === currentAgentCode.value) || null,
  )
  const canChat = computed(
    () =>
      !!providerConfig.value?.enabled &&
      !!providerConfig.value?.providerEnabled &&
      !!providerConfig.value?.apiKeyEnc &&
      !!currentAgent.value &&
      !sending.value,
  )
  const overBudget = computed(() => {
    const cfg = providerConfig.value
    if (!cfg || cfg.monthlyBudgetYuan <= 0) return false
    return monthUsage.value.costYuan >= cfg.monthlyBudgetYuan
  })

  function selectAgent(code: string) {
    currentAgentCode.value = code
    currentSessionId.value = null
    currentMessages.value = []
    streamingContent.value = ''
    lastError.value = ''
  }

  function newChat() {
    currentSessionId.value = null
    currentMessages.value = []
    streamingContent.value = ''
    lastError.value = ''
  }

  /** 加载当前用户的会话列表；无活动会话且有历史时，默认恢复最近一条 */
  async function loadSessions() {
    try {
      await ensureDb()
      const uid = currentUserId()
      if (!uid) {
        sessions.value = []
        return
      }
      sessions.value = api().listSessions(uid)
      if (!currentSessionId.value && sessions.value.length > 0) {
        await selectSession(sessions.value[0]!.id)
      }
    } catch (e) {
      console.error('[aiStore] 加载会话列表失败:', e)
    }
  }

  /** 切换到某历史会话：加载其消息并同步对应智能体 */
  async function selectSession(id: number) {
    try {
      await ensureDb()
      currentSessionId.value = id
      currentMessages.value = api().listMessages(id)
      streamingContent.value = ''
      lastError.value = ''
      const row = sessions.value.find((s) => s.id === id)
      if (row?.agent_code) currentAgentCode.value = row.agent_code
    } catch (e) {
      console.error('[aiStore] 加载会话消息失败:', e)
    }
  }

  /** 删除会话（教师删自己的；admin 经此删任意）；刷新列表与用量 */
  async function deleteSession(id: number) {
    await ensureDb()
    const a = api()
    // Phase 3：删除会话前清理其附件物理文件（DB 行→deleteManagedFile，失败仅日志不阻断）
    try {
      const msgs = a.listMessages(id)
      for (const m of msgs) {
        if (m.attachments) {
          for (const ref of m.attachments) {
            await aiAttachmentManager.deleteAttachment(ref).catch(() => {})
          }
        }
      }
    } catch (e) {
      console.warn('[aiStore] 清理会话附件失败:', e)
    }
    a.deleteSession(id)
    if (currentSessionId.value === id) {
      currentSessionId.value = null
      currentMessages.value = []
    }
    await loadSessions()
    if (isAdmin()) allSessions.value = a.listAllSessions()
    monthUsage.value = a.getMonthUsage()
  }

  /** admin 审计：读取任意会话的完整消息（只读，不影响当前会话状态） */
  async function getViewMessages(id: number): Promise<AiChatMessage[]> {
    await ensureDb()
    return api().listMessages(id)
  }

  /** 流式 chunk 回调（由 AiAssistant 组件 onMounted 注册的 ipcRenderer.on('ai:chunk') 调用） */
  function onChunk(delta: string) {
    if (delta) streamingContent.value += delta
  }

  /** 发送一条消息（流式）；失败返回 { ok:false, error }。
   *  attachments 为可选图片（Phase 3 vision）；documents 为可选文档（Phase 4，抽文本进 content）。 */
  async function sendChat(
    text: string,
    attachments?: File[],
    documents?: File[],
  ): Promise<{ ok: boolean; error?: string }> {
    const content = text.trim()
    const hasImages = !!attachments && attachments.length > 0
    const hasDocuments = !!documents && documents.length > 0
    if (!content && !hasImages && !hasDocuments) return { ok: false }
    if (!providerConfig.value?.enabled) return { ok: false, error: 'AI 智能体未启用。' }
    if (!providerConfig.value?.providerEnabled) {
      return { ok: false, error: '当前模型 provider 未启用，请在系统设置中启用后再试。' }
    }
    if (!providerConfig.value?.apiKeyEnc) {
      return { ok: false, error: '尚未配置 API Key，请在「系统设置 → AI 智能体」中配置。' }
    }
    if (!currentAgent.value) return { ok: false, error: '请先选择一个智能体。' }
    if (providerConfig.value.blockOnOverage && overBudget.value) {
      return {
        ok: false,
        error: `本月 AI 用量已达预算上限（${monthUsage.value.costYuan.toFixed(4)} / ${providerConfig.value.monthlyBudgetYuan} 元）。如需继续，请在系统设置调整预算或关闭截断。`,
      }
    }
    // Phase 3 vision 校验
    if (hasImages && !providerConfig.value.supportsVision) {
      return { ok: false, error: '当前模型不支持图片，请切换到支持视觉的模型（如豆包）。' }
    }
    if (attachments && attachments.some((f) => f.size > 5 * 1024 * 1024)) {
      return { ok: false, error: '图片不能超过 5MB，请压缩或换图。' }
    }
    if (attachments && attachments.some((f) => f.size >= 1024 * 1024)) {
      ElMessage.warning('图片较大，可能消耗较多额度。')
    }
    // Phase 4：文档体积上限（抽文本前先拦，避免对超大文件做无谓解析）
    if (documents && documents.some((f) => f.size > 10 * 1024 * 1024)) {
      return { ok: false, error: '单个文档不能超过 10MB。' }
    }

    await ensureDb()
    const a = api()

    if (!currentSessionId.value) {
      const uid = currentUserId()
      if (!uid) {
        return { ok: false, error: '未获取到登录用户，请重新登录后再试。' }
      }
      const titleBase = content || (hasImages ? '图片对话' : hasDocuments ? '文档对话' : '新对话')
      currentSessionId.value = a.createSession(currentAgent.value.code, uid, titleBase.slice(0, 20))
    }
    const sessionId = currentSessionId.value

    // Phase 3：落盘图片附件（supportsVision 已校验为 true），取元信息 refs + 当轮 dataUrl
    let attachmentRefs: AiAttachmentRef[] = []
    let attachmentDataUrls: string[] = []
    if (hasImages && attachments) {
      try {
        const saved = await Promise.all(
          attachments.map((f) => aiAttachmentManager.saveAttachment(f, sessionId)),
        )
        attachmentRefs = saved.map((s) => s.ref)
        attachmentDataUrls = saved.map((s) => s.dataUrl)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { ok: false, error: `图片保存失败：${msg}` }
      }
    }

    // Phase 4：落盘文档并抽取纯文本。文本拼进 content（持久化 + 跨轮重发天然带上）；
    // doc refs 并入 attachmentRefs（与图片同 attachments 列，GC/备份不区分类型）。
    let docBlocks = ''
    if (hasDocuments && documents) {
      try {
        const docResults = await Promise.all(
          documents.map((f) => aiAttachmentManager.saveDocument(f, sessionId)),
        )
        for (const d of docResults) {
          attachmentRefs.push(d.ref)
          docBlocks += `\n\n【文档《${d.ref.fileName}》内容${d.truncated ? '（已截断）' : ''}】\n${d.text}`
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return { ok: false, error: `文档处理失败：${msg}` }
      }
    }
    // 文档文本并入 user 消息内容（仅有文档无文字时给默认提示）
    const fullContent = docBlocks ? (content || '请阅读并分析以下文档内容。') + docBlocks : content

    // 入库 user 消息并加入当前列表（DB content 存纯文本，attachments 列存元信息）
    a.saveMessage({
      sessionId,
      role: 'user',
      content: fullContent,
      attachments: attachmentRefs.length > 0 ? attachmentRefs : null,
    })
    currentMessages.value.push({
      id: 0,
      sessionId,
      role: 'user',
      content: fullContent,
      attachments: attachmentRefs.length > 0 ? attachmentRefs : null,
      tokensPrompt: 0,
      tokensCompletion: 0,
      estCostYuan: 0,
      createdAt: new Date().toISOString(),
    })

    type HistoryMessage =
      | {
          role: 'user' | 'system'
          content:
            | string
            | Array<{ type: 'image_url'; image_url: { url: string } } | { type: 'text'; text: string }>
        }
      | { role: 'assistant'; content: string }

    const history: HistoryMessage[] = currentMessages.value.map((m): HistoryMessage => {
      if (m.role === 'assistant') return { role: 'assistant', content: m.content }
      return { role: m.role, content: m.content }
    })

    // Phase 3：最近1轮带图——把最后一个含【图片】附件的 user 消息 content 替换为多模态数组
    // （本轮新图用缓存 dataUrl；历史图当轮重读 base64）。文档附件文本已进 content（text part），不走 image_url。
    if (providerConfig.value.supportsVision) {
      for (let i = currentMessages.value.length - 1; i >= 0; i--) {
        const m = currentMessages.value[i]
        if (!m || m.role !== 'user' || !m.attachments || m.attachments.length === 0) continue
        const imgRefs = m.attachments.filter((r) => isImageFileExt(r.fileType))
        if (imgRefs.length === 0) continue
        const histItem = history[i]
        if (!histItem || histItem.role === 'assistant') continue
        const isCurrent = i === currentMessages.value.length - 1
        const urls =
          isCurrent && attachmentDataUrls.length === imgRefs.length
            ? attachmentDataUrls
            : await Promise.all(imgRefs.map((r) => aiAttachmentManager.readAsDataUrl(r)))
        const parts: Array<
          { type: 'image_url'; image_url: { url: string } } | { type: 'text'; text: string }
        > = []
        imgRefs.forEach((r, j) => {
          if (urls[j]) parts.push({ type: 'image_url', image_url: { url: urls[j] } })
        })
        if (m.content) parts.push({ type: 'text', text: m.content })
        if (parts.length > 0) histItem.content = parts
        break
      }
    }

    sending.value = true
    streamingContent.value = ''
    lastError.value = ''
    toolSteps.value = []

    try {
      if (providerConfig.value.supportsToolCalls) {
        // Phase 2：function calling tool 循环（非流式，渲染端执行本地工具）
        const result = await runToolLoop({
          encKey: providerConfig.value.apiKeyEnc,
          baseUrl: providerConfig.value.baseUrl,
          model: providerConfig.value.defaultModel,
          systemPrompt: currentAgent.value.systemPrompt,
          supportsThinking: providerConfig.value.supportsThinking,
          providerName: providerConfig.value.providerName,
          messages: history,
          onToolStep: (step) => {
            toolSteps.value.push(step)
          },
        })
        const usage: DeepSeekUsage | null = result.usage || null
        const finalContent = result.content
        a.saveMessage({ sessionId, role: 'assistant', content: finalContent, usage })
        currentMessages.value.push({
          id: 0,
          sessionId,
          role: 'assistant',
          content: finalContent,
          attachments: null,
          tokensPrompt: usage?.promptTokens || 0,
          tokensCompletion: usage?.completionTokens || 0,
          estCostYuan: estimateCostYuan(usage),
          createdAt: new Date().toISOString(),
        })
        monthUsage.value = a.getMonthUsage()
        await loadSessions()
        if (isAdmin()) allSessions.value = a.listAllSessions()
        return { ok: true }
      }

      // 原流式路径（provider 不支持 tool_calls 时，行为与 Phase 1 一致）
      const res = await window.electronAPI.aiChat({
        encKey: providerConfig.value.apiKeyEnc,
        messages: history,
        systemPrompt: currentAgent.value.systemPrompt,
        model: providerConfig.value.defaultModel,
        baseUrl: providerConfig.value.baseUrl,
        stream: true,
        supportsThinking: providerConfig.value.supportsThinking,
        providerName: providerConfig.value.providerName,
      })

      if (res.success) {
        const finalContent = res.content || streamingContent.value
        const usage = (res.usage as DeepSeekUsage | null) || null
        a.saveMessage({ sessionId, role: 'assistant', content: finalContent, usage })
        currentMessages.value.push({
          id: 0,
          sessionId,
          role: 'assistant',
          content: finalContent,
          attachments: null,
          tokensPrompt: usage?.promptTokens || 0,
          tokensCompletion: usage?.completionTokens || 0,
          estCostYuan: estimateCostYuan(usage),
          createdAt: new Date().toISOString(),
        })
        monthUsage.value = a.getMonthUsage()
        await loadSessions()
        if (isAdmin()) allSessions.value = a.listAllSessions()
        return { ok: true }
      }

      lastError.value = res.error || '请求失败'
      return { ok: false, error: res.error }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      lastError.value = msg
      return { ok: false, error: msg }
    } finally {
      streamingContent.value = ''
      sending.value = false
    }
  }

  return {
    // Phase 3
    agents,
    providers,
    providerConfig,
    monthUsage,
    loading,
    testing,
    lastTestResult,
    isConfigured,
    enabledAgents,
    loadAll,
    reloadUsage,
    setActiveProvider,
    saveProviderConfig,
    testConnection,
    saveAgent,
    deleteAgent,
    // Phase 4
    currentAgentCode,
    currentSessionId,
    currentMessages,
    streamingContent,
    sending,
    lastError,
    toolSteps,
    currentAgent,
    canChat,
    overBudget,
    selectAgent,
    newChat,
    onChunk,
    sendChat,
    // 会话隔离与历史
    sessions,
    allSessions,
    loadSessions,
    selectSession,
    deleteSession,
    getViewMessages,
  }
})
