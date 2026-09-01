<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Paperclip, Promotion, Setting, Tickets } from '@element-plus/icons-vue'
import type { AiAttachmentRef } from '@/database/ai-api'
import type { ToolArtifact } from '@/services/ai-tools'
import { useAiStore } from '@/stores/ai'
import { useStudentStore } from '@/stores/student'
import { getBuiltinAgentPreset } from '@/data/ai-agent-presets'
import AiAgentAvatar from '@/features/ai/components/AiAgentAvatar.vue'
import AiAssistantFloatingButton from '@/features/ai/components/AiAssistantFloatingButton.vue'
import AiChatTranscript from '@/features/ai/components/AiChatTranscript.vue'
import { formatTokenCount } from '@/features/ai/usage-format'
import { buildAIReportWordPayload } from '@/utils/ai-report-word-builder'
import { exportWordDocument } from '@/utils/export-word'
import {
  AI_ASSISTANT_OPEN_EVENT,
  type AiAssistantOpenDetail,
} from '@/features/ai/assistant-launcher'

const router = useRouter()
const route = useRoute()
const aiStore = useAiStore()
const studentStore = useStudentStore()

const drawerVisible = ref(false)
const inputText = ref('')
const inputRef = ref<{ focus: () => void } | null>(null)
const editingMessageId = ref<number | null>(null)
const scrollRef = ref()
const pendingImages = ref<Array<{ file: File; previewUrl: string }>>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingDocuments = ref<Array<{ file: File }>>([])

// ===== 流式 IPC 事件回调（onMounted 注册，onUnmounted 解绑，引用须稳定）=====
const chunkHandler = (_event: unknown, payload: { delta?: string } | undefined) => {
  aiStore.onChunk(payload?.delta || '')
}
const errorHandler = (_event: unknown, payload: { error?: string } | undefined) => {
  if (payload?.error) ElMessage.error(payload.error)
}
const assistantOpenHandler = (event: Event) => {
  const detail = (event as CustomEvent<AiAssistantOpenDetail>).detail
  void openDrawer(detail?.agentCode, detail?.sessionId)
}

onMounted(async () => {
  window.electronAPI.on('ai:chunk', chunkHandler)
  window.electronAPI.on('ai:error', errorHandler)
  window.addEventListener(AI_ASSISTANT_OPEN_EVENT, assistantOpenHandler)
  await aiStore.loadAll()
})

onUnmounted(() => {
  window.electronAPI.off('ai:chunk', chunkHandler)
  window.electronAPI.off('ai:error', errorHandler)
  window.removeEventListener(AI_ASSISTANT_OPEN_EVENT, assistantOpenHandler)
})

const budgetPercent = computed(() => {
  const budget = aiStore.providerConfig?.monthlyBudgetTokens || 0
  if (budget <= 0) return 0
  return Math.min(100, Math.round((aiStore.monthUsage.totalTokens / budget) * 100))
})

// ===== 会话绑定学生（M4/M5：长期记忆；v4.2 整理完可随时更换） =====
const boundStudentId = ref<number | null>(null)

/** 当前绑定学生的展示名（下拉选中态展示用） */
const boundStudentLabel = computed(() => {
  const sid = boundStudentId.value
  return sid == null ? '' : (studentOptions.value.find((s) => s.id === sid)?.label ?? '')
})

/** 学生下拉选项（服务团队视角：全校学生，绑定后记忆权限在 store 层过滤） */
const studentOptions = computed(() =>
  (studentStore.students || []).map((s) => ({
    id: s.id,
    label: `${s.name}${s.current_class_name ? `（${s.current_class_name}）` : ''}`,
  })),
)

/** 当前会话绑定的学生（刷新时从 store 读） */
function refreshBoundStudent() {
  const sid = aiStore.currentSessionId
  if (!sid) {
    boundStudentId.value = null
    return
  }
  boundStudentId.value = aiStore.getSessionStudentId(sid)
}

function handleBindStudent(value: number | '' | null | undefined) {
  const sid = aiStore.currentSessionId
  if (!sid) return
  const studentId = value == null || value === '' ? null : Number(value)
  const targetLabel = studentId == null ? '' : (studentOptions.value.find((s) => s.id === studentId)?.label ?? '')
  if (aiStore.bindSessionStudent(sid, studentId)) {
    boundStudentId.value = studentId
    if (studentId == null) {
      ElMessage.success('已取消关联，此后的对话不再记录长期记忆；此前的对话仍记入原学生')
    } else {
      ElMessage.success(`已关联「${targetLabel}」，此后的对话将自动记入其长期记忆`)
    }
  } else {
    ElMessage.warning('该对话还有内容正在整理，请稍后再更换学生')
    refreshBoundStudent()
  }
}

// 会话切换/新建时刷新绑定状态
watch(
  () => [aiStore.currentSessionId, aiStore.currentMessages.length],
  () => refreshBoundStudent(),
)

const supportsVision = computed(() => !!aiStore.providerConfig?.supportsVision)
const enabledModels = computed(() => aiStore.providerModels.filter((model) => model.enabled))
const activeModelCode = computed({
  get: () => aiStore.providerConfig?.activeModelCode || '',
  set: (code: string) => {
    if (code) void aiStore.setActiveProviderModel(code)
  },
})
const currentModelLabel = computed(() => aiStore.providerConfig?.activeModelName || '未选择模型')
const currentModelId = computed(() => aiStore.providerConfig?.defaultModel || '')
const currentAgentSubtitle = computed(() => {
  const role = currentPreset.value?.displayName || aiStore.currentAgent?.name || '智能体'
  const model = currentModelLabel.value
  return `${role} · ${model}`
})
const currentPreset = computed(() => getBuiltinAgentPreset(aiStore.currentAgentCode))
const starterPrompts = computed(() => currentPreset.value?.starterPrompts ?? [])
const canGenerateReport = computed(
  () => !currentPreset.value || currentPreset.value.toolCodes.includes('generate_report'),
)
const canSend = computed(
  () =>
    !!inputText.value.trim() ||
    pendingImages.value.length > 0 ||
    pendingDocuments.value.length > 0,
)

const MAX_VISIBLE_MESSAGES = 60
const showAllMessages = ref(false)

const displayMessages = computed(() => {
  const all: Array<{
    id?: number
    role: 'user' | 'assistant' | 'system'
    content: string
    pending?: boolean
    attachments?: AiAttachmentRef[] | null
    toolArtifacts?: ToolArtifact[] | null
  }> = aiStore.currentMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    attachments: m.attachments,
    toolArtifacts: m.toolArtifacts,
  }))
  if (aiStore.sending || aiStore.streamingContent) {
    all.push({ role: 'assistant', content: aiStore.streamingContent || '正在思考…', pending: true })
  }
  if (showAllMessages.value || all.length <= MAX_VISIBLE_MESSAGES) return all
  return all.slice(all.length - MAX_VISIBLE_MESSAGES)
})

const hiddenMessageCount = computed(() => {
  const total = aiStore.currentMessages.length + (aiStore.sending || aiStore.streamingContent ? 1 : 0)
  return Math.max(0, total - MAX_VISIBLE_MESSAGES)
})

const isImmersiveRoute = computed(() => route.meta.immersiveShell === true)

function scrollToBottom() {
  nextTick(() => {
    const wrap = scrollRef.value?.wrapRef as HTMLElement | undefined
    if (wrap) wrap.scrollTop = wrap.scrollHeight
  })
}

watch(() => aiStore.streamingContent, scrollToBottom)
watch(() => aiStore.currentMessages.length, scrollToBottom)
watch(
  [() => aiStore.currentSessionId, () => aiStore.currentAgentCode],
  ([sessionId, agentCode], [previousSessionId, previousAgentCode]) => {
    showAllMessages.value = false
    if (
      editingMessageId.value !== null &&
      (sessionId !== previousSessionId || agentCode !== previousAgentCode)
    ) {
      cancelMessageEdit()
    }
  },
)

async function openDrawer(agentCode?: string, sessionId?: number) {
  if (!aiStore.providerConfig || aiStore.agents.length === 0) await aiStore.loadAll()
  if (studentStore.students.length === 0) await studentStore.loadStudents()
  if (sessionId) {
    await aiStore.selectSession(sessionId)
  } else if (agentCode) {
    const agent = aiStore.enabledAgents.find((item) => item.code === agentCode)
    if (!agent) {
      ElMessage.warning('该智能体当前未启用，请联系学校管理员。')
      return
    }
    aiStore.selectAgent(agentCode)
  }
  drawerVisible.value = true
  refreshBoundStudent()
  scrollToBottom()
}

function getAgentOptionLabel(code: string, name: string) {
  const preset = getBuiltinAgentPreset(code)
  return preset ? `${preset.displayName} · ${preset.name}` : name
}

function formatSessionUpdatedAt(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function getModelOptionLabel(name: string, modelId: string) {
  return modelId ? `${name} · ${modelId}` : name
}

// 浏览器 File → data URL（预览用；CSP 允许 data:，避免 blob: 被拦）
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

/** 曲别针入口：图片与文档统一选择，按类型自动分流到图片预览 / 文档 chip */
function triggerPickFile() {
  if (aiStore.sending || editingMessageId.value !== null) return
  fileInputRef.value?.click()
}
async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return
  const allowedDoc = new Set(['pdf', 'docx', 'xlsx'])
  for (const f of Array.from(files)) {
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (f.type.startsWith('image/')) {
      if (!supportsVision.value) {
        ElMessage.warning(`当前模型不支持图片，已跳过：${f.name}`)
        continue
      }
      const previewUrl = await readFileAsDataUrl(f)
      pendingImages.value.push({ file: f, previewUrl })
    } else if (allowedDoc.has(ext)) {
      pendingDocuments.value.push({ file: f })
    } else {
      ElMessage.warning(`不支持的文件：${f.name}（仅支持图片 / PDF / Word / Excel）`)
    }
  }
  target.value = '' // 允许重复选同一文件
}
function removePendingImage(idx: number) {
  pendingImages.value.splice(idx, 1)
}

function removePendingDocument(idx: number) {
  pendingDocuments.value.splice(idx, 1)
}

async function send() {
  const text = inputText.value.trim()
  const editMessageId = editingMessageId.value
  if (editMessageId !== null) {
    if (!text || aiStore.sending) return
    const res = await aiStore.sendChat(text, undefined, undefined, { editMessageId })
    if (res.ok) {
      inputText.value = ''
      editingMessageId.value = null
    } else if (res.error) {
      ElMessage.error(res.error)
    }
    return
  }

  const imgs = [...pendingImages.value]
  const docs = [...pendingDocuments.value]
  if ((!text && imgs.length === 0 && docs.length === 0) || aiStore.sending) return
  inputText.value = ''
  pendingImages.value = []
  pendingDocuments.value = []
  const res = await aiStore.sendChat(
    text,
    imgs.map((p) => p.file),
    docs.map((p) => p.file),
  )
  if (!res.ok && res.error) {
    ElMessage.error(res.error)
  }
}

function beginMessageEdit(payload: { id: number; content: string }) {
  if (aiStore.sending) return
  editingMessageId.value = payload.id
  inputText.value = payload.content
  pendingImages.value = []
  pendingDocuments.value = []
  nextTick(() => inputRef.value?.focus())
}

function cancelMessageEdit() {
  editingMessageId.value = null
  inputText.value = ''
}

/** Enter 发送；发送中 / 输入法候选确认时允许换行（send 内部有 sending 守卫） */
function onEnterKey(e: KeyboardEvent) {
  if (e.isComposing || aiStore.sending) return
  e.preventDefault()
  void send()
}

/** 「生成报告」快捷按钮：发一句引导语，由 AI 自行调用 generate_report 工具导出 Word */
async function generateReport() {
  if (aiStore.sending) return
  const res = await aiStore.sendChat(
    '请帮我生成一份 Word 报告。如需指定学生或报告类型请先与我确认，再调用 generate_report 工具导出。',
  )
  if (!res.ok && res.error) {
    ElMessage.error(res.error)
  }
}

/** 导出已完成的单条助手回答，不再额外发送生成报告请求。 */
async function exportAssistantMessage({ content }: { content: string }) {
  const answer = content.trim()
  if (!answer) return

  const agentName = currentPreset.value?.displayName || aiStore.currentAgent?.name || 'AI 智能体'
  try {
    await exportWordDocument(
      buildAIReportWordPayload(
        {
          title: `${agentName}回答`,
          subtitle: 'AI 智能体回答导出',
          report_type: 'general',
          sections: [
            {
              type: 'paragraph',
              heading: '回答内容',
              text: answer,
            },
          ],
        },
        { preserveParagraphText: true },
      ),
    )
    ElMessage.success('已导出本条回答为 Word')
  } catch (error) {
    console.error('[AiAssistant] 导出回答失败:', error)
    ElMessage.error('导出回答失败，请重试。')
  }
}

async function sendStarterPrompt(prompt: string) {
  if (aiStore.sending) return
  const res = await aiStore.sendChat(prompt)
  if (!res.ok && res.error) {
    ElMessage.error(res.error)
  }
}

function gotoSettings() {
  drawerVisible.value = false
  router.push({ name: 'System', query: { tab: 'ai-agent' } })
}

function viewAllHistory() {
  drawerVisible.value = false
  void router.push({
    name: 'AiChatHistory',
    query: aiStore.currentAgentCode ? { agent: aiStore.currentAgentCode } : undefined,
  })
}

// 历史会话折叠面板
const sessionCollapse = ref<string[]>([])

async function confirmDeleteSession(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该会话吗？', '删除确认', { type: 'warning' })
    await aiStore.deleteMySession(id)
    ElMessage.success('已删除')
  } catch {
    /* 取消 */
  }
}
</script>

<template>
  <!-- 全局悬浮入口 -->
  <AiAssistantFloatingButton v-if="!drawerVisible && !isImmersiveRoute" @open="openDrawer()" />

  <el-drawer
    v-model="drawerVisible"
    title="AI 智能体"
    direction="rtl"
    size="33%"
    :show-close="false"
    class="ai-drawer"
  >
    <template #header>
      <div class="ai-drawer-header">
        <div class="ai-drawer-titlebar">
          <AiAgentAvatar
            v-if="aiStore.currentAgentCode"
            :agent-code="aiStore.currentAgentCode"
            :agent-name="aiStore.currentAgent?.name || ''"
            size="sm"
          />
          <div class="ai-title-main">
            <el-select
              :model-value="aiStore.currentAgentCode"
              placeholder="选择智能体"
              size="small"
              class="agent-select"
              @change="(v: string) => aiStore.selectAgent(v)"
            >
              <el-option
                v-for="agent in aiStore.enabledAgents"
                :key="agent.code"
                :label="getAgentOptionLabel(agent.code, agent.name)"
                :value="agent.code"
              />
            </el-select>
            <div class="ai-subtitle" :title="currentAgentSubtitle">
              <span>{{ currentAgentSubtitle }}</span>
              <span v-if="currentModelId" class="ai-model-id">{{ currentModelId }}</span>
            </div>
          </div>
        </div>
        <div class="ai-header-actions">
          <el-popover placement="bottom-end" trigger="click" width="280" popper-class="ai-model-popover">
            <template #reference>
              <button
                class="ai-icon-action"
                type="button"
                aria-label="模型与设置"
              >
                <el-icon><Setting /></el-icon>
              </button>
            </template>
            <div class="ai-model-panel">
              <div class="ai-model-panel__label">当前模型</div>
              <el-select
                v-model="activeModelCode"
                placeholder="选择模型"
                size="small"
                class="model-select"
                :disabled="aiStore.sending || enabledModels.length === 0"
              >
                <el-option
                  v-for="model in enabledModels"
                  :key="model.code"
                  :label="getModelOptionLabel(model.name, model.modelId)"
                  :value="model.code"
                >
                  <div class="model-option">
                    <span>{{ model.name }}</span>
                    <small>{{ model.modelId }}</small>
                  </div>
                </el-option>
              </el-select>
            </div>
          </el-popover>
          <button
            class="ai-icon-action ai-new-chat-btn"
            type="button"
            aria-label="新对话"
            title="新对话"
            @click="aiStore.newChat"
          >
            +
          </button>
          <button
            class="ai-icon-action ai-close-btn"
            type="button"
            aria-label="关闭会话面板"
            title="关闭"
            @click="drawerVisible = false"
          >
            ×
          </button>
        </div>
      </div>
    </template>

    <!-- 未配置 Key 引导 -->
    <div v-if="!aiStore.isConfigured" class="ai-empty">
      <p>尚未配置模型服务 API Key。</p>
      <el-button type="primary" size="small" @click="gotoSettings">前往配置</el-button>
    </div>

    <div v-else class="ai-body">
      <!-- 最近会话（最多 6 条；完整历史在个人资料页管理） -->
      <el-collapse
        v-if="aiStore.sessions.length > 0"
        v-model="sessionCollapse"
        class="ai-session-collapse"
      >
        <el-collapse-item name="sessions">
          <template #title>
            <div class="ai-session-collapse-title">
              <span>最近会话 ({{ aiStore.sessions.length }})</span>
              <el-button link type="primary" size="small" @click.stop="viewAllHistory">
                查看全部历史
              </el-button>
            </div>
          </template>
          <div class="ai-session-list">
            <div
              v-for="s in aiStore.sessions"
              :key="s.id"
              class="ai-session-item"
              :class="{ active: s.id === aiStore.currentSessionId }"
              @click="aiStore.selectSession(s.id)"
            >
              <div class="ai-session-copy">
                <span class="ai-session-title">{{ s.title || '新对话' }}</span>
                <span class="ai-session-time">{{ formatSessionUpdatedAt(s.updated_at) }}</span>
              </div>
              <div class="ai-session-actions">
                <el-button link type="primary" size="small" @click.stop="aiStore.selectSession(s.id)">继续</el-button>
                <el-button
                  class="ai-session-del"
                  link
                  type="danger"
                  size="small"
                  @click.stop="confirmDeleteSession(s.id)"
                >删</el-button>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 会话绑定学生（M4/M5：绑定后记忆自动总结注入；v4.2 整理完可随时更换） -->
      <div v-if="aiStore.currentSessionId && aiStore.memoryEnabled" class="ai-memory-bindbar">
        <el-select
          :model-value="boundStudentId"
          placeholder="选择本次对话的学生"
          size="small"
          clearable
          filterable
          style="width: 200px; flex-shrink: 0"
          @change="handleBindStudent"
        >
          <el-option
            v-for="stu in studentOptions"
            :key="stu.id"
            :label="stu.label"
            :value="stu.id"
          />
        </el-select>
        <span v-if="boundStudentId" class="ai-memory-bindbar__hint">已关联「{{ boundStudentLabel }}」，可随时更换；更换后此前的对话仍记入原学生</span>
        <span v-else class="ai-memory-bindbar__hint">不选择也能对话（不会记录长期记忆）；选择学生后，对话将自动记入该学生的长期记忆</span>
      </div>

      <!-- 消息列表 -->
      <el-scrollbar ref="scrollRef" class="ai-msg-scroll">
        <div v-if="displayMessages.length === 0" class="ai-empty ai-welcome">
          <AiAgentAvatar
            v-if="aiStore.currentAgentCode"
            :agent-code="aiStore.currentAgentCode"
            :agent-name="aiStore.currentAgent?.name || ''"
            size="lg"
          />
          <p class="welcome-title">向「{{ aiStore.currentAgent?.name || '智能体' }}」提问吧</p>
          <p v-if="currentPreset" class="welcome-tagline">{{ currentPreset.tagline }}</p>
          <div v-if="starterPrompts.length > 0" class="starter-prompts">
            <button
              v-for="prompt in starterPrompts"
              :key="prompt"
              class="starter-prompt"
              type="button"
              :disabled="aiStore.sending"
              @click="sendStarterPrompt(prompt)"
            >
              {{ prompt }}
            </button>
          </div>
        </div>
        <div
          v-if="hiddenMessageCount > 0 && !showAllMessages"
          class="ai-show-more"
        >
          <el-button link type="primary" @click="showAllMessages = true">
            查看更早的 {{ hiddenMessageCount }} 条消息
          </el-button>
        </div>
        <AiChatTranscript
          v-else
          :messages="displayMessages"
          :tool-steps="aiStore.toolSteps"
          editable
          :editing-disabled="aiStore.sending"
          :export-assistant-messages="canGenerateReport"
          @edit-message="beginMessageEdit"
          @export-assistant-message="exportAssistantMessage"
        />
      </el-scrollbar>
    </div>

    <template #footer>
      <div class="ai-footer">
        <div class="ai-usage">
          <span>
            本月 {{ formatTokenCount(aiStore.monthUsage.totalTokens) }} / {{ formatTokenCount(aiStore.providerConfig?.monthlyBudgetTokens) }} Tokens
          </span>
          <el-progress
            :percentage="budgetPercent"
            :show-text="false"
            :stroke-width="4"
            :status="budgetPercent >= 90 ? 'warning' : ''"
          />
        </div>
        <div v-if="editingMessageId !== null" class="ai-editing-notice">
          <span>正在编辑上一条消息</span>
          <el-tooltip content="取消编辑" placement="top">
            <button
              class="ai-editing-cancel"
              type="button"
              :disabled="aiStore.sending"
              aria-label="取消编辑"
              @click="cancelMessageEdit"
            >
              <el-icon><Close /></el-icon>
            </button>
          </el-tooltip>
        </div>
        <div v-if="pendingImages.length > 0" class="ai-pending-images">
          <div v-for="(p, idx) in pendingImages" :key="idx" class="ai-pending-item">
            <img :src="p.previewUrl" />
            <el-button class="ai-pending-del" link size="small" @click="removePendingImage(idx)">×</el-button>
          </div>
        </div>
        <div v-if="pendingDocuments.length > 0" class="ai-pending-docs">
          <div v-for="(p, idx) in pendingDocuments" :key="idx" class="ai-pending-doc">
            <span class="ai-pending-doc-name">📄 {{ p.file.name }}</span>
            <el-button class="ai-pending-del" link size="small" @click="removePendingDocument(idx)">×</el-button>
          </div>
        </div>
        <div class="ai-composer">
          <div class="ai-composer-main">
            <el-input
              ref="inputRef"
              v-model="inputText"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 8 }"
              resize="none"
              :placeholder="editingMessageId !== null ? '修改消息内容' : '输入问题…'"
              @keydown.enter.exact="onEnterKey"
            />
            <el-tooltip
              :content="aiStore.sending
                ? '停止生成'
                : editingMessageId !== null
                  ? '保存并重新生成'
                  : '发送'"
              placement="top"
            >
              <button
                class="composer-btn composer-send"
                :class="{ 'composer-stop': aiStore.sending }"
                type="button"
                :disabled="!aiStore.sending && !canSend"
                :aria-label="aiStore.sending
                  ? '停止生成'
                  : editingMessageId !== null ? '保存并重新生成' : '发送'"
                @click="aiStore.sending ? aiStore.stopGeneration() : send()"
              >
                <span v-if="aiStore.sending" class="composer-stop-icon" aria-hidden="true"></span>
                <el-icon v-else><Promotion /></el-icon>
              </button>
            </el-tooltip>
          </div>
          <div class="ai-composer-toolbar">
            <div class="ai-composer-tools">
              <el-tooltip
                v-if="canGenerateReport && editingMessageId === null"
                content="生成报告（导出 Word）"
                placement="top"
              >
                <button
                  class="composer-btn"
                  type="button"
                  :disabled="aiStore.sending"
                  aria-label="生成报告"
                  @click="generateReport"
                >
                  <el-icon><Tickets /></el-icon>
                </button>
              </el-tooltip>
              <el-tooltip
                :content="editingMessageId !== null
                  ? '编辑消息时不能新增附件'
                  : supportsVision
                    ? '添加图片 / 文档'
                    : '添加文档（当前模型不支持图片）'"
                placement="top"
              >
                <button
                  class="composer-btn composer-attach"
                  type="button"
                  :disabled="aiStore.sending || editingMessageId !== null"
                  aria-label="添加图片或文档"
                  @click="triggerPickFile"
                >
                  <el-icon><Paperclip /></el-icon>
                  <span>附件</span>
                </button>
              </el-tooltip>
            </div>
            <span class="ai-composer-hint">Enter 发送 · Shift+Enter 换行</span>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*,.pdf,.docx,.xlsx"
            multiple
            class="ai-file-input"
            @change="onFileChange"
          />
        </div>
        <p class="ai-composer-disclaimer">由 AI 助手提供服务，回答仅供参考</p>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.ai-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
}
:global(.ai-drawer .el-drawer__header) {
  align-items: center;
  margin-bottom: 0;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
}
:global(.ai-drawer .el-drawer__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}
:global(.ai-drawer .el-drawer__footer) {
  padding: 10px 16px 14px;
  border-top: 1px solid var(--el-border-color-lighter, #e4e7ed);
}
.ai-drawer-titlebar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.ai-title-main {
  flex: 1;
  min-width: 0;
}
.agent-select {
  width: 100%;
}
.agent-select :deep(.el-select__wrapper) {
  padding-left: 0;
  border: none;
  box-shadow: none;
  background: transparent;
}
.agent-select :deep(.el-select__placeholder) {
  color: var(--el-text-color-primary, #303133);
  font-size: 16px;
  font-weight: 700;
}
.ai-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin-top: 2px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
  line-height: 1.35;
}
.ai-subtitle span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-model-id {
  max-width: 150px;
  color: var(--el-text-color-placeholder, #a8abb2);
}
.ai-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.ai-icon-action {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--el-text-color-regular, #606266);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: background 0.15s ease, color 0.15s ease;
}
.ai-icon-action:hover {
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-primary, #303133);
}
.ai-icon-action .el-icon {
  font-size: 17px;
}
.ai-close-btn {
  color: var(--el-text-color-secondary, #909399);
}
.model-select {
  width: 100%;
}
:global(.ai-model-popover) {
  padding: 12px;
}
.ai-model-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-model-panel__label {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
.model-option {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.25;
}
.model-option small {
  color: var(--el-text-color-secondary, #909399);
  font-size: 11px;
}
.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 16px;
  color: var(--el-text-color-secondary, #909399);
  text-align: center;
}

.ai-welcome {
  justify-content: flex-start;
  min-height: 100%;
  padding-top: 56px;
}
.welcome-title {
  margin: 0;
  color: var(--el-text-color-primary, #303133);
  font-size: 16px;
  font-weight: 600;
}
.welcome-tagline {
  margin: -4px 0 4px;
  font-size: 13px;
}
.starter-prompts {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  width: min(100%, 420px);
}
.starter-prompt {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--el-border-color-light, #dcdfe6);
  border-radius: 10px;
  background: var(--el-bg-color, #fff);
  color: var(--el-text-color-regular, #606266);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.45;
  text-align: left;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.starter-prompt:hover:not(:disabled) {
  border-color: var(--el-color-primary-light-5, #a0cfff);
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
}
.starter-prompt:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ai-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ai-memory-bindbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
  background: var(--el-fill-color-light, #f5f7fa);
}

.ai-memory-bindbar__hint {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-secondary, #909399);
}

.ai-session-collapse {
  flex-shrink: 0;
  margin: 0;
  padding: 0 16px;
  border-top: none;
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
  background: var(--el-bg-color, #fff);
}
.ai-session-collapse :deep(.el-collapse-item__header) {
  background: transparent;
  border-bottom: none;
  color: var(--el-text-color-regular, #606266);
  font-size: 13px;
  font-weight: 600;
}
.ai-session-collapse :deep(.el-collapse-item__wrap) {
  background: transparent;
  border-bottom: none;
}
.ai-session-collapse :deep(.el-collapse-item__content) {
  padding-bottom: 8px;
}
.ai-session-collapse-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}
.ai-session-collapse-title .el-button {
  padding: 0;
  font-weight: 400;
}

.ai-session-list {
  display: flex;
  flex-direction: column;
  max-height: 180px;
  overflow-y: auto;
}

.ai-session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--el-text-color-regular, #606266);
}

.ai-session-item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.ai-session-item.active {
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  font-weight: 500;
}

.ai-session-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.ai-session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-session-time {
  color: var(--el-text-color-secondary, #909399);
  font-size: 11px;
}

.ai-session-actions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
}

.ai-session-actions :deep(.el-button) {
  margin-left: 0;
  padding: 0 2px;
}

.ai-show-more {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
}

.ai-show-more .el-button {
  font-size: 13px;
}


.ai-msg-scroll {
  flex: 1;
  min-height: 0;
}
.ai-msg-scroll :deep(.el-scrollbar__view) {
  padding: 18px 16px;
}

.ai-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-usage {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
.ai-usage .el-progress {
  flex: 1;
}
.ai-editing-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  padding: 4px 8px 4px 10px;
  border-left: 3px solid var(--el-color-primary, #409eff);
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-text-color-regular, #606266);
  font-size: 12px;
}
.ai-editing-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-secondary, #909399);
  cursor: pointer;
}
.ai-editing-cancel:hover:not(:disabled),
.ai-editing-cancel:focus-visible {
  background: var(--el-color-primary-light-8, #d9ecff);
  color: var(--el-text-color-primary, #303133);
}
.ai-editing-cancel:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5, #a0cfff);
  outline-offset: 1px;
}
.ai-editing-cancel:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
/* ===== 输入框容器：textarea + 发送/停止 一行，工具列 + 快捷键提示 一行 ===== */
.ai-composer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 8px 6px 12px;
  border: 1.5px solid var(--el-border-color, #dcdfe6);
  border-radius: 16px;
  background: var(--el-bg-color, #fff);
  transition: border-color 0.15s ease;
}
.ai-composer:focus-within {
  border-color: var(--el-color-primary, #409eff);
}
.ai-composer-main {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.ai-composer :deep(.el-textarea) {
  flex: 1;
  min-width: 0;
}
.ai-composer :deep(.el-textarea__inner) {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 6px 4px;
  font-size: 14px;
  line-height: 1.5;
}
.composer-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-secondary, #909399);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.ai-composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}
.ai-composer-tools {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}
.ai-composer-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder, #a8abb2);
  white-space: nowrap;
}
.composer-attach {
  width: auto;
  gap: 4px;
  padding: 0 8px;
  font-size: 12px;
}
.composer-btn:hover:not(:disabled) {
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-primary, #303133);
}
.composer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.composer-send {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--el-color-primary, #409eff);
  color: #fff;
}
.composer-send:hover:not(:disabled) {
  background: var(--el-color-primary-light-3, #79bbff);
  color: #fff;
}
.composer-send:disabled {
  background: var(--el-fill-color-dark, #e9e9eb);
  color: var(--el-text-color-placeholder, #a8abb2);
}
.composer-stop {
  background: var(--el-color-danger, #f56c6c);
  color: #fff;
}
.composer-stop:hover:not(:disabled) {
  background: var(--el-color-danger-light-3, #f89898);
  color: #fff;
}
.composer-stop-icon {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: currentColor;
}
.ai-composer-disclaimer {
  margin: 6px 4px 0;
  color: var(--el-text-color-placeholder, #a8abb2);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}
.ai-file-input {
  display: none;
}
.ai-pending-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
}
.ai-pending-item {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}
.ai-pending-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ai-pending-del {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  padding: 0;
  color: var(--el-color-danger, #f56c6c);
}
.ai-pending-docs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 0;
}
.ai-pending-doc {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  background: var(--el-fill-color-light, #f5f7fa);
  font-size: 12px;
}
.ai-pending-doc-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
