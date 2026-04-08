import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { Howl, Howler, type HowlOptions } from 'howler'

export interface UseSoundOptions extends Omit<HowlOptions, 'src'> {
  src: string | string[]
}

export function useSound(options: UseSoundOptions) {
  const sound = shallowRef<Howl | null>(null)
  const isLoaded = ref(false)
  const isPlaying = ref(false)
  const lastSoundId = ref<number | null>(null)

  function ensureSound(): Howl {
    if (sound.value) {
      return sound.value
    }

    const instance = new Howl({
      ...options,
      src: Array.isArray(options.src) ? options.src : [options.src],
      onload: () => {
        isLoaded.value = true
        options.onload?.(lastSoundId.value ?? 0)
      },
      onplay: (soundId) => {
        isPlaying.value = true
        lastSoundId.value = soundId
        options.onplay?.(soundId)
      },
      onend: (soundId) => {
        isPlaying.value = false
        options.onend?.(soundId)
      },
      onstop: (soundId) => {
        if (lastSoundId.value === soundId) {
          isPlaying.value = false
        }
        options.onstop?.(soundId)
      },
      onpause: (soundId) => {
        if (lastSoundId.value === soundId) {
          isPlaying.value = false
        }
        options.onpause?.(soundId)
      },
      onloaderror: (soundId, error) => {
        isLoaded.value = false
        options.onloaderror?.(soundId, error)
      },
      onplayerror: (soundId, error) => {
        isPlaying.value = false
        options.onplayerror?.(soundId, error)
      },
    })

    sound.value = instance
    return instance
  }

  function play(sprite?: string): number {
    const instance = ensureSound()
    const soundId = sprite ? instance.play(sprite) : instance.play()
    lastSoundId.value = soundId
    return soundId
  }

  function stop(soundId?: number): void {
    if (!sound.value) {
      return
    }

    if (soundId !== undefined) {
      sound.value.stop(soundId)
    } else {
      sound.value.stop()
    }

    isPlaying.value = false
  }

  function pause(soundId?: number): void {
    if (!sound.value) {
      return
    }

    if (soundId !== undefined) {
      sound.value.pause(soundId)
    } else {
      sound.value.pause()
    }

    isPlaying.value = false
  }

  function resume(soundId?: number): void {
    const instance = ensureSound()
    if (soundId !== undefined) {
      instance.play(soundId)
      return
    }

    if (lastSoundId.value !== null) {
      instance.play(lastSoundId.value)
      return
    }

    instance.play()
  }

  function unload(): void {
    if (!sound.value) {
      return
    }

    sound.value.unload()
    sound.value = null
    isLoaded.value = false
    isPlaying.value = false
    lastSoundId.value = null
  }

  function setVolume(volume: number, soundId?: number): void {
    const instance = ensureSound()
    if (soundId !== undefined) {
      instance.volume(volume, soundId)
      return
    }

    instance.volume(volume)
  }

  function fade(from: number, to: number, durationMs: number, soundId?: number): void {
    const instance = ensureSound()
    instance.fade(from, to, durationMs, soundId)
  }

  function mute(muted: boolean, soundId?: number): void {
    const instance = ensureSound()
    instance.mute(muted, soundId)
  }

  function stopAll(): void {
    Howler.stop()
    isPlaying.value = false
  }

  function muteAll(muted: boolean): void {
    Howler.mute(muted)
  }

  function setGlobalVolume(volume: number): void {
    Howler.volume(volume)
  }

  onBeforeUnmount(() => {
    unload()
  })

  return {
    sound,
    isLoaded,
    isPlaying,
    lastSoundId,
    play,
    stop,
    pause,
    resume,
    unload,
    setVolume,
    fade,
    mute,
    stopAll,
    muteAll,
    setGlobalVolume,
  }
}
