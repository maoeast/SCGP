<template>
  <div class="page-container scgp-admin-page class-management-page">
    <div class="page-header class-management-header">
      <div class="header-left">
        <h1>班级管理</h1>
        <p class="subtitle">管理全校行政班级与学生分配 · 共 {{ totalClasses }} 个班级</p>
      </div>
      <div class="header-right">
        <el-button v-if="isAdmin" @click="showAcademicYearManagementDialog">
          <el-icon><Calendar /></el-icon>
          学年管理
        </el-button>
        <el-button @click="showBatchCreateDialog">
          <el-icon><DocumentCopy /></el-icon>
          批量创建
        </el-button>
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建班级
        </el-button>
      </div>
    </div>

    <div class="class-management-content">
      <section class="filter-section scgp-filter-surface class-filter-section">
        <div class="filter-toolbar">
          <div class="grade-pill-list" role="tablist" aria-label="年级筛选">
            <button
              v-for="tab in gradeTabs"
              :key="tab.key"
              type="button"
              class="grade-pill"
              :class="{ 'is-active': filterGrade === tab.value }"
              @click="setGradeFilter(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="filter-toolbar__divider" aria-hidden="true" />
          <div class="year-filter">
            <span class="year-filter__label">学年</span>
            <el-select :model-value="filterYear" clearable placeholder="全部学年" @change="handleAcademicYearChange">
              <el-option v-for="year in academicYearFilterOptions" :key="year" :label="year" :value="year" />
            </el-select>
          </div>
        </div>
      </section>

      <section class="stats-row scgp-stats-row" aria-label="班级统计概览">
        <article class="summary-card scgp-summary-card">
          <div class="summary-card__label">总训练次数</div>
          <div class="summary-card__value">{{ totalTrainingCount }}</div>
        </article>
        <article class="summary-card scgp-summary-card">
          <div class="summary-card__label">总评估次数</div>
          <div class="summary-card__value">{{ totalAssessmentCount }}</div>
        </article>
        <article class="summary-card scgp-summary-card">
          <div class="summary-card__label">平均分</div>
          <div class="summary-card__value">{{ displayAverageScore }}</div>
        </article>
        <article class="summary-card scgp-summary-card">
          <div class="summary-card__label">活跃班级</div>
          <div class="summary-card__value">{{ activeClassesCount }}</div>
        </article>
      </section>

      <div class="main-content scgp-page-panel class-management-main">
        <TransitionGroup name="stage-section" tag="div" class="class-stage-list">
          <section v-for="group in stageGroups" :key="group.stage" class="class-stage">
            <div class="class-stage__header">
              <h2>{{ group.label }}</h2>
              <span>{{ group.classes.length }} 个班级</span>
            </div>
            <TransitionGroup name="class-card" tag="div" class="class-grid">
              <article
                v-for="cls in group.classes"
                :key="cls.id"
                class="class-card"
                :class="{ 'is-inactive': cls.status !== ACTIVE_CLASS_STATUS }"
              >
                <div class="class-card__top">
                  <h3>{{ cls.name }}</h3>
                  <div class="class-card__top-actions">
                    <el-tooltip :content="getClassStatusText(cls.status)" placement="top">
                      <span class="status-dot" :class="getClassStatusClass(cls.status)" />
                    </el-tooltip>
                    <el-dropdown
                      trigger="click"
                      popper-class="class-card__menu-dropdown"
                      @command="handleClassMenuCommand(cls, $event)"
                    >
                      <el-button class="class-card__menu-button" text circle @click.stop>
                        <el-icon><MoreFilled /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="delete" class="class-card__menu-item--danger">
                            删除
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </div>
                <div class="class-card__middle">
                  <div class="class-card__enrollment">在籍 {{ cls.currentEnrollment }}/{{ cls.maxStudents }} 人</div>
                  <div class="capacity-progress" aria-hidden="true">
                    <div class="capacity-progress__fill" :style="{ width: `${getEnrollmentPercent(cls)}%` }" />
                  </div>
                  <div class="class-card__capacity">{{ getEnrollmentPercent(cls) }}% 满员率</div>
                </div>
                <div class="class-card__actions">
                  <el-button class="card-action-button" round @click="viewClassStudents(cls)">学生</el-button>
                  <el-button v-if="isAdmin" class="card-action-button" round @click="manageClassTeachers(cls)">分配老师</el-button>
                  <el-button class="card-action-button" round @click="editClass(cls)">编辑</el-button>
                </div>
              </article>
            </TransitionGroup>
          </section>
        </TransitionGroup>

        <div v-if="stageGroups.length === 0" class="class-empty-state">
          <el-empty description="当前筛选条件下暂无班级" />
        </div>
      </div>
    </div>

    <el-dialog v-model="classDialogVisible" :title="isEditMode ? '编辑班级' : '新建班级'" width="520px">
      <el-form ref="classFormRef" :model="classForm" :rules="classRules" label-width="100px">
        <el-form-item label="学年" prop="academicYear">
          <el-select v-model="classForm.academicYear" placeholder="选择学年">
            <el-option v-for="year in academicYearFilterOptions" :key="year" :label="year" :value="year" />
          </el-select>
        </el-form-item>
        <el-form-item label="年级" prop="gradeLevel">
          <el-select v-model="classForm.gradeLevel" placeholder="选择年级">
            <el-option-group v-for="group in gradeOptionGroups" :key="group.label" :label="group.label">
              <el-option v-for="grade in group.options" :key="grade.value" :label="grade.label" :value="grade.value" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="班号" prop="classNumber">
          <el-select v-model="classForm.classNumber" placeholder="选择班号">
            <el-option v-for="num in classNumbers" :key="num" :label="`${num}班`" :value="num" />
          </el-select>
        </el-form-item>
        <el-form-item label="最大人数" prop="maxStudents">
          <el-input-number v-model="classForm.maxStudents" :min="1" :max="50" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="classForm.useCustomName">使用自定义名称</el-checkbox>
        </el-form-item>
        <el-form-item label="班级名称" prop="customName">
          <el-input v-if="classForm.useCustomName" v-model="classForm.customName" placeholder="请输入自定义班级名称" maxlength="50" show-word-limit />
          <el-input v-else :value="generatedClassName" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="classDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveClass">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="batchDialogVisible" title="批量创建班级" width="560px">
      <el-form ref="batchFormRef" :model="batchForm" :rules="batchRules" label-width="110px">
        <el-form-item label="学年" prop="academicYear">
          <el-select v-model="batchForm.academicYear" placeholder="选择学年">
            <el-option v-for="year in academicYearFilterOptions" :key="year" :label="year" :value="year" />
          </el-select>
        </el-form-item>
        <el-form-item label="年级范围" prop="grades">
          <el-checkbox-group v-model="batchForm.grades">
            <div v-for="group in gradeOptionGroups" :key="group.label" class="grade-group">
              <div class="grade-group__label">{{ group.label }}</div>
              <div class="grade-group__options">
                <el-checkbox v-for="grade in group.options" :key="grade.value" :value="grade.value">
                  {{ grade.label }}
                </el-checkbox>
              </div>
            </div>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="每个年级班数" prop="classesPerGrade">
          <el-input-number v-model="batchForm.classesPerGrade" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="最大人数">
          <el-input-number v-model="batchForm.maxStudents" :min="1" :max="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="batchCreateClasses">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="academicYearManagementVisible" title="学年管理" width="760px">
      <div class="academic-year-toolbar">
        <el-button type="primary" @click="showAcademicYearFormDialog()">新增学年</el-button>
      </div>
      <el-table :data="academicYears" stripe>
        <el-table-column prop="academicYear" label="学年" min-width="130" />
        <el-table-column prop="startDate" label="开始日期" width="120" />
        <el-table-column prop="endDate" label="结束日期" width="120" />
        <el-table-column prop="classCount" label="班级数" width="90" />
        <el-table-column prop="studentCount" label="学生数" width="90" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '当前学年' : '普通学年' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button text type="primary" @click="showAcademicYearFormDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="academicYearFormDialogVisible" :title="academicYearForm.id ? '编辑学年' : '新增学年'" width="420px">
      <el-form ref="academicYearFormRef" :model="academicYearForm" :rules="academicYearRules" label-width="110px">
        <el-form-item label="学年" prop="academicYear">
          <el-input v-model="academicYearForm.academicYear" placeholder="例如 2026-2027" maxlength="9" />
        </el-form-item>
        <el-form-item label="设为当前学年">
          <el-switch v-model="academicYearForm.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="academicYearFormDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAcademicYear">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="studentsDialogVisible" :title="`${currentClass?.name ?? ''} - 学生列表`" width="720px">
      <div class="class-info">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="年级">{{ currentClass ? getGradeLabel(currentClass.gradeLevel) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="班号">{{ currentClass?.classNumber ? `${currentClass.classNumber}班` : '-' }}</el-descriptions-item>
          <el-descriptions-item label="在籍人数">{{ students.length }} 人</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-table :data="students" stripe>
        <el-table-column prop="studentName" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="80" />
        <el-table-column prop="enrollmentDate" label="入班日期" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="removeStudent(row)">移出班级</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="studentsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="addStudents">添加学生</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="teacherDialogVisible" :title="`${currentClass?.name ?? ''} - 分配老师`" width="620px">
      <div class="class-info mb-4">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="班级">{{ currentClass?.name }}</el-descriptions-item>
          <el-descriptions-item label="学年">{{ currentClass?.academicYear }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="teacher-assignment">
        <div class="mb-4">
          <h4>已分配老师</h4>
          <el-tag v-for="teacher in currentClassTeachers" :key="teacher.id" closable class="mr-2 mb-2" @close="removeTeacher(teacher)">
            {{ teacher.teacherName }}
          </el-tag>
          <el-empty v-if="currentClassTeachers.length === 0" description="暂未分配老师" :image-size="60" />
        </div>
        <el-divider />
        <div>
          <h4>添加老师</h4>
          <el-select v-model="selectedTeacherId" placeholder="选择老师" style="width: 100%" @change="addTeacher">
            <el-option
              v-for="teacher in availableTeachers"
              :key="teacher.id"
              :label="`${teacher.name} (${teacher.username})`"
              :value="teacher.id"
              :disabled="isTeacherAssigned(teacher.id)"
            />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="teacherDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Calendar, DocumentCopy, MoreFilled, Plus } from '@element-plus/icons-vue'
import { classAPI } from '@/database/class-api'
import { DEFAULT_GRADE_LEVEL, GRADE_LEVELS, type AcademicYear, type AcademicYearInfo, type ClassInfo, type ClassNumber, type ClassStudentItem, type ClassTeacher, type CreateAcademicYearParams, type CreateClassParams, type GradeLevel, type UnifiedClassStatistics, type UpdateAcademicYearParams, type UpdateClassParams } from '@/types/class'
import { useAuthStore } from '@/stores/auth'

type GradeStage = 'kindergarten' | 'primary' | 'junior'
interface GradeOption { value: GradeLevel; label: string; stage: GradeStage }
interface ClassForm { id?: number; academicYear: AcademicYear; gradeLevel: GradeLevel; classNumber: ClassNumber; maxStudents: number; useCustomName: boolean; customName: string }
interface AcademicYearFormState { id?: number; academicYear: AcademicYear; isActive: boolean }
interface StageGroup { stage: GradeStage; label: string; classes: ClassInfo[] }

const ACTIVE_CLASS_STATUS = 1
const INACTIVE_CLASS_STATUS = 0
const GRADUATED_CLASS_STATUS = 2
const GRADE_OPTIONS: GradeOption[] = [
  { value: 1, label: '小班', stage: 'kindergarten' },
  { value: 2, label: '中班', stage: 'kindergarten' },
  { value: 3, label: '大班', stage: 'kindergarten' },
  { value: 4, label: '一年级', stage: 'primary' },
  { value: 5, label: '二年级', stage: 'primary' },
  { value: 6, label: '三年级', stage: 'primary' },
  { value: 7, label: '四年级', stage: 'primary' },
  { value: 8, label: '五年级', stage: 'primary' },
  { value: 9, label: '六年级', stage: 'primary' },
  { value: 10, label: '七年级（初一）', stage: 'junior' },
  { value: 11, label: '八年级（初二）', stage: 'junior' },
  { value: 12, label: '九年级（初三）', stage: 'junior' }
]
const GRADE_STAGE_LABELS: Record<GradeStage, string> = { kindergarten: '幼儿园', primary: '小学', junior: '初中' }
const gradeOptionGroups = [
  { label: GRADE_STAGE_LABELS.kindergarten, options: GRADE_OPTIONS.filter(option => option.stage === 'kindergarten') },
  { label: GRADE_STAGE_LABELS.primary, options: GRADE_OPTIONS.filter(option => option.stage === 'primary') },
  { label: GRADE_STAGE_LABELS.junior, options: GRADE_OPTIONS.filter(option => option.stage === 'junior') }
]

const router = useRouter()
const authStore = useAuthStore()
const filterYear = ref<AcademicYear | ''>('')
const filterGrade = ref<GradeLevel | ''>('')
const classes = ref<ClassInfo[]>([])
const statistics = ref<UnifiedClassStatistics[]>([])
const academicYears = ref<AcademicYearInfo[]>([])
const classDialogVisible = ref(false)
const batchDialogVisible = ref(false)
const academicYearManagementVisible = ref(false)
const academicYearFormDialogVisible = ref(false)
const studentsDialogVisible = ref(false)
const teacherDialogVisible = ref(false)
const isEditMode = ref(false)
const currentClass = ref<ClassInfo | null>(null)
const students = ref<ClassStudentItem[]>([])
const currentClassTeachers = ref<ClassTeacher[]>([])
const availableTeachers = ref<Array<{ id: number; name: string; username: string }>>([])
const selectedTeacherId = ref<number | null>(null)
const classFormRef = ref<FormInstance>()
const batchFormRef = ref<FormInstance>()
const academicYearFormRef = ref<FormInstance>()
let hasInitializedFilterYear = false

const academicYearOptions = computed(() => academicYears.value.map(item => item.academicYear))
const academicYearFilterOptions = computed<AcademicYear[]>(() => academicYearOptions.value.length > 0 ? academicYearOptions.value : [getCurrentAcademicYear()])
const preferredAcademicYear = computed<AcademicYear>(() => academicYears.value.find(item => item.isActive)?.academicYear || academicYearFilterOptions.value[0] || getCurrentAcademicYear())
const isAdmin = computed(() => authStore.isAdmin)
const classNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as ClassNumber[]
const gradeTabs = computed(() => [{ key: 'all', label: '全部', value: '' as const }, ...GRADE_OPTIONS.map(option => ({ key: `grade-${option.value}`, label: option.label, value: option.value }))])
const generatedClassName = computed(() => `${getGradeLabel(classForm.value.gradeLevel)}${classForm.value.classNumber}班`)
const totalClasses = computed(() => classes.value.length)
const totalTrainingCount = computed(() => statistics.value.reduce((sum, item) => sum + item.totalTrainingCount, 0))
const totalAssessmentCount = computed(() => statistics.value.reduce((sum, item) => sum + item.totalAssessmentCount, 0))
const averageScore = computed(() => {
  const scores = statistics.value.filter(item => typeof item.averageScore === 'number').map(item => item.averageScore as number)
  if (scores.length === 0) return null
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
})
const displayAverageScore = computed(() => averageScore.value === null ? '—' : averageScore.value.toFixed(1))
const activeClassesCount = computed(() => statistics.value.filter(item => item.totalTrainingCount > 0 || item.totalAssessmentCount > 0).length)
const stageGroups = computed<StageGroup[]>(() => {
  const grouped = new Map<GradeStage, ClassInfo[]>()
  for (const cls of [...classes.value].sort((left, right) => left.gradeLevel !== right.gradeLevel ? left.gradeLevel - right.gradeLevel : left.classNumber - right.classNumber)) {
    const stage = getGradeStage(cls.gradeLevel)
    const bucket = grouped.get(stage) ?? []
    bucket.push(cls)
    grouped.set(stage, bucket)
  }
  return (['kindergarten', 'primary', 'junior'] as GradeStage[]).map(stage => ({ stage, label: GRADE_STAGE_LABELS[stage], classes: grouped.get(stage) ?? [] })).filter(group => group.classes.length > 0)
})

const classForm = ref<ClassForm>({ academicYear: getCurrentAcademicYear(), gradeLevel: DEFAULT_GRADE_LEVEL, classNumber: 1, maxStudents: 50, useCustomName: false, customName: '' })
const batchForm = ref({ academicYear: getCurrentAcademicYear(), grades: [DEFAULT_GRADE_LEVEL] as GradeLevel[], classesPerGrade: 3, maxStudents: 50 })
const academicYearForm = ref<AcademicYearFormState>({ academicYear: getCurrentAcademicYear(), isActive: false })

const classRules: FormRules<ClassForm> = {
  academicYear: [{ required: true, message: '请选择学年', trigger: 'change' }],
  gradeLevel: [{ required: true, message: '请选择年级', trigger: 'change' }],
  classNumber: [{ required: true, message: '请选择班号', trigger: 'change' }],
  maxStudents: [{ required: true, message: '请输入最大人数', trigger: 'blur' }],
  customName: [{
    validator: (_rule, value, callback) => {
      if (!classForm.value.useCustomName) return callback()
      const normalized = typeof value === 'string' ? value.trim() : ''
      if (!normalized) return callback(new Error('请输入自定义班级名称'))
      if (normalized.length > 50) return callback(new Error('班级名称不能超过 50 个字符'))
      callback()
    }, trigger: 'blur'
  }]
}
const batchRules: FormRules = {
  academicYear: [{ required: true, message: '请选择学年', trigger: 'change' }],
  grades: [{ required: true, message: '请选择年级范围', trigger: 'change' }],
  classesPerGrade: [{ required: true, message: '请输入每个年级的班级数量', trigger: 'blur' }]
}
const academicYearRules: FormRules<AcademicYearFormState> = {
  academicYear: [
    { required: true, message: '请输入学年', trigger: 'blur' },
    { pattern: /^\d{4}-\d{4}$/, message: '学年格式必须为 YYYY-YYYY', trigger: 'blur' }
  ]
}

function getCurrentAcademicYear(): AcademicYear {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() + 1 >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}
function getGradeLabel(gradeLevel: number): string {
  return GRADE_OPTIONS.find(option => option.value === gradeLevel)?.label ?? `${gradeLevel}年级`
}
function getGradeStage(gradeLevel: number): GradeStage {
  return GRADE_OPTIONS.find(option => option.value === gradeLevel)?.stage ?? 'primary'
}
function syncFilterYearWithAcademicYears() {
  if (!hasInitializedFilterYear) {
    filterYear.value = preferredAcademicYear.value
    hasInitializedFilterYear = true
    return
  }
  if (filterYear.value && !academicYearOptions.value.includes(filterYear.value)) {
    filterYear.value = preferredAcademicYear.value
  }
}
function loadAcademicYears() {
  try {
    academicYears.value = classAPI.getAcademicYears()
    syncFilterYearWithAcademicYears()
  } catch (error: any) {
    ElMessage.error(`加载学年列表失败: ${error.message}`)
  }
}
function loadData() {
  try {
    const options: { academicYear?: AcademicYear; gradeLevel?: GradeLevel } = {}
    if (filterYear.value) options.academicYear = filterYear.value
    if (filterGrade.value !== '') options.gradeLevel = filterGrade.value
    classes.value = classAPI.getClasses(options)
    loadStatistics()
  } catch (error: any) {
    ElMessage.error(`加载班级列表失败: ${error.message}`)
  }
}
function loadStatistics() {
  try {
    const options: { academicYear?: AcademicYear; gradeLevel?: GradeLevel } = {}
    if (filterYear.value) options.academicYear = filterYear.value
    if (filterGrade.value !== '') options.gradeLevel = filterGrade.value
    statistics.value = classAPI.getStatistics(options)
  } catch (error) {
    console.warn('[ClassManagement] 加载统计数据失败:', error)
    statistics.value = []
  }
}
function setGradeFilter(grade: GradeLevel | '') {
  filterGrade.value = grade
  loadData()
}
function handleClassMenuCommand(cls: ClassInfo, command: string | number | object) {
  if (command === 'delete') {
    void deleteClass(cls)
  }
}
function handleAcademicYearChange(value?: AcademicYear) {
  filterYear.value = value ?? ''
  loadData()
}
function getSuggestedAcademicYear(): AcademicYear {
  const latestAcademicYear = academicYearFilterOptions.value[0] || getCurrentAcademicYear()
  const [startYear] = latestAcademicYear.split('-').map(Number)
  const safeStartYear = startYear || new Date().getFullYear()
  return `${safeStartYear + 1}-${safeStartYear + 2}`
}
function showCreateDialog() {
  isEditMode.value = false
  classForm.value = { academicYear: preferredAcademicYear.value, gradeLevel: DEFAULT_GRADE_LEVEL, classNumber: 1, maxStudents: 50, useCustomName: false, customName: '' }
  classDialogVisible.value = true
}
function editClass(cls: ClassInfo) {
  isEditMode.value = true
  classForm.value = { id: cls.id, academicYear: cls.academicYear, gradeLevel: cls.gradeLevel, classNumber: cls.classNumber, maxStudents: cls.maxStudents, useCustomName: false, customName: '' }
  classDialogVisible.value = true
}
async function saveClass() {
  if (!classFormRef.value) return
  try { await classFormRef.value.validate() } catch { return }
  try {
    if (isEditMode.value && classForm.value.id) {
      const params: UpdateClassParams = { id: classForm.value.id, maxStudents: classForm.value.maxStudents }
      await classAPI.updateClass(params)
      ElMessage.success('班级更新成功')
    } else {
      const params: CreateClassParams = {
        academicYear: classForm.value.academicYear,
        gradeLevel: classForm.value.gradeLevel,
        classNumber: classForm.value.classNumber,
        maxStudents: classForm.value.maxStudents,
        name: classForm.value.useCustomName && classForm.value.customName.trim() ? classForm.value.customName.trim() : undefined
      }
      await classAPI.createClass(params)
      ElMessage.success('班级创建成功')
    }
    classDialogVisible.value = false
    loadAcademicYears()
    loadData()
  } catch (error: any) {
    const errorMessage = error.message || String(error)
    if (errorMessage.includes('已存在') || errorMessage.includes('UNIQUE constraint')) {
      ElMessage.error({ message: '班级创建失败：该学年、年级和班号的组合已存在', duration: 4000, showClose: true })
    } else {
      ElMessage.error({ message: `操作失败：${errorMessage}`, duration: 3000, showClose: true })
    }
    console.error('[ClassManagement] 保存班级失败:', error)
  }
}
async function deleteClass(cls: ClassInfo) {
  try {
    await ElMessageBox.confirm(`确定要删除班级“${cls.name}”吗？`, '确认删除', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    await classAPI.deleteClass(cls.id)
    ElMessage.success('班级删除成功')
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(`删除失败: ${error.message}`)
  }
}
function showBatchCreateDialog() {
  batchForm.value = { academicYear: preferredAcademicYear.value, grades: [...GRADE_LEVELS] as GradeLevel[], classesPerGrade: 3, maxStudents: 50 }
  batchDialogVisible.value = true
}
async function batchCreateClasses() {
  if (!batchFormRef.value) return
  try { await batchFormRef.value.validate() } catch { return }
  try {
    const paramsArray: CreateClassParams[] = []
    for (const grade of batchForm.value.grades) {
      for (let classNumber = 1; classNumber <= batchForm.value.classesPerGrade; classNumber++) {
        paramsArray.push({ academicYear: batchForm.value.academicYear, gradeLevel: grade, classNumber: classNumber as ClassNumber, maxStudents: batchForm.value.maxStudents })
      }
    }
    const createdIds = await classAPI.createClassesBatch(paramsArray)
    const createdCount = createdIds.length
    const skippedCount = paramsArray.length - createdCount
    if (skippedCount > 0) {
      ElMessage.warning({ message: `成功创建 ${createdCount} 个班级，跳过 ${skippedCount} 个已存在的班级`, duration: 5000, showClose: true })
    } else {
      ElMessage.success(`成功创建 ${createdCount} 个班级`)
    }
    batchDialogVisible.value = false
    loadAcademicYears()
    loadData()
  } catch (error: any) {
    const errorMessage = error.message || String(error)
    ElMessage.error({ message: `批量创建失败：${errorMessage}`, duration: 4000, showClose: true })
    console.error('[ClassManagement] 批量创建班级失败:', error)
  }
}
function showAcademicYearManagementDialog() {
  loadAcademicYears()
  academicYearManagementVisible.value = true
}
function showAcademicYearFormDialog(record?: AcademicYearInfo) {
  academicYearForm.value = record ? { id: record.id, academicYear: record.academicYear, isActive: record.isActive } : { academicYear: getSuggestedAcademicYear(), isActive: academicYears.value.length === 0 }
  academicYearFormDialogVisible.value = true
}
async function saveAcademicYear() {
  if (!academicYearFormRef.value) return
  try { await academicYearFormRef.value.validate() } catch { return }
  try {
    if (academicYearForm.value.id) {
      const params: UpdateAcademicYearParams = { id: academicYearForm.value.id, academicYear: academicYearForm.value.academicYear.trim(), isActive: academicYearForm.value.isActive }
      await classAPI.updateAcademicYear(params)
      ElMessage.success('学年更新成功')
    } else {
      const params: CreateAcademicYearParams = { academicYear: academicYearForm.value.academicYear.trim(), isActive: academicYearForm.value.isActive }
      await classAPI.createAcademicYear(params)
      ElMessage.success('学年创建成功')
    }
    academicYearFormDialogVisible.value = false
    loadAcademicYears()
    loadData()
  } catch (error: any) {
    ElMessage.error(`学年保存失败: ${error.message}`)
  }
}
function viewClassStudents(cls: ClassInfo) {
  currentClass.value = cls
  students.value = classAPI.getClassStudents(cls.id)
  studentsDialogVisible.value = true
}
async function removeStudent(student: ClassStudentItem) {
  try {
    await ElMessageBox.confirm(`确定要将学生“${student.studentName}”移出当前班级吗？`, '确认移出', { type: 'warning', confirmButtonText: '移出', cancelButtonText: '取消' })
    ElMessage.info('移出班级功能仍在开发中')
  } catch {
    // noop
  }
}
function addStudents() {
  ElMessage.info('请到学生分班页面添加学生')
  studentsDialogVisible.value = false
  router.push('/student-class-assignment')
}
function getEnrollmentPercent(cls: ClassInfo): number {
  if (!cls.maxStudents) return 0
  return Math.max(0, Math.min(100, Math.round((cls.currentEnrollment / cls.maxStudents) * 100)))
}
function getClassStatusText(status: number): string {
  if (status === ACTIVE_CLASS_STATUS) return '启用中'
  if (status === GRADUATED_CLASS_STATUS) return '已毕业'
  if (status === INACTIVE_CLASS_STATUS) return '已停用'
  return '未知状态'
}
function getClassStatusClass(status: number): string {
  if (status === ACTIVE_CLASS_STATUS) return 'is-active'
  if (status === GRADUATED_CLASS_STATUS) return 'is-graduated'
  return 'is-inactive'
}
function manageClassTeachers(cls: ClassInfo) {
  currentClass.value = cls
  selectedTeacherId.value = null
  loadClassTeachers(cls.id)
  loadAvailableTeachers()
  teacherDialogVisible.value = true
}
function loadClassTeachers(classId: number) {
  try {
    currentClassTeachers.value = classAPI.getClassTeachers(classId)
  } catch (error: any) {
    ElMessage.error(`加载老师列表失败: ${error.message}`)
    currentClassTeachers.value = []
  }
}
function loadAvailableTeachers() {
  try {
    availableTeachers.value = classAPI.getAvailableTeachers()
  } catch (error: any) {
    ElMessage.error(`加载可选老师失败: ${error.message}`)
    availableTeachers.value = []
  }
}
function isTeacherAssigned(teacherId: number): boolean {
  return currentClassTeachers.value.some(teacher => teacher.teacherId === teacherId)
}
function addTeacher() {
  if (!selectedTeacherId.value || !currentClass.value) return
  try {
    classAPI.assignTeacherToClass(currentClass.value.id, selectedTeacherId.value, authStore.user?.id)
    ElMessage.success('老师分配成功')
    loadClassTeachers(currentClass.value.id)
    selectedTeacherId.value = null
  } catch (error: any) {
    ElMessage.error(`分配失败: ${error.message}`)
  }
}
function removeTeacher(teacher: ClassTeacher) {
  if (!currentClass.value) return
  ElMessageBox.confirm(`确定要从班级中移除老师“${teacher.teacherName}”吗？`, '确认移除', { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' })
    .then(() => {
      try {
        classAPI.removeTeacherFromClass(currentClass.value!.id, teacher.teacherId)
        ElMessage.success('老师已移除')
        loadClassTeachers(currentClass.value!.id)
      } catch (error: any) {
        ElMessage.error(`移除失败: ${error.message}`)
      }
    })
    .catch(() => {})
}

onMounted(() => {
  loadAcademicYears()
  loadData()
})
</script>

<style scoped>
.class-management-page {
  --cm-card-bg: #fff;
  --cm-panel-bg: #fff;
  --cm-border: #e4e7ed;
  --cm-border-strong: #dcdfe6;
  --cm-text: #303133;
  --cm-muted: #606266;
  --cm-primary: #66a8ff;
  --cm-primary-soft: #eef5ff;
  --cm-success: #2aa071;
  --cm-warning: #dbac40;
  --cm-danger: #d85d55;
  background: #f5f7fa;
}

.class-management-header {
  margin-bottom: 20px;
}

.class-management-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.class-management-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.class-filter-section {
  padding: 16px;
  border: none;
  border-radius: 8px;
  background: var(--cm-panel-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.grade-pill-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 0;
}

.grade-pill-list::-webkit-scrollbar {
  height: 6px;
}

.grade-pill-list::-webkit-scrollbar-thumb {
  background: rgba(164, 157, 146, 0.55);
  border-radius: 999px;
}

.grade-pill {
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

.grade-pill:hover {
  color: var(--cm-text);
  border-color: #afcfff;
  transform: translateY(-1px);
}

.grade-pill.is-active {
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

.year-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.year-filter__label {
  color: var(--cm-muted);
  font-size: 13px;
  white-space: nowrap;
}

.year-filter :deep(.el-select) {
  width: 180px;
}

.year-filter :deep(.el-input__wrapper) {
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(207, 199, 185, 0.85) inset;
  background: rgba(255, 255, 255, 0.95);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  padding: 20px 22px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #ebeef5;
  min-height: 116px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
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

.class-stage-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.class-stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.class-stage__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
}

.class-stage__header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--cm-text);
}

.class-stage__header span {
  font-size: 13px;
  color: var(--cm-muted);
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.class-card {
  background: #fff;
  border: 0.5px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  min-height: 214px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.class-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.class-card.is-inactive {
  border-color: #ebeef5;
}

.class-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.class-card__top h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.class-card__top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.class-card__menu-button {
  color: #909399;
}

.class-card__menu-button:hover {
  color: #409eff;
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-flex;
  flex-shrink: 0;
}

.status-dot.is-active { background: var(--cm-success); }
.status-dot.is-inactive { background: #b6bdc4; }
.status-dot.is-graduated { background: var(--cm-warning); }

.class-card__middle {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.class-card__enrollment,
.class-card__capacity {
  color: #606266;
  font-size: 14px;
}

.capacity-progress {
  width: 100%;
  height: 4px;
  background: #ebeef5;
  border-radius: 999px;
  overflow: hidden;
}

.capacity-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #79bbff 0%, #409eff 100%);
  transition: width 0.24s ease;
}

.class-card__actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
}

.class-card__actions :deep(.el-button) {
  flex: 1 1 0;
  min-width: 0;
  min-height: 36px;
  margin: 0;
  border-radius: 999px;
  border-color: #dcdfe6;
  background: #fff;
  color: #606266;
  font-weight: 500;
  font-size: 13px;
  padding-inline: 10px;
}

.class-card__actions :deep(.el-button:hover) {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

:deep(.class-card__menu-dropdown .class-card__menu-item--danger) {
  color: #f56c6c;
}

:deep(.class-card__menu-dropdown .class-card__menu-item--danger:hover) {
  background: #fef0f0;
  color: #f56c6c;
}

.class-empty-state {
  padding: 36px 0 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.academic-year-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.grade-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.grade-group__label {
  color: var(--cm-muted);
  font-size: 13px;
  font-weight: 600;
}

.grade-group__options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.stage-section-enter-active,
.stage-section-leave-active,
.class-card-enter-active,
.class-card-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.stage-section-enter-from,
.stage-section-leave-to,
.class-card-enter-from,
.class-card-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.stage-section-move,
.class-card-move {
  transition: transform 0.28s ease;
}

@media (max-width: 1100px) {
  .stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
  .class-management-page { padding: 16px; }
  .class-management-header { flex-direction: column; gap: 14px; }
  .header-right { width: 100%; flex-wrap: wrap; }
  .header-right :deep(.el-button) { flex: 1 1 calc(50% - 8px); }
  .filter-toolbar { align-items: stretch; }
  .filter-toolbar__divider { display: none; }
  .year-filter { width: 100%; justify-content: space-between; }
  .year-filter :deep(.el-select) { width: 100%; }
  .stats-row { grid-template-columns: 1fr; }
  .class-grid { grid-template-columns: 1fr; }
  .class-card__actions { flex-wrap: wrap; }
  .class-card__actions :deep(.el-button) { flex: 1 1 calc(50% - 5px); }
}
</style>
