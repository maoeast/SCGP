<template>
  <div class="rc-game" :class="{ 'rc-game--paused': props.paused, 'rc-game--complete': gameCompleted }">
    <!-- 顶栏：过马路次数进度段落条 -->
    <header class="rc-topbar">
      <div class="rc-topbar__info">
        <span class="rc-topbar__icon" aria-hidden="true">🚦</span>
        <div class="rc-topbar__text">
          <strong>{{ topbarLabel }}</strong>
          <small>第 {{ crossingIndex + 1 }} / {{ config.targetCrossings }} 次</small>
        </div>
      </div>
      <div class="rc-topbar__segments" aria-label="过马路进度">
        <span
          v-for="(_, idx) in config.targetCrossings"
          :key="idx"
          class="rc-topbar__seg"
          :class="{ 'is-done': idx < crossingIndex, 'is-current': idx === crossingIndex && !isRoundFinished }"
        />
      </div>
    </header>

    <!-- 主场景 -->
    <section class="rc-scene">
      <!-- 场景背景图 -->
      <img
        class="rc-scene__bg"
        :src="L13_SCENE_URL"
        alt=""
        draggable="false"
        aria-hidden="true"
      />

      <!-- 进度图（crossfade 切换） -->
      <div class="rc-scene__progress-wrap">
        <Transition name="rc-crossfade" mode="out-in">
          <img
            :key="currentProgressKey"
            class="rc-scene__progress-img"
            :src="ROAD_CROSS_PROGRESS_IMAGES[currentProgressKey]"
            alt="过马路状态"
            draggable="false"
          />
        </Transition>
      </div>

      <!-- 交通灯 CSS 指示器 -->
      <div class="rc-scene__traffic-light" aria-label="交通灯">
        <div
          class="rc-scene__light rc-scene__light--red"
          :class="{ 'is-active': currentLight === 'red' }"
        />
        <div
          class="rc-scene__light rc-scene__light--yellow"
          :class="{ 'is-active': currentLight === 'yellow' }"
        />
        <div
          class="rc-scene__light rc-scene__light--green"
          :class="{ 'is-active': currentLight === 'green' }"
        />
        <!-- 倒计时 -->
        <span
          v-if="config.showCountdown && currentLight === 'green'"
          class="rc-scene__countdown"
        >
          {{ countdownSec }}
        </span>
      </div>

      <!-- 转弯车辆警告（难度3） -->
      <Transition name="rc-car-fade">
        <div
          v-if="config.hasTurningCar && turningCarVisible"
          class="rc-scene__turning-car"
          role="status"
          aria-live="polite"
        >
          <span class="rc-scene__car-warning">有车转弯！</span>
        </div>
      </Transition>

      <!-- 大点击按钮：绿灯时可点 -->
      <div v-if="phase === 'awaiting'" class="rc-tap-area">
        <button
          type="button"
          class="rc-tap-btn"
          :class="{
            'rc-tap-btn--safe': currentLight === 'green' && !turningCarVisible,
            'rc-tap-btn--danger': currentLight !== 'green' || turningCarVisible,
          }"
          :disabled="props.paused"
          :aria-label="`第 ${crossingIndex + 1} 次过马路`"
          @click="onChildTap"
        >
          <span class="rc-tap-btn__label">{{
            currentLight === 'green' && !turningCarVisible ? '过马路！' : '等一等...'
          }}</span>
        </button>
      </div>

      <!-- 示范提示 -->
      <div v-if="phase === 'demo'" class="rc-demo-overlay" aria-live="polite">
        <span class="rc-demo-overlay__text">看，等绿灯亮了再过马路</span>
      </div>

      <!-- 反馈文字 -->
      <Transition name="rc-feedback-fade">
        <div
          v-if="feedbackText"
          class="rc-feedback"
          :class="`rc-feedback--${feedbackTone}`"
          role="status"
          aria-live="polite"
        >
          {{ feedbackText }}
        </div>
      </Transition>
    </section>

    <!-- 指令文字 -->
    <div class="rc-instruction" aria-live="polite">
      <p>{{ currentInstruction }}</p>
    </div>

    <!-- 底部操作栏 -->
    <footer class="rc-footer">
      <template v-if="phase === 'ready'">
        <button
          type="button"
          class="rc-btn rc-btn--primary rc-btn--lg"
          @click="startGame"
        >
          <span aria-hidden="true">🚦</span> 开始过马路
        </button>
      </template>

      <template v-else-if="phase !== 'celebrating'">
        <button
          type="button"
          class="rc-btn rc-btn--secondary"
          :disabled="props.paused"
          @click="replayDemo"
        >
          再看示范
        </button>
        <button
          type="button"
          class="rc-btn rc-btn--ghost"
          :disabled="props.paused"
          @click="resetRound"
        >
          重新开始
        </button>
      </template>
    </footer>

    <!-- 完成庆祝 -->
    <Transition name="rc-celebrate">
      <div v-if="phase === 'celebrating'" class="rc-celebrate" role="status" aria-live="polite">
        <div class="rc-celebrate__card">
          <strong>安全过马路，做得真棒！</strong>
          <p>每次都等绿灯再走，你真厉害。</p>
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
  ROAD_CROSS_DIFFICULTIES,
  ROAD_CROSS_PROGRESS_IMAGES,
  L13_SCENE_URL,
  isCrossingSafe,
  averageNonNegative,
  type RoadCrossProgressKey,
  type TrafficLight,
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
const crossingIndex = ref(0)
const currentLight = ref<TrafficLight>('red')
const countdownSec = ref(0)
const turningCarVisible = ref(false)
const feedbackText = ref('')
const feedbackTone = ref<FeedbackTone>('info')
const gameCompleted = ref(false)
const replayCount = ref(0)
const currentProgressKey = ref<RoadCrossProgressKey>('redlight')

// 数据记录
const crossingTimesMs = ref<number[]>([])
const redLightAttempts = ref(0)

// 内部定时器与状态
let roundStartedAt = 0
let crossingStartedAt = 0
let demoTimer: number | null = null
let lightTimer: number | null = null
let countdownTimer: number | null = null
let turningCarTimer: number | null = null
let feedbackTimer: number | null = null
let unmounted = false

// --- 计算属性 ---
const config = computed(() => ROAD_CROSS_DIFFICULTIES[activeDifficulty.value])
const isRoundFinished = computed(() => phase.value === 'celebrating' || phase.value === 'finished')

const topbarLabel = computed(() => {
  if (phase.value === 'ready') return '准备好了吗？'
  if (isRoundFinished.value) return '全部安全通过！'
  return '安全过马路'
})

const currentInstruction = computed(() => {
  if (phase.value === 'ready') return '准备好了就点「开始过马路」。'
  if (phase.value === 'demo') return '看，等绿灯亮了再过马路，这样才安全。'
  if (phase.value === 'awaiting') {
    if (currentLight.value === 'green' && !turningCarVisible.value) {
      return '绿灯亮了，现在可以安全地过马路啦！'
    }
    if (turningCarVisible.value) {
      return '有车在转弯，等一等再过。'
    }
    return '红灯停，耐心等一等。'
  }
  if (isRoundFinished.value) return '你每次都安全地过了马路，太棒了！'
  return ''
})

// --- Demo 示范阶段 ---
function enterDemo() {
  phase.value = 'demo'
  currentLight.value = 'red'
  currentProgressKey.value = 'redlight'
  turningCarVisible.value = false
  clearFeedback()

  const demoCue = crossingIndex.value === 0
    ? '看，等绿灯亮了再过马路，这样才安全。'
    : `第 ${crossingIndex.value + 1} 次，继续等绿灯。`
  speakSafely(demoCue)

  // 示范动画：红灯 1.2s → 变绿灯 → 1.2s → 进入 awaiting
  demoTimer = window.setTimeout(() => {
    if (unmounted || phase.value !== 'demo') return
    currentLight.value = 'green'
    currentProgressKey.value = 'greenlight'

    demoTimer = window.setTimeout(() => {
      if (unmounted || phase.value !== 'demo') return
      enterAwaiting()
    }, 1200)
  }, 1200)
}

// --- 绿灯等待阶段 ---
function enterAwaiting() {
  phase.value = 'awaiting'
  crossingStartedAt = Date.now()

  const greenSec = config.value.greenDurationSec
  countdownSec.value = greenSec
  currentLight.value = 'green'
  currentProgressKey.value = 'greenlight'
  turningCarVisible.value = false

  // 难度3：绿灯中途随机出现转弯车辆
  if (config.value.hasTurningCar) {
    const carDelay = 800 + Math.random() * 1000
    turningCarTimer = window.setTimeout(() => {
      if (unmounted || phase.value !== 'awaiting') return
      turningCarVisible.value = true
      // 车辆 1.5s 后离开
      turningCarTimer = window.setTimeout(() => {
        if (unmounted) return
        turningCarVisible.value = false
      }, 1500)
    }, carDelay)
  }

  // 倒计时
  countdownTimer = window.setInterval(() => {
    if (unmounted) return
    countdownSec.value -= 1
    if (countdownSec.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      onGreenExpired()
    }
  }, 1000)
}

// --- 绿灯到期 ---
function onGreenExpired() {
  currentLight.value = 'yellow'
  currentProgressKey.value = 'redlight'
  turningCarVisible.value = false
  if (turningCarTimer !== null) {
    window.clearTimeout(turningCarTimer)
    turningCarTimer = null
  }

  lightTimer = window.setTimeout(() => {
    if (unmounted) return
    currentLight.value = 'red'
    // 红灯等 2s 再重新变绿
    lightTimer = window.setTimeout(() => {
      if (unmounted || phase.value !== 'awaiting') return
      enterAwaiting()
    }, 2000)
  }, 1500)
}

// --- 点击过马路 ---
function onChildTap() {
  if (phase.value !== 'awaiting' || props.paused) return

  const safe = isCrossingSafe(currentLight.value, turningCarVisible.value)
  if (!safe) {
    // 不安全时记录红灯尝试，给提示
    redLightAttempts.value++
    if (currentLight.value !== 'green') {
      showFeedback('红灯停，等一等绿灯。', 'warning')
      speakSafely('红灯停，等一等绿灯。')
    } else {
      showFeedback('有车在转弯，等一等。', 'warning')
      speakSafely('有车在转弯，等一等。')
    }
    playAudioSafe(() => props.audio.playSoftBounce())
    return
  }

  // 安全过马路
  startSessionIfNeeded()

  // 记录用时
  if (crossingStartedAt > 0) {
    crossingTimesMs.value.push(Date.now() - crossingStartedAt)
  }

  // 清除当前轮计时器
  clearLightTimers()

  // 短暂显示 crossing 状态
  currentProgressKey.value = 'crossing'
  showFeedback('安全通过！', 'success')
  playAudioSafe(() => props.audio.playSuccessCue())

  const isLast = crossingIndex.value >= config.value.targetCrossings - 1
  speakSafely(isLast ? '最后一次也安全通过了，太棒了！' : '安全通过，做得好！')

  // 短暂延迟后显示 safe → 推进
  demoTimer = window.setTimeout(() => {
    if (unmounted) return
    currentProgressKey.value = 'safe'

    crossingIndex.value++
    if (crossingIndex.value >= config.value.targetCrossings) {
      finishRound()
    } else {
      // 下一轮：延迟后进入 demo
      demoTimer = window.setTimeout(() => {
        if (unmounted) return
        enterDemo()
      }, 900)
    }
  }, 600)
}

// --- 完成 ---
function finishRound() {
  phase.value = 'celebrating'
  gameCompleted.value = true
  try { props.audio.stopAmbient() } catch { /* */ }
  playAudioSafe(() => props.audio.playSuccessCue())
  speakSafely('你每次都安全地过了马路，太棒了！')

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
  crossingIndex.value = 0
  currentLight.value = 'red'
  currentProgressKey.value = 'redlight'
  countdownSec.value = 0
  turningCarVisible.value = false
  replayCount.value = 0
  crossingTimesMs.value = []
  redLightAttempts.value = 0
  gameCompleted.value = false
  clearFeedback()
  enterDemo()
  playAudioSafe(async () => {
    await props.audio.ensureReady()
    await props.audio.startAmbient()
  })
}

function replayDemo() {
  if (phase.value !== 'awaiting' && phase.value !== 'demo') return
  clearLightTimers()
  replayCount.value++
  enterDemo()
}

function resetRound() {
  clearAllTimers()
  phase.value = 'ready'
  crossingIndex.value = 0
  currentLight.value = 'red'
  currentProgressKey.value = 'redlight'
  countdownSec.value = 0
  turningCarVisible.value = false
  gameCompleted.value = false
  clearFeedback()
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

function clearLightTimers() {
  if (lightTimer !== null) { window.clearTimeout(lightTimer); lightTimer = null }
  if (countdownTimer !== null) { window.clearInterval(countdownTimer); countdownTimer = null }
  if (turningCarTimer !== null) { window.clearTimeout(turningCarTimer); turningCarTimer = null }
}

function clearAllTimers() {
  if (demoTimer !== null) { window.clearTimeout(demoTimer); demoTimer = null }
  if (feedbackTimer !== null) { window.clearTimeout(feedbackTimer); feedbackTimer = null }
  clearLightTimers()
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
      target_crossings: config.value.targetCrossings,
      safe_crossings: crossingIndex.value,
      red_light_attempts: redLightAttempts.value,
      average_crossing_ms: averageNonNegative(crossingTimesMs.value),
      crossing_times_ms: [...crossingTimesMs.value],
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
      clearLightTimers()
      try { props.audio.stopAmbient() } catch { /* */ }
    }
  },
)

onBeforeUnmount(() => {
  unmounted = true
  clearAllTimers()
  try { props.audio.stopAll() } catch { /* */ }
})
</script>

<style scoped>
/* === 根容器 === */
.rc-game {
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
  background: linear-gradient(155deg, #e8f5e9 0%, #e3f2fd 55%, #fff3e0 100%);
  user-select: none;
}

.rc-game--paused {
  filter: grayscale(0.4) brightness(0.95);
  pointer-events: none;
}

/* === 顶栏 === */
.rc-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(22, 42, 72, 0.08);
}

.rc-topbar__info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rc-topbar__icon {
  font-size: 1.8rem;
  line-height: 1;
}

.rc-topbar__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rc-topbar__text strong {
  font-size: 1.1rem;
  color: #1a3a5c;
}

.rc-topbar__text small {
  font-size: 0.82rem;
  color: rgba(33, 53, 71, 0.6);
}

.rc-topbar__segments {
  display: flex;
  gap: 6px;
  flex: 1;
}

.rc-topbar__seg {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.12);
  transition: background 0.25s ease;
}

.rc-topbar__seg.is-done {
  background: #66bb6a;
}

.rc-topbar__seg.is-current {
  background: linear-gradient(90deg, #66bb6a, #ffb300);
  animation: rc-seg-pulse 1.4s ease-in-out infinite;
}

@keyframes rc-seg-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

/* === 场景区 === */
.rc-scene {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 28px;
  overflow: hidden;
  background: #e8eaf6;
}

.rc-scene__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.85;
}

/* 进度图 */
.rc-scene__progress-wrap {
  position: relative;
  z-index: 5;
  width: clamp(140px, 32vw, 260px);
  aspect-ratio: 4 / 3;
}

.rc-scene__progress-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 6px 16px rgba(22, 42, 72, 0.18));
}

/* crossfade transition */
.rc-crossfade-enter-active,
.rc-crossfade-leave-active {
  transition: opacity 0.22s ease;
}

.rc-crossfade-enter-from,
.rc-crossfade-leave-to {
  opacity: 0;
}

/* === 交通灯 CSS 指示器 === */
.rc-scene__traffic-light {
  position: absolute;
  top: 8%;
  right: 8%;
  z-index: 15;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  border-radius: 12px;
  background: #263238;
  box-shadow: 0 6px 20px rgba(38, 50, 56, 0.4);
}

.rc-scene__light {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  opacity: 0.25;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
}

.rc-scene__light--red {
  background: #ef5350;
}

.rc-scene__light--yellow {
  background: #ffc107;
}

.rc-scene__light--green {
  background: #66bb6a;
}

.rc-scene__light.is-active {
  opacity: 1;
}

.rc-scene__light--red.is-active {
  box-shadow: 0 0 12px 3px rgba(239, 83, 80, 0.6);
}

.rc-scene__light--yellow.is-active {
  box-shadow: 0 0 12px 3px rgba(255, 193, 7, 0.6);
}

.rc-scene__light--green.is-active {
  box-shadow: 0 0 12px 3px rgba(102, 187, 106, 0.6);
}

/* 倒计时 */
.rc-scene__countdown {
  margin-top: 4px;
  font-size: 0.82rem;
  font-weight: 800;
  color: #fff;
  text-align: center;
}

/* === 转弯车辆警告 === */
.rc-scene__turning-car {
  position: absolute;
  top: 12%;
  left: 8%;
  z-index: 18;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(239, 83, 80, 0.92);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 4px 16px rgba(239, 83, 80, 0.4);
  animation: rc-car-shake 0.4s ease-in-out infinite alternate;
}

@keyframes rc-car-shake {
  0% { transform: translateX(0); }
  100% { transform: translateX(4px); }
}

.rc-car-fade-enter-active,
.rc-car-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.rc-car-fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.rc-car-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* === 点击过马路按钮 === */
.rc-tap-area {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}

.rc-tap-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 150px;
  min-height: 150px;
  padding: 24px 32px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  font: inherit;
  font-weight: 800;
  font-size: 1.15rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.rc-tap-btn--safe {
  background: linear-gradient(145deg, #66bb6a 0%, #43a047 100%);
  box-shadow: 0 12px 40px rgba(67, 160, 71, 0.5);
  animation: rc-btn-breathe-green 1.8s ease-in-out infinite;
}

.rc-tap-btn--danger {
  background: linear-gradient(145deg, #78909c 0%, #546e7a 100%);
  box-shadow: 0 8px 24px rgba(84, 110, 122, 0.3);
  animation: none;
  cursor: not-allowed;
}

.rc-tap-btn:hover:not(:disabled).rc-tap-btn--safe {
  transform: scale(1.06);
}

.rc-tap-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  animation: none;
}

.rc-tap-btn__label {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

@keyframes rc-btn-breathe-green {
  0%, 100% { box-shadow: 0 12px 40px rgba(67, 160, 71, 0.5); }
  50% { box-shadow: 0 12px 60px rgba(67, 160, 71, 0.8); }
}

/* === Demo 示范 === */
.rc-demo-overlay {
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

/* === 反馈文字 === */
.rc-feedback {
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

.rc-feedback--success {
  background: rgba(76, 175, 80, 0.92);
  color: #fff;
}

.rc-feedback--warning {
  background: rgba(255, 152, 0, 0.92);
  color: #fff;
}

.rc-feedback--info {
  background: rgba(33, 150, 243, 0.92);
  color: #fff;
}

.rc-feedback-fade-enter-active,
.rc-feedback-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.rc-feedback-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.rc-feedback-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

/* === 指令文字 === */
.rc-instruction {
  padding: 8px 16px;
  text-align: center;
}

.rc-instruction p {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #37474f;
  line-height: 1.4;
}

/* === 底部操作栏 === */
.rc-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-top: 4px;
}

.rc-btn {
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

.rc-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(33, 53, 71, 0.12);
}

.rc-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.rc-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
  box-shadow: 0 8px 24px rgba(67, 160, 71, 0.3);
}

.rc-btn--lg {
  padding: 16px 36px;
  font-size: 1.15rem;
}

.rc-btn--secondary {
  color: #1f3d5c;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(33, 53, 71, 0.08);
}

.rc-btn--ghost {
  color: #5f6f82;
  background: rgba(255, 255, 255, 0.6);
}

/* === 庆祝 === */
.rc-celebrate {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(22, 42, 72, 0.4);
  backdrop-filter: blur(4px);
}

.rc-celebrate__card {
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

.rc-celebrate__card strong {
  font-size: 1.5rem;
  color: #1a3a5c;
}

.rc-celebrate__card p {
  margin: 0;
  color: rgba(33, 53, 71, 0.7);
}

.rc-celebrate-enter-active,
.rc-celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.rc-celebrate-enter-from,
.rc-celebrate-leave-to {
  opacity: 0;
}

/* === 响应式 === */
@media (max-width: 720px) {
  .rc-game {
    padding: 10px;
  }

  .rc-topbar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 12px;
  }

  .rc-topbar__segments {
    width: 100%;
    order: 3;
  }

  .rc-scene__progress-wrap {
    width: clamp(120px, 42vw, 200px);
  }

  .rc-tap-btn {
    min-width: 120px;
    min-height: 120px;
    padding: 18px 24px;
    font-size: 1rem;
  }

  .rc-feedback {
    font-size: 0.92rem;
    padding: 8px 16px;
  }

  .rc-btn {
    padding: 10px 18px;
    font-size: 0.95rem;
  }

  .rc-scene__traffic-light {
    gap: 4px;
    padding: 8px 6px;
  }

  .rc-scene__light {
    width: 18px;
    height: 18px;
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

<!-- STYLES_PLACEHOLDER -->
