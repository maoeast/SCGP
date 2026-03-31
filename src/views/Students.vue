<template>
  <div class="page-container student-management-page">
    <div class="page-header student-management-header">
      <div class="header-left">
        <h1>学生管理</h1>
        <p class="subtitle">管理学生档案、基本信息与评估记录 · 共 {{ filteredStudents.length }} 名学生</p>
      </div>
      <div class="header-right">
        <el-button @click="showImportModal = true">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button type="primary" @click="showAddModal = true">
          <el-icon><Plus /></el-icon>
          添加学生
        </el-button>
      </div>
    </div>

    <section class="filter-section student-filter-section">
      <div class="filter-toolbar">
        <div class="student-search">
          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="搜索学生姓名、学号、诊断类型..."
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="filter-toolbar__divider" aria-hidden="true" />

        <div class="gender-pill-list" role="tablist" aria-label="性别筛选">
          <button
            v-for="tab in genderTabs"
            :key="tab.value || 'all'"
            type="button"
            class="gender-pill"
            :class="{ 'is-active': filterGender === tab.value }"
            @click="setGenderFilter(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="filter-toolbar__divider" aria-hidden="true" />

        <div class="compact-selects">
          <el-select v-model="filterDiagnosis" class="compact-select" clearable placeholder="诊断类型">
            <el-option label="全部诊断" value="" />
            <el-option
              v-for="option in diagnosisOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <el-select v-model="filterClass" class="compact-select" clearable placeholder="所属班级">
            <el-option label="全部班级" value="" />
            <el-option
              v-for="cls in classOptions"
              :key="cls.id"
              :label="formatClassOptionLabel(cls)"
              :value="String(cls.id)"
            />
          </el-select>
        </div>
      </div>
    </section>

    <section class="stats-row" aria-label="学生统计概览">
      <article class="summary-card">
        <div class="summary-card__label">学生总数</div>
        <div class="summary-card__value">{{ summaryStats.total }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">已分班</div>
        <div class="summary-card__value">{{ summaryStats.assigned }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">未分班</div>
        <div class="summary-card__value">{{ summaryStats.unassigned }}</div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">本月新增</div>
        <div class="summary-card__value">{{ summaryStats.newThisMonth }}</div>
      </article>
    </section>

    <div class="main-content" v-loading="studentStore.loading">
      <div v-if="filteredStudents.length > 0" class="students-grid">
        <article v-for="student in filteredStudents" :key="student.id" class="student-card">
          <div class="student-card__top">
              <div class="student-card__identity">
              <StudentAvatar
                :name="student.name"
                :gender="student.gender"
                :avatar-url="student.avatar_path"
                size="md"
              />

              <div class="student-card__heading">
                <h3>{{ student.name }}</h3>
                <div class="student-card__meta">
                  <span>{{ student.gender }}</span>
                  <span>{{ getAge(student.birthday) }}岁</span>
                  <StudentId :id="student.student_no" />
                </div>
              </div>
            </div>

            <el-dropdown
              trigger="click"
              popper-class="student-card__menu-dropdown"
              @command="handleStudentMenuCommand(student, $event)"
            >
              <el-button class="student-card__menu-button" text circle @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" class="student-card__menu-item--danger">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="student-card__body">
            <div class="student-card__chip-row">
              <DiagnosisTag :type="student.disorder" />
            </div>

            <div class="student-card__info-row">
              <span
                class="student-class-badge"
                :class="student.current_class_id ? 'is-assigned' : 'is-unassigned'"
              >
                {{ student.current_class_name || '未分班' }}
              </span>
              <span class="student-created-at">创建于 {{ formatDate(student.created_at) }}</span>
            </div>
          </div>

          <div class="student-card__footer">
            <span class="student-card__supporting">完整学号在详情页展示</span>
            <router-link :to="`/students/${student.id}`" class="student-primary-action">
              查看详情
            </router-link>
          </div>
        </article>
      </div>

      <div v-else class="students-empty-state">
        <el-empty description="当前筛选条件下暂无学生" />
      </div>
    </div>

    <AddStudentDialog
      v-if="showAddModal"
      :editing-student="editingStudent || undefined"
      @close="closeModal"
      @saved="handleStudentSaved"
    />

    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>批量导入学生</h2>
          <button class="close-btn" @click="showImportModal = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="import-info">
            <p>请下载 Excel 模板，填写学生信息后上传导入。</p>
            <button class="btn btn-outline" @click="downloadTemplate">
              <i class="fas fa-arrow-down-to-bracket"></i>
              下载模板
            </button>
          </div>
          <div class="upload-area">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls"
              style="display: none"
              @change="handleFileSelect"
            />
            <button class="btn btn-primary" @click="triggerFileInput">
              <i class="fas fa-arrow-up-from-bracket"></i>
              选择文件
            </button>
            <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreFilled, Plus, Search, Upload } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import DiagnosisTag from '@/components/student/DiagnosisTag.vue'
import StudentId from '@/components/student/StudentId.vue'
import { classAPI } from '@/database/class-api'
import { useStudentStore, type Student } from '@/stores/student'
import type { ClassInfo } from '@/types/class'
import {
  DIAGNOSIS_OPTIONS,
  type DiagnosisType,
  getDiagnosisDisplay,
  getStudentAge,
  resolveDiagnosisType,
} from '@/utils/student-display'

type GenderFilter = '' | '男' | '女'
const diagnosisOptions = DIAGNOSIS_OPTIONS.map(value => ({
  label: value,
  value,
}))
type DiagnosisFilter = DiagnosisType | ''

interface StudentListItem extends Student {}

const genderTabs: Array<{ label: string; value: GenderFilter }> = [
  { label: '全部', value: '' },
  { label: '男', value: '男' },
  { label: '女', value: '女' }
]

const studentStore = useStudentStore()

const searchKeyword = ref('')
const filterGender = ref<GenderFilter>('')
const filterDiagnosis = ref<DiagnosisFilter>('')
const filterClass = ref('')
const showAddModal = ref(false)
const showImportModal = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const editingStudent = ref<StudentListItem | null>(null)
const classOptions = ref<ClassInfo[]>([])

const students = computed<StudentListItem[]>(() => studentStore.students as StudentListItem[])

const filteredStudents = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  return students.value.filter(student => {
    if (filterGender.value && student.gender !== filterGender.value) {
      return false
    }

    if (filterDiagnosis.value && resolveDiagnosisType(student.disorder) !== filterDiagnosis.value) {
      return false
    }

    if (filterClass.value && String(student.current_class_id ?? '') !== filterClass.value) {
      return false
    }

    if (!keyword) {
      return true
    }

    const diagnosisLabel = getDiagnosisDisplay(student.disorder).toLowerCase()
    const currentClassName = (student.current_class_name || '').toLowerCase()

    return (
      student.name.toLowerCase().includes(keyword)
      || (student.student_no || '').toLowerCase().includes(keyword)
      || (student.disorder || '').toLowerCase().includes(keyword)
      || diagnosisLabel.includes(keyword)
      || currentClassName.includes(keyword)
    )
  })
})

const summaryStats = computed(() => {
  const now = new Date()
  const source = filteredStudents.value
  const assigned = source.filter(student => Boolean(student.current_class_id)).length
  const newThisMonth = source.filter(student => {
    if (!student.created_at) return false
    const createdAt = new Date(student.created_at)
    return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()
  }).length

  return {
    total: source.length,
    assigned,
    unassigned: source.length - assigned,
    newThisMonth
  }
})

function getAge(birthday: string): number {
  return getStudentAge(birthday)
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

function formatClassOptionLabel(cls: ClassInfo): string {
  return `${cls.academicYear} · ${cls.name}`
}

function setGenderFilter(gender: GenderFilter) {
  filterGender.value = gender
}

function compareClasses(left: ClassInfo, right: ClassInfo): number {
  if (left.academicYear !== right.academicYear) {
    return right.academicYear.localeCompare(left.academicYear)
  }
  if (left.gradeLevel !== right.gradeLevel) {
    return left.gradeLevel - right.gradeLevel
  }
  return left.classNumber - right.classNumber
}

async function loadStudentsData() {
  try {
    await studentStore.loadStudents()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`加载学生列表失败: ${message}`)
  }
}

function loadClasses() {
  try {
    classOptions.value = classAPI.getClasses().sort(compareClasses)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误'
    ElMessage.error(`加载班级列表失败: ${message}`)
    classOptions.value = []
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function closeModal() {
  showAddModal.value = false
  editingStudent.value = null
}

async function handleStudentSaved() {
  closeModal()
  await loadStudentsData()
  loadClasses()
}

function editStudent(student: StudentListItem) {
  editingStudent.value = student
  showAddModal.value = true
}

function handleStudentMenuCommand(student: StudentListItem, command: string | number | object) {
  if (command === 'edit') {
    editStudent(student)
    return
  }

  if (command === 'delete') {
    void deleteStudent(student)
  }
}

async function deleteStudent(student: StudentListItem) {
  try {
    await ElMessageBox.confirm(
      `确定要删除学生“${student.name}”吗？`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
    await studentStore.deleteStudent(student.id)
    ElMessage.success('学生删除成功')
  } catch (error: unknown) {
    if (error === 'cancel') return
    console.error('删除学生失败:', error)
    const message = error instanceof Error ? error.message : '请重试'
    ElMessage.error(`删除失败: ${message}`)
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0] || null
}

function downloadTemplate() {
  try {
    const templateData = [
      {
        '姓名*': '张三',
        '性别*': '男',
        '出生日期*': '2015-01-01',
        '学号': 'STU202501001',
        '诊断类型': '视力障碍'
      },
      {
        '姓名*': '李四',
        '性别*': '女',
        '出生日期*': '2016-05-15',
        '学号': 'STU202501002',
        '诊断类型': '听力障碍'
      },
      {
        '姓名*': '',
        '性别*': '',
        '出生日期*': '',
        '学号': '',
        '诊断类型': ''
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 20 },
      { wch: 18 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '学生导入模板')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, '学生导入模板.xlsx')
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('下载模板失败，请重试')
  }
}

onMounted(async () => {
  await loadStudentsData()
  loadClasses()
})
</script>

<style scoped>
.student-management-page {
  --cm-card-bg: #fff;
  --cm-panel-bg: #fff;
  --cm-border: #e4e7ed;
  --cm-border-strong: #dcdfe6;
  --cm-text: #303133;
  --cm-muted: #606266;
  --cm-primary: #66a8ff;
  --cm-primary-soft: #eef5ff;
  --cm-success: #2aa071;
  background: #f5f7fa;
}

.student-management-header {
  margin-bottom: 20px;
}

.student-filter-section {
  padding: 16px;
  border: none;
  border-radius: 8px;
  background: var(--cm-panel-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.student-search {
  width: 220px;
  flex-shrink: 0;
}

.student-search :deep(.el-input__wrapper) {
  min-height: 40px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(220, 223, 230, 0.9) inset;
  background: rgba(255, 255, 255, 0.95);
}

.student-search :deep(.el-input__wrapper:hover),
.student-search :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px rgba(102, 168, 255, 0.88) inset;
}

.gender-pill-list {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.gender-pill-list::-webkit-scrollbar {
  height: 6px;
}

.gender-pill-list::-webkit-scrollbar-thumb {
  background: rgba(164, 157, 146, 0.55);
  border-radius: 999px;
}

.gender-pill {
  border: 1px solid var(--cm-border-strong);
  background: rgba(255, 255, 255, 0.88);
  color: var(--cm-muted);
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.22s ease;
}

.gender-pill:hover {
  color: var(--cm-text);
  border-color: #afcfff;
  transform: translateY(-1px);
}

.gender-pill.is-active {
  color: #2f74d0;
  border-color: var(--cm-primary);
  background: var(--cm-primary-soft);
  box-shadow: 0 10px 20px rgba(102, 168, 255, 0.12);
}

.filter-toolbar__divider {
  width: 1px;
  height: 32px;
  background: #dcdfe6;
  flex-shrink: 0;
}

.compact-selects {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.compact-selects :deep(.el-select) {
  width: 170px;
}

.compact-selects :deep(.el-input__wrapper) {
  min-height: 40px;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(220, 223, 230, 0.9) inset;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.summary-card {
  padding: 20px 22px;
  min-height: 116px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 8px;
  background: var(--color-background-secondary, #ffffff);
  border: none;
  box-shadow: none;
}

.summary-card__label {
  color: var(--cm-muted);
  font-size: 14px;
}

.summary-card__value {
  color: var(--cm-text);
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
}

.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.student-card {
  display: flex;
  flex-direction: column;
  min-height: 236px;
  padding: 16px;
  border-radius: 8px;
  background: #fff;
  border: 0.5px solid #e4e7ed;
  transition: all 0.3s;
}

.student-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.student-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.student-card__identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.student-card__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.student-card__heading h3 {
  margin: 0;
  color: var(--cm-text);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.student-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  color: #606266;
  font-size: 13px;
}

.student-card__meta span {
  position: relative;
}

.student-card__meta span:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -6px;
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: #c0c4cc;
  transform: translateY(-50%);
}

.student-card__menu-button {
  color: #909399;
}

.student-card__menu-button:hover {
  color: #409eff;
}

.student-card__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.student-card__chip-row,
.student-card__info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.student-class-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 13px;
  line-height: 1;
}

.student-class-badge.is-unassigned {
  background: #f4f4f5;
  color: #909399;
  border-color: #e4e7ed;
}

.student-class-badge.is-assigned {
  background: rgba(42, 160, 113, 0.12);
  color: var(--cm-success);
  border-color: rgba(42, 160, 113, 0.18);
}

.student-created-at {
  font-size: 12px;
  color: #909399;
}

.student-card__footer {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.student-card__supporting {
  color: #909399;
  font-size: 12px;
}

.student-primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 16px;
  border-radius: 999px;
  background: #e6f1fb;
  color: #185fa5;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.22s ease;
}

.student-primary-action:hover {
  background: #d6e8fb;
  color: #0f4c8d;
}

:deep(.student-card__menu-dropdown .student-card__menu-item--danger) {
  color: #f56c6c;
}

:deep(.student-card__menu-dropdown .student-card__menu-item--danger:hover) {
  color: #f56c6c;
  background: #fef0f0;
}

.students-empty-state {
  padding: 36px 0 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  width: min(520px, calc(100vw - 32px));
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 16px;
  border-bottom: 1px solid #ebeef5;
}

.modal-header h2 {
  margin: 0;
  color: var(--cm-text);
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #909399;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f7fa;
  color: #606266;
}

.modal-body {
  padding: 22px;
}

.import-info {
  padding: 28px 20px;
  border-radius: 12px;
  border: 1px dashed #dcdfe6;
  background: #fafcff;
  text-align: center;
}

.import-info p {
  margin: 0 0 14px;
  color: #606266;
}

.upload-area {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.file-name {
  color: #606266;
  font-size: 13px;
}

.btn {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.22s ease;
}

.btn-primary {
  background: #409eff;
  color: #fff;
}

.btn-primary:hover {
  background: #2f7fe2;
}

.btn-outline {
  background: #fff;
  color: #606266;
  border-color: #dcdfe6;
}

.btn-outline:hover {
  background: #ecf5ff;
  color: #409eff;
  border-color: #409eff;
}

@media (max-width: 1100px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .filter-toolbar__divider {
    display: none;
  }

  .student-search {
    width: 100%;
  }

  .gender-pill-list {
    width: 100%;
  }

  .compact-selects {
    width: 100%;
    margin-left: 0;
    flex-wrap: wrap;
  }

  .compact-selects :deep(.el-select) {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .student-management-page {
    padding: 16px;
  }

  .student-management-header {
    flex-direction: column;
    gap: 14px;
  }

  .header-right {
    width: 100%;
    flex-wrap: wrap;
  }

  .header-right :deep(.el-button) {
    flex: 1 1 calc(50% - 8px);
  }

  .stats-row {
    grid-template-columns: 1fr;
  }

  .students-grid {
    grid-template-columns: 1fr;
  }

  .student-card__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .student-primary-action {
    width: 100%;
  }
}
</style>
