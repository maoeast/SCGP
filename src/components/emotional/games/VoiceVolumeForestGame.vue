<template>
  <div class="voice-forest-game" :style="{ background: theme.skyGradient }">
    <canvas ref="celebrationCanvas" class="celebration-canvas" />

    <div class="sky-layer">
      <div class="moon-glow" :style="{ background: theme.moonGlow }"></div>
      <div class="moon"></div>
      <span
        v-for="star in stars"
        :key="star.id"
        class="star"
        :style="{
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          animationDelay: `${star.delay}s`,
        }"
      />
      <div class="bulbs">
        <span
          v-for="(color, index) in theme.bulbs"
          :key="`${theme.key}-${index}`"
          class="bulb"
          :class="{ lit: index < litBulbCount }"
          :style="{ '--bulb-color': color }"
        />
      </div>
    </div>

    <div class="forest-layer">
      <div class="tree-row">
        <span v-for="tree in 6" :key="tree" class="tree" />
      </div>

      <div class="fireflies">
        <span
          v-for="firefly in fireflies"
          :key="firefly.id"
          class="firefly"
          :style="getFireflyStyle(firefly)"
        />
      </div>

      <div class="animals">
        <article
          v-for="animal in animalStates"
          :key="animal.id"
          class="animal"
          :class="[animal.kind, { awake: animal.awake, hiding: animal.hiding, dancing: phase === 'celebrating' }]"
        >
          <div class="hole"></div>
          <div class="body">
            <div class="ears">
              <span class="ear left"></span>
              <span class="ear right"></span>
            </div>
            <div class="face">
              <span class="eye left"></span>
              <span class="eye right"></span>
              <span class="nose"></span>
            </div>
            <div v-if="animal.kind === 'squirrel'" class="tail"></div>
          </div>
          <strong>{{ animal.label }}</strong>
          <small>{{ animal.awake ? '醒来啦' : '还在做梦' }}</small>
        </article>
      </div>
    </div>

    <div class="hud">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>魔法音量</span>
        <strong>{{ roundedMappedDb }} dB</strong>
      </div>
      <div class="hud-card">
        <span>目标范围</span>
        <strong>{{ objective.targetMinDb }} - {{ objective.targetMaxDb }} dB</strong>
      </div>
      <div class="hud-card">
        <span>稳定进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
    </div>

    <div class="panel">
      <div class="tags">
        <span>{{ theme.title }}</span>
        <span class="accent">{{ objective.title }}</span>
      </div>

      <h2>音量魔法森林</h2>
      <p>{{ stageMessage }}</p>
      <small>{{ helperMessage }}</small>

      <div class="meter">
        <div class="meter-labels">
          <span>轻一点</span>
          <span>日常交谈区</span>
          <span>太大声</span>
        </div>
        <div class="meter-track">
          <span class="target-band" :style="targetBandStyle"></span>
          <span class="meter-fill" :style="{ width: `${Math.max(0, Math.min(100, mappedDb))}%` }"></span>
          <span class="meter-pin" :style="{ left: `${Math.max(0, Math.min(100, mappedDb))}%` }"></span>
        </div>
      </div>

      <div class="progress">
        <span>{{ progressTitle }}</span>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
        </div>
      </div>

      <button class="primary-button" :disabled="buttonDisabled" type="button" @click="handlePrimaryAction">
        {{ primaryButtonLabel }}
      </button>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🎵</div>
        <strong>魔法声音徽章</strong>
        <p>{{ theme.badgeCopy }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { EmotionGameAudioController, EmotionGameCompletionPayload, EmotionGameDifficulty, EmotionGameSettings } from '@/types/emotional/games'

type Phase = 'ready' | 'requesting' | 'quiet' | 'voice' | 'listening' | 'warning' | 'celebrating' | 'finished' | 'error'

interface Theme {
  key: string
  title: string
  skyGradient: string
  moonGlow: string
  bulbs: readonly string[]
  celebration: readonly string[]
  ceremonyLine: string
  badgeCopy: string
}

interface Objective {
  title: string
  shortLabel: string
  targetMinDb: number
  targetMaxDb: number
  warningDb: number
  completionGoalMs: number
  animalMilestones: readonly number[]
  listeningPrompt: string
  warningPrompt: string
  successPrompt: string
  usePartyBed: boolean
  loudPenalty: boolean
}

interface Firefly {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface Animal {
  id: number
  kind: 'rabbit' | 'squirrel' | 'bear'
  label: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  color: string
}

const THEMES: readonly Theme[] = [
  {
    key: 'starlight',
    title: '星灯小林地',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.18), transparent 36%), linear-gradient(180deg, #10243a 0%, #17324f 48%, #274d45 100%)',
    moonGlow: 'radial-gradient(circle, rgba(254,244,194,0.9), rgba(254,244,194,0))',
    bulbs: ['#ffd166', '#f8ffae', '#9bf6ff', '#c8b6ff', '#ffadad'],
    celebration: ['#ffd166', '#a8dadc', '#f1fa8c', '#cdb4db', '#ffafcc'],
    ceremonyLine: '你找到了最神奇的魔法声音，小动物们都好喜欢你。',
    badgeCopy: '今晚的森林被你温柔的声音点亮了，魔法声音徽章已经闪闪发光。',
  },
  {
    key: 'mint-night',
    title: '薄荷夜森林',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.16), transparent 36%), linear-gradient(180deg, #102234 0%, #1b4352 48%, #2d6a4f 100%)',
    moonGlow: 'radial-gradient(circle, rgba(222,255,231,0.86), rgba(222,255,231,0))',
    bulbs: ['#b9fbc0', '#98f5e1', '#8ecae6', '#f1c0e8', '#fde4cf'],
    celebration: ['#b9fbc0', '#98f5e1', '#8ecae6', '#fde4cf', '#f1c0e8'],
    ceremonyLine: '森林听见了你刚刚好的声音，萤火虫和朋友们全都醒来了。',
    badgeCopy: '薄荷夜里的灯泡都亮了起来，这枚魔法声音徽章会陪你记住今天的好声音。',
  },
]

const OBJECTIVES: Record<EmotionGameDifficulty, Objective> = {
  1: {
    title: '轻轻叫醒萤火虫',
    shortLabel: '宽容区间 30-70',
    targetMinDb: 30,
    targetMaxDb: 70,
    warningDb: 70,
    completionGoalMs: 2600,
    animalMilestones: [1300, 2600],
    listeningPrompt: '用平时的声音说说话吧，萤火虫会跟着你一起跳舞。',
    warningPrompt: '嘘，小点声哦，森林喜欢柔柔的声音。',
    successPrompt: '森林亮起来啦，小动物们都被你温柔地叫醒了。',
    usePartyBed: false,
    loudPenalty: false,
  },
  2: {
    title: '保持刚刚好的声音',
    shortLabel: '对话区 40-60',
    targetMinDb: 40,
    targetMaxDb: 60,
    warningDb: 70,
    completionGoalMs: 3000,
    animalMilestones: [3000, 6000, 9000],
    listeningPrompt: '把声音保持在日常交谈区 3 秒，就能叫醒一只小动物。',
    warningPrompt: '声音太大啦，小动物先躲进树洞里休息一下。',
    successPrompt: '你守住了刚刚好的声音，森林朋友们都围过来了。',
    usePartyBed: false,
    loudPenalty: true,
  },
  3: {
    title: '守住 10 秒魔法声音',
    shortLabel: '干扰下稳定 10 秒',
    targetMinDb: 40,
    targetMaxDb: 60,
    warningDb: 70,
    completionGoalMs: 10000,
    animalMilestones: [3333, 6666, 10000],
    listeningPrompt: '排除派对干扰，把声音稳稳放在对话区 10 秒钟。',
    warningPrompt: '先轻一点，让派对声过去，我们再把声音放回刚刚好。',
    successPrompt: '你守住了最神奇的魔法声音，整片森林都跟着你闪闪发亮。',
    usePartyBed: true,
    loudPenalty: true,
  },
}

const STARS = [
  { id: 1, left: 12, top: 10, size: 3, delay: 0 },
  { id: 2, left: 24, top: 18, size: 2, delay: 0.3 },
  { id: 3, left: 36, top: 8, size: 4, delay: 0.6 },
  { id: 4, left: 46, top: 18, size: 3, delay: 0.9 },
  { id: 5, left: 58, top: 12, size: 2, delay: 1.2 },
  { id: 6, left: 68, top: 20, size: 3, delay: 1.5 },
  { id: 7, left: 80, top: 10, size: 4, delay: 1.8 },
]

const FIREFLIES: readonly Firefly[] = [
  { id: 1, left: 18, top: 26, size: 10, delay: 0 },
  { id: 2, left: 28, top: 38, size: 12, delay: 0.4 },
  { id: 3, left: 38, top: 28, size: 8, delay: 0.8 },
  { id: 4, left: 48, top: 40, size: 11, delay: 1.2 },
  { id: 5, left: 60, top: 26, size: 10, delay: 1.6 },
  { id: 6, left: 70, top: 42, size: 13, delay: 2 },
  { id: 7, left: 80, top: 30, size: 9, delay: 2.4 },
]

const ANIMALS: readonly Animal[] = [
  { id: 1, kind: 'rabbit', label: '小兔子' },
  { id: 2, kind: 'squirrel', label: '小松鼠' },
  { id: 3, kind: 'bear', label: '小熊' },
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

let lastThemeKey = ''

const celebrationCanvas = ref<HTMLCanvasElement | null>(null)
const phase = ref<Phase>('ready')
const theme = ref<Theme>(THEMES[0] as Theme)
const stageMessage = ref('轻轻点一下开始，让森林先听听今晚的安静。')
const helperMessage = ref('先安静 2 秒，再用平时说话的声音对小熊说“你好”。')
const mappedDb = ref(0)
const roundedMappedDb = computed(() => Math.max(0, Math.round(mappedDb.value)))
const smoothedDbfs = ref(-80)
const noiseFloorDbfs = ref(-68)
const speechReferenceDbfs = ref(-42)
const litBulbCount = ref(0)
const currentTargetMs = ref(0)
const accumulatedTargetMs = ref(0)
const maxContinuousTargetMs = ref(0)
const targetHits = ref(0)
const fireflyWaveCount = ref(0)
const overshootCount = ref(0)
const warningCount = ref(0)
const mappedPeakDb = ref(0)
const activeAnimalCount = ref(0)
const showBadge = ref(false)
const calibrationFallbackUsed = ref(false)
const micPermissionGranted = ref(false)
const hiddenAnimalId = ref<number | null>(null)

const objective = computed(() => OBJECTIVES[props.difficulty])
const stars = STARS
const fireflies = FIREFLIES
const animalStates = computed(() => ANIMALS.map((animal, index) => ({
  ...animal,
  awake: index < activeAnimalCount.value || phase.value === 'celebrating',
  hiding: hiddenAnimalId.value === animal.id,
})))

const difficultyLabel = computed(() => {
  if (props.difficulty === 1) return '简单 · 轻声尝试'
  if (props.difficulty === 2) return '中等 · 刚刚好'
  return '困难 · 稳住 10 秒'
})

const progressRatio = computed(() => {
  if (props.difficulty === 2) {
    const lastMilestone = objective.value.animalMilestones[objective.value.animalMilestones.length - 1] || 1
    return Math.min(1, accumulatedTargetMs.value / lastMilestone)
  }
  return Math.min(1, currentTargetMs.value / objective.value.completionGoalMs)
})

const progressTitle = computed(() => {
  if (phase.value === 'quiet') return '森林先安静地听一会儿夜色'
  if (phase.value === 'voice') return '小熊正在记住你的平时音量'
  if (props.difficulty === 2) return '叫醒小动物的进度'
  return '魔法声音的稳定进度'
})

const progressLabel = computed(() => {
  if (props.difficulty === 2) return `${activeAnimalCount.value} / ${objective.value.animalMilestones.length} 只醒来`
  return `${(Math.max(currentTargetMs.value, accumulatedTargetMs.value) / 1000).toFixed(1)} 秒`
})

const targetBandStyle = computed(() => ({
  left: `${objective.value.targetMinDb}%`,
  width: `${objective.value.targetMaxDb - objective.value.targetMinDb}%`,
}))

const primaryButtonLabel = computed(() => {
  if (phase.value === 'requesting') return '小熊在把耳朵借给你'
  if (phase.value === 'quiet') return '先一起安静 2 秒'
  if (phase.value === 'voice') return '对小熊说“你好”'
  if (phase.value === 'listening' || phase.value === 'warning') return '森林正在听你说话'
  if (phase.value === 'celebrating') return '森林亮起来啦'
  if (phase.value === 'finished') return '再玩一轮'
  if (phase.value === 'error') return '重新轻轻开始'
  return '轻轻唤醒森林'
})

const buttonDisabled = computed(() => props.paused || ['requesting', 'quiet', 'voice', 'listening', 'warning', 'celebrating'].includes(phase.value))

let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let micSource: MediaStreamAudioSourceNode | null = null
let micStream: MediaStream | null = null
let analysisBuffer: Float32Array<ArrayBuffer> | null = null
let analysisFrame = 0
let celebrationFrame = 0
let phaseStartedAt = 0
let lastAnalysisAt = 0
let lastWarningAt = 0
let roundDirty = false
let completed = false
let partyCleanup: (() => void) | null = null
let particles: Particle[] = []
const timeouts = new Set<number>()
const noiseSamples: number[] = []
const voiceSamples: number[] = []

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

function stopLoops() {
  if (analysisFrame) cancelAnimationFrame(analysisFrame)
  if (celebrationFrame) cancelAnimationFrame(celebrationFrame)
  analysisFrame = 0
  celebrationFrame = 0
}

function resizeCanvas() {
  const canvas = celebrationCanvas.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
}

function clearCanvas() {
  const canvas = celebrationCanvas.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function pickTheme() {
  const next = (THEMES.filter((item) => item.key !== lastThemeKey)[0] || THEMES[0]) as Theme
  theme.value = next
  lastThemeKey = next.key
}

async function ensureAudioContext() {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctx) throw new Error('audio-context-unavailable')
  if (!audioContext) audioContext = new Ctx()
  if (audioContext.state === 'suspended') await audioContext.resume()
}

function stopMic() {
  micStream?.getTracks().forEach((track) => track.stop())
  micStream = null
  try {
    micSource?.disconnect()
    analyser?.disconnect()
  } catch {
    // ignore
  }
  micSource = null
  analyser = null
  analysisBuffer = null
}

function stopPartyBed() {
  if (partyCleanup) {
    partyCleanup()
    partyCleanup = null
  }
}

function stopRuntime() {
  clearTimeouts()
  stopLoops()
  stopPartyBed()
  stopMic()
}

function resetForDifficulty() {
  stopRuntime()
  props.audio.stopAll()
  pickTheme()
  phase.value = 'ready'
  stageMessage.value = '轻轻点一下开始，让森林先听听今晚的安静。'
  helperMessage.value = '先安静 2 秒，再用平时说话的声音对小熊说“你好”。'
  mappedDb.value = 0
  smoothedDbfs.value = -80
  noiseFloorDbfs.value = -68
  speechReferenceDbfs.value = -42
  litBulbCount.value = 0
  currentTargetMs.value = 0
  accumulatedTargetMs.value = 0
  maxContinuousTargetMs.value = 0
  targetHits.value = 0
  fireflyWaveCount.value = 0
  overshootCount.value = 0
  warningCount.value = 0
  mappedPeakDb.value = 0
  activeAnimalCount.value = 0
  showBadge.value = false
  calibrationFallbackUsed.value = false
  micPermissionGranted.value = false
  hiddenAnimalId.value = null
  roundDirty = false
  completed = false
  phaseStartedAt = 0
  lastAnalysisAt = 0
  lastWarningAt = 0
  noiseSamples.length = 0
  voiceSamples.length = 0
  particles = []
  clearCanvas()
}

function quantile(values: number[], q: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)))] || 0
}

function computeDbfs() {
  if (!analyser || !analysisBuffer) return -100
  analyser.getFloatTimeDomainData(analysisBuffer)
  let sum = 0
  for (const value of analysisBuffer) sum += value * value
  const rms = Math.sqrt(sum / analysisBuffer.length)
  if (!Number.isFinite(rms) || rms <= 0.000001) return -100
  return Math.max(-100, Math.min(0, 20 * Math.log10(rms)))
}

function mapDbfsToGameDb(dbfs: number) {
  const span = Math.max(12, speechReferenceDbfs.value - noiseFloorDbfs.value)
  const centered = 50 + ((dbfs - speechReferenceDbfs.value) * (20 / span))
  return Math.max(0, Math.min(85, centered))
}

function getFireflyStyle(firefly: Firefly) {
  const glow = Math.max(0.18, Math.min(1, mappedDb.value / 70))
  return {
    left: `${firefly.left}%`,
    top: `${firefly.top}%`,
    width: `${firefly.size}px`,
    height: `${firefly.size}px`,
    opacity: `${glow}`,
    transform: `translateY(${Math.sin((performance.now() / 600) + firefly.delay) * 6}px) scale(${0.8 + glow * 0.35})`,
    animationDelay: `${firefly.delay}s`,
  }
}

function setProgress(progressMs: number) {
  const milestones = objective.value.animalMilestones
  activeAnimalCount.value = milestones.filter((milestone) => progressMs >= milestone).length
  litBulbCount.value = Math.max(activeAnimalCount.value * 2, Math.round(progressRatio.value * theme.value.bulbs.length))
}

function triggerHideAnimal() {
  const animal = ANIMALS[Math.min(activeAnimalCount.value, ANIMALS.length - 1)]
  if (!animal) return
  hiddenAnimalId.value = animal.id
  scheduleTimeout(() => {
    hiddenAnimalId.value = null
  }, 1200)
}

function markDirtyIfNeeded() {
  if (roundDirty) return
  roundDirty = true
  props.markRoundDirty?.()
}

async function startPartyBed() {
  if (!objective.value.usePartyBed || !props.settings.effectsEnabled) return
  await ensureAudioContext()
  if (!audioContext || partyCleanup) return

  const gain = audioContext.createGain()
  gain.gain.value = (props.settings.backgroundVolume / 100) * 0.02
  gain.connect(audioContext.destination)

  const base = audioContext.createOscillator()
  base.type = 'triangle'
  base.frequency.value = 246.94
  base.connect(gain)

  const sparkle = audioContext.createOscillator()
  sparkle.type = 'square'
  sparkle.frequency.value = 392
  sparkle.connect(gain)

  base.start()
  sparkle.start()

  partyCleanup = () => {
    try {
      base.stop()
      sparkle.stop()
    } catch {
      // ignore
    }
    try {
      base.disconnect()
      sparkle.disconnect()
      gain.disconnect()
    } catch {
      // ignore
    }
  }
}

async function playCelebrationMusic() {
  if (!props.settings.effectsEnabled) return
  await ensureAudioContext()
  if (!audioContext) return
  const notes = [659.25, 783.99, 987.77, 1046.5]
  notes.forEach((frequency, index) => {
    const osc = audioContext!.createOscillator()
    const gain = audioContext!.createGain()
    const startAt = audioContext!.currentTime + index * 0.18
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(frequency, startAt)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime((props.settings.backgroundVolume / 100) * 0.05 + 0.02, startAt + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.32)
    osc.connect(gain)
    gain.connect(audioContext!.destination)
    osc.start(startAt)
    osc.stop(startAt + 0.36)
  })
}

function buildPerformanceData() {
  return {
    noise_floor_dbfs: Number(noiseFloorDbfs.value.toFixed(2)),
    speech_reference_dbfs: Number(speechReferenceDbfs.value.toFixed(2)),
    mapped_peak_db: Number(mappedPeakDb.value.toFixed(2)),
    stable_voice_ms: Math.round(accumulatedTargetMs.value),
    max_continuous_target_ms: Math.round(maxContinuousTargetMs.value),
    overshoot_count: overshootCount.value,
    warning_count: warningCount.value,
    animals_awakened: activeAnimalCount.value,
    firefly_wave_count: fireflyWaveCount.value,
    target_hits: targetHits.value,
    difficulty_goal_ms: objective.value.completionGoalMs,
    mic_permission_granted: micPermissionGranted.value,
    calibration_fallback_used: calibrationFallbackUsed.value,
    theme_key: theme.value.key,
  }
}

function runCelebration() {
  resizeCanvas()
  const canvas = celebrationCanvas.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  const originX = canvas.width * 0.5
  const originY = canvas.height * 0.58
  particles = Array.from({ length: 88 }).map(() => ({
    x: originX + (Math.random() - 0.5) * 140,
    y: originY + (Math.random() - 0.5) * 80,
    vx: (Math.random() - 0.5) * 10,
    vy: Math.random() * -9 - 3,
    size: Math.random() * 7 + 3,
    life: 1,
    color: theme.value.celebration[Math.floor(Math.random() * theme.value.celebration.length)] || '#ffd166',
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
      ctx.globalAlpha = particle.life
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.globalAlpha = 1
    if (particles.length) celebrationFrame = requestAnimationFrame(draw)
  }

  draw()
}

async function completeSession() {
  if (completed) return
  completed = true
  phase.value = 'celebrating'
  stageMessage.value = objective.value.successPrompt
  helperMessage.value = '小灯泡亮起来啦，大家正在开心摇摆。'
  activeAnimalCount.value = ANIMALS.length
  litBulbCount.value = theme.value.bulbs.length
  stopPartyBed()
  stopMic()
  stopLoops()
  clearTimeouts()
  runCelebration()
  await Promise.allSettled([playCelebrationMusic(), props.audio.playSuccessCue()])
  props.audio.speak(theme.value.ceremonyLine)
  scheduleTimeout(() => {
    showBadge.value = true
  }, 900)
  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_MAGIC_VOICE',
        badgeName: '魔法声音徽章',
      },
    })
    phase.value = 'finished'
  }, 1800)
  scheduleTimeout(() => {
    resetForDifficulty()
  }, 3200)
}

function updateListening(deltaMs: number, now: number) {
  const inTarget = mappedDb.value >= objective.value.targetMinDb && mappedDb.value <= objective.value.targetMaxDb
  const loud = mappedDb.value > objective.value.warningDb
  const hasVoice = mappedDb.value >= objective.value.targetMinDb - 8

  if (inTarget) {
    currentTargetMs.value += deltaMs
    accumulatedTargetMs.value += deltaMs
    maxContinuousTargetMs.value = Math.max(maxContinuousTargetMs.value, currentTargetMs.value)
    mappedPeakDb.value = Math.max(mappedPeakDb.value, mappedDb.value)
    if (currentTargetMs.value === deltaMs) targetHits.value += 1
    if (now - lastWarningAt > 900) {
      phase.value = 'listening'
      stageMessage.value = objective.value.listeningPrompt
      helperMessage.value = `把声音放在 ${objective.value.targetMinDb}-${objective.value.targetMaxDb} dB 的日常交谈区。`
    }
  } else if (props.difficulty === 1) {
    if (hasVoice) accumulatedTargetMs.value += deltaMs * 0.75
    currentTargetMs.value = Math.max(0, currentTargetMs.value - deltaMs * 0.35)
  } else if (props.difficulty === 3 && !loud) {
    currentTargetMs.value = Math.max(0, currentTargetMs.value - deltaMs * 0.8)
  } else {
    currentTargetMs.value = 0
  }

  if (loud && now - lastWarningAt > 1200) {
    lastWarningAt = now
    warningCount.value += 1
    overshootCount.value += 1
    phase.value = 'warning'
    stageMessage.value = objective.value.warningPrompt
    helperMessage.value = props.difficulty === 1 ? '不用着急，柔柔地说就很棒。' : '让声音回到平时聊天的大小，小动物会更愿意靠近你。'
    props.audio.playSoftBounce().catch(() => {
      // ignore
    })
    if (objective.value.loudPenalty) {
      currentTargetMs.value = 0
      triggerHideAnimal()
    }
    scheduleTimeout(() => {
      if (!props.paused && (phase.value === 'warning' || phase.value === 'listening')) {
        phase.value = 'listening'
        stageMessage.value = objective.value.listeningPrompt
      }
    }, 850)
  }

  if (props.difficulty === 1) {
    setProgress(accumulatedTargetMs.value)
    if (accumulatedTargetMs.value >= objective.value.completionGoalMs) completeSession()
    return
  }

  if (props.difficulty === 2) {
    setProgress(accumulatedTargetMs.value)
    if (currentTargetMs.value >= objective.value.completionGoalMs) {
      accumulatedTargetMs.value += objective.value.completionGoalMs
      currentTargetMs.value = 0
      fireflyWaveCount.value += 1
      setProgress(accumulatedTargetMs.value)
      if (activeAnimalCount.value >= objective.value.animalMilestones.length) {
        completeSession()
      } else {
        stageMessage.value = '又有一只小动物醒来啦，继续保持刚刚好的声音。'
        helperMessage.value = '下一只朋友也在等你轻轻叫醒它。'
      }
    }
    return
  }

  setProgress(currentTargetMs.value)
  if (currentTargetMs.value >= objective.value.completionGoalMs) completeSession()
}

function finishQuietCalibration() {
  if (phase.value !== 'quiet') return
  noiseFloorDbfs.value = Math.max(-90, Math.min(-20, quantile(noiseSamples, 0.65) || -68))
  phase.value = 'voice'
  phaseStartedAt = performance.now()
  stageMessage.value = '现在用你平时说话的声音，对小熊说一句“你好”吧！'
  helperMessage.value = '不用喊，大约像平时打招呼那样说就可以。'
  voiceSamples.length = 0
}

function finishVoiceCalibration() {
  if (phase.value !== 'voice') return
  if (voiceSamples.length >= 10) {
    speechReferenceDbfs.value = Math.max(noiseFloorDbfs.value + 10, quantile(voiceSamples, 0.7))
  } else {
    calibrationFallbackUsed.value = true
    speechReferenceDbfs.value = noiseFloorDbfs.value + 16
  }
  phase.value = 'listening'
  phaseStartedAt = performance.now()
  stageMessage.value = objective.value.listeningPrompt
  helperMessage.value = `把声音稳稳放在 ${objective.value.targetMinDb}-${objective.value.targetMaxDb} dB 的区域。`
  currentTargetMs.value = 0
  accumulatedTargetMs.value = 0
  activeAnimalCount.value = 0
  litBulbCount.value = 0
  fireflyWaveCount.value = 1
  markDirtyIfNeeded()
  startPartyBed().catch(() => {
    // ignore
  })
}

function runAnalysis(timestamp: number) {
  if (props.paused || !analyser || !analysisBuffer) return
  const dbfs = computeDbfs()
  smoothedDbfs.value = smoothedDbfs.value < -90 ? dbfs : smoothedDbfs.value + (dbfs - smoothedDbfs.value) * 0.18
  mappedDb.value = mapDbfsToGameDb(smoothedDbfs.value)
  const deltaMs = lastAnalysisAt ? Math.min(120, timestamp - lastAnalysisAt) : 16
  lastAnalysisAt = timestamp

  if (phase.value === 'quiet') {
    noiseSamples.push(smoothedDbfs.value)
    if (timestamp - phaseStartedAt >= 2000) finishQuietCalibration()
  } else if (phase.value === 'voice') {
    if (smoothedDbfs.value > noiseFloorDbfs.value + 6) voiceSamples.push(smoothedDbfs.value)
    if ((voiceSamples.length >= 16 && timestamp - phaseStartedAt > 1100) || timestamp - phaseStartedAt >= 3200) {
      finishVoiceCalibration()
    }
  } else if (phase.value === 'listening' || phase.value === 'warning') {
    updateListening(deltaMs, timestamp)
  }

  analysisFrame = requestAnimationFrame(runAnalysis)
}

async function startMicrophoneSession() {
  if (!navigator.mediaDevices?.getUserMedia) {
    phase.value = 'error'
    stageMessage.value = '今天的小熊还没有找到可以听声音的耳朵。'
    helperMessage.value = '请换一台能使用麦克风的设备，再来轻轻叫醒森林。'
    return
  }

  phase.value = 'requesting'
  stageMessage.value = '小熊正在把耳朵借给你，请稍等一下。'
  helperMessage.value = '等一下，我们马上开始轻声唤醒森林。'

  try {
    await props.audio.ensureReady()
    await ensureAudioContext()
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    })
    micPermissionGranted.value = true
    analyser = audioContext!.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.84
    micSource = audioContext!.createMediaStreamSource(micStream)
    micSource.connect(analyser)
    analysisBuffer = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>
    phase.value = 'quiet'
    phaseStartedAt = performance.now()
    lastAnalysisAt = phaseStartedAt
    stageMessage.value = '嘘...森林还在睡觉，我们先安静 2 秒钟哦~'
    helperMessage.value = '这两秒先不说话，让森林听听夜晚有多安静。'
    noiseSamples.length = 0
    voiceSamples.length = 0
    analysisFrame = requestAnimationFrame(runAnalysis)
  } catch {
    phase.value = 'error'
    stageMessage.value = '小熊刚刚没有听到你的麦克风，我们稍后再试一次。'
    helperMessage.value = '点一下按钮重新开始就好，不用着急。'
    micPermissionGranted.value = false
    stopRuntime()
  }
}

function handlePrimaryAction() {
  if (props.paused) return
  if (phase.value === 'ready' || phase.value === 'finished' || phase.value === 'error') {
    resetForDifficulty()
    startMicrophoneSession().catch(() => {
      phase.value = 'error'
      stageMessage.value = '森林一时没有听到声音，我们等一下再试一次。'
      helperMessage.value = '点一下按钮重新开始就可以。'
    })
  }
}

onMounted(() => {
  pickTheme()
  resetForDifficulty()
  window.addEventListener('resize', resizeCanvas)
})

watch(() => props.difficulty, () => {
  resetForDifficulty()
})

watch(() => props.paused, (paused) => {
  if (paused) {
    stopRuntime()
    props.audio.stopAll()
  }
})

watch(() => props.settings.effectsEnabled, (enabled) => {
  if (!enabled) {
    stopPartyBed()
    props.audio.stopAll()
  } else if (phase.value === 'listening') {
    startPartyBed().catch(() => {
      // ignore
    })
  }
})

watch(() => props.settings.backgroundVolume, () => {
  if (phase.value === 'listening' && objective.value.usePartyBed) {
    stopPartyBed()
    startPartyBed().catch(() => {
      // ignore
    })
  }
})

onBeforeUnmount(() => {
  stopRuntime()
  props.audio.stopAll()
  window.removeEventListener('resize', resizeCanvas)
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {
      // ignore
    })
  }
})
</script>

<style scoped>
.voice-forest-game { position: relative; min-height: calc(100vh - 120px); overflow: hidden; }
.celebration-canvas { position: absolute; inset: 0; display: block; width: 100%; height: 100%; z-index: 30; pointer-events: none; }
.sky-layer, .forest-layer, .hud, .panel { position: relative; z-index: 2; }
.moon-glow, .moon { position: absolute; right: 12%; top: 12%; border-radius: 999px; }
.moon-glow { width: 180px; height: 180px; filter: blur(8px); }
.moon { width: 88px; height: 88px; background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), #ffe8a3 80%); box-shadow: 0 0 24px rgba(255,237,180,0.4); }
.star { position: absolute; border-radius: 999px; background: rgba(255,255,255,0.92); box-shadow: 0 0 8px rgba(255,255,255,0.5); animation: twinkle 2.8s ease-in-out infinite; }
.bulbs { position: absolute; left: 8%; right: 8%; top: 22%; display: flex; justify-content: space-between; gap: 10px; }
.bulbs::before { content: ''; position: absolute; left: 0; right: 0; top: 14px; height: 4px; border-radius: 999px; background: rgba(84,123,102,0.45); }
.bulb { position: relative; width: 16px; height: 30px; border-radius: 12px 12px 16px 16px; background: rgba(255,255,255,0.22); transition: all 0.28s ease; }
.bulb::before { content: ''; position: absolute; top: -9px; left: 50%; width: 4px; height: 10px; border-radius: 999px; transform: translateX(-50%); background: rgba(92,88,72,0.8); }
.bulb.lit { background: var(--bulb-color); box-shadow: 0 0 22px var(--bulb-color), 0 0 40px rgba(255,255,255,0.16); transform: translateY(-2px); }
.tree-row { position: absolute; left: 0; right: 0; bottom: 25%; display: flex; justify-content: space-around; }
.tree { position: relative; width: 92px; height: 180px; transform: scale(0.9); opacity: 0.82; }
.tree::before, .tree::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); border-radius: 999px; }
.tree::before { bottom: 0; width: 18px; height: 92px; background: #5a4334; }
.tree::after { bottom: 58px; width: 92px; height: 110px; background: radial-gradient(circle at 50% 35%, rgba(255,255,255,0.12), transparent 34%), linear-gradient(180deg, #4b8d5a 0%, #244d37 100%); }
.fireflies { position: absolute; inset: 12% 0 20% 0; pointer-events: none; }
.firefly { position: absolute; border-radius: 999px; background: radial-gradient(circle, rgba(255,244,158,1) 0%, rgba(255,244,158,0.15) 80%); box-shadow: 0 0 18px rgba(255,244,158,0.7); animation: floaty 3.6s ease-in-out infinite; }
.animals { position: absolute; left: 8%; right: 8%; bottom: 18%; display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 18px; }
.animal { position: relative; min-height: 176px; padding: 28px 18px 18px; border-radius: 28px; background: rgba(11,32,31,0.3); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); text-align: center; color: rgba(255,255,255,0.95); transition: all 0.3s ease; }
.animal.awake { transform: translateY(-6px); }
.animal.dancing { animation: sway 1.2s ease-in-out infinite; }
.animal.hiding .body { transform: translateY(32px) scale(0.9); opacity: 0.2; }
.hole { position: absolute; left: 50%; bottom: 22px; width: 72px; height: 20px; border-radius: 999px; transform: translateX(-50%); background: rgba(6,16,14,0.78); }
.body { position: relative; width: 84px; height: 84px; margin: 0 auto 12px; border-radius: 50%; background: linear-gradient(180deg, rgba(255,244,224,0.96), rgba(229,209,186,0.96)); transition: all 0.24s ease; }
.squirrel .body { background: linear-gradient(180deg, #f4d9b1, #c98f53); }
.bear .body { background: linear-gradient(180deg, #d9c2a1, #8a6b4f); }
.ears { position: absolute; top: -10px; left: 50%; width: 100%; transform: translateX(-50%); }
.ear { position: absolute; width: 22px; height: 32px; border-radius: 999px; background: inherit; }
.ear.left { left: 16px; }
.ear.right { right: 16px; }
.bear .ear { width: 22px; height: 22px; top: 2px; }
.face { position: absolute; inset: 0; }
.eye, .nose { position: absolute; border-radius: 999px; }
.eye { top: 34px; width: 10px; height: 10px; background: #21332b; }
.eye.left { left: 24px; } .eye.right { right: 24px; }
.nose { left: 50%; bottom: 22px; width: 16px; height: 12px; transform: translateX(-50%); background: #ff9aa2; }
.tail { position: absolute; top: 22px; right: -14px; width: 28px; height: 42px; border-radius: 18px 22px 22px 18px; background: linear-gradient(180deg, #e5ba86, #b36f3f); }
.animal strong { display: block; margin-bottom: 6px; font-size: 18px; }
.animal small { color: rgba(246,251,246,0.72); }
.hud { position: absolute; top: 96px; left: 24px; right: 24px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.hud-card { min-height: 78px; padding: 14px 16px; border-radius: 20px; background: rgba(255,255,255,0.14); color: #f4fff8; backdrop-filter: blur(8px); }
.hud-card span { display: block; margin-bottom: 8px; color: rgba(238,251,243,0.76); font-size: 13px; }
.hud-card strong { display: block; font-size: 20px; }
.panel { position: absolute; left: 24px; right: 24px; bottom: 24px; padding: 22px 24px; border-radius: 28px; background: rgba(255,255,255,0.16); backdrop-filter: blur(12px); box-shadow: 0 18px 36px rgba(9,30,30,0.2); }
.tags { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.tags span { padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.12); color: #eefbf3; font-size: 13px; font-weight: 700; }
.tags .accent { background: rgba(255,214,102,0.2); color: #fff2c4; }
.panel h2 { margin: 0 0 8px; color: #fff; font-size: 34px; }
.panel p, .panel small { display: block; color: #eefbf3; }
.panel p { margin: 0 0 6px; font-size: 18px; line-height: 1.6; }
.panel small { color: rgba(238,251,243,0.78); font-size: 14px; }
.meter, .progress { margin-top: 18px; }
.meter-labels { display: flex; justify-content: space-between; color: rgba(238,251,243,0.8); font-size: 13px; margin-bottom: 10px; }
.meter-track, .progress-track { position: relative; height: 16px; border-radius: 999px; background: rgba(15,30,29,0.42); overflow: hidden; }
.target-band { position: absolute; top: 0; bottom: 0; background: linear-gradient(90deg, rgba(255,226,126,0.78), rgba(247,255,168,0.82)); }
.meter-fill, .progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #98f5e1 0%, #ffe082 100%); }
.meter-pin { position: absolute; top: -5px; width: 18px; height: 26px; border-radius: 999px; transform: translateX(-50%); background: #fff; box-shadow: 0 0 14px rgba(255,255,255,0.6); }
.progress > span { display: block; margin-bottom: 10px; color: rgba(238,251,243,0.82); font-size: 14px; }
.primary-button { margin-top: 18px; min-width: 240px; min-height: 68px; padding: 0 28px; border: none; border-radius: 999px; background: linear-gradient(180deg, #ffe082 0%, #f7b84b 100%); color: #2b3125; font-size: 18px; font-weight: 800; cursor: pointer; box-shadow: 0 16px 28px rgba(32,29,5,0.22); }
.primary-button:disabled { opacity: 0.78; cursor: default; }
.badge-modal { position: absolute; left: 50%; top: 50%; z-index: 25; width: min(360px, calc(100% - 40px)); padding: 28px 24px; border-radius: 28px; transform: translate(-50%, -50%); text-align: center; color: #244032; background: rgba(255,250,224,0.96); box-shadow: 0 22px 46px rgba(28,43,28,0.24); }
.badge-icon { width: 88px; height: 88px; margin: 0 auto 16px; display: grid; place-items: center; border-radius: 999px; background: radial-gradient(circle, #fff7bf 0%, #ffd166 70%, #f3b537 100%); font-size: 42px; }
.badge-modal strong { display: block; margin-bottom: 10px; font-size: 28px; }
.badge-pop-enter-active, .badge-pop-leave-active { transition: all 0.28s ease; }
.badge-pop-enter-from, .badge-pop-leave-to { opacity: 0; transform: translate(-50%, -40%); }
@keyframes twinkle { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes sway { 0%,100% { transform: translateY(-6px) rotate(-2deg); } 50% { transform: translateY(-9px) rotate(2deg); } }
@media (max-width: 980px) {
  .voice-forest-game { min-height: calc(100vh - 92px); }
  .hud { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .animals { left: 12px; right: 12px; bottom: 30%; gap: 10px; }
  .animal { min-height: 146px; padding: 18px 12px 14px; }
  .body { width: 68px; height: 68px; }
  .panel { left: 12px; right: 12px; bottom: 12px; padding: 18px; }
  .panel h2 { font-size: 28px; }
  .panel p { font-size: 16px; }
  .primary-button { width: 100%; }
}
</style>
