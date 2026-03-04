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
      </div>
    </el-card>

    <!-- 维度分数详情 -->
    <el-card class="dimension-scores">
      <template #header>
        <h3>📈 维度分数详情</h3>
      </template>

      <el-table :data="dimensionTableData" style="width: 100%">
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
          <li v-for="(advice, index) in expertAdvice" :key="index">{{ advice }}</li>
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

import { SDQ_DIMENSION_NAMES, SDQ_THRESHOLDS } from '@/database/sdq-questions'

// 类型定义
interface DimensionRow {
  code: string
  name: string
  score: number
  level: string
  description: string
}

// Props
const route = useRoute()
const router = useRouter()

// 响应式数据
const assessData = ref<SDQAssessRecord | null>(null)
const studentInfo = ref<{ name: string; ageMonths: number } | null>(null)
const dimensionScores = ref<DimensionRow[]>([])

// 计算属性
const prosocialLevel = computed(() => {
  if (!assessData.value) return '正常'
  const score = assessData.value.prosocial_score
  if (score >= 6) return '优秀'
  if (score >= 5) return '边缘'
  return '需培养'
})

const expertAdvice = computed(() => {
  const advice: string[] = []
  const level = assessData.value?.level

  if (level === '异常' || level === '边缘') {
    advice.push('建议进行专业心理咨询或评估')
    advice.push('家长和老师应保持沟通，共同制定支持策略')
  }

  if (prosocialLevel.value === '需培养') {
    advice.push('可以通过榜样示范培养孩子的同理心和助人意识')
  }

  if (advice.length === 0) {
    advice.push('继续保持良好的家庭氛围和教养方式')
    advice.push('定期复评以持续关注孩子的发展')
  }

  return advice
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
      return {
        code,
        name,
        score: data.rawScore,
        level: data.levelName,
        description: getDimensionDescription(code, englishLevel)
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
  return descriptions[code]?. [level.toLowerCase()] || ''
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

.level-normal, .level-excellent {
  color: #67c23a;
}

.level-borderline {
  color: #e6a23c;
}

.level-abnormal {
  color: #f56c6c;
}

.dimension-scores {
  margin-bottom: 20px;
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
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}
</style>
