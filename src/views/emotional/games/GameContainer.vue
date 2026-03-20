<template>
  <section class="emotion-game-shell" :data-paused="isPaused">
    <header class="game-toolbar">
      <button class="quiet-exit-button" type="button" @click="handleQuietExit">
        安静退出
      </button>

      <div class="toolbar-right">
        <div class="student-pill">
          <span class="student-label">当前学生</span>
          <strong>{{ resolvedStudentName }}</strong>
        </div>

        <el-dropdown trigger="click" placement="bottom-end">
          <button class="settings-button" type="button">
            设置
          </button>

          <template #dropdown>
            <el-dropdown-menu class="game-settings-menu">
              <div class="settings-panel" @click.stop>
                <div class="settings-row">
                  <span class="setting-label">难度级别</span>
                  <el-radio-group v-model="difficulty" size="small">
                    <el-radio-button :label="1">简单</el-radio-button>
                    <el-radio-button :label="2">中等</el-radio-button>
                    <el-radio-button :label="3">困难</el-radio-button>
                  </el-radio-group>
                </div>

                <div class="settings-row">
                  <span class="setting-label">背景音量</span>
                  <el-slider
                    v-model="settings.backgroundVolume"
                    :min="0"
                    :max="100"
                    :show-tooltip="false"
                  />
                </div>

                <div class="settings-row">
                  <span class="setting-label">特效与语音</span>
                  <el-switch v-model="settings.effectsEnabled" />
                </div>
              </div>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="game-stage">
      <slot
        :difficulty="difficulty"
        :settings="settings"
        :is-paused="isPaused"
        :complete-game="handleGameComplete"
        :mark-round-dirty="markRoundDirty"
        :audio="audioController"
      />
    </div>

    <transition name="fade-up">
      <div v-if="persistenceMessage" class="persistence-banner">
        {{ persistenceMessage }}
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { EmotionalGamesAPI } from '@/database/emotional-games-api'
import type {
  EmotionGameAudioController,
  EmotionGameBadgePayload,
  EmotionGameCode,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
  EmotionGameSettings,
} from '@/types/emotional/games'

const props = withDefaults(defineProps<{
  studentId: number
  studentName?: string
  gameCode: EmotionGameCode
  gameTitle: string
  initialDifficulty?: EmotionGameDifficulty
  defaultBadge?: EmotionGameBadgePayload
}>(), {
  studentName: '',
  initialDifficulty: 1,
  defaultBadge: undefined,
})

const route = useRoute()
const router = useRouter()
const api = new EmotionalGamesAPI()

const settings = reactive<EmotionGameSettings>({
  backgroundVolume: 28,
  effectsEnabled: true,
})

const difficulty = ref<EmotionGameDifficulty>(props.initialDifficulty)
const isPaused = ref(false)
const persistenceMessage = ref('')
const isPersisting = ref(false)
const sessionStartedAt = Date.now()
const hasDirtyRound = ref(false)
const suppressLeaveAbort = ref(false)
let messageTimer: number | null = null

const resolvedStudentName = computed(() => {
  if (props.studentName) return props.studentName
  const fromQuery = Array.isArray(route.query.studentName) ? route.query.studentName[0] : route.query.studentName
  return fromQuery || `学生 ${props.studentId}`
})

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let ambientGain: GainNode | null = null
let ambientOscillators: OscillatorNode[] = []
const cleanupAudioStops = new Set<() => void>()

function registerCleanup(cleanup: () => void) {
  cleanupAudioStops.add(cleanup)
  return () => cleanupAudioStops.delete(cleanup)
}

async function ensureAudioReady() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) return

  if (!audioContext) {
    audioContext = new AudioContextClass()
    masterGain = audioContext.createGain()
    masterGain.gain.value = 0.45
    masterGain.connect(audioContext.destination)
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
}

function stopAmbient() {
  ambientOscillators.forEach((osc) => {
    try {
      osc.stop()
      osc.disconnect()
    } catch {
      // ignore stopped oscillators
    }
  })
  ambientOscillators = []
  if (ambientGain) {
    ambientGain.disconnect()
    ambientGain = null
  }
}

async function startAmbient() {
  await ensureAudioReady()
  if (!audioContext || !masterGain || ambientOscillators.length > 0) return

  ambientGain = audioContext.createGain()
  ambientGain.gain.value = settings.backgroundVolume / 100 * 0.12
  ambientGain.connect(masterGain)

  const baseOsc = audioContext.createOscillator()
  baseOsc.type = 'sine'
  baseOsc.frequency.value = 196
  baseOsc.connect(ambientGain)

  const warmOsc = audioContext.createOscillator()
  warmOsc.type = 'triangle'
  warmOsc.frequency.value = 294
  warmOsc.connect(ambientGain)

  baseOsc.start()
  warmOsc.start()
  ambientOscillators = [baseOsc, warmOsc]
}

async function startBreathCue() {
  if (!settings.effectsEnabled) return
  await ensureAudioReady()
  if (!audioContext || !masterGain) return

  let stopped = false
  const gain = audioContext.createGain()
  gain.gain.value = 0.0001
  gain.connect(masterGain)

  const oscillator = audioContext.createOscillator()
  oscillator.type = 'triangle'
  oscillator.frequency.value = 232
  oscillator.connect(gain)
  oscillator.start()

  const now = audioContext.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.25)

  const cleanup = () => {
    if (stopped) return
    stopped = true
    const endAt = audioContext?.currentTime || 0
    try {
      gain.gain.cancelScheduledValues(endAt)
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt + 0.18)
      oscillator.stop(endAt + 0.22)
    } catch {
      // ignore
    }
    setTimeout(() => {
      try {
        oscillator.disconnect()
        gain.disconnect()
      } catch {
        // ignore
      }
    }, 280)
    cleanupAudioStops.delete(cleanup)
  }

  registerCleanup(cleanup)
}

function stopBreathCue() {
  Array.from(cleanupAudioStops).forEach((cleanup) => cleanup())
}

async function playSoftBounce() {
  if (!settings.effectsEnabled) return
  await ensureAudioReady()
  if (!audioContext || !masterGain) return

  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(330, audioContext.currentTime)
  osc.frequency.exponentialRampToValueAtTime(250, audioContext.currentTime + 0.22)
  gain.gain.setValueAtTime(0.001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.26)
  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioContext.currentTime + 0.28)
}

async function playSuccessCue() {
  if (!settings.effectsEnabled) return
  await ensureAudioReady()
  if (!audioContext || !masterGain) return

  const notes = [392, 523.25, 659.25]
  notes.forEach((frequency, index) => {
    const osc = audioContext!.createOscillator()
    const gain = audioContext!.createGain()
    const startAt = audioContext!.currentTime + index * 0.12
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, startAt)
    osc.frequency.linearRampToValueAtTime(frequency * 1.08, startAt + 0.18)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.06, startAt + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3)
    osc.connect(gain)
    gain.connect(masterGain!)
    osc.start(startAt)
    osc.stop(startAt + 0.32)
  })
}

function speak(text: string) {
  if (!settings.effectsEnabled || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.9
  utterance.pitch = 1.08
  utterance.volume = Math.max(0.2, settings.backgroundVolume / 100)
  window.speechSynthesis.speak(utterance)
}

function stopAllAudio() {
  stopBreathCue()
  stopAmbient()
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

watch(
  () => settings.backgroundVolume,
  (value) => {
    if (ambientGain) {
      ambientGain.gain.value = value / 100 * 0.12
    }
  },
)

const audioController: EmotionGameAudioController = {
  ensureReady: ensureAudioReady,
  startAmbient,
  stopAmbient,
  startBreathCue,
  stopBreathCue,
  playSoftBounce,
  playSuccessCue,
  speak,
  stopAll: stopAllAudio,
}

function buildReturnQuery() {
  const nextQuery = { ...route.query }
  nextQuery.studentId = String(props.studentId)
  nextQuery.studentName = resolvedStudentName.value
  delete nextQuery.targetPath
  delete nextQuery.subModule
  return nextQuery
}

function markRoundDirty() {
  hasDirtyRound.value = true
}

function getReturnLocation() {
  const sourceModule = Array.isArray(route.query.module) ? route.query.module[0] : route.query.module

  if (sourceModule === 'emotional') {
    return {
      path: `/games/lobby/${props.studentId}`,
      query: {
        module: 'emotional',
        studentName: resolvedStudentName.value,
      },
    }
  }

  return {
    path: '/emotional/menu',
    query: buildReturnQuery(),
  }
}

async function persistTerminalState(
  status: 'completed' | 'aborted',
  payload?: EmotionGameCompletionPayload,
) {
  if (isPersisting.value) {
    return
  }

  isPersisting.value = true

  try {
    const result = await api.persistSession({
      studentId: props.studentId,
      gameCode: props.gameCode,
      startedAt: new Date(sessionStartedAt).toISOString(),
      durationMs: Date.now() - sessionStartedAt,
      difficultyLevel: difficulty.value,
      completionStatus: status,
      performanceData: payload?.performanceData || {
        event: status === 'aborted' ? 'quiet_exit' : 'completed',
      },
      badge: payload?.badge || props.defaultBadge,
    })

    persistenceMessage.value = status === 'completed'
      ? `已静默保存本次训练${result.badgeUnlockCount ? `，徽章累计 ${result.badgeUnlockCount} 次` : ''}`
      : '已安静保存本次中断记录'

    if (messageTimer) {
      window.clearTimeout(messageTimer)
    }
    messageTimer = window.setTimeout(() => {
      persistenceMessage.value = ''
      messageTimer = null
    }, 2200)
  } finally {
    isPersisting.value = false
  }
}

async function handleGameComplete(payload: EmotionGameCompletionPayload) {
  await persistTerminalState('completed', payload)
  hasDirtyRound.value = false
}

async function handleQuietExit() {
  suppressLeaveAbort.value = true
  isPaused.value = true
  stopAllAudio()

  if (hasDirtyRound.value) {
    await persistTerminalState('aborted', {
      performanceData: {
        event: 'quiet_exit',
      },
    })
    hasDirtyRound.value = false
  }

  await router.push(getReturnLocation())
}

onBeforeRouteLeave(async () => {
  if (!suppressLeaveAbort.value && hasDirtyRound.value) {
    isPaused.value = true
    stopAllAudio()
    await persistTerminalState('aborted', {
      performanceData: {
        event: 'route_leave',
      },
    })
    hasDirtyRound.value = false
  }
})

onBeforeUnmount(() => {
  if (messageTimer) {
    window.clearTimeout(messageTimer)
  }
  stopAllAudio()
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(() => {
      // ignore close failures
    })
  }
})
</script>

<style scoped>
.emotion-game-shell {
  position: relative;
  min-height: calc(100vh - 120px);
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.45), transparent 38%),
    linear-gradient(180deg, #94d8ff 0%, #dff4ff 50%, #fff9e5 100%);
  box-shadow: 0 24px 48px rgba(50, 94, 133, 0.16);
}

.emotion-game-shell[data-paused='true'] :deep(*) {
  animation-play-state: paused !important;
}

.game-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
}

.quiet-exit-button,
.settings-button {
  min-width: 112px;
  min-height: 64px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.quiet-exit-button {
  color: #5a3e1b;
  background: rgba(255, 248, 222, 0.96);
  box-shadow: 0 12px 24px rgba(132, 98, 42, 0.14);
}

.settings-button {
  color: #265174;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 24px rgba(68, 123, 170, 0.14);
}

.quiet-exit-button:hover,
.settings-button:hover {
  transform: translateY(-2px);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-pill {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 64px;
  padding: 10px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 10px 24px rgba(57, 99, 145, 0.14);
}

.student-label {
  font-size: 12px;
  color: #6e87a1;
}

.student-pill strong {
  font-size: 16px;
  color: #21415f;
}

.game-stage {
  position: relative;
  min-height: calc(100vh - 120px);
}

:deep(.game-settings-menu) {
  padding: 0;
  border-radius: 20px;
  overflow: hidden;
}

.settings-panel {
  width: 320px;
  padding: 16px;
  background: #fffef9;
}

.settings-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}

.settings-row + .settings-row {
  border-top: 1px solid rgba(38, 81, 116, 0.08);
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #33597b;
}

.persistence-banner {
  position: absolute;
  left: 50%;
  bottom: 20px;
  z-index: 25;
  transform: translateX(-50%);
  padding: 12px 18px;
  border-radius: 999px;
  color: #285b54;
  background: rgba(240, 255, 248, 0.94);
  box-shadow: 0 14px 28px rgba(58, 112, 96, 0.16);
  font-size: 14px;
  font-weight: 600;
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.28s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 16px);
}

@media (max-width: 900px) {
  .emotion-game-shell,
  .game-stage {
    min-height: calc(100vh - 92px);
    border-radius: 20px;
  }

  .game-toolbar {
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
  }

  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .settings-panel {
    width: min(86vw, 320px);
  }
}
</style>
