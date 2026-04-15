<template>
  <div class="emotion-mirror-game" :style="themeStyle">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="glow-orb glow-orb--left"></div>
      <div class="glow-orb glow-orb--right"></div>
      <span
        v-for="bubble in bubbles"
        :key="bubble.id"
        class="backdrop-bubble"
        :style="{
          left: `${bubble.left}%`,
          top: `${bubble.top}%`,
          width: `${bubble.size}px`,
          height: `${bubble.size}px`,
          animationDelay: `${bubble.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>完成进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>首答命中</span>
        <strong>{{ firstTryCorrectCount }} 次</strong>
      </div>
      <div class="hud-card">
        <span>重试次数</span>
        <strong>{{ wrongAttempts }} 次</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ currentScenario?.sceneLabel || '准备进入观察回合' }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <div v-if="currentScenario" class="mirror-stage">
          <article class="scene-card">
            <div class="scene-heading">
              <span class="scene-chip">{{ currentScenario.sceneEmoji }} {{ roundLabel }}</span>
              <strong>{{ currentScenario.title }}</strong>
            </div>

            <div class="scene-body">
              <div class="face-stage">
                <div class="face-orb">
                  <span>{{ currentEmotion.emoji }}</span>
                </div>
                <div class="face-copy">
                  <strong>{{ currentScenario.prompt }}</strong>
                  <p>{{ currentScenario.clue }}</p>
                </div>
              </div>

              <div class="clue-grid">
                <div v-for="tip in currentScenario.tips" :key="tip" class="clue-card">
                  {{ tip }}
                </div>
              </div>
            </div>
          </article>

          <div class="options-grid">
            <button
              v-for="option in currentOptions"
              :key="option.id"
              type="button"
              class="option-card"
              :class="getOptionState(option.id)"
              :disabled="!canSelect"
              @click="handleEmotionPick(option.id)"
            >
              <span class="option-emoji">{{ option.emoji }}</span>
              <strong>{{ option.label }}</strong>
              <small>{{ option.shortHint }}</small>
            </button>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>社交沟通</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>表情猜猜乐</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ helperMessage }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>刚刚开始</span>
            <span>越来越会看表情</span>
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
            <strong>选项数量</strong>
            <span>{{ difficultyConfig.optionCount }} 张情绪卡</span>
          </div>
          <div class="tip-card">
            <strong>平均反应</strong>
            <span>{{ averageResponseLabel }}</span>
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
        <div class="badge-icon">🙂</div>
        <strong>表情观察家徽章</strong>
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

type EmotionId = 'happy' | 'sad' | 'angry' | 'scared' | 'surprised' | 'shy'
type Phase = 'ready' | 'feedback' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'

interface DifficultyConfig {
  roundCount: number
  optionCount: number
  label: string
  shortLabel: string
  introText: string
  helperText: string
  successText: string
}

interface EmotionDefinition {
  id: EmotionId
  label: string
  emoji: string
  shortHint: string
  accent: string
  glow: string
  tint: string
  distractors: EmotionId[]
  feedbackLine: string
}

interface ScenarioDefinition {
  id: string
  minDifficulty: EmotionGameDifficulty
  title: string
  sceneEmoji: string
  sceneLabel: string
  prompt: string
  clue: string
  tips: readonly [string, string]
  correctEmotionId: EmotionId
}

interface BackdropBubble {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    roundCount: 4,
    optionCount: 2,
    label: '简单 · 明显表情',
    shortLabel: '简单',
    introText: '先看脸，再听听发生了什么，从两张情绪卡里挑最像的一张。',
    helperText: '简单模式会给出更明显的表情和更少的干扰项，先练习把“脸上的感觉”看清楚。',
    successText: '你已经能稳稳看出明显表情了，表情观察家徽章亮起来了。',
  },
  2: {
    roundCount: 5,
    optionCount: 3,
    label: '中等 · 加入情境',
    shortLabel: '中等',
    introText: '除了看脸，也开始一起看场景线索，判断角色更像哪一种感受。',
    helperText: '中等模式会加入相似情绪干扰项，需要把表情和场景放在一起看。',
    successText: '你已经会把表情和情境一起连起来看了，判断越来越稳。',
  },
  3: {
    roundCount: 6,
    optionCount: 4,
    label: '困难 · 综合判断',
    shortLabel: '困难',
    introText: '这次要同时看眼神、嘴巴和发生的事情，选出最贴切的情绪卡。',
    helperText: '困难模式的线索会更细，需要先观察，再想“为什么会有这种表情”。',
    successText: '你已经能综合表情和情境做判断了，今天的观察很细致。',
  },
}

const EMOTION_IDS: EmotionId[] = ['happy', 'sad', 'angry', 'scared', 'surprised', 'shy']

const EMOTIONS: Record<EmotionId, EmotionDefinition> = {
  happy: {
    id: 'happy',
    label: '开心',
    emoji: '😄',
    shortHint: '嘴角往上',
    accent: '#ff9f43',
    glow: 'rgba(255, 189, 89, 0.45)',
    tint: '#fff2d8',
    distractors: ['surprised', 'shy', 'sad', 'scared'],
    feedbackLine: '他嘴角轻轻往上，身体也放松地向前，多半是开心或者喜欢。',
  },
  sad: {
    id: 'sad',
    label: '难过',
    emoji: '😢',
    shortHint: '眼睛往下',
    accent: '#5b8def',
    glow: 'rgba(115, 166, 255, 0.42)',
    tint: '#eaf2ff',
    distractors: ['scared', 'angry', 'happy', 'shy'],
    feedbackLine: '他眼睛垂下来，嘴角也往下，常常说明他有点难过。',
  },
  angry: {
    id: 'angry',
    label: '生气',
    emoji: '😠',
    shortHint: '皱眉鼓脸',
    accent: '#ff6b6b',
    glow: 'rgba(255, 120, 120, 0.42)',
    tint: '#ffe7e6',
    distractors: ['sad', 'scared', 'surprised', 'happy'],
    feedbackLine: '他眉毛压低、嘴巴收紧，还想把东西推开，通常是在生气。',
  },
  scared: {
    id: 'scared',
    label: '害怕',
    emoji: '😨',
    shortHint: '被吓一跳',
    accent: '#3fb8af',
    glow: 'rgba(92, 214, 199, 0.4)',
    tint: '#e4fbf7',
    distractors: ['surprised', 'sad', 'angry', 'shy'],
    feedbackLine: '他身体缩起来、眼睛睁大，常常是在害怕或者被突然吓到了。',
  },
  surprised: {
    id: 'surprised',
    label: '惊讶',
    emoji: '😮',
    shortHint: '眼睛变圆',
    accent: '#8f7cff',
    glow: 'rgba(150, 130, 255, 0.36)',
    tint: '#f1edff',
    distractors: ['happy', 'scared', 'shy', 'angry'],
    feedbackLine: '他眼睛和嘴巴一下张开，像在说“哇”，这更像惊讶。',
  },
  shy: {
    id: 'shy',
    label: '害羞',
    emoji: '😊',
    shortHint: '笑得轻轻的',
    accent: '#f58fb0',
    glow: 'rgba(245, 143, 176, 0.34)',
    tint: '#ffedf4',
    distractors: ['happy', 'sad', 'surprised', 'scared'],
    feedbackLine: '他轻轻笑着，却不太敢一直看人，还把身体往后收，这更像害羞。',
  },
}

const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'sticker-gift',
    minDifficulty: 1,
    title: '好友送来星星贴纸',
    sceneEmoji: '🌟',
    sceneLabel: '同伴互动',
    prompt: '小朋友把一张亮亮的星星贴纸递给乐乐，还说“这个送给你”。',
    clue: '看他的嘴角和眼睛，再想想别人送了他喜欢的小礼物。',
    tips: ['嘴角轻轻往上扬', '收到喜欢的东西'],
    correctEmotionId: 'happy',
  },
  {
    id: 'tower-fell',
    minDifficulty: 1,
    title: '积木塔倒下来',
    sceneEmoji: '🧱',
    sceneLabel: '游戏时间',
    prompt: '乐乐刚搭好的积木塔一下倒了，地上散开一大片。',
    clue: '他低头看着地面，肩膀也有点垂下来。',
    tips: ['眼睛向下看', '好不容易完成的东西倒了'],
    correctEmotionId: 'sad',
  },
  {
    id: 'marker-snatched',
    minDifficulty: 1,
    title: '画笔被抢走了',
    sceneEmoji: '🖍️',
    sceneLabel: '轮流练习',
    prompt: '乐乐正准备涂颜色，旁边的小朋友一下把他的画笔拿走了。',
    clue: '看看他的眉毛和嘴巴，是不是有点紧紧的。',
    tips: ['眉毛压低', '别人突然抢走手里的东西'],
    correctEmotionId: 'angry',
  },
  {
    id: 'thunder-window',
    minDifficulty: 1,
    title: '窗外突然打雷',
    sceneEmoji: '⛈️',
    sceneLabel: '环境变化',
    prompt: '外面忽然“轰隆”一声打雷，乐乐赶紧往窗边退了一步。',
    clue: '看他的眼睛是不是睁大了，身体是不是缩起来了。',
    tips: ['眼睛一下睁大', '突然出现很大的声音'],
    correctEmotionId: 'scared',
  },
  {
    id: 'slide-turn',
    minDifficulty: 1,
    title: '终于轮到滑滑梯',
    sceneEmoji: '🛝',
    sceneLabel: '轮流等待',
    prompt: '排了好一会儿队后，老师说“现在轮到乐乐滑啦”。',
    clue: '他立刻站直了，脸上也露出了轻轻的笑。',
    tips: ['轮到自己喜欢的项目', '身体和表情都变得轻快'],
    correctEmotionId: 'happy',
  },
  {
    id: 'balloon-flew-away',
    minDifficulty: 1,
    title: '气球飞走了',
    sceneEmoji: '🎈',
    sceneLabel: '活动现场',
    prompt: '乐乐刚握住的气球一下飘走了，越飞越高。',
    clue: '他仰头看着气球，表情有点垮下来。',
    tips: ['嘴角往下', '喜欢的东西飞走了'],
    correctEmotionId: 'sad',
  },
  {
    id: 'surprise-box',
    minDifficulty: 2,
    title: '盒子里跳出小灯球',
    sceneEmoji: '🎁',
    sceneLabel: '意外发现',
    prompt: '老师打开盒子，里面突然亮起一颗会闪光的小球。',
    clue: '他的嘴巴一下张开了，好像没想到会看到这个。',
    tips: ['眼睛和嘴巴突然张开', '出现意料之外的新东西'],
    correctEmotionId: 'surprised',
  },
  {
    id: 'public-praise',
    minDifficulty: 2,
    title: '老师当众表扬',
    sceneEmoji: '🎨',
    sceneLabel: '课堂互动',
    prompt: '老师举起乐乐的画说“大家看，他画得真认真”。',
    clue: '他轻轻笑了，却把手缩到胸前，不太敢一直看大家。',
    tips: ['笑得轻轻的', '别人都在看着自己'],
    correctEmotionId: 'shy',
  },
  {
    id: 'puzzle-pushed',
    minDifficulty: 2,
    title: '拼图被推乱了',
    sceneEmoji: '🧩',
    sceneLabel: '合作练习',
    prompt: '乐乐刚拼好的拼图被旁边的人一推，图案一下乱掉了。',
    clue: '他眉毛皱起来，手也往前伸，像要把东西护住。',
    tips: ['脸和手都紧起来', '别人把自己刚整理好的东西弄乱'],
    correctEmotionId: 'angry',
  },
  {
    id: 'dog-bark',
    minDifficulty: 2,
    title: '陌生小狗突然叫',
    sceneEmoji: '🐶',
    sceneLabel: '户外场景',
    prompt: '走到院子边时，一只陌生小狗忽然朝乐乐大声叫了两下。',
    clue: '他赶紧往后退，眼睛也一下睁圆了。',
    tips: ['身体往后缩', '突然靠近的不确定声音'],
    correctEmotionId: 'scared',
  },
  {
    id: 'mask-jump',
    minDifficulty: 3,
    title: '朋友戴上奇怪面具',
    sceneEmoji: '🎭',
    sceneLabel: '角色扮演',
    prompt: '朋友转身回来时突然戴上了一个夸张的大面具，乐乐愣了一下。',
    clue: '他不是往后躲，而是睁大眼睛停住了，好像在说“哇”。',
    tips: ['先愣住再睁大眼', '更像意外，不像真的退缩'],
    correctEmotionId: 'surprised',
  },
  {
    id: 'birthday-song',
    minDifficulty: 3,
    title: '大家一起唱生日快乐',
    sceneEmoji: '🎂',
    sceneLabel: '集体关注',
    prompt: '教室里的人一起看着乐乐唱生日歌，他笑着却悄悄把肩膀收起来。',
    clue: '他看起来不是难过，而是有点不好意思被大家一起注视。',
    tips: ['笑着但不太敢一直对视', '很多人都在看自己'],
    correctEmotionId: 'shy',
  },
]

const bubbles: readonly BackdropBubble[] = [
  { id: 1, left: 8, top: 12, size: 12, delay: 0 },
  { id: 2, left: 18, top: 78, size: 8, delay: 0.8 },
  { id: 3, left: 32, top: 18, size: 16, delay: 1.2 },
  { id: 4, left: 56, top: 10, size: 10, delay: 1.8 },
  { id: 5, left: 74, top: 74, size: 14, delay: 0.4 },
  { id: 6, left: 88, top: 26, size: 9, delay: 1.4 },
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

const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const sessionScenarios = ref<ScenarioDefinition[]>([])
const optionEmotionIds = ref<EmotionId[]>([])
const roundIndex = ref(0)
const completedRounds = ref(0)
const firstTryCorrectCount = ref(0)
const wrongAttempts = ref(0)
const totalSelections = ref(0)
const currentRoundWrongAttempts = ref(0)
const responseTimesMs = ref<number[]>([])
const stageMessage = ref(DIFFICULTY_CONFIGS[1].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const lastAttemptEmotionId = ref<EmotionId | null>(null)
const showBadge = ref(false)

let roundStartedAt = 0
let roundDirty = false
let feedbackTimer = 0
let badgeTimer = 0
let completeTimer = 0
let resetTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const currentScenario = computed(() => sessionScenarios.value[roundIndex.value] || null)
const currentEmotion = computed(() => {
  return currentScenario.value
    ? EMOTIONS[currentScenario.value.correctEmotionId]
    : EMOTIONS.happy
})
const currentOptions = computed(() => optionEmotionIds.value.map((emotionId) => EMOTIONS[emotionId]))
const canSelect = computed(() => !props.paused && phase.value === 'ready')
const difficultyLabel = computed(() => difficultyConfig.value.label)
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
    return '本轮观察完成'
  }

  if (currentRoundWrongAttempts.value === 0) {
    return '本题首答中'
  }

  return `本题已重试 ${currentRoundWrongAttempts.value} 次`
})
const themeStyle = computed(() => ({
  '--mirror-accent': currentEmotion.value.accent,
  '--mirror-glow': currentEmotion.value.glow,
  '--mirror-tint': currentEmotion.value.tint,
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

function clearTimer(timerId: number) {
  if (timerId) {
    window.clearTimeout(timerId)
  }
}

function clearAllTimers() {
  clearTimer(feedbackTimer)
  clearTimer(badgeTimer)
  clearTimer(completeTimer)
  clearTimer(resetTimer)
  feedbackTimer = 0
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

function buildScenarioSet(difficulty: EmotionGameDifficulty) {
  return shuffleArray(
    SCENARIOS.filter((scenario) => scenario.minDifficulty <= difficulty),
  ).slice(0, DIFFICULTY_CONFIGS[difficulty].roundCount)
}

function buildOptionEmotionIds(scenario: ScenarioDefinition, optionCount: number) {
  const fallbackIds = EMOTION_IDS.filter((emotionId) => emotionId !== scenario.correctEmotionId)
  const candidateIds = Array.from(new Set([
    scenario.correctEmotionId,
    ...EMOTIONS[scenario.correctEmotionId].distractors,
    ...fallbackIds,
  ]))

  return shuffleArray(candidateIds.slice(0, optionCount))
}

function applyRoundState(nextRoundIndex: number) {
  const scenario = sessionScenarios.value[nextRoundIndex]
  if (!scenario) {
    return
  }

  optionEmotionIds.value = buildOptionEmotionIds(scenario, difficultyConfig.value.optionCount)
  currentRoundWrongAttempts.value = 0
  lastAttemptEmotionId.value = null
  statusTone.value = 'neutral'
  phase.value = 'ready'
  stageMessage.value = `看看${scenario.title}，他现在像什么感受？`
  helperMessage.value = scenario.clue
  roundStartedAt = performance.now()
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  activeDifficulty.value = difficulty
  sessionScenarios.value = buildScenarioSet(difficulty)
  optionEmotionIds.value = []
  roundIndex.value = 0
  completedRounds.value = 0
  firstTryCorrectCount.value = 0
  wrongAttempts.value = 0
  totalSelections.value = 0
  currentRoundWrongAttempts.value = 0
  responseTimesMs.value = []
  lastAttemptEmotionId.value = null
  showBadge.value = false
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].introText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].helperText
  statusTone.value = 'neutral'
  phase.value = 'ready'
  roundDirty = false
  props.audio.stopAmbient()

  if (sessionScenarios.value.length > 0) {
    applyRoundState(0)
  }
}

function buildPerformanceData() {
  return {
    completed_rounds: completedRounds.value,
    target_round_count: difficultyConfig.value.roundCount,
    option_count: difficultyConfig.value.optionCount,
    first_try_correct_count: firstTryCorrectCount.value,
    wrong_attempts: wrongAttempts.value,
    total_selections: totalSelections.value,
    accuracy_ratio: Number((completedRounds.value / Math.max(1, totalSelections.value)).toFixed(4)),
    response_times_ms: [...responseTimesMs.value],
    average_response_ms: Math.round(averageNumberList(responseTimesMs.value)),
    scenario_ids: sessionScenarios.value.map((scenario) => scenario.id),
    scenario_emotions: sessionScenarios.value.map((scenario) => scenario.correctEmotionId),
  }
}

function finishSession() {
  phase.value = 'celebrating'
  statusTone.value = 'success'
  stageMessage.value = '全部答对啦，我们已经把这一轮表情都看完了。'
  helperMessage.value = difficultyConfig.value.successText
  props.audio.stopAmbient()

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('全部猜对啦，我们把每一张表情卡都看清楚了。')),
  ])

  badgeTimer = window.setTimeout(() => {
    showBadge.value = true
  }, 650)

  completeTimer = window.setTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_FACE_READER',
        badgeName: '表情观察家徽章',
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

function handleEmotionPick(emotionId: EmotionId) {
  if (!canSelect.value || !currentScenario.value) {
    return
  }

  markRoundDirtyOnce()
  totalSelections.value += 1
  lastAttemptEmotionId.value = emotionId

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore ambient failures
  })

  if (emotionId !== currentScenario.value.correctEmotionId) {
    currentRoundWrongAttempts.value += 1
    wrongAttempts.value += 1
    statusTone.value = 'gentle'
    stageMessage.value = '再看看眼睛、嘴巴和发生了什么，再选一次。'
    helperMessage.value = '提示：先看脸，再想想刚才的场景线索。'
    props.audio.playSoftBounce().catch(() => {
      // ignore
    })
    return
  }

  if (currentRoundWrongAttempts.value === 0) {
    firstTryCorrectCount.value += 1
  }

  completedRounds.value += 1
  responseTimesMs.value = [
    ...responseTimesMs.value,
    Math.max(0, Math.round(performance.now() - roundStartedAt)),
  ]
  statusTone.value = 'success'
  phase.value = 'feedback'
  stageMessage.value = `答对了，他现在更像“${currentEmotion.value.label}”。`
  helperMessage.value = currentEmotion.value.feedbackLine

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak(currentEmotion.value.feedbackLine)),
  ])

  if (completedRounds.value >= difficultyConfig.value.roundCount) {
    finishSession()
    return
  }

  feedbackTimer = window.setTimeout(() => {
    roundIndex.value += 1
    applyRoundState(roundIndex.value)
  }, 900)
}

function getOptionState(emotionId: EmotionId) {
  if (!lastAttemptEmotionId.value || lastAttemptEmotionId.value !== emotionId) {
    return ''
  }

  return emotionId === currentScenario.value?.correctEmotionId
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
.emotion-mirror-game {
  position: relative;
  min-height: 100%;
  overflow: hidden;
  padding: 24px;
  color: #17324d;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.46), transparent 36%),
    linear-gradient(180deg, #eef8ff 0%, #fbf8ff 56%, #fff4df 100%);
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.glow-orb {
  position: absolute;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  background: var(--mirror-glow);
  filter: blur(20px);
  opacity: 0.9;
}

.glow-orb--left {
  left: -90px;
  top: -80px;
}

.glow-orb--right {
  right: -110px;
  bottom: -120px;
}

.backdrop-bubble {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  animation: mirror-float 8s ease-in-out infinite;
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
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 30px rgba(51, 89, 124, 0.12);
}

.hud-card span {
  font-size: 13px;
  color: #67819b;
}

.hud-card strong {
  font-size: 20px;
  color: #163456;
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
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 22px 44px rgba(44, 84, 121, 0.14);
  backdrop-filter: blur(12px);
}

.stage-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
}

.status-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(231, 243, 255, 0.95) 0%, rgba(255, 245, 222, 0.95) 100%);
}

.status-strip[data-tone='gentle'] {
  background: linear-gradient(135deg, #fff5d8 0%, #ffe7cf 100%);
}

.status-strip[data-tone='success'] {
  background: linear-gradient(135deg, #e6fff6 0%, #eef6ff 100%);
}

.status-strip span {
  font-size: 13px;
  color: #5d7892;
}

.status-strip strong {
  font-size: 24px;
  line-height: 1.3;
  color: #153451;
}

.mirror-stage {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 18px;
  flex: 1;
}

.scene-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border-radius: 28px;
  background:
    linear-gradient(135deg, var(--mirror-tint) 0%, rgba(255, 255, 255, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.82);
}

.scene-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.scene-heading strong {
  font-size: 24px;
  color: #173550;
}

.scene-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #45627d;
  font-size: 13px;
  white-space: nowrap;
}

.scene-body {
  display: grid;
  gap: 20px;
}

.face-stage {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.face-orb {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 32px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.56) 48%, transparent 70%),
    linear-gradient(135deg, var(--mirror-accent) 0%, rgba(255, 255, 255, 0.92) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.84),
    0 18px 36px rgba(69, 104, 139, 0.14);
}

.face-orb span {
  font-size: clamp(72px, 9vw, 118px);
  line-height: 1;
}

.face-copy {
  display: grid;
  gap: 12px;
}

.face-copy strong {
  font-size: 28px;
  line-height: 1.35;
  color: #153451;
}

.face-copy p {
  margin: 0;
  font-size: 17px;
  line-height: 1.7;
  color: #4d6680;
}

.clue-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.clue-card {
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  color: #49647f;
  font-size: 15px;
  line-height: 1.6;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.option-card {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 18px 16px;
  border: none;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  color: #17324d;
  box-shadow: 0 14px 26px rgba(55, 93, 128, 0.12);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.option-card:not(:disabled):hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 32px rgba(55, 93, 128, 0.18);
}

.option-card:disabled {
  cursor: default;
}

.option-card--correct {
  background: linear-gradient(135deg, #e0fff0 0%, #f5fffb 100%);
  box-shadow: 0 18px 32px rgba(79, 173, 131, 0.18);
}

.option-card--wrong {
  background: linear-gradient(135deg, #fff1df 0%, #fff8f1 100%);
  box-shadow: 0 18px 32px rgba(255, 156, 95, 0.18);
}

.option-emoji {
  font-size: 42px;
  line-height: 1;
}

.option-card strong {
  font-size: 22px;
}

.option-card small {
  font-size: 14px;
  color: #67819b;
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
  background: rgba(236, 244, 255, 0.82);
  color: #47637c;
  font-size: 13px;
}

.panel-tags .accent {
  background: rgba(255, 255, 255, 0.88);
  color: var(--mirror-accent);
}

.instruction-panel h2 {
  margin: 0;
  font-size: 34px;
  color: #173451;
}

.instruction-panel p {
  margin: 0;
  font-size: 17px;
  line-height: 1.7;
  color: #375672;
}

.instruction-panel small {
  font-size: 14px;
  line-height: 1.7;
  color: #67819b;
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
  color: #67819b;
}

.progress-track {
  position: relative;
  overflow: hidden;
  height: 14px;
  border-radius: 999px;
  background: rgba(224, 236, 247, 0.88);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--mirror-accent) 0%, #ffd36e 100%);
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
  background: rgba(247, 250, 255, 0.92);
}

.tip-card strong {
  font-size: 14px;
  color: #45627d;
}

.tip-card span {
  font-size: 15px;
  line-height: 1.6;
  color: #17324d;
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
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 20px 40px rgba(49, 87, 121, 0.18);
}

.badge-icon {
  font-size: 40px;
}

.badge-modal strong {
  font-size: 24px;
  color: #173451;
}

.badge-modal p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  text-align: center;
  color: #557089;
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

@keyframes mirror-float {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-10px);
    opacity: 0.85;
  }
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
  .emotion-mirror-game {
    padding: 16px;
  }

  .hud-panel,
  .clue-grid,
  .options-grid,
  .tip-grid {
    grid-template-columns: 1fr;
  }

  .face-stage {
    grid-template-columns: 1fr;
  }

  .scene-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .instruction-panel h2 {
    font-size: 28px;
  }
}
</style>
