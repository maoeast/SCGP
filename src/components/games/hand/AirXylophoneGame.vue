<template>
  <HandCameraLayer class="air-xylophone" @primary-point="handlePrimaryPoint" @hands="handleHands">
    <div class="air-xylophone__sky" />
    <div class="air-xylophone__hud">
      <strong>{{ remainingSeconds }}秒</strong>
      <span>{{ notesPlayed }}次敲击</span>
      <span>连续 {{ streak }} 次</span>
    </div>

    <div class="air-xylophone__bars">
      <button
        v-for="note in notes"
        :key="note.id"
        class="air-xylophone__bar"
        :class="{ 'is-hit': activeNoteId === note.id }"
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
  detectDownwardStrike,
  normalizeStagePoint,
  type NormalizedRect,
  type StagePoint,
} from '@/utils/hand-game-gestures'
import { TaskID, type GameSessionData } from '@/types/games'
import type { HandObservation } from '@/composables/useHandLandmarker'

const props = withDefaults(defineProps<{
  studentId: number
  taskId?: TaskID
  duration?: number
}>(), {
  taskId: TaskID.HAND_XYLOPHONE,
  duration: 45,
})

const emit = defineEmits<{
  finish: [session: GameSessionData]
}>()

const notes = [
  { id: 'do', label: 'Do', frequency: 261.63, color: '#f97316', height: 170 },
  { id: 're', label: 'Re', frequency: 293.66, color: '#facc15', height: 190 },
  { id: 'mi', label: 'Mi', frequency: 329.63, color: '#22c55e', height: 210 },
  { id: 'sol', label: 'Sol', frequency: 392, color: '#38bdf8', height: 230 },
  { id: 'la', label: 'La', frequency: 440, color: '#818cf8', height: 250 },
  { id: 'do2', label: 'Do', frequency: 523.25, color: '#ec4899', height: 270 },
] as const

const startedAt = Date.now()
const remainingSeconds = ref(props.duration)
const notesPlayed = ref(0)
const streak = ref(0)
const activeNoteId = ref('')
const latestHands = ref<HandObservation[]>([])
const previousPoint = ref<StagePoint | null>(null)
const pointerFallbackUsed = ref(false)
let timerId: number | null = null
let audioContext: AudioContext | null = null

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

function playTone(frequency: number) {
  const ctx = getAudioContext()
  if (!ctx) {
    return
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
  activeNoteId.value = note.id
  playTone(note.frequency)
  window.setTimeout(() => {
    if (activeNoteId.value === note.id) {
      activeNoteId.value = ''
    }
  }, 180)
}

function handlePrimaryPoint(point: StagePoint | null) {
  if (!point) {
    previousPoint.value = null
    return
  }

  if (latestHands.value.length === 0) {
    pointerFallbackUsed.value = true
  }

  const normalized = normalizeStagePoint(point, { width: 1, height: 1 })
  targetRects.value.forEach((rect, index) => {
    const note = notes[index]
    if (note && detectDownwardStrike(previousPoint.value, normalized, rect, 0.035)) {
      playNote(note.id)
    }
  })
  previousPoint.value = normalized
}

function handleHands(hands: HandObservation[]) {
  latestHands.value = hands
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
</style>
