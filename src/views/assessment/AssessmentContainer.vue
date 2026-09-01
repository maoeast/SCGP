<template>
  <div class="assessment-container">
    <!-- 阶段 1：欢迎对话框 -->
    <WelcomeDialog
      v-if="phase === 'welcome'"
      :visible="true"
      :driver="driver"
      :student="student"
      @start="handleStartAssessment"
    />

    <!-- CBCL 阶段：社会能力表单 -->
    <CBCLSocialForm
      v-else-if="phase === 'social' && scaleCode === 'cbcl'"
      :student="student"
      @submit="handleSocialFormSubmit"
    />

    <!-- 阶段 2：评估进行中 -->
    <template v-else-if="phase === 'assessing'">
      <!-- 顶部进度区域 -->
      <el-card v-if="!driver?.isPerformanceTask" class="assessment-header">
        <template #header>
          <div class="header-content">
            <div class="student-info">
              <h3>{{ driver?.scaleName }}</h3>
              <div class="info-row">
                <span>学生：{{ student?.name }}</span>
                <span>年龄：{{ studentAgeLabel }}</span>
                <span v-if="startStageLabel">起始阶段：{{ startStageLabel }}</span>
                <span v-if="currentStageLabel && currentStageLabel !== startStageLabel">当前阶段：{{ currentStageLabel }}</span>
                <span v-if="currentDimensionLabel">当前维度：{{ currentDimensionLabel }}</span>
              </div>
            </div>
            <div class="progress-info">
              <el-progress
                :percentage="progress"
                :format="progressFormat"
                :stroke-width="20"
              />
              <div class="progress-text">
                已完成：{{ answeredCount }} / {{ effectiveTotalQuestions }} 题
              </div>
            </div>
          </div>
        </template>
      </el-card>

      <!-- 绩效题（cognitive_self）合并 Header：单一信息栏，取代"任务总览卡 + 题目卡"双层结构 -->
      <el-card v-else class="performance-header">
        <div class="perf-header-content">
          <div class="perf-header-left">
            <h3 class="perf-scale-name">{{ driver?.scaleName }}</h3>
            <div class="perf-student-meta">
              <span>学生：{{ student?.name }}</span>
              <span class="perf-meta-divider">·</span>
              <span>{{ studentAgeLabel }}</span>
            </div>
          </div>
          <div class="perf-header-right">
            <el-tag
              v-if="currentQuestion?.dimensionName || currentQuestion?.dimension"
              size="small"
              type="info"
              class="perf-tag"
            >
              {{ currentQuestion?.dimensionName || currentQuestion?.dimension }}
            </el-tag>
            <el-tag
              v-if="currentQuestion?.metadata?.isPractice"
              size="small"
              type="warning"
              class="perf-tag"
            >
              练习（不计分）
            </el-tag>
            <el-tag size="small" type="success" class="perf-tag">⚡ 看准后尽快作答</el-tag>
            <div class="perf-progress">
              <span class="perf-progress-count">{{ state.currentIndex + 1 }} / {{ questions.length }}</span>
              <el-progress
                :percentage="progress"
                :show-text="false"
                :stroke-width="8"
                class="perf-progress-bar"
              />
            </div>
          </div>
        </div>
      </el-card>

      <!-- 题目卡片（绩效题用 PerformanceTrialBoard，其余量表用 QuestionCard） -->
      <QuestionCard
        v-if="currentQuestion && !driver?.isPerformanceTask"
        :question="currentQuestion"
        :answer="currentAnswerValue"
        :question-index="state.currentIndex"
        :total-count="questions.length"
        :is-skipped="isCurrentQuestionSkipped"
        @answer="handleAnswer"
      />
      <PerformanceTrialBoard
        v-else-if="currentQuestion && driver?.isPerformanceTask"
        :question="currentQuestion"
        :question-index="state.currentIndex"
        :total-count="questions.length"
        @answer="handleAnswer"
      />

      <!-- 导航按钮 -->
      <div class="navigation-buttons">
        <el-button
          :disabled="state.currentIndex === 0"
          @click="handlePrevious"
          size="large"
        >
          上一题
        </el-button>
        <el-button
          type="primary"
          :disabled="!canProceedToNext"
          @click="handleNext"
          size="large"
        >
          {{ isLastQuestion ? '完成评估' : '下一题' }}
        </el-button>
      </div>

      <!-- CBCL 分页控件 -->
      <div v-if="scaleCode === 'cbcl'" class="cbcl-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="questions.length"
          layout="prev, pager, next"
          @change="handlePageChange"
        />
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
      </div>
    </template>

    <!-- 阶段 3：评估完成 -->
    <CompleteDialog
      v-else-if="phase === 'complete'"
      :visible="true"
      :score-result="scoreResult"
      :feedback="feedback"
      :student="student"
      :assessment-id="assessId || undefined"
      :scale-name="scaleDisplayName"
      :quality="qualityMetrics"
      @view-report="handleViewReport"
      @exit="handleExit"
    />

    <!-- 加载中 -->
    <div v-else-if="phase === 'loading'" class="loading-container">
      <el-icon class="is-loading" :size="48"><Loading /></el-icon>
      <p>正在加载评估...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import type {
  ScaleDriver,
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  AssessmentState,
  ScoreResult,
  AssessmentFeedback,
  AssessmentQualityMetrics
} from '@/types/assessment'
import { calculateAgeInMonths, computeAssessmentQualityMetrics } from '@/types/assessment'
import {
  getCnbsr2016UnsupportedAgeMessage,
  isCnbsr2016AgeSupported,
} from '@/config/cnbsr2016-thresholds'
import { getDriverByScaleCode } from '@/strategies/assessment'
import { StudentAPI } from '@/database/api'
import {
  buildAssessmentReportRoute,
  type AssessmentReportScaleType,
} from '@/features/assessment/report-routes'
import {
  type AssessmentProgressPhase,
  clearAssessmentProgressSnapshot,
  readAssessmentProgressSnapshot,
  resolveAssessmentProgressSnapshot,
  saveAssessmentProgressSnapshot,
} from './assessment-progress'


// 子组件
import WelcomeDialog from './components/WelcomeDialog.vue'
import QuestionCard from './components/QuestionCard.vue'
import PerformanceTrialBoard from './components/PerformanceTrialBoard.vue'
import CompleteDialog from './components/CompleteDialog.vue'
import CBCLSocialForm from './cbcl/SocialForm.vue'

// CBCL 类型
import type { CBCLSocialCompetenceData } from '@/types/cbcl'

// ========== 路由与状态 ==========
const route = useRoute()
const router = useRouter()

// 路由参数
const scaleCode = computed(() => route.params.scaleCode as string || route.query.scale as string)
const studentId = computed(() => parseInt(route.params.studentId as string || route.query.studentId as string))

// 评估阶段
type AssessmentPhase = 'loading' | 'welcome' | 'social' | 'assessing' | 'complete'
const phase = ref<AssessmentPhase>('loading')

// CBCL 特有状态
const cbclStep = ref<'social' | 'behavior'>('social')
const socialFormData = ref<CBCLSocialCompetenceData | null>(null)

// CBCL 分页状态
const currentPage = ref(1)
const pageSize = 10
const totalPages = computed(() => Math.ceil(questions.value.length / pageSize))

// 核心数据
const student = ref<StudentContext | null>(null)
const driver = ref<ScaleDriver | null>(null)

// 评估状态
const state = ref<AssessmentState>({
  currentIndex: 0,
  answers: {},
  isComplete: false,
  startTime: Date.now()
})

// 结果缓存
const scoreResult = ref<ScoreResult | null>(null)
const feedback = ref<AssessmentFeedback | null>(null)
const assessId = ref<number | null>(null)
// 质量指标（宽松质控：只记录；null 表示无法计算，CompleteDialog 不提示）
const qualityMetrics = ref<AssessmentQualityMetrics | null>(null)

// 量表中文名（推荐引擎计划名 + 徽标）
const scaleDisplayName = computed(() => {
  try {
    return driver.value?.getScaleInfo?.()?.name || scaleCode.value
  } catch {
    return scaleCode.value
  }
})

interface CBCLDriverProgressBinding {
  setSocialData(data: CBCLSocialCompetenceData): void
  clearSocialData?(): void
}

// ========== 计算属性 ==========

const questions = computed<ScaleQuestion[]>(() => {
  if (!driver.value || !student.value) return []
  return driver.value.getQuestions(student.value)
})

const currentQuestion = computed<ScaleQuestion | null>(() => {
  return questions.value[state.value.currentIndex] || null
})

const currentAnswerValue = computed(() => {
  if (!currentQuestion.value) return null
  const answer = state.value.answers[currentQuestion.value.id]
  if (!answer) return null

  // 如果答案包含 metadata 且有 description 字段，返回对象格式
  if (answer.metadata?.description !== undefined) {
    return {
      value: answer.value,
      description: answer.metadata.description
    }
  }

  return answer.value
})

// 计算属性：是否可以进入下一题（用于禁用按钮）
const canProceedToNext = computed(() => {
  if (!currentQuestion.value) return false

  const answer = state.value.answers[currentQuestion.value.id]
  if (!answer) {
    // 绩效题（如视知觉图形匹配筛查）：超时未作答也允许进入下一题（由 Driver 记 omitted）
    return driver.value?.isPerformanceTask === true
  }

  // 如果题目需要说明内容
  if (currentQuestion.value.metadata?.hasDescription) {
    const isNonZeroAnswer = answer.value !== 0 && answer.value !== '0'
    const description = answer.metadata?.description
    const isDescriptionEmpty = !description || description.trim() === ''

    // 非0答案且说明内容为空，不能继续
    if (isNonZeroAnswer && isDescriptionEmpty) {
      return false
    }
  }

  return true
})

const currentAnswer = computed<ScaleAnswer | null>(() => {
  if (!currentQuestion.value) return null
  return state.value.answers[currentQuestion.value.id] ?? null
})

const answeredCount = computed(() => {
  return Object.keys(state.value.answers).length
})

const progress = computed(() => {
  if (!driver.value) return 0
  if (driver.value.calculateProgress) {
    return driver.value.calculateProgress(state.value)
  }
  if (questions.value.length === 0) return 0
  return Math.round((answeredCount.value / questions.value.length) * 100)
})

// 获取从起始阶段开始的题目总数（用于S-M等量表的进度显示）
const effectiveTotalQuestions = computed(() => {
  if (!driver.value) return questions.value.length
  // 如果驱动器有 getQuestionsFromStart 方法，使用它
  if (typeof (driver.value as any).getQuestionsFromStart === 'function') {
    return (driver.value as any).getQuestionsFromStart(state.value)
  }
  return questions.value.length
})

const isLastQuestion = computed(() => {
  return state.value.currentIndex >= questions.value.length - 1
})

const studentAgeLabel = computed(() => {
  if (!student.value) return '-'
  return formatAgeInMonths(student.value.ageInMonths)
})

function formatAgeInMonths(ageInMonths: number): string {
  const years = Math.floor(ageInMonths / 12)
  const months = ageInMonths % 12
  if (years === 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
}

function formatSMStageLabel(stage: number | null | undefined): string | null {
  if (!stage) return null
  const labels: Record<number, string> = {
    1: '第1阶段（6个月-1岁11个月）',
    2: '第2阶段（2岁-3岁5个月）',
    3: '第3阶段（3岁6个月-4岁11个月）',
    4: '第4阶段（5岁-6岁5个月）',
    5: '第5阶段（6岁6个月-8岁5个月）',
    6: '第6阶段（8岁6个月-10岁5个月）',
    7: '第7阶段（10岁6个月以上）'
  }
  return labels[stage] || `第${stage}阶段`
}

const startStageLabel = computed(() => {
  return formatSMStageLabel(state.value.metadata?.startStage)
})

const currentStageLabel = computed(() => {
  const stage = currentQuestion.value?.metadata?.age_stage
  return formatSMStageLabel(stage)
})

const currentDimensionLabel = computed(() => {
  return currentQuestion.value?.dimensionName || currentQuestion.value?.dimension || null
})

// 计算属性：当前题目是否应该被跳过（用于CBCL 56题子题跳题逻辑）
const isCurrentQuestionSkipped = computed(() => {
  if (!currentQuestion.value || scaleCode.value !== 'cbcl') return false

  const question = currentQuestion.value
  const metadata = question.metadata

  // 检查是否是56题的子题 (56a-56h)
  if (metadata?.isSubItem && metadata?.parentId === 56) {
    // 获取56题的答案
    const q56Answer = state.value.answers[56]
    // 如果56题答案为0（无此表现），则跳过子题
    return q56Answer?.value === 0 || q56Answer?.value === '0'
  }

  return false
})

// ========== 初始化 ==========

async function initializeAssessment() {
  phase.value = 'loading'

  try {
    // 1. 验证参数
    if (!scaleCode.value || !studentId.value) {
      ElMessage.error('缺少必要参数')
      router.back()
      return
    }

    // 2. 加载学生信息
    const studentApi = new StudentAPI()
    const studentData = await studentApi.getStudentById(studentId.value)

    if (!studentData) {
      ElMessage.error('未找到该学生')
      router.back()
      return
    }

    const studentContext: StudentContext = {
      ...studentData,
      ageInMonths: calculateAgeInMonths(studentData.birthday)
    }
    student.value = studentContext

    // 3. 加载驱动器
    driver.value = getDriverByScaleCode(scaleCode.value)
    resetDriverProgressBindings()

    if (scaleCode.value === 'cnbsr2016' && !isCnbsr2016AgeSupported(studentContext.ageInMonths)) {
      ElMessage.error(
        `${studentContext.name} 当前为${formatAgeInMonths(studentContext.ageInMonths)}（${studentContext.ageInMonths}个月）。${getCnbsr2016UnsupportedAgeMessage(studentContext.ageInMonths)}`,
      )
      await router.replace({
        name: 'SelectStudent',
        query: { scale: scaleCode.value },
      })
      return
    }

    // 4. 初始化评估状态
    const startIndex = driver.value.getStartIndex(studentContext)
    state.value.currentIndex = startIndex
    state.value.answers = {}
    state.value.isComplete = false
    state.value.startTime = Date.now()

    // 获取有效的题目列表（用于判断完成条件）
    const effectiveQuestions = driver.value.getQuestions(studentContext)

    // 初始化 metadata，保存起始索引和有效题目总数（用于进度计算和完成判断）
    state.value.metadata = {
      startIndex: startIndex,
      startStage: (driver.value as any).sortedQuestions?.[startIndex]?.age_stage,
      totalQuestions: effectiveQuestions.length  // 存储有效题目总数
    }

    // 5. 尝试恢复进度
    const restored = await restoreProgress()

    // 6. 未恢复时进入欢迎阶段
    if (!restored) {
      phase.value = 'welcome'
    }

  } catch (error) {
    console.error('[AssessmentContainer] 初始化失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '评估初始化失败')
    router.back()
  }
}

// ========== 事件处理 ==========

function handleStartAssessment() {
  // CBCL 特殊处理：先进入社会能力表单
  if (scaleCode.value === 'cbcl') {
    phase.value = 'social'
    cbclStep.value = 'social'
  } else {
    phase.value = 'assessing'
    state.value.startTime = Date.now()
  }
  saveProgress()
}

function handleSocialFormSubmit(data: CBCLSocialCompetenceData) {
  socialFormData.value = data
  // 将社会能力数据传递给驱动器
  if (driver.value && 'setSocialData' in driver.value) {
    (driver.value as any).setSocialData(data)
  }
  cbclStep.value = 'behavior'
  phase.value = 'assessing'
  state.value.startTime = Date.now()
  saveProgress()
  ElMessage.success('社会能力信息已保存，开始行为问题评估')
}

function handlePageChange(page: number) {
  currentPage.value = page
  // 更新当前题目索引到当前页的第一题
  const newIndex = (page - 1) * pageSize
  if (newIndex < questions.value.length) {
    state.value.currentIndex = newIndex
  }
  saveProgress()
}

interface AnswerWithDescription {
  value: number | string
  description?: string
  /** 真反应时（ms），仅绩效题 PerformanceTrialBoard 传入；问卷型不带此字段 */
  reactionTimeMs?: number | null
  /** 绩效题扩展元数据（pointerType / anticipatory 标记等） */
  meta?: Record<string, any>
}

function handleAnswer(value: number | string | AnswerWithDescription) {
  if (!currentQuestion.value || !driver.value) return

  const question = currentQuestion.value

  // 解析答案值和说明内容
  let answerValue: number | string
  let description: string | undefined
  let reactionTimeMs: number | null | undefined

  if (typeof value === 'object' && 'value' in value) {
    // 对象格式：包含说明内容 / 绩效题真反应时
    answerValue = value.value
    description = value.description
    reactionTimeMs = value.reactionTimeMs
  } else {
    // 简单值格式
    answerValue = value
  }

  const option = question.options.find(o => o.value === answerValue)

  if (!option) {
    console.warn('[AssessmentContainer] 无效的答案选项:', answerValue)
    return
  }

  // 检查是否需要说明内容但未填写
  const needsDescription = question.metadata?.hasDescription === true
  const isNonZeroAnswer = answerValue !== 0 && answerValue !== '0'
  const isDescriptionEmpty = !description || description.trim() === ''

  if (needsDescription && isNonZeroAnswer && isDescriptionEmpty) {
    // 需要说明内容但未填写，显示提示但不跳转
    ElMessage.warning('请填写说明内容后再继续')
    // 仍然保存当前答案（方便用户后续填写说明）
  }

  // 检查是否是首次回答（用于区分新答案和修改答案）
  const previousAnswer = state.value.answers[question.id]
  const isModifying = previousAnswer !== undefined

  // 构建答案对象
  const answerRecord: ScaleAnswer = {
    questionId: question.id,
    value: answerValue,
    score: option.score,
    timestamp: Date.now(),
    responseTime: Date.now() - (state.value.metadata?.lastAnswerTime || state.value.startTime)
  }

  // 绩效题：用真反应时覆盖问卷型的「答题区间」伪 RT（仅当 payload 带有效 RT 时）
  if (reactionTimeMs != null) {
    answerRecord.responseTime = reactionTimeMs
  }

  // 如果有说明内容，保存到 metadata
  if (description !== undefined || reactionTimeMs != null) {
    answerRecord.metadata = {
      ...(description !== undefined ? { description } : {}),
      ...((value as AnswerWithDescription).meta ?? {}),
    }
  }

  // 记录答案
  state.value.answers[question.id] = answerRecord

  // 更新最后答题时间
  if (!state.value.metadata) state.value.metadata = {}
  state.value.metadata.lastAnswerTime = Date.now()

  // 保存进度
  saveProgress()

  // 如果是修改答案，不自动跳转
  if (isModifying) {
    ElMessage.success('答案已更新')
    return
  }

  // 如果需要说明内容但未填写，不自动跳转
  if (needsDescription && isNonZeroAnswer && isDescriptionEmpty) {
    return
  }

  // 延迟后自动导航
  setTimeout(() => {
    navigateToNext()
  }, 300)
}

function handlePrevious() {
  if (state.value.currentIndex > 0) {
    state.value.currentIndex--
    saveProgress()
  }
}

function handleNext() {
  // 检查当前题目是否需要说明内容但未填写
  if (currentQuestion.value && currentQuestion.value.metadata?.hasDescription) {
    const currentAnswer = state.value.answers[currentQuestion.value.id]
    const answerValue = currentAnswer?.value
    const description = currentAnswer?.metadata?.description

    const isNonZeroAnswer = answerValue !== 0 && answerValue !== '0'
    const isDescriptionEmpty = !description || description.trim() === ''

    if (isNonZeroAnswer && isDescriptionEmpty) {
      ElMessage.warning('请填写说明内容后再继续')
      return
    }
  }

  navigateToNext()
}

function navigateToNext() {
  if (!driver.value) return

  const decision = driver.value.getNextQuestion(
    state.value.currentIndex,
    state.value.answers,
    state.value
  )

  console.log('[AssessmentContainer] 导航决策:', decision)

  switch (decision.action) {
    case 'next':
      if (state.value.currentIndex < questions.value.length - 1) {
        state.value.currentIndex++
      }
      saveProgress()
      break

    case 'jump':
      if (decision.targetIndex !== undefined) {
        state.value.currentIndex = decision.targetIndex
      } else if (decision.targetQuestionId !== undefined) {
        const idx = questions.value.findIndex(q => q.id === decision.targetQuestionId)
        if (idx >= 0) state.value.currentIndex = idx
      }
      saveProgress()
      break

    case 'complete':
      if (decision.message) {
        ElMessage.info(decision.message)
      }
      completeAssessment()
      break
  }
}

// ========== 评估完成 ==========

async function completeAssessment() {
  if (!driver.value || !student.value) return

  state.value.isComplete = true
  state.value.endTime = Date.now()

  // 质量指标（墙钟）：答完 0 题或时间异常时为 null，Driver 侧跳过写入
  qualityMetrics.value = computeAssessmentQualityMetrics(
    state.value.startTime,
    state.value.endTime,
    Object.keys(state.value.answers).length
  )

  try {
    // 1. 计算评分
    scoreResult.value = driver.value.calculateScore(
      state.value.answers,
      student.value
    )

    // 2. 生成反馈
    feedback.value = driver.value.generateFeedback(scoreResult.value)

    // 3. 保存到数据库
    await saveAssessmentToDatabase()

    // 4. 清除本地进度
    clearProgress()

    // 5. 进入完成阶段
    phase.value = 'complete'

  } catch (error) {
    console.error('[AssessmentContainer] 完成评估失败:', error)
    state.value.isComplete = false
    state.value.endTime = undefined
    saveProgress()
    ElMessage.error(error instanceof Error ? error.message : '保存评估结果失败')
  }
}

async function saveAssessmentToDatabase() {
  if (!student.value || !scoreResult.value || !driver.value) return

  const startedAt = state.value.startTime ?? Date.now()
  const startTime = new Date(startedAt).toISOString()
  const endTime = new Date(state.value.endTime || Date.now()).toISOString()

  // 统一入口：优先使用 Driver 的 persistAssessment
  if (driver.value.persistAssessment) {
    const result = await driver.value.persistAssessment({
      student: student.value,
      state: state.value,
      scoreResult: scoreResult.value,
      startTime,
      endTime,
      quality: qualityMetrics.value ?? undefined,
    })
    assessId.value = result.assessId
    console.log(`[AssessmentContainer] ${scaleCode.value} 评估通过 Driver 持久化成功, ID:`, result.assessId)
    return
  }

  // 所有 12 个量表均已实现 persistAssessment，不应到达此处
  throw new Error(`[AssessmentContainer] ${scaleCode.value} 未实现 persistAssessment`)
}

// ========== 导航处理 ==========

function handleViewReport() {
  if (!assessId.value) {
    return
  }

  router.push(buildAssessmentReportRoute({
    scaleType: scaleCode.value as AssessmentReportScaleType,
    assessId: assessId.value,
    studentId: student.value?.id,
  }))
}

function handleExit() {
  router.push('/assessment')
}

function progressFormat(percentage: number): string {
  return `${percentage}%`
}

// ========== 进度持久化 ==========

function shouldPersistProgress(): boolean {
  return getPersistablePhase() !== null
}

function getPersistablePhase(): AssessmentProgressPhase | null {
  if (phase.value === 'welcome' || phase.value === 'social' || phase.value === 'assessing') {
    return phase.value
  }
  return null
}

function getProgressKeyInput() {
  return {
    scaleCode: scaleCode.value,
    studentId: studentId.value,
  }
}

function resetDriverProgressBindings() {
  if (scaleCode.value !== 'cbcl' || !driver.value) return
  const cbclDriver = driver.value as ScaleDriver & CBCLDriverProgressBinding
  cbclDriver.clearSocialData?.()
}

function saveProgress() {
  const persistablePhase = getPersistablePhase()
  if (!persistablePhase) return

  try {
    saveAssessmentProgressSnapshot(localStorage, getProgressKeyInput(), {
      phase: persistablePhase,
      currentIndex: state.value.currentIndex,
      answers: state.value.answers,
      startTime: state.value.startTime ?? Date.now(),
      metadata: state.value.metadata,
      cbclStep: cbclStep.value,
      socialFormData: socialFormData.value,
      currentPage: currentPage.value,
    })
  } catch (e) {
    console.warn('[AssessmentContainer] 保存进度失败:', e)
  }
}

async function restoreProgress(): Promise<boolean> {
  try {
    const snapshot = readAssessmentProgressSnapshot(localStorage, getProgressKeyInput())
    if (!snapshot) {
      return false
    }

    await ElMessageBox.confirm(
      '发现该学生此量表有未完成的评估进度，是否继续上次评估？',
      '恢复评估进度',
      {
        type: 'warning',
        confirmButtonText: '继续评估',
        cancelButtonText: '重新开始',
        distinguishCancelAndClose: true,
      },
    )

    const restored = resolveAssessmentProgressSnapshot({
      snapshot,
      questionCount: questions.value.length,
      pageSize,
      fallbackStartTime: state.value.startTime ?? Date.now(),
    })

    state.value.currentIndex = restored.currentIndex
    state.value.answers = restored.answers
    state.value.startTime = restored.startTime
    state.value.metadata = restored.metadata
    state.value.isComplete = false
    state.value.endTime = undefined
    cbclStep.value = restored.cbclStep
    socialFormData.value = restored.socialFormData
    currentPage.value = restored.currentPage

    if (scaleCode.value === 'cbcl' && driver.value && restored.socialFormData) {
      const cbclDriver = driver.value as ScaleDriver & CBCLDriverProgressBinding
      cbclDriver.setSocialData(restored.socialFormData)
    }

    phase.value = restored.phase
    ElMessage.success('已恢复上次未完成的评估进度')
    return true
  } catch (e) {
    if (e === 'cancel' || e === 'close') {
      clearProgress()
      return false
    }

    console.warn('[AssessmentContainer] 恢复进度失败:', e)
    return false
  }
}

function clearProgress() {
  try {
    clearAssessmentProgressSnapshot(localStorage, getProgressKeyInput())
  } catch (e) {
    console.warn('[AssessmentContainer] 清除进度失败:', e)
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  initializeAssessment()
})

// 离开页面时确认
onBeforeUnmount(() => {
  if (shouldPersistProgress() && !state.value.isComplete) {
    saveProgress()
  }
})

// 监听路由变化
watch(() => route.params, () => {
  if (scaleCode.value && studentId.value) {
    initializeAssessment()
  }
}, { deep: true })
</script>

<style scoped>
.assessment-container {
  padding: 16px 20px;
  max-width: 900px;
  margin: 0 auto;
}

.assessment-header {
  margin-bottom: 12px;
}

/* ====== 绩效题合并 Header（cognitive_self 专用） ====== */
.performance-header {
  margin-bottom: 12px;
}

.performance-header :deep(.el-card__body) {
  padding: 14px 20px;
}

.perf-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.perf-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.perf-scale-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.perf-student-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.perf-meta-divider {
  color: #c0c4cc;
}

.perf-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.perf-tag {
  margin: 0;
}

.perf-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 160px;
}

.perf-progress-count {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
  white-space: nowrap;
}

.perf-progress-bar {
  width: 100px;
}

@media (max-width: 768px) {
  .perf-header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .perf-header-right {
    width: 100%;
    justify-content: flex-start;
  }
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.student-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #606266;
  font-size: 14px;
}

.progress-info {
  min-width: 200px;
  text-align: right;
}

.progress-text {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}

.navigation-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #909399;
}

.loading-container .el-icon {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
  }

  .progress-info {
    width: 100%;
    text-align: left;
  }

  .info-row {
    flex-direction: column;
    gap: 8px;
  }
}

/* CBCL 分页样式 */
.cbcl-pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.page-info {
  font-size: 14px;
  color: #606266;
}
</style>
