<template>
  <div class="page-container scgp-admin-page self-care-task-list-page" v-loading="loading">
    <div class="page-header self-care-task-list-header">
      <div class="header-left">
        <h1>自理训练</h1>
        <p class="subtitle">
          参考情绪行为模块的场景选择结构，将自理训练项目按类别集中展示。教师可直接开始训练，也可在卡片右下角继续编辑任务。
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
          placeholder="搜索任务名称、描述或能力项"
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
          <el-radio-button value="all">全部状态</el-radio-button>
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
              已带入学生与任务上下文。你可以继续浏览卡片，也可以直接回到当前任务工作区。
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
              已承接学生与任务入口上下文。当前阶段仍保留训练工作区占位，并以 `meta_data.steps[]` 作为任务步骤事实源。
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

      <template v-else>
        <el-card shadow="never" class="task-gallery-summary-card">
          <div class="task-gallery-summary-head">
            <div class="task-gallery-summary-copy">
              <div class="task-gallery-summary-title-row">
                <h3 class="task-gallery-summary-title">训练项目分类</h3>
                <span class="task-gallery-summary-count">
                  {{ filteredTasks.length }} / {{ tasks.length }}
                </span>
              </div>
              <p class="task-gallery-summary-subtitle">
                按胶囊标签切换训练项目。页面优先服务“选项目并开始训练”，编辑与启用状态保留为次级教师动作。
              </p>
            </div>

            <div class="task-gallery-summary-actions">
              <el-button plain @click="loadTasks">刷新</el-button>
              <el-button
                v-if="selectedCategory !== 'all'"
                text
                @click="selectedCategory = 'all'"
              >
                清除分类
              </el-button>
            </div>
          </div>

          <div class="task-gallery-pill-row">
            <button
              v-for="filter in SELF_CARE_CATEGORY_FILTERS"
              :key="filter.key"
              type="button"
              class="task-gallery-pill"
              :class="{ 'is-active': selectedCategory === filter.key }"
              @click="selectedCategory = filter.key"
            >
              <component
                :is="resolveCategoryIcon(filter.iconName)"
                class="task-gallery-pill__icon"
              />
              <span>{{ filter.label }}</span>
              <em>{{ categoryCounts[filter.key] || 0 }}</em>
            </button>
          </div>
        </el-card>

        <el-empty
          v-if="filteredTasks.length === 0"
          description="当前筛选条件下没有匹配的自理训练项目"
        >
          <el-button type="primary" @click="selectedCategory = 'all'">查看全部项目</el-button>
        </el-empty>

        <div v-else class="task-gallery-grid">
          <article
            v-for="task in filteredTasks"
            :key="task.id"
            class="task-gallery-card"
            :class="{ 'is-inactive': !task.isActive }"
          >
            <div
              class="task-gallery-card__cover"
              :style="{ background: task.coverGradient }"
            >
              <el-image
                v-if="task.coverImageUrl"
                :src="task.coverImageUrl"
                fit="cover"
                class="task-gallery-card__cover-image"
              >
                <template #error>
                  <div class="task-gallery-card__cover-fallback">
                    <component
                      :is="resolveCategoryIcon(task.categoryIconName)"
                      class="task-gallery-card__cover-icon"
                    />
                  </div>
                </template>
              </el-image>

              <div v-else class="task-gallery-card__cover-fallback">
                <component
                  :is="resolveCategoryIcon(task.categoryIconName)"
                  class="task-gallery-card__cover-icon"
                />
              </div>

              <el-tag
                class="task-gallery-card__status"
                :type="task.isActive ? 'success' : 'info'"
                effect="light"
              >
                {{ task.isActive ? '启用' : '禁用' }}
              </el-tag>
            </div>

            <div class="task-gallery-card__body">
              <div class="task-gallery-card__topline">
                <h3 class="task-gallery-card__title">{{ task.name }}</h3>
                <el-tag size="small" effect="plain">步骤 {{ task.metadata.steps.length }}</el-tag>
              </div>

              <p class="task-gallery-card__description">
                {{ task.description || '暂无任务描述' }}
              </p>

              <div class="task-gallery-card__meta">
                <el-tag size="small" effect="plain" :style="{ color: task.accentColor, borderColor: `${task.accentColor}33` }">
                  {{ task.categoryLabel }}
                </el-tag>
                <el-tag
                  v-if="task.metadata.category?.childName"
                  size="small"
                  type="warning"
                  effect="plain"
                >
                  {{ task.metadata.category?.childName }}
                </el-tag>
                <el-tag
                  v-if="task.metadata.abilityItem?.name"
                  size="small"
                  type="success"
                  effect="plain"
                >
                  能力项：{{ task.metadata.abilityItem?.name }}
                </el-tag>
              </div>

              <div v-if="task.tags.length > 0" class="task-gallery-card__tags">
                <el-tag
                  v-for="tag in task.tags"
                  :key="tag"
                  size="small"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>

            <div class="task-gallery-card__footer">
              <el-button
                v-if="task.isActive"
                type="primary"
                class="task-gallery-card__start"
                @click="handleStartTraining(task.id)"
              >
                开始训练
              </el-button>
              <el-button
                v-else
                plain
                disabled
                class="task-gallery-card__start"
              >
                已禁用
              </el-button>

              <el-tooltip content="编辑任务" placement="top">
                <el-button
                  circle
                  plain
                  class="task-gallery-card__icon-action"
                  @click="handleEdit(task.id)"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </el-tooltip>

              <el-tooltip :content="task.isActive ? '禁用任务' : '恢复任务'" placement="top">
                <el-button
                  circle
                  plain
                  class="task-gallery-card__icon-action"
                  :type="task.isActive ? 'danger' : 'success'"
                  @click="task.isActive ? handleDelete(task.id) : handleRestore(task.id)"
                >
                  <el-icon>
                    <component :is="task.isActive ? SwitchButton : RefreshRight" />
                  </el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </article>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Brush,
  EditPen,
  ForkSpoon,
  Grid,
  House,
  MapLocation,
  RefreshRight,
  SuitcaseLine,
  SwitchButton,
  ToiletPaper,
} from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { SelfCareTaskAPI, type SelfCareTaskListItem } from '@/database/self-care-task-api'
import {
  TASK_TRAINING_ENTRY_CODE,
  TASK_TRAINING_MODULE_CODE,
  TASK_TRAINING_MODE,
} from '@/features/self-care/task-training-contract'
import {
  buildSelfCareCategoryCounts,
  filterSelfCareTasksByCategory,
  getSelfCareCategoryFilter,
  resolveSelfCareCategoryKey,
  SELF_CARE_CATEGORY_FILTERS,
  type SelfCareCategoryIconName,
  type SelfCareCategoryFilterKey,
} from '@/features/self-care/task-gallery'
import { isDisplayImageLike, resolvePresetResourceUrl } from '@/utils/preset-resource'

interface TaskGalleryItem extends SelfCareTaskListItem {
  categoryKey: SelfCareCategoryFilterKey
  categoryLabel: string
  categoryIconName: SelfCareCategoryIconName
  accentColor: string
  coverGradient: string
  coverImageUrl?: string
}

const CATEGORY_ICON_MAP = {
  Grid,
  ForkSpoon,
  SuitcaseLine,
  ToiletPaper,
  Brush,
  House,
  MapLocation,
} as const

const route = useRoute()
const router = useRouter()
const api = new SelfCareTaskAPI()

const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<'active' | 'inactive' | 'all'>('active')
const tasks = ref<SelfCareTaskListItem[]>([])
const selectedCategory = ref<SelfCareCategoryFilterKey>('all')

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

const galleryTasks = computed<TaskGalleryItem[]>(() => tasks.value.map((task) => {
  const categoryKey = resolveSelfCareCategoryKey(task)
  const categoryMeta = getSelfCareCategoryFilter(categoryKey)
  const coverImageUrl = resolveTaskCoverImage(task)

  return {
    ...task,
    categoryKey,
    categoryLabel: categoryMeta?.label || task.metadata.category?.parentName || task.category || '未分类',
    categoryIconName: categoryMeta?.iconName ?? 'Grid',
    accentColor: categoryMeta?.accentColor || '#475569',
    coverGradient: categoryMeta?.coverGradient || 'linear-gradient(135deg, rgba(148, 163, 184, 0.14) 0%, rgba(203, 213, 225, 0.28) 100%)',
    coverImageUrl,
  }
}))

const categoryCounts = computed(() => buildSelfCareCategoryCounts(galleryTasks.value))
const filteredTasks = computed(() => filterSelfCareTasksByCategory(galleryTasks.value, selectedCategory.value))

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

function resolveCategoryIcon(iconName: keyof typeof CATEGORY_ICON_MAP) {
  return CATEGORY_ICON_MAP[iconName] || Grid
}

function resolveTaskCoverImage(task: SelfCareTaskListItem): string | undefined {
  const candidateValues = [
    task.coverImage,
    task.metadata.steps.find((step) => typeof step.imagePath === 'string' && step.imagePath.trim().length > 0)?.imagePath,
  ]

  for (const value of candidateValues) {
    if (typeof value !== 'string' || !value.trim()) {
      continue
    }

    if (isDisplayImageLike(value)) {
      return resolvePresetResourceUrl(value)
    }
  }

  return undefined
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

.filter-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.main-content {
  padding: 20px;
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

.task-gallery-summary-card {
  margin-bottom: 20px;
  border-radius: 22px;
  border: 1px solid #e5edf6;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 30%),
    linear-gradient(135deg, #fffdf8 0%, #f8fbff 100%);
}

.task-gallery-summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.task-gallery-summary-copy {
  flex: 1;
  min-width: 0;
}

.task-gallery-summary-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}

.task-gallery-summary-title {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.task-gallery-summary-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.task-gallery-summary-subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
  font-size: 13px;
}

.task-gallery-summary-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-gallery-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.task-gallery-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbe4ee;
  background: rgba(255, 255, 255, 0.88);
  color: #445569;
  padding: 9px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.task-gallery-pill:hover {
  transform: translateY(-1px);
  border-color: #bed4f5;
}

.task-gallery-pill.is-active {
  color: #1d4ed8;
  border-color: #60a5fa;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 251, 235, 0.92) 100%);
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.18);
}

.task-gallery-pill__icon {
  width: 14px;
  height: 14px;
}

.task-gallery-pill em {
  font-style: normal;
  font-size: 12px;
  color: #6b7280;
}

.task-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.task-gallery-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 22px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.task-gallery-card.is-inactive {
  opacity: 0.74;
}

.task-gallery-card__cover {
  position: relative;
  min-height: 180px;
}

.task-gallery-card__cover-image {
  width: 100%;
  height: 180px;
}

.task-gallery-card__cover-fallback {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-gallery-card__cover-icon {
  width: 56px;
  height: 56px;
  color: rgba(148, 95, 14, 0.72);
}

.task-gallery-card__status {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
}

.task-gallery-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px 12px;
}

.task-gallery-card__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-gallery-card__title {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  line-height: 1.55;
}

.task-gallery-card__description {
  margin: 0;
  color: #606f7b;
  font-size: 14px;
  line-height: 1.75;
  min-height: 48px;
}

.task-gallery-card__meta,
.task-gallery-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-gallery-card__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 0 16px 16px;
}

.task-gallery-card__start {
  flex: 1;
}

.task-gallery-card__icon-action {
  flex: 0 0 auto;
}

@media (max-width: 768px) {
  .filter-toolbar,
  .launch-context-banner__content,
  .current-task-workspace__header,
  .current-task-workspace__card-header,
  .task-gallery-summary-head,
  .task-gallery-summary-actions {
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

  .main-content {
    padding: 16px;
  }

  .task-gallery-grid {
    grid-template-columns: 1fr;
  }
}
</style>
