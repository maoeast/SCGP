<template>
  <div class="set-table-asset-thumbnail">
    <svg
      class="set-table-asset-thumbnail__svg"
      viewBox="0 0 128 128"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="ids.backdrop" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.backdropStart" />
          <stop offset="100%" :stop-color="palette.backdropEnd" />
        </linearGradient>
        <linearGradient :id="ids.panel" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.panelStart" />
          <stop offset="100%" :stop-color="palette.panelEnd" />
        </linearGradient>
        <linearGradient :id="ids.plate" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#d9e6f1" />
        </linearGradient>
        <linearGradient :id="ids.bowl" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.bowlStart" />
          <stop offset="100%" :stop-color="palette.bowlEnd" />
        </linearGradient>
        <linearGradient :id="ids.metal" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.metalStart" />
          <stop offset="100%" :stop-color="palette.metalEnd" />
        </linearGradient>
        <linearGradient :id="ids.cup" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" :stop-color="palette.cupShellEnd" />
        </linearGradient>
        <linearGradient :id="ids.drink" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.drinkStart" />
          <stop offset="100%" :stop-color="palette.drinkEnd" />
        </linearGradient>
        <linearGradient :id="ids.wood" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.woodStart" />
          <stop offset="100%" :stop-color="palette.woodEnd" />
        </linearGradient>
        <linearGradient :id="ids.napkin" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" :stop-color="palette.napkinStart" />
          <stop offset="100%" :stop-color="palette.napkinEnd" />
        </linearGradient>
      </defs>

      <rect x="10" y="10" width="108" height="108" rx="30" :fill="`url(#${ids.backdrop})`" />
      <circle cx="30" cy="32" r="18" :fill="palette.glowSoft" opacity="0.7" />
      <circle cx="98" cy="34" r="16" :fill="palette.glowWarm" opacity="0.58" />
      <rect x="24" y="24" width="80" height="80" rx="24" :fill="`url(#${ids.panel})`" opacity="0.94" />

      <template v-if="variant === 'table'">
        <ellipse class="set-table-asset-thumbnail__shadow" cx="64" cy="92" rx="38" ry="10" />
        <rect x="22" y="28" width="84" height="72" rx="24" :fill="`url(#${ids.wood})`" />
        <rect x="28" y="34" width="72" height="60" rx="20" fill="rgba(255, 255, 255, 0.08)" />
        <ellipse cx="64" cy="66" rx="24" ry="18" fill="rgba(255, 255, 255, 0.18)" />

        <g transform="translate(64 66)">
          <ellipse cx="0" cy="8" rx="22" ry="14" :fill="`url(#${ids.plate})`" />
          <ellipse cx="0" cy="8" rx="15" ry="8" fill="rgba(230, 236, 242, 0.94)" />
          <path class="set-table-asset-thumbnail__outline-soft" d="M-14 6H14C13 18 8 26 0 27-8 26-13 18-14 6Z" :fill="`url(#${ids.bowl})`" />
          <ellipse cx="0" cy="6" rx="14" ry="4" fill="rgba(255, 255, 255, 0.82)" />
        </g>

        <g transform="translate(38 72) rotate(-18)">
          <ellipse cx="0" cy="-10" rx="7" ry="11" :fill="`url(#${ids.metal})`" />
          <rect x="-2.5" y="0" width="5" height="26" rx="2.5" :fill="`url(#${ids.metal})`" />
        </g>

        <g transform="translate(92 54) rotate(6)">
          <path d="M-9 -10H11L9 10C8 18 3 22 0 22c-3 0-8-4-9-12z" :fill="`url(#${ids.cup})`" />
          <path d="M-6 2H8L6 11C5 15 2 18 0 18c-2 0-5-3-6-7z" :fill="`url(#${ids.drink})`" />
          <path class="set-table-asset-thumbnail__cup-handle" d="M14 -2c5 0 9 4 9 9 0 6-4 10-10 10" />
        </g>

        <g transform="translate(92 76) rotate(14)">
          <rect x="-5" y="-20" width="3.5" height="40" rx="1.75" :fill="`url(#${ids.wood})`" />
          <rect x="2" y="-18" width="3.5" height="38" rx="1.75" :fill="`url(#${ids.wood})`" />
        </g>

        <g transform="translate(38 46) rotate(-10)">
          <path d="M-10 -8H10V10H-10z" :fill="`url(#${ids.napkin})`" />
          <path class="set-table-asset-thumbnail__napkin-fold" d="M-10 -8L10 10" />
        </g>
      </template>

      <template v-else-if="normalizedSlotId === 'bowl'">
        <ellipse class="set-table-asset-thumbnail__shadow" cx="64" cy="88" rx="38" ry="10" />
        <ellipse cx="64" cy="72" rx="38" ry="22" :fill="`url(#${ids.plate})`" />
        <ellipse cx="64" cy="72" rx="27" ry="15" fill="rgba(230, 236, 242, 0.94)" />
        <path class="set-table-asset-thumbnail__outline-soft" d="M36 66H92C88 84 78 96 64 98 50 96 40 84 36 66Z" :fill="`url(#${ids.bowl})`" />
        <ellipse cx="64" cy="66" rx="28" ry="8" fill="rgba(255, 255, 255, 0.84)" />
        <path class="set-table-asset-thumbnail__rice" d="M50 64c4-5 9-8 14-8 5 0 10 3 14 8" />
      </template>

      <template v-else-if="normalizedSlotId === 'spoon'">
        <ellipse class="set-table-asset-thumbnail__shadow" cx="58" cy="84" rx="16" ry="30" transform="rotate(-18 58 84)" />
        <g transform="translate(64 66) rotate(-16)">
          <ellipse cx="0" cy="-18" rx="16" ry="22" :fill="`url(#${ids.metal})`" />
          <rect x="-5" y="0" width="10" height="52" rx="5" :fill="`url(#${ids.metal})`" />
          <path class="set-table-asset-thumbnail__shine" d="M-4 -10c3-6 8-9 12-10" />
        </g>
      </template>

      <template v-else-if="normalizedSlotId === 'cup'">
        <ellipse class="set-table-asset-thumbnail__shadow" cx="66" cy="88" rx="22" ry="8" />
        <g transform="translate(64 60) rotate(6)">
          <path d="M-18 -24H20L16 20C13 34 6 42 0 42c-6 0-13-8-16-22z" :fill="`url(#${ids.cup})`" />
          <path d="M-12 2H14L11 22C9 29 4 34 0 35c-4-1-9-6-11-13z" :fill="`url(#${ids.drink})`" />
          <path class="set-table-asset-thumbnail__cup-handle" d="M24 -8c10 0 18 8 18 18 0 12-8 20-20 20" />
          <path class="set-table-asset-thumbnail__shine" d="M-6 -10v28" />
        </g>
      </template>

      <template v-else-if="normalizedSlotId === 'chopsticks'">
        <ellipse class="set-table-asset-thumbnail__shadow" cx="68" cy="82" rx="12" ry="32" transform="rotate(18 68 82)" />
        <g transform="translate(64 64) rotate(18)">
          <rect x="-14" y="-34" width="6" height="70" rx="3" :fill="`url(#${ids.wood})`" />
          <rect x="4" y="-30" width="6" height="66" rx="3" :fill="`url(#${ids.wood})`" />
        </g>
      </template>

      <template v-else>
        <ellipse class="set-table-asset-thumbnail__shadow" cx="64" cy="84" rx="28" ry="9" />
        <g transform="translate(64 64) rotate(-10)">
          <path d="M-26 -24H26V26H-26z" :fill="`url(#${ids.napkin})`" />
          <path class="set-table-asset-thumbnail__napkin-fold" d="M-26 -24L26 26" />
          <path class="set-table-asset-thumbnail__napkin-fold" d="M0 -24L26 -2" />
        </g>
      </template>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

type SlotId = 'bowl' | 'spoon' | 'cup' | 'chopsticks' | 'napkin'

interface ThumbnailPalette {
  backdropStart: string
  backdropEnd: string
  panelStart: string
  panelEnd: string
  glowSoft: string
  glowWarm: string
  bowlStart: string
  bowlEnd: string
  metalStart: string
  metalEnd: string
  cupShellEnd: string
  drinkStart: string
  drinkEnd: string
  woodStart: string
  woodEnd: string
  napkinStart: string
  napkinEnd: string
}

const DEFAULT_THEME_ID = 'family-dinner'

const SLOT_IDS: ReadonlyArray<SlotId> = ['bowl', 'spoon', 'cup', 'chopsticks', 'napkin']

const THEME_PALETTES: Record<string, ThumbnailPalette> = {
  'family-dinner': {
    backdropStart: '#fff1db',
    backdropEnd: '#dff1ea',
    panelStart: 'rgba(255, 255, 255, 0.98)',
    panelEnd: 'rgba(255, 241, 228, 0.92)',
    glowSoft: 'rgba(255, 209, 161, 0.72)',
    glowWarm: 'rgba(244, 174, 138, 0.56)',
    bowlStart: '#fff8ef',
    bowlEnd: '#f1d7bf',
    metalStart: '#fbfdff',
    metalEnd: '#b5c7da',
    cupShellEnd: '#f4eadb',
    drinkStart: '#ffd28b',
    drinkEnd: '#f59e0b',
    woodStart: '#9d6743',
    woodEnd: '#6d4128',
    napkinStart: '#ffffff',
    napkinEnd: '#ffd5df',
  },
  breakfast: {
    backdropStart: '#fff6d8',
    backdropEnd: '#dff4ec',
    panelStart: 'rgba(255, 255, 255, 0.98)',
    panelEnd: 'rgba(255, 245, 222, 0.92)',
    glowSoft: 'rgba(255, 220, 136, 0.74)',
    glowWarm: 'rgba(255, 196, 125, 0.56)',
    bowlStart: '#fff9ef',
    bowlEnd: '#f3dcc0',
    metalStart: '#fbfdff',
    metalEnd: '#bccdde',
    cupShellEnd: '#eaf5f0',
    drinkStart: '#fde68a',
    drinkEnd: '#f59e0b',
    woodStart: '#95663f',
    woodEnd: '#6f4a2c',
    napkinStart: '#ffffff',
    napkinEnd: '#ffe7a8',
  },
  guest: {
    backdropStart: '#fff2f8',
    backdropEnd: '#e5f4f3',
    panelStart: 'rgba(255, 255, 255, 0.98)',
    panelEnd: 'rgba(252, 241, 249, 0.92)',
    glowSoft: 'rgba(232, 191, 255, 0.62)',
    glowWarm: 'rgba(255, 188, 208, 0.54)',
    bowlStart: '#fff8ef',
    bowlEnd: '#f0d7d7',
    metalStart: '#fbfdff',
    metalEnd: '#c0cbde',
    cupShellEnd: '#f4efff',
    drinkStart: '#fcd5ce',
    drinkEnd: '#f29a74',
    woodStart: '#9d6c52',
    woodEnd: '#6f4637',
    napkinStart: '#ffffff',
    napkinEnd: '#ecc9dd',
  },
}

const props = withDefaults(defineProps<{
  slotId?: string
  themeId?: string | null
  variant?: 'slot' | 'table'
}>(), {
  slotId: 'bowl',
  themeId: DEFAULT_THEME_ID,
  variant: 'slot',
})

const uid = getCurrentInstance()?.uid ?? 0
const ids = {
  backdrop: `set-table-asset-backdrop-${uid}`,
  panel: `set-table-asset-panel-${uid}`,
  plate: `set-table-asset-plate-${uid}`,
  bowl: `set-table-asset-bowl-${uid}`,
  metal: `set-table-asset-metal-${uid}`,
  cup: `set-table-asset-cup-${uid}`,
  drink: `set-table-asset-drink-${uid}`,
  wood: `set-table-asset-wood-${uid}`,
  napkin: `set-table-asset-napkin-${uid}`,
}

const palette = computed<ThumbnailPalette>(
  () => THEME_PALETTES[props.themeId || DEFAULT_THEME_ID] ?? THEME_PALETTES[DEFAULT_THEME_ID]!,
)

const normalizedSlotId = computed<SlotId>(() => (
  SLOT_IDS.includes(props.slotId as SlotId) ? (props.slotId as SlotId) : 'bowl'
))
</script>

<style scoped>
.set-table-asset-thumbnail {
  width: 100%;
  height: 100%;
  border-radius: 28px;
  overflow: hidden;
}

.set-table-asset-thumbnail__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.set-table-asset-thumbnail__shadow {
  fill: rgba(38, 54, 73, 0.14);
}

.set-table-asset-thumbnail__outline-soft {
  stroke: rgba(255, 255, 255, 0.42);
  stroke-width: 2;
}

.set-table-asset-thumbnail__rice {
  fill: none;
  stroke: rgba(255, 255, 255, 0.94);
  stroke-linecap: round;
  stroke-width: 4.5;
}

.set-table-asset-thumbnail__shine {
  fill: none;
  stroke: rgba(255, 255, 255, 0.68);
  stroke-linecap: round;
  stroke-width: 4;
}

.set-table-asset-thumbnail__cup-handle {
  fill: none;
  stroke: rgba(255, 255, 255, 0.82);
  stroke-linecap: round;
  stroke-width: 6;
}

.set-table-asset-thumbnail__napkin-fold {
  fill: none;
  stroke: rgba(255, 255, 255, 0.68);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3.5;
}
</style>
