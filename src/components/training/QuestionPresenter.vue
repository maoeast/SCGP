<template>
  <section class="question-presenter" aria-live="polite">
    <div class="question-copy">
      <h1 class="question-title">{{ questionText }}</h1>
    </div>

    <button
      type="button"
      class="speaker-button"
      :class="{ 'is-speaking': isSpeaking, 'is-disabled': !canReplay }"
      :disabled="!canReplay"
      :aria-label="speakerAriaLabel"
      :title="speakerAriaLabel"
      @click="replayQuestion"
    >
      <span class="speaker-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M5 14H8L13 18V6L8 10H5V14Z"
            fill="currentColor"
          />
          <path
            d="M16 9.5C17.3333 10.3889 18 11.5556 18 13C18 14.4444 17.3333 15.6111 16 16.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            v-if="isSpeaking"
            d="M18.5 7.5C20.1667 8.83333 21 10.6667 21 13C21 15.3333 20.1667 17.1667 18.5 18.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import { createEdgeTTSService, createEdgeTTSServiceIPC } from '@/services/tts'
import { useTrainingStore } from '@/stores/useTrainingStore'

const store = useTrainingStore()

// TTS 优先级：IPC（Electron 内嵌） > HTTP 端点（旧方式） > Web Speech API
const hasIpcTTS = typeof window !== 'undefined'
  && typeof (window as any).electronAPI?.ttsSynthesize === 'function'

const edgeTtsEndpoint = (import.meta.env.VITE_EDGE_TTS_ENDPOINT as string | undefined)?.trim() ?? ''
const edgeTtsHealthcheckUrl = (import.meta.env.VITE_EDGE_TTS_HEALTHCHECK_URL as string | undefined)?.trim() ?? ''

const ttsService = hasIpcTTS
  ? createEdgeTTSServiceIPC()
  : edgeTtsEndpoint
    ? createEdgeTTSService({
      endpoint: edgeTtsEndpoint,
      healthcheckUrl: edgeTtsHealthcheckUrl || undefined,
    })
    : null

const activeAbortController = shallowRef<AbortController | null>(null)
const isSpeaking = ref(false)
const activeUtterance = shallowRef<SpeechSynthesisUtterance | null>(null)

const questionText = computed(() => {
  return store.parsedQuestionText.trim() || '请根据当前场景回答问题。'
})

const speakerAriaLabel = computed(() => {
  if (!canReplay.value) {
    return '当前无法播放题目朗读'
  }

  return isSpeaking.value ? '题目朗读播放中' : '播放题目朗读'
})

const canReplay = computed(() => {
  const hasWebSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window
  return Boolean(store.currentStepData && questionText.value && (ttsService || hasWebSpeech))
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
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  activeUtterance.value = null
  ttsService?.stop()
  isSpeaking.value = false
}

async function playQuestion(): Promise<void> {
  if (!store.currentStepData || !questionText.value) {
    store.$patch({
      availableTTSEngine: null,
    })
    return
  }

  stopQuestionPlayback()

  if (!ttsService && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(questionText.value)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.92
    utterance.pitch = 1
    activeUtterance.value = utterance
    isSpeaking.value = true
    store.$patch({
      availableTTSEngine: 'webspeech',
    })

    await new Promise<void>((resolve) => {
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    })

    if (activeUtterance.value === utterance) {
      activeUtterance.value = null
    }
    isSpeaking.value = false
    return
  }

  if (!ttsService) {
    store.$patch({
      availableTTSEngine: null,
    })
    return
  }

  const controller = new AbortController()
  activeAbortController.value = controller
  isSpeaking.value = true
  store.$patch({
    availableTTSEngine: hasIpcTTS ? 'edge-ipc' : 'edge',
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
  gap: 16px;
  padding: 22px 24px;
  border-radius: 30px;
  background: linear-gradient(180deg, rgb(15 23 42 / 58%) 0%, rgb(15 23 42 / 34%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 14%),
    0 24px 56px rgb(15 23 42 / 26%);
  backdrop-filter: blur(18px);
  align-items: start;
}

.question-copy {
  min-width: 0;
}

.question-title {
  margin: 0;
  font-size: clamp(30px, 4.2vw, 50px);
  line-height: 1.2;
  color: #fff;
  text-wrap: balance;
}

.speaker-button {
  position: relative;
  isolation: isolate;
  width: 72px;
  height: 72px;
  border: 0;
  border-radius: 24px;
  padding: 0;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  align-self: flex-start;
  color: #082f49;
  cursor: pointer;
  background: linear-gradient(135deg, rgb(255 255 255 / 96%) 0%, rgb(191 219 254 / 98%) 100%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 88%),
    0 20px 36px rgb(8 47 73 / 16%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.speaker-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #082f49;
  background: linear-gradient(135deg, #fef08a 0%, #86efac 100%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 80%);
}

.speaker-icon svg {
  width: 28px;
  height: 28px;
  display: block;
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
  opacity: 0.82;
}

.speaker-button.is-speaking::after {
  animation: speaker-ripple 1.3s ease-out infinite;
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
    width: 64px;
    height: 64px;
  }

  .question-title {
    font-size: clamp(24px, 7vw, 38px);
  }
}
</style>
