<template>
  <section class="intro-step">
    <div class="intro-topbar">
      <div class="name-badge">
        <span class="name-badge-label">{{ nameBadgeLabel }}</span>
        <strong>{{ characterName }}</strong>
      </div>
    </div>

    <div class="intro-body">
      <div class="intro-copy-card">
        <h1 class="intro-title">准备好了吗？我们先来看看发生了什么事吧！</h1>
        <p class="intro-description">
          <span class="intro-description-label">【教学目标】</span>
          {{ sceneDescription }}
        </p>
      </div>

    </div>

    <div class="intro-footer">
      <button
        type="button"
        class="ready-button"
        :disabled="store.inputLocked"
        @click="store.nextStep()"
      >
        我准备好了
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'

const store = useTrainingStore()

const characterName = computed(() => {
  return store.scene?.character_name?.trim() || '小朋友'
})

const nameBadgeLabel = computed(() => {
  return store.scene?.variant === 'care_scene' ? '需要被关心的人' : '场景主角'
})

const sceneDescription = computed(() => {
  if (store.scene?.description?.trim()) {
    return store.scene.description.trim()
  }

  return store.scene?.variant === 'care_scene'
    ? '请认真看看对方发生了什么，再想一想怎样说会更让TA舒服。'
    : '请认真观察人物、表情和周围线索，准备进入下一步。'
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
  background: rgb(15 23 42 / 28%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 16%),
    0 18px 36px rgb(15 23 42 / 26%);
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
  grid-template-columns: minmax(0, 1fr);
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
  background: linear-gradient(180deg, rgb(15 23 42 / 34%) 0%, rgb(15 23 42 / 18%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 12%),
    0 28px 60px rgb(15 23 42 / 24%);
}

.intro-title {
  margin: 0 0 14px;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.08;
}

.intro-description {
  margin: 0;
  max-width: 32em;
  font-size: 18px;
  line-height: 1.9;
  color: rgb(255 255 255 / 72%);
}

.intro-description-label {
  display: inline-block;
  margin-right: 6px;
  font-weight: 700;
  color: rgb(255 255 255 / 78%);
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
  color: #fff;
  cursor: pointer;
  background: #f7c948;
  box-shadow:
    0 24px 54px rgb(245 158 11 / 24%),
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

  .ready-button {
    width: 100%;
    min-width: 0;
    padding: 20px 22px;
  }
}
</style>
