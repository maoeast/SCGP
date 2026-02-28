<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>游戏训练</h1>
        <p class="subtitle">选择训练模块开始游戏化训练</p>
      </div>
    </div>

    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item>选择模块</el-breadcrumb-item>
      </el-breadcrumb>
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
            <span class="module-emoji">{{ module.emoji }}</span>
          </div>

          <div class="module-info">
            <h3 class="module-name">{{ module.name }}</h3>
            <p class="module-description">{{ module.description }}</p>

            <div class="module-meta">
              <el-tag
                :type="getStatusTagType(module.status)"
                size="small"
              >
                {{ getStatusLabel(module.status) }}
              </el-tag>
              <span class="resource-count">
                {{ getResourceCount(module.code) }} 个游戏
              </span>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import { ModuleRegistry } from '@/core/module-registry'
import { ModuleCode, type ModuleMetadata } from '@/types/module'
import { ResourceAPI } from '@/database/resource-api'

// 游戏模块扩展（带 emoji）
interface GameModule extends ModuleMetadata {
  emoji: string
}

// 模块列表
const modules = ref<GameModule[]>([])

// 模块 emoji 映射
const moduleEmojis: Record<string, string> = {
  'sensory': '🎮',
  'emotional': '😊',
  'social': '👥',
  'cognitive': '🧠',
  'life_skills': '🏠'
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

// 获取模块游戏数量
const getResourceCount = (moduleCode: ModuleCode) => {
  try {
    const api = new ResourceAPI()
    const resources = api.getResources({
      moduleCode,
      resourceType: 'game'
    })
    return resources.length
  } catch (error) {
    console.error(`获取模块 ${moduleCode} 游戏数量失败:`, error)
    return 0
  }
}

// 处理模块点击
const handleModuleClick = (module: GameModule) => {
  if (module.status !== 'active') {
    ElMessage.warning(`「${module.name}」模块${module.status === 'experimental' ? '正在开发中' : '尚未激活'}，敬请期待`)
    return
  }

  // 跳转到学生选择页面，带上模块参数
  router.push({
    path: `/games/select-student`,
    query: { module: module.code }
  })
}

const router = useRouter()

// 初始化
onMounted(() => {
  // 获取所有已注册模块，并添加 emoji
  const allModules = ModuleRegistry.getAllModules()
  modules.value = allModules.map(m => ({
    ...m,
    emoji: moduleEmojis[m.code] || '🎮'
  }))
})
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

.module-card.module-experimental .module-overlay {
  background: rgba(255, 255, 255, 0.7);
}
</style>
