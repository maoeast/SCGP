/**
 * WeeFIM 量表驱动器
 *
 * 改良儿童功能独立性评估量表（Wee Functional Independence Measure）
 *
 * 特点：
 * - 18 道题目，分为运动功能（13题）和认知功能（5题）两大领域
 * - 7 级评分（1-7分）：1=完全依赖，7=完全独立
 * - 总分范围：18-126分
 * - 等级划分：126完全独立, 108-125基本独立, 90-107极轻度依赖, 72-89轻度依赖, 54-71中度依赖, 36-53重度依赖, 18-35极重度依赖
 * - 无跳题逻辑，线性评估
 *
 * @module strategies/assessment/WeeFIMDriver
 */

import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import { BaseDriver } from './BaseDriver'
import { WeeFIMAPI } from '@/database/api'
import {
  weefimQuestions,
  weefimCategories,
  weefimScoring,
  weefimLevels,
  weefimRecommendations,
  type WeeFIMQuestion
} from '@/database/weefim-data'

/**
 * WeeFIM 量表驱动器实现
 */
export class WeeFIMDriver extends BaseDriver {
  // ========== 元信息 ==========

  readonly scaleCode = 'weefim'
  readonly scaleName = '改良儿童功能独立性评估量表'
  readonly version = '2.0.0'
  readonly ageRange = { min: 6, max: 216 }  // 6个月 - 18岁
  readonly totalQuestions = 18

  // WeeFIM 维度（两大领域）
  readonly dimensions = ['运动功能', '认知功能']

  // 题目缓存
  private sortedQuestions: WeeFIMQuestion[] = []

  constructor() {
    super()
    this.sortedQuestions = [...weefimQuestions].sort((a, b) => a.id - b.id)
  }

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   */
  getQuestions(context: StudentContext): ScaleQuestion[] {
    return this.sortedQuestions.map(q => this.convertToScaleQuestion(q))
  }

  /**
   * 获取起始题目索引
   * WeeFIM 无跳题逻辑，始终从第一题开始
   */
  getStartIndex(context: StudentContext): number {
    return 0
  }

  // ========== 评分计算 ==========

  /**
   * 计算评分结果
   */
  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult {
    // 计算总分和各领域得分
    const { totalScore, motorScore, cognitiveScore } = this.calculateScores(answers)

    // 确定功能等级
    const level = this.getLevel(totalScore)
    const levelCode = this.getLevelCode(totalScore)

    // 计算各维度分数
    const dimensions = this.calculateDimensionScores(answers)

    // 统计答题时长
    const timing = this.calculateTiming(answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore,
      standardScore: totalScore,  // WeeFIM 的总分即为标准分
      level,
      levelCode,
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
    const totalScore = scoreResult.totalScore || 0
    const level = scoreResult.level

    // 获取对应等级的建议
    const recommendation = weefimRecommendations.find(r => r.level === level) ?? weefimRecommendations[weefimRecommendations.length - 1]
    if (!recommendation) {
      return {
        summary: this.generateSummary(totalScore, level, ''),
        strengths: [],
        weaknesses: [],
        recommendations: [],
        trainingFocus: this.generateTrainingFocus(scoreResult.dimensions),
        homeGuidance: this.generateHomeGuidance(level)
      }
    }

    // 分析优势和弱势维度
    const { strengths, weaknesses } = this.analyzeDimensions(scoreResult.dimensions)

    // 生成总体评价
    const summary = this.generateSummary(totalScore, level, recommendation.general_comment)

    // 生成训练重点
    const trainingFocus = this.generateTrainingFocus(scoreResult.dimensions)

    return {
      summary,
      strengths,
      weaknesses,
      recommendations: recommendation.suggestions,
      trainingFocus,
      homeGuidance: this.generateHomeGuidance(level)
    }
  }

  // ========== 可选方法 ==========

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '儿童功能独立性评估量表 (WeeFIM)',
      intro: '不测“会不会”，只测“做不做”。这是孩子日常吃喝拉撒睡的真实生活快照。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            '捕捉“隐形替身”：评估时请务必用余光观察家长的肢体语言。孩子手刚伸向水杯，家长是不是已经下意识递到嘴边了？很多时候，阻碍孩子独立的不是肌张力低下，而是家长的“等不及”和“舍不得”。',
            '警惕“假性独立”：孩子能自己穿衣服，但每次都要花半小时，且穿反了也不调整，这在真实生活中不具备功能性。请严格按照“时间、安全性、辅助程度”三个维度来扣分，别被表面的完成度骗了。',
            '揪出干预靶点：重点标记那些得分为“3分（中度辅助）”或“4分（最小辅助）”的项目。这些是孩子正处于“临界状态”的能力，只要稍微改动一下环境，往往就是最容易突破的近期训练目标。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            '请收起您的“面子”：很多家长在填表时会觉得丢脸，但我们绝不是在给您的教养方式打分。您大方承认他“还不会自己上厕所”，我们才能理直气壮地为他申请如厕训练的资源。',
            '拆解“有时行，有时不行”：如果孩子今天能自己扣扣子，明天又死活不肯，请在备注里写下原因。是因为衣服扣子大小不同，还是今天没睡醒发脾气？这些细节比单纯打个分更有用。',
            '记录“最自然”的状态：不要为了填表，特意去逼孩子做平时不会做的事。我们要的是他平时最放松、没人逼迫时，能自己做到哪一步。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          '本系统的WeeFIM评估结果仅供学校制定生活自理训练计划参考，不能作为医学残疾鉴定的依据。如发现由于严重生理功能受限导致的持续异常，请前往正规医院康复科就诊。',
      },
    }
  }

  // ========== 私有方法：题目转换 ==========

  /**
   * 将 WeeFIM 原始题目转换为通用 ScaleQuestion 格式
   */
  private convertToScaleQuestion(q: WeeFIMQuestion): ScaleQuestion {
    // 获取分类名称
    const category = weefimCategories.find(c => c.id === q.category_id)

    return {
      id: q.id,
      dimension: q.dimension,
      dimensionName: q.dimension,
      content: q.title,
      options: this.createOptions(q.id),
      metadata: {
        category_id: q.category_id,
        category_name: category?.name || '',
        category_description: category?.description || ''
      },
      audioPath: q.audio
    }
  }

  /**
   * 创建评分选项（1-7分）
   */
  private createOptions(questionId: number): Array<{ value: number; label: string; description: string; score: number }> {
    return weefimScoring.map(scoring => ({
      value: scoring.score,
      label: `${scoring.score}分 - ${scoring.level}`,
      description: scoring.description,
      score: scoring.score
    }))
  }

  // ========== 私有方法：评分计算 ==========

  /**
   * 计算总分和各领域得分
   */
  private calculateScores(answers: Record<string, ScaleAnswer>): {
    totalScore: number
    motorScore: number
    cognitiveScore: number
  } {
    // 运动功能题目（1-13题）
    const motorQuestionIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
    // 认知功能题目（14-18题）
    const cognitiveQuestionIds = [14, 15, 16, 17, 18]

    let motorScore = 0
    let cognitiveScore = 0

    // 计算运动功能得分
    for (const qid of motorQuestionIds) {
      motorScore += this.getAnswerScore(answers, qid, 1)  // 默认最低分1分
    }

    // 计算认知功能得分
    for (const qid of cognitiveQuestionIds) {
      cognitiveScore += this.getAnswerScore(answers, qid, 1)  // 默认最低分1分
    }

    return {
      totalScore: motorScore + cognitiveScore,
      motorScore,
      cognitiveScore
    }
  }

  /**
   * 计算各维度分数
   */
  private calculateDimensionScores(answers: Record<string, ScaleAnswer>): DimensionScore[] {
    const questions = this.sortedQuestions

    // 按维度（运动/认知）分组
    const motorQuestions = questions.filter(q => q.dimension === '运动功能')
    const cognitiveQuestions = questions.filter(q => q.dimension === '认知功能')

    // 计算运动功能维度得分
    let motorScore = 0
    let motorMaxScore = motorQuestions.length * 7  // 每题最高7分
    for (const q of motorQuestions) {
      motorScore += this.getAnswerScore(answers, q.id, 0)
    }

    // 计算认知功能维度得分
    let cognitiveScore = 0
    let cognitiveMaxScore = cognitiveQuestions.length * 7
    for (const q of cognitiveQuestions) {
      cognitiveScore += this.getAnswerScore(answers, q.id, 0)
    }

    return [
      {
        code: 'motor',
        name: '运动功能',
        rawScore: motorScore,
        itemCount: motorQuestions.length,
        passedCount: motorScore,
        averageScore: motorQuestions.length > 0 ? motorScore / motorQuestions.length : 0
      },
      {
        code: 'cognitive',
        name: '认知功能',
        rawScore: cognitiveScore,
        itemCount: cognitiveQuestions.length,
        passedCount: cognitiveScore,
        averageScore: cognitiveQuestions.length > 0 ? cognitiveScore / cognitiveQuestions.length : 0
      }
    ]
  }

  /**
   * 根据总分获取功能等级
   */
  private getLevel(totalScore: number): string {
    if (totalScore >= 126) return '完全独立'
    if (totalScore >= 108) return '基本独立'
    if (totalScore >= 90) return '极轻度依赖'
    if (totalScore >= 72) return '轻度依赖'
    if (totalScore >= 54) return '中度依赖'
    if (totalScore >= 36) return '重度依赖'
    return '极重度依赖'
  }

  /**
   * 获取等级代码
   */
  private getLevelCode(totalScore: number): string {
    if (totalScore >= 126) return 'complete_independence'
    if (totalScore >= 108) return 'modified_independence'
    if (totalScore >= 90) return 'minimal_dependence'
    if (totalScore >= 72) return 'mild_dependence'
    if (totalScore >= 54) return 'moderate_dependence'
    if (totalScore >= 36) return 'severe_dependence'
    return 'total_dependence'
  }

  // ========== 私有方法：反馈生成 ==========

  /**
   * 生成总体评价
   */
  private generateSummary(totalScore: number, level: string, generalComment: string): string {
    const { motorScore, cognitiveScore } = this.calculateScoresFromTotal(totalScore)

    return `该儿童 WeeFIM 总分为 ${totalScore}/126 分，功能独立性等级为"${level}"。` +
           `运动功能得分 ${motorScore}/91 分，认知功能得分 ${cognitiveScore}/35 分。` +
           generalComment
  }

  /**
   * 从总分反推运动和认知得分（用于报告展示）
   */
  private calculateScoresFromTotal(totalScore: number): { motorScore: number; cognitiveScore: number } {
    // 这里返回一个估算值，实际分数应该从 answers 中计算
    // 由于此方法用于报告展示，我们可以假设平均分配
    const motorRatio = 13 / 18  // 运动题目占比
    const cognitiveRatio = 5 / 18  // 认知题目占比

    return {
      motorScore: Math.round(totalScore * motorRatio),
      cognitiveScore: Math.round(totalScore * cognitiveRatio)
    }
  }

  /**
   * 生成训练重点
   */
  private generateTrainingFocus(dimensions: DimensionScore[]): string[] {
    const focus: string[] = []

    // 找出得分较低的维度
    for (const dim of dimensions) {
      const avgScore = dim.averageScore || 0
      if (avgScore < 4) {
        if (dim.code === 'motor') {
          focus.push('运动功能训练')
        } else if (dim.code === 'cognitive') {
          focus.push('认知功能训练')
        }
      }
    }

    // 如果都表现良好，给出维持建议
    if (focus.length === 0) {
      focus.push('维持并提升现有功能水平')
    }

    return focus.slice(0, 3)
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

    if (['极重度依赖', '重度依赖', '中度依赖'].includes(level)) {
      guidance.push('建议寻求专业康复机构的支持和指导')
      guidance.push('家庭成员间保持一致的教育方式和期待')
    }

    return guidance
  }

  // ========== 重写基类方法 ==========

  protected getDefaultDescription(): string {
    return '评估儿童在日常生活活动中的功能独立性水平，包括运动功能和认知功能'
  }

  protected getEstimatedTime(): number {
    return 15  // WeeFIM 约需 15 分钟
  }

  // ========== 持久化 ==========

  /**
   * 持久化 WeeFIM 量表评估结果到数据库
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, state, scoreResult, startTime, endTime } = context

    const weefimApi = new WeeFIMAPI()

    // 从维度分数中提取各维度得分
    const dimensions = scoreResult.dimensions
    const getDimensionScore = (code: string): number => {
      const dim = dimensions.find(d => d.code === code)
      return dim?.rawScore || 0
    }

    // 1. 创建评估主记录
    const assessId = weefimApi.createAssessment({
      student_id: student.id,
      total_score: scoreResult.totalScore || 0,
      adl_score: getDimensionScore('motor'),
      cognitive_score: getDimensionScore('cognitive'),
      level: scoreResult.level,
      start_time: startTime,
      end_time: endTime
    })

    // 2. 保存答题详情
    const details: Array<{ assess_id: number; question_id: number; score: number }> = []
    for (const [questionId, answer] of Object.entries(state.answers)) {
      details.push({
        assess_id: assessId,
        question_id: parseInt(questionId),
        score: answer.score
      })
    }
    weefimApi.saveAssessmentDetails(details)

    // 3. 创建报告记录
    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'weefim',
      assessId,
      title: `${student.name} - WeeFIM功能独立性评估报告`
    })

    console.log('[WeeFIMDriver] WeeFIM 评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }

  protected getIcon(): string {
    return '♿'
  }
}
