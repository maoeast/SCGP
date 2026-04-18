<template>
  <div class="prototype-game set-table-game">
    <div class="prototype-game__backdrop" aria-hidden="true">
      <div class="prototype-game__glow prototype-game__glow--left set-table-game__glow"></div>
      <div class="prototype-game__glow prototype-game__glow--right set-table-game__glow set-table-game__glow--alt"></div>
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
        <span>摆放进度</span>
        <strong>{{ progressLabel }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>错误放置</span>
        <strong>{{ wrongPlacements }} 次</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>桌面情境</span>
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

        <section v-if="phase === 'ready'" class="set-table-game__intro">
          <div class="set-table-game__stage-board set-table-game__stage-board--intro">
            <div class="set-table-game__section-head set-table-game__section-head--compact">
              <div>
                <span class="set-table-game__section-kicker">餐桌主舞台</span>
                <strong>先认识桌面、餐位和餐具</strong>
              </div>
              <small>主视觉已经切到正式 SVG，桌面、餐垫和餐具会跟着难度切换。</small>
            </div>

            <div class="set-table-game__stage-scene set-table-game__stage-scene--intro">
              <SetTableStageArt
                preview
                :theme-id="sessionTheme.id"
                :slot-ids="difficultyConfig.slotIds"
              />
            </div>

            <div class="set-table-game__preview-strip">
              <article
                v-for="slot in previewSlots"
                :key="slot.id"
                class="set-table-game__preview-step"
              >
                <span>{{ slot.emoji }}</span>
                <strong>{{ slot.label }}</strong>
                <small>{{ slot.shortHint }}</small>
              </article>
            </div>
          </div>

          <div class="set-table-game__intro-copy">
            <h2>先选餐具，再把它放到正确的位置上。</h2>
            <p>桌面上会有淡淡的虚影提示。选中一个物品后，再点最适合它的位置，慢慢练习空间锚点。</p>
          </div>
        </section>

        <section v-else-if="phase === 'playing'" class="set-table-game__play">
          <div class="set-table-game__stage-board">
            <div class="set-table-game__section-head">
              <div>
                <span class="set-table-game__section-kicker">正式餐位</span>
                <strong>选好餐具后，点桌面上对应的位置</strong>
              </div>
              <small>ghost 锚点会保留在桌面上，选中和提示中的位置会额外发光。</small>
            </div>

            <div class="set-table-game__stage-scene">
              <SetTableStageArt
                interactive
                :disabled="paused"
                :theme-id="sessionTheme.id"
                :slot-ids="activeSlotIds"
                :filled-slot-ids="filledSlotIds"
                :selected-slot-id="selectedItemId || null"
                :hinted-slot-id="hintedSlotId || null"
                @pick-slot="handleStageSlotPick"
              />
            </div>

            <p class="set-table-game__stage-note">
              {{ selectedItemId ? `${selectedItemLabel} 要去发光的位置。` : '先从下方选一件餐具，再点桌面上的锚点。' }}
            </p>
          </div>

          <div class="set-table-game__items">
            <button
              v-for="item in targetSlots"
              :key="item.id"
              type="button"
              class="set-table-game__item-card"
              :class="{
                'is-selected': selectedItemId === item.id,
                'is-done': Boolean(placedMap[item.id]),
              }"
              :disabled="paused || Boolean(placedMap[item.id])"
              @click="selectItem(item)"
            >
              <span>{{ item.emoji }}</span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.shortHint }}</small>
            </button>
          </div>
        </section>

        <section v-else class="set-table-game__complete">
          <div class="set-table-game__stage-board set-table-game__stage-board--complete">
            <div class="set-table-game__section-head">
              <div>
                <span class="set-table-game__section-kicker">完成舞台</span>
                <strong>这一桌已经摆整齐啦</strong>
              </div>
              <small>{{ sessionTheme.helperLine }}</small>
            </div>

            <div class="set-table-game__stage-scene set-table-game__complete-scene">
              <SetTableStageArt
                finished
                :theme-id="sessionTheme.id"
                :slot-ids="activeSlotIds"
                :filled-slot-ids="filledSlotIds"
              />
            </div>
          </div>

          <div class="set-table-game__complete-card">
            <span>🍽️</span>
            <strong>桌面已经摆好啦</strong>
            <small>{{ sessionTheme.description }}</small>
          </div>
        </section>
      </article>

      <aside class="prototype-game__aside prototype-game__surface">
        <div class="prototype-game__tags">
          <span class="prototype-game__tag">生活自理</span>
          <span class="prototype-game__tag prototype-game__tag--accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h1 class="prototype-game__title">摆桌子帮帮忙</h1>
        <p class="prototype-game__copy">
          通过虚影定位和轻量摆放练习，让孩子慢慢理解“碗、杯子、勺子、筷子应该放在哪里”。
        </p>

        <div class="prototype-game__progress">
          <div class="prototype-game__progress-labels">
            <span>选餐具</span>
            <span>点位置</span>
            <span>桌面摆好</span>
          </div>
          <div class="prototype-game__progress-track">
            <div class="prototype-game__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <section class="prototype-game__tip-grid">
          <article class="prototype-game__tip-card">
            <strong>当前餐具</strong>
            <span>{{ selectedItemLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>平均摆放</strong>
            <span>{{ averagePlacementLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>提示等级</strong>
            <span>{{ highestPromptLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>主题提醒</strong>
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
            开始摆桌练习
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
            再摆一次
          </button>
        </div>
      </aside>
    </section>

    <transition name="badge-pop">
      <div v-if="showBadge" class="prototype-game__badge-modal">
        <div class="prototype-game__badge-icon">🍽️</div>
        <strong>摆桌小帮手徽章</strong>
        <p>你已经把餐具摆到合适的位置了。</p>
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
import SetTableStageArt from './SetTableStageArt.vue'
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
  slotIds: string[]
}

interface TableSlot {
  id: string
  label: string
  emoji: string
  shortHint: string
  ghostEmoji: string
  anchorLabel: string
  position: Record<string, string>
}

interface ThemeDefinition {
  id: string
  title: string
  description: string
  helperLine: string
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
    label: '简单 · 三件餐具',
    shortLabel: '简单',
    slotIds: ['bowl', 'spoon', 'cup'],
  },
  2: {
    label: '中等 · 四件餐具',
    shortLabel: '中等',
    slotIds: ['bowl', 'spoon', 'cup', 'chopsticks'],
  },
  3: {
    label: '困难 · 完整餐位',
    shortLabel: '困难',
    slotIds: ['bowl', 'spoon', 'cup', 'chopsticks', 'napkin'],
  },
}

const TABLE_SLOTS: ReadonlyArray<TableSlot> = [
  {
    id: 'bowl',
    label: '小碗',
    emoji: '🍚',
    shortHint: '放在正中间',
    ghostEmoji: '◌',
    anchorLabel: '碗位',
    position: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'spoon',
    label: '勺子',
    emoji: '🥄',
    shortHint: '放在碗的左边',
    ghostEmoji: '⟪',
    anchorLabel: '左侧餐具',
    position: { left: '24%', top: '54%', transform: 'translate(-50%, -50%)' },
  },
  {
    id: 'cup',
    label: '杯子',
    emoji: '🥛',
    shortHint: '放在右上角',
    ghostEmoji: '◔',
    anchorLabel: '右上角杯位',
    position: { right: '18%', top: '28%', transform: 'translate(0, 0)' },
  },
  {
    id: 'chopsticks',
    label: '筷子',
    emoji: '🥢',
    shortHint: '放在碗的右边',
    ghostEmoji: '⟫',
    anchorLabel: '右侧餐具',
    position: { right: '24%', top: '56%', transform: 'translate(0, -50%)' },
  },
  {
    id: 'napkin',
    label: '餐巾',
    emoji: '🧻',
    shortHint: '放在碗的左上角',
    ghostEmoji: '▭',
    anchorLabel: '左上角餐巾位',
    position: { left: '18%', top: '24%', transform: 'translate(0, 0)' },
  },
]

const THEMES: ReadonlyArray<ThemeDefinition> = [
  {
    id: 'family-dinner',
    title: '家人要吃饭啦',
    description: '把餐具放稳，桌面就会更整齐也更有参与感。',
    helperLine: '看着虚影，把餐具慢慢送到位。',
  },
  {
    id: 'breakfast',
    title: '早餐准备中',
    description: '今天要帮忙摆早餐桌，先把常用餐具放好。',
    helperLine: '先看桌面，再想每个餐具应该在哪。',
  },
  {
    id: 'guest',
    title: '有客人来做客',
    description: '把桌面摆整齐，会让大家都更舒服。',
    helperLine: '每个位置都对应一件餐具。',
  },
]

const sparkles: ReadonlyArray<SparkleDot> = [
  { id: 1, left: 10, top: 20, size: 12, delay: 0.3 },
  { id: 2, left: 26, top: 78, size: 9, delay: 1.1 },
  { id: 3, left: 48, top: 18, size: 15, delay: 0.7 },
  { id: 4, left: 74, top: 16, size: 12, delay: 1.5 },
  { id: 5, left: 88, top: 54, size: 10, delay: 0.9 },
]

const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const helperMessage = ref('先选餐具，再把它放到正确的位置。')
const sessionTheme = ref<ThemeDefinition>(THEMES[0]!)
const targetSlots = ref<TableSlot[]>([])
const selectedItemId = ref('')
const placedMap = ref<Record<string, TableSlot | null>>({})
const wrongPlacements = ref(0)
const promptCount = ref(0)
const hintedSlotId = ref('')
const placementTimes = ref<number[]>([])
const showBadge = ref(false)

let hasRoundDirty = false
let roundStartedAt = 0
let selectionStartedAt = 0
let celebrationTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const progressPercent = computed(() => {
  if (!targetSlots.value.length) {
    return phase.value === 'ready' ? 0 : 100
  }

  const completedCount = Object.values(placedMap.value).filter(Boolean).length
  return clampNumber(Math.round((completedCount / targetSlots.value.length) * 100), 0, 100)
})
const progressLabel = computed(() => `${Object.values(placedMap.value).filter(Boolean).length}/${targetSlots.value.length || 0}`)
const stageEyebrow = computed(() => {
  if (phase.value === 'ready') return '开始前'
  if (phase.value === 'playing') return '摆桌进行中'
  if (phase.value === 'celebrating') return '已完成'
  return '等待保存'
})
const stageTitle = computed(() => {
  if (phase.value === 'ready') return '先熟悉桌面上的位置'
  if (phase.value === 'playing') return selectedItemId.value ? '现在给这件餐具找位置' : '先从下方选一件餐具'
  return '这一桌已经摆好啦'
})
const selectedItemLabel = computed(() => {
  if (!selectedItemId.value) {
    return '还没选餐具'
  }

  return targetSlots.value.find((slot) => slot.id === selectedItemId.value)?.label || '还没选餐具'
})
const averagePlacementMs = computed(() => averageNumberList(placementTimes.value))
const averagePlacementLabel = computed(() => {
  if (!averagePlacementMs.value) return '还没有摆放数据'
  if (averagePlacementMs.value < 1000) return `${averagePlacementMs.value}ms`
  return `${(averagePlacementMs.value / 1000).toFixed(1)} 秒`
})
const highestPromptLabel = computed(() => `Level ${clampNumber(promptCount.value, 0, 3)}`)
const previewSlots = computed(() => buildTargetSlots(activeDifficulty.value))
const activeSlotIds = computed(() => targetSlots.value.map((slot) => slot.id))
const filledSlotIds = computed(() => targetSlots.value.filter((slot) => Boolean(placedMap.value[slot.id])).map((slot) => slot.id))
const paused = computed(() => props.paused)

function markDirtyOnce() {
  if (hasRoundDirty) {
    return
  }

  hasRoundDirty = true
  roundStartedAt = Date.now()
  props.markRoundDirty?.()
}

function resetRound() {
  window.clearTimeout(celebrationTimer)
  phase.value = 'ready'
  activeDifficulty.value = props.difficulty
  helperMessage.value = '先选餐具，再把它放到正确的位置。'
  targetSlots.value = []
  selectedItemId.value = ''
  placedMap.value = {}
  wrongPlacements.value = 0
  promptCount.value = 0
  hintedSlotId.value = ''
  placementTimes.value = []
  showBadge.value = false
  selectionStartedAt = 0
  props.audio.stopAmbient()
}

function buildTargetSlots(difficulty: EmotionGameDifficulty) {
  return DIFFICULTY_CONFIGS[difficulty].slotIds
    .map((slotId) => TABLE_SLOTS.find((slot) => slot.id === slotId) || null)
    .filter((slot): slot is TableSlot => slot !== null)
}

function startGame() {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  targetSlots.value = buildTargetSlots(props.difficulty)
  placedMap.value = Object.fromEntries(targetSlots.value.map((slot) => [slot.id, null]))
  selectedItemId.value = ''
  wrongPlacements.value = 0
  promptCount.value = 0
  placementTimes.value = []
  sessionTheme.value = shuffleArray(THEMES)[0] || THEMES[0]!
  helperMessage.value = '先从下方选一件餐具，再点桌面位置。'
  phase.value = 'playing'

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // Keep the round playable without audio.
  })
  props.audio.speak('先选一件餐具，再把它送到桌面上对应的位置。')
}

function selectItem(slot: TableSlot) {
  if (paused.value || phase.value !== 'playing' || placedMap.value[slot.id]) {
    return
  }

  selectedItemId.value = slot.id
  hintedSlotId.value = ''
  selectionStartedAt = Date.now()
  helperMessage.value = `现在把 ${slot.label} 放到最合适的位置。`
}

function handleStageSlotPick(slotId: string) {
  const slot = targetSlots.value.find((candidate) => candidate.id === slotId)
  if (!slot) {
    return
  }

  handleSlotPick(slot)
}

function handleSlotPick(slot: TableSlot) {
  if (paused.value || phase.value !== 'playing') {
    return
  }

  if (!selectedItemId.value) {
    helperMessage.value = '先从下方选一件餐具，再点桌面位置。'
    return
  }

  if (slot.id !== selectedItemId.value) {
    wrongPlacements.value += 1
    helperMessage.value = `${selectedItemLabel.value}更适合另一个位置，再看看虚影提示。`
    props.audio.playSoftBounce().catch(() => {
      // Soft feedback is optional.
    })
    return
  }

  placedMap.value = {
    ...placedMap.value,
    [slot.id]: slot,
  }

  if (selectionStartedAt > 0) {
    placementTimes.value.push(Date.now() - selectionStartedAt)
  }

  selectedItemId.value = ''
  hintedSlotId.value = ''
  helperMessage.value = '摆得很好，再选下一件餐具。'

  if (Object.values(placedMap.value).filter(Boolean).length >= targetSlots.value.length) {
    finishRound()
  }
}

function requestPrompt() {
  if (paused.value || phase.value !== 'playing') {
    return
  }

  promptCount.value += 1

  if (selectedItemId.value) {
    hintedSlotId.value = selectedItemId.value
    helperMessage.value = `${selectedItemLabel.value}应该去发光提示的位置。`
  } else {
    helperMessage.value = '先从还没摆好的餐具里选一件。'
  }

  props.audio.speak(helperMessage.value)
}

function finishRound() {
  phase.value = 'celebrating'
  showBadge.value = true
  helperMessage.value = '桌面已经摆整齐啦。'
  props.audio.stopAmbient()

  void Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('桌面已经摆好了。')),
  ])

  celebrationTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 850)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const completedItems = Object.values(placedMap.value).filter((item): item is TableSlot => Boolean(item))

  return {
    performanceData: {
      event: 'game_complete',
      target_place_count: targetSlots.value.length,
      completed_places: completedItems.length,
      wrong_placements: wrongPlacements.value,
      prompt_count: promptCount.value,
      highest_prompt_level: clampNumber(promptCount.value, 0, 3),
      is_auto_completed: false,
      placed_item_labels: completedItems.map((item) => item.label),
      anchor_labels: targetSlots.value.map((slot) => slot.anchorLabel),
      average_placement_ms: averagePlacementMs.value,
      placement_times_ms: [...placementTimes.value],
      session_theme: sessionTheme.value.id,
      session_theme_title: sessionTheme.value.title,
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

.set-table-game {
  --prototype-background: linear-gradient(135deg, #ffd9a1 0%, #ffc4a6 45%, #9dd7c9 100%);
  --prototype-progress: linear-gradient(135deg, #f97316 0%, #14b8a6 100%);
}

.set-table-game__glow {
  background: rgba(253, 186, 116, 0.32);
}

.set-table-game__glow--alt {
  background: rgba(157, 215, 201, 0.28);
}

.set-table-game__intro {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
  gap: 26px;
  align-items: start;
  min-height: 100%;
}

.set-table-game__stage-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 18px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.52);
}

.set-table-game__section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.set-table-game__section-head strong {
  display: block;
  color: #17304d;
  font-size: 1.08rem;
}

.set-table-game__section-head--compact small {
  max-width: 280px;
}

.set-table-game__section-head small,
.set-table-game__stage-note {
  line-height: 1.6;
  color: rgba(23, 48, 77, 0.72);
}

.set-table-game__section-kicker {
  display: block;
  margin-bottom: 6px;
  color: rgba(23, 48, 77, 0.64);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.set-table-game__stage-scene {
  position: relative;
  min-height: 320px;
  aspect-ratio: 12 / 7;
  overflow: hidden;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 241, 228, 0.86) 100%);
}

.set-table-game__stage-scene--intro,
.set-table-game__complete-scene {
  min-height: 340px;
}

.set-table-game__preview-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.set-table-game__preview-step {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 20px;
  color: #17304d;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.78) 100%);
  box-shadow: 0 14px 26px rgba(33, 53, 71, 0.1);
}

.set-table-game__preview-step span {
  font-size: 1.3rem;
}

.set-table-game__intro-copy {
  align-self: center;
}

.set-table-game__intro-copy h2 {
  margin: 0 0 12px;
  font-size: 2rem;
  line-height: 1.2;
}

.set-table-game__intro-copy p {
  margin: 0;
  line-height: 1.76;
}

.set-table-game__play {
  display: grid;
  gap: 18px;
}

.set-table-game__stage-note {
  margin: 0;
}

.set-table-game__items {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.set-table-game__item-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 144px;
  padding: 18px;
  border: 0;
  border-radius: 22px;
  cursor: pointer;
  text-align: left;
  background: rgba(255, 255, 255, 0.78);
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.set-table-game__item-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(33, 53, 71, 0.12);
}

.set-table-game__item-card:disabled {
  cursor: not-allowed;
  opacity: 0.54;
}

.set-table-game__item-card.is-selected {
  outline: 3px solid rgba(249, 115, 22, 0.26);
}

.set-table-game__item-card.is-done {
  background: rgba(187, 247, 208, 0.78);
}

.set-table-game__item-card span {
  font-size: 1.8rem;
}

.set-table-game__complete {
  display: grid;
  gap: 18px;
  align-items: start;
  min-height: 100%;
}

.set-table-game__complete-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 24px 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.74);
  text-align: center;
}

.set-table-game__complete-card span {
  font-size: 2rem;
}

@media (max-width: 1080px) {
  .set-table-game__intro {
    grid-template-columns: minmax(0, 1fr);
  }

  .set-table-game__preview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .set-table-game__items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .set-table-game__section-head {
    flex-direction: column;
  }

  .set-table-game__stage-scene {
    min-height: 280px;
  }

  .set-table-game__preview-strip,
  .set-table-game__items {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
