<template>
  <TrainingLayout>
    <div v-if="isLoading" class="session-status-card">
      <span class="status-kicker">加载中</span>
      <h2>正在准备关心情境...</h2>
      <p>沉浸式表达关心训练正在整理当前场景和步骤，请稍候。</p>
    </div>

    <div v-else-if="loadError" class="session-status-card is-error">
      <span class="status-kicker">加载失败</span>
      <h2>暂时无法进入训练</h2>
      <p>{{ loadError }}</p>
      <button type="button" class="status-button" @click="goBackToSelector">
        返回选择情境
      </button>
    </div>

    <SceneIntroStep v-else-if="store.currentStepIndex === 0" />

    <QuestionStep v-else-if="store.isQuestionStepActive" />

    <ResultStep v-else />

    <FeedbackOverlay />
    <TeacherControlPanel :visible="isTeacherPanelVisible" @close="isTeacherPanelVisible = false" />

    <ExitConfirmDialog />
  </TrainingLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ExitConfirmDialog from '@/components/training/ExitConfirmDialog.vue'
import FeedbackOverlay from '@/components/training/FeedbackOverlay.vue'
import QuestionStep from '@/components/training/QuestionStep.vue'
import ResultStep from '@/components/training/ResultStep.vue'
import SceneIntroStep from '@/components/training/SceneIntroStep.vue'
import TeacherControlPanel from '@/components/training/TeacherControlPanel.vue'
import TrainingLayout from '@/components/training/TrainingLayout.vue'
import { ResourceAPI } from '@/database/resource-api'
import { compileCareSceneImmersive } from '@/features/emotional/immersive/compileCareSceneImmersive'
import { useTrainingStore } from '@/stores/useTrainingStore'
import { normalizeCareSceneEditorModel } from '@/views/resource-center/editors/emotional-resource-contract'

const route = useRoute()
const router = useRouter()
const store = useTrainingStore()

const isLoading = ref(false)
const loadError = ref('')
const isTeacherPanelVisible = ref(false)

const resourceId = computed(() => {
  const raw = Array.isArray(route.query.resourceId)
    ? route.query.resourceId[0]
    : route.query.resourceId

  const parsed = Number(raw || 0)
  return Number.isFinite(parsed) ? parsed : 0
})

async function hydrateSession(): Promise<void> {
  if (!resourceId.value) {
    loadError.value = '缺少 resourceId，当前无法加载表达关心训练。请从情境选择页重新进入。'
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const api = new ResourceAPI()
    const resource = api.getResourceById(resourceId.value)

    if (!resource || resource.resourceType !== 'care_scene') {
      throw new Error('指定的表达关心资源不存在或已停用，请返回情境选择页重新选择。')
    }

    const metadata = normalizeCareSceneEditorModel(resource.metadata, resource.name)
    store.loadSessionPayload(
      compileCareSceneImmersive(metadata, {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceDescription: resource.description,
        coverImage: resource.coverImage,
      }),
    )
  } catch (error) {
    console.error('Failed to hydrate care immersive training session:', error)
    loadError.value = error instanceof Error ? error.message : '表达关心训练加载失败。'
  } finally {
    isLoading.value = false
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault()
    isTeacherPanelVisible.value = !isTeacherPanelVisible.value
  }
}

function goBackToSelector(): void {
  router.push({
    path: '/emotional/care-expression/select',
    query: {
      ...route.query,
    },
  })
}

watch(resourceId, () => {
  isTeacherPanelVisible.value = false
  void hydrateSession()
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  void hydrateSession()
})

onBeforeUnmount(() => {
  isTeacherPanelVisible.value = false
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.session-status-card {
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

.status-kicker {
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f172a;
  background: linear-gradient(135deg, #bfdbfe 0%, #fef08a 100%);
}

.session-status-card h2 {
  margin: 16px 0 12px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.15;
}

.session-status-card p {
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
  .session-status-card {
    width: 100%;
    padding: 24px 20px;
    border-radius: 24px;
  }

  .session-status-card p {
    font-size: 15px;
    line-height: 1.75;
  }
}
</style>
