<template>
  <div class="records-panel">
    <section class="stats-row" aria-label="评估记录统计概览">
      <article class="summary-card">
        <div class="summary-card__label">总评估数</div>
        <div class="summary-card__value">{{ records.length }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">涉及量表</div>
        <div class="summary-card__value">{{ scaleCount }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">最近评估</div>
        <div class="summary-card__value summary-card__value--compact">{{ latestAssessmentDisplay }}</div>
      </article>
    </section>

    <el-table
      v-loading="loading"
      :data="records"
      stripe
      class="records-table"
      style="width: 100%"
      :max-height="tableMaxHeightValue"
      empty-text=""
    >
      <el-table-column label="量表" min-width="148">
        <template #default="{ row }">
          <span class="scale-badge">{{ row.scaleLabel }}</span>
        </template>
      </el-table-column>

      <el-table-column label="评估时间" width="156">
        <template #default="{ row }">
          <span class="time-text">{{ formatDateTimeToMinute(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="关键信息" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="score-text">{{ row.scoreText }}</span>
        </template>
      </el-table-column>

      <el-table-column label="结论" width="110">
        <template #default="{ row }">
          <span class="level-text">{{ row.levelText }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="108" fixed="right">
        <template #default="{ row }">
          <button type="button" class="detail-pill-button" @click="viewReport(row)">
            查看报告
          </button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && records.length === 0" description="暂无评估记录" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { buildAssessmentReportRoute, getStudentAssessmentRecords, type StudentAssessmentRecord } from '../assessment-records'

interface Props {
  studentId: number
  tableMaxHeight?: number | string
}

const props = defineProps<Props>()

const router = useRouter()

const loading = ref(false)
const records = ref<StudentAssessmentRecord[]>([])

const tableMaxHeightValue = computed(() => props.tableMaxHeight ?? 520)
const scaleCount = computed(() => new Set(records.value.map((record) => record.scaleType)).size)
const latestAssessmentDisplay = computed(() => {
  const latestRecord = records.value[0]
  if (!latestRecord?.createdAt) return '-'
  return formatDateTimeToMinute(latestRecord.createdAt)
})

function formatDateTimeToMinute(value: string | Date | null | undefined) {
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

function loadRecords() {
  loading.value = true

  try {
    records.value = getStudentAssessmentRecords(props.studentId)
  } finally {
    loading.value = false
  }
}

function viewReport(record: StudentAssessmentRecord) {
  router.push(buildAssessmentReportRoute(record))
}

watch(
  () => props.studentId,
  () => {
    loadRecords()
  },
  { immediate: true },
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.summary-card__value--compact {
  font-size: clamp(18px, 1.8vw, 24px);
  letter-spacing: normal;
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

.scale-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 9px;
  border-radius: 999px;
  border: 0.5px solid #d8c4ff;
  background: #f2eaff;
  color: #5a2c91;
  font-size: 11px;
  line-height: 1.5;
}

.time-text {
  color: var(--color-text-secondary, #606266);
  font-size: 12px;
  white-space: nowrap;
}

.score-text {
  color: var(--color-text-primary, #303133);
}

.level-text {
  color: #606266;
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
    grid-template-columns: 1fr;
  }
}
</style>
