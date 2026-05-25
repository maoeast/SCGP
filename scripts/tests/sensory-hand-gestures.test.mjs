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

function loadGestures() {
  return jiti('../../src/utils/hand-game-gestures.ts')
}

function makeHand(overrides = {}) {
  const landmarks = Array.from({ length: 21 }, (_, index) => ({
    x: 0.45 + index * 0.002,
    y: 0.45 + index * 0.002,
    z: 0,
  }))

  landmarks[0] = { x: 0.5, y: 0.72, z: 0 }
  landmarks[4] = { x: 0.38, y: 0.5, z: 0 }
  landmarks[5] = { x: 0.42, y: 0.56, z: 0 }
  landmarks[8] = { x: 0.62, y: 0.22, z: 0 }
  landmarks[9] = { x: 0.5, y: 0.54, z: 0 }
  landmarks[12] = { x: 0.52, y: 0.2, z: 0 }
  landmarks[16] = { x: 0.56, y: 0.24, z: 0 }
  landmarks[17] = { x: 0.58, y: 0.56, z: 0 }
  landmarks[20] = { x: 0.6, y: 0.27, z: 0 }

  for (const [index, value] of Object.entries(overrides)) {
    landmarks[Number(index)] = value
  }

  return landmarks
}

test('detects pinch when thumb and index fingertips are close', () => {
  const { isPinching } = loadGestures()
  const hand = makeHand({
    4: { x: 0.41, y: 0.42, z: 0 },
    8: { x: 0.43, y: 0.43, z: 0 },
  })

  assert.equal(isPinching(hand), true)
})

test('classifies an open hand and a fist using fingertip distance from palm', () => {
  const { classifyHandPose } = loadGestures()

  assert.equal(classifyHandPose(makeHand()), 'open')
  assert.equal(
    classifyHandPose(makeHand({
      8: { x: 0.51, y: 0.58, z: 0 },
      12: { x: 0.5, y: 0.57, z: 0 },
      16: { x: 0.49, y: 0.58, z: 0 },
      20: { x: 0.48, y: 0.59, z: 0 },
    })),
    'fist',
  )
})

test('detects a downward strike crossing a target line', () => {
  const { detectDownwardStrike } = loadGestures()

  assert.equal(
    detectDownwardStrike(
      { x: 0.4, y: 0.48 },
      { x: 0.42, y: 0.68 },
      { top: 0.56, bottom: 0.82, left: 0.2, right: 0.6 },
    ),
    true,
  )
})

test('finds which normalized target rect contains the hand point', () => {
  const { findRectHit } = loadGestures()

  assert.equal(
    findRectHit(
      { x: 0.35, y: 0.74 },
      [
        { left: 0.1, right: 0.25, top: 0.6, bottom: 0.9 },
        { left: 0.28, right: 0.42, top: 0.6, bottom: 0.9 },
      ],
    ),
    1,
  )
  assert.equal(
    findRectHit(
      { x: 0.5, y: 0.5 },
      [{ left: 0.1, right: 0.25, top: 0.6, bottom: 0.9 }],
    ),
    -1,
  )
})

test('maps mirrored camera coordinates into stage coordinates', () => {
  const { mapLandmarkToStagePoint } = loadGestures()

  assert.deepEqual(
    mapLandmarkToStagePoint({ x: 0.25, y: 0.5 }, { width: 800, height: 600 }),
    { x: 600, y: 300 },
  )
})

test('maps a landmark directly into normalized mirrored stage coordinates', () => {
  const { mapLandmarkToNormalizedStagePoint } = loadGestures()

  assert.deepEqual(
    mapLandmarkToNormalizedStagePoint({ x: 0.2, y: 0.7 }),
    { x: 0.8, y: 0.7 },
  )
})
