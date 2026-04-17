<template>
  <div class="dress-up-stage-art" :class="rootClasses">
    <svg
      class="dress-up-stage-art__svg"
      viewBox="0 0 720 560"
      role="img"
      aria-label="穿衣练习中的角色与分层衣物场景"
    >
      <defs>
        <linearGradient id="dressRoomWall" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#fff7f2" />
          <stop offset="100%" stop-color="#ffe6ef" />
        </linearGradient>
        <linearGradient id="dressRoomFloor" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#efd8c4" />
          <stop offset="100%" stop-color="#d8b79c" />
        </linearGradient>
        <linearGradient id="dressWindowSky" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#c5efff" />
          <stop offset="100%" stop-color="#87d8ff" />
        </linearGradient>
        <linearGradient id="dressSkin" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffd8bc" />
          <stop offset="48%" stop-color="#f5bf95" />
          <stop offset="100%" stop-color="#dc9568" />
        </linearGradient>
        <linearGradient id="dressHair" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#744e3c" />
          <stop offset="100%" stop-color="#4c2f24" />
        </linearGradient>
        <linearGradient id="dressBaseSuit" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#d4dce6" />
        </linearGradient>
        <linearGradient id="dressShoes" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#718096" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>
        <linearGradient id="dressUnderwear" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#fecdd3" />
          <stop offset="100%" stop-color="#f78ca2" />
        </linearGradient>
        <linearGradient id="dressSocks" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#dbeafe" />
          <stop offset="100%" stop-color="#8ec5ff" />
        </linearGradient>
        <linearGradient id="dressShirt" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffe7a8" />
          <stop offset="100%" stop-color="#f6b843" />
        </linearGradient>
        <linearGradient id="dressPants" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#95c8ff" />
          <stop offset="100%" stop-color="#4d90ea" />
        </linearGradient>
        <linearGradient id="dressCoat" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffc5e0" />
          <stop offset="100%" stop-color="#ea6fad" />
        </linearGradient>
        <filter id="dressGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect x="20" y="20" width="680" height="520" rx="44" fill="url(#dressRoomWall)" />
      <rect x="56" y="72" width="608" height="318" rx="30" fill="#fff9f6" />
      <path d="M20 420h680v120H20z" fill="url(#dressRoomFloor)" />
      <ellipse cx="360" cy="456" rx="178" ry="28" fill="rgba(71, 52, 40, 0.12)" />

      <g class="dress-up-stage-art__window">
        <rect x="82" y="92" width="190" height="170" rx="24" fill="url(#dressWindowSky)" />
        <rect x="82" y="92" width="190" height="170" rx="24" fill="none" stroke="#fff" stroke-width="10" />
        <path d="M176 92v170M82 176h190" stroke="rgba(255,255,255,0.84)" stroke-width="8" />

        <g v-if="activeThemeId === 'sunny'" class="dress-up-stage-art__weather dress-up-stage-art__weather--sunny">
          <circle cx="220" cy="128" r="24" fill="#ffd66b" />
          <path d="M220 92v-18M220 182v18M184 128h-18M256 128h18M194 102l-12-12M246 154l12 12M194 154l-12 12M246 102l12-12" />
          <path d="M112 212c10-20 28-28 52-28 16-16 34-22 54-22 24 0 42 8 60 28v26H112z" fill="rgba(255,255,255,0.72)" />
        </g>

        <g v-else-if="activeThemeId === 'windy'" class="dress-up-stage-art__weather dress-up-stage-art__weather--windy">
          <path d="M100 138c28-18 68-16 90 4 16-10 38-12 56-4" />
          <path d="M114 168c34-10 80-6 114 12" />
          <path d="M122 212c36-22 88-24 128-8" />
          <path d="M210 126c16 12 26 28 30 48" />
          <path d="M136 126c-18 10-30 26-36 46" />
        </g>

        <g v-else class="dress-up-stage-art__weather dress-up-stage-art__weather--school">
          <path d="M106 220h140v-54l-70-34-70 34z" fill="rgba(255,255,255,0.82)" />
          <path d="M176 136v84" stroke="#93c5fd" stroke-width="10" />
          <path d="M130 184h92M130 202h92" stroke="#93c5fd" stroke-width="8" stroke-linecap="round" />
          <circle cx="224" cy="120" r="24" fill="#fff7d6" />
          <path d="M224 120l10-12" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" />
          <path d="M224 120v16" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" />
        </g>
      </g>

      <g class="dress-up-stage-art__rack" aria-hidden="true">
        <rect x="546" y="120" width="18" height="210" rx="9" fill="#d1a982" />
        <rect x="512" y="110" width="120" height="16" rx="8" fill="#e2bb93" />
        <rect x="522" y="322" width="100" height="18" rx="9" fill="#c99768" />
        <path d="M536 142c8 18 16 26 26 26s18-8 26-26" fill="none" stroke="#f59e0b" stroke-width="6" stroke-linecap="round" />
        <path d="M576 142c8 18 16 26 26 26s18-8 26-26" fill="none" stroke="#60a5fa" stroke-width="6" stroke-linecap="round" />
      </g>

      <ellipse class="dress-up-stage-art__focus dress-up-stage-art__focus--upper" cx="362" cy="262" rx="122" ry="132" />
      <ellipse class="dress-up-stage-art__focus dress-up-stage-art__focus--middle" cx="362" cy="312" rx="118" ry="88" />
      <ellipse class="dress-up-stage-art__focus dress-up-stage-art__focus--lower" cx="362" cy="388" rx="116" ry="104" />

      <g class="dress-up-stage-art__avatar">
        <g class="dress-up-stage-art__base">
          <ellipse cx="362" cy="138" rx="54" ry="60" fill="url(#dressSkin)" />
          <path d="M312 132c0-48 28-78 60-78 34 0 62 28 62 76-24-14-42-16-62-16-18 0-36 4-60 18z" fill="url(#dressHair)" />
          <path d="M316 128c4-24 18-40 42-48" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="8" stroke-linecap="round" />
          <circle cx="344" cy="142" r="5" fill="#4f3427" />
          <circle cx="380" cy="142" r="5" fill="#4f3427" />
          <path d="M346 170c10 12 20 18 34 18 14 0 24-6 34-18" fill="none" stroke="#ba6a58" stroke-width="6" stroke-linecap="round" />
          <ellipse cx="326" cy="164" rx="10" ry="6" fill="rgba(247, 143, 143, 0.28)" />
          <ellipse cx="398" cy="164" rx="10" ry="6" fill="rgba(247, 143, 143, 0.28)" />

          <rect x="348" y="190" width="28" height="28" rx="12" fill="url(#dressSkin)" />
          <path d="M296 218c8-32 30-46 66-46 40 0 62 14 70 46l20 104h-42l-12-80h-72l-12 80h-42z" fill="url(#dressBaseSuit)" />
          <path d="M300 236c-24 24-34 54-34 96" fill="none" stroke="url(#dressSkin)" stroke-width="24" stroke-linecap="round" />
          <path d="M424 236c24 24 34 54 34 96" fill="none" stroke="url(#dressSkin)" stroke-width="24" stroke-linecap="round" />
          <path d="M338 322v112" fill="none" stroke="url(#dressSkin)" stroke-width="28" stroke-linecap="round" />
          <path d="M386 322v112" fill="none" stroke="url(#dressSkin)" stroke-width="28" stroke-linecap="round" />
          <path d="M326 438h28c10 0 18 8 18 18v4h-64v-4c0-10 8-18 18-18z" fill="url(#dressShoes)" />
          <path d="M372 438h28c10 0 18 8 18 18v4h-64v-4c0-10 8-18 18-18z" fill="url(#dressShoes)" />
        </g>

        <g class="dress-up-stage-art__item dress-up-stage-art__item--underwear" :class="itemClasses('underwear')">
          <path class="dress-up-stage-art__item-fill" d="M312 220c16-10 34-16 50-16 18 0 36 6 52 16v68h-102z" fill="url(#dressUnderwear)" />
          <path class="dress-up-stage-art__item-fill" d="M314 286h38v48h-28c-10 0-18-8-18-18z" fill="url(#dressUnderwear)" />
          <path class="dress-up-stage-art__item-fill" d="M372 286h38v30c0 10-8 18-18 18h-28z" fill="url(#dressUnderwear)" />
          <path class="dress-up-stage-art__item-stroke" d="M312 220c16-10 34-16 50-16 18 0 36 6 52 16v68h-102z" />
        </g>

        <g class="dress-up-stage-art__item dress-up-stage-art__item--socks" :class="itemClasses('socks')">
          <path class="dress-up-stage-art__item-fill" d="M320 368h30v72c0 10-8 18-18 18h-12z" fill="url(#dressSocks)" />
          <path class="dress-up-stage-art__item-fill" d="M374 368h30v90h-12c-10 0-18-8-18-18z" fill="url(#dressSocks)" />
          <path class="dress-up-stage-art__item-detail" d="M320 396h30M374 396h30" />
          <path class="dress-up-stage-art__item-stroke" d="M320 368h30v72c0 10-8 18-18 18h-12z" />
          <path class="dress-up-stage-art__item-stroke" d="M374 368h30v90h-12c-10 0-18-8-18-18z" />
        </g>

        <g class="dress-up-stage-art__item dress-up-stage-art__item--shirt" :class="itemClasses('shirt')">
          <path class="dress-up-stage-art__item-fill" d="M286 224c12-24 34-40 76-40 42 0 66 16 78 40l-20 32-20-18v110H324V238l-20 18z" fill="url(#dressShirt)" />
          <path class="dress-up-stage-art__item-detail" d="M362 212v136" />
          <path class="dress-up-stage-art__item-detail" d="M332 252h60" />
          <path class="dress-up-stage-art__item-stroke" d="M286 224c12-24 34-40 76-40 42 0 66 16 78 40l-20 32-20-18v110H324V238l-20 18z" />
        </g>

        <g class="dress-up-stage-art__item dress-up-stage-art__item--pants" :class="itemClasses('pants')">
          <path class="dress-up-stage-art__item-fill" d="M314 296h96l-10 142h-32l-8-88-8 88h-32l-14-142z" fill="url(#dressPants)" />
          <path class="dress-up-stage-art__item-detail" d="M362 298l-10 132" />
          <path class="dress-up-stage-art__item-detail" d="M346 330l-18 12M378 330l18 12" />
          <path class="dress-up-stage-art__item-stroke" d="M314 296h96l-10 142h-32l-8-88-8 88h-32l-14-142z" />
        </g>

        <g class="dress-up-stage-art__item dress-up-stage-art__item--coat" :class="itemClasses('coat')">
          <path class="dress-up-stage-art__item-fill" d="M280 214c18-18 42-28 82-28 40 0 64 10 82 28l10 24-24 28-18-18v138h-100V248l-18 18-24-28z" fill="url(#dressCoat)" />
          <path class="dress-up-stage-art__item-fill" d="M336 212l26 40 28-40" fill="rgba(255,255,255,0.28)" />
          <path class="dress-up-stage-art__item-detail" d="M362 214v172" />
          <path class="dress-up-stage-art__item-detail" d="M324 308h20v34h-20zM380 308h20v34h-20z" />
          <path class="dress-up-stage-art__item-stroke" d="M280 214c18-18 42-28 82-28 40 0 64 10 82 28l10 24-24 28-18-18v138h-100V248l-18 18-24-28z" />
        </g>
      </g>

      <g v-if="finished" class="dress-up-stage-art__sparkles">
        <g v-for="sparkle in sparkles" :key="sparkle.id" :transform="`translate(${sparkle.x} ${sparkle.y})`">
          <path d="M0 -18v36M-18 0h36M-10 -10l20 20M10 -10l-20 20" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ClothingId = 'underwear' | 'socks' | 'shirt' | 'pants' | 'coat'
type ThemeId = 'sunny' | 'windy' | 'school'

interface Point {
  id: number
  x: number
  y: number
}

const props = withDefaults(defineProps<{
  targetItemIds?: string[]
  placedItemIds?: string[]
  currentTargetId?: string | null
  themeId?: string
  preview?: boolean
  finished?: boolean
}>(), {
  targetItemIds: () => [],
  placedItemIds: () => [],
  currentTargetId: null,
  themeId: 'sunny',
  preview: false,
  finished: false,
})

const sparkles: ReadonlyArray<Point> = [
  { id: 1, x: 252, y: 124 },
  { id: 2, x: 454, y: 138 },
  { id: 3, x: 520, y: 220 },
  { id: 4, x: 246, y: 346 },
  { id: 5, x: 472, y: 382 },
]

const targetSet = computed(() => new Set(props.targetItemIds))
const placedSet = computed(() => new Set(props.placedItemIds))
const activeThemeId = computed<ThemeId>(() => {
  if (props.themeId === 'windy' || props.themeId === 'school') {
    return props.themeId
  }

  return 'sunny'
})
const focusArea = computed<'upper' | 'middle' | 'lower' | null>(() => {
  if (props.finished || props.preview) {
    return null
  }

  if (props.currentTargetId === 'shirt' || props.currentTargetId === 'coat') {
    return 'upper'
  }

  if (props.currentTargetId === 'underwear') {
    return 'middle'
  }

  if (props.currentTargetId === 'pants' || props.currentTargetId === 'socks') {
    return 'lower'
  }

  return null
})

function itemClasses(id: ClothingId) {
  const isTarget = targetSet.value.has(id)
  const isVisible = props.finished ? isTarget : placedSet.value.has(id)
  const isPreviewTarget = props.preview && isTarget
  const isGuide = !props.preview && !props.finished && isTarget && props.currentTargetId === id && !placedSet.value.has(id)

  return {
    'is-visible': isVisible,
    'is-preview-target': isPreviewTarget,
    'is-guide': isGuide,
  }
}

const rootClasses = computed(() => ({
  [`theme-${activeThemeId.value}`]: true,
  'is-preview': props.preview,
  'is-finished': props.finished,
  'is-focus-upper': focusArea.value === 'upper',
  'is-focus-middle': focusArea.value === 'middle',
  'is-focus-lower': focusArea.value === 'lower',
}))
</script>

<style scoped>
.dress-up-stage-art {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.58), rgba(255, 235, 240, 0.52));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    0 24px 40px rgba(107, 62, 73, 0.12);
}

.dress-up-stage-art__svg {
  display: block;
  width: 100%;
  height: auto;
}

.dress-up-stage-art__weather {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dress-up-stage-art__weather--sunny path {
  stroke: rgba(255, 214, 107, 0.72);
  stroke-width: 5;
}

.dress-up-stage-art__weather--windy path {
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 7;
}

.dress-up-stage-art__weather--school path {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dress-up-stage-art__focus {
  opacity: 0;
  fill: rgba(255, 206, 112, 0.24);
  filter: url(#dressGlow);
  transition: opacity 0.18s ease;
}

.dress-up-stage-art.is-focus-upper .dress-up-stage-art__focus--upper,
.dress-up-stage-art.is-focus-middle .dress-up-stage-art__focus--middle,
.dress-up-stage-art.is-focus-lower .dress-up-stage-art__focus--lower {
  opacity: 1;
}

.dress-up-stage-art__base {
  transition: transform 0.24s ease;
}

.dress-up-stage-art.is-finished .dress-up-stage-art__base {
  transform: translateY(-4px);
}

.dress-up-stage-art__item {
  opacity: 0;
  transform-origin: center;
  transition: opacity 0.2s ease, transform 0.24s ease;
}

.dress-up-stage-art__item-fill {
  stroke: none;
}

.dress-up-stage-art__item-stroke {
  fill: none;
  stroke: rgba(96, 56, 44, 0.28);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dress-up-stage-art__item-detail {
  fill: none;
  stroke: rgba(255, 255, 255, 0.66);
  stroke-width: 4.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dress-up-stage-art__item.is-visible,
.dress-up-stage-art__item.is-preview-target,
.dress-up-stage-art__item.is-guide {
  opacity: 1;
}

.dress-up-stage-art__item.is-visible {
  transform: translateY(0);
}

.dress-up-stage-art__item.is-preview-target {
  transform: translateY(0);
}

.dress-up-stage-art__item.is-preview-target .dress-up-stage-art__item-fill {
  opacity: 0.78;
}

.dress-up-stage-art__item.is-preview-target .dress-up-stage-art__item-stroke {
  stroke: rgba(96, 56, 44, 0.2);
}

.dress-up-stage-art__item.is-guide .dress-up-stage-art__item-fill {
  opacity: 0.18;
}

.dress-up-stage-art__item.is-guide .dress-up-stage-art__item-stroke {
  stroke: rgba(244, 114, 182, 0.82);
  stroke-dasharray: 14 10;
  animation: dress-guide-pulse 1.2s ease-in-out infinite;
}

.dress-up-stage-art__item.is-guide .dress-up-stage-art__item-detail {
  stroke: rgba(244, 114, 182, 0.48);
}

.dress-up-stage-art__item--coat.is-visible,
.dress-up-stage-art__item--coat.is-preview-target {
  filter: drop-shadow(0 10px 16px rgba(234, 111, 173, 0.16));
}

.dress-up-stage-art__sparkles path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.96);
  stroke-width: 6;
  stroke-linecap: round;
  animation: dress-sparkle 1.7s ease-in-out infinite;
}

.dress-up-stage-art__sparkles g:nth-child(2) path {
  animation-delay: 0.22s;
}

.dress-up-stage-art__sparkles g:nth-child(3) path {
  animation-delay: 0.4s;
}

.dress-up-stage-art__sparkles g:nth-child(4) path {
  animation-delay: 0.64s;
}

.dress-up-stage-art__sparkles g:nth-child(5) path {
  animation-delay: 0.82s;
}

.dress-up-stage-art.is-preview .dress-up-stage-art__sparkles {
  opacity: 0;
}

@keyframes dress-guide-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@keyframes dress-sparkle {
  0%,
  100% {
    opacity: 0.36;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}
</style>
