<template>
  <div class="detective-game">
    <!-- Main game layout (always rendered so video element is in DOM) -->
    <div class="detective-game__layout">
      <!-- Left: Camera -->
      <div class="detective-game__left">
        <div class="camera-panel" :class="{ 'camera-panel--detected': detector.faceDetected.value }">
          <video ref="videoRef" class="camera-panel__video" autoplay playsinline muted />
          <div v-if="!detector.faceDetected.value && gamePhase !== 'calibrating'" class="camera-panel__no-face">
            把脸放进框里
          </div>
          <div v-else-if="detector.faceDetected.value" class="camera-panel__badge">✓ 已检测到</div>
        </div>
      </div>

      <!-- Center: Target card -->
      <div class="detective-game__center">
        <!-- Calibration overlay (on top of center area) -->
        <div v-if="gamePhase === 'calibrating'" class="calibration-card">
          <div class="calibration-card__icon">📷</div>
          <h2 class="calibration-card__title">准备中...</h2>
          <p class="calibration-card__hint">看着摄像头，保持自然表情</p>
          <div class="calibration-card__progress">
            <div class="calibration-bar" :style="{ width: calibrationPercent + '%' }" />
          </div>
          <p class="calibration-card__percent">{{ calibrationPercent }}%</p>
        </div>

        <!-- Active round target card -->
        <template v-else>
          <Transition name="slide-in" mode="out-in">
            <div v-if="currentTarget" :key="currentTarget.id" class="target-card">
              <div class="target-card__timer" v-if="roundTimeLeft > 0">
                <svg class="target-card__timer-ring" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#EEE" stroke-width="4" />
                  <circle
                    cx="26" cy="26" r="22" fill="none"
                    :stroke="timerColor"
                    stroke-width="4"
                    stroke-linecap="round"
                    :stroke-dasharray="timerCircumference"
                    :stroke-dashoffset="timerOffset"
                    transform="rotate(-90 26 26)"
                  />
                </svg>
                <span class="target-card__timer-text">{{ roundTimeLeft }}</span>
              </div>
              <FaceSVG :expression="currentTarget.emotionKey" :size="200" />
              <h3 class="target-card__label">{{ currentTarget.label }}</h3>
              <p class="target-card__hint">{{ currentTarget.hint }}</p>
            </div>
          </Transition>

          <!-- Wave complete overlay -->
          <Transition name="slide-up">
            <div v-if="gamePhase === 'wave-complete'" class="result-overlay">
              <div class="result-overlay__card">
                <div class="result-overlay__emoji">🎉</div>
                <h2 class="result-overlay__title">{{ currentWave.waveName }} 完成！</h2>
                <div class="result-overlay__stars">
                  <span v-for="i in 3" :key="i" class="result-overlay__star" :class="{ 'result-overlay__star--filled': i <= waveStars }">★</span>
                </div>
                <p class="result-overlay__score">本关得分：{{ waveTotalScore }} 分</p>
                <p class="result-overlay__encouragement">{{ waveEncouragement }}</p>
                <div class="result-overlay__actions">
                  <button class="result-overlay__btn result-overlay__btn--outline" @click="replayWave">再挑战一次</button>
                  <button
                    v-if="hasNextWave"
                    class="result-overlay__btn result-overlay__btn--primary"
                    @click="nextWave"
                  >下一关 →</button>
                </div>
              </div>
            </div>
          </Transition>
        </template>
      </div>

      <!-- Right: Match meter -->
      <div class="detective-game__right">
        <div class="match-meter">
          <svg class="match-meter__ring" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="76" fill="none" stroke="#EEE" stroke-width="14" />
            <circle
              cx="90" cy="90" r="76" fill="none"
              :stroke="matchColor"
              stroke-width="14"
              stroke-linecap="round"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringOffset"
              transform="rotate(-90 90 90)"
            />
          </svg>
          <div class="match-meter__center" :style="{ color: matchColor }">
            {{ matchPercent }}%
          </div>
        </div>

        <div class="match-meter__stars">
          <span v-for="i in 3" :key="i" class="match-meter__star" :class="{ 'match-meter__star--filled': gamePhase === 'wave-complete' && i <= waveStars }">★</span>
        </div>

        <div class="match-meter__hint" :style="{ color: matchColor }">
          {{ matchHint }}
        </div>

        <div class="match-meter__score">
          累计得分：{{ totalScore }}
        </div>
      </div>
    </div>

    <!-- Bottom navigation -->
    <div v-if="gamePhase !== 'calibrating'" class="detective-game__footer">
      <span class="detective-game__wave-badge">{{ currentWave.waveName }}</span>
      <span class="detective-game__round-info">第 {{ currentRoundIndex + 1 }} / {{ currentWave.rounds }} 题</span>
    </div>

    <!-- Success flash effect -->
    <Transition name="flash">
      <div v-if="showSuccessFlash" class="detective-game__success-flash">
        <div class="success-particles">
          <span v-for="i in 5" :key="i" class="success-particle" :style="particleStyle(i)">✦</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { EmotionGameDifficulty } from '@/types/emotional/games'
import type { EmotionGameAudioController } from '@/types/emotional/games'
import type { CustomGameCompletionPayload } from '@/types/emotional/games'
import { useEmotionDetector } from '@/composables/useEmotionDetector'
import FaceSVG from './expression-detective/FaceSVG.vue'
import {
  DETECTIVE_WAVES,
  ENCOURAGEMENTS,
  getScoreForMatch,
  getStarsForScore,
  getMatchColor,
  getMatchHint,
} from './expression-detective/config'
import type { ExpressionTarget, DetectiveWave } from './expression-detective/config'

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty: () => void
  audio: EmotionGameAudioController
  cameraStream?: MediaStream | null
}>()

const emit = defineEmits<{
  complete: [payload: CustomGameCompletionPayload]
}>()

// --- Detector ---
const detector = useEmotionDetector({
  smoothingFactor: 0.3,
  calibrationFrames: 20,
})

// --- Refs ---
const videoRef = ref<HTMLVideoElement | null>(null)
const gamePhase = ref<'calibrating' | 'playing' | 'round-active' | 'round-success' | 'wave-complete'>('calibrating')

const currentWaveIndex = ref(0)
const currentRoundIndex = ref(0)
const roundTargets = ref<ExpressionTarget[]>([])

const matchPercent = ref(0)
const roundMaxMatch = ref(0)
const showSuccessFlash = ref(false)

const roundTimeLeft = ref(0)
let roundTimer: ReturnType<typeof setInterval> | null = null
let detectRAF = 0

// Rolling average for match detection
const scoreWindow = ref<number[]>([])
const SMOOTH_FRAMES = 5
const SUCCESS_THRESHOLD = 0.80
const SUCCESS_HOLD_MS = 300
let successStartTime: number | null = null

// Wave results
const roundScores = ref<number[]>([])
const totalScore = ref(0)
const waveTotalScore = ref(0)
const waveEncouragement = ref('')

// --- Computed ---
const currentWave = computed<DetectiveWave>(() => DETECTIVE_WAVES[currentWaveIndex.value] ?? DETECTIVE_WAVES[0]!)
const currentTarget = computed(() => roundTargets.value[currentRoundIndex.value] ?? null)
const hasNextWave = computed(() => currentWaveIndex.value < DETECTIVE_WAVES.length - 1)

const calibrationPercent = computed(() => Math.round(detector.calibrationProgress.value * 100))

const matchColor = computed(() => getMatchColor(matchPercent.value))
const matchHint = computed(() => getMatchHint(matchPercent.value))

const waveStars = computed(() => {
  if (roundScores.value.length === 0) return 1
  const avg = roundScores.value.reduce((a, b) => a + b, 0) / roundScores.value.length
  return getStarsForScore(avg)
})

// Timer ring SVG
const timerCircumference = 2 * Math.PI * 22
const timerOffset = computed(() => {
  if (!currentWave.value || roundTimeLeft.value <= 0) return 0
  const total = currentWave.value.timeLimitPerRound
  const progress = roundTimeLeft.value / total
  return timerCircumference * (1 - progress)
})
const timerColor = computed(() => {
  if (roundTimeLeft.value <= 1) return '#EF5350'
  if (roundTimeLeft.value <= 2) return '#FFB74D'
  return '#4FC3F7'
})

// Match meter ring SVG
const ringCircumference = 2 * Math.PI * 76
const ringOffset = computed(() => ringCircumference * (1 - matchPercent.value / 100))

// --- Camera setup ---
async function startCamera(): Promise<boolean> {
  if (!props.cameraStream || !videoRef.value) return false
  const stream = props.cameraStream
  const hasActiveVideo = stream.getVideoTracks().some(t => t.readyState === 'live')
  if (!hasActiveVideo) return false

  videoRef.value.srcObject = stream
  return new Promise(resolve => {
    const v = videoRef.value!
    v.onloadedmetadata = () => {
      v.play()
      resolve(true)
    }
    v.onerror = () => resolve(false)
  })
}

// --- Game flow ---
function generateRoundTargets(wave: DetectiveWave): ExpressionTarget[] {
  const targets: ExpressionTarget[] = []
  for (let i = 0; i < wave.rounds; i++) {
    targets.push(wave.targets[i % wave.targets.length]!)
  }
  if (wave.shuffleTargets) {
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      ;[targets[i], targets[j]] = [targets[j]!, targets[i]!]
    }
  }
  return targets
}

function startWave() {
  const wave = currentWave.value
  roundTargets.value = generateRoundTargets(wave)
  currentRoundIndex.value = 0
  roundScores.value = []
  waveTotalScore.value = 0
  waveEncouragement.value = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)] || ENCOURAGEMENTS[0]!
  resetMatch()
  startRound()
}

function startRound() {
  gamePhase.value = 'round-active'
  resetMatch()
  roundMaxMatch.value = 0

  const timeLimit = currentWave.value.timeLimitPerRound
  roundTimeLeft.value = timeLimit

  if (roundTimer) clearInterval(roundTimer)
  roundTimer = setInterval(() => {
    if (props.paused) return
    roundTimeLeft.value--
    if (roundTimeLeft.value <= 0) {
      clearInterval(roundTimer!)
      roundTimer = null
      endRound(false)
    }
  }, 1000)

  startDetectLoop()
}

function resetMatch() {
  scoreWindow.value = []
  matchPercent.value = 0
  successStartTime = null
}

function startDetectLoop() {
  cancelAnimationFrame(detectRAF)

  function loop() {
    if (props.paused || gamePhase.value !== 'round-active') {
      detectRAF = requestAnimationFrame(loop)
      return
    }

    const target = currentTarget.value
    if (!target || !detector.faceDetected.value) {
      detectRAF = requestAnimationFrame(loop)
      return
    }

    const raw = detector.scores.value[target.emotionKey] ?? 0
    scoreWindow.value.push(raw)
    if (scoreWindow.value.length > SMOOTH_FRAMES) scoreWindow.value.shift()

    const avg = scoreWindow.value.reduce((a, b) => a + b, 0) / scoreWindow.value.length
    const pct = Math.round(avg * 100)
    matchPercent.value = pct
    if (pct > roundMaxMatch.value) roundMaxMatch.value = pct

    props.markRoundDirty()

    if (avg >= SUCCESS_THRESHOLD) {
      if (successStartTime === null) {
        successStartTime = Date.now()
      } else if (Date.now() - successStartTime >= SUCCESS_HOLD_MS) {
        endRound(true)
        return
      }
    } else {
      successStartTime = null
    }

    detectRAF = requestAnimationFrame(loop)
  }

  detectRAF = requestAnimationFrame(loop)
}

function endRound(success: boolean) {
  if (roundTimer) { clearInterval(roundTimer); roundTimer = null }
  cancelAnimationFrame(detectRAF)

  if (success) {
    gamePhase.value = 'round-success'
    triggerSuccessFlash()
    try { props.audio.playSuccessCue() } catch {}
  }

  const maxPct = roundMaxMatch.value
  const score = getScoreForMatch(maxPct)
  roundScores.value.push(score)
  totalScore.value += score
  waveTotalScore.value += score

  const delay = success ? 800 : 400
  setTimeout(() => {
    if (currentRoundIndex.value < roundTargets.value.length - 1) {
      currentRoundIndex.value++
      startRound()
    } else {
      completeWave()
    }
  }, delay)
}

function completeWave() {
  gamePhase.value = 'wave-complete'
}

function replayWave() {
  startWave()
}

function nextWave() {
  if (!hasNextWave.value) return
  currentWaveIndex.value++
  startWave()
}

function triggerSuccessFlash() {
  showSuccessFlash.value = true
  setTimeout(() => { showSuccessFlash.value = false }, 600)
}

function particleStyle(i: number) {
  const angle = (i * 72 - 90) * Math.PI / 180
  const dist = 60 + Math.random() * 40
  return {
    transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`,
    animationDelay: `${i * 0.08}s`,
  }
}

// --- Pause/resume ---
watch(() => props.paused, (p) => {
  if (p) {
    detector.pause()
    if (roundTimer) { clearInterval(roundTimer); roundTimer = null }
  } else {
    detector.resume()
    if (gamePhase.value === 'round-active') {
      startDetectLoop()
    }
  }
})

// --- Calibration completion ---
watch(() => detector.isCalibrating.value, (calibrating, wasCalibrating) => {
  if (wasCalibrating && !calibrating && detector.baseline.value) {
    detector.startPlaying()
    gamePhase.value = 'playing'
    startWave()
  }
})

// --- Lifecycle ---
onMounted(async () => {
  const cameraOk = await startCamera()
  if (cameraOk && videoRef.value) {
    await detector.initialize(videoRef.value)
    await detector.startCalibration()
  }
})

onBeforeUnmount(() => {
  if (roundTimer) clearInterval(roundTimer)
  cancelAnimationFrame(detectRAF)
  detector.dispose()
})
</script>

<style scoped>
.detective-game {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #EBF6FF 0%, #F8FBFF 100%);
  position: relative;
  overflow: hidden;
  padding-top: 60px;
}

/* --- Calibration card (centered in center column) --- */
.calibration-card {
  text-align: center;
  padding: 40px 60px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  z-index: 5;
}

.calibration-card__icon { font-size: 48px; margin-bottom: 12px; }
.calibration-card__title { font-size: 28px; font-weight: 500; color: #333; margin: 0 0 8px; }
.calibration-card__hint { font-size: 18px; color: #888; margin: 0 0 20px; }
.calibration-card__progress {
  width: 240px;
  height: 8px;
  background: #EEE;
  border-radius: 4px;
  overflow: hidden;
  margin: 0 auto 8px;
}
.calibration-bar {
  height: 100%;
  background: #4FC3F7;
  border-radius: 4px;
  transition: width 0.15s ease;
}
.calibration-card__percent { font-size: 16px; color: #4FC3F7; margin: 0; }

/* --- Main layout --- */
.detective-game__layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* --- Left: Camera --- */
.detective-game__left {
  width: 30%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.camera-panel {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 4/3;
  background: #222;
  box-shadow: 0 0 0 3px transparent;
  transition: box-shadow 0.3s ease;
}

.camera-panel--detected {
  box-shadow: 0 0 0 4px #4FC3F7;
  animation: pulse-border 2s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 0 4px #4FC3F7; }
  50% { box-shadow: 0 0 0 6px rgba(79, 195, 247, 0.4); }
}

.camera-panel__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.camera-panel__no-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  background: rgba(0, 0, 0, 0.3);
}

.camera-panel__badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: #81C784;
  color: white;
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 12px;
}

/* --- Center: Target card --- */
.detective-game__center {
  width: 40%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
}

.target-card {
  width: 280px;
  padding: 20px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
  position: relative;
}

.target-card__timer {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 52px;
  height: 52px;
  position: absolute;
}

.target-card__timer-ring {
  width: 52px;
  height: 52px;
}

.target-card__timer-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.target-card__label {
  font-size: 32px;
  font-weight: 500;
  color: #333;
  margin: 12px 0 4px;
}

.target-card__hint {
  font-size: 20px;
  color: #888;
  margin: 0;
}

/* --- Right: Match meter --- */
.detective-game__right {
  width: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 16px;
}

.match-meter {
  position: relative;
  width: 180px;
  height: 180px;
}

.match-meter__ring { width: 180px; height: 180px; }

.match-meter__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 500;
  transition: color 0.3s;
}

.match-meter__stars {
  display: flex;
  gap: 8px;
}

.match-meter__star {
  font-size: 28px;
  color: #DDD;
  transition: color 0.3s;
}

.match-meter__star--filled { color: #FFD54F; }

.match-meter__hint {
  font-size: 20px;
  font-weight: 500;
  min-height: 28px;
  transition: color 0.3s;
}

.match-meter__score {
  font-size: 22px;
  color: #555;
}

/* --- Footer --- */
.detective-game__footer {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #F8FBFF;
  border-top: 1px solid #E0E7EF;
}

.detective-game__wave-badge {
  padding: 4px 14px;
  border-radius: 20px;
  background: #E3F2FD;
  color: #1976D2;
  font-size: 14px;
  font-weight: 500;
}

.detective-game__round-info {
  font-size: 16px;
  color: #666;
}

/* --- Result overlay --- */
.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  z-index: 10;
}

.result-overlay__card {
  text-align: center;
  padding: 40px 60px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.result-overlay__emoji { font-size: 48px; margin-bottom: 8px; }
.result-overlay__title { font-size: 28px; font-weight: 500; color: #333; margin: 0 0 16px; }
.result-overlay__stars { display: flex; justify-content: center; gap: 8px; margin-bottom: 12px; }
.result-overlay__star { font-size: 36px; color: #DDD; }
.result-overlay__star--filled { color: #FFD54F; }
.result-overlay__score { font-size: 22px; color: #555; margin: 0 0 8px; }
.result-overlay__encouragement { font-size: 18px; color: #4FC3F7; margin: 0 0 20px; }
.result-overlay__actions { display: flex; gap: 16px; justify-content: center; }

.result-overlay__btn {
  height: 48px;
  padding: 0 28px;
  border-radius: 24px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.result-overlay__btn--outline {
  background: white;
  border: 1.5px solid #B0BEC5;
  color: #607D8B;
}

.result-overlay__btn--outline:hover { background: #F5F5F5; }

.result-overlay__btn--primary {
  background: #4FC3F7;
  color: white;
}

.result-overlay__btn--primary:hover { background: #29B6F6; }

/* --- Success flash --- */
.detective-game__success-flash {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 20;
}

.success-particles {
  position: relative;
}

.success-particle {
  position: absolute;
  font-size: 24px;
  color: #FFD54F;
  animation: particle-fly 0.6s ease-out forwards;
}

@keyframes particle-fly {
  0% { opacity: 1; transform: translate(0, 0) scale(1); }
  100% { opacity: 0; transform: var(--end-transform, translate(0, -80px)) scale(0.5); }
}

/* --- Transitions --- */
.slide-in-enter-active { transition: all 0.3s ease-out; }
.slide-in-leave-active { transition: all 0.2s ease-in; }
.slide-in-enter-from { opacity: 0; transform: translateX(40px); }
.slide-in-leave-to { opacity: 0; transform: translateX(-40px); }

.slide-up-enter-active { transition: all 0.4s ease-out; }
.slide-up-leave-active { transition: all 0.3s ease-in; }
.slide-up-enter-from { opacity: 0; transform: translateY(100%); }
.slide-up-leave-to { opacity: 0; }

.flash-enter-active { transition: opacity 0.3s; }
.flash-leave-active { transition: opacity 0.3s; }
.flash-enter-from { opacity: 0; }
.flash-leave-to { opacity: 0; }
</style>
