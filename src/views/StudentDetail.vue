<template>
  <div class="student-detail-page">
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
      <h1>学生详情</h1>
      <div class="header-actions">
        <el-button type="primary" :icon="Edit" @click="editStudent">
          编辑信息
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" v-loading="loading" class="overview-row">
      <el-col :xs="24" :lg="8">
        <el-card class="student-info-card">
          <div class="student-profile">
            <StudentAvatar
              :name="student?.name"
              :gender="student?.gender"
              :avatar-url="student?.avatar_path"
              size="lg"
            />
            <div class="student-profile__summary">
              <h2>{{ student?.name || '未命名' }}</h2>
              <StudentId :id="student?.student_no" :full="true" />
            </div>
          </div>

          <div class="info-items">
            <div class="info-item">
              <span class="label">学号</span>
              <StudentId class="value" :id="student?.student_no" :full="true" />
            </div>
            <div class="info-item">
              <span class="label">性别</span>
              <span class="value">{{ student?.gender || '未设置' }}</span>
            </div>
            <div class="info-item">
              <span class="label">年龄</span>
              <span class="value">{{ student?.birthday ? `${getStudentAge(student.birthday)}岁` : '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">出生日期</span>
              <span class="value">{{ formatStudentDate(student?.birthday) }}</span>
            </div>
            <div class="info-item">
              <span class="label">诊断类型</span>
              <DiagnosisTag class="value" :type="student?.disorder" />
            </div>
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatStudentDate(student?.created_at) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="16">
        <div class="stats-grid">
          <el-card
            :class="['stat-card', { 'stat-card--active': activeTab === 'assessments' }]"
            @click="activeTab = 'assessments'"
          >
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

          <el-card
            :class="['stat-card', { 'stat-card--active': activeTab === 'equipment' }]"
            @click="activeTab = 'equipment'"
          >
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

          <el-card
            :class="['stat-card', { 'stat-card--active': activeTab === 'games' }]"
            @click="activeTab = 'games'"
          >
            <div class="stat-content">
              <div class="stat-icon game">
                <i class="fas fa-gamepad"></i>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ gameCount }}</div>
                <div class="stat-label">游戏训练</div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>
    </el-row>

    <el-card v-if="student?.id" class="records-card">
      <template #header>
        <div class="records-card__header">
          <div>
            <h2>相关记录</h2>
            <p>查看该学生的评估、器材训练和游戏训练历史。</p>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="records-tabs">
        <el-tab-pane :label="`评估记录 (${assessmentCount})`" name="assessments" lazy>
          <AssessmentRecordsPanel :student-id="student.id" :table-max-height="520" />
        </el-tab-pane>

        <el-tab-pane :label="`器材训练 (${equipmentCount})`" name="equipment" lazy>
          <EquipmentRecordsPanel
            :student-id="student.id"
            :hide-student-filter="true"
            :table-max-height="520"
            @view-detail="viewEquipmentRecord"
          />
        </el-tab-pane>

        <el-tab-pane :label="`游戏训练 (${gameCount})`" name="games" lazy>
          <GameRecordsPanel
            :student-id="student.id"
            :hide-student-filter="true"
            :table-max-height="520"
            @view-detail="viewGameRecord"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <AddStudentDialog
      v-if="showEditDialog"
      :editing-student="student"
      @close="showEditDialog = false"
      @saved="handleStudentUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Edit } from '@element-plus/icons-vue'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import DiagnosisTag from '@/components/student/DiagnosisTag.vue'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import StudentId from '@/components/student/StudentId.vue'
import { EquipmentTrainingAPI, GameTrainingAPI } from '@/database/api'
import { useStudentStore } from '@/stores/student'
import { formatStudentDate, getStudentAge } from '@/utils/student-display'
import { getTrainingEntry } from '@/utils/training-entry'
import AssessmentRecordsPanel from '@/views/student-detail/components/AssessmentRecordsPanel.vue'
import { getStudentAssessmentRecords } from '@/views/student-detail/assessment-records'
import EquipmentRecordsPanel from '@/views/training-records/components/EquipmentRecordsPanel.vue'
import GameRecordsPanel from '@/views/training-records/components/GameRecordsPanel.vue'

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()

const loading = ref(false)
const student = ref<any>(null)
const activeTab = ref<'assessments' | 'equipment' | 'games'>('assessments')
const showEditDialog = ref(false)

const assessmentCount = ref(0)
const equipmentCount = ref(0)
const gameCount = ref(0)

function goBack() {
  router.back()
}

function editStudent() {
  showEditDialog.value = true
}

async function handleStudentUpdated() {
  showEditDialog.value = false
  await loadStudentDetail()
  ElMessage.success('学生信息更新成功')
}

function viewEquipmentRecord(record: any) {
  const entry = getTrainingEntry(record.entry_code, record.module_code)

  router.push({
    path: `/equipment/records/${student.value?.id}`,
    query: {
      entry: entry.code,
      module: entry.moduleCode,
      recordId: String(record.id),
    },
  })
}

function viewGameRecord(record: any) {
  const entry = getTrainingEntry(record.entry_code, record.module_code)

  if (entry.moduleCode === 'emotional') {
    router.push({
      path: '/emotional/session-summary',
      query: {
        studentId: String(record.student_id),
        trainingRecordId: String(record.id),
      },
    })
    return
  }

  router.push({
    path: '/games/report',
    query: {
      recordId: String(record.id),
      studentId: String(record.student_id),
    },
  })
}

async function loadStudentDetail() {
  try {
    loading.value = true
    const studentId = Number(route.params.id)

    if (!studentId) {
      ElMessage.error('缺少学生 ID')
      router.back()
      return
    }

    student.value = studentStore.students.find((item) => item.id === studentId) || null

    if (!student.value) {
      ElMessage.error('未找到该学生信息')
      router.back()
      return
    }

    assessmentCount.value = getStudentAssessmentRecords(studentId).length

    try {
      const equipmentApi = new EquipmentTrainingAPI()
      equipmentCount.value = equipmentApi.getStudentRecords(studentId).length
    } catch (error) {
      console.error('加载器材训练记录失败:', error)
      equipmentCount.value = 0
    }

    try {
      const gameApi = new GameTrainingAPI()
      gameCount.value = gameApi.getStudentTrainingRecords(studentId).length
    } catch (error) {
      console.error('加载游戏训练记录失败:', error)
      gameCount.value = 0
    }
  } catch (error) {
    console.error('加载学生详情失败:', error)
    ElMessage.error('加载学生详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await studentStore.loadStudents()
  await loadStudentDetail()
})

watch(
  () => route.params.id,
  async () => {
    await loadStudentDetail()
  },
)
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

.header-actions {
  display: flex;
  justify-content: flex-end;
}

.overview-row {
  margin-bottom: 20px;
}

.student-info-card {
  border-radius: 16px;
}

.student-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  text-align: center;
}

.student-profile__summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.student-info-card h2 {
  margin: 0;
  color: #303133;
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
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  color: #333;
  font-weight: 500;
  text-align: right;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  cursor: pointer;
  border-radius: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card--active {
  border-color: #89b4ff;
  box-shadow: 0 12px 28px rgba(47, 116, 208, 0.14);
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

.stat-icon.game {
  background: linear-gradient(135deg, #36cfc9 0%, #2f74d0 100%);
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

.records-card {
  border-radius: 18px;
}

.records-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.records-card__header h2 {
  margin: 0;
  font-size: 20px;
}

.records-card__header p {
  margin: 6px 0 0;
  color: #606266;
}

.records-tabs {
  margin-top: 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
