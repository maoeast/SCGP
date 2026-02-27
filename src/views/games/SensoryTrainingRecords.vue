<!-- 感官训练记录分析页面 -->
<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>感官训练记录</h1>
        <p class="subtitle">查看学生的感官训练数据与能力分析</p>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select
            v-model="selectedStudentId"
            placeholder="选择学生"
            size="large"
            style="width: 100%"
            @change="loadStudentRecords"
          >
            <el-option
              v-for="student in validStudents"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select
            v-model="selectedTaskId"
            placeholder="全部训练"
            size="large"
            style="width: 100%"
            @change="loadStudentRecords"
          >
            <el-option label="全部训练" :value="null" />
            <el-option
              v-for="task in taskOptions"
              :key="task.value"
              :label="task.label"
              :value="task.value"
            />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="large"
            style="width: 100%"
            @change="loadStudentRecords"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 无数据提示 -->
    <div v-else-if="!selectedStudentId" class="empty-state">
      <el-icon :size="120" color="#c0c4cc"><User /></el-icon>
      <p>请选择学生查看训练记录</p>
    </div>

    <div v-else class="main-content">
      <!-- 关键指标卡片 -->
      <div class="stats-cards">
        <div class="stat-card primary">
          <div class="stat-icon">
            <el-icon :size="24"><DataLine /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalRecords }}</div>
            <div class="stat-label">训练次数</div>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">
            <el-icon :size="24"><Aim /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ (avgAccuracy * 100).toFixed(1) }}%</div>
            <div class="stat-label">平均正确率</div>
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon">
            <el-icon :size="24"><Stopwatch /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatResponseTime(avgResponseTime) }}</div>
            <div class="stat-label">平均反应时</div>
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-icon">
            <el-icon :size="24"><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalDuration }}min</div>
            <div class="stat-label">总训练时长</div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <!-- 趋势图 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>训练趋势分析</h3>
            <el-radio-group v-model="trendMetric" size="small" @change="updateTrendChart">
              <el-radio-button value="accuracy">正确率</el-radio-button>
              <el-radio-button value="responseTime">反应时</el-radio-button>
              <el-radio-button value="duration">训练时长</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="trendChartRef" class="chart-container"></div>
        </div>

        <!-- 雷达图 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>能力维度分析</h3>
          </div>
          <div ref="radarChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 训练记录列表 -->
      <div class="records-section">
        <div class="section-header">
          <h3>详细记录</h3>
        </div>

        <el-table :data="records" stripe>
          <el-table-column prop="timestamp" label="训练时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.timestamp) }}
            </template>
          </el-table-column>

          <el-table-column prop="taskId" label="训练任务" width="120">
            <template #default="{ row }">
              {{ getTaskName(row.taskId) }}
            </template>
          </el-table-column>

          <el-table-column prop="accuracy" label="正确率" width="100">
            <template #default="{ row }">
              <el-tag :type="getAccuracyTagType(row.accuracy)">
                {{ (row.accuracy * 100).toFixed(1) }}%
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="avgResponseTime" label="平均反应时" width="120">
            <template #default="{ row }">
              {{ formatResponseTime(row.avgResponseTime) }}
            </template>
          </el-table-column>

          <el-table-column prop="duration" label="时长" width="80">
            <template #default="{ row }">
              {{ row.duration }}s
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag v-if="isAbnormalData(row)" type="danger" size="small">
                异常
              </el-tag>
              <el-tag v-else type="success" size="small">
                正常
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="训练详情"
      width="800px"
    >
      <div v-if="selectedRecord" class="detail-content">
        <div class="detail-section">
          <h4>基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="训练任务">
              {{ getTaskName(selectedRecord.taskId) }}
            </el-descriptions-item>
            <el-descriptions-item label="训练时间">
              {{ formatDate(selectedRecord.timestamp) }}
            </el-descriptions-item>
            <el-descriptions-item label="正确率">
              {{ (selectedRecord.accuracy * 100).toFixed(1) }}%
            </el-descriptions-item>
            <el-descriptions-item label="平均反应时">
              {{ formatResponseTime(selectedRecord.avgResponseTime) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h4>行为分析</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="漏报次数">
              {{ selectedRecord.raw_data.errors.omission }}
            </el-descriptions-item>
            <el-descriptions-item label="误报次数">
              {{ selectedRecord.raw_data.errors.commission }}
            </el-descriptions-item>
            <el-descriptions-item label="冲动分数">
              {{ selectedRecord.raw_data.behavior.impulsivityScore }}
            </el-descriptions-item>
            <el-descriptions-item label="疲劳指数">
              {{ selectedRecord.raw_data.behavior.fatigueIndex.toFixed(2) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, User, DataLine, Aim, Stopwatch, Clock } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { useStudentStore } from '@/stores/student'
import { GameTrainingAPI } from '@/database/api'
import { TaskID } from '@/types/games'
import type { GameSessionData } from '@/types/games'

const router = useRouter()
const route = useRoute()

const studentStore = useStudentStore()

// 状态
const loading = ref(false)
const students = ref([])
const selectedStudentId = ref<number | null>(null)
const selectedTaskId = ref<number | null>(null)
const dateRange = ref<[Date, Date] | null>(null)
const records = ref<any[]>([])

// 过滤有效的学生（确保 id 存在）
const validStudents = computed(() => {
  return students.value.filter((student: any) =>
    student &&
    typeof student === 'object' &&
    student.id != null &&
    student.name
  )
})

// 图表相关
const trendChartRef = ref<HTMLElement>()
const radarChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let radarChart: echarts.ECharts | null = null

// 趋势图指标
const trendMetric = ref<'accuracy' | 'responseTime' | 'duration'>('accuracy')

// 详情对话框
const showDetailDialog = ref(false)
const selectedRecord = ref<any>(null)

// 任务选项
const taskOptions = [
  { label: '颜色配对', value: TaskID.COLOR_MATCH },
  { label: '形状识别', value: TaskID.SHAPE_MATCH },
  { label: '物品配对', value: TaskID.ICON_MATCH },
  { label: '视觉追踪', value: TaskID.VISUAL_TRACK },
  { label: '声音辨别', value: TaskID.AUDIO_DIFF },
  { label: '听指令做动作', value: TaskID.AUDIO_COMMAND },
  { label: '节奏模仿', value: TaskID.AUDIO_RHYTHM }
]

// 计算属性
const totalRecords = computed(() => records.value.length)

const avgAccuracy = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, r) => acc + r.accuracy, 0)
  return sum / records.value.length
})

const avgResponseTime = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, r) => acc + r.avgResponseTime, 0)
  return Math.round(sum / records.value.length)
})

const totalDuration = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, r) => acc + r.duration, 0)
  return Math.round(sum / 60) // 转换为分钟
})

// 格式化反应时间（毫秒转换为秒，保留1位小数）
const formatResponseTime = (ms: number) => {
  if (!ms || ms === 0) return '0秒'
  return (ms / 1000).toFixed(1) + '秒'
}

// 格式化日期
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取任务名称
const getTaskName = (taskId: number) => {
  const task = taskOptions.find(t => t.value === taskId)
  return task?.label || `任务${taskId}`
}

// 获取正确率标签类型
const getAccuracyTagType = (accuracy: number) => {
  if (accuracy >= 0.8) return 'success'
  if (accuracy >= 0.6) return 'warning'
  return 'danger'
}

// 判断是否为异常数据
const isAbnormalData = (record: any) => {
  // 正确率低于 30% 或反应时超过 5秒 视为异常
  return record.accuracy < 0.3 || record.avgResponseTime > 5000
}

// 加载学生训练记录
const loadStudentRecords = async () => {
  if (!selectedStudentId.value) return

  loading.value = true
  try {
    const api = new GameTrainingAPI()
    const data = api.getStudentTrainingRecords(
      selectedStudentId.value,
      selectedTaskId.value || undefined
    )

    // 过滤日期范围
    let filteredData = data
    if (dateRange.value) {
      const [start, end] = dateRange.value
      filteredData = data.filter((record: any) => {
        const recordDate = new Date(record.timestamp)
        return recordDate >= start && recordDate <= end
      })
    }

    records.value = filteredData
    console.log('[SensoryTrainingRecords] 加载记录:', filteredData.length, '条')

    // 更新图表 - 延迟一点确保 DOM 完全渲染
    await nextTick()
    setTimeout(() => {
      updateCharts()
    }, 100)
  } catch (error) {
    console.error('加载训练记录失败:', error)
    ElMessage.error('加载训练记录失败')
  } finally {
    loading.value = false
  }
}

// 更新趋势图
const updateTrendChart = () => {
  if (!trendChart || records.value.length === 0) {
    console.log('[SensoryTrainingRecords] 趋势图未更新:', { hasChart: !!trendChart, recordCount: records.value.length })
    return
  }
  console.log('[SensoryTrainingRecords] 更新趋势图，记录数:', records.value.length)

  const sortedRecords = [...records.value].sort((a, b) => a.timestamp - b.timestamp)
  const dates = sortedRecords.map(r => new Date(r.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }))

  let values: number[] = []
  let yAxisName = ''
  let color = ''

  switch (trendMetric.value) {
    case 'accuracy':
      values = sortedRecords.map(r => parseFloat((r.accuracy * 100).toFixed(1)))
      yAxisName = '正确率 (%)'
      color = '#67C23A'
      break
    case 'responseTime':
      values = sortedRecords.map(r => parseFloat((r.avgResponseTime / 1000).toFixed(1)))
      yAxisName = '反应时 (秒)'
      color = '#E6A23C'
      break
    case 'duration':
      values = sortedRecords.map(r => r.duration)
      yAxisName = '时长 (秒)'
      color = '#409EFF'
      break
  }

  // 标记异常点
  const markPoints = sortedRecords.map((record, index) => {
    if (isAbnormalData(record)) {
      return {
        name: '异常',
        coord: [dates[index], values[index]],
        value: values[index],
        itemStyle: { color: '#F56C6C' }
      }
    }
    return null
  }).filter(Boolean)

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: yAxisName
    },
    series: [{
      data: values,
      type: 'line',
      smooth: true,
      lineStyle: {
        color: color,
        width: 2
      },
      itemStyle: {
        color: color
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '80' },
          { offset: 1, color: color + '20' }
        ])
      },
      markPoint: {
        data: markPoints,
        symbol: 'pin',
        symbolSize: 50
      }
    }]
  }

  trendChart.setOption(option)
}

// 更新雷达图
const updateRadarChart = () => {
  if (!radarChart || records.value.length === 0) {
    console.log('[SensoryTrainingRecords] 雷达图未更新:', { hasChart: !!radarChart, recordCount: records.value.length })
    return
  }
  console.log('[SensoryTrainingRecords] 更新雷达图，记录数:', records.value.length)

  // 按任务类型分组计算平均正确率
  const taskGroups = {
    visual: { ids: [TaskID.COLOR_MATCH, TaskID.SHAPE_MATCH, TaskID.ICON_MATCH, TaskID.VISUAL_TRACK], accuracy: 0, count: 0 },
    audio: { ids: [TaskID.AUDIO_DIFF, TaskID.AUDIO_COMMAND, TaskID.AUDIO_RHYTHM], accuracy: 0, count: 0 }
  }

  records.value.forEach(record => {
    if (taskGroups.visual.ids.includes(record.taskId)) {
      taskGroups.visual.accuracy += record.accuracy
      taskGroups.visual.count++
    } else if (taskGroups.audio.ids.includes(record.taskId)) {
      taskGroups.audio.accuracy += record.accuracy
      taskGroups.audio.count++
    }
  })

  const visualAccuracy = taskGroups.visual.count > 0 ? (taskGroups.visual.accuracy / taskGroups.visual.count) * 100 : 0
  const audioAccuracy = taskGroups.audio.count > 0 ? (taskGroups.audio.accuracy / taskGroups.audio.count) * 100 : 0

  // 反应时（数值越小越好，需要反转）
  const maxResponseTime = 5 // 5秒
  const avgResponseTimeValue = avgResponseTime.value / 1000 // 转换为秒
  const responseScore = Math.max(0, 100 - (avgResponseTimeValue / maxResponseTime) * 100)

  const option: EChartsOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: '视觉能力', max: 100 },
        { name: '听觉能力', max: 100 },
        { name: '反应力', max: 100 }
      ],
      radius: 80
    },
    series: [{
      type: 'radar',
      data: [{
        value: [visualAccuracy, audioAccuracy, responseScore],
        name: '能力分布',
        areaStyle: {
          color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        },
        itemStyle: {
          color: '#667eea'
        }
      }]
    }]
  }

  radarChart.setOption(option)
}

// 更新所有图表
const updateCharts = () => {
  console.log('[SensoryTrainingRecords] updateCharts 被调用', {
    trendChartExists: !!trendChart,
    radarChartExists: !!radarChart,
    trendRefExists: !!trendChartRef.value,
    radarRefExists: !!radarChartRef.value,
    recordCount: records.value.length
  })

  // 如果图表实例不存在（容器之前被隐藏），尝试初始化
  if (!trendChart && trendChartRef.value) {
    console.log('[SensoryTrainingRecords] 初始化趋势图')
    trendChart = echarts.init(trendChartRef.value)
  }
  if (!radarChart && radarChartRef.value) {
    console.log('[SensoryTrainingRecords] 初始化雷达图')
    radarChart = echarts.init(radarChartRef.value)
  }
  updateTrendChart()
  updateRadarChart()
}

// 查看详情
const viewDetail = (record: any) => {
  selectedRecord.value = record
  showDetailDialog.value = true
}

// 响应式处理函数
const resizeCharts = () => {
  trendChart?.resize()
  radarChart?.resize()
}

// 初始化图表
const initCharts = () => {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (radarChartRef.value) {
    radarChart = echarts.init(radarChartRef.value)
  }

  // 添加响应式监听
  window.addEventListener('resize', resizeCharts)
}

// 加载学生列表
const loadStudents = async () => {
  await studentStore.loadStudents()
  students.value = studentStore.students
}

// 生命周期
onMounted(async () => {
  await loadStudents()
  initCharts()

  // 从 URL 参数获取学生 ID
  const studentIdParam = route.query.studentId
  if (studentIdParam) {
    selectedStudentId.value = parseInt(studentIdParam as string)
    loadStudentRecords()
  }
})

onUnmounted(() => {
  trendChart?.dispose()
  radarChart?.dispose()
  window.removeEventListener('resize', resizeCharts)
})
</script>

<style scoped>
/* 加载与空状态 */
.loading-container,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: #fff;
  border-radius: 8px;
}

.loading-container .is-loading {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state p,
.loading-container p {
  font-size: 16px;
  color: #909399;
  margin-top: 16px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-card.primary .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.success .stat-icon {
  background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
}

.stat-card.warning .stat-icon {
  background: linear-gradient(135deg, #E6A23C 0%, #F0C78A 100%);
}

.stat-card.info .stat-icon {
  background: linear-gradient(135deg, #409EFF 0%, #66B1FF 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.chart-container {
  width: 100%;
  height: 300px;
}

/* 记录列表 */
.records-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.section-header {
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

/* 详情对话框 */
.detail-content {
  padding: 10px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

/* 响应式 */
@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>
