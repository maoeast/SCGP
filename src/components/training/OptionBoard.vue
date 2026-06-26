<template>
  <section class="option-board">
    <div v-if="!currentStep" class="option-board-empty">
      当前步骤还没有可用选项。
    </div>

    <div v-else class="emotion-board">
      <div
        class="option-grid is-emotion"
        :class="{ 'is-care-emotion': currentStep?.step_type === 'care_emotion' }"
      >
        <ImageOptionCard
          v-for="option in currentStep.options"
          :key="option.id"
          :option="option"
          :selected="selectedEmotionOptionId === option.id"
          :feedback-state="submittedEmotionOptionId === option.id ? emotionFeedbackState : 'idle'"
          :disabled="store.inputLocked"
          @select="submitEmotionOption(option.id)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useSound } from '@/composables/useSound'
import { useTrainingStore } from '@/stores/useTrainingStore'

import ImageOptionCard from './ImageOptionCard.vue'
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
  if (!step || (step.step_type !== 'emotion' && step.step_type !== 'care_emotion')) {
    return null
  }

  return step
})
const selectedEmotionOptionId = ref<number | null>(null)
const submittedEmotionOptionId = ref<number | null>(null)
const emotionFeedbackState = ref<'idle' | 'error' | 'success'>('idle')
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

function resetEmotionBoardState(): void {
  clearTimers()
  selectedEmotionOptionId.value = null
  submittedEmotionOptionId.value = null
  emotionFeedbackState.value = 'idle'
}

function submitEmotionOption(optionId: number): void {
  if (store.inputLocked || !currentStep.value) {
    return
  }

  selectedEmotionOptionId.value = optionId
  submittedEmotionOptionId.value = optionId
  emotionFeedbackState.value = 'idle'

  const selectedOption = currentStep.value.options.find((option) => option.id === optionId)
  if (!selectedOption) {
    return
  }

  store.$patch({
    inputLocked: true,
  })

  submittedEmotionOptionId.value = selectedOption.id

  if (selectedOption.is_correct) {
    emotionFeedbackState.value = 'success'
    store.showRewardOverlay = true
    correctSound.play()
    emit('feedback', {
      text: selectedOption.feedback_text?.trim() || '观察的真仔细，让我们继续吧。',
      tone: 'success',
      durationMs: TRAINING_SUCCESS_FEEDBACK_MS,
    })

    schedule(() => {
      store.recordAnswer(Number(store.currentStepIndex), selectedOption.id)
      void store.nextStep()
    }, TRAINING_SUCCESS_FEEDBACK_MS)
    return
  }

  emotionFeedbackState.value = 'error'
  errorSound.play()
  emit('feedback', {
    text: selectedOption.feedback_text?.trim() || '再仔细看一看画面和线索哦。',
    tone: 'error',
    durationMs: TRAINING_ERROR_RESET_MS,
  })

  schedule(() => {
    store.recordError(Number(store.currentStepIndex), selectedOption.id)
  }, TRAINING_ERROR_FEEDBACK_MS)

  schedule(() => {
    resetEmotionBoardState()
    store.$patch({
      inputLocked: false,
    })
  }, TRAINING_ERROR_RESET_MS)
}

watch(
  () => `${store.currentStepData?.id ?? 'none'}-${store.questionResetSeed}`,
  () => {
    resetEmotionBoardState()
  },
)

onBeforeUnmount(() => {
  resetEmotionBoardState()
})
</script>

<style scoped>
.option-board {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-height: 0;
}

.option-board-empty {
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

.option-grid {
  width: min(100%, 1120px);
  display: grid;
  gap: 20px;
}

.emotion-board {
  flex: 1;
  width: min(100%, 1100px);
  display: flex;
  align-items: center;
  justify-content: center;
  justify-items: center;
}

.option-grid.is-emotion {
  width: min(100%, 760px);
  grid-template-columns: repeat(3, minmax(200px, 1fr));
  align-items: stretch;
  justify-content: center;
  justify-items: stretch;
}

.option-grid.is-emotion.is-care-emotion {
  width: min(100%, 840px);
  grid-template-columns: repeat(2, minmax(220px, 1fr));
}

@media (max-width: 900px) {
  .option-grid {
    gap: 16px;
  }

  .option-grid.is-emotion {
    width: min(100%, 560px);
    grid-template-columns: repeat(3, minmax(160px, 1fr));
  }

  .option-grid.is-emotion.is-care-emotion {
    width: min(100%, 620px);
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 640px) {
  .option-grid.is-emotion {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
