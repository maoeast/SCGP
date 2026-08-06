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
        <table class="student-table">
          <thead>
            <tr>
              <th>照片</th>
              <th>姓名</th>
              <th>学号</th>
              <th>性别</th>
              <th>出生日期</th>
              <th>年龄</th>
              <th>诊断类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="student in pagedStudents"
              :key="student.id"
              @click="selectStudent(student)"
              class="student-row"
            >
              <td class="student-table__avatar-cell">
                <StudentAvatar
                  :name="student.name"
                  :gender="student.gender"
                  :avatar-url="student.avatar_path"
                  size="sm"
                />
              </td>
              <td>{{ student.name }}</td>
              <td><StudentId :id="student.student_no" :full="true" /></td>
              <td>{{ student.gender }}</td>
              <td>{{ formatStudentDate(student.birthday) }}</td>
              <td>{{ getStudentAge(student.birthday) }}岁</td>
              <td><DiagnosisTag :type="student.disorder" /></td>
              <td>
                <el-button
                  type="primary"
                  :icon="Right"
                  circle
                  @click.stop="selectStudent(student)"
                />
              </td>
            </tr>
          </tbody>
        </table>

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
  Plus,
  Right
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
  border: 1px solid #e6ebf2;
  border-radius: 18px;
}

.student-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.student-table th {
  background-color: #fbfcfe;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.student-table td {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.student-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.student-row:hover {
  background-color: #f5f7fa;
}

.student-selector-empty {
  min-height: 320px;
}

.student-row:last-child td {
  border-bottom: none;
}

.student-table__avatar-cell {
  width: 68px;
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
