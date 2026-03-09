<!-- src/views/assessment/srs2/Report.vue -->
<template>
  <div class="srs2-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>SRS-2 社交反应量表评估报告</h2>
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
          <span class="label">性别：</span>
          <span class="value">{{ studentInfo.gender }}</span>
        </div>
        <div class="info-item">
          <span class="label">评估日期：</span>
          <span class="value">{{ formatDate(assessData?.start_time) }}</span>
        </div>
        <div class="info-item">
          <span class="label">年龄：</span>
          <span class="value">{{ formatAge(studentInfo.ageMonths) }}</span>
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
          <!-- 总分 T分数卡片 -->
          <div class="score-item total" :class="getTotalScoreClass(totalSeverity)">
            <div class="score-label">总分 T分数</div>
            <div class="score-value">{{ assessData?.total_t_score ?? 50 }}</div>
            <div class="score-range">(均值 50, 标准差 10)</div>
            <div class="score-level" :class="getTotalLevelClass(totalSeverity)">
              {{ totalLevelText }}
            </div>
          </div>
          <!-- 原始总分卡片 -->
          <div class="score-item raw" :class="getTotalScoreClass(totalSeverity)">
            <div class="score-label">原始总分</div>
            <div class="score-value">{{ assessData?.total_raw_score ?? 0 }}</div>
            <div class="score-range">(满分 195)</div>
          </div>
        </div>
        <!-- 总体评估标题 -->
        <div v-if="totalScoreFeedback" class="total-feedback-title">
          <el-tag :type="getSeverityType(totalSeverity)" size="large">
            {{ totalScoreFeedback.title }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 总体评估说明 -->
    <el-card class="overall-assessment" v-if="feedback?.overallSummary">
      <template #header>
        <h3>📋 总体评估说明</h3>
      </template>
      <div class="assessment-content">
        <p class="content-paragraph" v-html="formatMarkdown(feedback.overallSummary)"></p>
      </div>
    </el-card>

    <!-- 维度 T分数详情 -->
    <el-card class="dimension-scores" v-if="dimensionScores.length">
      <template #header>
        <h3>📈 维度 T分数详情</h3>
      </template>

      <el-table :data="dimensionScores" style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="dimension-detail">
              <div class="detail-section" v-if="row.content">
                <h4>详细说明</h4>
                <p v-html="formatMarkdown(row.content)"></p>
              </div>
              <div class="detail-section" v-if="row.advice?.length">
                <h4>干预建议</h4>
                <ul>
                  <li v-for="(a, i) in row.advice" :key="i" v-html="formatMarkdown(a)"></li>
                </ul>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="维度名称" width="160" />
        <el-table-column label="原始分" width="80" align="center">
          <template #default="{ row }">
            <span>{{ row.rawScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="T分数" width="80" align="center">
          <template #default="{ row }">
            <span :class="getScoreColorClass(row.severity)">{{ row.tScore }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="levelName" label="临床等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getSeverityType(row.severity)" size="small">{{ row.levelName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">
            <span v-html="formatMarkdown(row.content || '')"></span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 核心指导原则 -->
    <el-card class="core-principles" v-if="feedback?.overallAdvice?.length">
      <template #header>
        <h3>🎯 核心指导原则</h3>
      </template>
      <div class="principles-content">
        <div
          v-for="(principle, index) in feedback.overallAdvice"
          :key="index"
          class="principle-item"
          v-html="formatMarkdown(principle)"
        ></div>
      </div>
    </el-card>

    <!-- 免责声明 -->
    <el-card class="disclaimer">
      <div class="disclaimer-content">
        <el-icon><WarningFilled /></el-icon>
        <p>
          <strong>重要提示：</strong>本报告所有结果仅供教育支持参考，不能作为医学诊断依据。
          如发现显著异常，请前往正规医院发育行为儿科或精神心理科就诊。
        </p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document, WarningFilled } from '@element-plus/icons-vue'
import { getDatabase } from '@/database/init'
import type { SRS2DimensionDetail, SRS2StructuredFeedback } from '@/strategies/assessment/SRS2Driver'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import { SRS2Driver } from '@/strategies/assessment/SRS2Driver'

// SRS-2 评估记录类型
interface SRS2AssessRecord {
  id: number
  student_id: number
  start_time: string
  end_time?: string
  total_raw_score: number
  total_t_score: number
  total_level: string
  dimension_scores: string  // JSON
  raw_answers: string  // JSON
  age_months: number
  gender: string
}

// Props
const route = useRoute()
const router = useRouter()

// 响应式数据
const assessData = ref<SRS2AssessRecord | null>(null)
const studentInfo = ref<{ name: string; ageMonths: number; gender: string } | null>(null)
const feedback = ref<SRS2StructuredFeedback | null>(null)

// 计算属性：维度分数（直接从 feedback 获取）
const dimensionScores = computed<SRS2DimensionDetail[]>(() => {
  return feedback.value?.dimensionDetails || []
})

// 计算属性：总分反馈
const totalScoreFeedback = computed(() => {
  if (!assessData.value) return null

  const tScore = assessData.value.total_t_score
  const rules = ASSESSMENT_LIBRARY.srs2.total_score_rules

  if (Array.isArray(rules)) {
    for (const rule of rules) {
      if (tScore >= rule.range[0] && tScore <= rule.range[1]) {
        return {
          title: rule.title,
          severity: rule.severity as 'success' | 'warning' | 'danger',
          content: rule.content,
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

// 计算属性: 总分等级文本
const totalLevelText = computed(() => {
  return totalScoreFeedback.value?.title || '正常'
})

// 方法
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 格式化年龄：将月龄转换为"X岁Y个月"格式
const formatAge = (ageMonths: number | undefined) => {
  if (!ageMonths && ageMonths !== 0) return '--'
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (years === 0) {
    return `${months}个月`
  }
  if (months === 0) {
    return `${years}岁`
  }
  return `${years}岁${months}个月`
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

// 获取总分背景类
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

const goBack = () => {
  router.back()
}

const exportPDF = () => {
  ElMessage.info('PDF 导出功能开发中')
}

// 格式化 Markdown 文本（支持 **粗体**）
const formatMarkdown = (text: string): string => {
  if (!text) return ''
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}

/**
 * 数据加载逻辑
 */
const loadAssessData = async () => {
  const assessId = route.params.assessId
  if (!assessId) {
    ElMessage.error('缺少评估记录ID')
    return
  }

  try {
    const db = getDatabase()

    // 1. 查询评估记录
    const record = db.get('SELECT * FROM srs2_assess WHERE id = ?', [assessId]) as SRS2AssessRecord
    if (!record) {
      ElMessage.error('评估记录不存在')
      return
    }
    assessData.value = record

    // 2. 查询学生信息
    const student = db.get('SELECT name, gender FROM student WHERE id = ?', [record.student_id])
    if (student) {
      studentInfo.value = {
        name: student.name,
        ageMonths: record.age_months,
        gender: record.gender === 'male' ? '男' : record.gender === 'female' ? '女' : '未知'
      }
    }

    // 3. 解析维度分数 JSON
    const dimensionScoresData = JSON.parse(record.dimension_scores)

    // 4. 构建 ScoreResult 对象
    const scoreResult = {
      scaleCode: 'srs2',
      studentId: record.student_id,
      assessmentDate: record.start_time,
      dimensions: Object.entries(dimensionScoresData)
        .filter(([code]) => code !== 'total')
        .map(([code, data]: [string, any]) => ({
          code,
          name: data.name || code,
          rawScore: data.rawScore ?? 0,
          itemCount: data.itemCount ?? 1,
          passedCount: data.rawScore ?? 0,
          averageScore: (data.rawScore ?? 0) / (data.itemCount ?? 1),
          level: data.level || 'normal',
          levelName: data.levelName || '正常'
        })),
      totalScore: record.total_raw_score,
      level: record.total_level,
      levelCode: record.total_level,
      rawAnswers: {},
      timing: {},
      extraData: {
        totalTScore: record.total_t_score,
        dimensionTScores: Object.fromEntries(
          Object.entries(dimensionScoresData).map(([code, data]: [string, any]) => [code, data.tScore || 50])
        )
      }
    }

    // 5. 实例化 SRS2Driver 并设置学生上下文
    const driver = new SRS2Driver()
    driver.setStudentContext({
      id: record.student_id,
      name: studentInfo.value?.name || '孩子',
      ageInMonths: record.age_months,
      gender: record.gender
    })

    // 6. 调用 generateFeedback 获取完整的结构化反馈
    const generatedFeedback = driver.generateFeedback(scoreResult)

    // 7. 更新响应式变量
    feedback.value = generatedFeedback

    console.log('SRS-2 报告数据加载完成:', {
      record: record.id,
      student: studentInfo.value?.name,
      totalTScore: record.total_t_score,
      totalRawScore: record.total_raw_score,
      dimensions: generatedFeedback.dimensionDetails.length
    })

  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

// 生命周期
onMounted(() => {
  loadAssessData()
})
</script>

<style scoped>
.srs2-report {
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

/* 总分卡片背景色 */
.score-item.total.level-success {
  background: linear-gradient(135deg, #67c23a 0%, #95d460 100%);
}

.score-item.total.level-warning {
  background: linear-gradient(135deg, #e6a23c 0%, #f5a23b 100%);
}

.score-item.total.level-danger {
  background: linear-gradient(135deg, #f56c6c 0%, #ff6b6b 100%);
}

/* 原始分卡片 */
.score-item.raw.level-success {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
}

.score-item.raw.level-warning {
  background: linear-gradient(135deg, #e6a23c 0%, #f5a23b 100%);
}

.score-item.raw.level-danger {
  background: linear-gradient(135deg, #f56c6c 0%, #ff6b6b 100%);
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

/* 核心指导原则样式 */
.core-principles {
  margin-bottom: 20px;
}

.core-principles h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.principles-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.principle-item {
  padding: 16px 20px;
  background: linear-gradient(135deg, #e8f4fd 0%, #d4e9f7 100%);
  border-radius: 8px;
  border-left: 4px solid #409eff;
  line-height: 1.8;
  color: #303133;
  font-size: 15px;
}

.principle-item :deep(strong) {
  color: #409eff;
  font-weight: 600;
}

/* 免责声明样式 */
.disclaimer {
  margin-bottom: 20px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
}

.disclaimer-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.disclaimer-content .el-icon {
  color: #faad14;
  font-size: 20px;
  margin-top: 2px;
}

.disclaimer-content p {
  margin: 0;
  line-height: 1.6;
  color: #d48806;
  font-size: 14px;
}
</style>
