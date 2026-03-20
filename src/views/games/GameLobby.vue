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
        <template v-if="isEmotionalModule">
          <div class="emotion-selector">
            <button
              v-for="game in emotionalGames"
              :key="game.id"
              class="emotion-game-card"
              :class="{ selected: selectedGame?.id === game.id }"
              type="button"
              @click="selectEmotionalGame(game)"
            >
              <div
                class="emotion-game-emoji"
                :style="{ background: String(game.metadata?.color || 'linear-gradient(135deg, #ffd3a5 0%, #fd6585 100%)') }"
              >
                {{ game.metadata?.emoji || game.coverImage || '🎮' }}
              </div>
              <div class="emotion-game-copy">
                <strong>{{ game.name }}</strong>
                <span>{{ game.metadata?.therapeuticGoal || '情绪调节游戏' }}</span>
              </div>
            </button>
          </div>
        </template>

        <ResourceSelector
          v-else
          v-model="selectedGame"
          v-model:category="selectedCategory"
          :module-code="currentModuleCodeValue"
          resource-type="game"
        />
      </div>

      <!-- 右侧：游戏预览卡片 -->
      <div class="preview-section">
        <template v-if="isEmotionalModule && selectedGame">
          <el-card class="emotion-preview-card">
            <div class="emotion-preview-header">
              <div
                class="emotion-preview-emoji"
                :style="{ background: String(selectedGame.metadata?.color || 'linear-gradient(135deg, #ffd3a5 0%, #fd6585 100%)') }"
              >
                {{ selectedGame.metadata?.emoji || selectedGame.coverImage || '🎮' }}
              </div>
              <div class="emotion-preview-copy">
                <h2>{{ selectedGame.name }}</h2>
                <p>{{ selectedGame.description }}</p>
                <div class="emotion-preview-tags">
                  <el-tag size="small" type="warning">{{ selectedGame.metadata?.therapeuticGoal || '情绪调节' }}</el-tag>
                  <el-tag size="small" type="info">{{ selectedGame.metadata?.duration || '2-4分钟' }}</el-tag>
                </div>
              </div>
            </div>

            <div class="emotion-preview-body">
              <div class="preview-block">
                <h4>玩法说明</h4>
                <p>按住大按钮慢慢吸气，让热气球鼓起来；松开时温柔呼气，帮助它平稳升空。</p>
              </div>

              <div class="preview-block">
                <h4>重复可玩提示</h4>
                <p>{{ selectedGame.metadata?.repeatPlayHint || '可根据孩子当下状态反复练习，切换不同难度保持新鲜感。' }}</p>
              </div>

              <div class="preview-block">
                <h4>开始前难度</h4>
                <el-radio-group v-model="selectedEmotionalDifficulty" size="large">
                  <el-radio-button :label="1">简单</el-radio-button>
                  <el-radio-button :label="2">中等</el-radio-button>
                  <el-radio-button :label="3">困难</el-radio-button>
                </el-radio-group>
              </div>
            </div>

            <div class="emotion-preview-actions">
              <el-button type="primary" size="large" class="emotion-start-button" @click="handleStartEmotionalGame">
                开始游戏
              </el-button>
            </div>
          </el-card>
        </template>

        <GamePreviewCard
          v-else-if="selectedGame"
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
import { EMOTIONAL_GAME_CATALOG, getEmotionalGameCount } from './emotional-game-catalog'

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

const currentModuleCodeValue = computed(() => currentModuleCode.value as ModuleCode)

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
const selectedEmotionalDifficulty = ref<1 | 2 | 3>(1)

const isEmotionalModule = computed(() => currentModuleCode.value === ModuleCode.EMOTIONAL)
const emotionalGames = computed(() => EMOTIONAL_GAME_CATALOG)

// 获取模块 Emoji
const getModuleEmoji = (moduleCode: string): string => {
  return MODULE_EMOJIS[moduleCode] || '🎮'
}

// 获取模块游戏数量
const getModuleGameCount = (moduleCode: string): number => {
  if (moduleCode === ModuleCode.EMOTIONAL) {
    return getEmotionalGameCount()
  }

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
  selectedEmotionalDifficulty.value = 1

  // 更新 URL（保持学生ID不变）
  router.replace({
    path: `/games/lobby/${studentId.value}`,
    query: { module: newModuleCode }
  })

  ElMessage.success(`已切换到 ${currentModule.value?.name || '游戏训练'}`)
}

const selectEmotionalGame = (game: ResourceItem) => {
  selectedGame.value = game
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
  // 训练配置参数
  gridSize?: number
  rounds?: number
  timeLimit?: number
  duration?: number
  targetSize?: number
  targetSpeed?: number
}) => {
  console.log('[GameLobby] 开始游戏:', gameConfig)

  // 构建查询参数
  const query: Record<string, string> = {
    studentId: String(gameConfig.studentId),
    resourceId: String(gameConfig.resourceId),
    taskId: String(gameConfig.taskId),
    mode: gameConfig.mode,
    module: currentModuleCode.value
  }

  // 添加训练配置参数
  if (gameConfig.gridSize !== undefined) query.gridSize = String(gameConfig.gridSize)
  if (gameConfig.rounds !== undefined) query.rounds = String(gameConfig.rounds)
  if (gameConfig.timeLimit !== undefined) query.timeLimit = String(gameConfig.timeLimit)
  if (gameConfig.duration !== undefined) query.duration = String(gameConfig.duration)
  if (gameConfig.targetSize !== undefined) query.targetSize = String(gameConfig.targetSize)
  if (gameConfig.targetSpeed !== undefined) query.targetSpeed = String(gameConfig.targetSpeed)

  // 跳转到游戏播放页面
  router.push({
    path: '/games/play',
    query
  })
}

const handleStartEmotionalGame = () => {
  if (!selectedGame.value) return

  const entryPath = typeof selectedGame.value.metadata?.entryPath === 'string'
    ? selectedGame.value.metadata.entryPath
    : '/emotional/games/balloon'

  router.push({
    path: entryPath,
    query: {
      module: ModuleCode.EMOTIONAL,
      studentId: String(studentId.value),
      studentName: student.value?.name || '',
      difficulty: String(selectedEmotionalDifficulty.value),
    },
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

  if (isEmotionalModule.value) {
    selectedGame.value = emotionalGames.value[0] || null
  }
})

watch(isEmotionalModule, (value) => {
  if (value) {
    selectedGame.value = emotionalGames.value[0] || null
    selectedEmotionalDifficulty.value = 1
  }
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

.emotion-selector {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.emotion-game-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  border: 2px solid #ebeef5;
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.emotion-game-card:hover,
.emotion-game-card.selected {
  border-color: #f5a623;
  background: #fffaf0;
  box-shadow: 0 10px 24px rgba(245, 166, 35, 0.12);
}

.emotion-game-emoji,
.emotion-preview-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  font-size: 34px;
  border-radius: 18px;
  box-shadow: 0 14px 26px rgba(245, 108, 108, 0.18);
}

.emotion-game-emoji {
  width: 72px;
  height: 72px;
}

.emotion-game-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.emotion-game-copy strong {
  font-size: 17px;
  color: #303133;
}

.emotion-game-copy span {
  font-size: 13px;
  color: #909399;
}

.emotion-preview-card {
  height: fit-content;
}

.emotion-preview-header {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.emotion-preview-emoji {
  width: 88px;
  height: 88px;
  font-size: 40px;
}

.emotion-preview-copy h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.emotion-preview-copy p {
  margin: 10px 0 0;
  color: #606266;
  line-height: 1.7;
}

.emotion-preview-tags {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.emotion-preview-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 22px;
}

.preview-block {
  padding: 16px;
  border-radius: 14px;
  background: #faf7f0;
}

.preview-block h4 {
  margin: 0 0 10px;
  color: #7a5618;
}

.preview-block p {
  margin: 0;
  color: #6a6a6a;
  line-height: 1.7;
}

.emotion-preview-actions {
  margin-top: 22px;
  text-align: center;
}

.emotion-start-button {
  min-width: 220px;
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
