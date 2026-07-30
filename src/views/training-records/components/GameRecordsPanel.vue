<template>
  <div class="records-panel scgp-records-stack">
    <section class="stats-row scgp-stats-grid" aria-label="游戏训练记录统计概览">
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">总记录数</div>
        <div class="summary-card__value">{{ records.length }}</div>
      </article>
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">平均正确率</div>
        <div class="summary-card__value">{{ avgAccuracyDisplay }}</div>
      </article>
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">平均响应时间</div>
        <div class="summary-card__value">{{ avgResponseTimeDisplay }}</div>
      </article>
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">总训练时长</div>
        <div class="summary-card__value">{{ totalDuration }}</div>
      </article>
    </section>

    <div class="filter-section records-filter-section scgp-filter-surface scgp-toolbar-panel">
      <div class="filter-toolbar scgp-toolbar">
        <div class="filter-toolbar__controls scgp-toolbar__controls">
          <el-select
            v-if="showStudentFilter"
            v-model="selectedStudentId"
            size="small"
            placeholder="选择学生"
            clearable
            filterable
            class="student-filter scgp-field-control scgp-field-control--student"
            @change="loadRecords"
          >
            <el-option
              v-for="student in students"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>

          <div class="date-filter-group scgp-toolbar__group">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              size="small"
              v-bind="standardDateRangePickerProps"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-range-filter scgp-date-range"
              @change="handleDateRangeChange"
            />

            <div class="filter-toolbar__divider scgp-toolbar__divider" aria-hidden="true" />

            <div class="quick-range-list scgp-range-list" role="tablist" aria-label="日期快捷筛选">
              <button
                v-for="preset in QUICK_RANGE_OPTIONS"
                :key="preset.key"
                type="button"
                class="range-pill scgp-range-pill"
                :class="{ 'is-active': activeDatePreset === preset.key }"
                @click="applyQuickRange(preset.key)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>

        <el-button class="refresh-button scgp-refresh-button" size="small" :icon="Refresh" @click="loadRecords">
          刷新
        </el-button>
        <el-button class="export-button scgp-refresh-button" size="small" @click="handleExportExcel">
          导出 Excel
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="records"
      stripe
      class="records-table scgp-records-table"
      style="width: 100%"
      :max-height="tableMaxHeightValue"
      empty-text=""
    >
      <el-table-column v-if="showStudentColumn" prop="student_name" label="学生姓名" width="116" />

      <el-table-column v-if="showEntryColumn" label="训练入口" width="140">
        <template #default="{ row }">
          <span class="task-badge task-badge--entry">{{ getEntryLabel(row) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="任务名称" min-width="170">
        <template #default="{ row }">
          <span class="task-badge">{{ getTaskLabel(row) }}</span>
        </template>
      </el-table-column>

      <el-table-column v-if="showCompletionStatusColumn" label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" effect="plain" :type="getCompletionStatusType(row.completion_status)">
            {{ getCompletionStatusLabel(row.completion_status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="训练时间" width="156">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTimeToMinute(row.timestamp) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="时长" width="100">
        <template #default="{ row }">
          {{ formatDuration(row.duration) }}
        </template>
      </el-table-column>

      <el-table-column label="正确率" width="170">
        <template #default="{ row }">
          <div v-if="getAccuracyPercent(row.accuracy_rate) !== null" class="accuracy-cell">
            <div class="accuracy-track" aria-hidden="true">
              <div
                class="accuracy-fill"
                :style="{
                  width: `${getAccuracyPercent(row.accuracy_rate)}%`,
                  background: getAccuracyColor(getAccuracyPercent(row.accuracy_rate) || 0),
                }"
              />
            </div>
            <span class="accuracy-value">{{ getAccuracyPercent(row.accuracy_rate) }}%</span>
          </div>
          <span v-else class="metric-empty">-</span>
        </template>
      </el-table-column>

      <el-table-column label="平均响应" width="110">
        <template #default="{ row }">
          {{ formatResponseTime(row.avg_response_time) }}
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="156">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTimeToMinute(row.created_at) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="108" fixed="right">
        <template #default="{ row }">
          <button
            type="button"
            class="detail-pill-button scgp-detail-button"
            :class="{ 'is-disabled': !supportsRecordDetail(row) }"
            :disabled="!supportsRecordDetail(row)"
            @click="handleViewDetail(row)"
          >
            {{ supportsRecordDetail(row) ? '查看详情' : '暂无详情' }}
          </button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && records.length === 0"
      class="scgp-empty-state"
      :description="isEmotionalEntry ? '暂无情绪训练记录' : '暂无游戏训练记录'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { EmotionalTrainingAPI } from '@/database/emotional-api'
import { EmotionalGamesAPI } from '@/database/emotional-games-api'
import { GameTrainingAPI, StudentAPI, TrainingSessionAPI, type TrainingSessionRecord } from '@/database/api'
import { STANDARD_DATE_RANGE_PICKER_PROPS } from '@/utils/date-picker'
import { getTrainingEntry, type TrainingEntryCode } from '@/utils/training-entry'
import { exportGameRecordsExcel } from '../exportTrainingRecords'

interface Props {
  entryCode?: TrainingEntryCode
  studentId?: number
  hideStudentFilter?: boolean
  tableMaxHeight?: number | string
}

type QuickRangeKey = 'all' | 'week' | 'month' | ''

const QUICK_RANGE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
] as const satisfies ReadonlyArray<{ key: Exclude<QuickRangeKey, ''>; label: string }>

const props = withDefaults(defineProps<Props>(), {
  hideStudentFilter: false,
  tableMaxHeight: 500,
})

const emit = defineEmits<{
  (e: 'view-detail', record: any): void
}>()

const loading = ref(false)
const records = ref<any[]>([])
const students = ref<any[]>([])
const selectedStudentId = ref<number | undefined>(props.studentId || undefined)
const dateRange = ref<[string, string] | null>(null)
const activeDatePreset = ref<QuickRangeKey>('all')
const standardDateRangePickerProps = STANDARD_DATE_RANGE_PICKER_PROPS
const gameTrainingApi = new GameTrainingAPI()
const emotionalGamesApi = new EmotionalGamesAPI()
const trainingSessionApi = new TrainingSessionAPI()

const currentEntry = computed(() => (props.entryCode ? getTrainingEntry(props.entryCode) : null))
const isFixedStudentMode = computed(() => Number(props.studentId || 0) > 0)
const isEmotionalEntry = computed(() => currentEntry.value?.moduleCode === 'emotional')
const showCompletionStatusColumn = computed(() => {
  return isEmotionalEntry.value || records.value.some((row) =>
    row?.record_source === 'emotional_game' || row?.record_source === 'training_session'
  )
})
const showStudentFilter = computed(() => !props.hideStudentFilter && !isFixedStudentMode.value)
const showStudentColumn = computed(() => !isFixedStudentMode.value)
const showEntryColumn = computed(() => !props.entryCode)
const tableMaxHeightValue = computed(() => props.tableMaxHeight)

function hasNumericMetric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

const avgAccuracy = computed(() => {
  const source = records.value
    .map((record) => record.accuracy_rate)
    .filter((value): value is number => hasNumericMetric(value))

  if (source.length === 0) return null
  const sum = source.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / source.length) * 100)
})

const avgAccuracyDisplay = computed(() => (avgAccuracy.value !== null ? `${avgAccuracy.value}%` : '-'))

const avgResponseTime = computed(() => {
  const source = records.value
    .map((record) => record.avg_response_time)
    .filter((value): value is number => hasNumericMetric(value))

  if (source.length === 0) return null
  const sum = source.reduce((acc, value) => acc + value, 0)
  return Math.round(sum / source.length)
})

const avgResponseTimeDisplay = computed(() => formatResponseTime(avgResponseTime.value))

const totalDuration = computed(() => {
  const total = records.value.reduce((acc, record) => acc + Number(record.duration || 0), 0)
  return formatDuration(total)
})

function resolveRecordEntry(row: any) {
  return getTrainingEntry(row.entry_code, row.module_code)
}

function isStandaloneEmotionalGameRecord(row: any) {
  return row.record_source === 'emotional_game'
}

function isEmotionalRecord(row: any) {
  if (isStandaloneEmotionalGameRecord(row)) {
    return true
  }

  return resolveRecordEntry(row).moduleCode === 'emotional'
    || row.session_type === 'emotion_scene'
    || row.session_type === 'care_scene'
}

function isEmotionalSessionRecord(row: any) {
  return isEmotionalRecord(row) && !isStandaloneEmotionalGameRecord(row)
}

function getEntryLabel(row: any) {
  return resolveRecordEntry(row).name
}

function getTaskLabel(row: any) {
  if (!isEmotionalRecord(row)) {
    return row.task_name || `任务 ${row.task_id}`
  }

  if (row.session_type === 'emotion_scene') {
    return row.task_name || '情绪与场景'
  }

  if (row.session_type === 'care_scene') {
    return row.task_name || '表达关心'
  }

  return row.task_name || '情绪训练'
}

function getCompletionStatusLabel(status?: string) {
  if (status === 'cancelled') return '已取消'
  if (status === 'aborted') return '已中断'
  if (status === 'interrupted') return '已中断'
  return '已完成'
}

function getCompletionStatusType(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'info'
  if (status === 'aborted') return 'warning'
  return 'warning'
}

function formatResponseTime(ms: number | null | undefined): string {
  if (!hasNumericMetric(ms)) {
    return '-'
  }

  const safeMs = Number(ms)
  if (safeMs < 1000) {
    return `${safeMs}ms`
  }

  return `${(safeMs / 1000).toFixed(1)}秒`
}

function formatDateTimeToMinute(value: number | string | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatDuration(ms: number) {
  const safeMs = Math.max(0, Number(ms || 0))
  const seconds = Math.floor(safeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}分 ${remainingSeconds}秒`
  }

  return `${remainingSeconds}秒`
}

function getAccuracyPercent(rate: number | null | undefined) {
  if (!hasNumericMetric(rate)) {
    return null
  }

  const percent = Math.round(Number(rate || 0) * 100)
  return Math.max(0, Math.min(100, percent))
}

function getAccuracyColor(percent: number) {
  if (percent >= 90) return '#1D9E75'
  if (percent >= 70) return '#BA7517'
  return '#E24B4A'
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

function applyQuickRange(preset: Exclude<QuickRangeKey, ''>) {
  activeDatePreset.value = preset
  dateRange.value = getPresetRange(preset)
  loadRecords()
}

function handleDateRangeChange(value: [string, string] | null) {
  activeDatePreset.value = resolveActiveDatePreset(value)
  loadRecords()
}

function mapStudentName(recordsToMap: any[], studentName: string) {
  return recordsToMap.map((record: any) => ({
    ...record,
    student_name: record.student_name || studentName || '未知',
  }))
}

function getCustomGameRecords(studentId: number) {
  if (!props.entryCode) {
    return emotionalGamesApi.getStudentRecords(studentId)
  }

  return emotionalGamesApi.getStudentRecordsByEntry(studentId, props.entryCode)
}

function mapTrainingSessionRecord(record: TrainingSessionRecord) {
  const timestamp = Date.parse(record.started_at)
  return {
    id: record.id,
    student_id: record.student_id,
    student_name: record.student_name || '未知',
    task_id: record.task_id,
    task_name: record.task_name_snapshot || record.resource_name || '训练任务',
    resource_id: record.resource_id,
    resource_type: record.resource_type || 'game',
    session_type: record.session_family,
    entry_code: record.entry_code,
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    duration: record.duration_ms,
    accuracy_rate: record.accuracy_rate,
    avg_response_time: record.avg_response_time_ms,
    raw_data: record.summary_payload || {},
    class_id: record.class_id,
    class_name: record.class_name,
    module_code: record.module_code,
    created_at: record.created_at,
    completion_status: record.completion_status,
    exit_trigger: record.summary_payload?.exitTrigger || null,
    record_source: 'training_session',
  }
}

function getUnifiedCognitiveGameRecords(studentId: number) {
  if (props.entryCode !== 'cognitive') {
    return []
  }

  return trainingSessionApi.listSessions({
    studentId,
    entryCode: props.entryCode,
    sessionFamily: 'cognitive_game',
  }).map(mapTrainingSessionRecord)
}

function getStudentGameRecords(studentId: number, studentName?: string) {
  const nextRecords = [
    ...gameTrainingApi.getStudentTrainingRecords(studentId, undefined, undefined, props.entryCode),
    ...getCustomGameRecords(studentId),
    ...getUnifiedCognitiveGameRecords(studentId),
  ]

  return studentName ? mapStudentName(nextRecords, studentName) : nextRecords
}

function supportsRecordDetail(row: any) {
  return Boolean(row?.id)
}

function handleViewDetail(row: any) {
  if (!supportsRecordDetail(row)) {
    return
  }

  emit('view-detail', row)
}

function handleExportExcel() {
  if (!records.value.length) {
    ElMessage.warning('当前没有可导出的记录')
    return
  }

  const studentName = students.value.find((student) => student.id === selectedStudentId.value)?.name || ''
  try {
    exportGameRecordsExcel(records.value, studentName)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败，请重试')
  }
}

async function loadStudents() {
  if (isFixedStudentMode.value) {
    return
  }

  try {
    const api = new StudentAPI()
    students.value = await api.getAllStudents()
  } catch (error) {
    console.error('加载学生列表失败:', error)
  }
}

function loadRecords() {
  loading.value = true

  try {
    let allRecords: any[] = []

    if (isFixedStudentMode.value && props.studentId) {
      allRecords = getStudentGameRecords(props.studentId)
    } else if (selectedStudentId.value) {
      const student = students.value.find((item) => item.id === selectedStudentId.value)
      allRecords = getStudentGameRecords(selectedStudentId.value, student?.name || '未知')
    } else {
      for (const student of students.value) {
        allRecords.push(...getStudentGameRecords(student.id, student.name))
      }
    }

    if (allRecords.some((record) => isEmotionalSessionRecord(record))) {
      const emotionalApi = new EmotionalTrainingAPI()
      allRecords = allRecords.map((record: any) => {
        if (!isEmotionalSessionRecord(record)) {
          return record
        }

        const session = emotionalApi.getSessionByTrainingRecordId(record.id)
        return {
          ...record,
          completion_status: session?.completion_status || 'completed',
        }
      })
    }

    if (dateRange.value?.[0] && dateRange.value?.[1]) {
      const startDate = new Date(dateRange.value[0]).getTime()
      const endDate = new Date(`${dateRange.value[1]} 23:59:59`).getTime()
      allRecords = allRecords.filter((record: any) => {
        const timestamp = Number(record.timestamp)
        return Number.isFinite(timestamp) && timestamp >= startDate && timestamp <= endDate
      })
    }

    allRecords.sort((left: any, right: any) => Number(right.timestamp || 0) - Number(left.timestamp || 0))
    records.value = allRecords
  } catch (error) {
    console.error('加载训练记录失败:', error)
    records.value = []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadStudents()
  loadRecords()
})

watch(
  () => [props.entryCode, props.studentId],
  async () => {
    selectedStudentId.value = props.studentId || undefined
    await loadStudents()
    loadRecords()
  },
)
</script>

<style scoped>
.task-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 9px;
  border-radius: 999px;
  border: 0.5px solid #b5d4f4;
  background: #e6f1fb;
  color: #0c447c;
  font-size: 11px;
  line-height: 1.5;
}

.task-badge--entry {
  border-color: #d2dae6;
  background: #f5f7fa;
  color: #4b5563;
}

.time-text {
  color: var(--color-text-secondary, #606266);
  font-size: 12px;
  white-space: nowrap;
}

.accuracy-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.accuracy-track {
  flex: 1;
  min-width: 0;
  height: 5px;
  border-radius: 999px;
  background: #ebeef5;
  overflow: hidden;
}

.accuracy-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.22s ease;
}

.accuracy-value {
  color: #303133;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.metric-empty {
  color: #909399;
  font-size: 12px;
}

/* 筛选工具栏：宽屏下合并为单行（学生 / 日期范围 / 全部·本周·本月 / 刷新 / 导出 Excel） */
@media (min-width: 820px) {
  .records-filter-section .filter-toolbar,
  .records-filter-section .filter-toolbar__controls,
  .records-filter-section .date-filter-group,
  .records-filter-section .quick-range-list {
    flex-wrap: nowrap;
  }

  .records-filter-section .filter-toolbar {
    gap: 10px;
  }

  .records-filter-section .filter-toolbar__controls {
    gap: 8px;
  }

  .records-filter-section .date-filter-group {
    gap: 8px;
  }

  .records-filter-section .scgp-field-control--student {
    flex: 0 1 150px;
    min-width: 112px;
  }

  .records-filter-section .scgp-date-range {
    flex: 0 1 232px;
    min-width: 196px;
  }

  .records-filter-section .scgp-refresh-button {
    margin-left: 0;
    flex: 0 0 auto;
  }
}
</style>
