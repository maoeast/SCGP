<template>
  <el-card class="chart-card" shadow="never">
    <template #header>
      <span>各类场景掌握情况分布</span>
    </template>
    <el-empty v-if="points.length === 0" description="暂无场景掌握数据" />
    <VChart v-else class="chart-view" :option="option" autoresize />
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import type { EmotionalSceneMasteryPoint } from '@/database/emotional-api'

use([CanvasRenderer, RadarChart, LegendComponent, TooltipComponent])

const props = defineProps<{
  points: EmotionalSceneMasteryPoint[]
}>()

const option = computed<EChartsOption>(() => ({
  tooltip: {},
  radar: {
    indicator: props.points.map((point) => ({
      name: point.category,
      max: 100,
    })),
    radius: '62%',
    splitArea: {
      areaStyle: {
        color: ['rgba(64, 158, 255, 0.04)', 'rgba(64, 158, 255, 0.08)'],
      },
    },
  },
  series: [
    {
      type: 'radar',
      data: [
        {
          name: '掌握情况',
          value: props.points.map((point) => point.accuracy),
          areaStyle: {
            color: 'rgba(64, 158, 255, 0.18)',
          },
          lineStyle: {
            color: '#409EFF',
            width: 3,
          },
          itemStyle: {
            color: '#409EFF',
          },
        },
      ],
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
