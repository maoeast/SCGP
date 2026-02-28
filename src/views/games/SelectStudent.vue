<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item>选择学生</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentModule?.name || '游戏训练' }} - 选择学生</h1>
        <p class="subtitle">选择要参加游戏训练的学生</p>
      </div>
      <div class="header-right">
        <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
      </div>
    </div>

    <div class="main-content">
      <el-card class="student-card">
        <!-- 搜索区域 -->
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

        <!-- 空状态 -->
        <el-empty
          v-if="!loading && filteredStudents.length === 0"
          description="暂无学生数据"
        >
          <el-button type="primary" @click="showAddDialog">添加新学生</el-button>
        </el-empty>

        <!-- 学生列表 -->
        <div v-else-if="filteredStudents.length > 0" v-loading="loading" element-loading-text="加载中...">
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
                v-for="student in filteredStudents"
                :key="student.id"
                @click="selectStudent(student)"
                class="student-row"
              >
                <td>
                  <el-avatar :size="50" :src="student.avatar_path">
                    {{ student.name?.charAt(0) || '?' }}
                  </el-avatar>
                </td>
                <td>{{ student.name }}</td>
                <td>{{ student.student_no || '-' }}</td>
                <td>{{ student.gender }}</td>
                <td>{{ formatDate(student.birthday) }}</td>
                <td>{{ calculateAge(student.birthday) }}岁</td>
                <td>{{ student.disorder || '-' }}</td>
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
        </div>
      </el-card>
    </div>

    <!-- 快速添加学生对话框 -->
    <AddStudentDialog
      v-if="addDialogVisible"
      @close="addDialogVisible = false"
      @saved="handleStudentAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Search,
  Plus,
  Right
} from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import { ModuleRegistry } from '@/core/module-registry'
import { ModuleCode } from '@/types/module'

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()

// 当前模块代码
const currentModuleCode = ref<string>((route.query.module as string) || ModuleCode.SENSORY)

// 获取当前模块信息
const currentModule = computed(() => {
  return ModuleRegistry.getModule(currentModuleCode.value as ModuleCode)
})

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

// 添加学生对话框
const addDialogVisible = ref(false)

// 返回上一页
const goBack = () => {
  router.push('/games/menu')
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

// 选择学生 - 跳转到游戏大厅
const selectStudent = (student: any) => {
  console.log('[SelectStudent] 选择学生:', student.id, '模块:', currentModuleCode.value)

  // 跳转到游戏大厅
  router.push({
    path: `/games/lobby/${student.id}`,
    query: { module: currentModuleCode.value }
  })
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

// 计算年龄
const calculateAge = (birthday: string) => {
  if (!birthday) return ''
  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
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
.student-card {
  margin: 24px;
}

.student-search {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.student-search .el-input {
  flex: 1;
}

.student-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.student-table th {
  background-color: #f5f7fa;
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

.student-row:last-child td {
  border-bottom: none;
}
</style>
