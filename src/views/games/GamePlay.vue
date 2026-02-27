<template>
  <div class="game-play-container">
    <!-- 根据 taskId 渲染对应游戏组件 -->
    <GameGrid
      v-if="taskId === TaskID.COLOR_MATCH || taskId === TaskID.SHAPE_MATCH || taskId === TaskID.ICON_MATCH"
      :student-id="Number(studentId)"
      :task-id="taskId"
      :mode="mode as GameGridMode"
      :grid-size="gridSize"
      :time-limit="timeLimit"
      :rounds="rounds"
      @finish="handleGameFinish"
    />

    <VisualTracker
      v-else-if="taskId === TaskID.VISUAL_TRACK"
      :student-id="Number(studentId)"
      :task-id="taskId"
      :duration="duration"
      :target-size="targetSize"
      :target-speed="targetSpeed"
      @finish="handleGameFinish"
    />

    <GameAudio
      v-else-if="taskId === TaskID.AUDIO_DIFF || taskId === TaskID.AUDIO_COMMAND || taskId === TaskID.AUDIO_RHYTHM"
      :student-id="Number(studentId)"
      :task-id="taskId"
      :mode="mode as GameAudioMode"
      :grid-size="gridSize"
      :rounds="rounds"
      :time-limit="timeLimit"
      @finish="handleGameFinish"
    />

    <!-- 无效任务 -->
    <div v-else class="error-view">
      <h2>❌ 未找到训练任务</h2>
      <p>任务ID: {{ taskId }}</p>
      <el-button @click="goBack">返回</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import GameGrid from '@/components/games/visual/GameGrid.vue'
import VisualTracker from '@/components/games/visual/VisualTracker.vue'
import GameAudio from '@/components/games/audio/GameAudio.vue'
import { TaskID, type GameSessionData, type GameGridMode, type GameAudioMode } from '@/types/games'
import { GameTrainingAPI } from '@/database/api'
import { DatabaseAPI } from '@/database/api'

const router = useRouter()
const route = useRoute()

// 获取 URL 参数（使用 ref 而不是 computed，避免响应式问题）
const studentId = ref<string>(route.query.studentId as string)
const taskId = ref<TaskID>(Number(route.query.taskId) as TaskID)
const mode = ref<string>(route.query.mode as string)

// 游戏配置参数（从 URL query 获取，使用默认值）
const gridSize = ref<2 | 3 | 4>((Number(route.query.gridSize) || 2) as 2 | 3 | 4)
const distractorLevel = ref<'easy' | 'medium' | 'hard'>((route.query.distractorLevel as 'easy' | 'medium' | 'hard') || 'medium')
const timeLimit = ref<number>(Number(route.query.timeLimit) || 60)
const rounds = ref<number>(Number(route.query.rounds) || 10)
const duration = ref<number>(Number(route.query.duration) || 30)
const targetSize = ref<number>(Number(route.query.targetSize) || 60)
const targetSpeed = ref<number>(Number(route.query.targetSpeed) || 2)

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

// 保存训练记录
const saveTrainingRecord = async (sessionData: GameSessionData) => {
  try {
    const api = new GameTrainingAPI()
    const recordId = api.saveTrainingRecord({
      student_id: sessionData.studentId,
      task_id: sessionData.taskId,
      timestamp: Date.now(),
      duration: sessionData.duration,
      accuracy_rate: sessionData.accuracy,
      avg_response_time: sessionData.avgResponseTime,
      raw_data: sessionData
    })

    console.log('训练记录已保存，ID:', recordId)
    return recordId
  } catch (error) {
    console.error('保存训练记录失败:', error)
    ElMessage.error('保存训练记录失败')
    return null
  }
}

// 创建报告记录
const createReportRecord = async (recordId: number, sessionData: GameSessionData) => {
  try {
    const db = new DatabaseAPI()

    // 获取学生信息
    const students = db.query('SELECT * FROM student WHERE id = ?', [sessionData.studentId])
    if (students.length === 0) {
      console.warn('学生不存在，跳过创建报告记录')
      return
    }
    const student = students[0]

    // 生成报告标题
    const taskName = taskNames[sessionData.taskId] || '训练任务'
    const title = `IEP评估报告_${student.name}_${taskName}_${new Date().toLocaleDateString()}`

    // 创建报告记录
    db.execute(`
      INSERT INTO report_record (student_id, report_type, training_record_id, title, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      sessionData.studentId,
      'iep',
      recordId,
      title,
      new Date().toISOString()
    ])

    console.log('报告记录已创建')
  } catch (error) {
    console.error('创建报告记录失败:', error)
    // 不阻塞游戏流程，只记录错误
  }
}

// 游戏完成处理
const handleGameFinish = async (sessionData: GameSessionData) => {
  console.log('游戏完成，数据:', sessionData)

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
          taskId: String(sessionData.taskId)
        }
      })
    }, 1000)
  } else {
    // 保存失败，返回菜单
    setTimeout(() => {
      router.push('/games')
    }, 2000)
  }
}

// 返回
const goBack = () => {
  router.push('/games')
}

// 验证参数
onMounted(() => {
  console.log('GamePlay mounted', {
    studentId: studentId.value,
    taskId: taskId.value,
    mode: mode.value,
    gridSize: gridSize.value,
    distractorLevel: distractorLevel.value,
    timeLimit: timeLimit.value,
    rounds: rounds.value,
    duration: duration.value,
    targetSize: targetSize.value,
    targetSpeed: targetSpeed.value
  })

  // 更严格的参数验证
  if (!studentId.value || isNaN(Number(studentId.value))) {
    ElMessage.error('学生ID无效')
    goBack()
    return
  }

  if (!taskId.value || isNaN(taskId.value) || taskId.value < 1 || taskId.value > 7) {
    ElMessage.error('任务ID无效')
    goBack()
    return
  }

  if (!mode.value) {
    ElMessage.error('游戏模式未指定')
    goBack()
    return
  }
})
</script>

<style scoped>
.game-play-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background: #f5f7fa;
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
