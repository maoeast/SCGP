<template>
  <div class="cbcl-report">
    <!-- Header -->
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>CBCL 儿童行为量表评估报告</h2>
          </div>
          <div class="header-actions">
            <el-button type="success" :icon="Document" @click="exportPDF">导出PDF</el-button>
          </div>
        </div>
      </template>

      <!-- Student Info -->
      <div class="student-info" v-if="studentInfo">
        <div class="info-item">
          <span class="label">学生姓名：</span>
          <span class="value">{{ studentInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">性别：</span>
          <span class="value">{{ studentInfo.gender }}</span>
        </div>
        <div class="info-item">
          <span class="label">年龄：</span>
          <span class="value">{{ formatAge(studentInfo.ageMonths) }}</span>
        </div>
        <div class="info-item">
          <span class="label">评估日期：</span>
          <span class="value">{{ formatDate(assessData?.start_time) }}</span>
        </div>
        <div class="info-item" v-if="normGroupLabel">
          <span class="label">常模组：</span>
          <span class="value">{{ normGroupLabel }}</span>
        </div>
      </div>
    </el-card>

    <!-- Disclaimer -->
    <el-alert
      class="disclaimer-alert"
      type="warning"
      :closable="false"
      show-icon
      title="重要声明"
      description="本评估结果仅供教育支持参考，不能作为医学诊断依据。如发现显著异常，请前往正规医院发育行为科或精神心理科就诊。"
    />

    <!-- Social Competence Section -->
    <el-card class="social-competence-card" v-if="socialCompetence">
      <template #header>
        <h3>📊 社会能力评估</h3>
      </template>
      <el-row :gutter="20" class="social-scores">
        <el-col :span="8" v-for="factor in socialFactors" :key="factor.code">
          <div class="score-card" :class="factor.levelClass">
            <div class="score-value">{{ factor.score.toFixed(1) }}</div>
            <div class="score-label">{{ factor.name }}</div>
            <el-tag :type="factor.tagType" size="small">{{ factor.status }}</el-tag>
          </div>
        </el-col>
      </el-row>
      <div class="social-feedback" v-if="feedback?.socialCompetence">
        <h4>评估说明</h4>
        <div class="feedback-content" v-html="formatMarkdown(feedback.socialCompetence.summary)"></div>
        <h4>建议</h4>
        <div class="feedback-content" v-html="formatMarkdown(feedback.socialCompetence.advice)"></div>
      </div>
    </el-card>

    <!-- Clinical Profile Chart -->
    <el-card class="clinical-profile-card">
      <template #header>
        <div class="chart-header">
          <h3>📈 临床剖面图</h3>
          <span class="norm-group" v-if="normGroupLabel">常模组：{{ normGroupLabel }}</span>
        </div>
      </template>
      <div ref="chartRef" class="profile-chart"></div>
      <div class="chart-legend">
        <span class="legend-item normal">
          <span class="legend-dot" style="background: #67c23a;"></span>
          正常 (T &lt; 65)
        </span>
        <span class="legend-item borderline">
          <span class="legend-dot" style="background: #e6a23c;"></span>
          边缘 (65-69)
        </span>
        <span class="legend-item clinical">
          <span class="legend-dot" style="background: #f56c6c;"></span>
          临床 (T &ge; 70)
        </span>
      </div>
    </el-card>

    <!-- Syndrome Scales Table -->
    <el-card class="syndrome-table-card">
      <template #header>
        <h3>📋 行为问题因子详情</h3>
      </template>
      <el-table :data="syndromeTableData" stripe style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expanded-content">
              <div v-if="row.summary" class="feedback-section">
                <div class="section-title"><span class="section-icon">📋</span>评估说明</div>
                <div class="section-content" v-html="formatMarkdown(row.summary)"></div>
              </div>
              <div v-if="row.advice" class="feedback-section">
                <div class="section-title"><span class="section-icon">💡</span>专家建议</div>
                <div class="section-content" v-html="formatMarkdown(row.advice)"></div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="因子名称" min-width="120" />
        <el-table-column prop="rawScore" label="原始分" width="100" align="center" />
        <el-table-column prop="tScore" label="T分数" width="100" align="center">
          <template #default="{ row }">
            <span :class="getTScoreClass(row.tScore)">{{ row.tScore }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="levelName" label="等级" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.level)">{{ row.levelName }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Broad Band Scores -->
    <el-card class="broadband-card" v-if="broadBandData">
      <template #header>
        <h3>🎯 宽带量表</h3>
      </template>
      <el-row :gutter="20">
        <!-- 内化问题 -->
        <el-col :span="12">
          <div class="broadband-item" :class="getTScoreClass(broadBandData.internalizingTScore)">
            <div class="broadband-header">
              <span class="broadband-icon">🧠</span>
              <span class="broadband-label">内化问题</span>
              <el-tag :type="broadBandData.internalizingTScore >= 64 ? 'danger' : 'success'" size="small">
                {{ broadBandData.internalizingTScore >= 64 ? '需关注' : '正常' }}
              </el-tag>
            </div>
            <div class="broadband-score" :class="getTScoreClass(broadBandData.internalizingTScore)">
              T = {{ broadBandData.internalizingTScore }}
            </div>
            <div class="broadband-desc">焦虑、抑郁、躯体化、退缩等内向表现</div>
            <!-- 详细反馈 -->
            <div v-if="feedback?.broadband?.internalizing" class="broadband-feedback">
              <div class="broadband-title">{{ feedback.broadband.internalizing.title }}</div>
              <div class="broadband-content" v-html="formatMarkdown(feedback.broadband.internalizing.content)"></div>
              <!-- 结构化建议 -->
              <div v-if="feedback.broadband.internalizing.structuredAdvice" class="structured-advice">
                <div v-if="feedback.broadband.internalizing.structuredAdvice.environment_setup?.length" class="advice-block">
                  <div class="advice-block-title"><span class="advice-icon">🏠</span>环境创设</div>
                  <div class="advice-block-content" v-html="formatMarkdown(formatMarkdownList(feedback.broadband.internalizing.structuredAdvice.environment_setup))"></div>
                </div>
                <div v-if="feedback.broadband.internalizing.structuredAdvice.interaction_strategy?.length" class="advice-block">
                  <div class="advice-block-title"><span class="advice-icon">🤝</span>互动策略</div>
                  <div class="advice-block-content" v-html="formatMarkdown(formatMarkdownList(feedback.broadband.internalizing.structuredAdvice.interaction_strategy))"></div>
                </div>
                <div v-if="feedback.broadband.internalizing.structuredAdvice.professional_support?.length" class="advice-block">
                  <div class="advice-block-title"><span class="advice-icon">👨‍⚕️</span>专业支持</div>
                  <div class="advice-block-content" v-html="formatMarkdown(formatMarkdownList(feedback.broadband.internalizing.structuredAdvice.professional_support))"></div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
        <!-- 外化问题 -->
        <el-col :span="12">
          <div class="broadband-item" :class="getTScoreClass(broadBandData.externalizingTScore)">
            <div class="broadband-header">
              <span class="broadband-icon">⚡</span>
              <span class="broadband-label">外化问题</span>
              <el-tag :type="broadBandData.externalizingTScore >= 64 ? 'danger' : 'success'" size="small">
                {{ broadBandData.externalizingTScore >= 64 ? '需关注' : '正常' }}
              </el-tag>
            </div>
            <div class="broadband-score" :class="getTScoreClass(broadBandData.externalizingTScore)">
              T = {{ broadBandData.externalizingTScore }}
            </div>
            <div class="broadband-desc">违纪、攻击性、冲动等多动/违抗表现</div>
            <!-- 详细反馈 -->
            <div v-if="feedback?.broadband?.externalizing" class="broadband-feedback">
              <div class="broadband-title">{{ feedback.broadband.externalizing.title }}</div>
              <div class="broadband-content" v-html="formatMarkdown(feedback.broadband.externalizing.content)"></div>
              <!-- 结构化建议 -->
              <div v-if="feedback.broadband.externalizing.structuredAdvice" class="structured-advice">
                <div v-if="feedback.broadband.externalizing.structuredAdvice.environment_setup?.length" class="advice-block">
                  <div class="advice-block-title"><span class="advice-icon">🏠</span>环境创设</div>
                  <div class="advice-block-content" v-html="formatMarkdown(formatMarkdownList(feedback.broadband.externalizing.structuredAdvice.environment_setup))"></div>
                </div>
                <div v-if="feedback.broadband.externalizing.structuredAdvice.interaction_strategy?.length" class="advice-block">
                  <div class="advice-block-title"><span class="advice-icon">🤝</span>互动策略</div>
                  <div class="advice-block-content" v-html="formatMarkdown(formatMarkdownList(feedback.broadband.externalizing.structuredAdvice.interaction_strategy))"></div>
                </div>
                <div v-if="feedback.broadband.externalizing.structuredAdvice.professional_support?.length" class="advice-block">
                  <div class="advice-block-title"><span class="advice-icon">👨‍⚕️</span>专业支持</div>
                  <div class="advice-block-content" v-html="formatMarkdown(formatMarkdownList(feedback.broadband.externalizing.structuredAdvice.professional_support))"></div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- Total Score Summary -->
    <el-card class="total-summary-card">
      <template #header>
        <h3>📊 总体评估</h3>
      </template>
      <div class="total-summary">
        <div class="total-score-row">
          <div class="total-score-item">
            <span class="label">行为问题总分：</span>
            <span class="value">{{ totalProblemsScore }}</span>
            <span class="t-score" :class="getTScoreClass(totalProblemsTScore)">(T = {{ totalProblemsTScore }})</span>
          </div>
        </div>
        <div class="summary-content" v-if="feedback?.overallSummary?.length">
          <h4>评估总结</h4>
          <div v-for="(paragraph, idx) in feedback.overallSummary" :key="idx" class="summary-paragraph" v-html="formatMarkdown(paragraph)"></div>
        </div>
        <div class="expert-advice" v-if="feedback?.overallAdvice?.length">
          <h4>专家建议</h4>
          <div class="advice-list">
            <div v-for="(advice, idx) in feedback.overallAdvice" :key="idx" class="advice-item" v-html="formatMarkdown(advice)"></div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Actions -->
    <div class="report-actions">
      <el-button @click="goBack">返回</el-button>
      <el-button type="primary" @click="exportPDF">打印报告</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document } from '@element-plus/icons-vue'
import { getDatabase } from '@/database/init'
import * as echarts from 'echarts'
import type { CBCLSocialCompetenceResult, CBCLFactorScore } from '@/strategies/assessment/CBCLDriver'

// CBCL 评估记录类型
interface CBCLAssessRecord {
  id: number
  student_id: number
  age_months: number
  gender: string
  social_competence_data: string
  social_activity_score: number
  social_social_score: number
  social_school_score: number
  raw_answers: string
  behavior_raw_scores: string
  factor_t_scores: string
  total_problems_score: number
  total_problems_t_score: number
  internalizing_t_score: number
  externalizing_t_score: number
  summary_level: string
  start_time: string
  end_time: string
}

const route = useRoute()
const router = useRouter()

// 响应式数据
const assessData = ref<CBCLAssessRecord | null>(null)
const studentInfo = ref<{ name: string; ageMonths: number; gender: string } | null>(null)
const feedback = ref<any>(null)
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// 计算属性：常模组标签
const normGroupLabel = computed(() => {
  if (!assessData.value) return ''
  const groupMap: Record<string, string> = {
    'boy_4_5': '4-5岁男孩',
    'boy_6_11': '6-11岁男孩',
    'boy_12_16': '12-16岁男孩',
    'girl_4_5': '4-5岁女孩',
    'girl_6_11': '6-11岁女孩',
    'girl_12_16': '12-16岁女孩'
  }
  // 从 factor_t_scores 推断常模组
  const tScores = JSON.parse(assessData.value.factor_t_scores || '{}')
  const factorNames = Object.keys(tScores)
  if (factorNames.includes('焦虑强迫') || factorNames.includes('抑郁退缩')) {
    return assessData.value.gender === 'male' ? '12-16岁男孩' : '12-16岁女孩'
  } else if (factorNames.includes('不成熟') || factorNames.includes('敌意性')) {
    return '6-11岁女孩'
  }
  return assessData.value.gender === 'male' ? '6-11岁男孩' : '6-11岁女孩'
})

// 计算属性：社会能力数据
const socialCompetence = computed<CBCLSocialCompetenceResult | null>(() => {
  if (!assessData.value) return null
  try {
    // 从数据库分数计算等级和T分数代表值
    // 阈值判定：与Driver中保持一致
    const activityScore = assessData.value.social_activity_score
    const socialScore = assessData.value.social_social_score
    const schoolScore = assessData.value.social_school_score

    // 活动能力判定 (阈值: 3)
    const activityLevel = activityScore < 3 ? 2 : activityScore < 3.5 ? 1 : 0
    const activityTScore = activityLevel === 2 ? 30 : activityLevel === 1 ? 35 : 50

    // 社交情况判定 (阈值: 3)
    const socialLevel = socialScore < 3 ? 2 : socialScore < 3.5 ? 1 : 0
    const socialTScore = socialLevel === 2 ? 30 : socialLevel === 1 ? 35 : 50

    // 学校情况判定 (阈值: 2)
    const schoolLevel = schoolScore < 2 ? 2 : schoolScore < 2.5 ? 1 : 0
    const schoolTScore = schoolLevel === 2 ? 30 : schoolLevel === 1 ? 35 : 50

    return {
      group: null,
      activity: {
        score: activityScore,
        status: activityLevel === 2 ? '可能异常' : activityLevel === 1 ? '边缘/需关注' : '正常',
        level: activityLevel as 0 | 1 | 2,
        tScore: activityTScore
      },
      social: {
        score: socialScore,
        status: socialLevel === 2 ? '可能异常' : socialLevel === 1 ? '边缘/需关注' : '正常',
        level: socialLevel as 0 | 1 | 2,
        tScore: socialTScore
      },
      school: {
        score: schoolScore,
        status: schoolLevel === 2 ? '可能异常' : schoolLevel === 1 ? '边缘/需关注' : '正常',
        level: schoolLevel as 0 | 1 | 2,
        tScore: schoolTScore
      },
      rawScores: {
        factorActivity: activityScore,
        factorSocial: socialScore,
        factorSchool: schoolScore
      }
    }
  } catch {
    return null
  }
})

// 计算属性：社会能力因子展示
const socialFactors = computed(() => {
  if (!socialCompetence.value) return []
  const factors = [
    {
      code: 'activity',
      name: '活动能力',
      score: socialCompetence.value.activity.score,
      status: socialCompetence.value.activity.status,
      level: socialCompetence.value.activity.level,
      levelClass: socialCompetence.value.activity.level === 2 ? 'level-danger' : 'level-success',
      tagType: socialCompetence.value.activity.level === 2 ? 'danger' : 'success'
    },
    {
      code: 'social',
      name: '社交情况',
      score: socialCompetence.value.social.score,
      status: socialCompetence.value.social.status,
      level: socialCompetence.value.social.level,
      levelClass: socialCompetence.value.social.level === 2 ? 'level-danger' : 'level-success',
      tagType: socialCompetence.value.social.level === 2 ? 'danger' : 'success'
    },
    {
      code: 'school',
      name: '学校表现',
      score: socialCompetence.value.school.score,
      status: socialCompetence.value.school.status,
      level: socialCompetence.value.school.level,
      levelClass: socialCompetence.value.school.level === 2 ? 'level-danger' : 'level-success',
      tagType: socialCompetence.value.school.level === 2 ? 'danger' : 'success'
    }
  ]
  return factors
})

// 计算属性：因子分数数据
const factorScores = computed<CBCLFactorScore[]>(() => {
  if (!assessData.value) return []
  try {
    const rawScores = JSON.parse(assessData.value.behavior_raw_scores || '{}')
    const tScores = JSON.parse(assessData.value.factor_t_scores || '{}')

    return Object.entries(rawScores).map(([name, rawScore]) => {
      const tScore = tScores[name] || 50
      const level = tScore >= 70 ? 'clinical' : tScore >= 65 ? 'borderline' : 'normal'
      return {
        code: name,
        name,
        rawScore: rawScore as number,
        tScore,
        level,
        levelName: level === 'clinical' ? '可能异常' : level === 'borderline' ? '边缘/需关注' : '正常',
        p69: 0,
        p98: 0
      }
    })
  } catch {
    return []
  }
})

// 计算属性：综合征量表表格数据
const syndromeTableData = computed(() => {
  return factorScores.value.map(f => ({
    name: f.name,
    rawScore: f.rawScore,
    tScore: f.tScore,
    level: f.level,
    levelName: f.levelName,
    summary: feedback.value?.syndromeScales?.find((s: any) => s.name === f.name)?.summary || '',
    advice: feedback.value?.syndromeScales?.find((s: any) => s.name === f.name)?.advice || ''
  }))
})

// 计算属性：宽带量表数据
const broadBandData = computed(() => {
  if (!assessData.value) return null
  return {
    internalizingTScore: assessData.value.internalizing_t_score,
    externalizingTScore: assessData.value.externalizing_t_score
  }
})

// 计算属性：总分数据
const totalProblemsScore = computed(() => assessData.value?.total_problems_score || 0)
const totalProblemsTScore = computed(() => assessData.value?.total_problems_t_score || 50)

// Markdown 格式化为 HTML
const formatMarkdown = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
}

// 将数组转换为 Markdown 列表
const formatMarkdownList = (items: string[] | undefined): string => {
  if (!items || items.length === 0) return ''
  return items.map(item => `• ${item}`).join('\n')
}

// 方法
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatAge = (ageMonths: number | undefined) => {
  if (!ageMonths && ageMonths !== 0) return '--'
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (years === 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
}

const getTScoreClass = (tScore: number) => {
  if (tScore >= 70) return 'score-clinical'
  if (tScore >= 65) return 'score-borderline'
  return 'score-normal'
}

const getLevelType = (level: string) => {
  const typeMap: Record<string, any> = {
    'normal': 'success',
    'borderline': 'warning',
    'clinical': 'danger'
  }
  return typeMap[level] || 'info'
}

const goBack = () => {
  router.back()
}

const exportPDF = () => {
  ElMessage.info('PDF 导出功能开发中')
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value || factorScores.value.length === 0) return

  chartInstance = echarts.init(chartRef.value)

  const factors = factorScores.value
  const data = factors.map(f => ({
    value: f.tScore,
    itemStyle: {
      color: f.tScore >= 70 ? '#f56c6c' : f.tScore >= 65 ? '#e6a23c' : '#67c23a'
    }
  }))

  const option: echarts.EChartsOption = {
    title: {
      text: 'CBCL 综合征剖面图',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        const factor = factors[p.dataIndex]
        return `${factor.name}<br/>原始分: ${factor.rawScore}<br/>T分数: ${factor.tScore}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'T分数',
      min: 0,
      max: 100,
      interval: 10,
      axisLine: { show: true },
      splitLine: { show: true, lineStyle: { type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: factors.map(f => f.name),
      axisLabel: {
        fontSize: 12
      }
    },
    series: [
      {
        type: 'bar',
        data: data,
        barWidth: '60%',
        label: {
          show: true,
          position: 'right',
          formatter: '{c}'
        },
        markLine: {
          symbol: 'none',
          data: [
            {
              xAxis: 65,
              label: { formatter: '边缘', position: 'end' },
              lineStyle: { color: '#e6a23c', type: 'dashed', width: 2 }
            },
            {
              xAxis: 70,
              label: { formatter: '临床', position: 'end' },
              lineStyle: { color: '#f56c6c', type: 'dashed', width: 2 }
            }
          ]
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

// 加载数据
const loadAssessData = async () => {
  const assessId = route.params.assessId
  if (!assessId) {
    ElMessage.error('缺少评估记录ID')
    return
  }

  try {
    const db = getDatabase()

    // 查询评估记录
    const record = db.get('SELECT * FROM cbcl_assess WHERE id = ?', [assessId]) as CBCLAssessRecord
    if (!record) {
      ElMessage.error('评估记录不存在')
      return
    }
    assessData.value = record

    // 查询学生信息
    const student = db.get('SELECT name, gender FROM student WHERE id = ?', [record.student_id])
    if (student) {
      studentInfo.value = {
        name: student.name,
        ageMonths: record.age_months,
        gender: student.gender
      }
    }

    // 初始化图表
    setTimeout(() => {
      initChart()
    }, 100)

    console.log('CBCL 报告数据加载完成:', {
      record: record.id,
      student: studentInfo.value?.name,
      totalTScore: record.total_problems_t_score
    })
  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

// 生命周期
onMounted(() => {
  loadAssessData()
  window.addEventListener('resize', () => {
    chartInstance?.resize()
  })
})

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', () => {
    chartInstance?.resize()
  })
})
</script>

<style scoped>
.cbcl-report {
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
  gap: 16px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.student-info {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-item .label {
  color: #909399;
}

.info-item .value {
  font-weight: 500;
  color: #303133;
}

.disclaimer-alert {
  margin-bottom: 20px;
}

.social-competence-card {
  margin-bottom: 20px;
}

.social-competence-card h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.social-scores {
  margin-bottom: 20px;
}

.score-card {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  transition: all 0.3s;
}

.score-card.level-success {
  background: linear-gradient(135deg, #f0f9eb 0%, #e6f7d6 100%);
  border: 1px solid #b3e19d;
}

.score-card.level-danger {
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border: 1px solid #fab6b6;
}

.score-card .score-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.score-card .score-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.social-feedback {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.social-feedback h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
}

.social-feedback p {
  margin: 0 0 16px 0;
  line-height: 1.6;
  color: #606266;
}

.social-feedback p:last-child {
  margin-bottom: 0;
}

.feedback-content {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 16px;
}

.feedback-content:last-child {
  margin-bottom: 0;
}

/* 展开内容样式 */
.feedback-section {
  margin-bottom: 16px;
}

.feedback-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  font-size: 16px;
}

.section-content {
  line-height: 1.8;
  color: #606266;
  padding-left: 22px;
}

.clinical-profile-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.norm-group {
  font-size: 14px;
  color: #909399;
}

.profile-chart {
  width: 100%;
  height: 400px;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.syndrome-table-card {
  margin-bottom: 20px;
}

.syndrome-table-card h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.expanded-content {
  padding: 16px 20px;
  background: #fafafa;
}

.expanded-content p {
  margin: 0 0 12px 0;
  line-height: 1.6;
  color: #606266;
}

.expanded-content p:last-child {
  margin-bottom: 0;
}

.score-normal {
  color: #67c23a;
  font-weight: bold;
}

.score-borderline {
  color: #e6a23c;
  font-weight: bold;
}

.score-clinical {
  color: #f56c6c;
  font-weight: bold;
}

.broadband-card {
  margin-bottom: 20px;
}

.broadband-card h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.broadband-item {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.broadband-item.score-normal {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9eb 0%, #e6f7d6 100%);
}

.broadband-item.score-borderline {
  border-color: #e6a23c;
  background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
}

.broadband-item.score-clinical {
  border-color: #f56c6c;
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
}

.broadband-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.broadband-icon {
  font-size: 24px;
}

.broadband-label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.broadband-score {
  font-size: 32px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 8px;
}

.broadband-desc {
  font-size: 13px;
  color: #909399;
  text-align: center;
  margin-bottom: 16px;
}

.broadband-feedback {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #dcdfe6;
}

.broadband-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  text-align: center;
}

.broadband-content {
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
  margin-bottom: 12px;
}

.structured-advice {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advice-block {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  padding: 12px;
}

.advice-block-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.advice-icon {
  font-size: 14px;
}

.advice-block-content {
  font-size: 12px;
  line-height: 1.8;
  color: #606266;
  padding-left: 20px;
}

.total-summary-card {
  margin-bottom: 20px;
}

.total-summary-card h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.total-summary {
  padding: 20px;
}

.total-score-row {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #ebeef5;
}

.total-score-item {
  font-size: 18px;
}

.total-score-item .label {
  color: #606266;
}

.total-score-item .value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin: 0 8px;
}

.total-score-item .t-score {
  font-size: 20px;
}

.summary-content {
  margin-bottom: 24px;
}

.summary-content h4,
.expert-advice h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

.summary-content .summary-paragraph {
  line-height: 1.8;
  color: #606266;
  margin: 0 0 12px 0;
  text-indent: 2em;
}

.summary-content .summary-paragraph:last-child {
  margin-bottom: 0;
}

.advice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advice-item {
  padding: 16px 20px;
  background: linear-gradient(135deg, #e8f4fd 0%, #d4e9f7 100%);
  border-radius: 8px;
  border-left: 4px solid #409eff;
  line-height: 1.6;
  color: #303133;
}

.report-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
}

.report-actions .el-button {
  min-width: 120px;
}

@media (max-width: 768px) {
  .student-info {
    flex-direction: column;
    gap: 12px;
  }

  .chart-legend {
    flex-direction: column;
    gap: 12px;
  }

  .profile-chart {
    height: 300px;
  }
}
</style>
