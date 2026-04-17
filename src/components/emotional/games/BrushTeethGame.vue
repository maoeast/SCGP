<template>
  <div class="prototype-game brush-teeth-game">
    <div class="prototype-game__backdrop" aria-hidden="true">
      <div class="prototype-game__glow prototype-game__glow--left brush-teeth-game__glow"></div>
      <div class="prototype-game__glow prototype-game__glow--right brush-teeth-game__glow brush-teeth-game__glow--alt"></div>
      <span
        v-for="sparkle in sparkles"
        :key="sparkle.id"
        class="prototype-game__sparkle"
        :style="{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          animationDelay: `${sparkle.delay}s`,
        }"
      />
    </div>

    <section class="prototype-game__hud">
      <article class="prototype-game__hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.label }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>完成区域</span>
        <strong>{{ progressLabel }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>方向命中</span>
        <strong>{{ accuracyLabel }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>错误方向</span>
        <strong>{{ wrongSwipes }} 次</strong>
      </article>
    </section>

    <section class="prototype-game__layout">
      <article class="prototype-game__stage prototype-game__surface">
        <div class="prototype-game__status">
          <span class="prototype-game__eyebrow">{{ stageEyebrow }}</span>
          <strong>{{ stageTitle }}</strong>
          <span class="prototype-game__helper">{{ helperMessage }}</span>
        </div>

        <section v-if="phase === 'ready'" class="brush-teeth-game__intro">
          <div class="brush-teeth-game__mouth-card">
            <div class="brush-teeth-game__mouth">
              <span class="brush-teeth-game__tooth-row"></span>
              <span class="brush-teeth-game__tooth-row brush-teeth-game__tooth-row--bottom"></span>
            </div>
          </div>
          <div class="brush-teeth-game__intro-copy">
            <h2>跟着箭头方向刷，让每个区域都慢慢变干净。</h2>
            <p>这一轮要按提示方向刷动。方向对了，区域进度会快速增加；方向不对，就要再试一次。</p>
          </div>
        </section>

        <section v-else-if="phase === 'playing'" class="brush-teeth-game__play">
          <div class="brush-teeth-game__zones">
            <div
              v-for="(zone, index) in targetZones"
              :key="zone.id"
              class="brush-teeth-game__zone-card"
              :class="{
                'is-done': index < currentZoneIndex,
                'is-current': index === currentZoneIndex,
              }"
            >
              <span>{{ zone.emoji }}</span>
              <strong>{{ zone.label }}</strong>
              <small>{{ zone.direction === 'horizontal' ? '左右刷' : '上下刷' }}</small>
            </div>
          </div>

          <div class="brush-teeth-game__board">
            <div class="brush-teeth-game__current">
              <div class="brush-teeth-game__current-copy">
                <strong>{{ currentZone?.label || '准备下一块牙面' }}</strong>
                <small>{{ currentZone?.hint }}</small>
              </div>
              <div class="brush-teeth-game__arrow" :class="`is-${currentZone?.direction || 'horizontal'}`">
                <span>{{ currentZone?.direction === 'vertical' ? '↕' : '↔' }}</span>
              </div>
            </div>

            <div
              class="brush-teeth-game__pad"
              :class="{ 'is-paused': paused }"
              @pointerdown="handlePointerDown"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerUp"
              @pointerleave="handlePointerLeave"
              @pointercancel="handlePointerLeave"
            >
              <div class="brush-teeth-game__pad-glow"></div>
              <div class="brush-teeth-game__teeth">
                <span
                  v-for="tooth in 10"
                  :key="`upper-${tooth}`"
                  class="brush-teeth-game__tooth"
                ></span>
              </div>
              <div class="brush-teeth-game__teeth brush-teeth-game__teeth--bottom">
                <span
                  v-for="tooth in 10"
                  :key="`lower-${tooth}`"
                  class="brush-teeth-game__tooth"
                ></span>
              </div>

              <div class="brush-teeth-game__brush" :style="brushStyle">
                <span class="brush-teeth-game__brush-head"></span>
                <span class="brush-teeth-game__brush-body"></span>
              </div>
            </div>

            <div class="brush-teeth-game__progress-row">
              <span>当前区域进度</span>
              <div class="prototype-game__progress-track">
                <div class="prototype-game__progress-fill" :style="{ width: `${zoneProgressPercent}%` }"></div>
              </div>
              <strong>{{ zoneProgressPercent }}%</strong>
            </div>
          </div>
        </section>

        <section v-else class="brush-teeth-game__complete">
          <div class="brush-teeth-game__complete-card">
            <span>🪥</span>
            <strong>牙齿已经刷得更干净啦</strong>
            <small>每个区域的方向和进度都已经记录完成。</small>
          </div>
        </section>
      </article>

      <aside class="prototype-game__aside prototype-game__surface">
        <div class="prototype-game__tags">
          <span class="prototype-game__tag">生活自理</span>
          <span class="prototype-game__tag prototype-game__tag--accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h1 class="prototype-game__title">刷牙小卫士</h1>
        <p class="prototype-game__copy">
          跟着不同区域的箭头方向慢慢刷，让动作路径更稳定，帮助孩子建立更清晰的刷牙习惯。
        </p>

        <div class="prototype-game__progress">
          <div class="prototype-game__progress-labels">
            <span>上排区域</span>
            <span>侧边区域</span>
            <span>全部刷完</span>
          </div>
          <div class="prototype-game__progress-track">
            <div class="prototype-game__progress-fill" :style="{ width: `${coveragePercent}%` }"></div>
          </div>
        </div>

        <section class="prototype-game__tip-grid">
          <article class="prototype-game__tip-card">
            <strong>当前方向</strong>
            <span>{{ currentZone?.direction === 'vertical' ? '上下刷' : currentZone ? '左右刷' : '等待开始' }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>平均刷动</strong>
            <span>{{ averageSwipeLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>提示等级</strong>
            <span>{{ highestPromptLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>当前提醒</strong>
            <span>{{ currentZone?.hint || '先开始第一块区域。' }}</span>
          </article>
        </section>

        <div class="prototype-game__actions">
          <button
            v-if="phase === 'ready'"
            type="button"
            class="prototype-game__button prototype-game__button--primary"
            @click="startGame"
          >
            开始刷牙练习
          </button>

          <template v-else-if="phase === 'playing'">
            <button
              type="button"
              class="prototype-game__button prototype-game__button--secondary"
              :disabled="paused"
              @click="requestPrompt"
            >
              给一点提示
            </button>
            <button
              type="button"
              class="prototype-game__button prototype-game__button--ghost"
              :disabled="paused"
              @click="resetRound"
            >
              重新开始
            </button>
          </template>

          <button
            v-else
            type="button"
            class="prototype-game__button prototype-game__button--ghost"
            @click="resetRound"
          >
            再刷一遍
          </button>
        </div>
      </aside>
    </section>

    <transition name="badge-pop">
      <div v-if="showBadge" class="prototype-game__badge-modal">
        <div class="prototype-game__badge-icon">🪥</div>
        <strong>护牙小卫士徽章</strong>
        <p>你已经按提示方向把牙面刷完啦。</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
} from '@/types/emotional/games'
import { averageNumberList, clampNumber } from './prototype-game-utils'

type Phase = 'ready' | 'playing' | 'celebrating' | 'finished'
type SwipeDirection = 'horizontal' | 'vertical'

interface SparkleDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface DifficultyConfig {
  label: string
  shortLabel: string
  zoneCount: number
  targetDistance: number
}

interface BrushZone {
  id: string
  label: string
  emoji: string
  direction: SwipeDirection
  hint: string
}

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    label: '简单 · 两块牙面',
    shortLabel: '简单',
    zoneCount: 2,
    targetDistance: 520,
  },
  2: {
    label: '中等 · 三块牙面',
    shortLabel: '中等',
    zoneCount: 3,
    targetDistance: 720,
  },
  3: {
    label: '困难 · 四块牙面',
    shortLabel: '困难',
    zoneCount: 4,
    targetDistance: 920,
  },
}

const BRUSH_ZONES: ReadonlyArray<BrushZone> = [
  { id: 'upper-front', label: '上排前侧', emoji: '🦷', direction: 'horizontal', hint: '让牙刷左右慢慢刷过门牙。' },
  { id: 'lower-front', label: '下排前侧', emoji: '🪥', direction: 'horizontal', hint: '继续左右刷，把下面这一排刷干净。' },
  { id: 'left-side', label: '左边牙面', emoji: '↕️', direction: 'vertical', hint: '沿着牙齿上下轻轻刷动。' },
  { id: 'right-side', label: '右边牙面', emoji: '↕️', direction: 'vertical', hint: '最后把这一侧上下刷干净。' },
]

const sparkles: ReadonlyArray<SparkleDot> = [
  { id: 1, left: 8, top: 18, size: 14, delay: 0.2 },
  { id: 2, left: 18, top: 78, size: 10, delay: 1.1 },
  { id: 3, left: 42, top: 18, size: 16, delay: 0.7 },
  { id: 4, left: 72, top: 14, size: 12, delay: 1.6 },
  { id: 5, left: 90, top: 60, size: 11, delay: 0.9 },
]

const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const helperMessage = ref('先看箭头，再跟着方向慢慢刷。')
const targetZones = ref<BrushZone[]>([])
const currentZoneIndex = ref(0)
const zoneProgress = ref(0)
const correctSwipes = ref(0)
const wrongSwipes = ref(0)
const promptCount = ref(0)
const swipeDurations = ref<number[]>([])
const totalCorrectDistance = ref(0)
const totalWrongDistance = ref(0)
const showBadge = ref(false)
const brushPosition = reactive({ x: 180, y: 150 })

const pointerState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  lastX: 180,
  lastY: 150,
  startedAt: 0,
})

let hasRoundDirty = false
let roundStartedAt = 0
let celebrationTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const paused = computed(() => props.paused)
const currentZone = computed(() => targetZones.value[currentZoneIndex.value] || null)
const progressLabel = computed(() => `${currentZoneIndex.value}/${targetZones.value.length || 0}`)
const coveragePercent = computed(() => {
  if (!targetZones.value.length) {
    return phase.value === 'ready' ? 0 : 100
  }

  const zoneRatio = zoneProgress.value / difficultyConfig.value.targetDistance
  return clampNumber(
    Math.round(((currentZoneIndex.value + Math.min(1, zoneRatio)) / targetZones.value.length) * 100),
    0,
    100,
  )
})
const zoneProgressPercent = computed(() => clampNumber(
  Math.round((zoneProgress.value / difficultyConfig.value.targetDistance) * 100),
  0,
  100,
))
const directionalAccuracy = computed(() => {
  const totalDistance = totalCorrectDistance.value + totalWrongDistance.value
  if (totalDistance <= 0) {
    return 0
  }

  return clampNumber(totalCorrectDistance.value / totalDistance, 0, 1)
})
const accuracyLabel = computed(() => `${Math.round(directionalAccuracy.value * 100)}%`)
const averageSwipeMs = computed(() => averageNumberList(swipeDurations.value))
const averageSwipeLabel = computed(() => {
  if (!averageSwipeMs.value) return '还没有刷动数据'
  if (averageSwipeMs.value < 1000) return `${averageSwipeMs.value}ms`
  return `${(averageSwipeMs.value / 1000).toFixed(1)} 秒`
})
const highestPromptLabel = computed(() => `Level ${clampNumber(promptCount.value, 0, 3)}`)
const stageEyebrow = computed(() => {
  if (phase.value === 'ready') return '开始前'
  if (phase.value === 'playing') return '正在刷牙'
  if (phase.value === 'celebrating') return '已完成'
  return '等待保存'
})
const stageTitle = computed(() => {
  if (phase.value === 'ready') return '先看清刷牙方向'
  if (phase.value === 'playing') return currentZone.value ? `跟着提示刷 ${currentZone.value.label}` : '继续完成刷牙区域'
  return '这一轮刷牙练习已经完成'
})
const brushStyle = computed(() => ({
  left: `${brushPosition.x}px`,
  top: `${brushPosition.y}px`,
}))

function markDirtyOnce() {
  if (hasRoundDirty) {
    return
  }

  hasRoundDirty = true
  roundStartedAt = Date.now()
  props.markRoundDirty?.()
}

function resetPointerState() {
  pointerState.active = false
  pointerState.startedAt = 0
}

function resetRound() {
  window.clearTimeout(celebrationTimer)
  phase.value = 'ready'
  activeDifficulty.value = props.difficulty
  helperMessage.value = '先看箭头，再跟着方向慢慢刷。'
  targetZones.value = []
  currentZoneIndex.value = 0
  zoneProgress.value = 0
  correctSwipes.value = 0
  wrongSwipes.value = 0
  promptCount.value = 0
  swipeDurations.value = []
  totalCorrectDistance.value = 0
  totalWrongDistance.value = 0
  showBadge.value = false
  brushPosition.x = 180
  brushPosition.y = 150
  resetPointerState()
  props.audio.stopAmbient()
}

function startGame() {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  targetZones.value = BRUSH_ZONES.slice(0, DIFFICULTY_CONFIGS[props.difficulty].zoneCount)
  currentZoneIndex.value = 0
  zoneProgress.value = 0
  correctSwipes.value = 0
  wrongSwipes.value = 0
  promptCount.value = 0
  swipeDurations.value = []
  totalCorrectDistance.value = 0
  totalWrongDistance.value = 0
  helperMessage.value = targetZones.value[0]?.hint || '先看箭头方向。'
  phase.value = 'playing'

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // Keep the round playable without audio.
  })
  props.audio.speak('跟着箭头方向慢慢刷，方向对了进度会更快。')
}

function handlePointerDown(event: PointerEvent) {
  if (paused.value || phase.value !== 'playing' || !currentZone.value) {
    return
  }

  pointerState.active = true
  pointerState.startX = event.offsetX
  pointerState.startY = event.offsetY
  pointerState.lastX = event.offsetX
  pointerState.lastY = event.offsetY
  pointerState.startedAt = Date.now()
}

function handlePointerMove(event: PointerEvent) {
  if (!pointerState.active || paused.value) {
    return
  }

  pointerState.lastX = event.offsetX
  pointerState.lastY = event.offsetY
  brushPosition.x = event.offsetX
  brushPosition.y = event.offsetY
}

function handlePointerUp(event: PointerEvent) {
  if (!pointerState.active || paused.value || phase.value !== 'playing' || !currentZone.value) {
    resetPointerState()
    return
  }

  const dx = event.offsetX - pointerState.startX
  const dy = event.offsetY - pointerState.startY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  const distance = Math.hypot(dx, dy)

  if (distance < 28) {
    resetPointerState()
    return
  }

  const direction: SwipeDirection = absDy > absDx ? 'vertical' : 'horizontal'
  const durationMs = Math.max(120, Date.now() - pointerState.startedAt)
  swipeDurations.value.push(durationMs)

  if (direction === currentZone.value.direction) {
    correctSwipes.value += 1
    totalCorrectDistance.value += distance
    zoneProgress.value = Math.min(difficultyConfig.value.targetDistance, zoneProgress.value + distance)
    helperMessage.value = zoneProgress.value >= difficultyConfig.value.targetDistance
      ? '这一块已经刷好了，准备下一块。'
      : currentZone.value.hint

    if (zoneProgress.value >= difficultyConfig.value.targetDistance) {
      currentZoneIndex.value += 1
      zoneProgress.value = 0

      if (currentZoneIndex.value >= targetZones.value.length) {
        finishRound()
      } else {
        helperMessage.value = targetZones.value[currentZoneIndex.value]?.hint || '继续刷下一块区域。'
      }
    }
  } else {
    wrongSwipes.value += 1
    totalWrongDistance.value += distance
    helperMessage.value = currentZone.value.direction === 'vertical'
      ? '这一块更适合上下刷，试着让牙刷竖着走。'
      : '这一块更适合左右刷，试着让牙刷横着走。'
    props.audio.playSoftBounce().catch(() => {
      // Soft feedback is optional.
    })
  }

  resetPointerState()
}

function handlePointerLeave() {
  if (!pointerState.active) {
    return
  }

  resetPointerState()
}

function requestPrompt() {
  if (paused.value || phase.value !== 'playing' || !currentZone.value) {
    return
  }

  promptCount.value += 1
  helperMessage.value = currentZone.value.direction === 'vertical'
    ? '看着箭头，把牙刷上下轻轻刷动。'
    : '看着箭头，让牙刷左右慢慢滑过去。'
  props.audio.speak(helperMessage.value)
}

function finishRound() {
  phase.value = 'celebrating'
  showBadge.value = true
  helperMessage.value = '每个区域都刷好了。'
  props.audio.stopAmbient()

  void Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('牙齿已经刷得更干净啦。')),
  ])

  celebrationTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 850)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  return {
    performanceData: {
      event: 'game_complete',
      final_coverage_percent: Number((coveragePercent.value / 100).toFixed(2)),
      directional_accuracy_score: Number(directionalAccuracy.value.toFixed(2)),
      highest_prompt_level: clampNumber(promptCount.value, 0, 3),
      prompt_count: promptCount.value,
      is_auto_completed: false,
      duration_seconds: roundStartedAt > 0 ? Number(((Date.now() - roundStartedAt) / 1000).toFixed(1)) : 0,
      cleaned_zone_count: Math.min(currentZoneIndex.value, targetZones.value.length),
      target_zone_count: targetZones.value.length,
      correct_swipes: correctSwipes.value,
      wrong_swipes: wrongSwipes.value,
      average_swipe_ms: averageSwipeMs.value,
      swipe_durations_ms: [...swipeDurations.value],
      zone_labels: targetZones.value.map((zone) => zone.label),
      difficulty_level: activeDifficulty.value,
    },
  }
}

watch(
  () => props.difficulty,
  (difficulty) => {
    if (phase.value !== 'ready') {
      return
    }

    activeDifficulty.value = difficulty
  },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (!isPaused) {
      return
    }

    resetPointerState()
    props.audio.stopAmbient()
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(celebrationTimer)
  props.audio.stopAll()
})
</script>

<style scoped>
@import './prototype-game-shared.css';

.brush-teeth-game {
  --prototype-background: linear-gradient(135deg, #9ee7ff 0%, #b8f2d0 46%, #ffe08f 100%);
  --prototype-progress: linear-gradient(135deg, #22c55e 0%, #38bdf8 100%);
}

.brush-teeth-game__glow {
  background: rgba(191, 219, 254, 0.42);
}

.brush-teeth-game__glow--alt {
  background: rgba(250, 204, 21, 0.24);
}

.brush-teeth-game__intro {
  display: grid;
  grid-template-columns: minmax(300px, 0.9fr) minmax(0, 1.1fr);
  gap: 26px;
  align-items: center;
  min-height: 100%;
}

.brush-teeth-game__mouth-card,
.brush-teeth-game__board {
  padding: 22px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.66);
}

.brush-teeth-game__mouth-card {
  display: grid;
  place-items: center;
  min-height: 300px;
}

.brush-teeth-game__mouth {
  position: relative;
  width: 280px;
  height: 180px;
  border-radius: 90px;
  background: linear-gradient(180deg, #fb7185 0%, #be123c 100%);
}

.brush-teeth-game__tooth-row,
.brush-teeth-game__tooth {
  display: block;
}

.brush-teeth-game__tooth-row {
  position: absolute;
  left: 22px;
  width: calc(100% - 44px);
  height: 54px;
  border-radius: 30px;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%);
}

.brush-teeth-game__tooth-row:first-child {
  top: 26px;
}

.brush-teeth-game__tooth-row--bottom {
  bottom: 26px;
}

.brush-teeth-game__intro-copy h2 {
  margin: 0 0 12px;
  font-size: 2rem;
  line-height: 1.2;
}

.brush-teeth-game__intro-copy p {
  margin: 0;
  line-height: 1.76;
}

.brush-teeth-game__play {
  display: grid;
  gap: 18px;
}

.brush-teeth-game__zones {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.brush-teeth-game__zone-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 94px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.56);
}

.brush-teeth-game__zone-card.is-current {
  outline: 3px solid rgba(34, 197, 94, 0.28);
}

.brush-teeth-game__zone-card.is-done {
  background: rgba(187, 247, 208, 0.72);
}

.brush-teeth-game__board {
  display: grid;
  gap: 18px;
}

.brush-teeth-game__current {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
}

.brush-teeth-game__current-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brush-teeth-game__arrow {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  font-size: 2rem;
}

.brush-teeth-game__pad {
  position: relative;
  min-height: 340px;
  overflow: hidden;
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(224, 242, 254, 0.96) 100%);
  touch-action: none;
}

.brush-teeth-game__pad.is-paused {
  opacity: 0.68;
}

.brush-teeth-game__pad-glow {
  position: absolute;
  inset: 24px;
  border-radius: 28px;
  background: radial-gradient(circle at center, rgba(56, 189, 248, 0.12) 0%, transparent 70%);
}

.brush-teeth-game__teeth {
  position: absolute;
  top: 62px;
  left: 50%;
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
  width: 78%;
  transform: translateX(-50%);
}

.brush-teeth-game__teeth--bottom {
  top: auto;
  bottom: 68px;
}

.brush-teeth-game__tooth {
  height: 58px;
  border-radius: 0 0 16px 16px;
  background: linear-gradient(180deg, #ffffff 0%, #dbeafe 100%);
}

.brush-teeth-game__teeth--bottom .brush-teeth-game__tooth {
  border-radius: 16px 16px 0 0;
}

.brush-teeth-game__brush {
  position: absolute;
  z-index: 1;
  width: 124px;
  height: 40px;
  transform: translate(-50%, -50%);
}

.brush-teeth-game__brush-head,
.brush-teeth-game__brush-body {
  position: absolute;
  display: block;
}

.brush-teeth-game__brush-head {
  top: 0;
  left: 0;
  width: 44px;
  height: 40px;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
}

.brush-teeth-game__brush-body {
  top: 10px;
  left: 34px;
  width: 90px;
  height: 20px;
  border-radius: 999px;
  background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%);
}

.brush-teeth-game__progress-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brush-teeth-game__complete {
  display: grid;
  place-items: center;
  min-height: 100%;
}

.brush-teeth-game__complete-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 24px 28px;
  border-radius: 28px;
  text-align: center;
  background: rgba(255, 255, 255, 0.74);
}

.brush-teeth-game__complete-card span {
  font-size: 2rem;
}

@media (max-width: 1080px) {
  .brush-teeth-game__intro {
    grid-template-columns: minmax(0, 1fr);
  }

  .brush-teeth-game__zones {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .brush-teeth-game__zones {
    grid-template-columns: minmax(0, 1fr);
  }

  .brush-teeth-game__current {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
