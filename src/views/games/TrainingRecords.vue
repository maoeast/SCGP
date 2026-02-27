<!-- 训练记录导航页面 -->
<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>训练记录分析</h1>
        <p class="subtitle">查看和分析学生的各项训练数据</p>
      </div>
    </div>

    <!-- 训练类型选择 -->
    <div class="main-content">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-card class="entry-card sensory-card" shadow="hover" @click="goToSensoryTraining">
            <div class="card-body">
              <div class="card-icon">
                <el-icon :size="48"><DataLine /></el-icon>
              </div>
              <div class="card-info">
                <h3>感官训练记录</h3>
                <p>视觉、听觉等游戏训练分析</p>
                <div class="card-tags">
                  <el-tag size="small" type="primary">训练趋势</el-tag>
                  <el-tag size="small" type="primary">能力分析</el-tag>
                  <el-tag size="small" type="primary">详细记录</el-tag>
                </div>
              </div>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card class="entry-card equipment-card" shadow="hover" @click="goToEquipmentTraining">
            <div class="card-body">
              <div class="card-icon">
                <el-icon :size="48"><Bicycle /></el-icon>
              </div>
              <div class="card-info">
                <h3>器材训练记录</h3>
                <p>触觉、嗅觉、本体觉等器材训练</p>
                <div class="card-tags">
                  <el-tag size="small" type="success">器材训练</el-tag>
                  <el-tag size="small" type="success">IEP评语</el-tag>
                  <el-tag size="small" type="success">报告导出</el-tag>
                </div>
              </div>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 快速选择学生 -->
      <el-card class="quick-access-card" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-title">快速访问</span>
            <span class="section-desc">选择学生后直接进入对应的训练记录</span>
          </div>
        </template>
        <div class="quick-access-content">
          <el-select
            v-model="selectedStudentId"
            placeholder="选择学生"
            size="large"
            style="width: 280px"
            @change="goToSelectedTraining"
          >
            <el-option
              v-for="student in validStudents"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>
          <el-radio-group v-model="preferredType" size="large">
            <el-radio-button value="sensory">感官训练</el-radio-button>
            <el-radio-button value="equipment">器材训练</el-radio-button>
          </el-radio-group>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataLine, Bicycle, ArrowRight } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'

const router = useRouter()
const studentStore = useStudentStore()

// 状态
const students = ref<any[]>([])
const selectedStudentId = ref<number | null>(null)
const preferredType = ref<'sensory' | 'equipment'>('sensory')

// 跳转到感官训练记录
const goToSensoryTraining = () => {
  router.push('/training-records/sensory')
}

// 跳转到器材训练记录
const goToEquipmentTraining = () => {
  router.push('/training-records/equipment')
}

// 选择学生后跳转
const goToSelectedTraining = () => {
  if (!selectedStudentId.value) return

  if (preferredType.value === 'sensory') {
    router.push(`/training-records/sensory?studentId=${selectedStudentId.value}`)
  } else {
    router.push(`/equipment/records/${selectedStudentId.value}`)
  }
}

// 过滤有效的学生（确保 id 存在）
const validStudents = computed(() => {
  return students.value.filter(student =>
    student &&
    typeof student === 'object' &&
    student.id != null &&
    student.name
  )
})

// 加载学生列表
const loadStudents = async () => {
  await studentStore.loadStudents()
  students.value = studentStore.students
}

onMounted(async () => {
  await loadStudents()
})
</script>

<style scoped>
/* 入口卡片 */
.entry-card {
  cursor: pointer;
  border-radius: 12px;
  transition: transform 0.2s;
}

.entry-card:hover {
  transform: translateY(-4px);
}

.card-body {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
}

.card-icon {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.sensory-card .card-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.equipment-card .card-icon {
  background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
}

.card-info {
  flex: 1;
}

.card-info h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.card-info p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #909399;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.arrow-icon {
  font-size: 24px;
  color: #c0c4cc;
  flex-shrink: 0;
  transition: transform 0.2s, color 0.2s;
}

.entry-card:hover .arrow-icon {
  color: #409eff;
  transform: translateX(4px);
}

/* 快速访问卡片 */
.quick-access-card {
  margin-top: 24px;
  border-radius: 8px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-desc {
  font-size: 13px;
  color: #909399;
}

.quick-access-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

/* 响应式 */
@media (max-width: 992px) {
  .entry-card .el-col {
    width: 100%;
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .card-body {
    flex-direction: column;
    text-align: center;
  }

  .card-tags {
    justify-content: center;
  }

  .arrow-icon {
    display: none;
  }

  .quick-access-content {
    flex-direction: column;
    align-items: stretch;
  }

  .quick-access-content .el-select {
    width: 100% !important;
  }
}
</style>
