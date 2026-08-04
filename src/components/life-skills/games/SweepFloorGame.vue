<template>
  <div class="sf-game" :class="{ 'sf-game--paused': props.paused, 'sf-game--complete': gameCompleted }">
    <!-- 顶部进度条 -->
    <header class="sf-topbar">
      <div class="sf-topbar__info">
        <span class="sf-topbar__label">第 {{ pileIndex + 1 }} / {{ targetPiles }} 堆</span>
        <span class="sf-topbar__difficulty">难度 {{ difficultyLabel }}</span>
      </div>
      <div class="sf-topbar__bar">
        <span
          v-for="(_, idx) in targetPiles"
          :key="idx"
          class="sf-topbar__seg"
          :class="{
            'sf-topbar__seg--done': idx < pileIndex,
            'sf-topbar__seg--current': idx === pileIndex && phase !== 'ready',
          }"
        />
      </div>
    </header>

    <!-- 主舞台 -->
    <section class="sf-stage">
      <!-- 场景背景 -->
      <img
        class="sf-stage__scene"
        :src="L15_SCENE_URL"
        alt=""
        draggable="false"
        aria-hidden="true"
      />

      <!-- 进度图 + 手势层 -->
      <div class="sf-stage__center">
        <div class="sf-stage__progress-wrap">
          <transition name="sf-fade" mode="out-in">
            <img
              :key="currentProgressKey"
              class="sf-stage__progress-img"
              :src="SWEEP_FLOOR_PROGRESS_IMAGES[currentProgressKey]"
              alt="扫地状态"
              draggable="false"
            />
          </transition>

          <!-- 方向引导箭头（awaiting 阶段，showDirectionArrow 为 true 时） -->
          <transition name="sf-arrow-fade">
            <div
              v-if="phase === 'awaiting' && showArrow && currentDirection"
              class="sf-stage__arrow"
              :class="`sf-stage__arrow--${currentDirection}`"
              aria-hidden="true"
            >
              <span class="sf-stage__arrow-glyph">{{ directionArrowGlyph(currentDirection) }}</span>
            </div>
          </transition>

          <!-- 示范动画箭头（demo 阶段） -->
          <transition name="sf-arrow-fade">
            <div
              v-if="phase === 'demo' && currentDirection"
              class="sf-stage__arrow sf-stage__arrow--demo"
              :class="`sf-stage__arrow--${currentDirection}`"
              aria-hidden="true"
            >
              <span class="sf-stage__arrow-glyph">{{ directionArrowGlyph(currentDirection) }}</span>
            </div>
          </transition>

          <!-- 透明手势层 -->
          <div
            ref="gestureLayerRef"
            class="sf-stage__gesture-layer"
            @pointerdown="onPointerDown"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
          />
        </div>
      </div>

      <!-- 指令文字 -->
      <div class="sf-stage__instruction" aria-live="polite">
        <p>{{ currentInstruction }}</p>
      </div>
    </section>

    <!-- 底部按钮 -->
    <footer class="sf-footer">
      <button
        v-if="phase === 'ready'"
        type="button"
        class="sf-btn sf-btn--primary"
        @click="startGame"
      >
        🧹 开始扫地
      </button>
      <template v-else-if="phase !== 'celebrating' && !gameCompleted">
        <button
          type="button"
          class="sf-btn sf-btn--secondary"
          :disabled="props.paused"
          @click="replayDemo"
        >
          再看示范
        </button>
        <button
          type="button"
          class="sf-btn sf-btn--ghost"
          :disabled="props.paused"
          @click="resetRound"
        >
          重新开始
        </button>
      </template>
    </footer>

    <!-- 完成庆祝 -->
    <transition name="sf-celebrate">
      <div v-if="phase === 'celebrating' || gameCompleted" class="sf-celebrate">
        <div class="sf-celebrate__card">
          <strong>地板扫得真干净！</strong>
          <p>每一堆都扫进簸箕啦。</p>
        </div>
      </div>
    </transition>
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
  SWEEP_FLOOR_DIFFICULTIES,
  SWEEP_FLOOR_PROGRESS_IMAGES,
  L15_SCENE_URL,
  isSweepDirectionCorrect,
  averageNonNegative,
  ratio,
  type SweepFloorProgressKey,
  type SweepDirection,
} from '@/features/life-skills/l11-l15-core'

type Phase = 'ready' | 'demo' | 'awaiting' | 'celebrating' | 'finished'

const SWIPE_THRESHOLD = 40

const DIRECTIONS: readonly SweepDirection[] = ['left', 'right', 'up', 'down']

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

// ========== State ==========
const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const pileIndex = ref(0)
const gameCompleted = ref(false)
const currentProgressKey = ref<SweepFloorProgressKey>('messy')

/** 当前堆的簸箕方向（即期望扫动方向） */
const currentDirection = ref<SweepDirection | null>(null)
/** 每堆分配的方向列表 */
const pileDirections = ref<SweepDirection[]>([])

const sweepTimesMs = ref<number[]>([])
const wrongDirectionAttempts = ref(0)
const replayCount = ref(0)

let roundStartedAt = 0
let sweepStartedAt = 0
let demoTimer = 0
let completionEmitted = false

// Pointer tracking
let pointerStartX = 0
let pointerStartY = 0
let activePointerId: number | null = null

const gestureLayerRef = ref<HTMLElement | null>(null)

// ========== Computed ==========
const diffConfig = computed(() => SWEEP_FLOOR_DIFFICULTIES[activeDifficulty.value])
const targetPiles = computed(() => diffConfig.value.targetPiles)
const showArrow = computed(() => diffConfig.value.showDirectionArrow)
const difficultyLabel = computed(() => ({ 1: '简单', 2: '中等', 3: '困难' })[activeDifficulty.value])

const currentInstruction = computed(() => {
  if (phase.value === 'ready') return '准备好了就点「开始扫地」。'
  if (phase.value === 'demo') return `先看示范：${directionHintText(currentDirection.value)}扫到簸箕里。`
  if (phase.value === 'awaiting') {
    return `${directionHintText(currentDirection.value)}滑动，把碎屑扫进簸箕。`
  }
  if (phase.value === 'celebrating' || gameCompleted.value) return '地板全部扫干净啦！'
  return ''
})

// ========== Helpers ==========
function directionArrowGlyph(dir: SweepDirection | null): string {
  switch (dir) {
    case 'left': return '\u2190'
    case 'right': return '\u2192'
    case 'up': return '\u2191'
    case 'down': return '\u2193'
    default: return ''
  }
}

function directionHintText(dir: SweepDirection | null): string {
  switch (dir) {
    case 'left': return '向左'
    case 'right': return '向右'
    case 'up': return '向上'
    case 'down': return '向下'
    default: return ''
  }
}

function randomDirection(): SweepDirection {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)] as SweepDirection
}

function generatePileDirections(count: number): SweepDirection[] {
  const dirs: SweepDirection[] = []
  for (let i = 0; i < count; i++) {
    dirs.push(randomDirection())
  }
  return dirs
}

/**
 * 检测滑动方向：基于 pointer delta 计算主方向
 */
function detectSwipeDirection(dx: number, dy: number): SweepDirection | null {
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  // 需超过阈值才算有效滑动
  if (absDx < SWIPE_THRESHOLD && absDy < SWIPE_THRESHOLD) return null

  if (absDx > absDy) {
    return dx > 0 ? 'right' : 'left'
  } else {
    return dy > 0 ? 'down' : 'up'
  }
}

/**
 * 根据已完成堆数计算进度图 key
 */
function progressKeyForPilesDone(done: number): SweepFloorProgressKey {
  if (done <= 0) return 'messy'
  if (done === 1) return 'left-done'
  if (done === 2) return 'mid-done'
  return 'all-clean'
}

// ========== Game Flow ==========
function markDirtyOnce(): void {
  roundStartedAt = roundStartedAt || Date.now()
  props.markRoundDirty?.()
}

function startGame(): void {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  resetState()
  pileIndex.value = 0
  currentProgressKey.value = 'messy'
  pileDirections.value = generatePileDirections(targetPiles.value)
  currentDirection.value = pileDirections.value[0] ?? 'right'
  enterDemo()
  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {})
}

function resetState(): void {
  sweepTimesMs.value = []
  wrongDirectionAttempts.value = 0
  replayCount.value = 0
  gameCompleted.value = false
  completionEmitted = false
  window.clearTimeout(demoTimer)
}

function resetRound(): void {
  window.clearTimeout(demoTimer)
  phase.value = 'ready'
  pileIndex.value = 0
  currentProgressKey.value = 'messy'
  currentDirection.value = null
  pileDirections.value = []
  gameCompleted.value = false
  completionEmitted = false
  resetState()
  props.audio.stopAmbient()
}

function enterDemo(): void {
  phase.value = 'demo'
  sweepStartedAt = Date.now()

  const dir = currentDirection.value
  if (dir) {
    props.audio.speak(`${directionHintText(dir)}扫，把碎屑扫到簸箕里。`)
  }

  // 示范持续约 2 秒后进入 awaiting
  demoTimer = window.setTimeout(() => {
    phase.value = 'awaiting'
  }, 2000)
}

function replayDemo(): void {
  if (phase.value !== 'awaiting') return
  replayCount.value += 1
  enterDemo()
}

// ========== Pointer / Gesture Events ==========
function onPointerDown(event: PointerEvent): void {
  if (phase.value !== 'awaiting' || props.paused || gameCompleted.value) return
  if (activePointerId !== null) return

  event.preventDefault()
  activePointerId = event.pointerId
  pointerStartX = event.clientX
  pointerStartY = event.clientY

  const el = event.currentTarget as HTMLElement
  try {
    el.setPointerCapture(event.pointerId)
  } catch {
    // pointer capture may not be available
  }
}

function onPointerUp(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return
  activePointerId = null

  if (phase.value !== 'awaiting' || props.paused) return

  const dx = event.clientX - pointerStartX
  const dy = event.clientY - pointerStartY
  const detected = detectSwipeDirection(dx, dy)

  if (!detected) {
    // 滑动距离不够，忽略
    return
  }

  const expected = currentDirection.value
  if (expected && isSweepDirectionCorrect(detected, expected)) {
    onCorrectSweep()
  } else {
    // 方向不匹配
    wrongDirectionAttempts.value += 1
    props.audio.playSoftBounce().catch(() => {})
    if (expected) {
      props.audio.speak(`试试${directionHintText(expected)}滑动。`)
    }
  }
}

function onPointerCancel(event: PointerEvent): void {
  if (event.pointerId === activePointerId) {
    activePointerId = null
  }
}

// ========== Sweep Progression ==========
function onCorrectSweep(): void {
  // 记录扫动时间
  if (sweepStartedAt > 0) {
    sweepTimesMs.value.push(Date.now() - sweepStartedAt)
    sweepStartedAt = Date.now()
  }

  props.audio.playSuccessCue().catch(() => {})

  // 推进到下一堆
  pileIndex.value += 1

  // 更新进度图
  currentProgressKey.value = progressKeyForPilesDone(pileIndex.value)

  // 检查是否全部完成
  if (pileIndex.value >= targetPiles.value) {
    finishRound()
    return
  }

  // 下一堆：更新方向
  currentDirection.value = pileDirections.value[pileIndex.value] ?? 'right'
  props.audio.speak(`好的，下一堆！${directionHintText(currentDirection.value)}扫。`)

  // 短暂停留后进入下一堆示范
  window.setTimeout(() => {
    if (phase.value === 'awaiting' && !gameCompleted.value) {
      enterDemo()
    }
  }, 900)
}

function finishRound(): void {
  if (completionEmitted) return
  completionEmitted = true
  phase.value = 'celebrating'
  gameCompleted.value = true
  props.audio.stopAmbient()
  props.audio.playSuccessCue().catch(() => {})
  props.audio.speak('地板全部扫干净啦，你真是扫地小旋风！')

  demoTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 1500)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const totalDurationSeconds = roundStartedAt > 0
    ? Number(((Date.now() - roundStartedAt) / 1000).toFixed(1))
    : 0

  return {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'watch-do-feedback',
      target_piles: targetPiles.value,
      piles_swept: pileIndex.value,
      wrong_direction_attempts: wrongDirectionAttempts.value,
      average_sweep_ms: averageNonNegative(sweepTimesMs.value),
      sweep_times_ms: [...sweepTimesMs.value],
      total_duration_seconds: totalDurationSeconds,
      replay_count: replayCount.value,
      difficulty_level: activeDifficulty.value,
      is_auto_completed: false,
    },
  }
}

// ========== Lifecycle ==========
watch(
  () => props.difficulty,
  (difficulty) => {
    if (phase.value === 'ready') activeDifficulty.value = difficulty
  },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (isPaused) props.audio.stopAmbient()
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(demoTimer)
  props.audio.stopAll()
})

// 确保 ratio 已被引入（用于未来精确度评分扩展）
void ratio
</script>

<style scoped>
/* === SweepFloorGame Styles === */
.sf-game {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  padding: 16px;
  overflow: hidden;
  color: #3e2723;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  background: linear-gradient(155deg, #efebe9 0%, #fff3e0 55%, #e8f5e9 100%);
  user-select: none;
}

.sf-game--paused {
  filter: grayscale(0.4) brightness(0.95);
  pointer-events: none;
}

/* ========== Topbar ========== */
.sf-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 12px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 20px rgba(62, 39, 35, 0.08);
}

.sf-topbar__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sf-topbar__label {
  font-size: 1.1rem;
  font-weight: 700;
  color: #5d4037;
}

.sf-topbar__difficulty {
  font-size: 0.82rem;
  color: rgba(62, 39, 35, 0.6);
}

.sf-topbar__bar {
  display: flex;
  gap: 6px;
  flex: 1;
}


.sf-topbar__seg {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: rgba(62, 39, 35, 0.1);
  transition: background 0.25s ease;
}

.sf-topbar__seg--current {
  background: linear-gradient(90deg, #a1887f, #8d6e63);
  animation: sf-seg-pulse 1.4s ease-in-out infinite;
}

.sf-topbar__seg--done {
  background: #8d6e63;
}

@keyframes sf-seg-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

/* ========== Stage ========== */
.sf-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 28px;
  overflow: hidden;
  background: #efebe9;
}

.sf-stage__scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.85;
}

.sf-stage__center {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.sf-stage__progress-wrap {
  position: relative;
  width: min(70%, 320px);
  aspect-ratio: 1 / 1;
  max-height: 70%;
}


.sf-stage__progress-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  border-radius: 16px;
  filter: drop-shadow(0 8px 24px rgba(62, 39, 35, 0.18));
}

/* Crossfade transition for progress images */
.sf-fade-enter-active,
.sf-fade-leave-active {
  transition: opacity 0.22s ease;
}

.sf-fade-enter-from,
.sf-fade-leave-to {
  opacity: 0;
}

/* ========== Gesture Layer ========== */
.sf-stage__gesture-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  touch-action: none;
  cursor: grab;
}

.sf-stage__gesture-layer:active {
  cursor: grabbing;
}

/* ========== Direction Arrow ========== */
.sf-stage__arrow {
  position: absolute;
  inset: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.sf-stage__arrow-glyph {
  font-size: clamp(48px, 10vw, 80px);
  font-weight: 900;
  color: rgba(255, 255, 255, 0.85);
  text-shadow:
    0 0 20px rgba(141, 110, 99, 0.7),
    0 4px 12px rgba(62, 39, 35, 0.3);
  animation: sf-arrow-breathe 1.6s ease-in-out infinite;
}

.sf-stage__arrow--demo .sf-stage__arrow-glyph {
  color: rgba(141, 110, 99, 0.9);
  text-shadow:
    0 0 20px rgba(141, 110, 99, 0.7),
    0 4px 12px rgba(62, 39, 35, 0.3);
  animation: sf-arrow-demo 1.2s ease-in-out infinite;
}

@keyframes sf-arrow-breathe {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.15); opacity: 1; }
}

@keyframes sf-arrow-demo {
  0% { transform: scale(0.8) translateY(8px); opacity: 0.5; }
  50% { transform: scale(1.1) translateY(-4px); opacity: 1; }
  100% { transform: scale(0.8) translateY(8px); opacity: 0.5; }
}

/* Arrow fade transition */
.sf-arrow-fade-enter-active {
  transition: opacity 0.3s ease;
}

.sf-arrow-fade-leave-active {
  transition: opacity 0.15s ease;
}

.sf-arrow-fade-enter-from,
.sf-arrow-fade-leave-to {
  opacity: 0;
}


/* ========== Instruction ========== */
.sf-stage__instruction {
  position: relative;
  z-index: 12;
  max-width: 88%;
  padding: 10px 20px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: rgba(62, 39, 35, 0.82);
  color: #fff;
  text-align: center;
  box-shadow: 0 6px 18px rgba(62, 39, 35, 0.2);
}

.sf-stage__instruction p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
}

/* ========== Footer ========== */
.sf-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-top: 10px;
}

.sf-btn {
  border: 0;
  border-radius: 999px;
  padding: 12px 24px;
  font: inherit;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.sf-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(62, 39, 35, 0.14);
}

.sf-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.sf-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #8d6e63 0%, #6d4c41 100%);
  box-shadow: 0 8px 24px rgba(141, 110, 99, 0.3);
}

.sf-btn--secondary {
  color: #5d4037;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(141, 110, 99, 0.3);
}

.sf-btn--ghost {
  color: #5d4037;
  background: rgba(255, 255, 255, 0.6);
}

/* ========== Celebration ========== */
.sf-celebrate {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(62, 39, 35, 0.4);
  backdrop-filter: blur(4px);
}

.sf-celebrate__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 40px;
  border-radius: 32px;
  background: linear-gradient(145deg, #efebe9, #fff3e0);
  box-shadow: 0 24px 60px rgba(62, 39, 35, 0.28);
  text-align: center;
  border: 3px solid #a1887f;
}

.sf-celebrate__card strong {
  font-size: 1.5rem;
  color: #5d4037;
}

.sf-celebrate__card p {
  margin: 0;
  color: rgba(62, 39, 35, 0.7);
}

.sf-celebrate-enter-active,
.sf-celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.sf-celebrate-enter-from,
.sf-celebrate-leave-to {
  opacity: 0;
}

/* ========== Responsive ========== */
@media (max-width: 720px) {
  .sf-game {
    padding: 10px;
  }

  .sf-topbar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 12px;
  }

  .sf-topbar__bar {
    width: 100%;
    order: 3;
  }

  .sf-stage__progress-wrap {
    width: min(80%, 260px);
  }

  .sf-stage__instruction {
    max-width: 94%;
    padding: 8px 14px;
    font-size: 0.92rem;
  }

  .sf-btn {
    padding: 10px 18px;
    font-size: 0.95rem;
  }

  .sf-stage__arrow-glyph {
    font-size: 48px;
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
