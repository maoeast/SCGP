<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">选择训练</el-breadcrumb-item>
        <el-breadcrumb-item>模块报告</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>模块报告</h1>
        <p class="subtitle">按学生汇总情绪训练表现、话术偏好和场景掌握情况。</p>
      </div>
      <div class="header-right">
        <el-select v-model="selectedStudentId" placeholder="选择学生" style="width: 220px" @change="loadReport">
          <el-option
            v-for="student in studentOptions"
            :key="student.id"
            :label="student.name"
            :value="student.id"
          />
        </el-select>
      </div>
    </div>

    <div class="main-content">
      <el-alert
        v-if="!selectedStudentId"
        type="info"
        :closable="false"
        show-icon
        title="请选择学生"
        description="选择有情绪模块训练记录的学生后，将显示专属可视化报告。"
      />

      <template v-else-if="reportPayload">
        <el-row :gutter="16" class="summary-row">
          <el-col :span="6">
            <el-card class="summary-card" shadow="never">
              <span class="summary-label">学生</span>
              <strong class="summary-value summary-value--text">{{ reportPayload.studentName }}</strong>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="summary-card" shadow="never">
              <span class="summary-label">训练总次数</span>
              <strong class="summary-value">{{ reportPayload.totalSessions }}</strong>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="summary-card" shadow="never">
              <span class="summary-label">平均正确率</span>
              <strong class="summary-value">{{ reportPayload.averageAccuracy }}%</strong>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="summary-card" shadow="never">
              <span class="summary-label">平均提示层级</span>
              <strong class="summary-value">{{ reportPayload.averageHintLevel }}</strong>
            </el-card>
          </el-col>
        </el-row>

        <div class="chart-grid">
          <EmotionAccuracyTrendChart :points="reportPayload.trend" />
          <EmotionPerformanceBarChart :points="reportPayload.emotionPerformance" />
          <CarePreferencePieChart :points="reportPayload.carePreference" />
          <SceneMasteryRadarChart :points="reportPayload.sceneMastery" />
        </div>

        <el-card class="suggestion-card" shadow="never">
          <template #header>
            <span>教师 / 家长干预建议</span>
          </template>
          <ul class="suggestion-list">
            <li v-for="suggestion in reportPayload.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import CarePreferencePieChart from '@/components/emotional/charts/CarePreferencePieChart.vue'
import EmotionAccuracyTrendChart from '@/components/emotional/charts/EmotionAccuracyTrendChart.vue'
import EmotionPerformanceBarChart from '@/components/emotional/charts/EmotionPerformanceBarChart.vue'
import SceneMasteryRadarChart from '@/components/emotional/charts/SceneMasteryRadarChart.vue'
import { EmotionalTrainingAPI, type EmotionalStudentReportPayload } from '@/database/emotional-api'

const route = useRoute()
const api = new EmotionalTrainingAPI()

const inheritedQuery = computed(() => ({ ...route.query }))
const routeStudentId = computed<number | undefined>(() => {
  const value = Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId
  const numeric = Number(value || 0)
  return numeric > 0 ? numeric : undefined
})
const studentOptions = ref<Array<{ id: number; name: string }>>([])
const selectedStudentId = ref<number | undefined>(routeStudentId.value)
const reportPayload = ref<EmotionalStudentReportPayload | null>(null)

function loadStudentOptions() {
  studentOptions.value = api.getStudentsWithEmotionalSessions()
  if (!selectedStudentId.value && studentOptions.value.length > 0) {
    selectedStudentId.value = studentOptions.value[0]?.id
  }
}

function loadReport() {
  if (!selectedStudentId.value) {
    reportPayload.value = null
    return
  }
  reportPayload.value = api.getStudentReportPayload(selectedStudentId.value)
}

watch(routeStudentId, (value) => {
  if (value && value !== selectedStudentId.value) {
    selectedStudentId.value = value
    return
  }

  if (!value && selectedStudentId.value && !studentOptions.value.some((student) => student.id === selectedStudentId.value)) {
    selectedStudentId.value = undefined
  }
})

watch(selectedStudentId, () => {
  loadReport()
})

onMounted(() => {
  loadStudentOptions()
  loadReport()
})
</script>

<style scoped>
.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.main-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card,
.suggestion-card {
  border-radius: 20px;
}

.summary-label {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  color: #303133;
}

.summary-value--text {
  font-size: 22px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.suggestion-list {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  line-height: 1.9;
}

@media (max-width: 1080px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
