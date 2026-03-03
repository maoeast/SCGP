/**
 * SDQ (长处和困难问卷) 驱动器
 *
 * 父母版 25 题，适用于 3-16 岁儿童
 * 3 点计分：0 = 不符合，1 = 有点符合，2 = 完全符合
 *
 * @module strategies/assessment/SDQDriver
 */

import { BaseDriver } from './BaseDriver'
import type {
  StudentContext,
  ScaleQuestion,
  ScaleAnswer,
  ScoreResult,
  AssessmentFeedback,
  DimensionScore
} from '@/types/assessment'
import {
  SDQ_QUESTIONS,
  SDQ_OPTIONS,
  SDQ_DIMENSION_NAMES,
  SDQ_DIMENSION_QUESTIONS,
  SDQ_THRESHOLDS,
  reverseScore,
  isReversedQuestion,
  getSDQScaleQuestions
} from '@/database/sdq-questions'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import type { SDQDimensionCode, SDQLevel } from '@/types/sdq'

// 维度代码列表
const SDQ_DIMENSIONS: SDQDimensionCode[] = [
  'emotional',
  'conduct',
  'hyperactivity',
  'peer',
  'prosocial'
]

// 等级名称映射
const LEVEL_NAMES: Record<SDQLevel, string> = {
  normal: '正常',
  borderline: '边缘',
  abnormal: '异常'
}

/**
 * 根据分数确定等级
 */
function determineLevel(dimension: string, score: number): SDQLevel {
  const threshold = SDQ_THRESHOLDS[dimension]
  if (!threshold) return 'normal'

  if (dimension === 'prosocial') {
    // 亲社会行为：分数越高越好
    if (score >= threshold.normal) return 'normal'
    if (score >= threshold.borderline) return 'borderline'
    return 'abnormal'
  } else {
    // 其他维度：分数越低越好
    if (score <= threshold.normal) return 'normal'
    if (score <= threshold.borderline) return 'borderline'
    return 'abnormal'
  }
}

/**
 * SDQ 驱动器
 */
export class SDQDriver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'sdq'
  readonly scaleName = '长处和困难问卷 (SDQ)'
  readonly version = '父母版'
  readonly ageRange = { min: 36, max: 192 } // 3-16岁（月）
  readonly totalQuestions = 25
  readonly dimensions = SDQ_DIMENSIONS

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   */
  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return getSDQScaleQuestions()
  }

  /**
   * 获取起始题目索引
   */
  getStartIndex(_context: StudentContext): number {
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
    console.log('%c========== SDQ 评分计算开始 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')
    console.log('📋 学生信息:', { id: context.id, name: context.name, ageMonths: context.ageInMonths })

    // 1. 处理答案：对反向题进行计分转换
    const processedScores: Record<string, number> = {}
    for (const q of SDQ_QUESTIONS) {
      const answer = answers[q.id]
      if (answer !== undefined) {
        // 反向计分题需要转换
        if (q.isReversed) {
          processedScores[q.id] = reverseScore(answer.score)
        } else {
          processedScores[q.id] = answer.score
        }
      }
    }

    console.log('%c[Step 1] 原始答案处理（含反向计分转换）', 'color: #FF9800; font-weight: bold;')
    console.log('反向计分题:', [7, 11, 14, 21, 25])
    console.log('处理后得分:', processedScores)

    // 2. 计算各维度分数
    const dimensionScores = this.calculateDimensionScores(processedScores)

    // 3. 计算困难总分（前4个因子之和）
    const totalDifficultiesScore =
      (dimensionScores['emotional']?.rawScore || 0) +
      (dimensionScores['conduct']?.rawScore || 0) +
      (dimensionScores['hyperactivity']?.rawScore || 0) +
      (dimensionScores['peer']?.rawScore || 0)

    // 4. 获取亲社会行为分数
    const prosocialScore = dimensionScores['prosocial']?.rawScore || 0

    // 5. 确定总体等级（基于困难总分）
    const totalLevel = determineLevel('total_difficulties', totalDifficultiesScore)

    // 🔬 输出评分结果
    console.log('%c[Step 2] 维度分数计算结果:', 'color: #4CAF50; font-weight: bold;')
    console.table(Object.entries(dimensionScores).map(([code, data]) => ({
      '维度': SDQ_DIMENSION_NAMES[code],
      '分数': data.rawScore,
      '等级': data.levelName,
      '满分': 10
    })))

    console.log('%c[Step 3] 总分汇总:', 'color: #9C27B0; font-weight: bold;', {
      '困难总分': totalDifficultiesScore,
      '亲社会行为分': prosocialScore,
      '总体等级': LEVEL_NAMES[totalLevel]
    })

    // 6. 构建维度分数数组
    const dimensions: DimensionScore[] = SDQ_DIMENSIONS.map(code => ({
      code,
      name: SDQ_DIMENSION_NAMES[code] || code,
      rawScore: dimensionScores[code]?.rawScore || 0,
      itemCount: 5,
      passedCount: dimensionScores[code]?.rawScore || 0,
      averageScore: (dimensionScores[code]?.rawScore || 0) / 5
    }))

    // 7. 序列化原始答案（存储转换后的分数）
    const rawAnswers: Record<string, number> = {}
    for (const [key, score] of Object.entries(processedScores)) {
      rawAnswers[key] = score
    }

    console.log('%c========== SDQ 评分计算完成 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      dimensions,
      totalScore: totalDifficultiesScore,
      level: LEVEL_NAMES[totalLevel],
      levelCode: totalLevel,
      rawAnswers,
      timing: this.calculateTiming(answers)
    }
  }

  /**
   * 计算各维度分数
   */
  private calculateDimensionScores(
    processedScores: Record<string, number>
  ): Record<string, { rawScore: number; level: SDQLevel; levelName: string }> {
    const results: Record<string, { rawScore: number; level: SDQLevel; levelName: string }> = {}

    for (const [dimension, questionIds] of Object.entries(SDQ_DIMENSION_QUESTIONS)) {
      let rawScore = 0
      for (const qid of questionIds) {
        rawScore += processedScores[qid] || 0
      }

      const level = determineLevel(dimension, rawScore)
      results[dimension] = {
        rawScore,
        level,
        levelName: LEVEL_NAMES[level]
      }
    }

    return results
  }

  // ========== 反馈生成 ==========

  /**
   * 生成评估反馈和 IEP 建议
   */
  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const totalDifficultiesScore = scoreResult.totalScore || 0
    const totalLevel = scoreResult.levelCode || 'normal'

    // 获取评语配置
    const feedbackConfig = ASSESSMENT_LIBRARY.sdq
    const totalRules = feedbackConfig.total_score_rules

    // 获取对应等级的评语
    const levelKey = totalLevel as 'normal' | 'borderline' | 'abnormal'
    const levelFeedback = totalRules[levelKey]

    // 构建总体评价
    const summary = levelFeedback.content.join('\n\n')

    // 构建 IEP 建议
    const recommendations = [...levelFeedback.advice]

    // 分析各维度情况
    const { strengths, weaknesses, dimensionFeedback } = this.analyzeDimensions(scoreResult.dimensions, feedbackConfig.dimensions)

    // 添加维度相关的建议
    for (const feedback of dimensionFeedback) {
      recommendations.push(...feedback.advice)
    }

    // 生成训练重点
    const trainingFocus = this.generateTrainingFocus(weaknesses)

    // 生成家庭指导
    const homeGuidance = this.generateHomeGuidance(totalLevel, weaknesses)

    return {
      summary,
      strengths,
      weaknesses,
      recommendations,
      trainingFocus,
      homeGuidance
    }
  }

  /**
   * 分析各维度情况并生成反馈
   */
  private analyzeDimensions(
    dimensions: DimensionScore[],
    dimensionConfigs: typeof ASSESSMENT_LIBRARY.sdq.dimensions
  ): {
    strengths: string[]
    weaknesses: string[]
    dimensionFeedback: { advice: string[] }[]
  } {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const dimensionFeedback: { advice: string[] }[] = []

    for (const dim of dimensions) {
      const level = determineLevel(dim.code, dim.rawScore)
      const config = dimensionConfigs[dim.code]

      if (config) {
        const levelKey = level as 'normal' | 'borderline' | 'abnormal'
        const levelConfig = config[levelKey]

        if (levelConfig) {
          dimensionFeedback.push({
            advice: levelConfig.advice
          })
        }
      }

      // 分类优势和弱势
      if (dim.code === 'prosocial') {
        if (level === 'normal') {
          strengths.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        } else if (level === 'abnormal') {
          weaknesses.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        }
      } else {
        if (level === 'normal') {
          strengths.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        } else if (level === 'abnormal') {
          weaknesses.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        }
      }
    }

    return { strengths, weaknesses, dimensionFeedback }
  }

  /**
   * 分析优势和弱势维度
   */
  private analyzeStrengthsAndWeaknesses(
    dimensions: DimensionScore[]
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = []
    const weaknesses: string[] = []

    for (const dim of dimensions) {
      const level = determineLevel(dim.code, dim.rawScore)

      if (dim.code === 'prosocial') {
        // 亲社会行为：正常/优秀为优势
        if (level === 'normal') {
          strengths.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        } else if (level === 'abnormal') {
          weaknesses.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        }
      } else {
        // 其他维度：异常为弱势
        if (level === 'normal') {
          strengths.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        } else if (level === 'abnormal') {
          weaknesses.push(`${dim.name}（得分: ${dim.rawScore}/10）`)
        }
      }
    }

    return { strengths, weaknesses }
  }

  /**
   * 生成总体评价
   */
  private generateSummary(
    level: string,
    totalScore: number,
    strengths: string[],
    weaknesses: string[]
  ): string {
    const levelDesc = LEVEL_NAMES[level as SDQLevel] || level
    let summary = `本次 SDQ 评估结果显示，孩子的困难总分为 **${totalScore}分**，处于**${levelDesc}**范围。`

    if (strengths.length > 0) {
      summary += `表现良好的方面包括：${strengths.join('、')}。`
    }

    if (weaknesses.length > 0) {
      summary += `需要关注的方面包括：${weaknesses.join('、')}。`
    }

    if (level === 'abnormal') {
      summary += '建议寻求专业心理医生或儿童发育行为科医生的进一步评估。'
    } else if (level === 'borderline') {
      summary += '建议密切观察，3-6个月后进行复评。'
    }

    return summary
  }

  /**
   * 生成 IEP 建议
   */
  private generateRecommendations(level: string, weaknesses: string[]): string[] {
    const recommendations: string[] = []

    recommendations.push('保持规律的作息时间，确保充足的睡眠')

    if (weaknesses.some(w => w.includes('情绪'))) {
      recommendations.push('教导孩子识别和表达情绪，提供情感支持')
      recommendations.push('在情绪激动时给予冷静时间和空间')
    }

    if (weaknesses.some(w => w.includes('品行'))) {
      recommendations.push('设定清晰的行为规则和边界，保持一致性')
      recommendations.push('采用正向行为支持，及时表扬良好行为')
    }

    if (weaknesses.some(w => w.includes('多动') || w.includes('注意'))) {
      recommendations.push('将任务分解为小步骤，提供频繁的休息机会')
      recommendations.push('减少环境干扰，提供专注的学习空间')
    }

    if (weaknesses.some(w => w.includes('同伴') || w.includes('社交'))) {
      recommendations.push('创造社交机会，鼓励参与集体活动')
      recommendations.push('教导基本的社交技能，如分享、轮流')
    }

    if (weaknesses.some(w => w.includes('亲社会'))) {
      recommendations.push('通过榜样示范培养同理心和助人意识')
      recommendations.push('在日常生活中创造帮助他人的机会')
    }

    if (level === 'abnormal') {
      recommendations.push('建议进行专业的心理评估和干预')
    }

    return recommendations
  }

  /**
   * 生成训练重点
   */
  private generateTrainingFocus(weaknesses: string[]): string[] {
    const focus: string[] = []

    if (weaknesses.some(w => w.includes('情绪'))) {
      focus.push('情绪调节训练')
    }
    if (weaknesses.some(w => w.includes('品行'))) {
      focus.push('行为管理训练')
    }
    if (weaknesses.some(w => w.includes('多动') || w.includes('注意'))) {
      focus.push('注意力训练')
      focus.push('冲动控制训练')
    }
    if (weaknesses.some(w => w.includes('同伴') || w.includes('社交'))) {
      focus.push('社交技能训练')
    }
    if (weaknesses.some(w => w.includes('亲社会'))) {
      focus.push('同理心培养')
    }

    return [...new Set(focus)]
  }

  /**
   * 生成家庭指导建议
   */
  private generateHomeGuidance(level: string, weaknesses: string[]): string[] {
    const guidance: string[] = []

    guidance.push('保持家庭环境的稳定和可预测性')
    guidance.push('用清晰、简洁的指令与孩子沟通')

    if (weaknesses.length > 0) {
      guidance.push('关注孩子的积极行为，给予及时的正向反馈')
    }

    if (level === 'abnormal' || level === 'borderline') {
      guidance.push('与学校保持沟通，确保教育方式的一致性')
    }

    return guidance
  }

  // ========== 欢迎内容 ==========

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: '长处和困难问卷 (SDQ)',
      intro: '本问卷用于评估孩子的情绪、行为、注意力及社交能力，请根据孩子最近 6 个月的情况如实作答。',
      sections: [
        {
          icon: '📋',
          title: '评估说明',
          content: '共 25 道题目，评估 5 个维度：情绪症状、品行问题、多动注意、同伴交往、亲社会行为。'
        },
        {
          icon: '⏱️',
          title: '评估时间',
          content: '预计需要 5-10 分钟，请在安静的环境中完成。'
        },
        {
          icon: '📝',
          title: '评分标准',
          content: '每道题目有 3 个选项：不符合、有点符合、完全符合。请根据实际情况选择最符合的选项。'
        }
      ],
      footer: '请注意：本评估结果仅供参考，不能作为临床诊断的依据。如有疑问，请咨询专业医生。'
    }
  }

  // ========== 图标 ==========

  protected getIcon(): string {
    return '❤️'
  }

  protected getDefaultDescription(): string {
    return '评估儿童的情绪、行为、注意力及社交能力'
  }

  protected getEstimatedTime(): number {
    return 8 // 8分钟
  }
}
