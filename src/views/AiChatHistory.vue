<template>
  <div class="page-container scgp-admin-page ai-history-page">
    <div class="page-header ai-history-page__header">
      <div class="header-left">
        <h1>我的 AI 会话</h1>
        <p class="subtitle">查看和管理当前账号与 AI 智能体的聊天记录。</p>
      </div>
      <div class="header-right">
        <el-button plain @click="router.push({ name: 'Profile' })">返回个人资料</el-button>
      </div>
    </div>

    <section class="scgp-page-panel ai-history-panel">
      <div class="scgp-content-toolbar ai-history-toolbar">
        <div class="scgp-content-toolbar__main">
          <h2 class="scgp-content-toolbar__title">聊天历史</h2>
          <p class="scgp-content-toolbar__description">仅显示当前账号的会话，按最近对话时间排序。</p>
        </div>
        <span class="ai-history-total">共 {{ total }} 条</span>
      </div>

      <div class="ai-history-filters">
        <el-select v-model="agentCode" clearable placeholder="全部智能体" @change="resetAndLoad">
          <el-option label="全部智能体" value="" />
          <el-option
            v-for="agent in aiStore.agents"
            :key="agent.code"
            :label="agent.name"
            :value="agent.code"
          />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="resetAndLoad"
        />
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索会话标题或消息内容"
          class="ai-history-search"
          @keyup.enter="resetAndLoad"
          @clear="resetAndLoad"
        />
        <el-button type="primary" @click="resetAndLoad">搜索</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="sessions"
        class="scgp-records-table ai-history-table"
        stripe
        :empty-text="loading ? '正在加载会话…' : '暂无聊天历史'"
      >
        <el-table-column prop="title" label="会话标题" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">{{ row.title || '新对话' }}</template>
        </el-table-column>
        <el-table-column prop="agent_name" label="智能体" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.agent_name || row.agent_code }}</template>
        </el-table-column>
        <el-table-column prop="message_count" label="消息数" width="88" align="center" />
        <el-table-column label="Token 用量" width="132" align="right">
          <template #default="{ row }">{{ formatTokenCount(row.total_tokens) }}</template>
        </el-table-column>
        <el-table-column label="最近对话" width="174">
          <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewSession(row.id, row.title)">查看</el-button>
            <el-button link type="primary" @click="continueSession(row.id)">继续对话</el-button>
            <el-button link type="danger" @click="confirmDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 0" class="ai-history-pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadHistory"
          @size-change="resetAndLoad"
        />
      </div>
    </section>

    <el-drawer v-model="previewVisible" :title="previewTitle" direction="rtl" size="42%" append-to-body>
      <div v-if="previewLoading" class="ai-history-preview-loading">
        <el-skeleton :rows="8" animated />
      </div>
      <AiChatTranscript v-else-if="previewMessages.length > 0" :messages="previewMessages" />
      <el-empty v-else description="该会话暂无消息" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AiChatMessage, AiChatSession } from '@/database/ai-api'
import { useAiStore } from '@/stores/ai'
import { openAiAssistant } from '@/features/ai/assistant-launcher'
import AiChatTranscript from '@/features/ai/components/AiChatTranscript.vue'
import { formatTokenCount } from '@/features/ai/usage-format'

const router = useRouter()
const route = useRoute()
const aiStore = useAiStore()

const loading = ref(false)
const sessions = ref<AiChatSession[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const agentCode = ref(typeof route.query.agent === 'string' ? route.query.agent : '')
const keyword = ref('')
const dateRange = ref<[string, string] | null>(null)
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewTitle = ref('会话详情')
const previewMessages = ref<AiChatMessage[]>([])

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

async function loadHistory() {
  loading.value = true
  try {
    const result = await aiStore.loadMySessionHistory({
      page: page.value,
      pageSize: pageSize.value,
      agentCode: agentCode.value,
      keyword: keyword.value,
      updatedFrom: dateRange.value?.[0],
      updatedTo: dateRange.value?.[1],
    })
    sessions.value = result.items
    total.value = result.total
  } catch (error) {
    console.error('[AiChatHistory] 加载聊天历史失败:', error)
    ElMessage.error('加载聊天历史失败，请重试。')
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  page.value = 1
  void loadHistory()
}

async function viewSession(id: number, title: string) {
  previewVisible.value = true
  previewLoading.value = true
  previewTitle.value = title || '会话详情'
  previewMessages.value = []
  try {
    previewMessages.value = await aiStore.getMySessionMessages(id)
  } catch (error) {
    console.error('[AiChatHistory] 加载会话详情失败:', error)
    ElMessage.error('加载会话详情失败，请重试。')
  } finally {
    previewLoading.value = false
  }
}

function continueSession(id: number) {
  openAiAssistant(undefined, id)
}

async function confirmDelete(id: number) {
  try {
    await ElMessageBox.confirm('删除后无法恢复该会话及其附件，确定继续吗？', '删除会话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await aiStore.deleteMySession(id)
    if (previewVisible.value) previewVisible.value = false
    ElMessage.success('会话已删除')
    if (sessions.value.length === 1 && page.value > 1) page.value -= 1
    await loadHistory()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('[AiChatHistory] 删除会话失败:', error)
      ElMessage.error('删除会话失败，请重试。')
    }
  }
}

onMounted(async () => {
  if (aiStore.agents.length === 0) await aiStore.loadAll()
  await loadHistory()
})
</script>

<style scoped>
.ai-history-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ai-history-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
}

.ai-history-toolbar {
  margin-bottom: 0;
}

.ai-history-total {
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}

.ai-history-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ai-history-filters > .el-select {
  width: 180px;
}

.ai-history-search {
  width: min(320px, 100%);
}

.ai-history-table {
  width: 100%;
}

.ai-history-pagination {
  display: flex;
  justify-content: flex-end;
}

.ai-history-preview-loading {
  padding: 8px;
}

@media (max-width: 768px) {
  .ai-history-panel {
    padding: 18px;
  }

  .ai-history-filters > .el-select,
  .ai-history-filters :deep(.el-date-editor),
  .ai-history-search {
    width: 100%;
  }

  .ai-history-pagination {
    justify-content: center;
  }
}
</style>
