<template>
  <div class="puddle-ripple-game" :style="{ background: sessionTheme.skyGradient }">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="backdrop-glow" :style="{ background: sessionTheme.glowGradient }"></div>
      <span
        v-for="sparkle in BACKDROP_SPARKLES"
        :key="sparkle.id"
        class="backdrop-sparkle"
        :style="{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          animationDelay: `${sparkle.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>波纹次数</span>
        <strong>{{ rippleCount }} 次</strong>
      </div>
      <div class="hud-card">
        <span>同时触点</span>
        <strong>{{ maxConcurrentTouches }} 点</strong>
      </div>
      <div class="hud-card">
        <span>{{ responseCardLabel }}</span>
        <strong>{{ responseCardValue }}</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip">
          <span>{{ statusEyebrow }}</span>
          <strong>{{ statusTitle }}</strong>
        </div>

        <div class="pond-card">
          <div class="pond-copy">
            <strong>{{ stageMessage }}</strong>
            <small>{{ helperMessage }}</small>
          </div>

          <div class="horizon-band" :style="{ background: sessionTheme.horizonGradient }"></div>

          <div
            ref="pondSurfaceRef"
            class="pond-surface"
            :style="{ background: sessionTheme.pondGradient }"
            @pointerdown.prevent="handlePointerDown"
          >
            <div class="pond-shimmer pond-shimmer--left"></div>
            <div class="pond-shimmer pond-shimmer--right"></div>

            <span
              v-for="leaf in FLOATING_LEAVES"
              :key="leaf.id"
              class="floating-leaf"
              :style="{
                left: `${leaf.left}%`,
                top: `${leaf.top}%`,
                width: `${leaf.size}px`,
                height: `${leaf.size * 0.62}px`,
                animationDelay: `${leaf.delay}s`,
                animationDuration: `${leaf.duration}s`,
                background: leaf.color,
                transform: `rotate(${leaf.rotation}deg)`,
              }"
            />

            <div
              v-if="currentPrompt"
              class="guidance-ring"
              :style="guidanceRingStyle"
            >
              <div class="guidance-core"></div>
              <span class="guidance-label">{{ currentPrompt.label }}</span>
            </div>

            <div
              v-for="ripple in ripples"
              :key="ripple.id"
              class="water-ripple"
              :style="getRippleStyle(ripple)"
            />

            <div
              v-for="marker in touchMarkers"
              :key="marker.id"
              class="touch-marker"
              :style="{
                left: `${marker.xRatio * 100}%`,
                top: `${marker.yRatio * 100}%`,
              }"
            />
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>安抚教具</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>水塘波纹</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ panelHint }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>轻轻触碰</span>
            <span>波纹扩散</span>
            <span>手动保存</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(completionRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>引导命中</strong>
            <span>{{ guidanceProgressLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>多点支持</strong>
            <span>{{ dualTouchLabel }}</span>
          </div>
        </div>

        <div class="action-row">
          <button
            v-if="phase === 'ready'"
            class="primary-action"
            type="button"
            @click="startRound"
          >
            开始轻点水面
          </button>

          <template v-else-if="phase === 'playing'">
            <button
              class="primary-action"
              type="button"
              :disabled="!canFinishSession"
              @click="finishSession"
            >
              安静保存这一轮
            </button>
            <button
              class="secondary-action"
              type="button"
              @click="resetForDifficulty(activeDifficulty)"
            >
              重新换一片水面
            </button>
          </template>

          <div v-else class="completion-note">
            水面已经安静收好，这一轮的波纹记录正在保存。
          </div>
        </div>

        <p class="finish-note">
          这一游戏不会自动结束；至少轻点 {{ difficultyConfig.minRipplesToComplete }} 次后，教师可手动保存本轮。
        </p>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">💧</div>
        <strong>静水涟漪徽章</strong>
        <p>{{ sessionTheme.badgeCopy }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
  EmotionGameSettings,
} from '@/types/emotional/games'

type Phase = 'ready' | 'playing' | 'celebrating' | 'finished'
type PromptMode = 'none' | 'guided'
type RippleSource = 'tap' | 'hold' | 'prompt'

interface DifficultyConfig {
  label: string
  shortLabel: string
  readyText: string
  helperText: string
  activeText: string
  activeHint: string
  completionText: string
  minRipplesToComplete: number
  promptMode: PromptMode
  promptRadiusPx: number
  promptWindowMs: number
  promptGapMs: number
  holdRippleIntervalMs: number
  hitText: string
  missText: string
}

interface Theme {
  key: string
  title: string
  skyGradient: string
  glowGradient: string
  horizonGradient: string
  pondGradient: string
  badgeCopy: string
  celebrationLine: string
}

interface Ripple {
  id: number
  xRatio: number
  yRatio: number
  radius: number
  opacity: number
  lineWidth: number
  hue: number
  source: RippleSource
}

interface ActivePointer {
  id: number
  xRatio: number
  yRatio: number
  startedAt: number
  lastRippleAt: number
}

interface GuidedPrompt {
  id: number
  xRatio: number
  yRatio: number
  radiusPx: number
  createdAt: number
  expiresAt: number
  label: string
}

interface PointRatio {
  xRatio: number
  yRatio: number
  rectWidth: number
  rectHeight: number
}

interface Sparkle {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface FloatingLeaf {
  id: number
  left: number
  top: number
  size: number
  rotation: number
  delay: number
  duration: number
  color: string
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    label: '简单 · 自由轻点',
    shortLabel: '简单',
    readyText: '先把手轻轻放在水面上，点一下、停一下，让第一圈波纹慢慢荡开。',
    helperText: '简单模式没有固定节奏要求，只要温和地轻点、轻按，让自己慢慢安静下来就可以。',
    activeText: '水面已经准备好了，慢慢轻点，看看波纹一圈圈散开。',
    activeHint: '如果孩子愿意，可以试着轻按一会儿，让波纹持续扩散；本轮不会自动结束。',
    completionText: '这一轮的水面已经安静收好，你让波纹慢慢地散开了。',
    minRipplesToComplete: 8,
    promptMode: 'none',
    promptRadiusPx: 0,
    promptWindowMs: 0,
    promptGapMs: 0,
    holdRippleIntervalMs: 520,
    hitText: '这圈波纹很柔和，继续慢慢来就可以。',
    missText: '继续保持温和触碰，水面会一直等着你。',
  },
  2: {
    label: '中等 · 跟着柔波点',
    shortLabel: '中等',
    readyText: '中等模式会在水面上出现柔波光圈，试着跟着它轻轻点一下，再等下一圈。',
    helperText: '看到光圈时轻点一下，没有出现光圈时也可以先慢慢摸一摸水面，保持节奏。',
    activeText: '柔波光圈会轮流出现在水面上，跟着它慢慢轻点，让节奏稳定下来。',
    activeHint: '命中光圈会得到更大的波纹反馈；即使错过了也不会结束，可以安静等下一圈。',
    completionText: '你已经跟着水面节奏完成了一轮柔波练习，水塘慢慢平静下来了。',
    minRipplesToComplete: 10,
    promptMode: 'guided',
    promptRadiusPx: 72,
    promptWindowMs: 2300,
    promptGapMs: 950,
    holdRippleIntervalMs: 440,
    hitText: '这一圈柔波已经接住了，慢慢等下一圈就好。',
    missText: '这一圈已经散开了，没关系，等下一圈柔波再轻轻点一下。',
  },
  3: {
    label: '困难 · 连续柔波',
    shortLabel: '困难',
    readyText: '困难模式里的光圈会更小、更快。可以单手连续轻点，也可以在支持触屏时尝试双手一起点出更大的波纹。',
    helperText: '这一轮重点是连续、柔和地接住水面节奏，而不是追求速度；多点触碰会生成更大的双波纹。',
    activeText: '水面节奏已经开始，继续安静地跟着光圈轻点，让波纹一圈接一圈连起来。',
    activeHint: '如果设备支持触摸，可尝试双手轮流或同时触碰；没有多点触摸时，单手连续轻点也可以正常完成。',
    completionText: '这一轮连续柔波已经保存好了，你让整片水塘都慢慢安静下来了。',
    minRipplesToComplete: 12,
    promptMode: 'guided',
    promptRadiusPx: 58,
    promptWindowMs: 1900,
    promptGapMs: 760,
    holdRippleIntervalMs: 360,
    hitText: '这一圈接得很稳，继续保持温和的节奏。',
    missText: '水面正在等下一圈节奏，先把手放轻一点，再继续。',
  },
}

const THEMES: readonly Theme[] = [
  {
    key: 'pond-morning',
    title: '晨光水塘',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.48), transparent 34%), linear-gradient(180deg, #8fd7ff 0%, #dff4ff 52%, #f8f7d5 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0))',
    horizonGradient: 'linear-gradient(180deg, rgba(158, 215, 184, 0.88) 0%, rgba(118, 185, 151, 0.2) 100%)',
    pondGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.32), transparent 28%), linear-gradient(180deg, #b8efff 0%, #79cfe8 52%, #4788a6 100%)',
    badgeCopy: '晨光下的波纹已经被你慢慢安静下来，静水涟漪徽章亮起来了。',
    celebrationLine: '这片晨光水塘已经慢慢安静下来啦。',
  },
  {
    key: 'pond-evening',
    title: '晚霞水塘',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.32), transparent 34%), linear-gradient(180deg, #7fbfff 0%, #b8d7ff 34%, #f7cfa7 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 217, 177, 0.92), rgba(255, 217, 177, 0))',
    horizonGradient: 'linear-gradient(180deg, rgba(180, 204, 142, 0.9) 0%, rgba(180, 204, 142, 0.16) 100%)',
    pondGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.3), transparent 30%), linear-gradient(180deg, #95d4ff 0%, #60aedd 48%, #355f84 100%)',
    badgeCopy: '晚霞映着水面一圈圈散开，你已经稳稳完成这一轮柔波练习了。',
    celebrationLine: '晚霞下的水波已经慢慢收好了。',
  },
  {
    key: 'pond-night',
    title: '月夜水塘',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.18), transparent 28%), linear-gradient(180deg, #537ab9 0%, #88a8d8 34%, #d5dfef 100%)',
    glowGradient: 'radial-gradient(circle, rgba(210, 232, 255, 0.84), rgba(210, 232, 255, 0))',
    horizonGradient: 'linear-gradient(180deg, rgba(120, 154, 132, 0.82) 0%, rgba(120, 154, 132, 0.14) 100%)',
    pondGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.22), transparent 30%), linear-gradient(180deg, #8bc8ef 0%, #5b94c2 46%, #2b4f73 100%)',
    badgeCopy: '月夜里的波纹被你轻轻安抚好了，整片水面都静下来了。',
    celebrationLine: '月夜水塘已经慢慢安静下来，做得很好。',
  },
]

const BACKDROP_SPARKLES: readonly Sparkle[] = [
  { id: 1, left: 8, top: 14, size: 12, delay: 0 },
  { id: 2, left: 22, top: 28, size: 8, delay: 1.2 },
  { id: 3, left: 36, top: 10, size: 14, delay: 0.4 },
  { id: 4, left: 61, top: 18, size: 10, delay: 1.8 },
  { id: 5, left: 74, top: 8, size: 7, delay: 0.9 },
  { id: 6, left: 86, top: 24, size: 12, delay: 1.6 },
]

const FLOATING_LEAVES: readonly FloatingLeaf[] = [
  { id: 1, left: 16, top: 30, size: 34, rotation: -14, delay: 0, duration: 6.8, color: 'linear-gradient(135deg, #f7c978 0%, #e4984d 100%)' },
  { id: 2, left: 28, top: 62, size: 28, rotation: 18, delay: 0.6, duration: 7.5, color: 'linear-gradient(135deg, #f8e88e 0%, #d7b84c 100%)' },
  { id: 3, left: 54, top: 24, size: 24, rotation: -8, delay: 1.3, duration: 6.2, color: 'linear-gradient(135deg, #ffcf9d 0%, #f19b7b 100%)' },
  { id: 4, left: 68, top: 54, size: 32, rotation: 12, delay: 1.1, duration: 8.1, color: 'linear-gradient(135deg, #f9d57d 0%, #ebb053 100%)' },
  { id: 5, left: 82, top: 36, size: 26, rotation: -20, delay: 0.2, duration: 7.2, color: 'linear-gradient(135deg, #ffdca5 0%, #f0b36a 100%)' },
]

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  settings: EmotionGameSettings
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const pondSurfaceRef = ref<HTMLElement | null>(null)
const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const sessionTheme = ref<Theme>(pickRandomTheme())
const stageMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].readyText)
const helperMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].helperText)
const showBadge = ref(false)
const ripples = ref<Ripple[]>([])
const touchMarkers = ref<Array<{ id: number; xRatio: number; yRatio: number }>>([])
const currentPrompt = ref<GuidedPrompt | null>(null)

const rippleCount = ref(0)
const promptHits = ref(0)
const promptMisses = ref(0)
const guidedPromptCount = ref(0)
const dualTouchRipples = ref(0)
const holdGeneratedRipples = ref(0)
const maxConcurrentTouches = ref(0)
const holdSamplesMs = ref<number[]>([])
const promptResponseTimesMs = ref<number[]>([])

const activePointers = new Map<number, ActivePointer>()
const activeTimeouts = new Set<number>()

let animationFrame = 0
let lastFrameAt = 0
let nextPromptAt = Number.POSITIVE_INFINITY
let hasPointerListeners = false
let rippleId = 0
let promptId = 0
let roundDirty = false

const displayDifficulty = computed(() => (phase.value === 'ready' ? props.difficulty : activeDifficulty.value))
const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[displayDifficulty.value])
const difficultyLabel = computed(() => difficultyConfig.value.label)
const averageHoldMs = computed(() => averageNumberList(holdSamplesMs.value))
const averagePromptResponseMs = computed(() => averageNumberList(promptResponseTimesMs.value))
const responseCardLabel = computed(() => (difficultyConfig.value.promptMode === 'guided' ? '平均应答' : '平均按住'))
const responseCardValue = computed(() => {
  const sourceValue = difficultyConfig.value.promptMode === 'guided'
    ? averagePromptResponseMs.value
    : averageHoldMs.value
  return formatDurationMs(sourceValue)
})
const guidanceProgressLabel = computed(() => {
  if (difficultyConfig.value.promptMode === 'none') {
    return '自由轻点'
  }

  if (guidedPromptCount.value === 0) {
    return '等待第一圈'
  }

  return `${promptHits.value}/${guidedPromptCount.value} 次`
})
const dualTouchLabel = computed(() => {
  if (dualTouchRipples.value <= 0) {
    return '已支持多点'
  }

  return `${dualTouchRipples.value} 次双波纹`
})
const canFinishSession = computed(() => phase.value === 'playing' && rippleCount.value >= difficultyConfig.value.minRipplesToComplete)
const completionRatio = computed(() => {
  const baseRatio = Math.min(1, rippleCount.value / Math.max(1, difficultyConfig.value.minRipplesToComplete))

  if (difficultyConfig.value.promptMode === 'none') {
    return baseRatio
  }

  const promptRatio = guidedPromptCount.value > 0
    ? promptHits.value / guidedPromptCount.value
    : 0

  return Math.max(baseRatio * 0.5, Math.min(1, 0.45 + promptRatio * 0.55))
})
const guidanceRingStyle = computed(() => {
  if (!currentPrompt.value) {
    return {}
  }

  const diameter = currentPrompt.value.radiusPx * 2
  return {
    left: `${currentPrompt.value.xRatio * 100}%`,
    top: `${currentPrompt.value.yRatio * 100}%`,
    width: `${diameter}px`,
    height: `${diameter}px`,
    marginLeft: `${-currentPrompt.value.radiusPx}px`,
    marginTop: `${-currentPrompt.value.radiusPx}px`,
  }
})
const statusEyebrow = computed(() => {
  if (phase.value === 'ready') return sessionTheme.value.title
  if (phase.value === 'celebrating' || phase.value === 'finished') return '本轮已保存'
  if (currentPrompt.value) return '跟着柔波点'
  return '自由波纹'
})
const statusTitle = computed(() => {
  if (phase.value === 'ready') {
    return '先轻轻开始，再让波纹自己慢慢散开。'
  }

  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.completionText
  }

  if (currentPrompt.value) {
    return currentPrompt.value.label
  }

  return '水面不会自动结束，保持舒服的节奏就可以。'
})
const panelDescription = computed(() => {
  if (phase.value === 'ready') {
    return difficultyConfig.value.readyText
  }

  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.completionText
  }

  return difficultyConfig.value.activeText
})
const panelHint = computed(() => {
  if (phase.value === 'ready') {
    return difficultyConfig.value.helperText
  }

  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '这一轮已经保存完成，稍后会自动回到新的静水面。'
  }

  return difficultyConfig.value.activeHint
})

function formatDurationMs(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '-'
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`
  }

  return `${(value / 1000).toFixed(1)}秒`
}

function averageNumberList(values: number[]) {
  if (!values.length) {
    return null
  }

  const total = values.reduce((sum, value) => sum + value, 0)
  return Math.round(total / values.length)
}

function shuffleArray<T>(items: readonly T[]) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index] as T
    next[index] = next[swapIndex] as T
    next[swapIndex] = current
  }

  return next
}

function pickRandomTheme() {
  return shuffleArray(THEMES)[0] || THEMES[0]!
}

function scheduleTimeout(callback: () => void, delayMs: number) {
  const timerId = window.setTimeout(() => {
    activeTimeouts.delete(timerId)
    callback()
  }, delayMs)
  activeTimeouts.add(timerId)
  return timerId
}

function clearAllTimers() {
  activeTimeouts.forEach((timerId) => {
    window.clearTimeout(timerId)
  })
  activeTimeouts.clear()
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function startAmbientIfNeeded() {
  if (!props.settings.effectsEnabled || props.paused || phase.value !== 'playing') {
    return
  }

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore audio setup failures
  })
}

function playSoftCue() {
  if (!props.settings.effectsEnabled) {
    return
  }

  props.audio.playSoftBounce().catch(() => {
    // ignore cue failures
  })
}

function playSuccessCue(line: string) {
  if (!props.settings.effectsEnabled) {
    return
  }

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak(line)),
  ])
}

function syncTouchMarkers() {
  touchMarkers.value = Array.from(activePointers.values()).map((pointer) => ({
    id: pointer.id,
    xRatio: pointer.xRatio,
    yRatio: pointer.yRatio,
  }))
}

function attachPointerListeners() {
  if (hasPointerListeners) {
    return
  }

  hasPointerListeners = true
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

function detachPointerListeners() {
  if (!hasPointerListeners) {
    return
  }

  hasPointerListeners = false
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

function flushActivePointerSamples(now = performance.now()) {
  activePointers.forEach((pointer) => {
    const duration = Math.round(Math.max(0, now - pointer.startedAt))
    if (duration >= 120) {
      holdSamplesMs.value = [...holdSamplesMs.value, duration]
    }
  })
}

function clearActivePointers(flushSamples = false) {
  if (flushSamples) {
    flushActivePointerSamples()
  }

  activePointers.clear()
  syncTouchMarkers()
}

function resetMetrics() {
  ripples.value = []
  touchMarkers.value = []
  currentPrompt.value = null
  rippleCount.value = 0
  promptHits.value = 0
  promptMisses.value = 0
  guidedPromptCount.value = 0
  dualTouchRipples.value = 0
  holdGeneratedRipples.value = 0
  maxConcurrentTouches.value = 0
  holdSamplesMs.value = []
  promptResponseTimesMs.value = []
  nextPromptAt = Number.POSITIVE_INFINITY
  roundDirty = false
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  clearActivePointers(false)
  activeDifficulty.value = difficulty
  sessionTheme.value = pickRandomTheme()
  phase.value = 'ready'
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].readyText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].helperText
  showBadge.value = false
  resetMetrics()
  props.audio.stopAmbient()
}

function startRound() {
  clearAllTimers()
  clearActivePointers(false)
  activeDifficulty.value = props.difficulty
  sessionTheme.value = pickRandomTheme()
  phase.value = 'playing'
  stageMessage.value = DIFFICULTY_CONFIGS[activeDifficulty.value].activeText
  helperMessage.value = DIFFICULTY_CONFIGS[activeDifficulty.value].activeHint
  showBadge.value = false
  resetMetrics()
  if (DIFFICULTY_CONFIGS[activeDifficulty.value].promptMode === 'guided') {
    nextPromptAt = performance.now() + 720
  }
  startAmbientIfNeeded()
}

function buildPerformanceData() {
  return {
    ripple_count: rippleCount.value,
    prompt_hits: promptHits.value,
    prompt_misses: promptMisses.value,
    guided_prompt_count: guidedPromptCount.value,
    dual_touch_ripples: dualTouchRipples.value,
    max_concurrent_touches: maxConcurrentTouches.value,
    hold_generated_ripples: holdGeneratedRipples.value,
    hold_samples_ms: [...holdSamplesMs.value],
    average_hold_ms: averageHoldMs.value,
    prompt_response_times_ms: [...promptResponseTimesMs.value],
    average_prompt_response_ms: averagePromptResponseMs.value,
    prompt_radius_px: difficultyConfig.value.promptRadiusPx,
    free_play_mode: difficultyConfig.value.promptMode === 'none',
    session_theme: sessionTheme.value.key,
    session_theme_title: sessionTheme.value.title,
    support_multitouch: true,
  }
}

function finishSession() {
  if (!canFinishSession.value || phase.value === 'celebrating' || phase.value === 'finished') {
    return
  }

  flushActivePointerSamples()
  clearActivePointers(false)
  phase.value = 'celebrating'
  currentPrompt.value = null
  stageMessage.value = difficultyConfig.value.completionText
  helperMessage.value = '这一轮不会自动结束，已经按教师操作安静保存。'
  props.audio.stopAmbient()
  playSuccessCue(sessionTheme.value.celebrationLine)

  scheduleTimeout(() => {
    showBadge.value = true
  }, 420)

  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_RIPPLE_CALM',
        badgeName: '静水涟漪徽章',
      },
    })
    phase.value = 'finished'
  }, 1120)

  scheduleTimeout(() => {
    if (!props.paused) {
      resetForDifficulty(activeDifficulty.value)
    }
  }, 2900)
}

function createRipple(xRatio: number, yRatio: number, source: RippleSource) {
  rippleId += 1
  rippleCount.value += 1

  if (source === 'hold') {
    holdGeneratedRipples.value += 1
  }

  if (activePointers.size > 1) {
    dualTouchRipples.value += 1
  }

  const nextRipple: Ripple = {
    id: rippleId,
    xRatio,
    yRatio,
    radius: source === 'prompt' ? 38 : 30,
    opacity: source === 'prompt' ? 0.96 : 0.84,
    lineWidth: source === 'hold' ? 3 : source === 'prompt' ? 5 : 4,
    hue: source === 'prompt' ? 178 : source === 'hold' ? 196 : 205,
    source,
  }

  ripples.value = [...ripples.value.slice(-24), nextRipple]
}

function getRippleStyle(ripple: Ripple) {
  const diameter = ripple.radius * 2
  return {
    left: `${ripple.xRatio * 100}%`,
    top: `${ripple.yRatio * 100}%`,
    width: `${diameter}px`,
    height: `${diameter}px`,
    marginLeft: `${-ripple.radius}px`,
    marginTop: `${-ripple.radius}px`,
    opacity: ripple.opacity,
    borderWidth: `${ripple.lineWidth}px`,
    borderColor: `hsla(${ripple.hue}, 78%, 96%, ${Math.min(1, ripple.opacity + 0.12)})`,
    boxShadow: `0 0 0 ${Math.max(0, ripple.lineWidth - 1)}px rgba(255, 255, 255, ${ripple.opacity * 0.18}) inset`,
  }
}

function getRelativePoint(event: PointerEvent): PointRatio | null {
  const element = pondSurfaceRef.value
  if (!element) {
    return null
  }

  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    return null
  }

  const xRatio = Math.max(0.04, Math.min(0.96, (event.clientX - rect.left) / rect.width))
  const yRatio = Math.max(0.08, Math.min(0.92, (event.clientY - rect.top) / rect.height))

  return {
    xRatio,
    yRatio,
    rectWidth: rect.width,
    rectHeight: rect.height,
  }
}

function isPromptHit(point: PointRatio, prompt: GuidedPrompt) {
  const dx = (point.xRatio - prompt.xRatio) * point.rectWidth
  const dy = (point.yRatio - prompt.yRatio) * point.rectHeight
  return Math.hypot(dx, dy) <= prompt.radiusPx
}

function resolvePromptHit(point: PointRatio, now: number) {
  const prompt = currentPrompt.value
  if (!prompt || !isPromptHit(point, prompt)) {
    return false
  }

  promptHits.value += 1
  promptResponseTimesMs.value = [
    ...promptResponseTimesMs.value,
    Math.max(0, Math.round(now - prompt.createdAt)),
  ]
  currentPrompt.value = null
  nextPromptAt = now + difficultyConfig.value.promptGapMs
  stageMessage.value = difficultyConfig.value.hitText
  helperMessage.value = activeDifficulty.value === 3
    ? '如果设备支持触屏，可以试着双手轮流或同时点一下，让波纹更完整。'
    : '继续慢慢等下一圈柔波，不需要着急追快。'
  playSoftCue()
  return true
}

function spawnPrompt(now: number) {
  if (difficultyConfig.value.promptMode === 'none') {
    return
  }

  const prevPrompt = currentPrompt.value
  let xRatio = 0.18 + Math.random() * 0.64
  let yRatio = 0.22 + Math.random() * 0.54

  if (prevPrompt) {
    const delta = Math.hypot(xRatio - prevPrompt.xRatio, yRatio - prevPrompt.yRatio)
    if (delta < 0.18) {
      xRatio = Math.max(0.18, Math.min(0.82, xRatio + 0.2))
      yRatio = Math.max(0.22, Math.min(0.76, yRatio + 0.14))
    }
  }

  guidedPromptCount.value += 1
  promptId += 1
  currentPrompt.value = {
    id: promptId,
    xRatio,
    yRatio,
    radiusPx: difficultyConfig.value.promptRadiusPx,
    createdAt: now,
    expiresAt: now + difficultyConfig.value.promptWindowMs,
    label: activeDifficulty.value === 3 ? '轻点这圈柔波' : '跟着光圈轻点一下',
  }
}

function expirePrompt(now: number) {
  if (!currentPrompt.value) {
    return
  }

  currentPrompt.value = null
  promptMisses.value += 1
  nextPromptAt = now + difficultyConfig.value.promptGapMs
  stageMessage.value = difficultyConfig.value.missText
  helperMessage.value = '没关系，水面不会结束，先等下一圈柔波再轻轻点一下。'
}

function handlePointerDown(event: PointerEvent) {
  if (props.paused || phase.value !== 'playing') {
    return
  }

  const point = getRelativePoint(event)
  if (!point) {
    return
  }

  attachPointerListeners()

  try {
    pondSurfaceRef.value?.setPointerCapture?.(event.pointerId)
  } catch {
    // ignore capture failures
  }

  const now = performance.now()
  activePointers.set(event.pointerId, {
    id: event.pointerId,
    xRatio: point.xRatio,
    yRatio: point.yRatio,
    startedAt: now,
    lastRippleAt: now,
  })
  maxConcurrentTouches.value = Math.max(maxConcurrentTouches.value, activePointers.size)
  syncTouchMarkers()
  markRoundDirtyOnce()

  const promptResolved = resolvePromptHit(point, now)
  createRipple(point.xRatio, point.yRatio, promptResolved ? 'prompt' : 'tap')
}

function handlePointerMove(event: PointerEvent) {
  const pointer = activePointers.get(event.pointerId)
  if (!pointer || props.paused || phase.value !== 'playing') {
    return
  }

  const point = getRelativePoint(event)
  if (!point) {
    return
  }

  event.preventDefault()
  const now = performance.now()
  const dx = point.xRatio - pointer.xRatio
  const dy = point.yRatio - pointer.yRatio

  pointer.xRatio = point.xRatio
  pointer.yRatio = point.yRatio
  syncTouchMarkers()

  if (Math.hypot(dx, dy) >= 0.04 && now - pointer.lastRippleAt >= difficultyConfig.value.holdRippleIntervalMs * 0.7) {
    createRipple(point.xRatio, point.yRatio, 'hold')
    pointer.lastRippleAt = now
  }
}

function handlePointerUp(event: PointerEvent) {
  const pointer = activePointers.get(event.pointerId)
  if (!pointer) {
    return
  }

  const heldMs = Math.round(Math.max(0, performance.now() - pointer.startedAt))
  if (heldMs >= 120) {
    holdSamplesMs.value = [...holdSamplesMs.value, heldMs]
  }

  activePointers.delete(event.pointerId)
  syncTouchMarkers()

  try {
    pondSurfaceRef.value?.releasePointerCapture?.(event.pointerId)
  } catch {
    // ignore release failures
  }
}

function stepAnimation(now: number) {
  if (!lastFrameAt) {
    lastFrameAt = now
  }

  const deltaMs = Math.min(48, Math.max(0, now - lastFrameAt))
  lastFrameAt = now

  if (ripples.value.length > 0) {
    const nextRipples = ripples.value
      .map((ripple) => {
        const speed = ripple.source === 'hold' ? 62 : ripple.source === 'prompt' ? 96 : 82
        const fade = ripple.source === 'prompt' ? 0.00066 : 0.00054
        return {
          ...ripple,
          radius: ripple.radius + speed * (deltaMs / 1000),
          opacity: ripple.opacity - fade * deltaMs,
        }
      })
      .filter((ripple) => ripple.opacity > 0.02 && ripple.radius < 228)

    ripples.value = nextRipples
  }

  if (!props.paused && phase.value === 'playing') {
    activePointers.forEach((pointer) => {
      if (now - pointer.lastRippleAt >= difficultyConfig.value.holdRippleIntervalMs) {
        createRipple(pointer.xRatio, pointer.yRatio, 'hold')
        pointer.lastRippleAt = now
      }
    })

    if (difficultyConfig.value.promptMode === 'guided') {
      if (!currentPrompt.value && now >= nextPromptAt) {
        spawnPrompt(now)
      }

      if (currentPrompt.value && now >= currentPrompt.value.expiresAt) {
        expirePrompt(now)
      }
    }
  }

  animationFrame = window.requestAnimationFrame(stepAnimation)
}

watch(
  () => props.difficulty,
  (difficulty) => {
    resetForDifficulty(difficulty)
  },
)

watch(
  () => props.paused,
  (paused) => {
    if (paused) {
      clearActivePointers(true)
      props.audio.stopAmbient()
      return
    }

    if (phase.value === 'playing') {
      startAmbientIfNeeded()
    }
  },
)

watch(
  () => props.settings.effectsEnabled,
  (enabled) => {
    if (!enabled) {
      props.audio.stopAll()
      return
    }

    if (phase.value === 'playing' && !props.paused) {
      startAmbientIfNeeded()
    }
  },
)

onMounted(() => {
  resetForDifficulty(props.difficulty)
  animationFrame = window.requestAnimationFrame(stepAnimation)
})

onBeforeUnmount(() => {
  clearAllTimers()
  clearActivePointers(false)
  detachPointerListeners()
  props.audio.stopAll()
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
})
</script>

<style scoped>
.puddle-ripple-game {
  position: relative;
  min-height: calc(100vh - 150px);
  padding: 24px;
  overflow: hidden;
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.backdrop-glow {
  position: absolute;
  top: 32px;
  left: 50%;
  width: min(60vw, 520px);
  height: min(32vw, 260px);
  transform: translateX(-50%);
  filter: blur(18px);
  opacity: 0.72;
}

.backdrop-sparkle {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.28);
  animation: sparkleFloat 5.8s ease-in-out infinite;
}

.hud-panel {
  position: absolute;
  top: 102px;
  left: 24px;
  right: 24px;
  z-index: 8;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.hud-card {
  min-height: 80px;
  padding: 14px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 16px 28px rgba(56, 103, 135, 0.14);
  backdrop-filter: blur(10px);
}

.hud-card span {
  display: block;
  margin-bottom: 8px;
  color: #68849a;
  font-size: 13px;
}

.hud-card strong {
  display: block;
  color: #23465d;
  font-size: 20px;
}

.stage-layout {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.9fr);
  gap: 22px;
  align-items: end;
  min-height: calc(100vh - 180px);
  padding-top: 136px;
}

.stage-panel,
.instruction-panel {
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 22px 42px rgba(53, 98, 129, 0.16);
  backdrop-filter: blur(12px);
}

.stage-panel {
  padding: 22px;
}

.status-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.status-strip span {
  color: #608098;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.status-strip strong {
  color: #24445b;
  font-size: 26px;
  line-height: 1.35;
}

.pond-card {
  position: relative;
  overflow: hidden;
  min-height: 520px;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.62) 0%, rgba(226, 244, 255, 0.72) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.pond-copy {
  position: absolute;
  top: 28px;
  left: 28px;
  right: 28px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pond-copy strong {
  color: #28495f;
  font-size: 24px;
  line-height: 1.4;
}

.pond-copy small {
  max-width: 420px;
  color: #66839a;
  line-height: 1.6;
}

.horizon-band {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 148px;
  height: 118px;
  opacity: 0.92;
}

.pond-surface {
  position: absolute;
  left: 50%;
  right: auto;
  bottom: 28px;
  width: min(92%, 760px);
  height: 308px;
  transform: translateX(-50%);
  border-radius: 48% 52% 46% 54% / 58% 56% 44% 42%;
  overflow: hidden;
  box-shadow:
    inset 0 20px 34px rgba(255, 255, 255, 0.24),
    inset 0 -24px 38px rgba(37, 91, 126, 0.2),
    0 32px 52px rgba(43, 83, 111, 0.18);
  touch-action: none;
  cursor: pointer;
}

.pond-shimmer {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  filter: blur(2px);
}

.pond-shimmer--left {
  top: 44px;
  left: 18%;
  width: 180px;
  height: 28px;
}

.pond-shimmer--right {
  top: 122px;
  right: 14%;
  width: 130px;
  height: 18px;
}

.floating-leaf {
  position: absolute;
  border-radius: 90% 10% 90% 10%;
  opacity: 0.9;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  animation: leafDrift ease-in-out infinite;
}

.guidance-ring {
  position: absolute;
  z-index: 6;
  border-radius: 999px;
  border: 3px solid rgba(255, 252, 233, 0.92);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.08) 42%, rgba(255, 255, 255, 0) 70%);
  box-shadow:
    0 0 0 14px rgba(255, 255, 255, 0.08),
    0 0 34px rgba(245, 252, 255, 0.5);
  animation: guidancePulse 1.7s ease-in-out infinite;
  pointer-events: none;
}

.guidance-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.66);
}

.guidance-label {
  position: absolute;
  left: 50%;
  top: calc(100% + 12px);
  transform: translateX(-50%);
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #2b536c;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 10px 18px rgba(67, 106, 131, 0.14);
}

.water-ripple {
  position: absolute;
  z-index: 4;
  border-style: solid;
  border-radius: 999px;
  pointer-events: none;
}

.touch-marker {
  position: absolute;
  z-index: 7;
  width: 18px;
  height: 18px;
  margin-left: -9px;
  margin-top: -9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 0 0 8px rgba(255, 255, 255, 0.16),
    0 0 18px rgba(255, 255, 255, 0.42);
  pointer-events: none;
}

.instruction-panel {
  align-self: stretch;
  padding: 22px 24px 24px;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.panel-tags span {
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(111, 165, 198, 0.12);
  color: #4c7089;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.panel-tags .accent {
  background: rgba(78, 189, 207, 0.16);
  color: #1d8194;
}

.instruction-panel h2 {
  margin: 0;
  color: #23465d;
  font-size: 34px;
}

.instruction-panel p {
  margin: 16px 0 8px;
  color: #48657b;
  font-size: 16px;
  line-height: 1.8;
}

.instruction-panel small {
  display: block;
  color: #68859a;
  font-size: 13px;
  line-height: 1.7;
}

.progress-block {
  margin-top: 22px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  color: #70899c;
  font-size: 12px;
}

.progress-track {
  position: relative;
  height: 14px;
  border-radius: 999px;
  background: rgba(147, 193, 223, 0.24);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8cdff0 0%, #7ec4ff 52%, #f8e29a 100%);
  transition: width 200ms ease-out;
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.tip-card {
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.64);
}

.tip-card strong {
  display: block;
  margin-bottom: 8px;
  color: #315570;
  font-size: 14px;
}

.tip-card span {
  color: #69849a;
  font-size: 14px;
  line-height: 1.6;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.primary-action,
.secondary-action {
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.primary-action {
  background: linear-gradient(135deg, #5ac7dc 0%, #64a7ff 100%);
  color: #fff;
  box-shadow: 0 16px 24px rgba(72, 134, 185, 0.2);
}

.secondary-action {
  background: rgba(255, 255, 255, 0.74);
  color: #315570;
  box-shadow: inset 0 0 0 1px rgba(88, 132, 166, 0.14);
}

.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-1px);
}

.primary-action:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
}

.completion-note {
  color: #45637a;
  line-height: 1.7;
}

.finish-note {
  margin-top: 14px;
  color: #66839a;
  font-size: 13px;
  line-height: 1.7;
}

.badge-modal {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 20;
  width: min(320px, calc(100vw - 48px));
  padding: 28px 24px;
  border-radius: 30px;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 30px 48px rgba(56, 103, 135, 0.22);
  backdrop-filter: blur(14px);
}

.badge-icon {
  font-size: 46px;
}

.badge-modal strong {
  display: block;
  margin-top: 10px;
  color: #204a63;
  font-size: 24px;
}

.badge-modal p {
  margin: 12px 0 0;
  color: #5f7d93;
  line-height: 1.7;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@keyframes sparkleFloat {
  0%,
  100% {
    transform: translateY(0px) scale(1);
    opacity: 0.58;
  }
  50% {
    transform: translateY(-6px) scale(1.08);
    opacity: 1;
  }
}

@keyframes leafDrift {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(var(--leaf-rotate, 0deg));
  }
  50% {
    transform: translate3d(8px, -6px, 0) rotate(calc(var(--leaf-rotate, 0deg) + 8deg));
  }
}

@keyframes guidancePulse {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.88;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@media (max-width: 1080px) {
  .hud-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stage-layout {
    grid-template-columns: 1fr;
    padding-top: 196px;
  }

  .pond-card {
    min-height: 480px;
  }
}

@media (max-width: 720px) {
  .puddle-ripple-game {
    padding: 16px;
  }

  .hud-panel {
    top: 92px;
    left: 16px;
    right: 16px;
    gap: 10px;
  }

  .hud-card {
    min-height: 72px;
  }

  .stage-layout {
    padding-top: 180px;
  }

  .stage-panel,
  .instruction-panel {
    border-radius: 28px;
  }

  .status-strip strong {
    font-size: 22px;
  }

  .pond-card {
    min-height: 420px;
  }

  .pond-copy {
    top: 22px;
    left: 20px;
    right: 20px;
  }

  .pond-copy strong {
    font-size: 21px;
  }

  .pond-surface {
    height: 260px;
  }

  .instruction-panel h2 {
    font-size: 28px;
  }

  .tip-grid {
    grid-template-columns: 1fr;
  }
}
</style>
