<template>
  <div class="tgmd3-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>TGMD-3 大肌肉动作发展测验报告</h2>
          </div>
          <el-tag v-if="assessment" :type="resolveTagType(assessment.overall_rule?.severity)" effect="light" size="large">
            {{ assessment.level }}
          </el-tag>
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
            <div class="tile-label">动作总分</div>
            <div class="tile-value">{{ formatScore(assessment.total_score) }}</div>
            <div class="tile-sub">满分 100</div>
          </div>

          <div class="summary-tile">
            <div class="tile-label">总分常模等级</div>
            <div class="tile-value">{{ formatLevel(assessment.norm_summary?.totalLevel) }}</div>
            <div class="tile-sub">{{ assessment.norm_summary?.totalLabel || '未命中常模区间' }}</div>
          </div>

          <div class="summary-tile">
            <div class="tile-label">IEP 重点</div>
            <div class="tile-value">{{ iepTargets.length }}</div>
            <div class="tile-sub">按低分技能自动提取</div>
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

      <el-card class="norm-card">
        <template #header>
          <h3>常模等级</h3>
        </template>

        <div class="norm-grid">
          <article class="norm-item">
            <div class="norm-item__label">位移技能</div>
            <div class="norm-item__value">{{ formatLevel(assessment.norm_summary?.locomotorLevel) }}</div>
            <div class="norm-item__desc">{{ assessment.norm_summary?.locomotorLabel || '未命中常模区间' }}</div>
          </article>
          <article class="norm-item">
            <div class="norm-item__label">球类技能</div>
            <div class="norm-item__value">{{ formatLevel(assessment.norm_summary?.ballLevel) }}</div>
            <div class="norm-item__desc">{{ assessment.norm_summary?.ballLabel || '未命中常模区间' }}</div>
          </article>
          <article class="norm-item">
            <div class="norm-item__label">动作总分</div>
            <div class="norm-item__value">{{ formatLevel(assessment.norm_summary?.totalLevel) }}</div>
            <div class="norm-item__desc">{{ assessment.norm_summary?.totalLabel || '未命中常模区间' }}</div>
          </article>
        </div>
      </el-card>

      <el-card class="domains-card">
        <template #header>
          <h3>分测验结果</h3>
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
                <strong>{{ formatScore(domain.rawScore) }} / {{ domain.maxScore }}</strong>
                <span>{{ formatPercent(domain.percentage) }}</span>
              </div>
            </div>

            <el-progress
              :percentage="Number(domain.percentage || 0)"
              :status="resolveProgressStatus(domain.severity)"
              :stroke-width="12"
            />

            <div class="domain-meta">
              <span>{{ domain.level }}</span>
              <span v-if="domain.normLevel">常模 {{ domain.normLevel }} 级</span>
              <span v-if="domain.normLabel">{{ domain.normLabel }}</span>
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
          <article v-for="flag in flags" :key="flag.code" class="flag-item">
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
          <article v-for="target in iepTargets" :key="target.questionId" class="target-item">
            <div class="target-head">
              <div>
                <h4>{{ target.itemCode }}. {{ target.title }}</h4>
                <p>{{ target.dimensionName }}</p>
              </div>
              <div class="target-tags">
                <el-tag :type="target.priority === 1 ? 'danger' : target.priority === 2 ? 'warning' : 'success'">
                  {{ priorityLabelMap[target.priority] }}
                </el-tag>
                <el-tag type="info">{{ target.score }} / {{ target.maxScore }}</el-tag>
              </div>
            </div>
            <p>{{ target.rationale }}</p>
            <p class="target-advice">{{ target.advice }}</p>
          </article>
        </div>
        <el-empty v-else description="当前没有提取到需要优先跟进的技能目标" />
      </el-card>

      <el-card class="skills-card">
        <template #header>
          <h3>13项技能结果</h3>
        </template>

        <el-table :data="assessment.skill_results || []" stripe size="small">
          <el-table-column prop="itemCode" label="项目" width="90" />
          <el-table-column prop="dimensionName" label="分测验" width="110" />
          <el-table-column prop="name" label="技能" min-width="220" />
          <el-table-column prop="score" label="得分" width="90">
            <template #default="{ row }">
              {{ row.score }} / {{ row.maxScore }}
            </template>
          </el-table-column>
          <el-table-column label="完成率" width="110">
            <template #default="{ row }">
              {{ formatPercent(row.percentage) }}
            </template>
          </el-table-column>
          <el-table-column label="观察要点" min-width="320">
            <template #default="{ row }">
              {{ Array.isArray(row.criteria) ? row.criteria.join('；') : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card class="detail-card">
        <template #header>
          <h3>保存明细</h3>
        </template>

        <el-table :data="details" stripe size="small">
          <el-table-column prop="item_code" label="项目" width="90" />
          <el-table-column prop="dimension_name" label="分测验" width="110" />
          <el-table-column prop="title" label="技能" min-width="220" />
          <el-table-column label="录入分" width="90">
            <template #default="{ row }">
              {{ row.score }} / {{ row.max_score }}
            </template>
          </el-table-column>
          <el-table-column prop="equipment" label="器材准备" min-width="220" />
          <el-table-column prop="guidance" label="场地路线与测试指导语" min-width="260" />
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
import { ArrowLeft } from '@element-plus/icons-vue'
import { Tgmd3AssessmentAPI } from '@/database/api'

interface Tgmd3ReportRule {
  id: string
  title: string
  severity: 'success' | 'warning' | 'info'
  summary: string
  content: string
  advice: string[]
}

interface Tgmd3ReportDomain {
  code: string
  name: string
  rawScore: number
  maxScore: number
  percentage: number
  normLevel: number | null
  normLabel: string | null
  level: string
  severity: 'success' | 'warning' | 'danger'
}

interface Tgmd3ReportSkill {
  questionId: number
  itemCode: string
  dimensionName: string
  name: string
  score: number
  maxScore: number
  percentage: number
  criteria: string[]
}

interface Tgmd3ReportDomainFeedback {
  code: string
  title: string
  label: string
  content: string
  advice: string
}

interface Tgmd3ReportFlag {
  code: string
  title: string
  severity: 'error' | 'warning'
  content: string
  advice: string
}

interface Tgmd3ReportTarget {
  questionId: number
  itemCode: string
  title: string
  dimensionName: string
  score: number
  maxScore: number
  priority: 1 | 2 | 3
  rationale: string
  advice: string
}

interface Tgmd3NormSummary {
  locomotorLevel: number | null
  locomotorLabel: string | null
  ballLevel: number | null
  ballLabel: string | null
  totalLevel: number | null
  totalLabel: string | null
}

interface Tgmd3AssessmentRecord {
  id: number
  student_name: string
  student_gender: string
  age_months: number
  total_score: number
  level: string
  overall_rule?: Tgmd3ReportRule | null
  domain_results?: Tgmd3ReportDomain[]
  skill_results?: Tgmd3ReportSkill[]
  domain_feedback?: Tgmd3ReportDomainFeedback[]
  iep_targets?: Tgmd3ReportTarget[]
  flags?: Tgmd3ReportFlag[]
  norm_summary?: Tgmd3NormSummary | null
  start_time: string
}

const route = useRoute()
const router = useRouter()
const api = new Tgmd3AssessmentAPI()

const assessment = ref<Tgmd3AssessmentRecord | null>(null)
const details = ref<any[]>([])

const priorityLabelMap: Record<1 | 2 | 3, string> = {
  1: '优先突破',
  2: '持续强化',
  3: '巩固支持',
}

const iepTargets = computed(() => assessment.value?.iep_targets || [])
const flags = computed(() => assessment.value?.flags || [])

function loadReport() {
  const assessId = Number(route.params.assessId)
  if (!assessId) {
    ElMessage.error('无效的报告参数')
    router.push('/reports')
    return
  }

  const record = api.getAssessment(assessId)
  if (!record) {
    ElMessage.error('未找到 TGMD-3 报告')
    router.push('/reports')
    return
  }

  assessment.value = {
    ...record,
  }
  details.value = api.getAssessmentDetails(assessId)
}

function goBack() {
  router.back()
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

function formatScore(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '-'
}

function formatPercent(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : '-'
}

function formatLevel(level: number | null | undefined) {
  return level ? `${level}级` : '-'
}

onMounted(() => {
  loadReport()
})
</script>

<style scoped>
.tgmd3-report {
  display: grid;
  gap: 20px;
}

.header-content,
.header-left,
.student-info,
.overview-grid,
.domain-top,
.flag-head,
.target-head,
.target-tags,
.norm-grid {
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
  background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%);
}

.tile-label,
.tile-sub,
.domain-top p,
.domain-meta,
.target-head p,
.norm-item__desc {
  color: var(--el-text-color-secondary);
}

.tile-value,
.norm-item__value {
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

.norm-grid {
  gap: 16px;
  flex-wrap: wrap;
}

.norm-item,
.domain-item,
.flag-item,
.target-item {
  flex: 1;
  min-width: 220px;
  padding: 18px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 14px;
  background: #fff;
}

.norm-item {
  background: linear-gradient(180deg, #fffaf5 0%, #fff4e8 100%);
}

.norm-item__label {
  color: var(--el-text-color-secondary);
}

.domain-score {
  text-align: right;
}

.domain-score strong {
  display: block;
  font-size: 24px;
}

.domain-meta {
  display: flex;
  gap: 16px;
  margin: 10px 0 14px;
  font-size: 13px;
  flex-wrap: wrap;
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
