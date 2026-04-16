<template>
  <div class="xylophone-game" :style="rootStyle">
    <div class="game-backdrop" aria-hidden="true">
      <div class="backdrop-glow backdrop-glow--left"></div>
      <div class="backdrop-glow backdrop-glow--right"></div>
      <span
        v-for="star in backdropStars"
        :key="star.id"
        class="backdrop-star"
        :style="{
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          animationDelay: `${star.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>敲击次数</span>
        <strong>{{ noteTapCount }} 次</strong>
      </div>
      <div class="hud-card">
        <span>录制回放</span>
        <strong>{{ recordingHudLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>{{ responseCardLabel }}</span>
        <strong>{{ responseCardValue }}</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip">
          <span>{{ statusEyebrow }}</span>
          <strong>{{ statusTitle }}</strong>
        </div>

        <div class="music-stage">
          <div class="stage-copy">
            <strong>{{ stageMessage }}</strong>
            <small>{{ helperMessage }}</small>
          </div>

          <div class="guide-panel">
            <div class="guide-header">
              <span>星光提示</span>
              <strong>{{ guideHeaderValue }}</strong>
            </div>
            <div class="guide-strip">
              <span
                v-for="(noteCode, index) in promptSequence"
                :key="`${noteCode}-${index}`"
                class="guide-chip"
                :class="{
                  'guide-chip--current': phase === 'playing' && index === promptStepIndex,
                  'guide-chip--passed': index < promptStepIndex,
                }"
              >
                {{ getNoteLabel(noteCode) }}
              </span>
              <span v-if="promptSequence.length === 0" class="guide-empty">
                当前难度以自由敲击和录制小旋律为主。
              </span>
            </div>
          </div>

          <div class="xylophone-shell">
            <div class="bar-shadow"></div>
            <button
              v-for="note in NOTE_BARS"
              :key="note.code"
              class="note-bar"
              :class="{
                'note-bar--active': activeNoteCode === note.code,
                'note-bar--prompt': currentPromptCode === note.code && phase === 'playing',
              }"
              :style="getNoteBarStyle(note)"
              :disabled="phase !== 'playing' || paused"
              type="button"
              @click="handleNoteTap(note)"
            >
              <span class="note-bar__label">{{ note.label }}</span>
              <span class="note-bar__tone">{{ note.tone }}</span>
              <span class="note-bar__hint">{{ note.hint }}</span>
            </button>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>安抚教具</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>星空八音盒</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ panelHint }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>轻轻敲击</span>
            <span>录下旋律</span>
            <span>手动保存</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(completionRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>最近旋律</strong>
            <span>{{ recordedMelodyLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>引导命中</strong>
            <span>{{ guidanceProgressLabel }}</span>
          </div>
        </div>

        <div class="recording-panel" :data-recording="isRecording">
          <div class="recording-copy">
            <strong>{{ isRecording ? '正在录制小旋律' : '录制回放' }}</strong>
            <span>{{ recordingHint }}</span>
          </div>
          <div class="recording-actions">
            <button
              v-if="!isRecording"
              class="secondary-action"
              type="button"
              :disabled="phase !== 'playing' || paused || isPlaybackActive"
              @click="startRecording"
            >
              录制旋律
            </button>
            <button
              v-else
              class="secondary-action secondary-action--warm"
              type="button"
              :disabled="phase !== 'playing' || paused"
              @click="stopRecording"
            >
              停止录制
            </button>
            <button
              class="secondary-action"
              type="button"
              :disabled="phase !== 'playing' || paused || recordedMelody.length === 0 || isRecording"
              @click="playRecordedMelody"
            >
              {{ isPlaybackActive ? '正在回放...' : '回放旋律' }}
            </button>
          </div>
        </div>

        <div class="action-row">
          <button
            v-if="phase === 'ready'"
            class="primary-action"
            type="button"
            @click="startRound"
          >
            开始敲亮星星
          </button>

          <template v-else-if="phase === 'playing'">
            <button
              class="primary-action"
              type="button"
              :disabled="!canFinishSession"
              @click="finishSession"
            >
              安静保存这一轮
            </button>
            <button
              class="secondary-action"
              type="button"
              @click="resetForDifficulty(activeDifficulty)"
            >
              换一片夜空
            </button>
          </template>

          <div v-else class="completion-note">
            小旋律已经收好，这一轮的记录正在保存。
          </div>
        </div>

        <p class="finish-note">
          这一游戏不会自动结束；至少敲亮 {{ difficultyConfig.minTapsToComplete }} 次音条后，教师可手动保存本轮。
        </p>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🎼</div>
        <strong>星光清音徽章</strong>
        <p>{{ sessionTheme.badgeCopy }}</p>
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
  EmotionGameSettings,
} from '@/types/emotional/games'

type Phase = 'ready' | 'playing' | 'celebrating' | 'finished'

interface DifficultyConfig {
  label: string
  shortLabel: string
  introText: string
  readyDescription: string
  activeHint: string
  completionText: string
  minTapsToComplete: number
  guideSequenceLength: number
  maxRecordingNotes: number
}

interface Theme {
  key: string
  title: string
  skyGradient: string
  glowGradient: string
  panelTint: string
  badgeCopy: string
}

interface NoteBar {
  code: string
  label: string
  tone: string
  hint: string
  frequency: number
  gradient: string
  shadow: string
}

interface BackdropStar {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    label: '简单 · 自由敲击',
    shortLabel: '简单',
    introText: '先轻轻敲亮一颗星星，听它把夜空慢慢点亮。',
    readyDescription: '简单模式以自由敲击和短旋律录制为主，帮助孩子先在柔和音色里慢慢安静下来。',
    activeHint: '每次只要轻轻敲一下，让手和耳朵一起跟着星星慢下来。',
    completionText: '这段小旋律已经收进星光八音盒里啦。',
    minTapsToComplete: 8,
    guideSequenceLength: 0,
    maxRecordingNotes: 6,
  },
  2: {
    label: '中等 · 三音跟弹',
    shortLabel: '中等',
    introText: '跟着上方的星光顺序轻轻敲击，让短短旋律稳定地重复起来。',
    readyDescription: '中等模式会给出 3 个音的星光提示，适合在自由敲击之外加入一点轻柔的跟弹练习。',
    activeHint: '先看当前发亮的提示音，再用同样的音条慢慢回应它。',
    completionText: '你已经把星光提示稳稳接住了，这一轮的旋律也保存好了。',
    minTapsToComplete: 10,
    guideSequenceLength: 3,
    maxRecordingNotes: 7,
  },
  3: {
    label: '困难 · 四音跟弹',
    shortLabel: '困难',
    introText: '这次会有更长一点的星光旋律，慢慢听、慢慢敲，不用着急。',
    readyDescription: '困难模式会给出 4 个音的提示序列，重点练习更稳定的节奏跟随和旋律保持。',
    activeHint: '先把注意力留在当前提示音，再把手指轻轻放到正确的音条上。',
    completionText: '长一点的星空旋律也已经收好了，你做得很稳。',
    minTapsToComplete: 12,
    guideSequenceLength: 4,
    maxRecordingNotes: 8,
  },
}

const THEMES: ReadonlyArray<Theme> = [
  {
    key: 'aurora-lullaby',
    title: '极光摇篮夜',
    skyGradient: 'linear-gradient(160deg, #102447 0%, #1d315d 34%, #21396f 56%, #3b6da5 100%)',
    glowGradient: 'radial-gradient(circle, rgba(121, 245, 217, 0.3) 0%, rgba(121, 245, 217, 0) 72%)',
    panelTint: 'rgba(147, 245, 222, 0.2)',
    badgeCopy: '极光和小旋律一起慢慢落下来，整片夜空都静下来了。',
  },
  {
    key: 'amber-moon',
    title: '琥珀月光夜',
    skyGradient: 'linear-gradient(160deg, #231b47 0%, #352a67 40%, #4f4f8c 66%, #7ea8d9 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 212, 131, 0.28) 0%, rgba(255, 212, 131, 0) 72%)',
    panelTint: 'rgba(255, 212, 131, 0.18)',
    badgeCopy: '月光把这段旋律轻轻收进了夜色里，听起来暖暖的。',
  },
  {
    key: 'blue-comet',
    title: '流星微蓝夜',
    skyGradient: 'linear-gradient(160deg, #0d2037 0%, #163755 34%, #235a7b 58%, #74bdd7 100%)',
    glowGradient: 'radial-gradient(circle, rgba(116, 223, 255, 0.28) 0%, rgba(116, 223, 255, 0) 72%)',
    panelTint: 'rgba(116, 223, 255, 0.18)',
    badgeCopy: '流星轻轻划过去时，你的小旋律也已经稳稳留在天空里。',
  },
]

const NOTE_BARS: ReadonlyArray<NoteBar> = [
  {
    code: 'gong',
    label: '宫',
    tone: 'C4',
    hint: '起始星音',
    frequency: 261.63,
    gradient: 'linear-gradient(135deg, #ffcf7b 0%, #f39b6d 100%)',
    shadow: 'rgba(243, 155, 109, 0.35)',
  },
  {
    code: 'shang',
    label: '商',
    tone: 'D4',
    hint: '柔光二音',
    frequency: 293.66,
    gradient: 'linear-gradient(135deg, #ffd87d 0%, #f0bf68 100%)',
    shadow: 'rgba(240, 191, 104, 0.35)',
  },
  {
    code: 'jue',
    label: '角',
    tone: 'E4',
    hint: '温柔中音',
    frequency: 329.63,
    gradient: 'linear-gradient(135deg, #93e8bf 0%, #4fd2a2 100%)',
    shadow: 'rgba(79, 210, 162, 0.35)',
  },
  {
    code: 'zhi',
    label: '徵',
    tone: 'G4',
    hint: '清亮星音',
    frequency: 392,
    gradient: 'linear-gradient(135deg, #7fd7ff 0%, #4a9cff 100%)',
    shadow: 'rgba(74, 156, 255, 0.35)',
  },
  {
    code: 'yu',
    label: '羽',
    tone: 'A4',
    hint: '收尾月音',
    frequency: 440,
    gradient: 'linear-gradient(135deg, #baa0ff 0%, #7d7cff 100%)',
    shadow: 'rgba(125, 124, 255, 0.36)',
  },
]

const backdropStars: ReadonlyArray<BackdropStar> = [
  { id: 1, left: 8, top: 12, size: 10, delay: 0 },
  { id: 2, left: 16, top: 62, size: 14, delay: 1.3 },
  { id: 3, left: 27, top: 24, size: 8, delay: 0.7 },
  { id: 4, left: 38, top: 16, size: 12, delay: 1.8 },
  { id: 5, left: 56, top: 18, size: 10, delay: 0.2 },
  { id: 6, left: 71, top: 66, size: 15, delay: 1.1 },
  { id: 7, left: 82, top: 24, size: 9, delay: 0.5 },
  { id: 8, left: 92, top: 12, size: 11, delay: 1.6 },
]

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  settings: EmotionGameSettings
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const phase = ref<Phase>('ready')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const sessionTheme = ref<Theme>(THEMES[0]!)
const noteTapCount = ref(0)
const uniqueNoteCodes = ref<string[]>([])
const recordedPhraseCount = ref(0)
const playbackCount = ref(0)
const guidedPromptCount = ref(0)
const promptHits = ref(0)
const promptMisses = ref(0)
const guidedSequenceCompletions = ref(0)
const tapIntervalsMs = ref<number[]>([])
const promptResponseTimesMs = ref<number[]>([])
const recordedMelody = ref<string[]>([])
const liveRecording = ref<string[]>([])
const isRecording = ref(false)
const isPlaybackActive = ref(false)
const showBadge = ref(false)
const stageMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].activeHint)
const activeNoteCode = ref<string | null>(null)
const promptSequence = ref<string[]>([])
const promptStepIndex = ref(0)
const lastGuideSequence = ref<string[]>([])

let themeCursor = 0
let glowTimer = 0
let promptTimer = 0
let completionTimer = 0
let currentPromptStartedAt = 0
let lastTapAt = 0
let hasCompleted = false
let roundDirty = false
let noteAudioContext: AudioContext | null = null
let playbackTimers: number[] = []

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[phase.value === 'ready' ? props.difficulty : activeDifficulty.value])
const difficultyLabel = computed(() => difficultyConfig.value.label)
const panelDescription = computed(() => difficultyConfig.value.readyDescription)
const panelHint = computed(() => difficultyConfig.value.activeHint)
const completionRatio = computed(() => Math.min(1, noteTapCount.value / difficultyConfig.value.minTapsToComplete))
const canFinishSession = computed(() => noteTapCount.value >= difficultyConfig.value.minTapsToComplete)
const currentPromptCode = computed(() => promptSequence.value[promptStepIndex.value] || null)
const recordingHudLabel = computed(() => `${recordedPhraseCount.value} 录 / ${playbackCount.value} 放`)
const recordingHint = computed(() => {
  if (isRecording.value) {
    return `继续敲击音条，最多录下 ${difficultyConfig.value.maxRecordingNotes} 个音。`
  }

  if (recordedMelody.value.length > 0) {
    return `最近一段：${recordedMelody.value.join(' · ')}`
  }

  return '先录下一段喜欢的小旋律，再点回放慢慢听。'
})
const recordedMelodyLabel = computed(() => recordedMelody.value.length > 0 ? recordedMelody.value.join(' · ') : '还没有录下小旋律')
const responseCardLabel = computed(() => difficultyConfig.value.guideSequenceLength > 0 ? '平均提示应答' : '平均敲击间隔')
const responseCardValue = computed(() => {
  const values = difficultyConfig.value.guideSequenceLength > 0 ? promptResponseTimesMs.value : tapIntervalsMs.value
  const average = averageNumericValues(values)
  return average === null ? '-' : `${average} ms`
})
const guidanceProgressLabel = computed(() => {
  if (guidedPromptCount.value <= 0) {
    return '自由敲击中'
  }

  return `${promptHits.value} / ${guidedPromptCount.value} 命中`
})
const guideHeaderValue = computed(() => {
  if (promptSequence.value.length === 0) {
    return '自由敲击'
  }

  return `${promptStepIndex.value + 1}/${promptSequence.value.length}`
})
const statusEyebrow = computed(() => {
  if (phase.value === 'finished' || phase.value === 'celebrating') return '旋律已保存'
  if (isRecording.value) return '正在录制'
  if (isPlaybackActive.value) return '正在回放'
  if (phase.value === 'playing') return '轻轻敲击'
  return '准备开始'
})
const statusTitle = computed(() => {
  if (phase.value === 'finished' || phase.value === 'celebrating') return difficultyConfig.value.completionText
  if (phase.value === 'playing') return stageMessage.value
  return difficultyConfig.value.introText
})
const rootStyle = computed(() => ({
  '--sky-gradient': sessionTheme.value.skyGradient,
  '--glow-gradient': sessionTheme.value.glowGradient,
  '--panel-tint': sessionTheme.value.panelTint,
}))

function averageNumericValues(values: number[]) {
  const normalized = values.filter((value) => Number.isFinite(value) && value >= 0)
  if (normalized.length === 0) {
    return null
  }

  return Math.round(normalized.reduce((sum, value) => sum + value, 0) / normalized.length)
}

function getNoteLabel(noteCode: string) {
  return NOTE_BARS.find((note) => note.code === noteCode)?.label || noteCode
}

function getNoteBarStyle(note: NoteBar) {
  return {
    background: note.gradient,
    boxShadow: `0 18px 32px ${note.shadow}`,
  }
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function stopPlayback() {
  playbackTimers.forEach((timer) => window.clearTimeout(timer))
  playbackTimers = []
  isPlaybackActive.value = false
}

function clearTimers() {
  if (glowTimer) {
    window.clearTimeout(glowTimer)
    glowTimer = 0
  }
  if (promptTimer) {
    window.clearTimeout(promptTimer)
    promptTimer = 0
  }
  if (completionTimer) {
    window.clearTimeout(completionTimer)
    completionTimer = 0
  }
}

function stopAllAudio() {
  stopPlayback()
  props.audio.stopAmbient()
  props.audio.stopAll()
}

async function ensureNoteAudioContext() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) {
    return null
  }

  if (!noteAudioContext) {
    noteAudioContext = new AudioContextClass()
  }

  if (noteAudioContext.state === 'suspended') {
    await noteAudioContext.resume()
  }

  return noteAudioContext
}

function pulseActiveNote(noteCode: string) {
  activeNoteCode.value = noteCode
  if (glowTimer) {
    window.clearTimeout(glowTimer)
  }
  glowTimer = window.setTimeout(() => {
    activeNoteCode.value = null
    glowTimer = 0
  }, 280)
}

async function playToneByCode(noteCode: string) {
  const note = NOTE_BARS.find((item) => item.code === noteCode)
  if (!note) {
    return
  }

  pulseActiveNote(note.code)

  const ctx = await ensureNoteAudioContext()
  if (!ctx) {
    return
  }

  const volumeScale = Math.max(0.22, Math.min(0.58, props.settings.backgroundVolume / 160 + 0.18))
  const now = ctx.currentTime
  const fundamental = ctx.createOscillator()
  const shimmer = ctx.createOscillator()
  const gain = ctx.createGain()

  fundamental.type = 'triangle'
  shimmer.type = 'sine'
  fundamental.frequency.setValueAtTime(note.frequency, now)
  shimmer.frequency.setValueAtTime(note.frequency * 2, now)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volumeScale, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.46)

  fundamental.connect(gain)
  shimmer.connect(gain)
  gain.connect(ctx.destination)

  fundamental.start(now)
  shimmer.start(now)
  fundamental.stop(now + 0.48)
  shimmer.stop(now + 0.44)
}

function pickNextTheme() {
  const theme = THEMES[themeCursor % THEMES.length]!
  themeCursor += 1
  sessionTheme.value = theme
}

function buildGuideSequence(length: number) {
  const sequence: string[] = []
  for (let index = 0; index < length; index += 1) {
    const note = NOTE_BARS[(themeCursor + index * 2 + noteTapCount.value) % NOTE_BARS.length]!
    sequence.push(note.code)
  }
  return sequence
}

function scheduleNextGuideSequence(delayMs = 600) {
  if (promptTimer) {
    window.clearTimeout(promptTimer)
  }

  promptTimer = window.setTimeout(() => {
    if (phase.value !== 'playing' || props.paused || difficultyConfig.value.guideSequenceLength <= 0) {
      return
    }

    const sequence = buildGuideSequence(difficultyConfig.value.guideSequenceLength)
    promptSequence.value = sequence
    lastGuideSequence.value = [...sequence]
    promptStepIndex.value = 0
    currentPromptStartedAt = Date.now()
    guidedPromptCount.value += sequence.length
    helperMessage.value = '看着当前发亮的提示音，再用同样的音条轻轻回应它。'
    promptTimer = 0
  }, delayMs)
}

function resetForDifficulty(difficulty: EmotionGameDifficulty) {
  clearTimers()
  stopPlayback()
  activeDifficulty.value = difficulty
  phase.value = 'ready'
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].introText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].activeHint
  noteTapCount.value = 0
  uniqueNoteCodes.value = []
  recordedPhraseCount.value = 0
  playbackCount.value = 0
  guidedPromptCount.value = 0
  promptHits.value = 0
  promptMisses.value = 0
  guidedSequenceCompletions.value = 0
  tapIntervalsMs.value = []
  promptResponseTimesMs.value = []
  recordedMelody.value = []
  liveRecording.value = []
  isRecording.value = false
  isPlaybackActive.value = false
  showBadge.value = false
  activeNoteCode.value = null
  promptSequence.value = []
  promptStepIndex.value = 0
  lastGuideSequence.value = []
  currentPromptStartedAt = 0
  lastTapAt = 0
  hasCompleted = false
  pickNextTheme()
  props.audio.stopAmbient()
}

async function startRound() {
  resetForDifficulty(props.difficulty)
  markRoundDirtyOnce()
  phase.value = 'playing'
  stageMessage.value = '先听一听每根音条的声音，再把喜欢的旋律慢慢敲出来。'
  helperMessage.value = difficultyConfig.value.activeHint
  void props.audio.ensureReady()
  void props.audio.startAmbient()

  if (difficultyConfig.value.guideSequenceLength > 0) {
    scheduleNextGuideSequence(260)
  }
}

function registerTapMetrics(noteCode: string) {
  const now = Date.now()
  noteTapCount.value += 1
  if (!uniqueNoteCodes.value.includes(noteCode)) {
    uniqueNoteCodes.value = [...uniqueNoteCodes.value, noteCode]
  }

  if (lastTapAt > 0) {
    tapIntervalsMs.value = [...tapIntervalsMs.value, now - lastTapAt]
  }
  lastTapAt = now

  if (isRecording.value) {
    const nextBuffer = [...liveRecording.value, getNoteLabel(noteCode)]
    liveRecording.value = nextBuffer

    if (nextBuffer.length >= difficultyConfig.value.maxRecordingNotes) {
      stopRecording()
    }
  }

  if (promptSequence.value.length > 0) {
    const expected = promptSequence.value[promptStepIndex.value]
    if (!expected) {
      return
    }

    if (noteCode === expected) {
      promptHits.value += 1
      if (currentPromptStartedAt > 0) {
        promptResponseTimesMs.value = [...promptResponseTimesMs.value, now - currentPromptStartedAt]
      }
      promptStepIndex.value += 1

      if (promptStepIndex.value >= promptSequence.value.length) {
        guidedSequenceCompletions.value += 1
        stageMessage.value = '这一串星光旋律接住啦，可以继续自由敲一会儿，也可以等下一串提示。'
        helperMessage.value = '做得很好，夜空会在一小会儿后亮起下一串提示音。'
        promptSequence.value = []
        promptStepIndex.value = 0
        currentPromptStartedAt = 0
        void props.audio.playSuccessCue()
        scheduleNextGuideSequence(900)
      } else {
        currentPromptStartedAt = now
        helperMessage.value = `继续轻轻敲亮第 ${promptStepIndex.value + 1} 个提示音。`
      }
    } else {
      promptMisses.value += 1
      helperMessage.value = `先听上方当前亮着的 ${getNoteLabel(expected)} 音，再慢慢回应它。`
    }
  }
}

async function handleNoteTap(note: NoteBar) {
  if (phase.value !== 'playing' || props.paused) {
    return
  }

  markRoundDirtyOnce()
  registerTapMetrics(note.code)
  await playToneByCode(note.code)
}

function startRecording() {
  if (phase.value !== 'playing' || props.paused || isPlaybackActive.value) {
    return
  }

  markRoundDirtyOnce()
  isRecording.value = true
  liveRecording.value = []
  stageMessage.value = '现在开始录制，把喜欢的几个音轻轻敲下来。'
  helperMessage.value = `录满 ${difficultyConfig.value.maxRecordingNotes} 个音会自动停下，也可以手动停止。`
}

function stopRecording() {
  if (!isRecording.value) {
    return
  }

  isRecording.value = false
  if (liveRecording.value.length > 0) {
    recordedMelody.value = [...liveRecording.value]
    recordedPhraseCount.value += 1
    stageMessage.value = '这段小旋律已经录好了，回放一次听听看。'
    helperMessage.value = `最近录下的是：${recordedMelody.value.join(' · ')}`
  } else {
    helperMessage.value = '刚才还没有录下音符，可以再试一次。'
  }
}

async function playRecordedMelody() {
  if (phase.value !== 'playing' || props.paused || recordedMelody.value.length === 0 || isRecording.value) {
    return
  }

  stopPlayback()
  markRoundDirtyOnce()
  isPlaybackActive.value = true
  playbackCount.value += 1
  stageMessage.value = '小旋律正在夜空里慢慢回放。'
  helperMessage.value = '先静静听一遍，如果喜欢，也可以再录一段新的。'

  recordedMelody.value.forEach((label, index) => {
    const noteCode = NOTE_BARS.find((note) => note.label === label)?.code
    if (!noteCode) {
      return
    }

    const timer = window.setTimeout(() => {
      void playToneByCode(noteCode)
    }, index * 420)
    playbackTimers.push(timer)
  })

  const finalTimer = window.setTimeout(() => {
    isPlaybackActive.value = false
    helperMessage.value = difficultyConfig.value.guideSequenceLength > 0 && promptSequence.value.length > 0
      ? '回放结束后，可以继续接上方的提示音，也可以自由敲击。'
      : '回放结束啦，可以再录一段新的小旋律。'
  }, recordedMelody.value.length * 420 + 220)
  playbackTimers.push(finalTimer)
}

function buildPerformanceData() {
  return {
    note_tap_count: noteTapCount.value,
    unique_note_count: uniqueNoteCodes.value.length,
    recorded_phrase_count: recordedPhraseCount.value,
    playback_count: playbackCount.value,
    guided_prompt_count: guidedPromptCount.value,
    prompt_hits: promptHits.value,
    prompt_misses: promptMisses.value,
    guided_sequence_completions: guidedSequenceCompletions.value,
    tap_intervals_ms: [...tapIntervalsMs.value],
    prompt_response_times_ms: [...promptResponseTimesMs.value],
    average_tap_interval_ms: averageNumericValues(tapIntervalsMs.value),
    average_prompt_response_ms: averageNumericValues(promptResponseTimesMs.value),
    recorded_note_labels: [...recordedMelody.value],
    last_guided_sequence_labels: lastGuideSequence.value.map((noteCode) => getNoteLabel(noteCode)),
    session_theme_key: sessionTheme.value.key,
    session_theme_title: sessionTheme.value.title,
    manual_complete: true,
    difficulty_level: activeDifficulty.value,
  }
}

function finishSession() {
  if (phase.value !== 'playing' || hasCompleted || !canFinishSession.value) {
    return
  }

  hasCompleted = true
  clearTimers()
  stopPlayback()
  stopAllAudio()
  if (isRecording.value) {
    stopRecording()
  }

  phase.value = 'celebrating'
  showBadge.value = true
  stageMessage.value = '这段小旋律已经装进星空八音盒里了。'
  helperMessage.value = sessionTheme.value.badgeCopy
  void props.audio.playSuccessCue()

  completionTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', {
      performanceData: buildPerformanceData(),
    })
  }, 860)
}

watch(() => props.difficulty, (nextDifficulty) => {
  if (phase.value === 'playing' && nextDifficulty !== activeDifficulty.value) {
    resetForDifficulty(nextDifficulty)
    return
  }

  if (phase.value === 'ready') {
    activeDifficulty.value = nextDifficulty
    stageMessage.value = DIFFICULTY_CONFIGS[nextDifficulty].introText
    helperMessage.value = DIFFICULTY_CONFIGS[nextDifficulty].activeHint
  }
})

watch(() => props.paused, (paused) => {
  if (paused) {
    stopPlayback()
    props.audio.stopAmbient()
    return
  }

  if (phase.value === 'playing') {
    void props.audio.startAmbient()
  }
})

onBeforeUnmount(() => {
  clearTimers()
  stopAllAudio()
  if (noteAudioContext) {
    void noteAudioContext.close().catch(() => undefined)
    noteAudioContext = null
  }
})

pickNextTheme()
</script>

<style scoped>
.xylophone-game {
  position: relative;
  min-height: calc(100vh - 88px);
  padding: 28px;
  overflow: hidden;
  background: var(--sky-gradient);
  color: #eef5ff;
}

.game-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.backdrop-glow {
  position: absolute;
  width: 380px;
  height: 380px;
  border-radius: 999px;
  background: var(--glow-gradient);
  filter: blur(10px);
  opacity: 0.92;
}

.backdrop-glow--left {
  top: -80px;
  left: -110px;
}

.backdrop-glow--right {
  right: -90px;
  bottom: -140px;
}

.backdrop-star {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 14px rgba(255, 255, 255, 0.5);
  animation: starPulse 3.8s ease-in-out infinite;
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
  margin-bottom: 20px;
}

.hud-card,
.stage-panel,
.instruction-panel {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(11, 22, 43, 0.54);
  backdrop-filter: blur(18px);
  box-shadow: 0 22px 48px rgba(5, 11, 24, 0.28);
}

.hud-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 22px;
}

.hud-card span {
  font-size: 13px;
  color: rgba(233, 241, 255, 0.72);
}

.hud-card strong {
  font-size: 24px;
  line-height: 1.1;
}

.stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.stage-panel,
.instruction-panel {
  border-radius: 30px;
}

.stage-panel {
  padding: 24px;
}

.instruction-panel {
  padding: 24px 22px;
}

.status-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
}

.status-strip span {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(231, 239, 255, 0.68);
}

.status-strip strong {
  font-size: 22px;
  line-height: 1.3;
}

.music-stage {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stage-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.08);
}

.stage-copy strong {
  font-size: 22px;
  line-height: 1.35;
}

.stage-copy small {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(233, 241, 255, 0.78);
}

.guide-panel {
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
}

.guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.guide-header span {
  color: rgba(233, 241, 255, 0.72);
  font-size: 13px;
}

.guide-header strong {
  font-size: 15px;
}

.guide-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 42px;
}

.guide-chip,
.guide-empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border-radius: 999px;
}

.guide-chip {
  min-width: 38px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(241, 246, 255, 0.86);
  transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.guide-chip--current {
  background: rgba(255, 215, 131, 0.2);
  color: #fff5d0;
  box-shadow: 0 0 0 1px rgba(255, 215, 131, 0.4), 0 10px 24px rgba(255, 215, 131, 0.18);
  transform: translateY(-2px);
}

.guide-chip--passed {
  background: rgba(121, 245, 217, 0.16);
  color: #dffff4;
}

.guide-empty {
  padding: 0 14px;
  font-size: 13px;
  color: rgba(231, 239, 255, 0.72);
  background: rgba(255, 255, 255, 0.05);
}

.xylophone-shell {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 20px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%),
    rgba(8, 15, 30, 0.48);
}

.bar-shadow {
  position: absolute;
  right: 28px;
  bottom: 18px;
  left: 28px;
  height: 16px;
  border-radius: 999px;
  background: rgba(2, 8, 18, 0.42);
  filter: blur(8px);
}

.note-bar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 56px 70px 1fr;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border: none;
  border-radius: 24px;
  color: #10243c;
  text-align: left;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.note-bar:nth-child(2) {
  width: 100%;
}

.note-bar:nth-child(3) {
  width: 94%;
  margin-left: auto;
}

.note-bar:nth-child(4) {
  width: 88%;
  margin-left: auto;
}

.note-bar:nth-child(5) {
  width: 82%;
  margin-left: auto;
}

.note-bar:nth-child(6) {
  width: 76%;
  margin-left: auto;
}

.note-bar:hover:not(:disabled),
.note-bar--active {
  transform: translateY(-2px) scale(1.01);
  filter: saturate(1.06);
}

.note-bar--prompt {
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.58), 0 18px 32px rgba(255, 215, 131, 0.22);
}

.note-bar:disabled {
  cursor: default;
  opacity: 0.72;
}

.note-bar__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.3);
  font-size: 28px;
  font-weight: 700;
}

.note-bar__tone {
  font-size: 18px;
  font-weight: 700;
}

.note-bar__hint {
  justify-self: end;
  color: rgba(16, 36, 60, 0.72);
  font-size: 13px;
}

.panel-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.panel-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 13px;
}

.panel-tags .accent {
  background: var(--panel-tint);
  color: #fef3c4;
}

.instruction-panel h2 {
  margin: 0 0 10px;
  font-size: 30px;
  line-height: 1.1;
}

.instruction-panel p,
.instruction-panel small {
  display: block;
  margin: 0;
  line-height: 1.7;
  color: rgba(233, 241, 255, 0.8);
}

.instruction-panel small {
  margin-top: 8px;
}

.progress-block {
  margin-top: 20px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.07);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(231, 239, 255, 0.66);
}

.progress-track {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffd27c 0%, #8ef0d4 54%, #7ab9ff 100%);
  transition: width 220ms ease;
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.tip-card,
.recording-panel {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
}

.tip-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 110px;
  padding: 16px;
}

.tip-card strong {
  font-size: 15px;
}

.tip-card span {
  line-height: 1.6;
  color: rgba(233, 241, 255, 0.78);
}

.recording-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.recording-panel[data-recording='true'] {
  border-color: rgba(255, 205, 140, 0.34);
  box-shadow: 0 0 0 1px rgba(255, 205, 140, 0.18);
}

.recording-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recording-copy strong {
  font-size: 15px;
}

.recording-copy span {
  line-height: 1.6;
  color: rgba(233, 241, 255, 0.78);
}

.recording-actions,
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.primary-action,
.secondary-action {
  border: none;
  border-radius: 18px;
  min-height: 46px;
  padding: 0 18px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 160ms ease, opacity 160ms ease;
}

.primary-action {
  background: linear-gradient(135deg, #ffe096 0%, #ffc373 100%);
  color: #17253e;
}

.secondary-action {
  background: rgba(255, 255, 255, 0.12);
  color: #eef5ff;
}

.secondary-action--warm {
  background: rgba(255, 204, 143, 0.18);
  color: #fff5dc;
}

.primary-action:hover:not(:disabled),
.secondary-action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.primary-action:disabled,
.secondary-action:disabled {
  cursor: default;
  opacity: 0.46;
}

.completion-note,
.finish-note {
  color: rgba(233, 241, 255, 0.76);
  line-height: 1.6;
}

.finish-note {
  margin: 14px 0 0;
  font-size: 13px;
}

.badge-modal {
  position: fixed;
  left: 50%;
  bottom: 42px;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
  padding: 20px 24px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(10, 18, 36, 0.86);
  backdrop-filter: blur(18px);
  transform: translateX(-50%);
  box-shadow: 0 24px 48px rgba(4, 12, 26, 0.34);
}

.badge-icon {
  font-size: 36px;
}

.badge-modal strong {
  font-size: 20px;
}

.badge-modal p {
  margin: 0;
  text-align: center;
  line-height: 1.6;
  color: rgba(233, 241, 255, 0.8);
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@keyframes starPulse {
  0%,
  100% {
    opacity: 0.42;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}

@media (max-width: 1080px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }

  .instruction-panel {
    order: -1;
  }
}

@media (max-width: 768px) {
  .xylophone-game {
    min-height: auto;
    padding: 18px 14px 24px;
  }

  .hud-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stage-panel,
  .instruction-panel {
    padding: 18px;
    border-radius: 24px;
  }

  .status-strip strong,
  .stage-copy strong {
    font-size: 18px;
  }

  .note-bar {
    grid-template-columns: 48px 56px 1fr;
    gap: 10px;
    padding: 16px;
  }

  .note-bar__label {
    width: 44px;
    height: 44px;
    font-size: 22px;
  }

  .note-bar__hint {
    justify-self: start;
  }

  .tip-grid {
    grid-template-columns: 1fr;
  }
}
</style>
