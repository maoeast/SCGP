<template>
  <div class="gmfm-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>GMFM-88 粗大运动功能评定量表报告</h2>
          </div>
          <div class="header-actions">
            <el-button :icon="Clock" @click="viewHistory">查看历史</el-button>
            <el-button type="primary" :icon="Download" :disabled="!assessment" @click="exportWord">
              导出Word
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="assessment" class="student-info">
        <div class="info-item">
          <span class="label">学生姓名：</span>
          <span class="value">{{ assessment.student_name }}</span>
        </div>
        <div class="info-item">
          <span class="label">性别：</span>
          <span class="value">{{ assessment.student_gender }}</span>
        </div>
        <div class="info-item">
          <span class="label">年龄：</span>
          <span class="value">{{ formatAge(assessment.age_months) }}</span>
        </div>
        <div class="info-item">
          <span class="label">评估日期：</span>
          <span class="value">{{ formatDate(assessment.start_time) }}</span>
        </div>
      </div>
    </el-card>

    <template v-if="assessment">
      <el-card class="overview-card">
        <template #header>
          <h3>总体结果</h3>
        </template>

        <div class="overview-grid">
          <div class="summary-tile summary-main">
            <div class="tile-label">GMFM-88 总分</div>
            <div class="tile-value">{{ formatPercent(assessment.total_score) }}</div>
            <div class="tile-sub">原始分 {{ assessment.raw_total_score }} / {{ assessment.total_max_score }}</div>
            <el-tag :type="resolveTagType(assessment.overall_rule?.severity)" effect="light">
              {{ assessment.level }}
            </el-tag>
          </div>

          <div class="summary-tile">
            <div class="tile-label">目标条目</div>
            <div class="tile-value">{{ iepTargets.length }}</div>
            <div class="tile-sub">按低分能区与接近达成项目提取</div>
          </div>

          <div class="summary-tile">
            <div class="tile-label">NT 项数</div>
            <div class="tile-value">{{ totalNtCount }}</div>
            <div class="tile-sub">NT 按 0 分计入，总分可能偏保守</div>
          </div>
        </div>

        <div v-if="assessment.overall_rule" class="overall-copy">
          <p class="overall-summary">{{ assessment.overall_rule.summary }}</p>
          <p class="overall-content">{{ assessment.overall_rule.content }}</p>

          <div class="advice-list">
            <h4>总体建议</h4>
            <ul>
              <li v-for="(item, index) in assessment.overall_rule.advice || []" :key="index">
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </el-card>

      <el-card class="domains-card">
        <template #header>
          <h3>五大能区结果</h3>
        </template>

        <div class="domain-list">
          <section
            v-for="domain in assessment.domain_results || []"
            :key="domain.code"
            class="domain-item"
          >
            <div class="domain-top">
              <div>
                <h4>{{ domain.name }}</h4>
                <p>{{ getDomainFeedback(domain.code)?.title || domain.name }}</p>
              </div>
              <div class="domain-score">
                <strong>{{ formatPercent(domain.percentage) }}</strong>
                <span>{{ domain.rawScore }} / {{ domain.maxScore }}</span>
              </div>
            </div>

            <el-progress
              :percentage="Number(domain.percentage || 0)"
              :status="resolveProgressStatus(domain.severity)"
              :stroke-width="12"
            />

            <div class="domain-meta">
              <span>项目数 {{ domain.itemCount }}</span>
              <span>NT {{ domain.ntCount }}</span>
              <span>{{ domain.level }}</span>
            </div>

            <div v-if="getDomainFeedback(domain.code)" class="domain-feedback">
              <div class="feedback-block">
                <h5>{{ getDomainFeedback(domain.code)?.label }}</h5>
                <p>{{ getDomainFeedback(domain.code)?.content }}</p>
              </div>
              <div class="feedback-block">
                <h5>训练建议</h5>
                <p>{{ getDomainFeedback(domain.code)?.advice }}</p>
              </div>
            </div>
          </section>
        </div>
      </el-card>

      <el-card v-if="flags.length" class="flags-card">
        <template #header>
          <h3>风险提醒</h3>
        </template>

        <div class="flag-list">
          <article
            v-for="flag in flags"
            :key="flag.code"
            class="flag-item"
          >
            <div class="flag-head">
              <h4>{{ flag.title }}</h4>
              <el-tag :type="flag.severity === 'error' ? 'danger' : 'warning'">
                {{ flag.severity === 'error' ? '高风险' : '提醒' }}
              </el-tag>
            </div>
            <p>{{ flag.content }}</p>
            <p class="flag-advice">{{ flag.advice }}</p>
          </article>
        </div>
      </el-card>

      <el-card class="iep-card">
        <template #header>
          <h3>近期 IEP 关注点</h3>
        </template>

        <div v-if="iepTargets.length" class="target-list">
          <article
            v-for="target in iepTargets"
            :key="target.questionId"
            class="target-item"
          >
            <div class="target-head">
              <div>
                <h4>{{ target.itemCode }}. {{ target.title }}</h4>
                <p>{{ target.dimensionName }}</p>
              </div>
              <div class="target-tags">
                <el-tag :type="target.priority === 1 ? 'success' : target.priority === 2 ? 'warning' : 'danger'">
                  {{ priorityLabelMap[target.priority] }}
                </el-tag>
                <el-tag type="info">{{ target.isNt ? 'NT' : `评分 ${target.score}` }}</el-tag>
              </div>
            </div>
            <p>{{ target.rationale }}</p>
            <p class="target-advice">{{ target.advice }}</p>
          </article>
        </div>
        <el-empty v-else description="当前没有需要优先跟进的结构化目标条目" />
      </el-card>

      <el-card class="detail-card">
        <template #header>
          <h3>评分明细</h3>
        </template>

        <el-table :data="details" stripe size="small">
          <el-table-column prop="item_code" label="项目" width="90" />
          <el-table-column prop="dimension_name" label="能区" width="140" />
          <el-table-column prop="title" label="题目" min-width="280" />
          <el-table-column label="得分" width="100">
            <template #default="{ row }">
              {{ row.is_nt ? 'NT' : row.score }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-card v-else class="loading-card">
      <el-empty description="报告数据加载中" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Download, Clock } from '@element-plus/icons-vue'
import { Gmfm88AssessmentAPI } from '@/database/api'
import { buildGmfm88WordPayload } from '@/utils/assessment-word-builders'
import { exportWordDocument } from '@/utils/export-word'

type FlagSeverity = 'error' | 'warning'

interface GmfmReportRule {
  id: string
  title: string
  severity: 'success' | 'warning' | 'info'
  summary: string
  content: string
  advice: string[]
}

interface GmfmReportDomain {
  code: string
  name: string
  rawScore: number
  maxScore: number
  percentage: number
  ntCount: number
  itemCount: number
  level: string
  severity: 'success' | 'warning' | 'danger'
}

interface GmfmReportDomainFeedback {
  code: string
  title: string
  label: string
  content: string
  advice: string
}

interface GmfmReportFlag {
  code: string
  title: string
  severity: FlagSeverity
  content: string
  advice: string
}

interface GmfmReportTarget {
  questionId: number
  itemCode: string
  title: string
  dimensionName: string
  score: number
  isNt: boolean
  priority: 1 | 2 | 3
  rationale: string
  advice: string
}

interface GmfmAssessmentRecord {
  id: number
  student_id: number
  student_name: string
  student_gender: string
  age_months: number
  total_score: number
  raw_total_score: number
  total_max_score: number
  level: string
  overall_rule?: GmfmReportRule | null
  domain_results?: GmfmReportDomain[]
  domain_feedback?: GmfmReportDomainFeedback[]
  iep_targets?: GmfmReportTarget[]
  flags?: GmfmReportFlag[]
  start_time: string
}

interface GmfmAssessmentDetail {
  item_code: string
  dimension_name: string
  title: string
  score: number
  is_nt: boolean
}

const route = useRoute()
const router = useRouter()
const api = new Gmfm88AssessmentAPI()

const assessment = ref<GmfmAssessmentRecord | null>(null)
const details = ref<GmfmAssessmentDetail[]>([])

const priorityLabelMap: Record<1 | 2 | 3, string> = {
  1: '近期突破',
  2: '继续巩固',
  3: '先备支持',
}

const iepTargets = computed(() => assessment.value?.iep_targets || [])
const flags = computed(() => assessment.value?.flags || [])
const totalNtCount = computed(() =>
  (assessment.value?.domain_results || []).reduce((sum, item) => sum + Number(item.ntCount || 0), 0),
)

function loadReport() {
  const assessId = Number(route.params.assessId)
  if (!assessId) {
    ElMessage.error('无效的报告参数')
    router.push('/reports')
    return
  }

  const record = api.getAssessment(assessId)
  if (!record) {
    ElMessage.error('未找到 GMFM-88 报告')
    router.push('/reports')
    return
  }

  assessment.value = record
  details.value = api.getAssessmentDetails(assessId)
}

function goBack() {
  router.back()
}

const viewHistory = () => {
  if (assessment.value?.student_id) {
    router.push(`/assessment/gmfm_88/trend/${assessment.value.student_id}`)
  }
}

async function exportWord() {
  if (!assessment.value) {
    ElMessage.error('报告数据尚未加载完成')
    return
  }

  try {
    const payload = buildGmfm88WordPayload({
      studentName: assessment.value.student_name,
      gender: assessment.value.student_gender || '未知',
      ageMonths: assessment.value.age_months,
      assessmentDate: assessment.value.start_time,
      totalScore: assessment.value.total_score,
      rawTotalScore: assessment.value.raw_total_score,
      totalMaxScore: assessment.value.total_max_score,
      levelText: assessment.value.level,
      totalNtCount: totalNtCount.value,
      overallRule: assessment.value.overall_rule || null,
      domainResults: assessment.value.domain_results || [],
      domainFeedback: assessment.value.domain_feedback || [],
      iepTargets: iepTargets.value,
      flags: flags.value,
      details: details.value,
    })
    await exportWordDocument(payload)
    ElMessage.success('Word导出成功')
  } catch (error) {
    console.error('导出Word失败:', error)
    ElMessage.error('Word导出失败，请重试')
  }
}

function getDomainFeedback(code: string) {
  return assessment.value?.domain_feedback?.find((item) => item.code === code) || null
}

function resolveTagType(severity: 'success' | 'warning' | 'info' | undefined) {
  if (severity === 'success') return 'success'
  if (severity === 'warning') return 'warning'
  return 'info'
}

function resolveProgressStatus(severity: 'success' | 'warning' | 'danger') {
  if (severity === 'success') return 'success'
  if (severity === 'danger') return 'exception'
  return undefined
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN')
}

function formatAge(months: number) {
  if (!Number.isFinite(months)) return '-'
  const years = Math.floor(months / 12)
  const remainMonths = months % 12
  if (years <= 0) return `${remainMonths}个月`
  if (remainMonths === 0) return `${years}岁`
  return `${years}岁${remainMonths}个月`
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

onMounted(() => {
  loadReport()
})
</script>

<style scoped>
.gmfm-report {
  display: grid;
  gap: 20px;
}

.header-content,
.header-left,
.header-actions,
.student-info,
.overview-grid,
.domain-top,
.flag-head,
.target-head,
.target-tags {
  display: flex;
}

.header-content,
.domain-top,
.flag-head,
.target-head {
  justify-content: space-between;
  align-items: center;
}

.header-left,
.target-tags {
  align-items: center;
  gap: 12px;
}

.student-info {
  flex-wrap: wrap;
  gap: 12px 24px;
}

.info-item .label {
  color: var(--el-text-color-secondary);
}

.overview-grid {
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.summary-tile {
  flex: 1;
  min-width: 180px;
  padding: 18px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f7fafc 0%, #eef4fa 100%);
}

.summary-main {
  background: linear-gradient(180deg, #edf6ff 0%, #dfeeff 100%);
}

.tile-label,
.tile-sub,
.domain-top p,
.domain-meta,
.target-head p {
  color: var(--el-text-color-secondary);
}

.tile-value {
  margin: 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.overall-copy,
.advice-list,
.domain-list,
.flag-list,
.target-list {
  display: grid;
  gap: 16px;
}

.overall-summary {
  font-size: 16px;
  font-weight: 600;
}

.advice-list ul {
  margin: 0;
  padding-left: 18px;
}

.domain-item,
.flag-item,
.target-item {
  padding: 18px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  background: #fff;
}

.domain-score {
  text-align: right;
}

.domain-score strong {
  display: block;
  font-size: 26px;
}

.domain-meta {
  display: flex;
  gap: 16px;
  margin: 10px 0 14px;
  font-size: 13px;
}

.domain-feedback {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.feedback-block,
.flag-advice,
.target-advice {
  color: var(--el-text-color-regular);
}

.feedback-block h5 {
  margin-bottom: 8px;
}

.target-item p,
.flag-item p,
.feedback-block p,
.overall-content {
  line-height: 1.7;
}

@media (max-width: 768px) {
  .header-content,
  .domain-top,
  .flag-head,
  .target-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .domain-score {
    text-align: left;
  }
}
</style>
