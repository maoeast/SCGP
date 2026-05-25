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

test('sensory game seed includes the first three camera hand games', () => {
  const { SENSORY_GAME_SEED } = jiti('../../src/data/sensory-game-seed.ts')

  const names = SENSORY_GAME_SEED.map((game) => game.name)
  assert.equal(SENSORY_GAME_SEED.length >= 10, true)
  assert.equal(names.includes('空气木琴'), true)
  assert.equal(names.includes('木块磁贴拼图'), true)
  assert.equal(names.includes('森林手势魔法屋'), true)
})

test('TaskID reserves stable ids for sensory camera hand games', () => {
  const { TaskID } = jiti('../../src/types/games.ts')

  assert.equal(TaskID.HAND_XYLOPHONE, 8)
  assert.equal(TaskID.HAND_WOOD_BLOCKS, 9)
  assert.equal(TaskID.HAND_GESTURE_GARDEN, 10)
})

test('GamePlay wires the three hand games into the sensory runtime', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

  assert.match(source, /HandXylophoneGame/)
  assert.match(source, /WoodBlockPuzzleGame/)
  assert.match(source, /GestureGardenGame/)
  assert.match(source, /TaskID\.HAND_XYLOPHONE/)
  assert.match(source, /TaskID\.HAND_WOOD_BLOCKS/)
  assert.match(source, /TaskID\.HAND_GESTURE_GARDEN/)
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

test('HandCameraLayer shows a large hand cursor instead of a small circle', () => {
  const source = readFileSync(resolve(projectRoot, 'src/components/games/hand/HandCameraLayer.vue'), 'utf8')

  assert.match(source, /hand-camera-layer__cursor-hand/)
  assert.match(source, /width:\s*78px/)
  assert.match(source, /height:\s*78px/)
  assert.match(source, /font-size:\s*48px/)
  assert.match(source, /hand-cursor-glow/)
})
