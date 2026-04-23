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
        <el-button type="primary" :icon="Download" :disabled="!reportPayload" @click="exportWord">
          导出Word
        </el-button>
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
          <SceneMasteryRadarChart
            :points="reportPayload.sceneMastery"
            title="各类场景掌握情况分布"
            empty-description="暂无主题分类掌握数据"
          />
          <SceneMasteryRadarChart
            :points="reportPayload.sceneDomainMastery"
            title="各场域场景掌握情况分布"
            empty-description="暂无场域分类掌握数据"
          />
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
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import CarePreferencePieChart from '@/components/emotional/charts/CarePreferencePieChart.vue'
import EmotionAccuracyTrendChart from '@/components/emotional/charts/EmotionAccuracyTrendChart.vue'
import EmotionPerformanceBarChart from '@/components/emotional/charts/EmotionPerformanceBarChart.vue'
import SceneMasteryRadarChart from '@/components/emotional/charts/SceneMasteryRadarChart.vue'
import { EmotionalTrainingAPI, type EmotionalStudentReportPayload } from '@/database/emotional-api'
import { exportWordDocument, type WordExportPayload } from '@/utils/export-word'

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

function buildFilename(prefix: string, studentName: string) {
  return `${prefix}_${studentName}_${new Date().toISOString().slice(0, 10)}`
}

function formatPercent(value: number | undefined) {
  return `${Number(value || 0).toFixed(1)}%`
}

function buildEmotionalWordPayload(payload: EmotionalStudentReportPayload): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '报告总览',
      rows: [
        { label: '学生', value: payload.studentName },
        { label: '训练总次数', value: `${payload.totalSessions}` },
        { label: '平均正确率', value: formatPercent(payload.averageAccuracy) },
        { label: '平均提示层级', value: `${payload.averageHintLevel}` },
        { label: '累计训练时长', value: `${payload.totalDurationMinutes} 分钟` },
      ],
    },
  ]

  if (payload.trend.length > 0) {
    sections.push({
      type: 'table',
      heading: '情绪识别趋势',
      columns: ['日期', '正确率'],
      columnWidths: [50, 50],
      rows: payload.trend.map((point) => [point.label, formatPercent(point.accuracy)]),
    })
  } else {
    sections.push({
      type: 'paragraph',
      heading: '情绪识别趋势',
      paragraphs: ['暂无情绪识别趋势数据。'],
    })
  }

  if (payload.emotionPerformance.length > 0) {
    sections.push({
      type: 'table',
      heading: '不同情绪类型识别表现',
      columns: ['情绪类型', '正确率', '平均提示层级'],
      columnWidths: [34, 33, 33],
      rows: payload.emotionPerformance.map((point) => [
        point.emotion,
        formatPercent(point.accuracy),
        `${point.averageHintLevel}`,
      ]),
    })
  } else {
    sections.push({
      type: 'paragraph',
      heading: '不同情绪类型识别表现',
      paragraphs: ['暂无情绪表现数据。'],
    })
  }

  if (payload.carePreference.length > 0) {
    sections.push({
      type: 'table',
      heading: '关心话术类型偏好',
      columns: ['话术类型', '次数'],
      columnWidths: [60, 40],
      rows: payload.carePreference.map((point) => [point.name, `${point.value}`]),
    })
  } else {
    sections.push({
      type: 'paragraph',
      heading: '关心话术类型偏好',
      paragraphs: ['暂无话术偏好数据。'],
    })
  }

  if (payload.sceneMastery.length > 0) {
    sections.push({
      type: 'table',
      heading: '各类场景掌握情况分布',
      columns: ['主题分类', '平均正确率'],
      columnWidths: [60, 40],
      rows: payload.sceneMastery.map((point) => [point.category, formatPercent(point.accuracy)]),
    })
  } else {
    sections.push({
      type: 'paragraph',
      heading: '各类场景掌握情况分布',
      paragraphs: ['暂无主题分类掌握数据。'],
    })
  }

  if (payload.sceneDomainMastery.length > 0) {
    sections.push({
      type: 'table',
      heading: '各场域场景掌握情况分布',
      columns: ['场域分类', '平均正确率'],
      columnWidths: [60, 40],
      rows: payload.sceneDomainMastery.map((point) => [point.category, formatPercent(point.accuracy)]),
    })
  } else {
    sections.push({
      type: 'paragraph',
      heading: '各场域场景掌握情况分布',
      paragraphs: ['暂无场域分类掌握数据。'],
    })
  }

  if (payload.suggestions.length > 0) {
    sections.push({
      type: 'list',
      heading: '教师 / 家长干预建议',
      items: payload.suggestions,
    })
  }

  return {
    title: '情绪行为模块报告',
    subtitle: '训练表现汇总 Word 导出版',
    filename: buildFilename('情绪行为模块报告', payload.studentName),
    meta: [
      { label: '学生姓名', value: payload.studentName },
      { label: '训练总次数', value: `${payload.totalSessions}` },
      { label: '导出日期', value: new Date().toLocaleDateString('zh-CN') },
    ],
    sections,
  }
}

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

async function exportWord() {
  if (!reportPayload.value) {
    ElMessage.error('请先选择学生并加载报告数据')
    return
  }

  try {
    const payload = buildEmotionalWordPayload(reportPayload.value)
    await exportWordDocument(payload)
    ElMessage.success('Word导出成功')
  } catch (error) {
    console.error('导出Word失败:', error)
    ElMessage.error('Word导出失败，请重试')
  }
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

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
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
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
