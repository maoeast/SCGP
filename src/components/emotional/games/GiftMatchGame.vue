<template>
  <div class="gift-match-game" :style="{ background: sessionTheme.skyGradient }">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="glow-orb glow-orb--left" :style="{ background: sessionTheme.glowGradient }"></div>
      <div class="glow-orb glow-orb--right" :style="{ background: sessionTheme.glowGradient }"></div>
      <span
        v-for="confetti in confettiDots"
        :key="confetti.id"
        class="confetti-dot"
        :style="{
          left: `${confetti.left}%`,
          top: `${confetti.top}%`,
          width: `${confetti.size}px`,
          height: `${confetti.size}px`,
          animationDelay: `${confetti.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>分享进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>错误拖放</span>
        <strong>{{ wrongMatches }} 次</strong>
      </div>
      <div class="hud-card">
        <span>首次命中</span>
        <strong>{{ firstTryMatches }} 组</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section ref="playFieldRef" class="play-field">
        <div class="status-strip">
          <span>{{ sessionTheme.title }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <div class="recipient-grid">
          <article
            v-for="recipient in sessionRecipients"
            :key="recipient.id"
            class="recipient-card"
            :class="{
              matched: !!recipient.matchedGiftId,
              hovering: hoverRecipientId === recipient.id && !recipient.matchedGiftId,
            }"
            :data-recipient-id="recipient.id"
          >
            <div class="recipient-card__header">
              <div class="recipient-avatar">{{ recipient.avatar }}</div>
              <div class="recipient-copy">
                <strong>{{ recipient.name }}</strong>
                <small>{{ recipient.preferenceLine }}</small>
              </div>
            </div>

            <p class="recipient-clue">{{ recipient.clue }}</p>

            <div class="recipient-tips">
              <span v-for="tip in recipient.tipChips" :key="tip">{{ tip }}</span>
            </div>

            <div class="recipient-dropzone">
              <template v-if="recipient.matchedGiftId">
                <span class="matched-chip">
                  {{ getGiftEmoji(recipient.matchedGiftId) }} {{ getGiftLabel(recipient.matchedGiftId) }}
                </span>
              </template>
              <template v-else>
                <span>把合适的礼物拖到这里</span>
              </template>
            </div>
          </article>
        </div>

        <div class="gift-shelf">
          <div class="gift-shelf__copy">
            <strong>礼物托盘</strong>
            <span>{{ shelfHint }}</span>
          </div>
          <div class="gift-shelf__meta">
            <span>目标 {{ difficultyConfig.pairCount }} 组</span>
            <span v-if="difficultyConfig.distractorCount > 0">干扰 {{ difficultyConfig.distractorCount }} 份</span>
            <span>总拖拽 {{ totalDrags }} 次</span>
          </div>
        </div>

        <button
          v-for="gift in visibleGifts"
          :key="gift.id"
          type="button"
          class="gift-card"
          :class="{
            dragging: dragState?.giftId === gift.id,
            bouncing: gift.isBouncing,
          }"
          :style="getGiftStyle(gift)"
          :disabled="props.paused || phase === 'celebrating'"
          @pointerdown.prevent="beginDrag(gift.id, $event)"
        >
          <span class="gift-card__emoji">{{ gift.emoji }}</span>
          <strong>{{ gift.label }}</strong>
          <small>{{ gift.shortHint }}</small>
        </button>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>社交沟通</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>礼物分享派对</h2>
        <p>{{ helperMessage }}</p>
        <small>{{ sessionTheme.badgeCopy }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>先看线索</span>
            <span>想想谁需要它</span>
            <span>稳稳分享出去</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>礼物数量</strong>
            <span>{{ visibleGiftCountLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>估算准确率</strong>
            <span>{{ accuracyLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>平均配对</strong>
            <span>{{ averageMatchLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>本轮提示</strong>
            <span>{{ promptLabel }}</span>
          </div>
        </div>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🎁</div>
        <strong>分享小达人徽章</strong>
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

type Phase = 'ready' | 'playing' | 'celebrating' | 'finished'

interface DifficultyConfig {
  pairCount: number
  distractorCount: number
  shortLabel: string
  introText: string
  helperText: string
  successText: string
}

interface ThemeDefinition {
  key: string
  title: string
  skyGradient: string
  glowGradient: string
  badgeCopy: string
  celebrationLine: string
}

interface GiftDefinition {
  id: string
  label: string
  emoji: string
  shortHint: string
  accent: string
  tint: string
}

interface RecipientDefinition {
  id: string
  name: string
  avatar: string
  preferenceLine: string
  clue: string
  tipChips: readonly string[]
  expectedGiftId: string
  shareLine: string
}

interface SessionRecipient extends RecipientDefinition {
  matchedGiftId: string | null
  hadWrongAttempt: boolean
}

interface SessionGift extends GiftDefinition {
  matchedRecipientId: string | null
  slotIndex: number
  slotX: number
  slotY: number
  x: number
  y: number
  isBouncing: boolean
}

interface DragState {
  giftId: string
  pointerId: number
  offsetX: number
  offsetY: number
  startedAt: number
}

interface ConfettiDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    pairCount: 3,
    distractorCount: 0,
    shortLabel: '简单 · 明显喜好',
    introText: '先看看每个小伙伴喜欢什么，再把最合适的礼物拖过去。',
    helperText: '简单模式会给出更明显的线索，先练习把“谁喜欢什么”看清楚。',
    successText: '你已经能根据明显线索把礼物分享对了，分享小达人徽章亮起来了。',
  },
  2: {
    pairCount: 4,
    distractorCount: 1,
    shortLabel: '中等 · 加入干扰',
    introText: '这次会出现相似礼物，先读线索，再决定送给谁。',
    helperText: '中等模式会多一份干扰礼物，需要把喜好和场景提示一起看。',
    successText: '你已经能把线索和礼物对应起来，分享判断越来越稳。',
  },
  3: {
    pairCount: 5,
    distractorCount: 2,
    shortLabel: '困难 · 综合判断',
    introText: '困难模式里要同时看表情、口头线索和礼物差别，再把合适的礼物送出去。',
    helperText: '困难模式会出现更多相似选项，先观察，再想“谁现在最需要哪一份礼物”。',
    successText: '你已经能综合线索做分享判断了，今天的观察和照顾都很细致。',
  },
}

const DEFAULT_THEME: ThemeDefinition = {
  key: 'sunny-party',
  title: '暖阳分享派对',
  skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.4), transparent 36%), linear-gradient(180deg, #fff3d9 0%, #ffe0ec 52%, #dff3ff 100%)',
  glowGradient: 'radial-gradient(circle, rgba(255, 190, 120, 0.88), rgba(255, 190, 120, 0))',
  badgeCopy: '先看别人喜欢什么，再把礼物分享出去，才是真正体贴的小伙伴。',
  celebrationLine: '礼物都分享对啦，大家都被你照顾到了。',
}

const THEMES: readonly ThemeDefinition[] = [
  DEFAULT_THEME,
  {
    key: 'garden-table',
    title: '花园礼物桌',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.46), transparent 34%), linear-gradient(180deg, #e8fff2 0%, #fff8d8 48%, #ffe4f2 100%)',
    glowGradient: 'radial-gradient(circle, rgba(144, 222, 186, 0.86), rgba(144, 222, 186, 0))',
    badgeCopy: '分享不是随手送出去，而是先想到对方需要什么。',
    celebrationLine: '每一份礼物都送到了喜欢它的人手里，花园派对更热闹了。',
  },
  {
    key: 'rainbow-room',
    title: '彩虹庆祝屋',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 35%), linear-gradient(180deg, #eaf0ff 0%, #ffe7f1 52%, #fff2ce 100%)',
    glowGradient: 'radial-gradient(circle, rgba(147, 176, 255, 0.82), rgba(147, 176, 255, 0))',
    badgeCopy: '你没有急着乱送，而是先观察、再分享，这就是会照顾人的做法。',
    celebrationLine: '彩虹屋里的礼物都送好了，大家都在对你说谢谢。',
  },
]

const DEFAULT_GIFT_DEFINITION: GiftDefinition = {
  id: 'storybook',
  label: '图画书',
  emoji: '📚',
  shortHint: '适合爱听故事的小伙伴',
  accent: '#ff9f68',
  tint: '#fff1e5',
}

const GIFT_DEFINITIONS: Record<string, GiftDefinition> = {
  storybook: DEFAULT_GIFT_DEFINITION,
  soccerBall: {
    id: 'soccerBall',
    label: '足球',
    emoji: '⚽',
    shortHint: '适合想去操场活动的小伙伴',
    accent: '#5dbb63',
    tint: '#ecf9ee',
  },
  stickerSet: {
    id: 'stickerSet',
    label: '星星贴纸',
    emoji: '🌟',
    shortHint: '适合喜欢奖励贴纸的小伙伴',
    accent: '#f2b03b',
    tint: '#fff8df',
  },
  puzzleBox: {
    id: 'puzzleBox',
    label: '拼图盒',
    emoji: '🧩',
    shortHint: '适合喜欢安静动脑的小伙伴',
    accent: '#7a8cff',
    tint: '#eef1ff',
  },
  paintKit: {
    id: 'paintKit',
    label: '画笔盒彩绘',
    emoji: '🎨',
    shortHint: '适合爱画画的小伙伴',
    accent: '#ff7ca5',
    tint: '#fff0f5',
  },
  plushBear: {
    id: 'plushBear',
    label: '抱抱小熊',
    emoji: '🧸',
    shortHint: '适合想要柔软安抚的小伙伴',
    accent: '#c08a5c',
    tint: '#f8efe8',
  },
  musicBox: {
    id: 'musicBox',
    label: '音乐盒',
    emoji: '🎵',
    shortHint: '适合喜欢旋律和节奏的小伙伴',
    accent: '#6cb6ff',
    tint: '#ecf7ff',
  },
  toyTrain: {
    id: 'toyTrain',
    label: '小火车',
    emoji: '🚂',
    shortHint: '适合喜欢轨道玩具的小伙伴',
    accent: '#ff8a65',
    tint: '#fff1eb',
  },
}

const RECIPIENT_POOL: readonly RecipientDefinition[] = [
  {
    id: 'linlin',
    name: '琳琳',
    avatar: '👧',
    preferenceLine: '她刚刚坐到阅读角，想找一本有小动物的故事书。',
    clue: '琳琳翻着空空的书篮，说“要是有会讲故事的礼物就好了。”',
    tipChips: ['喜欢听故事', '适合安静分享'],
    expectedGiftId: 'storybook',
    shareLine: '琳琳把图画书抱在怀里，笑着说“谢谢你记得我喜欢故事。”',
  },
  {
    id: 'haohao',
    name: '浩浩',
    avatar: '👦',
    preferenceLine: '他一直望着操场，脚尖轻轻点地，想赶快去活动。',
    clue: '浩浩说“等一下下课，我最想先去踢一会儿球。”',
    tipChips: ['想去操场', '喜欢大动作活动'],
    expectedGiftId: 'soccerBall',
    shareLine: '浩浩抱住足球，马上朝你点头，好像已经准备好去操场了。',
  },
  {
    id: 'mimi',
    name: '咪咪',
    avatar: '🧒',
    preferenceLine: '她刚完成一张练习卡，最想得到亮闪闪的小奖励。',
    clue: '咪咪小声问“今天有没有星星贴纸？我想把它贴在小本子上。”',
    tipChips: ['喜欢奖励贴纸', '完成任务后更开心'],
    expectedGiftId: 'stickerSet',
    shareLine: '咪咪接过星星贴纸，眼睛马上亮起来，说想贴满整页。',
  },
  {
    id: 'dongdong',
    name: '东东',
    avatar: '👦',
    preferenceLine: '他把几块拼图摆在桌上，正想继续把画面拼完整。',
    clue: '东东盯着桌面说“再有一盒拼图，我就能继续慢慢拼了。”',
    tipChips: ['喜欢安静动脑', '需要专注小任务'],
    expectedGiftId: 'puzzleBox',
    shareLine: '东东把拼图盒摆得整整齐齐，轻声说“这个正好适合我继续拼。”',
  },
  {
    id: 'xiaoyu',
    name: '小雨',
    avatar: '👧',
    preferenceLine: '她看着画架和彩纸，已经想好要画一朵大大的向日葵。',
    clue: '小雨比着手势说“如果有新的画笔颜色，我就能把花瓣画得更亮。”',
    tipChips: ['喜欢画画', '想做彩色作品'],
    expectedGiftId: 'paintKit',
    shareLine: '小雨拿到画笔盒后立刻坐到画架前，笑着说这正是她想要的。',
  },
  {
    id: 'qiqi',
    name: '琪琪',
    avatar: '🧒',
    preferenceLine: '她刚安静下来，怀里空空的，想找一个柔软的小伙伴陪着。',
    clue: '琪琪摸着衣角说“如果有软软的小熊抱一下，我会更安心。”',
    tipChips: ['需要柔软安抚', '适合抱抱类礼物'],
    expectedGiftId: 'plushBear',
    shareLine: '琪琪把小熊贴在脸旁边，呼吸都变得慢慢的，说“这样我舒服多了。”',
  },
  {
    id: 'leilei',
    name: '乐乐',
    avatar: '👦',
    preferenceLine: '他正跟着背景音乐轻轻晃动身体，很想继续听旋律。',
    clue: '乐乐说“如果礼物会唱歌，我就能一边听一边轻轻跟着拍手。”',
    tipChips: ['喜欢音乐', '适合节奏活动'],
    expectedGiftId: 'musicBox',
    shareLine: '乐乐轻轻摇着音乐盒，跟着旋律笑起来，说这份礼物真好听。',
  },
  {
    id: 'nana',
    name: '娜娜',
    avatar: '👧',
    preferenceLine: '她蹲在地上看着轨道图片，一直说想让小车跑起来。',
    clue: '娜娜说“如果有会跑的小火车，我就能把轨道游戏接着玩下去。”',
    tipChips: ['喜欢轨道玩具', '需要动手搭配'],
    expectedGiftId: 'toyTrain',
    shareLine: '娜娜把小火车轻轻放上桌边，说这份礼物正好能接上她的轨道游戏。',
  },
]

const GIFT_CARD_WIDTH = 152
const GIFT_CARD_HEIGHT = 116
const GIFT_CARD_GAP_X = 18
const GIFT_CARD_GAP_Y = 16

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
const sessionRecipients = ref<SessionRecipient[]>([])
const sessionGifts = ref<SessionGift[]>([])
const sessionTheme = ref<ThemeDefinition>(DEFAULT_THEME)
const phase = ref<Phase>('ready')
const stageMessage = ref(DIFFICULTY_CONFIGS[1].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const hoverRecipientId = ref<string | null>(null)
const dragState = ref<DragState | null>(null)
const showBadge = ref(false)
const totalDrags = ref(0)
const correctMatches = ref(0)
const wrongMatches = ref(0)
const firstTryMatches = ref(0)
const matchTimesMs = ref<number[]>([])
const matchedPairs = ref<string[]>([])
const playFieldRect = ref({ width: 960, height: 620 })

let roundDirty = false
let completed = false
let layoutRaf = 0
const scheduledTimeouts: number[] = []
const confettiDots: readonly ConfettiDot[] = [
  { id: 1, left: 10, top: 16, size: 12, delay: 0 },
  { id: 2, left: 26, top: 9, size: 8, delay: 1.4 },
  { id: 3, left: 44, top: 14, size: 10, delay: 0.7 },
  { id: 4, left: 63, top: 11, size: 7, delay: 1.8 },
  { id: 5, left: 81, top: 18, size: 9, delay: 0.3 },
  { id: 6, left: 90, top: 8, size: 11, delay: 1.1 },
]

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty] || DIFFICULTY_CONFIGS[1])
const matchedCount = computed(() => sessionRecipients.value.filter((recipient) => !!recipient.matchedGiftId).length)
const progressRatio = computed(() => matchedCount.value / Math.max(1, sessionRecipients.value.length))
const progressLabel = computed(() => `${matchedCount.value}/${sessionRecipients.value.length} 组`)
const difficultyLabel = computed(() => difficultyConfig.value.shortLabel)
const visibleGifts = computed(() => sessionGifts.value.filter((gift) => !gift.matchedRecipientId))
const visibleGiftCountLabel = computed(() => `${visibleGifts.value.length} 份`)
const averageMatchLabel = computed(() => formatResponseTime(averageNumberList(matchTimesMs.value)))
const accuracyLabel = computed(() => {
  const attempts = correctMatches.value + wrongMatches.value
  if (attempts <= 0) {
    return '-'
  }

  return `${Math.round((correctMatches.value / attempts) * 100)}%`
})
const promptLabel = computed(() => {
  if (phase.value === 'celebrating') {
    return '这一轮礼物都分享好了'
  }

  if (hoverRecipientId.value) {
    const recipient = sessionRecipients.value.find((item) => item.id === hoverRecipientId.value)
    return recipient ? `正在看 ${recipient.name}` : '继续观察线索'
  }

  return '先看线索，再拖过去'
})
const shelfHint = computed(() => {
  if (difficultyConfig.value.distractorCount > 0) {
    return '先分清真正需要的礼物，干扰礼物可以先放着。'
  }

  return '每一份礼物都对应一个真正需要它的小伙伴。'
})

function shuffleArray<T>(source: readonly T[]) {
  const copy = [...source] as T[]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = copy[index]!
    const swapped = copy[swapIndex]!
    copy[index] = swapped
    copy[swapIndex] = current
  }

  return copy
}

function pickRandomTheme() {
  const themes = shuffleArray(THEMES)
  return themes[0] || DEFAULT_THEME
}

function averageNumberList(values: number[]) {
  const normalized = values.filter((value) => Number.isFinite(value) && value >= 0)
  if (!normalized.length) {
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

function scheduleTimeout(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    const index = scheduledTimeouts.indexOf(timer)
    if (index >= 0) {
      scheduledTimeouts.splice(index, 1)
    }
    callback()
  }, delay)

  scheduledTimeouts.push(timer)
  return timer
}

function clearTimeouts() {
  scheduledTimeouts.splice(0).forEach((timer) => window.clearTimeout(timer))
}

function markDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function getGiftDefinition(giftId: string) {
  return GIFT_DEFINITIONS[giftId] || DEFAULT_GIFT_DEFINITION
}

function getGiftLabel(giftId: string) {
  return getGiftDefinition(giftId).label
}

function getGiftEmoji(giftId: string) {
  return getGiftDefinition(giftId).emoji
}

function buildSessionRecipients(pairCount: number) {
  return shuffleArray(RECIPIENT_POOL)
    .slice(0, pairCount)
    .map<SessionRecipient>((recipient) => ({
      ...recipient,
      matchedGiftId: null,
      hadWrongAttempt: false,
    }))
}

function buildSessionGifts(recipients: SessionRecipient[], distractorCount: number) {
  const targetGiftIds = recipients.map((recipient) => recipient.expectedGiftId)
  const distractorGiftIds = shuffleArray(Object.keys(GIFT_DEFINITIONS).filter((giftId) => !targetGiftIds.includes(giftId)))
    .slice(0, distractorCount)
  const giftIds = shuffleArray([...targetGiftIds, ...distractorGiftIds])

  return giftIds.map<SessionGift>((giftId, index) => {
    const definition = getGiftDefinition(giftId)
    return {
      ...definition,
      matchedRecipientId: null,
      slotIndex: index,
      slotX: 0,
      slotY: 0,
      x: 0,
      y: 0,
      isBouncing: false,
    }
  })
}

function syncPlayFieldRect() {
  const width = playFieldRef.value?.clientWidth || 960
  const height = playFieldRef.value?.clientHeight || 620
  playFieldRect.value = {
    width: Math.max(720, Math.round(width)),
    height: Math.max(560, Math.round(height)),
  }
  layoutGiftSlots()
}

function scheduleLayoutSync() {
  if (layoutRaf) {
    window.cancelAnimationFrame(layoutRaf)
  }

  layoutRaf = window.requestAnimationFrame(() => {
    layoutRaf = 0
    syncPlayFieldRect()
  })
}

function layoutGiftSlots() {
  const gifts = visibleGifts.value
  if (!gifts.length) {
    return
  }

  const fieldWidth = playFieldRect.value.width
  const fieldHeight = playFieldRect.value.height
  const maxColumns = Math.max(2, Math.min(4, Math.floor((fieldWidth - 48) / (GIFT_CARD_WIDTH + GIFT_CARD_GAP_X))))
  const columns = Math.min(Math.max(1, gifts.length), maxColumns)
  const rows = Math.max(1, Math.ceil(gifts.length / columns))
  const totalWidth = columns * GIFT_CARD_WIDTH + Math.max(0, columns - 1) * GIFT_CARD_GAP_X
  const startX = Math.max(24, Math.round((fieldWidth - totalWidth) / 2))
  const startY = Math.max(336, fieldHeight - (rows * GIFT_CARD_HEIGHT + Math.max(0, rows - 1) * GIFT_CARD_GAP_Y) - 30)

  gifts.forEach((gift, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    gift.slotX = startX + column * (GIFT_CARD_WIDTH + GIFT_CARD_GAP_X)
    gift.slotY = startY + row * (GIFT_CARD_HEIGHT + GIFT_CARD_GAP_Y)

    if (dragState.value?.giftId !== gift.id) {
      gift.x = gift.slotX
      gift.y = gift.slotY
    }
  })
}

function clampPosition(x: number, y: number) {
  const maxX = Math.max(16, playFieldRect.value.width - GIFT_CARD_WIDTH - 16)
  const maxY = Math.max(16, playFieldRect.value.height - GIFT_CARD_HEIGHT - 16)

  return {
    x: Math.max(16, Math.min(x, maxX)),
    y: Math.max(16, Math.min(y, maxY)),
  }
}

function getGiftStyle(gift: SessionGift) {
  return {
    width: `${GIFT_CARD_WIDTH}px`,
    height: `${GIFT_CARD_HEIGHT}px`,
    transform: `translate(${gift.x}px, ${gift.y}px)`,
    '--gift-accent': gift.accent,
    '--gift-tint': gift.tint,
    zIndex: dragState.value?.giftId === gift.id ? '18' : '6',
  }
}

function getGiftById(giftId: string) {
  return sessionGifts.value.find((gift) => gift.id === giftId) || null
}

function getRecipientById(recipientId: string) {
  return sessionRecipients.value.find((recipient) => recipient.id === recipientId) || null
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

function resolveRecipientIdFromPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY)
  if (!(element instanceof HTMLElement)) {
    return null
  }

  const card = element.closest<HTMLElement>('[data-recipient-id]')
  return card?.dataset.recipientId || null
}

function beginDrag(giftId: string, event: PointerEvent) {
  if (props.paused || completed || phase.value === 'celebrating') {
    return
  }

  const gift = getGiftById(giftId)
  const fieldRect = playFieldRef.value?.getBoundingClientRect()
  if (!gift || !fieldRect) {
    return
  }

  markDirtyOnce()
  totalDrags.value += 1
  phase.value = 'playing'
  stageMessage.value = '先看线索，再把最合适的礼物拖给对应的小伙伴。'
  helperMessage.value = difficultyConfig.value.helperText
  hoverRecipientId.value = null

  dragState.value = {
    giftId,
    pointerId: event.pointerId,
    offsetX: event.clientX - (fieldRect.left + gift.x),
    offsetY: event.clientY - (fieldRect.top + gift.y),
    startedAt: performance.now(),
  }

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore ambient failures
  })

  attachPointerListeners()
  updateDragPosition(event.clientX, event.clientY)
}

function updateDragPosition(clientX: number, clientY: number) {
  const activeDrag = dragState.value
  const fieldRect = playFieldRef.value?.getBoundingClientRect()
  if (!activeDrag || !fieldRect) {
    return
  }

  const gift = getGiftById(activeDrag.giftId)
  if (!gift) {
    return
  }

  const nextPosition = clampPosition(
    clientX - fieldRect.left - activeDrag.offsetX,
    clientY - fieldRect.top - activeDrag.offsetY,
  )

  gift.x = nextPosition.x
  gift.y = nextPosition.y
  hoverRecipientId.value = resolveRecipientIdFromPoint(clientX, clientY)
}

function resetGiftToSlot(gift: SessionGift) {
  gift.x = gift.slotX
  gift.y = gift.slotY
}

function bounceGift(gift: SessionGift) {
  gift.isBouncing = true
  resetGiftToSlot(gift)

  scheduleTimeout(() => {
    gift.isBouncing = false
  }, 220)
}

function registerWrongDrop(gift: SessionGift, recipient: SessionRecipient | null, message: string) {
  wrongMatches.value += 1
  if (recipient) {
    recipient.hadWrongAttempt = true
  }

  stageMessage.value = message
  helperMessage.value = recipient
    ? `${recipient.name} 现在更需要别的礼物，再看看他的提示。`
    : '先把礼物拖到想分享的小伙伴面前，再决定要不要送出。'

  hoverRecipientId.value = null
  bounceGift(gift)
  props.audio.playSoftBounce().catch(() => {
    // ignore
  })
}

function finishCurrentDrag(clientX: number, clientY: number) {
  const activeDrag = dragState.value
  if (!activeDrag) {
    return
  }

  const gift = getGiftById(activeDrag.giftId)
  const recipientId = resolveRecipientIdFromPoint(clientX, clientY)
  const recipient = recipientId ? getRecipientById(recipientId) : null

  dragState.value = null
  detachPointerListeners()

  if (!gift) {
    hoverRecipientId.value = null
    return
  }

  if (!recipient) {
    registerWrongDrop(gift, null, '礼物还没有送到任何小伙伴面前。')
    return
  }

  if (recipient.matchedGiftId) {
    registerWrongDrop(gift, recipient, `${recipient.name} 已经收到合适的礼物了，我们看看其他小伙伴。`)
    return
  }

  if (gift.id !== recipient.expectedGiftId) {
    registerWrongDrop(gift, recipient, `${recipient.name} 看到这份礼物时还没有露出最开心的表情。`)
    return
  }

  recipient.matchedGiftId = gift.id
  gift.matchedRecipientId = recipient.id
  correctMatches.value += 1
  hoverRecipientId.value = null
  matchedPairs.value = [...matchedPairs.value, `${recipient.id}:${gift.id}`]

  if (!recipient.hadWrongAttempt) {
    firstTryMatches.value += 1
  }

  const elapsedMs = Math.max(0, Math.round(performance.now() - activeDrag.startedAt))
  matchTimesMs.value = [...matchTimesMs.value, elapsedMs]

  stageMessage.value = `${recipient.name} 收到了最适合他的礼物。`
  helperMessage.value = recipient.shareLine

  props.audio.playSuccessCue().catch(() => {
    // ignore
  })
  props.audio.speak(recipient.shareLine)

  if (matchedCount.value >= sessionRecipients.value.length) {
    completeSession()
  }
}

function handlePointerMove(event: PointerEvent) {
  if (props.paused) {
    return
  }

  updateDragPosition(event.clientX, event.clientY)
}

function handlePointerUp(event: PointerEvent) {
  finishCurrentDrag(event.clientX, event.clientY)
}

function handlePointerCancel() {
  const activeDrag = dragState.value
  if (!activeDrag) {
    return
  }

  const gift = getGiftById(activeDrag.giftId)
  dragState.value = null
  detachPointerListeners()
  hoverRecipientId.value = null

  if (gift) {
    resetGiftToSlot(gift)
  }
}

function cancelDragAndReset() {
  const activeDrag = dragState.value
  if (!activeDrag) {
    return
  }

  const gift = getGiftById(activeDrag.giftId)
  dragState.value = null
  detachPointerListeners()
  hoverRecipientId.value = null

  if (gift) {
    resetGiftToSlot(gift)
  }
}

function buildPerformanceData() {
  return {
    total_drags: totalDrags.value,
    correct_matches: correctMatches.value,
    wrong_matches: wrongMatches.value,
    first_try_matches: firstTryMatches.value,
    gift_count: sessionGifts.value.length,
    recipient_count: sessionRecipients.value.length,
    pair_target_count: difficultyConfig.value.pairCount,
    distractor_gift_count: difficultyConfig.value.distractorCount,
    accuracy_ratio: Number((correctMatches.value / Math.max(1, correctMatches.value + wrongMatches.value)).toFixed(4)),
    average_match_ms: Math.round(averageNumberList(matchTimesMs.value)),
    match_times_ms: [...matchTimesMs.value],
    matched_pairs: [...matchedPairs.value],
    recipient_ids: sessionRecipients.value.map((recipient) => recipient.id),
    expected_gift_ids: sessionRecipients.value.map((recipient) => recipient.expectedGiftId),
    difficulty_level: props.difficulty,
    session_theme: sessionTheme.value.key,
  }
}

function completeSession() {
  if (completed) {
    return
  }

  completed = true
  phase.value = 'celebrating'
  stageMessage.value = '这一轮礼物都分享对啦，派对里的每个小伙伴都被照顾到了。'
  helperMessage.value = difficultyConfig.value.successText
  cancelDragAndReset()
  props.audio.stopAmbient()

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak(sessionTheme.value.celebrationLine)),
  ])

  scheduleTimeout(() => {
    showBadge.value = true
  }, 760)

  scheduleTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_GIFT_HELPER',
        badgeName: '分享小达人徽章',
      },
    })
    phase.value = 'finished'
  }, 1400)

  scheduleTimeout(() => {
    if (!props.paused) {
      resetForDifficulty(props.difficulty)
    }
  }, 3200)
}

function resetForDifficulty(difficulty: EmotionGameDifficulty) {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS[1]

  clearTimeouts()
  cancelDragAndReset()
  completed = false
  roundDirty = false
  showBadge.value = false
  phase.value = 'ready'
  totalDrags.value = 0
  correctMatches.value = 0
  wrongMatches.value = 0
  firstTryMatches.value = 0
  matchTimesMs.value = []
  matchedPairs.value = []
  sessionTheme.value = pickRandomTheme()
  stageMessage.value = config.introText
  helperMessage.value = config.helperText
  sessionRecipients.value = buildSessionRecipients(config.pairCount)
  sessionGifts.value = buildSessionGifts(sessionRecipients.value, config.distractorCount)
  props.audio.stopAmbient()

  nextTick(() => {
    syncPlayFieldRect()

    if (!props.paused) {
      props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
        // ignore ambient failures
      })
    }
  })
}

function handleResize() {
  scheduleLayoutSync()
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
      cancelDragAndReset()
      props.audio.stopAll()
      return
    }

    if (!completed) {
      props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
        // ignore ambient failures
      })
    }
  },
)

watch(
  () => sessionRecipients.value.length,
  () => {
    scheduleLayoutSync()
  },
)

onMounted(async () => {
  await nextTick()
  syncPlayFieldRect()
  resetForDifficulty(props.difficulty)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  clearTimeouts()
  cancelDragAndReset()
  if (layoutRaf) {
    window.cancelAnimationFrame(layoutRaf)
  }
  props.audio.stopAll()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.gift-match-game {
  position: relative;
  min-height: 100%;
  overflow: hidden;
  padding: 24px;
  color: #21364d;
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.glow-orb {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 999px;
  opacity: 0.38;
  filter: blur(4px);
}

.glow-orb--left {
  top: -72px;
  left: -48px;
}

.glow-orb--right {
  top: 88px;
  right: -72px;
}

.confetti-dot {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  animation: float-dot 7.2s ease-in-out infinite;
}

.hud-panel {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.hud-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 14px 30px rgba(97, 76, 54, 0.08);
  backdrop-filter: blur(12px);
}

.hud-card span {
  font-size: 12px;
  color: rgba(33, 54, 77, 0.72);
}

.hud-card strong {
  font-size: 17px;
  color: #17324d;
}

.stage-layout {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
}

.play-field {
  position: relative;
  min-height: 640px;
  padding: 20px;
  padding-bottom: 230px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.92) 100%);
  box-shadow: 0 20px 45px rgba(89, 67, 50, 0.12);
  overflow: hidden;
}

.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 247, 236, 0.88);
  color: #7f4e21;
}

.status-strip span {
  font-size: 13px;
  font-weight: 600;
}

.status-strip strong {
  font-size: 15px;
}

.recipient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 16px;
}

.recipient-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  padding: 18px;
  border: 2px solid rgba(255, 194, 137, 0.28);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 28px rgba(109, 86, 64, 0.08);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.recipient-card.hovering {
  transform: translateY(-3px);
  border-color: rgba(255, 146, 83, 0.72);
  box-shadow: 0 16px 34px rgba(255, 146, 83, 0.18);
}

.recipient-card.matched {
  border-color: rgba(109, 193, 127, 0.72);
  background: linear-gradient(180deg, rgba(248, 255, 250, 0.96) 0%, rgba(240, 255, 245, 0.96) 100%);
}

.recipient-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recipient-avatar {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 206, 157, 0.95), rgba(255, 237, 182, 0.95));
  font-size: 28px;
}

.recipient-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipient-copy strong {
  font-size: 18px;
  color: #18324b;
}

.recipient-copy small {
  color: rgba(24, 50, 75, 0.72);
  line-height: 1.45;
}

.recipient-clue {
  margin: 0;
  line-height: 1.6;
  color: rgba(24, 50, 75, 0.88);
}

.recipient-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recipient-tips span,
.matched-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 240, 214, 0.92);
  color: #90592a;
  font-size: 12px;
  font-weight: 600;
}

.matched-chip {
  background: rgba(230, 252, 237, 0.92);
  color: #2e7a4c;
}

.recipient-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  margin-top: auto;
  border: 1.5px dashed rgba(255, 181, 120, 0.58);
  border-radius: 18px;
  background: rgba(255, 248, 239, 0.8);
  color: rgba(127, 78, 33, 0.82);
  text-align: center;
  line-height: 1.5;
}

.gift-shelf {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 168px;
  padding: 16px 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 241, 219, 0.9) 0%, rgba(255, 230, 245, 0.88) 100%);
  border: 1px solid rgba(255, 196, 141, 0.6);
}

.gift-shelf__copy,
.gift-shelf__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(106, 66, 34, 0.86);
}

.gift-shelf__copy strong {
  font-size: 18px;
}

.gift-shelf__copy span,
.gift-shelf__meta span {
  font-size: 13px;
  line-height: 1.5;
}

.gift-card {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 0;
  border-radius: 22px;
  background: linear-gradient(180deg, var(--gift-tint) 0%, #ffffff 100%);
  box-shadow: 0 14px 30px rgba(82, 65, 48, 0.16);
  color: #17324d;
  text-align: left;
  cursor: grab;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.gift-card:hover {
  box-shadow: 0 20px 38px rgba(82, 65, 48, 0.2);
}

.gift-card.dragging {
  cursor: grabbing;
  pointer-events: none;
  box-shadow: 0 24px 44px rgba(82, 65, 48, 0.26);
}

.gift-card.bouncing {
  animation: gift-bounce 0.22s ease;
}

.gift-card__emoji {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--gift-accent) 32%, white);
  background: rgba(255, 255, 255, 0.82);
  font-size: 28px;
}

.gift-card strong {
  font-size: 18px;
}

.gift-card small {
  line-height: 1.45;
  color: rgba(23, 50, 77, 0.72);
}

.instruction-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 18px 40px rgba(89, 67, 50, 0.1);
  backdrop-filter: blur(12px);
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-tags span {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 241, 219, 0.92);
  color: #8a5f2f;
  font-size: 12px;
  font-weight: 600;
}

.panel-tags .accent {
  background: rgba(224, 240, 255, 0.92);
  color: #285d97;
}

.instruction-panel h2 {
  margin: 0;
  font-size: 28px;
  color: #17324d;
}

.instruction-panel p,
.instruction-panel small {
  margin: 0;
  line-height: 1.7;
  color: rgba(23, 50, 77, 0.8);
}

.progress-block,
.tip-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: rgba(23, 50, 77, 0.66);
}

.progress-track {
  overflow: hidden;
  height: 12px;
  border-radius: 999px;
  background: rgba(237, 229, 214, 0.92);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffb36a 0%, #ff8d88 52%, #78c8ff 100%);
  transition: width 0.24s ease;
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tip-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 247, 236, 0.82);
}

.tip-card strong {
  font-size: 14px;
  color: #7f4e21;
}

.tip-card span {
  line-height: 1.55;
  color: rgba(23, 50, 77, 0.78);
}

.badge-modal {
  position: fixed;
  left: 50%;
  bottom: 44px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
  padding: 22px 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 26px 54px rgba(82, 65, 48, 0.24);
  text-align: center;
  z-index: 30;
}

.badge-icon {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 22px;
  background: linear-gradient(135deg, #ffd977 0%, #ffab6e 100%);
  font-size: 34px;
}

.badge-modal strong {
  font-size: 22px;
  color: #17324d;
}

.badge-modal p {
  margin: 0;
  line-height: 1.65;
  color: rgba(23, 50, 77, 0.82);
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: all 0.28s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@keyframes float-dot {
  0%,
  100% {
    transform: translateY(0px);
    opacity: 0.32;
  }
  50% {
    transform: translateY(-14px);
    opacity: 0.72;
  }
}

@keyframes gift-bounce {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(0.9);
  }
}

@media (max-width: 1120px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }

  .instruction-panel {
    order: -1;
  }
}

@media (max-width: 880px) {
  .gift-match-game {
    padding: 16px;
  }

  .hud-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .play-field {
    min-height: 700px;
    padding-bottom: 260px;
  }

  .gift-shelf {
    flex-direction: column;
    align-items: flex-start;
  }

  .tip-grid {
    grid-template-columns: 1fr;
  }
}
</style>
