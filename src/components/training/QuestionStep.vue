<template>
  <section class="question-step">
    <div class="question-step-shell">
      <Transition name="feedback-toast">
        <div
          v-if="activeToast"
          :key="activeToast.id"
          class="feedback-toast"
          :class="{
            'is-success': activeToast.tone === 'success',
            'is-error': activeToast.tone === 'error',
          }"
          role="status"
          aria-live="polite"
        >
          <span class="feedback-toast-icon" aria-hidden="true">
            {{ activeToast.tone === 'success' ? '🌟' : '💡' }}
          </span>
          <span class="feedback-toast-copy">{{ activeToast.text }}</span>
        </div>
      </Transition>

      <QuestionPresenter />
      <OptionBoard @feedback="handleFeedback" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'

import OptionBoard from './OptionBoard.vue'
import QuestionPresenter from './QuestionPresenter.vue'

interface FeedbackToastPayload {
  id: number
  text: string
  tone: 'success' | 'error'
}

interface FeedbackEventPayload {
  text: string
  tone: 'success' | 'error'
  durationMs: number
}

const store = useTrainingStore()
const activeToast = ref<FeedbackToastPayload | null>(null)
let toastSeed = 0

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
  () => store.currentStepData?.id,
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
}

.question-step-shell {
  position: relative;
  flex: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 28px;
  min-height: 0;
}

.feedback-toast {
  position: absolute;
  top: 10px;
  left: 50%;
  z-index: 3;
  width: min(100%, 680px);
  padding: 20px 24px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 28px 52px rgb(15 23 42 / 26%);
}

.feedback-toast.is-success {
  color: #14532d;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  box-shadow:
    inset 0 0 0 2px rgb(34 197 94 / 22%),
    0 28px 52px rgb(22 163 74 / 18%);
}

.feedback-toast.is-error {
  color: #7c2d12;
  background: linear-gradient(135deg, #ffedd5 0%, #fdba74 100%);
  box-shadow:
    inset 0 0 0 2px rgb(249 115 22 / 24%),
    0 28px 52px rgb(249 115 22 / 18%);
}

.feedback-toast-icon {
  font-size: 28px;
  line-height: 1;
}

.feedback-toast-copy {
  font-size: clamp(20px, 2.7vw, 28px);
  font-weight: 900;
  line-height: 1.45;
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

  .feedback-toast {
    top: 0;
    width: calc(100% - 8px);
    padding: 18px 16px;
    border-radius: 22px;
  }

  .feedback-toast-copy {
    font-size: clamp(18px, 5vw, 22px);
  }
}
</style>
