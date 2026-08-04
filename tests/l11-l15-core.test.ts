import assert from 'node:assert/strict'

import {
  L11_L15_GAME_CODES,
  POUR_WATER_DIFFICULTIES,
  averageNonNegative,
  checkFillResult,
  ratio,
} from '../src/features/life-skills/l11-l15-core.ts'

// ========== Game codes ==========
assert.deepEqual(L11_L15_GAME_CODES, [
  'L12_POUR_WATER',
])

// ========== L12: 倒水 ==========
assert.deepEqual(
  Object.values(POUR_WATER_DIFFICULTIES).map((c) => c.targetCups),
  [3, 4, 5],
)
assert.equal(checkFillResult(0.5, 0.5, 0.15), 'exact')
assert.equal(checkFillResult(0.7, 0.5, 0.15), 'overflow')
assert.equal(checkFillResult(0.3, 0.5, 0.15), 'underfill')
assert.equal(checkFillResult(0.64, 0.5, 0.15), 'exact') // edge: within tolerance

// ========== 共用工具 ==========
assert.equal(averageNonNegative([100, 200, -1, Number.NaN]), 150)
assert.equal(averageNonNegative([]), 0)
assert.equal(averageNonNegative([50]), 50)
assert.equal(ratio(3, 4), 0.75)
assert.equal(ratio(2, 0), 0)
assert.equal(ratio(9, 4), 1)
assert.equal(ratio(-1, 4), 0)

console.log('L12 core contract tests passed')
