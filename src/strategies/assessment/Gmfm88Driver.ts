import { BaseDriver } from './BaseDriver'
import type {
  AssessmentFeedback,
  DimensionScore,
  ScaleAnswer,
  ScaleQuestion,
  ScoreResult,
  StudentContext,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import { Gmfm88AssessmentAPI } from '@/database/api'
import {
  GMFM_DIMENSIONS,
  GMFM_QUESTIONS,
  getGmfm88ScaleQuestions,
  type GmfmDimensionCode,
} from '@/database/gmfm88-questions'

type GmfmOverallLevelCode = 'intensive_support' | 'transitional_growth' | 'functional_independence'
type GmfmDomainBand = 'low' | 'high'
type GmfmSeverity = 'success' | 'warning' | 'danger'

interface GmfmOverallRule {
  id: GmfmOverallLevelCode
  range: [number, number]
  title: string
  severity: 'success' | 'warning' | 'info'
  summary: string
  content: string
  advice: string[]
}

interface GmfmDomainCopy {
  label: string
  content: string
  advice: string
}

interface GmfmDomainConfig {
  title: string
  low: GmfmDomainCopy
  high: GmfmDomainCopy
}

interface GmfmDomainFeedback {
  code: GmfmDimensionCode
  name: string
  title: string
  label: string
  content: string
  advice: string
  percentage: number
}

interface GmfmFlag {
  code: string
  title: string
  severity: 'error' | 'warning'
  content: string
  advice: string
}

interface GmfmDomainResult {
  code: GmfmDimensionCode
  name: string
  rawScore: number
  maxScore: number
  percentage: number
  ntCount: number
  itemCount: number
  level: string
  levelCode: GmfmDomainBand
  severity: GmfmSeverity
}

interface GmfmIepTarget {
  questionId: number
  itemCode: string
  title: string
  dimension: GmfmDimensionCode
  dimensionName: string
  score: number
  isNt: boolean
  priority: 1 | 2 | 3
  rationale: string
  advice: string
}

const GMFM_LIBRARY = ASSESSMENT_LIBRARY.gmfm_88 as {
  total_score_rules: GmfmOverallRule[]
  dimensions: Record<string, GmfmDomainConfig>
  flags: Record<'ORTHOPEDIC_RISK' | 'PSYCHOLOGICAL_BARRIER', Omit<GmfmFlag, 'code'>>
}

export class Gmfm88Driver extends BaseDriver {
  readonly scaleCode = 'gmfm_88'
  readonly scaleName = '粗大运动功能评定量表 (GMFM-88)'
  readonly version = '1.0.0'
  readonly ageRange = { min: 5, max: 192 }
  readonly totalQuestions = GMFM_QUESTIONS.length
  readonly dimensions = GMFM_DIMENSIONS.map((item) => item.fullLabel)

  private readonly scaleQuestions = getGmfm88ScaleQuestions()

  getQuestions(_context: StudentContext): ScaleQuestion[] {
    return this.scaleQuestions
  }

  getStartIndex(_context: StudentContext): number {
    return 0
  }

  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext,
  ): ScoreResult {
    const domainResults = GMFM_DIMENSIONS.map((dimension) => {
      const domainQuestions = GMFM_QUESTIONS.filter((item) => item.dimension === dimension.code)
      const rawScore = domainQuestions.reduce((sum, question) => {
        const answer = answers[String(question.id)] || answers[question.id]
        return sum + Number(answer?.score ?? 0)
      }, 0)
      const ntCount = domainQuestions.reduce((count, question) => {
        const answer = answers[String(question.id)] || answers[question.id]
        return count + (answer?.value === 'NT' ? 1 : 0)
      }, 0)
      const percentage = Number(((rawScore / dimension.maxScore) * 100).toFixed(1))
      const levelCode: GmfmDomainBand = percentage >= 60 ? 'high' : 'low'

      return {
        code: dimension.code,
        name: dimension.fullLabel,
        rawScore,
        maxScore: dimension.maxScore,
        percentage,
        ntCount,
        itemCount: dimension.itemCount,
        level: levelCode === 'high' ? '能力相对稳定' : '需要重点支持',
        levelCode,
        severity: this.resolveSeverity(percentage),
      } satisfies GmfmDomainResult
    })

    const totalRawScore = domainResults.reduce((sum, item) => sum + item.rawScore, 0)
    const totalMaxScore = domainResults.reduce((sum, item) => sum + item.maxScore, 0)
    const totalPercent = Number((
      domainResults.reduce((sum, item) => sum + item.percentage, 0) / domainResults.length
    ).toFixed(1))
    const totalNtCount = domainResults.reduce((sum, item) => sum + item.ntCount, 0)
    const overallRule = this.resolveOverallRule(totalPercent)
    const domainFeedback = this.buildDomainFeedback(domainResults)
    const flags = this.buildFlags(totalPercent, domainResults, context.ageInMonths)
    const iepTargets = this.extractIepTargets(domainResults, domainFeedback, answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: totalPercent,
      level: overallRule.title,
      levelCode: overallRule.id,
      dimensions: domainResults.map((item) => this.toDimensionScore(item)),
      rawAnswers: this.serializeAnswers(answers),
      extraData: {
        totalPercent,
        totalRawScore,
        totalMaxScore,
        totalNtCount,
        overallRule,
        domainResults,
        domainFeedback,
        flags,
        iepTargets,
      },
      timing: this.calculateTiming(answers),
    }
  }

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const extraData = scoreResult.extraData as {
      totalPercent: number
      overallRule: GmfmOverallRule
      domainResults: GmfmDomainResult[]
      domainFeedback: GmfmDomainFeedback[]
      flags: GmfmFlag[]
      iepTargets: GmfmIepTarget[]
    } | undefined

    const overallRule = extraData?.overallRule || this.resolveOverallRule(Number(scoreResult.totalScore || 0))
    const domainResults = extraData?.domainResults || []
    const domainFeedback = extraData?.domainFeedback || []
    const flags = extraData?.flags || []
    const iepTargets = extraData?.iepTargets || []

    const strengths = domainResults
      .filter((item) => item.percentage >= 75)
      .map((item) => `${item.name} ${item.percentage}%`)

    const weaknesses = domainResults
      .filter((item) => item.percentage < 60)
      .map((item) => `${item.name} ${item.percentage}%`)

    return {
      summary: `GMFM-88 总分 ${Number(extraData?.totalPercent || scoreResult.totalScore || 0).toFixed(1)}%，总体判断为“${overallRule.title}”。${overallRule.summary}`,
      strengths,
      weaknesses,
      recommendations: overallRule.advice,
      trainingFocus: iepTargets.map((item) => `${item.dimensionName} - ${item.itemCode} ${item.title}`),
      resourceSuggestions: [
        ...domainFeedback.map((item) => item.advice),
        ...flags.map((item) => item.advice),
      ],
      homeGuidance: [
        overallRule.content,
        ...domainFeedback.map((item) => item.content),
      ],
      overallRule,
      domainFeedback,
      flags,
      iepTargets,
    }
  }

  validateAnswer(_questionId: number | string, value: unknown): boolean {
    return value === 0 || value === 1 || value === 2 || value === 3 || value === 'NT'
  }

  getWelcomeContent() {
    return {
      title: '粗大运动功能评定量表 (GMFM-88)',
      intro: '专门测算“能不能动”（核心体位控制），针对脑瘫或发育迟缓儿童，评估其在躺、坐、爬、站、走等抗重力姿势下的潜能。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            '做个耐心的“等待者”：对于神经系统损伤的孩子，从大脑下达指令到肌肉做出反应，可能有长达数秒的延迟。发出指令后，闭上嘴，收起手，安静地等他5-10秒。',
            '安全感是发力的前提：在测试翻滚、坐立时，你的手要始终呈虚抱状态（Standby）。你要让孩子确信“哪怕我摔倒，你也会稳稳接住我”，否则高张力的孩子会因为恐惧而更加僵硬。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            '捕捉微小的“高光时刻”：在这个量表里，他哪怕只是自己翻了个半身，或者在垫子上肚子离开地面撑了一秒钟，这都是极其伟大的进步。请跟我们一起，为这微小的一秒钟热烈鼓掌。',
            '允许孩子“电量耗尽”：完成这些大运动测试，对特殊孩子来说就像跑了一场马拉松。测完之后他如果发脾气、大哭或瘫倒，那通常是因为真的太累了，请先给予安抚和休息。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          '本系统的粗大运动评定仅供教育教学中的体位管理和活动支持参考，不能作为脑瘫或相关神经病变的医学诊断标准。如发现严重肌张力异常，请前往正规医院神经内科或康复科就诊。',
      },
    }
  }

  protected getDefaultDescription(): string {
    return '基于五大能区百分比平均的 GMFM-88 粗大运动功能评估'
  }

  protected getEstimatedTime(): number {
    return 50
  }

  protected getIcon(): string {
    return 'Operation'
  }

  private resolveSeverity(percentage: number): GmfmSeverity {
    if (percentage >= 75) return 'success'
    if (percentage >= 40) return 'warning'
    return 'danger'
  }

  private resolveOverallRule(totalPercent: number): GmfmOverallRule {
    const matchedRule = GMFM_LIBRARY.total_score_rules.find((item) =>
      totalPercent >= item.range[0] && totalPercent <= item.range[1]
    )

    if (matchedRule) {
      return matchedRule
    }

    return {
      id: 'transitional_growth',
      range: [40, 75],
      title: '破茧探索期（过渡能力发展中）',
      severity: 'info',
      summary: '已建立部分核心稳定性，正勇敢尝试体位转换与独立移动。',
      content: '当前未能从反馈配置中命中总体规则，已回退到默认总体描述。',
      advice: ['建议结合五个能区百分比和现场观察结果，补充人工临床判断。'],
    }
  }

  private buildDomainFeedback(domainResults: GmfmDomainResult[]): GmfmDomainFeedback[] {
    return domainResults.map((result) => {
      const configKey = `zone_${result.code.toLowerCase()}`
      const domainConfig = GMFM_LIBRARY.dimensions[configKey]
      const config = domainConfig?.[result.levelCode]

      return {
        code: result.code,
        name: result.name,
        title: domainConfig?.title || result.name,
        label: config?.label || result.level,
        content: config?.content || '',
        advice: config?.advice || '',
        percentage: result.percentage,
      }
    })
  }

  private buildFlags(
    totalPercent: number,
    domainResults: GmfmDomainResult[],
    ageInMonths: number,
  ): GmfmFlag[] {
    const flags: GmfmFlag[] = []
    const standing = domainResults.find((item) => item.code === 'D')
    const locomotion = domainResults.find((item) => item.code === 'E')

    if (totalPercent < 40 || (standing && standing.percentage < 35)) {
      const orthopedicRisk = GMFM_LIBRARY.flags.ORTHOPEDIC_RISK
      flags.push({
        code: 'ORTHOPEDIC_RISK',
        title: orthopedicRisk.title,
        severity: orthopedicRisk.severity,
        content: orthopedicRisk.content,
        advice: orthopedicRisk.advice,
      })
    }

    if (ageInMonths >= 72 && totalPercent < 55 && locomotion && locomotion.percentage < 45) {
      const psychologicalBarrier = GMFM_LIBRARY.flags.PSYCHOLOGICAL_BARRIER
      flags.push({
        code: 'PSYCHOLOGICAL_BARRIER',
        title: psychologicalBarrier.title,
        severity: psychologicalBarrier.severity,
        content: psychologicalBarrier.content,
        advice: psychologicalBarrier.advice,
      })
    }

    return flags
  }

  private extractIepTargets(
    domainResults: GmfmDomainResult[],
    domainFeedback: GmfmDomainFeedback[],
    answers: Record<string, ScaleAnswer>,
  ): GmfmIepTarget[] {
    const dimensionOrder = new Map(domainResults
      .slice()
      .sort((left, right) => left.percentage - right.percentage)
      .map((item, index) => [item.code, index]))

    return GMFM_QUESTIONS
      .map((question) => {
        const answer = answers[String(question.id)] || answers[question.id]
        const score = Number(answer?.score ?? 0)
        const isNt = answer?.value === 'NT'

        if (!answer || score === 3) {
          return null
        }

        const priority = score === 2 ? 1 : score === 1 ? 2 : 3
        const feedback = domainFeedback.find((item) => item.code === question.dimension)

        return {
          questionId: question.id,
          itemCode: question.itemCode,
          title: question.title,
          dimension: question.dimension,
          dimensionName: question.dimensionName,
          score,
          isNt,
          priority,
          rationale: this.resolveTargetRationale(score, isNt),
          advice: feedback?.advice || '建议结合当前能区低分表现，拆成更小步练习并持续记录表现。',
        } satisfies GmfmIepTarget
      })
      .filter((item): item is GmfmIepTarget => Boolean(item))
      .sort((left, right) => {
        const dimensionGap = (dimensionOrder.get(left.dimension) || 0) - (dimensionOrder.get(right.dimension) || 0)
        if (dimensionGap !== 0) return dimensionGap
        if (left.priority !== right.priority) return left.priority - right.priority
        return left.questionId - right.questionId
      })
      .slice(0, 8)
  }

  private resolveTargetRationale(score: number, isNt: boolean): string {
    if (isNt) return '当前项目未测试，建议补测后尽快纳入训练观察。'
    if (score === 2) return '已接近完成，适合作为近期强化目标。'
    if (score === 1) return '已有起始动作，适合拆步训练和重复巩固。'
    return '当前完全未达成，建议先从先备动作和体位支持开始。'
  }

  private toDimensionScore(result: GmfmDomainResult): DimensionScore {
    return {
      code: result.code,
      name: result.name,
      rawScore: result.rawScore,
      itemCount: result.itemCount,
      averageScore: Number((result.rawScore / result.itemCount).toFixed(2)),
      level: `${result.percentage}%`,
      levelCode: result.levelCode,
      levelName: result.level,
      severity: result.severity,
    }
  }

  // ========== 持久化 ==========

  /**
   * 持久化 GMFM-88 评估结果到数据库
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, state, scoreResult, startTime, endTime } = context

    const gmfm88Api = new Gmfm88AssessmentAPI()
    const extraData = scoreResult.extraData as any
    const questions = this.getQuestions(student)

    const orderedDetails = Object.entries(state.answers)
      .map(([questionId, answer]) => {
        const question = questions.find((item) => String(item.id) === String(questionId))
        return {
          question_id: parseInt(questionId, 10),
          item_code: String(question?.metadata?.itemCode || ''),
          dimension: question?.dimension || '',
          score: answer.score,
          raw_value: String(answer.value),
          is_nt: answer.value === 'NT',
          answer_time: answer.responseTime || 0,
        }
      })
      .sort((left, right) => left.question_id - right.question_id)

    const assessId = gmfm88Api.saveAssessment({
      assessment: {
        student_id: student.id,
        age_months: student.ageInMonths,
        total_score: Number(scoreResult.totalScore || 0),
        raw_total_score: Number(extraData?.totalRawScore || 0),
        total_max_score: Number(extraData?.totalMaxScore || 0),
        level: scoreResult.level,
        level_code: scoreResult.levelCode || null,
        domain_results: extraData?.domainResults || [],
        domain_feedback: extraData?.domainFeedback || [],
        iep_targets: extraData?.iepTargets || [],
        flags: extraData?.flags || [],
        overall_rule: extraData?.overallRule || null,
        start_time: startTime,
        end_time: endTime,
      },
      details: orderedDetails,
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'gmfm_88',
      assessId,
      moduleCode: 'sensory',
      title: `${student.name} - GMFM-88评估报告`,
    })

    console.log('[Gmfm88Driver] GMFM-88 评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }
}
