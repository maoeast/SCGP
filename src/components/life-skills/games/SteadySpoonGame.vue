<template>
  <section
    class="steady-spoon-game"
    :class="{
      'is-paused': props.paused,
      'is-complete': completed,
    }"
  >
    <header class="game-header">
      <div class="title-block">
        <span class="title-icon" aria-hidden="true">🥄</span>
        <div>
          <p class="eyebrow">独立进食练习</p>
          <h2>稳稳送一勺</h2>
        </div>
      </div>

      <div class="progress-block" aria-live="polite">
        <strong>已经送到 {{ deliveredScoops }} / {{ difficultyConfig.targetScoops }} 勺</strong>
        <div class="progress-dots" aria-hidden="true">
          <span
            v-for="index in difficultyConfig.targetScoops"
            :key="index"
            :class="{ 'is-filled': index <= deliveredScoops }"
          >
            {{ index <= deliveredScoops ? '●' : '○' }}
          </span>
        </div>
      </div>
    </header>

    <div class="status-card" :data-tone="statusTone" role="status" aria-live="polite">
      <span class="status-symbol" aria-hidden="true">{{ statusSymbol }}</span>
      <div>
        <strong>{{ statusTitle }}</strong>
        <p>{{ statusMessage }}</p>
      </div>
    </div>

    <div
      ref="stageRef"
      class="spoon-stage"
      :class="{
        'is-stable': motionState === 'stable',
        'is-warning': motionState === 'warning',
        'is-guide-visible': guideVisible,
      }"
    >
      <svg
        class="path-guide"
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          v-if="guideVisible"
          class="path-guide__corridor"
          :d="guidePath"
          :stroke-width="corridorStrokeWidth"
        />
        <path class="path-guide__center" :d="guidePath" />
      </svg>

      <div class="bowl-area" aria-hidden="true">
        <span class="bowl-steam">⌁</span>
        <span class="bowl">🥣</span>
        <small>从碗边出发</small>
      </div>

      <div class="friend-area" aria-hidden="true">
        <span class="friend">🙂</span>
        <span class="mouth-target">送到这里</span>
      </div>

      <div
        class="destination-glow"
        :style="destinationStyle"
        aria-hidden="true"
      />

      <button
        ref="spoonRef"
        type="button"
        class="spoon-touch-target"
        :class="{
          'is-grabbed': isGrabbed,
          'is-stable': motionState === 'stable',
          'is-warning': motionState === 'warning',
        }"
        :style="spoonStyle"
        :disabled="props.paused || completed"
        :aria-label="isGrabbed ? '正在移动大勺' : '按住大勺，慢慢送到右边'"
        :aria-pressed="isGrabbed"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerCancel"
      >
        <span class="spoon-halo" aria-hidden="true" />
        <span class="spoon-food" aria-hidden="true">{{ spoonFood }}</span>
        <span class="spoon-emoji" aria-hidden="true">🥄</span>
        <span class="grab-label">{{ isGrabbed ? '稳稳移动' : '按住这里' }}</span>
      </button>

      <div v-if="completed" class="completion-celebration" role="status">
        <span aria-hidden="true">🌟</span>
        <strong>每一勺都送到啦！</strong>
        <p>你慢慢移动、稳稳到达，做得真棒。</p>
      </div>

      <div v-if="props.paused" class="pause-cover" aria-hidden="true">
        <span>☁️</span>
        <strong>先休息一下</strong>
      </div>
    </div>

    <footer class="game-footer">
      <div class="gentle-reminder">
        <span aria-hidden="true">✋</span>
        <p><strong>不用着急</strong><br />松开大勺也会停在原地，可以再按住继续。</p>
      </div>

      <button
        type="button"
        class="teacher-hint-button"
        :disabled="props.paused || completed"
        @click="showTeacherHint"
      >
        <span aria-hidden="true">👩‍🏫</span>
        <span>
          <small>教师提示</small>
          <strong>{{ guideVisible ? '再亮一次通道' : '显示宽通道' }}</strong>
        </span>
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  STEADY_SPOON_DIFFICULTIES,
  averageNonNegative,
  evaluateSpoonMotion,
  getSpoonPathY,
  ratio,
} from '@/features/life-skills/new-games-core'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
} from '@/types/emotional/games'

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const PATH_START_X_RATIO = 0.13
const PATH_END_X_RATIO = 0.84
const COMPLETION_PROGRESS_RATIO = 0.985
const ABRUPT_TURN_ANGLE_DEGREES = 100
const MIN_TURN_DISTANCE_PX = 5
const TURN_COSINE_LIMIT = Math.cos((ABRUPT_TURN_ANGLE_DEGREES * Math.PI) / 180)
const GUIDE_VIEWBOX_WIDTH = 1000
const GUIDE_VIEWBOX_HEIGHT = 500
const GUIDE_POINT_COUNT = 32

interface MotionPoint {
  x: number
  y: number
  time: number
  dx: number
  dy: number
}

type MotionState = 'idle' | 'stable' | 'warning'
type FeedbackKind = 'ready' | 'spill' | 'delivered'

const stageRef = ref<HTMLElement | null>(null)
const spoonRef = ref<HTMLButtonElement | null>(null)
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const deliveredScoops = ref(0)
const spillEvents = ref(0)
const regraspCount = ref(0)
const hintCount = ref(0)
const stableSampleCount = ref(0)
const totalMotionSamples = ref(0)
const pathDeviationTotal = ref(0)
const deliveryTimesMs = ref<number[]>([])
const spoonProgress = ref(0)
const spoonYRatio = ref(getSpoonPathY(activeDifficulty.value, 0))
const isGrabbed = ref(false)
const completed = ref(false)
const motionState = ref<MotionState>('idle')
const feedbackKind = ref<FeedbackKind>('ready')
const teacherGuideRequested = ref(false)

let activePointerId: number | null = null
let captureTarget: HTMLButtonElement | null = null
let grabOffsetX = 0
let grabOffsetY = 0
let lastMotionPoint: MotionPoint | null = null
let consecutiveInstability = 0
let hasGrabbedCurrentSpoon = false
let roundStarted = false
let completionEmitted = false
let disposed = false
let sessionStartedAt: number | null = null
let sessionPausedMs = 0
let pauseStartedAt: number | null = null
let scoopStartedAt: number | null = null
let scoopPausedMs = 0

const difficultyConfig = computed(() => STEADY_SPOON_DIFFICULTIES[activeDifficulty.value])

const guideVisible = computed(() => difficultyConfig.value.showFullGuide || teacherGuideRequested.value)
const corridorStrokeWidth = computed(
  () => difficultyConfig.value.corridorHalfWidthRatio * GUIDE_VIEWBOX_HEIGHT * 2,
)
const spoonFood = computed(() => ['🥕', '🥣', '🌽'][deliveredScoops.value % 3] ?? '🥕')

const guidePath = computed(() => {
  const points = Array.from({ length: GUIDE_POINT_COUNT + 1 }, (_, index) => {
    const progress = index / GUIDE_POINT_COUNT
    const xRatio = PATH_START_X_RATIO + progress * (PATH_END_X_RATIO - PATH_START_X_RATIO)
    const yRatio = getSpoonPathY(activeDifficulty.value, progress)
    return `${index === 0 ? 'M' : 'L'} ${Math.round(xRatio * GUIDE_VIEWBOX_WIDTH)} ${Math.round(yRatio * GUIDE_VIEWBOX_HEIGHT)}`
  })
  return points.join(' ')
})

const spoonStyle = computed(() => ({
  left: `${(PATH_START_X_RATIO + spoonProgress.value * (PATH_END_X_RATIO - PATH_START_X_RATIO)) * 100}%`,
  top: `${spoonYRatio.value * 100}%`,
}))

const destinationStyle = computed(() => ({
  left: `${PATH_END_X_RATIO * 100}%`,
  top: `${getSpoonPathY(activeDifficulty.value, 1) * 100}%`,
}))

const statusTitle = computed(() => {
  if (props.paused) return '先休息一下'
  if (completed.value) return '全部送到啦！'
  if (isGrabbed.value && motionState.value === 'stable') return '稳稳的，继续向右'
  if (isGrabbed.value && motionState.value === 'warning') return '慢一点，回到亮亮的通道'
  if (feedbackKind.value === 'spill') return '没关系，再来一勺'
  if (feedbackKind.value === 'delivered') return '这一勺送到啦！'
  return '按住大勺，慢慢送到右边'
})

const statusMessage = computed(() => {
  if (props.paused) return '大勺停在原地，回来后可以接着送。'
  if (completed.value) return `你稳稳送完了 ${difficultyConfig.value.targetScoops} 勺。`
  if (isGrabbed.value && motionState.value === 'warning') return '放慢一点，轻轻往通道中间移动。'
  if (isGrabbed.value) return '保持这个节奏，到右边会自动送达。'
  if (feedbackKind.value === 'spill') return '只换回当前这一勺，前面送到的都还在。'
  if (feedbackKind.value === 'delivered') return '准备好后，按住新的一勺继续。'
  return '中途松手不会回到起点，再按住就能继续。'
})

const statusSymbol = computed(() => {
  if (props.paused) return '☁️'
  if (completed.value) return '🌟'
  if (motionState.value === 'warning') return '🌊'
  if (motionState.value === 'stable') return '✨'
  if (feedbackKind.value === 'spill') return '💛'
  if (feedbackKind.value === 'delivered') return '⭐'
  return '🥄'
})

const statusTone = computed(() => {
  if (completed.value || feedbackKind.value === 'delivered') return 'success'
  if (motionState.value === 'warning' || feedbackKind.value === 'spill') return 'gentle'
  return 'calm'
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function startAudio(): void {
  props.audio.ensureReady()
    .then(() => {
      if (disposed || props.paused || completionEmitted) return undefined
      return props.audio.startAmbient()
    })
    .catch(() => {
      // Audio is supportive only; pointer interaction must remain available.
    })
}

function markRoundStarted(now: number): void {
  if (roundStarted) return
  roundStarted = true
  sessionStartedAt = now
  props.markRoundDirty?.()
  startAudio()
}

function handlePointerDown(event: PointerEvent): void {
  if (
    props.paused
    || completed.value
    || activePointerId !== null
    || !event.isPrimary
    || (event.pointerType === 'mouse' && event.button !== 0)
  ) {
    return
  }

  const stage = stageRef.value
  const target = event.currentTarget as HTMLButtonElement
  if (!stage) return

  event.preventDefault()
  const now = performance.now()
  markRoundStarted(now)

  if (scoopStartedAt === null) {
    scoopStartedAt = now
    scoopPausedMs = 0
  }

  if (hasGrabbedCurrentSpoon) {
    regraspCount.value += 1
  }
  hasGrabbedCurrentSpoon = true

  const stageRect = stage.getBoundingClientRect()
  const spoonX = stageRect.width * (
    PATH_START_X_RATIO + spoonProgress.value * (PATH_END_X_RATIO - PATH_START_X_RATIO)
  )
  const spoonY = stageRect.height * spoonYRatio.value
  const pointerX = event.clientX - stageRect.left
  const pointerY = event.clientY - stageRect.top

  grabOffsetX = pointerX - spoonX
  grabOffsetY = pointerY - spoonY
  activePointerId = event.pointerId
  captureTarget = target
  target.setPointerCapture(event.pointerId)
  isGrabbed.value = true
  motionState.value = 'idle'
  feedbackKind.value = 'ready'
  consecutiveInstability = 0
  lastMotionPoint = {
    x: spoonX,
    y: spoonY,
    time: now,
    dx: 0,
    dy: 0,
  }
}

function handlePointerMove(event: PointerEvent): void {
  if (
    props.paused
    || completed.value
    || !isGrabbed.value
    || event.pointerId !== activePointerId
  ) {
    return
  }

  const stage = stageRef.value
  if (!stage || !lastMotionPoint) return

  event.preventDefault()
  const rect = stage.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const localX = event.clientX - rect.left - grabOffsetX
  const localY = event.clientY - rect.top - grabOffsetY
  const progress = clamp(
    (localX / rect.width - PATH_START_X_RATIO) / (PATH_END_X_RATIO - PATH_START_X_RATIO),
    0,
    1,
  )
  const yRatio = clamp(localY / rect.height, 0.04, 0.96)
  const pointX = rect.width * (
    PATH_START_X_RATIO + progress * (PATH_END_X_RATIO - PATH_START_X_RATIO)
  )
  const pointY = rect.height * yRatio
  const now = performance.now()
  const elapsedMs = Math.max(1, now - lastMotionPoint.time)
  const dx = pointX - lastMotionPoint.x
  const dy = pointY - lastMotionPoint.y
  const distance = Math.hypot(dx, dy)
  const previousDistance = Math.hypot(lastMotionPoint.dx, lastMotionPoint.dy)
  const speedPxPerSecond = (distance / elapsedMs) * 1000
  const abruptTurn = distance >= MIN_TURN_DISTANCE_PX
    && previousDistance >= MIN_TURN_DISTANCE_PX
    && ((dx * lastMotionPoint.dx + dy * lastMotionPoint.dy) / (distance * previousDistance)) < TURN_COSINE_LIMIT

  spoonProgress.value = progress
  spoonYRatio.value = yRatio

  const evaluation = evaluateSpoonMotion({
    difficulty: activeDifficulty.value,
    progress,
    yRatio,
    speedPxPerSecond,
    abruptTurn,
  })

  totalMotionSamples.value += 1
  pathDeviationTotal.value += evaluation.deviationRatio

  if (evaluation.stable) {
    stableSampleCount.value += 1
    consecutiveInstability = 0
    motionState.value = 'stable'
  } else {
    consecutiveInstability += Math.max(1, evaluation.instabilityWeight)
    motionState.value = 'warning'
  }

  lastMotionPoint = { x: pointX, y: pointY, time: now, dx, dy }

  if (consecutiveInstability >= difficultyConfig.value.spillSampleLimit) {
    resetCurrentSpoonAfterSpill()
    return
  }

  if (progress >= COMPLETION_PROGRESS_RATIO && evaluation.stable) {
    deliverCurrentSpoon(now)
  }
}

function releaseActivePointer(): void {
  const pointerId = activePointerId
  const target = captureTarget
  activePointerId = null
  captureTarget = null

  if (pointerId !== null && target?.hasPointerCapture(pointerId)) {
    target.releasePointerCapture(pointerId)
  }

  isGrabbed.value = false
  motionState.value = 'idle'
  lastMotionPoint = null
  consecutiveInstability = 0
}

function handlePointerUp(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return
  event.preventDefault()
  releaseActivePointer()
}

function handlePointerCancel(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return
  // Cancellation is neutral: keep position and do not record a spill or error.
  releaseActivePointer()
}

function resetSpoonPosition(): void {
  spoonProgress.value = 0
  spoonYRatio.value = getSpoonPathY(activeDifficulty.value, 0)
  scoopStartedAt = null
  scoopPausedMs = 0
  hasGrabbedCurrentSpoon = false
  consecutiveInstability = 0
}

function resetCurrentSpoonAfterSpill(): void {
  releaseActivePointer()
  spillEvents.value += 1
  feedbackKind.value = 'spill'
  resetSpoonPosition()
  props.audio.playSoftBounce().catch(() => {
    // Continue silently when effects audio is unavailable.
  })
  props.audio.speak('没关系，慢慢来，再送一勺。')
}

function deliverCurrentSpoon(now: number): void {
  releaseActivePointer()

  if (scoopStartedAt !== null) {
    deliveryTimesMs.value.push(Math.max(0, Math.round(now - scoopStartedAt - scoopPausedMs)))
  }

  deliveredScoops.value += 1
  feedbackKind.value = 'delivered'
  props.audio.playSuccessCue().catch(() => {
    // Continue silently when effects audio is unavailable.
  })

  if (deliveredScoops.value >= difficultyConfig.value.targetScoops) {
    finishGame(now)
    return
  }

  props.audio.speak('稳稳送到啦，准备下一勺。')
  resetSpoonPosition()
}

function getActiveSessionDurationMs(now: number): number {
  if (sessionStartedAt === null) return 0
  const openPauseMs = pauseStartedAt === null ? 0 : now - pauseStartedAt
  return Math.max(0, now - sessionStartedAt - sessionPausedMs - openPauseMs)
}

function buildCompletionPayload(now: number): EmotionGameCompletionPayload {
  const config = difficultyConfig.value
  return {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'continuous-stability-control',
      target_scoops: config.targetScoops,
      delivered_scoops: deliveredScoops.value,
      spill_events: spillEvents.value,
      stable_motion_ratio: Number(ratio(stableSampleCount.value, totalMotionSamples.value).toFixed(4)),
      path_deviation_ratio: Number(ratio(pathDeviationTotal.value, totalMotionSamples.value).toFixed(4)),
      delivery_times_ms: [...deliveryTimesMs.value],
      average_delivery_ms: averageNonNegative(deliveryTimesMs.value),
      regrasp_count: regraspCount.value,
      hint_count: hintCount.value,
      input_adaptation: 'pointer',
      actual_params: {
        target_scoops: config.targetScoops,
        speed_limit_px_per_second: config.speedLimitPxPerSecond,
        corridor_half_width_ratio: config.corridorHalfWidthRatio,
        spill_sample_limit: config.spillSampleLimit,
        show_full_guide: config.showFullGuide,
        completion_progress_ratio: COMPLETION_PROGRESS_RATIO,
        abrupt_turn_angle_degrees: ABRUPT_TURN_ANGLE_DEGREES,
      },
      total_duration_seconds: Number((getActiveSessionDurationMs(now) / 1000).toFixed(1)),
      difficulty_level: activeDifficulty.value,
    },
  }
}

function finishGame(now: number): void {
  if (completionEmitted) return
  completionEmitted = true
  completed.value = true
  resetSpoonPosition()
  props.audio.stopAmbient()
  props.audio.speak('全部送到啦，你做得真棒！')
  emit('complete', buildCompletionPayload(now))
}

function showTeacherHint(): void {
  if (props.paused || completed.value) return
  hintCount.value += 1
  teacherGuideRequested.value = true
  feedbackKind.value = 'ready'
  props.audio.speak('看一看亮亮的宽通道，沿着中间慢慢走。')
}

function pauseInteraction(now: number): void {
  if (roundStarted && !completionEmitted && pauseStartedAt === null) {
    pauseStartedAt = now
  }
  releaseActivePointer()
  props.audio.stopAmbient()
}

function resumeInteraction(now: number): void {
  if (pauseStartedAt !== null) {
    const pausedForMs = Math.max(0, now - pauseStartedAt)
    sessionPausedMs += pausedForMs
    if (scoopStartedAt !== null) scoopPausedMs += pausedForMs
    pauseStartedAt = null
  }

  if (roundStarted && !completionEmitted) startAudio()
}

watch(
  () => props.paused,
  (isPaused) => {
    const now = performance.now()
    if (isPaused) pauseInteraction(now)
    else resumeInteraction(now)
  },
)

watch(
  () => props.difficulty,
  (difficulty) => {
    if (roundStarted) return
    activeDifficulty.value = difficulty
    spoonYRatio.value = getSpoonPathY(difficulty, 0)
    teacherGuideRequested.value = false
  },
)

onBeforeUnmount(() => {
  disposed = true
  releaseActivePointer()
  props.audio.stopAll()
})
</script>

<style scoped>
.steady-spoon-game {
  --ink: #25404a;
  --muted: #5f747b;
  --calm: #4cae91;
  --calm-dark: #267960;
  --sun: #f2bb55;
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.8vh, 18px);
  width: 100%;
  height: 100%;
  min-height: 540px;
  padding: clamp(12px, 2vw, 24px);
  overflow: hidden;
  color: var(--ink);
  font-family: inherit;
  user-select: none;
  background:
    radial-gradient(circle at 15% 12%, rgba(255, 244, 193, 0.75), transparent 27%),
    linear-gradient(155deg, #f6fbf7 0%, #e8f6ee 58%, #fef7df 100%);
}

.steady-spoon-game.is-paused {
  filter: saturate(0.7);
}

.steady-spoon-game.is-paused * {
  animation-play-state: paused !important;
}

.game-header {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title-block,
.progress-block,
.status-card,
.gentle-reminder,
.teacher-hint-button {
  border: 1px solid rgba(71, 124, 105, 0.13);
  box-shadow: 0 10px 28px rgba(52, 92, 76, 0.09);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 18px 10px 12px;
  border-radius: 22px;
}

.title-icon {
  display: grid;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 17px;
  font-size: 2rem;
  background: #fff4cf;
}

.eyebrow,
.title-block h2,
.status-card p,
.gentle-reminder p {
  margin: 0;
}

.eyebrow {
  color: var(--calm-dark);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.title-block h2 {
  margin-top: 2px;
  font-size: clamp(1.2rem, 2.2vw, 1.7rem);
  line-height: 1.1;
}

.progress-block {
  min-width: min(310px, 42vw);
  padding: 11px 18px;
  border-radius: 20px;
  text-align: center;
}

.progress-block strong {
  font-size: clamp(0.95rem, 1.6vw, 1.15rem);
}

.progress-dots {
  display: flex;
  justify-content: center;
  gap: 9px;
  margin-top: 5px;
  color: #b7cbc2;
  font-size: 1.05rem;
  line-height: 1;
}

.progress-dots .is-filled {
  color: var(--calm);
}

.status-card {
  z-index: 2;
  display: flex;
  align-items: center;
  align-self: center;
  gap: 12px;
  width: min(720px, 92%);
  box-sizing: border-box;
  padding: 10px 18px;
  border-radius: 20px;
}

.status-card[data-tone='success'] {
  border-color: rgba(45, 151, 110, 0.25);
  background: rgba(235, 255, 245, 0.92);
}

.status-card[data-tone='gentle'] {
  border-color: rgba(219, 159, 66, 0.25);
  background: rgba(255, 249, 230, 0.94);
}

.status-symbol {
  flex: 0 0 auto;
  font-size: 1.65rem;
}

.status-card strong {
  font-size: clamp(1rem, 1.7vw, 1.2rem);
}

.status-card p {
  margin-top: 2px;
  color: var(--muted);
  font-size: clamp(0.78rem, 1.4vw, 0.92rem);
}

.spoon-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 300px;
  overflow: hidden;
  border: 2px solid rgba(91, 139, 120, 0.18);
  border-radius: clamp(24px, 4vw, 40px);
  touch-action: none;
  background:
    radial-gradient(circle at 82% 36%, rgba(255, 229, 157, 0.42), transparent 18%),
    linear-gradient(180deg, rgba(235, 249, 244, 0.86), rgba(255, 252, 235, 0.93));
  box-shadow: inset 0 0 50px rgba(255, 255, 255, 0.8), 0 16px 36px rgba(48, 98, 79, 0.1);
}

.spoon-stage::before,
.spoon-stage::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.spoon-stage::before {
  right: -4%;
  bottom: -24%;
  width: 42%;
  height: 54%;
  border-radius: 50%;
  background: rgba(147, 205, 168, 0.14);
}

.spoon-stage::after {
  left: 31%;
  bottom: 8%;
  width: 38%;
  height: 12%;
  border-radius: 50%;
  background: rgba(87, 129, 110, 0.06);
  filter: blur(10px);
}

.path-guide {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.path-guide__corridor {
  fill: none;
  stroke: rgba(114, 204, 165, 0.24);
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: corridor-breathe 2.6s ease-in-out infinite;
}

.path-guide__center {
  fill: none;
  stroke: rgba(49, 139, 105, 0.34);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-dasharray: 18 16;
}

.spoon-stage:not(.is-guide-visible) .path-guide__center {
  stroke: rgba(49, 139, 105, 0.18);
  stroke-width: 5;
  stroke-dasharray: 8 24;
}

.bowl-area,
.friend-area {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.bowl-area {
  left: 1.5%;
  top: 65%;
}

.bowl-steam {
  height: 20px;
  color: rgba(71, 126, 109, 0.5);
  font-size: 2rem;
  line-height: 0.5;
  animation: steam-float 2.4s ease-in-out infinite;
}

.bowl {
  font-size: clamp(3.4rem, 7vw, 5.8rem);
  line-height: 1;
}

.bowl-area small {
  padding: 4px 9px;
  border-radius: 10px;
  color: #48645b;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.8);
}

.friend-area {
  right: 1.5%;
  top: 16%;
}

.friend {
  font-size: clamp(5rem, 12vw, 9.5rem);
  line-height: 1;
}

.mouth-target {
  margin-top: -4px;
  padding: 7px 12px;
  border-radius: 14px;
  color: #785b24;
  font-size: clamp(0.72rem, 1.4vw, 0.9rem);
  font-weight: 800;
  background: rgba(255, 244, 203, 0.9);
}

.destination-glow {
  position: absolute;
  z-index: 2;
  width: 112px;
  height: 112px;
  border: 3px dashed rgba(232, 174, 65, 0.55);
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: target-breathe 2s ease-in-out infinite;
}

.spoon-touch-target {
  position: absolute;
  z-index: 5;
  display: grid;
  width: 124px;
  height: 124px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--ink);
  font: inherit;
  cursor: grab;
  touch-action: none;
  transform: translate(-50%, -50%);
  background: transparent;
  -webkit-tap-highlight-color: transparent;
}

.spoon-touch-target:disabled {
  cursor: default;
}

.spoon-touch-target:not(:disabled):focus-visible {
  outline: 4px solid #367fbd;
  outline-offset: 4px;
}

.spoon-touch-target.is-grabbed {
  cursor: grabbing;
}

.spoon-halo {
  position: absolute;
  inset: 7px;
  border: 3px solid rgba(77, 171, 137, 0.34);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 8px 22px rgba(49, 115, 91, 0.15);
  transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
}

.spoon-touch-target.is-stable .spoon-halo {
  border-color: rgba(48, 170, 120, 0.78);
  background: rgba(220, 255, 238, 0.7);
  box-shadow: 0 0 0 12px rgba(77, 203, 149, 0.12), 0 8px 24px rgba(47, 143, 107, 0.22);
}

.spoon-touch-target.is-warning .spoon-halo {
  border-color: rgba(224, 168, 73, 0.65);
  background: rgba(255, 246, 217, 0.74);
  animation: gentle-ripple 0.75s ease-out infinite;
}

.spoon-emoji {
  position: relative;
  z-index: 2;
  font-size: clamp(3.9rem, 7vw, 5.6rem);
  line-height: 1;
  transform: rotate(-10deg);
  filter: drop-shadow(0 5px 4px rgba(60, 78, 71, 0.18));
}

.spoon-food {
  position: absolute;
  z-index: 3;
  top: 28px;
  left: 20px;
  font-size: 1.45rem;
  transform: rotate(-10deg);
}

.grab-label {
  position: absolute;
  z-index: 4;
  right: 50%;
  bottom: -2px;
  min-width: max-content;
  padding: 5px 9px;
  border-radius: 10px;
  color: #3d6256;
  font-size: 0.72rem;
  font-weight: 800;
  transform: translateX(50%);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 10px rgba(43, 85, 69, 0.1);
}

.completion-celebration,
.pause-cover {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  backdrop-filter: blur(5px);
}

.completion-celebration {
  background: rgba(241, 255, 245, 0.9);
  animation: celebration-in 320ms ease-out both;
}

.completion-celebration > span {
  font-size: clamp(4rem, 10vw, 7rem);
  animation: star-float 1.8s ease-in-out infinite;
}

.completion-celebration strong {
  margin-top: 8px;
  color: #26795e;
  font-size: clamp(1.45rem, 3.6vw, 2.4rem);
}

.completion-celebration p {
  margin: 8px 18px 0;
  color: #557268;
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
}

.pause-cover {
  color: #4b665d;
  background: rgba(243, 248, 246, 0.82);
}

.pause-cover span {
  font-size: 3.5rem;
}

.pause-cover strong {
  margin-top: 8px;
  font-size: 1.35rem;
}

.game-footer {
  z-index: 2;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 14px;
}

.gentle-reminder {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 9px 14px;
  border-radius: 18px;
}

.gentle-reminder > span {
  flex: 0 0 auto;
  font-size: 1.55rem;
}

.gentle-reminder p {
  color: var(--muted);
  font-size: clamp(0.76rem, 1.35vw, 0.9rem);
  line-height: 1.35;
}

.gentle-reminder strong {
  color: var(--ink);
}

.teacher-hint-button {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 8px 16px;
  border-radius: 18px;
  color: #375b51;
  font: inherit;
  cursor: pointer;
}

.teacher-hint-button:not(:disabled):hover {
  border-color: rgba(64, 146, 113, 0.38);
  transform: translateY(-1px);
}

.teacher-hint-button:disabled {
  cursor: default;
  opacity: 0.58;
}

.teacher-hint-button > span:first-child {
  font-size: 1.65rem;
}

.teacher-hint-button > span:last-child {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.teacher-hint-button small {
  color: #71847e;
  font-size: 0.68rem;
}

.teacher-hint-button strong {
  font-size: 0.88rem;
}

@keyframes corridor-breathe {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 1; }
}

@keyframes target-breathe {
  0%, 100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.62; }
  50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
}

@keyframes gentle-ripple {
  0% { box-shadow: 0 0 0 0 rgba(227, 174, 84, 0.24); }
  100% { box-shadow: 0 0 0 16px rgba(227, 174, 84, 0); }
}

@keyframes steam-float {
  0%, 100% { transform: translateY(4px); opacity: 0.35; }
  50% { transform: translateY(-3px); opacity: 0.65; }
}

@keyframes celebration-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes star-float {
  0%, 100% { transform: translateY(2px) rotate(-4deg); }
  50% { transform: translateY(-7px) rotate(4deg); }
}

@media (max-width: 720px) {
  .steady-spoon-game {
    min-height: 610px;
    gap: 9px;
    padding: 10px;
  }

  .game-header {
    align-items: stretch;
    gap: 8px;
  }

  .title-block {
    flex: 1 1 auto;
    padding: 8px 11px;
  }

  .title-icon {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
    font-size: 1.65rem;
  }

  .eyebrow {
    display: none;
  }

  .progress-block {
    display: flex;
    min-width: 0;
    flex: 0 0 42%;
    flex-direction: column;
    justify-content: center;
    padding: 7px 9px;
  }

  .progress-dots {
    gap: 4px;
  }

  .status-card {
    width: 100%;
    padding: 8px 12px;
  }

  .spoon-stage {
    min-height: 360px;
    border-radius: 25px;
  }

  .bowl-area {
    left: -1%;
  }

  .friend-area {
    right: -2%;
  }

  .bowl-area small,
  .mouth-target {
    display: none;
  }

  .spoon-touch-target {
    width: 116px;
    height: 116px;
  }

  .destination-glow {
    width: 96px;
    height: 96px;
  }

  .game-footer {
    gap: 8px;
  }

  .gentle-reminder {
    padding: 8px 10px;
  }

  .gentle-reminder > span {
    display: none;
  }

  .teacher-hint-button {
    min-height: 54px;
    padding: 7px 11px;
  }
}

@media (max-width: 460px) {
  .steady-spoon-game {
    min-height: 650px;
  }

  .title-block h2 {
    font-size: 1.05rem;
  }

  .progress-block strong {
    font-size: 0.8rem;
  }

  .status-symbol {
    font-size: 1.35rem;
  }

  .status-card p {
    font-size: 0.73rem;
  }

  .spoon-stage {
    min-height: 385px;
  }

  .friend {
    font-size: 4.8rem;
  }

  .bowl {
    font-size: 3.5rem;
  }

  .gentle-reminder p {
    font-size: 0.69rem;
  }

  .teacher-hint-button > span:first-child {
    display: none;
  }

  .teacher-hint-button strong {
    font-size: 0.78rem;
  }
}

@media (max-height: 700px) and (min-width: 721px) {
  .steady-spoon-game {
    min-height: 500px;
    gap: 8px;
    padding-block: 10px;
  }

  .spoon-stage {
    min-height: 260px;
  }

  .title-icon {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }

  .game-footer {
    min-height: 52px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .steady-spoon-game *,
  .steady-spoon-game *::before,
  .steady-spoon-game *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
