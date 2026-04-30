<template>
  <div class="page-container scgp-admin-page">
    <div class="page-header">
      <div class="header-left">
        <h1>游戏训练</h1>
        <p class="subtitle">选择训练入口组开始游戏训练</p>
      </div>
    </div>

    <div class="main-content scgp-page-panel scgp-page-panel--flush">
      <div class="module-grid scgp-selection-grid">
        <el-card
          v-for="entry in trainingEntries"
          :key="entry.code"
          class="module-card scgp-selection-card module-active"
          shadow="hover"
          @click="handleEntryClick(entry)"
        >
          <div
            class="module-icon scgp-selection-card__icon"
            :style="{
              backgroundColor: entry.themeColor + '25',
              borderColor: entry.themeColor + '60',
              boxShadow: `0 4px 12px ${entry.themeColor}30`,
            }"
          >
            <span class="module-emoji">{{ getEntryEmoji(entry.code) }}</span>
          </div>

          <div class="module-info scgp-selection-card__info">
            <h3 class="module-name scgp-selection-card__title">{{ entry.name }}</h3>
            <p class="module-description scgp-selection-card__description">{{ entry.description }}</p>

            <div class="module-meta scgp-selection-card__meta">
              <el-tag type="success" size="small">已激活</el-tag>
              <span class="resource-count">
                {{ getResourceCount(entry.code) }} 个游戏
              </span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ResourceAPI } from '@/database/resource-api'
import { getCustomGamesByTrainingEntry } from '@/data/custom-game-registry'
import { getEmotionalGameCount } from './emotional-game-catalog'
import { filterVisibleAccessControlledItems } from '@/utils/access-visibility'
import {
  getAllTrainingEntries,
  matchesTrainingEntryResource,
  type TrainingEntryCode,
} from '@/utils/training-entry'

const router = useRouter()
const authStore = useAuthStore()

const entryEmojis: Record<TrainingEntryCode, string> = {
  'sensory-integration': '🎮',
  'emotional-regulation': '😊',
  'social-communication': '👥',
  'fine-motor': '🧩',
  'soothing-aids': '🧸',
  'life-skills': '🏠',
}

const trainingEntries = computed(() => {
  return filterVisibleAccessControlledItems(
    getAllTrainingEntries().map((entry) => ({
      ...entry,
      accessScope: 'module' as const,
    })),
    authStore.hasModuleAccess,
  )
})

const getEntryEmoji = (entryCode: TrainingEntryCode) => {
  return entryEmojis[entryCode] || '🎮'
}

const getResourceCount = (entryCode: TrainingEntryCode) => {
  const registryBackedGameCount = entryCode === 'emotional-regulation'
    ? getEmotionalGameCount()
    : getCustomGamesByTrainingEntry(entryCode).length

  try {
    const api = new ResourceAPI()
    const entry = trainingEntries.value.find((item) => item.code === entryCode)
    if (!entry) {
      return registryBackedGameCount
    }

    const resources = api.getResources({
      moduleCode: entry.moduleCode,
      resourceType: 'game',
    })
    const resourceCount = resources.filter((resource) => matchesTrainingEntryResource(resource, entryCode)).length
    return resourceCount > 0 ? resourceCount : registryBackedGameCount
  } catch (error) {
    console.error(`获取入口 ${entryCode} 游戏数量失败:`, error)
    return registryBackedGameCount
  }
}

const handleEntryClick = (entry: (typeof trainingEntries.value)[number]) => {
  router.push({
    path: '/games/select-student',
    query: {
      entry: entry.code,
      module: entry.moduleCode,
    },
  })
}
</script>

<style scoped>
.module-card {
  cursor: pointer;
}

.module-card.module-active {
  border-color: var(--el-color-primary);
}

.module-card.module-active:hover {
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.module-emoji {
  font-size: 40px;
}

.resource-count {
  font-size: 12px;
  color: #909399;
}
</style>
