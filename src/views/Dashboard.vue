<template>
  <div class="page-container dashboard-page" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h1>特教业务指挥中心</h1>
        <p class="subtitle">聚焦今天要做的评估、训练与干预提醒，用真实业务数据支持一线特教决策。</p>
      </div>
      <div class="header-right">
        <el-button @click="loadDashboard">
          <el-icon><RefreshRight /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <section class="top-section">
      <div class="metrics-grid">
        <el-card
          v-for="metric in metrics"
          :key="metric.label"
          shadow="hover"
          class="metric-card"
        >
          <div class="metric-icon" :style="{ background: metric.background, color: metric.color }">
            <el-icon :size="24">
              <component :is="metric.icon" />
            </el-icon>
          </div>
          <div class="metric-body">
            <span class="metric-label">{{ metric.label }}</span>
            <strong class="metric-value">{{ metric.value }}</strong>
            <span class="metric-hint">{{ metric.hint }}</span>
          </div>
        </el-card>
      </div>
    </section>

    <section class="quick-section">
      <div class="section-title">
        <h2>快捷操作区</h2>
        <span>高频业务入口</span>
      </div>
      <div class="quick-grid">
        <el-card
          v-for="action in quickActions"
          :key="action.label"
          shadow="hover"
          class="quick-card"
          @click="goTo(action.path)"
        >
          <div class="quick-icon" :style="{ background: action.background, color: action.color }">
            <el-icon :size="24">
              <component :is="action.icon" />
            </el-icon>
          </div>
          <div class="quick-body">
            <h3>{{ action.label }}</h3>
            <p>{{ action.description }}</p>
          </div>
          <el-icon class="quick-arrow"><ArrowRight /></el-icon>
        </el-card>
      </div>
    </section>

    <section class="board-section">
      <el-row :gutter="20" class="board-row">
        <el-col :xs="24" :lg="13">
          <el-card class="board-card schedule-card" shadow="never">
            <template #header>
              <div class="board-header">
                <div>
                  <h2>今日训练日程</h2>
                  <p>当前处于执行周期内的真实训练计划</p>
                </div>
                <el-tag type="primary" effect="light">{{ snapshot.overview.todayTaskCount }} 项</el-tag>
              </div>
            </template>

            <el-empty
              v-if="snapshot.schedule.length === 0"
              description="今日暂无训练安排"
            />

            <div v-else class="schedule-list">
              <div
                v-for="item in snapshot.schedule"
                :key="item.planId"
                class="schedule-item"
              >
                <div class="student-avatar">
                  <img v-if="item.avatarPath" :src="item.avatarPath" :alt="item.studentName" />
                  <el-icon v-else><UserFilled /></el-icon>
                </div>

                <div class="schedule-main">
                  <div class="schedule-topline">
                    <h3>{{ item.studentName }}</h3>
                    <el-tag size="small" effect="light">{{ getModuleLabel(item.moduleCode) }}</el-tag>
                  </div>
                  <p class="schedule-plan">{{ item.planName }}</p>
                  <div class="schedule-meta">
                    <span>周期：{{ formatDateRange(item.startDate, item.endDate) }}</span>
                    <span>资源：{{ item.resourceCount }} 项</span>
                    <span v-if="item.launchResourceName">首项：{{ item.launchResourceName }}</span>
                  </div>
                </div>

                <div class="schedule-action">
                  <el-button
                    type="primary"
                    plain
                    :disabled="!item.launchResourceId || !item.launchResourceType"
                    @click="openPlanModule(item)"
                  >
                    <el-icon><VideoPlay /></el-icon>
                    开始训练
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="11">
          <div class="right-column">
            <el-card class="board-card anomaly-card" shadow="never">
              <template #header>
                <div class="board-header">
                  <div>
                    <h2>本周异常预警</h2>
                    <p>过去 7 天内需要关注的训练波动</p>
                  </div>
                  <el-tag type="danger" effect="light">{{ snapshot.overview.weeklyAnomalyCount }} 条</el-tag>
                </div>
              </template>

              <el-empty
                v-if="snapshot.anomalies.length === 0"
                description="本周干预数据平稳"
              />

              <div v-else class="alert-list compact">
                <div
                  v-for="item in displayedAnomalies"
                  :key="item.id"
                  class="alert-item anomaly"
                >
                  <div class="alert-marker danger"></div>
                  <div class="alert-body">
                    <div class="alert-title-row">
                      <h3>{{ item.studentName }}</h3>
                      <span class="alert-time">{{ formatDateTime(item.createdAt) }}</span>
                    </div>
                    <p class="alert-desc">
                      {{ item.moduleLabel }} / {{ item.sessionLabel }} · {{ item.reason }}
                    </p>
                    <div class="alert-metrics">
                      <span v-if="item.accuracyRate !== null">正确率 {{ formatPercent(item.accuracyRate) }}</span>
                      <span v-if="item.averageHintLevel !== null">平均提示 {{ item.averageHintLevel.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>

            <el-card class="board-card assistant-card" shadow="never">
              <template #header>
                <div class="board-header">
                  <div>
                    <h2>智能特教助理</h2>
                    <p>基于真实评估缺口的干预建议</p>
                  </div>
                  <el-tag type="warning" effect="light">{{ snapshot.assessmentAlerts.length }} 条</el-tag>
                </div>
              </template>

              <el-empty
                v-if="snapshot.assessmentAlerts.length === 0"
                description="当前暂无待评估预警"
              />

              <div v-else class="alert-list">
                <div
                  v-for="item in displayedAssessmentAlerts"
                  :key="item.studentId"
                  class="alert-item assistant"
                >
                  <div class="alert-marker warning"></div>
                  <div class="alert-body">
                    <div class="alert-title-row">
                      <h3>{{ item.studentName }}</h3>
                      <span class="alert-time">
                        {{ item.lastAssessmentAt ? `上次评估：${formatDate(item.lastAssessmentAt)}` : '尚无评估记录' }}
                      </span>
                    </div>
                    <p class="alert-desc">{{ item.suggestion }}</p>
                    <div class="alert-metrics">
                      <span v-if="item.disorder">{{ item.disorder }}</span>
                      <span v-if="item.daysSinceLastAssessment !== null">间隔 {{ item.daysSinceLastAssessment }} 天</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Calendar,
  DataAnalysis,
  EditPen,
  MagicStick,
  Monitor,
  RefreshRight,
  UserFilled,
  VideoPlay,
  Warning,
} from '@element-plus/icons-vue'
import {
  DashboardAPI,
  type DashboardScheduleItem,
  type DashboardSnapshot,
} from '@/database/dashboard-api'
import { buildTrainingLaunchRoute } from '@/utils/training-launch'

const router = useRouter()
const dashboardApi = new DashboardAPI()

const loading = ref(false)
const snapshot = ref<DashboardSnapshot>({
  overview: {
    studentCount: 0,
    pendingAssessmentCount: 0,
    todayTaskCount: 0,
    weeklyAnomalyCount: 0,
  },
  schedule: [],
  anomalies: [],
  assessmentAlerts: [],
})

const moduleLabelMap: Record<string, string> = {
  all: '综合训练',
  sensory: '感官训练',
  emotional: '情绪行为',
  social: '社交互动',
  cognitive: '认知训练',
  life_skills: '生活技能',
}

const metrics = computed(() => ([
  {
    label: '学生总数',
    value: snapshot.value.overview.studentCount,
    hint: '当前系统内在册学生',
    icon: UserFilled,
    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
    color: '#0369a1',
  },
  {
    label: '待评估提醒',
    value: snapshot.value.overview.pendingAssessmentCount,
    hint: '超过 6 个月未评估或尚无评估记录',
    icon: EditPen,
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    color: '#b45309',
  },
  {
    label: '今日训练任务',
    value: snapshot.value.overview.todayTaskCount,
    hint: '今日处于执行周期内的训练计划',
    icon: Calendar,
    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#15803d',
  },
  {
    label: '本周异常预警',
    value: snapshot.value.overview.weeklyAnomalyCount,
    hint: '低正确率或高提示依赖',
    icon: Warning,
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#b91c1c',
  },
]))

const quickActions = [
  {
    label: '快速发起评估',
    description: '进入量表选择页，快速为学生建立或更新评估基线。',
    path: '/assessment',
    icon: EditPen,
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    color: '#1d4ed8',
  },
  {
    label: '启动感官游戏',
    description: '进入游戏训练模块，按学生和模块快速开始训练。',
    path: '/games/menu',
    icon: Monitor,
    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    color: '#6d28d9',
  },
  {
    label: '情绪场景训练',
    description: '进入情绪行为模块，围绕真实场景开展情绪与关心训练。',
    path: '/emotional/menu',
    icon: MagicStick,
    background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    color: '#c2410c',
  },
  {
    label: '录入训练记录',
    description: '查看并进入各模块训练记录入口，承接日常训练复盘。',
    path: '/training-records/menu',
    icon: DataAnalysis,
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    color: '#15803d',
  },
]

const displayedAnomalies = computed(() => snapshot.value.anomalies.slice(0, 4))
const displayedAssessmentAlerts = computed(() => snapshot.value.assessmentAlerts.slice(0, 4))

function getModuleLabel(moduleCode: string) {
  return moduleLabelMap[moduleCode] || moduleCode || '训练模块'
}

function goTo(path: string) {
  router.push(path)
}

function openPlanModule(item: DashboardScheduleItem) {
  if (!item.launchResourceId || !item.launchResourceType) {
    return
  }

  const target = buildTrainingLaunchRoute({
    studentId: item.studentId,
    studentName: item.studentName,
    planId: item.planId,
    source: 'dashboard',
    moduleCode: item.moduleCode,
    resourceId: item.launchResourceId,
    resourceType: item.launchResourceType,
    resourceName: item.launchResourceName || undefined,
    resourceModuleCode: item.launchResourceModuleCode || undefined,
  })

  if (!target) {
    return
  }

  router.push(target)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return '进行中'
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hours}:${minutes}`
}

async function loadDashboard() {
  try {
    loading.value = true
    snapshot.value = await dashboardApi.getSnapshot()
  } catch (error) {
    console.error('加载首页看板失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.dashboard-page {
  gap: 24px;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.08), transparent 30%),
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.08), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%);
}

.top-section,
.quick-section,
.board-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  border: none;
  border-radius: 18px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
}

.metric-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 24px;
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
}

.metric-value {
  font-size: 32px;
  line-height: 1.1;
  color: #0f172a;
}

.metric-hint {
  font-size: 12px;
  color: #94a3b8;
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-title h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}

.section-title span {
  font-size: 13px;
  color: #64748b;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.quick-card {
  cursor: pointer;
  border: none;
  border-radius: 18px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.07);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.quick-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.11);
}

.quick-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.quick-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.quick-body {
  flex: 1;
}

.quick-body h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #0f172a;
}

.quick-body p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
}

.quick-arrow {
  color: #94a3b8;
}

.board-row {
  width: 100%;
  margin: 0 !important;
}

.board-card {
  border: none;
  border-radius: 20px;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
}

.board-card :deep(.el-card__header) {
  padding: 20px 22px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.board-card :deep(.el-card__body) {
  padding: 20px 22px;
}

.board-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.board-header h2 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.board-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}

.schedule-list,
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.schedule-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(241, 245, 249, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.student-avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  flex-shrink: 0;
}

.student-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.schedule-main {
  min-width: 0;
}

.schedule-topline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.schedule-topline h3 {
  margin: 0;
  font-size: 16px;
  color: #0f172a;
}

.schedule-plan {
  margin: 0 0 8px;
  font-size: 14px;
  color: #334155;
}

.schedule-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #64748b;
}

.schedule-action {
  display: flex;
  align-items: center;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.alert-item {
  display: flex;
  gap: 12px;
  padding: 14px 0;
}

.alert-item + .alert-item {
  border-top: 1px dashed rgba(148, 163, 184, 0.26);
}

.alert-marker {
  width: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.alert-marker.danger {
  background: linear-gradient(180deg, #ef4444, #f97316);
}

.alert-marker.warning {
  background: linear-gradient(180deg, #f59e0b, #f97316);
}

.alert-body {
  min-width: 0;
  flex: 1;
}

.alert-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.alert-title-row h3 {
  margin: 0;
  font-size: 15px;
  color: #0f172a;
}

.alert-time {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}

.alert-desc {
  margin: 6px 0 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.alert-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 1280px) {
  .metrics-grid,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .metrics-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .schedule-item {
    grid-template-columns: 1fr;
  }

  .schedule-action {
    justify-content: flex-start;
  }

  .alert-title-row,
  .board-header,
  .section-title {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
