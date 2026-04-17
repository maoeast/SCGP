<template>
  <div class="prototype-game dress-up-game">
    <div class="prototype-game__backdrop" aria-hidden="true">
      <div class="prototype-game__glow prototype-game__glow--left dress-up-game__glow"></div>
      <div class="prototype-game__glow prototype-game__glow--right dress-up-game__glow dress-up-game__glow--alt"></div>
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
        <span>完成层数</span>
        <strong>{{ progressLabel }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>误放次数</span>
        <strong>{{ wrongPlacements }} 次</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>天气情境</span>
        <strong>{{ sessionTheme.title }}</strong>
      </article>
    </section>

    <section class="prototype-game__layout">
      <article class="prototype-game__stage prototype-game__surface">
        <div class="prototype-game__status">
          <span class="prototype-game__eyebrow">{{ stageEyebrow }}</span>
          <strong>{{ stageTitle }}</strong>
          <span class="prototype-game__helper">{{ helperMessage }}</span>
        </div>

        <section v-if="phase === 'ready'" class="dress-up-game__intro">
          <div class="dress-up-game__avatar-card dress-up-game__avatar-card--intro">
            <div class="dress-up-game__section-head dress-up-game__section-head--compact">
              <div>
                <span class="dress-up-game__section-kicker">穿搭主舞台</span>
                <strong>先看看完整穿搭长什么样</strong>
              </div>
              <small>角色底模和衣物层已经切换到正式 SVG，顺序仍然保持先里后外。</small>
            </div>
            <DressUpStageArt
              preview
              :target-item-ids="previewItemIds"
              :theme-id="sessionTheme.id"
            />
            <div class="dress-up-game__preview-strip">
              <article
                v-for="(item, index) in previewItems"
                :key="item.id"
                class="dress-up-game__preview-step"
              >
                <span>{{ index + 1 }}</span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.shortHint }}</small>
              </article>
            </div>
          </div>
          <div class="dress-up-game__intro-copy">
            <h2>把衣物按合适顺序穿到角色身上。</h2>
            <p>越往后的衣物层级越外面。如果顺序跳太快，衣物会弹回去，提醒你先穿里面的。</p>
          </div>
        </section>

        <section v-else-if="phase === 'playing'" class="dress-up-game__play">
          <div class="dress-up-game__stage-grid">
            <div class="dress-up-game__avatar-card">
              <div class="dress-up-game__section-head">
                <div>
                  <span class="dress-up-game__section-kicker">角色舞台</span>
                  <strong>{{ currentTarget?.label || '继续完成剩余衣物' }}</strong>
                </div>
                <small>{{ stageArtCopy }}</small>
              </div>

              <DressUpStageArt
                :target-item-ids="targetItemIds"
                :placed-item-ids="placedItemIds"
                :current-target-id="currentTarget?.id || null"
                :theme-id="sessionTheme.id"
              />

              <div class="dress-up-game__state-chips">
                <span
                  v-for="chip in outfitStateChips"
                  :key="chip.id"
                  class="dress-up-game__state-chip"
                  :class="`is-${chip.tone}`"
                >
                  <strong>{{ chip.label }}</strong>
                  <small>{{ chip.value }}</small>
                </span>
              </div>

              <div class="dress-up-game__layer-track">
                <div
                  v-for="(item, index) in targetItems"
                  :key="item.id"
                  class="dress-up-game__layer-slot"
                  :class="{ 'is-done': placedItemIds.includes(item.id), 'is-current': currentTarget?.id === item.id }"
                >
                  <span>{{ index + 1 }}</span>
                  <strong>{{ placedItemIds.includes(item.id) ? item.label : '等待穿上' }}</strong>
                </div>
              </div>
            </div>

            <div class="dress-up-game__item-grid">
              <button
                v-for="item in shuffledItems"
                :key="item.id"
                type="button"
                class="dress-up-game__item-card"
                :class="{ 'is-done': placedItemIds.includes(item.id) }"
                :disabled="paused || placedItemIds.includes(item.id)"
                :style="{ '--item-color': item.color }"
                @click="handleItemPick(item)"
              >
                <div class="dress-up-game__item-card-top">
                  <span class="dress-up-game__item-swatch"></span>
                  <small>第 {{ targetItemOrderMap[item.id] || '-' }} 层</small>
                </div>
                <strong>{{ item.label }}</strong>
                <small>{{ item.shortHint }}</small>
              </button>
            </div>
          </div>
        </section>

        <section v-else class="dress-up-game__complete">
          <div class="dress-up-game__complete-layout">
            <div class="dress-up-game__complete-scene">
              <DressUpStageArt
                :target-item-ids="targetItemIds"
                :placed-item-ids="targetItemIds"
                :theme-id="sessionTheme.id"
                finished
              />
            </div>
            <div class="dress-up-game__complete-card">
              <span>👕</span>
              <strong>衣服已经穿好啦</strong>
              <small>{{ sessionTheme.description }}</small>
            </div>
          </div>
        </section>
      </article>

      <aside class="prototype-game__aside prototype-game__surface">
        <div class="prototype-game__tags">
          <span class="prototype-game__tag">生活自理</span>
          <span class="prototype-game__tag prototype-game__tag--accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h1 class="prototype-game__title">我会穿衣服</h1>
        <p class="prototype-game__copy">
          练习先里后外、先基础再外层的穿衣逻辑，让孩子慢慢建立更清晰的日常穿衣顺序。
        </p>

        <div class="prototype-game__progress">
          <div class="prototype-game__progress-labels">
            <span>认衣物</span>
            <span>按层穿上</span>
            <span>准备出发</span>
          </div>
          <div class="prototype-game__progress-track">
            <div class="prototype-game__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <section class="prototype-game__tip-grid">
          <article class="prototype-game__tip-card">
            <strong>下一件</strong>
            <span>{{ currentTarget?.label || '已经完成' }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>当前提醒</strong>
            <span>{{ reminderText }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>平均选择</strong>
            <span>{{ averageSelectionLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>天气主题</strong>
            <span>{{ sessionTheme.helperLine }}</span>
          </article>
        </section>

        <div class="prototype-game__actions">
          <button
            v-if="phase === 'ready'"
            type="button"
            class="prototype-game__button prototype-game__button--primary"
            @click="startGame"
          >
            开始穿衣练习
          </button>

          <template v-else-if="phase === 'playing'">
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
            再穿一遍
          </button>
        </div>
      </aside>
    </section>

    <transition name="badge-pop">
      <div v-if="showBadge" class="prototype-game__badge-modal">
        <div class="prototype-game__badge-icon">👕</div>
        <strong>穿衣小帮手徽章</strong>
        <p>你已经把衣物按层级顺序穿好了。</p>
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
import DressUpStageArt from './DressUpStageArt.vue'

type Phase = 'ready' | 'playing' | 'celebrating' | 'finished'

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
  itemIds: string[]
}

interface ClothingItem {
  id: string
  label: string
  emoji: string
  shortHint: string
  color: string
  layerIndex: number
}

interface ThemeDefinition {
  id: string
  title: string
  description: string
  helperLine: string
}

interface OutfitStateChip {
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
    label: '简单 · 基础顺序',
    shortLabel: '简单',
    itemIds: ['shirt', 'pants', 'coat'],
  },
  2: {
    label: '中等 · 加入内层',
    shortLabel: '中等',
    itemIds: ['underwear', 'shirt', 'pants', 'coat'],
  },
  3: {
    label: '困难 · 完整穿搭',
    shortLabel: '困难',
    itemIds: ['underwear', 'socks', 'shirt', 'pants', 'coat'],
  },
}

const CLOTHING_ITEMS: ReadonlyArray<ClothingItem> = [
  {
    id: 'underwear',
    label: '内层衣物',
    emoji: '🩳',
    shortHint: '最里面先穿',
    color: 'linear-gradient(135deg, #fecdd3 0%, #fda4af 100%)',
    layerIndex: 10,
  },
  {
    id: 'socks',
    label: '袜子',
    emoji: '🧦',
    shortHint: '脚先暖暖的',
    color: 'linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)',
    layerIndex: 15,
  },
  {
    id: 'shirt',
    label: '上衣',
    emoji: '👕',
    shortHint: '套上身体这一层',
    color: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 100%)',
    layerIndex: 20,
  },
  {
    id: 'pants',
    label: '裤子',
    emoji: '👖',
    shortHint: '把腿也穿好',
    color: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',
    layerIndex: 25,
  },
  {
    id: 'coat',
    label: '外套',
    emoji: '🧥',
    shortHint: '最后再套外层',
    color: 'linear-gradient(135deg, #f9a8d4 0%, #f472b6 100%)',
    layerIndex: 30,
  },
]

const THEMES: ReadonlyArray<ThemeDefinition> = [
  {
    id: 'sunny',
    title: '晴天出门',
    description: '今天阳光很好，把衣服穿整齐就能轻松出门啦。',
    helperLine: '晴天也要先把基础衣物穿好。',
  },
  {
    id: 'windy',
    title: '起风啦',
    description: '外面有点风，先把里面的衣物穿稳，再加外套更舒服。',
    helperLine: '有风的时候，外套要放在最外面。',
  },
  {
    id: 'school',
    title: '准备上学',
    description: '出门前把衣服按顺序穿好，会更快更安心。',
    helperLine: '上学前先把里层和外层都分清楚。',
  },
]

const sparkles: ReadonlyArray<SparkleDot> = [
  { id: 1, left: 10, top: 20, size: 12, delay: 0.3 },
  { id: 2, left: 24, top: 74, size: 10, delay: 1.1 },
  { id: 3, left: 44, top: 16, size: 16, delay: 0.7 },
  { id: 4, left: 72, top: 18, size: 14, delay: 1.6 },
  { id: 5, left: 88, top: 52, size: 12, delay: 0.9 },
]

const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const helperMessage = ref('先穿最里面的，再慢慢往外加。')
const sessionTheme = ref<ThemeDefinition>(THEMES[0]!)
const targetItems = ref<ClothingItem[]>([])
const shuffledItems = ref<ClothingItem[]>([])
const placedItems = ref<ClothingItem[]>([])
const placedItemIds = ref<string[]>([])
const wrongPlacements = ref(0)
const promptCount = ref(0)
const selectionTimes = ref<number[]>([])
const showBadge = ref(false)

let hasRoundDirty = false
let stepStartedAt = 0
let roundStartedAt = 0
let celebrationTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const paused = computed(() => props.paused)
const currentTarget = computed(() => targetItems.value[placedItems.value.length] || null)
const progressPercent = computed(() => {
  if (!targetItems.value.length) {
    return phase.value === 'ready' ? 0 : 100
  }

  return clampNumber(
    Math.round((placedItems.value.length / targetItems.value.length) * 100),
    0,
    100,
  )
})
const progressLabel = computed(() => `${placedItems.value.length}/${targetItems.value.length || 0}`)
const stageEyebrow = computed(() => {
  if (phase.value === 'ready') return '开始前'
  if (phase.value === 'playing') return '穿搭进行中'
  if (phase.value === 'celebrating') return '已完成'
  return '等待保存'
})
const stageTitle = computed(() => {
  if (phase.value === 'ready') return '先看清哪些衣物要先穿'
  if (phase.value === 'playing') return currentTarget.value ? `先穿 ${currentTarget.value.label}` : '继续完成剩余衣物'
  return '这套衣服已经按顺序穿好了'
})
const averageSelectionMs = computed(() => averageNumberList(selectionTimes.value))
const averageSelectionLabel = computed(() => {
  if (!averageSelectionMs.value) return '还没有选择记录'
  if (averageSelectionMs.value < 1000) return `${averageSelectionMs.value}ms`
  return `${(averageSelectionMs.value / 1000).toFixed(1)} 秒`
})
const reminderText = computed(() => currentTarget.value?.shortHint || '继续保持先里后外的顺序。')
const isRoundFinished = computed(() => phase.value === 'celebrating' || phase.value === 'finished')
const previewItems = computed(() => buildTargetItems(activeDifficulty.value))
const targetItemIds = computed(() => targetItems.value.map((item) => item.id))
const previewItemIds = computed(() => previewItems.value.map((item) => item.id))
const targetItemOrderMap = computed<Record<string, number>>(() => Object.fromEntries(targetItems.value.map((item, index) => [item.id, index + 1])))
const stageArtCopy = computed(() => {
  if (isRoundFinished.value) {
    return '里层、袜子、上衣、裤子和外套都已经按顺序穿好了。'
  }

  if (!currentTarget.value) {
    return '先从最里面的衣物开始，一层一层往外穿。'
  }

  if (currentTarget.value.id === 'underwear') {
    return '先把内层衣物穿好，后面的衣服才会更稳。'
  }

  if (currentTarget.value.id === 'socks') {
    return '袜子先穿好，裤脚和鞋子会更舒服。'
  }

  if (currentTarget.value.id === 'shirt') {
    return '上衣会先覆盖身体主区域，再继续补上下半身。'
  }

  if (currentTarget.value.id === 'pants') {
    return '裤子要套在下半身，遮住腿部主体。'
  }

  return '最后把外套套上，形成最外层的穿搭。'
})
const outfitStateChips = computed<OutfitStateChip[]>(() => [
  {
    id: 'next',
    label: '下一件',
    value: currentTarget.value?.label || '已经完成',
    tone: currentTarget.value ? 'info' : 'success',
  },
  {
    id: 'layers',
    label: '已穿层数',
    value: `${placedItems.value.length}/${targetItems.value.length || previewItems.value.length}`,
    tone: placedItems.value.length > 0 ? 'info' : 'neutral',
  },
  {
    id: 'theme',
    label: '天气情境',
    value: sessionTheme.value.title,
    tone: 'neutral',
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

function startStepTimer() {
  stepStartedAt = Date.now()
}

function pushSelectionTime() {
  if (!stepStartedAt) {
    return
  }

  selectionTimes.value.push(Date.now() - stepStartedAt)
  stepStartedAt = 0
}

function buildTargetItems(difficulty: EmotionGameDifficulty) {
  return DIFFICULTY_CONFIGS[difficulty].itemIds
    .map((itemId) => CLOTHING_ITEMS.find((item) => item.id === itemId) || null)
    .filter((item): item is ClothingItem => item !== null)
}

function resetRound() {
  window.clearTimeout(celebrationTimer)
  phase.value = 'ready'
  activeDifficulty.value = props.difficulty
  helperMessage.value = '先穿最里面的，再慢慢往外加。'
  targetItems.value = []
  shuffledItems.value = []
  placedItems.value = []
  placedItemIds.value = []
  wrongPlacements.value = 0
  promptCount.value = 0
  selectionTimes.value = []
  showBadge.value = false
  stepStartedAt = 0
  props.audio.stopAmbient()
}

function startGame() {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  targetItems.value = buildTargetItems(props.difficulty)
  shuffledItems.value = shuffleArray(targetItems.value)
  placedItems.value = []
  placedItemIds.value = []
  wrongPlacements.value = 0
  promptCount.value = 0
  selectionTimes.value = []
  sessionTheme.value = shuffleArray(THEMES)[0] || THEMES[0]!
  helperMessage.value = '先从最里面的那件开始。'
  phase.value = 'playing'
  startStepTimer()

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // Keep the round playable without audio.
  })
  props.audio.speak('先从最里面的衣物开始，一件一件往外穿。')
}

function handleItemPick(item: ClothingItem) {
  if (paused.value || phase.value !== 'playing' || !currentTarget.value) {
    return
  }

  if (item.id !== currentTarget.value.id) {
    wrongPlacements.value += 1
    helperMessage.value = `先穿 ${currentTarget.value.label}，这件还要再等一等。`
    props.audio.playSoftBounce().catch(() => {
      // Soft feedback is optional.
    })
    return
  }

  pushSelectionTime()
  placedItems.value.push(item)
  placedItemIds.value.push(item.id)

  if (placedItems.value.length >= targetItems.value.length) {
    finishRound()
    return
  }

  helperMessage.value = `很好，接下来穿 ${targetItems.value[placedItems.value.length]?.label || '下一件'}。`
  startStepTimer()
}

function requestPrompt() {
  if (paused.value || phase.value !== 'playing' || !currentTarget.value) {
    return
  }

  promptCount.value += 1
  helperMessage.value = `${currentTarget.value.label}更适合现在这一步，先把里面这一层穿好。`
  props.audio.speak(helperMessage.value)
}

function finishRound() {
  phase.value = 'celebrating'
  showBadge.value = true
  helperMessage.value = '衣物顺序已经完成啦。'
  props.audio.stopAmbient()

  void Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('已经把衣服按顺序穿好了。')),
  ])

  celebrationTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 850)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  return {
    performanceData: {
      event: 'game_complete',
      target_item_count: targetItems.value.length,
      completed_item_count: placedItems.value.length,
      wrong_placements: wrongPlacements.value,
      prompt_count: promptCount.value,
      highest_prompt_level: clampNumber(promptCount.value, 0, 3),
      is_auto_completed: false,
      placed_item_labels: placedItems.value.map((item) => item.label),
      placed_item_ids: placedItems.value.map((item) => item.id),
      average_selection_ms: averageSelectionMs.value,
      selection_times_ms: [...selectionTimes.value],
      weather_theme: sessionTheme.value.id,
      weather_theme_title: sessionTheme.value.title,
      total_duration_seconds: roundStartedAt > 0 ? Number(((Date.now() - roundStartedAt) / 1000).toFixed(1)) : 0,
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

.dress-up-game {
  --prototype-background: linear-gradient(135deg, #ffd7a8 0%, #ffb7c5 46%, #9ed8ff 100%);
  --prototype-progress: linear-gradient(135deg, #f97316 0%, #ec4899 100%);
}

.dress-up-game__glow {
  background: rgba(255, 183, 197, 0.38);
}

.dress-up-game__glow--alt {
  background: rgba(147, 197, 253, 0.34);
}

.dress-up-game__intro {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
  gap: 26px;
  align-items: center;
  min-height: 100%;
}

.dress-up-game__intro-copy h2 {
  margin: 0 0 12px;
  font-size: 2rem;
  line-height: 1.2;
}

.dress-up-game__intro-copy p {
  margin: 0;
  line-height: 1.76;
}

.dress-up-game__avatar-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.66);
}

.dress-up-game__avatar-card--intro {
  min-height: 100%;
}

.dress-up-game__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.56);
}

.dress-up-game__section-head--compact {
  padding: 12px 14px;
}

.dress-up-game__section-head div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dress-up-game__section-head strong {
  font-size: 1.02rem;
}

.dress-up-game__section-head small {
  max-width: 320px;
  color: rgba(33, 53, 71, 0.74);
  line-height: 1.55;
}

.dress-up-game__section-kicker {
  color: #c2410c;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dress-up-game__preview-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.dress-up-game__preview-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 106px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.68);
}

.dress-up-game__preview-step span,
.dress-up-game__layer-slot span {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.9);
}

.dress-up-game__preview-step small {
  color: rgba(33, 53, 71, 0.72);
  line-height: 1.45;
}

.dress-up-game__layer-track,
.dress-up-game__item-grid {
  display: grid;
  gap: 12px;
}

.dress-up-game__layer-track {
  margin-top: 18px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dress-up-game__layer-slot {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 68px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.56);
}

.dress-up-game__layer-slot.is-current {
  outline: 3px solid rgba(249, 115, 22, 0.28);
}

.dress-up-game__layer-slot.is-done {
  background: rgba(254, 240, 138, 0.72);
}

.dress-up-game__play,
.dress-up-game__stage-grid {
  display: grid;
  gap: 18px;
}

.dress-up-game__stage-grid {
  grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.05fr);
}

.dress-up-game__item-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dress-up-game__item-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 150px;
  padding: 18px;
  border: 0;
  border-radius: 22px;
  cursor: pointer;
  text-align: left;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.78) 100%),
    var(--item-color);
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.dress-up-game__item-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(33, 53, 71, 0.12);
}

.dress-up-game__item-card:disabled {
  cursor: not-allowed;
  opacity: 0.54;
}

.dress-up-game__item-card.is-done {
  background: rgba(187, 247, 208, 0.78);
}

.dress-up-game__item-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.dress-up-game__item-card-top small {
  color: rgba(33, 53, 71, 0.68);
  font-weight: 700;
}

.dress-up-game__item-swatch {
  display: inline-flex;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0)),
    var(--item-color);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.dress-up-game__state-chips {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.dress-up-game__state-chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 76px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.68);
}

.dress-up-game__state-chip strong {
  font-size: 0.96rem;
}

.dress-up-game__state-chip small {
  color: rgba(33, 53, 71, 0.76);
  line-height: 1.45;
}

.dress-up-game__state-chip.is-info {
  background: rgba(255, 237, 213, 0.92);
}

.dress-up-game__state-chip.is-success {
  background: rgba(223, 252, 231, 0.88);
}

.dress-up-game__complete {
  display: grid;
  place-items: center;
  min-height: 100%;
}

.dress-up-game__complete-layout {
  display: grid;
  grid-template-columns: minmax(280px, 1.08fr) minmax(240px, 0.82fr);
  gap: 20px;
  width: 100%;
  align-items: center;
}

.dress-up-game__complete-scene {
  min-width: 0;
}

.dress-up-game__complete-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  min-height: 100%;
  padding: 24px 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.74);
  text-align: center;
}

.dress-up-game__complete-card span {
  font-size: 2rem;
}

@media (max-width: 1080px) {
  .dress-up-game__intro,
  .dress-up-game__stage-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .dress-up-game__preview-strip,
  .dress-up-game__state-chips,
  .dress-up-game__item-grid,
  .dress-up-game__layer-track {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dress-up-game__complete-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .dress-up-game__section-head {
    flex-direction: column;
  }

  .dress-up-game__section-head small {
    max-width: none;
  }

  .dress-up-game__preview-strip,
  .dress-up-game__state-chips,
  .dress-up-game__item-grid,
  .dress-up-game__layer-track {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
