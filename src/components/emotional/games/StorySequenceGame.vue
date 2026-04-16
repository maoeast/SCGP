<template>
  <div class="story-sequence-game" :style="{ background: sessionTheme.background }">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="glow-orb glow-orb--left" :style="{ background: sessionTheme.glow }"></div>
      <div class="glow-orb glow-orb--right" :style="{ background: sessionTheme.glow }"></div>
      <span
        v-for="dot in backdropDots"
        :key="dot.id"
        class="backdrop-dot"
        :style="{
          left: `${dot.left}%`,
          top: `${dot.top}%`,
          width: `${dot.size}px`,
          height: `${dot.size}px`,
          animationDelay: `${dot.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>故事进度</span>
        <strong>{{ storyProgressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>首轮命中</span>
        <strong>{{ firstTrySteps }} 步</strong>
      </div>
      <div class="hud-card">
        <span>排序失误</span>
        <strong>{{ wrongSteps }} 次</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section ref="playFieldRef" class="play-field">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ currentStory?.sceneEmoji || '📖' }} {{ currentStory?.title || '故事接龙板' }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <article v-if="currentStory" class="story-brief">
          <div class="story-brief__heading">
            <div>
              <span class="story-brief__chip">故事任务</span>
              <strong>{{ currentStory.title }}</strong>
            </div>
            <p>{{ currentGoalLabel }}</p>
          </div>

          <p class="story-brief__description">{{ currentStory.description }}</p>

          <div class="story-clues">
            <span v-for="tip in currentStory.tips" :key="tip">{{ tip }}</span>
          </div>
        </article>

        <div class="timeline-board">
          <article
            v-for="(orderLabel, index) in activeOrderLabels"
            :key="`${currentStory?.id || 'story'}-${orderLabel}-${index}`"
            class="timeline-slot"
            :class="{
              'is-filled': isSlotFilled(index),
              'is-active': phase === 'ready' && index === currentSlotIndex,
              'is-hovering': hoverSlotIndex === index && index === currentSlotIndex,
            }"
            :data-story-slot-index="index"
          >
            <div class="timeline-slot__header">
              <span>{{ orderLabel }}</span>
              <strong>{{ getSlotTitle(index) }}</strong>
            </div>

            <p class="timeline-slot__hint">{{ getSlotHint(index) }}</p>
          </article>
        </div>

        <div class="tray-header">
          <div>
            <strong>故事卡托盘</strong>
            <span>{{ trayHint }}</span>
          </div>
          <small>总拖拽 {{ totalDrags }} 次</small>
        </div>

        <button
          v-for="card in storyCards"
          :key="card.id"
          type="button"
          class="story-card"
          :class="{
            dragging: dragState?.cardId === card.id,
            bouncing: card.isBouncing,
            matched: card.slotIndex !== null,
            mistake: lastMistakeCardId === card.id,
          }"
          :style="getCardStyle(card)"
          :disabled="!canDrag || card.slotIndex !== null"
          @pointerdown.prevent="beginDrag(card.id, $event)"
        >
          <span class="story-card__emoji">{{ card.emoji }}</span>
          <strong>{{ card.label }}</strong>
          <small>{{ card.hint }}</small>
        </button>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>社交沟通</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>故事接龙板</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ sessionTheme.helperLine }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>先想开始</span>
            <span>再接中间</span>
            <span>最后讲完整</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>当前故事</strong>
            <span>{{ currentStory?.title || '准备中' }}</span>
          </div>
          <div class="tip-card">
            <strong>当前步骤</strong>
            <span>{{ stepProgressLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>估算准确率</strong>
            <span>{{ accuracyLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>平均排序</strong>
            <span>{{ averageStepLabel }}</span>
          </div>
        </div>

        <div class="focus-card">
          <strong>本轮提示</strong>
          <p>{{ helperMessage }}</p>
        </div>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">📖</div>
        <strong>故事小导演徽章</strong>
        <p>{{ difficultyConfig.successText }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
  EmotionGameSettings,
} from '@/types/emotional/games'

type Phase = 'ready' | 'feedback' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'

interface DifficultyConfig {
  storyCount: number
  stepCount: number
  label: string
  shortLabel: string
  introText: string
  helperText: string
  successText: string
}

interface StoryStepDefinition {
  id: string
  label: string
  emoji: string
  hint: string
  accent: string
  tint: string
}

interface StoryDefinition {
  id: string
  minDifficulty: EmotionGameDifficulty
  title: string
  sceneEmoji: string
  description: string
  tips: readonly string[]
  steps: readonly StoryStepDefinition[]
}

interface SessionStory extends Omit<StoryDefinition, 'steps' | 'tips'> {
  tips: string[]
  steps: StoryStepDefinition[]
}

interface ThemeDefinition {
  key: string
  title: string
  background: string
  glow: string
  helperLine: string
  celebrationLine: string
}

interface SessionStoryCard {
  id: string
  stepId: string
  label: string
  emoji: string
  hint: string
  accent: string
  tint: string
  orderIndex: number
  slotIndex: number | null
  slotX: number
  slotY: number
  x: number
  y: number
  isBouncing: boolean
}

interface DragState {
  cardId: string
  pointerId: number
  offsetX: number
  offsetY: number
}

interface BackdropDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface SlotAnchor {
  x: number
  y: number
  width: number
  height: number
}

const CARD_WIDTH = 164
const CARD_HEIGHT = 118
const CARD_GAP_X = 18
const CARD_GAP_Y = 14
const ORDER_LABELS = ['先', '然后', '接着', '再后来', '最后'] as const

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    storyCount: 2,
    stepCount: 3,
    label: '简单 · 三步故事',
    shortLabel: '简单',
    introText: '看着打乱的故事卡，先想清楚“谁是第一步”，再把它拖回时间轴。',
    helperText: '简单模式每段故事只有 3 步，先练习把开始、中间和结尾讲清楚。',
    successText: '你已经能把短故事稳稳接起来了，故事小导演徽章亮起来了。',
  },
  2: {
    storyCount: 3,
    stepCount: 4,
    label: '中等 · 四步接龙',
    shortLabel: '中等',
    introText: '这次故事会更长，需要继续判断接下来应该发生什么。',
    helperText: '中等模式会出现 4 步故事，要把中间两步也接到正确位置。',
    successText: '你已经能把更长的故事讲顺了，时间顺序越来越清楚。',
  },
  3: {
    storyCount: 3,
    stepCount: 5,
    label: '困难 · 五步完整故事',
    shortLabel: '困难',
    introText: '困难模式会出现完整 5 步故事，要在更多卡片里继续保持顺序判断。',
    helperText: '困难模式需要同时记住开始、中间变化和真正结尾，慢慢拖回完整时间轴。',
    successText: '你已经能把完整故事从头讲到尾了，今天的顺序组织很稳定。',
  },
}

const STORIES: readonly StoryDefinition[] = [
  {
    id: 'birthday-party',
    minDifficulty: 1,
    title: '生日分享会',
    sceneEmoji: '🎂',
    description: '看看生日分享会里的事情，想想哪一步最先开始，哪一步最后结束。',
    tips: ['先想开始动作', '再想庆祝过程', '最后看收尾'],
    steps: [
      {
        id: 'pick-gift',
        label: '拿起礼物盒',
        emoji: '🎁',
        hint: '庆生前先准备好礼物',
        accent: '#f08383',
        tint: '#fff0f0',
      },
      {
        id: 'walk-friend',
        label: '走到朋友面前',
        emoji: '🚶',
        hint: '拿好礼物后要先来到朋友身边',
        accent: '#f1a259',
        tint: '#fff4e7',
      },
      {
        id: 'sing-song',
        label: '一起唱生日歌',
        emoji: '🎵',
        hint: '大家围在一起开始庆祝',
        accent: '#6f9bf2',
        tint: '#eef4ff',
      },
      {
        id: 'blow-candle',
        label: '吹灭蜡烛',
        emoji: '🕯️',
        hint: '唱完歌后才会吹蜡烛',
        accent: '#9b7de5',
        tint: '#f4efff',
      },
      {
        id: 'share-cake',
        label: '一起分享蛋糕',
        emoji: '🍰',
        hint: '庆祝完再把蛋糕分给大家',
        accent: '#e98ca6',
        tint: '#fff0f5',
      },
    ],
  },
  {
    id: 'slide-turn',
    minDifficulty: 1,
    title: '轮到滑滑梯',
    sceneEmoji: '🛝',
    description: '把排队滑滑梯的步骤接起来，看看怎样才算轮流完成一次。',
    tips: ['先排队等待', '轮到自己再行动', '结束后换后面的小伙伴'],
    steps: [
      {
        id: 'line-up',
        label: '排队站好',
        emoji: '🧍',
        hint: '轮流活动要先排好队',
        accent: '#5da9e9',
        tint: '#eef7ff',
      },
      {
        id: 'turn-arrives',
        label: '老师说轮到你了',
        emoji: '🙋',
        hint: '听到提示后才轮到自己',
        accent: '#5dbb63',
        tint: '#eef9ee',
      },
      {
        id: 'climb-up',
        label: '扶着扶手爬上去',
        emoji: '🪜',
        hint: '轮到自己后要先上滑梯',
        accent: '#f0a64f',
        tint: '#fff5e6',
      },
      {
        id: 'slide-down',
        label: '从滑梯滑下来',
        emoji: '🛝',
        hint: '爬上去后才会往下滑',
        accent: '#f08383',
        tint: '#fff1f1',
      },
      {
        id: 'next-friend',
        label: '换后面朋友来玩',
        emoji: '🤝',
        hint: '自己完成后要把机会让给后面的小伙伴',
        accent: '#8f7cf0',
        tint: '#f2efff',
      },
    ],
  },
  {
    id: 'borrow-crayon',
    minDifficulty: 2,
    title: '借画笔再归还',
    sceneEmoji: '🖍️',
    description: '想想借同伴画笔时，怎样做才更有礼貌、顺序也更完整。',
    tips: ['先开口请求', '用完后再归还', '最后别忘了感谢'],
    steps: [
      {
        id: 'ask-politely',
        label: '轻声说“可以借我吗”',
        emoji: '💬',
        hint: '借别人东西前要先请求',
        accent: '#5fa8d3',
        tint: '#eff8fd',
      },
      {
        id: 'receive-crayon',
        label: '接过画笔',
        emoji: '🖍️',
        hint: '对方同意后才能拿到画笔',
        accent: '#e88a5a',
        tint: '#fff3ec',
      },
      {
        id: 'finish-drawing',
        label: '画好自己的部分',
        emoji: '🎨',
        hint: '拿到画笔后再开始画',
        accent: '#6fbf84',
        tint: '#edf8f0',
      },
      {
        id: 'return-crayon',
        label: '把画笔放回桌上',
        emoji: '↩️',
        hint: '用完要先把画笔归还',
        accent: '#8e7dff',
        tint: '#f1efff',
      },
      {
        id: 'say-thanks',
        label: '说“谢谢你”',
        emoji: '😊',
        hint: '归还后别忘了礼貌道谢',
        accent: '#f29cc2',
        tint: '#fff0f7',
      },
    ],
  },
  {
    id: 'snack-share',
    minDifficulty: 2,
    title: '点心分享桌',
    sceneEmoji: '🍪',
    description: '把点心分享的顺序接起来，看看怎样才能先照顾到朋友。',
    tips: ['先准备自己', '再分享给别人', '最后一起收拾'],
    steps: [
      {
        id: 'wash-hands',
        label: '先洗干净小手',
        emoji: '🧼',
        hint: '吃点心前先把手洗干净',
        accent: '#68a7e3',
        tint: '#eef6ff',
      },
      {
        id: 'set-snacks',
        label: '把点心放到盘子里',
        emoji: '🍽️',
        hint: '洗好手后先把点心摆好',
        accent: '#f4b860',
        tint: '#fff6e5',
      },
      {
        id: 'offer-friend',
        label: '先递给朋友一份',
        emoji: '🤲',
        hint: '分享时先照顾身边的小伙伴',
        accent: '#78b06f',
        tint: '#eff7ec',
      },
      {
        id: 'take-self',
        label: '自己再拿一份',
        emoji: '🙌',
        hint: '先分享，再轮到自己拿',
        accent: '#e4878d',
        tint: '#fff0f2',
      },
      {
        id: 'clean-table',
        label: '一起收拾桌面',
        emoji: '🧽',
        hint: '吃完后还要一起整理桌子',
        accent: '#7f8cf7',
        tint: '#f0f2ff',
      },
    ],
  },
  {
    id: 'plant-flower',
    minDifficulty: 3,
    title: '一起种小花',
    sceneEmoji: '🌱',
    description: '把种花的事情从开始到结束连起来，看看怎样一步步照顾好小种子。',
    tips: ['先准备花盆', '中间按顺序种下去', '最后记得照顾和观察'],
    steps: [
      {
        id: 'bring-pot',
        label: '拿来小花盆',
        emoji: '🪴',
        hint: '种花前先准备花盆',
        accent: '#b07d53',
        tint: '#f8efe7',
      },
      {
        id: 'add-soil',
        label: '装进泥土',
        emoji: '🟤',
        hint: '花盆准备好后先装土',
        accent: '#8f6a4f',
        tint: '#f5ede8',
      },
      {
        id: 'drop-seed',
        label: '把种子放进去',
        emoji: '🌱',
        hint: '装好泥土后再放种子',
        accent: '#70a95b',
        tint: '#eef8e8',
      },
      {
        id: 'water-seed',
        label: '轻轻浇一点水',
        emoji: '💧',
        hint: '种子放好后要先浇水',
        accent: '#5da9e9',
        tint: '#edf7ff',
      },
      {
        id: 'watch-sprout',
        label: '一起看看有没有发芽',
        emoji: '👀',
        hint: '照顾之后才会慢慢观察变化',
        accent: '#e59c59',
        tint: '#fff3e7',
      },
    ],
  },
]

const THEMES: readonly ThemeDefinition[] = [
  {
    key: 'paper-ribbon',
    title: '纸带故事桌',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.4), transparent 34%), linear-gradient(180deg, #eef6ff 0%, #fff2d9 48%, #ffe8ef 100%)',
    glow: 'radial-gradient(circle, rgba(142, 197, 255, 0.72), rgba(142, 197, 255, 0))',
    helperLine: '先想谁在前面，再把故事卡拖回时间轴。',
    celebrationLine: '这些故事都接完整啦，你已经能把事情按顺序讲清楚了。',
  },
  {
    key: 'sunny-book',
    title: '晨光绘本台',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.38), transparent 35%), linear-gradient(180deg, #fff3d8 0%, #ffe5cf 46%, #edf7ea 100%)',
    glow: 'radial-gradient(circle, rgba(245, 186, 99, 0.74), rgba(245, 186, 99, 0))',
    helperLine: '故事接龙不是乱放卡片，而是先判断真正的先后顺序。',
    celebrationLine: '晨光绘本台上的故事都讲顺了，今天的接龙很稳定。',
  },
  {
    key: 'cloud-story',
    title: '云朵故事角',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 36%), linear-gradient(180deg, #eef9ff 0%, #fff3dd 44%, #fbe8ff 100%)',
    glow: 'radial-gradient(circle, rgba(167, 205, 255, 0.72), rgba(167, 205, 255, 0))',
    helperLine: '先看开始，再接中间，最后把结尾放到真正应该在的位置。',
    celebrationLine: '云朵故事角里的接龙都完成啦，你已经会把故事从头讲到尾。',
  },
]

const backdropDots: readonly BackdropDot[] = [
  { id: 1, left: 9, top: 12, size: 12, delay: 0 },
  { id: 2, left: 20, top: 74, size: 9, delay: 1.2 },
  { id: 3, left: 36, top: 10, size: 10, delay: 0.5 },
  { id: 4, left: 58, top: 14, size: 8, delay: 1.7 },
  { id: 5, left: 76, top: 78, size: 11, delay: 0.4 },
  { id: 6, left: 90, top: 22, size: 7, delay: 1.5 },
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

const playFieldRef = ref<HTMLElement | null>(null)
const sessionTheme = ref<ThemeDefinition>(THEMES[0]!)
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const sessionStories = ref<SessionStory[]>([])
const storyCards = ref<SessionStoryCard[]>([])
const currentStoryIndex = ref(0)
const completedStoryTitles = ref<string[]>([])
const completedStoryOrders = ref<string[]>([])
const placedStepLabels = ref<string[]>([])
const placementLogs = ref<string[]>([])
const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const stageMessage = ref(DIFFICULTY_CONFIGS[1].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const hoverSlotIndex = ref<number | null>(null)
const lastMistakeCardId = ref<string | null>(null)
const dragState = ref<DragState | null>(null)
const showBadge = ref(false)
const correctSteps = ref(0)
const wrongSteps = ref(0)
const firstTrySteps = ref(0)
const totalDrags = ref(0)
const responseTimesMs = ref<number[]>([])
const slotWrongAttempts = ref<number[]>([])
const playFieldRect = ref({ width: 980, height: 660 })
const slotAnchors = ref<SlotAnchor[]>([])

let roundDirty = false
let stepStartedAt = 0
let layoutRaf = 0
const scheduledTimers: number[] = []

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value] || DIFFICULTY_CONFIGS[1])
const currentStory = computed(() => sessionStories.value[currentStoryIndex.value] || null)
const slotCount = computed(() => currentStory.value?.steps.length || 0)
const currentSlotIndex = computed(() => storyCards.value.filter((card) => card.slotIndex !== null).length)
const currentTargetStep = computed(() => currentStory.value?.steps[currentSlotIndex.value] || null)
const activeOrderLabels = computed(() => ORDER_LABELS.slice(0, slotCount.value))
const totalTargetSteps = computed(() => {
  return sessionStories.value.reduce((sum, story) => sum + story.steps.length, 0)
})
const canDrag = computed(() => !props.paused && phase.value === 'ready')
const difficultyLabel = computed(() => difficultyConfig.value.label)
const storyProgressLabel = computed(() => `${completedStoryTitles.value.length}/${difficultyConfig.value.storyCount} 段`)
const stepProgressLabel = computed(() => {
  if (!slotCount.value) {
    return '等待故事'
  }

  return `${Math.min(currentSlotIndex.value + 1, slotCount.value)} / ${slotCount.value} 步`
})
const progressRatio = computed(() => {
  if (totalTargetSteps.value <= 0) {
    return 0
  }

  return Math.min(1, correctSteps.value / totalTargetSteps.value)
})
const averageStepLabel = computed(() => formatResponseTime(averageNumberList(responseTimesMs.value)))
const accuracyLabel = computed(() => {
  const attempts = correctSteps.value + wrongSteps.value
  if (attempts <= 0) {
    return '-'
  }

  return `${Math.round((correctSteps.value / attempts) * 100)}%`
})
const currentGoalLabel = computed(() => {
  if (!currentStory.value) {
    return '准备下一段故事'
  }

  const orderLabel = activeOrderLabels.value[currentSlotIndex.value]
  if (!orderLabel || !currentTargetStep.value) {
    return '这一段故事已经接完整了'
  }

  return `现在想想“${orderLabel}”应该发生什么`
})
const trayHint = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '这一轮故事都已经接完整了。'
  }

  if (!currentTargetStep.value) {
    return '把故事卡按顺序拖回时间轴。'
  }

  return `当前要找的是“${currentTargetStep.value.label}”所在的位置。`
})
const panelDescription = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return difficultyConfig.value.introText
})

function scheduleTimeout(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    const index = scheduledTimers.indexOf(timer)
    if (index >= 0) {
      scheduledTimers.splice(index, 1)
    }
    callback()
  }, delay)

  scheduledTimers.push(timer)
  return timer
}

function clearAllTimers() {
  scheduledTimers.splice(0).forEach((timer) => window.clearTimeout(timer))
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

function pickRandomTheme() {
  return shuffleArray(THEMES)[0] || THEMES[0]!
}

function averageNumberList(values: number[]) {
  const normalized = values.filter((value) => Number.isFinite(value) && value >= 0)
  if (normalized.length === 0) {
    return 0
  }

  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length
}

function formatResponseTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '-'
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }

  return `${(ms / 1000).toFixed(1)}秒`
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function startAmbientIfNeeded() {
  if (!props.settings.effectsEnabled) {
    return
  }

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore audio setup failures
  })
}

function playSoftCue() {
  if (!props.settings.effectsEnabled) {
    return
  }

  props.audio.playSoftBounce().catch(() => {
    // ignore cue failures
  })
}

function playSuccessCue(line?: string) {
  if (!props.settings.effectsEnabled) {
    return
  }

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => {
      if (line) {
        props.audio.speak(line)
      }
    }),
  ])
}

function buildSessionStories(difficulty: EmotionGameDifficulty): SessionStory[] {
  const config = DIFFICULTY_CONFIGS[difficulty]
  return shuffleArray(
    STORIES.filter((story) => story.minDifficulty <= difficulty),
  )
    .slice(0, config.storyCount)
    .map((story) => ({
      ...story,
      tips: [...story.tips],
      steps: story.steps.slice(0, config.stepCount).map((step) => ({ ...step })),
    }))
}

function buildStoryCards(story: SessionStory) {
  return shuffleArray(story.steps).map<SessionStoryCard>((step, index) => ({
    id: `${story.id}-${step.id}`,
    stepId: step.id,
    label: step.label,
    emoji: step.emoji,
    hint: step.hint,
    accent: step.accent,
    tint: step.tint,
    orderIndex: story.steps.findIndex((candidate) => candidate.id === step.id),
    slotIndex: null,
    slotX: 0,
    slotY: 0,
    x: 0,
    y: 0,
    isBouncing: false,
  }))
}

function getCardById(cardId: string) {
  return storyCards.value.find((card) => card.id === cardId) || null
}

function getCardBySlotIndex(slotIndex: number) {
  return storyCards.value.find((card) => card.slotIndex === slotIndex) || null
}

function isSlotFilled(slotIndex: number) {
  return !!getCardBySlotIndex(slotIndex)
}

function getSlotTitle(slotIndex: number) {
  const matchedCard = getCardBySlotIndex(slotIndex)
  if (matchedCard) {
    return matchedCard.label
  }

  if (phase.value === 'ready' && slotIndex === currentSlotIndex.value) {
    return '把正确故事卡拖到这里'
  }

  if (slotIndex < currentSlotIndex.value) {
    return '这一格已完成'
  }

  return '等待前面一步接好'
}

function getSlotHint(slotIndex: number) {
  const matchedCard = getCardBySlotIndex(slotIndex)
  if (matchedCard) {
    return matchedCard.hint
  }

  if (phase.value === 'ready' && slotIndex === currentSlotIndex.value) {
    return currentTargetStep.value?.hint || '想想真正应该先发生什么'
  }

  if (slotIndex < currentSlotIndex.value) {
    return '已经排到正确位置'
  }

  return '先把前面的故事卡放好，再继续接下去'
}

function scheduleLayoutSync() {
  if (layoutRaf) {
    window.cancelAnimationFrame(layoutRaf)
  }

  layoutRaf = window.requestAnimationFrame(() => {
    layoutRaf = 0
    syncPlayFieldLayout()
  })
}

function syncPlayFieldLayout() {
  const field = playFieldRef.value
  if (!field) {
    return
  }

  playFieldRect.value = {
    width: Math.max(720, Math.round(field.clientWidth || 980)),
    height: Math.max(620, Math.round(field.clientHeight || 660)),
  }

  syncSlotAnchors()
  layoutStoryCards()
}

function syncSlotAnchors() {
  const field = playFieldRef.value
  if (!field || !slotCount.value) {
    slotAnchors.value = []
    return
  }

  const fieldRect = field.getBoundingClientRect()
  slotAnchors.value = activeOrderLabels.value.map((_, index) => {
    const slotElement = field.querySelector<HTMLElement>(`[data-story-slot-index="${index}"]`)
    if (!slotElement) {
      return {
        x: 24,
        y: 176,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }
    }

    const slotRect = slotElement.getBoundingClientRect()
    return {
      x: Math.round(slotRect.left - fieldRect.left + (slotRect.width - CARD_WIDTH) / 2),
      y: Math.round(slotRect.top - fieldRect.top + (slotRect.height - CARD_HEIGHT) / 2),
      width: Math.round(slotRect.width),
      height: Math.round(slotRect.height),
    }
  })
}

function layoutStoryCards() {
  const cards = storyCards.value
  if (!cards.length) {
    return
  }

  const unmatchedCards = cards.filter((card) => card.slotIndex === null)
  const fieldWidth = playFieldRect.value.width
  const fieldHeight = playFieldRect.value.height
  const maxColumns = Math.max(2, Math.min(4, Math.floor((fieldWidth - 48) / (CARD_WIDTH + CARD_GAP_X))))
  const columns = Math.min(Math.max(1, unmatchedCards.length), maxColumns)
  const rows = Math.max(1, Math.ceil(Math.max(1, unmatchedCards.length) / columns))
  const totalWidth = columns * CARD_WIDTH + Math.max(0, columns - 1) * CARD_GAP_X
  const startX = Math.max(24, Math.round((fieldWidth - totalWidth) / 2))
  const startY = Math.max(394, fieldHeight - (rows * CARD_HEIGHT + Math.max(0, rows - 1) * CARD_GAP_Y) - 28)

  unmatchedCards.forEach((card, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    card.slotX = startX + column * (CARD_WIDTH + CARD_GAP_X)
    card.slotY = startY + row * (CARD_HEIGHT + CARD_GAP_Y)

    if (dragState.value?.cardId !== card.id) {
      card.x = card.slotX
      card.y = card.slotY
    }
  })

  cards
    .filter((card) => card.slotIndex !== null)
    .forEach((card) => {
      const anchor = slotAnchors.value[card.slotIndex || 0]
      if (!anchor) {
        return
      }

      card.slotX = anchor.x
      card.slotY = anchor.y
      card.x = anchor.x
      card.y = anchor.y
    })
}

function clampPosition(x: number, y: number) {
  const maxX = Math.max(16, playFieldRect.value.width - CARD_WIDTH - 16)
  const maxY = Math.max(16, playFieldRect.value.height - CARD_HEIGHT - 16)

  return {
    x: Math.max(16, Math.min(x, maxX)),
    y: Math.max(16, Math.min(y, maxY)),
  }
}

function getCardStyle(card: SessionStoryCard) {
  return {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    transform: `translate(${card.x}px, ${card.y}px)`,
    '--card-accent': card.accent,
    '--card-tint': card.tint,
    zIndex: dragState.value?.cardId === card.id ? '18' : card.slotIndex !== null ? '8' : '6',
  }
}

function resolveSlotIndexFromPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY)
  if (!(element instanceof HTMLElement)) {
    return null
  }

  const slotElement = element.closest<HTMLElement>('[data-story-slot-index]')
  if (!slotElement) {
    return null
  }

  const rawValue = Number(slotElement.dataset.storySlotIndex)
  return Number.isFinite(rawValue) ? rawValue : null
}

function attachPointerListeners() {
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerCancel)
}

function detachPointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerCancel)
}

function resetCardPosition(card: SessionStoryCard, bounce = false) {
  card.x = card.slotX
  card.y = card.slotY

  if (!bounce) {
    return
  }

  card.isBouncing = true
  scheduleTimeout(() => {
    card.isBouncing = false
  }, 300)
}

function registerWrongAttempt(card: SessionStoryCard, reason: 'slot' | 'card') {
  const slotIndex = currentSlotIndex.value
  const orderLabel = activeOrderLabels.value[slotIndex] || `第 ${slotIndex + 1} 步`

  wrongSteps.value += 1
  slotWrongAttempts.value[slotIndex] = (slotWrongAttempts.value[slotIndex] || 0) + 1
  lastMistakeCardId.value = card.id
  statusTone.value = 'gentle'
  phase.value = 'ready'

  if (reason === 'slot') {
    stageMessage.value = `先把“${orderLabel}”这一格填好，再继续接下去。`
    helperMessage.value = currentTargetStep.value?.hint || '先看前面一步应该发生什么。'
    placementLogs.value = [
      ...placementLogs.value,
      `错误拖放：${card.label} 没有放到当前要接的格子`,
    ]
  } else {
    stageMessage.value = `${card.label} 还不是“${orderLabel}”应该发生的事。`
    helperMessage.value = currentTargetStep.value?.hint || '再看看哪张卡更适合排在前面。'
    placementLogs.value = [
      ...placementLogs.value,
      `错误排序：${card.label} 不是第 ${slotIndex + 1} 步`,
    ]
  }

  playSoftCue()
  resetCardPosition(card, true)
}

function completeCurrentStory() {
  if (!currentStory.value) {
    return
  }

  const story = currentStory.value
  completedStoryTitles.value = [...completedStoryTitles.value, story.title]
  completedStoryOrders.value = [
    ...completedStoryOrders.value,
    story.steps.map((step) => step.label).join(' → '),
  ]
  phase.value = 'feedback'
  statusTone.value = 'success'
  stageMessage.value = `《${story.title}》已经接完整了。`
  helperMessage.value = '这一段故事从开始到结尾都排顺了。'

  if (currentStoryIndex.value + 1 >= sessionStories.value.length) {
    finishSession()
    return
  }

  scheduleTimeout(() => {
    currentStoryIndex.value += 1
    startCurrentStory()
  }, 920)
}

function handleCorrectPlacement(card: SessionStoryCard, slotIndex: number) {
  const elapsedMs = Math.max(0, Math.round(performance.now() - stepStartedAt))

  if ((slotWrongAttempts.value[slotIndex] || 0) === 0) {
    firstTrySteps.value += 1
  }

  responseTimesMs.value = [...responseTimesMs.value, elapsedMs]
  correctSteps.value += 1
  placedStepLabels.value = [...placedStepLabels.value, card.label]
  placementLogs.value = [...placementLogs.value, `第 ${slotIndex + 1} 步：${card.label}`]
  card.slotIndex = slotIndex
  lastMistakeCardId.value = null
  statusTone.value = 'success'
  phase.value = 'feedback'
  stageMessage.value = `对了，${card.label} 应该排在这里。`
  helperMessage.value = currentStory.value?.description || difficultyConfig.value.helperText
  layoutStoryCards()
  playSuccessCue(`${card.label} 排对了。`)

  const storyFinished = storyCards.value.every((item) => item.slotIndex !== null)
  if (storyFinished) {
    completeCurrentStory()
    return
  }

  scheduleTimeout(() => {
    phase.value = 'ready'
    statusTone.value = 'neutral'
    lastMistakeCardId.value = null
    stageMessage.value = currentStory.value
      ? `继续给《${currentStory.value.title}》接故事。`
      : difficultyConfig.value.introText
    helperMessage.value = currentTargetStep.value?.hint || difficultyConfig.value.helperText
    stepStartedAt = performance.now()
  }, 700)
}

function attemptPlaceCard(card: SessionStoryCard, slotIndex: number) {
  const expectedSlotIndex = currentSlotIndex.value

  if (slotIndex !== expectedSlotIndex) {
    registerWrongAttempt(card, 'slot')
    return
  }

  if (card.orderIndex !== expectedSlotIndex) {
    registerWrongAttempt(card, 'card')
    return
  }

  handleCorrectPlacement(card, slotIndex)
}

function beginDrag(cardId: string, event: PointerEvent) {
  if (!canDrag.value) {
    return
  }

  const card = getCardById(cardId)
  const fieldRect = playFieldRef.value?.getBoundingClientRect()
  if (!card || card.slotIndex !== null || !fieldRect) {
    return
  }

  markRoundDirtyOnce()
  startAmbientIfNeeded()
  totalDrags.value += 1
  dragState.value = {
    cardId,
    pointerId: event.pointerId,
    offsetX: event.clientX - fieldRect.left - card.x,
    offsetY: event.clientY - fieldRect.top - card.y,
  }
  hoverSlotIndex.value = resolveSlotIndexFromPoint(event.clientX, event.clientY)
  attachPointerListeners()
}

function handlePointerMove(event: PointerEvent) {
  const activeDrag = dragState.value
  const fieldRect = playFieldRef.value?.getBoundingClientRect()
  if (!activeDrag || !fieldRect || event.pointerId !== activeDrag.pointerId || props.paused) {
    return
  }

  const card = getCardById(activeDrag.cardId)
  if (!card) {
    return
  }

  const nextX = event.clientX - fieldRect.left - activeDrag.offsetX
  const nextY = event.clientY - fieldRect.top - activeDrag.offsetY
  const clamped = clampPosition(nextX, nextY)
  card.x = clamped.x
  card.y = clamped.y
  hoverSlotIndex.value = resolveSlotIndexFromPoint(event.clientX, event.clientY)
}

function handlePointerUp(event: PointerEvent) {
  const activeDrag = dragState.value
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return
  }

  detachPointerListeners()
  const hoveredSlotIndex = resolveSlotIndexFromPoint(event.clientX, event.clientY)
  const card = getCardById(activeDrag.cardId)
  dragState.value = null
  hoverSlotIndex.value = null

  if (!card) {
    return
  }

  if (hoveredSlotIndex === null) {
    resetCardPosition(card)
    return
  }

  attemptPlaceCard(card, hoveredSlotIndex)
}

function handlePointerCancel(event: PointerEvent) {
  const activeDrag = dragState.value
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return
  }

  detachPointerListeners()
  const card = getCardById(activeDrag.cardId)
  dragState.value = null
  hoverSlotIndex.value = null

  if (card) {
    resetCardPosition(card)
  }
}

function startCurrentStory() {
  const story = currentStory.value
  if (!story) {
    return
  }

  storyCards.value = buildStoryCards(story)
  slotWrongAttempts.value = new Array(story.steps.length).fill(0)
  hoverSlotIndex.value = null
  lastMistakeCardId.value = null
  statusTone.value = 'neutral'
  phase.value = 'ready'
  stageMessage.value = `把《${story.title}》的故事卡拖回正确顺序。`
  helperMessage.value = story.description
  stepStartedAt = performance.now()

  nextTick().then(() => {
    scheduleLayoutSync()
  })
}

function buildPerformanceData() {
  const totalAttempts = correctSteps.value + wrongSteps.value

  return {
    completed_stories: completedStoryTitles.value.length,
    target_story_count: difficultyConfig.value.storyCount,
    correct_steps: correctSteps.value,
    wrong_steps: wrongSteps.value,
    target_step_count: totalTargetSteps.value,
    first_try_steps: firstTrySteps.value,
    total_drags: totalDrags.value,
    accuracy_ratio: Number((correctSteps.value / Math.max(1, totalAttempts)).toFixed(4)),
    response_times_ms: [...responseTimesMs.value],
    average_step_ms: Math.round(averageNumberList(responseTimesMs.value)),
    story_ids: sessionStories.value.map((story) => story.id),
    story_titles: sessionStories.value.map((story) => story.title),
    story_target_orders: sessionStories.value.map((story) => story.steps.map((step) => step.label).join(' → ')),
    completed_story_titles: [...completedStoryTitles.value],
    completed_story_orders: [...completedStoryOrders.value],
    placed_step_labels: [...placedStepLabels.value],
    placement_logs: [...placementLogs.value],
    session_theme: sessionTheme.value.key,
    session_theme_title: sessionTheme.value.title,
  }
}

function finishSession() {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return
  }

  phase.value = 'celebrating'
  statusTone.value = 'success'
  stageMessage.value = '所有故事都接完整啦。'
  helperMessage.value = difficultyConfig.value.successText
  props.audio.stopAmbient()
  playSuccessCue(sessionTheme.value.celebrationLine)

  scheduleTimeout(() => {
    showBadge.value = true
  }, 650)

  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_STORY_GUIDE',
        badgeName: '故事小导演徽章',
      },
    })
    phase.value = 'finished'
  }, 1300)

  scheduleTimeout(() => {
    if (!props.paused) {
      resetForDifficulty(activeDifficulty.value)
    }
  }, 3100)
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  detachPointerListeners()
  activeDifficulty.value = difficulty
  sessionTheme.value = pickRandomTheme()
  sessionStories.value = buildSessionStories(difficulty)
  storyCards.value = []
  currentStoryIndex.value = 0
  completedStoryTitles.value = []
  completedStoryOrders.value = []
  placedStepLabels.value = []
  placementLogs.value = []
  correctSteps.value = 0
  wrongSteps.value = 0
  firstTrySteps.value = 0
  totalDrags.value = 0
  responseTimesMs.value = []
  slotWrongAttempts.value = []
  hoverSlotIndex.value = null
  lastMistakeCardId.value = null
  dragState.value = null
  showBadge.value = false
  roundDirty = false
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].introText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].helperText
  statusTone.value = 'neutral'
  phase.value = 'ready'
  props.audio.stopAmbient()

  if (sessionStories.value.length > 0) {
    startCurrentStory()
  }
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
    if (paused) {
      props.audio.stopAmbient()
      return
    }

    if (roundDirty && phase.value === 'ready') {
      startAmbientIfNeeded()
    }
  },
)

watch(
  () => `${currentStory.value?.id || ''}|${storyCards.value.map((card) => `${card.id}:${card.slotIndex ?? 'x'}`).join('|')}`,
  () => {
    nextTick().then(() => {
      scheduleLayoutSync()
    })
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', scheduleLayoutSync)
  resetForDifficulty(props.difficulty)
})

onBeforeUnmount(() => {
  if (layoutRaf) {
    window.cancelAnimationFrame(layoutRaf)
    layoutRaf = 0
  }

  clearAllTimers()
  detachPointerListeners()
  window.removeEventListener('resize', scheduleLayoutSync)
  props.audio.stopAmbient()
})
</script>

<style scoped>
.story-sequence-game {
  position: relative;
  min-height: calc(100vh - 150px);
  padding: 24px;
  overflow: hidden;
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.glow-orb {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  opacity: 0.55;
  filter: blur(10px);
}

.glow-orb--left {
  top: -32px;
  left: -46px;
}

.glow-orb--right {
  right: -24px;
  bottom: 36px;
}

.backdrop-dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  animation: story-float 6.6s ease-in-out infinite;
}

.hud-panel,
.stage-layout {
  position: relative;
  z-index: 1;
}

.hud-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.hud-card,
.story-brief,
.instruction-panel,
.badge-modal {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 18px 36px rgba(91, 78, 58, 0.12);
  backdrop-filter: blur(10px);
}

.hud-card {
  padding: 14px 16px;
  border-radius: 18px;
}

.hud-card span {
  display: block;
  margin-bottom: 6px;
  color: #7a6f65;
  font-size: 13px;
}

.hud-card strong {
  color: #4f3d2b;
  font-size: 18px;
}

.stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
  gap: 18px;
}

.play-field {
  position: relative;
  min-height: 720px;
  padding: 18px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  overflow: hidden;
}

.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.status-strip span {
  color: #7a6f65;
  font-size: 13px;
}

.status-strip strong {
  color: #4e3a24;
}

.status-strip[data-tone='gentle'] {
  background: rgba(255, 244, 227, 0.94);
}

.status-strip[data-tone='success'] {
  background: rgba(233, 250, 235, 0.94);
}

.story-brief {
  margin-top: 16px;
  padding: 18px 20px;
  border-radius: 22px;
}

.story-brief__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.story-brief__heading strong {
  color: #4f3d2b;
  font-size: 22px;
}

.story-brief__heading p {
  margin: 0;
  color: #7c6b52;
  line-height: 1.6;
}

.story-brief__chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 999px;
  background: rgba(142, 197, 255, 0.2);
  color: #5076a2;
  font-size: 12px;
}

.story-brief__description {
  margin: 14px 0 0;
  color: #665d55;
  line-height: 1.7;
}

.story-clues {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.story-clues span {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(248, 243, 233, 0.98);
  color: #7d6b54;
  font-size: 12px;
}

.timeline-board {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.timeline-slot {
  min-height: 170px;
  padding: 14px 12px;
  border-radius: 20px;
  border: 2px dashed rgba(208, 197, 181, 0.86);
  background: rgba(255, 255, 255, 0.72);
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.timeline-slot__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-slot__header span {
  color: #9b7d52;
  font-size: 12px;
}

.timeline-slot__header strong {
  color: #59462f;
  line-height: 1.5;
}

.timeline-slot__hint {
  margin: 14px 0 0;
  color: #776a5d;
  font-size: 13px;
  line-height: 1.6;
}

.timeline-slot.is-active {
  border-color: rgba(245, 166, 35, 0.64);
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.14) inset;
  transform: translateY(-2px);
}

.timeline-slot.is-hovering {
  background: rgba(255, 249, 236, 0.95);
}

.timeline-slot.is-filled {
  border-style: solid;
  border-color: rgba(126, 183, 112, 0.5);
  background: rgba(242, 251, 240, 0.92);
}

.tray-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-top: 22px;
  padding: 0 4px;
}

.tray-header strong {
  display: block;
  margin-bottom: 6px;
  color: #4d3b29;
}

.tray-header span,
.tray-header small {
  color: #7a6d61;
  line-height: 1.6;
}

.story-card {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 14px 12px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: var(--card-tint);
  color: var(--card-accent);
  cursor: grab;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.story-card__emoji {
  font-size: 28px;
}

.story-card strong {
  color: #41362e;
  text-align: left;
  line-height: 1.5;
}

.story-card small {
  color: #6c655d;
  text-align: left;
  line-height: 1.5;
}

.story-card.dragging {
  cursor: grabbing;
  box-shadow: 0 18px 28px rgba(68, 58, 44, 0.18);
}

.story-card.matched {
  box-shadow: 0 14px 24px rgba(72, 121, 78, 0.14);
}

.story-card.mistake {
  border-color: rgba(233, 116, 106, 0.52);
  box-shadow: 0 0 0 2px rgba(233, 116, 106, 0.16) inset;
}

.story-card.bouncing {
  animation: story-bounce 0.28s ease;
}

.instruction-panel {
  border-radius: 28px;
  padding: 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-tags span {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(247, 241, 233, 0.98);
  color: #7d6f62;
  font-size: 12px;
}

.panel-tags .accent {
  background: rgba(245, 166, 35, 0.18);
  color: #986317;
}

.instruction-panel h2 {
  margin: 0;
  color: #4f3d2b;
  font-size: 28px;
}

.instruction-panel p,
.instruction-panel small {
  margin: 0;
  color: #6d645b;
  line-height: 1.7;
}

.progress-block,
.focus-card,
.tip-card {
  border-radius: 20px;
  background: rgba(251, 248, 240, 0.98);
}

.progress-block {
  padding: 16px;
}

.progress-labels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  color: #7d7265;
  font-size: 12px;
}

.progress-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(220, 210, 195, 0.7);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #8ec5ff 0%, #f0be63 100%);
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tip-card {
  padding: 14px;
}

.tip-card strong {
  display: block;
  margin-bottom: 6px;
  color: #7d6847;
  font-size: 13px;
}

.tip-card span {
  color: #4a3b2a;
  font-size: 16px;
  line-height: 1.5;
}

.focus-card {
  padding: 16px;
}

.focus-card strong {
  display: block;
  margin-bottom: 10px;
  color: #7d6847;
}

.badge-modal {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  width: min(320px, calc(100% - 40px));
  padding: 28px 24px;
  border-radius: 24px;
  text-align: center;
  transform: translate(-50%, -50%);
}

.badge-icon {
  font-size: 52px;
  margin-bottom: 12px;
}

.badge-modal strong {
  display: block;
  color: #4f3d2b;
  font-size: 24px;
}

.badge-modal p {
  margin: 12px 0 0;
  color: #6d645b;
  line-height: 1.7;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -45%) scale(0.96);
}

@keyframes story-float {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.28;
  }
  50% {
    transform: translateY(-10px);
    opacity: 0.56;
  }
}

@keyframes story-bounce {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(0.96);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 1180px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }

  .timeline-board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .story-sequence-game {
    padding: 16px;
  }

  .hud-panel,
  .tip-grid,
  .timeline-board {
    grid-template-columns: 1fr;
  }

  .play-field {
    min-height: 980px;
  }

  .tray-header,
  .story-brief__heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .progress-labels {
    grid-template-columns: 1fr;
  }
}
</style>
