<template>
  <div class="missing-item-game" :style="themeStyle">
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

        <!-- MEMORIZE phase -->
        <div v-if="phase === 'memorize'" class="items-display">
          <div class="items-row">
            <div
              v-for="item in displayItems"
              :key="item.id"
              class="item-card item-visible"
            >
              <div class="item-icon" v-html="itemSvg(item)"></div>
              <span class="item-label">{{ item.name }}</span>
            </div>
          </div>
          <div class="countdown-bar">
            <div
              class="countdown-fill"
              :style="{ width: countdownPercent + '%', backgroundColor: countdownColor }"
            ></div>
          </div>
        </div>

        <!-- REVEAL phase — remaining items visible, removed ones show empty slot -->
        <div v-else-if="phase === 'reveal'" class="items-display">
          <p class="phase-hint">记住它们，再看看…哪个不见了？</p>
          <div class="items-row">
            <div
              v-for="item in displayItems"
              :key="item.id"
              class="item-card"
              :class="{ 'item-kept': !removedIds.has(item.id), 'item-removed': removedIds.has(item.id) }"
            >
              <template v-if="removedIds.has(item.id)">
                <div class="item-gone">
                  <svg viewBox="0 0 80 80" class="gone-svg">
                    <rect x="8" y="8" width="64" height="64" rx="12" fill="#f5f5f5" stroke="#e0e0e0" stroke-width="3" stroke-dasharray="6 4" />
                    <text x="40" y="52" text-anchor="middle" font-size="36" fill="#ccc">?</text>
                  </svg>
                </div>
              </template>
              <template v-else>
                <div class="item-icon" v-html="itemSvg(item)"></div>
                <span class="item-label">{{ item.name }}</span>
              </template>
            </div>
          </div>
        </div>

        <!-- SELECT phase -->
        <div v-else-if="phase === 'select'" class="candidates-area">
          <p class="prompt-text">哪个不见了？选出不见了的那个！</p>
          <div class="candidates-row">
            <button
              v-for="candidate in candidates"
              :key="candidate.id"
              type="button"
              class="candidate-btn"
              :class="{ 'is-selected': selectedId === candidate.id }"
              :disabled="selectedId !== null"
              @click="onSelect(candidate.id)"
            >
              <div class="item-icon" v-html="candidateSvg(candidate)"></div>
              <span class="item-label">{{ candidate.name }}</span>
            </button>
          </div>
        </div>

        <!-- RESULT phase -->
        <div v-else-if="phase === 'result'" class="result-area">
          <div class="result-icon">{{ lastCorrect ? '✅' : '❌' }}</div>
          <p class="result-text">
            {{ lastCorrect ? '答对了！真棒！' : '再想想～' }}
            <template v-if="!lastCorrect && lastMissingItem">
              不见的是 <strong>{{ lastMissingItem.name }}</strong>
            </template>
          </p>
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

interface ItemDef {
  id: string
  name: string
  svgKey: string
}

interface DifficultyConfig {
  displayCount: number
  memoriseMs: number
  removeCount: number
  candidateCount: number
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

// ---- SVG icons ----
const SVG_MAP: Record<string, string> = {
  apple: `<svg viewBox="0 0 80 80"><circle cx="40" cy="45" r="24" fill="#ff4d4f"/><path d="M40 21 Q40 8 50 10" stroke="#52c41a" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="48" cy="8" rx="8" ry="5" fill="#52c41a" transform="rotate(-20 48 8)"/></svg>`,
  banana: `<svg viewBox="0 0 80 80"><path d="M40 12 Q55 10 60 35 Q65 60 35 70 Q10 65 15 40 Q20 15 40 12Z" fill="#fadb14"/><path d="M40 12 Q42 15 40 18" stroke="#d48806" stroke-width="1.5" fill="none"/></svg>`,
  cat: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="48" rx="22" ry="18" fill="#ffc069"/><circle cx="40" cy="44" rx="14" ry="12" fill="#fff5e6"/><circle cx="33" cy="42" r="3" fill="#333"/><circle cx="47" cy="42" r="3" fill="#333"/><ellipse cx="40" cy="48" rx="2" ry="1.5" fill="#ff85c0"/><path d="M33 56 Q40 60 47 56" stroke="#333" stroke-width="1.5" fill="none"/><polygon points="24,30 18,18 32,28" fill="#ffc069"/><polygon points="56,30 62,18 48,28" fill="#ffc069"/></svg>`,
  dog: `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="46" rx="20" ry="16" fill="#d48806"/><ellipse cx="40" cy="42" rx="12" ry="10" fill="#fffbe6"/><circle cx="34" cy="40" r="2.5" fill="#333"/><circle cx="46" cy="40" r="2.5" fill="#333"/><circle cx="40" cy="44" r="3" fill="#333"/><path d="M32 54 Q40 56 48 54" stroke="#333" stroke-width="1.5" fill="none"/><ellipse cx="22" cy="26" rx="8" ry="10" fill="#d48806" transform="rotate(-15 22 26)"/><ellipse cx="58" cy="26" rx="8" ry="10" fill="#d48806" transform="rotate(15 58 26)"/></svg>`,
  star: `<svg viewBox="0 0 80 80"><polygon points="40,10 48,32 72,32 53,46 60,68 40,54 20,68 27,46 8,32 32,32" fill="#fadb14" stroke="#fa8c16" stroke-width="2"/></svg>`,
  ball: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="28" fill="#ff4d4f"/><path d="M16 22 Q40 32 64 22" stroke="#fff" stroke-width="3" fill="none"/><path d="M16 58 Q40 48 64 58" stroke="#fff" stroke-width="3" fill="none"/><circle cx="40" cy="40" r="28" fill="none" stroke="#d9363e" stroke-width="2"/></svg>`,
  cup: `<svg viewBox="0 0 80 80"><path d="M20 30 L25 68 Q27 72 40 72 Q53 72 55 68 L60 30Z" fill="#69c0ff"/><path d="M58 30 Q70 30 72 42 Q74 54 62 54 L60 54" stroke="#69c0ff" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="30" rx="20" ry="5" fill="#91d5ff"/></svg>`,
  book: `<svg viewBox="0 0 80 80"><rect x="18" y="16" width="36" height="50" rx="3" fill="#1890ff"/><rect x="24" y="22" width="24" height="4" rx="2" fill="#fff" opacity="0.5"/><rect x="24" y="30" width="20" height="3" rx="1.5" fill="#fff" opacity="0.4"/><rect x="24" y="37" width="22" height="3" rx="1.5" fill="#fff" opacity="0.4"/><rect x="24" y="44" width="16" height="3" rx="1.5" fill="#fff" opacity="0.3"/><rect x="52" y="16" width="10" height="50" rx="2" fill="#096dd9"/><line x1="57" y1="16" x2="57" y2="66" stroke="#fff" stroke-width="1" opacity="0.3"/></svg>`,
  flower: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="10" fill="#fadb14"/><ellipse cx="40" cy="26" rx="8" ry="12" fill="#ff85c0" transform="rotate(0 40 40)"/><ellipse cx="40" cy="26" rx="8" ry="12" fill="#ff85c0" transform="rotate(72 40 40)"/><ellipse cx="40" cy="26" rx="8" ry="12" fill="#ff85c0" transform="rotate(144 40 40)"/><ellipse cx="40" cy="26" rx="8" ry="12" fill="#ff85c0" transform="rotate(216 40 40)"/><ellipse cx="40" cy="26" rx="8" ry="12" fill="#ff85c0" transform="rotate(288 40 40)"/><rect x="38" y="50" width="4" height="22" rx="2" fill="#52c41a"/></svg>`,
  car: `<svg viewBox="0 0 80 80"><rect x="12" y="32" width="56" height="22" rx="6" fill="#ff4d4f"/><rect x="20" y="22" width="30" height="14" rx="5" fill="#ff4d4f"/><rect x="22" y="24" width="10" height="10" rx="2" fill="#87e8de"/><rect x="34" y="24" width="10" height="10" rx="2" fill="#87e8de"/><circle cx="26" cy="58" r="8" fill="#333"/><circle cx="26" cy="58" r="4" fill="#888"/><circle cx="54" cy="58" r="8" fill="#333"/><circle cx="54" cy="58" r="4" fill="#888"/></svg>`,
  fish: `<svg viewBox="0 0 80 80"><ellipse cx="36" cy="40" rx="24" ry="14" fill="#69c0ff"/><polygon points="60,40 76,26 76,54" fill="#69c0ff"/><circle cx="24" cy="38" r="4" fill="#fff"/><circle cx="25" cy="38" r="2" fill="#333"/><ellipse cx="34" cy="44" rx="6" ry="2" fill="#1890ff" opacity="0.4"/></svg>`,
  house: `<svg viewBox="0 0 80 80"><polygon points="40,10 8,44 72,44" fill="#ffc069"/><rect x="14" y="44" width="52" height="28" fill="#fff5e6" stroke="#d48806" stroke-width="1.5"/><rect x="32" y="52" width="16" height="20" rx="2" fill="#d48806"/><rect x="24" y="50" width="8" height="8" fill="#87e8de" stroke="#d48806" stroke-width="0.5"/></svg>`,
}

const DEFAULT_ITEM: ItemDef = { id: 'apple', name: '苹果', svgKey: 'apple' }

const ITEM_POOL: ItemDef[] = [
  { id: 'apple', name: '苹果', svgKey: 'apple' },
  { id: 'banana', name: '香蕉', svgKey: 'banana' },
  { id: 'cat', name: '小猫', svgKey: 'cat' },
  { id: 'dog', name: '小狗', svgKey: 'dog' },
  { id: 'star', name: '星星', svgKey: 'star' },
  { id: 'ball', name: '皮球', svgKey: 'ball' },
  { id: 'cup', name: '杯子', svgKey: 'cup' },
  { id: 'book', name: '书本', svgKey: 'book' },
  { id: 'flower', name: '花朵', svgKey: 'flower' },
  { id: 'car', name: '小车', svgKey: 'car' },
  { id: 'fish', name: '小鱼', svgKey: 'fish' },
  { id: 'house', name: '房子', svgKey: 'house' },
]

const DIFFICULTY_LEVELS: Record<number, DifficultyConfig> = {
  1: { displayCount: 3, memoriseMs: 10000, removeCount: 1, candidateCount: 2, shortLabel: 'L1' },
  2: { displayCount: 4, memoriseMs: 8000, removeCount: 1, candidateCount: 3, shortLabel: 'L2' },
  3: { displayCount: 5, memoriseMs: 6000, removeCount: 2, candidateCount: 4, shortLabel: 'L3' },
}

const TOTAL_ROUNDS = 6

const phase = ref<'memorize' | 'reveal' | 'select' | 'result'>('memorize')
const round = ref(0)
const correctCount = ref(0)
const totalSelects = ref(0)
const displayItems = ref<ItemDef[]>([])
const removedIds = ref<Set<string>>(new Set())
const candidates = ref<ItemDef[]>([])
const selectedId = ref<string | null>(null)
const lastCorrect = ref(false)
const lastMissingItem = ref<ItemDef | null>(null)
const countdownPercent = ref(100)
const countdownColor = ref('#13c2c2')

let countdownTimer: ReturnType<typeof setInterval> | null = null
let phaseTimer: ReturnType<typeof setTimeout> | null = null

const difficultyConfig = computed<DifficultyConfig>(() => {
  return DIFFICULTY_LEVELS[props.difficulty] ?? DIFFICULTY_LEVELS[1]!
})
const roundLabel = computed(() => `${round.value + 1} / ${TOTAL_ROUNDS}`)
const hasMoreRounds = computed(() => round.value < TOTAL_ROUNDS - 1)

const statusLabel = computed(() => {
  if (phase.value === 'memorize') return '记忆阶段'
  if (phase.value === 'reveal') return '找一找'
  if (phase.value === 'select') return '选出来'
  return '结果'
})

const stageMessage = computed(() => {
  if (phase.value === 'memorize') return '仔细看，记住它们！'
  if (phase.value === 'reveal') return '看看哪个不见了？'
  if (phase.value === 'select') return '选出不见了的那一个！'
  return ''
})

const statusTone = computed(() => {
  if (phase.value === 'memorize') return 'info'
  if (phase.value === 'reveal' || phase.value === 'select') return 'action'
  return 'neutral'
})

const themeStyle = computed(() => ({
  '--theme-color': '#13c2c2',
}))

function itemSvg(item: ItemDef): string {
  return SVG_MAP[item.svgKey] || SVG_MAP.apple!
}

function candidateSvg(item: ItemDef): string {
  return SVG_MAP[item.svgKey] || SVG_MAP.apple!
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
  const pool = shuffle(ITEM_POOL)
  displayItems.value = pool.slice(0, cfg.displayCount)
  removedIds.value = new Set()
  candidates.value = []
  selectedId.value = null
  lastCorrect.value = false
  lastMissingItem.value = null

  const shuffledDisplay = shuffle([...displayItems.value])
  const toRemove = shuffledDisplay.slice(0, cfg.removeCount)
  toRemove.forEach((item) => removedIds.value.add(item.id))
  lastMissingItem.value = toRemove[0] || DEFAULT_ITEM

  const distractors = ITEM_POOL.filter(
    (i) => !displayItems.value.some((d) => d.id === i.id),
  )
  const extraDistractors = shuffle(distractors).slice(0, cfg.candidateCount - toRemove.length)
  candidates.value = shuffle([...toRemove, ...extraDistractors])

  phase.value = 'memorize'
  startCountdown(cfg.memoriseMs)
}

function startCountdown(totalMs: number) {
  clearIntervalTimer()
  countdownPercent.value = 100
  countdownColor.value = '#13c2c2'
  const startTime = Date.now()

  countdownTimer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, totalMs - elapsed)
    countdownPercent.value = (remaining / totalMs) * 100
    countdownColor.value = remaining < totalMs * 0.3 ? '#fa8c16' : '#13c2c2'

    if (remaining <= 0) {
      clearIntervalTimer()
      // brief hide, then reveal with missing items for a few seconds so kids can study
      phase.value = 'reveal'
      // give plenty of time to look at what's still there
      phaseTimer = setTimeout(() => {
        phase.value = 'select'
      }, 4000)
    }
  }, 50)
}

function clearIntervalTimer() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function clearPhaseTimer() {
  if (phaseTimer !== null) {
    clearTimeout(phaseTimer)
    phaseTimer = null
  }
}

function onSelect(id: string) {
  if (selectedId.value !== null) return
  selectedId.value = id
  const correct = removedIds.value.has(id)
  lastCorrect.value = correct

  if (correct) {
    correctCount.value++
  }

  totalSelects.value++

  phaseTimer = setTimeout(() => {
    phase.value = 'result'
  }, 500)
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
  const accuracy = totalSelects.value > 0 ? correctCount.value / totalSelects.value : 0

  emit('complete', {
    completionStatus: accuracy >= 0.7 ? 'completed' : 'aborted',
    performanceData: {
      totalRounds: TOTAL_ROUNDS,
      correctCount: correctCount.value,
      totalSelects: totalSelects.value,
      accuracyRate: Math.round(accuracy * 100) / 100,
      difficultyLevel: props.difficulty,
      actual_params: {
        session_type: 'K02_MISSING_ITEM',
        difficulty_level: props.difficulty,
        display_count: difficultyConfig.value.displayCount,
        memorise_ms: difficultyConfig.value.memoriseMs,
        remove_count: difficultyConfig.value.removeCount,
        candidate_count: difficultyConfig.value.candidateCount,
      },
    },
  })
}

onMounted(() => {
  setupRound()
})

onUnmounted(() => {
  clearIntervalTimer()
  clearPhaseTimer()
})

watch(
  () => props.paused,
  (p) => {
    if (p) {
      clearIntervalTimer()
      clearPhaseTimer()
    }
  },
)
</script>

<style scoped>
.missing-item-game {
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
  justify-content: center;
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

.status-strip[data-tone='info'] {
  background: #e6f7ff;
  color: #1890ff;
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

.items-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.phase-hint {
  font-size: 22px;
  color: #fa8c16;
  font-weight: 600;
  margin: 0;
}

.items-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.item-card {
  width: 150px;
  height: 180px;
  border-radius: 16px;
  background: #fff;
  border: 3px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s;
}

.item-visible {
  border-color: var(--theme-color);
  box-shadow: 0 4px 16px rgba(19, 194, 194, 0.2);
}

.item-kept {
  border-color: #52c41a;
  background: #f6ffed;
}

.item-removed {
  border-color: #ffccc7;
  background: #fff2f0;
}

.item-icon {
  width: 80px;
  height: 80px;
}

.item-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.item-label {
  font-size: 18px;
  color: #333;
  font-weight: 500;
}

.item-gone {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gone-svg {
  width: 100%;
  height: 100%;
}

.countdown-bar {
  width: 320px;
  height: 10px;
  background: #eee;
  border-radius: 5px;
  overflow: hidden;
}

.countdown-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.05s linear, background-color 0.3s;
}

.candidates-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.prompt-text {
  font-size: 24px;
  color: #555;
  margin: 0 0 4px;
  font-weight: 600;
}

.candidates-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.candidate-btn {
  width: 160px;
  height: 200px;
  border-radius: 16px;
  border: 4px solid #e0e0e0;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
}

.candidate-btn:hover:not(:disabled) {
  border-color: var(--theme-color);
  box-shadow: 0 6px 20px rgba(19, 194, 194, 0.2);
  transform: translateY(-3px);
}

.candidate-btn.is-selected {
  border-color: var(--theme-color);
  background: #e6fffb;
}

.candidate-btn:disabled {
  cursor: default;
}

.result-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.result-icon {
  font-size: 72px;
}

.result-text {
  font-size: 22px;
  color: #333;
  text-align: center;
}

.next-btn {
  margin-top: 8px;
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
