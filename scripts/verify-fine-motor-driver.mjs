import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
    '@/database/api': `${projectRoot}/scripts/stubs/fine-motor-driver-api-stub.mjs`,
  },
})

const { FineMotorDriver } = await jiti.import(`${projectRoot}/src/strategies/assessment/FineMotorDriver.ts`)
const { FINE_MOTOR_QUESTIONS } = await jiti.import(`${projectRoot}/src/database/fine-motor-questions.ts`)

const student = {
  id: 1,
  name: '陈明峰',
  gender: '男',
  birthday: '2019-10-01',
  ageInMonths: 74,
}

const driver = new FineMotorDriver()
const questions = driver.getQuestions(student)

const state = {
  currentIndex: driver.getStartIndex(student),
  answers: {},
  isComplete: false,
  startTime: Date.now(),
  metadata: {
    totalQuestions: questions.length,
  },
}

const manuallyAnsweredIds = []
let completionMessage = ''

for (let step = 0; step < 200; step += 1) {
  const question = questions[state.currentIndex]
  assert.ok(question, `Missing question at index ${state.currentIndex}`)

  if (!state.answers[String(question.id)]) {
    manuallyAnsweredIds.push(Number(question.id))
    state.answers[String(question.id)] = {
      questionId: question.id,
      value: 2,
      score: 2,
      timestamp: Date.now(),
      responseTime: 0,
    }
  }

  const decision = driver.getNextQuestion(state.currentIndex, state.answers, state)

  if (decision.action === 'next') {
    state.currentIndex += 1
    continue
  }

  if (decision.action === 'jump') {
    assert.ok(
      typeof decision.targetIndex === 'number',
      `Jump decision missing targetIndex at question ${question.id}`,
    )
    state.currentIndex = decision.targetIndex
    continue
  }

  if (decision.action === 'complete') {
    completionMessage = decision.message || ''
    break
  }
}

const scoreResult = driver.calculateScore(state.answers, student)
const domainResults = scoreResult.extraData?.domainResults || []

assert.equal(completionMessage, '所有领域评估已完成。')
assert.equal(manuallyAnsweredIds[0], 9)
assert.ok(manuallyAnsweredIds.includes(44), '双手协调领域应向前回退/夹紧到 44 题建立 basal')
assert.ok(manuallyAnsweredIds.includes(76), '前书写领域应向前回退/夹紧到 76 题建立 basal')
assert.ok(manuallyAnsweredIds.length > 17, '不应在 17 题时提前结束整个评估')
assert.equal(Object.keys(state.answers).length, FINE_MOTOR_QUESTIONS.length)
assert.equal(scoreResult.totalScore, FINE_MOTOR_QUESTIONS.length * 2)
assert.equal(scoreResult.levelCode, 'age_appropriate')
assert.equal(scoreResult.level, '发展适龄')
assert.ok(domainResults.every((item) => item.status === 'age_appropriate'))

console.log('verify-fine-motor-driver: ok')
