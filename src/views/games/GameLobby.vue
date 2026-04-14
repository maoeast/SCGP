<template>
  <div class="page-container workspace-page">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/games/select-student', query: { entry: currentEntryCode, module: currentEntry.moduleCode } }">
          {{ currentEntry?.name || '选择学生' }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>游戏大厅</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentEntry?.name || '游戏训练' }} - 游戏大厅</h1>
        <p class="subtitle">
          <span v-if="student">当前学生：<strong>{{ student.name }}</strong></span>
          <span v-else>加载中...</span>
        </p>
      </div>
      <div class="header-right">
        <!-- 模块快捷切换器 -->
        <div class="module-switcher">
          <span class="switcher-emoji">{{ getEntryEmoji(currentEntryCode) }}</span>
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
            >
              <div class="module-option">
                <span class="option-emoji">{{ getEntryEmoji(entry.code) }}</span>
                <span>{{ entry.name }}</span>
                <el-tag size="small" type="info" class="resource-count-tag">
                  {{ getEntryGameCount(entry.code) }}个游戏
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

    <div class="content-wrapper workspace-split">
      <!-- 左侧：游戏选择器 -->
      <div class="selector-section workspace-pane">
        <template v-if="usesRegistryBackedGameLobby">
          <div class="emotion-selector">
            <button
              v-for="game in registryBackedGames"
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
          :module-code="currentEntry.moduleCode"
          :training-entry="currentEntryCode"
          resource-type="game"
        />
      </div>

      <!-- 右侧：游戏预览卡片 -->
      <div class="preview-section workspace-pane">
        <template v-if="usesRegistryBackedGameLobby && selectedGame">
          <el-card class="emotion-preview-card workspace-pane-card">
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
                <p class="emotion-preview-dynamic">{{ getEmotionalPreviewDescription(selectedGame) }}</p>
              </div>

              <div class="preview-block">
                <h4>重复可玩提示</h4>
                <p>{{ selectedGame.metadata?.repeatPlayHint || '可根据孩子当下状态反复练习，切换不同难度保持新鲜感。' }}</p>
              </div>

              <div class="preview-block">
                <h4>开始前难度</h4>
                <el-radio-group
                  v-model="selectedEmotionalDifficulty"
                  size="large"
                  :disabled="Boolean(selectedGame.metadata?.difficultyLocked)"
                >
                  <el-radio-button :value="1">简单</el-radio-button>
                  <el-radio-button :value="2">中等</el-radio-button>
                  <el-radio-button :value="3">困难</el-radio-button>
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
          class="workspace-pane-card"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import ResourceSelector from '@/components/resources/ResourceSelector.vue'
import GamePreviewCard from '@/components/games/GamePreviewCard.vue'
import type { ResourceItem } from '@/types/module'
import { StudentAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import { getCustomGamesByTrainingEntry, type CustomGameDefinition } from '@/data/custom-game-registry'
import { EMOTIONAL_GAME_CATALOG, getEmotionalGameCount } from './emotional-game-catalog'
import { useAuthStore } from '@/stores/auth'
import {
  getAllTrainingEntries,
  getTrainingEntry,
  matchesTrainingEntryResource,
  resolveTrainingEntryCode,
  type TrainingEntryCode,
} from '@/utils/training-entry'

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

// 入口 Emoji 映射
const ENTRY_EMOJIS: Record<TrainingEntryCode, string> = {
  'sensory-integration': '🎮',
  'emotional-regulation': '😊',
  'social-communication': '👥',
  'fine-motor': '🧩',
  'soothing-aids': '🫶',
  'life-skills': '🏠'
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 当前训练入口代码
const currentEntryCode = ref<TrainingEntryCode>(
  resolveTrainingEntryCode(route.query.entry, route.query.module)
)

const currentEntry = computed(() => getTrainingEntry(currentEntryCode.value))
const activeEntries = computed(() => {
  return getAllTrainingEntries().filter((entry) => authStore.hasModuleAccess(entry.moduleCode))
})

// 学生相关状态
const studentId = ref<number>(parseInt(route.params.studentId as string) || 0)
const student = ref<Student | null>(null)
const studentLoading = ref(false)

// 游戏选择相关状态
const selectedGame = ref<ResourceItem | null>(null)
const selectedCategory = ref<string>('all')
const selectedEmotionalDifficulty = ref<1 | 2 | 3>(1)

const isEmotionalEntry = computed(() => currentEntryCode.value === 'emotional-regulation')

const createRegistryBackedGameItem = (game: CustomGameDefinition, index: number): ResourceItem => ({
  id: -2001 - index,
  moduleCode: game.moduleCode,
  resourceType: 'game',
  name: game.name,
  description: game.description,
  category: game.category,
  tags: [...game.tags],
  coverImage: game.coverImage,
  isCustom: false,
  isActive: true,
  metadata: {
    ...game.metadata,
    entryPath: game.entryPath,
    gameCode: game.gameCode,
    trainingEntryCode: game.trainingEntryCode,
    moduleCode: game.moduleCode,
    maxPlayers: game.maxPlayers,
    requiredPermissions: [...game.requiredPermissions],
    permissionPolicy: game.permissionPolicy,
    difficultyLocked: game.difficultyLocked,
    badge: { ...game.badge },
  },
})

const registryBackedGames = computed(() => {
  if (isEmotionalEntry.value) {
    return EMOTIONAL_GAME_CATALOG
  }

  return getCustomGamesByTrainingEntry(currentEntryCode.value)
    .map((game, index) => createRegistryBackedGameItem(game, index))
})

const usesRegistryBackedGameLobby = computed(() => registryBackedGames.value.length > 0)

// 获取入口 Emoji
const getEntryEmoji = (entryCode: TrainingEntryCode): string => {
  return ENTRY_EMOJIS[entryCode] || '🎮'
}

// 获取入口游戏数量
const getEntryGameCount = (entryCode: TrainingEntryCode): number => {
  const registryBackedGameCount = entryCode === 'emotional-regulation'
    ? getEmotionalGameCount()
    : getCustomGamesByTrainingEntry(entryCode).length

  try {
    const api = new ResourceAPI()
    const entry = getTrainingEntry(entryCode)
    const resources = api.getResources({
      moduleCode: entry.moduleCode,
      resourceType: 'game'
    })
    const resourceCount = resources.filter((resource) => matchesTrainingEntryResource(resource, entryCode)).length
    return resourceCount > 0 ? resourceCount : registryBackedGameCount
  } catch {
    return registryBackedGameCount
  }
}

const getEmotionalPreviewDescription = (game: ResourceItem): string => {
  const previewDescription = game.metadata?.previewDescription
  if (typeof previewDescription === 'string' && previewDescription.trim()) {
    return previewDescription
  }

  return game.description || '璇峰厛閫夋嫨涓€涓儏缁皟鑺傛父鎴忋€?'
}

// 处理入口切换
const handleEntryChange = (newEntryCode: TrainingEntryCode) => {
  // 清空当前选择
  selectedGame.value = null
  selectedCategory.value = 'all'
  selectedEmotionalDifficulty.value = 1
  currentEntryCode.value = newEntryCode

  // 更新 URL（保持学生ID不变）
  router.replace({
    path: `/games/lobby/${studentId.value}`,
    query: {
      entry: newEntryCode,
      module: getTrainingEntry(newEntryCode).moduleCode
    }
  })

  ElMessage.success(`已切换到 ${getTrainingEntry(newEntryCode).name}`)
}

const selectEmotionalGame = (game: ResourceItem) => {
  selectedGame.value = game

  if (game.metadata?.difficultyLocked) {
    selectedEmotionalDifficulty.value = 1
  }
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
      entry: currentEntryCode.value,
      module: currentEntry.value.moduleCode
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
        entry: currentEntryCode.value,
        module: currentEntry.value.moduleCode,
        studentId: String(studentId.value),
        studentName: student.value?.name || '',
      difficulty: String(selectedEmotionalDifficulty.value),
      difficultyLocked: String(Boolean(selectedGame.value.metadata?.difficultyLocked)),
    },
  })
}

// 返回学生列表
const goBackToStudentList = () => {
  router.push({
    path: '/games/select-student',
    query: {
      entry: currentEntryCode.value,
      module: currentEntry.value.moduleCode
    }
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

watch(registryBackedGames, (games) => {
  if (games.length === 0) {
    return
  }

  const selectedGameCode = typeof selectedGame.value?.metadata?.gameCode === 'string'
    ? selectedGame.value.metadata.gameCode
    : ''
  const matchedGame = games.find((game) => game.metadata?.gameCode === selectedGameCode)
  selectedGame.value = matchedGame || games[0] || null
  selectedEmotionalDifficulty.value = 1
}, { immediate: true })

watch(usesRegistryBackedGameLobby, (value) => {
  if (value) {
    if (!selectedGame.value) {
      selectedGame.value = registryBackedGames.value[0] || null
    }
    selectedEmotionalDifficulty.value = 1
  } else {
    selectedGame.value = null
  }
})
</script>

<style scoped>
.content-wrapper {
  min-height: 0;
}

.selector-section {
  display: flex;
}

.preview-section {
  display: flex;
  flex-direction: column;
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
