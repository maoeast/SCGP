<template>
  <div class="training-layout" :style="backgroundStyle">
    <div class="training-overlay">
      <header class="training-header">
        <div class="progress-stage">
          <div class="progress-shell" role="list" aria-label="训练进度">
            <div
              v-for="step in progressSteps"
              :key="step"
              class="progress-dot"
              :class="{
                'is-active': store.currentStepIndex === step,
                'is-complete': store.currentStepIndex > step || store.currentStepIndex === store.resultStepIndex,
              }"
              :aria-label="`Step ${step}`"
              role="listitem"
            />
          </div>
        </div>

        <div class="scene-stage">
          <div class="scene-chip">
            <span class="scene-chip-label">当前场景</span>
            <strong>{{ sceneTitle }}</strong>
          </div>
        </div>

        <button
          type="button"
          class="exit-trigger"
          aria-label="退出训练"
          @click="handleExit"
        >
          <span>X</span>
        </button>
      </header>

      <main class="training-main" :class="{ 'is-transitioning': store.isTransitioning }">
        <Transition name="training-fade" mode="out-in">
          <div :key="store.currentStepIndex" class="training-stage">
            <slot />
          </div>
        </Transition>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'
import { resolvePresetResourceUrl } from '@/utils/preset-resource'

const store = useTrainingStore()
const progressSteps = computed(() => {
  return Array.from({ length: store.questionStepCount }, (_, index) => index + 1)
})

const sceneTitle = computed(() => {
  return store.scene?.title?.trim() || '情绪场景训练'
})

function handleExit(): void {
  if (store.currentStepIndex === store.resultStepIndex) {
    store.exitTraining()
    return
  }

  store.toggleExitModal(true)
}

const backgroundStyle = computed(() => {
  const backgroundImage = resolvePresetResourceUrl(store.scene?.background_image_url || '')
  if (!backgroundImage) {
    return {
      background:
        'radial-gradient(circle at top, rgb(59 130 246 / 0.45), transparent 42%), linear-gradient(160deg, #10233d 0%, #0f172a 55%, #111827 100%)',
    }
  }

  return {
    backgroundImage: `url("${backgroundImage}")`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  }
})
</script>

<style scoped>
.training-layout {
  height: 100vh;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.training-overlay {
  height: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgb(0 0 0 / 20%);
}

.training-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 28px 0;
}

.progress-stage {
  min-height: 56px;
  display: flex;
  align-items: center;
}

.progress-shell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 999px;
  background: rgb(15 23 42 / 26%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 16%);
}

.progress-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: rgb(255 255 255 / 22%);
  transition:
    transform 0.22s ease,
    background-color 0.22s ease,
    width 0.22s ease;
}

.progress-dot.is-active {
  width: 42px;
  background: linear-gradient(135deg, #fdba74 0%, #fb7185 100%);
  transform: translateY(-1px);
}

.progress-dot.is-complete {
  background: #22c55e;
}

.scene-stage {
  min-width: 0;
  display: flex;
  justify-content: center;
}

.scene-chip {
  min-width: min(100%, 320px);
  max-width: min(100%, 560px);
  padding: 12px 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  background: rgb(15 23 42 / 30%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 12%),
    0 18px 34px rgb(15 23 42 / 16%);
}

.scene-chip-label {
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 66%);
}

.scene-chip strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 800;
}

.exit-trigger {
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  cursor: pointer;
  background: rgb(15 23 42 / 48%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 18%),
    0 14px 28px rgb(15 23 42 / 28%);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
}

.exit-trigger:hover {
  transform: translateY(-1px);
  background: rgb(15 23 42 / 64%);
}

.exit-trigger:active {
  transform: scale(0.96);
}

.training-main {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  overflow: hidden;
  padding: 12px 20px 20px;
  transition: opacity 0.2s ease;
}

.training-main.is-transitioning {
  pointer-events: none;
}

.training-stage {
  flex: 1;
  display: flex;
  min-height: 0;
}

.training-fade-enter-active,
.training-fade-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.training-fade-enter-from,
.training-fade-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.985);
}

@media (max-width: 768px) {
  .training-header {
    grid-template-columns: 1fr auto;
    padding: 16px 16px 0;
  }

  .scene-stage {
    grid-column: 1 / -1;
    order: 3;
  }

  .training-main {
    padding: 8px 12px 12px;
  }

  .progress-shell {
    gap: 8px;
    padding: 10px 12px;
    border-radius: 24px;
  }

  .progress-dot {
    width: 12px;
    height: 12px;
  }

  .progress-dot.is-active {
    width: 34px;
  }

  .scene-chip {
    width: 100%;
    min-width: 0;
    padding: 10px 14px;
  }

  .exit-trigger {
    width: 46px;
    height: 46px;
    border-radius: 16px;
  }
}

@supports (height: 100dvh) {
  .training-layout {
    height: 100dvh;
    min-height: 100dvh;
  }

  .training-overlay {
    min-height: 100dvh;
  }
}
</style>
