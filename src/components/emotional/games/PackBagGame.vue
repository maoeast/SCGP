<template>
  <div class="pack-game" :class="{ 'is-paused': props.paused }">
    <header class="pack-game__topbar">
      <div class="pack-game__step-indicator">
        <span class="pack-game__step-emoji">{{ currentItem?.emoji ?? '🎒' }}</span>
        <div class="pack-game__step-text">
          <strong>{{ topbarStepLabel }}</strong>
          <small>第 {{ itemIndex + 1 }} / {{ requiredItems.length }} 件</small>
        </div>
      </div>
      <div class="pack-game__progress-segments">
        <span
          v-for="(item, index) in requiredItems"
          :key="item.id"
          class="pack-game__segment"
          :class="{
            'is-done': index < itemIndex,
            'is-current': index === itemIndex,
          }"
        />
      </div>
    </header>

    <!-- 情境提示条 -->
    <div v-if="currentScenario" class="pack-game__scenario">
      <span class="pack-game__scenario-emoji">{{ currentScenario.emoji }}</span>
      <div>
        <strong>{{ currentScenario.title }}</strong>
        <p>{{ currentScenario.description }}</p>
      </div>
    </div>

    <div class="pack-game__stage">
      <!-- 主展示区：当前要装的物品贴纸 -->
      <div v-if="currentItem" class="pack-game__item-display" :class="{ 'is-demonstrating': phase === 'demo' }">
        <img class="pack-game__item-img" :src="itemImageSrc(currentItem)" :alt="currentItem.label" draggable="false" />
        <!-- 书包（已装物品展示） -->
        <div class="pack-game__bag">
          <div class="pack-game__bag-emoji">🎒</div>
          <div class="pack-game__packed-list">
            <span v-for="id in packedItemIds" :key="id" class="pack-game__packed-chip">
              {{ itemEmoji(id) }}
            </span>
            <span v-if="packedItemIds.length === 0" class="pack-game__packed-empty">书包还是空的</span>
          </div>
        </div>
      </div>

      <button
        v-if="phase === 'awaiting'"
        type="button"
        class="pack-game__tap-zone"
        :disabled="props.paused"
        :aria-label="`把${currentItem?.label}装进书包`"
        @click="onChildTap"
      >
        <span class="pack-game__tap-pulse">🎒</span>
        <span class="pack-game__tap-label">点这里装进书包</span>
      </button>

      <div v-if="phase === 'demo'" class="pack-game__demo-hint">
        <span>👀 这个要带吗？</span>
      </div>

      <div class="pack-game__instruction">
        <p>{{ currentInstruction }}</p>
      </div>
    </div>

    <footer class="pack-game__footer">
      <button
        v-if="phase === 'ready'"
        type="button"
        class="pack-game__btn pack-game__btn--primary pack-game__btn--lg"
        @click="startGame"
      >
        <span>🎒</span> 开始整理书包
      </button>

      <template v-else-if="phase !== 'celebrating'">
        <button
          type="button"
          class="pack-game__btn pack-game__btn--secondary"
          :disabled="props.paused"
          @click="replayDemo"
        >
          🔁 再看一遍
        </button>
        <button
          type="button"
          class="pack-game__btn pack-game__btn--ghost"
          :disabled="props.paused"
          @click="resetRound"
        >
          🔄 重新开始
        </button>
      </template>

      <button
        v-else
        type="button"
        class="pack-game__btn pack-game__btn--ghost"
        @click="resetRound"
      >
        🔄 再装一遍
      </button>
    </footer>

    <transition name="pack-celebrate">
      <div v-if="phase === 'celebrating'" class="pack-game__celebrate">
        <div class="pack-game__celebrate-card">
          <div class="pack-game__celebrate-icon">🎒</div>
          <strong>书包整理好啦！</strong>
          <p>该带的东西都装好啦。</p>
        </div>
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

/**
 * 上学包包装一装（看-做-反馈 三段式）
 * 系统按情境依次展示"该带的物品"：看这件要不要带 → 点一下装进书包 → 正反馈。
 * 与其他 4 游戏不同：这里步骤是情境推理（判断该带什么），系统只呈现该带的，
 * 不需要孩子从一堆里挑——降低认知负荷，聚焦"认识出门该带什么"。
 */

type Phase = 'ready' | 'demo' | 'awaiting' | 'celebrating' | 'finished'

interface ItemDef {
  id: string
  label: string
  emoji: string
  imageKey: string
  imagePool: 'self-care' | 'cognitive'
}

interface ScenarioDef {
  id: string
  title: string
  emoji: string
  description: string
  requiredItemIds: string[]
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

const ITEMS: Record<string, ItemDef> = {
  book: { id: 'book', label: '图画书', emoji: '📚', imageKey: 'book', imagePool: 'cognitive' },
  notebook: { id: 'notebook', label: '练习本', emoji: '📓', imageKey: 'notebook', imagePool: 'self-care' },
  'water-bottle': { id: 'water-bottle', label: '水壶', emoji: '🧃', imageKey: 'water-bottle', imagePool: 'self-care' },
  tissue: { id: 'tissue', label: '纸巾', emoji: '🧻', imageKey: 'tissue', imagePool: 'self-care' },
  umbrella: { id: 'umbrella', label: '雨伞', emoji: '☔', imageKey: 'umbrella', imagePool: 'self-care' },
  towel: { id: 'towel', label: '毛巾', emoji: '🧺', imageKey: 'towel', imagePool: 'self-care' },
  cap: { id: 'cap', label: '帽子', emoji: '🧢', imageKey: 'cap', imagePool: 'self-care' },
  sneakers: { id: 'sneakers', label: '运动鞋', emoji: '👟', imageKey: 'sneakers', imagePool: 'self-care' },
}

const SCENARIOS: Record<EmotionGameDifficulty, ScenarioDef[]> = {
  1: [
    {
      id: 'school-basic',
      title: '今天去上学',
      emoji: '🏫',
      description: '带上最基本的学习用品和喝水用具。',
      requiredItemIds: ['book', 'notebook', 'water-bottle'],
    },
  ],
  2: [
    {
      id: 'school-rainy',
      title: '外面在下雨',
      emoji: '🌧️',
      description: '要去学校，外面下雨，记得带雨伞。',
      requiredItemIds: ['book', 'water-bottle', 'umbrella', 'tissue'],
    },
    {
      id: 'reading-day',
      title: '今天有阅读活动',
      emoji: '📖',
      description: '带上课外书、练习本和水壶。',
      requiredItemIds: ['book', 'notebook', 'water-bottle', 'tissue'],
    },
  ],
  3: [
    {
      id: 'sports-day',
      title: '今天去操场活动',
      emoji: '⚽',
      description: '带上运动要用的东西。',
      requiredItemIds: ['water-bottle', 'towel', 'sneakers', 'cap'],
    },
    {
      id: 'outdoor-class',
      title: '今天有户外课',
      emoji: '🌳',
      description: '户外活动要带好防护用品。',
      requiredItemIds: ['water-bottle', 'towel', 'cap', 'tissue'],
    },
  ],
}

const DEMO_MS: Record<EmotionGameDifficulty, number> = {
  1: 2200,
  2: 2000,
  3: 1800,
}

const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const currentScenario = ref<ScenarioDef | null>(null)
const itemIndex = ref(0)
const packedItemIds = ref<string[]>([])
const replayCount = ref(0)
const stepResponseMs = ref<number[]>([])

let roundStartedAt = 0
let stepStartedAt = 0
let demoTimer = 0

const demoMs = computed(() => DEMO_MS[activeDifficulty.value])
const requiredItems = computed<ItemDef[]>(() => {
  if (!currentScenario.value) return []
  return currentScenario.value.requiredItemIds
    .map((id) => ITEMS[id])
    .filter((item): item is ItemDef => Boolean(item))
})
const currentItem = computed<ItemDef | null>(() => requiredItems.value[itemIndex.value] ?? null)
const isRoundFinished = computed(() => phase.value === 'celebrating' || phase.value === 'finished')

const topbarStepLabel = computed(() => {
  if (phase.value === 'ready') return '准备好了吗？'
  if (isRoundFinished.value) return '整理完成！'
  return `装${currentItem.value?.label ?? ''}`
})

const currentInstruction = computed(() => {
  if (phase.value === 'ready') return '准备好了就点「开始整理书包」。'
  if (phase.value === 'demo') return `${currentScenario.value?.title ?? ''}，要带${currentItem.value?.label ?? ''}。`
  if (phase.value === 'awaiting') return `点一下，把${currentItem.value?.label ?? ''}装进书包。`
  if (isRoundFinished.value) return '书包整理好啦，该带的都带上了！'
  return ''
})

function itemImageSrc(item: ItemDef): string {
  const dir = item.imagePool === 'cognitive' ? 'cognitive/items' : 'self-care/items'
  return `resource://images/${dir}/${item.imageKey}.png`
}

function itemEmoji(id: string): string {
  return ITEMS[id]?.emoji ?? '📦'
}

function pickScenario(): ScenarioDef {
  const pool = SCENARIOS[activeDifficulty.value] ?? SCENARIOS[1]!
  return pool[Math.floor(Math.random() * pool.length)]!
}

function markDirtyOnce() {
  roundStartedAt = roundStartedAt || Date.now()
  props.markRoundDirty?.()
}

function startGame() {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  currentScenario.value = pickScenario()
  packedItemIds.value = []
  itemIndex.value = 0
  replayCount.value = 0
  stepResponseMs.value = []
  enterDemo()

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {})
}

function resetRound() {
  window.clearTimeout(demoTimer)
  phase.value = 'ready'
  currentScenario.value = null
  itemIndex.value = 0
  packedItemIds.value = []
  props.audio.stopAmbient()
}

function enterDemo() {
  phase.value = 'demo'
  stepStartedAt = Date.now()
  const cue = `${currentScenario.value?.title ?? ''}，记得带上${currentItem.value?.label ?? ''}。`
  props.audio.speak(cue)

  demoTimer = window.setTimeout(() => {
    phase.value = 'awaiting'
  }, demoMs.value)
}

function replayDemo() {
  if (phase.value !== 'awaiting') return
  replayCount.value += 1
  enterDemo()
}

function onChildTap() {
  if (phase.value !== 'awaiting' || props.paused) return

  const id = currentItem.value?.id
  if (!id) return

  if (stepStartedAt > 0) {
    stepResponseMs.value.push(Date.now() - stepStartedAt)
  }

  packedItemIds.value.push(id)

  props.audio.playSuccessCue().catch(() => {})
  props.audio.speak(`${currentItem.value?.label ?? ''}装好啦！`)

  itemIndex.value += 1
  if (itemIndex.value >= requiredItems.value.length) {
    finishRound()
    return
  }
  window.setTimeout(() => {
    enterDemo()
  }, 900)
}

function finishRound() {
  phase.value = 'celebrating'
  props.audio.stopAmbient()
  void Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('书包整理好啦，你可以安心出门啦！')),
  ])
  demoTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 1500)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const totalDurationSeconds = roundStartedAt > 0 ? Number(((Date.now() - roundStartedAt) / 1000).toFixed(1)) : 0
  const avgMs = stepResponseMs.value.length > 0
    ? Math.round(stepResponseMs.value.reduce((a, b) => a + b, 0) / stepResponseMs.value.length)
    : 0

  return {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'watch-do-feedback',
      required_item_count: requiredItems.value.length,
      packed_item_count: packedItemIds.value.length,
      packed_item_ids: [...packedItemIds.value],
      packed_item_labels: packedItemIds.value.map((id) => ITEMS[id]?.label ?? id),
      scenario_id: currentScenario.value?.id ?? '',
      scenario_title: currentScenario.value?.title ?? '',
      replay_count: replayCount.value,
      step_response_ms: [...stepResponseMs.value],
      average_step_ms: avgMs,
      total_duration_seconds: totalDurationSeconds,
      difficulty_level: activeDifficulty.value,
      is_auto_completed: false,
    },
  }
}

watch(
  () => props.difficulty,
  (difficulty) => {
    if (phase.value !== 'ready') return
    activeDifficulty.value = difficulty
  },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (isPaused) props.audio.stopAmbient()
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(demoTimer)
  props.audio.stopAll()
})
</script>

<style scoped>
.pack-game {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  padding: 16px;
  overflow: hidden;
  color: #213547;
  background: linear-gradient(160deg, #dbeafe 0%, #d1fae5 50%, #fef9c3 100%);
  font-family: inherit;
  user-select: none;
}

.pack-game.is-paused {
  filter: grayscale(0.4) brightness(0.95);
  pointer-events: none;
}

.pack-game__topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
  padding: 10px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(22, 42, 72, 0.08);
}

.pack-game__step-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pack-game__step-emoji {
  font-size: 2rem;
  line-height: 1;
}

.pack-game__step-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pack-game__step-text strong {
  font-size: 1.2rem;
}

.pack-game__step-text small {
  color: rgba(33, 53, 71, 0.6);
  font-size: 0.82rem;
}

.pack-game__progress-segments {
  display: flex;
  gap: 6px;
  flex: 1;
}

.pack-game__segment {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.12);
  transition: background 0.25s ease;
}

.pack-game__segment.is-current {
  background: linear-gradient(90deg, #3b82f6, #14b8a6);
  animation: pack-seg-pulse 1.4s ease-in-out infinite;
}

.pack-game__segment.is-done {
  background: #34d399;
}

@keyframes pack-seg-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

/* 情境提示 */
.pack-game__scenario {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding: 12px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.65);
  box-shadow: 0 4px 16px rgba(22, 42, 72, 0.06);
}

.pack-game__scenario-emoji {
  font-size: 2.2rem;
}

.pack-game__scenario strong {
  font-size: 1.15rem;
}

.pack-game__scenario p {
  margin: 2px 0 0;
  color: rgba(33, 53, 71, 0.7);
  font-size: 0.95rem;
}

.pack-game__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  overflow: hidden;
}

/* 物品 + 书包展示 */
.pack-game__item-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8%;
  position: relative;
}

.pack-game__item-img {
  width: 34%;
  max-width: 240px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 8px 20px rgba(22, 42, 72, 0.25));
  transition: transform 0.3s ease;
}

.pack-game__item-display.is-demonstrating .pack-game__item-img {
  animation: pack-demo-bob 1.6s ease-in-out infinite;
}

@keyframes pack-demo-bob {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-12px) rotate(3deg); }
}

/* 书包 */
.pack-game__bag {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pack-game__bag-emoji {
  font-size: 4rem;
  filter: drop-shadow(0 6px 16px rgba(22, 42, 72, 0.2));
}

.pack-game__packed-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  max-width: 180px;
}

.pack-game__packed-chip {
  font-size: 1.8rem;
  animation: pack-packed-in 0.4s ease-out;
}

@keyframes pack-packed-in {
  from { transform: scale(0) translateY(-20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.pack-game__packed-empty {
  color: rgba(33, 53, 71, 0.4);
  font-size: 0.9rem;
}

.pack-game__tap-zone {
  position: absolute;
  left: 50%;
  bottom: 14%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 32px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #3b82f6 0%, #14b8a6 100%);
  color: #fff;
  font: inherit;
  font-weight: 800;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.45);
  animation: pack-tap-pulse 1.2s ease-in-out infinite;
  transition: transform 0.15s ease;
}

.pack-game__tap-zone:hover:not(:disabled) {
  transform: translateX(-50%) scale(1.05);
}

.pack-game__tap-zone:active:not(:disabled) {
  transform: translateX(-50%) scale(0.96);
}

.pack-game__tap-zone:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pack-game__tap-pulse {
  font-size: 2rem;
  line-height: 1;
}

.pack-game__tap-label {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

@keyframes pack-tap-pulse {
  0%, 100% { box-shadow: 0 12px 32px rgba(59, 130, 246, 0.45); }
  50% { box-shadow: 0 12px 48px rgba(59, 130, 246, 0.7); }
}

.pack-game__demo-hint {
  position: absolute;
  left: 50%;
  bottom: 14%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 12px 24px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.85);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  pointer-events: none;
}

.pack-game__instruction {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  z-index: 15;
  max-width: 88%;
  padding: 10px 20px;
  border-radius: 999px;
  background: rgba(33, 53, 71, 0.88);
  color: #fff;
  text-align: center;
  box-shadow: 0 8px 24px rgba(22, 42, 72, 0.2);
  pointer-events: none;
}

.pack-game__instruction p {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.4;
}

.pack-game__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding-top: 8px;
}

.pack-game__btn {
  border: 0;
  border-radius: 999px;
  padding: 12px 22px;
  font: inherit;
  font-weight: 700;
  font-size: 1.02rem;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.pack-game__btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(33, 53, 71, 0.16);
}

.pack-game__btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pack-game__btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #3b82f6 0%, #14b8a6 100%);
}

.pack-game__btn--lg {
  padding: 16px 36px;
  font-size: 1.15rem;
}

.pack-game__btn--secondary {
  color: #1f3d5c;
  background: rgba(255, 255, 255, 0.9);
}

.pack-game__btn--ghost {
  color: #5f6f82;
  background: rgba(255, 255, 255, 0.6);
}

.pack-game__celebrate {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(22, 42, 72, 0.45);
  backdrop-filter: blur(4px);
}

.pack-game__celebrate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 40px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(22, 42, 72, 0.3);
  text-align: center;
}

.pack-game__celebrate-icon {
  font-size: 3.5rem;
  animation: pack-bounce 0.8s ease;
}

.pack-game__celebrate-card strong {
  font-size: 1.5rem;
}

.pack-game__celebrate-card p {
  margin: 0;
  color: rgba(33, 53, 71, 0.7);
}

@keyframes pack-bounce {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.pack-celebrate-enter-active,
.pack-celebrate-leave-active {
  transition: opacity 0.3s ease;
}

.pack-celebrate-enter-from,
.pack-celebrate-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .pack-game {
    padding: 10px;
  }
  .pack-game__topbar {
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 12px;
  }
  .pack-game__step-emoji {
    font-size: 1.6rem;
  }
  .pack-game__step-text strong {
    font-size: 1.05rem;
  }
  .pack-game__progress-segments {
    width: 100%;
    order: 3;
  }
  .pack-game__scenario {
    padding: 10px 14px;
  }
  .pack-game__scenario-emoji {
    font-size: 1.8rem;
  }
  .pack-game__instruction {
    max-width: 92%;
    font-size: 0.92rem;
    padding: 8px 14px;
  }
  .pack-game__tap-zone {
    padding: 14px 24px;
    font-size: 1.05rem;
  }
  .pack-game__btn {
    padding: 10px 18px;
    font-size: 0.95rem;
  }
}
</style>
