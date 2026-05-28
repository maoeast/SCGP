<template>
  <div class="game-play-container" :class="{ 'game-play-container--sensory': shouldUseSensoryShell }">
    <div v-if="loading" class="loading-view">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <p>正在加载游戏...</p>
    </div>

    <template v-else-if="taskId">
      <SensoryGameShell
        v-if="shouldUseSensoryShell"
        :title="gameTitle"
        :summary="gameSummary"
        :student-name="studentName"
        :mode-label="modeLabel"
        :duration-label="durationLabel"
        :music-available="sensoryMusicAvailable"
        :music-enabled="audioSettings.musicEnabled"
        :music-volume="audioSettings.musicVolume"
        :effects-enabled="audioSettings.effectsEnabled"
        :theme="sensoryShellTheme"
        @update-audio-settings="applySharedGameAudioSettings"
        @back="goBack"
      >
        <div class="game-play-stage">
          <GameGrid
            v-if="isGridGame"
            :student-id="studentId"
            :student-name="studentName"
            :task-id="taskId"
            :mode="mode as GameGridMode"
            :grid-size="gridSize"
            :time-limit="timeLimit"
            :rounds="rounds"
            @finish="handleGameFinish"
          />

          <VisualTracker
            v-else-if="taskId === TaskID.VISUAL_TRACK"
            :student-id="studentId"
            :task-id="taskId"
            :duration="duration"
            :target-size="targetSize"
            :target-speed="targetSpeed"
            @finish="handleGameFinish"
          />

          <GameAudio
            v-else-if="isAudioGame"
            :student-id="studentId"
            :student-name="studentName"
            :task-id="taskId"
            :mode="mode as GameAudioMode"
            :grid-size="gridSize"
            :rounds="rounds"
            :time-limit="timeLimit"
            @finish="handleGameFinish"
          />

          <HandXylophoneGame
            v-else-if="taskId === TaskID.HAND_XYLOPHONE"
            :student-id="studentId"
            :task-id="taskId"
            :duration="duration"
            :difficulty="airXylophoneDifficulty"
            @finish="handleGameFinish"
          />

          <WoodBlockPuzzleGame
            v-else-if="taskId === TaskID.HAND_WOOD_BLOCKS"
            :student-id="studentId"
            :task-id="taskId"
            :difficulty="woodBlockDifficulty"
            @finish="handleGameFinish"
          />

          <BubblePopGame
            v-else-if="taskId === TaskID.HAND_BUBBLE_POP"
            :student-id="studentId"
            :task-id="taskId"
            :duration="duration"
            :mode="bubblePopMode"
            :difficulty="bubblePopDifficulty"
            :music-enabled="audioSettings.musicEnabled"
            :music-volume="audioSettings.musicVolume"
            :effects-enabled="audioSettings.effectsEnabled"
            @update-audio-settings="applySharedGameAudioSettings"
            @back="goBack"
            @finish="handleGameFinish"
          />

          <AirConductorGame
            v-else-if="taskId === TaskID.AIR_CONDUCTOR"
            :student-id="studentId"
            :task-id="taskId"
            :duration="duration"
            @finish="handleGameFinish"
          />

          <div v-else class="error-view error-view--embedded">
            <h2>❌ 未识别的游戏类型</h2>
            <p>任务ID: {{ taskId }}，模式: {{ mode }}</p>
            <el-button @click="goBack">返回</el-button>
          </div>
        </div>
      </SensoryGameShell>

      <div v-else class="game-play-stage">
        <GameGrid
          v-if="isGridGame"
          :student-id="studentId"
          :student-name="studentName"
          :task-id="taskId"
          :mode="mode as GameGridMode"
          :grid-size="gridSize"
          :time-limit="timeLimit"
          :rounds="rounds"
          @finish="handleGameFinish"
        />

        <VisualTracker
          v-else-if="taskId === TaskID.VISUAL_TRACK"
          :student-id="studentId"
          :task-id="taskId"
          :duration="duration"
          :target-size="targetSize"
          :target-speed="targetSpeed"
          @finish="handleGameFinish"
        />

        <GameAudio
          v-else-if="isAudioGame"
          :student-id="studentId"
          :student-name="studentName"
          :task-id="taskId"
          :mode="mode as GameAudioMode"
          :grid-size="gridSize"
          :rounds="rounds"
          :time-limit="timeLimit"
          @finish="handleGameFinish"
        />

        <HandXylophoneGame
          v-else-if="taskId === TaskID.HAND_XYLOPHONE"
          :student-id="studentId"
          :task-id="taskId"
          :duration="duration"
          :difficulty="airXylophoneDifficulty"
          @finish="handleGameFinish"
        />

        <WoodBlockPuzzleGame
          v-else-if="taskId === TaskID.HAND_WOOD_BLOCKS"
          :student-id="studentId"
          :task-id="taskId"
          :difficulty="woodBlockDifficulty"
          @finish="handleGameFinish"
        />

        <BubblePopGame
          v-else-if="taskId === TaskID.HAND_BUBBLE_POP"
          :student-id="studentId"
          :task-id="taskId"
          :duration="duration"
          :mode="bubblePopMode"
          :difficulty="bubblePopDifficulty"
          :music-enabled="audioSettings.musicEnabled"
          :music-volume="audioSettings.musicVolume"
          :effects-enabled="audioSettings.effectsEnabled"
          @update-audio-settings="applySharedGameAudioSettings"
          @back="goBack"
          @finish="handleGameFinish"
        />

        <AirConductorGame
          v-else-if="taskId === TaskID.AIR_CONDUCTOR"
          :student-id="studentId"
          :task-id="taskId"
          :duration="duration"
          @finish="handleGameFinish"
        />

        <div v-else class="error-view">
          <h2>❌ 未识别的游戏类型</h2>
          <p>任务ID: {{ taskId }}，模式: {{ mode }}</p>
          <el-button @click="goBack">返回</el-button>
        </div>
      </div>
    </template>

    <div v-else class="error-view">
      <h2>❌ 未找到训练任务</h2>
      <p>资源ID: {{ resourceId }}</p>
      <el-button @click="goBack">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import {
  loadGameAudioSettings,
  saveGameAudioSettings,
  type SharedGameAudioSettings,
} from '@/audio/game-audio-settings'
import {
  createGameMusicController,
  GAME_MUSIC_CONTROLLER_KEY,
} from '@/audio/game-music-controller'
import {
  getDefaultMusicStateForLegacyTask,
  hasLegacyGameBackgroundMusic,
  resolveLegacyGameMusicProfile,
} from '@/audio/game-music-profiles'
import SensoryGameShell from '@/components/games/SensoryGameShell.vue'
import GameAudio from '@/components/games/audio/GameAudio.vue'
import HandXylophoneGame from '@/components/games/hand/AirXylophoneGame.vue'
import BubblePopGame from '@/components/games/hand/BubblePopGame.vue'
import WoodBlockPuzzleGame from '@/components/games/hand/WoodBlockPuzzleGame.vue'
import AirConductorGame from '@/components/games/pose/AirConductorGame.vue'
import GameGrid from '@/components/games/visual/GameGrid.vue'
import VisualTracker from '@/components/games/visual/VisualTracker.vue'
import {
  resolveAirXylophoneDifficulty,
  type AirXylophoneDifficultyId,
} from '@/data/air-xylophone-songs'
import {
  WOOD_BLOCK_DIFFICULTIES,
  getWoodBlockDifficultyLabel,
  sanitizeWoodBlockDifficulty,
  type WoodBlockDifficultyId,
} from '@/components/games/hand/wood-block-puzzle'
import {
  getBubblePopDifficultyLabel,
  getBubblePopModeLabel,
  sanitizeBubblePopFreeModeDuration,
  sanitizeBubblePopDifficulty,
  sanitizeBubblePopMode,
  type BubblePopDifficultyId,
  type BubblePopModeId,
} from '@/components/games/hand/bubble-pop-game'
import { DatabaseAPI, GameTrainingAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import { TaskID, type GameAudioMode, type GameGridMode, type GameSessionData } from '@/types/games'
import type { ResourceItem } from '@/types/module'
import { resolveTrainingEntryCode, resolveTrainingEntryCodeFromResource } from '@/utils/training-entry'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const gameResource = ref<ResourceItem | null>(null)
const audioSettings = reactive<SharedGameAudioSettings>(loadGameAudioSettings())
const gameMusicController = createGameMusicController(audioSettings)

provide(GAME_MUSIC_CONTROLLER_KEY, gameMusicController)

const studentId = ref<number>(Number(route.query.studentId) || 0)
const studentName = computed(() => String(route.query.studentName || ''))
const resourceId = ref<number>(Number(route.query.resourceId) || 0)
const moduleCode = ref<string>((route.query.module as string) || 'sensory')
const entryCode = ref<string>(resolveTrainingEntryCode(route.query.entry, route.query.module))
const launchSource = ref<string>((route.query.from as string) || '')

const taskId = ref<TaskID | null>(null)
const mode = ref<string>('')

const gridSize = ref<2 | 3 | 4>((Number(route.query.gridSize) || 2) as 2 | 3 | 4)
const timeLimit = ref<number>(Number(route.query.timeLimit) || 60)
const rounds = ref<number>(Number(route.query.rounds) || 10)
const duration = ref<number>(Number(route.query.duration) || 30)
const targetSize = ref<number>(Number(route.query.targetSize) || 128)
const targetSpeed = ref<number>(Number(route.query.targetSpeed) || 2)
const airXylophoneDifficulty = ref<AirXylophoneDifficultyId>(
  resolveAirXylophoneDifficulty(String(route.query.airXylophoneDifficulty || 'medium')).id,
)
const woodBlockDifficulty = ref<WoodBlockDifficultyId>(
  sanitizeWoodBlockDifficulty(route.query.woodBlockDifficulty),
)
const bubblePopMode = ref<BubblePopModeId>(
  sanitizeBubblePopMode(route.query.bubblePopMode),
)
const bubblePopDifficulty = ref<BubblePopDifficultyId>(
  sanitizeBubblePopDifficulty(route.query.bubblePopDifficulty),
)

const legacyTaskId = ref<number>(Number(route.query.taskId) || 0)
const legacyMode = ref<string>((route.query.mode as string) || '')
let hasEnsuredGameMusicReady = false
let cleanupEnsureReadyListeners: (() => void) | null = null

function getDefaultModeForTask(nextTaskId: TaskID | null): string {
  if (nextTaskId === TaskID.AIR_CONDUCTOR) {
    return 'air-conductor'
  }

  return ''
}

const isGridGame = computed(() => {
  return taskId.value !== null && [
    TaskID.COLOR_MATCH,
    TaskID.SHAPE_MATCH,
    TaskID.ICON_MATCH,
  ].includes(taskId.value)
})

const isAudioGame = computed(() => {
  return taskId.value !== null && [
    TaskID.AUDIO_DIFF,
    TaskID.AUDIO_COMMAND,
    TaskID.AUDIO_RHYTHM,
  ].includes(taskId.value)
})

const isHandGame = computed(() => {
  return taskId.value !== null && [
    TaskID.HAND_XYLOPHONE,
    TaskID.HAND_WOOD_BLOCKS,
    TaskID.HAND_BUBBLE_POP,
    TaskID.AIR_CONDUCTOR,
  ].includes(taskId.value)
})

const shouldUseSensoryShell = computed(() => entryCode.value === 'sensory-integration')
const sensoryShellTheme = computed(() => {
  if (taskId.value === TaskID.AUDIO_RHYTHM) return 'rhythm'
  if (taskId.value === TaskID.AUDIO_DIFF) return 'audio-diff'
  if (taskId.value === TaskID.AUDIO_COMMAND) return 'audio-command'
  if (taskId.value === TaskID.HAND_BUBBLE_POP) return 'bubble-pop'
  if (taskId.value === TaskID.AIR_CONDUCTOR) return 'shape-match'
  if (isHandGame.value) return 'shape-match'
  if (taskId.value === TaskID.COLOR_MATCH) return 'color-match'
  if (taskId.value === TaskID.SHAPE_MATCH || taskId.value === TaskID.ICON_MATCH) return 'shape-match'
  return 'default'
})
const sensoryMusicAvailable = computed(() => (
  taskId.value !== null ? hasLegacyGameBackgroundMusic(taskId.value) : false
))

const taskNames: Record<number, string> = {
  [TaskID.COLOR_MATCH]: '颜色配对',
  [TaskID.SHAPE_MATCH]: '形状识别',
  [TaskID.ICON_MATCH]: '物品配对',
  [TaskID.VISUAL_TRACK]: '视觉追踪',
  [TaskID.AUDIO_DIFF]: '声音辨别',
  [TaskID.AUDIO_COMMAND]: '听指令做动作',
  [TaskID.AUDIO_RHYTHM]: '节奏模仿',
  [TaskID.HAND_XYLOPHONE]: '空气木琴',
  [TaskID.HAND_WOOD_BLOCKS]: '木块磁贴拼图',
  [TaskID.HAND_BUBBLE_POP]: '打泡泡',
  [TaskID.AIR_CONDUCTOR]: '空中魔法指挥棒',
}

const modeLabel = computed(() => {
  if (taskId.value === TaskID.COLOR_MATCH) return '视觉配对'
  if (taskId.value === TaskID.SHAPE_MATCH) return '图形辨别'
  if (taskId.value === TaskID.ICON_MATCH) return '视觉联想'
  if (taskId.value === TaskID.VISUAL_TRACK) return '视觉追踪'
  if (taskId.value === TaskID.AUDIO_DIFF) return '听觉辨别'
  if (taskId.value === TaskID.AUDIO_COMMAND) return '听觉理解'
  if (taskId.value === TaskID.AUDIO_RHYTHM) return '节奏模仿'
  if (taskId.value === TaskID.HAND_XYLOPHONE) return '体感节奏'
  if (taskId.value === TaskID.HAND_WOOD_BLOCKS) return '抓放配对'
  if (taskId.value === TaskID.HAND_BUBBLE_POP) return '手眼戳击'
  if (taskId.value === TaskID.AIR_CONDUCTOR) return '姿态追踪'
  return mode.value || '综合训练'
})

const gameTitle = computed(() => {
  return gameResource.value?.name || (taskId.value ? taskNames[taskId.value] : '') || '感统训练'
})

const gameSummary = computed(() => {
  const resourceSummary = typeof gameResource.value?.description === 'string' ? gameResource.value.description.trim() : ''
  if (resourceSummary) {
    return resourceSummary
  }

  if (taskId.value === TaskID.VISUAL_TRACK) {
    return '请在全屏训练区内持续跟随移动目标，优先保证孩子能稳定看到目标与反馈。'
  }

  if (isAudioGame.value) {
    if (taskId.value === TaskID.AUDIO_RHYTHM) {
      return '先看鼓点示范，再跟着节奏轻轻拍打，让每一拍都稳稳落在音乐里。'
    }

    return '进入训练后请优先使用手指直接操作大按钮，保持孩子注意力集中在当前一轮任务。'
  }

  if (isHandGame.value) {
    if (taskId.value === TaskID.HAND_BUBBLE_POP) {
      return '把手伸向漂浮泡泡做连续戳击，也可以切换到颜色分类模式训练抑制控制和目标命中。'
    }

    return '通过摄像头识别手部动作，也支持鼠标或触摸备用操作，用节奏敲击、抓放匹配和手势转换训练动作计划与感官统合。'
  }

  return '进入训练后请直接使用手指完成当前目标匹配，系统会自动记录训练过程和结果。'
})

const durationLabel = computed(() => {
  const resourceDuration = gameResource.value?.metadata?.duration
  if (isHandGame.value) {
    if (taskId.value === TaskID.HAND_XYLOPHONE) {
      return `${duration.value}秒`
    }

    if (taskId.value === TaskID.HAND_WOOD_BLOCKS) {
      const config = WOOD_BLOCK_DIFFICULTIES[woodBlockDifficulty.value]
      return config.timeLimit > 0
        ? `${getWoodBlockDifficultyLabel(woodBlockDifficulty.value)} · ${config.timeLimit}秒`
        : `${getWoodBlockDifficultyLabel(woodBlockDifficulty.value)} · 完成目标`
    }

    if (taskId.value === TaskID.HAND_BUBBLE_POP) {
      const durationLabel = bubblePopMode.value === 'color' ? '20个目标' : `${duration.value}秒`
      return `${getBubblePopModeLabel(bubblePopMode.value)} · ${getBubblePopDifficultyLabel(bubblePopDifficulty.value)} · ${durationLabel}`
    }

    if (taskId.value === TaskID.AIR_CONDUCTOR) {
      return `${duration.value}秒`
    }

    return '完成目标'
  }

  if (taskId.value === TaskID.VISUAL_TRACK) {
    return `${duration.value}秒`
  }

  if (typeof resourceDuration === 'string' && resourceDuration.trim()) {
    return resourceDuration
  }

  if (isGridGame.value || isAudioGame.value) {
    return `${rounds.value}轮 / ${timeLimit.value}秒`
  }

  return ''
})

const loadGameFromResource = async () => {
  if (resourceId.value) {
    try {
      const api = new ResourceAPI()
      const resource = api.getResourceById(resourceId.value)

      if (resource) {
        gameResource.value = resource as unknown as ResourceItem
        const metaData = resource.metadata || null

        taskId.value = metaData?.taskId || resource.legacyId || legacyTaskId.value || null
        mode.value = metaData?.mode || legacyMode.value || getDefaultModeForTask(taskId.value)

        console.log('[GamePlay] 从资源加载游戏配置:', {
          resourceId: resourceId.value,
          taskId: taskId.value,
          mode: mode.value,
          metaData,
        })

        return true
      }
    } catch (error) {
      console.error('[GamePlay] 加载游戏资源失败:', error)
    }
  }

  if (legacyTaskId.value) {
    taskId.value = legacyTaskId.value as TaskID
    mode.value = legacyMode.value || getDefaultModeForTask(taskId.value)
    console.log('[GamePlay] 使用旧版 URL 参数:', {
      taskId: taskId.value,
      mode: mode.value,
    })
    return true
  }

  return false
}

function applySharedGameAudioSettings(nextSettings: SharedGameAudioSettings) {
  const normalized = saveGameAudioSettings(nextSettings)
  audioSettings.musicEnabled = normalized.musicEnabled
  audioSettings.musicVolume = normalized.musicVolume
  audioSettings.effectsEnabled = normalized.effectsEnabled
  gameMusicController.applySettings(normalized)
}

function detachEnsureReadyListeners() {
  cleanupEnsureReadyListeners?.()
  cleanupEnsureReadyListeners = null
}

function installEnsureReadyListeners() {
  if (typeof window === 'undefined' || cleanupEnsureReadyListeners) {
    return
  }

  const triggerEnsureReady = () => {
    if (hasEnsuredGameMusicReady) {
      detachEnsureReadyListeners()
      return
    }

    gameMusicController.ensureReady().then(() => {
      hasEnsuredGameMusicReady = true
      detachEnsureReadyListeners()
    }).catch(() => {
      // Keep listeners attached so the next gesture can retry Tone startup.
    })
  }

  const pointerListenerOptions: AddEventListenerOptions = { capture: true, passive: true }
  const keyListenerOptions: AddEventListenerOptions = { capture: true }

  window.addEventListener('pointerdown', triggerEnsureReady, pointerListenerOptions)
  window.addEventListener('touchstart', triggerEnsureReady, pointerListenerOptions)
  window.addEventListener('keydown', triggerEnsureReady, keyListenerOptions)

  cleanupEnsureReadyListeners = () => {
    window.removeEventListener('pointerdown', triggerEnsureReady, pointerListenerOptions)
    window.removeEventListener('touchstart', triggerEnsureReady, pointerListenerOptions)
    window.removeEventListener('keydown', triggerEnsureReady, keyListenerOptions)
  }
}

const saveTrainingRecord = async (sessionData: GameSessionData) => {
  try {
    const api = new GameTrainingAPI()

    const recordId = api.saveTrainingRecord({
      student_id: sessionData.studentId,
      task_id: sessionData.taskId,
      resource_id: resourceId.value || null,
      resource_type: gameResource.value?.resourceType || 'game',
      session_type: gameResource.value?.resourceType || 'game',
      entry_code: gameResource.value ? resolveTrainingEntryCodeFromResource(gameResource.value) : entryCode.value,
      timestamp: Date.now(),
      duration: sessionData.duration,
      accuracy_rate: sessionData.accuracy,
      avg_response_time: sessionData.avgResponseTime,
      raw_data: sessionData,
      module_code: moduleCode.value,
    })

    console.log('[GamePlay] 训练记录已保存，ID:', recordId, 'module_code:', moduleCode.value)
    return recordId
  } catch (error) {
    console.error('[GamePlay] 保存训练记录失败:', error)
    ElMessage.error('保存训练记录失败')
    return null
  }
}

const createReportRecord = async (recordId: number, sessionData: GameSessionData) => {
  try {
    const db = new DatabaseAPI()
    const students = db.query('SELECT * FROM student WHERE id = ?', [sessionData.studentId])

    if (students.length === 0) {
      console.warn('[GamePlay] 学生不存在，跳过创建报告记录')
      return
    }

    const student = students[0]
    const taskName = taskNames[sessionData.taskId] || '训练任务'
    const title = `IEP评估报告_${student.name}_${taskName}_${new Date().toLocaleDateString()}`

    db.execute(`
      INSERT INTO report_record (student_id, report_type, training_record_id, title, module_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      sessionData.studentId,
      'iep',
      recordId,
      title,
      moduleCode.value,
      new Date().toISOString(),
    ])

    console.log('[GamePlay] 报告记录已创建，module_code:', moduleCode.value)
  } catch (error) {
    console.error('[GamePlay] 创建报告记录失败:', error)
  }
}

watch(taskId, (nextTaskId) => {
  if (nextTaskId === null) {
    return
  }

  gameMusicController.setProfile(resolveLegacyGameMusicProfile(nextTaskId))
  gameMusicController.setState(getDefaultMusicStateForLegacyTask(nextTaskId))
})

const handleGameFinish = async (sessionData: GameSessionData) => {
  gameMusicController.setState('finish')
  console.log('[GamePlay] 游戏完成，数据:', sessionData)

  const recordId = await saveTrainingRecord(sessionData)

  if (recordId) {
    await createReportRecord(recordId, sessionData)

    ElMessage.success('🎉 训练完成！正在生成报告...')

    setTimeout(() => {
      router.push({
        path: '/games/report',
        query: {
          recordId: String(recordId),
          studentId: String(sessionData.studentId),
          taskId: String(sessionData.taskId),
          entry: entryCode.value,
          module: moduleCode.value,
        },
      })
    }, 1000)
  } else {
    setTimeout(() => {
      goBack()
    }, 2000)
  }
}

onBeforeRouteLeave(() => {
  gameMusicController.stopMusic()
})

const goBack = () => {
  gameMusicController.stopMusic()

  if (launchSource.value === 'dashboard') {
    router.push('/dashboard')
    return
  }

  if (launchSource.value === 'plan') {
    router.push('/training-plan')
    return
  }

  router.push({
    path: `/games/lobby/${studentId.value}`,
    query: {
      entry: entryCode.value,
      module: moduleCode.value,
    },
  })
}

onMounted(async () => {
  console.log('[GamePlay] 组件挂载，参数:', {
    studentId: studentId.value,
    resourceId: resourceId.value,
    taskId: legacyTaskId.value,
    mode: legacyMode.value,
    module: moduleCode.value,
  })

  if (!studentId.value || Number.isNaN(studentId.value)) {
    ElMessage.error('学生ID无效')
    goBack()
    return
  }

  installEnsureReadyListeners()

  const loaded = await loadGameFromResource()

  if (!loaded || !taskId.value) {
    ElMessage.error('无法加载游戏配置')
    goBack()
    return
  }

  if (taskId.value === TaskID.HAND_XYLOPHONE && route.query.duration === undefined) {
    duration.value = 60
  }

  if (taskId.value === TaskID.HAND_BUBBLE_POP && bubblePopMode.value === 'free') {
    duration.value = sanitizeBubblePopFreeModeDuration(route.query.duration)
  }

  if (taskId.value === TaskID.AIR_CONDUCTOR && route.query.duration === undefined) {
    duration.value = 60
  }

  if (!mode.value) {
    ElMessage.error('游戏模式未指定')
    goBack()
    return
  }

  loading.value = false

  console.log('[GamePlay] 游戏配置加载完成:', {
    taskId: taskId.value,
    mode: mode.value,
    moduleCode: moduleCode.value,
  })
})
onBeforeUnmount(() => {
  detachEnsureReadyListeners()
  gameMusicController.dispose()
})
</script>

<style scoped>
.game-play-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background: #f5f7fa;
}

.game-play-container--sensory {
  height: 100dvh;
  overflow: hidden;
  background: transparent;
}

.game-play-stage {
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
}

.loading-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

.loading-icon {
  color: #409eff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-view p {
  margin-top: 16px;
  font-size: 16px;
  color: #606266;
}

.error-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}

.error-view--embedded {
  width: 100%;
  height: auto;
  min-height: 360px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
}

.error-view h2 {
  margin-bottom: 10px;
  font-size: 32px;
  color: #333;
}

.error-view p {
  margin-bottom: 20px;
  font-size: 16px;
  color: #666;
}

.game-play-container--sensory :deep(.game-grid-container),
.game-play-container--sensory :deep(.game-audio-container),
.game-play-container--sensory :deep(.visual-tracker-container),
.game-play-container--sensory :deep(.hand-camera-layer) {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  background: transparent;
}

.game-play-container--sensory :deep(.game-grid-container),
.game-play-container--sensory :deep(.game-audio-container) {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.game-play-container--sensory :deep(.visual-tracker-container) {
  min-height: 0;
  height: 100%;
}

.game-play-container--sensory :deep(.hand-camera-layer) {
  min-height: 0;
  height: 100%;
}

.game-play-container--sensory :deep(.game-header) {
  border-radius: 26px;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
}

.game-play-container--sensory :deep(.game-grid) {
  flex: 1;
}

.game-play-container--sensory :deep(.game-area) {
  height: min(72vh, calc(100dvh - 310px));
  min-height: 520px;
  max-height: none;
}
</style>
