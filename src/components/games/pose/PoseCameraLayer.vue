<template>
  <div ref="stageRef" class="pose-camera-layer">
    <video ref="videoRef" class="pose-camera-layer__video" autoplay muted playsinline />
    <canvas ref="canvasRef" class="pose-camera-layer__canvas" />
    <div class="pose-camera-layer__shade" />

    <slot
      :pose-frame="poseFrame"
      :stage-size="stageSize"
      :fps="fps"
      :off-frame="offFrame"
      :is-ready="isReady"
      :is-tracking="isTracking"
    />

    <div v-if="statusText" class="pose-camera-layer__status">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePoseTracker } from '@/composables/usePoseTracker'

const props = withDefaults(defineProps<{
  paused?: boolean
}>(), {
  paused: false,
})

const emit = defineEmits<{
  poseFrame: [frame: ReturnType<typeof usePoseTracker>['poseFrame']['value']]
}>()

const stageRef = ref<HTMLElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const stream = ref<MediaStream | null>(null)
const tracker = usePoseTracker({ paused: props.paused })

const {
  poseFrame,
  stageSize,
  fps,
  offFrame,
  isReady,
  isTracking,
  statusText,
} = tracker

let resizeObserver: ResizeObserver | null = null

function syncStageSize() {
  const rect = stageRef.value?.getBoundingClientRect()
  if (!rect) return

  tracker.updateStageSize({ width: rect.width, height: rect.height })

  if (canvasRef.value) {
    canvasRef.value.width = Math.max(1, Math.round(rect.width))
    canvasRef.value.height = Math.max(1, Math.round(rect.height))
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia || !videoRef.value) {
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
    await tracker.initialize(videoRef.value, canvasRef.value)
  } catch (error) {
    console.error('[PoseCameraLayer] failed to start camera', error)
  }
}

watch(() => props.paused, (value) => {
  tracker.setPaused(value)
})

watch(poseFrame, (value) => {
  emit('poseFrame', value)
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
  tracker.dispose()
  stream.value?.getTracks().forEach((track) => track.stop())
})
</script>

<style scoped>
.pose-camera-layer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(180deg, #eaf4ff 0%, #f8fbff 100%);
}

.pose-camera-layer__video,
.pose-camera-layer__canvas,
.pose-camera-layer__shade {
  position: absolute;
  inset: 0;
}

.pose-camera-layer__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  opacity: 0.26;
}

.pose-camera-layer__canvas {
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);
}

.pose-camera-layer__shade {
  z-index: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.46), rgba(226, 238, 255, 0.22)),
    radial-gradient(circle at top, rgba(255, 255, 255, 0.58), transparent 42%);
}

.pose-camera-layer__status {
  position: absolute;
  left: 50%;
  bottom: 14px;
  z-index: 2;
  padding: 10px 14px;
  border-radius: 999px;
  color: #1e3a5f;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  transform: translateX(-50%);
  font-size: 13px;
}
</style>
