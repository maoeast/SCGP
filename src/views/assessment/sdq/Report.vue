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
          <div class="score-item total">
            <div class="score-label">困难总分</div>
            <div class="score-value">{{ assessData?.total_difficulties_score || 0 }}</div>
            <div class="score-range">(满分 40)</div>
            <div class="score-level" :class="getLevelClass(assessData?.level)">
              {{ assessData?.level || '正常' }}
            </div>
          </div>
          <div class="score-item prosocial">
            <div class="score-label">亲社会行为</div>
            <div class="score-value">{{ assessData?.prosocial_score || 0 }}</div>
            <div class="score-range">(满分 10)</div>
            <div class="score-level" :class="getProsocialLevelClass(prosocialLevel)">
              {{ prosocialLevel }}
            </div>
          </div>
        </div>
        <!-- 总体评估标题 -->
        <div v-if="totalScoreFeedback" class="total-feedback-title">
          <el-tag :type="getTotalScoreTagType(assessData?.level)" size="large">
            {{ totalScoreFeedback.title }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 总体评估说明 -->
    <el-card class="overall-assessment" v-if="totalScoreFeedback">
      <template #header>
        <h3>📋 总体评估说明</h3>
      </template>
      <div class="assessment-content">
        <p v-for="(paragraph, index) in totalScoreFeedback.content" :key="index" class="content-paragraph">
          {{ replacePlaceholders(paragraph) }}
        </p>
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
                <p v-for="(p, i) in row.content" :key="i">{{ replacePlaceholders(p) }}</p>
              </div>
              <div class="detail-section" v-if="row.advice?.length">
                <h4>干预建议</h4>
                <ul>
                  <li v-for="(a, i) in row.advice" :key="i" v-html="formatAdvice(a)"></li>
                </ul>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="维度名称" width="150" />
        <el-table-column prop="score" label="得分" width="80" align="center">
          <template #default="{ row }">
            <span :class="getScoreClass(row.code, row.score)">{{ row.score }}/10</span>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="评级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getTagType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
      </el-table>
    </el-card>

    <!-- 专家建议 -->
    <el-card class="expert-advice" v-if="expertAdvice.length">
      <template #header>
        <h3>💡 专家建议</h3>
      </template>

      <div class="advice-content">
        <ul>
          <li v-for="(advice, index) in expertAdvice" :key="index" v-html="formatAdvice(advice)"></li>
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

import { SDQ_DIMENSION_NAMES, SDQ_THRESHOLDS } from '@/database/sdq-questions'

// 类型定义
interface DimensionRow {
  code: string
  name: string
  score: number
  level: string
  description: string
  content?: string[]
  advice?: string[]
}

// Props
const route = useRoute()
const router = useRouter()

// 响应式数据
const assessData = ref<SDQAssessRecord | null>(null)
const studentInfo = ref<{ name: string; ageMonths: number } | null>(null)
const dimensionScores = ref<DimensionRow[]>([])

// 中文等级到英文等级的映射
const levelToKey = (level: string | undefined): string => {
  if (!level) return 'normal'
  if (level === '异常') return 'abnormal'
  if (level === '边缘') return 'borderline'
  return 'normal'
}

// 计算属性：总分反馈
const totalScoreFeedback = computed(() => {
  if (!assessData.value) return null
  const levelKey = levelToKey(assessData.value.level)
  return ASSESSMENT_LIBRARY.sdq.total_score_rules[levelKey]
})

// 计算属性：亲社会行为等级
const prosocialLevel = computed(() => {
  if (!assessData.value) return '正常'
  const score = assessData.value.prosocial_score
  if (score >= 6) return '优秀'
  if (score >= 5) return '边缘'
  return '需培养'
})

// 计算属性：专家建议（从 feedbackConfig 获取）
const expertAdvice = computed(() => {
  if (!totalScoreFeedback.value) return []
  return totalScoreFeedback.value.advice || []
})

// 方法
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getLevelClass = (level: string | undefined) => {
  if (!level) return ''
  if (level === '异常') return 'level-abnormal'
  if (level === '边缘') return 'level-borderline'
  return 'level-normal'
}

const getProsocialLevelClass = (level: string) => {
  if (level === '优秀') return 'level-excellent'
  if (level === '边缘') return 'level-borderline'
  return 'level-warning'
}

const getTotalScoreTagType = (level: string | undefined) => {
  if (level === '异常') return 'danger'
  if (level === '边缘') return 'warning'
  return 'success'
}

const getScoreClass = (code: string, score: number) => {
  if (code === 'prosocial') {
    if (score >= 6) return 'score-excellent'
    if (score >= 5) return 'score-borderline'
    return 'score-warning'
  }
  const threshold = SDQ_THRESHOLDS[code]
  if (!threshold) return ''
  if (score <= threshold.normal) return 'score-excellent'
  if (score <= threshold.borderline) return 'score-borderline'
  return 'score-warning'
}

const getTagType = (level: string) => {
  if (level === '正常' || level === '优秀') return 'success'
  if (level === '边缘') return 'warning'
  return 'danger'
}

const goBack = () => {
  router.back()
}

const exportPDF = () => {
  ElMessage.info('PDF 导出功能开发中')
}

// 替换占位符
const replacePlaceholders = (text: string): string => {
  const name = studentInfo.value?.name || '孩子'
  return text.replace(/\[儿童姓名\]/g, name)
}

// 格式化建议文本（支持 Markdown 加粗）
const formatAdvice = (text: string): string => {
  return replacePlaceholders(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

// 获取维度反馈
const getDimensionFeedback = (code: string, level: string) => {
  const dimConfig = ASSESSMENT_LIBRARY.sdq.dimensions[code]
  if (!dimConfig) return null
  return dimConfig[level]
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

    // 解析维度分数
    const scores = JSON.parse(record.dimension_scores)
    dimensionScores.value = Object.entries(scores).map(([code, data]: any) => {
      const name = SDQ_DIMENSION_NAMES[code] || code
      let englishLevel = 'normal'
      const threshold = SDQ_THRESHOLDS[code]
      if (threshold) {
        if (code === 'prosocial') {
          if (data.rawScore < threshold.borderline) englishLevel = 'abnormal'
          else if (data.rawScore === threshold.borderline) englishLevel = 'borderline'
          else englishLevel = 'normal'
        } else {
          if (data.rawScore > threshold.borderline) englishLevel = 'abnormal'
          else if (data.rawScore > threshold.normal) englishLevel = 'borderline'
          else englishLevel = 'normal'
        }
      }

      // 从 feedbackConfig 获取维度详细反馈
      const dimFeedback = getDimensionFeedback(code, englishLevel)

      return {
        code,
        name,
        score: data.rawScore,
        level: data.levelName,
        description: dimFeedback?.content?.[0] || getDimensionDescription(code, englishLevel),
        content: dimFeedback?.content || [],
        advice: dimFeedback?.advice || []
      }
    })

    // 查询学生信息
    const student = db.get('SELECT name, birthday FROM student WHERE id = ?', [record.student_id])
    if (student) {
      studentInfo.value = {
        name: student.name,
        ageMonths: record.age_months
      }
    }
  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

const getDimensionDescription = (code: string, level: string) => {
  const descriptions: Record<string, Record<string, string>> = {
    emotional: {
      normal: '情绪稳定，适应良好',
      borderline: '偶尔有情绪波动',
      abnormal: '存在明显情绪困扰'
    },
    conduct: {
      normal: '行为规范良好',
      borderline: '偶尔有行为问题',
      abnormal: '存在较多行为问题'
    },
    hyperactivity: {
      normal: '注意力集中',
      borderline: '偶尔注意力不集中',
      abnormal: '存在明显注意力问题'
    },
    peer: {
      normal: '同伴关系良好',
      borderline: '社交方面有些困难',
      abnormal: '存在明显社交困难'
    },
    prosocial: {
      normal: '乐于助人',
      borderline: '亲社会行为不稳定',
      abnormal: '需要培养亲社会行为'
    }
  }
  return descriptions[code]?.[level.toLowerCase()] || ''
}

// 生命周期
onMounted(() => {
  loadAssessData()
})
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.score-item.total {
  background: linear-gradient(135deg, #f09329 0%, #ff6b6b 100%);
}

.score-item.prosocial {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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

.total-feedback-title {
  text-align: center;
  margin-top: 16px;
}

.total-feedback-title .el-tag {
  font-size: 16px;
  padding: 8px 20px;
}

.level-normal, .level-excellent {
  color: #67c23a;
}

.level-borderline {
  color: #e6a23c;
}

.level-abnormal {
  color: #f56c6c;
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

.expert-advice {
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
