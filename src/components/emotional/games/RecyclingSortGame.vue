<template>
  <div ref="rootRef" class="recycling-sort-game" :style="{ background: sessionTheme.background }">
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
        <span>分拣进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>正确分拣</span>
        <strong>{{ sortedItems }} 个</strong>
      </div>
      <div class="hud-card">
        <span>漏掉物品</span>
        <strong>{{ missedItems }} 次</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section ref="playFieldRef" class="play-field">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ sessionTheme.title }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <article class="mission-card">
          <div class="mission-card__heading">
            <div>
              <span class="mission-card__chip">分拣任务</span>
              <strong>{{ currentItem ? `把「${currentItem.label}」送到正确分类桶` : '准备下一件物品' }}</strong>
            </div>
            <p>{{ currentGoalLabel }}</p>
          </div>

          <p class="mission-card__description">{{ helperMessage }}</p>

          <div class="mission-clues">
            <span v-for="bin in BINS" :key="bin.id">{{ bin.emoji }} {{ bin.label }}：{{ bin.shortHint }}</span>
          </div>
        </article>

        <div class="fall-stage">
          <button
            v-if="currentItem"
            type="button"
            class="falling-item"
            :class="{
              dragging: !!dragState,
              bouncing: currentItem.isBouncing,
            }"
            :style="getItemStyle(currentItem)"
            :disabled="props.paused || phase === 'celebrating'"
            @pointerdown.prevent="beginDrag($event)"
          >
            <span class="falling-item__emoji">{{ currentItem.emoji }}</span>
            <strong>{{ currentItem.label }}</strong>
            <small>{{ currentItem.shortHint }}</small>
          </button>
        </div>

        <div class="bin-row">
          <article
            v-for="bin in BINS"
            :key="bin.id"
            :ref="(el) => setBinRef(bin.id, el)"
            class="sort-bin"
            :class="{ hovering: hoverBinId === bin.id }"
          >
            <div class="sort-bin__lid" :style="{ background: bin.accent }"></div>
            <div class="sort-bin__body" :style="{ background: bin.tint }">
              <span class="sort-bin__emoji">{{ bin.emoji }}</span>
              <strong>{{ bin.label }}</strong>
              <small>{{ bin.shortHint }}</small>
            </div>
          </article>
        </div>

        <div class="field-footer">
          <div class="field-footer__left">
            <strong>{{ fieldStatus }}</strong>
            <span>{{ footerHint }}</span>
          </div>
          <div class="field-footer__right">
            <span>错误投放 {{ wrongDrops }} 次</span>
            <span>总拖拽 {{ totalDrags }} 次</span>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>精细动作</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>分拣小能手</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ sessionTheme.helperLine }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>先看物品</span>
            <span>再拖去分类桶</span>
            <span>分拣完成</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>当前物品</strong>
            <span>{{ currentItem?.label || '等待下一件' }}</span>
          </div>
          <div class="tip-card">
            <strong>估算准确率</strong>
            <span>{{ accuracyLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>平均分拣</strong>
            <span>{{ averageSortLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>掉落速度</strong>
            <span>{{ speedLabel }}</span>
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
        <div class="badge-icon">♻️</div>
        <strong>分类小达人徽章</strong>
        <p>{{ difficultyConfig.successText }}</p>
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

type Phase = 'ready' | 'playing' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'
type BinId = 'paper' | 'plastic' | 'food'

interface DifficultyConfig {
  targetItemCount: number
  speedRange: readonly [number, number]
  swayAmplitude: number
  swaySpeedRange: readonly [number, number]
  shortLabel: string
  readyText: string
  helperText: string
  successText: string
}

interface ThemeDefinition {
  key: string
  title: string
  background: string
  glow: string
  helperLine: string
  celebrationLine: string
}

interface BinDefinition {
  id: BinId
  label: string
  emoji: string
  shortHint: string
  accent: string
  tint: string
}

interface ItemDefinition {
  id: string
  label: string
  emoji: string
  shortHint: string
  targetBinId: BinId
  accent: string
  tint: string
}

interface SessionItem extends ItemDefinition {
  x: number
  y: number
  baseX: number
  speed: number
  swayAmplitude: number
  swaySpeed: number
  swayPhase: number
  elapsedMs: number
  spawnedAt: number
  isBouncing: boolean
}

interface DragState {
  pointerId: number
  offsetX: number
  offsetY: number
}

interface SparkleDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const ITEM_WIDTH = 168
const ITEM_HEIGHT = 124

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    targetItemCount: 4,
    speedRange: [84, 98],
    swayAmplitude: 18,
    swaySpeedRange: [1.2, 1.5],
    shortLabel: '简单 · 掉落更慢',
    readyText: '先看清楚物品是什么，再把它稳稳拖到正确的分类桶里。',
    helperText: '简单模式的物品掉得更慢，可以先认一认“纸类、塑料、厨余”再出手。',
    successText: '这些物品都被你送到了正确分类桶里，分类小达人徽章亮起来了。',
  },
  2: {
    targetItemCount: 5,
    speedRange: [102, 118],
    swayAmplitude: 24,
    swaySpeedRange: [1.5, 1.9],
    shortLabel: '中等 · 掉落更快',
    readyText: '这次物品会掉得更快，先看清类别，再拖到正确桶里。',
    helperText: '中等模式要更快决定物品属于哪一类，别让它们直接掉下去。',
    successText: '你已经能在更快的掉落节奏里稳稳分拣物品了。',
  },
  3: {
    targetItemCount: 6,
    speedRange: [118, 138],
    swayAmplitude: 30,
    swaySpeedRange: [1.8, 2.3],
    shortLabel: '困难 · 速度和摆动都更大',
    readyText: '困难模式里物品掉得更快，也会左右轻轻晃动，要更稳地抓住再分类。',
    helperText: '先判断是什么，再稳稳拖去分类桶，不要因为着急把物品送错地方。',
    successText: '你已经能在更快更晃的节奏里保持稳定分拣，今天的手眼配合很不错。',
  },
}

const THEMES: readonly ThemeDefinition[] = [
  {
    key: 'sunny-park',
    title: '晴空分类站',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.32), transparent 34%), linear-gradient(180deg, #a7e5ff 0%, #dbf7f2 46%, #fff4ce 100%)',
    glow: 'radial-gradient(circle, rgba(255, 211, 110, 0.62), rgba(255, 211, 110, 0))',
    helperLine: '先认出物品，再把它拖到真正应该去的分类桶。',
    celebrationLine: '分类站里的物品都被你送对地方啦，地面也变得更整齐了。',
  },
  {
    key: 'mint-yard',
    title: '薄荷回收角',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.28), transparent 35%), linear-gradient(180deg, #b6f3ff 0%, #ebfff7 44%, #ffe8c8 100%)',
    glow: 'radial-gradient(circle, rgba(154, 231, 202, 0.56), rgba(154, 231, 202, 0))',
    helperLine: '纸、塑料和厨余都要分开放，先看清楚再拖过去。',
    celebrationLine: '回收角里的每一件物品都被你分好了，今天真的很会整理。',
  },
  {
    key: 'apricot-garden',
    title: '杏色环保园',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.26), transparent 34%), linear-gradient(180deg, #c7f0ff 0%, #fff6dd 46%, #ffe0cf 100%)',
    glow: 'radial-gradient(circle, rgba(255, 183, 126, 0.5), rgba(255, 183, 126, 0))',
    helperLine: '掉下来的是哪一类，就把它送到那个桶里，不要急着乱放。',
    celebrationLine: '环保园里的物品都进了正确的桶，分类路线已经被你理顺了。',
  },
]

const BINS: readonly BinDefinition[] = [
  {
    id: 'paper',
    label: '纸类桶',
    emoji: '📄',
    shortHint: '报纸、纸盒、卡纸',
    accent: '#73a8ff',
    tint: 'linear-gradient(180deg, #eef5ff 0%, #dbeaff 100%)',
  },
  {
    id: 'plastic',
    label: '塑料桶',
    emoji: '🧴',
    shortHint: '塑料瓶、杯子、盒子',
    accent: '#7acb92',
    tint: 'linear-gradient(180deg, #eefcf2 0%, #d8f3df 100%)',
  },
  {
    id: 'food',
    label: '厨余桶',
    emoji: '🍎',
    shortHint: '果皮、菜叶、剩食',
    accent: '#f4b25f',
    tint: 'linear-gradient(180deg, #fff7e8 0%, #ffe5b8 100%)',
  },
]

const ITEMS: readonly ItemDefinition[] = [
  {
    id: 'newspaper',
    label: '旧报纸',
    emoji: '📰',
    shortHint: '纸张要送去纸类桶',
    targetBinId: 'paper',
    accent: '#6e99f5',
    tint: '#eef4ff',
  },
  {
    id: 'cardboard-box',
    label: '纸盒',
    emoji: '📦',
    shortHint: '拆下来的纸盒属于纸类',
    targetBinId: 'paper',
    accent: '#7da8ff',
    tint: '#edf3ff',
  },
  {
    id: 'drawing-paper',
    label: '卡纸',
    emoji: '🗒️',
    shortHint: '画完的卡纸也算纸类',
    targetBinId: 'paper',
    accent: '#88a9f5',
    tint: '#eff4ff',
  },
  {
    id: 'plastic-bottle',
    label: '塑料瓶',
    emoji: '🧴',
    shortHint: '塑料瓶要进塑料桶',
    targetBinId: 'plastic',
    accent: '#63c389',
    tint: '#eefaf2',
  },
  {
    id: 'yogurt-cup',
    label: '酸奶杯',
    emoji: '🥛',
    shortHint: '塑料杯也要分类到塑料',
    targetBinId: 'plastic',
    accent: '#75c99a',
    tint: '#eefbf4',
  },
  {
    id: 'plastic-tray',
    label: '塑料盒',
    emoji: '🧺',
    shortHint: '轻轻的塑料盒属于塑料',
    targetBinId: 'plastic',
    accent: '#7ccf9f',
    tint: '#effbf4',
  },
  {
    id: 'banana-peel',
    label: '香蕉皮',
    emoji: '🍌',
    shortHint: '果皮属于厨余',
    targetBinId: 'food',
    accent: '#efb054',
    tint: '#fff7e6',
  },
  {
    id: 'apple-core',
    label: '苹果核',
    emoji: '🍎',
    shortHint: '吃剩的果核要进厨余桶',
    targetBinId: 'food',
    accent: '#f1a95f',
    tint: '#fff6e8',
  },
  {
    id: 'vegetable-leaf',
    label: '菜叶',
    emoji: '🥬',
    shortHint: '菜叶属于厨余',
    targetBinId: 'food',
    accent: '#e8b363',
    tint: '#fff8e9',
  },
]

const sparkles: readonly SparkleDot[] = [
  { id: 1, left: 8, top: 14, size: 10, delay: 0 },
  { id: 2, left: 18, top: 76, size: 8, delay: 1.1 },
  { id: 3, left: 34, top: 10, size: 12, delay: 0.6 },
  { id: 4, left: 56, top: 15, size: 9, delay: 1.7 },
  { id: 5, left: 78, top: 80, size: 11, delay: 0.4 },
  { id: 6, left: 90, top: 24, size: 7, delay: 1.5 },
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

const rootRef = ref<HTMLElement | null>(null)
const playFieldRef = ref<HTMLElement | null>(null)
const sessionTheme = ref<ThemeDefinition>(THEMES[0]!)
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const itemQueue = ref<ItemDefinition[]>([])
const queueIndex = ref(0)
const currentItem = ref<SessionItem | null>(null)
const dragState = ref<DragState | null>(null)
const hoverBinId = ref<BinId | null>(null)
const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const stageMessage = ref(DIFFICULTY_CONFIGS[1].readyText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const showBadge = ref(false)
const sortedItems = ref(0)
const wrongDrops = ref(0)
const missedItems = ref(0)
const totalDrags = ref(0)
const sortTimesMs = ref<number[]>([])
const sortedItemIds = ref<string[]>([])
const sortedBinIds = ref<string[]>([])
const playFieldRect = ref({ width: 980, height: 620 })
const lastFrameAt = ref(0)

const binRefs = new Map<BinId, HTMLElement>()
let animationFrame = 0
let roundDirty = false
const timers: number[] = []

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value] || DIFFICULTY_CONFIGS[1])
const processedCount = computed(() => sortedItems.value + missedItems.value)
const progressRatio = computed(() => {
  return processedCount.value / Math.max(1, difficultyConfig.value.targetItemCount)
})
const progressLabel = computed(() => `${processedCount.value}/${difficultyConfig.value.targetItemCount} 件`)
const difficultyLabel = computed(() => difficultyConfig.value.shortLabel)
const accuracyLabel = computed(() => {
  const attempts = sortedItems.value + wrongDrops.value + missedItems.value
  if (attempts <= 0) {
    return '-'
  }

  return `${Math.round((sortedItems.value / attempts) * 100)}%`
})
const averageSortLabel = computed(() => formatResponseTime(averageNumberList(sortTimesMs.value)))
const speedLabel = computed(() => `${difficultyConfig.value.speedRange[0]}-${difficultyConfig.value.speedRange[1]} px/s`)
const currentGoalLabel = computed(() => {
  if (!currentItem.value) {
    return '准备下一件掉落物品'
  }

  const targetBin = BINS.find((bin) => bin.id === currentItem.value?.targetBinId)
  return targetBin ? `应该送到 ${targetBin.label}` : '看清楚物品属于哪一类'
})
const fieldStatus = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '所有物品都分拣完成了'
  }

  if (!currentItem.value) {
    return '等待下一件物品'
  }

  return `当前掉落：${currentItem.value.label}`
})
const footerHint = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return currentItem.value
    ? `把 ${currentItem.value.label} 稳稳拖到正确分类桶。`
    : difficultyConfig.value.helperText
})
const panelDescription = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return difficultyConfig.value.readyText
})
const missThreshold = computed(() => playFieldRect.value.height - 208)

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

function buildQueue(difficulty: EmotionGameDifficulty) {
  const config = DIFFICULTY_CONFIGS[difficulty]
  const shuffled = shuffleArray(ITEMS)
  return shuffled.slice(0, config.targetItemCount)
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

function syncPlayFieldRect() {
  const width = playFieldRef.value?.clientWidth || 980
  const height = playFieldRef.value?.clientHeight || 620
  playFieldRect.value = {
    width: Math.max(760, Math.round(width)),
    height: Math.max(580, Math.round(height)),
  }
}

function spawnNextItem() {
  const definition = itemQueue.value[queueIndex.value]
  if (!definition) {
    currentItem.value = null
    if (processedCount.value >= difficultyConfig.value.targetItemCount) {
      finishSession()
    }
    return
  }

  const [minSpeed, maxSpeed] = difficultyConfig.value.speedRange
  const speed = minSpeed + Math.random() * (maxSpeed - minSpeed)
  const swaySpeed = difficultyConfig.value.swaySpeedRange[0]
    + Math.random() * (difficultyConfig.value.swaySpeedRange[1] - difficultyConfig.value.swaySpeedRange[0])
  const baseX = 64 + Math.random() * Math.max(120, playFieldRect.value.width - ITEM_WIDTH - 128)

  currentItem.value = {
    ...definition,
    x: baseX,
    y: -ITEM_HEIGHT,
    baseX,
    speed,
    swayAmplitude: difficultyConfig.value.swayAmplitude,
    swaySpeed,
    swayPhase: Math.random() * Math.PI * 2,
    elapsedMs: 0,
    spawnedAt: performance.now(),
    isBouncing: false,
  }
  queueIndex.value += 1
  phase.value = 'playing'
  statusTone.value = 'neutral'
  stageMessage.value = `看清楚「${definition.label}」属于哪一类，再拖到正确的桶。`
  helperMessage.value = definition.shortHint
}

function scheduleNextItem(delay = 420) {
  scheduleTimeout(() => {
    if (!props.paused) {
      spawnNextItem()
    }
  }, delay)
}

function setBinRef(binId: BinId, element: unknown) {
  if (element instanceof HTMLElement) {
    binRefs.set(binId, element)
    return
  }

  binRefs.delete(binId)
}

function getItemStyle(item: SessionItem) {
  return {
    width: `${ITEM_WIDTH}px`,
    height: `${ITEM_HEIGHT}px`,
    transform: `translate(${item.x}px, ${item.y}px)`,
    '--item-accent': item.accent,
    '--item-tint': item.tint,
  }
}

function findHoveredBin(clientX: number, clientY: number) {
  for (const bin of BINS) {
    const element = binRefs.get(bin.id)
    if (!element) {
      continue
    }

    const rect = element.getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
      return bin.id
    }
  }

  return null
}

function attachPointerListeners() {
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerCancel)
}

function detachPointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerCancel)
}

function clampPosition(x: number, y: number) {
  const maxX = Math.max(16, playFieldRect.value.width - ITEM_WIDTH - 16)
  const maxY = Math.max(12, playFieldRect.value.height - ITEM_HEIGHT - 176)

  return {
    x: Math.max(16, Math.min(x, maxX)),
    y: Math.max(12, Math.min(y, maxY)),
  }
}

function beginDrag(event: PointerEvent) {
  if (props.paused || phase.value === 'celebrating' || !currentItem.value) {
    return
  }

  const fieldRect = playFieldRef.value?.getBoundingClientRect()
  if (!fieldRect) {
    return
  }

  event.preventDefault()
  markRoundDirtyOnce()
  totalDrags.value += 1
  startAmbientIfNeeded()
  dragState.value = {
    pointerId: event.pointerId,
    offsetX: event.clientX - (fieldRect.left + currentItem.value.x),
    offsetY: event.clientY - (fieldRect.top + currentItem.value.y),
  }
  hoverBinId.value = null
  attachPointerListeners()
  updateDragPosition(event.clientX, event.clientY)
}

function updateDragPosition(clientX: number, clientY: number) {
  const fieldRect = playFieldRef.value?.getBoundingClientRect()
  const item = currentItem.value
  const drag = dragState.value
  if (!fieldRect || !item || !drag) {
    return
  }

  const next = clampPosition(
    clientX - fieldRect.left - drag.offsetX,
    clientY - fieldRect.top - drag.offsetY,
  )
  item.x = next.x
  item.y = next.y
  hoverBinId.value = findHoveredBin(clientX, clientY)
}

function registerWrongDrop(item: SessionItem, targetBinId: BinId | null) {
  wrongDrops.value += 1
  item.isBouncing = true
  hoverBinId.value = null
  statusTone.value = 'gentle'

  if (targetBinId) {
    const targetBin = BINS.find((bin) => bin.id === targetBinId)
    stageMessage.value = `${item.label} 还不应该进${targetBin?.label || '这个桶'}。`
    helperMessage.value = `${item.label} 再看看它属于哪一类。`
  } else {
    stageMessage.value = `${item.label} 还没有送进任何分类桶。`
    helperMessage.value = '再抓稳一点，把它拖到真正的分类桶里。'
  }

  playSoftCue()
  scheduleTimeout(() => {
    if (!currentItem.value || currentItem.value.id !== item.id) {
      return
    }

    currentItem.value.isBouncing = false
  }, 260)
}

function handleCorrectSort(item: SessionItem, binId: BinId) {
  const elapsed = Math.max(0, Math.round(performance.now() - item.spawnedAt))
  sortedItems.value += 1
  sortTimesMs.value = [...sortTimesMs.value, elapsed]
  sortedItemIds.value = [...sortedItemIds.value, item.id]
  sortedBinIds.value = [...sortedBinIds.value, binId]
  hoverBinId.value = null
  currentItem.value = null
  statusTone.value = 'success'
  stageMessage.value = `${item.label} 已经送进正确分类桶。`
  helperMessage.value = '继续看看下一件掉落物品应该进哪个桶。'
  playSuccessCue(`${item.label} 放对了。`)

  if (processedCount.value >= difficultyConfig.value.targetItemCount) {
    finishSession()
    return
  }

  scheduleNextItem()
}

function finishCurrentDrag(clientX: number, clientY: number) {
  const drag = dragState.value
  const item = currentItem.value
  dragState.value = null
  detachPointerListeners()

  if (!drag || !item) {
    hoverBinId.value = null
    return
  }

  const binId = findHoveredBin(clientX, clientY)
  if (!binId) {
    hoverBinId.value = null
    item.baseX = item.x
    item.y = Math.max(0, item.y)
    return
  }

  if (binId === item.targetBinId) {
    handleCorrectSort(item, binId)
    return
  }

  registerWrongDrop(item, binId)
}

function handlePointerMove(event: PointerEvent) {
  const drag = dragState.value
  if (!drag || props.paused || event.pointerId !== drag.pointerId) {
    return
  }

  event.preventDefault()
  updateDragPosition(event.clientX, event.clientY)
}

function handlePointerUp(event: PointerEvent) {
  const drag = dragState.value
  if (!drag || event.pointerId !== drag.pointerId) {
    return
  }

  finishCurrentDrag(event.clientX, event.clientY)
}

function handlePointerCancel(event: PointerEvent) {
  const drag = dragState.value
  if (!drag || event.pointerId !== drag.pointerId) {
    return
  }

  dragState.value = null
  detachPointerListeners()
  hoverBinId.value = null
}

function registerMissedItem() {
  const item = currentItem.value
  if (!item) {
    return
  }

  missedItems.value += 1
  currentItem.value = null
  hoverBinId.value = null
  statusTone.value = 'gentle'
  stageMessage.value = `${item.label} 掉下去了，下次要更快把它拖进桶里。`
  helperMessage.value = '物品掉到底部前要先抓住，再拖去正确分类桶。'
  playSoftCue()

  if (processedCount.value >= difficultyConfig.value.targetItemCount) {
    finishSession()
    return
  }

  scheduleNextItem(520)
}

function buildPerformanceData() {
  return {
    target_item_count: difficultyConfig.value.targetItemCount,
    sorted_items: sortedItems.value,
    wrong_drops: wrongDrops.value,
    missed_items: missedItems.value,
    total_drags: totalDrags.value,
    accuracy_ratio: Number((sortedItems.value / Math.max(1, sortedItems.value + wrongDrops.value + missedItems.value)).toFixed(4)),
    sort_times_ms: [...sortTimesMs.value],
    average_sort_ms: Math.round(averageNumberList(sortTimesMs.value)),
    queue_item_ids: itemQueue.value.map((item) => item.id),
    sorted_item_ids: [...sortedItemIds.value],
    sorted_bin_ids: [...sortedBinIds.value],
    bin_ids: BINS.map((bin) => bin.id),
    bin_labels: BINS.map((bin) => bin.label),
    fall_speed_min_px: difficultyConfig.value.speedRange[0],
    fall_speed_max_px: difficultyConfig.value.speedRange[1],
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
  stageMessage.value = '所有掉落物品都已经分拣完成。'
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
        badgeCode: 'BADGE_SORTING_PRO',
        badgeName: '分类小达人徽章',
      },
    })
    phase.value = 'finished'
  }, 1300)

  scheduleTimeout(() => {
    if (!props.paused) {
      resetForDifficulty(activeDifficulty.value)
    }
  }, 3200)
}

function stepAnimation(now: number) {
  const item = currentItem.value
  if (props.paused || !item || phase.value === 'celebrating' || phase.value === 'finished') {
    lastFrameAt.value = now
    animationFrame = window.requestAnimationFrame(stepAnimation)
    return
  }

  if (!lastFrameAt.value) {
    lastFrameAt.value = now
  }

  const deltaMs = Math.min(48, now - lastFrameAt.value)
  lastFrameAt.value = now

  if (!dragState.value) {
    item.elapsedMs += deltaMs
    item.y += item.speed * (deltaMs / 1000)
    item.x = item.baseX + Math.sin(item.swayPhase + (item.elapsedMs / 1000) * item.swaySpeed) * item.swayAmplitude
    item.x = Math.max(16, Math.min(item.x, playFieldRect.value.width - ITEM_WIDTH - 16))

    if (item.y >= missThreshold.value) {
      registerMissedItem()
    }
  }

  animationFrame = window.requestAnimationFrame(stepAnimation)
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  activeDifficulty.value = difficulty
  sessionTheme.value = pickRandomTheme()
  itemQueue.value = buildQueue(difficulty)
  queueIndex.value = 0
  currentItem.value = null
  dragState.value = null
  hoverBinId.value = null
  phase.value = 'ready'
  statusTone.value = 'neutral'
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].readyText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].helperText
  showBadge.value = false
  sortedItems.value = 0
  wrongDrops.value = 0
  missedItems.value = 0
  totalDrags.value = 0
  sortTimesMs.value = []
  sortedItemIds.value = []
  sortedBinIds.value = []
  roundDirty = false
  props.audio.stopAmbient()
  lastFrameAt.value = 0

  nextTick().then(() => {
    syncPlayFieldRect()
    spawnNextItem()
  })
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
      dragState.value = null
      detachPointerListeners()
      hoverBinId.value = null
      return
    }

    if (roundDirty && phase.value === 'ready') {
      startAmbientIfNeeded()
    }
  },
)

onMounted(() => {
  nextTick().then(() => {
    syncPlayFieldRect()
    resetForDifficulty(props.difficulty)
  })

  window.addEventListener('resize', syncPlayFieldRect)
  animationFrame = window.requestAnimationFrame(stepAnimation)
})

onBeforeUnmount(() => {
  clearAllTimers()
  detachPointerListeners()
  window.removeEventListener('resize', syncPlayFieldRect)
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
  props.audio.stopAmbient()
})
</script>

<style scoped>
.recycling-sort-game {
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
  width: 300px;
  height: 300px;
  border-radius: 50%;
  opacity: 0.52;
  filter: blur(10px);
}

.glow-orb--left {
  top: -42px;
  left: -54px;
}

.glow-orb--right {
  right: -30px;
  bottom: 26px;
}

.sparkle-dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  animation: recycle-float 6.6s ease-in-out infinite;
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
.mission-card,
.instruction-panel,
.badge-modal {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 18px 36px rgba(86, 78, 61, 0.12);
  backdrop-filter: blur(10px);
}

.hud-card {
  padding: 14px 16px;
  border-radius: 18px;
}

.hud-card span {
  display: block;
  margin-bottom: 6px;
  color: #746a61;
  font-size: 13px;
}

.hud-card strong {
  color: #463b31;
  font-size: 18px;
}

.stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
  gap: 18px;
}

.play-field {
  position: relative;
  min-height: 720px;
  padding: 18px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
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
  color: #776c63;
  font-size: 13px;
}

.status-strip strong {
  color: #473b32;
}

.status-strip[data-tone='gentle'] {
  background: rgba(255, 244, 227, 0.94);
}

.status-strip[data-tone='success'] {
  background: rgba(233, 250, 235, 0.94);
}

.mission-card {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 24px;
}

.mission-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mission-card__chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: rgba(122, 203, 146, 0.2);
  color: #4d8557;
  font-size: 12px;
}

.mission-card__heading strong {
  color: #473b32;
  font-size: 22px;
}

.mission-card__heading p {
  margin: 0;
  color: #7a6b54;
  line-height: 1.6;
}

.mission-card__description {
  margin: 14px 0 0;
  color: #6f685f;
  line-height: 1.7;
}

.mission-clues {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.mission-clues span {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(248, 244, 236, 0.98);
  color: #73685d;
  font-size: 12px;
}

.fall-stage {
  position: relative;
  min-height: 340px;
}

.falling-item {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: var(--item-tint);
  color: var(--item-accent);
  cursor: grab;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.falling-item.dragging {
  cursor: grabbing;
  box-shadow: 0 18px 28px rgba(60, 54, 45, 0.16);
}

.falling-item.bouncing {
  animation: recycle-bounce 0.28s ease;
}

.falling-item__emoji {
  font-size: 30px;
}

.falling-item strong {
  color: #43372f;
  text-align: left;
}

.falling-item small {
  color: #6b625c;
  text-align: left;
  line-height: 1.5;
}

.bin-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: auto;
  padding-top: 16px;
}

.sort-bin {
  position: relative;
  border-radius: 24px;
  padding-top: 18px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.sort-bin.hovering {
  transform: translateY(-4px);
}

.sort-bin__lid {
  height: 24px;
  border-radius: 18px 18px 8px 8px;
  margin: 0 12px -6px;
}

.sort-bin__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 150px;
  padding: 18px 14px 16px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.sort-bin__emoji {
  font-size: 30px;
}

.sort-bin__body strong {
  color: #473b32;
}

.sort-bin__body small {
  color: #72675d;
  text-align: center;
  line-height: 1.5;
}

.field-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 0 4px;
}

.field-footer__left strong {
  display: block;
  margin-bottom: 6px;
  color: #fefaf2;
}

.field-footer__left span,
.field-footer__right span {
  color: rgba(255, 250, 242, 0.84);
  line-height: 1.6;
}

.field-footer__right {
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
  background: rgba(247, 244, 236, 0.98);
  color: #75695f;
  font-size: 12px;
}

.panel-tags .accent {
  background: rgba(244, 178, 95, 0.2);
  color: #8d6017;
}

.instruction-panel h2 {
  margin: 0;
  color: #473b32;
  font-size: 28px;
}

.instruction-panel p,
.instruction-panel small {
  margin: 0;
  color: #6f685f;
  line-height: 1.7;
}

.progress-block,
.tip-card,
.focus-card {
  border-radius: 20px;
  background: rgba(249, 247, 242, 0.98);
}

.progress-block {
  padding: 16px;
}

.progress-labels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  color: #7d7368;
  font-size: 12px;
}

.progress-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(218, 210, 198, 0.72);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #7acb92 0%, #f4b25f 100%);
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
  color: #786847;
  font-size: 13px;
}

.tip-card span {
  color: #473b32;
  font-size: 16px;
  line-height: 1.5;
}

.focus-card {
  padding: 16px;
}

.focus-card strong {
  display: block;
  margin-bottom: 10px;
  color: #786847;
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
  color: #473b32;
  font-size: 24px;
}

.badge-modal p {
  margin: 12px 0 0;
  color: #6f685f;
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

@keyframes recycle-float {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.24;
  }
  50% {
    transform: translateY(-8px);
    opacity: 0.56;
  }
}

@keyframes recycle-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(0.96);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 1180px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .recycling-sort-game {
    padding: 16px;
  }

  .hud-panel,
  .tip-grid,
  .progress-labels,
  .bin-row {
    grid-template-columns: 1fr;
  }

  .mission-card__heading,
  .field-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .field-footer__right {
    align-items: flex-start;
  }
}
</style>
