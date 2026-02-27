/**
 * 量表驱动器抽象基类
 *
 * 提供通用的评估逻辑实现，具体量表驱动器可继承并重写特有方法
 *
 * @module strategies/assessment/BaseDriver
 */

import type {
  ScaleDriver,
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  AssessmentState,
  NavigationDecision,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore,
  ScaleInfo
} from '@/types/assessment'

/**
 * 量表驱动器抽象基类
 *
 * 提供以下通用功能：
 * - serializeAnswers: 序列化答案为存储格式
 * - calculateProgress: 默认基于"已答题数 / 总题数"的进度计算
 * - getNextQuestion: 默认的线性跳转逻辑（非跳题类量表直接复用）
 * - getScaleInfo: 默认的量表信息获取
 * - analyzeDimensions: 维度分析通用逻辑
 */
export abstract class BaseDriver implements ScaleDriver {
  // ========== 抽象属性（子类必须实现）==========

  abstract readonly scaleCode: string
  abstract readonly scaleName: string
  abstract readonly version: string
  abstract readonly ageRange: { min: number; max: number }
  abstract readonly totalQuestions: number
  abstract readonly dimensions: string[]

  // ========== 抽象方法（子类必须实现）==========

  /**
   * 获取题目列表
   */
  abstract getQuestions(context: StudentContext): ScaleQuestion[]

  /**
   * 获取起始题目索引
   */
  abstract getStartIndex(context: StudentContext): number

  /**
   * 计算评分结果
   */
  abstract calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext
  ): ScoreResult

  /**
   * 生成评估反馈和 IEP 建议
   */
  abstract generateFeedback(scoreResult: ScoreResult): AssessmentFeedback

  // ========== 通用实现（子类可直接复用或重写）==========

  /**
   * 获取下一个题目的导航决策
   *
   * 默认实现：线性跳转（适用于非跳题类量表，如 WeeFIM、CSIRS）
   * 跳题类量表（如 S-M）应重写此方法
   */
  getNextQuestion(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState
  ): NavigationDecision {
    // 优先使用 state.metadata.totalQuestions（由 AssessmentContainer 初始化时设置）
    // 这对于根据年龄动态调整题目的量表（如 CSIRS）非常重要
    const totalQuestions = state.metadata?.totalQuestions ?? this.totalQuestions

    // 检查是否到达最后一题
    if (currentIndex >= totalQuestions - 1) {
      return { action: 'complete', message: '评估已完成' }
    }

    // 默认进入下一题
    return { action: 'next' }
  }

  /**
   * 计算进度百分比
   *
   * 默认实现：已答题数 / 总题数
   */
  calculateProgress(state: AssessmentState): number {
    const answeredCount = Object.keys(state.answers).length
    const total = this.totalQuestions
    if (total <= 0) return 0
    return Math.min(100, Math.round((answeredCount / total) * 100))
  }

  /**
   * 获取量表基本信息
   */
  getScaleInfo(): ScaleInfo {
    return {
      code: this.scaleCode,
      name: this.scaleName,
      version: this.version,
      description: this.getDefaultDescription(),
      ageRange: this.ageRange,
      totalQuestions: this.totalQuestions,
      dimensions: this.dimensions,
      estimatedTime: this.getEstimatedTime(),
      icon: this.getIcon()
    }
  }

  /**
   * 获取欢迎对话框内容（可选实现）
   */
  getWelcomeContent?(): {
    title: string
    intro: string
    sections: Array<{
      icon: string
      title: string
      content: string
    }>
    footer?: string
  }

  // ========== 受保护的工具方法（子类可调用）==========

  /**
   * 序列化答案为存储格式
   *
   * 将 ScaleAnswer 对象转换为可存储的简化格式
   */
  protected serializeAnswers(answers: Record<string, ScaleAnswer>): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(answers)) {
      result[key] = {
        v: value.value,
        s: value.score,
        t: value.timestamp
      }
    }
    return result
  }

  /**
   * 计算答题时长统计
   */
  protected calculateTiming(answers: Record<string, ScaleAnswer>): {
    totalTime: number
    averageTime: number
  } {
    const answerValues = Object.values(answers)
    const totalTime = answerValues.reduce((sum, a) => sum + (a.responseTime || 0), 0)
    return {
      totalTime,
      averageTime: answerValues.length > 0 ? totalTime / answerValues.length : 0
    }
  }

  /**
   * 分析维度得分（通用实现）
   *
   * @param answers 答案记录
   * @param questions 题目列表
   * @param dimensionExtractor 从题目提取维度的函数
   */
  protected analyzeDimensionScores(
    answers: Record<string, ScaleAnswer>,
    questions: ScaleQuestion[],
    dimensionExtractor?: (q: ScaleQuestion) => string
  ): DimensionScore[] {
    const dimensionMap = new Map<string, { total: number; score: number; count: number }>()

    for (const q of questions) {
      const dimension = dimensionExtractor ? dimensionExtractor(q) : q.dimension
      if (!dimension) continue

      if (!dimensionMap.has(dimension)) {
        dimensionMap.set(dimension, { total: 0, score: 0, count: 0 })
      }

      const dim = dimensionMap.get(dimension)!
      const answer = answers[q.id]
      if (answer) {
        dim.count++
        dim.score += answer.score
        dim.total++
      }
    }

    return Array.from(dimensionMap.entries()).map(([name, data]) => ({
      code: name,
      name,
      rawScore: data.score,
      itemCount: data.count,
      passedCount: data.score,
      averageScore: data.count > 0 ? data.score / data.count : 0
    }))
  }

  /**
   * 分析优势和弱势维度
   *
   * @param dimensions 维度分数数组
   * @param threshold 差异阈值（默认 0.15）
   */
  protected analyzeDimensions(
    dimensions: DimensionScore[],
    threshold: number = 0.15
  ): { strengths: string[]; weaknesses: string[] } {
    if (dimensions.length === 0) {
      return { strengths: [], weaknesses: [] }
    }

    // 计算平均通过率
    const avgRate = dimensions.reduce((sum, d) => sum + (d.averageScore || 0), 0) / dimensions.length

    const strengths: string[] = []
    const weaknesses: string[] = []

    for (const dim of dimensions) {
      const rate = dim.averageScore || 0
      if (rate >= avgRate + threshold) {
        strengths.push(`${dim.name}（${Math.round(rate * 100)}%）`)
      } else if (rate <= avgRate - threshold) {
        weaknesses.push(`${dim.name}（${Math.round(rate * 100)}%）`)
      }
    }

    return { strengths, weaknesses }
  }

  /**
   * 获取默认描述（子类可重写）
   */
  protected getDefaultDescription(): string {
    return `${this.scaleName}评估`
  }

  /**
   * 获取预估用时（分钟）
   * 默认：每题约 0.5 分钟
   */
  protected getEstimatedTime(): number {
    return Math.ceil(this.totalQuestions * 0.5)
  }

  /**
   * 获取量表图标（子类可重写）
   */
  protected getIcon(): string {
    return '📋'
  }

  /**
   * 验证答案值是否在有效范围内
   */
  protected validateScoreRange(score: number, min: number, max: number): boolean {
    return score >= min && score <= max
  }

  /**
   * 安全获取答案分数
   */
  protected getAnswerScore(answers: Record<string, ScaleAnswer>, questionId: number | string, defaultValue: number = 0): number {
    const answer = answers[questionId]
    return answer ? answer.score : defaultValue
  }
}
