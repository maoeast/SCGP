<template>
  <section
    class="question-step"
    :class="{
      'is-text-step': store.currentStepData?.step_type !== 'emotion' && store.currentStepData?.step_type !== 'care_emotion',
    }"
  >
    <div class="question-step-shell">
      <Transition name="feedback-toast">
        <div
          v-if="activeToast"
          :key="activeToast.id"
          class="feedback-toast"
          :class="{
            'is-success': activeToast.tone === 'success',
            'is-acceptable': activeToast.tone === 'acceptable',
            'is-error': activeToast.tone === 'error',
          }"
          role="status"
          aria-live="polite"
        >
          <div class="feedback-toast-avatar" aria-hidden="true">
            <svg
              v-if="activeToast.tone !== 'error'"
              class="feedback-toast-icon"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12.5L9.2 16.7L19 7.5"
                stroke="currentColor"
                stroke-width="3.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>

            <svg
              v-else
              class="feedback-toast-icon"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 6.5V13"
                stroke="currentColor"
                stroke-width="3.2"
                stroke-linecap="round"
              />
              <circle cx="12" cy="17.2" r="1.6" fill="currentColor" />
            </svg>
          </div>
          <div class="feedback-toast-copy">
            <strong class="feedback-toast-title">
              {{ resolveToastTitle(activeToast.tone) }}
            </strong>
            <span class="feedback-toast-body">{{ activeToast.text }}</span>
          </div>
        </div>
      </Transition>

      <QuestionPresenter />
      <OptionBoard
        v-if="store.currentStepData?.step_type === 'emotion' || store.currentStepData?.step_type === 'care_emotion'"
        @feedback="handleFeedback"
      />
      <TextStepBoard
        v-else
        @feedback="handleFeedback"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'

import OptionBoard from './OptionBoard.vue'
import QuestionPresenter from './QuestionPresenter.vue'
import TextStepBoard from './TextStepBoard.vue'

interface FeedbackToastPayload {
  id: number
  text: string
  tone: 'success' | 'acceptable' | 'error'
}

interface FeedbackEventPayload {
  text: string
  tone: 'success' | 'acceptable' | 'error'
  durationMs: number
}

const store = useTrainingStore()
const activeToast = ref<FeedbackToastPayload | null>(null)
let toastSeed = 0

function resolveToastTitle(tone: FeedbackToastPayload['tone']): string {
  if (tone === 'success') {
    return '太棒了！'
  }

  if (tone === 'acceptable') {
    return '这样也可以'
  }

  return '再试一次'
}

function hideToast(): void {
  activeToast.value = null
}

function handleFeedback(payload: FeedbackEventPayload): void {
  toastSeed += 1
  activeToast.value = {
    id: toastSeed,
    text: payload.text,
    tone: payload.tone,
  }
}

watch(
  () => `${store.currentStepData?.id ?? 'none'}-${store.questionResetSeed}`,
  () => {
    hideToast()
  },
)

onBeforeUnmount(() => {
  hideToast()
})
</script>

<style scoped>
.question-step {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 10px 8px 18px;
  overflow: hidden;
}

.question-step-shell {
  position: relative;
  flex: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 28px;
  min-height: 0;
  overflow: hidden;
}

.question-step.is-text-step .question-step-shell {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 22px;
  overflow: visible;
}

.feedback-toast {
  position: absolute;
  top: 112px;
  left: 50%;
  z-index: 3;
  width: fit-content;
  max-width: 600px;
  padding: 20px 24px;
  border-radius: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  text-align: left;
  transform: translateX(-50%);
  box-shadow: 0 10px 25px rgb(15 23 42 / 12%);
}

.feedback-toast.is-success {
  color: #14532d;
  background: #e8f5e9;
  box-shadow:
    inset 0 0 0 1px rgb(34 197 94 / 16%),
    0 10px 25px rgb(34 197 94 / 12%);
}

.feedback-toast.is-acceptable {
  color: #92400e;
  background: #fff7e8;
  box-shadow:
    inset 0 0 0 1px rgb(245 158 11 / 18%),
    0 10px 25px rgb(245 158 11 / 12%);
}

.feedback-toast.is-error {
  color: #9a3412;
  background: #fff3e0;
  box-shadow:
    inset 0 0 0 1px rgb(249 115 22 / 16%),
    0 10px 25px rgb(249 115 22 / 12%);
}

.feedback-toast-avatar {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 18px rgb(15 23 42 / 12%);
}

.feedback-toast.is-success .feedback-toast-avatar {
  background: linear-gradient(135deg, #86efac 0%, #34d399 100%);
}

.feedback-toast.is-acceptable .feedback-toast-avatar {
  background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
}

.feedback-toast.is-error .feedback-toast-avatar {
  background: linear-gradient(135deg, #fdba74 0%, #fb923c 100%);
}

.feedback-toast-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.feedback-toast-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 0 1 auto;
  max-width: 480px;
}

.feedback-toast-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
}

.feedback-toast.is-success .feedback-toast-title {
  color: #166534;
}

.feedback-toast.is-acceptable .feedback-toast-title {
  color: #b45309;
}

.feedback-toast.is-error .feedback-toast-title {
  color: #c2410c;
}

.feedback-toast-body {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
  color: #3f3f46;
  text-wrap: balance;
}

.feedback-toast-enter-active,
.feedback-toast-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.feedback-toast-enter-from,
.feedback-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.96);
}

@media (max-width: 900px) {
  .question-step {
    padding: 4px 0 12px;
  }

  .question-step-shell {
    gap: 18px;
  }

  .question-step.is-text-step .question-step-shell {
    gap: 18px;
  }

  .feedback-toast {
    top: 96px;
    width: min(calc(100% - 12px), 100%);
    padding: 18px 18px;
    gap: 12px;
    border-radius: 18px;
  }

  .feedback-toast-avatar {
    width: 44px;
    height: 44px;
  }

  .feedback-toast-icon {
    width: 22px;
    height: 22px;
  }

  .feedback-toast-title {
    font-size: 18px;
  }

  .feedback-toast-body {
    font-size: 15px;
  }
}
</style>
