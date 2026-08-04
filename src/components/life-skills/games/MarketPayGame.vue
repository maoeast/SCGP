<template>
  <div
    class="market-pay-game"
    :class="{ 'is-paused': props.paused }"
    :data-phase="phase"
  >
    <header class="market-pay-game__topbar">
      <div class="market-pay-game__title-group">
        <span class="market-pay-game__shop-icon" aria-hidden="true">🛒</span>
        <div>
          <p class="market-pay-game__eyebrow">社区生活练习</p>
          <h1>超市付款小能手</h1>
        </div>
      </div>

      <div class="market-pay-game__progress-panel" aria-label="购物进度">
        <div class="market-pay-game__progress-copy">
          <span>已完成</span>
          <strong>{{ completedPurchases }} / {{ difficultyConfig.targetPurchases }} 件</strong>
        </div>
        <div class="market-pay-game__progress-track" aria-hidden="true">
          <span :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>

      <div class="market-pay-game__coin-summary">
        <span>可用硬币</span>
        <strong>{{ coinValueLabel }}</strong>
      </div>
    </header>

    <main class="market-pay-game__content">
      <section class="market-pay-game__product-card" aria-label="当前商品">
        <span class="market-pay-game__shelf-label">第 {{ currentPurchaseNumber }} 件商品</span>
        <div class="market-pay-game__product-emoji" aria-hidden="true">
          {{ currentRound.itemEmoji }}
        </div>
        <h2>{{ currentRound.itemName }}</h2>
        <div class="market-pay-game__price-tag">
          <span>价格</span>
          <strong>{{ currentRound.price }}</strong>
          <b>元</b>
        </div>
        <p>看清整数价格，再一枚一枚放硬币。</p>
      </section>

      <section class="market-pay-game__checkout-card">
        <div class="market-pay-game__feedback" :data-tone="feedbackTone" aria-live="polite">
          <span class="market-pay-game__feedback-icon" aria-hidden="true">{{ feedbackIcon }}</span>
          <div>
            <strong>{{ feedbackTitle }}</strong>
            <p>{{ feedbackText }}</p>
          </div>
        </div>

        <div class="market-pay-game__tray-panel">
          <div class="market-pay-game__tray-heading">
            <div>
              <span>付款托盘</span>
              <small>按放入顺序排好</small>
            </div>
            <div class="market-pay-game__tray-total" aria-live="polite">
              <span>合计</span>
              <strong>{{ trayTotal }} 元</strong>
            </div>
          </div>

          <div class="market-pay-game__tray" :class="{ 'is-empty': trayCoins.length === 0 }">
            <p v-if="trayCoins.length === 0" class="market-pay-game__empty-tray">
              硬币会放在这里
            </p>
            <div v-else class="market-pay-game__tray-coins" aria-label="托盘中的硬币">
              <span
                v-for="(coin, index) in trayCoins"
                :key="`${currentPurchaseIndex}-${index}`"
                class="market-pay-game__tray-coin"
                :class="{ 'is-last': index === trayCoins.length - 1 }"
                :aria-label="`${coin} 元硬币${index === trayCoins.length - 1 ? '，最后放入' : ''}`"
              >
                {{ coin }}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="market-pay-game__return-button"
            :disabled="props.paused || phase !== 'playing' || trayCoins.length === 0"
            @click="returnLastCoin"
          >
            <span aria-hidden="true">↩️</span>
            退回最后一枚
          </button>
        </div>

        <div class="market-pay-game__coin-controls" aria-label="选择硬币面值">
          <p>点大硬币，逐枚放进托盘</p>
          <div class="market-pay-game__coin-buttons">
            <button
              v-for="coinValue in difficultyConfig.coinValues"
              :key="coinValue"
              type="button"
              class="market-pay-game__coin-button"
              :disabled="props.paused || phase !== 'playing'"
              :aria-label="`放入一枚 ${coinValue} 元硬币`"
              @click="placeCoin(coinValue)"
            >
              <span>{{ coinValue }}</span>
              <small>元</small>
            </button>
          </div>
        </div>

        <div class="market-pay-game__actions">
          <button
            type="button"
            class="market-pay-game__hint-button"
            :disabled="props.paused || phase !== 'playing'"
            @click="showHint"
          >
            <span aria-hidden="true">💡</span>
            提示一下
          </button>
          <button
            type="button"
            class="market-pay-game__check-button"
            :disabled="props.paused || phase !== 'playing'"
            @click="checkTrayPayment"
          >
            <span aria-hidden="true">✓</span>
            核对付款
          </button>
        </div>
      </section>
    </main>

    <div v-if="phase === 'ready'" class="market-pay-game__state-layer">
      <section class="market-pay-game__state-card">
        <span class="market-pay-game__state-emoji" aria-hidden="true">🏪</span>
        <p class="market-pay-game__state-kicker">欢迎来到友好小超市</p>
        <h2>准备好自己付钱了吗？</h2>
        <p>
          看商品价格，逐枚放入硬币。金额不合适也没关系，托盘会保留，慢慢调整就好。
        </p>
        <button
          type="button"
          class="market-pay-game__start-button"
          :disabled="props.paused"
          @click="startGame"
        >
          <span aria-hidden="true">🛒</span>
          开始购物
        </button>
      </section>
    </div>

    <div v-else-if="phase === 'round-success'" class="market-pay-game__state-layer">
      <section class="market-pay-game__state-card is-success">
        <span class="market-pay-game__state-emoji" aria-hidden="true">🌟</span>
        <p class="market-pay-game__state-kicker">付款正好</p>
        <h2>{{ currentRound.itemName }}买好啦！</h2>
        <p>你认真核对了 {{ currentRound.price }} 元，已经完成 {{ completedPurchases }} 件商品。</p>
        <button
          type="button"
          class="market-pay-game__start-button"
          :disabled="props.paused"
          @click="goToNextPurchase"
        >
          下一件商品
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>

    <div v-else-if="phase === 'completed'" class="market-pay-game__state-layer">
      <section class="market-pay-game__state-card is-complete">
        <span class="market-pay-game__state-emoji" aria-hidden="true">🎉</span>
        <p class="market-pay-game__state-kicker">购物任务完成</p>
        <h2>每件商品都付得刚刚好！</h2>
        <p>你会自己放硬币、主动核对，也会根据提示慢慢修正了。</p>
        <div class="market-pay-game__completion-count">
          <strong>{{ completedPurchases }}</strong>
          <span>件商品完成付款</span>
        </div>
      </section>
    </div>

    <div v-if="props.paused" class="market-pay-game__pause-layer" role="status">
      <div>
        <span aria-hidden="true">⏸️</span>
        <strong>游戏暂停了</strong>
        <p>硬币和计时都在休息，恢复后可以接着付。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
} from '@/types/emotional/games'
import {
  MARKET_PAY_DIFFICULTIES,
  averageNonNegative,
  checkPayment,
  getMarketRound,
  ratio,
} from '@/features/life-skills/new-games-core'

type GamePhase = 'ready' | 'playing' | 'round-success' | 'completed'
type FeedbackTone = 'neutral' | 'hint' | 'under' | 'over' | 'success'

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const phase = ref<GamePhase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const currentPurchaseIndex = ref(0)
const completedPurchases = ref(0)
const exactPayments = ref(0)
const underpaymentChecks = ref(0)
const overpaymentChecks = ref(0)
const incorrectPaymentChecks = ref(0)
const correctionActions = ref(0)
const coinsPlaced = ref(0)
const hintCount = ref(0)
const paymentTimesMs = ref<number[]>([])
const trayCoins = ref<number[]>([])
const awaitingCorrection = ref(false)
const feedbackTone = ref<FeedbackTone>('neutral')
const feedbackTitle = ref('先看价格')
const feedbackText = ref('选择硬币放进托盘，准备好后主动核对。')

let hasMarkedRoundDirty = false
let completionEmitted = false
let sessionStartedAt = 0
let roundStartedAt = 0
let totalPausedMs = 0
let roundPausedBaselineMs = 0
let pauseStartedAt: number | null = null

const difficultyConfig = computed(() => MARKET_PAY_DIFFICULTIES[activeDifficulty.value])
const currentRound = computed(() => getMarketRound(currentPurchaseIndex.value, activeDifficulty.value))
const currentPurchaseNumber = computed(() => (
  Math.min(currentPurchaseIndex.value + 1, difficultyConfig.value.targetPurchases)
))
const trayTotal = computed(() => trayCoins.value.reduce((sum, coin) => sum + coin, 0))
const progressValue = computed(() => ratio(completedPurchases.value, difficultyConfig.value.targetPurchases))
const progressPercent = computed(() => Math.round(progressValue.value * 100))
const coinValueLabel = computed(() => (
  difficultyConfig.value.coinValues.map((value) => `${value} 元`).join(' / ')
))
const feedbackIcon = computed(() => {
  if (feedbackTone.value === 'success') return '⭐'
  if (feedbackTone.value === 'hint') return '💡'
  if (feedbackTone.value === 'under') return '➕'
  if (feedbackTone.value === 'over') return '↩️'
  return '🪙'
})

function markRoundDirtyOnce(): void {
  if (hasMarkedRoundDirty) return
  hasMarkedRoundDirty = true
  props.markRoundDirty?.()
}

function prepareAudio(): void {
  props.audio.ensureReady().catch(() => {
    // Audio is supportive only; the payment interaction remains fully usable without it.
  })
}

function playSoftCue(): void {
  props.audio.playSoftBounce().catch(() => {
    // Ignore optional cue failures.
  })
}

function playSuccessCue(): void {
  props.audio.playSuccessCue().catch(() => {
    // Ignore optional cue failures.
  })
}

function effectivePausedMs(now: number): number {
  if (pauseStartedAt === null) return totalPausedMs
  return totalPausedMs + Math.max(0, now - pauseStartedAt)
}

function activeElapsedMs(startedAt: number, pausedBaselineMs: number, now: number): number {
  if (startedAt <= 0) return 0
  const pausedSinceStart = effectivePausedMs(now) - pausedBaselineMs
  return Math.max(0, now - startedAt - pausedSinceStart)
}

function startRoundTimer(now = performance.now()): void {
  roundStartedAt = now
  roundPausedBaselineMs = effectivePausedMs(now)
}

function startGame(): void {
  if (props.paused || phase.value !== 'ready') return

  activeDifficulty.value = props.difficulty
  currentPurchaseIndex.value = 0
  completedPurchases.value = 0
  exactPayments.value = 0
  underpaymentChecks.value = 0
  overpaymentChecks.value = 0
  incorrectPaymentChecks.value = 0
  correctionActions.value = 0
  coinsPlaced.value = 0
  hintCount.value = 0
  paymentTimesMs.value = []
  trayCoins.value = []
  awaitingCorrection.value = false
  feedbackTone.value = 'neutral'
  feedbackTitle.value = '先看价格'
  feedbackText.value = '选择硬币放进托盘，准备好后主动核对。'

  const now = performance.now()
  sessionStartedAt = now
  roundStartedAt = now
  totalPausedMs = 0
  roundPausedBaselineMs = 0
  pauseStartedAt = null
  phase.value = 'playing'

  markRoundDirtyOnce()
  prepareAudio()
  props.audio.speak(`第一件是${currentRound.value.itemName}，价格${currentRound.value.price}元。`)
}

function correctionMessage(total: number): string {
  const difference = currentRound.value.price - total
  if (difference === 0) {
    return `现在是 ${total} 元，金额看起来正好，再点“核对付款”确认吧。`
  }
  if (difference > 0) {
    return `调整后是 ${total} 元，还差 ${difference} 元，可以继续放硬币。`
  }
  return `调整后是 ${total} 元，多了 ${Math.abs(difference)} 元，可以退回最后一枚。`
}

function placeCoin(coinValue: number): void {
  if (props.paused || phase.value !== 'playing') return
  if (!difficultyConfig.value.coinValues.includes(coinValue)) return

  if (awaitingCorrection.value) correctionActions.value += 1
  trayCoins.value.push(coinValue)
  coinsPlaced.value += 1
  playSoftCue()

  feedbackTone.value = awaitingCorrection.value ? 'hint' : 'neutral'
  feedbackTitle.value = awaitingCorrection.value ? '正在调整' : '硬币放好啦'
  feedbackText.value = awaitingCorrection.value
    ? correctionMessage(trayTotal.value)
    : `托盘里现在有 ${trayTotal.value} 元，准备好就点“核对付款”。`
}

function returnLastCoin(): void {
  if (props.paused || phase.value !== 'playing' || trayCoins.value.length === 0) return

  if (awaitingCorrection.value) correctionActions.value += 1
  trayCoins.value.pop()
  playSoftCue()

  feedbackTone.value = awaitingCorrection.value ? 'hint' : 'neutral'
  feedbackTitle.value = '最后一枚已退回'
  feedbackText.value = awaitingCorrection.value
    ? correctionMessage(trayTotal.value)
    : `托盘里现在有 ${trayTotal.value} 元，可以继续放硬币再核对。`
}

function checkTrayPayment(): void {
  if (props.paused || phase.value !== 'playing') return

  const result = checkPayment(trayTotal.value, currentRound.value.price)
  if (result === 'under') {
    const missing = currentRound.value.price - trayTotal.value
    underpaymentChecks.value += 1
    incorrectPaymentChecks.value += 1
    awaitingCorrection.value = true
    feedbackTone.value = 'under'
    feedbackTitle.value = '还差一点点'
    feedbackText.value = `还差 ${missing} 元。托盘已经为你保留，请再放入硬币后重新核对。`
    playSoftCue()
    props.audio.speak(`还差${missing}元，慢慢加上就好。`)
    return
  }

  if (result === 'over') {
    const extra = trayTotal.value - currentRound.value.price
    overpaymentChecks.value += 1
    incorrectPaymentChecks.value += 1
    awaitingCorrection.value = true
    feedbackTone.value = 'over'
    feedbackTitle.value = '多放了一点'
    feedbackText.value = `多了 ${extra} 元。托盘不会清空，可以退回最后一枚再调整。`
    playSoftCue()
    props.audio.speak(`多了${extra}元，可以退回最后一枚再试试。`)
    return
  }

  completeCurrentPurchase()
}

function completeCurrentPurchase(): void {
  const now = performance.now()
  paymentTimesMs.value.push(Math.round(activeElapsedMs(roundStartedAt, roundPausedBaselineMs, now)))
  exactPayments.value += 1
  completedPurchases.value += 1
  awaitingCorrection.value = false
  feedbackTone.value = 'success'
  feedbackTitle.value = '付款正好'
  feedbackText.value = `${currentRound.value.price} 元核对完成，这件商品买好啦！`
  playSuccessCue()
  props.audio.speak('付款正好，做得很好！')

  if (completedPurchases.value >= difficultyConfig.value.targetPurchases) {
    finishGame(now)
    return
  }
  phase.value = 'round-success'
}

function goToNextPurchase(): void {
  if (props.paused || phase.value !== 'round-success') return

  currentPurchaseIndex.value += 1
  trayCoins.value = []
  awaitingCorrection.value = false
  feedbackTone.value = 'neutral'
  feedbackTitle.value = '看看新价格'
  feedbackText.value = '重新选择硬币，准备好后再主动核对。'
  phase.value = 'playing'
  startRoundTimer()
  props.audio.speak(`${currentRound.value.itemName}，价格${currentRound.value.price}元。`)
}

function showHint(): void {
  if (props.paused || phase.value !== 'playing') return

  hintCount.value += 1
  const difference = currentRound.value.price - trayTotal.value
  let message: string

  if (difference === 0) {
    message = `托盘里是 ${trayTotal.value} 元，点“核对付款”确认一下。`
  } else if (difference < 0) {
    message = `现在多了 ${Math.abs(difference)} 元，先退回最后一枚硬币看看。`
  } else {
    const suggestedCoin = [...difficultyConfig.value.coinValues]
      .reverse()
      .find((coinValue) => coinValue <= difference) ?? difficultyConfig.value.coinValues[0]!
    message = `还需要凑 ${difference} 元，可以先试试 ${suggestedCoin} 元硬币。`
  }

  feedbackTone.value = 'hint'
  feedbackTitle.value = '小提示'
  feedbackText.value = message
  prepareAudio()
  props.audio.speak(message)
}

function finishGame(now: number): void {
  if (completionEmitted) return
  completionEmitted = true
  phase.value = 'completed'

  const totalDurationSeconds = Number((activeElapsedMs(sessionStartedAt, 0, now) / 1000).toFixed(1))
  emit('complete', {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'quantity-payment-self-correction',
      target_purchases: difficultyConfig.value.targetPurchases,
      completed_purchases: completedPurchases.value,
      exact_payments: exactPayments.value,
      underpayment_checks: underpaymentChecks.value,
      overpayment_checks: overpaymentChecks.value,
      incorrect_payment_checks: incorrectPaymentChecks.value,
      correction_actions: correctionActions.value,
      coins_placed: coinsPlaced.value,
      hint_count: hintCount.value,
      payment_times_ms: [...paymentTimesMs.value],
      average_payment_ms: averageNonNegative(paymentTimesMs.value),
      total_duration_seconds: totalDurationSeconds,
      difficulty_level: activeDifficulty.value,
    },
  })
}

watch(
  () => props.difficulty,
  (difficulty) => {
    if (phase.value === 'ready') activeDifficulty.value = difficulty
  },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (sessionStartedAt <= 0 || phase.value === 'completed') return

    const now = performance.now()
    if (isPaused && pauseStartedAt === null) {
      pauseStartedAt = now
      return
    }
    if (!isPaused && pauseStartedAt !== null) {
      totalPausedMs += Math.max(0, now - pauseStartedAt)
      pauseStartedAt = null
    }
  },
)

onBeforeUnmount(() => {
  props.audio.stopAll()
})
</script>

<style scoped>
.market-pay-game,
.market-pay-game * {
  box-sizing: border-box;
}

.market-pay-game {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  padding: clamp(12px, 2vw, 24px);
  overflow: auto;
  color: #25364a;
  background:
    radial-gradient(circle at 12% 8%, rgba(255, 255, 255, 0.9) 0 8%, transparent 28%),
    radial-gradient(circle at 88% 14%, rgba(255, 226, 135, 0.42) 0 8%, transparent 25%),
    linear-gradient(145deg, #dff6e8 0%, #f8f1c5 54%, #ffe1c7 100%);
  font-family: inherit;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.market-pay-game button {
  font: inherit;
  touch-action: manipulation;
}

.market-pay-game button:focus-visible {
  outline: 4px solid rgba(34, 105, 213, 0.42);
  outline-offset: 4px;
}

.market-pay-game button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.market-pay-game__topbar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(230px, auto) minmax(260px, 1fr) minmax(150px, auto);
  align-items: center;
  gap: 18px;
  padding: 14px 18px;
  border: 2px solid rgba(255, 255, 255, 0.78);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 34px rgba(65, 85, 65, 0.12);
  backdrop-filter: blur(12px);
}

.market-pay-game__title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.market-pay-game__shop-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: 18px;
  background: #fff3ce;
  font-size: 2rem;
  box-shadow: inset 0 -4px 0 rgba(199, 145, 47, 0.12);
}

.market-pay-game__eyebrow {
  margin: 0 0 2px;
  color: #4b7962;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.market-pay-game__title-group h1 {
  margin: 0;
  font-size: clamp(1.25rem, 2vw, 1.65rem);
  line-height: 1.15;
}

.market-pay-game__progress-panel {
  min-width: 0;
}

.market-pay-game__progress-copy {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: #5b6d67;
  font-size: 0.9rem;
}

.market-pay-game__progress-copy strong {
  color: #236847;
  font-size: 1.08rem;
}

.market-pay-game__progress-track {
  height: 14px;
  overflow: hidden;
  border: 2px solid rgba(63, 127, 88, 0.16);
  border-radius: 999px;
  background: #e7efe9;
}

.market-pay-game__progress-track span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #54b879, #83ca62);
  transition: width 300ms ease;
}

.market-pay-game__coin-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  color: #6b6652;
  font-size: 0.82rem;
}

.market-pay-game__coin-summary strong {
  color: #765719;
  font-size: 1rem;
}

.market-pay-game__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(240px, 0.72fr) minmax(500px, 1.6fr);
  gap: clamp(14px, 2vw, 24px);
  width: min(1180px, 100%);
  margin: clamp(14px, 2vw, 24px) auto 0;
  flex: 1;
  transition: filter 180ms ease, opacity 180ms ease;
}

.market-pay-game__product-card,
.market-pay-game__checkout-card {
  border: 2px solid rgba(255, 255, 255, 0.82);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 40px rgba(77, 83, 58, 0.13);
}

.market-pay-game__product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  padding: clamp(20px, 3vw, 36px);
  text-align: center;
  background:
    linear-gradient(rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.9)),
    repeating-linear-gradient(0deg, #edc98f 0 6px, #f6deb9 6px 38px);
}

.market-pay-game__shelf-label {
  padding: 7px 14px;
  border-radius: 999px;
  color: #597060;
  background: #e6f3e9;
  font-size: 0.86rem;
  font-weight: 800;
}

.market-pay-game__product-emoji {
  display: grid;
  place-items: center;
  width: clamp(132px, 15vw, 184px);
  height: clamp(132px, 15vw, 184px);
  margin: 18px 0 10px;
  border: 4px solid #fff;
  border-radius: 42px;
  background: linear-gradient(145deg, #fffdf5, #fff1c8);
  box-shadow: 0 18px 32px rgba(111, 85, 34, 0.14), inset 0 -8px 0 rgba(225, 169, 66, 0.08);
  font-size: clamp(4.8rem, 8vw, 7rem);
}

.market-pay-game__product-card h2 {
  margin: 0 0 12px;
  font-size: clamp(1.5rem, 2.4vw, 2rem);
}

.market-pay-game__price-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  min-width: 170px;
  padding: 10px 22px 12px;
  border: 3px dashed #db7b4b;
  border-radius: 20px;
  color: #8f3c20;
  background: #fff0de;
}

.market-pay-game__price-tag span {
  font-size: 0.9rem;
  font-weight: 800;
}

.market-pay-game__price-tag strong {
  font-size: clamp(2.5rem, 5vw, 3.8rem);
  line-height: 1;
}

.market-pay-game__price-tag b {
  font-size: 1.2rem;
}

.market-pay-game__product-card > p {
  max-width: 260px;
  margin: 18px 0 0;
  color: #6d756f;
  line-height: 1.65;
}

.market-pay-game__checkout-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(250px, 0.7fr);
  grid-template-areas:
    "feedback feedback"
    "tray coins"
    "actions actions";
  gap: 16px;
  padding: clamp(16px, 2.5vw, 26px);
}

.market-pay-game__feedback {
  grid-area: feedback;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 82px;
  padding: 12px 18px;
  border: 2px solid #d7e5dc;
  border-radius: 22px;
  color: #355547;
  background: #f1f8f3;
}

.market-pay-game__feedback[data-tone="hint"] {
  border-color: #e7cf74;
  color: #725919;
  background: #fff9d9;
}

.market-pay-game__feedback[data-tone="under"] {
  border-color: #89badb;
  color: #245f82;
  background: #eaf7ff;
}

.market-pay-game__feedback[data-tone="over"] {
  border-color: #e6b37e;
  color: #805227;
  background: #fff3e8;
}

.market-pay-game__feedback[data-tone="success"] {
  border-color: #85cb91;
  color: #286735;
  background: #eaf9e8;
}

.market-pay-game__feedback-icon {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  flex: 0 0 auto;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 1.65rem;
}

.market-pay-game__feedback strong {
  display: block;
  margin-bottom: 3px;
  font-size: 1.05rem;
}

.market-pay-game__feedback p {
  margin: 0;
  line-height: 1.45;
}

.market-pay-game__tray-panel {
  grid-area: tray;
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 16px;
  border-radius: 24px;
  background: #f3ece1;
}

.market-pay-game__tray-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.market-pay-game__tray-heading > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-weight: 800;
}

.market-pay-game__tray-heading small {
  color: #817a70;
  font-weight: 500;
}

.market-pay-game__tray-total {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 14px;
  color: #6f4e1d;
  background: #fff;
  white-space: nowrap;
}

.market-pay-game__tray-total span {
  font-size: 0.78rem;
}

.market-pay-game__tray-total strong {
  font-size: 1.35rem;
}

.market-pay-game__tray {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 190px;
  padding: 16px;
  overflow: auto;
  border: 4px solid #a97f58;
  border-radius: 28px;
  background: linear-gradient(145deg, #d7b894, #f1d9b9);
  box-shadow: inset 0 8px 18px rgba(93, 60, 31, 0.18), inset 0 -4px 0 rgba(255, 255, 255, 0.35);
}

.market-pay-game__tray.is-empty {
  border-style: dashed;
}

.market-pay-game__empty-tray {
  margin: 0;
  color: #826f5d;
  font-weight: 700;
}

.market-pay-game__tray-coins {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.market-pay-game__tray-coin {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border: 4px solid #d19522;
  border-radius: 50%;
  color: #6d4906;
  background: radial-gradient(circle at 34% 28%, #fff4a8 0 12%, #f6c843 40%, #d9941b 100%);
  box-shadow: 0 5px 0 #a96512, 0 8px 12px rgba(92, 58, 8, 0.2);
  font-size: 1.35rem;
  font-weight: 900;
}

.market-pay-game__tray-coin.is-last {
  outline: 4px solid rgba(74, 132, 209, 0.35);
  outline-offset: 3px;
}

.market-pay-game__return-button {
  min-height: 60px;
  margin-top: 12px;
  border: 0;
  border-radius: 18px;
  color: #614725;
  background: #fffaf2;
  box-shadow: 0 5px 0 #d7c5aa;
  font-weight: 900;
  cursor: pointer;
}

.market-pay-game__return-button:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #d7c5aa;
}

.market-pay-game__coin-controls {
  grid-area: coins;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 14px;
  border-radius: 24px;
  background: #eef6fb;
}

.market-pay-game__coin-controls > p {
  margin: 0 0 14px;
  color: #49677a;
  font-weight: 800;
  text-align: center;
}

.market-pay-game__coin-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

.market-pay-game__coin-button {
  display: flex;
  align-items: baseline;
  justify-content: center;
  width: 118px;
  height: 118px;
  border: 7px solid #d99b1f;
  border-radius: 50%;
  color: #684306;
  background: radial-gradient(circle at 34% 25%, #fff7b9 0 10%, #ffd85a 38%, #e8a925 74%, #c47b0c 100%);
  box-shadow: inset 0 0 0 5px rgba(255, 241, 142, 0.7), 0 9px 0 #9e610d, 0 13px 20px rgba(90, 57, 10, 0.22);
  cursor: pointer;
}

.market-pay-game__coin-button span {
  font-size: 2.8rem;
  font-weight: 950;
  line-height: 1;
}

.market-pay-game__coin-button small {
  margin-left: 3px;
  font-size: 1rem;
  font-weight: 900;
}

.market-pay-game__coin-button:not(:disabled):hover {
  filter: brightness(1.04);
  transform: translateY(-2px);
}

.market-pay-game__coin-button:not(:disabled):active {
  transform: translateY(6px);
  box-shadow: inset 0 0 0 5px rgba(255, 241, 142, 0.7), 0 3px 0 #9e610d;
}

.market-pay-game__actions {
  grid-area: actions;
  display: grid;
  grid-template-columns: minmax(150px, 0.55fr) minmax(250px, 1fr);
  gap: 14px;
}

.market-pay-game__hint-button,
.market-pay-game__check-button,
.market-pay-game__start-button {
  min-height: 68px;
  border: 0;
  border-radius: 22px;
  font-weight: 900;
  cursor: pointer;
}

.market-pay-game__hint-button {
  color: #705a18;
  background: #fff2a9;
  box-shadow: 0 6px 0 #d5bc55;
}

.market-pay-game__check-button {
  color: #fff;
  background: linear-gradient(145deg, #2c9b67, #237f5a);
  box-shadow: 0 7px 0 #176244, 0 10px 20px rgba(31, 119, 80, 0.22);
  font-size: 1.2rem;
}

.market-pay-game__hint-button:not(:disabled):active,
.market-pay-game__check-button:not(:disabled):active,
.market-pay-game__start-button:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 rgba(63, 67, 48, 0.35);
}

.market-pay-game__state-layer,
.market-pay-game__pause-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(53, 69, 61, 0.3);
  backdrop-filter: blur(8px);
}

.market-pay-game__state-card {
  width: min(560px, 100%);
  padding: clamp(26px, 5vw, 46px);
  border: 3px solid rgba(255, 255, 255, 0.86);
  border-radius: 34px;
  background: linear-gradient(145deg, #fffef8, #f7fff8);
  box-shadow: 0 28px 70px rgba(33, 57, 43, 0.24);
  text-align: center;
}

.market-pay-game__state-card.is-success {
  background: linear-gradient(145deg, #fffdf0, #edfae7);
}

.market-pay-game__state-card.is-complete {
  background: linear-gradient(145deg, #fff7cf, #e6f8dd);
}

.market-pay-game__state-emoji {
  display: block;
  margin-bottom: 10px;
  font-size: clamp(4rem, 10vw, 6rem);
  line-height: 1;
}

.market-pay-game__state-kicker {
  margin: 0 0 6px;
  color: #438260;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.market-pay-game__state-card h2 {
  margin: 0 0 14px;
  font-size: clamp(1.65rem, 4vw, 2.35rem);
}

.market-pay-game__state-card > p:not(.market-pay-game__state-kicker) {
  margin: 0 auto;
  max-width: 460px;
  color: #657169;
  font-size: 1.05rem;
  line-height: 1.7;
}

.market-pay-game__start-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: min(310px, 100%);
  margin-top: 24px;
  padding: 0 28px;
  color: #fff;
  background: linear-gradient(145deg, #3ba874, #237c57);
  box-shadow: 0 8px 0 #176143, 0 13px 24px rgba(38, 120, 82, 0.23);
  font-size: 1.2rem;
}

.market-pay-game__completion-count {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 22px;
  padding: 12px 20px;
  border-radius: 18px;
  color: #326c43;
  background: rgba(255, 255, 255, 0.76);
}

.market-pay-game__completion-count strong {
  font-size: 2.4rem;
}

.market-pay-game__pause-layer {
  z-index: 20;
  background: rgba(38, 55, 66, 0.46);
}

.market-pay-game__pause-layer > div {
  width: min(420px, 100%);
  padding: 30px;
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 30px;
  color: #304455;
  background: #f5fbff;
  box-shadow: 0 24px 60px rgba(24, 46, 61, 0.28);
  text-align: center;
}

.market-pay-game__pause-layer span {
  display: block;
  margin-bottom: 8px;
  font-size: 3.5rem;
}

.market-pay-game__pause-layer strong {
  display: block;
  font-size: 1.6rem;
}

.market-pay-game__pause-layer p {
  margin: 10px 0 0;
  line-height: 1.55;
}

.market-pay-game.is-paused .market-pay-game__content,
.market-pay-game.is-paused .market-pay-game__topbar {
  filter: saturate(0.62);
  opacity: 0.72;
}

@media (max-width: 980px) {
  .market-pay-game__topbar {
    grid-template-columns: 1fr 1fr;
  }

  .market-pay-game__progress-panel {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .market-pay-game__content {
    grid-template-columns: minmax(220px, 0.65fr) minmax(430px, 1.35fr);
  }

  .market-pay-game__checkout-card {
    grid-template-columns: 1fr;
    grid-template-areas:
      "feedback"
      "tray"
      "coins"
      "actions";
  }

  .market-pay-game__product-card {
    min-height: 360px;
  }
}

@media (max-width: 760px) {
  .market-pay-game {
    padding: 10px;
  }

  .market-pay-game__topbar {
    grid-template-columns: 1fr;
    gap: 12px;
    border-radius: 20px;
  }

  .market-pay-game__progress-panel {
    grid-column: auto;
    grid-row: auto;
  }

  .market-pay-game__coin-summary {
    align-items: flex-start;
  }

  .market-pay-game__content {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .market-pay-game__product-card {
    min-height: auto;
    padding: 20px;
  }

  .market-pay-game__product-emoji {
    width: 128px;
    height: 128px;
    font-size: 4.6rem;
  }

  .market-pay-game__checkout-card {
    padding: 14px;
    border-radius: 24px;
  }

  .market-pay-game__actions {
    grid-template-columns: 1fr;
  }

  .market-pay-game__hint-button,
  .market-pay-game__check-button {
    min-height: 64px;
  }

  .market-pay-game__state-layer,
  .market-pay-game__pause-layer {
    position: fixed;
    padding: 14px;
  }
}

@media (max-width: 430px) {
  .market-pay-game__title-group {
    align-items: flex-start;
  }

  .market-pay-game__shop-icon {
    width: 48px;
    height: 48px;
  }

  .market-pay-game__feedback,
  .market-pay-game__tray-heading {
    align-items: flex-start;
  }

  .market-pay-game__feedback {
    padding: 12px;
  }

  .market-pay-game__tray-heading {
    flex-direction: column;
  }

  .market-pay-game__coin-buttons {
    gap: 12px;
  }

  .market-pay-game__coin-button {
    width: 112px;
    height: 112px;
  }

  .market-pay-game__state-card {
    padding: 24px 18px;
    border-radius: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .market-pay-game *,
  .market-pay-game *::before,
  .market-pay-game *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
