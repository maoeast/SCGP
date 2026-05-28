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
import { usePoseAudio } from '@/composables/usePoseAudio'
import type { PoseFrame } from '@/composables/usePoseTracker'
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
let animationFrameId = 0

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
  void tick(now)
  animationFrameId = window.requestAnimationFrame(animationLoop)
}

function beginCalibration() {
  startedAt.value = Date.now()
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
  void handlePoseFrame(mapPoseFrameToArmPose(frame))
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
  display: grid;
  gap: 6px;
  padding: 16px 18px;
}

.air-conductor__camera-meta {
  position: absolute;
  left: 0;
  bottom: 0;
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
