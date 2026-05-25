<template>
  <div class="page-container scgp-admin-page dashboard-page" v-loading="loading">
    <div class="page-header dashboard-header">
      <div class="header-left">
        <h1>首页看板</h1>
        <p class="subtitle">聚焦今天要做的评估、训练与干预提醒，用真实业务数据支持一线决策。</p>
      </div>
      <div class="header-right">
        <el-button @click="loadDashboard">
          <el-icon><RefreshRight /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <section class="dashboard-hero scgp-surface">
      <div class="dashboard-hero__main">
        <h2>{{ focusPanel.title }}</h2>
        <p>{{ focusPanel.description }}</p>

        <div class="dashboard-highlight-grid">
          <article
            v-for="highlight in heroHighlights"
            :key="highlight.label"
            class="dashboard-highlight"
          >
            <span class="dashboard-highlight__label">{{ highlight.label }}</span>
            <strong class="dashboard-highlight__value">{{ highlight.value }}</strong>
          </article>
        </div>
      </div>

      <div class="dashboard-hero__metrics">
        <article
          v-for="metric in metrics"
          :key="metric.label"
          :class="['hero-metric-card', `hero-metric-card--${metric.tone}`]"
        >
          <div class="hero-metric-card__top">
            <span class="hero-metric-card__icon">
              <el-icon :size="18">
                <component :is="metric.icon" />
              </el-icon>
            </span>
            <span class="hero-metric-card__label">{{ metric.label }}</span>
          </div>

          <strong class="hero-metric-card__value">{{ metric.value }}</strong>
          <span class="hero-metric-card__hint">{{ metric.hint }}</span>
        </article>
      </div>
    </section>

    <section class="dashboard-surface scgp-surface">
      <div class="dashboard-section-header">
        <div>
          <h2>快捷操作区</h2>
          <p>将高频业务入口收口到一个区域，减少在模块之间来回切换。</p>
        </div>
      </div>

      <div class="quick-grid">
        <button
          v-for="action in visibleQuickActions"
          :key="action.label"
          type="button"
          :class="[
            'quick-card',
            `quick-card--${action.tone}`,
          ]"
          @click="goTo(action)"
        >
          <div class="quick-card__topline">
            <span class="quick-card__badge">推荐入口</span>
            <el-icon class="quick-card__arrow"><ArrowRight /></el-icon>
          </div>

          <div class="quick-card__icon">
            <el-icon :size="24">
              <component :is="action.icon" />
            </el-icon>
          </div>

          <div class="quick-card__body">
            <h3>{{ action.label }}</h3>
            <p>{{ action.description }}</p>
          </div>
        </button>
      </div>
    </section>

    <section class="dashboard-board">
      <article class="dashboard-surface scgp-surface schedule-panel">
        <div class="dashboard-panel-header">
          <div>
            <h2>今日训练日程</h2>
            <p>当前处于执行周期内的真实训练计划，可直接从这里发起训练。</p>
          </div>
          <div class="dashboard-panel-header__side">
            <span class="dashboard-panel-count">{{ snapshot.overview.todayTaskCount }} 项</span>
          </div>
        </div>

        <el-empty
          v-if="snapshot.schedule.length === 0"
          description="今日暂无训练安排"
        />

        <div v-else class="schedule-list">
          <article
            v-for="item in snapshot.schedule"
            :key="item.planId"
            class="schedule-item"
          >
            <div class="schedule-item__main">
              <StudentAvatar
                :name="item.studentName"
                :avatar-url="item.avatarPath || undefined"
                size="md"
              />

              <div class="schedule-item__content">
                <div class="schedule-item__topline">
                  <h3>{{ item.studentName }}</h3>
                  <el-tag size="small" effect="plain">{{ getModuleLabel(item.moduleCode) }}</el-tag>
                </div>

                <p class="schedule-item__plan">{{ item.planName }}</p>

                <div class="schedule-item__meta">
                  <span>周期：{{ formatDateRange(item.startDate, item.endDate) }}</span>
                  <span>资源：{{ item.resourceCount }} 项</span>
                  <span v-if="item.launchResourceName">首项：{{ item.launchResourceName }}</span>
                </div>
              </div>
            </div>

            <div class="schedule-item__actions">
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
          </article>
        </div>
      </article>

      <div class="dashboard-board__stack">
        <article class="dashboard-surface scgp-surface alert-panel">
          <div class="dashboard-panel-header">
            <div>
              <h2>本周异常预警</h2>
              <p>过去 7 天内需要关注的训练波动，优先查看低正确率与高提示依赖。</p>
            </div>
            <div class="dashboard-panel-header__side">
              <span class="dashboard-panel-count dashboard-panel-count--danger">
                {{ snapshot.overview.weeklyAnomalyCount }} 条
              </span>
            </div>
          </div>

          <el-empty
            v-if="snapshot.anomalies.length === 0"
            description="本周干预数据平稳"
          />

          <div v-else class="alert-list">
            <article
              v-for="item in displayedAnomalies"
              :key="item.id"
              class="alert-item alert-item--danger"
            >
              <span class="alert-item__accent"></span>

              <StudentAvatar
                :name="item.studentName"
                :avatar-url="item.avatarPath || undefined"
                size="md"
              />

              <div class="alert-item__body">
                <div class="alert-item__topline">
                  <h3>{{ item.studentName }}</h3>
                  <span class="alert-item__time">{{ formatDateTime(item.createdAt) }}</span>
                </div>

                <p class="alert-item__desc">
                  {{ item.moduleLabel }} / {{ item.sessionLabel }} · {{ item.reason }}
                </p>

                <div class="alert-item__meta">
                  <span v-if="item.accuracyRate !== null">正确率 {{ formatPercent(item.accuracyRate) }}</span>
                  <span v-if="item.averageHintLevel !== null">平均提示 {{ item.averageHintLevel.toFixed(1) }}</span>
                </div>
              </div>
            </article>
          </div>
        </article>

        <article class="dashboard-surface scgp-surface alert-panel">
          <div class="dashboard-panel-header">
            <div>
              <h2>智能特教助理</h2>
              <p>根据真实评估缺口提供优先干预建议，帮助尽快补齐学生评估基线。</p>
            </div>
            <div class="dashboard-panel-header__side">
              <span class="dashboard-panel-count dashboard-panel-count--warning">
                {{ snapshot.assessmentAlerts.length }} 条
              </span>
            </div>
          </div>

          <el-empty
            v-if="snapshot.assessmentAlerts.length === 0"
            description="当前暂无待评估预警"
          />

          <div v-else class="alert-list">
            <article
              v-for="item in displayedAssessmentAlerts"
              :key="item.studentId"
              class="alert-item alert-item--warning"
            >
              <span class="alert-item__accent"></span>

              <StudentAvatar
                :name="item.studentName"
                :avatar-url="item.avatarPath || undefined"
                size="md"
              />

              <div class="alert-item__body">
                <div class="alert-item__topline">
                  <h3>{{ item.studentName }}</h3>
                  <span class="alert-item__time">
                    {{ item.lastAssessmentAt ? `上次评估：${formatDate(item.lastAssessmentAt)}` : '尚无评估记录' }}
                  </span>
                </div>

                <p class="alert-item__desc">{{ item.suggestion }}</p>

                <div class="alert-item__meta">
                  <span v-if="item.disorder">{{ item.disorder }}</span>
                  <span v-if="item.daysSinceLastAssessment !== null">间隔 {{ item.daysSinceLastAssessment }} 天</span>
                </div>
              </div>
            </article>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  Calendar,
  DataAnalysis,
  EditPen,
  MagicStick,
  Monitor,
  RefreshRight,
  VideoPlay,
  Warning,
  UserFilled,
} from '@element-plus/icons-vue'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import {
  DashboardAPI,
  type DashboardScheduleItem,
  type DashboardSnapshot,
} from '@/database/dashboard-api'
import {
  filterVisibleAccessControlledItems,
  isAccessControlledItemVisible,
  type AccessControlledItem,
} from '@/utils/access-visibility'
import { resolveTrainingLaunch } from '@/utils/training-launch'
import { useAuthStore } from '@/stores/auth'

type DashboardTone = 'blue' | 'amber' | 'green' | 'coral'
type QuickActionTone = 'blue' | 'teal' | 'coral' | 'green'
type QuickAction = AccessControlledItem & {
  label: string
  description: string
  path: string
  icon: any
  tone: QuickActionTone
}

const BUSINESS_MODULE_TOTAL = 5

const router = useRouter()
const dashboardApi = new DashboardAPI()
const authStore = useAuthStore()

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
    tone: 'blue' as DashboardTone,
  },
  {
    label: '待评估提醒',
    value: snapshot.value.overview.pendingAssessmentCount,
    hint: '超过 6 个月未评估或尚无评估记录',
    icon: EditPen,
    tone: 'amber' as DashboardTone,
  },
  {
    label: '今日训练任务',
    value: snapshot.value.overview.todayTaskCount,
    hint: '今日处于执行周期内的训练计划',
    icon: Calendar,
    tone: 'green' as DashboardTone,
  },
  {
    label: '本周异常预警',
    value: snapshot.value.overview.weeklyAnomalyCount,
    hint: '低正确率或高提示依赖',
    icon: Warning,
    tone: 'coral' as DashboardTone,
  },
]))

const quickActions: QuickAction[] = [
  {
    label: '快速发起评估',
    description: '进入量表选择页，快速为学生建立或更新评估基线。',
    path: '/assessment',
    accessScope: 'global',
    icon: EditPen,
    tone: 'blue' as QuickActionTone,
  },
  {
    label: '启动感官游戏',
    description: '进入游戏训练模块，按学生和模块快速开始训练。',
    path: '/games/menu',
    accessScope: 'entitlement',
    entitlementCode: 'sensory_integration',
    icon: Monitor,
    tone: 'teal' as QuickActionTone,
  },
  {
    label: '情绪场景训练',
    description: '进入情绪行为模块，围绕真实场景开展情绪与关心训练。',
    path: '/emotional/menu',
    accessScope: 'entitlement',
    entitlementCode: 'emotional',
    icon: MagicStick,
    tone: 'coral' as QuickActionTone,
  },
  {
    label: '录入训练记录',
    description: '查看并进入各模块训练记录入口，承接日常训练复盘。',
    path: '/training-records/menu',
    accessScope: 'global',
    icon: DataAnalysis,
    tone: 'green' as QuickActionTone,
  },
]

const displayedAnomalies = computed(() => snapshot.value.anomalies.slice(0, 4))
const displayedAssessmentAlerts = computed(() => snapshot.value.assessmentAlerts.slice(0, 4))
const accessibleModuleCount = computed(() => new Set(authStore.allowedModules).size)
const visibleQuickActions = computed(() => filterVisibleAccessControlledItems(
  quickActions,
  authStore.hasModuleAccess,
  authStore.hasEntitlementAccess,
))

const focusPanel = computed(() => {
  const overview = snapshot.value.overview

  if (overview.todayTaskCount > 0) {
    return {
      title: `今天有 ${overview.todayTaskCount} 项训练任务待执行`,
      description: '优先从今日日程区直接发起训练，减少在计划、学生与资源之间反复跳转。',
    }
  }

  if (overview.weeklyAnomalyCount > 0) {
    return {
      title: `本周发现 ${overview.weeklyAnomalyCount} 条异常预警`,
      description: '建议先查看异常波动学生，确认是否存在训练难度不匹配或提示依赖上升。',
    }
  }

  if (overview.pendingAssessmentCount > 0) {
    return {
      title: `当前有 ${overview.pendingAssessmentCount} 条待评估提醒`,
      description: '建议优先补齐长期未评估或尚未建立基线的学生档案，避免干预决策缺少依据。',
    }
  }

  return {
    title: '今天的训练节奏相对平稳',
    description: '当前没有待处理的训练日程或显著预警，可以从快捷入口进入日常业务。',
  }
})

const heroHighlights = computed(() => ([
  {
    label: '当前学生',
    value: `${snapshot.value.overview.studentCount} 名`,
  },
  {
    label: '已授权模块',
    value: `${accessibleModuleCount.value}/${BUSINESS_MODULE_TOTAL}`,
  },
  {
    label: '待评估',
    value: `${snapshot.value.overview.pendingAssessmentCount} 条`,
  },
  {
    label: '本周预警',
    value: `${snapshot.value.overview.weeklyAnomalyCount} 条`,
  },
]))

function getModuleLabel(moduleCode: string) {
  return moduleLabelMap[moduleCode] || moduleCode || '训练模块'
}

function goTo(action: QuickAction) {
  if (!isAccessControlledItemVisible(action, authStore.hasModuleAccess, authStore.hasEntitlementAccess)) {
    ElMessage.warning('当前功能未授权，请联系厂商开通对应能力包')
    return
  }
  router.push(action.path)
}

function openPlanModule(item: DashboardScheduleItem) {
  if (!item.launchResourceId || !item.launchResourceType) {
    return
  }

  const resolution = resolveTrainingLaunch(
    {
      studentId: item.studentId,
      studentName: item.studentName,
      planId: item.planId,
      source: 'dashboard',
      moduleCode: item.moduleCode,
      resourceId: item.launchResourceId,
      resourceType: item.launchResourceType,
      resourceName: item.launchResourceName || undefined,
      resourceModuleCode: item.launchResourceModuleCode || undefined,
    },
    authStore.hasModuleAccess,
    authStore.hasEntitlementAccess,
  )

  if (!resolution.authorized) {
    ElMessage.warning('当前训练入口未授权，请联系厂商开通对应能力包')
    return
  }

  if (!resolution.route) {
    ElMessage.warning('当前训练入口无法启动')
    return
  }

  router.push(resolution.route)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatDate(value: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return '进行中'
  if (!startDate) return `至 ${formatDate(endDate)}`
  if (!endDate) return `${formatDate(startDate)} 起`
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

function formatDateTime(value: string) {
  if (!value) return '-'

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
  gap: 20px;
}

.dashboard-header {
  margin-bottom: 0;
}

.dashboard-hero,
.dashboard-surface {
  padding: 24px;
}

.dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.95fr);
  gap: 22px;
}

.dashboard-hero__main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dashboard-hero__main h2 {
  margin: 0;
  color: var(--scgp-text);
  font-size: clamp(28px, 2.7vw, 36px);
  line-height: 1.12;
  letter-spacing: -0.03em;
}

.dashboard-hero__main p {
  margin: 0;
  max-width: 620px;
  color: var(--scgp-muted);
  font-size: 15px;
  line-height: 1.75;
}

.dashboard-highlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.dashboard-highlight {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--scgp-border);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.dashboard-highlight__label {
  color: var(--scgp-subtle);
  font-size: 12px;
}

.dashboard-highlight__value {
  color: var(--scgp-text);
  font-size: 18px;
  line-height: 1.3;
}

.dashboard-hero__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.hero-metric-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 144px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--scgp-border);
  background: #ffffff;
}

.hero-metric-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-metric-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.hero-metric-card__label {
  color: var(--scgp-muted);
  font-size: 13px;
}

.hero-metric-card__value {
  color: var(--scgp-text);
  font-size: clamp(34px, 3vw, 42px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.hero-metric-card__hint {
  color: var(--scgp-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.hero-metric-card--blue .hero-metric-card__icon {
  background: var(--scgp-primary-soft);
  color: var(--scgp-primary);
}

.hero-metric-card--amber .hero-metric-card__icon {
  background: #fff5dd;
  color: var(--scgp-warning);
}

.hero-metric-card--green .hero-metric-card__icon {
  background: #eaf8f0;
  color: var(--scgp-success);
}

.hero-metric-card--coral .hero-metric-card__icon {
  background: var(--scgp-coral-soft);
  color: var(--scgp-coral);
}

.dashboard-section-header,
.dashboard-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-section-header h2,
.dashboard-panel-header h2 {
  margin: 10px 0 0;
  color: var(--scgp-text);
  font-size: 24px;
  line-height: 1.15;
}

.dashboard-section-header p,
.dashboard-panel-header p {
  margin: 8px 0 0;
  color: var(--scgp-muted);
  font-size: 14px;
  line-height: 1.65;
}

.dashboard-panel-header__side {
  display: flex;
  align-items: center;
}

.dashboard-panel-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--scgp-primary-soft);
  color: var(--scgp-primary);
  font-size: 14px;
  font-weight: 700;
}

.dashboard-panel-count--danger {
  background: #fff1ea;
  color: var(--scgp-coral);
}

.dashboard-panel-count--warning {
  background: #fff5dd;
  color: var(--scgp-warning);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 214px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid var(--scgp-border);
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.quick-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px rgba(143, 169, 204, 0.16);
}

.quick-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.quick-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid currentColor;
  font-size: 12px;
  line-height: 1;
  opacity: 0.92;
}

.quick-card__arrow {
  color: var(--scgp-subtle);
}

.quick-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.quick-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-card__body h3 {
  margin: 0;
  color: var(--scgp-text);
  font-size: 17px;
}

.quick-card__body p {
  margin: 0;
  color: var(--scgp-muted);
  font-size: 13px;
  line-height: 1.7;
}

.quick-card--blue {
  color: var(--scgp-primary);
}

.quick-card--blue .quick-card__icon {
  background: var(--scgp-primary-soft);
}

.quick-card--teal {
  color: var(--scgp-teal);
}

.quick-card--teal .quick-card__icon {
  background: var(--scgp-teal-soft);
}

.quick-card--coral {
  color: var(--scgp-coral);
}

.quick-card--coral .quick-card__icon {
  background: var(--scgp-coral-soft);
}

.quick-card--green {
  color: var(--scgp-success);
}

.quick-card--green .quick-card__icon {
  background: #eaf8f0;
}

.dashboard-board {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(340px, 0.92fr);
  gap: 20px;
}

.dashboard-board__stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.schedule-list,
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
}

.schedule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--scgp-border);
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfe 100%);
}

.schedule-item__main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.schedule-item__content {
  min-width: 0;
}

.schedule-item__topline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.schedule-item__topline h3 {
  margin: 0;
  color: var(--scgp-text);
  font-size: 16px;
}

.schedule-item__plan {
  margin: 0 0 8px;
  color: var(--scgp-text);
  font-size: 14px;
}

.schedule-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--scgp-muted);
  font-size: 12px;
  line-height: 1.6;
}

.schedule-item__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 0;
}

.alert-item + .alert-item {
  border-top: 1px dashed rgba(217, 226, 238, 0.92);
}

.alert-item__accent {
  width: 8px;
  min-height: 54px;
  border-radius: 999px;
  flex-shrink: 0;
}

.alert-item--danger .alert-item__accent {
  background: linear-gradient(180deg, #f16f52 0%, #da8166 100%);
}

.alert-item--warning .alert-item__accent {
  background: linear-gradient(180deg, #e5a53c 0%, #ba7517 100%);
}

.alert-item__body {
  min-width: 0;
  flex: 1;
}

.alert-item__topline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.alert-item__topline h3 {
  margin: 0;
  color: var(--scgp-text);
  font-size: 15px;
}

.alert-item__time {
  color: var(--scgp-subtle);
  font-size: 12px;
  white-space: nowrap;
}

.alert-item__desc {
  margin: 6px 0 8px;
  color: var(--scgp-muted);
  font-size: 13px;
  line-height: 1.7;
}

.alert-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  color: var(--scgp-muted);
  font-size: 12px;
}

@media (max-width: 1280px) {
  .dashboard-hero,
  .dashboard-board {
    grid-template-columns: 1fr;
  }

  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    gap: 16px;
    padding: 16px;
  }

  .dashboard-hero,
  .dashboard-surface {
    padding: 18px;
  }

  .dashboard-highlight-grid,
  .dashboard-hero__metrics,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-section-header,
  .dashboard-panel-header,
  .alert-item__topline {
    flex-direction: column;
    align-items: flex-start;
  }

  .schedule-item {
    flex-direction: column;
    align-items: stretch;
  }

  .schedule-item__main {
    align-items: flex-start;
  }

  .schedule-item__actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
