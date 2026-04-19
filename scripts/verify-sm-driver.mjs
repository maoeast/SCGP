import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

const {
  calculateSMRawScoreFromAnswers,
  ensureSMNavigationMetadata,
  getSMNavigationDecision,
  getSMStartIndex,
} = await jiti.import(`${projectRoot}/src/strategies/assessment/sm-logic.ts`)

const {
  smQuestions,
} = await jiti.import(`${projectRoot}/src/database/sm-questions.ts`)

const sortedQuestions = [...smQuestions].sort((left, right) => left.id - right.id)
const stage4StartIndex = getSMStartIndex(sortedQuestions, 4)

function createAnswer(questionId, score) {
  return {
    questionId,
    value: score,
    score,
    timestamp: Date.now(),
  }
}

function createState() {
  return {
    answers: {},
    metadata: ensureSMNavigationMetadata(sortedQuestions, stage4StartIndex, {
      startIndex: stage4StartIndex,
      startStage: 4,
    }),
  }
}

function answerAt(state, index, score) {
  const question = sortedQuestions[index]
  if (!question) {
    throw new Error(`Missing question at index ${index}`)
  }

  state.answers[question.id] = createAnswer(question.id, score)
  return getSMNavigationDecision(sortedQuestions, index, state.answers, state.metadata)
}

function verifyStage4FullPassStaysForward() {
  const state = createState()
  const stage4Indexes = sortedQuestions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.age_stage === 4)
    .map(({ index }) => index)

  let tenthDecision = null
  let lastDecision = null

  for (const index of stage4Indexes) {
    const decision = answerAt(state, index, 1)
    if (index === stage4StartIndex + 9) {
      tenthDecision = decision
    }
    if (index === stage4Indexes[stage4Indexes.length - 1]) {
      lastDecision = decision
    }
  }

  assert.ok(tenthDecision, '第10题通过后应产生导航决策')
  assert.ok(lastDecision, '阶段末题通过后应产生导航决策')
  assert.equal(state.metadata.basalEstablished, true)
  assert.equal(state.metadata.direction, 'forward')
  assert.equal(tenthDecision.action, 'next')
  assert.notEqual(lastDecision.action, 'jump')
  assert.equal(lastDecision.action, 'next')
  assert.equal(sortedQuestions[stage4StartIndex].id, 65)

  const rawScore = calculateSMRawScoreFromAnswers(sortedQuestions, state.answers, 4)
  assert.equal(rawScore, 80)
}

function verifyBackwardBasalAndForwardCeiling() {
  const state = createState()

  const firstDecision = answerAt(state, stage4StartIndex, 0)
  assert.equal(firstDecision.action, 'jump')
  assert.equal(firstDecision.targetIndex, stage4StartIndex - 1)
  assert.equal(sortedQuestions[firstDecision.targetIndex].id, 64)

  let resumeDecision = null
  for (let index = stage4StartIndex - 1; index >= stage4StartIndex - 10; index--) {
    resumeDecision = answerAt(state, index, 1)
  }

  assert.ok(resumeDecision, '回退建立基线后应产生返回决策')
  assert.equal(state.metadata.basalEstablished, true)
  assert.equal(resumeDecision.action, 'jump')
  assert.equal(sortedQuestions[resumeDecision.targetIndex].id, 66)

  let completeDecision = null
  for (let index = stage4StartIndex + 1; index <= stage4StartIndex + 9; index++) {
    completeDecision = answerAt(state, index, 0)
  }

  assert.ok(completeDecision, '连续不通过后应产生结束决策')
  assert.equal(completeDecision.action, 'complete')
  assert.match(completeDecision.message || '', /连续10项不通过/)
}

verifyStage4FullPassStaysForward()
verifyBackwardBasalAndForwardCeiling()

console.log('verify-sm-driver: ok')
