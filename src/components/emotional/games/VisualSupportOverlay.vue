<template>
  <svg
    class="visual-support-overlay"
    :viewBox="`0 0 ${width} ${height}`"
    :style="{ width: width + 'px', height: height + 'px' }"
    aria-hidden="true"
  >
    <!-- Happy: glowing dots at mouth corners + smile guide arc -->
    <g v-if="activeEmotion === 'Happy'" class="guide-group happy-guide">
      <!-- Left mouth corner glow -->
      <circle
        v-if="lm(faceIndices.mouthLeft)"
        :cx="lm(faceIndices.mouthLeft).x * width"
        :cy="lm(faceIndices.mouthLeft).y * height"
        r="8"
        class="glow-dot"
        :class="{ active: scores.Happy > threshold }"
      />
      <!-- Right mouth corner glow -->
      <circle
        v-if="lm(faceIndices.mouthRight)"
        :cx="lm(faceIndices.mouthRight).x * width"
        :cy="lm(faceIndices.mouthRight).y * height"
        r="8"
        class="glow-dot"
        :class="{ active: scores.Happy > threshold }"
      />
      <!-- Smile guide arc -->
      <path
        v-if="mouthArc"
        :d="mouthArc"
        class="smile-arc"
        fill="none"
        :stroke-dashoffset="smileDashOffset"
      />
      <!-- Stretch arrows pointing up from mouth corners -->
      <g class="stretch-arrow left-arrow" v-if="scores.Happy > 0.15">
        <line
          :x1="lm(faceIndices.mouthLeft)!.x * width"
          :y1="lm(faceIndices.mouthLeft)!.y * height"
          :x2="lm(faceIndices.mouthLeft)!.x * width - 6"
          :y2="lm(faceIndices.mouthLeft)!.y * height - 20"
        />
        <polyline
          :points="arrowHead(lm(faceIndices.mouthLeft)!, 'left')"
        />
      </g>
      <g class="stretch-arrow right-arrow" v-if="scores.Happy > 0.15">
        <line
          :x1="lm(faceIndices.mouthRight)!.x * width"
          :y1="lm(faceIndices.mouthRight)!.y * height"
          :x2="lm(faceIndices.mouthRight)!.x * width + 6"
          :y2="lm(faceIndices.mouthRight)!.y * height - 20"
        />
        <polyline
          :points="arrowHead(lm(faceIndices.mouthRight)!, 'right')"
        />
      </g>
    </g>

    <!-- Surprised: expanding dashed circle at mouth center -->
    <g v-if="activeEmotion === 'Surprised'" class="guide-group surprised-guide">
      <circle
        v-if="mouthCenter"
        :cx="mouthCenter.x * width"
        :cy="mouthCenter.y * height"
        :r="surprisedRadius"
        class="surprise-circle"
        :class="{ active: scores.Surprised > threshold }"
        fill="none"
      />
      <!-- Eye widen indicators -->
      <circle
        v-if="lm(faceIndices.leftEyeOuter)"
        :cx="lm(faceIndices.leftEyeOuter).x * width"
        :cy="lm(faceIndices.leftEyeOuter).y * height"
        r="5"
        class="eye-indicator"
      />
      <circle
        v-if="lm(faceIndices.rightEyeOuter)"
        :cx="lm(faceIndices.rightEyeOuter).x * width"
        :cy="lm(faceIndices.rightEyeOuter).y * height"
        r="5"
        class="eye-indicator"
      />
    </g>

    <!-- Angry: downward arrows above inner eyebrows -->
    <g v-if="activeEmotion === 'Angry'" class="guide-group angry-guide">
      <!-- Left brow arrow -->
      <g v-if="lm(faceIndices.leftInnerBrow)" class="brow-arrow">
        <line
          :x1="lm(faceIndices.leftInnerBrow).x * width"
          :y1="lm(faceIndices.leftInnerBrow).y * height - 24"
          :x2="lm(faceIndices.leftInnerBrow).x * width"
          :y2="lm(faceIndices.leftInnerBrow).y * height - 4"
          :stroke="angryColor"
          stroke-width="3"
          stroke-linecap="round"
        />
        <polygon
          :points="browArrowHead(lm(faceIndices.leftInnerBrow), 'down')"
          :fill="angryColor"
        />
      </g>
      <!-- Right brow arrow -->
      <g v-if="lm(faceIndices.rightInnerBrow)" class="brow-arrow">
        <line
          :x1="lm(faceIndices.rightInnerBrow).x * width"
          :y1="lm(faceIndices.rightInnerBrow).y * height - 24"
          :x2="lm(faceIndices.rightInnerBrow).x * width"
          :y2="lm(faceIndices.rightInnerBrow).y * height - 4"
          :stroke="angryColor"
          stroke-width="3"
          stroke-linecap="round"
        />
        <polygon
          :points="browArrowHead(lm(faceIndices.rightInnerBrow), 'down')"
          :fill="angryColor"
        />
      </g>
      <!-- Intensity glow on brow area -->
      <circle
        v-if="lm(faceIndices.leftInnerBrow)"
        :cx="lm(faceIndices.leftInnerBrow).x * width"
        :cy="lm(faceIndices.leftInnerBrow).y * height"
        :r="12 * scores.Angry"
        :opacity="scores.Angry * 0.6"
        :fill="angryColor"
        class="intensity-pulse"
      />
      <circle
        v-if="lm(faceIndices.rightInnerBrow)"
        :cx="lm(faceIndices.rightInnerBrow).x * width"
        :cy="lm(faceIndices.rightInnerBrow).y * height"
        :r="12 * scores.Angry"
        :opacity="scores.Angry * 0.6"
        :fill="angryColor"
        class="intensity-pulse"
      />
    </g>

    <!-- Neutral: soft breathing ring around face -->
    <g v-if="activeEmotion === 'Neutral'" class="guide-group neutral-guide">
      <circle
        v-if="faceCenter"
        :cx="faceCenter.x * width"
        :cy="faceCenter.y * height"
        :r="neutralRingRadius"
        class="neutral-ring"
        :class="{ active: scores.Neutral > threshold }"
        fill="none"
      />
    </g>

    <!-- Calibration progress ring -->
    <g v-if="showCalibration" class="calibration-ring">
      <circle
        v-if="faceCenter"
        :cx="faceCenter.x * width"
        :cy="faceCenter.y * height"
        r="60"
        fill="none"
        stroke="rgba(255, 255, 255, 0.3)"
        stroke-width="4"
      />
      <circle
        v-if="faceCenter"
        :cx="faceCenter.x * width"
        :cy="faceCenter.y * height"
        r="60"
        fill="none"
        stroke="rgba(255, 255, 255, 0.85)"
        stroke-width="4"
        :stroke-dasharray="2 * Math.PI * 60"
        :stroke-dashoffset="2 * Math.PI * 60 * (1 - calibrationProgress)"
        stroke-linecap="round"
        class="cal-progress-arc"
      />
      <text
        v-if="faceCenter"
        :x="faceCenter.x * width"
        :y="faceCenter.y * height + 85"
        text-anchor="middle"
        class="cal-text"
      >
        看镜头休息一下...
      </text>
    </g>

    <!-- No face indicator -->
    <g v-if="!faceDetected && !showCalibration" class="no-face-hint">
      <text
        :x="width / 2"
        :y="height / 2"
        text-anchor="middle"
        class="no-face-text"
      >
        请把脸放在画面中间
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  FACE_LANDMARK_INDICES,
  type EmotionScores,
  type EmotionType,
  type FaceLandmarkPoint,
} from '@/types/emotional/face-emotion'

const props = withDefaults(defineProps<{
  /** Video container width in pixels. */
  width: number
  /** Video container height in pixels. */
  height: number
  /** Face landmarks from useEmotionDetector. */
  landmarks: FaceLandmarkPoint[]
  /** Whether a face is currently detected. */
  faceDetected: boolean
  /** Current emotion scores. */
  scores: EmotionScores
  /** The target emotion for the current level. */
  activeEmotion: EmotionType
  /** Success threshold (0–1). Default 0.5. */
  threshold?: number
  /** Whether to show the calibration progress overlay. */
  showCalibration?: boolean
  /** Calibration progress (0–1). */
  calibrationProgress?: number
}>(), {
  threshold: 0.5,
  showCalibration: false,
  calibrationProgress: 0,
})

const faceIndices = FACE_LANDMARK_INDICES
const angryColor = '#ff6b6b'

/** Shorthand to safely access a landmark by index. */
function lm(index: number): FaceLandmarkPoint | undefined {
  return props.landmarks[index]
}

/** Midpoint between upper and lower lip — mouth opening center. */
const mouthCenter = computed<FaceLandmarkPoint | undefined>(() => {
  const upper = lm(faceIndices.upperLipCenter)
  const lower = lm(faceIndices.lowerLipCenter)
  if (!upper || !lower) return undefined
  return {
    x: (upper.x + lower.x) / 2,
    y: (upper.y + lower.y) / 2,
    z: 0,
  }
})

/** Approximate face center from forehead and chin. */
const faceCenter = computed<FaceLandmarkPoint | undefined>(() => {
  const fh = lm(faceIndices.foreheadCenter)
  const ch = lm(faceIndices.chin)
  if (!fh || !ch) return undefined
  return {
    x: (fh.x + ch.x) / 2,
    y: (fh.y + ch.y) / 2,
    z: 0,
  }
})

/** Smile arc path connecting mouth corners via a quadratic curve through the lip center. */
const mouthArc = computed<string | undefined>(() => {
  const left = lm(faceIndices.mouthLeft)
  const right = lm(faceIndices.mouthRight)
  const upper = lm(faceIndices.upperLipCenter)
  if (!left || !right || !upper) return undefined

  const x1 = left.x * props.width
  const y1 = left.y * props.height
  const x2 = right.x * props.width
  const y2 = right.y * props.height
  const cpx = upper.x * props.width
  // Pull control point downward (in screen coords) based on smile score
  const cpy = upper.y * props.height + 8 + props.scores.Happy * 20

  return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`
})

/** Dash offset for the smile arc — full dash = hidden, 0 = fully drawn. */
const smileDashOffset = computed(() => {
  const arcLength = 120 // approximate
  return arcLength * (1 - Math.min(1, props.scores.Happy / props.threshold))
})

/** Expanding radius for the surprised mouth circle. */
const surprisedRadius = computed(() => {
  return 12 + props.scores.Surprised * 40
})

/** Breathing ring radius for neutral state. */
const neutralRingRadius = computed(() => {
  return 50 + Math.sin(Date.now() / 800) * 5
})

/** Generate arrowhead points for stretch arrows (Happy). */
function arrowHead(point: FaceLandmarkPoint, side: 'left' | 'right'): string {
  const cx = point.x * props.width + (side === 'left' ? -6 : 6)
  const cy = point.y * props.height - 20
  const s = 4
  return `${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`
}

/** Generate arrowhead polygon points for brow arrows (Angry). */
function browArrowHead(point: FaceLandmarkPoint, _direction: 'down'): string {
  const cx = point.x * props.width
  const tipY = point.y * props.height - 4
  const s = 5
  return `${cx},${tipY + s + 2} ${cx - s},${tipY - s} ${cx + s},${tipY - s}`
}
</script>

<style scoped>
.visual-support-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
  /* Mirror to match the flipped camera view */
  transform: scaleX(-1);
}

/* ---- Happy guides ---- */

.glow-dot {
  fill: #ffd93d;
  opacity: 0.6;
  filter: drop-shadow(0 0 6px #ffd93d);
  transition: r 0.3s ease, opacity 0.3s ease;
}

.glow-dot.active {
  opacity: 1;
  filter: drop-shadow(0 0 12px #ffd93d) drop-shadow(0 0 20px rgba(255, 217, 61, 0.5));
  animation: pulse-glow 1.2s ease-in-out infinite;
}

.smile-arc {
  stroke: #ffd93d;
  stroke-width: 3;
  stroke-dasharray: 120;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px #ffd93d);
  transition: stroke-dashoffset 0.25s ease;
}

.stretch-arrow line {
  stroke: rgba(255, 217, 61, 0.6);
  stroke-width: 2;
  stroke-linecap: round;
}

.stretch-arrow polyline {
  fill: rgba(255, 217, 61, 0.6);
  stroke: none;
}

.left-arrow,
.right-arrow {
  animation: bob-up 2s ease-in-out infinite;
}

/* ---- Surprised guides ---- */

.surprise-circle {
  stroke: #74b9ff;
  stroke-width: 3;
  stroke-dasharray: 8 6;
  filter: drop-shadow(0 0 6px #74b9ff);
  transition: r 0.3s ease;
}

.surprise-circle.active {
  stroke-width: 4;
  filter: drop-shadow(0 0 14px #74b9ff) drop-shadow(0 0 24px rgba(116, 185, 255, 0.4));
  animation: rotate-dash 3s linear infinite;
}

.eye-indicator {
  fill: rgba(116, 185, 255, 0.5);
  filter: drop-shadow(0 0 4px #74b9ff);
  animation: blink-indicator 2.5s ease-in-out infinite;
}

/* ---- Angry guides ---- */

.brow-arrow {
  animation: push-down 1.6s ease-in-out infinite;
}

.intensity-pulse {
  transition: r 0.2s ease, opacity 0.2s ease;
}

/* ---- Neutral guides ---- */

.neutral-ring {
  stroke: rgba(144, 238, 144, 0.6);
  stroke-width: 2.5;
  stroke-dasharray: 10 8;
  filter: drop-shadow(0 0 6px rgba(144, 238, 144, 0.4));
}

.neutral-ring.active {
  stroke: rgba(144, 238, 144, 0.9);
  filter: drop-shadow(0 0 10px rgba(144, 238, 144, 0.6));
}

/* ---- Calibration ---- */

.cal-progress-arc {
  transition: stroke-dashoffset 0.3s ease;
}

.cal-text {
  fill: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 600;
}

/* ---- No face ---- */

.no-face-text {
  fill: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  font-weight: 500;
  animation: fade-pulse 2s ease-in-out infinite;
}

/* ---- Keyframes ---- */

@keyframes pulse-glow {
  0%, 100% { r: 8; }
  50% { r: 11; }
}

@keyframes bob-up {
  0%, 100% { opacity: 0.5; transform: translateY(0); }
  50% { opacity: 0.9; transform: translateY(-3px); }
}

@keyframes rotate-dash {
  to { stroke-dashoffset: -56; }
}

@keyframes blink-indicator {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.9; }
}

@keyframes push-down {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(2px); }
}

@keyframes fade-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.9; }
}
</style>
