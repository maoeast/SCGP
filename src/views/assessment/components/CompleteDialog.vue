<!-- src/views/assessment/components/CompleteDialog.vue -->
<!--
  评估完成结果弹窗。

  设计要点（v2 重构）：
  - 标题唯一：Dialog 自带 "评估完成" 标题，内部不再重复"评估已完成！"。
  - 评定等级与评语去重：摘要区只放"短等级标签"（cognitive_self 用 verdict 短名，
    其余量表用 level 原值，本身即为短词），完整判读句在评语卡片展示，
    与 feedback.summary 不再二次重复。
  - cognitive_self 的 level 是完整句子（VERDICT_LABELS），禁止塞进固定尺寸 Tag，
    改用 verdict 短名映射避免溢出。
  - 报告实际在进入 complete 阶段前已同步持久化，不存在异步生成过程，
    故移除"系统正在生成详细报告..."误导文案，按钮全部可用、状态自洽。
-->
<template>
  <el-dialog
    :model-value="visible"
    title="评估完成"
    width="520px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="complete-dialog"
  >
    <div class="complete-content">
      <!-- 成功图标（小尺寸，不重复标题文案） -->
      <div class="success-row">
        <el-icon class="success-icon" color="#67C23A" :size="40">
          <CircleCheck />
        </el-icon>
        <span class="success-text">评估结果已生成</span>
      </div>

      <!-- 数据摘要：两列网格 -->
      <div class="result-summary" v-if="scoreResult">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">学生</span>
            <span class="summary-value">{{ student?.name || '-' }}</span>
          </div>
          <div class="summary-item" v-if="scoreResult.totalScore !== undefined">
            <span class="summary-label">粗分</span>
            <span class="summary-value">{{ scoreResult.totalScore }}<span class="unit"> 分</span></span>
          </div>
          <div class="summary-item" v-if="accuracyLabel">
            <span class="summary-label">正确率</span>
            <span class="summary-value">{{ accuracyLabel }}</span>
          </div>
          <div class="summary-item" v-if="avgTimeLabel">
            <span class="summary-label">平均用时</span>
            <span class="summary-value">{{ avgTimeLabel }}</span>
          </div>
          <div class="summary-item" v-if="scoreResult.standardScore">
            <span class="summary-label">标准分</span>
            <span class="summary-value highlight">{{ scoreResult.standardScore }}<span class="unit"> 分</span></span>
          </div>
          <div class="summary-item" v-if="shortLevel">
            <span class="summary-label">评定等级</span>
            <el-tag :type="levelTagType" size="default" class="level-tag">{{ shortLevel }}</el-tag>
          </div>
        </div>
      </div>

      <!-- 评语 / 建议卡片：独立柔和背景，承载完整判读 -->
      <div class="feedback-card" v-if="feedback?.summary">
        <div class="feedback-card__title">
          <el-icon><ChatLineRound /></el-icon>
          <span>评价与建议</span>
        </div>
        <p class="feedback-text">{{ feedback.summary }}</p>
      </div>

      <!-- 极端快速作答的温和提示（宽松质控：仅 info 级，不阻断任何操作） -->
      <el-alert
        v-if="isVeryFastAssessment"
        type="info"
        :closable="false"
        show-icon
        class="fast-hint"
      >
        本次评估用时较短，如有需要可重新评估以确保准确性。
      </el-alert>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleExit" size="large" class="footer-btn">
          返回列表
        </el-button>
        <el-button plain @click="handleRecommend" size="large" class="footer-btn">
          {{ recommendLabel }}
        </el-button>
        <el-button type="primary" @click="handleViewReport" size="large" class="footer-btn">
          查看报告
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck, ChatLineRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ScoreResult, AssessmentFeedback, StudentContext, AssessmentQualityMetrics } from '@/types/assessment'
import { useRecommendationStore } from '@/stores/recommendation'

interface Props {
  visible: boolean
  scoreResult: ScoreResult | null
  feedback: AssessmentFeedback | null
  student: StudentContext | null
  /** 关联评估记录 id（生成计划时回链 source_assessment_id） */
  assessmentId?: number | string
  /** 量表中文名（计划名 + 徽标） */
  scaleName?: string
  /** 作答质量指标（可选；旧数据/无法计算时不提示） */
  quality?: AssessmentQualityMetrics | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'view-report'): void
  (e: 'exit'): void
}>()

const recommendationStore = useRecommendationStore()

/**
 * cognitive_self 的 verdict（levelCode）→ 短等级名。
 * 其余量表的 level 本身即为短词（优秀/正常/边缘…），无需映射。
 * 映射缺失时回退到完整 level（但完整句子不再用于 Tag，仅作兜底）。
 */
const VERDICT_SHORT: Record<string, string> = {
  stable: '表现稳定',
  boundary: '难度边界',
  inconsistent: '表现不稳',
  unreadable: '不可判读',
  floor_risk: '基础偏弱',
  ceiling_risk: '已达上限',
}

/** 摘要区使用的短等级标签：cognitive_self 用 verdict 短名，其余量表用 level 原值 */
const shortLevel = computed(() => {
  const level = props.scoreResult?.level
  if (!level) return ''
  const code = props.scoreResult?.levelCode
  if (code && VERDICT_SHORT[code]) return VERDICT_SHORT[code]
  // 其余量表 level 多为短词（≤6 字），直接用；过长则截断避免溢出
  return level.length > 8 ? level.slice(0, 8) + '…' : level
})

// 根据评定等级确定 Tag 类型
const levelTagType = computed(() => {
  const level = props.scoreResult?.level || ''
  const code = props.scoreResult?.levelCode || ''

  if (['优秀', '高常', '正常', 'stable', 'ceiling_risk'].includes(level) || ['stable', 'ceiling_risk'].includes(code)) {
    return 'success'
  }
  if (['边缘', '轻度', 'boundary'].includes(level) || ['boundary'].includes(code)) {
    return 'warning'
  }
  if (['中度', '重度', '极重度', 'floor_risk'].includes(level) || ['floor_risk'].includes(code)) {
    return 'danger'
  }
  return 'info'
})

/** 正确率：cognitive_self 存于 extraData.accuracyRate（0-1），其余量表可能无 */
const accuracyLabel = computed(() => {
  const extra = props.scoreResult?.extraData as Record<string, any> | undefined
  const rate = extra?.accuracyRate
  if (typeof rate !== 'number') return ''
  const total = extra?.totalQuestions ?? props.scoreResult?.totalScore ?? 0
  const correct = props.scoreResult?.totalScore ?? 0
  return `${Math.round(rate * 100)}%${total > 0 ? ` (${correct}/${total})` : ''}`
})

/** 平均用时：cognitive_self 存于 extraData.overallMedianRt（ms） */
const avgTimeLabel = computed(() => {
  const extra = props.scoreResult?.extraData as Record<string, any> | undefined
  const rt = extra?.overallMedianRt
  if (typeof rt !== 'number') return ''
  return `${(rt / 1000).toFixed(1)} 秒`
})

/**
 * 极端快速作答判定：平均每题 < 2 秒（秒，墙钟口径）。
 * 仅此时显示温和提示；'fast'（2-5 秒）和正常作答都不打扰。
 */
const FAST_HINT_THRESHOLD_SEC = 2
const isVeryFastAssessment = computed(() => {
  const avg = props.quality?.avgResponseTime
  return typeof avg === 'number' && avg > 0 && avg < FAST_HINT_THRESHOLD_SEC
})

// 推荐入口文案：正常/优秀 → 能力巩固推荐；否则 → 器材推荐
const recommendLabel = computed(() => {
  const level = props.scoreResult?.level || ''
  const code = props.scoreResult?.levelCode || ''
  const isNormal = ['优秀', '高常', '正常'].includes(level) || ['stable', 'ceiling_risk'].includes(code)
  return isNormal ? '能力巩固推荐' : '器材推荐'
})

function handleViewReport() {
  emit('view-report')
}

function handleExit() {
  emit('exit')
}

function handleRecommend() {
  if (!props.scoreResult) {
    ElMessage.warning('评估结果尚未就绪')
    return
  }
  recommendationStore.generate(
    { scoreResult: props.scoreResult, assessmentId: props.assessmentId },
    { scaleName: props.scaleName, studentName: props.student?.name },
  )
}
</script>

<style scoped>
.complete-content {
  padding: 8px 0 4px;
}

/* ====== 成功图标行 ====== */
.success-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.success-icon {
  flex-shrink: 0;
}

.success-text {
  font-size: 15px;
  color: #67c23a;
  font-weight: 600;
}

/* ====== 数据摘要：两列网格 ====== */
.result-summary {
  background: #f5f7fa;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.summary-label {
  color: #909399;
  font-size: 13px;
  flex-shrink: 0;
}

.summary-value {
  color: #303133;
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-value.highlight {
  color: #409eff;
  font-weight: 600;
}

.summary-value .unit {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
}

.level-tag {
  margin: 0;
  max-width: 100%;
}

/* ====== 评语卡片 ====== */
.feedback-card {
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 10px;
  padding: 14px 16px;
}

.feedback-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #b88230;
  margin-bottom: 8px;
}

.feedback-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #606266;
  word-break: break-word;
}

/* ====== 极端快速作答温和提示 ====== */
.fast-hint {
  margin-top: 16px;
}

/* ====== Footer 按钮统一三态 ====== */
.dialog-footer {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-btn {
  min-width: 120px;
}

@media (max-width: 520px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .dialog-footer {
    flex-direction: column;
  }

  .footer-btn {
    width: 100%;
  }
}
</style>
