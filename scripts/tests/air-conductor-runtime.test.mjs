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

test('particle emitters mirror wrist positions into the same display coordinate system as the mirrored stage', () => {
  const pose = createPose({
    leftX: 0.22,
    rightX: 0.81,
    leftY: 0.18,
    rightY: 0.28,
    leftShoulderY: 0.62,
    rightShoulderY: 0.63,
  })

  const emitters = runtime.mapArmPoseToParticleEmitters(pose)

  assert.deepEqual(
    emitters.map((emitter) => ({
      hand: emitter.hand,
      x: Number(emitter.x.toFixed(2)),
      y: Number(emitter.y.toFixed(2)),
      visible: emitter.visible,
    })),
    [
      { hand: 'left', x: 0.78, y: 0.18, visible: true },
      { hand: 'right', x: 0.19, y: 0.28, visible: true },
    ],
  )
  assert.equal(emitters[0].intensity > emitters[1].intensity, true)
})

test('note particles spawn as mirrored rainbow bursts and expire after their animation window', () => {
  const emitters = [
    { hand: 'left', x: 0.74, y: 0.24, visible: true, intensity: 1 },
    { hand: 'right', x: 0.28, y: 0.31, visible: true, intensity: 0.6 },
  ]

  const burst = runtime.spawnEmitterNoteParticles(emitters, 5_000, 10)

  assert.equal(burst.particles.length, runtime.AIR_CONDUCTOR_PARTICLE_BURST_SIZE * emitters.length)
  assert.equal(burst.nextId, 10 + burst.particles.length)
  assert.equal(runtime.AIR_CONDUCTOR_PARTICLE_COLORS.includes(burst.particles[0].color), true)
  assert.equal(runtime.AIR_CONDUCTOR_PARTICLE_SYMBOLS.includes(burst.particles[0].symbol), true)
  assert.equal(burst.particles.some((particle) => particle.hand === 'left' && particle.driftX < 0), true)
  assert.equal(burst.particles.some((particle) => particle.hand === 'right' && particle.driftX > 0), true)

  const survivors = runtime.pruneExpiredNoteParticles(
    burst.particles,
    5_000 + runtime.AIR_CONDUCTOR_PARTICLE_LIFETIME_MS - 1,
  )
  assert.equal(survivors.length > 0, true)

  const expired = runtime.pruneExpiredNoteParticles(
    burst.particles,
    5_000 + runtime.AIR_CONDUCTOR_PARTICLE_LIFETIME_MS + 200,
  )
  assert.equal(expired.length, 0)
})

test('conductor trail points follow mirrored emitters and scale visual weight with intensity', () => {
  const emitters = [
    { hand: 'left', x: 0.78, y: 0.18, visible: true, intensity: 1 },
    { hand: 'right', x: 0.2, y: 0.3, visible: true, intensity: 0.35 },
  ]

  const trail = runtime.createConductorTrailFrame(emitters, 8_000, 0)

  assert.equal(trail.points.length, 2)
  assert.equal(trail.nextId, 2)
  assert.equal(trail.points[0].hand, 'left')
  assert.equal(trail.points[0].radius > trail.points[1].radius, true)
  assert.equal(trail.points[0].opacity > trail.points[1].opacity, true)
  assert.equal(trail.points[0].glowSize > trail.points[1].glowSize, true)

  const survivors = runtime.pruneExpiredTrailPoints(
    trail.points,
    8_000 + runtime.AIR_CONDUCTOR_TRAIL_POINT_LIFETIME_MS - 1,
  )
  assert.equal(survivors.length, 2)

  const expired = runtime.pruneExpiredTrailPoints(
    trail.points,
    8_000 + runtime.AIR_CONDUCTOR_TRAIL_POINT_LIFETIME_MS + 1,
  )
  assert.equal(expired.length, 0)
})

test('conductor ripples pulse on strong beats and keep mirrored stage coordinates', () => {
  const emitters = [
    { hand: 'left', x: 0.72, y: 0.2, visible: true, intensity: 0.92 },
    { hand: 'right', x: 0.24, y: 0.34, visible: true, intensity: 0.41 },
  ]

  const ripples = runtime.spawnConductorRipples(emitters, 9_500, 20)

  assert.equal(ripples.ripples.length, 1)
  assert.equal(ripples.nextId, 21)
  assert.equal(ripples.ripples[0].hand, 'left')
  assert.equal(ripples.ripples[0].x, 0.72)
  assert.equal(ripples.ripples[0].radius >= runtime.AIR_CONDUCTOR_RIPPLE_MIN_RADIUS, true)
  assert.equal(ripples.ripples[0].strength > 0.9, true)

  const none = runtime.spawnConductorRipples(
    [{ hand: 'right', x: 0.24, y: 0.34, visible: true, intensity: 0.45 }],
    9_800,
    30,
  )
  assert.equal(none.ripples.length, 0)
  assert.equal(none.nextId, 30)
})

test('beat trajectory segments preserve left/right tonal palettes and expose swing direction vectors', () => {
  const previous = [
    { hand: 'left', x: 0.82, y: 0.26, visible: true, intensity: 0.88 },
    { hand: 'right', x: 0.22, y: 0.42, visible: true, intensity: 0.56 },
  ]
  const current = [
    { hand: 'left', x: 0.7, y: 0.18, visible: true, intensity: 0.93 },
    { hand: 'right', x: 0.34, y: 0.35, visible: true, intensity: 0.61 },
  ]

  const segments = runtime.createBeatTrajectorySegments(previous, current, 12_000, 40)

  assert.equal(segments.segments.length, 2)
  assert.equal(segments.nextId, 42)
  assert.equal(segments.segments[0].hand, 'left')
  assert.equal(segments.segments[0].toneBand, 'high')
  assert.equal(segments.segments[1].toneBand, 'mid')
  assert.equal(segments.segments[0].colorWarm !== segments.segments[1].colorWarm, true)
  assert.equal(segments.segments[0].vectorX < 0, true)
  assert.equal(segments.segments[1].vectorX > 0, true)
  assert.equal(segments.segments[0].vectorY < 0, true)
  assert.equal(segments.segments[0].strokeWidth > segments.segments[1].strokeWidth, true)
  assert.equal(segments.segments[0].opacity >= segments.segments[1].opacity, true)
})
