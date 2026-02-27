<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>学生管理</h1>
        <p class="subtitle">管理学生档案、基本信息与评估记录</p>
      </div>
      <div class="header-right">
        <button @click="showAddModal = true" class="btn btn-primary">
          <i class="fas fa-plus"></i>
          添加学生
        </button>
        <button @click="showImportModal = true" class="btn btn-secondary">
          <i class="fas fa-file-import"></i>
          批量导入
        </button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索学生姓名、学号、诊断类型..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
      </el-row>
    </div>

    <!-- 学生列表 -->
    <div class="main-content">
      <div class="students-grid">
        <div
          v-for="student in filteredStudents"
          :key="student.id"
          class="student-card"
        >
          <div class="student-avatar">
            <img v-if="student.avatar_path" :src="student.avatar_path" :alt="student.name" />
            <i v-else class="fas fa-user"></i>
          </div>
          <div class="student-info">
            <h3>{{ student.name }}</h3>
            <div class="student-details">
              <span>{{ student.gender }}</span>
              <span>{{ getAge(student.birthday) }}岁</span>
              <span>{{ student.disorder || '未分类' }}</span>
            </div>
            <div class="student-meta">
              <span class="student-no">{{ student.student_no || '无学号' }}</span>
              <span class="created-date">{{ formatDate(student.created_at) }}</span>
            </div>
          </div>
          <div class="student-actions">
            <router-link :to="`/students/${student.id}`" class="btn btn-sm">查看详情</router-link>
            <button @click="editStudent(student)" class="btn btn-sm btn-outline">编辑</button>
            <button @click="deleteStudent(student.id)" class="btn btn-sm btn-danger">删除</button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredStudents.length === 0" class="empty-state">
        <i class="fas fa-user-graduate"></i>
        <h3>暂无学生</h3>
        <p>点击上方"添加学生"按钮添加第一个学生</p>
      </div>
    </div>

    <!-- 添加/编辑学生对话框 -->
    <AddStudentDialog
      v-if="showAddModal"
      :editing-student="editingStudent"
      @close="closeModal"
      @saved="handleStudentSaved"
    />

    <!-- 批量导入模态框 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>批量导入学生</h2>
          <button @click="showImportModal = false" class="close-btn">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="import-info">
            <p>请下载Excel模板，填写学生信息后上传导入。</p>
            <button @click="downloadTemplate" class="btn btn-outline">
              <i class="fas fa-arrow-down-to-bracket"></i>
              下载模板
            </button>
          </div>
          <div class="upload-area">
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls"
              @change="handleFileSelect"
              style="display: none"
            />
            <button @click="$refs.fileInput.click()" class="btn btn-primary">
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
import { ref, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const studentStore = useStudentStore()

const searchKeyword = ref('')
const showAddModal = ref(false)
const showImportModal = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const editingStudent = ref<any | null>(null)

// 计算属性
const filteredStudents = computed(() => {
  if (!searchKeyword.value) {
    return studentStore.students
  }
  return studentStore.students.filter(student =>
    student.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    (student.disorder && student.disorder.toLowerCase().includes(searchKeyword.value.toLowerCase())) ||
    (student.student_no && student.student_no.toLowerCase().includes(searchKeyword.value.toLowerCase()))
  )
})

// 获取年龄
const getAge = (birthday: string) => {
  const birth = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

// 处理学生添加/编辑成功
const handleStudentSaved = async () => {
  closeModal()
  await studentStore.loadStudents()
}

// 关闭模态框
const closeModal = () => {
  showAddModal.value = false
  editingStudent.value = null
}

// 编辑学生
const editStudent = (student: any) => {
  editingStudent.value = student
  showAddModal.value = true
}

// 删除学生
const deleteStudent = async (id: number) => {
  if (!confirm('确定要删除这个学生吗？')) return

  try {
    await studentStore.deleteStudent(id)
  } catch (error) {
    console.error('删除学生失败:', error)
    alert('删除学生失败，请重试')
  }
}

// 文件选择
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

// 下载模板
const downloadTemplate = () => {
  try {
    // 创建模板数据
    const templateData = [
      {
        '姓名*': '张三',
        '性别*': '男',
        '出生日期*': '2015-01-01',
        '学号': 'STU202501001',
        '诊断类型': '视力障碍（盲、低视力（一级至四级））'
      },
      {
        '姓名*': '李四',
        '性别*': '女',
        '出生日期*': '2016-05-15',
        '学号': 'STU202501002',
        '诊断类型': '听力障碍（聋（一级）、重听（二级至四级））'
      },
      {
        '姓名*': '',
        '性别*': '',
        '出生日期*': '',
        '学号': '',
        '诊断类型': ''
      }
    ]

    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(templateData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 姓名
      { wch: 10 }, // 性别
      { wch: 15 }, // 出生日期
      { wch: 20 }, // 学号
      { wch: 50 }  // 诊断类型
    ]

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '学生导入模板')

    // 生成Excel文件并下载
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, '学生导入模板.xlsx')
  } catch (error) {
    console.error('下载模板失败:', error)
    alert('下载模板失败，请重试')
  }
}

onMounted(() => {
  studentStore.loadStudents()
})
</script>

<style scoped>
/* 按钮样式 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 学生网格 */
.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.student-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.student-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.student-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  overflow: hidden;
}

.student-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.student-avatar i {
  font-size: 24px;
  color: #999;
}

.student-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.student-details {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.student-details span {
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.student-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;
}

.student-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-state i {
  font-size: 48px;
  color: #ddd;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #666;
}

.empty-state p {
  margin: 0;
  color: #999;
}


.import-info {
  text-align: center;
  padding: 40px 20px;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  margin-bottom: 20px;
}

.upload-area {
  text-align: center;
}

.file-name {
  margin-left: 12px;
  color: #666;
}

@media (max-width: 768px) {
  .students-grid {
    grid-template-columns: 1fr;
  }
}
</style>