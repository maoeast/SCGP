<template>
  <div class="records-panel scgp-records-stack">
    <section class="stats-row scgp-stats-grid" aria-label="器材训练记录统计概览">
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">总记录数</div>
        <div class="summary-card__value">{{ records.length }}</div>
      </article>
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">平均得分</div>
        <div class="summary-card__value">{{ avgScoreDisplay }}</div>
      </article>
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">总训练时长</div>
        <div class="summary-card__value">{{ totalDuration }}</div>
      </article>
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">涉及器材种数</div>
        <div class="summary-card__value">{{ equipmentCount }}</div>
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

          <el-select
            v-model="selectedCategory"
            size="small"
            placeholder="选择分类"
            clearable
            class="category-filter scgp-field-control scgp-field-control--category"
            @change="loadRecords"
          >
            <el-option
              v-for="category in categoryOptions"
              :key="category"
              :label="category"
              :value="category"
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
      <el-table-column v-if="showStudentColumn" prop="student_name" label="学生姓名" width="100" />

      <el-table-column v-if="showEntryColumn" label="训练入口" width="140">
        <template #default="{ row }">
          <el-tag size="small" effect="plain" type="info">
            {{ getEntryLabel(row) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="器材名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="equipment-cell">
            <span class="equipment-initial">{{ getEquipmentInitial(row.equipment_name) }}</span>
            <span class="equipment-name">{{ row.equipment_name }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="分类" width="92">
        <template #default="{ row }">
          <el-tag size="small" effect="plain" type="info">
            {{ getCategoryLabel(row) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="得分" width="114">
        <template #default="{ row }">
          <el-rate
            :model-value="Number(row.score || 0)"
            disabled
            :max="5"
            size="small"
            :colors="['#BA7517', '#BA7517', '#BA7517']"
            disabled-void-color="#E5E7EB"
          />
        </template>
      </el-table-column>

      <el-table-column label="提示等级" width="110">
        <template #default="{ row }">
          <span
            class="prompt-pill"
            :class="`prompt-pill--${getPromptLevelMeta(row.prompt_level).tone}`"
          >
            {{ getPromptLevelMeta(row.prompt_level).label }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="训练时长" width="100">
        <template #default="{ row }">
          {{ formatDuration(row.duration_seconds) }}
        </template>
      </el-table-column>

      <el-table-column label="训练日期" width="156">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTimeToMinute(row.training_date) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="评语" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.generated_comment" class="comment-text">{{ row.generated_comment }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="108" fixed="right">
        <template #default="{ row }">
          <button type="button" class="detail-pill-button scgp-detail-button" @click="emit('view-detail', row)">
            查看详情
          </button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && records.length === 0"
      class="scgp-empty-state"
      description="暂无器材训练记录"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { EquipmentTrainingAPI, StudentAPI } from '@/database/api'
import { STANDARD_DATE_RANGE_PICKER_PROPS } from '@/utils/date-picker'
import { resolveEquipmentSourceCategory } from '@/utils/physical-equipment-source-category'
import { getTrainingEntry, type TrainingEntryCode } from '@/utils/training-entry'
import { exportEquipmentRecordsExcel } from '../exportTrainingRecords'

interface Props {
  entryCode?: TrainingEntryCode
  studentId?: number
  hideStudentFilter?: boolean
  tableMaxHeight?: number | string
}

type QuickRangeKey = 'all' | 'week' | 'month' | ''
type PromptTone = 'independent' | 'verbal' | 'physical'

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
const selectedCategory = ref<string | undefined>()
const activeDatePreset = ref<QuickRangeKey>('all')
const categoryOptions = ref<string[]>([])
const standardDateRangePickerProps = STANDARD_DATE_RANGE_PICKER_PROPS

const isFixedStudentMode = computed(() => Number(props.studentId || 0) > 0)
const showStudentFilter = computed(() => !props.hideStudentFilter && !isFixedStudentMode.value)
const showStudentColumn = computed(() => !isFixedStudentMode.value)
const showEntryColumn = computed(() => !props.entryCode)
const tableMaxHeightValue = computed(() => props.tableMaxHeight)

const avgScore = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, record) => acc + Number(record.score || 0), 0)
  return sum / records.value.length
})

const avgScoreDisplay = computed(() => (records.value.length > 0 ? `${avgScore.value.toFixed(1)} 分` : '-'))

const totalDuration = computed(() => {
  const total = records.value.reduce((acc, record) => acc + Number(record.duration_seconds || 0), 0)
  return formatDuration(total)
})

const equipmentCount = computed(() => new Set(records.value.map((record) => record.equipment_id)).size)

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Number(seconds || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  if (minutes > 0) {
    return `${minutes}分 ${remainingSeconds}秒`
  }

  return `${remainingSeconds}秒`
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

function getCategoryLabel(record: any) {
  return resolveEquipmentSourceCategory({
    category: record.category,
    metadata: record.equipment_meta,
  })
}

function getEntryLabel(record: any) {
  return getTrainingEntry(record.entry_code, record.module_code).name
}

function getEquipmentInitial(equipmentName?: string) {
  const normalized = typeof equipmentName === 'string' ? equipmentName.trim() : ''
  return normalized ? normalized.charAt(0) : '器'
}

function getPromptLevelMeta(level: number): { label: string; tone: PromptTone } {
  const safeLevel = Number(level || 0)

  if (safeLevel <= 1) {
    return { label: '完全独立', tone: 'independent' }
  }

  if (safeLevel <= 3) {
    return { label: '语言提示', tone: 'verbal' }
  }

  return { label: '身体协助', tone: 'physical' }
}

function handleExportExcel() {
  if (!records.value.length) {
    ElMessage.warning('当前没有可导出的记录')
    return
  }

  const studentName = students.value.find((student) => student.id === selectedStudentId.value)?.name || ''
  try {
    exportEquipmentRecordsExcel(records.value, studentName)
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
    const api = new EquipmentTrainingAPI()
    let allRecords: any[] = []

    if (isFixedStudentMode.value && props.studentId) {
      allRecords = api.getStudentRecords(props.studentId, {
        start_date: dateRange.value?.[0],
        end_date: dateRange.value?.[1],
        entry_code: props.entryCode,
      })
    } else if (selectedStudentId.value) {
      const student = students.value.find((item) => item.id === selectedStudentId.value)
      const studentRecords = api.getStudentRecords(selectedStudentId.value, {
        start_date: dateRange.value?.[0],
        end_date: dateRange.value?.[1],
        entry_code: props.entryCode,
      })

      allRecords = studentRecords.map((record: any) => ({
        ...record,
        student_name: student?.name || '未知',
      }))
    } else {
      for (const student of students.value) {
        const studentRecords = api.getStudentRecords(student.id, {
          start_date: dateRange.value?.[0],
          end_date: dateRange.value?.[1],
          entry_code: props.entryCode,
        })

        allRecords.push(
          ...studentRecords.map((record: any) => ({
            ...record,
            student_name: student.name,
          })),
        )
      }
    }

    categoryOptions.value = Array.from(new Set(allRecords.map((record) => getCategoryLabel(record)))).sort((left, right) =>
      left.localeCompare(right, 'zh-Hans-CN'),
    )

    if (selectedCategory.value) {
      allRecords = allRecords.filter((record) => getCategoryLabel(record) === selectedCategory.value)
    }

    allRecords.sort((left: any, right: any) => {
      const rightTime = new Date(`${right.training_date} 23:59:59`).getTime()
      const leftTime = new Date(`${left.training_date} 23:59:59`).getTime()
      return rightTime - leftTime
    })

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
    selectedCategory.value = undefined
    await loadStudents()
    loadRecords()
  },
)
</script>

<style scoped>
.equipment-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.equipment-initial {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #e6f1fb;
  border: 0.5px solid #b5d4f4;
  color: #0c447c;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.equipment-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 0.5px solid transparent;
  font-size: 11px;
  line-height: 1.4;
}

.prompt-pill--independent {
  background: #e1f5ee;
  color: #085041;
  border-color: #9fe1cb;
}

.prompt-pill--verbal {
  background: #faeeda;
  color: #633806;
  border-color: #fac775;
}

.prompt-pill--physical {
  background: #fcebeb;
  color: #791f1f;
  border-color: #f7c1c1;
}

.time-text {
  color: var(--color-text-secondary, #606266);
  font-size: 12px;
  white-space: nowrap;
}

.comment-text {
  color: var(--color-text-primary, #303133);
}

/* 筛选工具栏：宽屏下合并为单行（学生 / 分类 / 日期范围 / 全部·本周·本月 / 刷新 / 导出 Excel） */
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

  .records-filter-section .scgp-field-control--student,
  .records-filter-section .scgp-field-control--category {
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
