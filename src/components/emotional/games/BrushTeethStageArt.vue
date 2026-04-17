<template>
  <div class="brush-teeth-stage-art" :class="rootClasses">
    <svg
      class="brush-teeth-stage-art__svg"
      viewBox="0 0 360 340"
      role="img"
      aria-label="刷牙练习中的口腔、牙齿和当前清洁区域"
    >
      <defs>
        <linearGradient id="brushMouthOuter" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ff9ab0" />
          <stop offset="100%" stop-color="#d73663" />
        </linearGradient>
        <linearGradient id="brushMouthInner" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#8a0f36" />
          <stop offset="100%" stop-color="#3f0620" />
        </linearGradient>
        <linearGradient id="brushTooth" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#dbeafe" />
        </linearGradient>
        <linearGradient id="brushGum" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffbfd0" />
          <stop offset="100%" stop-color="#f28aa4" />
        </linearGradient>
        <radialGradient id="brushGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.8)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="brushSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect x="14" y="14" width="332" height="312" rx="34" fill="rgba(255,255,255,0.7)" />
      <ellipse cx="180" cy="170" rx="146" ry="118" fill="url(#brushGlow)" opacity="0.55" />
      <ellipse class="brush-teeth-stage-art__focus brush-teeth-stage-art__focus--upper" cx="180" cy="132" rx="116" ry="58" />
      <ellipse class="brush-teeth-stage-art__focus brush-teeth-stage-art__focus--lower" cx="180" cy="214" rx="116" ry="58" />
      <ellipse class="brush-teeth-stage-art__focus brush-teeth-stage-art__focus--left" cx="102" cy="174" rx="64" ry="96" />
      <ellipse class="brush-teeth-stage-art__focus brush-teeth-stage-art__focus--right" cx="258" cy="174" rx="64" ry="96" />

      <path d="M62 170c0-58 54-106 118-106 66 0 118 48 118 106 0 60-52 108-118 108-64 0-118-48-118-108z" fill="url(#brushMouthOuter)" />
      <path d="M92 170c0-42 38-78 88-78 52 0 88 36 88 78s-36 78-88 78c-50 0-88-36-88-78z" fill="url(#brushMouthInner)" />
      <path d="M96 142c28-26 58-38 84-38 28 0 58 12 84 38" fill="none" stroke="url(#brushGum)" stroke-width="18" stroke-linecap="round" />
      <path d="M96 198c28 26 58 38 84 38 28 0 58-12 84-38" fill="none" stroke="url(#brushGum)" stroke-width="18" stroke-linecap="round" />

      <g class="brush-teeth-stage-art__teeth">
        <g v-for="tooth in upperTeeth" :key="tooth.id" :transform="`translate(${tooth.x} ${tooth.y})`">
          <rect width="24" height="54" rx="10" fill="url(#brushTooth)" />
        </g>
        <g v-for="tooth in lowerTeeth" :key="tooth.id" :transform="`translate(${tooth.x} ${tooth.y})`">
          <rect width="24" height="54" rx="10" fill="url(#brushTooth)" />
        </g>
      </g>

      <g class="brush-teeth-stage-art__dirt-layer">
        <g v-for="zone in zoneMeta" :key="zone.id" class="brush-teeth-stage-art__zone-group" :class="zoneClasses(zone.id)">
          <path class="brush-teeth-stage-art__zone-fill" :d="zone.path" :style="{ opacity: zoneOpacity(zone.id) }" />
          <path class="brush-teeth-stage-art__zone-stroke" :d="zone.path" />
        </g>
      </g>

      <g class="brush-teeth-stage-art__shine" v-if="finished || completedZoneIds.length">
        <g v-for="sparkle in shineSparkles" :key="sparkle.id" :transform="`translate(${sparkle.x} ${sparkle.y})`">
          <path d="M0 -10v20M-10 0h20M-6 -6l12 12M6 -6l-12 12" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ZoneId = 'upper-front' | 'lower-front' | 'left-side' | 'right-side'

interface ToothRect {
  id: number
  x: number
  y: number
}

interface ZoneMeta {
  id: ZoneId
  path: string
}

interface Point {
  id: number
  x: number
  y: number
}

const props = withDefaults(defineProps<{
  targetZoneIds?: string[]
  completedZoneIds?: string[]
  currentZoneId?: string | null
  currentZoneProgress?: number
  preview?: boolean
  finished?: boolean
}>(), {
  targetZoneIds: () => [],
  completedZoneIds: () => [],
  currentZoneId: null,
  currentZoneProgress: 0,
  preview: false,
  finished: false,
})

const upperTeeth: ReadonlyArray<ToothRect> = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  x: 74 + index * 22,
  y: 104,
}))

const lowerTeeth: ReadonlyArray<ToothRect> = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  x: 74 + index * 22,
  y: 182,
}))

const zoneMeta: ReadonlyArray<ZoneMeta> = [
  { id: 'upper-front', path: 'M112 104h136v56H112z' },
  { id: 'lower-front', path: 'M112 182h136v56H112z' },
  { id: 'left-side', path: 'M70 112h62v126H70z' },
  { id: 'right-side', path: 'M228 112h62v126h-62z' },
]

const shineSparkles: ReadonlyArray<Point> = [
  { id: 1, x: 126, y: 124 },
  { id: 2, x: 236, y: 128 },
  { id: 3, x: 104, y: 212 },
  { id: 4, x: 252, y: 216 },
]

const targetSet = computed(() => new Set(props.targetZoneIds))
const completedSet = computed(() => new Set(props.completedZoneIds))
const currentProgressRatio = computed(() => Math.min(1, Math.max(0, props.currentZoneProgress / 100)))

const focusKey = computed<'upper' | 'lower' | 'left' | 'right' | null>(() => {
  switch (props.currentZoneId) {
    case 'upper-front':
      return 'upper'
    case 'lower-front':
      return 'lower'
    case 'left-side':
      return 'left'
    case 'right-side':
      return 'right'
    default:
      return null
  }
})

function zoneOpacity(id: ZoneId) {
  if (!targetSet.value.has(id)) {
    return 0
  }

  if (props.finished || completedSet.value.has(id)) {
    return 0.05
  }

  if (props.preview) {
    return 0.36
  }

  if (props.currentZoneId === id) {
    return 0.55 - currentProgressRatio.value * 0.45
  }

  return 0.42
}

function zoneClasses(id: ZoneId) {
  return {
    'is-target': targetSet.value.has(id),
    'is-current': props.currentZoneId === id,
    'is-done': props.finished || completedSet.value.has(id),
    'is-preview': props.preview,
  }
}

const rootClasses = computed(() => ({
  'is-preview': props.preview,
  'is-finished': props.finished,
  'is-focus-upper': focusKey.value === 'upper',
  'is-focus-lower': focusKey.value === 'lower',
  'is-focus-left': focusKey.value === 'left',
  'is-focus-right': focusKey.value === 'right',
}))
</script>

<style scoped>
.brush-teeth-stage-art {
  position: absolute;
  inset: 0;
}

.brush-teeth-stage-art__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.brush-teeth-stage-art__focus {
  opacity: 0;
  fill: rgba(34, 197, 94, 0.22);
  filter: url(#brushSoftGlow);
  transition: opacity 0.18s ease;
}

.brush-teeth-stage-art.is-focus-upper .brush-teeth-stage-art__focus--upper,
.brush-teeth-stage-art.is-focus-lower .brush-teeth-stage-art__focus--lower,
.brush-teeth-stage-art.is-focus-left .brush-teeth-stage-art__focus--left,
.brush-teeth-stage-art.is-focus-right .brush-teeth-stage-art__focus--right {
  opacity: 1;
}

.brush-teeth-stage-art__zone-fill {
  fill: rgba(177, 104, 34, 0.55);
  transition: opacity 0.18s ease;
}

.brush-teeth-stage-art__zone-stroke {
  fill: none;
  opacity: 0;
  stroke: rgba(255, 255, 255, 0.78);
  stroke-linejoin: round;
  stroke-width: 5;
  transition: opacity 0.18s ease;
}

.brush-teeth-stage-art__zone-group.is-current .brush-teeth-stage-art__zone-stroke {
  opacity: 1;
}

.brush-teeth-stage-art__zone-group.is-done .brush-teeth-stage-art__zone-fill {
  fill: rgba(152, 251, 211, 0.12);
}

.brush-teeth-stage-art__shine path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 4;
  stroke-linecap: round;
  animation: brush-shine 1.6s ease-in-out infinite;
}

.brush-teeth-stage-art__shine g:nth-child(2) path {
  animation-delay: 0.2s;
}

.brush-teeth-stage-art__shine g:nth-child(3) path {
  animation-delay: 0.4s;
}

.brush-teeth-stage-art__shine g:nth-child(4) path {
  animation-delay: 0.62s;
}

@keyframes brush-shine {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}
</style>
