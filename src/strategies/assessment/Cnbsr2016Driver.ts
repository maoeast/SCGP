import { BaseDriver } from './BaseDriver'
import type {
  AssessmentFeedback,
  AssessmentState,
  DimensionScore,
  NavigationDecision,
  ScaleAnswer,
  ScaleQuestion,
  ScoreResult,
  StudentContext,
  PersistContext,
  PersistResult
} from '@/types/assessment'
import {
  SCGP_CNBS_R2016_Feedback_Config,
} from '@/config/CNBSR2016FeedbackConfig'
import {
  CNBSR2016_AGE_BRACKETS,
  CNBSR2016_SUPPORTED_AGE_RANGE,
  assertCnbsr2016AgeSupported,
  isCnbsr2016QuestionSupported,
  resolveCnbsr2016AgeBracket,
  resolveCnbsr2016DqStatus,
} from '@/config/cnbsr2016-thresholds'
import {
  CNBSR2016_DOMAIN_DEFINITIONS,
  CNBSR2016_PASS_FAIL_OPTIONS,
  CNBSR2016_QUESTIONS,
} from '@/database/cnbsr2016-questions'
import type {
  Cnbsr2016AgeBracketCode,
  Cnbsr2016DomainCode,
  Cnbsr2016QuestionData,
  Cnbsr2016DqStatus,
} from '@/types/cnbsr2016'
import { Cnbsr2016AssessmentAPI } from '@/database/api'

type Cnbsr2016DomainPhase = 'search_basal' | 'search_ceiling' | 'completed'

interface Cnbsr2016DomainRuntimeState {
  code: Cnbsr2016DomainCode
  startMonthGroup: number
  startIndex: number
  phase: Cnbsr2016DomainPhase
  basalMonthGroup: number | null
  ceilingMonthGroup: number | null
  basalFallbackUsed: boolean
}

interface Cnbsr2016RuntimeState {
  chronologicalAgeMonths: number
  domains: Record<Cnbsr2016DomainCode, Cnbsr2016DomainRuntimeState>
}

interface Cnbsr2016DomainResult {
  code: Cnbsr2016DomainCode
  name: string
  itemCount: number
  passedCount: number
  failedCount: number
  autoFilledPassedCount: number
  autoFilledFailedCount: number
  mentalAge: number
  maxMentalAge: number
  achievementRate: number
  dq: number
  dqStatus: Cnbsr2016DqStatus
  level: string
  severity: 'success' | 'warning' | 'danger' | 'info'
}

interface Cnbsr2016IepTarget {
  questionId: number
  itemCode: string
  title: string
  domain: Cnbsr2016DomainCode
  domainName: string
  ageGroupMonths: number
  scoreWeight: number
  prompt: string
  passCriteria: string
  isAutoFilled: boolean
}

interface Cnbsr2016DomainFeedbackEntry {
  domain: Cnbsr2016DomainCode
  domainName: string
  dqStatus: Cnbsr2016DqStatus
  headline: string
  content: string
  advice: Array<{ tag: string; text: string }>
}

const DOMAIN_ORDER = CNBSR2016_DOMAIN_DEFINITIONS.map((item) => item.code)
const AGE_BRACKET_LABELS = new Map(CNBSR2016_AGE_BRACKETS.map((item) => [item.code, item.label]))
// 当前正式支持口径为 0~84 月，保留题库全量月龄组参与正式问卷与计分。
const SUPPORTED_CNBSR2016_QUESTIONS = CNBSR2016_QUESTIONS.filter((question) =>
  isCnbsr2016QuestionSupported(question.ageGroupMonths),
)
const SEVERITY_MAP: Record<Cnbsr2016DqStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  excellent: 'success',
  good: 'success',
  normal: 'info',
  borderline: 'warning',
  delayed: 'danger',
}

function isCnbsr2016InterventionStatus(
  status: Cnbsr2016DqStatus,
): status is Extract<Cnbsr2016DqStatus, 'borderline' | 'delayed'> {
  return status === 'borderline' || status === 'delayed'
}

export class Cnbsr2016Driver extends BaseDriver {
  readonly scaleCode = 'cnbsr2016'
  readonly scaleName = '0-6岁儿童发育行为评估量表（儿心量表Ⅱ）'
  readonly version = '1.0.0'
  readonly ageRange = {
    min: CNBSR2016_SUPPORTED_AGE_RANGE.minMonths,
    max: CNBSR2016_SUPPORTED_AGE_RANGE.maxMonths,
  }
  readonly totalQuestions = SUPPORTED_CNBSR2016_QUESTIONS.length
  readonly dimensions = CNBSR2016_DOMAIN_DEFINITIONS.map((item) => item.label)

  private readonly orderedQuestions = this.buildOrderedQuestions()
  private readonly scaleQuestions = this.orderedQuestions.map((question) => this.toScaleQuestion(question))
  private readonly questionIndexMap = new Map<number, number>(
    this.orderedQuestions.map((question, index) => [question.id, index]),
  )
  private readonly questionMap = new Map<number, Cnbsr2016QuestionData>(
    this.orderedQuestions.map((question) => [question.id, question]),
  )
  private readonly monthGroupsByDomain = new Map<Cnbsr2016DomainCode, number[]>(
    DOMAIN_ORDER.map((domainCode) => [
      domainCode,
      Array.from(
        new Set(
          this.orderedQuestions
            .filter((question) => question.domain === domainCode)
            .map((question) => question.ageGroupMonths),
        ),
      ).sort((left, right) => left - right),
    ]),
  )
  private readonly questionsByDomainAndMonth = new Map<string, Cnbsr2016QuestionData[]>(
    DOMAIN_ORDER.flatMap((domainCode) =>
      (this.monthGroupsByDomain.get(domainCode) || []).map((monthGroup) => [
        this.getDomainMonthKey(domainCode, monthGroup),
        this.orderedQuestions.filter(
          (question) => question.domain === domainCode && question.ageGroupMonths === monthGroup,
        ),
      ] as const),
    ),
  )

  private latestChronologicalAgeMonths = 0

  getQuestions(context: StudentContext): ScaleQuestion[] {
    this.latestChronologicalAgeMonths = assertCnbsr2016AgeSupported(context.ageInMonths)
    return this.scaleQuestions
  }

  getStartIndex(context: StudentContext): number {
    const chronologicalAgeMonths = assertCnbsr2016AgeSupported(context.ageInMonths)
    this.latestChronologicalAgeMonths = chronologicalAgeMonths
    const startMonthGroup = this.getClosestMonthGroup('gm', chronologicalAgeMonths)
    return this.getFirstQuestionIndex('gm', startMonthGroup) ?? 0
  }

  getNextQuestion(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState,
  ): NavigationDecision {
    const currentQuestion = this.orderedQuestions[currentIndex]
    if (!currentQuestion) {
      state.completionReason = 'rule_terminated'
      return { action: 'complete', message: '评估已完成。' }
    }

    const currentAnswer = this.getAnswer(answers, currentQuestion.id)
    if (!currentAnswer) {
      return { action: 'complete', message: '当前题目缺少评分，无法继续评估。' }
    }

    const runtime = this.ensureRuntimeState(state)
    const domainState = runtime.domains[currentQuestion.domain]
    const nextQuestionInGroup = this.findNextUnansweredQuestionInGroup(
      currentQuestion.domain,
      currentQuestion.ageGroupMonths,
      answers,
    )

    if (nextQuestionInGroup !== null) {
      return {
        action: 'jump',
        targetIndex: nextQuestionInGroup,
      }
    }

    if (domainState.phase === 'search_basal') {
      return this.advanceBasalSearch(currentQuestion.domain, answers, state, domainState)
    }

    if (domainState.phase === 'search_ceiling') {
      return this.advanceCeilingSearch(currentQuestion.domain, answers, state, domainState)
    }

    return this.moveToNextDomain(currentQuestion.domain, runtime, state)
  }

  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext,
  ): ScoreResult {
    const supportedAgeMonths = assertCnbsr2016AgeSupported(context.ageInMonths)
    this.latestChronologicalAgeMonths = supportedAgeMonths

    const chronologicalAgeMonths = Math.max(1, supportedAgeMonths)
    const ageBracket = resolveCnbsr2016AgeBracket(supportedAgeMonths)
    if (!ageBracket) {
      throw new Error('儿心量表Ⅱ年龄段解析失败，无法生成有效结果。')
    }
    const iepTargets = this.extractIepTargets(answers)
    const domainResults = CNBSR2016_DOMAIN_DEFINITIONS.map((domainDefinition) => {
      const domainQuestions = this.getDomainQuestions(domainDefinition.code)
      const passedQuestions = domainQuestions.filter((question) => this.getAnswer(answers, question.id)?.score === 1)
      const failedQuestions = domainQuestions.filter((question) => this.getAnswer(answers, question.id)?.score === 0)
      const autoFilledPassedCount = passedQuestions.filter(
        (question) => this.getAnswer(answers, question.id)?.metadata?.is_auto_filled === true,
      ).length
      const autoFilledFailedCount = failedQuestions.filter(
        (question) => this.getAnswer(answers, question.id)?.metadata?.is_auto_filled === true,
      ).length
      const mentalAge = passedQuestions.reduce((sum, question) => sum + question.scoreWeight, 0)
      const maxMentalAge = domainQuestions.reduce((sum, question) => sum + question.scoreWeight, 0)
      const achievementRate = maxMentalAge > 0 ? mentalAge / maxMentalAge : 0
      const dq = (mentalAge / chronologicalAgeMonths) * 100
      const dqStatus = resolveCnbsr2016DqStatus(dq)
      const level = this.getStatusLabel(ageBracket, dqStatus)

      return {
        code: domainDefinition.code,
        name: domainDefinition.label,
        itemCount: domainQuestions.length,
        passedCount: passedQuestions.length,
        failedCount: failedQuestions.length,
        autoFilledPassedCount,
        autoFilledFailedCount,
        mentalAge: Number(mentalAge.toFixed(1)),
        maxMentalAge: Number(maxMentalAge.toFixed(1)),
        achievementRate: Number(achievementRate.toFixed(4)),
        dq: Number(dq.toFixed(1)),
        dqStatus,
        level,
        severity: SEVERITY_MAP[dqStatus],
      } satisfies Cnbsr2016DomainResult
    })

    const totalMentalAge = Number(
      (
        domainResults.reduce((sum, domainResult) => sum + domainResult.mentalAge, 0) /
        CNBSR2016_DOMAIN_DEFINITIONS.length
      ).toFixed(1),
    )
    const dq = Number(((totalMentalAge / chronologicalAgeMonths) * 100).toFixed(1))
    const dqStatus = resolveCnbsr2016DqStatus(dq)
    const overallRule = SCGP_CNBS_R2016_Feedback_Config.overall_rules[ageBracket]?.[dqStatus]
    const expertClinical = SCGP_CNBS_R2016_Feedback_Config.expert_clinical?.[ageBracket]?.[dqStatus] || null
    const domainFeedback = domainResults.map((result) => {
      const entry = SCGP_CNBS_R2016_Feedback_Config.dimensions?.[result.code]?.[ageBracket]?.[result.dqStatus]
      return {
        domain: result.code,
        domainName: result.name,
        dqStatus: result.dqStatus,
        headline: entry?.headline || '',
        content: entry?.content || '',
        advice: entry?.advice || [],
      } satisfies Cnbsr2016DomainFeedbackEntry
    })
    const iepInterventions = domainResults
      .map((result) => {
        if (!isCnbsr2016InterventionStatus(result.dqStatus)) {
          return null
        }

        return {
          domain: result.code,
          domainName: result.name,
          intervention:
            SCGP_CNBS_R2016_Feedback_Config.iep_interventions?.[result.code]?.[ageBracket]?.[result.dqStatus] || null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.intervention))

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: totalMentalAge,
      standardScore: Math.round(dq),
      level: overallRule?.label || this.getStatusLabel(ageBracket, dqStatus),
      levelCode: dqStatus,
      dimensions: domainResults.map((result) => this.toDimensionScore(result)),
      rawAnswers: this.serializeAnswers(answers),
      extraData: {
        chronologicalAgeMonths,
        totalMentalAge,
        dq,
        dqStatus,
        ageBracket,
        ageBracketLabel: AGE_BRACKET_LABELS.get(ageBracket) || ageBracket,
        overallRule,
        expertClinical,
        domainResults,
        domainFeedback,
        iepTargets,
        iepInterventions,
      },
      timing: this.calculateTiming(answers),
    }
  }

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const ageBracket = scoreResult.extraData?.ageBracket as Cnbsr2016AgeBracketCode | undefined
    const dqStatus = scoreResult.extraData?.dqStatus as Cnbsr2016DqStatus | undefined
    const overallRule = scoreResult.extraData?.overallRule as
      | { summary?: string; strengths?: string; suggestions?: string }
      | undefined
    const expertClinical = scoreResult.extraData?.expertClinical as
      | { clinical?: string; risk?: string; followup?: string; referral?: string }
      | undefined
    const domainResults = (scoreResult.extraData?.domainResults as Cnbsr2016DomainResult[] | undefined) || []
    const domainFeedback = (scoreResult.extraData?.domainFeedback as Cnbsr2016DomainFeedbackEntry[] | undefined) || []
    const iepTargets = (scoreResult.extraData?.iepTargets as Cnbsr2016IepTarget[] | undefined) || []
    const iepInterventions = (scoreResult.extraData?.iepInterventions as
      | Array<{
          domain: Cnbsr2016DomainCode
          domainName: string
          intervention: {
            short?: string
            long?: string
            methods?: string[]
            home?: string[]
            freq?: string
          }
        }>
      | undefined) || []

    const strengths = [
      ...(overallRule?.strengths ? this.splitSentenceList(overallRule.strengths) : []),
      ...domainResults
        .filter((result) => result.dqStatus === 'excellent' || result.dqStatus === 'good' || result.dqStatus === 'normal')
        .map((result) => `${result.name}：DQ ${result.dq.toFixed(1)}（${result.level}）`),
    ]

    const weaknesses = domainFeedback
      .filter((entry) => entry.dqStatus === 'borderline' || entry.dqStatus === 'delayed')
      .map((entry) => `${entry.domainName}：${entry.headline || `DQ ${entry.dqStatus}`}`)

    const recommendations = [
      ...(overallRule?.suggestions ? [overallRule.suggestions] : []),
      ...(expertClinical?.followup ? [expertClinical.followup] : []),
      ...(expertClinical?.referral ? [expertClinical.referral] : []),
      ...iepInterventions.flatMap((item) => [item.intervention.short, item.intervention.long].filter(Boolean) as string[]),
    ]

    const resourceSuggestions = domainFeedback
      .flatMap((entry) => entry.advice.map((item) => `${entry.domainName} - ${item.tag}：${item.text}`))
      .slice(0, 12)

    const homeGuidance = iepInterventions
      .flatMap((item) => item.intervention.home || [])
      .filter(Boolean)
      .slice(0, 10)

    return {
      summary: [overallRule?.summary, expertClinical?.clinical, expertClinical?.risk].filter(Boolean).join(' '),
      strengths,
      weaknesses,
      recommendations,
      trainingFocus: iepTargets.map((target) => `${target.domainName} - ${target.title}`),
      resourceSuggestions,
      homeGuidance,
      ageBracket,
      dqStatus,
      dq: scoreResult.extraData?.dq,
      totalMentalAge: scoreResult.extraData?.totalMentalAge,
      expertClinical,
      domainFeedback,
      iepTargets,
      iepInterventions,
    }
  }

  calculateProgress(state: AssessmentState): number {
    const answeredCount = Object.keys(state.answers).length
    if (this.totalQuestions <= 0) return 0
    return Math.min(100, Math.round((answeredCount / this.totalQuestions) * 100))
  }

  validateAnswer(_questionId: number | string, value: unknown): boolean {
    return value === 0 || value === 1
  }

  getWelcomeContent() {
    return {
      title: '儿童发育行为评估量表 (儿心量表Ⅱ)',
      intro: '绘制孩子五大能力（大运动、精细、适应、语言、社交）的“发育雷达图”，看哪里长得快，哪里拖了后腿。',
      sections: [
        {
          icon: '👨‍🏫',
          title: '给专业人员的实操心法',
          items: [
            '过程永远比结果重要：让他搭积木，他没搭成。请记录他是怎么失败的，是手抖放不准、搭了两块就跑了，还是遇到困难直接把积木砸向你。失败的姿势，才是诊断的黄金线索。',
            '灵活的“破冰”策略：不要像个没有感情的读题机器。如果孩子抗拒指令，请立刻把测验变成游戏。哪怕不按量表顺序，只要能引出他的真实反应，就是一次成功的评估。',
            '寻找能力的“平替”：如果孩子不会指认卡片，但能精准地从玩具堆里挑出你说的汽车，请备注这一事实。我们要评估的是他的认知理解力，而不是死板的应试能力。',
          ],
        },
        {
          icon: '❤️',
          title: '给家长的填表大实话',
          items: [
            '发育不是百米赛跑：看到量表上同龄孩子该会的技能，您的孩子还不会，您肯定会慌。但这份量表是为了帮我们确定接下来该在哪个高度给孩子递梯子，而不是宣判他“没救了”。',
            '请做一台客观的“行车记录仪”：不要用“他很聪明，就是懒得做”来美化，也不要用“他什么都不懂”来全盘否定。请尽量用具体场景描述孩子的真实表现。',
            '当好孩子的“安全岛”：测试时如果孩子大哭、发脾气，千万别在现场训斥他。您越放松，他呈现出的能力才越真实。',
          ],
        },
      ],
      reminder: {
        icon: '⚠️',
        title: '特别提醒',
        content:
          '本系统的发育评估结果仅供学校开展特殊教育教学支持参考，不能作为智力障碍等医学诊断依据。如发现显著发育迟缓，请前往正规儿童医院发育行为科进一步确诊。',
      },
    }
  }

  protected getDefaultDescription(): string {
    return '基于月龄组 basal / ceiling 规则的 CNBS-R2016 发育行为评估'
  }

  protected getEstimatedTime(): number {
    return 40
  }

  protected getIcon(): string {
    return 'Opportunity'
  }

  // ========== 持久化 ==========

  /**
   * 持久化 CNBS-R2016 评估结果到数据库
   */
  async persistAssessment(context: PersistContext): Promise<PersistResult> {
    const { student, state, scoreResult, startTime, endTime } = context

    const cnbsr2016Api = new Cnbsr2016AssessmentAPI()
    const extraData = scoreResult.extraData as any
    const questions = this.getQuestions(student)

    const orderedDetails = Object.entries(state.answers)
      .map(([questionId, answer]) => {
        const question = questions.find((item) => String(item.id) === String(questionId))
        return {
          question_id: parseInt(questionId, 10),
          dimension: question?.dimension || '',
          age_group_months: Number(question?.metadata?.age_group_months || 0),
          score_weight: Number(question?.metadata?.score_weight || 0),
          score: answer.score,
          answer_time: answer.responseTime || 0,
          is_auto_filled: answer.metadata?.is_auto_filled === true,
          auto_fill_reason: answer.metadata?.auto_fill_reason || null,
        }
      })
      .sort((left, right) => left.question_id - right.question_id)

    const assessId = cnbsr2016Api.saveAssessment({
      assessment: {
        student_id: student.id,
        age_months: student.ageInMonths,
        total_mental_age: Number(scoreResult.totalScore || 0),
        dq: Number(extraData?.dq || 0),
        dq_status: (extraData?.dqStatus || scoreResult.levelCode || 'normal'),
        age_bracket: extraData?.ageBracket || 'a1',
        level: scoreResult.level,
        level_code: scoreResult.levelCode || null,
        domain_results: extraData?.domainResults || [],
        domain_feedback: extraData?.domainFeedback || [],
        iep_targets: extraData?.iepTargets || [],
        iep_interventions: extraData?.iepInterventions || [],
        overall_rule: extraData?.overallRule || null,
        expert_clinical: extraData?.expertClinical || null,
        start_time: startTime,
        end_time: endTime,
      },
      details: orderedDetails,
    })

    const reportId = this.createReportRecord({
      studentId: student.id,
      reportType: 'cnbsr2016',
      assessId,
      moduleCode: 'sensory',
      title: `${student.name} - 儿心量表Ⅱ评估报告`,
    })

    console.log('[Cnbsr2016Driver] CNBS-R2016 评估持久化成功, assessId:', assessId)
    return { assessId, reportId }
  }

  private buildOrderedQuestions(): Cnbsr2016QuestionData[] {
    return DOMAIN_ORDER.flatMap((domainCode) =>
      SUPPORTED_CNBSR2016_QUESTIONS
        .filter((question) => question.domain === domainCode)
        .sort((left, right) => {
          if (left.ageGroupMonths !== right.ageGroupMonths) {
            return left.ageGroupMonths - right.ageGroupMonths
          }
          return left.sourceOrder - right.sourceOrder
        }),
    )
  }

  private toScaleQuestion(question: Cnbsr2016QuestionData): ScaleQuestion {
    return {
      id: question.id,
      dimension: question.domain,
      dimensionName: `${question.domainName} · ${question.ageBand.label}`,
      content: question.title,
      options: CNBSR2016_PASS_FAIL_OPTIONS,
      metadata: {
        itemCode: question.itemCode,
        age_group_months: question.ageGroupMonths,
        age_band_label: question.ageBand.label,
        score_weight: question.scoreWeight,
        prompt: question.prompt,
        pass_criteria: question.passCriteria,
      },
    }
  }

  private ensureRuntimeState(state: AssessmentState): Cnbsr2016RuntimeState {
    if (!state.metadata) state.metadata = {}

    const existing = state.metadata.cnbsr2016 as Cnbsr2016RuntimeState | undefined
    if (existing) return existing

    const runtime: Cnbsr2016RuntimeState = {
      chronologicalAgeMonths: this.latestChronologicalAgeMonths,
      domains: Object.fromEntries(
        DOMAIN_ORDER.map((domainCode) => {
          const startMonthGroup = this.getClosestMonthGroup(domainCode, this.latestChronologicalAgeMonths)
          return [
            domainCode,
            {
              code: domainCode,
              startMonthGroup,
              startIndex: this.getFirstQuestionIndex(domainCode, startMonthGroup) ?? 0,
              phase: 'search_basal',
              basalMonthGroup: null,
              ceilingMonthGroup: null,
              basalFallbackUsed: false,
            } satisfies Cnbsr2016DomainRuntimeState,
          ]
        }),
      ) as Record<Cnbsr2016DomainCode, Cnbsr2016DomainRuntimeState>,
    }

    state.metadata.cnbsr2016 = runtime
    return runtime
  }

  private advanceBasalSearch(
    domainCode: Cnbsr2016DomainCode,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState,
    domainState: Cnbsr2016DomainRuntimeState,
  ): NavigationDecision {
    const basalMonthGroup = this.findBasalMonthGroup(domainCode, answers)
    if (basalMonthGroup !== null) {
      domainState.phase = 'search_ceiling'
      domainState.basalMonthGroup = basalMonthGroup
      this.autoFillBeforeBasal(domainCode, basalMonthGroup, answers)

      const highestAnsweredMonthGroup = this.getHighestAnsweredMonthGroup(domainCode, answers)
      const nextMonthGroup = this.findNearestHigherUnansweredMonthGroup(
        domainCode,
        highestAnsweredMonthGroup ?? domainState.startMonthGroup,
        answers,
      )
      if (nextMonthGroup !== null) {
        const targetIndex = this.getFirstQuestionIndex(domainCode, nextMonthGroup)
        if (targetIndex === null) {
          domainState.phase = 'completed'
          return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
        }
        return {
          action: 'jump',
          targetIndex,
          message: `已在${this.getDomainLabel(domainCode)}建立 basal，继续向后测查。`,
        }
      }

      domainState.phase = 'completed'
      return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
    }

    const lowestAnsweredMonthGroup = this.getLowestAnsweredMonthGroup(domainCode, answers)
    const lowerMonthGroup = this.findNearestLowerUnansweredMonthGroup(
      domainCode,
      lowestAnsweredMonthGroup ?? domainState.startMonthGroup,
      answers,
    )

    if (lowerMonthGroup !== null) {
      const targetIndex = this.getFirstQuestionIndex(domainCode, lowerMonthGroup)
      if (targetIndex === null) {
        domainState.phase = 'completed'
        return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
      }
      return {
        action: 'jump',
        targetIndex,
        message: `继续向前测查${this.getDomainLabel(domainCode)}，搜索 basal。`,
      }
    }

    domainState.phase = 'search_ceiling'
    domainState.basalFallbackUsed = true
    const highestAnsweredMonthGroup = this.getHighestAnsweredMonthGroup(domainCode, answers)
    const nextMonthGroup = this.findNearestHigherUnansweredMonthGroup(
      domainCode,
      highestAnsweredMonthGroup ?? domainState.startMonthGroup,
      answers,
    )
    if (nextMonthGroup !== null) {
      const targetIndex = this.getFirstQuestionIndex(domainCode, nextMonthGroup)
      if (targetIndex === null) {
        domainState.phase = 'completed'
        return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
      }
      return {
        action: 'jump',
        targetIndex,
        message: `${this.getDomainLabel(domainCode)}未建立标准 basal，转入向后测查。`,
      }
    }

    domainState.phase = 'completed'
    return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
  }

  private advanceCeilingSearch(
    domainCode: Cnbsr2016DomainCode,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState,
    domainState: Cnbsr2016DomainRuntimeState,
  ): NavigationDecision {
    const ceilingMonthGroup = this.findCeilingMonthGroup(domainCode, answers, domainState.startMonthGroup)
    if (ceilingMonthGroup !== null) {
      domainState.phase = 'completed'
      domainState.ceilingMonthGroup = ceilingMonthGroup
      this.autoFillAfterCeiling(domainCode, ceilingMonthGroup, answers)
      return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
    }

    const highestAnsweredMonthGroup = this.getHighestAnsweredMonthGroup(domainCode, answers)
    const nextMonthGroup = this.findNearestHigherUnansweredMonthGroup(
      domainCode,
      highestAnsweredMonthGroup ?? domainState.startMonthGroup,
      answers,
    )
    if (nextMonthGroup !== null) {
      const targetIndex = this.getFirstQuestionIndex(domainCode, nextMonthGroup)
      if (targetIndex === null) {
        domainState.phase = 'completed'
        return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
      }
      return {
        action: 'jump',
        targetIndex,
      }
    }

    domainState.phase = 'completed'
    return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state), state)
  }

  private moveToNextDomain(
    domainCode: Cnbsr2016DomainCode,
    runtime: Cnbsr2016RuntimeState,
    state: AssessmentState,
  ): NavigationDecision {
    const currentPosition = DOMAIN_ORDER.indexOf(domainCode)
    const nextDomainCode = DOMAIN_ORDER[currentPosition + 1]

    if (!nextDomainCode) {
      state.completionReason = 'rule_terminated'
      return { action: 'complete', message: '所有能区评估已完成。' }
    }

    return {
      action: 'jump',
      targetIndex: runtime.domains[nextDomainCode].startIndex,
      message: `当前能区已完成，进入${this.getDomainLabel(nextDomainCode)}。`,
    }
  }

  private findBasalMonthGroup(
    domainCode: Cnbsr2016DomainCode,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const monthGroups = this.getDomainMonthGroups(domainCode)
    for (let index = 0; index < monthGroups.length - 1; index += 1) {
      const current = monthGroups[index]!
      const next = monthGroups[index + 1]!
      if (this.isMonthGroupPassed(domainCode, current, answers) && this.isMonthGroupPassed(domainCode, next, answers)) {
        return current
      }
    }
    return null
  }

  private findCeilingMonthGroup(
    domainCode: Cnbsr2016DomainCode,
    answers: Record<string, ScaleAnswer>,
    startMonthGroup: number,
  ): number | null {
    const monthGroups = this.getDomainMonthGroups(domainCode).filter((monthGroup) => monthGroup >= startMonthGroup)
    for (let index = 0; index < monthGroups.length - 1; index += 1) {
      const current = monthGroups[index]!
      const next = monthGroups[index + 1]!
      if (this.isMonthGroupFailed(domainCode, current, answers) && this.isMonthGroupFailed(domainCode, next, answers)) {
        return next
      }
    }
    return null
  }

  private findNextUnansweredQuestionInGroup(
    domainCode: Cnbsr2016DomainCode,
    monthGroup: number,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const questions = this.getQuestionsByDomainAndMonth(domainCode, monthGroup)
    for (const question of questions) {
      if (!this.getAnswer(answers, question.id)) {
        return this.questionIndexMap.get(question.id) ?? null
      }
    }
    return null
  }

  private findNearestLowerUnansweredMonthGroup(
    domainCode: Cnbsr2016DomainCode,
    currentMonthGroup: number,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const monthGroups = this.getDomainMonthGroups(domainCode)
    const currentIndex = monthGroups.indexOf(currentMonthGroup)
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const monthGroup = monthGroups[index]!
      if (this.findNextUnansweredQuestionInGroup(domainCode, monthGroup, answers) !== null) {
        return monthGroup
      }
    }
    return null
  }

  private findNearestHigherUnansweredMonthGroup(
    domainCode: Cnbsr2016DomainCode,
    currentMonthGroup: number,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const monthGroups = this.getDomainMonthGroups(domainCode)
    const currentIndex = monthGroups.indexOf(currentMonthGroup)
    for (let index = currentIndex + 1; index < monthGroups.length; index += 1) {
      const monthGroup = monthGroups[index]!
      if (this.findNextUnansweredQuestionInGroup(domainCode, monthGroup, answers) !== null) {
        return monthGroup
      }
    }
    return null
  }

  private autoFillBeforeBasal(
    domainCode: Cnbsr2016DomainCode,
    basalMonthGroup: number,
    answers: Record<string, ScaleAnswer>,
  ) {
    this.getDomainMonthGroups(domainCode)
      .filter((monthGroup) => monthGroup < basalMonthGroup)
      .forEach((monthGroup) => {
        this.getQuestionsByDomainAndMonth(domainCode, monthGroup).forEach((question) => {
          if (!this.getAnswer(answers, question.id)) {
            this.applyAutoFilledAnswer(question.id, 1, 'basal', answers)
          }
        })
      })
  }

  private autoFillAfterCeiling(
    domainCode: Cnbsr2016DomainCode,
    ceilingMonthGroup: number,
    answers: Record<string, ScaleAnswer>,
  ) {
    this.getDomainMonthGroups(domainCode)
      .filter((monthGroup) => monthGroup > ceilingMonthGroup)
      .forEach((monthGroup) => {
        this.getQuestionsByDomainAndMonth(domainCode, monthGroup).forEach((question) => {
          if (!this.getAnswer(answers, question.id)) {
            this.applyAutoFilledAnswer(question.id, 0, 'ceiling', answers)
          }
        })
      })
  }

  private applyAutoFilledAnswer(
    questionId: number,
    score: 0 | 1,
    reason: 'basal' | 'ceiling',
    answers: Record<string, ScaleAnswer>,
  ) {
    answers[String(questionId)] = {
      questionId,
      value: score,
      score,
      timestamp: Date.now(),
      responseTime: 0,
      metadata: {
        is_auto_filled: true,
        auto_fill_reason: reason,
      },
    }
  }

  private extractIepTargets(answers: Record<string, ScaleAnswer>): Cnbsr2016IepTarget[] {
    return this.orderedQuestions
      .filter((question) => {
        const answer = this.getAnswer(answers, question.id)
        return answer?.score === 0 && answer.metadata?.is_auto_filled !== true
      })
      .map((question) => ({
        questionId: question.id,
        itemCode: question.itemCode,
        title: question.title,
        domain: question.domain,
        domainName: question.domainName,
        ageGroupMonths: question.ageGroupMonths,
        scoreWeight: question.scoreWeight,
        prompt: question.prompt,
        passCriteria: question.passCriteria,
        isAutoFilled: false,
      }))
  }

  private toDimensionScore(result: Cnbsr2016DomainResult): DimensionScore {
    return {
      code: result.code,
      name: result.name,
      rawScore: result.mentalAge,
      standardScore: Math.round(result.dq),
      itemCount: result.itemCount,
      passedCount: result.passedCount,
      averageScore: result.achievementRate,
      level: result.level,
      levelCode: result.dqStatus,
      levelName: result.level,
      severity: result.severity,
    }
  }

  private getClosestMonthGroup(domainCode: Cnbsr2016DomainCode, ageMonths: number): number {
    const normalizedAge = Math.max(0, Math.floor(ageMonths))
    const monthGroups = this.getDomainMonthGroups(domainCode)
    let bestMonthGroup = monthGroups[0] || 1
    let bestDistance = Math.abs(bestMonthGroup - normalizedAge)

    for (const monthGroup of monthGroups.slice(1)) {
      const distance = Math.abs(monthGroup - normalizedAge)
      if (distance < bestDistance || (distance === bestDistance && monthGroup < bestMonthGroup)) {
        bestMonthGroup = monthGroup
        bestDistance = distance
      }
    }

    return bestMonthGroup
  }

  private isMonthGroupPassed(
    domainCode: Cnbsr2016DomainCode,
    monthGroup: number,
    answers: Record<string, ScaleAnswer>,
  ): boolean {
    const questions = this.getQuestionsByDomainAndMonth(domainCode, monthGroup)
    return questions.length > 0 && questions.every((question) => this.getAnswer(answers, question.id)?.score === 1)
  }

  private isMonthGroupFailed(
    domainCode: Cnbsr2016DomainCode,
    monthGroup: number,
    answers: Record<string, ScaleAnswer>,
  ): boolean {
    const questions = this.getQuestionsByDomainAndMonth(domainCode, monthGroup)
    return questions.length > 0 && questions.every((question) => this.getAnswer(answers, question.id)?.score === 0)
  }

  private getLowestAnsweredMonthGroup(
    domainCode: Cnbsr2016DomainCode,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    return this.getDomainMonthGroups(domainCode).find((monthGroup) =>
      this.getQuestionsByDomainAndMonth(domainCode, monthGroup).some((question) => this.getAnswer(answers, question.id)),
    ) ?? null
  }

  private getHighestAnsweredMonthGroup(
    domainCode: Cnbsr2016DomainCode,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const monthGroups = this.getDomainMonthGroups(domainCode)
    for (let index = monthGroups.length - 1; index >= 0; index -= 1) {
      const monthGroup = monthGroups[index]!
      if (this.getQuestionsByDomainAndMonth(domainCode, monthGroup).some((question) => this.getAnswer(answers, question.id))) {
        return monthGroup
      }
    }
    return null
  }

  private getDomainQuestions(domainCode: Cnbsr2016DomainCode): Cnbsr2016QuestionData[] {
    return this.orderedQuestions.filter((question) => question.domain === domainCode)
  }

  private getDomainLabel(domainCode: Cnbsr2016DomainCode): string {
    return CNBSR2016_DOMAIN_DEFINITIONS.find((item) => item.code === domainCode)?.label || domainCode
  }

  private getDomainMonthGroups(domainCode: Cnbsr2016DomainCode): number[] {
    return this.monthGroupsByDomain.get(domainCode) || []
  }

  private getQuestionsByDomainAndMonth(domainCode: Cnbsr2016DomainCode, monthGroup: number): Cnbsr2016QuestionData[] {
    return this.questionsByDomainAndMonth.get(this.getDomainMonthKey(domainCode, monthGroup)) || []
  }

  private getFirstQuestionIndex(domainCode: Cnbsr2016DomainCode, monthGroup: number): number | null {
    const question = this.getQuestionsByDomainAndMonth(domainCode, monthGroup)[0]
    if (!question) return null
    return this.questionIndexMap.get(question.id) ?? null
  }

  private getDomainMonthKey(domainCode: Cnbsr2016DomainCode, monthGroup: number): string {
    return `${domainCode}:${monthGroup}`
  }

  private getAnswer(answers: Record<string, ScaleAnswer>, questionId: number) {
    return answers[String(questionId)] || answers[questionId]
  }

  private getStatusLabel(ageBracket: Cnbsr2016AgeBracketCode, dqStatus: Cnbsr2016DqStatus): string {
    return SCGP_CNBS_R2016_Feedback_Config.overall_rules[ageBracket]?.[dqStatus]?.label || dqStatus
  }

  private splitSentenceList(text: string): string[] {
    return text
      .split(/[；;。]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
}
