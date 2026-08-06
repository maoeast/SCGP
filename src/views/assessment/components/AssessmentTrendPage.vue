<template>
  <div class="assessment-trend-page">
    <el-card class="trend-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>{{ scaleName }} · 纵向趋势</h2>
          </div>
        </div>
      </template>
    </el-card>

    <div class="trend-content" v-if="!loading && student">
      <!-- 学生基本信息 -->
      <el-card class="student-info-card">
        <template #header>
          <h3>学生基本信息</h3>
        </template>
        <div class="student-info">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="info-item">
                <span class="label">姓名：</span>
                <span class="value">{{ student.name }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">性别：</span>
                <span class="value">{{ student.gender === '男' || student.gender === 'M' ? '男' : '女' }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">评估次数：</span>
                <span class="value">{{ snapshots.length }} 次</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">量表：</span>
                <span class="value">{{ scaleName }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 分数语义说明 -->
      <el-alert
        v-if="scoreNote"
        class="score-note-alert"
        type="info"
        :closable="false"
        show-icon
        :title="scoreNote"
      />

      <!-- 趋势图表 -->
      <el-card v-if="snapshots.length > 0" class="chart-card">
        <template #header>
          <h3>分数变化趋势</h3>
        </template>
        <div class="chart-content">
          <div ref="trendChartRef" class="trend-chart"></div>
        </div>
      </el-card>

      <!-- 历史评估列表 -->
      <el-card v-if="snapshots.length > 0" class="history-list-card">
        <template #header>
          <h3>历史评估记录</h3>
        </template>
        <el-table :data="tableData" stripe style="width: 100%">
          <el-table-column label="评估日期" width="140">
            <template #default="{ row }">
              {{ formatDate(row.date) }}
            </template>
          </el-table-column>
          <el-table-column v-if="hasAge" label="年龄" width="100">
            <template #default="{ row }">
              {{ row.ageMonths ? `${Math.floor(row.ageMonths / 12)}岁${row.ageMonths % 12}月` : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="总分" width="120">
            <template #default="{ row }">
              <span class="total-score">{{ formatScore(row.totalScore) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="等级" width="160">
            <template #default="{ row }">
              <el-tag v-if="row.level" :type="getLevelTagType(row.level)" size="default">
                {{ row.level }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column
            v-for="dim in dimensionColumns"
            :key="dim"
            :label="dim"
            width="120"
          >
            <template #default="{ row }">
              <span :class="{ 'dim-null': row.dimensions[dim] == null }">
                {{ row.dimensions[dim] == null ? '未测' : formatScore(row.dimensions[dim]) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="viewReport(row.assessId)">
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
import { ASSESSMENT_SCALE_CATALOG } from '@/features/assessment/assessment-scale-catalog'
import { SCORE_ADAPTERS, type ScoreSnapshot } from '@/services/assessment-score-adapters'
import { StudentAPI } from '@/database/api'
import { buildAssessmentReportRoute } from '@/features/assessment/report-routes'

// urlSlug → scaleCode 映射（catalog code 可能含下划线，urlSlug 可能含连字符，二者不总是相同）
const URL_SLUG_TO_CODE: Record<string, string> = ASSESSMENT_SCALE_CATALOG.reduce(
  (map, item) => {
    map[item.urlSlug] = item.code
    return map
  },
  {} as Record<string, string>,
)

const router = useRouter()
const route = useRoute()

// 路由参数
const urlSlug = computed(() => {
  const slug = route.params.urlSlug
  if (Array.isArray(slug)) return slug[0] ?? ''
  return typeof slug === 'string' ? slug : ''
})

const studentId = computed(() => {
  const id = route.params.studentId
  const raw = Array.isArray(id) ? id[0] : id
  if (!raw) return null
  const parsed = parseInt(String(raw), 10)
  return isNaN(parsed) ? null : parsed
})

// 量表适配器（按 urlSlug 反查 code，再查 SCORE_ADAPTERS）
const adapter = computed(() => {
  const code = URL_SLUG_TO_CODE[urlSlug.value]
  return code ? SCORE_ADAPTERS[code] : null
})

const scaleName = computed(() => adapter.value?.scaleName ?? '未知量表')
const scoreNote = computed(() => adapter.value?.scoreNote ?? '')

// 响应式数据
const loading = ref(true)
const student = ref<{ name: string; gender: string } | null>(null)
const snapshots = ref<ScoreSnapshot[]>([])
const trendChartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

// 是否有年龄数据（WeeFIM/SM 无 age_months）
const hasAge = computed(() => snapshots.value.some((s) => s.ageMonths > 0))

// 表格数据（倒序：最新在前）
const tableData = computed(() =>
  [...snapshots.value].reverse().map((s) => ({
    assessId: s.assessId,
    date: s.date,
    ageMonths: s.ageMonths,
    totalScore: s.totalScore,
    level: s.level,
    dimensions: s.dimensionScores,
  })),
)

// 维度列（取所有快照维度名的并集，保持首次出现顺序）
const dimensionColumns = computed(() => {
  const seen = new Set<string>()
  const cols: string[] = []
  for (const snap of snapshots.value) {
    for (const key of Object.keys(snap.dimensionScores)) {
      if (!seen.has(key)) {
        seen.add(key)
        cols.push(key)
      }
    }
  }
  return cols
})

// 工具函数
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('zh-CN')
}

function formatScore(v: number | null): string {
  if (v == null) return '-'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

function getLevelTagType(level: string): 'success' | 'warning' | 'danger' | 'info' {
  const l = level.toLowerCase()
  // 正向（好）等级
  if (/优秀|非常优秀|excellent|good|normal|正常/.test(level)) return 'success'
  // 边界/临界
  if (/偏低|borderline|mild|轻度|边缘|临界/.test(level)) return 'warning'
  // 负向（差）等级
  if (/严重|偏低|clinical|moderate|severe|中度|重度|delayed|迟缓|异常|abnormal/.test(level)) return 'danger'
  return 'info'
}

function goBack() {
  router.back()
}

function viewReport(assessId: number) {
  if (!adapter.value || !studentId.value) return
  const code = URL_SLUG_TO_CODE[urlSlug.value]
  // 复用 report-routes 的统一路由构建器（兼容 params/query 两种形态）
  const result = buildAssessmentReportRoute({ scaleType: code as any, assessId, studentId: studentId.value })
  router.push(result)
}

// 初始化趋势图
function initTrendChart() {
  if (!trendChartRef.value || snapshots.value.length === 0) return

  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  // snapshots 已升序（最早在前），直接用
  const dates = snapshots.value.map((s) => formatDate(s.date))
  const dims = dimensionColumns.value

  // 总分线（粗线、突出）
  const totalSeries = {
    name: '总分',
    type: 'line' as const,
    data: snapshots.value.map((s) => s.totalScore),
    smooth: true,
    lineStyle: { width: 3 },
    itemStyle: { color: '#409EFF' },
    z: 10,
  }

  // 各维度线
  const dimSeries = dims.map((dim, idx) => ({
    name: dim,
    type: 'line' as const,
    data: snapshots.value.map((s) => s.dimensionScores[dim] ?? null),
    smooth: true,
    lineStyle: { width: 2, type: 'dashed' as const },
    connectNulls: true,
  }))

  const option: echarts.EChartsOption = {
    title: {
      text: '总分与各维度变化趋势',
      left: 'center',
      textStyle: { fontSize: 16, color: '#303133' },
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['总分', ...dims],
      top: 30,
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 80,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: '分数',
    },
    series: [totalSeries, ...dimSeries] as echarts.SeriesOption[],
  }

  trendChart.setOption(option)
  resizeHandler = () => trendChart?.resize()
  window.addEventListener('resize', resizeHandler)
}

// 加载数据
async function loadData() {
  try {
    loading.value = true

    const id = studentId.value
    if (id === null) {
      ElMessage.error('学生ID缺失')
      router.push('/assessment')
      return
    }

    if (!adapter.value) {
      ElMessage.error('不支持的量表')
      router.push('/assessment')
      return
    }

    // 加载学生信息（教师数据隔离：getStudentById 已按任教班级过滤，不可见学生直接返回未找到）
    const studentAPI = new StudentAPI()
    const studentResult = await studentAPI.getStudentById(id)
    if (!studentResult) {
      ElMessage.error('学生不存在或无权访问')
      router.push('/assessment')
      return
    }
    student.value = studentResult

    // 加载纵向分数
    snapshots.value = adapter.value.getLongitudinalScores(id)

    // 初始化图表
    await nextTick()
    if (snapshots.value.length > 0) {
      initTrendChart()
    }
  } catch (error) {
    console.error('加载趋势数据失败:', error)
    ElMessage.error('加载趋势数据失败，请重试')
  } finally {
    loading.value = false
  }
}

function cleanup() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (trendChart) {
    trendChart.dispose()
    trendChart = null
  }
}

onMounted(() => loadData())
onBeforeUnmount(() => cleanup())
</script>

<style scoped>
.assessment-trend-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.trend-header {
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

.trend-content {
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

.score-note-alert {
  margin: 0;
}

.chart-content {
  padding: 20px 0;
}

.trend-chart {
  width: 100%;
  height: 500px;
}

.total-score {
  font-weight: bold;
  color: #409eff;
  font-size: 16px;
}

.dim-null {
  color: #c0c4cc;
}
</style>
