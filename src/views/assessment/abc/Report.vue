<!-- src/views/assessment/abc/Report.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Clock, Download, ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getDatabase } from '@/database/init'
import type { ABCLevel } from '@/database/abc-questions'
import { ABC_DIMENSION_NAMES, getABCLevel, ABC_LEVEL_NAMES } from '@/database/abc-questions'
import { openAiAssistant } from '@/features/ai/assistant-launcher'
import AssessmentTimingInfo from '../components/AssessmentTimingInfo.vue'

const route = useRoute()
const router = useRouter()

// 评估数据
const assessId = ref<number>(Number(route.params.assessId))
const assessData = ref<any>(null)
const studentInfo = ref<any>(null)
const loading = ref(true)

// 计算维度得分
const dimensionScores = computed(() => {
  if (!assessData.value?.dimension_scores) return []

  const scores = JSON.parse(assessData.value.dimension_scores)
  const dimensionData = [
    { code: 'sensory', name: '感觉', maxScore: 60, description: '对感觉刺激的异常反应' },
    { code: 'relating', name: '交往', maxScore: 48, description: '社交互动和关系建立能力' },
    { code: 'body_object', name: '躯体运动', maxScore: 72, description: '刻板行为和运动模式' },
    { code: 'language', name: '语言', maxScore: 52, description: '语言理解和表达能力' },
    { code: 'social_self_help', name: '生活自理', maxScore: 0, description: '日常生活自理能力' },
  ]

  return dimensionData.map(dim => ({
    ...dim,
    score: scores[dim.code] || 0,
    percentage: dim.maxScore > 0 ? ((scores[dim.code] || 0) / dim.maxScore * 100).toFixed(1) : '0',
  })).filter(dim => dim.maxScore > 0) // 过滤掉还没有题目的维度
})

// 严重程度
const severityLevel = computed(() => {
  if (!assessData.value?.total_score) return 'normal'
  return assessData.value.level as ABCLevel
})

const severityText = computed(() => {
  return ABC_LEVEL_NAMES[severityLevel.value]
})

// 获取严重程度样式类
function getSeverityClass(level: ABCLevel): string {
  const classMap: Record<ABCLevel, string> = {
    normal: 'severity-normal',
    borderline: 'severity-borderline',
    mild: 'severity-mild',
    moderate: 'severity-moderate',
    severe: 'severity-severe',
  }
  return classMap[level]
}

// 获取严重程度标签类型
function getSeverityType(level: ABCLevel): 'success' | 'info' | 'warning' | 'danger' {
  const typeMap: Record<ABCLevel, 'success' | 'info' | 'warning' | 'danger'> = {
    normal: 'success',
    borderline: 'info',
    mild: 'warning',
    moderate: 'warning',
    severe: 'danger',
  }
  return typeMap[level]
}

// 格式化日期
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 获取进度条颜色
function getProgressColor(percentage: number): string {
  if (percentage < 30) return '#67C23A'
  if (percentage < 50) return '#E6A23C'
  if (percentage < 70) return '#F56C6C'
  return '#F54EA2'
}

// 获取高分维度（得分占比 > 50%）
function getHighScoreDimensions() {
  return dimensionScores.value.filter(dim => {
    const percentage = dim.maxScore > 0 ? (dim.score / dim.maxScore) * 100 : 0
    return percentage > 50
  })
}

// 加载评估数据
async function loadAssessment() {
  loading.value = true
  try {
    const db = getDatabase()

    // 加载评估记录
    const assessSql = 'SELECT * FROM abc_assess WHERE id = ?'
    const assessRows = db.all(assessSql, [assessId.value])

    if (!assessRows[0]) {
      ElMessage.error('未找到评估记录')
      return
    }

    const row = assessRows[0]
    assessData.value = {
      id: row.id,
      student_id: row.student_id,
      age_months: row.age_months,
      raw_answers: row.raw_answers,
      dimension_scores: row.dimension_scores,
      total_score: row.total_score,
      level: row.level,
      start_time: row.start_time,
      end_time: row.end_time,
      created_at: row.created_at,
    }

    // 加载学生信息
    const studentSql = 'SELECT id, name FROM student WHERE id = ?'
    const studentRows = db.all(studentSql, [assessData.value.student_id])

    if (studentRows[0]) {
      studentInfo.value = {
        id: studentRows[0].id,
        name: studentRows[0].name,
        ageMonths: assessData.value.age_months,
      }
    }
  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载评估数据失败')
  } finally {
    loading.value = false
  }
}

// 返回
function goBack() {
  router.back()
}

// 查看历史
function viewHistory() {
  if (studentInfo.value?.id) {
    router.push(`/assessment-trend/abc/${studentInfo.value.id}`)
  }
}

// 导出 Word
function exportWord() {
  ElMessage.info('Word 导出功能开发中')
}

// AI 解读
function openAiInterpretation() {
  if (!studentInfo.value || !assessData.value) {
    ElMessage.warning('评估数据未加载完成')
    return
  }

  // 打开 AI 助手，默认使用"一人一策"智能体
  openAiAssistant('special_ed_teacher')

  // 提示用户如何使用
  setTimeout(() => {
    ElMessage.success('AI助手已打开，你可以询问"解读这名学生的ABC评估结果"')
  }, 500)
}

onMounted(() => {
  loadAssessment()
})
</script>

<template>
  <div class="abc-report" v-loading="loading">
    <!-- 报告头部 -->
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>ABC 孤独症儿童行为评定量表报告</h2>
          </div>
          <div class="header-actions">
            <el-button :icon="Clock" @click="viewHistory">查看历史</el-button>
            <el-button :icon="ChatDotRound" @click="openAiInterpretation">AI解读</el-button>
            <el-button type="primary" :icon="Download" @click="exportWord">导出Word</el-button>
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
          <span class="value">{{ studentInfo.ageMonths }} 月 ({{ Math.floor(studentInfo.ageMonths / 12) }} 岁)</span>
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
          <!-- 总分卡片 -->
          <div class="score-item total" :class="getSeverityClass(severityLevel)">
            <div class="score-label">总分</div>
            <div class="score-value">{{ assessData?.total_score ?? 0 }}</div>
            <div class="score-range">(满分 158)</div>
            <div class="score-level">
              <el-tag :type="getSeverityType(severityLevel)" size="large">
                {{ severityText }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 评估说明 -->
        <div class="assessment-desc">
          <el-alert
            :title="`评估结果：${severityText}`"
            :type="getSeverityType(severityLevel)"
            :closable="false"
            show-icon
          >
            <template #default>
              <p v-if="severityLevel === 'normal'">
                总分 {{ assessData?.total_score }} 分，低于筛查分界值（49分），属于正常范围。
                孤独症相关行为表现不明显，整体发展良好。
              </p>
              <p v-else-if="severityLevel === 'borderline'">
                总分 {{ assessData?.total_score }} 分，处于边缘范围（49-61分）。
                建议进一步观察和评估，必要时咨询专业医生进行诊断性评估。
              </p>
              <p v-else-if="severityLevel === 'mild'">
                总分 {{ assessData?.total_score }} 分，提示轻度孤独症症状（62-79分）。
                建议尽快启动早期干预，重点关注评分较高的维度。
              </p>
              <p v-else-if="severityLevel === 'moderate'">
                总分 {{ assessData?.total_score }} 分，提示中度孤独症症状（80-99分）。
                需要系统性的专业干预，建议制定个别化教育计划（IEP）。
              </p>
              <p v-else>
                总分 {{ assessData?.total_score }} 分，提示重度孤独症症状（≥100分）。
                需要密集的专业干预和支持，建议转介专业机构进行综合评估和治疗。
              </p>
            </template>
          </el-alert>
        </div>
      </div>
    </el-card>

    <!-- 维度分数详情 -->
    <el-card class="dimension-scores">
      <template #header>
        <h3>📈 维度分数详情</h3>
      </template>

      <el-table :data="dimensionScores" style="width: 100%">
        <el-table-column prop="name" label="维度" width="120">
          <template #default="{ row }">
            <strong>{{ row.name }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
        <el-table-column prop="score" label="得分" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="warning" size="large">{{ row.score }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maxScore" label="满分" width="100" align="center" />
        <el-table-column label="占比" width="200">
          <template #default="{ row }">
            <el-progress
              :percentage="Number(row.percentage)"
              :color="getProgressColor(Number(row.percentage))"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 专业建议 -->
    <el-card class="recommendations">
      <template #header>
        <h3>💡 专业建议</h3>
      </template>

      <div class="recommendation-content">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <strong>关于 ABC 量表</strong>
          </template>
          <template #default>
            <p>ABC（Autism Behavior Checklist）孤独症儿童行为评定量表是一个广泛使用的孤独症筛查工具。</p>
            <ul>
              <li><strong>筛查分界值：</strong>57 分</li>
              <li><strong>诊断分界值：</strong>67 分（传统），近期研究建议 49-62 分可能更优</li>
              <li><strong>评分特点：</strong>加权计分，不同题目权重 1-4 分不等</li>
              <li><strong>适用年龄：</strong>3 岁以上</li>
            </ul>
          </template>
        </el-alert>

        <div class="recommendation-sections">
          <div class="recommendation-section">
            <h4>🎯 干预重点</h4>
            <ul>
              <li v-for="dim in getHighScoreDimensions()" :key="dim.code">
                <strong>{{ dim.name }}维度</strong>得分较高（{{ dim.score }}/{{ dim.maxScore }}），
                建议重点关注该领域的干预训练。
              </li>
              <li v-if="getHighScoreDimensions().length === 0">
                各维度得分相对均衡，建议全面发展，保持良好状态。
              </li>
            </ul>
          </div>

          <div class="recommendation-section">
            <h4>📚 后续评估建议</h4>
            <ul>
              <li>建议每 3-6 个月进行一次复评，追踪变化趋势</li>
              <li>如总分 ≥49 分，建议转介专业医疗机构进行诊断性评估</li>
              <li>可结合 ATEC 量表进行治疗效果评估</li>
              <li>建议配合使用其他标准化评估工具（如 ADOS、ADI-R）进行综合评估</li>
            </ul>
          </div>

          <div class="recommendation-section">
            <h4>⚠️ 重要提示</h4>
            <ul>
              <li>本量表仅供筛查参考，不能作为诊断依据</li>
              <li>确诊需要由专业医生进行全面评估</li>
              <li>早期发现、早期干预对预后有重要影响</li>
              <li>请在专业人员指导下制定个别化干预计划</li>
            </ul>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 评估用时信息（旧记录无数据时整卡不渲染） -->
    <AssessmentTimingInfo
      :total-duration="assessData?.total_duration"
      :avg-response-time="assessData?.avg_response_time"
    />
  </div>
</template>

<style scoped>
.abc-report {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.el-card {
  margin-bottom: 20px;
}

/* 头部样式 */
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
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 学生信息 */
.student-info {
  display: flex;
  gap: 32px;
  padding: 16px 0;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  color: #909399;
  margin-right: 8px;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
}

/* 评估结果总览 */
.overview-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.score-summary {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.score-item {
  flex: 0 0 280px;
  padding: 32px 24px;
  border-radius: 12px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.score-item.total {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.score-item.severity-normal {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.score-item.severity-borderline {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.score-item.severity-mild {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.score-item.severity-moderate {
  background: linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%);
}

.score-item.severity-severe {
  background: linear-gradient(135deg, #f54ea2 0%, #ff7676 100%);
}

.score-label {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 12px;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 8px;
}

.score-range {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 16px;
}

.score-level {
  margin-top: 12px;
}

/* 评估说明 */
.assessment-desc {
  max-width: 800px;
  margin: 0 auto;
}

.assessment-desc p {
  margin: 0;
  line-height: 1.8;
  font-size: 15px;
}

/* 维度分数表格 */
.dimension-scores :deep(.el-table) {
  font-size: 15px;
}

.dimension-scores :deep(.el-table th) {
  background-color: #f5f7fa;
  font-weight: 600;
}

/* 专业建议 */
.recommendation-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.recommendation-content ul {
  margin: 12px 0;
  padding-left: 24px;
}

.recommendation-content li {
  margin: 8px 0;
  line-height: 1.8;
}

.recommendation-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.recommendation-section {
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
}

.recommendation-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

.recommendation-section ul {
  margin: 0;
}
</style>
