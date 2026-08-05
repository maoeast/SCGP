<template>
  <div class="air-conductor">
    <PoseCameraLayer class="air-conductor__stage" :paused="cameraPaused" @pose-frame="handlePoseFrameEvent">
      <template #default="{ offFrame, cameraError }">
        <div class="air-conductor__topbar">
          <div class="air-conductor__topbar-group">
            <span class="air-conductor__badge">Air Conductor</span>
            <strong class="air-conductor__title">空中魔法指挥棒</strong>
          </div>
          <div class="air-conductor__topbar-group air-conductor__topbar-group--right">
            <button
              v-if="cameraError"
              type="button"
              class="air-conductor__pill air-conductor__pill--danger"
              @click="emitCancel"
            >
              返回
            </button>
            <template v-else>
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
            </template>
          </div>
        </div>

        <div v-if="cameraError" class="air-conductor__overlay-card">
          <h2>无法开始训练</h2>
          <p>{{ getCameraErrorHint(cameraError) }}</p>
          <div class="air-conductor__overlay-actions">
            <button
              type="button"
              class="air-conductor__pill air-conductor__pill--primary"
              @click="emitCancel"
            >
              返回
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

            <div
              v-if="phase !== 'idle'"
              class="air-conductor__hud-stack"
              :class="hudStackClass"
            >
              <div
                class="air-conductor__status-panel"
                :class="{ 'air-conductor__status-panel--spotlight': phase === 'done' }"
              >
                <span class="air-conductor__status-label">当前任务</span>
                <strong>{{ phaseLabel }}</strong>
                <span class="air-conductor__status-meta">{{ formattedDuration }}</span>
              </div>

              <div
                class="air-conductor__prompt-card"
                :class="mainPromptToneClass"
              >
                <div class="air-conductor__prompt-copy">
                  <span class="air-conductor__prompt-eyebrow">{{ mainPromptEyebrow }}</span>
                  <strong class="air-conductor__prompt-title">{{ mainPromptTitle }}</strong>
                  <p class="air-conductor__prompt-body">{{ mainPromptBody }}</p>
                </div>

                <div class="air-conductor__prompt-meta">
                  <span class="air-conductor__prompt-chip">挥动 {{ totalExtensions }} 次</span>
                  <span class="air-conductor__prompt-chip">训练 {{ formattedDuration }}</span>
                  <span class="air-conductor__prompt-chip">最高 {{ stats.maxReachScore }} 分</span>
                </div>

                <div class="air-conductor__prompt-actions">
                  <button
                    v-if="phase === 'done'"
                    type="button"
                    class="air-conductor__pill air-conductor__pill--primary"
                    @click="emitFinish"
                  >
                    完成训练
                  </button>
                  <button
                    v-else-if="phase !== 'countdown' && phase !== 'finishing'"
                    type="button"
                    class="air-conductor__pill air-conductor__pill--secondary"
                    @click="beginCalibration"
                  >
                    重新校准
                  </button>
                </div>
              </div>
            </div>

            <div v-if="phase === 'idle' && !cameraError" class="air-conductor__overlay-card">
              <h2>准备开始上肢协同训练</h2>
              <p>先站到镜头前，抬起双臂像指挥家一样挥动。开始后会依次进入校准、倒计时和正式训练。</p>
              <div class="air-conductor__overlay-actions">
                <button type="button" class="air-conductor__pill air-conductor__pill--primary" @click="beginCalibration">
                  开始训练
                </button>
              </div>
            </div>

            <div v-if="phase === 'countdown'" class="air-conductor__countdown">
              {{ countdownValue }}
            </div>
          </section>
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
  /** 相机不可用时用户选择返回（不保存训练记录） */
  cancel: []
}>()

/** 相机错误标题 → 补充提示文案 */
function getCameraErrorHint(error: string): string {
  switch (error) {
    case '未检测到摄像头':
      return '本游戏需要摄像头捕捉手臂动作。请连接摄像头后重试。'
    case '摄像头权限被拒绝':
      return '请在系统设置中允许本应用使用摄像头后重试。'
    case '摄像头被其他应用占用':
      return '摄像头可能正被其他应用使用，请关闭后重试。'
    default:
      return '请检查摄像头连接与权限设置后重试。'
  }
}

function emitCancel() {
  emit('cancel')
}

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
const totalExtensions = computed(() => stats.value.leftArmExtensions + stats.value.rightArmExtensions)
const phaseLabel = computed(() => {
  switch (phase.value) {
    case 'idle':
      return '等待开始'
    case 'calibrating':
      return '正在准备'
    case 'countdown':
      return '马上开始'
    case 'playing':
      return '跟着挥动'
    case 'paused':
      return '暂停一下'
    case 'finishing':
      return '收尾中'
    case 'done':
      return '完成啦'
    default:
      return '准备中'
  }
})

const mainPromptEyebrow = computed(() => {
  if (isOffFrame.value) return '站回镜头里'
  switch (phase.value) {
    case 'calibrating':
      return '先站稳'
    case 'countdown':
      return '准备起飞'
    case 'playing':
      return '跟着节奏来'
    case 'paused':
      return '休息一下'
    case 'finishing':
      return '马上出结果'
    case 'done':
      return '你做到了'
    default:
      return '准备开始'
  }
})

const mainPromptTitle = computed(() => {
  if (isOffFrame.value) return '回到画面中间'
  switch (phase.value) {
    case 'calibrating':
      return '站稳身体，肩膀放松'
    case 'countdown':
      return '双臂准备飞起来'
    case 'playing':
      return '双臂向上挥动'
    case 'paused':
      return '调整好再继续'
    case 'finishing':
      return '保持放松，结果整理中'
    case 'done':
      return '本轮训练完成'
    default:
      return '准备挥动双臂'
  }
})

const mainPromptBody = computed(() => {
  if (isOffFrame.value) return '向前站一点点，让小手套重新回到镜头里。'
  switch (phase.value) {
    case 'calibrating':
      return '看着屏幕站好，等系统记住你的起始姿势。'
    case 'countdown':
      return '听着节奏，等数字结束就把双手举高高。'
    case 'playing':
      return '像指挥家一样挥动双手，越大胆越好。'
    case 'paused':
      return '准备好了就继续，我们慢慢来。'
    case 'finishing':
      return '先别离开镜头，训练记录马上整理完成。'
    case 'done':
      return '可以完成训练，结果会继续走训练记录和报告主链。'
    default:
      return '先站到镜头前，再开始这场发光指挥游戏。'
  }
})

const mainPromptToneClass = computed(() => {
  if (isOffFrame.value) return 'air-conductor__prompt-card--warning'
  switch (phase.value) {
    case 'paused':
      return 'air-conductor__prompt-card--calm'
    case 'done':
      return 'air-conductor__prompt-card--success'
    case 'finishing':
      return 'air-conductor__prompt-card--calm'
    default:
      return 'air-conductor__prompt-card--playful'
  }
})

const hudStackClass = computed(() => {
  if (phase.value === 'done') return 'air-conductor__hud-stack--center'
  if (isOffFrame.value) return 'air-conductor__hud-stack--offframe'
  return 'air-conductor__hud-stack--default'
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
  const totalExtensionCount = totalExtensions.value
  const completionScore = Math.min(100, Math.round(
    (stats.value.maxReachScore * 0.5)
      + (Math.min(1, stats.value.bilateralCoordSec / Math.max(1, props.duration * 0.5)) * 30)
      + (Math.min(1, totalExtensionCount / Math.max(8, props.duration / 5)) * 20),
  ))

  const endTime = Date.now()
  emit('finish', {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: startedAt.value,
    endTime,
    duration: Math.max(1, stats.value.durationSec),
    trials: [],
    totalTrials: Math.max(1, totalExtensionCount),
    correctTrials: totalExtensionCount,
    accuracy: 1,
    avgResponseTime: totalExtensionCount > 0 ? Math.round((stats.value.durationSec * 1000) / totalExtensionCount) : 0,
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
      gestureEvents: totalExtensionCount,
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
.air-conductor__prompt-card,
.air-conductor__overlay-card,
.air-conductor__offframe,
.air-conductor__countdown,
.air-conductor__prompt-chip {
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.86);
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
  padding: 108px 20px 20px;
}

.air-conductor__visual {
  position: relative;
  height: 100%;
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

.air-conductor__hud-stack {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: grid;
  gap: 14px;
  width: min(460px, calc(100% - 116px));
}

.air-conductor__hud-stack--default {
  top: auto;
  left: auto;
  right: 18px;
  bottom: 18px;
  width: min(420px, calc(100% - 36px));
}

.air-conductor__hud-stack--offframe {
  top: auto;
  left: auto;
  right: 18px;
  bottom: 18px;
  width: min(360px, calc(100% - 36px));
}

.air-conductor__hud-stack--center {
  top: 50%;
  left: 50%;
  width: min(560px, calc(100% - 48px));
  transform: translate(-50%, -50%);
  justify-items: center;
}

.air-conductor__status-panel,
.air-conductor__overlay-card,
.air-conductor__countdown,
.air-conductor__prompt-card {
  border-radius: 28px;
}

.air-conductor__status-panel {
  display: grid;
  gap: 4px;
  width: fit-content;
  min-width: 92px;
  padding: 10px 12px;
  border-color: rgba(255, 255, 255, 0.68);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(241, 245, 249, 0.88));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.air-conductor__status-panel--spotlight {
  width: 100%;
  justify-items: center;
  text-align: center;
  padding: 16px 20px;
  border-color: rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.94));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.air-conductor__status-label,
.air-conductor__status-meta,
.air-conductor__prompt-eyebrow {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.air-conductor__status-panel strong {
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.15;
}

.air-conductor__status-panel--spotlight .air-conductor__status-label,
.air-conductor__status-panel--spotlight .air-conductor__status-meta {
  font-size: 12px;
}

.air-conductor__status-panel--spotlight strong {
  font-size: 1.1rem;
}

.air-conductor__overlay-card,
.air-conductor__countdown {
  position: absolute;
  left: 50%;
  z-index: 3;
  transform: translateX(-50%);
}

.air-conductor__overlay-card {
  top: 50%;
  width: min(640px, calc(100% - 32px));
  padding: 28px 30px;
  text-align: center;
  transform: translate(-50%, -50%);
}

.air-conductor__overlay-card h2 {
  margin: 0 0 10px;
  color: #0f172a;
}

.air-conductor__overlay-card p {
  margin: 0;
  color: #475569;
  line-height: 1.8;
}

.air-conductor__overlay-actions {
  display: flex;
  justify-content: center;
  margin-top: 22px;
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

.air-conductor__prompt-card {
  display: grid;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
}

.air-conductor__hud-stack--center .air-conductor__prompt-card {
  text-align: center;
}

.air-conductor__hud-stack--center .air-conductor__prompt-copy {
  justify-items: center;
}

.air-conductor__hud-stack--center .air-conductor__prompt-meta,
.air-conductor__hud-stack--center .air-conductor__prompt-actions {
  justify-content: center;
}

.air-conductor__prompt-card--playful {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(236, 252, 255, 0.94)),
    radial-gradient(circle at left top, rgba(59, 130, 246, 0.14), transparent 36%);
}

.air-conductor__prompt-card--calm {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(240, 249, 255, 0.94)),
    radial-gradient(circle at left top, rgba(14, 165, 233, 0.1), transparent 40%);
}

.air-conductor__prompt-card--success {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(236, 253, 245, 0.94)),
    radial-gradient(circle at left top, rgba(16, 185, 129, 0.14), transparent 40%);
}

.air-conductor__prompt-card--warning {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(255, 247, 237, 0.94)),
    radial-gradient(circle at left top, rgba(249, 115, 22, 0.16), transparent 40%);
}

.air-conductor__prompt-copy {
  display: grid;
  gap: 8px;
}

.air-conductor__prompt-title {
  color: #0f172a;
  font-size: clamp(1.65rem, 2vw + 1rem, 2.6rem);
  font-weight: 900;
  line-height: 1.08;
}

.air-conductor__prompt-body {
  margin: 0;
  color: #334155;
  font-size: clamp(1rem, 1vw + 0.8rem, 1.2rem);
  font-weight: 700;
  line-height: 1.6;
}

.air-conductor__prompt-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.air-conductor__prompt-chip {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 800;
}

.air-conductor__prompt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
  background: rgba(255, 255, 255, 0.9);
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
    padding-top: 138px;
  }

  .air-conductor__hud-stack {
    width: min(100%, calc(100% - 12px));
  }

  .air-conductor__hud-stack--default,
  .air-conductor__hud-stack--offframe {
    right: 0;
    bottom: 12px;
    width: min(320px, calc(100% - 12px));
  }

  .air-conductor__hud-stack--center {
    width: calc(100% - 24px);
  }

  .air-conductor__prompt-card {
    padding: 18px;
  }

  .air-conductor__prompt-actions {
    width: 100%;
  }

  .air-conductor__prompt-actions .air-conductor__pill {
    flex: 1 1 auto;
  }
}
</style>
