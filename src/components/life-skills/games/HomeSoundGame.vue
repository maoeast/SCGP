<template>
  <section
    class="home-sound-game"
    :class="{
      'is-paused': props.paused,
      'is-complete': phase === 'completed',
    }"
  >
    <header class="game-header">
      <div class="title-block">
        <span class="title-icon" aria-hidden="true">🏠</span>
        <div>
          <p class="eyebrow">居家安全练习</p>
          <h1>家里声音小侦探</h1>
        </div>
      </div>

      <div class="progress-block" aria-label="游戏进度" aria-live="polite">
        <div class="progress-copy">
          <span>安全任务</span>
          <strong>{{ safeResponses }} / {{ difficultyConfig.targetRounds }}</strong>
        </div>
        <div class="progress-dots" aria-hidden="true">
          <span
            v-for="step in difficultyConfig.targetRounds"
            :key="step"
            :class="{
              'is-complete': step <= safeResponses,
              'is-current': phase === 'playing' && step === currentRoundNumber,
            }"
          >
            {{ step <= safeResponses ? '✓' : step }}
          </span>
        </div>
      </div>

      <div class="support-chip">
        <span aria-hidden="true">🔈</span>
        <div>
          <small>本轮支持</small>
          <strong>{{ supportLabel }}</strong>
        </div>
      </div>
    </header>

    <main v-if="phase === 'ready'" class="ready-panel">
      <div class="ready-scene" aria-hidden="true">
        <div class="sound-ring sound-ring--outer" />
        <div class="sound-ring sound-ring--inner" />
        <span class="ready-house">🏡</span>
        <span class="ready-note ready-note--one">♪</span>
        <span class="ready-note ready-note--two">♫</span>
      </div>

      <div class="ready-copy">
        <p class="ready-kicker">听一听 · 找一找 · 安全做</p>
        <h2>准备发现家里的声音了吗？</h2>
        <p>每轮先找到声音从哪里来，再从两张行动卡里选出安全做法。声音也会一直写在屏幕上。</p>
        <ul>
          <li><span aria-hidden="true">👂</span> 可以听，也可以只看文字</li>
          <li><span aria-hidden="true">🔁</span> 想再听一次时，可以随时重播</li>
          <li><span aria-hidden="true">🌿</span> 没有倒计时，慢慢选择就好</li>
        </ul>
        <button
          class="primary-button start-button"
          type="button"
          :disabled="props.paused"
          @click="startGame"
        >
          <span aria-hidden="true">🔎</span>
          开始找声音
        </button>
      </div>
    </main>

    <main v-else-if="phase === 'playing'" class="play-panel">
      <section class="sound-card" aria-labelledby="sound-cue-title">
        <div class="sound-card__topline">
          <span>第 {{ currentRoundNumber }} 轮</span>
          <span class="text-alternative-badge">
            <span aria-hidden="true">Aa</span>
            可见声音文字
          </span>
        </div>

        <div class="sound-presentation">
          <div class="speaker-orb" aria-hidden="true">
            <span>🔊</span>
            <i class="speaker-wave speaker-wave--one" />
            <i class="speaker-wave speaker-wave--two" />
          </div>
          <div class="sound-copy">
            <p>听到的声音</p>
            <h2 id="sound-cue-title">“{{ currentRound.soundCue }}”</h2>
            <span>声音文字会一直留在这里，可以按自己的方式观察。</span>
          </div>
        </div>

        <div v-if="stage !== 'round-success'" class="sound-tools">
          <button
            class="tool-button replay-button"
            type="button"
            :disabled="props.paused"
            @click="replaySound"
          >
            <span aria-hidden="true">↻</span>
            <span>
              <strong>再听一次</strong>
              <small>不会算作错误</small>
            </span>
          </button>
          <button
            class="tool-button hint-button"
            type="button"
            :disabled="props.paused"
            @click="showTeacherHint"
          >
            <span aria-hidden="true">💡</span>
            <span>
              <strong>教师提示</strong>
              <small>给我一个小线索</small>
            </span>
          </button>
        </div>
      </section>

      <section class="task-card" :aria-labelledby="taskTitleId">
        <div class="stage-heading">
          <span class="stage-number" aria-hidden="true">{{ stage === 'source' ? '1' : '2' }}</span>
          <div>
            <p>{{ stageEyebrow }}</p>
            <h2 :id="taskTitleId">{{ stageTitle }}</h2>
          </div>
        </div>

        <div class="feedback-strip" :data-tone="feedbackTone" role="status" aria-live="polite">
          <span aria-hidden="true">{{ feedbackIcon }}</span>
          <p>{{ feedbackMessage }}</p>
        </div>

        <div
          v-if="stage === 'source'"
          class="source-grid"
          :class="`has-${sourceChoices.length}-choices`"
          role="group"
          aria-labelledby="source-choice-title"
        >
          <span id="source-choice-title" class="sr-only">选择声音来源</span>
          <button
            v-for="choice in sourceChoices"
            :key="choice.id"
            class="source-choice"
            :class="{
              'is-wrong': wrongSourceId === choice.id,
              'is-hinted': teacherHintVisible && choice.id === currentRound.id,
            }"
            type="button"
            :disabled="props.paused"
            @click="chooseSource(choice.id)"
          >
            <span class="source-choice__emoji" aria-hidden="true">{{ choice.sourceEmoji }}</span>
            <span class="source-choice__label">{{ choice.sourceLabel }}</span>
            <small v-if="wrongSourceId === choice.id">再听一听，换一张试试</small>
            <small v-else-if="teacherHintVisible && choice.id === currentRound.id"
              >小提示在这里</small
            >
            <small v-else>点一下选择</small>
          </button>
        </div>

        <div v-else-if="stage === 'action'" class="action-stage">
          <div class="matched-source" aria-label="已经找到的声音来源">
            <span aria-hidden="true">{{ currentRound.sourceEmoji }}</span>
            <div>
              <small>声音来源找到了</small>
              <strong>{{ currentRound.sourceLabel }}</strong>
            </div>
            <b aria-hidden="true">✓</b>
          </div>

          <div class="action-grid" role="group" aria-labelledby="action-choice-title">
            <span id="action-choice-title" class="sr-only">选择安全行动</span>
            <button
              v-for="choice in actionChoices"
              :key="choice.id"
              class="action-choice"
              :class="{
                'is-wrong': wrongActionId === choice.id,
                'is-hinted': teacherHintVisible && choice.id === 'safe',
              }"
              type="button"
              :disabled="props.paused"
              @click="chooseAction(choice.id)"
            >
              <span class="action-choice__icon" aria-hidden="true">{{ choice.icon }}</span>
              <span class="action-choice__copy">
                <strong>{{ choice.label }}</strong>
                <small v-if="wrongActionId === choice.id">这个做法不够安全，再选一次</small>
                <small v-else-if="teacherHintVisible && choice.id === 'safe'">这张卡更安全</small>
                <small v-else>点一下选择</small>
              </span>
            </button>
          </div>
        </div>

        <div v-else class="round-success">
          <div class="success-mark" aria-hidden="true">🛡️</div>
          <p>本轮安全任务完成</p>
          <h2>{{ currentRound.sourceLabel }}的安全做法找对了</h2>
          <span>{{ currentRound.safeAction }}</span>
          <button
            class="primary-button next-button"
            type="button"
            :disabled="props.paused"
            @click="goToNextRound"
          >
            听下一个声音
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </main>

    <main v-else class="completed-panel">
      <div class="completion-house" aria-hidden="true">🏡</div>
      <p class="completion-kicker">侦探任务完成</p>
      <h2>家里的声音都找到了！</h2>
      <p>你会辨认声音来源，也知道遇到这些声音时怎样做更安全。</p>
      <div class="completion-summary">
        <div>
          <strong>{{ sourceMatches }}</strong>
          <span>个声音来源</span>
        </div>
        <div>
          <strong>{{ safeResponses }}</strong>
          <span>个安全做法</span>
        </div>
      </div>
    </main>

    <Transition name="pause-fade">
      <div v-if="props.paused" class="pause-layer" role="status" aria-live="assertive">
        <div class="pause-card">
          <span aria-hidden="true">⏸</span>
          <strong>游戏暂停了</strong>
          <p>声音和计时都已停下，恢复后从这里继续。</p>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
} from '@/types/emotional/games'
import {
  HOME_SOUND_DIFFICULTIES,
  averageNonNegative,
  buildHomeSoundSourceChoices,
  getHomeSoundRound,
} from '@/features/life-skills/new-games-core'

type GamePhase = 'ready' | 'playing' | 'completed'
type RoundStage = 'source' | 'action' | 'round-success'
type FeedbackTone = 'neutral' | 'encouraging' | 'success' | 'hint'
type SafetyChoiceId = 'safe' | 'unsafe'

interface SafetyChoice {
  id: SafetyChoiceId
  icon: string
  label: string
}

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
const stage = ref<RoundStage>('source')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const roundIndex = ref(0)
const sourceMatches = ref(0)
const wrongSourceChoices = ref(0)
const safeResponses = ref(0)
const unsafeResponseChoices = ref(0)
const replayCount = ref(0)
const hintCount = ref(0)
const responseTimesMs = ref<number[]>([])
const wrongSourceId = ref<string | null>(null)
const wrongActionId = ref<SafetyChoiceId | null>(null)
const teacherHintVisible = ref(false)
const feedbackTone = ref<FeedbackTone>('neutral')
const feedbackMessage = ref('先听声音，再选择它从哪里来。')

let roundDirtyMarked = false
let completionEmitted = false
let sessionStartedAt: number | null = null
let pauseStartedAt: number | null = null
let accumulatedPauseMs = 0
let roundPresentedAtActiveMs = 0
let finishedActiveDurationMs: number | null = null

const difficultyConfig = computed(() => HOME_SOUND_DIFFICULTIES[activeDifficulty.value])
const currentRound = computed(() => getHomeSoundRound(roundIndex.value))
const sourceChoices = computed(() =>
  buildHomeSoundSourceChoices(roundIndex.value, activeDifficulty.value),
)
const currentRoundNumber = computed(() =>
  Math.min(roundIndex.value + 1, difficultyConfig.value.targetRounds),
)
const supportLabel = computed(() =>
  difficultyConfig.value.autoReplay
    ? '图文突出 · 每轮播放一次'
    : `${difficultyConfig.value.sourceChoiceCount} 个来源 · 可手动重播`,
)
const actionChoices = computed<readonly SafetyChoice[]>(() => {
  const safeChoice: SafetyChoice = {
    id: 'safe',
    icon: '🛡️',
    label: currentRound.value.safeAction,
  }
  const unsafeChoice: SafetyChoice = {
    id: 'unsafe',
    icon: '🤔',
    label: currentRound.value.unsafeAction,
  }
  return roundIndex.value % 2 === 0 ? [safeChoice, unsafeChoice] : [unsafeChoice, safeChoice]
})
const stageEyebrow = computed(() => {
  if (stage.value === 'source') return '第一步 · 找来源'
  if (stage.value === 'action') return '第二步 · 选做法'
  return '本轮完成'
})
const stageTitle = computed(() => {
  if (stage.value === 'source') return '这个声音从哪里来？'
  if (stage.value === 'action') return '听到这个声音，怎样做更安全？'
  return '安全做法找到了'
})
const taskTitleId = computed(() => `home-sound-task-${stage.value}`)
const feedbackIcon = computed(() => {
  if (feedbackTone.value === 'success') return '✓'
  if (feedbackTone.value === 'encouraging') return '↻'
  if (feedbackTone.value === 'hint') return '💡'
  return '👂'
})

function nowMs(): number {
  return performance.now()
}

function activeElapsedMs(at = nowMs()): number {
  if (sessionStartedAt === null) return 0
  if (finishedActiveDurationMs !== null) return finishedActiveDurationMs

  const activeEndpoint = pauseStartedAt ?? at
  return Math.max(0, activeEndpoint - sessionStartedAt - accumulatedPauseMs)
}

function markRoundDirtyOnce(): void {
  if (roundDirtyMarked) return
  roundDirtyMarked = true
  props.markRoundDirty?.()
}

function safelyEnsureAudioReady(): void {
  try {
    void props.audio.ensureReady().catch(() => {
      // The visible sound text keeps the task usable when audio initialization fails.
    })
  } catch {
    // A controller can already be unavailable during teardown; visual play remains intact.
  }
}

function safelyPlaySoftCue(): void {
  try {
    void props.audio.playSoftBounce().catch(() => {
      // Optional feedback must not interrupt a choice.
    })
  } catch {
    // Keep the interaction available without sound effects.
  }
}

function safelyPlaySuccessCue(): void {
  try {
    void props.audio.playSuccessCue().catch(() => {
      // Completion remains visible when the optional cue cannot play.
    })
  } catch {
    // Keep the interaction available without sound effects.
  }
}

function safelySpeak(text: string): void {
  try {
    props.audio.speak(text)
  } catch {
    // Every spoken message also has a persistent visual alternative.
  }
}

function safelyStopAudio(): void {
  try {
    props.audio.stopAll()
  } catch {
    // Cleanup is best-effort if the shared controller is already disposed.
  }
}

function startGame(): void {
  if (props.paused || phase.value !== 'ready') return

  activeDifficulty.value = props.difficulty
  roundIndex.value = 0
  sourceMatches.value = 0
  wrongSourceChoices.value = 0
  safeResponses.value = 0
  unsafeResponseChoices.value = 0
  replayCount.value = 0
  hintCount.value = 0
  responseTimesMs.value = []

  const startedAt = nowMs()
  sessionStartedAt = startedAt
  pauseStartedAt = null
  accumulatedPauseMs = 0
  finishedActiveDurationMs = null
  phase.value = 'playing'

  markRoundDirtyOnce()
  safelyEnsureAudioReady()
  presentRound(startedAt)
}

function presentRound(at = nowMs()): void {
  stage.value = 'source'
  wrongSourceId.value = null
  wrongActionId.value = null
  teacherHintVisible.value = false
  feedbackTone.value = 'neutral'
  feedbackMessage.value = '先听声音，再选择它从哪里来。'
  roundPresentedAtActiveMs = activeElapsedMs(at)
  safelySpeak(currentRound.value.soundCue)
}

function chooseSource(sourceId: string): void {
  if (props.paused || phase.value !== 'playing' || stage.value !== 'source') return

  if (sourceId !== currentRound.value.id) {
    wrongSourceChoices.value += 1
    wrongSourceId.value = sourceId
    feedbackTone.value = 'encouraging'
    feedbackMessage.value = '这张卡和声音不太一样。文字还在，可以再听再选。'
    safelyPlaySoftCue()
    return
  }

  sourceMatches.value += 1
  wrongSourceId.value = null
  wrongActionId.value = null
  teacherHintVisible.value = false
  stage.value = 'action'
  feedbackTone.value = 'success'
  feedbackMessage.value = `找到了，是${currentRound.value.sourceLabel}。现在选择安全做法。`
  safelyPlaySoftCue()
}

function chooseAction(actionId: SafetyChoiceId): void {
  if (props.paused || phase.value !== 'playing' || stage.value !== 'action') return

  if (actionId === 'unsafe') {
    unsafeResponseChoices.value += 1
    wrongActionId.value = actionId
    feedbackTone.value = 'encouraging'
    feedbackMessage.value = '这个做法可能不够安全。卡片会留下来，再选一次。'
    safelyPlaySoftCue()
    return
  }

  const completedAt = nowMs()
  safeResponses.value += 1
  responseTimesMs.value.push(
    Math.max(0, Math.round(activeElapsedMs(completedAt) - roundPresentedAtActiveMs)),
  )
  wrongActionId.value = null
  teacherHintVisible.value = false
  feedbackTone.value = 'success'
  feedbackMessage.value = '选对了，这是更安全的做法。'
  safelyPlaySuccessCue()

  if (safeResponses.value >= difficultyConfig.value.targetRounds) {
    finishGame(completedAt)
    return
  }

  stage.value = 'round-success'
}

function replaySound(): void {
  if (props.paused || phase.value !== 'playing' || stage.value === 'round-success') return

  replayCount.value += 1
  safelySpeak(currentRound.value.soundCue)
  feedbackTone.value = 'neutral'
  feedbackMessage.value = '声音重新播放了，也可以继续看屏幕上的文字。'
}

function showTeacherHint(): void {
  if (props.paused || phase.value !== 'playing' || stage.value === 'round-success') return

  hintCount.value += 1
  teacherHintVisible.value = true
  feedbackTone.value = 'hint'

  if (stage.value === 'source') {
    const message = `小提示：这个声音来自${currentRound.value.sourceLabel}。`
    feedbackMessage.value = message
    safelySpeak(message)
    return
  }

  const message = `小提示：更安全的做法是${currentRound.value.safeAction}。`
  feedbackMessage.value = message
  safelySpeak(message)
}

function goToNextRound(): void {
  if (props.paused || phase.value !== 'playing' || stage.value !== 'round-success') return

  roundIndex.value += 1
  presentRound()
}

function finishGame(at: number): void {
  if (completionEmitted) return

  completionEmitted = true
  finishedActiveDurationMs = activeElapsedMs(at)
  phase.value = 'completed'

  emit('complete', {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'sound-source-safety-match',
      target_rounds: difficultyConfig.value.targetRounds,
      source_matches: sourceMatches.value,
      wrong_source_choices: wrongSourceChoices.value,
      safe_responses: safeResponses.value,
      unsafe_response_choices: unsafeResponseChoices.value,
      replay_count: replayCount.value,
      hint_count: hintCount.value,
      response_times_ms: [...responseTimesMs.value],
      average_response_ms: averageNonNegative(responseTimesMs.value),
      total_duration_seconds: Number((finishedActiveDurationMs / 1000).toFixed(1)),
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
    const at = nowMs()

    if (isPaused) {
      if (phase.value === 'playing' && sessionStartedAt !== null && pauseStartedAt === null) {
        pauseStartedAt = at
      }
      safelyStopAudio()
      return
    }

    if (pauseStartedAt !== null) {
      accumulatedPauseMs += Math.max(0, at - pauseStartedAt)
      pauseStartedAt = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  safelyStopAudio()
})
</script>

<style scoped>
.home-sound-game,
.home-sound-game * {
  box-sizing: border-box;
}

.home-sound-game {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  padding: clamp(12px, 2vw, 24px);
  overflow: auto;
  color: #28435a;
  background:
    radial-gradient(circle at 10% 8%, rgba(255, 255, 255, 0.92) 0 7%, transparent 26%),
    radial-gradient(circle at 90% 10%, rgba(255, 226, 164, 0.38) 0 6%, transparent 24%),
    linear-gradient(145deg, #eaf7f5 0%, #f8f4df 52%, #f5e7d7 100%);
  font-family: inherit;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.home-sound-game button {
  color: inherit;
  font: inherit;
  touch-action: manipulation;
}

.home-sound-game button:focus-visible {
  outline: 4px solid rgba(43, 112, 153, 0.38);
  outline-offset: 4px;
}

.home-sound-game button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.game-header {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(230px, auto) minmax(250px, 1fr) minmax(200px, auto);
  align-items: center;
  gap: clamp(12px, 2vw, 24px);
  padding: 14px clamp(14px, 2vw, 22px);
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 14px 34px rgba(55, 77, 87, 0.1);
  backdrop-filter: blur(12px);
}

.title-block,
.support-chip,
.progress-copy,
.sound-card__topline,
.text-alternative-badge,
.stage-heading,
.matched-source {
  display: flex;
  align-items: center;
}

.title-block {
  gap: 13px;
}

.title-icon {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 19px;
  background: #e7f2ed;
  box-shadow: inset 0 0 0 2px rgba(74, 120, 107, 0.1);
  font-size: 34px;
}

.eyebrow,
.ready-kicker,
.completion-kicker,
.stage-heading p,
.sound-copy > p {
  margin: 0;
  color: #52766f;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.title-block h1 {
  margin: 3px 0 0;
  color: #213e50;
  font-size: clamp(1.18rem, 2vw, 1.55rem);
  line-height: 1.2;
}

.progress-block {
  min-width: 0;
}

.progress-copy {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: #49616c;
  font-size: 0.9rem;
}

.progress-copy strong {
  color: #244e5d;
  font-size: 1rem;
}

.progress-dots {
  display: flex;
  justify-content: center;
  gap: clamp(7px, 1.2vw, 12px);
}

.progress-dots span {
  display: grid;
  width: clamp(32px, 4vw, 42px);
  height: clamp(32px, 4vw, 42px);
  place-items: center;
  border: 2px solid #c7d9d6;
  border-radius: 50%;
  color: #698078;
  background: #f7fbfa;
  font-size: 0.9rem;
  font-weight: 900;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.progress-dots span.is-current {
  border-color: #538995;
  background: #e0f0f1;
  transform: scale(1.08);
}

.progress-dots span.is-complete {
  border-color: #5f987b;
  color: #fff;
  background: #6fa286;
}

.support-chip {
  justify-self: end;
  gap: 10px;
  min-width: 190px;
  padding: 10px 13px;
  border-radius: 17px;
  background: #fff7e7;
  box-shadow: inset 0 0 0 1px rgba(159, 123, 70, 0.12);
}

.support-chip > span {
  font-size: 27px;
}

.support-chip small,
.support-chip strong {
  display: block;
}

.support-chip small {
  margin-bottom: 2px;
  color: #856f54;
  font-size: 0.72rem;
}

.support-chip strong {
  color: #5e513f;
  font-size: 0.86rem;
}

.ready-panel {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(340px, 1.15fr);
  align-items: center;
  gap: clamp(28px, 6vw, 80px);
  width: min(1120px, 100%);
  min-height: 0;
  margin: auto;
  padding: clamp(26px, 5vw, 64px);
}

.ready-scene {
  position: relative;
  display: grid;
  width: min(38vw, 380px);
  aspect-ratio: 1;
  margin: auto;
  place-items: center;
  border: 3px solid rgba(255, 255, 255, 0.86);
  border-radius: 44% 56% 51% 49%;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: 0 24px 60px rgba(50, 80, 80, 0.1);
}

.ready-house {
  z-index: 2;
  font-size: clamp(112px, 15vw, 190px);
  filter: drop-shadow(0 16px 18px rgba(58, 78, 71, 0.12));
}

.sound-ring {
  position: absolute;
  border: 3px solid rgba(79, 133, 139, 0.2);
  border-radius: 50%;
}

.sound-ring--outer {
  width: 82%;
  height: 82%;
  animation: quiet-pulse 3.4s ease-in-out infinite;
}

.sound-ring--inner {
  width: 66%;
  height: 66%;
  animation: quiet-pulse 3.4s 0.5s ease-in-out infinite;
}

.ready-note {
  position: absolute;
  z-index: 3;
  color: #4f8085;
  font-size: clamp(30px, 4vw, 52px);
  font-weight: 900;
}

.ready-note--one {
  top: 14%;
  right: 15%;
}

.ready-note--two {
  bottom: 13%;
  left: 11%;
}

.ready-copy {
  max-width: 620px;
  padding: clamp(24px, 4vw, 46px);
  border: 2px solid rgba(255, 255, 255, 0.84);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 20px 50px rgba(47, 75, 80, 0.1);
}

.ready-copy h2,
.completed-panel h2 {
  margin: 10px 0 13px;
  color: #254a58;
  font-size: clamp(1.75rem, 3.4vw, 2.8rem);
  line-height: 1.18;
}

.ready-copy > p:not(.ready-kicker),
.completed-panel > p:not(.completion-kicker) {
  margin: 0;
  color: #536b73;
  font-size: clamp(1rem, 1.7vw, 1.17rem);
  line-height: 1.75;
}

.ready-copy ul {
  display: grid;
  gap: 10px;
  margin: 22px 0 26px;
  padding: 0;
  list-style: none;
}

.ready-copy li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #3f5962;
  font-weight: 700;
}

.ready-copy li span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  background: #edf5f1;
}

.primary-button {
  display: inline-flex;
  min-height: 64px;
  align-items: center;
  justify-content: center;
  gap: 11px;
  padding: 14px 26px;
  border: 0;
  border-radius: 20px;
  color: #fff !important;
  background: #397785;
  box-shadow: 0 12px 24px rgba(48, 106, 118, 0.23);
  font-size: 1.08rem;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.primary-button:not(:disabled):hover {
  background: #326b77;
  box-shadow: 0 15px 28px rgba(48, 106, 118, 0.27);
  transform: translateY(-2px);
}

.start-button {
  min-width: min(100%, 250px);
}

.play-panel {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(430px, 1.15fr);
  gap: clamp(14px, 2vw, 24px);
  width: 100%;
  min-height: 0;
  flex: 1;
  padding-top: clamp(14px, 2vw, 24px);
}

.sound-card,
.task-card {
  min-width: 0;
  border: 2px solid rgba(255, 255, 255, 0.84);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 16px 42px rgba(49, 72, 80, 0.1);
}

.sound-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(18px, 3vw, 30px);
}

.sound-card__topline {
  justify-content: space-between;
  gap: 12px;
  color: #4c6c73;
  font-size: 0.88rem;
  font-weight: 900;
}

.sound-card__topline > span:first-child {
  padding: 7px 12px;
  border-radius: 999px;
  background: #e6f1ef;
}

.text-alternative-badge {
  gap: 7px;
  color: #6d624f;
}

.text-alternative-badge > span {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: #fff2d9;
  font-size: 0.72rem;
}

.sound-presentation {
  display: grid;
  justify-items: center;
  gap: clamp(20px, 3vh, 34px);
  padding: clamp(24px, 5vh, 54px) 0;
  text-align: center;
}

.speaker-orb {
  position: relative;
  display: grid;
  width: clamp(112px, 12vw, 152px);
  height: clamp(112px, 12vw, 152px);
  place-items: center;
  border: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  background: #e5f1ef;
  box-shadow: 0 18px 36px rgba(54, 97, 101, 0.13);
}

.speaker-orb > span {
  z-index: 2;
  font-size: clamp(52px, 6vw, 72px);
}

.speaker-wave {
  position: absolute;
  border: 3px solid rgba(58, 117, 128, 0.2);
  border-radius: 50%;
  animation: sound-breathe 2.8s ease-in-out infinite;
}

.speaker-wave--one {
  inset: -12px;
}

.speaker-wave--two {
  inset: -25px;
  animation-delay: 0.45s;
}

.sound-copy > p {
  margin-bottom: 8px;
}

.sound-copy h2 {
  max-width: 540px;
  margin: 0 auto 12px;
  color: #254958;
  font-size: clamp(1.55rem, 3vw, 2.35rem);
  line-height: 1.4;
}

.sound-copy > span {
  display: block;
  color: #657981;
  font-size: 0.92rem;
  line-height: 1.55;
}

.sound-tools {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tool-button {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 14px;
  border: 2px solid #d1e0de;
  border-radius: 18px;
  background: #f7fbfa;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.tool-button > span:first-child {
  font-size: 25px;
}

.tool-button strong,
.tool-button small {
  display: block;
  text-align: left;
}

.tool-button strong {
  color: #31545d;
  font-size: 0.98rem;
}

.tool-button small {
  margin-top: 2px;
  color: #718187;
  font-size: 0.73rem;
}

.tool-button:not(:disabled):hover {
  border-color: #8eb2ae;
  background: #eef7f5;
  transform: translateY(-1px);
}

.hint-button {
  border-color: #e3d6b8;
  background: #fffaf0;
}

.task-card {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: clamp(18px, 3vw, 30px);
}

.stage-heading {
  gap: 13px;
  margin-bottom: 15px;
}

.stage-number {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 15px;
  color: #fff;
  background: #557f82;
  font-size: 1.25rem;
  font-weight: 900;
}

.stage-heading p {
  margin-bottom: 2px;
  font-size: 0.7rem;
}

.stage-heading h2 {
  margin: 0;
  color: #274957;
  font-size: clamp(1.25rem, 2.3vw, 1.75rem);
  line-height: 1.3;
}

.feedback-strip {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 10px;
  margin-bottom: clamp(14px, 2vw, 22px);
  padding: 10px 14px;
  border-radius: 16px;
  color: #46626b;
  background: #edf5f3;
}

.feedback-strip > span {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.74);
  font-weight: 900;
}

.feedback-strip p {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 750;
  line-height: 1.45;
}

.feedback-strip[data-tone='encouraging'] {
  color: #755f3d;
  background: #fff4d9;
}

.feedback-strip[data-tone='success'] {
  color: #37654e;
  background: #e5f4e8;
}

.feedback-strip[data-tone='hint'] {
  color: #665c49;
  background: #f8f0dd;
}

.source-grid,
.action-grid {
  display: grid;
  gap: clamp(12px, 2vw, 18px);
  min-height: 0;
  flex: 1;
}

.source-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.source-grid.has-2-choices {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.source-choice,
.action-choice {
  position: relative;
  border: 3px solid #d5e2df;
  border-radius: 24px;
  background: #fbfdfc;
  box-shadow: 0 10px 24px rgba(52, 78, 83, 0.07);
  cursor: pointer;
  transition:
    border-color 170ms ease,
    background-color 170ms ease,
    transform 170ms ease,
    box-shadow 170ms ease;
}

.source-choice {
  display: flex;
  min-height: clamp(170px, 28vh, 250px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px 12px;
}

.source-choice__emoji {
  font-size: clamp(54px, 7vw, 86px);
  filter: drop-shadow(0 8px 8px rgba(45, 69, 68, 0.08));
}

.source-choice__label {
  color: #2f515b;
  font-size: clamp(1.12rem, 2vw, 1.42rem);
  font-weight: 900;
  text-align: center;
}

.source-choice small,
.action-choice small {
  color: #77868b;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.source-choice:not(:disabled):hover,
.action-choice:not(:disabled):hover {
  border-color: #80aaa4;
  background: #f2faf7;
  box-shadow: 0 14px 28px rgba(52, 94, 91, 0.11);
  transform: translateY(-2px);
}

.source-choice.is-wrong,
.action-choice.is-wrong {
  border-color: #d6b875;
  background: #fff8e7;
}

.source-choice.is-hinted,
.action-choice.is-hinted {
  border-color: #82a98e;
  background: #edf7ef;
  box-shadow: 0 0 0 5px rgba(108, 155, 119, 0.12);
}

.action-stage {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.matched-source {
  align-self: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding: 9px 13px;
  border-radius: 16px;
  background: #eaf4f0;
}

.matched-source > span {
  font-size: 30px;
}

.matched-source small,
.matched-source strong {
  display: block;
}

.matched-source small {
  color: #668079;
  font-size: 0.7rem;
}

.matched-source strong {
  color: #335c52;
  font-size: 0.98rem;
}

.matched-source b {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: #6c9c7f;
}

.action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.action-choice {
  display: flex;
  min-height: clamp(180px, 30vh, 270px);
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 2vw, 20px);
  padding: clamp(18px, 3vw, 30px);
  text-align: left;
}

.action-choice__icon {
  display: grid;
  width: clamp(60px, 7vw, 82px);
  height: clamp(60px, 7vw, 82px);
  flex: 0 0 auto;
  place-items: center;
  border-radius: 22px;
  background: #edf4f1;
  font-size: clamp(34px, 4vw, 48px);
}

.action-choice__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.action-choice strong {
  color: #2d4c58;
  font-size: clamp(1rem, 1.8vw, 1.32rem);
  line-height: 1.55;
}

.action-choice small {
  text-align: left;
}

.round-success {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(20px, 4vw, 46px);
  text-align: center;
}

.success-mark {
  display: grid;
  width: clamp(92px, 11vw, 126px);
  height: clamp(92px, 11vw, 126px);
  margin-bottom: 18px;
  place-items: center;
  border-radius: 34px;
  background: #e3f1e6;
  box-shadow: 0 15px 30px rgba(68, 111, 79, 0.12);
  font-size: clamp(50px, 6vw, 68px);
}

.round-success > p {
  margin: 0 0 6px;
  color: #5f7c68;
  font-weight: 800;
}

.round-success h2 {
  margin: 0 0 12px;
  color: #315846;
  font-size: clamp(1.45rem, 2.8vw, 2.1rem);
}

.round-success > span:not(.success-mark) {
  max-width: 560px;
  color: #61746a;
  font-size: 1rem;
  line-height: 1.6;
}

.next-button {
  margin-top: 25px;
}

.completed-panel {
  display: flex;
  width: min(780px, 100%);
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
  padding: clamp(32px, 6vw, 68px);
  text-align: center;
}

.completion-house {
  display: grid;
  width: clamp(130px, 18vw, 190px);
  height: clamp(130px, 18vw, 190px);
  margin-bottom: 24px;
  place-items: center;
  border: 3px solid rgba(255, 255, 255, 0.88);
  border-radius: 42px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 22px 48px rgba(50, 79, 76, 0.12);
  font-size: clamp(78px, 11vw, 116px);
}

.completion-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 14px;
  width: min(460px, 100%);
  margin-top: 28px;
}

.completion-summary > div {
  padding: 18px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.68);
}

.completion-summary strong,
.completion-summary span {
  display: block;
}

.completion-summary strong {
  color: #376655;
  font-size: 2rem;
}

.completion-summary span {
  margin-top: 3px;
  color: #60736b;
  font-weight: 700;
}

.pause-layer {
  position: absolute;
  z-index: 20;
  inset: 0;
  display: grid;
  padding: 24px;
  place-items: center;
  background: rgba(235, 242, 239, 0.88);
  backdrop-filter: blur(8px);
}

.pause-card {
  display: flex;
  width: min(420px, 100%);
  flex-direction: column;
  align-items: center;
  padding: 34px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 28px;
  background: #fffdfa;
  box-shadow: 0 20px 50px rgba(48, 66, 69, 0.14);
  text-align: center;
}

.pause-card > span {
  display: grid;
  width: 74px;
  height: 74px;
  margin-bottom: 14px;
  place-items: center;
  border-radius: 24px;
  color: #fff;
  background: #67898c;
  font-size: 2rem;
}

.pause-card strong {
  color: #2b4d58;
  font-size: 1.45rem;
}

.pause-card p {
  margin: 8px 0 0;
  color: #65777c;
  line-height: 1.55;
}

.pause-fade-enter-active,
.pause-fade-leave-active {
  transition: opacity 160ms ease;
}

.pause-fade-enter-from,
.pause-fade-leave-to {
  opacity: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes quiet-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.97);
  }

  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

@keyframes sound-breathe {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.96);
  }

  50% {
    opacity: 0.75;
    transform: scale(1.03);
  }
}

@media (max-width: 1050px) {
  .game-header {
    grid-template-columns: minmax(220px, auto) minmax(220px, 1fr);
  }

  .support-chip {
    display: none;
  }

  .play-panel {
    grid-template-columns: minmax(280px, 0.78fr) minmax(390px, 1.22fr);
  }

  .source-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .source-grid.has-3-choices .source-choice:last-child {
    grid-column: 1 / -1;
    min-height: 140px;
  }
}

@media (max-width: 820px) {
  .home-sound-game {
    height: auto;
    min-height: 100%;
  }

  .game-header {
    grid-template-columns: 1fr;
  }

  .progress-block {
    width: 100%;
  }

  .ready-panel,
  .play-panel {
    grid-template-columns: 1fr;
  }

  .ready-panel {
    padding: 28px 10px;
  }

  .ready-scene {
    width: min(68vw, 300px);
  }

  .sound-presentation {
    grid-template-columns: auto 1fr;
    align-items: center;
    justify-items: start;
    padding: 25px 0;
    text-align: left;
  }

  .sound-copy h2 {
    margin-inline: 0;
  }

  .source-choice,
  .action-choice {
    min-height: 150px;
  }
}

@media (max-width: 600px) {
  .home-sound-game {
    padding: 10px;
  }

  .game-header,
  .sound-card,
  .task-card,
  .ready-copy {
    border-radius: 22px;
  }

  .title-icon {
    width: 50px;
    height: 50px;
    font-size: 29px;
  }

  .progress-dots span {
    width: 34px;
    height: 34px;
  }

  .ready-panel {
    gap: 20px;
  }

  .ready-copy {
    padding: 24px 18px;
  }

  .sound-presentation {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .sound-copy h2 {
    margin-inline: auto;
  }

  .sound-tools,
  .source-grid,
  .source-grid.has-2-choices,
  .action-grid,
  .completion-summary {
    grid-template-columns: 1fr;
  }

  .source-grid.has-3-choices .source-choice:last-child {
    grid-column: auto;
  }

  .source-choice,
  .action-choice {
    min-height: 132px;
  }

  .source-choice {
    flex-direction: row;
    justify-content: flex-start;
    padding: 15px 18px;
    text-align: left;
  }

  .source-choice__emoji {
    flex: 0 0 auto;
    font-size: 52px;
  }

  .source-choice small {
    margin-left: auto;
    text-align: right;
  }

  .action-choice {
    justify-content: flex-start;
  }

  .completion-summary {
    width: 100%;
  }
}

@media (max-height: 720px) and (min-width: 821px) {
  .home-sound-game {
    padding: 10px 14px;
  }

  .game-header {
    padding-block: 9px;
  }

  .title-icon {
    width: 48px;
    height: 48px;
    font-size: 28px;
  }

  .sound-presentation {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 22px;
    padding: 18px 0;
    text-align: left;
  }

  .speaker-orb {
    width: 98px;
    height: 98px;
  }

  .speaker-orb > span {
    font-size: 48px;
  }

  .sound-copy h2 {
    margin-inline: 0;
  }

  .source-choice,
  .action-choice {
    min-height: 142px;
  }
}

@media (pointer: coarse) {
  .tool-button,
  .primary-button {
    min-height: 72px;
  }

  .source-choice,
  .action-choice {
    min-height: 156px;
  }
}

@media (prefers-contrast: more) {
  .game-header,
  .sound-card,
  .task-card,
  .ready-copy {
    border-color: #78918f;
  }

  .source-choice,
  .action-choice,
  .tool-button {
    border-color: #6f8988;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-sound-game *,
  .home-sound-game *::before,
  .home-sound-game *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
