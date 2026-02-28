<template>
  <div class="game-play-container">
    <!-- 加载中状态 -->
    <div v-if="loading" class="loading-view">
      <el-icon class="loading-icon" :size="48"><Loading /></el-icon>
      <p>正在加载游戏...</p>
    </div>

    <!-- 根据 taskId 渲染对应游戏组件 -->
    <template v-else-if="taskId">
      <GameGrid
        v-if="isGridGame"
        :student-id="studentId"
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
        :task-id="taskId"
        :mode="mode as GameAudioMode"
        :grid-size="gridSize"
        :rounds="rounds"
        :time-limit="timeLimit"
        @finish="handleGameFinish"
      />

      <!-- 未知游戏类型 -->
      <div v-else class="error-view">
        <h2>❌ 未识别的游戏类型</h2>
        <p>任务ID: {{ taskId }}，模式: {{ mode }}</p>
        <el-button @click="goBack">返回</el-button>
      </div>
    </template>

    <!-- 无效任务 -->
    <div v-else class="error-view">
      <h2>❌ 未找到训练任务</h2>
      <p>资源ID: {{ resourceId }}</p>
      <el-button @click="goBack">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import GameGrid from '@/components/games/visual/GameGrid.vue'
import VisualTracker from '@/components/games/visual/VisualTracker.vue'
import GameAudio from '@/components/games/audio/GameAudio.vue'
import { TaskID, type GameSessionData, type GameGridMode, type GameAudioMode } from '@/types/games'
import { GameTrainingAPI, DatabaseAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import type { ResourceItem } from '@/types/module'

const router = useRouter()
const route = useRoute()

// ========== 状态 ==========
const loading = ref(true)
const gameResource = ref<ResourceItem | null>(null)

// 从 URL 参数获取基础信息
const studentId = ref<number>(Number(route.query.studentId) || 0)
const resourceId = ref<number>(Number(route.query.resourceId) || 0)
const moduleCode = ref<string>((route.query.module as string) || 'sensory')

// 从资源加载的游戏配置
const taskId = ref<TaskID | null>(null)
const mode = ref<string>('')

// 游戏参数（从 URL query 获取，使用默认值）
const gridSize = ref<2 | 3 | 4>((Number(route.query.gridSize) || 2) as 2 | 3 | 4)
const timeLimit = ref<number>(Number(route.query.timeLimit) || 60)
const rounds = ref<number>(Number(route.query.rounds) || 10)
const duration = ref<number>(Number(route.query.duration) || 30)
const targetSize = ref<number>(Number(route.query.targetSize) || 60)
const targetSpeed = ref<number>(Number(route.query.targetSpeed) || 2)

// 兼容旧版 URL 参数（直接传 taskId）
const legacyTaskId = ref<number>(Number(route.query.taskId) || 0)
const legacyMode = ref<string>((route.query.mode as string) || '')

// ========== 计算属性 ==========

// 判断是否为 Grid 游戏
const isGridGame = computed(() => {
  return taskId.value && [
    TaskID.COLOR_MATCH,
    TaskID.SHAPE_MATCH,
    TaskID.ICON_MATCH
  ].includes(taskId.value)
})

// 判断是否为 Audio 游戏
const isAudioGame = computed(() => {
  return taskId.value && [
    TaskID.AUDIO_DIFF,
    TaskID.AUDIO_COMMAND,
    TaskID.AUDIO_RHYTHM
  ].includes(taskId.value)
})

// 任务名称映射
const taskNames: Record<number, string> = {
  [TaskID.COLOR_MATCH]: '颜色配对游戏',
  [TaskID.SHAPE_MATCH]: '形状识别游戏',
  [TaskID.ICON_MATCH]: '物品配对游戏',
  [TaskID.VISUAL_TRACK]: '视觉追踪游戏',
  [TaskID.AUDIO_DIFF]: '声音辨别游戏',
  [TaskID.AUDIO_COMMAND]: '听指令做动作',
  [TaskID.AUDIO_RHYTHM]: '节奏模仿游戏'
}

// ========== 方法 ==========

/**
 * 从资源表加载游戏配置
 */
const loadGameFromResource = async () => {
  // 优先使用 resourceId 从资源表加载
  if (resourceId.value) {
    try {
      const api = new ResourceAPI()
      const resource = api.getResourceById(resourceId.value)

      if (resource) {
        gameResource.value = resource as unknown as ResourceItem

        // 从元数据解析游戏配置
        let metaData = null
        if (resource.meta_data) {
          try {
            metaData = typeof resource.meta_data === 'string'
              ? JSON.parse(resource.meta_data)
              : resource.meta_data
          } catch (e) {
            console.warn('[GamePlay] 解析元数据失败:', e)
          }
        }

        // 设置游戏配置
        taskId.value = metaData?.taskId || resource.legacy_id || null
        mode.value = metaData?.mode || ''

        console.log('[GamePlay] 从资源加载游戏配置:', {
          resourceId: resourceId.value,
          taskId: taskId.value,
          mode: mode.value,
          metaData
        })

        return true
      }
    } catch (error) {
      console.error('[GamePlay] 加载游戏资源失败:', error)
    }
  }

  // 兼容旧版：直接使用 URL 中的 taskId 和 mode
  if (legacyTaskId.value) {
    taskId.value = legacyTaskId.value as TaskID
    mode.value = legacyMode.value
    console.log('[GamePlay] 使用旧版 URL 参数:', {
      taskId: taskId.value,
      mode: mode.value
    })
    return true
  }

  return false
}

/**
 * 保存训练记录（带 module_code）
 */
const saveTrainingRecord = async (sessionData: GameSessionData) => {
  try {
    const api = new GameTrainingAPI()

    // 使用 saveTrainingRecord 方法（已支持 module_code）
    const recordId = api.saveTrainingRecord({
      student_id: sessionData.studentId,
      task_id: sessionData.taskId,
      timestamp: Date.now(),
      duration: sessionData.duration,
      accuracy_rate: sessionData.accuracy,
      avg_response_time: sessionData.avgResponseTime,
      raw_data: sessionData,
      module_code: moduleCode.value  // 关键：传递 module_code
    })

    console.log('[GamePlay] 训练记录已保存，ID:', recordId, 'module_code:', moduleCode.value)
    return recordId
  } catch (error) {
    console.error('[GamePlay] 保存训练记录失败:', error)
    ElMessage.error('保存训练记录失败')
    return null
  }
}

/**
 * 创建报告记录
 */
const createReportRecord = async (recordId: number, sessionData: GameSessionData) => {
  try {
    const db = new DatabaseAPI()

    // 获取学生信息
    const students = db.query('SELECT * FROM student WHERE id = ?', [sessionData.studentId])
    if (students.length === 0) {
      console.warn('[GamePlay] 学生不存在，跳过创建报告记录')
      return
    }
    const student = students[0]

    // 生成报告标题
    const taskName = taskNames[sessionData.taskId] || '训练任务'
    const title = `IEP评估报告_${student.name}_${taskName}_${new Date().toLocaleDateString()}`

    // 创建报告记录（包含 module_code）
    db.execute(`
      INSERT INTO report_record (student_id, report_type, training_record_id, title, module_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      sessionData.studentId,
      'iep',
      recordId,
      title,
      moduleCode.value,  // 关键：传递 module_code
      new Date().toISOString()
    ])

    console.log('[GamePlay] 报告记录已创建，module_code:', moduleCode.value)
  } catch (error) {
    console.error('[GamePlay] 创建报告记录失败:', error)
    // 不阻塞游戏流程，只记录错误
  }
}

/**
 * 游戏完成处理
 */
const handleGameFinish = async (sessionData: GameSessionData) => {
  console.log('[GamePlay] 游戏完成，数据:', sessionData)

  // 保存训练记录
  const recordId = await saveTrainingRecord(sessionData)

  if (recordId) {
    // 创建报告记录
    await createReportRecord(recordId, sessionData)

    // 显示完成信息
    ElMessage.success('🎉 训练完成！正在生成报告...')

    // 跳转到 IEP 报告页面
    setTimeout(() => {
      router.push({
        path: '/games/report',
        query: {
          recordId: String(recordId),
          studentId: String(sessionData.studentId),
          taskId: String(sessionData.taskId),
          module: moduleCode.value
        }
      })
    }, 1000)
  } else {
    // 保存失败，返回游戏大厅
    setTimeout(() => {
      router.push(`/games/lobby/${studentId.value}?module=${moduleCode.value}`)
    }, 2000)
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.push(`/games/lobby/${studentId.value}?module=${moduleCode.value}`)
}

// ========== 生命周期 ==========

onMounted(async () => {
  console.log('[GamePlay] 组件挂载，参数:', {
    studentId: studentId.value,
    resourceId: resourceId.value,
    taskId: legacyTaskId.value,
    mode: legacyMode.value,
    module: moduleCode.value
  })

  // 参数验证
  if (!studentId.value || isNaN(studentId.value)) {
    ElMessage.error('学生ID无效')
    goBack()
    return
  }

  // 加载游戏配置
  const loaded = await loadGameFromResource()

  if (!loaded || !taskId.value) {
    ElMessage.error('无法加载游戏配置')
    goBack()
    return
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
    moduleCode: moduleCode.value
  })
})
</script>

<style scoped>
.game-play-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background: #f5f7fa;
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
  animation: spin 1s linear infinite;
  color: #409eff;
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

.error-view h2 {
  font-size: 32px;
  color: #333;
  margin-bottom: 10px;
}

.error-view p {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}
</style>
