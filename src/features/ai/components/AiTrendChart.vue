<script setup lang="ts">
/**
 * AI 对话内嵌评估趋势图（路线 C）。
 *
 * 数据来自 get_assessment_trend 工具结果（AssessmentTrendArtifact），
 * 而非 AI 手写文本——保证图表数值 100% 准确，与 DB 一致。
 *
 * 与独立趋势页 AssessmentTrendPage 的区别：这里是「对话气泡内的精简版」，
 * 只放图 + 分数说明，不带学生信息卡/历史表格（那些在 AI 文字回复里已涵盖）。
 * echarts 用法对齐 AssessmentTrendPage（裸 echarts.init，非 vue-echarts 组件）。
 */
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import type { AssessmentTrendArtifact } from '@/services/ai-tools'

const props = defineProps<{ artifact: AssessmentTrendArtifact }>()

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

// snapshots 已升序（最早在前），直接用作 x 轴
const snapshots = computed(() => props.artifact.snapshots)

// 维度列名并集（保持首次出现顺序）
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

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}

function initChart() {
  if (!chartRef.value || snapshots.value.length === 0) return

  if (chart) chart.dispose()
  chart = echarts.init(chartRef.value)

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

  // 各维度线（虚线，区分于总分）
  const dimSeries = dims.map((dim) => ({
    name: dim,
    type: 'line' as const,
    data: snapshots.value.map((s) => s.dimensionScores[dim] ?? null),
    smooth: true,
    lineStyle: { width: 2, type: 'dashed' as const },
    connectNulls: true,
  }))

  const option: echarts.EChartsOption = {
    title: {
      text: `${props.artifact.scaleName} · 分数变化趋势`,
      left: 'center',
      textStyle: { fontSize: 14, color: '#303133' },
    },
    tooltip: { trigger: 'axis' },
    legend: { data: ['总分', ...dims], top: 28, type: 'scroll', textStyle: { fontSize: 11 } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 70, containLabel: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value', name: '分数' },
    series: [totalSeries, ...dimSeries] as echarts.SeriesOption[],
  }

  chart.setOption(option)
  resizeHandler = () => chart?.resize()
  window.addEventListener('resize', resizeHandler)
}

onMounted(async () => {
  await nextTick()
  initChart()
})

onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<template>
  <div class="ai-trend-chart-card">
    <div ref="chartRef" class="ai-trend-chart"></div>
    <p v-if="artifact.scoreNote" class="score-note">{{ artifact.scoreNote }}</p>
  </div>
</template>

<style scoped>
.ai-trend-chart-card {
  margin-top: 8px;
  padding: 8px 4px 4px;
  background: var(--el-fill-color-blank, #fff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 8px;
}

.ai-trend-chart {
  width: 100%;
  height: 280px;
}

.score-note {
  margin: 4px 8px 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary, #909399);
}
</style>
