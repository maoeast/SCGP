<template>
  <div class="page-container scgp-admin-page reports-page">
    <div class="page-header reports-header">
      <div class="header-left">
        <h1>报告中心</h1>
        <p class="subtitle">统一查看和管理评估、训练与情绪模块报告，减少跨模块查找成本。</p>
      </div>
      <div class="header-right">
        <el-button
          type="warning"
          :icon="RefreshRight"
          :loading="migrating"
          @click="migrateData"
        >
          {{ migrating ? '迁移中...' : '迁移历史数据' }}
        </el-button>
      </div>
    </div>

    <section class="reports-filters scgp-surface scgp-filter-surface">
      <div class="reports-filter-toolbar">
        <div class="reports-filter-field">
          <label>学生</label>
          <el-select
            v-model="filters.student_id"
            placeholder="全部学生"
            clearable
            @change="handleFilter"
          >
            <el-option
              v-for="student in students"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>
        </div>

        <div class="reports-filter-field">
          <label>报告类型</label>
          <el-select
            v-model="filters.report_type"
            placeholder="全部类型"
            clearable
            @change="handleFilter"
          >
            <el-option
              v-for="option in reportTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

        <div class="reports-filter-field reports-filter-field--wide">
          <label>时间范围</label>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            v-bind="standardDateRangePickerProps"
            class="shared-date-range-picker"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </div>

        <div class="reports-quick-range" role="tablist" aria-label="时间快捷筛选">
          <button
            v-for="preset in QUICK_RANGE_OPTIONS"
            :key="preset.key"
            type="button"
            class="reports-range-pill"
            :class="{ 'is-active': activeDatePreset === preset.key }"
            @click="applyQuickRange(preset.key)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div class="reports-filter-actions">
          <el-button type="primary" :icon="Search" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>
      </div>
    </section>

    <section class="reports-distribution">
      <article class="reports-distribution-panel scgp-surface">
        <div class="reports-section-header reports-section-header--compact">
          <div>
            <h2>评估报告</h2>
            <p>当前筛选结果下的各量表报告数量。</p>
          </div>
          <strong class="reports-distribution-total">{{ assessmentReportCount }} 份</strong>
        </div>

        <div class="reports-type-grid reports-type-grid--assessment">
          <article
            v-for="item in assessmentTypeCards"
            :key="item.key"
            :class="['reports-type-card', `reports-type-card--${item.tone}`]"
          >
            <span v-if="item.isPlaceholder" class="reports-type-card__badge">占位</span>
            <span class="reports-type-card__name">{{ item.label }}</span>
            <strong class="reports-type-card__count">{{ item.value }}</strong>
            <span v-if="item.isPlaceholder" class="reports-type-card__meta">评估入口已占位，报告链路未开发</span>
          </article>
        </div>
      </article>

      <article class="reports-distribution-panel scgp-surface">
        <div class="reports-section-header reports-section-header--compact">
          <div>
            <h2>训练与干预报告</h2>
            <p>情绪模块、IEP 与训练报告统一收口展示。</p>
          </div>
          <strong class="reports-distribution-total">{{ interventionReportCount }} 份</strong>
        </div>

        <div class="reports-type-grid reports-type-grid--intervention">
          <article
            v-for="item in interventionTypeCards"
            :key="item.key"
            :class="['reports-type-card', `reports-type-card--${item.tone}`]"
          >
            <span class="reports-type-card__name">{{ item.label }}</span>
            <strong class="reports-type-card__count">{{ item.value }}</strong>
          </article>
        </div>
      </article>
    </section>

    <section class="main-content scgp-page-panel reports-table-panel">
      <div class="reports-table-header">
        <div>
          <h2>报告列表</h2>
          <p>支持查看、跳转报告详情，以及清理不再需要的历史记录。</p>
        </div>
        <div class="reports-table-header__summary">
          <span>当前结果</span>
          <strong>{{ reportList.length }} 条</strong>
        </div>
      </div>

      <el-table
        :data="reportList"
        style="width: 100%"
        v-loading="loading"
        class="reports-table"
        empty-text=""
      >
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="title" label="报告标题" min-width="250" />

        <el-table-column label="学生姓名" min-width="140">
          <template #default="scope">
            <span class="reports-student-name">{{ scope.row.student_name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="报告类型" width="170">
          <template #default="scope">
            <el-tag :type="getReportTypeTagType(scope.row.report_type)" effect="plain">
              {{ getReportTypeName(scope.row.report_type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <div class="report-actions">
              <el-button class="report-action-button" round type="primary" plain @click="viewReport(scope.row)">
                查看
              </el-button>
              <el-button class="report-action-button" round @click="downloadReport(scope.row)">
                下载
              </el-button>
              <el-button class="report-action-button" round type="danger" plain @click="deleteReport(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && reportList.length === 0"
        description="当前筛选条件下暂无报告记录"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight, Search } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { ReportAPI } from '@/database/api'
import { STANDARD_DATE_RANGE_PICKER_PROPS } from '@/utils/date-picker'

interface ReportTypeOption {
  value: string
  label: string
  category: 'assessment' | 'intervention'
  tone: 'blue' | 'teal' | 'amber' | 'coral'
}

type AssessmentCardTone = 'blue' | 'teal' | 'amber' | 'coral' | 'placeholder'
type AssessmentStatisticsKey =
  | 'sm_count'
  | 'weefim_count'
  | 'csirs_count'
  | 'conners_psq_count'
  | 'conners_trs_count'
  | 'sdq_count'
  | 'srs2_count'
  | 'cbcl_count'
  | 'cnbsr2016_count'
  | 'fine_motor_count'

interface ReportStatistics {
  total: number
  sm_count: number
  weefim_count: number
  csirs_count: number
  conners_psq_count: number
  conners_trs_count: number
  sdq_count: number
  srs2_count: number
  cbcl_count: number
  cnbsr2016_count: number
  fine_motor_count: number
  emotional_count: number
  iep_count: number
  training_count: number
}

type QuickRangeKey = 'all' | 'week' | 'month' | ''

const REPORT_TYPE_OPTIONS: ReportTypeOption[] = [
  { value: 'sm', label: 'S-M 评估报告', category: 'assessment', tone: 'blue' },
  { value: 'weefim', label: 'WeeFIM 评估报告', category: 'assessment', tone: 'teal' },
  { value: 'csirs', label: 'CSIRS 评估报告', category: 'assessment', tone: 'coral' },
  { value: 'conners-psq', label: 'Conners PSQ 报告', category: 'assessment', tone: 'amber' },
  { value: 'conners-trs', label: 'Conners TRS 报告', category: 'assessment', tone: 'blue' },
  { value: 'sdq', label: 'SDQ 评估报告', category: 'assessment', tone: 'amber' },
  { value: 'srs2', label: 'SRS-2 评估报告', category: 'assessment', tone: 'teal' },
  { value: 'cbcl', label: 'CBCL 评估报告', category: 'assessment', tone: 'coral' },
  { value: 'cnbsr2016', label: '儿心量表Ⅱ评估报告', category: 'assessment', tone: 'teal' },
  { value: 'fine_motor', label: '小肌肉功能发展评估报告', category: 'assessment', tone: 'blue' },
  { value: 'emotional', label: '情绪行为调节模块报告', category: 'intervention', tone: 'amber' },
  { value: 'iep', label: 'IEP 报告', category: 'intervention', tone: 'blue' },
  { value: 'training', label: '训练报告', category: 'intervention', tone: 'teal' },
]

const QUICK_RANGE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
] as const satisfies ReadonlyArray<{ key: Exclude<QuickRangeKey, ''>; label: string }>

const ASSESSMENT_CARD_DEFINITIONS: Array<{
  key: string
  label: string
  tone: AssessmentCardTone
  valueKey?: AssessmentStatisticsKey
  isPlaceholder?: boolean
}> = [
  { key: 'sm', label: 'S-M', tone: 'blue', valueKey: 'sm_count' },
  { key: 'weefim', label: 'WeeFIM', tone: 'teal', valueKey: 'weefim_count' },
  { key: 'csirs', label: 'CSIRS', tone: 'coral', valueKey: 'csirs_count' },
  { key: 'conners-psq', label: 'Conners PSQ', tone: 'amber', valueKey: 'conners_psq_count' },
  { key: 'conners-trs', label: 'Conners TRS', tone: 'blue', valueKey: 'conners_trs_count' },
  { key: 'sdq', label: 'SDQ', tone: 'amber', valueKey: 'sdq_count' },
  { key: 'srs2', label: 'SRS-2', tone: 'teal', valueKey: 'srs2_count' },
  { key: 'cbcl', label: 'CBCL', tone: 'coral', valueKey: 'cbcl_count' },
  { key: 'fine_motor', label: 'FMDA', tone: 'blue', valueKey: 'fine_motor_count' },
  { key: 'child-development-behavior', label: '儿心量表-II', tone: 'placeholder', isPlaceholder: true },
  { key: 'tgmd-3', label: 'TGMD-3', tone: 'placeholder', isPlaceholder: true },
  { key: 'gmfm', label: 'GMFM', tone: 'placeholder', isPlaceholder: true },
]

const router = useRouter()
const studentStore = useStudentStore()
const standardDateRangePickerProps = STANDARD_DATE_RANGE_PICKER_PROPS

const filters = ref({
  student_id: '' as string | number,
  report_type: '',
})

const dateRange = ref<[string, string] | null>(null)
const activeDatePreset = ref<QuickRangeKey>('all')

const students = ref<any[]>([])
const reportList = ref<any[]>([])
const loading = ref(false)
const migrating = ref(false)

const reportTypeOptions = REPORT_TYPE_OPTIONS
const reportTypeMap = new Map(REPORT_TYPE_OPTIONS.map((item) => [item.value, item]))

const statistics = computed<ReportStatistics>(() => deriveReportStatistics(reportList.value))
const assessmentReportCount = computed(() =>
  statistics.value.sm_count
  + statistics.value.weefim_count
  + statistics.value.csirs_count
  + statistics.value.conners_psq_count
  + statistics.value.conners_trs_count
  + statistics.value.sdq_count
  + statistics.value.srs2_count
  + statistics.value.cbcl_count
  + statistics.value.cnbsr2016_count
  + statistics.value.fine_motor_count,
)
const interventionReportCount = computed(() =>
  statistics.value.emotional_count
  + statistics.value.iep_count
  + statistics.value.training_count,
)

const assessmentTypeCards = computed(() =>
  ASSESSMENT_CARD_DEFINITIONS.map((item) => ({
    ...item,
    value: item.valueKey ? statistics.value[item.valueKey] : 0,
  })),
)

const interventionTypeCards = computed(() => [
  { key: 'emotional', label: '情绪模块', value: statistics.value.emotional_count, tone: 'amber' as const },
  { key: 'iep', label: 'IEP 报告', value: statistics.value.iep_count, tone: 'blue' as const },
  { key: 'training', label: '训练报告', value: statistics.value.training_count, tone: 'teal' as const },
])

function deriveReportStatistics(records: any[]): ReportStatistics {
  const next: ReportStatistics = {
    total: 0,
    sm_count: 0,
    weefim_count: 0,
    csirs_count: 0,
    conners_psq_count: 0,
    conners_trs_count: 0,
    sdq_count: 0,
    srs2_count: 0,
    cbcl_count: 0,
    cnbsr2016_count: 0,
    fine_motor_count: 0,
    emotional_count: 0,
    iep_count: 0,
    training_count: 0,
  }

  records.forEach((row) => {
    next.total += 1
    if (row.report_type === 'sm') next.sm_count += 1
    if (row.report_type === 'weefim') next.weefim_count += 1
    if (row.report_type === 'csirs') next.csirs_count += 1
    if (row.report_type === 'conners-psq') next.conners_psq_count += 1
    if (row.report_type === 'conners-trs') next.conners_trs_count += 1
    if (row.report_type === 'sdq') next.sdq_count += 1
    if (row.report_type === 'srs2') next.srs2_count += 1
    if (row.report_type === 'cbcl') next.cbcl_count += 1
    if (row.report_type === 'cnbsr2016') next.cnbsr2016_count += 1
    if (row.report_type === 'fine_motor') next.fine_motor_count += 1
    if (row.report_type === 'emotional') next.emotional_count += 1
    if (row.report_type === 'iep') next.iep_count += 1
    if (row.report_type === 'training') next.training_count += 1
  })

  return next
}

function getReportTypeTagType(type: string) {
  const typeMap: Record<string, 'warning' | 'success' | 'danger' | 'primary' | 'info'> = {
    sm: 'warning',
    weefim: 'success',
    csirs: 'danger',
    'conners-psq': 'primary',
    'conners-trs': 'info',
    sdq: 'warning',
    srs2: 'primary',
    cbcl: 'success',
    cnbsr2016: 'success',
    fine_motor: 'primary',
    emotional: 'warning',
    iep: 'danger',
    training: 'primary',
  }
  return typeMap[type] || 'info'
}

function getReportTypeName(type: string) {
  return reportTypeMap.get(type)?.label || '未知类型'
}

function formatDate(dateString: string) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentWeekRange(): [string, string] {
  const today = new Date()
  const day = today.getDay() === 0 ? 7 : today.getDay()
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  start.setDate(today.getDate() - day + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [formatDateString(start), formatDateString(end)]
}

function getCurrentMonthRange(): [string, string] {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return [formatDateString(start), formatDateString(end)]
}

function getPresetRange(preset: Exclude<QuickRangeKey, ''>) {
  if (preset === 'all') return null
  if (preset === 'week') return getCurrentWeekRange()
  return getCurrentMonthRange()
}

function matchesRange(source: [string, string] | null, target: [string, string]) {
  return Boolean(source && source[0] === target[0] && source[1] === target[1])
}

function resolveActiveDatePreset(range: [string, string] | null): QuickRangeKey {
  if (!range?.[0] || !range?.[1]) return 'all'
  if (matchesRange(range, getCurrentWeekRange())) return 'week'
  if (matchesRange(range, getCurrentMonthRange())) return 'month'
  return ''
}

async function loadStudents() {
  try {
    await studentStore.loadStudents()
    students.value = studentStore.students
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

async function loadReports() {
  loading.value = true
  try {
    const api = new ReportAPI()
    const params: any = {}

    if (filters.value.student_id) {
      params.student_id = filters.value.student_id
    }
    if (filters.value.report_type) {
      params.report_type = filters.value.report_type
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = `${dateRange.value[1]} 23:59:59`
    }

    reportList.value = api.getReportList(params)
  } catch (error) {
    console.error('加载报告列表失败:', error)
    ElMessage.error('加载报告列表失败')
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  loadReports()
}

function applyQuickRange(preset: Exclude<QuickRangeKey, ''>) {
  activeDatePreset.value = preset
  dateRange.value = getPresetRange(preset)
  loadReports()
}

function handleDateRangeChange(value: [string, string] | null) {
  activeDatePreset.value = resolveActiveDatePreset(value)
  loadReports()
}

function resetFilters() {
  filters.value.student_id = ''
  filters.value.report_type = ''
  dateRange.value = null
  activeDatePreset.value = 'all'
  loadReports()
}

function viewReport(report: any) {
  if (report.report_type === 'cnbsr2016') {
    ElMessage.warning('CNBS-R2016 报告页尚未接入，当前阶段仅完成 persistence 与 report_record 闭环')
    return
  }

  const routeMap: Record<string, string> = {
    sm: `/assessment/sm/report?assessId=${report.assess_id}&studentId=${report.student_id}`,
    weefim: `/assessment/weefim/report?assessId=${report.assess_id}&studentId=${report.student_id}`,
    csirs: `/assessment/csirs/report/${report.assess_id}`,
    'conners-psq': `/assessment/conners-psq/report/${report.assess_id}`,
    'conners-trs': `/assessment/conners-trs/report/${report.assess_id}`,
    sdq: `/assessment/sdq/report/${report.assess_id}`,
    srs2: `/assessment/srs2/report/${report.assess_id}`,
    cbcl: `/assessment/cbcl/report/${report.assess_id}`,
    fine_motor: `/assessment/fine_motor/report/${report.assess_id}`,
    emotional: `/emotional/report?studentId=${report.student_id}&reportId=${report.id}`,
    iep: `/games/report?recordId=${report.training_record_id}&studentId=${report.student_id}`,
    training: `/training/plans/${report.plan_id}`,
  }

  const target = routeMap[report.report_type]
  if (target) {
    router.push(target)
    return
  }

  ElMessage.warning('该类型报告暂未实现')
}

function downloadReport(report: any) {
  viewReport(report)
  ElMessage.info('请在报告页面执行下载或导出操作')
}

async function deleteReport(report: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除报告“${report.title}”吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const api = new ReportAPI()
    api.deleteReportRecord(report.id)
    ElMessage.success('删除成功')
    loadReports()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除报告失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

async function migrateData() {
  try {
    await ElMessageBox.confirm(
      '此操作将为历史评估数据创建对应的报告记录，不会删除已有数据。',
      '迁移历史数据',
      {
        confirmButtonText: '开始迁移',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    migrating.value = true
    const api = new ReportAPI()
    const result = api.migrateAssessmentRecordsToReportRecords()

    if (result.total > 0) {
      ElMessage.success(`历史数据迁移完成，共处理 ${result.total} 条记录`)
      await loadReports()
    } else {
      ElMessage.info('没有需要迁移的数据')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('迁移数据失败:', error)
      ElMessage.error('迁移失败')
    }
  } finally {
    migrating.value = false
  }
}

onMounted(async () => {
  await loadStudents()
  await loadReports()
})
</script>

<style scoped>
.reports-page {
  gap: 20px;
}

.reports-header {
  margin-bottom: 0;
}

.reports-distribution-panel,
.reports-filters {
  padding: 24px;
}

.reports-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.reports-section-header h2 {
  margin: 10px 0 0;
  color: var(--scgp-text);
  font-size: 24px;
  line-height: 1.15;
}

.reports-section-header p {
  margin: 8px 0 0;
  color: var(--scgp-muted);
  font-size: 14px;
  line-height: 1.65;
}

.reports-section-header--compact h2 {
  font-size: 22px;
}

.reports-filter-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 0;
}

.reports-filter-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
  flex: 1 1 180px;
}

.reports-filter-field--wide {
  min-width: 280px;
  flex: 1.6 1 320px;
}

.reports-filter-field label {
  color: var(--scgp-muted);
  font-size: 13px;
  font-weight: 600;
}

.shared-date-range-picker {
  width: 100%;
}

.reports-filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.reports-quick-range {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.reports-range-pill {
  border: 1px solid rgba(220, 223, 230, 0.9);
  background: rgba(255, 255, 255, 0.88);
  color: var(--scgp-muted);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.22s ease;
}

.reports-range-pill:hover {
  color: var(--scgp-text);
  border-color: #afcfff;
  transform: translateY(-1px);
}

.reports-range-pill.is-active {
  color: #2f74d0;
  border-color: #66a8ff;
  background: #eef5ff;
  box-shadow: 0 10px 20px rgba(102, 168, 255, 0.12);
}

.reports-distribution {
  display: grid;
  grid-template-columns: 1.25fr 0.9fr;
  gap: 20px;
}

.reports-distribution-total {
  color: var(--scgp-text);
  font-size: 26px;
  line-height: 1.2;
}

.reports-type-grid {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.reports-type-grid--assessment {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.reports-type-grid--intervention {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.reports-type-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  min-height: 92px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--scgp-border);
  background: #ffffff;
}

.reports-type-card__name {
  color: var(--scgp-muted);
  font-size: 13px;
  line-height: 1.5;
}

.reports-type-card__count {
  color: var(--scgp-text);
  font-size: 28px;
  line-height: 1;
}

.reports-type-card__badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid #f2d39a;
  background: #fff7e7;
  color: #9a6507;
  font-size: 11px;
  line-height: 1;
}

.reports-type-card__meta {
  color: var(--scgp-subtle);
  font-size: 12px;
  line-height: 1.5;
}

.reports-type-card--blue {
  background: linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
}

.reports-type-card--teal {
  background: linear-gradient(180deg, #eefbf8 0%, #ffffff 100%);
}

.reports-type-card--amber {
  background: linear-gradient(180deg, #fff8ea 0%, #ffffff 100%);
}

.reports-type-card--coral {
  background: linear-gradient(180deg, #fff4ee 0%, #ffffff 100%);
}

.reports-type-card--placeholder {
  border-style: dashed;
  border-color: #d7dee8;
  background: linear-gradient(180deg, #fbfcfe 0%, #ffffff 100%);
}

.reports-table-panel {
  padding: 24px;
}

.reports-table-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.reports-table-header h2 {
  margin: 10px 0 0;
  color: var(--scgp-text);
  font-size: 24px;
  line-height: 1.15;
}

.reports-table-header p {
  margin: 8px 0 0;
  color: var(--scgp-muted);
  font-size: 14px;
  line-height: 1.65;
}

.reports-table-header__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 112px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--scgp-border);
  background: var(--scgp-surface-soft);
  color: var(--scgp-muted);
  font-size: 12px;
}

.reports-table-header__summary strong {
  color: var(--scgp-text);
  font-size: 22px;
  line-height: 1.2;
}

.reports-table :deep(.el-table__header th) {
  background: #fbfcfe;
  color: var(--scgp-muted);
  font-weight: 600;
}

.reports-table :deep(.el-table__body td) {
  padding-top: 14px;
  padding-bottom: 14px;
}

.reports-student-name {
  color: var(--scgp-text);
  font-weight: 500;
}

.report-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.report-action-button {
  min-height: 34px;
}

@media (max-width: 1280px) {
  .reports-distribution {
    grid-template-columns: 1fr;
  }

  .reports-type-grid--assessment {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .reports-type-grid--assessment,
  .reports-type-grid--intervention {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .reports-page {
    gap: 16px;
    padding: 16px;
  }

  .reports-distribution-panel,
  .reports-filters,
  .reports-table-panel {
    padding: 18px;
  }

  .reports-type-grid--assessment,
  .reports-type-grid--intervention {
    grid-template-columns: 1fr;
  }

  .reports-section-header,
  .reports-table-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .reports-filter-actions {
    width: 100%;
    margin-left: 0;
  }

  .reports-quick-range {
    width: 100%;
  }

  .reports-filter-actions :deep(.el-button) {
    flex: 1 1 0;
  }
}
</style>
