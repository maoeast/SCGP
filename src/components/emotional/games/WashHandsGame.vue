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
            <div class="wash-hands-game__section-head wash-hands-game__section-head--compact">
              <div>
                <span class="wash-hands-game__section-kicker">洗手主舞台</span>
                <strong>先熟悉洗手台，再开始排步骤</strong>
              </div>
              <small>水龙头、皂液器、双手和洗手池都会在正式场景里给你反馈。</small>
            </div>
            <WashHandsStageArt preview />
            <div class="wash-hands-game__preview-strip">
              <article
                v-for="(step, index) in sequenceSteps"
                :key="step.id"
                class="wash-hands-game__preview-step"
              >
                <span>{{ index + 1 }}</span>
                <strong>{{ step.label }}</strong>
                <small>{{ step.shortHint }}</small>
              </article>
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
            <div class="wash-hands-game__section-head">
              <div>
                <span class="wash-hands-game__section-kicker">正式主舞台</span>
                <strong>{{ currentActionStep?.label || '继续完成洗手动作' }}</strong>
              </div>
              <small>{{ actionStageCopy }}</small>
            </div>
            <WashHandsStageArt
              :water-on="waterOn"
              :hands-wet="handsWet"
              :soap-applied="soapApplied"
              :scrub-active="scrubActive"
              :rinse-active="rinseActive"
              :focus-area="stageFocusArea"
              :scrub-percent="scrubPercent"
            />
            <div class="wash-hands-game__state-chips">
              <span
                v-for="chip in sinkStateChips"
                :key="chip.id"
                class="wash-hands-game__state-chip"
                :class="`is-${chip.tone}`"
              >
                <strong>{{ chip.label }}</strong>
                <small>{{ chip.value }}</small>
              </span>
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
          <div class="wash-hands-game__complete-layout">
            <div class="wash-hands-game__complete-scene">
              <WashHandsStageArt
                :hands-wet="true"
                :finished="true"
                focus-area="finish"
                :scrub-percent="100"
              />
            </div>
            <div class="wash-hands-game__complete-card">
              <span>🧼</span>
              <strong>小手已经洗得干干净净啦</strong>
              <small>步骤排序、打泡搓洗和冲净动作都已经记录好了。</small>
            </div>
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
import WashHandsStageArt from './WashHandsStageArt.vue'

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

interface SinkStateChip {
  id: string
  label: string
  value: string
  tone: 'neutral' | 'info' | 'success'
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
const isRoundFinished = computed(() => phase.value === 'celebrating' || phase.value === 'finished')
const scrubActive = computed(() => phase.value === 'actions' && currentActionStep.value?.id === 'scrub')
const rinseActive = computed(() => phase.value === 'actions' && currentActionStep.value?.id === 'rinse')
const soapReached = computed(() => completedActionIds.value.includes('soap') || completedActionIds.value.includes('scrub') || rinseActive.value || isRoundFinished.value)
const rinseCompleted = computed(() => completedActionIds.value.includes('rinse') || isRoundFinished.value)
const stageFocusArea = computed<'faucet' | 'hands' | 'soap' | 'scrub' | 'rinse' | 'finish' | null>(() => {
  if (isRoundFinished.value) {
    return 'finish'
  }

  switch (currentActionStep.value?.id) {
    case 'open-water':
    case 'close-water':
      return 'faucet'
    case 'wet-hands':
      return 'hands'
    case 'soap':
      return 'soap'
    case 'scrub':
      return 'scrub'
    case 'rinse':
      return 'rinse'
    default:
      return null
  }
})
const actionStageCopy = computed(() => {
  if (isRoundFinished.value) {
    return '水已经关好，泡泡也冲净了，整套洗手动作都已经记录完成。'
  }

  switch (currentActionStep.value?.id) {
    case 'open-water':
      return '先把水龙头打开，让清水流进洗手池。'
    case 'wet-hands':
      return '把双手都放到水流下面，先让手湿润起来。'
    case 'soap':
      return '按一下皂液器，让泡泡先覆盖到双手表面。'
    case 'scrub':
      return '双手来回搓洗，直到绿色圆环和进度条都慢慢填满。'
    case 'rinse':
      return '继续在水流下冲洗，把泡泡慢慢冲干净。'
    case 'close-water':
      return '动作都做完后，把水龙头关回去，完成整轮练习。'
    default:
      return '跟着当前提示慢慢做，舞台会同步给你视觉反馈。'
  }
})
const sinkStateChips = computed<SinkStateChip[]>(() => [
  {
    id: 'water',
    label: '水流',
    value: waterOn.value ? '已打开' : isRoundFinished.value ? '已关闭' : '等待开启',
    tone: waterOn.value ? 'info' : 'neutral',
  },
  {
    id: 'hands',
    label: '双手',
    value: handsWet.value || isRoundFinished.value ? '已经打湿' : '还没打湿',
    tone: handsWet.value || isRoundFinished.value ? 'info' : 'neutral',
  },
  {
    id: 'foam',
    label: '泡泡',
    value: soapApplied.value ? '正在覆盖' : rinseCompleted.value ? '已经冲净' : soapReached.value ? '等待冲净' : '还没打泡',
    tone: soapApplied.value ? 'success' : rinseCompleted.value ? 'info' : 'neutral',
  },
])

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
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.66);
}

.wash-hands-game__sink-card {
  min-height: 100%;
}

.wash-hands-game__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.56);
}

.wash-hands-game__section-head--compact {
  padding: 12px 14px;
}

.wash-hands-game__section-head div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wash-hands-game__section-head strong {
  font-size: 1.02rem;
}

.wash-hands-game__section-head small {
  max-width: 320px;
  color: rgba(33, 53, 71, 0.74);
  line-height: 1.55;
}

.wash-hands-game__section-kicker {
  color: #1570a6;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wash-hands-game__preview-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.wash-hands-game__preview-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 110px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.68);
}

.wash-hands-game__preview-step span,
.wash-hands-game__sequence-slot span {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.88);
}

.wash-hands-game__preview-step small {
  color: rgba(33, 53, 71, 0.72);
  line-height: 1.5;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 1.25rem;
  line-height: 1;
  background: rgba(224, 247, 255, 0.88);
}

.wash-hands-game__state-chips {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.wash-hands-game__state-chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 76px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.68);
}

.wash-hands-game__state-chip strong {
  font-size: 0.96rem;
}

.wash-hands-game__state-chip small {
  color: rgba(33, 53, 71, 0.76);
  line-height: 1.45;
}

.wash-hands-game__state-chip.is-info {
  background: rgba(219, 242, 255, 0.86);
}

.wash-hands-game__state-chip.is-success {
  background: rgba(223, 252, 231, 0.88);
}

.wash-hands-game__scrub-track {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.6);
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

.wash-hands-game__complete-layout {
  display: grid;
  grid-template-columns: minmax(280px, 1.1fr) minmax(240px, 0.8fr);
  gap: 20px;
  width: 100%;
  align-items: center;
}

.wash-hands-game__complete-scene {
  min-width: 0;
}

.wash-hands-game__complete-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 100%;
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

  .wash-hands-game__preview-strip,
  .wash-hands-game__state-chips,
  .wash-hands-game__card-grid,
  .wash-hands-game__card-grid--actions,
  .wash-hands-game__sequence-track {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wash-hands-game__complete-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .wash-hands-game__section-head {
    flex-direction: column;
  }

  .wash-hands-game__section-head small {
    max-width: none;
  }

  .wash-hands-game__preview-strip,
  .wash-hands-game__state-chips,
  .wash-hands-game__card-grid,
  .wash-hands-game__card-grid--actions,
  .wash-hands-game__sequence-track {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
