<template>
  <div class="set-table-stage-art" :class="rootClasses">
    <svg
      class="set-table-stage-art__svg"
      viewBox="0 0 720 420"
      preserveAspectRatio="none"
      role="img"
      aria-label="包含餐桌、餐位锚点和餐具资产的摆桌训练舞台"
    >
      <defs>
        <linearGradient id="setTableBackdrop" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.backdropStart" />
          <stop offset="55%" :stop-color="palette.backdropMid" />
          <stop offset="100%" :stop-color="palette.backdropEnd" />
        </linearGradient>
        <linearGradient id="setTableWood" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.woodLight" />
          <stop offset="100%" :stop-color="palette.woodDark" />
        </linearGradient>
        <linearGradient id="setTableRunner" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.runnerStart" />
          <stop offset="100%" :stop-color="palette.runnerEnd" />
        </linearGradient>
        <linearGradient id="setTablePlacemat" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.placematStart" />
          <stop offset="100%" :stop-color="palette.placematEnd" />
        </linearGradient>
        <linearGradient id="setTableSeat" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.seatStart" />
          <stop offset="100%" :stop-color="palette.seatEnd" />
        </linearGradient>
        <linearGradient id="setTablePlate" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#d9e6f1" />
        </linearGradient>
        <linearGradient id="setTableBowl" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#fff8ef" />
          <stop offset="100%" stop-color="#f1d7bf" />
        </linearGradient>
        <linearGradient id="setTableMetal" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#fbfdff" />
          <stop offset="100%" stop-color="#b5c7da" />
        </linearGradient>
        <linearGradient id="setTableCup" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" :stop-color="palette.cupShell" />
        </linearGradient>
        <linearGradient id="setTableTea" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.cupDrinkStart" />
          <stop offset="100%" :stop-color="palette.cupDrinkEnd" />
        </linearGradient>
        <linearGradient id="setTableChopsticks" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.chopsticksLight" />
          <stop offset="100%" :stop-color="palette.chopsticksDark" />
        </linearGradient>
        <linearGradient id="setTableNapkin" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.napkinStart" />
          <stop offset="100%" :stop-color="palette.napkinEnd" />
        </linearGradient>
        <filter id="setTableSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      <rect x="16" y="16" width="688" height="388" rx="40" fill="url(#setTableBackdrop)" />
      <circle cx="112" cy="92" r="88" :fill="palette.glowSoft" opacity="0.8" />
      <circle cx="628" cy="100" r="70" :fill="palette.glowWarm" opacity="0.55" />
      <circle cx="596" cy="340" r="110" fill="rgba(255, 255, 255, 0.36)" />

      <g class="set-table-stage-art__room">
        <rect x="64" y="44" width="592" height="48" rx="24" fill="rgba(255,255,255,0.7)" />
        <rect x="332" y="40" width="56" height="78" rx="28" fill="rgba(255,255,255,0.6)" />
        <circle cx="360" cy="74" r="16" fill="rgba(255,255,255,0.82)" />
      </g>

      <ellipse cx="360" cy="322" rx="244" ry="44" fill="rgba(54, 81, 108, 0.14)" />
      <ellipse cx="360" cy="300" rx="212" ry="82" fill="url(#setTableSeat)" opacity="0.94" />
      <path
        d="M236 326c42 18 78 26 124 26 48 0 84-8 124-26"
        fill="none"
        stroke="rgba(255,255,255,0.24)"
        stroke-linecap="round"
        stroke-width="8"
      />

      <g class="set-table-stage-art__table">
        <rect x="96" y="104" width="528" height="236" rx="48" class="set-table-stage-art__table-top" />
        <rect x="118" y="122" width="484" height="200" rx="40" fill="rgba(255,255,255,0.08)" />
        <rect x="326" y="118" width="68" height="208" rx="28" class="set-table-stage-art__runner" />
        <ellipse cx="360" cy="226" rx="164" ry="110" class="set-table-stage-art__placemat" />
        <ellipse
          cx="360"
          cy="226"
          rx="144"
          ry="94"
          fill="none"
          stroke="rgba(255,255,255,0.36)"
          stroke-dasharray="4 10"
          stroke-linecap="round"
          stroke-width="4"
        />
      </g>

      <g class="set-table-stage-art__accent">
        <path
          d="M152 138c22-18 46-26 68-26 20 0 44 8 62 22"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          stroke-linecap="round"
          stroke-width="8"
        />
        <path
          d="M470 142c18-16 38-22 58-22 18 0 34 6 50 18"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          stroke-linecap="round"
          stroke-width="8"
        />
      </g>

      <g
        v-for="anchor in activeAnchors"
        :key="anchor.id"
        class="set-table-stage-art__anchor"
        :class="anchorClasses(anchor.id)"
        :transform="`translate(${anchor.x} ${anchor.y})`"
      >
        <ellipse
          class="set-table-stage-art__anchor-glow"
          :rx="anchor.glowRx"
          :ry="anchor.glowRy"
        />

        <template v-if="anchor.id === 'napkin'">
          <ellipse class="set-table-stage-art__anchor-shadow" cx="0" cy="34" rx="54" ry="18" />
          <g transform="rotate(-10)">
            <template v-if="isPlaced(anchor.id)">
              <path class="set-table-stage-art__napkin" d="M-48 -32H48V34H-48z" />
              <path class="set-table-stage-art__napkin-fold" d="M-48 -32L48 34" />
              <path class="set-table-stage-art__napkin-fold" d="M0 -32L48 4" />
            </template>
            <template v-else>
              <rect
                class="set-table-stage-art__anchor-ring"
                x="-50"
                y="-34"
                width="100"
                height="70"
                rx="20"
              />
              <path class="set-table-stage-art__ghost-asset" d="M-48 -32H48V34H-48z" />
              <path class="set-table-stage-art__ghost-asset" d="M-48 -32L48 34" />
            </template>
          </g>
        </template>

        <template v-else-if="anchor.id === 'cup'">
          <ellipse class="set-table-stage-art__anchor-shadow" cx="2" cy="48" rx="44" ry="16" />
          <g transform="rotate(6)">
            <template v-if="isPlaced(anchor.id)">
              <path class="set-table-stage-art__cup-body" d="M-28 -40H30L24 36C20 58 8 72 0 72c-8 0-20-14-24-36z" />
              <path class="set-table-stage-art__cup-fill" d="M-20 8H22L18 38C15 50 8 58 0 60c-8-2-15-10-18-22z" />
              <path class="set-table-stage-art__cup-handle" d="M34 -14c16 0 28 12 28 28 0 18-12 30-30 30" />
              <path class="set-table-stage-art__cup-highlight" d="M-10 -16v48" />
            </template>
            <template v-else>
              <path class="set-table-stage-art__ghost-asset" d="M-28 -40H30L24 36C20 58 8 72 0 72c-8 0-20-14-24-36z" />
              <path class="set-table-stage-art__ghost-asset" d="M34 -14c16 0 28 12 28 28 0 18-12 30-30 30" />
            </template>
          </g>
        </template>

        <template v-else-if="anchor.id === 'spoon'">
          <ellipse class="set-table-stage-art__anchor-shadow" cx="-2" cy="40" rx="26" ry="56" />
          <g transform="rotate(-18)">
            <template v-if="isPlaced(anchor.id)">
              <path class="set-table-stage-art__spoon-bowl" d="M0 -56c-16 0-28 16-28 36 0 20 12 36 28 36s28-16 28-36c0-20-12-36-28-36z" />
              <rect class="set-table-stage-art__spoon-handle" x="-8" y="10" width="16" height="122" rx="8" />
              <path class="set-table-stage-art__spoon-shine" d="M-6 -20c4-8 10-12 16-14" />
            </template>
            <template v-else>
              <ellipse class="set-table-stage-art__anchor-ring" cx="0" cy="-18" rx="30" ry="38" />
              <path class="set-table-stage-art__ghost-asset" d="M0 -56c-16 0-28 16-28 36 0 20 12 36 28 36s28-16 28-36c0-20-12-36-28-36z" />
              <line class="set-table-stage-art__ghost-asset" x1="0" y1="12" x2="0" y2="132" />
            </template>
          </g>
        </template>

        <template v-else-if="anchor.id === 'bowl'">
          <ellipse class="set-table-stage-art__anchor-shadow" cx="0" cy="54" rx="98" ry="22" />
          <template v-if="isPlaced(anchor.id)">
            <ellipse class="set-table-stage-art__plate" cx="0" cy="26" rx="104" ry="56" />
            <ellipse class="set-table-stage-art__plate-inner" cx="0" cy="26" rx="78" ry="38" />
            <path class="set-table-stage-art__bowl" d="M-64 10H64C58 52 34 78 0 82-34 78-58 52-64 10Z" />
            <ellipse class="set-table-stage-art__bowl-rim" cx="0" cy="10" rx="64" ry="18" />
            <path class="set-table-stage-art__rice" d="M-24 8c8-8 18-12 24-12 8 0 18 4 24 12" />
          </template>
          <template v-else>
            <ellipse class="set-table-stage-art__anchor-ring" cx="0" cy="26" rx="106" ry="58" />
            <path class="set-table-stage-art__ghost-asset" d="M-64 10H64C58 52 34 78 0 82-34 78-58 52-64 10Z" />
            <ellipse class="set-table-stage-art__ghost-asset" cx="0" cy="10" rx="64" ry="18" />
          </template>
        </template>

        <template v-else>
          <ellipse class="set-table-stage-art__anchor-shadow" cx="6" cy="54" rx="22" ry="66" />
          <g transform="rotate(14)">
            <template v-if="isPlaced(anchor.id)">
              <rect class="set-table-stage-art__chopstick" x="-14" y="-78" width="8" height="164" rx="4" />
              <rect class="set-table-stage-art__chopstick" x="6" y="-70" width="8" height="156" rx="4" />
            </template>
            <template v-else>
              <line class="set-table-stage-art__ghost-asset" x1="-10" y1="-78" x2="-10" y2="86" />
              <line class="set-table-stage-art__ghost-asset" x1="10" y1="-70" x2="10" y2="86" />
            </template>
          </g>
        </template>

        <g
          class="set-table-stage-art__anchor-label"
          :transform="`translate(${anchor.labelOffsetX} ${anchor.labelOffsetY})`"
        >
          <rect
            :x="-anchor.badgeWidth / 2"
            y="-17"
            :width="anchor.badgeWidth"
            height="34"
            rx="17"
          />
          <text x="0" y="2">{{ anchor.label }}</text>
        </g>
      </g>

      <g v-if="finished" class="set-table-stage-art__sparkles">
        <g
          v-for="sparkle in sparkles"
          :key="sparkle.id"
          :transform="`translate(${sparkle.x} ${sparkle.y}) scale(${sparkle.scale})`"
        >
          <path d="M0 -14v28M-14 0h28M-8 -8l16 16M8 -8l-16 16" :style="{ animationDelay: `${sparkle.delay}s` }" />
        </g>
      </g>
    </svg>

    <button
      v-for="anchor in interactiveAnchors"
      :key="anchor.id"
      type="button"
      class="set-table-stage-art__anchor-hit"
      :class="hitClasses(anchor.id)"
      :style="buttonStyle(anchor)"
      :disabled="disabled"
      @click="emit('pick-slot', anchor.id)"
    >
      <span class="set-table-stage-art__sr">{{ anchor.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SlotId = 'bowl' | 'spoon' | 'cup' | 'chopsticks' | 'napkin'

interface AnchorMeta {
  id: SlotId
  label: string
  x: number
  y: number
  glowRx: number
  glowRy: number
  hitWidth: number
  hitHeight: number
  labelOffsetX: number
  labelOffsetY: number
  badgeWidth: number
}

interface ThemePalette {
  backdropStart: string
  backdropMid: string
  backdropEnd: string
  glowSoft: string
  glowWarm: string
  woodLight: string
  woodDark: string
  runnerStart: string
  runnerEnd: string
  placematStart: string
  placematEnd: string
  seatStart: string
  seatEnd: string
  napkinStart: string
  napkinEnd: string
  cupShell: string
  cupDrinkStart: string
  cupDrinkEnd: string
  chopsticksLight: string
  chopsticksDark: string
}

interface SparklePoint {
  id: number
  x: number
  y: number
  scale: number
  delay: number
}

const DEFAULT_THEME_ID = 'family-dinner'

const props = withDefaults(defineProps<{
  slotIds?: string[]
  filledSlotIds?: string[]
  selectedSlotId?: string | null
  hintedSlotId?: string | null
  themeId?: string | null
  preview?: boolean
  finished?: boolean
  interactive?: boolean
  disabled?: boolean
}>(), {
  slotIds: () => [],
  filledSlotIds: () => [],
  selectedSlotId: null,
  hintedSlotId: null,
  themeId: DEFAULT_THEME_ID,
  preview: false,
  finished: false,
  interactive: false,
  disabled: false,
})

const emit = defineEmits<{
  'pick-slot': [slotId: string]
}>()

const ANCHOR_ORDER: ReadonlyArray<SlotId> = ['napkin', 'cup', 'spoon', 'bowl', 'chopsticks']

const ANCHOR_META: Record<SlotId, AnchorMeta> = {
  napkin: {
    id: 'napkin',
    label: '餐巾位',
    x: 214,
    y: 142,
    glowRx: 72,
    glowRy: 56,
    hitWidth: 150,
    hitHeight: 126,
    labelOffsetX: 0,
    labelOffsetY: 74,
    badgeWidth: 112,
  },
  cup: {
    id: 'cup',
    label: '杯位',
    x: 512,
    y: 148,
    glowRx: 74,
    glowRy: 84,
    hitWidth: 148,
    hitHeight: 184,
    labelOffsetX: 0,
    labelOffsetY: 96,
    badgeWidth: 92,
  },
  spoon: {
    id: 'spoon',
    label: '勺子位',
    x: 242,
    y: 234,
    glowRx: 74,
    glowRy: 108,
    hitWidth: 124,
    hitHeight: 230,
    labelOffsetX: -12,
    labelOffsetY: 110,
    badgeWidth: 104,
  },
  bowl: {
    id: 'bowl',
    label: '碗位',
    x: 360,
    y: 230,
    glowRx: 130,
    glowRy: 96,
    hitWidth: 238,
    hitHeight: 188,
    labelOffsetX: 0,
    labelOffsetY: 108,
    badgeWidth: 90,
  },
  chopsticks: {
    id: 'chopsticks',
    label: '筷子位',
    x: 506,
    y: 238,
    glowRx: 60,
    glowRy: 126,
    hitWidth: 112,
    hitHeight: 244,
    labelOffsetX: 4,
    labelOffsetY: 116,
    badgeWidth: 108,
  },
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  'family-dinner': {
    backdropStart: '#fff6e4',
    backdropMid: '#ffe4d4',
    backdropEnd: '#d8efe7',
    glowSoft: 'rgba(255, 209, 161, 0.75)',
    glowWarm: 'rgba(244, 174, 138, 0.62)',
    woodLight: '#d7a26d',
    woodDark: '#ab6a44',
    runnerStart: '#f7a14d',
    runnerEnd: '#e2664c',
    placematStart: '#fff6ea',
    placematEnd: '#ffd8bc',
    seatStart: '#7eb2a2',
    seatEnd: '#4f7f78',
    napkinStart: '#ffffff',
    napkinEnd: '#ffd5df',
    cupShell: '#f4eadb',
    cupDrinkStart: '#ffd28b',
    cupDrinkEnd: '#f59e0b',
    chopsticksLight: '#9d6743',
    chopsticksDark: '#6d4128',
  },
  breakfast: {
    backdropStart: '#fdf7db',
    backdropMid: '#ffeec7',
    backdropEnd: '#daf3ea',
    glowSoft: 'rgba(255, 220, 136, 0.78)',
    glowWarm: 'rgba(255, 196, 125, 0.58)',
    woodLight: '#ddb57e',
    woodDark: '#af784c',
    runnerStart: '#fbbf24',
    runnerEnd: '#f97316',
    placematStart: '#fff9ef',
    placematEnd: '#ffecc0',
    seatStart: '#8dc9bb',
    seatEnd: '#5d9487',
    napkinStart: '#ffffff',
    napkinEnd: '#ffe7a8',
    cupShell: '#eaf5f0',
    cupDrinkStart: '#fde68a',
    cupDrinkEnd: '#f59e0b',
    chopsticksLight: '#95663f',
    chopsticksDark: '#6f4a2c',
  },
  guest: {
    backdropStart: '#f9f5ff',
    backdropMid: '#ffe7ef',
    backdropEnd: '#e3f5f3',
    glowSoft: 'rgba(232, 191, 255, 0.68)',
    glowWarm: 'rgba(255, 188, 208, 0.56)',
    woodLight: '#c88f77',
    woodDark: '#93584e',
    runnerStart: '#8dd7c1',
    runnerEnd: '#5bb4a4',
    placematStart: '#fff7fd',
    placematEnd: '#f7d7e5',
    seatStart: '#7fa9c0',
    seatEnd: '#5f7998',
    napkinStart: '#ffffff',
    napkinEnd: '#ecc9dd',
    cupShell: '#f4efff',
    cupDrinkStart: '#fcd5ce',
    cupDrinkEnd: '#f29a74',
    chopsticksLight: '#9d6c52',
    chopsticksDark: '#6f4637',
  },
}

const sparkles: ReadonlyArray<SparklePoint> = [
  { id: 1, x: 214, y: 122, scale: 0.8, delay: 0.1 },
  { id: 2, x: 360, y: 148, scale: 1.05, delay: 0.34 },
  { id: 3, x: 516, y: 136, scale: 0.88, delay: 0.62 },
  { id: 4, x: 252, y: 286, scale: 0.9, delay: 0.48 },
  { id: 5, x: 478, y: 286, scale: 0.96, delay: 0.86 },
]

const palette = computed<ThemePalette>(
  () => THEME_PALETTES[props.themeId || DEFAULT_THEME_ID] ?? THEME_PALETTES[DEFAULT_THEME_ID]!,
)
const activeAnchors = computed(() => ANCHOR_ORDER.filter((id) => props.slotIds.includes(id)).map((id) => ANCHOR_META[id]))
const interactiveAnchors = computed(() => (props.interactive ? activeAnchors.value : []))
const filledSet = computed(() => new Set(props.filledSlotIds))

const rootClasses = computed(() => ({
  'is-preview': props.preview,
  'is-finished': props.finished,
  'is-interactive': props.interactive && !props.disabled,
}))

function isPlaced(id: SlotId) {
  return filledSet.value.has(id)
}

function anchorClasses(id: SlotId) {
  return {
    'is-placed': isPlaced(id),
    'is-selected': props.selectedSlotId === id && !isPlaced(id),
    'is-hinted': props.hintedSlotId === id && !isPlaced(id),
    'is-finished': props.finished,
    'is-preview': props.preview,
  }
}

function hitClasses(id: SlotId) {
  return {
    'is-selected': props.selectedSlotId === id && !isPlaced(id),
    'is-hinted': props.hintedSlotId === id && !isPlaced(id),
  }
}

function buttonStyle(anchor: AnchorMeta) {
  return {
    left: `${(anchor.x / 720) * 100}%`,
    top: `${(anchor.y / 420) * 100}%`,
    width: `${(anchor.hitWidth / 720) * 100}%`,
    height: `${(anchor.hitHeight / 420) * 100}%`,
  }
}
</script>

<style scoped>
.set-table-stage-art {
  position: absolute;
  inset: 0;
}

.set-table-stage-art__svg {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.set-table-stage-art__table-top {
  fill: url(#setTableWood);
}

.set-table-stage-art__runner {
  fill: url(#setTableRunner);
  opacity: 0.92;
}

.set-table-stage-art__placemat {
  fill: url(#setTablePlacemat);
  opacity: 0.96;
}

.set-table-stage-art__anchor-shadow {
  fill: rgba(32, 47, 63, 0.14);
}

.set-table-stage-art__anchor-glow {
  opacity: 0;
  fill: rgba(255, 255, 255, 0.2);
  filter: url(#setTableSoftGlow);
  transition: opacity 0.2s ease, fill 0.2s ease;
}

.set-table-stage-art__anchor.is-selected .set-table-stage-art__anchor-glow {
  opacity: 0.88;
  fill: rgba(249, 115, 22, 0.26);
}

.set-table-stage-art__anchor.is-hinted .set-table-stage-art__anchor-glow {
  opacity: 1;
  fill: rgba(20, 184, 166, 0.3);
}

.set-table-stage-art__anchor.is-placed .set-table-stage-art__anchor-glow,
.set-table-stage-art.is-finished .set-table-stage-art__anchor-glow {
  opacity: 0.62;
  fill: rgba(52, 211, 153, 0.18);
}

.set-table-stage-art__anchor-ring {
  fill: rgba(255, 255, 255, 0.12);
  stroke: rgba(255, 255, 255, 0.66);
  stroke-dasharray: 10 10;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4;
  transition: opacity 0.2s ease, stroke 0.2s ease, fill 0.2s ease;
}

.set-table-stage-art__anchor.is-selected .set-table-stage-art__anchor-ring {
  stroke: rgba(249, 115, 22, 0.82);
  fill: rgba(249, 115, 22, 0.08);
}

.set-table-stage-art__anchor.is-hinted .set-table-stage-art__anchor-ring {
  stroke: rgba(15, 118, 110, 0.92);
  fill: rgba(45, 212, 191, 0.1);
}

.set-table-stage-art__ghost-asset {
  fill: none;
  stroke: rgba(255, 255, 255, 0.82);
  stroke-dasharray: 9 8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 5;
}

.set-table-stage-art__plate {
  fill: url(#setTablePlate);
}

.set-table-stage-art__plate-inner {
  fill: rgba(230, 236, 242, 0.94);
}

.set-table-stage-art__bowl {
  fill: url(#setTableBowl);
}

.set-table-stage-art__bowl-rim {
  fill: rgba(255, 255, 255, 0.8);
}

.set-table-stage-art__rice {
  fill: none;
  stroke: rgba(255, 255, 255, 0.92);
  stroke-linecap: round;
  stroke-width: 6;
}

.set-table-stage-art__spoon-bowl,
.set-table-stage-art__spoon-handle {
  fill: url(#setTableMetal);
}

.set-table-stage-art__spoon-shine {
  fill: none;
  stroke: rgba(255, 255, 255, 0.62);
  stroke-linecap: round;
  stroke-width: 5;
}

.set-table-stage-art__cup-body {
  fill: url(#setTableCup);
}

.set-table-stage-art__cup-fill {
  fill: url(#setTableTea);
}

.set-table-stage-art__cup-handle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.82);
  stroke-linecap: round;
  stroke-width: 8;
}

.set-table-stage-art__cup-highlight {
  fill: none;
  stroke: rgba(255, 255, 255, 0.64);
  stroke-linecap: round;
  stroke-width: 6;
}

.set-table-stage-art__chopstick {
  fill: url(#setTableChopsticks);
}

.set-table-stage-art__napkin {
  fill: url(#setTableNapkin);
}

.set-table-stage-art__napkin-fold {
  fill: none;
  stroke: rgba(255, 255, 255, 0.62);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4.5;
}

.set-table-stage-art__anchor-label {
  transition: opacity 0.2s ease;
}

.set-table-stage-art__anchor-label rect {
  fill: rgba(255, 255, 255, 0.84);
  stroke: rgba(255, 255, 255, 0.52);
  stroke-width: 1.5;
}

.set-table-stage-art__anchor-label text {
  fill: #36516c;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  dominant-baseline: middle;
  text-anchor: middle;
}

.set-table-stage-art__anchor.is-placed .set-table-stage-art__anchor-label {
  opacity: 0.76;
}

.set-table-stage-art__anchor-hit {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.set-table-stage-art__anchor-hit::after {
  content: '';
  position: absolute;
  inset: 16%;
  border-radius: inherit;
  box-shadow: 0 0 0 0 rgba(15, 118, 110, 0.18);
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.set-table-stage-art.is-interactive .set-table-stage-art__anchor-hit:hover::after,
.set-table-stage-art.is-interactive .set-table-stage-art__anchor-hit:focus-visible::after,
.set-table-stage-art__anchor-hit.is-hinted::after {
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.22);
  transform: scale(1.02);
}

.set-table-stage-art__anchor-hit.is-selected::after {
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
}

.set-table-stage-art__anchor-hit:disabled {
  cursor: default;
}

.set-table-stage-art__sparkles path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.96);
  stroke-linecap: round;
  stroke-width: 4;
  animation: set-table-sparkle 1.7s ease-in-out infinite;
}

.set-table-stage-art__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes set-table-sparkle {
  0%,
  100% {
    opacity: 0.38;
    transform: scale(0.94);
  }

  50% {
    opacity: 1;
    transform: scale(1.06);
  }
}
</style>
