<template>
  <div class="prototype-game wash-hands-game">
    <div class="prototype-game__backdrop" aria-hidden="true">
      <div class="prototype-game__glow prototype-game__glow--left wash-hands-game__glow"></div>
      <div class="prototype-game__glow prototype-game__glow--right wash-hands-game__glow wash-hands-game__glow--alt"></div>
      <span
        v-for="sparkle in sparkles"
        :key="sparkle.id"
        class="prototype-game__sparkle"
        :style="{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          animationDelay: `${sparkle.delay}s`,
        }"
      />
    </div>

    <section class="prototype-game__hud">
      <article class="prototype-game__hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.label }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>完成进度</span>
        <strong>{{ progressLabel }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>错误次数</span>
        <strong>{{ totalWrongCount }} 次</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>搓洗进度</span>
        <strong>{{ scrubProgressLabel }}</strong>
      </article>
    </section>

    <section class="prototype-game__layout">
      <article class="prototype-game__stage prototype-game__surface">
        <div class="prototype-game__status">
          <span class="prototype-game__eyebrow">{{ stageEyebrow }}</span>
          <strong>{{ stageTitle }}</strong>
          <span class="prototype-game__helper">{{ helperMessage }}</span>
        </div>

        <section v-if="phase === 'ready'" class="wash-hands-game__intro">
          <div class="wash-hands-game__sink-card">
            <div class="wash-hands-game__faucet"></div>
            <div class="wash-hands-game__basin"></div>
            <div class="wash-hands-game__hands">
              <span class="wash-hands-game__hand"></span>
              <span class="wash-hands-game__hand"></span>
            </div>
          </div>
          <div class="wash-hands-game__intro-copy">
            <h2>先把洗手步骤排好，再完成真实顺序的小模拟。</h2>
            <p>这一轮会先认步骤，再做动作。最后要记得把泡泡冲干净、关掉水龙头。</p>
          </div>
        </section>

        <section v-else-if="phase === 'sequence'" class="wash-hands-game__sequence">
          <div class="wash-hands-game__sequence-track">
            <div
              v-for="(step, index) in sequenceSteps"
              :key="step.id"
              class="wash-hands-game__sequence-slot"
              :class="{ 'is-done': index < currentSequenceIndex }"
            >
              <span>{{ index + 1 }}</span>
              <strong>{{ index < currentSequenceIndex ? step.label : '等待放入' }}</strong>
            </div>
          </div>

          <div class="wash-hands-game__card-grid">
            <button
              v-for="step in shuffledSequenceSteps"
              :key="step.id"
              type="button"
              class="wash-hands-game__step-card"
              :disabled="paused || currentSequenceIndex >= sequenceSteps.length || completedSequenceIds.includes(step.id)"
              @click="handleSequencePick(step)"
            >
              <span>{{ step.emoji }}</span>
              <strong>{{ step.label }}</strong>
              <small>{{ step.shortHint }}</small>
            </button>
          </div>
        </section>

        <section v-else-if="phase === 'actions'" class="wash-hands-game__actions">
          <div class="wash-hands-game__sink-board">
            <div class="wash-hands-game__faucet-row">
              <div class="wash-hands-game__faucet">
                <span class="wash-hands-game__faucet-head"></span>
                <span class="wash-hands-game__faucet-base"></span>
                <span v-if="waterOn" class="wash-hands-game__water-stream"></span>
              </div>
              <div class="wash-hands-game__soap-pump" :class="{ 'is-used': soapApplied }">
                <span class="wash-hands-game__soap-top"></span>
                <span class="wash-hands-game__soap-body"></span>
              </div>
            </div>

            <div class="wash-hands-game__hand-stage" :class="{ 'is-wet': handsWet, 'is-soapy': soapApplied }">
              <div class="wash-hands-game__hand-shell"></div>
              <div class="wash-hands-game__hand-shell"></div>
              <div v-if="soapApplied" class="wash-hands-game__foam-layer">
                <span v-for="bubble in foamBubbles" :key="bubble.id" class="wash-hands-game__foam-bubble" :style="bubble.style"></span>
              </div>
            </div>

            <div class="wash-hands-game__scrub-track">
              <span>左右搓洗</span>
              <div class="prototype-game__progress-track">
                <div class="prototype-game__progress-fill" :style="{ width: `${scrubPercent}%` }"></div>
              </div>
              <strong>{{ scrubProgressLabel }}</strong>
            </div>
          </div>

          <div class="wash-hands-game__card-grid wash-hands-game__card-grid--actions">
            <button
              v-for="action in actionSteps"
              :key="action.id"
              type="button"
              class="wash-hands-game__action-card"
              :class="{
                'is-current': action.id === currentActionStep?.id,
                'is-done': completedActionIds.includes(action.id),
              }"
              :disabled="paused || phase !== 'actions'"
              @click="handleActionPick(action.id)"
            >
              <span>{{ action.emoji }}</span>
              <strong>{{ action.label }}</strong>
              <small>{{ action.shortHint }}</small>
            </button>
          </div>
        </section>

        <section v-else class="wash-hands-game__complete">
          <div class="wash-hands-game__complete-card">
            <span>🧼</span>
            <strong>小手已经洗得干干净净啦</strong>
            <small>步骤排序、打泡搓洗和冲净动作都已经记录好了。</small>
          </div>
        </section>
      </article>

      <aside class="prototype-game__aside prototype-game__surface">
        <div class="prototype-game__tags">
          <span class="prototype-game__tag">生活自理</span>
          <span class="prototype-game__tag prototype-game__tag--accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h1 class="prototype-game__title">洗手小能手</h1>
        <p class="prototype-game__copy">
          先把顺序记清楚，再按真实流程把手打湿、打泡、搓洗、冲净，慢慢建立稳定的卫生习惯。
        </p>

        <div class="prototype-game__progress">
          <div class="prototype-game__progress-labels">
            <span>认步骤</span>
            <span>做动作</span>
            <span>冲净关水</span>
          </div>
          <div class="prototype-game__progress-track">
            <div class="prototype-game__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <section class="prototype-game__tip-grid">
          <article class="prototype-game__tip-card">
            <strong>当前步骤</strong>
            <span>{{ currentActionStep?.label || stepLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>最高提示</strong>
            <span>{{ highestPromptLevelLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>平均动作</strong>
            <span>{{ averageActionLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>关键提醒</strong>
            <span>{{ reminderText }}</span>
          </article>
        </section>

        <div class="prototype-game__actions">
          <button
            v-if="phase === 'ready'"
            type="button"
            class="prototype-game__button prototype-game__button--primary"
            @click="startGame"
          >
            开始洗手练习
          </button>

          <template v-else-if="phase === 'sequence' || phase === 'actions'">
            <button
              type="button"
              class="prototype-game__button prototype-game__button--secondary"
              :disabled="paused"
              @click="requestPrompt"
            >
              给一点提示
            </button>
            <button
              type="button"
              class="prototype-game__button prototype-game__button--ghost"
              :disabled="paused"
              @click="resetRound"
            >
              重新开始
            </button>
          </template>

          <button
            v-else
            type="button"
            class="prototype-game__button prototype-game__button--ghost"
            @click="resetRound"
          >
            再洗一遍
          </button>
        </div>
      </aside>
    </section>

    <transition name="badge-pop">
      <div v-if="showBadge" class="prototype-game__badge-modal">
        <div class="prototype-game__badge-icon">🧼</div>
        <strong>洗手达人徽章</strong>
        <p>你已经按顺序把洗手流程走完了。</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
} from '@/types/emotional/games'
import { averageNumberList, clampNumber, shuffleArray } from './prototype-game-utils'

type Phase = 'ready' | 'sequence' | 'actions' | 'celebrating' | 'finished'

interface SparkleDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface DifficultyConfig {
  label: string
  shortLabel: string
  scrubTargetPx: number
  scrubIncrementPx: number
}

interface StepDefinition {
  id: string
  label: string
  emoji: string
  shortHint: string
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

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    label: '简单 · 短时搓洗',
    shortLabel: '简单',
    scrubTargetPx: 1800,
    scrubIncrementPx: 450,
  },
  2: {
    label: '中等 · 稳定搓洗',
    shortLabel: '中等',
    scrubTargetPx: 2200,
    scrubIncrementPx: 420,
  },
  3: {
    label: '困难 · 认真搓洗',
    shortLabel: '困难',
    scrubTargetPx: 2600,
    scrubIncrementPx: 380,
  },
}

const sequenceSteps: ReadonlyArray<StepDefinition> = [
  { id: 'wet-hands', label: '先把手打湿', emoji: '💧', shortHint: '让小手先湿润起来' },
  { id: 'soap', label: '再打出泡泡', emoji: '🫧', shortHint: '按一点洗手液' },
  { id: 'rinse', label: '最后冲干净', emoji: '🚿', shortHint: '把泡泡慢慢冲掉' },
]

const actionSteps: ReadonlyArray<StepDefinition> = [
  { id: 'open-water', label: '打开水龙头', emoji: '🚰', shortHint: '先让水流出来' },
  { id: 'wet-hands', label: '双手打湿', emoji: '💧', shortHint: '把手放到水柱下面' },
  { id: 'soap', label: '按洗手液', emoji: '🧴', shortHint: '让手上出现泡泡' },
  { id: 'scrub', label: '左右搓洗', emoji: '👐', shortHint: '认真来回搓一搓' },
  { id: 'rinse', label: '冲掉泡泡', emoji: '🚿', shortHint: '把泡泡冲洗干净' },
  { id: 'close-water', label: '关掉水龙头', emoji: '✅', shortHint: '最后记得把水关上' },
]

const sparkles: ReadonlyArray<SparkleDot> = [
  { id: 1, left: 12, top: 18, size: 12, delay: 0.4 },
  { id: 2, left: 22, top: 76, size: 10, delay: 1.2 },
  { id: 3, left: 42, top: 20, size: 16, delay: 0.6 },
  { id: 4, left: 66, top: 12, size: 14, delay: 1.5 },
  { id: 5, left: 82, top: 54, size: 12, delay: 0.9 },
]

const foamBubbles = [
  { id: 1, style: { left: '18%', top: '26%', width: '18px', height: '18px' } },
  { id: 2, style: { left: '36%', top: '18%', width: '14px', height: '14px' } },
  { id: 3, style: { left: '52%', top: '28%', width: '16px', height: '16px' } },
  { id: 4, style: { left: '64%', top: '24%', width: '12px', height: '12px' } },
  { id: 5, style: { left: '42%', top: '46%', width: '18px', height: '18px' } },
  { id: 6, style: { left: '58%', top: '52%', width: '15px', height: '15px' } },
]

const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const helperMessage = ref('先记住顺序，再把每个动作认真做完。')
const promptCount = ref(0)
const shuffledSequenceSteps = ref<StepDefinition[]>([])
const currentSequenceIndex = ref(0)
const completedSequenceIds = ref<string[]>([])
const currentActionIndex = ref(0)
const completedActionIds = ref<string[]>([])
const wrongSequenceCount = ref(0)
const wrongActionCount = ref(0)
const waterOn = ref(false)
const handsWet = ref(false)
const soapApplied = ref(false)
const scrubProgressPx = ref(0)
const showBadge = ref(false)
const actionResponseTimes = ref<number[]>([])

const phase2ActionTimes = ref({
  wetHandsSec: 0,
  soapApplySec: 0,
  scrubbingSec: 0,
  rinseSec: 0,
})

let hasRoundDirty = false
let currentActionStartedAt = 0
let celebrationTimer = 0
let roundStartedAt = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const paused = computed(() => props.paused)
const currentActionStep = computed(() => actionSteps[currentActionIndex.value] || null)
const scrubPercent = computed(() => {
  if (difficultyConfig.value.scrubTargetPx <= 0) {
    return 0
  }

  return clampNumber(
    Math.round((scrubProgressPx.value / difficultyConfig.value.scrubTargetPx) * 100),
    0,
    100,
  )
})
const scrubProgressLabel = computed(() => `${scrubProgressPx.value}/${difficultyConfig.value.scrubTargetPx}px`)
const totalWrongCount = computed(() => wrongSequenceCount.value + wrongActionCount.value)
const progressPercent = computed(() => {
  if (phase.value === 'ready') return 0
  if (phase.value === 'sequence') return Math.round((currentSequenceIndex.value / sequenceSteps.length) * 35)
  if (phase.value === 'actions') {
    const base = 40
    const actionProgress = Math.round((completedActionIds.value.length / actionSteps.length) * 60)
    return base + actionProgress
  }
  return 100
})
const progressLabel = computed(() => `${progressPercent.value}%`)
const stageEyebrow = computed(() => {
  if (phase.value === 'ready') return '开始前'
  if (phase.value === 'sequence') return '第一阶段'
  if (phase.value === 'actions') return '第二阶段'
  if (phase.value === 'celebrating') return '已完成'
  return '等待保存'
})
const stageTitle = computed(() => {
  if (phase.value === 'ready') return '先把洗手顺序记清楚'
  if (phase.value === 'sequence') return '点出下一步应该先做什么'
  if (phase.value === 'actions') return currentActionStep.value?.label || '继续完成洗手动作'
  return '这一轮洗手流程已经完成'
})
const stepLabel = computed(() => {
  if (phase.value === 'sequence') return '先排核心步骤'
  if (phase.value === 'actions') return currentActionStep.value?.label || '继续动作'
  return '准备开始'
})
const highestPromptLevel = computed(() => clampNumber(promptCount.value, 0, 3))
const highestPromptLevelLabel = computed(() => `Level ${highestPromptLevel.value}`)
const averageActionMs = computed(() => averageNumberList(actionResponseTimes.value))
const averageActionLabel = computed(() => {
  if (!averageActionMs.value) {
    return '还没有动作数据'
  }

  if (averageActionMs.value < 1000) {
    return `${averageActionMs.value}ms`
  }

  return `${(averageActionMs.value / 1000).toFixed(1)} 秒`
})
const reminderText = computed(() => {
  if (phase.value === 'sequence') {
    return '先打湿，再打泡，最后冲净。'
  }

  if (phase.value === 'actions') {
    return currentActionStep.value?.shortHint || '按照顺序慢慢来。'
  }

  return '冲净后记得关掉水龙头。'
})

function markDirtyOnce() {
  if (hasRoundDirty) {
    return
  }

  hasRoundDirty = true
  roundStartedAt = Date.now()
  props.markRoundDirty?.()
}

function startActionTimer() {
  currentActionStartedAt = Date.now()
}

function pushActionTime(id: string) {
  if (!currentActionStartedAt) {
    return
  }

  const elapsedMs = Date.now() - currentActionStartedAt
  actionResponseTimes.value.push(elapsedMs)
  currentActionStartedAt = 0

  const elapsedSec = Number((elapsedMs / 1000).toFixed(1))
  if (id === 'wet-hands') {
    phase2ActionTimes.value.wetHandsSec = elapsedSec
  } else if (id === 'soap') {
    phase2ActionTimes.value.soapApplySec = elapsedSec
  } else if (id === 'scrub') {
    phase2ActionTimes.value.scrubbingSec = elapsedSec
  } else if (id === 'rinse') {
    phase2ActionTimes.value.rinseSec = elapsedSec
  }
}

function resetRound() {
  window.clearTimeout(celebrationTimer)
  phase.value = 'ready'
  activeDifficulty.value = props.difficulty
  helperMessage.value = '先记住顺序，再把每个动作认真做完。'
  promptCount.value = 0
  shuffledSequenceSteps.value = []
  currentSequenceIndex.value = 0
  completedSequenceIds.value = []
  currentActionIndex.value = 0
  completedActionIds.value = []
  wrongSequenceCount.value = 0
  wrongActionCount.value = 0
  waterOn.value = false
  handsWet.value = false
  soapApplied.value = false
  scrubProgressPx.value = 0
  showBadge.value = false
  actionResponseTimes.value = []
  phase2ActionTimes.value = {
    wetHandsSec: 0,
    soapApplySec: 0,
    scrubbingSec: 0,
    rinseSec: 0,
  }
  currentActionStartedAt = 0
  props.audio.stopAmbient()
}

function startGame() {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  shuffledSequenceSteps.value = shuffleArray(sequenceSteps)
  helperMessage.value = '想一想：先让手湿润，再打泡泡，最后冲干净。'
  phase.value = 'sequence'

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // Keep the game playable without audio.
  })
  props.audio.speak('先把洗手的顺序排好，再开始做动作。')
}

function handleSequencePick(step: StepDefinition) {
  if (paused.value || phase.value !== 'sequence') {
    return
  }

  const expectedStep = sequenceSteps[currentSequenceIndex.value]
  if (!expectedStep) {
    return
  }

  if (step.id !== expectedStep.id) {
    wrongSequenceCount.value += 1
    helperMessage.value = `再想一想，${expectedStep.label}应该更靠前。`
    props.audio.playSoftBounce().catch(() => {
      // Soft feedback is optional.
    })
    return
  }

  completedSequenceIds.value.push(step.id)
  currentSequenceIndex.value += 1
  helperMessage.value = currentSequenceIndex.value >= sequenceSteps.length
    ? '顺序已经排好了，接下来开始真正洗手。'
    : '很好，继续点下一步。'

  if (currentSequenceIndex.value >= sequenceSteps.length) {
    phase.value = 'actions'
    startActionTimer()
    helperMessage.value = '先打开水龙头，让水流出来。'
  }
}

function advanceAction(id: string) {
  completedActionIds.value.push(id)
  currentActionIndex.value += 1
  if (currentActionIndex.value < actionSteps.length) {
    startActionTimer()
  }
}

function handleActionPick(actionId: string) {
  if (paused.value || phase.value !== 'actions') {
    return
  }

  const expected = currentActionStep.value
  if (!expected) {
    return
  }

  if (actionId === 'scrub' && expected.id === 'scrub') {
    scrubProgressPx.value = Math.min(
      difficultyConfig.value.scrubTargetPx,
      scrubProgressPx.value + difficultyConfig.value.scrubIncrementPx,
    )
    helperMessage.value = scrubProgressPx.value >= difficultyConfig.value.scrubTargetPx
      ? '搓洗已经够啦，接下来把泡泡冲干净。'
      : '继续左右搓一搓，让每个角落都洗到。'

    if (scrubProgressPx.value >= difficultyConfig.value.scrubTargetPx) {
      pushActionTime('scrub')
      advanceAction('scrub')
    }
    return
  }

  if (actionId !== expected.id) {
    wrongActionCount.value += 1
    helperMessage.value = `先完成“${expected.label}”，再做后面的动作。`
    props.audio.playSoftBounce().catch(() => {
      // Soft feedback is optional.
    })
    return
  }

  pushActionTime(actionId)

  if (actionId === 'open-water') {
    waterOn.value = true
    helperMessage.value = '水已经流出来了，把双手放到水柱下面。'
  } else if (actionId === 'wet-hands') {
    handsWet.value = true
    helperMessage.value = '双手已经湿润了，再按一点洗手液。'
  } else if (actionId === 'soap') {
    soapApplied.value = true
    helperMessage.value = '泡泡出来了，现在开始认真搓洗。'
  } else if (actionId === 'rinse') {
    soapApplied.value = false
    helperMessage.value = '泡泡已经冲掉了，最后记得关水。'
  } else if (actionId === 'close-water') {
    waterOn.value = false
    finishRound()
    return
  }

  advanceAction(actionId)
}

function requestPrompt() {
  if (paused.value || (phase.value !== 'sequence' && phase.value !== 'actions')) {
    return
  }

  promptCount.value += 1

  if (phase.value === 'sequence') {
    helperMessage.value = '记住三个核心步骤：先打湿，再打泡，最后冲洗。'
  } else if (currentActionStep.value?.id === 'scrub') {
    helperMessage.value = '左右来回搓，让进度条慢慢填满。'
  } else {
    helperMessage.value = currentActionStep.value?.shortHint || '跟着当前步骤慢慢做。'
  }

  props.audio.speak(helperMessage.value)
}

function finishRound() {
  phase.value = 'celebrating'
  showBadge.value = true
  helperMessage.value = '小手已经洗干净了。'
  props.audio.stopAmbient()

  void Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('洗手流程已经完成啦。')),
  ])

  celebrationTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 850)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const correctActionCount = completedActionIds.value.length
  const totalDurationSeconds = roundStartedAt > 0 ? Number(((Date.now() - roundStartedAt) / 1000).toFixed(1)) : 0

  return {
    performanceData: {
      event: 'game_complete',
      sequence_step_count: sequenceSteps.length,
      sequence_wrong_attempts: wrongSequenceCount.value,
      correct_action_count: correctActionCount,
      wrong_action_count: wrongActionCount.value,
      scrub_progress_px: scrubProgressPx.value,
      prompt_count: promptCount.value,
      highest_prompt_level: highestPromptLevel.value,
      is_auto_completed: false,
      completed_step_codes: [...completedActionIds.value],
      completed_sequence_codes: [...completedSequenceIds.value],
      phase2_action_times: {
        ...phase2ActionTimes.value,
      },
      total_duration_seconds: totalDurationSeconds,
      average_action_ms: averageActionMs.value,
      difficulty_level: activeDifficulty.value,
    },
  }
}

watch(
  () => props.difficulty,
  (difficulty) => {
    if (phase.value !== 'ready') {
      return
    }

    activeDifficulty.value = difficulty
  },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (!isPaused) {
      return
    }

    props.audio.stopAmbient()
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(celebrationTimer)
  props.audio.stopAll()
})
</script>

<style scoped>
@import './prototype-game-shared.css';

.wash-hands-game {
  --prototype-background: linear-gradient(135deg, #8be0ff 0%, #b7f0d4 46%, #fff2b3 100%);
  --prototype-progress: linear-gradient(135deg, #38bdf8 0%, #34d399 100%);
}

.wash-hands-game__glow {
  background: rgba(125, 211, 252, 0.4);
}

.wash-hands-game__glow--alt {
  background: rgba(255, 255, 255, 0.36);
}

.wash-hands-game__intro {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr);
  gap: 26px;
  align-items: center;
  min-height: 100%;
}

.wash-hands-game__sink-card,
.wash-hands-game__sink-board {
  padding: 20px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.62);
}

.wash-hands-game__sink-card {
  display: grid;
  place-items: center;
  min-height: 280px;
}

.wash-hands-game__intro-copy h2 {
  margin: 0 0 12px;
  font-size: 1.96rem;
  line-height: 1.2;
}

.wash-hands-game__intro-copy p {
  margin: 0;
  line-height: 1.75;
}

.wash-hands-game__faucet,
.wash-hands-game__soap-pump {
  position: relative;
}

.wash-hands-game__faucet {
  width: 144px;
  height: 140px;
}

.wash-hands-game__faucet-head,
.wash-hands-game__faucet-base,
.wash-hands-game__soap-top,
.wash-hands-game__soap-body,
.wash-hands-game__basin,
.wash-hands-game__hand-shell,
.wash-hands-game__hand,
.wash-hands-game__water-stream {
  position: absolute;
  display: block;
}

.wash-hands-game__faucet-head {
  top: 18px;
  left: 18px;
  width: 92px;
  height: 32px;
  border-radius: 20px 20px 10px 10px;
  background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
}

.wash-hands-game__faucet-base {
  top: 22px;
  right: 22px;
  width: 30px;
  height: 82px;
  border-radius: 16px;
  background: linear-gradient(135deg, #cbd5e1 0%, #64748b 100%);
}

.wash-hands-game__water-stream {
  top: 44px;
  left: 26px;
  width: 28px;
  height: 124px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.95) 0%, rgba(125, 211, 252, 0.25) 100%);
}

.wash-hands-game__basin {
  bottom: 18px;
  left: 50%;
  width: 190px;
  height: 84px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84) 0%, rgba(191, 219, 254, 0.84) 100%);
  transform: translateX(-50%);
}

.wash-hands-game__hands {
  position: relative;
  width: 168px;
  height: 120px;
  margin-top: 94px;
}

.wash-hands-game__hand {
  bottom: 0;
  width: 62px;
  height: 92px;
  border-radius: 30px 30px 24px 24px;
  background: linear-gradient(180deg, #f7c7a5 0%, #efb789 100%);
}

.wash-hands-game__hand:first-child {
  left: 28px;
  transform: rotate(-8deg);
}

.wash-hands-game__hand:last-child {
  right: 28px;
  transform: rotate(8deg);
}

.wash-hands-game__sequence,
.wash-hands-game__actions {
  display: grid;
  gap: 18px;
}

.wash-hands-game__sequence-track {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.wash-hands-game__sequence-slot,
.wash-hands-game__step-card,
.wash-hands-game__action-card {
  border-radius: 22px;
}

.wash-hands-game__sequence-slot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 104px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.56);
}

.wash-hands-game__sequence-slot span {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.8);
}

.wash-hands-game__sequence-slot.is-done {
  background: rgba(187, 247, 208, 0.72);
}

.wash-hands-game__card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.wash-hands-game__step-card,
.wash-hands-game__action-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  min-height: 148px;
  padding: 18px;
  border: 0;
  text-align: left;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.78);
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.wash-hands-game__step-card:hover:not(:disabled),
.wash-hands-game__action-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(33, 53, 71, 0.12);
}

.wash-hands-game__step-card:disabled,
.wash-hands-game__action-card:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.wash-hands-game__step-card span,
.wash-hands-game__action-card span {
  font-size: 1.8rem;
}

.wash-hands-game__faucet-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.wash-hands-game__soap-pump {
  width: 96px;
  height: 124px;
  margin-top: 8px;
}

.wash-hands-game__soap-top {
  top: 8px;
  left: 36px;
  width: 24px;
  height: 22px;
  border-radius: 10px;
  background: #475569;
}

.wash-hands-game__soap-body {
  top: 24px;
  left: 12px;
  width: 72px;
  height: 90px;
  border-radius: 22px;
  background: linear-gradient(180deg, #bfdbfe 0%, #60a5fa 100%);
}

.wash-hands-game__soap-pump.is-used .wash-hands-game__soap-body {
  background: linear-gradient(180deg, #fef3c7 0%, #facc15 100%);
}

.wash-hands-game__hand-stage {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 18px;
  min-height: 220px;
  padding: 18px 0 0;
}

.wash-hands-game__hand-shell {
  position: relative;
  width: 140px;
  height: 168px;
  border-radius: 48px 48px 34px 34px;
  background: linear-gradient(180deg, #f7c7a5 0%, #efb789 100%);
  box-shadow: inset 0 -14px 26px rgba(222, 141, 83, 0.28);
}

.wash-hands-game__hand-stage.is-wet .wash-hands-game__hand-shell {
  background: linear-gradient(180deg, #cfe8ff 0%, #98d4f8 48%, #f0be96 100%);
}

.wash-hands-game__hand-stage.is-soapy .wash-hands-game__hand-shell {
  opacity: 0.82;
}

.wash-hands-game__foam-layer {
  position: absolute;
  top: 24px;
  left: 50%;
  width: 360px;
  height: 180px;
  transform: translateX(-50%);
}

.wash-hands-game__foam-bubble {
  position: absolute;
  display: block;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 0 0 2px rgba(219, 234, 254, 0.8) inset;
}

.wash-hands-game__scrub-track {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.wash-hands-game__card-grid--actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wash-hands-game__action-card.is-current {
  outline: 3px solid rgba(56, 189, 248, 0.5);
}

.wash-hands-game__action-card.is-done {
  background: rgba(187, 247, 208, 0.76);
}

.wash-hands-game__complete {
  display: grid;
  place-items: center;
  min-height: 100%;
}

.wash-hands-game__complete-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 28px;
  border-radius: 28px;
  text-align: center;
  background: rgba(255, 255, 255, 0.74);
}

.wash-hands-game__complete-card span {
  font-size: 2rem;
}

@media (max-width: 1120px) {
  .wash-hands-game__intro {
    grid-template-columns: minmax(0, 1fr);
  }

  .wash-hands-game__card-grid,
  .wash-hands-game__card-grid--actions,
  .wash-hands-game__sequence-track {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .wash-hands-game__card-grid,
  .wash-hands-game__card-grid--actions,
  .wash-hands-game__sequence-track {
    grid-template-columns: minmax(0, 1fr);
  }

  .wash-hands-game__hand-stage {
    flex-direction: column;
    align-items: center;
  }
}
</style>
