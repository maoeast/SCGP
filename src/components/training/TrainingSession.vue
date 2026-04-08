<template>
  <TrainingLayout>
    <div v-if="isLoading" class="session-status-card">
      <span class="status-kicker">加载中</span>
      <h2>正在准备训练场景...</h2>
      <p>全屏沉浸式训练原型正在初始化场景数据，请稍候。</p>
    </div>

    <div v-else-if="loadError" class="session-status-card is-error">
      <span class="status-kicker">加载失败</span>
      <h2>暂时无法进入训练</h2>
      <p>{{ loadError }}</p>
      <button type="button" class="status-button" @click="goBackToSelector">
        返回选择场景
      </button>
    </div>

    <SceneIntroStep v-else-if="store.currentStepIndex === 0" />

    <div v-else-if="store.currentStepIndex >= 1 && store.currentStepIndex <= 4" class="question-placeholder">
      <span class="placeholder-kicker">Step {{ store.currentStepIndex }}</span>
      <h2>答题区占位</h2>
      <p>{{ store.parsedQuestionText || '下一阶段将在这里接入正式的答题交互。' }}</p>
    </div>

    <div v-else class="question-placeholder is-finished">
      <span class="placeholder-kicker">Session End</span>
      <h2>训练完成占位</h2>
      <p>当前 Phase 4 仅交付壳子与引导页，后续结算页将在下一阶段接入。</p>
    </div>

    <ExitConfirmDialog />
  </TrainingLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ExitConfirmDialog from '@/components/training/ExitConfirmDialog.vue'
import SceneIntroStep from '@/components/training/SceneIntroStep.vue'
import TrainingLayout from '@/components/training/TrainingLayout.vue'
import { useTrainingStore } from '@/stores/useTrainingStore'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()

const isLoading = ref(false)
const loadError = ref('')

const sceneCode = computed(() => {
  const raw = Array.isArray(route.query.sceneCode)
    ? route.query.sceneCode[0]
    : route.query.sceneCode

  return typeof raw === 'string' ? raw.trim() : ''
})

async function hydrateScene(): Promise<void> {
  if (!sceneCode.value) {
    loadError.value = '缺少 sceneCode，当前无法从原型库加载情绪场景。请从场景选择页重新进入。'
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    await store.loadScene(sceneCode.value)
  } catch (error) {
    console.error('Failed to hydrate immersive training scene:', error)
    loadError.value = error instanceof Error ? error.message : '训练场景加载失败。'
  } finally {
    isLoading.value = false
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault()
    console.log('触发教师面板')
  }
}

function goBackToSelector(): void {
  router.push({
    path: '/emotional/emotion-scene/select',
    query: {
      ...route.query,
    },
  })
}

watch(sceneCode, () => {
  void hydrateScene()
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  void hydrateScene()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.session-status-card,
.question-placeholder {
  margin: auto;
  width: min(100%, 760px);
  padding: 32px;
  border-radius: 32px;
  color: #fff;
  background: linear-gradient(180deg, rgb(15 23 42 / 54%) 0%, rgb(15 23 42 / 36%) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 12%),
    0 28px 64px rgb(15 23 42 / 28%);
  backdrop-filter: blur(18px);
}

.session-status-card.is-error {
  background: linear-gradient(180deg, rgb(127 29 29 / 72%) 0%, rgb(69 10 10 / 56%) 100%);
}

.question-placeholder {
  text-align: center;
}

.question-placeholder.is-finished {
  background: linear-gradient(180deg, rgb(12 74 110 / 56%) 0%, rgb(15 23 42 / 38%) 100%);
}

.status-kicker,
.placeholder-kicker {
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

.session-status-card h2,
.question-placeholder h2 {
  margin: 16px 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.15;
}

.session-status-card p,
.question-placeholder p {
  margin: 0;
  font-size: 17px;
  line-height: 1.85;
  color: rgb(255 255 255 / 84%);
}

.status-button {
  margin-top: 22px;
  border: 0;
  border-radius: 18px;
  padding: 14px 18px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  background: linear-gradient(135deg, #fef08a 0%, #7dd3fc 100%);
  box-shadow: 0 18px 32px rgb(125 211 252 / 24%);
}

@media (max-width: 768px) {
  .session-status-card,
  .question-placeholder {
    width: 100%;
    padding: 24px 20px;
    border-radius: 24px;
  }

  .session-status-card p,
  .question-placeholder p {
    font-size: 15px;
    line-height: 1.75;
  }
}
</style>
