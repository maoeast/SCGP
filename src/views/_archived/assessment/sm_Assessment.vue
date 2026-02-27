<!--
  @deprecated
  此文件已废弃，请使用统一的评估容器 AssessmentContainer.vue

  新路由: /assessment/unified/sm/:studentId
  驱动器: src/strategies/assessment/SMDriver.ts

  Phase 4 重构：评估模块已迁移到"UI 容器复用 + 策略驱动器"架构。
  此文件仅作为历史参考保留，不应再被路由引用。

  迁移日期: 2026-02-24
-->
<template>
  <div class="sm-assessment">
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
        <p class="welcome-intro">在填写这份量表前，请您放轻松。这不仅是一次评估，更是我们共同了解孩子"生活智慧"的过程。</p>

        <div class="welcome-sections">
          <div class="welcome-section">
            <h4><span class="section-icon">🏠</span> 这不是考试，无关成绩</h4>
            <p>我们关注的是孩子在生活中如何照顾自己、如何与人交往，这与幼儿园或学校的文化课成绩完全无关。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">🌱</span> 接纳差异，允许"不会"</h4>
            <p>量表涵盖了从婴儿到初中生的广泛内容。如果您的孩子有些项目还不会做，这是非常正常的，因为每个孩子的年龄和成长节奏都不同。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">👩‍🏫</span> 谁来填写最合适？</h4>
            <p>请由每天陪伴孩子、最了解孩子日常起居的人（如父母、主要抚养人或经常与孩子接触的老师）来回答。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">💖</span> 真实是最大的帮助</h4>
            <p>请依据孩子平时的实际表现（而非"他应该会"或"偶尔会"）坦率回答。您真实的反馈，是我们为孩子提供个性化支持的基石。</p>
          </div>
        </div>

        <p class="welcome-footer">感谢您的真诚与合作，让我们一起支持孩子更好地适应生活！</p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="startAssessment">
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
            <h3>S-M量表评估</h3>
            <div class="info-row">
              <span>学生：{{ student?.name }}</span>
              <span>年龄：{{ studentAge }}岁</span>
              <span>起始阶段：第 {{ currentAgeStage?.stage }} 阶段</span>
              <span v-if="currentAssessStage">当前评估：{{ currentAssessStage }}</span>
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
          <span class="question-number">第 {{ currentIndex + 1 }} 题 (题号:{{ currentQuestion.id }})</span>
          <span class="question-stage">{{ currentAssessStage }}</span>
          <span class="question-dimension">{{ currentQuestion.dimension }}</span>
        </div>
      </template>

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
            <el-radio :value="1" size="large">
              <span class="option-label">通过</span>
              <span class="option-desc">学生能够完成该项能力</span>
            </el-radio>
            <el-radio :value="0" size="large">
              <span class="option-label">不通过</span>
              <span class="option-desc">学生不能完成该项能力</span>
            </el-radio>
          </el-radio-group>
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
        <!-- 移除"下一题"按钮，选择答案后自动进入下一题 -->
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
      <div class="complete-content">
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
  InfoFilled
} from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { SMAssessmentAPI, ReportAPI } from '@/database/api'

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()

// 温馨提示对话框
const showWelcomeDialog = ref(true)

// 响应式量表数据
const smQuestions = ref<any[]>([])
const smAgeRanges = ref<any[]>([])
const calculateSQScore = ref<any>(null)
const getEvaluationLevel = ref<any>(null)

// 学生信息
const studentId = ref(route.query.studentId as string)
const student = computed(() =>
  studentStore.students.find(s => s.id === parseInt(studentId.value))
)

// 学生月龄
const studentAgeInMonths = computed(() => {
  if (!student.value?.birthday) return 0
  const birth = new Date(student.value.birthday)
  const today = new Date()

  // 计算总月数
  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()

  // 如果当月天数小于出生天数，减去一个月
  if (today.getDate() < birth.getDate()) {
    months--
  }

  return months
})

// 学生年龄（周岁）
const studentAge = computed(() => {
  return Math.floor(studentAgeInMonths.value / 12)
})

// 当前年龄阶段
const currentAgeStage = computed(() => {
  // 根据月龄获取对应的 age_stage
  let ageStage = 0
  if (studentAgeInMonths.value >= 0 && studentAgeInMonths.value <= 23) ageStage = 1
  else if (studentAgeInMonths.value >= 24 && studentAgeInMonths.value <= 41) ageStage = 2
  else if (studentAgeInMonths.value >= 42 && studentAgeInMonths.value <= 59) ageStage = 3
  else if (studentAgeInMonths.value >= 60 && studentAgeInMonths.value <= 77) ageStage = 4
  else if (studentAgeInMonths.value >= 78 && studentAgeInMonths.value <= 101) ageStage = 5
  else if (studentAgeInMonths.value >= 102 && studentAgeInMonths.value <= 125) ageStage = 6
  else if (studentAgeInMonths.value >= 126) ageStage = 7

  return { stage: ageStage }
})

// 获取评估题目（包含所有阶段以支持向前向后评估）
const filteredQuestions = computed(() => {
  if (!currentAgeStage.value || !smQuestions.value) return []

  // 包含所有阶段的题目，以支持向前查找
  return smQuestions.value.sort((a, b) => a.id - b.id)
})

// 获取起始年龄阶段在题目列表中的索引位置
const ageStageStartIndex = computed(() => {
  if (!currentAgeStage.value || !filteredQuestions.value.length) return 0

  // 找到当前年龄阶段的第一个题目的索引
  const index = filteredQuestions.value.findIndex(
    q => q.age_stage === currentAgeStage.value!.stage
  )
  return index !== -1 ? index : 0
})

// 题目相关状态
const currentIndex = ref(0)
const totalQuestions = computed(() => filteredQuestions.value.length)
const currentQuestion = computed(() => filteredQuestions.value[currentIndex.value])
const progressPercentage = computed(() => {
  if (totalQuestions.value === 0) return 0

  // 显示基于当前已评估题目的进度
  const evaluatedCount = currentIndex.value + 1
  return Math.round((evaluatedCount / Math.max(evaluatedCount, totalQuestions.value)) * 100)
})

// 当前评估的阶段
const currentAssessStage = computed(() => {
  if (!currentQuestion.value) return null
  return `第${currentQuestion.value.age_stage}阶段`
})

// 答案存储
const answers = ref<Record<number, number>>({})
const currentAnswer = ref<number | null>(null)
const justNavigated = ref(false)  // 标记是否刚刚进行了导航（用于区分主动修改和重新确认）

// 基线（Basal）和上限（Ceiling）管理
const basalEstablished = ref(false)  // 是否已建立基线（连续10项全通过）
const visitedStages = ref<Set<number>>(new Set())  // 已访问过的阶段，避免重复回退
const basalStage = ref<number | null>(null)  // 基线所在阶段

// 语音播放状态
const isPlaying = ref(false)
let speechSynthesis: SpeechSynthesis | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

// 完成对话框
const showCompleteDialog = ref(false)
const assessId = ref<number | null>(null)

// 进度格式化
const progressFormat = (percentage: number) => `${percentage}%`

// 处理答案
const handleAnswer = (value: number) => {
  if (currentQuestion.value) {
    const questionId = currentQuestion.value.id
    const previousAnswer = answers.value[questionId]
    const wasNavigated = justNavigated.value

    console.log(`🎯 handleAnswer 调用 - 题目${questionId}, 新值:${value}, 旧值:${previousAnswer}, justNavigated:${wasNavigated}`)

    // 🔑 立即重置导航标记（在做任何判断之前）
    if (justNavigated.value) {
      justNavigated.value = false
      console.log(`  🔄 重置 justNavigated 标记`)
    }

    // 🔑 关键判断：区分两种情况
    // 1. 首次回答或导航后重新选择 -> 允许继续
    // 2. 主动返回修改答案 -> 提示已更新，不自动跳转

    if (previousAnswer !== undefined && !wasNavigated) {
      // 主动返回已回答题目修改答案
      if (previousAnswer !== value) {
        // 修改了答案
        answers.value[questionId] = value
        saveProgress()
        console.log(`  ⛔ 主动修改答案，阻止自动跳转`)
        ElMessage.success('答案已更新')
        return
      } else {
        // 点击相同答案，不做任何处理
        console.log(`  ⚠️ 重复点击相同答案，阻止自动跳转`)
        return
      }
    }

    // 首次回答或导航后重新选择，允许继续
    console.log(`  ✅ 允许继续`)
    answers.value[questionId] = value
    saveProgress()

    // 直接进入下一题
    console.log(`  ⏭️ 准备进入下一题...`)
    setTimeout(() => {
      nextQuestion()
    }, 200) // 延迟200ms让用户看到选择效果
  }
}

// 上一题
const previousQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    // 🔑 不预先选中答案，让用户重新选择
    currentAnswer.value = null
    justNavigated.value = true  // 标记为导航
    console.log('⬅️ 返回上一题，清空答案选择')
  }
}

// 检查是否应该结束评估（S-M规则：连续10项通过和10项不通过）
const shouldEndAssessment = (currentAnswers: Record<number, number>): boolean => {
  if (!smQuestions.value || !currentAgeStage.value) return false

  const allQuestions = smQuestions.value.sort((a, b) => a.id - b.id)
  const startIndex = ageStageStartIndex.value

  let tenPassStartIndex = -1  // 连续10项通过开始的位置
  let tenPassEndIndex = -1    // 连续10项通过结束的位置

  // Phase 1: 从年龄阶段起始位置向前搜索连续10项通过
  let consecutivePass = 0
  for (let i = startIndex; i < allQuestions.length; i++) {
    const qid = allQuestions[i].id
    if (!currentAnswers.hasOwnProperty(qid)) break

    if (currentAnswers[qid] === 1) {
      consecutivePass++
      if (consecutivePass === 10) {
        tenPassStartIndex = i - 9
        tenPassEndIndex = i
        console.log('向前搜索：发现连续10项通过，从题目', allQuestions[tenPassStartIndex].id, '到', allQuestions[i].id)
        break
      }
    } else {
      consecutivePass = 0
    }
  }

  // Phase 2: 如果向前没找到，尝试向后搜索（适用于起始阶段题目未全通过的情况）
  if (tenPassStartIndex === -1 && startIndex > 0) {
    consecutivePass = 0
    // 从起始位置的前一题开始向后搜索
    for (let i = startIndex - 1; i >= 0; i--) {
      const qid = allQuestions[i].id
      if (!currentAnswers.hasOwnProperty(qid)) {
        // 遇到未回答的题目，需要继续评估
        break
      }

      if (currentAnswers[qid] === 1) {
        consecutivePass++
        if (consecutivePass === 10) {
          tenPassStartIndex = i
          tenPassEndIndex = i + 9
          console.log('向后搜索：发现连续10项通过，从题目', allQuestions[i].id, '到', allQuestions[tenPassEndIndex].id)
          break
        }
      } else {
        consecutivePass = 0
      }
    }
  }

  // 🔑 关键修复：如果没有找到连续10项通过，检查是否连续10项不通过
  // 这种情况下，评估也应该结束（说明题目太简单，学生基础能力较低）
  if (tenPassStartIndex === -1) {
    // 从起始位置开始检查连续不通过
    let consecutiveFail = 0
    let answeredCount = 0

    for (let i = startIndex; i < allQuestions.length; i++) {
      const qid = allQuestions[i].id
      if (!currentAnswers.hasOwnProperty(qid)) break

      answeredCount++

      if (currentAnswers[qid] === 0) {
        consecutiveFail++
        console.log('题目', qid, '不通过，连续不通过数:', consecutiveFail)

        if (consecutiveFail === 10) {
          console.log('S-M评估规则：未找到基线，但发现连续10项不通过，评估结束')
          ElMessage.info('根据S-M评估规则，连续10项不通过，评估自动结束')
          return true
        }
      } else {
        consecutiveFail = 0
        console.log('题目', qid, '通过，重置连续不通过计数')
      }
    }

    // 如果没有连续10项不通过，评估继续
    console.log('未找到连续10项通过，也未找到连续10项不通过，评估继续')
    return false
  }

  // Phase 3: 从连续10项通过之后开始检查连续10项不通过
  let consecutiveFail = 0
  for (let i = tenPassEndIndex + 1; i < allQuestions.length; i++) {
    const qid = allQuestions[i].id
    if (!currentAnswers.hasOwnProperty(qid)) break

    if (currentAnswers[qid] === 0) {
      consecutiveFail++
      console.log('题目', qid, '不通过，连续不通过数:', consecutiveFail)

      if (consecutiveFail === 10) {
        console.log('S-M评估规则：发现连续10项不通过，评估结束')
        ElMessage.info('根据S-M评估规则，连续10项不通过，评估自动结束')
        return true
      }
    } else {
      consecutiveFail = 0
      console.log('题目', qid, '通过，重置连续不通过计数')
    }
  }

  return false
}

// 检查当前是否已建立基线（连续10项全通过）
const checkBasalEstablished = (): boolean => {
  if (!currentQuestion.value) return false

  const currentStage = currentQuestion.value.age_stage
  const stageQuestions = filteredQuestions.value.filter(q => q.age_stage === currentStage)

  // 检查当前阶段是否所有题目都已回答且全部通过
  let allAnswered = true
  let allPassed = true

  for (const q of stageQuestions) {
    if (!answers.value.hasOwnProperty(q.id)) {
      allAnswered = false
      break
    }
    if (answers.value[q.id] !== 1) {
      allPassed = false
    }
  }

  // 如果当前阶段所有题目都回答了且全部通过，建立基线
  if (allAnswered && allPassed && stageQuestions.length >= 10) {
    console.log(`✅ 基线已建立：第${currentStage}阶段所有${stageQuestions.length}题全部通过`)
    basalEstablished.value = true
    basalStage.value = currentStage
    ElMessage.success({
      message: `基线已确立！第${currentStage}阶段全部通过，现在开始向前评估`,
      duration: 3000
    })
    return true
  }

  return false
}

// 检查是否需要向后导航（仅在建立基线前触发）
const needsBackwardNavigation = (): boolean => {
  // 🔑 关键：如果已经建立基线，不再向后导航
  if (basalEstablished.value) {
    console.log('已建立基线，不再向后导航，继续向前寻找上限')
    return false
  }

  const startIdx = ageStageStartIndex.value

  // 如果已经在起始阶段之前，不需要再往后导航
  if (currentIndex.value < startIdx) {
    return false
  }

  // 如果起始阶段没有更早的阶段，不能往后导航
  if (startIdx <= 0) {
    return false
  }

  const currentStage = currentQuestion.value?.age_stage
  if (!currentStage) return false

  // 🔑 关键：如果这个阶段已经访问过，不再重复回退
  if (visitedStages.value.has(currentStage)) {
    console.log(`阶段${currentStage}已访问过，不再重复回退`)
    return false
  }

  // 关键优化：只要起始阶段的第2题答错，就立即往回走
  // 这样可以尽早发现"太难了"，避免让家长连续受挫
  if (currentIndex.value === startIdx + 1) {
    const secondQuestionId = filteredQuestions.value[startIdx + 1]?.id
    if (secondQuestionId && answers.value.hasOwnProperty(secondQuestionId)) {
      // 第2题答错了（score = 0），立即触发向后导航
      if (answers.value[secondQuestionId] === 0) {
        console.log('检测到起始阶段第2题答错，触发向后导航')
        visitedStages.value.add(currentStage)  // 标记已访问
        return true
      }
    }
  }

  return false
}

// 计算向后导航的目标索引（跳转到前一阶段的第一题）
const calculateBackwardIndex = (): number => {
  const startIdx = ageStageStartIndex.value
  if (startIdx <= 0) return -1

  // 找到前一个年龄阶段的第一题
  const currentStage = currentAgeStage.value?.stage
  if (!currentStage) return -1

  const previousStage = currentStage - 1
  const previousStageFirstQuestion = filteredQuestions.value.find(
    q => q.age_stage === previousStage
  )

  if (previousStageFirstQuestion) {
    const targetIndex = filteredQuestions.value.findIndex(
      q => q.id === previousStageFirstQuestion.id
    )
    console.log('向后导航目标：阶段', previousStage, '的第一题，索引', targetIndex, '，题目ID', previousStageFirstQuestion.id)
    return targetIndex
  }

  return -1
}

// 下一题
const nextQuestion = async () => {
  // 🔑 第一步：检查当前阶段是否建立基线
  if (!basalEstablished.value) {
    const currentStage = currentQuestion.value?.age_stage
    if (currentStage) {
      const stageQuestions = filteredQuestions.value.filter(q => q.age_stage === currentStage)
      const allAnswered = stageQuestions.every(q => answers.value.hasOwnProperty(q.id))

      // 如果当前阶段所有题目都已回答，检查是否建立基线
      if (allAnswered) {
        checkBasalEstablished()
      }
    }
  }

  // 🔑 第二步：检查是否需要向后导航（仅在未建立基线时）
  if (needsBackwardNavigation()) {
    const backwardIndex = calculateBackwardIndex()
    if (backwardIndex >= 0) {
      console.log('检测到题目较难，自动调整到前一阶段')
      ElMessage.info('为了更准确评估，我们从稍简单一点的题目开始')
      currentIndex.value = backwardIndex
      currentAnswer.value = null  // 🔑 不预先选中答案
      justNavigated.value = true  // 标记为导航
      return
    }
  }

  // 🔑 第三步：如果刚建立基线，返回到起始阶段继续评估
  if (basalEstablished.value && currentQuestion.value) {
    const currentStage = currentQuestion.value.age_stage
    const startStage = currentAgeStage.value?.stage

    // 如果当前在基线阶段且基线阶段比起始阶段小，返回起始阶段
    if (currentStage === basalStage.value && startStage && currentStage < startStage) {
      // 找到起始阶段第一个未回答的题目
      const startIdx = ageStageStartIndex.value
      let targetIndex = startIdx

      // 从起始阶段开始，找第一个未回答的题目
      for (let i = startIdx; i < filteredQuestions.value.length; i++) {
        const qid = filteredQuestions.value[i].id
        if (!answers.value.hasOwnProperty(qid)) {
          targetIndex = i
          break
        }
      }

      console.log(`基线已建立，返回起始阶段（第${startStage}阶段）第一个未回答题目，索引${targetIndex}`)
      ElMessage.info(`基线已确立，返回第${startStage}阶段继续评估`)
      currentIndex.value = targetIndex
      currentAnswer.value = null  // 🔑 不预先选中答案，让用户重新选择
      justNavigated.value = true  // 标记为导航
      return
    }
  }

  // 🔑 第四步：在进入下一题之前，检查是否应该结束评估
  if (shouldEndAssessment(answers.value)) {
    console.log('根据S-M规则，评估自动结束')
    await completeAssessment()
    return
  }

  // 🔑 第五步：正常进入下一题
  if (currentIndex.value < totalQuestions.value - 1) {
    currentIndex.value++
    currentAnswer.value = null  // 🔑 不预先选中答案，让用户重新选择
    justNavigated.value = true  // 🔑 标记为导航，允许重新选择之前的答案
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

// 计算S-M量表粗分（根据量表官方规则，支持向后导航）
const calculateSMRawScore = (answers: Record<number, number>, ageStage: number): number => {
  if (!smQuestions.value) return 0

  console.log('S-M粗分计算开始 - ageStage:', ageStage)
  console.log('答案详情:', answers)

  // 各年龄阶段的基础分（根据S-M量表标准）
  const stageBaseScores: Record<number, number> = {
    1: 0,    // I.6个月-1岁11个月: 基础分0
    2: 19,   // II.2岁-3岁5个月: 基础分19
    3: 41,   // III.3岁6个月-4岁11个月: 基础分41
    4: 63,   // IV.5岁-6岁5个月: 基础分63
    5: 80,   // V.6岁6个月-8岁5个月: 基础分80
    6: 96,   // VI.8岁6个月-10岁5个月: 基础分96
    7: 113   // VII.10岁6个月以上: 基础分113
  }

  // 获取所有132道题目，按ID排序
  const allQuestions = smQuestions.value.sort((a, b) => a.id - b.id)

  // 获取年龄阶段的起始索引
  const startIndex = ageStageStartIndex.value

  console.log('起始阶段:', ageStage, ', 起始索引:', startIndex)

  // 查找连续10项通过的位置（可能在当前阶段或更早阶段）
  let tenPassStartIndex = -1
  let tenPassEndIndex = -1

  // Phase 1: 从起始阶段向前搜索
  let consecutivePass = 0
  for (let i = startIndex; i < allQuestions.length; i++) {
    const qid = allQuestions[i].id
    if (!answers.hasOwnProperty(qid)) break

    if (answers[qid] === 1) {
      consecutivePass++
      if (consecutivePass === 10) {
        tenPassStartIndex = i - 9
        tenPassEndIndex = i
        console.log('向前搜索：发现连续10项通过，从题目', allQuestions[tenPassStartIndex].id, '到', allQuestions[i].id)
        break
      }
    } else {
      consecutivePass = 0
    }
  }

  // Phase 2: 如果向前没找到，尝试向后搜索
  if (tenPassStartIndex === -1 && startIndex > 0) {
    consecutivePass = 0
    for (let i = startIndex - 1; i >= 0; i--) {
      const qid = allQuestions[i].id
      if (!answers.hasOwnProperty(qid)) break

      if (answers[qid] === 1) {
        consecutivePass++
        if (consecutivePass === 10) {
          tenPassStartIndex = i
          tenPassEndIndex = i + 9
          console.log('向后搜索：发现连续10项通过，从题目', allQuestions[i].id, '到', allQuestions[tenPassEndIndex].id)
          break
        }
      } else {
        consecutivePass = 0
      }
    }
  }

  // 确定有效的基础分和通过题目数
  let effectiveBaseScore = stageBaseScores[ageStage] || 0
  let finalPassedCount = 0

  if (tenPassStartIndex !== -1) {
    // 找到了连续10项通过，确定有效的年龄阶段和基础分
    const tenPassQuestion = allQuestions[tenPassStartIndex]
    const effectiveAgeStage = tenPassQuestion.age_stage
    effectiveBaseScore = stageBaseScores[effectiveAgeStage] || 0

    console.log('连续10项通过起始题目所在阶段:', effectiveAgeStage, ', 使用基础分:', effectiveBaseScore)

    // S-M规则：连续10项通过，前面所有项目视为通过
    // 从连续10项通过的位置开始，计算通过的题目数

    // 1. 连续10项通过本身
    finalPassedCount = 10

    // 2. 连续10项通过之后的通过题目
    for (let i = tenPassEndIndex + 1; i < allQuestions.length; i++) {
      const qid = allQuestions[i].id
      if (answers.hasOwnProperty(qid)) {
        if (answers[qid] === 1) {
          finalPassedCount++
        }
      } else {
        break
      }
    }

    console.log('S-M规则计算结果：')
    console.log('- 连续10项通过:', 10, '题')
    console.log('- 连续10项后的通过题目:', finalPassedCount - 10, '题')
    console.log('- 总通过题目数:', finalPassedCount)

  } else {
    // 没有找到连续10项通过，只计算实际通过的题目
    console.log('没有连续10项通过，只计算实际通过题目')

    for (const qid in answers) {
      if (answers[qid] === 1) {
        finalPassedCount++
      }
    }
  }

  const finalRawScore = effectiveBaseScore + finalPassedCount
  console.log('最终通过题目数:', finalPassedCount)
  console.log('最终S-M粗分:', finalRawScore, '(基础分:', effectiveBaseScore, '+ 通过数:', finalPassedCount, ')')

  return finalRawScore
}

// 完成评估
const completeAssessment = async () => {
  let savedAssessId: number | null = null  // 提前声明变量

  try {
    // 根据S-M量表规则计算粗分
    console.log('开始计算S-M粗分...')
    console.log('answers.value:', answers.value)
    console.log('currentAgeStage.value?.stage:', currentAgeStage.value?.stage)

    const rawScore = calculateSMRawScore(answers.value, currentAgeStage.value?.stage)

    console.log('计算得到的粗分:', rawScore)
    console.log('学生月龄:', studentAgeInMonths.value, '个月')

    // 计算标准分
    const sqScore = calculateSQScore.value(rawScore, studentAgeInMonths.value)
    console.log('计算得到的标准分:', sqScore)

    // 获取评定等级
    const level = getEvaluationLevel.value(sqScore)
    console.log('评定等级:', level)

    // 保存评估结果
    const assessData = {
      student_id: parseInt(studentId.value),
      age_stage: currentAgeStage.value?.stage,
      raw_score: rawScore, // 已经是按规则计算的粗分
      actual_pass_count: Object.values(answers.value).reduce((sum, score) => sum + score, 0), // 实际通过的项目数
      sq_score: sqScore,
      level: level,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      answers: answers.value
    }

    // 保存到数据库
    try {
      const api = new SMAssessmentAPI()

      console.log('🚀 开始保存S-M评估记录...')

      // 尝试方法1: 使用API的createAssessment
      savedAssessId = await api.createAssessment(assessData)
      console.log('🚀 API返回的ID:', savedAssessId)

      // 如果返回0，尝试直接查询最新记录
      if (savedAssessId === 0) {
        console.log('⚠️ API返回ID为0，尝试直接查询最新记录...')

        // 直接从数据库查询最新的评估记录
        const allAssessments = api.getStudentAssessments(parseInt(studentId.value))
        console.log('🔍 查询到的所有评估记录:', allAssessments)

        if (allAssessments && allAssessments.length > 0) {
          // 获取最新的一条（按ID降序排序后的第一条）
          const latest = allAssessments.sort((a: any, b: any) => b.id - a.id)[0]
          savedAssessId = latest.id
          console.log('✅ 从查询结果中获取到ID:', savedAssessId)
        }
      }

      if (savedAssessId === 0) {
        throw new Error('无法获取评估记录ID')
      }

      // 保存评估详情
      const details = Object.entries(answers.value).map(([questionId, score]) => ({
        assess_id: savedAssessId,
        question_id: parseInt(questionId),
        score: score,
        answer_time: 0
      }))

      console.log('准备保存的评估详情:', details)
      console.log('details.length:', details.length)

      for (const detail of details) {
        await api.saveAssessmentDetail(detail)
        console.log('已保存详情:', detail)
      }

      assessId.value = savedAssessId.toString()
      console.log('✅ S-M评估数据已保存到数据库，ID:', savedAssessId)
    } catch (error) {
      console.error('保存S-M评估数据失败:', error)
      // 如果数据库保存失败，暂时保存到localStorage
      const assessResultKey = `sm_assess_result_${studentId.value}_${Date.now()}`
      localStorage.setItem(assessResultKey, JSON.stringify(assessData))
      localStorage.setItem(`latest_sm_assess_${studentId.value}`, assessResultKey)
    }

    console.log('评估结果已保存:', assessData)

    // 保存报告记录
    if (savedAssessId) {
      try {
        const reportAPI = new ReportAPI()
        const reportTitle = `S-M量表评估报告_${student.value?.name}_${new Date().toLocaleDateString()}`
        reportAPI.saveReportRecord({
          student_id: parseInt(studentId.value),
          report_type: 'sm',
          assess_id: savedAssessId,
          title: reportTitle
        })
        console.log('✅ 报告记录已保存')
      } catch (error) {
        console.error('保存报告记录失败:', error)
        // 报告记录保存失败不影响评估流程
      }
    } else {
      console.warn('⚠️ savedAssessId 为空，跳过保存报告记录')
    }

    // 🔑 重要：评估完成后清除进度数据，确保下次重新评估时从头开始
    clearProgress()
    console.log('✅ 已清除评估进度数据')

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
    basalEstablished: basalEstablished.value,
    visitedStages: Array.from(visitedStages.value),
    basalStage: basalStage.value,
    timestamp: new Date().toISOString()
  }
  localStorage.setItem(`sm_progress_${studentId.value}`, JSON.stringify(progress))
}

// 加载进度
const loadProgress = () => {
  const saved = localStorage.getItem(`sm_progress_${studentId.value}`)
  if (saved) {
    const progress = JSON.parse(saved)
    // 检查是否是同一天的进度
    const savedDate = new Date(progress.timestamp)
    const today = new Date()
    if (savedDate.toDateString() === today.toDateString()) {
      currentIndex.value = progress.currentIndex || 0
      answers.value = progress.answers || {}
      basalEstablished.value = progress.basalEstablished || false
      visitedStages.value = new Set(progress.visitedStages || [])
      basalStage.value = progress.basalStage || null

      // 🔑 关键修复：不要预先选中答案，让用户重新选择
      currentAnswer.value = null  // 清空当前答案显示

      // 🔑 关键修复：加载进度后标记为导航状态，允许重新确认答案
      justNavigated.value = true

      console.log('✅ 已加载进度：', {
        currentIndex: currentIndex.value,
        basalEstablished: basalEstablished.value,
        visitedStages: Array.from(visitedStages.value),
        basalStage: basalStage.value,
        justNavigated: justNavigated.value,
        currentQuestionHasAnswer: answers.value[filteredQuestions.value[currentIndex.value]?.id] !== undefined
      })

      // 加载进度后，检查是否应该结束评估
      setTimeout(() => {
        if (shouldEndAssessment(answers.value)) {
          console.log('恢复进度时检测到评估应该结束')
          completeAssessment()
        }
      }, 100)
    }
  }
}

// 清除进度
const clearProgress = () => {
  localStorage.removeItem(`sm_progress_${studentId.value}`)
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
    path: '/assessment/sm/report',
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
    const [smQuestionsModule, smNormsModule] = await Promise.all([
      import('@/database/sm-questions'),
      import('@/database/sm-norms')
    ])
    smQuestions.value = smQuestionsModule.smQuestions
    smAgeRanges.value = smNormsModule.smAgeRanges
    calculateSQScore.value = smNormsModule.calculateSQScore
    getEvaluationLevel.value = smNormsModule.getEvaluationLevel
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

  // 如果没有加载到进度，设置初始索引为年龄阶段的起始位置
  if (currentIndex.value === 0 && Object.keys(answers.value).length === 0) {
    currentIndex.value = ageStageStartIndex.value
  }

  // 检查是否有题目
  if (filteredQuestions.value.length === 0) {
    ElMessage.error('该年龄段暂无评估题目')
    router.push('/assessment')
    return
  }
})
</script>

<style scoped>
.sm-assessment {
  padding: 20px;
  max-width: 800px;
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
  background: #f5f7fa;
  border-radius: 6px;
  border-left: 3px solid #409eff;
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
  color: #409eff;
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
  min-height: 400px;
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

.question-stage {
  background: #f4f4f5;
  color: #909399;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin: 0 8px;
}

.question-dimension {
  background: #e1f3d8;
  color: #67c23a;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.question-content {
  padding: 20px 0;
}

.question-title {
  font-size: 18px;
  color: #303133;
  line-height: 1.6;
  margin-bottom: 20px;
}

.question-actions {
  margin-bottom: 30px;
}

.answer-options {
  margin-top: 30px;
}

.answer-options :deep(.el-radio) {
  display: block;
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  transition: all 0.3s;
}

.answer-options :deep(.el-radio:hover) {
  border-color: #409eff;
  background-color: #f5f7fa;
}

.answer-options :deep(.el-radio.is-checked) {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.option-label {
  font-weight: bold;
  margin-right: 10px;
  color: #409eff;
}

.option-desc {
  color: #606266;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #dcdfe6;
}

.complete-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  margin-bottom: 20px;
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
