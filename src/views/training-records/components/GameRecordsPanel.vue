<template>
  <div class="records-panel">
    <section class="stats-row" aria-label="游戏训练记录统计概览">
      <article class="summary-card">
        <div class="summary-card__label">总记录数</div>
        <div class="summary-card__value">{{ records.length }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">平均正确率</div>
        <div class="summary-card__value">{{ avgAccuracyDisplay }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">平均响应时间</div>
        <div class="summary-card__value">{{ avgResponseTimeDisplay }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">总训练时长</div>
        <div class="summary-card__value">{{ totalDuration }}</div>
      </article>
    </section>

    <div class="filter-section records-filter-section">
      <div class="filter-toolbar">
        <div class="filter-toolbar__controls">
          <el-select
            v-model="selectedStudentId"
            size="small"
            placeholder="选择学生"
            clearable
            filterable
            class="student-filter"
            @change="loadRecords"
          >
            <el-option
              v-for="student in students"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>

          <div class="date-filter-group">
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
              class="date-range-filter"
              @change="handleDateRangeChange"
            />

            <div class="filter-toolbar__divider" aria-hidden="true" />

            <div class="quick-range-list" role="tablist" aria-label="日期快捷筛选">
              <button
                v-for="preset in QUICK_RANGE_OPTIONS"
                :key="preset.key"
                type="button"
                class="range-pill"
                :class="{ 'is-active': activeDatePreset === preset.key }"
                @click="applyQuickRange(preset.key)"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>

        <el-button class="refresh-button" size="small" :icon="Refresh" @click="loadRecords">
          刷新
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="records"
      stripe
      class="records-table"
      style="width: 100%"
      max-height="500"
      empty-text=""
    >
      <el-table-column prop="student_name" label="学生姓名" width="116" />

      <el-table-column label="任务名称" min-width="170">
        <template #default="{ row }">
          <span class="task-badge">{{ getTaskLabel(row) }}</span>
        </template>
      </el-table-column>

      <el-table-column v-if="isEmotionalEntry" label="状态" width="100">
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
          <div class="accuracy-cell">
            <div class="accuracy-track" aria-hidden="true">
              <div
                class="accuracy-fill"
                :style="{
                  width: `${getAccuracyPercent(row.accuracy_rate)}%`,
                  background: getAccuracyColor(getAccuracyPercent(row.accuracy_rate)),
                }"
              />
            </div>
            <span class="accuracy-value">{{ getAccuracyPercent(row.accuracy_rate) }}%</span>
          </div>
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
          <button type="button" class="detail-pill-button" @click="emit('view-detail', row)">
            查看详情
          </button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && records.length === 0"
      :description="isEmotionalEntry ? '暂无情绪训练记录' : '暂无游戏训练记录'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { EmotionalTrainingAPI } from '@/database/emotional-api'
import { GameTrainingAPI, StudentAPI } from '@/database/api'
import { STANDARD_DATE_RANGE_PICKER_PROPS } from '@/utils/date-picker'
import { getTrainingEntry, type TrainingEntryCode } from '@/utils/training-entry'

interface Props {
  entryCode: TrainingEntryCode
}

type QuickRangeKey = 'all' | 'week' | 'month' | ''

const QUICK_RANGE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
] as const satisfies ReadonlyArray<{ key: Exclude<QuickRangeKey, ''>; label: string }>

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'view-detail', record: any): void
}>()

const loading = ref(false)
const records = ref<any[]>([])
const students = ref<any[]>([])
const selectedStudentId = ref<number | undefined>()
const dateRange = ref<[string, string] | null>(null)
const activeDatePreset = ref<QuickRangeKey>('all')
const standardDateRangePickerProps = STANDARD_DATE_RANGE_PICKER_PROPS
const currentEntry = computed(() => getTrainingEntry(props.entryCode))
const isEmotionalEntry = computed(() => currentEntry.value.moduleCode === 'emotional')

const avgAccuracy = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, record) => acc + Number(record.accuracy_rate || 0), 0)
  return Math.round((sum / records.value.length) * 100)
})

const avgAccuracyDisplay = computed(() => (records.value.length > 0 ? `${avgAccuracy.value}%` : '—'))

const avgResponseTime = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, record) => acc + Number(record.avg_response_time || 0), 0)
  return Math.round(sum / records.value.length)
})

const avgResponseTimeDisplay = computed(() => (records.value.length > 0 ? formatResponseTime(avgResponseTime.value) : '—'))

const totalDuration = computed(() => {
  const total = records.value.reduce((acc, record) => acc + Number(record.duration || 0), 0)
  return formatDuration(total)
})

const getTaskLabel = (row: any) => {
  if (!isEmotionalEntry.value) {
    return row.task_name || `任务${row.task_id}`
  }

  if (row.session_type === 'emotion_scene') {
    return row.task_name || '情绪与场景'
  }

  if (row.session_type === 'care_scene') {
    return row.task_name || '表达关心'
  }

  return row.task_name || '情绪训练'
}

const getCompletionStatusLabel = (status?: string) => {
  if (status === 'cancelled') return '已取消'
  if (status === 'interrupted') return '已中断'
  return '已完成'
}

const getCompletionStatusType = (status?: string) => {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'info'
  return 'warning'
}

const formatResponseTime = (ms: number): string => {
  const safeMs = Number(ms || 0)
  if (safeMs < 1000) {
    return `${safeMs}ms`
  }

  return `${(safeMs / 1000).toFixed(1)}秒`
}

const formatDateTimeToMinute = (value: number | string | Date | null | undefined) => {
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

const formatDuration = (ms: number) => {
  const safeMs = Math.max(0, Number(ms || 0))
  const seconds = Math.floor(safeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }

  return `${remainingSeconds}秒`
}

const getAccuracyPercent = (rate: number) => {
  const percent = Math.round(Number(rate || 0) * 100)
  return Math.max(0, Math.min(100, percent))
}

const getAccuracyColor = (percent: number) => {
  if (percent >= 90) return '#1D9E75'
  if (percent >= 70) return '#BA7517'
  return '#E24B4A'
}

const formatDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getCurrentWeekRange = (): [string, string] => {
  const today = new Date()
  const day = today.getDay() === 0 ? 7 : today.getDay()
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  start.setDate(today.getDate() - day + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [formatDateString(start), formatDateString(end)]
}

const getCurrentMonthRange = (): [string, string] => {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return [formatDateString(start), formatDateString(end)]
}

const getPresetRange = (preset: Exclude<QuickRangeKey, ''>) => {
  if (preset === 'all') return null
  if (preset === 'week') return getCurrentWeekRange()
  return getCurrentMonthRange()
}

const matchesRange = (source: [string, string] | null, target: [string, string]) => {
  return Boolean(source && source[0] === target[0] && source[1] === target[1])
}

const resolveActiveDatePreset = (range: [string, string] | null): QuickRangeKey => {
  if (!range?.[0] || !range?.[1]) return 'all'
  if (matchesRange(range, getCurrentWeekRange())) return 'week'
  if (matchesRange(range, getCurrentMonthRange())) return 'month'
  return ''
}

const applyQuickRange = (preset: Exclude<QuickRangeKey, ''>) => {
  activeDatePreset.value = preset
  dateRange.value = getPresetRange(preset)
  loadRecords()
}

const handleDateRangeChange = (value: [string, string] | null) => {
  activeDatePreset.value = resolveActiveDatePreset(value)
  loadRecords()
}

const loadStudents = async () => {
  try {
    const api = new StudentAPI()
    students.value = await api.getAllStudents()
  } catch (error) {
    console.error('加载学生列表失败:', error)
  }
}

const loadRecords = () => {
  loading.value = true

  try {
    const api = new GameTrainingAPI()
    const emotionalApi = isEmotionalEntry.value ? new EmotionalTrainingAPI() : null
    let allRecords: any[] = []

    if (!selectedStudentId.value) {
      for (const student of students.value) {
        const studentRecords = api.getStudentTrainingRecords(student.id, undefined, undefined, props.entryCode)
        allRecords.push(
          ...studentRecords.map((record: any) => ({
            ...record,
            student_name: student.name,
          })),
        )
      }
    } else {
      allRecords = api.getStudentTrainingRecords(selectedStudentId.value, undefined, undefined, props.entryCode)
      const student = students.value.find(item => item.id === selectedStudentId.value)
      allRecords = allRecords.map((record: any) => ({
        ...record,
        student_name: student?.name || '未知',
      }))
    }

    if (emotionalApi) {
      allRecords = allRecords.map((record: any) => {
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
      allRecords = allRecords.filter((record: any) => record.timestamp >= startDate && record.timestamp <= endDate)
    }

    allRecords.sort((left: any, right: any) => right.timestamp - left.timestamp)
    records.value = allRecords
  } catch (error) {
    console.error('加载记录失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadStudents()
  loadRecords()
})

watch(
  () => props.entryCode,
  () => {
    loadRecords()
  },
)
</script>

<style scoped>
.records-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px 14px;
  border: none;
  border-radius: var(--border-radius-md, 8px);
  background: var(--color-background-secondary, #ffffff);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
  min-height: 90px;
}

.summary-card__label {
  color: var(--color-text-secondary, #606266);
  font-size: 13px;
}

.summary-card__value {
  color: var(--color-text-primary, #303133);
  font-size: clamp(24px, 2.2vw, 34px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.records-filter-section {
  margin-bottom: 0;
  padding: 14px 16px;
  background: var(--color-background-secondary, #ffffff);
  box-shadow: none;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-toolbar__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.student-filter {
  width: 164px;
  flex: 0 0 auto;
}

.date-filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.filter-toolbar__divider {
  width: 1px;
  height: 32px;
  background: #dcdfe6;
  flex-shrink: 0;
}

.quick-range-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.range-pill {
  border: 1px solid rgba(220, 223, 230, 0.9);
  background: rgba(255, 255, 255, 0.88);
  color: #606266;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.22s ease;
}

.range-pill:hover {
  color: #303133;
  border-color: #afcfff;
  transform: translateY(-1px);
}

.range-pill.is-active {
  color: #2f74d0;
  border-color: #66a8ff;
  background: #eef5ff;
  box-shadow: 0 10px 20px rgba(102, 168, 255, 0.12);
}

.refresh-button {
  margin-left: auto;
  border: 0.5px solid var(--color-border-secondary, #dcdfe6);
  background: var(--color-background-primary, #ffffff);
  color: var(--color-text-secondary, #606266);
  border-radius: 999px;
  padding-inline: 14px;
}

.refresh-button:hover {
  border-color: #afcfff;
  color: #2f74d0;
  background: #eef5ff;
}

.student-filter :deep(.el-input__wrapper),
.date-range-filter :deep(.el-input__wrapper),
.date-range-filter :deep(.el-range-editor.el-input__wrapper) {
  min-height: 34px;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(220, 223, 230, 0.9) inset;
}

.date-range-filter {
  width: 252px;
}

.date-range-filter :deep(.el-range-input) {
  width: 100px;
  font-size: 13px;
}

.records-table :deep(.el-table__header th) {
  background: #fbfcfe;
  color: #606266;
  font-weight: 600;
}

.records-table :deep(.el-table__body td) {
  padding-top: 14px;
  padding-bottom: 14px;
}

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

.detail-pill-button {
  border: 0.5px solid #b5d4f4;
  background: #e6f1fb;
  color: #185fa5;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.detail-pill-button:hover {
  background: #dcebf9;
  border-color: #98c0ea;
  color: #0c447c;
}

@media (max-width: 1100px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .filter-toolbar {
    align-items: stretch;
  }

  .filter-toolbar__controls {
    width: 100%;
  }

  .student-filter,
  .date-range-filter {
    width: 100%;
  }

  .date-filter-group {
    width: 100%;
  }

  .filter-toolbar__divider {
    display: none;
  }

  .refresh-button {
    margin-left: 0;
    width: 100%;
  }
}
</style>
