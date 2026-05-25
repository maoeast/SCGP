<template>
  <div class="visual-tracker-container">
    <section v-if="!started && !gameEnded" class="tracker-intro">
      <div class="intro-orbit" aria-hidden="true">
        <span class="intro-star">★</span>
      </div>
      <p class="intro-kicker">视觉追踪训练</p>
      <h2>星光巡航</h2>
      <p class="intro-copy">
        按住星光附近，跟着它慢慢移动。系统会记录跟随时间、断开次数和最长连续跟随。
      </p>
      <div class="intro-rules">
        <span>大目标</span>
        <span>慢速轨迹</span>
        <span>低挫败反馈</span>
      </div>
      <button class="primary-action" type="button" @click="startGame">
        开始追星
      </button>
    </section>

    <section v-else-if="!gameEnded" class="tracker-play">
      <header class="tracker-hud">
        <div>
          <p class="hud-label">剩余时间</p>
          <strong>{{ timeLeft }} 秒</strong>
        </div>
        <div>
          <p class="hud-label">跟随率</p>
          <strong>{{ Math.round(liveSummary.timeOnTargetPercent * 100) }}%</strong>
        </div>
        <div>
          <p class="hud-label">最长连续</p>
          <strong>{{ (liveSummary.longestStreakMs / 1000).toFixed(1) }} 秒</strong>
        </div>
      </header>

      <div
        ref="stageRef"
        class="tracking-stage"
        :class="{ 'is-following': currentSample?.onTarget, 'has-pointer': Boolean(pointerPoint) }"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
        @pointerleave="handlePointerLeave"
      >
        <div class="sky-layer">
          <span
            v-for="spark in sparks"
            :key="spark.id"
            class="spark"
            :style="{ left: `${spark.x}%`, top: `${spark.y}%`, animationDelay: `${spark.delay}s` }"
          />
        </div>

        <svg class="route-guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 12 50 C 24 15, 40 18, 50 50 S 76 86, 88 50" />
        </svg>

        <div
          class="target-halo"
          :style="targetStyle"
          aria-hidden="true"
        />
        <div
          class="target-star"
          :style="targetStyle"
          aria-label="追踪目标"
        >
          <span>★</span>
        </div>

        <div
          v-if="pointerPoint"
          class="follow-cursor"
          :class="{ 'is-locked': currentSample?.onTarget }"
          :style="pointerStyle"
          aria-hidden="true"
        />

        <div class="stage-instruction">
          {{ currentSample?.onTarget ? '保持住，跟得很稳' : '把手指放到星光旁边，慢慢跟随' }}
        </div>
      </div>
    </section>

    <section v-else class="tracker-result">
      <p class="result-kicker">训练完成</p>
      <h2>{{ resultTitle }}</h2>
      <div class="result-grid">
        <div>
          <span>跟随率</span>
          <strong>{{ Math.round(finalSummary.timeOnTargetPercent * 100) }}%</strong>
        </div>
        <div>
          <span>最长连续</span>
          <strong>{{ (finalSummary.longestStreakMs / 1000).toFixed(1) }} 秒</strong>
        </div>
        <div>
          <span>断开次数</span>
          <strong>{{ finalSummary.breakCount }}</strong>
        </div>
        <div>
          <span>稳定度</span>
          <strong>{{ finalSummary.followStability }}</strong>
        </div>
      </div>
      <p class="result-note">正在保存训练记录并生成报告...</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { TaskID, type GameSessionData } from '@/types/games'
import {
  createTrackingSample,
  resolveTrackingTarget,
  summarizeTrackingSamples,
  type NormalizedPoint,
  type TrackingSample,
  type TrackingSummary,
} from '@/utils/visual-tracking-engine'

interface Props {
  studentId: number
  taskId: TaskID
  duration?: number
  targetSize?: number
  targetSpeed?: number
  useEyeTracking?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 45,
  targetSize: 128,
  targetSpeed: 1.2,
  useEyeTracking: false,
})

const emit = defineEmits<{
  finish: [data: GameSessionData]
}>()

const sampleIntervalMs = 100
const stageRef = ref<HTMLElement | null>(null)
const started = ref(false)
const gameEnded = ref(false)
const startTime = ref(0)
const endTime = ref(0)
const timeLeft = ref(props.duration)
const targetPoint = ref<NormalizedPoint>({ x: 0.5, y: 0.5 })
const pointerPoint = ref<NormalizedPoint | null>(null)
const pointerActive = ref(false)
const inputMode = ref<'pointer' | 'touch' | 'mouse'>('pointer')
const samples = ref<TrackingSample[]>([])
const currentSample = ref<TrackingSample | null>(null)
const finalSummary = ref<TrackingSummary>({
  timeOnTarget: 0,
  totalTime: 0,
  timeOnTargetPercent: 0,
  breakCount: 0,
  longestStreakMs: 0,
  followStability: 0,
})

let animationFrameId: number | null = null
let lastSampleAt = 0

const sparks = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  y: 8 + ((index * 53) % 84),
  delay: (index % 6) * 0.35,
}))

const hitRadiusPx = computed(() => Math.max(96, props.targetSize * 0.82))
const durationMs = computed(() => Math.max(10, props.duration) * 1000)
const targetStyle = computed(() => ({
  left: `${targetPoint.value.x * 100}%`,
  top: `${targetPoint.value.y * 100}%`,
  width: `${props.targetSize}px`,
  height: `${props.targetSize}px`,
  '--target-size': `${props.targetSize}px`,
}))
const pointerStyle = computed(() => ({
  left: `${(pointerPoint.value?.x ?? 0) * 100}%`,
  top: `${(pointerPoint.value?.y ?? 0) * 100}%`,
  '--cursor-size': `${Math.max(150, props.targetSize * 1.34)}px`,
}))
const liveSummary = computed(() => summarizeTrackingSamples(samples.value, {
  sampleIntervalMs,
  hitRadiusPx: hitRadiusPx.value,
}))
const resultTitle = computed(() => {
  if (finalSummary.value.timeOnTargetPercent >= 0.8) return '追得很稳定'
  if (finalSummary.value.timeOnTargetPercent >= 0.55) return '已经能跟上星光'
  return '完成了本次练习'
})

function normalizePointer(event: PointerEvent): NormalizedPoint | null {
  const rect = stageRef.value?.getBoundingClientRect()
  if (!rect) return null

  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width))),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
  }
}

function getStageSize() {
  const rect = stageRef.value?.getBoundingClientRect()
  return {
    width: Math.max(1, rect?.width ?? 1),
    height: Math.max(1, rect?.height ?? 1),
  }
}

function handlePointerDown(event: PointerEvent) {
  pointerActive.value = true
  inputMode.value = event.pointerType === 'touch' ? 'touch' : event.pointerType === 'mouse' ? 'mouse' : 'pointer'
  stageRef.value?.setPointerCapture?.(event.pointerId)
  pointerPoint.value = normalizePointer(event)
}

function handlePointerMove(event: PointerEvent) {
  if (!pointerActive.value) return
  pointerPoint.value = normalizePointer(event)
}

function handlePointerUp(event: PointerEvent) {
  pointerActive.value = false
  stageRef.value?.releasePointerCapture?.(event.pointerId)
}

function handlePointerLeave() {
  if (!pointerActive.value) {
    pointerPoint.value = null
  }
}

function loop(now: number) {
  if (!started.value || gameEnded.value) return

  const elapsedMs = now - startTime.value
  targetPoint.value = resolveTrackingTarget({
    elapsedMs,
    durationMs: durationMs.value,
    speed: props.targetSpeed,
    safePadding: 0.12,
  })
  timeLeft.value = Math.max(0, Math.ceil((durationMs.value - elapsedMs) / 1000))

  if (now - lastSampleAt >= sampleIntervalMs) {
    const sample = createTrackingSample({
      time: Math.round(elapsedMs),
      pointer: pointerPoint.value,
      target: targetPoint.value,
      stageSize: getStageSize(),
      hitRadiusPx: hitRadiusPx.value,
    })
    currentSample.value = sample
    samples.value.push(sample)
    if (samples.value.length > 1200) {
      samples.value = samples.value.slice(-1000)
    }
    lastSampleAt = now
  }

  if (elapsedMs >= durationMs.value) {
    finishGame()
    return
  }

  animationFrameId = requestAnimationFrame(loop)
}

function startGame() {
  started.value = true
  gameEnded.value = false
  samples.value = []
  currentSample.value = null
  pointerPoint.value = null
  pointerActive.value = false
  timeLeft.value = props.duration
  startTime.value = performance.now()
  lastSampleAt = startTime.value
  animationFrameId = requestAnimationFrame(loop)
}

function calculateFatigueIndex(allSamples: TrackingSample[]) {
  if (allSamples.length < 4) return 1
  const midpoint = Math.floor(allSamples.length / 2)
  const first = summarizeTrackingSamples(allSamples.slice(0, midpoint), {
    sampleIntervalMs,
    hitRadiusPx: hitRadiusPx.value,
  }).timeOnTargetPercent
  const second = summarizeTrackingSamples(allSamples.slice(midpoint), {
    sampleIntervalMs,
    hitRadiusPx: hitRadiusPx.value,
  }).timeOnTargetPercent

  return first > 0 ? Number((second / first).toFixed(2)) : 1
}

function buildSessionData(summary: TrackingSummary): GameSessionData {
  const actualDuration = Math.max(1, Math.round((endTime.value - startTime.value) / 1000))

  return {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: Date.now() - actualDuration * 1000,
    endTime: Date.now(),
    duration: actualDuration,
    trials: [],
    trackingData: {
      timeOnTarget: summary.timeOnTarget,
      totalTime: summary.totalTime,
      timeOnTargetPercent: summary.timeOnTargetPercent,
      samplePoints: samples.value,
    },
    totalTrials: samples.value.length,
    correctTrials: samples.value.filter((sample) => sample.onTarget).length,
    accuracy: summary.timeOnTargetPercent,
    avgResponseTime: 0,
    errors: {
      omission: summary.breakCount,
      commission: 0,
    },
    behavior: {
      impulsivityScore: Math.min(100, summary.breakCount * 12),
      fatigueIndex: calculateFatigueIndex(samples.value),
      distractorPattern: 'smooth_pursuit_pointer_follow',
    },
    trackingStats: {
      timeOnTargetPercent: summary.timeOnTargetPercent,
      useEyeTracking: false,
      followStability: summary.followStability,
      breakCount: summary.breakCount,
      longestStreakMs: summary.longestStreakMs,
      inputMode: inputMode.value,
    },
  }
}

function finishGame() {
  if (gameEnded.value) return

  gameEnded.value = true
  endTime.value = performance.now()
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  finalSummary.value = summarizeTrackingSamples(samples.value, {
    sampleIntervalMs,
    hitRadiusPx: hitRadiusPx.value,
  })

  emit('finish', buildSessionData(finalSummary.value))
}

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.visual-tracker-container {
  width: 100%;
  min-height: 100%;
  display: flex;
  color: #17324d;
}

.tracker-intro,
.tracker-result {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 520px;
  padding: 42px;
  overflow: hidden;
  border-radius: 30px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.92), transparent 30%),
    linear-gradient(135deg, #d7f4ff 0%, #f8ecd1 54%, #ffe3d8 100%);
}

.tracker-intro > *,
.tracker-result > * {
  position: relative;
  z-index: 2;
}

.intro-orbit {
  position: absolute;
  width: min(54vw, 460px);
  height: min(54vw, 460px);
  border: 2px dashed rgba(43, 104, 166, 0.22);
  border-radius: 999px;
  animation: orbit-spin 18s linear infinite;
}

.intro-star {
  position: absolute;
  top: -18px;
  left: 50%;
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  border-radius: 999px;
  color: #fff8c7;
  background: radial-gradient(circle, #fff48a 0%, #f59e0b 58%, #ef6f39 100%);
  box-shadow: 0 18px 45px rgba(239, 111, 57, 0.36);
  font-size: 42px;
}

@keyframes orbit-spin {
  to { transform: rotate(360deg); }
}

.intro-kicker,
.result-kicker {
  margin: 0;
  color: #2c6b7f;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.tracker-intro h2,
.tracker-result h2 {
  margin: 10px 0 12px;
  font-size: clamp(42px, 7vw, 82px);
  line-height: 1;
  color: #17324d;
}

.intro-copy {
  max-width: 720px;
  margin: 0 auto;
  font-size: clamp(18px, 2.4vw, 26px);
  line-height: 1.7;
  color: #31546f;
}

.intro-rules {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin: 28px 0;
}

.intro-rules span {
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #24536f;
  font-weight: 800;
}

.primary-action {
  min-width: 220px;
  padding: 18px 30px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #146c94, #ef7b45);
  box-shadow: 0 20px 38px rgba(20, 108, 148, 0.28);
  font-size: 22px;
  font-weight: 900;
  cursor: pointer;
}

.tracker-play {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  gap: 16px;
}

.tracker-hud {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tracker-hud > div {
  padding: 16px 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 30px rgba(23, 50, 77, 0.1);
}

.hud-label {
  margin: 0 0 4px;
  color: #62788d;
  font-size: 13px;
  font-weight: 800;
}

.tracker-hud strong {
  font-size: clamp(24px, 3.2vw, 40px);
  color: #17324d;
}

.tracking-stage {
  position: relative;
  flex: 1;
  min-height: 520px;
  overflow: hidden;
  border-radius: 34px;
  touch-action: none;
  cursor: pointer;
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 250, 214, 0.52), transparent 26%),
    radial-gradient(circle at 80% 12%, rgba(114, 209, 255, 0.28), transparent 28%),
    linear-gradient(160deg, #12355b 0%, #16577a 45%, #f1b05c 130%);
  box-shadow: inset 0 0 80px rgba(7, 31, 54, 0.34), 0 24px 50px rgba(18, 53, 91, 0.2);
}

.tracking-stage.is-following {
  box-shadow: inset 0 0 80px rgba(255, 236, 153, 0.26), 0 24px 50px rgba(18, 53, 91, 0.2);
}

.sky-layer,
.route-guide {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.spark {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  animation: sparkle 2.4s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 0.22; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.7); }
}

.route-guide path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.26);
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-dasharray: 3 4;
}

.target-halo,
.target-star,
.follow-cursor {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.target-halo {
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 247, 176, 0.5), rgba(255, 247, 176, 0.08) 60%, transparent 70%);
  animation: halo-breathe 1.8s ease-in-out infinite;
}

@keyframes halo-breathe {
  50% { transform: translate(-50%, -50%) scale(1.18); }
}

.target-star {
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #fff5a8;
  background:
    radial-gradient(circle at 35% 28%, #fff8c7 0 14%, transparent 15%),
    radial-gradient(circle, #ffd84d 0%, #f59e0b 58%, #ef6f39 100%);
  box-shadow: 0 0 32px rgba(255, 216, 77, 0.66), 0 18px 40px rgba(239, 111, 57, 0.34);
  font-size: calc(var(--target-size) * 0.5);
}

.target-star span {
  filter: drop-shadow(0 2px 4px rgba(110, 63, 10, 0.35));
}

.follow-cursor {
  width: var(--cursor-size);
  height: var(--cursor-size);
  border: 6px solid rgba(140, 255, 202, 0.86);
  border-radius: 999px;
  background: rgba(140, 255, 202, 0.08);
  box-shadow: 0 0 24px rgba(140, 255, 202, 0.34), inset 0 0 24px rgba(140, 255, 202, 0.12);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.follow-cursor::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: inherit;
  border: 2px solid rgba(140, 255, 202, 0.32);
  opacity: 0;
  transform: scale(0.92);
}

.follow-cursor.is-locked {
  border-color: #8cffca;
  background: rgba(140, 255, 202, 0.18);
  box-shadow:
    0 0 34px rgba(140, 255, 202, 0.88),
    0 0 72px rgba(140, 255, 202, 0.42),
    inset 0 0 28px rgba(140, 255, 202, 0.18);
  animation: cursor-lock-breathe 1.25s ease-in-out infinite;
}

.follow-cursor.is-locked::after {
  opacity: 1;
  animation: cursor-lock-ripple 1.25s ease-out infinite;
}

@keyframes cursor-lock-breathe {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    filter: brightness(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.06);
    filter: brightness(1.22);
  }
}

@keyframes cursor-lock-ripple {
  0% {
    transform: scale(0.92);
    opacity: 0.68;
  }
  100% {
    transform: scale(1.16);
    opacity: 0;
  }
}

.stage-instruction {
  position: absolute;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  max-width: min(720px, calc(100% - 32px));
  padding: 12px 18px;
  border-radius: 999px;
  color: #17324d;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 28px rgba(16, 47, 76, 0.16);
  font-size: 18px;
  font-weight: 900;
  text-align: center;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  width: min(860px, 100%);
  gap: 14px;
  margin: 24px auto;
}

.result-grid div {
  padding: 22px 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 30px rgba(23, 50, 77, 0.1);
}

.result-grid span {
  display: block;
  margin-bottom: 8px;
  color: #62788d;
  font-size: 14px;
  font-weight: 800;
}

.result-grid strong {
  color: #17324d;
  font-size: 34px;
}

.result-note {
  margin: 0;
  color: #31546f;
  font-size: 18px;
  font-weight: 800;
}

@media (max-width: 760px) {
  .tracker-hud,
  .result-grid {
    grid-template-columns: 1fr;
  }

  .tracking-stage {
    min-height: 480px;
  }
}
</style>
