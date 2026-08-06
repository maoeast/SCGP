<script setup lang="ts">
/**
 * AI 会话记录（admin 审计）：全部教师/管理员的 AI 对话会话分页列表。
 * 独立于「AI 智能体」配置 tab——会话历史多时不挤占配置页；
 * 服务端分页 + 关键字过滤（标题 / 用户名），解决旧版单页最多 200 条且不可翻页的盲区。
 */
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAiStore } from '@/stores/ai'
import type { AiChatMessage } from '@/database/ai-api'
import AiChatTranscript from '@/features/ai/components/AiChatTranscript.vue'
import { formatTokenCount } from '@/features/ai/usage-format'

const aiStore = useAiStore()
const PAGE_SIZE = 20

const keyword = ref('')
const page = ref(1)
const rows = computed(() => aiStore.sessionPage)
const total = computed(() => aiStore.sessionPageTotal)
const loading = computed(() => aiStore.sessionPageLoading)

async function load() {
  await aiStore.loadSessionPage({
    offset: (page.value - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    keyword: keyword.value.trim(),
  })
}

/** 搜索：重置到第 1 页 */
function onSearch() {
  page.value = 1
  void load()
}

/** 刷新：保持当前页重新加载 */
function onRefresh() {
  void load()
}

function onPageChange(p: number) {
  page.value = p
  void load()
}

function getRoleLabel(role?: string): string {
  if (role === 'admin') return '管理员'
  if (role === 'teacher') return '教师'
  return role || ''
}

function getRoleTagType(role?: string): 'danger' | 'success' | 'info' {
  if (role === 'admin') return 'danger'
  if (role === 'teacher') return 'success'
  return 'info'
}

// ===== 查看会话消息 =====
const msgVisible = ref(false)
const msgTitle = ref('会话消息')
const msgList = ref<AiChatMessage[]>([])

async function viewSession(row: { id: number; title: string }) {
  try {
    const msgs = await aiStore.getViewMessages(row.id)
    msgTitle.value = row.title || '会话消息'
    msgList.value = msgs
    msgVisible.value = true
  } catch (e) {
    ElMessage.error('加载会话消息失败：' + (e instanceof Error ? e.message : String(e)))
  }
}

async function removeSession(row: { id: number; title: string }) {
  try {
    await ElMessageBox.confirm(
      `确定删除会话「${row.title || `#${row.id}`}」吗？删除后不可恢复。`,
      '删除确认',
      { type: 'warning' },
    )
    await aiStore.deleteSession(row.id)
    ElMessage.success('已删除')
    // 当前页删空且非第一页时回退一页，避免停留空页
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
    await load()
  } catch (e) {
    if (e instanceof Error && e.message !== 'cancel') ElMessage.error(e.message)
  }
}

onMounted(() => void load())
</script>

<template>
  <div class="ai-sessions-panel">
    <div class="scgp-content-toolbar">
      <div class="scgp-content-toolbar__main">
        <h2 class="scgp-content-toolbar__title">AI 会话记录</h2>
        <p class="scgp-content-toolbar__description">
          查看全部账号的 AI 对话会话，支持按标题 / 用户名搜索与分页浏览。
        </p>
      </div>
      <div class="ai-sessions-toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索标题或用户名"
          clearable
          style="width: 260px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button type="primary" @click="onSearch">搜索</el-button>
        <el-button :loading="loading" @click="onRefresh">刷新</el-button>
      </div>
    </div>

    <!-- 独立卡片化表格：白底 + 圆角 + 细边框 + 微阴影，表头贴合圆角 -->
    <div class="ai-sessions-table-card">
      <el-table
        v-loading="loading"
        :data="rows"
        size="small"
        class="ai-sessions-table"
        empty-text="暂无会话"
      >
        <el-table-column label="标题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="session-title" :title="row.title">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="所属用户" width="150">
          <template #default="{ row }">
            <span class="session-user">{{ row.username || '—' }}</span>
            <el-tag
              v-if="row.role"
              size="small"
              :type="getRoleTagType(row.role)"
              effect="plain"
              style="margin-left: 6px"
            >
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="智能体" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.agent_name || row.agent_code }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="message_count" label="消息数" width="80" />
        <el-table-column label="Token 总量" width="130">
          <template #default="{ row }">
            {{ formatTokenCount(row.total_tokens) }}
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="最后更新" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="ai-sessions-actions">
              <el-button size="small" type="primary" plain @click="viewSession(row)">查看</el-button>
              <el-button size="small" type="danger" plain @click="removeSession(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ai-sessions-pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="PAGE_SIZE"
        :total="total"
        layout="total, prev, pager, next"
        background
        @current-change="onPageChange"
      />
    </div>

    <el-dialog v-model="msgVisible" :title="msgTitle" width="760px" class="ai-sessions-dialog">
      <div class="session-msg-list">
        <AiChatTranscript :messages="msgList" />
        <div v-if="msgList.length === 0" class="session-msg-empty">无消息</div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.ai-sessions-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ai-sessions-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 独立卡片化表格容器：白底 + 圆角 + 细边框 + 微阴影，overflow 裁切让表头贴合圆角 */
.ai-sessions-table-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* 表头：浅灰蓝背景 + 加大内边距 + 柔和中性灰文字 */
.ai-sessions-table :deep(.el-table__header th) {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
  padding: 12px 0;
}

/* 行：加大高度（统一白底，无斑马纹）+ 极细分隔线 */
.ai-sessions-table :deep(.el-table__body td) {
  padding: 13px 0;
  border-bottom: 1px solid #f0f2f5;
}

/* 最后一行去除下边框 */
.ai-sessions-table :deep(.el-table__body tr:last-child td) {
  border-bottom: none;
}

/* 悬停：极浅背景高亮 */
.ai-sessions-table :deep(.el-table__body tr:hover > td.el-table__cell) {
  background: #f8fafc;
}

/* 操作列：按钮组 */
.ai-sessions-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-sessions-pagination {
  display: flex;
  justify-content: flex-end;
}

.session-title {
  cursor: default;
}

.session-user {
  font-weight: 500;
}

.session-msg-list {
  max-height: 60vh;
  overflow-y: auto;
}

.session-msg-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}
</style>
