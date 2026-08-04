import assert from 'node:assert/strict'

import {
  BODY_SIGNAL_DIFFICULTIES,
  HOME_SOUND_DIFFICULTIES,
  MARKET_PAY_DIFFICULTIES,
  NEW_LIFE_SKILLS_GAME_CODES,
  STEADY_SPOON_DIFFICULTIES,
  TOWEL_TWIST_DIFFICULTIES,
  averageNonNegative,
  buildHomeSoundSourceChoices,
  checkPayment,
  evaluateSpoonMotion,
  getBodySignalChoices,
  getBodySignalScenario,
  getHomeSoundRound,
  getMarketRound,
  getSpoonPathY,
  getTwistTargets,
  isTwistGestureAccepted,
  ratio,
} from '../src/features/life-skills/new-games-core.ts'

assert.deepEqual(NEW_LIFE_SKILLS_GAME_CODES, [
  'L06_STEADY_SPOON',
  'L07_BODY_SIGNAL',
  'L08_TOWEL_TWIST',
  'L09_HOME_SOUND',
  'L10_MARKET_PAY',
])

assert.deepEqual(
  Object.values(STEADY_SPOON_DIFFICULTIES).map((config) => config.targetScoops),
  [3, 4, 5],
)
assert.ok(getSpoonPathY(2, 0.5) < getSpoonPathY(1, 0.5), '中等路径应包含可辨认的缓弯')
assert.equal(evaluateSpoonMotion({
  difficulty: 1,
  progress: 0.5,
  yRatio: getSpoonPathY(1, 0.5),
  speedPxPerSecond: 300,
  abruptTurn: false,
}).stable, true)
assert.equal(evaluateSpoonMotion({
  difficulty: 3,
  progress: 0.5,
  yRatio: 0.95,
  speedPxPerSecond: 900,
  abruptTurn: true,
}).instabilityWeight, 3)

assert.deepEqual(
  Object.values(BODY_SIGNAL_DIFFICULTIES).map((config) => config.targetRounds),
  [3, 4, 5],
)
const toiletScenario = getBodySignalScenario(0)
assert.equal(toiletScenario.correctSignal, 'toilet')
assert.equal(getBodySignalChoices(toiletScenario, 1).length, 2)
assert.ok(getBodySignalChoices(toiletScenario, 1).some((choice) => choice.id === 'toilet'))
assert.equal(getBodySignalChoices(toiletScenario, 3).length, 3)
assert.equal(getBodySignalScenario(-1).id, getBodySignalScenario(4).id)

assert.deepEqual(
  Object.values(TOWEL_TWIST_DIFFICULTIES).map((config) => config.targetTwists),
  [3, 4, 5],
)
assert.deepEqual(getTwistTargets(0), { left: 'up', right: 'down' })
assert.deepEqual(getTwistTargets(1), { left: 'down', right: 'up' })
assert.equal(isTwistGestureAccepted('up', 'down', 0), true)
assert.equal(isTwistGestureAccepted('up', 'up', 0), false)
assert.equal(isTwistGestureAccepted(null, 'down', 0), false)

assert.deepEqual(
  Object.values(HOME_SOUND_DIFFICULTIES).map((config) => config.targetRounds),
  [3, 4, 5],
)
const firstSound = getHomeSoundRound(0)
const soundChoices = buildHomeSoundSourceChoices(0, 3)
assert.equal(soundChoices.length, 3)
assert.equal(new Set(soundChoices.map((choice) => choice.id)).size, 3)
assert.ok(soundChoices.some((choice) => choice.id === firstSound.id))
assert.equal(getHomeSoundRound(-1).id, getHomeSoundRound(4).id)

assert.deepEqual(
  Object.values(MARKET_PAY_DIFFICULTIES).map((config) => config.targetPurchases),
  [3, 4, 5],
)
assert.ok(getMarketRound(0, 1).price <= 4)
assert.equal(checkPayment(5, 5), 'exact')
assert.equal(checkPayment(4, 5), 'under')
assert.equal(checkPayment(6, 5), 'over')
assert.equal(averageNonNegative([100, 200, -1, Number.NaN]), 150)
assert.equal(averageNonNegative([]), 0)
assert.equal(ratio(3, 4), 0.75)
assert.equal(ratio(2, 0), 0)
assert.equal(ratio(9, 4), 1)

console.log('new life-skills games core test passed')
