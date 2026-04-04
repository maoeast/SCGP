<template>
  <div class="cnbsr-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-row">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>儿心量表Ⅱ评估报告</h2>
          </div>
          <el-tag v-if="assessment" :type="getStatusTagType(assessment.dq_status)" size="large">
            {{ assessment.level || getDqStatusLabel(assessment.dq_status) }}
          </el-tag>
        </div>
      </template>

      <div v-if="studentInfo" class="student-info">
        <div class="info-item">
          <span class="label">学生姓名</span>
          <span class="value">{{ studentInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">性别</span>
          <span class="value">{{ studentInfo.gender }}</span>
        </div>
        <div class="info-item">
          <span class="label">评估日期</span>
          <span class="value">{{ formatDateTime(assessment?.start_time || assessment?.created_at) }}</span>
        </div>
        <div class="info-item">
          <span class="label">实际月龄 CA</span>
          <span class="value">{{ formatAge(studentInfo.ageMonths) }}</span>
        </div>
        <div class="info-item">
          <span class="label">年龄段</span>
          <span class="value">{{ ageBracketLabel }}</span>
        </div>
      </div>
    </el-card>

    <template v-if="assessment">
      <el-card class="overview-card">
        <template #header>
          <h3>总体结果</h3>
        </template>

        <div class="metric-grid">
          <article class="metric-card metric-card--primary">
            <span class="metric-label">总智龄 MA</span>
            <strong class="metric-value">{{ formatScore(assessment.total_mental_age) }}</strong>
            <span class="metric-meta">按五能区平均后的月龄值</span>
          </article>

          <article class="metric-card" :class="`metric-card--${assessment.dq_status}`">
            <span class="metric-label">发育商 DQ</span>
            <strong class="metric-value">{{ formatScore(assessment.dq) }}</strong>
            <span class="metric-meta">{{ getDqStatusLabel(assessment.dq_status) }}</span>
          </article>

          <article class="metric-card metric-card--neutral">
            <span class="metric-label">总体结论</span>
            <strong class="metric-value metric-value--text">{{ assessment.level || getDqStatusLabel(assessment.dq_status) }}</strong>
            <span class="metric-meta">当前运行时区间：{{ dqBandRangeText }}</span>
          </article>

          <article class="metric-card metric-card--neutral">
            <span class="metric-label">手动失败 IEP 目标</span>
            <strong class="metric-value">{{ manualIepTargets.length }}</strong>
            <span class="metric-meta">仅统计人工判定失败项</span>
          </article>

          <article class="metric-card metric-card--neutral">
            <span class="metric-label">自动补记失败项</span>
            <strong class="metric-value">{{ autoFilledFailedItems.length }}</strong>
            <span class="metric-meta">已排除出 IEP 目标</span>
          </article>
        </div>
      </el-card>

      <el-card class="overall-card">
        <template #header>
          <h3>总体解读</h3>
        </template>

        <div class="overall-layout">
          <section class="copy-block">
            <h4>结果摘要</h4>
            <p v-html="formatRichText(overallRule?.summary || '当前未配置总体摘要。')"></p>
          </section>

          <section class="copy-block">
            <h4>发展优势</h4>
            <p v-html="formatRichText(overallRule?.strengths || '当前未配置优势摘要。')"></p>
          </section>

          <section class="copy-block">
            <h4>建议重点</h4>
            <p v-html="formatRichText(overallRule?.suggestions || '当前未配置建议重点。')"></p>
          </section>

          <section class="copy-block">
            <h4>专家临床提示</h4>
            <div class="copy-stack">
              <p v-if="expertClinical?.clinical" v-html="formatRichText(expertClinical.clinical)"></p>
              <p v-if="expertClinical?.risk" v-html="formatRichText(expertClinical.risk)"></p>
              <p v-if="expertClinical?.followup" v-html="formatRichText(expertClinical.followup)"></p>
              <p v-if="expertClinical?.referral" v-html="formatRichText(expertClinical.referral)"></p>
              <p v-if="!hasExpertClinical">当前无额外临床提示。</p>
            </div>
          </section>
        </div>
      </el-card>

      <el-card class="domain-table-card">
        <template #header>
          <h3>五能区结果总览</h3>
        </template>

        <el-table :data="domainRows" class="domain-table" empty-text="暂无能区结果">
          <el-table-column prop="name" label="能区" min-width="120" />
          <el-table-column label="智龄 MA(月)" min-width="120">
            <template #default="{ row }">
              {{ formatScore(row.mentalAge) }}
            </template>
          </el-table-column>
          <el-table-column label="DQ" width="100">
            <template #default="{ row }">
              {{ formatScore(row.dq) }}
            </template>
          </el-table-column>
          <el-table-column label="结论" min-width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusTagType(row.dqStatus)" effect="plain">
                {{ row.level || getDqStatusLabel(row.dqStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="通过/失败" min-width="120">
            <template #default="{ row }">
              {{ row.passedCount }} / {{ row.failedCount }}
            </template>
          </el-table-column>
          <el-table-column label="手动失败" width="100">
            <template #default="{ row }">
              {{ row.manualFailedCount }}
            </template>
          </el-table-column>
          <el-table-column label="自动补记失败" width="120">
            <template #default="{ row }">
              {{ row.autoFilledFailedCount }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card class="domain-feedback-card">
        <template #header>
          <h3>能区反馈与建议</h3>
        </template>

        <div class="domain-list">
          <section v-for="domain in domainRows" :key="domain.code" class="domain-item">
            <div class="domain-item__header">
              <div>
                <h4>{{ domain.name }}</h4>
                <p>{{ domain.headline || '当前未配置该能区标题文案。' }}</p>
              </div>
              <div class="domain-item__meta">
                <div>MA {{ formatScore(domain.mentalAge) }} 月</div>
                <div>DQ {{ formatScore(domain.dq) }}</div>
                <el-tag :type="getStatusTagType(domain.dqStatus)">
                  {{ domain.level || getDqStatusLabel(domain.dqStatus) }}
                </el-tag>
              </div>
            </div>

            <div class="domain-copy-grid">
              <section class="copy-block">
                <h5>能区解读</h5>
                <p v-html="formatRichText(domain.content || '当前未配置能区解读。')"></p>
              </section>

              <section class="copy-block">
                <h5>建议方向</h5>
                <div v-if="domain.advice.length" class="advice-list">
                  <article v-for="advice in domain.advice" :key="`${domain.code}-${advice.tag}-${advice.text}`" class="advice-item">
                    <el-tag size="small" type="info">{{ advice.tag }}</el-tag>
                    <p v-html="formatRichText(advice.text)"></p>
                  </article>
                </div>
                <p v-else>当前未配置该能区建议。</p>
              </section>
            </div>
          </section>
        </div>
      </el-card>

      <el-card class="iep-card">
        <template #header>
          <h3>IEP 提取结果</h3>
        </template>

        <div class="iep-summary">
          <el-alert
            type="info"
            :closable="false"
            title="IEP 目标仅来自手动失败项，自动补记失败项不会混入干预目标。"
          />
        </div>

        <div v-if="manualIepTargets.length" class="iep-list">
          <article v-for="target in manualIepTargets" :key="target.questionId" class="iep-item">
            <div class="iep-item__header">
              <div>
                <h4>{{ target.title }}</h4>
                <p>{{ target.domainName }} · {{ target.ageBand || `${target.ageGroupMonths}月龄组` }}</p>
              </div>
              <div class="iep-item__tags">
                <el-tag type="warning" size="small">手动失败</el-tag>
                <el-tag size="small" type="info">{{ target.itemCode || `Q${target.questionId}` }}</el-tag>
              </div>
            </div>

            <div class="iep-item__body">
              <section class="copy-block">
                <h5>操作提示</h5>
                <p v-html="formatRichText(target.prompt || '当前题目未记录操作提示。')"></p>
              </section>
              <section class="copy-block">
                <h5>通过标准</h5>
                <p v-html="formatRichText(target.passCriteria || '当前题目未记录通过标准。')"></p>
              </section>
            </div>
          </article>
        </div>
        <el-empty v-else description="当前评估未提取出手动失败 IEP 目标" />
      </el-card>

      <el-card class="auto-fill-card">
        <template #header>
          <h3>自动补记失败项</h3>
        </template>

        <div v-if="autoFilledFailedItems.length" class="auto-fill-list">
          <article v-for="item in autoFilledFailedItems" :key="item.questionId" class="auto-fill-item">
            <div>
              <h4>{{ item.title }}</h4>
              <p>{{ item.domainName }} · {{ item.ageBand || `${item.ageGroupMonths}月龄组` }}</p>
            </div>
            <div class="auto-fill-item__tags">
              <el-tag size="small" type="info">{{ item.itemCode || `Q${item.questionId}` }}</el-tag>
              <el-tag size="small" :type="item.autoFillReason === 'ceiling' ? 'danger' : 'warning'">
                {{ item.autoFillReason === 'ceiling' ? 'ceiling 自动补记' : 'basal 自动补记' }}
              </el-tag>
            </div>
          </article>
        </div>
        <el-empty v-else description="当前评估没有自动补记失败项" />
      </el-card>

      <el-card class="intervention-card">
        <template #header>
          <h3>重点干预建议</h3>
        </template>

        <div v-if="interventions.length" class="intervention-list">
          <article v-for="item in interventions" :key="item.domain" class="intervention-item">
            <div class="intervention-item__header">
              <h4>{{ item.domainName }}</h4>
              <el-tag :type="getStatusTagType(item.dqStatus)">DQ {{ getDqStatusLabel(item.dqStatus) }}</el-tag>
            </div>

            <div class="copy-stack">
              <p v-if="item.intervention.short" v-html="formatRichText(item.intervention.short)"></p>
              <p v-if="item.intervention.long" v-html="formatRichText(item.intervention.long)"></p>
              <p v-if="item.intervention.freq"><strong>建议频次：</strong>{{ item.intervention.freq }}</p>
            </div>

            <div v-if="item.intervention.methods?.length" class="method-group">
              <h5>训练方法</h5>
              <ul class="bullet-list">
                <li v-for="method in item.intervention.methods" :key="method">{{ method }}</li>
              </ul>
            </div>

            <div v-if="item.intervention.home?.length" class="method-group">
              <h5>家庭配合</h5>
              <ul class="bullet-list">
                <li v-for="home in item.intervention.home" :key="home">{{ home }}</li>
              </ul>
            </div>
          </article>
        </div>
        <el-empty v-else description="当前结果未生成重点干预建议" />
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
import { ArrowLeft } from '@element-plus/icons-vue'
import { Cnbsr2016AssessmentAPI } from '@/database/api'
import { SCGP_CNBS_R2016_Feedback_Config } from '@/config/CNBSR2016FeedbackConfig'
import {
  CNBSR2016_AGE_BRACKETS,
  CNBSR2016_DOMAIN_DEFINITIONS,
  CNBSR2016_DQ_BANDS,
} from '@/config/cnbsr2016-thresholds'
import type { Cnbsr2016AgeBracketCode, Cnbsr2016DomainCode, Cnbsr2016DqStatus } from '@/types/cnbsr2016'

interface Cnbsr2016AssessmentRecord {
  id: number
  student_id: number
  student_name: string
  student_gender: string
  age_months: number
  total_mental_age: number
  dq: number
  dq_status: Cnbsr2016DqStatus
  age_bracket: Cnbsr2016AgeBracketCode
  level: string
  level_code?: string | null
  domain_results?: DomainResult[]
  domain_feedback?: DomainFeedback[]
  iep_targets?: unknown[]
  iep_interventions?: InterventionRecord[]
  overall_rule?: OverallRule | null
  expert_clinical?: ExpertClinical | null
  start_time?: string
  end_time?: string
  created_at?: string
}

interface DomainResult {
  code: Cnbsr2016DomainCode
  name: string
  itemCount: number
  passedCount: number
  failedCount: number
  autoFilledPassedCount: number
  autoFilledFailedCount: number
  mentalAge: number
  maxMentalAge: number
  achievementRate: number
  dq: number
  dqStatus: Cnbsr2016DqStatus
  level: string
}

interface DomainFeedback {
  domain: Cnbsr2016DomainCode
  domainName: string
  dqStatus: Cnbsr2016DqStatus
  headline: string
  content: string
  advice: Array<{ tag: string; text: string }>
}

interface OverallRule {
  label?: string
  summary?: string
  strengths?: string
  suggestions?: string
}

interface ExpertClinical {
  clinical?: string
  risk?: string
  followup?: string
  referral?: string
}

interface InterventionRecord {
  domain: Cnbsr2016DomainCode
  domainName: string
  intervention: {
    short?: string
    long?: string
    methods?: string[]
    home?: string[]
    freq?: string
  }
}

interface AssessmentDetail {
  question_id: number
  dimension: Cnbsr2016DomainCode
  age_group_months: number
  score_weight: number
  score: number
  answer_time: number
  is_auto_filled: boolean
  auto_fill_reason: 'basal' | 'ceiling' | null
  item_code: string | null
  title: string
  dimension_name: string
  age_band: string | null
  prompt: string | null
  pass_criteria: string | null
}

interface DomainRow {
  code: Cnbsr2016DomainCode
  name: string
  mentalAge: number
  maxMentalAge: number
  dq: number
  dqStatus: Cnbsr2016DqStatus
  level: string
  passedCount: number
  failedCount: number
  manualFailedCount: number
  autoFilledFailedCount: number
  autoFilledPassedCount: number
  headline: string
  content: string
  advice: Array<{ tag: string; text: string }>
}

interface IepTargetItem {
  questionId: number
  itemCode: string | null
  title: string
  domain: Cnbsr2016DomainCode
  domainName: string
  ageGroupMonths: number
  ageBand: string | null
  prompt: string | null
  passCriteria: string | null
  autoFillReason: 'basal' | 'ceiling' | null
}

const route = useRoute()
const router = useRouter()

const assessment = ref<Cnbsr2016AssessmentRecord | null>(null)
const details = ref<AssessmentDetail[]>([])

const assessId = computed(() => {
  const raw = route.params.assessId || route.query.assessId
  const normalized = Array.isArray(raw) ? raw[0] : raw
  return Number(normalized)
})

const studentInfo = computed(() => {
  if (!assessment.value) return null

  return {
    name: assessment.value.student_name || '未命名学生',
    gender: assessment.value.student_gender || '-',
    ageMonths: Number(assessment.value.age_months || 0),
  }
})

const domainResultMap = computed(() => {
  const map = new Map<Cnbsr2016DomainCode, DomainResult>()
  for (const item of assessment.value?.domain_results || []) {
    map.set(item.code, item)
  }
  return map
})

const domainFeedbackMap = computed(() => {
  const map = new Map<Cnbsr2016DomainCode, DomainFeedback>()
  for (const item of assessment.value?.domain_feedback || []) {
    map.set(item.domain, item)
  }
  return map
})

const ageBracketLabel = computed(() => {
  const code = assessment.value?.age_bracket
  if (!code) return '-'
  return CNBSR2016_AGE_BRACKETS.find((item) => item.code === code)?.label || code
})

const dqBandRangeText = computed(() => {
  const band = CNBSR2016_DQ_BANDS.find((item) => item.status === assessment.value?.dq_status)
  if (!band) return '-'

  if (band.minInclusive !== undefined && band.maxInclusive !== undefined) {
    return `[${band.minInclusive}, ${band.maxInclusive + 1})`
  }
  if (band.minInclusive !== undefined) {
    return `>=${band.minInclusive}`
  }
  if (band.maxInclusive !== undefined) {
    return `<${band.maxInclusive + 1}`
  }
  return '-'
})

const overallRule = computed<OverallRule | null>(() => {
  if (!assessment.value) return null
  return assessment.value.overall_rule
    || SCGP_CNBS_R2016_Feedback_Config.overall_rules?.[assessment.value.age_bracket]?.[assessment.value.dq_status]
    || null
})

const expertClinical = computed<ExpertClinical | null>(() => {
  if (!assessment.value) return null
  return assessment.value.expert_clinical
    || SCGP_CNBS_R2016_Feedback_Config.expert_clinical?.[assessment.value.age_bracket]?.[assessment.value.dq_status]
    || null
})

const hasExpertClinical = computed(() =>
  Boolean(
    expertClinical.value?.clinical
      || expertClinical.value?.risk
      || expertClinical.value?.followup
      || expertClinical.value?.referral,
  ),
)

const domainRows = computed<DomainRow[]>(() =>
  CNBSR2016_DOMAIN_DEFINITIONS.map((domain) => {
    const result = domainResultMap.value.get(domain.code)
    const feedback = domainFeedbackMap.value.get(domain.code)
      || (assessment.value
        ? {
            domain: domain.code,
            domainName: domain.label,
            dqStatus: result?.dqStatus || 'normal',
            headline:
              SCGP_CNBS_R2016_Feedback_Config.dimensions?.[domain.code]?.[assessment.value.age_bracket]?.[result?.dqStatus || 'normal']?.headline || '',
            content:
              SCGP_CNBS_R2016_Feedback_Config.dimensions?.[domain.code]?.[assessment.value.age_bracket]?.[result?.dqStatus || 'normal']?.content || '',
            advice:
              SCGP_CNBS_R2016_Feedback_Config.dimensions?.[domain.code]?.[assessment.value.age_bracket]?.[result?.dqStatus || 'normal']?.advice || [],
          }
        : null)

    const domainDetails = details.value.filter((item) => item.dimension === domain.code)
    const manualFailedCount = domainDetails.filter((item) => item.score === 0 && item.is_auto_filled !== true).length

    return {
      code: domain.code,
      name: result?.name || domain.label,
      mentalAge: Number(result?.mentalAge || 0),
      maxMentalAge: Number(result?.maxMentalAge || 0),
      dq: Number(result?.dq || 0),
      dqStatus: result?.dqStatus || 'normal',
      level: result?.level || getDqStatusLabel(result?.dqStatus || 'normal'),
      passedCount: Number(result?.passedCount || 0),
      failedCount: Number(result?.failedCount || 0),
      manualFailedCount,
      autoFilledFailedCount: Number(result?.autoFilledFailedCount || 0),
      autoFilledPassedCount: Number(result?.autoFilledPassedCount || 0),
      headline: feedback?.headline || '',
      content: feedback?.content || '',
      advice: Array.isArray(feedback?.advice) ? feedback.advice : [],
    }
  }),
)

const manualIepTargets = computed<IepTargetItem[]>(() =>
  details.value
    .filter((item) => item.score === 0 && item.is_auto_filled !== true)
    .map((item) => ({
      questionId: Number(item.question_id),
      itemCode: item.item_code,
      title: item.title,
      domain: item.dimension,
      domainName: item.dimension_name,
      ageGroupMonths: Number(item.age_group_months || 0),
      ageBand: item.age_band,
      prompt: item.prompt,
      passCriteria: item.pass_criteria,
      autoFillReason: item.auto_fill_reason,
    }))
    .sort((left, right) => {
      const domainOrder = CNBSR2016_DOMAIN_DEFINITIONS.findIndex((item) => item.code === left.domain)
        - CNBSR2016_DOMAIN_DEFINITIONS.findIndex((item) => item.code === right.domain)
      if (domainOrder !== 0) {
        return domainOrder
      }
      return left.questionId - right.questionId
    }),
)

const autoFilledFailedItems = computed<IepTargetItem[]>(() =>
  details.value
    .filter((item) => item.score === 0 && item.is_auto_filled === true)
    .map((item) => ({
      questionId: Number(item.question_id),
      itemCode: item.item_code,
      title: item.title,
      domain: item.dimension,
      domainName: item.dimension_name,
      ageGroupMonths: Number(item.age_group_months || 0),
      ageBand: item.age_band,
      prompt: item.prompt,
      passCriteria: item.pass_criteria,
      autoFillReason: item.auto_fill_reason,
    }))
    .sort((left, right) => left.questionId - right.questionId),
)

const interventions = computed(() => {
  const interventionMap = new Map(
    ((assessment.value?.iep_interventions || []) as InterventionRecord[]).map((item) => [item.domain, item]),
  )

  return domainRows.value
    .filter((domain) => domain.dqStatus === 'borderline' || domain.dqStatus === 'delayed')
    .map((domain) => ({
      domain: domain.code,
      domainName: domain.name,
      dqStatus: domain.dqStatus,
      intervention:
        interventionMap.get(domain.code)?.intervention
        || SCGP_CNBS_R2016_Feedback_Config.iep_interventions?.[domain.code]?.[assessment.value?.age_bracket || 'a1']?.[domain.dqStatus]
        || null,
    }))
    .filter((item) => item.intervention)
})

function getDqStatusLabel(status: Cnbsr2016DqStatus | string | null | undefined) {
  if (!status) return '-'
  return CNBSR2016_DQ_BANDS.find((item) => item.status === status)?.label || String(status)
}

function getStatusTagType(status: Cnbsr2016DqStatus | string | null | undefined): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'excellent' || status === 'good') return 'success'
  if (status === 'normal') return 'info'
  if (status === 'borderline') return 'warning'
  return 'danger'
}

function formatScore(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '-'
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1)
}

function formatAge(ageMonths?: number) {
  if (ageMonths === null || ageMonths === undefined) return '-'
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (years <= 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRichText(text: string) {
  const studentName = studentInfo.value?.name || '该儿童'
  return String(text || '')
    .replace(/\[儿童姓名\]/g, studentName)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

function goBack() {
  router.back()
}

async function loadReport() {
  if (!Number.isFinite(assessId.value) || assessId.value <= 0) {
    ElMessage.error('无效的评估记录 ID')
    return
  }

  try {
    const api = new Cnbsr2016AssessmentAPI()
    const record = api.getAssessment(assessId.value)

    if (!record) {
      ElMessage.error('未找到儿心量表Ⅱ评估记录')
      return
    }

    assessment.value = record as Cnbsr2016AssessmentRecord
    details.value = api.getAssessmentDetails(assessId.value) as AssessmentDetail[]
  } catch (error) {
    console.error('[Cnbsr2016Report] 加载失败:', error)
    ElMessage.error('加载儿心量表Ⅱ报告失败')
  }
}

onMounted(async () => {
  await loadReport()
})
</script>

<style scoped>
.cnbsr-report {
  min-height: 100vh;
  padding: 20px;
  background: #f5f7fa;
}

.report-header,
.overview-card,
.overall-card,
.domain-table-card,
.domain-feedback-card,
.iep-card,
.auto-fill-card,
.intervention-card,
.loading-card {
  margin-bottom: 20px;
}

.header-row,
.header-left,
.student-info,
.domain-item__header,
.iep-item__header,
.auto-fill-item,
.intervention-item__header {
  display: flex;
  align-items: center;
}

.header-row,
.domain-item__header,
.iep-item__header,
.auto-fill-item,
.intervention-item__header {
  justify-content: space-between;
}

.header-left {
  gap: 16px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
}

.student-info {
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eef6ff 0%, #f7fbff 100%);
}

.info-item {
  min-width: 140px;
  display: grid;
  gap: 4px;
}

.label {
  color: #909399;
  font-size: 12px;
}

.value {
  color: #303133;
  font-weight: 600;
}

.metric-grid,
.overall-layout,
.domain-copy-grid,
.iep-item__body {
  display: grid;
  gap: 16px;
}

.metric-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.metric-card {
  min-height: 134px;
  padding: 20px;
  border-radius: 16px;
  display: grid;
  gap: 10px;
  color: #1f2937;
  background: #fff;
  border: 1px solid #ebeef5;
}

.metric-card--primary {
  background: linear-gradient(135deg, #2563eb 0%, #4f8df7 100%);
  color: #fff;
  border: none;
}

.metric-card--excellent,
.metric-card--good {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: #fff;
  border: none;
}

.metric-card--normal {
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  color: #fff;
  border: none;
}

.metric-card--borderline {
  background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
  color: #fff;
  border: none;
}

.metric-card--delayed {
  background: linear-gradient(135deg, #dc2626 0%, #f87171 100%);
  color: #fff;
  border: none;
}

.metric-card--neutral {
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
}

.metric-label {
  font-size: 13px;
  opacity: 0.9;
}

.metric-value {
  font-size: 34px;
  line-height: 1;
  font-weight: 700;
}

.metric-value--text {
  font-size: 20px;
  line-height: 1.3;
}

.metric-meta {
  font-size: 12px;
  opacity: 0.9;
}

.overall-layout {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.copy-block {
  padding: 16px;
  border-radius: 12px;
  background: #fbfcfe;
  border: 1px solid #ebeef5;
}

.copy-block h4,
.copy-block h5,
.domain-item h4,
.iep-item h4,
.auto-fill-item h4,
.intervention-item h4,
.method-group h5 {
  margin: 0 0 8px;
  color: #303133;
}

.copy-block p,
.domain-item__header p,
.iep-item__header p,
.auto-fill-item p,
.copy-stack p {
  margin: 0;
  color: #606266;
  line-height: 1.7;
}

.copy-stack {
  display: grid;
  gap: 10px;
}

.domain-list,
.iep-list,
.auto-fill-list,
.intervention-list,
.advice-list {
  display: grid;
  gap: 16px;
}

.domain-item,
.iep-item,
.intervention-item {
  padding: 18px;
  border-radius: 14px;
  border: 1px solid #ebeef5;
  background: #fff;
}

.domain-item__meta,
.iep-item__tags,
.auto-fill-item__tags {
  display: grid;
  gap: 8px;
  justify-items: end;
  text-align: right;
  color: #606266;
  font-size: 13px;
}

.domain-copy-grid,
.iep-item__body {
  margin-top: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.advice-item {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
}

.iep-summary {
  margin-bottom: 16px;
}

.auto-fill-item {
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
}

.auto-fill-item:last-child {
  border-bottom: none;
}

.bullet-list {
  margin: 0;
  padding-left: 18px;
  color: #606266;
  line-height: 1.7;
}

.method-group {
  margin-top: 12px;
}

@media (max-width: 768px) {
  .cnbsr-report {
    padding: 12px;
  }

  .header-row,
  .header-left,
  .domain-item__header,
  .iep-item__header,
  .auto-fill-item,
  .intervention-item__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .domain-item__meta,
  .iep-item__tags,
  .auto-fill-item__tags {
    justify-items: start;
    text-align: left;
  }
}
</style>
