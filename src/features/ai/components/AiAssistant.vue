<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Paperclip, Promotion, Tickets } from '@element-plus/icons-vue'
import type { AiAttachmentRef } from '@/database/ai-api'
import { aiAttachmentManager } from '@/utils/ai-attachment-manager'
import { resolveAbsolutePath } from '@/utils/resource-file-service'
import { useAiStore } from '@/stores/ai'
import { renderMarkdown } from '@/utils/render-markdown'

const router = useRouter()
const aiStore = useAiStore()

const drawerVisible = ref(false)
const inputText = ref('')
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

/** 曲别针入口：图片与文档统一选择，按类型自动分流到图片预览 / 文档 chip */
function triggerPickFile() {
  if (aiStore.sending) return
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

// 附件文件类型判定（消息气泡内区分图片 / 文档展示）
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'])
function isImageExt(fileType: string): boolean {
  return IMAGE_EXTS.has((fileType || '').toLowerCase())
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
    size="33%"
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
            <template v-if="msg.role === 'user'">{{ msg.content }}</template>
            <div v-else class="markdown-body" v-html="renderMarkdown(msg.content)"></div>
            <span v-if="msg.pending" class="streaming-cursor" aria-hidden="true"></span>
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
        <div class="ai-composer">
          <el-tooltip :content="supportsVision ? '添加图片 / 文档' : '添加文档（当前模型不支持图片）'" placement="top">
            <button
              class="composer-btn"
              type="button"
              :disabled="aiStore.sending"
              aria-label="添加图片或文档"
              @click="triggerPickFile"
            >
              <el-icon><Paperclip /></el-icon>
            </button>
          </el-tooltip>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*,.pdf,.docx,.xlsx"
            multiple
            class="ai-file-input"
            @change="onFileChange"
          />
          <el-input
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 8 }"
            resize="none"
            placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
            :disabled="aiStore.sending"
            @keydown.enter.exact.prevent="send"
          />
          <el-tooltip content="生成报告（导出 Word）" placement="top">
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
          <button
            class="composer-btn composer-send"
            type="button"
            :disabled="!canSend || aiStore.sending"
            aria-label="发送"
            @click="send"
          >
            <el-icon><Promotion /></el-icon>
          </button>
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
  max-width: 90%;
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-primary, #303133);
  border-bottom-left-radius: 2px;
}
.msg-bubble.pending {
  opacity: 0.85;
}

/* ===== Markdown 渲染（assistant 回复）+ 流式光标 ===== */
.markdown-body {
  white-space: normal;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 0.6em 0 0.3em;
  font-weight: 600;
  line-height: 1.3;
}
.markdown-body :deep(h1) { font-size: 1.25em; }
.markdown-body :deep(h2) { font-size: 1.15em; }
.markdown-body :deep(h3) { font-size: 1.05em; }
.markdown-body :deep(p) { margin: 0.3em 0; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) { margin: 0.3em 0; padding-left: 1.4em; }
.markdown-body :deep(li) { margin: 0.15em 0; }
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
  font-size: 0.92em;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--el-border-color, #dcdfe6);
  padding: 4px 8px;
  text-align: left;
  white-space: normal;
}
.markdown-body :deep(th) {
  background: var(--el-fill-color-light, #f5f7fa);
  font-weight: 600;
}
.markdown-body :deep(pre) {
  background: var(--el-fill-color-dark, #e9e9eb);
  border-radius: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  margin: 0.5em 0;
  font-size: 0.88em;
}
.markdown-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--el-fill-color, #f5f7fa);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}
.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: inherit;
}
.markdown-body :deep(blockquote) {
  margin: 0.4em 0;
  padding-left: 0.8em;
  border-left: 3px solid var(--el-border-color, #dcdfe6);
  color: var(--el-text-color-secondary, #909399);
}
.markdown-body :deep(a) {
  color: var(--el-color-primary, #409eff);
  text-decoration: none;
}
.markdown-body :deep(a:hover) { text-decoration: underline; }
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--el-border-color, #dcdfe6);
  margin: 0.6em 0;
}
.markdown-body :deep(img) { max-width: 100%; border-radius: 4px; }

.streaming-cursor {
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--el-color-primary, #409eff);
  border-radius: 1px;
  animation: ai-cursor-blink 1s infinite;
}
@keyframes ai-cursor-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
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
/* ===== 输入框容器：曲别针 / textarea / 生成报告 / 发送 同处一个圆角容器 ===== */
.ai-composer {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 6px 6px 6px 8px;
  border: 1.5px solid var(--el-border-color, #dcdfe6);
  border-radius: 16px;
  background: var(--el-bg-color, #fff);
  transition: border-color 0.15s ease;
}
.ai-composer:focus-within {
  border-color: var(--el-color-primary, #409eff);
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
