<template>
  <div class="annotation-layer" :class="{ 'is-active': visible }">
    <div class="annotation-toolbar" data-annotation-toolbar>
      <button
        type="button"
        class="annotation-button"
        :class="{
          'is-active': visible,
          'is-icon-only': !visible,
        }"
        :aria-pressed="visible"
        title="打开或关闭荧光笔圈画模式"
        @click.stop="emit('toggle')"
      >
        <svg
          class="annotation-pen-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 20L8.6 18.9L18.8 8.7C19.7 7.8 19.7 6.4 18.8 5.5L18.5 5.2C17.6 4.3 16.2 4.3 15.3 5.2L5.1 15.4L4 20Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M13.8 6.7L17.3 10.2"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span v-if="visible">退出</span>
      </button>

      <button
        v-if="visible"
        type="button"
        class="annotation-button is-secondary"
        title="清空当前圈画"
        @click.stop="clearStrokes"
      >
        清空
      </button>
    </div>

    <div
      ref="surfaceRef"
      class="annotation-surface"
      :class="{ 'is-visible': visible }"
      @contextmenu.prevent
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
    >
      <canvas ref="canvasRef" class="annotation-canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface NormalizedPoint {
  x: number
  y: number
}

interface StrokeRecord {
  id: number
  points: NormalizedPoint[]
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const surfaceRef = ref<HTMLDivElement | null>(null)
const strokes = ref<StrokeRecord[]>([])

const activePointerId = ref<number | null>(null)
const activeStrokeId = ref<number | null>(null)

let strokeSeed = 0
let resizeObserver: ResizeObserver | null = null

function clampNormalized(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function getSurfaceRect(): DOMRect | null {
  const surface = surfaceRef.value
  if (!surface) {
    return null
  }

  const rect = surface.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  return rect
}

function getNormalizedPoint(event: PointerEvent): NormalizedPoint | null {
  const rect = getSurfaceRect()
  if (!rect) {
    return null
  }

  return {
    x: clampNormalized((event.clientX - rect.left) / rect.width),
    y: clampNormalized((event.clientY - rect.top) / rect.height),
  }
}

function isEligibleDrawPointer(event: PointerEvent): boolean {
  if (!props.visible) {
    return false
  }

  if (event.pointerType === 'mouse') {
    return event.button === 0 || (event.buttons & 1) === 1
  }

  return true
}

function isSamePoint(a: NormalizedPoint, b: NormalizedPoint, rect: DOMRect): boolean {
  const dx = (a.x - b.x) * rect.width
  const dy = (a.y - b.y) * rect.height
  return Math.hypot(dx, dy) < 2
}

function getCanvasContext() {
  const canvas = canvasRef.value
  const surface = surfaceRef.value
  if (!canvas || !surface) {
    return null
  }

  const rect = surface.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  const dpr = Math.max(window.devicePixelRatio || 1, 1)
  const nextWidth = Math.round(rect.width * dpr)
  const nextHeight = Math.round(rect.height * dpr)

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth
    canvas.height = nextHeight
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
  }

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  return { context, rect, dpr, canvas }
}

function drawStroke(
  context: CanvasRenderingContext2D,
  rect: DOMRect,
  stroke: StrokeRecord,
): void {
  if (stroke.points.length === 0) {
    return
  }

  const resolvedPoints = stroke.points.map((point) => ({
    x: point.x * rect.width,
    y: point.y * rect.height,
  }))

  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (resolvedPoints.length === 1) {
    const [point] = resolvedPoints
    if (!point) {
      return
    }

    context.fillStyle = 'rgb(170 255 140 / 0.92)'
    context.shadowColor = 'rgb(122 255 107 / 0.78)'
    context.shadowBlur = 22
    context.beginPath()
    context.arc(point.x, point.y, 10, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    return
  }

  context.shadowColor = 'rgb(122 255 107 / 0.82)'
  context.shadowBlur = 24
  context.strokeStyle = 'rgb(114 255 97 / 0.3)'
  context.lineWidth = 22
  context.beginPath()
  const [firstPoint, ...remainingPoints] = resolvedPoints
  if (!firstPoint) {
    return
  }

  context.moveTo(firstPoint.x, firstPoint.y)
  remainingPoints.forEach((point) => {
    context.lineTo(point.x, point.y)
  })
  context.stroke()

  context.shadowBlur = 12
  context.strokeStyle = 'rgb(168 255 150 / 0.92)'
  context.lineWidth = 10
  context.beginPath()
  context.moveTo(firstPoint.x, firstPoint.y)
  remainingPoints.forEach((point) => {
    context.lineTo(point.x, point.y)
  })
  context.stroke()

  context.shadowBlur = 0
}

function redrawCanvas(): void {
  const resolved = getCanvasContext()
  if (!resolved) {
    return
  }

  const { context, rect, dpr, canvas } = resolved
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)

  strokes.value.forEach((stroke) => {
    drawStroke(context, rect, stroke)
  })
}

function clearStrokes(): void {
  strokes.value = []
  activePointerId.value = null
  activeStrokeId.value = null
  redrawCanvas()
}

function appendPointToActiveStroke(point: NormalizedPoint): void {
  const rect = getSurfaceRect()
  if (!rect || activeStrokeId.value === null) {
    return
  }

  const nextStrokes = strokes.value.map((stroke) => {
    if (stroke.id !== activeStrokeId.value) {
      return stroke
    }

    const lastPoint = stroke.points[stroke.points.length - 1]
    if (lastPoint && isSamePoint(lastPoint, point, rect)) {
      return stroke
    }

    return {
      ...stroke,
      points: [...stroke.points, point],
    }
  })

  strokes.value = nextStrokes
  redrawCanvas()
}

function handlePointerDown(event: PointerEvent): void {
  if (!isEligibleDrawPointer(event)) {
    return
  }

  event.preventDefault()

  const point = getNormalizedPoint(event)
  if (!point) {
    return
  }

  strokeSeed += 1
  activePointerId.value = event.pointerId
  activeStrokeId.value = strokeSeed
  strokes.value = [
    ...strokes.value,
    {
      id: strokeSeed,
      points: [point],
    },
  ]

  try {
    surfaceRef.value?.setPointerCapture(event.pointerId)
  } catch (error) {
    console.warn('[TeacherAnnotationLayer] 无法锁定指针捕获:', error)
  }

  redrawCanvas()
}

function handlePointerMove(event: PointerEvent): void {
  if (activePointerId.value !== event.pointerId) {
    return
  }

  event.preventDefault()
  const point = getNormalizedPoint(event)
  if (!point) {
    return
  }

  appendPointToActiveStroke(point)
}

function finishActiveStroke(pointerId: number): void {
  if (activePointerId.value !== pointerId) {
    return
  }

  activePointerId.value = null
  activeStrokeId.value = null

  try {
    surfaceRef.value?.releasePointerCapture(pointerId)
  } catch {
    // ignore capture release errors after pointer cancellation
  }
}

function handlePointerUp(event: PointerEvent): void {
  finishActiveStroke(event.pointerId)
}

function handlePointerCancel(event: PointerEvent): void {
  finishActiveStroke(event.pointerId)
}

function observeSurfaceResize(): void {
  if (!surfaceRef.value || resizeObserver) {
    return
  }

  resizeObserver = new ResizeObserver(() => {
    redrawCanvas()
  })

  resizeObserver.observe(surfaceRef.value)
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      clearStrokes()
      return
    }

    await nextTick()
    redrawCanvas()
  },
)

onMounted(() => {
  observeSurfaceResize()
  void nextTick(() => {
    redrawCanvas()
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped>
.annotation-layer {
  position: absolute;
  inset: 0;
  z-index: 16;
  pointer-events: none;
}

.annotation-toolbar {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}

.annotation-button {
  min-height: 44px;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
  cursor: pointer;
  background: rgb(15 23 42 / 0.72);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.16),
    0 14px 30px rgb(15 23 42 / 0.28);
  transition:
    transform 0.18s ease,
    background-color 0.18s ease;
}

.annotation-button:hover {
  transform: translateY(-1px);
  background: rgb(15 23 42 / 0.82);
}

.annotation-button:active {
  transform: scale(0.97);
}

.annotation-button.is-active {
  color: #143218;
  background: linear-gradient(135deg, rgb(174 255 152 / 0.96) 0%, rgb(96 242 91 / 0.92) 100%);
}

.annotation-button.is-secondary {
  color: #e2e8f0;
  background: rgb(15 23 42 / 0.56);
}

.annotation-button.is-icon-only {
  width: 52px;
  min-width: 52px;
  padding-inline: 0;
  justify-content: center;
}

.annotation-pen-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.annotation-surface {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}

.annotation-surface.is-visible {
  opacity: 1;
  pointer-events: auto;
  cursor: crosshair;
  touch-action: none;
}

.annotation-canvas {
  width: 100%;
  height: 100%;
  display: block;
  mix-blend-mode: screen;
}

@media (max-width: 768px) {
  .annotation-toolbar {
    right: 14px;
    bottom: 14px;
    gap: 8px;
  }

  .annotation-button {
    min-height: 40px;
    padding: 9px 14px;
    font-size: 13px;
  }
}
</style>
