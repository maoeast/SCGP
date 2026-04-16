<template>
  <div class="burger-coop-game" :style="{ background: sessionTheme.background }">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="glow-orb glow-orb--left" :style="{ background: sessionTheme.glow }"></div>
      <div class="glow-orb glow-orb--right" :style="{ background: sessionTheme.glow }"></div>
      <span
        v-for="sparkle in sparkles"
        :key="sparkle.id"
        class="sparkle-dot"
        :style="{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          animationDelay: `${sparkle.delay}s`,
        }"
      />
    </div>

    <div v-if="!hasRequiredParticipants" class="invalid-launch-card">
      <div class="invalid-launch-card__icon">🍔</div>
      <h2>合作造汉堡需要 2 名学生共同参与</h2>
      <p>当前没有完整的双人参与信息，请返回游戏大厅重新选择一位协作伙伴后再开始。</p>
      <small>这个游戏会以共享场次写入两名学生的训练记录，不支持单人启动。</small>
    </div>

    <template v-else>
      <div class="hud-panel">
        <div class="hud-card">
          <span>当前难度</span>
          <strong>{{ difficultyLabel }}</strong>
        </div>
        <div class="hud-card">
          <span>订单进度</span>
          <strong>{{ progressLabel }}</strong>
        </div>
        <div class="hud-card">
          <span>正确放置</span>
          <strong>{{ correctPlacements }} 层</strong>
        </div>
        <div class="hud-card">
          <span>误放次数</span>
          <strong>{{ wrongPlacements }} 次</strong>
        </div>
      </div>

      <div class="stage-layout">
        <section class="stage-panel">
          <div class="status-strip" :data-tone="statusTone">
            <span>{{ sessionTheme.title }}</span>
            <strong>{{ stageMessage }}</strong>
          </div>

          <div class="workbench-grid">
            <article class="recipe-card">
              <div class="recipe-card__heading">
                <span class="recipe-card__chip">订单卡</span>
                <strong>{{ currentRecipe?.title || '准备下一份订单' }}</strong>
              </div>

              <p class="recipe-card__hint">
                {{ currentRecipe?.description || difficultyConfig.helperText }}
              </p>

              <div v-if="currentRecipe" class="recipe-stack recipe-stack--target">
                <div class="bun bun--top">🍞 上层面包</div>
                <div
                  v-for="(ingredientId, index) in currentRecipe.layers"
                  :key="`${currentRecipe.id}-target-${ingredientId}-${index}`"
                  class="ingredient-layer ingredient-layer--target"
                  :style="getIngredientStyle(ingredientId)"
                >
                  <span>{{ getIngredient(ingredientId).emoji }}</span>
                  <strong>第 {{ index + 1 }} 层 · {{ getIngredient(ingredientId).label }}</strong>
                </div>
                <div class="bun bun--bottom">🍞 底层面包</div>
              </div>
            </article>

            <article class="assembly-card">
              <div class="assembly-card__header">
                <div>
                  <span class="assembly-card__chip">合作台</span>
                  <strong>{{ currentStepLabel }}</strong>
                </div>
                <p>{{ trayHint }}</p>
              </div>

              <div class="recipe-stack recipe-stack--current">
                <div class="bun bun--top">🍞 上层面包</div>
                <template v-if="currentRecipe">
                  <div
                    v-for="(ingredientId, index) in currentRecipe.layers"
                    :key="`${currentRecipe.id}-current-${ingredientId}-${index}`"
                    class="ingredient-layer"
                    :class="{
                      'is-filled': index < builtLayers.length,
                      'is-current': phase === 'ready' && index === currentLayerIndex,
                    }"
                    :style="getIngredientStyle(index < builtLayers.length ? builtLayers[index]! : ingredientId)"
                  >
                    <span>{{ index < builtLayers.length ? getIngredient(builtLayers[index]!).emoji : '•' }}</span>
                    <strong>
                      {{ index < builtLayers.length ? getIngredient(builtLayers[index]!).label : `等待 ${getIngredient(ingredientId).label}` }}
                    </strong>
                  </div>
                </template>
                <div class="bun bun--bottom">🍞 底层面包</div>
              </div>

              <div class="assembly-card__footer">
                <strong>{{ helperMessage }}</strong>
                <small>{{ sessionTheme.helperLine }}</small>
              </div>
            </article>
          </div>

          <div class="ingredient-tray">
            <div class="ingredient-tray__header">
              <div>
                <strong>配料托盘</strong>
                <span>{{ trayHint }}</span>
              </div>
              <small>{{ difficultyConfig.orderCount }} 份共享订单</small>
            </div>

            <div class="ingredient-grid">
              <button
                v-for="ingredient in ingredientOptions"
                :key="ingredient.id"
                type="button"
                class="ingredient-card"
                :class="{
                  'ingredient-card--mistake': lastMistakeIngredientId === ingredient.id,
                  'ingredient-card--disabled': !canPick,
                }"
                :disabled="!canPick"
                :style="getIngredientStyle(ingredient.id)"
                @click="handleIngredientPick(ingredient.id)"
              >
                <span class="ingredient-card__emoji">{{ ingredient.emoji }}</span>
                <strong>{{ ingredient.label }}</strong>
                <small>{{ ingredient.shortHint }}</small>
              </button>
            </div>
          </div>
        </section>

        <aside class="instruction-panel">
          <div class="panel-tags">
            <span>社交沟通</span>
            <span class="accent">{{ difficultyConfig.shortLabel }}</span>
          </div>

          <h2>合作造汉堡</h2>
          <p>{{ panelDescription }}</p>
          <small>{{ sessionTheme.helperLine }}</small>

          <div class="participant-grid">
            <article
              v-for="(participant, index) in participants"
              :key="participant.id"
              class="participant-card"
              :class="{ active: index === activePlayerIndex && phase === 'ready' }"
            >
              <div class="participant-card__avatar">{{ index === 0 ? '🧒' : '👧' }}</div>
              <div class="participant-card__copy">
                <strong>{{ participant.name }}</strong>
                <span>{{ index === activePlayerIndex && phase === 'ready' ? '当前轮到他/她' : '等待接下一层' }}</span>
              </div>
              <div class="participant-card__stats">
                <span>放对 {{ participant.correctCount }} 层</span>
                <span>误放 {{ participant.wrongCount }} 次</span>
              </div>
            </article>
          </div>

          <div class="progress-block">
            <div class="progress-labels">
              <span>开始协作</span>
              <span>轮流配合</span>
              <span>订单完成</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
            </div>
          </div>

          <div class="tip-grid">
            <div class="tip-card">
              <strong>本轮步骤</strong>
              <span>{{ currentStepLabel }}</span>
            </div>
            <div class="tip-card">
              <strong>首轮命中</strong>
              <span>{{ firstTryLayers }} 层</span>
            </div>
            <div class="tip-card">
              <strong>估算准确率</strong>
              <span>{{ accuracyLabel }}</span>
            </div>
            <div class="tip-card">
              <strong>平均放置</strong>
              <span>{{ averageTurnLabel }}</span>
            </div>
          </div>
        </aside>
      </div>

      <transition name="badge-pop">
        <div v-if="showBadge" class="badge-modal">
          <div class="badge-icon">🍔</div>
          <strong>合作小厨师徽章</strong>
          <p>{{ difficultyConfig.successText }}</p>
        </div>
      </transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type {
  CustomGameLaunchContext,
  EmotionGameAudioController,
  EmotionGameDifficulty,
  EmotionGameSettings,
  GroupGameCompletionPayload,
} from '@/types/emotional/games'

type IngredientId =
  | 'lettuce'
  | 'patty'
  | 'cheese'
  | 'tomato'
  | 'cucumber'
  | 'egg'
  | 'mushroom'
  | 'avocado'

type Phase = 'ready' | 'feedback' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'

interface DifficultyConfig {
  orderCount: number
  optionCount: number
  label: string
  shortLabel: string
  introText: string
  helperText: string
  successText: string
}

interface IngredientDefinition {
  id: IngredientId
  label: string
  emoji: string
  shortHint: string
  accent: string
  tint: string
}

interface RecipeDefinition {
  id: string
  minDifficulty: EmotionGameDifficulty
  title: string
  description: string
  layers: IngredientId[]
}

interface ThemeDefinition {
  key: string
  title: string
  background: string
  glow: string
  helperLine: string
  celebrationLine: string
}

interface SparkleDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    orderCount: 2,
    optionCount: 5,
    label: '简单 · 看着订单轮流放',
    shortLabel: '简单',
    introText: '两位小伙伴一起看订单卡，轮流把汉堡配料一层层放好。',
    helperText: '简单模式的订单更短、干扰更少，先练习“轮到我时再放”。',
    successText: '你们已经能对着同一张订单轮流合作了，合作小厨师徽章亮起来了。',
  },
  2: {
    orderCount: 3,
    optionCount: 6,
    label: '中等 · 更长订单',
    shortLabel: '中等',
    introText: '这次订单会更长，先看清下一层是什么，再轮流配合完成。',
    helperText: '中等模式会加入更长的配料顺序，需要边合作边保持注意力。',
    successText: '你们已经能稳稳轮流完成多层订单了，合作越来越默契。',
  },
  3: {
    orderCount: 4,
    optionCount: 8,
    label: '困难 · 多层协作',
    shortLabel: '困难',
    introText: '困难模式会出现更多配料和更长订单，要一起盯住同一个目标。',
    helperText: '困难模式需要在更多干扰里继续轮流、等待和配合，不要抢着放。',
    successText: '你们已经能在长订单里保持轮流和配合，整份汉堡都叠稳了。',
  },
}

const INGREDIENTS: Record<IngredientId, IngredientDefinition> = {
  lettuce: {
    id: 'lettuce',
    label: '生菜',
    emoji: '🥬',
    shortHint: '轻轻垫一层绿色脆叶',
    accent: '#6fb96f',
    tint: '#eef9eb',
  },
  patty: {
    id: 'patty',
    label: '肉饼',
    emoji: '🥩',
    shortHint: '厚厚的一层香香肉饼',
    accent: '#b46a4a',
    tint: '#f8ece7',
  },
  cheese: {
    id: 'cheese',
    label: '芝士',
    emoji: '🧀',
    shortHint: '软软的金黄色芝士片',
    accent: '#f2b63f',
    tint: '#fff7dc',
  },
  tomato: {
    id: 'tomato',
    label: '番茄',
    emoji: '🍅',
    shortHint: '红红的圆片放在中间',
    accent: '#ef6b5d',
    tint: '#ffefed',
  },
  cucumber: {
    id: 'cucumber',
    label: '黄瓜',
    emoji: '🥒',
    shortHint: '清爽脆脆的小圆片',
    accent: '#6fbf84',
    tint: '#edf9f0',
  },
  egg: {
    id: 'egg',
    label: '煎蛋',
    emoji: '🍳',
    shortHint: '圆圆的煎蛋最显眼',
    accent: '#f0b44d',
    tint: '#fff6df',
  },
  mushroom: {
    id: 'mushroom',
    label: '蘑菇',
    emoji: '🍄',
    shortHint: '软软的小蘑菇片',
    accent: '#bb8a68',
    tint: '#f7efe9',
  },
  avocado: {
    id: 'avocado',
    label: '牛油果',
    emoji: '🥑',
    shortHint: '淡绿色的绵软果片',
    accent: '#7cab55',
    tint: '#f1f7e7',
  },
}

const RECIPES: readonly RecipeDefinition[] = [
  {
    id: 'sunny-classic',
    minDifficulty: 1,
    title: '暖阳经典堡',
    description: '先放绿色配菜，再叠上主料和芝士，顺序要和订单卡一样。',
    layers: ['lettuce', 'patty', 'cheese'],
  },
  {
    id: 'garden-fresh',
    minDifficulty: 1,
    title: '花园清爽堡',
    description: '这一份更清爽，注意红绿配菜的前后顺序。',
    layers: ['lettuce', 'tomato', 'cucumber'],
  },
  {
    id: 'egg-energy',
    minDifficulty: 2,
    title: '能量煎蛋堡',
    description: '中间会加入煎蛋，轮到谁就由谁放好自己的那一层。',
    layers: ['lettuce', 'patty', 'egg', 'tomato'],
  },
  {
    id: 'cheese-picnic',
    minDifficulty: 2,
    title: '野餐芝士堡',
    description: '需要一起看住番茄和芝士的顺序，别因为颜色相近就放错。',
    layers: ['cucumber', 'tomato', 'cheese', 'patty'],
  },
  {
    id: 'mushroom-buddy',
    minDifficulty: 3,
    title: '伙伴蘑菇堡',
    description: '这份订单更长，要在多层配料里继续保持轮流和等待。',
    layers: ['lettuce', 'patty', 'mushroom', 'cheese', 'tomato'],
  },
  {
    id: 'avocado-hug',
    minDifficulty: 3,
    title: '抱抱牛油果堡',
    description: '留意牛油果和煎蛋的位置，这一份需要两人一起盯住长顺序。',
    layers: ['lettuce', 'avocado', 'tomato', 'egg', 'cheese'],
  },
]

const THEMES: readonly ThemeDefinition[] = [
  {
    key: 'picnic-table',
    title: '野餐协作桌',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.38), transparent 35%), linear-gradient(180deg, #fff5dc 0%, #ffe0c8 48%, #dff3df 100%)',
    glow: 'radial-gradient(circle, rgba(255, 188, 103, 0.78), rgba(255, 188, 103, 0))',
    helperLine: '先看同一张订单，再等轮到自己时把那一层放上去。',
    celebrationLine: '这一桌汉堡都完成啦，你们两个人配合得很稳。',
  },
  {
    key: 'sunrise-kitchen',
    title: '晨光小厨房',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.34), transparent 34%), linear-gradient(180deg, #fff0cf 0%, #ffd9c6 45%, #edf6d8 100%)',
    glow: 'radial-gradient(circle, rgba(255, 164, 111, 0.76), rgba(255, 164, 111, 0))',
    helperLine: '合作不是抢着放，而是轮到我时认真完成这一层。',
    celebrationLine: '晨光厨房里的订单都叠好了，你们已经学会一起盯住一个目标。',
  },
  {
    key: 'garden-party',
    title: '花园分享台',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.36), transparent 36%), linear-gradient(180deg, #efffe8 0%, #fff1cf 44%, #ffe2d8 100%)',
    glow: 'radial-gradient(circle, rgba(133, 212, 166, 0.74), rgba(133, 212, 166, 0))',
    helperLine: '看同一份订单、轮流等待、完成后换伙伴接下一层。',
    celebrationLine: '花园分享台的每一份汉堡都完成啦，今天的合作很默契。',
  },
]

const sparkles: readonly SparkleDot[] = [
  { id: 1, left: 8, top: 14, size: 12, delay: 0 },
  { id: 2, left: 18, top: 72, size: 8, delay: 1.2 },
  { id: 3, left: 32, top: 10, size: 10, delay: 0.6 },
  { id: 4, left: 56, top: 17, size: 9, delay: 1.5 },
  { id: 5, left: 74, top: 78, size: 11, delay: 0.4 },
  { id: 6, left: 88, top: 24, size: 7, delay: 1.8 },
]

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  settings: EmotionGameSettings
  paused: boolean
  launchContext: CustomGameLaunchContext
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: GroupGameCompletionPayload]
}>()

const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const sessionTheme = ref<ThemeDefinition>(THEMES[0]!)
const sessionRecipes = ref<RecipeDefinition[]>([])
const ingredientPoolIds = ref<IngredientId[]>([])
const recipeIndex = ref(0)
const currentLayerIndex = ref(0)
const builtLayers = ref<IngredientId[]>([])
const completedOrderTitles = ref<string[]>([])
const completedLayerLabels = ref<string[]>([])
const turnLogLabels = ref<string[]>([])
const correctPlacements = ref(0)
const wrongPlacements = ref(0)
const firstTryLayers = ref(0)
const currentStepWrongAttempts = ref(0)
const turnTimesMs = ref<number[]>([])
const participantCorrectCounts = ref<number[]>([])
const participantWrongCounts = ref<number[]>([])
const activePlayerIndex = ref(0)
const startingPlayerIndex = ref(0)
const stageMessage = ref(DIFFICULTY_CONFIGS[1].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[1].helperText)
const lastMistakeIngredientId = ref<IngredientId | null>(null)
const showBadge = ref(false)

let stepStartedAt = 0
let roundDirty = false
let feedbackTimer = 0
let badgeTimer = 0
let completeTimer = 0
let resetTimer = 0

const resolvedParticipantIds = computed(() => {
  const explicitIds = Array.isArray(props.launchContext.participantStudentIds)
    ? props.launchContext.participantStudentIds
    : []

  const source = explicitIds.length > 0
    ? explicitIds
    : [props.launchContext.studentId]

  return Array.from(new Set(
    source
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.floor(value)),
  ))
})

const resolvedParticipantNames = computed(() => {
  const explicitNames = Array.isArray(props.launchContext.participantStudentNames)
    ? props.launchContext.participantStudentNames
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    : []

  return resolvedParticipantIds.value.map((studentId, index) => {
    return explicitNames[index]
      || (index === 0 && props.launchContext.studentName ? props.launchContext.studentName : '')
      || `学生 ${studentId}`
  })
})

const hasRequiredParticipants = computed(() => resolvedParticipantIds.value.length >= 2)
const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value] || DIFFICULTY_CONFIGS[1])
const currentRecipe = computed(() => sessionRecipes.value[recipeIndex.value] || null)
const ingredientOptions = computed(() => ingredientPoolIds.value.map((ingredientId) => getIngredient(ingredientId)))
const canPick = computed(() => !props.paused && phase.value === 'ready' && hasRequiredParticipants.value)
const participants = computed(() => {
  return resolvedParticipantIds.value.map((studentId, index) => ({
    id: studentId,
    name: resolvedParticipantNames.value[index] || `学生 ${studentId}`,
    correctCount: participantCorrectCounts.value[index] || 0,
    wrongCount: participantWrongCounts.value[index] || 0,
  }))
})
const activeParticipantName = computed(() => participants.value[activePlayerIndex.value]?.name || '合作伙伴')
const progressRatio = computed(() => {
  return completedOrderTitles.value.length / Math.max(1, difficultyConfig.value.orderCount)
})
const progressLabel = computed(() => `${completedOrderTitles.value.length}/${difficultyConfig.value.orderCount} 个`)
const difficultyLabel = computed(() => difficultyConfig.value.label)
const currentExpectedIngredientId = computed(() => currentRecipe.value?.layers[currentLayerIndex.value] || null)
const currentExpectedIngredient = computed(() => {
  return currentExpectedIngredientId.value ? getIngredient(currentExpectedIngredientId.value) : null
})
const trayHint = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '这一轮所有共享订单都已经完成。'
  }

  if (!currentExpectedIngredient.value) {
    return '先一起看订单卡，再按顺序放配料。'
  }

  return `轮到 ${activeParticipantName.value} 放上「${currentExpectedIngredient.value.label}」`
})
const panelDescription = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return difficultyConfig.value.introText
})
const currentStepLabel = computed(() => {
  if (!currentRecipe.value) {
    return '等待下一份订单'
  }

  return `第 ${Math.min(currentLayerIndex.value + 1, currentRecipe.value.layers.length)} 层 / 共 ${currentRecipe.value.layers.length} 层`
})
const accuracyLabel = computed(() => {
  const total = correctPlacements.value + wrongPlacements.value
  if (total <= 0) {
    return '-'
  }

  return `${Math.round((correctPlacements.value / total) * 100)}%`
})
const averageTurnLabel = computed(() => formatResponseTime(averageNumberList(turnTimesMs.value)))

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

function getIngredient(ingredientId: IngredientId): IngredientDefinition {
  return INGREDIENTS[ingredientId]
}

function getIngredientStyle(ingredientId: IngredientId) {
  const ingredient = getIngredient(ingredientId)
  return {
    '--ingredient-accent': ingredient.accent,
    '--ingredient-tint': ingredient.tint,
  }
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

function pickRandomTheme() {
  return shuffleArray(THEMES)[0] || THEMES[0]!
}

function buildRecipeSet(difficulty: EmotionGameDifficulty) {
  const eligibleRecipes = RECIPES.filter((recipe) => recipe.minDifficulty <= difficulty)
  return shuffleArray(eligibleRecipes).slice(0, DIFFICULTY_CONFIGS[difficulty].orderCount)
}

function buildIngredientPool(recipes: readonly RecipeDefinition[], optionCount: number) {
  const requiredIngredientIds = Array.from(new Set(
    recipes.flatMap((recipe) => recipe.layers),
  ))

  const distractorIds = shuffleArray(
    Object.keys(INGREDIENTS)
      .map((key) => key as IngredientId)
      .filter((ingredientId) => !requiredIngredientIds.includes(ingredientId)),
  )

  if (requiredIngredientIds.length >= optionCount) {
    return shuffleArray(requiredIngredientIds)
  }

  return shuffleArray([
    ...requiredIngredientIds,
    ...distractorIds.slice(0, optionCount - requiredIngredientIds.length),
  ])
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function updateParticipantMetric(target: typeof participantCorrectCounts, index: number) {
  const next = [...target.value]
  next[index] = (next[index] || 0) + 1
  target.value = next
}

function speakIfEnabled(text: string) {
  if (!props.settings.effectsEnabled) {
    return
  }

  props.audio.speak(text)
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

function applyStepState() {
  if (!currentRecipe.value || !hasRequiredParticipants.value) {
    return
  }

  phase.value = 'ready'
  statusTone.value = 'neutral'
  currentStepWrongAttempts.value = 0
  lastMistakeIngredientId.value = null
  stageMessage.value = `轮到 ${activeParticipantName.value} 给《${currentRecipe.value.title}》放第 ${currentLayerIndex.value + 1} 层。`
  helperMessage.value = currentRecipe.value.description
  stepStartedAt = performance.now()
}

function buildPerformanceData() {
  const totalActions = correctPlacements.value + wrongPlacements.value
  const totalLayers = sessionRecipes.value.reduce((sum, recipe) => sum + recipe.layers.length, 0)

  return {
    completed_orders: completedOrderTitles.value.length,
    target_order_count: difficultyConfig.value.orderCount,
    completed_layer_count: correctPlacements.value,
    target_layer_count: totalLayers,
    correct_placements: correctPlacements.value,
    wrong_placements: wrongPlacements.value,
    first_try_layers: firstTryLayers.value,
    total_actions: totalActions,
    accuracy_ratio: Number((correctPlacements.value / Math.max(1, totalActions)).toFixed(4)),
    turn_times_ms: [...turnTimesMs.value],
    average_turn_ms: Math.round(averageNumberList(turnTimesMs.value)),
    recipe_ids: sessionRecipes.value.map((recipe) => recipe.id),
    recipe_titles: sessionRecipes.value.map((recipe) => recipe.title),
    completed_recipe_titles: [...completedOrderTitles.value],
    completed_layer_labels: [...completedLayerLabels.value],
    turn_log_labels: [...turnLogLabels.value],
    participant_names: [...resolvedParticipantNames.value],
    participant_turn_summary: participants.value.map((participant) => {
      return `${participant.name}：放对 ${participant.correctCount} 层，误放 ${participant.wrongCount} 次`
    }),
    session_theme: sessionTheme.value.key,
    session_theme_title: sessionTheme.value.title,
    starting_player_name: resolvedParticipantNames.value[startingPlayerIndex.value] || '',
  }
}

function finishSession() {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return
  }

  phase.value = 'celebrating'
  statusTone.value = 'success'
  stageMessage.value = '所有订单都完成啦，这一桌汉堡已经叠好了。'
  helperMessage.value = difficultyConfig.value.successText
  props.audio.stopAmbient()
  playSuccessCue(sessionTheme.value.celebrationLine)

  badgeTimer = window.setTimeout(() => {
    showBadge.value = true
  }, 650)

  completeTimer = window.setTimeout(() => {
    emit('complete', {
      participantStudentIds: [...resolvedParticipantIds.value],
      performanceData: buildPerformanceData(),
      badge: {
        badgeCode: 'BADGE_BURGER_BUDDY',
        badgeName: '合作小厨师徽章',
      },
    })
    phase.value = 'finished'
  }, 1300)

  resetTimer = window.setTimeout(() => {
    if (!props.paused) {
      resetForDifficulty(activeDifficulty.value)
    }
  }, 3200)
}

function moveToNextOrder() {
  if (completedOrderTitles.value.length >= difficultyConfig.value.orderCount) {
    finishSession()
    return
  }

  recipeIndex.value += 1
  currentLayerIndex.value = 0
  builtLayers.value = []
  applyStepState()
}

function handleIngredientPick(ingredientId: IngredientId) {
  if (!canPick.value || !currentRecipe.value || !currentExpectedIngredient.value) {
    return
  }

  const ingredient = getIngredient(ingredientId)
  const actingPlayerName = activeParticipantName.value
  const actingPlayerIndex = activePlayerIndex.value

  markRoundDirtyOnce()
  startAmbientIfNeeded()

  if (ingredientId !== currentExpectedIngredient.value.id) {
    wrongPlacements.value += 1
    currentStepWrongAttempts.value += 1
    lastMistakeIngredientId.value = ingredientId
    updateParticipantMetric(participantWrongCounts, actingPlayerIndex)
    turnLogLabels.value = [
      ...turnLogLabels.value,
      `${actingPlayerName} 误放了 ${ingredient.label}`,
    ]
    statusTone.value = 'gentle'
    stageMessage.value = `${ingredient.label} 还不是这一层，再一起看看订单卡。`
    helperMessage.value = `还轮到 ${actingPlayerName}，目标配料是 ${currentExpectedIngredient.value.label}。`
    playSoftCue()
    return
  }

  const placementDuration = Math.max(0, Math.round(performance.now() - stepStartedAt))
  turnTimesMs.value = [...turnTimesMs.value, placementDuration]
  correctPlacements.value += 1
  builtLayers.value = [...builtLayers.value, ingredientId]
  completedLayerLabels.value = [...completedLayerLabels.value, ingredient.label]
  turnLogLabels.value = [
    ...turnLogLabels.value,
    `${actingPlayerName} 放对了 ${ingredient.label}`,
  ]
  updateParticipantMetric(participantCorrectCounts, actingPlayerIndex)

  if (currentStepWrongAttempts.value === 0) {
    firstTryLayers.value += 1
  }

  playSuccessCue(`${actingPlayerName} 把 ${ingredient.label} 放好了。`)

  const nextLayerIndex = currentLayerIndex.value + 1
  const finishedCurrentRecipe = nextLayerIndex >= currentRecipe.value.layers.length
  const completedRecipeTitle = currentRecipe.value.title

  activePlayerIndex.value = participants.value.length > 1
    ? (activePlayerIndex.value + 1) % participants.value.length
    : 0
  currentLayerIndex.value = nextLayerIndex
  phase.value = 'feedback'
  statusTone.value = 'success'
  lastMistakeIngredientId.value = null

  if (finishedCurrentRecipe) {
    completedOrderTitles.value = [...completedOrderTitles.value, completedRecipeTitle]
    stageMessage.value = `《${completedRecipeTitle}》完成啦，换下一份订单。`
    helperMessage.value = '这一份汉堡已经合作完成，可以准备下一份了。'

    if (completedOrderTitles.value.length >= difficultyConfig.value.orderCount) {
      finishSession()
      return
    }

    feedbackTimer = window.setTimeout(() => {
      moveToNextOrder()
    }, 950)
    return
  }

  const nextIngredient = currentRecipe.value.layers[nextLayerIndex]
  stageMessage.value = `${actingPlayerName} 放好了 ${ingredient.label}，换伙伴接下一层。`
  helperMessage.value = nextIngredient
    ? `下一层要找 ${getIngredient(nextIngredient).label}。`
    : difficultyConfig.value.helperText

  feedbackTimer = window.setTimeout(() => {
    applyStepState()
  }, 720)
}

function resetForDifficulty(difficulty: EmotionGameDifficulty = props.difficulty) {
  clearAllTimers()
  activeDifficulty.value = difficulty
  sessionTheme.value = pickRandomTheme()
  sessionRecipes.value = hasRequiredParticipants.value ? buildRecipeSet(difficulty) : []
  ingredientPoolIds.value = buildIngredientPool(sessionRecipes.value, DIFFICULTY_CONFIGS[difficulty].optionCount)
  recipeIndex.value = 0
  currentLayerIndex.value = 0
  builtLayers.value = []
  completedOrderTitles.value = []
  completedLayerLabels.value = []
  turnLogLabels.value = []
  correctPlacements.value = 0
  wrongPlacements.value = 0
  firstTryLayers.value = 0
  currentStepWrongAttempts.value = 0
  turnTimesMs.value = []
  participantCorrectCounts.value = new Array(resolvedParticipantIds.value.length).fill(0)
  participantWrongCounts.value = new Array(resolvedParticipantIds.value.length).fill(0)
  startingPlayerIndex.value = hasRequiredParticipants.value
    ? Math.floor(Math.random() * resolvedParticipantIds.value.length)
    : 0
  activePlayerIndex.value = startingPlayerIndex.value
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].introText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].helperText
  lastMistakeIngredientId.value = null
  showBadge.value = false
  statusTone.value = 'neutral'
  phase.value = 'ready'
  roundDirty = false
  props.audio.stopAmbient()

  if (hasRequiredParticipants.value && sessionRecipes.value.length > 0) {
    applyStepState()
  }
}

watch(
  () => props.difficulty,
  (difficulty) => {
    resetForDifficulty(difficulty)
  },
)

watch(
  () => `${resolvedParticipantIds.value.join(',')}|${resolvedParticipantNames.value.join('|')}`,
  () => {
    resetForDifficulty(props.difficulty)
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

resetForDifficulty(props.difficulty)

onBeforeUnmount(() => {
  clearAllTimers()
  props.audio.stopAmbient()
})
</script>

<style scoped>
.burger-coop-game {
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
  filter: blur(8px);
  opacity: 0.55;
}

.glow-orb--left {
  top: -24px;
  left: -40px;
}

.glow-orb--right {
  right: -32px;
  bottom: 32px;
}

.sparkle-dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.42);
  animation: burger-float 6.8s ease-in-out infinite;
}

.invalid-launch-card {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 72px auto 0;
  padding: 32px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 22px 40px rgba(107, 75, 33, 0.12);
  text-align: center;
}

.invalid-launch-card__icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.invalid-launch-card h2 {
  margin: 0 0 12px;
  color: #6c4a1f;
}

.invalid-launch-card p,
.invalid-launch-card small {
  display: block;
  color: #6b6b6b;
  line-height: 1.7;
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
.recipe-card,
.assembly-card,
.ingredient-tray,
.instruction-panel,
.badge-modal {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 18px 36px rgba(95, 68, 30, 0.12);
  backdrop-filter: blur(10px);
}

.hud-card {
  padding: 14px 16px;
  border-radius: 18px;
}

.hud-card span {
  display: block;
  margin-bottom: 6px;
  color: #7b6f60;
  font-size: 13px;
}

.hud-card strong {
  color: #4b3218;
  font-size: 18px;
}

.stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.85fr);
  gap: 18px;
}

.stage-panel,
.instruction-panel {
  min-height: 0;
}

.stage-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.status-strip span {
  color: #7c725f;
  font-size: 13px;
}

.status-strip strong {
  color: #563819;
}

.status-strip[data-tone='gentle'] {
  background: rgba(255, 244, 227, 0.92);
}

.status-strip[data-tone='success'] {
  background: rgba(234, 250, 233, 0.94);
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 16px;
}

.recipe-card,
.assembly-card,
.ingredient-tray,
.instruction-panel {
  border-radius: 24px;
  padding: 20px;
}

.recipe-card__heading,
.assembly-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.recipe-card__heading strong,
.assembly-card__header strong {
  color: #4b3218;
  font-size: 20px;
}

.recipe-card__chip,
.assembly-card__chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(248, 188, 87, 0.18);
  color: #9a6516;
  font-size: 12px;
  margin-bottom: 8px;
}

.recipe-card__hint,
.assembly-card__header p {
  margin: 12px 0 0;
  color: #6f6557;
  line-height: 1.7;
}

.recipe-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}

.bun,
.ingredient-layer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 10px 12px;
  border-radius: 14px;
  text-align: center;
}

.bun {
  background: linear-gradient(135deg, #ffdd9b 0%, #f7b56a 100%);
  color: #6e4311;
  font-weight: 700;
}

.ingredient-layer {
  background: var(--ingredient-tint);
  color: var(--ingredient-accent);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.ingredient-layer--target {
  opacity: 0.88;
}

.ingredient-layer.is-filled {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.ingredient-layer.is-current {
  outline: 2px solid rgba(245, 166, 35, 0.52);
  transform: translateY(-2px);
}

.assembly-card__footer {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assembly-card__footer strong {
  color: #5c421c;
}

.assembly-card__footer small {
  color: #8a7b69;
  line-height: 1.6;
}

.ingredient-tray__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.ingredient-tray__header strong {
  display: block;
  margin-bottom: 6px;
  color: #4b3218;
}

.ingredient-tray__header span,
.ingredient-tray__header small {
  color: #7a6f61;
  line-height: 1.6;
}

.ingredient-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.ingredient-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-height: 138px;
  padding: 16px 14px;
  border-radius: 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: var(--ingredient-tint);
  color: var(--ingredient-accent);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.ingredient-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.08);
}

.ingredient-card__emoji {
  font-size: 28px;
}

.ingredient-card strong {
  color: #3b3028;
  font-size: 17px;
}

.ingredient-card small {
  color: #6c675f;
  line-height: 1.5;
}

.ingredient-card--mistake {
  border-color: rgba(239, 107, 93, 0.5);
  box-shadow: 0 0 0 2px rgba(239, 107, 93, 0.16) inset;
}

.ingredient-card--disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.instruction-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.panel-tags span {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(244, 237, 225, 0.95);
  color: #7e6f5a;
  font-size: 12px;
}

.panel-tags .accent {
  background: rgba(245, 166, 35, 0.18);
  color: #9a6516;
}

.instruction-panel h2 {
  margin: 0;
  color: #4b3218;
  font-size: 28px;
}

.instruction-panel p,
.instruction-panel small {
  margin: 0;
  color: #6c6257;
  line-height: 1.7;
}

.participant-grid {
  display: grid;
  gap: 12px;
}

.participant-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(251, 248, 240, 0.98);
  border: 1px solid rgba(221, 212, 195, 0.86);
}

.participant-card.active {
  border-color: rgba(245, 166, 35, 0.55);
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.12) inset;
}

.participant-card__avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffdeaf 0%, #ffc891 100%);
  font-size: 24px;
}

.participant-card__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant-card__copy strong {
  color: #4b3218;
}

.participant-card__copy span,
.participant-card__stats span {
  color: #766a5b;
  font-size: 13px;
}

.participant-card__stats {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
}

.progress-block {
  padding: 16px;
  border-radius: 18px;
  background: rgba(251, 248, 240, 0.98);
}

.progress-labels,
.tip-grid {
  display: grid;
  gap: 12px;
}

.progress-labels {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 10px;
  color: #7d7263;
  font-size: 12px;
}

.progress-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(221, 212, 195, 0.72);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #f6b84f 0%, #f48c6c 100%);
}

.tip-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tip-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(251, 248, 240, 0.98);
}

.tip-card strong {
  display: block;
  margin-bottom: 6px;
  color: #7e6a46;
  font-size: 13px;
}

.tip-card span {
  color: #4d3a22;
  font-size: 16px;
  line-height: 1.5;
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
  color: #50341a;
  font-size: 24px;
}

.badge-modal p {
  margin: 12px 0 0;
  color: #716553;
  line-height: 1.7;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 0.26s ease, transform 0.26s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -44%) scale(0.96);
}

@keyframes burger-float {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.28;
  }
  50% {
    transform: translateY(-10px);
    opacity: 0.6;
  }
}

@media (max-width: 1100px) {
  .stage-layout,
  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .ingredient-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .burger-coop-game {
    padding: 16px;
  }

  .hud-panel,
  .tip-grid,
  .ingredient-grid {
    grid-template-columns: 1fr;
  }

  .progress-labels {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .participant-card__stats,
  .ingredient-tray__header,
  .recipe-card__heading,
  .assembly-card__header {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
