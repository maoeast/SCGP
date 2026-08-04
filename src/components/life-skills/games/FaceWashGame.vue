<template>
  <div class="fw-game" :class="{ 'fw-game--paused': props.paused, 'fw-game--complete': gameCompleted }">
    <!-- 顶栏：区域进度段落条 -->
    <header class="fw-topbar">
      <div class="fw-topbar__info">
        <span class="fw-topbar__icon" aria-hidden="true">🧴</span>
        <div class="fw-topbar__text">
          <strong>{{ topbarLabel }}</strong>
          <small>第 {{ zoneIndex + 1 }} / {{ zones.length }} 个区域</small>
        </div>
      </div>
      <div class="fw-topbar__segments" aria-label="洗脸进度">
        <span
          v-for="(zone, idx) in zones"
          :key="zone.id"
          class="fw-topbar__seg"
          :class="{ 'is-done': idx < zoneIndex, 'is-current': idx === zoneIndex }"
        />
      </div>
    </header>

    <!-- 主场景 -->
    <section class="fw-scene">
      <!-- 场景背景图 -->
      <img
        class="fw-scene__bg"
        :src="L11_SCENE_URL"
        alt=""
        draggable="false"
        aria-hidden="true"
      />

      <!-- 进度图 crossfade 切换 -->
      <div class="fw-scene__progress-wrap">
        <Transition name="fw-crossfade" mode="out-in">
          <img
            :key="currentProgressKey"
            class="fw-scene__progress-img"
            :src="FACE_WASH_PROGRESS_IMAGES[currentProgressKey]"
            alt="洗脸进度"
            draggable="false"
          />
        </Transition>

        <!-- 示范阶段：目标区域脉冲指示 -->
        <Transition name="fw-indicator-fade">
          <div
            v-if="phase === 'demo' && currentZone"
            class="fw-scene__zone-indicator fw-scene__zone-indicator--demo"
            :style="zoneIndicatorStyle"
            aria-hidden="true"
          >
            <span class="fw-scene__zone-ring" />
            <span class="fw-scene__zone-label">{{ currentZone.label }}</span>
          </div>
        </Transition>

        <!-- 操作阶段：当前区域指示 -->
        <Transition name="fw-indicator-fade">
          <div
            v-if="phase === 'awaiting' && currentZone"
            class="fw-scene__zone-indicator fw-scene__zone-indicator--active"
            :style="zoneIndicatorStyle"
            aria-hidden="true"
          >
            <span class="fw-scene__zone-ring" />
            <span class="fw-scene__zone-label">{{ currentZone.label }}</span>
            <!-- 弧度进度环 -->
            <svg class="fw-scene__arc-progress" viewBox="0 0 100 100">
              <circle
                class="fw-scene__arc-track"
                cx="50" cy="50" r="44"
              />
              <circle
                class="fw-scene__arc-fill"
                cx="50" cy="50" r="44"
                :stroke-dasharray="arcCircumference"
                :stroke-dashoffset="arcDashOffset"
              />
            </svg>
          </div>
        </Transition>

        <!-- 透明手势层 -->
        <div
          ref="gestureLayerRef"
          class="fw-scene__gesture-layer"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        />
      </div>

      <!-- 示范文字 -->
      <div v-if="phase === 'demo'" class="fw-demo-overlay" aria-live="polite">
        <span class="fw-demo-overlay__icon">👀</span>
        <span class="fw-demo-overlay__text">看，在{{ currentZone?.label ?? '这里' }}画圈圈</span>
      </div>

      <!-- 反馈文字 -->
      <Transition name="fw-feedback-fade">
        <div
          v-if="feedbackText"
          class="fw-feedback"
          :class="`fw-feedback--${feedbackTone}`"
          role="status"
          aria-live="polite"
        >
          {{ feedbackText }}
        </div>
      </Transition>
    </section>

    <!-- 指令文字 -->
    <div class="fw-instruction" aria-live="polite">
      <p>{{ currentInstruction }}</p>
    </div>

    <!-- 底部操作栏 -->
    <footer class="fw-footer">
      <template v-if="phase === 'ready'">
        <button
          type="button"
          class="fw-btn fw-btn--primary fw-btn--lg"
          @click="startGame"
        >
          <span aria-hidden="true">🧴</span> 开始洗脸
        </button>
      </template>

      <template v-else-if="phase !== 'celebrating'">
        <button
          type="button"
          class="fw-btn fw-btn--secondary"
          :disabled="props.paused"
          @click="replayDemo"
        >
          再看示范
        </button>
        <button
          type="button"
          class="fw-btn fw-btn--ghost"
          :disabled="props.paused"
          @click="resetRound"
        >
          重新开始
        </button>
      </template>
    </footer>

    <!-- 完成庆祝 -->
    <Transition name="fw-celebrate">
      <div v-if="phase === 'celebrating'" class="fw-celebrate" role="status" aria-live="polite">
        <div class="fw-celebrate__card">
          <div class="fw-celebrate__icon" aria-hidden="true">✨</div>
          <strong>小脸洗得真干净！</strong>
          <p>每个地方都洗到啦。</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
} from '@/types/emotional/games'
import {
  FACE_WASH_DIFFICULTIES,
  FACE_WASH_PROGRESS_IMAGES,
  L11_SCENE_URL,
  getFaceWashZones,
  isZoneCleaned,
  averageNonNegative,
  ratio,
  type FaceWashProgressKey,
  type FaceZone,
} from '@/features/life-skills/l11-l15-core'

type Phase = 'ready' | 'demo' | 'awaiting' | 'celebrating' | 'finished'
type FeedbackTone = 'success' | 'warning' | 'info'

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

// --- 状态 ---
const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const zoneIndex = ref(0)
const arcDegrees = ref(0)
const feedbackText = ref('')
const feedbackTone = ref<FeedbackTone>('info')
const gameCompleted = ref(false)
const replayCount = ref(0)

// 数据记录
const arcTimesMs = ref<number[]>([])
const zonesCleaned = ref(0)

// 内部定时器与状态
let roundStartedAt = 0
let arcStartedAt = 0
let demoTimer: number | null = null
let feedbackTimer: number | null = null
let unmounted = false

// Pointer tracking for circular gesture
let activePointerId: number | null = null
let lastAngle: number | null = null
const gestureLayerRef = ref<HTMLElement | null>(null)

// --- 计算属性 ---
const config = computed(() => FACE_WASH_DIFFICULTIES[activeDifficulty.value])
const zones = computed<FaceZone[]>(() => getFaceWashZones(activeDifficulty.value))

const currentZone = computed<FaceZone | null>(() => {
  if (phase.value === 'ready' || phase.value === 'celebrating' || phase.value === 'finished') return null
  return zones.value[zoneIndex.value] ?? null
})

const currentProgressKey = computed<FaceWashProgressKey>(() => {
  const done = zoneIndex.value
  if (done <= 0) return 'dirty'
  if (done === 1) return 'forehead-clean'
  if (done < zones.value.length) return 'cheeks-clean'
  return 'all-clean'
})

const topbarLabel = computed(() => {
  if (phase.value === 'ready') return '准备好了吗？'
  if (phase.value === 'celebrating' || phase.value === 'finished') return '洗脸完成！'
  return `洗${currentZone.value?.label ?? '脸'}`
})

const currentInstruction = computed(() => {
  if (phase.value === 'ready') return '准备好了就点「开始洗脸」。'
  if (phase.value === 'demo') return `看，在${currentZone.value?.label ?? '这里'}画圈圈洗一洗。`
  if (phase.value === 'awaiting') return `用手指在${currentZone.value?.label ?? '这里'}画圈圈，把它洗干净。`
  if (phase.value === 'celebrating' || phase.value === 'finished') return '小脸洗得干干净净啦！'
  return ''
})

// 弧度进度环计算
const arcCircumference = Math.PI * 2 * 44 // 圆弧半径 44
const arcDashOffset = computed(() => {
  const minDeg = config.value.minArcDegrees
  const progress = Math.min(arcDegrees.value / minDeg, 1)
  return arcCircumference * (1 - progress)
})

// 区域指示器定位
const zoneIndicatorStyle = computed(() => {
  const zone = currentZone.value
  if (!zone) return {}
  const size = config.value.zoneRadiusRatio * 2 * 100
  return {
    left: `${zone.cx * 100}%`,
    top: `${zone.cy * 100}%`,
    width: `${size}%`,
    height: `${size}%`,
  }
})

// --- ZONE_CUES 区域语音提示 ---
const ZONE_CUES: Record<string, { demo: string; success: string }> = {
  forehead: { demo: '看，先洗额头，画个圈圈。', success: '额头洗干净啦！' },
  'left-cheek': { demo: '看，洗左边脸蛋，画个圈圈。', success: '左脸洗好啦！' },
  'right-cheek': { demo: '看，洗右边脸蛋，画个圈圈。', success: '右脸也洗好啦！' },
  nose: { demo: '看，洗小鼻子，轻轻搓一搓。', success: '小鼻子干干净净！' },
  chin: { demo: '看，洗下巴，画个圈圈。', success: '下巴也干净啦！' },
}

// --- Demo 示范阶段 ---
function enterDemo() {
  phase.value = 'demo'
  arcDegrees.value = 0
  clearFeedback()

  const zone = currentZone.value
  const cue = zone ? ZONE_CUES[zone.id]?.demo : null
  if (cue) speakSafely(cue)

  const demoMs = activeDifficulty.value === 1 ? 2400 : activeDifficulty.value === 2 ? 2200 : 2000
  demoTimer = window.setTimeout(() => {
    if (unmounted || phase.value !== 'demo') return
    phase.value = 'awaiting'
    arcStartedAt = Date.now()
  }, demoMs)
}

// --- 圆弧手势追踪 ---
function onPointerDown(event: PointerEvent) {
  if (phase.value !== 'awaiting' || props.paused || activePointerId !== null) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  event.preventDefault()
  activePointerId = event.pointerId
  lastAngle = null
  startSessionIfNeeded()

  const el = event.currentTarget as HTMLElement
  try {
    el.setPointerCapture(event.pointerId)
  } catch {
    // setPointerCapture may fail in edge cases
  }
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerId !== activePointerId || phase.value !== 'awaiting' || props.paused) return
  event.preventDefault()

  const zone = currentZone.value
  if (!zone) return

  const el = gestureLayerRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  // 区域中心相对于手势层的像素坐标
  const centerX = rect.left + zone.cx * rect.width
  const centerY = rect.top + zone.cy * rect.height

  // 当前指针相对于区域中心的角度
  const dx = event.clientX - centerX
  const dy = event.clientY - centerY
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) // -180 to 180

  if (lastAngle !== null) {
    let delta = angle - lastAngle
    // 处理 -180/180 跨越
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360

    // 累加绝对值（无论顺/逆时针都算进度）
    arcDegrees.value += Math.abs(delta)

    // 检查是否达标
    if (isZoneCleaned(arcDegrees.value, activeDifficulty.value)) {
      onZoneCleaned()
    }
  }

  lastAngle = angle
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerId !== activePointerId) return
  releasePointer()
}

function onPointerCancel(event: PointerEvent) {
  if (event.pointerId !== activePointerId) return
  releasePointer()
}

function releasePointer() {
  activePointerId = null
  lastAngle = null
}

// --- 区域洗净 ---
function onZoneCleaned() {
  releasePointer()

  // 记录用时
  if (arcStartedAt > 0) {
    arcTimesMs.value.push(Date.now() - arcStartedAt)
  }
  zonesCleaned.value++

  const zone = currentZone.value
  const successCue = zone ? (ZONE_CUES[zone.id]?.success ?? '洗好啦！') : '洗好啦！'
  showFeedback(successCue, 'success')
  playAudioSafe(() => props.audio.playSuccessCue())
  speakSafely(successCue)

  zoneIndex.value++
  arcDegrees.value = 0

  if (zoneIndex.value >= zones.value.length) {
    finishRound()
  } else {
    // 下一区域：短暂延迟后进入 demo
    demoTimer = window.setTimeout(() => {
      if (unmounted) return
      enterDemo()
    }, 900)
  }
}

// --- 完成 ---
function finishRound() {
  phase.value = 'celebrating'
  gameCompleted.value = true
  try { props.audio.stopAmbient() } catch { /* */ }
  playAudioSafe(() => props.audio.playSuccessCue())
  speakSafely('小脸洗得干干净净，真棒！')

  demoTimer = window.setTimeout(() => {
    if (unmounted) return
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 1500)
}

// --- 控制 ---
function startGame() {
  startSessionIfNeeded()
  activeDifficulty.value = props.difficulty
  zoneIndex.value = 0
  arcDegrees.value = 0
  replayCount.value = 0
  arcTimesMs.value = []
  zonesCleaned.value = 0
  gameCompleted.value = false
  enterDemo()
  playAudioSafe(async () => {
    await props.audio.ensureReady()
    await props.audio.startAmbient()
  })
}

function replayDemo() {
  if (phase.value !== 'awaiting') return
  replayCount.value++
  arcDegrees.value = 0
  enterDemo()
}

function resetRound() {
  releasePointer()
  if (demoTimer !== null) window.clearTimeout(demoTimer)
  phase.value = 'ready'
  zoneIndex.value = 0
  arcDegrees.value = 0
  gameCompleted.value = false
  zonesCleaned.value = 0
  arcTimesMs.value = []
  try { props.audio.stopAmbient() } catch { /* */ }
}

// --- 工具 ---
function startSessionIfNeeded() {
  if (roundStartedAt === 0) {
    roundStartedAt = Date.now()
    props.markRoundDirty?.()
  }
}

function showFeedback(text: string, tone: FeedbackTone) {
  feedbackText.value = text
  feedbackTone.value = tone
  if (feedbackTimer !== null) window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => {
    feedbackText.value = ''
  }, 2500)
}

function clearFeedback() {
  feedbackText.value = ''
  if (feedbackTimer !== null) {
    window.clearTimeout(feedbackTimer)
    feedbackTimer = null
  }
}

function speakSafely(text: string) {
  try { props.audio.speak(text) } catch { /* audio is supportive */ }
}

function playAudioSafe(action: () => Promise<void> | void) {
  try { void Promise.resolve(action()).catch(() => undefined) } catch { /* */ }
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const totalDurationSeconds = roundStartedAt > 0
    ? Number(((Date.now() - roundStartedAt) / 1000).toFixed(1))
    : 0

  return {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'watch-do-feedback',
      target_zones: config.value.targetZones,
      zones_cleaned: zonesCleaned.value,
      average_arc_ms: averageNonNegative(arcTimesMs.value),
      arc_times_ms: [...arcTimesMs.value],
      total_duration_seconds: totalDurationSeconds,
      replay_count: replayCount.value,
      difficulty_level: activeDifficulty.value,
      is_auto_completed: false,
    },
  }
}

// --- 生命周期 ---
watch(
  () => props.difficulty,
  (d) => { if (phase.value === 'ready') activeDifficulty.value = d },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (isPaused) {
      releasePointer()
      try { props.audio.stopAmbient() } catch { /* */ }
    }
  },
)

onBeforeUnmount(() => {
  unmounted = true
  releasePointer()
  if (demoTimer !== null) window.clearTimeout(demoTimer)
  if (feedbackTimer !== null) window.clearTimeout(feedbackTimer)
  try { props.audio.stopAll() } catch { /* */ }
})
</script>

<style scoped>
/* === 根容器 === */
.fw-game {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  gap: clamp(10px, 2vw, 16px);
  padding: clamp(12px, 2vw, 20px);
  overflow: hidden;
  color: #213547;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  background: linear-gradient(155deg, #e8f5e9 0%, #fff8e1 55%, #e8f5e9 100%);
  user-select: none;
}

.fw-game--paused {
  filter: grayscale(0.4) brightness(0.95);
  pointer-events: none;
}

.fw-game--complete {
  animation: fw-complete-glow 0.6s ease;
}

@keyframes fw-complete-glow {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.08); }
  100% { filter: brightness(1); }
}

/* === 顶栏 === */
.fw-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(22, 42, 72, 0.08);
}

.fw-topbar__info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fw-topbar__icon {
  font-size: 1.8rem;
  line-height: 1;
}

.fw-topbar__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fw-topbar__text strong {
  font-size: 1.1rem;
  color: #1a3a5c;
}

.fw-topbar__text small {
  font-size: 0.82rem;
  color: rgba(33, 53, 71, 0.6);
}

.fw-topbar__segments {
  display: flex;
  gap: 6px;
  flex: 1;
}

.fw-topbar__seg {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.12);
  transition: background 0.25s ease;
}

.fw-topbar__seg.is-done {
  background: #66bb6a;
}

.fw-topbar__seg.is-current {
  background: linear-gradient(90deg, #66bb6a, #ff9800);
  animation: fw-seg-pulse 1.4s ease-in-out infinite;
}

@keyframes fw-seg-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

/* === 场景区 === */
.fw-scene {
  position: relative;
  flex: 1;
  min-height: 0;
  border-radius: 28px;
  overflow: hidden;
  background: #fdf6e3;
}

.fw-scene__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.85;
}

/* 进度图容器 */
.fw-scene__progress-wrap {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

.fw-scene__progress-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 6px 16px rgba(22, 42, 72, 0.18));
}

/* crossfade transition */
.fw-crossfade-enter-active,
.fw-crossfade-leave-active {
  transition: opacity 0.28s ease;
}

.fw-crossfade-enter-from,
.fw-crossfade-leave-to {
  opacity: 0;
}

/* 区域指示器 */
.fw-scene__zone-indicator {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.fw-scene__zone-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 4px solid;
  pointer-events: none;
}

.fw-scene__zone-indicator--demo .fw-scene__zone-ring {
  border-color: #42a5f5;
  animation: fw-ring-pulse-demo 1.2s ease-in-out infinite;
}

.fw-scene__zone-indicator--active .fw-scene__zone-ring {
  border-color: #ff9800;
  animation: fw-ring-pulse-active 0.8s ease-in-out infinite;
}

@keyframes fw-ring-pulse-demo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(66, 165, 245, 0.5); transform: scale(1); }
  50% { box-shadow: 0 0 0 16px rgba(66, 165, 245, 0); transform: scale(1.08); }
}

@keyframes fw-ring-pulse-active {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.5); }
  50% { box-shadow: 0 0 0 12px rgba(255, 152, 0, 0); }
}

.fw-scene__zone-label {
  position: absolute;
  bottom: 100%;
  margin-bottom: 8px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.88);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}

/* 弧度进度环（SVG） */
.fw-scene__arc-progress {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.fw-scene__arc-track {
  fill: none;
  stroke: rgba(33, 53, 71, 0.15);
  stroke-width: 4;
}

.fw-scene__arc-fill {
  fill: none;
  stroke: #66bb6a;
  stroke-width: 6;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.12s linear;
}

.fw-indicator-fade-enter-active,
.fw-indicator-fade-leave-active {
  transition: opacity 0.25s ease;
}

.fw-indicator-fade-enter-from,
.fw-indicator-fade-leave-to {
  opacity: 0;
}

/* 手势层 */
.fw-scene__gesture-layer {
  position: absolute;
  inset: 0;
  z-index: 30;
  touch-action: none;
}

/* Demo 示范 */
.fw-demo-overlay {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 26px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.88);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  pointer-events: none;
}

.fw-demo-overlay__icon {
  font-size: 1.6rem;
}

.fw-demo-overlay__text {
  font-size: 1.05rem;
  line-height: 1.3;
}

/* 反馈文字 */
.fw-feedback {
  position: absolute;
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 1.05rem;
  font-weight: 700;
  text-align: center;
  pointer-events: none;
  white-space: nowrap;
}

.fw-feedback--success {
  background: rgba(76, 175, 80, 0.92);
  color: #fff;
}

.fw-feedback--warning {
  background: rgba(255, 152, 0, 0.92);
  color: #fff;
}

.fw-feedback--info {
  background: rgba(33, 150, 243, 0.92);
  color: #fff;
}

.fw-feedback-fade-enter-active,
.fw-feedback-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fw-feedback-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.fw-feedback-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

/* === 指令文字 === */
.fw-instruction {
  text-align: center;
  font-size: 1.05rem;
  font-weight: 600;
  color: #1a3a5c;
  padding: 0 8px;
}

.fw-instruction p {
  margin: 0;
}

/* === 底部操作栏 === */
.fw-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-top: 4px;
}

.fw-btn {
  border: 0;
  border-radius: 999px;
  padding: 12px 22px;
  font: inherit;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.fw-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(33, 53, 71, 0.12);
}

.fw-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.fw-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
  box-shadow: 0 8px 24px rgba(67, 160, 71, 0.3);
}

.fw-btn--lg {
  padding: 16px 36px;
  font-size: 1.15rem;
}

.fw-btn--secondary {
  color: #1f3d5c;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(33, 53, 71, 0.08);
}

.fw-btn--ghost {
  color: #5f6f82;
  background: rgba(255, 255, 255, 0.6);
}

/* === 庆祝 === */
.fw-celebrate {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(22, 42, 72, 0.4);
  backdrop-filter: blur(4px);
}

.fw-celebrate__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 40px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(22, 42, 72, 0.3);
  text-align: center;
}

.fw-celebrate__icon {
  font-size: 3.5rem;
  animation: fw-bounce 0.8s ease;
}

.fw-celebrate__card strong {
  font-size: 1.5rem;
  color: #1a3a5c;
}

.fw-celebrate__card p {
  margin: 0;
  color: rgba(33, 53, 71, 0.7);
}

@keyframes fw-bounce {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.fw-celebrate-enter-active,
.fw-celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.fw-celebrate-enter-from,
.fw-celebrate-leave-to {
  opacity: 0;
}

/* === 响应式 === */
@media (max-width: 720px) {
  .fw-game {
    padding: 10px;
  }

  .fw-topbar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 12px;
  }

  .fw-topbar__segments {
    width: 100%;
    order: 3;
  }

  .fw-feedback {
    font-size: 0.92rem;
    padding: 8px 16px;
  }

  .fw-btn {
    padding: 10px 18px;
    font-size: 0.95rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
</style>
