<template>
  <section class="energy-ball-game" :class="{ paused }">
    <!-- Camera + Overlay container -->
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
        :threshold="difficultyThreshold"
        :show-calibration="detector.isCalibrating.value"
        :calibration-progress="detector.calibrationProgress.value"
      />

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

      <!-- Calibration: pre-start prompt -->
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

    <!-- Game UI Panel -->
    <aside class="game-panel">
      <!-- Level indicator -->
      <div class="level-header">
        <div class="level-badge" :style="{ background: levelTheme.color }">
          {{ levelIndex + 1 }}
        </div>
        <div class="level-info">
          <h2>{{ levelTheme.title }}</h2>
          <p>{{ levelTheme.subtitle }}</p>
        </div>
      </div>

      <!-- Face detection indicator -->
      <div class="detection-status" :class="{ detected: detector.faceDetected.value }">
        <span class="status-dot" />
        <span>{{ detector.faceDetected.value ? '已检测到人脸' : '未检测到人脸' }}</span>
      </div>

      <!-- Energy ball -->
      <div class="energy-ball-container">
        <div class="energy-ball" :class="{ glowing: energyLevel >= 80 }" :style="energyBallStyle">
          <span class="ball-emoji">{{ levelTheme.emoji }}</span>
        </div>
        <div class="energy-bar">
          <div class="energy-fill" :style="{ width: energyLevel + '%', background: levelTheme.color }" />
        </div>
        <span class="energy-label">能量 {{ Math.round(energyLevel) }}%</span>
      </div>

      <!-- Score display -->
      <div class="score-panel">
        <div
          v-for="emotion in emotions"
          :key="emotion"
          class="score-row"
          :class="{ active: emotion === currentTarget }"
        >
          <span class="emotion-label">{{ emotionLabels[emotion] }}</span>
          <div class="score-bar">
            <div
              class="score-fill"
              :style="{
                width: (detector.scores.value[emotion] * 100) + '%',
                background: emotion === currentTarget ? levelTheme.color : '#ccc'
              }"
            />
          </div>
          <span class="score-value">{{ Math.round(detector.scores.value[emotion] * 100) }}</span>
        </div>
      </div>

      <!-- Level complete banner -->
      <transition name="pop">
        <div v-if="levelComplete" class="level-complete-banner">
          <span class="complete-icon">✨</span>
          <span>太棒了！</span>
        </div>
      </transition>

      <!-- Navigation -->
      <div class="nav-buttons">
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

interface LevelConfig {
  target: EmotionType
  title: string
  subtitle: string
  emoji: string
  color: string
}

const levels: [LevelConfig, ...LevelConfig[]] = [
  { target: 'Happy', title: '点亮太阳', subtitle: '笑一笑，让太阳亮起来', emoji: '☀️', color: '#ffd93d' },
  { target: 'Surprised', title: '吹走乌云', subtitle: '张大嘴巴，吹走乌云', emoji: '🌤️', color: '#74b9ff' },
  { target: 'Angry', title: '平息小火山', subtitle: '皱皱眉，再深呼吸', emoji: '🌋', color: '#ff6b6b' },
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

const detector = useEmotionDetector({
  smoothingFactor: 0.3,
  calibrationFrames: 20,
})

// ---- Computed ----

const currentLevel = computed<LevelConfig>(() => levels[levelIndex.value] ?? levels[0])
const currentTarget = computed(() => currentLevel.value.target)
const levelTheme = computed(() => currentLevel.value)
const difficultyThreshold = computed(() => {
  if (props.difficulty === 1) return 0.35
  if (props.difficulty === 2) return 0.5
  return 0.65
})

const energyBallStyle = computed(() => ({
  borderColor: levelTheme.value.color,
  boxShadow: energyLevel.value > 50
    ? `0 0 ${energyLevel.value * 0.5}px ${levelTheme.value.color}`
    : 'none',
}))

// ---- Camera ----

async function startCamera(): Promise<boolean> {
  cameraError.value = null

  // Check if getUserMedia is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = '浏览器不支持摄像头访问，请使用 HTTPS 或 Electron 环境'
    return false
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    })

    if (!videoRef.value) {
      cameraError.value = '视频元素未就绪'
      stream.getTracks().forEach((t) => t.stop())
      return false
    }

    videoRef.value.srcObject = stream

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
    if (msg === 'NotAllowedError' || msg.includes('Permission')) {
      cameraError.value = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头'
    } else if (msg === 'NotFoundError' || msg.includes('not found')) {
      cameraError.value = '未检测到摄像头设备'
    } else if (msg === 'NotReadableError' || msg.includes('track')) {
      cameraError.value = '摄像头被其他应用占用，请关闭其他使用摄像头的程序'
    } else {
      cameraError.value = `摄像头启动失败: ${msg}`
    }
    return false
  }
}

function stopCamera(): void {
  if (videoRef.value?.srcObject) {
    const stream = videoRef.value.srcObject as MediaStream
    stream.getTracks().forEach((track) => track.stop())
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
  }
}

function prevLevel(): void {
  if (levelIndex.value > 0) {
    levelIndex.value--
    energyLevel.value = 0
    levelComplete.value = false
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

let energyAccumulator: number | null = null

function startEnergyLoop(): void {
  const tick = () => {
    if (props.paused) {
      energyAccumulator = requestAnimationFrame(tick)
      return
    }

    // Only accumulate energy after calibration completes
    if (detector.appState.value === 'PLAYING') {
      const target = currentTarget.value
      const score = detector.scores.value[target]
      const threshold = difficultyThreshold.value

      if (score > threshold) {
        const rate = (score - threshold) * (0.8 + props.difficulty * 0.3)
        energyLevel.value = Math.min(100, energyLevel.value + rate)

        if (!levelComplete.value && energyLevel.value >= 100) {
          levelComplete.value = true
          completedLevels.value[levelIndex.value] = true
          props.markRoundDirty()
          props.audio.playSuccessCue()
        }
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
  detector.dispose()
  stopCamera()
})
</script>

<style scoped>
.energy-ball-game {
  display: flex;
  gap: 24px;
  min-height: calc(100vh - 120px);
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

.energy-ball-game.paused {
  opacity: 0.7;
  pointer-events: none;
}

/* ---- Camera area ---- */

.camera-area {
  position: relative;
  flex: 1;
  max-width: 640px;
  border-radius: 20px;
  overflow: hidden;
  background: #1a1a2e;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.camera-feed {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

/* ---- Overlays ---- */

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
  padding: 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  text-align: center;
  max-width: 320px;
}

.prompt-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.loading-icon {
  animation: spin 2s linear infinite;
}

.prompt-card h3,
.error-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #2d3436;
}

.prompt-card p,
.error-card p {
  margin: 0 0 16px;
  color: #636e72;
  font-size: 15px;
}

.hint-text {
  color: #e17055 !important;
  font-weight: 600;
  font-size: 14px !important;
  margin-bottom: 12px !important;
}

.start-button {
  padding: 12px 32px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffd93d, #ff9a3c);
  color: #2d3436;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.start-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 217, 61, 0.4);
}

.error-card {
  background: rgba(255, 235, 235, 0.95);
  color: #c0392b;
}

/* ---- Calibration in-progress ---- */

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
  margin-bottom: 12px;
}

.cal-arc {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.3s ease;
}

.cal-percent {
  position: absolute;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.calibration-card p {
  margin: 4px 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
}

/* ---- Detection status ---- */

.detection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #b2bec3;
  background: rgba(0, 0, 0, 0.04);
}

.detection-status.detected {
  color: #00b894;
  background: rgba(0, 184, 148, 0.08);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b2bec3;
}

.detection-status.detected .status-dot {
  background: #00b894;
  animation: dot-pulse 1.5s ease-in-out infinite;
}

/* ---- Game panel ---- */

.game-panel {
  flex: 0 0 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

/* Level header */

.level-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.level-badge {
  flex: 0 0 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.level-info h2 {
  margin: 0;
  font-size: 20px;
  color: #2d3436;
}

.level-info p {
  margin: 2px 0 0;
  font-size: 13px;
  color: #636e72;
}

/* Energy ball */

.energy-ball-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.energy-ball {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.energy-ball.glowing {
  animation: ball-pulse 1.2s ease-in-out infinite;
}

.ball-emoji {
  font-size: 48px;
}

.energy-bar {
  width: 100%;
  height: 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.energy-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.15s ease;
}

.energy-label {
  font-size: 14px;
  color: #636e72;
  font-weight: 600;
}

/* Score panel */

.score-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.score-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.score-row.active {
  background: rgba(255, 217, 61, 0.12);
}

.emotion-label {
  flex: 0 0 40px;
  font-size: 13px;
  font-weight: 600;
  color: #2d3436;
}

.score-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.15s ease, background 0.2s ease;
}

.score-value {
  flex: 0 0 28px;
  text-align: right;
  font-size: 12px;
  color: #636e72;
  font-weight: 600;
}

/* Level complete */

.level-complete-banner {
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ffd93d, #ff9a3c);
  color: #2d3436;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.complete-icon {
  font-size: 24px;
}

/* Navigation */

.nav-buttons {
  display: flex;
  gap: 10px;
  margin-top: auto;
}

.nav-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
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

/* ---- Keyframes ---- */

@keyframes ball-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ---- Responsive ---- */

@media (max-width: 900px) {
  .energy-ball-game {
    flex-direction: column;
    padding: 16px;
  }

  .camera-area {
    max-width: 100%;
    max-height: 50vh;
  }

  .game-panel {
    flex: none;
  }
}
</style>
