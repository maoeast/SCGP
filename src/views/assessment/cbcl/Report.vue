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
            <div class="score-meta">
              <span class="raw-score-label">原始分</span>
              <span class="t-score-display" :class="'t-level-' + factor.level">T ≈ {{ factor.tScore }}</span>
            </div>
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
          <h3>📈 行为特征剖面图</h3>
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
          需关注 (T &ge; 70)
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
              <el-tag :type="getTScoreTagType(broadBandData.internalizingTScore)" size="small">
                {{ getTScoreLabel(broadBandData.internalizingTScore) }}
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
              <el-tag :type="getTScoreTagType(broadBandData.externalizingTScore)" size="small">
                {{ getTScoreLabel(broadBandData.externalizingTScore) }}
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
        <!-- 情况1：总分正常但子项异常时的特殊提示 -->
        <div v-if="overallAssessment" class="summary-content">
          <h4 :class="'severity-' + overallAssessment.severity">{{ overallAssessment.title }}</h4>
          <div class="summary-paragraph" v-html="formatMarkdown(overallAssessment.content)"></div>
          <div class="summary-paragraph detail-text" v-html="formatMarkdown(overallAssessment.detail)"></div>
        </div>
        <!-- 情况2：正常使用反馈引擎内容 -->
        <div v-else-if="feedback?.overallSummary?.length" class="summary-content">
          <h4>评估总结</h4>
          <div v-for="(paragraph, idx) in feedback.overallSummary" :key="idx" class="summary-paragraph" v-html="formatMarkdown(paragraph)"></div>
        </div>
        <!-- 建议部分 -->
        <div class="expert-advice" v-if="overallAssessment?.advice?.length || feedback?.overallAdvice?.length">
          <h4>专家建议</h4>
          <div class="advice-list">
            <template v-if="overallAssessment?.advice?.length">
              <div v-for="(advice, idx) in overallAssessment.advice" :key="idx" class="advice-item warning-item" v-html="formatMarkdown(advice)"></div>
            </template>
            <template v-else>
              <div v-for="(advice, idx) in feedback.overallAdvice" :key="idx" class="advice-item" v-html="formatMarkdown(advice)"></div>
            </template>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document } from '@element-plus/icons-vue'
import { getDatabase } from '@/database/init'
import * as echarts from 'echarts'
import { CBCLDriver } from '@/strategies/assessment/CBCLDriver'
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

  // 辅助函数：获取等级样式类
  const getLevelClass = (level: number) => {
    if (level === 2) return 'level-danger'
    if (level === 1) return 'level-warning'
    return 'level-success'
  }

  // 辅助函数：获取标签类型
  const getTagType = (level: number): any => {
    if (level === 2) return 'danger'
    if (level === 1) return 'warning'
    return 'success'
  }

  const factors = [
    {
      code: 'activity',
      name: '活动能力',
      score: socialCompetence.value.activity.score,
      tScore: socialCompetence.value.activity.tScore,
      status: socialCompetence.value.activity.status,
      level: socialCompetence.value.activity.level,
      levelClass: getLevelClass(socialCompetence.value.activity.level),
      tagType: getTagType(socialCompetence.value.activity.level)
    },
    {
      code: 'social',
      name: '社交情况',
      score: socialCompetence.value.social.score,
      tScore: socialCompetence.value.social.tScore,
      status: socialCompetence.value.social.status,
      level: socialCompetence.value.social.level,
      levelClass: getLevelClass(socialCompetence.value.social.level),
      tagType: getTagType(socialCompetence.value.social.level)
    },
    {
      code: 'school',
      name: '学校表现',
      score: socialCompetence.value.school.score,
      tScore: socialCompetence.value.school.tScore,
      status: socialCompetence.value.school.status,
      level: socialCompetence.value.school.level,
      levelClass: getLevelClass(socialCompetence.value.school.level),
      tagType: getTagType(socialCompetence.value.school.level)
    }
  ]
  return factors
})

// 计算属性：因子分数数据
const factorScores = computed<CBCLFactorScore[]>(() => {
  console.log('Report.vue: factorScores 计算中，assessData:', assessData.value)
  if (!assessData.value) return []
  try {
    const rawScores = JSON.parse(assessData.value.behavior_raw_scores || '{}')
    const tScores = JSON.parse(assessData.value.factor_t_scores || '{}')
    console.log('Report.vue: 解析后的 rawScores:', rawScores, 'tScores:', tScores)

    const result = Object.entries(rawScores).map(([name, rawScore]) => {
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
    console.log('Report.vue: 最终生成的 factorScores 数组:', result)
    return result
  } catch (e) {
    console.error('Report.vue: factorScores 计算出错:', e)
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

// 计算属性：是否存在子项异常（用于总分正常但子项异常时的交叉判断）
const hasSubscaleAnomalies = computed(() => {
  if (!assessData.value) return false
  const internalizingT = assessData.value.internalizing_t_score
  const externalizingT = assessData.value.externalizing_t_score

  // 检查内化或外化是否达到需关注水平(T>=65)
  if (internalizingT >= 65 || externalizingT >= 65) return true

  // 检查是否有任意单项因子T>=65
  try {
    const tScores = JSON.parse(assessData.value.factor_t_scores || '{}')
    return Object.values(tScores).some((t: any) => (t as number) >= 65)
  } catch {
    return false
  }
})

// 计算属性：获取异常子项的名称列表
const anomalousSubscales = computed(() => {
  if (!assessData.value) return []
  const anomalies: string[] = []

  const internalizingT = assessData.value.internalizing_t_score
  const externalizingT = assessData.value.externalizing_t_score

  // 检查内化问题
  if (internalizingT >= 65) {
    anomalies.push('内化问题')
  }

  // 检查外化问题
  if (externalizingT >= 65) {
    anomalies.push('外化问题')
  }

  return anomalies
})

// 计算属性：总体评估内容（处理总分正常但子项异常的情况）
const overallAssessment = computed(() => {
  const studentName = studentInfo.value?.name || '孩子'
  const totalT = totalProblemsTScore.value

  // 情况1：总分 >= 64，使用反馈引擎的内容
  if (totalT >= 64) {
    return null // 使用 feedback.overallSummary
  }

  // 情况2：总分 < 60 且存在子项异常，显示特殊提示
  if (totalT < 60 && hasSubscaleAnomalies.value) {
    const anomalyAreas = anomalousSubscales.value.join('、')
    return {
      title: '存在特定领域需关注',
      severity: 'warning',
      content: `虽然${studentName}的整体行为问题总分处于正常范围，没有表现出广泛的适应困难，但系统检测到其在**${anomalyAreas || '特定领域'}**存在显著的压力信号。`,
      detail: `这类孩子往往**"表面顺从"，但内心可能正经历情绪困扰**。建议家长重点关注其内在情绪变化，避免被"总分正常"的表象误导。`,
      advice: [
        `**关注内在世界**：虽然孩子外表看起来"没什么问题"，但${anomalyAreas || '特定领域'}的高分提示其可能存在难以言说的焦虑、担忧或身体不适。`,
        '**建立情感连接**：创造一个安全、无评判的家庭氛围，让孩子知道"有任何情绪都可以告诉爸爸妈妈"。',
        '**观察与记录**：留意孩子是否有睡眠困难、食欲改变、频繁的身体不适主诉（如头痛、肚子痛），或突然变得沉默寡言。'
      ]
    }
  }

  // 情况3：其他情况，使用反馈引擎内容
  return null
})

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

// 根据 T 分数获取 Element Plus 标签类型
const getTScoreTagType = (tScore: number): any => {
  if (tScore >= 70) return 'danger'
  if (tScore >= 65) return 'warning'
  return 'success'
}

// 根据 T 分数获取标签文本
const getTScoreLabel = (tScore: number): string => {
  if (tScore >= 70) return '需关注'
  if (tScore >= 65) return '边缘'
  return '正常'
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
      text: 'CBCL 行为特征剖面图',
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
              label: { formatter: '需关注', position: 'end' },
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

    // 初始化图表将在 watch 中处理，替代 setTimeout
    // initChart() moved to watch

    // ========== 调用反馈引擎 ==========
    // 1. 实例化 Driver
    const driver = new CBCLDriver()

    // 2. 组装 ScoreResult 对象
    const rawScores = JSON.parse(record.behavior_raw_scores || '{}')
    const tScores = JSON.parse(record.factor_t_scores || '{}')
    const rawAnswers = JSON.parse(record.raw_answers || '{}')

    // 构建 dimensions 数组
    const dimensions: any[] = []

    // 添加社会能力维度
    if (record.social_activity_score !== null) {
      const activityLevel = record.social_activity_score < 3 ? 2 : record.social_activity_score < 3.5 ? 1 : 0
      dimensions.push({
        code: 'activity',
        name: '活动能力',
        rawScore: record.social_activity_score,
        itemCount: 4,
        level: activityLevel === 2 ? 'clinical' : activityLevel === 1 ? 'borderline' : 'normal',
        levelName: activityLevel === 2 ? '可能异常' : activityLevel === 1 ? '边缘/需关注' : '正常'
      })
    }
    if (record.social_social_score !== null) {
      const socialLevel = record.social_social_score < 3 ? 2 : record.social_social_score < 3.5 ? 1 : 0
      dimensions.push({
        code: 'social',
        name: '社交情况',
        rawScore: record.social_social_score,
        itemCount: 4,
        level: socialLevel === 2 ? 'clinical' : socialLevel === 1 ? 'borderline' : 'normal',
        levelName: socialLevel === 2 ? '可能异常' : socialLevel === 1 ? '边缘/需关注' : '正常'
      })
    }
    if (record.social_school_score !== null) {
      const schoolLevel = record.social_school_score < 2 ? 2 : record.social_school_score < 2.5 ? 1 : 0
      dimensions.push({
        code: 'school',
        name: '学校表现',
        rawScore: record.social_school_score,
        itemCount: 3,
        level: schoolLevel === 2 ? 'clinical' : schoolLevel === 1 ? 'borderline' : 'normal',
        levelName: schoolLevel === 2 ? '可能异常' : schoolLevel === 1 ? '边缘/需关注' : '正常'
      })
    }

    // 添加行为问题因子维度
    const factorNames = Object.keys(rawScores)
    for (const factorName of factorNames) {
      const tScore = tScores[factorName] || 50
      const level = tScore >= 70 ? 'clinical' : tScore >= 65 ? 'borderline' : 'normal'
      dimensions.push({
        code: factorName,
        name: factorName,
        rawScore: rawScores[factorName],
        standardScore: tScore,
        itemCount: 0,
        level: level,
        levelName: level === 'clinical' ? '可能异常' : level === 'borderline' ? '边缘/需关注' : '正常'
      })
    }

    // 构建 socialCompetence 对象
    const socialCompetenceData = JSON.parse(record.social_competence_data || '{}')
    const socialCompetenceResult = {
      group: null,
      activity: {
        score: record.social_activity_score,
        status: record.social_activity_score < 3 ? '可能异常' : record.social_activity_score < 3.5 ? '边缘/需关注' : '正常',
        level: record.social_activity_score < 3 ? 2 : record.social_activity_score < 3.5 ? 1 : 0,
        tScore: record.social_activity_score < 3 ? 30 : record.social_activity_score < 3.5 ? 35 : 50
      },
      social: {
        score: record.social_social_score,
        status: record.social_social_score < 3 ? '可能异常' : record.social_social_score < 3.5 ? '边缘/需关注' : '正常',
        level: record.social_social_score < 3 ? 2 : record.social_social_score < 3.5 ? 1 : 0,
        tScore: record.social_social_score < 3 ? 30 : record.social_social_score < 3.5 ? 35 : 50
      },
      school: {
        score: record.social_school_score,
        status: record.social_school_score < 2 ? '可能异常' : record.social_school_score < 2.5 ? 1 : 0 ? '边缘/需关注' : '正常',
        level: record.social_school_score < 2 ? 2 : record.social_school_score < 2.5 ? 1 : 0,
        tScore: record.social_school_score < 2 ? 30 : record.social_school_score < 2.5 ? 35 : 50
      },
      rawScores: {
        factorActivity: record.social_activity_score,
        factorSocial: record.social_social_score,
        factorSchool: record.social_school_score
      }
    }

    // 构建 behaviorProblems 对象
    const behaviorProblemsResult = {
      normGroup: record.gender === 'male' ? 'boy_6_11' : 'girl_6_11',
      factors: factorNames.map(name => ({
        code: name,
        name: name,
        rawScore: rawScores[name],
        tScore: tScores[name] || 50,
        level: (tScores[name] || 50) >= 70 ? 'clinical' : (tScores[name] || 50) >= 65 ? 'borderline' : 'normal',
        levelName: (tScores[name] || 50) >= 70 ? '可能异常' : (tScores[name] || 50) >= 65 ? '边缘/需关注' : '正常',
        p69: 0,
        p98: 0
      })),
      totalProblemsScore: record.total_problems_score,
      totalProblemsTScore: record.total_problems_t_score,
      internalizingScore: 0,
      internalizingTScore: record.internalizing_t_score,
      externalizingScore: 0,
      externalizingTScore: record.externalizing_t_score,
      summaryLevel: record.summary_level
    }

    // 组装完整的 ScoreResult
    const scoreResult = {
      scaleCode: 'cbcl',
      studentId: record.student_id,
      assessmentDate: record.start_time,
      dimensions: dimensions,
      totalScore: record.total_problems_score,
      tScore: record.total_problems_t_score,
      level: record.summary_level === 'clinical' ? '可能异常' : record.summary_level === 'borderline' ? '边缘/需关注' : '正常',
      levelCode: record.summary_level,
      rawAnswers: rawAnswers,
      timing: { startTime: record.start_time, endTime: record.end_time },
      extraData: {
        socialCompetence: socialCompetenceResult,
        behaviorProblems: behaviorProblemsResult,
        internalizingTScore: record.internalizing_t_score,
        externalizingTScore: record.externalizing_t_score
      }
    }

    // 3. 调用 generateFeedback 生成反馈
    feedback.value = driver.generateFeedback(scoreResult)

    console.log('CBCL 报告数据加载完成:', {
      record: record.id,
      student: studentInfo.value?.name,
      totalTScore: record.total_problems_t_score,
      feedback: feedback.value
    })
  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

// 使用 watch 替代 setTimeout 初始化图表（解决渲染时效问题）
watch([factorScores, chartRef], ([newScores, newRef]) => {
  if (newScores && newScores.length > 0 && newRef) {
    // 使用 nextTick 确保 DOM 已更新
    setTimeout(() => {
      initChart()
    }, 0)
  }
}, { immediate: true, flush: 'post' })

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

.score-card.level-warning {
  background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
  border: 1px solid #f5dab1;
}

.score-card .score-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.score-card .raw-score-label {
  font-size: 11px;
  color: #909399;
  background: rgba(255, 255, 255, 0.7);
  padding: 2px 8px;
  border-radius: 4px;
}

.score-card .t-score-display {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 12px;
  background: #f0f9eb;
  color: #67c23a;
}

.score-card .t-score-display.t-level-1 {
  background: #fdf6ec;
  color: #e6a23c;
}

.score-card .t-score-display.t-level-2 {
  background: #fef0f0;
  color: #f56c6c;
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

/* 警告样式：用于总分正常但子项异常的情况 */
.summary-content h4.severity-warning {
  color: #e6a23c;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
  border-radius: 8px;
  border: 1px solid #f5dab1;
  margin-bottom: 16px;
}

.summary-content .summary-paragraph.detail-text {
  color: #e6a23c;
  font-weight: 500;
  background: #fdf6ec;
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 3px solid #e6a23c;
}

.advice-item.warning-item {
  background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%);
  border-left: 4px solid #e6a23c;
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
