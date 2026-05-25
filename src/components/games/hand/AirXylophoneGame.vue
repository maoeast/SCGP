<template>
  <HandCameraLayer class="air-xylophone" @primary-point="handlePrimaryPoint" @hands="handleHands">
    <div class="air-xylophone__sky" />

    <div class="air-xylophone__melody" aria-label="跟弹简谱">
      <span class="air-xylophone__melody-label">跟我弹 · {{ currentSong.title }}</span>
      <div class="air-xylophone__melody-notes">
        <span
          v-for="(step, index) in currentMelodySequence"
          :key="`${step.noteId}-${index}`"
          class="air-xylophone__melody-note"
          :class="melodyStepClass(index)"
          :style="{ '--note-color': noteColor(step.noteId) }"
        >
          {{ step.label }}
        </span>
      </div>
    </div>
    <div class="air-xylophone__hud">
      <strong>{{ remainingSeconds }}秒</strong>
      <span>{{ notesPlayed }}次敲击</span>
      <span>连续 {{ streak }} 次</span>
    </div>

    <div class="air-xylophone__camera">
      <div v-if="latestHands.length === 0" class="air-xylophone__camera-placeholder">
        <span class="air-xylophone__camera-icon">CAM</span>
        <strong>把手放进画面</strong>
        <small>绿色骨架会显示手部追踪</small>
      </div>
      <svg v-else class="hand-skeleton" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <g
          v-for="(hand, handIndex) in latestHands"
          :key="`${hand.handedness || 'hand'}-${handIndex}`"
          class="hand-skeleton__hand"
        >
          <line
            v-for="(connection, connectionIndex) in handConnections"
            :key="`${handIndex}-${connectionIndex}`"
            :x1="cameraPointX(hand.landmarks[connection[0]])"
            :y1="cameraPointY(hand.landmarks[connection[0]])"
            :x2="cameraPointX(hand.landmarks[connection[1]])"
            :y2="cameraPointY(hand.landmarks[connection[1]])"
          />
          <circle
            v-for="(point, pointIndex) in hand.landmarks"
            :key="`${handIndex}-point-${pointIndex}`"
            :class="{ 'is-primary': pointIndex === 8 }"
            :cx="cameraPointX(point)"
            :cy="cameraPointY(point)"
            :r="pointIndex === 8 ? 2.7 : 1.55"
          />
        </g>
      </svg>
    </div>

    <div class="air-xylophone__wave" aria-hidden="true">
      <span
        v-for="bar in waveBars"
        :key="bar.id"
        class="air-xylophone__wave-bar"
        :style="{ height: `${bar.height}px`, background: activeWaveColor }"
      />
    </div>

    <div
      v-for="particle in musicParticles"
      :key="particle.id"
      class="air-xylophone__particle"
      :style="{
        left: `${particle.left}%`,
        bottom: `${particle.bottom}%`,
        color: particle.color,
        animationDelay: `${particle.delay}ms`,
        '--particle-drift': `${particle.drift}px`,
      }"
      aria-hidden="true"
    >
      {{ particle.symbol }}
    </div>

    <div
      v-if="comboBurstVisible"
      :key="comboBurstKey"
      class="air-xylophone__combo-burst"
      aria-hidden="true"
    >
      PERFECT {{ streak }}x
    </div>

    <div class="air-xylophone__bars">
      <button
        v-for="note in notes"
        :key="note.id"
        class="air-xylophone__bar"
        :class="{
          'is-hit': activeNoteIds.includes(note.id),
          'is-waiting': note.id === currentMelodyNoteId && !melodyCelebrating,
        }"
        :style="{ '--bar-color': note.color, '--bar-height': `${note.height}px` }"
        type="button"
        @pointerdown.prevent="playNote(note.id)"
      >
        <span>{{ note.label }}</span>
      </button>
    </div>

    <div class="air-xylophone__guide-line" />
  </HandCameraLayer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import HandCameraLayer from '@/components/games/hand/HandCameraLayer.vue'
import {
  advanceAirXylophoneMelodyProgress,
  selectRandomAirXylophoneSong,
  type AirXylophoneDifficultyId,
  type AirXylophoneNoteId,
  type AirXylophoneSong,
  type AirXylophoneMelodyStep,
} from '@/data/air-xylophone-songs'
import {
  classifyHandPose,
  detectDownwardStrike,
  findRectHit,
  getPrimaryFingerPoint,
  mapLandmarkToNormalizedStagePoint,
  normalizeStagePoint,
  type HandPoint,
  type NormalizedRect,
  type StagePoint,
} from '@/utils/hand-game-gestures'
import { TaskID, type GameSessionData } from '@/types/games'
import type { HandObservation } from '@/composables/useHandLandmarker'

const props = withDefaults(defineProps<{
  studentId: number
  taskId?: TaskID
  duration?: number
  difficulty?: AirXylophoneDifficultyId
}>(), {
  taskId: TaskID.HAND_XYLOPHONE,
  duration: 60,
  difficulty: 'medium',
})

const emit = defineEmits<{
  finish: [session: GameSessionData]
}>()

const notes: Array<{
  id: AirXylophoneNoteId
  label: string
  frequency: number
  color: string
  height: number
}> = [
  { id: 'do', label: 'Do', frequency: 261.63, color: '#f97316', height: 170 },
  { id: 're', label: 'Re', frequency: 293.66, color: '#facc15', height: 190 },
  { id: 'mi', label: 'Mi', frequency: 329.63, color: '#22c55e', height: 210 },
  { id: 'sol', label: 'Sol', frequency: 392, color: '#38bdf8', height: 230 },
  { id: 'la', label: 'La', frequency: 440, color: '#818cf8', height: 250 },
  { id: 'do2', label: 'Do', frequency: 523.25, color: '#ec4899', height: 270 },
]

const handConnections = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
] as const

const startedAt = Date.now()
const remainingSeconds = ref(props.duration)
const notesPlayed = ref(0)
const streak = ref(0)
const activeNoteIds = ref<string[]>([])
const melodyStepIndex = ref(0)
const melodyCelebrating = ref(false)
const waveBars = ref(Array.from({ length: 36 }, (_, id) => ({ id, height: 5 + (id % 5) * 2 })))
const activeWaveColor = ref('rgba(72, 110, 164, 0.34)')
const musicParticles = ref<Array<{
  id: number
  symbol: string
  color: string
  left: number
  bottom: number
  drift: number
  delay: number
}>>([])
const comboBurstVisible = ref(false)
const comboBurstKey = ref(0)
const latestHands = ref<HandObservation[]>([])
const previousPoint = ref<StagePoint | null>(null)
const lastHoverNoteId = ref('')
const pointerFallbackUsed = ref(false)
const noteTriggerDebounceMs = 120
const currentSong = ref<AirXylophoneSong>(selectRandomAirXylophoneSong(props.difficulty))
let timerId: number | null = null
let audioContext: AudioContext | null = null
let particleId = 0
let waveResetTimerId: number | null = null
let melodyResetTimerId: number | null = null
let comboBurstTimerId: number | null = null

interface HandPlayState {
  hoverNoteId: string
  previousPoint: StagePoint | null
  wasFist: boolean
}

const handPlayStates = new Map<string, HandPlayState>()
const lastNoteTriggeredAtByKey = new Map<string, number>()

const targetRects = computed<NormalizedRect[]>(() => {
  const gap = 0.018
  const width = (0.86 - gap * (notes.length - 1)) / notes.length
  return notes.map((_, index) => {
    const left = 0.07 + index * (width + gap)
    return {
      left,
      right: left + width,
      top: 0.58,
      bottom: 0.93,
    }
  })
})

const currentMelodySequence = computed<AirXylophoneMelodyStep[]>(() => currentSong.value.melody)
const currentMelodyNoteId = computed(() => currentMelodySequence.value[melodyStepIndex.value]?.noteId || 'do')

function noteColor(noteId: AirXylophoneNoteId | string) {
  return notes.find((note) => note.id === noteId)?.color || '#38bdf8'
}

function melodyStepClass(index: number) {
  return {
    'is-active': !melodyCelebrating.value && index === melodyStepIndex.value,
    'is-done': melodyCelebrating.value || index < melodyStepIndex.value,
  }
}

function cameraPointX(point?: HandPoint) {
  return point ? (1 - point.x) * 100 : 0
}

function cameraPointY(point?: HandPoint) {
  return point ? point.y * 100 : 0
}

function animateWave(color: string) {
  activeWaveColor.value = `${color}cc`
  waveBars.value = waveBars.value.map((bar, index) => ({
    ...bar,
    height: 8 + ((index * 13 + notesPlayed.value * 7) % 34),
  }))

  if (waveResetTimerId !== null) {
    window.clearTimeout(waveResetTimerId)
  }

  waveResetTimerId = window.setTimeout(() => {
    activeWaveColor.value = 'rgba(72, 110, 164, 0.34)'
    waveBars.value = waveBars.value.map((bar, index) => ({
      ...bar,
      height: 4 + ((index * 5 + notesPlayed.value) % 8),
    }))
    waveResetTimerId = null
  }, 280)
}

function spawnParticles(noteId: AirXylophoneNoteId) {
  const noteIndex = notes.findIndex((note) => note.id === noteId)
  const rect = targetRects.value[noteIndex]
  const center = rect ? ((rect.left + rect.right) / 2) * 100 : 50
  const symbols = ['♪', '♫', '♬', '♩']
  const color = noteColor(noteId)
  const created = Array.from({ length: 5 }, (_, index) => ({
    id: particleId++,
    symbol: symbols[(index + noteIndex + notesPlayed.value) % symbols.length] ?? '♪',
    color,
    left: center + (index - 2) * 1.2,
    bottom: 28 + (index % 2) * 2,
    drift: (index - 2) * 18,
    delay: index * 55,
  }))

  musicParticles.value = [...musicParticles.value, ...created].slice(-36)
  window.setTimeout(() => {
    const ids = new Set(created.map((particle) => particle.id))
    musicParticles.value = musicParticles.value.filter((particle) => !ids.has(particle.id))
  }, 1700)
}

function advanceMelody(noteId: AirXylophoneNoteId) {
  const progress = advanceAirXylophoneMelodyProgress(
    {
      stepIndex: melodyStepIndex.value,
      celebrating: melodyCelebrating.value,
    },
    currentMelodyNoteId.value,
    noteId,
    currentMelodySequence.value.length,
  )

  if (
    progress.stepIndex === melodyStepIndex.value
    && progress.celebrating === melodyCelebrating.value
  ) {
    return
  }

  const shouldScheduleLoop = progress.celebrating && !melodyCelebrating.value
  melodyStepIndex.value = progress.stepIndex
  melodyCelebrating.value = progress.celebrating

  if (shouldScheduleLoop) {
    if (melodyResetTimerId !== null) {
      window.clearTimeout(melodyResetTimerId)
    }
    melodyResetTimerId = window.setTimeout(() => {
      melodyStepIndex.value = 0
      melodyCelebrating.value = false
      melodyResetTimerId = null
    }, 680)
  }
}

function showComboBurst() {
  if (streak.value === 0 || streak.value % 8 !== 0) {
    return
  }

  comboBurstVisible.value = false
  comboBurstKey.value += 1
  window.setTimeout(() => {
    comboBurstVisible.value = true
    if (comboBurstTimerId !== null) {
      window.clearTimeout(comboBurstTimerId)
    }
    comboBurstTimerId = window.setTimeout(() => {
      comboBurstVisible.value = false
      comboBurstTimerId = null
    }, 620)
  }, 0)
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) {
    return null
  }

  if (!audioContext) {
    audioContext = new AudioContextClass()
  }

  return audioContext
}

async function playTone(frequency: number) {
  const ctx = getAudioContext()
  if (!ctx) {
    return
  }

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => undefined)
  }

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + 0.44)
}

function playNote(noteId: string) {
  const note = notes.find((item) => item.id === noteId)
  if (!note) {
    return
  }

  notesPlayed.value += 1
  streak.value += 1
  activeNoteIds.value = Array.from(new Set([...activeNoteIds.value, note.id]))
  void playTone(note.frequency)
  animateWave(note.color)
  spawnParticles(note.id)
  advanceMelody(note.id)
  showComboBurst()
  window.setTimeout(() => {
    activeNoteIds.value = activeNoteIds.value.filter((id) => id !== note.id)
  }, 180)
}

function triggerNote(noteId: string, triggerKey = noteId, now = performance.now()) {
  const lastTriggeredAt = lastNoteTriggeredAtByKey.get(triggerKey) ?? 0
  if (now - lastTriggeredAt < noteTriggerDebounceMs) {
    return
  }

  lastNoteTriggeredAtByKey.set(triggerKey, now)
  playNote(noteId)
}

function getHandPlayState(handKey: string) {
  const existing = handPlayStates.get(handKey)
  if (existing) {
    return existing
  }

  const created: HandPlayState = {
    hoverNoteId: '',
    previousPoint: null,
    wasFist: false,
  }
  handPlayStates.set(handKey, created)
  return created
}

function processHandPoint(handKey: string, point: StagePoint, isFist = false) {
  const state = getHandPlayState(handKey)
  const hitIndex = findRectHit(point, targetRects.value)

  if (hitIndex >= 0) {
    const note = notes[hitIndex]
    if (note) {
      const justEntered = state.hoverNoteId !== note.id
      if (justEntered) {
        triggerNote(note.id, `${handKey}:enter`)
        state.hoverNoteId = note.id
      }

      if (!justEntered && isFist && !state.wasFist) {
        triggerNote(note.id, `${handKey}:fist`)
      }
    }
  } else {
    state.hoverNoteId = ''
  }

  targetRects.value.forEach((rect, index) => {
    const note = notes[index]
    if (note && detectDownwardStrike(state.previousPoint, point, rect, 0.035)) {
      triggerNote(note.id, `${handKey}:strike`)
      state.hoverNoteId = note.id
    }
  })

  state.previousPoint = point
  state.wasFist = isFist
}

function handlePrimaryPoint(point: StagePoint | null) {
  if (latestHands.value.length > 0) {
    return
  }

  if (!point) {
    previousPoint.value = null
    lastHoverNoteId.value = ''
    handPlayStates.delete('pointer')
    return
  }

  if (latestHands.value.length === 0) {
    pointerFallbackUsed.value = true
  }

  const normalized = normalizeStagePoint(point, { width: 1, height: 1 })
  processHandPoint('pointer', normalized)
  previousPoint.value = normalized
  lastHoverNoteId.value = getHandPlayState('pointer').hoverNoteId
}

function handleHands(hands: HandObservation[]) {
  latestHands.value = hands
  if (hands.length === 0) {
    Array.from(handPlayStates.keys())
      .filter((key) => key.startsWith('camera:'))
      .forEach((key) => handPlayStates.delete(key))
    return
  }

  const activeHandKeys = new Set<string>()
  hands.forEach((hand, index) => {
    const finger = getPrimaryFingerPoint(hand.landmarks)
    if (!finger) {
      return
    }

    const handKey = `camera:${hand.handedness || 'hand'}:${index}`
    activeHandKeys.add(handKey)
    processHandPoint(
      handKey,
      mapLandmarkToNormalizedStagePoint(finger),
      classifyHandPose(hand.landmarks) === 'fist',
    )
  })

  Array.from(handPlayStates.keys())
    .filter((key) => key.startsWith('camera:') && !activeHandKeys.has(key))
    .forEach((key) => handPlayStates.delete(key))
}

function finish() {
  if (timerId) {
    window.clearInterval(timerId)
    timerId = null
  }

  const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
  const targetHits = Math.max(8, Math.round(props.duration / 4))
  const completionScore = Math.min(100, Math.round((notesPlayed.value / targetHits) * 100))

  emit('finish', {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: startedAt,
    endTime: Date.now(),
    duration,
    trials: [],
    totalTrials: targetHits,
    correctTrials: notesPlayed.value,
    accuracy: Math.min(1, notesPlayed.value / targetHits),
    avgResponseTime: 0,
    errors: { omission: Math.max(0, targetHits - notesPlayed.value), commission: 0 },
    behavior: {
      impulsivityScore: 0,
      fatigueIndex: 1,
      distractorPattern: 'camera_hand_strike',
    },
    handGameStats: {
      handTrackingUsed: latestHands.value.length > 0,
      pointerFallbackUsed: pointerFallbackUsed.value,
      gestureEvents: notesPlayed.value,
      completionScore,
    },
  })
}

onMounted(() => {
  timerId = window.setInterval(() => {
    remainingSeconds.value -= 1
    if (remainingSeconds.value <= 0) {
      finish()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (timerId) {
    window.clearInterval(timerId)
  }
  if (waveResetTimerId !== null) {
    window.clearTimeout(waveResetTimerId)
  }
  if (melodyResetTimerId !== null) {
    window.clearTimeout(melodyResetTimerId)
  }
  if (comboBurstTimerId !== null) {
    window.clearTimeout(comboBurstTimerId)
  }
  audioContext?.close().catch(() => {
    // ignore close failures
  })
})
</script>

<style scoped>
.air-xylophone {
  color: #17324d;
}

.air-xylophone__sky {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle at 15% 20%, rgba(255, 231, 160, 0.58), transparent 18%),
    radial-gradient(circle at 82% 24%, rgba(134, 239, 172, 0.36), transparent 22%),
    linear-gradient(180deg, rgba(229, 249, 255, 0.88), rgba(255, 252, 232, 0.8));
}

.air-xylophone__hud {
  position: absolute;
  top: 22px;
  right: 22px;
  z-index: 5;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 30px rgba(35, 69, 96, 0.12);
}

.air-xylophone__hud strong,
.air-xylophone__hud span {
  font-size: 14px;
  color: #24415b;
}

.air-xylophone__bars {
  position: absolute;
  left: 7%;
  right: 7%;
  bottom: 8%;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(6, minmax(72px, 1fr));
  gap: 18px;
  align-items: end;
}

.air-xylophone__bar {
  height: var(--bar-height);
  border: 0;
  border-radius: 24px;
  color: #fff;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 38%),
    var(--bar-color);
  box-shadow:
    0 18px 30px rgba(38, 65, 92, 0.18),
    inset 0 -10px 0 rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.14s ease, filter 0.14s ease;
}

.air-xylophone__bar.is-hit {
  transform: translateY(18px) scaleY(0.94);
  filter: brightness(1.08);
}

.air-xylophone__bar span {
  display: inline-flex;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 20px;
  font-weight: 800;
}

.air-xylophone__guide-line {
  position: absolute;
  left: 7%;
  right: 7%;
  top: 58%;
  z-index: 3;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.32), transparent);
}

.air-xylophone :deep(.hand-camera-layer__video) {
  top: 14%;
  left: 50%;
  width: min(780px, 56%);
  height: 38%;
  z-index: 2;
  border-radius: 30px;
  opacity: 0.52;
  object-fit: cover;
  transform: translateX(-50%) scaleX(-1);
  filter: saturate(1.1) contrast(1.02);
  box-shadow:
    inset 0 0 44px rgba(15, 76, 92, 0.2),
    0 22px 54px rgba(37, 99, 235, 0.14);
}

.air-xylophone :deep(.hand-camera-layer__shade) {
  z-index: 1;
  background:
    radial-gradient(circle at 18% 24%, rgba(255, 228, 138, 0.45), transparent 20%),
    radial-gradient(circle at 82% 18%, rgba(86, 229, 166, 0.36), transparent 24%),
    linear-gradient(180deg, rgba(239, 252, 255, 0.72), rgba(255, 253, 238, 0.78));
}

.air-xylophone :deep(.hand-camera-layer__cursor) {
  z-index: 18;
}

.air-xylophone :deep(.hand-camera-layer__status) {
  bottom: 10px;
  z-index: 22;
}

.air-xylophone__melody {
  position: absolute;
  top: 24px;
  left: 50%;
  z-index: 8;
  display: flex;
  align-items: center;
  width: min(860px, 58%);
  min-height: 54px;
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.84);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 18px 38px rgba(56, 96, 130, 0.13);
  transform: translateX(-50%);
  backdrop-filter: blur(8px);
}

.air-xylophone__melody-label {
  margin-right: 12px;
  color: #486074;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.air-xylophone__melody-notes {
  display: flex;
  flex: 1;
  justify-content: center;
  gap: 8px;
}

.air-xylophone__melody-note {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  color: #fff;
  background: var(--note-color);
  box-shadow: inset 0 -5px 0 rgba(0, 0, 0, 0.08);
  font-size: 13px;
  font-weight: 900;
  transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.air-xylophone__melody-note.is-active {
  transform: translateY(-2px) scale(1.24);
  box-shadow:
    0 0 0 5px rgba(255, 255, 255, 0.9),
    0 0 24px color-mix(in srgb, var(--note-color) 72%, transparent),
    inset 0 -5px 0 rgba(0, 0, 0, 0.08);
}

.air-xylophone__melody-note.is-done {
  opacity: 0.28;
  transform: scale(0.9);
  filter: grayscale(0.25);
}

.air-xylophone__camera {
  position: absolute;
  top: 14%;
  left: 50%;
  z-index: 5;
  width: min(780px, 56%);
  height: 38%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(5, 22, 32, 0.16), rgba(255, 255, 255, 0.08)),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 28px);
  box-shadow:
    inset 0 0 0 1px rgba(40, 190, 145, 0.22),
    inset 0 0 46px rgba(40, 190, 145, 0.14),
    0 24px 58px rgba(37, 99, 235, 0.16);
  transform: translateX(-50%);
  pointer-events: none;
}

.air-xylophone__camera::after {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px dashed rgba(74, 222, 128, 0.34);
  border-radius: 22px;
}

.air-xylophone__camera-placeholder {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: rgba(49, 80, 106, 0.68);
  text-align: center;
}

.air-xylophone__camera-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 22px;
  color: #16a34a;
  background: rgba(236, 253, 245, 0.82);
  box-shadow: 0 12px 26px rgba(22, 163, 74, 0.16);
  font-weight: 900;
}

.air-xylophone__camera-placeholder strong {
  font-size: 20px;
}

.air-xylophone__camera-placeholder small {
  font-size: 13px;
  font-weight: 800;
}

.hand-skeleton {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
}

.hand-skeleton line {
  stroke: rgba(34, 197, 94, 0.82);
  stroke-width: 0.9;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.68));
}

.hand-skeleton circle {
  fill: rgba(187, 247, 208, 0.9);
  stroke: rgba(22, 163, 74, 0.88);
  stroke-width: 0.45;
}

.hand-skeleton circle.is-primary {
  fill: #fef08a;
  stroke: #f59e0b;
  stroke-width: 0.8;
  animation: skeleton-primary-pulse 0.85s ease-in-out infinite;
}

@keyframes skeleton-primary-pulse {
  50% {
    opacity: 0.55;
    transform: scale(1.18);
  }
}

.air-xylophone__wave {
  position: absolute;
  left: 50%;
  bottom: 32%;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(720px, 56%);
  height: 54px;
  gap: 4px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 0 22px rgba(56, 96, 130, 0.08);
  transform: translateX(-50%);
  backdrop-filter: blur(6px);
}

.air-xylophone__wave-bar {
  width: 5px;
  min-height: 4px;
  border-radius: 999px;
  transition: height 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
  box-shadow: 0 0 12px currentColor;
}

.air-xylophone__particle {
  position: absolute;
  z-index: 20;
  font-size: 32px;
  font-weight: 900;
  pointer-events: none;
  text-shadow: 0 8px 22px rgba(38, 65, 92, 0.18);
  animation: music-particle-float 1.38s ease-out forwards;
}

@keyframes music-particle-float {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) scale(0.7) rotate(-8deg);
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--particle-drift)), -170px) scale(1.45) rotate(18deg);
  }
}

.air-xylophone__combo-burst {
  position: absolute;
  top: 48%;
  left: 50%;
  z-index: 21;
  color: #fb923c;
  font-size: clamp(36px, 5vw, 74px);
  font-weight: 1000;
  letter-spacing: -0.04em;
  text-shadow:
    0 4px 0 rgba(255, 255, 255, 0.8),
    0 18px 44px rgba(249, 115, 22, 0.3);
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: combo-burst-pop 0.62s ease-out forwards;
}

@keyframes combo-burst-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  40% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.35);
  }
}

.air-xylophone__bars {
  bottom: 7%;
  z-index: 7;
}

.air-xylophone__bar {
  position: relative;
  min-height: 126px;
  border: 3px solid color-mix(in srgb, var(--bar-color) 78%, #17324d);
  overflow: visible;
}

.air-xylophone__bar.is-waiting {
  box-shadow:
    0 0 0 7px rgba(255, 255, 255, 0.78),
    0 0 34px color-mix(in srgb, var(--bar-color) 70%, transparent),
    0 18px 30px rgba(38, 65, 92, 0.18),
    inset 0 -10px 0 rgba(0, 0, 0, 0.08);
  animation: waiting-key-breathe 1.05s ease-in-out infinite;
}

.air-xylophone__bar.is-waiting::before {
  content: '下一音';
  position: absolute;
  left: 50%;
  top: -34px;
  padding: 6px 12px;
  border-radius: 999px;
  color: #31506a;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 22px rgba(49, 80, 106, 0.14);
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
  transform: translateX(-50%);
}

@keyframes waiting-key-breathe {
  50% {
    transform: translateY(-8px) scale(1.03);
    filter: brightness(1.09);
  }
}

.air-xylophone__guide-line {
  top: 62%;
  z-index: 4;
}
</style>
