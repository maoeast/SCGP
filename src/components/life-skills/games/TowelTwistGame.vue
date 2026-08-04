<template>
  <div
    class="towel-twist-game"
    :class="{
      'is-paused': props.paused,
      'is-complete': gameCompleted,
    }"
  >
    <header class="game-header">
      <div class="title-block">
        <span class="title-icon" aria-hidden="true">🧺</span>
        <div>
          <p class="eyebrow">双侧协调练习</p>
          <h2>毛巾拧拧工坊</h2>
        </div>
      </div>

      <div class="progress-block" aria-label="拧毛巾进度">
        <div class="progress-copy">
          <span>本次进度</span>
          <strong>{{ completedTwists }} / {{ difficultyConfig.targetTwists }}</strong>
        </div>
        <div class="progress-dots" aria-hidden="true">
          <span
            v-for="index in difficultyConfig.targetTwists"
            :key="index"
            class="progress-dot"
            :class="{
              'is-done': index <= completedTwists,
              'is-current': index === completedTwists + 1,
            }"
          />
        </div>
      </div>

      <div class="difficulty-chip">
        <span>难度</span>
        <strong>{{ difficultyLabel }}</strong>
      </div>
    </header>

    <section class="instruction-card" :data-tone="feedbackTone" aria-live="polite">
      <div class="instruction-copy">
        <span class="instruction-icon" aria-hidden="true">{{ feedbackIcon }}</span>
        <div>
          <strong>{{ feedbackMessage }}</strong>
          <p v-if="!gameCompleted">
            <template v-if="strongDirectionGuide">
              左手{{ directionLabel(currentTargets.left) }}，右手{{ directionLabel(currentTargets.right) }}，两边方向要相反。
            </template>
            <template v-else>两边方向要相反；需要时请教师显示方向。</template>
          </p>
        </div>
      </div>

      <button
        type="button"
        class="hint-button"
        :class="{ 'is-active': teacherHintVisible }"
        :disabled="props.paused || gameCompleted"
        :aria-pressed="teacherHintVisible"
        @click="requestTeacherHint"
      >
        <span aria-hidden="true">💡</span>
        {{ difficultyConfig.showArrows ? '再提示一次' : '教师显示方向' }}
      </button>
    </section>

    <main class="workshop-card">
      <div class="workshop-label">
        <span>握住两边的大把手</span>
        <small>{{ inputHint }}</small>
      </div>

      <div
        class="workshop-surface"
        :class="{
          'is-rebounding': isRebounding,
          'is-successful': successPulse,
        }"
        :style="workshopStyle"
      >
        <section class="handle-station handle-station--left" aria-label="左侧把手区域">
          <span class="station-label">左手</span>
          <div class="handle-track">
            <span class="track-line" aria-hidden="true" />
            <span class="neutral-mark" aria-hidden="true">起点</span>
            <span
              class="target-mark"
              :class="targetGuideClass('left')"
              :style="targetGuideStyle('left')"
              aria-hidden="true"
            >
              <strong>{{ arrowGlyph(currentTargets.left) }}</strong>
              <small>{{ directionLabel(currentTargets.left) }}</small>
            </span>

            <button
              type="button"
              class="twist-handle twist-handle--left"
              :class="handleClass('left')"
              :style="handleStyle('left')"
              :disabled="isHandleDisabled('left')"
              :aria-label="leftHandleAriaLabel"
              @pointerdown="onPointerDown('left', $event)"
              @pointermove="onPointerMove('left', $event)"
              @pointerup="onPointerUp('left', $event)"
              @pointercancel="onPointerCancel('left', $event)"
            >
              <span class="handle-grip" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span
                class="handle-direction"
                :class="{ 'is-muted': !strongDirectionGuide && !submittedDirections.left }"
                aria-hidden="true"
              >
                {{ submittedDirections.left ? '✓' : arrowGlyph(currentTargets.left) }}
              </span>
              <span class="handle-copy">
                <strong>左把手</strong>
                <small>{{ handleStatusLabel('left') }}</small>
              </span>
            </button>
          </div>
        </section>

        <section class="towel-stage" aria-label="毛巾展示区">
          <div class="workshop-hooks" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div class="towel-wrap">
            <div class="towel-shadow" aria-hidden="true" />
            <div class="towel" :style="towelStyle" aria-hidden="true">
              <span class="towel-loop towel-loop--one" />
              <span class="towel-loop towel-loop--two" />
              <span class="towel-loop towel-loop--three" />
              <span class="towel-hem towel-hem--top" />
              <span class="towel-hem towel-hem--bottom" />
              <span class="towel-star">★</span>
            </div>
          </div>
          <div class="round-card">
            <span>{{ gameCompleted ? '全部完成' : `第 ${currentTwistNumber} 次` }}</span>
            <strong
              v-if="!gameCompleted"
              :class="{ 'is-muted': !strongDirectionGuide }"
            >
              {{ arrowGlyph(currentTargets.left) }} ＋ {{ arrowGlyph(currentTargets.right) }}
            </strong>
            <strong v-else aria-hidden="true">🌟</strong>
          </div>
          <div class="water-drops" aria-hidden="true">
            <span>💧</span>
            <span>💧</span>
            <span>💧</span>
          </div>
        </section>

        <section class="handle-station handle-station--right" aria-label="右侧把手区域">
          <span class="station-label">右手</span>
          <div class="handle-track">
            <span class="track-line" aria-hidden="true" />
            <span class="neutral-mark" aria-hidden="true">起点</span>
            <span
              class="target-mark"
              :class="targetGuideClass('right')"
              :style="targetGuideStyle('right')"
              aria-hidden="true"
            >
              <strong>{{ arrowGlyph(currentTargets.right) }}</strong>
              <small>{{ directionLabel(currentTargets.right) }}</small>
            </span>

            <button
              type="button"
              class="twist-handle twist-handle--right"
              :class="handleClass('right')"
              :style="handleStyle('right')"
              :disabled="isHandleDisabled('right')"
              :aria-label="rightHandleAriaLabel"
              @pointerdown="onPointerDown('right', $event)"
              @pointermove="onPointerMove('right', $event)"
              @pointerup="onPointerUp('right', $event)"
              @pointercancel="onPointerCancel('right', $event)"
            >
              <span class="handle-grip" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span
                class="handle-direction"
                :class="{ 'is-muted': !strongDirectionGuide && !submittedDirections.right }"
                aria-hidden="true"
              >
                {{ submittedDirections.right ? '✓' : arrowGlyph(currentTargets.right) }}
              </span>
              <span class="handle-copy">
                <strong>右把手</strong>
                <small>{{ handleStatusLabel('right') }}</small>
              </span>
            </button>
          </div>
        </section>
      </div>

      <div class="coordination-tip">
        <span aria-hidden="true">🤲</span>
        <p>
          <strong>配合小秘诀：</strong>
          触屏可以两只手同时移动；使用鼠标时，先完成一边，再完成另一边。
        </p>
      </div>
    </main>

    <Transition name="pause-fade">
      <div v-if="props.paused" class="pause-overlay" role="status" aria-live="polite">
        <div class="pause-card">
          <span aria-hidden="true">⏸️</span>
          <strong>先休息一下</strong>
          <p>恢复后从这一轮继续，不会记录这段等待时间。</p>
        </div>
      </div>
    </Transition>

    <Transition name="celebration-pop">
      <div v-if="gameCompleted" class="celebration" role="status" aria-live="polite">
        <div class="celebration-card">
          <span class="celebration-stars" aria-hidden="true">✨ 🌟 ✨</span>
          <strong>双手配合得真棒！</strong>
          <p>毛巾已经拧好啦！</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  TOWEL_TWIST_DIFFICULTIES,
  averageNonNegative,
  getTwistTargets,
  isTwistGestureAccepted,
  ratio,
  type TwistDirection,
} from '@/features/life-skills/new-games-core'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
} from '@/types/emotional/games'

type HandleSide = 'left' | 'right'
type FeedbackTone = 'guide' | 'success' | 'retry' | 'complete'

interface ActivePointer {
  pointerId: number
  startY: number
  travelPx: number
  element: HTMLElement
}

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const completedTwists = ref(0)
const directionMismatches = ref(0)
const gripReleases = ref(0)
const hintCount = ref(0)
const twistTimesMs = ref<number[]>([])
const teacherHintVisible = ref(false)
const gameStarted = ref(false)
const gameCompleted = ref(false)
const isRebounding = ref(false)
const successPulse = ref(false)
const feedbackTone = ref<FeedbackTone>('guide')
const feedbackMessage = ref('两只手握稳把手，沿箭头移动。')

const handleOffsets = reactive<Record<HandleSide, number>>({
  left: 0,
  right: 0,
})
const submittedDirections = reactive<Record<HandleSide, TwistDirection | null>>({
  left: null,
  right: null,
})
const dragging = reactive<Record<HandleSide, boolean>>({
  left: false,
  right: false,
})
const activePointers: Record<HandleSide, ActivePointer | null> = {
  left: null,
  right: null,
}

let sessionStartedAt: number | null = null
let pauseStartedAt: number | null = null
let accumulatedPauseMs = 0
let twistStartedAt: number | null = null
let completionEmitted = false
let unmounted = false
let feedbackTimer: number | null = null
let reboundTimer: number | null = null
let successTimer: number | null = null

const difficultyConfig = computed(() => TOWEL_TWIST_DIFFICULTIES[activeDifficulty.value])
const currentTargets = computed(() => getTwistTargets(completedTwists.value))
const currentTwistNumber = computed(() => (
  Math.min(completedTwists.value + 1, difficultyConfig.value.targetTwists)
))
const difficultyLabel = computed(() => ({ 1: '简单', 2: '中等', 3: '困难' })[activeDifficulty.value])
const strongDirectionGuide = computed(() => difficultyConfig.value.showArrows || teacherHintVisible.value)
const feedbackIcon = computed(() => {
  if (feedbackTone.value === 'success' || feedbackTone.value === 'complete') return '🌟'
  if (feedbackTone.value === 'retry') return '🌱'
  return '🧭'
})
const inputHint = computed(() => {
  if (gameCompleted.value) return '本次练习完成'
  if (submittedDirections.left || submittedDirections.right) return '一边已到位，继续完成另一边'
  return '拖到箭头圆点处就会自动提交方向'
})
const leftHandleAriaLabel = computed(() => buildHandleAriaLabel('left'))
const rightHandleAriaLabel = computed(() => buildHandleAriaLabel('right'))
const towelStyle = computed<Record<string, string>>(() => {
  const tilt = clamp((handleOffsets.right - handleOffsets.left) * 0.045, -8, 8)
  const squeeze = submittedDirections.left || submittedDirections.right ? 0.97 : 1
  return {
    transform: `rotate(${tilt}deg) scaleX(${squeeze})`,
  }
})
const workshopStyle = computed<Record<string, string>>(() => ({
  '--travel-percent': `${difficultyConfig.value.travelRatio * 100}%`,
}))

function directionLabel(direction: TwistDirection): string {
  return direction === 'up' ? '向上' : '向下'
}

function arrowGlyph(direction: TwistDirection): string {
  return direction === 'up' ? '↑' : '↓'
}

function oppositeSide(side: HandleSide): HandleSide {
  return side === 'left' ? 'right' : 'left'
}

function buildHandleAriaLabel(side: HandleSide): string {
  const sideLabel = side === 'left' ? '左' : '右'
  const submitted = submittedDirections[side]
  if (submitted) return `${sideLabel}把手已${directionLabel(submitted)}到位`
  return `${sideLabel}把手，请${directionLabel(currentTargets.value[side])}拖动`
}

function handleStatusLabel(side: HandleSide): string {
  const submitted = submittedDirections[side]
  if (submitted) return '已到位'
  if (dragging[side]) return '握稳继续'
  return strongDirectionGuide.value ? directionLabel(currentTargets.value[side]) : '观察弱提示'
}

function isHandleDisabled(side: HandleSide): boolean {
  return props.paused || gameCompleted.value || submittedDirections[side] !== null
}

function handleClass(side: HandleSide): Record<string, boolean> {
  const submitted = submittedDirections[side]
  return {
    'is-dragging': dragging[side],
    'is-submitted': submitted !== null,
    'is-wrong-direction': submitted !== null && submitted !== currentTargets.value[side],
  }
}

function handleStyle(side: HandleSide): Record<string, string> {
  return {
    transform: `translateY(calc(-50% + ${handleOffsets[side]}px))`,
  }
}

function targetGuideClass(side: HandleSide): Record<string, boolean> {
  return {
    'is-muted': !strongDirectionGuide.value,
    'is-highlighted': teacherHintVisible.value,
    'is-reached': submittedDirections[side] !== null,
  }
}

function targetGuideStyle(side: HandleSide): Record<string, string> {
  const direction = currentTargets.value[side]
  const offset = difficultyConfig.value.travelRatio * 100
  return {
    top: `${direction === 'up' ? 50 - offset : 50 + offset}%`,
  }
}

function clearTimer(timer: number | null): void {
  if (timer !== null) window.clearTimeout(timer)
}

function activeElapsedMs(now = performance.now()): number {
  if (sessionStartedAt === null) return 0
  const livePauseMs = pauseStartedAt === null ? 0 : now - pauseStartedAt
  return Math.max(0, now - sessionStartedAt - accumulatedPauseMs - livePauseMs)
}

function runAudioPromise(action: () => Promise<void>): void {
  try {
    void action().catch(() => undefined)
  } catch {
    // Audio is supportive only; interaction remains available if the controller fails synchronously.
  }
}

function runAudioAction(action: () => void): void {
  try {
    action()
  } catch {
    // Audio is supportive only; interaction remains available if the controller fails synchronously.
  }
}

function speakSafely(message: string): void {
  runAudioAction(() => props.audio.speak(message))
}

function startSessionIfNeeded(): void {
  if (gameStarted.value) return

  activeDifficulty.value = props.difficulty
  gameStarted.value = true
  sessionStartedAt = performance.now()
  props.markRoundDirty?.()

  runAudioPromise(async () => {
    await props.audio.ensureReady()
    if (!unmounted && !props.paused && !gameCompleted.value) await props.audio.startAmbient()
  })
}

function startTwistTimerIfNeeded(): void {
  if (twistStartedAt === null) twistStartedAt = activeElapsedMs()
}

function travelDistanceFor(element: HTMLElement): number {
  const trackHeight = element.parentElement?.getBoundingClientRect().height ?? 320
  return Math.max(48, trackHeight * difficultyConfig.value.travelRatio)
}

function capturePointer(element: HTMLElement, pointerId: number): boolean {
  if (typeof element.setPointerCapture !== 'function') return true
  try {
    element.setPointerCapture(pointerId)
    return true
  } catch {
    return false
  }
}

function releasePointer(pointer: ActivePointer): void {
  try {
    if (
      typeof pointer.element.hasPointerCapture === 'function'
      && pointer.element.hasPointerCapture(pointer.pointerId)
    ) {
      pointer.element.releasePointerCapture(pointer.pointerId)
    }
  } catch {
    // Capture may already have been released by the browser after pointercancel.
  }
}

function onPointerDown(side: HandleSide, event: PointerEvent): void {
  if (props.paused || gameCompleted.value || submittedDirections[side] || activePointers[side]) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (activePointers[oppositeSide(side)]?.pointerId === event.pointerId) return

  event.preventDefault()
  const element = event.currentTarget as HTMLElement
  if (!capturePointer(element, event.pointerId)) return

  startSessionIfNeeded()
  startTwistTimerIfNeeded()
  activePointers[side] = {
    pointerId: event.pointerId,
    startY: event.clientY,
    travelPx: travelDistanceFor(element),
    element,
  }
  dragging[side] = true
  handleOffsets[side] = 0
  feedbackTone.value = 'guide'
  feedbackMessage.value = '握得很稳，继续移动到箭头圆点。'
}

function updatePointerPosition(side: HandleSide, event: PointerEvent): boolean {
  const pointer = activePointers[side]
  if (!pointer || pointer.pointerId !== event.pointerId || props.paused) return false

  const deltaY = event.clientY - pointer.startY
  handleOffsets[side] = clamp(deltaY, -pointer.travelPx, pointer.travelPx)

  if (Math.abs(deltaY) < pointer.travelPx) return false
  submitDirection(side, deltaY < 0 ? 'up' : 'down')
  return true
}

function onPointerMove(side: HandleSide, event: PointerEvent): void {
  if (!activePointers[side] || activePointers[side]?.pointerId !== event.pointerId) return
  event.preventDefault()
  updatePointerPosition(side, event)
}

function onPointerUp(side: HandleSide, event: PointerEvent): void {
  const pointer = activePointers[side]
  if (!pointer || pointer.pointerId !== event.pointerId) return

  event.preventDefault()
  if (props.paused) {
    cancelActivePointer(side, false)
    return
  }
  if (updatePointerPosition(side, event)) return

  cancelActivePointer(side, true)
  feedbackTone.value = 'retry'
  feedbackMessage.value = '没关系，握稳后再拉到箭头圆点。'
  runAudioPromise(() => props.audio.playSoftBounce())
}

function onPointerCancel(side: HandleSide, event: PointerEvent): void {
  if (activePointers[side]?.pointerId !== event.pointerId) return
  cancelActivePointer(side, false)
}

function cancelActivePointer(side: HandleSide, countRelease: boolean): void {
  const pointer = activePointers[side]
  if (!pointer) return

  releasePointer(pointer)
  activePointers[side] = null
  dragging[side] = false
  if (submittedDirections[side] === null) handleOffsets[side] = 0
  if (countRelease) gripReleases.value += 1
}

function submitDirection(side: HandleSide, direction: TwistDirection): void {
  const pointer = activePointers[side]
  if (!pointer) return

  submittedDirections[side] = direction
  handleOffsets[side] = direction === 'up' ? -pointer.travelPx : pointer.travelPx
  releasePointer(pointer)
  activePointers[side] = null
  dragging[side] = false

  if (submittedDirections[oppositeSide(side)] === null) {
    feedbackTone.value = 'guide'
    feedbackMessage.value = `${side === 'left' ? '左边' : '右边'}到位啦，再完成另一边。`
    return
  }

  evaluateSubmittedPair()
}

function evaluateSubmittedPair(): void {
  const leftDirection = submittedDirections.left
  const rightDirection = submittedDirections.right
  if (!leftDirection || !rightDirection) return

  if (isTwistGestureAccepted(leftDirection, rightDirection, completedTwists.value)) {
    completeTwist()
    return
  }

  directionMismatches.value += 1
  resetSubmittedPair()
  teacherHintVisible.value = false
  isRebounding.value = true
  clearTimer(reboundTimer)
  reboundTimer = window.setTimeout(() => {
    isRebounding.value = false
  }, 480)
  feedbackTone.value = 'retry'
  feedbackMessage.value = '方向还没配合上，回到中间再试一次。'
  runAudioPromise(() => props.audio.playSoftBounce())
  speakSafely('慢慢来，两边要往相反方向。')
}

function completeTwist(): void {
  const finishedAt = activeElapsedMs()
  const startedAt = twistStartedAt ?? finishedAt
  twistTimesMs.value.push(Math.max(0, Math.round(finishedAt - startedAt)))
  twistStartedAt = null
  completedTwists.value += 1
  resetSubmittedPair()
  teacherHintVisible.value = false
  successPulse.value = true
  clearTimer(successTimer)
  successTimer = window.setTimeout(() => {
    successPulse.value = false
  }, 700)
  feedbackTone.value = 'success'
  runAudioPromise(() => props.audio.playSuccessCue())

  if (completedTwists.value >= difficultyConfig.value.targetTwists) {
    finishGame()
    return
  }

  feedbackMessage.value = '配合成功！下一次交换方向，再来一次。'
  speakSafely('做得好，下一次交换方向。')
  scheduleGuideMessage()
}

function resetSubmittedPair(): void {
  submittedDirections.left = null
  submittedDirections.right = null
  handleOffsets.left = 0
  handleOffsets.right = 0
}

function scheduleGuideMessage(): void {
  clearTimer(feedbackTimer)
  feedbackTimer = window.setTimeout(() => {
    if (gameCompleted.value || props.paused) return
    feedbackTone.value = 'guide'
    feedbackMessage.value = '看清新箭头，两边反方向移动。'
  }, 1500)
}

function requestTeacherHint(): void {
  if (props.paused || gameCompleted.value) return
  hintCount.value += 1
  teacherHintVisible.value = true
  feedbackTone.value = 'guide'
  feedbackMessage.value = `方向提示：左手${directionLabel(currentTargets.value.left)}，右手${directionLabel(currentTargets.value.right)}。`
  speakSafely(feedbackMessage.value)
  scheduleGuideMessage()
}

function finishGame(): void {
  if (completionEmitted) return
  completionEmitted = true
  gameCompleted.value = true
  feedbackTone.value = 'complete'
  feedbackMessage.value = '全部完成！双手配合得真棒！'
  cancelActivePointer('left', false)
  cancelActivePointer('right', false)
  runAudioAction(() => props.audio.stopAmbient())
  speakSafely('全部完成，双手配合得真棒！')

  const successfulTwists = completedTwists.value
  const totalSubmissions = successfulTwists + directionMismatches.value
  const payload: EmotionGameCompletionPayload = {
    performanceData: {
      event: 'game_complete',
      interaction_mode: 'bilateral-opposite-twist',
      target_twists: difficultyConfig.value.targetTwists,
      completed_twists: successfulTwists,
      direction_mismatches: directionMismatches.value,
      grip_releases: gripReleases.value,
      coordinated_motion_ratio: ratio(successfulTwists, totalSubmissions),
      twist_times_ms: [...twistTimesMs.value],
      average_twist_ms: averageNonNegative(twistTimesMs.value),
      hint_count: hintCount.value,
      total_duration_seconds: Number((activeElapsedMs() / 1000).toFixed(1)),
      difficulty_level: activeDifficulty.value,
    },
  }

  emit('complete', payload)
}

function pauseSession(): void {
  if (sessionStartedAt !== null && pauseStartedAt === null) pauseStartedAt = performance.now()
  cancelActivePointer('left', false)
  cancelActivePointer('right', false)
  runAudioAction(() => props.audio.stopAmbient())
}

function resumeSession(): void {
  if (pauseStartedAt !== null) {
    accumulatedPauseMs += performance.now() - pauseStartedAt
    pauseStartedAt = null
  }
  if (gameStarted.value && !gameCompleted.value) {
    runAudioPromise(() => props.audio.startAmbient())
    feedbackTone.value = 'guide'
    feedbackMessage.value = '继续这一轮，握稳把手再移动。'
  }
}

watch(
  () => props.difficulty,
  (difficulty) => {
    if (!gameStarted.value) activeDifficulty.value = difficulty
  },
)

watch(
  () => props.paused,
  (paused) => {
    if (paused) pauseSession()
    else resumeSession()
  },
)

onBeforeUnmount(() => {
  unmounted = true
  cancelActivePointer('left', false)
  cancelActivePointer('right', false)
  clearTimer(feedbackTimer)
  clearTimer(reboundTimer)
  clearTimer(successTimer)
  runAudioAction(() => props.audio.stopAll())
})

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}
</script>

<style scoped>
.towel-twist-game {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 2vw, 20px);
  min-height: 100%;
  padding: clamp(14px, 2.5vw, 28px);
  overflow: hidden;
  color: #26364a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
  background:
    radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.9) 0 5%, transparent 22%),
    linear-gradient(145deg, #e9f8f3 0%, #f8f2df 52%, #e8f3fb 100%);
  transition: filter 180ms ease, opacity 180ms ease;
}

.towel-twist-game::before,
.towel-twist-game::after {
  position: absolute;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  content: "";
  pointer-events: none;
  filter: blur(4px);
}

.towel-twist-game::before {
  top: -120px;
  right: -70px;
  background: rgba(255, 211, 128, 0.28);
}

.towel-twist-game::after {
  bottom: -150px;
  left: -80px;
  background: rgba(87, 191, 190, 0.2);
}

.towel-twist-game.is-paused > :not(.pause-overlay) {
  filter: saturate(0.75);
}

.game-header,
.instruction-card,
.workshop-card {
  position: relative;
  z-index: 1;
}

.game-header {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(210px, 1.2fr) auto;
  gap: clamp(12px, 2vw, 24px);
  align-items: center;
  padding: 14px 18px;
  border: 1px solid rgba(89, 130, 132, 0.15);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 30px rgba(56, 91, 95, 0.1);
  backdrop-filter: blur(12px);
}

.title-block {
  display: flex;
  gap: 12px;
  align-items: center;
}

.title-icon {
  display: grid;
  flex: 0 0 58px;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 18px;
  font-size: 32px;
  background: linear-gradient(145deg, #fff7d9, #ffe9ae);
  box-shadow: inset 0 0 0 1px rgba(185, 134, 46, 0.12);
}

.eyebrow,
.title-block h2,
.instruction-copy p,
.coordination-tip p,
.pause-card p,
.celebration-card p {
  margin: 0;
}

.eyebrow {
  color: #53807d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.title-block h2 {
  margin-top: 2px;
  color: #254a4b;
  font-size: clamp(20px, 2.2vw, 28px);
  line-height: 1.2;
}

.progress-block {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: center;
}

.progress-copy {
  display: flex;
  flex-direction: column;
  min-width: 76px;
}

.progress-copy span,
.difficulty-chip span {
  color: #6c7c84;
  font-size: 13px;
}

.progress-copy strong {
  color: #287f7c;
  font-size: 22px;
}

.progress-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}

.progress-dot {
  width: 16px;
  height: 16px;
  border: 2px solid #b9cfcd;
  border-radius: 50%;
  background: #f4f9f7;
  transition: transform 220ms ease, background 220ms ease, border-color 220ms ease;
}

.progress-dot.is-current {
  border-color: #f0a94a;
  transform: scale(1.22);
  box-shadow: 0 0 0 5px rgba(240, 169, 74, 0.14);
}

.progress-dot.is-done {
  border-color: #3aa59f;
  background: #3aa59f;
  transform: scale(1.08);
}

.difficulty-chip {
  display: flex;
  min-width: 88px;
  min-height: 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: #eef8f5;
}

.difficulty-chip strong {
  color: #2f7774;
  font-size: 18px;
}

.instruction-card {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 82px;
  padding: 12px 16px 12px 20px;
  border: 2px solid rgba(59, 147, 143, 0.22);
  border-radius: 22px;
  background: rgba(245, 255, 252, 0.94);
  box-shadow: 0 9px 24px rgba(63, 110, 109, 0.08);
  transition: border-color 180ms ease, background 180ms ease;
}

.instruction-card[data-tone="success"],
.instruction-card[data-tone="complete"] {
  border-color: rgba(239, 171, 56, 0.55);
  background: rgba(255, 250, 226, 0.97);
}

.instruction-card[data-tone="retry"] {
  border-color: rgba(111, 164, 132, 0.42);
  background: rgba(247, 253, 240, 0.97);
}

.instruction-copy {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}

.instruction-icon {
  display: grid;
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 15px;
  font-size: 26px;
  background: rgba(255, 255, 255, 0.78);
}

.instruction-copy strong {
  display: block;
  color: #295a59;
  font-size: clamp(16px, 1.7vw, 21px);
  line-height: 1.35;
}

.instruction-copy p {
  margin-top: 3px;
  color: #64777b;
  font-size: 14px;
}

.hint-button {
  display: inline-flex;
  min-width: 148px;
  min-height: 58px;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border: 2px solid #e8b75f;
  border-radius: 17px;
  color: #79551d;
  font: inherit;
  font-size: 15px;
  font-weight: 750;
  cursor: pointer;
  background: #fff8df;
  box-shadow: 0 5px 0 #dca64b;
  transition: transform 120ms ease, box-shadow 120ms ease, background 180ms ease;
}

.hint-button:hover:not(:disabled),
.hint-button.is-active {
  background: #fff0b8;
  transform: translateY(-1px);
}

.hint-button:active:not(:disabled) {
  box-shadow: 0 2px 0 #dca64b;
  transform: translateY(3px);
}

.hint-button:focus-visible,
.twist-handle:focus-visible {
  outline: 4px solid rgba(38, 118, 161, 0.34);
  outline-offset: 4px;
}

.hint-button:disabled {
  cursor: default;
  opacity: 0.55;
}

.workshop-card {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  padding: clamp(14px, 2vw, 22px);
  border: 1px solid rgba(86, 122, 124, 0.13);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 44px rgba(64, 91, 94, 0.13);
}

.workshop-label {
  display: flex;
  gap: 14px;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 4px 12px;
}

.workshop-label span {
  color: #315c5d;
  font-size: 17px;
  font-weight: 800;
}

.workshop-label small {
  color: #738387;
  font-size: 13px;
  text-align: right;
}

.workshop-surface {
  position: relative;
  display: grid;
  flex: 1;
  grid-template-columns: minmax(112px, 0.85fr) minmax(120px, 1.65fr) minmax(112px, 0.85fr);
  gap: clamp(6px, 2vw, 26px);
  align-items: stretch;
  min-height: clamp(330px, 48vh, 500px);
  padding: clamp(10px, 1.5vw, 18px);
  overflow: hidden;
  border: 2px solid rgba(104, 153, 151, 0.16);
  border-radius: 24px;
  background:
    linear-gradient(rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0.46)),
    repeating-linear-gradient(90deg, #dcebe5 0 2px, transparent 2px 54px),
    linear-gradient(180deg, #eaf6f1 0%, #f5eddc 100%);
}

.workshop-surface::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 16%;
  content: "";
  pointer-events: none;
  background: linear-gradient(180deg, rgba(188, 145, 91, 0.04), rgba(164, 116, 64, 0.17));
}

.handle-station {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 112px;
  flex-direction: column;
  align-items: center;
}

.station-label {
  position: absolute;
  top: 8px;
  z-index: 4;
  padding: 6px 13px;
  border-radius: 999px;
  color: #3e6968;
  font-size: 14px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 4px 12px rgba(50, 91, 90, 0.09);
}

.handle-track {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.track-line {
  position: absolute;
  top: 10%;
  bottom: 10%;
  left: 50%;
  width: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, #c7d9d5, #f7fffc 48%, #b6cdc8);
  box-shadow: inset 0 1px 3px rgba(44, 78, 76, 0.18);
  transform: translateX(-50%);
}

.neutral-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  width: 76px;
  padding: 3px 0;
  border-radius: 999px;
  color: #79908e;
  font-size: 11px;
  text-align: center;
  background: rgba(255, 255, 255, 0.72);
  transform: translate(-50%, -50%);
}

.target-mark {
  position: absolute;
  left: 50%;
  z-index: 4;
  display: flex;
  width: 76px;
  min-height: 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid #e49b32;
  border-radius: 18px;
  color: #83581c;
  background: #fff2bd;
  box-shadow: 0 0 0 7px rgba(239, 176, 68, 0.18), 0 5px 12px rgba(100, 77, 29, 0.15);
  transform: translate(-50%, -50%);
  transition: opacity 180ms ease, transform 180ms ease, background 180ms ease;
}

.target-mark strong {
  font-size: 26px;
  line-height: 1;
}

.target-mark small {
  margin-top: 1px;
  font-size: 12px;
  font-weight: 800;
}

.target-mark.is-muted {
  opacity: 0.2;
  filter: saturate(0.35);
  box-shadow: none;
}

.target-mark.is-highlighted {
  animation: hint-breathe 1.4s ease-in-out infinite;
}

.target-mark.is-reached {
  border-color: #32958e;
  color: #236d68;
  background: #dff7ed;
  box-shadow: 0 0 0 7px rgba(52, 158, 147, 0.16);
}

.twist-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 6;
  display: flex;
  width: clamp(112px, 12vw, 150px);
  min-height: 116px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 10px 10px;
  border: 4px solid #326f70;
  border-radius: 28px;
  color: #214b4c;
  font: inherit;
  cursor: grab;
  touch-action: none;
  user-select: none;
  background: linear-gradient(145deg, #8ad5cb 0%, #55aaa6 52%, #3f8d8a 100%);
  box-shadow:
    0 10px 0 #286564,
    0 16px 24px rgba(38, 78, 78, 0.23),
    inset 0 2px 1px rgba(255, 255, 255, 0.52);
  translate: -50% 0;
  transition: transform 260ms cubic-bezier(0.2, 0.75, 0.25, 1.2), box-shadow 160ms ease, filter 160ms ease;
  -webkit-tap-highlight-color: transparent;
}

.twist-handle--right {
  border-color: #795b83;
  color: #4f3a58;
  background: linear-gradient(145deg, #d5b7df 0%, #b48bc1 52%, #906c9e 100%);
  box-shadow:
    0 10px 0 #71547c,
    0 16px 24px rgba(83, 57, 91, 0.22),
    inset 0 2px 1px rgba(255, 255, 255, 0.5);
}

.twist-handle.is-dragging {
  cursor: grabbing;
  filter: brightness(1.06);
  box-shadow:
    0 5px 0 #286564,
    0 12px 22px rgba(38, 78, 78, 0.25),
    inset 0 2px 1px rgba(255, 255, 255, 0.55);
  transition: box-shadow 100ms ease, filter 100ms ease;
}

.twist-handle--right.is-dragging {
  box-shadow:
    0 5px 0 #71547c,
    0 12px 22px rgba(83, 57, 91, 0.24),
    inset 0 2px 1px rgba(255, 255, 255, 0.52);
}

.twist-handle.is-submitted {
  cursor: default;
  filter: saturate(0.9) brightness(1.06);
}

.twist-handle.is-wrong-direction {
  border-color: #8d7b48;
  filter: saturate(0.65);
}

.twist-handle:disabled {
  opacity: 1;
}

.handle-grip {
  display: flex;
  width: 72%;
  gap: 5px;
  justify-content: center;
  margin-bottom: 5px;
}

.handle-grip i {
  display: block;
  width: 7px;
  height: 26px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 1px 2px rgba(31, 70, 69, 0.16);
}

.handle-direction {
  position: absolute;
  top: 8px;
  right: 10px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  color: #315c5c;
  font-size: 22px;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.72);
}

.handle-direction.is-muted,
.round-card strong.is-muted {
  opacity: 0.22;
  filter: saturate(0.35);
}

.handle-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.handle-copy strong {
  font-size: 17px;
}

.handle-copy small {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 750;
}

.towel-stage {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
}

.workshop-hooks {
  position: absolute;
  top: 3%;
  display: flex;
  gap: 18px;
  padding: 8px 18px;
  border-radius: 14px;
  background: rgba(165, 116, 70, 0.24);
}

.workshop-hooks span {
  width: 10px;
  height: 18px;
  border: 3px solid #a87d57;
  border-top: 0;
  border-radius: 0 0 8px 8px;
}

.towel-wrap {
  position: relative;
  width: min(100%, 390px);
  aspect-ratio: 1.32 / 1;
}

.towel-shadow {
  position: absolute;
  inset: 15% 4% 8%;
  border-radius: 50%;
  background: rgba(51, 83, 82, 0.14);
  filter: blur(16px);
  transform: translateY(22px);
}

.towel {
  position: absolute;
  inset: 8% 3% 12%;
  overflow: hidden;
  border: 7px solid #e99657;
  border-radius: 24% 18% 23% 16% / 22% 20% 27% 24%;
  background:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.18) 0 10px, rgba(224, 104, 51, 0.08) 10px 20px),
    linear-gradient(145deg, #ffc184 0%, #f6a460 54%, #ea8950 100%);
  box-shadow:
    inset 0 0 0 4px rgba(255, 239, 211, 0.46),
    inset 0 -18px 24px rgba(186, 83, 45, 0.13),
    0 14px 24px rgba(105, 76, 48, 0.19);
  transform-origin: center;
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.25, 1.15);
}

.towel-loop {
  position: absolute;
  top: -14%;
  width: 25%;
  height: 130%;
  border: 9px solid rgba(255, 243, 218, 0.38);
  border-top: 0;
  border-bottom: 0;
  border-radius: 50%;
  transform: rotate(13deg);
}

.towel-loop--one {
  left: 8%;
}

.towel-loop--two {
  left: 38%;
  transform: rotate(-11deg);
}

.towel-loop--three {
  right: 5%;
  transform: rotate(15deg);
}

.towel-hem {
  position: absolute;
  right: 0;
  left: 0;
  height: 12px;
  background: repeating-linear-gradient(90deg, #f8d2a0 0 13px, #db7a44 13px 21px);
}

.towel-hem--top {
  top: 8%;
}

.towel-hem--bottom {
  bottom: 8%;
}

.towel-star {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 70px;
  height: 70px;
  place-items: center;
  border: 4px solid rgba(255, 245, 219, 0.72);
  border-radius: 50%;
  color: #fff1c9;
  font-size: 40px;
  text-shadow: 0 3px 0 rgba(180, 91, 47, 0.2);
  background: rgba(225, 119, 65, 0.27);
  transform: translate(-50%, -50%);
}

.round-card {
  position: absolute;
  bottom: 5%;
  left: 50%;
  z-index: 3;
  display: flex;
  min-width: 126px;
  min-height: 58px;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border: 2px solid rgba(70, 125, 122, 0.23);
  border-radius: 18px;
  color: #416867;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 18px rgba(51, 89, 87, 0.12);
  transform: translateX(-50%);
}

.round-card span {
  font-size: 13px;
  font-weight: 750;
}

.round-card strong {
  color: #e59338;
  font-size: 23px;
}

.water-drops {
  position: absolute;
  top: 7%;
  right: 5%;
  display: flex;
  gap: 2px;
  opacity: 0.62;
  transform: rotate(13deg);
}

.water-drops span:nth-child(2) {
  margin-top: 15px;
  font-size: 13px;
}

.water-drops span:nth-child(3) {
  margin-top: 3px;
  font-size: 11px;
}

.workshop-surface.is-successful .towel {
  animation: towel-squeeze 650ms ease-out;
}

.workshop-surface.is-successful .water-drops {
  animation: drops-pop 650ms ease-out;
}

.workshop-surface.is-rebounding .twist-handle {
  animation: gentle-rebound 460ms ease-out;
}

.coordination-tip {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 10px 8px 0;
  color: #65797b;
  font-size: 13px;
  text-align: center;
}

.coordination-tip > span {
  font-size: 22px;
}

.coordination-tip strong {
  color: #3e6968;
}

.pause-overlay,
.celebration {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(36, 58, 63, 0.34);
  backdrop-filter: blur(5px);
}

.pause-card,
.celebration-card {
  display: flex;
  width: min(92%, 430px);
  min-height: 230px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  border: 4px solid rgba(255, 255, 255, 0.7);
  border-radius: 30px;
  color: #315958;
  text-align: center;
  background: #f3fbf8;
  box-shadow: 0 24px 60px rgba(34, 61, 63, 0.28);
}

.pause-card > span {
  margin-bottom: 10px;
  font-size: 54px;
}

.pause-card strong,
.celebration-card strong {
  font-size: clamp(24px, 4vw, 36px);
}

.pause-card p,
.celebration-card p {
  margin-top: 9px;
  color: #687b7d;
  font-size: 16px;
}

.celebration {
  background: rgba(37, 68, 65, 0.24);
  pointer-events: none;
}

.celebration-card {
  border-color: #ffe39b;
  color: #77511f;
  background: linear-gradient(145deg, #fffdf3, #fff0c2);
}

.celebration-stars {
  margin-bottom: 13px;
  font-size: 42px;
}

.pause-fade-enter-active,
.pause-fade-leave-active {
  transition: opacity 180ms ease;
}

.pause-fade-enter-from,
.pause-fade-leave-to {
  opacity: 0;
}

.celebration-pop-enter-active {
  transition: opacity 240ms ease;
}

.celebration-pop-enter-active .celebration-card {
  animation: celebration-arrive 500ms cubic-bezier(0.2, 0.9, 0.25, 1.25);
}

.celebration-pop-enter-from {
  opacity: 0;
}

@keyframes hint-breathe {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.08);
  }
}

@keyframes gentle-rebound {
  0%,
  100% {
    margin-left: 0;
  }
  30% {
    margin-left: -7px;
  }
  65% {
    margin-left: 7px;
  }
}

@keyframes towel-squeeze {
  0%,
  100% {
    filter: brightness(1);
  }
  45% {
    filter: brightness(1.12) saturate(1.08);
  }
}

@keyframes drops-pop {
  0% {
    opacity: 0;
    transform: translateY(-8px) rotate(13deg);
  }
  45% {
    opacity: 0.9;
  }
  100% {
    opacity: 0.62;
    transform: translateY(5px) rotate(13deg);
  }
}

@keyframes celebration-arrive {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.82);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 900px) {
  .game-header {
    grid-template-columns: 1fr auto;
  }

  .progress-block {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: flex-start;
    padding-top: 10px;
    border-top: 1px solid rgba(82, 123, 122, 0.12);
  }

  .difficulty-chip {
    grid-column: 2;
    grid-row: 1;
  }

  .workshop-surface {
    grid-template-columns: minmax(112px, 0.9fr) minmax(100px, 1.3fr) minmax(112px, 0.9fr);
    gap: 5px;
  }

  .towel-star {
    width: 55px;
    height: 55px;
    font-size: 31px;
  }
}

@media (max-width: 620px) {
  .towel-twist-game {
    padding: 10px;
  }

  .game-header {
    padding: 11px 12px;
    border-radius: 18px;
  }

  .title-icon {
    flex-basis: 48px;
    width: 48px;
    height: 48px;
    font-size: 27px;
  }

  .progress-block {
    gap: 10px;
    overflow-x: auto;
  }

  .instruction-card {
    align-items: stretch;
    flex-direction: column;
    padding: 13px;
  }

  .hint-button {
    width: 100%;
  }

  .instruction-copy p {
    display: none;
  }

  .workshop-card {
    padding: 8px;
    border-radius: 20px;
  }

  .workshop-label {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }

  .workshop-label small {
    text-align: left;
  }

  .workshop-surface {
    grid-template-columns: 112px minmax(82px, 1fr) 112px;
    min-width: 330px;
    min-height: 360px;
    padding: 5px;
    overflow-x: auto;
    border-radius: 17px;
  }

  .station-label,
  .neutral-mark {
    font-size: 10px;
  }

  .target-mark {
    width: 62px;
    min-height: 52px;
  }

  .target-mark strong {
    font-size: 22px;
  }

  .twist-handle {
    width: 112px;
    min-height: 112px;
    border-radius: 24px;
  }

  .towel-wrap {
    min-width: 90px;
  }

  .towel {
    border-width: 4px;
  }

  .towel-loop,
  .towel-hem,
  .water-drops,
  .workshop-hooks {
    display: none;
  }

  .round-card {
    min-width: 92px;
    padding: 6px;
  }

  .round-card span {
    display: none;
  }

  .coordination-tip {
    align-items: flex-start;
    text-align: left;
  }
}

@media (max-height: 720px) and (min-width: 621px) {
  .towel-twist-game {
    gap: 9px;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .game-header {
    padding-top: 9px;
    padding-bottom: 9px;
  }

  .instruction-card {
    min-height: 68px;
  }

  .workshop-surface {
    min-height: 310px;
  }

  .handle-track {
    min-height: 280px;
  }

  .coordination-tip {
    min-height: 38px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
</style>
