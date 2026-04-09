<template>
  <section class="text-step-board">
    <div v-if="!currentStep" class="text-step-empty">
      当前步骤还没有可用选项。
    </div>

    <div v-else-if="currentStep.options.length === 0" class="text-step-empty">
      当前步骤的选项还没有加载完整，请重新进入该训练场景。
    </div>

    <div v-else class="text-step-grid">
      <button
        v-for="option in currentStep.options"
        :key="option.id"
        type="button"
        class="text-option-card"
        :class="{
          'is-error': submittedOptionId === option.id && feedbackState === 'error',
          'is-success': submittedOptionId === option.id && feedbackState === 'success',
          'is-locked': store.inputLocked && submittedOptionId !== option.id,
        }"
        :disabled="store.inputLocked || (submittedOptionId === option.id && feedbackState === 'success')"
        @click="submitOption(option.id)"
      >
        <span class="text-option-badge" aria-hidden="true">{{ getLeadingIcon(option.content) }}</span>
        <span class="text-option-copy">{{ option.content }}</span>
        <span
          v-if="submittedOptionId === option.id && feedbackState === 'success'"
          class="text-option-check"
          aria-hidden="true"
        >
          ✓
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useSound } from '@/composables/useSound'
import { useTrainingStore } from '@/stores/useTrainingStore'

import {
  TRAINING_CORRECT_SFX,
  TRAINING_ERROR_FEEDBACK_MS,
  TRAINING_ERROR_RESET_MS,
  TRAINING_ERROR_SFX,
  TRAINING_SUCCESS_FEEDBACK_MS,
} from './training-feedback-sfx'

const emit = defineEmits<{
  feedback: [payload: {
    text: string
    tone: 'success' | 'error'
    durationMs: number
  }]
}>()

const store = useTrainingStore()

const currentStep = computed(() => {
  const step = store.currentStepData
  if (!step || step.step_type === 'emotion') {
    return null
  }

  return step
})

const submittedOptionId = ref<number | null>(null)
const feedbackState = ref<'idle' | 'error' | 'success'>('idle')
const timers: number[] = []

const correctSound = useSound({
  src: TRAINING_CORRECT_SFX,
  volume: 0.4,
})

const errorSound = useSound({
  src: TRAINING_ERROR_SFX,
  volume: 0.45,
})

function clearTimers(): void {
  timers.forEach((timerId) => window.clearTimeout(timerId))
  timers.length = 0
}

function schedule(callback: () => void, delayMs: number): void {
  const timerId = window.setTimeout(callback, delayMs)
  timers.push(timerId)
}

function resetBoardState(): void {
  clearTimers()
  submittedOptionId.value = null
  feedbackState.value = 'idle'
}

function getLeadingIcon(content: string): string {
  const normalized = content.trim()
  if (normalized.includes('老师') || normalized.includes('帮助')) {
    return '🧭'
  }

  if (normalized.includes('安慰') || normalized.includes('陪')) {
    return '💛'
  }

  if (normalized.includes('深呼吸') || normalized.includes('冷静')) {
    return '🌿'
  }

  return '✦'
}

function submitOption(optionId: number): void {
  if (store.inputLocked || !currentStep.value) {
    return
  }

  const selectedOption = currentStep.value.options.find((option) => option.id === optionId)
  if (!selectedOption) {
    return
  }

  clearTimers()
  submittedOptionId.value = optionId
  feedbackState.value = 'idle'

  store.$patch({
    inputLocked: true,
  })

  if (selectedOption.is_correct) {
    feedbackState.value = 'success'
    store.showRewardOverlay = true
    correctSound.play()
    emit('feedback', {
      text: selectedOption.feedback_text?.trim() || '做得很好，我们继续下一题。',
      tone: 'success',
      durationMs: TRAINING_SUCCESS_FEEDBACK_MS,
    })

    schedule(() => {
      store.recordAnswer(Number(store.currentStepIndex), selectedOption.id)
      void store.nextStep()
    }, TRAINING_SUCCESS_FEEDBACK_MS)

    return
  }

  feedbackState.value = 'error'
  errorSound.play()
  emit('feedback', {
    text: selectedOption.feedback_text?.trim() || '先别着急，再根据场景线索想一想。',
    tone: 'error',
    durationMs: TRAINING_ERROR_RESET_MS,
  })

  schedule(() => {
    store.recordError(Number(store.currentStepIndex))
  }, TRAINING_ERROR_FEEDBACK_MS)

  schedule(() => {
    submittedOptionId.value = null
    feedbackState.value = 'idle'
    store.$patch({
      inputLocked: false,
    })
  }, TRAINING_ERROR_RESET_MS)
}

watch(
  () => `${store.currentStepData?.id ?? 'none'}-${store.questionResetSeed}`,
  () => {
    resetBoardState()
  },
)

onBeforeUnmount(() => {
  resetBoardState()
})
</script>

<style scoped>
.text-step-board {
  width: 100%;
  display: flex;
  justify-content: center;
}

.text-step-empty {
  width: min(100%, 520px);
  padding: 28px;
  border-radius: 24px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  color: rgb(255 255 255 / 86%);
  background: rgb(15 23 42 / 42%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 12%);
}

.text-step-grid {
  width: min(100%, 980px);
  display: grid;
  gap: 18px;
}

.text-option-card {
  position: relative;
  width: 100%;
  min-height: 108px;
  border: 2px solid rgb(255 255 255 / 12%);
  border-radius: 28px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  cursor: pointer;
  color: #fff;
  text-align: left;
  background: linear-gradient(135deg, rgb(15 23 42 / 86%) 0%, rgb(30 41 59 / 74%) 100%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 10%),
    0 18px 36px rgb(15 23 42 / 20%);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.text-option-card:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgb(125 211 252 / 72%);
}

.text-option-card:disabled {
  cursor: default;
}

.text-option-card.is-locked {
  opacity: 0.82;
}

.text-option-card.is-error {
  border-color: #ef4444;
  background: linear-gradient(135deg, rgb(127 29 29 / 86%) 0%, rgb(69 10 10 / 72%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(254 202 202 / 24%),
    0 20px 42px rgb(239 68 68 / 22%);
  animation: option-shake 150ms ease-in-out;
}

.text-option-card.is-success {
  border-width: 3px;
  border-color: #22c55e;
  background: linear-gradient(135deg, rgb(22 101 52 / 88%) 0%, rgb(21 128 61 / 72%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(187 247 208 / 18%),
    0 22px 44px rgb(22 163 74 / 20%);
}

.text-option-badge {
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

.text-option-copy {
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 800;
  line-height: 1.38;
  text-align: center;
  text-wrap: balance;
}

.text-option-check {
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
  .text-step-grid {
    gap: 16px;
  }

  .text-option-card {
    min-height: 96px;
    padding: 14px 16px;
    border-radius: 24px;
    gap: 14px;
  }

  .text-option-badge {
    width: 54px;
    height: 54px;
    border-radius: 18px;
    font-size: 26px;
  }

  .text-option-copy {
    font-size: clamp(18px, 5vw, 24px);
    text-align: left;
  }
}
</style>
