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

test('sensory game seed includes the retained camera hand games and the new bubble pop game', () => {
  const { SENSORY_GAME_SEED } = jiti('../../src/data/sensory-game-seed.ts')

  const names = SENSORY_GAME_SEED.map((game) => game.name)
  assert.equal(SENSORY_GAME_SEED.length >= 11, true)
  assert.equal(names.includes('空气木琴'), true)
  assert.equal(names.includes('木块磁贴拼图'), true)
  assert.equal(names.includes('打泡泡'), true)
  assert.equal(names.includes('森林手势魔法屋'), false)
})

test('TaskID reserves stable ids for the retained sensory camera hand games and bubble pop', () => {
  const { TaskID } = jiti('../../src/types/games.ts')

  assert.equal(TaskID.HAND_XYLOPHONE, 8)
  assert.equal(TaskID.HAND_WOOD_BLOCKS, 9)
  assert.equal(TaskID.HAND_BUBBLE_POP, 10)
  assert.equal(TaskID.AIR_CONDUCTOR, 11)
  assert.equal('HAND_GESTURE_GARDEN' in TaskID, false)
})

test('GamePlay wires the retained hand games and bubble pop into the sensory runtime without the removed garden game', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

  assert.match(source, /HandXylophoneGame/)
  assert.match(source, /WoodBlockPuzzleGame/)
  assert.match(source, /BubblePopGame/)
  assert.match(source, /TaskID\.HAND_XYLOPHONE/)
  assert.match(source, /TaskID\.HAND_WOOD_BLOCKS/)
  assert.match(source, /TaskID\.HAND_BUBBLE_POP/)
  assert.doesNotMatch(source, /GestureGardenGame/)
  assert.doesNotMatch(source, /TaskID\.HAND_GESTURE_GARDEN/)
})

test('Air Conductor stage 3 wiring is present across seed, play, runtime types, and active component structure', () => {
  const { SENSORY_GAME_SEED } = jiti('../../src/data/sensory-game-seed.ts')
  const playSource = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')
  const componentSource = readFileSync(resolve(projectRoot, 'src/components/games/pose/AirConductorGame.vue'), 'utf8')
  const cameraLayerSource = readFileSync(resolve(projectRoot, 'src/components/games/pose/PoseCameraLayer.vue'), 'utf8')
  const runtimeSource = readFileSync(resolve(projectRoot, 'src/components/games/pose/air-conductor-runtime.ts'), 'utf8')
  const overlaySource = readFileSync(resolve(projectRoot, 'src/components/games/pose/pose-overlay.ts'), 'utf8')
  const audioSource = readFileSync(resolve(projectRoot, 'src/composables/usePoseAudio.ts'), 'utf8')
  const apiSource = readFileSync(resolve(projectRoot, 'src/database/api.ts'), 'utf8')

  const airConductorSeed = SENSORY_GAME_SEED.find((game) => game.taskId === 11)
  assert.ok(airConductorSeed)
  assert.equal(airConductorSeed?.mode, 'air-conductor')
  assert.equal(airConductorSeed?.category, 'motor')

  assert.match(playSource, /AirConductorGame/)
  assert.match(playSource, /TaskID\.AIR_CONDUCTOR/)
  assert.match(playSource, /return 'air-conductor'/)
  assert.match(playSource, /if \(taskId\.value === TaskID\.AIR_CONDUCTOR && route\.query\.duration === undefined\)/)
  assert.match(playSource, /:duration="duration"/)

  assert.match(componentSource, /usePoseAudio/)
  assert.match(componentSource, /PoseCameraLayer/)
  assert.match(componentSource, /phase === 'countdown'/)
  assert.match(componentSource, /totalExtensions = computed/)
  assert.match(componentSource, /stats\.value\.leftArmExtensions/)
  assert.match(componentSource, /stats\.value\.rightArmExtensions/)
  assert.match(componentSource, /stats\.maxReachScore/)
  assert.match(componentSource, /handGameStats:/)
  assert.match(componentSource, /air-conductor__particle-layer/)
  assert.match(componentSource, /air-conductor__beat-layer/)
  assert.match(componentSource, /air-conductor__beat-segment/)
  assert.match(componentSource, /air-conductor__emitter/)
  assert.match(componentSource, /air-conductor__trail-point/)
  assert.match(componentSource, /air-conductor__ripple/)
  assert.match(componentSource, /air-conductor__particle/)
  assert.match(componentSource, /createBeatTrajectorySegments/)
  assert.match(componentSource, /createConductorTrailFrame/)
  assert.match(componentSource, /spawnConductorRipples/)
  assert.match(componentSource, /mapArmPoseToParticleEmitters/)
  assert.match(componentSource, /spawnEmitterNoteParticles/)
  assert.match(componentSource, /air-conductor__prompt-card/)
  assert.match(componentSource, /air-conductor__prompt-title/)
  assert.match(componentSource, /air-conductor__hud-stack/)
  assert.match(componentSource, /air-conductor__hud-stack--offframe/)
  assert.match(componentSource, /air-conductor__hud-stack--default/)
  assert.match(componentSource, /air-conductor__status-panel--spotlight/)
  assert.match(componentSource, /mainPromptTitle/)
  assert.match(componentSource, /mainPromptBody/)
  assert.match(componentSource, /mainPromptToneClass/)
  assert.doesNotMatch(componentSource, /air-conductor__panel/)
  assert.doesNotMatch(componentSource, /air-conductor__metric-card/)
  assert.doesNotMatch(componentSource, /air-conductor__notes/)
  assert.doesNotMatch(componentSource, /air-conductor__floating-pitch/)
  assert.doesNotMatch(componentSource, /air-conductor__camera-meta/)
  assert.doesNotMatch(componentSource, /class="air-conductor__offframe"/)
  assert.match(componentSource, /空中魔法指挥棒/)
  assert.match(componentSource, /准备开始上肢协同训练/)
  assert.match(componentSource, /调整好再继续/)
  assert.match(componentSource, /站回镜头里/)
  assert.match(componentSource, /重新校准/)
  assert.doesNotMatch(componentSource, /air-conductor-placeholder/)
  assert.match(cameraLayerSource, /\.pose-camera-layer__video[\s\S]*transform:\s*scaleX\(-1\)/)
  assert.match(cameraLayerSource, /\.pose-camera-layer__canvas[\s\S]*transform:\s*scaleX\(-1\)/)
  assert.match(overlaySource, /createMagicGloveOverlayModel/)
  assert.match(overlaySource, /leftIntensity/)
  assert.match(overlaySource, /rightIntensity/)

  assert.match(runtimeSource, /AIR_CONDUCTOR_SMOOTH_ALPHA/)
  assert.match(runtimeSource, /updateArmLiftState/)
  assert.match(runtimeSource, /accumulateBilateralCoordSec/)
  assert.match(runtimeSource, /calculateReachScore/)
  assert.match(runtimeSource, /AIR_CONDUCTOR_PARTICLE_COLORS/)
  assert.match(runtimeSource, /AIR_CONDUCTOR_BEAT_TRAJECTORY_LIFETIME_MS/)
  assert.match(runtimeSource, /AIR_CONDUCTOR_BEAT_TRAJECTORY_PALETTE/)
  assert.match(runtimeSource, /createBeatTrajectorySegments/)
  assert.match(runtimeSource, /AIR_CONDUCTOR_TRAIL_POINT_LIFETIME_MS/)
  assert.match(runtimeSource, /AIR_CONDUCTOR_RIPPLE_TRIGGER_THRESHOLD/)
  assert.match(runtimeSource, /createConductorTrailFrame/)
  assert.match(runtimeSource, /mapArmPoseToParticleEmitters/)
  assert.match(runtimeSource, /spawnConductorRipples/)
  assert.match(runtimeSource, /spawnEmitterNoteParticles/)
  assert.match(audioSource, /musicController\?\.duckMusic\('low'\)/)
  assert.match(audioSource, /countdownValue/)
  assert.match(audioSource, /offFrameCount/)
  assert.match(apiSource, /payload\.handGameStats = rawData\.handGameStats/)
  assert.match(playSource, /空中魔法指挥棒/)
})

test('bubble pop runtime exposes difficulty-based bubble spawning ranges and hard-mode splitting', () => {
  const {
    BUBBLE_POP_DIFFICULTIES,
    createBubblePopState,
    createBubblePopBubble,
  } = jiti('../../src/components/games/hand/bubble-pop-game.ts')

  const stageSize = { width: 1280, height: 720 }
  const easyState = createBubblePopState({ mode: 'free', difficulty: 'easy', stageSize, now: 0 })
  const hardState = createBubblePopState({ mode: 'free', difficulty: 'hard', stageSize, now: 0 })

  const easyBubble = createBubblePopBubble(easyState, stageSize, () => 0)
  const hardBubble = createBubblePopBubble(hardState, stageSize, () => 0.99)

  assert.equal(BUBBLE_POP_DIFFICULTIES.easy.maxCount, 8)
  assert.equal(BUBBLE_POP_DIFFICULTIES.normal.colorCount, 4)
  assert.equal(BUBBLE_POP_DIFFICULTIES.hard.splitOnPop, true)
  assert.equal(easyBubble.radius > hardBubble.radius, true)
  assert.equal(Math.abs(easyBubble.vy) < Math.abs(hardBubble.vy), true)
  assert.equal(hardBubble.rotationSpeed !== 0, true)
})

test('bubble pop runtime deduplicates same-frame hits and only awards one pop per bubble', () => {
  const {
    createBubblePopState,
    createBubblePopBubble,
    applyBubblePopContacts,
  } = jiti('../../src/components/games/hand/bubble-pop-game.ts')

  const stageSize = { width: 1280, height: 720 }
  const state = createBubblePopState({ mode: 'free', difficulty: 'normal', stageSize, now: 0 })
  const bubble = createBubblePopBubble(state, stageSize, () => 0.3)
  bubble.x = 0.5
  bubble.y = 0.5
  bubble.radius = 0.06
  bubble.colorId = 'blue'
  state.bubbles.push(bubble)

  const result = applyBubblePopContacts(
    state,
    [
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.51, y: 0.51 },
    ],
    1000,
  )

  assert.equal(result.hits.length, 1)
  assert.equal(state.correctHits, 1)
  assert.equal(state.score, 10)
  assert.equal(state.combo, 2)
  assert.equal(state.bubbles[0]?.popped, true)
})

test('bubble pop runtime resets combo after timeout, switches modes cleanly, and penalizes wrong target hits', () => {
  const {
    createBubblePopState,
    createBubblePopBubble,
    applyBubblePopContacts,
    advanceBubblePopState,
    switchBubblePopMode,
  } = jiti('../../src/components/games/hand/bubble-pop-game.ts')

  const stageSize = { width: 1280, height: 720 }
  const state = createBubblePopState({ mode: 'free', difficulty: 'normal', stageSize, now: 0 })

  const firstBubble = createBubblePopBubble(state, stageSize, () => 0.1)
  firstBubble.x = 0.4
  firstBubble.y = 0.4
  firstBubble.radius = 0.06
  firstBubble.colorId = 'red'
  state.bubbles.push(firstBubble)
  applyBubblePopContacts(state, [{ x: 0.4, y: 0.4 }], 200)

  const secondBubble = createBubblePopBubble(state, stageSize, () => 0.2)
  secondBubble.x = 0.6
  secondBubble.y = 0.45
  secondBubble.radius = 0.06
  secondBubble.colorId = 'yellow'
  state.bubbles.push(secondBubble)
  applyBubblePopContacts(state, [{ x: 0.6, y: 0.45 }], 600)

  assert.equal(state.score, 30)
  assert.equal(state.combo, 3)

  advanceBubblePopState(state, { now: 3601, stageSize })
  assert.equal(state.combo, 1)

  switchBubblePopMode(state, 'color', 4000)
  assert.equal(state.mode, 'color')
  assert.equal(state.score, 0)
  assert.equal(state.combo, 1)
  assert.ok(state.targetColorId)

  const wrongBubble = createBubblePopBubble(state, stageSize, () => 0.5)
  wrongBubble.x = 0.5
  wrongBubble.y = 0.35
  wrongBubble.radius = 0.06
  wrongBubble.colorId = state.targetColorId === 'red' ? 'blue' : 'red'
  state.bubbles.push(wrongBubble)
  applyBubblePopContacts(state, [{ x: 0.5, y: 0.35 }], 4300)

  assert.equal(state.wrongHits, 1)
  assert.equal(state.score, 0)
  assert.equal(state.combo, 1)
  assert.equal(state.bubbles[state.bubbles.length - 1]?.popped, false)
  assert.equal(state.bubbles[state.bubbles.length - 1]?.shakeUntil > 4300, true)
})

test('wood block puzzle exposes six SVG shapes and three difficulty tiers', () => {
  const {
    WOOD_BLOCK_SHAPES,
    WOOD_BLOCK_DIFFICULTIES,
    sanitizeWoodBlockDifficulty,
    renderWoodBlockShapeSvg,
  } = jiti('../../src/components/games/hand/wood-block-puzzle.ts')
  const { getWoodenShapeBlockSvgMarkup } = jiti('../../src/components/games/shared/wooden-shape-block.ts')

  assert.deepEqual(
    WOOD_BLOCK_SHAPES.map((shape) => shape.id),
    ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'],
  )
  assert.equal(WOOD_BLOCK_DIFFICULTIES.low.shapeCount, 3)
  assert.equal(WOOD_BLOCK_DIFFICULTIES.mid.snapDistance, 55)
  assert.equal(WOOD_BLOCK_DIFFICULTIES.high.piecesRotated, true)
  assert.equal(sanitizeWoodBlockDifficulty('missing'), 'mid')
  assert.equal(WOOD_BLOCK_SHAPES.find((shape) => shape.id === 'triangle')?.svgPath, getWoodenShapeBlockSvgMarkup('triangle'))
  assert.match(renderWoodBlockShapeSvg('heart', 'piece'), /<svg/)
  assert.match(renderWoodBlockShapeSvg('heart', 'slot'), /stroke-dasharray="6 4"/)
})

test('wood block puzzle layout reflects the selected difficulty and rotates only in high mode', () => {
  const {
    createWoodBlockLayout,
  } = jiti('../../src/components/games/hand/wood-block-puzzle.ts')

  const lowLayout = createWoodBlockLayout('low', () => 0)
  const highLayout = createWoodBlockLayout('high', () => 0.99)

  assert.equal(lowLayout.slots.length, 3)
  assert.equal(lowLayout.pieces.length, 3)
  assert.equal(lowLayout.pieces.every((piece) => piece.rotation === 0), true)
  assert.equal(highLayout.slots.length, 6)
  assert.equal(highLayout.pieces.length, 6)
  assert.equal(highLayout.pieces.every((piece) => piece.rotation % 90 === 0), true)
})

test('wood block puzzle reusable matching helpers classify return, match, and miss outcomes', () => {
  const {
    findNearestWoodBlockPiece,
    resolveWoodBlockDropOutcome,
  } = jiti('../../src/components/games/hand/wood-block-puzzle.ts')

  const pieces = [
    { id: 'circle', x: 0.2, y: 0.8, placed: false, animating: false },
    { id: 'square', x: 0.5, y: 0.8, placed: false, animating: false },
  ]
  const slots = [
    { id: 'circle', x: 0.2, y: 0.3 },
    { id: 'square', x: 0.5, y: 0.3 },
  ]
  const stageSize = { width: 1000, height: 800 }

  assert.equal(findNearestWoodBlockPiece({ x: 0.21, y: 0.81 }, pieces, stageSize, 120)?.id, 'circle')
  assert.deepEqual(
    resolveWoodBlockDropOutcome({ id: 'circle', x: 0.2, y: 0.31 }, slots, stageSize, 20),
    { type: 'match', slot: slots[0] },
  )
  assert.deepEqual(
    resolveWoodBlockDropOutcome({ id: 'circle', x: 0.5, y: 0.31 }, slots, stageSize, 20),
    { type: 'miss', slot: slots[1] },
  )
  assert.deepEqual(
    resolveWoodBlockDropOutcome({ id: 'circle', x: 0.9, y: 0.9 }, slots, stageSize, 20),
    { type: 'return' },
  )
})

test('wood block session summary counts failed drops into accuracy and completion score', () => {
  const {
    summarizeWoodBlockSession,
  } = jiti('../../src/components/games/hand/wood-block-puzzle.ts')

  const summary = summarizeWoodBlockSession({
    shapeCount: 4,
    matchedCount: 3,
    failedAttempts: 2,
    startedAt: 0,
    endedAt: 5000,
  })

  assert.equal(summary.durationSeconds, 5)
  assert.equal(summary.totalTrials, 5)
  assert.equal(summary.correctTrials, 3)
  assert.equal(summary.omissionErrors, 1)
  assert.equal(summary.commissionErrors, 2)
  assert.equal(summary.completionScore, 75)
})

test('AirXylophone triggers notes by entering the note zone and resumes audio', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/hand/AirXylophoneGame.vue'), 'utf8')

  assert.match(source, /findRectHit/)
  assert.match(source, /lastHoverNoteId/)
  assert.match(source, /noteTriggerDebounceMs\s*=\s*120/)
  assert.match(source, /triggerNote/)
  assert.match(source, /ctx\.state === 'suspended'/)
  assert.match(source, /ctx\.resume/)
})

test('AirXylophone evaluates both hands independently and supports fist re-strikes', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/hand/AirXylophoneGame.vue'), 'utf8')

  assert.match(source, /processHandPoint/)
  assert.match(source, /hands\.forEach/)
  assert.match(source, /handPlayStates/)
  assert.match(source, /classifyHandPose/)
  assert.match(source, /wasFist/)
  assert.match(source, /activeNoteIds/)
  assert.match(source, /if \(latestHands\.value\.length > 0\)/)
})

test('AirXylophone uses guided melody, camera stage, waveform, and particles', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/hand/AirXylophoneGame.vue'), 'utf8')

  assert.match(source, /air-xylophone__melody/)
  assert.match(source, /currentSong/)
  assert.match(source, /currentMelodySequence/)
  assert.match(source, /melodyStepIndex/)
  assert.match(source, /air-xylophone__camera/)
  assert.match(source, /hand-skeleton/)
  assert.match(source, /waveBars/)
  assert.match(source, /air-xylophone__wave/)
  assert.match(source, /spawnParticles/)
  assert.match(source, /musicParticles/)
  assert.match(source, /:deep\(\.hand-camera-layer__video\)/)
})

test('AirXylophone exposes 60, 90, and 120 second training durations with difficulty selection', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/GamePreviewCard.vue'), 'utf8')

  assert.match(source, /isAirXylophoneGame/)
  assert.match(source, /AIR_XYLOPHONE_DIFFICULTY_OPTIONS/)
  assert.match(source, /config\.duration = 60/)
  assert.match(source, /<el-radio-button :value="60">60/)
  assert.match(source, /<el-radio-button :value="90">90/)
  assert.match(source, /<el-radio-button :value="120">120/)
  assert.match(source, /airXylophoneDifficulty/)
})

test('GamePreviewCard exposes wood block difficulty selection and in-game switch hint', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/GamePreviewCard.vue'), 'utf8')

  assert.match(source, /isWoodBlockPuzzleGame/)
  assert.match(source, /woodBlockDifficulty/)
  assert.match(source, /<el-radio-button value="low">简单/)
  assert.match(source, /<el-radio-button value="mid">普通/)
  assert.match(source, /<el-radio-button value="high">困难/)
  assert.match(source, /进入训练后仍可在游戏顶部继续切换难度/)
})

test('GamePreviewCard, GameLobby, and GamePlay pass bubble pop mode and difficulty into the runtime', () => {
  const previewSource = readFileSync(resolve(projectRoot, 'src/components/games/GamePreviewCard.vue'), 'utf8')
  const lobbySource = readFileSync(resolve(projectRoot, 'src/views/games/GameLobby.vue'), 'utf8')
  const playSource = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

  assert.match(previewSource, /isBubblePopGame/)
  assert.match(previewSource, /bubblePopMode/)
  assert.match(previewSource, /bubblePopDifficulty/)
  assert.match(previewSource, /<el-radio-button value="free">自由/)
  assert.match(previewSource, /<el-radio-button value="color">分类/)
  assert.match(previewSource, /<el-radio-button value="easy">简单/)
  assert.match(previewSource, /<el-radio-button value="normal">普通/)
  assert.match(previewSource, /<el-radio-button value="hard">困难/)
  assert.match(previewSource, /进入训练后仍可在游戏顶部继续切换玩法和难度/)
  assert.match(lobbySource, /bubblePopMode/)
  assert.match(lobbySource, /query\.bubblePopMode = gameConfig\.bubblePopMode/)
  assert.match(lobbySource, /bubblePopDifficulty/)
  assert.match(lobbySource, /query\.bubblePopDifficulty = gameConfig\.bubblePopDifficulty/)
  assert.match(playSource, /const bubblePopMode = ref/)
  assert.match(playSource, /const bubblePopDifficulty = ref/)
  assert.match(playSource, /:mode="bubblePopMode"/)
  assert.match(playSource, /:difficulty="bubblePopDifficulty"/)
})

test('BubblePopGame consumes the reusable runtime and renders canvas HUD controls instead of hardcoded inline logic', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/hand/BubblePopGame.vue'), 'utf8')

  assert.match(source, /HandCameraLayer/)
  assert.match(source, /bubble-pop__canvas/)
  assert.match(source, /bubble-pop__topbar/)
  assert.match(source, /bubble-pop__back-button/)
  assert.match(source, /back: \[\]/)
  assert.match(source, /createBubblePopState/)
  assert.match(source, /advanceBubblePopState/)
  assert.match(source, /applyBubblePopContacts/)
  assert.match(source, /switchBubblePopMode/)
  assert.match(source, /switchBubblePopDifficulty/)
  assert.match(source, /requestAnimationFrame/)
  assert.doesNotMatch(source, /<Teleport/)
  assert.doesNotMatch(source, /class Bubble/)
})

test('bubble pop free mode exposes 60, 90, and 120 second durations while color mode stays goal-based', () => {
  const previewSource = readFileSync(resolve(projectRoot, 'src/components/games/GamePreviewCard.vue'), 'utf8')
  const playSource = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')
  const componentSource = readFileSync(resolve(projectRoot, 'src/components/games/hand/BubblePopGame.vue'), 'utf8')
  const {
    BUBBLE_POP_FREE_MODE_DURATIONS,
    createBubblePopState,
    advanceBubblePopState,
  } = jiti('../../src/components/games/hand/bubble-pop-game.ts')

  assert.deepEqual(BUBBLE_POP_FREE_MODE_DURATIONS, [60, 90, 120])
  assert.match(previewSource, /config\.duration/)
  assert.match(previewSource, /<el-radio-button :value="60">60/)
  assert.match(previewSource, /<el-radio-button :value="90">90/)
  assert.match(previewSource, /<el-radio-button :value="120">120/)
  assert.match(playSource, /:duration="duration"/)
  assert.match(componentSource, /duration\?: number/)

  const freeState = createBubblePopState({ mode: 'free', durationMs: 90_000, now: 0 })
  advanceBubblePopState(freeState, { now: 89_000 })
  assert.equal(freeState.isFinished, false)
  advanceBubblePopState(freeState, { now: 90_000 })
  assert.equal(freeState.finishReason, 'timeout')

  const colorState = createBubblePopState({ mode: 'color', durationMs: 120_000, now: 0 })
  advanceBubblePopState(colorState, { now: 180_000 })
  assert.equal(colorState.isFinished, false)
})

test('shared game audio controller types expose unified music controls for registry-backed games', () => {
  const source = readFileSync(resolve(projectRoot, 'src/types/emotional/games.ts'), 'utf8')

  assert.match(source, /musicEnabled:\s*boolean/)
  assert.match(source, /musicVolume:\s*number/)
  assert.match(source, /effectsEnabled:\s*boolean/)
  assert.match(source, /setProfile:\s*\(profileId:/)
  assert.match(source, /setState:\s*\(state:/)
  assert.match(source, /duckMusic:\s*\(mode:/)
  assert.match(source, /restoreMusic:\s*\(\)\s*=>\s*void/)
  assert.match(source, /stopMusic:\s*\(\)\s*=>\s*void/)
  assert.match(source, /dispose:\s*\(\)\s*=>\s*void/)
})

test('GamePlay and SensoryGameShell wire a shared music controller and shared settings entry for sensory games', () => {
  const playSource = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')
  const shellSource = readFileSync(resolve(projectRoot, 'src/components/games/SensoryGameShell.vue'), 'utf8')

  assert.match(playSource, /game-music-controller/)
  assert.match(playSource, /provide\(/)
  assert.match(playSource, /setProfile\(/)
  assert.match(playSource, /setState\(/)
  assert.match(shellSource, /背景音乐/)
  assert.match(shellSource, /musicEnabled/)
  assert.match(shellSource, /musicVolume/)
})

test('BubblePopGame and GameContainer both use the shared music controller instead of standalone ambient logic', () => {
  const bubbleSource = readFileSync(resolve(projectRoot, 'src/components/games/hand/BubblePopGame.vue'), 'utf8')
  const containerSource = readFileSync(resolve(projectRoot, 'src/views/emotional/games/GameContainer.vue'), 'utf8')

  assert.match(bubbleSource, /game-music-controller/)
  assert.match(bubbleSource, /duckMusic|setState|restoreMusic/)
  assert.match(bubbleSource, /背景音乐|musicEnabled|musicVolume/)
  assert.match(containerSource, /game-music-controller/)
  assert.match(containerSource, /game-audio-settings/)
  assert.match(containerSource, /loadGameAudioSettings/)
  assert.match(containerSource, /saveGameAudioSettings/)
  assert.doesNotMatch(containerSource, /const settings = reactive<EmotionGameSettings>\(\{\s*backgroundVolume:/)
})

test('AirXylophone song library provides at least three songs per difficulty', () => {
  const {
    AIR_XYLOPHONE_DIFFICULTIES,
    AIR_XYLOPHONE_DIFFICULTY_OPTIONS,
  } = jiti('../../src/data/air-xylophone-songs.ts')

  assert.equal(AIR_XYLOPHONE_DIFFICULTIES.length >= 3, true)
  assert.equal(AIR_XYLOPHONE_DIFFICULTY_OPTIONS.length, AIR_XYLOPHONE_DIFFICULTIES.length)

  for (const difficulty of AIR_XYLOPHONE_DIFFICULTIES) {
    assert.equal(difficulty.songs.length >= 3, true, `${difficulty.id} should include at least 3 songs`)
    for (const song of difficulty.songs) {
      assert.equal(song.difficulty, difficulty.id)
      assert.equal(song.melody.length >= 6, true, `${song.id} should include a guided melody`)
      assert.equal(song.melody.every((step) => step.noteId && step.label), true)
    }
  }
})

test('AirXylophone randomly selects a song within the selected difficulty', () => {
  const {
    resolveAirXylophoneDifficulty,
    selectRandomAirXylophoneSong,
  } = jiti('../../src/data/air-xylophone-songs.ts')

  const easy = resolveAirXylophoneDifficulty('easy')
  const firstSong = selectRandomAirXylophoneSong('easy', () => 0)
  const lastSong = selectRandomAirXylophoneSong('easy', () => 0.999)
  const fallbackSong = selectRandomAirXylophoneSong('missing-difficulty', () => 0)

  assert.equal(firstSong.id, easy.songs[0].id)
  assert.equal(lastSong.id, easy.songs[easy.songs.length - 1].id)
  assert.equal(fallbackSong.difficulty, 'medium')
})

test('AirXylophone melody progress advances, ignores wrong notes, and loops after completion', () => {
  const {
    advanceAirXylophoneMelodyProgress,
  } = jiti('../../src/data/air-xylophone-songs.ts')

  assert.deepEqual(
    advanceAirXylophoneMelodyProgress({ stepIndex: 0, celebrating: false }, 'do', 're', 3),
    { stepIndex: 0, celebrating: false },
  )
  assert.deepEqual(
    advanceAirXylophoneMelodyProgress({ stepIndex: 0, celebrating: false }, 'do', 'do', 3),
    { stepIndex: 1, celebrating: false },
  )
  assert.deepEqual(
    advanceAirXylophoneMelodyProgress({ stepIndex: 2, celebrating: false }, 'mi', 'mi', 3),
    { stepIndex: 2, celebrating: true },
  )
  assert.deepEqual(
    advanceAirXylophoneMelodyProgress({ stepIndex: 2, celebrating: true }, 'mi', 'mi', 3),
    { stepIndex: 2, celebrating: true },
  )
})

test('GamePlay passes the selected AirXylophone difficulty into the runtime', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

  assert.match(source, /airXylophoneDifficulty/)
  assert.match(source, /:difficulty="airXylophoneDifficulty"/)
})

test('GameLobby and GamePlay pass the selected wood block difficulty into the puzzle runtime', () => {
  const lobbySource = readFileSync(resolve(projectRoot, 'src/views/games/GameLobby.vue'), 'utf8')
  const playSource = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

  assert.match(lobbySource, /woodBlockDifficulty/)
  assert.match(lobbySource, /query\.woodBlockDifficulty = gameConfig\.woodBlockDifficulty/)
  assert.match(playSource, /sanitizeWoodBlockDifficulty/)
  assert.match(playSource, /const woodBlockDifficulty = ref/)
  assert.match(playSource, /:difficulty="woodBlockDifficulty"/)
})

test('WoodBlockPuzzleGame includes SVG pieces, success and failure feedback, celebration, and replay controls', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/hand/WoodBlockPuzzleGame.vue'), 'utf8')

  assert.match(source, /renderWoodBlockShapeSvg/)
  assert.match(source, /WOOD_BLOCK_DIFFICULTIES/)
  assert.match(source, /WoodenShapeBlock/)
  assert.match(source, /findNearestWoodBlockPiece/)
  assert.match(source, /resolveWoodBlockDropOutcome/)
  assert.match(source, /spawnParticles/)
  assert.match(source, /playSuccessBeep/)
  assert.match(source, /playFailureBeep/)
  assert.match(source, /slotBounce/)
  assert.match(source, /shake/)
  assert.match(source, /再玩一次/)
  assert.match(source, /完成训练/)
  assert.match(source, /showHintForSlot/)
  assert.match(source, /\.wood-block-game__topbar/)
  assert.match(source, /left:\s*clamp\(172px,\s*15vw,\s*220px\)/)
  assert.match(source, /@media \(max-width:\s*700px\)/)
  assert.doesNotMatch(source, /slot\.id === piece\.id/)
  assert.doesNotMatch(source, /function mixColor/)
})

test('WoodenShapeBlock centralizes reusable wooden shape rendering, including heart blocks', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/shared/WoodenShapeBlock.vue'), 'utf8')
  const helperSource = readFileSync(resolve(projectRoot, 'src/components/games/shared/wooden-shape-block.ts'), 'utf8')

  assert.match(source, /buildWoodenShapeBlockPalette/)
  assert.match(source, /buildWoodenShapeBlockMaskStyle/)
  assert.match(source, /wooden-shape-block__body--\$\{shapeId\}/)
  assert.match(helperSource, /buildWoodenShapeBlockPalette/)
  assert.match(helperSource, /buildWoodenShapeBlockMaskStyle/)
  assert.match(helperSource, /getWoodenShapeBlockSvgMarkup/)
  assert.match(helperSource, /hexagon:\s*'<polygon/)
  assert.match(helperSource, /trapezoid:\s*'<polygon/)
  assert.match(helperSource, /heart:\s*'<path/)
  assert.match(helperSource, /50,6 94,94 6,94/)
  assert.match(helperSource, /mixWoodenShapeColor/)
})

test('GameGrid shape mode reuses WoodenShapeBlock instead of duplicating wooden mask styles', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/visual/GameGrid.vue'), 'utf8')

  assert.match(source, /import WoodenShapeBlock/)
  assert.match(source, /<WoodenShapeBlock/)
  assert.match(source, /getShapeBlockColor/)
  assert.doesNotMatch(source, /function getShapeBlockPalette/)
  assert.doesNotMatch(source, /\.shape-block--triangle/)
})

test('HandCameraLayer shows a large hand cursor instead of a small circle', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/hand/HandCameraLayer.vue'), 'utf8')

  assert.match(source, /hand-camera-layer__cursor-hand/)
  assert.match(source, /width:\s*78px/)
  assert.match(source, /height:\s*78px/)
  assert.match(source, /font-size:\s*48px/)
  assert.match(source, /hand-cursor-glow/)
})

test('garden hand game files are removed from the hand games directory', () => {
  const handGameSource = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

  assert.doesNotMatch(handGameSource, /GestureGardenGame/)
  assert.doesNotMatch(handGameSource, /HAND_GESTURE_GARDEN/)
})
