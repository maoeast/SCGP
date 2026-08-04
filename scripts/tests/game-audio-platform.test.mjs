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

test('shared game audio settings persist through a stable localStorage key and expose unified defaults', () => {
  const localStorageState = new Map()
  globalThis.localStorage = {
    getItem(key) {
      return localStorageState.has(key) ? localStorageState.get(key) : null
    },
    setItem(key, value) {
      localStorageState.set(key, String(value))
    },
    removeItem(key) {
      localStorageState.delete(key)
    },
  }

  const {
    GAME_AUDIO_SETTINGS_STORAGE_KEY,
    createDefaultGameAudioSettings,
    loadGameAudioSettings,
    saveGameAudioSettings,
  } = jiti('../../src/audio/game-audio-settings.ts')

  assert.equal(GAME_AUDIO_SETTINGS_STORAGE_KEY, 'scgp.gameAudioSettings.v1')
  assert.deepEqual(createDefaultGameAudioSettings(), {
    musicEnabled: true,
    musicVolume: 18,
    effectsEnabled: true,
  })

  assert.deepEqual(loadGameAudioSettings(), {
    musicEnabled: true,
    musicVolume: 18,
    effectsEnabled: true,
  })

  saveGameAudioSettings({
    musicEnabled: false,
    musicVolume: 64,
    effectsEnabled: false,
  })

  assert.deepEqual(JSON.parse(localStorageState.get(GAME_AUDIO_SETTINGS_STORAGE_KEY)), {
    musicEnabled: false,
    musicVolume: 64,
    effectsEnabled: false,
  })
  assert.deepEqual(loadGameAudioSettings(), {
    musicEnabled: false,
    musicVolume: 64,
    effectsEnabled: false,
  })

  localStorageState.set(GAME_AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({
    musicEnabled: 'broken',
    musicVolume: 300,
    effectsEnabled: true,
  }))

  assert.deepEqual(loadGameAudioSettings(), {
    musicEnabled: true,
    musicVolume: 18,
    effectsEnabled: true,
  })
})

test('game music profile mapping stays stable for legacy sensory tasks and registry-backed custom games', () => {
  const { TaskID } = jiti('../../src/types/games.ts')
  const {
    GAME_MUSIC_PROFILES,
    hasCustomGameBackgroundMusic,
    hasLegacyGameBackgroundMusic,
    resolveLegacyGameMusicProfile,
    resolveCustomGameMusicProfile,
    getDefaultMusicStateForLegacyTask,
  } = jiti('../../src/audio/game-music-profiles.ts')

  const profileKeys = Object.keys(GAME_MUSIC_PROFILES)
  assert.equal(profileKeys.includes('bubble'), true)
  assert.equal(profileKeys.includes('calm'), true)
  assert.equal(profileKeys.includes('focus'), true)
  assert.equal(profileKeys.includes('listening'), true)
  assert.equal(profileKeys.includes('music-minimal'), true)
  assert.equal(profileKeys.includes('playful'), true)
  assert.equal(profileKeys.includes('warm-social'), true)

  assert.equal(resolveLegacyGameMusicProfile(TaskID.COLOR_MATCH), 'calm')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.SHAPE_MATCH), 'focus')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.ICON_MATCH), 'warm-social')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.VISUAL_TRACK), 'focus')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.AUDIO_DIFF), 'listening')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.AUDIO_COMMAND), 'listening')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.AUDIO_RHYTHM), 'listening')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.HAND_XYLOPHONE), 'music-minimal')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.HAND_WOOD_BLOCKS), 'calm')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.HAND_BUBBLE_POP), 'bubble')
  assert.equal(resolveLegacyGameMusicProfile(TaskID.AIR_CONDUCTOR), 'music-minimal')
  assert.equal(hasLegacyGameBackgroundMusic(TaskID.AUDIO_DIFF), false)
  assert.equal(hasLegacyGameBackgroundMusic(TaskID.AUDIO_COMMAND), false)
  assert.equal(hasLegacyGameBackgroundMusic(TaskID.AUDIO_RHYTHM), false)
  assert.equal(hasLegacyGameBackgroundMusic(TaskID.HAND_BUBBLE_POP), true)
  assert.equal(hasLegacyGameBackgroundMusic(TaskID.AIR_CONDUCTOR), true)

  assert.equal(getDefaultMusicStateForLegacyTask(TaskID.VISUAL_TRACK), 'focus')
  assert.equal(getDefaultMusicStateForLegacyTask(TaskID.AUDIO_DIFF), 'paused')
  assert.equal(getDefaultMusicStateForLegacyTask(TaskID.AUDIO_COMMAND), 'paused')
  assert.equal(getDefaultMusicStateForLegacyTask(TaskID.AUDIO_RHYTHM), 'paused')
  assert.equal(getDefaultMusicStateForLegacyTask(TaskID.HAND_BUBBLE_POP), 'playing')
  assert.equal(getDefaultMusicStateForLegacyTask(TaskID.AIR_CONDUCTOR), 'paused')

  assert.equal(resolveCustomGameMusicProfile({
    trainingEntryCode: 'emotional-regulation',
    gameCode: 'G01_BALLOON',
  }), 'calm')
  assert.equal(resolveCustomGameMusicProfile({
    trainingEntryCode: 'soothing-aids',
    gameCode: 'C03_XYLOPHONE',
  }), 'music-minimal')
  assert.equal(hasCustomGameBackgroundMusic({
    trainingEntryCode: 'soothing-aids',
    gameCode: 'C03_XYLOPHONE',
  }), false)
  assert.equal(resolveCustomGameMusicProfile({
    trainingEntryCode: 'fine-motor',
    gameCode: 'F05_BALLOONS',
  }), 'focus')
  assert.equal(resolveCustomGameMusicProfile({
    trainingEntryCode: 'social-communication',
    gameCode: 'S01_BURGER',
  }), 'warm-social')
  assert.equal(resolveCustomGameMusicProfile({
    trainingEntryCode: 'life-skills',
    gameCode: 'L06_STEADY_SPOON',
  }), 'calm')
  assert.equal(hasCustomGameBackgroundMusic({
    trainingEntryCode: 'life-skills',
    gameCode: 'L06_STEADY_SPOON',
  }), false)
})
test('game music integration allows Tone worker blobs and avoids re-rendering active parts on every ensureReady call', () => {
  const indexSource = readFileSync(resolve(projectRoot, 'index.html'), 'utf8')
  const engineSource = readFileSync(resolve(projectRoot, 'src/audio/game-music-engine.ts'), 'utf8')

  assert.match(indexSource, /worker-src\s+'self'\s+blob:/)
  assert.doesNotMatch(
    engineSource,
    /if \(this\.currentState !== 'paused'\) \{\s*this\.renderCurrentState\(\)\s*\}/,
  )
  assert.doesNotMatch(engineSource, /this\.melodyPart\?\.stop\(\)/)
  assert.doesNotMatch(engineSource, /this\.bassPart\?\.stop\(\)/)
  assert.match(engineSource, /if \(state === this\.currentState\) \{\s*return\s*\}/)
})
