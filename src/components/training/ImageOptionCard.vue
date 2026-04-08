<template>
  <button
    type="button"
    class="image-option-card"
    :class="{
      'is-error': visualState === 'error',
      'is-success': visualState === 'success',
      'is-locked': store.inputLocked && visualState === 'idle',
    }"
    :disabled="store.inputLocked || visualState === 'success'"
    @click="handleSelect"
  >
    <span v-if="visualState === 'success'" class="success-check" aria-hidden="true">✓</span>

    <span class="option-emoji" aria-hidden="true">{{ emoji }}</span>
    <strong class="option-label">{{ option.content }}</strong>
    <span class="option-color" :style="colorLabelStyle">{{ option.color_label || '情绪线索' }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useSound } from '@/composables/useSound'
import { getEmotionCatalogEntry } from '@/features/emotional/emotion-catalog'
import { useTrainingStore, type OptionData } from '@/stores/useTrainingStore'

import {
  TRAINING_CORRECT_SFX,
  TRAINING_ERROR_FEEDBACK_MS,
  TRAINING_ERROR_RESET_MS,
  TRAINING_ERROR_SFX,
  TRAINING_SUCCESS_FEEDBACK_MS,
} from './training-feedback-sfx'

const props = defineProps<{
  option: OptionData
}>()

const emit = defineEmits<{
  feedback: [payload: {
    text: string
    tone: 'success' | 'error'
    durationMs: number
  }]
}>()

const store = useTrainingStore()

const visualState = ref<'idle' | 'error' | 'success'>('idle')
const timers: number[] = []

const correctSound = useSound({
  src: TRAINING_CORRECT_SFX,
  volume: 0.4,
})

const errorSound = useSound({
  src: TRAINING_ERROR_SFX,
  volume: 0.45,
})

const emoji = computed(() => {
  if (props.option.icon_name) {
    return getEmotionCatalogEntry(props.option.icon_name, 'calm').emoji
  }

  return '🙂'
})

const colorLabelStyle = computed(() => {
  return props.option.color_hex
    ? {
      color: props.option.color_hex,
    }
    : undefined
})

function clearTimers(): void {
  timers.forEach((timerId) => window.clearTimeout(timerId))
  timers.length = 0
}

function schedule(callback: () => void, delayMs: number): void {
  const timerId = window.setTimeout(callback, delayMs)
  timers.push(timerId)
}

function resetVisualState(): void {
  clearTimers()
  visualState.value = 'idle'
}

function handleSelect(): void {
  if (store.inputLocked || visualState.value === 'success') {
    return
  }

  store.$patch({
    inputLocked: true,
  })

  clearTimers()

  if (props.option.is_correct) {
    visualState.value = 'success'
    correctSound.play()
    emit('feedback', {
      text: props.option.feedback_text?.trim() || '答对了，继续观察场景里的线索吧。',
      tone: 'success',
      durationMs: TRAINING_SUCCESS_FEEDBACK_MS,
    })

    schedule(() => {
      store.recordAnswer(Number(store.currentStepIndex), props.option.id)
      void store.nextStep()
    }, TRAINING_SUCCESS_FEEDBACK_MS)

    return
  }

  visualState.value = 'error'
  errorSound.play()
  emit('feedback', {
    text: props.option.feedback_text?.trim() || '再仔细看一看画面和线索哦。',
    tone: 'error',
    durationMs: TRAINING_ERROR_RESET_MS,
  })

  schedule(() => {
    store.recordError(Number(store.currentStepIndex))
  }, TRAINING_ERROR_FEEDBACK_MS)

  schedule(() => {
    visualState.value = 'idle'
    store.$patch({
      inputLocked: false,
    })
  }, TRAINING_ERROR_RESET_MS)
}

watch(
  () => store.currentStepData?.id,
  () => {
    resetVisualState()
  },
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<style scoped>
.image-option-card {
  position: relative;
  width: min(100%, 240px);
  min-height: 240px;
  border: 2px solid rgb(226 232 240 / 78%);
  border-radius: 28px;
  padding: 26px 20px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  cursor: pointer;
  background: rgb(255 255 255 / 95%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 88%),
    0 22px 44px rgb(15 23 42 / 14%);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.image-option-card:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: rgb(125 211 252 / 90%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    0 28px 48px rgb(15 23 42 / 18%);
}

.image-option-card:disabled {
  cursor: default;
}

.image-option-card.is-locked {
  opacity: 0.82;
}

.image-option-card.is-error {
  border-color: #ef4444;
  box-shadow:
    inset 0 0 0 1px rgb(254 202 202 / 78%),
    0 20px 42px rgb(239 68 68 / 22%);
  animation: option-shake 150ms ease-in-out;
}

.image-option-card.is-success {
  border-width: 3px;
  border-color: #16a34a;
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  box-shadow:
    inset 0 0 0 1px rgb(134 239 172 / 88%),
    0 22px 42px rgb(22 163 74 / 18%);
}

.success-check {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 12px 24px rgb(22 163 74 / 30%);
}

.option-emoji {
  font-size: clamp(56px, 8vw, 82px);
  line-height: 1;
}

.option-label {
  font-size: clamp(22px, 3vw, 30px);
  line-height: 1.25;
  color: #0f172a;
}

.option-color {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

@keyframes option-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-10px);
  }

  75% {
    transform: translateX(10px);
  }
}

@media (max-width: 900px) {
  .image-option-card {
    width: 100%;
    min-height: 190px;
    padding: 20px 18px;
    border-radius: 24px;
  }
}
</style>
