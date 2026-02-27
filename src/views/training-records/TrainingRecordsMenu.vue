<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/training-records' }">训练记录</el-breadcrumb-item>
        <el-breadcrumb-item>选择模块</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>训练记录</h1>
        <p class="subtitle">选择模块查看对应的训练记录</p>
      </div>
    </div>

    <!-- 模块卡片网格 -->
    <div class="main-content">
      <div class="module-grid">
        <el-card
          v-for="module in modules"
          :key="module.code"
          class="module-card"
          :class="{
            'module-active': module.status === 'active',
            'module-experimental': module.status === 'experimental',
            'module-disabled': module.status !== 'active' && module.status !== 'experimental'
          }"
          shadow="hover"
          @click="handleModuleClick(module)"
        >
          <div class="module-icon" :style="{
            backgroundColor: module.themeColor + '25',
            borderColor: module.themeColor + '60',
            boxShadow: `0 4px 12px ${module.themeColor}30`
          }">
            <el-icon :size="40" :color="module.themeColor">
              <component :is="getModuleIcon(module.icon)" />
            </el-icon>
          </div>

          <div class="module-info">
            <h3 class="module-name">{{ module.name }}</h3>
            <p class="module-description">{{ module.description }}</p>

            <div class="module-stats">
              <div class="stat-item">
                <el-icon :size="16"><Monitor /></el-icon>
                <span class="stat-label">游戏记录</span>
                <span class="stat-value">{{ getGameRecordCount(module.code) }}</span>
              </div>
              <div class="stat-item">
                <el-icon :size="16"><Box /></el-icon>
                <span class="stat-label">器材记录</span>
                <span class="stat-value">{{ getEquipmentRecordCount(module.code) }}</span>
              </div>
            </div>

            <div class="module-meta">
              <el-tag
                :type="getStatusTagType(module.status)"
                size="small"
              >
                {{ getStatusLabel(module.status) }}
              </el-tag>
            </div>
          </div>

          <!-- 未授权遮罩 -->
          <div v-if="module.status !== 'active'" class="module-overlay">
            <el-icon :size="24"><Lock /></el-icon>
            <span>{{ module.status === 'experimental' ? '开发中' : '未授权' }}</span>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Lock,
  Sunny,
  ChatDotRound,
  MagicStick,
  Monitor,
  Box
} from '@element-plus/icons-vue'
import { ModuleRegistry } from '@/core/module-registry'
import { ModuleCode, type ModuleMetadata } from '@/types/module'
import { GameTrainingAPI, EquipmentTrainingAPI } from '@/database/api'

// 模块列表
const modules = ref<ModuleMetadata[]>([])

// 记录数量缓存
const gameRecordCounts = ref<Record<string, number>>({})
const equipmentRecordCounts = ref<Record<string, number>>({})

// 获取模块图标
const getModuleIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    'Sensation': MagicStick,
    'Emotion': Sunny,
    'ChatDotRound': ChatDotRound
  }
  return iconMap[iconName] || MagicStick
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    'active': 'success',
    'experimental': 'warning',
    'coming_soon': 'info',
    'deprecated': 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态标签文本
const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    'active': '已激活',
    'experimental': '开发中',
    'coming_soon': '即将推出',
    'deprecated': '已弃用'
  }
  return labelMap[status] || status
}

// 获取游戏训练记录数量
const getGameRecordCount = (moduleCode: string): number => {
  return gameRecordCounts.value[moduleCode] || 0
}

// 获取器材训练记录数量
const getEquipmentRecordCount = (moduleCode: string): number => {
  return equipmentRecordCounts.value[moduleCode] || 0
}

// 加载记录统计数据
const loadRecordStats = () => {
  try {
    const gameApi = new GameTrainingAPI()
    const equipmentApi = new EquipmentTrainingAPI()

    modules.value.forEach(module => {
      gameRecordCounts.value[module.code] = gameApi.countRecordsByModule(module.code)
      equipmentRecordCounts.value[module.code] = equipmentApi.countRecordsByModule(module.code)
    })
  } catch (error) {
    console.error('加载记录统计失败:', error)
  }
}

// 处理模块点击
const handleModuleClick = (module: ModuleMetadata) => {
  if (module.status !== 'active') {
    ElMessage.warning(`「${module.name}」模块${module.status === 'experimental' ? '正在开发中' : '尚未激活'}，敬请期待`)
    return
  }

  // 跳转到模块训练记录详情页
  router.push(`/training-records/${module.code}`)
}

const router = useRouter()

// 初始化
onMounted(() => {
  // 获取所有已注册模块
  modules.value = ModuleRegistry.getAllModules()
  // 加载记录统计
  loadRecordStats()
})
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

.module-card.module-experimental {
  opacity: 0.85;
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

.module-card.module-experimental .module-overlay {
  background: rgba(255, 255, 255, 0.7);
}
</style>
