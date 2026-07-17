<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAiStore } from '@/stores/ai'
import { useAuthStore } from '@/stores/auth'
import type { AiAgent, AiAgentSkillBinding, AiSkill } from '@/database/ai-api'
import { getBuiltinAgentPreset, isBuiltinAgentCode } from '@/data/ai-agent-presets'

const aiStore = useAiStore()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

onMounted(() => {
  aiStore.loadAll()
})

// ===== 模型服务配置表单（当前 active provider 的编辑视图 + 全局额度）=====
const configForm = reactive({
  activeProviderCode: '',
  apiKeyInput: '',
  baseUrl: '',
  defaultModel: '',
  providerEnabled: true,
  monthlyBudgetYuan: 100,
  blockOnOverage: false,
  enabled: true,
})

const apiKeyPlaceholder = computed(() => {
  const cfg = aiStore.providerConfig
  if (cfg?.apiKeyEnc) return '已配置（重新输入可更新，留空保存则不变）'
  return `请输入 ${cfg?.providerName || '模型服务'} API Key`
})

// 能力位（只读标识，来自 provider 行）
const capabilityTags = computed(() => {
  const cfg = aiStore.providerConfig
  const tags: Array<{ label: string; type: 'success' | 'warning' | 'info' }> = []
  if (!cfg) return tags
  if (cfg.supportsVision) tags.push({ label: '支持图片', type: 'success' })
  if (cfg.supportsToolCalls) tags.push({ label: '工具调用', type: 'warning' })
  if (cfg.supportsThinking) tags.push({ label: '思考模式', type: 'info' })
  return tags
})

// 豆包等火山方舟 provider 的 model 是「接入点 ID」（ep-xxx），与 DeepSeek 模型名不同
const isDoubao = computed(() => aiStore.providerConfig?.activeProviderCode === 'doubao')

// providerConfig 加载后回填表单（含能力位与 provider 自身启用状态）
watch(
  () => aiStore.providerConfig,
  (cfg) => {
    if (!cfg) return
    configForm.activeProviderCode = cfg.activeProviderCode
    configForm.baseUrl = cfg.baseUrl
    configForm.defaultModel = cfg.defaultModel
    configForm.providerEnabled = cfg.providerEnabled
    configForm.monthlyBudgetYuan = cfg.monthlyBudgetYuan
    configForm.blockOnOverage = cfg.blockOnOverage
    configForm.enabled = cfg.enabled
  },
  { immediate: true },
)

/** 切换当前编辑/生效的 provider（即时切换 active，sendChat/testConnection 随之用新 provider） */
async function onProviderChange(code: string) {
  await aiStore.setActiveProvider(code)
}

const saving = ref(false)
async function saveConfig() {
  saving.value = true
  try {
    await aiStore.saveProviderConfig({
      apiKeyPlain: configForm.apiKeyInput, // 空串=不变（store 内部处理），非空=更新
      baseUrl: configForm.baseUrl.trim(),
      defaultModel: configForm.defaultModel.trim(),
      providerEnabled: configForm.providerEnabled,
      monthlyBudgetYuan: Number(configForm.monthlyBudgetYuan) || 0,
      blockOnOverage: configForm.blockOnOverage,
      enabled: configForm.enabled,
    })
    configForm.apiKeyInput = ''
    ElMessage.success('AI 配置已保存')
  } catch (e) {
    ElMessage.error('保存失败：' + (e instanceof Error ? e.message : String(e)))
  } finally {
    saving.value = false
  }
}

async function clearApiKey() {
  try {
    await ElMessageBox.confirm('确定清除已配置的 API Key 吗？清除后 AI 智能体将无法使用。', '清除确认', {
      type: 'warning',
    })
    await aiStore.saveProviderConfig({ apiKeyPlain: '' })
    configForm.apiKeyInput = ''
    ElMessage.success('API Key 已清除')
  } catch {
    /* 用户取消 */
  }
}

async function testConnection() {
  const res = await aiStore.testConnection()
  if (res.ok) {
    ElMessage.success(res.message)
  } else {
    ElMessage.error(res.message)
  }
}

// ===== 用量展示 =====
const budgetPercent = computed(() => {
  const budget = aiStore.providerConfig?.monthlyBudgetYuan || 0
  if (budget <= 0) return 0
  return Math.min(100, Math.round((aiStore.monthUsage.costYuan / budget) * 100))
})

// ===== 智能体管理 =====
const dialogVisible = ref(false)
const editing = ref(false)
const detailDialogVisible = ref(false)
const selectedAgentId = ref<number | null>(null)
const agentForm = reactive({
  id: 0,
  code: '',
  name: '',
  systemPrompt: '',
  enabled: true,
  skillIds: [] as number[],
})
const skillReferenceAll = reactive<Record<number, boolean>>({})
const skillReferenceIds = reactive<Record<number, string[]>>({})

type KnowledgeReferenceOption = { id: string; title: string }
function getKnowledgeReferences(skill: AiSkill): KnowledgeReferenceOption[] {
  const refs = skill.knowledgePayload?.references
  if (!Array.isArray(refs)) return []
  return refs
    .filter((item: any) => item && typeof item.id === 'string' && typeof item.title === 'string')
    .map((item: any) => ({ id: item.id, title: item.title }))
}

const selectedKnowledgeSkills = computed(() =>
  aiStore.knowledgeSkills.filter(
    (skill) => agentForm.skillIds.includes(skill.id) && getKnowledgeReferences(skill).length > 0,
  ),
)

function clearReferenceSelections() {
  Object.keys(skillReferenceAll).forEach((id) => delete skillReferenceAll[Number(id)])
  Object.keys(skillReferenceIds).forEach((id) => delete skillReferenceIds[Number(id)])
}

function ensureReferenceSelection(skillId: number) {
  if (skillReferenceAll[skillId] === undefined) skillReferenceAll[skillId] = false
  if (!skillReferenceIds[skillId]) skillReferenceIds[skillId] = []
}

function applyReferenceBindings(skillIds: number[], bindings: AiAgentSkillBinding[]) {
  clearReferenceSelections()
  const bySkillId = new Map(bindings.map((binding) => [binding.skillId, binding]))
  aiStore.knowledgeSkills.forEach((skill) => {
    if (!skillIds.includes(skill.id) || getKnowledgeReferences(skill).length === 0) return
    const binding = bySkillId.get(skill.id)
    skillReferenceAll[skill.id] = binding?.referenceIds == null
    skillReferenceIds[skill.id] = binding?.referenceIds ?? []
  })
}

watch(
  () => [...agentForm.skillIds],
  (skillIds) => {
    const selected = new Set(skillIds)
    Object.keys(skillReferenceAll).forEach((id) => {
      if (!selected.has(Number(id))) delete skillReferenceAll[Number(id)]
    })
    Object.keys(skillReferenceIds).forEach((id) => {
      if (!selected.has(Number(id))) delete skillReferenceIds[Number(id)]
    })
    selectedKnowledgeSkills.value.forEach((skill) => ensureReferenceSelection(skill.id))
  },
)

function openCreate() {
  editing.value = false
  agentForm.id = 0
  agentForm.code = ''
  agentForm.name = ''
  agentForm.systemPrompt = ''
  agentForm.enabled = true
  // 新建默认挂载全部工具（保持升级前「全部工具」行为；用户可按需取消勾选）
  agentForm.skillIds = aiStore.toolSkills.map((s) => s.id)
  clearReferenceSelections()
  dialogVisible.value = true
}

async function openEdit(agent: AiAgent) {
  if (isBuiltinAgentCode(agent.code)) {
    ElMessage.info('内置智能体由系统维护，可启停但不可修改。')
    return
  }
  editing.value = true
  agentForm.id = agent.id
  agentForm.code = agent.code
  agentForm.name = agent.name
  agentForm.systemPrompt = agent.systemPrompt
  agentForm.enabled = agent.enabled
  const [skillIds, bindings] = await Promise.all([
    aiStore.getAgentSkillIds(agent.id),
    aiStore.getAgentSkillBindings(agent.id),
  ])
  agentForm.skillIds = skillIds
  applyReferenceBindings(skillIds, bindings)
  dialogVisible.value = true
}

async function saveAgent() {
  if (!agentForm.code.trim() || !agentForm.name.trim()) {
    ElMessage.warning('请填写智能体编号和名称')
    return
  }
  try {
    // saveAgent 返回 agent id（新建/更新统一）；再持久化技能挂载
    const id = await aiStore.saveAgent({
      code: agentForm.code.trim(),
      name: agentForm.name.trim(),
      systemPrompt: agentForm.systemPrompt,
      enabled: agentForm.enabled,
    })
    const bindings: AiAgentSkillBinding[] = agentForm.skillIds.map((skillId) => {
      const skill = aiStore.knowledgeSkills.find((item) => item.id === skillId)
      if (!skill || getKnowledgeReferences(skill).length === 0) return { skillId }
      return {
        skillId,
        referenceIds: skillReferenceAll[skillId] ? null : [...(skillReferenceIds[skillId] || [])],
      }
    })
    await aiStore.setAgentSkillBindings(id, bindings)
    ElMessage.success(editing.value ? '智能体已更新' : '智能体已创建')
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error('保存失败：' + (e instanceof Error ? e.message : String(e)))
  }
}

async function removeAgent(agent: AiAgent) {
  if (isBuiltinAgentCode(agent.code)) {
    ElMessage.warning('内置智能体不可删除，可通过启用开关将其隐藏。')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除智能体「${agent.name}」吗？`, '删除确认', { type: 'warning' })
    await aiStore.deleteAgent(agent.id)
    ElMessage.success('已删除')
  } catch {
    /* 取消 */
  }
}

async function toggleAgent(agent: AiAgent) {
  try {
    await aiStore.setAgentEnabled(agent.id, !agent.enabled)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '智能体启用状态更新失败')
  }
}

function getAgentTeacherSupport(agent: AiAgent): string {
  return (
    getBuiltinAgentPreset(agent.code)?.teacherSupport ??
    '根据管理员配置的提示词和知识技能，为老师提供自定义支持'
  )
}

const selectedAgent = computed(() =>
  aiStore.agents.find((agent) => agent.id === selectedAgentId.value) ?? null,
)

const selectedAgentPreset = computed(() =>
  selectedAgent.value ? getBuiltinAgentPreset(selectedAgent.value.code) : null,
)

function getAgentDisplayName(agent: AiAgent): string {
  return getBuiltinAgentPreset(agent.code)?.displayName ?? agent.name
}

function getAgentAlias(agent: AiAgent): string {
  return getBuiltinAgentPreset(agent.code)?.name ?? '自定义智能体'
}

function getAgentAvatarText(agent: AiAgent): string {
  return (getBuiltinAgentPreset(agent.code)?.avatarText ?? agent.name.trim().slice(0, 1)) || '智'
}

function getAgentAvatarTone(agent: AiAgent): string {
  return getBuiltinAgentPreset(agent.code)?.avatarTone ?? 'custom'
}

function getAgentExpertiseTags(agent: AiAgent): string[] {
  return getBuiltinAgentPreset(agent.code)?.expertiseTags ?? ['自定义支持']
}

function getAgentTagline(agent: AiAgent): string {
  return getBuiltinAgentPreset(agent.code)?.tagline ?? '按学校实际需要配置的自定义智能体。'
}

function openAgentDetail(agent: AiAgent) {
  selectedAgentId.value = agent.id
  detailDialogVisible.value = true
}

// ===== 全部会话管理（仅 admin）=====
const sessionMsgVisible = ref(false)
const sessionMessages = ref<Array<{ role: string; content: string }>>([])

async function viewSession(id: number) {
  try {
    const msgs = await aiStore.getViewMessages(id)
    sessionMessages.value = msgs.map((m) => ({ role: m.role, content: m.content }))
    sessionMsgVisible.value = true
  } catch (e) {
    ElMessage.error('加载会话消息失败：' + (e instanceof Error ? e.message : String(e)))
  }
}

async function removeSession(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该会话吗？', '删除确认', { type: 'warning' })
    await aiStore.deleteSession(id)
    ElMessage.success('已删除')
  } catch {
    /* 取消 */
  }
}
</script>

<template>
  <div class="ai-agent-config">
    <!-- 模型服务配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span>模型服务配置</span>
          <el-tag v-if="aiStore.isConfigured" type="success" size="small">已配置 Key</el-tag>
          <el-tag v-else type="info" size="small">未配置 Key</el-tag>
        </div>
      </template>

      <el-form label-width="120px" label-position="right">
        <el-form-item label="模型服务">
          <el-select
            v-model="configForm.activeProviderCode"
            placeholder="选择模型服务"
            style="width: 280px"
            @change="onProviderChange"
          >
            <el-option
              v-for="p in aiStore.providers"
              :key="p.code"
              :label="p.name"
              :value="p.code"
            >
              <span>{{ p.name }}</span>
              <el-tag v-if="!p.enabled" size="small" type="info" style="margin-left: 8px">未启用</el-tag>
            </el-option>
          </el-select>
          <div class="field-hint" style="margin-top: 4px; margin-left: 0">
            <span>能力：</span>
            <el-tag v-for="t in capabilityTags" :key="t.label" :type="t.type" size="small" style="margin-right: 6px">
              {{ t.label }}
            </el-tag>
            <span v-if="capabilityTags.length === 0">—</span>
          </div>
        </el-form-item>

        <el-form-item label="API Key">
          <el-input
            v-model="configForm.apiKeyInput"
            type="password"
            show-password
            :placeholder="apiKeyPlaceholder"
          />
          <div class="field-hint">
            API Key 加密存储于本地数据库，仅在本机解密使用。
            <el-button v-if="aiStore.isConfigured" link type="danger" size="small" @click="clearApiKey">
              清除 Key
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="接口地址">
          <el-input v-model="configForm.baseUrl" placeholder="https://api.deepseek.com" />
        </el-form-item>

        <el-form-item label="默认模型">
          <el-input
            v-model="configForm.defaultModel"
            :placeholder="isDoubao ? '接入点 ID，如 ep-2024xxxxxx-xxxxx' : 'deepseek-v4-flash'"
          />
          <div v-if="isDoubao" class="field-hint">
            豆包填「推理接入点 ID」（火山方舟控制台创建接入点后获得，形如 ep-xxx），非模型名。
          </div>
        </el-form-item>

        <el-form-item label="启用此服务">
          <el-switch v-model="configForm.providerEnabled" />
          <span class="field-hint-inline">关闭后该服务不可用于对话（与下方「AI 总开关」独立）</span>
        </el-form-item>

        <el-form-item label="月度预算(元)">
          <el-input-number v-model="configForm.monthlyBudgetYuan" :min="0" :step="10" controls-position="right" />
          <span class="field-hint-inline">本月已用 {{ aiStore.monthUsage.costYuan.toFixed(4) }} 元</span>
        </el-form-item>

        <el-form-item label="超预算截断">
          <el-switch v-model="configForm.blockOnOverage" />
          <span class="field-hint-inline">开启后，本月花费超预算时阻止继续提问</span>
        </el-form-item>

        <el-form-item label="AI 总开关">
          <el-switch v-model="configForm.enabled" />
          <span class="field-hint-inline">全局关闭后所有模型服务不可用</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
          <el-button :loading="aiStore.testing" :disabled="!aiStore.isConfigured" @click="testConnection">
            测试连接
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用量 -->
    <el-card shadow="never" class="config-card">
      <template #header><span>本月用量</span></template>
      <div class="usage-row">
        <div class="usage-text">
          {{ aiStore.monthUsage.costYuan.toFixed(4) }} / {{ aiStore.providerConfig?.monthlyBudgetYuan ?? 0 }} 元
          · {{ aiStore.monthUsage.assistantCount }} 次回复
        </div>
        <el-progress :percentage="budgetPercent" :status="budgetPercent >= 90 ? 'warning' : ''" />
      </div>
    </el-card>

    <!-- 智能体管理 -->
    <el-card shadow="never" class="config-card agent-management-card">
      <template #header>
        <div class="card-header">
          <span>智能体管理</span>
          <el-button type="primary" size="small" @click="openCreate">新增智能体</el-button>
        </div>
      </template>

      <div v-if="aiStore.agents.length > 0" class="agent-grid">
        <article
          v-for="agent in aiStore.agents"
          :key="agent.id"
          class="agent-card"
          :class="{ 'agent-card--disabled': !agent.enabled }"
        >
          <button
            type="button"
            class="agent-card__main"
            :aria-label="`查看${getAgentDisplayName(agent)}详情`"
            @click="openAgentDetail(agent)"
          >
            <span class="agent-card__identity">
              <span class="agent-avatar" :class="`agent-avatar--${getAgentAvatarTone(agent)}`" aria-hidden="true">
                {{ getAgentAvatarText(agent) }}
              </span>
              <span class="agent-card__titles">
                <span class="agent-card__name-line">
                  <strong>{{ getAgentDisplayName(agent) }}</strong>
                  <el-tag v-if="isBuiltinAgentCode(agent.code)" size="small" type="info" effect="plain">内置</el-tag>
                </span>
                <span class="agent-card__alias">{{ getAgentAlias(agent) }}</span>
              </span>
            </span>

            <span class="agent-card__support">{{ getAgentTeacherSupport(agent) }}</span>

            <span class="agent-card__tags" aria-label="擅长场景">
              <span v-for="tag in getAgentExpertiseTags(agent)" :key="tag" class="agent-expertise-tag">
                {{ tag }}
              </span>
            </span>
          </button>

          <div class="agent-card__footer">
            <span class="agent-status" :class="{ 'agent-status--enabled': agent.enabled }">
              <span class="agent-status__dot" aria-hidden="true"></span>
              {{ agent.enabled ? '已启用' : '未启用' }}
            </span>
            <div class="agent-card__controls">
              <div v-if="!isBuiltinAgentCode(agent.code)" class="custom-agent-actions">
                <el-button link type="primary" size="small" @click="openEdit(agent)">编辑</el-button>
                <el-button link type="danger" size="small" @click="removeAgent(agent)">删除</el-button>
              </div>
              <el-switch
                :model-value="agent.enabled"
                :aria-label="`${agent.enabled ? '停用' : '启用'}${getAgentDisplayName(agent)}`"
                @change="toggleAgent(agent)"
              />
            </div>
          </div>
        </article>
      </div>
      <el-empty v-else description="暂无智能体" :image-size="72" />
    </el-card>

    <!-- 全部会话管理（仅 admin） -->
    <el-card v-if="isAdmin" shadow="never" class="config-card">
      <template #header>
        <div class="card-header"><span>全部会话（管理员视图）</span></div>
      </template>
      <el-table :data="aiStore.allSessions" stripe size="small" empty-text="暂无会话">
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column label="所属用户" width="150">
          <template #default="{ row }">
            <span>{{ row.username || '—' }}</span>
            <el-tag v-if="row.role" size="small" :type="row.role === 'admin' ? 'danger' : 'info'" style="margin-left: 6px">
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="agent_code" label="智能体" width="150" show-overflow-tooltip />
        <el-table-column prop="message_count" label="消息数" width="80" />
        <el-table-column prop="updated_at" label="最后更新" width="160" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewSession(row.id)">查看</el-button>
            <el-button link type="danger" size="small" @click="removeSession(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 智能体详情 -->
    <el-dialog
      v-model="detailDialogVisible"
      width="600px"
      class="agent-detail-dialog"
      destroy-on-close
      append-to-body
    >
      <template v-if="selectedAgent" #header>
        <div class="agent-detail__header">
          <span
            class="agent-avatar agent-avatar--large"
            :class="`agent-avatar--${getAgentAvatarTone(selectedAgent)}`"
            aria-hidden="true"
          >
            {{ getAgentAvatarText(selectedAgent) }}
          </span>
          <div class="agent-detail__identity">
            <div class="agent-detail__title-line">
              <h3>{{ getAgentDisplayName(selectedAgent) }}</h3>
              <el-tag v-if="selectedAgentPreset" size="small" type="info" effect="plain">内置</el-tag>
            </div>
            <div class="agent-detail__alias">{{ getAgentAlias(selectedAgent) }}</div>
            <p>{{ getAgentTagline(selectedAgent) }}</p>
          </div>
        </div>
      </template>

      <div v-if="selectedAgent" class="agent-detail__content">
        <section class="agent-detail__section">
          <h4>可以怎样支持老师</h4>
          <p>{{ getAgentTeacherSupport(selectedAgent) }}</p>
        </section>

        <section class="agent-detail__section">
          <h4>擅长场景</h4>
          <div class="agent-detail__tags">
            <el-tag v-for="tag in getAgentExpertiseTags(selectedAgent)" :key="tag" effect="plain">
              {{ tag }}
            </el-tag>
          </div>
        </section>

        <section v-if="selectedAgentPreset?.starterPrompts.length" class="agent-detail__section">
          <h4>可以这样问</h4>
          <div class="agent-prompt-list">
            <div v-for="prompt in selectedAgentPreset.starterPrompts" :key="prompt" class="agent-prompt-example">
              “{{ prompt }}”
            </div>
          </div>
        </section>
      </div>

      <template v-if="selectedAgent" #footer>
        <div class="agent-detail__footer">
          <div>
            <strong>{{ selectedAgent.enabled ? '已允许老师使用' : '当前未向老师启用' }}</strong>
            <span>启用后，老师可在 AI 助手中选择此智能体。</span>
          </div>
          <el-switch
            :model-value="selectedAgent.enabled"
            :aria-label="`${selectedAgent.enabled ? '停用' : '启用'}${getAgentDisplayName(selectedAgent)}`"
            @change="toggleAgent(selectedAgent)"
          />
        </div>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑智能体' : '新增智能体'" width="640px">
      <el-form label-width="90px">
        <el-form-item label="编号">
          <el-input v-model="agentForm.code" :disabled="editing" placeholder="如 special_ed_teacher" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="agentForm.name" placeholder="如 特教老师" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="agentForm.enabled" />
        </el-form-item>
        <el-form-item label="挂载技能">
          <el-select
            v-model="agentForm.skillIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择该智能体挂载的工具与知识技能"
            style="width: 100%"
          >
            <el-option-group label="工具（可调用的功能）">
              <el-option
                v-for="s in aiStore.toolSkills"
                :key="s.id"
                :label="s.name"
                :value="s.id"
              />
            </el-option-group>
            <el-option-group label="知识（注入专业方法论到对话）">
              <el-option
                v-for="s in aiStore.knowledgeSkills"
                :key="s.id"
                :label="s.name"
                :value="s.id"
              />
            </el-option-group>
          </el-select>
          <div class="field-hint">
            「工具」控制可调用功能；「知识」注入专业方法论。新建默认挂载全部工具、不挂知识；引用资料可在下方按需选择。
          </div>
        </el-form-item>
        <el-form-item v-if="selectedKnowledgeSkills.length > 0" label="引用资料">
          <div class="reference-selection-list">
            <div v-for="skill in selectedKnowledgeSkills" :key="skill.id" class="reference-selection-item">
              <div class="reference-selection-header">
                <strong>{{ skill.name }}</strong>
                <el-checkbox v-model="skillReferenceAll[skill.id]">注入全部引用资料</el-checkbox>
              </div>
              <el-checkbox-group v-if="!skillReferenceAll[skill.id]" v-model="skillReferenceIds[skill.id]">
                <el-checkbox v-for="reference in getKnowledgeReferences(skill)" :key="reference.id" :value="reference.id">
                  {{ reference.title }}
                </el-checkbox>
              </el-checkbox-group>
              <div class="field-hint">未勾选时只注入技能主体，可减少上下文与成本。</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="提示词">
          <el-input
            v-model="agentForm.systemPrompt"
            type="textarea"
            :rows="10"
            placeholder="定义该智能体的角色、专长、回答风格与边界……"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAgent">保存</el-button>
      </template>
    </el-dialog>

    <!-- 会话消息查看对话框（admin） -->
    <el-dialog v-model="sessionMsgVisible" title="会话消息" width="640px">
      <div class="session-msg-list">
        <div v-for="(m, idx) in sessionMessages" :key="idx" class="session-msg" :class="m.role">
          <span class="session-msg-role">{{ m.role }}</span>
          <span class="session-msg-content">{{ m.content }}</span>
        </div>
        <div v-if="sessionMessages.length === 0" class="session-msg-empty">无消息</div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.ai-agent-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card {
  border: 1px solid var(--el-border-color-light, #ebeef5);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-hint-inline {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.reference-selection-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reference-selection-item {
  padding: 10px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
}

.reference-selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.usage-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.usage-text {
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
}

.agent-management-card :deep(.el-card__body) {
  background: var(--el-fill-color-extra-light, #f7f8fa);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}

.agent-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: var(--el-bg-color, #ffffff);
  box-shadow: 0 1px 3px rgb(31 35 41 / 12%);
  transition-property: transform, box-shadow;
  transition-duration: 180ms;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.agent-card__main {
  display: flex;
  min-height: 214px;
  width: 100%;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  padding: 18px 18px 14px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
}

.agent-card__main:focus-visible {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: -3px;
}

.agent-card__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  display: inline-flex;
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  outline: 1px solid rgb(31 35 41 / 8%);
  outline-offset: -1px;
}

.agent-avatar--teaching {
  background: #e9f2ff;
  color: #245a9a;
}

.agent-avatar--communication {
  background: #e7f6f2;
  color: #17685a;
}

.agent-avatar--observation {
  background: #fff3dc;
  color: #8a5a12;
}

.agent-avatar--family {
  background: #f7ece8;
  color: #8a4936;
}

.agent-avatar--wellbeing {
  background: #f0edf9;
  color: #5f4b8b;
}

.agent-avatar--custom {
  background: var(--el-fill-color-light, #f2f3f5);
  color: var(--el-text-color-regular, #606266);
}

.agent-card__titles {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.agent-card__name-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.agent-card__name-line strong {
  overflow: hidden;
  color: var(--el-text-color-primary, #303133);
  font-size: 17px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-card__alias {
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  line-height: 1.35;
}

.agent-card__support {
  display: -webkit-box;
  overflow: hidden;
  min-height: 68px;
  color: var(--el-text-color-regular, #606266);
  font-size: 14px;
  line-height: 1.65;
  text-wrap: pretty;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.agent-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: auto;
}

.agent-expertise-tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--el-fill-color-light, #f2f3f5);
  color: var(--el-text-color-regular, #606266);
  font-size: 12px;
  line-height: 1;
}

.agent-card__footer {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 18px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.agent-card__controls,
.custom-agent-actions,
.agent-status {
  display: flex;
  align-items: center;
}

.agent-card__controls {
  gap: 10px;
}

.custom-agent-actions {
  gap: 4px;
}

.custom-agent-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.custom-agent-actions :deep(.el-button) {
  height: auto;
  padding: 0;
  font-size: 12px;
}

.agent-status {
  gap: 7px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}

.agent-status__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder, #a8abb2);
}

.agent-status--enabled {
  color: var(--el-color-success-dark-2, #529b2e);
}

.agent-status--enabled .agent-status__dot {
  background: var(--el-color-success, #67c23a);
}

.agent-card--disabled .agent-avatar,
.agent-card--disabled .agent-card__support,
.agent-card--disabled .agent-card__tags {
  opacity: 0.68;
}

.agent-detail__header {
  display: flex;
  padding-right: 28px;
  align-items: flex-start;
  gap: 14px;
}

.agent-avatar--large {
  width: 64px;
  height: 64px;
  flex-basis: 64px;
  border-radius: 16px;
  font-size: 24px;
}

.agent-detail__identity {
  min-width: 0;
  flex: 1;
}

.agent-detail__title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-detail__title-line h3 {
  margin: 0;
  color: var(--el-text-color-primary, #303133);
  font-size: 21px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.012em;
}

.agent-detail__alias {
  margin-top: 3px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}

.agent-detail__identity p {
  margin: 8px 0 0;
  color: var(--el-text-color-regular, #606266);
  font-size: 14px;
  line-height: 1.55;
}

.agent-detail__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.agent-detail__section h4 {
  margin: 0 0 10px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  font-weight: 600;
}

.agent-detail__section p {
  margin: 0;
  color: var(--el-text-color-regular, #606266);
  font-size: 14px;
  line-height: 1.75;
  text-wrap: pretty;
}

.agent-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.agent-prompt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-prompt-example {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light, #fafafa);
  color: var(--el-text-color-regular, #606266);
  font-size: 13px;
  line-height: 1.55;
}

.agent-detail__footer {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 4px 0;
  text-align: left;
}

.agent-detail__footer > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.agent-detail__footer strong {
  color: var(--el-text-color-primary, #303133);
  font-size: 14px;
}

.agent-detail__footer span {
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
}

:global(.agent-detail-dialog) {
  max-width: calc(100vw - 32px);
  border-radius: 14px;
}

:global(.agent-detail-dialog .el-dialog__body) {
  max-height: min(62vh, 620px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-top: 18px;
}

:global(.agent-detail-dialog .el-dialog__footer) {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}

@media (hover: hover) {
  .agent-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgb(31 35 41 / 13%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-card {
    transition: none;
  }
}

@media (max-width: 720px) {
  .agent-grid {
    grid-template-columns: 1fr;
  }

  .agent-card__main {
    min-height: auto;
  }

  .agent-detail__header {
    padding-right: 20px;
  }

  .agent-detail__footer {
    align-items: flex-start;
  }
}

.session-msg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
}

.session-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-light, #f5f7fa);
}

.session-msg.user {
  align-items: flex-end;
}

.session-msg-role {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.session-msg-content {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.session-msg-empty {
  text-align: center;
  color: var(--el-text-color-secondary, #909399);
  padding: 24px;
}
</style>
