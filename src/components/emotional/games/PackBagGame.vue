<template>
  <div class="prototype-game pack-bag-game">
    <div class="prototype-game__backdrop" aria-hidden="true">
      <div class="prototype-game__glow prototype-game__glow--left pack-bag-game__glow"></div>
      <div class="prototype-game__glow prototype-game__glow--right pack-bag-game__glow pack-bag-game__glow--alt"></div>
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
        <span>已装物品</span>
        <strong>{{ packedCountLabel }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>复盘次数</span>
        <strong>{{ reviewCycles }} 次</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>当前情境</span>
        <strong>{{ currentScenario?.title || '等待开始' }}</strong>
      </article>
    </section>

    <section class="prototype-game__layout">
      <article class="prototype-game__stage prototype-game__surface">
        <div class="prototype-game__status">
          <span class="prototype-game__eyebrow">{{ stageEyebrow }}</span>
          <strong>{{ stageTitle }}</strong>
          <span class="prototype-game__helper">{{ helperMessage }}</span>
        </div>

        <section v-if="phase === 'ready'" class="pack-bag-game__intro">
          <div class="pack-bag-game__bag-preview">
            <div class="pack-bag-game__bag-shell"></div>
            <div class="pack-bag-game__bag-flap"></div>
          </div>
          <div class="pack-bag-game__intro-copy">
            <h2>先看今天是什么情境，再挑真正需要带的东西。</h2>
            <p>有些物品很有吸引力，但不一定真的需要。装好后点“整理好了”，系统会温和地带你复盘。</p>
          </div>
        </section>

        <section v-else-if="phase === 'playing'" class="pack-bag-game__play">
          <div class="pack-bag-game__scenario">
            <div class="pack-bag-game__scenario-card">
              <span class="pack-bag-game__scenario-emoji">{{ currentScenario?.emoji }}</span>
              <div>
                <strong>{{ currentScenario?.title }}</strong>
                <p>{{ currentScenario?.description }}</p>
              </div>
            </div>
            <div class="pack-bag-game__checklist">
              <span
                v-for="item in requiredItems"
                :key="item.id"
                class="pack-bag-game__check-chip"
                :class="{ 'is-packed': packedItemIds.includes(item.id) }"
              >
                {{ item.emoji }} {{ item.label }}
              </span>
            </div>
          </div>

          <div class="pack-bag-game__workspace">
            <div class="pack-bag-game__item-grid">
              <button
                v-for="item in currentItems"
                :key="item.id"
                type="button"
                class="pack-bag-game__item-card"
                :class="{
                  'is-packed': packedItemIds.includes(item.id),
                  'is-hinted': hintedItemId === item.id,
                }"
                :disabled="paused"
                @click="toggleItem(item)"
              >
                <span>{{ item.emoji }}</span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.shortHint }}</small>
              </button>
            </div>

            <div class="pack-bag-game__bag-card">
              <div class="pack-bag-game__bag-card-header">
                <strong>书包里</strong>
                <small>再次点击下方物品卡，可以放回去重选</small>
              </div>
              <div class="pack-bag-game__bag-card-grid">
                <div
                  v-for="item in packedItems"
                  :key="item.id"
                  class="pack-bag-game__packed-chip"
                >
                  {{ item.emoji }} {{ item.label }}
                </div>
                <div v-if="packedItems.length === 0" class="pack-bag-game__packed-empty">
                  还没有装入任何物品
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="pack-bag-game__complete">
          <div class="pack-bag-game__complete-card">
            <span>🎒</span>
            <strong>书包已经整理好了</strong>
            <small>{{ currentScenario?.description }}</small>
          </div>
        </section>
      </article>

      <aside class="prototype-game__aside prototype-game__surface">
        <div class="prototype-game__tags">
          <span class="prototype-game__tag">生活自理</span>
          <span class="prototype-game__tag prototype-game__tag--accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h1 class="prototype-game__title">上学包包装一装</h1>
        <p class="prototype-game__copy">
          先理解今天是什么情境，再从一堆物品里挑出真正需要带的，练习计划准备和情境判断。
        </p>

        <div class="prototype-game__progress">
          <div class="prototype-game__progress-labels">
            <span>看情境</span>
            <span>选物品</span>
            <span>复盘完成</span>
          </div>
          <div class="prototype-game__progress-track">
            <div class="prototype-game__progress-fill" :style="{ width: `${scorePercent}%` }"></div>
          </div>
        </div>

        <section class="prototype-game__tip-grid">
          <article class="prototype-game__tip-card">
            <strong>需要带的</strong>
            <span>{{ requiredLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>平均选择</strong>
            <span>{{ averageSelectionLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>提示等级</strong>
            <span>{{ highestPromptLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>当前提醒</strong>
            <span>{{ reviewHint }}</span>
          </article>
        </section>

        <div class="prototype-game__actions">
          <button
            v-if="phase === 'ready'"
            type="button"
            class="prototype-game__button prototype-game__button--primary"
            @click="startGame"
          >
            开始整理书包
          </button>

          <template v-else-if="phase === 'playing'">
            <button
              type="button"
              class="prototype-game__button prototype-game__button--primary"
              :disabled="paused"
              @click="submitBag"
            >
              整理好了
            </button>
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
            再整理一次
          </button>
        </div>
      </aside>
    </section>

    <transition name="badge-pop">
      <div v-if="showBadge" class="prototype-game__badge-modal">
        <div class="prototype-game__badge-icon">🎒</div>
        <strong>整理书包徽章</strong>
        <p>你已经根据今天的情境把书包整理好了。</p>
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
  scenarioIds: string[]
}

interface ItemDefinition {
  id: string
  label: string
  emoji: string
  shortHint: string
}

interface ScenarioDefinition {
  id: string
  title: string
  emoji: string
  description: string
  requiredItemIds: string[]
  poolItemIds: string[]
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
    label: '简单 · 基础上学包',
    shortLabel: '简单',
    scenarioIds: ['school-basic'],
  },
  2: {
    label: '中等 · 下雨上学',
    shortLabel: '中等',
    scenarioIds: ['school-rainy', 'reading-day'],
  },
  3: {
    label: '困难 · 情境选择',
    shortLabel: '困难',
    scenarioIds: ['sports-day', 'outdoor-class'],
  },
}

const ITEMS: ReadonlyArray<ItemDefinition> = [
  { id: 'book', label: '图画书', emoji: '📚', shortHint: '上学常用物品' },
  { id: 'notebook', label: '练习本', emoji: '📓', shortHint: '需要记录时会用到' },
  { id: 'water-bottle', label: '水壶', emoji: '🧃', shortHint: '外出时常常需要' },
  { id: 'tissue', label: '纸巾', emoji: '🧻', shortHint: '放一包会更方便' },
  { id: 'umbrella', label: '雨伞', emoji: '☔', shortHint: '下雨天更需要' },
  { id: 'towel', label: '毛巾', emoji: '🧺', shortHint: '运动或户外时会用到' },
  { id: 'cap', label: '帽子', emoji: '🧢', shortHint: '户外时能挡太阳' },
  { id: 'sneakers', label: '运动鞋', emoji: '👟', shortHint: '去操场时更合适' },
  { id: 'toy-car', label: '玩具小车', emoji: '🚗', shortHint: '很好玩，但今天不一定需要' },
  { id: 'plush', label: '毛绒玩偶', emoji: '🧸', shortHint: '抱着舒服，但书包空间有限' },
  { id: 'apple', label: '苹果', emoji: '🍎', shortHint: '不是今天的重点物品' },
]

const SCENARIOS: ReadonlyArray<ScenarioDefinition> = [
  {
    id: 'school-basic',
    title: '今天去上学',
    emoji: '🏫',
    description: '带上最基本的学习用品和喝水用具，就能安心出门。',
    requiredItemIds: ['book', 'notebook', 'water-bottle'],
    poolItemIds: ['book', 'notebook', 'water-bottle', 'tissue', 'toy-car', 'apple'],
  },
  {
    id: 'school-rainy',
    title: '外面在下雨',
    emoji: '🌧️',
    description: '要去学校，而且外面在下雨，记得带好能帮助自己出门的东西。',
    requiredItemIds: ['book', 'water-bottle', 'umbrella', 'tissue'],
    poolItemIds: ['book', 'water-bottle', 'umbrella', 'tissue', 'toy-car', 'plush', 'apple'],
  },
  {
    id: 'reading-day',
    title: '今天有阅读活动',
    emoji: '📖',
    description: '老师说今天会有阅读活动，准备和读书有关的东西会更合适。',
    requiredItemIds: ['book', 'notebook', 'water-bottle', 'tissue'],
    poolItemIds: ['book', 'notebook', 'water-bottle', 'tissue', 'plush', 'apple', 'toy-car'],
  },
  {
    id: 'sports-day',
    title: '今天去操场活动',
    emoji: '🏃',
    description: '要去操场活动，带上能让身体舒服和安全的物品。',
    requiredItemIds: ['water-bottle', 'towel', 'sneakers', 'cap'],
    poolItemIds: ['water-bottle', 'towel', 'sneakers', 'cap', 'notebook', 'toy-car', 'plush'],
  },
  {
    id: 'outdoor-class',
    title: '今天有户外课',
    emoji: '🌤️',
    description: '户外课会晒太阳，也可能流汗，要先想想身体会需要什么。',
    requiredItemIds: ['water-bottle', 'towel', 'cap', 'tissue'],
    poolItemIds: ['water-bottle', 'towel', 'cap', 'tissue', 'apple', 'plush', 'toy-car'],
  },
]

const sparkles: ReadonlyArray<SparkleDot> = [
  { id: 1, left: 10, top: 18, size: 12, delay: 0.3 },
  { id: 2, left: 24, top: 78, size: 10, delay: 1.1 },
  { id: 3, left: 42, top: 16, size: 15, delay: 0.7 },
  { id: 4, left: 72, top: 18, size: 12, delay: 1.6 },
  { id: 5, left: 88, top: 56, size: 10, delay: 0.9 },
]

const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const helperMessage = ref('先看情境，再挑真正需要带的东西。')
const currentScenario = ref<ScenarioDefinition | null>(null)
const currentItems = ref<ItemDefinition[]>([])
const packedItemIds = ref<string[]>([])
const promptCount = ref(0)
const reviewCycles = ref(0)
const hintedItemId = ref('')
const selectionTimes = ref<number[]>([])
const showBadge = ref(false)
const latestScore = ref(0)

let hasRoundDirty = false
let roundStartedAt = 0
let selectionStartedAt = 0
let celebrationTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const packedItems = computed(() => packedItemIds.value
  .map((itemId) => ITEMS.find((item) => item.id === itemId) || null)
  .filter((item): item is ItemDefinition => item !== null))
const requiredItems = computed(() => {
  if (!currentScenario.value) {
    return []
  }

  return currentScenario.value.requiredItemIds
    .map((itemId) => ITEMS.find((item) => item.id === itemId) || null)
    .filter((item): item is ItemDefinition => item !== null)
})
const packedCountLabel = computed(() => `${packedItemIds.value.length}/${requiredItems.value.length || 0}`)
const requiredLabel = computed(() => requiredItems.value.map((item) => `${item.emoji} ${item.label}`).join(' / ') || '等待开始')
const stageEyebrow = computed(() => {
  if (phase.value === 'ready') return '开始前'
  if (phase.value === 'playing') return '整理进行中'
  if (phase.value === 'celebrating') return '已完成'
  return '等待保存'
})
const stageTitle = computed(() => {
  if (phase.value === 'ready') return '先理解今天是什么情境'
  if (phase.value === 'playing') return '把真正需要的东西装进书包'
  return '今天的书包已经整理好了'
})
const averageSelectionMs = computed(() => averageNumberList(selectionTimes.value))
const averageSelectionLabel = computed(() => {
  if (!averageSelectionMs.value) return '还没有选择数据'
  if (averageSelectionMs.value < 1000) return `${averageSelectionMs.value}ms`
  return `${(averageSelectionMs.value / 1000).toFixed(1)} 秒`
})
const highestPromptLabel = computed(() => `Level ${clampNumber(promptCount.value, 0, 3)}`)
const scorePercent = computed(() => clampNumber(latestScore.value, 0, 100))
const reviewHint = computed(() => helperMessage.value)
const paused = computed(() => props.paused)

function markDirtyOnce() {
  if (hasRoundDirty) {
    return
  }

  hasRoundDirty = true
  roundStartedAt = Date.now()
  props.markRoundDirty?.()
}

function pickScenario(difficulty: EmotionGameDifficulty) {
  const scenarioPool = SCENARIOS.filter((scenario) => DIFFICULTY_CONFIGS[difficulty].scenarioIds.includes(scenario.id))
  return shuffleArray(scenarioPool)[0] || scenarioPool[0] || null
}

function buildItemPool(scenario: ScenarioDefinition) {
  return shuffleArray(
    scenario.poolItemIds
      .map((itemId) => ITEMS.find((item) => item.id === itemId) || null)
      .filter((item): item is ItemDefinition => item !== null),
  )
}

function resetRound() {
  window.clearTimeout(celebrationTimer)
  phase.value = 'ready'
  activeDifficulty.value = props.difficulty
  helperMessage.value = '先看情境，再挑真正需要带的东西。'
  currentScenario.value = null
  currentItems.value = []
  packedItemIds.value = []
  promptCount.value = 0
  reviewCycles.value = 0
  hintedItemId.value = ''
  selectionTimes.value = []
  showBadge.value = false
  latestScore.value = 0
  selectionStartedAt = 0
  props.audio.stopAmbient()
}

function startGame() {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  currentScenario.value = pickScenario(props.difficulty)
  currentItems.value = currentScenario.value ? buildItemPool(currentScenario.value) : []
  packedItemIds.value = []
  promptCount.value = 0
  reviewCycles.value = 0
  hintedItemId.value = ''
  selectionTimes.value = []
  latestScore.value = 0
  helperMessage.value = currentScenario.value?.description || '先看清今天要去哪里。'
  phase.value = 'playing'
  selectionStartedAt = Date.now()

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // Keep the round playable without audio.
  })
  props.audio.speak('先看看今天是什么情境，再把真正需要的物品装进书包。')
}

function toggleItem(item: ItemDefinition) {
  if (paused.value || phase.value !== 'playing') {
    return
  }

  hintedItemId.value = ''

  if (selectionStartedAt > 0) {
    selectionTimes.value.push(Date.now() - selectionStartedAt)
  }
  selectionStartedAt = Date.now()

  if (packedItemIds.value.includes(item.id)) {
    packedItemIds.value = packedItemIds.value.filter((currentId) => currentId !== item.id)
    helperMessage.value = `${item.label} 已经放回去了，可以再想一想。`
    return
  }

  packedItemIds.value = [...packedItemIds.value, item.id]
  helperMessage.value = `已把 ${item.label} 放进书包。`
}

function requestPrompt() {
  if (paused.value || phase.value !== 'playing' || !currentScenario.value) {
    return
  }

  promptCount.value += 1
  const missingRequired = requiredItems.value.filter((item) => !packedItemIds.value.includes(item.id))
  hintedItemId.value = missingRequired[0]?.id || ''
  helperMessage.value = missingRequired[0]
    ? `先想一想“${missingRequired[0].label}”是不是今天会用到。`
    : '先检查一下书包里有没有多装了不需要的物品。'
  props.audio.speak(helperMessage.value)
}

function submitBag() {
  if (paused.value || phase.value !== 'playing' || !currentScenario.value) {
    return
  }

  const requiredIds = new Set(currentScenario.value.requiredItemIds)
  const correctlyPacked = packedItemIds.value.filter((itemId) => requiredIds.has(itemId))
  const wrongItems = packedItemIds.value.filter((itemId) => !requiredIds.has(itemId))
  const missingRequired = currentScenario.value.requiredItemIds.filter((itemId) => !packedItemIds.value.includes(itemId))

  const contextUnderstandingScore = clampNumber(Math.round((correctlyPacked.length / currentScenario.value.requiredItemIds.length) * 100), 0, 100)
  const score = clampNumber(
    contextUnderstandingScore - wrongItems.length * 12 - promptCount.value * 8,
    0,
    100,
  )
  latestScore.value = score

  if (missingRequired.length === 0 && wrongItems.length === 0) {
    finishRound()
    return
  }

  reviewCycles.value += 1
  if (wrongItems.includes('toy-car') || wrongItems.includes('plush')) {
    helperMessage.value = '玩具留在家等我放学哦，书包里先放今天真正需要的东西。'
  } else if (missingRequired.length > 0) {
    const missingLabel = ITEMS.find((item) => item.id === missingRequired[0])?.label || '这件物品'
    helperMessage.value = `再看看，${missingLabel} 今天是不是也要带上。`
  } else {
    helperMessage.value = '再检查一下，书包里有没有多装了今天暂时用不到的东西。'
  }

  hintedItemId.value = missingRequired[0] || ''
}

function finishRound() {
  phase.value = 'celebrating'
  showBadge.value = true
  latestScore.value = 100
  helperMessage.value = '这次整理已经完成啦。'
  props.audio.stopAmbient()

  void Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('书包已经整理好了。')),
  ])

  celebrationTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 850)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const requiredIds = new Set(currentScenario.value?.requiredItemIds || [])
  const correctlyPacked = packedItemIds.value.filter((itemId) => requiredIds.has(itemId))
  const wrongItemIds = packedItemIds.value.filter((itemId) => !requiredIds.has(itemId))
  const requiredItemLabels = requiredItems.value.map((item) => item.label)
  const wrongItemLabels = wrongItemIds
    .map((itemId) => ITEMS.find((item) => item.id === itemId)?.label || '')
    .filter(Boolean)

  return {
    performanceData: {
      event: 'game_complete',
      required_item_count: requiredIds.size,
      correctly_packed_count: correctlyPacked.length,
      wrong_item_count: wrongItemIds.length,
      context_understanding_score: requiredIds.size > 0
        ? Math.round((correctlyPacked.length / requiredIds.size) * 100)
        : 0,
      highest_prompt_level: clampNumber(promptCount.value, 0, 3),
      prompt_count: promptCount.value,
      is_auto_completed: false,
      score: latestScore.value,
      packed_item_labels: packedItems.value.map((item) => item.label),
      required_item_labels: requiredItemLabels,
      wrong_item_labels: wrongItemLabels,
      scenario_id: currentScenario.value?.id || '',
      scenario_title: currentScenario.value?.title || '',
      review_cycles: reviewCycles.value,
      average_selection_ms: averageSelectionMs.value,
      selection_times_ms: [...selectionTimes.value],
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

.pack-bag-game {
  --prototype-background: linear-gradient(135deg, #7eb6ff 0%, #89d5c0 46%, #ffd67c 100%);
  --prototype-progress: linear-gradient(135deg, #2563eb 0%, #14b8a6 100%);
}

.pack-bag-game__glow {
  background: rgba(125, 211, 252, 0.28);
}

.pack-bag-game__glow--alt {
  background: rgba(253, 224, 71, 0.22);
}

.pack-bag-game__intro {
  display: grid;
  grid-template-columns: minmax(280px, 0.82fr) minmax(0, 1.18fr);
  gap: 26px;
  align-items: center;
  min-height: 100%;
}

.pack-bag-game__intro-copy h2 {
  margin: 0 0 12px;
  font-size: 2rem;
  line-height: 1.2;
}

.pack-bag-game__intro-copy p {
  margin: 0;
  line-height: 1.76;
}

.pack-bag-game__bag-preview,
.pack-bag-game__bag-card {
  position: relative;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.68);
}

.pack-bag-game__bag-preview {
  display: grid;
  place-items: center;
  min-height: 300px;
}

.pack-bag-game__bag-shell,
.pack-bag-game__bag-flap {
  position: absolute;
  display: block;
  border-radius: 32px;
}

.pack-bag-game__bag-shell {
  width: 220px;
  height: 210px;
  background: linear-gradient(180deg, #1d4ed8 0%, #2563eb 100%);
}

.pack-bag-game__bag-flap {
  top: 58px;
  width: 180px;
  height: 84px;
  background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
}

.pack-bag-game__play {
  display: grid;
  gap: 18px;
}

.pack-bag-game__scenario {
  display: grid;
  gap: 14px;
}

.pack-bag-game__scenario-card,
.pack-bag-game__checklist {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
}

.pack-bag-game__scenario-emoji {
  font-size: 2rem;
}

.pack-bag-game__scenario-card p {
  margin: 6px 0 0;
  line-height: 1.65;
}

.pack-bag-game__checklist {
  flex-wrap: wrap;
}

.pack-bag-game__check-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
}

.pack-bag-game__check-chip.is-packed {
  background: rgba(187, 247, 208, 0.82);
}

.pack-bag-game__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 18px;
}

.pack-bag-game__item-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.pack-bag-game__item-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 146px;
  padding: 18px;
  border: 0;
  border-radius: 22px;
  cursor: pointer;
  text-align: left;
  background: rgba(255, 255, 255, 0.8);
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.pack-bag-game__item-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(33, 53, 71, 0.12);
}

.pack-bag-game__item-card:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.pack-bag-game__item-card.is-packed {
  background: rgba(187, 247, 208, 0.82);
}

.pack-bag-game__item-card.is-hinted {
  outline: 3px solid rgba(59, 130, 246, 0.24);
}

.pack-bag-game__item-card span {
  font-size: 1.8rem;
}

.pack-bag-game__bag-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
}

.pack-bag-game__bag-card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pack-bag-game__bag-card-grid {
  display: grid;
  gap: 12px;
}

.pack-bag-game__packed-chip,
.pack-bag-game__packed-empty {
  min-height: 52px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
}

.pack-bag-game__packed-chip {
  background: rgba(191, 219, 254, 0.82);
}

.pack-bag-game__complete {
  display: grid;
  place-items: center;
  min-height: 100%;
}

.pack-bag-game__complete-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 24px 28px;
  border-radius: 28px;
  text-align: center;
  background: rgba(255, 255, 255, 0.74);
}

.pack-bag-game__complete-card span {
  font-size: 2rem;
}

@media (max-width: 1120px) {
  .pack-bag-game__intro,
  .pack-bag-game__workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .pack-bag-game__item-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
