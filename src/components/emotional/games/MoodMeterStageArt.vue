<template>
  <div class="mood-meter-stage-art" :class="rootClasses">
    <svg
      class="mood-meter-stage-art__svg"
      viewBox="0 0 720 520"
      role="img"
      aria-label="情绪角色、温度计和安抚卡组成的情绪温度计舞台"
    >
      <defs>
        <linearGradient id="moodMeterBackdrop" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#f7fbff" />
          <stop offset="52%" stop-color="#fdf2f8" />
          <stop offset="100%" stop-color="#fff6db" />
        </linearGradient>
        <linearGradient id="moodMeterPanel" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.96)" />
          <stop offset="100%" stop-color="rgba(230, 241, 255, 0.82)" />
        </linearGradient>
        <linearGradient id="moodMeterSkin" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffd8bc" />
          <stop offset="48%" stop-color="#f5bf95" />
          <stop offset="100%" stop-color="#dc9568" />
        </linearGradient>
        <linearGradient id="moodMeterHair" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#7a5846" />
          <stop offset="100%" stop-color="#503226" />
        </linearGradient>
        <linearGradient id="moodMeterPants" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#9fb7d9" />
          <stop offset="100%" stop-color="#5f7391" />
        </linearGradient>
        <linearGradient id="moodMeterShoes" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#5b6b80" />
          <stop offset="100%" stop-color="#344256" />
        </linearGradient>
        <linearGradient id="moodMeterCalmShirt" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#67e8f9" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
        <linearGradient id="moodMeterShyShirt" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#d8b4fe" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
        <linearGradient id="moodMeterSadShirt" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#93c5fd" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
        <linearGradient id="moodMeterAngryShirt" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#fda4af" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
        <linearGradient id="moodMeterOverwhelmedShirt" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#fdba74" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>
        <linearGradient id="moodMeterThermoShell" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#d7e7f6" />
        </linearGradient>
        <filter id="moodMeterSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect x="18" y="18" width="684" height="484" rx="42" fill="url(#moodMeterBackdrop)" />
      <circle cx="118" cy="98" r="84" :fill="activeMood.auraSoft" opacity="0.82" />
      <circle cx="646" cy="96" r="72" :fill="activeZone.softFill" opacity="0.62" />
      <circle cx="620" cy="448" r="108" fill="rgba(255, 255, 255, 0.42)" />

      <rect x="44" y="42" width="632" height="64" rx="28" fill="rgba(255,255,255,0.76)" />
      <g class="mood-meter-stage-art__banner">
        <g transform="translate(60 54)">
          <rect width="170" height="40" rx="20" fill="rgba(255,255,255,0.92)" />
          <text x="18" y="17" class="mood-meter-stage-art__banner-kicker">当前心情</text>
          <text x="18" y="31" class="mood-meter-stage-art__banner-value">{{ activeMood.label }}</text>
        </g>
        <g transform="translate(246 54)">
          <rect width="180" height="40" rx="20" fill="rgba(255,255,255,0.92)" />
          <text x="18" y="17" class="mood-meter-stage-art__banner-kicker">温度区间</text>
          <text x="18" y="31" class="mood-meter-stage-art__banner-value">{{ activeZone.label }}</text>
        </g>
        <g transform="translate(442 54)">
          <rect width="214" height="40" rx="20" fill="rgba(255,255,255,0.92)" />
          <text x="18" y="17" class="mood-meter-stage-art__banner-kicker">
            {{ supportBannerKicker }}
          </text>
          <text x="18" y="31" class="mood-meter-stage-art__banner-value">{{ supportBannerLabel }}</text>
        </g>
      </g>

      <ellipse class="mood-meter-stage-art__focus mood-meter-stage-art__focus--character" cx="188" cy="292" rx="154" ry="162" />
      <ellipse class="mood-meter-stage-art__focus mood-meter-stage-art__focus--thermometer" cx="432" cy="210" rx="104" ry="116" />
      <ellipse class="mood-meter-stage-art__focus mood-meter-stage-art__focus--support" cx="506" cy="396" rx="186" ry="116" />
      <ellipse class="mood-meter-stage-art__focus mood-meter-stage-art__focus--summary" cx="360" cy="270" rx="286" ry="192" />

      <rect x="52" y="126" width="272" height="328" rx="34" fill="url(#moodMeterPanel)" />
      <path
        d="M84 158c24-18 50-26 82-26s58 8 84 28v56H84z"
        fill="rgba(255,255,255,0.72)"
      />
      <path class="mood-meter-stage-art__mood-line" :d="activeMood.wavePath" :stroke="activeMood.waveStroke" />
      <g class="mood-meter-stage-art__mood-dots">
        <circle cx="110" cy="210" r="8" :fill="activeMood.dotColor" />
        <circle cx="242" cy="186" r="6" :fill="activeMood.dotColor" />
        <circle cx="264" cy="246" r="10" :fill="activeMood.dotColor" />
      </g>
      <g class="mood-meter-stage-art__speech" transform="translate(92 146)">
        <rect width="190" height="72" rx="24" fill="rgba(255,255,255,0.92)" />
        <path d="M54 72l18 18 10-18" fill="rgba(255,255,255,0.92)" />
        <text x="20" y="29" class="mood-meter-stage-art__speech-title">{{ activeMood.label }}</text>
        <text x="20" y="51" class="mood-meter-stage-art__speech-copy">{{ activeMood.helperLine }}</text>
      </g>

      <g class="mood-meter-stage-art__character">
        <ellipse cx="188" cy="438" rx="92" ry="18" fill="rgba(43, 58, 73, 0.12)" />
        <circle cx="188" cy="188" r="58" fill="url(#moodMeterSkin)" />
        <path
          d="M132 176c0-46 30-80 74-80s76 32 82 78c-20-12-40-18-72-18-36 0-60 8-84 20z"
          fill="url(#moodMeterHair)"
        />
        <path d="M142 168c6-26 20-44 48-56" fill="none" stroke="rgba(255,255,255,0.18)" stroke-linecap="round" stroke-width="8" />
        <path :d="activeMood.browLeft" class="mood-meter-stage-art__face-line" />
        <path :d="activeMood.browRight" class="mood-meter-stage-art__face-line" />

        <g v-if="activeMood.id === 'overwhelmed'" class="mood-meter-stage-art__face-line">
          <circle cx="168" cy="188" r="6" fill="#473327" />
          <path d="M206 184c-6 4-10 10-10 16 0 5 3 10 8 12 7 2 16-4 16-12 0-6-6-12-14-16z" fill="none" />
        </g>
        <g v-else class="mood-meter-stage-art__face-line">
          <path :d="activeMood.eyeLeft" />
          <path :d="activeMood.eyeRight" />
        </g>

        <path :d="activeMood.mouth" class="mood-meter-stage-art__mouth-line" />
        <ellipse cx="150" cy="210" rx="10" ry="6" fill="rgba(245, 146, 158, 0.24)" />
        <ellipse cx="226" cy="210" rx="10" ry="6" fill="rgba(245, 146, 158, 0.24)" />

        <rect x="176" y="232" width="24" height="26" rx="10" fill="url(#moodMeterSkin)" />
        <path
          d="M126 270c12-34 38-50 62-50 36 0 62 16 74 50l20 104h-188z"
          :fill="activeMood.shirtFill"
        />
        <path d="M126 268c-20 26-30 56-30 92" fill="none" stroke="url(#moodMeterSkin)" stroke-linecap="round" stroke-width="22" />
        <path d="M250 268c20 26 30 56 30 92" fill="none" stroke="url(#moodMeterSkin)" stroke-linecap="round" stroke-width="22" />
        <path d="M120 326c28 16 74 18 134 6" fill="none" stroke="rgba(255,255,255,0.28)" stroke-linecap="round" stroke-width="8" />
        <path d="M158 376l-20 70h-44l18-90z" fill="url(#moodMeterPants)" />
        <path d="M218 376l18 70h46l-18-90z" fill="url(#moodMeterPants)" />
        <path d="M118 442h54v16h-72c0-10 8-16 18-16z" fill="url(#moodMeterShoes)" />
        <path d="M206 442h54c10 0 18 6 18 16h-72z" fill="url(#moodMeterShoes)" />

        <g class="mood-meter-stage-art__badge">
          <circle cx="188" cy="320" r="38" :fill="activeMood.badgeFill" />
          <path :d="activeMood.badgePath" fill="none" stroke="rgba(255,255,255,0.92)" stroke-linecap="round" stroke-linejoin="round" stroke-width="8" />
        </g>
      </g>

      <g class="mood-meter-stage-art__thermometer-panel">
        <rect x="348" y="126" width="154" height="182" rx="34" fill="url(#moodMeterPanel)" />
        <text x="376" y="154" class="mood-meter-stage-art__panel-kicker">温度计</text>
        <text x="376" y="176" class="mood-meter-stage-art__panel-copy">{{ activeZone.shortHint }}</text>
        <rect x="392" y="188" width="38" height="86" rx="19" fill="url(#moodMeterThermoShell)" />
        <circle cx="411" cy="288" r="29" fill="url(#moodMeterThermoShell)" />
        <rect x="398" :y="mercuryFillY" width="26" :height="mercuryFillHeight" rx="13" :fill="activeZone.fill" />
        <circle cx="411" cy="288" r="20" :fill="activeZone.fill" />
        <g class="mood-meter-stage-art__thermometer-zones">
          <g
            v-for="segment in zoneSegments"
            :key="segment.id"
            class="mood-meter-stage-art__thermo-zone"
            :class="{ 'is-active': segment.id === activeZone.id }"
          >
            <rect
              x="446"
              :y="segment.y"
              width="28"
              :height="segment.height"
              rx="14"
              :fill="segment.fill"
            />
          </g>
        </g>
        <g class="mood-meter-stage-art__thermo-marker" :transform="`translate(486 ${thermometerMarkerY})`">
          <path d="M0 0l16-10v20z" :fill="activeZone.fill" />
        </g>
      </g>

      <g class="mood-meter-stage-art__support-panel">
        <rect x="336" y="318" width="334" height="176" rx="32" fill="url(#moodMeterPanel)" />
        <text x="364" y="346" class="mood-meter-stage-art__panel-kicker">安抚卡</text>
        <text x="364" y="368" class="mood-meter-stage-art__panel-copy">选一张最想马上试试的卡</text>

        <g
          v-for="(support, index) in displaySupports"
          :key="support.id"
          class="mood-meter-stage-art__support-card"
          :class="supportCardClasses(support.id)"
          :transform="`translate(${supportSlotAt(index).x} ${supportSlotAt(index).y})`"
        >
          <rect class="mood-meter-stage-art__support-shell" width="142" height="54" rx="20" />
          <circle class="mood-meter-stage-art__support-halo" cx="28" cy="27" r="20" :fill="support.accentSoft" />
          <g class="mood-meter-stage-art__support-icon" :fill="support.accent" :stroke="support.accent">
            <template v-if="support.id === 'slow-breath'">
              <path d="M16 30c8-10 16-14 26-12 8 2 12 8 18 8" fill="none" stroke-linecap="round" stroke-width="5" />
              <path d="M18 20c6-6 14-8 22-4" fill="none" stroke-linecap="round" stroke-width="4" />
            </template>
            <template v-else-if="support.id === 'quiet-corner'">
              <path d="M14 34h18v-6H20v-14h-6z" fill="none" stroke-linejoin="round" stroke-width="5" />
              <path d="M40 38c0-10 6-18 14-24 6 4 10 10 10 18 0 8-6 12-12 12-6 0-12-2-12-6z" fill="none" stroke-linejoin="round" stroke-width="4" />
            </template>
            <template v-else-if="support.id === 'hug-pillow'">
              <rect x="14" y="15" width="28" height="24" rx="10" fill="none" stroke-width="5" />
              <path d="M48 24c0-4 4-8 8-8 6 0 10 6 10 10 0 8-8 12-18 18-10-6-18-10-18-18 0-4 4-10 10-10 4 0 8 4 8 8z" stroke="none" />
            </template>
            <template v-else-if="support.id === 'count-down'">
              <path d="M16 16h22v24H26v-12" fill="none" stroke-linejoin="round" stroke-width="5" />
              <text x="44" y="38" class="mood-meter-stage-art__support-number" :fill="support.accent">5</text>
            </template>
            <template v-else-if="support.id === 'soft-music'">
              <path d="M22 16v22c0 6-4 10-10 10-4 0-8-3-8-7 0-6 6-10 14-10 2 0 4 0 4 1V20l28-6v20c0 6-4 10-10 10-4 0-8-3-8-7 0-6 6-10 14-10 2 0 4 0 4 1V14z" fill="none" stroke-linejoin="round" stroke-width="4" />
            </template>
            <template v-else-if="support.id === 'squeeze-ball'">
              <path d="M20 20c10-8 26-8 34 0 8 8 8 20 0 28-8 8-24 8-34 0-8-8-8-20 0-28z" fill="none" stroke-width="5" />
              <circle cx="30" cy="30" r="4" stroke="none" />
              <circle cx="44" cy="24" r="4" stroke="none" />
              <circle cx="48" cy="36" r="4" stroke="none" />
            </template>
            <template v-else-if="support.id === 'ask-help'">
              <path d="M18 42V20c0-4 2-8 6-8s6 4 6 8v10" fill="none" stroke-linecap="round" stroke-width="5" />
              <path d="M30 30V18c0-4 2-8 6-8s6 4 6 8v12" fill="none" stroke-linecap="round" stroke-width="5" />
              <path d="M42 30V20c0-4 2-8 6-8s6 4 6 8v18" fill="none" stroke-linecap="round" stroke-width="5" />
              <path d="M54 26c2-3 6-5 10-5 4 0 8 4 8 8v4c0 8-6 14-14 14H34" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="5" />
            </template>
            <template v-else>
              <path d="M16 34c8-8 10-18 10-24M62 34c-8-8-10-18-10-24" fill="none" stroke-linecap="round" stroke-width="5" />
              <path d="M26 22l10 6M52 22l-10 6" fill="none" stroke-linecap="round" stroke-width="5" />
              <circle cx="38" cy="28" r="8" fill="none" stroke-width="4" />
            </template>
          </g>
          <text x="56" y="31" class="mood-meter-stage-art__support-label">{{ support.shortLabel }}</text>
        </g>
      </g>

      <g v-if="finished" class="mood-meter-stage-art__sparkles">
        <g v-for="sparkle in sparkles" :key="sparkle.id" :transform="`translate(${sparkle.x} ${sparkle.y})`">
          <path d="M0 -14v28M-14 0h28M-8 -8l16 16M8 -8l-16 16" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MoodId = 'calm' | 'shy' | 'sad' | 'angry' | 'overwhelmed'
type ZoneId = 'cool' | 'steady' | 'calm-warm' | 'warm' | 'alert' | 'hot'
type SupportId =
  | 'slow-breath'
  | 'quiet-corner'
  | 'hug-pillow'
  | 'count-down'
  | 'soft-music'
  | 'squeeze-ball'
  | 'ask-help'
  | 'stretch'
type FocusArea = 'character' | 'thermometer' | 'support' | 'summary' | null

interface MoodMeta {
  id: MoodId
  label: string
  helperLine: string
  shirtFill: string
  auraSoft: string
  waveStroke: string
  wavePath: string
  dotColor: string
  browLeft: string
  browRight: string
  eyeLeft: string
  eyeRight: string
  mouth: string
  badgeFill: string
  badgePath: string
}

interface ZoneMeta {
  id: ZoneId
  label: string
  shortHint: string
  fill: string
  softFill: string
}

interface SupportMeta {
  id: SupportId
  shortLabel: string
  accent: string
  accentSoft: string
}

interface SupportSlot {
  x: number
  y: number
}

interface SparklePoint {
  id: number
  x: number
  y: number
}

const props = withDefaults(defineProps<{
  moodId?: string | null
  zoneId?: string | null
  thermometerZoneIds?: string[]
  supportIds?: string[]
  selectedSupportId?: string | null
  preview?: boolean
  finished?: boolean
  focusArea?: FocusArea
}>(), {
  moodId: null,
  zoneId: null,
  thermometerZoneIds: () => [],
  supportIds: () => [],
  selectedSupportId: null,
  preview: false,
  finished: false,
  focusArea: null,
})

const moodMetaMap: Record<MoodId, MoodMeta> = {
  calm: {
    id: 'calm',
    label: '平静',
    helperLine: '身体慢慢放松下来。',
    shirtFill: 'url(#moodMeterCalmShirt)',
    auraSoft: 'rgba(123, 211, 252, 0.38)',
    waveStroke: 'rgba(56, 189, 248, 0.86)',
    wavePath: 'M84 246c28-20 64-24 102-12 30 10 56 12 86 2',
    dotColor: 'rgba(96, 165, 250, 0.84)',
    browLeft: 'M154 166c8-4 16-4 24 0',
    browRight: 'M198 166c8-4 16-4 24 0',
    eyeLeft: 'M158 188c6-4 12-4 18 0',
    eyeRight: 'M202 188c6-4 12-4 18 0',
    mouth: 'M166 214c8 10 18 14 32 14 12 0 22-4 30-12',
    badgeFill: '#38bdf8',
    badgePath: 'M172 322c10-8 24-8 32 0',
  },
  shy: {
    id: 'shy',
    label: '有点紧张',
    helperLine: '先慢一点也没关系。',
    shirtFill: 'url(#moodMeterShyShirt)',
    auraSoft: 'rgba(192, 132, 252, 0.28)',
    waveStroke: 'rgba(168, 85, 247, 0.82)',
    wavePath: 'M84 256c24-18 52-26 82-24 26 2 50 12 82 18',
    dotColor: 'rgba(168, 85, 247, 0.8)',
    browLeft: 'M154 170c8-8 16-10 24-6',
    browRight: 'M198 164c8-6 16-4 24 4',
    eyeLeft: 'M158 190c6 2 12 2 18 0',
    eyeRight: 'M202 190c6 2 12 2 18 0',
    mouth: 'M170 220c8-6 16-8 24-8 10 0 18 2 28 8',
    badgeFill: '#a78bfa',
    badgePath: 'M176 312l10 10 16-18',
  },
  sad: {
    id: 'sad',
    label: '难过',
    helperLine: '想先被安慰一下。',
    shirtFill: 'url(#moodMeterSadShirt)',
    auraSoft: 'rgba(96, 165, 250, 0.28)',
    waveStroke: 'rgba(59, 130, 246, 0.8)',
    wavePath: 'M84 262c20-12 42-16 66-10 16 4 30 12 48 14 20 2 38-2 58-12',
    dotColor: 'rgba(96, 165, 250, 0.8)',
    browLeft: 'M154 172c8-2 16-6 24-10',
    browRight: 'M198 162c8 4 16 8 24 10',
    eyeLeft: 'M158 190c6 3 12 3 18 0',
    eyeRight: 'M202 190c6 3 12 3 18 0',
    mouth: 'M168 226c10-10 24-14 42-14 8 0 16 2 22 4',
    badgeFill: '#60a5fa',
    badgePath: 'M168 324c8-10 16-14 22-14 8 0 14 6 14 14 0 10-8 14-16 22-10-8-20-12-20-22z',
  },
  angry: {
    id: 'angry',
    label: '生气',
    helperLine: '先把身体稳一稳。',
    shirtFill: 'url(#moodMeterAngryShirt)',
    auraSoft: 'rgba(248, 113, 113, 0.34)',
    waveStroke: 'rgba(239, 68, 68, 0.82)',
    wavePath: 'M86 254c22-12 46-10 68 2 18 10 38 12 62 6 12-2 26-8 42-18',
    dotColor: 'rgba(239, 68, 68, 0.8)',
    browLeft: 'M150 170c10-8 18-14 30-16',
    browRight: 'M198 154c12 2 20 8 30 16',
    eyeLeft: 'M158 188h18',
    eyeRight: 'M202 188h18',
    mouth: 'M168 224c12-6 24-10 38-10 10 0 20 2 28 6',
    badgeFill: '#ef4444',
    badgePath: 'M172 314l12 12M196 314l-12 12',
  },
  overwhelmed: {
    id: 'overwhelmed',
    label: '很乱很满',
    helperLine: '先停一下，慢慢收回来。',
    shirtFill: 'url(#moodMeterOverwhelmedShirt)',
    auraSoft: 'rgba(251, 146, 60, 0.3)',
    waveStroke: 'rgba(249, 115, 22, 0.82)',
    wavePath: 'M86 252c18-18 38-28 58-28 24 0 42 12 62 26 16 12 32 20 54 22',
    dotColor: 'rgba(249, 115, 22, 0.82)',
    browLeft: 'M152 166c10-6 18-8 28-6',
    browRight: 'M198 164c10-4 18-2 28 4',
    eyeLeft: 'M0 0',
    eyeRight: 'M0 0',
    mouth: 'M168 228c8-10 18-14 30-14 12 0 22 4 30 12',
    badgeFill: '#f97316',
    badgePath: 'M170 316c8-6 18-8 28-8 8 0 16 2 24 8',
  },
}

const zoneMetaMap: Record<ZoneId, ZoneMeta> = {
  cool: {
    id: 'cool',
    label: '凉凉的，很平静',
    shortHint: '身体比较放松',
    fill: '#60a5fa',
    softFill: 'rgba(96, 165, 250, 0.24)',
  },
  steady: {
    id: 'steady',
    label: '暖暖的，还能稳住',
    shortHint: '还在舒服范围里',
    fill: '#34d399',
    softFill: 'rgba(52, 211, 153, 0.24)',
  },
  'calm-warm': {
    id: 'calm-warm',
    label: '有点热，需要提醒',
    shortHint: '先停一下更舒服',
    fill: '#fbbf24',
    softFill: 'rgba(251, 191, 36, 0.24)',
  },
  warm: {
    id: 'warm',
    label: '热热的，需要帮忙',
    shortHint: '已经开始不舒服了',
    fill: '#fb923c',
    softFill: 'rgba(251, 146, 60, 0.24)',
  },
  alert: {
    id: 'alert',
    label: '快要满出来了',
    shortHint: '先找老师或工具',
    fill: '#f43f5e',
    softFill: 'rgba(244, 63, 94, 0.24)',
  },
  hot: {
    id: 'hot',
    label: '很烫，要马上安抚',
    shortHint: '现在最需要帮忙',
    fill: '#dc2626',
    softFill: 'rgba(220, 38, 38, 0.22)',
  },
}

const supportMetaMap: Record<SupportId, SupportMeta> = {
  'slow-breath': {
    id: 'slow-breath',
    shortLabel: '慢呼吸',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.18)',
  },
  'quiet-corner': {
    id: 'quiet-corner',
    shortLabel: '安静角',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.18)',
  },
  'hug-pillow': {
    id: 'hug-pillow',
    shortLabel: '抱抱枕',
    accent: '#ec4899',
    accentSoft: 'rgba(236, 72, 153, 0.18)',
  },
  'count-down': {
    id: 'count-down',
    shortLabel: '数到5',
    accent: '#8b5cf6',
    accentSoft: 'rgba(139, 92, 246, 0.18)',
  },
  'soft-music': {
    id: 'soft-music',
    shortLabel: '轻音乐',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.18)',
  },
  'squeeze-ball': {
    id: 'squeeze-ball',
    shortLabel: '解压球',
    accent: '#14b8a6',
    accentSoft: 'rgba(20, 184, 166, 0.18)',
  },
  'ask-help': {
    id: 'ask-help',
    shortLabel: '说帮忙',
    accent: '#fb7185',
    accentSoft: 'rgba(251, 113, 133, 0.18)',
  },
  stretch: {
    id: 'stretch',
    shortLabel: '伸展',
    accent: '#6366f1',
    accentSoft: 'rgba(99, 102, 241, 0.18)',
  },
}

const fallbackSupportIdsByMood: Record<MoodId, SupportId[]> = {
  calm: ['slow-breath', 'stretch', 'quiet-corner', 'soft-music'],
  shy: ['count-down', 'quiet-corner', 'hug-pillow', 'slow-breath'],
  sad: ['hug-pillow', 'soft-music', 'ask-help', 'slow-breath'],
  angry: ['slow-breath', 'squeeze-ball', 'ask-help', 'stretch'],
  overwhelmed: ['quiet-corner', 'count-down', 'soft-music', 'hug-pillow'],
}

const fallbackZoneByMood: Record<MoodId, ZoneId> = {
  calm: 'cool',
  shy: 'calm-warm',
  sad: 'steady',
  angry: 'hot',
  overwhelmed: 'alert',
}

const supportSlots: ReadonlyArray<SupportSlot> = [
  { x: 358, y: 382 },
  { x: 512, y: 382 },
  { x: 358, y: 440 },
  { x: 512, y: 440 },
]

const sparkles: ReadonlyArray<SparklePoint> = [
  { id: 1, x: 118, y: 114 },
  { id: 2, x: 612, y: 110 },
  { id: 3, x: 290, y: 426 },
  { id: 4, x: 608, y: 454 },
]

function isMoodId(value: string | null | undefined): value is MoodId {
  return Boolean(value && value in moodMetaMap)
}

function isZoneId(value: string | null | undefined): value is ZoneId {
  return Boolean(value && value in zoneMetaMap)
}

function isSupportId(value: string | null | undefined): value is SupportId {
  return Boolean(value && value in supportMetaMap)
}

const activeMood = computed<MoodMeta>(() => {
  if (isMoodId(props.moodId)) {
    return moodMetaMap[props.moodId]
  }

  return moodMetaMap.calm
})

const displayZones = computed<ZoneMeta[]>(() => {
  const fallback: ZoneId[] = ['cool', 'steady', 'calm-warm', 'warm', 'hot']
  const source = props.thermometerZoneIds.length ? props.thermometerZoneIds : fallback

  return source
    .map((zoneId) => (isZoneId(zoneId) ? zoneMetaMap[zoneId] : null))
    .filter((zone): zone is ZoneMeta => zone !== null)
})

const resolvedZoneId = computed<ZoneId>(() => {
  if (isZoneId(props.zoneId) && displayZones.value.some((zone) => zone.id === props.zoneId)) {
    return props.zoneId
  }

  const moodZone = fallbackZoneByMood[activeMood.value.id]
  if (displayZones.value.some((zone) => zone.id === moodZone)) {
    return moodZone
  }

  return displayZones.value[displayZones.value.length - 1]?.id || 'cool'
})

const activeZone = computed<ZoneMeta>(() => zoneMetaMap[resolvedZoneId.value])

const zoneSegments = computed(() => {
  const segmentTop = 192
  const segmentTrackHeight = 78
  const segmentGap = 6
  const count = displayZones.value.length || 1
  const segmentHeight = (segmentTrackHeight - segmentGap * (count - 1)) / count

  return displayZones.value.map((zone, index) => ({
    ...zone,
    y: segmentTop + index * (segmentHeight + segmentGap),
    height: segmentHeight,
  }))
})

const activeZoneIndex = computed(() => zoneSegments.value.findIndex((segment) => segment.id === activeZone.value.id))
const activeSegment = computed(() => zoneSegments.value[activeZoneIndex.value] || null)

const mercuryFillHeight = computed(() => {
  if (!activeSegment.value) {
    return 22
  }

  return 274 - activeSegment.value.y + activeSegment.value.height
})

const mercuryFillY = computed(() => 274 - mercuryFillHeight.value)
const thermometerMarkerY = computed(() => {
  if (!activeSegment.value) {
    return 232
  }

  return activeSegment.value.y + activeSegment.value.height / 2
})

const displaySupports = computed<SupportMeta[]>(() => {
  const sourceIds = props.supportIds.length ? props.supportIds : fallbackSupportIdsByMood[activeMood.value.id]

  return sourceIds
    .map((supportId) => (isSupportId(supportId) ? supportMetaMap[supportId] : null))
    .filter((support): support is SupportMeta => support !== null)
    .slice(0, 4)
})

const selectedSupport = computed<SupportMeta | null>(() => {
  if (isSupportId(props.selectedSupportId)) {
    return supportMetaMap[props.selectedSupportId]
  }

  return null
})

const supportBannerKicker = computed(() => {
  if (selectedSupport.value) {
    return '已选安抚卡'
  }

  return props.preview ? '安抚卡预览' : '建议安抚卡'
})

const supportBannerLabel = computed(() => {
  if (selectedSupport.value) {
    return selectedSupport.value.shortLabel
  }

  return displaySupports.value[0]?.shortLabel || '安抚卡'
})

function supportCardClasses(id: SupportId) {
  return {
    'is-selected': selectedSupport.value?.id === id,
    'is-preview-card': props.preview && selectedSupport.value?.id !== id,
  }
}

function supportSlotAt(index: number): SupportSlot {
  return supportSlots[index] || supportSlots[supportSlots.length - 1]!
}

const rootClasses = computed(() => ({
  'is-preview': props.preview,
  'is-finished': props.finished,
  'is-focus-character': props.focusArea === 'character',
  'is-focus-thermometer': props.focusArea === 'thermometer',
  'is-focus-support': props.focusArea === 'support',
  'is-focus-summary': props.focusArea === 'summary',
}))
</script>

<style scoped>
.mood-meter-stage-art {
  position: absolute;
  inset: 0;
}

.mood-meter-stage-art__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.mood-meter-stage-art__focus {
  opacity: 0;
  fill: rgba(56, 189, 248, 0.18);
  filter: url(#moodMeterSoftGlow);
  transition: opacity 0.18s ease;
}

.mood-meter-stage-art.is-focus-character .mood-meter-stage-art__focus--character,
.mood-meter-stage-art.is-focus-thermometer .mood-meter-stage-art__focus--thermometer,
.mood-meter-stage-art.is-focus-support .mood-meter-stage-art__focus--support,
.mood-meter-stage-art.is-focus-summary .mood-meter-stage-art__focus--summary {
  opacity: 1;
}

.mood-meter-stage-art__banner-kicker,
.mood-meter-stage-art__panel-kicker {
  fill: rgba(52, 73, 94, 0.72);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.mood-meter-stage-art__banner-value,
.mood-meter-stage-art__speech-title {
  fill: #16324a;
  font-size: 15px;
  font-weight: 700;
}

.mood-meter-stage-art__speech-copy,
.mood-meter-stage-art__panel-copy {
  fill: rgba(22, 50, 74, 0.78);
  font-size: 13px;
}

.mood-meter-stage-art__mood-line {
  fill: none;
  stroke-linecap: round;
  stroke-width: 10;
}

.mood-meter-stage-art__face-line {
  fill: none;
  stroke: #463226;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 5;
}

.mood-meter-stage-art__mouth-line {
  fill: none;
  stroke: #bf6657;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 5;
}

.mood-meter-stage-art__support-shell {
  fill: rgba(255, 255, 255, 0.92);
  stroke: rgba(255, 255, 255, 0.96);
  stroke-width: 2;
  filter: drop-shadow(0 12px 18px rgba(31, 45, 61, 0.12));
  transition: fill 0.18s ease, stroke 0.18s ease;
}

.mood-meter-stage-art__support-halo {
  opacity: 0.92;
}

.mood-meter-stage-art__support-card.is-selected .mood-meter-stage-art__support-shell {
  fill: rgba(255, 255, 255, 0.98);
  stroke: rgba(56, 189, 248, 0.62);
}

.mood-meter-stage-art__support-card.is-preview-card .mood-meter-stage-art__support-shell {
  opacity: 0.88;
}

.mood-meter-stage-art__support-icon {
  transform: translate(12px, 6px);
}

.mood-meter-stage-art__support-number {
  font-size: 22px;
  font-weight: 700;
  stroke: none;
}

.mood-meter-stage-art__support-label {
  fill: #17304d;
  font-size: 14px;
  font-weight: 700;
}

.mood-meter-stage-art__thermo-zone.is-active rect {
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 3;
}

.mood-meter-stage-art__sparkles path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.92);
  stroke-linecap: round;
  stroke-width: 4;
  animation: mood-meter-stage-art-sparkle 1.6s ease-in-out infinite;
}

.mood-meter-stage-art__sparkles g:nth-child(2) path {
  animation-delay: 0.2s;
}

.mood-meter-stage-art__sparkles g:nth-child(3) path {
  animation-delay: 0.4s;
}

.mood-meter-stage-art__sparkles g:nth-child(4) path {
  animation-delay: 0.62s;
}

.mood-meter-stage-art__banner,
.mood-meter-stage-art__speech,
.mood-meter-stage-art__thermometer-panel,
.mood-meter-stage-art__support-panel {
  user-select: none;
}

@keyframes mood-meter-stage-art-sparkle {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.9);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

</style>
