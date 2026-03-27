<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/training-records' }">训练记录</el-breadcrumb-item>
        <el-breadcrumb-item>选择入口</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>训练记录</h1>
        <p class="subtitle">选择训练入口查看对应的游戏记录与器材记录</p>
      </div>
    </div>

    <!-- 模块卡片网格 -->
    <div class="main-content">
      <div class="module-grid">
        <el-card
          v-for="entry in trainingEntries"
          :key="entry.code"
          class="module-card"
          :class="{
            'module-active': !entry.locked,
            'module-disabled': entry.locked
          }"
          shadow="hover"
          @click="handleEntryClick(entry)"
        >
          <div class="module-icon" :style="{
            backgroundColor: entry.themeColor + '25',
            borderColor: entry.themeColor + '60',
            boxShadow: `0 4px 12px ${entry.themeColor}30`
          }">
            <el-icon :size="40" :color="entry.themeColor">
              <component :is="getModuleIcon(entry.icon)" />
            </el-icon>
          </div>

          <div class="module-info">
            <h3 class="module-name">{{ entry.name }}</h3>
            <p class="module-description">{{ entry.description }}</p>

            <div class="module-stats">
              <div class="stat-item">
                <el-icon :size="16"><Monitor /></el-icon>
                <span class="stat-label">游戏记录</span>
                <span class="stat-value">{{ getGameRecordCount(entry.code) }}</span>
              </div>
              <div class="stat-item">
                <el-icon :size="16"><Box /></el-icon>
                <span class="stat-label">器材记录</span>
                <span class="stat-value">{{ getEquipmentRecordCount(entry.code) }}</span>
              </div>
            </div>

            <div class="module-meta">
              <el-tag
                :type="getStatusTagType(entry.locked ? 'locked' : 'active')"
                size="small"
              >
                {{ getStatusLabel(entry.locked ? 'locked' : 'active') }}
              </el-tag>
            </div>
          </div>

          <!-- 未授权遮罩 -->
          <div v-if="entry.locked" class="module-overlay">
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
import {
  getAllTrainingEntries,
  type TrainingEntryCode,
} from '@/utils/training-entry'

const router = useRouter()
const authStore = useAuthStore()

// 记录数量缓存
const gameApi = new GameTrainingAPI()
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
  return gameApi.countRecordsByEntry(entryCode)
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
/* 模块网格布局 */
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 24px;
}

/* 模块卡片 */
.module-card {
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.module-card:hover {
  transform: translateY(-4px);
}

.module-card.module-active {
  border-color: var(--el-color-primary);
}

.module-card.module-active:hover {
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.module-card.module-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 模块图标区域 */
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

/* 模块信息区域 */
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
  line-height: 1.5;
  min-height: 36px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 模块统计 */
.module-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
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

/* 模块元信息 */
.module-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* 未授权遮罩 */
.module-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  backdrop-filter: blur(2px);
}

</style>
