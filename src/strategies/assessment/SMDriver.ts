/**
 * S-M 量表驱动器
 *
 * 婴儿-初中生社会生活能力量表（Social Maturity Scale）
 *
 * 特点：
 * - 132 道题目，按年龄阶段分组（1-7阶段）
 * - 二级评分（通过/不通过）
 * - 基线/上限规则：连续10项通过建立基线，连续10项不通过终止评估
 * - 根据学生年龄确定起始评估阶段
 * - 粗分 -> 标准分（SQ）查表换算
 *
 * @module strategies/assessment/SMDriver
 */

import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  AssessmentState,
  NavigationDecision,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore
} from '@/types/assessment'
import { BaseDriver } from './BaseDriver'
import { smQuestions, type SMQuestion } from '@/database/sm-questions'
import { calculateSQScore, getEvaluationLevel } from '@/database/sm-norms'

/**
 * S-M 量表驱动器实现
 */
export class SMDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'sm'
  readonly scaleName = '婴儿-初中生社会生活能力量表'
  readonly version = '2.0.0'
  readonly ageRange = { min: 6, max: 180 }  // 6个月 - 15岁
  readonly totalQuestions = 132

  // S-M 特有维度
  readonly dimensions = [
    '交往',
    '作业',
    '运动能力',
    '独立生活能力',
    '自我管理',
    '集体活动'
  ]

  // S-M 特有配置
  private readonly PASS_THRESHOLD = 10   // 连续通过阈值
  private readonly FAIL_THRESHOLD = 10   // 连续不通过阈值

  // 题目缓存（按ID排序）
  private sortedQuestions: SMQuestion[] = []

  constructor() {
    super()
    // 初始化时按ID排序题目
    this.sortedQuestions = [...smQuestions].sort((a, b) => a.id - b.id)
  }

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   * 将 S-M 原始题目转换为通用 ScaleQuestion 格式
   */
  getQuestions(context: StudentContext): ScaleQuestion[] {
    return this.sortedQuestions.map(q => this.convertToScaleQuestion(q))
  }

  /**
   * 获取起始题目索引
   * 根据学生月龄确定起始年龄阶段，返回该阶段第一题的索引
   */
  getStartIndex(context: StudentContext): number {
    const stage = this.getAgeStage(context.ageInMonths)
    const idx = this.sortedQuestions.findIndex(q => q.age_stage === stage)
    return Math.max(0, idx)
  }

  // ========== 跳题逻辑（S-M 特有）==========

  /**
   * 【核心重写】获取下一个题目的导航决策
   *
   * S-M 量表的跳题逻辑：
   * 1. 检查是否达到上限（连续10项不通过）-> 评估结束
   * 2. 检查是否需要向后跳转（基线未建立，起始阶段未全通过）
   * 3. 检查是否建立基线（当前阶段全部通过）
   * 4. 默认进入下一题
   */
  getNextQuestion(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState
  ): NavigationDecision {
    const questions = this.sortedQuestions

    // 初始化元数据（确保所有属性都被正确初始化）
    if (!state.metadata) {
      // 计算起始索引（第一次调用时记录）
      const startStage = this.sortedQuestions[currentIndex]?.age_stage || 1
      const calculatedStartIndex = this.sortedQuestions.findIndex(q => q.age_stage === startStage)

      state.metadata = {
        basalEstablished: false,      // 是否已建立基线
        basalStage: null,             // 基线所在阶段
        visitedStages: [],            // 已访问的阶段
        startIndex: Math.max(0, calculatedStartIndex),  // 起始题目索引
        startStage: startStage        // 起始年龄阶段
      }
    }
    // 确保 visitedStages 数组存在
    if (!state.metadata.visitedStages) {
      state.metadata.visitedStages = []
    }

    const currentQuestion = questions[currentIndex]
    if (!currentQuestion) {
      return { action: 'complete', message: '评估已完成' }
    }

    // 记录已访问阶段
    const currentStage = currentQuestion.age_stage
    if (!state.metadata.visitedStages.includes(currentStage)) {
      state.metadata.visitedStages.push(currentStage)
    }

    // 1. 检查是否达到上限（连续10项不通过）
    const ceilingCheck = this.checkCeilingReached(currentIndex, answers)
    if (ceilingCheck.reached) {
      return {
        action: 'complete',
        message: '根据S-M评估规则，连续10项不通过，评估自动结束'
      }
    }

    // 2. 检查是否需要向后跳转（基线未建立时）
    if (!state.metadata.basalEstablished) {
      const backwardJump = this.checkBackwardJump(currentIndex, answers, state)
      if (backwardJump) {
        return backwardJump
      }
    }

    // 3. 检查是否建立基线（当前阶段全部通过）
    const basalCheck = this.checkBasalEstablished(currentIndex, answers)
    if (basalCheck.established && !state.metadata.basalEstablished) {
      state.metadata.basalEstablished = true
      state.metadata.basalStage = basalCheck.stage
      // 基线建立，继续向前评估
    }

    // 4. 检查是否到达最后一题
    if (currentIndex >= questions.length - 1) {
      return { action: 'complete', message: '评估已完成' }
    }

    // 5. 默认进入下一题
    return { action: 'next' }
  }

  // ========== 评分计算 ==========

  /**
   * 计算评分结果
   *
   * S-M 量表粗分计算规则：
   * 1. 找到连续10项通过的位置
   * 2. 根据该位置所在阶段确定基础分
   * 3. 粗分 = 基础分 + 连续10项通过后的通过题目数
   * 4. 查表获取标准分（SQ）
   * 5. 确定评定等级
   */
  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult {
    // 获取起始年龄阶段
    const startStage = this.getAgeStage(context.ageInMonths)

    // 1. 根据S-M量表规则计算粗分
    const rawScore = this.calculateSMRawScore(answers, startStage)

    // 2. 查表获取标准分（SQ）
    const standardScore = calculateSQScore(rawScore, context.ageInMonths)

    // 3. 确定评定等级
    const level = getEvaluationLevel(standardScore)

    // 4. 计算各维度分数
    const dimensions = this.calculateSMDimensionScores(answers)

    // 5. 统计答题时长
    const timing = this.calculateTiming(answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: rawScore,
      standardScore,
      level,
      levelCode: this.getLevelCode(standardScore),
      dimensions,
      rawAnswers: this.serializeAnswers(answers),
      timing
    }
  }

  // ========== 反馈生成 ==========

  /**
   * 生成评估反馈和 IEP 建议
   */
  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const level = scoreResult.level
    const sq = scoreResult.standardScore || 10

    // 根据等级生成总体评价
    const summary = this.generateSummary(level, sq)

    // 分析优势和弱势维度
    const { strengths, weaknesses } = this.analyzeDimensions(scoreResult.dimensions)

    // 生成 IEP 建议
    const recommendations = this.generateRecommendations(level, weaknesses)

    // 训练重点
    const trainingFocus = this.generateTrainingFocus(weaknesses)

    return {
      summary,
      strengths,
      weaknesses,
      recommendations,
      trainingFocus,
      homeGuidance: this.generateHomeGuidance(level)
    }
  }

  // ========== 可选方法 ==========

  /**
   * 【重写】计算进度百分比
   * S-M 量表：基于从起始阶段开始的题目计算进度
   */
  calculateProgress(state: AssessmentState): number {
    const answeredCount = Object.keys(state.answers).length
    // 获取起始索引（从 metadata 中获取，或根据当前状态估算）
    const startIndex = state.metadata?.startIndex || 0
    // 计算从起始位置到最后的题目数
    const questionsFromStart = this.totalQuestions - startIndex
    if (questionsFromStart <= 0) return 100
    return Math.min(100, Math.round((answeredCount / questionsFromStart) * 100))
  }

  /**
   * 获取从起始阶段开始的题目数量
   */
  getQuestionsFromStart(state: AssessmentState): number {
    // 优先使用 metadata 中的 startIndex（在 AssessmentContainer 初始化时设置）
    if (state.metadata?.startIndex !== undefined) {
      return this.totalQuestions - state.metadata.startIndex
    }
    // 默认返回总题数
    return this.totalQuestions
  }

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: 'S-M 社会生活能力量表评估',
      intro: '在填写这份量表前，请您放轻松。这不仅是一次评估，更是我们共同了解孩子"生活智慧"的过程。',
      sections: [
        {
          icon: '🏠',
          title: '这不是考试，无关成绩',
          content: '我们关注的是孩子在生活中如何照顾自己、如何与人交往，这与幼儿园或学校的文化课成绩完全无关。'
        },
        {
          icon: '🌱',
          title: '接纳差异，允许"不会"',
          content: '量表涵盖了从婴儿到初中生的广泛内容。如果您的孩子有些项目还不会做，这是非常正常的，因为每个孩子的年龄和成长节奏都不同。'
        },
        {
          icon: '👩‍🏫',
          title: '谁来填写最合适？',
          content: '请由每天陪伴孩子、最了解孩子日常起居的人（如父母、主要抚养人或经常与孩子接触的老师）来回答。'
        },
        {
          icon: '💖',
          title: '真实是最大的帮助',
          content: '请依据孩子平时的实际表现（而非"他应该会"或"偶尔会"）坦率回答。您真实的反馈，是我们为孩子提供个性化支持的基石。'
        }
      ],
      footer: '感谢您的真诚与合作，让我们一起支持孩子更好地适应生活！'
    }
  }

  // ========== 私有方法：题目转换 ==========

  /**
   * 将 S-M 原始题目转换为通用 ScaleQuestion 格式
   */
  private convertToScaleQuestion(q: SMQuestion): ScaleQuestion {
    return {
      id: q.id,
      dimension: q.dimension,
      dimensionName: q.dimension,
      content: q.title,
      options: [
        {
          value: 1,
          label: '通过',
          description: '学生能够完成该项能力',
          score: 1
        },
        {
          value: 0,
          label: '不通过',
          description: '学生不能完成该项能力',
          score: 0
        }
      ],
      metadata: {
        age_stage: q.age_stage,
        age_min: q.age_min,
        age_max: q.age_max
      },
      audioPath: q.audio
    }
  }

  // ========== 私有方法：年龄阶段计算 ==========

  /**
   * 根据月龄获取对应的年龄阶段
   */
  private getAgeStage(ageInMonths: number): number {
    if (ageInMonths >= 0 && ageInMonths <= 23) return 1
    if (ageInMonths >= 24 && ageInMonths <= 41) return 2
    if (ageInMonths >= 42 && ageInMonths <= 59) return 3
    if (ageInMonths >= 60 && ageInMonths <= 77) return 4
    if (ageInMonths >= 78 && ageInMonths <= 101) return 5
    if (ageInMonths >= 102 && ageInMonths <= 125) return 6
    return 7  // 126个月及以上
  }

  // ========== 私有方法：跳题逻辑 ==========

  /**
   * 检查是否达到上限（连续10项不通过）
   */
  private checkCeilingReached(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>
  ): { reached: boolean; position?: number } {
    // 从当前位置向前查找连续不通过
    let consecutiveFail = 0
    for (let i = currentIndex; i >= 0; i--) {
      const q = this.sortedQuestions[i]
      if (!q) continue
      const answer = answers[q.id]

      if (!answer) break

      if (answer.score === 0) {
        consecutiveFail++
        if (consecutiveFail >= this.FAIL_THRESHOLD) {
          console.log(`[SMDriver] 上限达到：从题目${q.id}开始连续${consecutiveFail}项不通过`)
          return { reached: true, position: i }
        }
      } else {
        consecutiveFail = 0
      }
    }

    // 从当前位置向后查找连续不通过（已经作答的部分）
    consecutiveFail = 0
    for (let i = 0; i < this.sortedQuestions.length; i++) {
      const q = this.sortedQuestions[i]
      if (!q) continue
      const answer = answers[q.id]

      if (!answer) continue

      if (answer.score === 0) {
        consecutiveFail++
        if (consecutiveFail >= this.FAIL_THRESHOLD) {
          console.log(`[SMDriver] 上限达到：从题目${q.id}开始连续${consecutiveFail}项不通过`)
          return { reached: true, position: i }
        }
      } else {
        consecutiveFail = 0
      }
    }

    return { reached: false }
  }

  /**
   * 检查是否需要向后跳转（基线未建立时）
   */
  private checkBackwardJump(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState
  ): NavigationDecision | null {
    const currentQuestion = this.sortedQuestions[currentIndex]
    if (!currentQuestion) return null

    const currentStage = currentQuestion.age_stage

    // 检查当前阶段是否全部回答且不全是通过
    const stageQuestions = this.sortedQuestions.filter(q => q.age_stage === currentStage)
    const stageAnswers = stageQuestions.map(q => answers[q.id])

    // 如果当前阶段还有未回答的题目，继续评估
    const hasUnanswered = stageAnswers.some(a => a === undefined)
    if (hasUnanswered) return null

    // 检查是否全部通过
    const allPassed = stageAnswers.every(a => a?.score === 1)
    if (allPassed) {
      // 当前阶段全通过，建立基线
      return null
    }

    // 当前阶段未全通过，需要检查是否需要向后跳转
    // 如果当前阶段不是第1阶段，且前一个阶段未被访问
    const visitedStages = state.metadata?.visitedStages || []
    if (currentStage > 1 && !visitedStages.includes(currentStage - 1)) {
      const prevStageStart = this.sortedQuestions.findIndex(q => q.age_stage === currentStage - 1)
      if (prevStageStart >= 0) {
        console.log(`[SMDriver] 向后跳转：从阶段${currentStage}跳转到阶段${currentStage - 1}`)
        return {
          action: 'jump',
          targetIndex: prevStageStart,
          message: `当前阶段未全通过，继续评估第${currentStage - 1}阶段`
        }
      }
    }

    return null
  }

  /**
   * 检查是否建立基线（当前阶段全部通过）
   */
  private checkBasalEstablished(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>
  ): { established: boolean; stage?: number } {
    const currentQuestion = this.sortedQuestions[currentIndex]
    if (!currentQuestion) return { established: false }

    const currentStage = currentQuestion.age_stage
    const stageQuestions = this.sortedQuestions.filter(q => q.age_stage === currentStage)

    // 检查当前阶段是否全部回答且全部通过
    let allAnswered = true
    let allPassed = true

    for (const q of stageQuestions) {
      const answer = answers[q.id]
      if (!answer) {
        allAnswered = false
        break
      }
      if (answer.score !== 1) {
        allPassed = false
      }
    }

    if (allAnswered && allPassed && stageQuestions.length >= 10) {
      console.log(`[SMDriver] 基线建立：第${currentStage}阶段全部通过`)
      return { established: true, stage: currentStage }
    }

    return { established: false }
  }

  // ========== 私有方法：评分计算 ==========

  /**
   * 根据S-M量表官方规则计算粗分
   *
   * 规则说明：
   * - 找到连续10项通过的位置
   * - 该位置所在阶段之前的所有题目视为通过（基础分）
   * - 粗分 = 基础分 + 连续10项通过后的通过题目数
   */
  private calculateSMRawScore(
    answers: Record<string, ScaleAnswer>,
    startStage: number
  ): number {
    const allQuestions = this.sortedQuestions

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

    // 获取起始阶段的第一个题目索引
    const startIndex = allQuestions.findIndex(q => q.age_stage === startStage)

    console.log('[SMDriver] 粗分计算 - 起始阶段:', startStage, ', 起始索引:', startIndex)

    // 查找连续10项通过的位置
    let tenPassStartIndex = -1
    let tenPassEndIndex = -1

    // Phase 1: 从起始阶段向前搜索
    let consecutivePass = 0
    for (let i = Math.max(0, startIndex); i < allQuestions.length; i++) {
      const currentQuestion = allQuestions[i]
      if (!currentQuestion) continue
      const qid = currentQuestion.id
      const answer = answers[qid]
      if (!answer) break

      if (answer.score === 1) {
        consecutivePass++
        if (consecutivePass === 10) {
          tenPassStartIndex = i - 9
          tenPassEndIndex = i
          const startQuestion = allQuestions[tenPassStartIndex]
          console.log('[SMDriver] 向前搜索：发现连续10项通过，从题目', startQuestion?.id, '到', currentQuestion.id)
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
        const currentQuestion = allQuestions[i]
        if (!currentQuestion) continue
        const qid = currentQuestion.id
        const answer = answers[qid]
        if (!answer) break

        if (answer.score === 1) {
          consecutivePass++
          if (consecutivePass === 10) {
            tenPassStartIndex = i
            tenPassEndIndex = i + 9
            const endQuestion = allQuestions[tenPassEndIndex]
            console.log('[SMDriver] 向后搜索：发现连续10项通过，从题目', currentQuestion.id, '到', endQuestion?.id)
            break
          }
        } else {
          consecutivePass = 0
        }
      }
    }

    // 确定有效的基础分和通过题目数
    let effectiveBaseScore = stageBaseScores[startStage] || 0
    let finalPassedCount = 0

    if (tenPassStartIndex !== -1) {
      // 找到了连续10项通过，确定有效的年龄阶段和基础分
      const tenPassQuestion = allQuestions[tenPassStartIndex]
      if (!tenPassQuestion) {
        return effectiveBaseScore
      }
      const effectiveAgeStage = tenPassQuestion.age_stage
      effectiveBaseScore = stageBaseScores[effectiveAgeStage] || 0

      console.log('[SMDriver] 连续10项通过起始题目所在阶段:', effectiveAgeStage, ', 使用基础分:', effectiveBaseScore)

      // S-M规则：连续10项通过，前面所有项目视为通过
      // 1. 连续10项通过本身
      finalPassedCount = 10

      // 2. 连续10项通过之后的通过题目
      for (let i = tenPassEndIndex + 1; i < allQuestions.length; i++) {
        const currentQuestion = allQuestions[i]
        if (!currentQuestion) continue
        const qid = currentQuestion.id
        const answer = answers[qid]
        if (answer) {
          if (answer.score === 1) {
            finalPassedCount++
          }
        } else {
          break
        }
      }

      console.log('[SMDriver] S-M规则计算：基础分', effectiveBaseScore, '+ 通过数', finalPassedCount)
    } else {
      // 没有找到连续10项通过，只计算实际通过的题目
      console.log('[SMDriver] 没有连续10项通过，只计算实际通过题目')
      for (const qid in answers) {
        const answer = answers[qid]
        if (answer?.score === 1) {
          finalPassedCount++
        }
      }
    }

    const finalRawScore = effectiveBaseScore + finalPassedCount
    console.log('[SMDriver] 最终粗分:', finalRawScore)

    return finalRawScore
  }

  /**
   * 计算各维度分数
   */
  private calculateSMDimensionScores(answers: Record<string, ScaleAnswer>): DimensionScore[] {
    const dimensionMap = new Map<string, { passed: number; total: number }>()

    // 初始化维度
    for (const dim of this.dimensions) {
      dimensionMap.set(dim, { passed: 0, total: 0 })
    }

    // 统计各维度得分
    for (const q of this.sortedQuestions) {
      const answer = answers[q.id]
      if (answer) {
        const dim = dimensionMap.get(q.dimension)
        if (dim) {
          dim.total++
          if (answer.score === 1) {
            dim.passed++
          }
        }
      }
    }

    // 转换为 DimensionScore 数组
    return Array.from(dimensionMap.entries()).map(([name, data]) => ({
      code: name,
      name,
      rawScore: data.passed,
      itemCount: data.total,
      passedCount: data.passed,
      averageScore: data.total > 0 ? data.passed / data.total : 0
    }))
  }

  /**
   * 获取等级代码
   */
  private getLevelCode(sqScore: number): string {
    if (sqScore <= 5) return 'severe'        // 极重度
    if (sqScore === 6) return 'heavy'        // 重度
    if (sqScore === 7) return 'moderate'     // 中度
    if (sqScore === 8) return 'mild'         // 轻度
    if (sqScore === 9) return 'borderline'   // 边缘
    if (sqScore === 10) return 'normal'      // 正常
    if (sqScore === 11) return 'high_normal' // 高常
    return 'excellent'                        // 优秀
  }

  // ========== 私有方法：反馈生成 ==========

  /**
   * 生成总体评价
   */
  private generateSummary(level: string, sq: number): string {
    const summaries: Record<string, string> = {
      '极重度': `该学生的社会生活能力标准分为${sq}分，处于极重度水平。在日常生活自理、社会交往等方面存在显著困难，需要全面的专业支持和家庭照护。`,
      '重度': `该学生的社会生活能力标准分为${sq}分，处于重度水平。在多数生活技能方面需要持续的指导和支持，建议制定详细的个别化训练计划。`,
      '中度': `该学生的社会生活能力标准分为${sq}分，处于中度水平。在部分生活技能方面需要定期辅助，有较大的提升空间。`,
      '轻度': `该学生的社会生活能力标准分为${sq}分，处于轻度水平。基本生活能力尚可，但在某些特定领域需要适当支持和训练。`,
      '边缘': `该学生的社会生活能力标准分为${sq}分，处于边缘水平。整体能力接近同龄人平均水平，建议针对性加强薄弱环节。`,
      '正常': `该学生的社会生活能力标准分为${sq}分，处于正常水平。各项生活技能发展良好，能够适应日常生活需要。`,
      '高常': `该学生的社会生活能力标准分为${sq}分，处于高于平均水平。在生活自理和社会适应方面表现优秀。`,
      '优秀': `该学生的社会生活能力标准分为${sq}分，处于优秀水平。在日常生活和社会交往方面表现出色，具备较强的独立能力。`
    }
    return summaries[level] || `该学生的社会生活能力标准分为${sq}分，评定等级为${level}。`
  }

  /**
   * 生成 IEP 建议
   */
  private generateRecommendations(level: string, weaknesses: string[]): string[] {
    const baseRecommendations: string[] = []

    // 根据等级添加基础建议
    if (['极重度', '重度', '中度'].includes(level)) {
      baseRecommendations.push('建议进行更详细的专业评估，确定具体的干预方向')
      baseRecommendations.push('制定结构化的日常生活训练计划，从简单技能开始逐步训练')
      baseRecommendations.push('在家庭和学校环境中保持一致的训练要求和期待')
    }

    if (['轻度', '边缘'].includes(level)) {
      baseRecommendations.push('针对性加强薄弱环节的训练')
      baseRecommendations.push('创造更多实践机会，鼓励独立完成生活任务')
    }

    // 根据弱势维度添加具体建议
    if (weaknesses.some(w => w.includes('独立生活能力'))) {
      baseRecommendations.push('加强日常生活自理能力训练，如穿衣、洗漱、进食等')
    }
    if (weaknesses.some(w => w.includes('交往'))) {
      baseRecommendations.push('增加社交互动机会，培养基本的社交礼仪和沟通技能')
    }
    if (weaknesses.some(w => w.includes('运动能力'))) {
      baseRecommendations.push('加强大运动和精细动作训练，提高身体协调性')
    }
    if (weaknesses.some(w => w.includes('自我管理'))) {
      baseRecommendations.push('培养时间管理和情绪调控能力，建立规律的生活作息')
    }
    if (weaknesses.some(w => w.includes('集体活动'))) {
      baseRecommendations.push('鼓励参与集体活动，培养合作意识和规则意识')
    }

    return baseRecommendations
  }

  /**
   * 生成训练重点
   */
  private generateTrainingFocus(weaknesses: string[]): string[] {
    const focus: string[] = []

    for (const w of weaknesses) {
      if (w.includes('独立生活能力')) {
        focus.push('日常生活技能训练')
      }
      if (w.includes('交往')) {
        focus.push('社交沟通能力培养')
      }
      if (w.includes('运动能力')) {
        focus.push('运动协调训练')
      }
      if (w.includes('自我管理')) {
        focus.push('自我管理能力提升')
      }
      if (w.includes('集体活动')) {
        focus.push('集体活动参与能力')
      }
      if (w.includes('作业')) {
        focus.push('动手操作能力训练')
      }
    }

    // 去重并限制数量
    return [...new Set(focus)].slice(0, 3)
  }

  /**
   * 生成家庭指导建议
   */
  private generateHomeGuidance(level: string): string[] {
    const guidance: string[] = [
      '家长应以鼓励和支持为主，避免过度包办代替',
      '在日常生活中创造让孩子独立完成任务的机会',
      '保持耐心，允许孩子犯错和从中学习',
      '及时给予正向反馈，增强孩子的自信心'
    ]

    if (['极重度', '重度'].includes(level)) {
      guidance.push('建议寻求专业康复机构的支持和指导')
      guidance.push('家庭成员间保持一致的教育方式和期待')
    }

    return guidance
  }

  // ========== 重写基类方法 ==========

  protected getDefaultDescription(): string {
    return '评估儿童日常生活和社会适应能力的发展水平'
  }

  protected getEstimatedTime(): number {
    return 15
  }

  protected getIcon(): string {
    return '📊'
  }
}
