<!--
  @deprecated
  此文件已废弃，请使用统一的评估容器 AssessmentContainer.vue

  新路由: /assessment/unified/weefim/:studentId
  驱动器: src/strategies/assessment/WeeFIMDriver.ts

  Phase 4 重构：评估模块已迁移到"UI 容器复用 + 策略驱动器"架构。
  此文件仅作为历史参考保留，不应再被路由引用。

  迁移日期: 2026-02-24
-->
<template>
  <div class="weefim-assessment">
    <!-- 温馨提示对话框 -->
    <el-dialog
      v-model="showWelcomeDialog"
      title=""
      width="520px"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="welcome-dialog"
      draggable
    >
      <div class="welcome-content">
        <p class="welcome-intro">欢迎开始这次关于"独立"的探索。WeeFIM 不仅仅是一个分数，它是一张帮助我们理解孩子如何迈向独立的地图。</p>

        <div class="welcome-sections">
          <div class="welcome-section">
            <h4><span class="section-icon">🎯</span> 关注"能做什么"，而非"不能做什么"</h4>
            <p>WeeFIM 评估的是孩子在日常生活中"实际上能做什么"，而不是"在理想条件下应该能做什么"。请记录孩子真实的独立表现。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">⏱️</span> 时间与安全是关键</h4>
            <p>评估时请考虑：孩子完成这项活动需要多长时间？是否需要他人监督或辅助？安全吗？这些都是衡量独立性的重要指标。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">👁️</span> 常规环境中的表现</h4>
            <p>请基于孩子在家庭、学校等日常环境中的常规表现来评估，而非在治疗或训练时的特殊表现。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">🔒</span> 隐私保护</h4>
            <p>所有评估数据将严格保密，仅用于支持孩子的成长和制定个性化训练计划。</p>
          </div>
        </div>

        <p class="welcome-footer">让我们携手，发现孩子迈向独立的每一步！</p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="success" @click="startAssessment">
            我已了解，开始评估
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 评估头部 -->
    <el-card class="assessment-header">
      <template #header>
        <div class="header-content">
          <div class="student-info">
            <h3>WeeFIM量表评估</h3>
            <div class="info-row">
              <span>学生：{{ student?.name }}</span>
              <span>年龄：{{ studentAge }}岁</span>
            </div>
          </div>
          <div class="progress-info">
            <el-progress
              :percentage="progressPercentage"
              :format="progressFormat"
              :stroke-width="20"
            />
            <div class="progress-text">
              已完成：{{ currentIndex + 1 }} / {{ totalQuestions }}
            </div>
          </div>
        </div>
      </template>
    </el-card>

    <!-- 题目卡片 -->
    <el-card class="question-card" v-if="currentQuestion">
      <template #header>
        <div class="question-header">
          <span class="question-number">第 {{ currentIndex + 1 }} 题</span>
          <span class="question-category">{{ getCategoryName(currentQuestion.category_id) }}</span>
        </div>
      </template>

      <div class="question-content">
        <div class="question-title">
          {{ currentQuestionIndex }}. {{ currentQuestion.title }}
        </div>

        <!-- 评分标准 -->
        <div class="score-guide" v-if="currentScoringCriteria">
          <h4>评分标准：</h4>
          <div class="scoring-criteria">
            <div
              v-for="criteria in currentScoringCriteria.criteria"
              :key="criteria.score"
              class="criteria-item"
              :class="{ 'selected': currentAnswer === criteria.score }"
              @click="selectScore(criteria.score)"
            >
              <div class="criteria-header">
                <span class="criteria-score">{{ criteria.score }}分</span>
              </div>
              <div class="criteria-content">
                {{ criteria.description }}
              </div>
            </div>
          </div>
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
      </div>

      <!-- 操作按钮 -->
      <div class="question-footer">
        <el-button
          :disabled="currentIndex === 0"
          @click="previousQuestion"
        >
          上一题
        </el-button>
        <div class="question-info">
          第 {{ currentQuestionIndex }} 题 / 共 {{ totalQuestions }} 题
        </div>
      </div>
    </el-card>

    <!-- 评估完成对话框 -->
    <el-dialog
      v-model="showCompleteDialog"
      title="评估完成"
      width="500px"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="complete-content" v-if="assessmentResult">
        <el-icon class="success-icon" color="#67C23A" size="60"><CircleCheck /></el-icon>
        <h3>评估已完成！</h3>
        <div class="result-summary">
          <div class="result-item">
            <span class="label">总分：</span>
            <span class="score">{{ assessmentResult.total_score }}/126</span>
          </div>
          <div class="result-item">
            <span class="label">运动功能：</span>
            <span class="score">{{ assessmentResult.motor_score }}/91</span>
          </div>
          <div class="result-item">
            <span class="label">认知功能：</span>
            <span class="score">{{ assessmentResult.cognitive_score }}/35</span>
          </div>
          <div class="result-item">
            <span class="label">独立性等级：</span>
            <span class="level" :class="getLevelClass(assessmentResult.level?.level)">
              {{ assessmentResult.level?.level }}
            </span>
          </div>
        </div>
      </div>
      <div class="complete-content" v-else>
        <el-icon class="success-icon" color="#67C23A" size="60"><CircleCheck /></el-icon>
        <h3>评估已完成！</h3>
        <p>系统正在计算评估结果...</p>
      </div>
      <template #footer>
        <el-button @click="saveAndExit">保存并退出</el-button>
        <el-button type="primary" @click="viewReport">查看报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Microphone,
  CircleCheck,
  SuccessFilled
} from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { WeeFIMAPI, ReportAPI } from '@/database/api'
// 响应式量表数据
const weefimQuestions = ref<any[]>([])
const weefimCategories = ref<any[]>([])
const calculateWeeFIMScores = ref<any>(null)

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()

// 温馨提示对话框
const showWelcomeDialog = ref(true)

// 学生信息
const studentId = ref(route.query.studentId as string)
const student = computed(() =>
  studentStore.students.find(s => s.id === parseInt(studentId.value))
)

// 学生年龄
const studentAge = computed(() => {
  if (!student.value?.birthday) return 0
  const birth = new Date(student.value.birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
})

// 题目相关状态
const currentIndex = ref(0)
const totalQuestions = computed(() => weefimQuestions.value.length)
const currentQuestion = computed(() => weefimQuestions.value[currentIndex.value])
const progressPercentage = computed(() => {
  if (totalQuestions.value === 0) return 0
  return Math.round(((currentIndex.value + 1) / totalQuestions.value) * 100)
})

// 答案存储
const answers = ref<Record<number, number>>({})
const currentAnswer = ref<number | null>(null)

// 语音播放状态
const isPlaying = ref(false)
let speechSynthesis: SpeechSynthesis | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

// 完成对话框
const showCompleteDialog = ref(false)
const assessId = ref<number | null>(null)
const assessmentResult = ref<any>(null)

// 评分标准
const weefimScoringCriteria = ref<any[]>([])
const currentScoringCriteria = computed(() => {
  if (!currentQuestion.value || !weefimScoringCriteria.value.length) return null
  return weefimScoringCriteria.value.find(criteria => criteria.id === currentQuestion.value.id)
})

// 题目索引（从1开始）
const currentQuestionIndex = computed(() => currentIndex.value + 1)

// 进度格式化
const progressFormat = (percentage: number) => `${percentage}%`

// 获取等级样式类
const getLevelClass = (level: string) => {
  const classMap: Record<string, string> = {
    '完全独立': 'level-complete',
    '基本独立': 'level-basic',
    '轻度依赖': 'level-mild',
    '中度依赖': 'level-moderate',
    '重度依赖': 'level-severe',
    '极重度依赖': 'level-extreme',
    '完全依赖': 'level-total'
  }
  return classMap[level] || ''
}

// 获取分类名称
const getCategoryName = (categoryId: number) => {
  const category = weefimCategories.value.find(c => c.id === categoryId)
  return category ? category.name : ''
}

// 获取分数描述
const getScoreDescription = (score: number) => {
  const descriptions: Record<number, string> = {
    7: '完全独立',
    6: '基本独立',
    5: '需要监督',
    4: '最小依赖',
    3: '中度依赖',
    2: '最大依赖',
    1: '完全依赖'
  }
  return descriptions[score] || ''
}

// 选择评分
const selectScore = async (score: number) => {
  currentAnswer.value = score
  if (currentQuestion.value) {
    answers.value[currentQuestion.value.id] = score
    // 保存答案到本地存储（支持断点续做）
    saveProgress()

    // 自动进入下一题
    await nextQuestion()
  }
}

// 处理答案（保留兼容性）
const handleAnswer = (value: number) => {
  selectScore(value)
}

// 上一题
const previousQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    // 恢复上一题的答案
    currentAnswer.value = answers.value[currentQuestion.value?.id] || null
  }
}

// 下一题
const nextQuestion = async () => {
  if (currentIndex.value < totalQuestions.value - 1) {
    currentIndex.value++
    currentAnswer.value = answers.value[currentQuestion.value?.id] || null
  } else {
    // 完成评估
    await completeAssessment()
  }
}

// 播放语音
const playAudio = () => {
  if (!currentQuestion.value || !('speechSynthesis' in window)) {
    ElMessage.warning('您的浏览器不支持语音播放功能')
    return
  }

  // 停止当前播放
  if (speechSynthesis && speechSynthesis.speaking) {
    speechSynthesis.cancel()
  }

  speechSynthesis = window.speechSynthesis
  currentUtterance = new SpeechSynthesisUtterance(currentQuestion.value.title)
  currentUtterance.lang = 'zh-CN'
  currentUtterance.rate = 0.9

  currentUtterance.onstart = () => {
    isPlaying.value = true
  }

  currentUtterance.onend = () => {
    isPlaying.value = false
  }

  speechSynthesis.speak(currentUtterance)
}

// 完成评估
const completeAssessment = async () => {
  let savedAssessId: number | null = null  // 提前声明变量

  try {
    // 计算评估结果
    const result = calculateWeeFIMScores.value(answers.value)

    // 保存评估结果
    const assessData = {
      student_id: parseInt(studentId.value),
      total_score: result.total_score,
      adl_score: result.motor_score,
      cognitive_score: result.cognitive_score,
      level: result.level.level,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString()
    }

    // 调用API保存评估结果
    try {
      const api = new WeeFIMAPI()
      console.log('正在保存评估数据:', assessData)
      savedAssessId = await api.createAssessment(assessData)
      console.log('评估记录已保存，ID:', savedAssessId)

      // 保存评估详情
      const details = Object.entries(answers.value).map(([questionId, score]) => ({
        assess_id: savedAssessId,
        question_id: parseInt(questionId),
        score: score
      }))
      console.log('正在保存评估详情:', details)
      await api.saveAssessmentDetails(details)
      console.log('评估详情已保存')

      console.log('评估结果已保存:', assessData)
      console.log('详细结果:', result)
      assessId.value = savedAssessId.toString() // 使用数据库生成的真实ID

      // 保存报告记录
      try {
        const reportAPI = new ReportAPI()
        const reportTitle = `WeeFIM量表评估报告_${student.value?.name}_${new Date().toLocaleDateString()}`
        reportAPI.saveReportRecord({
          student_id: parseInt(studentId.value),
          report_type: 'weefim',
          assess_id: savedAssessId,
          title: reportTitle
        })
        console.log('✅ 报告记录已保存')
      } catch (error) {
        console.error('保存报告记录失败:', error)
        // 报告记录保存失败不影响评估流程
      }
    } catch (error) {
      console.error('保存评估数据失败:', error)
      ElMessage.error('保存评估数据失败')
      throw error
    }

    // 保存详细结果用于显示
    assessmentResult.value = result

    showCompleteDialog.value = true
  } catch (error) {
    console.error('完成评估失败:', error)
    ElMessage.error('完成评估失败，请重试')
  }
}

// 保存进度
const saveProgress = () => {
  const progress = {
    studentId: studentId.value,
    currentIndex: currentIndex.value,
    answers: answers.value,
    timestamp: new Date().toISOString()
  }
  localStorage.setItem(`weefim_progress_${studentId.value}`, JSON.stringify(progress))
}

// 加载进度
const loadProgress = () => {
  const saved = localStorage.getItem(`weefim_progress_${studentId.value}`)
  if (saved) {
    const progress = JSON.parse(saved)
    // 检查是否是同一天的进度
    const savedDate = new Date(progress.timestamp)
    const today = new Date()
    if (savedDate.toDateString() === today.toDateString()) {
      currentIndex.value = progress.currentIndex || 0
      answers.value = progress.answers || {}
      currentAnswer.value = answers.value[currentQuestion.value?.id] || null
    }
  }
}

// 清除进度
const clearProgress = () => {
  localStorage.removeItem(`weefim_progress_${studentId.value}`)
}

// 保存并退出
const saveAndExit = () => {
  clearProgress()
  router.push('/assessment')
}

// 查看报告
const viewReport = () => {
  clearProgress()
  router.push({
    path: '/assessment/weefim/report',
    query: {
      assessId: assessId.value,
      studentId: studentId.value
    }
  })
}

// 页面离开前确认
onBeforeUnmount(() => {
  if (speechSynthesis && speechSynthesis.speaking) {
    speechSynthesis.cancel()
  }
})

// 开始评估（关闭温馨提示对话框）
const startAssessment = () => {
  showWelcomeDialog.value = false
}

// 初始化
onMounted(async () => {
  // 动态导入量表数据
  try {
    // 加载量表数据
    const weefimDataModule = await import('@/database/weefim-data')
    weefimQuestions.value = weefimDataModule.weefimQuestions
    weefimCategories.value = weefimDataModule.weefimCategories
    calculateWeeFIMScores.value = weefimDataModule.calculateWeeFIMScores

    // 加载评分标准
    const weefimScoringModule = await import('@/database/weefim-scoring-criteria')
    weefimScoringCriteria.value = weefimScoringModule.weefimScoringCriteria

    console.log('WeeFIM数据加载成功:', {
      questions: weefimQuestions.value.length,
      categories: weefimCategories.value.length,
      scoringCriteria: weefimScoringCriteria.value.length
    })
  } catch (error) {
    console.error('加载量表数据失败:', error)
    ElMessage.error('加载量表数据失败')
    router.push('/assessment')
    return
  }

  // 获取学生信息
  await studentStore.loadStudents()

  if (!student.value) {
    ElMessage.error('学生信息不存在')
    router.push('/assessment')
    return
  }

  // 加载进度
  loadProgress()

  // 检查是否有题目
  if (weefimQuestions.value.length === 0) {
    ElMessage.error('WeeFIM评估题目加载失败')
    router.push('/assessment')
    return
  }
})
</script>

<style scoped>
.weefim-assessment {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

/* 温馨提示对话框样式 */
:deep(.welcome-dialog) {
  border-radius: 8px;
}

:deep(.welcome-dialog .el-dialog__header) {
  display: none;
}

:deep(.welcome-dialog .el-dialog__body) {
  padding: 20px 20px 10px;
  max-height: 400px;
  overflow-y: auto;
}

.welcome-content {
  padding: 0;
}

.welcome-intro {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 15px;
  font-weight: 500;
}

.welcome-sections {
  margin-bottom: 15px;
}

.welcome-section {
  margin-bottom: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #67c23a;
}

.welcome-section h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 16px;
}

.welcome-section p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  padding-left: 24px;
}

.welcome-footer {
  text-align: center;
  font-size: 13px;
  color: #67c23a;
  font-weight: 500;
  margin: 12px 0 0 0;
}

.dialog-footer {
  text-align: center;
  padding: 5px 20px 15px;
}

:deep(.dialog-footer .el-button) {
  min-width: 140px;
  font-size: 14px;
  padding: 10px 24px;
}

.assessment-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
}

.student-info h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.info-row {
  display: flex;
  gap: 20px;
  color: #606266;
}

.progress-info {
  flex: 1;
  max-width: 300px;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  color: #606266;
}

.question-card {
  min-height: 600px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-number {
  font-weight: bold;
  color: #303133;
}

.question-category {
  background: #fdf6ec;
  color: #e6a23c;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.question-content {
  padding: 20px 0;
}

.question-title {
  font-size: 20px;
  color: #303133;
  line-height: 1.6;
  margin-bottom: 20px;
}

.score-guide {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 30px;
}

.score-guide h4 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 18px;
}

.scoring-criteria {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.criteria-item {
  background: white;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  padding: 15px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.criteria-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.criteria-item.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.criteria-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.criteria-score {
  display: inline-block;
  background: #409eff;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 14px;
  min-width: 50px;
  text-align: center;
}

.criteria-content {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  text-align: justify;
}

.question-actions {
  margin: 30px 0;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #dcdfe6;
}

.question-info {
  color: #606266;
  font-size: 14px;
}

.complete-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  margin-bottom: 20px;
}

.result-summary {
  margin-top: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.result-item .label {
  font-weight: bold;
  color: #606266;
}

.result-item .score {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.result-item .level {
  padding: 4px 12px;
  border-radius: 20px;
  color: white;
  font-weight: bold;
}

.level-complete {
  background: #67c23a;
}

.level-basic {
  background: #85ce61;
}

.level-mild {
  background: #e6a23c;
}

.level-moderate {
  background: #f56c6c;
}

.level-severe {
  background: #e65d6e;
}

.level-extreme {
  background: #dd6161;
}

.level-total {
  background: #bb3737;
}

.complete-content h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.complete-content p {
  margin: 0;
  color: #606266;
}
</style>