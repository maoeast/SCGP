<template>
  <div class="page-container scgp-admin-page">
    <div class="page-header">
      <div class="header-left">
        <h1>情绪行为</h1>
        <p class="subtitle">选择训练方向，围绕生活情境开展情绪识别、原因推理与关心表达练习。</p>
      </div>
    </div>

    <div class="main-content scgp-page-panel scgp-page-panel--flush">
      <div class="module-grid scgp-selection-grid">
        <el-card
          v-for="card in trainingCards"
          :key="card.path"
          class="module-card module-active scgp-selection-card"
          shadow="hover"
          @click="goTo(card.path, card.subModule)"
        >
          <div
            class="module-icon scgp-selection-card__icon"
            :style="{
              backgroundColor: `${card.themeColor}25`,
              borderColor: `${card.themeColor}60`,
              boxShadow: `0 4px 12px ${card.themeColor}30`
            }"
          >
            <el-icon :size="40" :color="card.themeColor">
              <component :is="card.icon" />
            </el-icon>
          </div>

          <div class="module-info scgp-selection-card__info">
            <h3 class="module-name scgp-selection-card__title">{{ card.title }}</h3>
            <p class="module-description scgp-selection-card__description">{{ card.description }}</p>

            <div class="module-meta scgp-selection-card__meta">
              <el-tag size="small" type="success">训练子模块</el-tag>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChatDotRound, PictureFilled } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const inheritedQuery = computed(() => ({ ...route.query }))

const studentId = computed(() => {
  const value = route.query.studentId
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved ? Number(resolved) : 0
})

const trainingCards = [
  {
    title: '情绪与场景',
    description: '通过生活场景识别情绪、观察线索，并进一步推理原因与回应方式。',
    path: '/emotional/emotion-scene/select',
    subModule: 'emotion_scene',
    icon: PictureFilled,
    themeColor: '#E6A23C',
  },
  {
    title: '表达关心',
    description: '学习在不同情境下表达共情与关心，理解不同话语给他人的感受。',
    path: '/emotional/care-expression/select',
    subModule: 'care_scene',
    icon: ChatDotRound,
    themeColor: '#409EFF',
  },
]

function goTo(path: string, subModule?: string) {
  if (!studentId.value) {
    router.push({
      path: '/games/select-student',
      query: {
        module: 'emotional',
        targetPath: path,
        subModule: subModule || '',
      },
    })
    return
  }

  router.push({
    path,
    query: inheritedQuery.value,
  })
}
</script>

<style scoped>
.module-card {
  cursor: pointer;
}

.module-card:hover {
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.module-card.module-active {
  border-color: var(--el-color-primary);
}

</style>
