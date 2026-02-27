import { defineStore } from 'pinia'
import { SMAssessmentAPI } from '@/database/api'
import { useStudentStore } from './student'

interface AssessmentRecord {
  id: number
  student_id: number
  age_stage: number
  raw_score: number
  sq_score: number
  level: string
  start_time: string
  end_time?: string
  created_at: string
}

interface Question {
  id: number
  dimension: string
  age_stage: number
  age_min: number
  age_max: number
  title: string
  audio?: string
}

interface Answer {
  questionId: number
  score: 0 | 1
  answerTime: number
}

export const useAssessmentStore = defineStore('assessment', {
  state: () => ({
    currentAssessment: null as AssessmentRecord | null,
    currentStudent: null as any,
    questions: [] as Question[],
    answers: [] as Answer[],
    currentQuestionIndex: 0,
    isAssessing: false,
    assessmentType: 'sm' as 'sm' | 'weefim',
    startTime: null as string | null,
    loading: false
  }),

  getters: {
    // 当前题目
    currentQuestion: (state) => {
      if (state.currentQuestionIndex >= 0 && state.currentQuestionIndex < state.questions.length) {
        return state.questions[state.currentQuestionIndex]
      }
      return null
    },

    // 评估进度
    progress: (state) => {
      const total = state.questions.length
      const answered = state.answers.length
      return total > 0 ? Math.round((answered / total) * 100) : 0
    },

    // 已回答题目数
    answeredCount: (state) => state.answers.length,

    // 总题目数
    totalQuestions: (state) => state.questions.length,

    // 粗分（按S-M量表标准计算方法）
    rawScore: (state) => {
      if (!state.currentStudent || state.answers.length === 0) return 0

      // 获取学生月龄
      const studentStore = useStudentStore()
      const ageInMonths = studentStore.getAgeInMonths(state.currentStudent.birthday)

      // 确定起始年龄阶段
      const api = new SMAssessmentAPI()
      const ageStage = api.getAgeStageByAge(ageInMonths)
      if (!ageStage) return 0

      // 获取该年龄阶段的起始题目ID
      const startQuestionId = api.getStartQuestionId(ageStage.id)

      // 将答案转换为按题目ID排序的数组
      const sortedAnswers = [...state.answers].sort((a, b) => a.questionId - b.questionId)

      // 找到起始位置
      const startIndex = sortedAnswers.findIndex(a => a.questionId >= startQuestionId)
      if (startIndex === -1) return 0

      // 从起始位置开始计算粗分
      let consecutivePassCount = 0
      let consecutiveFailCount = 0
      let totalPassCount = 0
      let shouldStop = false

      for (let i = startIndex; i < sortedAnswers.length && !shouldStop; i++) {
        const answer = sortedAnswers[i]

        if (answer.score === 1) { // 通过
          totalPassCount++
          consecutivePassCount++
          consecutiveFailCount = 0

          // 连续10项通过，认为前面所有项目都通过
          if (consecutivePassCount >= 10) {
            // 加上前面未测试的项目
            const prevQuestionsCount = answer.questionId - startQuestionId - (consecutivePassCount - 1)
            totalPassCount += Math.max(0, prevQuestionsCount)
            shouldStop = true
          }
        } else { // 不通过
          consecutivePassCount = 0
          consecutiveFailCount++

          // 连续10项不通过，结束检查
          if (consecutiveFailCount >= 10) {
            shouldStop = true
          }
        }
      }

      return totalPassCount
    }
  },

  actions: {
    // 初始化S-M量表评估
    async initSMAssessment(studentId: number) {
      try {
        this.loading = true
        this.assessmentType = 'sm'
        this.answers = []
        this.currentQuestionIndex = 0

        const studentStore = useStudentStore()
        const student = studentStore.students.find(s => s.id === studentId)

        if (!student) {
          throw new Error('学生不存在')
        }

        // 计算月龄
        const ageInMonths = studentStore.getAgeInMonths(student.birthday)

        const api = new SMAssessmentAPI()

        // 获取年龄阶段
        const ageStage = api.getAgeStageByAge(ageInMonths)
        if (!ageStage) {
          throw new Error('无法确定年龄阶段')
        }

        // 获取题目
        this.questions = await api.getQuestions(ageStage.id)

        // 创建评估记录
        this.startTime = new Date().toISOString()
        this.currentStudent = student
        this.currentAssessment = {
          id: 0, // 临时ID，保存时会更新
          student_id: studentId,
          age_stage: ageStage.id,
          raw_score: 0,
          sq_score: 0,
          level: '',
          start_time: this.startTime,
          created_at: this.startTime
        }

        this.isAssessing = true
      } catch (error) {
        console.error('初始化评估失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 回答当前题目
    answerQuestion(score: 0 | 1, answerTime: number = 0) {
      if (!this.currentQuestion) {
        throw new Error('没有当前题目')
      }

      // 检查是否已经回答过
      const existingIndex = this.answers.findIndex(
        a => a.questionId === this.currentQuestion!.id
      )

      if (existingIndex !== -1) {
        // 更新答案
        this.answers[existingIndex] = {
          questionId: this.currentQuestion.id,
          score,
          answerTime
        }
      } else {
        // 添加答案
        this.answers.push({
          questionId: this.currentQuestion.id,
          score,
          answerTime
        })
      }
    },

    // 下一题
    nextQuestion() {
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++
      }
    },

    // 上一题
    previousQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--
      }
    },

    // 跳转到指定题目
    goToQuestion(index: number) {
      if (index >= 0 && index < this.questions.length) {
        this.currentQuestionIndex = index
      }
    },

    // 获取指定题目的答案
    getAnswer(questionId: number): 0 | 1 | null {
      const answer = this.answers.find(a => a.questionId === questionId)
      return answer ? answer.score : null
    },

    // 完成评估
    async finishAssessment() {
      if (!this.currentAssessment) {
        throw new Error('没有进行中的评估')
      }

      try {
        this.loading = true

        const api = new SMAssessmentAPI()

        // 计算结果
        const rawScore = this.rawScore
        const sqScore = this.calculateSQScore(rawScore)
        const level = this.getLevel(sqScore)

        // 更新评估记录
        this.currentAssessment.raw_score = rawScore
        this.currentAssessment.sq_score = sqScore
        this.currentAssessment.level = level
        this.currentAssessment.end_time = new Date().toISOString()

        // 保存评估记录
        const assessId = await api.createAssessment(this.currentAssessment)

        // 保存答案详情
        for (const answer of this.answers) {
          await api.saveAssessmentDetail({
            assess_id: assessId,
            question_id: answer.questionId,
            score: answer.score,
            answer_time: answer.answerTime
          })
        }

        // 更新本地记录
        this.currentAssessment.id = assessId

        this.isAssessing = false

        return {
          assessId,
          rawScore,
          sqScore,
          level
        }
      } catch (error) {
        console.error('保存评估失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // 计算SQ分数（简化版）
    calculateSQScore(rawScore: number): number {
      // 这里应该根据常模表计算，简化处理
      // 实际实现需要查询 sm_norm 和 sm_raw_to_sq 表
      const age = Math.max(1, Math.floor(rawScore / 10))
      return Math.min(20, age + 5) // 简化计算
    },

    // 根据SQ分数获取等级
    getLevel(sqScore: number): string {
      if (sqScore >= 10) return '正常'
      if (sqScore >= 8) return '边缘'
      return '异常'
    },

    // 重置评估
    resetAssessment() {
      this.currentAssessment = null
      this.questions = []
      this.answers = []
      this.currentQuestionIndex = 0
      this.isAssessing = false
      this.startTime = null
    },

    // 暂停评估
    pauseAssessment() {
      this.isAssessing = false
    },

    // 继续评估
    resumeAssessment() {
      if (this.currentAssessment) {
        this.isAssessing = true
      }
    }
  }
})