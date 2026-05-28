import { computed, onBeforeUnmount, ref } from 'vue'
import * as Tone from 'tone'
import { useInjectedGameMusicController } from '@/audio/game-music-controller'
import type {
  CalibrationAccumulator,
  CalibrationResult,
  SessionStats,
  ArmPose,
} from '@/types/air-conductor'
import {
  AIR_CONDUCTOR_CALIBRATION_MS,
  AIR_CONDUCTOR_COUNTDOWN_MS,
  AIR_CONDUCTOR_FINISHING_MS,
  AIR_CONDUCTOR_HARMONY_COOLDOWN_MS,
  AIR_CONDUCTOR_NOTE_RAMP_SECONDS,
  accumulateBilateralCoordSec,
  accumulateCalibration,
  calculateReachScore,
  createArmLiftState,
  createCalibrationAccumulator,
  createOffFrameState,
  createRuntimeState,
  createSessionStats,
  finalizeCalibration,
  formatAirConductorDuration,
  isArmLifted,
  shouldAutoFinish,
  smoothArmPose,
  startRuntimePhase,
  updateArmLiftState,
  updateMaxReachScore,
  updateOffFrameState,
} from '@/components/games/pose/air-conductor-runtime'

export const AIR_CONDUCTOR_PENTATONIC_SCALE = [
  'C3',
  'D3',
  'E3',
  'G3',
  'A3',
  'C4',
  'D4',
  'E4',
  'G4',
  'A4',
  'C5',
  'D5',
  'E5',
] as const

const AIR_CONDUCTOR_SCALE_HEIGHT_SPAN = 0.52
const AIR_CONDUCTOR_FILTER_MIN_FREQUENCY = 320
const AIR_CONDUCTOR_FILTER_BASE_FREQUENCY = 900
const AIR_CONDUCTOR_FILTER_MAX_FREQUENCY = 2200

export function createPentatonicScale() {
  return [...AIR_CONDUCTOR_PENTATONIC_SCALE]
}

export function createAirConductorSynthOptions(hand: 'left' | 'right') {
  return {
    oscillator: { type: 'sine' as const },
    envelope: {
      attack: hand === 'left' ? 0.1 : 0.12,
      decay: 0.18,
      sustain: 0.28,
      release: hand === 'left' ? 1.02 : 1.08,
    },
  }
}

export function createAirConductorHarmonySynthOptions() {
  return {
    volume: -16,
    oscillator: { type: 'sine' as const },
    envelope: {
      attack: 0.11,
      decay: 0.2,
      sustain: 0.22,
      release: 1.06,
    },
  }
}

export function createAirConductorCompressorOptions() {
  return {
    threshold: -18,
    ratio: 4,
    attack: 0.01,
    release: 0.24,
    knee: 8,
  }
}

export function createAirConductorEffectOptions() {
  return {
    outputGain: 0.52,
    filterMinFrequency: AIR_CONDUCTOR_FILTER_MIN_FREQUENCY,
    filterBaseFrequency: AIR_CONDUCTOR_FILTER_BASE_FREQUENCY,
    filterMaxFrequency: AIR_CONDUCTOR_FILTER_MAX_FREQUENCY,
    delayTime: '8n' as const,
    delayFeedback: 0.12,
    delayWet: 0.08,
    harmonyWet: 0.22,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function mapHeightToScaleIndex(height: number): number {
  const maxIndex = AIR_CONDUCTOR_PENTATONIC_SCALE.length - 1
  return clamp(Math.round((height / AIR_CONDUCTOR_SCALE_HEIGHT_SPAN) * maxIndex), 0, maxIndex)
}

export function mapHorizontalToFilterFrequency(value: number): number {
  const safeValue = clamp(value, 0, 1)
  return Math.round(
    AIR_CONDUCTOR_FILTER_MIN_FREQUENCY *
      Math.pow(
        AIR_CONDUCTOR_FILTER_MAX_FREQUENCY / AIR_CONDUCTOR_FILTER_MIN_FREQUENCY,
        safeValue,
      ),
  )
}

export function usePoseAudio(durationSec: number) {
  const musicController = useInjectedGameMusicController()
  const pose = ref<ArmPose | null>(null)
  const phaseState = ref(createRuntimeState(performance.now()))
  const stats = ref<SessionStats>(createSessionStats(durationSec))
  const calibration = ref<CalibrationResult | null>(null)
  const isOffFrame = ref(false)
  const countdownValue = ref(3)
  const offFrameCount = ref(0)

  let smoothedPose: ArmPose | null = null
  let calibrationAccumulator: CalibrationAccumulator = createCalibrationAccumulator()
  let leftLiftState = createArmLiftState()
  let rightLiftState = createArmLiftState()
  let offFrameState = createOffFrameState()
  let lastPoseTimestamp = 0
  let lastPhaseTickAt = performance.now()
  let finishingDeadlineAt = 0
  let lastHarmonyTriggeredAt = -Infinity
  let audioReady = false
  let leftSynth: Tone.Synth | null = null
  let rightSynth: Tone.Synth | null = null
  let harmonySynth: Tone.PolySynth<Tone.Synth> | null = null
  let filter: Tone.Filter | null = null
  let feedbackDelay: Tone.FeedbackDelay | null = null
  let compressor: Tone.Compressor | null = null
  let outputGain: Tone.Gain | null = null
  let audioSuppressedByOffFrame = false

  const phase = computed(() => phaseState.value.phase)

  async function ensureAudioReady() {
    if (audioReady) {
      return
    }

    await Tone.start()
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume()
    }

    const effectOptions = createAirConductorEffectOptions()
    const compressorOptions = createAirConductorCompressorOptions()
    Tone.Destination.volume.value = -10
    outputGain = new Tone.Gain(effectOptions.outputGain)
    filter = new Tone.Filter(effectOptions.filterBaseFrequency, 'lowpass')
    feedbackDelay = new Tone.FeedbackDelay(effectOptions.delayTime, effectOptions.delayFeedback)
    compressor = new Tone.Compressor(compressorOptions)
    feedbackDelay.wet.value = effectOptions.delayWet
    leftSynth = new Tone.Synth(createAirConductorSynthOptions('left'))
    rightSynth = new Tone.Synth(createAirConductorSynthOptions('right'))
    harmonySynth = new Tone.PolySynth(Tone.Synth, createAirConductorHarmonySynthOptions())

    leftSynth.connect(filter)
    rightSynth.connect(filter)
    harmonySynth.connect(filter)
    filter.connect(feedbackDelay)
    filter.connect(compressor)
    feedbackDelay.connect(compressor)
    compressor.connect(outputGain)
    outputGain.connect(Tone.Destination)
    audioReady = true
  }

  async function syncAudioForPose(nextPose: ArmPose) {
    await ensureAudioReady()
    if (!leftSynth || !rightSynth || !harmonySynth || !filter || !feedbackDelay) {
      return
    }

    const effectOptions = createAirConductorEffectOptions()
    const scale = AIR_CONDUCTOR_PENTATONIC_SCALE
    const leftHeight = Math.max(0, nextPose.leftShoulder.y - nextPose.left.y)
    const rightHeight = Math.max(0, nextPose.rightShoulder.y - nextPose.right.y)
    const leftNote = scale[mapHeightToScaleIndex(leftHeight)]
    const rightNote = scale[mapHeightToScaleIndex(rightHeight)]
    const averageX = (nextPose.left.x + nextPose.right.x) / 2

    filter.frequency.exponentialRampToValueAtTime(
      Math.max(1, mapHorizontalToFilterFrequency(averageX)),
      Tone.now() + AIR_CONDUCTOR_NOTE_RAMP_SECONDS,
    )

    const leftLifted = isArmLifted(nextPose.left.y, nextPose.leftShoulder.y)
    const rightLifted = isArmLifted(nextPose.right.y, nextPose.rightShoulder.y)

    if (leftLifted && leftNote) {
      leftSynth.triggerAttack(leftNote, Tone.now())
    } else {
      leftSynth.triggerRelease(Tone.now())
    }

    if (rightLifted && rightNote) {
      rightSynth.triggerAttack(rightNote, Tone.now())
    } else {
      rightSynth.triggerRelease(Tone.now())
    }

    const separatedEnough = Math.abs(nextPose.left.x - nextPose.right.x) > 0.4
    if (leftLifted && rightLifted && separatedEnough) {
      feedbackDelay.wet.rampTo(effectOptions.harmonyWet, 0.3)
      if (performance.now() - lastHarmonyTriggeredAt >= AIR_CONDUCTOR_HARMONY_COOLDOWN_MS) {
        lastHarmonyTriggeredAt = performance.now()
        harmonySynth.triggerAttackRelease(['C4', 'E4'], '8n', Tone.now(), 0.35)
      }
    } else {
      feedbackDelay.wet.rampTo(effectOptions.delayWet, 0.5)
    }
  }

  function releaseInteractiveAudio() {
    leftSynth?.triggerRelease(Tone.now())
    rightSynth?.triggerRelease(Tone.now())
    harmonySynth?.releaseAll(Tone.now())
  }

  function suppressForOffFrame() {
    if (audioSuppressedByOffFrame) {
      return
    }

    audioSuppressedByOffFrame = true
    releaseInteractiveAudio()
    outputGain?.gain.rampTo(0.03, 0.3)
    musicController?.duckMusic('low')
  }

  function restoreFromOffFrame() {
    if (!audioSuppressedByOffFrame) {
      return
    }

    audioSuppressedByOffFrame = false
    outputGain?.gain.rampTo(createAirConductorEffectOptions().outputGain, 0.3)
    musicController?.restoreMusic()
  }

  function syncMusicPhase(nextPhase: typeof phase.value) {
    if (!musicController) {
      return
    }

    if (nextPhase === 'playing') {
      musicController.setProfile('music-minimal')
      musicController.setState('playing')
      return
    }

    if (nextPhase === 'done') {
      musicController.setProfile('music-minimal')
      musicController.setState('finish')
      return
    }

    musicController.setProfile('music-minimal')
    musicController.setState('paused')
  }

  function setPhase(nextPhase: typeof phase.value, now = performance.now()) {
    phaseState.value = startRuntimePhase(phaseState.value, nextPhase, now)
    if (nextPhase === 'countdown') {
      phaseState.value.countdownValue = 3
    }
    syncMusicPhase(nextPhase)
  }

  function resetStats() {
    stats.value = createSessionStats(durationSec)
    leftLiftState = createArmLiftState()
    rightLiftState = createArmLiftState()
    offFrameState = createOffFrameState()
    isOffFrame.value = false
    offFrameCount.value = 0
    lastPoseTimestamp = 0
    lastHarmonyTriggeredAt = -Infinity
    countdownValue.value = 3
  }

  async function startCalibration() {
    calibrationAccumulator = createCalibrationAccumulator()
    calibration.value = null
    resetStats()
    setPhase('calibrating')
  }

  async function pauseSession() {
    releaseInteractiveAudio()
    setPhase('paused')
  }

  async function resumeSession() {
    lastPhaseTickAt = performance.now()
    setPhase('playing')
  }

  async function startSession() {
    resetStats()
    lastPhaseTickAt = performance.now()
    setPhase('countdown')
  }

  async function beginPlaying() {
    lastPhaseTickAt = performance.now()
    setPhase('playing')
  }

  async function endSession() {
    releaseInteractiveAudio()
    finishingDeadlineAt = performance.now() + AIR_CONDUCTOR_FINISHING_MS
    setPhase('finishing')
  }

  function completeSession() {
    setPhase('done')
  }

  async function handlePoseFrame(rawPose: ArmPose | null) {
    if (!rawPose) {
      pose.value = null
      return
    }

    smoothedPose = smoothArmPose(smoothedPose, rawPose)
    pose.value = smoothedPose

    const allVisible = Boolean(smoothedPose.left.visible && smoothedPose.right.visible)
    offFrameState = updateOffFrameState(offFrameState, allVisible)
    const wasOffFrame = isOffFrame.value
    isOffFrame.value = offFrameState.offFrame
    if (!wasOffFrame && isOffFrame.value) {
      offFrameCount.value += 1
      suppressForOffFrame()
    } else if (wasOffFrame && !isOffFrame.value) {
      restoreFromOffFrame()
    }

    if (phase.value === 'calibrating') {
      calibrationAccumulator = accumulateCalibration(calibrationAccumulator, smoothedPose)
    }

    if (phase.value !== 'playing') {
      return
    }

    const now = smoothedPose.timestamp
    const deltaMs = lastPoseTimestamp > 0 ? Math.max(0, now - lastPoseTimestamp) : 0
    lastPoseTimestamp = now

    if (isOffFrame.value) {
      return
    }

    const left = updateArmLiftState(
      leftLiftState,
      now,
      isArmLifted(smoothedPose.left.y, smoothedPose.leftShoulder.y),
    )
    leftLiftState = left.nextState
    stats.value.leftArmExtensions += left.increment

    const right = updateArmLiftState(
      rightLiftState,
      now,
      isArmLifted(smoothedPose.right.y, smoothedPose.rightShoulder.y),
    )
    rightLiftState = right.nextState
    stats.value.rightArmExtensions += right.increment
    stats.value.bilateralCoordSec = accumulateBilateralCoordSec(
      stats.value.bilateralCoordSec,
      smoothedPose,
      deltaMs,
    )
    stats.value.maxReachScore = updateMaxReachScore(stats.value.maxReachScore, smoothedPose)
    stats.value.durationSec = Math.max(0, Math.round(phaseState.value.elapsedPlayingMs / 1000))

    await syncAudioForPose(smoothedPose)
  }

  async function tick(now = performance.now()) {
    const elapsedSinceLastTick = Math.max(0, now - lastPhaseTickAt)
    lastPhaseTickAt = now

    if (phase.value === 'calibrating' && now - phaseState.value.phaseStartedAt >= AIR_CONDUCTOR_CALIBRATION_MS) {
      calibration.value = finalizeCalibration(calibrationAccumulator, now)
      setPhase('countdown', now)
      countdownValue.value = 3
      return
    }

    if (phase.value === 'countdown') {
      countdownValue.value = Math.max(0, Math.ceil((AIR_CONDUCTOR_COUNTDOWN_MS - (now - phaseState.value.phaseStartedAt)) / 1000))
      if (now - phaseState.value.phaseStartedAt >= AIR_CONDUCTOR_COUNTDOWN_MS) {
        await beginPlaying()
      }
      return
    }

    if (phase.value === 'playing') {
      if (!isOffFrame.value) {
        phaseState.value.elapsedPlayingMs += elapsedSinceLastTick
        stats.value.durationSec = Math.max(0, Math.round(phaseState.value.elapsedPlayingMs / 1000))
      }

      if (shouldAutoFinish(durationSec, phaseState.value.elapsedPlayingMs)) {
        await endSession()
      }
      return
    }

    if (phase.value === 'finishing' && now >= finishingDeadlineAt) {
      completeSession()
    }
  }

  function buildSummary() {
    return {
      leftArmExtensions: stats.value.leftArmExtensions,
      rightArmExtensions: stats.value.rightArmExtensions,
      bilateralCoordSec: Number(stats.value.bilateralCoordSec.toFixed(1)),
      maxReachScore: stats.value.maxReachScore,
      formattedDuration: formatAirConductorDuration(stats.value.durationSec),
      offFrameCount: offFrameCount.value,
    }
  }

  function disposeAudio() {
    leftSynth?.triggerRelease(Tone.now())
    rightSynth?.triggerRelease(Tone.now())
    leftSynth?.dispose()
    rightSynth?.dispose()
    harmonySynth?.dispose()
    filter?.dispose()
    feedbackDelay?.dispose()
    compressor?.dispose()
    outputGain?.dispose()
    leftSynth = null
    rightSynth = null
    harmonySynth = null
    filter = null
    feedbackDelay = null
    compressor = null
    outputGain = null
    audioReady = false
  }

  function dispose() {
    disposeAudio()
    musicController?.stopMusic()
  }

  onBeforeUnmount(() => {
    dispose()
  })

  return {
    pose,
    phase,
    stats,
    calibration,
    isOffFrame,
    countdownValue,
    offFrameCount,
    buildSummary,
    handlePoseFrame,
    startCalibration,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    tick,
    dispose,
  }
}
