<!-- src/views/assessment/sdq/Report.vue -->
<template>
  <div class="sdq-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>SDQ 长处和困难问卷评估报告</h2>
          </div>
          <div class="header-actions">
            <el-button type="success" :icon="Document" @click="exportPDF">导出PDF</el-button>
          </div>
        </div>
      </template>

      <!-- 学生信息 -->
      <div class="student-info" v-if="studentInfo">
        <div class="info-item">
          <span class="label">学生姓名：</span>
          <span class="value">{{ studentInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">评估日期：</span>
          <span class="value">{{ formatDate(assessData?.start_time) }}</span>
        </div>
        <div class="info-item">
          <span class="label">年龄：</span>
          <span class="value">{{ studentInfo.ageMonths }} 月</span>
        </div>
      </div>
    </el-card>

    <!-- 评估结果总览 -->
    <el-card class="result-overview">
      <template #header>
        <h3>📊 评估结果总览</h3>
      </template>

      <div class="overview-content">
        <div class="score-summary">
          <!-- 困难总分卡片 -->
          <div class="score-item total" :class="getTotalScoreClass(totalSeverity)">
            <div class="score-label">困难总分</div>
            <div class="score-value">{{ assessData?.total_difficulties_score || 0 }}</div>
            <div class="score-range">(满分 40)</div>
            <div class="score-level" :class="getTotalLevelClass(totalSeverity)">
              {{ totalLevelText }}
            </div>
          </div>
          <!-- 亲社会行为卡片 -->
          <div class="score-item prosocial" :class="getProsocialClass(prosocialSeverity)">
            <div class="score-label">亲社会行为</div>
            <div class="score-value">{{ assessData?.prosocial_score || 0 }}</div>
            <div class="score-range">(满分 10)</div>
            <div class="score-level" :class="getProsocialLevelClass(prosocialSeverity)">
              {{ prosocialLevelText }}
            </div>
          </div>
        </div>
        <!-- 总体评估标题 -->
        <div v-if="totalScoreFeedback" class="total-feedback-title">
          <el-tag :type="getSeverityType(totalScoreFeedback.severity)" size="large">
            {{ totalScoreFeedback.title }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 总体评估说明 -->
    <el-card class="overall-assessment" v-if="feedback?.overallSummary?.length">
      <template #header>
        <h3>📋 总体评估说明</h3>
      </template>
      <div class="assessment-content">
        <p
          v-for="(paragraph, index) in feedback.overallSummary"
          :key="index"
          class="content-paragraph"
          v-html="formatMarkdown(paragraph)"
        ></p>
      </div>
    </el-card>

    <!-- 维度分数详情 -->
    <el-card class="dimension-scores">
      <template #header>
        <h3>📈 维度分数详情</h3>
      </template>

      <el-table :data="dimensionScores" style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="dimension-detail">
              <div class="detail-section" v-if="row.content?.length">
                <h4>详细说明</h4>
                <p v-for="(p, i) in row.content" :key="i" v-html="formatMarkdown(p)"></p>
              </div>
              <div class="detail-section" v-if="row.structured_advice">
                <h4>干预建议</h4>
                <div
                  v-for="(advices, categoryName) in Object.entries(row.structured_advice)"
                  :key="categoryName"
                  class="advice-category"
                >
                  <h5>{{ getCategoryTitle(categoryName as string) }}</h5>
                  <ul>
                    <li
                      v-for="(advice, i) in advices"
                      :key="i"
                      v-html="formatMarkdown(advice)"
                    ></li>
                  </ul>
                </div>
              </div>
              <div class="detail-section" v-else-if="row.advice?.length">
                <h4>干预建议</h4>
                <ul>
                  <li v-for="(a, i) in row.advice" :key="i" v-html="formatMarkdown(a)"></li>
                </ul>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="维度名称" width="150" />
        <el-table-column prop="score" label="得分" width="80" align="center">
          <template #default="{ row }">
            <span :class="getScoreColorClass(row.severity)">{{ row.score }}/10</span>
          </template>
        </el-table-column>
        <el-table-column prop="levelName" label="评级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getSeverityType(row.severity)" size="small">{{ row.levelName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明">
          <template #default="{ row }">
            <span v-html="formatMarkdown(row.description)"></span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 结构化专家建议 -->
    <el-card class="expert-advice" v-if="hasStructuredAdvice">
      <template #header>
        <h3>💡 专家建议 (IEP 干预框架)</h3>
      </template>

      <div class="structured-advice-container">
        <div
          v-for="categoryInfo in structuredAdviceCategories"
          :key="categoryInfo.key"
          class="advice-category-block"
        >
          <div class="category-header">
            <span class="category-icon">{{ getCategoryIcon(categoryInfo.key) }}</span>
            <span class="category-title">{{ getCategoryTitle(categoryInfo.key) }}</span>
          </div>

          <div class="category-items">
            <div
              v-for="(advice, index) in categoryInfo.items"
              :key="index"
              class="advice-item"
              v-html="formatMarkdown(advice)"
            ></div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 备用专家建议(扁平列表) -->
    <el-card class="expert-advice-flat" v-else-if="feedback?.expertRecommendations?.length">
      <template #header>
        <h3>💡 专家建议</h3>
      </template>

      <div class="advice-content">
        <ul>
          <li v-for="(advice, index) in feedback.expertRecommendations" :key="index" v-html="formatMarkdown(advice)"></li>
        </ul>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document } from '@element-plus/icons-vue'
import { getDatabase } from '@/database/init'
import type { SDQAssessRecord } from '@/types/sdq'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import { SDQ_DIMENSION_NAMES } from '@/database/sdq-questions'
import { SDQDriver } from '@/strategies/assessment/SDQDriver'
import type { SDQDimensionDetail, SDQStructuredFeedback } from '@/types/sdq'

// 类型定义
interface DimensionRow {
  code: string
  name: string
  score: number
  level: string
  levelName: string
  severity: 'success' | 'warning' | 'danger'
  description: string
  content?: string[]
  advice?: string[]
  structured_advice?: Record<string, string[]>
}

// Props
const route = useRoute()
const router = useRouter()

// 响应式数据
const assessData = ref<SDQAssessRecord | null>(null)
const studentInfo = ref<{ name: string; ageMonths: number } | null>(null)
const dimensionScores = ref<DimensionRow[]>([])
const feedback = ref<SDQStructuredFeedback | null>(null)
const structuredAdvice = ref<Record<string, string[]>>({})

// 计算属性：总分反馈
const totalScoreFeedback = computed(() => {
  if (!assessData.value) return null

  const score = assessData.value.total_difficulties_score
  const rules = ASSESSMENT_LIBRARY.sdq.total_score_rules

  if (Array.isArray(rules)) {
    for (const rule of rules) {
      if (score >= rule.range[0] && score <= rule.range[1]) {
        return {
          title: rule.title,
          severity: rule.severity as 'success' | 'warning' | 'danger',
          content: rule.content ? [rule.content] : [],
          base_advice: rule.base_advice || []
        }
      }
    }
  }
  return null
})

// 计算属性：总分 severity
const totalSeverity = computed<'success' | 'warning' | 'danger'>(() => {
  return totalScoreFeedback.value?.severity || 'success'
})

// 计算属性:总分等级文本
const totalLevelText = computed(() => {
  return totalScoreFeedback.value?.title || '正常'
})

// 计算属性:亲社会行为等级
const prosocialLevel = computed(() => {
  if (!assessData.value) return '正常'
  const score = assessData.value.prosocial_score
  if (score >= 6) return '优秀'
  if (score >= 5) return '边缘'
  return '需培养'
})

// 计算属性:亲社会行为 severity
const prosocialSeverity = computed<'success' | 'warning' | 'danger'>(() => {
  if (!assessData.value) return 'success'
  const score = assessData.value.prosocial_score
  if (score >= 6) return 'success'
  if (score >= 5) return 'warning'
  return 'danger'
})

// 计算属性:亲社会行为等级文本
const prosocialLevelText = computed(() => {
  return prosocialLevel.value
})

// 计算属性:是否有结构化建议
const hasStructuredAdvice = computed(() => {
  return Object.keys(structuredAdvice.value).length > 0
})

// 计算属性:结构化建议分类
const structuredAdviceCategories = computed(() => {
  const categories = [
    { key: 'environment_setup', icon: '🏠' },
    { key: 'interaction_strategy', icon: '💬' },
    { key: 'professional_support', icon: '🏥' }
  ]

  return categories
    .map(cat => ({
      ...cat,
      items: structuredAdvice.value[cat.key] || []
    }))
    .filter(cat => cat.items.length > 0)
})

// 方法
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 统一使用 severity 获取 UI 类型
const getSeverityType = (severity: 'success' | 'warning' | 'danger' | undefined) => {
  return severity || 'success'
}

// 根据 severity 获取分数颜色类
const getScoreColorClass = (severity: 'success' | 'warning' | 'danger' | undefined) => {
  if (severity === 'danger') return 'score-warning'
  if (severity === 'warning') return 'score-borderline'
  return 'score-excellent'
}

// 获取困难总分背景类
function getTotalScoreClass(severity: 'success' | 'warning' | 'danger' | undefined): string {
  if (severity === 'danger') return 'level-danger'
  if (severity === 'warning') return 'level-warning'
  return 'level-success'
}

// 获取总分等级标签样式
function getTotalLevelClass(severity: 'success' | 'warning' | 'danger' | undefined): string {
  if (severity === 'danger') return 'level-label-danger'
  if (severity === 'warning') return 'level-label-warning'
  return 'level-label-success'
}

// 获取亲社会行为背景类
function getProsocialClass(severity: 'success' | 'warning' | 'danger' | undefined): string {
  if (severity === 'danger') return 'level-danger'
  if (severity === 'warning') return 'level-warning'
  return 'level-success'
}

// 获取亲社会行为等级标签样式
function getProsocialLevelClass(severity: 'success' | 'warning' | 'danger' | undefined): string {
  if (severity === 'danger') return 'level-label-danger'
  if (severity === 'warning') return 'level-label-warning'
  return 'level-label-success'
}

const getCategoryTitle = (category: string): string => {
  const titles: Record<string, string> = {
    environment_setup: '环境创设',
    interaction_strategy: '互动策略',
    professional_support: '专业支持'
  }
  return titles[category] || category
}

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    environment_setup: '🏠',
    interaction_strategy: '💬',
    professional_support: '🏥'
  }
  return icons[category] || '📌'
}

const goBack = () => {
  router.back()
}

const exportPDF = () => {
  ElMessage.info('PDF 导出功能开发中')
}

// 格式化 Markdown 文本（支持 **粗体** 和占位符替换)
const formatMarkdown = (text: string): string => {
  if (!text) return ''
  const name = studentInfo.value?.name || '孩子'
  return text
    .replace(/\[儿童姓名\]/g, name)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

// 从 feedbackConfig 获取总分配置
const matchTotalScoreRule = (score: number) => {
  const rules = ASSESSMENT_LIBRARY.sdq.total_score_rules
  if (!Array.isArray(rules)) return null

  for (const rule of rules) {
    if (score >= rule.range[0] && score <= rule.range[1]) {
      return rule
    }
  }
  return null
}

// 从 feedbackConfig 获取维度等级配置
const matchDimensionLevel = (code: string, score: number) => {
  const dimConfig = ASSESSMENT_LIBRARY.sdq.dimensions[code]
  if (!dimConfig?.levels || !Array.isArray(dimConfig.levels)) return null

  for (const level of dimConfig.levels) {
    if (score >= level.range[0] && score <= level.range[1]) {
      return level
    }
  }
  return null
}

const loadAssessData = async () => {
  const assessId = route.params.assessId
  if (!assessId) {
    ElMessage.error('缺少评估记录ID')
    return
  }

  try {
    const db = getDatabase()

    // 查询评估记录
    const record = db.get('SELECT * FROM sdq_assess WHERE id = ?', [assessId]) as SDQAssessRecord
    if (!record) {
      ElMessage.error('评估记录不存在')
      return
    }

    assessData.value = record

    // 查询学生信息
    const student = db.get('SELECT name, birthday FROM student WHERE id = ?', [record.student_id])
    if (student) {
      studentInfo.value = {
        name: student.name,
        ageMonths: record.age_months
      }
    }

    // 解析维度分数
    const scores = JSON.parse(record.dimension_scores)

    // 构建维度展示数据
    dimensionScores.value = Object.entries(scores).map(([code, data]: any) => {
      const dimName = SDQ_DIMENSION_NAMES[code] || code

      // 从 feedbackConfig 匹配等级配置
      const levelConfig = matchDimensionLevel(code, data.rawScore)

      // 获取 severity
      const severity = levelConfig?.severity || 'success'

      // 获取内容
      let content: string[] = []
      let advice: string[] = []
      let structured_advice: Record<string, string[]> | undefined
      let description = ''

      if (levelConfig) {
        // 处理 age_stratified_summary
        if (levelConfig.age_stratified_summary) {
          const ageGroup = record.age_months < 72 ? 'preschool' : 'school_age'
          if (levelConfig.age_stratified_summary[ageGroup]) {
            content = [levelConfig.age_stratified_summary[ageGroup]]
          }
        } else if (levelConfig.summary) {
          content = [levelConfig.summary]
        } else if (levelConfig.content) {
          content = Array.isArray(levelConfig.content) ? levelConfig.content : [levelConfig.content]
        }

        advice = levelConfig.advice || []
        structured_advice = levelConfig.structured_advice
        description = content[0] || ''
      }

      return {
        code,
        name: dimName,
        score: data.rawScore,
        level: data.level,
        levelName: data.levelName,
        severity,
        description,
        content,
        advice,
        structured_advice
      }
    })

    // 生成结构化反馈
    const driver = new SDQDriver()
    driver.setStudentContext({
      id: record.student_id,
      name: studentInfo.value?.name || '孩子',
      ageInMonths: record.age_months,
      gender: 'unknown'
    })

    const scoreResult = {
      scaleCode: 'sdq',
      studentId: record.student_id,
      assessmentDate: record.start_time,
      dimensions: dimensionScores.value.map(d => ({
        code: d.code,
        name: d.name,
        rawScore: d.score,
        itemCount: 5,
        passedCount: d.score,
        averageScore: d.score / 5,
        level: d.level,
        levelName: d.levelName
      })),
      totalScore: record.total_difficulties_score,
      level: record.level,
      levelCode: scores.total_difficulties?.level || 'normal',
      rawAnswers: {},
      timing: {}
    }

    const generatedFeedback = driver.generateFeedback(scoreResult)
    feedback.value = generatedFeedback
    structuredAdvice.value = extractStructuredAdvice(generatedFeedback.dimensionDetails)

  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

// 从维度详情中提取结构化建议
const extractStructuredAdvice = (dimensionDetails: SDQDimensionDetail[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {}

  for (const dim of dimensionDetails) {
    if (dim.structured_advice) {
      for (const [key, items] of Object.entries(dim.structured_advice)) {
        if (!result[key]) {
          result[key] = []
        }
        result[key].push(...items)
      }
    }
  }

  return result
}

</script>

<style scoped>
.sdq-report {
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

.result-overview {
  margin-bottom: 20px;
}

.overview-content {
  padding: 20px;
}

.score-summary {
  display: flex;
  gap: 40px;
  justify-content: center;
  margin-bottom: 20px;
}

.score-item {
  text-align: center;
  padding: 24px 40px;
  border-radius: 12px;
  color: white;
}

/* 困难总分卡片背景色 - 根据 severity 动态 */
.score-item.total.level-success {
  background: linear-gradient(135deg, #67c23a 0%, #95d460 100%);
}

.score-item.total.level-warning {
  background: linear-gradient(135deg, #e6a23c 0%, #f5a23b 100%);
}

.score-item.total.level-danger {
  background: linear-gradient(135deg, #f56c6c 0%, #ff6b6b 100%);
}

/* 亲社会行为卡片背景色 - 根据 severity 动态 */
.score-item.prosocial.level-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.score-item.prosocial.level-warning {
  background: linear-gradient(135deg, #f5a623 0%, #ff9f43 100%);
}

.score-item.prosocial.level-danger {
  background: linear-gradient(135deg, #ff9f43 0%, #f56c6c 100%);
}

.score-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
}

.score-range {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

.score-level {
  margin-top: 8px;
  padding: 4px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 12px;
}

/* 等级标签样式 */
.level-label-success {
  background: rgba(103, 194, 58, 0.3);
}

.level-label-warning {
  background: rgba(230, 162, 60, 0.3);
}

.level-label-danger {
  background: rgba(245, 108, 108, 0.3);
}

.total-feedback-title {
  text-align: center;
  margin-top: 16px;
}

.total-feedback-title .el-tag {
  font-size: 16px;
  padding: 8px 20px;
}

/* 总体评估说明卡片 */
.overall-assessment {
  margin-bottom: 20px;
}

.assessment-content {
  padding: 10px 0;
}

.content-paragraph {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 16px;
  text-indent: 2em;
}

.content-paragraph:last-child {
  margin-bottom: 0;
}

.content-paragraph :deep(strong) {
  color: #409eff;
}

.dimension-scores {
  margin-bottom: 20px;
}

/* 维度详情展开样式 */
.dimension-detail {
  padding: 16px 20px;
  background: #fafafa;
}

.dimension-detail .detail-section {
  margin-bottom: 16px;
}

.dimension-detail .detail-section:last-child {
  margin-bottom: 0;
}

.dimension-detail h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.dimension-detail h5 {
  margin: 12px 0 8px 0;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.dimension-detail p {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 8px;
  text-indent: 2em;
}

.dimension-detail ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dimension-detail li {
  padding: 10px 16px;
  margin-bottom: 8px;
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
  line-height: 1.6;
  color: #606266;
}

.dimension-detail .advice-category {
  margin-bottom: 12px;
}

.dimension-detail :deep(strong) {
  color: #409eff;
}

.score-excellent {
  color: #67c23a;
  font-weight: bold;
}

.score-borderline {
  color: #e6a23c;
  font-weight: bold;
}

.score-warning {
  color: #f56c6c;
  font-weight: bold;
}

/* 结构化专家建议样式 */
.expert-advice {
  margin-bottom: 20px;
}

.structured-advice-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.advice-category-block {
  flex: 1;
  min-width: 280px;
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border-left: 4px solid #409eff;
}

.advice-category-block:nth-child(1) {
  border-left-color: #67c23a;
}

.advice-category-block:nth-child(2) {
  border-left-color: #e6a23c;
}

.advice-category-block:nth-child(3) {
  border-left-color: #f56c6c;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.category-icon {
  font-size: 20px;
}

.category-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.advice-item {
  padding: 12px 14px;
  background: #fff;
  border-radius: 6px;
  line-height: 1.6;
  color: #606266;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.advice-item :deep(strong) {
  color: #409eff;
}

/* 扁平专家建议样式 */
.expert-advice-flat {
  margin-bottom: 20px;
}

.advice-content ul {
  list-style: none;
  padding: 0;
}

.advice-content li {
  padding: 14px 18px;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-radius: 8px;
  border-left: 4px solid #409eff;
  line-height: 1.8;
  color: #303133;
}

.advice-content li:last-child {
  margin-bottom: 0;
}

.advice-content li :deep(strong) {
  color: #409eff;
}
</style>
