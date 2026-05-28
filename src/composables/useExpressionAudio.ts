import { computed, onBeforeUnmount, ref } from 'vue'
import type { EmotionGameAudioController } from '@/types/emotional/games'
import type { EmotionType } from '@/types/emotional/face-emotion'
import type { GameMusicProfileId, GameMusicStateId } from '@/audio/game-music-profiles'

export type ExpressionAudioEmotion =
  | 'happy'
  | 'angry'
  | 'sad'
  | 'fearful'
  | 'surprised'
  | 'calm'

export interface ExpressionAudioChangeOptions {
  intensity?: number
  state?: GameMusicStateId
  force?: boolean
}

export interface ExpressionAudioComposableOptions {
  audio: EmotionGameAudioController
  enabled?: () => boolean
  minSwitchIntervalMs?: number
  stableFramesRequired?: number
  defaultEmotion?: ExpressionAudioEmotion
  baseProfile?: GameMusicProfileId
}

export interface ExpressionAudioState {
  emotion: ExpressionAudioEmotion
  profileId: GameMusicProfileId
  state: GameMusicStateId
}

const DEFAULT_MIN_SWITCH_INTERVAL_MS = 560
const DEFAULT_STABLE_FRAMES_REQUIRED = 4

const PROFILE_BY_EMOTION: Record<ExpressionAudioEmotion, GameMusicProfileId> = {
  calm: 'expression-calm',
  happy: 'expression-happy',
  angry: 'expression-angry',
  sad: 'expression-sad',
  fearful: 'expression-fearful',
  surprised: 'expression-surprised',
}

const LEGACY_EXPRESSION_MAP: Record<EmotionType, ExpressionAudioEmotion> = {
  Happy: 'happy',
  Surprised: 'surprised',
  Angry: 'angry',
  Sad: 'sad',
  Fearful: 'fearful',
  Neutral: 'calm',
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function normalizeExpressionAudioEmotion(
  emotion: string | EmotionType | ExpressionAudioEmotion | null | undefined,
): ExpressionAudioEmotion {
  if (!emotion) {
    return 'calm'
  }

  if (emotion in LEGACY_EXPRESSION_MAP) {
    return LEGACY_EXPRESSION_MAP[emotion as EmotionType]
  }

  const normalized = String(emotion).trim().toLowerCase()
  switch (normalized) {
    case 'happy':
      return 'happy'
    case 'angry':
      return 'angry'
    case 'sad':
      return 'sad'
    case 'fearful':
    case 'fear':
      return 'fearful'
    case 'surprised':
    case 'surprise':
      return 'surprised'
    case 'neutral':
    case 'calm':
    default:
      return 'calm'
  }
}

export function resolveExpressionAudioState(
  emotion: ExpressionAudioEmotion,
  intensity = 0.5,
): ExpressionAudioState {
  const normalizedIntensity = clamp01(intensity)
  let state: GameMusicStateId = 'playing'

  if (emotion === 'calm') {
    state = normalizedIntensity >= 0.72 ? 'playing' : 'idle'
  } else if (emotion === 'happy') {
    state = normalizedIntensity >= 0.84 ? 'combo' : 'playing'
  } else if (emotion === 'surprised') {
    state = normalizedIntensity >= 0.94 ? 'combo' : 'playing'
  } else if (normalizedIntensity <= 0.36) {
    state = 'focus'
  }

  return {
    emotion,
    profileId: PROFILE_BY_EMOTION[emotion],
    state,
  }
}

export function shouldCommitExpressionAudioChange({
  activeEmotion,
  nextEmotion,
  activeState,
  nextState,
  sameEmotionStableFrames,
  stableFramesRequired,
  elapsedMs,
  minSwitchIntervalMs,
  force = false,
}: {
  activeEmotion: ExpressionAudioEmotion | null
  nextEmotion: ExpressionAudioEmotion
  activeState: GameMusicStateId | null
  nextState: GameMusicStateId
  sameEmotionStableFrames: number
  stableFramesRequired: number
  elapsedMs: number
  minSwitchIntervalMs: number
  force?: boolean
}): boolean {
  if (force) {
    return true
  }

  if (!activeEmotion || !activeState) {
    return sameEmotionStableFrames >= 1
  }

  const emotionChanged = activeEmotion !== nextEmotion
  const stateChanged = activeState !== nextState
  if (!emotionChanged && !stateChanged) {
    return false
  }

  if (sameEmotionStableFrames < stableFramesRequired) {
    return false
  }

  return elapsedMs >= minSwitchIntervalMs
}

export function useExpressionAudio(options: ExpressionAudioComposableOptions) {
  const minSwitchIntervalMs = options.minSwitchIntervalMs ?? DEFAULT_MIN_SWITCH_INTERVAL_MS
  const stableFramesRequired = options.stableFramesRequired ?? DEFAULT_STABLE_FRAMES_REQUIRED
  const defaultEmotion = options.defaultEmotion ?? 'calm'
  const baseProfile = options.baseProfile ?? PROFILE_BY_EMOTION[defaultEmotion]
  const enabled = options.enabled ?? (() => true)

  const activeEmotion = ref<ExpressionAudioEmotion | null>(null)
  const activeProfileId = ref<GameMusicProfileId>(baseProfile)
  const activeState = ref<GameMusicStateId | null>(null)
  const isReady = ref(false)
  const sameEmotionStableFrames = ref(0)
  const candidateEmotion = ref<ExpressionAudioEmotion>(defaultEmotion)
  const lastSwitchAtMs = ref(0)

  function resetStability(nextEmotion = defaultEmotion) {
    candidateEmotion.value = nextEmotion
    sameEmotionStableFrames.value = 0
  }

  async function ensureReady() {
    if (!enabled()) {
      return
    }

    await options.audio.ensureReady()
    isReady.value = true
  }

  async function activateExpressionState(nextState: ExpressionAudioState) {
    await ensureReady()
    options.audio.restoreMusic()
    options.audio.setProfile(nextState.profileId)
    options.audio.setState(nextState.state)
    activeEmotion.value = nextState.emotion
    activeProfileId.value = nextState.profileId
    activeState.value = nextState.state
    lastSwitchAtMs.value = Date.now()
  }

  async function changeExpression(
    emotion: string | EmotionType | ExpressionAudioEmotion | null | undefined,
    optionsOrIntensity?: ExpressionAudioChangeOptions | number,
  ) {
    if (!enabled()) {
      return false
    }

    const changeOptions: ExpressionAudioChangeOptions =
      typeof optionsOrIntensity === 'number'
        ? { intensity: optionsOrIntensity }
        : (optionsOrIntensity ?? {})

    const nextEmotion = normalizeExpressionAudioEmotion(emotion)
    const nextResolvedState = resolveExpressionAudioState(
      nextEmotion,
      changeOptions.intensity ?? 0.5,
    )
    if (changeOptions.state) {
      nextResolvedState.state = changeOptions.state
    }

    if (candidateEmotion.value === nextEmotion) {
      sameEmotionStableFrames.value += 1
    } else {
      candidateEmotion.value = nextEmotion
      sameEmotionStableFrames.value = 1
    }

    const commit = shouldCommitExpressionAudioChange({
      activeEmotion: activeEmotion.value,
      nextEmotion,
      activeState: activeState.value,
      nextState: nextResolvedState.state,
      sameEmotionStableFrames: sameEmotionStableFrames.value,
      stableFramesRequired,
      elapsedMs: Date.now() - lastSwitchAtMs.value,
      minSwitchIntervalMs,
      force: changeOptions.force,
    })

    if (!commit) {
      return false
    }

    await activateExpressionState(nextResolvedState)
    return true
  }

  async function setCalm(state: GameMusicStateId = 'idle') {
    return changeExpression('calm', {
      state,
      force: true,
    })
  }

  async function reset() {
    resetStability(defaultEmotion)
    return setCalm('idle')
  }

  function stop() {
    options.audio.stopMusic()
    activeEmotion.value = null
    activeState.value = null
    activeProfileId.value = baseProfile
    resetStability(defaultEmotion)
  }

  function dispose() {
    stop()
  }

  onBeforeUnmount(() => {
    dispose()
  })

  return {
    isReady: computed(() => isReady.value),
    activeEmotion: computed(() => activeEmotion.value),
    activeProfileId: computed(() => activeProfileId.value),
    activeState: computed(() => activeState.value),
    candidateEmotion: computed(() => candidateEmotion.value),
    sameEmotionStableFrames: computed(() => sameEmotionStableFrames.value),
    ensureReady,
    changeExpression,
    setCalm,
    reset,
    stop,
    dispose,
  }
}
