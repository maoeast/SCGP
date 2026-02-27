<template>
  <div class="weefim-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <h2>WeeFIM量表评估报告</h2>
          <div class="header-actions">
            <el-button type="success" :icon="Document" @click="exportWord">
              导出Word
            </el-button>
          </div>
        </div>
      </template>
    </el-card>

    <div class="report-content" id="report-content">
      <!-- 报告标题 -->
      <div class="report-title">
        <h1>改良儿童功能独立性评估量表报告</h1>
        <p class="report-subtitle">(WeeFIM量表)</p>
      </div>

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
                <span class="value">{{ student?.name }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="info-item">
                <span class="label">性别：</span>
                <span class="value">{{ student?.gender || '未知' }}</span>
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

      <!-- 评估结果总览 -->
      <el-card class="result-overview-card">
        <template #header>
          <h3>评估结果总览</h3>
        </template>
        <div class="overview-content">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="score-card">
                <div class="score-icon">
                  <el-icon size="40" color="#409eff"><TrendCharts /></el-icon>
                </div>
                <div class="score-info">
                  <div class="score-title">总得分</div>
                  <div class="score-value">{{ reportData?.total_score }}/126</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="score-card">
                <div class="score-icon">
                  <el-icon size="40" color="#67c23a"><Promotion /></el-icon>
                </div>
                <div class="score-info">
                  <div class="score-title">运动功能</div>
                  <div class="score-value">{{ reportData?.motor_score }}/91</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="score-card">
                <div class="score-icon">
                  <el-icon size="40" color="#e6a23c"><Reading /></el-icon>
                </div>
                <div class="score-info">
                  <div class="score-title">认知功能</div>
                  <div class="score-value">{{ reportData?.cognitive_score }}/35</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 独立性等级 -->
      <el-card class="independence-card">
        <template #header>
          <h3>独立性等级评定</h3>
        </template>
        <div class="independence-content">
          <div class="level-display">
            <div class="level-badge" :class="getIndependenceLevelClass(reportData?.level?.level)">
              <div class="level-text">{{ getIndependenceLevelText(reportData?.level?.level) }}</div>
              <div class="level-desc">{{ getIndependenceLevelDesc(reportData?.level?.level) }}</div>
            </div>
          </div>
          <div class="level-explanation">
            <h4>等级说明：</h4>
            <p>{{ getIndependenceExplanation(reportData?.level?.level) }}</p>
          </div>
        </div>
      </el-card>

      <!-- 各领域得分详情 -->
      <el-card class="domains-card">
        <template #header>
          <h3>各领域得分详情</h3>
        </template>
        <div class="domains-content">
          <div v-for="category in categories" :key="category.id" class="category-section">
            <h4 class="category-title">{{ category.name }}</h4>
            <div class="category-score">
              <span class="score-label">得分：</span>
              <span class="score-value">{{ getCategoryScore(category.id) }}/{{ category.maxScore }}</span>
              <el-progress
                :percentage="(getCategoryScore(category.id) / category.maxScore) * 100"
                :stroke-width="10"
                :show-text="false"
              />
            </div>
            <div class="category-items">
              <el-table
                :data="getCategoryItems(category.id)"
                style="width: 100%"
                size="small"
              >
                <el-table-column prop="title" label="评估项目" />
                <el-table-column prop="score" label="得分" width="100">
                  <template #default="scope">
                    <span class="score-number">{{ scope.row.score }}/7</span>
                  </template>
                </el-table-column>
                <el-table-column prop="level" label="独立性水平" width="120">
                  <template #default="scope">
                    <el-tag size="small" :type="getScoreTagType(scope.row.score)">
                      {{ getScoreLevelText(scope.row.score) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="assistance" label="所需协助" />
              </el-table>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 得分分布图 -->
      <el-card class="chart-card">
        <template #header>
          <h3>得分分布分析</h3>
        </template>
        <div class="chart-content">
          <div class="chart-container">
            <v-chart
              class="radar-chart"
              :option="radarChartOption"
              :style="{ height: '400px', width: '100%' }"
              autoresize
              :loading="!assessmentDetails || assessmentDetails.length === 0"
            />
          </div>
          <div class="score-analysis">
            <h4>得分分析：</h4>
            <ul>
              <li v-for="(analysis, index) in getScoreAnalysis()" :key="index">
                {{ analysis }}
              </li>
            </ul>
          </div>
        </div>
      </el-card>

      <!-- 康复建议 -->
      <el-card class="suggestions-card">
        <template #header>
          <h3>康复建议</h3>
        </template>
        <div class="suggestions-content">
          <div class="suggestion-section">
            <h4>短期目标（1-3个月）：</h4>
            <ul>
              <li v-for="(goal, index) in getShortTermGoals()" :key="index">
                {{ goal }}
              </li>
            </ul>
          </div>
          <div class="suggestion-section">
            <h4>长期目标（6-12个月）：</h4>
            <ul>
              <li v-for="(goal, index) in getLongTermGoals()" :key="index">
                {{ goal }}
              </li>
            </ul>
          </div>
          <div class="suggestion-section">
            <h4>训练建议：</h4>
            <ul>
              <li v-for="(suggestion, index) in getTrainingSuggestions()" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
          <div class="suggestion-section">
            <h4>环境改造建议：</h4>
            <ul>
              <li v-for="(suggestion, index) in getEnvironmentSuggestions()" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </el-card>

      <!-- 专业建议 -->
      <el-card class="professional-card">
        <template #header>
          <h3>专业建议</h3>
        </template>
        <div class="professional-content">
          <div class="referral-suggestions">
            <h4>转介建议：</h4>
            <el-checkbox-group v-model="selectedReferrals">
              <el-checkbox
                v-for="referral in referralOptions"
                :key="referral.value"
                :label="referral.value"
              >
                {{ referral.label }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
          <div class="frequency-suggestion">
            <h4>评估频率建议：</h4>
            <el-radio-group v-model="assessmentFrequency">
              <el-radio value="monthly">每月一次</el-radio>
              <el-radio value="quarterly">每季度一次</el-radio>
              <el-radio value="halfyearly">每半年一次</el-radio>
              <el-radio value="yearly">每年一次</el-radio>
            </el-radio-group>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Document, Printer, Promotion, Reading } from '@element-plus/icons-vue'
import { exportReportToPDF } from '@/utils/reportExporter'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import { TitleComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useStudentStore } from '@/stores/student'
import { WeeFIMAPI } from '@/database/api'
import { getWeeFIMLevelAndDescription, weefimRecommendations } from '@/database/weefim-data'

// 注册ECharts组件
use([
  CanvasRenderer,
  RadarChart,
  TitleComponent,
  LegendComponent,
  TooltipComponent
])

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()

// 报告数据
const reportData = ref<any>(null)
const assessId = ref(route.query.assessId as string)
const studentId = ref(route.query.studentId as string)

// 转介选项
const selectedReferrals = ref<string[]>([])
const referralOptions = [
  { label: '物理治疗师', value: 'pt' },
  { label: '作业治疗师', value: 'ot' },
  { label: '言语治疗师', value: 'st' },
  { label: '心理治疗师', value: 'psych' },
  { label: '特殊教育老师', value: 'special_edu' },
  { label: '社会工作者', value: 'social_worker' }
]

// 评估频率
const assessmentFrequency = ref('quarterly')

// 学生信息
const student = computed(() =>
  studentStore.students.find(s => s.id === parseInt(studentId.value))
)

// 学生年龄
const studentAge = computed(() => {
  if (!student.value?.birthday) return 0
  const birth = new Date(student.value.birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
})

// 评估日期
const assessDate = computed(() => {
  if (!reportData.value?.end_time) return new Date().toLocaleDateString()
  return new Date(reportData.value.end_time).toLocaleDateString()
})

// 评估类别
const categories = ref([
  { id: 'selfcare', name: '自我照顾', maxScore: 42 },
  { id: 'sphincter', name: '括约肌控制', maxScore: 14 },
  { id: 'transfer', name: '转移', maxScore: 21 },
  { id: 'locomotion', name: '行走', maxScore: 14 },
  { id: 'communication', name: '交流', maxScore: 14 },
  { id: 'social_cognition', name: '社会认知', maxScore: 21 }
])

// 计算各类别分数 - 使用computed确保响应式更新
const categoriesScores = computed(() => {
  return {
    selfcare: { score: getCategoryScore('selfcare') },
    sphincter: { score: getCategoryScore('sphincter') },
    transfer: { score: getCategoryScore('transfer') },
    locomotion: { score: getCategoryScore('locomotion') },
    communication: { score: getCategoryScore('communication') },
    social_cognition: { score: getCategoryScore('social_cognition') }
  }
})

// 评估详情
const assessmentDetails = ref<any[]>([])

// 从评估数据重建答案映射
const answersMap = computed(() => {
  const map: Record<number, number> = {}
  if (assessmentDetails.value && assessmentDetails.value.length > 0) {
    assessmentDetails.value.forEach(detail => {
      map[detail.question_id] = detail.score
    })
  }
  return map
})

// 获取独立性等级文本（支持字符串或数字）
const getIndependenceLevelText = (level: string | number) => {
  // 如果是字符串，直接返回
  if (typeof level === 'string') {
    const levelTextMap: Record<string, string> = {
      '完全独立': '完全独立',
      '基本独立': '基本独立',
      '轻度依赖': '轻度依赖',
      '中度依赖': '中度依赖',
      '重度依赖': '重度依赖',
      '极重度依赖': '极重度依赖',
      '完全依赖': '完全依赖',
      // 添加WeeFIM特有的水平等级
      '极强': '功能独立性极强',
      '良好': '功能独立性良好',
      '中等': '功能独立性中等',
      '较弱': '功能独立性较弱',
      '非常弱': '功能独立性非常弱',
      '极度弱': '功能独立性极度弱'
    }
    return levelTextMap[level] || level
  }

  // 如果是数字，映射到文本
  const levelMap: Record<number, string> = {
    1: '完全依赖',
    2: '最大依赖',
    3: '中度依赖',
    4: '最小依赖',
    5: '监督/准备',
    6: '基本独立',
    7: '完全独立'
  }
  return levelMap[level] || '未知'
}

// 获取独立性等级描述（支持字符串或数字）
const getIndependenceLevelDesc = (level: string | number) => {
  // 如果是字符串，返回对应描述
  if (typeof level === 'string') {
    const descMap: Record<string, string> = {
      '完全独立': '所有项目都能独立完成，无需任何辅助',
      '基本独立': '大部分项目能独立完成，个别项目需要监督或准备',
      '轻度依赖': '部分项目需要最小或中度辅助',
      '中度依赖': '多数项目需要中度或最大辅助',
      '重度依赖': '大部分项目需要最大辅助或完全依赖',
      '极重度依赖': '绝大多数项目完全依赖他人',
      '完全依赖': '所有项目都需要完全依赖他人',
      // 添加WeeFIM特有的水平等级描述
      '极强': '总分126-108分，在各方面都能独立完成',
      '良好': '总分107-90分，大部分项目能独立完成',
      '中等': '总分89-72分，部分项目需要协助',
      '较弱': '总分71-54分，存在明显功能障碍',
      '非常弱': '总分53-36分，大部分任务依赖他人',
      '极度弱': '总分35-18分，几乎完全依赖他人'
    }
    return descMap[level] || ''
  }

  // 如果是数字，返回对应描述
  const descMap: Record<number, string> = {
    1: '需要他人完成所有任务（>25%协助）',
    2: '需要最大协助（25-50%协助）',
    3: '需要中度协助（>50%协助）',
    4: '需要最小协助（<25%协助）',
    5: '需要监督或准备',
    6: '需要辅助设备或额外时间',
    7: '完全独立，无需协助'
  }
  return descMap[level] || ''
}

// 获取独立性等级样式类（支持字符串或数字）
const getIndependenceLevelClass = (level: string | number) => {
  // 如果是字符串，映射到对应样式
  if (typeof level === 'string') {
    const classMap: Record<string, string> = {
      '完全独立': 'independence-level-7',
      '基本独立': 'independence-level-6',
      '轻度依赖': 'independence-level-4',
      '中度依赖': 'independence-level-3',
      '重度依赖': 'independence-level-2',
      '极重度依赖': 'independence-level-1',
      '完全依赖': 'independence-level-1',
      // 添加WeeFIM特有的水平等级样式
      '极强': 'independence-level-7',
      '良好': 'independence-level-6',
      '中等': 'independence-level-4',
      '较弱': 'independence-level-3',
      '非常弱': 'independence-level-2',
      '极度弱': 'independence-level-1'
    }
    return classMap[level] || 'independence-level-4' // 默认返回中等水平的样式
  }

  // 如果是数字，返回对应样式
  const classMap: Record<number, string> = {
    1: 'independence-level-1',
    2: 'independence-level-2',
    3: 'independence-level-3',
    4: 'independence-level-4',
    5: 'independence-level-5',
    6: 'independence-level-6',
    7: 'independence-level-7'
  }
  return classMap[level] || ''
}

// 获取独立性等级说明（支持字符串或数字）
const getIndependenceExplanation = (level: string | number) => {
  // 如果是字符串，返回对应说明
  if (typeof level === 'string') {
    const explanations: Record<string, string> = {
      '完全独立': '所有项目都能独立完成，无需任何辅助。学生表现出完全的自主性和独立性。',
      '基本独立': '大部分项目能独立完成，个别项目需要监督或准备。学生在日常活动中表现出高度的自主性。',
      '轻度依赖': '部分项目需要最小或中度辅助。学生能够独立完成大部分任务，但在某些复杂任务中需要协助。',
      '中度依赖': '多数项目需要中度或最大辅助。学生需要持续的支持才能完成日常活动。',
      '重度依赖': '大部分项目需要最大辅助或完全依赖。学生在大多数活动中需要大量帮助。',
      '极重度依赖': '绝大多数项目完全依赖他人。学生需要全面的护理和支持。',
      '完全依赖': '所有项目都需要完全依赖他人。学生无法独立完成任何任务。',
      // 添加WeeFIM特有的水平等级说明
      '极强': '儿童功能独立性极强，在日常生活活动和认知功能方面都能独立完成各种任务，与同龄人相比表现优秀。建议继续鼓励儿童保持并拓展新的技能，给予更多具有挑战性的任务。',
      '良好': '儿童功能独立性良好，能独立完成大部分日常活动和认知任务，但在某些较为复杂的项目上可能需要一些轻微协助或提示。建议针对薄弱环节进行有针对性的训练。',
      '中等': '儿童功能独立性中等，在日常生活和认知功能上既有一定的自主能力，又在多个方面需要不同程度的协助。建议制定系统的康复或训练计划，重点提升关键领域能力。',
      '较弱': '儿童功能独立性较弱，在日常生活活动和认知功能方面存在明显的功能障碍，需要较多的协助才能完成基本任务。建议寻求专业的康复治疗师帮助，制定个性化的干预方案。',
      '非常弱': '儿童功能独立性非常弱，大部分日常生活和认知任务都依赖他人完成。建议着重关注儿童的基本需求满足，积极开展康复训练，从最基础的动作和认知训练入手。',
      '极度弱': '儿童功能独立性极度弱，几乎完全依赖他人照顾。建议保证儿童的基本生活需求，持续进行康复训练，虽然进步可能缓慢，但任何微小的进步都意义重大。'
    }
    return explanations[level] || '暂无说明'
  }

  // 如果是数字，返回对应说明
  const explanations: Record<number, string> = {
    1: '学生完全依赖他人，需要他人完成所有任务。需要全面的护理和支持。',
    2: '学生需要最大程度的协助，仅能完成极少部分任务。需要持续的监督和物理帮助。',
    3: '学生需要中度的协助，能够完成部分任务但需要大量帮助。需要定时的支持和指导。',
    4: '学生需要最小的协助，基本能够独立完成任务，仅在特定情况下需要帮助。',
    5: '学生需要监督或准备，能够独立完成任务但需要他人准备或监督。',
    6: '学生基本独立，可能需要辅助设备或额外时间完成某些任务。',
    7: '学生完全独立，能够在合理时间内安全地完成所有任务，无需任何协助。'
  }
  return explanations[level] || '暂无说明'
}

// 获取类别得分
const getCategoryScore = (categoryId: string) => {
  // 根据实际评估详情计算类别得分
  const categoryMapping: Record<string, number[]> = {
    'selfcare': [1, 2, 3, 4, 5, 6],        // 进食、梳洗修饰、洗澡、穿上衣、穿裤子、上厕所
    'sphincter': [7, 8],                   // 排尿控制、排便控制
    'transfer': [9, 10, 11],               // 床椅转移、轮椅转移、进出浴盆/淋浴间
    'locomotion': [12, 13],                // 步行/上下楼梯、使用轮椅
    'communication': [14, 15],             // 理解、表达
    'social_cognition': [16, 17, 18]       // 社会交往、解决问题、记忆
  }

  const questionIds = categoryMapping[categoryId]
  if (!questionIds) return 0

  // 从评估详情中计算该类别的总分
  const categoryScore = questionIds.reduce((total, questionId) => {
    // 首先尝试从 assessmentDetails 获取分数
    let score = 0
    if (assessmentDetails.value && assessmentDetails.value.length > 0) {
      const detail = assessmentDetails.value.find(d => d.question_id === questionId)
      score = detail ? detail.score : 0
    }

    // 如果 assessmentDetails 中没有找到，尝试从 answersMap 获取
    if (score === 0 && answersMap.value[questionId]) {
      score = answersMap.value[questionId]
    }

    return total + score
  }, 0)

  return categoryScore
}

// 获取类别项目
const getCategoryItems = (categoryId: string) => {
  // 根据实际评估详情返回该类别的项目
  const categoryMapping: Record<string, number[]> = {
    'selfcare': [1, 2, 3, 4, 5, 6],        // 进食、梳洗修饰、洗澡、穿上衣、穿裤子、上厕所
    'sphincter': [7, 8],                   // 排尿控制、排便控制
    'transfer': [9, 10, 11],               // 床椅转移、轮椅转移、进出浴盆/淋浴间
    'locomotion': [12, 13],                // 步行/上下楼梯、使用轮椅
    'communication': [14, 15],             // 理解、表达
    'social_cognition': [16, 17, 18]       // 社会交往、解决问题、记忆
  }

  const questionIds = categoryMapping[categoryId]
  if (!questionIds) return []

  // 从答案映射中获取该类别的项目
  return questionIds.map(questionId => {
    const score = answersMap.value[questionId] || 0
    const detail = assessmentDetails.value.find(d => d.question_id === questionId)
    return {
      title: detail?.title || getWeeFIMQuestionTitle(questionId),
      score: score,
      level: getScoreLevel(score),
      assistance: getScoreAssistance(score)
    }
  })
}

// 获取WeeFIM题目标题
const getWeeFIMQuestionTitle = (questionId: number): string => {
  const titles: Record<number, string> = {
    1: '进食', 2: '梳洗修饰', 3: '洗澡', 4: '穿上衣', 5: '穿裤子', 6: '上厕所',
    7: '排尿控制', 8: '排便控制',
    9: '床椅转移', 10: '轮椅转移', 11: '进出浴盆/淋浴间',
    12: '步行/上下楼梯', 13: '使用轮椅',
    14: '理解', 15: '表达',
    16: '社会交往', 17: '解决问题', 18: '记忆'
  }
  return titles[questionId] || `题目${questionId}`
}

// 雷达图配置
const radarChartOption = computed(() => {
  try {
  // 强制尝试渲染，即使数据可能不完整
  console.log('开始计算雷达图配置...')
  console.log('assessmentDetails.value:', assessmentDetails.value)
  console.log('categories.value:', categories.value)

  // 如果没有评估详情，使用默认数据渲染
  let radarData = categories.value.map(category => {
    let score = 0
    try {
      score = getCategoryScore(category.id)
    } catch (error) {
      console.warn(`获取 ${category.name} 得分失败:`, error)
      score = 0
    }
    console.log(`雷达图数据 - ${category.name}: ${score}/${category.maxScore}`)
    return {
      name: category.name,
      max: category.maxScore,
      value: score
    }
  })

  console.log('雷达图完整数据:', radarData)

  // 确保至少有一些数据
  if (!radarData || radarData.length === 0) {
    console.log('雷达图数据为空，使用默认数据')
    radarData = [
      { name: '自我照顾', max: 42, value: 0 },
      { name: '括约肌控制', max: 14, value: 0 },
      { name: '转移', max: 21, value: 0 },
      { name: '行走', max: 14, value: 0 },
      { name: '交流', max: 14, value: 0 },
      { name: '社会认知', max: 21, value: 0 }
    ]
  }

  return {
    title: {
      text: 'WeeFIM能力评估雷达图',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ${params.value}/${params.max}分`
      }
    },
    legend: {
      data: ['当前能力'],
      bottom: 10
    },
    radar: {
      indicator: radarData,
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
        name: '当前能力',
        type: 'radar',
        data: [
          {
            value: radarData.map(item => item.value),
            name: '当前能力',
            itemStyle: {
              color: '#409EFF'
            },
            areaStyle: {
              color: 'rgba(64, 158, 255, 0.3)'
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
  } catch (error) {
    console.error('雷达图配置生成失败:', error)
    // 返回最基本的雷达图配置
    return {
      title: {
        text: 'WeeFIM能力评估雷达图',
        left: 'center'
      },
      radar: {
        indicator: [
          { name: '自我照顾', max: 42 },
          { name: '括约肌控制', max: 14 },
          { name: '转移', max: 21 },
          { name: '行走', max: 14 },
          { name: '交流', max: 14 },
          { name: '社会认知', max: 21 }
        ]
      },
      series: [{
        type: 'radar',
        data: [{
          value: [0, 0, 0, 0, 0, 0],
          name: '当前能力'
        }]
      }]
    }
  }
})

// 根据分数获取等级描述
const getScoreLevel = (score: number): string => {
  const levelMap: Record<number, string> = {
    7: '完全独立',
    6: '基本独立',
    5: '监督',
    4: '最小依赖',
    3: '中度依赖',
    2: '重度依赖',
    1: '完全依赖'
  }
  return levelMap[score] || '未知'
}

// 根据分数获取协助描述
const getScoreAssistance = (score: number): string => {
  const assistanceMap: Record<number, string> = {
    7: '完全独立，无需协助',
    6: '独立完成，需要辅助设备或额外时间',
    5: '需要口头提示或监督',
    4: '需要最小程度的身体协助',
    3: '需要中度的身体协助',
    2: '需要最大程度的身体协助',
    1: '完全依赖他人'
  }
  return assistanceMap[score] || '未知'
}

// 获取分数等级文本
const getScoreLevelText = (score: number) => {
  if (score >= 6) return '独立'
  if (score >= 4) return '部分独立'
  if (score >= 2) return '依赖'
  return '完全依赖'
}

// 获取分数标签类型
const getScoreTagType = (score: number) => {
  if (score >= 6) return 'success'
  if (score >= 4) return 'warning'
  if (score >= 2) return 'danger'
  return 'info'
}

// 获取得分分析
const getScoreAnalysis = () => {
  return [
    '在自我照顾方面表现较好，基本能够独立完成日常生活活动',
    '在括约肌控制方面达到基本独立水平',
    '转移能力需要进一步提升，建议加强平衡和力量训练',
    '行走能力接近独立水平，需要继续练习',
    '交流能力有待提高，建议进行言语治疗',
    '社会认知能力需要特别关注和支持'
  ]
}

// 获取短期目标
const getShortTermGoals = () => {
  return [
    '提高穿衣技能，达到完全独立水平',
    '改善转移能力，减少所需协助',
    '增强交流能力，提高表达和理解水平',
    '提升社会认知技能，改善社交互动'
  ]
}

// 获取长期目标
const getLongTermGoals = () => {
  return [
    '实现所有日常生活活动的完全独立',
    '提高学习和工作效率',
    '增强社会参与能力',
    '改善生活质量'
  ]
}

// 获取训练建议
const getTrainingSuggestions = () => {
  return [
    '制定个性化的康复训练计划，每周至少3次，每次30-45分钟',
    '采用任务导向的训练方法，结合日常生活活动进行练习',
    '使用辅助技术设备，提高独立性',
    '结合游戏化训练，增加训练的趣味性和参与度',
    '定期评估训练效果，及时调整训练方案'
  ]
}

// 获取环境改造建议
const getEnvironmentSuggestions = () => {
  return [
    '改造家庭环境，安装扶手和防滑设施',
    '调整家具高度，便于转移和活动',
    '使用适应性餐具，提高进食独立性',
    '创造良好的交流环境，减少干扰因素',
    '提供结构化的日常活动安排'
  ]
}

// 导出PDF - 使用统一导出方案（保留雷达图）
const exportPDF = async () => {
  // 检查数据是否已加载
  if (!reportData.value || !assessmentDetails.value || assessmentDetails.value.length === 0) {
    ElMessage.error('报告数据尚未加载完成，请稍后再试')
    return
  }

  const reportElement = document.getElementById('report-content')
  if (!reportElement) {
    ElMessage.error('找不到报告内容，请刷新页面后重试')
    return
  }

  try {
    // 显示使用说明
    await ElMessageBox.confirm(
      '将导出高质量PDF报告，保留雷达图等可视化元素。\n\n' +
      '特点：\n' +
      '• 保留原始页面样式和布局\n' +
      '• ECharts雷达图转图片展示\n' +
      '• 所见即所得，效果专业\n' +
      '• 需要允许浏览器弹出窗口',
      'PDF导出说明',
      {
        confirmButtonText: '继续导出',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true,
        center: true
      }
    )

    // 使用统一导出函数
    await exportReportToPDF(
      'report-content',
      `WeeFIM评估报告_${student.value?.name}_${new Date().toLocaleDateString()}`,
      'weefim' as const
    )

    ElMessage.success('PDF导出成功，请在打印对话框中另存为PDF')

  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('导出失败:', error)
      ElMessage.error('导出失败，请重试')
    }
  }
}

// 导出Word
const exportWord = async () => {
  try {
    const { exportWeeFIMToWord } = await import('@/utils/docxExporter')

    const reportContent = {
      student: {
        name: student.value?.name || '',
        gender: student.value?.gender || '未知',
        age: studentAge.value || 0,
        birthday: student.value?.birthday || ''
      },
      assessment: {
        id: assessId.value?.toString() || '',
        date: assessDate.value || new Date().toLocaleDateString(),
        total_score: reportData.value?.total_score || 0,
        motor_score: reportData.value?.motor_score || 0,
        cognitive_score: reportData.value?.cognitive_score || 0,
        level: getIndependenceLevelText(reportData.value?.level?.level)
      },
      categories: [
        { name: '自我照顾', score: getCategoryScore('selfcare'), maxScore: 42, items: getCategoryItems('selfcare').map(i => ({ ...i, level: getScoreLevel(i.score) })) },
        { name: '括约肌控制', score: getCategoryScore('sphincter'), maxScore: 14, items: getCategoryItems('sphincter').map(i => ({ ...i, level: getScoreLevel(i.score) })) },
        { name: '转移', score: getCategoryScore('transfer'), maxScore: 21, items: getCategoryItems('transfer').map(i => ({ ...i, level: getScoreLevel(i.score) })) },
        { name: '行走', score: getCategoryScore('locomotion'), maxScore: 14, items: getCategoryItems('locomotion').map(i => ({ ...i, level: getScoreLevel(i.score) })) },
        { name: '交流', score: getCategoryScore('communication'), maxScore: 14, items: getCategoryItems('communication').map(i => ({ ...i, level: getScoreLevel(i.score) })) },
        { name: '社会认知', score: getCategoryScore('social_cognition'), maxScore: 21, items: getCategoryItems('social_cognition').map(i => ({ ...i, level: getScoreLevel(i.score) })) }
      ],
      suggestions: {
        shortTerm: getShortTermGoals(),
        longTerm: getLongTermGoals(),
        training: getTrainingSuggestions(),
        environment: getEnvironmentSuggestions()
      }
    }

    await exportWeeFIMToWord(
      reportContent,
      `WeeFIM评估报告_${student.value?.name}_${new Date().toLocaleDateString()}`
    )
    ElMessage.success('Word导出成功')
  } catch (error) {
    console.error('导出Word失败:', error)
    ElMessage.error('Word导出失败，请重试')
  }
}

// 打印报告
const printReport = () => {
  window.print()
}

// 初始化
onMounted(async () => {
  // 获取学生信息
  await studentStore.loadStudents()

  if (!student.value) {
    ElMessage.error('学生信息不存在')
    router.push('/assessment')
    return
  }

  // 加载评估结果
  try {
    const api = new WeeFIMAPI()
    const assessment = await api.getAssessment(parseInt(assessId.value))

    if (!assessment) {
      ElMessage.error('评估记录不存在')
      router.push('/assessment')
      return
    }

    // 获取等级信息和建议
    const levelInfo = getWeeFIMLevelAndDescription(assessment.total_score)
    const recommendation = weefimRecommendations.find(r => r.level === levelInfo.level) || weefimRecommendations[0]

    // 加载评估详情
    const details = await api.getAssessmentDetails(parseInt(assessId.value))
    console.log('加载的原始评估详情:', details)

    // 重要：将评估详情赋值给 assessmentDetails，这样 answersMap 才能正确构建
    assessmentDetails.value = details

    console.log('assessmentDetails.value已更新:', assessmentDetails.value)
    console.log('answersMap computed值:', answersMap.value)

    // 处理返回的数据结构，适配模板
    reportData.value = {
      ...assessment,
      motor_score: assessment.adl_score,  // 运动功能分数 = ADL分数
      level: levelInfo,
      recommendation: recommendation
    }

    console.log('加载的评估数据:', reportData.value)
    console.log('最终的answersMap:', answersMap.value)
    console.log('answersMap中的键值对数量:', Object.keys(answersMap.value).length)
  } catch (error) {
    console.error('加载评估结果失败:', error)
    ElMessage.error('加载评估结果失败')
    router.push('/assessment')
  }
})

// 监听评估详情变化，确保雷达图更新
watch(assessmentDetails, (newDetails) => {
  console.log('评估详情已更新:', newDetails)
  if (newDetails && newDetails.length > 0) {
    console.log('评估详情已加载，雷达图将更新')
  }
}, { deep: true })
</script>

<style scoped>
.weefim-report {
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

.header-content h2 {
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

.report-title {
  text-align: center;
  margin-bottom: 40px;
}

.report-title h1 {
  font-size: 32px;
  color: #303133;
  margin: 0 0 10px 0;
}

.report-subtitle {
  font-size: 20px;
  color: #606266;
  margin: 0;
}

.student-info-card,
.result-overview-card,
.independence-card,
.radar-card,
.domains-card,
.chart-card,
.suggestions-card,
.professional-card {
  margin-bottom: 30px;
}

.student-info-card h3,
.result-overview-card h3,
.independence-card h3,
.radar-card h3,
.domains-card h3,
.chart-card h3,
.suggestions-card h3,
.professional-card h3 {
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

.overview-content {
  margin-top: 20px;
}

.score-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.score-icon {
  margin-right: 20px;
}

.score-title {
  font-size: 16px;
  color: #606266;
  margin-bottom: 5px;
}

.score-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.independence-content {
  margin-top: 20px;
}

.level-display {
  text-align: center;
  margin-bottom: 30px;
}

.level-badge {
  display: inline-block;
  padding: 30px 60px;
  border-radius: 12px;
  text-align: center;
}

.independence-level-1 { background: #f56c6c; color: white; }
.independence-level-2 { background: #e65d6e; color: white; }
.independence-level-3 { background: #e6a23c; color: white; }
.independence-level-4 { background: #eebc54; color: white; }
.independence-level-5 { background: #b3e19d; color: white; }
.independence-level-6 { background: #67c23a; color: white; }
.independence-level-7 { background: #13ce66; color: white; }

.level-text {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 10px;
}

.level-desc {
  font-size: 16px;
  opacity: 0.9;
}

.level-explanation h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.level-explanation p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.domains-content {
  margin-top: 20px;
}

.category-section {
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 1px solid #ebeef5;
}

.category-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.category-title {
  font-size: 20px;
  color: #303133;
  margin: 0 0 15px 0;
}

.category-score {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.score-label {
  margin-right: 10px;
  color: #606266;
}

.score-value {
  margin-right: 20px;
  font-weight: bold;
  color: #303133;
}

.category-items {
  margin-top: 15px;
}

.score-number {
  font-weight: bold;
  color: #409eff;
}

.chart-content {
  display: flex;
  gap: 40px;
  margin-top: 20px;
}

.chart-container {
  flex: 1;
}

.radar-chart {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
}

.score-analysis {
  flex: 1;
}

.score-analysis h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.score-analysis ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  line-height: 1.8;
}

.suggestions-content {
  margin-top: 20px;
}

.radar-content {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.radar-chart {
  max-width: 500px;
  margin: 0 auto;
}

.suggestion-section {
  margin-bottom: 25px;
}

.suggestion-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.suggestion-section ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  line-height: 1.6;
}

.suggestion-section li {
  margin-bottom: 5px;
}

.professional-content {
  margin-top: 20px;
}

.referral-suggestions,
.frequency-suggestion {
  margin-bottom: 20px;
}

.referral-suggestions h4,
.frequency-suggestion h4 {
  margin: 0 0 15px 0;
  color: #303133;
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

  .weefim-report {
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

<style>
/* PDF导出对话框样式 */
.pdf-export-dialog .el-message-box__message {
  white-space: pre-line;
  line-height: 1.8;
}

.pdf-export-dialog .el-message-box__content {
  padding: 20px 0;
}
</style>