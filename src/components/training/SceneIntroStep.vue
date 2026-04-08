<template>
  <section class="intro-step">
    <div class="intro-topbar">
      <div class="name-badge">
        <span class="name-badge-label">场景主角</span>
        <strong>{{ characterName }}</strong>
      </div>
    </div>

    <div class="intro-body">
      <div class="intro-copy-card">
        <span class="intro-kicker">Step 0 · 先观察</span>
        <h1 class="intro-title">先看看发生了什么，再准备回答问题。</h1>
        <p class="intro-description">
          {{ sceneDescription }}
        </p>
      </div>

      <div class="clue-cloud" aria-live="polite">
        <span
          v-for="(clue, index) in visibleClues"
          :key="`${clue}-${index}`"
          class="clue-chip"
        >
          {{ clue }}
        </span>
      </div>
    </div>

    <div class="intro-footer">
      <button
        type="button"
        class="ready-button"
        :disabled="store.inputLocked"
        @click="store.nextStep()"
      >
        我看好了 ->
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'

const store = useTrainingStore()

const mockClues = ['面部肌肉放松', '图书平铺在腿上'] as const
const visibleClues = ref<string[]>([])
const timers: number[] = []

const characterName = computed(() => {
  return store.scene?.character_name?.trim() || '小朋友'
})

const sceneDescription = computed(() => {
  return store.scene?.description?.trim() || '请认真观察人物、表情和周围线索，准备进入下一步。'
})

onMounted(() => {
  visibleClues.value = []
  mockClues.forEach((clue, index) => {
    const timerId = window.setTimeout(() => {
      visibleClues.value = [...visibleClues.value, clue]
    }, (index + 1) * 800)
    timers.push(timerId)
  })
})

onBeforeUnmount(() => {
  timers.forEach((timerId) => window.clearTimeout(timerId))
})
</script>

<style scoped>
.intro-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 10px 24px;
  color: #fff;
}

.intro-topbar {
  display: flex;
  justify-content: flex-start;
}

.name-badge {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  max-width: min(100%, 240px);
  padding: 14px 18px;
  border-radius: 20px;
  background: rgb(15 23 42 / 36%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 16%),
    0 18px 36px rgb(15 23 42 / 26%);
  backdrop-filter: blur(16px);
}

.name-badge-label {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 68%);
}

.name-badge strong {
  font-size: 24px;
  font-weight: 800;
}

.intro-body {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 24px;
  align-items: end;
  flex: 1;
  padding-top: 48px;
}

.intro-copy-card {
  align-self: center;
  max-width: 760px;
  padding: 28px 30px;
  border-radius: 32px;
  background: linear-gradient(180deg, rgb(15 23 42 / 48%) 0%, rgb(15 23 42 / 28%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 12%),
    0 28px 60px rgb(15 23 42 / 24%);
  backdrop-filter: blur(18px);
}

.intro-kicker {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f172a;
  background: linear-gradient(135deg, #bfdbfe 0%, #fef08a 100%);
}

.intro-title {
  margin: 18px 0 14px;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.08;
}

.intro-description {
  margin: 0;
  max-width: 32em;
  font-size: 18px;
  line-height: 1.9;
  color: rgb(255 255 255 / 82%);
}

.clue-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-content: flex-end;
  justify-content: flex-start;
  min-height: 180px;
  padding: 18px;
}

.clue-chip {
  display: inline-flex;
  align-items: center;
  padding: 14px 18px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  color: #082f49;
  background: linear-gradient(135deg, rgb(255 255 255 / 94%) 0%, rgb(186 230 253 / 94%) 100%);
  box-shadow: 0 18px 36px rgb(8 47 73 / 18%);
  animation: clue-pop 0.45s ease;
}

.intro-footer {
  display: flex;
  justify-content: center;
  padding-top: 28px;
}

.ready-button {
  min-width: min(100%, 380px);
  border: 0;
  border-radius: 999px;
  padding: 24px 34px;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #082f49;
  cursor: pointer;
  background: linear-gradient(135deg, #fef08a 0%, #86efac 52%, #7dd3fc 100%);
  box-shadow:
    0 24px 54px rgb(125 211 252 / 26%),
    inset 0 1px 0 rgb(255 255 255 / 70%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.ready-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.ready-button:active:not(:disabled) {
  transform: scale(0.95);
}

.ready-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

@keyframes clue-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.94);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 960px) {
  .intro-step {
    padding: 8px 4px 16px;
  }

  .intro-body {
    grid-template-columns: 1fr;
    align-items: center;
    padding-top: 24px;
  }

  .intro-copy-card {
    padding: 22px 20px;
    border-radius: 26px;
  }

  .intro-title {
    font-size: clamp(30px, 10vw, 44px);
  }

  .intro-description {
    font-size: 16px;
    line-height: 1.8;
  }

  .clue-cloud {
    min-height: 120px;
    padding: 4px 6px 0;
  }

  .ready-button {
    width: 100%;
    min-width: 0;
    padding: 20px 22px;
  }
}
</style>
