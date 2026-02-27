<template>
  <div class="assessment-container">
    <!-- 阶段 1：欢迎对话框 -->
    <WelcomeDialog
      v-if="phase === 'welcome'"
      :visible="true"
      :driver="driver"
      @start="handleStartAssessment"
    />

    <!-- 阶段 2：评估进行中 -->
    <template v-else-if="phase === 'assessing'">
      <!-- 顶部进度区域 -->
      <el-card class="assessment-header">
        <template #header>
          <div class="header-content">
            <div class="student-info">
              <h3>{{ driver?.scaleName }}</h3>
              <div class="info-row">
                <span>学生：{{ student?.name }}</span>
                <span>年龄：{{ studentAgeLabel }}</span>
                <span v-if="currentStageLabel">起始阶段：{{ currentStageLabel }}</span>
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

      <!-- 题目卡片 -->
      <QuestionCard
        v-if="currentQuestion"
        :question="currentQuestion"
        :answer="currentAnswerValue"
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
          :disabled="currentAnswerValue === null"
          @click="handleNext"
          size="large"
        >
          {{ isLastQuestion ? '完成评估' : '下一题' }}
        </el-button>
      </div>
    </template>

    <!-- 阶段 3：评估完成 -->
    <CompleteDialog
      v-else-if="phase === 'complete'"
      :visible="true"
      :score-result="scoreResult"
      :feedback="feedback"
      :student="student"
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
  AssessmentFeedback
} from '@/types/assessment'
import { calculateAgeInMonths } from '@/types/assessment'
import { getDriverByScaleCode } from '@/strategies/assessment'
import { StudentAPI, SMAssessmentAPI, CSIRSAPI, WeeFIMAPI, ReportAPI, ConnersPSQAPI, ConnersTRSAPI } from '@/database/api'

// 子组件
import WelcomeDialog from './components/WelcomeDialog.vue'
import QuestionCard from './components/QuestionCard.vue'
import CompleteDialog from './components/CompleteDialog.vue'

// ========== 路由与状态 ==========
const route = useRoute()
const router = useRouter()

// 路由参数
const scaleCode = computed(() => route.params.scaleCode as string || route.query.scale as string)
const studentId = computed(() => parseInt(route.params.studentId as string || route.query.studentId as string))

// 评估阶段
type AssessmentPhase = 'loading' | 'welcome' | 'assessing' | 'complete'
const phase = ref<AssessmentPhase>('loading')

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
  return answer?.value ?? null
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
  const years = Math.floor(student.value.ageInMonths / 12)
  const months = student.value.ageInMonths % 12
  if (years === 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
})

const currentStageLabel = computed(() => {
  if (!currentQuestion.value?.metadata?.age_stage) return null
  const stage = currentQuestion.value.metadata.age_stage
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
})

const currentDimensionLabel = computed(() => {
  return currentQuestion.value?.dimensionName || currentQuestion.value?.dimension || null
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

    student.value = {
      ...studentData,
      ageInMonths: calculateAgeInMonths(studentData.birthday)
    }

    // 3. 加载驱动器
    driver.value = getDriverByScaleCode(scaleCode.value)

    // 4. 初始化评估状态
    const startIndex = driver.value.getStartIndex(student.value)
    state.value.currentIndex = startIndex
    state.value.answers = {}
    state.value.isComplete = false
    state.value.startTime = Date.now()

    // 获取有效的题目列表（用于判断完成条件）
    const effectiveQuestions = driver.value.getQuestions(student.value)

    // 初始化 metadata，保存起始索引和有效题目总数（用于进度计算和完成判断）
    state.value.metadata = {
      startIndex: startIndex,
      startStage: (driver.value as any).sortedQuestions?.[startIndex]?.age_stage,
      totalQuestions: effectiveQuestions.length  // 存储有效题目总数
    }

    // 5. 尝试恢复进度
    restoreProgress()

    // 6. 进入欢迎阶段
    phase.value = 'welcome'

  } catch (error) {
    console.error('[AssessmentContainer] 初始化失败:', error)
    ElMessage.error('评估初始化失败')
    router.back()
  }
}

// ========== 事件处理 ==========

function handleStartAssessment() {
  phase.value = 'assessing'
}

function handleAnswer(value: number | string) {
  if (!currentQuestion.value || !driver.value) return

  const question = currentQuestion.value
  const option = question.options.find(o => o.value === value)

  if (!option) {
    console.warn('[AssessmentContainer] 无效的答案选项:', value)
    return
  }

  // 检查是否是首次回答（用于区分新答案和修改答案）
  const previousAnswer = state.value.answers[question.id]
  const isModifying = previousAnswer !== undefined

  // 记录答案
  state.value.answers[question.id] = {
    questionId: question.id,
    value: value,
    score: option.score,
    timestamp: Date.now(),
    responseTime: Date.now() - (state.value.metadata?.lastAnswerTime || state.value.startTime)
  }

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

  // 延迟后自动导航
  setTimeout(() => {
    navigateToNext()
  }, 300)
}

function handlePrevious() {
  if (state.value.currentIndex > 0) {
    state.value.currentIndex--
  }
}

function handleNext() {
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
      break

    case 'jump':
      if (decision.targetIndex !== undefined) {
        state.value.currentIndex = decision.targetIndex
      } else if (decision.targetQuestionId !== undefined) {
        const idx = questions.value.findIndex(q => q.id === decision.targetQuestionId)
        if (idx >= 0) state.value.currentIndex = idx
      }
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
    ElMessage.error('保存评估结果失败')
  }
}

async function saveAssessmentToDatabase() {
  if (!student.value || !scoreResult.value || !driver.value) return

  const startTime = new Date(state.value.startTime).toISOString()
  const endTime = new Date(state.value.endTime || Date.now()).toISOString()

  // 根据量表类型选择保存方式
  if (scaleCode.value === 'sm') {
    await saveSMAssessment(startTime, endTime)
  } else {
    // 其他量表的保存逻辑（后续实现）
    await saveGenericAssessment(startTime, endTime)
  }
}

async function saveSMAssessment(startTime: string, endTime: string) {
  if (!student.value || !scoreResult.value) return

  const smApi = new SMAssessmentAPI()

  // 1. 创建评估主记录
  // 使用 metadata 中保存的起始阶段，或通过 driver 计算
  const startStage = state.value.metadata?.startStage ||
    (driver.value as any).sortedQuestions?.[state.value.currentIndex]?.age_stage || 1

  assessId.value = smApi.createAssessment({
    student_id: student.value.id,
    age_stage: startStage,
    raw_score: scoreResult.value.totalScore || 0,
    sq_score: scoreResult.value.standardScore || 10,
    level: scoreResult.value.level,
    start_time: startTime,
    end_time: endTime
  })

  // 2. 保存评估详情
  for (const [questionId, answer] of Object.entries(state.value.answers)) {
    smApi.saveAssessmentDetail({
      assess_id: assessId.value,
      question_id: parseInt(questionId),
      score: answer.score,
      answer_time: answer.responseTime || 0
    })
  }

  // 3. 创建报告记录
  const reportApi = new ReportAPI()
  reportApi.saveReportRecord({
    student_id: student.value.id,
    report_type: 'sm',
    assess_id: assessId.value,
    title: `${student.value.name} - S-M量表评估报告`
  })

  console.log('[AssessmentContainer] S-M 评估保存成功, ID:', assessId.value)
}

async function saveGenericAssessment(startTime: string, endTime: string) {
  if (!student.value || !scoreResult.value || !driver.value) return

  const scale = scaleCode.value

  if (scale === 'csirs') {
    await saveCSIRSAssessment(startTime, endTime)
  } else if (scale === 'weefim') {
    await saveWeeFIMAssessment(startTime, endTime)
  } else if (scale === 'conners-psq') {
    await saveConnersPSQAssessment(startTime, endTime)
  } else if (scale === 'conners-trs') {
    await saveConnersTRSAssessment(startTime, endTime)
  } else {
    console.warn(`[AssessmentContainer] 未实现的量表保存逻辑: ${scale}`)
  }
}

async function saveCSIRSAssessment(startTime: string, endTime: string) {
  if (!student.value || !scoreResult.value) return

  const csirsApi = new CSIRSAPI()

  // 从维度分数中提取各维度得分
  const dimensions = scoreResult.value.dimensions

  // 构建原始分和 T 分的 JSON 对象
  const rawScores: Record<string, number> = {}
  const tScores: Record<string, number> = {}

  for (const dim of dimensions) {
    rawScores[dim.code] = dim.rawScore || 0
    tScores[dim.code] = dim.standardScore || 50
  }

  // 1. 创建评估主记录（使用正确的表结构）
  assessId.value = csirsApi.execute(
    `INSERT INTO csirs_assess (
      student_id, age_months, raw_scores, t_scores, total_t_score, level, start_time, end_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.value.id,
      student.value.ageInMonths,
      JSON.stringify(rawScores),
      JSON.stringify(tScores),
      scoreResult.value.tScore || scoreResult.value.totalScore || 50,
      scoreResult.value.level,
      startTime,
      endTime
    ]
  )

  // 获取最后插入的 ID
  const result = csirsApi.queryOne('SELECT last_insert_rowid() as id')
  assessId.value = result?.id || 0

  // 2. 保存答题详情（直接执行 SQL，因为 API 方法缺少 dimension 字段）
  const questions = driver.value?.getQuestions(student.value) || []
  for (const [questionId, answer] of Object.entries(state.value.answers)) {
    const question = questions.find(q => q.id === parseInt(questionId))
    csirsApi.execute(
      `INSERT INTO csirs_assess_detail (assess_id, question_id, dimension, score, answer_time)
       VALUES (?, ?, ?, ?, ?)`,
      [
        assessId.value,
        parseInt(questionId),
        question?.dimension || '',
        answer.score,
        answer.responseTime || 0
      ]
    )
  }

  // 3. 创建报告记录
  const reportApi = new ReportAPI()
  reportApi.saveReportRecord({
    student_id: student.value.id,
    report_type: 'csirs',
    assess_id: assessId.value,
    title: `${student.value.name} - CSIRS感觉统合评估报告`
  })

  console.log('[AssessmentContainer] CSIRS 评估保存成功, ID:', assessId.value)
}

async function saveWeeFIMAssessment(startTime: string, endTime: string) {
  if (!student.value || !scoreResult.value) return

  const weefimApi = new WeeFIMAPI()

  // 从维度分数中提取各维度得分
  const dimensions = scoreResult.value.dimensions
  const getDimensionScore = (code: string): number => {
    const dim = dimensions.find(d => d.code === code)
    return dim?.rawScore || 0
  }

  // 1. 创建评估主记录
  assessId.value = weefimApi.createAssessment({
    student_id: student.value.id,
    total_score: scoreResult.value.totalScore || 0,
    adl_score: getDimensionScore('motor'),
    cognitive_score: getDimensionScore('cognitive'),
    level: scoreResult.value.level,
    start_time: startTime,
    end_time: endTime
  })

  // 2. 保存答题详情
  const details: Array<{ assess_id: number; question_id: number; score: number }> = []
  for (const [questionId, answer] of Object.entries(state.value.answers)) {
    details.push({
      assess_id: assessId.value,
      question_id: parseInt(questionId),
      score: answer.score
    })
  }
  weefimApi.saveAssessmentDetails(details)

  // 3. 创建报告记录
  const reportApi = new ReportAPI()
  reportApi.saveReportRecord({
    student_id: student.value.id,
    report_type: 'weefim',
    assess_id: assessId.value,
    title: `${student.value.name} - WeeFIM功能独立性评估报告`
  })

  console.log('[AssessmentContainer] WeeFIM 评估保存成功, ID:', assessId.value)
}

async function saveConnersPSQAssessment(startTime: string, endTime: string) {
  if (!student.value || !scoreResult.value) return

  const connersApi = new ConnersPSQAPI()

  // 从维度分数中提取各维度得分
  const dimensions = scoreResult.value.dimensions

  // 构建原始分、维度分数和 T 分的 JSON 对象
  const rawScores: Record<string, number> = {}
  const dimensionScores: Record<string, { rawScore: number; isValid: boolean; missingCount: number }> = {}
  const tScores: Record<string, number> = {}

  for (const dim of dimensions) {
    rawScores[dim.code] = dim.rawScore || 0
    tScores[dim.code] = dim.standardScore || 50
    dimensionScores[dim.code] = {
      rawScore: dim.rawScore || 0,
      isValid: true,
      missingCount: 0
    }
  }

  // 1. 创建评估主记录
  // 注意：1978版不包含 PI/NI 效度检查，设置为默认值
  assessId.value = connersApi.createAssessment({
    student_id: student.value.id,
    gender: student.value.gender,
    age_months: student.value.ageInMonths,
    raw_scores: JSON.stringify(rawScores),
    dimension_scores: JSON.stringify(dimensionScores),
    t_scores: JSON.stringify(tScores),
    pi_score: 0,  // 1978版不使用
    ni_score: 0,  // 1978版不使用
    is_valid: 1,  // 默认有效
    hyperactivity_index: tScores['hyperactivity_index'] || 50,
    level: scoreResult.value.levelCode || 'normal',
    start_time: startTime,
    end_time: endTime
  })

  // 2. 创建报告记录
  const reportApi = new ReportAPI()
  reportApi.saveReportRecord({
    student_id: student.value.id,
    report_type: 'conners-psq',
    assess_id: assessId.value,
    title: `${student.value.name} - Conners父母问卷评估报告`
  })

  console.log('[AssessmentContainer] Conners PSQ 评估保存成功, ID:', assessId.value)
}

async function saveConnersTRSAssessment(startTime: string, endTime: string) {
  if (!student.value || !scoreResult.value) return

  const connersApi = new ConnersTRSAPI()

  // 从维度分数中提取各维度得分
  const dimensions = scoreResult.value.dimensions

  // 构建原始分、维度分数和 T 分的 JSON 对象
  const rawScores: Record<string, number> = {}
  const dimensionScores: Record<string, { rawScore: number; isValid: boolean; missingCount: number }> = {}
  const tScores: Record<string, number> = {}

  for (const dim of dimensions) {
    rawScores[dim.code] = dim.rawScore || 0
    tScores[dim.code] = dim.standardScore || 50
    dimensionScores[dim.code] = {
      rawScore: dim.rawScore || 0,
      isValid: true,
      missingCount: 0
    }
  }

  // 1. 创建评估主记录
  // 注意：1978版不包含 PI/NI 效度检查，设置为默认值
  assessId.value = connersApi.createAssessment({
    student_id: student.value.id,
    gender: student.value.gender,
    age_months: student.value.ageInMonths,
    raw_scores: JSON.stringify(rawScores),
    dimension_scores: JSON.stringify(dimensionScores),
    t_scores: JSON.stringify(tScores),
    pi_score: 0,  // 1978版不使用
    ni_score: 0,  // 1978版不使用
    is_valid: 1,  // 默认有效
    hyperactivity_index: tScores['hyperactivity_index'] || 50,
    level: scoreResult.value.levelCode || 'normal',
    start_time: startTime,
    end_time: endTime
  })

  // 2. 创建报告记录
  const reportApi = new ReportAPI()
  reportApi.saveReportRecord({
    student_id: student.value.id,
    report_type: 'conners-trs',
    assess_id: assessId.value,
    title: `${student.value.name} - Conners教师问卷评估报告`
  })

  console.log('[AssessmentContainer] Conners TRS 评估保存成功, ID:', assessId.value)
}

// ========== 导航处理 ==========

function handleViewReport() {
  // 不同量表使用不同的路由格式
  if (scaleCode.value === 'sm' || scaleCode.value === 'weefim') {
    // SM 和 WeeFIM 使用 query 参数
    router.push({
      path: `/assessment/${scaleCode.value}/report`,
      query: {
        assessId: assessId.value?.toString(),
        studentId: student.value?.id?.toString()
      }
    })
  } else {
    // CSIRS 和 Conners 使用路径参数
    router.push(`/assessment/${scaleCode.value}/report/${assessId.value}`)
  }
}

function handleExit() {
  router.push('/assessment')
}

function progressFormat(percentage: number): string {
  return `${percentage}%`
}

// ========== 进度持久化 ==========

const PROGRESS_KEY = 'assessment_progress'

function getProgressKey(): string {
  return `${PROGRESS_KEY}_${scaleCode.value}_${studentId.value}`
}

function saveProgress() {
  try {
    const data = {
      currentIndex: state.value.currentIndex,
      answers: state.value.answers,
      startTime: state.value.startTime,
      metadata: state.value.metadata
    }
    localStorage.setItem(getProgressKey(), JSON.stringify(data))
  } catch (e) {
    console.warn('[AssessmentContainer] 保存进度失败:', e)
  }
}

function restoreProgress() {
  try {
    const saved = localStorage.getItem(getProgressKey())
    if (saved) {
      const data = JSON.parse(saved)
      // 恢复进度（可选，需要用户确认）
      // 这里暂时不自动恢复，后续可以添加确认对话框
      console.log('[AssessmentContainer] 发现已保存的进度')
    }
  } catch (e) {
    console.warn('[AssessmentContainer] 恢复进度失败:', e)
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(getProgressKey())
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
  // 如果评估未完成，提示用户
  if (phase.value === 'assessing' && !state.value.isComplete) {
    // 保存进度
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
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.assessment-header {
  margin-bottom: 20px;
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
</style>
