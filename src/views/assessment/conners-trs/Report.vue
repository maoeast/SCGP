<!-- src/views/assessment/conners-trs/Report.vue -->
<template>
  <div class="conners-trs-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>Conners 教师问卷评估报告 (TRS)</h2>
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
                <span class="label">性别：</span>
                <span class="value">{{ assessment.gender }}</span>
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
          </el-row>
        </div>
      </el-card>

      <!-- 效度检查 -->
      <el-card class="validity-card" v-if="validityData">
        <template #header>
          <h3>📊 问卷质量检查</h3>
        </template>
        <div class="validity-content">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="validity-item" :class="{ 'validity-warning': validityData.piStatus === 'warning' }">
                <div class="validity-label">正向指标 (PI)</div>
                <div class="validity-score">{{ validityData.piScore }}</div>
                <el-tag :type="validityData.piStatus === 'warning' ? 'warning' : 'success'" size="small">
                  {{ validityData.piStatus === 'warning' ? '需留意' : '正常' }}
                </el-tag>
                <div class="validity-desc" v-if="validityData.piStatus === 'warning'">
                  评估者倾向于过分强调优点，建议结合观察核实
                </div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="validity-item" :class="{ 'validity-warning': validityData.niStatus === 'warning' }">
                <div class="validity-label">负向指标 (NI)</div>
                <div class="validity-score">{{ validityData.niScore }}</div>
                <el-tag :type="validityData.niStatus === 'warning' ? 'danger' : 'success'" size="small">
                  {{ validityData.niStatus === 'warning' ? '需留意' : '正常' }}
                </el-tag>
                <div class="validity-desc" v-if="validityData.niStatus === 'warning'">
                  负向描述得分异常偏高，需进一步核实情况
                </div>
              </div>
            </el-col>
          </el-row>
          <div class="validity-note" v-if="validityData.invalidReason">
            <el-alert :title="'注意：' + validityData.invalidReason" type="warning" :closable="false" />
          </div>
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
                <div class="score-label">总分</div>
                <div class="score-value" :style="{ color: getTScoreColor(totalTScore) }">
                  {{ totalTScore.toFixed(1) }}
                </div>
                <div class="score-description">T分</div>
              </div>
            </el-col>
            <el-col :span="18">
              <div class="evaluation-content">
                <div class="evaluation-title">
                  <el-tag :type="getLevelTagType(assessment.level)" size="large">
                    {{ totalScoreRule.title }}
                  </el-tag>
                </div>
                <div class="evaluation-detail" v-html="formatContent(replacePlaceholders(totalScoreRule.content))"></div>
                <div class="evaluation-advice" v-if="totalScoreRule.advice && totalScoreRule.advice.length">
                  <div class="advice-title">专业建议：</div>
                  <ul class="advice-list">
                    <li v-for="(item, index) in totalScoreRule.advice" :key="index" v-html="formatContent(replacePlaceholders(item))"></li>
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
                <span class="raw-score">原始分: {{ dim.rawScore.toFixed(2) }}</span>
                <span class="t-score" :style="{ color: getTScoreColor(dim.tScore) }">
                  T分: {{ dim.tScore.toFixed(1) }}
                </span>
                <el-tag :type="getLevelTagType(dim.level)" size="small">{{ dim.levelText }}</el-tag>
                <el-tag :type="dim.isHigh ? 'warning' : 'success'" size="small">{{ dim.label }}</el-tag>
              </div>
            </div>
            <div class="dimension-feedback">
              <div class="feedback-core" v-if="dim.levelContent" v-html="formatContent(replacePlaceholders(dim.levelContent, { dimensionName: dim.name }))"></div>
              <div class="feedback-section" v-if="dim.levelAdvice && dim.shouldShowAdvice">
                <strong>💡 专业建议：</strong>
                <div v-html="formatContent(replacePlaceholders(dim.levelAdvice, { dimensionName: dim.name }))"></div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 总结与展望 -->
      <el-card class="summary-card" v-if="summaryConfig">
        <template #header>
          <h3>{{ summaryConfig.title }}</h3>
        </template>
        <div class="summary-content">
          <div v-if="summaryConfig.principles" class="principles">
            <div v-for="(principle, index) in summaryConfig.principles" :key="index" class="principle-item">
              <div class="principle-name">{{ principle.name }}</div>
              <div class="principle-description">{{ principle.description }}</div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 专家寄语 -->
      <el-card class="expert-card" v-if="expertMessage">
        <template #header>
          <h3>专家寄语</h3>
        </template>
        <div class="expert-content" v-html="formatContent(replacePlaceholders(expertMessage))"></div>
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
import { ConnersTRSAPI } from '@/database/api'
import { getDatabase } from '@/database/init'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import type { ConnersTRSAssessment } from '@/types/conners'

// T分阈值常量
const TSCORE_CLINICAL_THRESHOLD = 70
const TSCORE_BORDERLINE_THRESHOLD = 60

// 颜色常量
const COLOR_GREEN = '#67C23A'
const COLOR_ORANGE = '#E6A23C'
const COLOR_RED = '#F56C6C'

// 维度名称映射
const DIMENSION_NAMES: Record<string, string> = {
  conduct: '品行问题',
  hyperactivity: '多动',
  inattention_passivity: '注意力-被动',
  hyperactivity_index: '多动指数'
}

// 等级文本映射
const LEVEL_TEXTS: Record<string, string> = {
  normal: '正常范围',
  borderline: '临界偏高',
  clinical: '临床显著'
}

const router = useRouter()
const route = useRoute()
const db = getDatabase()
const trsAPI = new ConnersTRSAPI(db)

// 获取Conners配置
const connersConfig = ASSESSMENT_LIBRARY.conners

// 响应式数据
const assessment = ref<ConnersTRSAssessment | null>(null)
const radarChartRef = ref<HTMLElement | null>(null)
let radarChart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

// 获取评估ID
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

// 效度数据
const validityData = computed(() => {
  if (!assessment.value) return null
  return {
    piScore: assessment.value.pi_score,
    piThreshold: 2.5,
    piStatus: assessment.value.pi_score > 2.5 ? 'warning' : 'pass',
    niScore: assessment.value.ni_score,
    niThreshold: 2.2,
    niStatus: assessment.value.ni_score > 2.2 ? 'warning' : 'pass',
    invalidReason: assessment.value.invalid_reason
  }
})

// 总分（多动指数T分）- 从 t_scores JSON 中读取
const totalTScore = computed(() => {
  if (!assessment.value) return 0
  const tScores = JSON.parse(assessment.value.t_scores)
  return tScores.hyperactivity_index ?? assessment.value.hyperactivity_index ?? 0
})

// 各维度得分数据
const dimensionScores = computed(() => {
  if (!assessment.value) return []

  const rawScores = JSON.parse(assessment.value.raw_scores)
  const tScores = JSON.parse(assessment.value.t_scores)
  // 优先从 t_scores JSON 中读取，确保与分维度数据一致
  const hyperIndex = tScores.hyperactivity_index ?? assessment.value.hyperactivity_index ?? 0

  // 判断总分是否异常
  const isTotalScoreAbnormal = hyperIndex >= TSCORE_BORDERLINE_THRESHOLD

  return Object.keys(DIMENSION_NAMES).map(dimKey => {
    const rawScore = rawScores[dimKey] || 0
    const tScore = tScores[dimKey] || 50
    const isHigh = tScore >= TSCORE_BORDERLINE_THRESHOLD
    const level = tScore < TSCORE_BORDERLINE_THRESHOLD ? 'normal' : tScore < TSCORE_CLINICAL_THRESHOLD ? 'borderline' : 'clinical'

    // 获取维度反馈配置
    const dimConfig = connersConfig.dimensions[dimKey]

    // 根据 rawScore 从 levels 数组中查找匹配的等级
    let matchedLevel = null
    if (dimConfig?.levels) {
      // 按照排序查找第一个满足 rawScore <= max 的等级
      const sortedLevels = [...dimConfig.levels].sort((a, b) => a.max - b.max)
      matchedLevel = sortedLevels.find(lvl => rawScore <= lvl.max) || sortedLevels[sortedLevels.length - 1]
    }

    // 分层筛选法：
    // 1. 如果总分异常 → 显示所有维度建议
    // 2. 如果总分正常：
    //    - 所有子维度正常 → 不显示所有"分维度建议"
    //    - 有子维度异常 → 只显示异常维度的建议
    const shouldShowAdvice = isTotalScoreAbnormal || (isHigh && !isTotalScoreAbnormal)

    return {
      name: DIMENSION_NAMES[dimKey],
      nameEn: dimKey,
      rawScore,
      tScore,
      level,
      levelText: LEVEL_TEXTS[level],
      label: matchedLevel?.title || (isHigh ? '需关注' : '正常'),
      isHigh,
      shouldShowAdvice,
      levelTitle: matchedLevel?.title || '',
      levelContent: matchedLevel?.content || '',
      levelAdvice: matchedLevel?.advice || ''
    }
  })
})

// 总分评定规则
const totalScoreRule = computed(() => {
  if (!assessment.value) return null
  // 优先从 t_scores JSON 中读取，确保与分维度数据一致
  const tScores = JSON.parse(assessment.value.t_scores)
  const hyperIndex = tScores.hyperactivity_index ?? assessment.value.hyperactivity_index ?? 0

  // 查找匹配的规则
  for (const rule of connersConfig.total_score_rules) {
    const [min, max] = rule.range
    if (hyperIndex >= min && hyperIndex <= max) {
      return rule
    }
  }
  return connersConfig.total_score_rules[0]
})

// 专家寄语（优先使用规则中指定的，否则使用默认的）
const expertMessage = computed(() => {
  return totalScoreRule.value?.expert_message || connersConfig.expert_message || ''
})

// 总结与展望（优先使用规则中指定的 specific_summary，否则使用全局的）
const summaryConfig = computed(() => {
  return totalScoreRule.value?.specific_summary || connersConfig.summary || null
})

// 替换占位符
const replacePlaceholders = (text: string, customVars?: Record<string, string>): string => {
  if (!text) return ''
  let result = text
  result = result.replace(/\[儿童姓名\]/g, assessment.value?.student_name || '该儿童')
  if (customVars?.dimensionName) {
    result = result.replace(/\[具体维度\]/g, customVars.dimensionName)
  }
  return result
}

// 格式化建议内容（将markdown格式转换为HTML）
const formatContent = (content: string): string => {
  if (!content) return ''
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

// 获取T分对应的颜色
const getTScoreColor = (tScore: number): string => {
  if (tScore < TSCORE_BORDERLINE_THRESHOLD) return COLOR_GREEN
  if (tScore < TSCORE_CLINICAL_THRESHOLD) return COLOR_ORANGE
  return COLOR_RED
}

// 获取等级对应的标签类型
const getLevelTagType = (level: string): string => {
  const typeMap: Record<string, string> = {
    'normal': 'success',
    'borderline': 'warning',
    'clinical': 'danger'
  }
  return typeMap[level] || ''
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 导出PDF
const exportPDF = async () => {
  try {
    const { exportToPDF } = await import('@/utils/exportUtils')
    await exportToPDF('report-content', `Conners-TRS评估报告_${assessment.value?.student_name}_${new Date().toLocaleDateString()}`)
    ElMessage.success('PDF导出成功')
  } catch (error) {
    console.error('导出PDF失败:', error)
    ElMessage.error('PDF导出失败，请重试')
  }
}

// 导出Word
const exportWord = async () => {
  try {
    const { exportConnersToWord } = await import('@/utils/docxExporter')

    const reportContent = {
      student: {
        name: assessment.value?.student_name || '',
        gender: assessment.value?.gender || '未知',
        age: studentAge.value,
        birthday: ''
      },
      assessment: {
        id: assessId.value,
        date: assessDate.value,
        scaleType: 'trs' as const,
        pi_score: assessment.value?.pi_score || 0,
        ni_score: assessment.value?.ni_score || 0,
        is_valid: assessment.value?.is_valid !== 0,
        invalid_reason: assessment.value?.invalid_reason
      },
      dimensions: dimensionScores.value.map(dim => ({
        name: dim.name,
        rawScore: dim.rawScore,
        tScore: dim.tScore,
        level: dim.level,
        description: dim.levelContent,
        advice: dim.levelAdvice
      })),
      totalScore: totalTScore.value,
      totalLevel: totalScoreRule.value?.severity === 'danger' ? 'clinical' :
                  totalScoreRule.value?.severity === 'warning' ? 'borderline' : 'normal',
      summary: totalScoreRule.value?.content || '',
      advice: totalScoreRule.value?.advice || []
    }

    await exportConnersToWord(
      reportContent,
      `Conners-TRS评估报告_${assessment.value?.student_name}_${new Date().toLocaleDateString()}`
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
    router.push(`/assessment/conners-trs/history/${assessment.value.student_id}`)
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
  const tScores = JSON.parse(assessment.value.t_scores)
  const dimensions = Object.keys(DIMENSION_NAMES).map(key => ({
    name: DIMENSION_NAMES[key],
    key
  }))
  const scores = dimensions.map(dim => tScores[dim.key] || 50)

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
        const score = scores[dataIndex]
        return `${dim?.name || '未知'}: ${score.toFixed(1)}分`
      }
    },
    radar: {
      indicator: dimensions.map(dim => ({
        name: dim.name,
        max: 90
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
      }
    },
    series: [
      {
        name: '维度得分',
        type: 'radar',
        data: [
          {
            value: scores,
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
        ]
      }
    ]
  }

  radarChart.setOption(option)

  // 响应式调整
  if (resizeHandler) {
    window.addEventListener('resize', resizeHandler)
  }
}

// 加载评估数据
const loadAssessment = async () => {
  try {
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
       FROM conners_trs_assess a
       JOIN student s ON a.student_id = s.id
       WHERE a.id = ?`,
      [id]
    )

    if (!result) {
      ElMessage.error('评估记录不存在')
      router.push('/assessment')
      return
    }

    assessment.value = result

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
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (radarChart) {
    radarChart.dispose()
    radarChart = null
  }
}

onMounted(() => {
  loadAssessment()
})

onBeforeUnmount(() => {
  cleanup()
})
</script>

<style scoped>
.conners-trs-report {
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
.validity-card,
.result-card,
.radar-card,
.dimensions-card,
.summary-card,
.expert-card {
  margin-bottom: 30px;
}

.student-info-card h3,
.validity-card h3,
.result-card h3,
.radar-card h3,
.dimensions-card h3,
.summary-card h3,
.expert-card h3 {
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

/* 效度检查样式 */
.validity-content {
  padding: 10px 0;
}

.validity-item {
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.validity-item.validity-warning {
  background: #fef0f0;
  border: 1px solid #fbc4c4;
}

.validity-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.validity-score {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 10px;
}

.validity-desc {
  margin-top: 10px;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.validity-note {
  margin-top: 15px;
}

/* 评估结果样式 */
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
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.evaluation-content {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.evaluation-title {
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

.feedback-core {
  font-size: 15px;
  color: #606266;
  line-height: 1.8;
  margin-bottom: 15px;
  padding: 15px;
  background: #ecf5ff;
  border-radius: 4px;
}

.feedback-section {
  margin-top: 15px;
}

.feedback-section strong {
  display: block;
  margin-bottom: 10px;
  color: #409eff;
}

/* 雷达图样式 */
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

/* 总结样式 */
.summary-content {
  padding: 10px 0;
}

.principles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.principle-item {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}

.principle-name {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 10px;
}

.principle-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* 专家寄语样式 */
.expert-content {
  font-size: 15px;
  color: #606266;
  line-height: 1.8;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #67C23A;
}

/* 报告签名 */
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

  .conners-trs-report {
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
