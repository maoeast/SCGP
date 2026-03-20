<template>
  <div ref="rootRef" class="emotion-monster-game" :style="{ background: sessionTheme.skyGradient }">
    <canvas ref="celebrationCanvas" class="celebration-canvas" />

    <div class="backdrop-layer">
      <div class="cloud cloud-left"></div>
      <div class="cloud cloud-right"></div>
      <div class="sun-glow" :style="{ background: sessionTheme.glowGradient }"></div>
      <span
        v-for="bubble in bubbles"
        :key="bubble.id"
        class="bubble"
        :style="{
          left: `${bubble.left}%`,
          top: `${bubble.top}%`,
          width: `${bubble.size}px`,
          height: `${bubble.size}px`,
          animationDelay: `${bubble.delay}s`,
        }"
      />
    </div>

    <div class="play-layer">
      <div class="monster-row" :style="{ bottom: `${monsterRowBottom}px`, ...monsterRowStyle }">
        <article
          v-for="monster in sessionMonsters"
          :key="monster.id"
          :ref="(el) => setMonsterRef(monster.id, el)"
          class="monster-card"
          :class="{
            fed: monster.fed,
            hovering: hoverMonsterId === monster.id,
            sleeping: celebrationState === 'sleeping',
            patting: celebrationState === 'patting',
          }"
        >
          <div class="monster-stage">
            <svg viewBox="0 0 220 220" class="monster-svg" :style="getMonsterPalette(monster)" aria-hidden="true">
              <g class="monster-arms">
                <ellipse cx="44" cy="118" rx="22" ry="42" fill="var(--monster-arm)" />
                <ellipse cx="176" cy="118" rx="22" ry="42" fill="var(--monster-arm)" />
              </g>
              <ellipse cx="110" cy="118" rx="76" ry="72" fill="var(--monster-body)" />
              <circle cx="82" cy="94" r="10" fill="var(--monster-eye)" />
              <circle cx="138" cy="94" r="10" fill="var(--monster-eye)" />
              <path
                :d="monster.fed ? 'M74 132c12 16 28 24 36 24 8 0 24-8 36-24' : monster.mouthPath"
                fill="none"
                stroke="var(--monster-mouth)"
                stroke-width="9"
                stroke-linecap="round"
              />
              <ellipse cx="76" cy="126" rx="12" ry="7" fill="var(--monster-cheek)" opacity="0.52" />
              <ellipse cx="144" cy="126" rx="12" ry="7" fill="var(--monster-cheek)" opacity="0.52" />
              <ellipse
                cx="110"
                cy="160"
                rx="30"
                ry="18"
                :fill="monster.fed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)'"
              />
            </svg>

            <div v-if="monster.fed" class="fed-tool-chip">
              {{ getToolEmoji(monster.expectedToolId) }}
            </div>

            <div v-if="celebrationState === 'sleeping'" class="snore-bubbles">
              <span>Z</span>
              <span>Z</span>
            </div>
          </div>

          <div class="monster-copy">
            <strong>{{ monster.name }}</strong>
            <small>{{ monster.fed ? '吃饱啦' : monster.prompt }}</small>
          </div>
        </article>
      </div>

      <div
        ref="toolAreaRef"
        class="tool-area"
        :class="{ conveyor: isConveyorMode }"
        :style="{ bottom: `${toolAreaBottom}px` }"
      >
        <div v-if="isConveyorMode" class="conveyor-track"></div>

        <button
          v-for="(tool, index) in availableTools"
          :key="tool.id"
          class="tool-card"
          :class="{
            dragging: dragState?.toolId === tool.id,
            bouncing: bounceToolId === tool.id,
          }"
          type="button"
          :style="getToolStyle(tool, index)"
          @pointerdown="beginDrag(tool, $event, index)"
        >
          <svg viewBox="0 0 120 120" class="tool-svg" aria-hidden="true">
            <g v-if="tool.icon === 'water'">
              <rect x="36" y="26" width="48" height="62" rx="14" fill="#9bdaf2" />
              <path d="M44 40h32" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
              <path d="M52 18h16" stroke="#6fbad8" stroke-width="8" stroke-linecap="round" />
            </g>
            <g v-else-if="tool.icon === 'hug'">
              <circle cx="60" cy="40" r="20" fill="#ffd5a8" />
              <ellipse cx="60" cy="84" rx="30" ry="24" fill="#ff9e80" />
              <path d="M26 74c18 8 22 16 26 28" fill="none" stroke="#ffb199" stroke-width="12" stroke-linecap="round" />
              <path d="M94 74c-18 8-22 16-26 28" fill="none" stroke="#ffb199" stroke-width="12" stroke-linecap="round" />
            </g>
            <g v-else-if="tool.icon === 'headphones'">
              <path d="M30 64c0-18 14-32 30-32s30 14 30 32" fill="none" stroke="#5f7ddb" stroke-width="12" stroke-linecap="round" />
              <rect x="24" y="60" width="18" height="34" rx="9" fill="#7ea1ff" />
              <rect x="78" y="60" width="18" height="34" rx="9" fill="#7ea1ff" />
            </g>
            <g v-else-if="tool.icon === 'blanket'">
              <rect x="24" y="28" width="72" height="62" rx="16" fill="#9fe0c7" />
              <path d="M34 42h52M34 58h52M34 74h38" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
            </g>
            <g v-else-if="tool.icon === 'tissue'">
              <path d="M34 32h52l-10 50H44z" fill="#ffffff" />
              <rect x="30" y="70" width="60" height="22" rx="11" fill="#b8d8ff" />
            </g>
            <g v-else-if="tool.icon === 'breath'">
              <circle cx="44" cy="62" r="14" fill="#ffd166" />
              <circle cx="76" cy="48" r="10" fill="#ff9f68" />
              <circle cx="78" cy="78" r="12" fill="#7ad9c7" />
              <path d="M28 96h64" stroke="#8a6a43" stroke-width="8" stroke-linecap="round" />
            </g>
            <g v-else>
              <circle cx="60" cy="60" r="26" fill="#ffd166" />
              <path d="M60 26v68M26 60h68" stroke="#f08d49" stroke-width="10" stroke-linecap="round" />
            </g>
          </svg>
          <strong>{{ tool.label }}</strong>
          <small>{{ tool.shortHint }}</small>
        </button>
      </div>
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>照顾进度</span>
        <strong>{{ fedCount }} / {{ sessionMonsters.length }}</strong>
      </div>
      <div class="hud-card">
        <span>拖拽次数</span>
        <strong>{{ totalDrags }}</strong>
      </div>
      <div class="hud-card">
        <span>L3 传送带</span>
        <strong>{{ conveyorStatusLabel }}</strong>
      </div>
    </div>

    <div ref="panelRef" class="instruction-panel">
      <div class="panel-tags">
        <span>{{ sessionTheme.title }}</span>
        <span class="accent">{{ difficultyConfig.shortLabel }}</span>
      </div>

      <h2>喂食情绪小怪兽</h2>
      <p>{{ stageMessage }}</p>
      <small>{{ helperMessage }}</small>

      <div class="progress-block">
        <div class="progress-labels">
          <span>还在找安抚工具</span>
          <span>越来越舒服</span>
          <span>准备睡觉啦</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
      </div>

      <div class="helper-row">
        <span>{{ scoreLabel }}</span>
        <span>{{ feedOrderLabel }}</span>
      </div>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🧸</div>
        <strong>情绪小管家徽章</strong>
        <p>{{ sessionTheme.badgeCopy }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
  EmotionGameSettings,
} from '@/types/emotional/games'

type ToolIcon = 'water' | 'hug' | 'headphones' | 'blanket' | 'tissue' | 'breath' | 'star'
type MoodKey = 'thirsty' | 'sad' | 'scared' | 'angry' | 'embarrassed' | 'overwhelmed'
type CelebrationState = 'none' | 'patting' | 'sleeping'

interface ThemeConfig {
  key: string
  title: string
  skyGradient: string
  glowGradient: string
  badgeCopy: string
}

interface ToolDefinition {
  id: string
  label: string
  shortHint: string
  icon: ToolIcon
}

interface MonsterDefinition {
  id: string
  mood: MoodKey
  name: string
  prompt: string
  expectedToolId: string
  hintText: string
  mouthPath: string
  bodyColor: string
  armColor: string
  cheekColor: string
  calmColor: string
}

interface SessionMonster extends MonsterDefinition {
  fed: boolean
}

interface SessionTool extends ToolDefinition {
  consumed: boolean
}

interface SessionConfig {
  monsters: string[]
  tools: string[]
}

interface DifficultyConfig {
  shortLabel: string
  conveyorSpeedPx: number
  slotSpacing: number
  wrongGentleLine: string
  readyText: string
  helperText: string
}

interface Bubble {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface DragState {
  toolId: string
  pointerId: number
  offsetX: number
  offsetY: number
  x: number
  y: number
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

const TOOL_LIBRARY: Record<string, ToolDefinition> = {
  water: { id: 'water', label: '安静水杯', shortHint: '慢慢喝口水', icon: 'water' },
  hug: { id: 'hug', label: '温暖拥抱', shortHint: '抱一抱更安心', icon: 'hug' },
  headphones: { id: 'headphones', label: '降噪耳罩', shortHint: '先把声音变小', icon: 'headphones' },
  blanket: { id: 'blanket', label: '安抚小毯子', shortHint: '裹起来会舒服', icon: 'blanket' },
  tissue: { id: 'tissue', label: '柔软纸巾', shortHint: '擦擦眼泪', icon: 'tissue' },
  breath: { id: 'breath', label: '呼吸风车', shortHint: '慢慢吹一吹', icon: 'breath' },
  star: { id: 'star', label: '闪闪奖章', shortHint: '这个现在用不上', icon: 'star' },
}

const MONSTER_LIBRARY: Record<string, MonsterDefinition> = {
  thirsty_red: {
    id: 'thirsty_red',
    mood: 'thirsty',
    name: '口渴红怪兽',
    prompt: '嘴巴干干的，想喝一口水。',
    expectedToolId: 'water',
    hintText: '我口渴啦，想要一个水杯。',
    mouthPath: 'M78 140c12-10 28-16 32-16 4 0 20 6 32 16',
    bodyColor: '#ff8a7a',
    armColor: '#ff9d90',
    cheekColor: '#ffc2b7',
    calmColor: '#7dd7a4',
  },
  sad_blue: {
    id: 'sad_blue',
    mood: 'sad',
    name: '难过蓝怪兽',
    prompt: '眼泪快掉下来，想有人抱抱。',
    expectedToolId: 'hug',
    hintText: '我想被轻轻抱一下。',
    mouthPath: 'M78 148c10-8 24-12 32-12 8 0 22 4 32 12',
    bodyColor: '#7dbbff',
    armColor: '#9acbff',
    cheekColor: '#d6e7ff',
    calmColor: '#7dd7a4',
  },
  scared_purple: {
    id: 'scared_purple',
    mood: 'scared',
    name: '害怕紫怪兽',
    prompt: '外面太吵了，耳朵想休息。',
    expectedToolId: 'headphones',
    hintText: '我想先把吵闹声音变小。',
    mouthPath: 'M82 148c8-10 20-16 28-16 8 0 20 6 28 16',
    bodyColor: '#9b8cff',
    armColor: '#aea0ff',
    cheekColor: '#ddd7ff',
    calmColor: '#7dd7a4',
  },
  embarrassed_yellow: {
    id: 'embarrassed_yellow',
    mood: 'embarrassed',
    name: '尴尬黄怪兽',
    prompt: '脸热热的，想躲进小毯子里。',
    expectedToolId: 'blanket',
    hintText: '帮我披上安抚小毯子吧。',
    mouthPath: 'M80 146c10 6 20 10 30 10 10 0 20-4 30-10',
    bodyColor: '#ffd66c',
    armColor: '#ffe089',
    cheekColor: '#ffeab8',
    calmColor: '#7dd7a4',
  },
  overwhelmed_orange: {
    id: 'overwhelmed_orange',
    mood: 'overwhelmed',
    name: '委屈橙怪兽',
    prompt: '眼圈湿湿的，想擦擦眼泪。',
    expectedToolId: 'tissue',
    hintText: '给我一张柔软纸巾会舒服一点。',
    mouthPath: 'M82 150c12-6 20-8 28-8 8 0 16 2 28 8',
    bodyColor: '#ffaf75',
    armColor: '#ffc495',
    cheekColor: '#ffd9bf',
    calmColor: '#7dd7a4',
  },
  angry_green: {
    id: 'angry_green',
    mood: 'angry',
    name: '生气绿怪兽',
    prompt: '火气冒出来了，想先慢慢呼吸。',
    expectedToolId: 'breath',
    hintText: '我想先吹吹呼吸风车。',
    mouthPath: 'M82 152c8-12 18-18 28-18 10 0 20 6 28 18',
    bodyColor: '#79d38b',
    armColor: '#90dea0',
    cheekColor: '#c6f3ce',
    calmColor: '#74dca0',
  },
}

const SESSION_CONFIGS: Record<EmotionGameDifficulty, readonly SessionConfig[]> = {
  1: [
    { monsters: ['thirsty_red'], tools: ['water', 'star'] },
    { monsters: ['sad_blue'], tools: ['hug', 'star'] },
    { monsters: ['angry_green'], tools: ['breath', 'star'] },
  ],
  2: [
    { monsters: ['thirsty_red', 'sad_blue'], tools: ['water', 'hug', 'star', 'headphones'] },
    { monsters: ['sad_blue', 'embarrassed_yellow'], tools: ['hug', 'blanket', 'water', 'star'] },
    { monsters: ['scared_purple', 'angry_green'], tools: ['headphones', 'breath', 'tissue', 'star'] },
  ],
  3: [
    { monsters: ['thirsty_red', 'sad_blue', 'scared_purple'], tools: ['water', 'hug', 'headphones', 'blanket', 'star', 'tissue'] },
    { monsters: ['angry_green', 'embarrassed_yellow', 'overwhelmed_orange'], tools: ['breath', 'blanket', 'tissue', 'water', 'star', 'headphones'] },
    { monsters: ['sad_blue', 'scared_purple', 'angry_green'], tools: ['hug', 'headphones', 'breath', 'blanket', 'star', 'water'] },
  ],
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    shortLabel: '简单 · 单怪兽双工具',
    conveyorSpeedPx: 0,
    slotSpacing: 148,
    wrongGentleLine: '再看看这只小怪兽现在最需要什么安抚工具。',
    readyText: '先看一只小怪兽，再把最合适的工具拖给它。选错也没关系，我们可以慢慢重来。',
    helperText: '简单模式只有 1 只怪兽和 2 个工具，放心试一试。',
  },
  2: {
    shortLabel: '中等 · 双怪兽四工具',
    conveyorSpeedPx: 0,
    slotSpacing: 142,
    wrongGentleLine: '这只小怪兽还想要别的帮助，再看看它的表情和提示。',
    readyText: '现在有 2 只小怪兽了，要把正确工具分别拖给它们。',
    helperText: '中等模式会出现更多干扰项，先看清楚谁需要什么。',
  },
  3: {
    shortLabel: '困难 · 传送带三怪兽',
    conveyorSpeedPx: 24,
    slotSpacing: 138,
    wrongGentleLine: '传送带还在慢慢走，先稳住手，再把工具送给真正需要它的小怪兽。',
    readyText: '现在工具会在传送带上缓慢移动，要一边观察一边拖拽给 3 只小怪兽。',
    helperText: '困难模式下工具会缓慢移动，被拖起后会暂时脱离传送带，松手再回到轨道。',
  },
}

const THEMES: readonly ThemeConfig[] = [
  {
    key: 'toyroom',
    title: '怪兽玩具屋',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.34), transparent 36%), linear-gradient(180deg, #8ec5ff 0%, #dff5ff 54%, #fff1d2 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 225, 145, 0.82), rgba(255, 225, 145, 0))',
    badgeCopy: '你把小怪兽们都照顾得舒舒服服，它们已经带着情绪小管家徽章安心睡着了。',
  },
  {
    key: 'pillow_camp',
    title: '软软枕头营地',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.3), transparent 36%), linear-gradient(180deg, #9ed5ff 0%, #effeff 52%, #ffe7c2 100%)',
    glowGradient: 'radial-gradient(circle, rgba(192, 255, 220, 0.86), rgba(192, 255, 220, 0))',
    badgeCopy: '你太会照顾怪兽朋友了，它们拍拍肚子、打着呼噜，把情绪小管家徽章送给了你。',
  },
]

const BUBBLES: readonly Bubble[] = [
  { id: 1, left: 8, top: 14, size: 14, delay: 0 },
  { id: 2, left: 18, top: 8, size: 10, delay: 0.6 },
  { id: 3, left: 36, top: 12, size: 18, delay: 1.2 },
  { id: 4, left: 58, top: 10, size: 12, delay: 1.8 },
  { id: 5, left: 76, top: 16, size: 16, delay: 2.4 },
  { id: 6, left: 88, top: 9, size: 10, delay: 3 },
]

const CONFETTI_COLORS = ['#ffd166', '#ffadad', '#9bf6ff', '#cdb4ff', '#b8f2e6', '#ffe29a']

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
const panelRef = ref<HTMLElement | null>(null)
const toolAreaRef = ref<HTMLElement | null>(null)
const celebrationCanvas = ref<HTMLCanvasElement | null>(null)

const panelRect = ref({ width: 0, height: 0 })
const toolAreaRect = ref({ left: 0, top: 0, width: 0, height: 0 })
const monsterRefs = reactive(new Map<string, HTMLElement>())

const stageMessage = ref(DIFFICULTY_CONFIGS[1].readyText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const sessionTheme = ref<ThemeConfig>(THEMES[0] as ThemeConfig)
const sessionMonsters = ref<SessionMonster[]>([])
const sessionTools = ref<SessionTool[]>([])
const showBadge = ref(false)
const hoverMonsterId = ref<string | null>(null)
const bounceToolId = ref<string | null>(null)
const dragState = ref<DragState | null>(null)
const celebrationState = ref<CelebrationState>('none')
const totalDrags = ref(0)
const correctDrops = ref(0)
const wrongDrops = ref(0)
const bounceCount = ref(0)
const conveyorDistancePx = ref(0)
const feedOrder = ref<string[]>([])
const isConveyorMode = computed(() => props.difficulty === 3)
const bubbles = BUBBLES

let lastThemeKey = ''
let lastSessionKeyByDifficulty: Partial<Record<EmotionGameDifficulty, string>> = {}
let roundDirty = false
let completed = false
let conveyorFrame = 0
let celebrationFrame = 0
let layoutRaf = 0
let conveyorOffsetPx = 0
let conveyorLastAt = 0
let localAudioContext: AudioContext | null = null
let snoreOscillator: OscillatorNode | null = null
let snoreGain: GainNode | null = null
const timeouts = new Set<number>()
let confettiPieces: ConfettiPiece[] = []

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty])
const fedCount = computed(() => sessionMonsters.value.filter((monster) => monster.fed).length)
const progressPercent = computed(() => {
  return sessionMonsters.value.length > 0
    ? Math.round((fedCount.value / sessionMonsters.value.length) * 100)
    : 0
})
const difficultyLabel = computed(() => difficultyConfig.value.shortLabel)
const monsterRowStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(1, sessionMonsters.value.length)}, minmax(180px, 220px))`,
}))
const conveyorStatusLabel = computed(() => {
  return isConveyorMode.value ? `${Math.round(difficultyConfig.value.conveyorSpeedPx)} px/s` : '静止托盘'
})
const scoreLabel = computed(() => `正确 ${correctDrops.value} 次 / 温柔重试 ${wrongDrops.value} 次`)
const feedOrderLabel = computed(() => {
  return feedOrder.value.length
    ? `喂食顺序：${feedOrder.value.join('、')}`
    : '还没有小怪兽吃到安抚工具'
})
const panelSafeBottom = computed(() => (panelRect.value.height > 0 ? panelRect.value.height + 28 : 290))
const toolAreaBottom = computed(() => panelSafeBottom.value + 18)
const monsterRowBottom = computed(() => toolAreaBottom.value + 166)
const availableTools = computed(() => sessionTools.value.filter((tool) => !tool.consumed))

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

function setMonsterRef(id: string, element: unknown) {
  if (element instanceof HTMLElement) {
    monsterRefs.set(id, element)
  } else {
    monsterRefs.delete(id)
  }
}

function scheduleLayoutSync() {
  if (layoutRaf) return
  layoutRaf = window.requestAnimationFrame(async () => {
    layoutRaf = 0
    await nextTick()
    const panelEl = panelRef.value
    const toolEl = toolAreaRef.value
    panelRect.value = panelEl
      ? {
          width: Math.round(panelEl.getBoundingClientRect().width),
          height: Math.round(panelEl.getBoundingClientRect().height),
        }
      : { width: 0, height: 0 }

    toolAreaRect.value = toolEl
      ? {
          left: toolEl.getBoundingClientRect().left,
          top: toolEl.getBoundingClientRect().top,
          width: toolEl.getBoundingClientRect().width,
          height: toolEl.getBoundingClientRect().height,
        }
      : { left: 0, top: 0, width: 0, height: 0 }

    resizeCelebrationCanvas()
  })
}

function pickFreshTheme() {
  const pool = THEMES.length > 1 ? THEMES.filter((item) => item.key !== lastThemeKey) : THEMES
  const nextTheme = pool[Math.floor(Math.random() * pool.length)] ?? THEMES[0]
  if (!nextTheme) return
  lastThemeKey = nextTheme.key
  sessionTheme.value = nextTheme
}

function pickFreshSession(): SessionConfig {
  const pool = SESSION_CONFIGS[props.difficulty]
  const lastKey = lastSessionKeyByDifficulty[props.difficulty] || ''
  const filtered = pool.length > 1
    ? pool.filter((item) => item.monsters.join('|') !== lastKey)
    : pool
  const nextSession = filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0]
  lastSessionKeyByDifficulty[props.difficulty] = nextSession?.monsters.join('|') || ''
  return nextSession ?? { monsters: [], tools: [] }
}

function createSessionState(session: SessionConfig) {
  sessionMonsters.value = session.monsters
    .map((id) => MONSTER_LIBRARY[id])
    .filter((monster): monster is MonsterDefinition => Boolean(monster))
    .map((monster) => ({
      ...monster,
      fed: false,
    }))

  sessionTools.value = session.tools
    .map((id) => TOOL_LIBRARY[id])
    .filter((tool): tool is ToolDefinition => Boolean(tool))
    .map((tool) => ({
      ...tool,
      consumed: false,
    }))
}

function getMonsterPalette(monster: SessionMonster) {
  const body = celebrationState.value === 'sleeping' || celebrationState.value === 'patting' || monster.fed
    ? monster.calmColor
    : monster.bodyColor

  return {
    '--monster-body': body,
    '--monster-arm': celebrationState.value === 'sleeping' || celebrationState.value === 'patting' || monster.fed ? '#8fe0b1' : monster.armColor,
    '--monster-eye': '#2e3740',
    '--monster-mouth': '#58423d',
    '--monster-cheek': monster.cheekColor,
  } as Record<string, string>
}

function getToolEmoji(toolId: string) {
  const icon = TOOL_LIBRARY[toolId]?.icon
  if (icon === 'water') return '🥤'
  if (icon === 'hug') return '🤗'
  if (icon === 'headphones') return '🎧'
  if (icon === 'blanket') return '🧣'
  if (icon === 'tissue') return '🧻'
  if (icon === 'breath') return '🌬️'
  return '⭐'
}

function getBaseToolPosition(index: number) {
  const width = toolAreaRect.value.width || 640
  const height = toolAreaRect.value.height || 132
  const toolWidth = 118
  const toolHeight = 124
  const top = Math.max(10, (height - toolHeight) / 2)

  if (!isConveyorMode.value) {
    const count = Math.max(1, availableTools.value.length)
    const gap = count > 1 ? (width - toolWidth) / (count - 1) : 0
    return {
      x: Math.max(6, index * gap),
      y: top,
    }
  }

  const cycleWidth = Math.max(width, availableTools.value.length * difficultyConfig.value.slotSpacing)
  const rawX = index * difficultyConfig.value.slotSpacing - conveyorOffsetPx
  const wrappedX = ((rawX % cycleWidth) + cycleWidth) % cycleWidth
  return {
    x: wrappedX,
    y: top,
  }
}

function getToolStyle(tool: SessionTool, index: number) {
  const position = getBaseToolPosition(index)
  const isDragging = dragState.value?.toolId === tool.id
  const left = isDragging ? dragState.value?.x ?? position.x : position.x
  const top = isDragging ? dragState.value?.y ?? position.y : position.y

  return {
    transform: `translate(${Math.round(left)}px, ${Math.round(top)}px)`,
    zIndex: isDragging ? 14 : 6,
  }
}

function getRootPoint(clientX: number, clientY: number) {
  const rootRect = rootRef.value?.getBoundingClientRect()
  if (!rootRect) {
    return { x: clientX, y: clientY }
  }

  return {
    x: clientX - rootRect.left,
    y: clientY - rootRect.top,
  }
}

async function ensureLocalAudio() {
  const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null

  if (!localAudioContext) {
    localAudioContext = new AudioContextClass()
  }

  if (localAudioContext.state === 'suspended') {
    await localAudioContext.resume()
  }

  return localAudioContext
}

async function playBurpSound() {
  if (!props.settings.effectsEnabled) return
  const ctx = await ensureLocalAudio()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(210, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(132, ctx.currentTime + 0.2)
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.26)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.3)
}

async function startSnoreLoop() {
  if (!props.settings.effectsEnabled || snoreOscillator || snoreGain) return
  const ctx = await ensureLocalAudio()
  if (!ctx) return

  snoreGain = ctx.createGain()
  snoreGain.gain.value = 0.0001
  snoreGain.connect(ctx.destination)

  snoreOscillator = ctx.createOscillator()
  snoreOscillator.type = 'triangle'
  snoreOscillator.frequency.value = 102
  snoreOscillator.connect(snoreGain)
  snoreOscillator.start()

  const pulse = () => {
    if (!snoreGain || !localAudioContext) return
    const now = localAudioContext.currentTime
    snoreGain.gain.cancelScheduledValues(now)
    snoreGain.gain.setValueAtTime(0.0001, now)
    snoreGain.gain.exponentialRampToValueAtTime(0.025, now + 0.16)
    snoreGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)
    scheduleTimeout(pulse, 900)
  }

  pulse()
}

function stopLocalAudio() {
  if (snoreOscillator) {
    try {
      snoreOscillator.stop()
      snoreOscillator.disconnect()
    } catch {
      // ignore
    }
    snoreOscillator = null
  }

  if (snoreGain) {
    try {
      snoreGain.disconnect()
    } catch {
      // ignore
    }
    snoreGain = null
  }
}

function markDirtyOnce() {
  if (roundDirty) return
  roundDirty = true
  props.markRoundDirty?.()
}

function clearBounceState() {
  bounceToolId.value = null
}

function findHoveredMonster(clientX: number, clientY: number) {
  for (const monster of sessionMonsters.value) {
    const element = monsterRefs.get(monster.id)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    if (
      clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
    ) {
      return monster.id
    }
  }

  return null
}

function beginDrag(tool: SessionTool, event: PointerEvent, index: number) {
  if (props.paused || completed || tool.consumed) return

  event.preventDefault()
  const position = getBaseToolPosition(index)
  const point = getRootPoint(event.clientX, event.clientY)
  const rootRect = rootRef.value?.getBoundingClientRect()
  const startX = (toolAreaRect.value.left - (rootRect?.left || 0)) + position.x
  const startY = (toolAreaRect.value.top - (rootRect?.top || 0)) + position.y
  dragState.value = {
    toolId: tool.id,
    pointerId: event.pointerId,
    offsetX: event.clientX - (toolAreaRect.value.left + position.x),
    offsetY: event.clientY - (toolAreaRect.value.top + position.y),
    x: startX,
    y: startY,
  }
  hoverMonsterId.value = null
  totalDrags.value += 1
  markDirtyOnce()

  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

function handlePointerMove(event: PointerEvent) {
  if (!dragState.value || event.pointerId !== dragState.value.pointerId || props.paused) return

  event.preventDefault()
  const point = getRootPoint(event.clientX, event.clientY)
  dragState.value = {
    ...dragState.value,
    x: point.x - dragState.value.offsetX,
    y: point.y - dragState.value.offsetY,
  }
  hoverMonsterId.value = findHoveredMonster(event.clientX, event.clientY)
}

function detachPointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
}

async function handleCorrectDrop(monsterId: string, toolId: string) {
  const monster = sessionMonsters.value.find((item) => item.id === monsterId)
  const tool = sessionTools.value.find((item) => item.id === toolId)
  if (!monster || !tool || monster.fed) return

  monster.fed = true
  tool.consumed = true
  correctDrops.value += 1
  feedOrder.value = [...feedOrder.value, monster.name]
  stageMessage.value = `${monster.name} 吃饱啦，正在慢慢放松下来。`
  helperMessage.value = fedCount.value >= sessionMonsters.value.length
    ? '所有小怪兽都舒服起来了，准备一起拍肚子睡觉。'
    : '继续看看下一只小怪兽现在最需要什么安抚工具。'

  await Promise.allSettled([
    playBurpSound(),
    props.audio.playSuccessCue(),
  ])

  if (fedCount.value >= sessionMonsters.value.length) {
    await completeSession()
  }
}

async function handleWrongDrop(monsterId: string | null, toolId: string) {
  const monster = monsterId
    ? sessionMonsters.value.find((item) => item.id === monsterId)
    : null
  wrongDrops.value += 1
  bounceCount.value += 1
  bounceToolId.value = toolId
  stageMessage.value = monster?.hintText || difficultyConfig.value.wrongGentleLine
  helperMessage.value = difficultyConfig.value.wrongGentleLine
  await props.audio.playSoftBounce()
  if (monster) {
    props.audio.speak(monster.hintText)
  }
  scheduleTimeout(clearBounceState, 480)
}

async function handlePointerUp(event: PointerEvent) {
  if (!dragState.value || event.pointerId !== dragState.value.pointerId) return

  const monsterId = findHoveredMonster(event.clientX, event.clientY)
  const toolId = dragState.value.toolId
  hoverMonsterId.value = null
  dragState.value = null
  detachPointerListeners()

  if (!monsterId) {
    await handleWrongDrop(null, toolId)
    return
  }

  const monster = sessionMonsters.value.find((item) => item.id === monsterId)
  if (monster && monster.expectedToolId === toolId && !monster.fed) {
    await handleCorrectDrop(monsterId, toolId)
    return
  }

  await handleWrongDrop(monsterId, toolId)
}

function resizeCelebrationCanvas() {
  const canvas = celebrationCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.round(rect.width))
  canvas.height = Math.max(1, Math.round(rect.height))
}

function stopCelebration() {
  if (celebrationFrame) {
    window.cancelAnimationFrame(celebrationFrame)
    celebrationFrame = 0
  }
  const canvas = celebrationCanvas.value
  const ctx = canvas?.getContext('2d')
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function runCelebration() {
  const canvas = celebrationCanvas.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  confettiPieces = Array.from({ length: 84 }).map(() => ({
    x: canvas.width * 0.5 + (Math.random() - 0.5) * 180,
    y: canvas.height * 0.4 + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * -7 - 2.5,
    size: Math.random() * 9 + 5,
    rotate: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.24,
    life: 1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#ffd166',
  }))

  const draw = () => {
    if (props.paused) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    confettiPieces = confettiPieces
      .map((piece) => ({
        ...piece,
        x: piece.x + piece.vx,
        y: piece.y + piece.vy,
        vy: piece.vy + 0.08,
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
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.66)
      ctx.restore()
    })

    ctx.globalAlpha = 1
    if (confettiPieces.length > 0) {
      celebrationFrame = window.requestAnimationFrame(draw)
    }
  }

  draw()
}

async function completeSession() {
  if (completed) return
  completed = true
  celebrationState.value = 'patting'
  stageMessage.value = '所有小怪兽都被照顾好了，正在满足地拍拍肚子。'
  helperMessage.value = '等一下，它们会一起变成平静的绿色，闭上眼睛打呼噜。'
  stopConveyor()
  hoverMonsterId.value = null
  dragState.value = null
  detachPointerListeners()
  runCelebration()
  await props.audio.playSuccessCue()

  scheduleTimeout(() => {
    celebrationState.value = 'sleeping'
    stageMessage.value = '小怪兽们全部变成平静绿色，准备安心睡觉啦。'
    helperMessage.value = '听，轻轻的呼噜声来了。'
    startSnoreLoop().catch(() => {
      // ignore
    })
    props.audio.speak('你太会照顾人了，小怪兽们现在觉得好舒服呀。')
  }, 850)

  scheduleTimeout(() => {
    showBadge.value = true
  }, 1450)

  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_EMOTION_MANAGER',
        badgeName: '情绪小管家徽章',
      },
    })
  }, 1900)

  scheduleTimeout(() => {
    if (!props.paused) {
      resetSession()
    }
  }, 3800)
}

function buildPerformanceData() {
  return {
    total_drags: totalDrags.value,
    correct_drops: correctDrops.value,
    wrong_drops: wrongDrops.value,
    bounce_count: bounceCount.value,
    conveyor_distance_px: Math.round(conveyorDistancePx.value),
    feed_order: feedOrder.value,
    monster_count: sessionMonsters.value.length,
    tool_count: sessionTools.value.length,
    difficulty_level: props.difficulty,
    conveyor_speed_px: difficultyConfig.value.conveyorSpeedPx,
    celebration_state: celebrationState.value,
    session_theme: sessionTheme.value.key,
  }
}

function stepConveyor(now: number) {
  if (!isConveyorMode.value || props.paused || completed) return

  if (!conveyorLastAt) {
    conveyorLastAt = now
  }
  const deltaMs = Math.min(64, now - conveyorLastAt)
  conveyorLastAt = now

  if (!dragState.value) {
    conveyorOffsetPx += difficultyConfig.value.conveyorSpeedPx * (deltaMs / 1000)
    conveyorDistancePx.value += difficultyConfig.value.conveyorSpeedPx * (deltaMs / 1000)
  }

  conveyorFrame = window.requestAnimationFrame(stepConveyor)
}

function startConveyor() {
  if (!isConveyorMode.value) return
  stopConveyor()
  conveyorLastAt = 0
  conveyorFrame = window.requestAnimationFrame(stepConveyor)
}

function stopConveyor() {
  if (conveyorFrame) {
    window.cancelAnimationFrame(conveyorFrame)
    conveyorFrame = 0
  }
}

function resetSession() {
  clearTimeouts()
  stopCelebration()
  stopConveyor()
  stopLocalAudio()
  props.audio.stopAll()
  detachPointerListeners()
  pickFreshTheme()
  createSessionState(pickFreshSession())
  completed = false
  roundDirty = false
  showBadge.value = false
  hoverMonsterId.value = null
  bounceToolId.value = null
  dragState.value = null
  celebrationState.value = 'none'
  totalDrags.value = 0
  correctDrops.value = 0
  wrongDrops.value = 0
  bounceCount.value = 0
  conveyorDistancePx.value = 0
  feedOrder.value = []
  conveyorOffsetPx = 0
  stageMessage.value = difficultyConfig.value.readyText
  helperMessage.value = difficultyConfig.value.helperText
  scheduleLayoutSync()

  if (!props.paused) {
    startConveyor()
  }
}

onMounted(() => {
  scheduleLayoutSync()
  resetSession()
  window.addEventListener('resize', scheduleLayoutSync)
})

watch(() => props.difficulty, () => {
  resetSession()
})

watch(
  () => `${props.difficulty}|${sessionMonsters.value.length}|${availableTools.value.length}|${celebrationState.value}`,
  () => {
    scheduleLayoutSync()
  },
)

watch(() => props.paused, (paused) => {
  if (paused) {
    stopConveyor()
    stopCelebration()
    stopLocalAudio()
    detachPointerListeners()
    props.audio.stopAll()
    return
  }

  scheduleLayoutSync()
  if (!completed) {
    startConveyor()
  }
})

watch(() => props.settings.effectsEnabled, (enabled) => {
  if (!enabled) {
    stopLocalAudio()
  } else if (celebrationState.value === 'sleeping') {
    startSnoreLoop().catch(() => {
      // ignore
    })
  }
})

onBeforeUnmount(() => {
  clearTimeouts()
  stopConveyor()
  stopCelebration()
  stopLocalAudio()
  detachPointerListeners()
  if (layoutRaf) {
    window.cancelAnimationFrame(layoutRaf)
  }
  props.audio.stopAll()
  window.removeEventListener('resize', scheduleLayoutSync)
  if (localAudioContext && localAudioContext.state !== 'closed') {
    localAudioContext.close().catch(() => {
      // ignore
    })
  }
})
</script>

<style scoped>
.emotion-monster-game {
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
.play-layer,
.hud-panel,
.instruction-panel {
  position: relative;
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.sun-glow {
  position: absolute;
  right: 8%;
  top: 10%;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  filter: blur(10px);
}

.cloud {
  position: absolute;
  width: 180px;
  height: 76px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: 0 16px 30px rgba(117, 159, 188, 0.14);
}

.cloud::before,
.cloud::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: inherit;
}

.cloud::before {
  width: 80px;
  height: 64px;
  left: 18px;
  top: -20px;
}

.cloud::after {
  width: 92px;
  height: 70px;
  right: 20px;
  top: -26px;
}

.cloud-left {
  left: 8%;
  top: 18%;
}

.cloud-right {
  right: 20%;
  top: 24%;
}

.bubble {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 0 14px rgba(255, 255, 255, 0.36);
  animation: floaty 3.8s ease-in-out infinite;
}

.play-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.monster-row {
  position: absolute;
  left: 50%;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 220px));
  gap: 16px;
  width: min(92vw, 720px);
  transform: translateX(-50%);
  justify-content: center;
}

.monster-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 14px 16px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 20px 34px rgba(74, 115, 143, 0.14);
  transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.monster-card.hovering {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 26px 38px rgba(74, 115, 143, 0.2);
  background: rgba(255, 253, 238, 0.92);
}

.monster-card.fed {
  background: rgba(244, 255, 244, 0.92);
}

.monster-card.sleeping {
  transform: translateY(-4px);
}

.monster-stage {
  position: relative;
  display: grid;
  place-items: center;
  width: 160px;
  height: 160px;
}

.monster-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 16px 20px rgba(79, 88, 107, 0.18));
}

.monster-card.patting .monster-arms {
  animation: pat-belly 0.48s ease-in-out infinite alternate;
}

.monster-card.sleeping .monster-svg {
  transform: rotate(-3deg) translateY(4px);
}

.fed-tool-chip {
  position: absolute;
  right: 6px;
  bottom: 8px;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 18px rgba(61, 100, 79, 0.16);
  font-size: 22px;
}

.snore-bubbles {
  position: absolute;
  right: -8px;
  top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.snore-bubbles span {
  color: #5d84a5;
  font-size: 18px;
  font-weight: 700;
  animation: drift-up 1.6s ease-in-out infinite;
}

.snore-bubbles span:last-child {
  font-size: 14px;
  animation-delay: 0.3s;
}

.monster-copy {
  text-align: center;
}

.monster-copy strong {
  display: block;
  margin-bottom: 6px;
  color: #27485d;
  font-size: 18px;
}

.monster-copy small {
  display: block;
  color: #617d94;
  line-height: 1.5;
}

.tool-area {
  position: absolute;
  left: 50%;
  z-index: 6;
  width: min(94vw, 760px);
  height: 146px;
  border-radius: 30px;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 34px rgba(76, 115, 141, 0.16);
  overflow: hidden;
}

.tool-area.conveyor {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(239, 246, 252, 0.92) 100%);
}

.conveyor-track {
  position: absolute;
  left: 18px;
  right: 18px;
  top: 50%;
  height: 40px;
  border-radius: 999px;
  transform: translateY(-50%);
  background:
    linear-gradient(90deg, rgba(183, 198, 213, 0.26) 0%, rgba(183, 198, 213, 0.26) 20%, transparent 20%, transparent 40%, rgba(183, 198, 213, 0.26) 40%, rgba(183, 198, 213, 0.26) 60%, transparent 60%, transparent 80%, rgba(183, 198, 213, 0.26) 80%),
    linear-gradient(180deg, #d9e2ea 0%, #c6d4e1 100%);
}

.tool-card {
  position: absolute;
  width: 118px;
  height: 124px;
  padding: 10px 8px 8px;
  border: none;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 22px rgba(86, 118, 141, 0.18);
  cursor: grab;
  user-select: none;
  touch-action: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.tool-card.dragging {
  cursor: grabbing;
  box-shadow: 0 20px 34px rgba(73, 108, 136, 0.28);
}

.tool-card.bouncing {
  animation: gentle-bounce 0.34s ease;
}

.tool-svg {
  display: block;
  width: 72px;
  height: 72px;
  margin: 0 auto 8px;
}

.tool-card strong {
  display: block;
  color: #2d4c61;
  font-size: 15px;
}

.tool-card small {
  display: block;
  margin-top: 4px;
  color: #6e899e;
  font-size: 12px;
  line-height: 1.4;
}

.hud-panel {
  position: absolute;
  top: 104px;
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
  background: rgba(255, 255, 255, 0.82);
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
  background: linear-gradient(90deg, #ffa86b 0%, #ff7fa3 42%, #7ad9c7 100%);
  transition: width 0.18s ease;
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

@keyframes floaty {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes gentle-bounce {
  0% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.04);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes pat-belly {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(6px);
  }
}

@keyframes drift-up {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }

  40% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-16px);
  }
}

@media (max-width: 980px) {
  .emotion-monster-game {
    min-height: calc(100vh - 92px);
  }

  .hud-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    top: 128px;
    left: 16px;
    right: 16px;
  }

  .monster-row {
    width: calc(100% - 20px);
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }

  .monster-stage {
    width: 132px;
    height: 132px;
  }

  .tool-area {
    width: calc(100% - 14px);
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
}
</style>
