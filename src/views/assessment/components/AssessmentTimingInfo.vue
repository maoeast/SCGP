<!-- src/views/assessment/components/AssessmentTimingInfo.vue -->
<!--
  评估用时信息卡（宽松质控配套展示）。

  设计要点：
  - 客观展示"评估用时 / 平均每题"，不做价值判断，不展示 quality_note
  - 两字段全为 NULL/undefined 时整卡不渲染（旧记录无感，向后兼容）
  - 供 17 个量表报告页复用，替代逐份复制粘贴的模板片段
-->
<template>
  <el-card v-if="hasTimingData" class="assessment-timing-info" shadow="never">
    <div class="timing-items">
      <div class="timing-item">
        <el-icon class="timing-icon"><Clock /></el-icon>
        <span class="timing-label">评估用时</span>
        <span class="timing-value">{{ durationLabel }}</span>
      </div>
      <div class="timing-item" v-if="avgLabel">
        <el-icon class="timing-icon"><Timer /></el-icon>
        <span class="timing-label">平均每题</span>
        <span class="timing-value">{{ avgLabel }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Timer } from '@element-plus/icons-vue'

interface Props {
  /** 总用时（秒）；NULL/undefined 表示旧记录未采集 */
  totalDuration?: number | null
  /** 平均每题用时（秒）；NULL/undefined 表示旧记录未采集 */
  avgResponseTime?: number | null
}

const props = defineProps<Props>()

/** 两字段都缺失时整卡不渲染（旧记录兼容） */
const hasTimingData = computed(() => {
  return validSeconds(props.totalDuration) !== null || validSeconds(props.avgResponseTime) !== null
})

function validSeconds(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

const durationLabel = computed(() => {
  const seconds = validSeconds(props.totalDuration)
  if (seconds === null) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins <= 0) return `${secs}秒`
  return `${mins}分${secs}秒`
})

const avgLabel = computed(() => {
  const seconds = validSeconds(props.avgResponseTime)
  if (seconds === null) return ''
  return `${seconds.toFixed(1)}秒`
})
</script>

<style scoped>
.assessment-timing-info {
  margin-top: 20px;
}

.assessment-timing-info :deep(.el-card__body) {
  padding: 12px 20px;
}

.timing-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
}

.timing-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.timing-icon {
  color: #909399;
}

.timing-label {
  color: #909399;
}

.timing-value {
  color: #303133;
  font-weight: 500;
}
</style>
