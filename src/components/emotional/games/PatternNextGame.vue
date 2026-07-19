<template>
  <div class="pattern-next-game" :style="themeStyle">
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
        <span>首答命中</span>
        <strong>{{ firstTryCorrectCount }} 题</strong>
      </div>
      <div class="hud-card">
        <span>平均反应</span>
        <strong>{{ averageResponseLabel }}</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ roundLabel }} · {{ currentRound ? currentRound.typeLabel : '准备中' }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <div v-if="currentRound" class="sequence-stage">
          <svg
            class="sequence-strip"
            :viewBox="`0 0 ${sequenceWidth} 160`"
            preserveAspectRatio="xMidYMid meet"
          >
            <template v-for="(token, idx) in displaySequence" :key="idx">
              <g :transform="`translate(${idx * TOKEN_STEP + TOKEN_STEP / 2}, 80)`">
                <g v-if="token" :class="['seq-token', { lit: isReading && readIndex === idx }]" :transform="`scale(${token.size})`">
                  <circle v-if="token.shape === 'circle'" r="32" :fill="token.color" />
                  <rect v-else-if="token.shape === 'square'" x="-32" y="-32" width="64" height="64" rx="8" :fill="token.color" />
                  <polygon v-else-if="token.shape === 'triangle'" points="0,-38 34,26 -34,26" :fill="token.color" />
                  <polygon v-else points="0,-38 9,-12 36,-12 14,6 22,34 0,16 -22,34 -14,6 -36,-12 -9,-12" :fill="token.color" />
                </g>
                <g v-else>
                  <rect
                    x="-40" y="-40" width="80" height="80" rx="14"
                    fill="rgba(19,194,194,0.06)"
                    stroke="#13c2c2"
                    stroke-width="2"
                    stroke-dasharray="6 6"
                  />
                  <text x="0" y="16" text-anchor="middle" font-size="48" font-weight="700" fill="#13c2c2">?</text>
                </g>
              </g>
            </template>
          </svg>

          <div class="options-grid" :style="{ gridTemplateColumns: `repeat(${currentRound.options.length}, minmax(0, 1fr))` }">
            <button
              v-for="(option, idx) in currentRound.options"
              :key="idx"
              type="button"
              class="option-card"
              :class="getOptionClass(idx)"
              :disabled="!canSelect"
              @click="handleOptionPick(option, idx)"
            >
              <svg class="option-svg" viewBox="-50 -50 100 100">
                <g :transform="`scale(${option.size * 1.1})`">
                  <circle v-if="option.shape === 'circle'" r="32" :fill="option.color" />
                  <rect v-else-if="option.shape === 'square'" x="-32" y="-32" width="64" height="64" rx="8" :fill="option.color" />
                  <polygon v-else-if="option.shape === 'triangle'" points="0,-38 34,26 -34,26" :fill="option.color" />
                  <polygon v-else points="0,-38 9,-12 36,-12 14,6 22,34 0,16 -22,34 -14,6 -36,-12 -9,-12" :fill="option.color" />
                </g>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>认知发展</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>图形找规律</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ helperMessage }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>刚刚开始</span>
            <span>越来越会找规律</span>
            <span>本轮完成</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>本轮题量</strong>
            <span>{{ difficultyConfig.roundCount }} 题</span>
          </div>
          <div class="tip-card">
            <strong>候选数量</strong>
            <span>{{ difficultyConfig.optionCount }} 个选项</span>
          </div>
          <div class="tip-card">
            <strong>序列长度</strong>
            <span>{{ difficultyConfig.sequenceLength }} 个图形</span>
          </div>
          <div class="tip-card">
            <strong>当前提示</strong>
            <span>{{ currentAttemptLabel }}</span>
          </div>
        </div>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🔵</div>
        <strong>规律小侦探徽章</strong>
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

type Shape = 'circle' | 'square' | 'triangle' | 'star'
type SequenceType = 'AB' | 'ABB' | 'ABC' | 'PROGRESSIVE_SIZE' | 'COMPOUND'
type Dimension = 'shape' | 'color' | 'size'
type Phase = 'ready' | 'feedback' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'

interface Token {
  shape: Shape
  color: string
  size: number
}

interface DifficultyConfig {
  roundCount: number
  optionCount: number
  sequenceLength: number
  sequenceTypes: SequenceType[]
  dimensions: Dimension[]
  label: string
  shortLabel: string
  introText: string
  helperText: string
  successText: string
}

interface Round {
  type: SequenceType
  typeLabel: string
  full: (Token | null)[]
  blankPosition: number
  correct: Token
  options: Token[]
  dims: Dimension[]
}

const TOKEN_STEP = 120

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    roundCount: 4,
    optionCount: 2,
    sequenceLength: 5,
    sequenceTypes: ['AB'],
    dimensions: ['shape', 'color'],
    label: '简单 · 两种图形交替',
    shortLabel: '简单',
    introText: '看看这排图形是怎么排的，两种图形一个接一个轮流出现，猜猜空位上该放哪一个。',
    helperText: '简单模式只有两个候选，先看清前面的图形是按什么顺序轮流出现的。',
    successText: '你已经能稳稳看出两种图形交替的规律了，规律小侦探徽章亮起来了。',
  },
  2: {
    roundCount: 5,
    optionCount: 3,
    sequenceLength: 6,
    sequenceTypes: ['ABB', 'ABC'],
    dimensions: ['shape', 'color'],
    label: '中等 · 三段循环',
    shortLabel: '中等',
    introText: '这次可能是“两个一样的、换一个”或者“三个不一样的轮流”，要看清是哪一种再选。',
    helperText: '中等模式有三个候选，干扰项长得很像正确答案，先把规律读一遍再选。',
    successText: '你已经会分辨 ABB 和 ABC 两种循环了，看规律越来越准。',
  },
  3: {
    roundCount: 6,
    optionCount: 4,
    sequenceLength: 7,
    sequenceTypes: ['PROGRESSIVE_SIZE', 'COMPOUND'],
    dimensions: ['shape', 'color', 'size'],
    label: '困难 · 递进或复合',
    shortLabel: '困难',
    introText: '图形可能越变越大，也可能形状和颜色各自有自己的规律，要同时看几个方面。',
    helperText: '困难模式的空位可能在序列中间，先把空位前后都看一遍，再想规律。',
    successText: '你已经能看懂递进和复合规律了，今天的观察特别细致。',
  },
}

const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'star']
const PALETTE = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#9775fa', '#ff922b']
const SIZES = [0.5, 0.85, 1.15]
const TYPE_LABELS: Record<SequenceType, string> = {
  AB: '两种交替',
  ABB: '两同一换',
  ABC: '三段循环',
  PROGRESSIVE_SIZE: '大小递进',
  COMPOUND: '复合规律',
}

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

const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const rounds = ref<Round[]>([])
const roundIndex = ref(0)
const completedRounds = ref(0)
const firstTryCorrectCount = ref(0)
const wrongAttempts = ref(0)
const totalSelections = ref(0)
const currentRoundWrongAttempts = ref(0)
const responseTimesMs = ref<number[]>([])
const stageMessage = ref(DIFFICULTY_CONFIGS[1].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const isAnswered = ref(false)
const isReading = ref(false)
const readIndex = ref(-1)
const lastChosenIndex = ref<number | null>(null)
const showBadge = ref(false)

const trialFirstTry = ref<boolean[]>([])
const trialWrong = ref<number[]>([])
const trialResponseMs = ref<(number | null)[]>([])
const trialChosen = ref<Token[]>([])

let roundStartedAt = 0
let roundDirty = false
let readTimer = 0
let nextRoundTimer = 0
let badgeTimer = 0
let completeTimer = 0
let resetTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const currentRound = computed(() => rounds.value[roundIndex.value] || null)
const canSelect = computed(() => !props.paused && phase.value === 'ready' && !isAnswered.value && !isReading.value)
const sequenceWidth = computed(() => (currentRound.value ? currentRound.value.full.length * TOKEN_STEP : 0))
const displaySequence = computed(() => {
  const round = currentRound.value
  if (!round) {
    return [] as (Token | null)[]
  }

  return round.full.map((token, idx) =>
    idx === round.blankPosition && isAnswered.value ? round.correct : token,
  )
})
const roundLabel = computed(() => `第 ${Math.min(roundIndex.value + 1, difficultyConfig.value.roundCount)} 题`)
const progressLabel = computed(() => `${completedRounds.value} / ${difficultyConfig.value.roundCount}`)
const progressRatio = computed(() => {
  if (difficultyConfig.value.roundCount <= 0) {
    return 0
  }

  return Math.min(1, completedRounds.value / difficultyConfig.value.roundCount)
})
const panelDescription = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return difficultyConfig.value.introText
})
const averageResponseLabel = computed(() => {
  if (responseTimesMs.value.length === 0) {
    return '等待首题'
  }

  return `${(averageNumberList(responseTimesMs.value) / 1000).toFixed(1)} 秒`
})
const currentAttemptLabel = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '本轮已完成'
  }

  if (currentRoundWrongAttempts.value === 0) {
    return '本题首答中'
  }

  return `本题已重试 ${currentRoundWrongAttempts.value} 次`
})
const themeStyle = computed(() => ({
  '--pattern-accent': '#13c2c2',
}))

function averageNumberList(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
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

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function pickDifferent<T>(items: readonly T[], exclude: T): T {
  const rest = items.filter((item) => item !== exclude)
  return rest[Math.floor(Math.random() * rest.length)]!
}

function tokenKey(token: Token) {
  return `${token.shape}|${token.color}|${token.size}`
}

function mutateOne(token: Token): Token {
  const dim = pick<Dimension>(['shape', 'color', 'size'])
  if (dim === 'shape') {
    return { ...token, shape: pickDifferent(SHAPES, token.shape) }
  }

  if (dim === 'color') {
    return { ...token, color: pickDifferent(PALETTE, token.color) }
  }

  return { ...token, size: pickDifferent(SIZES, token.size) }
}

function buildSequence(type: SequenceType, length: number): Token[] {
  if (type === 'AB') {
    const shapeA = pick(SHAPES)
    const shapeB = pickDifferent(SHAPES, shapeA)
    const colorA = pick(PALETTE)
    const colorB = pickDifferent(PALETTE, colorA)
    return Array.from({ length }, (_, idx) =>
      idx % 2 === 0
        ? { shape: shapeA, color: colorA, size: 0.85 }
        : { shape: shapeB, color: colorB, size: 0.85 },
    )
  }

  if (type === 'ABB') {
    const shapeA = pick(SHAPES)
    const shapeB = pickDifferent(SHAPES, shapeA)
    const colorA = pick(PALETTE)
    const colorB = pickDifferent(PALETTE, colorA)
    const pattern: Token[] = [
      { shape: shapeA, color: colorA, size: 0.85 },
      { shape: shapeB, color: colorB, size: 0.85 },
      { shape: shapeB, color: colorB, size: 0.85 },
    ]
    return Array.from({ length }, (_, idx) => pattern[idx % 3]!)
  }

  if (type === 'ABC') {
    const shapes = shuffleArray(SHAPES).slice(0, 3) as Shape[]
    const colors = shuffleArray(PALETTE).slice(0, 3)
    return Array.from({ length }, (_, idx) => ({
      shape: shapes[idx % 3]!,
      color: colors[idx % 3]!,
      size: 0.85,
    }))
  }

  if (type === 'PROGRESSIVE_SIZE') {
    const shape = pick(SHAPES)
    const color = pick(PALETTE)
    return Array.from({ length }, (_, idx) => ({
      shape,
      color,
      size: SIZES[idx % 3]!,
    }))
  }

  // COMPOUND：形状按 AB 切换、颜色按 ABC 循环
  const shapeA = pick(SHAPES)
  const shapeB = pickDifferent(SHAPES, shapeA)
  const colors = shuffleArray(PALETTE).slice(0, 3)
  return Array.from({ length }, (_, idx) => ({
    shape: idx % 2 === 0 ? shapeA : shapeB,
    color: colors[idx % 3]!,
    size: 0.85,
  }))
}

function buildDistractors(correct: Token, count: number): Token[] {
  const result: Token[] = []
  const seen = new Set<string>([tokenKey(correct)])

  let guard = 0
  while (result.length < count && guard < 60) {
    guard += 1
    const candidate = mutateOne(correct)
    const key = tokenKey(candidate)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(candidate)
  }

  while (result.length < count) {
    const fallback: Token = { shape: pick(SHAPES), color: pick(PALETTE), size: pick(SIZES) }
    const key = tokenKey(fallback)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(fallback)
    }
  }

  return result
}

function buildRound(cfg: DifficultyConfig): Round {
  const type = cfg.sequenceTypes[Math.floor(Math.random() * cfg.sequenceTypes.length)]!
  const sequence = buildSequence(type, cfg.sequenceLength)
  const blankPosition =
    cfg.optionCount === 4 && Math.random() < 0.5
      ? 1 + Math.floor(Math.random() * (cfg.sequenceLength - 2))
      : cfg.sequenceLength - 1
  const correct = sequence[blankPosition]!
  const distractors = buildDistractors(correct, cfg.optionCount - 1)
  const options = shuffleArray([correct, ...distractors])
  const full: (Token | null)[] = sequence.map((token, idx) => (idx === blankPosition ? null : token))

  return {
    type,
    typeLabel: TYPE_LABELS[type],
    full,
    blankPosition,
    correct,
    options,
    dims: [...cfg.dimensions],
  }
}

function buildSessionRounds(cfg: DifficultyConfig): Round[] {
  return Array.from({ length: cfg.roundCount }, () => buildRound(cfg))
}

function clearTimer(timerId: number) {
  if (timerId) {
    window.clearTimeout(timerId)
  }
}

function clearAllTimers() {
  clearTimer(readTimer)
  clearTimer(nextRoundTimer)
  clearTimer(badgeTimer)
  clearTimer(completeTimer)
  clearTimer(resetTimer)
  readTimer = 0
  nextRoundTimer = 0
  badgeTimer = 0
  completeTimer = 0
  resetTimer = 0
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  props.markRoundDirty?.()
  roundDirty = true
}

function applyRoundState(nextRoundIndex: number) {
  const round = rounds.value[nextRoundIndex]
  if (!round) {
    return
  }

  roundIndex.value = nextRoundIndex
  isAnswered.value = false
  isReading.value = false
  readIndex.value = -1
  currentRoundWrongAttempts.value = 0
  lastChosenIndex.value = null
  statusTone.value = 'neutral'
  phase.value = 'ready'
  stageMessage.value = `空位上该放什么？先按规律读一遍这排图形。`
  helperMessage.value = difficultyConfig.value.helperText
  roundStartedAt = performance.now()
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  const cfg = DIFFICULTY_CONFIGS[difficulty]
  activeDifficulty.value = difficulty
  rounds.value = buildSessionRounds(cfg)
  roundIndex.value = 0
  completedRounds.value = 0
  firstTryCorrectCount.value = 0
  wrongAttempts.value = 0
  totalSelections.value = 0
  currentRoundWrongAttempts.value = 0
  responseTimesMs.value = []
  isAnswered.value = false
  isReading.value = false
  readIndex.value = -1
  lastChosenIndex.value = null
  showBadge.value = false
  trialFirstTry.value = new Array(cfg.roundCount).fill(false)
  trialWrong.value = new Array(cfg.roundCount).fill(0)
  trialResponseMs.value = new Array(cfg.roundCount).fill(null)
  trialChosen.value = []
  stageMessage.value = cfg.introText
  helperMessage.value = cfg.helperText
  statusTone.value = 'neutral'
  phase.value = 'ready'
  roundDirty = false
  props.audio.stopAmbient()

  if (rounds.value.length > 0) {
    applyRoundState(0)
  }
}

function readSequence() {
  const round = currentRound.value
  if (!round) {
    return
  }

  isReading.value = true
  readIndex.value = -1

  const advance = (idx: number) => {
    if (idx >= round.full.length) {
      isReading.value = false
      readIndex.value = -1
      afterRead()
      return
    }

    readIndex.value = idx
    readTimer = window.setTimeout(() => advance(idx + 1), 420)
  }

  advance(0)
}

function afterRead() {
  if (completedRounds.value >= difficultyConfig.value.roundCount) {
    finishSession()
    return
  }

  nextRoundTimer = window.setTimeout(() => {
    applyRoundState(roundIndex.value + 1)
  }, 420)
}

function serializeToken(token: Token) {
  return { shape: token.shape, color: token.color, size: token.size }
}

function buildPerformanceData() {
  const roundList = rounds.value
  return {
    paradigm: 'pattern_next',
    difficulty_level: activeDifficulty.value,
    completed_rounds: completedRounds.value,
    target_round_count: difficultyConfig.value.roundCount,
    option_count: difficultyConfig.value.optionCount,
    first_try_correct_count: firstTryCorrectCount.value,
    wrong_attempts: wrongAttempts.value,
    total_selections: totalSelections.value,
    accuracy_ratio: Number((completedRounds.value / Math.max(1, totalSelections.value)).toFixed(4)),
    average_response_ms: Math.round(averageNumberList(responseTimesMs.value)),
    response_times_ms: [...responseTimesMs.value],
    actual_params: {
      session_type: 'K03_PATTERN_NEXT',
      sequence_types: roundList.map((round) => round.type),
      sequence_lengths: roundList.map((round) => round.full.length),
      dimensions: roundList.map((round) => [...round.dims]),
      blank_positions: roundList.map((round) => round.blankPosition),
      trials: roundList.map((round, idx) => ({
        round: idx + 1,
        sequence_type: round.type,
        sequence_length: round.full.length,
        blank_position: round.blankPosition,
        dimensions: [...round.dims],
        option_count: round.options.length,
        first_try_correct: trialFirstTry.value[idx] ?? false,
        wrong_attempts: trialWrong.value[idx] ?? 0,
        response_ms: trialResponseMs.value[idx] ?? null,
        correct_token: serializeToken(round.correct),
        chosen_token: serializeToken(trialChosen.value[idx] ?? round.correct),
      })),
    },
  }
}

function finishSession() {
  phase.value = 'celebrating'
  statusTone.value = 'success'
  stageMessage.value = '全部答对啦，这一轮的规律都看明白啦。'
  helperMessage.value = difficultyConfig.value.successText
  props.audio.stopAmbient()

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('全部答对啦，每一排规律都看清楚了。')),
  ])

  badgeTimer = window.setTimeout(() => {
    showBadge.value = true
  }, 650)

  completeTimer = window.setTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_PATTERN_PRO',
        badgeName: '规律小侦探徽章',
      },
    })
    phase.value = 'finished'
  }, 1300)

  resetTimer = window.setTimeout(() => {
    if (!props.paused) {
      resetForDifficulty(activeDifficulty.value)
    }
  }, 3000)
}

function handleOptionPick(option: Token, idx: number) {
  if (!canSelect.value || !currentRound.value) {
    return
  }

  markRoundDirtyOnce()
  totalSelections.value += 1
  lastChosenIndex.value = idx

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore ambient failures
  })

  const round = currentRound.value
  if (tokenKey(option) !== tokenKey(round.correct)) {
    currentRoundWrongAttempts.value += 1
    wrongAttempts.value += 1
    statusTone.value = 'gentle'
    stageMessage.value = '再想一想：先看看前面的图形是按什么顺序排的。'
    helperMessage.value = '提示：从最左边的图形开始，一个接一个念出来，看看空位前面是什么。'
    props.audio.playSoftBounce().catch(() => {
      // ignore
    })
    return
  }

  if (currentRoundWrongAttempts.value === 0) {
    firstTryCorrectCount.value += 1
    trialFirstTry.value[roundIndex.value] = true
  }

  trialWrong.value[roundIndex.value] = currentRoundWrongAttempts.value
  trialChosen.value[roundIndex.value] = option
  const responseMs = Math.max(0, Math.round(performance.now() - roundStartedAt))
  trialResponseMs.value[roundIndex.value] = responseMs
  responseTimesMs.value = [...responseTimesMs.value, responseMs]

  completedRounds.value += 1
  isAnswered.value = true
  statusTone.value = 'success'
  phase.value = 'feedback'
  stageMessage.value = '答对啦！空位上的图形刚好接上规律。'
  helperMessage.value = '我们一起顺着把这一排规律再读一遍。'

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('答对啦，规律接上啦。')),
  ])

  readTimer = window.setTimeout(() => {
    readSequence()
  }, 360)
}

function getOptionClass(idx: number) {
  if (lastChosenIndex.value === null || lastChosenIndex.value !== idx) {
    return ''
  }

  const round = currentRound.value
  if (!round) {
    return ''
  }

  return tokenKey(round.options[idx]!) === tokenKey(round.correct)
    ? 'option-card--correct'
    : 'option-card--wrong'
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
    if (!paused && phase.value === 'ready') {
      props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
        // ignore ambient failures
      })
    }
  },
)

onMounted(() => {
  resetForDifficulty(props.difficulty)
  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore ambient failures
  })
})

onBeforeUnmount(() => {
  clearAllTimers()
  props.audio.stopAmbient()
})
</script>

<style scoped>
.pattern-next-game {
  position: relative;
  min-height: 100%;
  overflow: hidden;
  padding: 24px;
  color: #143845;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.5), transparent 36%),
    linear-gradient(180deg, #e6fbfa 0%, #f4fbff 56%, #fff7df 100%);
}

.hud-panel {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.hud-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 14px 30px rgba(19, 110, 124, 0.12);
}

.hud-card span {
  font-size: 13px;
  color: #5d8a93;
}

.hud-card strong {
  font-size: 20px;
  color: #0f5a64;
}

.stage-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.95fr);
  gap: 20px;
  min-height: calc(100vh - 240px);
}

.stage-panel,
.instruction-panel {
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 22px 44px rgba(20, 92, 104, 0.14);
  backdrop-filter: blur(12px);
}

.stage-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
}

.status-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(230, 251, 250, 0.96) 0%, rgba(255, 245, 222, 0.96) 100%);
}

.status-strip[data-tone='gentle'] {
  background: linear-gradient(135deg, #fff5d8 0%, #ffe7cf 100%);
}

.status-strip[data-tone='success'] {
  background: linear-gradient(135deg, #e0fbf5 0%, #eef6ff 100%);
}

.status-strip span {
  font-size: 13px;
  color: #4d8089;
}

.status-strip strong {
  font-size: 24px;
  line-height: 1.3;
  color: #0f5160;
}

.sequence-stage {
  display: grid;
  grid-template-rows: minmax(180px, auto) auto;
  gap: 20px;
  flex: 1;
}

.sequence-strip {
  width: 100%;
  height: 180px;
}

.seq-token {
  transition: transform 0.2s ease, filter 0.2s ease;
}

.seq-token.lit {
  transform-box: fill-box;
  transform-origin: center;
  filter: drop-shadow(0 6px 14px rgba(19, 194, 194, 0.55));
}

.options-grid {
  display: grid;
  gap: 14px;
}

.option-card {
  display: grid;
  place-items: center;
  padding: 14px;
  border: none;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14px 26px rgba(20, 110, 120, 0.12);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.option-card:not(:disabled):hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 32px rgba(20, 110, 120, 0.18);
}

.option-card:disabled {
  cursor: default;
}

.option-card--correct {
  background: linear-gradient(135deg, #d9fff3 0%, #f1fffb 100%);
  box-shadow: 0 18px 32px rgba(54, 207, 201, 0.28);
}

.option-card--wrong {
  background: linear-gradient(135deg, #fff1df 0%, #fff8f1 100%);
  box-shadow: 0 18px 32px rgba(255, 156, 95, 0.2);
}

.option-svg {
  width: 84px;
  height: 84px;
}

.instruction-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
}

.panel-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.panel-tags span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(230, 250, 250, 0.85);
  color: #3d7a84;
  font-size: 13px;
}

.panel-tags .accent {
  background: rgba(255, 255, 255, 0.92);
  color: var(--pattern-accent);
}

.instruction-panel h2 {
  margin: 0;
  font-size: 34px;
  color: #0f5160;
}

.instruction-panel p {
  margin: 0;
  font-size: 17px;
  line-height: 1.7;
  color: #2f6772;
}

.instruction-panel small {
  font-size: 14px;
  line-height: 1.7;
  color: #5d8a93;
}

.progress-block {
  display: grid;
  gap: 10px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #5d8a93;
}

.progress-track {
  position: relative;
  overflow: hidden;
  height: 14px;
  border-radius: 999px;
  background: rgba(207, 236, 236, 0.88);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--pattern-accent) 0%, #ffd666 100%);
  transition: width 0.28s ease;
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tip-card {
  display: grid;
  gap: 6px;
  min-height: 94px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(242, 252, 252, 0.92);
}

.tip-card strong {
  font-size: 14px;
  color: #3d7a84;
}

.tip-card span {
  font-size: 15px;
  line-height: 1.6;
  color: #143845;
}

.badge-modal {
  position: absolute;
  inset: auto 24px 24px auto;
  z-index: 2;
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(320px, calc(100% - 48px));
  padding: 20px 22px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 40px rgba(20, 92, 104, 0.2);
}

.badge-icon {
  font-size: 40px;
}

.badge-modal strong {
  font-size: 24px;
  color: #0f5160;
}

.badge-modal p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  text-align: center;
  color: #4d8089;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: all 0.24s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

@media (max-width: 1200px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }

  .instruction-panel {
    min-width: 0;
  }
}

@media (max-width: 820px) {
  .pattern-next-game {
    padding: 16px;
  }

  .hud-panel,
  .tip-grid {
    grid-template-columns: 1fr;
  }

  .instruction-panel h2 {
    font-size: 28px;
  }
}
</style>
