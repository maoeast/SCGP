<template>
  <div class="page-container scgp-admin-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>器材训练</h1>
        <p class="subtitle">选择训练入口组开始器材训练</p>
      </div>
    </div>

    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/equipment' }">器材训练</el-breadcrumb-item>
        <el-breadcrumb-item>选择入口</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 模块卡片网格 -->
    <div class="main-content scgp-page-panel scgp-page-panel--flush">
      <div class="module-grid scgp-selection-grid">
        <el-card
          v-for="entry in equipmentEntries"
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
            <el-icon :size="40" :color="entry.themeColor">
              <component :is="getModuleIcon(entry.icon)" />
            </el-icon>
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
                {{ getResourceCount(entry.code) }} 个器材
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
import {
  Lock,
  Sunny,
  ChatDotRound,
  MagicStick,
  Operation,
  MoonNight,
  House,
} from '@element-plus/icons-vue'
import { ResourceAPI } from '@/database/resource-api'
import { useAuthStore } from '@/stores/auth'
import {
  getAllEquipmentTrainingEntries,
  getEquipmentTrainingEntry,
  matchesEquipmentTrainingEntry,
  type EquipmentTrainingEntryCode,
} from '@/utils/equipment-training-entry'

const router = useRouter()
const authStore = useAuthStore()

const equipmentEntries = computed(() => {
  return getAllEquipmentTrainingEntries().map((entry) => ({
    ...entry,
    locked: !authStore.hasModuleAccess(entry.moduleCode),
  }))
})

// 获取模块图标
const getModuleIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    MagicStick,
    Sunny,
    ChatDotRound,
    Operation,
    MoonNight,
    House,
  }
  return iconMap[iconName] || MagicStick
}

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
  if (entry.locked) {
    ElMessage.warning(`「${entry.name}」未授权，请联系厂商购买`)
    return
  }

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

.module-card.module-disabled {
  cursor: not-allowed;
}

.resource-count {
  font-size: 12px;
  color: #909399;
}
</style>
