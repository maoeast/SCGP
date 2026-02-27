<template>
  <div class="csirs-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>CSIRS感觉统合评估报告</h2>
          </div>
          <div class="header-actions">
            <el-button type="success" :icon="Document" @click="exportPDF">
              导出PDF
            </el-button>
            <el-button type="primary" :icon="Download" @click="exportWord">
              导出Word
            </el-button>
            <el-button :icon="Clock" @click="viewHistory">
              查看历史
            </el-button>
          </div>
        </div>
      </template>
    </el-card>

    <div class="report-content" id="report-content" v-if="assessment">
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
                <span class="value">{{ assessment.student_name }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">年龄：</span>
                <span class="value">{{ studentAge }}岁</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">评估日期：</span>
                <span class="value">{{ assessDate }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">评定等级：</span>
                <el-tag :type="getLevelTagType(assessment.level)" size="large">
                  {{ assessment.level }}
                </el-tag>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 评估结果总览 -->
      <el-card class="result-card">
        <template #header>
          <h3>评估结果总览</h3>
        </template>
        <div class="result-summary" v-if="totalScoreRule">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="score-item">
                <div class="score-label">总T分</div>
                <div class="score-value" :style="{ color: getTScoreColor(assessment.total_t_score) }">
                  {{ assessment.total_t_score.toFixed(1) }}
                </div>
              </div>
            </el-col>
            <el-col :span="18">
              <div class="evaluation-content">
                <div class="evaluation-title">
                  <el-tag :type="totalScoreRule.severity === 'warning' ? 'danger' : totalScoreRule.severity === 'success' ? 'success' : 'info'" size="large">
                    {{ totalScoreRule.title }}
                  </el-tag>
                </div>
                <div class="evaluation-summary">{{ totalScoreRule.summary }}</div>
                <div class="evaluation-detail" v-html="formatContent(totalScoreRule.content)"></div>
                <div class="evaluation-advice" v-if="totalScoreRule.advice && totalScoreRule.advice.length">
                  <div class="advice-title">专业建议：</div>
                  <ul class="advice-list">
                    <li v-for="(item, index) in totalScoreRule.advice" :key="index" v-html="formatContent(item)"></li>
                  </ul>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 雷达图 -->
      <el-card class="radar-card">
        <template #header>
          <h3>维度得分雷达图</h3>
        </template>
        <div class="radar-content">
          <div ref="radarChartRef" class="radar-chart"></div>
        </div>
      </el-card>

      <!-- 各维度详细得分 -->
      <el-card class="dimensions-card">
        <template #header>
          <h3>各维度详细得分</h3>
        </template>
        <div class="dimensions-content">
          <div v-for="dim in dimensionScores" :key="dim.nameEn" class="dimension-detail">
            <div class="dimension-header">
              <div class="dimension-title">{{ dim.name }}</div>
              <div class="dimension-scores">
                <span class="raw-score">原始分: {{ dim.rawScore }}</span>
                <span class="t-score" :style="{ color: getTScoreColor(dim.tScore) }">
                  {{ dim.isExecutive ? '百分制: ' : 'T分: ' }}{{ dim.tScore.toFixed(1) }}
                </span>
                <el-tag :type="getLevelTagType(dim.level)" size="small">{{ dim.level }}</el-tag>
                <el-tag :type="dim.isLow ? 'danger' : 'success'" size="small">{{ dim.label }}</el-tag>
              </div>
            </div>
            <div class="dimension-feedback">
              <div class="feedback-content" v-if="dim.content" v-html="formatContent(dim.content)"></div>
              <div class="feedback-advice" v-if="dim.advice">
                <strong>训练建议：</strong>{{ dim.advice }}
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 报告签名 -->
      <div class="report-signature">
        <el-row :gutter="40">
          <el-col :span="8">
            <div class="signature-item">
              <div class="signature-line"></div>
              <div class="signature-label">评估师签名</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="signature-item">
              <div class="signature-line"></div>
              <div class="signature-label">日期</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="signature-item">
              <div class="signature-line"></div>
              <div class="signature-label">机构盖章</div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 加载状态 -->
    <el-empty v-else description="加载中..." />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Download, Document, Clock } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { csirsDimensions, getDimensionsByAge } from '@/database/csirs-questions'
import { getEvaluationLevel as getEvalLevel } from '@/database/csirs-conversion'
import { getDatabase } from '@/database/init'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import type { CSIRSAssessment, CSIRSDimension } from '@/types/csirs'

// T分阈值常量
const TSCORE_EXCELLENT_THRESHOLD = 40
const TSCORE_LOW_THRESHOLD = 30

// 颜色常量
const COLOR_GREEN = '#67C23A'
const COLOR_ORANGE = '#E6A23C'
const COLOR_RED = '#F56C6C'

const router = useRouter()
const route = useRoute()
const db = getDatabase()

// 获取CSIRS配置
const csirsConfig = ASSESSMENT_LIBRARY.sensory_integration

// 响应式数据
const assessment = ref<CSIRSAssessment | null>(null)
const radarChartRef = ref<HTMLElement | null>(null)
let radarChart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

// 获取评估ID - 安全处理路由参数
const assessId = computed(() => {
  const id = route.params.assessId
  if (Array.isArray(id)) return id[0] || ''
  return id || ''
})

// 学生年龄（岁）
const studentAge = computed(() => {
  if (!assessment.value?.age_months) return 0
  return Math.floor(assessment.value.age_months / 12)
})

// 评估日期
const assessDate = computed(() => {
  if (!assessment.value?.start_time) return ''
  return new Date(assessment.value.start_time).toLocaleDateString()
})

// 获取适用的维度列表
const applicableDimensions = computed(() => {
  if (!assessment.value?.age_months) return csirsDimensions
  return getDimensionsByAge(assessment.value.age_months)
})

// 各维度得分数据
const dimensionScores = computed(() => {
  if (!assessment.value) return []

  const assessmentData = assessment.value
  return applicableDimensions.value.map(dim => {
    const rawScore = assessmentData.raw_scores[dim.name_en] || 0

    // Executive维度特殊处理：使用百分制分数（原始分/15*100）
    const isExecutive = dim.name_en === 'executive'
    let tScore: number
    let level: any
    let isLow: boolean

    if (isExecutive) {
      // Executive维度：3题，满分15分，转换为百分制
      tScore = (rawScore / 15) * 100
      isLow = tScore < 40
      level = {
        level: isLow ? '偏低' : '正常',
        description: isLow ? '执行功能需要支持' : '执行功能发展良好'
      }
    } else {
      // 其他维度：使用T分转换
      tScore = assessmentData.t_scores[dim.name_en] || 50
      level = getEvalLevel(tScore)
      isLow = tScore < 40
    }

    // 获取维度反馈配置
    const dimConfig = csirsConfig.dimensions[dim.name_en as keyof typeof csirsConfig.dimensions]
    const feedback = isLow ? dimConfig?.low : dimConfig?.high

    return {
      name: dim.name,
      nameEn: dim.name_en,
      rawScore,
      tScore,
      level: level.level,
      label: feedback?.label || (isLow ? '需支持' : '发展优'),
      content: feedback?.content || '',
      advice: feedback?.advice || '',
      isLow,
      isExecutive // 标记是否为executive维度
    }
  })
})

// 总分评定规则
const totalScoreRule = computed(() => {
  if (!assessment.value) return null
  const tScore = assessment.value.total_t_score

  // 查找匹配的规则
  for (const rule of csirsConfig.total_score_rules) {
    const [min, max] = rule.range
    if (tScore >= min && tScore <= max) {
      return rule
    }
  }
  return null
})

// 格式化建议内容（将markdown格式转换为HTML）
const formatContent = (content: string): string => {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

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

// 获取评定等级
const getEvaluationLevel = (tScore: number) => {
  return getEvalLevel(tScore)
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 导出PDF
const exportPDF = async () => {
  try {
    const { exportToPDF } = await import('@/utils/exportUtils')
    await exportToPDF('report-content', `CSIRS评估报告_${assessment.value?.student_name}_${new Date().toLocaleDateString()}`)
    ElMessage.success('PDF导出成功')
  } catch (error) {
    console.error('导出PDF失败:', error)
    ElMessage.error('PDF导出失败，请重试')
  }
}

// 导出Word
const exportWord = async () => {
  try {
    const { exportCSIRSToWord } = await import('@/utils/docxExporter')

    const reportContent = {
      student: {
        name: assessment.value?.student_name || '',
        gender: '未知',
        age: studentAge.value,
        birthday: ''
      },
      assessment: {
        id: assessId.value,
        date: assessDate.value,
        total_t_score: assessment.value?.total_t_score || 0,
        level: assessment.value?.level || ''
      },
      dimensions: dimensionScores.value.map(dim => ({
        name: dim.name,
        rawScore: dim.rawScore,
        tScore: dim.isExecutive ? undefined : dim.tScore,
        percentScore: dim.isExecutive ? dim.tScore : undefined,
        level: dim.level,
        description: dim.content,
        advice: dim.advice
      })),
      summary: totalScoreRule.value?.summary || '',
      advice: totalScoreRule.value?.advice || []
    }

    await exportCSIRSToWord(
      reportContent,
      `CSIRS评估报告_${assessment.value?.student_name}_${new Date().toLocaleDateString()}`
    )
    ElMessage.success('Word导出成功')
  } catch (error) {
    console.error('导出Word失败:', error)
    ElMessage.error('Word导出失败，请重试')
  }
}

// 查看历史
const viewHistory = () => {
  if (assessment.value?.student_id) {
    router.push(`/assessment/csirs/history/${assessment.value.student_id}`)
  }
}

// 初始化雷达图
const initRadarChart = () => {
  if (!radarChartRef.value || !assessment.value) return

  // 销毁已存在的图表
  if (radarChart) {
    radarChart.dispose()
  }

  // 创建新图表
  radarChart = echarts.init(radarChartRef.value)

  // 准备数据
  const dimensions = applicableDimensions.value
  const assessmentData = assessment.value
  const tScores = dimensions.map(dim => assessmentData.t_scores[dim.name_en] || 50)

  // 创建resize处理器
  resizeHandler = () => {
    radarChart?.resize()
  }

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const dataIndex = params.dataIndex
        const dim = dimensions[dataIndex]
        const tScore = tScores[dataIndex]
        // 边界检查：确保dataIndex在有效范围内
        if (dataIndex < 0 || dataIndex >= dimensions.length) {
          return '未知维度'
        }
        return `${dim?.name || '未知'}: ${tScore}分`
      }
    },
    radar: {
      indicator: dimensions.map(dim => ({
        name: dim.name,
        max: 80
      })),
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: '#666',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['#f5f5f5', '#fff']
        }
      },
      axisLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      }
    },
    series: [
      {
        name: '维度得分',
        type: 'radar',
        data: [
          {
            value: tScores,
            name: 'T分',
            itemStyle: {
              color: '#409EFF'
            },
            areaStyle: {
              color: 'rgba(64, 158, 255, 0.3)'
            },
            lineStyle: {
              color: '#409EFF',
              width: 2
            }
          }
        ],
        emphasis: {
          areaStyle: {
            color: 'rgba(64, 158, 255, 0.5)'
          }
        }
      }
    ]
  }

  radarChart.setOption(option)

  // 响应式调整 - 保存handler引用以便后续清理
  if (resizeHandler) {
    window.addEventListener('resize', resizeHandler)
  }
}

// 加载评估数据
const loadAssessment = async () => {
  try {
    // 验证assessId
    const idStr = assessId.value
    if (!idStr) {
      ElMessage.error('评估ID缺失')
      router.push('/assessment')
      return
    }

    const id = parseInt(idStr)
    if (isNaN(id)) {
      ElMessage.error('评估ID格式错误')
      router.push('/assessment')
      return
    }

    const result = db.get(
      `SELECT a.*, s.name as student_name
       FROM csirs_assess a
       JOIN student s ON a.student_id = s.id
       WHERE a.id = ?`,
      [id]
    )

    if (!result) {
      ElMessage.error('评估记录不存在')
      router.push('/assessment')
      return
    }

    // 安全解析JSON字段
    let rawScores: Record<string, number>
    let tScores: Record<string, number>
    try {
      rawScores = JSON.parse(result.raw_scores)
      tScores = JSON.parse(result.t_scores)
    } catch (jsonError) {
      console.error('JSON解析失败:', jsonError)
      ElMessage.error('评估数据格式错误，请联系管理员')
      router.push('/assessment')
      return
    }

    // 构建评估对象
    assessment.value = {
      id: result.id,
      student_id: result.student_id,
      student_name: result.student_name,
      age_months: result.age_months,
      raw_scores: rawScores,
      t_scores: tScores,
      total_t_score: result.total_t_score,
      level: result.level,
      start_time: result.start_time,
      end_time: result.end_time,
      answers: []
    }

    // 初始化图表
    await nextTick()
    initRadarChart()
  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载评估数据失败，请重试')
    router.push('/assessment')
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
  if (radarChart) {
    radarChart.dispose()
    radarChart = null
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadAssessment()
})

// 组件卸载前清理资源
onBeforeUnmount(() => {
  cleanup()
})
</script>

<style scoped>
.csirs-report {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.report-header {
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

.header-actions {
  display: flex;
  gap: 10px;
}

.report-content {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.student-info-card,
.result-card,
.radar-card,
.dimensions-card {
  margin-bottom: 30px;
}

.student-info-card h3,
.result-card h3,
.radar-card h3,
.dimensions-card h3 {
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
}

.result-summary {
  margin-bottom: 20px;
}

.score-item {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.score-label {
  font-size: 16px;
  color: #606266;
  margin-bottom: 10px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
}

.score-description {
  font-size: 16px;
  color: #606266;
  line-height: 1.6;
  padding: 10px 0;
}

/* 评定建议样式 */
.evaluation-content {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  min-height: 200px;
}

.evaluation-title {
  margin-bottom: 15px;
}

.evaluation-summary {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 15px;
}

.evaluation-detail {
  font-size: 15px;
  color: #606266;
  line-height: 1.8;
  margin-bottom: 20px;
}

.evaluation-advice {
  background: #fff;
  padding: 15px;
  border-left: 4px solid #409eff;
  border-radius: 4px;
}

.advice-title {
  font-weight: bold;
  color: #409eff;
  margin-bottom: 10px;
  font-size: 16px;
}

.advice-list {
  margin: 0;
  padding-left: 20px;
}

.advice-list li {
  margin: 8px 0;
  line-height: 1.6;
  color: #606266;
}

/* 维度详情样式 */
.dimension-detail {
  margin-bottom: 25px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.dimension-detail:last-child {
  margin-bottom: 0;
}

.dimension-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.dimension-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.dimension-scores {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.raw-score {
  color: #909399;
  font-size: 14px;
}

.t-score {
  font-weight: bold;
  font-size: 16px;
}

.dimension-feedback {
  padding-left: 0;
}

.feedback-content {
  font-size: 15px;
  color: #606266;
  line-height: 1.8;
  margin-bottom: 12px;
}

.feedback-advice {
  font-size: 14px;
  color: #409eff;
  line-height: 1.6;
  background: #ecf5ff;
  padding: 12px;
  border-radius: 4px;
}

.feedback-advice strong {
  color: #409eff;
}

.radar-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.radar-chart {
  width: 100%;
  height: 500px;
}

.dimensions-content {
  margin-top: 20px;
}

.report-signature {
  margin-top: 60px;
  padding-top: 40px;
  border-top: 2px solid #dcdfe6;
}

.signature-item {
  text-align: center;
}

.signature-line {
  height: 2px;
  background: #303133;
  margin-bottom: 10px;
}

.signature-label {
  color: #606266;
  font-size: 14px;
}

/* 打印样式 */
@media print {
  .report-header {
    display: none;
  }

  .csirs-report {
    background: white;
    padding: 0;
  }

  .report-content {
    box-shadow: none;
    padding: 20px;
  }

  .el-card {
    box-shadow: none;
    border: 1px solid #dcdfe6;
  }
}
</style>
