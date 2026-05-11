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
      <div v-if="launchContext" class="launch-context-banner">
        <div class="launch-context-banner__content">
          <el-tag type="warning" effect="light">开始训练</el-tag>
          <div>
            <p class="launch-context-banner__title">
              {{ launchContext.studentName }} · {{ launchContext.taskName }}
            </p>
            <p class="launch-context-banner__meta">
              已带入学生与任务上下文。当前阶段先闭合到自理任务入口壳页，后续继续补执行链。
            </p>
          </div>
        </div>
      </div>

      <div v-if="launchTask && launchContext" class="current-task-workspace">
        <div class="current-task-workspace__header">
          <div>
            <p class="current-task-workspace__eyebrow">当前训练任务</p>
            <h2 class="current-task-workspace__title">{{ launchTask.name }}</h2>
            <p class="current-task-workspace__description">
              已承接学生与任务入口上下文。当前阶段先渲染训练工作区占位，并以 `meta_data.steps[]` 作为任务步骤事实源。
            </p>
          </div>

          <div class="current-task-workspace__badges">
            <el-tag type="warning" effect="light">{{ launchContext.studentName }}</el-tag>
            <el-tag effect="plain">{{ TASK_TRAINING_MODULE_CODE }}</el-tag>
            <el-tag effect="plain">{{ TASK_TRAINING_MODE }}</el-tag>
          </div>
        </div>

        <div class="current-task-workspace__split">
          <el-card shadow="never" class="current-task-workspace__card">
            <template #header>
              <div class="current-task-workspace__card-header">
                <span>入口上下文</span>
                <el-tag size="small" effect="plain">阶段 3 占位</el-tag>
              </div>
            </template>

            <div class="current-task-overview">
              <div class="current-task-overview__item">
                <span class="current-task-overview__label">当前学生</span>
                <strong>{{ launchContext.studentName }}</strong>
              </div>
              <div class="current-task-overview__item">
                <span class="current-task-overview__label">任务资源</span>
                <strong>{{ launchTask.name }}</strong>
              </div>
              <div class="current-task-overview__item">
                <span class="current-task-overview__label">资源 ID</span>
                <strong>#{{ launchContext.resourceId }}</strong>
              </div>
              <div class="current-task-overview__item">
                <span class="current-task-overview__label">步骤总数</span>
                <strong>{{ launchTask.metadata.steps.length }} 步</strong>
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="current-task-workspace__card">
            <template #header>
              <div class="current-task-workspace__card-header">
                <span>任务步骤列表</span>
                <el-tag size="small" type="success" effect="plain">一期事实源</el-tag>
              </div>
            </template>

            <ol class="current-task-step-list">
              <li
                v-for="step in launchTask.metadata.steps"
                :key="step.id"
                class="current-task-step"
              >
                <div class="current-task-step__index">{{ step.seq }}</div>
                <div class="current-task-step__body">
                  <p class="current-task-step__title">步骤 {{ step.seq }}</p>
                  <p class="current-task-step__text">
                    {{ step.text || '当前步骤暂未填写说明' }}
                  </p>
                  <div
                    v-if="step.imagePath || step.videoPath || step.audioPath"
                    class="current-task-step__media"
                  >
                    <span v-if="step.imagePath">图片</span>
                    <span v-if="step.videoPath">视频</span>
                    <span v-if="step.audioPath">音频</span>
                  </div>
                </div>
              </li>
            </ol>
          </el-card>
        </div>
      </div>

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
            <el-button
              v-if="task.isActive"
              type="primary"
              plain
              @click="handleStartTraining(task.id)"
            >
              开始训练
            </el-button>
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
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { SelfCareTaskAPI, type SelfCareTaskListItem } from '@/database/self-care-task-api'
import {
  TASK_TRAINING_ENTRY_CODE,
  TASK_TRAINING_MODULE_CODE,
  TASK_TRAINING_MODE,
} from '@/features/self-care/task-training-contract'

const route = useRoute()
const router = useRouter()
const api = new SelfCareTaskAPI()

const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<'active' | 'inactive' | 'all'>('active')
const tasks = ref<SelfCareTaskListItem[]>([])

const launchTaskId = computed(() => getPositiveQueryNumber(route.query.resourceId))
const launchTask = computed(() => {
  if (launchTaskId.value === null) {
    return null
  }

  return api.getTaskById(launchTaskId.value)
})

const launchContext = computed(() => {
  const studentId = getPositiveQueryNumber(route.query.studentId)
  const resourceId = launchTaskId.value
  if (studentId === null || resourceId === null) {
    return null
  }

  const studentName = getSingleQueryValue(route.query.studentName) || '当前学生'
  const taskName = launchTask.value?.name || getSingleQueryValue(route.query.resourceName) || `任务 #${resourceId}`

  return {
    studentId: String(studentId),
    resourceId: String(resourceId),
    studentName,
    taskName,
  }
})

function getSingleQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }

  return typeof value === 'string' ? value : ''
}

function getPositiveQueryNumber(value: unknown): number | null {
  const raw = getSingleQueryValue(value)
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function handleCreate() {
  router.push('/self-care/tasks/new')
}

function handleStartTraining(taskId: number) {
  const task = tasks.value.find((item) => item.id === taskId)
  if (!task) {
    ElMessage.warning('任务不存在或已失效')
    return
  }

  router.push({
    path: `/self-care/tasks/${taskId}/select-student`,
    query: {
      resourceId: String(task.id),
      resourceName: task.name,
      entry: TASK_TRAINING_ENTRY_CODE,
      module: task.moduleCode,
    },
  })
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

.launch-context-banner {
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid #f3d19e;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff8eb 0%, #fffcf4 100%);
}

.launch-context-banner__content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.launch-context-banner__title,
.launch-context-banner__meta {
  margin: 0;
  line-height: 1.6;
}

.launch-context-banner__title {
  color: #8a5200;
  font-size: 15px;
  font-weight: 600;
}

.launch-context-banner__meta {
  color: #9a6b20;
  font-size: 13px;
}

.current-task-workspace {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid #f5d7a1;
  border-radius: 22px;
  background: linear-gradient(180deg, #fffdf7 0%, #fff8ec 100%);
}

.current-task-workspace__header,
.current-task-workspace__card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.current-task-workspace__header {
  margin-bottom: 16px;
}

.current-task-workspace__eyebrow,
.current-task-workspace__description,
.current-task-step__title,
.current-task-step__text {
  margin: 0;
}

.current-task-workspace__eyebrow {
  color: #b26a00;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.current-task-workspace__title {
  margin: 6px 0 8px;
  color: #7a4a00;
  font-size: 24px;
}

.current-task-workspace__description {
  color: #8b6a2c;
  font-size: 14px;
  line-height: 1.7;
}

.current-task-workspace__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.current-task-workspace__split {
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) minmax(320px, 1.25fr);
  gap: 16px;
}

.current-task-workspace__card {
  border-radius: 18px;
}

.current-task-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.current-task-overview__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 14px;
  background: #fffaf1;
}

.current-task-overview__label {
  color: #9a7a3f;
  font-size: 12px;
}

.current-task-step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.current-task-step {
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid #f3e6c4;
  border-radius: 16px;
  background: #fffdf8;
}

.current-task-step__index {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 36px;
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f5bf67 0%, #ec8e2a 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.current-task-step__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.current-task-step__title {
  color: #7b520d;
  font-size: 14px;
  font-weight: 600;
}

.current-task-step__text {
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
}

.current-task-step__media {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.current-task-step__media span {
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff1d6;
  color: #9a6510;
  font-size: 12px;
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
  .current-task-workspace__header,
  .current-task-workspace__card-header,
  .launch-context-banner__content,
  .task-card__header,
  .task-card__footer {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .current-task-workspace {
    padding: 16px;
  }

  .current-task-workspace__split {
    grid-template-columns: 1fr;
  }

  .self-care-task-list-panel {
    padding: 16px;
  }
}
</style>
