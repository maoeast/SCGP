<!-- src/views/assessment/cognitive-self/Report.vue -->
<template>
  <div class="cognitive-self-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>综合认知自测（图形匹配）评估报告<el-tag size="small" type="warning" class="draft-tag">自编 DRAFT</el-tag></h2>
          </div>
        </div>
      </template>

      <div class="overview" v-if="assessData">
        <div class="score-item">
          <div class="score-label">离差 IQ 估算</div>
          <div class="score-value">{{ assessData.iq_estimate ?? 100 }}</div>
          <div class="score-range">M=100，SD=15</div>
          <div class="score-level">{{ assessData.level }}</div>
        </div>
        <div class="score-item">
          <div class="score-label">百分位</div>
          <div class="score-value">{{ assessData.percentile_rank ?? 50 }}</div>
          <div class="score-range">超越同龄人群中该比例</div>
        </div>
        <div class="score-item">
          <div class="score-label">正确率</div>
          <div class="score-value">{{ accuracyPercent }}%</div>
          <div class="score-range">答对 {{ assessData.total_raw_score ?? 0 }} / {{ assessData.total_questions ?? 0 }}</div>
        </div>
        <div class="score-item" v-if="reactionAvailable">
          <div class="score-label">平均反应时</div>
          <div class="score-value">{{ Math.round(assessData.avg_response_time ?? 0) }} <span class="unit">ms</span></div>
          <div class="score-range">参考区间 {{ rtRange.lowerMs }}–{{ rtRange.upperMs }} ms</div>
        </div>
      </div>
    </el-card>

    <el-card v-if="dimRows.length" class="dimension-card">
      <template #header><h3>两个难度维度（基础 / 细节辨别）</h3></template>
      <el-table :data="dimRows" style="width: 100%">
        <el-table-column prop="name" label="维度" min-width="220" />
        <el-table-column label="答对 / 总数" width="130" align="center">
          <template #default="{ row }">{{ row.correct }} / {{ row.total }}</template>
        </el-table-column>
        <el-table-column label="答对率" width="220" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.rate" :color="getRateColor(row.rate)" :stroke-width="14" text-inside />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="disclaimer">
      <div class="disclaimer-content">
        <el-icon><WarningFilled /></el-icon>
        <p>
          <strong>重要提示：</strong>本测验为「自编占位题 + 占位常模」的草稿版，图形由代码程序化生成，
          <strong>非标准化测验</strong>，无标准化效度；反应时参考区间亦为占位估值。结果仅供教育支持与发展监测参考，
          不能作为医学诊断依据。如结果提示显著落后，请前往正规医院发育行为儿科或心理科进一步评估。
        </p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, WarningFilled } from '@element-plus/icons-vue'
import { CognitiveSelfAssessmentAPI } from '@/database/api'
import { cognitiveSelfRtReferenceRange } from '@/database/cognitive-self-norms'

const route = useRoute()
const router = useRouter()
const assessData = ref<any>(null)

interface DimRow {
  code: string
  name: string
  correct: number
  total: number
  rate: number
}

const accuracyPercent = computed(() => {
  const r = assessData.value?.accuracy_rate
  if (typeof r === 'number' && r >= 0) return Math.round(r * 100)
  return 0
})

/** 是否展示反应时卡：优先看 extra_data.reactionAvailable，否则看 avg_response_time > 0 */
const reactionAvailable = computed(() => {
  const extra = parseExtra(assessData.value?.extra_data)
  if (extra?.reactionAvailable !== undefined) return !!extra.reactionAvailable
  return (assessData.value?.avg_response_time ?? 0) > 0
})

const rtRange = computed(() => {
  const ageMonths = assessData.value?.age_months ?? 132
  return cognitiveSelfRtReferenceRange(ageMonths)
})

const dimRows = computed<DimRow[]>(() => {
  const raw = assessData.value?.unit_scores
  if (!raw) return []
  try {
    const obj = JSON.parse(raw) as Record<string, { name?: string; correct?: number; total?: number }>
    return Object.entries(obj).map(([code, v]) => {
      const correct = v.correct ?? 0
      const total = v.total ?? 0
      return {
        code,
        name: v.name ?? code,
        correct,
        total,
        rate: total > 0 ? Math.round((correct / total) * 100) : 0,
      }
    })
  } catch {
    return []
  }
})

function parseExtra(raw: any): any {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function getRateColor(rate: number): string {
  if (rate >= 80) return '#67c23a'
  if (rate >= 50) return '#409eff'
  if (rate >= 30) return '#e6a23c'
  return '#f56c6c'
}

function goBack() {
  router.back()
}

onMounted(() => {
  const assessId = Number(route.params.assessId)
  if (!assessId) {
    ElMessage.error('缺少评估记录 ID')
    return
  }
  const api = new CognitiveSelfAssessmentAPI()
  const data = api.getAssessment(assessId)
  if (!data) {
    ElMessage.error('未找到评估记录')
    return
  }
  assessData.value = data
})
</script>

<style scoped>
.cognitive-self-report {
  padding: 16px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.draft-tag {
  margin-left: 8px;
}
.overview {
  display: flex;
  gap: 48px;
  flex-wrap: wrap;
}
.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 160px;
}
.score-label {
  color: #909399;
  font-size: 13px;
}
.score-value {
  font-size: 30px;
  font-weight: 600;
  color: #303133;
}
.score-value .unit {
  font-size: 16px;
  font-weight: 500;
  color: #909399;
}
.score-range {
  font-size: 12px;
  color: #c0c4cc;
}
.score-level {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}
.dimension-card {
  margin-top: 16px;
}
.disclaimer {
  margin-top: 16px;
}
.disclaimer-content {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: #e6a23c;
}
.disclaimer-content p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}
</style>
