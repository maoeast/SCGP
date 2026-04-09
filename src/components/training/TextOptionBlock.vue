<template>
  <button
    type="button"
    class="text-option-block"
    :class="{
      'is-error': visualState === 'error',
      'is-success': visualState === 'success',
      'is-locked': store.inputLocked && visualState === 'idle',
    }"
    :disabled="store.inputLocked || visualState === 'success'"
    @click="handleSelect"
  >
    <span class="option-badge" aria-hidden="true">{{ leadingIcon }}</span>
    <span class="option-content">{{ option.content }}</span>
    <span v-if="visualState === 'success'" class="success-check" aria-hidden="true">✓</span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useSound } from '@/composables/useSound'
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

const leadingIcon = computed(() => {
  const content = props.option.content.trim()
  if (content.includes('老师') || content.includes('帮助')) {
    return '🧭'
  }

  if (content.includes('安慰') || content.includes('陪')) {
    return '💛'
  }

  if (content.includes('深呼吸') || content.includes('冷静')) {
    return '🌿'
  }

  return '✦'
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
    store.showRewardOverlay = true
    correctSound.play()
    emit('feedback', {
      text: props.option.feedback_text?.trim() || '做得很好，我们继续下一题。',
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
    text: props.option.feedback_text?.trim() || '先别着急，再根据场景线索想一想。',
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
  () => `${store.currentStepData?.id ?? 'none'}-${store.questionResetSeed}`,
  () => {
    resetVisualState()
  },
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<style scoped>
.text-option-block {
  position: relative;
  width: 100%;
  min-height: 120px;
  border: 2px solid rgb(255 255 255 / 12%);
  border-radius: 28px;
  padding: 18px 22px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  cursor: pointer;
  color: #fff;
  text-align: left;
  background: linear-gradient(135deg, rgb(15 23 42 / 84%) 0%, rgb(30 41 59 / 72%) 100%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 10%),
    0 22px 44px rgb(15 23 42 / 18%);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.text-option-block:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgb(125 211 252 / 72%);
}

.text-option-block:disabled {
  cursor: default;
}

.text-option-block.is-locked {
  opacity: 0.82;
}

.text-option-block.is-error {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgb(127 29 29 / 86%) 0%, rgb(69 10 10 / 72%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(254 202 202 / 24%),
    0 20px 42px rgb(239 68 68 / 22%);
  animation: option-shake 150ms ease-in-out;
}

.text-option-block.is-success {
  border-width: 3px;
  border-color: #22c55e;
  background: linear-gradient(135deg, rgb(22 101 52 / 88%) 0%, rgb(21 128 61 / 72%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(187 247 208 / 18%),
    0 22px 44px rgb(22 163 74 / 20%);
}

.option-badge {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  font-size: 30px;
  color: #082f49;
  background: linear-gradient(135deg, #fef08a 0%, #bfdbfe 100%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 82%);
}

.option-content {
  font-size: clamp(22px, 2.7vw, 30px);
  font-weight: 800;
  line-height: 1.45;
  text-align: center;
  text-wrap: balance;
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
  background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%);
  box-shadow: 0 12px 24px rgb(22 163 74 / 30%);
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
  .text-option-block {
    min-height: 108px;
    padding: 16px 18px;
    border-radius: 24px;
    gap: 14px;
  }

  .option-badge {
    width: 54px;
    height: 54px;
    border-radius: 18px;
    font-size: 26px;
  }

  .option-content {
    font-size: clamp(18px, 5vw, 24px);
    text-align: left;
  }
}
</style>
