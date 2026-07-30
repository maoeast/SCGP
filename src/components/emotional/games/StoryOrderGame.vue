<template>
  <div class="story-order-game" :style="themeStyle">
    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.shortLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>本局轮次</span>
        <strong>{{ roundLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>答对</span>
        <strong>{{ correctCount }}</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ statusLabel }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <!-- timeline slots (ordered) -->
        <div class="timeline">
          <div
            v-for="(slot, i) in timelineSlots"
            :key="'slot-' + i"
            class="timeline-slot"
            :class="{
              'is-filled': slot !== null,
              'is-active': i === nextSlotIndex,
            }"
          >
            <div v-if="slot !== null" class="slot-card">
              <div class="slot-order">{{ i + 1 }}</div>
              <div class="slot-icon" v-html="sceneSvg(slot)"></div>
              <span class="slot-label">{{ sceneLabel(slot) }}</span>
            </div>
            <div v-else class="slot-empty">
              <span>{{ i + 1 }}</span>
            </div>
          </div>
        </div>

        <!-- shuffled cards to pick from -->
        <div class="card-pool">
          <button
            v-for="card in remainingCards"
            :key="card.id"
            type="button"
            class="story-card"
            :disabled="phase === 'result'"
            @click="pickCard(card.id)"
          >
            <div class="card-icon" v-html="sceneSvg(card)"></div>
            <span class="card-label">{{ sceneLabel(card) }}</span>
          </button>
        </div>

        <!-- result feedback -->
        <div v-if="phase === 'result'" class="result-area">
          <p class="result-text">{{ lastCorrect ? '✅ 顺序完全正确！' : '❌ 顺序不对，看看正确答案' }}</p>
          <button type="button" class="next-btn" @click="nextRound">
            {{ hasMoreRounds ? '下一题' : '完成训练' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type {
  EmotionGameDifficulty,
  EmotionGameCompletionPayload,
  EmotionGameAudioController,
} from '@/types/emotional/games'

interface SceneDef {
  id: number
  label: string
  svgKey: string
}

interface StorySet {
  scenes: SceneDef[]
}

interface DifficultyConfig {
  cardCount: number
  shortLabel: string
}

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  settings: Record<string, any>
  paused: boolean
  markRoundDirty: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

// ---- story sets ----
const STORY_SETS: StorySet[] = [
  {
    // 种子→发芽→开花
    scenes: [
      { id: 0, label: '种子', svgKey: 'seed' },
      { id: 1, label: '发芽', svgKey: 'sprout' },
      { id: 2, label: '开花', svgKey: 'bloom' },
    ],
  },
  {
    // 打蛋→搅拌→入锅→煎熟
    scenes: [
      { id: 0, label: '打蛋', svgKey: 'egg' },
      { id: 1, label: '搅拌', svgKey: 'mix' },
      { id: 2, label: '入锅', svgKey: 'pan' },
      { id: 3, label: '煎熟', svgKey: 'cook' },
    ],
  },
  {
    // 下雨→打伞→水坑→彩虹
    scenes: [
      { id: 0, label: '下雨', svgKey: 'rain' },
      { id: 1, label: '打伞', svgKey: 'umbrella' },
      { id: 2, label: '水坑', svgKey: 'puddle' },
      { id: 3, label: '彩虹', svgKey: 'rainbow' },
    ],
  },
  {
    // 起床→刷牙→吃早餐→上学
    scenes: [
      { id: 0, label: '起床', svgKey: 'wake' },
      { id: 1, label: '刷牙', svgKey: 'brush' },
      { id: 2, label: '早餐', svgKey: 'breakfast' },
      { id: 3, label: '上学', svgKey: 'school' },
    ],
  },
  {
    // 拿纸→折叠→画图→完成
    scenes: [
      { id: 0, label: '拿纸', svgKey: 'paper' },
      { id: 1, label: '对折', svgKey: 'fold' },
      { id: 2, label: '画画', svgKey: 'draw' },
      { id: 3, label: '完成', svgKey: 'done' },
    ],
  },
]

const DIFFICULTY_LEVELS: Record<number, DifficultyConfig> = {
  1: { cardCount: 3, shortLabel: 'L1' },
  2: { cardCount: 4, shortLabel: 'L2' },
  3: { cardCount: 5, shortLabel: 'L3' },
}

const TOTAL_ROUNDS = 5

// ---- state ----
const phase = ref<'select' | 'result'>('select')
const round = ref(0)
const correctCount = ref(0)
const currentStory = ref<StorySet | null>(null)
const remainingCards = ref<SceneDef[]>([])
const timelineSlots = ref<(SceneDef | null)[]>([])
const nextSlotIndex = ref(0)
const lastCorrect = ref(false)

const difficultyConfig = computed<DifficultyConfig>(() => {
  return DIFFICULTY_LEVELS[props.difficulty] ?? DIFFICULTY_LEVELS[1]!
})

const roundLabel = computed(() => `${round.value + 1} / ${TOTAL_ROUNDS}`)
const hasMoreRounds = computed(() => round.value < TOTAL_ROUNDS - 1)

const statusLabel = computed(() => {
  if (phase.value === 'select') return '排一排'
  return '结果'
})

const stageMessage = computed(() => {
  if (phase.value === 'select') return '按先发生的顺序排好这些卡片！'
  return ''
})

const statusTone = computed(() => (phase.value === 'select' ? 'action' : 'neutral'))

const themeStyle = computed(() => ({
  '--theme-color': '#13c2c2',
}))

// ---- SVG scenes ----
function sceneSvg(scene: SceneDef): string {
  const map: Record<string, string> = {
    seed: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="55" rx="16" ry="6" fill="#8c6b4a"/><ellipse cx="40" cy="52" rx="5" ry="8" fill="#d48806"/></svg>`,
    sprout: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="55" rx="16" ry="6" fill="#8c6b4a"/><line x1="40" y1="52" x2="40" y2="28" stroke="#52c41a" stroke-width="3"/><ellipse cx="40" cy="24" rx="8" ry="6" fill="#73d13d"/><ellipse cx="32" cy="28" rx="6" ry="5" fill="#95de64"/></svg>`,
    bloom: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="55" rx="16" ry="6" fill="#8c6b4a"/><line x1="40" y1="52" x2="40" y2="18" stroke="#52c41a" stroke-width="3"/><circle cx="40" cy="16" r="10" fill="#ff85c0"/><circle cx="40" cy="16" r="5" fill="#fadb14"/></svg>`,
    egg: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="16" ry="20" fill="#fff5e6" stroke="#d48806" stroke-width="1.5"/><circle cx="40" cy="38" r="8" fill="#fadb14" opacity="0.6"/></svg>`,
    mix: `<svg viewBox="0 0 80 80"><path d="M28 50 L28 30 Q40 20 52 30 L52 50Z" fill="#e8e8e8" stroke="#999" stroke-width="2"/><line x1="40" y1="20" x2="40" y2="56" stroke="#999" stroke-width="2"/><ellipse cx="40" cy="24" rx="14" ry="6" fill="#fadb14"/></svg>`,
    pan: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="42" rx="24" ry="8" fill="#595959"/><ellipse cx="40" cy="40" rx="22" ry="7" fill="#ffd666"/><line x1="62" y1="42" x2="74" y2="42" stroke="#595959" stroke-width="4" stroke-linecap="round"/></svg>`,
    cook: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="42" rx="24" ry="8" fill="#595959"/><ellipse cx="40" cy="38" rx="20" ry="14" fill="#ffc069"/><ellipse cx="40" cy="38" rx="12" ry="9" fill="#fffbe6"/></svg>`,
    rain: `<svg viewBox="0 0 80 80"><rect x="16" y="16" width="48" height="24" rx="12" fill="#bae7ff"/><rect x="28" y="8" width="24" height="14" rx="7" fill="#91d5ff"/><line x1="26" y1="44" x2="22" y2="60" stroke="#69c0ff" stroke-width="2"/><line x1="40" y1="44" x2="40" y2="62" stroke="#69c0ff" stroke-width="2"/><line x1="54" y1="44" x2="58" y2="60" stroke="#69c0ff" stroke-width="2"/></svg>`,
    umbrella: `<svg viewBox="0 0 80 80"><path d="M16 36 Q40 16 64 36" stroke="#ff4d4f" stroke-width="3" fill="none"/><path d="M16 36 Q40 15 64 36Z" fill="#ff4d4f" opacity="0.5"/><line x1="40" y1="36" x2="40" y2="68" stroke="#8c6b4a" stroke-width="3"/><path d="M34 64 Q40 68 46 64" stroke="#8c6b4a" stroke-width="2" fill="none"/></svg>`,
    puddle: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="48" rx="22" ry="10" fill="#69c0ff"/><ellipse cx="36" cy="46" rx="8" ry="4" fill="#bae7ff"/></svg>`,
    rainbow: `<svg viewBox="0 0 80 80"><path d="M10 56 Q40 8 70 56" stroke="#ff4d4f" stroke-width="4" fill="none"/><path d="M14 58 Q40 14 66 58" stroke="#fadb14" stroke-width="4" fill="none"/><path d="M18 60 Q40 20 62 60" stroke="#52c41a" stroke-width="4" fill="none"/><path d="M22 62 Q40 26 58 62" stroke="#1890ff" stroke-width="4" fill="none"/></svg>`,
    wake: `<svg viewBox="0 0 80 80"><rect x="16" y="32" width="48" height="32" rx="4" fill="#ffc069"/><rect x="24" y="24" width="32" height="14" rx="7" fill="#ffd666"/><circle cx="48" cy="38" r="8" fill="#fff5e6"/></svg>`,
    brush: `<svg viewBox="0 0 80 80"><rect x="20" y="24" width="8" height="36" rx="4" fill="#69c0ff"/><rect x="28" y="20" width="24" height="10" rx="3" fill="#91d5ff"/><line x1="32" y1="26" x2="48" y2="26" stroke="#fff" stroke-width="2"/><line x1="32" y1="30" x2="46" y2="30" stroke="#fff" stroke-width="2"/></svg>`,
    breakfast: `<svg viewBox="0 0 80 80"><rect x="18" y="28" width="44" height="28" rx="6" fill="#fff5e6" stroke="#d48806" stroke-width="1.5"/><ellipse cx="40" cy="40" rx="14" ry="10" fill="#fadb14"/></svg>`,
    school: `<svg viewBox="0 0 80 80"><polygon points="40,12 8,46 72,46" fill="#ffc069"/><rect x="12" y="46" width="56" height="24" fill="#fff5e6" stroke="#d48806" stroke-width="1"/><rect x="32" y="52" width="16" height="18" rx="2" fill="#d48806"/></svg>`,
    paper: `<svg viewBox="0 0 80 80"><rect x="20" y="16" width="40" height="52" rx="2" fill="#fff" stroke="#bbb" stroke-width="1.5"/><line x1="28" y1="28" x2="52" y2="28" stroke="#ddd" stroke-width="2"/><line x1="28" y1="36" x2="48" y2="36" stroke="#ddd" stroke-width="2"/><line x1="28" y1="44" x2="50" y2="44" stroke="#ddd" stroke-width="2"/></svg>`,
    fold: `<svg viewBox="0 0 80 80"><polygon points="20,16 60,16 40,68" fill="#fff" stroke="#bbb" stroke-width="1.5"/><line x1="40" y1="16" x2="40" y2="68" stroke="#ddd" stroke-width="1" stroke-dasharray="3 3"/></svg>`,
    draw: `<svg viewBox="0 0 80 80"><polygon points="20,16 60,16 40,68" fill="#fff" stroke="#bbb" stroke-width="1.5"/><circle cx="38" cy="34" r="6" fill="#ff85c0"/><polygon points="42,52 38,62 46,62" fill="#52c41a"/><line x1="40" y1="16" x2="40" y2="68" stroke="#ddd" stroke-width="1" stroke-dasharray="3 3"/></svg>`,
    done: `<svg viewBox="0 0 80 80"><polygon points="20,16 60,16 40,68" fill="#fff" stroke="#bbb" stroke-width="1.5"/><circle cx="40" cy="30" r="8" fill="#fadb14"/><circle cx="30" cy="50" r="5" fill="#ff85c0"/><circle cx="50" cy="50" r="5" fill="#52c41a"/></svg>`,
  }
  return map[scene.svgKey] || map.seed!
}

function sceneLabel(scene: SceneDef): string {
  return scene.label
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

function setupRound() {
  const cfg = difficultyConfig.value

  // pick a story set, truncate to cardCount
  const pool = STORY_SETS.filter((s) => s.scenes.length >= cfg.cardCount)
  const story = pool[Math.floor(Math.random() * pool.length)] || STORY_SETS[0]!
  const scenes = story.scenes.slice(0, cfg.cardCount)

  currentStory.value = { scenes }
  remainingCards.value = shuffle(scenes)
  timelineSlots.value = new Array(cfg.cardCount).fill(null)
  nextSlotIndex.value = 0
  lastCorrect.value = false
  phase.value = 'select'
}

function pickCard(id: number) {
  if (phase.value !== 'select') return
  const idx = remainingCards.value.findIndex((c) => c.id === id)
  if (idx === -1) return

  const [picked] = remainingCards.value.splice(idx, 1)
  if (!picked) return

  // check if correct for this slot
  if (picked.id === nextSlotIndex.value) {
    timelineSlots.value[nextSlotIndex.value] = picked
    nextSlotIndex.value++

    if (nextSlotIndex.value >= timelineSlots.value.length) {
      // all correct!
      correctCount.value++
      lastCorrect.value = true
      phase.value = 'result'
    }
  } else {
    // wrong! show result with wrong state
    timelineSlots.value[nextSlotIndex.value] = picked
    lastCorrect.value = false
    phase.value = 'result'
  }
}

function nextRound() {
  if (round.value < TOTAL_ROUNDS - 1) {
    round.value++
    props.markRoundDirty()
    setupRound()
  } else {
    completeGame()
  }
}

function completeGame() {
  const accuracy = correctCount.value / TOTAL_ROUNDS

  emit('complete', {
    completionStatus: accuracy >= 0.6 ? 'completed' : 'aborted',
    performanceData: {
      totalRounds: TOTAL_ROUNDS,
      correctCount: correctCount.value,
      accuracyRate: Math.round(accuracy * 100) / 100,
      difficultyLevel: props.difficulty,
      actual_params: {
        session_type: 'K10_STORY_ORDER',
        difficulty_level: props.difficulty,
        card_count: difficultyConfig.value.cardCount,
      },
    },
  })
}

onMounted(() => {
  setupRound()
})

watch(
  () => props.paused,
  () => {
    // no active timers to pause in this game
  },
)

onUnmounted(() => {
  // cleanup
})
</script>

<style scoped>
.story-order-game {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  gap: 16px;
}

.hud-panel {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.hud-card {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 12px 24px;
  text-align: center;
  min-width: 100px;
}

.hud-card span {
  display: block;
  font-size: 16px;
  color: #888;
}

.hud-card strong {
  font-size: 24px;
  color: var(--theme-color);
}

.stage-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12px;
}

.stage-panel {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.status-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 28px;
  border-radius: 24px;
  background: #f0f0f0;
}

.status-strip[data-tone='action'] {
  background: #fff7e6;
  color: #fa8c16;
}

.status-strip span {
  font-size: 16px;
  opacity: 0.8;
}

.status-strip strong {
  font-size: 18px;
}

.timeline {
  display: flex;
  gap: 16px;
  align-items: center;
  position: relative;
  padding: 6px 0;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 30px;
  right: 30px;
  height: 4px;
  background: #e0e0e0;
  z-index: 0;
}

.timeline-slot {
  width: 140px;
  height: 170px;
  border-radius: 16px;
  border: 3px dashed #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  background: #fafafa;
  transition: all 0.2s;
}

.timeline-slot.is-active {
  border-color: var(--theme-color);
  box-shadow: 0 0 12px rgba(19, 194, 194, 0.3);
}

.timeline-slot.is-filled {
  border-style: solid;
  background: #fff;
  border-color: var(--theme-color);
}

.slot-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.slot-order {
  font-size: 14px;
  font-weight: bold;
  color: var(--theme-color);
}

.slot-icon {
  width: 64px;
  height: 64px;
}

.slot-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.slot-label {
  font-size: 15px;
  color: #555;
}

.slot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #ccc;
}

.card-pool {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.story-card {
  width: 140px;
  height: 170px;
  border-radius: 16px;
  border: 3px solid #e0e0e0;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
}

.story-card:hover:not(:disabled) {
  border-color: var(--theme-color);
  box-shadow: 0 6px 20px rgba(19, 194, 194, 0.2);
  transform: translateY(-3px);
}

.story-card:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.card-icon {
  width: 64px;
  height: 64px;
}

.card-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.card-label {
  font-size: 16px;
  color: #555;
  font-weight: 500;
}

.result-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.result-text {
  font-size: 22px;
  color: #333;
  text-align: center;
  margin: 0;
}

.next-btn {
  padding: 14px 48px;
  border: none;
  border-radius: 28px;
  background: var(--theme-color);
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.next-btn:hover {
  filter: brightness(1.1);
}
</style>
