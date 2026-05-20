<template>
  <div class="page-container scgp-admin-page">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/equipment/menu' }">器材训练</el-breadcrumb-item>
        <el-breadcrumb-item>器材训练记录</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>器材训练记录</h1>
        <p class="subtitle">
          <span v-if="currentEntry">当前入口：{{ currentEntry.name }}</span>
          <span v-else>查看学生在各训练入口下的器材训练历史与表现</span>
        </p>
      </div>
      <div class="header-right">
        <div class="module-switcher scgp-switcher scgp-switcher--success">
          <el-icon class="switcher-icon scgp-switcher__icon"><Switch /></el-icon>
          <span class="switcher-label scgp-switcher__label">训练入口</span>
          <el-select
            v-model="selectedEntryCode"
            size="default"
            class="module-select scgp-switcher__select scgp-switcher__select--wide"
            @change="handleEntryChange"
          >
            <el-option label="全部入口" value="" />
            <el-option
              v-for="entry in availableEntries"
              :key="entry.code"
              :label="entry.name"
              :value="entry.code"
            />
          </el-select>
        </div>
        <el-button type="success" :icon="Document" @click="exportAllIEP" :disabled="!canExport">
          导出报告
        </el-button>
        <el-button type="primary" :icon="Plus" @click="goToQuickEntry" :disabled="!canCreateRecord">
          新增记录
        </el-button>
        <el-button :icon="ArrowLeft" @click="goBack">
          返回
        </el-button>
      </div>
    </div>

    <div class="filter-section scgp-filter-surface scgp-toolbar-panel">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select
            v-model="studentId"
            placeholder="选择学生"
            clearable
            filterable
            style="width: 100%"
            @change="handleStudentChange"
          >
            <el-option
              v-for="student in validStudents"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select
            v-model="filters.category"
            placeholder="选择分类"
            :disabled="!studentId"
            style="width: 100%"
          >
            <el-option label="全部分类" value="" />
            <el-option
              v-for="category in categoryOptions"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            v-bind="standardDateRangePickerProps"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :disabled="!studentId"
            style="width: 100%"
          />
        </el-col>
        <el-col :span="5" class="filter-actions">
          <el-tag v-if="studentInfo" type="info" effect="plain">
            当前学生：{{ studentInfo.name }}
          </el-tag>
          <el-button :icon="Refresh" @click="resetFilters" :disabled="!studentId">重置筛选</el-button>
        </el-col>
      </el-row>
    </div>

    <div v-if="!studentId" class="empty-student scgp-empty-panel">
      <el-empty class="scgp-empty-state" description="请先选择学生查看训练记录" :image-size="200">
        <template #image>
          <el-icon :size="120" color="#c0c4cc"><User /></el-icon>
        </template>
      </el-empty>
    </div>

    <div v-else v-loading="loading" class="records-list scgp-page-panel">
      <el-card
        v-for="record in records"
        :id="`equipment-record-${record.id}`"
        :key="record.id"
        :class="['record-card', { 'record-card--highlighted': record.id === highlightedRecordId }]"
        shadow="hover"
      >
        <div class="record-header">
          <div class="equipment-info">
            <img :src="getEquipmentImage(record)" :alt="record.equipment_name" class="equipment-icon" />
            <div>
              <div class="equipment-name">{{ record.equipment_name }}</div>
              <div class="equipment-meta">
                <el-tag size="small" :type="getCategoryTagType(record.category)">
                  {{ getCategoryLabel(record) }}
                </el-tag>
                <el-tag
                  v-if="!selectedEntryCode"
                  size="small"
                  effect="plain"
                  :type="getRecordEntryTagType(record)"
                >
                  {{ getRecordEntryLabel(record) }}
                </el-tag>
                <span class="record-date">{{ formatDate(record.training_date) }}</span>
              </div>
            </div>
          </div>
          <div class="score-display">
            <el-rate
              :model-value="record.score"
              disabled
              show-score
              :colors="['#f56c6c', '#e6a23c', '#67c23a']"
            />
            <div class="prompt-level">{{ getPromptLevelLabel(record.prompt_level) }}</div>
          </div>
        </div>

        <div v-if="record.notes" class="record-notes">
          <el-icon><Document /></el-icon>
          <span>{{ record.notes }}</span>
        </div>

        <div class="record-actions">
          <el-button
            v-if="!selectedEntryCode && resolveRecordEntryCode(record)"
            text
            type="success"
            @click="jumpToRecordEntry(record)"
          >
            按该入口查看
          </el-button>
          <el-button text type="primary" :icon="Document" @click="viewIEP(record)">
            查看评语
          </el-button>
          <el-button text type="danger" :icon="Delete" @click="deleteRecord(record)">
            删除
          </el-button>
        </div>
      </el-card>

      <el-empty
        v-if="!loading && records.length === 0"
        class="scgp-empty-state"
        description="暂无训练记录"
        :image-size="200"
      >
        <el-button type="primary" @click="goToQuickEntry" :disabled="!canCreateRecord">新增记录</el-button>
      </el-empty>
    </div>

    <el-dialog
      v-model="iepDialogVisible"
      title="IEP 训练评语"
      width="600px"
    >
      <div v-loading="generatingIEP" class="iep-content">
        <div class="iep-section">
          <h4>表现评估</h4>
          <p>{{ currentIEP.performance }}</p>
        </div>
        <div class="iep-section">
          <h4>训练建议</h4>
          <ul>
            <li v-for="suggestion in currentIEP.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
        <el-divider />
        <div class="iep-section">
          <h4>完整评语</h4>
          <p class="full-comment">{{ currentIEP.generatedComment }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="iepDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportIEP">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Delete, Document, Plus, Refresh, Switch, User } from '@element-plus/icons-vue'
import type { EquipmentCategory, EquipmentTrainingRecordWithEquipment } from '@/types/equipment'
import { EquipmentTrainingAPI, StudentAPI } from '@/database/api'
import { IEPGenerator } from '@/utils/iep-generator'
import { exportEquipmentIEPToWord, type EquipmentIEPExportData } from '@/utils/docxExporter'
import { getEquipmentImageUrl } from '@/assets/images/equipment/images'
import { useAuthStore } from '@/stores/auth'
import { STANDARD_DATE_RANGE_PICKER_PROPS } from '@/utils/date-picker'
import {
  getAllEquipmentTrainingEntries,
  getEquipmentTrainingEntry,
  resolveEquipmentTrainingEntryRouteCode,
  type EquipmentTrainingEntryCode,
} from '@/utils/equipment-training-entry'
import {
  resolveEquipmentSourceCategory,
  sortEquipmentSourceCategoryKeys,
} from '@/utils/physical-equipment-source-category'

interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
}

type EquipmentRecordItem = EquipmentTrainingRecordWithEquipment & {
  entry_code?: string | null
  module_code?: string | null
  equipment_meta?: string | null
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const standardDateRangePickerProps = STANDARD_DATE_RANGE_PICKER_PROPS

const studentId = ref<number | null>(null)
const selectedEntryCode = ref<EquipmentTrainingEntryCode | ''>('')
const highlightedRecordId = ref<number | null>(null)
const students = ref<Student[]>([])
const studentInfo = ref<Student | null>(null)
const loading = ref(false)
const allRecords = ref<EquipmentRecordItem[]>([])

const filters = reactive({
  category: '',
  dateRange: null as [string, string] | null,
})

const iepDialogVisible = ref(false)
const generatingIEP = ref(false)
const currentIEP = ref<any>(null)

const validStudents = computed(() => {
  return students.value.filter((student) =>
    student &&
    typeof student === 'object' &&
    student.id != null &&
    student.name,
  )
})

const availableEntries = computed(() => {
  return getAllEquipmentTrainingEntries().filter((entry) =>
    authStore.hasEntitlementAccess(entry.requiredEntitlement)
  )
})

const currentEntry = computed(() => {
  return selectedEntryCode.value ? getEquipmentTrainingEntry(selectedEntryCode.value) : null
})

const categoryOptions = computed(() => {
  const categories = allRecords.value.map((record) => getCategoryLabel(record))
  return sortEquipmentSourceCategoryKeys(Array.from(new Set(categories.filter(Boolean))))
})

const records = computed(() => {
  let filtered = [...allRecords.value]

  if (filters.category) {
    filtered = filtered.filter((record) => getCategoryLabel(record) === filters.category)
  }

  return filtered.sort((left, right) =>
    new Date(right.training_date).getTime() - new Date(left.training_date).getTime(),
  )
})

const canCreateRecord = computed(() => {
  return Boolean(studentId.value && selectedEntryCode.value && currentEntry.value)
})

const canExport = computed(() => {
  return Boolean(studentId.value && records.value.length > 0)
})

function parseRouteStudentId(): number | null {
  const value = route.params.studentId
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

function parseRouteEntryCode(): EquipmentTrainingEntryCode | '' {
  return resolveEquipmentTrainingEntryRouteCode(route.query.entry, route.query.module) || ''
}

function parseRouteRecordId(): number | null {
  const value = route.query.recordId
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

function buildRouteLocation(
  nextStudentId: number | null = studentId.value,
  nextEntryCode: EquipmentTrainingEntryCode | '' = selectedEntryCode.value,
  nextRecordId: number | null = null,
) {
  const query: Record<string, string> = {}

  if (nextEntryCode) {
    query.entry = nextEntryCode
    query.module = getEquipmentTrainingEntry(nextEntryCode).moduleCode
  }

  if (nextRecordId) {
    query.recordId = String(nextRecordId)
  }

  return {
    name: 'EquipmentRecords',
    params: nextStudentId ? { studentId: nextStudentId } : {},
    query,
  }
}

function resolveRecordEntryCode(record: Pick<EquipmentRecordItem, 'entry_code'>): EquipmentTrainingEntryCode | null {
  if (typeof record.entry_code !== 'string') {
    return null
  }

  return resolveEquipmentTrainingEntryRouteCode(record.entry_code, undefined)
}

function getRecordEntryLabel(record: EquipmentRecordItem): string {
  const entryCode = resolveRecordEntryCode(record)
  return entryCode ? getEquipmentTrainingEntry(entryCode).name : '未标记入口'
}

function getRecordEntryTagType(record: EquipmentRecordItem): '' | 'success' | 'warning' | 'primary' | 'info' {
  const entryCode = resolveRecordEntryCode(record)
  if (!entryCode) {
    return 'info'
  }

  const moduleCode = getEquipmentTrainingEntry(entryCode).moduleCode
  if (moduleCode === 'sensory') return 'success'
  if (moduleCode === 'emotional') return 'warning'
  if (moduleCode === 'social') return 'primary'
  return 'info'
}

function ensureArray(value: unknown): string[] {
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function getCategoryLabel(record: Pick<EquipmentRecordItem, 'category' | 'equipment_meta'>): string {
  let metadata: Record<string, any> | undefined
  if (record.equipment_meta) {
    try {
      metadata = JSON.parse(record.equipment_meta)
    } catch {
      metadata = undefined
    }
  }

  return resolveEquipmentSourceCategory({
    category: record.category,
    metadata,
  })
}

function getCategoryTagType(category: string): '' | 'danger' | 'success' | 'primary' | 'warning' | 'info' {
  const types: Record<string, '' | 'danger' | 'success' | 'primary' | 'warning' | 'info'> = {
    tactile: 'danger',
    olfactory: 'success',
    visual: 'primary',
    auditory: 'warning',
    gustatory: 'info',
    proprioceptive: '',
    integration: 'success',
  }
  return types[category] || 'info'
}

function getPromptLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    1: '独立完成',
    2: '口头提示',
    3: '视觉提示',
    4: '手触引导',
    5: '身体辅助',
  }
  return labels[level] || ''
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEquipmentImage(record: EquipmentRecordItem): string {
  const id = record.legacy_id || record.equipment_id
  return getEquipmentImageUrl(record.category as EquipmentCategory, id, record.equipment_name)
}

function toEquipmentCatalog(record: EquipmentRecordItem) {
  return {
    id: record.equipment_id,
    name: record.equipment_name,
    category: record.category,
    sub_category: record.sub_category,
    description: record.description || '',
    ability_tags: ensureArray(record.ability_tags),
    image_url: getEquipmentImage(record),
    is_active: 1,
    created_at: record.created_at || record.training_date,
  }
}

async function loadStudents() {
  try {
    const api = new StudentAPI()
    students.value = await api.getAllStudents()
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

async function loadStudentInfo() {
  if (!studentId.value) {
    studentInfo.value = null
    return
  }

  try {
    const api = new StudentAPI()
    studentInfo.value = await api.getStudentById(studentId.value)
  } catch (error) {
    console.error('加载学生信息失败:', error)
    studentInfo.value = null
  }
}

async function focusHighlightedRecord() {
  if (!highlightedRecordId.value) {
    return
  }

  if (!records.value.some((record) => record.id === highlightedRecordId.value)) {
    return
  }

  await nextTick()
  const element = document.getElementById(`equipment-record-${highlightedRecordId.value}`)
  if (!element) {
    return
  }

  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function loadRecords() {
  if (!studentId.value) {
    allRecords.value = []
    return
  }

  loading.value = true
  try {
    const api = new EquipmentTrainingAPI()
    const data = api.getStudentRecords(studentId.value, {
      start_date: filters.dateRange?.[0],
      end_date: filters.dateRange?.[1],
      entry_code: selectedEntryCode.value || undefined,
    })

    allRecords.value = data.map((record) => ({
      ...record,
      ability_tags: ensureArray(record.ability_tags),
    }))

    await focusHighlightedRecord()
  } catch (error: any) {
    console.error('加载记录失败:', error)
    ElMessage.error('加载记录失败：' + error.message)
  } finally {
    loading.value = false
  }
}

function handleStudentChange(newStudentId: number | null) {
  highlightedRecordId.value = null
  router.replace(buildRouteLocation(newStudentId, selectedEntryCode.value, null))
}

function handleEntryChange(newEntryCode: EquipmentTrainingEntryCode | '') {
  highlightedRecordId.value = null
  router.replace(buildRouteLocation(studentId.value, newEntryCode, null))
}

function resetFilters() {
  filters.category = ''
  filters.dateRange = null
  loadRecords()
}

function jumpToRecordEntry(record: EquipmentRecordItem) {
  const entryCode = resolveRecordEntryCode(record)
  if (!entryCode) {
    return
  }

  router.replace(buildRouteLocation(studentId.value, entryCode, record.id))
}

async function viewIEP(record: EquipmentRecordItem) {
  generatingIEP.value = true
  iepDialogVisible.value = true
  currentIEP.value = null

  try {
    currentIEP.value = IEPGenerator.generateEquipmentReport({
      studentName: record.student_name || studentInfo.value?.name || '学生',
      equipment: toEquipmentCatalog(record),
      score: record.score,
      promptLevel: record.prompt_level,
      duration_seconds: record.duration_seconds,
      training_date: record.training_date,
      notes: record.notes,
    })
  } catch (error: any) {
    ElMessage.error('生成评语失败：' + error.message)
    currentIEP.value = {
      performance: '生成评语时出错',
      suggestions: [],
      generatedComment: '暂时无法生成评语，请稍后重试',
    }
  } finally {
    generatingIEP.value = false
  }
}

async function exportAllIEP() {
  if (records.value.length === 0) {
    ElMessage.warning('暂无记录可导出')
    return
  }

  if (!studentInfo.value) {
    ElMessage.warning('学生信息加载中，请稍后重试')
    return
  }

  try {
    ElMessage.info('正在生成报告...')

    const categoryBreakdown: Record<string, number> = {}
    records.value.forEach((record) => {
      const category = getCategoryLabel(record)
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1
    })

    const totalScore = records.value.reduce((sum, record) => sum + record.score, 0)
    const averageScore = records.value.length > 0 ? totalScore / records.value.length : 0

    const calculateAge = (birthday: string) => {
      if (!birthday) return 0
      const birth = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age -= 1
      }
      return age
    }

    const exportData: EquipmentIEPExportData = {
      student: {
        name: studentInfo.value.name,
        gender: studentInfo.value.gender === '男' ? '男' : '女',
        age: calculateAge(studentInfo.value.birthday),
        birthday: studentInfo.value.birthday,
      },
      reportDate: new Date().toLocaleDateString('zh-CN'),
      records: records.value.map((record) => {
        const report = IEPGenerator.generateEquipmentReport({
          studentName: record.student_name || studentInfo.value?.name || '学生',
          equipment: toEquipmentCatalog(record),
          score: record.score,
          promptLevel: record.prompt_level,
          duration_seconds: record.duration_seconds,
          training_date: record.training_date,
          notes: record.notes,
        })

        return {
          equipmentName: record.equipment_name,
          categoryName: getCategoryLabel(record),
          score: record.score,
          promptLevel: getPromptLevelLabel(record.prompt_level),
          trainingDate: new Date(record.training_date).toLocaleDateString('zh-CN'),
          notes: record.notes,
          performance: report.performance,
          suggestions: report.suggestions,
        }
      }),
      summary: {
        totalRecords: records.value.length,
        categoryBreakdown,
        averageScore,
      },
    }

    const entrySuffix = currentEntry.value ? `_${currentEntry.value.name}` : ''
    const filename = `${studentInfo.value.name}${entrySuffix}_器材训练IEP报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`

    await exportEquipmentIEPToWord(exportData, filename)
    ElMessage.success('报告导出成功')
  } catch (error: any) {
    ElMessage.error('导出失败：' + error.message)
  }
}

async function exportIEP() {
  if (!currentIEP.value || !studentInfo.value) {
    ElMessage.warning('请先选择一条记录查看评语')
    return
  }

  await exportAllIEP()
  iepDialogVisible.value = false
}

async function deleteRecord(record: EquipmentRecordItem) {
  try {
    await ElMessageBox.confirm('确定要删除这条训练记录吗？', '提示', {
      type: 'warning',
    })

    const api = new EquipmentTrainingAPI()
    api.deleteRecord(record.id)
    ElMessage.success('删除成功')
    await loadRecords()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

function goToQuickEntry() {
  if (!studentId.value || !selectedEntryCode.value) {
    ElMessage.warning('请先选择学生和训练入口')
    return
  }

  const entry = getEquipmentTrainingEntry(selectedEntryCode.value)
  router.push({
    path: `/equipment/quick-entry/${studentId.value}`,
    query: {
      entry: selectedEntryCode.value,
      module: entry.moduleCode,
    },
  })
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push('/equipment/menu')
}

async function syncFromRoute() {
  studentId.value = parseRouteStudentId()
  selectedEntryCode.value = parseRouteEntryCode()
  highlightedRecordId.value = parseRouteRecordId()

  await loadStudentInfo()
  await loadRecords()
}

onMounted(async () => {
  await loadStudents()
  await syncFromRoute()
})

watch(
  () => [route.params.studentId, route.query.entry, route.query.module, route.query.recordId],
  async () => {
    await syncFromRoute()
  },
)

watch(
  () => filters.dateRange,
  () => {
    loadRecords()
  },
)
</script>

<style scoped>
.filter-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.records-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.record-card {
  border-radius: 12px;
  border: 1px solid transparent;
}

.record-card--highlighted {
  border-color: #67c23a;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.18);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.equipment-info {
  display: flex;
  gap: 12px;
  flex: 1;
}

.equipment-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  background: #f5f7fa;
}

.equipment-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
}

.equipment-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.record-date {
  white-space: nowrap;
}

.score-display {
  min-width: 180px;
  text-align: right;
}

.prompt-level {
  font-size: 12px;
  color: #67c23a;
  margin-top: 4px;
}

.record-notes {
  display: flex;
  gap: 8px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
}

.iep-content h4 {
  color: #303133;
  margin-bottom: 8px;
}

.iep-section {
  margin-bottom: 20px;
}

.iep-section p {
  color: #606266;
  line-height: 1.8;
}

.iep-section ul {
  list-style: none;
  padding: 0;
}

.iep-section ul li {
  color: #606266;
  line-height: 1.8;
  padding-left: 20px;
  position: relative;
}

.iep-section ul li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: #409eff;
}

.full-comment {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  line-height: 1.8;
}

</style>
