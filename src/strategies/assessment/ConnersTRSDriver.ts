/**
 * Conners 教师问卷 (TRS) 驱动器
 *
 * 基于 Conners 1978 年教师用量表
 * 共 28 题，评估 3-17 岁儿童在学校的行为表现
 *
 * 注意：本实现不包含 PI/NI 效度检查（1978版无此项）
 *
 * @module strategies/assessment/ConnersTRSDriver
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
import { connorsTRSQuestions, TRS_DIMENSION_QUESTIONS_EN } from '@/database/conners-trs-questions'
import { calculateConnersTScore, type Gender } from '@/database/conners-norms'

// 维度名称映射（英文 -> 中文）
const TRS_DIMENSION_NAMES: Record<string, string> = {
  conduct: '品行问题',
  hyperactivity: '多动',
  inattention_passivity: '不注意-被动',
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
 * Conners TRS 驱动器
 */
export class ConnersTRSDriver extends BaseDriver {
  // ========== 量表元信息 ==========

  readonly scaleCode = 'conners-trs'
  readonly scaleName = 'Conners 教师用问卷'
  readonly version = '1978版'
  readonly ageRange = { min: 36, max: 216 } // 3-17岁（月）
  readonly totalQuestions = 28
  readonly dimensions = [
    'conduct',
    'hyperactivity',
    'inattention_passivity',
    'hyperactivity_index'
  ]

  // ========== 题目管理 ==========

  /**
   * 获取题目列表
   */
  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return connorsTRSQuestions.map(q => ({
      id: q.id,
      dimension: q.dimension,
      dimensionName: TRS_DIMENSION_NAMES[q.dimension] || q.dimension,
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
    // 1. 计算各维度原始分（平均分）
    const dimensionScores = this.calculateDimensionScores(answers)

    // 2. 计算各维度 T 分
    const tScores = this.calculateTScores(dimensionScores, context)

    // 3. 确定评定等级（基于多动指数 T 分）
    const level = this.determineLevel(tScores)

    // 4. 构建结果对象
    const dimensions: DimensionScore[] = this.dimensions.map(dim => ({
      code: dim,
      name: TRS_DIMENSION_NAMES[dim] || dim,
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

    for (const [dim, questionIds] of Object.entries(TRS_DIMENSION_QUESTIONS_EN)) {
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
        'trs'
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
      homeGuidance: this.generateSchoolGuidance(level, weaknesses)
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
    let summary = `本次评估结果显示，儿童在学校的行为表现方面处于**${levelDesc}**（多动指数 T 分：${hyperactivityIndex}）。`

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
    recommendations.push('建立清晰的课堂规则和期望')

    if (weaknesses.some(w => w.includes('品行'))) {
      recommendations.push('采用班级行为管理策略，及时强化积极行为')
      recommendations.push('设定明确的行为边界和后果')
    }

    if (weaknesses.some(w => w.includes('多动'))) {
      recommendations.push('提供适当的活动机会，允许在合理范围内活动')
      recommendations.push('将长时间任务分解为短时段，中间安排休息')
    }

    if (weaknesses.some(w => w.includes('不注意') || w.includes('被动'))) {
      recommendations.push('使用视觉辅助和提醒系统帮助学生保持专注')
      recommendations.push('安排靠近教师的位置，减少干扰')
      recommendations.push('采用多感官教学方法，提高学习参与度')
    }

    if (level === 'clinical') {
      recommendations.push('建议进行专业的心理评估和干预')
      recommendations.push('考虑与家长合作制定行为干预计划')
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
      if (w.includes('多动')) {
        focus.push('冲动控制训练')
      }
      if (w.includes('不注意') || w.includes('被动')) {
        focus.push('注意力训练')
        focus.push('自我监控训练')
      }
    }

    // 去重
    return [...new Set(focus)]
  }

  /**
   * 生成学校指导建议
   */
  private generateSchoolGuidance(level: string, weaknesses: string[]): string[] {
    const guidance: string[] = []

    guidance.push('保持课堂环境的一致性和可预测性')
    guidance.push('使用清晰、简洁的指令与学生沟通')

    if (weaknesses.length > 0) {
      guidance.push('关注学生的积极行为，给予及时的正面反馈')
    }

    if (level === 'clinical' || level === 'borderline') {
      guidance.push('与家长保持密切沟通，确保家校教育方式的一致性')
      guidance.push('考虑为学生提供额外的学习支持')
    }

    return guidance
  }

  // ========== 欢迎内容 ==========

  /**
   * 获取欢迎对话框内容
   */
  getWelcomeContent() {
    return {
      title: 'Conners 教师用问卷 (TRS)',
      intro: '本问卷用于评估儿童在学校的行为表现，请根据学生最近 6 个月的情况如实作答。',
      sections: [
        {
          icon: '📋',
          title: '评估说明',
          content: '共 28 道题目，评估 4 个维度：品行问题、多动、不注意-被动、多动指数。'
        },
        {
          icon: '⏱️',
          title: '评估时间',
          content: '预计需要 5-10 分钟，请在安静的环境中完成。'
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
    return '🏫'
  }

  protected getDefaultDescription(): string {
    return '评估儿童在学校的行为表现，包括品行、多动、注意力等方面'
  }

  protected getEstimatedTime(): number {
    return 10 // 10分钟
  }
}
