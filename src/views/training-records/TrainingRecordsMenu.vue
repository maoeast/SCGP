<template>
  <div class="page-container scgp-admin-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>训练记录</h1>
        <p class="subtitle">选择训练入口查看对应的游戏记录与器材记录</p>
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
            'scgp-selection-card--disabled': entry.locked,
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

            <div class="module-stats scgp-selection-card__stats">
              <div class="stat-item scgp-selection-card__stat">
                <el-icon :size="16"><Monitor /></el-icon>
                <span class="stat-label">游戏记录</span>
                <span class="stat-value">{{ getGameRecordCount(entry.code) }}</span>
              </div>
              <div class="stat-item scgp-selection-card__stat">
                <el-icon :size="16"><Box /></el-icon>
                <span class="stat-label">器材记录</span>
                <span class="stat-value">{{ getEquipmentRecordCount(entry.code) }}</span>
              </div>
            </div>

            <div class="module-meta scgp-selection-card__meta">
              <el-tag
                :type="getStatusTagType(entry.locked ? 'locked' : 'active')"
                size="small"
              >
                {{ getStatusLabel(entry.locked ? 'locked' : 'active') }}
              </el-tag>
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
  Monitor,
  Box
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { GameTrainingAPI, EquipmentTrainingAPI } from '@/database/api'
import { EmotionalGamesAPI } from '@/database/emotional-games-api'
import {
  getAllTrainingEntries,
  type TrainingEntryCode,
} from '@/utils/training-entry'

const router = useRouter()
const authStore = useAuthStore()

// 记录数量缓存
const gameApi = new GameTrainingAPI()
const emotionalGamesApi = new EmotionalGamesAPI()
const equipmentApi = new EquipmentTrainingAPI()

const trainingEntries = computed(() => {
  return getAllTrainingEntries().map((entry) => ({
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

// 获取游戏训练记录数量
const getGameRecordCount = (entryCode: TrainingEntryCode): number => {
  return gameApi.countRecordsByEntry(entryCode) + emotionalGamesApi.countRecordsByEntry(entryCode)
}

// 获取器材训练记录数量
const getEquipmentRecordCount = (entryCode: TrainingEntryCode): number => {
  return equipmentApi.countRecordsByEntry(entryCode)
}

// 处理入口点击
const handleEntryClick = (entry: (typeof trainingEntries.value)[number]) => {
  if (entry.locked) {
    ElMessage.warning(`「${entry.name}」未授权，请联系厂商购买`)
    return
  }

  router.push(`/training-records/${entry.code}`)
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

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
</style>
