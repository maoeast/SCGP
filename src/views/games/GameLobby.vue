<template>
  <div class="page-container workspace-page">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/games/select-student', query: { entry: currentEntryCode, module: currentEntry.moduleCode } }">
          {{ currentEntry?.name || '选择学生' }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>游戏大厅</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentEntry?.name || '游戏训练' }} - 游戏大厅</h1>
        <p class="subtitle">
          <span v-if="student">当前学生：<strong>{{ student.name }}</strong></span>
          <span v-else>加载中...</span>
        </p>
      </div>
      <div class="header-right">
        <div class="module-switcher">
          <KoboyoIcon
            class="switcher-icon"
            :src="ENTRY_ICON_SVGS[currentEntryCode]"
            :size="24"
            :color="currentEntry.themeColor"
          />
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
                <KoboyoIcon
                  :src="ENTRY_ICON_SVGS[entry.code]"
                  :size="16"
                  :color="entry.themeColor"
                />
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
      <!-- 左侧：统一游戏卡片列表 -->
      <div class="selector-section workspace-pane">
        <div class="game-card-list">
          <button
            v-for="game in allGames"
            :key="game.id"
            class="game-card"
            :class="{ selected: selectedGame?.id === game.id }"
            type="button"
            @click="selectGame(game)"
          >
            <div
              class="game-card-emoji"
              :style="{ background: String(game.metadata?.color || 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)') }"
            >
              <KoboyoIcon
                v-if="getGameIconSvgUrl(game)"
                :src="getGameIconSvgUrl(game)!"
                :size="38"
                color="#ffffff"
              />
              <template v-else>{{ game.metadata?.emoji || game.coverImage || '🎮' }}</template>
            </div>
            <div class="game-card-copy">
              <strong>{{ game.name }}</strong>
              <span>{{ game.metadata?.therapeuticGoal || game.description || '' }}</span>
            </div>
          </button>
          <el-empty v-if="allGames.length === 0" description="该模块暂无可用的游戏" :image-size="100" />
        </div>
      </div>

      <!-- 右侧：统一游戏预览 -->
      <div class="preview-section workspace-pane">
        <template v-if="selectedGame">
          <el-card class="preview-card workspace-pane-card">
            <!-- 顶栏 Header：图标 + 主标题 + 类型标签 -->
            <div class="preview-header">
              <div
                class="preview-emoji"
                :style="{ background: String(selectedGame.metadata?.color || 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)') }"
              >
                <KoboyoIcon
                  v-if="getGameIconSvgUrl(selectedGame)"
                  :src="getGameIconSvgUrl(selectedGame)!"
                  :size="48"
                  color="#ffffff"
                />
                <template v-else>{{ selectedGame.metadata?.emoji || selectedGame.coverImage || '🎮' }}</template>
              </div>
              <div class="preview-copy">
                <div class="preview-title-row">
                  <h2>{{ selectedGame.name }}</h2>
                  <el-tag v-if="!usesRegistryBackedGameLobby" type="warning" size="small">
                    全屏沉浸式训练
                  </el-tag>
                </div>
                <div class="preview-meta">
                  <span>预计时长：{{ selectedGame.metadata?.duration || '—' }}</span>
                  <span class="preview-meta__sep">|</span>
                  <span>难度：{{ selectedGame.metadata?.difficulty || '—' }}</span>
                  <span class="preview-meta__sep">|</span>
                  <span>类型：{{ getGameCategoryLabel(selectedGame.category) }}</span>
                  <template v-if="selectedGame.metadata?.therapeuticGoal">
                    <span class="preview-meta__sep">|</span>
                    <span>目标：{{ selectedGame.metadata.therapeuticGoal }}</span>
                  </template>
                </div>
              </div>
            </div>

            <!-- 内容区 Body -->
            <div class="preview-body">
              <div class="preview-block">
                <h4>项目简介</h4>
                <p>{{ selectedGame.description }}</p>
              </div>

              <div v-if="selectedGame.metadata?.previewDescription" class="preview-block">
                <h4>玩法说明</h4>
                <p>{{ selectedGame.metadata.previewDescription }}</p>
              </div>

              <div v-if="selectedGame.metadata?.repeatPlayHint" class="preview-block">
                <h4>重复可玩提示</h4>
                <p>{{ selectedGame.metadata.repeatPlayHint }}</p>
              </div>

              <!-- 难度选择（registry-backed 游戏） -->
              <div v-if="usesRegistryBackedGameLobby" class="preview-block">
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

              <!-- 协作伙伴 -->
              <div v-if="requiresPartnerSelection" class="preview-block">
                <h4>协作伙伴</h4>
                <p class="preview-block__hint">
                  这个游戏需要 2 名学生共享同一场次。
                </p>
                <el-select
                  v-model="selectedPartnerStudentId"
                  class="partner-select"
                  placeholder="请选择一起参与的学生"
                  clearable
                  :disabled="availablePartnerStudents.length === 0"
                >
                  <el-option
                    v-for="candidate in availablePartnerStudents"
                    :key="candidate.id"
                    :label="candidate.name"
                    :value="candidate.id"
                  >
                    <div class="partner-option">
                      <span>{{ candidate.name }}</span>
                      <small>{{ candidate.current_class_name || '未分班' }}</small>
                    </div>
                  </el-option>
                </el-select>
                <p v-if="selectedPartnerStudent" class="partner-chip">
                  已选择搭档：{{ selectedPartnerStudent.name }}
                </p>
              </div>

              <!-- 资源配置（sensory 类游戏用 GamePreviewCard 紧凑模式，头部信息已由上方 Header/Meta 展示） -->
              <GamePreviewCard
                v-if="!usesRegistryBackedGameLobby"
                class="preview-game-config"
                :game="selectedGame"
                :student-id="studentId"
                launch-variant="sensory-immersive"
                compact
                @start-game="handleStartGame"
              />
            </div>

            <!-- 启动按钮（registry-backed 游戏） -->
            <div v-if="usesRegistryBackedGameLobby" class="preview-actions">
              <el-button
                size="large"
                class="start-button"
                :disabled="!canStartSelectedGame"
                @click="handleStartEmotionalGame"
              >
                <span class="start-icon">🎮</span>
                <span class="start-text">进入全屏训练</span>
              </el-button>
            </div>
          </el-card>
        </template>

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
import GamePreviewCard from '@/components/games/GamePreviewCard.vue'
import KoboyoIcon from '@/components/common/KoboyoIcon.vue'
import { ENTRY_ICON_SVGS, getGameIconSvg } from '@/utils/koboyo-icon-map'
import { getGameCategoryLabel } from '@/utils/game-category-label'
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

interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
  current_class_id?: number | null
  current_class_name?: string | null
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentEntryCode = ref<TrainingEntryCode>(
  resolveTrainingEntryCode(route.query.entry, route.query.module),
)

const currentEntry = computed(() => getTrainingEntry(currentEntryCode.value))
const activeEntries = computed(() => {
  return getAllTrainingEntries().filter((entry) => authStore.hasEntitlementAccess(entry.requiredEntitlement))
})
const routeStudentId = Number.parseInt(route.params.studentId as string, 10) || 0

function parseParticipantStudentIds(rawValue: unknown): number[] {
  const sourceValues = Array.isArray(rawValue)
    ? rawValue
    : rawValue !== undefined && rawValue !== null
      ? [rawValue]
      : []
  return Array.from(new Set(
    sourceValues
      .flatMap((item) => String(item || '').split(/[,\|]/))
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => Math.floor(item)),
  ))
}

const studentId = ref<number>(routeStudentId)
const student = ref<Student | null>(null)
const studentLoading = ref(false)
const allStudents = ref<Student[]>([])

const selectedGame = ref<ResourceItem | null>(null)
const selectedEmotionalDifficulty = ref<1 | 2 | 3>(1)
const selectedPartnerStudentId = ref<number | null>(null)
const initialParticipantIds = parseParticipantStudentIds(route.query.participantStudentIds)
const initialPartnerStudentId = initialParticipantIds.find((id) => id !== routeStudentId) || null

// ---- 统一游戏列表：registry + resource API 合并 ----
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

const resourceBackedGames = ref<ResourceItem[]>([])

const loadResourceBackedGames = () => {
  try {
    const api = new ResourceAPI()
    const entry = currentEntry.value
    const resources = api.getResources({
      moduleCode: entry.moduleCode,
      resourceType: 'game',
    })
    resourceBackedGames.value = resources.filter((resource) =>
      matchesTrainingEntryResource(resource, currentEntryCode.value),
    )
  } catch (error) {
    console.error('加载资源游戏列表失败:', error)
    resourceBackedGames.value = []
  }
}

const allGames = computed(() => {
  const registry = registryBackedGames.value
  if (registry.length > 0) return registry
  return resourceBackedGames.value
})

const usesRegistryBackedGameLobby = computed(() => registryBackedGames.value.length > 0)

const selectedGameMaxPlayers = computed(() => {
  const raw = Number(selectedGame.value?.metadata?.maxPlayers || 1)
  return raw === 2 ? 2 : 1
})
const requiresPartnerSelection = computed(() => selectedGameMaxPlayers.value > 1)
const availablePartnerStudents = computed(() => {
  return allStudents.value.filter((candidate) => candidate.id !== studentId.value)
})
const selectedPartnerStudent = computed(() => {
  if (!selectedPartnerStudentId.value) return null
  return availablePartnerStudents.value.find((candidate) => candidate.id === selectedPartnerStudentId.value) || null
})
const canStartSelectedGame = computed(() => {
  if (!selectedGame.value) return false
  if (!requiresPartnerSelection.value) return true
  return Boolean(selectedPartnerStudent.value)
})

const getGameIconSvgUrl = (game: ResourceItem): string | undefined => {
  return getGameIconSvg(game.metadata?.gameCode, game.metadata?.mode)
}

const getEntryGameCount = (entryCode: TrainingEntryCode): number => {
  const registryBackedGameCount = entryCode === 'emotional-regulation'
    ? getEmotionalGameCount()
    : getCustomGamesByTrainingEntry(entryCode).length
  try {
    const api = new ResourceAPI()
    const entry = getTrainingEntry(entryCode)
    const resources = api.getResources({
      moduleCode: entry.moduleCode,
      resourceType: 'game',
    })
    const resourceCount = resources.filter((resource) => matchesTrainingEntryResource(resource, entryCode)).length
    return resourceCount > 0 ? resourceCount : registryBackedGameCount
  } catch {
    return registryBackedGameCount
  }
}

const selectGame = (game: ResourceItem) => {
  selectedGame.value = game
  if (game.metadata?.difficultyLocked) {
    selectedEmotionalDifficulty.value = 1
  }
}

const handleEntryChange = (newEntryCode: TrainingEntryCode) => {
  selectedGame.value = null
  selectedEmotionalDifficulty.value = 1
  selectedPartnerStudentId.value = null
  currentEntryCode.value = newEntryCode
  resourceBackedGames.value = []
  loadResourceBackedGames()

  router.replace({
    path: `/games/lobby/${studentId.value}`,
    query: {
      entry: newEntryCode,
      module: getTrainingEntry(newEntryCode).moduleCode,
    },
  })

  ElMessage.success(`已切换到 ${getTrainingEntry(newEntryCode).name}`)
}

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

const loadStudents = async () => {
  try {
    const api = new StudentAPI()
    const students = await api.getAllStudents()
    allStudents.value = Array.isArray(students) ? students : []
  } catch (error: any) {
    console.error('加载学生列表失败:', error)
  }
}

const handleStartGame = (gameConfig: {
  resourceId: number
  taskId: number
  mode: string
  studentId: number
  gridSize?: number
  rounds?: number
  timeLimit?: number
  duration?: number
  targetSize?: number
  targetSpeed?: number
  airXylophoneDifficulty?: string
  woodBlockDifficulty?: string
  bubblePopMode?: string
  bubblePopDifficulty?: string
}) => {
  const query: Record<string, string> = {
    studentId: String(gameConfig.studentId),
    studentName: student.value?.name || '',
    resourceId: String(gameConfig.resourceId),
    taskId: String(gameConfig.taskId),
    mode: gameConfig.mode,
    entry: currentEntryCode.value,
    module: currentEntry.value.moduleCode,
  }
  if (gameConfig.gridSize !== undefined) query.gridSize = String(gameConfig.gridSize)
  if (gameConfig.rounds !== undefined) query.rounds = String(gameConfig.rounds)
  if (gameConfig.timeLimit !== undefined) query.timeLimit = String(gameConfig.timeLimit)
  if (gameConfig.duration !== undefined) query.duration = String(gameConfig.duration)
  if (gameConfig.targetSize !== undefined) query.targetSize = String(gameConfig.targetSize)
  if (gameConfig.targetSpeed !== undefined) query.targetSpeed = String(gameConfig.targetSpeed)
  if (gameConfig.airXylophoneDifficulty) query.airXylophoneDifficulty = gameConfig.airXylophoneDifficulty
  if (gameConfig.woodBlockDifficulty) query.woodBlockDifficulty = gameConfig.woodBlockDifficulty
  if (gameConfig.bubblePopMode) query.bubblePopMode = gameConfig.bubblePopMode
  if (gameConfig.bubblePopDifficulty) query.bubblePopDifficulty = gameConfig.bubblePopDifficulty

  router.push({ path: '/games/play', query })
}

const handleStartEmotionalGame = () => {
  if (!selectedGame.value) return

  if (requiresPartnerSelection.value && !selectedPartnerStudent.value) {
    ElMessage.warning('合作造汉堡需要先选择一位协作伙伴')
    return
  }

  const entryPath = typeof selectedGame.value.metadata?.entryPath === 'string'
    ? selectedGame.value.metadata.entryPath
    : '/emotional/games/balloon'

  const query: Record<string, string> = {
    entry: currentEntryCode.value,
    module: currentEntry.value.moduleCode,
    studentId: String(studentId.value),
    studentName: student.value?.name || '',
    difficulty: String(selectedEmotionalDifficulty.value),
    difficultyLocked: String(Boolean(selectedGame.value.metadata?.difficultyLocked)),
  }

  if (requiresPartnerSelection.value && selectedPartnerStudent.value) {
    query.participantStudentIds = [studentId.value, selectedPartnerStudent.value.id].join(',')
    query.participantStudentNames = [student.value?.name || '', selectedPartnerStudent.value.name].join('|')
  }

  router.push({ path: entryPath, query })
}

const goBackToStudentList = () => {
  router.push({
    path: '/games/select-student',
    query: { entry: currentEntryCode.value, module: currentEntry.value.moduleCode },
  })
}

onMounted(async () => {
  if (!studentId.value) {
    ElMessage.error('缺少学生ID')
    goBackToStudentList()
    return
  }
  await Promise.all([loadStudent(), loadStudents()])
  loadResourceBackedGames()
})

watch(registryBackedGames, (games) => {
  if (games.length === 0) {
    selectedGame.value = null
    return
  }
  const selectedGameCode = typeof selectedGame.value?.metadata?.gameCode === 'string'
    ? selectedGame.value.metadata.gameCode
    : ''
  const matchedGame = games.find((game) => game.metadata?.gameCode === selectedGameCode)
  selectedGame.value = matchedGame || games[0] || null
  selectedEmotionalDifficulty.value = 1
}, { immediate: true })

watch(resourceBackedGames, (games) => {
  if (registryBackedGames.value.length > 0) return
  if (games.length === 0) {
    selectedGame.value = null
    return
  }
  if (!selectedGame.value || !games.some((g) => g.id === selectedGame.value!.id)) {
    selectedGame.value = games[0] || null
  }
})

watch(
  [requiresPartnerSelection, availablePartnerStudents],
  ([requiresPartner]) => {
    if (!requiresPartner) {
      selectedPartnerStudentId.value = null
      return
    }
    const hasCurrentSelection = availablePartnerStudents.value.some(
      (candidate) => candidate.id === selectedPartnerStudentId.value,
    )
    if (hasCurrentSelection) return
    if (initialPartnerStudentId && availablePartnerStudents.value.some((c) => c.id === initialPartnerStudentId)) {
      selectedPartnerStudentId.value = initialPartnerStudentId
      return
    }
    if (availablePartnerStudents.value.length === 1) {
      selectedPartnerStudentId.value = availablePartnerStudents.value[0]?.id || null
      return
    }
    selectedPartnerStudentId.value = null
  },
  { immediate: true },
)
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

/* ---- 统一左侧卡片列表 ---- */
.game-card-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.game-card {
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

.game-card:hover,
.game-card.selected {
  border-color: #f5a623;
  background: #fffaf0;
  box-shadow: 0 10px 24px rgba(245, 166, 35, 0.12);
}

.game-card-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  color: #fff;
  font-size: 34px;
  border-radius: 18px;
  box-shadow: 0 14px 26px rgba(245, 108, 108, 0.18);
}

.game-card-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.game-card-copy strong {
  font-size: 17px;
  color: #303133;
}

.game-card-copy span {
  font-size: 13px;
  color: #909399;
}

/* ---- 统一右侧预览卡片 ---- */
.preview-card {
  border-radius: 18px;
}

.preview-header {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.preview-emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 88px;
  height: 88px;
  color: #fff;
  font-size: 40px;
  border-radius: 18px;
  box-shadow: 0 14px 26px rgba(245, 108, 108, 0.18);
}

.preview-copy h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.preview-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}

.preview-meta__sep {
  color: #dcdfe6;
}

.preview-body {
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

.preview-block__hint {
  margin-bottom: 12px !important;
}

.preview-game-config {
  margin-top: 4px;
}

.partner-select {
  width: 100%;
}

.partner-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.partner-option small {
  color: #909399;
}

.partner-chip {
  margin-top: 10px !important;
  font-size: 13px;
  color: #7a5618 !important;
}

.preview-actions {
  margin-top: 22px;
  text-align: center;
}

.start-button {
  width: 100%;
  max-width: 340px;
  height: 58px;
  border: none;
  border-radius: 28px;
  font-size: 18px;
  background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%);
  box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
  transition: all 0.3s ease;
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
}

.start-button:active {
  transform: translateY(0);
}

.start-icon {
  margin-right: 8px;
  font-size: 22px;
}

.start-text {
  font-weight: 500;
  color: #fff;
}

/* ---- 模块切换器 ---- */
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

.resource-count-tag {
  margin-left: auto;
}
</style>
