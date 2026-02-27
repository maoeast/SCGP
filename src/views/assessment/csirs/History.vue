<template>
  <div class="csirs-history">
    <el-card class="history-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>CSIRS历史评估对比</h2>
          </div>
        </div>
      </template>
    </el-card>

    <div class="history-content" v-if="!loading && student">
      <!-- 学生基本信息 -->
      <el-card class="student-info-card">
        <template #header>
          <h3>学生基本信息</h3>
        </template>
        <div class="student-info">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="info-item">
                <span class="label">姓名：</span>
                <span class="value">{{ student.name }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <span class="label">性别：</span>
                <span class="value">{{ student.gender === 'M' ? '男' : '女' }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <span class="label">评估次数：</span>
                <span class="value">{{ historyList.length }}次</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 趋势图表 -->
      <el-card class="chart-card">
        <template #header>
          <h3>T分趋势图</h3>
        </template>
        <div class="chart-content">
          <div ref="trendChartRef" class="trend-chart"></div>
        </div>
      </el-card>

      <!-- 历史评估列表 -->
      <el-card class="history-list-card">
        <template #header>
          <h3>历史评估记录</h3>
        </template>
        <el-table :data="historyList" stripe style="width: 100%">
          <el-table-column prop="date" label="评估日期" width="180">
            <template #default="{ row }">
              {{ formatDate(row.assess.created_at) }}
            </template>
          </el-table-column>
          <el-table-column prop="age" label="年龄" width="120">
            <template #default="{ row }">
              {{ calculateAge(row.assess.age_months) }}岁
            </template>
          </el-table-column>
          <el-table-column prop="total_t_score" label="总T分" width="120">
            <template #default="{ row }">
              <span :style="{ color: getTScoreColor(row.assess.total_t_score), fontWeight: 'bold' }">
                {{ row.assess.total_t_score.toFixed(1) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="level" label="评定等级" width="150">
            <template #default="{ row }">
              <el-tag :type="getLevelTagType(row.assess.level)" size="large">
                {{ row.assess.level }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewReport(row.assess.id)">
                查看报告
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 加载状态 -->
    <el-empty v-else-if="loading" description="加载中..." />

    <!-- 无数据状态 -->
    <el-empty v-else description="暂无评估记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { csirsDimensions, getDimensionsByAge } from '@/database/csirs-questions'
import { getEvaluationLevel as getEvalLevel } from '@/database/csirs-conversion'
import { CSIRSAPI } from '@/database/api'
import { getDatabase } from '@/database/init'
import type { CSIRSHistoryItem, CSIRSAssessment } from '@/types/csirs'

// T分阈值常量
const TSCORE_EXCELLENT_THRESHOLD = 40
const TSCORE_LOW_THRESHOLD = 30

// 颜色常量
const COLOR_GREEN = '#67C23A'
const COLOR_ORANGE = '#E6A23C'
const COLOR_RED = '#F56C6C'

// 类型定义
interface Student {
  id: number
  name: string
  gender: 'M' | 'F'
  birthday: string
  student_no: string
  disorder: string
  avatar_path: string | null
}

interface CSIRSAssessmentRecord {
  id: number
  student_id: number
  age_months: number
  raw_scores: string
  t_scores: string
  total_t_score: number
  level: string
  start_time: string
  end_time: string | null
  created_at: string
  student_name: string
}

interface HistoryListItem {
  assess: CSIRSAssessmentRecord
  t_scores: Record<string, number>
}

// ECharts tooltip parameter type
interface TooltipParam {
  axisValue: string
  data: number
  marker: string
  seriesName: string
  componentType?: string
  componentSubType?: string
}

const router = useRouter()
const route = useRoute()
const db = getDatabase()
const csirsAPI = new CSIRSAPI()

// 响应式数据
const loading = ref(true)
const student = ref<Student | null>(null)
const historyList = ref<HistoryListItem[]>([])
const trendChartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

// 获取学生ID - 安全处理路由参数
const studentId = computed(() => {
  const id = route.params.studentId
  if (Array.isArray(id)) {
    const firstId = id[0]
    if (!firstId) return null
    const parsed = parseInt(firstId)
    return isNaN(parsed) ? null : parsed
  }
  if (!id) return null
  const parsed = parseInt(id)
  return isNaN(parsed) ? null : parsed
})

// 获取T分对应的颜色
const getTScoreColor = (tScore: number): string => {
  if (tScore >= TSCORE_EXCELLENT_THRESHOLD) return COLOR_GREEN
  if (tScore >= TSCORE_LOW_THRESHOLD) return COLOR_ORANGE
  return COLOR_RED
}

// 获取等级对应的标签类型
const getLevelTagType = (level: string): string => {
  const typeMap: Record<string, string> = {
    '非常优秀': 'success',
    '优秀': 'success',
    '正常': '',
    '偏低': 'warning',
    '严重偏低': 'danger'
  }
  return typeMap[level] || ''
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('zh-CN')
}

// 计算年龄（岁）
const calculateAge = (ageMonths: number): number => {
  return Math.floor(ageMonths / 12)
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 查看报告
const viewReport = (assessId: number) => {
  router.push(`/assessment/csirs/report/${assessId}`)
}

// 初始化趋势图
const initTrendChart = () => {
  if (!trendChartRef.value || historyList.value.length === 0) return

  // 销毁已存在的图表
  if (trendChart) {
    trendChart.dispose()
  }

  // 创建新图表
  trendChart = echarts.init(trendChartRef.value)

  // 准备数据 - 按时间升序排列（最早的在前）
  const sortedHistory = [...historyList.value].reverse()
  const dates = sortedHistory.map(item => formatDate(item.assess.created_at))

  // 获取第一个评估的年龄来确定适用的维度
  const firstAge = sortedHistory[0]?.assess?.age_months || 0
  const applicableDimensions = getDimensionsByAge(firstAge)

  // 为每个维度创建一个系列
  const series = applicableDimensions.map(dim => {
    const data = sortedHistory.map(item => {
      const tScore = item.t_scores[dim.name_en] || 50
      return tScore
    })

    return {
      name: dim.name,
      type: 'line',
      data: data,
      smooth: true,
      lineStyle: {
        width: 2
      },
      itemStyle: {
        borderRadius: 5
      }
    }
  })

  const option: echarts.EChartsOption = {
    title: {
      text: '各维度T分变化趋势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        color: '#303133'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const tooltipParams = params as TooltipParam[]
        if (!tooltipParams || tooltipParams.length === 0) return ''
        const date = tooltipParams[0]?.axisValue || '-'
        let result = `${date}<br/>`
        tooltipParams.forEach((param: TooltipParam) => {
          const color = getTScoreColor(param.data)
          result += `${param.marker} ${param.seriesName}: <span style="color:${color};font-weight:bold">${param.data}</span><br/>`
        })
        return result
      }
    },
    legend: {
      data: applicableDimensions.map(dim => dim.name),
      top: 30,
      type: 'scroll'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 80,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: 'T分',
      min: 0,
      max: 80,
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: series as echarts.SeriesOption
  }

  trendChart.setOption(option)

  // 创建resize处理器
  resizeHandler = () => {
    trendChart?.resize()
  }
  window.addEventListener('resize', resizeHandler)
}

// 加载学生信息和评估历史
const loadHistoryData = async () => {
  try {
    loading.value = true

    // 验证studentId
    const id = studentId.value
    if (id === null) {
      ElMessage.error('学生ID缺失')
      router.push('/assessment')
      return
    }

    // 加载学生信息
    const studentResult = db.get(
      'SELECT * FROM student WHERE id = ?',
      [id]
    )

    if (!studentResult) {
      ElMessage.error('学生不存在')
      router.push('/assessment')
      return
    }

    student.value = studentResult

    // 使用CSIRSAPI加载评估记录
    const assessments = csirsAPI.getStudentAssessments(id)

    if (!assessments || assessments.length === 0) {
      historyList.value = []
      loading.value = false
      return
    }

    // 解析JSON字段并构建历史列表
    const parsedHistory: HistoryListItem[] = []

    for (const assess of assessments) {
      let tScores: Record<string, number>
      try {
        tScores = JSON.parse(assess.t_scores)
      } catch (jsonError) {
        console.error('JSON解析失败，评估ID:', assess.id, jsonError)
        // 如果解析失败，使用默认值
        tScores = {
          vestibular: 50,
          tactile: 50,
          proprioception: 50
        }
      }

      parsedHistory.push({
        assess: assess,
        t_scores: tScores
      })
    }

    historyList.value = parsedHistory

    // 初始化图表
    await nextTick()
    initTrendChart()
  } catch (error) {
    console.error('加载历史数据失败:', error)
    ElMessage.error('加载历史数据失败，请重试')
  } finally {
    loading.value = false
  }
}

// 清理资源
const cleanup = () => {
  // 移除事件监听器
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }

  // 销毁图表实例
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadHistoryData()
})

// 组件卸载前清理资源
onBeforeUnmount(() => {
  cleanup()
})
</script>

<style scoped>
.csirs-history {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.history-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.student-info-card,
.chart-card,
.history-list-card {
  background: white;
}

.student-info-card h3,
.chart-card h3,
.history-list-card h3 {
  margin: 0;
  color: #303133;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  font-weight: bold;
  color: #606266;
  margin-right: 10px;
}

.info-item .value {
  color: #303133;
  font-size: 16px;
}

.chart-content {
  padding: 20px 0;
}

.trend-chart {
  width: 100%;
  height: 500px;
}
</style>
