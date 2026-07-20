<template>
  <div class="number-sense-game" :style="themeStyle">
    <!-- HUD -->
    <div class="hud-panel">
      <div class="hud-card"><span>当前难度</span><strong>{{ difficultyConfig.shortLabel }}</strong></div>
      <div class="hud-card"><span>已完成</span><strong>{{ completedRounds }} / {{ difficultyConfig.roundCount }}</strong></div>
      <div class="hud-card"><span>首答命中</span><strong>{{ firstTryCorrectCount }} 题</strong></div>
      <!-- 模式切换：做进游戏内，切换时重置牌局 -->
      <div class="mode-toggle">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: activeMode === 'count' }"
          @click="switchMode('count')"
        >按数取物</button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: activeMode === 'compare' }"
          @click="switchMode('compare')"
        >多少比较</button>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <!-- 状态条 -->
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ statusLabel }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <!-- 模式 A：按数取物 -->
        <template v-if="activeMode === 'count' && countRound">
          <!-- 目标数字 / L3 增减指令 -->
          <div class="target-display">
            <template v-if="countPhase === 'base'">
              <span class="target-hint">请取</span>
              <span class="target-number">{{ countRound.targetNumber }}</span>
              <span class="target-hint">个{{ countRound.skin.label }}放进小筐</span>
            </template>
            <template v-else>
              <span class="target-hint">
                {{ countRound.adjust!.op === 'add' ? '再放' : '拿走' }}
              </span>
              <span class="target-number">{{ countRound.adjust!.amount }}</span>
              <span class="target-hint">
                个{{ countRound.skin.label }}
                （筐里要有 {{ countRound.adjust!.finalNumber }} 个）
              </span>
            </template>
          </div>

          <!-- 物品池：纯点选 -->
          <div class="item-pool">
            <button
              v-for="(item, idx) in poolItems"
              :key="idx"
              type="button"
              class="pool-item"
              :class="{ 'item--used': item.used, 'item--bounce': item.bouncing }"
              :disabled="phase !== 'playing'"
              @click="onPoolItemClick(idx)"
            >
              <svg class="item-svg" viewBox="0 0 80 80">
                <!-- 星星 -->
                <polygon
                  v-if="countRound.skin.kind === 'star'"
                  points="40,8 47,29 70,29 52,43 58,64 40,51 22,64 28,43 10,29 33,29"
                  :fill="countRound.skin.color"
                />
                <!-- 苹果 -->
                <g v-else-if="countRound.skin.kind === 'apple'">
                  <ellipse cx="40" cy="44" rx="22" ry="24" :fill="countRound.skin.color" />
                  <path d="M40,20 Q46,10 54,12" stroke="#69db7c" stroke-width="2.5" fill="none" />
                </g>
                <!-- 皮球 -->
                <g v-else>
                  <circle cx="40" cy="40" r="26" :fill="countRound.skin.color" />
                  <path d="M14,40 Q40,24 66,40" stroke="white" stroke-width="2.5" fill="none" opacity="0.6"/>
                  <path d="M14,40 Q40,56 66,40" stroke="white" stroke-width="2.5" fill="none" opacity="0.6"/>
                </g>
              </svg>
            </button>
          </div>

          <!-- 小筐：显示已放入数量 -->
          <div class="basket-row">
            <div class="basket" :class="{ 'basket--shake': basketShake }">
              <span class="basket-icon">🧺</span>
              <span class="basket-count">{{ basketCount }}</span>
            </div>
            <!-- 计数器语音标签（视觉同步） -->
            <span v-if="basketCount > 0" class="count-voice">{{ basketCount }}</span>
          </div>
        </template>

        <!-- 模式 B：多少比较 -->
        <template v-if="activeMode === 'compare' && compareRound">
          <div class="compare-stage">
            <div class="compare-group" :class="{ 'cmp--highlight': wrongSide === 'left' }">
              <div class="cmp-items">
                <svg
                  v-for="n in compareRound.leftCount"
                  :key="n"
                  class="cmp-item-svg"
                  viewBox="0 0 80 80"
                >
                  <polygon
                    v-if="compareRound.leftSkin.kind === 'star'"
                    points="40,8 47,29 70,29 52,43 58,64 40,51 22,64 28,43 10,29 33,29"
                    :fill="compareRound.leftSkin.color"
                  />
                  <g v-else-if="compareRound.leftSkin.kind === 'apple'">
                    <ellipse cx="40" cy="44" rx="22" ry="24" :fill="compareRound.leftSkin.color" />
                    <path d="M40,20 Q46,10 54,12" stroke="#69db7c" stroke-width="2.5" fill="none" />
                  </g>
                  <g v-else>
                    <circle cx="40" cy="40" r="26" :fill="compareRound.leftSkin.color" />
                    <path d="M14,40 Q40,24 66,40" stroke="white" stroke-width="2.5" fill="none" opacity="0.6"/>
                  </g>
                </svg>
              </div>
              <span class="cmp-label">左边</span>
            </div>

            <!-- 连线可视化（错误反馈时显示） -->
            <div v-if="showMatchLines" class="match-vis">
              <span class="match-icon">↔</span>
              <span class="match-extra">{{ matchExtraLabel }}</span>
            </div>

            <div class="compare-group" :class="{ 'cmp--highlight': wrongSide === 'right' }">
              <div class="cmp-items">
                <svg
                  v-for="n in compareRound.rightCount"
                  :key="n"
                  class="cmp-item-svg"
                  viewBox="0 0 80 80"
                >
                  <polygon
                    v-if="compareRound.rightSkin.kind === 'star'"
                    points="40,8 47,29 70,29 52,43 58,64 40,51 22,64 28,43 10,29 33,29"
                    :fill="compareRound.rightSkin.color"
                  />
                  <g v-else-if="compareRound.rightSkin.kind === 'apple'">
                    <ellipse cx="40" cy="44" rx="22" ry="24" :fill="compareRound.rightSkin.color" />
                    <path d="M40,20 Q46,10 54,12" stroke="#69db7c" stroke-width="2.5" fill="none" />
                  </g>
                  <g v-else>
                    <circle cx="40" cy="40" r="26" :fill="compareRound.rightSkin.color" />
                    <path d="M14,40 Q40,24 66,40" stroke="white" stroke-width="2.5" fill="none" opacity="0.6"/>
                  </g>
                </svg>
              </div>
              <span class="cmp-label">右边</span>
            </div>
          </div>

          <!-- 选项按钮 -->
          <div class="compare-options">
            <button
              v-for="opt in compareOptions"
              :key="opt.value"
              type="button"
              class="cmp-option-btn"
              :class="{ 'opt--selected': selectedCompare === opt.value }"
              :disabled="phase !== 'playing'"
              @click="onCompareSelect(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </template>

        <!-- 反馈条 -->
        <div v-if="feedbackVisible" class="feedback-strip" :data-tone="feedbackTone">
          {{ feedbackText }}
        </div>
      </section>
    </div>

    <!-- 徽章弹出 -->
    <Transition name="badge-pop">
      <div v-if="showBadge" class="badge-overlay">
        <div class="badge-card">
          <span class="badge-icon">🏅</span>
          <p class="badge-name">{{ difficultyConfig.badge.badgeName }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { EmotionGameDifficulty } from '@/types/emotional/games'
import type { EmotionGameAudioController } from '@/types/emotional/games'
import type { CustomGameCompletionPayload } from '@/types/emotional/games'
import {
  generateCountRound,
  generateCompareRound,
} from '@/data/number-sense-data'
import type { CountRoundSpec, CompareRoundSpec, CompareAnswer } from '@/data/number-sense-data'

const props = withDefaults(
  defineProps<{
    difficulty: EmotionGameDifficulty
    settings?: Record<string, unknown>
    paused?: boolean
    markRoundDirty?: () => void
    audio?: EmotionGameAudioController
  }>(),
  { settings: () => ({}), paused: false },
)

const emit = defineEmits<{
  complete: [payload: CustomGameCompletionPayload]
}>()

// ── 难度配置 ──────────────────────────────────────────────
const DIFFICULTY_CONFIGS = {
  1: { roundCount: 8, shortLabel: 'L1 入门', badge: { badgeCode: 'BADGE_LITTLE_COUNTER', badgeName: '数数小能手徽章' } },
  2: { roundCount: 8, shortLabel: 'L2 进阶', badge: { badgeCode: 'BADGE_LITTLE_COUNTER', badgeName: '数数小能手徽章' } },
  3: { roundCount: 6, shortLabel: 'L3 挑战', badge: { badgeCode: 'BADGE_LITTLE_COUNTER', badgeName: '数数小能手徽章' } },
} as const

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty])

// ── 状态 ─────────────────────────────────────────────────
type Phase = 'playing' | 'correct' | 'wrong' | 'done'
type Mode = 'count' | 'compare'
type CountPhase = 'base' | 'adjust'

const phase = ref<Phase>('playing')
const activeMode = ref<Mode>('count')
const countPhase = ref<CountPhase>('base')

const completedRounds = ref(0)
const firstTryCorrectCount = ref(0)
const statusTone = ref<'neutral' | 'success' | 'error'>('neutral')
const statusLabel = ref('数一数')
const stageMessage = ref('把数字对应的物品放进小筐吧！')
const feedbackVisible = ref(false)
const feedbackTone = ref<'success' | 'error'>('success')
const feedbackText = ref('')
const showBadge = ref(false)

// 模式 A 状态
const countRound = ref<CountRoundSpec | null>(null)

interface PoolItem { used: boolean; bouncing: boolean }
const poolItems = ref<PoolItem[]>([])
const basketCount = ref(0)
const basketShake = ref(false)

// 模式 B 状态
const compareRound = ref<CompareRoundSpec | null>(null)
const selectedCompare = ref<CompareAnswer | null>(null)
const showMatchLines = ref(false)
const matchExtraLabel = ref('')
const wrongSide = ref<'left' | 'right' | null>(null)

// ── 试次记录 ─────────────────────────────────────────────
interface TrialRecord {
  roundIndex: number
  mode: Mode
  targetNumber?: number
  adjustOp?: string
  adjustAmount?: number
  finalNumber?: number
  leftCount?: number
  rightCount?: number
  correctAnswer?: CompareAnswer
  chosenAnswer?: CompareAnswer
  firstTryCorrect: boolean
  wrongAttempts: number
  responseMs: number
}

const trials = ref<TrialRecord[]>([])
const roundStartTime = ref(Date.now())
let boardDirty = false
let currentWrongAttempts = 0
let currentFirstTry = true

// ── 计时器 ───────────────────────────────────────────────
const badgeTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const completeTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const resetTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function clearTimers() {
  if (badgeTimer.value) { clearTimeout(badgeTimer.value); badgeTimer.value = null }
  if (completeTimer.value) { clearTimeout(completeTimer.value); completeTimer.value = null }
  if (resetTimer.value) { clearTimeout(resetTimer.value); resetTimer.value = null }
}

// ── 主题 ─────────────────────────────────────────────────
const themeStyle = computed(() => ({ '--game-accent': '#fa8c16', '--game-bg': '#fff9f0' }))

// ── 模式 B 选项 ───────────────────────────────────────────
const compareOptions = computed(() => {
  const base = [
    { value: 'left' as CompareAnswer, label: '左边多' },
    { value: 'right' as CompareAnswer, label: '右边多' },
  ]
  if (compareRound.value?.allowEqual) {
    base.push({ value: 'equal' as CompareAnswer, label: '一样多' })
  }
  return base
})

// ── 初始化一轮 ────────────────────────────────────────────
function initCountRound() {
  const round = generateCountRound(props.difficulty)
  countRound.value = round
  countPhase.value = 'base'
  const maxNeeded = round.adjust
    ? Math.max(round.targetNumber, round.adjust.finalNumber) + 4
    : round.targetNumber + 4
  const poolSize = Math.min(Math.max(maxNeeded, 6), 16)
  poolItems.value = Array.from({ length: poolSize }, () => ({ used: false, bouncing: false }))
  basketCount.value = 0
}

function initCompareRound() {
  const round = generateCompareRound(props.difficulty)
  compareRound.value = round
  selectedCompare.value = null
  showMatchLines.value = false
  matchExtraLabel.value = ''
  wrongSide.value = null
}

function startRound() {
  boardDirty = false
  currentWrongAttempts = 0
  currentFirstTry = true
  phase.value = 'playing'
  statusTone.value = 'neutral'
  feedbackVisible.value = false
  feedbackText.value = ''
  roundStartTime.value = Date.now()

  if (activeMode.value === 'count') {
    initCountRound()
    statusLabel.value = '数一数'
    stageMessage.value = '把数字对应的物品放进小筐吧！'
  } else {
    initCompareRound()
    statusLabel.value = '比一比'
    stageMessage.value = '左边和右边哪个多？'
  }
}

function markBoardDirtyOnce() {
  if (boardDirty) return
  boardDirty = true
  props.markRoundDirty?.()
}

// ── 模式切换 ─────────────────────────────────────────────
function switchMode(mode: Mode) {
  if (activeMode.value === mode) return
  activeMode.value = mode
  completedRounds.value = 0
  firstTryCorrectCount.value = 0
  trials.value = []
  clearTimers()
  startRound()
}

// ── performanceData 严格对齐 K03 契约 ────────────────────
// cognitive-games-api 只认 accuracy_ratio / average_response_ms / 嵌套 actual_params
function buildPerformanceData() {
  const total = trials.value.length
  const firstTryCorrects = trials.value.filter(t => t.firstTryCorrect).length
  const avgRtMs = total > 0
    ? Math.round(trials.value.reduce((s, t) => s + t.responseMs, 0) / total)
    : 0
  return {
    paradigm: 'number_sense',
    difficulty_level: props.difficulty,
    mode: activeMode.value,
    total_rounds: total,
    first_try_correct_count: firstTryCorrects,
    accuracy_ratio: total > 0 ? parseFloat((firstTryCorrects / total).toFixed(4)) : 0,
    average_response_ms: avgRtMs,
    response_times_ms: trials.value.map(t => t.responseMs),
    actual_params: {
      session_type: 'K05_NUMBER_SENSE',
      mode: activeMode.value,
      difficulty_level: props.difficulty,
      trials: trials.value,
    },
  }
}

// ── 完成 ─────────────────────────────────────────────────
function finishSession() {
  phase.value = 'done'
  statusTone.value = 'success'
  statusLabel.value = '全部完成！'
  stageMessage.value = '太棒了，都答完了！'
  showBadge.value = true
  badgeTimer.value = setTimeout(() => {
    showBadge.value = false
    props.audio?.playSuccessCue?.()
  }, 650)
  completeTimer.value = setTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: difficultyConfig.value.badge,
    } as CustomGameCompletionPayload)
  }, 1300)
}

function recordTrial(extra: Partial<TrialRecord>) {
  trials.value.push({
    roundIndex: completedRounds.value,
    mode: activeMode.value,
    firstTryCorrect: currentFirstTry,
    wrongAttempts: currentWrongAttempts,
    responseMs: Date.now() - roundStartTime.value,
    ...extra,
  })
  if (currentFirstTry) firstTryCorrectCount.value++
}

function afterCorrect() {
  completedRounds.value++
  phase.value = 'correct'
  statusTone.value = 'success'
  statusLabel.value = '正确！'
  stageMessage.value = '太厉害了！'
  feedbackTone.value = 'success'
  feedbackText.value = '答对啦，继续加油！'
  feedbackVisible.value = true
  props.audio?.playSuccessCue?.()

  if (completedRounds.value >= difficultyConfig.value.roundCount) {
    finishSession()
  } else {
    resetTimer.value = setTimeout(() => {
      if (!props.paused) startRound()
    }, 2800)
  }
}

function afterWrong(hint: string) {
  currentFirstTry = false
  currentWrongAttempts++
  feedbackTone.value = 'error'
  feedbackText.value = hint
  feedbackVisible.value = true
}

// ── 模式 A：点选物品入筐 ─────────────────────────────────
function onPoolItemClick(idx: number) {
  if (phase.value !== 'playing') return
  if (!countRound.value) return
  const item = poolItems.value[idx]
  if (!item || item.used) return

  markBoardDirtyOnce()
  const currentTarget = countPhase.value === 'base'
    ? countRound.value.targetNumber
    : countRound.value.adjust!.finalNumber

  if (basketCount.value >= currentTarget) {
    item.bouncing = true
    basketShake.value = true
    afterWrong('筐里够了哦，再数一数！')
    setTimeout(() => {
      item.bouncing = false
      basketShake.value = false
    }, 500)
    return
  }

  item.used = true
  basketCount.value++

  if (basketCount.value === currentTarget) {
    if (countPhase.value === 'base' && countRound.value.adjust && props.difficulty === 3) {
      countPhase.value = 'adjust'
      if (countRound.value.adjust.op === 'remove') {
        const removeCount = countRound.value.adjust.amount
        let restored = 0
        for (let i = poolItems.value.length - 1; i >= 0 && restored < removeCount; i--) {
          if (poolItems.value[i]?.used) {
            poolItems.value[i]!.used = false
            restored++
          }
        }
      }
      statusLabel.value = '好！再来'
      stageMessage.value = countRound.value.adjust.op === 'add'
        ? `再放 ${countRound.value.adjust.amount} 个！`
        : `拿走 ${countRound.value.adjust.amount} 个！`
      feedbackVisible.value = false
    } else {
      recordTrial({
        targetNumber: countRound.value.targetNumber,
        adjustOp: countRound.value.adjust?.op,
        adjustAmount: countRound.value.adjust?.amount,
        finalNumber: countRound.value.adjust?.finalNumber ?? countRound.value.targetNumber,
      })
      afterCorrect()
    }
  }
}

// ── 模式 B：选择多少 ─────────────────────────────────────
function onCompareSelect(answer: CompareAnswer) {
  if (phase.value !== 'playing') return
  if (!compareRound.value) return

  markBoardDirtyOnce()
  selectedCompare.value = answer
  const isCorrect = answer === compareRound.value.answer

  if (isCorrect) {
    showMatchLines.value = false
    wrongSide.value = null
    recordTrial({
      leftCount: compareRound.value.leftCount,
      rightCount: compareRound.value.rightCount,
      correctAnswer: compareRound.value.answer,
      chosenAnswer: answer,
    })
    afterCorrect()
  } else {
    const diff = Math.abs(compareRound.value.leftCount - compareRound.value.rightCount)
    if (diff > 0) {
      const moreSide = compareRound.value.leftCount > compareRound.value.rightCount ? '左边' : '右边'
      matchExtraLabel.value = `${moreSide}多出 ${diff} 个哦`
      showMatchLines.value = true
      wrongSide.value = compareRound.value.leftCount > compareRound.value.rightCount ? 'left' : 'right'
    }

    if (props.difficulty === 1) {
      afterWrong('再想想，试试别的答案吧。')
    } else {
      recordTrial({
        leftCount: compareRound.value.leftCount,
        rightCount: compareRound.value.rightCount,
        correctAnswer: compareRound.value.answer,
        chosenAnswer: answer,
      })
      completedRounds.value++
      phase.value = 'wrong'
      statusTone.value = 'error'
      statusLabel.value = '差一点'
      stageMessage.value = '看看哪边多出来了。'
      feedbackTone.value = 'error'
      feedbackText.value = '没关系，下次再来！'
      feedbackVisible.value = true

      if (completedRounds.value >= difficultyConfig.value.roundCount) {
        finishSession()
      } else {
        resetTimer.value = setTimeout(() => {
          if (!props.paused) startRound()
        }, 3200)
      }
    }
  }
}

// ── 完整重置 ─────────────────────────────────────────────
function resetBoard() {
  clearTimers()
  completedRounds.value = 0
  firstTryCorrectCount.value = 0
  trials.value = []
  showBadge.value = false
  startRound()
}

watch(() => props.difficulty, () => resetBoard())
watch(() => props.paused, (paused) => {
  if (!paused && (phase.value === 'correct' || phase.value === 'wrong')
    && completedRounds.value < difficultyConfig.value.roundCount) {
    resetTimer.value = setTimeout(() => startRound(), 2800)
  }
})

onUnmounted(() => clearTimers())

// 初始化第一轮
startRound()
</script>

<style scoped>
.number-sense-game {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  min-height: 100%;
  background: var(--game-bg, #fff9f0);
}

.hud-panel {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.hud-card {
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 72px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

.hud-card span { font-size: 11px; color: #78909c; }
.hud-card strong { font-size: 17px; color: #263238; }

.mode-toggle {
  display: flex;
  gap: 4px;
  margin-left: auto;
  background: #f0f0f0;
  border-radius: 10px;
  padding: 4px;
}

.mode-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: #78909c;
  transition: background .15s, color .15s;
}

.mode-btn.active {
  background: #fff;
  color: var(--game-accent, #fa8c16);
  box-shadow: 0 1px 4px rgba(0,0,0,.1);
}

.stage-layout { flex: 1; display: flex; flex-direction: column; }

.stage-panel {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  flex: 1;
}

.status-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #f5f5f5;
}

.status-strip[data-tone="success"] { background: #e8f5e9; color: #2e7d32; }
.status-strip[data-tone="error"]   { background: #fce4ec; color: #c62828; }
.status-strip span { font-weight: 600; }

/* 模式 A ── 目标区 */
.target-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.target-hint { font-size: 18px; color: #546e7a; }
.target-number {
  font-size: 56px;
  font-weight: 900;
  color: var(--game-accent, #fa8c16);
  line-height: 1;
}

/* 物品池 */
.item-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 8px 0;
}

.pool-item {
  width: 72px;
  height: 72px;
  background: #fafafa;
  border: 2px solid #e0e0e0;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  transition: border-color .15s, transform .1s, opacity .15s;
}

.pool-item:hover:not(:disabled):not(.item--used) {
  border-color: var(--game-accent, #fa8c16);
  transform: translateY(-2px);
}

.pool-item:disabled { cursor: not-allowed; }

.pool-item.item--used {
  opacity: .25;
  border-color: #bdbdbd;
  cursor: not-allowed;
}

@keyframes bounce-back {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.15); }
  60%  { transform: scale(.92); }
  100% { transform: scale(1); }
}

.pool-item.item--bounce { animation: bounce-back .4s ease; }

.item-svg { width: 52px; height: 52px; }

/* 小筐 */
.basket-row {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: center;
}

.basket {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff3e0;
  border: 2px solid #ffb74d;
  border-radius: 14px;
  padding: 10px 20px;
  min-width: 100px;
  justify-content: center;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-6px); }
  75%       { transform: translateX(6px); }
}

.basket--shake { animation: shake .35s ease; }

.basket-icon { font-size: 28px; }
.basket-count { font-size: 32px; font-weight: 900; color: var(--game-accent, #fa8c16); }
.count-voice { font-size: 28px; font-weight: 700; color: #26a69a; }

/* 模式 B ── 比较区 */
.compare-stage {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.compare-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border-radius: 14px;
  padding: 12px;
  min-width: 100px;
  transition: background .2s;
}

.compare-group.cmp--highlight {
  background: #fff3cd;
  border: 2px solid #ffc107;
}

.cmp-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  max-width: 200px;
}

.cmp-item-svg { width: 40px; height: 40px; }
.cmp-label { font-size: 13px; color: #78909c; font-weight: 600; }

.match-vis {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 20px;
  color: #fa8c16;
}

.match-icon { font-size: 22px; }
.match-extra { font-size: 12px; color: #fb8c00; font-weight: 600; white-space: nowrap; }

/* 选项按钮 */
.compare-options {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.cmp-option-btn {
  padding: 12px 28px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  background: #fafafa;
  color: #37474f;
  transition: border-color .15s, background .15s, transform .1s;
  min-width: 96px;
}

.cmp-option-btn:hover:not(:disabled) {
  border-color: var(--game-accent, #fa8c16);
  background: #fff3e0;
  transform: translateY(-2px);
}

.cmp-option-btn:disabled { opacity: .5; cursor: not-allowed; }
.cmp-option-btn.opt--selected { border-color: var(--game-accent, #fa8c16); background: #fff3e0; }

/* 反馈条 */
.feedback-strip {
  padding: 10px 14px;
  border-radius: 10px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 14px;
}

.feedback-strip[data-tone="error"] { background: #fce4ec; color: #c62828; }

/* 徽章 */
.badge-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.35);
  z-index: 999;
}

.badge-card {
  background: #fff;
  border-radius: 20px;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
}

.badge-icon { font-size: 56px; }
.badge-name { font-size: 18px; font-weight: 700; color: #263238; }

.badge-pop-enter-active, .badge-pop-leave-active { transition: opacity .25s, transform .25s; }
.badge-pop-enter-from, .badge-pop-leave-to { opacity: 0; transform: scale(.8); }
</style>
