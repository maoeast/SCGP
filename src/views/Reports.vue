<template>
  <div class="page-container scgp-admin-page reports-page">
    <div class="page-header reports-header">
      <div class="header-left">
        <h1>报告中心</h1>
        <p class="subtitle">统一查看和管理评估、训练与情绪模块报告，减少跨模块查找成本。</p>
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
            <span class="reports-type-card__name">{{ item.label }}</span>
            <strong class="reports-type-card__count">{{ item.value }}</strong>
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
        :data="pagedReportList"
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

      <div v-if="reportList.length > 0" class="reports-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 40]"
          :total="reportList.length"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>

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
import { Search } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { ReportAPI } from '@/database/api'
import { buildAssessmentReportRoute } from '@/features/assessment/report-routes'
import {
  ASSESSMENT_REPORT_CATALOG,
  deriveAssessmentReportCounts,
  getAssessmentReportCatalogItem,
  isAssessmentReportScaleType,
  type AssessmentReportCounts,
} from '@/features/assessment/report-center-catalog'
import { STANDARD_DATE_RANGE_PICKER_PROPS } from '@/utils/date-picker'

interface ReportTypeOption {
  value: string
  label: string
  category: 'assessment' | 'intervention'
  tone: 'blue' | 'teal' | 'amber' | 'coral'
}

interface ReportStatistics {
  total: number
  assessment: AssessmentReportCounts
  emotional_count: number
  iep_count: number
  training_count: number
}

type QuickRangeKey = 'all' | 'week' | 'month' | ''

const REPORT_TYPE_OPTIONS: ReportTypeOption[] = [
  ...ASSESSMENT_REPORT_CATALOG.map((item) => ({
    value: item.code,
    label: item.selectLabel,
    category: 'assessment' as const,
    tone: item.tone,
  })),
  { value: 'emotional', label: '情绪行为调节模块报告', category: 'intervention', tone: 'amber' },
  { value: 'iep', label: 'IEP 报告', category: 'intervention', tone: 'blue' },
  { value: 'training', label: '训练报告', category: 'intervention', tone: 'teal' },
]

const QUICK_RANGE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
] as const satisfies ReadonlyArray<{ key: Exclude<QuickRangeKey, ''>; label: string }>

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
const currentPage = ref(1)
const pageSize = ref(10)

const reportTypeOptions = REPORT_TYPE_OPTIONS
const reportTypeMap = new Map(REPORT_TYPE_OPTIONS.map((item) => [item.value, item]))

const statistics = computed<ReportStatistics>(() => deriveReportStatistics(reportList.value))
const pagedReportList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return reportList.value.slice(start, start + pageSize.value)
})
const assessmentReportCount = computed(() =>
  Object.values(statistics.value.assessment).reduce((total, count) => total + count, 0),
)
const interventionReportCount = computed(() =>
  statistics.value.emotional_count
  + statistics.value.iep_count
  + statistics.value.training_count,
)

const assessmentTypeCards = computed(() =>
  ASSESSMENT_REPORT_CATALOG.map((item) => ({
    key: item.code,
    label: item.cardLabel,
    tone: item.tone,
    value: statistics.value.assessment[item.code],
  })),
)

const interventionTypeCards = computed(() => [
  { key: 'emotional', label: '情绪模块', value: statistics.value.emotional_count, tone: 'amber' as const },
  { key: 'iep', label: 'IEP 报告', value: statistics.value.iep_count, tone: 'blue' as const },
  { key: 'training', label: '训练报告', value: statistics.value.training_count, tone: 'teal' as const },
])

function deriveReportStatistics(records: any[]): ReportStatistics {
  const next: ReportStatistics = {
    total: records.length,
    assessment: deriveAssessmentReportCounts(records),
    emotional_count: 0,
    iep_count: 0,
    training_count: 0,
  }

  records.forEach((row) => {
    if (row.report_type === 'emotional') next.emotional_count += 1
    if (row.report_type === 'iep') next.iep_count += 1
    if (row.report_type === 'training') next.training_count += 1
  })

  return next
}

function getReportTypeTagType(type: string) {
  if (isAssessmentReportScaleType(type)) {
    return getAssessmentReportCatalogItem(type).tagType
  }

  const typeMap: Record<string, 'warning' | 'success' | 'danger' | 'primary' | 'info'> = {
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
    currentPage.value = 1
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
  if (isAssessmentReportScaleType(report.report_type)) {
    router.push(buildAssessmentReportRoute({
      scaleType: report.report_type,
      assessId: report.assess_id,
      studentId: report.student_id,
    }))
    return
  }

  const routeMap: Record<string, string> = {
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

.reports-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
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
