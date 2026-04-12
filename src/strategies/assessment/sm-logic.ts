import type { ScaleAnswer } from '@/types/assessment'
import type { SMQuestion } from '@/database/sm-questions'

export const SM_PASS_THRESHOLD = 10
export const SM_FAIL_THRESHOLD = 10

export type SMDirection = 'forward' | 'backward'

export interface SMTenPassWindow {
  startIndex: number
  endIndex: number
  stage: number
}

export interface SMNavigationMetadata {
  startIndex: number
  startStage: number
  direction: SMDirection
  basalEstablished: boolean
  basalStage: number | null
  basalWindowStartIndex: number | null
  basalWindowEndIndex: number | null
  forwardResumeIndex: number
}

export interface SMNavigationDecision {
  action: 'next' | 'jump' | 'complete'
  targetIndex?: number
  message?: string
}

export function getSMStartIndex(questions: SMQuestion[], stage: number): number {
  const index = questions.findIndex((question) => question.age_stage === stage)
  return Math.max(0, index)
}

export function ensureSMNavigationMetadata(
  questions: SMQuestion[],
  currentIndex: number,
  metadata?: Record<string, any>,
): SMNavigationMetadata {
  const fallbackStage = questions[currentIndex]?.age_stage ?? questions[0]?.age_stage ?? 1
  const startStage = typeof metadata?.startStage === 'number' ? metadata.startStage : fallbackStage
  const startIndex = typeof metadata?.startIndex === 'number'
    ? metadata.startIndex
    : getSMStartIndex(questions, startStage)

  return {
    startIndex,
    startStage,
    direction: metadata?.direction === 'backward' ? 'backward' : 'forward',
    basalEstablished: metadata?.basalEstablished === true,
    basalStage: typeof metadata?.basalStage === 'number' ? metadata.basalStage : null,
    basalWindowStartIndex: typeof metadata?.basalWindowStartIndex === 'number'
      ? metadata.basalWindowStartIndex
      : null,
    basalWindowEndIndex: typeof metadata?.basalWindowEndIndex === 'number'
      ? metadata.basalWindowEndIndex
      : null,
    forwardResumeIndex: typeof metadata?.forwardResumeIndex === 'number'
      ? metadata.forwardResumeIndex
      : startIndex,
  }
}

export function getSMStageBaseScores(questions: SMQuestion[]): Record<number, number> {
  const scores: Record<number, number> = {}
  let accumulated = 0

  for (const stage of getOrderedStages(questions)) {
    scores[stage] = accumulated
    accumulated += questions.filter((question) => question.age_stage === stage).length
  }

  return scores
}

export function findSMTenPassWindow(
  questions: SMQuestion[],
  answers: Record<string, ScaleAnswer>,
): SMTenPassWindow | null {
  if (questions.length < SM_PASS_THRESHOLD) {
    return null
  }

  for (let startIndex = 0; startIndex <= questions.length - SM_PASS_THRESHOLD; startIndex++) {
    let passed = true

    for (let offset = 0; offset < SM_PASS_THRESHOLD; offset++) {
      const score = getScoreAtIndex(questions, answers, startIndex + offset)
      if (score !== 1) {
        passed = false
        break
      }
    }

    if (passed) {
      return {
        startIndex,
        endIndex: startIndex + SM_PASS_THRESHOLD - 1,
        stage: questions[startIndex]?.age_stage ?? 1,
      }
    }
  }

  return null
}

export function calculateSMRawScoreFromAnswers(
  questions: SMQuestion[],
  answers: Record<string, ScaleAnswer>,
  fallbackStartStage: number,
): number {
  const baseScores = getSMStageBaseScores(questions)
  const basalWindow = findSMTenPassWindow(questions, answers)

  if (!basalWindow) {
    return Object.values(answers).reduce((total, answer) => total + (answer.score === 1 ? 1 : 0), 0)
  }

  let passedCount = 0
  for (let index = basalWindow.startIndex; index < questions.length; index++) {
    const score = getScoreAtIndex(questions, answers, index)
    if (score === undefined) {
      break
    }
    if (score === 1) {
      passedCount++
    }
  }

  const baseScore = baseScores[basalWindow.stage] ?? baseScores[fallbackStartStage] ?? 0
  return baseScore + passedCount
}

export function getSMNavigationDecision(
  questions: SMQuestion[],
  currentIndex: number,
  answers: Record<string, ScaleAnswer>,
  metadata: SMNavigationMetadata,
): SMNavigationDecision {
  if (!questions[currentIndex]) {
    return { action: 'complete', message: '评估已完成' }
  }

  if (!metadata.basalEstablished) {
    return getPreBasalDecision(questions, currentIndex, answers, metadata)
  }

  const ceilingReached = checkForwardFailCeiling(questions, currentIndex, answers, metadata)
  if (ceilingReached) {
    return {
      action: 'complete',
      message: `根据S-M评估规则，连续${SM_FAIL_THRESHOLD}项不通过，评估自动结束`,
    }
  }

  const nextForwardIndex = findFirstUnansweredIndex(questions, answers, currentIndex + 1, 1)
  if (nextForwardIndex >= 0) {
    return { action: 'next' }
  }

  return { action: 'complete', message: '评估已完成' }
}

function getPreBasalDecision(
  questions: SMQuestion[],
  currentIndex: number,
  answers: Record<string, ScaleAnswer>,
  metadata: SMNavigationMetadata,
): SMNavigationDecision {
  const currentScore = getScoreAtIndex(questions, answers, currentIndex)
  if (currentScore === undefined) {
    return { action: 'complete', message: '当前题目尚未作答' }
  }

  if (metadata.direction === 'forward') {
    const forwardWindow = findForwardBasalWindow(questions, answers, metadata.startIndex)
    if (forwardWindow) {
      applyBasalWindow(metadata, forwardWindow)
      return { action: 'next' }
    }

    if (currentScore === 0) {
      const backwardTarget = findFirstUnansweredIndex(questions, answers, metadata.startIndex - 1, -1)
      if (backwardTarget >= 0) {
        metadata.direction = 'backward'
        metadata.forwardResumeIndex = findHighestAnsweredIndex(questions, answers) + 1
        return {
          action: 'jump',
          targetIndex: backwardTarget,
          message: '当前起始区间未形成连续10项通过，转入更早题目继续确定基线',
        }
      }
    }

    if (currentIndex >= questions.length - 1) {
      return { action: 'complete', message: '评估已完成' }
    }

    return { action: 'next' }
  }

  const backwardWindow = findBackwardBasalWindow(questions, answers, currentIndex)
  if (backwardWindow) {
    applyBasalWindow(metadata, backwardWindow)
    metadata.direction = 'forward'
    const resumeIndex = findFirstUnansweredIndex(
      questions,
      answers,
      Math.max(metadata.forwardResumeIndex, backwardWindow.endIndex + 1),
      1,
    )

    if (resumeIndex >= 0) {
      metadata.forwardResumeIndex = resumeIndex
      return {
        action: 'jump',
        targetIndex: resumeIndex,
        message: '已建立连续10项通过基线，返回当前年龄段继续评估',
      }
    }

    return { action: 'complete', message: '评估已完成' }
  }

  const previousIndex = findFirstUnansweredIndex(questions, answers, currentIndex - 1, -1)
  if (previousIndex >= 0) {
    return {
      action: 'jump',
      targetIndex: previousIndex,
      message: '继续向前面的题目确认连续10项通过基线',
    }
  }

  return { action: 'complete', message: '未能建立连续10项通过基线，评估自动结束' }
}

function applyBasalWindow(
  metadata: SMNavigationMetadata,
  window: SMTenPassWindow,
) {
  metadata.basalEstablished = true
  metadata.basalStage = window.stage
  metadata.basalWindowStartIndex = window.startIndex
  metadata.basalWindowEndIndex = window.endIndex
}

function findForwardBasalWindow(
  questions: SMQuestion[],
  answers: Record<string, ScaleAnswer>,
  startIndex: number,
): SMTenPassWindow | null {
  let consecutivePass = 0

  for (let index = startIndex; index < questions.length; index++) {
    const score = getScoreAtIndex(questions, answers, index)
    if (score === undefined) {
      break
    }

    if (score !== 1) {
      return null
    }

    consecutivePass++
    if (consecutivePass >= SM_PASS_THRESHOLD) {
      return {
        startIndex: index - SM_PASS_THRESHOLD + 1,
        endIndex: index,
        stage: questions[index - SM_PASS_THRESHOLD + 1]?.age_stage ?? 1,
      }
    }
  }

  return null
}

function findBackwardBasalWindow(
  questions: SMQuestion[],
  answers: Record<string, ScaleAnswer>,
  currentIndex: number,
): SMTenPassWindow | null {
  let consecutivePass = 0

  for (let index = currentIndex; index < questions.length; index++) {
    const score = getScoreAtIndex(questions, answers, index)
    if (score !== 1) {
      break
    }

    consecutivePass++
    if (consecutivePass >= SM_PASS_THRESHOLD) {
      return {
        startIndex: currentIndex,
        endIndex: currentIndex + SM_PASS_THRESHOLD - 1,
        stage: questions[currentIndex]?.age_stage ?? 1,
      }
    }
  }

  return null
}

function checkForwardFailCeiling(
  questions: SMQuestion[],
  currentIndex: number,
  answers: Record<string, ScaleAnswer>,
  metadata: SMNavigationMetadata,
): boolean {
  const lowerBound = (metadata.basalWindowEndIndex ?? -1) + 1
  let consecutiveFail = 0

  for (let index = currentIndex; index >= lowerBound; index--) {
    const score = getScoreAtIndex(questions, answers, index)
    if (score === undefined) {
      break
    }

    if (score === 0) {
      consecutiveFail++
      if (consecutiveFail >= SM_FAIL_THRESHOLD) {
        return true
      }
      continue
    }

    break
  }

  return false
}

function findFirstUnansweredIndex(
  questions: SMQuestion[],
  answers: Record<string, ScaleAnswer>,
  startIndex: number,
  step: 1 | -1,
): number {
  for (
    let index = startIndex;
    index >= 0 && index < questions.length;
    index += step
  ) {
    const question = questions[index]
    if (question && !answers[question.id]) {
      return index
    }
  }

  return -1
}

function findHighestAnsweredIndex(
  questions: SMQuestion[],
  answers: Record<string, ScaleAnswer>,
): number {
  let highestIndex = -1

  for (let index = 0; index < questions.length; index++) {
    const question = questions[index]
    if (question && answers[question.id]) {
      highestIndex = index
    }
  }

  return highestIndex
}

function getOrderedStages(questions: SMQuestion[]): number[] {
  return [...new Set(questions.map((question) => question.age_stage))].sort((left, right) => left - right)
}

function getScoreAtIndex(
  questions: SMQuestion[],
  answers: Record<string, ScaleAnswer>,
  index: number,
): number | undefined {
  const question = questions[index]
  if (!question) {
    return undefined
  }

  return answers[question.id]?.score
}
