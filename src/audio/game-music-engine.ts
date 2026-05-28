import * as Tone from 'tone'
import type { SharedGameAudioSettings } from './game-audio-settings'
import {
  GAME_MUSIC_PROFILES,
  type GameMusicDuckMode,
  type GameMusicProfileId,
  type GameMusicStateId,
  type GameMusicTheme,
} from './game-music-profiles'

function getStepDuration(step: string): number {
  return Tone.Time(step).toSeconds()
}

export class GameMusicEngine {
  private initialized = false
  private currentProfileId: GameMusicProfileId = 'playful'
  private currentState: GameMusicStateId = 'paused'
  private settings: SharedGameAudioSettings
  private duckMode: GameMusicDuckMode | null = null
  private outputGain: Tone.Gain | null = null
  private reverb: Tone.Reverb | null = null
  private delay: Tone.FeedbackDelay | null = null
  private melodySynth: Tone.PolySynth | null = null
  private bassSynth: Tone.PolySynth | null = null
  private melodyPart: Tone.Part<{ note: string }> | null = null
  private bassPart: Tone.Part<{ note: string }> | null = null
  private activeTheme: GameMusicTheme | null = null
  private finishTimer: ReturnType<typeof setTimeout> | null = null

  constructor(settings: SharedGameAudioSettings) {
    this.settings = { ...settings }
  }

  async ensureReady(): Promise<void> {
    let wasInitialized = this.initialized
    if (!this.initialized) {
      await Tone.start()

      this.outputGain = new Tone.Gain(0).toDestination()
      this.reverb = new Tone.Reverb({ decay: 2.4, wet: 0.18 }).connect(this.outputGain)
      this.delay = new Tone.FeedbackDelay('8n', 0.18).connect(this.outputGain)
      this.delay.wet.value = 0.06

      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.12, sustain: 0.35, release: 0.4 },
      })
      this.bassSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.03, decay: 0.18, sustain: 0.45, release: 0.6 },
      })

      this.melodySynth.connect(this.outputGain)
      this.melodySynth.connect(this.reverb)
      this.melodySynth.connect(this.delay)
      this.bassSynth.connect(this.outputGain)
      this.bassSynth.connect(this.reverb)

      this.initialized = true
      this.applyOutputGain(0)
      wasInitialized = false
    }

    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume()
    }

    if (!wasInitialized && this.currentState !== 'paused') {
      this.renderCurrentState()
    }
  }

  setSettings(settings: SharedGameAudioSettings): void {
    this.settings = { ...settings }
    this.applyOutputGain(0.18)
  }

  setProfile(profileId: GameMusicProfileId): void {
    if (this.currentProfileId === profileId) {
      return
    }

    this.currentProfileId = profileId
    if (this.initialized && this.currentState !== 'paused') {
      this.renderCurrentState()
    }
  }

  setState(state: GameMusicStateId): void {
    if (state === this.currentState) {
      return
    }

    this.currentState = state
    if (!this.initialized) {
      return
    }

    this.renderCurrentState()
  }

  duckMusic(mode: GameMusicDuckMode): void {
    this.duckMode = mode
    this.applyOutputGain(0.18)
  }

  restoreMusic(): void {
    this.duckMode = null
    this.applyOutputGain(0.18)
  }

  stopMusic(): void {
    this.currentState = 'paused'
    this.clearFinishTimer()
    this.disposeParts()
    Tone.Transport.stop()
    Tone.Transport.cancel()
    this.applyOutputGain(0.12)
  }

  dispose(): void {
    this.stopMusic()
    this.melodySynth?.dispose()
    this.bassSynth?.dispose()
    this.reverb?.dispose()
    this.delay?.dispose()
    this.outputGain?.dispose()
    this.melodySynth = null
    this.bassSynth = null
    this.reverb = null
    this.delay = null
    this.outputGain = null
    this.initialized = false
  }

  private clearFinishTimer() {
    if (this.finishTimer !== null) {
      clearTimeout(this.finishTimer)
      this.finishTimer = null
    }
  }

  private disposeParts() {
    this.melodyPart?.dispose()
    this.melodyPart = null

    this.bassPart?.dispose()
    this.bassPart = null
  }

  private resolveTheme(): GameMusicTheme | null {
    if (this.currentState === 'paused') {
      return null
    }

    const profile = GAME_MUSIC_PROFILES[this.currentProfileId]
    return profile[this.currentState === 'combo' || this.currentState === 'focus'
      ? this.currentState
      : this.currentState] || profile.playing || profile.idle || null
  }

  private buildPart(
    notes: string[],
    step: string,
    synth: Tone.PolySynth,
  ): Tone.Part<{ note: string }> {
    const duration = getStepDuration(step)
    return new Tone.Part<{ note: string }>((time, event) => {
      const note = (event as { note: string }).note
      synth.triggerAttackRelease(note, step, time)
    }, notes.map((note, index) => ({
      time: index * duration,
      note,
    })))
  }

  private renderCurrentState() {
    const theme = this.resolveTheme()
    this.disposeParts()
    this.clearFinishTimer()
    Tone.Transport.stop()
    Tone.Transport.cancel()

    if (!theme || !this.melodySynth || !this.bassSynth || !this.reverb || !this.delay) {
      this.applyOutputGain(0.12)
      return
    }

    this.activeTheme = theme
    Tone.Transport.bpm.rampTo(theme.bpm, 0.6)
    this.reverb.wet.rampTo(theme.reverbWet, 0.4)
    this.delay.wet.rampTo(theme.delayWet, 0.24)

    this.melodySynth.set({
      oscillator: { type: theme.melodyOscillator },
    })
    this.bassSynth.set({
      oscillator: { type: theme.bassOscillator },
    })

    this.melodyPart = this.buildPart(theme.melody, theme.melodyLength, this.melodySynth)
    this.bassPart = this.buildPart(theme.bass, theme.bassLength, this.bassSynth)

    this.melodyPart.loop = theme.loop
    this.bassPart.loop = theme.loop
    this.melodyPart.loopEnd = getStepDuration(theme.melodyLength) * theme.melody.length
    this.bassPart.loopEnd = getStepDuration(theme.bassLength) * theme.bass.length
    this.melodyPart.start(0)
    this.bassPart.start(0)
    Tone.Transport.start()
    this.applyOutputGain(0.45)

    if (!theme.loop) {
      const finishMs = Math.ceil(Math.max(
        this.melodyPart.loopEnd,
        this.bassPart.loopEnd,
      ) * 1000)
      this.finishTimer = setTimeout(() => {
        if (this.currentState === 'finish') {
          this.stopMusic()
        }
      }, finishMs + 120)
    }
  }

  private applyOutputGain(rampSeconds: number) {
    if (!this.outputGain) {
      return
    }

    const duckFactor = this.duckMode === 'mute'
      ? 0
      : this.duckMode === 'low'
        ? 0.24
        : 1
    const themeGain = this.activeTheme?.outputGain ?? 0.34
    const userGain = this.settings.musicEnabled ? this.settings.musicVolume / 100 : 0
    const targetGain = Math.max(0, Math.min(1, userGain * duckFactor * themeGain))
    this.outputGain.gain.rampTo(targetGain, rampSeconds)
  }
}
