<template>
  <div
    ref="stageRef"
    class="hand-camera-layer"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <video ref="videoRef" class="hand-camera-layer__video" autoplay muted playsinline />
    <div class="hand-camera-layer__shade" />

    <div
      v-for="cursor in cursors"
      :key="cursor.id"
      class="hand-camera-layer__cursor"
      :class="{ 'is-pinching': cursor.isPinching }"
      :style="{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }"
    />

    <slot
      :hands="hands"
      :primary-point="primaryPoint"
      :stage-size="stageSize"
      :using-pointer-fallback="usingPointerFallback"
    />

    <div v-if="statusText" class="hand-camera-layer__status">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useHandLandmarker, type HandObservation } from '@/composables/useHandLandmarker'
import {
  getPrimaryFingerPoint,
  isPinching,
  mapLandmarkToStagePoint,
  normalizeStagePoint,
  type StagePoint,
  type StageSize,
} from '@/utils/hand-game-gestures'

const props = withDefaults(defineProps<{
  paused?: boolean
}>(), {
  paused: false,
})

const emit = defineEmits<{
  hands: [hands: HandObservation[]]
  primaryPoint: [point: StagePoint | null]
}>()

const stageRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const cameraError = ref<string | null>(null)
const pointerFallback = ref<StagePoint | null>(null)
const stageSize = reactive<StageSize>({ width: 1, height: 1 })
const detector = useHandLandmarker()
let resizeObserver: ResizeObserver | null = null

const hands = computed(() => detector.hands.value)
const detectedPrimaryPoint = computed<StagePoint | null>(() => {
  const primaryHand = hands.value[0]
  const finger = primaryHand ? getPrimaryFingerPoint(primaryHand.landmarks) : null
  return finger ? normalizeStagePoint(mapLandmarkToStagePoint(finger, stageSize), stageSize) : null
})
const primaryPoint = computed(() => detectedPrimaryPoint.value || pointerFallback.value)
const usingPointerFallback = computed(() => !detectedPrimaryPoint.value && Boolean(pointerFallback.value))
const statusText = computed(() => {
  if (cameraError.value) {
    return cameraError.value
  }

  if (detector.initError.value) {
    return detector.initError.value
  }

  if (!detector.isReady.value) {
    return '正在准备摄像头手势识别，可先用鼠标或触摸体验。'
  }

  if (hands.value.length === 0) {
    return '把手放到摄像头前，或用鼠标/触摸作为临时操作。'
  }

  return ''
})
const cursors = computed(() => {
  return hands.value
    .map((hand, index) => {
      const finger = getPrimaryFingerPoint(hand.landmarks)
      if (!finger) {
        return null
      }

      const stagePoint = mapLandmarkToStagePoint(finger, stageSize)
      return {
        id: `${hand.handedness || 'hand'}-${index}`,
        x: stagePoint.x,
        y: stagePoint.y,
        isPinching: isPinching(hand.landmarks),
      }
    })
    .filter((cursor): cursor is { id: string; x: number; y: number; isPinching: boolean } => Boolean(cursor))
})

function syncStageSize() {
  const rect = stageRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  stageSize.width = Math.max(1, rect.width)
  stageSize.height = Math.max(1, rect.height)
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia || !videoRef.value) {
    cameraError.value = '当前环境无法打开摄像头，已启用触摸备用操作。'
    return
  }

  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 960 },
        height: { ideal: 540 },
        facingMode: 'user',
      },
      audio: false,
    })
    videoRef.value.srcObject = stream.value
    await videoRef.value.play()
    await detector.initialize(videoRef.value)
  } catch (error) {
    cameraError.value = error instanceof Error
      ? `摄像头启动失败: ${error.message}`
      : '摄像头启动失败，已启用触摸备用操作。'
  }
}

function handlePointerMove(event: PointerEvent) {
  const rect = stageRef.value?.getBoundingClientRect()
  if (!rect) {
    return
  }

  pointerFallback.value = {
    x: (event.clientX - rect.left) / Math.max(1, rect.width),
    y: (event.clientY - rect.top) / Math.max(1, rect.height),
  }
}

function handlePointerLeave() {
  pointerFallback.value = null
}

watch(() => props.paused, (value) => {
  detector.setPaused(value)
})

watch(hands, (value) => {
  emit('hands', value)
})

watch(primaryPoint, (value) => {
  emit('primaryPoint', value)
})

onMounted(() => {
  syncStageSize()
  if (stageRef.value) {
    resizeObserver = new ResizeObserver(syncStageSize)
    resizeObserver.observe(stageRef.value)
  }
  void startCamera()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  detector.dispose()
  stream.value?.getTracks().forEach((track) => track.stop())
})
</script>

<style scoped>
.hand-camera-layer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
  touch-action: none;
  background: #eff7fb;
}

.hand-camera-layer__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  opacity: 0.18;
  filter: saturate(0.8) contrast(0.92);
}

.hand-camera-layer__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(248, 252, 255, 0.9), rgba(244, 250, 247, 0.78)),
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.6), transparent 42%);
}

.hand-camera-layer__cursor {
  position: absolute;
  z-index: 16;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  border: 3px solid #2563eb;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.24);
  pointer-events: none;
}

.hand-camera-layer__cursor.is-pinching {
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  border-color: #f59e0b;
  background: rgba(254, 243, 199, 0.82);
}

.hand-camera-layer__status {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 20;
  transform: translateX(-50%);
  max-width: min(680px, calc(100% - 32px));
  padding: 10px 14px;
  border-radius: 999px;
  color: #31506a;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 28px rgba(49, 80, 106, 0.12);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
</style>
