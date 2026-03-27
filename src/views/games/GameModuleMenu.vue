<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>游戏训练</h1>
        <p class="subtitle">选择训练入口组开始游戏训练</p>
      </div>
    </div>

    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item>选择入口</el-breadcrumb-item>
      </el-breadcrumb>
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
            <span class="module-emoji">{{ getEntryEmoji(entry.code) }}</span>
          </div>

          <div class="module-info">
            <h3 class="module-name">{{ entry.name }}</h3>
            <p class="module-description">{{ entry.description }}</p>

            <div class="module-meta">
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
/* 面包屑样式 */
.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

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

.module-emoji {
  font-size: 40px;
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

/* 模块元信息 */
.module-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.resource-count {
  font-size: 12px;
  color: #909399;
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
