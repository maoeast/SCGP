import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

test('magic glove overlay model keeps only the upper-body anchors needed by Air Conductor', () => {
  const {
    createMagicGloveOverlayModel,
    LEFT_SHOULDER_INDEX,
    RIGHT_SHOULDER_INDEX,
    LEFT_ELBOW_INDEX,
    RIGHT_ELBOW_INDEX,
    LEFT_WRIST_INDEX,
    RIGHT_WRIST_INDEX,
  } = jiti('../../src/components/games/pose/pose-overlay.ts')

  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }))
  landmarks[LEFT_SHOULDER_INDEX] = { x: 0.36, y: 0.55, visibility: 0.98 }
  landmarks[RIGHT_SHOULDER_INDEX] = { x: 0.64, y: 0.56, visibility: 0.97 }
  landmarks[LEFT_ELBOW_INDEX] = { x: 0.28, y: 0.42, visibility: 0.94 }
  landmarks[RIGHT_ELBOW_INDEX] = { x: 0.72, y: 0.43, visibility: 0.95 }
  landmarks[LEFT_WRIST_INDEX] = { x: 0.18, y: 0.22, visibility: 0.96 }
  landmarks[RIGHT_WRIST_INDEX] = { x: 0.82, y: 0.25, visibility: 0.93 }
  landmarks[0] = { x: 0.5, y: 0.1, visibility: 0.99 }

  const overlay = createMagicGloveOverlayModel(landmarks)

  assert.ok(overlay)
  assert.equal(overlay.leftShoulder?.visible, true)
  assert.equal(overlay.rightShoulder?.visible, true)
  assert.equal(overlay.leftWrist?.visible, true)
  assert.equal(overlay.rightWrist?.visible, true)
  assert.equal(overlay.shoulderCenter?.x, 0.5)
  assert.equal(overlay.leftIntensity > overlay.rightIntensity, true)
  assert.equal(overlay.chestCenter?.y > overlay.shoulderCenter?.y, true)
  assert.equal('face' in overlay, false)
  assert.equal('nose' in overlay, false)
})

test('magic glove intensity drops to zero when the wrist is missing or below the shoulder', () => {
  const {
    calculateMagicGloveIntensity,
  } = jiti('../../src/components/games/pose/pose-overlay.ts')

  assert.equal(
    calculateMagicGloveIntensity(
      { x: 0.4, y: 0.58, visible: true },
      { x: 0.2, y: 0.64, visible: true },
    ),
    0,
  )

  assert.equal(
    calculateMagicGloveIntensity(
      { x: 0.4, y: 0.58, visible: true },
      { x: 0.2, y: 0.22, visible: false },
    ),
    0,
  )
})

test('pose tracker uses custom magic glove overlay instead of raw MediaPipe full-skeleton drawing', () => {
  const source = readFileSync(resolve(projectRoot, 'src/composables/usePoseTracker.ts'), 'utf8')

  assert.match(source, /createMagicGloveOverlayModel/)
  assert.match(source, /drawMagicGloveOverlay/)
  assert.match(source, /drawMagicGlove\(/)
  assert.doesNotMatch(source, /drawConnectors\(/)
  assert.doesNotMatch(source, /drawLandmarks\(/)
  assert.doesNotMatch(source, /POSE_CONNECTIONS/)
  assert.doesNotMatch(source, /DrawingUtils/)
})
