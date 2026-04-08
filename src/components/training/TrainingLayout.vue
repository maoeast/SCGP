<template>
  <div class="training-layout" :style="backgroundStyle">
    <div class="training-overlay">
      <header class="training-header">
        <div class="progress-stage">
          <div v-if="showProgress" class="progress-shell">
            <div
              v-for="step in progressSteps"
              :key="step"
              class="progress-pill"
              :class="{
                'is-active': store.currentStepIndex === step,
                'is-complete': store.currentStepIndex > step,
              }"
            >
              Step {{ step }}
            </div>
          </div>
          <div v-else class="progress-placeholder">
            沉浸式训练引导中
          </div>
        </div>

        <button
          type="button"
          class="exit-trigger"
          aria-label="退出训练"
          @click="store.toggleExitModal(true)"
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
const progressSteps = [1, 2, 3, 4] as const

const showProgress = computed(() => {
  return store.currentStepIndex >= 1 && store.currentStepIndex <= 4
})

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
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

.training-overlay {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgb(15 23 42 / 12%) 0%, rgb(15 23 42 / 8%) 36%, rgb(0 0 0 / 44%) 100%),
    rgb(0 0 0 / 18%);
}

.training-header {
  display: flex;
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
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgb(15 23 42 / 26%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 16%);
}

.progress-pill {
  min-width: 82px;
  border-radius: 999px;
  padding: 8px 14px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: rgb(255 255 255 / 76%);
  background: rgb(255 255 255 / 8%);
  transition:
    transform 0.22s ease,
    background-color 0.22s ease,
    color 0.22s ease;
}

.progress-pill.is-active {
  color: #0f172a;
  background: linear-gradient(135deg, #fef08a 0%, #f9a8d4 100%);
  transform: translateY(-1px);
}

.progress-pill.is-complete {
  color: #e0f2fe;
  background: rgb(34 197 94 / 28%);
}

.progress-placeholder {
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: rgb(255 255 255 / 80%);
  text-transform: uppercase;
  background: rgb(255 255 255 / 10%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 14%);
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
  display: flex;
  align-items: stretch;
  justify-content: center;
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
    padding: 16px 16px 0;
  }

  .training-main {
    padding: 8px 12px 12px;
  }

  .progress-shell {
    gap: 8px;
    padding: 10px 12px;
    border-radius: 24px;
  }

  .progress-pill {
    min-width: 70px;
    padding: 7px 12px;
    font-size: 12px;
  }

  .exit-trigger {
    width: 46px;
    height: 46px;
    border-radius: 16px;
  }
}
</style>
