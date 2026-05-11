<template>
  <div class="page-container scgp-admin-page self-care-task-list-page" v-loading="loading">
    <div class="page-header self-care-task-list-header">
      <div class="header-left">
        <h1>自理任务</h1>
        <p class="subtitle">
          当前任务列表直接读取 `task_training` 资源主表，后续学生选择与执行链在此基础上继续补齐。
        </p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleCreate">
          新建任务
        </el-button>
      </div>
    </div>

    <section class="filter-section scgp-filter-surface self-care-filter-section">
      <div class="filter-toolbar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索任务名称或描述"
          @keyup.enter="loadTasks"
          @clear="loadTasks"
        >
          <template #append>
            <el-button @click="loadTasks">搜索</el-button>
          </template>
        </el-input>

        <el-radio-group v-model="statusFilter" @change="loadTasks">
          <el-radio-button value="active">启用中</el-radio-button>
          <el-radio-button value="inactive">已禁用</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
      </div>
    </section>

    <section class="main-content scgp-page-panel self-care-task-list-panel">
      <el-empty v-if="tasks.length === 0" description="暂无自理任务">
        <el-button type="primary" @click="handleCreate">创建第一条任务</el-button>
      </el-empty>

      <div v-else class="task-card-grid">
        <article
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
          :class="{ 'is-inactive': !task.isActive }"
        >
          <div class="task-card__header">
            <div>
              <h3 class="task-card__title">{{ task.name }}</h3>
              <p class="task-card__meta">
                {{ task.category || '未分类' }} · {{ task.metadata.steps.length }} 步
              </p>
            </div>
            <el-tag :type="task.isActive ? 'success' : 'info'" effect="light">
              {{ task.isActive ? '启用' : '禁用' }}
            </el-tag>
          </div>

          <p class="task-card__description">
            {{ task.description || '暂无任务描述' }}
          </p>

          <div class="task-card__summary">
            <span v-if="task.metadata.category?.parentName">
              {{ task.metadata.category?.parentName }}
              <template v-if="task.metadata.category?.childName"> / {{ task.metadata.category?.childName }}</template>
            </span>
            <span v-else>未配置结构化分类</span>

            <span v-if="task.metadata.abilityItem?.name">
              能力项：{{ task.metadata.abilityItem?.name }}
            </span>
            <span v-else>未配置能力项</span>
          </div>

          <div class="task-card__tags">
            <el-tag
              v-for="tag in task.tags"
              :key="tag"
              size="small"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
          </div>

          <div class="task-card__footer">
            <el-button plain @click="handleEdit(task.id)">编辑</el-button>
            <el-button
              v-if="task.isActive"
              type="danger"
              plain
              @click="handleDelete(task.id)"
            >
              禁用
            </el-button>
            <el-button
              v-else
              type="success"
              plain
              @click="handleRestore(task.id)"
            >
              恢复
            </el-button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { SelfCareTaskAPI, type SelfCareTaskListItem } from '@/database/self-care-task-api'

const router = useRouter()
const api = new SelfCareTaskAPI()

const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<'active' | 'inactive' | 'all'>('active')
const tasks = ref<SelfCareTaskListItem[]>([])

function handleCreate() {
  router.push('/self-care/tasks/new')
}

function handleEdit(taskId: number) {
  router.push(`/self-care/tasks/${taskId}/edit`)
}

async function loadTasks() {
  loading.value = true
  try {
    const includeInactive = statusFilter.value !== 'active'
    let list = api.listTasks({
      keyword: keyword.value.trim() || undefined,
      includeInactive,
    })

    if (statusFilter.value === 'inactive') {
      list = list.filter((task) => !task.isActive)
    }

    if (statusFilter.value === 'active') {
      list = list.filter((task) => task.isActive)
    }

    tasks.value = list
  } catch (error) {
    console.error('[TaskList] 加载自理任务失败:', error)
    ElMessage.error('加载自理任务失败')
    tasks.value = []
  } finally {
    loading.value = false
  }
}

async function handleDelete(taskId: number) {
  try {
    api.deleteTask(taskId)
    ElMessage.success('任务已禁用')
    loadTasks()
  } catch (error) {
    console.error('[TaskList] 禁用任务失败:', error)
    ElMessage.error('禁用任务失败')
  }
}

async function handleRestore(taskId: number) {
  try {
    api.restoreTask(taskId)
    ElMessage.success('任务已恢复')
    loadTasks()
  } catch (error) {
    console.error('[TaskList] 恢复任务失败:', error)
    ElMessage.error('恢复任务失败')
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.self-care-filter-section {
  margin-bottom: 16px;
}

.filter-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.self-care-task-list-panel {
  padding: 20px;
}

.task-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.task-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
}

.task-card.is-inactive {
  opacity: 0.72;
}

.task-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.task-card__title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.task-card__meta,
.task-card__description,
.task-card__summary {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
}

.task-card__summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 24px;
}

.task-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: auto;
}

@media (max-width: 768px) {
  .filter-toolbar,
  .task-card__header,
  .task-card__footer {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .self-care-task-list-panel {
    padding: 16px;
  }
}
</style>
