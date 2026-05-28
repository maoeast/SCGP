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

const {
  normalizeExpressionAudioEmotion,
  resolveExpressionAudioState,
  shouldCommitExpressionAudioChange,
} = jiti('../../src/composables/useExpressionAudio.ts')
const {
  hasCustomGameBackgroundMusic,
} = jiti('../../src/audio/game-music-profiles.ts')

test('normalizeExpressionAudioEmotion maps detector values and lowercase aliases to the composable enum', () => {
  assert.equal(normalizeExpressionAudioEmotion('Happy'), 'happy')
  assert.equal(normalizeExpressionAudioEmotion('Surprised'), 'surprised')
  assert.equal(normalizeExpressionAudioEmotion('fear'), 'fearful')
  assert.equal(normalizeExpressionAudioEmotion('Neutral'), 'calm')
  assert.equal(normalizeExpressionAudioEmotion('unknown-value'), 'calm')
  assert.equal(normalizeExpressionAudioEmotion(null), 'calm')
})

test('resolveExpressionAudioState picks profile and state based on emotion intensity', () => {
  assert.deepEqual(resolveExpressionAudioState('calm', 0.2), {
    emotion: 'calm',
    profileId: 'expression-calm',
    state: 'idle',
  })

  assert.deepEqual(resolveExpressionAudioState('happy', 0.91), {
    emotion: 'happy',
    profileId: 'expression-happy',
    state: 'combo',
  })

  assert.deepEqual(resolveExpressionAudioState('angry', 0.2), {
    emotion: 'angry',
    profileId: 'expression-angry',
    state: 'focus',
  })

  assert.deepEqual(resolveExpressionAudioState('surprised', 0.5), {
    emotion: 'surprised',
    profileId: 'expression-surprised',
    state: 'playing',
  })

  assert.deepEqual(resolveExpressionAudioState('surprised', 0.86), {
    emotion: 'surprised',
    profileId: 'expression-surprised',
    state: 'playing',
  })

  assert.deepEqual(resolveExpressionAudioState('surprised', 0.96), {
    emotion: 'surprised',
    profileId: 'expression-surprised',
    state: 'combo',
  })

  assert.deepEqual(resolveExpressionAudioState('angry', 0.32), {
    emotion: 'angry',
    profileId: 'expression-angry',
    state: 'focus',
  })
})

test('shouldCommitExpressionAudioChange waits for stability and cooldown unless forced', () => {
  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: null,
    nextEmotion: 'calm',
    activeState: null,
    nextState: 'idle',
    sameEmotionStableFrames: 1,
    stableFramesRequired: 3,
    elapsedMs: 0,
    minSwitchIntervalMs: 420,
  }), true)

  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: 'calm',
    nextEmotion: 'happy',
    activeState: 'idle',
    nextState: 'playing',
    sameEmotionStableFrames: 2,
    stableFramesRequired: 3,
    elapsedMs: 500,
    minSwitchIntervalMs: 420,
  }), false)

  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: 'calm',
    nextEmotion: 'happy',
    activeState: 'idle',
    nextState: 'playing',
    sameEmotionStableFrames: 3,
    stableFramesRequired: 3,
    elapsedMs: 200,
    minSwitchIntervalMs: 420,
  }), false)

  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: 'calm',
    nextEmotion: 'happy',
    activeState: 'idle',
    nextState: 'playing',
    sameEmotionStableFrames: 3,
    stableFramesRequired: 3,
    elapsedMs: 500,
    minSwitchIntervalMs: 420,
  }), true)

  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: 'sad',
    nextEmotion: 'sad',
    activeState: 'focus',
    nextState: 'focus',
    sameEmotionStableFrames: 12,
    stableFramesRequired: 3,
    elapsedMs: 999,
    minSwitchIntervalMs: 420,
  }), false)

  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: 'sad',
    nextEmotion: 'calm',
    activeState: 'focus',
    nextState: 'idle',
    sameEmotionStableFrames: 1,
    stableFramesRequired: 3,
    elapsedMs: 0,
    minSwitchIntervalMs: 420,
    force: true,
  }), true)

  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: 'calm',
    nextEmotion: 'happy',
    activeState: 'idle',
    nextState: 'playing',
    sameEmotionStableFrames: 3,
    stableFramesRequired: 4,
    elapsedMs: 620,
    minSwitchIntervalMs: 560,
  }), false)

  assert.equal(shouldCommitExpressionAudioChange({
    activeEmotion: 'calm',
    nextEmotion: 'happy',
    activeState: 'idle',
    nextState: 'playing',
    sameEmotionStableFrames: 4,
    stableFramesRequired: 4,
    elapsedMs: 620,
    minSwitchIntervalMs: 560,
  }), true)
})

test('EnergyBallGame and ExpressionDetectiveGame wire the shared expression audio composable', () => {
  const energyBallSource = readFileSync(
    resolve(projectRoot, 'src/components/emotional/games/EnergyBallGame.vue'),
    'utf8',
  )
  const detectiveSource = readFileSync(
    resolve(projectRoot, 'src/components/emotional/games/ExpressionDetectiveGame.vue'),
    'utf8',
  )

  assert.match(energyBallSource, /import\s+\{\s*useExpressionAudio\s*\}\s+from\s+'@\/composables\/useExpressionAudio'/)
  assert.match(energyBallSource, /const expressionAudio = useExpressionAudio\(/)
  assert.match(energyBallSource, /expressionAudio\.changeExpression\(/)
  assert.match(energyBallSource, /expressionAudio\.(stop|dispose)\(/)
  assert.match(energyBallSource, /expressionAudio\.stop\(\)/)

  assert.match(detectiveSource, /import\s+\{\s*useExpressionAudio\s*\}\s+from\s+'@\/composables\/useExpressionAudio'/)
  assert.match(detectiveSource, /const expressionAudio = useExpressionAudio\(/)
  assert.match(detectiveSource, /expressionAudio\.changeExpression\(/)
  assert.match(detectiveSource, /expressionAudio\.(stop|dispose)\(/)
  assert.match(detectiveSource, /expressionAudio\.stop\(\)/)
})

test('EnergyBall and ExpressionDetective are excluded from default background music', () => {
  assert.equal(hasCustomGameBackgroundMusic({
    trainingEntryCode: 'emotional-regulation',
    gameCode: 'G08_ENERGY_BALL',
  }), false)

  assert.equal(hasCustomGameBackgroundMusic({
    trainingEntryCode: 'emotional-regulation',
    gameCode: 'G09_EXPRESSION_DETECTIVE',
  }), false)
})
