<template>
  <span
    class="wooden-shape-block__shell"
    :class="{ 'is-elevated': elevated }"
    :style="paletteStyle"
  >
    <span
      class="wooden-shape-block__body"
      :class="`wooden-shape-block__body--${shapeId}`"
      :style="bodyStyle"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  buildWoodenShapeBlockPalette,
  buildWoodenShapeBlockMaskStyle,
  type WoodenShapeBlockId,
} from '@/components/games/shared/wooden-shape-block'

const props = withDefaults(defineProps<{
  shapeId: WoodenShapeBlockId
  color: string
  rotation?: number
  scale?: number
  dimmed?: boolean
  elevated?: boolean
}>(), {
  rotation: 0,
  scale: 1,
  dimmed: false,
  elevated: false,
})

const paletteStyle = computed(() => buildWoodenShapeBlockPalette(props.color))
const bodyStyle = computed(() => ({
  '--shape-rotation': `${props.rotation}deg`,
  '--shape-scale': String(props.scale),
  '--shape-opacity': props.dimmed ? '0.52' : '1',
  ...buildWoodenShapeBlockMaskStyle(props.shapeId),
}))
</script>

<style scoped>
.wooden-shape-block__shell,
.wooden-shape-block__body {
  display: block;
  width: 100%;
  height: 100%;
}

.wooden-shape-block__shell {
  position: relative;
  transition: transform 0.18s ease;
}

.wooden-shape-block__shell.is-elevated {
  transform: translateY(-2px);
}

.wooden-shape-block__body {
  position: relative;
  opacity: var(--shape-opacity);
  transform: rotate(var(--shape-rotation)) scale(var(--shape-scale));
  transition:
    transform 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275),
    opacity 0.24s ease,
    filter 0.2s ease;
  background-color: var(--block-face);
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 38%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 42%),
    repeating-linear-gradient(
      118deg,
      rgba(255, 255, 255, 0.08) 0,
      rgba(255, 255, 255, 0.08) 11px,
      rgba(93, 56, 27, 0.16) 11px,
      rgba(93, 56, 27, 0.16) 22px,
      rgba(255, 255, 255, 0.04) 22px,
      rgba(255, 255, 255, 0.04) 34px
    );
  background-blend-mode: soft-light, soft-light, normal;
  box-shadow:
    0 4px 0 rgba(55, 31, 14, 0.18),
    0 11px 18px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 245, 228, 0.4),
    inset 0 -10px 12px rgba(79, 49, 24, 0.14);
}

.wooden-shape-block__body::before,
.wooden-shape-block__body::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.wooden-shape-block__body::before {
  top: 14%;
  left: 18%;
  width: 34%;
  height: 16%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0));
  opacity: 0.72;
}

.wooden-shape-block__body::after {
  inset: auto 14% 12% 14%;
  height: 18%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(61, 36, 16, 0), rgba(61, 36, 16, 0.16));
}

</style>
