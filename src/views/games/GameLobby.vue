<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/games/select-student', query: { module: currentModuleCode } }">
          {{ currentModule?.name || '选择学生' }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>游戏大厅</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentModule?.name || '游戏训练' }} - 游戏大厅</h1>
        <p class="subtitle">
          <span v-if="student">当前学生：<strong>{{ student.name }}</strong></span>
          <span v-else>加载中...</span>
        </p>
      </div>
      <div class="header-right">
        <!-- 模块快捷切换器 -->
        <div class="module-switcher">
          <span class="switcher-emoji">{{ getModuleEmoji(currentModuleCode) }}</span>
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
            >
              <div class="module-option">
                <span class="option-emoji">{{ getModuleEmoji(mod.code) }}</span>
                <span>{{ mod.name }}</span>
                <el-tag size="small" type="info" class="resource-count-tag">
                  {{ getModuleGameCount(mod.code) }}个游戏
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </div>
        <el-button @click="goBackToStudentList" :icon="ArrowLeft">
          返回学生列表
        </el-button>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 左侧：游戏选择器 -->
      <div class="selector-section">
        <ResourceSelector
          v-model="selectedGame"
          v-model:category="selectedCategory"
          :module-code="currentModuleCode"
          resource-type="game"
        />
      </div>

      <!-- 右侧：游戏预览卡片 -->
      <div class="preview-section">
        <GamePreviewCard
          v-if="selectedGame"
          :game="selectedGame"
          :student-id="studentId"
          @start-game="handleStartGame"
        />

        <el-empty
          v-else
          description="请从左侧选择一个游戏"
          :image-size="200"
        >
          <template #image>
            <span style="font-size: 80px;">🎮</span>
          </template>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import ResourceSelector from '@/components/resources/ResourceSelector.vue'
import GamePreviewCard from '@/components/games/GamePreviewCard.vue'
import type { ResourceItem } from '@/types/module'
import { ModuleCode } from '@/types/module'
import { StudentAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import { ModuleRegistry } from '@/core/module-registry'

// 类型定义
interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
}

// 模块 Emoji 映射
const MODULE_EMOJIS: Record<string, string> = {
  [ModuleCode.SENSORY]: '🎮',
  [ModuleCode.EMOTIONAL]: '😊',
  [ModuleCode.SOCIAL]: '👥',
  [ModuleCode.COGNITIVE]: '🧠',
  [ModuleCode.LIFE_SKILLS]: '🏠'
}

const route = useRoute()
const router = useRouter()

// 当前模块代码（从 URL 参数获取，默认 sensory）
const currentModuleCode = ref<string>(
  (route.query.module as string) || ModuleCode.SENSORY
)

// 获取当前模块信息
const currentModule = computed(() => {
  return ModuleRegistry.getModule(currentModuleCode.value as ModuleCode)
})

// 获取所有活跃模块
const activeModules = computed(() => {
  return ModuleRegistry.getActiveModules()
})

// 学生相关状态
const studentId = ref<number>(parseInt(route.params.studentId as string) || 0)
const student = ref<Student | null>(null)
const studentLoading = ref(false)

// 游戏选择相关状态
const selectedGame = ref<ResourceItem | null>(null)
const selectedCategory = ref<string>('all')

// 获取模块 Emoji
const getModuleEmoji = (moduleCode: string): string => {
  return MODULE_EMOJIS[moduleCode] || '🎮'
}

// 获取模块游戏数量
const getModuleGameCount = (moduleCode: string): number => {
  try {
    const api = new ResourceAPI()
    const resources = api.getResources({
      moduleCode: moduleCode as ModuleCode,
      resourceType: 'game'
    })
    return resources.length
  } catch {
    return 0
  }
}

// 处理模块切换
const handleModuleChange = (newModuleCode: string) => {
  // 清空当前选择
  selectedGame.value = null
  selectedCategory.value = 'all'

  // 更新 URL（保持学生ID不变）
  router.replace({
    path: `/games/lobby/${studentId.value}`,
    query: { module: newModuleCode }
  })

  ElMessage.success(`已切换到 ${currentModule.value?.name || '游戏训练'}`)
}

// 加载学生信息
const loadStudent = async () => {
  if (!studentId.value) return

  studentLoading.value = true
  try {
    const api = new StudentAPI()
    student.value = await api.getStudentById(studentId.value)

    if (!student.value) {
      ElMessage.error('未找到该学生')
      goBackToStudentList()
    }
  } catch (error: any) {
    console.error('加载学生信息失败:', error)
    ElMessage.error('加载学生信息失败')
    goBackToStudentList()
  } finally {
    studentLoading.value = false
  }
}

// 处理开始游戏
const handleStartGame = (gameConfig: {
  resourceId: number
  taskId: number
  mode: string
  studentId: number
}) => {
  console.log('[GameLobby] 开始游戏:', gameConfig)

  // 跳转到游戏播放页面
  router.push({
    path: '/games/play',
    query: {
      studentId: String(gameConfig.studentId),
      resourceId: String(gameConfig.resourceId),
      taskId: String(gameConfig.taskId),
      mode: gameConfig.mode,
      module: currentModuleCode.value
    }
  })
}

// 返回学生列表
const goBackToStudentList = () => {
  router.push({
    path: '/games/select-student',
    query: { module: currentModuleCode.value }
  })
}

// 初始化
onMounted(async () => {
  if (!studentId.value) {
    ElMessage.error('缺少学生ID')
    goBackToStudentList()
    return
  }

  await loadStudent()
})
</script>

<style scoped>
.content-wrapper {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
}

.selector-section {
  flex: 1;
  overflow-y: auto;
}

.preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 模块切换器样式 */
.module-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border: 1px solid #fbc4c4;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.module-switcher:hover {
  background: linear-gradient(135deg, #fde2e2 0%, #f9caca 100%);
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.2);
}

.switcher-emoji {
  font-size: 20px;
}

.switcher-label {
  font-size: 14px;
  font-weight: 500;
  color: #f56c6c;
}

.module-select {
  width: 160px;
}

.module-select :deep(.el-input__wrapper) {
  background-color: #fff;
  border-color: #f56c6c;
  box-shadow: 0 0 0 1px #f56c6c inset;
}

.module-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #f78989 inset;
}

.module-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #f78989 inset, 0 0 0 3px rgba(245, 108, 108, 0.2);
}

.module-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.option-emoji {
  font-size: 16px;
}

.resource-count-tag {
  margin-left: auto;
}
</style>
