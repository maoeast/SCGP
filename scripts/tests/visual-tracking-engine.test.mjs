import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

function loadEngine() {
  return jiti('../../src/utils/visual-tracking-engine.ts')
}

test('resolveTrackingTarget keeps the moving target inside the safe stage bounds', () => {
  const { resolveTrackingTarget } = loadEngine()

  for (let elapsedMs = 0; elapsedMs <= 60_000; elapsedMs += 750) {
    const point = resolveTrackingTarget({
      elapsedMs,
      durationMs: 60_000,
      speed: 1.4,
      safePadding: 0.12,
    })

    assert.ok(point.x >= 0.12 && point.x <= 0.88, `x ${point.x} out of bounds`)
    assert.ok(point.y >= 0.12 && point.y <= 0.88, `y ${point.y} out of bounds`)
  }
})

test('createTrackingSample judges follow state by pixel distance to the target', () => {
  const { createTrackingSample } = loadEngine()
  const stageSize = { width: 1000, height: 600 }
  const target = { x: 0.5, y: 0.5 }

  assert.equal(
    createTrackingSample({
      time: 100,
      pointer: { x: 0.53, y: 0.5 },
      target,
      stageSize,
      hitRadiusPx: 48,
    }).onTarget,
    true,
  )

  assert.equal(
    createTrackingSample({
      time: 200,
      pointer: { x: 0.6, y: 0.5 },
      target,
      stageSize,
      hitRadiusPx: 48,
    }).onTarget,
    false,
  )
})

test('summarizeTrackingSamples reports follow percentage, breaks, streak, and stability', () => {
  const { summarizeTrackingSamples } = loadEngine()
  const summary = summarizeTrackingSamples([
    { time: 100, onTarget: true, distancePx: 12 },
    { time: 200, onTarget: true, distancePx: 16 },
    { time: 300, onTarget: false, distancePx: 80 },
    { time: 400, onTarget: true, distancePx: 20 },
    { time: 500, onTarget: true, distancePx: 24 },
  ], {
    sampleIntervalMs: 100,
    hitRadiusPx: 48,
  })

  assert.equal(summary.timeOnTarget, 400)
  assert.equal(summary.totalTime, 500)
  assert.equal(summary.timeOnTargetPercent, 0.8)
  assert.equal(summary.breakCount, 1)
  assert.equal(summary.longestStreakMs, 200)
  assert.ok(summary.followStability > 50)
})
