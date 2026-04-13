<!--
  @deprecated
  此文件已废弃，请使用统一的评估容器 AssessmentContainer.vue

  新路由: /assessment/unified/csirs/:studentId
  驱动器: src/strategies/assessment/CSIRSDriver.ts

  Phase 4 重构：评估模块已迁移到"UI 容器复用 + 策略驱动器"架构。
  此文件仅作为历史参考保留，不应再被路由引用。

  迁移日期: 2026-02-24
-->
<!-- src/views/assessment/csirs/Assessment.vue -->
<template>
  <div class="csirs-assessment">
    <!-- 欢迎对话框 -->
    <el-dialog
      v-model="showWelcomeDialog"
      title=""
      width="580px"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="welcome-dialog"
      draggable
    >
      <div class="welcome-content">
        <h2>儿童感觉统合能力发展评定量表 (CSIRS)</h2>
        <p class="welcome-intro">本量表用于评估3-12岁儿童的感觉统合能力发展状况，包括前庭觉、触觉、本体感、学习能力和执行功能五个维度。</p>

        <div class="welcome-sections">
          <div class="welcome-section">
            <h4><span class="section-icon">📋</span> 评分说明</h4>
            <p>请根据孩子<strong>最近一个月</strong>的实际表现进行评分：</p>
            <ul>
              <li><strong>A (5分)</strong> - 从不：从来没有这种情况</li>
              <li><strong>B (4分)</strong> - 很少：偶尔出现（每月1-2次）</li>
              <li><strong>C (3分)</strong> - 有时候：有时出现（每周1-2次）</li>
              <li><strong>D (2分)</strong> - 常常：经常出现（每天都会）</li>
              <li><strong>E (1分)</strong> - 总是：每次都这样</li>
            </ul>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">⏱️</span> 评估时间</h4>
            <p>约15-20分钟，请确保在安静、无干扰的环境下进行评估。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">👨‍👩‍👧</span> 评估人</h4>
            <p>建议由最了解孩子的家长或主要照顾者填写。</p>
          </div>
        </div>

        <p class="welcome-footer">请根据孩子的实际情况真实填写，感谢您的配合！</p>
      </div>
      <template #footer>
        <el-button type="primary" size="large" @click="startAssessment">
          我已了解，开始评估
        </el-button>
      </template>
    </el-dialog>

    <!-- 评估头部 -->
    <el-card class="assessment-header">
      <div class="header-content">
        <div class="student-info">
          <h3>CSIRS感觉统合评估</h3>
          <div class="info-row">
            <span>学生：{{ student?.name }}</span>
            <span>年龄：{{ studentAge }}岁</span>
            <span>题目：{{ filteredQuestions.length }}题</span>
            <span v-if="currentDimension">当前维度：{{ currentDimension }}</span>
          </div>
        </div>
        <div class="progress-info">
          <el-progress
            :percentage="progressPercentage"
            :format="progressFormat"
            :stroke-width="20"
          />
          <div class="progress-text">
            已完成：{{ currentIndex + 1 }} / {{ filteredQuestions.length }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 题目卡片 -->
    <el-card class="question-card" v-if="currentQuestion">
      <div class="question-header">
        <span class="question-number">第 {{ currentIndex + 1 }} 题</span>
        <span class="question-dimension">{{ currentQuestion.dimension }}</span>
      </div>

      <div class="question-content">
        <div class="question-title">
          {{ currentQuestion.title }}
        </div>

        <!-- 语音播放按钮 -->
        <div class="question-actions">
          <el-button
            type="info"
            :icon="Microphone"
            @click="playAudio"
            :loading="isPlaying"
          >
            {{ isPlaying ? '播放中...' : '朗读题目' }}
          </el-button>
        </div>

        <!-- 答案选项 -->
        <div class="answer-options">
          <el-radio-group v-model="currentAnswer" @change="handleAnswer">
            <el-radio-button
              v-for="option in answerOptions"
              :key="option.value"
              :value="option.value"
              class="answer-option"
            >
              <span class="option-label">{{ option.label }}</span>
              <span class="option-desc">{{ option.desc }}</span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 导航按钮 -->
      <div class="question-nav">
        <el-button
          :disabled="currentIndex === 0"
          @click="previousQuestion"
          size="large"
        >
          上一题
        </el-button>
        <el-button
          type="primary"
          :disabled="!currentAnswer"
          @click="nextQuestion"
          size="large"
        >
          {{ isLastQuestion ? '完成评估' : '下一题' }}
        </el-button>
      </div>
    </el-card>

    <!-- 完成确认对话框 -->
    <el-dialog
      v-model="showConfirmDialog"
      title="确认完成"
      width="400px"
    >
      <p>您已完成所有题目，是否提交评估结果？</p>
      <template #footer>
        <el-button @click="showConfirmDialog = false">返回检查</el-button>
        <el-button type="primary" @click="submitAssessment">提交评估</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Microphone } from '@element-plus/icons-vue'
import { csirsQuestions, getQuestionsByAge } from '@/database/csirs-questions'
import { calculateTScore, getEvaluationLevel } from '@/database/csirs-conversion'
import type { CSIRSDimensionType } from '@/types/csirs'
import { getDatabase } from '@/database/init'
import { ReportAPI } from '@/database/api'
import type { CSIRSQuestion, CSIRSAnswer } from '@/types/csirs'

const router = useRouter()
const route = useRoute()
const db = getDatabase()

// 状态
const showWelcomeDialog = ref(true)
const showConfirmDialog = ref(false)
const student = ref<any>(null)
const currentIndex = ref(0)
const answers = ref<CSIRSAnswer[]>([])
const currentAnswer = ref<number | null>(null)
const isPlaying = ref(false)
const startTime = ref(Date.now())
const assessId = ref<number | null>(null)

// 答案选项
const answerOptions = [
  { value: 5, label: 'A', desc: '从不' },
  { value: 4, label: 'B', desc: '很少' },
  { value: 3, label: 'C', desc: '有时候' },
  { value: 2, label: 'D', desc: '常常' },
  { value: 1, label: 'E', desc: '总是' }
]

// 计算学生月龄（从生日计算）
const studentAgeMonths = computed(() => {
  if (!student.value?.birthday) return 0
  const birth = new Date(student.value.birthday)
  const today = new Date()
  const months = (today.getFullYear() - birth.getFullYear()) * 12 +
    (today.getMonth() - birth.getMonth())
  // 如果当月日期还没到，减1个月
  if (today.getDate() < birth.getDate()) {
    return Math.max(0, months - 1)
  }
  return Math.max(0, months)
})

// 根据年龄筛选题目
const filteredQuestions = computed(() => {
  if (!student.value) return []
  return getQuestionsByAge(studentAgeMonths.value)
})

// 当前题目
const currentQuestion = computed(() => {
  return filteredQuestions.value[currentIndex.value]
})

// 当前维度
const currentDimension = computed(() => {
  return currentQuestion.value?.dimension
})

// 进度
const progressPercentage = computed(() => {
  if (filteredQuestions.value.length === 0) return 0
  return ((currentIndex.value + 1) / filteredQuestions.value.length) * 100
})

// 学生年龄（岁）
const studentAge = computed(() => {
  return Math.floor(studentAgeMonths.value / 12)
})

// 是否最后一题
const isLastQuestion = computed(() => {
  return currentIndex.value === filteredQuestions.value.length - 1
})

// 进度格式
const progressFormat = (percentage: number) => {
  return `${Math.round(percentage)}%`
}

// 开始评估
const startAssessment = () => {
  showWelcomeDialog.value = false
  startTime.value = Date.now()
}

// 播放语音
const playAudio = () => {
  if (!currentQuestion.value) return

  // Cancel any ongoing speech
  speechSynthesis.cancel()

  isPlaying.value = true
  const utterance = new SpeechSynthesisUtterance(currentQuestion.value.title)
  utterance.lang = 'zh-CN'
  utterance.onend = () => {
    if (isPlaying.value) {
      isPlaying.value = false
    }
  }
  speechSynthesis.speak(utterance)
}

// 处理答案
const handleAnswer = () => {
  if (!currentQuestion.value) {
    console.error('No current question')
    return
  }
  const answerTime = Date.now() - startTime.value
  answers.value.push({
    question_id: currentQuestion.value.id,
    score: currentAnswer.value!,
    answer_time: answerTime
  })
  // 自动进入下一题
  setTimeout(() => {
    nextQuestion()
  }, 300)
}

// 下一题
const nextQuestion = () => {
  if (isLastQuestion.value) {
    showConfirmDialog.value = true
  } else {
    currentIndex.value++
    currentAnswer.value = null
    startTime.value = Date.now()
  }
}

// 上一题
const previousQuestion = () => {
  if (currentIndex.value > 0) {
    // 移除最后一题的答案
    answers.value.pop()
    currentIndex.value--
    // 恢复上一题的答案
    const currentQuestion = filteredQuestions.value[currentIndex.value]
    const lastAnswer = currentQuestion ? answers.value.find(a => a.question_id === currentQuestion.id) : undefined
    currentAnswer.value = lastAnswer?.score || null
  }
}

// 提交评估
const submitAssessment = () => {
  try {
    const ageYears = studentAge.value
    const ageMonths = studentAgeMonths.value

    // 计算各维度原始分
    const dimensionScores: Record<string, number[]> = {}

    for (const answer of answers.value) {
      const question = csirsQuestions.find(q => q.id === answer.question_id)
      if (question) {
        if (!dimensionScores[question.dimension_en]) {
          dimensionScores[question.dimension_en] = []
        }
        const dimensionBucket = dimensionScores[question.dimension_en]
        if (dimensionBucket) {
          dimensionBucket.push(answer.score)
        }
      }
    }

    // 计算原始分总和（包含所有维度，包括executive）
    const rawScores: Record<string, number> = {}
    const tScores: Record<string, number> = {}

    for (const [dimension, scores] of Object.entries(dimensionScores)) {
      rawScores[dimension] = scores.reduce((sum, score) => sum + score, 0)

      // 只有非executive维度才有T分转换表
      if (dimension !== 'executive') {
        tScores[dimension] = calculateTScore(rawScores[dimension], ageYears, dimension as CSIRSDimensionType)
      }
    }

    // 计算总T分（只计算有转换表的维度，排除executive）
    const tScoresForTotal = Object.entries(tScores).filter(([dim]) => dim !== 'executive')
    const totalTScore = tScoresForTotal.reduce((sum, [, score]) => sum + score, 0) / tScoresForTotal.length

    // 获取等级
    const level = getEvaluationLevel(totalTScore)

    // 计算Flags预警标记
    const flags: string[] = []

    // LD_RISK: learning维度T分 < 40
    if (tScores['learning'] && tScores['learning'] < 40) {
      flags.push('LD_RISK')
    }

    // EXECUTIVE_DEFICIT: executive维度得分 < 40 且 age >= 10
    // executive维度3题满分15分，转换为百分制：原始分/15*100
    if (ageYears >= 10 && rawScores['executive']) {
      const executivePercent = (rawScores['executive'] / 15) * 100
      if (executivePercent < 40) {
        flags.push('EXECUTIVE_DEFICIT')
      }
    }

    // 创建评估记录
    const result = db.run(`
      INSERT INTO csirs_assess (student_id, age_months, raw_scores, t_scores, total_t_score, level, flags, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      student.value.id,
      ageMonths,
      JSON.stringify(rawScores),
      JSON.stringify(tScores),
      totalTScore,
      level.level,
      flags.length > 0 ? JSON.stringify(flags) : null,
      new Date(startTime.value).toISOString(),
      new Date().toISOString()
    ])

    assessId.value = db.lastInsertId()

    // 插入详情记录
    for (const answer of answers.value) {
      const question = csirsQuestions.find(q => q.id === answer.question_id)
      db.run(`
        INSERT INTO csirs_assess_detail (assess_id, question_id, dimension, score, answer_time)
        VALUES (?, ?, ?, ?, ?)
      `, [assessId.value, answer.question_id, question?.dimension || '', answer.score, answer.answer_time || 0])
    }

    // 创建报告记录
    try {
      const reportAPI = new ReportAPI()
      const title = `CSIRS感觉统合评估报告_${student.value.name}_${new Date().toLocaleDateString()}`
      reportAPI.saveReportRecord({
        student_id: student.value.id,
        report_type: 'csirs',
        assess_id: assessId.value ?? undefined,
        title
      })
    } catch (error) {
      console.error('创建报告记录失败:', error)
      // 不影响评估提交流程，仅记录错误
    }

    ElMessage.success('评估完成！')

    // 跳转到报告页面
    router.push(`/assessment/csirs/report/${assessId.value}`)
  } catch (error) {
    console.error('提交评估失败:', error)
    ElMessage.error('提交评估失败，请重试')
  }
}

// 获取学生信息
onMounted(async () => {
  const studentIdParam = route.params.studentId || route.query.studentId
  const studentId = Array.isArray(studentIdParam)
    ? studentIdParam[0]
    : studentIdParam

  if (studentId && typeof studentId === 'string') {
    const studentIdNum = parseInt(studentId, 10)
    if (!isNaN(studentIdNum)) {
      const result = db.get('SELECT * FROM student WHERE id = ?', [studentIdNum])
      if (!result) {
        ElMessage.error('学生不存在')
        router.push('/assessment/select-student')
        return
      }
      student.value = result
    }
  } else {
    ElMessage.error('无效的学生ID')
    router.push('/assessment/select-student')
  }
})

onUnmounted(() => {
  speechSynthesis.cancel()
})
</script>

<style scoped>
.csirs-assessment {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.welcome-content h2 {
  text-align: center;
  color: #409EFF;
  margin-bottom: 20px;
}

.welcome-intro {
  text-align: center;
  color: #606266;
  margin-bottom: 30px;
}

.welcome-sections {
  margin: 30px 0;
}

.welcome-section {
  margin-bottom: 25px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.welcome-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.section-icon {
  margin-right: 8px;
}

.welcome-section ul {
  margin: 10px 0;
  padding-left: 20px;
}

.welcome-section li {
  margin: 8px 0;
  color: #606266;
}

.welcome-footer {
  text-align: center;
  color: #909399;
  margin-top: 20px;
}

.assessment-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.student-info h3 {
  margin: 0 0 10px 0;
}

.info-row span {
  margin-right: 20px;
  color: #606266;
}

.progress-info {
  flex: 1;
  min-width: 300px;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  color: #909399;
}

.question-card {
  min-height: 400px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.question-number {
  font-size: 18px;
  font-weight: bold;
  color: #409EFF;
}

.question-dimension {
  padding: 4px 12px;
  background: #ecf5ff;
  color: #409EFF;
  border-radius: 4px;
  font-size: 14px;
}

.question-content {
  margin: 30px 0;
}

.question-title {
  font-size: 20px;
  line-height: 1.8;
  color: #303133;
  margin-bottom: 30px;
}

.question-actions {
  margin-bottom: 30px;
}

.answer-options {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.answer-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.option-label {
  font-size: 18px;
  font-weight: bold;
}

.option-desc {
  font-size: 12px;
  color: #909399;
}

.question-nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}
</style>
