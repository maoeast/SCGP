<template>
  <div class="page-container scgp-admin-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>游戏训练</h1>
        <p class="subtitle">选择训练入口组开始游戏训练</p>
      </div>
    </div>
    <!-- 模块卡片网格 -->
    <div class="main-content scgp-page-panel scgp-page-panel--flush">
      <div class="module-grid scgp-selection-grid">
        <el-card
          v-for="entry in trainingEntries"
          :key="entry.code"
          class="module-card scgp-selection-card"
          :class="{
            'module-active': !entry.locked,
            'module-disabled': entry.locked,
            'scgp-selection-card--disabled': entry.locked
          }"
          shadow="hover"
          @click="handleEntryClick(entry)"
        >
          <div class="module-icon scgp-selection-card__icon" :style="{
            backgroundColor: entry.themeColor + '25',
            borderColor: entry.themeColor + '60',
            boxShadow: `0 4px 12px ${entry.themeColor}30`
          }">
            <span class="module-emoji">{{ getEntryEmoji(entry.code) }}</span>
          </div>

          <div class="module-info scgp-selection-card__info">
            <h3 class="module-name scgp-selection-card__title">{{ entry.name }}</h3>
            <p class="module-description scgp-selection-card__description">{{ entry.description }}</p>

            <div class="module-meta scgp-selection-card__meta">
              <el-tag
                :type="getStatusTagType(entry.locked ? 'locked' : 'active')"
                size="small"
              >
                {{ getStatusLabel(entry.locked ? 'locked' : 'active') }}
              </el-tag>
              <span class="resource-count">
                {{ getResourceCount(entry.code) }} 个游戏
              </span>
            </div>
          </div>

          <!-- 未授权遮罩 -->
          <div v-if="entry.locked" class="module-overlay scgp-selection-card__overlay">
            <el-icon :size="24"><Lock /></el-icon>
            <span>未授权</span>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { ResourceAPI } from '@/database/resource-api'
import { getEmotionalGameCount } from './emotional-game-catalog'
import {
  getAllTrainingEntries,
  matchesTrainingEntryResource,
  type TrainingEntryCode,
} from '@/utils/training-entry'

const router = useRouter()
const authStore = useAuthStore()

const entryEmojis: Record<string, string> = {
  'sensory-integration': '🎮',
  'emotional-regulation': '😊',
  'social-communication': '👥',
  'fine-motor': '🧩',
  'soothing-aids': '🫶',
  'life-skills': '🏠'
}

const trainingEntries = computed(() => {
  return getAllTrainingEntries().map((entry) => ({
    ...entry,
    locked: !authStore.hasModuleAccess(entry.moduleCode),
  }))
})

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    'active': 'success',
    'locked': 'info'
  }
  return typeMap[status] || 'info'
}

// 获取状态标签文本
const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    'active': '已激活',
    'locked': '未授权'
  }
  return labelMap[status] || status
}

const getEntryEmoji = (entryCode: TrainingEntryCode) => {
  return entryEmojis[entryCode] || '🎮'
}

// 获取入口游戏数量
const getResourceCount = (entryCode: TrainingEntryCode) => {
  if (entryCode === 'emotional-regulation') {
    return getEmotionalGameCount()
  }

  try {
    const api = new ResourceAPI()
    const entry = trainingEntries.value.find((item) => item.code === entryCode)
    if (!entry) {
      return 0
    }

    const resources = api.getResources({
      moduleCode: entry.moduleCode,
      resourceType: 'game'
    })
    return resources.filter((resource) => matchesTrainingEntryResource(resource, entryCode)).length
  } catch (error) {
    console.error(`获取入口 ${entryCode} 游戏数量失败:`, error)
    return 0
  }
}

// 处理入口点击
const handleEntryClick = (entry: (typeof trainingEntries.value)[number]) => {
  if (entry.locked) {
    ElMessage.warning(`「${entry.name}」未授权，请联系厂商购买`)
    return
  }

  router.push({
    path: `/games/select-student`,
    query: {
      entry: entry.code,
      module: entry.moduleCode
    }
  })
}
</script>

<style scoped>
/* 模块卡片 */
.module-card {
  cursor: pointer;
}

.module-card.module-active {
  border-color: var(--el-color-primary);
}

.module-card.module-active:hover {
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.module-card.module-disabled {
  cursor: not-allowed;
}

.module-emoji {
  font-size: 40px;
}

.resource-count {
  font-size: 12px;
  color: #909399;
}

</style>
