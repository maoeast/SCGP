<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/training-records/menu' }">训练记录</el-breadcrumb-item>
        <el-breadcrumb-item>{{ currentModule?.name || '模块记录' }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentModule?.name || '训练记录' }}</h1>
        <p class="subtitle">查看该模块的训练记录</p>
      </div>
      <div class="header-right">
        <!-- 模块快捷切换器 -->
        <div class="module-switcher">
          <el-icon class="switcher-icon"><Switch /></el-icon>
          <span class="switcher-label">切换模块</span>
          <el-select
            v-model="currentModuleCode"
            size="default"
            class="module-select"
            @change="handleModuleChange"
          >
            <el-option
              v-for="mod in activeModules"
              :key="mod.code"
              :label="mod.name"
              :value="mod.code"
            />
          </el-select>
        </div>
        <el-button @click="goBackToMenu" :icon="ArrowLeft">
          返回
        </el-button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="main-content">
      <el-tabs v-model="activeTab" class="records-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="游戏训练记录" name="game">
          <GameRecordsPanel
            v-if="activeTab === 'game'"
            :module-code="currentModuleCode"
            @view-detail="handleViewGameDetail"
          />
        </el-tab-pane>
        <el-tab-pane label="器材训练记录" name="equipment">
          <EquipmentRecordsPanel
            v-if="activeTab === 'equipment'"
            :module-code="currentModuleCode"
            @view-detail="handleViewEquipmentDetail"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Switch, MagicStick, Sunny, ChatDotRound } from '@element-plus/icons-vue'
import { ModuleRegistry } from '@/core/module-registry'
import { ModuleCode, type ModuleMetadata } from '@/types/module'
import GameRecordsPanel from './components/GameRecordsPanel.vue'
import EquipmentRecordsPanel from './components/EquipmentRecordsPanel.vue'

const route = useRoute()
const router = useRouter()

// 当前模块代码
const currentModuleCode = ref<string>((route.params.moduleCode as string) || ModuleCode.SENSORY)

// 当前模块信息
const currentModule = computed(() => {
  return ModuleRegistry.getModule(currentModuleCode.value as ModuleCode)
})

// 活跃模块列表
const activeModules = computed(() => {
  return ModuleRegistry.getActiveModules()
})

// 当前选中的 Tab
const activeTab = ref<string>((route.query.type as string) || 'game')

// 获取模块图标组件
const getModuleIcon = (moduleCode: string) => {
  const iconMap: Record<string, any> = {
    [ModuleCode.SENSORY]: MagicStick,
    [ModuleCode.EMOTIONAL]: Sunny,
    [ModuleCode.SOCIAL]: ChatDotRound
  }
  return iconMap[moduleCode] || MagicStick
}

// 处理模块切换
const handleModuleChange = (newModuleCode: string) => {
  router.replace({
    params: { moduleCode: newModuleCode },
    query: { type: activeTab.value }
  })
}

// 处理 Tab 切换
const handleTabChange = (tabName: string) => {
  router.replace({
    query: { type: tabName }
  })
}

// 返回菜单
const goBackToMenu = () => {
  router.push('/training-records/menu')
}

// 查看游戏记录详情
const handleViewGameDetail = (recordId: number) => {
  // TODO: 实现游戏记录详情查看
  console.log('查看游戏记录详情:', recordId)
}

// 查看器材记录详情
const handleViewEquipmentDetail = (recordId: number) => {
  router.push({
    path: `/equipment/records/${recordId}`,
    query: { module: currentModuleCode.value }
  })
}

// 监听路由参数变化
watch(() => route.params.moduleCode, (newCode) => {
  if (newCode && typeof newCode === 'string') {
    currentModuleCode.value = newCode
  }
})

// 监听路由查询参数变化
watch(() => route.query.type, (newType) => {
  if (newType && typeof newType === 'string') {
    activeTab.value = newType
  }
})

onMounted(() => {
  // 初始化
})
</script>

<style scoped>
/* Tab 样式 */
.records-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.records-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.records-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
}

/* 模块切换器样式 */
.module-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  border: 1px solid #c2e7b0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.module-switcher:hover {
  background: linear-gradient(135deg, #e1f3d8 0%, #d4edda 100%);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.2);
}

.switcher-icon {
  color: #67c23a;
  font-size: 18px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.switcher-label {
  font-size: 14px;
  font-weight: 500;
  color: #67c23a;
}

.module-select {
  width: 160px;
}

.module-select :deep(.el-input__wrapper) {
  background-color: #fff;
  border-color: #67c23a;
  box-shadow: 0 0 0 1px #67c23a inset;
}

.module-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #85ce61 inset;
}

.module-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #85ce61 inset, 0 0 0 3px rgba(103, 194, 58, 0.2);
}
</style>
