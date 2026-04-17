<template>
  <div class="wash-hands-stage-art" :class="rootClasses">
    <svg
      class="wash-hands-stage-art__svg"
      viewBox="0 0 720 520"
      role="img"
      aria-label="洗手台、水龙头、皂液器和双手的洗手场景"
    >
      <defs>
        <linearGradient id="washHandsBackdrop" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#f5fbff" />
          <stop offset="52%" stop-color="#dff7ff" />
          <stop offset="100%" stop-color="#d7f3ea" />
        </linearGradient>
        <linearGradient id="washHandsWall" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#f8fcff" />
          <stop offset="100%" stop-color="#e1f0fb" />
        </linearGradient>
        <linearGradient id="washHandsCounter" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#c7d7e7" />
          <stop offset="50%" stop-color="#eef6fb" />
          <stop offset="100%" stop-color="#b2cadc" />
        </linearGradient>
        <linearGradient id="washHandsSink" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="58%" stop-color="#eef8fd" />
          <stop offset="100%" stop-color="#c8dde8" />
        </linearGradient>
        <linearGradient id="washHandsWater" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.95)" />
          <stop offset="35%" stop-color="#79d5ff" />
          <stop offset="100%" stop-color="rgba(73, 191, 243, 0.18)" />
        </linearGradient>
        <linearGradient id="washHandsMetal" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="45%" stop-color="#b9cad8" />
          <stop offset="100%" stop-color="#72869a" />
        </linearGradient>
        <linearGradient id="washHandsMetalDark" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#d2dde8" />
          <stop offset="100%" stop-color="#64788d" />
        </linearGradient>
        <linearGradient id="washHandsSoapBottle" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#fff8d6" />
          <stop offset="50%" stop-color="#ffd86b" />
          <stop offset="100%" stop-color="#f6ad2d" />
        </linearGradient>
        <linearGradient id="washHandsSoapBottleIdle" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#eff7ff" />
          <stop offset="50%" stop-color="#b8dcff" />
          <stop offset="100%" stop-color="#68aef2" />
        </linearGradient>
        <linearGradient id="washHandsSkin" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffd8bc" />
          <stop offset="50%" stop-color="#f5bf95" />
          <stop offset="100%" stop-color="#d89263" />
        </linearGradient>
        <linearGradient id="washHandsWetSheen" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.82)" />
          <stop offset="100%" stop-color="rgba(97, 191, 255, 0.16)" />
        </linearGradient>
        <filter id="washHandsSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect x="18" y="18" width="684" height="484" rx="46" fill="url(#washHandsBackdrop)" />
      <rect x="60" y="54" width="600" height="188" rx="36" fill="url(#washHandsWall)" />

      <g class="wash-hands-stage-art__tiles" aria-hidden="true">
        <path d="M120 54v188M210 54v188M300 54v188M390 54v188M480 54v188M570 54v188" />
        <path d="M60 118h600M60 182h600" />
      </g>

      <ellipse class="wash-hands-stage-art__focus wash-hands-stage-art__focus--faucet" cx="436" cy="124" rx="118" ry="78" />
      <ellipse class="wash-hands-stage-art__focus wash-hands-stage-art__focus--soap" cx="580" cy="214" rx="88" ry="118" />
      <ellipse class="wash-hands-stage-art__focus wash-hands-stage-art__focus--hands" cx="360" cy="328" rx="184" ry="126" />
      <ellipse class="wash-hands-stage-art__focus wash-hands-stage-art__focus--rinse" cx="384" cy="296" rx="204" ry="136" />

      <ellipse cx="360" cy="470" rx="250" ry="24" fill="rgba(28, 71, 94, 0.1)" />
      <path
        d="M64 256c46-8 130-20 296-20 156 0 246 10 296 20v34H64z"
        fill="url(#washHandsCounter)"
      />

      <g class="wash-hands-stage-art__sink">
        <ellipse cx="360" cy="278" rx="232" ry="42" fill="#ffffff" stroke="#d2e8f3" stroke-width="12" />
        <path
          d="M138 278c0 84 68 162 222 162s222-78 222-162"
          fill="url(#washHandsSink)"
        />
        <ellipse cx="360" cy="324" rx="114" ry="24" fill="rgba(99, 185, 228, 0.18)" />
        <ellipse cx="360" cy="314" rx="162" ry="20" fill="rgba(255,255,255,0.5)" />
        <circle cx="360" cy="336" r="20" fill="#7e9eb0" />
        <circle cx="360" cy="336" r="10" fill="#41677a" />
      </g>

      <g class="wash-hands-stage-art__faucet">
        <rect x="356" y="94" width="60" height="126" rx="30" fill="url(#washHandsMetal)" />
        <path
          d="M388 94c0-42 32-74 74-74h44c42 0 76 34 76 76v86h-48v-78c0-14-10-24-24-24h-34c-22 0-40 18-40 40v62h-48z"
          fill="url(#washHandsMetal)"
        />
        <rect x="520" y="154" width="94" height="20" rx="10" fill="url(#washHandsMetalDark)" />
        <rect x="566" y="164" width="24" height="38" rx="12" fill="url(#washHandsMetalDark)" />
        <rect class="wash-hands-stage-art__handle" x="324" y="88" width="124" height="16" rx="8" fill="url(#washHandsMetalDark)" />
        <path
          d="M372 118c14-10 30-16 48-16"
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          stroke-linecap="round"
          stroke-width="8"
        />
      </g>

      <g class="wash-hands-stage-art__soap">
        <ellipse cx="578" cy="300" rx="54" ry="14" fill="rgba(29, 66, 88, 0.12)" />
        <path
          d="M528 182c0-24 20-44 44-44h12c24 0 44 20 44 44v82c0 26-20 46-44 46h-12c-24 0-44-20-44-46z"
          fill="url(#washHandsSoapBottleIdle)"
        />
        <path
          class="wash-hands-stage-art__soap-fill"
          d="M528 182c0-24 20-44 44-44h12c24 0 44 20 44 44v82c0 26-20 46-44 46h-12c-24 0-44-20-44-46z"
          fill="url(#washHandsSoapBottle)"
        />
        <ellipse cx="556" cy="216" rx="22" ry="50" fill="rgba(255,255,255,0.22)" />
        <rect x="564" y="138" width="24" height="40" rx="12" fill="url(#washHandsMetalDark)" />
        <path d="M576 146h58c10 0 18 8 18 18v8h-76z" fill="url(#washHandsMetalDark)" />
        <path d="M626 154h28c8 0 14 6 14 14v4h-42z" fill="url(#washHandsMetalDark)" />
        <g v-if="showSoapDrops" class="wash-hands-stage-art__soap-drops">
          <path d="M666 176c0 10-8 18-12 28-4-10-12-18-12-28 0-6 6-12 12-12s12 6 12 12z" />
          <path d="M646 196c0 8-6 14-10 22-4-8-10-14-10-22 0-6 4-10 10-10s10 4 10 10z" />
        </g>
      </g>

      <g v-if="showWater" class="wash-hands-stage-art__water">
        <path d="M578 178c-10 24-22 70-30 132" />
        <path d="M558 178c-12 30-28 86-40 150" />
        <path d="M598 180c-4 22-8 56-8 102" />
        <ellipse cx="526" cy="314" rx="64" ry="18" fill="rgba(92, 190, 234, 0.14)" />
      </g>

      <g class="wash-hands-stage-art__hands">
        <g class="wash-hands-stage-art__hand-group wash-hands-stage-art__hand-group--left">
          <ellipse class="wash-hands-stage-art__digit" cx="264" cy="276" rx="18" ry="50" transform="rotate(-40 264 276)" />
          <ellipse class="wash-hands-stage-art__digit" cx="288" cy="264" rx="19" ry="58" transform="rotate(-18 288 264)" />
          <ellipse class="wash-hands-stage-art__digit" cx="314" cy="262" rx="18" ry="60" transform="rotate(-4 314 262)" />
          <ellipse class="wash-hands-stage-art__digit" cx="340" cy="270" rx="17" ry="52" transform="rotate(12 340 270)" />
          <ellipse class="wash-hands-stage-art__thumb" cx="250" cy="344" rx="22" ry="44" transform="rotate(-54 250 344)" />
          <ellipse class="wash-hands-stage-art__palm" cx="302" cy="352" rx="64" ry="88" transform="rotate(-18 302 352)" />
          <ellipse class="wash-hands-stage-art__wet-sheen" cx="312" cy="324" rx="40" ry="56" transform="rotate(-18 312 324)" />
          <path class="wash-hands-stage-art__crease" d="M280 360c18 18 40 28 64 28" />
        </g>

        <g class="wash-hands-stage-art__hand-group wash-hands-stage-art__hand-group--right">
          <ellipse class="wash-hands-stage-art__digit" cx="456" cy="274" rx="17" ry="52" transform="rotate(-12 456 274)" />
          <ellipse class="wash-hands-stage-art__digit" cx="482" cy="264" rx="18" ry="60" transform="rotate(4 482 264)" />
          <ellipse class="wash-hands-stage-art__digit" cx="508" cy="268" rx="19" ry="58" transform="rotate(18 508 268)" />
          <ellipse class="wash-hands-stage-art__digit" cx="534" cy="280" rx="18" ry="50" transform="rotate(34 534 280)" />
          <ellipse class="wash-hands-stage-art__thumb" cx="548" cy="350" rx="22" ry="42" transform="rotate(56 548 350)" />
          <ellipse class="wash-hands-stage-art__palm" cx="492" cy="352" rx="64" ry="88" transform="rotate(18 492 352)" />
          <ellipse class="wash-hands-stage-art__wet-sheen" cx="482" cy="324" rx="40" ry="56" transform="rotate(18 482 324)" />
          <path class="wash-hands-stage-art__crease" d="M516 360c-18 18-40 28-64 28" />
        </g>
      </g>

      <g v-if="showFoam" class="wash-hands-stage-art__foam">
        <g
          v-for="bubble in foamBubbles"
          :key="bubble.id"
          :transform="`translate(${bubble.x} ${bubble.y}) scale(${bubble.scale})`"
        >
          <circle r="18" />
          <circle class="wash-hands-stage-art__foam-highlight" cx="-5" cy="-6" r="6" />
        </g>
      </g>

      <g v-if="showDroplets" class="wash-hands-stage-art__droplets">
        <g
          v-for="droplet in droplets"
          :key="droplet.id"
          :transform="`translate(${droplet.x} ${droplet.y})`"
        >
          <path d="M0 -12C6 -6 10 0 10 6c0 7-5 12-10 12S-10 13-10 6c0-6 4-12 10-18z" />
        </g>
      </g>

      <g v-if="showScrubRing" class="wash-hands-stage-art__scrub-ring">
        <circle cx="396" cy="318" r="92" class="wash-hands-stage-art__scrub-track" />
        <circle
          cx="396"
          cy="318"
          r="92"
          class="wash-hands-stage-art__scrub-progress"
          :style="{ strokeDashoffset: scrubDashOffset }"
        />
      </g>

      <g v-if="scrubActive" class="wash-hands-stage-art__scrub-guides">
        <path d="M244 320c40-24 88-30 144-18" />
        <path d="M548 350c-42 20-90 24-144 10" />
        <path d="M372 292l20 10-10 20" />
        <path d="M420 374l-20-10 10-20" />
      </g>

      <g v-if="showSparkles" class="wash-hands-stage-art__sparkles">
        <g v-for="sparkle in sparkles" :key="sparkle.id" :transform="`translate(${sparkle.x} ${sparkle.y})`">
          <path d="M0 -18v36M-18 0h36M-11 -11l22 22M11 -11l-22 22" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type FocusArea = 'faucet' | 'hands' | 'soap' | 'scrub' | 'rinse' | 'finish' | null

interface PointScale {
  id: number
  x: number
  y: number
  scale: number
}

interface Point {
  id: number
  x: number
  y: number
}

const props = withDefaults(defineProps<{
  waterOn?: boolean
  handsWet?: boolean
  soapApplied?: boolean
  scrubActive?: boolean
  rinseActive?: boolean
  finished?: boolean
  preview?: boolean
  focusArea?: FocusArea
  scrubPercent?: number
}>(), {
  waterOn: false,
  handsWet: false,
  soapApplied: false,
  scrubActive: false,
  rinseActive: false,
  finished: false,
  preview: false,
  focusArea: null,
  scrubPercent: 0,
})

const foamBubbles: ReadonlyArray<PointScale> = [
  { id: 1, x: 286, y: 266, scale: 1.1 },
  { id: 2, x: 330, y: 246, scale: 0.92 },
  { id: 3, x: 372, y: 252, scale: 1.05 },
  { id: 4, x: 418, y: 244, scale: 0.88 },
  { id: 5, x: 464, y: 258, scale: 1.12 },
  { id: 6, x: 506, y: 280, scale: 0.84 },
  { id: 7, x: 350, y: 300, scale: 0.94 },
  { id: 8, x: 430, y: 304, scale: 0.78 },
]

const droplets: ReadonlyArray<Point> = [
  { id: 1, x: 492, y: 290 },
  { id: 2, x: 522, y: 336 },
  { id: 3, x: 312, y: 410 },
  { id: 4, x: 382, y: 426 },
  { id: 5, x: 454, y: 412 },
]

const sparkles: ReadonlyArray<Point> = [
  { id: 1, x: 246, y: 256 },
  { id: 2, x: 324, y: 226 },
  { id: 3, x: 438, y: 236 },
  { id: 4, x: 530, y: 278 },
  { id: 5, x: 478, y: 394 },
]

const clampedScrubPercent = computed(() => Math.min(100, Math.max(0, props.scrubPercent)))
const scrubCircumference = 2 * Math.PI * 92
const scrubDashOffset = computed(() => scrubCircumference - (scrubCircumference * clampedScrubPercent.value) / 100)
const showWater = computed(() => props.waterOn || props.rinseActive)
const showFoam = computed(() => props.soapApplied && !props.finished)
const showSoapDrops = computed(() => props.focusArea === 'soap' || props.soapApplied)
const showDroplets = computed(() => props.handsWet || props.waterOn || props.finished)
const showSparkles = computed(() => props.rinseActive || props.finished)
const showScrubRing = computed(() => props.scrubActive || clampedScrubPercent.value > 0)

const rootClasses = computed(() => ({
  'is-preview': props.preview,
  'is-water-on': showWater.value,
  'is-hands-wet': props.handsWet || props.finished,
  'is-soapy': showFoam.value,
  'is-scrubbing': props.scrubActive,
  'is-rinsing': props.rinseActive,
  'is-finished': props.finished,
  'is-focus-faucet': props.focusArea === 'faucet',
  'is-focus-hands': props.focusArea === 'hands' || props.focusArea === 'scrub',
  'is-focus-soap': props.focusArea === 'soap',
  'is-focus-rinse': props.focusArea === 'rinse' || props.focusArea === 'finish',
}))
</script>

<style scoped>
.wash-hands-stage-art {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 30px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.72), transparent 44%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(203, 243, 255, 0.48));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 24px 40px rgba(29, 83, 110, 0.12);
}

.wash-hands-stage-art__svg {
  display: block;
  width: 100%;
  height: auto;
}

.wash-hands-stage-art__tiles {
  stroke: rgba(91, 149, 180, 0.18);
  stroke-width: 2;
}

.wash-hands-stage-art__focus {
  opacity: 0;
  fill: rgba(126, 221, 255, 0.34);
  filter: url(#washHandsSoftGlow);
  transition: opacity 0.2s ease;
}

.wash-hands-stage-art.is-focus-faucet .wash-hands-stage-art__focus--faucet,
.wash-hands-stage-art.is-focus-soap .wash-hands-stage-art__focus--soap,
.wash-hands-stage-art.is-focus-hands .wash-hands-stage-art__focus--hands,
.wash-hands-stage-art.is-focus-rinse .wash-hands-stage-art__focus--rinse {
  opacity: 1;
}

.wash-hands-stage-art__sink {
  transition: transform 0.24s ease;
}

.wash-hands-stage-art__handle {
  transform-origin: 386px 96px;
  transition: transform 0.22s ease;
}

.wash-hands-stage-art.is-water-on .wash-hands-stage-art__handle {
  transform: rotate(-16deg);
}

.wash-hands-stage-art__soap-fill {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.wash-hands-stage-art.is-soapy .wash-hands-stage-art__soap-fill,
.wash-hands-stage-art.is-finished .wash-hands-stage-art__soap-fill {
  opacity: 1;
}

.wash-hands-stage-art__soap {
  transform-origin: 576px 222px;
  transition: transform 0.2s ease;
}

.wash-hands-stage-art.is-focus-soap .wash-hands-stage-art__soap,
.wash-hands-stage-art.is-soapy .wash-hands-stage-art__soap {
  transform: translateY(4px);
}

.wash-hands-stage-art__soap-drops path {
  fill: rgba(255, 246, 190, 0.88);
  animation: soap-drop-float 1.6s ease-in-out infinite;
}

.wash-hands-stage-art__soap-drops path:last-child {
  animation-delay: 0.24s;
}

.wash-hands-stage-art__water {
  opacity: 0;
  transition: opacity 0.18s ease;
}

.wash-hands-stage-art.is-water-on .wash-hands-stage-art__water,
.wash-hands-stage-art.is-rinsing .wash-hands-stage-art__water,
.wash-hands-stage-art.is-finished .wash-hands-stage-art__water {
  opacity: 1;
}

.wash-hands-stage-art__water path {
  fill: none;
  stroke: url(#washHandsWater);
  stroke-linecap: round;
  stroke-width: 16;
  stroke-dasharray: 14 18;
  animation: water-flow 1.1s linear infinite;
}

.wash-hands-stage-art__water path:nth-child(2) {
  stroke-width: 12;
  animation-duration: 0.9s;
}

.wash-hands-stage-art__water path:nth-child(3) {
  stroke-width: 10;
  animation-duration: 1.4s;
}

.wash-hands-stage-art__digit,
.wash-hands-stage-art__thumb,
.wash-hands-stage-art__palm {
  fill: url(#washHandsSkin);
  stroke: rgba(182, 110, 56, 0.16);
  stroke-width: 3;
}

.wash-hands-stage-art__wet-sheen {
  opacity: 0;
  fill: url(#washHandsWetSheen);
  transition: opacity 0.18s ease;
}

.wash-hands-stage-art.is-hands-wet .wash-hands-stage-art__wet-sheen,
.wash-hands-stage-art.is-finished .wash-hands-stage-art__wet-sheen {
  opacity: 1;
}

.wash-hands-stage-art__crease {
  fill: none;
  stroke: rgba(176, 102, 56, 0.22);
  stroke-linecap: round;
  stroke-width: 5;
}

.wash-hands-stage-art__hand-group {
  transform-origin: center;
  transition: transform 0.24s ease;
}

.wash-hands-stage-art.is-focus-hands .wash-hands-stage-art__hand-group--left {
  transform: translate(-8px, -4px) rotate(-4deg);
}

.wash-hands-stage-art.is-focus-hands .wash-hands-stage-art__hand-group--right {
  transform: translate(8px, -4px) rotate(4deg);
}

.wash-hands-stage-art.is-scrubbing .wash-hands-stage-art__hand-group--left {
  animation: scrub-left 0.82s ease-in-out infinite;
}

.wash-hands-stage-art.is-scrubbing .wash-hands-stage-art__hand-group--right {
  animation: scrub-right 0.82s ease-in-out infinite;
}

.wash-hands-stage-art__foam circle {
  fill: rgba(255, 255, 255, 0.88);
  stroke: rgba(206, 232, 255, 0.9);
  stroke-width: 3;
  animation: foam-bob 2.4s ease-in-out infinite;
}

.wash-hands-stage-art__foam g:nth-child(2) circle {
  animation-delay: 0.2s;
}

.wash-hands-stage-art__foam g:nth-child(3) circle {
  animation-delay: 0.45s;
}

.wash-hands-stage-art__foam g:nth-child(4) circle {
  animation-delay: 0.3s;
}

.wash-hands-stage-art__foam g:nth-child(5) circle {
  animation-delay: 0.56s;
}

.wash-hands-stage-art__foam-highlight {
  fill: rgba(255, 255, 255, 0.92);
  stroke: none;
}

.wash-hands-stage-art__droplets path {
  fill: rgba(86, 190, 246, 0.58);
  animation: droplet-fall 1.8s ease-in-out infinite;
}

.wash-hands-stage-art__droplets g:nth-child(2) path {
  animation-delay: 0.22s;
}

.wash-hands-stage-art__droplets g:nth-child(3) path {
  animation-delay: 0.45s;
}

.wash-hands-stage-art__droplets g:nth-child(4) path {
  animation-delay: 0.62s;
}

.wash-hands-stage-art__droplets g:nth-child(5) path {
  animation-delay: 0.32s;
}

.wash-hands-stage-art__scrub-ring {
  opacity: 0.92;
}

.wash-hands-stage-art__scrub-track,
.wash-hands-stage-art__scrub-progress {
  fill: none;
  stroke-linecap: round;
  stroke-width: 10;
  transform: rotate(-90deg);
  transform-origin: 396px 318px;
}

.wash-hands-stage-art__scrub-track {
  stroke: rgba(255, 255, 255, 0.42);
}

.wash-hands-stage-art__scrub-progress {
  stroke: #2fc9a7;
  stroke-dasharray: 578.05;
  transition: stroke-dashoffset 0.18s ease;
}

.wash-hands-stage-art__scrub-guides path {
  fill: none;
  stroke: rgba(40, 177, 155, 0.82);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 7;
  animation: scrub-guide-pulse 1.2s ease-in-out infinite;
}

.wash-hands-stage-art__sparkles path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.95);
  stroke-linecap: round;
  stroke-width: 6;
  animation: sparkle-pulse 1.7s ease-in-out infinite;
}

.wash-hands-stage-art__sparkles g:nth-child(2) path {
  animation-delay: 0.2s;
}

.wash-hands-stage-art__sparkles g:nth-child(3) path {
  animation-delay: 0.38s;
}

.wash-hands-stage-art__sparkles g:nth-child(4) path {
  animation-delay: 0.56s;
}

.wash-hands-stage-art__sparkles g:nth-child(5) path {
  animation-delay: 0.76s;
}

.wash-hands-stage-art.is-preview .wash-hands-stage-art__scrub-ring,
.wash-hands-stage-art.is-preview .wash-hands-stage-art__scrub-guides,
.wash-hands-stage-art.is-preview .wash-hands-stage-art__sparkles {
  opacity: 0;
}

@keyframes water-flow {
  0% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: -64;
  }
}

@keyframes soap-drop-float {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.82;
  }
  50% {
    transform: translateY(6px);
    opacity: 1;
  }
}

@keyframes foam-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes droplet-fall {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  45% {
    transform: translateY(10px);
    opacity: 0.9;
  }
}

@keyframes scrub-left {
  0%,
  100% {
    transform: translate(-12px, -2px) rotate(-4deg);
  }
  50% {
    transform: translate(8px, 6px) rotate(3deg);
  }
}

@keyframes scrub-right {
  0%,
  100% {
    transform: translate(12px, -2px) rotate(4deg);
  }
  50% {
    transform: translate(-8px, 6px) rotate(-3deg);
  }
}

@keyframes scrub-guide-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

@keyframes sparkle-pulse {
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
