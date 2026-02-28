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
        :loading="starting"
        @click="handleStartGame"
      >
        <span class="start-icon">🚀</span>
        <span class="start-text">开始游戏</span>
      </el-button>
      <p class="start-hint">点击按钮开始训练，系统将记录训练数据</p>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock, TrendCharts, VideoCamera } from '@element-plus/icons-vue'
import type { ResourceItem } from '@/types/module'

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
  }]
}>()

// 状态
const starting = ref(false)

// 解析元数据
const metaData = computed(() => {
  // ResourceItem 接口中定义的是 metadata（驼峰命名）
  if (props.game.metadata) {
    return props.game.metadata
  }
  return null
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

// 开始游戏
const handleStartGame = async () => {
  starting.value = true

  try {
    // 从元数据获取 taskId 和 mode
    const taskId = metaData.value?.taskId || props.game.legacyId || 0
    const mode = metaData.value?.mode || ''

    if (!taskId) {
      console.error('[GamePreviewCard] 无法获取 taskId')
      return
    }

    if (!mode) {
      console.warn('[GamePreviewCard] 无法获取 mode，使用默认值')
    }

    // 发射事件
    emit('start-game', {
      resourceId: props.game.id,
      taskId,
      mode,
      studentId: props.studentId
    })
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
</style>
