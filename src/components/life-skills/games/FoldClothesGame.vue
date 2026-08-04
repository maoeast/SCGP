<template>
  <div class="fc-game" :class="{ 'fc-game--paused': props.paused, 'fc-game--complete': gameCompleted }">
    <!-- 顶部进度条 -->
    <header class="fc-topbar">
      <div class="fc-topbar__info">
        <span class="fc-topbar__label">第 {{ itemIndex + 1 }} / {{ targetItemCount }} 件</span>
        <span class="fc-topbar__difficulty">难度 {{ difficultyLabel }}</span>
      </div>
      <div class="fc-topbar__bar">
        <span
          v-for="(_, idx) in targetItemCount"
          :key="idx"
          class="fc-topbar__seg"
          :class="{
            'fc-topbar__seg--done': idx < itemIndex,
            'fc-topbar__seg--current': idx === itemIndex,
          }"
        />
      </div>
    </header>

    <!-- 主舞台 -->
    <section class="fc-stage">
      <!-- 场景背景 -->
      <img
        class="fc-stage__scene"
        :src="L14_SCENE_URL"
        alt=""
        draggable="false"
        aria-hidden="true"
      />

      <!-- 衣物进度图 + 手势层 -->
      <div class="fc-stage__center">
        <div class="fc-stage__progress-wrap">
          <transition name="fc-fade" mode="out-in">
            <img
              :key="currentProgressKey"
              class="fc-stage__progress-img"
              :src="FOLD_CLOTHES_PROGRESS_IMAGES[currentProgressKey]"
              alt="衣物折叠状态"
              draggable="false"
            />
          </transition>

          <!-- 方向引导箭头（awaiting 阶段） -->
          <transition name="fc-arrow-fade">
            <div
              v-if="phase === 'awaiting' && currentExpectedDirection"
              class="fc-stage__arrow"
              :class="`fc-stage__arrow--${currentExpectedDirection}`"
              aria-hidden="true"
            >
              <span class="fc-stage__arrow-glyph">{{ directionArrow(currentExpectedDirection) }}</span>
            </div>
          </transition>

          <!-- 示范动画箭头（demo 阶段） -->
          <transition name="fc-arrow-fade">
            <div
              v-if="phase === 'demo' && currentExpectedDirection"
              class="fc-stage__arrow fc-stage__arrow--demo"
              :class="`fc-stage__arrow--${currentExpectedDirection}`"
              aria-hidden="true"
            >
              <span class="fc-stage__arrow-glyph">{{ directionArrow(currentExpectedDirection) }}</span>
            </div>
          </transition>

          <!-- 透明手势层 -->
          <div
            ref="gestureLayerRef"
            class="fc-stage__gesture-layer"
            @pointerdown="onPointerDown"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
          />
        </div>
      </div>

      <!-- 指令文字 -->
      <div class="fc-stage__instruction" aria-live="polite">
        <p>{{ currentInstruction }}</p>
      </div>
    </section>

    <!-- 底部按钮 -->
    <footer class="fc-footer">
      <button
        v-if="phase === 'ready'"
        type="button"
        class="fc-btn fc-btn--primary"
        @click="startGame"
      >
        开始叠衣服
      </button>
      <template v-else-if="phase !== 'celebrating' && !gameCompleted">
        <button
          type="button"
          class="fc-btn fc-btn--secondary"
          :disabled="props.paused"
          @click="replayDemo"
        >
          再看示范
        </button>
        <button
          type="button"
          class="fc-btn fc-btn--ghost"
          :disabled="props.paused"
          @click="resetRound"
        >
          重新开始
        </button>
      </template>
    </footer>

    <!-- 完成庆祝 -->
    <transition name="fc-celebrate">
      <div v-if="phase === 'celebrating' || gameCompleted" class="fc-celebrate">
        <div class="fc-celebrate__card">
          <strong>衣服叠得真整齐！</strong>
          <p>每一件都叠得很好。</p>
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
  FOLD_CLOTHES_DIFFICULTIES,
  FOLD_CLOTHES_PROGRESS_IMAGES,
  L14_SCENE_URL,
  averageNonNegative,
  isFoldAligned,
  ratio,
  type FoldClothesProgressKey,
} from '@/features/life-skills/l11-l15-core'

type Phase = 'ready' | 'demo' | 'awaiting' | 'celebrating' | 'finished'
type SwipeDirection = 'swipe-right' | 'swipe-left' | 'swipe-up'

/**
 * 折叠步骤定义：每步对应 进度图 key 变化 + 期望手势方向
 * spread→left：向右滑（把左半边折向右）
 * left→right：向左滑（把右半边折向左）
 * right→bottom：向上滑（下摆折向领口）
 */
interface FoldStep {
  fromKey: FoldClothesProgressKey
  toKey: FoldClothesProgressKey
  expectedDirection: SwipeDirection
  instruction: string
  directionHint: string
}

const ALL_FOLD_STEPS: readonly FoldStep[] = [
  {
    fromKey: 'spread',
    toKey: 'left',
    expectedDirection: 'swipe-right',
    instruction: '向右滑，把左袖折过来。',
    directionHint: '向右滑动',
  },
  {
    fromKey: 'left',
    toKey: 'right',
    expectedDirection: 'swipe-left',
    instruction: '向左滑，把右袖折过来。',
    directionHint: '向左滑动',
  },
  {
    fromKey: 'right',
    toKey: 'bottom',
    expectedDirection: 'swipe-up',
    instruction: '向上滑，把下摆折向领口。',
    directionHint: '向上滑动',
  },
]

const SWIPE_THRESHOLD = 40

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
const itemIndex = ref(0)
const foldStepIndex = ref(0)
const gameCompleted = ref(false)
const currentProgressKey = ref<FoldClothesProgressKey>('spread')

const foldTimesMs = ref<number[]>([])
const wrongSwipeCount = ref(0)
const replayCount = ref(0)

let roundStartedAt = 0
let foldStartedAt = 0
let demoTimer = 0
let demoProgressTimer = 0
let completionEmitted = false

// Pointer tracking
let pointerStartX = 0
let pointerStartY = 0
let activePointerId: number | null = null

const gestureLayerRef = ref<HTMLElement | null>(null)

// ========== Computed ==========
const diffConfig = computed(() => FOLD_CLOTHES_DIFFICULTIES[activeDifficulty.value])
const targetItemCount = computed(() => diffConfig.value.targetItems)
const difficultyLabel = computed(() => ({ 1: '简单', 2: '中等', 3: '困难' })[activeDifficulty.value])

/**
 * 根据 foldsPerItem 决定使用哪些步骤：
 * foldsPerItem=1 → 只做步骤3（spread→bottom，简化一步）
 * foldsPerItem=2 → 步骤1+3（spread→left→bottom）
 * foldsPerItem=3 → 完整步骤1+2+3
 */
const activeSteps = computed(() => {
  const folds = diffConfig.value.foldsPerItem
  if (folds === 1) {
    // 简化：一步到位 spread→bottom
    const step: FoldStep = {
      fromKey: 'spread',
      toKey: 'bottom',
      expectedDirection: 'swipe-up',
      instruction: '向上滑，把衣服叠好。',
      directionHint: '向上滑动',
    }
    return [step]
  }
  if (folds === 2) {
    return [ALL_FOLD_STEPS[0]!, ALL_FOLD_STEPS[2]!]
  }
  return [...ALL_FOLD_STEPS]
})

const currentStep = computed<FoldStep | null>(() => {
  const steps = activeSteps.value
  if (foldStepIndex.value >= steps.length) return null
  return steps[foldStepIndex.value] ?? null
})

const currentExpectedDirection = computed<SwipeDirection | null>(() => {
  return currentStep.value?.expectedDirection ?? null
})

const currentInstruction = computed(() => {
  if (phase.value === 'ready') return '准备好了就点「开始叠衣服」。'
  if (phase.value === 'demo') return '先看示范...'
  if (phase.value === 'awaiting') return currentStep.value?.instruction ?? ''
  if (phase.value === 'celebrating' || gameCompleted.value) return '衣服全部叠好啦，真整齐！'
  return ''
})

// ========== Helpers ==========
function directionArrow(dir: SwipeDirection): string {
  if (dir === 'swipe-right') return '\u2192'
  if (dir === 'swipe-left') return '\u2190'
  return '\u2191'
}

function directionHintText(dir: SwipeDirection): string {
  if (dir === 'swipe-right') return '向右滑'
  if (dir === 'swipe-left') return '向左滑'
  return '向上滑'
}

function detectSwipeDirection(dx: number, dy: number): SwipeDirection | null {
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx > absDy && dx > SWIPE_THRESHOLD) return 'swipe-right'
  if (absDx > absDy && dx < -SWIPE_THRESHOLD) return 'swipe-left'
  if (absDy > absDx && dy < -SWIPE_THRESHOLD) return 'swipe-up'
  return null
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
  itemIndex.value = 0
  foldStepIndex.value = 0
  currentProgressKey.value = 'spread'
  enterDemo()
  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {})
}

function resetState(): void {
  foldTimesMs.value = []
  wrongSwipeCount.value = 0
  replayCount.value = 0
  gameCompleted.value = false
  completionEmitted = false
  window.clearTimeout(demoTimer)
  window.clearTimeout(demoProgressTimer)
}

function resetRound(): void {
  window.clearTimeout(demoTimer)
  window.clearTimeout(demoProgressTimer)
  phase.value = 'ready'
  itemIndex.value = 0
  foldStepIndex.value = 0
  currentProgressKey.value = 'spread'
  gameCompleted.value = false
  completionEmitted = false
  resetState()
  props.audio.stopAmbient()
}

function enterDemo(): void {
  phase.value = 'demo'
  const steps = activeSteps.value
  currentProgressKey.value = steps.length > 0 ? steps[0]!.fromKey : 'spread'
  foldStartedAt = Date.now()

  const step = currentStep.value
  if (step) {
    props.audio.speak(`${directionHintText(step.expectedDirection)}，把衣服折好。`)
  }

  // 自动播放进度图序列演示
  let demoIdx = 0
  const stepDuration = 800
  demoProgressTimer = window.setTimeout(function advanceDemo() {
    if (demoIdx < steps.length) {
      currentProgressKey.value = steps[demoIdx]!.toKey
      demoIdx++
      demoProgressTimer = window.setTimeout(advanceDemo, stepDuration)
    }
  }, stepDuration)

  // 示范结束后进入 awaiting
  const totalDemoMs = (steps.length + 1) * stepDuration + 400
  demoTimer = window.setTimeout(() => {
    // 重置到当前步骤对应的 fromKey
    const curStep = activeSteps.value[foldStepIndex.value]
    if (curStep) {
      currentProgressKey.value = curStep.fromKey
    }
    phase.value = 'awaiting'
  }, totalDemoMs)
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

  const expected = currentExpectedDirection.value
  if (detected === expected) {
    nextFold()
  } else {
    // 方向不匹配
    wrongSwipeCount.value += 1
    props.audio.playSoftBounce().catch(() => {})
    if (expected) {
      props.audio.speak(`试试${directionHintText(expected)}。`)
    }
  }
}

function onPointerCancel(event: PointerEvent): void {
  if (event.pointerId === activePointerId) {
    activePointerId = null
  }
}

// ========== Fold Progression ==========
function nextFold(): void {
  const step = currentStep.value
  if (!step) return

  // 记录折叠时间
  if (foldStartedAt > 0) {
    foldTimesMs.value.push(Date.now() - foldStartedAt)
    foldStartedAt = Date.now()
  }

  // 更新进度图
  currentProgressKey.value = step.toKey
  props.audio.playSuccessCue().catch(() => {})

  foldStepIndex.value += 1

  // 检查当前件是否叠完
  if (foldStepIndex.value >= activeSteps.value.length) {
    // 本件完成
    itemIndex.value += 1
    if (itemIndex.value >= targetItemCount.value) {
      finishRound()
      return
    }
    // 下一件：重置步骤
    foldStepIndex.value = 0
    currentProgressKey.value = 'spread'
    props.audio.speak('做得好，叠下一件。')
    // 短暂停留后进入下一件示范
    window.setTimeout(() => {
      if (phase.value === 'awaiting' && !gameCompleted.value) {
        enterDemo()
      }
    }, 900)
  }
}

function finishRound(): void {
  if (completionEmitted) return
  completionEmitted = true
  phase.value = 'celebrating'
  gameCompleted.value = true
  props.audio.stopAmbient()
  props.audio.playSuccessCue().catch(() => {})
  props.audio.speak('衣服全部叠好啦，真整齐！你太棒了！')

  demoTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 1500)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const totalDurationSeconds = roundStartedAt > 0
    ? Number(((Date.now() - roundStartedAt) / 1000).toFixed(1))
    : 0

  const totalFolds = foldTimesMs.value.length
  const correctFolds = totalFolds
  const totalAttempts = totalFolds + wrongSwipeCount.value
  const foldAccuracyRatio = ratio(correctFolds, totalAttempts)
  const averageFoldTimeMs = averageNonNegative(foldTimesMs.value)

  // Reference isFoldAligned for alignment validation in future precision mode
  const alignmentUsed = isFoldAligned(0, diffConfig.value.alignmentToleranceRatio)
  void alignmentUsed

  return {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'swipe-fold',
      target_items: targetItemCount.value,
      folded_items: itemIndex.value,
      wrong_swipes: wrongSwipeCount.value,
      fold_accuracy_ratio: foldAccuracyRatio,
      average_fold_time_ms: averageFoldTimeMs,
      fold_times_ms: [...foldTimesMs.value],
      total_duration_seconds: totalDurationSeconds,
      replay_count: replayCount.value,
      difficulty_level: activeDifficulty.value,
      folds_per_item: diffConfig.value.foldsPerItem,
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
  window.clearTimeout(demoProgressTimer)
  props.audio.stopAll()
})
</script>

<style scoped>
/* === FoldClothesGame Styles === */
.fc-game {
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
  background: linear-gradient(155deg, #fff8e1 0%, #e8f5e9 100%);
  user-select: none;
}

.fc-game--paused {
  filter: grayscale(0.4) brightness(0.95);
  pointer-events: none;
}

/* ========== Topbar ========== */
.fc-topbar {
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

.fc-topbar__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fc-topbar__label {
  font-size: 1.1rem;
  font-weight: 700;
  color: #33691e;
}

.fc-topbar__difficulty {
  font-size: 0.82rem;
  color: rgba(62, 39, 35, 0.6);
}

.fc-topbar__bar {
  display: flex;
  gap: 6px;
  flex: 1;
}

.fc-topbar__seg {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: rgba(62, 39, 35, 0.1);
  transition: background 0.25s ease;
}

.fc-topbar__seg--current {
  background: linear-gradient(90deg, #ffb300, #ffd54f);
  animation: fc-seg-pulse 1.4s ease-in-out infinite;
}

.fc-topbar__seg--done {
  background: #66bb6a;
}

@keyframes fc-seg-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

/* ========== Stage ========== */
.fc-stage {
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

.fc-stage__scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.85;
}

.fc-stage__center {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.fc-stage__progress-wrap {
  position: relative;
  width: min(70%, 320px);
  aspect-ratio: 1 / 1;
  max-height: 70%;
}

.fc-stage__progress-img {
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
.fc-fade-enter-active,
.fc-fade-leave-active {
  transition: opacity 0.22s ease;
}

.fc-fade-enter-from,
.fc-fade-leave-to {
  opacity: 0;
}

/* ========== Gesture Layer ========== */
.fc-stage__gesture-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  touch-action: none;
  cursor: grab;
}

.fc-stage__gesture-layer:active {
  cursor: grabbing;
}

/* ========== Direction Arrow ========== */
.fc-stage__arrow {
  position: absolute;
  inset: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.fc-stage__arrow-glyph {
  font-size: clamp(48px, 10vw, 80px);
  font-weight: 900;
  color: rgba(255, 255, 255, 0.85);
  text-shadow:
    0 0 20px rgba(255, 179, 0, 0.7),
    0 4px 12px rgba(62, 39, 35, 0.3);
  animation: fc-arrow-breathe 1.6s ease-in-out infinite;
}

.fc-stage__arrow--demo .fc-stage__arrow-glyph {
  color: rgba(102, 187, 106, 0.9);
  text-shadow:
    0 0 20px rgba(102, 187, 106, 0.7),
    0 4px 12px rgba(62, 39, 35, 0.3);
  animation: fc-arrow-demo 1.2s ease-in-out infinite;
}

@keyframes fc-arrow-breathe {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.15); opacity: 1; }
}

@keyframes fc-arrow-demo {
  0% { transform: scale(0.8) translateY(8px); opacity: 0.5; }
  50% { transform: scale(1.1) translateY(-4px); opacity: 1; }
  100% { transform: scale(0.8) translateY(8px); opacity: 0.5; }
}

/* Arrow direction positioning hints */
.fc-stage__arrow--swipe-right .fc-stage__arrow-glyph {
  transform-origin: center;
}

.fc-stage__arrow--swipe-left .fc-stage__arrow-glyph {
  transform-origin: center;
}

.fc-stage__arrow--swipe-up .fc-stage__arrow-glyph {
  transform-origin: center;
}

/* Arrow fade transition */
.fc-arrow-fade-enter-active {
  transition: opacity 0.3s ease;
}

.fc-arrow-fade-leave-active {
  transition: opacity 0.15s ease;
}

.fc-arrow-fade-enter-from,
.fc-arrow-fade-leave-to {
  opacity: 0;
}

/* ========== Instruction ========== */
.fc-stage__instruction {
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

.fc-stage__instruction p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
}

/* ========== Footer ========== */
.fc-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-top: 10px;
}

.fc-btn {
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

.fc-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(62, 39, 35, 0.14);
}

.fc-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.fc-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #ffb300 0%, #ffd54f 100%);
  box-shadow: 0 8px 24px rgba(255, 179, 0, 0.3);
}

.fc-btn--secondary {
  color: #33691e;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(102, 187, 106, 0.3);
}

.fc-btn--ghost {
  color: #5d4037;
  background: rgba(255, 255, 255, 0.6);
}

/* ========== Celebration ========== */
.fc-celebrate {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(62, 39, 35, 0.4);
  backdrop-filter: blur(4px);
}

.fc-celebrate__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 40px;
  border-radius: 32px;
  background: linear-gradient(145deg, #fffde7, #fff8e1);
  box-shadow: 0 24px 60px rgba(62, 39, 35, 0.28);
  text-align: center;
  border: 3px solid #ffd54f;
}

.fc-celebrate__card strong {
  font-size: 1.5rem;
  color: #33691e;
}

.fc-celebrate__card p {
  margin: 0;
  color: rgba(62, 39, 35, 0.7);
}

.fc-celebrate-enter-active,
.fc-celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.fc-celebrate-enter-from,
.fc-celebrate-leave-to {
  opacity: 0;
}

/* ========== Responsive ========== */
@media (max-width: 720px) {
  .fc-game {
    padding: 10px;
  }

  .fc-topbar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 12px;
  }

  .fc-topbar__bar {
    width: 100%;
    order: 3;
  }

  .fc-stage__progress-wrap {
    width: min(80%, 260px);
  }

  .fc-stage__instruction {
    max-width: 94%;
    padding: 8px 14px;
    font-size: 0.92rem;
  }

  .fc-btn {
    padding: 10px 18px;
    font-size: 0.95rem;
  }

  .fc-stage__arrow-glyph {
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
