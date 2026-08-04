<template>
  <div class="pw-game" :class="{ 'pw-game--paused': props.paused, 'pw-game--complete': gameCompleted }">
    <!-- 顶栏：杯数进度段落条 -->
    <header class="pw-topbar">
      <div class="pw-topbar__info">
        <span class="pw-topbar__icon" aria-hidden="true">🚰</span>
        <div class="pw-topbar__text">
          <strong>{{ topbarLabel }}</strong>
          <small>第 {{ currentCup + 1 }} / {{ config.targetCups }} 杯</small>
        </div>
      </div>
      <div class="pw-topbar__segments" aria-label="杯数进度">
        <span
          v-for="(_, idx) in config.targetCups"
          :key="idx"
          class="pw-topbar__seg"
          :class="{ 'is-done': idx < currentCup, 'is-current': idx === currentCup }"
        />
      </div>
    </header>

    <!-- 主场景 -->
    <section class="pw-scene">
      <!-- 场景背景图 -->
      <img
        class="pw-scene__bg"
        :src="L12_SCENE_URL"
        alt=""
        draggable="false"
        aria-hidden="true"
      />

      <!-- 杯子（CSS 程序化水位） -->
      <div class="pw-scene__cup-wrap">
        <div class="pw-cup" :class="{ 'pw-cup--full': fillLevel >= 1 }">
          <!-- 水位层：高度 = fillLevel × 内杯高 -->
          <div class="pw-cup__water" :style="{ height: `${fillLevel * 100}%` }">
            <span class="pw-cup__wave pw-cup__wave--back" />
            <span class="pw-cup__wave pw-cup__wave--front" />
          </div>
          <!-- 杯壁高光 -->
          <span class="pw-cup__shine" aria-hidden="true" />
        </div>

        <!-- 标线提示 -->
        <div
          v-if="!config.hideMarkLine && phase !== 'ready'"
          class="pw-scene__mark"
          aria-hidden="true"
        >
          <span class="pw-scene__mark-line" />
          <span class="pw-scene__mark-label">目标</span>
        </div>
      </div>

      <!-- 倒水按钮 -->
      <div v-if="phase === 'awaiting'" class="pw-pour-area">
        <button
          type="button"
          class="pw-pour-btn"
          :class="{ 'pw-pour-btn--active': pouring }"
          :disabled="props.paused"
          :aria-label="`长按倒水：第 ${currentCup + 1} 杯`"
          @pointerdown="onPourStart"
          @pointerup="onPourEnd"
          @pointercancel="onPourEnd"
          @pointerleave="onPourEnd"
        >
          <span class="pw-pour-btn__icon" aria-hidden="true">💧</span>
          <span class="pw-pour-btn__label">{{ pouring ? '正在倒...' : '按住倒水' }}</span>
        </button>
      </div>

      <!-- 示范提示 -->
      <div v-if="phase === 'demo'" class="pw-demo-overlay" aria-live="polite">
        <span class="pw-demo-overlay__icon">👀</span>
        <span class="pw-demo-overlay__text">看，把水慢慢倒到标线就停</span>
      </div>

      <!-- 反馈文字 -->
      <Transition name="pw-feedback-fade">
        <div
          v-if="feedbackText"
          class="pw-feedback"
          :class="`pw-feedback--${feedbackTone}`"
          role="status"
          aria-live="polite"
        >
          {{ feedbackText }}
        </div>
      </Transition>
    </section>

    <!-- 底部操作栏 -->
    <footer class="pw-footer">
      <template v-if="phase === 'ready'">
        <button
          type="button"
          class="pw-btn pw-btn--primary pw-btn--lg"
          @click="startGame"
        >
          <span aria-hidden="true">💧</span> 开始倒水
        </button>
      </template>

      <template v-else-if="phase !== 'celebrating'">
        <button
          type="button"
          class="pw-btn pw-btn--secondary"
          :disabled="props.paused || pouring"
          @click="replayDemo"
        >
          再看示范
        </button>
        <button
          type="button"
          class="pw-btn pw-btn--ghost"
          :disabled="props.paused || pouring"
          @click="resetCurrentCup"
        >
          重新开始
        </button>
      </template>
    </footer>

    <!-- 完成庆祝 -->
    <Transition name="pw-celebrate">
      <div v-if="phase === 'celebrating'" class="pw-celebrate" role="status" aria-live="polite">
        <div class="pw-celebrate__card">
          <div class="pw-celebrate__icon" aria-hidden="true">🥤</div>
          <strong>每杯水都倒得刚刚好！</strong>
          <p>你是倒水小帮手。</p>
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
  POUR_WATER_DIFFICULTIES,
  L12_SCENE_URL,
  checkFillResult,
  ratio,
  averageNonNegative,
  type FillResult,
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
const currentCup = ref(0)
const fillLevel = ref(0)
const pouring = ref(false)
const feedbackText = ref('')
const feedbackTone = ref<FeedbackTone>('info')
const gameCompleted = ref(false)
const replayCount = ref(0)

// 数据记录
const cupFillTimes = ref<number[]>([])
const cupFillRatios = ref<number[]>([])
const overflowCount = ref(0)
const underfillCount = ref(0)

// 内部定时器与状态
let roundStartedAt = 0
let cupStartedAt = 0
let pourInterval: number | null = null
let demoTimer: number | null = null
let feedbackTimer: number | null = null
let capturedPointerId: number | null = null
let capturedElement: HTMLElement | null = null
let unmounted = false

const TARGET_FILL_RATIO = 0.75
const BASE_FLOW_RATE = 0.02 // fillLevel increment per 100ms at multiplier 1.0

// --- 计算属性 ---
const config = computed(() => POUR_WATER_DIFFICULTIES[activeDifficulty.value])

const topbarLabel = computed(() => {
  if (phase.value === 'ready') return '准备好了吗？'
  if (phase.value === 'celebrating' || phase.value === 'finished') return '倒水完成！'
  return `倒第 ${currentCup.value + 1} 杯水`
})

// --- Demo 示范阶段 ---
const DEMO_STEP_MS = 1200
const DEMO_STEP_VALUES: number[] = [0, 0.15, 0.45, 0.75]

function enterDemo() {
  phase.value = 'demo'
  fillLevel.value = 0
  clearFeedback()

  const demoCue = currentCup.value === 0
    ? '看，把水慢慢倒到标线就停。'
    : `第 ${currentCup.value + 1} 杯，看好标线位置。`
  speakSafely(demoCue)

  let stepIndex = 0

  function advanceDemo() {
    if (unmounted || phase.value !== 'demo') return
    stepIndex++
    if (stepIndex < DEMO_STEP_VALUES.length) {
      fillLevel.value = DEMO_STEP_VALUES[stepIndex]!
      demoTimer = window.setTimeout(advanceDemo, DEMO_STEP_MS)
    } else {
      // Demo 结束：提示"停"
      speakSafely('停！')
      demoTimer = window.setTimeout(() => {
        if (unmounted || phase.value !== 'demo') return
        fillLevel.value = 0
        phase.value = 'awaiting'
        cupStartedAt = Date.now()
      }, 800)
    }
  }

  demoTimer = window.setTimeout(advanceDemo, DEMO_STEP_MS)
}

// --- 长按倒水 ---
function onPourStart(event: PointerEvent) {
  if (phase.value !== 'awaiting' || props.paused || pouring.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  event.preventDefault()
  const el = event.currentTarget as HTMLElement
  try {
    el.setPointerCapture(event.pointerId)
    capturedPointerId = event.pointerId
    capturedElement = el
  } catch {
    // setPointerCapture may fail in edge cases
  }

  pouring.value = true
  clearFeedback()
  startSessionIfNeeded()

  pourInterval = window.setInterval(() => {
    if (props.paused || !pouring.value) return
    const flowRate = BASE_FLOW_RATE * config.value.flowSpeedMultiplier
    fillLevel.value = Math.min(1.0, fillLevel.value + flowRate)

    // 如果满了显示提醒
    if (fillLevel.value >= 1.0) {
      showFeedback('水太多啦！', 'warning')
    }
  }, 100)
}

function onPourEnd(event: PointerEvent) {
  if (!pouring.value) return
  event.preventDefault()
  stopPouring()
  evaluateFill()
}

function stopPouring() {
  pouring.value = false
  if (pourInterval !== null) {
    window.clearInterval(pourInterval)
    pourInterval = null
  }
  releaseCapture()
}

function releaseCapture() {
  if (capturedElement && capturedPointerId !== null) {
    try {
      if (capturedElement.hasPointerCapture(capturedPointerId)) {
        capturedElement.releasePointerCapture(capturedPointerId)
      }
    } catch {
      // already released
    }
  }
  capturedPointerId = null
  capturedElement = null
}

// --- 判定 ---
function evaluateFill() {
  const result: FillResult = checkFillResult(
    fillLevel.value,
    TARGET_FILL_RATIO,
    config.value.fillToleranceRatio,
  )

  cupFillRatios.value.push(fillLevel.value)

  switch (result) {
    case 'exact':
      onFillExact()
      break
    case 'overflow':
      onFillOverflow()
      break
    case 'underfill':
      onFillUnderfill()
      break
  }
}

function onFillExact() {
  // 记录用时
  if (cupStartedAt > 0) {
    cupFillTimes.value.push(Date.now() - cupStartedAt)
  }

  showFeedback('倒得真好，刚刚好！', 'success')
  playAudioSafe(() => props.audio.playSuccessCue())

  const isLast = currentCup.value >= config.value.targetCups - 1
  speakSafely(isLast ? '最后一杯也倒好了，太棒了！' : '倒得真好，刚刚好！')

  currentCup.value++
  if (currentCup.value >= config.value.targetCups) {
    finishRound()
  } else {
    // 下一杯：短暂延迟后进入 demo
    demoTimer = window.setTimeout(() => {
      if (unmounted) return
      fillLevel.value = 0
      enterDemo()
    }, 1200)
  }
}

function onFillOverflow() {
  overflowCount.value++
  showFeedback('水太多啦，重新来！', 'warning')
  playAudioSafe(() => props.audio.playSoftBounce())
  speakSafely('水太多了，再试一次。')

  // 重置当前杯
  demoTimer = window.setTimeout(() => {
    if (unmounted) return
    fillLevel.value = 0
    cupFillRatios.value.pop() // 移除失败记录
  }, 1000)
}

function onFillUnderfill() {
  underfillCount.value++
  showFeedback('水太少了，再倒一点', 'info')
  speakSafely('水太少了，再倒一点。')
  // 继续当前杯，不重置 fillLevel
}

// --- 完成 ---
function finishRound() {
  phase.value = 'celebrating'
  gameCompleted.value = true
  try { props.audio.stopAmbient() } catch { /* */ }
  playAudioSafe(() => props.audio.playSuccessCue())
  speakSafely('每杯水都倒得刚刚好，你是倒水小帮手！')

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
  currentCup.value = 0
  fillLevel.value = 0
  replayCount.value = 0
  cupFillTimes.value = []
  cupFillRatios.value = []
  overflowCount.value = 0
  underfillCount.value = 0
  gameCompleted.value = false
  enterDemo()
  playAudioSafe(async () => {
    await props.audio.ensureReady()
    await props.audio.startAmbient()
  })
}

function replayDemo() {
  if (phase.value !== 'awaiting' || pouring.value) return
  replayCount.value++
  fillLevel.value = 0
  enterDemo()
}

function resetCurrentCup() {
  if (pouring.value) return
  fillLevel.value = 0
  clearFeedback()
  enterDemo()
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
  const exactCount = cupFillRatios.value.filter((fill) =>
    checkFillResult(fill, TARGET_FILL_RATIO, config.value.fillToleranceRatio) === 'exact',
  ).length
  const fillAccuracy = ratio(exactCount, config.value.targetCups)

  return {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'long-press-pour',
      target_cups: config.value.targetCups,
      filled_cups: currentCup.value,
      overflow_count: overflowCount.value,
      underfill_count: underfillCount.value,
      fill_accuracy_ratio: fillAccuracy,
      cup_fill_ratios: [...cupFillRatios.value],
      average_fill_time_ms: averageNonNegative(cupFillTimes.value),
      fill_times_ms: [...cupFillTimes.value],
      total_duration_seconds: totalDurationSeconds,
      replay_count: replayCount.value,
      difficulty_level: activeDifficulty.value,
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
      stopPouring()
      try { props.audio.stopAmbient() } catch { /* */ }
    }
  },
)

onBeforeUnmount(() => {
  unmounted = true
  stopPouring()
  if (demoTimer !== null) window.clearTimeout(demoTimer)
  if (feedbackTimer !== null) window.clearTimeout(feedbackTimer)
  try { props.audio.stopAll() } catch { /* */ }
})
</script>

<style scoped>
/* === 根容器 === */
.pw-game {
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
  background: linear-gradient(155deg, #e3f2fd 0%, #fff3e0 55%, #e3f2fd 100%);
  user-select: none;
}

.pw-game--paused {
  filter: grayscale(0.4) brightness(0.95);
  pointer-events: none;
}

.pw-game--complete {
  animation: pw-complete-glow 0.6s ease;
}

@keyframes pw-complete-glow {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.08); }
  100% { filter: brightness(1); }
}

/* === 顶栏 === */
.pw-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(22, 42, 72, 0.08);
}

.pw-topbar__info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pw-topbar__icon {
  font-size: 1.8rem;
  line-height: 1;
}

.pw-topbar__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pw-topbar__text strong {
  font-size: 1.1rem;
  color: #1a3a5c;
}

.pw-topbar__text small {
  font-size: 0.82rem;
  color: rgba(33, 53, 71, 0.6);
}

.pw-topbar__segments {
  display: flex;
  gap: 6px;
  flex: 1;
}

.pw-topbar__seg {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.12);
  transition: background 0.25s ease;
}

.pw-topbar__seg.is-done {
  background: #42a5f5;
}

.pw-topbar__seg.is-current {
  background: linear-gradient(90deg, #42a5f5, #ff9800);
  animation: pw-seg-pulse 1.4s ease-in-out infinite;
}

@keyframes pw-seg-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

/* === 场景区 === */
.pw-scene {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 28px;
  overflow: hidden;
  background: #fdf6e3;
}

.pw-scene__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.85;
}

/* 杯子（CSS 程序化） */
.pw-scene__cup-wrap {
  position: relative;
  z-index: 5;
  width: clamp(120px, 28vw, 220px);
  aspect-ratio: 3 / 4;
}

.pw-cup {
  position: absolute;
  inset: 0;
  border: 4px solid rgba(22, 42, 72, 0.55);
  border-top: 0;
  border-radius: 8px 8px 36px 36px / 8px 8px 48px 48px;
  background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%);
  overflow: hidden;
  box-shadow:
    inset 0 0 16px rgba(22, 42, 72, 0.08),
    0 8px 24px rgba(22, 42, 72, 0.18);
  filter: drop-shadow(0 6px 16px rgba(22, 42, 72, 0.18));
}

/* 水位：高度由 :style 绑定 fillLevel×100%，贴底 */
.pw-cup__water {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #4fc3f7 0%, #29b6f6 60%, #1e88e5 100%);
  transition: height 0.1s linear;
  overflow: hidden;
}

/* 水面波纹（两层错位动画，营造液面起伏） */
.pw-cup__wave {
  position: absolute;
  left: -25%;
  right: -25%;
  top: -8px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  animation: pw-wave 2.2s ease-in-out infinite;
}

.pw-cup__wave--front {
  top: -5px;
  height: 10px;
  background: rgba(255, 255, 255, 0.55);
  animation-duration: 1.6s;
  animation-direction: reverse;
}

@keyframes pw-wave {
  0%, 100% { transform: translateX(0) scaleY(1); }
  50% { transform: translateX(8%) scaleY(0.85); }
}

/* 杯壁高光 */
.pw-cup__shine {
  position: absolute;
  top: 8%;
  left: 12%;
  width: 10%;
  height: 60%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0));
  pointer-events: none;
}

.pw-cup--full {
  animation: pw-cup-overflow 0.5s ease-in-out infinite;
}

@keyframes pw-cup-overflow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}



/* 标线 */
.pw-scene__mark {
  position: absolute;
  left: 10%;
  right: 10%;
  top: 32%;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pw-scene__mark-line {
  flex: 1;
  height: 2px;
  background: #ef5350;
  border-radius: 1px;
}

.pw-scene__mark-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #ef5350;
  white-space: nowrap;
}

/* === 倒水按钮 === */
.pw-pour-area {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}

.pw-pour-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 140px;
  min-height: 140px;
  padding: 20px 28px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(145deg, #42a5f5 0%, #1e88e5 100%);
  color: #fff;
  font: inherit;
  font-weight: 800;
  font-size: 1.05rem;
  cursor: pointer;
  touch-action: none;
  box-shadow: 0 12px 36px rgba(30, 136, 229, 0.45);
  animation: pw-btn-breathe 2s ease-in-out infinite;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.pw-pour-btn:hover:not(:disabled) {
  transform: scale(1.04);
}

.pw-pour-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  animation: none;
}

.pw-pour-btn--active {
  background: linear-gradient(145deg, #ff9800 0%, #f57c00 100%);
  box-shadow: 0 12px 48px rgba(245, 124, 0, 0.55);
  animation: pw-btn-pouring 0.6s ease-in-out infinite;
  transform: scale(0.96);
}

.pw-pour-btn__icon {
  font-size: 2.2rem;
  line-height: 1;
}

.pw-pour-btn__label {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

@keyframes pw-btn-breathe {
  0%, 100% { box-shadow: 0 12px 36px rgba(30, 136, 229, 0.45); }
  50% { box-shadow: 0 12px 56px rgba(30, 136, 229, 0.7); }
}

@keyframes pw-btn-pouring {
  0%, 100% { transform: scale(0.96); }
  50% { transform: scale(1.0); }
}

/* === Demo 示范 === */
.pw-demo-overlay {
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

.pw-demo-overlay__icon {
  font-size: 1.6rem;
}

.pw-demo-overlay__text {
  font-size: 1.05rem;
  line-height: 1.3;
}

/* === 反馈文字 === */
.pw-feedback {
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

.pw-feedback--success {
  background: rgba(76, 175, 80, 0.92);
  color: #fff;
}

.pw-feedback--warning {
  background: rgba(255, 152, 0, 0.92);
  color: #fff;
}

.pw-feedback--info {
  background: rgba(33, 150, 243, 0.92);
  color: #fff;
}

.pw-feedback-fade-enter-active,
.pw-feedback-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.pw-feedback-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.pw-feedback-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

/* === 底部操作栏 === */
.pw-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-top: 4px;
}

.pw-btn {
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

.pw-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(33, 53, 71, 0.12);
}

.pw-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pw-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  box-shadow: 0 8px 24px rgba(30, 136, 229, 0.3);
}

.pw-btn--lg {
  padding: 16px 36px;
  font-size: 1.15rem;
}

.pw-btn--secondary {
  color: #1f3d5c;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(33, 53, 71, 0.08);
}

.pw-btn--ghost {
  color: #5f6f82;
  background: rgba(255, 255, 255, 0.6);
}

/* === 庆祝 === */
.pw-celebrate {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(22, 42, 72, 0.4);
  backdrop-filter: blur(4px);
}

.pw-celebrate__card {
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

.pw-celebrate__icon {
  font-size: 3.5rem;
  animation: pw-bounce 0.8s ease;
}

.pw-celebrate__card strong {
  font-size: 1.5rem;
  color: #1a3a5c;
}

.pw-celebrate__card p {
  margin: 0;
  color: rgba(33, 53, 71, 0.7);
}

@keyframes pw-bounce {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.pw-celebrate-enter-active,
.pw-celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.pw-celebrate-enter-from,
.pw-celebrate-leave-to {
  opacity: 0;
}

/* === 响应式 === */
@media (max-width: 720px) {
  .pw-game {
    padding: 10px;
  }

  .pw-topbar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 12px;
  }

  .pw-topbar__segments {
    width: 100%;
    order: 3;
  }

  .pw-scene__cup-wrap {
    width: clamp(100px, 40vw, 180px);
  }

  .pw-pour-btn {
    min-width: 120px;
    min-height: 120px;
    padding: 16px 22px;
    font-size: 0.95rem;
  }

  .pw-pour-btn__icon {
    font-size: 1.8rem;
  }

  .pw-feedback {
    font-size: 0.92rem;
    padding: 8px 16px;
  }

  .pw-btn {
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
