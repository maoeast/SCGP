<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h1>情绪行为</h1>
        <p class="subtitle">选择训练方向，围绕生活情境开展情绪识别、原因推理与关心表达练习。</p>
      </div>
    </div>

    <div class="main-content">
      <div class="module-grid">
        <el-card
          v-for="card in trainingCards"
          :key="card.path"
          class="module-card module-active"
          shadow="hover"
          @click="goTo(card.path)"
        >
          <div
            class="module-icon"
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

          <div class="module-info">
            <h3 class="module-name">{{ card.title }}</h3>
            <p class="module-description">{{ card.description }}</p>

            <div class="module-meta">
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
    path: '/emotional/emotion-scene',
    icon: PictureFilled,
    themeColor: '#E6A23C',
  },
  {
    title: '表达关心',
    description: '学习在不同情境下表达共情与关心，理解不同话语给他人的感受。',
    path: '/emotional/care-expression',
    icon: ChatDotRound,
    themeColor: '#409EFF',
  },
]

function goTo(path: string) {
  if (!studentId.value) {
    router.push({
      path: '/games/select-student',
      query: { module: 'emotional' },
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
.main-content {
  padding: 24px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.module-card {
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.module-card.module-active {
  border-color: var(--el-color-primary);
}

.module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 20px;
  margin: 20px auto 16px;
  border: 2px solid;
  transition: all 0.3s ease;
}

.module-card:hover .module-icon {
  transform: scale(1.08);
}

.module-info {
  text-align: center;
  padding: 0 16px 20px;
}

.module-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.module-description {
  font-size: 13px;
  color: #909399;
  margin: 0 0 16px;
  line-height: 1.7;
  min-height: 44px;
}

.module-meta {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
