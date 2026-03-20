<template>
  <div class="wipe-sadness-game" :style="{ background: theme.skyGradient }">
    <canvas ref="celebrationCanvas" class="celebration-canvas" />

    <div class="backdrop-layer">
      <div class="aurora-glow" :style="{ background: theme.glowGradient }"></div>
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

    <div class="scene-layer">
      <div class="scene-card" :style="{ bottom: `${sceneBottom}px` }">
        <svg viewBox="0 0 420 320" class="scene-svg" aria-hidden="true">
          <defs>
            <linearGradient :id="`${theme.key}-hill`" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" :stop-color="theme.hillStops[0]" />
              <stop offset="100%" :stop-color="theme.hillStops[1]" />
            </linearGradient>
            <linearGradient :id="`${theme.key}-lake`" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" :stop-color="theme.lakeStops[0]" />
              <stop offset="100%" :stop-color="theme.lakeStops[1]" />
            </linearGradient>
          </defs>

          <ellipse cx="210" cy="290" rx="174" ry="26" fill="rgba(31, 80, 98, 0.12)" />
          <path
            d="M38 238c34-48 72-72 118-72 30 0 62 12 88 32 28-28 58-42 94-42 36 0 68 12 114 48v86H38z"
            :fill="`url(#${theme.key}-hill)`"
          />
          <path
            d="M116 228c44-24 104-22 152 6 26 16 62 20 104 6v40H116z"
            :fill="`url(#${theme.key}-lake)`"
            opacity="0.82"
          />
          <path d="M128 244c38 12 72 12 110 0" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="7" stroke-linecap="round" />
        </svg>

        <div class="sun-core" :style="sunCoreStyle">
          <svg viewBox="0 0 220 220" class="sun-svg" aria-hidden="true">
            <g
              v-for="ray in 12"
              :key="ray"
              class="sun-ray"
              :style="{ transform: `rotate(${ray * 30}deg)` }"
            >
              <rect x="102" y="2" width="16" height="46" rx="8" fill="rgba(255, 201, 88, 0.92)" />
            </g>
            <circle cx="110" cy="110" r="72" :fill="theme.sunFill" />
            <circle cx="84" cy="95" r="8" fill="#5b4a2c" />
            <circle cx="136" cy="95" r="8" fill="#5b4a2c" />
            <path d="M78 126c10 18 24 26 32 26 8 0 22-8 32-26" fill="none" stroke="#5b4a2c" stroke-width="8" stroke-linecap="round" />
            <ellipse cx="70" cy="126" rx="13" ry="7" fill="rgba(255, 153, 153, 0.35)" />
            <ellipse cx="150" cy="126" rx="13" ry="7" fill="rgba(255, 153, 153, 0.35)" />
          </svg>
        </div>

        <div class="scene-copy">
          <strong>{{ theme.revealTitle }}</strong>
          <small>{{ revealSubtitle }}</small>
        </div>
      </div>

      <div
        class="scratch-stage"
        :style="{ bottom: `${scratchStageBottom}px`, height: `${scratchStageHeight}px` }"
      >
        <canvas
          ref="frostCanvas"
          class="frost-canvas"
          :class="{ active: isPointerActive }"
          @pointerdown="handlePointerDown"
        />
      </div>
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>擦亮进度</span>
        <strong>{{ clearedLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>累计擦拭</span>
        <strong>{{ totalStrokes }} 次</strong>
      </div>
      <div class="hud-card">
        <span>厚冰层数</span>
        <strong>{{ difficultyConfig.maxStrength }}</strong>
      </div>
    </div>

    <div ref="panelRef" class="instruction-panel">
      <div class="panel-tags">
        <span>{{ theme.title }}</span>
        <span class="accent">{{ difficultyConfig.shortLabel }}</span>
      </div>

      <h2>擦亮坏心情</h2>
      <p>{{ stageMessage }}</p>
      <small>{{ helperMessage }}</small>

      <div class="progress-block">
        <div class="progress-labels">
          <span>还在冰霜里</span>
          <span>越来越亮</span>
          <span>太阳出来啦</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${Math.round(clearedRatio * 100)}%` }"></div>
          <div class="progress-marker" :style="{ left: `${Math.round(difficultyConfig.targetRatio * 100)}%` }"></div>
        </div>
      </div>

      <div class="helper-row">
        <span>{{ distanceLabel }}</span>
        <span>{{ regenLabel }}</span>
      </div>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">☀️</div>
        <strong>阳光笑脸徽章</strong>
        <p>{{ theme.badgeCopy }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  hillStops: [string, string]
  lakeStops: [string, string]
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

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    maxStrength: 1,
    brushRadius: 56,
    erodePower: 0.92,
    targetRatio: 0.72,
    regenDelayMs: Number.POSITIVE_INFINITY,
    regenPerSecond: 0,
    cellSize: 22,
    shortLabel: '简单 · 薄冰立刻融化',
    readyText: '把手指放上去，大范围擦几下，薄薄的冰霜马上就会融开。',
    helperText: '这一关没有重新结冰，只要放心做大动作，把坏心情擦出去就可以。',
    successText: '冰霜已经被你擦得亮晶晶了，太阳马上就要露出来啦！',
  },
  2: {
    maxStrength: 1,
    brushRadius: 50,
    erodePower: 0.62,
    targetRatio: 0.84,
    regenDelayMs: 800,
    regenPerSecond: 0.18,
    cellSize: 20,
    shortLabel: '中等 · 停下会慢慢结冰',
    readyText: '继续连着擦，别停太久哦，不然冰霜会慢慢又跑回来。',
    helperText: '这次要保持连续的大动作，让坏心情没有机会重新结冰。',
    successText: '你一直没有放弃，冰霜已经被你越擦越亮了！',
  },
  3: {
    maxStrength: 3,
    brushRadius: 46,
    erodePower: 0.46,
    targetRatio: 0.92,
    regenDelayMs: Number.POSITIVE_INFINITY,
    regenPerSecond: 0,
    cellSize: 18,
    shortLabel: '困难 · 厚冰要反复擦 3 次',
    readyText: '这是一层厚厚的冰霜。同一个地方要反复擦亮三次，太阳才会真正露出来。',
    helperText: '遇到厚冰别着急，用整只手臂带着手指来回擦，把力量慢慢送出去。',
    successText: '厚冰正在一层层裂开，你把坏心情擦得越来越远了！',
  },
}

const THEMES: readonly Theme[] = [
  {
    key: 'sunny-valley',
    title: '暖阳山谷',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 34%), linear-gradient(180deg, #8fdcff 0%, #dff6ff 54%, #fff6d8 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 235, 168, 0.88), rgba(255, 235, 168, 0))',
    hillStops: ['#8cddb3', '#4f9d77'],
    lakeStops: ['#b6f1ff', '#61b7d9'],
    sunFill: '#ffd460',
    revealTitle: '坏心情正在散开',
    badgeCopy: '今天的坏心情被你擦得干干净净，阳光笑脸徽章已经亮起来了。',
    celebrationLine: '呼，坏心情都被你擦得干干净净啦，太阳出来咯！',
  },
  {
    key: 'breeze-lake',
    title: '微风湖边',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.36), transparent 34%), linear-gradient(180deg, #a7e3ff 0%, #ecfffb 54%, #fff0c9 100%)',
    glowGradient: 'radial-gradient(circle, rgba(205, 255, 236, 0.9), rgba(205, 255, 236, 0))',
    hillStops: ['#95e0bc', '#5ca884'],
    lakeStops: ['#d2f8ff', '#8acfe6'],
    sunFill: '#ffcb52',
    revealTitle: '明亮风景慢慢回来了',
    badgeCopy: '你把湖边的冰霜擦亮了，太阳和微风都在对你笑。',
    celebrationLine: '坏心情被你一点点擦走啦，湖边的阳光又亮起来了。',
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

const FROST_COLORS = ['rgba(227, 246, 255, 0.98)', 'rgba(197, 229, 248, 0.95)', 'rgba(244, 251, 255, 0.92)']
const CONFETTI_COLORS = ['#ffd166', '#8bd3dd', '#ffafcc', '#b8f2e6', '#cdb4ff', '#fff275']
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
const panelRef = ref<HTMLElement | null>(null)
const panelRect = ref({ left: 0, top: 0, width: 0, height: 0 })

const phase = ref<Phase>('ready')
const stageMessage = ref(DIFFICULTY_CONFIGS[1].readyText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const clearedRatio = ref(0)
const totalStrokes = ref(0)
const strokeDistancePx = ref(0)
const regenEvents = ref(0)
const idleRecoverMs = ref(0)
const showBadge = ref(false)
const isPointerActive = ref(false)

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
let pointerId: number | null = null
let lastPoint: Point | null = null
let confettiPieces: ConfettiPiece[] = []

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty])

const difficultyLabel = computed(() => {
  if (props.difficulty === 1) return '简单 · 薄冰'
  if (props.difficulty === 2) return '中等 · 连续擦除'
  return '困难 · 三层厚冰'
})

const panelSafeBottom = computed(() => (panelRect.value.height > 0 ? panelRect.value.height + 28 : 296))
const scratchStageBottom = computed(() => panelSafeBottom.value + 18)
const scratchStageHeight = computed(() => Math.max(280, window.innerHeight - scratchStageBottom.value - 148))
const sceneBottom = computed(() => panelSafeBottom.value + 26)

const clearedLabel = computed(() => `${Math.round(clearedRatio.value * 100)}%`)
const distanceLabel = computed(() => `累计轨迹 ${Math.round(strokeDistancePx.value)} px`)
const regenLabel = computed(() => {
  if (props.difficulty !== 2) return `恢复计时 ${Math.round(idleRecoverMs.value / 1000)} 秒`
  return regenEvents.value > 0
    ? `重新结冰 ${regenEvents.value} 次 / ${Math.round(idleRecoverMs.value / 1000)} 秒`
    : '保持连续擦除，别让冰霜回来'
})

const revealSubtitle = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '你把底下的阳光和笑脸都擦出来了。'
  }
  if (props.difficulty === 3) {
    return `同一块厚冰还需要反复擦亮，当前已经擦开 ${clearedLabel.value}。`
  }
  return `继续做大动作，底下的笑脸已经露出了 ${clearedLabel.value}。`
})

const sunCoreStyle = computed(() => {
  const scale = phase.value === 'celebrating' || phase.value === 'finished'
    ? 1.16
    : 0.9 + clearedRatio.value * 0.24
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

function updatePanelRect() {
  const panelEl = panelRef.value
  if (!panelEl) {
    panelRect.value = { left: 0, top: 0, width: 0, height: 0 }
    return
  }

  const rect = panelEl.getBoundingClientRect()
  panelRect.value = {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

async function syncPanelRect() {
  await nextTick()
  updatePanelRect()
}

function createTemplateCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const base = ctx.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, 'rgba(236, 248, 255, 0.98)')
  base.addColorStop(0.55, 'rgba(205, 228, 243, 0.94)')
  base.addColorStop(1, 'rgba(241, 250, 255, 0.92)')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  for (let index = 0; index < 42; index += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    const radius = 30 + Math.random() * 90
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.6)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.38)'
  ctx.lineCap = 'round'
  for (let index = 0; index < 28; index += 1) {
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    const startX = Math.random() * width
    const startY = Math.random() * height
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX + (Math.random() - 0.5) * 120, startY + Math.random() * 48)
    ctx.stroke()
  }

  return canvas
}

function initGrid(width: number, height: number) {
  gridCellSize = difficultyConfig.value.cellSize
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
  const celebrationRect = celebration.getBoundingClientRect()

  frost.width = Math.max(1, Math.round(frostRect.width))
  frost.height = Math.max(1, Math.round(frostRect.height))
  celebration.width = Math.max(1, Math.round(celebrationRect.width))
  celebration.height = Math.max(1, Math.round(celebrationRect.height))

  frostContext = frost.getContext('2d')
  celebrationContext = celebration.getContext('2d')
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
        ctx.fillStyle = FROST_COLORS[(row + col) % FROST_COLORS.length] ?? FROST_COLORS[0] ?? '#ffffff'
        ctx.fillRect(x, y, w, h)
      }
    }
  }

  ctx.globalAlpha = 1
  const border = ctx.createLinearGradient(0, 0, width, height)
  border.addColorStop(0, 'rgba(255,255,255,0.55)')
  border.addColorStop(1, 'rgba(150, 205, 232, 0.24)')
  ctx.strokeStyle = border
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, width - 6, height - 6)
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
  const radius = difficultyConfig.value.brushRadius
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
  const radius = difficultyConfig.value.brushRadius
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

function markDirtyOnce() {
  if (roundDirty) return
  roundDirty = true
  props.markRoundDirty?.()
}

function beginWipingState() {
  if (phase.value === 'ready') {
    stageMessage.value = difficultyConfig.value.readyText
    helperMessage.value = difficultyConfig.value.helperText
  }
  phase.value = 'wiping'
}

function paintInterpolatedStroke(from: Point, to: Point) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const spacing = Math.max(12, difficultyConfig.value.brushRadius * 0.38)
  const steps = Math.max(1, Math.ceil(distance / spacing))

  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps
    const x = from.x + (to.x - from.x) * ratio
    const y = from.y + (to.y - from.y) * ratio
    stampVisualErase(x, y)
    applyBrushToGrid(x, y)
  }

  strokeDistancePx.value += distance
}

function maybeCompleteSession() {
  if (completed || clearedRatio.value < difficultyConfig.value.targetRatio) return
  completed = true
  phase.value = 'celebrating'
  stageMessage.value = difficultyConfig.value.successText
  helperMessage.value = '坏心情都被你擦得远远的，太阳正在发光。'
  isPointerActive.value = false
  pointerId = null
  lastPoint = null
  detachPointerListeners()
  stopRegenLoop()
  props.audio.playSuccessCue().catch(() => {
    // ignore
  })
  props.audio.speak(theme.value.celebrationLine)
  runCelebration()
  scheduleTimeout(() => {
    showBadge.value = true
  }, 880)
  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_SUNSHINE_SMILE',
        badgeName: '阳光笑脸徽章',
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

function handlePointerDown(event: PointerEvent) {
  if (props.paused || completed) return
  const point = getLocalPoint(event)
  if (!point) return

  event.preventDefault()
  pointerId = event.pointerId
  lastPoint = point
  isPointerActive.value = true
  markDirtyOnce()
  beginWipingState()
  totalStrokes.value += 1
  lastInteractionAt = performance.now()
  regenActive = false

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
  if (!point || !lastPoint) return

  event.preventDefault()
  beginWipingState()
  paintInterpolatedStroke(lastPoint, point)
  lastPoint = point
  lastInteractionAt = performance.now()
  regenActive = false
  scheduleFrostRender()
  maybeCompleteSession()
}

function finishPointer(event?: PointerEvent) {
  if (pointerId === null) return
  if (event && event.pointerId !== pointerId) return
  pointerId = null
  lastPoint = null
  isPointerActive.value = false
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
    brush_radius_px: difficultyConfig.value.brushRadius,
    theme_key: theme.value.key,
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
    && pointerId === null
    && phase.value === 'wiping'
    && now - lastInteractionAt >= difficultyConfig.value.regenDelayMs
  ) {
    if (!regenActive) {
      regenActive = true
      regenEvents.value += 1
      helperMessage.value = '停太久的话，冰霜会慢慢回来，继续大范围擦一擦吧。'
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

    ctx.globalAlpha = 1
    if (confettiPieces.length > 0) {
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
  stopRegenLoop()
  if (renderFrame) {
    window.cancelAnimationFrame(renderFrame)
    renderFrame = 0
  }
  props.audio.stopAll()
  detachPointerListeners()

  pickTheme()
  completed = false
  roundDirty = false
  regenActive = false
  pointerId = null
  lastPoint = null
  isPointerActive.value = false
  phase.value = 'ready'
  stageMessage.value = difficultyConfig.value.readyText
  helperMessage.value = difficultyConfig.value.helperText
  clearedRatio.value = 0
  totalStrokes.value = 0
  strokeDistancePx.value = 0
  regenEvents.value = 0
  idleRecoverMs.value = 0
  showBadge.value = false
  confettiPieces = []
  clearCelebrationCanvas()
  syncPanelRect().then(() => {
    resizeCanvases()
    startRegenLoop()
  }).catch(() => {
    resizeCanvases()
    startRegenLoop()
  })
}

function handleResize() {
  resetForDifficulty()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('resize', updatePanelRect)
  syncPanelRect().then(() => {
    pickTheme()
    resizeCanvases()
    stageMessage.value = difficultyConfig.value.readyText
    helperMessage.value = difficultyConfig.value.helperText
    startRegenLoop()
  }).catch(() => {
    pickTheme()
    resizeCanvases()
    startRegenLoop()
  })
})

watch(() => props.difficulty, () => {
  resetForDifficulty()
})

watch(
  () => `${stageMessage.value}|${helperMessage.value}|${props.difficulty}`,
  () => {
    syncPanelRect().catch(() => {
      // ignore
    })
  },
)

watch(() => props.paused, (paused) => {
  if (paused) {
    stopRegenLoop()
    stopCelebration()
    detachPointerListeners()
    props.audio.stopAll()
    return
  }

  if (!completed) {
    scheduleFrostRender()
    startRegenLoop()
  }
})

onBeforeUnmount(() => {
  clearTimeouts()
  stopRegenLoop()
  stopCelebration()
  if (renderFrame) {
    window.cancelAnimationFrame(renderFrame)
  }
  detachPointerListeners()
  props.audio.stopAll()
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('resize', updatePanelRect)
})
</script>

<style scoped>
.wipe-sadness-game {
  position: relative;
  min-height: calc(100vh - 120px);
  overflow: hidden;
}

.celebration-canvas {
  position: absolute;
  inset: 0;
  z-index: 15;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.backdrop-layer,
.scene-layer,
.hud-panel,
.instruction-panel {
  position: relative;
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.aurora-glow {
  position: absolute;
  right: 8%;
  top: 8%;
  width: 220px;
  height: 220px;
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

.scene-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.scene-card {
  position: absolute;
  left: 50%;
  width: min(82vw, 520px);
  height: min(48vh, 360px);
  transform: translateX(-50%);
}

.scene-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.sun-core {
  position: absolute;
  left: 50%;
  top: 12px;
  width: 210px;
  height: 210px;
  margin-left: -105px;
  border-radius: 50%;
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.sun-svg {
  width: 100%;
  height: 100%;
  display: block;
  filter: drop-shadow(0 20px 24px rgba(246, 179, 65, 0.18));
}

.sun-ray {
  transform-origin: 110px 110px;
}

.scene-copy {
  position: absolute;
  left: 50%;
  bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transform: translateX(-50%);
  color: #31546f;
  text-align: center;
}

.scene-copy strong {
  font-size: 22px;
  color: #26495f;
}

.scene-copy small {
  max-width: 320px;
  line-height: 1.55;
  color: #5e7a92;
}

.scratch-stage {
  position: absolute;
  left: 50%;
  z-index: 4;
  width: min(90vw, 760px);
  transform: translateX(-50%);
}

.frost-canvas {
  position: absolute;
  inset: 0;
  z-index: 5;
  width: 100%;
  height: 100%;
  border-radius: 36px;
  box-shadow: 0 26px 44px rgba(75, 132, 168, 0.18);
  touch-action: none;
  cursor: grab;
}

.frost-canvas.active {
  cursor: grabbing;
}

.hud-panel {
  position: absolute;
  top: 102px;
  left: 24px;
  right: 24px;
  z-index: 7;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.hud-card {
  min-height: 80px;
  padding: 14px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 16px 28px rgba(60, 114, 145, 0.12);
  backdrop-filter: blur(10px);
}

.hud-card span {
  display: block;
  margin-bottom: 8px;
  color: #6f8aa0;
  font-size: 13px;
}

.hud-card strong {
  display: block;
  color: #24445b;
  font-size: 20px;
}

.instruction-panel {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  z-index: 9;
  padding: 22px 24px 24px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 22px 42px rgba(67, 116, 146, 0.16);
  backdrop-filter: blur(12px);
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.panel-tags span {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: #36617d;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 10px 18px rgba(76, 119, 148, 0.1);
}

.panel-tags .accent {
  background: rgba(255, 229, 176, 0.88);
  color: #8a6114;
}

.instruction-panel h2 {
  margin: 0 0 8px;
  color: #24445b;
  font-size: 34px;
}

.instruction-panel p {
  margin: 0 0 6px;
  color: #4f6e85;
  line-height: 1.65;
  font-size: 18px;
}

.instruction-panel small {
  display: block;
  color: #6f8aa0;
  line-height: 1.55;
  font-size: 14px;
}

.progress-block {
  margin-top: 18px;
}

.progress-labels,
.helper-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.progress-labels {
  margin-bottom: 10px;
  color: #6f8aa0;
  font-size: 13px;
}

.progress-track {
  position: relative;
  height: 18px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(219, 236, 245, 0.88);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #8ad4ff 0%, #8ee1c4 52%, #ffd36e 100%);
  transition: width 0.16s ease;
}

.progress-marker {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 26px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: rgba(120, 152, 176, 0.9);
}

.helper-row {
  margin-top: 14px;
  color: #5f7d94;
  font-size: 14px;
}

.badge-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 16;
  width: min(360px, calc(100% - 40px));
  padding: 28px 24px;
  border-radius: 28px;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #304b3f;
  background: rgba(255, 250, 229, 0.96);
  box-shadow: 0 26px 46px rgba(63, 94, 72, 0.2);
}

.badge-icon {
  display: grid;
  place-items: center;
  width: 90px;
  height: 90px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff6bf 0%, #ffd166 68%, #ffb703 100%);
  font-size: 42px;
  box-shadow: 0 0 24px rgba(255, 209, 102, 0.56);
}

.badge-modal strong {
  display: block;
  margin-bottom: 10px;
  font-size: 28px;
}

.badge-modal p {
  margin: 0;
  line-height: 1.7;
  color: #5e6f56;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: all 0.28s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -42%) scale(0.94);
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

@media (max-width: 980px) {
  .wipe-sadness-game {
    min-height: calc(100vh - 92px);
  }

  .hud-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    top: 128px;
    left: 16px;
    right: 16px;
  }

  .instruction-panel {
    left: 12px;
    right: 12px;
    bottom: 12px;
    padding: 18px;
  }

  .instruction-panel h2 {
    font-size: 28px;
  }

  .instruction-panel p {
    font-size: 16px;
  }

  .helper-row {
    flex-direction: column;
  }

  .scene-card {
    width: min(92vw, 440px);
  }

  .sun-core {
    width: 182px;
    height: 182px;
    margin-left: -91px;
  }

  .scratch-stage {
    width: min(95vw, 720px);
  }
}
</style>
