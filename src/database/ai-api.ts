import { DatabaseAPI } from './api'
import { buildKnowledgeSkillContent } from '@/data/skills/knowledge-skill-payload'
import { isBuiltinAgentCode } from '@/data/ai-agent-presets'
import type { ToolArtifact } from '@/services/ai-tools'

/**
 * AI 智能体子系统数据访问层。
 *
 * 负责 ai_agent / ai_chat_session / ai_chat_message 三张表的 CRUD，
 * 以及多 provider 配置（ai_provider 表 + system_config 全局 KV）。
 *
 * 安全边界：本文件只存/读 API Key 的【密文】（Electron Main safeStorage 加密）。
 * 明文 Key 只经 preload IPC 送入 Main 保护；对话时也只在 Electron Main 解密使用。
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
  monthlyBudgetTokens: 'ai_monthly_budget_tokens', // 月度预算（token），默认 1000 万
  monthlyBudgetYuanLegacy: 'ai_monthly_budget_yuan', // 历史字段，仅兼容旧库读取
  blockOnOverage: 'ai_block_on_overage', // '1'/'0' 超预算是否硬截断
  enabled: 'ai_enabled', // '1'/'0' 总开关
} as const

const DEFAULTS = {
  activeProvider: 'deepseek',
  monthlyBudgetTokens: 10_000_000,
  blockOnOverage: true,
  enabled: true,
} as const

const MAX_MONTHLY_BUDGET_TOKENS = DEFAULTS.monthlyBudgetTokens

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

/** 技能目录行（ai_skill 表）。 */
export interface AiSkill {
  id: number
  code: string
  name: string
  description: string
  kind: 'tool' | 'knowledge'
  toolCode: string | null
  knowledgePayload: Record<string, any> | null
  promptTemplate: string | null
  sourceType: 'tool' | 'builtin' | 'custom'
  sourceUrl: string
  license: string
  evidenceLevel: string
  riskLevel: string
  audience: string
  enabled: boolean
  sort: number
  createdAt: string
  updatedAt: string
}

/** agent↔技能绑定；知识型技能可在每个 agent 上选择需要注入的 references。 */
export interface AiAgentSkillBinding {
  skillId: number
  /** null = 全部引用（兼容 Phase 5B 旧绑定）；[] = 仅主体。 */
  referenceIds?: string[] | null
}

export interface AiKnowledgeSkillInput {
  id?: number
  /** 自定义技能的短编号（仅字母、数字、连字符；存储时会加 knowledge_custom_ 前缀）。 */
  code: string
  name: string
  description: string
  body: string
  sourceUrl?: string
  license?: string
  evidenceLevel?: string
  riskLevel?: string
  audience?: string
  enabled?: boolean
}

/** 单个 provider 行（ai_provider 表） */
export interface AiProvider {
  id: number
  code: string
  name: string
  baseUrl: string
  apiKeyEnc: string // 密文；未配置时为 ''
  keyOwnerName: string
  keyLabel: string
  keyExpiresAt: string
  defaultModel: string
  supportsVision: boolean
  supportsToolCalls: boolean
  supportsThinking: boolean
  enabled: boolean
  sort: number
  createdAt: string
  updatedAt: string
}

/** 单个 provider 下可选的模型 / 推理接入点。 */
export interface AiProviderModel {
  id: number
  providerCode: string
  code: string
  name: string
  modelId: string
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
 * activeProviderCode、providerName、providerEnabled 来自 active provider 行；
 * 模型 ID 与 supportsVision/ToolCalls/Thinking 优先来自 active provider 下的当前模型，缺失时回退 provider 行；
 * monthlyBudgetYuan/blockOnOverage/enabled 来自 system_config 全局 KV。
 */
export interface AiProviderConfig {
  activeProviderCode: string
  providerName: string
  activeModelCode: string
  activeModelName: string
  supportsVision: boolean
  supportsToolCalls: boolean
  supportsThinking: boolean
  providerEnabled: boolean // active provider 自身是否启用
  apiKeyEnc: string // 密文；未配置时为 ''
  keyOwnerName: string
  keyLabel: string
  keyExpiresAt: string
  baseUrl: string
  defaultModel: string
  monthlyBudgetTokens: number
  blockOnOverage: boolean
  enabled: boolean // 全局 AI 总开关
}

/** AI 聊天附件元信息（存 ai_chat_message.attachments JSON 列；不含 base64 dataUrl） */
export interface AiAttachmentRef {
  rel: string
  fileName: string
  fileType: string
  sizeBytes: number
}

/** 安全解析 attachments JSON 列（脏数据返回 null，不抛） */
function parseAttachmentRefs(raw: unknown): AiAttachmentRef[] | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AiAttachmentRef[]) : null
  } catch {
    return null
  }
}

/** 安全解析 tool_artifacts JSON 列（脏数据返回 null，不抛；向下兼容旧消息无此列） */
function parseToolArtifacts(raw: unknown): ToolArtifact[] | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ToolArtifact[]) : null
  } catch {
    return null
  }
}

export interface AiChatMessage {
  id: number
  sessionId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  /** 附件元信息（JSON 解析后；无附件为 null） */
  attachments: AiAttachmentRef[] | null
  /** 本条 assistant 回复关联的工具富产物（路线 C，如图表；无产物为 null） */
  toolArtifacts: ToolArtifact[] | null
  /** 记忆设计 v4.1：投递状态（''=legacy completed / streaming / completed / cancelled / failed） */
  deliveryStatus: string
  /** 消息类型（''=final / final / tool_call / tool_result） */
  messageKind: string
  tokensTotal: number
  tokensPrompt: number
  tokensCompletion: number
  estCostYuan: number
  createdAt: string
}

// ==================== 学生级长期记忆类型（v4.1） ====================

export type AiMemoryCategory = 'observation' | 'preference' | 'advice_given' | 'follow_up'
export type AiMemoryStatus = 'pending' | 'confirmed' | 'rejected' | 'superseded' | 'archived'
export type AiMemoryPriority = 'normal' | 'pinned' | 'safety_critical'
export type AiMemoryConfidence = 'observed' | 'assumed'

export interface AiStudentMemory {
  id: number
  studentId: number
  userId: number
  createdByType: 'teacher' | 'ai' | 'system'
  agentCode: string
  sessionId: number | null
  sourceMessageId: number | null
  category: AiMemoryCategory
  content: string
  confidence: AiMemoryConfidence
  status: AiMemoryStatus
  priority: AiMemoryPriority
  priorityNote: string
  confirmedByUserId: number | null
  confirmedAt: string | null
  effectiveAt: string
  expiresAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AiMemorySummaryBatch {
  id: number
  sessionId: number
  batchId: string
  studentId: number
  fromMessageId: number
  toMessageId: number
  inputHash: string
  state: 'pending' | 'summarizing' | 'done' | 'failed' | 'cancelled'
  leaseUntil: string | null
  attemptCount: number
  lastError: string
  createdAt: string
}

export interface AiSessionDeleteResult {
  deleted: boolean
  attachments: AiAttachmentRef[]
}

export interface AiMessageEditResult {
  updated: boolean
  removedAttachments: AiAttachmentRef[]
}

/** 当前用户可见的会话摘要。 */
export interface AiChatSession {
  id: number
  agent_code: string
  agent_name: string | null
  title: string
  /** 绑定的学生（M4：会话-学生绑定；无绑定为 null/缺省） */
  studentId?: number | null
  message_count: number
  total_tokens: number
  created_at: string
  updated_at: string
}

export interface AiSessionHistoryQuery {
  page?: number
  pageSize?: number
  agentCode?: string
  keyword?: string
  updatedFrom?: string
  updatedTo?: string
}

export interface AiSessionHistoryPage {
  items: AiChatSession[]
  total: number
}

/** OpenAI 兼容 provider chat completion 返回的 usage（映射后） */
export interface DeepSeekUsage {
  totalTokens?: number
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

/** 知识型技能注入 systemPrompt 的总字符上限（~30k token；超出截断防上下文爆炸） */
const MAX_KNOWLEDGE_PROMPT_CHARS = 120000

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

function rowToSkill(row: any): AiSkill {
  const sourceType =
    row.kind === 'tool' ? 'tool' : row.source_type === 'custom' ? 'custom' : 'builtin'
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    kind: row.kind === 'knowledge' ? 'knowledge' : 'tool',
    toolCode: row.tool_code != null ? String(row.tool_code) : null,
    knowledgePayload: parseJsonObject(row.knowledge_payload),
    promptTemplate: row.prompt_template != null ? String(row.prompt_template) : null,
    sourceType,
    sourceUrl: row.source_url || '',
    license: row.license || '',
    evidenceLevel: row.evidence_level || '未标注',
    riskLevel: row.risk_level || '常规',
    audience: row.audience || '教师',
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
    keyOwnerName: row.key_owner_name || '',
    keyLabel: row.key_label || '',
    keyExpiresAt: row.key_expires_at || '',
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

function rowToProviderModel(row: any): AiProviderModel {
  return {
    id: Number(row.id),
    providerCode: row.provider_code || '',
    code: row.code || '',
    name: row.name || '',
    modelId: row.model_id || '',
    supportsVision: Number(row.supports_vision) === 1,
    supportsToolCalls: Number(row.supports_tool_calls) === 1,
    supportsThinking: Number(row.supports_thinking) === 1,
    enabled: Number(row.enabled) === 1,
    sort: Number(row.sort || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function dedupeAttachmentRefs(refs: AiAttachmentRef[]): AiAttachmentRef[] {
  const seen = new Set<string>()
  const result: AiAttachmentRef[] = []
  for (const ref of refs) {
    if (!ref?.rel || seen.has(ref.rel)) continue
    seen.add(ref.rel)
    result.push(ref)
  }
  return result
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
    if (isBuiltinAgentCode(input.code)) {
      throw new Error('内置智能体由系统维护，只允许启用或停用')
    }
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

  /** 内置与自定义智能体统一使用的窄范围启停操作，不改提示词、排序或技能绑定。 */
  setAgentEnabled(id: number, enabled: boolean): boolean {
    return this.execute(
      'UPDATE ai_agent SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [enabled ? 1 : 0, id],
    ) > 0
  }

  deleteAgent(id: number): boolean {
    const row = this.queryOne('SELECT code FROM ai_agent WHERE id = ?', [id])
    if (row && isBuiltinAgentCode(String(row.code))) return false
    // FK CASCADE 可能未启用（sql.js 默认 PRAGMA foreign_keys=OFF），显式清绑定防孤儿
    this.execute('DELETE FROM ai_agent_skill WHERE agent_id = ?', [id])
    return this.execute('DELETE FROM ai_agent WHERE id = ?', [id]) > 0
  }

  // ==================== 技能与挂载（Phase 5：按 agent 挂载工具）====================

  /** 全部启用的工具型技能（UI 多选项；本期只有 tool 型） */
  listToolSkills(): AiSkill[] {
    return this.query(
      `SELECT * FROM ai_skill WHERE kind = 'tool' AND enabled = 1 ORDER BY sort ASC, id ASC`,
    ).map(rowToSkill)
  }

  /** agent 已绑定且启用的 skill_id 列表（UI 回填多选用） */
  getAgentSkillIds(agentId: number): number[] {
    return this.query(
      `SELECT skill_id FROM ai_agent_skill WHERE agent_id = ? AND enabled = 1 ORDER BY sort ASC`,
      [agentId],
    ).map((r: any) => Number(r.skill_id))
  }

  /** agent 已绑定技能及其引用选择；供编辑对话框回填。 */
  getAgentSkillBindings(agentId: number): AiAgentSkillBinding[] {
    return this.query(
      `SELECT skill_id, config FROM ai_agent_skill WHERE agent_id = ? AND enabled = 1 ORDER BY sort ASC`,
      [agentId],
    ).map((row: any) => {
      const config = parseJsonObject(row.config)
      const rawReferenceIds = config?.referenceIds
      const referenceIds = Array.isArray(rawReferenceIds)
        ? rawReferenceIds.filter((id): id is string => typeof id === 'string')
        : null
      return { skillId: Number(row.skill_id), referenceIds }
    })
  }

  /** agent 可用工具的 tool_code 列表（sendChat 过滤 AI_TOOLS 用） */
  getAgentToolCodes(agentId: number): string[] {
    return this.query(
      `SELECT s.tool_code AS tool_code
         FROM ai_agent_skill x
         JOIN ai_skill s ON s.id = x.skill_id
        WHERE x.agent_id = ? AND x.enabled = 1 AND s.enabled = 1
          AND s.kind = 'tool' AND s.tool_code IS NOT NULL
        ORDER BY x.sort ASC`,
      [agentId],
    )
      .map((r: any) => (r.tool_code != null ? String(r.tool_code) : null))
      .filter((c: string | null): c is string => !!c)
  }

  /** 整体替换 agent 的技能绑定（事务：删全部 → 插入选中）。UI 保存用。 */
  setAgentSkills(agentId: number, skillIds: number[]): void {
    this.setAgentSkillBindings(agentId, skillIds.map((skillId) => ({ skillId })))
  }

  /** 整体替换 agent 的技能绑定（含每个知识技能的引用选择）。 */
  setAgentSkillBindings(agentId: number, bindings: AiAgentSkillBinding[]): void {
    const rawDb = typeof this.db?.getRawDB === 'function' ? this.db.getRawDB() : this.db
    rawDb.run('BEGIN TRANSACTION')
    try {
      this.execute('DELETE FROM ai_agent_skill WHERE agent_id = ?', [agentId])
      bindings.forEach((binding, i) => {
        const config = binding.referenceIds === undefined ? null : JSON.stringify({ referenceIds: binding.referenceIds })
        this.execute(
          `INSERT OR IGNORE INTO ai_agent_skill (agent_id, skill_id, enabled, sort, config) VALUES (?, ?, 1, ?, ?)`,
          [agentId, binding.skillId, i, config],
        )
      })
      rawDb.run('COMMIT')
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        /* ignore rollback failures */
      }
      throw error
    }
  }

  // ---- 知识型技能（Phase 5B：专业角色知识包，注入 systemPrompt）----

  /** 全部启用的知识型技能（UI 多选项「知识」组） */
  listKnowledgeSkills(): AiSkill[] {
    return this.query(
      `SELECT * FROM ai_skill WHERE kind = 'knowledge' AND enabled = 1 ORDER BY sort ASC, id ASC`,
    ).map(rowToSkill)
  }

  /** 全部知识技能（含停用项），仅技能库管理页使用。 */
  listAllKnowledgeSkills(): AiSkill[] {
    return this.query(`SELECT * FROM ai_skill WHERE kind = 'knowledge' ORDER BY sort ASC, id ASC`).map(rowToSkill)
  }

  /** 新建或更新本地自定义知识技能；内置技能正文由 src/data/skills 管理，不允许在 DB 覆盖。 */
  saveKnowledgeSkill(input: AiKnowledgeSkillInput): number {
    const rawCode = input.code.trim()
    const code = rawCode.startsWith('knowledge_custom_') ? rawCode : `knowledge_custom_${rawCode}`
    if (!/^knowledge_custom_[a-z0-9-]+$/.test(code)) {
      throw new Error('技能编号仅支持小写字母、数字和连字符')
    }
    if (!input.name.trim() || !input.body.trim()) {
      throw new Error('请填写技能名称和知识正文')
    }

    const metadata = {
      sourceType: 'custom' as const,
      sourceUrl: input.sourceUrl?.trim() || '',
      license: input.license?.trim() || 'SCGP-local',
      evidenceLevel: input.evidenceLevel?.trim() || '实践经验',
      riskLevel: input.riskLevel?.trim() || '常规',
      audience: input.audience?.trim() || '教师',
    }
    const payload = JSON.stringify({ body: input.body.trim(), references: [], metadata })
    const enabled = input.enabled === false ? 0 : 1

    if (input.id) {
      const existing = this.queryOne(`SELECT source_type FROM ai_skill WHERE id = ? AND kind = 'knowledge'`, [input.id])
      if (!existing) throw new Error('知识技能不存在')
      if (existing.source_type !== 'custom') throw new Error('内置知识技能请在 src/data/skills 中维护')
      this.execute(
        `UPDATE ai_skill
            SET name = ?, description = ?, knowledge_payload = ?, source_url = ?, license = ?,
                evidence_level = ?, risk_level = ?, audience = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          input.name.trim(),
          input.description.trim(),
          payload,
          metadata.sourceUrl,
          metadata.license,
          metadata.evidenceLevel,
          metadata.riskLevel,
          metadata.audience,
          enabled,
          input.id,
        ],
      )
      return input.id
    }

    this.execute(
      `INSERT INTO ai_skill
         (code, name, description, kind, knowledge_payload, source_type, source_url, license,
          evidence_level, risk_level, audience, enabled, sort)
       VALUES (?, ?, ?, 'knowledge', ?, 'custom', ?, ?, ?, ?, ?, ?, 999)`,
      [
        code,
        input.name.trim(),
        input.description.trim(),
        payload,
        metadata.sourceUrl,
        metadata.license,
        metadata.evidenceLevel,
        metadata.riskLevel,
        metadata.audience,
        enabled,
      ],
    )
    return this.getLastInsertId()
  }

  /** 内置与自定义知识技能均可启停；停用后不会出现在挂载选项或 systemPrompt。 */
  setKnowledgeSkillEnabled(id: number, enabled: boolean): void {
    this.execute(
      `UPDATE ai_skill SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND kind = 'knowledge'`,
      [enabled ? 1 : 0, id],
    )
  }

  /** 仅允许删除本地自定义技能，内置技能由代码目录与启动种子维护。 */
  deleteKnowledgeSkill(id: number): boolean {
    const existing = this.queryOne(`SELECT source_type FROM ai_skill WHERE id = ? AND kind = 'knowledge'`, [id])
    if (!existing) return false
    if (existing.source_type !== 'custom') throw new Error('内置知识技能不能删除')
    this.execute('DELETE FROM ai_agent_skill WHERE skill_id = ?', [id])
    return this.execute('DELETE FROM ai_skill WHERE id = ?', [id]) > 0
  }

  /**
   * 拼接该 agent 挂载的知识型技能正文（注入 systemPrompt 用）。
   * 每技能正文 = knowledge_payload.content（SKILL.md 主体 + references），多技能以分隔线串联。
   * 总字符上限 MAX_KNOWLEDGE_PROMPT_CHARS（~30k token）截断并标注，防上下文爆炸。
   */
  getAgentKnowledgePrompt(agentId: number): string {
    const rows = this.query(
      `SELECT s.name, s.knowledge_payload, x.config AS binding_config
         FROM ai_agent_skill x
         JOIN ai_skill s ON s.id = x.skill_id
        WHERE x.agent_id = ? AND x.enabled = 1 AND s.enabled = 1
          AND s.kind = 'knowledge' AND s.knowledge_payload IS NOT NULL
        ORDER BY x.sort ASC`,
      [agentId],
    )
    if (!rows.length) return ''
    const parts = rows
      .map((r: any) => {
        const payload = parseJsonObject(r.knowledge_payload)
        const bindingConfig = parseJsonObject(r.binding_config)
        const referenceIds = Array.isArray(bindingConfig?.referenceIds)
          ? bindingConfig.referenceIds.filter((id): id is string => typeof id === 'string')
          : null
        const content = buildKnowledgeSkillContent(payload, referenceIds)
        return content ? `## 专业技能：${r.name}\n\n${content}` : ''
      })
      .filter(Boolean)
    const full = parts.join('\n\n---\n\n')
    if (full.length > MAX_KNOWLEDGE_PROMPT_CHARS) {
      return (
        full.slice(0, MAX_KNOWLEDGE_PROMPT_CHARS) +
        `\n\n[...专业技能知识已截断，原始 ${full.length} 字符]`
      )
    }
    return full
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

  // ==================== Privacy consent（首次发送前隐私告知，按 userId 记忆）====================

  /** 该用户是否已确认 AI 外发隐私告知（首次发送前弹 confirm，确认后不再弹）。 */
  isPrivacyAcked(userId: number): boolean {
    return this.getConfig(`ai:privacy_ack:user:${userId}`) != null
  }

  /** 标记该用户已确认隐私告知（存 ISO 时间戳，便于审计；可经系统设置重置后重新触发）。 */
  acknowledgePrivacy(userId: number): void {
    this.setConfig(`ai:privacy_ack:user:${userId}`, new Date().toISOString())
  }

  /** 清除全部用户的隐私告知确认（删除所有 `ai:privacy_ack:user:*` KV），返回清除条数。下次发送将重新触发告知。 */
  resetAllPrivacyAck(): number {
    const row = this.queryOne(
      `SELECT COUNT(*) AS total FROM system_config WHERE key LIKE 'ai:privacy_ack:user:%'`,
    )
    const before = row ? Number(row.total) : 0
    if (before > 0) {
      this.execute(`DELETE FROM system_config WHERE key LIKE 'ai:privacy_ack:user:%'`)
    }
    return before
  }

  listProviders(): AiProvider[] {
    return this.query('SELECT * FROM ai_provider ORDER BY sort ASC, id ASC').map(rowToProvider)
  }

  listProviderModels(providerCode: string, enabledOnly = false): AiProviderModel[] {
    return this.query(
      `SELECT * FROM ai_provider_model
        WHERE provider_code = ? ${enabledOnly ? 'AND enabled = 1' : ''}
        ORDER BY sort ASC, id ASC`,
      [providerCode],
    ).map(rowToProviderModel)
  }

  listAllProviderModels(enabledOnly = false): AiProviderModel[] {
    return this.query(
      `SELECT * FROM ai_provider_model
        ${enabledOnly ? 'WHERE enabled = 1' : ''}
        ORDER BY provider_code ASC, sort ASC, id ASC`,
    ).map(rowToProviderModel)
  }

  getProviderByCode(code: string): AiProvider | null {
    const row = this.queryOne('SELECT * FROM ai_provider WHERE code = ?', [code])
    return row ? rowToProvider(row) : null
  }

  private getActiveProviderModel(provider: AiProvider): AiProviderModel | null {
    if (!provider.defaultModel) return null
    const row =
      this.queryOne(
        `SELECT * FROM ai_provider_model
          WHERE provider_code = ? AND enabled = 1 AND model_id = ?
          ORDER BY sort ASC, id ASC
          LIMIT 1`,
        [provider.code, provider.defaultModel],
      ) ||
      this.queryOne(
        `SELECT * FROM ai_provider_model
          WHERE provider_code = ? AND enabled = 1 AND code = ?
          ORDER BY sort ASC, id ASC
          LIMIT 1`,
        [provider.code, provider.defaultModel],
      )
    return row ? rowToProviderModel(row) : null
  }

  private getMonthlyBudgetTokens(): number {
    const raw =
      this.getConfig(CONFIG_KEY.monthlyBudgetTokens) || this.getConfig(CONFIG_KEY.monthlyBudgetYuanLegacy)
    const value = Number(raw || DEFAULTS.monthlyBudgetTokens)
    if (!Number.isFinite(value) || value < 0) return DEFAULTS.monthlyBudgetTokens
    return Math.min(MAX_MONTHLY_BUDGET_TOKENS, Math.floor(value))
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
    keyOwnerName?: string
    keyLabel?: string
    keyExpiresAt?: string
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
    if (input.keyOwnerName !== undefined) {
      sets.push('key_owner_name = ?')
      params.push(input.keyOwnerName)
    }
    if (input.keyLabel !== undefined) {
      sets.push('key_label = ?')
      params.push(input.keyLabel)
    }
    if (input.keyExpiresAt !== undefined) {
      sets.push('key_expires_at = ?')
      params.push(input.keyExpiresAt)
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

  saveProviderModel(input: {
    id?: number
    providerCode: string
    code: string
    name: string
    modelId: string
    supportsVision?: boolean
    supportsToolCalls?: boolean
    supportsThinking?: boolean
    enabled?: boolean
    sort?: number
  }): number {
    const providerCode = input.providerCode.trim()
    const code = input.code.trim()
    const modelId = input.modelId.trim()
    const name = input.name.trim() || modelId
    if (!providerCode || !code || !modelId) throw new Error('请填写模型编号、名称和模型 ID')
    if (!/^[a-z0-9_-]+$/.test(code)) throw new Error('模型编号仅支持小写字母、数字、下划线和连字符')

    const provider = this.getProviderByCode(providerCode)
    if (!provider) throw new Error('模型服务不存在')
    const enabled = input.enabled === false ? 0 : 1
    const sort = input.sort ?? 0
    const previous = input.id
      ? this.queryOne('SELECT code, model_id FROM ai_provider_model WHERE id = ? AND provider_code = ?', [
          input.id,
          providerCode,
        ])
      : null

    if (input.id) {
      this.execute(
        `UPDATE ai_provider_model
            SET code = ?, name = ?, model_id = ?, supports_vision = ?, supports_tool_calls = ?,
                supports_thinking = ?, enabled = ?, sort = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND provider_code = ?`,
        [
          code,
          name,
          modelId,
          input.supportsVision === undefined ? (provider.supportsVision ? 1 : 0) : input.supportsVision ? 1 : 0,
          input.supportsToolCalls === undefined ? (provider.supportsToolCalls ? 1 : 0) : input.supportsToolCalls ? 1 : 0,
          input.supportsThinking === undefined ? (provider.supportsThinking ? 1 : 0) : input.supportsThinking ? 1 : 0,
          enabled,
          sort,
          input.id,
          providerCode,
        ],
      )
      if (
        enabled &&
        (!provider.defaultModel ||
          !this.getActiveProviderModel(provider) ||
          provider.defaultModel === String(previous?.model_id || ''))
      ) {
        this.saveProvider({ code: providerCode, defaultModel: modelId })
      }
      return input.id
    }

    this.execute(
      `INSERT INTO ai_provider_model
         (provider_code, code, name, model_id, supports_vision, supports_tool_calls, supports_thinking, enabled, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        providerCode,
        code,
        name,
        modelId,
        input.supportsVision === undefined ? (provider.supportsVision ? 1 : 0) : input.supportsVision ? 1 : 0,
        input.supportsToolCalls === undefined ? (provider.supportsToolCalls ? 1 : 0) : input.supportsToolCalls ? 1 : 0,
        input.supportsThinking === undefined ? (provider.supportsThinking ? 1 : 0) : input.supportsThinking ? 1 : 0,
        enabled,
        sort,
      ],
    )
    if (enabled && (!provider.defaultModel || !this.getActiveProviderModel(provider))) {
      this.saveProvider({ code: providerCode, defaultModel: modelId })
    }
    return this.getLastInsertId()
  }

  setActiveProviderModel(providerCode: string, modelCode: string): void {
    const row = this.queryOne(
      `SELECT model_id FROM ai_provider_model WHERE provider_code = ? AND code = ? AND enabled = 1`,
      [providerCode, modelCode],
    )
    if (!row?.model_id) throw new Error('模型不存在或未启用')
    this.saveProvider({ code: providerCode, defaultModel: String(row.model_id) })
  }

  deleteProviderModel(id: number): boolean {
    const row = this.queryOne('SELECT provider_code, model_id FROM ai_provider_model WHERE id = ?', [id])
    if (!row) return false
    const provider = this.getProviderByCode(String(row.provider_code))
    const countRow = this.queryOne('SELECT COUNT(*) AS cnt FROM ai_provider_model WHERE provider_code = ?', [
      row.provider_code,
    ])
    if (Number(countRow?.cnt || 0) <= 1) throw new Error('每个模型服务至少保留一个模型')
    const deleted = this.execute('DELETE FROM ai_provider_model WHERE id = ?', [id]) > 0
    if (deleted && provider?.defaultModel === String(row.model_id)) {
      const next = this.queryOne(
        `SELECT model_id FROM ai_provider_model
          WHERE provider_code = ? AND enabled = 1
          ORDER BY sort ASC, id ASC
          LIMIT 1`,
        [row.provider_code],
      )
      this.saveProvider({ code: String(row.provider_code), defaultModel: next?.model_id ? String(next.model_id) : '' })
    }
    return deleted
  }

  /** 保存全局 AI 配置（月度预算 / 超预算截断 / 总开关） */
  saveGlobalConfig(input: {
    monthlyBudgetTokens?: number
    blockOnOverage?: boolean
    enabled?: boolean
  }): void {
    if (input.monthlyBudgetTokens !== undefined) {
      const monthlyBudgetTokens = Number.isFinite(input.monthlyBudgetTokens)
        ? Math.min(MAX_MONTHLY_BUDGET_TOKENS, Math.max(0, Math.floor(input.monthlyBudgetTokens)))
        : DEFAULTS.monthlyBudgetTokens
      this.setConfig(CONFIG_KEY.monthlyBudgetTokens, String(monthlyBudgetTokens))
    }
    if (input.blockOnOverage !== undefined) this.setConfig(CONFIG_KEY.blockOnOverage, input.blockOnOverage ? '1' : '0')
    if (input.enabled !== undefined) this.setConfig(CONFIG_KEY.enabled, input.enabled ? '1' : '0')
  }

  /** 当前生效 provider 的完整视图（active 行 + 全局 KV） */
  getProviderConfig(): AiProviderConfig {
    const activeCode = this.getActiveProviderCode()
    const provider = this.getProviderByCode(activeCode) || this.getProviderByCode(DEFAULTS.activeProvider)
    const monthlyBudgetTokens = this.getMonthlyBudgetTokens()
    const blockOnOverage = this.getConfig(CONFIG_KEY.blockOnOverage) !== '0' // 默认开启，显式关闭才放行
    const enabled = this.getConfig(CONFIG_KEY.enabled) !== '0' // 默认启用
    if (!provider) {
      // ai_provider 表尚未种子（理论上 initializeAITables 已种子；兜底防 NPE）
      return {
        activeProviderCode: activeCode,
        providerName: activeCode,
        activeModelCode: '',
        activeModelName: '',
        supportsVision: false,
        supportsToolCalls: false,
        supportsThinking: false,
        providerEnabled: false,
        apiKeyEnc: '',
        keyOwnerName: '',
        keyLabel: '',
        keyExpiresAt: '',
        baseUrl: '',
        defaultModel: '',
        monthlyBudgetTokens,
        blockOnOverage,
        enabled,
      }
    }
    const activeModel = this.getActiveProviderModel(provider)
    const hasModelRows = this.listProviderModels(provider.code).length > 0
    return {
      activeProviderCode: provider.code,
      providerName: provider.name,
      activeModelCode: activeModel?.code || '',
      activeModelName: activeModel?.name || (hasModelRows ? '' : provider.defaultModel),
      supportsVision: activeModel?.supportsVision ?? provider.supportsVision,
      supportsToolCalls: activeModel?.supportsToolCalls ?? provider.supportsToolCalls,
      supportsThinking: activeModel?.supportsThinking ?? provider.supportsThinking,
      providerEnabled: provider.enabled,
      apiKeyEnc: provider.apiKeyEnc,
      keyOwnerName: provider.keyOwnerName,
      keyLabel: provider.keyLabel,
      keyExpiresAt: provider.keyExpiresAt,
      baseUrl: provider.baseUrl,
      defaultModel: activeModel?.modelId || (hasModelRows ? '' : provider.defaultModel),
      monthlyBudgetTokens,
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
  listSessions(userId: number, limit = 50): AiChatSession[] {
    const rows = this.query(
      `SELECT s.*,
              a.name AS agent_name,
              (SELECT COUNT(*) FROM ai_chat_message m WHERE m.session_id = s.id) AS message_count,
              (SELECT COALESCE(SUM(COALESCE(NULLIF(m.tokens_total, 0), COALESCE(m.tokens_prompt, 0) + COALESCE(m.tokens_completion, 0))), 0)
                 FROM ai_chat_message m
                WHERE m.session_id = s.id) AS total_tokens
       FROM ai_chat_session s
       LEFT JOIN ai_agent a ON a.code = s.agent_code
       WHERE s.user_id = ?
       ORDER BY s.updated_at DESC
       LIMIT ?`,
      [userId, limit],
    )
    return rows.map((r: any) => ({
      ...r,
      studentId: r.student_id ?? null,
    }))
  }

  countSessions(userId: number): number {
    const row = this.queryOne('SELECT COUNT(*) AS total FROM ai_chat_session WHERE user_id = ?', [userId])
    return Number(row?.total || 0)
  }

  /** 个人历史页查询：始终按 user_id 过滤，不复用管理员的全局审计查询。 */
  listSessionHistory(userId: number, query: AiSessionHistoryQuery = {}): AiSessionHistoryPage {
    const pageSize = Math.min(100, Math.max(10, Math.floor(Number(query.pageSize) || 20)))
    const page = Math.max(1, Math.floor(Number(query.page) || 1))
    const filters = ['s.user_id = ?']
    const params: Array<string | number> = [userId]
    const agentCode = query.agentCode?.trim()
    const keyword = query.keyword?.trim()

    if (agentCode) {
      filters.push('s.agent_code = ?')
      params.push(agentCode)
    }
    if (keyword) {
      const like = `%${keyword}%`
      filters.push(`(
        s.title LIKE ? OR EXISTS (
          SELECT 1 FROM ai_chat_message m
          WHERE m.session_id = s.id AND m.content LIKE ?
        )
      )`)
      params.push(like, like)
    }
    if (query.updatedFrom) {
      filters.push('s.updated_at >= ?')
      params.push(`${query.updatedFrom} 00:00:00`)
    }
    if (query.updatedTo) {
      filters.push('s.updated_at <= ?')
      params.push(`${query.updatedTo} 23:59:59`)
    }

    const where = filters.join(' AND ')
    const total = Number(
      this.queryOne(`SELECT COUNT(*) AS total FROM ai_chat_session s WHERE ${where}`, params)?.total || 0,
    )
    const items = this.query(
      `SELECT s.*,
              a.name AS agent_name,
              (SELECT COUNT(*) FROM ai_chat_message m WHERE m.session_id = s.id) AS message_count,
              (SELECT COALESCE(SUM(COALESCE(NULLIF(m.tokens_total, 0), COALESCE(m.tokens_prompt, 0) + COALESCE(m.tokens_completion, 0))), 0)
                 FROM ai_chat_message m
                WHERE m.session_id = s.id) AS total_tokens
       FROM ai_chat_session s
       LEFT JOIN ai_agent a ON a.code = s.agent_code
       WHERE ${where}
       ORDER BY s.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize],
    ) as AiChatSession[]
    return { items, total }
  }

  getSessionForUser(sessionId: number, userId: number): AiChatSession | null {
    const row = this.queryOne(
      `SELECT s.*,
              a.name AS agent_name,
              (SELECT COUNT(*) FROM ai_chat_message m WHERE m.session_id = s.id) AS message_count,
              (SELECT COALESCE(SUM(COALESCE(NULLIF(m.tokens_total, 0), COALESCE(m.tokens_prompt, 0) + COALESCE(m.tokens_completion, 0))), 0)
                 FROM ai_chat_message m
                WHERE m.session_id = s.id) AS total_tokens
       FROM ai_chat_session s
       LEFT JOIN ai_agent a ON a.code = s.agent_code
       WHERE s.id = ? AND s.user_id = ?`,
      [sessionId, userId],
    )
    return (row as AiChatSession | undefined) || null
  }

  /** admin 视角：全部会话（LEFT JOIN user 带用户名/角色），不过滤 user_id。
   * 分页 + 关键字过滤（标题 / 用户名 LIKE）；offset 用于服务端分页。 */
  listAllSessions(
    limit = 200,
    offset = 0,
    keyword = '',
  ): Array<{
    id: number
    user_id: number | null
    username: string | null
    role: string | null
    agent_code: string
    agent_name: string | null
    title: string
    message_count: number
    total_tokens: number
    created_at: string
    updated_at: string
  }> {
    const kw = keyword?.trim()
    const params: Array<string | number> = []
    let where = ''
    if (kw) {
      const like = `%${kw}%`
      where = 'WHERE s.title LIKE ? OR u.username LIKE ?'
      params.push(like, like)
    }
    return this.query(
      `SELECT s.id, s.user_id, u.username, u.role, s.agent_code, a.name AS agent_name, s.title,
              s.student_id,
              (SELECT COUNT(*) FROM ai_chat_message m WHERE m.session_id = s.id) AS message_count,
              (SELECT COALESCE(SUM(COALESCE(NULLIF(m.tokens_total, 0), COALESCE(m.tokens_prompt, 0) + COALESCE(m.tokens_completion, 0))), 0)
                 FROM ai_chat_message m
                WHERE m.session_id = s.id) AS total_tokens,
              s.created_at, s.updated_at
       FROM ai_chat_session s
       LEFT JOIN user u ON u.id = s.user_id
       LEFT JOIN ai_agent a ON a.code = s.agent_code
       ${where}
       ORDER BY s.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )
  }

  /** admin 视角：全部会话总数（与 listAllSessions 同过滤条件，供分页） */
  countAllSessions(keyword = ''): number {
    const kw = keyword?.trim()
    const params: Array<string | number> = []
    let where = ''
    if (kw) {
      const like = `%${kw}%`
      where = 'WHERE s.title LIKE ? OR u.username LIKE ?'
      params.push(like, like)
    }
    const row = this.queryOne(
      `SELECT COUNT(*) AS total
       FROM ai_chat_session s
       LEFT JOIN user u ON u.id = s.user_id
       ${where}`,
      params,
    )
    return Number(row?.total || 0)
  }

  updateSessionTitle(id: number, title: string): void {
    this.execute('UPDATE ai_chat_session SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, id])
  }

  private touchSession(id: number): void {
    this.execute('UPDATE ai_chat_session SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id])
  }

  deleteSession(id: number): AiSessionDeleteResult {
    const messages = this.listMessages(id)
    const attachments = dedupeAttachmentRefs(messages.flatMap((message) => message.attachments || []))
    const rawDb = typeof this.db?.getRawDB === 'function' ? this.db.getRawDB() : this.db

    rawDb.run('BEGIN TRANSACTION')
    try {
      this.execute('DELETE FROM ai_chat_message WHERE session_id = ?', [id])
      const deleted = this.execute('DELETE FROM ai_chat_session WHERE id = ?', [id]) > 0
      rawDb.run('COMMIT')
      return { deleted, attachments }
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        /* ignore rollback failures */
      }
      throw error
    }
  }

  listMessages(sessionId: number): AiChatMessage[] {
    const rows = this.query('SELECT * FROM ai_chat_message WHERE session_id = ? ORDER BY id ASC', [sessionId])
    return rows.map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      attachments: parseAttachmentRefs(r.attachments),
      toolArtifacts: parseToolArtifacts(r.tool_artifacts),
      deliveryStatus: r.delivery_status ?? '',
      messageKind: r.message_kind ?? '',
      tokensTotal: Number(r.tokens_total || Number(r.tokens_prompt || 0) + Number(r.tokens_completion || 0)),
      tokensPrompt: Number(r.tokens_prompt || 0),
      tokensCompletion: Number(r.tokens_completion || 0),
      estCostYuan: Number(r.est_cost_yuan || 0),
      createdAt: r.created_at,
    }))
  }

  listMessagesForUser(sessionId: number, userId: number): AiChatMessage[] {
    return this.getSessionForUser(sessionId, userId) ? this.listMessages(sessionId) : []
  }

  deleteSessionForUser(sessionId: number, userId: number): AiSessionDeleteResult {
    if (!this.getSessionForUser(sessionId, userId)) return { deleted: false, attachments: [] }
    return this.deleteSession(sessionId)
  }

  /**
   * 编辑当前用户会话中的最后一条 user 消息，并截断其后的旧回复。
   * 只允许最后一条 user 消息，避免从历史中段产生隐式分支。
   */
  editLastUserMessageForUser(
    sessionId: number,
    userId: number,
    messageId: number,
    content: string,
  ): AiMessageEditResult {
    if (!content.trim() || !this.getSessionForUser(sessionId, userId)) {
      return { updated: false, removedAttachments: [] }
    }

    const target = this.queryOne(
      'SELECT id, role, attachments FROM ai_chat_message WHERE id = ? AND session_id = ?',
      [messageId, sessionId],
    )
    const latestUser = this.queryOne(
      `SELECT id
       FROM ai_chat_message
       WHERE session_id = ? AND role = 'user'
       ORDER BY id DESC
       LIMIT 1`,
      [sessionId],
    )
    if (
      target?.role !== 'user' ||
      Number(latestUser?.id) !== messageId ||
      (parseAttachmentRefs(target.attachments)?.length || 0) > 0
    ) {
      return { updated: false, removedAttachments: [] }
    }

    const removedAttachments = dedupeAttachmentRefs(
      this.listMessages(sessionId)
        .filter((message) => message.id > messageId)
        .flatMap((message) => message.attachments || []),
    )
    const rawDb = typeof this.db?.getRawDB === 'function' ? this.db.getRawDB() : this.db

    rawDb.run('BEGIN TRANSACTION')
    try {
      const updated =
        this.execute(
          `UPDATE ai_chat_message
           SET content = ?
           WHERE id = ? AND session_id = ? AND role = 'user'`,
          [content.trim(), messageId, sessionId],
        ) > 0
      if (!updated) throw new Error('编辑消息失败')
      this.execute('DELETE FROM ai_chat_message WHERE session_id = ? AND id > ?', [
        sessionId,
        messageId,
      ])
      this.touchSession(sessionId)
      rawDb.run('COMMIT')
      return { updated: true, removedAttachments }
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        /* ignore rollback failures */
      }
      throw error
    }
  }

  countAttachmentReferences(rel: string): number {
    if (!rel) return 0
    const rows = this.query('SELECT attachments FROM ai_chat_message WHERE attachments IS NOT NULL')
    let count = 0
    for (const row of rows) {
      const refs = parseAttachmentRefs(row.attachments) || []
      count += refs.filter((ref) => ref.rel === rel).length
    }
    return count
  }

  saveMessage(input: {
    sessionId: number
    role: 'user' | 'assistant' | 'system'
    content: string
    usage?: DeepSeekUsage | null
    attachments?: AiAttachmentRef[] | null
    toolArtifacts?: ToolArtifact[] | null
    deliveryStatus?: string
    messageKind?: string
  }): number {
    const tokensPrompt = Number(input.usage?.promptTokens || 0)
    const tokensCompletion = Number(input.usage?.completionTokens || 0)
    const tokensTotal = Number(input.usage?.totalTokens || tokensPrompt + tokensCompletion)
    // 仅 assistant 回复计入花费（user 消息的 usage 为上一轮 assistant 的，不重复计）
    const estCost = input.role === 'assistant' ? estimateCostYuan(input.usage) : 0
    const attachmentsJson =
      input.attachments && input.attachments.length > 0 ? JSON.stringify(input.attachments) : null
    // 路线 C：工具富产物（如图表）序列化为 JSON 存库，关联到 assistant 回复
    const toolArtifactsJson =
      input.toolArtifacts && input.toolArtifacts.length > 0 ? JSON.stringify(input.toolArtifacts) : null
    const deliveryStatus = input.deliveryStatus ?? (input.role === 'assistant' ? 'completed' : '')
    const messageKind = input.messageKind ?? 'final'
    this.execute(
      `INSERT INTO ai_chat_message (session_id, role, content, tokens_total, tokens_prompt, tokens_completion, est_cost_yuan, attachments, tool_artifacts, delivery_status, message_kind)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.sessionId, input.role, input.content, tokensTotal, tokensPrompt, tokensCompletion, estCost, attachmentsJson, toolArtifactsJson, deliveryStatus, messageKind],
    )
    this.touchSession(input.sessionId)
    return this.getLastInsertId()
  }

  // ==================== 消息状态机 API（v4.1 §6.3） ====================

  /** 流式路径：先插 streaming 占位行（content 初始为空），返回消息 id 供分块更新 */
  createAssistantMessage(input: {
    sessionId: number
    messageKind?: string
  }): number {
    this.execute(
      `INSERT INTO ai_chat_message (session_id, role, content, delivery_status, message_kind)
       VALUES (?, 'assistant', '', 'streaming', ?)`,
      [input.sessionId, input.messageKind ?? 'final'],
    )
    return this.getLastInsertId()
  }

  /** 流式路径：分块更新正文（仅 streaming 态） */
  updateAssistantChunk(messageId: number, content: string): boolean {
    return (
      this.execute(
        `UPDATE ai_chat_message
         SET content = ?
         WHERE id = ? AND delivery_status = 'streaming'`,
        [content, messageId],
      ) > 0
    )
  }

  /** 流式路径：完成/取消/失败收尾（事务内置状态 + 完成时间） */
  finalizeAssistantMessage(messageId: number, status: 'completed' | 'cancelled' | 'failed'): boolean {
    const completedAt = status === 'completed' ? new Date().toISOString() : null
    return (
      this.execute(
        `UPDATE ai_chat_message
         SET delivery_status = ?, completed_at = ?
         WHERE id = ? AND delivery_status = 'streaming'`,
        [status, completedAt, messageId],
      ) > 0
    )
  }

  // ==================== 学生记忆 CRUD（v4.1 §4.1/§7） ====================

  listStudentMemories(studentId: number, statuses?: AiMemoryStatus[]): AiStudentMemory[] {
    const statusFilter = statuses && statuses.length > 0 ? ` AND status IN (${statuses.map(() => '?').join(',')})` : ''
    const params: any[] = [studentId, ...(statuses ?? [])]
    const rows = this.query(
      `SELECT * FROM ai_student_memory
       WHERE student_id = ? AND deleted_at IS NULL${statusFilter}
       ORDER BY
         CASE priority WHEN 'safety_critical' THEN 0 WHEN 'pinned' THEN 1 ELSE 2 END,
         updated_at DESC`,
      params,
    )
    return rows.map((r: any) => this.mapMemoryRow(r))
  }

  addStudentMemory(input: {
    studentId: number
    userId: number
    createdByType?: 'teacher' | 'ai' | 'system'
    agentCode?: string
    sessionId?: number | null
    sourceMessageId?: number | null
    category: AiMemoryCategory
    content: string
    confidence?: AiMemoryConfidence
    status?: AiMemoryStatus
    priority?: AiMemoryPriority
    priorityNote?: string
    batchId?: string
    fingerprint?: string
    possibleDuplicateOf?: number | null
    supersedesId?: number | null
    modelProvider?: string
    modelName?: string
    promptVersion?: string
    generationId?: string
  }): number {
    const status = input.status ?? (input.createdByType === 'ai' ? 'pending' : 'confirmed')
    this.execute(
      `INSERT INTO ai_student_memory (
        student_id, user_id, created_by_type, agent_code, session_id, source_message_id,
        category, content, confidence, status, priority, priority_note,
        batch_id, fingerprint, possible_duplicate_of, supersedes_id,
        model_provider, model_name, prompt_version, generation_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.studentId, input.userId, input.createdByType ?? 'teacher', input.agentCode ?? '',
        input.sessionId ?? null, input.sourceMessageId ?? null,
        input.category, input.content, input.confidence ?? 'observed', status,
        input.priority ?? 'normal', input.priorityNote ?? '',
        input.batchId ?? '', input.fingerprint ?? '', input.possibleDuplicateOf ?? null,
        input.supersedesId ?? null,
        input.modelProvider ?? '', input.modelName ?? '', input.promptVersion ?? '', input.generationId ?? '',
      ],
    )
    const id = this.getLastInsertId()
    this.writeMemoryAudit(id, 'create', input.userId, null, { status, category: input.category, content: input.content })
    return id
  }

  /** 教师确认 pending → confirmed（或拒绝 → rejected）；软删除走 deleteStudentMemory */
  confirmStudentMemory(memoryId: number, userId: number, status: 'confirmed' | 'rejected' | 'disputed'): boolean {
    const before = this.queryOne('SELECT * FROM ai_student_memory WHERE id = ?', [memoryId])
    if (!before) return false
    const confirmedAt = status === 'confirmed' ? new Date().toISOString() : null
    const verification = status === 'disputed' ? 'disputed' : 'verified'
    const updated =
      this.execute(
        `UPDATE ai_student_memory
         SET status = ?, confirmed_by_user_id = ?, confirmed_at = ?,
             verification_status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND deleted_at IS NULL`,
        [status === 'disputed' ? 'confirmed' : status, userId, confirmedAt, verification, memoryId],
      ) > 0
    if (updated) this.writeMemoryAudit(memoryId, status === 'rejected' ? 'reject' : 'confirm', userId, before, { status, verification })
    return updated
  }

  /** 标记优先级（pinned / safety_critical）：须填依据（v4.1 合同⑤） */
  markMemoryPriority(memoryId: number, userId: number, priority: 'pinned' | 'safety_critical', note: string): boolean {
    if (!note.trim()) return false
    const before = this.queryOne('SELECT * FROM ai_student_memory WHERE id = ?', [memoryId])
    if (!before) return false
    const updated =
      this.execute(
        `UPDATE ai_student_memory
         SET priority = ?, priority_note = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND deleted_at IS NULL`,
        [priority, note.trim(), memoryId],
      ) > 0
    if (updated) this.writeMemoryAudit(memoryId, 'mark_priority', userId, before, { priority, note })
    return updated
  }

  /** 软删除（deleted_at，审计保留） */
  deleteStudentMemory(memoryId: number, userId: number): boolean {
    const before = this.queryOne('SELECT * FROM ai_student_memory WHERE id = ?', [memoryId])
    if (!before) return false
    const updated =
      this.execute(
        `UPDATE ai_student_memory SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [memoryId],
      ) > 0
    if (updated) this.writeMemoryAudit(memoryId, 'delete', userId, before, { deleted_at: new Date().toISOString() })
    return updated
  }

  // ==================== 总结批次（v4.1 §4.4/§6.2） ====================

  /** 阶段 A：创建批次（唯一索引保证每会话单飞；返回 false 表示已有活动批次） */
  createSummaryBatch(input: {
    sessionId: number
    batchId: string
    studentId: number
    fromMessageId: number
    toMessageId: number
    inputHash: string
  }): boolean {
    try {
      this.execute(
        `INSERT INTO ai_memory_summary_batch (session_id, batch_id, student_id, from_message_id, to_message_id, input_hash, state)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [input.sessionId, input.batchId, input.studentId, input.fromMessageId, input.toMessageId, input.inputHash],
      )
      return true
    } catch {
      return false // 唯一索引冲突：已有活动批次
    }
  }

  getSummaryBatch(batchId: string): AiMemorySummaryBatch | null {
    const row = this.queryOne('SELECT * FROM ai_memory_summary_batch WHERE batch_id = ?', [batchId])
    return row ? this.mapBatchRow(row) : null
  }

  /** 阶段 B 前：置 summarizing（CAS：仅 pending 可转） */
  markBatchSummarizing(batchId: string): boolean {
    return (
      this.execute(
        `UPDATE ai_memory_summary_batch SET state = 'summarizing', updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = ? AND state = 'pending'`,
        [batchId],
      ) > 0
    )
  }

  /** 阶段 C：CAS 提交（写候选由调用方在同一事务完成；此处推进水位 + 批次 done） */
  commitSummaryBatch(batchId: string, watermarkTo: number): boolean {
    const batch = this.getSummaryBatch(batchId)
    if (!batch || batch.state !== 'summarizing') return false
    const rawDb = typeof this.db?.getRawDB === 'function' ? this.db.getRawDB() : this.db
    rawDb.run('BEGIN TRANSACTION')
    try {
      // CAS：水位未变才推进（changes()==1 校验）
      const pushed =
        this.execute(
          `UPDATE ai_chat_session SET memory_watermark = ? WHERE id = ? AND memory_watermark = ?`,
          [watermarkTo, batch.sessionId, batch.fromMessageId - 1],
        ) > 0
      if (!pushed) throw new Error('水位已被并发推进')
      this.execute(
        `UPDATE ai_memory_summary_batch SET state = 'done', attempt_count = 0, updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = ?`,
        [batchId],
      )
      rawDb.run('COMMIT')
      return true
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        /* ignore */
      }
      this.execute(
        `UPDATE ai_memory_summary_batch SET state = 'cancelled', last_error = ?, updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = ?`,
        [error instanceof Error ? error.message : String(error), batchId],
      )
      return false
    }
  }

  /** 失败重试：attempt_count +1；达上限（3）置 failed */
  failSummaryBatch(batchId: string, error: string): void {
    const batch = this.getSummaryBatch(batchId)
    if (!batch) return
    const attempts = batch.attemptCount + 1
    if (attempts >= 3) {
      this.execute(
        `UPDATE ai_memory_summary_batch SET state = 'failed', attempt_count = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = ?`,
        [attempts, error.slice(0, 500), batchId],
      )
    } else {
      this.execute(
        `UPDATE ai_memory_summary_batch SET state = 'pending', attempt_count = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP
         WHERE batch_id = ?`,
        [attempts, error.slice(0, 500), batchId],
      )
    }
  }

  /** 绑定学生（库级防竞态：存在任一消息即拒绝，v4 §4.3） */
  bindSessionStudent(sessionId: number, studentId: number): boolean {
    return (
      this.execute(
        `UPDATE ai_chat_session SET student_id = ?
         WHERE id = ?
           AND NOT EXISTS (SELECT 1 FROM ai_chat_message WHERE session_id = ?)`,
        [studentId, sessionId, sessionId],
      ) > 0
    )
  }

  getSessionStudentId(sessionId: number): number | null {
    const row = this.queryOne('SELECT student_id FROM ai_chat_session WHERE id = ?', [sessionId])
    const v = row?.student_id
    return v == null ? null : Number(v)
  }

  /**
   * 学生记忆实时权限（v4.1 §9，M3）：
   * - admin：全量可见；
   * - teacher：仅当该学生当前班级（student.current_class_id）在本人任教班级
   *   （sys_class_teachers.teacher_id = 当前用户 id）内时可见。
   * 每次查询实时计算，不保存权限快照；转班/撤权立即失效。
   */
  canAccessStudentMemory(userId: number, studentId: number): boolean {
    const user = this.queryOne('SELECT role FROM user WHERE id = ?', [userId])
    if (!user) return false
    if (user.role === 'admin') return true
    const row = this.queryOne(
      `SELECT 1
       FROM student s
       JOIN sys_class_teachers ct ON ct.class_id = s.current_class_id AND ct.teacher_id = ?
       WHERE s.id = ?`,
      [userId, studentId],
    )
    return !!row
  }

  /** 教师名映射（确认来源展示，M3）：返回 id → name 记录 */
  getMemoryConfirmerNames(memoryIds: number[]): Record<number, string> {
    if (memoryIds.length === 0) return {}
    const placeholders = memoryIds.map(() => '?').join(',')
    const rows = this.query(
      `SELECT DISTINCT m.id AS memory_id, u.name AS teacher_name
       FROM ai_student_memory m
       LEFT JOIN user u ON u.id = m.confirmed_by_user_id
       WHERE m.id IN (${placeholders})`,
      memoryIds,
    )
    const map: Record<number, string> = {}
    for (const r of rows) {
      map[Number(r.memory_id)] = r.teacher_name ? String(r.teacher_name) : ''
    }
    return map
  }

  /**
   * 学校级记忆总开关（v4.1 §8，M4）：system_config KV，默认开启，管理员可关闭。
   * 未配置（新部署）与 '1' → 开；显式 '0'（管理员关闭过）→ 关。
   */
  getMemoryEnabled(): boolean {
    return this.getConfig('ai:memory_enabled') !== '0'
  }

  setMemoryEnabled(enabled: boolean): void {
    this.setConfig('ai:memory_enabled', enabled ? '1' : '0')
  }

  // ==================== 治理任务（v4.1 §11/§13，M5） ====================

  /**
   * pending 30 天未处理自动归档（v4.1 §11）：
   * 返回归档条数。超期 pending → archived（可回溯，不删除）。
   */
  archiveStalePending(days = 30): number {
    return this.execute(
      `UPDATE ai_student_memory SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending' AND deleted_at IS NULL
         AND created_at < datetime('now', ?)`,
      [`-${days} days`],
    )
  }

  /**
   * confirmed 配额淘汰（v4.1 §11）：按分类配额，超限时淘汰最旧（archived/superseded/rejected 优先清理已在
   * 单独步骤；此处处理 confirmed 超配额：safety_critical/pinned 保护不淘汰）。
   * 返回淘汰条数。
   */
  enforceConfirmedQuota(quotas: Record<string, number> = {
    observation: 100,
    preference: 50,
    advice_given: 50,
    follow_up: 50,
  }): number {
    let total = 0
    for (const [category, quota] of Object.entries(quotas)) {
      // 按学生分组：同生同分类 confirmed 超配额 → 取最旧（排除关键项）降级为 archived
      const rows = this.query(
        `SELECT id FROM ai_student_memory
         WHERE student_id IN (
           SELECT student_id FROM ai_student_memory
           WHERE status = 'confirmed' AND deleted_at IS NULL AND category = ? AND priority = 'normal'
           GROUP BY student_id HAVING COUNT(*) > ?
         )
           AND status = 'confirmed' AND deleted_at IS NULL AND category = ? AND priority = 'normal'
         ORDER BY effective_at ASC`,
        [category, quota, category],
      )
      // 每生保留最近 quota 条；超出部分（按时间最旧）归档
      const kept: Record<number, number> = {}
      for (const row of rows) {
        const sid = Number(row.student_id)
        kept[sid] = (kept[sid] ?? 0) + 1
      }
      const toArchive = rows.filter((row) => {
        const sid = Number(row.student_id)
        if ((kept[sid] ?? 0) <= quota) return false
        kept[sid]!--
        return true
      })
      for (const row of toArchive) {
        this.execute(
          `UPDATE ai_student_memory SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [row.id],
        )
        total++
      }
    }
    return total
  }

  /**
   * 非有效状态清理（v4.1 §11）：rejected/superseded/archived 保留 365 天或每生历史 ≤500 条，
   * 超限物理清理（审计保留）。
   */
  purgeInactiveMemories(days = 365, perStudentCap = 500): number {
    // 超期清理
    const expired = this.execute(
      `DELETE FROM ai_student_memory
       WHERE status IN ('rejected', 'superseded', 'archived')
         AND updated_at < datetime('now', ?)`,
      [`-${days} days`],
    )
    // 每生历史超 500 条：删最旧非有效（保留最近 500）
    let overflow = 0
    const students = this.query(
      `SELECT student_id FROM ai_student_memory
       WHERE status IN ('rejected', 'superseded', 'archived')
       GROUP BY student_id HAVING COUNT(*) > ?`,
      [perStudentCap],
    )
    for (const row of students) {
      const sid = Number(row.student_id)
      const excess = this.query(
        `SELECT id FROM ai_student_memory
         WHERE student_id = ? AND status IN ('rejected', 'superseded', 'archived')
         ORDER BY updated_at DESC LIMIT -1 OFFSET ?`,
        [sid, perStudentCap],
      )
      for (const r of excess) {
        this.execute('DELETE FROM ai_student_memory WHERE id = ?', [r.id])
        overflow++
      }
    }
    return expired + overflow
  }

  /**
   * 批次保留清理（v4.1 §6.2）：cancelled 30 天 / failed 90 天 / done 180 天或每会话最近 20 批。
   * 返回清理条数（done 保留最近 20 批，其余按时间）。
   */
  purgeSummaryBatches(): number {
    let total = 0
    total += this.execute(
      `DELETE FROM ai_memory_summary_batch
       WHERE state = 'cancelled' AND updated_at < datetime('now', '-30 days')`,
    )
    total += this.execute(
      `DELETE FROM ai_memory_summary_batch
       WHERE state = 'failed' AND updated_at < datetime('now', '-90 days')`,
    )
    total += this.execute(
      `DELETE FROM ai_memory_summary_batch
       WHERE state = 'done' AND updated_at < datetime('now', '-180 days')`,
    )
    // 每会话最近 20 批之外的 done 也清理
    const sessions = this.query(
      `SELECT session_id FROM ai_memory_summary_batch
       WHERE state = 'done' GROUP BY session_id HAVING COUNT(*) > 20`,
    )
    for (const row of sessions) {
      const sid = Number(row.session_id)
      const excess = this.query(
        `SELECT id FROM ai_memory_summary_batch
         WHERE session_id = ? AND state = 'done'
         ORDER BY updated_at DESC LIMIT -1 OFFSET 20`,
        [sid],
      )
      for (const r of excess) {
        this.execute('DELETE FROM ai_memory_summary_batch WHERE id = ?', [r.id])
        total++
      }
    }
    return total
  }

  private writeMemoryAudit(
    memoryId: number,
    action: string,
    userId: number | null,
    before: any | null,
    after: any | null,
  ): void {
    this.execute(
      `INSERT INTO ai_student_memory_audit (memory_id, action, user_id, before_json, after_json)
       VALUES (?, ?, ?, ?, ?)`,
      [memoryId, action, userId ?? null, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null],
    )
  }

  private mapMemoryRow(r: any): AiStudentMemory {
    return {
      id: r.id,
      studentId: r.student_id,
      userId: r.user_id,
      createdByType: r.created_by_type,
      agentCode: r.agent_code,
      sessionId: r.session_id ?? null,
      sourceMessageId: r.source_message_id ?? null,
      category: r.category,
      content: r.content,
      confidence: r.confidence,
      status: r.status,
      priority: r.priority,
      priorityNote: r.priority_note,
      confirmedByUserId: r.confirmed_by_user_id ?? null,
      confirmedAt: r.confirmed_at ?? null,
      effectiveAt: r.effective_at,
      expiresAt: r.expires_at ?? null,
      deletedAt: r.deleted_at ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  }

  private mapBatchRow(r: any): AiMemorySummaryBatch {
    return {
      id: r.id,
      sessionId: r.session_id,
      batchId: r.batch_id,
      studentId: r.student_id,
      fromMessageId: r.from_message_id,
      toMessageId: r.to_message_id,
      inputHash: r.input_hash,
      state: r.state,
      leaseUntil: r.lease_until ?? null,
      attemptCount: Number(r.attempt_count || 0),
      lastError: r.last_error,
      createdAt: r.created_at,
    }
  }

  /** 本月（按 created_at 的 UTC YYYY-MM）累计 token 与 assistant 消息数，用于额度展示/判断 */
  getMonthUsage(): { totalTokens: number; assistantCount: number; period: string } {
    const period = new Date().toISOString().slice(0, 7) // YYYY-MM (UTC)，与 CURRENT_TIMESTAMP 对齐
    const row = this.queryOne(
      `SELECT COALESCE(SUM(COALESCE(NULLIF(tokens_total, 0), COALESCE(tokens_prompt, 0) + COALESCE(tokens_completion, 0))), 0) AS total_tokens,
              COUNT(*) AS cnt
       FROM ai_chat_message
       WHERE role = 'assistant' AND strftime('%Y-%m', created_at) = ?`,
      [period],
    )
    return {
      totalTokens: Number(row?.total_tokens || 0),
      assistantCount: Number(row?.cnt || 0),
      period,
    }
  }
}

export default AIApi
