<template>
  <section class="question-presenter" aria-live="polite">
    <div class="question-copy">
      <span class="question-kicker">Step {{ store.currentStepIndex }} · 听题并作答</span>
      <h1 class="question-title">{{ questionText }}</h1>
    </div>

    <button
      type="button"
      class="speaker-button"
      :class="{ 'is-speaking': isSpeaking, 'is-disabled': !canReplay }"
      :disabled="!canReplay"
      aria-label="朗读题目"
      @click="replayQuestion"
    >
      <span class="speaker-icon" aria-hidden="true">{{ isSpeaking ? '🔊' : '🔈' }}</span>
      <span class="speaker-copy">
        {{ isSpeaking ? '正在播报' : canReplay ? '再听一遍' : '暂不可播报' }}
      </span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import { createEdgeTTSService } from '@/services/tts'
import { useTrainingStore } from '@/stores/useTrainingStore'

const store = useTrainingStore()

const edgeTtsEndpoint = (import.meta.env.VITE_EDGE_TTS_ENDPOINT as string | undefined)?.trim() ?? ''
const edgeTtsHealthcheckUrl = (import.meta.env.VITE_EDGE_TTS_HEALTHCHECK_URL as string | undefined)?.trim() ?? ''

const ttsService = edgeTtsEndpoint
  ? createEdgeTTSService({
    endpoint: edgeTtsEndpoint,
    healthcheckUrl: edgeTtsHealthcheckUrl || undefined,
  })
  : null

const activeAbortController = shallowRef<AbortController | null>(null)
const isSpeaking = ref(false)

const questionText = computed(() => {
  return store.parsedQuestionText.trim() || '请根据当前场景回答问题。'
})

const canReplay = computed(() => {
  return Boolean(ttsService && store.currentStepData && questionText.value)
})

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function stopQuestionPlayback(): void {
  const controller = activeAbortController.value
  if (controller && !controller.signal.aborted) {
    controller.abort()
  }

  activeAbortController.value = null
  ttsService?.stop()
  isSpeaking.value = false
}

async function playQuestion(): Promise<void> {
  if (!ttsService || !store.currentStepData || !questionText.value) {
    store.$patch({
      availableTTSEngine: null,
    })
    return
  }

  stopQuestionPlayback()

  const controller = new AbortController()
  activeAbortController.value = controller
  isSpeaking.value = true
  store.$patch({
    availableTTSEngine: 'edge',
  })

  try {
    await ttsService.play(questionText.value, controller.signal)
  } catch (error) {
    if (!isAbortError(error)) {
      console.warn('QuestionPresenter TTS playback failed:', error)
      store.$patch({
        availableTTSEngine: null,
      })
    }
  } finally {
    if (activeAbortController.value === controller) {
      activeAbortController.value = null
    }
    isSpeaking.value = false
  }
}

function replayQuestion(): void {
  void playQuestion()
}

watch(
  () => [store.currentStepIndex, store.parsedQuestionText] as const,
  ([stepIndex, parsedQuestionText]) => {
    if (stepIndex >= 1 && stepIndex <= 4 && parsedQuestionText.trim()) {
      void playQuestion()
      return
    }

    stopQuestionPlayback()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopQuestionPlayback()
})
</script>

<style scoped>
.question-presenter {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 26px 28px;
  border-radius: 30px;
  background: linear-gradient(180deg, rgb(15 23 42 / 58%) 0%, rgb(15 23 42 / 34%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 14%),
    0 24px 56px rgb(15 23 42 / 26%);
  backdrop-filter: blur(18px);
}

.question-copy {
  min-width: 0;
}

.question-kicker {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #082f49;
  background: linear-gradient(135deg, #fde68a 0%, #bfdbfe 100%);
}

.question-title {
  margin: 16px 0 0;
  font-size: clamp(28px, 4.4vw, 48px);
  line-height: 1.24;
  color: #fff;
  text-wrap: balance;
}

.speaker-button {
  position: relative;
  isolation: isolate;
  min-width: 148px;
  border: 0;
  border-radius: 24px;
  padding: 18px 20px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #082f49;
  cursor: pointer;
  background: linear-gradient(135deg, rgb(255 255 255 / 94%) 0%, rgb(186 230 253 / 96%) 100%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 85%),
    0 20px 34px rgb(8 47 73 / 16%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.speaker-button::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 30px;
  border: 2px solid rgb(125 211 252 / 0%);
  opacity: 0;
  pointer-events: none;
}

.speaker-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.speaker-button:active:not(:disabled) {
  transform: scale(0.97);
}

.speaker-button.is-disabled {
  opacity: 0.62;
}

.speaker-button.is-speaking::after {
  animation: speaker-ripple 1.3s ease-out infinite;
}

.speaker-icon {
  font-size: 30px;
}

.speaker-copy {
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

@keyframes speaker-ripple {
  0% {
    opacity: 0;
    transform: scale(0.9);
    border-color: rgb(125 211 252 / 0%);
  }

  20% {
    opacity: 0.9;
    border-color: rgb(125 211 252 / 88%);
  }

  100% {
    opacity: 0;
    transform: scale(1.08);
    border-color: rgb(125 211 252 / 0%);
  }
}

@media (max-width: 900px) {
  .question-presenter {
    grid-template-columns: 1fr;
    padding: 22px 20px;
    border-radius: 24px;
  }

  .speaker-button {
    width: 100%;
    min-width: 0;
    flex-direction: row;
    justify-content: center;
  }

  .question-title {
    font-size: clamp(24px, 7vw, 38px);
  }
}
</style>
