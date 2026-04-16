<template>
  <div class="star-trace-game" :style="{ background: sessionTheme.background }">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="glow-orb glow-orb--left" :style="{ background: sessionTheme.glow }"></div>
      <div class="glow-orb glow-orb--right" :style="{ background: sessionTheme.glow }"></div>
      <span
        v-for="sparkle in sparkles"
        :key="sparkle.id"
        class="sparkle-dot"
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
        <span>星座进度</span>
        <strong>{{ constellationProgressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>轨迹精度</span>
        <strong>{{ precisionLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>偏离样本</span>
        <strong>{{ offPathSamples }} 次</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section ref="playFieldRef" class="play-field">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ currentConstellation?.sceneEmoji || '⭐' }} {{ currentConstellation?.title || '连线小星座' }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <article v-if="currentConstellation" class="constellation-card">
          <div class="constellation-card__header">
            <div>
              <span class="constellation-card__chip">当前任务</span>
              <strong>{{ currentConstellation.title }}</strong>
            </div>
            <p>{{ currentGoalLabel }}</p>
          </div>

          <p class="constellation-card__description">{{ currentConstellation.description }}</p>

          <div class="constellation-clues">
            <span v-for="tip in currentConstellation.tips" :key="tip">{{ tip }}</span>
          </div>
        </article>

        <div class="trace-stage">
          <svg
            ref="traceSvgRef"
            class="trace-svg"
            viewBox="0 0 720 420"
            @pointerdown.prevent="handlePointerDown"
          >
            <defs>
              <linearGradient :id="`${sessionTheme.key}-trace-line`" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" :stop-color="sessionTheme.lineStops[0]" />
                <stop offset="100%" :stop-color="sessionTheme.lineStops[1]" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="720" height="420" rx="28" fill="rgba(12, 20, 48, 0.22)" />

            <g v-if="currentConstellation" class="target-constellation">
              <polyline
                :points="targetPolylinePoints"
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                stroke-width="16"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <polyline
                :points="targetPolylinePoints"
                fill="none"
                :stroke="`url(#${sessionTheme.key}-trace-line)`"
                stroke-width="8"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-dasharray="14 16"
                opacity="0.7"
              />

              <g
                v-for="(point, index) in currentConstellation.points"
                :key="`${currentConstellation.id}-${index}`"
                class="star-point"
              >
                <circle
                  :cx="point.x"
                  :cy="point.y"
                  :r="getStarRadius(index)"
                  :class="getStarClass(index)"
                />
                <text :x="point.x" :y="point.y + 6" class="star-index">{{ index + 1 }}</text>
              </g>
            </g>

            <polyline
              v-if="currentTracePolylinePoints"
              :points="currentTracePolylinePoints"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              stroke-width="18"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              v-if="currentTracePolylinePoints"
              :points="currentTracePolylinePoints"
              fill="none"
              :stroke="`url(#${sessionTheme.key}-trace-line)`"
              stroke-width="8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <div class="stage-footer">
          <div class="stage-footer__left">
            <strong>{{ fieldStatus }}</strong>
            <span>{{ helperMessage }}</span>
          </div>
          <div class="stage-footer__right">
            <span>总轨迹 {{ totalTraceDistanceLabel }}</span>
            <span>重来 {{ abortedTraces }} 次</span>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>精细动作</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>连线小星座</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ sessionTheme.helperLine }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>先找第一颗星</span>
            <span>慢慢沿线走</span>
            <span>连到最后一颗</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>当前星座</strong>
            <span>{{ currentConstellation?.title || '准备中' }}</span>
          </div>
          <div class="tip-card">
            <strong>星点进度</strong>
            <span>{{ checkpointProgressLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>平均耗时</strong>
            <span>{{ averageConstellationLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>平均偏移</strong>
            <span>{{ averageDeviationLabel }}</span>
          </div>
        </div>

        <div class="focus-card">
          <strong>本轮提示</strong>
          <p>{{ helperMessage }}</p>
        </div>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">⭐</div>
        <strong>星轨连线徽章</strong>
        <p>{{ difficultyConfig.successText }}</p>
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

type Phase = 'ready' | 'tracing' | 'feedback' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'

interface Point {
  x: number
  y: number
}

interface DifficultyConfig {
  constellationCount: number
  pointCount: number
  pathTolerance: number
  startRadius: number
  checkpointRadius: number
  shortLabel: string
  readyText: string
  helperText: string
  successText: string
}

interface ConstellationTemplate {
  id: string
  title: string
  sceneEmoji: string
  description: string
  tips: readonly string[]
  pointsByDifficulty: Record<EmotionGameDifficulty, readonly Point[]>
}

interface SessionConstellation {
  id: string
  title: string
  sceneEmoji: string
  description: string
  tips: string[]
  points: Point[]
}

interface ThemeDefinition {
  key: string
  title: string
  background: string
  glow: string
  helperLine: string
  celebrationLine: string
  lineStops: readonly [string, string]
}

interface SparkleDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    constellationCount: 2,
    pointCount: 4,
    pathTolerance: 40,
    startRadius: 34,
    checkpointRadius: 38,
    shortLabel: '简单 · 星点更少',
    readyText: '从第一颗最亮的星开始，慢慢连到下一颗星，先把短短的星轨画稳。',
    helperText: '简单模式的星点更少，只要看准起点，再顺着发光的线慢慢走。',
    successText: '这些小星座已经被你稳稳连起来了，星轨连线徽章亮起来了。',
  },
  2: {
    constellationCount: 3,
    pointCount: 5,
    pathTolerance: 32,
    startRadius: 30,
    checkpointRadius: 32,
    shortLabel: '中等 · 星轨更长',
    readyText: '这次星轨会更长，要继续按顺序一颗一颗连到后面。',
    helperText: '中等模式需要更稳定地沿着星轨走，尽量别让线条跑远。',
    successText: '你已经能把更长的星轨慢慢连顺了，手和眼配合得越来越稳。',
  },
  3: {
    constellationCount: 3,
    pointCount: 6,
    pathTolerance: 26,
    startRadius: 28,
    checkpointRadius: 28,
    shortLabel: '困难 · 精度更严',
    readyText: '困难模式会有更多星点，也要把线画得更贴近真正的星轨。',
    helperText: '先看清顺序，再把手放慢一点，尽量让线条一直贴着发光路线前进。',
    successText: '你已经能在更长更细的星轨里保持稳定控制，今天的描线很细致。',
  },
}

const CONSTELLATIONS: readonly ConstellationTemplate[] = [
  {
    id: 'kite',
    title: '风筝星轨',
    sceneEmoji: '🪁',
    description: '把像风筝一样的星点按顺序连起来，看看线条能不能稳稳飞起来。',
    tips: ['先找第一颗亮星', '顺着发光路线慢慢走', '别一下跳到最后'],
    pointsByDifficulty: {
      1: [
        { x: 156, y: 278 },
        { x: 268, y: 164 },
        { x: 390, y: 272 },
        { x: 262, y: 356 },
      ],
      2: [
        { x: 156, y: 278 },
        { x: 268, y: 164 },
        { x: 390, y: 272 },
        { x: 262, y: 356 },
        { x: 250, y: 104 },
      ],
      3: [
        { x: 156, y: 278 },
        { x: 268, y: 164 },
        { x: 390, y: 272 },
        { x: 262, y: 356 },
        { x: 250, y: 104 },
        { x: 314, y: 68 },
      ],
    },
  },
  {
    id: 'fish',
    title: '小鱼星轨',
    sceneEmoji: '🐟',
    description: '这次像一条会游动的小鱼，要按顺序把鱼头、鱼背和鱼尾连起来。',
    tips: ['先从鱼头开始', '中间别抄近路', '一路连到尾巴'],
    pointsByDifficulty: {
      1: [
        { x: 164, y: 228 },
        { x: 270, y: 152 },
        { x: 382, y: 224 },
        { x: 270, y: 304 },
      ],
      2: [
        { x: 164, y: 228 },
        { x: 270, y: 152 },
        { x: 382, y: 224 },
        { x: 270, y: 304 },
        { x: 448, y: 178 },
      ],
      3: [
        { x: 164, y: 228 },
        { x: 270, y: 152 },
        { x: 382, y: 224 },
        { x: 270, y: 304 },
        { x: 448, y: 178 },
        { x: 452, y: 272 },
      ],
    },
  },
  {
    id: 'flower',
    title: '花朵星轨',
    sceneEmoji: '🌸',
    description: '沿着花瓣一样的小星点慢慢描过去，把整朵花一点点连出来。',
    tips: ['先画中间的主线', '再接花瓣', '走到最后一颗星再停'],
    pointsByDifficulty: {
      1: [
        { x: 214, y: 288 },
        { x: 286, y: 184 },
        { x: 352, y: 286 },
        { x: 286, y: 336 },
      ],
      2: [
        { x: 214, y: 288 },
        { x: 286, y: 184 },
        { x: 352, y: 286 },
        { x: 286, y: 336 },
        { x: 286, y: 112 },
      ],
      3: [
        { x: 214, y: 288 },
        { x: 286, y: 184 },
        { x: 352, y: 286 },
        { x: 286, y: 336 },
        { x: 286, y: 112 },
        { x: 182, y: 190 },
      ],
    },
  },
]

const THEMES: readonly ThemeDefinition[] = [
  {
    key: 'midnight-gold',
    title: '金星夜空',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.2), transparent 36%), linear-gradient(180deg, #1a2557 0%, #263b7c 46%, #4c3c78 100%)',
    glow: 'radial-gradient(circle, rgba(255, 214, 109, 0.56), rgba(255, 214, 109, 0))',
    helperLine: '从第一颗亮星开始，顺着发光轨迹慢慢连到最后一颗。',
    celebrationLine: '小星座已经被你稳稳连起来啦，夜空都亮了起来。',
    lineStops: ['#ffe28a', '#8dc8ff'],
  },
  {
    key: 'moon-lake',
    title: '月湖星湾',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.18), transparent 34%), linear-gradient(180deg, #142142 0%, #24355f 44%, #315b84 100%)',
    glow: 'radial-gradient(circle, rgba(159, 198, 255, 0.52), rgba(159, 198, 255, 0))',
    helperLine: '先盯住下一颗星的位置，再把线条慢慢送过去。',
    celebrationLine: '这些星轨都被你顺顺地描出来了，月光也在跟着发亮。',
    lineStops: ['#9fd0ff', '#ffe08c'],
  },
  {
    key: 'berry-night',
    title: '莓果夜幕',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.16), transparent 36%), linear-gradient(180deg, #221a4c 0%, #3c275f 46%, #53366a 100%)',
    glow: 'radial-gradient(circle, rgba(208, 168, 255, 0.46), rgba(208, 168, 255, 0))',
    helperLine: '不要急着冲到后面，按星点顺序一颗一颗连过去。',
    celebrationLine: '夜空里的星座都已经排成了线，今天的轨迹控制很稳定。',
    lineStops: ['#d5a8ff', '#ffd773'],
  },
]

const sparkles: readonly SparkleDot[] = [
  { id: 1, left: 9, top: 12, size: 10, delay: 0 },
  { id: 2, left: 18, top: 72, size: 8, delay: 1.1 },
  { id: 3, left: 32, top: 9, size: 12, delay: 0.6 },
  { id: 4, left: 56, top: 15, size: 9, delay: 1.7 },
  { id: 5, left: 76, top: 78, size: 11, delay: 0.4 },
  { id: 6, left: 90, top: 24, size: 7, delay: 1.4 },
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

const playFieldRef = ref<HTMLElement | null>(null)
const traceSvgRef = ref<SVGSVGElement | null>(null)
const sessionTheme = ref<ThemeDefinition>(THEMES[0]!)
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const sessionConstellations = ref<SessionConstellation[]>([])
const currentConstellationIndex = ref(0)
const currentTracePoints = ref<Point[]>([])
const completedConstellationTitles = ref<string[]>([])
const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const stageMessage = ref(DIFFICULTY_CONFIGS[1].readyText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const showBadge = ref(false)
const onPathSamples = ref(0)
const offPathSamples = ref(0)
const deviationValues = ref<number[]>([])
const constellationDurationsMs = ref<number[]>([])
const checkpointHits = ref(0)
const totalTraceDistancePx = ref(0)
const abortedTraces = ref(0)
const nextCheckpointIndex = ref(0)
const activePointerId = ref<number | null>(null)
const isTracing = ref(false)

let roundDirty = false
let traceStartedAt = 0
const timers: number[] = []

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value] || DIFFICULTY_CONFIGS[1])
const currentConstellation = computed(() => sessionConstellations.value[currentConstellationIndex.value] || null)
const currentTracePolylinePoints = computed(() => {
  if (currentTracePoints.value.length < 2) {
    return ''
  }

  return currentTracePoints.value.map((point) => `${point.x},${point.y}`).join(' ')
})
const targetPolylinePoints = computed(() => {
  return currentConstellation.value
    ? currentConstellation.value.points.map((point) => `${point.x},${point.y}`).join(' ')
    : ''
})
const totalTargetCheckpoints = computed(() => {
  return sessionConstellations.value.reduce((sum, constellation) => sum + constellation.points.length, 0)
})
const constellationProgressLabel = computed(() => {
  return `${completedConstellationTitles.value.length}/${difficultyConfig.value.constellationCount} 段`
})
const progressRatio = computed(() => {
  if (totalTargetCheckpoints.value <= 0) {
    return 0
  }

  return Math.min(1, checkpointHits.value / totalTargetCheckpoints.value)
})
const precisionRatio = computed(() => {
  const totalSamples = onPathSamples.value + offPathSamples.value
  if (totalSamples <= 0) {
    return null
  }

  return onPathSamples.value / totalSamples
})
const precisionLabel = computed(() => {
  if (precisionRatio.value === null) {
    return '-'
  }

  return `${Math.round(precisionRatio.value * 100)}%`
})
const averageDeviationLabel = computed(() => {
  const average = averageNumberList(deviationValues.value)
  if (average <= 0) {
    return '-'
  }

  return `${Math.round(average)} px`
})
const averageConstellationLabel = computed(() => formatResponseTime(averageNumberList(constellationDurationsMs.value)))
const checkpointProgressLabel = computed(() => {
  const pointCount = currentConstellation.value?.points.length || 0
  if (pointCount <= 0) {
    return '-'
  }

  return `${Math.min(nextCheckpointIndex.value, pointCount)}/${pointCount} 点`
})
const fieldStatus = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '所有小星座都连好了'
  }

  if (isTracing.value && currentConstellation.value) {
    return `正在连《${currentConstellation.value.title}》`
  }

  return '先从第一颗亮星开始'
})
const currentGoalLabel = computed(() => {
  if (!currentConstellation.value) {
    return '准备下一段星轨'
  }

  const targetPoint = currentConstellation.value.points[nextCheckpointIndex.value]
  if (!targetPoint) {
    return '已经连到最后一颗星'
  }

  return `现在要连到第 ${nextCheckpointIndex.value + 1} 颗星`
})
const panelDescription = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return difficultyConfig.value.readyText
})
const totalTraceDistanceLabel = computed(() => `${Math.round(totalTraceDistancePx.value)} px`)
const difficultyLabel = computed(() => difficultyConfig.value.shortLabel)

function scheduleTimeout(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    const index = timers.indexOf(timer)
    if (index >= 0) {
      timers.splice(index, 1)
    }
    callback()
  }, delay)

  timers.push(timer)
}

function clearAllTimers() {
  timers.splice(0).forEach((timer) => window.clearTimeout(timer))
}

function averageNumberList(values: number[]) {
  const normalized = values.filter((value) => Number.isFinite(value) && value >= 0)
  if (normalized.length === 0) {
    return 0
  }

  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length
}

function formatResponseTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '-'
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }

  return `${(ms / 1000).toFixed(1)}秒`
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex] as T
    next[swapIndex] = current as T
  }

  return next
}

function pickRandomTheme() {
  return shuffleArray(THEMES)[0] || THEMES[0]!
}

function buildConstellationSet(difficulty: EmotionGameDifficulty): SessionConstellation[] {
  const config = DIFFICULTY_CONFIGS[difficulty]
  return shuffleArray(CONSTELLATIONS)
    .slice(0, config.constellationCount)
    .map((template) => ({
      id: template.id,
      title: template.title,
      sceneEmoji: template.sceneEmoji,
      description: template.description,
      tips: [...template.tips],
      points: template.pointsByDifficulty[difficulty].map((point) => ({ ...point })),
    }))
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function startAmbientIfNeeded() {
  if (!props.settings.effectsEnabled) {
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

function playSuccessCue(line?: string) {
  if (!props.settings.effectsEnabled) {
    return
  }

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => {
      if (line) {
        props.audio.speak(line)
      }
    }),
  ])
}

function getStarRadius(index: number) {
  if (index === 0) {
    return 18
  }

  if (index < nextCheckpointIndex.value) {
    return 16
  }

  return 14
}

function getStarClass(index: number) {
  if (index === 0 && !isTracing.value && nextCheckpointIndex.value === 0) {
    return 'star-circle star-circle--start'
  }

  if (index < nextCheckpointIndex.value) {
    return 'star-circle star-circle--done'
  }

  if (index === nextCheckpointIndex.value) {
    return 'star-circle star-circle--next'
  }

  return 'star-circle'
}

function distanceBetween(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function distancePointToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (dx === 0 && dy === 0) {
    return distanceBetween(point, start)
  }

  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return distanceBetween(point, {
    x: start.x + t * dx,
    y: start.y + t * dy,
  })
}

function distancePointToPolyline(point: Point, polyline: readonly Point[]) {
  if (polyline.length <= 1) {
    return polyline[0] ? distanceBetween(point, polyline[0]) : Number.POSITIVE_INFINITY
  }

  let minDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const distance = distancePointToSegment(point, polyline[index]!, polyline[index + 1]!)
    if (distance < minDistance) {
      minDistance = distance
    }
  }

  return minDistance
}

function getSvgPointFromEvent(event: PointerEvent): Point | null {
  const svg = traceSvgRef.value
  if (!svg) {
    return null
  }

  const rect = svg.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    return null
  }

  return {
    x: ((event.clientX - rect.left) / rect.width) * 720,
    y: ((event.clientY - rect.top) / rect.height) * 420,
  }
}

function attachPointerListeners() {
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerCancel)
}

function detachPointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerCancel)
}

function resetTraceState() {
  isTracing.value = false
  activePointerId.value = null
  currentTracePoints.value = []
  nextCheckpointIndex.value = 0
  detachPointerListeners()
}

function startCurrentConstellation() {
  const constellation = currentConstellation.value
  if (!constellation) {
    return
  }

  phase.value = 'ready'
  statusTone.value = 'neutral'
  stageMessage.value = `从《${constellation.title}》的第一颗亮星开始连线。`
  helperMessage.value = constellation.description
  resetTraceState()
}

function buildPerformanceData() {
  return {
    completed_constellations: completedConstellationTitles.value.length,
    target_constellation_count: difficultyConfig.value.constellationCount,
    checkpoint_hits: checkpointHits.value,
    target_checkpoint_count: totalTargetCheckpoints.value,
    on_path_samples: onPathSamples.value,
    off_path_samples: offPathSamples.value,
    path_precision_ratio: precisionRatio.value === null ? null : Number(precisionRatio.value.toFixed(4)),
    average_deviation_px: Math.round(averageNumberList(deviationValues.value)),
    trace_distance_px: Math.round(totalTraceDistancePx.value),
    aborted_traces: abortedTraces.value,
    constellation_durations_ms: [...constellationDurationsMs.value],
    average_constellation_ms: Math.round(averageNumberList(constellationDurationsMs.value)),
    constellation_ids: sessionConstellations.value.map((item) => item.id),
    constellation_titles: sessionConstellations.value.map((item) => item.title),
    completed_constellation_titles: [...completedConstellationTitles.value],
    session_theme: sessionTheme.value.key,
    session_theme_title: sessionTheme.value.title,
  }
}

function finishSession() {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return
  }

  phase.value = 'celebrating'
  statusTone.value = 'success'
  stageMessage.value = '所有小星座都已经连好了。'
  helperMessage.value = difficultyConfig.value.successText
  props.audio.stopAmbient()
  playSuccessCue(sessionTheme.value.celebrationLine)

  scheduleTimeout(() => {
    showBadge.value = true
  }, 650)

  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_STAR_PATH',
        badgeName: '星轨连线徽章',
      },
    })
    phase.value = 'finished'
  }, 1300)

  scheduleTimeout(() => {
    if (!props.paused) {
      resetForDifficulty(activeDifficulty.value)
    }
  }, 3100)
}

function handleConstellationComplete() {
  const constellation = currentConstellation.value
  if (!constellation) {
    return
  }

  const elapsed = Math.max(0, Math.round(performance.now() - traceStartedAt))
  constellationDurationsMs.value = [...constellationDurationsMs.value, elapsed]
  checkpointHits.value += constellation.points.length
  completedConstellationTitles.value = [...completedConstellationTitles.value, constellation.title]
  phase.value = 'feedback'
  statusTone.value = 'success'
  stageMessage.value = `《${constellation.title}》已经连好了。`
  helperMessage.value = '这一段星轨已经顺顺地描出来了。'
  resetTraceState()
  playSuccessCue(`${constellation.title} 连好了。`)

  if (currentConstellationIndex.value + 1 >= sessionConstellations.value.length) {
    finishSession()
    return
  }

  scheduleTimeout(() => {
    currentConstellationIndex.value += 1
    startCurrentConstellation()
  }, 900)
}

function registerTraceSample(point: Point) {
  const constellation = currentConstellation.value
  if (!constellation) {
    return
  }

  const previousPoint = currentTracePoints.value[currentTracePoints.value.length - 1]
  if (previousPoint && distanceBetween(previousPoint, point) < 3) {
    return
  }

  if (previousPoint) {
    totalTraceDistancePx.value += distanceBetween(previousPoint, point)
  }

  currentTracePoints.value.push(point)

  const distanceToPath = distancePointToPolyline(point, constellation.points)
  deviationValues.value = [...deviationValues.value, distanceToPath]
  if (distanceToPath <= difficultyConfig.value.pathTolerance) {
    onPathSamples.value += 1
  } else {
    offPathSamples.value += 1
  }

  while (
    constellation.points[nextCheckpointIndex.value]
    && distanceBetween(point, constellation.points[nextCheckpointIndex.value]!) <= difficultyConfig.value.checkpointRadius
  ) {
    nextCheckpointIndex.value += 1
  }

  if (nextCheckpointIndex.value >= constellation.points.length) {
    handleConstellationComplete()
    return
  }

  phase.value = 'tracing'
  stageMessage.value = `继续连到第 ${nextCheckpointIndex.value + 1} 颗星。`
  helperMessage.value = `下一颗星还在前面，慢一点沿着发光路线走。`
}

function abortTrace(message: string, countAsAbort = true) {
  if (countAsAbort && currentTracePoints.value.length > 1) {
    abortedTraces.value += 1
  }

  phase.value = 'ready'
  statusTone.value = 'gentle'
  stageMessage.value = message
  helperMessage.value = '抬起手后需要从第一颗亮星重新开始。'
  resetTraceState()
  playSoftCue()
}

function handlePointerDown(event: PointerEvent) {
  if (props.paused || phase.value === 'celebrating' || phase.value === 'finished' || isTracing.value) {
    return
  }

  const constellation = currentConstellation.value
  const point = getSvgPointFromEvent(event)
  const startPoint = constellation?.points[0]
  if (!constellation || !point || !startPoint) {
    return
  }

  if (distanceBetween(point, startPoint) > difficultyConfig.value.startRadius) {
    phase.value = 'ready'
    statusTone.value = 'gentle'
    stageMessage.value = '先从第一颗最亮的星开始。'
    helperMessage.value = '起点没有连上时，后面的星轨不会亮起来。'
    playSoftCue()
    return
  }

  markRoundDirtyOnce()
  startAmbientIfNeeded()
  isTracing.value = true
  activePointerId.value = event.pointerId
  currentTracePoints.value = [{ ...startPoint }]
  nextCheckpointIndex.value = 1
  traceStartedAt = performance.now()
  phase.value = 'tracing'
  statusTone.value = 'neutral'
  stageMessage.value = `很好，继续连到第 ${nextCheckpointIndex.value + 1} 颗星。`
  helperMessage.value = '保持手速慢一点，让线条贴着发光路线前进。'
  attachPointerListeners()
}

function handlePointerMove(event: PointerEvent) {
  if (!isTracing.value || props.paused || event.pointerId !== activePointerId.value) {
    return
  }

  const point = getSvgPointFromEvent(event)
  if (!point) {
    return
  }

  registerTraceSample(point)
}

function handlePointerUp(event: PointerEvent) {
  if (!isTracing.value || event.pointerId !== activePointerId.value) {
    return
  }

  if (phase.value === 'feedback' || phase.value === 'celebrating' || phase.value === 'finished') {
    detachPointerListeners()
    return
  }

  abortTrace('线条中断了，从第一颗星再来一次。')
}

function handlePointerCancel(event: PointerEvent) {
  if (!isTracing.value || event.pointerId !== activePointerId.value) {
    return
  }

  abortTrace('连线被打断了，从第一颗星再开始。')
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  activeDifficulty.value = difficulty
  sessionTheme.value = pickRandomTheme()
  sessionConstellations.value = buildConstellationSet(difficulty)
  currentConstellationIndex.value = 0
  completedConstellationTitles.value = []
  onPathSamples.value = 0
  offPathSamples.value = 0
  deviationValues.value = []
  constellationDurationsMs.value = []
  checkpointHits.value = 0
  totalTraceDistancePx.value = 0
  abortedTraces.value = 0
  showBadge.value = false
  roundDirty = false
  props.audio.stopAmbient()
  startCurrentConstellation()
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
      props.audio.stopAmbient()

      if (isTracing.value) {
        resetTraceState()
      }
      return
    }

    if (roundDirty && phase.value === 'ready') {
      startAmbientIfNeeded()
    }
  },
)

onMounted(() => {
  resetForDifficulty(props.difficulty)
})

onBeforeUnmount(() => {
  clearAllTimers()
  resetTraceState()
  props.audio.stopAmbient()
})
</script>

<style scoped>
.star-trace-game {
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

.glow-orb {
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  opacity: 0.55;
  filter: blur(10px);
}

.glow-orb--left {
  top: -40px;
  left: -56px;
}

.glow-orb--right {
  right: -30px;
  bottom: 26px;
}

.sparkle-dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.48);
  animation: star-float 6.8s ease-in-out infinite;
}

.hud-panel,
.stage-layout {
  position: relative;
  z-index: 1;
}

.hud-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.hud-card,
.constellation-card,
.instruction-panel,
.badge-modal {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 18px 36px rgba(25, 30, 54, 0.12);
  backdrop-filter: blur(10px);
}

.hud-card {
  padding: 14px 16px;
  border-radius: 18px;
}

.hud-card span {
  display: block;
  margin-bottom: 6px;
  color: #6e6773;
  font-size: 13px;
}

.hud-card strong {
  color: #2d3150;
  font-size: 18px;
}

.stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
  gap: 18px;
}

.play-field {
  min-height: 0;
}

.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.status-strip span {
  color: #7b7481;
  font-size: 13px;
}

.status-strip strong {
  color: #2e3151;
}

.status-strip[data-tone='gentle'] {
  background: rgba(255, 244, 227, 0.94);
}

.status-strip[data-tone='success'] {
  background: rgba(233, 250, 235, 0.94);
}

.constellation-card {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 24px;
}

.constellation-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.constellation-card__chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: rgba(141, 186, 255, 0.2);
  color: #5473a5;
  font-size: 12px;
}

.constellation-card__header strong {
  color: #2d3150;
  font-size: 22px;
}

.constellation-card__header p {
  margin: 0;
  color: #776d6a;
  line-height: 1.6;
}

.constellation-card__description {
  margin: 14px 0 0;
  color: #6f6970;
  line-height: 1.7;
}

.constellation-clues {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.constellation-clues span {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(247, 244, 250, 0.98);
  color: #6f6872;
  font-size: 12px;
}

.trace-stage {
  margin-top: 18px;
  border-radius: 28px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.36);
}

.trace-svg {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
}

.star-circle {
  fill: rgba(255, 255, 255, 0.78);
  stroke: rgba(255, 219, 125, 0.82);
  stroke-width: 4;
}

.star-circle--start {
  fill: rgba(255, 233, 149, 0.94);
  animation: pulse-start 1.2s ease-in-out infinite;
}

.star-circle--next {
  fill: rgba(255, 244, 214, 0.94);
}

.star-circle--done {
  fill: rgba(166, 228, 255, 0.92);
  stroke: rgba(166, 228, 255, 0.95);
}

.star-index {
  fill: #233053;
  font-size: 13px;
  font-weight: 700;
  text-anchor: middle;
  pointer-events: none;
}

.stage-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  padding: 0 4px;
}

.stage-footer__left strong {
  display: block;
  margin-bottom: 6px;
  color: #f7f8ff;
}

.stage-footer__left span,
.stage-footer__right span {
  color: rgba(247, 248, 255, 0.82);
  line-height: 1.6;
}

.stage-footer__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.instruction-panel {
  border-radius: 28px;
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-tags span {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(247, 243, 251, 0.98);
  color: #6f6972;
  font-size: 12px;
}

.panel-tags .accent {
  background: rgba(255, 211, 110, 0.2);
  color: #94661c;
}

.instruction-panel h2 {
  margin: 0;
  color: #2d3150;
  font-size: 28px;
}

.instruction-panel p,
.instruction-panel small {
  margin: 0;
  color: #6f6970;
  line-height: 1.7;
}

.progress-block,
.tip-card,
.focus-card {
  border-radius: 20px;
  background: rgba(249, 247, 252, 0.98);
}

.progress-block {
  padding: 16px;
}

.progress-labels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  color: #7c7681;
  font-size: 12px;
}

.progress-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(215, 210, 223, 0.7);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #88c2ff 0%, #ffd773 100%);
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tip-card {
  padding: 14px;
}

.tip-card strong {
  display: block;
  margin-bottom: 6px;
  color: #726247;
  font-size: 13px;
}

.tip-card span {
  color: #2f314f;
  font-size: 16px;
  line-height: 1.5;
}

.focus-card {
  padding: 16px;
}

.focus-card strong {
  display: block;
  margin-bottom: 10px;
  color: #726247;
}

.badge-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  width: min(320px, calc(100% - 40px));
  padding: 28px 24px;
  border-radius: 24px;
  text-align: center;
  transform: translate(-50%, -50%);
}

.badge-icon {
  font-size: 52px;
  margin-bottom: 12px;
}

.badge-modal strong {
  display: block;
  color: #2d3150;
  font-size: 24px;
}

.badge-modal p {
  margin: 12px 0 0;
  color: #6f6970;
  line-height: 1.7;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -45%) scale(0.96);
}

@keyframes star-float {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.24;
  }
  50% {
    transform: translateY(-8px);
    opacity: 0.58;
  }
}

@keyframes pulse-start {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@media (max-width: 1180px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .star-trace-game {
    padding: 16px;
  }

  .hud-panel,
  .tip-grid,
  .progress-labels {
    grid-template-columns: 1fr;
  }

  .constellation-card__header,
  .stage-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .stage-footer__right {
    align-items: flex-start;
  }
}
</style>
