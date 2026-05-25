<template>
  <el-card class="game-preview-card" :class="{ 'game-preview-card--immersive': showConfigInline }">
    <div class="game-header">
      <div class="game-emoji" :style="emojiStyle">
        {{ emoji }}
      </div>

      <div class="game-title-section">
        <div v-if="showConfigInline" class="immersive-badge">全屏沉浸式训练</div>
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

    <div class="game-description">
      <p>{{ game.description || metaData?.description || '暂无描述' }}</p>
    </div>

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

    <div class="game-instructions">
      <h4>游戏说明</h4>
      <ul>
        <li>根据游戏提示完成各项任务</li>
        <li>尽量保持专注，减少错误率</li>
        <li>系统会自动记录训练数据</li>
      </ul>
    </div>

    <div v-if="showConfigInline" class="config-card">
      <div class="config-section">
        <h4 class="config-title">开始前设置</h4>

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

        <template v-else-if="isHandGame">
          <div class="config-item">
            <label>训练时长</label>
            <el-radio-group v-model="config.duration" size="large">
              <el-radio-button :value="45">45秒</el-radio-button>
              <el-radio-button :value="60">60秒</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
            </el-radio-group>
          </div>
        </template>
      </div>
    </div>

    <div class="start-section">
      <el-button
        type="primary"
        size="large"
        class="start-button"
        :loading="starting"
        @click="showConfigInline ? handleStartGame() : showConfigDialog()"
      >
        <span class="start-icon">{{ showConfigInline ? '🖐️' : '🚀' }}</span>
        <span class="start-text">{{ showConfigInline ? '进入全屏训练' : '开始游戏' }}</span>
      </el-button>
      <p class="start-hint">
        {{ showConfigInline ? '参数将在进入训练时直接生效' : '点击按钮配置训练参数，系统将记录训练数据' }}
      </p>
    </div>

    <el-dialog
      v-if="!showConfigInline"
      v-model="configDialogVisible"
      title="训练配置"
      width="480px"
      :close-on-click-modal="false"
      class="config-dialog"
    >
      <div class="config-section">
        <h4 class="config-title">难度设置</h4>

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

        <template v-else-if="isHandGame">
          <div class="config-item">
            <label>训练时长</label>
            <el-radio-group v-model="config.duration" size="large">
              <el-radio-button :value="45">45秒</el-radio-button>
              <el-radio-button :value="60">60秒</el-radio-button>
              <el-radio-button :value="90">90秒</el-radio-button>
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
import { computed, reactive, ref, watch } from 'vue'
import { Clock, TrendCharts, VideoCamera } from '@element-plus/icons-vue'
import { TaskID, type GridSize } from '@/types/games'
import type { ResourceItem } from '@/types/module'

interface Props {
  game: ResourceItem
  studentId: number
  launchVariant?: 'default' | 'sensory-immersive'
}

const props = withDefaults(defineProps<Props>(), {
  launchVariant: 'default',
})

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

const starting = ref(false)
const configDialogVisible = ref(false)

const config = reactive({
  gridSize: 2 as GridSize,
  rounds: 5,
  timeLimit: 60,
  duration: 30,
  targetSize: 60,
  targetSpeed: 2,
})

const metaData = computed(() => {
  return props.game.metadata || null
})

const taskId = computed(() => {
  return metaData.value?.taskId || props.game.legacyId || 0
})

const showConfigInline = computed(() => props.launchVariant === 'sensory-immersive')

const isVisualMatchGame = computed(() => {
  return [
    TaskID.COLOR_MATCH,
    TaskID.SHAPE_MATCH,
    TaskID.ICON_MATCH,
  ].includes(taskId.value)
})

const isVisualTrackGame = computed(() => taskId.value === TaskID.VISUAL_TRACK)
const isAudioDiffGame = computed(() => taskId.value === TaskID.AUDIO_DIFF)
const isAudioCommandGame = computed(() => taskId.value === TaskID.AUDIO_COMMAND)
const isAudioRhythmGame = computed(() => taskId.value === TaskID.AUDIO_RHYTHM)
const isHandGame = computed(() => [
  TaskID.HAND_XYLOPHONE,
  TaskID.HAND_WOOD_BLOCKS,
  TaskID.HAND_GESTURE_GARDEN,
].includes(taskId.value))

const emoji = computed(() => metaData.value?.emoji || props.game.coverImage || '🎮')
const difficulty = computed(() => metaData.value?.difficulty || '中等')
const duration = computed(() => metaData.value?.duration || '3-5分钟')

const categoryLabel = computed(() => {
  const labels: Record<string, string> = {
    visual: '视觉训练',
    audio: '听觉训练',
    tactile: '触觉训练',
    motor: '体感训练',
  }

  return labels[props.game.category || ''] || props.game.category || '综合训练'
})

const categoryTagType = computed(() => {
  const types: Record<string, '' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
    visual: 'primary',
    audio: 'warning',
    tactile: 'danger',
    motor: 'success',
  }

  return types[props.game.category || ''] || 'info'
})

const emojiStyle = computed(() => {
  return {
    background: metaData.value?.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  }
})

function resetConfig() {
  if (isVisualMatchGame.value) {
    config.gridSize = 2
    config.timeLimit = 60
    config.rounds = 5
    return
  }

  if (isVisualTrackGame.value) {
    config.duration = 30
    config.targetSize = 60
    config.targetSpeed = 2
    return
  }

  if (isAudioDiffGame.value) {
    config.timeLimit = 60
    config.rounds = 5
    return
  }

  if (isAudioCommandGame.value) {
    config.gridSize = 2
    config.timeLimit = 60
    config.rounds = 5
    return
  }

  if (isAudioRhythmGame.value) {
    config.rounds = 5
    return
  }

  if (isHandGame.value) {
    config.duration = 45
  }
}

function buildGameConfig() {
  const mode = metaData.value?.mode || ''

  if (!taskId.value) {
    throw new Error('无法获取 taskId')
  }

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
    studentId: props.studentId,
  }

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
  } else if (isHandGame.value) {
    gameConfig.duration = config.duration
  }

  return gameConfig
}

const showConfigDialog = () => {
  resetConfig()
  configDialogVisible.value = true
}

const handleStartGame = async () => {
  starting.value = true

  try {
    const gameConfig = buildGameConfig()
    console.log('[GamePreviewCard] 开始游戏，配置:', gameConfig)
    emit('start-game', gameConfig)
    configDialogVisible.value = false
  } catch (error) {
    console.error('[GamePreviewCard] 构建游戏配置失败:', error)
  } finally {
    starting.value = false
  }
}

watch(
  [taskId, showConfigInline, () => props.game.id],
  ([, inline]) => {
    if (inline) {
      resetConfig()
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.game-preview-card {
  height: fit-content;
}

.game-preview-card--immersive {
  border: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 250, 255, 0.96)),
    linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(59, 130, 246, 0.08));
  box-shadow: 0 22px 54px rgba(15, 23, 42, 0.08);
}

.game-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.game-emoji {
  display: flex;
  width: 80px;
  height: 80px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 16px;
  font-size: 40px;
}

.game-title-section {
  flex: 1;
}

.immersive-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  margin-bottom: 10px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  background: rgba(191, 219, 254, 0.82);
}

.game-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.game-tags {
  display: flex;
  gap: 8px;
}

.game-description {
  margin-bottom: 20px;
}

.game-description p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

.game-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 8px;
  background: #f5f7fa;
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

.game-instructions {
  margin-bottom: 24px;
  padding: 16px;
  border-left: 4px solid #409eff;
  border-radius: 8px;
  background: #ecf5ff;
}

.game-instructions h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.game-instructions ul {
  margin: 0;
  padding-left: 20px;
}

.game-instructions li {
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
}

.immersive-callout {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
  padding: 18px 20px;
  border-radius: 18px;
  color: #0f172a;
  background: linear-gradient(135deg, rgba(254, 249, 195, 0.95), rgba(219, 234, 254, 0.95));
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.immersive-callout strong {
  font-size: 16px;
}

.immersive-callout span {
  font-size: 13px;
  line-height: 1.7;
  color: #475569;
}

.config-card {
  margin-bottom: 20px;
  padding: 18px 20px 6px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.start-section {
  padding-top: 8px;
  text-align: center;
}

.start-button {
  width: 100%;
  max-width: 340px;
  height: 58px;
  border: none;
  border-radius: 28px;
  font-size: 18px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  margin-right: 8px;
  font-size: 22px;
}

.start-text {
  font-weight: 500;
}

.start-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: #909399;
}

.config-section {
  padding: 10px 0;
}

.config-title {
  margin: 0 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.config-item {
  margin-bottom: 24px;
}

.config-item label {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
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
