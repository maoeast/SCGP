<template>
  <div class="balloon-game" :style="rootStyle">
    <canvas ref="celebrationCanvas" class="celebration-canvas" />

    <div class="sky-layer">
      <div
        v-for="cloud in clouds"
        :key="cloud.id"
        class="cloud"
        :style="getCloudStyle(cloud)"
      >
        <span class="cloud-puff puff-a"></span>
        <span class="cloud-puff puff-b"></span>
        <span class="cloud-puff puff-c"></span>
      </div>
    </div>

    <div class="scene-ground">
      <div class="sun-glow" :style="sunStyle"></div>
      <div class="rainbow-island" :class="{ 'is-visible': showIsland, 'no-transition': suppressSceneryFadeOut }">
        <svg viewBox="0 0 240 180" aria-hidden="true">
          <defs>
            <linearGradient id="islandGradient" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" :stop-color="sessionTheme.islandStops[0]" />
              <stop offset="100%" :stop-color="sessionTheme.islandStops[1]" />
            </linearGradient>
          </defs>
          <path
            d="M34 120c18-22 42-30 67-30 10-18 26-28 46-28 17 0 34 8 45 22 17 0 31 7 45 20v32H34z"
            fill="url(#islandGradient)"
          />
          <path d="M34 120h203" :stroke="sessionTheme.islandStroke" stroke-width="10" stroke-linecap="round" />
          <path d="M54 122c28-70 64-96 112-96 28 0 56 16 74 44" fill="none" :stroke="sessionTheme.rainbow[0]" stroke-width="10" stroke-linecap="round" />
          <path d="M58 122c23-54 56-76 97-76 24 0 48 12 63 34" fill="none" :stroke="sessionTheme.rainbow[1]" stroke-width="10" stroke-linecap="round" />
          <path d="M63 122c18-40 46-58 81-58 19 0 37 8 50 23" fill="none" :stroke="sessionTheme.rainbow[2]" stroke-width="10" stroke-linecap="round" />
        </svg>

        <div v-if="showRabbits" class="rabbit-family">
          <div class="rabbit rabbit-parent">
            <span class="ear ear-left"></span>
            <span class="ear ear-right"></span>
            <span class="face"></span>
          </div>
          <div class="rabbit rabbit-child">
            <span class="ear ear-left"></span>
            <span class="ear ear-right"></span>
            <span class="face"></span>
          </div>
        </div>
      </div>

      <div class="balloon-wrapper" :style="balloonStyle">
        <svg viewBox="0 0 180 250" class="balloon-svg" aria-hidden="true">
          <defs>
            <linearGradient id="balloonShell" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" :stop-color="sessionTheme.balloonStops[0]" />
              <stop offset="45%" :stop-color="sessionTheme.balloonStops[1]" />
              <stop offset="100%" :stop-color="sessionTheme.balloonStops[2]" />
            </linearGradient>
            <linearGradient id="basketTone" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" :stop-color="sessionTheme.basketStops[0]" />
              <stop offset="100%" :stop-color="sessionTheme.basketStops[1]" />
            </linearGradient>
          </defs>

          <path
            d="M90 12c37 0 66 29 66 66 0 22-9 41-24 54-12 10-20 24-22 39H70c-2-15-10-29-22-39-15-13-24-32-24-54 0-37 29-66 66-66z"
            fill="url(#balloonShell)"
          />
          <path d="M90 22c22 0 40 18 40 40" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="8" stroke-linecap="round" />
          <path d="M70 171l-16 34M110 171l16 34" stroke="#89613d" stroke-width="5" stroke-linecap="round" />
          <rect x="58" y="205" width="64" height="32" rx="10" fill="url(#basketTone)" />
          <path d="M74 172h32" stroke="#8f6845" stroke-width="5" stroke-linecap="round" />
        </svg>
      </div>
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span class="hud-label">当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span class="hud-label">今日旅程</span>
        <strong>{{ sessionTheme.title }}</strong>
        <small>{{ sessionObjective.shortLabel }}</small>
      </div>
      <div class="hud-card">
        <span class="hud-label">目标进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span class="hud-label">平稳呼吸</span>
        <strong>{{ holdSeconds }} 秒</strong>
      </div>
    </div>

    <div class="instruction-panel">
      <div class="session-badges">
        <span class="session-badge">{{ sessionTheme.title }}</span>
        <span class="session-badge session-badge-accent">{{ sessionObjective.title }}</span>
      </div>

      <div class="instruction-copy">
        <h2>深呼吸热气球</h2>
        <p>{{ stageMessage }}</p>
      </div>

      <button
        class="breath-button"
        type="button"
        :style="buttonStyle"
        :disabled="interactionLocked"
        @pointerdown.prevent="beginInhale"
      >
        {{ buttonLabel }}
      </button>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-core">🎖</div>
        <strong>平静微风徽章</strong>
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
} from '@/types/emotional/games'

interface CloudState {
  id: number
  x: number
  y: number
  scale: number
  speed: number
  opacity: number
}

interface ParticleState {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  color: string
}

interface BalloonTheme {
  key: string
  title: string
  skyGradient: string
  sunGlow: string
  islandStops: [string, string]
  islandStroke: string
  rainbow: [string, string, string]
  balloonStops: [string, string, string]
  basketStops: [string, string]
  buttonGradient: string
  celebrationPalette: readonly string[]
  ceremonyLine: string
  badgeCopy: string
}

interface SessionObjective {
  code: string
  title: string
  shortLabel: string
  readyText: string
  inhalePrompt: string
  successText: string
  inhaleMinMs: number
  perfectMinMs?: number
  perfectMaxMs?: number
  glideMs: number
  requiredCycles: number
  cloudCount: number
  cloudSpeedScale: number
  safeWidth: number
}

const BALLOON_THEMES: readonly BalloonTheme[] = [
  {
    key: 'sunrise_cove',
    title: '晨光海湾',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 36%), linear-gradient(180deg, #8fd4ff 0%, #dff4ff 52%, #fff0cf 100%)',
    sunGlow: 'radial-gradient(circle, rgba(255, 238, 166, 0.94), rgba(255, 238, 166, 0))',
    islandStops: ['#88db94', '#53b969'],
    islandStroke: '#308148',
    rainbow: ['#ff7a7a', '#ffd166', '#95d5ff'],
    balloonStops: ['#ff9a76', '#ff6b81', '#ffb347'],
    basketStops: ['#d6b07d', '#9b6d43'],
    buttonGradient: 'linear-gradient(180deg, #ff9a76 0%, #ff6b81 100%)',
    celebrationPalette: ['#ff6b6b', '#ffd166', '#95d5ff', '#80ed99', '#cdb4ff'],
    ceremonyLine: '晨光像温柔的微风一样，跟着你的呼吸一起把热气球送到了彩虹岛。',
    badgeCopy: '今天的晨光旅程很平稳，你用温柔的呼吸拿到了平静微风徽章。',
  },
  {
    key: 'mint_meadow',
    title: '薄荷草坡',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.4), transparent 36%), linear-gradient(180deg, #9de6da 0%, #e6fff9 48%, #fff6de 100%)',
    sunGlow: 'radial-gradient(circle, rgba(200, 255, 233, 0.82), rgba(200, 255, 233, 0))',
    islandStops: ['#9be38d', '#55b46b'],
    islandStroke: '#3d8b58',
    rainbow: ['#ff9f7a', '#ffe38a', '#8fe8d8'],
    balloonStops: ['#ffb86c', '#ff8fa3', '#ffda77'],
    basketStops: ['#d0a56e', '#8d613f'],
    buttonGradient: 'linear-gradient(180deg, #ffb86c 0%, #ff8fa3 100%)',
    celebrationPalette: ['#ff9f7a', '#ffe38a', '#8fe8d8', '#a0e7a0', '#d7b8ff'],
    ceremonyLine: '薄荷风慢慢吹过来，热气球跟着你柔和的节奏轻轻落了下来。',
    badgeCopy: '今天的薄荷草坡很安静，你用平稳的呼吸带来了舒服的风。',
  },
  {
    key: 'berry_twilight',
    title: '莓果晚霞',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.32), transparent 34%), linear-gradient(180deg, #9cb5ff 0%, #f3d9ff 50%, #ffe8d6 100%)',
    sunGlow: 'radial-gradient(circle, rgba(255, 206, 214, 0.88), rgba(255, 206, 214, 0))',
    islandStops: ['#9fd784', '#4fa55f'],
    islandStroke: '#346f45',
    rainbow: ['#ff8fab', '#ffd6a5', '#a9def9'],
    balloonStops: ['#ff8fab', '#ff7096', '#ffc75f'],
    basketStops: ['#d0a174', '#8d5e38'],
    buttonGradient: 'linear-gradient(180deg, #ff8fab 0%, #ff7096 100%)',
    celebrationPalette: ['#ff8fab', '#ffd6a5', '#a9def9', '#b8f2e6', '#e4c1f9'],
    ceremonyLine: '晚霞慢慢铺开，你稳稳地把热气球送到了最柔软的云边。',
    badgeCopy: '今天的莓果晚霞特别温柔，你用柔和呼吸让热气球安全到站。',
  },
  {
    key: 'lemon_breeze',
    title: '柠檬微风',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.4), transparent 34%), linear-gradient(180deg, #b7e3ff 0%, #f5fff0 48%, #fff6cf 100%)',
    sunGlow: 'radial-gradient(circle, rgba(255, 248, 177, 0.9), rgba(255, 248, 177, 0))',
    islandStops: ['#8dde95', '#58b86e'],
    islandStroke: '#2f7d4b',
    rainbow: ['#ff9f68', '#f6e58d', '#7ed6df'],
    balloonStops: ['#ffd166', '#ff9f43', '#ff7b54'],
    basketStops: ['#d9b278', '#94643d'],
    buttonGradient: 'linear-gradient(180deg, #ffd166 0%, #ff9f43 100%)',
    celebrationPalette: ['#ff9f68', '#f6e58d', '#7ed6df', '#badc58', '#d6a2e8'],
    ceremonyLine: '柠檬味的轻风来了，热气球像听懂了你的呼吸一样慢慢靠岸。',
    badgeCopy: '今天的柠檬微风很轻柔，你用安静而稳定的节奏完成了旅程。',
  },
]

const OBJECTIVES_BY_DIFFICULTY: Record<EmotionGameDifficulty, SessionObjective[]> = {
  1: [
    {
      code: 'l1_soft_breeze',
      title: '柔风起飞',
      shortLabel: '吸到 2 秒就够了',
      readyText: '今天的任务是“柔风起飞”。按住吸气至少 2 秒，再轻轻松开，热气球就会升空。',
      inhalePrompt: '慢慢吸气，先把热气球鼓到舒服的大小。',
      successText: '柔风刚刚好，热气球已经准备好去彩虹岛了。',
      inhaleMinMs: 2000,
      glideMs: 2200,
      requiredCycles: 1,
      cloudCount: 2,
      cloudSpeedScale: 0.55,
      safeWidth: 24,
    },
    {
      code: 'l1_warm_air',
      title: '暖暖升空',
      shortLabel: '试着吸到 2.4 秒',
      readyText: '这次试试“暖暖升空”。吸气稍微久一点，热气球会升得更稳。',
      inhalePrompt: '很好，慢慢吸气，让热气球一点点长大。',
      successText: '这阵暖暖的风很稳定，热气球升得又高又稳。',
      inhaleMinMs: 2400,
      glideMs: 2400,
      requiredCycles: 1,
      cloudCount: 3,
      cloudSpeedScale: 0.6,
      safeWidth: 24,
    },
    {
      code: 'l1_feather_air',
      title: '羽毛轻风',
      shortLabel: '试着吸到 2.8 秒',
      readyText: '今天是“羽毛轻风”。只要慢慢吸到接近 3 秒，热气球就会特别平稳。',
      inhalePrompt: '吸气像羽毛一样轻一点，不着急。',
      successText: '羽毛一样的轻风来了，热气球稳稳漂起来了。',
      inhaleMinMs: 2800,
      glideMs: 2500,
      requiredCycles: 1,
      cloudCount: 2,
      cloudSpeedScale: 0.58,
      safeWidth: 24,
    },
  ],
  2: [
    {
      code: 'l2_watch_cloud_gap',
      title: '看准云朵空隙',
      shortLabel: '避开云朵再松手',
      readyText: '今天要“看准云朵空隙”。先慢慢吸气，等前面的云轻轻飘开，再松手呼气。',
      inhalePrompt: '很好，继续吸气，一边看看云朵有没有让出路。',
      successText: '你看准了空隙，热气球轻轻从云边绕过去了。',
      inhaleMinMs: 2300,
      glideMs: 2300,
      requiredCycles: 1,
      cloudCount: 3,
      cloudSpeedScale: 0.86,
      safeWidth: 12,
    },
    {
      code: 'l2_golden_window',
      title: '等金色风窗',
      shortLabel: '找到安全时机',
      readyText: '这次试试“金色风窗”。观察前方天空，找到安全时机再把风送出去。',
      inhalePrompt: '吸气时看看天空，等那片安全的小窗口出现。',
      successText: '你抓到了金色风窗，热气球顺顺地飞过去了。',
      inhaleMinMs: 2500,
      glideMs: 2400,
      requiredCycles: 1,
      cloudCount: 4,
      cloudSpeedScale: 0.95,
      safeWidth: 11,
    },
    {
      code: 'l2_moon_lane',
      title: '月亮航道',
      shortLabel: '吸到 2.6 秒再放飞',
      readyText: '今天的路叫“月亮航道”。先把气球鼓得更稳一点，再等云朵让路。',
      inhalePrompt: '吸气时慢一点，等路线更清楚再松开。',
      successText: '月亮航道已经打开了，你让热气球飞得很从容。',
      inhaleMinMs: 2600,
      glideMs: 2500,
      requiredCycles: 1,
      cloudCount: 3,
      cloudSpeedScale: 0.92,
      safeWidth: 10,
    },
  ],
  3: [
    {
      code: 'l3_rainbow_countdown',
      title: '彩虹节奏 4-6',
      shortLabel: '完成 3 次平稳节奏',
      readyText: '今天练习“彩虹节奏 4-6”。完成 3 次 4 秒吸气、6 秒呼气，热气球才能到岛上。',
      inhalePrompt: '保持 4 秒吸气，让这阵风稳稳地积起来。',
      successText: '这一轮的节奏很漂亮，再来一次就更稳了。',
      inhaleMinMs: 4000,
      perfectMinMs: 3600,
      perfectMaxMs: 4500,
      glideMs: 6000,
      requiredCycles: 3,
      cloudCount: 4,
      cloudSpeedScale: 1,
      safeWidth: 10,
    },
    {
      code: 'l3_star_lullaby',
      title: '星星摇篮曲',
      shortLabel: '靠近 4 秒，慢慢呼 6 秒',
      readyText: '这次是“星星摇篮曲”。把吸气维持在接近 4 秒，再让呼气像摇篮曲一样慢下来。',
      inhalePrompt: '不着急，慢慢数到 4，再把风送出去。',
      successText: '这一轮像摇篮曲一样平稳，我们继续下一轮。',
      inhaleMinMs: 3900,
      perfectMinMs: 3500,
      perfectMaxMs: 4400,
      glideMs: 6200,
      requiredCycles: 3,
      cloudCount: 4,
      cloudSpeedScale: 1.02,
      safeWidth: 10,
    },
    {
      code: 'l3_moon_bridge',
      title: '月光桥梁',
      shortLabel: '3 次连续稳定',
      readyText: '今天走“月光桥梁”。连续完成 3 次稳定呼吸，热气球就能飞过长长的桥。',
      inhalePrompt: '吸气数到 4 左右，桥面就会慢慢变稳。',
      successText: '月光桥梁又亮起来一段了，继续保持。',
      inhaleMinMs: 4050,
      perfectMinMs: 3650,
      perfectMaxMs: 4600,
      glideMs: 5800,
      requiredCycles: 3,
      cloudCount: 5,
      cloudSpeedScale: 1.05,
      safeWidth: 9,
    },
  ],
}

let lastThemeKey = ''
const lastObjectiveCodeByDifficulty: Partial<Record<EmotionGameDifficulty, string>> = {}

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const clouds = ref<CloudState[]>([])
const balloonAltitude = ref(0)
const holdMs = ref(0)
const successfulCycles = ref(0)
const perfectCycles = ref(0)
const failedReleases = ref(0)
const cloudContacts = ref(0)
const autoReleaseCount = ref(0)
const inhaleSamples = ref<number[]>([])
const longestInhaleMs = ref(0)
const stageMessage = ref('')
const phase = ref<'ready' | 'inhaling' | 'gliding' | 'bounce' | 'landing' | 'celebrating' | 'finished'>('ready')
const showIsland = ref(false)
const showRabbits = ref(false)
const showBadge = ref(false)
const emittedResult = ref(false)
const assistanceLevel = ref(0)
const suppressSceneryFadeOut = ref(false)
const sessionTheme = ref<BalloonTheme>(BALLOON_THEMES[0] as BalloonTheme)
const sessionObjective = ref<SessionObjective>(OBJECTIVES_BY_DIFFICULTY[1][0] as SessionObjective)

const celebrationCanvas = ref<HTMLCanvasElement | null>(null)

let holdInterval: number | null = null
let autoReleaseTimer: number | null = null
let bounceTimer: number | null = null
let ceremonyTimer: number | null = null
let stageFrame: number | null = null
let cloudFrame: number | null = null
let pointerReleaseRegistered = false
let inhaleStartAt = 0
let particles: ParticleState[] = []
let replayTimer: number | null = null

function pickFreshItem<T>(
  items: readonly T[],
  getToken: (item: T) => string,
  lastToken: string,
): T {
  if (items.length <= 1) {
    return items[0] as T
  }

  const filtered = items.filter((item) => getToken(item) !== lastToken)
  return (filtered[Math.floor(Math.random() * filtered.length)] || items[0]) as T
}

function chooseSessionVariant() {
  const nextTheme = pickFreshItem(BALLOON_THEMES, (item) => item.key, lastThemeKey)
  lastThemeKey = nextTheme.key
  sessionTheme.value = nextTheme

  const objectivePool = OBJECTIVES_BY_DIFFICULTY[props.difficulty]
  const nextObjective = pickFreshItem(
    objectivePool,
    (item) => item.code,
    lastObjectiveCodeByDifficulty[props.difficulty] || '',
  )

  lastObjectiveCodeByDifficulty[props.difficulty] = nextObjective.code
  sessionObjective.value = nextObjective
}

function resetClouds() {
  const count = sessionObjective.value.cloudCount
  const yBase = props.difficulty === 1 ? 14 : 12

  clouds.value = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    x: -18 + index * (118 / Math.max(1, count - 1)),
    y: yBase + Math.random() * 20,
    scale: 0.8 + Math.random() * 0.55,
    speed: (0.45 + Math.random() * 0.45) * sessionObjective.value.cloudSpeedScale,
    opacity: 0.72 + Math.random() * 0.2,
  }))
}

function clearTimers() {
  if (holdInterval) window.clearInterval(holdInterval)
  if (autoReleaseTimer) window.clearTimeout(autoReleaseTimer)
  if (bounceTimer) window.clearTimeout(bounceTimer)
  if (ceremonyTimer) window.clearTimeout(ceremonyTimer)
  if (replayTimer) window.clearTimeout(replayTimer)
  holdInterval = null
  autoReleaseTimer = null
  bounceTimer = null
  ceremonyTimer = null
  replayTimer = null
}

function stopFrames() {
  if (stageFrame) cancelAnimationFrame(stageFrame)
  if (cloudFrame) cancelAnimationFrame(cloudFrame)
  stageFrame = null
  cloudFrame = null
}

function detachPointerRelease() {
  if (!pointerReleaseRegistered) return
  window.removeEventListener('pointerup', endInhale)
  window.removeEventListener('pointercancel', endInhale)
  pointerReleaseRegistered = false
}

function attachPointerRelease() {
  if (pointerReleaseRegistered) return
  window.addEventListener('pointerup', endInhale)
  window.addEventListener('pointercancel', endInhale)
  pointerReleaseRegistered = true
}

function getCloudStyle(cloud: CloudState) {
  return {
    left: `${cloud.x}%`,
    top: `${cloud.y}%`,
    transform: `scale(${cloud.scale})`,
    opacity: `${cloud.opacity}`,
  }
}

function getAdaptiveInhaleMinMs() {
  return Math.max(1600, sessionObjective.value.inhaleMinMs - Math.min(assistanceLevel.value * 180, 540))
}

function getAdaptivePerfectMinMs() {
  return Math.max(3200, (sessionObjective.value.perfectMinMs || sessionObjective.value.inhaleMinMs) - assistanceLevel.value * 180)
}

function getAdaptivePerfectMaxMs() {
  return (sessionObjective.value.perfectMaxMs || sessionObjective.value.inhaleMinMs + 500) + assistanceLevel.value * 220
}

const holdSeconds = computed(() => (holdMs.value / 1000).toFixed(1))

const difficultyLabel = computed(() => {
  if (props.difficulty === 1) return '简单 · 稳稳起飞'
  if (props.difficulty === 2) return '中等 · 看准时机'
  return '困难 · 稳定节奏'
})

const progressLabel = computed(() => {
  if (sessionObjective.value.requiredCycles > 1) {
    return `${perfectCycles.value} / ${sessionObjective.value.requiredCycles} 次平稳节奏`
  }
  return successfulCycles.value > 0 ? '已经准备靠岸' : '完成 1 次平稳呼吸'
})

const interactionLocked = computed(() => {
  return props.paused || ['gliding', 'landing', 'celebrating', 'finished'].includes(phase.value)
})

const breathHint = computed(() => {
  if (phase.value === 'inhaling') return '慢慢吸气'
  if (phase.value === 'gliding') return props.difficulty === 3 ? '稳稳呼气' : '轻轻送它上升'
  if (phase.value === 'bounce') return '再试一次'
  if (phase.value === 'finished') return '彩虹岛到了'
  return '按住吸气'
})

const buttonLabel = computed(() => {
  if (sessionObjective.value.requiredCycles > 1) {
    return phase.value === 'inhaling'
      ? `保持 ${Math.round(sessionObjective.value.inhaleMinMs / 1000)} 秒吸气`
      : '按住开始下一轮'
  }
  return phase.value === 'inhaling' ? '继续吸气' : '按住吸气，松开呼气'
})

const rootStyle = computed(() => ({
  background: sessionTheme.value.skyGradient,
}))

const sunStyle = computed(() => ({
  background: sessionTheme.value.sunGlow,
}))

const buttonStyle = computed(() => ({
  background: sessionTheme.value.buttonGradient,
}))

const balloonStyle = computed(() => {
  const baseTop = 52 - balloonAltitude.value * 34
  const inflation = phase.value === 'inhaling'
    ? 1 + Math.min(holdMs.value / 4000, 1.25) * 0.2
    : 1
  const tilt = phase.value === 'gliding' || phase.value === 'landing' ? -3 : 0

  return {
    top: `${baseTop}%`,
    transform: `translate(-50%, -50%) scale(${inflation}) rotate(${tilt}deg)`,
  }
})

function updateClouds() {
  if (props.paused) return
  clouds.value = clouds.value.map((cloud) => {
    const nextX = cloud.x + cloud.speed * 0.18
    return {
      ...cloud,
      x: nextX > 112 ? -20 : nextX,
    }
  })
  cloudFrame = requestAnimationFrame(updateClouds)
}

function clearCelebrationCanvas() {
  const canvas = celebrationCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function resizeCanvas() {
  const canvas = celebrationCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
}

function runCelebration() {
  resizeCanvas()
  const canvas = celebrationCanvas.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  const palette = sessionTheme.value.celebrationPalette
  const originX = canvas.width * 0.5
  const originY = canvas.height * 0.58

  particles = Array.from({ length: 96 }).map(() => ({
    x: originX + (Math.random() - 0.5) * 160,
    y: originY + (Math.random() - 0.5) * 84,
    vx: (Math.random() - 0.5) * 12,
    vy: Math.random() * -10 - 3.2,
    size: Math.random() * 8 + 4,
    life: 1,
    color: palette[Math.floor(Math.random() * palette.length)] || '#ff6b6b',
  }))

  const draw = () => {
    if (props.paused) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles = particles
      .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        vy: particle.vy + 0.08,
        life: particle.life - 0.012,
      }))
      .filter((particle) => particle.life > 0)

    particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life)
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.globalAlpha = 1
    if (particles.length > 0) {
      stageFrame = requestAnimationFrame(draw)
    }
  }

  draw()
}

function setReadyMessage() {
  stageMessage.value = sessionObjective.value.readyText
}

function isCloudBlocking() {
  if (props.difficulty === 1) return false
  const safeWidth = sessionObjective.value.safeWidth + assistanceLevel.value * 1.6
  return clouds.value.some((cloud) => Math.abs(cloud.x - 50) < safeWidth && cloud.y > 10 && cloud.y < 42)
}

function buildAdaptiveRetryTail() {
  if (assistanceLevel.value < 2) return ''

  if (sessionObjective.value.requiredCycles > 1) {
    return ` 我们这次只要吸到大约 ${(getAdaptivePerfectMinMs() / 1000).toFixed(1)} 到 ${(getAdaptivePerfectMaxMs() / 1000).toFixed(1)} 秒，就已经很棒了。`
  }

  return ` 我们先试着吸到 ${(getAdaptiveInhaleMinMs() / 1000).toFixed(1)} 秒左右就好。`
}

async function failWithGentleBounce(message: string) {
  failedReleases.value += 1
  assistanceLevel.value = Math.min(3, assistanceLevel.value + 1)
  phase.value = 'bounce'
  stageMessage.value = `${message}${buildAdaptiveRetryTail()}`
  await props.audio.playSoftBounce()

  bounceTimer = window.setTimeout(() => {
    holdMs.value = 0
    phase.value = 'ready'
    setReadyMessage()
  }, 900)
}

function animateAltitude(target: number, duration: number, onDone?: () => void) {
  const from = balloonAltitude.value
  const startedAt = performance.now()

  const step = (now: number) => {
    if (props.paused) return
    const progress = Math.min(1, (now - startedAt) / duration)
    const eased = 1 - (1 - progress) ** 2
    balloonAltitude.value = from + (target - from) * eased

    if (progress < 1) {
      stageFrame = requestAnimationFrame(step)
      return
    }

    onDone?.()
  }

  stageFrame = requestAnimationFrame(step)
}

function buildPerformanceData() {
  return {
    successful_cycles: successfulCycles.value,
    perfect_cycles: perfectCycles.value,
    failed_releases: failedReleases.value,
    cloud_contacts: cloudContacts.value,
    auto_release_count: autoReleaseCount.value,
    longest_inhale_ms: longestInhaleMs.value,
    inhale_samples_ms: inhaleSamples.value,
    assistance_level: assistanceLevel.value,
    session_theme_key: sessionTheme.value.key,
    session_theme_title: sessionTheme.value.title,
    session_objective_code: sessionObjective.value.code,
    session_objective_title: sessionObjective.value.title,
    adaptive_inhale_min_ms: getAdaptiveInhaleMinMs(),
  }
}

async function triggerCeremony() {
  if (emittedResult.value) return
  phase.value = 'landing'
  showIsland.value = true
  await props.audio.playSuccessCue()
  props.audio.speak(sessionTheme.value.ceremonyLine)

  animateAltitude(1, 2200, () => {
    phase.value = 'celebrating'
    showRabbits.value = true
    runCelebration()

    ceremonyTimer = window.setTimeout(() => {
      showBadge.value = true
    }, 1200)

    window.setTimeout(() => {
      phase.value = 'finished'
      emittedResult.value = true
      emit('complete', {
        performanceData: buildPerformanceData(),
        badge: {
          badgeCode: 'BADGE_CALM_WIND',
          badgeName: '平静微风徽章',
        },
      })

      replayTimer = window.setTimeout(() => {
        if (!props.paused) {
          resetForDifficulty()
        }
      }, 900)
    }, 2200)
  })
}

function completeBreathCycle(holdDurationMs: number) {
  holdMs.value = 0
  successfulCycles.value += 1
  longestInhaleMs.value = Math.max(longestInhaleMs.value, holdDurationMs)
  inhaleSamples.value = [...inhaleSamples.value, Math.round(holdDurationMs)]
  assistanceLevel.value = Math.max(0, assistanceLevel.value - 1)

  if (sessionObjective.value.requiredCycles > 1) {
    perfectCycles.value += 1
    stageMessage.value = perfectCycles.value >= sessionObjective.value.requiredCycles
      ? '最后一阵平稳的风已经准备好了，热气球要去彩虹岛了。'
      : `${sessionObjective.value.successText} 现在已经完成 ${perfectCycles.value} 次。`

    if (perfectCycles.value >= sessionObjective.value.requiredCycles) {
      triggerCeremony()
      return
    }

    phase.value = 'ready'
    setReadyMessage()
    return
  }

  stageMessage.value = sessionObjective.value.successText
  triggerCeremony()
}

function handleSuccessfulRelease(holdDurationMs: number) {
  phase.value = 'gliding'
  const glideTarget = sessionObjective.value.requiredCycles > 1
    ? Math.min(0.84, (perfectCycles.value + 1) / sessionObjective.value.requiredCycles * 0.8)
    : 0.74
  animateAltitude(glideTarget, sessionObjective.value.glideMs, () => completeBreathCycle(holdDurationMs))
}

async function beginInhale() {
  if (interactionLocked.value || phase.value === 'inhaling') return

  clearTimers()
  detachPointerRelease()
  attachPointerRelease()
  props.markRoundDirty?.()

  await props.audio.ensureReady()
  await props.audio.startAmbient()
  await props.audio.startBreathCue()

  phase.value = 'inhaling'
  stageMessage.value = sessionObjective.value.inhalePrompt

  inhaleStartAt = performance.now()
  holdMs.value = 0
  holdInterval = window.setInterval(() => {
    holdMs.value = Math.round(performance.now() - inhaleStartAt)
  }, 40)

  autoReleaseTimer = window.setTimeout(() => {
    autoReleaseCount.value += 1
    endInhale()
  }, 6000)
}

async function endInhale() {
  if (phase.value !== 'inhaling') return

  detachPointerRelease()
  clearTimers()
  props.audio.stopBreathCue()

  const holdDurationMs = Math.round(performance.now() - inhaleStartAt)
  longestInhaleMs.value = Math.max(longestInhaleMs.value, holdDurationMs)

  if (holdDurationMs < getAdaptiveInhaleMinMs()) {
    await failWithGentleBounce('再慢一点吸气也可以，等气球更鼓一些再松手。')
    return
  }

  if (props.difficulty === 2 && isCloudBlocking()) {
    cloudContacts.value += 1
    await failWithGentleBounce('云朵还在前面，我们等它轻轻飘过去，再试一次。')
    return
  }

  if (sessionObjective.value.requiredCycles > 1) {
    const isPerfect = holdDurationMs >= getAdaptivePerfectMinMs() && holdDurationMs <= getAdaptivePerfectMaxMs()
    if (!isPerfect) {
      await failWithGentleBounce('这次吸气有点快或有点久了，我们试着更靠近 4 秒。')
      return
    }
  }

  handleSuccessfulRelease(holdDurationMs)
}

function resetForDifficulty() {
  clearTimers()
  stopFrames()
  detachPointerRelease()
  clearCelebrationCanvas()
  props.audio.stopAll()

  chooseSessionVariant()
  suppressSceneryFadeOut.value = true
  emittedResult.value = false
  showIsland.value = false
  showRabbits.value = false
  showBadge.value = false
  balloonAltitude.value = 0
  holdMs.value = 0
  successfulCycles.value = 0
  perfectCycles.value = 0
  failedReleases.value = 0
  cloudContacts.value = 0
  autoReleaseCount.value = 0
  inhaleSamples.value = []
  longestInhaleMs.value = 0
  assistanceLevel.value = 0
  phase.value = 'ready'
  particles = []
  setReadyMessage()
  resetClouds()

  requestAnimationFrame(() => {
    suppressSceneryFadeOut.value = false
  })

  if (!props.paused) {
    updateClouds()
  }
}

watch(
  () => props.difficulty,
  () => {
    resetForDifficulty()
  },
)

watch(
  () => props.paused,
  (paused) => {
    if (paused) {
      clearTimers()
      stopFrames()
      detachPointerRelease()
      props.audio.stopAll()
      return
    }

    if (!cloudFrame) {
      updateClouds()
    }
  },
)

onMounted(() => {
  resetForDifficulty()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  clearTimers()
  stopFrames()
  detachPointerRelease()
  props.audio.stopAll()
  window.removeEventListener('resize', resizeCanvas)
})
</script>

<style scoped>
.balloon-game {
  position: relative;
  min-height: calc(100vh - 120px);
  overflow: hidden;
}

.celebration-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  z-index: 30;
  pointer-events: none;
}

.sky-layer,
.scene-ground,
.instruction-panel,
.hud-panel {
  position: relative;
  z-index: 2;
}

.sky-layer {
  position: absolute;
  inset: 0;
}

.cloud {
  position: absolute;
  width: 160px;
  height: 78px;
  opacity: 0.85;
}

.cloud-puff {
  position: absolute;
  display: block;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  box-shadow: 0 10px 26px rgba(124, 167, 205, 0.18);
}

.puff-a {
  left: 16px;
  top: 24px;
  width: 56px;
  height: 34px;
}

.puff-b {
  left: 46px;
  top: 8px;
  width: 76px;
  height: 42px;
}

.puff-c {
  left: 90px;
  top: 24px;
  width: 46px;
  height: 28px;
}

.scene-ground {
  position: absolute;
  inset: 0;
}

.sun-glow {
  position: absolute;
  top: 12%;
  right: 10%;
  width: 180px;
  height: 180px;
  border-radius: 50%;
}

.rainbow-island {
  position: absolute;
  left: 50%;
  bottom: 24%;
  width: 280px;
  opacity: 0;
  transform: translateX(-50%) translateY(20px) scale(0.92);
  transition: opacity 1.2s ease, transform 1.2s ease;
}

.rainbow-island.no-transition {
  transition: none;
}

.rainbow-island.is-visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.rabbit-family {
  position: absolute;
  left: 50%;
  bottom: 34px;
  display: flex;
  gap: 18px;
  transform: translateX(-50%);
}

.rabbit {
  position: relative;
  width: 42px;
  height: 54px;
  border-radius: 42px 42px 36px 36px;
  background: linear-gradient(180deg, #fffef6 0%, #f4ead9 100%);
  box-shadow: 0 10px 18px rgba(117, 86, 48, 0.16);
}

.rabbit-parent {
  transform: scale(1.04);
}

.rabbit-child {
  margin-left: -12px;
  align-self: end;
}

.ear {
  position: absolute;
  top: -20px;
  width: 12px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, #fff 0%, #ffe0e5 100%);
}

.ear-left {
  left: 7px;
  transform: rotate(-8deg);
}

.ear-right {
  right: 7px;
  transform: rotate(8deg);
}

.face {
  position: absolute;
  left: 50%;
  top: 16px;
  width: 22px;
  height: 14px;
  transform: translateX(-50%);
  border-bottom: 3px solid #cf8d87;
  border-radius: 0 0 18px 18px;
}

.face::before,
.face::after {
  content: '';
  position: absolute;
  top: -3px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #6f5a57;
}

.face::before {
  left: 4px;
}

.face::after {
  right: 4px;
}

.balloon-wrapper {
  position: absolute;
  left: 50%;
  width: 180px;
  transition: transform 0.3s ease;
}

.balloon-svg {
  width: 100%;
  filter: drop-shadow(0 22px 28px rgba(138, 84, 58, 0.24));
}

.hud-panel {
  position: absolute;
  top: 112px;
  left: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  max-width: 620px;
}

.hud-card {
  min-width: 126px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 14px 26px rgba(68, 112, 156, 0.12);
}

.hud-label {
  display: block;
  font-size: 12px;
  color: #7890a7;
}

.hud-card strong {
  display: block;
  margin-top: 8px;
  color: #234160;
  font-size: 16px;
}

.hud-card small {
  display: block;
  margin-top: 6px;
  color: #7890a7;
  font-size: 12px;
}

.instruction-panel {
  position: absolute;
  left: 50%;
  bottom: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(92%, 620px);
  padding: 26px 24px 28px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 24px 40px rgba(68, 112, 156, 0.14);
  transform: translateX(-50%);
  backdrop-filter: blur(14px);
}

.session-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-bottom: 14px;
}

.session-badge {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #39698f;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 10px 18px rgba(72, 120, 165, 0.12);
}

.session-badge-accent {
  background: rgba(255, 245, 214, 0.96);
  color: #8a5a16;
}

.instruction-copy {
  text-align: center;
}

.instruction-copy h2 {
  margin: 0;
  font-size: 28px;
  color: #21415f;
}

.instruction-copy p {
  margin: 10px 0 0;
  color: #547493;
  line-height: 1.75;
  font-size: 16px;
}

.breath-button {
  min-width: 228px;
  min-height: 84px;
  margin-top: 22px;
  padding: 18px 24px;
  border: none;
  border-radius: 999px;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 22px 28px rgba(245, 108, 108, 0.25);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  touch-action: none;
}

.breath-button:hover:not(:disabled),
.breath-button:active:not(:disabled) {
  transform: translateY(-2px) scale(1.01);
}

.breath-button:disabled {
  cursor: default;
  opacity: 0.72;
}

.badge-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 16;
  width: min(88vw, 360px);
  padding: 28px 24px;
  border-radius: 28px;
  text-align: center;
  color: #5a3b14;
  background: rgba(255, 249, 228, 0.96);
  box-shadow: 0 32px 48px rgba(138, 108, 49, 0.2);
  transform: translate(-50%, -50%);
}

.badge-core {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 86px;
  height: 86px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff6ce 0%, #ffd166 55%, #ffb703 100%);
  box-shadow: 0 0 26px rgba(255, 209, 102, 0.62);
  font-size: 42px;
}

.badge-modal strong {
  display: block;
  font-size: 24px;
}

.badge-modal p {
  margin: 12px 0 0;
  line-height: 1.7;
  color: #7b6440;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: all 0.4s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -42%) scale(0.92);
}

@media (max-width: 900px) {
  .balloon-game {
    min-height: calc(100vh - 92px);
  }

  .hud-panel {
    top: 136px;
    left: 16px;
    right: 16px;
    max-width: none;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hud-card {
    min-width: 0;
    padding: 12px;
  }

  .instruction-panel {
    bottom: 20px;
    width: calc(100% - 20px);
    padding: 22px 16px 22px;
  }

  .instruction-copy h2 {
    font-size: 24px;
  }

  .instruction-copy p {
    font-size: 15px;
  }

  .breath-button {
    width: 100%;
    min-width: 0;
  }

  .rainbow-island {
    width: 250px;
    bottom: 28%;
  }
}
</style>
