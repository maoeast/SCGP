<template>
  <div class="page-container scgp-admin-page dashboard-page" v-loading="loading">
    <!-- 看板上半部分：上下分层（Banner 全宽白色 surface + 下方 5 张数据卡片平铺在页面底色上） -->
    <section class="dashboard-hero">
      <div class="dashboard-hero__banner scgp-surface">
        <div class="dashboard-hero__greeting">
          <h2>{{ greeting }}</h2>
          <p v-if="currentQuote" class="dashboard-hero__quote">{{ currentQuote }}</p>
        </div>

        <!-- 主行动按钮：按 focusPanel 优先级引导到对应区块（今日日程 > 预警 > 待评估 > AI 助手） -->
        <div class="dashboard-hero__action">
          <div class="dashboard-hero__focus">
            <strong class="dashboard-hero__focus-title">{{ focusPanel.title }}</strong>
            <span class="dashboard-hero__focus-desc">{{ focusPanel.description }}</span>
          </div>
          <el-button type="primary" size="large" round @click="handlePrimaryAction">
            {{ primaryAction.label }}
          </el-button>
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

    <section :ref="panelRefs.agent" class="dashboard-surface scgp-surface" v-loading="aiStore.loading">
      <div class="dashboard-section-header">
        <div>
          <h2>AI 助手</h2>
          <p>选择最贴近当前工作的智能体，查看它能提供的支持并开始对话。</p>
        </div>
        <span class="agent-section-count">{{ homeAgents.length }} 个已启用</span>
      </div>

      <div v-if="homeAgents.length > 0" class="home-agent-grid">
        <article
          v-for="item in homeAgents"
          :key="item.preset.code"
          class="home-agent-card"
        >
          <button
            type="button"
            class="home-agent-card__main"
            :aria-label="`查看${item.preset.displayName}详情`"
            @click="openAgentDetail(item.preset)"
          >
            <span class="home-agent-card__identity">
              <AiAgentAvatar :agent-code="item.preset.code" :agent-name="item.preset.name" size="xl" />
              <span class="home-agent-card__titles">
                <strong>{{ item.preset.displayName }}</strong>
                <span>{{ item.preset.name }}</span>
              </span>
            </span>

            <span class="home-agent-card__support">{{ item.preset.teacherSupport }}</span>

            <span class="home-agent-card__tags" aria-label="擅长场景">
              <span
                v-for="tag in item.preset.expertiseTags"
                :key="tag"
                class="home-agent-tag"
              >
                {{ tag }}
              </span>
            </span>

            <span class="home-agent-card__action">
              查看详情
              <el-icon><ArrowRight /></el-icon>
            </span>
          </button>
        </article>
      </div>
      <el-empty
        v-else-if="!aiStore.loading"
        description="暂无已启用的 AI 智能体，请联系学校管理员"
        :image-size="72"
      />
    </section>

    <el-dialog
      v-model="agentDetailVisible"
      width="600px"
      class="home-agent-detail-dialog"
      destroy-on-close
      append-to-body
    >
      <template v-if="selectedHomeAgent" #header>
        <div class="home-agent-detail__header">
          <AiAgentAvatar
            :agent-code="selectedHomeAgent.preset.code"
            :agent-name="selectedHomeAgent.preset.name"
            size="lg"
          />
          <div class="home-agent-detail__identity">
            <h3>{{ selectedHomeAgent.preset.displayName }}</h3>
            <div>{{ selectedHomeAgent.preset.name }}</div>
            <p>{{ selectedHomeAgent.preset.tagline }}</p>
          </div>
        </div>
      </template>

      <div v-if="selectedHomeAgent" class="home-agent-detail__content">
        <section class="home-agent-detail__section">
          <h4>可以怎样支持老师</h4>
          <p>{{ selectedHomeAgent.preset.teacherSupport }}</p>
        </section>

        <section class="home-agent-detail__section">
          <h4>擅长场景</h4>
          <div class="home-agent-detail__tags">
            <el-tag
              v-for="tag in selectedHomeAgent.preset.expertiseTags"
              :key="tag"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
          </div>
        </section>

        <section class="home-agent-detail__section">
          <h4>可以这样问</h4>
          <div class="home-agent-prompt-list">
            <div
              v-for="prompt in selectedHomeAgent.preset.starterPrompts"
              :key="prompt"
              class="home-agent-prompt"
            >
              “{{ prompt }}”
            </div>
          </div>
        </section>
      </div>

      <template v-if="selectedHomeAgent" #footer>
        <div class="home-agent-detail__footer">
          <span>开始后将使用“{{ selectedHomeAgent.preset.name }}”新建一段对话。</span>
          <el-button type="primary" size="large" @click="startAgentChat">
            开始聊天
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="assessmentInsightDrawerVisible"
      width="720px"
      class="assessment-insight-dialog"
      destroy-on-close
      append-to-body
      title="评估缺口与优先建议"
    >
      <p class="assessment-insight-dialog__hint">
        按优先级排序（明显偏弱 &gt; 尚无评估 &gt; 偏弱需关注 &gt; 评估缺口 &gt; 超期未复评），点击条目进入学生详情。
      </p>

      <div class="assessment-insight-dialog__list">
        <article
          v-for="item in snapshot.assessmentInsights"
          :key="item.studentId"
          class="assessment-insight-row"
          role="button"
          tabindex="0"
          @click="goToStudentDetail(item.studentId)"
          @keydown.enter.prevent="goToStudentDetail(item.studentId)"
          @keydown.space.prevent="goToStudentDetail(item.studentId)"
        >
          <div class="assessment-insight-row__topline">
            <h3>{{ item.studentName }}</h3>
            <span class="assessment-insight-row__time">
              {{ item.lastAssessmentAt ? `最近评估：${formatDate(item.lastAssessmentAt)}` : '尚无评估记录' }}
            </span>
          </div>

          <p class="assessment-insight-row__desc">{{ item.suggestion }}</p>

          <div class="assessment-insight-row__tags">
            <span v-if="item.disorder" class="alert-item__tag alert-item__tag--never">
              {{ item.disorder }}
            </span>
            <span
              v-for="tag in item.tags"
              :key="`${tag.kind}-${tag.label}`"
              class="alert-item__tag"
              :class="`alert-item__tag--${tag.kind}`"
            >
              {{ tag.label }}
            </span>
          </div>
        </article>
      </div>
    </el-dialog>

    <section class="dashboard-surface scgp-surface">
      <div class="dashboard-section-header">
        <div>
          <h2>最近添加的学生</h2>
          <p>展示最近建档的学生档案，点击可直接进入学生详情继续跟进。</p>
        </div>
      </div>

      <el-empty
        v-if="snapshot.recentStudents.length === 0"
        description="暂无学生记录"
      />

      <div v-else class="recent-student-list">
        <article
          v-for="student in snapshot.recentStudents"
          :key="student.id"
          class="recent-student-item"
          role="button"
          tabindex="0"
          @click="goToStudentDetail(student.id)"
          @keyup.enter="goToStudentDetail(student.id)"
        >
          <StudentAvatar
            :name="student.name"
            :avatar-url="student.avatar_path || undefined"
            size="md"
          />

          <div class="recent-student-item__body">
            <div class="recent-student-item__topline">
              <h3>{{ student.name }}</h3>
              <el-tag size="small" effect="plain">
                {{ student.student_no || '未分配学号' }}
              </el-tag>
            </div>
            <span class="recent-student-item__time">
              建档时间：{{ formatDate(student.created_at) }}
            </span>
          </div>

          <el-icon class="recent-student-item__arrow"><ArrowRight /></el-icon>
        </article>
      </div>
    </section>

    <section class="dashboard-surface scgp-surface">
      <div class="dashboard-section-header">
        <div>
          <h2>训练进度概览</h2>
          <p>过去 7 天的主轴训练次数趋势，帮助快速判断近期训练强度变化。</p>
        </div>
      </div>

      <el-empty
        v-if="snapshot.weeklyTrend.length === 0"
        description="暂无训练数据"
      />
      <VChart
        v-else
        class="dashboard-trend-chart"
        :option="trendOption"
        autoresize
      />
    </section>

    <section class="dashboard-board">
      <article :ref="panelRefs.schedule" class="dashboard-surface scgp-surface schedule-panel">
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
            v-for="item in displayedSchedule"
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
        <article :ref="panelRefs.anomaly" class="dashboard-surface scgp-surface alert-panel">
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

        <article :ref="panelRefs.assessment" class="dashboard-surface scgp-surface alert-panel">
          <div class="dashboard-panel-header">
            <div>
              <h2>智能特教助理</h2>
              <p>基于本地评估记录梳理结果偏弱、评估缺口与复评超期，给出优先处理的学生与下一步建议。</p>
            </div>
            <div class="dashboard-panel-header__side">
              <span class="dashboard-panel-count dashboard-panel-count--warning">
                {{ assessmentBadgeText }}
              </span>
              <button
                v-if="snapshot.assessmentInsights.length > displayedAssessmentInsights.length"
                type="button"
                class="dashboard-panel-header__action"
                @click="assessmentInsightDrawerVisible = true"
              >
                查看全部
              </button>
            </div>
          </div>

          <el-empty
            v-if="snapshot.assessmentInsights.length === 0"
            description="当前没有需要优先处理的评估事项"
          />

          <div v-else class="alert-list">
            <article
              v-for="item in displayedAssessmentInsights"
              :key="item.studentId"
              class="alert-item alert-item--warning alert-item--clickable"
              role="button"
              tabindex="0"
              @click="goToStudentDetail(item.studentId)"
              @keydown.enter.prevent="goToStudentDetail(item.studentId)"
              @keydown.space.prevent="goToStudentDetail(item.studentId)"
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
                    {{ item.lastAssessmentAt ? `最近评估：${formatDate(item.lastAssessmentAt)}` : '尚无评估记录' }}
                  </span>
                </div>

                <p class="alert-item__desc">{{ item.suggestion }}</p>

                <div class="alert-item__meta">
                  <span v-if="item.disorder">{{ item.disorder }}</span>
                  <span
                    v-for="tag in item.tags"
                    :key="`${tag.kind}-${tag.label}`"
                    class="alert-item__tag"
                    :class="`alert-item__tag--${tag.kind}`"
                  >
                    {{ tag.label }}
                  </span>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  Calendar,
  EditPen,
  Finished,
  VideoPlay,
  Warning,
  UserFilled,
} from '@element-plus/icons-vue'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import AiAgentAvatar from '@/features/ai/components/AiAgentAvatar.vue'
import {
  DashboardAPI,
  type DashboardScheduleItem,
  type DashboardSnapshot,
} from '@/database/dashboard-api'
import { resolveTrainingLaunch } from '@/utils/training-launch'
import { useAuthStore } from '@/stores/auth'
import { useAiStore } from '@/stores/ai'
import {
  BUILTIN_AGENT_PRESETS,
  type BuiltinAgentPreset,
} from '@/data/ai-agent-presets'
import quotes from '@/data/quotes.json'
import { openAiAssistant } from '@/features/ai/assistant-launcher'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

type DashboardTone = 'blue' | 'amber' | 'green' | 'coral'


const router = useRouter()
const dashboardApi = new DashboardAPI()
const authStore = useAuthStore()
const aiStore = useAiStore()

const loading = ref(false)
const snapshot = ref<DashboardSnapshot>({
  overview: {
    studentCount: 0,
    pendingAssessmentCount: 0,
    pendingPriorityCount: 0,
    pendingBaselineCount: 0,
    todayTaskCount: 0,
    weeklyAnomalyCount: 0,
    completedPlanCount: 0,
  },
  schedule: [],
  anomalies: [],
  assessmentInsights: [],
  recentStudents: [],
  weeklyTrend: [],
})

// 每日暖心语录：进入首页时从 src/data/quotes.json 随机抽取一条
const currentQuote = ref('')

// 欢迎语称呼：优先登录用户姓名，缺失时按角色名兜底
const displayName = computed(() => {
  const user = authStore.user
  const name = (user?.name || '').trim()
  if (name) return name
  return user?.role === 'teacher' ? '老师' : '系统管理员'
})

const greeting = computed(() => `您好，${displayName.value}！`)

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
    hint: '当前系统内注册学生',
    icon: UserFilled,
    tone: 'blue' as DashboardTone,
  },
  {
    label: '待评估提醒',
    value: snapshot.value.overview.pendingAssessmentCount,
    hint: '结果偏弱、评估缺口或超过 6 个月未复评',
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
  {
    label: '已完成计划数',
    value: snapshot.value.overview.completedPlanCount,
    hint: '状态为已完成的训练计划',
    icon: Finished,
    tone: 'green' as DashboardTone,
  },
]))

const displayedAnomalies = computed(() => snapshot.value.anomalies.slice(0, 4))

// 今日训练日程最多展示 5 条，避免列表过长
const displayedSchedule = computed(() => snapshot.value.schedule.slice(0, 5))
const displayedAssessmentInsights = computed(() => snapshot.value.assessmentInsights.slice(0, 4))

// 面板角标：待办总数接近学生总数时（特教群体常态），拆出「优先处理」档才有信息量
// 优先 = 明显偏弱 or 尚无评估记录；无优先项时退回单纯总数
const assessmentBadgeText = computed(() => {
  const { pendingAssessmentCount, pendingPriorityCount } = snapshot.value.overview
  return pendingPriorityCount > 0
    ? `优先 ${pendingPriorityCount} · 共 ${pendingAssessmentCount}`
    : `${pendingAssessmentCount} 条`
})
const agentDetailVisible = ref(false)
/** 「查看全部」评估建议弹窗（面板只展示前 4 条） */
const assessmentInsightDrawerVisible = ref(false)
const selectedHomeAgentCode = ref('')
const homeAgents = computed(() =>
  BUILTIN_AGENT_PRESETS.map((preset) => ({
    preset,
    agent: aiStore.agents.find((agent) => agent.code === preset.code),
  })).filter((item) => item.agent?.enabled),
)
const selectedHomeAgent = computed(() =>
  homeAgents.value.find((item) => item.preset.code === selectedHomeAgentCode.value) ?? null,
)

const trendOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
  },
  grid: {
    left: 24,
    right: 24,
    top: 24,
    bottom: 24,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: snapshot.value.weeklyTrend.map((point) => point.date),
    axisLabel: {
      color: '#909399',
    },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: {
      color: '#909399',
    },
    splitLine: {
      lineStyle: {
        color: '#ebeef5',
      },
    },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      data: snapshot.value.weeklyTrend.map((point) => point.count),
      lineStyle: {
        color: '#409EFF',
        width: 3,
      },
      itemStyle: {
        color: '#409EFF',
      },
      areaStyle: {
        color: 'rgba(64, 158, 255, 0.14)',
      },
    },
  ],
}))

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
    const priorityHint =
      overview.pendingPriorityCount > 0
        ? `（其中 ${overview.pendingPriorityCount} 条需优先处理）`
        : ''
    return {
      title: `当前有 ${overview.pendingAssessmentCount} 条待评估提醒${priorityHint}`,
      description: '建议优先处理评估结果偏弱、基线不完整或长期未复评的学生，避免干预决策缺少依据。',
    }
  }

  return {
    title: '今天的训练节奏相对平稳',
    description: '当前没有待处理的训练日程或显著预警，可以从 AI 助手选择需要的工作支持。',
  }
})

// 主行动按钮：与 focusPanel 同优先级联动（今日日程 > 预警 > 待评估 > AI 助手）
const primaryAction = computed(() => {
  const overview = snapshot.value.overview
  if (overview.todayTaskCount > 0) {
    return { label: '进入今日日程', target: 'schedule' as const }
  }
  if (overview.weeklyAnomalyCount > 0) {
    return { label: '查看异常预警', target: 'anomaly' as const }
  }
  if (overview.pendingAssessmentCount > 0) {
    return { label: '查看待评估提醒', target: 'assessment' as const }
  }
  return { label: '咨询 AI 助手', target: 'agent' as const }
})

// 锚点滚动：引导到 focusPanel 对应的面板区块
const panelRefs = {
  schedule: ref<HTMLElement | null>(null),
  anomaly: ref<HTMLElement | null>(null),
  assessment: ref<HTMLElement | null>(null),
  agent: ref<HTMLElement | null>(null),
}

function handlePrimaryAction() {
  const el = panelRefs[primaryAction.value.target]?.value
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function pickRandomQuote(list: string[]) {
  if (list.length === 0) return ''
  return list[Math.floor(Math.random() * list.length)] ?? ''
}

function getModuleLabel(moduleCode: string) {
  return moduleLabelMap[moduleCode] || moduleCode || '训练模块'
}

function openAgentDetail(preset: BuiltinAgentPreset) {
  selectedHomeAgentCode.value = preset.code
  agentDetailVisible.value = true
}

function startAgentChat() {
  if (!selectedHomeAgent.value) return
  const agentCode = selectedHomeAgent.value.preset.code
  agentDetailVisible.value = false
  openAiAssistant(agentCode)
}

function goToStudentDetail(studentId: number) {
  if (!studentId) return
  router.push(`/students/${studentId}`)
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

// 自动刷新：每 3 分钟静默拉取一次看板数据（已无手动刷新入口）
const AUTO_REFRESH_INTERVAL_MS = 180_000
const AUTO_REFRESH_HIDDEN_SKIP = 'hidden'
let autoRefreshTimer: ReturnType<typeof setInterval> | undefined

async function loadDashboard({ silent = false } = {}) {
  try {
    if (!silent) loading.value = true
    snapshot.value = await dashboardApi.getSnapshot()
  } catch (error) {
    console.error('加载首页看板失败:', error)
  } finally {
    if (!silent) loading.value = false
  }
}

// 定时刷新：页面不可见时直接跳过，避免后台空跑请求
function handleAutoRefreshTick() {
  if (document.visibilityState === AUTO_REFRESH_HIDDEN_SKIP) return
  void loadDashboard({ silent: true })
}

// 焦点唤醒刷新：从其他窗口/标签切回时立即拉一次
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    void loadDashboard({ silent: true })
  }
}

onMounted(() => {
  void loadDashboard()
  currentQuote.value = pickRandomQuote(quotes)
  autoRefreshTimer = setInterval(handleAutoRefreshTick, AUTO_REFRESH_INTERVAL_MS)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (autoRefreshTimer !== undefined) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = undefined
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped>
.dashboard-page {
  gap: 20px;
}

.dashboard-hero__banner,
.dashboard-surface {
  padding: 24px;
}

/* 看板上半部分：Banner 与卡片组上下分层（不再左右分栏） */
.dashboard-hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Hero Banner：100% 宽度、左右两端对齐 */
.dashboard-hero__banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.dashboard-hero__greeting {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dashboard-hero__greeting h2 {
  margin: 0;
  color: var(--scgp-primary);
  font-size: clamp(28px, 2.7vw, 36px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
}

/* 每日语录：柔和的次级文本色（带微弱主题蓝的灰），弱于主标题但不抢眼 */
.dashboard-hero__quote {
  margin: 0;
  max-width: 720px;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}

/* 行动区：核心待办提示 + 主行动按钮紧凑横排 */
.dashboard-hero__action {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.dashboard-hero__focus {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 420px;
}

.dashboard-hero__focus-title {
  color: var(--scgp-text);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.5;
}

.dashboard-hero__focus-desc {
  color: var(--scgp-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.dashboard-hero__action .el-button {
  font-weight: 600;
  letter-spacing: 1px;
}

/* 数据卡片组：Banner 下方平铺（直接落在页面底色上） */
.dashboard-hero__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
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

.agent-section-count {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--scgp-primary-soft);
  color: var(--scgp-primary);
  font-size: 13px;
  font-weight: 650;
}

.home-agent-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.home-agent-card {
  display: flex;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: var(--el-bg-color, #ffffff);
  box-shadow: 0 1px 3px rgb(31 35 41 / 12%);
  transition-property: transform, box-shadow;
  transition-duration: 180ms;
  transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.home-agent-card__main {
  display: flex;
  min-height: 250px;
  width: 100%;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
}

.home-agent-card__main:active {
  transform: scale(0.98);
}

.home-agent-card__main:focus-visible {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: -3px;
}

.home-agent-card__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.home-agent-card__titles {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.home-agent-card__titles strong {
  overflow: hidden;
  color: var(--el-text-color-primary, #303133);
  font-size: 17px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-agent-card__titles span {
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  line-height: 1.35;
}

.home-agent-card__support {
  display: -webkit-box;
  overflow: hidden;
  min-height: 68px;
  color: var(--el-text-color-regular, #606266);
  font-size: 14px;
  line-height: 1.65;
  text-wrap: pretty;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.home-agent-card__tags,
.home-agent-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.home-agent-tag {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--el-fill-color-light, #f2f3f5);
  color: var(--el-text-color-regular, #606266);
  font-size: 12px;
  line-height: 1;
}

.home-agent-card__action {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  color: var(--el-color-primary, #409eff);
  font-size: 13px;
  font-weight: 650;
}

.home-agent-detail__header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-right: 28px;
}

.home-agent-detail__identity {
  min-width: 0;
  flex: 1;
}

.home-agent-detail__identity h3 {
  margin: 0;
  color: var(--el-text-color-primary, #303133);
  font-size: 21px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.012em;
}

.home-agent-detail__identity > div {
  margin-top: 3px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}

.home-agent-detail__identity p {
  margin: 8px 0 0;
  color: var(--el-text-color-regular, #606266);
  font-size: 14px;
  line-height: 1.55;
}

.home-agent-detail__content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.home-agent-detail__section h4 {
  margin: 0 0 10px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  font-weight: 600;
}

.home-agent-detail__section p {
  margin: 0;
  color: var(--el-text-color-regular, #606266);
  font-size: 14px;
  line-height: 1.75;
  text-wrap: pretty;
}

.home-agent-prompt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-agent-prompt {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light, #fafafa);
  color: var(--el-text-color-regular, #606266);
  font-size: 13px;
  line-height: 1.55;
}

.home-agent-detail__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.home-agent-detail__footer > span {
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
  line-height: 1.6;
}

:global(.home-agent-detail-dialog) {
  max-width: calc(100vw - 32px);
  border-radius: 14px;
}

:global(.home-agent-detail-dialog .el-dialog__body) {
  max-height: min(62vh, 620px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-top: 18px;
}

:global(.home-agent-detail-dialog .el-dialog__footer) {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}

@media (hover: hover) {
  .home-agent-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 22px rgb(31 35 41 / 13%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-agent-card,
  .home-agent-card__main {
    transition: none;
  }
}

.recent-student-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.recent-student-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--scgp-border);
  background: linear-gradient(180deg, #ffffff 0%, #f9fbfe 100%);
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.recent-student-item:hover,
.recent-student-item:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(143, 169, 204, 0.16);
  outline: none;
}

.recent-student-item__body {
  min-width: 0;
  flex: 1;
}

.recent-student-item__topline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.recent-student-item__topline h3 {
  margin: 0;
  color: var(--scgp-text);
  font-size: 15px;
}

.recent-student-item__time {
  color: var(--scgp-subtle);
  font-size: 12px;
}

.recent-student-item__arrow {
  color: var(--scgp-subtle);
  flex-shrink: 0;
}

.dashboard-trend-chart {
  height: 300px;
  margin-top: 18px;
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

.alert-item--clickable {
  cursor: pointer;
  border-radius: 12px;
  transition: background-color 0.18s ease;
}

.alert-item--clickable:hover {
  background: rgba(64, 158, 255, 0.06);
}

.alert-item--clickable:focus-visible {
  outline: 2px solid rgba(64, 158, 255, 0.55);
  outline-offset: 2px;
}

.alert-item__tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.6;
  white-space: nowrap;
}

.alert-item__tag--weak {
  background: rgba(216, 106, 79, 0.14);
  color: #b8502c;
}

.alert-item__tag--watch {
  background: rgba(229, 165, 60, 0.16);
  color: #97620f;
}

.alert-item__tag--gap {
  background: rgba(64, 158, 255, 0.14);
  color: #2f6fd0;
}

.alert-item__tag--never {
  background: rgba(144, 147, 153, 0.16);
  color: #5f6368;
}

.alert-item__tag--overdue {
  background: rgba(229, 165, 60, 0.18);
  color: #97620f;
}

.dashboard-panel-header__action {
  margin-left: 12px;
  padding: 4px 10px;
  border: 1px solid rgba(64, 158, 255, 0.4);
  border-radius: 999px;
  background: transparent;
  color: #2f6fd0;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.18s ease;
}

.dashboard-panel-header__action:hover {
  background: rgba(64, 158, 255, 0.1);
}

.dashboard-panel-header__action:focus-visible {
  outline: 2px solid rgba(64, 158, 255, 0.55);
  outline-offset: 2px;
}

.assessment-insight-dialog__hint {
  margin: 0 0 12px;
  color: var(--scgp-muted);
  font-size: 13px;
  line-height: 1.7;
}

.assessment-insight-dialog__list {
  max-height: min(58vh, 560px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.assessment-insight-row {
  padding: 14px 8px;
  cursor: pointer;
  border-radius: 12px;
  transition: background-color 0.18s ease;
}

.assessment-insight-row:hover {
  background: rgba(64, 158, 255, 0.06);
}

.assessment-insight-row + .assessment-insight-row {
  border-top: 1px dashed rgba(217, 226, 238, 0.92);
}

.assessment-insight-row__topline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.assessment-insight-row__topline h3 {
  margin: 0;
  color: var(--scgp-text);
  font-size: 15px;
}

.assessment-insight-row__time {
  color: var(--scgp-subtle);
  font-size: 12px;
  white-space: nowrap;
}

.assessment-insight-row__desc {
  margin: 6px 0 8px;
  color: var(--scgp-muted);
  font-size: 13px;
  line-height: 1.7;
}

.assessment-insight-row__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--scgp-muted);
  font-size: 12px;
}

@media (max-width: 1280px) {
  .dashboard-board {
    grid-template-columns: 1fr;
  }

  .home-agent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    gap: 16px;
    padding: 16px;
  }

  .dashboard-hero__banner,
  .dashboard-surface {
    padding: 18px;
  }

  /* 窄屏 Banner 改为上下堆叠，行动区同样竖排 */
  .dashboard-hero__banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard-hero__action {
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
  }

  .dashboard-hero__metrics,
  .home-agent-grid {
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

  .home-agent-card__main {
    min-height: auto;
  }

  .home-agent-detail__header {
    padding-right: 20px;
  }

  .home-agent-detail__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .home-agent-detail__footer :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
