<template>
  <HandCameraLayer class="bubble-pop" @primary-point="handlePrimaryPoint" @hands="handleHands">
    <div class="bubble-pop__topbar">
      <div class="bubble-pop__topbar-section bubble-pop__topbar-section--left">
        <button type="button" class="bubble-pop__back-button" @click="emit('back')">
          返回准备页
        </button>
      </div>

      <div class="bubble-pop__topbar-section bubble-pop__topbar-section--center">
        <button
          v-for="option in modeOptions"
          :key="option.id"
          type="button"
          class="bubble-pop__chip"
          :class="{ 'is-active': currentMode === option.id }"
          @click="switchMode(option.id)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="bubble-pop__topbar-section bubble-pop__topbar-section--right">
        <button
          v-for="option in difficultyOptions"
          :key="option.id"
          type="button"
          class="bubble-pop__chip bubble-pop__chip--difficulty"
          :class="{ 'is-active': currentDifficulty === option.id }"
          @click="switchDifficulty(option.id)"
        >
          {{ option.shortLabel }}
        </button>
      </div>
    </div>

    <div
      ref="boardRef"
      class="bubble-pop__board"
      @pointerdown.prevent="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @pointerleave="handlePointerLeave"
    >
      <canvas ref="canvasRef" class="bubble-pop__canvas" />

      <div v-if="currentMode === 'color' && targetColor" class="bubble-pop__target-strip">
        <span class="bubble-pop__target-label">请戳</span>
        <span class="bubble-pop__target-dot" :style="{ background: targetColor.hex }" />
        <strong>{{ targetColor.name }}泡泡</strong>
        <span class="bubble-pop__target-progress">{{ targetProgressLabel }}</span>
      </div>

      <div class="bubble-pop__hud">
        <div class="bubble-pop__hud-card">
          <span class="bubble-pop__hud-label">得分</span>
          <strong>{{ score }}</strong>
        </div>
        <div class="bubble-pop__hud-card">
          <span class="bubble-pop__hud-label">连击</span>
          <strong>×{{ comboDisplay }}</strong>
        </div>
        <div class="bubble-pop__hud-card">
          <span class="bubble-pop__hud-label">{{ progressLabel }}</span>
          <strong>{{ progressValue }}</strong>
        </div>
      </div>

      <div class="bubble-pop__hint">
        {{ interactionHint }}
      </div>

      <div
        v-for="burst in comboBursts"
        :key="burst.id"
        class="bubble-pop__combo-burst"
        :style="comboBurstStyle(burst)"
        aria-hidden="true"
      >
        {{ burst.text }}
      </div>

      <div v-if="showOverlay" class="bubble-pop__overlay" :class="`is-${finishReason || 'active'}`">
        <div class="bubble-pop__overlay-card">
          <div class="bubble-pop__overlay-icon">
            {{ finishReason === 'goal' ? '🎉' : '🫧' }}
          </div>
          <h2>{{ overlayTitle }}</h2>
          <p>{{ overlaySummary }}</p>
          <div class="bubble-pop__overlay-stats">
            <span>得分 {{ score }}</span>
            <span>最高连击 ×{{ maxComboDisplay }}</span>
            <span>{{ overlayProgress }}</span>
          </div>
          <div class="bubble-pop__overlay-actions">
            <button type="button" class="bubble-pop__action bubble-pop__action--secondary" @click="restartCurrentRun">
              再玩一次
            </button>
            <button type="button" class="bubble-pop__action bubble-pop__action--primary" @click="finishSession">
              完成训练
            </button>
          </div>
        </div>
      </div>
    </div>
  </HandCameraLayer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import HandCameraLayer from '@/components/games/hand/HandCameraLayer.vue'
import {
  applyBubblePopContacts,
  advanceBubblePopState,
  createBubblePopState,
  getBubblePopTargetColor,
  sanitizeBubblePopFreeModeDuration,
  sanitizeBubblePopDifficulty,
  sanitizeBubblePopMode,
  summarizeBubblePopSession,
  switchBubblePopDifficulty,
  switchBubblePopMode,
  type BubblePopComboBurst,
  type BubblePopDifficultyId,
  type BubblePopFreeModeDuration,
  type BubblePopModeId,
  type BubblePopState,
} from '@/components/games/hand/bubble-pop-game'
import type { HandObservation } from '@/composables/useHandLandmarker'
import { TaskID, type GameSessionData } from '@/types/games'
import {
  getCollisionFingerPoints,
  mapLandmarkToNormalizedStagePoint,
  type StagePoint,
  type StageSize,
} from '@/utils/hand-game-gestures'

const props = withDefaults(defineProps<{
  studentId: number
  taskId?: TaskID
  duration?: number
  mode?: BubblePopModeId
  difficulty?: BubblePopDifficultyId
}>(), {
  taskId: TaskID.HAND_BUBBLE_POP,
  duration: 60,
  mode: 'free',
  difficulty: 'normal',
})

const emit = defineEmits<{
  finish: [session: GameSessionData]
  back: []
}>()

const boardRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const latestHands = ref<HandObservation[]>([])
const latestPrimaryPoint = ref<StagePoint | null>(null)
const freeModeDuration = ref<BubblePopFreeModeDuration>(sanitizeBubblePopFreeModeDuration(props.duration))
const currentMode = ref<BubblePopModeId>(sanitizeBubblePopMode(props.mode))
const currentDifficulty = ref<BubblePopDifficultyId>(sanitizeBubblePopDifficulty(props.difficulty))
const score = ref(0)
const comboDisplay = ref(1)
const maxComboDisplay = ref(1)
const progressValue = ref(`${freeModeDuration.value}秒`)
const showOverlay = ref(false)
const finishReason = ref<'timeout' | 'goal' | null>(null)
const comboBursts = ref<BubblePopComboBurst[]>([])
const targetColor = ref<ReturnType<typeof getBubblePopTargetColor>>(null)
const correctHitCount = ref(0)
const pointerFallbackUsed = ref(false)
const handTrackingObserved = ref(false)
const targetProgressLabel = ref('0 / 5')
const stageSize = reactive<StageSize>({ width: 1280, height: 720 })

const modeOptions = [
  { id: 'free', label: '🎯 自由' },
  { id: 'color', label: '🎨 分类' },
] as const

const difficultyOptions = [
  { id: 'easy', shortLabel: '简单' },
  { id: 'normal', shortLabel: '普通' },
  { id: 'hard', shortLabel: '困难' },
] as const
let animationFrameId = 0
let resizeObserver: ResizeObserver | null = null
let audioContext: AudioContext | null = null
let pointerPressActive = false
let bubbleState: BubblePopState = createBubblePopState({
  mode: currentMode.value,
  difficulty: currentDifficulty.value,
  durationMs: freeModeDuration.value * 1000,
  stageSize,
  now: performance.now(),
})
const pendingPointerContacts: StagePoint[] = []

const progressLabel = computed(() => currentMode.value === 'color' ? '目标进度' : '剩余时间')
const overlayTitle = computed(() => {
  if (finishReason.value === 'goal') {
    return '泡泡任务完成啦'
  }

  return currentMode.value === 'color' ? '先休息一下' : '时间到，真棒'
})
const overlaySummary = computed(() => {
  if (finishReason.value === 'goal') {
    return '你已经完成了颜色分类目标，继续保持这种稳定又准确的戳击节奏。'
  }

  if (currentMode.value === 'color') {
    return '这一轮已经记录到结果，可以立刻再玩一次继续练颜色分类。'
  }

  return `${freeModeDuration.value} 秒自由模式训练完成了，马上再来一轮也可以。`
})
const overlayProgress = computed(() => {
  if (currentMode.value === 'color') {
    return `命中 ${correctHitCount.value}/20`
  }

  return `命中 ${correctHitCount.value} 个`
})
const interactionHint = computed(() => {
  if (showOverlay.value) {
    return '可以直接再玩一次，或者点击完成训练返回记录本次结果。'
  }

  if (latestHands.value.length > 0) {
    return currentMode.value === 'color'
      ? '用食指或中指去戳目标颜色，戳错会扣分并打断连击。'
      : '伸出手去戳泡泡吧，也可以连续滑过多个泡泡打出连击。'
  }

  if (pointerPressActive || latestPrimaryPoint.value) {
    return '摄像头没准备好也没关系，按住鼠标或直接触摸泡泡同样可以玩。'
  }

  return '把手放到摄像头前，或者直接用鼠标、触摸点按泡泡开始训练。'
})

function syncBoardSize() {
  const rect = boardRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  stageSize.width = Math.max(1, rect.width)
  stageSize.height = Math.max(1, rect.height)

  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(stageSize.width * dpr)
  canvas.height = Math.round(stageSize.height * dpr)
  canvas.style.width = `${stageSize.width}px`
  canvas.style.height = `${stageSize.height}px`
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) {
    return null
  }

  if (!audioContext) {
    audioContext = new AudioContextClass()
  }

  return audioContext
}

async function playTone(
  type: OscillatorType,
  startFrequency: number,
  endFrequency: number,
  durationMs: number,
  gainAmount: number,
) {
  const ctx = getAudioContext()
  if (!ctx) {
    return
  }

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => undefined)
  }

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + durationMs / 1000)
  gain.gain.setValueAtTime(Math.max(0.001, gainAmount), ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + durationMs / 1000)
}

function playPopSound(comboLevel: number) {
  void playTone('sine', 660 + comboLevel * 35, 980 + comboLevel * 45, 180, 0.22)
}

function playWrongSound() {
  void playTone('sawtooth', 220, 140, 160, 0.18)
}

function playComboSound(comboLevel: number) {
  void playTone('triangle', 440 + comboLevel * 70, 660 + comboLevel * 80, 220, 0.18)
}

function pointFromEvent(event: PointerEvent): StagePoint | null {
  const rect = boardRef.value?.getBoundingClientRect()
  if (!rect) {
    return null
  }

  return {
    x: (event.clientX - rect.left) / Math.max(1, rect.width),
    y: (event.clientY - rect.top) / Math.max(1, rect.height),
  }
}

function enqueuePointerContact(point: StagePoint | null) {
  if (!point) {
    return
  }

  pendingPointerContacts.push(point)
  pointerFallbackUsed.value = true
}

function handlePointerDown(event: PointerEvent) {
  pointerPressActive = true
  enqueuePointerContact(pointFromEvent(event))
}

function handlePointerMove(event: PointerEvent) {
  if (!pointerPressActive && event.pointerType !== 'touch' && event.buttons === 0) {
    return
  }

  enqueuePointerContact(pointFromEvent(event))
}

function handlePointerUp() {
  pointerPressActive = false
}

function handlePointerLeave() {
  pointerPressActive = false
}

function handlePrimaryPoint(point: StagePoint | null) {
  latestPrimaryPoint.value = point
}

function handleHands(hands: HandObservation[]) {
  latestHands.value = hands
  if (hands.length > 0) {
    handTrackingObserved.value = true
  }
}

function collectHandContactPoints() {
  const contactPoints: StagePoint[] = []

  latestHands.value.forEach((hand) => {
    const tips = getCollisionFingerPoints(hand.landmarks)
    tips.forEach((tip) => {
      contactPoints.push(mapLandmarkToNormalizedStagePoint(tip))
    })
  })

  return contactPoints
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.arc(x + size * 0.9, y - size * 0.3, size * 0.75, 0, Math.PI * 2)
  ctx.arc(x + size * 1.8, y, size * 0.85, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fill()
}

function drawBackground(ctx: CanvasRenderingContext2D, now: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, stageSize.height)
  gradient.addColorStop(0, '#87CEEB')
  gradient.addColorStop(1, '#E0F4FF')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, stageSize.width, stageSize.height)

  const clouds = [
    { ox: 0.08, oy: 0.11, size: 56 },
    { ox: 0.42, oy: 0.08, size: 44 },
    { ox: 0.74, oy: 0.16, size: 62 },
  ]

  ctx.save()
  ctx.globalAlpha = 0.52
  clouds.forEach((cloud) => {
    const x = ((cloud.ox * stageSize.width + now * 0.02) % (stageSize.width + 220)) - 110
    drawCloud(ctx, x, cloud.oy * stageSize.height, cloud.size)
  })
  ctx.restore()
}

function drawBubbles(ctx: CanvasRenderingContext2D, now: number) {
  const scale = stageSize.width / 1920
  bubbleState.bubbles.forEach((bubble) => {
    if (bubble.popped) {
      return
    }

    const radius = bubble.radius * scale
    const x = bubble.x * stageSize.width
    const y = bubble.y * stageSize.height
    const shake = bubble.shakeUntil > now ? Math.sin(now / 28 + bubble.id) * 9 : 0

    ctx.save()
    ctx.translate(x + shake, y)
    ctx.rotate(bubble.rotation)
    ctx.globalAlpha = Math.max(0.24, bubble.alpha)
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fillStyle = `${bubble.colorHex}bb`
    ctx.strokeStyle = bubble.colorHex
    ctx.lineWidth = Math.max(2, scale * 5)
    ctx.fill()
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(-radius * 0.28, -radius * 0.3, radius * 0.22, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(-radius * 0.12, -radius * 0.12, radius * 0.1, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fill()

    if (currentDifficulty.value === 'hard') {
      ctx.beginPath()
      ctx.arc(radius * 0.1, radius * 0.14, radius * 0.28, 0, Math.PI * 1.6)
      ctx.strokeStyle = 'rgba(255,255,255,0.24)'
      ctx.lineWidth = Math.max(1.5, scale * 3)
      ctx.stroke()
    }

    ctx.restore()
  })
}

function drawEffects(ctx: CanvasRenderingContext2D) {
  const scale = stageSize.width / 1920

  bubbleState.rings.forEach((ring) => {
    ctx.save()
    ctx.globalAlpha = Math.max(0, ring.life) * 0.65
    ctx.beginPath()
    ctx.arc(ring.x * stageSize.width, ring.y * stageSize.height, ring.radius * scale, 0, Math.PI * 2)
    ctx.strokeStyle = ring.color
    ctx.lineWidth = Math.max(2, scale * 5)
    ctx.stroke()
    ctx.restore()
  })

  bubbleState.particles.forEach((particle) => {
    ctx.save()
    ctx.globalAlpha = Math.max(0, particle.life)
    ctx.beginPath()
    ctx.arc(
      particle.x * stageSize.width,
      particle.y * stageSize.height,
      Math.max(2, particle.size * scale * 0.6),
      0,
      Math.PI * 2,
    )
    ctx.fillStyle = particle.color
    ctx.fill()
    ctx.restore()
  })

  bubbleState.floatTexts.forEach((text) => {
    ctx.save()
    ctx.globalAlpha = Math.max(0, text.life)
    ctx.fillStyle = text.color
    ctx.font = `700 ${Math.max(20, scale * 42)}px "Trebuchet MS", "Segoe UI", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(text.text, text.x * stageSize.width, text.y * stageSize.height)
    ctx.restore()
  })
}

function drawScene(now: number) {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, stageSize.width, stageSize.height)
  drawBackground(ctx, now)
  drawBubbles(ctx, now)
  drawEffects(ctx)

  if (finishReason.value === 'goal' && bubbleState.finishedAt && now - bubbleState.finishedAt < 160) {
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillRect(0, 0, stageSize.width, stageSize.height)
    ctx.restore()
  }
}

function syncUiState(now: number) {
  score.value = bubbleState.score
  comboDisplay.value = Math.max(1, bubbleState.combo - 1)
  maxComboDisplay.value = bubbleState.maxCombo
  comboBursts.value = [...bubbleState.comboBursts]
  targetColor.value = getBubblePopTargetColor(bubbleState)
  correctHitCount.value = bubbleState.correctHits
  showOverlay.value = bubbleState.isFinished
  finishReason.value = bubbleState.finishReason

  if (currentMode.value === 'color') {
    progressValue.value = `${bubbleState.correctHits}/20`
    targetProgressLabel.value = `${bubbleState.targetProgress}/5`
  } else {
    const remainingSeconds = Math.max(0, Math.ceil((bubbleState.durationMs - (now - bubbleState.startedAt)) / 1000))
    progressValue.value = `${remainingSeconds}秒`
  }
}

function handleHitSounds(hitCount: number, hasWrongHit: boolean) {
  if (hasWrongHit) {
    playWrongSound()
    return
  }

  const comboLevel = Math.max(1, bubbleState.combo - 1)
  playPopSound(comboLevel)
  if (comboLevel >= 3 && hitCount > 0) {
    playComboSound(comboLevel)
  }
}

function tick(now: number) {
  advanceBubblePopState(bubbleState, { now, stageSize })

  const contacts = [
    ...collectHandContactPoints(),
    ...pendingPointerContacts.splice(0, pendingPointerContacts.length),
  ]

  if (contacts.length > 0) {
    const result = applyBubblePopContacts(bubbleState, contacts, now)
    const hasWrongHit = result.hits.some((hit) => !hit.isCorrect)
    if (result.hits.length > 0) {
      handleHitSounds(result.hits.length, hasWrongHit)
    }
  }

  drawScene(now)
  syncUiState(now)
  animationFrameId = window.requestAnimationFrame(tick)
}

function resetRun(now = performance.now()) {
  pointerPressActive = false
  pointerFallbackUsed.value = false
  handTrackingObserved.value = false
  latestHands.value = []
  latestPrimaryPoint.value = null
  pendingPointerContacts.length = 0
  bubbleState = createBubblePopState({
    mode: currentMode.value,
    difficulty: currentDifficulty.value,
    durationMs: freeModeDuration.value * 1000,
    stageSize,
    now,
  })
  syncUiState(now)
}

function restartCurrentRun() {
  resetRun()
}

function switchMode(mode: BubblePopModeId) {
  currentMode.value = mode
  switchBubblePopMode(bubbleState, mode, performance.now())
  syncUiState(performance.now())
}

function switchDifficulty(difficulty: BubblePopDifficultyId) {
  currentDifficulty.value = difficulty
  switchBubblePopDifficulty(bubbleState, difficulty, performance.now())
  syncUiState(performance.now())
}

function finishSession() {
  emit('finish', summarizeBubblePopSession(bubbleState, {
    taskId: props.taskId,
    studentId: props.studentId,
    handTrackingUsed: handTrackingObserved.value,
    pointerFallbackUsed: pointerFallbackUsed.value,
  }))
}

function comboBurstStyle(burst: BubblePopComboBurst) {
  return {
    left: `${burst.x * 100}%`,
    top: `${burst.y * 100}%`,
    color: burst.color,
  }
}

watch(() => props.mode, (value) => {
  currentMode.value = sanitizeBubblePopMode(value)
  resetRun()
})

watch(() => props.difficulty, (value) => {
  currentDifficulty.value = sanitizeBubblePopDifficulty(value)
  resetRun()
})

watch(() => props.duration, (value) => {
  freeModeDuration.value = sanitizeBubblePopFreeModeDuration(value)
  resetRun()
})

onMounted(() => {
  syncBoardSize()
  if (boardRef.value) {
    resizeObserver = new ResizeObserver(syncBoardSize)
    resizeObserver.observe(boardRef.value)
  }
  syncUiState(performance.now())
  animationFrameId = window.requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
  }
  resizeObserver?.disconnect()
  audioContext?.close().catch(() => undefined)
})
</script>

<style scoped>
.bubble-pop__board {
  position: absolute;
  inset: 0;
  z-index: 3;
  touch-action: none;
  overflow: hidden;
}

.bubble-pop__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.bubble-pop__topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 60px;
  padding: 0 16px;
  pointer-events: none;
}

.bubble-pop__topbar-section {
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  min-width: 0;
  pointer-events: auto;
}

.bubble-pop__topbar-section--left {
  justify-content: flex-start;
}

.bubble-pop__topbar-section--center {
  justify-content: center;
}

.bubble-pop__topbar-section--right {
  justify-content: flex-end;
}

.bubble-pop__back-button {
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.22);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.bubble-pop__back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 32px rgba(15, 118, 110, 0.26);
}

.bubble-pop__chip {
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  color: #31506a;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.14);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.bubble-pop__chip:hover {
  transform: translateY(-1px);
}

.bubble-pop__chip.is-active {
  color: #fff;
  background: linear-gradient(135deg, #38bdf8, #2563eb);
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.22);
}

.bubble-pop__chip--difficulty.is-active {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
}

.bubble-pop__target-strip {
  position: absolute;
  top: 86px;
  left: 50%;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 20px;
  border-radius: 999px;
  color: #17324d;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 34px rgba(14, 116, 144, 0.14);
  transform: translateX(-50%);
}

.bubble-pop__target-label,
.bubble-pop__target-progress {
  font-size: 13px;
  font-weight: 700;
  color: #51708a;
}

.bubble-pop__target-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.15);
}

.bubble-pop__hud {
  position: absolute;
  right: 22px;
  bottom: 24px;
  z-index: 5;
  display: grid;
  gap: 10px;
  width: min(240px, calc(100% - 44px));
}

.bubble-pop__hud-card {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 22px;
  color: #17324d;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 32px rgba(30, 64, 175, 0.12);
}

.bubble-pop__hud-card strong {
  font-size: 22px;
}

.bubble-pop__hud-label {
  font-size: 13px;
  font-weight: 700;
  color: #62809b;
}

.bubble-pop__hint {
  position: absolute;
  left: 22px;
  bottom: 24px;
  z-index: 5;
  max-width: min(520px, calc(100% - 310px));
  padding: 14px 18px;
  border-radius: 24px;
  color: #24415b;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 18px 34px rgba(30, 64, 175, 0.1);
  font-size: 13px;
  line-height: 1.7;
}

.bubble-pop__combo-burst {
  position: absolute;
  z-index: 6;
  font-size: 32px;
  font-weight: 800;
  text-shadow: 0 8px 24px rgba(255, 255, 255, 0.48);
  transform: translate(-50%, -50%);
  animation: combo-burst-pop 0.8s ease-out forwards;
  pointer-events: none;
}

.bubble-pop__overlay {
  position: absolute;
  inset: 0;
  z-index: 7;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(6px);
}

.bubble-pop__overlay-card {
  width: min(480px, 100%);
  padding: 28px 26px;
  border-radius: 30px;
  color: #17324d;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.96)),
    linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(56, 189, 248, 0.1));
  box-shadow: 0 26px 54px rgba(15, 23, 42, 0.22);
  text-align: center;
  animation: bubble-overlay-rise 0.26s ease;
}

.bubble-pop__overlay-icon {
  font-size: 46px;
}

.bubble-pop__overlay-card h2 {
  margin: 10px 0 8px;
  font-size: 28px;
}

.bubble-pop__overlay-card p {
  margin: 0;
  color: #57748e;
  line-height: 1.8;
}

.bubble-pop__overlay-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
}

.bubble-pop__overlay-stats span {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  color: #24415b;
  background: rgba(255, 255, 255, 0.9);
}

.bubble-pop__overlay-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
  justify-content: center;
}

.bubble-pop__action {
  min-width: 130px;
  min-height: 46px;
  border: 0;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
}

.bubble-pop__action--secondary {
  color: #31506a;
  background: rgba(255, 255, 255, 0.96);
}

.bubble-pop__action--primary {
  color: #fff;
  background: linear-gradient(135deg, #22c55e, #0ea5e9);
  box-shadow: 0 16px 28px rgba(14, 165, 233, 0.24);
}

@keyframes combo-burst-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -40%) scale(0.7);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -58%) scale(1.06);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -112%) scale(1.02);
  }
}

@keyframes bubble-overlay-rise {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 900px) {
  .bubble-pop__target-strip {
    top: 118px;
    max-width: calc(100% - 24px);
  }

  .bubble-pop__topbar {
    gap: 8px;
    padding: 0 12px;
  }

  .bubble-pop__topbar-section {
    gap: 6px;
  }

  .bubble-pop__back-button,
  .bubble-pop__chip {
    min-height: 38px;
    padding: 0 10px;
    font-size: 12px;
  }

  .bubble-pop__hud {
    right: 14px;
    left: 14px;
    bottom: 14px;
    width: auto;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .bubble-pop__hint {
    left: 14px;
    right: 14px;
    bottom: 156px;
    max-width: none;
  }
}
</style>
