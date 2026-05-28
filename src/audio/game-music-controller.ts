import { inject, type InjectionKey } from 'vue'
import type { SharedGameAudioSettings } from './game-audio-settings'
import { GameMusicEngine } from './game-music-engine'
import type { GameMusicDuckMode, GameMusicProfileId, GameMusicStateId } from './game-music-profiles'

export interface GameMusicController {
  ensureReady: () => Promise<void>
  setProfile: (profileId: GameMusicProfileId) => void
  setState: (state: GameMusicStateId) => void
  duckMusic: (mode: GameMusicDuckMode) => void
  restoreMusic: () => void
  stopMusic: () => void
  applySettings: (settings: SharedGameAudioSettings) => void
  dispose: () => void
}

export const GAME_MUSIC_CONTROLLER_KEY: InjectionKey<GameMusicController> = Symbol('GAME_MUSIC_CONTROLLER_KEY')

export function createGameMusicController(settings: SharedGameAudioSettings): GameMusicController {
  const engine = new GameMusicEngine(settings)

  return {
    ensureReady() {
      return engine.ensureReady()
    },
    setProfile(profileId) {
      engine.setProfile(profileId)
    },
    setState(state) {
      engine.setState(state)
    },
    duckMusic(mode) {
      engine.duckMusic(mode)
    },
    restoreMusic() {
      engine.restoreMusic()
    },
    stopMusic() {
      engine.stopMusic()
    },
    applySettings(nextSettings) {
      engine.setSettings(nextSettings)
    },
    dispose() {
      engine.dispose()
    },
  }
}

export function useInjectedGameMusicController() {
  return inject(GAME_MUSIC_CONTROLLER_KEY, null)
}
