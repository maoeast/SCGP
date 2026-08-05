<script setup lang="ts">
/**
 * AI 对话内嵌跨量表学生画像雷达图（路线 D）。
 *
 * 数据来自 get_student_profile 工具结果（ProfileRadarArtifact），
 * 而非 AI 手写文本——领域强弱量化分由代码从量表等级聚合，保证准确。
 *
 * 雷达图展示各发展领域（感觉统合/情绪调节/社交沟通/认知发展/生活自理）的强弱分布：
 * - 50 分 = 正常基准线；>50 偏强；<50 偏弱
 * - 只画有评估数据的领域轴（多边形至少 3 轴才产出该 artifact）
 * - 与 AiTrendChart 同为「对话气泡内精简版」，不带学生信息卡/明细表
 */
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { ProfileRadarArtifact } from '@/services/ai-tools'

const props = defineProps<{ artifact: ProfileRadarArtifact }>()

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

function initChart() {
  if (!chartRef.value) return

  if (chart) chart.dispose()
  chart = echarts.init(chartRef.value)

  const axes = props.artifact.axes
  const values = props.artifact.values

  // 按 axes 顺序对齐 values（防御：值可能缺某轴，补 0）
  const valueByDomain = new Map(values.map((v) => [v.domain, v]))
  const radarData = axes.map((a) => valueByDomain.get(a.domain)?.strengthScore ?? 0)

  const option: echarts.EChartsOption = {
    title: {
      text: `${props.artifact.student.name} · 发展领域画像`,
      left: 'center',
      textStyle: { fontSize: 14, color: '#303133' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const idx = params.dataIndex as number
        const axis = axes[idx]
        if (!axis) return ''
        const v = valueByDomain.get(axis.domain)
        return `${axis.domainLabel}：${v?.strengthScore ?? 0} 分（${v?.strengthLabel ?? '未评估'}）`
      },
    },
    legend: { bottom: 0, data: ['领域强弱'], textStyle: { fontSize: 11 } },
    radar: {
      indicator: axes.map((a) => ({ name: a.domainLabel, max: 100 })),
      radius: '62%',
      center: ['50%', '52%'],
      splitNumber: 4,
      axisName: { fontSize: 11, color: '#606266' },
      splitArea: { areaStyle: { color: ['rgba(64,158,255,0.02)', 'rgba(64,158,255,0.05)'] } },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      splitLine: { lineStyle: { color: '#e4e7ed' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            name: '领域强弱',
            value: radarData,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: '#409EFF', width: 2 },
            itemStyle: { color: '#409EFF' },
            areaStyle: { color: 'rgba(64,158,255,0.2)' },
          },
        ],
      },
    ],
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
  <div class="ai-profile-radar-card">
    <div ref="chartRef" class="ai-profile-radar"></div>
    <p class="radar-note">雷达图反映各发展领域相对强弱（50 分为正常基准线），具体分数与建议见 AI 文字分析。</p>
  </div>
</template>

<style scoped>
.ai-profile-radar-card {
  margin-top: 8px;
  padding: 8px 4px 4px;
  background: var(--el-fill-color-blank, #fff);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 8px;
}

.ai-profile-radar {
  width: 100%;
  height: 300px;
}

.radar-note {
  margin: 4px 8px 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary, #909399);
}
</style>
