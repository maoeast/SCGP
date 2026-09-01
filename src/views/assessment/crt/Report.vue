<!-- src/views/assessment/crt/Report.vue -->
<template>
  <div class="crt-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <el-button :icon="ChatDotRound" @click="openAiInterpretation">AI解读</el-button>
            <h2>瑞文图形推理测验（CRT）评估报告</h2>
          </div>
        </div>
      </template>

      <!-- 学生基本信息 -->
      <div class="student-info" v-if="student">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="info-item">
              <span class="label">姓名：</span>
              <span class="value">{{ student.name }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="info-item">
              <span class="label">性别：</span>
              <span class="value">{{ student.gender || '未知' }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="info-item">
              <span class="label">年龄：</span>
              <span class="value">{{ studentAge }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="info-item">
              <span class="label">评估日期：</span>
              <span class="value">{{ assessDate }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 评估结果概览 -->
    <el-card class="result-card" v-if="assessData">
      <template #header><h3>评估结果概览</h3></template>
      <div class="overview">
        <div class="score-item">
          <div class="score-label">离差 IQ 估算</div>
          <div class="score-value">{{ assessData.iq_estimate ?? 100 }}</div>
          <div class="score-range">M=100，SD=15</div>
          <div class="score-level" :class="getLevelClass(assessData.level)">{{ assessData.level }}</div>
        </div>
        <div class="score-item">
          <div class="score-label">百分位</div>
          <div class="score-value">{{ assessData.percentile_rank ?? 50 }}</div>
          <div class="score-range">超越同龄人群中该比例</div>
        </div>
        <div class="score-item">
          <div class="score-label">原始分（答对数）</div>
          <div class="score-value">{{ assessData.total_raw_score ?? 0 }} / {{ assessData.total_questions ?? 60 }}</div>
          <div class="score-range">共 {{ assessData.total_questions ?? 60 }} 题</div>
        </div>
      </div>

      <!-- 结果解释 -->
      <div class="result-description">
        <h4>结果解释：</h4>
        <p>{{ getResultDescription() }}</p>
      </div>
    </el-card>

    <!-- 五组答对情况 -->
    <el-card v-if="unitRows.length" class="dimension-card">
      <template #header><h3>五组答对情况（SPM A–E）</h3></template>
      <el-table :data="unitRows" style="width: 100%">
        <el-table-column prop="name" label="组别" min-width="200" />
        <el-table-column label="答对 / 总数" width="130" align="center">
          <template #default="{ row }">{{ row.correct }} / {{ row.total }}</template>
        </el-table-column>
        <el-table-column label="答对率" width="200" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.rate" :color="getRateColor(row.rate)" :stroke-width="14" text-inside />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="能力类型" min-width="200" />
      </el-table>
    </el-card>

    <!-- 优势与劣势分析 -->
    <el-card class="analysis-card" v-if="strengths.length || weaknesses.length">
      <template #header><h3>能力分析</h3></template>
      <div class="analysis-content">
        <div class="analysis-section" v-if="strengths.length">
          <h4><el-icon><Check /></el-icon> 优势能力</h4>
          <ul>
            <li v-for="(item, idx) in strengths" :key="idx">{{ item }}</li>
          </ul>
        </div>
        <div class="analysis-section" v-if="weaknesses.length">
          <h4><el-icon><Warning /></el-icon> 需提升能力</h4>
          <ul>
            <li v-for="(item, idx) in weaknesses" :key="idx">{{ item }}</li>
          </ul>
        </div>
      </div>
    </el-card>

    <!-- 训练建议 -->
    <el-card class="suggestions-card" v-if="recommendations.length || trainingFocus">
      <template #header><h3>训练建议</h3></template>
      <div class="suggestions-content">
        <div class="suggestion-item" v-if="trainingFocus">
          <h4>训练重点：</h4>
          <p>{{ trainingFocus }}</p>
        </div>
        <div class="suggestion-item" v-if="recommendations.length">
          <h4>具体建议：</h4>
          <ul>
            <li v-for="(rec, idx) in recommendations" :key="idx">{{ rec }}</li>
          </ul>
        </div>
      </div>
    </el-card>

    <!-- 免责声明 -->
    <el-card class="disclaimer">
      <div class="disclaimer-content">
        <el-icon><WarningFilled /></el-icon>
        <p>
          <strong>重要提示：</strong>本测验用于儿童图形推理能力的筛查与发展监测，
          <strong>不能作为医学诊断依据</strong>。如结果提示显著落后或家长有其他发育相关顾虑，
          请前往正规医院儿童发育行为科或儿童心理科进行专业评估。
        </p>
      </div>
    </el-card>
      <!-- 评估用时信息（旧记录无数据时整卡不渲染） -->
    <AssessmentTimingInfo
      :total-duration="assessData?.total_duration"
      :avg-response-time="assessData?.avg_response_time"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, WarningFilled, Check, Warning, ChatDotRound } from '@element-plus/icons-vue'
import { CRTAssessmentAPI, StudentAPI } from '@/database/api'
import { openAiAssistant } from '@/features/ai/assistant-launcher'
import AssessmentTimingInfo from '../components/AssessmentTimingInfo.vue'

const route = useRoute()
const router = useRouter()
const assessData = ref<any>(null)
const student = ref<any>(null)

interface UnitRow {
  code: string
  name: string
  correct: number
  total: number
  rate: number
  description: string
}

const unitDescriptions: Record<string, string> = {
  unit_a: '知觉辨别',
  unit_b: '类同比较',
  unit_c: '比较推理',
  unit_d: '系列关系',
  unit_e: '抽象推理',
}

const unitRows = computed<UnitRow[]>(() => {
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
        description: unitDescriptions[code] ?? '',
      }
    })
  } catch {
    return []
  }
})

const studentAge = computed(() => {
  if (!assessData.value?.age_months) return '未知'
  const months = assessData.value.age_months
  const years = Math.floor(months / 12)
  const remainMonths = months % 12
  return remainMonths > 0 ? `${years}岁${remainMonths}个月` : `${years}岁`
})

const assessDate = computed(() => {
  const date = assessData.value?.assess_date || assessData.value?.start_time
  if (!date) return '未知'
  return new Date(date).toLocaleDateString('zh-CN')
})

const strengths = computed<string[]>(() => {
  const raw = assessData.value?.strengths
  if (!raw) return []
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return []
  }
})

const weaknesses = computed<string[]>(() => {
  const raw = assessData.value?.weaknesses
  if (!raw) return []
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return []
  }
})

const recommendations = computed<string[]>(() => {
  const raw = assessData.value?.recommendations
  if (!raw) return []
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return []
  }
})

const trainingFocus = computed<string>(() => {
  return assessData.value?.training_focus ?? ''
})

function getRateColor(rate: number): string {
  if (rate >= 80) return '#67c23a'
  if (rate >= 50) return '#409eff'
  if (rate >= 30) return '#e6a23c'
  return '#f56c6c'
}

function getLevelClass(level: string | undefined): string {
  if (!level) return ''
  if (level.includes('优秀') || level.includes('良好')) return 'level-good'
  if (level.includes('偏弱') || level.includes('落后')) return 'level-weak'
  return 'level-normal'
}

function getResultDescription(): string {
  const iq = assessData.value?.iq_estimate ?? 100
  const pr = assessData.value?.percentile_rank ?? 50
  const level = assessData.value?.level ?? '典型水平'
  const total = assessData.value?.total_raw_score ?? 0
  const questions = assessData.value?.total_questions ?? 60

  let desc = `该儿童在图形推理测验（瑞文 CRT）中的表现为"${level}"，`
  desc += `估算离差 IQ 为 ${iq}（平均值 100，标准差 15），`
  desc += `百分位排名为 ${pr}（即超越了同龄儿童中 ${pr}% 的人群）。`
  desc += `原始分为 ${total}/${questions} 题。`

  if (iq >= 115) {
    desc += ' 该儿童的图形推理能力显著优于同龄儿童，抽象思维和逻辑推理能力较强。'
  } else if (iq >= 85) {
    desc += ' 该儿童的图形推理能力在同龄人中属于正常范围。'
  } else if (iq >= 70) {
    desc += ' 该儿童的图形推理能力略低于同龄儿童平均水平，建议加强相关能力训练。'
  } else {
    desc += ' 该儿童的图形推理能力显著低于同龄儿童，建议进行专业评估并制定个性化训练方案。'
  }

  return desc
}

function goBack() {
  router.back()
}


const openAiInterpretation = () => {
  if (!assessData.value) {
    ElMessage.warning('评估数据未加载完成')
    return
  }

  openAiAssistant('special_ed_teacher')

  setTimeout(() => {
    ElMessage.success('AI助手已打开，你可以询问"解读这名学生的CRT评估结果"')
  }, 500)
}

onMounted(() => {
  const assessId = Number(route.params.assessId)
  if (!assessId) {
    ElMessage.error('缺少评估记录 ID')
    return
  }
  const api = new CRTAssessmentAPI()
  const data = api.getAssessment(assessId)
  if (!data) {
    ElMessage.error('未找到评估记录')
    return
  }
  assessData.value = data

  // 加载学生信息
  if (data.student_id) {
    const studentAPI = new StudentAPI()
    studentAPI.getStudentById(data.student_id).then((studentData) => {
      if (studentData) {
        student.value = studentData
      }
    })
  }
})
</script>

<style scoped>
.crt-report {
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
.student-info {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.info-item .label {
  color: #909399;
  font-size: 14px;
}
.info-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}
.result-card {
  margin-top: 16px;
}
.overview {
  display: flex;
  gap: 48px;
  flex-wrap: wrap;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
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
.score-range {
  font-size: 12px;
  color: #c0c4cc;
}
.score-level {
  font-size: 14px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 4px;
}
.score-level.level-good {
  color: #67c23a;
  background: #f0f9ff;
}
.score-level.level-normal {
  color: #409eff;
  background: #ecf5ff;
}
.score-level.level-weak {
  color: #e6a23c;
  background: #fdf6ec;
}
.result-description {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
.result-description h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #303133;
}
.result-description p {
  margin: 0;
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
}
.dimension-card {
  margin-top: 16px;
}
.analysis-card {
  margin-top: 16px;
}
.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.analysis-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #303133;
}
.analysis-section ul {
  margin: 0;
  padding-left: 24px;
  list-style: disc;
}
.analysis-section li {
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
}
.suggestions-card {
  margin-top: 16px;
}
.suggestions-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.suggestion-item h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #303133;
}
.suggestion-item p {
  margin: 0;
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
}
.suggestion-item ul {
  margin: 0;
  padding-left: 24px;
  list-style: decimal;
}
.suggestion-item li {
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}
.disclaimer {
  margin-top: 16px;
}
.disclaimer-content {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  background: #fef0f0;
  border-radius: 4px;
}
.disclaimer-content .el-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: #f56c6c;
  margin-top: 2px;
}
.disclaimer-content p {
  margin: 0;
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
}
</style>
