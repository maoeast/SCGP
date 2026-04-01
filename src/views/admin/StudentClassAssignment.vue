<template>
  <div class="page-container scgp-admin-page student-class-page">
    <div class="page-header">
      <div class="header-left">
        <h1>学生分班</h1>
        <p class="subtitle">管理学生班级分配与学年升级 · 共 {{ students.length }} 名学生</p>
      </div>
      <div class="header-right">
        <el-button type="primary" :disabled="selectedStudents.length === 0" @click="showBatchAssignDialog">
          <el-icon><Plus /></el-icon>
          批量分班 ({{ selectedStudents.length }})
        </el-button>
        <el-button @click="showUpgradeDialog">
          <el-icon><Top /></el-icon>
          学年升级
        </el-button>
      </div>
    </div>

    <section class="filter-section scgp-filter-surface student-filter-section">
      <div class="filter-toolbar">
        <div class="status-pill-list" role="tablist" aria-label="学生状态筛选">
          <button
            v-for="tab in statusTabs"
            :key="tab.value || 'all'"
            type="button"
            class="status-pill"
            :class="{ 'is-active': filterStatus === tab.value }"
            @click="setStatusFilter(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="filter-toolbar__divider" aria-hidden="true" />

        <div class="compact-selects">
          <el-select
            v-model="filterClass"
            class="compact-select"
            placeholder="按班级筛选"
            clearable
            @change="loadStudents"
          >
            <el-option label="全部班级" value="" />
            <el-option
              v-for="cls in allClasses"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id"
            />
          </el-select>

          <el-select
            v-model="viewYear"
            class="compact-select"
            placeholder="学年"
            @change="loadClassView"
          >
            <el-option
              v-for="year in filterYearOptions"
              :key="year.value"
              :label="year.label"
              :value="year.value"
            />
          </el-select>
        </div>
      </div>
    </section>

    <div class="main-content scgp-page-panel">
      <el-tabs v-model="activeTab" class="tabs">
        <el-tab-pane label="分班管理" name="assign">
          <el-card shadow="never" class="student-list-card">
            <template #header>
              <div class="card-header">
                <span>学生列表</span>
                <span class="card-count">共 {{ students.length }} 名学生</span>
              </div>
            </template>

            <div class="bulk-toolbar">
              <el-checkbox
                :model-value="allStudentsSelected"
                :indeterminate="partiallySelected"
                @change="toggleSelectAll"
              >
                全选
              </el-checkbox>

              <el-button
                class="bulk-assign-button"
                round
                :disabled="selectedStudents.length === 0"
                @click="showBatchAssignDialog"
              >
                批量分班
              </el-button>
            </div>

            <el-table
              ref="studentTableRef"
              :data="students"
              stripe
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="52" />

              <el-table-column label="姓名" min-width="180">
                <template #default="{ row }">
                  <div class="student-name-cell">
                    <span
                      class="student-avatar"
                      :class="getStudentAvatarClass(row.gender)"
                    >
                      {{ getStudentInitial(row.name) }}
                    </span>
                    <span class="student-name">{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>

              <el-table-column prop="gender" label="性别" width="70" />

              <el-table-column label="年龄" width="80">
                <template #default="{ row }">
                  {{ calculateAge(row.birthday) }}岁
                </template>
              </el-table-column>

              <el-table-column label="当前班级" min-width="150">
                <template #default="{ row }">
                  <span
                    class="student-class-badge"
                    :class="row.currentClassName ? 'is-assigned' : 'is-unassigned'"
                  >
                    {{ row.currentClassName || '未分班' }}
                  </span>
                </template>
              </el-table-column>

              <el-table-column label="操作" min-width="210">
                <template #default="{ row }">
                  <div class="row-actions">
                    <el-button
                      class="assign-action-button"
                      round
                      @click="showAssignDialog(row)"
                    >
                      {{ row.currentClassName ? '调班' : '分班' }}
                    </el-button>

                    <button
                      type="button"
                      class="student-history-link"
                      @click="viewClassHistory(row)"
                    >
                      班级历史
                    </button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="班级视图" name="classes">
          <el-card shadow="never" class="class-view-card">
            <template #header>
              <div class="card-header">
                <span>班级视图</span>
                <span class="card-count">{{ viewYear }} · 共 {{ classViewData.length }} 个班级</span>
              </div>
            </template>

            <div v-if="classViewGroups.length === 0" class="class-empty-state">
              <el-empty description="当前学年暂无班级" />
            </div>

            <div v-else class="class-stage-list">
              <section
                v-for="group in classViewGroups"
                :key="group.stage"
                class="class-stage"
              >
                <div class="class-stage__header">
                  <h3>{{ group.label }}</h3>
                  <span>{{ group.classes.length }} 个班级</span>
                </div>

                <div class="class-grid">
                  <article
                    v-for="cls in group.classes"
                    :key="cls.id"
                    class="class-card"
                    @click="viewClassStudents(cls)"
                  >
                    <div class="class-card__top">
                      <h4>{{ cls.name }}</h4>
                      <span class="capacity-badge">{{ cls.currentEnrollment }}/{{ cls.maxStudents }}</span>
                    </div>

                    <div class="class-card__status">
                      <template v-if="cls.currentEnrollment > 0">
                        <span class="status-dot is-active" />
                        <span>{{ cls.currentEnrollment }} 名学生在籍</span>
                      </template>
                      <template v-else>
                        <span class="class-card__empty">暂无学生</span>
                      </template>
                    </div>

                    <div class="capacity-progress capacity-progress--thin" aria-hidden="true">
                      <div
                        class="capacity-progress__fill"
                        :style="{ width: `${getEnrollmentPercent(cls)}%` }"
                      />
                    </div>

                    <div class="class-card__capacity">
                      {{ getEnrollmentPercent(cls) }}% 满员率
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog
      v-model="assignDialogVisible"
      :title="isBatchAssign ? '批量分班' : '学生分班'"
      width="500px"
    >
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="100px">
        <el-form-item label="选择学年" prop="academicYear">
          <el-select v-model="assignForm.academicYear" placeholder="选择学年">
            <el-option
              v-for="year in yearOptions"
              :key="year"
              :label="year"
              :value="year"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择班级" prop="classId">
          <el-select v-model="assignForm.classId" placeholder="选择班级" filterable>
            <el-option
              v-for="cls in availableClasses"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id"
              :disabled="cls.currentEnrollment >= cls.maxStudents"
            >
              <span>{{ cls.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ cls.currentEnrollment }}/{{ cls.maxStudents }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="入班日期" prop="enrollmentDate">
          <el-date-picker
            v-model="assignForm.enrollmentDate"
            type="date"
            v-bind="standardDatePickerProps"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <div v-if="isBatchAssign" class="batch-info">
          <el-tag>已选择 {{ selectedStudents.length }} 名学生</el-tag>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="upgradeDialogVisible" title="学年升级" width="500px">
      <el-alert
        title="升级说明"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <ul>
          <li>{{ getGradeUpgradeRangeText() }} 学生将自动升级到下一年级或下一学段</li>
          <li>{{ formatGradeLabel(LAST_GRADE_LEVEL) }} 学生将标记为毕业</li>
          <li>请确认新学年的班级已创建完成</li>
        </ul>
      </el-alert>

      <el-form ref="upgradeFormRef" :model="upgradeForm" :rules="upgradeRules" label-width="100px">
        <el-form-item label="新学年" prop="academicYear">
          <el-select v-model="upgradeForm.academicYear" placeholder="选择新学年">
            <el-option
              v-for="year in yearOptions"
              :key="year"
              :label="year"
              :value="year"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="升级日期" prop="upgradeDate">
          <el-date-picker
            v-model="upgradeForm.upgradeDate"
            type="date"
            v-bind="standardDatePickerProps"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="自动创建班级">
          <el-switch v-model="upgradeForm.createNewClasses" />
          <span class="upgrade-form-tip">如果新学年班级不存在，则自动创建</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="upgradeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmUpgrade">开始升级</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="historyDialogVisible" title="班级变更历史" width="600px">
      <el-timeline>
        <el-timeline-item
          v-for="item in classHistory"
          :key="item.id"
          :timestamp="item.enrollmentDate"
        >
          <el-card>
            <h4>{{ item.className }}</h4>
            <p>学年：{{ item.academicYear }}</p>
            <p v-if="item.isCurrent" style="color: #67c23a">
              <el-tag type="success" size="small">当前班级</el-tag>
            </p>
            <p v-if="item.leaveDate">
              离班时间：{{ item.leaveDate }}
              <br />
              原因：{{ getLeaveReasonText(item.leaveReason) }}
            </p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
  type TableInstance
} from 'element-plus'
import { Plus, Top } from '@element-plus/icons-vue'
import { classAPI } from '@/database/class-api'
import { LAST_GRADE_LEVEL } from '@/types/class'
import type {
  AcademicYear,
  AcademicYearInfo,
  ClassInfo,
  GradeLevel,
  GradeUpgradeRequest
} from '@/types/class'
import { getDatabase } from '@/database/init'
import { STANDARD_DATE_PICKER_PROPS } from '@/utils/date-picker'

type StudentFilterStatus = '' | 'unassigned' | 'assigned'
type GradeStage = 'kindergarten' | 'primary' | 'junior'

interface StudentRecord {
  id: number
  name: string
  gender: string
  birthday: string
  currentClassId?: number | null
  currentClassName?: string | null
}

interface GradeOption {
  value: GradeLevel
  label: string
  stage: GradeStage
}

interface ClassViewGroup {
  stage: GradeStage
  label: string
  classes: ClassInfo[]
}

const db = getDatabase()
const standardDatePickerProps = STANDARD_DATE_PICKER_PROPS

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

const STAGE_LABELS: Record<GradeStage, string> = {
  kindergarten: '幼儿园',
  primary: '小学',
  junior: '初中'
}

const statusTabs: Array<{ label: string; value: StudentFilterStatus }> = [
  { label: '全部学生', value: '' },
  { label: '未分班', value: 'unassigned' },
  { label: '已分班', value: 'assigned' }
]

const activeTab = ref<'assign' | 'classes'>('assign')
const filterStatus = ref<StudentFilterStatus>('')
const filterClass = ref<string | number>('')
const viewYear = ref<AcademicYear>(getCurrentAcademicYear())

const students = ref<StudentRecord[]>([])
const allClasses = ref<ClassInfo[]>([])
const classViewData = ref<ClassInfo[]>([])
const academicYears = ref<AcademicYearInfo[]>([])

const selectedStudents = ref<StudentRecord[]>([])
const currentStudent = ref<StudentRecord | null>(null)

const assignDialogVisible = ref(false)
const upgradeDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const isBatchAssign = ref(false)

const classHistory = ref<any[]>([])

const studentTableRef = ref<TableInstance>()
const assignFormRef = ref<FormInstance>()
const upgradeFormRef = ref<FormInstance>()

const assignForm = ref({
  academicYear: getCurrentAcademicYear(),
  classId: 0,
  enrollmentDate: new Date().toISOString().split('T')[0]
})

const upgradeForm = ref({
  academicYear: getNextAcademicYear(),
  upgradeDate: new Date().toISOString().split('T')[0],
  createNewClasses: true
})

const academicYearOptions = computed(() => academicYears.value.map(item => item.academicYear))
const yearOptions = computed<AcademicYear[]>(() =>
  academicYearOptions.value.length > 0 ? academicYearOptions.value : [getCurrentAcademicYear()]
)
const filterYearOptions = computed(() =>
  yearOptions.value.map(year => ({
    label: `学年 ${year}`,
    value: year
  }))
)
const preferredAcademicYear = computed<AcademicYear>(() =>
  academicYears.value.find(item => item.isActive)?.academicYear
  || yearOptions.value[0]
  || getCurrentAcademicYear()
)
const preferredNextAcademicYear = computed<AcademicYear>(() =>
  yearOptions.value.find(year => year > preferredAcademicYear.value)
  || getNextAcademicYear()
)

const availableClasses = computed(() => {
  return allClasses.value.filter(cls => cls.academicYear === assignForm.value.academicYear)
})

const allStudentsSelected = computed(() =>
  students.value.length > 0 && selectedStudents.value.length === students.value.length
)
const partiallySelected = computed(() =>
  selectedStudents.value.length > 0 && selectedStudents.value.length < students.value.length
)

const classViewGroups = computed<ClassViewGroup[]>(() => {
  const grouped = new Map<GradeStage, ClassInfo[]>()

  for (const cls of [...classViewData.value].sort((left, right) => {
    if (left.gradeLevel !== right.gradeLevel) {
      return left.gradeLevel - right.gradeLevel
    }
    return left.classNumber - right.classNumber
  })) {
    const stage = getGradeStage(cls.gradeLevel as GradeLevel)
    const bucket = grouped.get(stage) ?? []
    bucket.push(cls)
    grouped.set(stage, bucket)
  }

  return (['kindergarten', 'primary', 'junior'] as GradeStage[])
    .map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      classes: grouped.get(stage) ?? []
    }))
    .filter(group => group.classes.length > 0)
})

const assignRules: FormRules = {
  academicYear: [{ required: true, message: '请选择学年', trigger: 'change' }],
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  enrollmentDate: [{ required: true, message: '请选择入班日期', trigger: 'change' }]
}

const upgradeRules: FormRules = {
  academicYear: [{ required: true, message: '请选择新学年', trigger: 'change' }],
  upgradeDate: [{ required: true, message: '请选择升级日期', trigger: 'change' }]
}

function getNextAcademicYear(): AcademicYear {
  const current = getCurrentAcademicYear()
  const [startYear] = current.split('-').map(Number)
  const safeStartYear = startYear ?? new Date().getFullYear()
  return `${safeStartYear + 1}-${safeStartYear + 2}`
}

function getCurrentAcademicYear(): AcademicYear {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function getGradeLabel(gradeLevel: number): string {
  return GRADE_OPTIONS.find(option => option.value === gradeLevel)?.label ?? `${gradeLevel}年级`
}

function getGradeStage(gradeLevel: GradeLevel): GradeStage {
  return GRADE_OPTIONS.find(option => option.value === gradeLevel)?.stage ?? 'primary'
}

function formatGradeLabel(gradeLevel: number): string {
  return getGradeLabel(gradeLevel)
}

function getGradeUpgradeRangeText(): string {
  return `${formatGradeLabel(1)}至 ${formatGradeLabel(LAST_GRADE_LEVEL - 1)}`
}

function calculateAge(birthday: string): number {
  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getStudentInitial(name: string): string {
  return name?.trim().charAt(0) || '?'
}

function getStudentAvatarClass(gender: string): string {
  return gender === '女' ? 'is-female' : 'is-male'
}

function getEnrollmentPercent(cls: ClassInfo): number {
  if (!cls.maxStudents) return 0
  return Math.max(0, Math.min(100, Math.round((cls.currentEnrollment / cls.maxStudents) * 100)))
}

async function loadAcademicYears() {
  try {
    academicYears.value = classAPI.getAcademicYears()

    if (viewYear.value && !yearOptions.value.includes(viewYear.value)) {
      viewYear.value = preferredAcademicYear.value
    }
  } catch (error: any) {
    ElMessage.error(`加载学年列表失败: ${error.message}`)
  }
}

async function loadStudents() {
  try {
    let sql = `
      SELECT
        id,
        name,
        gender,
        birthday,
        current_class_id AS currentClassId,
        current_class_name AS currentClassName
      FROM student
      WHERE 1=1
    `
    const params: Array<string | number> = []

    if (filterStatus.value === 'unassigned') {
      sql += ' AND current_class_id IS NULL'
    } else if (filterStatus.value === 'assigned') {
      sql += ' AND current_class_id IS NOT NULL'
    }

    if (filterClass.value !== '') {
      sql += ' AND current_class_id = ?'
      params.push(filterClass.value)
    }

    sql += ' ORDER BY name'

    students.value = db.all(sql, params)
    selectedStudents.value = []
    await nextTick()
    studentTableRef.value?.clearSelection()
  } catch (error: any) {
    ElMessage.error(`加载学生列表失败: ${error.message}`)
  }
}

function loadClasses() {
  allClasses.value = classAPI.getClasses()
}

function loadClassView() {
  classViewData.value = classAPI.getClasses({ academicYear: viewYear.value })
}

function setStatusFilter(status: StudentFilterStatus) {
  filterStatus.value = status
  loadStudents()
}

function handleSelectionChange(selection: StudentRecord[]) {
  selectedStudents.value = selection
}

function toggleSelectAll(checked: boolean | string | number) {
  if (!studentTableRef.value) return

  studentTableRef.value.clearSelection()

  if (checked) {
    students.value.forEach(student => {
      studentTableRef.value?.toggleRowSelection(student, true)
    })
  }
}

function showAssignDialog(student: StudentRecord) {
  currentStudent.value = student
  isBatchAssign.value = false
  assignForm.value = {
    academicYear: preferredAcademicYear.value,
    classId: 0,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }
  assignDialogVisible.value = true
}

function showBatchAssignDialog() {
  if (selectedStudents.value.length === 0) return

  isBatchAssign.value = true
  assignForm.value = {
    academicYear: preferredAcademicYear.value,
    classId: 0,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }
  assignDialogVisible.value = true
}

async function confirmAssign() {
  if (!assignFormRef.value) return

  await assignFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (isBatchAssign.value) {
        const studentIds = selectedStudents.value.map(student => student.id)
        classAPI.assignStudentsBatch({
          studentIds,
          classId: assignForm.value.classId,
          academicYear: assignForm.value.academicYear,
          enrollmentDate: assignForm.value.enrollmentDate ?? new Date().toISOString().slice(0, 10)
        })
        ElMessage.success(`成功为 ${studentIds.length} 名学生分班`)
      } else if (currentStudent.value) {
        classAPI.assignStudentToClass(
          currentStudent.value.id,
          currentStudent.value.name,
          assignForm.value.classId,
          assignForm.value.academicYear,
          assignForm.value.enrollmentDate ?? new Date().toISOString().slice(0, 10)
        )
        ElMessage.success(currentStudent.value.currentClassName ? '调班成功' : '分班成功')
      }

      assignDialogVisible.value = false
      loadStudents()
      loadClasses()
      loadClassView()
    } catch (error: any) {
      ElMessage.error(`分班失败: ${error.message}`)
    }
  })
}

function showUpgradeDialog() {
  upgradeForm.value = {
    academicYear: preferredNextAcademicYear.value,
    upgradeDate: new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10),
    createNewClasses: true
  }
  upgradeDialogVisible.value = true
}

async function confirmUpgrade() {
  if (!upgradeFormRef.value) return

  await upgradeFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      await ElMessageBox.confirm(
        '确定要进行学年升级吗？此操作不可撤销。',
        '确认升级',
        { type: 'warning' }
      )

      const request: GradeUpgradeRequest = {
        academicYear: upgradeForm.value.academicYear,
        upgradeDate: upgradeForm.value.upgradeDate ?? new Date().toISOString().slice(0, 10),
        createNewClasses: upgradeForm.value.createNewClasses
      }

      const count = await classAPI.upgradeGrade(request)
      ElMessage.success(`学年升级完成，共处理 ${count} 名学生`)

      upgradeDialogVisible.value = false
      loadStudents()
      loadClasses()
      loadClassView()
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(`升级失败: ${error.message}`)
      }
    }
  })
}

function viewClassHistory(student: StudentRecord) {
  try {
    const info = classAPI.getStudentClassInfo(student.id)
    classHistory.value = info.history
    historyDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error(`加载班级历史失败: ${error.message}`)
  }
}

function getLeaveReasonText(reason: string | null): string {
  const reasons: Record<string, string> = {
    upgrade: '升学',
    transfer: '转学',
    adjust: '调整',
    graduate: '毕业'
  }
  return reasons[reason || ''] || reason || '-'
}

function viewClassStudents(cls: ClassInfo) {
  activeTab.value = 'assign'
  filterClass.value = cls.id
  loadStudents()
}

onMounted(() => {
  loadAcademicYears()
  loadStudents()
  loadClasses()
  loadClassView()
})
</script>

<style scoped>
.student-class-page {
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
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.status-pill-list {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.status-pill-list::-webkit-scrollbar {
  height: 6px;
}

.status-pill-list::-webkit-scrollbar-thumb {
  background: rgba(164, 157, 146, 0.55);
  border-radius: 999px;
}

.status-pill {
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

.status-pill:hover {
  color: var(--cm-text);
  border-color: #afcfff;
  transform: translateY(-1px);
}

.status-pill.is-active {
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
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(220, 223, 230, 0.9) inset;
}

.tabs {
  background: transparent;
}

.tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.student-list-card,
.class-view-card {
  border: none;
}

.student-list-card :deep(.el-card__header),
.class-view-card :deep(.el-card__header) {
  padding: 0 0 20px;
  border-bottom: none;
}

.student-list-card :deep(.el-card__body),
.class-view-card :deep(.el-card__body) {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-header > span:first-child {
  font-size: 20px;
  font-weight: 600;
  color: var(--cm-text);
}

.card-count {
  font-size: 14px;
  color: #909399;
}

.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.bulk-assign-button {
  border-radius: 999px;
}

.student-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.student-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.student-avatar.is-male {
  background: #e6f1fb;
  color: #185fa5;
}

.student-avatar.is-female {
  background: #fbeaf0;
  color: #993556;
}

.student-name {
  color: var(--cm-text);
  font-weight: 500;
}

.student-class-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1;
}

.student-class-badge.is-unassigned {
  background: #f4f4f5;
  color: #909399;
}

.student-class-badge.is-assigned {
  background: rgba(42, 160, 113, 0.12);
  color: var(--cm-success);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.assign-action-button {
  min-height: 34px;
  padding-inline: 16px;
  border-radius: 999px;
}

.student-history-link {
  appearance: none;
  border: none;
  background: transparent;
  color: #909399;
  font-size: 13px;
  padding: 0;
  cursor: pointer;
}

.student-history-link:hover {
  color: #606266;
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

.class-stage__header h3 {
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
  border-radius: 12px;
  padding: 16px;
  min-height: 156px;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.3s;
}

.class-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.class-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.class-card__top h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.capacity-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.class-card__status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
  color: #606266;
  font-size: 14px;
  margin-bottom: 12px;
}

.class-card__empty {
  color: #909399;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-flex;
  flex-shrink: 0;
}

.status-dot.is-active {
  background: var(--cm-success);
}

.capacity-progress {
  width: 100%;
  background: #ebeef5;
  border-radius: 999px;
  overflow: hidden;
}

.capacity-progress--thin {
  height: 3px;
}

.capacity-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #79bbff 0%, #409eff 100%);
  transition: width 0.24s ease;
}

.class-card__capacity {
  margin-top: 10px;
  color: #606266;
  font-size: 13px;
}

.class-empty-state {
  padding: 36px 0 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.batch-info {
  padding: 10px;
  background: #f5f7fa;
  border-radius: 8px;
}

.upgrade-form-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}

:deep(.el-table th.el-table__cell) {
  background: #fff;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table td.el-table__cell) {
  padding-top: 14px;
  padding-bottom: 14px;
}

@media (max-width: 900px) {
  .filter-toolbar__divider {
    display: none;
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
  .class-grid {
    grid-template-columns: 1fr;
  }

  .row-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
