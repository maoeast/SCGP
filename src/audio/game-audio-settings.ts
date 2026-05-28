export interface SharedGameAudioSettings {
  musicEnabled: boolean
  musicVolume: number
  effectsEnabled: boolean
}

export const GAME_AUDIO_SETTINGS_STORAGE_KEY = 'scgp.gameAudioSettings.v1'

const DEFAULT_GAME_AUDIO_SETTINGS: SharedGameAudioSettings = {
  musicEnabled: true,
  musicVolume: 18,
  effectsEnabled: true,
}

function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_GAME_AUDIO_SETTINGS.musicVolume
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

export function createDefaultGameAudioSettings(): SharedGameAudioSettings {
  return { ...DEFAULT_GAME_AUDIO_SETTINGS }
}

export function normalizeGameAudioSettings(value: unknown): SharedGameAudioSettings {
  if (!value || typeof value !== 'object') {
    return createDefaultGameAudioSettings()
  }

  const settings = value as Partial<SharedGameAudioSettings>
  if (typeof settings.musicEnabled !== 'boolean' || typeof settings.effectsEnabled !== 'boolean') {
    return createDefaultGameAudioSettings()
  }

  return {
    musicEnabled: settings.musicEnabled,
    musicVolume: clampVolume(settings.musicVolume),
    effectsEnabled: settings.effectsEnabled,
  }
}

function getStorage(storage?: Storage | null) {
  if (storage) {
    return storage
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return globalThis.localStorage as Storage
  }

  return null
}

export function loadGameAudioSettings(storage?: Storage | null): SharedGameAudioSettings {
  const targetStorage = getStorage(storage)
  if (!targetStorage) {
    return createDefaultGameAudioSettings()
  }

  try {
    const rawValue = targetStorage.getItem(GAME_AUDIO_SETTINGS_STORAGE_KEY)
    if (!rawValue) {
      return createDefaultGameAudioSettings()
    }

    return normalizeGameAudioSettings(JSON.parse(rawValue))
  } catch {
    return createDefaultGameAudioSettings()
  }
}

export function saveGameAudioSettings(
  settings: SharedGameAudioSettings,
  storage?: Storage | null,
): SharedGameAudioSettings {
  const normalizedSettings = normalizeGameAudioSettings(settings)
  const targetStorage = getStorage(storage)

  if (!targetStorage) {
    return normalizedSettings
  }

  try {
    targetStorage.setItem(GAME_AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings))
  } catch {
    // Ignore storage quota and serialization failures; the normalized settings still drive the runtime.
  }

  return normalizedSettings
}
