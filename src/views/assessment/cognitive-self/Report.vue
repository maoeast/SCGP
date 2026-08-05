<!-- src/views/assessment/cognitive-self/Report.vue -->
<!--
  视知觉图形匹配筛查任务（DRAFT）评估报告（v4）

  描述性结果（不输出 IQ / 百分位 / 标准分）：
  - 总正确数 / 正确率 / 判读结论 / 正确题中位 RT / 漏答数 / 预期性作答数
  - 四级难度表现（层正确数 + 层中位 RT，每层 ≥2 道有效正确题才显示 RT）
  - 错误类型分布（属性机会分母动态生成，选项级统计）
  - 作答有效性卡片（练习题表现 / 地板天花板提示 / 层级置信 / 重测提示）
-->
<template>
  <div class="cognitive-self-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>视知觉图形匹配筛查（DRAFT）评估报告<el-tag size="small" type="warning" class="draft-tag">自编 DRAFT</el-tag></h2>
          </div>
        </div>
      </template>

      <div class="overview" v-if="assessData">
        <div class="score-item">
          <div class="score-label">总正确数</div>
          <div class="score-value">{{ assessData.total_raw_score ?? 0 }}<span class="unit"> / {{ assessData.total_questions ?? 0 }}</span></div>
          <div class="score-range">正确率 {{ accuracyPercent }}%（等权计分）</div>
        </div>
        <div class="score-item">
          <div class="score-label">判读结论</div>
          <div class="score-value score-value--small">{{ extra.verdictLabel || '本次表现稳定' }}</div>
          <div class="score-range">描述性参考，非诊断</div>
        </div>
        <div class="score-item" v-if="overallMedianRt !== null">
          <div class="score-label">答对平均用时</div>
          <div class="score-value">{{ (overallMedianRt / 1000).toFixed(1) }} <span class="unit">秒</span></div>
          <div class="score-range">答对的题平均用时；没有同龄对照，不作速度评价</div>
        </div>
        <div class="score-item" v-if="(extra.omittedCount ?? 0) > 0 || (extra.anticipatoryCount ?? 0) > 0">
          <div class="score-label">作答质量</div>
          <div class="score-value score-value--small">
            <template v-if="(extra.omittedCount ?? 0) > 0">超时未答 {{ extra.omittedCount }} 题</template>
            <template v-if="(extra.omittedCount ?? 0) > 0 && (extra.anticipatoryCount ?? 0) > 0"> · </template>
            <template v-if="(extra.anticipatoryCount ?? 0) > 0">快速乱点 {{ extra.anticipatoryCount }} 次</template>
          </div>
          <div class="score-range">超时未答不算答错；快速作答可能是误触</div>
        </div>
      </div>
    </el-card>

    <el-card v-if="layerRows.length" class="dimension-card">
      <template #header><h3>各难度层级完成情况</h3></template>
      <el-table :data="layerRows" style="width: 100%">
        <el-table-column prop="name" label="题目难度" min-width="200" />
        <el-table-column label="答对 / 总数" width="130" align="center">
          <template #default="{ row }">{{ row.correct }} / {{ row.total }}</template>
        </el-table-column>
        <el-table-column label="完成情况" width="200" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.rate" :color="getRateColor(row.rate)" :stroke-width="14" text-inside />
          </template>
        </el-table-column>
        <el-table-column label="答对平均用时" width="180" align="center">
          <template #default="{ row }">
            {{ row.medianRt !== null ? (row.medianRt / 1000).toFixed(1) + ' 秒' : '数据不足' }}
          </template>
        </el-table-column>
      </el-table>
      <p class="table-hint">每类难度只有 4 道题：答错 1 道就占 25%，结果只作参考。</p>
    </el-card>

    <el-card v-if="errorRows.length" class="dimension-card">
      <template #header><h3>错在哪里（错误类型分布）</h3></template>
      <el-table :data="errorRows" style="width: 100%">
        <el-table-column prop="label" label="错误类型" min-width="160" />
        <el-table-column prop="errors" label="实际发生" width="120" align="center" />
        <el-table-column label="这类选项出现次数" width="160" align="center">
          <template #default="{ row }">{{ row.opportunities }}</template>
        </el-table-column>
        <el-table-column label="说明" min-width="240">
          <template #default="{ row }">{{ row.note }}</template>
        </el-table-column>
      </el-table>
      <p class="table-hint">"这类选项出现次数"由题库自动统计，供老师判断孩子是在哪类图上出错。</p>
    </el-card>

    <el-card v-if="assessData" class="dimension-card">
      <template #header><h3>作答有效性</h3></template>
      <div class="validity-list">
        <div class="validity-item">
          <span class="validity-label">练习题（不计分）</span>
          <span class="validity-value">
            <el-tag :type="practicePassed ? 'success' : 'warning'" size="small">
              {{ practicePassed ? '两题通过' : '未全部通过（请先确认规则理解）' }}
            </el-tag>
          </span>
        </div>
        <div class="validity-item" v-if="extra.verdict === 'floor_risk'">
          <span class="validity-label">基础题没做好</span>
          <span class="validity-value">最简单的题也答不对：先确认孩子是否理解规则、状态是否合适，必要时请专业人员看看</span>
        </div>
        <div class="validity-item" v-if="extra.verdict === 'ceiling_risk'">
          <span class="validity-label">可能测不出上限</span>
          <span class="validity-value">最难的题也全对：这套题对孩子偏简单，可以尝试更难的图形辨别内容</span>
        </div>
        <div class="validity-item" v-if="extra.verdict === 'unreadable'">
          <span class="validity-label">本次结果不作参考</span>
          <span class="validity-value">练习没通过或中途中断：请在引导孩子理解规则后，重新测一次</span>
        </div>
        <div class="validity-item">
          <span class="validity-label">关于再次测试</span>
          <span class="validity-value">短期内再测，孩子可能记住题目，前后分数变化不代表能力变化</span>
        </div>
        <div class="validity-item">
          <span class="validity-label">结果使用说明</span>
          <span class="validity-value">本版为试测版，只用于教学参考，不能用于跨年龄比较、分班、诊断等用途</span>
        </div>
      </div>
    </el-card>

    <el-card class="disclaimer">
      <div class="disclaimer-content">
        <el-icon><WarningFilled /></el-icon>
        <p>
          <strong>重要提示：</strong>本任务为「自编题目 + 描述性结果」的草稿版筛查工具，图形由代码程序化生成，
          <strong>非标准化测验</strong>，无标准化效度/信度，<strong>不输出 IQ / 百分位 / 标准分</strong>。
          结果仅供教育支持与发展监测参考，不能作为医学诊断依据；转介建议必须基于重复测量、行为观察与其他资料。
          如怀疑孩子存在视知觉或认知加工问题，请前往正规医院儿童心理科或发育行为科进行专业评估。
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
import { COGNITIVE_SELF_LAYER_PLAIN } from '@/database/cognitive-self-data'

const route = useRoute()
const router = useRouter()
const assessData = ref<any>(null)

interface LayerRow {
  code: string
  name: string
  correct: number
  total: number
  rate: number
  medianRt: number | null
}

interface ErrorRow {
  code: string
  label: string
  errors: number
  opportunities: number
  note: string
}

const ERROR_TYPE_META: Record<string, { label: string; note: string }> = {
  shape: { label: '形状', note: '选择了不同形状的选项' },
  color: { label: '颜色', note: '选择了不同颜色的选项（先排除色觉因素）' },
  rotation: { label: '方向', note: '选择了方向邻近的选项' },
  scale: { label: '大小', note: '选择了大小接近的选项' },
  mirror: { label: '镜像', note: '选择了镜像方向的选项' },
  gap: { label: '缺口方位', note: '选择了缺口位置不同的选项' },
  internal_mark: { label: '内部标记', note: '选择了内部标记方位不同的选项' },
  layout: { label: '布局', note: '选择了排列结构不同的选项' },
  unclassified: { label: '未分类', note: '无法归类的错误选项' },
}

const extra = computed<Record<string, any>>(() => {
  const raw = assessData.value?.extra_data
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
})

const accuracyPercent = computed(() => {
  const r = assessData.value?.accuracy_rate
  if (typeof r === 'number' && r >= 0) return Math.round(r * 100)
  return 0
})

const overallMedianRt = computed<number | null>(() => {
  const v = extra.value.overallMedianRt
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null
})

const practicePassed = computed(() => extra.value.practice?.passed === true)

const layerRows = computed<LayerRow[]>(() => {
  const raw = assessData.value?.unit_scores
  if (!raw) return []
  try {
    const obj = JSON.parse(raw) as Record<string, { name?: string; correct?: number; total?: number }>
    const layerRt = (extra.value.layerMedianRtMs ?? {}) as Record<string, number | null>
    return Object.entries(obj).map(([code, v]) => {
      const correct = v.correct ?? 0
      const total = v.total ?? 0
      const medianRt = layerRt[code] ?? null
      return {
        code,
        name: COGNITIVE_SELF_LAYER_PLAIN[code] ?? v.name ?? code,
        correct,
        total,
        rate: total > 0 ? Math.round((correct / total) * 100) : 0,
        medianRt: typeof medianRt === 'number' ? Math.round(medianRt) : null,
      }
    })
  } catch {
    return []
  }
})

const errorRows = computed<ErrorRow[]>(() => {
  const counts = (extra.value.errorTypeCounts ?? {}) as Record<string, number>
  const opportunities = (extra.value.errorOpportunities ?? {}) as Record<string, number>
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([code, n]) => ({
      code,
      label: ERROR_TYPE_META[code]?.label ?? code,
      errors: n,
      opportunities: opportunities[code] ?? 0,
      note: ERROR_TYPE_META[code]?.note ?? '',
    }))
})

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
.score-value--small {
  font-size: 18px;
  line-height: 1.4;
  text-align: center;
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
.dimension-card {
  margin-top: 16px;
}
.table-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #c0c4cc;
}
.validity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.validity-item {
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}
.validity-label {
  flex-shrink: 0;
  width: 110px;
  font-weight: 600;
  color: #303133;
}
.validity-value {
  flex: 1;
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
