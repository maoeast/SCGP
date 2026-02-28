<template>
  <el-card class="game-preview-card">
    <!-- 游戏头部 -->
    <div class="game-header">
      <div class="game-emoji" :style="emojiStyle">
        {{ emoji }}
      </div>
      <div class="game-title-section">
        <h2 class="game-title">{{ game.name }}</h2>
        <div class="game-tags">
          <el-tag :type="categoryTagType" size="small">
            {{ categoryLabel }}
          </el-tag>
          <el-tag type="info" size="small">
            {{ difficulty }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 游戏描述 -->
    <div class="game-description">
      <p>{{ game.description || metaData?.description || '暂无描述' }}</p>
    </div>

    <!-- 游戏信息 -->
    <div class="game-info">
      <div class="info-item">
        <el-icon><Clock /></el-icon>
        <span>预计时长：{{ duration }}</span>
      </div>
      <div class="info-item">
        <el-icon><TrendCharts /></el-icon>
        <span>难度：{{ difficulty }}</span>
      </div>
      <div class="info-item">
        <el-icon><VideoCamera /></el-icon>
        <span>类型：{{ categoryLabel }}</span>
      </div>
    </div>

    <!-- 游戏说明 -->
    <div class="game-instructions">
      <h4>游戏说明</h4>
      <ul>
        <li>根据游戏提示完成各项任务</li>
        <li>尽量保持专注，减少错误率</li>
        <li>系统会自动记录训练数据</li>
      </ul>
    </div>

    <!-- 开始游戏按钮 -->
    <div class="start-section">
      <el-button
        type="primary"
        size="large"
        class="start-button"
        @click="showConfigDialog"
      >
        <span class="start-icon">🚀</span>
        <span class="start-text">开始游戏</span>
      </el-button>
      <p class="start-hint">点击按钮配置训练参数，系统将记录训练数据</p>
    </div>

    <!-- 训练配置对话框 -->
    <el-dialog
      v-model="configDialogVisible"
      title="训练配置"
      width="480px"
      :close-on-click-modal="false"
      class="config-dialog"
    >
      <div class="config-section">
        <h4 class="config-title">难度设置</h4>

        <!-- 颜色配对 / 形状识别 / 物品配对 -->
        <template v-if="isVisualMatchGame">
          <div class="config-item">
            <label>网格大小</label>
            <el-radio-group v-model="config.gridSize" size="large">
              <el-radio-button :value="2">2×2</el-radio-button>
              <el-radio-button :value="3">3×3</el-radio-button>
              <el-radio-button :value="4">4×4</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-item">
            <label>时间限制</label>
            <el-radio-group v-model="config.timeLimit" size="large">
              <el-radio-button :value="60">60秒</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
              <el-radio-button :value="120">120秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-item">
            <label>训练轮次</label>
            <el-radio-group v-model="config.rounds" size="large">
              <el-radio-button :value="5">5轮</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- 视觉追踪 -->
        <template v-else-if="isVisualTrackGame">
          <div class="config-item">
            <label>训练时长</label>
            <el-radio-group v-model="config.duration" size="large">
              <el-radio-button :value="30">30秒</el-radio-button>
              <el-radio-button :value="60">60秒</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-item">
            <label>目标大小</label>
            <el-radio-group v-model="config.targetSize" size="large">
              <el-radio-button :value="40">小</el-radio-button>
              <el-radio-button :value="60">中</el-radio-button>
              <el-radio-button :value="80">大</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-item">
            <label>移动速度</label>
            <el-radio-group v-model="config.targetSpeed" size="large">
              <el-radio-button :value="1">慢速</el-radio-button>
              <el-radio-button :value="2">中速</el-radio-button>
              <el-radio-button :value="3">快速</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- 声音辨别 -->
        <template v-else-if="isAudioDiffGame">
          <div class="config-item">
            <label>时间限制</label>
            <el-radio-group v-model="config.timeLimit" size="large">
              <el-radio-button :value="60">60秒</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
              <el-radio-button :value="120">120秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-item">
            <label>训练轮次</label>
            <el-radio-group v-model="config.rounds" size="large">
              <el-radio-button :value="5">5轮</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- 听指令做动作 -->
        <template v-else-if="isAudioCommandGame">
          <div class="config-item">
            <label>网格大小</label>
            <el-radio-group v-model="config.gridSize" size="large">
              <el-radio-button :value="2">2×2</el-radio-button>
              <el-radio-button :value="3">3×3</el-radio-button>
              <el-radio-button :value="4">4×4</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-item">
            <label>时间限制</label>
            <el-radio-group v-model="config.timeLimit" size="large">
              <el-radio-button :value="60">60秒</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
              <el-radio-button :value="120">120秒</el-radio-button>
            </el-radio-group>
          </div>
          <div class="config-item">
            <label>训练轮次</label>
            <el-radio-group v-model="config.rounds" size="large">
              <el-radio-button :value="5">5轮</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>

        <!-- 节奏模仿 -->
        <template v-else-if="isAudioRhythmGame">
          <div class="config-item">
            <label>训练轮次</label>
            <el-radio-group v-model="config.rounds" size="large">
              <el-radio-button :value="5">5轮</el-radio-button>
              <el-radio-button :value="8">8轮</el-radio-button>
              <el-radio-button :value="10">10轮</el-radio-button>
            </el-radio-group>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="configDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="starting" @click="handleStartGame">
            开始训练
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Clock, TrendCharts, VideoCamera } from '@element-plus/icons-vue'
import type { ResourceItem } from '@/types/module'
import { TaskID, type GridSize } from '@/types/games'

interface Props {
  game: ResourceItem
  studentId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'start-game': [config: {
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
  }]
}>()

// 状态
const starting = ref(false)
const configDialogVisible = ref(false)

// 训练配置
const config = reactive({
  gridSize: 2 as GridSize,
  rounds: 5,
  timeLimit: 60,
  duration: 30,
  targetSize: 60,
  targetSpeed: 2
})

// 解析元数据
const metaData = computed(() => {
  if (props.game.metadata) {
    return props.game.metadata
  }
  return null
})

// 获取 taskId
const taskId = computed(() => {
  return metaData.value?.taskId || props.game.legacyId || 0
})

// 游戏类型判断
// 颜色配对、形状识别、物品配对
const isVisualMatchGame = computed(() => {
  return [
    TaskID.COLOR_MATCH,
    TaskID.SHAPE_MATCH,
    TaskID.ICON_MATCH
  ].includes(taskId.value)
})

// 视觉追踪
const isVisualTrackGame = computed(() => {
  return taskId.value === TaskID.VISUAL_TRACK
})

// 声音辨别
const isAudioDiffGame = computed(() => {
  return taskId.value === TaskID.AUDIO_DIFF
})

// 听指令做动作
const isAudioCommandGame = computed(() => {
  return taskId.value === TaskID.AUDIO_COMMAND
})

// 节奏模仿
const isAudioRhythmGame = computed(() => {
  return taskId.value === TaskID.AUDIO_RHYTHM
})

// 获取游戏属性
const emoji = computed(() => {
  return metaData.value?.emoji || props.game.coverImage || '🎮'
})

const difficulty = computed(() => {
  return metaData.value?.difficulty || '中等'
})

const duration = computed(() => {
  return metaData.value?.duration || '3-5分钟'
})

const categoryLabel = computed(() => {
  const labels: Record<string, string> = {
    visual: '视觉训练',
    audio: '听觉训练',
    tactile: '触觉训练'
  }
  return labels[props.game.category || ''] || props.game.category || '综合训练'
})

const categoryTagType = computed(() => {
  const types: Record<string, '' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
    visual: 'primary',
    audio: 'warning',
    tactile: 'danger'
  }
  return types[props.game.category || ''] || 'info'
})

// Emoji 背景样式
const emojiStyle = computed(() => {
  const color = metaData.value?.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  return {
    background: color
  }
})

// 显示配置对话框
const showConfigDialog = () => {
  // 根据游戏类型重置配置为默认值
  if (isVisualMatchGame.value) {
    config.gridSize = 2
    config.timeLimit = 60
    config.rounds = 5
  } else if (isVisualTrackGame.value) {
    config.duration = 30
    config.targetSize = 60
    config.targetSpeed = 2
  } else if (isAudioDiffGame.value) {
    config.timeLimit = 60
    config.rounds = 5
  } else if (isAudioCommandGame.value) {
    config.gridSize = 2
    config.timeLimit = 60
    config.rounds = 5
  } else if (isAudioRhythmGame.value) {
    config.rounds = 5
  }

  configDialogVisible.value = true
}

// 开始游戏
const handleStartGame = async () => {
  starting.value = true

  try {
    const mode = metaData.value?.mode || ''

    if (!taskId.value) {
      console.error('[GamePreviewCard] 无法获取 taskId')
      return
    }

    // 构建配置对象
    const gameConfig: {
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
    } = {
      resourceId: props.game.id,
      taskId: taskId.value,
      mode,
      studentId: props.studentId
    }

    // 根据游戏类型添加配置参数
    if (isVisualMatchGame.value) {
      gameConfig.gridSize = config.gridSize
      gameConfig.timeLimit = config.timeLimit
      gameConfig.rounds = config.rounds
    } else if (isVisualTrackGame.value) {
      gameConfig.duration = config.duration
      gameConfig.targetSize = config.targetSize
      gameConfig.targetSpeed = config.targetSpeed
    } else if (isAudioDiffGame.value) {
      gameConfig.timeLimit = config.timeLimit
      gameConfig.rounds = config.rounds
    } else if (isAudioCommandGame.value) {
      gameConfig.gridSize = config.gridSize
      gameConfig.timeLimit = config.timeLimit
      gameConfig.rounds = config.rounds
    } else if (isAudioRhythmGame.value) {
      gameConfig.rounds = config.rounds
    }

    console.log('[GamePreviewCard] 开始游戏，配置:', gameConfig)

    // 发射事件
    emit('start-game', gameConfig)

    // 关闭对话框
    configDialogVisible.value = false
  } finally {
    starting.value = false
  }
}
</script>

<style scoped>
.game-preview-card {
  height: fit-content;
}

/* 游戏头部 */
.game-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.game-emoji {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  border-radius: 16px;
  flex-shrink: 0;
}

.game-title-section {
  flex: 1;
}

.game-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
}

.game-tags {
  display: flex;
  gap: 8px;
}

/* 游戏描述 */
.game-description {
  margin-bottom: 20px;
}

.game-description p {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}

/* 游戏信息 */
.game-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.info-item .el-icon {
  color: #909399;
}

/* 游戏说明 */
.game-instructions {
  margin-bottom: 24px;
  padding: 16px;
  background: #ecf5ff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.game-instructions h4 {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 12px 0;
}

.game-instructions ul {
  margin: 0;
  padding-left: 20px;
}

.game-instructions li {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

/* 开始按钮区域 */
.start-section {
  text-align: center;
  padding-top: 20px;
}

.start-button {
  width: 100%;
  max-width: 300px;
  height: 56px;
  font-size: 18px;
  border-radius: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.start-button:active {
  transform: translateY(0);
}

.start-icon {
  font-size: 22px;
  margin-right: 8px;
}

.start-text {
  font-weight: 500;
}

.start-hint {
  font-size: 12px;
  color: #909399;
  margin: 12px 0 0 0;
}

/* 配置对话框样式 */
.config-section {
  padding: 10px 0;
}

.config-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.config-item {
  margin-bottom: 24px;
}

.config-item label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.config-item .el-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
