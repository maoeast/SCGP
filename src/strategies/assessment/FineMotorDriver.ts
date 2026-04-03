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
} from '@/types/assessment'
import {
  FINE_MOTOR_DIMENSIONS,
  FINE_MOTOR_QUESTIONS,
  type FineMotorDimensionCode,
  type FineMotorQuestionData,
  getFineMotorScaleQuestions,
} from '@/database/fine-motor-questions'

type FineMotorStatus = 'age_appropriate' | 'emerging' | 'delayed'
type DomainAdvanceMode = 'search_basal' | 'search_ceiling' | 'completed'

interface FineMotorTarget {
  questionId: number
  itemCode: string
  title: string
  dimension: FineMotorDimensionCode
  dimensionName: string
  score: number
  priority: 1 | 2
  isAutoFilled: boolean
  iepGoal: string | null
  expertAdvice: string | null
}

interface FineMotorDomainState {
  code: FineMotorDimensionCode
  startIndex: number
  mode: DomainAdvanceMode
  backtrackingForBasal: boolean
  basalIndex: number | null
  ceilingIndex: number | null
  basalFallbackUsed: boolean
}

interface FineMotorRuntimeState {
  estimatedAgeMonths: number
  domains: Record<FineMotorDimensionCode, FineMotorDomainState>
}

interface FineMotorDomainResult {
  code: FineMotorDimensionCode
  name: string
  rawScore: number
  maxScore: number
  masteryRate: number
  status: FineMotorStatus
  level: string
  severity: 'success' | 'warning' | 'danger'
}

const BASAL_STREAK = 3
const CEILING_STREAK = 3

const STATUS_CONFIG: Record<FineMotorStatus, { level: string; severity: 'success' | 'warning' | 'danger' }> = {
  age_appropriate: {
    level: '发展适龄',
    severity: 'success',
  },
  emerging: {
    level: '发展萌芽/轻度落后',
    severity: 'warning',
  },
  delayed: {
    level: '显著迟缓',
    severity: 'danger',
  },
}

export class FineMotorDriver extends BaseDriver {
  readonly scaleCode = 'fine_motor'
  readonly scaleName = '小肌肉功能发展评估量表'
  readonly version = '1.0.0'
  readonly ageRange = { min: 36, max: 71 }
  readonly totalQuestions = FINE_MOTOR_QUESTIONS.length
  readonly dimensions = FINE_MOTOR_DIMENSIONS.map((item) => item.label)

  private readonly scaleQuestions = getFineMotorScaleQuestions()
  private readonly questionIndexMap = new Map<number, number>(
    FINE_MOTOR_QUESTIONS.map((question, index) => [question.id, index]),
  )
  private readonly domainQuestionMap = new Map<FineMotorDimensionCode, FineMotorQuestionData[]>(
    FINE_MOTOR_DIMENSIONS.map((dimension) => [
      dimension.code,
      FINE_MOTOR_QUESTIONS.filter((question) => question.dimension === dimension.code),
    ]),
  )

  private latestEstimatedAgeMonths = 48

  getQuestions(context: StudentContext): ScaleQuestion[] {
    this.latestEstimatedAgeMonths = context.ageInMonths
    return this.scaleQuestions
  }

  getStartIndex(context: StudentContext): number {
    this.latestEstimatedAgeMonths = context.ageInMonths
    return this.getDomainStartIndex('hand_grasp', context.ageInMonths)
  }

  getNextQuestion(
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState,
  ): NavigationDecision {
    const currentQuestion = FINE_MOTOR_QUESTIONS[currentIndex]
    if (!currentQuestion) {
      return { action: 'complete', message: '评估已完成' }
    }

    const runtime = this.ensureRuntimeState(state)
    const domainState = runtime.domains[currentQuestion.dimension]

    if (domainState.mode === 'search_basal') {
      return this.advanceBasalSearch(currentQuestion.dimension, currentIndex, answers, state, domainState)
    }

    if (domainState.mode === 'search_ceiling') {
      return this.advanceCeilingSearch(currentQuestion.dimension, currentIndex, answers, state, domainState)
    }

    return this.moveToNextDomain(currentQuestion.dimension, runtime)
  }

  calculateScore(
    answers: Record<string, ScaleAnswer>,
    context: StudentContext,
  ): ScoreResult {
    this.latestEstimatedAgeMonths = context.ageInMonths

    const domainResults = FINE_MOTOR_DIMENSIONS.map((dimension) => {
      const questions = this.getDomainQuestions(dimension.code)
      const rawScore = questions.reduce((sum, question) => {
        const answer = answers[String(question.id)] || answers[question.id]
        return sum + (answer?.score ?? 0)
      }, 0)
      const maxScore = questions.length * 2
      const masteryRate = maxScore > 0 ? rawScore / maxScore : 0
      const status = this.getStatusFromMasteryRate(masteryRate)
      const statusConfig = STATUS_CONFIG[status]

      return {
        code: dimension.code,
        name: dimension.label,
        rawScore,
        maxScore,
        masteryRate,
        status,
        level: statusConfig.level,
        severity: statusConfig.severity,
      } satisfies FineMotorDomainResult
    })

    const totalRawScore = domainResults.reduce((sum, item) => sum + item.rawScore, 0)
    const totalMaxScore = domainResults.reduce((sum, item) => sum + item.maxScore, 0)
    const totalMasteryRate = totalMaxScore > 0 ? totalRawScore / totalMaxScore : 0
    const overallStatus = this.getStatusFromMasteryRate(totalMasteryRate)
    const overallConfig = STATUS_CONFIG[overallStatus]
    const dimensions = domainResults.map((item) => this.toDimensionScore(item))
    const iepTargets = this.extractIepTargets(answers)

    return {
      scaleCode: this.scaleCode,
      studentId: context.id,
      assessmentDate: new Date().toISOString(),
      totalScore: totalRawScore,
      standardScore: Math.round(totalMasteryRate * 100),
      level: overallConfig.level,
      levelCode: overallStatus,
      dimensions,
      rawAnswers: this.serializeAnswers(answers),
      extraData: {
        estimatedAgeMonths: context.ageInMonths,
        totalMaxScore,
        totalMasteryRate: Number(totalMasteryRate.toFixed(4)),
        domainResults,
        iepTargets,
      },
      timing: this.calculateTiming(answers),
    }
  }

  generateFeedback(scoreResult: ScoreResult): AssessmentFeedback {
    const domainResults = ((scoreResult.extraData?.domainResults as FineMotorDomainResult[] | undefined) || [])
    const iepTargets = ((scoreResult.extraData?.iepTargets as FineMotorTarget[] | undefined) || [])

    const strengths = domainResults
      .filter((item) => item.status === 'age_appropriate')
      .map((item) => `${item.name}（${Math.round(item.masteryRate * 100)}%）`)

    const weaknesses = domainResults
      .filter((item) => item.status !== 'age_appropriate')
      .map((item) => `${item.name}（${Math.round(item.masteryRate * 100)}%）`)

    const priority1Targets = iepTargets.filter((item) => item.priority === 1)
    const priority2Targets = iepTargets.filter((item) => item.priority === 2)
    const topTargets = [...priority1Targets, ...priority2Targets]

    const bestDomain = domainResults.reduce<FineMotorDomainResult | null>((best, item) => {
      if (!best || item.masteryRate > best.masteryRate) return item
      return best
    }, null)
    const weakestDomain = domainResults.reduce<FineMotorDomainResult | null>((worst, item) => {
      if (!worst || item.masteryRate < worst.masteryRate) return item
      return worst
    }, null)

    const summaryParts = [
      `总体发展状态为${scoreResult.level}，总得分率 ${Math.round(((scoreResult.extraData?.totalMasteryRate as number | undefined) || 0) * 100)}%。`,
    ]
    if (bestDomain && weakestDomain) {
      summaryParts.push(`当前相对优势领域为${bestDomain.name}，最需要优先支持的领域为${weakestDomain.name}。`)
    }
    if (priority1Targets.length > 0) {
      summaryParts.push(`系统已提取 ${priority1Targets.length} 个“发展萌芽”项目，建议优先进入近期 IEP。`)
    }
    if (priority1Targets.length === 0 && priority2Targets.length > 0) {
      summaryParts.push(`当前没有 1 分项目，已补充提取 ${priority2Targets.length} 个教师手动判定为 0 分的项目作为次优先目标。`)
    }

    return {
      summary: summaryParts.join(' '),
      strengths,
      weaknesses,
      recommendations: topTargets.map((item) => item.iepGoal).filter((item): item is string => Boolean(item)),
      trainingFocus: topTargets.map((item) => `${item.dimensionName} - ${item.title}`),
      resourceSuggestions: topTargets.map((item) => item.expertAdvice).filter((item): item is string => Boolean(item)),
      homeGuidance: topTargets.map((item) => item.expertAdvice).filter((item): item is string => Boolean(item)),
      iepTargets: topTargets,
      priority1Targets,
      priority2Targets,
    }
  }

  calculateProgress(state: AssessmentState): number {
    const answeredCount = Object.keys(state.answers).length
    if (this.totalQuestions <= 0) return 0
    return Math.min(100, Math.round((answeredCount / this.totalQuestions) * 100))
  }

  getWelcomeContent() {
    return {
      title: '小肌肉功能发展评估量表',
      intro: '本评估将按领域逐段进行，并在每个领域内自动寻找基础线和天花板，以减少不必要的重复提问。',
      sections: [
        {
          icon: '🧭',
          title: '起始方式',
          content: '系统会根据儿童月龄，在每个领域选择最接近年龄预期的项目作为起始题。',
        },
        {
          icon: '📈',
          title: '自动补题',
          content: '当连续 3 个项目达到“掌握”时，系统会自动补全该领域更低难度项目；当连续 3 个项目为“未掌握”时，会自动结束该领域更高难度项目。',
        },
        {
          icon: '🎯',
          title: 'IEP 提取',
          content: '系统会优先提取 1 分项目，以及教师手动给出的 0 分项目，生成更贴近近期干预的目标建议。',
        },
      ],
      footer: '请基于儿童当前真实表现评分，系统会自动处理领域内跳题和补题。',
    }
  }

  protected getDefaultDescription(): string {
    return '基于领域内 Basal/Ceiling 规则的小肌肉功能发展评估'
  }

  protected getEstimatedTime(): number {
    return 25
  }

  protected getIcon(): string {
    return 'EditPen'
  }

  private ensureRuntimeState(state: AssessmentState): FineMotorRuntimeState {
    if (!state.metadata) state.metadata = {}

    const existing = state.metadata.fineMotor as FineMotorRuntimeState | undefined
    if (existing) return existing

    const runtime: FineMotorRuntimeState = {
      estimatedAgeMonths: this.latestEstimatedAgeMonths,
      domains: Object.fromEntries(
        FINE_MOTOR_DIMENSIONS.map((dimension) => [
          dimension.code,
          {
            code: dimension.code,
            startIndex: this.getDomainStartIndex(dimension.code, this.latestEstimatedAgeMonths),
            mode: 'search_basal',
            backtrackingForBasal: false,
            basalIndex: null,
            ceilingIndex: null,
            basalFallbackUsed: false,
          } satisfies FineMotorDomainState,
        ]),
      ) as Record<FineMotorDimensionCode, FineMotorDomainState>,
    }

    state.metadata.fineMotor = runtime
    return runtime
  }

  private advanceBasalSearch(
    domainCode: FineMotorDimensionCode,
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState,
    domainState: FineMotorDomainState,
  ): NavigationDecision {
    const currentQuestion = FINE_MOTOR_QUESTIONS[currentIndex]
    if (!currentQuestion) {
      return { action: 'complete', message: '当前题目不存在，无法继续评估。' }
    }
    const currentAnswer = this.getAnswer(answers, currentQuestion.id)

    if (!currentAnswer) {
      return { action: 'complete', message: '当前题目缺少评分，无法继续评估。' }
    }

    if (currentAnswer.score !== 2) {
      domainState.backtrackingForBasal = true
    }

    const basalRun = this.getContiguousRunForScore(domainCode, currentIndex, answers, 2)
    if (basalRun.length >= BASAL_STREAK) {
      const basalIndex = basalRun[0]!
      domainState.mode = 'search_ceiling'
      domainState.backtrackingForBasal = false
      domainState.basalIndex = basalIndex
      this.autoFillBeforeBasal(domainCode, basalIndex, answers)

      const nextUnanswered = this.findFirstUnansweredAfterHighestAnswered(domainCode, answers)
      if (nextUnanswered !== null) {
        return {
          action: 'jump',
          targetIndex: nextUnanswered,
          message: '已建立基础线，继续当前领域更高难度项目。',
        }
      }

      domainState.mode = 'completed'
      return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state))
    }

    if (domainState.backtrackingForBasal) {
      const lowerUnanswered = this.findNearestLowerUnanswered(domainCode, currentIndex, answers)
      if (lowerUnanswered !== null) {
        return {
          action: 'jump',
          targetIndex: lowerUnanswered,
          message: '基础线未建立，回退到更低月龄项目继续评估。',
        }
      }

      // 防止在领域起点仍无法建立 basal 时卡死；此时保留已答题目，改为继续向前完成该领域。
      domainState.mode = 'search_ceiling'
      domainState.basalFallbackUsed = true
      domainState.basalIndex = this.getDomainBoundary(domainCode).start
      domainState.backtrackingForBasal = false

      const nextUnanswered = this.findFirstUnansweredAfterHighestAnswered(domainCode, answers)
      if (nextUnanswered !== null) {
        return {
          action: 'jump',
          targetIndex: nextUnanswered,
          message: '已到达该领域最低项目，未形成标准基础线，继续向前完成本领域评估。',
        }
      }

      domainState.mode = 'completed'
      return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state))
    }

    const higherUnanswered = this.findNearestHigherUnanswered(domainCode, currentIndex, answers)
    if (higherUnanswered !== null) {
      return {
        action: 'jump',
        targetIndex: higherUnanswered,
      }
    }

    return { action: 'complete', message: '当前领域没有更多可评估题目。' }
  }

  private advanceCeilingSearch(
    domainCode: FineMotorDimensionCode,
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    state: AssessmentState,
    domainState: FineMotorDomainState,
  ): NavigationDecision {
    const ceilingRun = this.getContiguousRunForScore(domainCode, currentIndex, answers, 0)
    if (ceilingRun.length >= CEILING_STREAK) {
      const ceilingIndex = ceilingRun[ceilingRun.length - 1]!
      domainState.mode = 'completed'
      domainState.ceilingIndex = ceilingIndex
      this.autoFillAfterCeiling(domainCode, ceilingIndex, answers)
      return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state))
    }

    const nextUnanswered = this.findNearestHigherUnanswered(domainCode, currentIndex, answers)
    if (nextUnanswered !== null) {
      return {
        action: 'jump',
        targetIndex: nextUnanswered,
      }
    }

    domainState.mode = 'completed'
    return this.moveToNextDomain(domainCode, this.ensureRuntimeState(state))
  }

  private moveToNextDomain(
    domainCode: FineMotorDimensionCode,
    runtime: FineMotorRuntimeState,
  ): NavigationDecision {
    const currentDomainPosition = FINE_MOTOR_DIMENSIONS.findIndex((item) => item.code === domainCode)
    const nextDomain = FINE_MOTOR_DIMENSIONS[currentDomainPosition + 1]

    if (!nextDomain) {
      return { action: 'complete', message: '所有领域评估已完成。' }
    }

    return {
      action: 'jump',
      targetIndex: runtime.domains[nextDomain.code].startIndex,
      message: `当前领域已完成，进入${nextDomain.label}。`,
    }
  }

  private autoFillBeforeBasal(
    domainCode: FineMotorDimensionCode,
    basalIndex: number,
    answers: Record<string, ScaleAnswer>,
  ) {
    const { start } = this.getDomainBoundary(domainCode)
    for (let index = start; index < basalIndex; index += 1) {
      const question = FINE_MOTOR_QUESTIONS[index]
      if (!question) continue
      if (!this.getAnswer(answers, question.id)) {
        this.applyAutoFilledAnswer(question.id, 2, 'basal', answers)
      }
    }
  }

  private autoFillAfterCeiling(
    domainCode: FineMotorDimensionCode,
    ceilingIndex: number,
    answers: Record<string, ScaleAnswer>,
  ) {
    const { end } = this.getDomainBoundary(domainCode)
    for (let index = ceilingIndex + 1; index <= end; index += 1) {
      const question = FINE_MOTOR_QUESTIONS[index]
      if (!question) continue
      if (!this.getAnswer(answers, question.id)) {
        this.applyAutoFilledAnswer(question.id, 0, 'ceiling', answers)
      }
    }
  }

  private applyAutoFilledAnswer(
    questionId: number,
    score: 0 | 2,
    reason: 'basal' | 'ceiling',
    answers: Record<string, ScaleAnswer>,
  ) {
    const now = Date.now()
    answers[String(questionId)] = {
      questionId,
      value: score,
      score,
      timestamp: now,
      responseTime: 0,
      metadata: {
        is_auto_filled: true,
        auto_fill_reason: reason,
      },
    }
  }

  private findFirstUnansweredAfterHighestAnswered(
    domainCode: FineMotorDimensionCode,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const { start, end } = this.getDomainBoundary(domainCode)
    let highestAnswered = start - 1
    for (let index = start; index <= end; index += 1) {
      const question = FINE_MOTOR_QUESTIONS[index]
      if (!question) continue
      if (this.getAnswer(answers, question.id)) {
        highestAnswered = index
      }
    }

    for (let index = Math.max(start, highestAnswered + 1); index <= end; index += 1) {
      const question = FINE_MOTOR_QUESTIONS[index]
      if (!question) continue
      if (!this.getAnswer(answers, question.id)) {
        return index
      }
    }

    return null
  }

  private findNearestLowerUnanswered(
    domainCode: FineMotorDimensionCode,
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const { start } = this.getDomainBoundary(domainCode)
    for (let index = currentIndex - 1; index >= start; index -= 1) {
      const question = FINE_MOTOR_QUESTIONS[index]
      if (!question) continue
      if (!this.getAnswer(answers, question.id)) {
        return index
      }
    }
    return null
  }

  private findNearestHigherUnanswered(
    domainCode: FineMotorDimensionCode,
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
  ): number | null {
    const { end } = this.getDomainBoundary(domainCode)
    for (let index = currentIndex + 1; index <= end; index += 1) {
      const question = FINE_MOTOR_QUESTIONS[index]
      if (!question) continue
      if (!this.getAnswer(answers, question.id)) {
        return index
      }
    }
    return null
  }

  private getContiguousRunForScore(
    domainCode: FineMotorDimensionCode,
    currentIndex: number,
    answers: Record<string, ScaleAnswer>,
    targetScore: number,
  ): number[] {
    const { start, end } = this.getDomainBoundary(domainCode)
    const currentQuestion = FINE_MOTOR_QUESTIONS[currentIndex]
    if (!currentQuestion) return []
    const currentAnswer = this.getAnswer(answers, currentQuestion.id)
    if (!currentAnswer || currentAnswer.score !== targetScore) {
      return []
    }

    let left = currentIndex
    while (left - 1 >= start) {
      const previousQuestion = FINE_MOTOR_QUESTIONS[left - 1]
      if (!previousQuestion) break
      const previousAnswer = this.getAnswer(answers, previousQuestion.id)
      if (!previousAnswer || previousAnswer.score !== targetScore) {
        break
      }
      left -= 1
    }

    let right = currentIndex
    while (right + 1 <= end) {
      const nextQuestion = FINE_MOTOR_QUESTIONS[right + 1]
      if (!nextQuestion) break
      const nextAnswer = this.getAnswer(answers, nextQuestion.id)
      if (!nextAnswer || nextAnswer.score !== targetScore) {
        break
      }
      right += 1
    }

    return Array.from({ length: right - left + 1 }, (_, offset) => left + offset)
  }

  private extractIepTargets(answers: Record<string, ScaleAnswer>): FineMotorTarget[] {
    const targets: FineMotorTarget[] = []

    for (const question of FINE_MOTOR_QUESTIONS) {
      const answer = this.getAnswer(answers, question.id)
      if (!answer) continue

      const isAutoFilled = answer.metadata?.is_auto_filled === true
      if (answer.score === 1) {
        targets.push(this.toIepTarget(question, answer, 1))
        continue
      }

      if (answer.score === 0 && !isAutoFilled) {
        targets.push(this.toIepTarget(question, answer, 2))
      }
    }

    return targets
  }

  private toIepTarget(
    question: FineMotorQuestionData,
    answer: ScaleAnswer,
    priority: 1 | 2,
  ): FineMotorTarget {
    return {
      questionId: question.id,
      itemCode: question.itemCode,
      title: question.title,
      dimension: question.dimension,
      dimensionName: question.dimensionName,
      score: answer.score,
      priority,
      isAutoFilled: answer.metadata?.is_auto_filled === true,
      iepGoal: question.iepGoal,
      expertAdvice: question.expertAdvice,
    }
  }

  private toDimensionScore(result: FineMotorDomainResult): DimensionScore {
    return {
      code: result.code,
      name: result.name,
      rawScore: result.rawScore,
      standardScore: Math.round(result.masteryRate * 100),
      itemCount: result.maxScore / 2,
      passedCount: result.rawScore,
      averageScore: result.masteryRate,
      level: result.level,
      levelCode: result.status,
      levelName: result.level,
      severity: result.severity,
    }
  }

  private getStatusFromMasteryRate(rate: number): FineMotorStatus {
    if (rate >= 0.8) return 'age_appropriate'
    if (rate >= 0.4) return 'emerging'
    return 'delayed'
  }

  private getDomainQuestions(domainCode: FineMotorDimensionCode) {
    return this.domainQuestionMap.get(domainCode) || []
  }

  private getDomainBoundary(domainCode: FineMotorDimensionCode) {
    const definition = FINE_MOTOR_DIMENSIONS.find((item) => item.code === domainCode)
    if (!definition) {
      throw new Error(`[FineMotorDriver] 未找到领域定义: ${domainCode}`)
    }
    return {
      start: definition.itemStart - 1,
      end: definition.itemEnd - 1,
    }
  }

  private getDomainStartIndex(domainCode: FineMotorDimensionCode, estimatedAgeMonths: number): number {
    const questions = this.getDomainQuestions(domainCode)
    const firstQuestion = questions[0]
    if (!firstQuestion) {
      return 0
    }

    let bestQuestion = firstQuestion
    let bestDistance = this.getAgeDistance(bestQuestion, estimatedAgeMonths)

    for (const question of questions.slice(1)) {
      const distance = this.getAgeDistance(question, estimatedAgeMonths)
      if (distance < bestDistance) {
        bestQuestion = question
        bestDistance = distance
      }
    }

    return this.questionIndexMap.get(bestQuestion.id) ?? 0
  }

  private getAgeDistance(question: FineMotorQuestionData, estimatedAgeMonths: number): number {
    const minMonths = question.referenceAge.minMonths
    const maxMonths = question.referenceAge.maxMonths
    if (minMonths === null || maxMonths === null) {
      return Number.MAX_SAFE_INTEGER
    }
    if (estimatedAgeMonths < minMonths) return minMonths - estimatedAgeMonths
    if (estimatedAgeMonths > maxMonths) return estimatedAgeMonths - maxMonths
    return 0
  }

  private getAnswer(answers: Record<string, ScaleAnswer>, questionId: number) {
    return answers[String(questionId)] || answers[questionId]
  }
}
