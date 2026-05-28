import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url, {
  alias: {
    '@': new URL('../../src/', import.meta.url).pathname,
  },
})

const runtime = jiti('../../src/components/games/pose/air-conductor-runtime.ts')

function createPose({
  leftY = 0.35,
  rightY = 0.35,
  leftX = 0.3,
  rightX = 0.7,
  leftVisible = true,
  rightVisible = true,
  leftShoulderY = 0.6,
  rightShoulderY = 0.6,
  timestamp = 0,
} = {}) {
  return {
    left: { x: leftX, y: leftY, visible: leftVisible },
    right: { x: rightX, y: rightY, visible: rightVisible },
    leftShoulder: { y: leftShoulderY },
    rightShoulder: { y: rightShoulderY },
    timestamp,
  }
}

test('smoothArmPose applies exponential smoothing and keeps current visibility', () => {
  const previous = createPose({ leftX: 0.2, leftY: 0.5, rightX: 0.8, rightY: 0.55 })
  const current = createPose({ leftX: 0.4, leftY: 0.3, rightX: 0.6, rightY: 0.25, rightVisible: false })

  const next = runtime.smoothArmPose(previous, current)

  assert.equal(Number(next.left.x.toFixed(3)), 0.224)
  assert.equal(Number(next.left.y.toFixed(3)), 0.476)
  assert.equal(Number(next.right.x.toFixed(3)), 0.776)
  assert.equal(Number(next.right.y.toFixed(3)), 0.514)
  assert.equal(next.right.visible, false)
})

test('updateArmLiftState only counts rising edges after the cooldown resets', () => {
  const initial = runtime.createArmLiftState()

  const first = runtime.updateArmLiftState(initial, 1000, true)
  assert.equal(first.increment, 1)
  assert.equal(first.nextState.lifted, true)

  const held = runtime.updateArmLiftState(first.nextState, 1100, true)
  assert.equal(held.increment, 0)

  const lowered = runtime.updateArmLiftState(held.nextState, 1200, false)
  assert.equal(lowered.increment, 0)
  assert.equal(lowered.nextState.lifted, false)

  const tooSoon = runtime.updateArmLiftState(lowered.nextState, 1250, true)
  assert.equal(tooSoon.increment, 0)

  const later = runtime.updateArmLiftState(tooSoon.nextState, 1600, true)
  assert.equal(later.increment, 1)
})

test('bilateral coordination and reach score use simultaneous dual-arm posture', () => {
  const aligned = createPose({ leftY: 0.22, rightY: 0.24 })
  const unbalanced = createPose({ leftY: 0.18, rightY: 0.44 })

  assert.equal(runtime.shouldCountBilateralCoord(aligned), true)
  assert.equal(runtime.shouldCountBilateralCoord(unbalanced), false)

  const accumulated = runtime.accumulateBilateralCoordSec(0.4, aligned, 600)
  assert.equal(Number(accumulated.toFixed(2)), 1)
  assert.equal(runtime.calculateReachScore(aligned) > runtime.calculateReachScore(unbalanced), true)
  assert.equal(runtime.updateMaxReachScore(32, aligned) >= 32, true)
})

test('off-frame state enters after missing-frame threshold and recovers after enough good frames', () => {
  let state = runtime.createOffFrameState()

  for (let index = 0; index < runtime.AIR_CONDUCTOR_OFFFRAME_THRESHOLD - 1; index += 1) {
    state = runtime.updateOffFrameState(state, false)
  }
  assert.equal(state.offFrame, false)

  state = runtime.updateOffFrameState(state, false)
  assert.equal(state.offFrame, true)

  for (let index = 0; index < runtime.AIR_CONDUCTOR_OFFFRAME_RECOVERY_FRAMES - 1; index += 1) {
    state = runtime.updateOffFrameState(state, true)
  }
  assert.equal(state.offFrame, true)

  state = runtime.updateOffFrameState(state, true)
  assert.equal(state.offFrame, false)
})

test('calibration and countdown helpers produce deterministic runtime state', () => {
  let calibration = runtime.createCalibrationAccumulator()
  calibration = runtime.accumulateCalibration(calibration, createPose({ leftShoulderY: 0.62, rightShoulderY: 0.58 }))
  calibration = runtime.accumulateCalibration(calibration, createPose({ leftShoulderY: 0.64, rightShoulderY: 0.6 }))

  const result = runtime.finalizeCalibration(calibration, 3000)
  assert.deepEqual(result, {
    leftShoulderRestY: 0.63,
    rightShoulderRestY: 0.59,
    capturedAt: 3000,
  })

  const runtimeState = runtime.startRuntimePhase(runtime.createRuntimeState(0), 'countdown', 1000)
  assert.equal(runtime.getCountdownValue(runtimeState.phaseStartedAt, 1000), 3)
  assert.equal(runtime.getCountdownValue(runtimeState.phaseStartedAt, 2501), 2)
  assert.equal(runtime.getCountdownValue(runtimeState.phaseStartedAt, 3201), 1)
  assert.equal(runtime.getCountdownValue(runtimeState.phaseStartedAt, 4100), 0)
  assert.equal(runtime.shouldAutoFinish(60, 60_000), true)
  assert.equal(runtime.formatAirConductorDuration(75), '01:15')
})
