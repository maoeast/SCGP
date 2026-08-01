<template>
  <div class="balloon-tap-game" :style="{ background: sessionTheme.skyGradient }">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="sun-halo" :style="{ background: sessionTheme.sunGlow }"></div>
      <div class="cloud cloud--1"></div>
      <div class="cloud cloud--2"></div>
      <div class="cloud cloud--3"></div>
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>目标进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
    </div>

    <div ref="playFieldRef" class="play-field">
      <div class="target-band" :style="targetBandStyle">
        <span class="target-band__eyebrow">{{ difficultyConfig.targetLabel }}</span>
        <strong>飘进这里再轻轻点一下</strong>
      </div>

      <button
        v-for="balloon in activeBalloons"
        :key="balloon.id"
        type="button"
        class="balloon-card"
        :class="[
          `balloon-card--${balloon.kind}`,
          {
            'is-bouncing': balloon.isBouncing,
            'is-popped': balloon.state === 'popped',
          },
        ]"
        :style="getBalloonStyle(balloon)"
        :aria-label="balloon.kind === 'target' ? '目标气球' : '休息气球'"
        @pointerdown.prevent="handleBalloonTap(balloon.id)"
      >
        <span class="balloon-shell">
          <span class="balloon-icon">{{ balloon.kind === 'target' ? '★' : '☁️' }}</span>
          <strong>{{ balloon.kind === 'target' ? '轻轻点' : '先等等' }}</strong>
          <small>{{ balloon.kind === 'target' ? '等进圈里' : '让它飘过' }}</small>
        </span>
        <span class="balloon-string"></span>
      </button>

      <div class="field-footer">
        <div class="field-footer__left">
          <strong>{{ fieldStatus }}</strong>
          <span>{{ helperMessage }}</span>
        </div>
      </div>
    </div>

    <div class="instruction-panel">
      <div class="panel-tags">
        <span>{{ sessionTheme.title }}</span>
        <span class="accent">{{ difficultyConfig.shortLabel }}</span>
      </div>

      <h2>刺破慢气球</h2>
      <p>{{ stageMessage }}</p>
      <small>{{ fieldHint }}</small>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🎈</div>
        <strong>稳稳出手徽章</strong>
        <p>{{ sessionTheme.badgeCopy }}</p>
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
type BalloonKind = 'target' | 'rest'

interface DifficultyConfig {
  goalPops: number
  targetBandTop: number
  targetBandBottom: number
  speedRange: readonly [number, number]
  swayAmplitude: number
  swaySpeedRange: readonly [number, number]
  balloonRadius: number
  spawnGapMs: number
  restChance: number
  shortLabel: string
  targetLabel: string
  readyText: string
  helperText: string
  successText: string
}

interface ThemeDefinition {
  key: string
  title: string
  skyGradient: string
  sunGlow: string
  badgeCopy: string
  celebrationLine: string
}

interface BalloonState {
  id: number
  kind: BalloonKind
  x: number
  y: number
  baseX: number
  radius: number
  speed: number
  swayAmplitude: number
  swaySpeed: number
  swayPhase: number
  elapsedMs: number
  enteredZoneAt: number | null
  isBouncing: boolean
  state: 'rising' | 'popped'
  colors: readonly [string, string]
}

// 目标区（金色圈）：水平居中收窄，让孩子把注意力锁定在一个点上，而不是扫视整条横线。
// 视觉圈左右边界 = 场宽 × [TARGET_ZONE_LEFT_RATIO, TARGET_ZONE_RIGHT_RATIO]（窄屏放宽，见 isBalloonInTargetBand），
// 点击判定与视觉一致（y 在带内且 x 落在圈内才算“进圈”）。
const TARGET_ZONE_LEFT_RATIO = 0.22
const TARGET_ZONE_RIGHT_RATIO = 0.78
// 窄屏（场宽 ≤ 640px）下与 .target-band 的 @media 一致，圈放宽到 68% 屏宽。
const TARGET_ZONE_LEFT_RATIO_NARROW = 0.16
const TARGET_ZONE_RIGHT_RATIO_NARROW = 0.84
// 气球生成 x 范围收窄到圈内，保证每只气球都会飘过金色圈。
const BALLOON_SPAWN_X_MIN_RATIO = 0.3
const BALLOON_SPAWN_X_MAX_RATIO = 0.7

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    goalPops: 4,
    targetBandTop: 0.28,
    targetBandBottom: 0.42,
    speedRange: [72, 90],
    swayAmplitude: 22,
    swaySpeedRange: [1.2, 1.6],
    balloonRadius: 48,
    spawnGapMs: 320,
    restChance: 0,
    shortLabel: '简单 · 宽等待区',
    targetLabel: '金色慢点圈',
    readyText: '先看着慢气球轻轻飘上来，等它进了金色圈，再点一下就可以。',
    helperText: '这一关只要先等时机，再轻轻出手，不用着急。',
    successText: '你已经稳稳地等到了好时机，慢气球都被轻轻点开啦。',
  },
  2: {
    goalPops: 5,
    targetBandTop: 0.24,
    targetBandBottom: 0.36,
    speedRange: [86, 104],
    swayAmplitude: 34,
    swaySpeedRange: [1.5, 2.0],
    balloonRadius: 46,
    spawnGapMs: 260,
    restChance: 0,
    shortLabel: '中等 · 更稳地等',
    targetLabel: '亮光慢点圈',
    readyText: '这次气球会轻轻摆动，先稳住手，等它飘进亮光圈里再点。',
    helperText: '点太早会弹开，先看准位置再轻轻出手。',
    successText: '你把每次出手都放慢了一点，气球一个接一个被你稳稳点开了。',
  },
  3: {
    goalPops: 5,
    targetBandTop: 0.2,
    targetBandBottom: 0.31,
    speedRange: [98, 116],
    swayAmplitude: 42,
    swaySpeedRange: [1.8, 2.3],
    balloonRadius: 44,
    spawnGapMs: 220,
    restChance: 0.35,
    shortLabel: '困难 · 还要先放行',
    targetLabel: '金边等待圈',
    readyText: '困难模式里除了目标气球，还会有休息气球。目标气球进圈再点，休息气球让它自己飘过去。',
    helperText: '先等时机，再决定要不要点，这一关要练的是稳稳忍住。',
    successText: '你不但等到了好时机，还能分清什么时候该点、什么时候先放过，做得很稳。',
  },
}

const THEMES: readonly ThemeDefinition[] = [
  {
    key: 'sunrise-meadow',
    title: '晨光草坡',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.4), transparent 36%), linear-gradient(180deg, #8edbff 0%, #dff6ff 54%, #ffe6a6 100%)',
    sunGlow: 'radial-gradient(circle, rgba(255, 220, 123, 0.92), rgba(255, 220, 123, 0))',
    badgeCopy: '你刚刚没有急着抢点，而是等到了最合适的时机，稳稳出手徽章已经亮起来了。',
    celebrationLine: '慢气球被你稳稳地点开啦，今天的手和眼都配合得很好。',
  },
  {
    key: 'mint-harbor',
    title: '微风晴湾',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.34), transparent 36%), linear-gradient(180deg, #9de7ff 0%, #effff8 56%, #ffe1ba 100%)',
    sunGlow: 'radial-gradient(circle, rgba(173, 244, 214, 0.88), rgba(173, 244, 214, 0))',
    badgeCopy: '你把每次点击都放慢了一点点，慢气球也跟着被你一个个稳稳点开了。',
    celebrationLine: '这片天空已经被你点得很轻很稳，微风和太阳都在看着你笑。',
  },
]

const TARGET_BALLOON_COLORS: ReadonlyArray<readonly [string, string]> = [
  ['#ffb36a', '#ff7b7b'],
  ['#ffd86f', '#ff9a62'],
  ['#8dd9ff', '#5aa9ff'],
  ['#ffa8cf', '#ff7f9f'],
]

const REST_BALLOON_COLORS: ReadonlyArray<readonly [string, string]> = [
  ['#dfe8f2', '#b6c4d6'],
  ['#e8edf6', '#c6d3e4'],
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
const fieldRect = ref({ width: 960, height: 420 })
const activeBalloons = ref<BalloonState[]>([])
const phase = ref<Phase>('ready')
const sessionTheme = ref<ThemeDefinition>(THEMES[0] as ThemeDefinition)
const stageMessage = ref(DIFFICULTY_CONFIGS[1].readyText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const showBadge = ref(false)
const successfulPops = ref(0)
const earlyTaps = ref(0)
const wrongRestTaps = ref(0)
const missedWindows = ref(0)
const calmSkips = ref(0)
const maxStreak = ref(0)
const currentStreak = ref(0)
const targetBalloonCount = ref(0)
const restBalloonCount = ref(0)
const windowResponseSamples = ref<number[]>([])
const speedSamples = ref<number[]>([])

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty])

const difficultyLabel = computed(() => {
  if (props.difficulty === 1) return '简单 · 宽等待区'
  if (props.difficulty === 2) return '中等 · 摆动慢气球'
  return '困难 · 放行休息球'
})

const progressLabel = computed(() => `${successfulPops.value} / ${difficultyConfig.value.goalPops} 只`)

const targetBandTopPx = computed(() => Math.round(fieldRect.value.height * difficultyConfig.value.targetBandTop))
const targetBandBottomPx = computed(() => Math.round(fieldRect.value.height * difficultyConfig.value.targetBandBottom))

const targetBandStyle = computed(() => ({
  top: `${targetBandTopPx.value}px`,
  height: `${Math.max(64, targetBandBottomPx.value - targetBandTopPx.value)}px`,
}))

const fieldStatus = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '晴空已经被你点亮啦'
  }

  const current = activeBalloons.value[0]
  if (!current) {
    return '下一只慢气球正在飘来'
  }

  return current.kind === 'target'
    ? '等它飘进圈里再点'
    : '这只是休息气球，先别点'
})

const fieldHint = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return sessionTheme.value.celebrationLine
  }

  if (difficultyConfig.value.restChance > 0) {
    return '目标气球进圈再点，休息气球先放行，做完这一步就不是抢快，而是稳稳判断。'
  }

  return '先等进圈，再轻轻点一下。只要不着急，气球都会慢慢给你一个刚刚好的时机。'
})

let animationFrame = 0
let lastFrameAt = 0
let spawnTimer = 0
let balloonIdSeed = 0
let completed = false
let roundDirty = false
let lastThemeKey = ''
const timeouts = new Set<number>()

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function averageNumberList(values: number[]) {
  if (!values.length) {
    return null
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function scheduleTimeout(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    timeouts.delete(timer)
    callback()
  }, delay)
  timeouts.add(timer)
}

function clearScheduledTimeouts() {
  timeouts.forEach((timer) => window.clearTimeout(timer))
  timeouts.clear()
}

function clearSpawnTimer() {
  if (!spawnTimer) {
    return
  }

  window.clearTimeout(spawnTimer)
  spawnTimer = 0
}

function syncPlayFieldRect() {
  const field = playFieldRef.value
  if (!field) {
    return
  }

  const rect = field.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return
  }

  fieldRect.value = {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}

function pickTheme() {
  const pool = THEMES.length > 1 ? THEMES.filter((theme) => theme.key !== lastThemeKey) : THEMES
  const fallbackTheme = THEMES[0] as ThemeDefinition
  const nextTheme = (pool[Math.floor(Math.random() * pool.length)] ?? fallbackTheme) as ThemeDefinition
  lastThemeKey = nextTheme.key
  sessionTheme.value = nextTheme
}

function resetMetrics() {
  successfulPops.value = 0
  earlyTaps.value = 0
  wrongRestTaps.value = 0
  missedWindows.value = 0
  calmSkips.value = 0
  maxStreak.value = 0
  currentStreak.value = 0
  targetBalloonCount.value = 0
  restBalloonCount.value = 0
  windowResponseSamples.value = []
  speedSamples.value = []
}

function markDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function updateProgressMessage() {
  if (completed) {
    return
  }

  if (successfulPops.value > 0) {
    stageMessage.value = `已经稳稳刺破 ${successfulPops.value} / ${difficultyConfig.value.goalPops} 只目标气球`
    return
  }

  stageMessage.value = difficultyConfig.value.readyText
}

function getBalloonPalette(kind: BalloonKind): readonly [string, string] {
  const pool = kind === 'target' ? TARGET_BALLOON_COLORS : REST_BALLOON_COLORS
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? ['#ffffff', '#dddddd']
}

function pickBalloonKind(): BalloonKind {
  if (difficultyConfig.value.restChance <= 0) {
    return 'target'
  }

  const shouldGuaranteeRest = restBalloonCount.value === 0 && targetBalloonCount.value >= 2
  if (shouldGuaranteeRest) {
    return 'rest'
  }

  return Math.random() < difficultyConfig.value.restChance ? 'rest' : 'target'
}

function createBalloon(kind: BalloonKind): BalloonState {
  const width = Math.max(fieldRect.value.width, 720)
  const height = Math.max(fieldRect.value.height, 360)
  const speed = randomBetween(difficultyConfig.value.speedRange[0], difficultyConfig.value.speedRange[1])
  const swaySpeed = randomBetween(difficultyConfig.value.swaySpeedRange[0], difficultyConfig.value.swaySpeedRange[1])
  const swayPhase = randomBetween(0, Math.PI * 2)
  const radius = difficultyConfig.value.balloonRadius + randomBetween(-3, 3)
  const baseX = randomBetween(width * BALLOON_SPAWN_X_MIN_RATIO, width * BALLOON_SPAWN_X_MAX_RATIO)
  const swayAmplitude = difficultyConfig.value.swayAmplitude + randomBetween(-8, 10)

  speedSamples.value = [...speedSamples.value, Math.round(speed)]

  return {
    id: ++balloonIdSeed,
    kind,
    x: baseX + Math.sin(swayPhase) * swayAmplitude,
    y: height + radius + 28,
    baseX,
    radius,
    speed,
    swayAmplitude,
    swaySpeed,
    swayPhase,
    elapsedMs: 0,
    enteredZoneAt: null,
    isBouncing: false,
    state: 'rising',
    colors: getBalloonPalette(kind),
  }
}

function queueSpawn(delay = difficultyConfig.value.spawnGapMs) {
  if (completed || spawnTimer || activeBalloons.value.length > 0) {
    return
  }

  spawnTimer = window.setTimeout(() => {
    spawnTimer = 0
    spawnBalloon()
  }, delay)
}

function spawnBalloon() {
  if (completed || activeBalloons.value.length > 0) {
    return
  }

  phase.value = phase.value === 'ready' ? 'playing' : phase.value
  const kind = pickBalloonKind()
  const balloon = createBalloon(kind)
  activeBalloons.value = [balloon]

  if (kind === 'target') {
    targetBalloonCount.value += 1
  } else {
    restBalloonCount.value += 1
  }

  updateProgressMessage()
}

function removeBalloon(balloonId: number) {
  activeBalloons.value = activeBalloons.value.filter((balloon) => balloon.id !== balloonId)
}

function isBalloonInTargetBand(balloon: BalloonState) {
  const inVertical = balloon.y >= targetBandTopPx.value && balloon.y <= targetBandBottomPx.value
  if (!inVertical) {
    return false
  }
  const narrow = fieldRect.value.width <= 640
  const zoneLeft = fieldRect.value.width * (narrow ? TARGET_ZONE_LEFT_RATIO_NARROW : TARGET_ZONE_LEFT_RATIO)
  const zoneRight = fieldRect.value.width * (narrow ? TARGET_ZONE_RIGHT_RATIO_NARROW : TARGET_ZONE_RIGHT_RATIO)
  return balloon.x >= zoneLeft && balloon.x <= zoneRight
}

function setBalloonBounce(balloon: BalloonState) {
  balloon.isBouncing = true
  scheduleTimeout(() => {
    balloon.isBouncing = false
  }, 220)
}

function finalizeBalloonEscape(balloon: BalloonState) {
  removeBalloon(balloon.id)

  if (balloon.kind === 'target') {
    missedWindows.value += 1
    currentStreak.value = 0
    helperMessage.value = '这只气球已经慢慢飘走了，我们等下一只来到圈里。'
  } else {
    calmSkips.value += 1
    helperMessage.value = '你刚刚忍住没有乱点，很稳。'
  }

  updateProgressMessage()
  queueSpawn()
}

function buildPerformanceData() {
  return {
    successful_pops: successfulPops.value,
    early_taps: earlyTaps.value,
    wrong_rest_taps: wrongRestTaps.value,
    missed_windows: missedWindows.value,
    calm_skips: calmSkips.value,
    max_streak: maxStreak.value,
    target_balloon_count: targetBalloonCount.value,
    rest_balloon_count: restBalloonCount.value,
    total_balloons_spawned: targetBalloonCount.value + restBalloonCount.value,
    window_response_ms: [...windowResponseSamples.value],
    average_balloon_speed_px: averageNumberList(speedSamples.value),
    balloon_radius_px: Math.round(difficultyConfig.value.balloonRadius),
    pop_zone_top_ratio: difficultyConfig.value.targetBandTop,
    pop_zone_bottom_ratio: difficultyConfig.value.targetBandBottom,
    theme_key: sessionTheme.value.key,
    goal_pops: difficultyConfig.value.goalPops,
  }
}

function maybeCompleteSession() {
  if (completed || successfulPops.value < difficultyConfig.value.goalPops) {
    return
  }

  completed = true
  phase.value = 'celebrating'
  stageMessage.value = difficultyConfig.value.successText
  helperMessage.value = '你已经把速度放慢下来，也把出手时机看得很准了。'
  props.audio.playSuccessCue().catch(() => {
    // ignore
  })
  props.audio.speak(sessionTheme.value.celebrationLine)
  props.audio.stopAmbient()

  scheduleTimeout(() => {
    showBadge.value = true
  }, 760)

  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_STEADY_POP',
        badgeName: '稳稳出手徽章',
      },
    })
    phase.value = 'finished'
  }, 1400)

  scheduleTimeout(() => {
    if (!props.paused) {
      resetForDifficulty()
    }
  }, 3200)
}

function handleBalloonTap(balloonId: number) {
  if (props.paused || completed) {
    return
  }

  const balloon = activeBalloons.value.find((item) => item.id === balloonId)
  if (!balloon || balloon.state !== 'rising') {
    return
  }

  markDirtyOnce()
  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore
  })

  if (balloon.kind === 'rest') {
    wrongRestTaps.value += 1
    currentStreak.value = 0
    helperMessage.value = '这只是休息气球，我们先让它自己飘过去。'
    setBalloonBounce(balloon)
    props.audio.playSoftBounce().catch(() => {
      // ignore
    })
    return
  }

  if (!isBalloonInTargetBand(balloon)) {
    earlyTaps.value += 1
    currentStreak.value = 0
    helperMessage.value = '再等一等，慢气球飘进金色圈里再轻轻点一下。'
    setBalloonBounce(balloon)
    props.audio.playSoftBounce().catch(() => {
      // ignore
    })
    return
  }

  balloon.state = 'popped'
  successfulPops.value += 1
  currentStreak.value += 1
  maxStreak.value = Math.max(maxStreak.value, currentStreak.value)
  const responseMs = balloon.enteredZoneAt === null ? null : Math.max(0, Math.round(performance.now() - balloon.enteredZoneAt))
  if (responseMs !== null) {
    windowResponseSamples.value = [...windowResponseSamples.value, responseMs]
  }

  helperMessage.value = successfulPops.value >= difficultyConfig.value.goalPops
    ? '最后一只目标气球也被你稳稳点开了。'
    : '这次出手刚刚好，我们继续等下一只。'

  updateProgressMessage()

  scheduleTimeout(() => {
    removeBalloon(balloon.id)
    if (!completed) {
      queueSpawn()
    }
  }, 180)

  maybeCompleteSession()
}

function updateBalloons(now: number, deltaMs: number) {
  if (!activeBalloons.value.length) {
    return
  }

  const deltaSeconds = deltaMs / 1000

  for (const balloon of activeBalloons.value) {
    if (balloon.state !== 'rising') {
      continue
    }

    balloon.elapsedMs += deltaMs
    balloon.y -= balloon.speed * deltaSeconds
    balloon.x = balloon.baseX + Math.sin((balloon.elapsedMs / 1000) * balloon.swaySpeed + balloon.swayPhase) * balloon.swayAmplitude

    if (balloon.kind === 'target' && balloon.enteredZoneAt === null && isBalloonInTargetBand(balloon)) {
      balloon.enteredZoneAt = now
    }

    if (balloon.y + balloon.radius < -8) {
      finalizeBalloonEscape(balloon)
    }
  }
}

function startLoop() {
  const tick = (now: number) => {
    animationFrame = window.requestAnimationFrame(tick)

    if (props.paused) {
      lastFrameAt = now
      return
    }

    if (!lastFrameAt) {
      lastFrameAt = now
    }

    const deltaMs = Math.min(36, now - lastFrameAt)
    lastFrameAt = now
    updateBalloons(now, deltaMs)

    if (!completed && !spawnTimer && activeBalloons.value.length === 0) {
      queueSpawn(220)
    }
  }

  animationFrame = window.requestAnimationFrame(tick)
}

function stopLoop() {
  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
  lastFrameAt = 0
}

function resetForDifficulty() {
  clearSpawnTimer()
  clearScheduledTimeouts()
  completed = false
  roundDirty = false
  activeBalloons.value = []
  phase.value = 'ready'
  showBadge.value = false
  pickTheme()
  resetMetrics()
  stageMessage.value = difficultyConfig.value.readyText
  helperMessage.value = difficultyConfig.value.helperText
  props.audio.stopAmbient()
  queueSpawn(360)
}

function getBalloonStyle(balloon: BalloonState) {
  const width = Math.round(balloon.radius * 1.42)
  const height = Math.round(balloon.radius * 1.72)
  const scale = balloon.state === 'popped' ? 1.18 : balloon.isBouncing ? 1.06 : 1
  const opacity = balloon.state === 'popped' ? 0.4 : 1

  return {
    left: `${Math.round(balloon.x)}px`,
    top: `${Math.round(balloon.y)}px`,
    width: `${width}px`,
    height: `${height + 54}px`,
    transform: `translate(-50%, -50%) scale(${scale})`,
    opacity: String(opacity),
    '--balloon-start': balloon.colors[0],
    '--balloon-end': balloon.colors[1],
  }
}

function handleResize() {
  syncPlayFieldRect()
}

watch(() => props.difficulty, () => {
  resetForDifficulty()
})

watch(() => props.paused, (paused) => {
  if (!paused) {
    lastFrameAt = 0
    syncPlayFieldRect()
  }
})

onMounted(async () => {
  await nextTick()
  syncPlayFieldRect()
  pickTheme()
  resetForDifficulty()
  window.addEventListener('resize', handleResize)
  startLoop()
})

onBeforeUnmount(() => {
  stopLoop()
  clearSpawnTimer()
  clearScheduledTimeouts()
  props.audio.stopAmbient()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.balloon-tap-game {
  position: relative;
  min-height: 100%;
  /* 顶部留出 GameContainer 悬浮工具栏（安静退出/当前学生）的空间，避免 hud 卡片与其重叠 */
  padding: 112px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.sun-halo {
  position: absolute;
  top: 22px;
  right: 42px;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  filter: blur(10px);
  opacity: 0.92;
}

.cloud {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  box-shadow:
    24px 8px 0 0 rgba(255, 255, 255, 0.72),
    54px 0 0 0 rgba(255, 255, 255, 0.6),
    18px -12px 0 0 rgba(255, 255, 255, 0.54);
  filter: blur(0.4px);
}

.cloud--1 {
  top: 78px;
  left: 78px;
  width: 74px;
  height: 28px;
}

.cloud--2 {
  top: 128px;
  left: 46%;
  width: 90px;
  height: 30px;
}

.cloud--3 {
  top: 64px;
  right: 240px;
  width: 78px;
  height: 26px;
}

.hud-panel {
  position: relative;
  z-index: 1;
  display: grid;
  /* 只保留信息性/正面进度两张卡：失败计数不给孩子看，全部数据仍进 performanceData 供教师后台分析 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.hud-card,
.instruction-panel,
.play-field {
  backdrop-filter: blur(12px);
}

.hud-card {
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 16px 36px rgba(50, 92, 126, 0.12);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  white-space: nowrap;
}

.hud-card span {
  font-size: 13px;
  color: rgba(57, 76, 102, 0.8);
}

.hud-card strong {
  font-size: 18px;
  color: #1f4057;
}

.play-field {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 380px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.54);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent 26%),
    linear-gradient(180deg, rgba(145, 213, 255, 0.24) 0%, rgba(255, 255, 255, 0.08) 58%, rgba(122, 189, 152, 0.24) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.32), 0 24px 42px rgba(35, 89, 113, 0.16);
  overflow: hidden;
}

.play-field::after {
  content: '';
  position: absolute;
  left: -8%;
  right: -8%;
  bottom: -32px;
  height: 148px;
  border-radius: 50% 50% 0 0;
  background: linear-gradient(180deg, rgba(153, 218, 176, 0.78) 0%, rgba(88, 161, 119, 0.92) 100%);
}

.target-band {
  position: absolute;
  /* 居中聚焦的目标区（约 56% 屏宽），让孩子的注意力锁定在一点，而不是扫视整条横线 */
  left: 22%;
  width: 56%;
  border-radius: 999px;
  border: 3px solid rgba(255, 196, 87, 0.9);
  background: linear-gradient(180deg, rgba(255, 247, 208, 0.66), rgba(255, 240, 185, 0.4));
  box-shadow:
    0 0 0 10px rgba(255, 232, 174, 0.28),
    inset 0 0 18px rgba(255, 214, 120, 0.35);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #7c5320;
}

.target-band__eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
}

.balloon-card {
  position: absolute;
  z-index: 2;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 180ms ease, opacity 180ms ease, filter 180ms ease;
}

.balloon-card.is-bouncing {
  filter: saturate(0.86);
}

.balloon-card.is-popped {
  pointer-events: none;
  filter: brightness(1.08);
}

.balloon-shell {
  position: relative;
  width: 100%;
  height: calc(100% - 54px);
  border-radius: 50% 50% 44% 44%;
  background: linear-gradient(180deg, var(--balloon-start), var(--balloon-end));
  /* 白色描边 + 加深外阴影：浅色天空背景下让触摸目标更清晰 */
  border: 3px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 0 0 2px rgba(31, 64, 87, 0.14),
    inset -10px -16px 24px rgba(255, 255, 255, 0.14),
    inset 14px 18px 26px rgba(255, 255, 255, 0.26),
    0 22px 30px rgba(51, 83, 107, 0.26);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #fffef9;
  text-shadow: 0 2px 8px rgba(55, 57, 78, 0.22);
}

.balloon-shell::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -8px;
  width: 16px;
  height: 16px;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 4px;
  background: var(--balloon-end);
}

.balloon-icon {
  font-size: 20px;
  line-height: 1;
}

.balloon-shell strong {
  font-size: 16px;
}

.balloon-shell small {
  font-size: 12px;
  opacity: 0.92;
}

.balloon-card--rest .balloon-shell {
  /* 休息气球保持浅色弱化，描边也弱一点，维持与目标气球的区分度 */
  border-color: rgba(255, 255, 255, 0.6);
  color: #40546a;
  text-shadow: none;
}

.balloon-string {
  display: block;
  width: 2px;
  height: 54px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(130, 155, 180, 0.82), rgba(130, 155, 180, 0.18));
}

.field-footer {
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 18px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(255, 255, 255, 0.54);
  color: #2a536b;
}

.field-footer__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-footer__left strong {
  font-size: 15px;
}

.field-footer__left span {
  font-size: 13px;
}

.instruction-panel {
  position: relative;
  z-index: 1;
  padding: 14px 18px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 40px rgba(42, 84, 104, 0.12);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.panel-tags span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(240, 246, 255, 0.88);
  color: #4a6478;
  font-size: 12px;
}

.panel-tags .accent {
  background: rgba(255, 231, 178, 0.82);
  color: #916227;
}

.instruction-panel h2 {
  margin: 0;
  font-size: 26px;
  color: #22445c;
}

.instruction-panel p {
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  color: #36576d;
}

.instruction-panel small {
  color: #587589;
  line-height: 1.6;
}

.badge-modal {
  position: fixed;
  inset: auto 24px 24px auto;
  z-index: 12;
  width: min(320px, calc(100vw - 48px));
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  background: linear-gradient(180deg, rgba(255, 252, 236, 0.96), rgba(255, 240, 210, 0.92));
  box-shadow: 0 24px 48px rgba(110, 86, 40, 0.24);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #6e4d1f;
}

.badge-icon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 26px;
  background: rgba(255, 255, 255, 0.76);
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

/* 窄屏下 GameContainer 工具栏换行变高（约 180px），游戏顶部同步加大避让 */
@media (max-width: 1080px) {
  .balloon-tap-game {
    padding: 196px 16px 16px;
  }
}

@media (max-width: 900px) {
  .hud-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .play-field {
    min-height: 420px;
  }
}

@media (max-width: 640px) {
  .hud-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .instruction-panel h2 {
    font-size: 24px;
  }

  .target-band {
    /* 窄屏下金色圈放宽一点，仍保持居中的聚焦区域 */
    left: 16%;
    width: 68%;
  }

  .field-footer {
    left: 14px;
    right: 14px;
  }
}
</style>
