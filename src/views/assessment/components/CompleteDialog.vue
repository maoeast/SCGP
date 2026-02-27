<template>
  <el-dialog
    :model-value="visible"
    title="评估完成"
    width="500px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="complete-dialog"
    center
  >
    <div class="complete-content">
      <!-- 成功图标 -->
      <el-icon class="success-icon" color="#67C23A" :size="60">
        <CircleCheck />
      </el-icon>

      <h3 class="complete-title">评估已完成！</h3>

      <!-- 评估结果摘要 -->
      <div class="result-summary" v-if="scoreResult">
        <div class="summary-item">
          <span class="summary-label">学生：</span>
          <span class="summary-value">{{ student?.name }}</span>
        </div>
        <div class="summary-item" v-if="scoreResult.totalScore !== undefined">
          <span class="summary-label">粗分：</span>
          <span class="summary-value">{{ scoreResult.totalScore }} 分</span>
        </div>
        <div class="summary-item" v-if="scoreResult.standardScore">
          <span class="summary-label">标准分：</span>
          <span class="summary-value highlight">{{ scoreResult.standardScore }} 分</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">评定等级：</span>
          <el-tag :type="levelTagType" size="large">
            {{ scoreResult.level }}
          </el-tag>
        </div>
      </div>

      <!-- 反馈摘要 -->
      <div class="feedback-summary" v-if="feedback?.summary">
        <p class="feedback-text">{{ feedback.summary }}</p>
      </div>

      <p class="processing-text">系统正在生成详细报告...</p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleExit" size="large">
          返回列表
        </el-button>
        <el-button type="primary" @click="handleViewReport" size="large">
          查看报告
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck } from '@element-plus/icons-vue'
import type { ScoreResult, AssessmentFeedback, StudentContext } from '@/types/assessment'

interface Props {
  visible: boolean
  scoreResult: ScoreResult | null
  feedback: AssessmentFeedback | null
  student: StudentContext | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'view-report'): void
  (e: 'exit'): void
}>()

// 根据评定等级确定 Tag 类型
const levelTagType = computed(() => {
  const level = props.scoreResult?.level
  if (!level) return 'info'

  if (['优秀', '高常', '正常'].includes(level)) {
    return 'success'
  }
  if (['边缘', '轻度'].includes(level)) {
    return 'warning'
  }
  if (['中度', '重度', '极重度'].includes(level)) {
    return 'danger'
  }
  return 'info'
})

function handleViewReport() {
  emit('view-report')
}

function handleExit() {
  emit('exit')
}
</script>

<style scoped>
.complete-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  margin-bottom: 16px;
}

.complete-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #303133;
}

.result-summary {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  text-align: left;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px dashed #e4e7ed;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  color: #909399;
  font-size: 14px;
  min-width: 80px;
}

.summary-value {
  color: #303133;
  font-size: 15px;
  font-weight: 500;
}

.summary-value.highlight {
  color: #409eff;
  font-size: 18px;
  font-weight: 600;
}

.feedback-summary {
  background: #fdf6ec;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  text-align: left;
}

.feedback-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.processing-text {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
}
</style>
