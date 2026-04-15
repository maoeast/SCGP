<template>
  <div class="hourglass-game">
    <div class="hourglass-backdrop" aria-hidden="true">
      <div class="hourglass-glow hourglass-glow--left"></div>
      <div class="hourglass-glow hourglass-glow--right"></div>
      <span
        v-for="dot in backdropDots"
        :key="dot.id"
        class="backdrop-dot"
        :style="{
          left: `${dot.left}%`,
          top: `${dot.top}%`,
          width: `${dot.size}px`,
          height: `${dot.size}px`,
          animationDelay: `${dot.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>剩余时间</span>
        <strong>{{ remainingLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>安静提醒</span>
        <strong>{{ calmTapCount }} 次</strong>
      </div>
      <div class="hud-card">
        <span>流沙进度</span>
        <strong>{{ progressLabel }}</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip">
          <span>{{ statusEyebrow }}</span>
          <strong>{{ statusTitle }}</strong>
        </div>

        <div class="hourglass-stage">
          <div class="hourglass-frame">
            <div class="frame-post frame-post--left"></div>
            <div class="frame-post frame-post--right"></div>
            <div class="frame-cap frame-cap--top"></div>
            <div class="frame-cap frame-cap--bottom"></div>

            <div class="glass-bulb glass-bulb--top">
              <div class="glass-sand glass-sand--top" :style="topSandStyle"></div>
            </div>

            <div class="glass-neck">
              <div class="sand-stream" :class="{ 'sand-stream--active': isFlowing }"></div>
              <div class="sand-spark"></div>
            </div>

            <div class="glass-bulb glass-bulb--bottom">
              <div class="glass-sand glass-sand--bottom" :style="bottomSandStyle"></div>
            </div>

            <div class="glass-highlight glass-highlight--top"></div>
            <div class="glass-highlight glass-highlight--bottom"></div>
          </div>

          <div class="breath-orbit" :class="{ 'breath-orbit--active': phase === 'playing' && !paused }"></div>
          <div class="stage-copy">
            <strong>{{ mainMessage }}</strong>
            <small>{{ helperMessage }}</small>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>安抚教具</span>
          <span class="accent">{{ difficultyTag }}</span>
        </div>

        <h2>魔法沙漏</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ panelHint }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>刚刚开始</span>
            <span>安静等待</span>
            <span>自然结束</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>本轮时长</strong>
            <span>{{ durationLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>完成提示</strong>
            <span>陪着沙漏安静流到底，这一轮就会自然结束。</span>
          </div>
        </div>

        <div class="action-row">
          <button
            v-if="phase === 'ready'"
            class="primary-action"
            type="button"
            @click="startRound"
          >
            开始看沙漏
          </button>

          <button
            v-else-if="phase === 'playing'"
            class="secondary-action"
            type="button"
            :disabled="paused"
            @click="offerCalmCue"
          >
            我还在安静等待
          </button>

          <div v-else class="completion-note">
            沙漏已经流完，这一轮已经顺利结束。
          </div>
        </div>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showCompletionBadge" class="badge-modal">
        <div class="badge-icon">⏳</div>
        <strong>静心沙光徽章</strong>
        <p>你已经稳稳陪着沙漏流到了最后一粒。</p>
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

type Phase = 'ready' | 'playing' | 'celebrating' | 'finished'

interface DifficultyConfig {
  durationMs: number
  label: string
  shortLabel: string
  introText: string
  readyDescription: string
  steadyHint: string
  completionText: string
}

interface BackdropDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    durationMs: 45_000,
    label: '简单 · 短时等待',
    shortLabel: '简单',
    introText: '先看着第一粒沙子慢慢落下，让身体和呼吸都安静下来。',
    readyDescription: '简单模式只需要陪沙漏安静走完较短的一段时间，帮助孩子先建立“等一等也没关系”的稳定感。',
    steadyHint: '眼睛看着沙粒，肩膀慢慢放松，不需要做别的事情。',
    completionText: '沙漏流完啦，你已经稳稳地完成了一次安静等待。',
  },
  2: {
    durationMs: 70_000,
    label: '中等 · 稳定等待',
    shortLabel: '中等',
    introText: '让视线跟着沙粒往下落，继续把呼吸放慢一点点。',
    readyDescription: '中等模式会延长等待时间，需要更稳定地看着沙粒流动，不急着结束。',
    steadyHint: '如果觉得想动一动，就轻轻提醒自己“再等一下，沙子还在流”。',
    completionText: '沙漏安静地流到了底部，这次等待已经很稳定了。',
  },
  3: {
    durationMs: 95_000,
    label: '困难 · 长时等待',
    shortLabel: '困难',
    introText: '这一次会更久一点，跟着沙漏一起把注意力慢慢留在当下。',
    readyDescription: '困难模式会给出更长的倒计时，重点练习持续等待和情绪平复，不靠抢快完成。',
    steadyHint: '看着沙漏的节奏，心里轻轻数呼吸，让自己和沙粒一样慢慢落下来。',
    completionText: '最后一粒沙子也落下来了，你已经完成了完整的长时等待。',
  },
}

const CALM_CUES = [
  '把肩膀放轻一点，继续看着沙粒往下落。',
  '可以轻轻吸气，再慢慢呼气，沙漏还在陪着你。',
  '不着急，先把眼睛留在沙漏上，等它继续流。',
  '做得很好，再安静等一小会儿，沙粒马上就会落到底部。',
]

const backdropDots: ReadonlyArray<BackdropDot> = [
  { id: 1, left: 8, top: 16, size: 14, delay: 0 },
  { id: 2, left: 18, top: 72, size: 10, delay: 1.1 },
  { id: 3, left: 32, top: 24, size: 18, delay: 0.4 },
  { id: 4, left: 67, top: 18, size: 12, delay: 1.8 },
  { id: 5, left: 80, top: 62, size: 16, delay: 0.8 },
  { id: 6, left: 90, top: 30, size: 10, delay: 1.4 },
]

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const phase = ref<Phase>('ready')
const remainingMs = ref(DIFFICULTY_CONFIGS[props.difficulty].durationMs)
const roundDurationMs = ref(DIFFICULTY_CONFIGS[props.difficulty].durationMs)
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const calmTapCount = ref(0)
const mainMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].steadyHint)
const showCompletionBadge = ref(false)

let animationFrame = 0
let lastFrameAt = 0
let completionTimer = 0
let roundDirty = false
let hasCompleted = false
let calmCueIndex = 0

const displayDifficulty = computed(() => (phase.value === 'ready' ? props.difficulty : activeDifficulty.value))
const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[displayDifficulty.value])
const progressRatio = computed(() => {
  if (roundDurationMs.value <= 0) {
    return 0
  }

  return Math.min(1, Math.max(0, 1 - remainingMs.value / roundDurationMs.value))
})

const topSandStyle = computed(() => ({
  transform: `scaleY(${Math.max(0.04, 1 - progressRatio.value)})`,
}))

const bottomSandStyle = computed(() => ({
  transform: `scaleY(${Math.max(0.08, progressRatio.value)})`,
}))

const isFlowing = computed(() => phase.value === 'playing' && !props.paused && remainingMs.value > 0)
const remainingLabel = computed(() => `${Math.ceil(remainingMs.value / 1000)} 秒`)
const progressLabel = computed(() => `${Math.round(progressRatio.value * 100)}%`)
const difficultyLabel = computed(() => difficultyConfig.value.label)
const difficultyTag = computed(() => difficultyConfig.value.shortLabel)
const durationLabel = computed(() => `${Math.round(roundDurationMs.value / 1000)} 秒`)
const paused = computed(() => props.paused)

const statusEyebrow = computed(() => {
  if (phase.value === 'ready') return '准备开始'
  if (phase.value === 'playing') return paused.value ? '已暂停' : '正在流动'
  if (phase.value === 'celebrating') return '自然完成'
  return '本轮完成'
})

const statusTitle = computed(() => {
  if (phase.value === 'ready') return '等你轻轻按下开始'
  if (phase.value === 'playing') return paused.value ? '沙漏会从当前位置继续' : '让沙粒慢慢流到底部'
  if (phase.value === 'celebrating') return '倒计时已自然结束'
  return '可以安静退出或等待保存提示'
})

const panelDescription = computed(() => {
  if (phase.value === 'playing') {
    return '现在只需要陪着沙漏继续流动，不抢快，不提前结束，让倒计时自己走完。'
  }

  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '这一轮已经陪着沙漏自然走到了结束，可以安静看看最后落下的沙粒。'
  }

  return difficultyConfig.value.readyDescription
})

const panelHint = computed(() => {
  if (phase.value === 'playing' && paused.value) {
    return '暂停时不会继续计时，恢复后会从当前沙粒位置继续往下流。'
  }

  return helperMessage.value
})

function cancelAnimationFrameLoop() {
  if (!animationFrame) {
    return
  }

  window.cancelAnimationFrame(animationFrame)
  animationFrame = 0
}

function clearCompletionTimer() {
  if (!completionTimer) {
    return
  }

  window.clearTimeout(completionTimer)
  completionTimer = 0
}

function markDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function queueNextFrame() {
  if (animationFrame) {
    return
  }

  animationFrame = window.requestAnimationFrame(updateTimer)
}

function updateTimer(timestamp: number) {
  animationFrame = 0

  if (phase.value !== 'playing') {
    lastFrameAt = 0
    return
  }

  if (props.paused) {
    lastFrameAt = timestamp
    animationFrame = window.requestAnimationFrame(updateTimer)
    return
  }

  if (!lastFrameAt) {
    lastFrameAt = timestamp
  }

  const delta = Math.max(0, timestamp - lastFrameAt)
  lastFrameAt = timestamp
  remainingMs.value = Math.max(0, remainingMs.value - delta)

  if (remainingMs.value <= 0) {
    void finishRoundByTimerEnd()
    return
  }

  animationFrame = window.requestAnimationFrame(updateTimer)
}

function resetForDifficulty(difficulty: EmotionGameDifficulty) {
  const config = DIFFICULTY_CONFIGS[difficulty]
  remainingMs.value = config.durationMs
  roundDurationMs.value = config.durationMs
  mainMessage.value = config.introText
  helperMessage.value = config.steadyHint
}

function startRound() {
  if (phase.value !== 'ready') {
    return
  }

  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  resetForDifficulty(props.difficulty)
  calmTapCount.value = 0
  calmCueIndex = 0
  showCompletionBadge.value = false
  hasCompleted = false
  phase.value = 'playing'
  lastFrameAt = 0
  mainMessage.value = DIFFICULTY_CONFIGS[activeDifficulty.value].introText
  helperMessage.value = DIFFICULTY_CONFIGS[activeDifficulty.value].steadyHint

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // Keep the round playable even if audio preparation fails.
  })
  props.audio.speak('看着沙子慢慢落下，跟着它一起安静等一等。')
  queueNextFrame()
}

function offerCalmCue() {
  if (phase.value !== 'playing' || props.paused) {
    return
  }

  calmTapCount.value += 1
  const cue = CALM_CUES[calmCueIndex % CALM_CUES.length] || CALM_CUES[0] || '继续安静等待。'
  calmCueIndex += 1
  helperMessage.value = cue
  props.audio.playSoftBounce().catch(() => {
    // Soft prompt is optional.
  })

  if (calmTapCount.value === 1 || calmTapCount.value % 3 === 0) {
    props.audio.speak(cue)
  }
}

async function finishRoundByTimerEnd() {
  if (hasCompleted) {
    return
  }

  hasCompleted = true
  cancelAnimationFrameLoop()
  clearCompletionTimer()
  remainingMs.value = 0
  phase.value = 'celebrating'
  mainMessage.value = DIFFICULTY_CONFIGS[activeDifficulty.value].completionText
  helperMessage.value = '沙漏已经自然流完，先安静看看最后停下来的沙粒吧。'
  showCompletionBadge.value = true

  props.audio.stopAmbient()
  await Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak(DIFFICULTY_CONFIGS[activeDifficulty.value].completionText)),
  ])

  completionTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', {
      exitTrigger: 'timer_end',
      performanceData: {
        event: 'timer_end',
        completed_by_timer_end: true,
        planned_duration_ms: roundDurationMs.value,
        elapsed_ms: roundDurationMs.value,
        calm_taps: calmTapCount.value,
        progress_ratio: Number(progressRatio.value.toFixed(3)),
        difficulty_level: activeDifficulty.value,
      },
    })
  }, 900)
}

watch(
  () => props.difficulty,
  (difficulty) => {
    if (phase.value !== 'ready') {
      return
    }

    resetForDifficulty(difficulty)
  },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (phase.value !== 'playing') {
      return
    }

    if (isPaused) {
      props.audio.stopAmbient()
      helperMessage.value = '当前已暂停，恢复后会从沙子停下的位置继续。'
      return
    }

    helperMessage.value = DIFFICULTY_CONFIGS[activeDifficulty.value].steadyHint
    props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
      // Keep resume silent if audio fails.
    })
  },
)

onBeforeUnmount(() => {
  cancelAnimationFrameLoop()
  clearCompletionTimer()
  props.audio.stopAll()
})
</script>

<style scoped>
.hourglass-game {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  min-height: 100%;
  padding: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 242, 191, 0.9), transparent 30%),
    radial-gradient(circle at 80% 16%, rgba(153, 218, 228, 0.35), transparent 28%),
    linear-gradient(135deg, #f3d9ae 0%, #e9bb86 42%, #7fb9c7 100%);
}

.hourglass-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hourglass-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(28px);
  opacity: 0.7;
}

.hourglass-glow--left {
  left: -4%;
  top: 18%;
  width: 260px;
  height: 260px;
  background: rgba(255, 240, 182, 0.85);
}

.hourglass-glow--right {
  right: -5%;
  bottom: 10%;
  width: 320px;
  height: 320px;
  background: rgba(110, 183, 199, 0.38);
}

.backdrop-dot {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.24);
  animation: float-dot 7s ease-in-out infinite;
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

.hud-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid rgba(91, 66, 29, 0.12);
  border-radius: 22px;
  background: rgba(255, 250, 239, 0.72);
  box-shadow: 0 18px 40px rgba(98, 72, 35, 0.12);
  backdrop-filter: blur(14px);
}

.hud-card span {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(106, 77, 35, 0.72);
}

.hud-card strong {
  font-size: 22px;
  color: #5a401f;
}

.stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(360px, 0.85fr);
  gap: 18px;
  align-items: stretch;
}

.stage-panel,
.instruction-panel {
  position: relative;
  border: 1px solid rgba(91, 66, 29, 0.12);
  border-radius: 30px;
  background: rgba(255, 248, 234, 0.72);
  box-shadow: 0 24px 60px rgba(98, 72, 35, 0.12);
  backdrop-filter: blur(16px);
}

.stage-panel {
  padding: 24px;
  min-height: 660px;
}

.status-strip {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.58);
  color: #6b4d25;
}

.status-strip span {
  font-size: 12px;
  letter-spacing: 0.12em;
}

.status-strip strong {
  font-size: 24px;
}

.hourglass-stage {
  position: relative;
  display: flex;
  height: calc(100% - 88px);
  min-height: 540px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
}

.hourglass-frame {
  position: relative;
  width: min(420px, 72%);
  aspect-ratio: 0.7;
  min-width: 280px;
}

.frame-post {
  position: absolute;
  top: 24px;
  bottom: 24px;
  width: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, #8f6130 0%, #6e4b28 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 236, 199, 0.22);
}

.frame-post--left {
  left: 12%;
}

.frame-post--right {
  right: 12%;
}

.frame-cap {
  position: absolute;
  left: 18%;
  right: 18%;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(135deg, #9d6a34 0%, #704927 100%);
  box-shadow: 0 10px 22px rgba(94, 62, 25, 0.18);
}

.frame-cap--top {
  top: 4px;
}

.frame-cap--bottom {
  bottom: 4px;
}

.glass-bulb {
  position: absolute;
  left: 24%;
  width: 52%;
  height: 38%;
  overflow: hidden;
  border: 4px solid rgba(255, 255, 255, 0.55);
  background: linear-gradient(180deg, rgba(255, 253, 249, 0.58), rgba(255, 239, 221, 0.22));
  box-shadow:
    inset 0 0 0 1px rgba(118, 178, 190, 0.3),
    0 20px 42px rgba(99, 71, 35, 0.12);
  backdrop-filter: blur(10px);
}

.glass-bulb--top {
  top: 10%;
  border-radius: 42% 42% 55% 55% / 28% 28% 72% 72%;
}

.glass-bulb--bottom {
  bottom: 10%;
  border-radius: 55% 55% 42% 42% / 72% 72% 28% 28%;
}

.glass-sand {
  position: absolute;
  left: 10%;
  right: 10%;
  background: linear-gradient(180deg, #f8e09d 0%, #f0bc58 100%);
  box-shadow: inset 0 0 26px rgba(255, 248, 221, 0.4);
}

.glass-sand--top {
  bottom: 0;
  height: 72%;
  transform-origin: bottom center;
  clip-path: ellipse(46% 58% at 50% 64%);
}

.glass-sand--bottom {
  bottom: 0;
  height: 78%;
  transform-origin: bottom center;
  clip-path: ellipse(48% 58% at 50% 100%);
}

.glass-neck {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 34px;
  height: 14%;
  transform: translateX(-50%);
}

.sand-stream {
  position: absolute;
  left: 50%;
  top: 6px;
  width: 8px;
  height: calc(100% - 14px);
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(253, 236, 179, 0.9) 0%, rgba(239, 186, 86, 0.95) 100%);
  opacity: 0.24;
}

.sand-stream--active {
  opacity: 1;
  animation: sand-flow 0.75s linear infinite;
}

.sand-spark {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 18px;
  height: 12px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(246, 193, 94, 0.68);
  filter: blur(1px);
}

.glass-highlight {
  position: absolute;
  right: 31%;
  width: 18px;
  height: 26%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0));
  opacity: 0.9;
}

.glass-highlight--top {
  top: 16%;
}

.glass-highlight--bottom {
  bottom: 18%;
}

.breath-orbit {
  position: absolute;
  width: min(500px, 88%);
  aspect-ratio: 1 / 1;
  border: 1px dashed rgba(111, 173, 186, 0.18);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.92);
}

.breath-orbit--active {
  opacity: 1;
  animation: breath-orbit 4.2s ease-in-out infinite;
}

.stage-copy {
  display: flex;
  max-width: 520px;
  flex-direction: column;
  gap: 8px;
  text-align: center;
  color: #5d4321;
}

.stage-copy strong {
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.15;
}

.stage-copy small {
  font-size: 16px;
  color: rgba(93, 67, 33, 0.74);
}

.instruction-panel {
  display: flex;
  min-height: 660px;
  flex-direction: column;
  gap: 18px;
  padding: 28px 26px;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-tags span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  font-size: 13px;
  color: #79542a;
}

.panel-tags .accent {
  background: rgba(123, 181, 193, 0.2);
  color: #295e68;
}

.instruction-panel h2 {
  margin: 0;
  font-size: clamp(34px, 4vw, 46px);
  line-height: 1.05;
  color: #5d4120;
}

.instruction-panel p {
  margin: 0;
  font-size: 18px;
  line-height: 1.7;
  color: #654a24;
}

.instruction-panel small {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(93, 67, 33, 0.74);
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: rgba(95, 69, 32, 0.68);
}

.progress-track {
  position: relative;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
}

.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #f6d989 0%, #efb04c 55%, #78b9c5 100%);
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tip-card {
  display: flex;
  min-height: 116px;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.5);
}

.tip-card strong {
  font-size: 16px;
  color: #5d4120;
}

.tip-card span {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(93, 67, 33, 0.8);
}

.action-row {
  margin-top: auto;
}

.primary-action,
.secondary-action {
  width: 100%;
  min-height: 72px;
  border: none;
  border-radius: 24px;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.primary-action {
  color: #fffaf2;
  background: linear-gradient(135deg, #b87432 0%, #e0a648 100%);
  box-shadow: 0 18px 36px rgba(155, 97, 37, 0.28);
}

.secondary-action {
  color: #4e3a1d;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 14px 28px rgba(95, 69, 32, 0.14);
}

.primary-action:hover,
.secondary-action:hover:not(:disabled) {
  transform: translateY(-2px);
}

.secondary-action:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.completion-note {
  padding: 20px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.58);
  font-size: 16px;
  line-height: 1.7;
  color: #5d4120;
}

.badge-modal {
  position: absolute;
  right: 28px;
  bottom: 28px;
  z-index: 2;
  display: flex;
  width: min(320px, calc(100% - 56px));
  flex-direction: column;
  gap: 8px;
  padding: 22px 24px;
  border-radius: 26px;
  background: rgba(88, 59, 25, 0.9);
  box-shadow: 0 24px 54px rgba(63, 42, 18, 0.26);
  color: #fff7ea;
}

.badge-icon {
  font-size: 36px;
}

.badge-modal strong {
  font-size: 24px;
}

.badge-modal p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 247, 234, 0.82);
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes float-dot {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.32;
  }

  50% {
    transform: translateY(-12px) scale(1.06);
    opacity: 0.68;
  }
}

@keyframes sand-flow {
  0% {
    transform: translateX(-50%) translateY(-4px);
  }

  100% {
    transform: translateX(-50%) translateY(4px);
  }
}

@keyframes breath-orbit {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.18;
  }

  50% {
    transform: scale(1.02);
    opacity: 0.36;
  }
}

@media (max-width: 1180px) {
  .hud-panel,
  .stage-layout,
  .tip-grid {
    grid-template-columns: 1fr;
  }

  .stage-panel,
  .instruction-panel {
    min-height: auto;
  }

  .hourglass-stage {
    min-height: 460px;
  }
}

@media (max-width: 768px) {
  .hourglass-game {
    padding: 16px;
  }

  .hud-card strong {
    font-size: 20px;
  }

  .instruction-panel {
    padding: 22px 18px;
  }

  .instruction-panel h2 {
    font-size: 34px;
  }

  .stage-copy strong {
    font-size: 26px;
  }

  .primary-action,
  .secondary-action {
    min-height: 64px;
    font-size: 20px;
  }

  .badge-modal {
    right: 16px;
    bottom: 16px;
    width: calc(100% - 32px);
  }
}
</style>
