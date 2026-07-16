<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound } from '@element-plus/icons-vue'
import { useAiStore } from '@/stores/ai'

const router = useRouter()
const aiStore = useAiStore()

const drawerVisible = ref(false)
const inputText = ref('')
const scrollRef = ref()

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

const displayMessages = computed(() => {
  const list: Array<{ role: string; content: string; pending?: boolean }> = aiStore.currentMessages.map((m) => ({
    role: m.role,
    content: m.content,
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

async function send() {
  const text = inputText.value.trim()
  if (!text || aiStore.sending) return
  inputText.value = ''
  const res = await aiStore.sendChat(text)
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
        <div class="ai-input-row">
          <el-input
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
            :disabled="aiStore.sending"
            @keydown.enter.exact.prevent="send"
          />
          <el-button type="primary" :loading="aiStore.sending" @click="send">发送</el-button>
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
</style>
