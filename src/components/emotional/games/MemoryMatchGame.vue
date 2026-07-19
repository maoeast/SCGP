<template>
  <div class="memory-match-game" :style="themeStyle">
    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.shortLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>配对进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>翻牌步数</span>
        <strong>{{ totalMoves }} 步</strong>
      </div>
      <div class="hud-card">
        <span>首配命中</span>
        <strong>{{ firstTryPairs }} 对</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ statusLabel }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <div class="mem-board-wrap">
          <div class="mem-grid" :style="gridStyle">
            <button
              v-for="card in cards"
              :key="card.id"
              type="button"
              class="mem-card"
              :class="cardClass(card)"
              :disabled="!canFlipCard(card)"
              @click="onCardClick(card)"
            >
              <div class="mem-card-inner" :class="{ 'is-flipped': card.state !== 'hidden' }">
                <div class="mem-card-face mem-card-back" aria-hidden="true">
                  <svg viewBox="0 0 100 100" class="mem-back-svg">
                    <rect x="6" y="6" width="88" height="88" rx="18" fill="#13c2c2" />
                    <rect
                      x="16"
                      y="16"
                      width="68"
                      height="68"
                      rx="14"
                      fill="none"
                      stroke="rgba(255,255,255,0.6)"
                      stroke-width="2"
                      stroke-dasharray="4 6"
                    />
                    <circle cx="50" cy="50" r="15" fill="rgba(255,255,255,0.9)" />
                    <circle cx="50" cy="50" r="6" fill="#13c2c2" />
                  </svg>
                </div>
                <div class="mem-card-face mem-card-front">
                  <svg class="mem-token-svg" viewBox="-50 -50 100 100">
                    <circle v-if="card.token.shape === 'circle'" r="34" :fill="card.token.color" />
                    <rect
                      v-else-if="card.token.shape === 'square'"
                      x="-34"
                      y="-34"
                      width="68"
                      height="68"
                      rx="10"
                      :fill="card.token.color"
                    />
                    <polygon
                      v-else-if="card.token.shape === 'triangle'"
                      points="0,-40 36,28 -36,28"
                      :fill="card.token.color"
                    />
                    <polygon
                      v-else-if="card.token.shape === 'star'"
                      points="0,-40 9,-12 38,-12 15,7 23,38 0,18 -23,38 -15,7 -38,-12 -9,-12"
                      :fill="card.token.color"
                    />
                    <polygon
                      v-else-if="card.token.shape === 'hexagon'"
                      points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19"
                      :fill="card.token.color"
                    />
                    <polygon
                      v-else-if="card.token.shape === 'diamond'"
                      points="0,-40 34,0 0,40 -34,0"
                      :fill="card.token.color"
                    />
                    <polygon
                      v-else-if="card.token.shape === 'pentagon'"
                      points="0,-40 38,-12 24,32 -24,32 -38,-12"
                      :fill="card.token.color"
                    />
                    <path
                      v-else
                      :fill="card.token.color"
                      d="M0,30 C -22,14 -38,-2 -38,-16 C -38,-30 -26,-38 -16,-38 C -8,-38 -2,-32 0,-26 C 2,-32 8,-38 16,-38 C 26,-38 38,-30 38,-16 C 38,-2 22,14 0,30 Z"
                    />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>认知发展</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>记忆翻牌</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ helperMessage }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>刚翻开</span>
            <span>越配越快</span>
            <span>全部配对</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>网格大小</strong>
            <span>{{ gridLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>配对数量</strong>
            <span>{{ difficultyConfig.pairCount }} 对</span>
          </div>
          <div class="tip-card">
            <strong>翻错处理</strong>
            <span>{{ flipBackLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>相似干扰</strong>
            <span>{{ distractorLabel }}</span>
          </div>
        </div>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🃏</div>
        <strong>记忆小达人徽章</strong>
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

type Shape = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'hexagon' | 'diamond' | 'pentagon'
type CardState = 'hidden' | 'revealed' | 'matched'
type Phase = 'ready' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'
// 预留：'webp' 物品认知模式（认知器材缩略图做卡面）后续接入；v1 只实现 'svg' 分支
type CardFrontMode = 'svg' | 'webp'

interface CardToken {
  shape: Shape
  color: string
  pattern: 'solid' | 'stripe' | 'dot'
}

interface Card {
  id: number
  pairId: number
  token: CardToken
  state: CardState
}

interface PairTrial {
  pairId: number
  firstFlipMove: number | null
  matchedMove: number | null
  flipAttempts: number
  firstFlipAtMs: number | null
  matchedAtMs: number | null
}

interface DifficultyConfig {
  gridCols: number
  gridRows: number
  pairCount: number
  flipBackOnMismatch: boolean
  flipBackDelayMs: number
  useSimilarDistractors: boolean
  label: string
  shortLabel: string
  introText: string
  helperText: string
  successText: string
  mismatchHint: string
}

// 卡面正面渲染模式：v1 写死纯 SVG，webp 物品认知模式留作后续开关
const CARD_FRONT_MODE: CardFrontMode = 'svg'

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    gridCols: 2,
    gridRows: 2,
    pairCount: 2,
    flipBackOnMismatch: false,
    flipBackDelayMs: 0,
    useSimilarDistractors: false,
    label: '简单 · 2 对翻牌（翻错不翻回）',
    shortLabel: '简单',
    introText: '翻开两张卡片，找出一模一样的好朋友。简单模式翻错不会翻回去，慢慢看清就好。',
    helperText: '先随便翻两张看看，记住它们的位置和图案，再继续翻下一张。',
    successText: '你已经稳稳记住卡片的位置，记忆小达人徽章亮起来啦。',
    mismatchHint: '没关系，简单模式里卡片不会翻回去，继续找一样的好朋友。',
  },
  2: {
    gridCols: 4,
    gridRows: 3,
    pairCount: 6,
    flipBackOnMismatch: true,
    flipBackDelayMs: 1200,
    useSimilarDistractors: false,
    label: '中等 · 6 对翻牌（翻错会翻回）',
    shortLabel: '中等',
    introText: '这次有 6 对卡片，翻错会翻回去，要先记住刚才翻开的位置和图案。',
    helperText: '一次只能翻开两张，翻错后会翻回去，专心记住刚刚看到的样子。',
    successText: '你已经能记住越来越多的位置，配对越来越快。',
    mismatchHint: '再想一想，记住刚刚翻开的是哪两张、在哪个位置。',
  },
  3: {
    gridCols: 4,
    gridRows: 4,
    pairCount: 8,
    flipBackOnMismatch: true,
    flipBackDelayMs: 1200,
    useSimilarDistractors: true,
    label: '困难 · 8 对翻牌（相似干扰）',
    shortLabel: '困难',
    introText: '8 对卡片里有些长得特别像（同样形状不同颜色），要仔细分辨，用更少的步数配对。',
    helperText: '困难模式里会有很像的卡片，看清楚颜色和形状的细节再配对。',
    successText: '你已经能在很像的卡片里精准配对，观察力特别棒。',
    mismatchHint: '这两张有点像但不一样，再仔细看看颜色和形状的小细节。',
  },
}

const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'star', 'heart', 'hexagon', 'diamond', 'pentagon']
const PALETTE = ['#ff6b6b', '#4dabf7', '#51cf66', '#fcc419', '#9775fa', '#ff922b', '#22c55e', '#ec4899']

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
const cards = ref<Card[]>([])
const boardTokens = ref<CardToken[]>([])
const pairTrials = ref<PairTrial[]>([])
const mismatchIds = ref<number[]>([])
const matchedPairCount = ref(0)
const totalMoves = ref(0)
const mismatchCount = ref(0)
const firstTryPairs = ref(0)
const responseTimesMs = ref<number[]>([])
const stageMessage = ref(DIFFICULTY_CONFIGS[1].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const showBadge = ref(false)

const isLocked = ref(false)
let boardDirty = false
let moveCounter = 0
let flipBackTimer = 0
let badgeTimer = 0
let completeTimer = 0
let resetTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const canFlip = computed(() => !props.paused && phase.value === 'ready' && !isLocked.value)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${difficultyConfig.value.gridCols}, minmax(0, 1fr))`,
}))
const gridLabel = computed(() => `${difficultyConfig.value.gridCols} × ${difficultyConfig.value.gridRows}`)
const progressLabel = computed(() => `${matchedPairCount.value} / ${difficultyConfig.value.pairCount}`)
const progressRatio = computed(() => {
  if (difficultyConfig.value.pairCount <= 0) {
    return 0
  }

  return Math.min(1, matchedPairCount.value / difficultyConfig.value.pairCount)
})
const statusLabel = computed(
  () => `${difficultyConfig.value.shortLabel} · 配对 ${matchedPairCount.value}/${difficultyConfig.value.pairCount}`,
)
const panelDescription = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return difficultyConfig.value.introText
})
const flipBackLabel = computed(() => (difficultyConfig.value.flipBackOnMismatch ? '翻错会翻回' : '翻错不翻回'))
const distractorLabel = computed(() => (difficultyConfig.value.useSimilarDistractors ? '有相似干扰' : '无相似干扰'))
const themeStyle = computed(() => ({
  '--mem-accent': '#13c2c2',
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

// 生成 pairCount 个唯一可分辨 token：非相似档用「形状×颜色各异」，相似档用「少量形状 × 2 近色」造近似干扰
function buildTokens(pairCount: number, useSimilar: boolean): CardToken[] {
  if (useSimilar) {
    const shapeCount = Math.max(2, Math.ceil(pairCount / 2))
    const shapes = shuffleArray(SHAPES).slice(0, shapeCount)
    const colors = shuffleArray(PALETTE).slice(0, 2)
    const tokens: CardToken[] = []
    for (let s = 0; s < shapeCount && tokens.length < pairCount; s += 1) {
      for (let c = 0; c < colors.length && tokens.length < pairCount; c += 1) {
        const shape = shapes[s]!
        const color = colors[c]!
        tokens.push({ shape, color, pattern: 'solid' })
      }
    }

    return tokens
  }

  const shapes = shuffleArray(SHAPES).slice(0, pairCount)
  const colors = shuffleArray(PALETTE).slice(0, pairCount)
  return shapes.map((shape, i) => ({ shape, color: colors[i]!, pattern: 'solid' as const }))
}

function buildBoard(cfg: DifficultyConfig): Card[] {
  const tokens = buildTokens(cfg.pairCount, cfg.useSimilarDistractors)
  boardTokens.value = tokens
  const board: Card[] = []
  tokens.forEach((token, pairId) => {
    board.push({ id: pairId * 2, pairId, token, state: 'hidden' })
    board.push({ id: pairId * 2 + 1, pairId, token, state: 'hidden' })
  })

  return shuffleArray(board)
}

function clearTimer(timerId: number) {
  if (timerId) {
    window.clearTimeout(timerId)
  }
}

function clearAllTimers() {
  clearTimer(flipBackTimer)
  clearTimer(badgeTimer)
  clearTimer(completeTimer)
  clearTimer(resetTimer)
  flipBackTimer = 0
  badgeTimer = 0
  completeTimer = 0
  resetTimer = 0
}

function markBoardDirtyOnce() {
  if (boardDirty) {
    return
  }

  props.markRoundDirty?.()
  boardDirty = true
}

function resetBoard(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  const cfg = DIFFICULTY_CONFIGS[difficulty]
  activeDifficulty.value = difficulty
  cards.value = buildBoard(cfg)
  pairTrials.value = Array.from({ length: cfg.pairCount }, (_, pairId) => ({
    pairId,
    firstFlipMove: null,
    matchedMove: null,
    flipAttempts: 0,
    firstFlipAtMs: null,
    matchedAtMs: null,
  }))
  mismatchIds.value = []
  matchedPairCount.value = 0
  totalMoves.value = 0
  mismatchCount.value = 0
  firstTryPairs.value = 0
  responseTimesMs.value = []
  stageMessage.value = cfg.introText
  helperMessage.value = cfg.helperText
  statusTone.value = 'neutral'
  phase.value = 'ready'
  isLocked.value = false
  boardDirty = false
  moveCounter = 0
  props.audio.stopAmbient()
}

function canFlipCard(card: Card) {
  return card.state === 'hidden' && canFlip.value
}

function cardClass(card: Card) {
  return {
    'is-matched': card.state === 'matched',
    'is-revealed': card.state === 'revealed',
    'is-mismatch': mismatchIds.value.includes(card.id),
  }
}

// 任两张同 pairId 的 revealed 卡同时翻开即配对：L1（不翻回）跨多步累积也会在此点亮
function resolveMatches() {
  const revealed = cards.value.filter((c) => c.state === 'revealed')
  const byPair = new Map<number, Card[]>()
  revealed.forEach((c) => {
    const arr = byPair.get(c.pairId) ?? []
    arr.push(c)
    byPair.set(c.pairId, arr)
  })

  if (byPair.size === 0) {
    return
  }

  const now = performance.now()
  const move = moveCounter
  let matched = false

  byPair.forEach((arr, pairId) => {
    if (arr.length !== 2) {
      return
    }

    arr.forEach((c) => {
      c.state = 'matched'
    })
    matchedPairCount.value += 1

    const trial = pairTrials.value[pairId]
    if (trial) {
      trial.matchedMove = move
      trial.matchedAtMs = now
      const firstFlip = trial.firstFlipMove
      // 首配命中 = 配对完成的这一步紧接该对首次翻开（中间无其它翻牌），跨 L1/L2/L3 统一口径
      if (firstFlip !== null && move - firstFlip === 1) {
        firstTryPairs.value += 1
      }
      if (trial.firstFlipAtMs !== null) {
        responseTimesMs.value = [...responseTimesMs.value, Math.max(0, Math.round(now - trial.firstFlipAtMs))]
      }
    }

    matched = true
  })

  if (matched) {
    mismatchIds.value = []
    statusTone.value = 'success'
    stageMessage.value = '配对啦！这两张是一对好朋友。'
    helperMessage.value = difficultyConfig.value.helperText
    Promise.allSettled([
      props.audio.playSuccessCue(),
      Promise.resolve().then(() => props.audio.speak('配对啦。')),
    ])
  }
}

function onCardClick(card: Card) {
  if (!canFlipCard(card)) {
    return
  }

  markBoardDirtyOnce()
  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore ambient failures
  })

  moveCounter += 1
  totalMoves.value = moveCounter
  card.state = 'revealed'

  const trial = pairTrials.value[card.pairId]
  if (trial) {
    trial.flipAttempts += 1
    if (trial.firstFlipMove === null) {
      trial.firstFlipMove = moveCounter
    }
    if (trial.firstFlipAtMs === null) {
      trial.firstFlipAtMs = performance.now()
    }
  }

  resolveMatches()

  // L2/L3：两张 revealed 未配 → 锁定 + 延迟翻回；L1（flipBackOnMismatch=false）跳过，revealed 累积
  const cfg = difficultyConfig.value
  const pending = cards.value.filter((c) => c.state === 'revealed')
  if (cfg.flipBackOnMismatch && pending.length >= 2) {
    isLocked.value = true
    mismatchCount.value += 1
    statusTone.value = 'gentle'
    stageMessage.value = cfg.mismatchHint
    helperMessage.value = cfg.helperText
    mismatchIds.value = pending.map((c) => c.id)
    props.audio.playSoftBounce().catch(() => {
      // ignore
    })

    flipBackTimer = window.setTimeout(() => {
      pending.forEach((c) => {
        if (c.state === 'revealed') {
          c.state = 'hidden'
        }
      })
      mismatchIds.value = []
      isLocked.value = false
      if (phase.value === 'ready') {
        statusTone.value = 'neutral'
        stageMessage.value = '继续翻开两张卡片，找一样的好朋友。'
      }
    }, cfg.flipBackDelayMs)
  }

  if (matchedPairCount.value >= cfg.pairCount) {
    finishSession()
  }
}

function serializeToken(token: CardToken) {
  return { shape: token.shape, color: token.color, pattern: token.pattern }
}

function buildPerformanceData() {
  const cfg = difficultyConfig.value
  const trials = pairTrials.value
  const targetPairCount = cfg.pairCount
  const firstTry = firstTryPairs.value

  return {
    paradigm: 'memory_match',
    difficulty_level: activeDifficulty.value,
    matched_pairs: matchedPairCount.value,
    target_pair_count: targetPairCount,
    total_moves: totalMoves.value,
    mismatch_count: mismatchCount.value,
    first_try_pairs: firstTry,
    accuracy_ratio: targetPairCount > 0 ? Number((firstTry / targetPairCount).toFixed(4)) : 0,
    average_response_ms: Math.round(averageNumberList(responseTimesMs.value)),
    response_times_ms: [...responseTimesMs.value],
    actual_params: {
      session_type: 'K01_MEMORY_MATCH',
      grid_size: `${cfg.gridCols}x${cfg.gridRows}`,
      pair_count: cfg.pairCount,
      flip_back_on_mismatch: cfg.flipBackOnMismatch,
      flip_back_delay_ms: cfg.flipBackDelayMs,
      use_similar_distractors: cfg.useSimilarDistractors,
      card_front_mode: CARD_FRONT_MODE,
      trials: trials.map((trial, idx) => {
        const firstTryCorrect =
          trial.firstFlipMove !== null && trial.matchedMove !== null && trial.matchedMove - trial.firstFlipMove === 1
        const responseMs =
          trial.firstFlipAtMs !== null && trial.matchedAtMs !== null
            ? Math.max(0, Math.round(trial.matchedAtMs - trial.firstFlipAtMs))
            : null
        return {
          pair: idx + 1,
          pair_id: trial.pairId,
          first_try_correct: firstTryCorrect,
          flip_attempts: trial.flipAttempts,
          response_ms: responseMs,
          token: serializeToken(boardTokens.value[trial.pairId] ?? { shape: 'circle', color: '#13c2c2', pattern: 'solid' }),
        }
      }),
    },
  }
}

function finishSession() {
  phase.value = 'celebrating'
  statusTone.value = 'success'
  stageMessage.value = '全部配对完成，记忆小达人就是你！'
  helperMessage.value = difficultyConfig.value.successText
  props.audio.stopAmbient()

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('全部配对完成啦，每一对好朋友都找到啦。')),
  ])

  badgeTimer = window.setTimeout(() => {
    showBadge.value = true
  }, 650)

  completeTimer = window.setTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_MEMORY_MASTER',
        badgeName: '记忆小达人徽章',
      },
    })
    phase.value = 'finished'
  }, 1300)

  resetTimer = window.setTimeout(() => {
    if (!props.paused) {
      resetBoard(activeDifficulty.value)
    }
  }, 3000)
}

watch(
  () => props.difficulty,
  (difficulty) => {
    resetBoard(difficulty)
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
  resetBoard(props.difficulty)
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
.memory-match-game {
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

.mem-board-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
}

.mem-grid {
  display: grid;
  width: 100%;
  max-width: 620px;
  gap: 12px;
  margin: 0 auto;
}

.mem-card {
  aspect-ratio: 3 / 4;
  min-width: 72px;
  min-height: 96px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  perspective: 700px;
}

.mem-card:disabled {
  cursor: default;
}

.mem-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.35s ease;
}

.mem-card-inner.is-flipped {
  transform: rotateY(180deg);
}

.mem-card-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 16px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 10px 22px rgba(20, 92, 104, 0.16);
}

.mem-card-back {
  background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%);
}

.mem-back-svg {
  width: 100%;
  height: 100%;
  border-radius: 16px;
}

.mem-card-front {
  transform: rotateY(180deg);
  background: rgba(255, 255, 255, 0.96);
}

.mem-token-svg {
  width: 72%;
  height: 72%;
}

.mem-card.is-matched .mem-card-front {
  box-shadow: 0 0 0 3px #ffd666, 0 14px 28px rgba(255, 214, 102, 0.45);
}

.mem-card.is-mismatch .mem-card-inner {
  animation: mem-shake 0.4s ease;
}

@keyframes mem-shake {
  0%,
  100% {
    transform: rotateY(180deg) translateX(0);
  }

  25% {
    transform: rotateY(180deg) translateX(-6px);
  }

  75% {
    transform: rotateY(180deg) translateX(6px);
  }
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
  color: var(--mem-accent);
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
  background: linear-gradient(90deg, var(--mem-accent) 0%, #ffd666 100%);
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
  .memory-match-game {
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
