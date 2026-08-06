<script setup lang="ts">
/**
 * 学生详情 · AI 记忆面板（M4，v4.1 §10）。
 *
 * - pending：AI 总结候选，教师确认/拒绝（候选制核心）；
 * - confirmed：已确认记忆，可编辑优先级（pinned/safety_critical 须填依据）、软删除；
 * - archived/rejected/superseded：历史归档，仅查看；
 * - 权限：服务团队共享（同班教师 / 管理员），store 层已过滤；
 * - 确认来源：显示确认教师姓名（M3）。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAiStore } from '@/stores/ai'
import type { AiStudentMemory, AiMemoryStatus } from '@/database/ai-api'

const props = defineProps<{ studentId: number }>()

const aiStore = useAiStore()

const loading = ref(false)
const memories = ref<AiStudentMemory[]>([])
const confirmerNames = ref<Record<number, string>>({})
const activeStatus = ref<AiMemoryStatus | 'all'>('pending')

const CATEGORY_LABELS: Record<string, string> = {
  observation: '观察',
  preference: '偏好',
  advice_given: '建议',
  follow_up: '待跟进',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  rejected: '已拒绝',
  superseded: '已替代',
  archived: '已归档',
}

const canAccess = computed(() => aiStore.canAccessStudentMemory(props.studentId))

const filtered = computed(() => {
  if (activeStatus.value === 'all') return memories.value
  return memories.value.filter((m) => m.status === activeStatus.value)
})

const pendingCount = computed(() => memories.value.filter((m) => m.status === 'pending').length)
const confirmedCount = computed(() => memories.value.filter((m) => m.status === 'confirmed').length)

async function load() {
  if (!canAccess.value) {
    memories.value = []
    return
  }
  loading.value = true
  try {
    memories.value = aiStore.listStudentMemories(props.studentId)
    const ids = memories.value.map((m) => m.id)
    if (ids.length > 0) confirmerNames.value = aiStore.getMemoryConfirmerNames(ids)
  } finally {
    loading.value = false
  }
}

async function confirmMemory(memory: AiStudentMemory, status: 'confirmed' | 'rejected') {
  const ok = aiStore.confirmStudentMemory(memory.id, status)
  if (ok) {
    ElMessage.success(status === 'confirmed' ? '已确认，将进入对话上下文' : '已拒绝，不再注入')
    await load()
  } else {
    ElMessage.error('操作失败，请重试')
  }
}

async function deleteMemory(memory: AiStudentMemory) {
  try {
    await ElMessageBox.confirm('删除后该记忆不再注入对话，审计记录保留。确定删除？', '删除记忆', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    const ok = aiStore.deleteStudentMemory(memory.id)
    if (ok) {
      ElMessage.success('已删除')
      await load()
    }
  } catch {
    /* 用户取消 */
  }
}

async function markPriority(memory: AiStudentMemory, priority: 'pinned' | 'safety_critical') {
  try {
    const res = await ElMessageBox.prompt(
      priority === 'safety_critical'
        ? '标记为「关键」的记忆优先注入且不受配额淘汰。请填写标记依据：'
        : '标记为「置顶」的记忆优先注入。请填写标记依据：',
      priority === 'safety_critical' ? '标记关键记忆' : '标记置顶记忆',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '必填：标记依据（将记入审计）',
        inputValidator: (v: string) => (v && v.trim().length > 0 ? true : '依据不能为空'),
      },
    )
    // MessageBoxData 联合收窄：仅输入数据分支含 value
    const note = res && typeof res === 'object' && 'value' in res ? String(res.value) : ''
    if (!note.trim()) return
    const ok = aiStore.markMemoryPriority(memory.id, priority, note)
    if (ok) {
      ElMessage.success('已标记')
      await load()
    }
  } catch {
    /* 用户取消 */
  }
}

function categoryTagType(category: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' {
  switch (category) {
    case 'observation':
      return 'info'
    case 'preference':
      return 'success'
    case 'advice_given':
      return 'primary'
    case 'follow_up':
      return 'warning'
    default:
      return 'info'
  }
}

function priorityTagType(priority: string): 'danger' | 'warning' | 'info' {
  if (priority === 'safety_critical') return 'danger'
  if (priority === 'pinned') return 'warning'
  return 'info'
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '-'
  const date = new Date(d)
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-CN')
}

onMounted(load)
watch(() => props.studentId, load)
</script>

<template>
  <div class="student-memory-panel" v-loading="loading">
    <!-- 无权限（非服务团队） -->
    <el-empty v-if="!canAccess" description="您不是该学生的服务团队教师，无权查看 AI 记忆" />

    <!-- 有权限 -->
    <template v-else>
      <div class="memory-toolbar">
        <el-radio-group v-model="activeStatus" size="small" @change="load">
          <el-radio-button value="pending">待确认 ({{ pendingCount }})</el-radio-button>
          <el-radio-button value="confirmed">已确认 ({{ confirmedCount }})</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="load">刷新</el-button>
      </div>

      <div v-if="filtered.length === 0" class="memory-empty">
        <el-empty
          :description="activeStatus === 'pending' ? '暂无待确认的 AI 记忆候选' : '暂无记忆记录'"
          :image-size="60"
        />
      </div>

      <div v-else class="memory-list">
        <div
          v-for="memory in filtered"
          :key="memory.id"
          class="memory-item"
          :class="{ 'memory-item--deleted': memory.deletedAt }"
        >
          <div class="memory-item__head">
            <el-tag :type="categoryTagType(memory.category)" size="small">
              {{ CATEGORY_LABELS[memory.category] ?? memory.category }}
            </el-tag>
            <el-tag
              v-if="memory.priority !== 'normal'"
              :type="priorityTagType(memory.priority)"
              size="small"
              effect="dark"
            >
              {{ memory.priority === 'safety_critical' ? '关键' : '置顶' }}
            </el-tag>
            <el-tag size="small" type="info" effect="plain">{{ STATUS_LABELS[memory.status] ?? memory.status }}</el-tag>
            <el-tag v-if="memory.confidence === 'assumed'" size="small" type="warning" effect="plain">
              推断
            </el-tag>
            <span class="memory-item__date">{{ formatDate(memory.createdAt) }}</span>
          </div>

          <p class="memory-item__content">{{ memory.content }}</p>

          <div class="memory-item__meta">
            <span v-if="memory.confirmedByUserId" class="memory-item__confirmer">
              ✅ 确认：{{ confirmerNames[memory.id] || `用户#${memory.confirmedByUserId}` }}
              （{{ formatDate(memory.confirmedAt) }}）
            </span>
            <span v-if="memory.priorityNote" class="memory-item__note">依据：{{ memory.priorityNote }}</span>
          </div>

          <div class="memory-item__actions">
            <template v-if="memory.status === 'pending'">
              <el-button type="success" size="small" @click="confirmMemory(memory, 'confirmed')">确认</el-button>
              <el-button type="info" size="small" @click="confirmMemory(memory, 'rejected')">拒绝</el-button>
            </template>
            <template v-if="memory.status === 'confirmed'">
              <el-button size="small" @click="markPriority(memory, 'pinned')">置顶</el-button>
              <el-button size="small" @click="markPriority(memory, 'safety_critical')">标记关键</el-button>
              <el-button type="danger" size="small" plain @click="deleteMemory(memory)">删除</el-button>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.student-memory-panel {
  min-height: 200px;
}

.memory-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.memory-empty {
  padding: 12px 0;
}

.memory-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.memory-item {
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--el-fill-color-blank, #fff);
}

.memory-item--deleted {
  opacity: 0.6;
}

.memory-item__head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.memory-item__date {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.memory-item__content {
  margin: 8px 0 4px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary, #303133);
}

.memory-item__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.memory-item__actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
</style>
