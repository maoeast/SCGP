import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  AIApi,
  estimateCostYuan,
  type AiAgent,
  type AiProvider,
  type AiProviderModel,
  type AiChatMessage,
  type AiProviderConfig,
  type AiAttachmentRef,
  type AiSessionHistoryPage,
  type AiSessionHistoryQuery,
  type AiSkill,
  type AiAgentSkillBinding,
  type AiKnowledgeSkillInput,
  type DeepSeekUsage,
} from '@/database/ai-api'
import { useAuthStore } from '@/stores/auth'
import { runToolLoop } from '@/services/ai-tool-loop'
import { filterTools, type ToolStep } from '@/services/ai-tools'
import { aiAttachmentManager } from '@/utils/ai-attachment-manager'
import { ElMessage, ElMessageBox } from 'element-plus'

/** 图片附件扩展名集合（Phase 4：文档附件文本已进 content，多模态只把图片附件做成 image_url） */
const IMAGE_FILE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'])
function isImageFileExt(fileType: string): boolean {
  return IMAGE_FILE_EXTS.has((fileType || '').toLowerCase())
}

/**
 * provider /models 清单归一化后的单个模型选项（供「新增模型」下拉渲染 + 选中回填能力位）。
 * raw 来源是各 provider 的 OpenAI 兼容 GET /models 返回（Ark 富 metadata、DeepSeek 简版），字段可能缺失。
 */
export interface ProviderModelOption {
  id: string
  name: string
  domain: string
  status: string
  /** 过滤用：非生成/嵌入/路由类 + status≠Shutdown + task_type 含文本生成或 VQA */
  isChatModel: boolean
  supportsVision: boolean
  supportsToolCalls: boolean
  supportsThinking: boolean
  contextWindow?: number
}

interface AiSendChatOptions {
  editMessageId?: number
}

/** raw provider /models 条目 → 归一化 ProviderModelOption（防御各 provider 不同 shape，缺失字段走默认值） */
function mapToProviderModelOption(raw: Record<string, any>): ProviderModelOption {
  const id = String(raw?.id ?? '')
  const domain = String(raw?.domain ?? '')
  const status = String(raw?.status ?? '')
  const inputModalities: string[] = Array.isArray(raw?.modalities?.input_modalities)
    ? raw.modalities.input_modalities
    : []
  const tasks: string[] = Array.isArray(raw?.task_type) ? raw.task_type : []
  const excludedDomains = ['Embedding', 'ImageGeneration', 'VideoGeneration', '3DGeneration', 'Router']
  const isChatModel =
    id.length > 0 &&
    !excludedDomains.includes(domain) &&
    status !== 'Shutdown' &&
    (tasks.length === 0 || tasks.some((t) => t === 'TextGeneration' || t === 'VisualQuestionAnswering'))
  return {
    id,
    name: String(raw?.name ?? id),
    domain,
    status,
    isChatModel,
    supportsVision: inputModalities.includes('image'),
    supportsToolCalls: raw?.features?.tools?.function_calling === true,
    supportsThinking:
      typeof raw?.token_limits?.max_reasoning_token_length === 'number' || /thinking|reasoner|-r1\b/i.test(id),
    contextWindow: typeof raw?.token_limits?.context_window === 'number' ? raw.token_limits.context_window : undefined,
  }
}

/**
 * C07：首次发送前 AI 外发隐私告知文案。静态文案（无用户输入），用 HTML 列表清晰枚举外发范围。
 * 在 sendChat 入口经 ElMessageBox.confirm 展示，确认后按 userId 记忆，不再弹（可在系统设置重置）。
 */
const AI_PRIVACY_NOTICE_HTML = `
<div style="line-height:1.7">
  你即将向 <b>外部 AI 模型服务</b>发送内容进行处理。请知悉以下内容<b>会上传到云端</b>：
  <ul style="margin:8px 0;padding-left:22px">
    <li>你输入的<b>文本</b>；</li>
    <li>上传的<b>图片</b>（当模型支持视觉时）；</li>
    <li>上传文档（PDF / Word / Excel）<b>抽取出的文本</b>；</li>
    <li>当前智能体挂载的<b>专业知识技能</b>；</li>
    <li>AI 调用工具时读取的<b>学生、评估、训练、资源</b>等数据。</li>
  </ul>
  其中可能包含<b>学生身份、诊断结论、评估结果</b>等敏感信息，请确认内容适宜外发后再发送。<br/>
  确认后将按当前账号记忆，本次及后续对话不再提醒（可在系统设置重置）。
</div>
`

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
  const providerModels = ref<AiProviderModel[]>([])
  /** 工具型技能目录（Phase 5：agent 编辑对话框「挂载技能」多选项；5A 内静态，仅 loadAll 加载） */
  const toolSkills = ref<AiSkill[]>([])
  /** 知识型技能目录（Phase 5B：专业角色知识包；对话框「挂载技能」知识组选项） */
  const knowledgeSkills = ref<AiSkill[]>([])
  /** 知识技能完整目录（含停用项，仅技能库管理页使用）。 */
  const allKnowledgeSkills = ref<AiSkill[]>([])
  const providerConfig = ref<AiProviderConfig | null>(null)
  const monthUsage = ref<{ totalTokens: number; assistantCount: number; period: string }>({
    totalTokens: 0,
    assistantCount: 0,
    period: '',
  })
  const loading = ref(false)
  const testing = ref(false)
  const lastTestResult = ref<{ ok: boolean; message: string } | null>(null)
  /** 「拉取模型列表」进行中（新增模型对话框按钮 loading） */
  const fetchingModels = ref(false)

  const isConfigured = computed(() => !!providerConfig.value?.apiKeyEnc)
  const enabledAgents = computed(() => agents.value.filter((a) => a.enabled))

  function api(): AIApi {
    return new AIApi()
  }

  async function ensureDb() {
    const { initDatabase } = await import('@/database/init')
    await initDatabase()
  }

  async function migrateProviderSecrets(a = api()): Promise<void> {
    const loadedProviders = a.listProviders()
    for (const provider of loadedProviders) {
      if (!provider.apiKeyEnc) continue
      const result = await window.electronAPI.migrateAiApiKey(provider.apiKeyEnc)
      if (!result.success) {
        console.warn(`[aiStore] ${provider.code} API Key 迁移失败:`, result.error)
        continue
      }
      if (result.keyEnc !== undefined && result.keyEnc !== provider.apiKeyEnc) {
        a.saveProvider({ code: provider.code, apiKeyEnc: result.keyEnc })
      }
    }
  }

  async function loadAll() {
    loading.value = true
    try {
      await ensureDb()
      const a = api()
      await migrateProviderSecrets(a)
      agents.value = a.listAgents()
      providers.value = a.listProviders()
      providerModels.value = a.listProviderModels(a.getActiveProviderCode())
      toolSkills.value = a.listToolSkills()
      knowledgeSkills.value = a.listKnowledgeSkills()
      allKnowledgeSkills.value = a.listAllKnowledgeSkills()
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
   * 保存配置：写入【当前 active provider】的 key/baseUrl/当前模型（per-provider 行），
   * 以及全局的 token budget/enabled/blockOnOverage（system_config KV）。
   * - apiKeyPlain（明文）：非空交 Main safeStorage 加密，空串清除 Key，不传保留；
   * - baseUrl/defaultModel/学校 Key 归属元信息写入 active provider 行；
   * - monthlyBudgetTokens/blockOnOverage/enabled 写入全局 KV。
   */
  async function saveProviderConfig(input: {
    apiKeyPlain?: string
    keyOwnerName?: string
    keyLabel?: string
    keyExpiresAt?: string
    baseUrl?: string
    defaultModel?: string
    providerEnabled?: boolean
    monthlyBudgetTokens?: number
    blockOnOverage?: boolean
    enabled?: boolean
  }) {
    await ensureDb()
    const a = api()
    const code = a.getActiveProviderCode()
    const providerInput: {
      code: string
      apiKeyEnc?: string
      keyOwnerName?: string
      keyLabel?: string
      keyExpiresAt?: string
      baseUrl?: string
      defaultModel?: string
      enabled?: boolean
    } = { code }
    if (input.apiKeyPlain !== undefined) {
      const plainKey = input.apiKeyPlain.trim()
      if (plainKey) {
        const result = await window.electronAPI.protectAiApiKey(plainKey)
        if (!result.success || !result.keyEnc) {
          throw new Error(result.error || 'API Key 安全保存失败')
        }
        providerInput.apiKeyEnc = result.keyEnc
      } else {
        providerInput.apiKeyEnc = ''
      }
    }
    if (input.baseUrl !== undefined) providerInput.baseUrl = input.baseUrl
    if (input.keyOwnerName !== undefined) providerInput.keyOwnerName = input.keyOwnerName
    if (input.keyLabel !== undefined) providerInput.keyLabel = input.keyLabel
    if (input.keyExpiresAt !== undefined) providerInput.keyExpiresAt = input.keyExpiresAt
    if (input.defaultModel !== undefined) providerInput.defaultModel = input.defaultModel
    if (input.providerEnabled !== undefined) providerInput.enabled = input.providerEnabled
    a.saveProvider(providerInput)
    a.saveGlobalConfig({
      monthlyBudgetTokens: input.monthlyBudgetTokens,
      blockOnOverage: input.blockOnOverage,
      enabled: input.enabled,
    })
    providers.value = a.listProviders()
    providerModels.value = a.listProviderModels(code)
    providerConfig.value = a.getProviderConfig()
  }

  /** 切换当前生效 provider（并刷新 providerConfig 视图） */
  async function setActiveProvider(code: string) {
    await ensureDb()
    const a = api()
    a.setActiveProvider(code)
    providers.value = a.listProviders()
    providerModels.value = a.listProviderModels(code)
    providerConfig.value = a.getProviderConfig()
  }

  async function setActiveProviderModel(modelCode: string) {
    await ensureDb()
    const a = api()
    const providerCode = a.getActiveProviderCode()
    a.setActiveProviderModel(providerCode, modelCode)
    providers.value = a.listProviders()
    providerModels.value = a.listProviderModels(providerCode)
    providerConfig.value = a.getProviderConfig()
  }

  async function saveProviderModel(input: {
    id?: number
    code: string
    name: string
    modelId: string
    supportsVision?: boolean
    supportsToolCalls?: boolean
    supportsThinking?: boolean
    enabled?: boolean
    sort?: number
  }): Promise<number> {
    await ensureDb()
    const a = api()
    const providerCode = a.getActiveProviderCode()
    const id = a.saveProviderModel({ ...input, providerCode })
    providerModels.value = a.listProviderModels(providerCode)
    providerConfig.value = a.getProviderConfig()
    return id
  }

  async function deleteProviderModel(id: number) {
    await ensureDb()
    const a = api()
    const providerCode = a.getActiveProviderCode()
    const deleted = a.deleteProviderModel(id)
    providerModels.value = a.listProviderModels(providerCode)
    providerConfig.value = a.getProviderConfig()
    return deleted
  }

  /** 测试当前模型连接（用已配置的密文 Key 调一次最小问答，明文 Key 不进渲染进程） */
  async function testConnection(): Promise<{ ok: boolean; message: string }> {
    testing.value = true
    try {
      await ensureDb()
      const cfg = api().getProviderConfig()
      if (!cfg.apiKeyEnc) {
        lastTestResult.value = { ok: false, message: '尚未配置 API Key，请先填写并保存。' }
        return lastTestResult.value
      }
      if (!cfg.defaultModel) {
        lastTestResult.value = { ok: false, message: '尚未选择可用模型，请先配置并启用模型。' }
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

  /**
   * 拉取当前 provider 的 OpenAI 兼容模型清单（GET {baseUrl}/models），归一化后返回。
   * 明文 Key 不进渲染：只把密文 encKey 经 ai:list-models IPC 交 Main 解密后请求。
   * 厂商过滤（doubao-seed-/deepseek-）留在 UI 层；此处只剔除非对话类与 Shutdown。
   */
  async function listModels(): Promise<{ ok: boolean; models: ProviderModelOption[]; message: string }> {
    fetchingModels.value = true
    try {
      await ensureDb()
      const cfg = api().getProviderConfig()
      if (!cfg.apiKeyEnc) {
        return { ok: false, models: [], message: '尚未配置 API Key，请先填写并保存。' }
      }
      const res = await window.electronAPI.aiListModels({
        encKey: cfg.apiKeyEnc,
        baseUrl: cfg.baseUrl,
        providerName: cfg.providerName,
      })
      if (!res.success) {
        return { ok: false, models: [], message: res.error || '拉取失败' }
      }
      const models = (res.models ?? [])
        .map((raw) => mapToProviderModelOption(raw as Record<string, any>))
        .filter((m) => m.id.length > 0)
      return { ok: true, models, message: `已拉取 ${models.length} 个模型` }
    } catch (e) {
      return { ok: false, models: [], message: e instanceof Error ? e.message : String(e) }
    } finally {
      fetchingModels.value = false
    }
  }

  async function saveAgent(input: Parameters<AIApi['saveAgent']>[0]): Promise<number> {
    await ensureDb()
    const id = api().saveAgent(input)
    agents.value = api().listAgents()
    return id
  }

  async function deleteAgent(id: number) {
    await ensureDb()
    api().deleteAgent(id)
    agents.value = api().listAgents()
  }

  async function setAgentEnabled(id: number, enabled: boolean) {
    await ensureDb()
    api().setAgentEnabled(id, enabled)
    agents.value = api().listAgents()
  }

  // Phase 5：技能挂载（按 agent 过滤工具）
  async function getAgentSkillIds(agentId: number): Promise<number[]> {
    await ensureDb()
    return api().getAgentSkillIds(agentId)
  }

  async function getAgentSkillBindings(agentId: number): Promise<AiAgentSkillBinding[]> {
    await ensureDb()
    return api().getAgentSkillBindings(agentId)
  }

  async function setAgentSkills(agentId: number, skillIds: number[]) {
    await ensureDb()
    const a = api()
    a.setAgentSkills(agentId, skillIds)
    toolSkills.value = a.listToolSkills()
    knowledgeSkills.value = a.listKnowledgeSkills()
    allKnowledgeSkills.value = a.listAllKnowledgeSkills()
  }

  async function setAgentSkillBindings(agentId: number, bindings: AiAgentSkillBinding[]) {
    await ensureDb()
    const a = api()
    a.setAgentSkillBindings(agentId, bindings)
    toolSkills.value = a.listToolSkills()
    knowledgeSkills.value = a.listKnowledgeSkills()
    allKnowledgeSkills.value = a.listAllKnowledgeSkills()
  }

  async function saveKnowledgeSkill(input: AiKnowledgeSkillInput): Promise<number> {
    await ensureDb()
    const a = api()
    const id = a.saveKnowledgeSkill(input)
    knowledgeSkills.value = a.listKnowledgeSkills()
    allKnowledgeSkills.value = a.listAllKnowledgeSkills()
    return id
  }

  async function setKnowledgeSkillEnabled(id: number, enabled: boolean) {
    await ensureDb()
    const a = api()
    a.setKnowledgeSkillEnabled(id, enabled)
    knowledgeSkills.value = a.listKnowledgeSkills()
    allKnowledgeSkills.value = a.listAllKnowledgeSkills()
  }

  async function deleteKnowledgeSkill(id: number) {
    await ensureDb()
    const a = api()
    const deleted = a.deleteKnowledgeSkill(id)
    knowledgeSkills.value = a.listKnowledgeSkills()
    allKnowledgeSkills.value = a.listAllKnowledgeSkills()
    return deleted
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
    agent_name: string | null
    title: string
    message_count: number
    total_tokens: number
    created_at: string
    updated_at: string
  }
  type AllSessionRow = SessionRow & { user_id: number | null; username: string | null; role: string | null }
  const sessions = ref<SessionRow[]>([])
  const sessionTotal = ref(0)
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
    if (!cfg || cfg.monthlyBudgetTokens <= 0) return false
    return monthUsage.value.totalTokens >= cfg.monthlyBudgetTokens
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
        sessionTotal.value = 0
        return
      }
      sessions.value = api().listSessions(uid, 6)
      sessionTotal.value = api().countSessions(uid)
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
      const uid = currentUserId()
      const session = uid ? api().getSessionForUser(id, uid) : null
      if (!session) throw new Error('会话不存在或无权访问')
      currentSessionId.value = id
      currentMessages.value = api().listMessagesForUser(id, uid)
      streamingContent.value = ''
      lastError.value = ''
      currentAgentCode.value = session.agent_code
    } catch (e) {
      console.error('[aiStore] 加载会话消息失败:', e)
    }
  }

  async function loadMySessionHistory(query: AiSessionHistoryQuery = {}): Promise<AiSessionHistoryPage> {
    await ensureDb()
    const uid = currentUserId()
    if (!uid) return { items: [], total: 0 }
    return api().listSessionHistory(uid, query)
  }

  async function getMySessionMessages(id: number): Promise<AiChatMessage[]> {
    await ensureDb()
    const uid = currentUserId()
    if (!uid || !api().getSessionForUser(id, uid)) throw new Error('会话不存在或无权访问')
    return api().listMessagesForUser(id, uid)
  }

  async function cleanupDeletedSessionAttachments(
    a: AIApi,
    attachments: AiAttachmentRef[],
    warningMessage = '会话已删除，部分附件文件稍后可通过资源健康检查清理。',
  ): Promise<AiAttachmentRef[]> {
    const failed: AiAttachmentRef[] = []
    for (const ref of attachments) {
      try {
        if (a.countAttachmentReferences(ref.rel) > 0) continue
        const deleted = await aiAttachmentManager.deleteAttachment(ref)
        if (!deleted) failed.push(ref)
      } catch (error) {
        console.warn('[aiStore] 清理会话附件失败:', ref.rel, error)
        failed.push(ref)
      }
    }
    if (failed.length > 0) {
      ElMessage.warning(warningMessage)
    }
    return failed
  }

  async function deleteMySession(id: number): Promise<{ failedAttachments: AiAttachmentRef[] }> {
    await ensureDb()
    const uid = currentUserId()
    const a = api()
    if (!uid || !a.getSessionForUser(id, uid)) throw new Error('会话不存在或无权删除')
    const result = a.deleteSessionForUser(id, uid)
    if (!result.deleted) throw new Error('删除会话失败')
    const failedAttachments = await cleanupDeletedSessionAttachments(a, result.attachments)
    try {
      if (currentSessionId.value === id) {
        currentSessionId.value = null
        currentMessages.value = []
      }
      await loadSessions()
      if (isAdmin()) allSessions.value = a.listAllSessions()
      monthUsage.value = a.getMonthUsage()
      return { failedAttachments }
    } catch (error) {
      console.error('[aiStore] 删除会话后刷新状态失败:', error)
      throw error
    }
  }

  /** 删除会话（教师删自己的；admin 经此删任意）；刷新列表与用量 */
  async function deleteSession(id: number): Promise<{ failedAttachments: AiAttachmentRef[] }> {
    await ensureDb()
    const a = api()
    const result = a.deleteSession(id)
    if (!result.deleted) throw new Error('删除会话失败')
    const failedAttachments = await cleanupDeletedSessionAttachments(a, result.attachments)
    if (currentSessionId.value === id) {
      currentSessionId.value = null
      currentMessages.value = []
    }
    await loadSessions()
    if (isAdmin()) allSessions.value = a.listAllSessions()
    monthUsage.value = a.getMonthUsage()
    return { failedAttachments }
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
    options: AiSendChatOptions = {},
  ): Promise<{ ok: boolean; error?: string }> {
    const content = text.trim()
    const hasImages = !!attachments && attachments.length > 0
    const hasDocuments = !!documents && documents.length > 0
    const editMessageId = Number(options.editMessageId || 0)
    const isEditing = editMessageId > 0
    if ((!content && !hasImages && !hasDocuments) || (isEditing && !content)) return { ok: false }
    if (isEditing && (hasImages || hasDocuments)) {
      return { ok: false, error: '编辑消息时不能新增附件。' }
    }
    if (!providerConfig.value?.enabled) return { ok: false, error: 'AI 智能体未启用。' }
    if (!providerConfig.value?.providerEnabled) {
      return { ok: false, error: '当前模型 provider 未启用，请在系统设置中启用后再试。' }
    }
    if (!providerConfig.value?.apiKeyEnc) {
      return { ok: false, error: '尚未配置 API Key，请在「系统设置 → AI 智能体」中配置。' }
    }
    if (!providerConfig.value?.defaultModel) {
      return { ok: false, error: '尚未选择可用模型，请在「系统设置 → AI 智能体」中配置模型。' }
    }
    if (!currentAgent.value) return { ok: false, error: '请先选择一个智能体。' }
    if (providerConfig.value.blockOnOverage && overBudget.value) {
      return {
        ok: false,
        error: `本月 AI 用量已达额度上限（${monthUsage.value.totalTokens} / ${providerConfig.value.monthlyBudgetTokens} Tokens）。如需继续，请在系统设置调整额度或关闭截断。`,
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

    // C07：首次发送前隐私告知门禁（按 userId 记忆，确认一次后不再弹；取消则静默中止）
    const privacyUid = currentUserId()
    if (privacyUid && !a.isPrivacyAcked(privacyUid)) {
      try {
        await ElMessageBox.confirm(AI_PRIVACY_NOTICE_HTML, 'AI 外发隐私告知', {
          confirmButtonText: '我已知悉，继续发送',
          cancelButtonText: '取消发送',
          type: 'warning',
          dangerouslyUseHTMLString: true,
        })
        a.acknowledgePrivacy(privacyUid)
      } catch {
        return { ok: false } // 用户取消，静默中止本次发送（不弹错误）
      }
    }

    const uid = currentUserId()
    if (isEditing) {
      if (!uid || !currentSessionId.value) {
        return { ok: false, error: '当前会话不可编辑，请重新打开后再试。' }
      }
    } else if (!currentSessionId.value) {
      if (!uid) {
        return { ok: false, error: '未获取到登录用户，请重新登录后再试。' }
      }
      const titleBase = content || (hasImages ? '图片对话' : hasDocuments ? '文档对话' : '新对话')
      currentSessionId.value = a.createSession(currentAgent.value.code, uid, titleBase.slice(0, 20))
    }
    const sessionId = currentSessionId.value
    if (!sessionId) return { ok: false, error: '当前会话不可用，请重新打开后再试。' }

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

    if (isEditing) {
      const target = currentMessages.value.find((message) => message.id === editMessageId)
      if (!target || target.role !== 'user' || target.attachments?.length) {
        return { ok: false, error: '只能编辑当前会话最后一条不含附件的用户消息。' }
      }
      const result = a.editLastUserMessageForUser(sessionId, uid, editMessageId, fullContent)
      if (!result.updated) {
        return { ok: false, error: '消息已变化，请重新打开会话后再试。' }
      }
      await cleanupDeletedSessionAttachments(
        a,
        result.removedAttachments,
        '消息已更新，部分旧附件文件稍后可通过资源健康检查清理。',
      )
      currentMessages.value = a.listMessagesForUser(sessionId, uid)
      monthUsage.value = a.getMonthUsage()
      await loadSessions()
      if (isAdmin()) allSessions.value = a.listAllSessions()
    } else {
      // 入库 user 消息并加入当前列表（DB content 存纯文本，attachments 列存元信息）
      const userMessageId = a.saveMessage({
        sessionId,
        role: 'user',
        content: fullContent,
        attachments: attachmentRefs.length > 0 ? attachmentRefs : null,
      })
      currentMessages.value.push({
        id: userMessageId,
        sessionId,
        role: 'user',
        content: fullContent,
        attachments: attachmentRefs.length > 0 ? attachmentRefs : null,
        toolArtifacts: null,
        tokensPrompt: 0,
        tokensCompletion: 0,
        tokensTotal: 0,
        estCostYuan: 0,
        createdAt: new Date().toISOString(),
      })
    }

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

    // Phase 5B：把该 agent 挂载的知识型技能（专业方法论 Markdown）注入 systemPrompt
    const knowledgePrompt = a.getAgentKnowledgePrompt(currentAgent.value.id)
    const systemPrompt = knowledgePrompt
      ? `${currentAgent.value.systemPrompt}\n\n以下是你掌握的专业技能知识，请据此回答：\n\n${knowledgePrompt}`
      : currentAgent.value.systemPrompt
    try {
      if (providerConfig.value.supportsToolCalls) {
        // Phase 2：function calling tool 循环（非流式，渲染端执行本地工具）
        const result = await runToolLoop({
          encKey: providerConfig.value.apiKeyEnc,
          baseUrl: providerConfig.value.baseUrl,
          model: providerConfig.value.defaultModel,
          systemPrompt,
          supportsThinking: providerConfig.value.supportsThinking,
          providerName: providerConfig.value.providerName,
          messages: history,
          tools: filterTools(a.getAgentToolCodes(currentAgent.value.id)),
          onToolStep: (step) => {
            toolSteps.value.push(step)
          },
        })
        const usage: DeepSeekUsage | null = result.usage || null
        const finalContent = result.content
        // 路线 C：本轮工具产生的富产物（如评估趋势图），持久化到 assistant 消息
        const artifacts = result.artifacts && result.artifacts.length > 0 ? result.artifacts : null
        const assistantMessageId = a.saveMessage({
          sessionId,
          role: 'assistant',
          content: finalContent,
          usage,
          toolArtifacts: artifacts,
        })
        currentMessages.value.push({
          id: assistantMessageId,
          sessionId,
          role: 'assistant',
          content: finalContent,
          attachments: null,
          toolArtifacts: artifacts,
          tokensTotal: usage?.totalTokens || (usage?.promptTokens || 0) + (usage?.completionTokens || 0),
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
        systemPrompt,
        model: providerConfig.value.defaultModel,
        baseUrl: providerConfig.value.baseUrl,
        stream: true,
        supportsThinking: providerConfig.value.supportsThinking,
        providerName: providerConfig.value.providerName,
      })

      if (res.success) {
        const finalContent = res.content || streamingContent.value
        const usage = (res.usage as DeepSeekUsage | null) || null
        const assistantMessageId = a.saveMessage({
          sessionId,
          role: 'assistant',
          content: finalContent,
          usage,
        })
        currentMessages.value.push({
          id: assistantMessageId,
          sessionId,
          role: 'assistant',
          content: finalContent,
          attachments: null,
          toolArtifacts: null,
          tokensTotal: usage?.totalTokens || (usage?.promptTokens || 0) + (usage?.completionTokens || 0),
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

  /** 管理员：重置所有用户的 AI 隐私告知确认（清除全部 `ai:privacy_ack:user:*` KV），下次发送重新触发告知。返回清除条数。 */
  async function resetAllPrivacyAck(): Promise<number> {
    await ensureDb()
    return api().resetAllPrivacyAck()
  }

  return {
    // Phase 3
    agents,
    providers,
    providerModels,
    providerConfig,
    monthUsage,
    loading,
    testing,
    lastTestResult,
    fetchingModels,
    isConfigured,
    enabledAgents,
    loadAll,
    reloadUsage,
    setActiveProvider,
    setActiveProviderModel,
    saveProviderModel,
    deleteProviderModel,
    saveProviderConfig,
    testConnection,
    listModels,
    saveAgent,
    deleteAgent,
    setAgentEnabled,
    toolSkills,
    knowledgeSkills,
    allKnowledgeSkills,
    getAgentSkillIds,
    getAgentSkillBindings,
    setAgentSkills,
    setAgentSkillBindings,
    saveKnowledgeSkill,
    setKnowledgeSkillEnabled,
    deleteKnowledgeSkill,
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
    sessionTotal,
    allSessions,
    loadSessions,
    selectSession,
    loadMySessionHistory,
    getMySessionMessages,
    deleteMySession,
    deleteSession,
    getViewMessages,
    // C07：隐私告知管理
    resetAllPrivacyAck,
  }
})
