<template>
  <el-card class="chart-card" shadow="never">
    <template #header>
      <span>关心话术类型偏好</span>
    </template>
    <el-empty v-if="points.length === 0" description="暂无话术偏好数据" />
    <VChart v-else class="chart-view" :option="option" autoresize />
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import type { EmotionalPreferencePoint } from '@/database/emotional-api'

use([CanvasRenderer, PieChart, LegendComponent, TooltipComponent])

const props = defineProps<{
  points: EmotionalPreferencePoint[]
}>()

const colorMap: Record<string, string> = {
  empathy: '#67C23A',
  advice: '#E6A23C',
  action: '#409EFF',
  unknown: '#909399',
}

const option = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
  },
  legend: {
    bottom: 0,
  },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '42%'],
      data: props.points.map((point) => ({
        name: point.name,
        value: point.value,
        itemStyle: {
          color: colorMap[point.name] || '#909399',
        },
      })),
      label: {
        formatter: '{b}\n{d}%',
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
