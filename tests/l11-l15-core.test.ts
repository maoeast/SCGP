import assert from 'node:assert/strict'

import {
  FACE_WASH_DIFFICULTIES,
  FACE_ZONES,
  FOLD_CLOTHES_DIFFICULTIES,
  L11_L15_GAME_CODES,
  POUR_WATER_DIFFICULTIES,
  ROAD_CROSS_DIFFICULTIES,
  SWEEP_FLOOR_DIFFICULTIES,
  averageNonNegative,
  checkFillResult,
  getFaceWashZones,
  isCrossingSafe,
  isFoldAligned,
  isSweepDirectionCorrect,
  isZoneCleaned,
  ratio,
} from '../src/features/life-skills/l11-l15-core.ts'

// ========== Game codes ==========
assert.deepEqual(L11_L15_GAME_CODES, [
  'L11_FACE_WASH',
  'L12_POUR_WATER',
  'L13_ROAD_CROSS',
  'L14_FOLD_CLOTHES',
  'L15_SWEEP_FLOOR',
])

// ========== L11: 洗脸 ==========
assert.deepEqual(
  Object.values(FACE_WASH_DIFFICULTIES).map((c) => c.targetZones),
  [3, 4, 5],
)
assert.equal(FACE_ZONES.length, 5)
assert.equal(getFaceWashZones(1).length, 3)
assert.equal(getFaceWashZones(2).length, 4)
assert.equal(getFaceWashZones(3).length, 5)
assert.equal(isZoneCleaned(270, 1), true)
assert.equal(isZoneCleaned(269, 1), false)
assert.equal(isZoneCleaned(360, 3), true)
assert.equal(isZoneCleaned(359, 3), false)

// ========== L12: 倒水 ==========
assert.deepEqual(
  Object.values(POUR_WATER_DIFFICULTIES).map((c) => c.targetCups),
  [3, 4, 5],
)
assert.equal(checkFillResult(0.5, 0.5, 0.15), 'exact')
assert.equal(checkFillResult(0.7, 0.5, 0.15), 'overflow')
assert.equal(checkFillResult(0.3, 0.5, 0.15), 'underfill')
assert.equal(checkFillResult(0.64, 0.5, 0.15), 'exact') // edge: within tolerance

// ========== L13: 过马路 ==========
assert.deepEqual(
  Object.values(ROAD_CROSS_DIFFICULTIES).map((c) => c.targetCrossings),
  [3, 4, 5],
)
assert.equal(isCrossingSafe('green', false), true)
assert.equal(isCrossingSafe('red', false), false)
assert.equal(isCrossingSafe('yellow', false), false)
assert.equal(isCrossingSafe('green', true), false) // turning car blocks

// ========== L14: 叠衣服 ==========
assert.deepEqual(
  Object.values(FOLD_CLOTHES_DIFFICULTIES).map((c) => c.targetItems),
  [3, 4, 5],
)
assert.equal(isFoldAligned(0.1, 0.2), true)
assert.equal(isFoldAligned(-0.15, 0.2), true)
assert.equal(isFoldAligned(0.25, 0.2), false)
assert.equal(isFoldAligned(0, 0.1), true)

// ========== L15: 扫地 ==========
assert.deepEqual(
  Object.values(SWEEP_FLOOR_DIFFICULTIES).map((c) => c.targetPiles),
  [3, 4, 5],
)
assert.equal(isSweepDirectionCorrect('left', 'left'), true)
assert.equal(isSweepDirectionCorrect('left', 'right'), false)
assert.equal(isSweepDirectionCorrect('up', 'up'), true)
assert.equal(isSweepDirectionCorrect('down', 'up'), false)

// ========== 共用工具 ==========
assert.equal(averageNonNegative([100, 200, -1, Number.NaN]), 150)
assert.equal(averageNonNegative([]), 0)
assert.equal(averageNonNegative([50]), 50)
assert.equal(ratio(3, 4), 0.75)
assert.equal(ratio(2, 0), 0)
assert.equal(ratio(9, 4), 1)
assert.equal(ratio(-1, 4), 0)

console.log('L11-L15 core contract tests passed')
