<template>
  <HandCameraLayer class="gesture-garden" @hands="handleHands">
    <div class="gesture-garden__scene" :data-stage="stage">
      <div class="gesture-garden__hud">
        <strong>{{ stageLabel }}</strong>
        <span>{{ currentPoseLabel }}</span>
      </div>

      <div class="gesture-garden__ground">
        <div class="gesture-garden__plant">
          <span class="gesture-garden__stem" />
          <span class="gesture-garden__leaf gesture-garden__leaf--left" />
          <span class="gesture-garden__leaf gesture-garden__leaf--right" />
          <span class="gesture-garden__flower" />
        </div>
      </div>

      <div class="gesture-garden__cloud">雨</div>
      <div class="gesture-garden__sun">光</div>

      <div class="gesture-garden__fallback">
        <button type="button" @click="applyPose('fist')">握拳</button>
        <button type="button" @click="applyPose('open')">张手</button>
      </div>
    </div>
  </HandCameraLayer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import HandCameraLayer from '@/components/games/hand/HandCameraLayer.vue'
import { classifyHandPose, type HandPose } from '@/utils/hand-game-gestures'
import { TaskID, type GameSessionData } from '@/types/games'
import type { HandObservation } from '@/composables/useHandLandmarker'

const props = withDefaults(defineProps<{
  studentId: number
  taskId?: TaskID
}>(), {
  taskId: TaskID.HAND_GESTURE_GARDEN,
})

const emit = defineEmits<{
  finish: [session: GameSessionData]
}>()

const startedAt = Date.now()
const stage = ref(0)
const gestureEvents = ref(0)
const latestHands = ref<HandObservation[]>([])
const currentPose = ref<HandPose>('unknown')
let lastAcceptedPose: HandPose = 'unknown'
let completed = false

const stageLabels = ['握住种子', '张手下雨', '再握拳蓄力', '张手开花'] as const
const stageLabel = computed(() => stageLabels[Math.min(stage.value, stageLabels.length - 1)])
const currentPoseLabel = computed(() => {
  const labels: Record<HandPose, string> = {
    open: '当前：张手',
    fist: '当前：握拳',
    pinch: '当前：捏取',
    unknown: '等待稳定手势',
  }
  return labels[currentPose.value]
})

function applyPose(pose: HandPose) {
  if (completed || pose === 'unknown' || pose === 'pinch' || pose === lastAcceptedPose) {
    return
  }

  const expectedSequence: HandPose[] = ['fist', 'open', 'fist', 'open']
  if (pose !== expectedSequence[stage.value]) {
    lastAcceptedPose = pose
    return
  }

  gestureEvents.value += 1
  lastAcceptedPose = pose
  stage.value += 1

  if (stage.value >= expectedSequence.length) {
    completed = true
    window.setTimeout(finish, 650)
  }
}

function handleHands(hands: HandObservation[]) {
  latestHands.value = hands
  const pose = hands[0] ? classifyHandPose(hands[0].landmarks) : 'unknown'
  currentPose.value = pose
  applyPose(pose)
}

function finish() {
  const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
  const completionScore = Math.round((stage.value / 4) * 100)

  emit('finish', {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: startedAt,
    endTime: Date.now(),
    duration,
    trials: [],
    totalTrials: 4,
    correctTrials: stage.value,
    accuracy: stage.value / 4,
    avgResponseTime: duration * 1000 / 4,
    errors: { omission: 4 - stage.value, commission: 0 },
    behavior: {
      impulsivityScore: 0,
      fatigueIndex: 1,
      distractorPattern: 'open_fist_sequence',
    },
    handGameStats: {
      handTrackingUsed: latestHands.value.length > 0,
      pointerFallbackUsed: latestHands.value.length === 0,
      gestureEvents: gestureEvents.value,
      completionScore,
    },
  })
}
</script>

<style scoped>
.gesture-garden__scene {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  background:
    radial-gradient(circle at 72% 18%, rgba(255, 222, 113, 0.34), transparent 18%),
    linear-gradient(180deg, rgba(201, 239, 255, 0.84), rgba(233, 255, 223, 0.86));
}

.gesture-garden__hud {
  position: absolute;
  top: 22px;
  right: 22px;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 14px 30px rgba(51, 99, 72, 0.12);
  color: #1f5135;
}

.gesture-garden__ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 36%;
  background:
    radial-gradient(circle at 50% 0%, rgba(98, 164, 88, 0.42), transparent 26%),
    linear-gradient(180deg, #79bd68, #477d42);
}

.gesture-garden__plant {
  position: absolute;
  left: 50%;
  bottom: 34%;
  width: 220px;
  height: 320px;
  transform: translateX(-50%);
}

.gesture-garden__stem,
.gesture-garden__leaf,
.gesture-garden__flower {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  transition: transform 0.7s cubic-bezier(.2,.8,.2,1), opacity 0.5s ease;
}

.gesture-garden__stem {
  bottom: 0;
  width: 26px;
  height: 210px;
  border-radius: 999px 999px 0 0;
  background: linear-gradient(180deg, #39a851, #1d7f3a);
  transform: translateX(-50%) scaleY(0.08);
  transform-origin: bottom;
}

.gesture-garden__leaf {
  bottom: 90px;
  width: 94px;
  height: 54px;
  border-radius: 100% 0 100% 0;
  background: #35b861;
  opacity: 0;
}

.gesture-garden__leaf--left {
  transform: translateX(-92%) rotate(-22deg) scale(0.2);
}

.gesture-garden__leaf--right {
  transform: translateX(-8%) rotate(22deg) scale(0.2);
}

.gesture-garden__flower {
  bottom: 202px;
  width: 116px;
  height: 116px;
  border-radius: 50%;
  background:
    radial-gradient(circle, #fff7ad 0 18%, transparent 19%),
    conic-gradient(#f97316, #facc15, #fb7185, #f97316);
  opacity: 0;
  transform: translateX(-50%) scale(0.12) rotate(-30deg);
}

.gesture-garden__scene[data-stage='1'] .gesture-garden__stem,
.gesture-garden__scene[data-stage='2'] .gesture-garden__stem,
.gesture-garden__scene[data-stage='3'] .gesture-garden__stem,
.gesture-garden__scene[data-stage='4'] .gesture-garden__stem {
  transform: translateX(-50%) scaleY(0.62);
}

.gesture-garden__scene[data-stage='2'] .gesture-garden__leaf,
.gesture-garden__scene[data-stage='3'] .gesture-garden__leaf,
.gesture-garden__scene[data-stage='4'] .gesture-garden__leaf {
  opacity: 1;
}

.gesture-garden__scene[data-stage='2'] .gesture-garden__leaf--left,
.gesture-garden__scene[data-stage='3'] .gesture-garden__leaf--left,
.gesture-garden__scene[data-stage='4'] .gesture-garden__leaf--left {
  transform: translateX(-92%) rotate(-22deg) scale(1);
}

.gesture-garden__scene[data-stage='2'] .gesture-garden__leaf--right,
.gesture-garden__scene[data-stage='3'] .gesture-garden__leaf--right,
.gesture-garden__scene[data-stage='4'] .gesture-garden__leaf--right {
  transform: translateX(-8%) rotate(22deg) scale(1);
}

.gesture-garden__scene[data-stage='4'] .gesture-garden__flower {
  opacity: 1;
  transform: translateX(-50%) scale(1) rotate(0deg);
}

.gesture-garden__cloud,
.gesture-garden__sun {
  position: absolute;
  display: grid;
  place-items: center;
  width: 128px;
  height: 88px;
  border-radius: 999px;
  font-size: 24px;
  font-weight: 900;
  transition: transform 0.6s ease, opacity 0.4s ease;
}

.gesture-garden__cloud {
  left: 20%;
  top: 18%;
  color: #2b5f84;
  background: rgba(227, 245, 255, 0.9);
  opacity: 0.24;
}

.gesture-garden__sun {
  right: 20%;
  top: 16%;
  color: #8a4f00;
  background: #fde68a;
  opacity: 0.28;
}

.gesture-garden__scene[data-stage='2'] .gesture-garden__cloud,
.gesture-garden__scene[data-stage='3'] .gesture-garden__cloud {
  opacity: 1;
  transform: translateY(22px);
}

.gesture-garden__scene[data-stage='4'] .gesture-garden__sun {
  opacity: 1;
  transform: scale(1.18);
}

.gesture-garden__fallback {
  position: absolute;
  left: 50%;
  bottom: 26px;
  display: flex;
  gap: 12px;
  transform: translateX(-50%);
}

.gesture-garden__fallback button {
  min-width: 116px;
  min-height: 54px;
  border: 0;
  border-radius: 999px;
  color: #20482d;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 24px rgba(50, 95, 58, 0.14);
  font-size: 17px;
  font-weight: 900;
}
</style>
