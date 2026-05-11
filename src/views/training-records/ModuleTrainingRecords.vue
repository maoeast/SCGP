<template>
  <div class="page-container scgp-admin-page">
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
        <div class="module-switcher scgp-switcher scgp-switcher--success">
          <el-icon class="switcher-icon scgp-switcher__icon scgp-switcher__icon--pulse"><Switch /></el-icon>
          <span class="switcher-label scgp-switcher__label">切换入口</span>
          <el-select
            v-model="currentEntryCode"
            size="default"
            class="module-select scgp-switcher__select"
            popper-class="training-entry-switcher-popper"
            @change="handleEntryChange"
          >
            <el-option
              v-for="entry in activeEntries"
              :key="entry.code"
              :label="entry.name"
              :value="entry.code"
            >
              <div class="module-option">
                <el-icon class="module-option__icon" :size="16">
                  <component :is="getModuleIcon(entry.icon)" />
                </el-icon>
                <span class="module-option__label">{{ entry.name }}</span>
                <el-tag size="small" type="info" class="resource-count-tag">
                  {{ getEntryRecordCount(entry.code) }}项
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </div>
        <el-button @click="goBackToMenu" :icon="ArrowLeft">
          返回列表
        </el-button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="main-content scgp-page-panel scgp-tab-panel">
      <el-tabs v-model="activeTab" class="records-tabs scgp-segment-tabs" @tab-change="handleTabChange">
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
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Switch, MagicStick, Sunny, ChatDotRound, Operation, MoonNight, House } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { EquipmentTrainingAPI, GameTrainingAPI } from '@/database/api'
import { EmotionalGamesAPI } from '@/database/emotional-games-api'
import { TASK_TRAINING_RESOURCE_TYPE } from '@/features/self-care/task-training-contract'
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
const gameApi = new GameTrainingAPI()
const emotionalGamesApi = new EmotionalGamesAPI()
const equipmentApi = new EquipmentTrainingAPI()

function getRouteEntryCode() {
  return resolveTrainingEntryCode(route.params.entryCode)
}

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

const getEntryRecordCount = (entryCode: TrainingEntryCode) => {
  return gameApi.countRecordsByEntry(entryCode)
    + emotionalGamesApi.countRecordsByEntry(entryCode)
    + equipmentApi.countRecordsByEntry(entryCode)
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
  if (record.resource_type === TASK_TRAINING_RESOURCE_TYPE) {
    router.push({
      path: `/self-care/execute/${record.resource_id}/${record.student_id}`,
      query: {
        studentName: String(record.student_name || '').trim() || undefined,
      }
    })
    return
  }

  if (record.record_source === 'emotional_game') {
    router.push({
      path: '/emotional/game-record',
      query: {
        recordId: String(record.id),
        studentId: String(record.student_id),
      }
    })
    return
  }

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
</script>

<style scoped>
.module-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.module-option__icon {
  color: #6f7b86;
  flex-shrink: 0;
}

.module-option__label {
  min-width: 0;
  color: #303133;
}

.resource-count-tag {
  margin-left: auto;
}

@media (max-width: 768px) {
  .header-right {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
