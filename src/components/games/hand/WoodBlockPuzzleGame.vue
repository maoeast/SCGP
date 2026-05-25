<template>
  <HandCameraLayer class="wood-block-game" @primary-point="handlePrimaryPoint" @hands="handleHands">
    <div class="wood-block-game__board" @pointerup="releasePointerBlock">
      <div class="wood-block-game__hud">
        <strong>{{ placedCount }}/{{ blocks.length }}</strong>
        <span>尝试 {{ attempts }} 次</span>
      </div>

      <div
        v-for="target in targets"
        :key="target.id"
        class="wood-block-game__slot"
        :style="{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }"
      >
        {{ target.label }}
      </div>

      <button
        v-for="block in blocks"
        :key="block.id"
        class="wood-block-game__block"
        :class="{ 'is-placed': block.placed, 'is-dragging': draggingBlockId === block.id }"
        :style="{ left: `${block.x * 100}%`, top: `${block.y * 100}%`, '--block-color': block.color }"
        type="button"
        @pointerdown.prevent="startPointerBlock(block.id)"
      >
        {{ block.label }}
      </button>
    </div>
  </HandCameraLayer>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import HandCameraLayer from '@/components/games/hand/HandCameraLayer.vue'
import { isPinching, type StagePoint } from '@/utils/hand-game-gestures'
import { TaskID, type GameSessionData } from '@/types/games'
import type { HandObservation } from '@/composables/useHandLandmarker'

const props = withDefaults(defineProps<{
  studentId: number
  taskId?: TaskID
}>(), {
  taskId: TaskID.HAND_WOOD_BLOCKS,
})

const emit = defineEmits<{
  finish: [session: GameSessionData]
}>()

const startedAt = Date.now()
const attempts = ref(0)
const pinchCount = ref(0)
const draggingBlockId = ref<string | null>(null)
const latestHands = ref<HandObservation[]>([])
const pointerFallbackUsed = ref(false)
const wasPinching = ref(false)
const completed = ref(false)

const targets = [
  { id: 'circle', label: '圆', x: 0.25, y: 0.34 },
  { id: 'triangle', label: '三角', x: 0.52, y: 0.34 },
  { id: 'square', label: '方', x: 0.78, y: 0.34 },
  { id: 'star', label: '星', x: 0.52, y: 0.68 },
] as const

const blocks = reactive([
  { id: 'circle', label: '圆', x: 0.16, y: 0.82, color: '#f59e0b', placed: false },
  { id: 'triangle', label: '三角', x: 0.38, y: 0.82, color: '#22c55e', placed: false },
  { id: 'square', label: '方', x: 0.6, y: 0.82, color: '#38bdf8', placed: false },
  { id: 'star', label: '星', x: 0.82, y: 0.82, color: '#ec4899', placed: false },
])

const placedCount = computed(() => blocks.filter((block) => block.placed).length)

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getBlock(id: string) {
  return blocks.find((block) => block.id === id) || null
}

function getNearestFreeBlock(point: StagePoint) {
  return blocks
    .filter((block) => !block.placed)
    .map((block) => ({ block, distance: distance(point, block) }))
    .filter((entry) => entry.distance <= 0.13)
    .sort((a, b) => a.distance - b.distance)[0]?.block || null
}

function snapOrReturn(blockId: string) {
  const block = getBlock(blockId)
  const target = targets.find((item) => item.id === blockId)
  if (!block || !target) {
    return
  }

  attempts.value += 1
  if (distance(block, target) <= 0.13) {
    block.x = target.x
    block.y = target.y
    block.placed = true
  }

  draggingBlockId.value = null

  if (placedCount.value === blocks.length) {
    finish()
  }
}

function handlePrimaryPoint(point: StagePoint | null) {
  if (!point) {
    return
  }

  if (latestHands.value.length === 0) {
    pointerFallbackUsed.value = true
  }

  const handPinching = latestHands.value.some((hand) => isPinching(hand.landmarks))
  if (handPinching && !wasPinching.value) {
    const nearestBlock = getNearestFreeBlock(point)
    if (nearestBlock) {
      draggingBlockId.value = nearestBlock.id
      pinchCount.value += 1
    }
  }

  if (draggingBlockId.value) {
    const block = getBlock(draggingBlockId.value)
    if (block && !block.placed) {
      block.x = point.x
      block.y = point.y
    }
  }

  if (!handPinching && wasPinching.value && draggingBlockId.value) {
    snapOrReturn(draggingBlockId.value)
  }

  wasPinching.value = handPinching
}

function handleHands(hands: HandObservation[]) {
  latestHands.value = hands
}

function startPointerBlock(blockId: string) {
  const block = getBlock(blockId)
  if (!block || block.placed) {
    return
  }
  draggingBlockId.value = blockId
  pointerFallbackUsed.value = true
}

function releasePointerBlock() {
  if (draggingBlockId.value && latestHands.value.length === 0) {
    snapOrReturn(draggingBlockId.value)
  }
}

function finish() {
  if (completed.value) {
    return
  }

  completed.value = true
  const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
  emit('finish', {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: startedAt,
    endTime: Date.now(),
    duration,
    trials: [],
    totalTrials: blocks.length,
    correctTrials: placedCount.value,
    accuracy: placedCount.value / blocks.length,
    avgResponseTime: duration * 1000 / blocks.length,
    errors: { omission: blocks.length - placedCount.value, commission: Math.max(0, attempts.value - placedCount.value) },
    behavior: {
      impulsivityScore: Math.min(100, Math.max(0, attempts.value - blocks.length) * 20),
      fatigueIndex: 1,
      distractorPattern: 'pinch_drag_drop',
    },
    handGameStats: {
      handTrackingUsed: latestHands.value.length > 0,
      pointerFallbackUsed: pointerFallbackUsed.value,
      gestureEvents: pinchCount.value,
      completionScore: Math.round((placedCount.value / blocks.length) * 100),
    },
  })
}
</script>

<style scoped>
.wood-block-game__board {
  position: absolute;
  inset: 0;
  z-index: 3;
  background:
    repeating-linear-gradient(90deg, rgba(122, 73, 33, 0.08) 0 18px, rgba(255, 255, 255, 0.08) 18px 36px),
    linear-gradient(180deg, rgba(246, 225, 194, 0.76), rgba(217, 181, 130, 0.78));
}

.wood-block-game__hud {
  position: absolute;
  top: 22px;
  right: 22px;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255, 250, 235, 0.9);
  box-shadow: 0 16px 32px rgba(79, 49, 26, 0.14);
  color: #5b3519;
}

.wood-block-game__slot,
.wood-block-game__block {
  position: absolute;
  display: grid;
  place-items: center;
  width: 136px;
  height: 136px;
  margin: -68px 0 0 -68px;
  border-radius: 22px;
  font-size: 26px;
  font-weight: 900;
}

.wood-block-game__slot {
  border: 5px dashed rgba(92, 55, 28, 0.34);
  color: rgba(92, 55, 28, 0.5);
  background: rgba(255, 255, 255, 0.22);
}

.wood-block-game__block {
  border: 0;
  color: #fff;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.32), transparent 42%),
    var(--block-color);
  box-shadow: 0 18px 30px rgba(84, 54, 24, 0.24), inset 0 -10px 0 rgba(0, 0, 0, 0.08);
  cursor: grab;
  transition: transform 0.16s ease, filter 0.16s ease;
}

.wood-block-game__block.is-dragging {
  z-index: 8;
  transform: scale(1.08);
  cursor: grabbing;
}

.wood-block-game__block.is-placed {
  filter: saturate(0.78) brightness(1.04);
  cursor: default;
}
</style>
