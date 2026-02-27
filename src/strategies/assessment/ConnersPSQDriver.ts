/**
 * Conners 父母问卷 (PSQ) 驱动器
 *
 * 基于 Conners 1978 年父母用量表修订版
 * 共 48 题，评估 3-17 岁儿童在家中的行为表现
 *
 * 注意：本实现不包含 PI/NI 效度检查（1978版无此项）
 *
 * @module strategies/assessment/ConnersPSQDriver
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
import { connorsPSQQuestions, PSQ_DIMENSION_QUESTIONS_EN } from '@/database/conners-psq-questions'
import { calculateConnersTScore, getAgeGroup, type Gender } from '@/database/conners-norms'

// 维度名称映射（英文 -> 中文）
const PSQ_DIMENSION_NAMES: Record<string, string> = {
  conduct: '品行问题',
  learning: '学习问题',
  psychosomatic: '心身障碍',
  impulsivity_hyperactivity: '冲动-多动',
  anxiety: '焦虑',
  hyperactivity_index: '多动指数'
}

// 等级名称映射
const LEVEL_NAMES: Record<string, string> = {
  normal: '正常范围',
  borderline: '临界偏高',
  clinical: '临床显著'
}

// 4 点评分选项
const CONNERS_OPTIONS = [
  { value: 0, label: 'A. 无', description: '完全没有这种情况', score: 0 },
  { value: 1, label: 'B. 稍有', description: '偶尔出现，程度轻微', score: 1 },
  { value: 2, label: 'C. 相当多', description: '经常出现，程度中等', score: 2 },
  { value: 3, label: 'D. 很多', description: '频繁出现，程度严重', score: 3 }
]

/**
 * Conners PSQ 驱动器
 */
export class ConnersPSQDriver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'conners-psq'
  readonly scaleName = 'Conners 父母用问卷'
  readonly version = '1978修订版'
  readonly ageRange = { min: 36, max: 216 } // 3-17岁（月）
  readonly totalQuestions = 48
  readonly dimensions = [
    'conduct',
    'learning',
    'psychosomatic',
    'impulsivity_hyperactivity',
    'anxiety',
    'hyperactivity_index'
  ]

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   */
  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return connorsPSQQuestions.map(q => ({
      id: q.id,
      dimension: q.dimension,
      dimensionName: PSQ_DIMENSION_NAMES[q.dimension] || q.dimension,
      content: q.content,
      options: CONNERS_OPTIONS
    }))
  }

  /**
   * 获取起始题目索引
   * Conners 量表从第一题开始，无需跳题
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
    console.log('%c========== Conners PSQ 评分计算开始 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')
    console.log('📋 学生信息:', { id: context.id, name: context.name, gender: context.gender, ageMonths: context.ageInMonths })

    // 1. 计算各维度原始分（平均分）
    const dimensionScores = this.calculateDimensionScores(answers)

    // 🔬 输出各维度原始分
    console.log('%c[Step 1] 各维度原始分计算结果:', 'color: #FF9800; font-weight: bold;')
    console.table(Object.entries(dimensionScores).map(([dim, score]) => ({
      '维度': PSQ_DIMENSION_NAMES[dim] || dim,
      '总分': score.totalScore,
      '题目数': score.totalCount,
      '平均分(Raw)': score.avgScore.toFixed(2),
      '漏填数': score.missingCount,
      '有效性': score.missingCount / score.totalCount <= 0.1 ? '✅' : '❌'
    })))

    // 2. 计算各维度 T 分
    console.log('%c[Step 2] T分计算（查常模表）:', 'color: #4CAF50; font-weight: bold;')
    const tScores = this.calculateTScores(dimensionScores, context)

    // 3. 确定评定等级（基于多动指数 T 分）
    const level = this.determineLevel(tScores)

    // 🔬 输出最终 T 分汇总
    console.log('%c[Step 3] 最终 T 分汇总:', 'color: #9C27B0; font-weight: bold;')
    console.table(Object.entries(tScores).map(([dim, tScore]) => ({
      '维度': PSQ_DIMENSION_NAMES[dim] || dim,
      'T分': tScore,
      '判定': tScore < 60 ? '正常' : tScore < 70 ? '临界' : '临床显著'
    })))

    console.log('%c[Step 4] 评定等级:', 'color: #F44336; font-weight: bold;', {
      '多动指数T分': tScores['hyperactivity_index'],
      '等级代码': level,
      '等级名称': LEVEL_NAMES[level]
    })

    // 4. 构建结果对象
    const dimensions: DimensionScore[] = this.dimensions.map(dim => ({
      code: dim,
      name: PSQ_DIMENSION_NAMES[dim] || dim,
      rawScore: dimensionScores[dim]?.avgScore || 0,
      standardScore: tScores[dim] || 50,
      itemCount: dimensionScores[dim]?.totalCount || 0,
      passedCount: dimensionScores[dim]?.totalScore || 0,
      averageScore: dimensionScores[dim]?.avgScore || 0
    }))

    // 获取多动指数
    const hyperactivityIndex = tScores['hyperactivity_index'] || 50

    // 序列化原始答案
    const rawAnswers: Record<string, any> = {}
    for (const [key, answer] of Object.entries(answers)) {
      rawAnswers[key] = answer.score
    }

    console.log('%c========== Conners PSQ 评分计算完成 ==========', 'color: #2196F3; font-size: 14px; font-weight: bold;')

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      dimensions,
      totalScore: hyperactivityIndex,
      tScore: hyperactivityIndex,
      level: LEVEL_NAMES[level] || level,
      levelCode: level,
      rawAnswers,
      timing: this.calculateTiming(answers)
    }
  }

  /**
   * 计算各维度分数
   */
  private calculateDimensionScores(
    answers: Record<string, ScaleAnswer>
  ): Record<string, { totalScore: number; totalCount: number; avgScore: number; missingCount: number }> {
    const results: Record<string, { totalScore: number; totalCount: number; avgScore: number; missingCount: number }> = {}

    for (const [dim, questionIds] of Object.entries(PSQ_DIMENSION_QUESTIONS_EN)) {
      let totalScore = 0
      let answeredCount = 0
      let missingCount = 0

      for (const qid of questionIds) {
        const answer = answers[qid]
        if (answer !== undefined && answer !== null) {
          totalScore += answer.score
          answeredCount++
        } else {
          missingCount++
        }
      }

      // 漏填容忍度：10%
      const totalCount = questionIds.length
      const missingRatio = missingCount / totalCount
      const isValid = missingRatio <= 0.1

      // 计算平均分
      let avgScore = 0
      if (isValid && answeredCount > 0) {
        avgScore = totalScore / answeredCount
      }

      results[dim] = {
        totalScore,
        totalCount,
        avgScore: Math.round(avgScore * 100) / 100,
        missingCount
      }
    }

    return results
  }

  /**
   * 计算各维度 T 分
   */
  private calculateTScores(
    dimensionScores: Record<string, { avgScore: number; missingCount: number; totalCount: number }>,
    context: StudentContext
  ): Record<string, number> {
    const tScores: Record<string, number> = {}

    const gender: Gender = context.gender === '男' ? 'male' : 'female'
    const ageMonths = context.ageInMonths

    for (const dim of this.dimensions) {
      const dimScore = dimensionScores[dim]
      if (!dimScore || dimScore.missingCount / dimScore.totalCount > 0.1) {
        // 漏填超过 10%，该维度无效
        tScores[dim] = 50
        continue
      }

      tScores[dim] = calculateConnersTScore(
        dimScore.avgScore,
        gender,
        ageMonths,
        dim,
        'psq'
      )
    }

    return tScores
  }

  /**
   * 确定评定等级
   */
  private determineLevel(tScores: Record<string, number>): string {
    // 使用多动指数 T 分判定
    const hyperactivityIndex = tScores['hyperactivity_index'] || 50

    if (hyperactivityIndex < 60) return 'normal'
    if (hyperactivityIndex < 70) return 'borderline'
    return 'clinical'
  }

  // ========== 反馈生成 ==========

  /**
   * 生成评估反馈和 IEP 建议
   */
  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const level = scoreResult.levelCode || 'normal'
    const hyperactivityIndex = scoreResult.tScore || 50

    // 分析优势和弱势维度
    const { strengths, weaknesses } = this.analyzeStrengthsAndWeaknesses(scoreResult.dimensions)

    // 生成总体评价
    const summary = this.generateSummary(level, hyperactivityIndex, strengths, weaknesses)

    // 生成 IEP 建议
    const recommendations = this.generateRecommendations(level, weaknesses)

    // 生成训练重点
    const trainingFocus = this.generateTrainingFocus(level, weaknesses)

    return {
      summary,
      strengths,
      weaknesses,
      recommendations,
      trainingFocus,
      homeGuidance: this.generateHomeGuidance(level, weaknesses)
    }
  }

  /**
   * 分析优势和弱势维度
   */
  private analyzeStrengthsAndWeaknesses(
    dimensions: DimensionScore[]
  ): { strengths: string[]; weaknesses: string[] } {
    // 过滤掉多动指数（综合指标）
    const dims = dimensions.filter(d => d.code !== 'hyperactivity_index')

    if (dims.length === 0) {
      return { strengths: [], weaknesses: [] }
    }

    // 计算平均 T 分
    const avgTScore = dims.reduce((sum, d) => sum + (d.standardScore || 50), 0) / dims.length

    const strengths: string[] = []
    const weaknesses: string[] = []

    for (const dim of dims) {
      const tScore = dim.standardScore || 50
      // T 分低于平均 5 分为优势（问题较少），高于平均 5 分为弱势（问题较多）
      if (tScore <= avgTScore - 5) {
        strengths.push(`${dim.name}（T分: ${tScore}）`)
      } else if (tScore >= avgTScore + 5) {
        weaknesses.push(`${dim.name}（T分: ${tScore}）`)
      }
    }

    return { strengths, weaknesses }
  }

  /**
   * 生成总体评价
   */
  private generateSummary(
    level: string,
    hyperactivityIndex: number,
    strengths: string[],
    weaknesses: string[]
  ): string {
    const levelDesc = LEVEL_NAMES[level] || level
    let summary = `本次评估结果显示，儿童在行为表现方面处于**${levelDesc}**（多动指数 T 分：${hyperactivityIndex}）。`

    if (strengths.length > 0) {
      summary += `相对较好的方面包括：${strengths.join('、')}。`
    }

    if (weaknesses.length > 0) {
      summary += `需要关注的方面包括：${weaknesses.join('、')}。`
    }

    // 根据等级添加建议
    if (level === 'clinical') {
      summary += '建议寻求专业心理医生或儿童精神科医生的进一步评估和指导。'
    } else if (level === 'borderline') {
      summary += '建议密切观察，必要时进行专业咨询。'
    }

    return summary
  }

  /**
   * 生成 IEP 建议
   */
  private generateRecommendations(level: string, weaknesses: string[]): string[] {
    const recommendations: string[] = []

    // 基础建议
    recommendations.push('建立规律的作息时间，保证充足的睡眠和运动时间')

    if (weaknesses.includes('品行问题')) {
      recommendations.push('采用正向行为支持策略，及时表扬和奖励良好行为')
      recommendations.push('设定清晰的行为规则和边界，保持一致性')
    }

    if (weaknesses.includes('学习问题')) {
      recommendations.push('提供结构化的学习环境，减少干扰因素')
      recommendations.push('采用多感官教学方法，提高学习兴趣')
    }

    if (weaknesses.includes('冲动-多动')) {
      recommendations.push('将任务分解为小块，提供频繁的休息机会')
      recommendations.push('使用视觉提示和计时器帮助儿童自我监控')
    }

    if (weaknesses.includes('焦虑')) {
      recommendations.push('创造安全、支持性的情感环境')
      recommendations.push('教导情绪识别和表达技巧')
    }

    if (level === 'clinical') {
      recommendations.push('建议进行专业的心理评估和干预')
    }

    return recommendations
  }

  /**
   * 生成训练重点
   */
  private generateTrainingFocus(level: string, weaknesses: string[]): string[] {
    const focus: string[] = []

    for (const w of weaknesses) {
      if (w.includes('品行')) {
        focus.push('行为管理训练')
      }
      if (w.includes('学习')) {
        focus.push('注意力训练')
      }
      if (w.includes('冲动') || w.includes('多动')) {
        focus.push('冲动控制训练')
      }
      if (w.includes('焦虑')) {
        focus.push('情绪调节训练')
      }
    }

    // 去重
    return [...new Set(focus)]
  }

  /**
   * 生成家庭指导建议
   */
  private generateHomeGuidance(level: string, weaknesses: string[]): string[] {
    const guidance: string[] = []

    guidance.push('保持家庭环境的一致性和可预测性')
    guidance.push('使用清晰、简洁的指令与孩子沟通')

    if (weaknesses.length > 0) {
      guidance.push('关注孩子的积极行为，给予及时的正向反馈')
    }

    if (level === 'clinical' || level === 'borderline') {
      guidance.push('与学校保持密切沟通，确保教育方式的一致性')
    }

    return guidance
  }

  // ========== 欢迎内容 ==========

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: 'Conners 父母用问卷 (PSQ)',
      intro: '本问卷用于评估儿童在家中的行为表现，请根据孩子最近 6 个月的情况如实作答。',
      sections: [
        {
          icon: '📋',
          title: '评估说明',
          content: '共 48 道题目，评估 6 个维度：品行问题、学习问题、心身障碍、冲动-多动、焦虑、多动指数。'
        },
        {
          icon: '⏱️',
          title: '评估时间',
          content: '预计需要 10-15 分钟，请在安静的环境中完成。'
        },
        {
          icon: '📝',
          title: '评分标准',
          content: '每道题目有 4 个选项：A.无、B.稍有、C.相当多、D.很多。请根据实际情况选择最符合的选项。'
        }
      ],
      footer: '请注意：本评估结果仅供参考，不能作为临床诊断的依据。如有疑问，请咨询专业医生。'
    }
  }

  // ========== 图标 ==========

  protected getIcon(): string {
    return '🏠'
  }

  protected getDefaultDescription(): string {
    return '评估儿童在家中的行为表现，包括品行、学习、情绪等方面'
  }

  protected getEstimatedTime(): number {
    return 15 // 15分钟
  }
}
