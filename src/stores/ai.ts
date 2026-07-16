import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  AIApi,
  estimateCostYuan,
  type AiAgent,
  type AiChatMessage,
  type AiProviderConfig,
  type DeepSeekUsage,
} from '@/database/ai-api'
import { encryptData } from '@/utils/crypto'
import { useAuthStore } from '@/stores/auth'

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
   * 保存 provider 配置。
   * - 传 apiKeyPlain（明文）：非空则加密存密文，空串则清除 Key；
   * - 不传 apiKeyPlain：保留已有 Key 不变；
   * - 其余字段直接 upsert。
   */
  async function saveProviderConfig(input: Partial<AiProviderConfig> & { apiKeyPlain?: string }) {
    await ensureDb()
    const a = api()
    const toUpsert: Partial<AiProviderConfig> = { ...input }
    if (input.apiKeyPlain !== undefined) {
      toUpsert.apiKeyEnc = input.apiKeyPlain.trim() ? encryptData(input.apiKeyPlain.trim()) : ''
      delete (toUpsert as Record<string, unknown>).apiKeyPlain
    }
    a.upsertProviderConfig(toUpsert)
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
    api().deleteSession(id)
    if (currentSessionId.value === id) {
      currentSessionId.value = null
      currentMessages.value = []
    }
    await loadSessions()
    if (isAdmin()) allSessions.value = api().listAllSessions()
    monthUsage.value = api().getMonthUsage()
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

  /** 发送一条消息（流式）；失败返回 { ok:false, error } */
  async function sendChat(text: string): Promise<{ ok: boolean; error?: string }> {
    const content = text.trim()
    if (!content) return { ok: false }
    if (!providerConfig.value?.enabled) return { ok: false, error: 'AI 智能体未启用。' }
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

    await ensureDb()
    const a = api()

    if (!currentSessionId.value) {
      const uid = currentUserId()
      if (!uid) {
        return { ok: false, error: '未获取到登录用户，请重新登录后再试。' }
      }
      currentSessionId.value = a.createSession(currentAgent.value.code, uid, content.slice(0, 20))
    }
    const sessionId = currentSessionId.value

    // 入库 user 消息并加入当前列表
    a.saveMessage({ sessionId, role: 'user', content })
    currentMessages.value.push({
      id: 0,
      sessionId,
      role: 'user',
      content,
      tokensPrompt: 0,
      tokensCompletion: 0,
      estCostYuan: 0,
      createdAt: new Date().toISOString(),
    })

    const history = currentMessages.value.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    sending.value = true
    streamingContent.value = ''
    lastError.value = ''

    try {
      const res = await window.electronAPI.aiChat({
        encKey: providerConfig.value.apiKeyEnc,
        messages: history,
        systemPrompt: currentAgent.value.systemPrompt,
        model: providerConfig.value.defaultModel,
        baseUrl: providerConfig.value.baseUrl,
        stream: true,
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
    providerConfig,
    monthUsage,
    loading,
    testing,
    lastTestResult,
    isConfigured,
    enabledAgents,
    loadAll,
    reloadUsage,
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
