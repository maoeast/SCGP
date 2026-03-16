<template>
  <el-card class="chart-card" shadow="never">
    <template #header>
      <span>不同情绪类型识别表现</span>
    </template>
    <el-empty v-if="points.length === 0" description="暂无情绪表现数据" />
    <VChart v-else class="chart-view" :option="option" autoresize />
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import type { EmotionalPerformancePoint } from '@/database/emotional-api'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent])

const props = defineProps<{
  points: EmotionalPerformancePoint[]
}>()

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const item = props.points[params?.[0]?.dataIndex || 0]
      if (!item) return ''
      return `${item.emotion}<br/>正确率：${item.accuracy}%<br/>平均提示等级：${item.averageHintLevel}`
    },
  },
  grid: {
    left: 24,
    right: 24,
    top: 24,
    bottom: 24,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: props.points.map((point) => point.emotion),
    axisLabel: {
      color: '#909399',
    },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: {
      formatter: '{value}%',
      color: '#909399',
    },
    splitLine: {
      lineStyle: {
        color: '#ebeef5',
      },
    },
  },
  series: [
    {
      type: 'bar',
      barWidth: '48%',
      data: props.points.map((point) => ({
        value: point.accuracy,
        itemStyle: {
          color: point.color,
          borderRadius: [12, 12, 0, 0],
        },
      })),
    },
  ],
}))
</script>

<style scoped>
.chart-card {
  border-radius: 22px;
}

.chart-view {
  height: 320px;
}
</style>
