import { DatabaseAPI } from './api'

/**
 * AI 智能体子系统数据访问层。
 *
 * 负责 ai_agent / ai_chat_session / ai_chat_message 三张表的 CRUD，
 * 以及多 provider 配置（ai_provider 表 + system_config 全局 KV）。
 *
 * 安全边界：本文件只存/读 API Key 的【密文】（crypto.ts encryptData 加密），
 * 明文 Key 永远不进渲染进程——解密在 Electron Main 进程的 ai handler 里完成。
 * 详见 A4 AI 智能体接入计划。
 */

// ===== DeepSeek 估费常量（单位：元 / 百万 token）=====
// ⚠️ 价格会变，上线前按 DeepSeek 官网当时价目核对。
// 当前为 deepseek-v4-flash 官方价（2026-07 核对自 api-docs.deepseek.com/quick_start/pricing）：
//   输入缓存命中 0.02 / 缓存未命中 1 / 输出 2；deepseek-v4-pro 为 0.025 / 3 / 6。
//   注：deepseek-chat / deepseek-reasoner 模型名将于 2026-07-24 弃用，统一到 v4-flash / pro。
const DEEPSEEK_PRICE = {
  inputCacheMiss: 1,
  inputCacheHit: 0.02,
  output: 2,
} as const

// AI 全局配置在 system_config 表中的 key（per-provider 的连接/能力位在 ai_provider 表）
const CONFIG_KEY = {
  activeProvider: 'ai_active_provider', // 当前生效 provider code
  monthlyBudget: 'ai_monthly_budget_yuan', // 月度预算（元），默认 100
  blockOnOverage: 'ai_block_on_overage', // '1'/'0' 超预算是否硬截断
  enabled: 'ai_enabled', // '1'/'0' 总开关
} as const

const DEFAULTS = {
  activeProvider: 'deepseek',
  monthlyBudgetYuan: 100,
  blockOnOverage: false,
  enabled: true,
} as const

export interface AiAgent {
  id: number
  code: string
  name: string
  systemPrompt: string
  skillsConfig: Record<string, any> | null
  modelParams: Record<string, any> | null
  enabled: boolean
  sort: number
  createdAt: string
  updatedAt: string
}

/** 单个 provider 行（ai_provider 表） */
export interface AiProvider {
  id: number
  code: string
  name: string
  baseUrl: string
  apiKeyEnc: string // 密文；未配置时为 ''
  defaultModel: string
  supportsVision: boolean
  supportsToolCalls: boolean
  supportsThinking: boolean
  enabled: boolean
  sort: number
  createdAt: string
  updatedAt: string
}

/**
 * 当前生效 provider 的视图（供 store/UI/sendChat）：由 ai_provider.active 行 + 全局 KV 组合。
 * activeProviderCode、providerName、supportsVision/ToolCalls/Thinking、providerEnabled 来自 active provider 行；
 * monthlyBudgetYuan/blockOnOverage/enabled 来自 system_config 全局 KV。
 */
export interface AiProviderConfig {
  activeProviderCode: string
  providerName: string
  supportsVision: boolean
  supportsToolCalls: boolean
  supportsThinking: boolean
  providerEnabled: boolean // active provider 自身是否启用
  apiKeyEnc: string // 密文；未配置时为 ''
  baseUrl: string
  defaultModel: string
  monthlyBudgetYuan: number
  blockOnOverage: boolean
  enabled: boolean // 全局 AI 总开关
}

export interface AiChatMessage {
  id: number
  sessionId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  tokensPrompt: number
  tokensCompletion: number
  estCostYuan: number
  createdAt: string
}

/** DeepSeek chat completion 返回的 usage（映射后） */
export interface DeepSeekUsage {
  promptTokens?: number
  completionTokens?: number
  promptCacheHitTokens?: number
  promptCacheMissTokens?: number
}

/** 按 DeepSeek usage 估算单次花费（元），失败/无 usage 返回 0 */
export function estimateCostYuan(usage: DeepSeekUsage | null | undefined): number {
  if (!usage) return 0
  const prompt = Number(usage.promptTokens || 0)
  const completion = Number(usage.completionTokens || 0)
  const cacheHit = Number(usage.promptCacheHitTokens || 0)
  const cacheMiss = Math.max(0, prompt - cacheHit)
  const cost =
    (cacheMiss * DEEPSEEK_PRICE.inputCacheMiss) / 1_000_000 +
    (cacheHit * DEEPSEEK_PRICE.inputCacheHit) / 1_000_000 +
    (completion * DEEPSEEK_PRICE.output) / 1_000_000
  return Math.round(cost * 10000) / 10000 // 保留 4 位
}

function parseJsonObject(value: unknown): Record<string, any> | null {
  if (!value) return null
  if (typeof value === 'object') return value as Record<string, any>
  try {
    const parsed = JSON.parse(value as string)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : null
  } catch {
    return null
  }
}

function rowToAgent(row: any): AiAgent {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    systemPrompt: row.system_prompt || '',
    skillsConfig: parseJsonObject(row.skills_config),
    modelParams: parseJsonObject(row.model_params),
    enabled: Number(row.enabled) === 1,
    sort: Number(row.sort || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToProvider(row: any): AiProvider {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    baseUrl: row.base_url || '',
    apiKeyEnc: row.api_key_enc || '',
    defaultModel: row.default_model || '',
    supportsVision: Number(row.supports_vision) === 1,
    supportsToolCalls: Number(row.supports_tool_calls) === 1,
    supportsThinking: Number(row.supports_thinking) === 1,
    enabled: Number(row.enabled) === 1,
    sort: Number(row.sort || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class AIApi extends DatabaseAPI {
  // ==================== 智能体 ====================

  listAgents(): AiAgent[] {
    return this.query('SELECT * FROM ai_agent ORDER BY sort ASC, id ASC').map(rowToAgent)
  }

  listEnabledAgents(): AiAgent[] {
    return this.query('SELECT * FROM ai_agent WHERE enabled = 1 ORDER BY sort ASC, id ASC').map(rowToAgent)
  }

  getAgentByCode(code: string): AiAgent | null {
    const row = this.queryOne('SELECT * FROM ai_agent WHERE code = ?', [code])
    return row ? rowToAgent(row) : null
  }

  saveAgent(input: {
    code: string
    name: string
    systemPrompt: string
    skillsConfig?: Record<string, any> | null
    modelParams?: Record<string, any> | null
    enabled?: boolean
    sort?: number
  }): number {
    const skills = input.skillsConfig ? JSON.stringify(input.skillsConfig) : null
    const params = input.modelParams ? JSON.stringify(input.modelParams) : null
    const enabled = input.enabled === false ? 0 : 1
    const sort = input.sort ?? 0

    // 原子 upsert（同 setConfig 理由：避免 read-then-write 撞 ai_agent.code 的 UNIQUE）
    this.execute(
      `INSERT INTO ai_agent (code, name, system_prompt, skills_config, model_params, enabled, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         name = excluded.name,
         system_prompt = excluded.system_prompt,
         skills_config = excluded.skills_config,
         model_params = excluded.model_params,
         enabled = excluded.enabled,
         sort = excluded.sort,
         updated_at = CURRENT_TIMESTAMP`,
      [input.code, input.name, input.systemPrompt, skills, params, enabled, sort],
    )
    // 冲突走 UPDATE 时 last_insert_rowid() 不可靠，回查 id
    const row = this.queryOne('SELECT id FROM ai_agent WHERE code = ?', [input.code])
    return row ? Number(row.id) : this.getLastInsertId()
  }

  deleteAgent(id: number): boolean {
    return this.execute('DELETE FROM ai_agent WHERE id = ?', [id]) > 0
  }

  // ==================== Provider（多模型抽象：ai_provider 表 + 全局 KV）====================

  private getConfig(key: string): string | null {
    const row = this.queryOne('SELECT value FROM system_config WHERE key = ?', [key])
    return row ? String(row.value) : null
  }

  private setConfig(key: string, value: string): void {
    // 原子 upsert（单条 SQL）。原 read-then-write（SELECT 再 INSERT/UPDATE）在 sql.js
    // prepared-statement 下偶发 SELECT 查不到已存在行而误走 INSERT，撞 system_config.key
    // 的 UNIQUE 约束；改用 ON CONFLICT 一条完成 insert-or-update（与 training-session-writer 同款）。
    this.execute(
      `INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value],
    )
  }

  listProviders(): AiProvider[] {
    return this.query('SELECT * FROM ai_provider ORDER BY sort ASC, id ASC').map(rowToProvider)
  }

  getProviderByCode(code: string): AiProvider | null {
    const row = this.queryOne('SELECT * FROM ai_provider WHERE code = ?', [code])
    return row ? rowToProvider(row) : null
  }

  getActiveProviderCode(): string {
    return this.getConfig(CONFIG_KEY.activeProvider) || DEFAULTS.activeProvider
  }

  /** 切换当前生效 provider（system_config KV） */
  setActiveProvider(code: string): void {
    this.setConfig(CONFIG_KEY.activeProvider, code)
  }

  /** 保存单个 provider 的配置（per-provider：key/baseUrl/model/enabled/能力位） */
  saveProvider(input: {
    code: string
    apiKeyEnc?: string
    baseUrl?: string
    defaultModel?: string
    supportsVision?: boolean
    supportsToolCalls?: boolean
    supportsThinking?: boolean
    enabled?: boolean
    name?: string
  }): void {
    const sets: string[] = []
    const params: any[] = []
    if (input.apiKeyEnc !== undefined) {
      sets.push('api_key_enc = ?')
      params.push(input.apiKeyEnc)
    }
    if (input.baseUrl !== undefined) {
      sets.push('base_url = ?')
      params.push(input.baseUrl)
    }
    if (input.defaultModel !== undefined) {
      sets.push('default_model = ?')
      params.push(input.defaultModel)
    }
    if (input.supportsVision !== undefined) {
      sets.push('supports_vision = ?')
      params.push(input.supportsVision ? 1 : 0)
    }
    if (input.supportsToolCalls !== undefined) {
      sets.push('supports_tool_calls = ?')
      params.push(input.supportsToolCalls ? 1 : 0)
    }
    if (input.supportsThinking !== undefined) {
      sets.push('supports_thinking = ?')
      params.push(input.supportsThinking ? 1 : 0)
    }
    if (input.enabled !== undefined) {
      sets.push('enabled = ?')
      params.push(input.enabled ? 1 : 0)
    }
    if (input.name !== undefined) {
      sets.push('name = ?')
      params.push(input.name)
    }
    if (sets.length === 0) return
    sets.push('updated_at = CURRENT_TIMESTAMP')
    params.push(input.code)
    this.execute(`UPDATE ai_provider SET ${sets.join(', ')} WHERE code = ?`, params)
  }

  /** 保存全局 AI 配置（月度预算 / 超预算截断 / 总开关） */
  saveGlobalConfig(input: {
    monthlyBudgetYuan?: number
    blockOnOverage?: boolean
    enabled?: boolean
  }): void {
    if (input.monthlyBudgetYuan !== undefined) this.setConfig(CONFIG_KEY.monthlyBudget, String(input.monthlyBudgetYuan))
    if (input.blockOnOverage !== undefined) this.setConfig(CONFIG_KEY.blockOnOverage, input.blockOnOverage ? '1' : '0')
    if (input.enabled !== undefined) this.setConfig(CONFIG_KEY.enabled, input.enabled ? '1' : '0')
  }

  /** 当前生效 provider 的完整视图（active 行 + 全局 KV） */
  getProviderConfig(): AiProviderConfig {
    const activeCode = this.getActiveProviderCode()
    const provider = this.getProviderByCode(activeCode) || this.getProviderByCode(DEFAULTS.activeProvider)
    const monthlyBudgetYuan = Number(this.getConfig(CONFIG_KEY.monthlyBudget) || DEFAULTS.monthlyBudgetYuan)
    const blockOnOverage = this.getConfig(CONFIG_KEY.blockOnOverage) === '1'
    const enabled = this.getConfig(CONFIG_KEY.enabled) !== '0' // 默认启用
    if (!provider) {
      // ai_provider 表尚未种子（理论上 initializeAITables 已种子；兜底防 NPE）
      return {
        activeProviderCode: activeCode,
        providerName: activeCode,
        supportsVision: false,
        supportsToolCalls: false,
        supportsThinking: false,
        providerEnabled: false,
        apiKeyEnc: '',
        baseUrl: '',
        defaultModel: '',
        monthlyBudgetYuan,
        blockOnOverage,
        enabled,
      }
    }
    return {
      activeProviderCode: provider.code,
      providerName: provider.name,
      supportsVision: provider.supportsVision,
      supportsToolCalls: provider.supportsToolCalls,
      supportsThinking: provider.supportsThinking,
      providerEnabled: provider.enabled,
      apiKeyEnc: provider.apiKeyEnc,
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
      monthlyBudgetYuan,
      blockOnOverage,
      enabled,
    }
  }

  /** 仅返回当前生效 provider 的 API Key 密文，供 ai:chat IPC 传 Main 解密（渲染进程永不持有明文） */
  getApiKeyEncrypted(): string {
    const provider = this.getProviderByCode(this.getActiveProviderCode())
    return provider?.apiKeyEnc || ''
  }

  isProviderConfigured(): boolean {
    return !!this.getApiKeyEncrypted()
  }

  // ==================== 会话与消息 ====================

  createSession(agentCode: string, userId: number, title = '新对话'): number {
    this.execute(
      'INSERT INTO ai_chat_session (agent_code, user_id, title) VALUES (?, ?, ?)',
      [agentCode, userId, title],
    )
    return this.getLastInsertId()
  }

  /** 当前用户视角：只列自己的会话（按 updated_at 倒序，带消息数） */
  listSessions(userId: number, limit = 50): Array<{ id: number; agent_code: string; title: string; message_count: number; created_at: string; updated_at: string }> {
    return this.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM ai_chat_message m WHERE m.session_id = s.id) AS message_count
       FROM ai_chat_session s
       WHERE s.user_id = ?
       ORDER BY s.updated_at DESC
       LIMIT ?`,
      [userId, limit],
    )
  }

  /** admin 视角：全部会话（LEFT JOIN user 带用户名/角色），不过滤 user_id */
  listAllSessions(limit = 200): Array<{
    id: number
    user_id: number | null
    username: string | null
    role: string | null
    agent_code: string
    title: string
    message_count: number
    created_at: string
    updated_at: string
  }> {
    return this.query(
      `SELECT s.id, s.user_id, u.username, u.role, s.agent_code, s.title,
              (SELECT COUNT(*) FROM ai_chat_message m WHERE m.session_id = s.id) AS message_count,
              s.created_at, s.updated_at
       FROM ai_chat_session s
       LEFT JOIN user u ON u.id = s.user_id
       ORDER BY s.updated_at DESC
       LIMIT ?`,
      [limit],
    )
  }

  updateSessionTitle(id: number, title: string): void {
    this.execute('UPDATE ai_chat_session SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, id])
  }

  private touchSession(id: number): void {
    this.execute('UPDATE ai_chat_session SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id])
  }

  deleteSession(id: number): void {
    this.execute('DELETE FROM ai_chat_message WHERE session_id = ?', [id])
    this.execute('DELETE FROM ai_chat_session WHERE id = ?', [id])
  }

  listMessages(sessionId: number): AiChatMessage[] {
    const rows = this.query('SELECT * FROM ai_chat_message WHERE session_id = ? ORDER BY id ASC', [sessionId])
    return rows.map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      tokensPrompt: Number(r.tokens_prompt || 0),
      tokensCompletion: Number(r.tokens_completion || 0),
      estCostYuan: Number(r.est_cost_yuan || 0),
      createdAt: r.created_at,
    }))
  }

  saveMessage(input: {
    sessionId: number
    role: 'user' | 'assistant' | 'system'
    content: string
    usage?: DeepSeekUsage | null
  }): number {
    const tokensPrompt = Number(input.usage?.promptTokens || 0)
    const tokensCompletion = Number(input.usage?.completionTokens || 0)
    // 仅 assistant 回复计入花费（user 消息的 usage 为上一轮 assistant 的，不重复计）
    const estCost = input.role === 'assistant' ? estimateCostYuan(input.usage) : 0
    this.execute(
      `INSERT INTO ai_chat_message (session_id, role, content, tokens_prompt, tokens_completion, est_cost_yuan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.sessionId, input.role, input.content, tokensPrompt, tokensCompletion, estCost],
    )
    this.touchSession(input.sessionId)
    return this.getLastInsertId()
  }

  /** 本月（按 created_at 的 UTC YYYY-MM）累计花费与 assistant 消息数，用于额度展示/判断 */
  getMonthUsage(): { costYuan: number; assistantCount: number; period: string } {
    const period = new Date().toISOString().slice(0, 7) // YYYY-MM (UTC)，与 CURRENT_TIMESTAMP 对齐
    const row = this.queryOne(
      `SELECT COALESCE(SUM(est_cost_yuan), 0) AS cost, COUNT(*) AS cnt
       FROM ai_chat_message
       WHERE role = 'assistant' AND strftime('%Y-%m', created_at) = ?`,
      [period],
    )
    return {
      costYuan: Math.round(Number(row?.cost || 0) * 10000) / 10000,
      assistantCount: Number(row?.cnt || 0),
      period,
    }
  }
}

export default AIApi
