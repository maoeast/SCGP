<template>
  <el-card class="chart-card" shadow="never">
    <template #header>
      <span>情绪识别正确率趋势</span>
    </template>
    <el-empty v-if="points.length === 0" description="暂无趋势数据" />
    <VChart v-else class="chart-view" :option="option" autoresize />
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import type { EmotionalTrendPoint } from '@/database/emotional-api'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const props = defineProps<{
  points: EmotionalTrendPoint[]
}>()

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
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
    data: props.points.map((point) => point.label),
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
      type: 'line',
      smooth: true,
      data: props.points.map((point) => point.accuracy),
      lineStyle: {
        color: '#409EFF',
        width: 3,
      },
      itemStyle: {
        color: '#409EFF',
      },
      areaStyle: {
        color: 'rgba(64, 158, 255, 0.14)',
      },
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
