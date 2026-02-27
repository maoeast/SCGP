<template>
  <div class="student-detail-page">
    <!-- 页面标题和操作 -->
    <div class="page-header">
      <el-button @click="goBack" :icon="ArrowLeft">返回</el-button>
      <h1>学生详情</h1>
      <div class="header-actions">
        <el-button type="primary" :icon="Edit" @click="editStudent">
          编辑信息
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <!-- 左侧：基本信息 -->
      <el-col :span="8">
        <el-card class="student-info-card">
          <div class="student-avatar">
            <el-avatar :size="120" :src="student?.avatar_path">
              {{ student?.name?.charAt(0) || '?' }}
            </el-avatar>
          </div>
          <h2>{{ student?.name || '未命名' }}</h2>
          <div class="info-items">
            <div class="info-item">
              <span class="label">学号：</span>
              <span class="value">{{ student?.student_no || '未设置' }}</span>
            </div>
            <div class="info-item">
              <span class="label">性别：</span>
              <span class="value">{{ student?.gender || '未设置' }}</span>
            </div>
            <div class="info-item">
              <span class="label">年龄：</span>
              <span class="value">{{ calculateAge(student?.birthday) }}岁</span>
            </div>
            <div class="info-item">
              <span class="label">出生日期：</span>
              <span class="value">{{ formatDate(student?.birthday) }}</span>
            </div>
            <div class="info-item">
              <span class="label">诊断类型：</span>
              <span class="value">{{ student?.disorder || '未诊断' }}</span>
            </div>
            <div class="info-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatDate(student?.created_at) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：记录统计 -->
      <el-col :span="16">
        <!-- 统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="12">
            <el-card class="stat-card" @click="activeTab = 'assessments'">
              <div class="stat-content">
                <div class="stat-icon assessment">
                  <i class="fas fa-clipboard-check"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ assessmentCount }}</div>
                  <div class="stat-label">评估记录</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="stat-card" @click="goToEquipmentRecords">
              <div class="stat-content">
                <div class="stat-icon equipment">
                  <i class="fas fa-dumbbell"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ equipmentCount }}</div>
                  <div class="stat-label">器材训练</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 记录列表 -->
        <el-tabs v-model="activeTab" class="records-tabs">
          <el-tab-pane label="评估记录" name="assessments">
            <el-empty v-if="assessmentRecords.length === 0" description="暂无评估记录" />
            <div v-else class="record-list">
              <el-card
                v-for="record in assessmentRecords"
                :key="record.id"
                class="record-card"
                shadow="hover"
              >
                <div class="record-header">
                  <span class="record-type">{{ record.scale_type === 'sm' ? 'S-M量表' : 'WeeFIM量表' }}</span>
                  <span class="record-date">{{ formatDate(record.created_at) }}</span>
                </div>
                <div class="record-details">
                  <span class="record-score">得分：{{ record.score || '-' }}</span>
                  <el-button type="text" @click="viewAssessmentReport(record)">查看报告</el-button>
                </div>
              </el-card>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>

    <!-- 编辑学生对话框 -->
    <AddStudentDialog
      v-if="showEditDialog"
      :editing-student="student"
      @close="showEditDialog = false"
      @saved="handleStudentUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Edit } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import { SMAssessmentAPI, WeeFIMAPI, ConnersPSQAPI, ConnersTRSAPI, CSIRSAPI, EquipmentTrainingAPI } from '@/database/api'

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()

// 响应式数据
const loading = ref(false)
const student = ref<any>(null)
const activeTab = ref('assessments')
const showEditDialog = ref(false)

// 记录数据
const assessmentRecords = ref<any[]>([])

// 统计数据
const assessmentCount = ref(0)
const equipmentCount = ref(0)

// 返回上一页
const goBack = () => {
  router.back()
}

// 编辑学生
const editStudent = () => {
  showEditDialog.value = true
}

// 跳转到器材训练记录
const goToEquipmentRecords = () => {
  router.push(`/equipment/records/${student.value?.id}`)
}

// 处理学生更新
const handleStudentUpdated = async () => {
  showEditDialog.value = false
  await loadStudentDetail()
  ElMessage.success('学生信息更新成功')
}

// 查看评估报告
const viewAssessmentReport = (record: any) => {
  if (record.scale_type === 'sm') {
    router.push({
      path: '/assessment/sm/report',
      query: {
        studentId: student.value?.id.toString(),
        assessId: record.assess_id.toString()
      }
    })
  } else if (record.scale_type === 'weefim') {
    router.push({
      path: '/assessment/weefim/report',
      query: {
        studentId: student.value?.id.toString(),
        assessId: record.assess_id.toString()
      }
    })
  }
}

// 获取分数类型
const getScoreType = (score: number) => {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

// 计算年龄
const calculateAge = (birthday: string) => {
  if (!birthday) return 0
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
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

// 加载学生详情
const loadStudentDetail = async () => {
  try {
    loading.value = true
    const studentId = route.params.id as string

    // 加载学生基本信息
    const students = studentStore.students
    student.value = students.find(s => s.id === parseInt(studentId))

    if (!student.value) {
      ElMessage.error('未找到该学生信息')
      router.back()
      return
    }

    // 加载评估记录
    try {
      const smAPI = new SMAssessmentAPI()
      const weefimAPI = new WeeFIMAPI()
      const connersPSQAPI = new ConnersPSQAPI()
      const connersTRSAPI = new ConnersTRSAPI()
      const csirsAPI = new CSIRSAPI()

      // 加载各类评估记录
      const smAssessments = smAPI.getStudentAssessments(parseInt(studentId))
      const weefimAssessments = weefimAPI.getStudentAssessments(parseInt(studentId))
      const connersPSQAssessments = connersPSQAPI.getStudentAssessments(parseInt(studentId))
      const connersTRSAssessments = connersTRSAPI.getStudentAssessments(parseInt(studentId))
      const csirsAssessments = csirsAPI.getStudentAssessments(parseInt(studentId))

      // 格式化各类评估记录
      const smRecords = smAssessments.map((a: any) => ({
        id: `sm-${a.id}`,
        scale_type: 'sm',
        score: a.sq_score,
        raw_score: a.raw_score,
        level: a.level,
        created_at: a.end_time,
        assess_id: a.id
      }))

      const weefimRecords = weefimAssessments.map((a: any) => ({
        id: `weefim-${a.id}`,
        scale_type: 'weefim',
        score: a.total_score,
        level: a.level,
        created_at: a.end_time,
        assess_id: a.id
      }))

      const connersPSQRecords = connersPSQAssessments.map((a: any) => ({
        id: `conners-psq-${a.id}`,
        scale_type: 'conners-psq',
        score: a.total_score,
        level: a.level,
        created_at: a.assess_date,
        assess_id: a.id
      }))

      const connersTRSRecords = connersTRSAssessments.map((a: any) => ({
        id: `conners-trs-${a.id}`,
        scale_type: 'conners-trs',
        score: a.total_score,
        level: a.level,
        created_at: a.assess_date,
        assess_id: a.id
      }))

      const csirsRecords = csirsAssessments.map((a: any) => ({
        id: `csirs-${a.id}`,
        scale_type: 'csirs',
        score: a.total_score,
        level: a.level,
        created_at: a.assess_date,
        assess_id: a.id
      }))

      // 合并所有评估记录并按时间排序
      assessmentRecords.value = [
        ...smRecords,
        ...weefimRecords,
        ...connersPSQRecords,
        ...connersTRSRecords,
        ...csirsRecords
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      console.log('加载的评估记录:', assessmentRecords.value)
    } catch (error) {
      console.error('加载评估记录失败:', error)
      assessmentRecords.value = []
    }

    assessmentCount.value = assessmentRecords.value.length

    // 加载器材训练记录数量
    try {
      const equipmentAPI = new EquipmentTrainingAPI()
      const equipmentRecords = equipmentAPI.getStudentRecords(parseInt(studentId))
      equipmentCount.value = equipmentRecords.length
    } catch (error) {
      console.error('加载器材训练记录失败:', error)
      equipmentCount.value = 0
    }

  } catch (error) {
    console.error('加载学生详情失败:', error)
    ElMessage.error('加载学生详情失败')
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  await studentStore.loadStudents()
  await loadStudentDetail()
})
</script>

<style scoped>
.student-detail-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  flex: 1;
}

.student-info-card {
  text-align: center;
}

.student-avatar {
  margin-bottom: 20px;
}

.student-info-card h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.info-items {
  text-align: left;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #666;
}

.info-item .value {
  color: #333;
  font-weight: 500;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: default;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.stat-icon.assessment {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.equipment {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.records-tabs {
  margin-top: 20px;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-card {
  cursor: pointer;
  transition: all 0.3s;
}

.record-card:hover {
  transform: translateY(-2px);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.record-type, .record-task {
  font-weight: 500;
  color: #333;
}

.record-date {
  color: #999;
  font-size: 14px;
}

.record-details {
  display: flex;
  align-items: center;
  gap: 15px;
}

.record-score {
  color: #666;
}

.record-level {
  color: #666;
  font-size: 14px;
}

.record-period {
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-row .el-col {
    margin-bottom: 10px;
  }
}
</style>