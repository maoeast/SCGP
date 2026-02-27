<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>学生分班</h1>
        <p class="subtitle">管理学生班级分配与学年升级</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showBatchAssignDialog" :disabled="selectedStudents.length === 0">
          <el-icon><Plus /></el-icon>
          批量分班 ({{ selectedStudents.length }})
        </el-button>
        <el-button @click="showUpgradeDialog">
          <el-icon><Top /></el-icon>
          学年升级
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filterStatus" placeholder="学生状态" @change="loadStudents">
            <el-option label="全部学生" value="" />
            <el-option label="未分班" value="unassigned" />
            <el-option label="已分班" value="assigned" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterClass" placeholder="按班级筛选" @change="loadStudents">
            <el-option label="全部班级" value="" />
            <el-option
              v-for="cls in allClasses"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id"
            />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div class="main-content">
      <!-- 选项卡 -->
      <el-tabs v-model="activeTab" class="tabs">
        <!-- 分班管理 -->
        <el-tab-pane label="分班管理" name="assign">
          <!-- 学生列表 -->
          <el-card shadow="never" class="student-list-card">
            <template #header>
              <div class="card-header">
                <span>学生列表</span>
                <el-tag type="info">共 {{ students.length }} 名学生</el-tag>
              </div>
            </template>

            <el-table
              :data="students"
              stripe
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="name" label="姓名" width="120" />
              <el-table-column prop="gender" label="性别" width="80" />
              <el-table-column label="年龄" width="80">
                <template #default="{ row }">
                  {{ calculateAge(row.birthday) }}岁
                </template>
              </el-table-column>
              <el-table-column label="当前班级" width="150">
                <template #default="{ row }">
                  <el-tag v-if="row.currentClassName" type="success">
                    {{ row.currentClassName }}
                  </el-tag>
                  <el-tag v-else type="info">未分班</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="{ row }">
                  <el-button text type="primary" size="small" @click="showAssignDialog(row)">
                    {{ row.currentClassName ? '转班' : '分班' }}
                  </el-button>
                  <el-button text type="info" size="small" @click="viewClassHistory(row)">
                    班级历史
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>

        <!-- 班级视图 -->
        <el-tab-pane label="班级视图" name="classes">
          <el-card shadow="never" class="class-view-card">
            <template #header>
              <div class="card-header">
                <span>选择学年</span>
                <el-select v-model="viewYear" @change="loadClassView">
                  <el-option
                    v-for="year in academicYears"
                    :key="year"
                    :label="year"
                    :value="year"
                  />
                </el-select>
              </div>
            </template>

            <div class="class-grid">
              <div
                v-for="cls in classViewData"
                :key="cls.id"
                class="class-card"
                @click="viewClassStudents(cls)"
              >
                <div class="class-header">
                  <span class="class-name">{{ cls.name }}</span>
                  <el-tag :type="getClassTagType(cls)" size="small">
                    {{ cls.currentEnrollment }}/{{ cls.maxStudents }}
                  </el-tag>
                </div>
                <div class="class-info">
                  <p>{{ cls.gradeLevel }}年级 | {{ cls.classNumber }}班</p>
                </div>
              </div>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 单个/批量分班对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      :title="isBatchAssign ? '批量分班' : '学生分班'"
      width="500px"
    >
      <el-form :model="assignForm" :rules="assignRules" ref="assignFormRef" label-width="100px">
        <el-form-item label="选择学年" prop="academicYear">
          <el-select v-model="assignForm.academicYear" placeholder="选择学年">
            <el-option
              v-for="year in academicYears"
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

    <!-- 学年升级对话框 -->
    <el-dialog
      v-model="upgradeDialogVisible"
      title="学年升级"
      width="500px"
    >
      <el-alert
        title="升级说明"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <ul>
          <li>1-5年级学生将自动升级到下一年级</li>
          <li>6年级学生将标记为毕业</li>
          <li>请确保新学年的班级已创建</li>
        </ul>
      </el-alert>

      <el-form :model="upgradeForm" :rules="upgradeRules" ref="upgradeFormRef" label-width="100px">
        <el-form-item label="新学年" prop="academicYear">
          <el-select v-model="upgradeForm.academicYear" placeholder="选择新学年">
            <el-option
              v-for="year in academicYears"
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
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="自动创建班级">
          <el-switch v-model="upgradeForm.createNewClasses" />
          <span style="margin-left: 10px; color: #909399; font-size: 12px">
            如果新学年班级不存在，自动创建
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="upgradeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmUpgrade">开始升级</el-button>
      </template>
    </el-dialog>

    <!-- 班级历史对话框 -->
    <el-dialog
      v-model="historyDialogVisible"
      title="班级变更历史"
      width="600px"
    >
      <el-timeline>
        <el-timeline-item
          v-for="item in classHistory"
          :key="item.id"
          :timestamp="item.enrollmentDate"
        >
          <el-card>
            <h4>{{ item.className }}</h4>
            <p>学年: {{ item.academicYear }}</p>
            <p v-if="item.isCurrent" style="color: #67c23a">
              <el-tag type="success" size="small">当前班级</el-tag>
            </p>
            <p v-if="item.leaveDate">
              离班时间: {{ item.leaveDate }}
              <br />
              原因: {{ getLeaveReasonText(item.leaveReason) }}
            </p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { User, Plus, Top } from '@element-plus/icons-vue'
import { classAPI } from '@/database/class-api'
import type {
  ClassInfo,
  AcademicYear,
  ClassChangeRequest,
  GradeUpgradeRequest,
  StudentClassInfo,
  ClassChangeReason,
  getCurrentAcademicYear
} from '@/types/class'
import { getDatabase } from '@/database/init'

const router = useRouter()
const db = getDatabase()

// ========== 状态 ==========

const activeTab = ref('assign')
const filterStatus = ref('')
const filterClass = ref('')
const viewYear = ref<AcademicYear>(getCurrentAcademicYear())

const students = ref<any[]>([])
const allClasses = ref<ClassInfo[]>([])
const classViewData = ref<ClassInfo[]>([])
const academicYears = ref<AcademicYear[]>([])

const selectedStudents = ref<any[]>([])
const currentStudent = ref<any>(null)

const assignDialogVisible = ref(false)
const upgradeDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const isBatchAssign = ref(false)

const classHistory = ref<any[]>([])

// ========== 表单数据 ==========

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

// ========== 计算属性 ==========

const availableClasses = computed(() => {
  return allClasses.value.filter(cls => cls.academicYear === assignForm.value.academicYear)
})

// ========== 表单规则 ==========

const assignRules: FormRules = {
  academicYear: [{ required: true, message: '请选择学年', trigger: 'change' }],
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  enrollmentDate: [{ required: true, message: '请选择入班日期', trigger: 'change' }]
}

const upgradeRules: FormRules = {
  academicYear: [{ required: true, message: '请选择新学年', trigger: 'change' }],
  upgradeDate: [{ required: true, message: '请选择升级日期', trigger: 'change' }]
}

const assignFormRef = ref<FormInstance>()
const upgradeFormRef = ref<FormInstance>()

// ========== 方法 ==========

function getNextAcademicYear(): AcademicYear {
  const current = getCurrentAcademicYear()
  const [startYear] = current.split('-').map(Number)
  return `${startYear + 1}-${startYear + 2}`
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

function getCurrentAcademicYear(): AcademicYear {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

async function loadStudents() {
  try {
    let sql = 'SELECT id, name, gender, birthday, current_class_id, current_class_name FROM student WHERE 1=1'
    const params: any[] = []

    if (filterStatus.value === 'unassigned') {
      sql += ' AND current_class_id IS NULL'
    } else if (filterStatus.value === 'assigned') {
      sql += ' AND current_class_id IS NOT NULL'
    }

    if (filterClass.value) {
      sql += ' AND current_class_id = ?'
      params.push(filterClass.value)
    }

    sql += ' ORDER BY name'

    students.value = db.all(sql, params)
  } catch (error: any) {
    ElMessage.error('加载学生列表失败: ' + error.message)
  }
}

function loadClasses() {
  allClasses.value = classAPI.getClasses()

  // 提取所有学年
  const yearSet = new Set<AcademicYear>()
  allClasses.value.forEach(cls => yearSet.add(cls.academicYear))
  academicYears.value = Array.from(yearSet).sort()
}

function loadClassView() {
  classViewData.value = classAPI.getClasses({ academicYear: viewYear.value })
}

function handleSelectionChange(selection: any[]) {
  selectedStudents.value = selection
}

function showAssignDialog(student: any) {
  currentStudent.value = student
  isBatchAssign.value = false
  assignForm.value = {
    academicYear: getCurrentAcademicYear(),
    classId: 0,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }
  assignDialogVisible.value = true
}

function showBatchAssignDialog() {
  isBatchAssign.value = true
  assignForm.value = {
    academicYear: getCurrentAcademicYear(),
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
        // 批量分班
        const studentIds = selectedStudents.value.map(s => s.id)
        classAPI.assignStudentsBatch({
          studentIds,
          classId: assignForm.value.classId,
          academicYear: assignForm.value.academicYear,
          enrollmentDate: assignForm.value.enrollmentDate
        })
        ElMessage.success(`成功为 ${studentIds.length} 名学生分班`)
      } else {
        // 单个分班
        classAPI.assignStudentToClass(
          currentStudent.value.id,
          currentStudent.value.name,
          assignForm.value.classId,
          assignForm.value.academicYear,
          assignForm.value.enrollmentDate
        )
        ElMessage.success('分班成功')
      }

      assignDialogVisible.value = false
      loadStudents()
      loadClasses()
    } catch (error: any) {
      ElMessage.error('分班失败: ' + error.message)
    }
  })
}

function showUpgradeDialog() {
  upgradeForm.value = {
    academicYear: getNextAcademicYear(),
    upgradeDate: new Date().toISOString().split('T')[0],
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
        upgradeDate: upgradeForm.value.upgradeDate,
        createNewClasses: upgradeForm.value.createNewClasses
      }

      const count = classAPI.upgradeGrade(request)
      ElMessage.success(`学年升级完成，共处理 ${count} 名学生`)

      upgradeDialogVisible.value = false
      loadStudents()
      loadClasses()
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error('升级失败: ' + error.message)
      }
    }
  })
}

function viewClassHistory(student: any) {
  try {
    const info = classAPI.getStudentClassInfo(student.id)
    classHistory.value = info.history
    historyDialogVisible.value = true
  } catch (error: any) {
    ElMessage.error('加载班级历史失败: ' + error.message)
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
  // 切换到分班管理标签，并筛选该班级
  activeTab.value = 'assign'
  filterClass.value = String(cls.id)
  loadStudents()
}

function getClassTagType(cls: ClassInfo) {
  const ratio = cls.currentEnrollment / cls.maxStudents
  if (ratio >= 0.9) return 'danger'
  if (ratio >= 0.7) return 'warning'
  return undefined
}

// ========== 生命周期 ==========

onMounted(() => {
  loadStudents()
  loadClasses()
  loadClassView()
})
</script>

<style scoped>
/* Tab 样式 */
.tabs {
  background: transparent;
}

.filter-card,
.student-list-card,
.class-view-card {
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-info {
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.class-card {
  padding: 16px;
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.class-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.class-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.class-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}
</style>
