<template>
  <div class="odd-one-out-game" :style="themeStyle">
    <div class="hud-panel">
      <div class="hud-card"><span>当前难度</span><strong>{{ difficultyConfig.shortLabel }}</strong></div>
      <div class="hud-card"><span>已完成</span><strong>{{ completedRounds }} 题</strong></div>
      <div class="hud-card"><span>答对</span><strong>{{ correctCount }} 题</strong></div>
      <div class="hud-card"><span>总题数</span><strong>{{ difficultyConfig.roundCount }} 题</strong></div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ statusLabel }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <div class="item-grid" :data-count="currentItems.length">
          <button
            v-for="item in currentItems"
            :key="item.id"
            type="button"
            class="item-card"
            :class="itemCardClass(item.id)"
            :disabled="phase !== 'playing' || lockedWrong === item.id"
            @click="onItemClick(item.id)"
          >
            <img
              class="item-img"
              :src="itemImageSrc(item)"
              :alt="item.label"
              draggable="false"
            />
            <span class="item-label">{{ item.label }}</span>
          </button>
        </div>

        <div v-if="feedbackVisible" class="feedback-strip" :data-tone="feedbackTone">
          <span>{{ feedbackText }}</span>
          <p v-if="rationaleText" class="rationale-text">{{ rationaleText }}</p>
        </div>
      </section>
    </div>

    <Transition name="badge-pop">
      <div v-if="showBadge" class="badge-overlay">
        <div class="badge-card">
          <span class="badge-icon">🏅</span>
          <p class="badge-name">{{ difficultyConfig.badge.badgeName }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { EmotionGameDifficulty } from '@/types/emotional/games'
import type { EmotionGameAudioController } from '@/types/emotional/games'
import type { CustomGameCompletionPayload } from '@/types/emotional/games'
import { generateOddOneOutRound } from '@/data/odd-one-out-categories'

const props = withDefaults(
  defineProps<{
    difficulty: EmotionGameDifficulty
    settings?: Record<string, unknown>
    paused?: boolean
    markRoundDirty?: () => void
    audio?: EmotionGameAudioController
  }>(),
  { settings: () => ({}), paused: false },
)

const emit = defineEmits<{
  complete: [payload: CustomGameCompletionPayload]
}>()

const DIFFICULTY_CONFIGS = {
  1: { roundCount: 8, choiceCount: 3, shortLabel: 'L1 基础', badge: { badgeCode: 'BADGE_CATEGORY_STAR', badgeName: '分类小专家徽章' } },
  2: { roundCount: 8, choiceCount: 4, shortLabel: 'L2 进阶', badge: { badgeCode: 'BADGE_CATEGORY_STAR', badgeName: '分类小专家徽章' } },
  3: { roundCount: 6, choiceCount: 5, shortLabel: 'L3 挑战', badge: { badgeCode: 'BADGE_CATEGORY_STAR', badgeName: '分类小专家徽章' } },
} as const

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty])

type Phase = 'playing' | 'correct' | 'wrong' | 'done'

const phase = ref<Phase>('playing')
const completedRounds = ref(0)
const correctCount = ref(0)
const lockedWrong = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const showBadge = ref(false)
const feedbackVisible = ref(false)
const feedbackTone = ref<'success' | 'error'>('success')
const feedbackText = ref('')
const rationaleText = ref('')
const statusTone = ref<'neutral' | 'success' | 'error'>('neutral')
const statusLabel = ref('找一找')
const stageMessage = ref('哪个和其他的不一样？')

const currentRound = ref(generateOddOneOutRound(props.difficulty))
const currentItems = computed(() => currentRound.value.items)
const currentOddId = computed(() => currentRound.value.oddItemId)

interface TrialRecord {
  roundIndex: number
  choiceCount: number
  correct: boolean
  responseTimeMs: number
  oddItemId: string
}

const trials = ref<TrialRecord[]>([])
const roundStartTime = ref(Date.now())
let boardDirty = false

const badgeTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const completeTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const resetTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function clearTimers() {
  if (badgeTimer.value) { clearTimeout(badgeTimer.value); badgeTimer.value = null }
  if (completeTimer.value) { clearTimeout(completeTimer.value); completeTimer.value = null }
  if (resetTimer.value) { clearTimeout(resetTimer.value); resetTimer.value = null }
}

function itemImageSrc(item: { imageKey: string }): string {
  // 预置资源经 resource:// 协议解析（打包后位于 resources/assets/resources/images/cognitive/items/）
  return `resource://images/cognitive/items/${item.imageKey}.png`
}

function markBoardDirtyOnce() {
  if (boardDirty) return
  boardDirty = true
  props.markRoundDirty?.()
}

function itemCardClass(id: string) {
  return {
    'card--selected': selectedId.value === id,
    'card--correct': phase.value === 'correct' && id === currentOddId.value,
    'card--wrong': lockedWrong.value === id,
  }
}

const themeStyle = computed(() => ({
  '--game-accent': '#26a69a',
  '--game-bg': '#e0f2f1',
}))

function nextRound() {
  boardDirty = false
  selectedId.value = null
  lockedWrong.value = null
  feedbackVisible.value = false
  rationaleText.value = ''
  phase.value = 'playing'
  statusTone.value = 'neutral'
  statusLabel.value = '找一找'
  stageMessage.value = '哪个和其他的不一样？'
  currentRound.value = generateOddOneOutRound(props.difficulty)
  roundStartTime.value = Date.now()
}

function buildPerformanceData() {
  const total = trials.value.length
  const correct = trials.value.filter(t => t.correct).length
  const avgRtMs = total > 0
    ? Math.round(trials.value.reduce((s, t) => s + t.responseTimeMs, 0) / total)
    : 0
  // 字段名严格对齐认知落库契约（cognitive-games-api 只认 accuracy_ratio /
  // average_response_ms / 嵌套 actual_params，与 K03 样板一致）；
  // 顶层扁平指标进 metrics，本局实际参数进 actual_params 支撑 IEP 级纵向追踪。
  return {
    paradigm: 'odd_one_out',
    difficulty_level: props.difficulty,
    total_rounds: total,
    correct_rounds: correct,
    accuracy_ratio: total > 0 ? parseFloat((correct / total).toFixed(4)) : 0,
    average_response_ms: avgRtMs,
    response_times_ms: trials.value.map(t => t.responseTimeMs),
    actual_params: {
      session_type: 'K04_ODD_ONE_OUT',
      choice_counts: trials.value.map(t => t.choiceCount),
      trials: trials.value,
    },
  }
}

function finishSession() {
  phase.value = 'done'
  showBadge.value = true
  badgeTimer.value = setTimeout(() => {
    showBadge.value = false
    props.audio?.playSuccessCue?.()
  }, 650)
  completeTimer.value = setTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: difficultyConfig.value.badge,
    } as CustomGameCompletionPayload)
  }, 1300)
}

function resetBoard() {
  clearTimers()
  boardDirty = false
  selectedId.value = null
  lockedWrong.value = null
  feedbackVisible.value = false
  rationaleText.value = ''
  phase.value = 'playing'
  statusTone.value = 'neutral'
  statusLabel.value = '找一找'
  stageMessage.value = '哪个和其他的不一样？'
  completedRounds.value = 0
  correctCount.value = 0
  trials.value = []
  currentRound.value = generateOddOneOutRound(props.difficulty)
  roundStartTime.value = Date.now()
}

function onItemClick(id: string) {
  if (phase.value !== 'playing') return
  markBoardDirtyOnce()
  selectedId.value = id
  const rt = Date.now() - roundStartTime.value
  const isOdd = id === currentOddId.value

  trials.value.push({
    roundIndex: completedRounds.value,
    choiceCount: difficultyConfig.value.choiceCount,
    correct: isOdd,
    responseTimeMs: rt,
    oddItemId: currentOddId.value,
  })

  if (isOdd) {
    completedRounds.value++
    correctCount.value++
    phase.value = 'correct'
    statusTone.value = 'success'
    statusLabel.value = '正确！'
    stageMessage.value = '找到了！'
    feedbackTone.value = 'success'
    feedbackText.value = '太棒了，找到那个不同的啦！'
    feedbackVisible.value = true
    props.audio?.playSuccessCue?.()

    if (completedRounds.value >= difficultyConfig.value.roundCount) {
      finishSession()
    } else {
      resetTimer.value = setTimeout(() => {
        if (!props.paused) nextRound()
      }, 3000)
    }
  } else {
    if (props.difficulty === 1) {
      lockedWrong.value = id
      selectedId.value = null
      feedbackTone.value = 'error'
      feedbackText.value = '再想想，试试其他的吧。'
      feedbackVisible.value = true
    } else {
      completedRounds.value++
      phase.value = 'wrong'
      statusTone.value = 'error'
      statusLabel.value = '差一点'
      stageMessage.value = '不是这个，看看正确答案。'
      feedbackTone.value = 'error'
      feedbackText.value = '没关系，下次再来！'
      rationaleText.value = currentRound.value.rationale ?? ''
      feedbackVisible.value = true

      if (completedRounds.value >= difficultyConfig.value.roundCount) {
        finishSession()
      } else {
        resetTimer.value = setTimeout(() => {
          if (!props.paused) nextRound()
        }, 3000)
      }
    }
  }
}

watch(() => props.difficulty, () => resetBoard())
watch(() => props.paused, (paused) => {
  if (!paused && phase.value === 'correct' && completedRounds.value < difficultyConfig.value.roundCount) {
    resetTimer.value = setTimeout(() => nextRound(), 3000)
  }
})

onUnmounted(() => clearTimers())
</script>

<style scoped>
.odd-one-out-game {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  min-height: 100%;
  background: var(--game-bg, #e0f2f1);
}

.hud-panel {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hud-card {
  background: #fff;
  border-radius: 10px;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 72px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

.hud-card span { font-size: 11px; color: #78909c; }
.hud-card strong { font-size: 18px; color: #263238; }

.stage-layout { flex: 1; display: flex; flex-direction: column; gap: 12px; }

.stage-panel {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}

.status-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #f5f5f5;
}

.status-strip[data-tone="success"] { background: #e8f5e9; color: #2e7d32; }
.status-strip[data-tone="error"]   { background: #fce4ec; color: #c62828; }
.status-strip span { font-weight: 600; }
.status-strip strong { color: inherit; }

.item-grid {
  display: grid;
  gap: 14px;
  justify-items: center;
}

.item-grid[data-count="3"] { grid-template-columns: repeat(3, 1fr); }
.item-grid[data-count="4"] { grid-template-columns: repeat(4, 1fr); }
.item-grid[data-count="5"] { grid-template-columns: repeat(5, 1fr); }

.item-card {
  background: #fafafa;
  border: 2px solid #e0e0e0;
  border-radius: 14px;
  padding: 12px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  transition: border-color .15s, transform .1s, box-shadow .15s;
}

.item-card:hover:not(:disabled) {
  border-color: var(--game-accent, #26a69a);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(38,166,154,.2);
}

.item-card:disabled { opacity: .45; cursor: not-allowed; }

.item-card.card--selected { border-color: var(--game-accent, #26a69a); background: #e0f2f1; }
.item-card.card--correct  { border-color: #43a047; background: #e8f5e9; box-shadow: 0 0 0 3px #a5d6a7; }
.item-card.card--wrong    { border-color: #e53935; background: #fce4ec; opacity: .6; }

.item-img {
  width: 84px;
  height: 84px;
  object-fit: contain;
  border-radius: 10px;
  user-select: none;
  -webkit-user-drag: none;
}
.item-label { font-size: 13px; color: #37474f; font-weight: 500; }

.feedback-strip {
  padding: 10px 14px;
  border-radius: 10px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 14px;
}

.feedback-strip[data-tone="error"] { background: #fce4ec; color: #c62828; }
.rationale-text { margin: 6px 0 0; font-size: 13px; opacity: .85; }

.badge-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.35);
  z-index: 999;
}

.badge-card {
  background: #fff;
  border-radius: 20px;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
}

.badge-icon { font-size: 56px; }
.badge-name { font-size: 18px; font-weight: 700; color: #263238; }

.badge-pop-enter-active, .badge-pop-leave-active { transition: opacity .25s, transform .25s; }
.badge-pop-enter-from, .badge-pop-leave-to { opacity: 0; transform: scale(.8); }
</style>
