<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/training-records/menu' }">训练记录</el-breadcrumb-item>
        <el-breadcrumb-item>{{ currentEntry?.name || '入口记录' }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentEntry?.name || '训练记录' }}</h1>
        <p class="subtitle">查看该训练入口的游戏记录与器材记录</p>
      </div>
      <div class="header-right">
        <!-- 入口快捷切换器 -->
        <div class="module-switcher">
          <el-icon class="switcher-icon"><Switch /></el-icon>
          <span class="switcher-label">切换入口</span>
          <el-select
            v-model="currentEntryCode"
            size="default"
            class="module-select"
            @change="handleEntryChange"
          >
            <el-option
              v-for="entry in activeEntries"
              :key="entry.code"
              :label="entry.name"
              :value="entry.code"
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
            :entry-code="currentEntryCode"
            @view-detail="handleViewGameDetail"
          />
        </el-tab-pane>
        <el-tab-pane label="器材训练记录" name="equipment">
          <EquipmentRecordsPanel
            v-if="activeTab === 'equipment'"
            :entry-code="currentEntryCode"
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
import { ArrowLeft, Switch } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getAllTrainingEntries,
  getTrainingEntry,
  resolveTrainingEntryCode,
  type TrainingEntryCode,
} from '@/utils/training-entry'
import GameRecordsPanel from './components/GameRecordsPanel.vue'
import EquipmentRecordsPanel from './components/EquipmentRecordsPanel.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function getRouteEntryCode() {
  return resolveTrainingEntryCode(route.params.entryCode)
}

// 当前入口代码
const currentEntryCode = ref<TrainingEntryCode>(getRouteEntryCode())

// 当前入口信息
const currentEntry = computed(() => {
  return getTrainingEntry(currentEntryCode.value)
})

// 活跃入口列表
const activeEntries = computed(() => {
  return getAllTrainingEntries().filter((entry) => authStore.hasModuleAccess(entry.moduleCode))
})

// 当前选中的 Tab
const activeTab = ref<string>((route.query.type as string) || 'game')

// 处理入口切换
const handleEntryChange = (newEntryCode: TrainingEntryCode) => {
  router.replace({
    params: { entryCode: newEntryCode },
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
const handleViewGameDetail = (record: any) => {
  if (currentEntry.value.moduleCode === 'emotional') {
    router.push({
      path: '/emotional/session-summary',
      query: {
        studentId: String(record.student_id),
        trainingRecordId: String(record.id),
      }
    })
    return
  }

  router.push({
    path: '/games/report',
    query: { recordId: String(record.id) }
  })
}

// 查看器材记录详情
const handleViewEquipmentDetail = (record: any) => {
  router.push({
    path: `/equipment/records/${record.student_id}`,
    query: {
      entry: currentEntryCode.value,
      module: currentEntry.value.moduleCode,
      recordId: String(record.id),
    }
  })
}

// 监听路由参数变化
watch(() => route.params.entryCode, () => {
  currentEntryCode.value = getRouteEntryCode()
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
