<!-- src/views/assessment/atec/Report.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Clock, Download, TrendCharts, ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getDatabase } from '@/database/init'
import type { ATECLevel } from '@/database/atec-questions'
import {
  ATEC_SUBSCALE_NAMES,
  ATEC_SUBSCALE_MAX_SCORES,
  ATEC_TOTAL_MAX_SCORE,
  getATECLevel,
  ATEC_LEVEL_NAMES
} from '@/database/atec-questions'
import { openAiAssistant } from '@/features/ai/assistant-launcher'
import AssessmentTimingInfo from '../components/AssessmentTimingInfo.vue'

const route = useRoute()
const router = useRouter()

// 评估数据
const assessId = ref<number>(Number(route.params.assessId))
const assessData = ref<any>(null)
const studentInfo = ref<any>(null)
const loading = ref(true)

// 计算分量表得分
const subscaleScores = computed(() => {
  if (!assessData.value?.subscale_scores) return []

  const scores = JSON.parse(assessData.value.subscale_scores)

  const subscaleData = [
    {
      code: 'speech',
      name: '表达/语言沟通',
      maxScore: ATEC_SUBSCALE_MAX_SCORES.speech,
      description: '语言能力和沟通交流',
      scoringNote: '反向计分：分数越高表示能力越差'
    },
    {
      code: 'sociability',
      name: '社交能力',
      maxScore: ATEC_SUBSCALE_MAX_SCORES.sociability,
      description: '社交互动和情感表达',
      scoringNote: '正向计分：分数越高表示问题越多'
    },
    {
      code: 'sensory',
      name: '感知/认知能力',
      maxScore: ATEC_SUBSCALE_MAX_SCORES.sensory,
      description: '感觉处理和认知意识',
      scoringNote: '反向计分：分数越高表示能力越差'
    },
    {
      code: 'health',
      name: '健康/生理/行为',
      maxScore: ATEC_SUBSCALE_MAX_SCORES.health,
      description: '生理健康和行为问题',
      scoringNote: '4级计分：分数越高表示问题越严重'
    },
  ]

  return subscaleData.map(sub => ({
    ...sub,
    score: scores[sub.code] || 0,
    percentage: sub.maxScore > 0 ? ((scores[sub.code] || 0) / sub.maxScore * 100).toFixed(1) : '0',
  }))
})

// 严重程度
const severityLevel = computed(() => {
  if (!assessData.value?.total_score) return 'minimal'
  return assessData.value.level as ATECLevel
})

const severityText = computed(() => {
  return ATEC_LEVEL_NAMES[severityLevel.value]
})

// 获取严重程度样式类
function getSeverityClass(level: ATECLevel): string {
  const classMap: Record<ATECLevel, string> = {
    minimal: 'severity-minimal',
    mild: 'severity-mild',
    moderate: 'severity-moderate',
    severe: 'severity-severe',
  }
  return classMap[level]
}

// 获取严重程度标签类型
function getSeverityType(level: ATECLevel): 'success' | 'info' | 'warning' | 'danger' {
  const typeMap: Record<ATECLevel, 'success' | 'info' | 'warning' | 'danger'> = {
    minimal: 'success',
    mild: 'info',
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

// 获取高分分量表（得分占比 > 60%）
function getHighScoreSubscales() {
  return subscaleScores.value.filter(sub => {
    const percentage = sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0
    return percentage > 60
  })
}

// 加载评估数据
async function loadAssessment() {
  loading.value = true
  try {
    const db = getDatabase()

    // 加载评估记录（db.all 返回对象数组；此前误用无返回值的 db.exec 导致报告页崩溃）
    const assessSql = 'SELECT * FROM atec_assess WHERE id = ?'
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
      subscale_scores: row.subscale_scores,
      total_score: row.total_score,
      level: row.level,
      start_time: row.start_time,
      end_time: row.end_time,
      created_at: row.created_at,
      // 质量追踪列（宽松质控；旧记录为 NULL）
      total_duration: row.total_duration ?? null,
      avg_response_time: row.avg_response_time ?? null,
      quality_note: row.quality_note ?? null,
    }

    // 加载学生信息
    const studentSql = 'SELECT id, name FROM student WHERE id = ?'
    const studentRows = db.all(studentSql, [assessData.value.student_id])

    if (studentRows[0]) {
      const studentRow = studentRows[0]
      studentInfo.value = {
        id: studentRow.id,
        name: studentRow.name,
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
    router.push(`/assessment-trend/atec/${studentInfo.value.id}`)
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
    ElMessage.success('AI助手已打开，你可以询问"解读这名学生的ATEC评估结果"')
  }, 500)
}

onMounted(() => {
  loadAssessment()
})
</script>

<template>
  <div class="atec-report" v-loading="loading">
    <!-- 报告头部 -->
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>ATEC 孤独症治疗评估量表报告</h2>
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
            <div class="score-range">(满分 {{ ATEC_TOTAL_MAX_SCORE }})</div>
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
              <p v-if="severityLevel === 'minimal'">
                总分 {{ assessData?.total_score }} 分，属于轻微范围（<40分）。
                症状表现较轻，整体功能相对较好。建议继续观察并定期复评。
              </p>
              <p v-else-if="severityLevel === 'mild'">
                总分 {{ assessData?.total_score }} 分，属于轻度范围（40-69分）。
                存在一定程度的症状，建议启动或继续干预，重点关注得分较高的分量表。
              </p>
              <p v-else-if="severityLevel === 'moderate'">
                总分 {{ assessData?.total_score }} 分，属于中度范围（70-119分）。
                症状较为明显，需要系统的专业干预和支持。建议制定详细的干预计划。
              </p>
              <p v-else>
                总分 {{ assessData?.total_score }} 分，属于重度范围（≥120分）。
                症状严重，需要密集的专业干预。建议寻求专业医疗机构的综合评估和治疗。
              </p>
            </template>
          </el-alert>

          <el-alert type="info" :closable="false" style="margin-top: 16px">
            <template #default>
              <p style="margin: 0">
                <strong>💡 ATEC 量表特点：</strong>ATEC 是专门用于追踪治疗效果的评估工具。
                <strong>分数下降</strong>通常表示症状改善，建议每 3-6 个月进行一次评估以监测治疗进展。
              </p>
            </template>
          </el-alert>
        </div>
      </div>
    </el-card>

    <!-- 分量表得分详情 -->
    <el-card class="subscale-scores">
      <template #header>
        <h3>📈 分量表得分详情</h3>
      </template>

      <el-table :data="subscaleScores" style="width: 100%">
        <el-table-column prop="name" label="分量表" width="150">
          <template #default="{ row }">
            <strong>{{ row.name }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" width="180" />
        <el-table-column prop="scoringNote" label="计分方式" min-width="200">
          <template #default="{ row }">
            <el-text type="info" size="small">{{ row.scoringNote }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="score" label="得分" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="large">{{ row.score }}</el-tag>
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

      <div class="scoring-explanation" style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px">
        <h4 style="margin: 0 0 12px 0; font-size: 15px">⚠️ 计分说明</h4>
        <ul style="margin: 0; padding-left: 24px; line-height: 1.8">
          <li><strong>反向计分</strong>（I、III）：评估的是<strong>能力</strong>，分数越高表示该能力越差</li>
          <li><strong>正向计分</strong>（II）：评估的是<strong>问题</strong>，分数越高表示问题越多</li>
          <li><strong>4级计分</strong>（IV）：评估问题的<strong>严重程度</strong>，0-3分表示从无问题到严重问题</li>
        </ul>
      </div>
    </el-card>

    <!-- 专业建议 -->
    <el-card class="recommendations">
      <template #header>
        <h3>💡 专业建议</h3>
      </template>

      <div class="recommendation-content">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <strong>关于 ATEC 量表</strong>
          </template>
          <template #default>
            <p>ATEC（Autism Treatment Evaluation Checklist）孤独症治疗评估量表是专门用于评估治疗效果的工具。</p>
            <ul>
              <li><strong>总分范围：</strong>0-179 分（分数越高表示症状越严重）</li>
              <li><strong>评分特点：</strong>不同分量表采用不同的评分方式（反向/正向/4级计分）</li>
              <li><strong>适用年龄：</strong>2 岁以上</li>
              <li><strong>核心价值：</strong>追踪治疗效果，监测症状变化趋势</li>
            </ul>
          </template>
        </el-alert>

        <div class="recommendation-sections">
          <div class="recommendation-section">
            <h4>🎯 干预重点</h4>
            <ul>
              <li v-for="sub in getHighScoreSubscales()" :key="sub.code">
                <strong>{{ sub.name }}</strong>得分较高（{{ sub.score }}/{{ sub.maxScore }}），
                建议重点关注该领域的干预训练。
              </li>
              <li v-if="getHighScoreSubscales().length === 0">
                各分量表得分相对均衡。建议继续当前的干预方案，保持治疗效果。
              </li>
            </ul>
          </div>

          <div class="recommendation-section">
            <h4>📈 效果追踪建议</h4>
            <ul>
              <li>建议每 3-6 个月进行一次复评，建立治疗效果基线</li>
              <li>关注总分和各分量表得分的变化趋势</li>
              <li>分数下降通常表示症状改善和治疗有效</li>
              <li>可结合其他评估工具（如 ABC）进行综合评估</li>
              <li>点击"查看历史"可查看评分趋势图和变化分析</li>
            </ul>
          </div>

          <div class="recommendation-section">
            <h4>⚠️ 重要提示</h4>
            <ul>
              <li>ATEC 主要用于治疗效果评估，不能单独作为诊断依据</li>
              <li>需要在专业人员指导下解读评估结果</li>
              <li>不同的评分方式需要正确理解（反向/正向/4级计分）</li>
              <li>治疗方案调整应基于多次评估的趋势，而非单次结果</li>
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
/* 基础布局 */
.atec-report {
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
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.score-item.severity-minimal {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.score-item.severity-mild {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.score-item.severity-moderate {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
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
  max-width: 900px;
  margin: 0 auto;
}

.assessment-desc p {
  margin: 0;
  line-height: 1.8;
  font-size: 15px;
}

/* 分量表表格 */
.subscale-scores :deep(.el-table) {
  font-size: 15px;
}

.subscale-scores :deep(.el-table th) {
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
  border-left: 4px solid #67C23A;
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
