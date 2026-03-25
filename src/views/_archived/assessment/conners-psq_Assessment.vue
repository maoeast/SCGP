<!--
  @deprecated
  此文件已废弃，请使用统一的评估容器 AssessmentContainer.vue

  新路由: /assessment/unified/conners-psq/:studentId
  驱动器: src/strategies/assessment/ConnersPSQDriver.ts

  Phase 4 重构：评估模块已迁移到"UI 容器复用 + 策略驱动器"架构。
  此文件仅作为历史参考保留，不应再被路由引用。

  迁移日期: 2026-02-24
-->
<!-- src/views/assessment/conners-psq/Assessment.vue -->
<template>
  <div class="conners-psq-assessment">
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
        <h2>Conners 父母用问卷 (PSQ)</h2>
        <p class="welcome-intro">本问卷用于评估3-17岁儿童的行为表现，由父母根据孩子最近6个月在家中的情况填写。共48题，包含品行问题、学习问题、冲动性、焦虑和多动指数五个维度。</p>

        <div class="welcome-sections">
          <div class="welcome-section">
            <h4><span class="section-icon">📋</span> 评分说明</h4>
            <p>请根据孩子<strong>最近6个月</strong>在家中的实际表现进行评分：</p>
            <ul>
              <li><strong>A (0分)</strong> - 无：完全没有这种情况</li>
              <li><strong>B (1分)</strong> - 稍有：偶尔出现，程度轻微</li>
              <li><strong>C (2分)</strong> - 相当多：经常出现，程度中等</li>
              <li><strong>D (3分)</strong> - 很多：频繁出现，程度严重</li>
            </ul>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">⏱️</span> 评估时间</h4>
            <p>约10-15分钟，请确保在安静、无干扰的环境下进行评估。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">👨‍👩‍👧</span> 评估人</h4>
            <p>建议由最了解孩子的父母或主要照顾者填写。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">💡</span> 温馨提示</h4>
            <p>请根据孩子的实际情况真实填写，不要过分担忧或刻意美化。如果遇到不确定的题目，可以根据您的整体印象作答。</p>
          </div>
        </div>

        <p class="welcome-footer">感谢您的配合，这将帮助我们更好地了解和帮助孩子！</p>
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
          <h3>Conners 父母问卷评估 (PSQ)</h3>
          <div class="info-row">
            <span>学生：{{ student?.name }}</span>
            <span>性别：{{ student?.gender }}</span>
            <span>年龄：{{ studentAge }}岁</span>
            <span>题目：48题</span>
            <span v-if="currentDimension">当前维度：{{ getDimensionName(currentDimension) }}</span>
          </div>
        </div>
        <div class="progress-info">
          <el-progress
            :percentage="progressPercentage"
            :format="progressFormat"
            :stroke-width="20"
          />
          <div class="progress-text">
            已完成：{{ currentIndex + 1 }} / 48
          </div>
        </div>
      </div>
    </el-card>

    <!-- 题目卡片 -->
    <el-card class="question-card" v-if="currentQuestion">
      <div class="question-header">
        <span class="question-number">第 {{ currentIndex + 1 }} 题</span>
        <span class="question-dimension">{{ getDimensionName(currentQuestion.dimension) }}</span>
      </div>

      <div class="question-content">
        <div class="question-title">
          {{ currentQuestion.content }}
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
              :label="option.value"
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
          :disabled="!currentAnswer && currentAnswer !== 0"
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
import { connorsPSQQuestions, type ConnersPSQQuestion } from '@/database/conners-psq-questions'
import { calculateConnersScores } from '@/database/conners-scoring'
import { ConnersPSQAPI, ReportAPI } from '@/database/api'
import { getDatabase } from '@/database/init'
import type { ConnersAnswer } from '@/types/conners'

const router = useRouter()
const route = useRoute()
const db = getDatabase()
const psqAPI = new ConnersPSQAPI()

// 状态
const showWelcomeDialog = ref(true)
const showConfirmDialog = ref(false)
const student = ref<any>(null)
const currentIndex = ref(0)
const answers = ref<ConnersAnswer[]>([])
const currentAnswer = ref<number | null>(null)
const isPlaying = ref(false)
const startTime = ref(Date.now())
const assessId = ref<number | null>(null)

// 维度名称映射
const dimensionNames: Record<string, string> = {
  conduct: '品行问题',
  learning: '学习问题',
  psychosomatic: '心身障碍',
  impulsivity_hyperactivity: '冲动性',
  anxiety: '焦虑',
  hyperactivity_index: '多动指数'
}

// 答案选项 (0-3分: A.无, B.稍有, C.相当多, D.很多)
const answerOptions = [
  { value: 0, label: 'A', desc: '无' },
  { value: 1, label: 'B', desc: '稍有' },
  { value: 2, label: 'C', desc: '相当多' },
  { value: 3, label: 'D', desc: '很多' }
]

// 题目列表
const questions = connorsPSQQuestions

// 当前题目
const currentQuestion = computed(() => {
  return questions[currentIndex.value]
})

// 当前维度
const currentDimension = computed(() => {
  return currentQuestion.value?.dimension
})

// 进度
const progressPercentage = computed(() => {
  return ((currentIndex.value + 1) / questions.length) * 100
})

// 学生月龄（从生日计算）
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

// 学生年龄（岁）
const studentAge = computed(() => {
  return Math.floor(studentAgeMonths.value / 12)
})

// 是否最后一题
const isLastQuestion = computed(() => {
  return currentIndex.value === questions.length - 1
})

// 进度格式
const progressFormat = (percentage: number) => {
  return `${Math.round(percentage)}%`
}

// 获取维度名称
const getDimensionName = (dimension: string) => {
  return dimensionNames[dimension] || dimension
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
  const utterance = new SpeechSynthesisUtterance(currentQuestion.value.content)
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
    const currentQuestion = questions[currentIndex.value]
    const lastAnswer = currentQuestion ? answers.value.find(a => a.question_id === currentQuestion.id) : undefined
    currentAnswer.value = lastAnswer?.score ?? null
  }
}

// 提交评估
const submitAssessment = async () => {
  try {
    const ageMonths = studentAgeMonths.value

    // 构建答案对象用于评分
    const answersMap: Record<number, number | null> = {}
    for (const answer of answers.value) {
      answersMap[answer.question_id] = answer.score
    }

    // 计算分数
    const scoreResult = await calculateConnersScores(
      answersMap,
      {
        gender: student.value.gender,
        birthday: student.value.birthday
      },
      'psq'
    )

    // 提取原始分和维度分数
    const rawScores: Record<string, number> = {}
    const dimensionScores: Record<string, any> = {}

    for (const [dim, result] of Object.entries(scoreResult.dimensionScores)) {
      rawScores[dim] = result.rawScore
      dimensionScores[dim] = result
    }

    // 创建评估记录
    // 确保 hyperactivity_index 从 tScores 中获取
    const hyperIndexT = scoreResult.tScores.hyperactivity_index ?? 0

    const resultId = psqAPI.createAssessment({
      student_id: student.value.id,
      gender: student.value.gender,
      age_months: ageMonths,
      raw_scores: JSON.stringify(rawScores),
      dimension_scores: JSON.stringify(dimensionScores),
      t_scores: JSON.stringify(scoreResult.tScores),
      pi_score: 0,  // 1978年修订版无PI效度题
      ni_score: 0,  // 1978年修订版无NI效度题
      is_valid: 1,
      invalid_reason: undefined,
      hyperactivity_index: hyperIndexT,
      level: scoreResult.level,
      start_time: new Date(startTime.value).toISOString(),
      end_time: new Date().toISOString()
    })

    assessId.value = resultId

    // 创建报告记录
    try {
      const reportAPI = new ReportAPI()
      const title = `Conners父母问卷报告(PSQ)_${student.value.name}_${new Date().toLocaleDateString()}`
      reportAPI.saveReportRecord({
        student_id: student.value.id,
        report_type: 'conners-psq',
        assess_id: resultId,
        title
      })
    } catch (error) {
      console.error('创建报告记录失败:', error)
      // 不影响评估提交流程，仅记录错误
    }

    ElMessage.success('评估完成！')

    // 跳转到报告页面
    router.push(`/assessment/conners-psq/report/${assessId.value}`)
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
      // 验证必需字段
      if (!result.gender) {
        ElMessage.error('学生信息不完整：缺少性别信息')
        router.push('/assessment/select-student')
        return
      }
      if (!result.birthday) {
        ElMessage.error('学生信息不完整：缺少生日信息')
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
.conners-psq-assessment {
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
  line-height: 1.8;
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
