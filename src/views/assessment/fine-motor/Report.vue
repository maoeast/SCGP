<template>
  <div class="fine-motor-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>小肌肉功能发展评估报告</h2>
          </div>
          <div class="header-actions">
            <el-button :icon="Clock" @click="viewHistory">查看历史</el-button>
          </div>
        </div>
      </template>

      <div v-if="studentInfo" class="student-info">
        <div class="info-item">
          <span class="label">学生姓名：</span>
          <span class="value">{{ studentInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">性别：</span>
          <span class="value">{{ studentInfo.gender }}</span>
        </div>
        <div class="info-item">
          <span class="label">年龄：</span>
          <span class="value">{{ formatAge(studentInfo.ageMonths) }}</span>
        </div>
        <div class="info-item">
          <span class="label">评估日期：</span>
          <span class="value">{{ formatDate(assessment?.start_time) }}</span>
        </div>
      </div>
    </el-card>

    <template v-if="assessment && overallReport">
      <el-card class="result-overview">
        <template #header>
          <h3>📊 总体评估</h3>
        </template>

        <div class="overview-content">
          <div class="score-summary">
            <div class="score-item total" :class="getLevelCardClass(overallReport.severity)">
              <div class="score-label">总体得分率</div>
              <div class="score-value">{{ overallReport.masteryPercent }}%</div>
              <div class="score-range">总分 {{ overallReport.totalScore }} / {{ overallReport.totalMaxScore }}</div>
              <div class="score-level" :class="getLevelLabelClass(overallReport.severity)">
                {{ overallReport.title }}
              </div>
            </div>

            <div class="score-item domain-count level-info">
              <div class="score-label">领域数</div>
              <div class="score-value">{{ domainReports.length }}</div>
              <div class="score-range">已完成领域分析</div>
              <div class="score-level level-label-info">
                {{ statusLabelMap[overallReport.status] }}
              </div>
            </div>

            <div class="score-item target-count level-accent">
              <div class="score-label">IEP目标数</div>
              <div class="score-value">{{ iepTargets.length }}</div>
              <div class="score-range">优先 1 分，其次手动 0 分</div>
              <div class="score-level level-label-accent">
                {{ iepTargets.length > 0 ? '已生成干预重点' : '当前无目标条目' }}
              </div>
            </div>
          </div>

          <div class="total-feedback-title">
            <el-tag :type="overallReport.severity" size="large">
              {{ overallReport.title }}
            </el-tag>
          </div>

          <div class="summary-panel">
            <p class="summary-text" v-html="formatRichText(overallReport.summary)"></p>
            <div class="summary-advice">
              <h4>专家建议</h4>
              <p v-html="formatRichText(overallReport.expertAdvice)"></p>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="radar-card">
        <template #header>
          <h3>📈 领域雷达与状态总览</h3>
        </template>

        <div class="radar-layout">
          <div ref="radarChartRef" class="radar-chart"></div>

          <div class="radar-legend">
            <div
              v-for="domain in domainReports"
              :key="domain.code"
              class="legend-item"
            >
              <div class="legend-top">
                <span class="legend-name">{{ domain.name }}</span>
                <el-tag :type="domain.severity" size="small">
                  {{ statusLabelMap[domain.status] }}
                </el-tag>
              </div>
              <div class="legend-meta">
                <span>{{ domain.masteryPercent }}%</span>
                <span>{{ domain.rawScore }} / {{ domain.maxScore }}</span>
              </div>
              <el-progress
                :percentage="domain.masteryPercent"
                :stroke-width="10"
                :status="getProgressStatus(domain.severity)"
              />
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="domains-card">
        <template #header>
          <h3>🧩 六大领域详细解读</h3>
        </template>

        <div class="domain-list">
          <section
            v-for="domain in domainReports"
            :key="domain.code"
            class="domain-item"
          >
            <div class="domain-header">
              <div>
                <h4>{{ domain.name }}</h4>
                <p>{{ domain.description }}</p>
              </div>
              <div class="domain-score">
                <strong>{{ domain.masteryPercent }}%</strong>
                <el-tag :type="domain.severity" size="small">
                  {{ statusLabelMap[domain.status] }}
                </el-tag>
              </div>
            </div>

            <div class="domain-score-row">
              <span>原始得分 {{ domain.rawScore }} / {{ domain.maxScore }}</span>
              <span>状态：{{ domain.title }}</span>
            </div>

            <div class="domain-content">
              <div class="domain-copy">
                <h5>领域解读</h5>
                <p v-html="formatRichText(domain.summary)"></p>
              </div>
              <div class="domain-copy">
                <h5>训练建议</h5>
                <p v-html="formatRichText(domain.expertAdvice)"></p>
              </div>
            </div>
          </section>
        </div>
      </el-card>

      <el-card class="iep-card">
        <template #header>
          <h3>🎯 IEP 目标与家庭干预建议</h3>
        </template>

        <div v-if="iepTargets.length" class="iep-list">
          <article
            v-for="target in iepTargets"
            :key="target.questionId"
            class="iep-item"
          >
            <div class="iep-header">
              <div>
                <h4>{{ target.title }}</h4>
                <p>{{ target.dimensionName }}</p>
              </div>
              <div class="iep-tags">
                <el-tag :type="target.priority === 1 ? 'warning' : 'danger'" size="small">
                  {{ target.priority === 1 ? '优先目标' : '补充目标' }}
                </el-tag>
                <el-tag type="info" size="small">
                  评分 {{ target.score }}
                </el-tag>
              </div>
            </div>

            <div class="iep-body">
              <div class="iep-section">
                <h5>IEP 目标</h5>
                <p v-html="formatRichText(target.iepGoal || '当前题目暂无结构化 IEP 文案。')"></p>
              </div>
              <div class="iep-section">
                <h5>家庭干预建议</h5>
                <p v-html="formatRichText(target.expertAdvice || '当前题目暂无额外家庭训练建议。')"></p>
              </div>
            </div>
          </article>
        </div>
        <el-empty v-else description="当前评估结果未提取出需要优先跟进的 IEP 条目" />
      </el-card>
    </template>

    <el-card v-else class="loading-card">
      <el-empty description="报告数据加载中" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Clock } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { FineMotorAssessmentAPI } from '@/database/api'
import {
  FINE_MOTOR_DIMENSIONS,
  FINE_MOTOR_QUESTIONS,
  type FineMotorDimensionCode,
} from '@/database/fine-motor-questions'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'

type FineMotorStatus = 'age_appropriate' | 'emerging' | 'delayed'
type SeverityType = 'success' | 'warning' | 'danger'

interface FineMotorAssessmentRecord {
  id: number
  student_id: number
  student_name: string
  student_gender: string
  age_months: number
  total_score: number
  standard_score: number
  level: string
  level_code?: FineMotorStatus | null
  total_max_score: number
  total_mastery_rate: number
  domain_results?: Array<{
    code: FineMotorDimensionCode
    rawScore: number
    maxScore: number
    masteryRate: number
    status: FineMotorStatus
    severity: SeverityType
    level: string
  }>
  iep_targets?: FineMotorIepTarget[]
  start_time: string
  end_time?: string
  created_at: string
}

interface FineMotorAssessmentDetail {
  question_id: number
  dimension: FineMotorDimensionCode
  score: number
  answer_time: number
  is_auto_filled: boolean
  auto_fill_reason: 'basal' | 'ceiling' | null
  title: string
  item_code: string | null
  dimension_name: string
  iep_goal: string | null
  expert_advice: string | null
}

interface FineMotorIepTarget {
  questionId: number
  title: string
  dimension: FineMotorDimensionCode
  dimensionName: string
  score: number
  priority: 1 | 2
  iepGoal: string | null
  expertAdvice: string | null
}

interface DomainReport {
  code: FineMotorDimensionCode
  name: string
  description: string
  rawScore: number
  maxScore: number
  masteryRate: number
  masteryPercent: number
  status: FineMotorStatus
  severity: SeverityType
  title: string
  summary: string
  expertAdvice: string
}

interface OverallReport {
  totalScore: number
  totalMaxScore: number
  masteryRate: number
  masteryPercent: number
  status: FineMotorStatus
  severity: SeverityType
  title: string
  summary: string
  expertAdvice: string
}

const route = useRoute()
const router = useRouter()

const assessment = ref<FineMotorAssessmentRecord | null>(null)
const details = ref<FineMotorAssessmentDetail[]>([])
const radarChartRef = ref<HTMLElement | null>(null)
let radarChart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

const statusLabelMap: Record<FineMotorStatus, string> = {
  age_appropriate: '发展适龄',
  emerging: '发展萌芽',
  delayed: '发展迟缓',
}

const statusThresholds = {
  ageAppropriate: 0.8,
  emerging: 0.4,
}

const fineMotorConfig =
  ASSESSMENT_LIBRARY.fine_motor_preschool ||
  ASSESSMENT_LIBRARY['fine_motor_preschool '] ||
  null

const assessId = computed(() => {
  const rawId = route.params.assessId || route.query.assessId
  const normalized = Array.isArray(rawId) ? rawId[0] : rawId
  return Number(normalized)
})

const studentInfo = computed(() => {
  if (!assessment.value) return null

  return {
    name: assessment.value.student_name || '未命名学生',
    gender: assessment.value.student_gender || '-',
    ageMonths: assessment.value.age_months || 0,
  }
})

const savedDomainResultsMap = computed(() => {
  const map = new Map<FineMotorDimensionCode, any>()
  const items = Array.isArray(assessment.value?.domain_results) ? assessment.value?.domain_results : []

  for (const item of items || []) {
    map.set(item.code, item)
  }

  return map
})

const domainReports = computed<DomainReport[]>(() => {
  return FINE_MOTOR_DIMENSIONS.map((dimension) => {
    const questions = FINE_MOTOR_QUESTIONS.filter((item) => item.dimension === dimension.code)
    const matchedDetails = details.value.filter((item) => item.dimension === dimension.code)
    const saved = savedDomainResultsMap.value.get(dimension.code)
    const rawScore = matchedDetails.length > 0
      ? matchedDetails.reduce((sum, item) => sum + Number(item.score || 0), 0)
      : Number(saved?.rawScore || 0)
    const maxScore = questions.length * 2 || Number(saved?.maxScore || 0)
    const masteryRate = maxScore > 0
      ? rawScore / maxScore
      : Number(saved?.masteryRate || 0)
    const status = resolveStatus(masteryRate, saved?.status)
    const configLevel = getDomainLevelConfig(dimension.code, status)

    return {
      code: dimension.code,
      name: dimension.label,
      description: fineMotorConfig?.domains?.[dimension.code]?.description || '',
      rawScore,
      maxScore,
      masteryRate,
      masteryPercent: Math.round(masteryRate * 100),
      status,
      severity: (configLevel?.severity || getSeverityByStatus(status)) as SeverityType,
      title: configLevel?.title || statusLabelMap[status],
      summary: configLevel?.summary || '',
      expertAdvice: configLevel?.expert_advice || '',
    }
  })
})

const overallReport = computed<OverallReport | null>(() => {
  if (!assessment.value) return null

  const totalScore = domainReports.value.reduce((sum, item) => sum + item.rawScore, 0) || Number(assessment.value.total_score || 0)
  const totalMaxScore = domainReports.value.reduce((sum, item) => sum + item.maxScore, 0) || Number(assessment.value.total_max_score || 0)
  const masteryRate = totalMaxScore > 0
    ? totalScore / totalMaxScore
    : Number(assessment.value.total_mastery_rate || 0)
  const status = resolveStatus(masteryRate, assessment.value.level_code || undefined)
  const configLevel = getTotalLevelConfig(status)

  return {
    totalScore,
    totalMaxScore,
    masteryRate,
    masteryPercent: Math.round(masteryRate * 100),
    status,
    severity: (configLevel?.severity || getSeverityByStatus(status)) as SeverityType,
    title: configLevel?.title || statusLabelMap[status],
    summary: configLevel?.summary || '',
    expertAdvice: configLevel?.expert_advice || '',
  }
})

const iepTargets = computed<FineMotorIepTarget[]>(() => {
  return details.value
    .filter((item) => item.score === 1 || (item.score === 0 && item.is_auto_filled !== true))
    .map((item) => ({
      questionId: Number(item.question_id),
      title: item.title,
      dimension: item.dimension,
      dimensionName: item.dimension_name,
      score: Number(item.score),
      priority: (item.score === 1 ? 1 : 2) as 1 | 2,
      iepGoal: item.iep_goal,
      expertAdvice: item.expert_advice,
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority
      }
      return left.questionId - right.questionId
    })
})

function resolveStatus(rate: number, savedStatus?: FineMotorStatus): FineMotorStatus {
  if (rate >= statusThresholds.ageAppropriate) return 'age_appropriate'
  if (rate >= statusThresholds.emerging) return 'emerging'
  if (savedStatus === 'age_appropriate' || savedStatus === 'emerging' || savedStatus === 'delayed') {
    return savedStatus
  }
  return 'delayed'
}

function getSeverityByStatus(status: FineMotorStatus): SeverityType {
  if (status === 'age_appropriate') return 'success'
  if (status === 'emerging') return 'warning'
  return 'danger'
}

function getTotalLevelConfig(status: FineMotorStatus) {
  const levels = fineMotorConfig?.total_scale?.levels
  if (!Array.isArray(levels)) return null
  return levels.find((item: any) => item.status === status) || null
}

function getDomainLevelConfig(code: FineMotorDimensionCode, status: FineMotorStatus) {
  const levels = fineMotorConfig?.domains?.[code]?.levels
  if (!Array.isArray(levels)) return null
  return levels.find((item: any) => item.status === status) || null
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatAge(ageMonths?: number) {
  if (ageMonths === null || ageMonths === undefined) return '--'
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (years === 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
}

function formatRichText(text: string) {
  const studentName = studentInfo.value?.name || '该儿童'
  return String(text || '')
    .replace(/\[儿童姓名\]/g, studentName)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

function getLevelCardClass(severity: SeverityType) {
  if (severity === 'danger') return 'level-danger'
  if (severity === 'warning') return 'level-warning'
  return 'level-success'
}

function getLevelLabelClass(severity: SeverityType) {
  if (severity === 'danger') return 'level-label-danger'
  if (severity === 'warning') return 'level-label-warning'
  return 'level-label-success'
}

function getProgressStatus(severity: SeverityType): '' | 'success' | 'warning' | 'exception' {
  if (severity === 'danger') return 'exception'
  if (severity === 'warning') return 'warning'
  return 'success'
}

function goBack() {
  router.back()
}

const viewHistory = () => {
  if (assessment.value?.student_id) {
    router.push(`/assessment/fine_motor/trend/${assessment.value.student_id}`)
  }
}

async function loadReport() {
  if (!Number.isFinite(assessId.value) || assessId.value <= 0) {
    ElMessage.error('无效的评估记录 ID')
    return
  }

  try {
    const api = new FineMotorAssessmentAPI()
    const assessmentRecord = api.getAssessment(assessId.value)

    if (!assessmentRecord) {
      ElMessage.error('未找到 FMDA 评估记录')
      return
    }

    assessment.value = assessmentRecord as FineMotorAssessmentRecord
    details.value = api.getAssessmentDetails(assessId.value) as FineMotorAssessmentDetail[]

    if (!fineMotorConfig) {
      ElMessage.warning('fine_motor_preschool 配置未找到，报告将使用基础文案显示')
    }

    await nextTick()
    renderRadarChart()
  } catch (error) {
    console.error('[FineMotorReport] 加载失败:', error)
    ElMessage.error('加载 FMDA 报告失败')
  }
}

function renderRadarChart() {
  if (!radarChartRef.value || domainReports.value.length === 0) {
    return
  }

  if (!radarChart) {
    radarChart = echarts.init(radarChartRef.value)
  }

  radarChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const values = params.value as number[]
        return domainReports.value
          .map((domain, index) => `${domain.name}: ${values[index]}%`)
          .join('<br>')
      },
    },
    radar: {
      radius: '65%',
      splitNumber: 5,
      axisName: {
        color: '#475569',
        fontSize: 13,
      },
      splitArea: {
        areaStyle: {
          color: ['#f8fbff', '#f3f7fb'],
        },
      },
      indicator: domainReports.value.map((item) => ({
        name: item.name,
        max: 100,
      })),
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: domainReports.value.map((item) => item.masteryPercent),
            areaStyle: {
              color: 'rgba(59, 130, 246, 0.18)',
            },
            lineStyle: {
              color: '#2563eb',
              width: 2,
            },
            itemStyle: {
              color: '#2563eb',
            },
          },
        ],
      },
    ],
  })
}

onMounted(async () => {
  await loadReport()

  resizeHandler = () => {
    radarChart?.resize()
  }
  window.addEventListener('resize', resizeHandler)
})

watch(domainReports, async () => {
  await nextTick()
  renderRadarChart()
}, { deep: true })

onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  if (radarChart) {
    radarChart.dispose()
    radarChart = null
  }
})
</script>

<style scoped>
.fine-motor-report {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.report-header,
.result-overview,
.radar-card,
.domains-card,
.iep-card,
.loading-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.student-info {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.label {
  color: #909399;
}

.value {
  color: #303133;
  font-weight: 500;
}

.overview-content {
  padding: 20px;
}

.score-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.score-item {
  padding: 24px;
  border-radius: 16px;
  color: #fff;
  text-align: center;
}

.score-item.level-success {
  background: linear-gradient(135deg, #67c23a 0%, #95d460 100%);
}

.score-item.level-warning {
  background: linear-gradient(135deg, #e6a23c 0%, #f5a23b 100%);
}

.score-item.level-danger {
  background: linear-gradient(135deg, #f56c6c 0%, #ff7875 100%);
}

.score-item.level-info {
  background: linear-gradient(135deg, #409eff 0%, #60a5fa 100%);
}

.score-item.level-accent {
  background: linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%);
}

.score-label {
  font-size: 14px;
  opacity: 0.95;
  margin-bottom: 10px;
}

.score-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
}

.score-range {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.92;
}

.score-level {
  display: inline-block;
  margin-top: 14px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  font-size: 13px;
}

.level-label-success,
.level-label-warning,
.level-label-danger,
.level-label-info,
.level-label-accent {
  color: #fff;
}

.total-feedback-title {
  margin-bottom: 18px;
}

.summary-panel {
  display: grid;
  gap: 16px;
}

.summary-text,
.summary-advice p {
  margin: 0;
  color: #475569;
  line-height: 1.8;
}

.summary-advice {
  padding: 18px 20px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.summary-advice h4 {
  margin: 0 0 10px;
  font-size: 15px;
  color: #1f2937;
}

.radar-layout {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(280px, 360px);
  gap: 24px;
  align-items: start;
}

.radar-chart {
  width: 100%;
  height: 420px;
}

.radar-legend {
  display: grid;
  gap: 14px;
}

.legend-item {
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.legend-top,
.legend-meta,
.domain-header,
.domain-score-row,
.iep-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.legend-name {
  font-weight: 600;
  color: #1f2937;
}

.legend-meta {
  margin: 10px 0 12px;
  font-size: 13px;
  color: #64748b;
}

.domain-list,
.iep-list {
  display: grid;
  gap: 16px;
}

.domain-item,
.iep-item {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 18px 20px;
  background: #fff;
}

.domain-header h4,
.iep-header h4 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.domain-header p,
.iep-header p,
.domain-score-row {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.domain-score {
  display: flex;
  align-items: center;
  gap: 10px;
}

.domain-score strong {
  font-size: 22px;
  color: #0f172a;
}

.domain-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.domain-copy,
.iep-section {
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.domain-copy h5,
.iep-section h5 {
  margin: 0 0 10px;
  color: #1f2937;
  font-size: 14px;
}

.domain-copy p,
.iep-section p {
  margin: 0;
  color: #475569;
  line-height: 1.8;
}

.iep-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.iep-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin-top: 16px;
}

@media (max-width: 960px) {
  .radar-layout {
    grid-template-columns: 1fr;
  }

  .radar-chart {
    height: 320px;
  }
}

@media (max-width: 640px) {
  .fine-motor-report {
    padding: 12px;
  }

  .header-left {
    align-items: flex-start;
    flex-direction: column;
  }

  .student-info {
    gap: 12px;
    padding: 12px;
  }

  .info-item,
  .legend-top,
  .legend-meta,
  .domain-header,
  .domain-score-row,
  .iep-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .score-item {
    padding: 18px;
  }
}
</style>
