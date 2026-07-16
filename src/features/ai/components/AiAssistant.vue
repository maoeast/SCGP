<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Document, Picture } from '@element-plus/icons-vue'
import type { AiAttachmentRef } from '@/database/ai-api'
import { aiAttachmentManager } from '@/utils/ai-attachment-manager'
import { resolveAbsolutePath } from '@/utils/resource-file-service'
import { useAiStore } from '@/stores/ai'

const router = useRouter()
const aiStore = useAiStore()

const drawerVisible = ref(false)
const inputText = ref('')
const scrollRef = ref()
const pendingImages = ref<Array<{ file: File; previewUrl: string }>>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingDocuments = ref<Array<{ file: File }>>([])
const docInputRef = ref<HTMLInputElement | null>(null)

// ===== 流式 IPC 事件回调（onMounted 注册，onUnmounted 解绑，引用须稳定）=====
const chunkHandler = (_event: unknown, payload: { delta?: string } | undefined) => {
  aiStore.onChunk(payload?.delta || '')
}
const errorHandler = (_event: unknown, payload: { error?: string } | undefined) => {
  if (payload?.error) ElMessage.error(payload.error)
}

onMounted(async () => {
  window.electronAPI.on('ai:chunk', chunkHandler)
  window.electronAPI.on('ai:error', errorHandler)
  await aiStore.loadAll()
})

onUnmounted(() => {
  window.electronAPI.off('ai:chunk', chunkHandler)
  window.electronAPI.off('ai:error', errorHandler)
})

const budgetPercent = computed(() => {
  const budget = aiStore.providerConfig?.monthlyBudgetYuan || 0
  if (budget <= 0) return 0
  return Math.min(100, Math.round((aiStore.monthUsage.costYuan / budget) * 100))
})

const supportsVision = computed(() => !!aiStore.providerConfig?.supportsVision)
const canSend = computed(
  () =>
    !!inputText.value.trim() ||
    pendingImages.value.length > 0 ||
    pendingDocuments.value.length > 0,
)

const displayMessages = computed(() => {
  const list: Array<{
    role: string
    content: string
    pending?: boolean
    attachments?: AiAttachmentRef[] | null
  }> = aiStore.currentMessages.map((m) => ({
    role: m.role,
    content: m.content,
    attachments: m.attachments,
  }))
  if (aiStore.sending || aiStore.streamingContent) {
    list.push({ role: 'assistant', content: aiStore.streamingContent || '正在思考…', pending: true })
  }
  return list
})

function scrollToBottom() {
  nextTick(() => {
    const wrap = scrollRef.value?.wrapRef as HTMLElement | undefined
    if (wrap) wrap.scrollTop = wrap.scrollHeight
  })
}

watch(() => aiStore.streamingContent, scrollToBottom)
watch(() => aiStore.currentMessages.length, scrollToBottom)

async function openDrawer() {
  drawerVisible.value = true
  if (!aiStore.providerConfig) await aiStore.loadAll()
  scrollToBottom()
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

function triggerPickImage() {
  fileInputRef.value?.click()
}
async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return
  for (const f of Array.from(files)) {
    if (!f.type.startsWith('image/')) continue
    const previewUrl = await readFileAsDataUrl(f)
    pendingImages.value.push({ file: f, previewUrl })
  }
  target.value = '' // 允许重复选同一文件
}
function removePendingImage(idx: number) {
  pendingImages.value.splice(idx, 1)
}

// ===== Phase 4：文档上传（PDF / Word .docx / Excel .xlsx → 抽文本进对话）=====
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'])
function isImageExt(fileType: string): boolean {
  return IMAGE_EXTS.has((fileType || '').toLowerCase())
}

function triggerPickDocument() {
  docInputRef.value?.click()
}
async function onDocChange(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return
  const allowed = new Set(['pdf', 'docx', 'xlsx'])
  for (const f of Array.from(files)) {
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    if (!allowed.has(ext)) {
      ElMessage.warning(`不支持的文档格式：${f.name}（仅支持 PDF / Word .docx / Excel .xlsx）`)
      continue
    }
    pendingDocuments.value.push({ file: f })
  }
  target.value = '' // 允许重复选同一文件
}
function removePendingDocument(idx: number) {
  pendingDocuments.value.splice(idx, 1)
}

async function openAttachment(ref: AiAttachmentRef) {
  try {
    const abs = await resolveAbsolutePath(ref.rel)
    await window.electronAPI.openFile(abs)
  } catch {
    /* 忽略打开失败 */
  }
}

async function send() {
  const text = inputText.value.trim()
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

function gotoSettings() {
  drawerVisible.value = false
  router.push({ name: 'System', query: { tab: 'ai-agent' } })
}

// 历史会话折叠面板
const sessionCollapse = ref<string[]>([])

async function confirmDeleteSession(id: number) {
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
  <!-- 全局悬浮入口 -->
  <button class="ai-fab" :aria-label="'AI 智能体'" @click="openDrawer">
    <el-icon :size="24"><ChatDotRound /></el-icon>
  </button>

  <el-drawer
    v-model="drawerVisible"
    title="AI 智能体"
    direction="rtl"
    size="480px"
    class="ai-drawer"
  >
    <template #header>
      <div class="ai-drawer-header">
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
            :label="agent.name"
            :value="agent.code"
          />
        </el-select>
        <el-button size="small" plain @click="aiStore.newChat">新对话</el-button>
      </div>
    </template>

    <!-- 未配置 Key 引导 -->
    <div v-if="!aiStore.isConfigured" class="ai-empty">
      <p>尚未配置 DeepSeek API Key。</p>
      <el-button type="primary" size="small" @click="gotoSettings">前往配置</el-button>
    </div>

    <div v-else class="ai-body">
      <!-- 历史会话（可折叠） -->
      <el-collapse
        v-if="aiStore.sessions.length > 0"
        v-model="sessionCollapse"
        class="ai-session-collapse"
      >
        <el-collapse-item name="sessions">
          <template #title>历史会话 ({{ aiStore.sessions.length }})</template>
          <div class="ai-session-list">
            <div
              v-for="s in aiStore.sessions"
              :key="s.id"
              class="ai-session-item"
              :class="{ active: s.id === aiStore.currentSessionId }"
              @click="aiStore.selectSession(s.id)"
            >
              <span class="ai-session-title">{{ s.title || '新对话' }}</span>
              <el-button
                class="ai-session-del"
                link
                type="danger"
                size="small"
                @click.stop="confirmDeleteSession(s.id)"
              >删</el-button>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 消息列表 -->
      <el-scrollbar ref="scrollRef" class="ai-msg-scroll">
        <div v-if="displayMessages.length === 0" class="ai-empty">
          <p>向「{{ aiStore.currentAgent?.name || '智能体' }}」提问吧～</p>
        </div>
        <div
          v-for="(msg, idx) in displayMessages"
          :key="idx"
          class="msg-row"
          :class="msg.role === 'user' ? 'is-user' : 'is-assistant'"
        >
          <div class="msg-bubble" :class="{ pending: msg.pending }">
            <div v-if="msg.pending && aiStore.toolSteps.length > 0" class="tool-steps">
              <div
                v-for="(step, sIdx) in aiStore.toolSteps"
                :key="sIdx"
                class="tool-step"
                :class="{ failed: !step.ok }"
              >🔧 {{ step.label }}{{ step.ok ? '' : '（失败）' }}</div>
            </div>
            <div v-if="msg.attachments && msg.attachments.length > 0" class="att-row">
              <template v-for="(a, aIdx) in msg.attachments" :key="aIdx">
                <img v-if="isImageExt(a.fileType)" :src="aiAttachmentManager.getFileUrl(a)" />
                <span
                  v-else
                  class="att-doc"
                  :title="`打开原件：${a.fileName}`"
                  @click="openAttachment(a)"
                >📄 {{ a.fileName }}</span>
              </template>
            </div>
            {{ msg.content }}
          </div>
        </div>
      </el-scrollbar>
    </div>

    <template #footer>
      <div class="ai-footer">
        <div class="ai-usage">
          <span>本月 {{ aiStore.monthUsage.costYuan.toFixed(4) }} / {{ aiStore.providerConfig?.monthlyBudgetYuan ?? 0 }} 元</span>
          <el-progress
            :percentage="budgetPercent"
            :show-text="false"
            :stroke-width="4"
            :status="budgetPercent >= 90 ? 'warning' : ''"
          />
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
        <div class="ai-input-row">
          <el-tooltip
            :content="supportsVision ? '添加图片' : '当前模型不支持图片'"
            placement="top"
            :disabled="supportsVision"
          >
            <el-button
              class="ai-img-btn"
              :disabled="!supportsVision || aiStore.sending"
              @click="triggerPickImage"
            >
              <el-icon><Picture /></el-icon>
            </el-button>
          </el-tooltip>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            class="ai-file-input"
            @change="onFileChange"
          />
          <el-tooltip content="添加文档（PDF / Word / Excel）" placement="top">
            <el-button class="ai-img-btn" :disabled="aiStore.sending" @click="triggerPickDocument">
              <el-icon><Document /></el-icon>
            </el-button>
          </el-tooltip>
          <input
            ref="docInputRef"
            type="file"
            accept=".pdf,.docx,.xlsx"
            multiple
            class="ai-file-input"
            @change="onDocChange"
          />
          <el-input
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
            :disabled="aiStore.sending"
            @keydown.enter.exact.prevent="send"
          />
          <el-button type="primary" :loading="aiStore.sending" :disabled="!canSend" @click="send">发送</el-button>
        </div>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.ai-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--el-color-primary, #409eff);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  transition: transform 0.15s ease;
}
.ai-fab:hover {
  transform: scale(1.06);
}

.ai-drawer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.agent-select {
  flex: 1;
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

.ai-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ai-session-collapse {
  flex-shrink: 0;
  border-top: none;
  border-bottom: 1px solid var(--el-border-color-lighter, #e4e7ed);
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

.ai-session-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-msg-scroll {
  flex: 1;
  min-height: 0;
}

.msg-row {
  display: flex;
  margin-bottom: 12px;
}
.msg-row.is-user {
  justify-content: flex-end;
}
.msg-row.is-assistant {
  justify-content: flex-start;
}
.msg-bubble {
  max-width: 80%;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.is-user .msg-bubble {
  background: var(--el-color-primary, #409eff);
  color: #fff;
  border-bottom-right-radius: 2px;
}
.is-assistant .msg-bubble {
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-primary, #303133);
  border-bottom-left-radius: 2px;
}
.msg-bubble.pending {
  opacity: 0.85;
}
.tool-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--el-border-color, #dcdfe6);
}
.tool-step {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
.tool-step.failed {
  color: var(--el-color-danger, #f56c6c);
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
.ai-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.ai-input-row .el-input {
  flex: 1;
}
.ai-img-btn {
  flex-shrink: 0;
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
.att-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.att-row img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
}
.att-doc {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid currentColor;
  font-size: 12px;
  cursor: pointer;
  opacity: 0.85;
}
.att-doc:hover {
  opacity: 1;
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
