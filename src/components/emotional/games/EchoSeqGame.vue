<template>
  <div class="echo-seq-game" :style="themeStyle">
    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.shortLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>序列长度</span>
        <strong>{{ activeSequence.length }} 个</strong>
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

        <div class="button-grid">
          <button
            v-for="btn in buttons"
            :key="btn.index"
            type="button"
            class="echo-btn"
            :class="{
              'is-lit': litIndex === btn.index,
              'is-wrong': wrongIndex === btn.index,
              'is-disabled': phase !== 'input',
            }"
            :style="{ '--btn-color': btn.color, '--btn-shape': btn.shape }"
            :disabled="phase !== 'input' || playerIndex >= activeSequence.length"
            @click="onButtonPress(btn.index)"
          >
            <span class="btn-inner">{{ btn.shape === 'circle' ? '●' : btn.shape === 'square' ? '■' : '▲' }}</span>
          </button>
        </div>

        <p v-if="phase === 'playback'" class="hint-message">注意看和听...</p>
        <p v-else-if="phase === 'input'" class="hint-message">
          轮到你了！按了 {{ playerIndex }} / {{ activeSequence.length }}
        </p>
        <p v-else-if="phase === 'result'" class="hint-message">
          {{ lastCorrect ? '✅ 完全正确！' : '❌ 顺序不对，再来一次' }}
        </p>
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

interface ButtonDef {
  index: number
  color: string
  shape: string
  freq: number
}

interface DifficultyConfig {
  buttonCount: number
  minSeqLen: number
  maxSeqLen: number
  reverseMode: boolean
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

// ---- button definitions ----
const ALL_BUTTONS: ButtonDef[] = [
  { index: 0, color: '#ff4d4f', shape: 'circle', freq: 523 },
  { index: 1, color: '#1890ff', shape: 'square', freq: 659 },
  { index: 2, color: '#52c41a', shape: 'triangle', freq: 784 },
  { index: 3, color: '#fadb14', shape: 'circle', freq: 880 },
]

const DIFFICULTY_LEVELS: Record<number, DifficultyConfig> = {
  1: { buttonCount: 2, minSeqLen: 2, maxSeqLen: 2, reverseMode: false, shortLabel: 'L1' },
  2: { buttonCount: 3, minSeqLen: 3, maxSeqLen: 4, reverseMode: false, shortLabel: 'L2' },
  3: { buttonCount: 4, minSeqLen: 5, maxSeqLen: 6, reverseMode: true, shortLabel: 'L3' },
}

const TOTAL_ROUNDS = 5

// ---- state ----
const phase = ref<'playback' | 'input' | 'result'>('playback')
const round = ref(0)
const correctCount = ref(0)
const buttons = ref<ButtonDef[]>([])
const activeSequence = ref<number[]>([])
const playerIndex = ref(0)
const litIndex = ref<number | null>(null)
const wrongIndex = ref<number | null>(null)
const lastCorrect = ref(false)

let audioCtx: AudioContext | null = null
let playbackTimer: ReturnType<typeof setTimeout> | null = null
let resultTimer: ReturnType<typeof setTimeout> | null = null

const difficultyConfig = computed<DifficultyConfig>(() => {
  return DIFFICULTY_LEVELS[props.difficulty] ?? DIFFICULTY_LEVELS[1]!
})

const roundLabel = computed(() => `${round.value + 1} / ${TOTAL_ROUNDS}`)

const statusLabel = computed(() => {
  if (phase.value === 'playback') return '观察中'
  if (phase.value === 'input') return '轮到你了'
  return '结果'
})

const stageMessage = computed(() => {
  if (phase.value === 'playback') return '看清楚顺序，听清楚声音'
  if (phase.value === 'input') return '按相同的顺序点一遍！'
  return ''
})

const statusTone = computed(() => {
  if (phase.value === 'playback') return 'info'
  if (phase.value === 'input') return 'action'
  return 'neutral'
})

const themeStyle = computed(() => ({
  '--theme-color': '#13c2c2',
}))

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

function playTone(freq: number, duration = 0.6) {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Web Audio not available, ignore
  }
}

function setupRound() {
  const cfg = difficultyConfig.value
  buttons.value = ALL_BUTTONS.slice(0, cfg.buttonCount)

  const seqLen = cfg.minSeqLen + Math.floor(Math.random() * (cfg.maxSeqLen - cfg.minSeqLen + 1))
  const seq: number[] = []
  for (let i = 0; i < seqLen; i++) {
    seq.push(Math.floor(Math.random() * cfg.buttonCount))
  }
  activeSequence.value = seq

  playerIndex.value = 0
  litIndex.value = null
  wrongIndex.value = null
  lastCorrect.value = false

  phase.value = 'playback'
  playSequence(0)
}

function playSequence(i: number) {
  if (i >= activeSequence.value.length) {
    // playback done, give time before switching to input
    playbackTimer = setTimeout(() => {
      phase.value = 'input'
    }, 2000)
    return
  }

  const btnIdx = activeSequence.value[i]!
  litIndex.value = btnIdx
  const btn = buttons.value[btnIdx]
  if (btn) playTone(btn.freq)

  setTimeout(() => {
    litIndex.value = null
    playbackTimer = setTimeout(() => {
      playSequence(i + 1)
    }, 600)
  }, 1000)
}

function onButtonPress(index: number) {
  if (phase.value !== 'input') return
  if (playerIndex.value >= activeSequence.value.length) return

  const expected = activeSequence.value[playerIndex.value]!
  const btn = buttons.value[index]
  if (btn) playTone(btn.freq)

  if (index === expected) {
    playerIndex.value++
    if (playerIndex.value >= activeSequence.value.length) {
      // complete round
      correctCount.value++
      lastCorrect.value = true
      phase.value = 'result'
      resultTimer = setTimeout(() => {
        nextRound()
      }, 2500)
    }
  } else {
    wrongIndex.value = index
    lastCorrect.value = false
    phase.value = 'result'
    resultTimer = setTimeout(() => {
      wrongIndex.value = null
      nextRound()
    }, 3000)
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
        session_type: 'K09_ECHO_SEQ',
        difficulty_level: props.difficulty,
        button_count: difficultyConfig.value.buttonCount,
        min_seq_len: difficultyConfig.value.minSeqLen,
        max_seq_len: difficultyConfig.value.maxSeqLen,
        reverse_mode: difficultyConfig.value.reverseMode,
      },
    },
  })
}

onMounted(() => {
  setupRound()
})

onUnmounted(() => {
  if (playbackTimer) clearTimeout(playbackTimer)
  if (resultTimer) clearTimeout(resultTimer)
  if (audioCtx) {
    audioCtx.close().catch(() => {})
    audioCtx = null
  }
})

watch(
  () => props.paused,
  (p) => {
    if (p) {
      if (playbackTimer) clearTimeout(playbackTimer)
      if (resultTimer) clearTimeout(resultTimer)
    }
  },
)
</script>

<style scoped>
.echo-seq-game {
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
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

.button-grid {
  display: flex;
  gap: 32px;
  justify-content: center;
}

.echo-btn {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 5px solid #e0e0e0;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  position: relative;
}

.echo-btn:not(.is-disabled):hover {
  transform: scale(1.06);
}

.echo-btn.is-lit {
  border-color: var(--btn-color);
  background: var(--btn-color);
  box-shadow: 0 0 36px var(--btn-color);
  transform: scale(1.1);
}

.echo-btn.is-lit .btn-inner {
  color: #fff;
}

.echo-btn.is-wrong {
  border-color: #ff4d4f;
  background: #ff4d4f;
  animation: shake 0.3s;
}

.echo-btn.is-wrong .btn-inner {
  color: #fff;
}

.echo-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-inner {
  font-size: 48px;
  color: #bbb;
  transition: color 0.15s;
}

.hint-message {
  font-size: 22px;
  color: #666;
  margin: 0;
  text-align: center;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}
</style>
