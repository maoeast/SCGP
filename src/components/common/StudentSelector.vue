<template>
  <div class="page-container scgp-admin-page student-selector-page">
    <div class="page-header">
      <div class="header-left">
        <h1>{{ title }}</h1>
        <p class="subtitle">{{ moduleTag?.description || '选择学生开始对应训练或评估。' }}</p>
      </div>
      <div class="header-right">
        <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
      </div>
    </div>

    <div class="main-content scgp-page-panel student-selector-panel">
      <div v-if="moduleTag" class="module-info">
        <el-tag :type="moduleTag.type" size="large">{{ moduleTag.label }}</el-tag>
        <span class="module-desc">{{ moduleTag.description }}</span>
      </div>

      <div class="student-search">
        <el-input
          v-model="searchText"
          placeholder="搜索学生姓名或学号"
          :prefix-icon="Search"
          clearable
          @input="handleSearch"
        />
        <el-button type="primary" :icon="Plus" @click="showAddDialog">
          添加新学生
        </el-button>
      </div>

      <div v-if="!loading && filteredStudents.length === 0" class="student-selector-empty scgp-empty-panel">
        <el-empty class="scgp-empty-state" description="暂无学生数据">
          <el-button type="primary" @click="showAddDialog">添加新学生</el-button>
        </el-empty>
      </div>

      <div
        v-else-if="filteredStudents.length > 0"
        v-loading="loading"
        element-loading-text="加载中..."
        class="student-table-shell"
      >
        <el-table
          :data="pagedStudents"
          row-key="id"
          class="students-table"
          @row-click="selectStudent"
        >
          <el-table-column label="学号" width="180">
            <template #default="{ row }">
              <StudentId :id="row.student_no" :full="true" />
            </template>
          </el-table-column>

          <el-table-column label="学生姓名" min-width="150">
            <template #default="{ row }">
              <div class="student-name-cell">
                <StudentAvatar
                  :name="row.name"
                  :gender="row.gender"
                  :avatar-url="row.avatar_path"
                  size="sm"
                />
                <span class="student-name">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="性别 / 年龄" width="110">
            <template #default="{ row }">
              {{ row.gender }} / {{ getStudentAge(row.birthday) }} 岁
            </template>
          </el-table-column>

          <el-table-column label="出生日期" width="120">
            <template #default="{ row }">
              {{ formatStudentDate(row.birthday) }}
            </template>
          </el-table-column>

          <el-table-column label="诊断类型" min-width="130">
            <template #default="{ row }">
              <DiagnosisTag :type="row.disorder" />
            </template>
          </el-table-column>

          <el-table-column label="所属班级" min-width="150">
            <template #default="{ row }">
              <span
                class="student-class-badge"
                :class="row.current_class_name ? 'is-assigned' : 'is-unassigned'"
              >
                {{ row.current_class_name || '未分班' }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="selectStudent(row)">选择</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="filteredStudents.length > PAGE_SIZE" class="student-selector-pagination">
          <el-pagination
            layout="prev, pager, next, total"
            :total="filteredStudents.length"
            :page-size="PAGE_SIZE"
            :current-page="currentPage"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <AddStudentDialog
      v-if="addDialogVisible"
      @close="addDialogVisible = false"
      @saved="handleStudentAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Search,
  Plus
} from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import StudentId from '@/components/student/StudentId.vue'
import DiagnosisTag from '@/components/student/DiagnosisTag.vue'
import { formatStudentDate, getStudentAge } from '@/utils/student-display'

// 类型定义
interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
  current_class_id?: number | null
  current_class_name?: string | null
  created_at: string
  updated_at: string
}

interface ModuleTag {
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  label: string
  description: string
}

interface Props {
  title?: string          // 页面标题，默认"选择学生"
  targetRoute?: string    // 选择后跳转路径，包含 :studentId 占位符
  moduleTag?: ModuleTag   // 模块信息标签（可选）
  backRoute?: string      // 返回按钮目标路由，默认 router.back()
}

const props = withDefaults(defineProps<Props>(), {
  title: '选择学生',
  targetRoute: '',
  moduleTag: undefined,
  backRoute: undefined
})

const emit = defineEmits<{
  (e: 'select', student: Student): void
  (e: 'back'): void
}>()

const router = useRouter()
const studentStore = useStudentStore()

// 搜索相关
const searchText = ref('')

// 加载状态
const loading = ref(false)

// 学生列表
const students = computed(() => studentStore.students || [])

// 过滤后的学生列表
const filteredStudents = computed(() => {
  if (!searchText.value) return students.value
  const search = searchText.value.toLowerCase()
  return students.value.filter(
    s =>
      s.name?.toLowerCase().includes(search) ||
      s.student_no?.toLowerCase().includes(search)
  )
})

// 分页：每页 10 个学生
const PAGE_SIZE = 10
const currentPage = ref(1)

const pagedStudents = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredStudents.value.slice(start, start + PAGE_SIZE)
})

// 搜索或学生列表变化时回到第一页
watch(filteredStudents, () => {
  currentPage.value = 1
})

function handlePageChange(page: number) {
  currentPage.value = page
}

// 添加学生对话框
const addDialogVisible = ref(false)

// 返回上一页
const goBack = () => {
  if (props.backRoute) {
    router.push(props.backRoute)
  } else {
    router.back()
  }
  emit('back')
}

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已通过 computed 实现
}

// 显示添加对话框
const showAddDialog = () => {
  addDialogVisible.value = true
}

// 处理学生添加成功
const handleStudentAdded = async () => {
  addDialogVisible.value = false
  ElMessage.success('添加成功')
}

// 选择学生
const selectStudent = (student: Student) => {
  // 验证学生ID
  if (!student?.id) {
    ElMessage.error('学生ID无效')
    return
  }

  // 触发事件，让父组件处理
  emit('select', student)

  // 如果提供了目标路由，自动跳转
  if (props.targetRoute) {
    const route = props.targetRoute.replace(':studentId', String(student.id))
    router.push(route)
  }
}

// 初始化
onMounted(async () => {
  loading.value = true
  try {
    await studentStore.loadStudents()
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.student-selector-page {
  min-height: 100%;
}

.module-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(248, 251, 255, 0.96);
  border-radius: 16px;
  border: 1px solid rgba(217, 226, 238, 0.92);
}

.module-desc {
  color: #606266;
  font-size: 14px;
}

.student-selector-panel {
  padding: 20px;
}

.student-search {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
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

.student-search :deep(.el-input) {
  flex: 1;
}

.student-table-shell {
  overflow: auto;
  border: 0.5px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.students-table :deep(.el-table__header th) {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

.students-table :deep(.el-table__body td) {
  padding-top: 10px;
  padding-bottom: 10px;
}

.students-table :deep(.el-table__row) {
  cursor: pointer;
}

.student-name-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.student-name {
  color: #303133;
  font-weight: 500;
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
  color: #2aa071;
  border-color: rgba(42, 160, 113, 0.18);
}

.student-selector-empty {
  min-height: 320px;
}

.student-selector-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 14px 16px 4px;
}

@media (max-width: 768px) {
  .student-selector-panel {
    padding: 16px;
  }

  .module-info,
  .student-search {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
