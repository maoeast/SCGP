<template>
  <div class="page-container scgp-admin-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>器材训练</h1>
        <p class="subtitle">选择训练入口组开始器材训练</p>
      </div>
    </div>
    <!-- 模块卡片网格 -->
    <div class="main-content scgp-page-panel scgp-page-panel--flush">
      <div class="module-grid scgp-selection-grid">
        <el-card
          v-for="entry in equipmentEntries"
          :key="entry.code"
          class="module-card scgp-selection-card module-active"
          shadow="hover"
          @click="handleEntryClick(entry)"
        >
          <div class="module-icon scgp-selection-card__icon" :style="{
            backgroundColor: entry.themeColor + '25',
            borderColor: entry.themeColor + '60',
            boxShadow: `0 4px 12px ${entry.themeColor}30`
          }">
            <KoboyoIcon
              :src="ENTRY_ICON_SVGS[entry.code]"
              :size="40"
              :color="entry.themeColor"
            />
          </div>

          <div class="module-info scgp-selection-card__info">
            <h3 class="module-name scgp-selection-card__title">{{ entry.name }}</h3>
            <p class="module-description scgp-selection-card__description">{{ entry.description }}</p>

            <div class="module-meta scgp-selection-card__meta">
              <el-tag type="success" size="small">已激活</el-tag>
              <span class="resource-count">
                {{ getResourceCount(entry.code) }} 个器材
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
import { ResourceAPI } from '@/database/resource-api'
import { useAuthStore } from '@/stores/auth'
import KoboyoIcon from '@/components/common/KoboyoIcon.vue'
import { ENTRY_ICON_SVGS } from '@/utils/koboyo-icon-map'
import {
  getAllEquipmentTrainingEntries,
  getEquipmentTrainingEntry,
  matchesEquipmentTrainingEntry,
  type EquipmentTrainingEntryCode,
} from '@/utils/equipment-training-entry'

const router = useRouter()
const authStore = useAuthStore()

const equipmentEntries = computed(() => {
  return getAllEquipmentTrainingEntries().filter((entry) =>
    authStore.hasEntitlementAccess(entry.requiredEntitlement)
  )
})

// 获取入口组器材数量
const getResourceCount = (entryCode: EquipmentTrainingEntryCode) => {
  try {
    const api = new ResourceAPI()
    const resources = api.getResources({
      moduleCode: getEquipmentTrainingEntry(entryCode).moduleCode,
      resourceType: 'equipment'
    })
    return resources.filter((resource) => matchesEquipmentTrainingEntry(resource, entryCode)).length
  } catch (error) {
    console.error(`获取器材入口 ${entryCode} 数量失败:`, error)
    return 0
  }
}

// 处理入口点击
const handleEntryClick = (entry: (typeof equipmentEntries.value)[number]) => {
  router.push({
    path: `/equipment/select-student`,
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

.resource-count {
  font-size: 12px;
  color: #909399;
}
</style>
