<template>
  <div class="body-signal-game">
    <header class="game-header">
      <div class="game-title">
        <span aria-hidden="true">💡</span>
        <div>
          <small>身体信号小灯塔</small>
          <h1>{{ phase === 'ready' ? '听懂身体的小提醒' : `第 ${currentRoundNumber} 轮` }}</h1>
        </div>
      </div>

      <div class="round-progress" aria-label="游戏进度">
        <span
          v-for="step in targetRounds"
          :key="step"
          class="progress-light"
          :class="{
            complete: step <= requestsCompleted,
            current: phase === 'playing' && step === currentRoundNumber,
          }"
        >
          <span class="sr-only">第 {{ step }} 轮</span>
        </span>
      </div>

      <button
        v-if="phase === 'playing'"
        class="hint-button"
        type="button"
        :disabled="paused"
        @click="playHint"
      >
        🔊 再提示一次
      </button>
    </header>

    <main v-if="phase === 'ready'" class="ready-panel">
      <div class="ready-lighthouse" aria-hidden="true">💡</div>
      <div class="ready-copy">
        <p>今天点亮 {{ targetRounds }} 盏信号灯</p>
        <h2>看看身体在告诉我们什么</h2>
        <span>先选择身体信号，再按住大按钮，把需要告诉大人。</span>
        <button class="start-button" type="button" :disabled="paused" @click="startGame">
          开始找信号
        </button>
      </div>
    </main>

    <main v-else-if="phase === 'playing'" class="play-panel">
      <section class="cue-card" aria-labelledby="body-signal-cue-title">
        <span class="cue-emoji" aria-hidden="true">{{ currentScenario.cueEmoji }}</span>
        <div>
          <small>身体小线索</small>
          <h2 id="body-signal-cue-title">{{ currentScenario.cueTitle }}</h2>
          <p>{{ currentScenario.cueText }}</p>
        </div>
      </section>

      <section v-if="recognizedSignal === null" class="task-card" aria-labelledby="signal-choice-title">
        <div class="stage-heading">
          <b>1</b>
          <div>
            <small>先认一认</small>
            <h2 id="signal-choice-title">这是哪个身体信号？</h2>
          </div>
        </div>

        <div class="signal-choices" :class="`count-${currentChoices.length}`">
          <button
            v-for="choice in currentChoices"
            :key="choice.id"
            class="signal-card"
            :class="{ wrong: wrongChoiceId === choice.id }"
            type="button"
            :disabled="paused"
            @click="chooseSignal(choice.id)"
          >
            <span aria-hidden="true">{{ choice.emoji }}</span>
            <strong>{{ choice.label }}</strong>
          </button>
        </div>
      </section>

      <section v-else class="task-card" aria-labelledby="request-stage-title">
        <div class="stage-heading">
          <b class="stage-complete">✓</b>
          <div>
            <small>认对啦，再表达出来</small>
            <h2 id="request-stage-title">持续按住，把需要告诉大人</h2>
          </div>
        </div>

        <div class="request-workspace">
          <div class="lighthouse" aria-hidden="true">
            <span
              class="beam"
              :style="{
                opacity: String(0.08 + holdProgress * 0.92),
                transform: `scale(${0.8 + holdProgress * 0.3})`,
              }"
            ></span>
            <span class="lamp">{{ holdProgress >= 1 ? '✨' : '💡' }}</span>
            <span class="tower"><i :style="{ height: `${holdPercent}%` }"></i></span>
          </div>

          <button
            class="request-button"
            :class="{ holding: isHolding }"
            type="button"
            :disabled="paused"
            :aria-pressed="isHolding"
            :aria-label="`持续按住${holdSecondsLabel}秒，表达：${requestSentence}`"
            @pointerdown.prevent="beginRequestHold"
            @pointerup.prevent="endRequestHold"
            @pointercancel="cancelRequestHold"
            @lostpointercapture="cancelRequestHold"
            @contextmenu.prevent
          >
            <span class="request-icon" aria-hidden="true">📣</span>
            <span class="request-copy">
              <small>{{ isHolding ? '继续按住……' : `按住 ${holdSecondsLabel} 秒` }}</small>
              <strong>“{{ requestSentence }}”</strong>
            </span>
            <span class="hold-meter" aria-hidden="true"><i :style="{ width: `${holdPercent}%` }"></i></span>
          </button>
        </div>
      </section>

      <p class="feedback" :class="feedbackTone" aria-live="polite">{{ feedbackMessage }}</p>
    </main>

    <main v-else class="finished-panel">
      <div aria-hidden="true">🌟</div>
      <p>全部点亮</p>
      <h2>你听懂了身体的信号，也把需要说出来啦！</h2>
      <strong>{{ requestsCompleted }} / {{ targetRounds }} 盏小灯塔</strong>
    </main>

    <div v-if="paused" class="pause-overlay" role="status" aria-live="polite">
      <span aria-hidden="true">⏸</span>
      <strong>休息一下</strong>
      <p>恢复后继续这一轮</p>
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
  BODY_SIGNAL_DIFFICULTIES,
  averageNonNegative,
  getBodySignalChoices,
  getBodySignalScenario,
  ratio,
} from '@/features/life-skills/new-games-core'

interface Props {
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}

type GamePhase = 'ready' | 'playing' | 'finished'
type SignalId = ReturnType<typeof getBodySignalScenario>['correctSignal']
type FeedbackTone = 'neutral' | 'encouraging' | 'success'

const props = defineProps<Props>()
const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const REQUEST_SENTENCES: Record<SignalId, string> = {
  toilet: '我想上厕所，请带我去。',
  hungry: '我肚子饿了，请帮帮我。',
  tired: '我身体累了，想休息一下。',
}

const phase = ref<GamePhase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const roundIndex = ref(0)
const recognizedSignal = ref<SignalId | null>(null)
const wrongChoiceId = ref<SignalId | null>(null)
const requestsCompleted = ref(0)
const recognizedSignals = ref(0)
const wrongSignalChoices = ref(0)
const requestHoldBreaks = ref(0)
const hintCount = ref(0)
const responseTimesMs = ref<number[]>([])
const holdProgress = ref(0)
const activePointerId = ref<number | null>(null)
const feedbackMessage = ref('先看看身体给了什么小线索。')
const feedbackTone = ref<FeedbackTone>('neutral')

let roundDirtyMarked = false
let completionEmitted = false
let sessionStartedAt: number | null = null
let pauseStartedAt: number | null = null
let accumulatedPauseMs = 0
let clueShownAtActiveMs = 0
let finishedActiveDurationMs: number | null = null
let holdStartedAt = 0
let holdTarget: HTMLElement | null = null
let holdAnimationFrame: number | null = null

const difficultyConfig = computed(() => BODY_SIGNAL_DIFFICULTIES[activeDifficulty.value])
const targetRounds = computed(() => difficultyConfig.value.targetRounds)
const currentScenario = computed(() => getBodySignalScenario(roundIndex.value))
const currentChoices = computed(() => getBodySignalChoices(currentScenario.value, activeDifficulty.value))
const currentRoundNumber = computed(() => Math.min(roundIndex.value + 1, targetRounds.value))
const requestSentence = computed(() => REQUEST_SENTENCES[currentScenario.value.correctSignal])
const holdPercent = computed(() => Math.round(ratio(holdProgress.value, 1) * 100))
const isHolding = computed(() => activePointerId.value !== null)
const holdSecondsLabel = computed(() => Number((difficultyConfig.value.holdToRequestMs / 1000).toFixed(2)))

function nowMs(): number {
  return performance.now()
}

function activeElapsedMs(at = nowMs()): number {
  if (sessionStartedAt === null) return 0
  if (finishedActiveDurationMs !== null) return finishedActiveDurationMs

  const activeEndpoint = pauseStartedAt ?? at
  return Math.max(0, activeEndpoint - sessionStartedAt - accumulatedPauseMs)
}

function markRoundDirtyOnce() {
  if (roundDirtyMarked) return
  roundDirtyMarked = true
  props.markRoundDirty?.()
}

function safelyEnsureAudioReady() {
  try {
    void props.audio.ensureReady().catch(() => {})
  } catch {
    // Audio feedback is optional; initialization failure must not block play.
  }
}

function safelyPlaySuccessCue() {
  try {
    void props.audio.playSuccessCue().catch(() => {})
  } catch {
    // Keep the interaction usable if audio is unavailable.
  }
}

function safelySpeak(text: string) {
  try {
    props.audio.speak(text)
  } catch {
    // Speech feedback must never block the round.
  }
}

function safelyStopAudio() {
  try {
    props.audio.stopAll()
  } catch {
    // Cleanup is best-effort if the controller is already disposed.
  }
}

function startGame() {
  if (phase.value !== 'ready' || props.paused) return

  activeDifficulty.value = props.difficulty
  const startedAt = nowMs()
  sessionStartedAt = startedAt
  pauseStartedAt = null
  accumulatedPauseMs = 0
  clueShownAtActiveMs = 0
  finishedActiveDurationMs = null
  phase.value = 'playing'
  markRoundDirtyOnce()
  safelyEnsureAudioReady()
}

function chooseSignal(signalId: SignalId) {
  if (phase.value !== 'playing' || props.paused || recognizedSignal.value !== null) return

  if (signalId !== currentScenario.value.correctSignal) {
    wrongSignalChoices.value += 1
    wrongChoiceId.value = signalId
    feedbackMessage.value = '慢慢来，换一张图卡试试。'
    feedbackTone.value = 'encouraging'
    return
  }

  responseTimesMs.value.push(Math.max(0, Math.round(activeElapsedMs() - clueShownAtActiveMs)))
  recognizedSignals.value += 1
  recognizedSignal.value = signalId
  wrongChoiceId.value = null
  feedbackMessage.value = '你发现了身体信号！现在把需要告诉大人。'
  feedbackTone.value = 'success'
}

function playHint() {
  if (phase.value !== 'playing' || props.paused) return

  hintCount.value += 1
  if (recognizedSignal.value === null) {
    safelySpeak(`听一听身体线索：${currentScenario.value.cueText}。这是哪个身体信号？`)
    feedbackMessage.value = '再听一遍线索，看看哪张图卡最合适。'
  } else {
    safelySpeak(`请说：${requestSentence.value}。再持续按住大按钮。`)
    feedbackMessage.value = '跟着提示说一说，再持续按住大按钮。'
  }
  feedbackTone.value = 'neutral'
}

function beginRequestHold(event: PointerEvent) {
  if (
    phase.value !== 'playing'
    || props.paused
    || recognizedSignal.value === null
    || activePointerId.value !== null
  ) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return

  activePointerId.value = event.pointerId
  holdTarget = target
  holdStartedAt = nowMs()
  holdProgress.value = 0

  try {
    target.setPointerCapture(event.pointerId)
  } catch {
    // Normal pointer delivery remains a fallback when capture fails.
  }

  holdAnimationFrame = window.requestAnimationFrame(updateRequestHold)
}

function updateRequestHold(timestamp: number) {
  holdAnimationFrame = null
  if (
    activePointerId.value === null
    || phase.value !== 'playing'
    || props.paused
    || recognizedSignal.value === null
  ) {
    resetRequestHold()
    return
  }

  holdProgress.value = ratio(timestamp - holdStartedAt, difficultyConfig.value.holdToRequestMs)
  if (holdProgress.value >= 1) {
    completeRequest()
    return
  }
  holdAnimationFrame = window.requestAnimationFrame(updateRequestHold)
}

function endRequestHold(event: PointerEvent) {
  if (event.pointerId !== activePointerId.value) return

  if (
    !props.paused
    && phase.value === 'playing'
    && nowMs() - holdStartedAt >= difficultyConfig.value.holdToRequestMs
  ) {
    completeRequest()
    return
  }

  const shouldCountBreak = !props.paused && phase.value === 'playing'
  resetRequestHold()
  if (shouldCountBreak) {
    requestHoldBreaks.value += 1
    feedbackMessage.value = '可以再按一次，慢慢把灯塔点亮。'
    feedbackTone.value = 'encouraging'
  }
}

function cancelRequestHold(event?: PointerEvent) {
  if (event && event.pointerId !== activePointerId.value) return
  resetRequestHold()
}

function resetRequestHold() {
  if (holdAnimationFrame !== null) {
    window.cancelAnimationFrame(holdAnimationFrame)
    holdAnimationFrame = null
  }

  const pointerId = activePointerId.value
  const target = holdTarget
  activePointerId.value = null
  holdTarget = null
  holdStartedAt = 0
  holdProgress.value = 0

  if (pointerId === null || target === null) return
  try {
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
  } catch {
    // Capture may already be released by pointerup or DOM removal.
  }
}

function completeRequest() {
  if (
    phase.value !== 'playing'
    || props.paused
    || recognizedSignal.value === null
    || completionEmitted
  ) {
    resetRequestHold()
    return
  }

  resetRequestHold()
  requestsCompleted.value += 1
  safelyPlaySuccessCue()

  if (requestsCompleted.value >= targetRounds.value) {
    finishGame()
    return
  }

  roundIndex.value += 1
  recognizedSignal.value = null
  wrongChoiceId.value = null
  clueShownAtActiveMs = activeElapsedMs()
  feedbackMessage.value = '灯塔亮了！再看看下一个身体信号。'
  feedbackTone.value = 'success'
}

function finishGame() {
  if (completionEmitted) return
  completionEmitted = true
  finishedActiveDurationMs = activeElapsedMs()
  phase.value = 'finished'
  safelySpeak('小灯塔全部点亮啦！你能听懂身体信号，也会告诉大人。')
  emit('complete', buildCompletionPayload())
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  return {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'signal-recognition-and-request',
      target_rounds: targetRounds.value,
      recognized_signals: recognizedSignals.value,
      wrong_signal_choices: wrongSignalChoices.value,
      requests_completed: requestsCompleted.value,
      request_hold_breaks: requestHoldBreaks.value,
      hint_count: hintCount.value,
      response_times_ms: [...responseTimesMs.value],
      average_response_ms: averageNonNegative(responseTimesMs.value),
      total_duration_seconds: Number((activeElapsedMs() / 1000).toFixed(1)),
      difficulty_level: activeDifficulty.value,
    },
  }
}

function pauseSessionClock() {
  if (phase.value !== 'playing' || sessionStartedAt === null || pauseStartedAt !== null) return
  pauseStartedAt = nowMs()
}

function resumeSessionClock() {
  if (pauseStartedAt === null) return
  accumulatedPauseMs += Math.max(0, nowMs() - pauseStartedAt)
  pauseStartedAt = null
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
    if (isPaused) {
      pauseSessionClock()
      resetRequestHold()
      safelyStopAudio()
    } else {
      resumeSessionClock()
    }
  },
)

onBeforeUnmount(() => {
  resetRequestHold()
  safelyStopAudio()
})
</script>

<style scoped>
.body-signal-game {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 100%;
  padding: clamp(12px, 2vw, 24px);
  overflow: auto;
  color: #23404d;
  background: radial-gradient(circle at 88% 12%, #fff2a9aa, transparent 26%),
    linear-gradient(150deg, #ecfeff, #e0f2fe 48%, #fef9c3);
  font-family: inherit;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.game-header {
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(210px, auto) minmax(180px, 1fr) auto;
  align-items: center;
  gap: clamp(10px, 2vw, 24px);
  padding: 12px clamp(14px, 2vw, 22px);
  border: 1px solid #ffffffcc;
  border-radius: 22px;
  background: #ffffffc7;
  box-shadow: 0 10px 30px #23404d17;
  backdrop-filter: blur(12px);
}

.game-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-title > span {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border-radius: 16px;
  background: #fff5b8;
  font-size: 1.8rem;
}

small {
  color: #0e7490;
  font-weight: 800;
  letter-spacing: 0.04em;
}

h1,
h2,
p {
  margin: 0;
}

.game-title h1 {
  margin-top: 2px;
  font-size: clamp(1.05rem, 2vw, 1.35rem);
}

.round-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.progress-light {
  width: clamp(28px, 5vw, 58px);
  height: 12px;
  border-radius: 99px;
  background: #d9e8ec;
}

.progress-light.current {
  background: #7dd3fc;
  box-shadow: 0 0 0 4px #7dd3fc33;
}

.progress-light.complete {
  background: linear-gradient(90deg, #facc15, #fb923c);
  box-shadow: 0 0 12px #facc1577;
}

button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: default;
  opacity: 0.62;
}

.hint-button {
  min-width: 132px;
  min-height: 48px;
  padding: 10px 16px;
  border-radius: 16px;
  color: #24536a;
  background: #e0f2fe;
  font-weight: 800;
}

.ready-panel,
.finished-panel {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: clamp(34px, 8vw, 96px);
  min-height: 430px;
  padding: clamp(30px, 6vw, 72px);
}

.ready-lighthouse {
  display: grid;
  width: clamp(180px, 26vw, 300px);
  height: clamp(250px, 35vw, 360px);
  place-items: start center;
  padding-top: 35px;
  border-radius: 48% 48% 20% 20%;
  background: linear-gradient(75deg, #fff 20%, #fb7185 21% 38%, #fff 39% 58%, #fb7185 59% 75%, #fff 76%);
  box-shadow: 0 0 55px #facc1566, 0 18px 36px #23404d26;
  clip-path: polygon(28% 0, 72% 0, 92% 100%, 8% 100%);
  font-size: clamp(4rem, 9vw, 7rem);
}

.ready-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 570px;
  gap: 14px;
}

.ready-copy p {
  color: #0e7490;
  font-weight: 900;
}

.ready-copy h2 {
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.14;
}

.ready-copy > span {
  color: #52717d;
  font-size: clamp(1.05rem, 2vw, 1.3rem);
  line-height: 1.75;
}

.start-button {
  min-width: 220px;
  min-height: 76px;
  margin-top: 8px;
  padding: 16px 32px;
  border-radius: 24px;
  color: white;
  background: linear-gradient(135deg, #0891b2, #0e7490);
  box-shadow: 0 14px 26px #0e749044;
  font-size: 1.3rem;
  font-weight: 900;
}

.play-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  flex: 1;
  gap: clamp(12px, 2vw, 20px);
  width: min(1180px, 100%);
  margin: 0 auto;
  padding-top: clamp(14px, 2vw, 24px);
}

.cue-card {
  display: flex;
  align-items: center;
  gap: clamp(18px, 3vw, 30px);
  padding: clamp(18px, 2.5vw, 28px);
  border: 2px solid #7dd3fc88;
  border-radius: 28px;
  background: #ffffffe6;
  box-shadow: 0 12px 30px #23404d17;
}

.cue-emoji {
  display: grid;
  flex: 0 0 clamp(100px, 13vw, 150px);
  height: clamp(100px, 13vw, 150px);
  place-items: center;
  border-radius: 30px;
  background: linear-gradient(145deg, #e0f2fe, #fef9c3);
  font-size: clamp(4rem, 8vw, 6.4rem);
}

.cue-card h2 {
  margin: 4px 0 8px;
  font-size: clamp(1.45rem, 3vw, 2.25rem);
}

.cue-card p {
  color: #4b6873;
  font-size: clamp(1rem, 2vw, 1.28rem);
  font-weight: 700;
  line-height: 1.55;
}

.task-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: clamp(16px, 2vw, 24px);
  border-radius: 28px;
  background: #ffffff94;
}

.stage-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.stage-heading > b {
  display: grid;
  flex: 0 0 48px;
  height: 48px;
  place-items: center;
  border-radius: 16px;
  color: white;
  background: #0891b2;
  font-size: 1.25rem;
}

.stage-heading > b.stage-complete {
  background: #22c55e;
}

.stage-heading h2 {
  margin-top: 2px;
  font-size: clamp(1.2rem, 2.2vw, 1.65rem);
}

.signal-choices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  flex: 1;
  gap: clamp(12px, 2vw, 22px);
  min-height: 170px;
}

.signal-choices.count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: min(820px, 100%);
  margin: auto;
}

.signal-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 168px;
  padding: 18px;
  border: 3px solid transparent;
  border-radius: 28px;
  color: #284d5b;
  background: white;
  box-shadow: 0 10px 24px #23404d1c;
  touch-action: manipulation;
  transition: 140ms ease;
}

.signal-card:hover:not(:disabled) {
  border-color: #7dd3fc;
  transform: translateY(-3px);
}

.signal-card.wrong {
  border-color: #fdba74;
  background: #fff7ed;
}

.signal-card > span {
  font-size: clamp(4rem, 8vw, 6.2rem);
  line-height: 1;
}

.signal-card strong {
  font-size: clamp(1.15rem, 2.3vw, 1.55rem);
}

.request-workspace {
  display: grid;
  grid-template-columns: minmax(190px, 0.7fr) minmax(360px, 1.5fr);
  align-items: center;
  flex: 1;
  gap: clamp(20px, 4vw, 52px);
  min-height: 190px;
}

.lighthouse {
  position: relative;
  justify-self: center;
  width: 210px;
  height: 210px;
}

.beam {
  position: absolute;
  z-index: 0;
  top: 35px;
  left: 50%;
  width: 150px;
  height: 66px;
  border-radius: 50%;
  background: linear-gradient(90deg, #facc15dd, transparent);
  filter: blur(4px);
  transform-origin: left center;
}

.lamp {
  position: absolute;
  z-index: 2;
  top: 38px;
  left: 68px;
  display: grid;
  width: 58px;
  height: 54px;
  place-items: center;
  border: 6px solid #fef3c7;
  border-radius: 16px;
  background: #facc15;
  box-shadow: 0 0 35px #facc1599;
  font-size: 1.8rem;
}

.tower {
  position: absolute;
  bottom: 4px;
  left: 68px;
  width: 70px;
  height: 130px;
  overflow: hidden;
  border-radius: 12px;
  background: white;
  box-shadow: 0 10px 22px #23404d2e;
  clip-path: polygon(17% 0, 83% 0, 100% 100%, 0 100%);
}

.tower i {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(#fde047, #fb923c);
}

.request-button {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 18px;
  width: 100%;
  min-height: 150px;
  padding: 24px 28px 36px;
  overflow: hidden;
  border: 4px solid #fef3c7;
  border-radius: 32px;
  color: #743c09;
  background: linear-gradient(145deg, #fef9c3, #fed7aa);
  box-shadow: 0 14px 30px #c269122e;
  text-align: left;
  touch-action: none;
}

.request-button.holding {
  border-color: #facc15;
  background: linear-gradient(145deg, #fef08a, #fdba74);
  transform: scale(0.99);
}

.request-icon {
  font-size: clamp(3.8rem, 7vw, 5.5rem);
}

.request-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.request-copy strong {
  font-size: clamp(1.2rem, 2.6vw, 1.8rem);
  line-height: 1.35;
}

.hold-meter {
  position: absolute;
  right: 24px;
  bottom: 18px;
  left: 24px;
  height: 12px;
  overflow: hidden;
  border-radius: 99px;
  background: #ffffffaa;
}

.hold-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f59e0b, #facc15);
}

.feedback {
  min-height: 28px;
  padding: 10px 18px;
  border-radius: 16px;
  text-align: center;
  font-size: clamp(1rem, 1.8vw, 1.15rem);
  font-weight: 800;
}

.feedback.neutral { color: #356274; background: #e0f2fecc; }
.feedback.encouraging { color: #9a4b0b; background: #ffedd5e6; }
.feedback.success { color: #166534; background: #dcfce7e6; }

.finished-panel {
  flex-direction: column;
  gap: 14px;
  text-align: center;
}

.finished-panel > div {
  display: grid;
  width: clamp(150px, 22vw, 230px);
  height: clamp(150px, 22vw, 230px);
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle, white 22%, #fef08a 23% 48%, #facc1526 49% 70%, transparent 71%);
  font-size: clamp(5rem, 10vw, 8rem);
}

.finished-panel h2 {
  max-width: 720px;
  font-size: clamp(1.7rem, 3.4vw, 2.8rem);
}

.finished-panel > strong {
  padding: 14px 28px;
  border-radius: 22px;
  color: #ea580c;
  background: #ffffffcc;
  font-size: 1.5rem;
}

.pause-overlay {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f0f9ffdb;
  backdrop-filter: blur(9px);
  text-align: center;
}

.pause-overlay > span {
  display: grid;
  width: 92px;
  height: 92px;
  place-items: center;
  border-radius: 30px;
  color: white;
  background: #0e7490;
  font-size: 2.8rem;
}

.pause-overlay strong { margin-top: 10px; font-size: 2rem; }
.pause-overlay p { color: #52717d; font-size: 1.1rem; }

button:focus-visible {
  outline: 5px solid #0e749057;
  outline-offset: 4px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 820px) {
  .game-header { grid-template-columns: 1fr auto; }
  .round-progress { grid-column: 1 / -1; grid-row: 2; }
  .ready-panel { flex-direction: column; min-height: auto; padding: 32px 16px; text-align: center; }
  .ready-copy { align-items: center; }
  .ready-lighthouse { width: 160px; height: 220px; }
  .signal-choices,
  .signal-choices.count-2 { grid-template-columns: 1fr; }
  .signal-card { flex-direction: row; min-height: 112px; }
  .signal-card > span { font-size: 4rem; }
  .request-workspace { grid-template-columns: 1fr; }
  .lighthouse { height: 150px; transform: scale(0.72); margin: -25px 0; }
}

@media (max-width: 520px) {
  .body-signal-game { padding: 9px; }
  .game-header { grid-template-columns: 1fr; }
  .hint-button { grid-row: 2; width: 100%; }
  .round-progress { grid-row: 3; }
  .cue-card { align-items: flex-start; }
  .cue-emoji { flex-basis: 86px; height: 86px; font-size: 3.7rem; }
  .request-button { grid-template-columns: 1fr; text-align: center; }
  .request-icon { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; }
}
</style>
