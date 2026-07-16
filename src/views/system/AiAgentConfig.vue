<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAiStore } from '@/stores/ai'
import { useAuthStore } from '@/stores/auth'
import type { AiAgent } from '@/database/ai-api'

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
const agentForm = reactive({
  id: 0,
  code: '',
  name: '',
  systemPrompt: '',
  enabled: true,
})

function openCreate() {
  editing.value = false
  agentForm.id = 0
  agentForm.code = ''
  agentForm.name = ''
  agentForm.systemPrompt = ''
  agentForm.enabled = true
  dialogVisible.value = true
}

function openEdit(agent: AiAgent) {
  editing.value = true
  agentForm.id = agent.id
  agentForm.code = agent.code
  agentForm.name = agent.name
  agentForm.systemPrompt = agent.systemPrompt
  agentForm.enabled = agent.enabled
  dialogVisible.value = true
}

async function saveAgent() {
  if (!agentForm.code.trim() || !agentForm.name.trim()) {
    ElMessage.warning('请填写智能体编号和名称')
    return
  }
  try {
    await aiStore.saveAgent({
      code: agentForm.code.trim(),
      name: agentForm.name.trim(),
      systemPrompt: agentForm.systemPrompt,
      enabled: agentForm.enabled,
    })
    ElMessage.success(editing.value ? '智能体已更新' : '智能体已创建')
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error('保存失败：' + (e instanceof Error ? e.message : String(e)))
  }
}

async function removeAgent(agent: AiAgent) {
  try {
    await ElMessageBox.confirm(`确定删除智能体「${agent.name}」吗？`, '删除确认', { type: 'warning' })
    await aiStore.deleteAgent(agent.id)
    ElMessage.success('已删除')
  } catch {
    /* 取消 */
  }
}

async function toggleAgent(agent: AiAgent) {
  await aiStore.saveAgent({
    code: agent.code,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    enabled: !agent.enabled,
  })
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
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span>智能体管理</span>
          <el-button type="primary" size="small" @click="openCreate">新增智能体</el-button>
        </div>
      </template>

      <el-table :data="aiStore.agents" stripe>
        <el-table-column prop="name" label="名称" width="160" />
        <el-table-column prop="code" label="编号" width="180" />
        <el-table-column label="启用" width="90">
          <template #default="{ row }">
            <el-switch :model-value="row.enabled" @change="toggleAgent(row)" />
          </template>
        </el-table-column>
        <el-table-column label="提示词" min-width="200">
          <template #default="{ row }">
            <span class="prompt-preview">{{ row.systemPrompt.slice(0, 60) }}…</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="removeAgent(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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

.usage-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.usage-text {
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
}

.prompt-preview {
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
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
