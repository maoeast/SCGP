<template>
  <section class="energy-ball-game" :class="{ paused }">
    <!-- MAIN BODY: Center stage + Right sidebar -->
    <div class="game-body">
      <!-- CENTER STAGE: Core interaction -->
      <div class="center-stage">
        <!-- Task instruction -->
        <div class="task-instruction">
          <span class="task-emoji">{{ levelTheme.emoji }}</span>
          <span class="task-text">{{ levelTheme.subtitle }}</span>
        </div>

        <!-- Ball area (relative for celebration overlay) -->
        <div class="ball-area">
          <!-- Hold progress ring -->
          <div v-if="isHolding && !levelComplete" class="hold-indicator">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="6" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                :stroke="levelTheme.color"
                stroke-width="6"
                stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 44"
                :stroke-dashoffset="2 * Math.PI * 44 * (1 - holdProgress)"
                class="hold-arc"
              />
            </svg>
            <span class="hold-label">保持住...</span>
          </div>

          <!-- Energy ball -->
          <div
            class="energy-ball"
            :class="{ glowing: energyLevel >= 60, celebrating: levelComplete }"
            :style="energyBallStyle"
          >
            <span class="ball-emoji">{{ levelTheme.emoji }}</span>
          </div>

          <!-- Celebration canvas -->
          <canvas ref="celebrationCanvas" class="celebration-canvas" />
        </div>

        <!-- Tiered feedback -->
        <transition name="fade">
          <span v-if="energyLevel >= 30 && energyLevel < 100 && !levelComplete" class="feedback-text">
            {{ energyLevel >= 60 ? '快到了！继续！' : '继续！加油！' }}
          </span>
        </transition>

        <!-- Energy percentage -->
        <span class="energy-percent" :style="{ color: levelTheme.color }">
          ⚡ {{ Math.round(energyLevel) }}%
        </span>

        <!-- Energy bar -->
        <div class="energy-bar-container">
          <div class="energy-bar">
            <div class="energy-fill" :style="{ width: energyLevel + '%', background: energyBarGradient }" />
          </div>
        </div>

        <!-- Level complete banner -->
        <transition name="pop">
          <div v-if="levelComplete" class="level-complete-banner">
            <span class="complete-icon">✨</span>
            <span>太棒了！</span>
          </div>
        </transition>
      </div>

      <!-- SIDEBAR: Camera + Emotion status -->
      <aside class="status-sidebar">
        <!-- Camera -->
        <div class="camera-area">
          <video
            ref="videoRef"
            class="camera-feed"
            autoplay
            playsinline
            muted
          />

          <VisualSupportOverlay
            :width="videoWidth"
            :height="videoHeight"
            :landmarks="detector.landmarks.value"
            :face-detected="detector.faceDetected.value"
            :scores="detector.scores.value"
            :active-emotion="currentTarget"
            :threshold="getEffectiveThreshold(currentLevel)"
            :show-calibration="detector.isCalibrating.value"
            :calibration-progress="detector.calibrationProgress.value"
          />

          <!-- Demo emotion badge -->
          <div v-if="detector.appState.value === 'PLAYING'" class="demo-badge">
            <span class="demo-emoji">{{ levelTheme.emoji }}</span>
            <span class="demo-label">{{ levelTheme.subtitle }}</span>
          </div>

          <!-- Camera error -->
          <div v-if="cameraError" class="overlay-prompt">
            <div class="error-card">
              <div class="prompt-icon">📷</div>
              <h3>无法访问摄像头</h3>
              <p>{{ cameraError }}</p>
              <button class="start-button" type="button" @click="retryCamera">
                重试
              </button>
            </div>
          </div>

          <!-- Detector init error -->
          <div v-else-if="detector.initError.value" class="overlay-prompt">
            <div class="error-card">
              <div class="prompt-icon">⚠️</div>
              <h3>表情检测加载失败</h3>
              <p>{{ detector.initError.value }}</p>
            </div>
          </div>

          <!-- Waiting for detector -->
          <div v-else-if="!detector.isReady.value" class="overlay-prompt">
            <div class="prompt-card">
              <div class="prompt-icon loading-icon">🔍</div>
              <h3>正在加载检测模型</h3>
              <p>首次加载可能需要几秒钟...</p>
            </div>
          </div>

          <!-- Calibration: pre-start -->
          <div v-else-if="detector.appState.value === 'CALIBRATION' && !detector.isCalibrating.value" class="overlay-prompt">
            <div class="prompt-card">
              <div class="prompt-icon">📷</div>
              <h3>准备好了吗？</h3>
              <p>请面向摄像头，保持自然表情</p>
              <p v-if="!detector.faceDetected.value" class="hint-text">未检测到人脸，请调整位置</p>
              <button class="start-button" type="button" @click="beginCalibration">
                开始校准
              </button>
            </div>
          </div>

          <!-- Calibration: in progress -->
          <div v-else-if="detector.isCalibrating.value" class="overlay-prompt calibration-active">
            <div class="calibration-card">
              <div class="calibration-ring-visual">
                <svg viewBox="0 0 80 80" width="80" height="80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="5" />
                  <circle
                    cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="5"
                    stroke-linecap="round"
                    :stroke-dasharray="2 * Math.PI * 34"
                    :stroke-dashoffset="2 * Math.PI * 34 * (1 - detector.calibrationProgress.value)"
                    class="cal-arc"
                  />
                </svg>
                <span class="cal-percent">{{ Math.round(detector.calibrationProgress.value * 100) }}%</span>
              </div>
              <p>看镜头休息一下...</p>
              <p v-if="!detector.faceDetected.value" class="hint-text">未检测到人脸，请面向摄像头</p>
            </div>
          </div>
        </div>

        <!-- Detection status -->
        <div class="detection-status" :class="{ detected: detector.faceDetected.value }">
          <span class="status-dot" />
          <span>{{ detector.faceDetected.value ? '已检测到人脸' : '未检测到人脸' }}</span>
        </div>

        <!-- Emotion cards: compact vertical list -->
        <div class="card-list">
          <div
            v-for="emotion in emotions"
            :key="emotion"
            class="emotion-card"
            :class="{ active: emotion === currentTarget, detected: detector.scores.value[emotion] > getEffectiveThreshold(currentLevel) }"
          >
            <span class="card-emoji">{{ emotionEmojis[emotion] }}</span>
            <div class="card-detail">
              <div class="card-top-row">
                <span class="card-label">{{ emotionLabels[emotion] }}</span>
                <span class="card-score">{{ Math.round(detector.scores.value[emotion] * 100) }}</span>
              </div>
              <div class="card-bar">
                <div class="card-bar-fill" :style="{ width: (detector.scores.value[emotion] * 100) + '%', background: emotionColors[emotion] }" />
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation (below emotion cards) -->
        <div class="sidebar-nav">
          <button
            v-if="levelIndex > 0"
            class="nav-btn prev-btn"
            type="button"
            @click="prevLevel"
          >
            上一关
          </button>
          <button
            v-if="levelIndex < levels.length - 1 && levelComplete"
            class="nav-btn next-btn"
            type="button"
            @click="nextLevel"
          >
            下一关
          </button>
          <button
            v-if="levelIndex === levels.length - 1 && levelComplete"
            class="nav-btn finish-btn"
            type="button"
            @click="finishGame"
          >
            完成！
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import VisualSupportOverlay from './VisualSupportOverlay.vue'
import { useEmotionDetector } from '@/composables/useEmotionDetector'
import type { EmotionType } from '@/types/emotional/face-emotion'
import type { EmotionGameAudioController, EmotionGameDifficulty } from '@/types/emotional/games'

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty: () => void
  audio: EmotionGameAudioController
  cameraStream?: MediaStream | null
}>()

const emit = defineEmits<{
  complete: [payload: { performanceData: Record<string, any> }]
}>()

// ---- Constants ----

const emotions: EmotionType[] = ['Happy', 'Surprised', 'Angry', 'Neutral']

const emotionLabels: Record<EmotionType, string> = {
  Happy: '开心',
  Surprised: '惊讶',
  Angry: '生气',
  Neutral: '平静',
}

const emotionEmojis: Record<EmotionType, string> = {
  Happy: '😄',
  Surprised: '😲',
  Angry: '😠',
  Neutral: '😌',
}

const emotionColors: Record<EmotionType, string> = {
  Happy: '#ffd93d',
  Surprised: '#74b9ff',
  Angry: '#ff6b6b',
  Neutral: '#55efc4',
}

interface LevelConfig {
  target: EmotionType
  title: string
  subtitle: string
  emoji: string
  color: string
  threshold: number
  holdDuration: number
}

const levels: [LevelConfig, ...LevelConfig[]] = [
  {
    target: 'Happy',
    title: '点亮太阳',
    subtitle: '笑一笑，让太阳亮起来',
    emoji: '☀️',
    color: '#ffd93d',
    threshold: 0.45,
    holdDuration: 300,
  },
  {
    target: 'Surprised',
    title: '吹走乌云',
    subtitle: '张大嘴巴，吹走乌云',
    emoji: '🌤️',
    color: '#74b9ff',
    threshold: 0.40,
    holdDuration: 300,
  },
  {
    target: 'Angry',
    title: '平息小火山',
    subtitle: '皱皱眉，再深呼吸',
    emoji: '🌋',
    color: '#ff6b6b',
    threshold: 0.45,
    holdDuration: 300,
  },
]

// ---- State ----

const videoRef = ref<HTMLVideoElement | null>(null)
const videoWidth = ref(640)
const videoHeight = ref(480)
const levelIndex = ref(0)
const energyLevel = ref(0)
const levelComplete = ref(false)
const completedLevels = ref<boolean[]>([false, false, false])
const cameraError = ref<string | null>(null)

// Hold-time gating state
const holdStartTime = ref<number | null>(null)
const holdProgress = computed(() => {
  if (holdStartTime.value === null) return 0
  const elapsed = performance.now() - holdStartTime.value
  const duration = getEffectiveHoldDuration(currentLevel.value)
  return Math.min(1, elapsed / duration)
})
const isHolding = computed(() => holdProgress.value < 1 && holdStartTime.value !== null)

// Confetti state
interface ConfettiPiece {
  x: number; y: number
  vx: number; vy: number
  size: number; rotate: number; spin: number
  life: number; color: string
}

const CONFETTI_COLORS = ['#ffd93d', '#ff6b6b', '#74b9ff', '#55efc4', '#a29bfe', '#fd79a8']
let confettiPieces: ConfettiPiece[] = []
let celebrationFrame = 0
const celebrationCanvas = ref<HTMLCanvasElement | null>(null)

const detector = useEmotionDetector({
  smoothingFactor: 0.3,
  calibrationFrames: 20,
})

// ---- Computed ----

const currentLevel = computed<LevelConfig>(() => levels[levelIndex.value] ?? levels[0])
const currentTarget = computed(() => currentLevel.value.target)
const levelTheme = computed(() => currentLevel.value)

const energyBallStyle = computed(() => ({
  borderColor: levelTheme.value.color,
  boxShadow: energyLevel.value > 30
    ? `0 0 ${energyLevel.value * 0.6}px ${levelTheme.value.color}`
    : 'none',
}))

const energyBarGradient = computed(() =>
  `linear-gradient(90deg, #74b9ff, ${levelTheme.value.color}, #ff6b6b)`
)

// ---- Difficulty helpers ----

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function getEffectiveThreshold(level: LevelConfig): number {
  const multipliers = { 1: 0.75, 2: 1.0, 3: 1.25 } as const
  return clamp01(level.threshold * (multipliers[props.difficulty] ?? 1.0))
}

function getEffectiveHoldDuration(level: LevelConfig): number {
  const multipliers = { 1: 1.0, 2: 0.8, 3: 0.6 } as const
  return Math.round(level.holdDuration * (multipliers[props.difficulty] ?? 1.0))
}

// ---- Camera ----

async function startCamera(): Promise<boolean> {
  cameraError.value = null

  if (!props.cameraStream) {
    cameraError.value = '摄像头预检尚未完成，请返回训练列表后重新进入'
    return false
  }

  const activeVideoTrack = props.cameraStream.getVideoTracks().find((track) => track.readyState === 'live')
  if (!activeVideoTrack) {
    cameraError.value = '摄像头连接已失效，请返回训练列表后重新进入'
    return false
  }

  try {
    if (!videoRef.value) {
      cameraError.value = '视频元素未就绪'
      return false
    }

    videoRef.value.srcObject = props.cameraStream

    // Wait for video metadata to load so dimensions are available
    await new Promise<void>((resolve, reject) => {
      if (!videoRef.value) { reject(new Error('video gone')); return }
      const video = videoRef.value
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('视频加载失败'))
      // Timeout fallback
      setTimeout(() => resolve(), 3000)
    })

    await videoRef.value.play()

    // Read actual video dimensions
    videoWidth.value = videoRef.value.videoWidth || 640
    videoHeight.value = videoRef.value.videoHeight || 480

    return true
  } catch (err: any) {
    const msg = err?.name || err?.message || String(err)
    cameraError.value = `摄像头启动失败: ${msg}`
    return false
  }
}

function stopCamera(): void {
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

async function retryCamera(): Promise<void> {
  stopCamera()
  const ok = await startCamera()
  if (ok && videoRef.value) {
    await detector.initialize(videoRef.value)
    startEnergyLoop()
  }
}

// ---- Game flow ----

async function beginCalibration(): Promise<void> {
  await detector.startCalibration()
}

function nextLevel(): void {
  if (levelIndex.value < levels.length - 1) {
    levelIndex.value++
    energyLevel.value = 0
    levelComplete.value = false
    holdStartTime.value = null
    scoreWindow = []
    resetCelebration()
  }
}

function prevLevel(): void {
  if (levelIndex.value > 0) {
    levelIndex.value--
    energyLevel.value = 0
    levelComplete.value = false
    holdStartTime.value = null
    scoreWindow = []
    resetCelebration()
  }
}

function finishGame(): void {
  emit('complete', {
    performanceData: {
      completedLevels: completedLevels.value,
      finalEnergy: energyLevel.value,
      difficulty: props.difficulty,
    },
  })
}

// ---- Energy accumulation ----

const ROLLING_WINDOW_SIZE = 5
let scoreWindow: number[] = []
let energyAccumulator: number | null = null

function startEnergyLoop(): void {
  scoreWindow = []
  holdStartTime.value = null

  const tick = () => {
    if (props.paused) {
      energyAccumulator = requestAnimationFrame(tick)
      return
    }

    if (detector.appState.value === 'PLAYING') {
      const target = currentTarget.value
      const rawScore = detector.scores.value[target]
      const threshold = getEffectiveThreshold(currentLevel.value)

      // Rolling average
      scoreWindow.push(rawScore)
      if (scoreWindow.length > ROLLING_WINDOW_SIZE) {
        scoreWindow.shift()
      }
      const smoothedScore = scoreWindow.reduce((a, b) => a + b, 0) / scoreWindow.length

      if (smoothedScore > threshold) {
        // Hold-time gating
        if (holdStartTime.value === null) {
          holdStartTime.value = performance.now()
        }

        const elapsed = performance.now() - holdStartTime.value
        const holdDuration = getEffectiveHoldDuration(currentLevel.value)

        if (elapsed >= holdDuration) {
          const rate = (smoothedScore - threshold) * (0.8 + props.difficulty * 0.3)
          energyLevel.value = Math.min(100, energyLevel.value + rate)

          if (!levelComplete.value && energyLevel.value >= 100) {
            levelComplete.value = true
            completedLevels.value[levelIndex.value] = true
            props.markRoundDirty()
            props.audio.playSuccessCue()
            runCelebration()
          }
        }
      } else {
        holdStartTime.value = null
      }
    }

    energyAccumulator = requestAnimationFrame(tick)
  }
  energyAccumulator = requestAnimationFrame(tick)
}

function stopEnergyLoop(): void {
  if (energyAccumulator !== null) {
    cancelAnimationFrame(energyAccumulator)
    energyAccumulator = null
  }
}

// ---- Celebration ----

function runCelebration(): void {
  const canvas = celebrationCanvas.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = rect.height * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  confettiPieces = Array.from({ length: 80 }).map(() => ({
    x: rect.width * 0.5 + (Math.random() - 0.5) * 160,
    y: rect.height * 0.4 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * -7 - 2.5,
    size: Math.random() * 9 + 5,
    rotate: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.24,
    life: 1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#ffd93d',
  }))

  const draw = (): void => {
    if (props.paused) return
    ctx.clearRect(0, 0, rect.width, rect.height)

    confettiPieces = confettiPieces
      .map((piece) => ({
        ...piece,
        x: piece.x + piece.vx,
        y: piece.y + piece.vy,
        vy: piece.vy + 0.08,
        rotate: piece.rotate + piece.spin,
        life: piece.life - 0.012,
      }))
      .filter((piece) => piece.life > 0)

    for (const piece of confettiPieces) {
      ctx.save()
      ctx.globalAlpha = piece.life
      ctx.translate(piece.x, piece.y)
      ctx.rotate(piece.rotate)
      ctx.fillStyle = piece.color
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.66)
      ctx.restore()
    }

    ctx.globalAlpha = 1
    if (confettiPieces.length > 0) {
      celebrationFrame = window.requestAnimationFrame(draw)
    }
  }

  draw()
}

function resetCelebration(): void {
  if (celebrationFrame) {
    cancelAnimationFrame(celebrationFrame)
    celebrationFrame = 0
  }
  confettiPieces = []
  const canvas = celebrationCanvas.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

// ---- Watch: auto-transition from calibration to playing ----

watch(
  () => detector.isCalibrating.value,
  (calibrating, wasCalibrating) => {
    // When calibration finishes (was calibrating, now not), start playing
    if (wasCalibrating && !calibrating && detector.baseline.value) {
      detector.startPlaying()
    }
  },
)

// ---- Lifecycle ----

onMounted(async () => {
  const cameraOk = await startCamera()
  if (cameraOk && videoRef.value) {
    await detector.initialize(videoRef.value)
    startEnergyLoop()
  }
})

watch(() => props.paused, (isPaused) => {
  if (isPaused) {
    detector.pause()
  } else {
    detector.resume()
  }
})

onBeforeUnmount(() => {
  stopEnergyLoop()
  resetCelebration()
  detector.dispose()
  stopCamera()
})
</script>

<style scoped>
.energy-ball-game {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding-top: 100px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.energy-ball-game.paused {
  opacity: 0.7;
  pointer-events: none;
}

/* ---- Game body: Center + Sidebar ---- */

.game-body {
  display: flex;
  flex: 1;
  gap: 24px;
  padding: 20px 24px;
  min-height: 0;
}

/* ---- Center stage ---- */

.center-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-width: 0;
}

/* Task instruction */

.task-instruction {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 28px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.task-emoji {
  font-size: 36px;
}

.task-text {
  font-size: 24px;
  font-weight: 700;
  color: #2d3436;
}

/* Ball area (contains hold indicator, ball, celebration) */

.ball-area {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Hold indicator */

.hold-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hold-arc {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.1s linear;
}

.hold-label {
  font-size: 13px;
  font-weight: 600;
  color: #636e72;
}

/* Energy ball */

.energy-ball {
  width: 260px;
  height: 260px;
  border-radius: 50%;
  border: 5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 40% 35%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.7));
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
}

.energy-ball.glowing {
  animation: ball-pulse 1.2s ease-in-out infinite;
}

.energy-ball.celebrating {
  animation: ball-celebrate 0.6s ease-in-out 3;
}

.ball-emoji {
  font-size: 96px;
}

/* Celebration canvas */

.celebration-canvas {
  position: absolute;
  inset: -60px;
  pointer-events: none;
  z-index: 20;
}

/* Feedback */

.feedback-text {
  font-size: 20px;
  font-weight: 700;
  color: #2d3436;
  text-align: center;
  animation: fade-pulse 1.5s ease-in-out infinite;
}

.energy-percent {
  font-size: 28px;
  font-weight: 800;
}

/* Energy bar */

.energy-bar-container {
  width: 320px;
}

.energy-bar {
  width: 100%;
  height: 14px;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.energy-fill {
  height: 100%;
  border-radius: 7px;
  transition: width 0.15s ease;
}

/* Level complete */

.level-complete-banner {
  padding: 16px 32px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffd93d, #ff9a3c);
  color: #2d3436;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.complete-icon {
  font-size: 28px;
}

/* ---- Sidebar ---- */

.status-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Camera */

.camera-area {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 18px;
  overflow: hidden;
  background: #1a1a2e;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.camera-feed {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.demo-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 12;
}

.demo-emoji {
  font-size: 20px;
}

.demo-label {
  font-size: 11px;
  font-weight: 600;
  color: #2d3436;
  white-space: nowrap;
}

/* Detection status */

.detection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #b2bec3;
  background: rgba(0, 0, 0, 0.04);
}

.detection-status.detected {
  color: #00b894;
  background: rgba(0, 184, 148, 0.08);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b2bec3;
}

.detection-status.detected .status-dot {
  background: #00b894;
  animation: dot-pulse 1.5s ease-in-out infinite;
}

/* ---- Emotion card list (compact vertical) ---- */

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.emotion-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.75);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.emotion-card.active {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
}

.emotion-card.detected {
  animation: card-bounce 0.5s ease;
}

.card-emoji {
  font-size: 28px;
  flex-shrink: 0;
}

.card-detail {
  flex: 1;
  min-width: 0;
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.card-label {
  font-size: 13px;
  font-weight: 600;
  color: #636e72;
}

.card-score {
  font-size: 13px;
  font-weight: 700;
  color: #2d3436;
}

.card-bar {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.card-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.15s ease;
}

/* ---- Sidebar navigation ---- */

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 8px;
}

.nav-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.nav-btn:hover {
  transform: translateY(-1px);
}

.prev-btn {
  background: rgba(0, 0, 0, 0.06);
  color: #636e72;
}

.next-btn {
  background: linear-gradient(135deg, #74b9ff, #0984e3);
  color: #fff;
}

.finish-btn {
  background: linear-gradient(135deg, #55efc4, #00b894);
  color: #fff;
}

/* ---- Overlays (shared) ---- */

.overlay-prompt {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 15;
}

.prompt-card,
.error-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  text-align: center;
  max-width: 240px;
}

.prompt-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.loading-icon {
  animation: spin 2s linear infinite;
}

.prompt-card h3,
.error-card h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: #2d3436;
}

.prompt-card p,
.error-card p {
  margin: 0 0 12px;
  color: #636e72;
  font-size: 13px;
}

.hint-text {
  color: #e17055 !important;
  font-weight: 600;
  font-size: 12px !important;
  margin-bottom: 8px !important;
}

.start-button {
  padding: 10px 24px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffd93d, #ff9a3c);
  color: #2d3436;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.start-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 217, 61, 0.4);
}

.error-card {
  background: rgba(255, 235, 235, 0.95);
  color: #c0392b;
}

/* ---- Calibration ---- */

.calibration-active {
  background: rgba(0, 0, 0, 0.35);
}

.calibration-card {
  text-align: center;
  color: #fff;
}

.calibration-ring-visual {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.cal-arc {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.3s ease;
}

.cal-percent {
  position: absolute;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.calibration-card p {
  margin: 3px 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

/* ---- Transitions ---- */

.pop-enter-active,
.pop-leave-active {
  transition: all 0.3s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---- Keyframes ---- */

@keyframes ball-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

@keyframes ball-celebrate {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes card-bounce {
  0%, 100% { transform: scale(1); }
  40% { transform: scale(1.06); }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fade-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ---- Responsive ---- */

@media (max-width: 900px) {
  .game-body {
    flex-direction: column-reverse;
    padding: 12px;
  }

  .status-sidebar {
    width: 100%;
    flex-direction: row;
    gap: 12px;
    flex-wrap: wrap;
  }

  .camera-area {
    width: 50%;
    flex-shrink: 0;
  }

  .card-list {
    flex: 1;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .emotion-card {
    flex: 1 1 45%;
    min-width: 140px;
  }

  .sidebar-nav {
    flex-direction: row;
    width: 100%;
    margin-top: 0;
  }

  .sidebar-nav .nav-btn {
    flex: 1;
  }

  .energy-ball {
    width: 180px;
    height: 180px;
  }

  .ball-emoji {
    font-size: 64px;
  }

  .energy-bar-container {
    width: 240px;
  }
}
</style>
