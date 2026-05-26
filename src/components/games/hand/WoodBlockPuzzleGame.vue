<template>
  <HandCameraLayer class="wood-block-game" @primary-point="handlePrimaryPoint" @hands="handleHands">
    <div
      ref="boardRef"
      class="wood-block-game__board"
      @pointerup="releasePointerPiece"
      @pointercancel="releasePointerPiece"
    >
      <div class="wood-block-game__topbar">
        <div class="wood-block-game__difficulty">
          <button
            v-for="option in difficultyOptions"
            :key="option.id"
            type="button"
            class="wood-block-game__difficulty-button"
            :class="{ 'is-active': currentDifficulty === option.id }"
            @click="initGame(option.id)"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="wood-block-game__hud">
          <strong>{{ placedCount }}/{{ pieces.length }}</strong>
          <span>错误 {{ failedAttempts }} 次</span>
          <span>得分 {{ score }}</span>
          <span v-if="remainingSeconds > 0">剩余 {{ remainingSeconds }} 秒</span>
        </div>
      </div>

      <div
        v-for="slot in slots"
        :key="slot.id"
        class="wood-block-game__slot"
        :class="{
          'is-matched': slot.matched,
          'is-bouncing': slot.bouncing,
          'is-hinted': slot.hinted,
        }"
        :style="getSlotStyle(slot)"
      >
        <div class="wood-block-game__slot-shape" v-html="getSlotSvg(slot.id)" />
        <div class="wood-block-game__slot-label">{{ slot.label }}</div>
        <div v-if="slot.showCheck" class="wood-block-game__slot-check">✅</div>
        <div v-if="slot.hinted" class="wood-block-game__slot-hint">这里</div>
      </div>

      <button
        v-for="piece in pieces"
        :key="piece.id"
        type="button"
        class="wood-block-game__piece"
        :class="{
          'is-placed': piece.placed,
          'is-dragging': piece.dragging,
          'is-disabled': isInteractionLocked || piece.animating,
        }"
        :style="getPieceStyle(piece)"
        :disabled="piece.placed || isInteractionLocked || piece.animating"
        @pointerdown.prevent="startPointerPiece(piece.id)"
      >
        <span class="wood-block-game__piece-motion" :class="{ 'is-shaking': piece.shaking }">
          <WoodenShapeBlock
            class="wood-block-game__piece-shape"
            :shape-id="piece.id"
            :color="piece.color"
            :rotation="piece.rotation"
            :scale="piece.dragging ? 1.08 : 1"
            :dimmed="piece.placed"
            :elevated="piece.dragging"
          />
        </span>
      </button>

      <div
        v-for="particle in particles"
        :key="particle.id"
        class="wood-block-game__particle"
        :style="getParticleStyle(particle)"
      />

      <div
        v-for="wave in celebrationWaves"
        :key="wave.id"
        class="wood-block-game__celebration-wave"
        :style="getCelebrationWaveStyle(wave)"
      />

      <div class="wood-block-game__hint">
        {{ interactionHint }}
      </div>

      <div v-if="flashOverlayVisible" class="wood-block-game__flash" />

      <div v-if="showOverlay" class="wood-block-game__overlay" :class="`is-${gameState}`">
        <div class="wood-block-game__overlay-card">
          <div class="wood-block-game__overlay-icon">
            {{ gameState === 'success' ? '🎉' : '⏰' }}
          </div>
          <h2>{{ overlayTitle }}</h2>
          <p>{{ overlaySummary }}</p>
          <div class="wood-block-game__overlay-stats">
            <span>用时 {{ completedDurationLabel }}</span>
            <span>错误 {{ failedAttempts }} 次</span>
          </div>
          <div v-if="overlayActionsVisible" class="wood-block-game__overlay-actions">
            <button type="button" class="wood-block-game__action wood-block-game__action--secondary" @click="initGame(currentDifficulty)">
              {{ gameState === 'success' ? '再玩一次' : '再试一次' }}
            </button>
            <button type="button" class="wood-block-game__action wood-block-game__action--primary" @click="finishSession">
              {{ gameState === 'success' ? '完成训练' : '结束训练' }}
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
import WoodenShapeBlock from '@/components/games/shared/WoodenShapeBlock.vue'
import {
  WOOD_BLOCK_DIFFICULTIES,
  createWoodBlockLayout,
  findNearestWoodBlockPiece,
  getWoodBlockDifficultyLabel,
  renderWoodBlockShapeSvg,
  resolveWoodBlockDropOutcome,
  sanitizeWoodBlockDifficulty,
  summarizeWoodBlockSession,
  type WoodBlockDifficultyId,
  type WoodBlockPieceLayout,
  type WoodBlockSlotLayout,
} from '@/components/games/hand/wood-block-puzzle'
import { isPinching, type StagePoint, type StageSize } from '@/utils/hand-game-gestures'
import { TaskID, type GameSessionData } from '@/types/games'
import type { HandObservation } from '@/composables/useHandLandmarker'

interface PieceState extends WoodBlockPieceLayout {
  placed: boolean
  dragging: boolean
  animating: boolean
  shaking: boolean
}

interface SlotState extends WoodBlockSlotLayout {
  matched: boolean
  bouncing: boolean
  hinted: boolean
  showCheck: boolean
}

interface ParticleState {
  id: number
  x: number
  y: number
  size: number
  color: string
  dx: string
  dy: string
  duration: string
  delay: string
}

interface CelebrationWaveState {
  id: number
  color: string
  delay: string
}

type DragInputMode = 'hand' | 'pointer' | null
type GameState = 'playing' | 'success' | 'timeout'

const props = withDefaults(defineProps<{
  studentId: number
  taskId?: TaskID
  difficulty?: WoodBlockDifficultyId
}>(), {
  taskId: TaskID.HAND_WOOD_BLOCKS,
  difficulty: 'mid',
})

const emit = defineEmits<{
  finish: [session: GameSessionData]
}>()

const difficultyOptions = [
  { id: 'low', label: '简单' },
  { id: 'mid', label: '普通' },
  { id: 'high', label: '困难' },
] as const satisfies Array<{ id: WoodBlockDifficultyId; label: string }>

const boardRef = ref<HTMLElement | null>(null)
const boardSize = reactive<StageSize>({ width: 1, height: 1 })
const currentDifficulty = ref<WoodBlockDifficultyId>(sanitizeWoodBlockDifficulty(props.difficulty))
const pieces = ref<PieceState[]>([])
const slots = ref<SlotState[]>([])
const particles = ref<ParticleState[]>([])
const celebrationWaves = ref<CelebrationWaveState[]>([])
const latestHands = ref<HandObservation[]>([])
const startedAt = ref(Date.now())
const endedAt = ref<number | null>(null)
const failedAttempts = ref(0)
const gestureEvents = ref(0)
const remainingSeconds = ref(0)
const draggingPieceId = ref<string | null>(null)
const gameState = ref<GameState>('playing')
const overlayActionsVisible = ref(false)
const flashOverlayVisible = ref(false)
const pointerFallbackUsed = ref(false)
const handTrackingObserved = ref(false)
const wasPinching = ref(false)

let resizeObserver: ResizeObserver | null = null
let countdownIntervalId: number | null = null
let audioContext: AudioContext | null = null
let particleId = 0
let waveId = 0
let dragInputMode: DragInputMode = null
const scheduledTimeouts = new Set<number>()

const currentConfig = computed(() => WOOD_BLOCK_DIFFICULTIES[currentDifficulty.value])
const placedCount = computed(() => pieces.value.filter((piece) => piece.placed).length)
const score = computed(() => Math.max(0, placedCount.value * 100 - failedAttempts.value * 8))
const isInteractionLocked = computed(() => gameState.value !== 'playing')
const showOverlay = computed(() => gameState.value !== 'playing')
const overlayTitle = computed(() => {
  if (gameState.value === 'success') {
    return '🎉 太棒了！'
  }
  return '时间到，先休息一下'
})
const overlaySummary = computed(() => {
  if (gameState.value === 'success') {
    return `你完成了 ${getWoodBlockDifficultyLabel(currentDifficulty.value)} 拼图，所有木块都找到了正确的家。`
  }
  return `已经完成 ${placedCount.value}/${pieces.value.length} 块，点击再试一次可以立刻重开。`
})
const completedDurationLabel = computed(() => {
  const endTime = endedAt.value ?? Date.now()
  const seconds = Math.max(1, Math.round((endTime - startedAt.value) / 1000))
  return `${seconds} 秒`
})
const interactionHint = computed(() => {
  if (draggingPieceId.value) {
    return '松开手指或抬起鼠标，把木块吸附到对应轮廓里。'
  }

  if (handTrackingObserved.value) {
    return '做出捏取动作抓起木块，也可以直接拖动作为备用操作。'
  }

  return '把手放到摄像头前做捏取动作，或直接拖动木块开始训练。'
})

function schedule(callback: () => void, delay: number) {
  const timeoutId = window.setTimeout(() => {
    scheduledTimeouts.delete(timeoutId)
    callback()
  }, delay)
  scheduledTimeouts.add(timeoutId)
}

function clearScheduledTimeouts() {
  scheduledTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
  scheduledTimeouts.clear()
}

function stopTimer() {
  if (countdownIntervalId !== null) {
    window.clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }
}

function resetInteractionState() {
  draggingPieceId.value = null
  dragInputMode = null
  wasPinching.value = false
}

function syncBoardSize() {
  const rect = boardRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  boardSize.width = Math.max(1, rect.width)
  boardSize.height = Math.max(1, rect.height)
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

async function playBeep(startFrequency: number, endFrequency: number, durationMs: number, gainAmount: number) {
  const ctx = getAudioContext()
  if (!ctx) {
    return
  }

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => undefined)
  }

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(startFrequency, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + durationMs / 1000)
  gain.gain.setValueAtTime(Math.max(0.001, gainAmount), ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + durationMs / 1000)
}

function playSuccessBeep() {
  void playBeep(520, 880, 250, 0.3)
}

function playFailureBeep() {
  void playBeep(220, 160, 150, 0.24)
}

function getSlotById(slotId: string) {
  return slots.value.find((slot) => slot.id === slotId) || null
}

function getPieceById(pieceId: string) {
  return pieces.value.find((piece) => piece.id === pieceId) || null
}

function getSlotStyle(slot: SlotState) {
  return {
    left: `${slot.x * 100}%`,
    top: `${slot.y * 100}%`,
    width: `${slot.size}px`,
    height: `${slot.size}px`,
    '--slot-accent': slot.color,
  }
}

function getPieceStyle(piece: PieceState) {
  return {
    left: `${piece.x * 100}%`,
    top: `${piece.y * 100}%`,
    width: `${piece.size}px`,
    height: `${piece.size}px`,
  }
}

function getParticleStyle(particle: ParticleState) {
  return {
    left: `${particle.x}px`,
    top: `${particle.y}px`,
    width: `${particle.size}px`,
    height: `${particle.size}px`,
    background: particle.color,
    '--dx': particle.dx,
    '--dy': particle.dy,
    '--particle-duration': particle.duration,
    '--particle-delay': particle.delay,
  }
}

function getCelebrationWaveStyle(wave: CelebrationWaveState) {
  return {
    '--wave-color': wave.color,
    '--wave-delay': wave.delay,
  }
}

function getSlotSvg(slotId: string) {
  return renderWoodBlockShapeSvg(slotId as any, 'slot')
}

function spawnParticles(x: number, y: number, count = 24) {
  const colors = ['#FFD700', '#FF6B6B', '#4CAF50', '#42A5F5', '#AB47BC', '#FF9800'] as const
  const nextParticles: ParticleState[] = []

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count
    const distance = 60 + Math.random() * 60
    nextParticles.push({
      id: particleId += 1,
      x,
      y,
      size: 6 + Math.random() * 8,
      color: colors[index % colors.length] ?? colors[0],
      dx: `${Math.cos(angle) * distance}px`,
      dy: `${Math.sin(angle) * distance}px`,
      duration: `${0.72 + Math.random() * 0.2}s`,
      delay: `${Math.random() * 0.06}s`,
    })
  }

  particles.value = [...particles.value, ...nextParticles]
  schedule(() => {
    const ids = new Set(nextParticles.map((particle) => particle.id))
    particles.value = particles.value.filter((particle) => !ids.has(particle.id))
  }, 950)
}

function spawnSweepParticles() {
  const burstCount = 18
  for (let index = 0; index < burstCount; index += 1) {
    spawnParticles(
      (boardSize.width / burstCount) * index + Math.random() * 24,
      boardSize.height - 32,
      4,
    )
  }
}

function showHintForSlot(slotId: string) {
  const slot = getSlotById(slotId)
  if (!slot) {
    return
  }

  slot.hinted = true
  schedule(() => {
    slot.hinted = false
  }, 3000)
}

function returnPieceHome(piece: PieceState, delay = 0) {
  const animateBack = () => {
    piece.x = piece.homeX
    piece.y = piece.homeY
    piece.rotation = piece.homeRotation
    schedule(() => {
      piece.animating = false
    }, 220)
  }

  if (delay <= 0) {
    animateBack()
    return
  }

  schedule(animateBack, delay)
}

function finalizeDraggingPiece() {
  const piece = draggingPieceId.value ? getPieceById(draggingPieceId.value) : null
  if (piece) {
    piece.dragging = false
  }

  resetInteractionState()
}

function beginSuccessCelebration() {
  if (gameState.value !== 'playing') {
    return
  }

  stopTimer()
  endedAt.value = Date.now()
  gameState.value = 'success'
  overlayActionsVisible.value = false
  flashOverlayVisible.value = true
  schedule(() => {
    flashOverlayVisible.value = false
  }, 520)

  for (let index = 0; index < 3; index += 1) {
    schedule(() => {
      const waveColors = ['rgba(255,215,0,0.38)', 'rgba(76,175,80,0.34)', 'rgba(66,165,245,0.32)'] as const
      const wave: CelebrationWaveState = {
        id: waveId += 1,
        color: waveColors[index % waveColors.length] ?? waveColors[0],
        delay: `${index * 0.08}s`,
      }
      celebrationWaves.value = [...celebrationWaves.value, wave]
      spawnSweepParticles()
      schedule(() => {
        celebrationWaves.value = celebrationWaves.value.filter((item) => item.id !== wave.id)
      }, 1500)
    }, index * 220)
  }

  schedule(() => {
    overlayActionsVisible.value = true
  }, 2000)
}

function beginTimeoutState() {
  if (gameState.value !== 'playing') {
    return
  }

  stopTimer()
  endedAt.value = Date.now()
  gameState.value = 'timeout'
  overlayActionsVisible.value = false
  schedule(() => {
    overlayActionsVisible.value = true
  }, 600)
}

function clampPoint(value: number, sizePx: number, totalPx: number) {
  const padding = sizePx / Math.max(totalPx * 2, 1)
  return Math.min(1 - padding, Math.max(padding, value))
}

function getNearestFreePiece(point: StagePoint) {
  return findNearestWoodBlockPiece(
    point,
    pieces.value,
    boardSize,
    currentConfig.value.pieceSize * 0.82,
  )
}

function startDraggingPiece(pieceId: string, mode: DragInputMode) {
  if (isInteractionLocked.value) {
    return
  }

  const piece = getPieceById(pieceId)
  if (!piece || piece.placed || piece.animating) {
    return
  }

  finalizeDraggingPiece()
  dragInputMode = mode
  draggingPieceId.value = pieceId
  piece.dragging = true
}

function handleSuccessfulMatch(piece: PieceState, slot: SlotState) {
  piece.animating = true
  piece.dragging = false
  piece.x = slot.x
  piece.y = slot.y
  piece.rotation = 0
  piece.placed = true

  slot.matched = true
  slot.bouncing = true
  slot.showCheck = true

  const centerX = slot.x * boardSize.width
  const centerY = slot.y * boardSize.height
  spawnParticles(centerX, centerY)
  playSuccessBeep()

  schedule(() => {
    slot.bouncing = false
  }, 420)
  schedule(() => {
    slot.showCheck = false
  }, 1600)
  schedule(() => {
    piece.animating = false
  }, 260)

  finalizeDraggingPiece()

  if (placedCount.value === pieces.value.length) {
    beginSuccessCelebration()
  }
}

function handleFailedMatch(piece: PieceState) {
  failedAttempts.value += 1
  piece.animating = true
  piece.dragging = false
  piece.shaking = true
  playFailureBeep()

  if (failedAttempts.value >= currentConfig.value.maxTries) {
    showHintForSlot(piece.id)
  }

  schedule(() => {
    piece.shaking = false
    returnPieceHome(piece)
  }, 260)

  finalizeDraggingPiece()
}

function releaseCurrentPiece() {
  if (isInteractionLocked.value || !draggingPieceId.value) {
    return
  }

  const piece = getPieceById(draggingPieceId.value)
  if (!piece) {
    finalizeDraggingPiece()
    return
  }

  const outcome = resolveWoodBlockDropOutcome(
    piece,
    slots.value.filter((slot) => !slot.matched),
    boardSize,
    currentConfig.value.snapDistance,
  )

  if (outcome.type === 'return') {
    piece.dragging = false
    piece.animating = true
    returnPieceHome(piece)
    finalizeDraggingPiece()
    return
  }

  if (outcome.type === 'match') {
    handleSuccessfulMatch(piece, outcome.slot)
    return
  }

  handleFailedMatch(piece)
}

function updateDraggingPiecePosition(point: StagePoint) {
  const piece = draggingPieceId.value ? getPieceById(draggingPieceId.value) : null
  if (!piece || piece.placed) {
    return
  }

  piece.x = clampPoint(point.x, piece.size, boardSize.width)
  piece.y = clampPoint(point.y, piece.size, boardSize.height)
}

function handlePrimaryPoint(point: StagePoint | null) {
  if (!point || isInteractionLocked.value) {
    return
  }

  if (latestHands.value.length === 0) {
    if (dragInputMode === 'pointer' && draggingPieceId.value) {
      updateDraggingPiecePosition(point)
    }
    return
  }

  const handPinching = latestHands.value.some((hand) => isPinching(hand.landmarks))
  if (handPinching && !wasPinching.value && !draggingPieceId.value) {
    const nearestPiece = getNearestFreePiece(point)
    if (nearestPiece) {
      gestureEvents.value += 1
      startDraggingPiece(nearestPiece.id, 'hand')
    }
  }

  if (handPinching && dragInputMode === 'hand' && draggingPieceId.value) {
    updateDraggingPiecePosition(point)
  }

  if (!handPinching && wasPinching.value && dragInputMode === 'hand' && draggingPieceId.value) {
    releaseCurrentPiece()
  }

  wasPinching.value = handPinching
}

function handleHands(hands: HandObservation[]) {
  latestHands.value = hands

  if (hands.length > 0) {
    handTrackingObserved.value = true
    return
  }

  if (dragInputMode === 'hand' && draggingPieceId.value) {
    releaseCurrentPiece()
  }

  wasPinching.value = false
}

function startPointerPiece(pieceId: string) {
  pointerFallbackUsed.value = true
  startDraggingPiece(pieceId, 'pointer')
}

function releasePointerPiece() {
  if (dragInputMode === 'pointer' && draggingPieceId.value) {
    releaseCurrentPiece()
  }
}

function startTimer() {
  stopTimer()
  remainingSeconds.value = currentConfig.value.timeLimit

  if (currentConfig.value.timeLimit <= 0) {
    return
  }

  countdownIntervalId = window.setInterval(() => {
    if (gameState.value !== 'playing') {
      stopTimer()
      return
    }

    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
    if (remainingSeconds.value <= 0) {
      beginTimeoutState()
    }
  }, 1000)
}

function buildSessionData(): GameSessionData {
  const endTime = endedAt.value ?? Date.now()
  const summary = summarizeWoodBlockSession({
    shapeCount: pieces.value.length,
    matchedCount: placedCount.value,
    failedAttempts: failedAttempts.value,
    startedAt: startedAt.value,
    endedAt: endTime,
  })

  return {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: startedAt.value,
    endTime,
    duration: summary.durationSeconds,
    trials: [],
    totalTrials: summary.totalTrials,
    correctTrials: summary.correctTrials,
    accuracy: summary.accuracy,
    avgResponseTime: summary.avgResponseTime,
    errors: {
      omission: summary.omissionErrors,
      commission: summary.commissionErrors,
    },
    behavior: {
      impulsivityScore: summary.impulsivityScore,
      fatigueIndex: 1,
      distractorPattern: `wood_blocks_${currentDifficulty.value}`,
    },
    handGameStats: {
      handTrackingUsed: handTrackingObserved.value,
      pointerFallbackUsed: pointerFallbackUsed.value,
      gestureEvents: gestureEvents.value,
      completionScore: summary.completionScore,
    },
  }
}

function finishSession() {
  if (gameState.value === 'playing') {
    return
  }

  emit('finish', buildSessionData())
}

function initGame(nextDifficulty: WoodBlockDifficultyId = currentDifficulty.value) {
  clearScheduledTimeouts()
  stopTimer()
  syncBoardSize()

  const difficulty = sanitizeWoodBlockDifficulty(nextDifficulty)
  const layout = createWoodBlockLayout(difficulty)
  currentDifficulty.value = difficulty
  startedAt.value = Date.now()
  endedAt.value = null
  failedAttempts.value = 0
  gestureEvents.value = 0
  particles.value = []
  celebrationWaves.value = []
  latestHands.value = []
  overlayActionsVisible.value = false
  flashOverlayVisible.value = false
  gameState.value = 'playing'
  pointerFallbackUsed.value = false
  handTrackingObserved.value = false
  resetInteractionState()

  slots.value = layout.slots.map((slot) => ({
    ...slot,
    matched: false,
    bouncing: false,
    hinted: false,
    showCheck: false,
  }))

  pieces.value = layout.pieces.map((piece) => ({
    ...piece,
    placed: false,
    dragging: false,
    animating: false,
    shaking: false,
  }))

  startTimer()
}

watch(
  () => props.difficulty,
  (value) => {
    const nextDifficulty = sanitizeWoodBlockDifficulty(value)
    if (nextDifficulty !== currentDifficulty.value) {
      initGame(nextDifficulty)
    }
  },
)

onMounted(() => {
  syncBoardSize()
  if (boardRef.value) {
    resizeObserver = new ResizeObserver(syncBoardSize)
    resizeObserver.observe(boardRef.value)
  }
  initGame(currentDifficulty.value)
})

onBeforeUnmount(() => {
  clearScheduledTimeouts()
  stopTimer()
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.wood-block-game__board {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% -8%, rgba(255, 255, 255, 0.48), transparent 42%),
    repeating-linear-gradient(90deg, rgba(122, 73, 33, 0.1) 0 18px, rgba(255, 255, 255, 0.06) 18px 36px),
    linear-gradient(180deg, rgba(248, 231, 203, 0.84), rgba(219, 181, 129, 0.82));
}

.wood-block-game__topbar {
  position: absolute;
  top: 20px;
  left: clamp(172px, 15vw, 220px);
  right: 24px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  pointer-events: none;
}

.wood-block-game__difficulty {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 999px;
  background: rgba(255, 250, 235, 0.9);
  box-shadow: 0 14px 28px rgba(91, 53, 25, 0.12);
  pointer-events: auto;
}

.wood-block-game__difficulty-button {
  min-width: 82px;
  min-height: 42px;
  border: 0;
  border-radius: 999px;
  color: #7a4d24;
  background: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.wood-block-game__difficulty-button:hover {
  transform: translateY(-1px);
}

.wood-block-game__difficulty-button.is-active {
  color: #fff;
  background: linear-gradient(135deg, #f59f00, #e8680a);
  box-shadow: 0 10px 22px rgba(232, 104, 10, 0.32);
}

.wood-block-game__hud {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 18px;
  border-radius: 999px;
  color: #5b3519;
  background: rgba(255, 250, 235, 0.92);
  box-shadow: 0 16px 32px rgba(79, 49, 26, 0.14);
  font-weight: 700;
  pointer-events: auto;
}

.wood-block-game__slot,
.wood-block-game__piece {
  position: absolute;
  transform: translate(-50%, -50%);
}

.wood-block-game__slot {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.22);
  box-shadow: inset 0 0 0 1px rgba(187, 168, 128, 0.14);
}

.wood-block-game__slot.is-matched {
  background: rgba(243, 252, 240, 0.42);
  box-shadow: inset 0 0 0 3px rgba(76, 175, 80, 0.68);
}

.wood-block-game__slot.is-bouncing {
  animation: slotBounce 0.42s ease;
}

.wood-block-game__slot.is-hinted {
  box-shadow:
    inset 0 0 0 4px rgba(76, 175, 80, 0.84),
    0 0 0 14px rgba(76, 175, 80, 0.14);
}

.wood-block-game__slot-shape {
  width: 70%;
  height: 70%;
  opacity: 0.92;
}

.wood-block-game__slot-shape :deep(svg) {
  width: 100%;
  height: 100%;
}

.wood-block-game__slot-label {
  position: absolute;
  left: 50%;
  bottom: -34px;
  transform: translateX(-50%);
  color: #8c6743;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.wood-block-game__slot-check,
.wood-block-game__slot-hint {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-weight: 900;
}

.wood-block-game__slot-check {
  top: -14px;
  font-size: 28px;
  animation: slotCheckPop 0.28s ease;
}

.wood-block-game__slot-hint {
  top: calc(100% + 12px);
  padding: 6px 12px;
  border-radius: 999px;
  color: #fff;
  background: rgba(76, 175, 80, 0.92);
  font-size: 12px;
  animation: slotHintPulse 1s ease infinite;
}

.wood-block-game__piece {
  z-index: 6;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: grab;
}

.wood-block-game__piece.is-dragging {
  z-index: 12;
  cursor: grabbing;
}

.wood-block-game__piece.is-placed {
  cursor: default;
}

.wood-block-game__piece.is-disabled {
  pointer-events: none;
}

.wood-block-game__piece-motion,
.wood-block-game__piece-shape {
  display: block;
  width: 100%;
  height: 100%;
}

.wood-block-game__piece-motion.is-shaking {
  animation: shake 0.35s ease;
}

.wood-block-game__piece-shape {
  width: 86%;
  height: 86%;
  margin: 7%;
}

.wood-block-game__hint {
  position: absolute;
  left: 50%;
  bottom: 24px;
  z-index: 10;
  transform: translateX(-50%);
  max-width: min(760px, calc(100% - 40px));
  padding: 12px 18px;
  border-radius: 999px;
  color: #654121;
  background: rgba(255, 250, 235, 0.9);
  box-shadow: 0 14px 28px rgba(91, 53, 25, 0.12);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.wood-block-game__particle {
  position: absolute;
  z-index: 14;
  border-radius: 50%;
  pointer-events: none;
  animation: particleFly var(--particle-duration) ease forwards;
  animation-delay: var(--particle-delay);
}

.wood-block-game__celebration-wave {
  position: absolute;
  left: 6%;
  right: 6%;
  bottom: -18%;
  z-index: 13;
  height: 24%;
  border-radius: 999px;
  background: linear-gradient(180deg, transparent, var(--wave-color));
  filter: blur(6px);
  pointer-events: none;
  animation: celebrationSweep 1.35s ease forwards;
  animation-delay: var(--wave-delay);
}

.wood-block-game__flash {
  position: absolute;
  inset: 0;
  z-index: 12;
  background: rgba(255, 255, 200, 0.4);
  pointer-events: none;
  animation: flashFade 0.52s ease forwards;
}

.wood-block-game__overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(6px);
}

.wood-block-game__overlay-card {
  width: min(560px, calc(100% - 20px));
  padding: 36px 32px 30px;
  border-radius: 32px;
  text-align: center;
  box-shadow: 0 28px 58px rgba(15, 23, 42, 0.2);
  animation: overlayRise 0.42s ease;
}

.wood-block-game__overlay.is-success .wood-block-game__overlay-card {
  color: #5f3808;
  background: linear-gradient(180deg, rgba(255, 250, 228, 0.96), rgba(255, 239, 184, 0.94));
}

.wood-block-game__overlay.is-timeout .wood-block-game__overlay-card {
  color: #5c3918;
  background: linear-gradient(180deg, rgba(255, 246, 228, 0.96), rgba(246, 221, 180, 0.94));
}

.wood-block-game__overlay-icon {
  font-size: 58px;
}

.wood-block-game__overlay-card h2 {
  margin: 14px 0 12px;
  font-size: 34px;
}

.wood-block-game__overlay-card p {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
}

.wood-block-game__overlay-stats {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 20px;
  font-size: 14px;
  font-weight: 700;
}

.wood-block-game__overlay-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 28px;
}

.wood-block-game__action {
  min-width: 142px;
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.wood-block-game__action:hover {
  transform: translateY(-1px);
}

.wood-block-game__action--primary {
  color: #fff;
  background: linear-gradient(135deg, #2f9e44, #4caf50);
  box-shadow: 0 14px 28px rgba(76, 175, 80, 0.24);
}

.wood-block-game__action--secondary {
  color: #75441b;
  background: rgba(255, 255, 255, 0.72);
}

@keyframes slotBounce {
  0% { transform: translate(-50%, -50%) scale(1); }
  35% { transform: translate(-50%, -50%) scale(1.22); }
  65% { transform: translate(-50%, -50%) scale(0.93); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

@keyframes slotCheckPop {
  0% { transform: translateX(-50%) scale(0.4); opacity: 0; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

@keyframes slotHintPulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.06); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px) rotate(-3deg); }
  60% { transform: translateX(8px) rotate(3deg); }
}

@keyframes particleFly {
  to {
    transform: translate(var(--dx), var(--dy));
    opacity: 0;
  }
}

@keyframes celebrationSweep {
  0% {
    transform: translateY(0) scaleX(0.88);
    opacity: 0;
  }
  25% {
    opacity: 0.92;
  }
  100% {
    transform: translateY(-180%) scaleX(1.02);
    opacity: 0;
  }
}

@keyframes flashFade {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes overlayRise {
  from {
    transform: translateY(18px) scale(0.96);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .wood-block-game__topbar {
    left: clamp(156px, 24vw, 190px);
    right: 16px;
    flex-direction: column;
    align-items: stretch;
  }

  .wood-block-game__difficulty,
  .wood-block-game__hud {
    justify-content: center;
  }

  .wood-block-game__hint {
    bottom: 18px;
    font-size: 13px;
  }
}

@media (max-width: 700px) {
  .wood-block-game__topbar {
    top: 82px;
    left: 16px;
    align-items: center;
  }

  .wood-block-game__difficulty {
    max-width: 100%;
  }

  .wood-block-game__difficulty-button {
    min-width: 78px;
  }
}
</style>
