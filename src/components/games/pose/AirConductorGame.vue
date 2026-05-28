<template>
  <div class="air-conductor">
    <PoseCameraLayer class="air-conductor__stage" :paused="cameraPaused" @pose-frame="handlePoseFrameEvent">
      <template #default="{ fps, offFrame, isReady }">
        <div class="air-conductor__topbar">
          <div class="air-conductor__topbar-group">
            <span class="air-conductor__badge">Air Conductor</span>
            <strong class="air-conductor__title">空中魔法指挥棒</strong>
          </div>
          <div class="air-conductor__topbar-group air-conductor__topbar-group--right">
            <button
              v-if="phase === 'playing'"
              type="button"
              class="air-conductor__pill air-conductor__pill--ghost"
              @click="pauseRun"
            >
              暂停
            </button>
            <button
              v-else-if="phase === 'paused'"
              type="button"
              class="air-conductor__pill air-conductor__pill--ghost"
              @click="resumeRun"
            >
              继续
            </button>
            <button
              type="button"
              class="air-conductor__pill air-conductor__pill--danger"
              @click="finishRun"
            >
              结束训练
            </button>
          </div>
        </div>

        <div class="air-conductor__layout">
          <section class="air-conductor__visual">
            <div class="air-conductor__particle-layer" aria-hidden="true">
              <svg class="air-conductor__beat-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient
                    v-for="segment in beatTrajectorySegments"
                    :id="`air-conductor-beat-gradient-${segment.id}`"
                    :key="`gradient-${segment.id}`"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" :stop-color="segment.colorWarm" />
                    <stop offset="100%" :stop-color="segment.colorCool" />
                  </linearGradient>
                </defs>

                <line
                  v-for="segment in beatTrajectorySegments"
                  :key="segment.id"
                  class="air-conductor__beat-segment"
                  :x1="(segment.startX * 100).toFixed(2)"
                  :y1="(segment.startY * 100).toFixed(2)"
                  :x2="(segment.endX * 100).toFixed(2)"
                  :y2="(segment.endY * 100).toFixed(2)"
                  :stroke="`url(#air-conductor-beat-gradient-${segment.id})`"
                  :stroke-width="segment.strokeWidth / 7"
                  :style="getBeatSegmentStyle(segment)"
                />
              </svg>

              <div
                v-for="emitter in particleEmitters"
                :key="emitter.hand"
                class="air-conductor__emitter"
                :class="`air-conductor__emitter--${emitter.hand}`"
                :style="getEmitterStyle(emitter)"
              >
                <span class="air-conductor__emitter-core" />
                <span class="air-conductor__emitter-ring" />
              </div>

              <span
                v-for="trailPoint in trailPoints"
                :key="trailPoint.id"
                class="air-conductor__trail-point"
                :class="`air-conductor__trail-point--${trailPoint.hand}`"
                :style="getTrailPointStyle(trailPoint)"
              />

              <span
                v-for="ripple in ripplePulses"
                :key="ripple.id"
                class="air-conductor__ripple"
                :class="`air-conductor__ripple--${ripple.hand}`"
                :style="getRippleStyle(ripple)"
              />

              <span
                v-for="particle in noteParticles"
                :key="particle.id"
                class="air-conductor__particle"
                :class="`air-conductor__particle--${particle.hand}`"
                :style="getParticleStyle(particle)"
              >
                {{ particle.symbol }}
              </span>
            </div>

            <div class="air-conductor__status-panel">
              <span class="air-conductor__status-label">状态</span>
              <strong>{{ phaseLabel }}</strong>
              <span class="air-conductor__status-meta">FPS {{ fps || 0 }}</span>
            </div>

            <div v-if="phase === 'idle'" class="air-conductor__overlay-card">
              <h2>准备开始上肢协同训练</h2>
              <p>先站到镜头前，抬起双臂像指挥家一样挥动。开始后会依次进入校准、倒计时和正式训练。</p>
              <div class="air-conductor__overlay-actions">
                <button type="button" class="air-conductor__pill air-conductor__pill--primary" @click="beginCalibration">
                  开始训练
                </button>
              </div>
            </div>

            <div v-else-if="phase === 'calibrating'" class="air-conductor__center-overlay">
              <strong>正在校准静息姿势</strong>
              <span>请自然站立并保持双肩稳定</span>
            </div>

            <div v-else-if="phase === 'countdown'" class="air-conductor__countdown">
              {{ countdownValue }}
            </div>

            <div v-else-if="phase === 'paused'" class="air-conductor__center-overlay">
              <strong>训练已暂停</strong>
              <span>调整好姿势后继续</span>
            </div>

            <div v-else-if="phase === 'finishing'" class="air-conductor__center-overlay">
              <strong>正在收尾并整理结果</strong>
              <span>请保持放松，结果马上完成</span>
            </div>

            <div v-if="offFrame" class="air-conductor__offframe">
              请回到摄像头取景范围内
            </div>

            <div class="air-conductor__floating-pitch">
              <span>本轮最高伸展</span>
              <strong>{{ stats.maxReachScore }}</strong>
            </div>

            <div class="air-conductor__camera-meta">
              <span>追踪状态</span>
              <strong>{{ isReady ? '已连接' : '准备中' }}</strong>
            </div>
          </section>

          <aside class="air-conductor__panel">
            <div class="air-conductor__metric-card">
              <span>训练时长</span>
              <strong>{{ formattedDuration }}</strong>
            </div>
            <div class="air-conductor__metric-card">
              <span>左臂抬举</span>
              <strong>{{ stats.leftArmExtensions }}</strong>
            </div>
            <div class="air-conductor__metric-card">
              <span>右臂抬举</span>
              <strong>{{ stats.rightArmExtensions }}</strong>
            </div>
            <div class="air-conductor__metric-card">
              <span>双侧协同</span>
              <strong>{{ bilateralLabel }}</strong>
            </div>
            <div class="air-conductor__metric-card">
              <span>最大伸展</span>
              <strong>{{ stats.maxReachScore }}分</strong>
            </div>

            <div class="air-conductor__notes">
              <div class="air-conductor__note">
                <span>运行态</span>
                <strong>{{ phaseLabel }}</strong>
              </div>
              <div class="air-conductor__note">
                <span>音乐</span>
                <strong>{{ musicHint }}</strong>
              </div>
              <div class="air-conductor__note">
                <span>统计摘要</span>
                <strong>{{ summaryText }}</strong>
              </div>
            </div>

            <button
              type="button"
              class="air-conductor__pill air-conductor__pill--secondary"
              @click="beginCalibration"
            >
              重新校准
            </button>

            <div v-if="phase === 'done'" class="air-conductor__done">
              <h3>本轮训练完成</h3>
              <p>统计已整理完成，可以直接写入现有训练记录主链。</p>
              <button type="button" class="air-conductor__pill air-conductor__pill--primary" @click="emitFinish">
                完成训练
              </button>
            </div>
          </aside>
        </div>
      </template>
    </PoseCameraLayer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PoseCameraLayer from '@/components/games/pose/PoseCameraLayer.vue'
import {
  AIR_CONDUCTOR_PARTICLE_BURST_INTERVAL_MS,
  createBeatTrajectorySegments,
  createConductorTrailFrame,
  mapArmPoseToParticleEmitters,
  pruneExpiredBeatTrajectorySegments,
  pruneExpiredNoteParticles,
  pruneExpiredRipples,
  pruneExpiredTrailPoints,
  spawnConductorRipples,
  spawnEmitterNoteParticles,
} from '@/components/games/pose/air-conductor-runtime'
import { usePoseAudio } from '@/composables/usePoseAudio'
import type { PoseFrame } from '@/composables/usePoseTracker'
import type {
  AirConductorBeatTrajectorySegment,
  AirConductorNoteParticle,
  AirConductorParticleEmitter,
  AirConductorRipplePulse,
  AirConductorTrailPoint,
} from '@/types/air-conductor'
import { TaskID, type GameSessionData } from '@/types/games'

const props = withDefaults(defineProps<{
  studentId: number
  taskId?: TaskID
  duration?: number
}>(), {
  taskId: TaskID.AIR_CONDUCTOR,
  duration: 60,
})

const emit = defineEmits<{
  finish: [session: GameSessionData]
}>()

const {
  phase,
  stats,
  isOffFrame,
  countdownValue,
  offFrameCount,
  buildSummary,
  handlePoseFrame,
  startCalibration,
  pauseSession,
  resumeSession,
  endSession,
  tick,
  dispose,
} = usePoseAudio(props.duration)

const startedAt = ref(Date.now())
const particleEmitters = ref<AirConductorParticleEmitter[]>([])
const noteParticles = ref<AirConductorNoteParticle[]>([])
const beatTrajectorySegments = ref<AirConductorBeatTrajectorySegment[]>([])
const trailPoints = ref<AirConductorTrailPoint[]>([])
const ripplePulses = ref<AirConductorRipplePulse[]>([])
let animationFrameId = 0
let nextParticleId = 0
let lastParticleBurstAt = 0
let previousParticleEmitters: AirConductorParticleEmitter[] = []

const cameraPaused = computed(() => phase.value === 'paused')
const formattedDuration = computed(() => buildSummary().formattedDuration)
const bilateralLabel = computed(() => `${stats.value.bilateralCoordSec.toFixed(1)}s`)
const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'idle':
      return '等待开始'
    case 'calibrating':
      return '校准中'
    case 'countdown':
      return '倒计时'
    case 'playing':
      return '训练进行中'
    case 'paused':
      return '已暂停'
    case 'finishing':
      return '收尾中'
    case 'done':
      return '已完成'
    default:
      return '准备中'
  }
})
const musicHint = computed(() => phase.value === 'playing' ? '已联动共享音乐系统' : '待机中')
const summaryText = computed(() => {
  const summary = buildSummary()
  return `左${summary.leftArmExtensions} / 右${summary.rightArmExtensions}`
})

function mapPoseFrameToArmPose(frame: PoseFrame | null) {
  if (!frame?.leftShoulder || !frame.rightShoulder || !frame.leftWrist || !frame.rightWrist) {
    return null
  }

  return {
    left: {
      x: frame.leftWrist.x,
      y: frame.leftWrist.y,
      visible: frame.leftWrist.visible,
    },
    right: {
      x: frame.rightWrist.x,
      y: frame.rightWrist.y,
      visible: frame.rightWrist.visible,
    },
    leftShoulder: {
      y: frame.leftShoulder.y,
    },
    rightShoulder: {
      y: frame.rightShoulder.y,
    },
    timestamp: frame.timestamp,
  }
}

function animationLoop(now: number) {
  noteParticles.value = pruneExpiredNoteParticles(noteParticles.value, now)
  beatTrajectorySegments.value = pruneExpiredBeatTrajectorySegments(beatTrajectorySegments.value, now)
  trailPoints.value = pruneExpiredTrailPoints(trailPoints.value, now)
  ripplePulses.value = pruneExpiredRipples(ripplePulses.value, now)
  void tick(now)
  animationFrameId = window.requestAnimationFrame(animationLoop)
}

function beginCalibration() {
  startedAt.value = Date.now()
  particleEmitters.value = []
  noteParticles.value = []
  beatTrajectorySegments.value = []
  trailPoints.value = []
  ripplePulses.value = []
  nextParticleId = 0
  lastParticleBurstAt = 0
  previousParticleEmitters = []
  void startCalibration()
}

function pauseRun() {
  void pauseSession()
}

function resumeRun() {
  void resumeSession()
}

function finishRun() {
  if (phase.value === 'done' || phase.value === 'finishing') {
    return
  }
  void endSession()
}

function getEmitterStyle(emitter: AirConductorParticleEmitter) {
  return {
    left: `${(emitter.x * 100).toFixed(2)}%`,
    top: `${(emitter.y * 100).toFixed(2)}%`,
    opacity: emitter.visible ? `${0.42 + emitter.intensity * 0.58}` : '0',
    '--emitter-scale': `${0.88 + emitter.intensity * 0.58}`,
    '--emitter-glow': emitter.hand === 'left' ? 'rgba(56, 189, 248, 0.42)' : 'rgba(168, 85, 247, 0.38)',
  }
}

function getParticleStyle(particle: AirConductorNoteParticle) {
  return {
    left: `${(particle.x * 100).toFixed(2)}%`,
    top: `${(particle.y * 100).toFixed(2)}%`,
    color: particle.color,
    opacity: `${particle.opacity}`,
    '--particle-drift-x': `${particle.driftX}px`,
    '--particle-drift-y': `${particle.driftY}px`,
    '--particle-rotation': `${particle.rotation}deg`,
    '--particle-scale': `${particle.scale}`,
    '--particle-delay': `${particle.delayMs}ms`,
  }
}

function getBeatSegmentStyle(segment: AirConductorBeatTrajectorySegment) {
  return {
    opacity: `${segment.opacity}`,
    '--beat-vector-x': `${segment.vectorX * 120}px`,
    '--beat-vector-y': `${segment.vectorY * 120}px`,
  }
}

function getTrailPointStyle(trailPoint: AirConductorTrailPoint) {
  return {
    left: `${(trailPoint.x * 100).toFixed(2)}%`,
    top: `${(trailPoint.y * 100).toFixed(2)}%`,
    width: `${trailPoint.radius * 2}px`,
    height: `${trailPoint.radius * 2}px`,
    opacity: `${trailPoint.opacity}`,
    background: trailPoint.color,
    boxShadow: `0 0 ${trailPoint.glowSize}px ${trailPoint.color}`,
  }
}

function getRippleStyle(ripple: AirConductorRipplePulse) {
  return {
    left: `${(ripple.x * 100).toFixed(2)}%`,
    top: `${(ripple.y * 100).toFixed(2)}%`,
    width: `${ripple.radius * 2}px`,
    height: `${ripple.radius * 2}px`,
    borderColor: ripple.color,
    opacity: `${0.22 + ripple.strength * 0.46}`,
    '--ripple-scale': `${1.18 + ripple.strength * 0.72}`,
  }
}

function emitFinish() {
  const totalExtensions = stats.value.leftArmExtensions + stats.value.rightArmExtensions
  const completionScore = Math.min(100, Math.round(
    (stats.value.maxReachScore * 0.5)
      + (Math.min(1, stats.value.bilateralCoordSec / Math.max(1, props.duration * 0.5)) * 30)
      + (Math.min(1, totalExtensions / Math.max(8, props.duration / 5)) * 20),
  ))

  const endTime = Date.now()
  emit('finish', {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: startedAt.value,
    endTime,
    duration: Math.max(1, stats.value.durationSec),
    trials: [],
    totalTrials: Math.max(1, totalExtensions),
    correctTrials: totalExtensions,
    accuracy: 1,
    avgResponseTime: totalExtensions > 0 ? Math.round((stats.value.durationSec * 1000) / totalExtensions) : 0,
    errors: {
      omission: 0,
      commission: 0,
    },
    behavior: {
      impulsivityScore: 0,
      fatigueIndex: 0,
      distractorPattern: isOffFrame.value ? 'pose_offframe_interruptions' : 'pose_bilateral_control',
    },
    handGameStats: {
      handTrackingUsed: true,
      pointerFallbackUsed: false,
      gestureEvents: totalExtensions,
      completionScore,
      leftArmExtensions: stats.value.leftArmExtensions,
      rightArmExtensions: stats.value.rightArmExtensions,
      bilateralCoordSec: Number(stats.value.bilateralCoordSec.toFixed(1)),
      maxReachScore: stats.value.maxReachScore,
      offFrameCount: offFrameCount.value,
    },
  })
}

function handlePoseFrameEvent(frame: PoseFrame | null) {
  const armPose = mapPoseFrameToArmPose(frame)
  particleEmitters.value = mapArmPoseToParticleEmitters(armPose)

  if (phase.value === 'playing' && frame?.timestamp && particleEmitters.value.some((emitter) => emitter.visible)) {
    const beatFrame = createBeatTrajectorySegments(previousParticleEmitters, particleEmitters.value, frame.timestamp, nextParticleId)
    nextParticleId = beatFrame.nextId
    beatTrajectorySegments.value = [
      ...pruneExpiredBeatTrajectorySegments(beatTrajectorySegments.value, frame.timestamp),
      ...beatFrame.segments,
    ]

    const trailFrame = createConductorTrailFrame(particleEmitters.value, frame.timestamp, nextParticleId)
    nextParticleId = trailFrame.nextId
    trailPoints.value = [
      ...pruneExpiredTrailPoints(trailPoints.value, frame.timestamp),
      ...trailFrame.points,
    ]

    const rippleFrame = spawnConductorRipples(particleEmitters.value, frame.timestamp, nextParticleId)
    nextParticleId = rippleFrame.nextId
    ripplePulses.value = [
      ...pruneExpiredRipples(ripplePulses.value, frame.timestamp),
      ...rippleFrame.ripples,
    ]
  }

  if (
    phase.value === 'playing'
    && particleEmitters.value.some((emitter) => emitter.visible)
    && frame?.timestamp
    && frame.timestamp - lastParticleBurstAt >= AIR_CONDUCTOR_PARTICLE_BURST_INTERVAL_MS
  ) {
    const burst = spawnEmitterNoteParticles(particleEmitters.value, frame.timestamp, nextParticleId)
    nextParticleId = burst.nextId
    lastParticleBurstAt = frame.timestamp
    noteParticles.value = [
      ...pruneExpiredNoteParticles(noteParticles.value, frame.timestamp),
      ...burst.particles,
    ]
  }

  if (!frame?.timestamp) {
    noteParticles.value = []
    beatTrajectorySegments.value = []
    trailPoints.value = []
    ripplePulses.value = []
    previousParticleEmitters = []
  } else {
    previousParticleEmitters = particleEmitters.value.map((emitter) => ({ ...emitter }))
  }

  void handlePoseFrame(armPose)
}

onMounted(() => {
  animationFrameId = window.requestAnimationFrame(animationLoop)
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
  }
  dispose()
})
</script>

<style scoped>
.air-conductor {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.air-conductor__stage {
  width: 100%;
  height: 100%;
}

.air-conductor__topbar {
  position: absolute;
  top: 18px;
  left: 18px;
  right: 18px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.air-conductor__topbar-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.air-conductor__topbar-group--right {
  justify-content: flex-end;
}

.air-conductor__badge,
.air-conductor__status-panel,
.air-conductor__floating-pitch,
.air-conductor__camera-meta,
.air-conductor__metric-card,
.air-conductor__note {
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
}

.air-conductor__badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 800;
}

.air-conductor__title {
  color: #0f172a;
  font-size: 1rem;
}

.air-conductor__layout {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  padding: 86px 20px 20px;
}

.air-conductor__visual {
  position: relative;
  min-height: 0;
}

.air-conductor__particle-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.air-conductor__beat-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.air-conductor__emitter,
.air-conductor__trail-point,
.air-conductor__ripple,
.air-conductor__particle {
  position: absolute;
  transform: translate(-50%, -50%);
}

.air-conductor__emitter {
  width: 26px;
  height: 26px;
  filter: drop-shadow(0 0 16px var(--emitter-glow));
}

.air-conductor__emitter-core,
.air-conductor__emitter-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

.air-conductor__emitter-core {
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.98) 0%, rgba(191, 219, 254, 0.84) 42%, rgba(59, 130, 246, 0.12) 72%, transparent 100%);
  transform: scale(var(--emitter-scale));
}

.air-conductor__emitter-ring {
  border: 1px solid rgba(255, 255, 255, 0.82);
  animation: air-conductor-emitter-pulse 1.25s ease-out infinite;
}

.air-conductor__particle {
  z-index: 1;
  font-size: 1.3rem;
  font-weight: 900;
  line-height: 1;
  text-shadow:
    0 0 12px color-mix(in srgb, currentColor 58%, transparent),
    0 0 28px color-mix(in srgb, currentColor 32%, transparent);
  animation: air-conductor-note-float 1.5s ease-out forwards;
  animation-delay: var(--particle-delay);
}

.air-conductor__trail-point {
  z-index: 0;
  border-radius: 999px;
  mix-blend-mode: screen;
  animation: air-conductor-trail-fade 0.52s ease-out forwards;
}

.air-conductor__ripple {
  z-index: 0;
  border: 2px solid;
  border-radius: 999px;
  mix-blend-mode: screen;
  animation: air-conductor-ripple-pulse 0.82s ease-out forwards;
}

.air-conductor__beat-segment {
  stroke-linecap: round;
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.18));
  animation: air-conductor-beat-trace 0.46s ease-out forwards;
}

.air-conductor__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.air-conductor__status-panel,
.air-conductor__floating-pitch,
.air-conductor__camera-meta,
.air-conductor__metric-card,
.air-conductor__note,
.air-conductor__overlay-card,
.air-conductor__done,
.air-conductor__center-overlay,
.air-conductor__offframe,
.air-conductor__countdown {
  border-radius: 24px;
}

.air-conductor__status-panel {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: grid;
  gap: 6px;
  padding: 16px 18px;
}

.air-conductor__camera-meta {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 2;
  display: grid;
  gap: 4px;
  padding: 14px 16px;
}

.air-conductor__status-label,
.air-conductor__status-meta,
.air-conductor__metric-card span,
.air-conductor__note span,
.air-conductor__camera-meta span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.air-conductor__status-panel strong,
.air-conductor__metric-card strong,
.air-conductor__note strong,
.air-conductor__camera-meta strong {
  color: #0f172a;
  font-size: 1.1rem;
}

.air-conductor__floating-pitch {
  position: absolute;
  right: 0;
  top: 0;
  z-index: 2;
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  text-align: right;
}

.air-conductor__floating-pitch span {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.air-conductor__floating-pitch strong {
  color: #1d4ed8;
  font-size: 2rem;
  line-height: 1;
}

.air-conductor__metric-card,
.air-conductor__note,
.air-conductor__done {
  padding: 16px 18px;
}

.air-conductor__metric-card {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.air-conductor__notes {
  display: grid;
  gap: 10px;
}

.air-conductor__note {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.air-conductor__overlay-card,
.air-conductor__center-overlay,
.air-conductor__offframe,
.air-conductor__countdown {
  position: absolute;
  z-index: 3;
  left: 50%;
  transform: translateX(-50%);
}

.air-conductor__overlay-card {
  top: 50%;
  width: min(640px, calc(100% - 32px));
  padding: 28px 30px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 26px 56px rgba(15, 23, 42, 0.16);
  text-align: center;
  transform: translate(-50%, -50%);
}

.air-conductor__overlay-card h2,
.air-conductor__done h3 {
  margin: 0 0 10px;
  color: #0f172a;
}

.air-conductor__overlay-card p,
.air-conductor__done p {
  margin: 0;
  color: #475569;
  line-height: 1.8;
}

.air-conductor__overlay-actions {
  display: flex;
  justify-content: center;
  margin-top: 22px;
}

.air-conductor__center-overlay,
.air-conductor__offframe {
  display: grid;
  gap: 6px;
  padding: 16px 20px;
  color: #0f172a;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.14);
}

.air-conductor__center-overlay {
  top: 50%;
  min-width: 320px;
  transform: translate(-50%, -50%);
}

.air-conductor__offframe {
  bottom: 18px;
}

.air-conductor__countdown {
  top: 50%;
  min-width: 148px;
  min-height: 148px;
  display: grid;
  place-items: center;
  color: #1d4ed8;
  font-size: 4rem;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 28px 58px rgba(15, 23, 42, 0.18);
  transform: translate(-50%, -50%);
}

.air-conductor__pill {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.air-conductor__pill--primary {
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #14b8a6);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.22);
}

.air-conductor__pill--secondary,
.air-conductor__pill--ghost {
  color: #24415b;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.1);
}

.air-conductor__pill--danger {
  color: #fff;
  background: linear-gradient(135deg, #ef4444, #f97316);
  box-shadow: 0 14px 28px rgba(239, 68, 68, 0.24);
}

@keyframes air-conductor-emitter-pulse {
  0% {
    opacity: 0.68;
    transform: scale(0.86);
  }

  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}

@keyframes air-conductor-note-float {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.68) rotate(0deg);
  }

  18% {
    opacity: var(--particle-opacity, 1);
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }

  100% {
    opacity: 0;
    transform:
      translate(
        calc(-50% + var(--particle-drift-x)),
        calc(-50% + var(--particle-drift-y))
      )
      scale(var(--particle-scale))
      rotate(var(--particle-rotation));
  }
}

@keyframes air-conductor-trail-fade {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.72);
  }

  22% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.28);
  }
}

@keyframes air-conductor-ripple-pulse {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.32);
  }

  16% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.84);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(var(--ripple-scale));
  }
}

@keyframes air-conductor-beat-trace {
  0% {
    opacity: 0;
    stroke-dasharray: 0 120;
    transform: translate(0, 0);
  }

  24% {
    opacity: 1;
    stroke-dasharray: 42 120;
    transform: translate(0, 0);
  }

  100% {
    opacity: 0;
    stroke-dasharray: 120 120;
    transform: translate(var(--beat-vector-x), var(--beat-vector-y));
  }
}

@media (max-width: 1080px) {
  .air-conductor__layout {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }

  .air-conductor__panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .air-conductor__done {
    grid-column: 1 / -1;
  }
}

@media (max-width: 700px) {
  .air-conductor__topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .air-conductor__topbar-group,
  .air-conductor__topbar-group--right {
    justify-content: center;
    flex-wrap: wrap;
  }

  .air-conductor__layout {
    padding-top: 126px;
  }

  .air-conductor__panel {
    grid-template-columns: 1fr;
  }
}
</style>
