<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>班级管理</h1>
        <p class="subtitle">管理全校行政班级与学生分配</p>
      </div>
      <div class="header-right">
        <el-button v-if="isAdmin" @click="showAcademicYearManagementDialog">
          <el-icon><Calendar /></el-icon>
          学年管理
        </el-button>
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建班级
        </el-button>
        <el-button @click="showBatchCreateDialog">
          <el-icon><DocumentCopy /></el-icon>
          批量创建
        </el-button>
      </div>
    </div>

    <div class="content">
      <!-- 筛选区域 -->
      <div class="filter-section">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-select v-model="filterYear" placeholder="选择学年" @change="loadData">
              <el-option label="全部学年" value="" />
              <el-option
                v-for="year in academicYearOptions"
                :key="year"
                :label="year"
                :value="year"
              />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="filterGrade" placeholder="选择年级" @change="loadData">
              <el-option label="全部年级" value="" />
              <el-option-group
                v-for="group in gradeGroups"
                :key="group.label"
                :label="group.label"
              >
                <el-option
                  v-for="grade in group.options"
                  :key="grade.value"
                  :label="grade.label"
                  :value="grade.value"
                />
              </el-option-group>
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="filterModule" placeholder="业务模块" @change="loadStatistics">
              <el-option label="全部模块" value="all" />
              <el-option
                v-for="module in availableModules"
                :key="module.code"
                :label="module.name"
                :value="module.code"
              />
            </el-select>
          </el-col>
        </el-row>
      </div>

      <!-- 班级列表 -->
      <el-card shadow="never" class="class-list-card">
        <template #header>
          <div class="card-header">
            <span>班级列表</span>
            <el-tag type="info">共 {{ totalClasses }} 个班级</el-tag>
          </div>
        </template>

        <el-table :data="classGroups" stripe>
          <el-table-column label="年级" width="100">
            <template #default="{ row }">
              <el-tag type="primary">{{ row.gradeLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="班级">
            <template #default="{ row }">
              <div class="class-items">
                <el-tag
                  v-for="cls in row.classes"
                  :key="cls.id"
                  class="class-tag"
                  :type="getClassTagType(cls)"
                  @click="viewClassDetail(cls)"
                >
                  {{ cls.name }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="在籍人数" width="120">
            <template #default="{ row }">
              <div class="class-items">
                <span v-for="cls in row.classes" :key="cls.id" class="student-count">
                  {{ cls.currentEnrollment }}/{{ cls.maxStudents }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <div class="class-items">
                <el-tag
                  v-for="cls in row.classes"
                  :key="cls.id"
                  :type="cls.status === 1 ? 'success' : 'info'"
                  size="small"
                >
                  {{ cls.status === 1 ? '激活' : '停用' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250">
            <template #default="{ row }">
              <div class="action-buttons">
                <template v-for="cls in row.classes" :key="cls.id">
                  <el-button text type="primary" size="small" @click="viewClassStudents(cls)">
                    学生
                  </el-button>
                  <el-button text type="primary" size="small" @click="editClass(cls)">
                    编辑
                  </el-button>
                  <el-button v-if="isAdmin" text type="success" size="small" @click="manageClassTeachers(cls)">
                    分配老师
                  </el-button>
                  <el-button text type="danger" size="small" @click="deleteClass(cls)">
                    删除
                  </el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 统计面板 -->
      <el-card shadow="never" class="stats-card" v-if="statistics.length > 0">
        <template #header>
          <div class="card-header">
            <span>统计概览 - {{ currentModuleName }}</span>
            <el-tag type="info">{{ statistics.length }} 个班级</el-tag>
          </div>
        </template>

        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="总训练次数" :value="totalTrainingCount">
              <template #suffix>次</template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="总评估次数" :value="totalAssessmentCount">
              <template #suffix>次</template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-tooltip :content="averageScoreTooltip" placement="top">
              <template v-if="averageScore !== null">
                <el-statistic title="平均分" :value="averageScore">
                  <template #suffix>分</template>
                </el-statistic>
              </template>
              <template v-else>
                <div class="statistic-empty">
                  <div class="statistic-empty__label">平均分</div>
                  <div class="statistic-empty__value">—</div>
                </div>
              </template>
            </el-tooltip>
          </el-col>
          <el-col :span="6">
            <el-statistic title="活跃班级" :value="activeClassesCount">
              <template #suffix>个</template>
            </el-statistic>
          </el-col>
        </el-row>

        <el-divider />

        <!-- 班级统计详情表格 -->
        <el-table :data="statistics" stripe size="small" max-height="400">
          <el-table-column label="班级" prop="className" width="120" />
          <el-table-column label="年级" width="80">
            <template #default="{ row }">
              {{ formatGradeLabel(row.gradeLevel) }}
            </template>
          </el-table-column>
          <el-table-column label="在籍人数" prop="totalStudents" width="80" />
          <el-table-column label="训练次数" prop="totalTrainingCount" width="80" sortable />
          <el-table-column label="评估次数" prop="totalAssessmentCount" width="80" sortable />
          <el-table-column label="平均分" width="80" sortable>
            <template #default="{ row }">
              {{ row.averageScore ? row.averageScore.toFixed(1) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="最近活动" width="110">
            <template #default="{ row }">
              {{ row.lastActivityDate ? formatDate(row.lastActivityDate) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="活跃学生" width="100">
            <template #default="{ row }">
              训练: {{ row.activeStudentsTraining }} / 评估: {{ row.activeStudentsAssessment }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 新建/编辑班级对话框 -->
    <el-dialog
      v-model="classDialogVisible"
      :title="isEditMode ? '编辑班级' : '新建班级'"
      width="500px"
    >
      <el-form :model="classForm" :rules="classRules" ref="classFormRef" label-width="100px">
        <el-form-item label="学年" prop="academicYear">
            <el-select v-model="classForm.academicYear" placeholder="选择学年">
              <el-option
                v-for="year in academicYearOptions"
                :key="year"
                :label="year"
                :value="year"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="年级" prop="gradeLevel">
          <el-select v-model="classForm.gradeLevel" placeholder="选择年级">
            <el-option-group
              v-for="group in gradeGroups"
              :key="group.label"
              :label="group.label"
            >
              <el-option
                v-for="grade in group.options"
                :key="grade.value"
                :label="grade.label"
                :value="grade.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="班号" prop="classNumber">
          <el-select v-model="classForm.classNumber" placeholder="选择班号">
            <el-option
              v-for="num in classNumbers"
              :key="num"
              :label="`${num}班`"
              :value="num"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="最大人数" prop="maxStudents">
          <el-input-number v-model="classForm.maxStudents" :min="1" :max="50" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="classForm.useCustomName">使用自定义名称</el-checkbox>
        </el-form-item>
        <el-form-item label="班级名称" prop="customName">
          <el-input
            v-if="classForm.useCustomName"
            v-model="classForm.customName"
            placeholder="请输入自定义班级名称"
            maxlength="50"
            show-word-limit
          />
          <el-input v-else :value="generatedClassName" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="classDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveClass">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量创建班级对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量创建班级"
      width="500px"
    >
      <el-form :model="batchForm" :rules="batchRules" ref="batchFormRef" label-width="100px">
        <el-form-item label="学年" prop="academicYear">
            <el-select v-model="batchForm.academicYear" placeholder="选择学年">
              <el-option
                v-for="year in academicYearOptions"
                :key="year"
                :label="year"
                :value="year"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="年级范围" prop="grades">
          <el-checkbox-group v-model="batchForm.grades">
            <div
              v-for="group in gradeGroups"
              :key="group.label"
              class="grade-group"
            >
              <div class="grade-group__label">{{ group.label }}</div>
              <div class="grade-group__options">
                <el-checkbox
                  v-for="grade in group.options"
                  :key="grade.value"
                  :value="grade.value"
                >
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

    <el-dialog
      v-model="academicYearManagementVisible"
      title="学年管理"
      width="760px"
    >
      <div class="academic-year-toolbar">
        <el-button type="primary" @click="showAcademicYearFormDialog()">
          新增学年
        </el-button>
      </div>

      <el-table :data="academicYears" stripe>
        <el-table-column prop="academicYear" label="学年" min-width="130" />
        <el-table-column prop="startDate" label="开始日期" width="120" />
        <el-table-column prop="endDate" label="结束日期" width="120" />
        <el-table-column prop="classCount" label="班级数" width="90" />
        <el-table-column prop="studentCount" label="学生数" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '当前学年' : '普通学年' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button text type="primary" @click="showAcademicYearFormDialog(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog
      v-model="academicYearFormDialogVisible"
      :title="academicYearForm.id ? '编辑学年' : '新增学年'"
      width="420px"
    >
      <el-form
        ref="academicYearFormRef"
        :model="academicYearForm"
        :rules="academicYearRules"
        label-width="100px"
      >
        <el-form-item label="学年" prop="academicYear">
          <el-input
            v-model="academicYearForm.academicYear"
            placeholder="例如 2026-2027"
            maxlength="9"
          />
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

    <!-- 班级学生列表对话框 -->
    <el-dialog
      v-model="studentsDialogVisible"
      :title="`${currentClass?.name} - 学生列表`"
      width="700px"
    >
      <div class="class-info">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="年级">{{ currentClass ? formatGradeLabel(currentClass.gradeLevel) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="班号">{{ currentClass?.classNumber }}班</el-descriptions-item>
          <el-descriptions-item label="在籍人数">{{ students.length }}人</el-descriptions-item>
        </el-descriptions>
      </div>

      <el-table :data="students" stripe>
        <el-table-column prop="studentName" label="姓名" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="{ row }">
            {{ row.gender }}
          </template>
        </el-table-column>
        <el-table-column prop="enrollmentDate" label="入班日期" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="removeStudent(row)">
              移出班级
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="studentsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="addStudents">添加学生</el-button>
      </template>
    </el-dialog>

    <!-- 分配老师对话框 -->
    <el-dialog
      v-model="teacherDialogVisible"
      :title="`${currentClass?.name} - 分配老师`"
      width="600px"
    >
      <div class="class-info mb-4">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="班级">{{ currentClass?.name }}</el-descriptions-item>
          <el-descriptions-item label="学年">{{ currentClass?.academicYear }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="teacher-assignment">
        <div class="mb-4">
          <h4>已分配老师</h4>
          <el-tag
            v-for="teacher in currentClassTeachers"
            :key="teacher.id"
            closable
            @close="removeTeacher(teacher)"
            class="mr-2 mb-2"
          >
            {{ teacher.teacherName }}
          </el-tag>
          <el-empty v-if="currentClassTeachers.length === 0" description="暂未分配老师" :image-size="60" />
        </div>

        <el-divider />

        <div>
          <h4>添加老师</h4>
          <el-select
            v-model="selectedTeacherId"
            placeholder="选择老师"
            style="width: 100%"
            @change="addTeacher"
          >
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, DocumentCopy, Calendar } from '@element-plus/icons-vue'
import { classAPI } from '@/database/class-api'
import {
  DEFAULT_GRADE_LEVEL,
  GRADE_LEVELS,
  GRADE_OPTION_GROUPS,
  generateClassName,
  getGradeLabel
} from '@/types/class'
import { useAuthStore } from '@/stores/auth'
import { getAllTrainingEntries, type TrainingEntryCode } from '@/utils/training-entry'
import type {
  ClassInfo,
  CreateClassParams,
  UpdateClassParams,
  AcademicYearInfo,
  CreateAcademicYearParams,
  UpdateAcademicYearParams,
  GradeLevel,
  ClassNumber,
  AcademicYear,
  ClassStudentItem,
  ClassTeacher,
  UnifiedClassStatistics
} from '@/types/class'

const router = useRouter()
const authStore = useAuthStore()

// ========== 状态 ==========

const filterYear = ref<AcademicYear>('')
const filterGrade = ref<GradeLevel | ''>('')
const filterModule = ref<'all' | TrainingEntryCode>('all')
const classes = ref<ClassInfo[]>([])
const academicYears = ref<AcademicYearInfo[]>([])

// 统计数据状态
const statistics = ref<UnifiedClassStatistics[]>([])

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

const academicYearOptions = computed(() => academicYears.value.map(item => item.academicYear))
const preferredAcademicYear = computed<AcademicYear>(() =>
  academicYears.value.find(item => item.isActive)?.academicYear
  || academicYearOptions.value[0]
  || getCurrentAcademicYear()
)

// ========== 可用模块列表 ==========
const availableModules = computed(() => {
  return getAllTrainingEntries().filter(entry => authStore.hasModuleAccess(entry.moduleCode))
})

const selectedTrainingEntry = computed(() => {
  if (filterModule.value === 'all') {
    return null
  }

  return availableModules.value.find(module => module.code === filterModule.value) ?? null
})

// 当前模块名称（用于显示）
const currentModuleName = computed(() => {
  return selectedTrainingEntry.value?.name || '全部模块'
})

// ========== 计算属性 ==========

const isAdmin = computed(() => authStore.isAdmin)

// 统计汇总计算
const totalTrainingCount = computed(() =>
  statistics.value.reduce((sum, s) => sum + s.totalTrainingCount, 0)
)
const totalAssessmentCount = computed(() =>
  statistics.value.reduce((sum, s) => sum + s.totalAssessmentCount, 0)
)

// 修改：全部模块模式下不显示混合平均分，显示为 null
const averageScore = computed(() => {
  // 全部模式下不计算混合平均分（因为不同模块分值类型不同）
  if (filterModule.value === 'all') {
    return null
  }

  const scores = statistics.value.filter(s => s.averageScore !== null).map(s => s.averageScore!)
  if (scores.length === 0) return null
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
})

// 平均分提示信息
const averageScoreTooltip = computed(() => {
  if (filterModule.value === 'all') {
    return '全部模式下不显示混合平均分（不同模块分值类型不同）'
  }
  if (averageScore.value === null) {
    return '暂无数据'
  }
  return `当前模块平均分: ${averageScore.value.toFixed(1)}`
})

const activeClassesCount = computed(() =>
  statistics.value.filter(s => s.totalTrainingCount > 0 || s.totalAssessmentCount > 0).length
)

// ========== 表单数据 ==========

interface ClassForm {
  id?: number
  academicYear: AcademicYear
  gradeLevel: GradeLevel
  classNumber: ClassNumber
  maxStudents: number
  useCustomName: boolean
  customName: string
}

interface AcademicYearFormState {
  id?: number
  academicYear: AcademicYear
  isActive: boolean
}

const classForm = ref<ClassForm>({
  academicYear: getCurrentAcademicYear(),
  gradeLevel: DEFAULT_GRADE_LEVEL,
  classNumber: 1,
  maxStudents: 50,
  useCustomName: false,
  customName: ''
})

const batchForm = ref({
  academicYear: getCurrentAcademicYear(),
  grades: [DEFAULT_GRADE_LEVEL] as GradeLevel[],
  classesPerGrade: 3,
  maxStudents: 50
})

const academicYearForm = ref<AcademicYearFormState>({
  academicYear: getCurrentAcademicYear(),
  isActive: false
})

// ========== 计算属性 ==========
const gradeGroups = GRADE_OPTION_GROUPS

const classNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as ClassNumber[]

const generatedClassName = computed(() => {
  return generateClassName(classForm.value.gradeLevel, classForm.value.classNumber)
})

const totalClasses = computed(() => classes.value.length)

const classGroups = computed(() => {
  const groups: Record<number, { gradeLabel: string; gradeLevel: number; classes: ClassInfo[] }> = {}

  for (const cls of classes.value) {
    if (!groups[cls.gradeLevel]) {
      groups[cls.gradeLevel] = {
        gradeLabel: getGradeLabel(cls.gradeLevel),
        gradeLevel: cls.gradeLevel,
        classes: []
      }
    }
    const group = groups[cls.gradeLevel]
    if (group) {
      group.classes.push(cls)
    }
  }

  return Object.values(groups).sort((a, b) => a.gradeLevel - b.gradeLevel)
})

// ========== 表单规则 ==========

const classRules: FormRules = {
  academicYear: [{ required: true, message: '请选择学年', trigger: 'change' }],
  gradeLevel: [{ required: true, message: '请选择年级', trigger: 'change' }],
  classNumber: [{ required: true, message: '请选择班号', trigger: 'change' }],
  maxStudents: [{ required: true, message: '请输入最大人数', trigger: 'blur' }],
  customName: [
    {
      validator: (rule, value, callback) => {
        // 只有启用自定义名称时才验证
        if (classForm.value.useCustomName) {
          if (!value || !value.trim()) {
            callback(new Error('请输入自定义班级名称'))
          } else if (value.trim().length > 50) {
            callback(new Error('班级名称不能超过50个字符'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const batchRules: FormRules = {
  academicYear: [{ required: true, message: '请选择学年', trigger: 'change' }],
  grades: [{ required: true, message: '请选择年级', trigger: 'change' }],
  classesPerGrade: [{ required: true, message: '请输入每个年级班数', trigger: 'blur' }]
}

const academicYearRules: FormRules = {
  academicYear: [
    { required: true, message: '请输入学年', trigger: 'blur' },
    {
      pattern: /^\d{4}-\d{4}$/,
      message: '学年格式必须为 YYYY-YYYY',
      trigger: 'blur'
    }
  ]
}

const classFormRef = ref<FormInstance>()
const batchFormRef = ref<FormInstance>()
const academicYearFormRef = ref<FormInstance>()

// ========== 方法 ==========

function getCurrentAcademicYear(): AcademicYear {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

async function loadAcademicYears() {
  try {
    academicYears.value = classAPI.getAcademicYears()

    if (filterYear.value && !academicYearOptions.value.includes(filterYear.value)) {
      filterYear.value = ''
    }
  } catch (error: any) {
    ElMessage.error('加载学年列表失败: ' + error.message)
  }
}

// 加载班级列表
async function loadData() {
  try {
    const options: any = {}
    if (filterYear.value) options.academicYear = filterYear.value
    if (filterGrade.value !== '') options.gradeLevel = filterGrade.value

    classes.value = classAPI.getClasses(options)

    // 加载统计数据
    loadStatistics()
  } catch (error: any) {
    ElMessage.error('加载班级列表失败: ' + error.message)
  }
}

// 加载统计数据
function loadStatistics() {
  try {
    const options: any = {}
    if (selectedTrainingEntry.value) {
      options.moduleCode = selectedTrainingEntry.value.moduleCode
    }
    if (filterYear.value) options.academicYear = filterYear.value
    if (filterGrade.value !== '') options.gradeLevel = filterGrade.value

    statistics.value = classAPI.getStatistics(options)

    // 调试：打印统计结果
    console.log('[ClassManagement] 统计数据加载完成:', {
      filter: { module: filterModule.value, year: filterYear.value, grade: filterGrade.value },
      count: statistics.value.length,
      stats: statistics.value
    })
  } catch (error: any) {
    console.warn('[ClassManagement] 加载统计数据失败:', error)
    statistics.value = []
  }
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatGradeLabel(gradeLevel: number): string {
  return getGradeLabel(gradeLevel)
}

function getSuggestedAcademicYear(): AcademicYear {
  const latestAcademicYear = academicYearOptions.value[0] || getCurrentAcademicYear()
  const [startYear] = latestAcademicYear.split('-').map(Number)
  const safeStartYear = startYear || new Date().getFullYear()
  return `${safeStartYear + 1}-${safeStartYear + 2}`
}

function showCreateDialog() {
  isEditMode.value = false
  classForm.value = {
    academicYear: preferredAcademicYear.value,
    gradeLevel: DEFAULT_GRADE_LEVEL,
    classNumber: 1,
    maxStudents: 50,
    useCustomName: false,
    customName: ''
  }
  classDialogVisible.value = true
}

function editClass(cls: ClassInfo) {
  isEditMode.value = true
  classForm.value = {
    id: cls.id,
    academicYear: cls.academicYear,
    gradeLevel: cls.gradeLevel,
    classNumber: cls.classNumber,
    maxStudents: cls.maxStudents,
    useCustomName: false,  // 编辑时不支持修改名称
    customName: ''
  }
  classDialogVisible.value = true
}

async function saveClass() {
  if (!classFormRef.value) return

  await classFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (isEditMode.value && classForm.value.id) {
        // 更新班级
        const params: UpdateClassParams = {
          id: classForm.value.id,
          maxStudents: classForm.value.maxStudents
        }
        await classAPI.updateClass(params)
        ElMessage.success('班级更新成功')
      } else {
        // 创建班级
        const params: CreateClassParams = {
          academicYear: classForm.value.academicYear,
          gradeLevel: classForm.value.gradeLevel,
          classNumber: classForm.value.classNumber,
          maxStudents: classForm.value.maxStudents,
          // 如果启用自定义名称且输入不为空，使用自定义名称
          name: (classForm.value.useCustomName && classForm.value.customName.trim())
            ? classForm.value.customName.trim()
            : undefined
        }
        await classAPI.createClass(params)
        ElMessage.success('班级创建成功')
      }

      classDialogVisible.value = false
      await loadAcademicYears()
      loadData()
    } catch (error: any) {
      // 针对不同类型的错误显示不同的提示
      const errorMessage = error.message || String(error)

      if (errorMessage.includes('已存在') || errorMessage.includes('UNIQUE constraint')) {
        ElMessage.error({
          message: '班级创建失败：该学年、年级和班号的组合已存在',
          duration: 4000,
          showClose: true
        })
      } else {
        ElMessage.error({
          message: `操作失败：${errorMessage}`,
          duration: 3000,
          showClose: true
        })
      }

      console.error('[ClassManagement] 保存班级失败:', error)
    }
  })
}

async function deleteClass(cls: ClassInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要删除班级"${cls.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )

    await classAPI.deleteClass(cls.id)
    ElMessage.success('班级删除成功')
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

function showBatchCreateDialog() {
  batchForm.value = {
    academicYear: preferredAcademicYear.value,
    grades: [...GRADE_LEVELS] as GradeLevel[],
    classesPerGrade: 3,
    maxStudents: 50
  }
  batchDialogVisible.value = true
}

async function batchCreateClasses() {
  if (!batchFormRef.value) return

  await batchFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const paramsArray: CreateClassParams[] = []

      for (const grade of batchForm.value.grades) {
        for (let i = 1; i <= batchForm.value.classesPerGrade; i++) {
          paramsArray.push({
            academicYear: batchForm.value.academicYear,
            gradeLevel: grade,
            classNumber: i as ClassNumber,
            maxStudents: batchForm.value.maxStudents
          })
        }
      }

      const createdIds = await classAPI.createClassesBatch(paramsArray)
      const createdCount = createdIds.length
      const totalCount = paramsArray.length
      const skippedCount = totalCount - createdCount

      if (skippedCount > 0) {
        ElMessage.warning({
          message: `成功创建 ${createdCount} 个班级，跳过 ${skippedCount} 个已存在的班级`,
          duration: 5000,
          showClose: true
        })
      } else {
        ElMessage.success(`成功创建 ${createdCount} 个班级`)
      }

      batchDialogVisible.value = false
      await loadAcademicYears()
      loadData()
    } catch (error: any) {
      const errorMessage = error.message || String(error)

      ElMessage.error({
        message: `批量创建失败：${errorMessage}`,
        duration: 4000,
        showClose: true
      })

      console.error('[ClassManagement] 批量创建班级失败:', error)
    }
  })
}

function showAcademicYearManagementDialog() {
  loadAcademicYears()
  academicYearManagementVisible.value = true
}

function showAcademicYearFormDialog(record?: AcademicYearInfo) {
  academicYearForm.value = record
    ? {
      id: record.id,
      academicYear: record.academicYear,
      isActive: record.isActive
    }
    : {
      academicYear: getSuggestedAcademicYear(),
      isActive: academicYears.value.length === 0
    }

  academicYearFormDialogVisible.value = true
}

async function saveAcademicYear() {
  if (!academicYearFormRef.value) return

  await academicYearFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (academicYearForm.value.id) {
        const params: UpdateAcademicYearParams = {
          id: academicYearForm.value.id,
          academicYear: academicYearForm.value.academicYear.trim(),
          isActive: academicYearForm.value.isActive
        }
        await classAPI.updateAcademicYear(params)
        ElMessage.success('学年更新成功')
      } else {
        const params: CreateAcademicYearParams = {
          academicYear: academicYearForm.value.academicYear.trim(),
          isActive: academicYearForm.value.isActive
        }
        await classAPI.createAcademicYear(params)
        ElMessage.success('学年创建成功')
      }

      academicYearFormDialogVisible.value = false
      await loadAcademicYears()
      await loadData()
    } catch (error: any) {
      ElMessage.error('学年保存失败: ' + error.message)
    }
  })
}

function viewClassStudents(cls: ClassInfo) {
  currentClass.value = cls
  students.value = classAPI.getClassStudents(cls.id)
  studentsDialogVisible.value = true
}

function viewClassDetail(cls: ClassInfo) {
  viewClassStudents(cls)
}

async function removeStudent(student: ClassStudentItem) {
  try {
    await ElMessageBox.confirm(
      `确定要将学生"${student.studentName}"移出班级吗？`,
      '确认移出',
      { type: 'warning' }
    )

    // TODO: 实现移出班级功能
    ElMessage.info('功能开发中')
  } catch (error) {
    // 用户取消
  }
}

function addStudents() {
  ElMessage.info('请到学生分班页面添加学生')
  studentsDialogVisible.value = false
  // 跳转到学生分班页面
  router.push('/student-class-assignment')
}

function getClassTagType(cls: ClassInfo) {
  const ratio = cls.currentEnrollment / cls.maxStudents
  if (ratio >= 0.9) return 'danger'
  if (ratio >= 0.7) return 'warning'
  return 'success'
}

// ========== 老师分配 ==========

function manageClassTeachers(cls: ClassInfo) {
  currentClass.value = cls
  loadClassTeachers(cls.id)
  loadAvailableTeachers()
  teacherDialogVisible.value = true
}

function loadClassTeachers(classId: number) {
  try {
    currentClassTeachers.value = classAPI.getClassTeachers(classId)
  } catch (error: any) {
    ElMessage.error('加载老师列表失败: ' + error.message)
    currentClassTeachers.value = []
  }
}

function loadAvailableTeachers() {
  try {
    availableTeachers.value = classAPI.getAvailableTeachers()
  } catch (error: any) {
    ElMessage.error('加载可用老师失败: ' + error.message)
    availableTeachers.value = []
  }
}

function isTeacherAssigned(teacherId: number): boolean {
  return currentClassTeachers.value.some(t => t.teacherId === teacherId)
}

function addTeacher() {
  if (!selectedTeacherId.value || !currentClass.value) return

  try {
    classAPI.assignTeacherToClass(
      currentClass.value.id,
      selectedTeacherId.value,
      authStore.user?.id
    )
    ElMessage.success('老师分配成功')
    loadClassTeachers(currentClass.value.id)
    selectedTeacherId.value = null
  } catch (error: any) {
    ElMessage.error('分配失败: ' + error.message)
  }
}

function removeTeacher(teacher: ClassTeacher) {
  if (!currentClass.value) return

  ElMessageBox.confirm(
    `确定要从班级中移除老师"${teacher.teacherName}"吗？`,
    '确认移除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    try {
      classAPI.removeTeacherFromClass(currentClass.value!.id, teacher.teacherId)
      ElMessage.success('老师已移除')
      loadClassTeachers(currentClass.value!.id)
    } catch (error: any) {
      ElMessage.error('移除失败: ' + error.message)
    }
  }).catch(() => {
    // 用户取消
  })
}

// ========== 生命周期 ==========

onMounted(() => {
  loadAcademicYears()
  loadData()
})
</script>

<style scoped>
.content {
  flex: 1;
  min-height: 0;
}

.class-list-card,
.stats-card {
  margin-bottom: 20px;
}

.stats-card :deep(.el-statistic__head) {
  font-size: 14px;
  color: #909399;
}

.stats-card :deep(.el-statistic__content) {
  font-size: 24px;
  font-weight: 600;
}

/* 空数据状态样式（替代 el-statistic 的空值显示） */
.statistic-empty {
  text-align: center;
}

.statistic-empty__label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.statistic-empty__value {
  font-size: 24px;
  font-weight: 600;
  color: #909399;
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

.class-items {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.class-tag {
  cursor: pointer;
}

.student-count {
  font-size: 14px;
  color: #606266;
  min-width: 60px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.class-info {
  margin-bottom: 20px;
}

.academic-year-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.grade-group {
  width: 100%;
  padding: 8px 0;
}

.grade-group__label {
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
}

.grade-group__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}
</style>
