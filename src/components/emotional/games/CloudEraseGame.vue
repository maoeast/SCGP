<template>
  <div class="cloud-erase-game">
    <canvas ref="celebrationCanvas" class="celebration-canvas" />

    <HandCameraLayer :paused="paused" @primary-point="onPrimaryPoint">
      <template #default="{ usingPointerFallback }">
      {{ void (pointerFallbackMode = usingPointerFallback) }}
      <div class="scene-bg" :style="{ background: theme.skyGradient }">
        <div class="aurora-glow" :style="{ background: theme.glowGradient }" />
        <span
          v-for="sparkle in sparkles"
          :key="sparkle.id"
          class="sparkle"
          :style="{
            left: `${sparkle.left}%`,
            top: `${sparkle.top}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            animationDelay: `${sparkle.delay}s`,
          }"
        />
      </div>

      <div class="scene-hills">
        <svg viewBox="0 0 900 260" class="scene-hills-svg" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d="M-20 200 Q100 110 220 150 Q340 100 440 130 Q540 90 660 120 Q760 100 920 160 L920 260 L-20 260Z" :fill="theme.hillFar" opacity="0.6" />
          <path d="M-20 210 Q80 140 200 170 Q320 130 420 155 Q520 120 640 145 Q740 125 920 180 L920 260 L-20 260Z" :fill="theme.hillMid" opacity="0.75" />
          <path d="M180 200 Q340 175 480 190 Q580 185 700 195 L700 220 Q500 230 300 218 Q220 215 180 210Z" :fill="theme.lakeFill" opacity="0.7">
            <animate attributeName="d" dur="4s" repeatCount="indefinite" values="M180 200 Q340 175 480 190 Q580 185 700 195 L700 220 Q500 230 300 218 Q220 215 180 210Z;M180 202 Q340 178 480 192 Q580 188 700 197 L700 218 Q500 228 300 216 Q220 213 180 208Z;M180 200 Q340 175 480 190 Q580 185 700 195 L700 220 Q500 230 300 218 Q220 215 180 210Z" />
          </path>
          <path d="M-20 220 Q60 170 180 195 Q280 165 380 185 Q480 160 580 178 Q680 168 920 200 L920 260 L-20 260Z" :fill="theme.hillNear" />
          <g :stroke="theme.grassStroke" stroke-width="2" fill="none" opacity="0.7">
            <path d="M80 218 Q82 205 84 218" />
            <path d="M90 215 Q92 200 94 215" />
            <path d="M250 198 Q252 183 254 198" />
            <path d="M260 196 Q262 180 264 196" />
            <path d="M254 197 Q256 182 258 197" />
            <path d="M500 185 Q502 170 504 185" />
            <path d="M510 183 Q512 168 514 183" />
            <path d="M680 195 Q682 180 684 195" />
            <path d="M750 190 Q752 175 754 190" />
          </g>
          <g opacity="0.8">
            <circle cx="100" cy="212" r="4" fill="#ffafcc" />
            <circle cx="270" cy="192" r="3.5" fill="#ffd166" />
            <circle cx="520" cy="180" r="4" fill="#cdb4ff" />
            <circle cx="690" cy="188" r="3.5" fill="#ffafcc" />
            <circle cx="780" cy="186" r="4" fill="#ffd166" />
            <circle cx="350" cy="190" r="3" fill="#b8f2e6" />
          </g>
        </svg>
      </div>

      <div class="sun-core" :style="sunCoreStyle">
        <div class="sun-glow" />
        <svg viewBox="0 0 200 200" class="sun-rays-primary" aria-hidden="true">
          <g transform="translate(100,100)">
            <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" />
            <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" transform="rotate(45)" />
            <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" transform="rotate(90)" />
            <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" transform="rotate(135)" />
          </g>
        </svg>
        <svg viewBox="0 0 200 200" class="sun-rays-secondary" aria-hidden="true">
          <g transform="translate(100,100)">
            <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(22.5)" />
            <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(67.5)" />
            <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(112.5)" />
            <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(157.5)" />
          </g>
        </svg>
        <div class="sun-face">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="68" :fill="theme.sunFill" />
            <path d="M72 88 Q82 80 92 88" fill="none" stroke="#5b4a2c" stroke-width="3.5" stroke-linecap="round" />
            <path d="M108 88 Q118 80 128 88" fill="none" stroke="#5b4a2c" stroke-width="3.5" stroke-linecap="round" />
            <path d="M72 120c8 14 20 20 28 20s20-6 28-20" fill="none" stroke="#5b4a2c" stroke-width="4" stroke-linecap="round" />
            <ellipse cx="64" cy="116" rx="10" ry="6" fill="rgba(255,150,150,0.35)" />
            <ellipse cx="136" cy="116" rx="10" ry="6" fill="rgba(255,150,150,0.35)" />
          </svg>
        </div>
      </div>

      <canvas ref="frostCanvas" class="frost-canvas" @pointerdown="handlePointerDown" />
      <canvas ref="particleCanvas" class="particle-canvas" />

      <transition name="instruction-fade">
        <div v-if="showInstruction" class="central-instruction">
          {{ instructionText }}
        </div>
      </transition>

      <div class="top-hud">
        <span class="difficulty-tag">{{ difficultyLabel }}</span>
      </div>

      <div class="bottom-hud">
        <div class="progress-hint">{{ progressHint }}</div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${Math.round(clearedRatio * 100)}%` }" />
          <div class="progress-marker" :style="{ left: `${Math.round(difficultyConfig.targetRatio * 100)}%` }" />
        </div>
      </div>
      </template>
    </HandCameraLayer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import HandCameraLayer from '@/components/games/hand/HandCameraLayer.vue'
import type { StagePoint } from '@/utils/hand-game-gestures'
import type { HandObservation } from '@/composables/useHandLandmarker'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
  EmotionGameSettings,
} from '@/types/emotional/games'

type Phase = 'ready' | 'wiping' | 'celebrating' | 'finished'

interface DifficultyConfig {
  maxStrength: number
  brushRadius: number
  erodePower: number
  targetRatio: number
  regenDelayMs: number
  regenPerSecond: number
  cellSize: number
  shortLabel: string
  readyText: string
  helperText: string
  successText: string
}

interface Theme {
  key: string
  title: string
  skyGradient: string
  glowGradient: string
  hillFar: string
  hillMid: string
  hillNear: string
  lakeFill: string
  grassStroke: string
  sunFill: string
  revealTitle: string
  badgeCopy: string
  celebrationLine: string
}

interface Point {
  x: number
  y: number
}

interface Sparkle {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface ConfettiPiece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotate: number
  spin: number
  life: number
  color: string
}

interface CloudParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  rotation: number
  spin: number
}

interface GoldRainPiece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  color: string
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    maxStrength: 1,
    brushRadius: 56,
    erodePower: 0.92,
    targetRatio: 0.72,
    regenDelayMs: Number.POSITIVE_INFINITY,
    regenPerSecond: 0,
    cellSize: 22,
    shortLabel: '简单 · 薄云很快散开',
    readyText: '把手指放上去，大范围擦几下，薄薄的云层马上就会散开。',
    helperText: '这一关云层不会重新聚回来，只要放心做大动作，把天空慢慢擦亮就可以。',
    successText: '云层已经被你擦得轻轻散开了，蓝天马上就要露出来啦！',
  },
  2: {
    maxStrength: 1,
    brushRadius: 50,
    erodePower: 0.62,
    targetRatio: 0.84,
    regenDelayMs: 800,
    regenPerSecond: 0.18,
    cellSize: 20,
    shortLabel: '中等 · 停下云会回来',
    readyText: '继续连着擦，别停太久哦，不然云层会慢慢又聚回来。',
    helperText: '这次要保持连续的大动作，让云层没有机会重新盖住蓝天。',
    successText: '你一直没有放弃，云层已经被你越擦越开了！',
  },
  3: {
    maxStrength: 3,
    brushRadius: 46,
    erodePower: 0.46,
    targetRatio: 0.92,
    regenDelayMs: Number.POSITIVE_INFINITY,
    regenPerSecond: 0,
    cellSize: 18,
    shortLabel: '困难 · 厚云要反复擦 3 次',
    readyText: '这是一层厚厚的云。同一个地方要反复擦亮三次，蓝天才会真正露出来。',
    helperText: '遇到厚云别着急，用整只手臂带着手指来回擦，把力量慢慢送出去。',
    successText: '厚云正在一层层散开，你把天空擦得越来越亮了！',
  },
}

const THEMES: readonly Theme[] = [
  {
    key: 'clear-sky-meadow',
    title: '晴空草坡',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 34%), linear-gradient(180deg, #8fdcff 0%, #dff6ff 54%, #fff6d8 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 235, 168, 0.88), rgba(255, 235, 168, 0))',
    hillFar: '#a8e6cf',
    hillMid: '#7dcfb6',
    hillNear: '#56c596',
    lakeFill: '#87ceeb',
    grassStroke: '#3da87a',
    sunFill: '#ffd460',
    revealTitle: '云朵正在慢慢散开',
    badgeCopy: '云朵被你拨开啦，晴空巧手徽章亮起来了。',
    celebrationLine: '云层都被你擦开啦，蓝天出来咯！',
  },
  {
    key: 'breeze-harbor',
    title: '微风晴湾',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.36), transparent 34%), linear-gradient(180deg, #a7e3ff 0%, #ecfffb 54%, #fff0c9 100%)',
    glowGradient: 'radial-gradient(circle, rgba(205, 255, 236, 0.9), rgba(205, 255, 236, 0))',
    hillFar: '#b5e8d5',
    hillMid: '#8cd8c0',
    hillNear: '#6ad4a8',
    lakeFill: '#a0d8ec',
    grassStroke: '#4db88a',
    sunFill: '#ffcb52',
    revealTitle: '明亮天空一点点回来了',
    badgeCopy: '你把天空里的云擦亮了，太阳和微风都在对你笑。',
    celebrationLine: '云朵被你一点点擦走啦，晴空和微风都回来了。',
  },
]

const SPARKLES: readonly Sparkle[] = [
  { id: 1, left: 12, top: 12, size: 8, delay: 0 },
  { id: 2, left: 24, top: 16, size: 6, delay: 0.4 },
  { id: 3, left: 38, top: 10, size: 10, delay: 0.8 },
  { id: 4, left: 62, top: 14, size: 7, delay: 1.2 },
  { id: 5, left: 78, top: 18, size: 9, delay: 1.6 },
  { id: 6, left: 88, top: 11, size: 6, delay: 2.0 },
]

const CLOUD_COLORS = ['rgba(255, 255, 255, 0.96)', 'rgba(245, 248, 252, 0.93)', 'rgba(238, 243, 250, 0.90)']
const CONFETTI_COLORS = ['#ffd166', '#8bd3dd', '#ffafcc', '#b8f2e6', '#cdb4ff', '#fff275']
const GOLDEN_COLORS = ['#ffd166', '#fff275', '#ffe4a0']
const CLEARED_THRESHOLD = 0.05

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

const frostCanvas = ref<HTMLCanvasElement | null>(null)
const celebrationCanvas = ref<HTMLCanvasElement | null>(null)

const phase = ref<Phase>('ready')
const clearedRatio = ref(0)
const totalStrokes = ref(0)
const strokeDistancePx = ref(0)
const regenEvents = ref(0)
const idleRecoverMs = ref(0)
const showInstruction = ref(true)
const pointerFallbackMode = ref(false)

const sparkles = SPARKLES

let lastThemeKey = ''
const theme = ref<Theme>(THEMES[0] as Theme)

let frostContext: CanvasRenderingContext2D | null = null
let celebrationContext: CanvasRenderingContext2D | null = null
let templateCanvas: HTMLCanvasElement | null = null
let renderFrame = 0
let regenFrame = 0
let celebrationFrame = 0
const timeouts = new Set<number>()

let gridCols = 0
let gridRows = 0
let gridCellSize = 20
let scaledBrushRadius = 50
let maxStrength = 1
let strengths = new Float32Array(0)
let totalStrengthMax = 1
let totalStrengthRemaining = 1
let clearedCells = 0
let completed = false
let roundDirty = false
let regenActive = false
let regenLastAt = 0
let lastInteractionAt = 0
let confettiPieces: ConfettiPiece[] = []

const particleCanvas = ref<HTMLCanvasElement | null>(null)
let particleContext: CanvasRenderingContext2D | null = null
let cloudParticles: CloudParticle[] = []
let goldRainPieces: GoldRainPiece[] = []
let particleFrame = 0
const MAX_CLOUD_PARTICLES = 200

let handLastPoint: Point | null = null
let handActive = false
let pointerId: number | null = null

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty])

const difficultyLabel = computed(() => {
  if (props.difficulty === 1) return '简单 · 薄云'
  if (props.difficulty === 2) return '中等 · 连续擦'
  return '困难 · 三层厚云'
})

const instructionText = computed(() => {
  if (props.difficulty === 3) return '厚厚的云层，同一块要反复擦亮三次！'
  if (props.difficulty === 2) return '挥动手臂擦掉云层，别停太久哦！'
  return '挥动手臂，擦掉云层！'
})

const progressHint = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }
  if (phase.value === 'ready') {
    return instructionText.value
  }
  if (regenActive) {
    return '云层在回来，继续擦！'
  }
  const pct = Math.round(clearedRatio.value * 100)
  if (pct < 30) return '云层还很厚，继续用力擦...'
  if (pct < 60) return '越来越晴了...'
  return '快看到蓝天了！'
})

const sunCoreStyle = computed(() => {
  const baseScale = 0.9 + clearedRatio.value * 0.24
  const scale = phase.value === 'celebrating' || phase.value === 'finished'
    ? 1.3
    : baseScale
  const glow = 0.28 + clearedRatio.value * 0.44
  return {
    transform: `translateX(-50%) scale(${scale})`,
    boxShadow: `0 0 0 14px rgba(255, 221, 121, ${glow * 0.22}), 0 22px 38px rgba(255, 193, 83, ${glow * 0.4})`,
  }
})

function scheduleTimeout(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    timeouts.delete(timer)
    callback()
  }, delay)
  timeouts.add(timer)
}

function clearTimeouts() {
  timeouts.forEach((timer) => window.clearTimeout(timer))
  timeouts.clear()
}

function pickTheme() {
  const pool = THEMES.length > 1 ? THEMES.filter((item) => item.key !== lastThemeKey) : THEMES
  const fallbackTheme = THEMES[0] as Theme
  const nextTheme = pool[Math.floor(Math.random() * pool.length)] ?? fallbackTheme
  lastThemeKey = nextTheme.key
  theme.value = nextTheme
}

function createTemplateCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const base = ctx.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, 'rgba(255, 255, 255, 0.96)')
  base.addColorStop(0.55, 'rgba(245, 248, 252, 0.94)')
  base.addColorStop(1, 'rgba(238, 243, 250, 0.90)')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  for (let index = 0; index < 42; index += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    const radius = 50 + Math.random() * 130
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.65)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.32)'
  ctx.lineCap = 'round'
  for (let index = 0; index < 28; index += 1) {
    ctx.lineWidth = 2 + Math.random() * 4
    ctx.beginPath()
    const startX = Math.random() * width
    const startY = Math.random() * height
    const cpX = startX + (Math.random() - 0.5) * 80
    const cpY = startY + Math.random() * 36
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(cpX, cpY, startX + (Math.random() - 0.5) * 140, startY + Math.random() * 50)
    ctx.stroke()
  }

  return canvas
}

function initGrid(width: number, height: number) {
  const dim = Math.min(width, height)
  const scale = Math.max(0.8, dim / 600)
  gridCellSize = Math.max(10, Math.round(difficultyConfig.value.cellSize * scale))
  scaledBrushRadius = Math.round(difficultyConfig.value.brushRadius * scale)
  gridCols = Math.max(1, Math.ceil(width / gridCellSize))
  gridRows = Math.max(1, Math.ceil(height / gridCellSize))
  maxStrength = difficultyConfig.value.maxStrength
  const totalCells = gridCols * gridRows
  strengths = new Float32Array(totalCells)
  strengths.fill(maxStrength)
  totalStrengthMax = totalCells * maxStrength
  totalStrengthRemaining = totalStrengthMax
  clearedCells = 0
  updateClearedRatio()
}

function resizeCanvases() {
  const frost = frostCanvas.value
  const celebration = celebrationCanvas.value
  if (!frost || !celebration) return

  const frostRect = frost.getBoundingClientRect()

  frost.width = Math.max(1, Math.round(frostRect.width))
  frost.height = Math.max(1, Math.round(frostRect.height))
  celebration.width = Math.max(1, Math.round(window.innerWidth))
  celebration.height = Math.max(1, Math.round(window.innerHeight))

  frostContext = frost.getContext('2d')
  celebrationContext = celebration.getContext('2d')

  const pc = particleCanvas.value
  if (pc) {
    const pcRect = pc.getBoundingClientRect()
    pc.width = Math.max(1, Math.round(pcRect.width))
    pc.height = Math.max(1, Math.round(pcRect.height))
    particleContext = pc.getContext('2d')
  }

  templateCanvas = createTemplateCanvas(frost.width, frost.height)
  initGrid(frost.width, frost.height)
  renderFrostFromGrid()
}

function getGridIndex(col: number, row: number) {
  return row * gridCols + col
}

function adjustCellStrength(index: number, nextValue: number) {
  const previous = strengths[index] || 0
  const clamped = Math.max(0, Math.min(maxStrength, nextValue))
  if (Math.abs(clamped - previous) < 0.001) return

  if (previous <= CLEARED_THRESHOLD && clamped > CLEARED_THRESHOLD) {
    clearedCells = Math.max(0, clearedCells - 1)
  } else if (previous > CLEARED_THRESHOLD && clamped <= CLEARED_THRESHOLD) {
    clearedCells += 1
  }

  strengths[index] = clamped
  totalStrengthRemaining += clamped - previous
}

function updateClearedRatio() {
  clearedRatio.value = totalStrengthMax > 0
    ? Math.max(0, Math.min(1, 1 - totalStrengthRemaining / totalStrengthMax))
    : 0
}

function renderFrostFromGrid() {
  if (!frostContext || !frostCanvas.value || !templateCanvas) return

  const ctx = frostContext
  const width = frostCanvas.value.width
  const height = frostCanvas.value.height
  ctx.clearRect(0, 0, width, height)

  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      const index = getGridIndex(col, row)
      const ratio = (strengths[index] ?? 0) / maxStrength
      if (ratio <= 0.01) continue

      const x = col * gridCellSize
      const y = row * gridCellSize
      const w = Math.min(gridCellSize, width - x)
      const h = Math.min(gridCellSize, height - y)
      if (w <= 0 || h <= 0) continue

      ctx.globalAlpha = 0.08 + ratio * 0.92
      ctx.drawImage(templateCanvas, x, y, w, h, x, y, w, h)

      if (ratio > 0.5) {
        ctx.globalAlpha = 0.14 * ratio
        ctx.fillStyle = CLOUD_COLORS[(row + col) % CLOUD_COLORS.length] ?? CLOUD_COLORS[0] ?? '#ffffff'
        ctx.fillRect(x, y, w, h)
      }
    }
  }

  ctx.globalAlpha = 1
}

function scheduleFrostRender() {
  if (renderFrame) return
  renderFrame = window.requestAnimationFrame(() => {
    renderFrame = 0
    renderFrostFromGrid()
  })
}

function stampVisualErase(x: number, y: number) {
  if (!frostContext) return
  const radius = scaledBrushRadius
  const gradient = frostContext.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, 'rgba(255,255,255,0.94)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.42)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  frostContext.save()
  frostContext.globalCompositeOperation = 'destination-out'
  frostContext.fillStyle = gradient
  frostContext.beginPath()
  frostContext.arc(x, y, radius, 0, Math.PI * 2)
  frostContext.fill()
  frostContext.restore()
}

function applyBrushToGrid(x: number, y: number) {
  const radius = scaledBrushRadius
  const minCol = Math.max(0, Math.floor((x - radius) / gridCellSize))
  const maxCol = Math.min(gridCols - 1, Math.ceil((x + radius) / gridCellSize))
  const minRow = Math.max(0, Math.floor((y - radius) / gridCellSize))
  const maxRow = Math.min(gridRows - 1, Math.ceil((y + radius) / gridCellSize))

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const centerX = col * gridCellSize + gridCellSize / 2
      const centerY = row * gridCellSize + gridCellSize / 2
      const distance = Math.hypot(centerX - x, centerY - y)
      if (distance > radius) continue

      const influence = 1 - distance / radius
      const erosion = difficultyConfig.value.erodePower * Math.max(0.2, influence)
      const index = getGridIndex(col, row)
      adjustCellStrength(index, (strengths[index] ?? 0) - erosion)
    }
  }

  updateClearedRatio()
}

function markDirtyOnce() {
  if (roundDirty) return
  roundDirty = true
  props.markRoundDirty?.()
}

function beginWipingState() {
  if (phase.value === 'ready') {
    phase.value = 'wiping'
  }
}

function paintInterpolatedStroke(from: Point, to: Point) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const spacing = Math.max(12, scaledBrushRadius * 0.38)
  const steps = Math.max(1, Math.ceil(distance / spacing))

  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps
    const x = from.x + (to.x - from.x) * ratio
    const y = from.y + (to.y - from.y) * ratio
    stampVisualErase(x, y)
    applyBrushToGrid(x, y)
  }

  spawnCloudParticles(to.x, to.y, 3)
  strokeDistancePx.value += distance
}

function maybeCompleteSession() {
  if (completed || clearedRatio.value < difficultyConfig.value.targetRatio) return
  completed = true
  phase.value = 'celebrating'
  handActive = false
  handLastPoint = null
  pointerId = null
  detachPointerListeners()
  stopRegenLoop()
  props.audio.playSuccessCue().catch(() => {
    // ignore
  })
  props.audio.speak(theme.value.celebrationLine)
  runCelebration()
  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_CLEAR_SKY',
        badgeName: '晴空巧手徽章',
      },
    })
    phase.value = 'finished'
  }, 1700)
  scheduleTimeout(() => {
    if (!props.paused) {
      resetForDifficulty()
    }
  }, 3300)
}

function buildPerformanceData() {
  return {
    total_strokes: totalStrokes.value,
    stroke_distance_px: Math.round(strokeDistancePx.value),
    cleared_ratio_peak: Number(clearedRatio.value.toFixed(4)),
    regen_events: regenEvents.value,
    idle_recover_ms: Math.round(idleRecoverMs.value),
    fully_cleared_cells: clearedCells,
    grid_cells_total: gridCols * gridRows,
    max_strength_layers: difficultyConfig.value.maxStrength,
    target_ratio: difficultyConfig.value.targetRatio,
    brush_radius_px: scaledBrushRadius,
    theme_key: theme.value.key,
  }
}

function onPrimaryPoint(point: StagePoint | null) {
  if (pointerFallbackMode.value) return
  if (props.paused || completed) return

  const canvas = frostCanvas.value
  if (!canvas) return

  if (!point) {
    handLastPoint = null
    handActive = false
    return
  }

  const canvasX = point.x * canvas.width
  const canvasY = point.y * canvas.height
  const currentPoint: Point = { x: canvasX, y: canvasY }

  if (!handActive) {
    handActive = true
    handLastPoint = currentPoint
    markDirtyOnce()
    beginWipingState()
    totalStrokes.value += 1
    lastInteractionAt = performance.now()
    regenActive = false

    if (showInstruction.value) {
      showInstruction.value = false
    }

    props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
      // ignore
    })

    stampVisualErase(canvasX, canvasY)
    applyBrushToGrid(canvasX, canvasY)
    scheduleFrostRender()
    maybeCompleteSession()
    return
  }

  beginWipingState()
  if (handLastPoint) {
    paintInterpolatedStroke(handLastPoint, currentPoint)
  }
  handLastPoint = currentPoint
  lastInteractionAt = performance.now()
  regenActive = false
  scheduleFrostRender()
  maybeCompleteSession()
}

function onHands(_hands: HandObservation[]) {
  // Multi-hand support placeholder
}

function getLocalPoint(event: PointerEvent): Point | null {
  const canvas = frostCanvas.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  return {
    x: Math.max(0, Math.min(canvas.width, ((event.clientX - rect.left) / rect.width) * canvas.width)),
    y: Math.max(0, Math.min(canvas.height, ((event.clientY - rect.top) / rect.height) * canvas.height)),
  }
}

function handlePointerDown(event: PointerEvent) {
  if (!pointerFallbackMode.value || props.paused || completed) return
  const point = getLocalPoint(event)
  if (!point) return

  event.preventDefault()
  pointerId = event.pointerId
  handActive = true
  handLastPoint = point
  markDirtyOnce()
  beginWipingState()
  totalStrokes.value += 1
  lastInteractionAt = performance.now()
  regenActive = false

  if (showInstruction.value) {
    showInstruction.value = false
  }

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore
  })

  stampVisualErase(point.x, point.y)
  applyBrushToGrid(point.x, point.y)
  scheduleFrostRender()
  attachPointerListeners()
  maybeCompleteSession()
}

function handlePointerMove(event: PointerEvent) {
  if (pointerId === null || event.pointerId !== pointerId || props.paused || completed) return
  const point = getLocalPoint(event)
  if (!point || !handLastPoint) return

  event.preventDefault()
  beginWipingState()
  paintInterpolatedStroke(handLastPoint, point)
  handLastPoint = point
  lastInteractionAt = performance.now()
  regenActive = false
  scheduleFrostRender()
  maybeCompleteSession()
}

function finishPointer(event?: PointerEvent) {
  if (pointerId === null) return
  if (event && event.pointerId !== pointerId) return
  pointerId = null
  handActive = false
  handLastPoint = null
  detachPointerListeners()
}

function attachPointerListeners() {
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', finishPointer)
  window.addEventListener('pointercancel', finishPointer)
}

function detachPointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', finishPointer)
  window.removeEventListener('pointercancel', finishPointer)
}

function spawnCloudParticles(x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    if (cloudParticles.length >= MAX_CLOUD_PARTICLES) break
    cloudParticles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: -(Math.random() * 2 + 0.5),
      size: 3 + Math.random() * 6,
      life: 1,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
    })
  }
  if (!particleFrame) {
    particleFrame = window.requestAnimationFrame(stepCloudParticles)
  }
}

function stepCloudParticles() {
  const canvas = particleCanvas.value
  const ctx = particleContext
  if (!canvas || !ctx) {
    particleFrame = 0
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  cloudParticles = cloudParticles.filter((p) => p.life > 0)

  for (const p of cloudParticles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.04
    p.life -= 0.018
    p.rotation += p.spin

    ctx.save()
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillStyle = p.life > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(240,245,250,0.9)'
    ctx.beginPath()
    ctx.arc(0, 0, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.globalAlpha = 1

  if (cloudParticles.length > 0) {
    particleFrame = window.requestAnimationFrame(stepCloudParticles)
  } else {
    particleFrame = 0
  }
}

function stopCloudParticles() {
  if (particleFrame) {
    window.cancelAnimationFrame(particleFrame)
    particleFrame = 0
  }
  cloudParticles = []
  const canvas = particleCanvas.value
  const ctx = particleContext
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function stepRegen(now: number) {
  if (props.paused || completed) return

  if (!regenLastAt) {
    regenLastAt = now
  }
  const deltaMs = Math.min(64, Math.max(0, now - regenLastAt))
  regenLastAt = now

  if (
    props.difficulty === 2
    && !handActive
    && phase.value === 'wiping'
    && now - lastInteractionAt >= difficultyConfig.value.regenDelayMs
  ) {
    if (!regenActive) {
      regenActive = true
      regenEvents.value += 1
    }

    let changed = false
    const recover = difficultyConfig.value.regenPerSecond * (deltaMs / 1000)
    for (let index = 0; index < strengths.length; index += 1) {
      const current = strengths[index] || 0
      if (current >= maxStrength) continue
      adjustCellStrength(index, current + recover)
      changed = true
    }

    if (changed) {
      idleRecoverMs.value += deltaMs
      updateClearedRatio()
      scheduleFrostRender()
    }
  }

  regenFrame = window.requestAnimationFrame(stepRegen)
}

function startRegenLoop() {
  stopRegenLoop()
  regenLastAt = 0
  regenFrame = window.requestAnimationFrame(stepRegen)
}

function stopRegenLoop() {
  if (regenFrame) {
    window.cancelAnimationFrame(regenFrame)
    regenFrame = 0
  }
}

function clearCelebrationCanvas() {
  const canvas = celebrationCanvas.value
  if (!canvas || !celebrationContext) return
  celebrationContext.clearRect(0, 0, canvas.width, canvas.height)
}

function runCelebration() {
  const canvas = celebrationCanvas.value
  const ctx = celebrationContext
  if (!canvas || !ctx) return

  confettiPieces = Array.from({ length: 92 }).map(() => ({
    x: canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.42,
    y: canvas.height * 0.42 + (Math.random() - 0.5) * 30,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * -7 - 2.8,
    size: Math.random() * 10 + 6,
    rotate: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.25,
    life: 1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] || '#ffd166',
  }))

  goldRainPieces = Array.from({ length: 40 }).map(() => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * canvas.height * 0.3,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 1.5 + Math.random() * 2.5,
    size: 3 + Math.random() * 2,
    life: 1,
    color: GOLDEN_COLORS[Math.floor(Math.random() * GOLDEN_COLORS.length)] || '#ffd166',
  }))

  spawnCloudParticles(canvas.width * 0.5, canvas.height * 0.5, 60)

  const draw = () => {
    if (props.paused) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    confettiPieces = confettiPieces
      .map((piece) => ({
        ...piece,
        x: piece.x + piece.vx,
        y: piece.y + piece.vy,
        vy: piece.vy + 0.09,
        rotate: piece.rotate + piece.spin,
        life: piece.life - 0.012,
      }))
      .filter((piece) => piece.life > 0)

    confettiPieces.forEach((piece) => {
      ctx.save()
      ctx.globalAlpha = piece.life
      ctx.translate(piece.x, piece.y)
      ctx.rotate(piece.rotate)
      ctx.fillStyle = piece.color
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.64)
      ctx.restore()
    })

    goldRainPieces = goldRainPieces
      .map((piece) => ({
        ...piece,
        x: piece.x + piece.vx,
        y: piece.y + piece.vy,
        vy: piece.vy + 0.03,
        life: piece.life - 0.006,
      }))
      .filter((piece) => piece.life > 0 && piece.y < canvas.height)

    goldRainPieces.forEach((piece) => {
      ctx.save()
      ctx.globalAlpha = piece.life
      ctx.fillStyle = piece.color
      ctx.beginPath()
      ctx.arc(piece.x, piece.y, piece.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })

    ctx.globalAlpha = 1
    if (confettiPieces.length > 0 || goldRainPieces.length > 0) {
      celebrationFrame = window.requestAnimationFrame(draw)
    }
  }

  draw()
}

function stopCelebration() {
  if (celebrationFrame) {
    window.cancelAnimationFrame(celebrationFrame)
    celebrationFrame = 0
  }
  clearCelebrationCanvas()
}

function resetForDifficulty() {
  clearTimeouts()
  stopCelebration()
  stopCloudParticles()
  stopRegenLoop()
  if (renderFrame) {
    window.cancelAnimationFrame(renderFrame)
    renderFrame = 0
  }
  props.audio.stopAll()

  pickTheme()
  completed = false
  roundDirty = false
  regenActive = false
  handActive = false
  handLastPoint = null
  pointerId = null
  detachPointerListeners()
  phase.value = 'ready'
  clearedRatio.value = 0
  totalStrokes.value = 0
  strokeDistancePx.value = 0
  regenEvents.value = 0
  idleRecoverMs.value = 0
  showInstruction.value = true
  confettiPieces = []
  goldRainPieces = []
  clearCelebrationCanvas()
  resizeCanvases()
  startRegenLoop()
}

function handleResize() {
  resetForDifficulty()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  pickTheme()
  resizeCanvases()
  startRegenLoop()
})

watch(() => props.difficulty, () => {
  resetForDifficulty()
})

watch(() => props.paused, (paused) => {
  if (paused) {
    stopRegenLoop()
    stopCelebration()
    detachPointerListeners()
    pointerId = null
    handActive = false
    handLastPoint = null
    props.audio.stopAll()
    return
  }

  if (!completed) {
    scheduleFrostRender()
    startRegenLoop()
  }
})

watch(pointerFallbackMode, () => {
  handActive = false
  handLastPoint = null
  pointerId = null
  detachPointerListeners()
})

onBeforeUnmount(() => {
  clearTimeouts()
  stopRegenLoop()
  stopCelebration()
  stopCloudParticles()
  detachPointerListeners()
  if (renderFrame) {
    window.cancelAnimationFrame(renderFrame)
  }
  props.audio.stopAll()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.cloud-erase-game {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
}

.celebration-canvas {
  position: absolute;
  inset: 0;
  z-index: 30;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.scene-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.aurora-glow {
  position: absolute;
  right: 8%;
  top: 8%;
  width: min(220px, 18vw);
  height: min(220px, 18vw);
  border-radius: 50%;
  filter: blur(10px);
}

.sparkle {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
  animation: twinkle 3s ease-in-out infinite;
}

.scene-hills {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  z-index: 2;
  pointer-events: none;
}

.scene-hills-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.sun-core {
  position: absolute;
  left: 50%;
  top: 12%;
  z-index: 2;
  width: min(22vw, 240px);
  height: min(22vw, 240px);
  border-radius: 50%;
  transition: transform 0.24s ease, box-shadow 0.24s ease;
  pointer-events: none;
}

.sun-glow {
  position: absolute;
  inset: -30%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 204, 82, 0.45), transparent 65%);
  animation: sun-pulse 1.8s ease-in-out infinite;
}

.sun-rays-primary {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  animation: sun-spin 12s linear infinite;
}

.sun-rays-secondary {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  animation: sun-spin 18s linear infinite reverse;
}

.sun-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: sun-warm 3s ease-in-out infinite;
}

.sun-face svg {
  width: 100%;
  height: 100%;
  display: block;
}

.frost-canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;
}

.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 5;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.central-instruction {
  position: absolute;
  left: 50%;
  top: 42%;
  z-index: 6;
  transform: translate(-50%, -50%);
  max-width: min(520px, calc(100% - 48px));
  padding: 20px 32px;
  border-radius: 28px;
  color: #26495f;
  font-size: clamp(20px, 3.2vw, 30px);
  font-weight: 700;
  text-align: center;
  line-height: 1.45;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 36px rgba(60, 114, 145, 0.18);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

.instruction-fade-leave-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.instruction-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -56%) scale(0.96);
}

.top-hud {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 8;
  pointer-events: none;
}

.difficulty-tag {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #36617d;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(76, 119, 148, 0.12);
  backdrop-filter: blur(8px);
}

.bottom-hud {
  position: absolute;
  bottom: 18px;
  left: 24px;
  right: 24px;
  z-index: 8;
  pointer-events: none;
}

.progress-hint {
  margin-bottom: 8px;
  color: rgba(36, 68, 91, 0.78);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.6);
}

.progress-track {
  position: relative;
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: inset 0 2px 4px rgba(60, 114, 145, 0.1);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8ad4ff 0%, #8ee1c4 52%, #ffd36e 100%);
  transition: width 0.16s ease;
}

.progress-marker {
  position: absolute;
  top: -3px;
  width: 4px;
  height: 20px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: rgba(120, 152, 176, 0.7);
}

@keyframes sun-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes sun-pulse {
  0%, 100% { transform: scale(1); opacity: 0.45; }
  50% { transform: scale(1.18); opacity: 0.75; }
}

@keyframes sun-warm {
  0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 179, 3, 0.3)); }
  50% { filter: drop-shadow(0 0 35px rgba(255, 179, 3, 0.5)); }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.32;
  }

  50% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .sun-core {
    top: 8%;
    width: min(28vw, 180px);
    height: min(28vw, 180px);
  }

  .central-instruction {
    font-size: clamp(18px, 4.5vw, 26px);
    padding: 16px 24px;
  }

  .bottom-hud {
    bottom: 12px;
    left: 12px;
    right: 12px;
  }
}
</style>
