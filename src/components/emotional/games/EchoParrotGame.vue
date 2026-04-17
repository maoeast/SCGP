<template>
  <div class="echo-parrot-game" :style="rootStyle">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="glow-orb glow-orb--left"></div>
      <div class="glow-orb glow-orb--right"></div>
      <span
        v-for="ripple in ripples"
        :key="ripple.id"
        class="ripple-dot"
        :style="{
          left: `${ripple.left}%`,
          top: `${ripple.top}%`,
          width: `${ripple.size}px`,
          height: `${ripple.size}px`,
          animationDelay: `${ripple.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.shortLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>完成进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>首轮模仿</span>
        <strong>{{ firstTryRounds }} 轮</strong>
      </div>
      <div class="hud-card">
        <span>峰值音量</span>
        <strong>{{ roundedPeakDb }} dB</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="play-stage">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ theme.title }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <article v-if="currentPrompt" class="prompt-card">
          <div class="prompt-card__header">
            <div class="prompt-avatar">
              <span>{{ currentPrompt.animalEmoji }}</span>
            </div>
            <div class="prompt-copy">
              <span class="prompt-chip">
                {{ currentPromptIndex + 1 }} / {{ sessionPrompts.length }} · {{ currentPrompt.roleLabel }}
              </span>
              <strong>{{ currentPrompt.animalName }}</strong>
              <p>{{ currentPrompt.hint }}</p>
            </div>
          </div>

          <div class="tube-stage">
            <div class="tube-end">
              <span class="tube-end__emoji">{{ currentPrompt.animalEmoji }}</span>
              <small>小动物那边</small>
            </div>
            <div class="tube-line"></div>
            <div class="tube-end tube-end--player">
              <span class="tube-end__emoji">🗣️</span>
              <small>轮到你说</small>
            </div>
          </div>

          <div class="phrase-bubble" :data-phase="phase">
            <span>传声筒里的短句</span>
            <strong>{{ currentPrompt.phrase }}</strong>
            <small>{{ phaseBubbleText }}</small>
          </div>
        </article>

        <div class="meter-card">
          <div class="meter-card__header">
            <div>
              <span>当前音量</span>
              <strong>{{ roundedMeterDb }} dB</strong>
            </div>
            <div class="meter-card__meta">
              <span>阈值 {{ roundedThresholdDb }} dB</span>
              <span>本次连续发声 {{ currentVoiceLabel }}</span>
            </div>
          </div>

          <div class="meter-track">
            <span class="meter-threshold" :style="{ left: `${thresholdPercent}%` }"></span>
            <span class="meter-fill" :style="{ width: `${meterPercent}%` }"></span>
            <span class="meter-pin" :style="{ left: `${meterPercent}%` }"></span>
          </div>

          <div class="goal-progress">
            <div class="goal-progress__copy">
              <span>过关目标</span>
              <strong>{{ voiceGoalLabel }}</strong>
            </div>
            <div class="goal-progress__track">
              <div class="goal-progress__fill" :style="{ width: `${voiceGoalRatio}%` }"></div>
            </div>
          </div>
        </div>

        <div class="prompt-grid">
          <article
            v-for="(prompt, index) in sessionPrompts"
            :key="prompt.id"
            class="prompt-step"
            :class="{
              'prompt-step--done': prompt.completed,
              'prompt-step--current': index === currentPromptIndex,
            }"
          >
            <span>{{ prompt.animalEmoji }}</span>
            <strong>{{ prompt.phrase }}</strong>
            <small>{{ prompt.completed ? '已传到' : index === currentPromptIndex ? '当前短句' : '待轮到' }}</small>
          </article>
        </div>

        <div class="stage-footer">
          <div class="stage-footer__left">
            <strong>{{ footerHeadline }}</strong>
            <span>{{ helperMessage }}</span>
          </div>
          <div class="stage-footer__right">
            <span>模仿尝试 {{ voiceAttemptCount }} 次</span>
            <span>提示重播 {{ promptReplayCount }} 次</span>
            <span>短句重试 {{ shortAttempts }} 次</span>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>社交沟通</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>动物传声筒</h2>
        <p>{{ helperMessage }}</p>
        <small>{{ theme.badgeCopy }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>先认真听</span>
            <span>轮到你说</span>
            <span>全部传到</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progressRatio}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>目标轮数</strong>
            <span>{{ difficultyConfig.roundCount }} 轮</span>
          </div>
          <div class="tip-card">
            <strong>平均回应</strong>
            <span>{{ averageResponseLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>平均发声</strong>
            <span>{{ averageVoiceLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>当前提示</strong>
            <span>{{ currentPrompt ? currentPrompt.cheerLine : '准备开始' }}</span>
          </div>
        </div>

        <div class="focus-card">
          <strong>玩法提醒</strong>
          <p>{{ focusHint }}</p>
        </div>

        <div class="action-row">
          <button
            class="primary-action"
            type="button"
            :disabled="primaryActionDisabled"
            @click="handlePrimaryAction"
          >
            {{ primaryActionLabel }}
          </button>

          <button
            class="secondary-action"
            type="button"
            :disabled="replayDisabled"
            @click="handleReplayPrompt"
          >
            再听一次
          </button>
        </div>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🦜</div>
        <strong>传声小伙伴徽章</strong>
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

type Phase = 'ready' | 'calibrating' | 'prompting' | 'listening' | 'feedback' | 'celebrating' | 'finished' | 'error'
type StatusTone = 'neutral' | 'gentle' | 'success' | 'warning'

interface DifficultyConfig {
  roundCount: number
  voiceGoalMs: number
  silenceReplayMs: number
  label: string
  shortLabel: string
  introText: string
  helperText: string
  successText: string
}

interface ThemeDefinition {
  key: string
  title: string
  skyGradient: string
  panelGradient: string
  accent: string
  glow: string
  badgeCopy: string
}

interface PromptDefinition {
  id: string
  minDifficulty: EmotionGameDifficulty
  animalName: string
  animalEmoji: string
  roleLabel: string
  phrase: string
  hint: string
  cheerLine: string
}

interface SessionPrompt extends PromptDefinition {
  completed: boolean
}

interface RippleDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  settings: EmotionGameSettings
  paused: boolean
  audio: EmotionGameAudioController
  microphoneStream?: MediaStream | null
  markRoundDirty?: () => void
}>()

const emit = defineEmits<{
  (event: 'complete', payload: EmotionGameCompletionPayload): void
}>()

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    roundCount: 3,
    voiceGoalMs: 700,
    silenceReplayMs: 4200,
    label: '简单 · 单词模仿',
    shortLabel: '简单',
    introText: '先听动物朋友说一个短短的词，再轮到你对着传声筒模仿。',
    helperText: '简单模式只需要连续说够一小段时间，先把“听清楚再回应”练稳。',
    successText: '你已经能把短短的话稳稳传过去啦，动物朋友都听到了。',
  },
  2: {
    roundCount: 4,
    voiceGoalMs: 900,
    silenceReplayMs: 4000,
    label: '中等 · 短语模仿',
    shortLabel: '中等',
    introText: '这次会变成更长一点的小短语，听完后再对着麦克风模仿。',
    helperText: '中等模式要把声音稳一点、说得更完整，才能让对面的动物朋友听清楚。',
    successText: '你已经能把小短语清楚传到对面了，回应越来越稳。',
  },
  3: {
    roundCount: 5,
    voiceGoalMs: 1150,
    silenceReplayMs: 3600,
    label: '困难 · 句子模仿',
    shortLabel: '困难',
    introText: '这次要先认真听一句更完整的话，再把它一口气传回去。',
    helperText: '困难模式会给更长的句子，需要更稳定的持续发声和更快的回应。',
    successText: '你已经能把整句小提示都传过去啦，今天的传声筒非常可靠。',
  },
}

const THEMES: readonly ThemeDefinition[] = [
  {
    key: 'jungle-morning',
    title: '丛林晨风线',
    skyGradient: 'linear-gradient(135deg, #7ed3a5 0%, #7fc8ff 48%, #ffe08a 100%)',
    panelGradient: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(245,255,248,0.82))',
    accent: '#34a77a',
    glow: 'rgba(52, 167, 122, 0.24)',
    badgeCopy: '先听，再模仿，再把声音稳稳送过去。',
  },
  {
    key: 'sunset-aviary',
    title: '落日鸟语线',
    skyGradient: 'linear-gradient(135deg, #ffb67f 0%, #ff8ea5 46%, #84c9ff 100%)',
    panelGradient: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,244,245,0.84))',
    accent: '#f07961',
    glow: 'rgba(240, 121, 97, 0.22)',
    badgeCopy: '传声筒里先听到一句，再轮到你把它完整说回去。',
  },
  {
    key: 'reef-breeze',
    title: '海风回声线',
    skyGradient: 'linear-gradient(135deg, #76d9d3 0%, #7aa8ff 50%, #ffe09f 100%)',
    panelGradient: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(242,250,255,0.84))',
    accent: '#3f89d8',
    glow: 'rgba(63, 137, 216, 0.22)',
    badgeCopy: '听清短句，再把声音轻轻送进传声筒。',
  },
]

const PROMPT_LIBRARY: readonly PromptDefinition[] = [
  {
    id: 'parrot-hello',
    minDifficulty: 1,
    animalName: '鹦鹉老师',
    animalEmoji: '🦜',
    roleLabel: '打招呼回声',
    phrase: '你好，小伙伴',
    hint: '先听清楚“你好”，再轮到你轻轻说回去。',
    cheerLine: '鹦鹉老师听到了，刚才那句打招呼很清楚。',
  },
  {
    id: 'rabbit-play',
    minDifficulty: 1,
    animalName: '小兔传声员',
    animalEmoji: '🐰',
    roleLabel: '邀请回声',
    phrase: '一起玩球吧',
    hint: '听完小兔的话，再把邀请稳稳传回去。',
    cheerLine: '小兔已经听懂你的邀请啦。',
  },
  {
    id: 'bear-turn',
    minDifficulty: 1,
    animalName: '小熊守线员',
    animalEmoji: '🐻',
    roleLabel: '轮流回声',
    phrase: '轮到我说啦',
    hint: '模仿“轮到我说啦”，练习轮流表达。',
    cheerLine: '小熊听到了，你把轮流提示传对了。',
  },
  {
    id: 'duck-thanks',
    minDifficulty: 2,
    animalName: '小鸭接线员',
    animalEmoji: '🦆',
    roleLabel: '礼貌回声',
    phrase: '谢谢你帮我',
    hint: '这次是礼貌短语，听完后完整说回去。',
    cheerLine: '小鸭收到你的谢谢啦，声音很温和。',
  },
  {
    id: 'cat-share',
    minDifficulty: 2,
    animalName: '小猫传信员',
    animalEmoji: '🐱',
    roleLabel: '分享回声',
    phrase: '请把球给我',
    hint: '先听清“请把球给我”，再连起来说。',
    cheerLine: '小猫听清楚了，你把请求说完整了。',
  },
  {
    id: 'fox-group',
    minDifficulty: 2,
    animalName: '小狐狸回声官',
    animalEmoji: '🦊',
    roleLabel: '合作回声',
    phrase: '我们一起整理',
    hint: '这一句更长一点，要把前后都稳稳传回去。',
    cheerLine: '小狐狸已经知道要一起行动了。',
  },
  {
    id: 'koala-ready',
    minDifficulty: 3,
    animalName: '考拉站长',
    animalEmoji: '🐨',
    roleLabel: '准备回声',
    phrase: '我准备好了哦',
    hint: '困难模式需要更稳定地把一句完整的话传过去。',
    cheerLine: '考拉站长已经听到你准备好了。',
  },
  {
    id: 'deer-together',
    minDifficulty: 3,
    animalName: '小鹿引导员',
    animalEmoji: '🦌',
    roleLabel: '共同注意回声',
    phrase: '我们一起看这里',
    hint: '先听方向提示，再把整句完整地传回去。',
    cheerLine: '小鹿知道大家要一起看同一个地方了。',
  },
]

const ripples: readonly RippleDot[] = Array.from({ length: 18 }).map((_, index) => ({
  id: index + 1,
  left: (index * 17) % 100,
  top: (index * 29) % 76,
  size: 10 + (index % 4) * 4,
  delay: index * 0.34,
}))

const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const stageMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].helperText)
const theme = ref<ThemeDefinition>(THEMES[0] as ThemeDefinition)
const sessionPrompts = ref<SessionPrompt[]>([])
const currentPromptIndex = ref(0)
const meterPercent = ref(0)
const smoothedDbfs = ref(-100)
const noiseFloorDbfs = ref(-68)
const voiceThresholdDbfs = ref(-56)
const mappedPeakDb = ref(0)
const currentVoiceMs = ref(0)
const voiceAttemptCount = ref(0)
const shortAttempts = ref(0)
const promptReplayCount = ref(0)
const firstTryRounds = ref(0)
const completedRounds = ref(0)
const responseTimesMs = ref<number[]>([])
const voiceDurationsMs = ref<number[]>([])
const maxContinuousVoiceMs = ref(0)
const showBadge = ref(false)
const micPermissionGranted = ref(false)

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const currentPrompt = computed(() => sessionPrompts.value[currentPromptIndex.value] || null)
const progressRatio = computed(() => Math.round((completedRounds.value / Math.max(1, difficultyConfig.value.roundCount)) * 100))
const progressLabel = computed(() => `${completedRounds.value} / ${difficultyConfig.value.roundCount} 轮`)
const roundedMeterDb = computed(() => Math.round(meterPercent.value))
const roundedPeakDb = computed(() => Math.round(mappedPeakDb.value))
const roundedThresholdDb = computed(() => Math.round(mapDbfsToMeter(voiceThresholdDbfs.value)))
const thresholdPercent = computed(() => Math.max(0, Math.min(100, mapDbfsToMeter(voiceThresholdDbfs.value))))
const voiceGoalRatio = computed(() => Math.max(0, Math.min(100, (currentVoiceMs.value / Math.max(1, difficultyConfig.value.voiceGoalMs)) * 100)))
const voiceGoalLabel = computed(() => formatDurationLabel(difficultyConfig.value.voiceGoalMs))
const currentVoiceLabel = computed(() => formatDurationLabel(currentVoiceMs.value))
const averageResponseLabel = computed(() => responseTimesMs.value.length > 0 ? formatDurationLabel(averageNumberList(responseTimesMs.value)) : '未记录')
const averageVoiceLabel = computed(() => voiceDurationsMs.value.length > 0 ? formatDurationLabel(averageNumberList(voiceDurationsMs.value)) : '未记录')
const footerHeadline = computed(() => {
  if (phase.value === 'calibrating') return '先让传声筒听听周围有多安静'
  if (phase.value === 'prompting') return '动物朋友正在通过传声筒说话'
  if (phase.value === 'listening') return '现在轮到你模仿刚才那句话'
  if (phase.value === 'feedback') return currentPrompt.value?.cheerLine || '这轮提示已经完成'
  if (phase.value === 'celebrating') return '所有小动物都收到你的声音啦'
  if (phase.value === 'finished') return '这一轮动物传声筒已经完成'
  if (phase.value === 'error') return '麦克风刚刚没有把声音传过去'
  return '准备好后，先听再说'
})
const focusHint = computed(() => {
  if (phase.value === 'listening') {
    return `先想一想刚才听到的短句，再连续发声 ${voiceGoalLabel.value} 左右，小动物就会听懂。`
  }

  if (phase.value === 'prompting') {
    return '现在先认真听，不用抢着说，等短句播完再轮到你。'
  }

  return difficultyConfig.value.helperText
})
const phaseBubbleText = computed(() => {
  if (phase.value === 'prompting') return '先认真听一遍'
  if (phase.value === 'listening') return '现在轮到你模仿'
  if (phase.value === 'feedback') return '刚才这一句已经传出去了'
  if (phase.value === 'celebrating') return '所有短句都传到对面了'
  if (phase.value === 'error') return '请重新开始这一轮'
  return '按开始后会先播提示'
})
const primaryActionLabel = computed(() => {
  if (phase.value === 'calibrating') return '正在校准麦克风'
  if (phase.value === 'prompting') return '先认真听'
  if (phase.value === 'listening') return '轮到你说'
  if (phase.value === 'feedback') return '正在切换下一句'
  if (phase.value === 'celebrating') return '大家都听到了'
  if (phase.value === 'finished') return '再玩一轮'
  if (phase.value === 'error') return '重新开始'
  return '开始动物传声筒'
})
const primaryActionDisabled = computed(() => props.paused || ['calibrating', 'prompting', 'listening', 'feedback', 'celebrating'].includes(phase.value))
const replayDisabled = computed(() => props.paused || !currentPrompt.value || !['listening', 'feedback'].includes(phase.value))
const rootStyle = computed(() => ({
  background: theme.value.skyGradient,
  '--echo-accent': theme.value.accent,
  '--echo-panel': theme.value.panelGradient,
  '--echo-glow': theme.value.glow,
}) as Record<string, string>)

let lastThemeKey = ''
let analysisFrame = 0
let phaseStartedAt = 0
let roundStartedAt = 0
let lastAnalysisAt = 0
let currentRoundAttemptCount = 0
let roundDirty = false
let completed = false
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let micSource: MediaStreamAudioSourceNode | null = null
let micStream: MediaStream | null = null
let analysisBuffer: Float32Array<ArrayBuffer> | null = null
let noiseSamples: number[] = []
const scheduledTimers = new Set<number>()

function shuffleArray<T>(items: readonly T[]): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index] as T
    next[index] = next[swapIndex] as T
    next[swapIndex] = current
  }

  return next
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function averageNumberList(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function quantile(values: number[], q: number) {
  if (!values.length) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = clamp(Math.floor((sorted.length - 1) * q), 0, sorted.length - 1)
  return sorted[index] || 0
}

function formatDurationLabel(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '0 ms'
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)} 秒`
  }

  return `${Math.round(durationMs)} ms`
}

function estimatePromptDuration(text: string) {
  return Math.max(1500, 980 + text.length * 250)
}

function buildPromptSet(difficulty: EmotionGameDifficulty) {
  return shuffleArray(
    PROMPT_LIBRARY.filter((prompt) => prompt.minDifficulty <= difficulty),
  )
    .slice(0, DIFFICULTY_CONFIGS[difficulty].roundCount)
    .map<SessionPrompt>((prompt) => ({
      ...prompt,
      completed: false,
    }))
}

function pickTheme() {
  const candidates = THEMES.filter((item) => item.key !== lastThemeKey)
  const next = (candidates[Math.floor(Math.random() * candidates.length)] || THEMES[0]) as ThemeDefinition
  theme.value = next
  lastThemeKey = next.key
}

function scheduleTimeout(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    scheduledTimers.delete(timer)
    callback()
  }, delay)
  scheduledTimers.add(timer)
}

function clearScheduledTimers() {
  scheduledTimers.forEach((timer) => window.clearTimeout(timer))
  scheduledTimers.clear()
}

function stopLoops() {
  if (analysisFrame) {
    window.cancelAnimationFrame(analysisFrame)
  }
  analysisFrame = 0
}

function stopMicProcessing() {
  if (micStream && micStream !== props.microphoneStream) {
    micStream.getTracks().forEach((track) => track.stop())
  }
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

function stopRuntime() {
  clearScheduledTimers()
  stopLoops()
  stopMicProcessing()
}

async function ensureAudioContext() {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) {
    throw new Error('audio-context-unavailable')
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor()
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
}

function computeDbfs() {
  if (!analyser || !analysisBuffer) return -100

  analyser.getFloatTimeDomainData(analysisBuffer)
  let sum = 0

  for (const value of analysisBuffer) {
    sum += value * value
  }

  const rms = Math.sqrt(sum / analysisBuffer.length)
  if (!Number.isFinite(rms) || rms <= 0.000001) {
    return -100
  }

  return clamp(20 * Math.log10(rms), -100, 0)
}

function mapDbfsToMeter(dbfs: number) {
  const relative = dbfs - voiceThresholdDbfs.value
  return clamp(((relative + 12) / 24) * 100, 0, 100)
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  stopRuntime()
  props.audio.stopAll()
  activeDifficulty.value = difficulty
  pickTheme()
  sessionPrompts.value = buildPromptSet(difficulty)
  currentPromptIndex.value = 0
  phase.value = 'ready'
  statusTone.value = 'neutral'
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].introText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].helperText
  meterPercent.value = 0
  smoothedDbfs.value = -100
  noiseFloorDbfs.value = -68
  voiceThresholdDbfs.value = -56
  mappedPeakDb.value = 0
  currentVoiceMs.value = 0
  voiceAttemptCount.value = 0
  shortAttempts.value = 0
  promptReplayCount.value = 0
  firstTryRounds.value = 0
  completedRounds.value = 0
  responseTimesMs.value = []
  voiceDurationsMs.value = []
  maxContinuousVoiceMs.value = 0
  showBadge.value = false
  micPermissionGranted.value = false
  noiseSamples = []
  currentRoundAttemptCount = 0
  roundDirty = false
  completed = false
  phaseStartedAt = 0
  roundStartedAt = 0
  lastAnalysisAt = 0
}

function beginListening() {
  if (!currentPrompt.value) {
    return
  }

  phase.value = 'listening'
  statusTone.value = 'gentle'
  stageMessage.value = `轮到你啦，对着传声筒模仿：“${currentPrompt.value.phrase}”`
  helperMessage.value = `先听清，再稳稳说够 ${voiceGoalLabel.value} 左右。`
  currentVoiceMs.value = 0
  roundStartedAt = performance.now()
}

function playPrompt(isReplay: boolean) {
  if (!currentPrompt.value) {
    return
  }

  clearScheduledTimers()
  phase.value = 'prompting'
  statusTone.value = 'gentle'
  stageMessage.value = `${currentPrompt.value.animalName} 正在通过传声筒说：“${currentPrompt.value.phrase}”`
  helperMessage.value = isReplay
    ? '再认真听一遍，等短句播完再轮到你模仿。'
    : currentPrompt.value.hint
  currentVoiceMs.value = 0

  if (!isReplay && currentPromptIndex.value === 0) {
    markRoundDirtyOnce()
  }

  props.audio.speak(currentPrompt.value.phrase)
  scheduleTimeout(() => {
    beginListening()
  }, estimatePromptDuration(currentPrompt.value.phrase))
}

function queueReplayPrompt() {
  if (!currentPrompt.value) {
    return
  }

  promptReplayCount.value += 1
  phase.value = 'feedback'
  statusTone.value = 'warning'
  stageMessage.value = '我们先再听一次提示，然后马上继续。'
  helperMessage.value = '先听清短句，再轮到你对着麦克风模仿。'
  clearScheduledTimers()
  scheduleTimeout(() => {
    playPrompt(true)
  }, 420)
}

function moveToNextPrompt() {
  currentRoundAttemptCount = 0

  if (currentPromptIndex.value >= sessionPrompts.value.length - 1) {
    return
  }

  currentPromptIndex.value += 1
  playPrompt(false)
}

function buildPerformanceData() {
  return {
    completed_rounds: completedRounds.value,
    target_round_count: difficultyConfig.value.roundCount,
    first_try_rounds: firstTryRounds.value,
    short_attempts: shortAttempts.value,
    prompt_replays: promptReplayCount.value,
    voice_attempt_count: voiceAttemptCount.value,
    accuracy_ratio: Number((firstTryRounds.value / Math.max(1, difficultyConfig.value.roundCount)).toFixed(4)),
    response_times_ms: [...responseTimesMs.value],
    average_response_ms: Math.round(averageNumberList(responseTimesMs.value)),
    voice_durations_ms: [...voiceDurationsMs.value],
    average_voice_ms: Math.round(averageNumberList(voiceDurationsMs.value)),
    max_continuous_voice_ms: Math.round(maxContinuousVoiceMs.value),
    noise_floor_dbfs: Number(noiseFloorDbfs.value.toFixed(2)),
    voice_threshold_dbfs: Number(voiceThresholdDbfs.value.toFixed(2)),
    mapped_peak_db: Number(mappedPeakDb.value.toFixed(2)),
    mic_permission_granted: micPermissionGranted.value,
    target_phrase_ids: sessionPrompts.value.map((prompt) => prompt.id),
    target_phrase_labels: sessionPrompts.value.map((prompt) => prompt.phrase),
    completed_phrase_labels: sessionPrompts.value
      .filter((prompt) => prompt.completed)
      .map((prompt) => prompt.phrase),
    animal_labels: sessionPrompts.value.map((prompt) => `${prompt.animalEmoji} ${prompt.animalName}`),
    session_theme_key: theme.value.key,
    session_theme_title: theme.value.title,
  }
}

function finishSession() {
  if (completed) {
    return
  }

  completed = true
  phase.value = 'celebrating'
  statusTone.value = 'success'
  stageMessage.value = '所有小动物都收到你的声音啦。'
  helperMessage.value = difficultyConfig.value.successText
  currentVoiceMs.value = difficultyConfig.value.voiceGoalMs
  clearScheduledTimers()
  stopMicProcessing()
  props.audio.playSuccessCue().catch(() => {
    // ignore
  })
  props.audio.speak('所有小动物都听到了，谢谢你的传声筒。')

  scheduleTimeout(() => {
    showBadge.value = true
  }, 700)

  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_ECHO_BUDDY',
        badgeName: '传声小伙伴徽章',
      },
    })
    phase.value = 'finished'
  }, 1400)

  scheduleTimeout(() => {
    resetForDifficulty(activeDifficulty.value)
  }, 2800)
}

function handleRoundSuccess(durationMs: number) {
  if (!currentPrompt.value) {
    return
  }

  voiceAttemptCount.value += 1
  voiceDurationsMs.value = [...voiceDurationsMs.value, durationMs]
  maxContinuousVoiceMs.value = Math.max(maxContinuousVoiceMs.value, durationMs)
  completedRounds.value += 1
  responseTimesMs.value = [...responseTimesMs.value, Math.round(performance.now() - roundStartedAt)]

  if (currentRoundAttemptCount === 0) {
    firstTryRounds.value += 1
  }

  currentPrompt.value.completed = true
  phase.value = 'feedback'
  statusTone.value = 'success'
  stageMessage.value = `${currentPrompt.value.animalEmoji} ${currentPrompt.value.animalName} 听到了，你模仿得很像。`
  helperMessage.value = currentPrompt.value.cheerLine
  currentVoiceMs.value = durationMs
  props.audio.playSuccessCue().catch(() => {
    // ignore
  })

  clearScheduledTimers()
  scheduleTimeout(() => {
    if (currentPromptIndex.value >= sessionPrompts.value.length - 1) {
      finishSession()
      return
    }

    moveToNextPrompt()
  }, 900)
}

function handleShortAttempt(durationMs: number) {
  voiceAttemptCount.value += 1
  shortAttempts.value += 1
  currentRoundAttemptCount += 1
  voiceDurationsMs.value = [...voiceDurationsMs.value, durationMs]
  maxContinuousVoiceMs.value = Math.max(maxContinuousVoiceMs.value, durationMs)
  phase.value = 'feedback'
  statusTone.value = 'warning'
  stageMessage.value = '刚才已经有声音传过去了，再完整一点就能成功。'
  helperMessage.value = `这次持续了 ${formatDurationLabel(durationMs)}，再稳一点就更像刚才那句话。`
  props.audio.playSoftBounce().catch(() => {
    // ignore
  })
  queueReplayPrompt()
}

function finalizeAttempt() {
  const durationMs = Math.round(currentVoiceMs.value)
  currentVoiceMs.value = 0

  if (durationMs < 120 || phase.value !== 'listening') {
    return
  }

  if (durationMs >= difficultyConfig.value.voiceGoalMs) {
    handleRoundSuccess(durationMs)
    return
  }

  handleShortAttempt(durationMs)
}

function finishCalibration() {
  if (phase.value !== 'calibrating') {
    return
  }

  noiseFloorDbfs.value = clamp(quantile(noiseSamples, 0.62) || -68, -90, -28)
  voiceThresholdDbfs.value = clamp(noiseFloorDbfs.value + 8, -62, -26)
  meterPercent.value = 0
  playPrompt(false)
}

function runAnalysis(timestamp: number) {
  if (!analyser || !analysisBuffer) {
    return
  }

  const dbfs = computeDbfs()
  smoothedDbfs.value = smoothedDbfs.value < -95
    ? dbfs
    : smoothedDbfs.value + (dbfs - smoothedDbfs.value) * 0.18
  meterPercent.value = mapDbfsToMeter(smoothedDbfs.value)

  const deltaMs = lastAnalysisAt ? Math.min(120, timestamp - lastAnalysisAt) : 16
  lastAnalysisAt = timestamp

  if (props.paused) {
    analysisFrame = window.requestAnimationFrame(runAnalysis)
    return
  }

  if (phase.value === 'calibrating') {
    noiseSamples.push(smoothedDbfs.value)
    if (timestamp - phaseStartedAt >= 1100) {
      finishCalibration()
    }
  } else if (phase.value === 'listening') {
    const hasVoice = smoothedDbfs.value >= voiceThresholdDbfs.value

    if (hasVoice) {
      currentVoiceMs.value += deltaMs
      mappedPeakDb.value = Math.max(mappedPeakDb.value, meterPercent.value)
    } else if (currentVoiceMs.value > 0) {
      finalizeAttempt()
    }

    if (timestamp - roundStartedAt >= difficultyConfig.value.silenceReplayMs && currentVoiceMs.value === 0 && phase.value === 'listening') {
      queueReplayPrompt()
    }
  }

  analysisFrame = window.requestAnimationFrame(runAnalysis)
}

async function startMicrophoneSession() {
  if (!props.microphoneStream) {
    phase.value = 'error'
    statusTone.value = 'warning'
    stageMessage.value = '传声筒现在还没有接到麦克风。'
    helperMessage.value = '请返回训练列表后重新进入，让容器重新完成麦克风预检。'
    return
  }

  const activeTrack = props.microphoneStream.getAudioTracks().find((track) => track.readyState === 'live')
  if (!activeTrack) {
    phase.value = 'error'
    statusTone.value = 'warning'
    stageMessage.value = '麦克风刚刚断开了，小动物一时听不到。'
    helperMessage.value = '请返回训练列表重新进入，让系统重新检测麦克风。'
    return
  }

  try {
    await props.audio.ensureReady()
    await ensureAudioContext()
    stopMicProcessing()
    micStream = props.microphoneStream
    analyser = audioContext!.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.84
    micSource = audioContext!.createMediaStreamSource(micStream)
    micSource.connect(analyser)
    analysisBuffer = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>
    micPermissionGranted.value = true
    phase.value = 'calibrating'
    statusTone.value = 'gentle'
    stageMessage.value = '先安静一小会儿，让传声筒听听周围有多轻。'
    helperMessage.value = '先别说话，校准好以后就会开始第一句提示。'
    phaseStartedAt = performance.now()
    roundStartedAt = 0
    lastAnalysisAt = phaseStartedAt
    currentVoiceMs.value = 0
    meterPercent.value = 0
    noiseSamples = []
    analysisFrame = window.requestAnimationFrame(runAnalysis)
  } catch {
    phase.value = 'error'
    statusTone.value = 'warning'
    stageMessage.value = '这次没有成功接到麦克风，我们重新试一次。'
    helperMessage.value = '点一下重新开始就可以，不用着急。'
    micPermissionGranted.value = false
    stopRuntime()
  }
}

function handlePrimaryAction() {
  if (primaryActionDisabled.value) {
    return
  }

  resetForDifficulty(props.difficulty)
  startMicrophoneSession().catch(() => {
    phase.value = 'error'
    statusTone.value = 'warning'
    stageMessage.value = '传声筒一时没有准备好，我们等一下再试。'
    helperMessage.value = '点一下重新开始就可以。'
  })
}

function handleReplayPrompt() {
  if (replayDisabled.value) {
    return
  }

  queueReplayPrompt()
}

onMounted(() => {
  pickTheme()
  resetForDifficulty(props.difficulty)
})

watch(() => props.difficulty, (difficulty) => {
  resetForDifficulty(difficulty)
})

watch(() => props.microphoneStream, (stream) => {
  if (stream) {
    return
  }

  if (['calibrating', 'prompting', 'listening', 'feedback'].includes(phase.value)) {
    stopRuntime()
    phase.value = 'error'
    statusTone.value = 'warning'
    stageMessage.value = '麦克风连接刚刚中断了。'
    helperMessage.value = '请返回训练列表重新进入，再继续这一轮。'
  }
})

watch(() => props.settings.effectsEnabled, (enabled) => {
  if (!enabled) {
    props.audio.stopAll()
  }
})

onBeforeUnmount(() => {
  stopRuntime()
  props.audio.stopAll()

  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {
      // ignore
    })
  }
})
</script>

<style scoped>
.echo-parrot-game {
  position: relative;
  min-height: calc(100vh - 120px);
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
  border-radius: 999px;
  filter: blur(10px);
  background: var(--echo-glow);
}

.glow-orb--left {
  left: -80px;
  top: 10%;
}

.glow-orb--right {
  right: -60px;
  bottom: 16%;
}

.ripple-dot {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
  box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.08);
  animation: echoFloat 4.8s ease-in-out infinite;
}

.hud-panel {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 24px 24px 0;
}

.hud-card {
  min-height: 78px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.18);
  color: #12302a;
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 32px rgba(15, 48, 41, 0.1);
}

.hud-card span {
  display: block;
  margin-bottom: 8px;
  color: rgba(18, 48, 42, 0.7);
  font-size: 13px;
}

.hud-card strong {
  display: block;
  font-size: 22px;
}

.stage-layout {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.84fr);
  gap: 18px;
  padding: 20px 24px 24px;
}

.play-stage,
.instruction-panel {
  border-radius: 32px;
  background: var(--echo-panel);
  box-shadow: 0 24px 48px rgba(16, 42, 41, 0.12);
  backdrop-filter: blur(14px);
}

.play-stage {
  padding: 24px;
}

.instruction-panel {
  padding: 24px 22px;
}

.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 20px;
  color: #12302a;
  background: rgba(255, 255, 255, 0.68);
}

.status-strip span {
  color: rgba(18, 48, 42, 0.66);
  font-size: 13px;
  font-weight: 700;
}

.status-strip strong {
  font-size: 17px;
}

.status-strip[data-tone='success'] {
  background: rgba(214, 255, 226, 0.92);
}

.status-strip[data-tone='warning'] {
  background: rgba(255, 239, 214, 0.92);
}

.prompt-card {
  margin-top: 18px;
  padding: 24px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.prompt-card__header {
  display: flex;
  align-items: center;
  gap: 18px;
}

.prompt-avatar {
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border-radius: 24px;
  background: rgba(52, 167, 122, 0.14);
  font-size: 34px;
}

.prompt-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prompt-copy strong {
  color: #12302a;
  font-size: 28px;
}

.prompt-copy p {
  margin: 0;
  color: rgba(18, 48, 42, 0.72);
  line-height: 1.6;
}

.prompt-chip {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(52, 167, 122, 0.12);
  color: var(--echo-accent);
  font-size: 12px;
  font-weight: 700;
}

.tube-stage {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  margin-top: 24px;
}

.tube-end {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 108px;
  padding: 14px 12px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  color: #12302a;
}

.tube-end--player {
  background: rgba(52, 167, 122, 0.12);
}

.tube-end__emoji {
  font-size: 28px;
}

.tube-end small {
  color: rgba(18, 48, 42, 0.68);
}

.tube-line {
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(18, 48, 42, 0.18), rgba(52, 167, 122, 0.34), rgba(18, 48, 42, 0.18));
  overflow: hidden;
}

.tube-line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
  animation: echoSweep 2.2s linear infinite;
}

.phrase-bubble {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 22px;
  padding: 18px 20px;
  border-radius: 24px;
  color: #12302a;
  background: rgba(255, 255, 255, 0.72);
}

.phrase-bubble span,
.phrase-bubble small {
  color: rgba(18, 48, 42, 0.7);
}

.phrase-bubble strong {
  font-size: 28px;
  line-height: 1.3;
}

.phrase-bubble[data-phase='listening'] {
  background: rgba(219, 255, 232, 0.92);
}

.phrase-bubble[data-phase='prompting'] {
  background: rgba(235, 245, 255, 0.92);
}

.meter-card {
  margin-top: 18px;
  padding: 22px 24px;
  border-radius: 28px;
  background: rgba(18, 48, 42, 0.88);
  color: #f6fffb;
}

.meter-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.meter-card__header span {
  display: block;
  margin-bottom: 8px;
  color: rgba(246, 255, 251, 0.72);
  font-size: 13px;
}

.meter-card__header strong {
  font-size: 28px;
}

.meter-card__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(246, 255, 251, 0.76);
  text-align: right;
}

.meter-track {
  position: relative;
  height: 18px;
  margin-top: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.meter-threshold {
  position: absolute;
  top: -8px;
  bottom: -8px;
  width: 2px;
  background: rgba(255, 224, 138, 0.95);
  transform: translateX(-50%);
}

.meter-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #4ed7a1 0%, #8ce2ff 100%);
}

.meter-pin {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border: 3px solid #fff;
  border-radius: 999px;
  background: var(--echo-accent);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.12);
}

.goal-progress {
  margin-top: 18px;
}

.goal-progress__copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(246, 255, 251, 0.8);
}

.goal-progress__track {
  height: 12px;
  margin-top: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.goal-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffe08a 0%, #73e2b3 100%);
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.prompt-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  color: rgba(18, 48, 42, 0.82);
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.prompt-step span {
  font-size: 24px;
}

.prompt-step strong {
  color: #12302a;
  line-height: 1.5;
}

.prompt-step small {
  color: rgba(18, 48, 42, 0.62);
}

.prompt-step--current {
  transform: translateY(-3px);
  box-shadow: 0 16px 28px rgba(52, 167, 122, 0.14);
}

.prompt-step--done {
  background: rgba(221, 255, 232, 0.96);
}

.stage-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.74);
}

.stage-footer__left,
.stage-footer__right {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-footer__left strong {
  color: #12302a;
  font-size: 18px;
}

.stage-footer__left span,
.stage-footer__right span {
  color: rgba(18, 48, 42, 0.68);
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-tags span {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: #12302a;
  font-size: 13px;
  font-weight: 700;
}

.panel-tags .accent {
  background: rgba(52, 167, 122, 0.12);
  color: var(--echo-accent);
}

.instruction-panel h2 {
  margin: 18px 0 10px;
  color: #12302a;
  font-size: 34px;
}

.instruction-panel p,
.instruction-panel small {
  display: block;
  color: rgba(18, 48, 42, 0.76);
  line-height: 1.7;
}

.progress-block {
  margin-top: 20px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: rgba(18, 48, 42, 0.64);
  font-size: 13px;
}

.progress-track {
  height: 12px;
  margin-top: 10px;
  border-radius: 999px;
  background: rgba(18, 48, 42, 0.08);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--echo-accent) 0%, #8ce2ff 100%);
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.tip-card,
.focus-card {
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
}

.tip-card strong,
.focus-card strong {
  display: block;
  margin-bottom: 8px;
  color: #12302a;
  font-size: 15px;
}

.tip-card span,
.focus-card p {
  color: rgba(18, 48, 42, 0.72);
  line-height: 1.6;
}

.focus-card {
  margin-top: 18px;
}

.focus-card p {
  margin: 0;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

.primary-action,
.secondary-action {
  min-height: 52px;
  border: none;
  border-radius: 18px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.primary-action {
  color: #fff;
  background: linear-gradient(135deg, var(--echo-accent) 0%, #3fc0b0 100%);
  box-shadow: 0 16px 24px rgba(52, 167, 122, 0.2);
}

.secondary-action {
  color: #12302a;
  background: rgba(255, 255, 255, 0.84);
}

.primary-action:hover:not(:disabled),
.secondary-action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.primary-action:disabled,
.secondary-action:disabled {
  opacity: 0.56;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.badge-modal {
  position: fixed;
  left: 50%;
  bottom: 32px;
  z-index: 40;
  width: min(360px, calc(100vw - 32px));
  padding: 22px 24px;
  border-radius: 28px;
  text-align: center;
  color: #12302a;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 44px rgba(18, 48, 42, 0.16);
  transform: translateX(-50%);
}

.badge-icon {
  font-size: 40px;
}

.badge-modal strong {
  display: block;
  margin-top: 10px;
  font-size: 24px;
}

.badge-modal p {
  margin: 10px 0 0;
  color: rgba(18, 48, 42, 0.72);
  line-height: 1.6;
}

@keyframes echoFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-12px) scale(1.08);
    opacity: 0.72;
  }
}

@keyframes echoSweep {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 1200px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }

  .instruction-panel {
    order: -1;
  }
}

@media (max-width: 900px) {
  .hud-panel,
  .prompt-grid,
  .tip-grid,
  .action-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .hud-panel,
  .prompt-grid,
  .tip-grid,
  .action-row {
    grid-template-columns: 1fr;
  }

  .hud-panel,
  .stage-layout {
    padding-left: 16px;
    padding-right: 16px;
  }

  .play-stage,
  .instruction-panel {
    padding: 20px 18px;
  }

  .status-strip,
  .stage-footer,
  .meter-card__header,
  .prompt-card__header,
  .tube-stage {
    flex-direction: column;
    align-items: flex-start;
  }

  .phrase-bubble strong,
  .prompt-copy strong,
  .instruction-panel h2 {
    font-size: 24px;
  }
}
</style>
