<template>
  <div class="benchmark-runner">
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <div class="flex items-center">
          <el-icon class="mr-2" :size="20">
            <Timer />
          </el-icon>
          <span class="text-large font-600">性能基准测试</span>
        </div>
      </template>
    </el-page-header>

    <div class="content">
      <!-- 测试配置 -->
      <el-card shadow="never" class="config-card">
        <template #header>
          <span>测试配置</span>
        </template>

        <el-form :model="config" label-width="140px" size="small">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="迭代次数">
                <el-input-number
                  v-model="config.iterations"
                  :min="3"
                  :max="50"
                  @change="updateDefaults"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="预热次数">
                <el-input-number
                  v-model="config.warmupRuns"
                  :min="0"
                  :max="10"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="超时时间 (ms)">
                <el-input-number
                  v-model="config.timeout"
                  :min="1000"
                  :max="120000"
                  :step="1000"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="测试套件">
                <el-checkbox-group v-model="selectedSuites">
                  <el-checkbox value="db-export">DB 导出性能</el-checkbox>
                  <el-checkbox value="search">搜索响应时间</el-checkbox>
                  <el-checkbox value="batch-query">批量查询性能</el-checkbox>
                  <el-checkbox value="write">写入性能</el-checkbox>
                  <el-checkbox value="read">读取性能</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button
          type="primary"
          :loading="running"
          :disabled="selectedSuites.length === 0"
          @click="runBenchmarks"
        >
          <el-icon><VideoPlay /></el-icon>
          {{ running ? '测试运行中...' : '开始测试' }}
        </el-button>
        <el-button @click="exportReport" :disabled="!report">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
        <el-button @click="clearResults">
          <el-icon><Delete /></el-icon>
          清空结果
        </el-button>
      </div>

      <!-- 测试进度 -->
      <el-card v-if="running" shadow="never" class="progress-card">
        <template #header>
          <span>测试进度</span>
        </template>

        <div class="progress-info">
          <p><strong>当前测试:</strong> {{ currentTest }}</p>
          <p><strong>完成进度:</strong> {{ completedTests }} / {{ totalTests }}</p>
        </div>

        <el-progress :percentage="progressPercent" :status="progressStatus" />
      </el-card>

      <!-- 测试结果 -->
      <el-card v-if="results.length > 0" shadow="never" class="results-card">
        <template #header>
          <div class="card-header">
            <span>测试结果</span>
            <el-tag :type="allPassed ? 'success' : 'danger'">
              {{ allPassed ? '全部通过' : `${failedCount} 个失败` }}
            </el-tag>
          </div>
        </template>

        <!-- 结果表格 -->
        <el-table :data="results" size="small" stripe>
          <el-table-column prop="name" label="测试名称" width="200" />
          <el-table-column prop="category" label="类别" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getCategoryType(row.category)">
                {{ getCategoryLabel(row.category) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="平均时间" width="100">
            <template #default="{ row }">
              {{ row.statistics.mean.toFixed(2) }} ms
            </template>
          </el-table-column>
          <el-table-column label="中位数" width="100">
            <template #default="{ row }">
              {{ row.statistics.median.toFixed(2) }} ms
            </template>
          </el-table-column>
          <el-table-column label="P95" width="100">
            <template #default="{ row }">
              {{ row.statistics.p95.toFixed(2) }} ms
            </template>
          </el-table-column>
          <el-table-column label="吞吐量" width="120">
            <template #default="{ row }">
              {{ row.statistics.opsPerSecond.toFixed(2) }} ops/s
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag
                :type="row.acceptanceCriteria.passed ? 'success' : 'danger'"
                size="small"
              >
                {{ row.acceptanceCriteria.passed ? '通过' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button
                text
                type="primary"
                size="small"
                @click="showDetail(row)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 性能建议 -->
      <el-card v-if="report && report.recommendations.length > 0" shadow="never" class="recommendations-card">
        <template #header>
          <span>性能建议</span>
        </template>

        <div class="recommendations">
          <p
            v-for="(rec, index) in report.recommendations"
            :key="index"
            class="recommendation-item"
            v-html="formatRecommendation(rec)"
          />
        </div>
      </el-card>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`测试详情: ${selectedResult?.name}`"
      width="700px"
    >
      <template v-if="selectedResult">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="测试名称">
            {{ selectedResult.name }}
          </el-descriptions-item>
          <el-descriptions-item label="类别">
            {{ getCategoryLabel(selectedResult.category) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedResult.description }}
          </el-descriptions-item>
          <el-descriptions-item label="样本数">
            {{ selectedResult.statistics.sampleSize }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedResult.acceptanceCriteria.passed ? 'success' : 'danger'">
              {{ selectedResult.acceptanceCriteria.passed ? '通过' : '失败' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">统计数据</el-divider>

        <el-row :gutter="20" class="stats-grid">
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">平均</div>
              <div class="stat-value">{{ selectedResult.statistics.mean.toFixed(2) }} ms</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">中位数</div>
              <div class="stat-value">{{ selectedResult.statistics.median.toFixed(2) }} ms</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">标准差</div>
              <div class="stat-value">{{ selectedResult.statistics.standardDeviation.toFixed(2) }} ms</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">最小值</div>
              <div class="stat-value">{{ selectedResult.statistics.min.toFixed(2) }} ms</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">最大值</div>
              <div class="stat-value">{{ selectedResult.statistics.max.toFixed(2) }} ms</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-label">吞吐量</div>
              <div class="stat-value">{{ selectedResult.statistics.opsPerSecond.toFixed(2) }} ops/s</div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="stat-item">
              <div class="stat-label">P95</div>
              <div class="stat-value">{{ selectedResult.statistics.p95.toFixed(2) }} ms</div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="stat-item">
              <div class="stat-label">P99</div>
              <div class="stat-value">{{ selectedResult.statistics.p99.toFixed(2) }} ms</div>
            </div>
          </el-col>
        </el-row>

        <el-divider content-position="left">验收标准</el-divider>

        <div v-if="selectedResult.acceptanceCriteria.passed" class="acceptance-pass">
          ✅ 测试通过
        </div>
        <div v-else class="acceptance-fail">
          ❌ {{ selectedResult.acceptanceCriteria.failureReason }}
        </div>

        <el-divider content-position="left">运行历史</el-divider>

        <el-table
          :data="selectedResult.statistics.runs"
          size="small"
          max-height="300"
        >
          <el-table-column prop="runNumber" label="序号" width="60" />
          <el-table-column label="耗时 (ms)" width="100">
            <template #default="{ row }">
              {{ row.metrics.duration.toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="error" label="错误" show-overflow-tooltip />
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Timer, VideoPlay, Download, Delete
} from '@element-plus/icons-vue'
import { PerformanceBenchmarkSuite } from '../../../tests/performance/benchmarks'
import { PerformanceReportFormatter } from '../../../tests/performance/benchmark-core'
import type { BenchmarkResult, PerformanceReport } from '../../../tests/performance/types'

const router = useRouter()

// ========== 状态 ==========

const config = ref({
  iterations: 10,
  warmupRuns: 3,
  timeout: 30000
})

const selectedSuites = ref<string[]>(['db-export', 'search', 'batch-query', 'read'])
const running = ref(false)
const currentTest = ref('')
const completedTests = ref(0)
const totalTests = ref(0)
const results = ref<BenchmarkResult[]>([])
const report = ref<PerformanceReport | null>(null)

const detailDialogVisible = ref(false)
const selectedResult = ref<BenchmarkResult | null>(null)

// ========== 计算属性 ==========

const progressPercent = computed(() => {
  if (totalTests.value === 0) return 0
  return Math.round((completedTests.value / totalTests.value) * 100)
})

const progressStatus = computed(() => {
  if (allPassed.value) return 'success'
  return failedCount.value > 0 ? 'exception' : undefined
})

const allPassed = computed(() => {
  return results.value.length > 0 && results.value.every(r => r.acceptanceCriteria.passed)
})

const failedCount = computed(() => {
  return results.value.filter(r => !r.acceptanceCriteria.passed).length
})

// ========== 方法 ==========

function updateDefaults() {
  // 根据迭代次数调整其他参数
  if (config.value.iterations < 5) {
    config.value.warmupRuns = Math.min(config.value.warmupRuns, 2)
  }
}

async function runBenchmarks() {
  if (selectedSuites.value.length === 0) {
    ElMessage.warning('请至少选择一个测试套件')
    return
  }

  running.value = true
  results.value = []
  report.value = null
  completedTests.value = 0

  try {
    ElMessage.info('开始运行性能基准测试，请稍候...')

    // 创建测试套件并运行
    // 注意：这里需要修改 BenchmarkSuite 以支持进度回调
    const suite = new PerformanceBenchmarkSuite()

    // 估算总测试数
    const suiteCounts = {
      'db-export': 5,
      'search': 3,
      'batch-query': 3,
      'write': 2,
      'read': 3
    }

    totalTests.value = selectedSuites.value.reduce((sum, suite) => {
      return sum + (suiteCounts[suite as keyof typeof suiteCounts] || 0)
    }, 0)

    // 运行测试（目前是同步运行所有，未来可以改为逐步运行）
    const fullReport = await suite.runAll()

    // 收集结果
    results.value = fullReport.results
    report.value = fullReport

    ElMessage.success(`测试完成！${allPassed.value ? '全部通过' : `有 ${failedCount.value} 个失败`}`)

  } catch (error: any) {
    console.error('[Benchmark] 测试失败:', error)
    ElMessage.error(`测试失败: ${error.message}`)
  } finally {
    running.value = false
    currentTest.value = ''
  }
}

function exportReport() {
  if (!report.value) {
    ElMessage.warning('没有可导出的报告')
    return
  }

  ElMessageBox.confirm(
    '请选择导出格式',
    '导出报告',
    {
      confirmButtonText: 'JSON',
      cancelButtonText: 'Markdown',
      distinguishCancelAndClose: true,
      type: 'info'
    }
  ).then(() => {
    // 导出 JSON
    const json = PerformanceReportFormatter.toJSON(report.value!)
    downloadFile(json, 'performance-report.json', 'application/json')
    ElMessage.success('JSON 报告已导出')
  }).catch((action) => {
    if (action === 'cancel') {
      // 导出 Markdown
      const md = PerformanceReportFormatter.toMarkdown(report.value!)
      downloadFile(md, 'performance-report.md', 'text/markdown')
      ElMessage.success('Markdown 报告已导出')
    }
  })
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function clearResults() {
  ElMessageBox.confirm(
    '确定要清空所有测试结果吗？',
    '确认清空',
    {
      type: 'warning'
    }
  ).then(() => {
    results.value = []
    report.value = null
    completedTests.value = 0
    totalTests.value = 0
    ElMessage.success('结果已清空')
  }).catch(() => {
    // 用户取消
  })
}

function showDetail(result: BenchmarkResult) {
  selectedResult.value = result
  detailDialogVisible.value = true
}

function getCategoryType(category: string) {
  const types: Record<string, any> = {
    'db-export': 'danger',
    'search': 'warning',
    'batch-query': 'info',
    'write': 'primary',
    'read': 'success'
  }
  return types[category] || ''
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    'db-export': 'DB 导出',
    'search': '搜索',
    'batch-query': '批量查询',
    'write': '写入',
    'read': '读取'
  }
  return labels[category] || category
}

function formatRecommendation(rec: string): string {
  // 简单的格式化，将换行符转换为 <br>
  return rec.replace(/\n/g, '<br>')
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.benchmark-runner {
  padding: 20px;
  height: 100%;
  background-color: #f5f7fa;
}

.content {
  max-width: 1200px;
  margin: 20px auto 0;
}

.config-card,
.progress-card,
.results-card,
.recommendations-card {
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.progress-info p {
  margin: 8px 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-grid {
  margin: 16px 0;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.acceptance-pass {
  padding: 12px;
  background-color: #f0f9ff;
  border-left: 4px solid #67c23a;
  color: #67c23a;
  font-weight: 600;
}

.acceptance-fail {
  padding: 12px;
  background-color: #fef0f0;
  border-left: 4px solid #f56c6c;
  color: #f56c6c;
}

.recommendations {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
  line-height: 1.6;
}
</style>
