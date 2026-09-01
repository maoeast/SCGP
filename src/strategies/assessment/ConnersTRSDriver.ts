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
  DimensionScore,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import { connorsTRSQuestions, TRS_DIMENSION_QUESTIONS_EN } from '@/database/conners-trs-questions'
import { calculateConnersTScore, type Gender } from '@/database/conners-norms'
import { ConnersTRSAPI } from '@/database/api'

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
      title: 'Conners 教师用儿童行为问卷 (TRS量表)',
      intro: '用于追踪ADHD（注意缺陷多动障碍）儿童在学校中的行为表现和干预效果，建议每3-6个月评估一次（药物治疗期间可每月评估）。Conners-TRS从课堂教学和集体环境视角，通过28道题目评估孩子在学校的多动、冲动、注意力、品行等维度，计算T分数和多动指数，追踪行为干预或药物治疗在学校环境中的效果。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            'Conners-TRS是ADHD行为追踪工具，建议每3-6个月评估一次（药物治疗期每月评估）：本量表通过计算多动指数和各维度T分数，适合定期监测ADHD儿童在学校的行为表现和干预效果。行为干预期每3-6个月评估一次，药物治疗期建议每月评估以调整用药。',
            '做家校矛盾的"调停者"：经常会看到家长评分很低，老师评分却极高。别轻易判断谁在撒谎，这恰恰说明孩子在宽松家庭里能苟住，但在高干扰教室里神经系统彻底超载崩溃了。',
            '剥离教师的情绪标签：老师填表时往往带着疲惫和怒气。请用专业的话语安抚老师，帮助其尽量回到客观描述"过去一个月整体常态"的轨道上。',
            '用T分数变化追踪干预效果：如果一个ADHD儿童基线多动指数T分数78（临床显著），经过3个月课堂行为管理后降到70，再3个月降到64，这说明干预有效。T分数每降低5-8分都是显著进步。',
            '配合PSQ量表使用：TRS反映学校表现，PSQ反映家中表现。有的孩子在学校多动指数T=80但在家T=60，这种"环境剪刀差"提示需要重点改善课堂管理策略和融合教育支持。',
            '药物治疗期密集追踪：如果孩子开始服用ADHD药物（如哌甲酯），建议每月请老师评估一次Conners-TRS，观察药物在课堂环境中的起效情况和剂量调整效果。',
          ],
        },
        {
          icon: '👩‍🏫',
          title: '给老师的填表大实话',
          items: [
            'Conners-TRS是看"课堂改善"的量表，建议每3-6个月做一次：如果班上有ADHD孩子正在接受干预或药物治疗，本量表可以帮您看到课堂上的变化。比如3个月前多动指数T分数75（临床显著），现在68（临界），这说明干预有效，孩子在进步。',
            '这不是对您教学能力的考核：很多老师担心给孩子打高分会显得自己"班级没管好"。请放心，孩子的神经发育特质并非教育不当所致，如实填写是为了争取专业干预资源。',
            '做客观的"班级录像机"：请摘下对某个捣乱事件的"情绪滤镜"，以班级里同龄孩子的平均水平为参照物，而不是以"完美模范生"为标准。回想过去一个月的整体常态。',
            '药物治疗期请每月评估：如果孩子在服用ADHD药物，医生可能会要求您每月填一次Conners量表，这是为了观察药物在学校环境中的效果、调整剂量。您的客观反馈对孩子用药安全至关重要。',
            '分数变化比绝对值更重要：多动指数T分数60-75之间都属于"问题区间"，具体多少分不是重点。重点是3个月后分数是降了还是升了，降了多少。每降5分都是进步。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          'Conners-TRS是ADHD行为追踪工具，建议每3-6个月评估一次（药物治疗期间可每月评估）以监测儿童在学校中的行为表现和干预效果。本量表不能用于ADHD诊断，诊断需要专业医生结合临床观察、病史、多方评估综合判断。如多动指数T分数≥70（临床显著）且持续存在，建议家长带孩子前往正规医院发育行为科或儿童精神科就诊。',
      },
    }
  }

  // ========== 图标 ==========

  protected getIcon(): string {
    return '🏫'
  }

  protected getDefaultDescription(): string {
    return '评估儿童在学校的行为表现，包括品行、多动、注意力等方面'
  }

  // ========== 持久化 ==========

  /**
   * 持久化 Conners TRS 评估结果到数据库
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, scoreResult, startTime, endTime } = context

    const connersApi = new ConnersTRSAPI()

    // 构建原始分、维度分数和 T 分的 JSON 对象
    const rawScores: Record<string, number> = {}
    const dimensionScores: Record<string, { rawScore: number; isValid: boolean; missingCount: number }> = {}
    const tScores: Record<string, number> = {}

    for (const dim of scoreResult.dimensions) {
      rawScores[dim.code] = dim.rawScore || 0
      tScores[dim.code] = dim.standardScore || 50
      dimensionScores[dim.code] = {
        rawScore: dim.rawScore || 0,
        isValid: true,
        missingCount: 0
      }
    }

    // 1. 创建评估主记录
    const assessId = connersApi.createAssessment({
      student_id: student.id,
      gender: student.gender,
      age_months: student.ageInMonths,
      raw_scores: JSON.stringify(rawScores),
      dimension_scores: JSON.stringify(dimensionScores),
      t_scores: JSON.stringify(tScores),
      pi_score: 0,
      ni_score: 0,
      is_valid: 1,
      hyperactivity_index: tScores['hyperactivity_index'] || 50,
      level: scoreResult.levelCode || 'normal',
      start_time: startTime,
      end_time: endTime
    })

    // 2. 创建报告记录
    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'conners-trs',
      assessId,
      title: `${student.name} - Conners教师问卷评估报告`
    })

    console.log('[ConnersTRSDriver] Conners TRS 评估持久化成功, assessId:', assessId)
    this.saveQualityMetrics('conners_trs_assess', assessId, context)
    return { assessId, reportId }
  }

  protected getEstimatedTime(): number {
    return 10 // 10分钟
  }
}
