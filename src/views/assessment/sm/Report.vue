<template>
  <div class="sm-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <h2>S-M量表评估报告</h2>
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
        <h1>婴儿-初中生社会生活能力量表评估报告</h1>
        <p class="report-subtitle">(S-M量表)</p>
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

      <!-- 评估结果 -->
      <el-card class="result-card">
        <template #header>
          <h3>评估结果</h3>
        </template>
        <div class="result-summary">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="score-item">
                <div class="score-label">粗分</div>
                <div class="score-value">{{ correctRawScore }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="score-item">
                <div class="score-label">标准分</div>
                <div class="score-value">{{ reportData?.sq_score }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="score-item">
                <div class="score-label">评定等级</div>
                <div class="score-value level-badge" :class="getLevelClass(reportData?.level)">
                  {{ getLevelText(reportData?.level) }}
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div class="result-description">
          <h4>结果解释：</h4>
          <p>{{ getResultDescription(reportData?.level) }}</p>
        </div>
      </el-card>

      <!-- 各维度得分雷达图 -->
      <el-card class="radar-card">
        <template #header>
          <h3>能力雷达图</h3>
        </template>
        <div class="radar-content">
          <v-chart
            class="radar-chart"
            :option="radarChartOption"
            :style="{ height: '400px', width: '100%' }"
            autoresize
            :loading="!reportData || !reportData.answers"
          />
        </div>
      </el-card>

      <!-- 各维度得分 -->
      <el-card class="dimensions-card">
        <template #header>
          <h3>各维度得分情况</h3>
        </template>
        <div class="dimensions-content">
          <el-table :data="dimensionScores" style="width: 100%">
            <el-table-column prop="dimension" label="评估维度" width="180" />
            <el-table-column prop="passCount" label="通过项目数" width="120" />
            <el-table-column prop="totalCount" label="总项目数" width="120" />
            <el-table-column prop="percentage" label="通过率">
              <template #default="scope">
                <el-progress
                  :percentage="scope.row.percentage"
                  :color="getProgressColor(scope.row.percentage)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="表现描述" />
          </el-table>
        </div>
      </el-card>

      <!-- 详细评估结果 -->
      <el-card class="details-card">
        <template #header>
          <h3>详细评估结果</h3>
        </template>
        <div class="question-details">
          <el-collapse v-model="activeCollapse">
            <el-collapse-item
              v-for="dimension in dimensions"
              :key="dimension.key"
              :title="dimension.name"
              :name="dimension.key"
            >
              <div class="dimension-questions">
                <el-table
                  :data="getQuestionsByDimension(dimension.key)"
                  style="width: 100%"
                  size="small"
                >
                  <el-table-column prop="id" label="题号" width="80" />
                  <el-table-column prop="title" label="项目内容" show-overflow-tooltip />
                  <el-table-column prop="result" label="结果" width="100">
                    <template #default="scope">
                      <el-tag
                        :type="scope.row.result === 1 ? 'success' : 'danger'"
                        size="small"
                      >
                        {{ scope.row.result === 1 ? '通过' : '不通过' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-card>

      <!-- 评定建议 -->
      <el-card class="suggestions-card">
        <template #header>
          <h3>评定建议</h3>
        </template>
        <div class="suggestions-content">
          <div class="suggestion-item">
            <h4>训练重点：</h4>
            <p>{{ getLevelInfo(reportData?.level)?.trainingFocus || '暂无建议' }}</p>
          </div>
          <div class="suggestion-item">
            <h4>训练建议：</h4>
            <ul>
              <li v-for="(suggestion, index) in getLevelSuggestions(reportData?.level)" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
          <div class="suggestion-item">
            <h4>家庭训练指导：</h4>
            <ul>
              <li v-for="(guidance, index) in getLevelGuidance(reportData?.level)" :key="index">
                {{ guidance }}
              </li>
            </ul>
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
import { Download, Document, Printer } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import { TitleComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useStudentStore } from '@/stores/student'
import { SMAssessmentAPI } from '@/database/api'
import { SMReportTemplate } from '@/utils/reportTemplates'

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

// 响应式量表数据
const smQuestions = ref<any[]>([])

// 报告数据
const reportData = ref<any>(null)
const assessId = ref(route.query.assessId as string)
const studentId = ref(route.query.studentId as string)

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

// 监听smQuestions和reportData的变化，确保题目信息正确显示
watch([smQuestions, reportData], () => {
  if (smQuestions.value.length > 0 && reportData.value?.answers) {
    console.log('题目数据或报告数据更新，触发重新计算')
    // 触发计算属性的重新计算
    dimensions.value.forEach(dim => {
      const questions = getQuestionsByDimension(dim.key)
      console.log(`维度 ${dim.key} 的题目数量:`, questions.length)
    })
  }
}, { immediate: true })

// 评估维度 - 使用中文名称作为key，与sm-questions.ts保持一致
const dimensions = ref([
  { key: '交往', name: '交往' },
  { key: '作业', name: '作业' },
  { key: '运动能力', name: '运动能力' },
  { key: '独立生活能力', name: '独立生活能力' },
  { key: '自我管理', name: '自我管理' },
  { key: '集体活动', name: '集体活动' }
])

// 当前展开的折叠面板
const activeCollapse = ref(['交往'])

// 计算正确的粗分 - 优先使用数据库保存的分数
const correctRawScore = computed(() => {
  console.log('=== 计算correctRawScore ===')
  console.log('reportData.value存在:', !!reportData.value)

  // 优先使用数据库保存的 raw_score（由 SMDriver 正确计算）
  if (reportData.value?.raw_score !== undefined) {
    console.log('使用数据库raw_score:', reportData.value.raw_score)
    return reportData.value.raw_score
  }

  // 如果没有 raw_score，尝试重新计算
  if (!reportData.value?.answers || !reportData.value?.age_stage) {
    console.log('缺少数据，返回0')
    return 0
  }

  console.log('尝试重新计算粗分...')
  const calculatedScore = calculateSMRawScore(reportData.value.answers, reportData.value.age_stage)
  console.log('重新计算的粗分:', calculatedScore)
  console.log('========================')
  return calculatedScore
})

// 计算S-M量表粗分（根据量表官方规则）- 与Assessment.vue保持一致
const calculateSMRawScore = (answers: Record<number, number>, ageStage: number): number => {
  if (!smQuestions.value) return 0

  console.log('S-M报告粗分计算开始 - ageStage:', ageStage)
  console.log('答案详情:', answers)

  // 各年龄阶段的基础分（根据S-M量表标准）
  const stageBaseScores: Record<number, number> = {
    1: 0,    // I.6个月-1岁11个月: 基础分0
    2: 19,   // II.2岁-3岁5个月: 基础分19
    3: 41,   // III.3岁6个月-4岁11个月: 基础分41
    4: 63,   // IV.5岁-6岁5个月: 基础分63
    5: 80,   // V.6岁6个月-8岁5个月: 基础分80
    6: 96,   // VI.8岁6个月-10岁5个月: 基础分96
    7: 113   // VII.10岁6个月以上: 基础分113
  }

  const baseScore = stageBaseScores[ageStage] || 0
  console.log('年龄阶段', ageStage, '的基础分:', baseScore)

  // 获取该年龄阶段的起始题目ID
  const stageQuestions = smQuestions.value.filter(q => q.age_stage === ageStage)
  if (stageQuestions.length === 0) return baseScore

  const sortedStageQuestions = stageQuestions.sort((a, b) => a.id - b.id)
  const startId = sortedStageQuestions[0].id

  console.log('该阶段起始题目ID:', startId)
  console.log('该阶段题目数量:', sortedStageQuestions.length)
  console.log('该阶段题目ID:', sortedStageQuestions.map(q => q.id))

  // 获取所有132道题目，按ID排序
  const allQuestions = smQuestions.value.sort((a, b) => a.id - b.id)

  // 应用S-M官方评估规则：
  // 1. 根据年龄确定起始阶段，从该阶段第一题开始评估
  // 2. 连续10项均能通过 → 认为前面所有项目都通过
  // 3. 继续向后提问（可跨越年龄阶段）→ 直至连续10项不能通过
  // 4. 连续10项不能通过 → 认为这以后的项目均不能通过，检查结束
  // 5. 最终得分 = 基础分 + 实际通过的项目总数

  // 找到起始题目在所有题目中的索引
  const startIndex = allQuestions.findIndex(q => q.id === startId)
  if (startIndex === -1) return baseScore

  // 检查是否有连续10项通过
  let hasTenConsecutivePass = false
  let consecutiveCount = 0
  let firstConsecutiveTenStartIndex = -1  // 连续10项通过的起始位置

  // 从起始题开始检查
  for (let i = startIndex; i < allQuestions.length; i++) {
    const questionId = allQuestions[i].id

    // 只检查已评估的题目
    if (!answers.hasOwnProperty(questionId)) break

    const answer = answers[questionId]

    if (answer === 1) {
      if (consecutiveCount === 0) {
        firstConsecutiveTenStartIndex = i  // 记录连续通过的起始位置
      }
      consecutiveCount++
      if (consecutiveCount >= 10) {
        hasTenConsecutivePass = true
        console.log('发现连续10项通过，从题目', allQuestions[firstConsecutiveTenStartIndex].id, '开始')
        break
      }
    } else {
      consecutiveCount = 0
      firstConsecutiveTenStartIndex = -1
    }
  }

  let finalPassedCount = 0

  if (hasTenConsecutivePass) {
    // 有连续10项通过 - 应用S-M规则
    console.log('应用S-M规则：发现连续10项通过')
    console.log('连续10项通过起始题目ID:', allQuestions[firstConsecutiveTenStartIndex].id)

    // S-M规则：连续10项通过，前面所有项目视为通过
    // 所以从第一个评估的题目到连续10项通过结束，所有题目都算通过
    finalPassedCount = 0

    // 1. 计算从起始题目到连续10项通过起始位置之间的通过题目数
    for (let i = startIndex; i < firstConsecutiveTenStartIndex; i++) {
      const questionId = allQuestions[i].id
      if (answers.hasOwnProperty(questionId) && answers[questionId] === 1) {
        finalPassedCount++
      }
    }

    // 2. 加上连续10项通过的题目数
    finalPassedCount += 10

    // 3. 计算连续10项通过之后的所有通过题目
    let lastAssessedIndex = -1
    for (let i = firstConsecutiveTenStartIndex + 10; i < allQuestions.length; i++) {
      const questionId = allQuestions[i].id
      if (answers.hasOwnProperty(questionId)) {
        lastAssessedIndex = i
        if (answers[questionId] === 1) {
          finalPassedCount++
        }
      } else {
        break  // 遇到未评估的题目，停止计算
      }
    }

    console.log('S-M规则计算结果：')
    console.log('- 起始题目到连续10项开始前:', firstConsecutiveTenStartIndex - startIndex, '题')
    console.log('- 连续10项通过:', 10, '题')
    console.log('- 连续10项后的通过题目:', finalPassedCount - 10 - (firstConsecutiveTenStartIndex - startIndex), '题')
    console.log('- 总通过题目数:', finalPassedCount)

  } else {
    // 没有连续10项通过，只计算实际通过的题目
    console.log('没有连续10项通过，只计算实际通过题目')
    finalPassedCount = 0

    for (let i = startIndex; i < allQuestions.length; i++) {
      const questionId = allQuestions[i].id
      if (answers.hasOwnProperty(questionId) && answers[questionId] === 1) {
        finalPassedCount++
      }
    }
  }

  const finalRawScore = baseScore + finalPassedCount
  console.log('最终通过题目数:', finalPassedCount)
  console.log('最终S-M粗分:', finalRawScore, '(基础分:', baseScore, '+ 通过数:', finalPassedCount, ')')

  return finalRawScore
}

// 各维度得分
const dimensionScores = computed(() => {
  console.log('=== 计算维度得分 ===')
  console.log('reportData.value存在:', !!reportData.value)
  console.log('smQuestions.value存在:', !!smQuestions.value)

  // 根据实际答案计算各维度得分
  if (!reportData.value?.answers || !smQuestions.value) {
    console.log('缺少数据，返回默认值')
    return dimensions.value.map(dim => ({
      dimension: dim.name,
      passCount: 0,
      totalCount: 0,
      percentage: 0
    }))
  }

  console.log('开始计算各维度得分...')
  const scores = dimensions.value.map(dim => {
    // 获取答案中该维度的所有题目（跨阶段）
    const answeredQuestions = Object.keys(reportData.value.answers)
      .map(id => parseInt(id))
      .filter(id => {
        const question = smQuestions.value.find(q => q.id === id)
        return question && question.dimension === dim.name
      })

    console.log(`维度 ${dim.name}: 找到 ${answeredQuestions.length} 道已评估题目`)

    const passCount = answeredQuestions.reduce((count, questionId) => {
      return count + (reportData.value.answers[questionId] || 0)
    }, 0)

    const totalCount = answeredQuestions.length
    const percentage = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0

    console.log(`  - 通过题目数: ${passCount}`)
    console.log(`  - 总题目数: ${totalCount}`)
    console.log(`  - 通过率: ${percentage}%`)

    const result = {
      dimension: dim.name,
      passCount,
      totalCount,
      percentage
    }
    console.log(`  - 结果:`, result)
    return result
  })

  console.log('维度得分计算完成:', scores)
  return scores
})

// 雷达图配置
const radarChartOption = computed(() => {
  try {
    console.log('开始计算S-M雷达图配置...')
    console.log('reportData.value存在:', !!reportData.value)
    console.log('smQuestions.value存在:', !!smQuestions.value)

    // 如果没有评估数据，使用默认数据渲染
    let radarData = dimensions.value.map(dim => {
      let score = 0
      let maxScore = 0

      if (reportData.value?.answers && smQuestions.value) {
        // 获取该维度的所有题目
        const dimensionQuestions = smQuestions.value.filter(q => q.dimension === dim.name)
        maxScore = dimensionQuestions.length

        // 计算实际得分
        score = dimensionQuestions.reduce((count, question) => {
          if (reportData.value.answers[question.id] === 1) {
            return count + 1
          }
          return count
        }, 0)
      } else {
        // 使用dimensionScores计算的数据
        const dimScore = dimensionScores.value.find(d => d.dimension === dim.name)
        score = dimScore?.passCount || 0
        maxScore = dimScore?.totalCount || 0
      }

      console.log(`雷达图数据 - ${dim.name}: ${score}/${maxScore}`)
      return {
        name: dim.name,
        max: maxScore || 22,  // 默认最大值
        value: score
      }
    })

    console.log('雷达图完整数据:', radarData)

    // 确保至少有一些数据
    if (!radarData || radarData.length === 0) {
      console.log('雷达图数据为空，使用默认数据')
      radarData = [
        { name: '交往', max: 22, value: 0 },
        { name: '作业', max: 22, value: 0 },
        { name: '运动能力', max: 22, value: 0 },
        { name: '独立生活能力', max: 22, value: 0 },
        { name: '自我管理', max: 22, value: 0 },
        { name: '集体活动', max: 22, value: 0 }
      ]
    }

    return {
      title: {
        text: 'S-M量表能力评估雷达图',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const indicator = radarData[params.dataIndex]
          return `${indicator.name}: ${indicator.value}/${indicator.max}题 (${Math.round((indicator.value / indicator.max) * 100)}%)`
        }
      },
      legend: {
        data: ['通过项目'],
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
          name: '通过项目',
          type: 'radar',
          data: [
            {
              value: radarData.map(item => (item.value / item.max) * 100),  // 转换为百分比
              name: '通过项目',
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
        text: 'S-M量表能力评估雷达图',
        left: 'center'
      },
      radar: {
        indicator: [
          { name: '交往', max: 22 },
          { name: '作业', max: 22 },
          { name: '运动能力', max: 22 },
          { name: '独立生活能力', max: 22 },
          { name: '自我管理', max: 22 },
          { name: '集体活动', max: 22 }
        ]
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [0, 0, 0, 0, 0, 0],
              name: '通过项目'
            }
          ]
        }
      ]
    }
  }
})

// 获取等级文本
const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    'extremely_severe': '极重度',
    'severe': '重度',
    'moderate': '中度',
    'mild': '轻度',
    'borderline': '边缘',
    'normal': '正常',
    'good': '良好',
    'excellent': '优秀',
    'outstanding': '非常优秀'
  }
  return levelMap[level] || level
}

// 获取等级样式类
const getLevelClass = (level: string) => {
  const classMap: Record<string, string> = {
    'extremely_severe': 'level-extremely-severe',
    'severe': 'level-severe',
    'moderate': 'level-moderate',
    'mild': 'level-mild',
    'borderline': 'level-borderline',
    'normal': 'level-normal',
    'good': 'level-good',
    'excellent': 'level-excellent',
    'outstanding': 'level-outstanding'
  }
  return classMap[level] || ''
}

// 获取结果描述
const getResultDescription = (level: string) => {
  // 使用SMReportTemplate获取统一的结果描述
  const levelInfo = getLevelInfo(level)
  if (!levelInfo || !levelInfo.resultDescription) {
    return '暂无描述'
  }

  return levelInfo.resultDescription
}

// 获取训练重点
const getTrainingFocus = (level: string) => {
  const focusMap: Record<string, string> = {
    'extremely_severe': '重点培养基本的自我照料能力，如进食、如厕等。',
    'severe': '重点提升基本生活技能和简单的社交互动。',
    'moderate': '重点加强日常生活自理能力和基础的社交技能。',
    'mild': '重点提升复杂的生活技能和社交适应能力。',
    'borderline': '重点巩固现有能力，提升独立完成任务的信心。',
    'normal': '维持和提升现有的生活技能，培养更高阶的能力。',
    'good': '鼓励探索新技能，培养领导力和创造力。',
    'excellent': '提供挑战性任务，培养综合能力和创新思维。',
    'outstanding': '提供高级挑战，培养专业技能和社会责任感。'
  }
  return focusMap[level] || '暂无建议'
}

// 获取训练建议
const getTrainingSuggestions = (level: string) => {
  const suggestions: Record<string, string[]> = {
    'extremely_severe': [
      '采用任务分解法，将复杂技能分解为简单步骤',
      '使用视觉提示和物理辅助帮助完成动作',
      '建立固定的日常生活规律',
      '及时奖励和强化积极行为'
    ],
    'severe': [
      '继续使用任务分解和视觉支持',
      '逐步减少物理辅助，增加口头提示',
      '在安全环境中练习生活技能',
      '培养简单的沟通技能'
    ],
    'moderate': [
      '练习多步骤的生活技能',
      '培养时间管理和组织能力',
      '参与小组活动，提升社交技能',
      '学习解决简单问题'
    ],
    'mild': [
      '学习独立完成复杂的生活任务',
      '培养批判性思维和决策能力',
      '参与社区活动，增强社会适应',
      '学习情绪管理和压力应对'
    ],
    'borderline': [
      '在熟悉环境中巩固技能',
      '逐步尝试在新环境中应用技能',
      '培养主动性和责任感',
      '增强自信心和独立性'
    ],
    'normal': [
      '学习高级生活技能',
      '培养兴趣爱好和特长',
      '参与志愿服务，培养社会责任感',
      '学习职业规划技能'
    ],
    'good': [
      '挑战更复杂的任务',
      '培养领导力和团队合作能力',
      '学习创新思维和问题解决',
      '参与竞技活动'
    ],
    'excellent': [
      '设定个人成长目标',
      '学习专业技能',
      '参与创新项目',
      '培养国际化视野'
    ],
    'outstanding': [
      '制定长期发展规划',
      '参与社会实践和研究',
      '培养战略思维',
      '追求卓越成就'
    ]
  }
  return suggestions[level] || ['暂无具体建议']
}

// 获取家庭训练指导
const getFamilyGuidance = (level: string) => {
  const guidance: Record<string, string[]> = {
    'extremely_severe': [
      '创造安全、有序的家庭环境',
      '建立可预测的日常作息',
      '使用清晰的指令和视觉提示',
      '保持耐心和一致性'
    ],
    'severe': [
      '继续提供结构化的环境',
      '鼓励参与简单的家务活动',
      '使用正向行为支持策略',
      '与专业团队保持密切沟通'
    ],
    'moderate': [
      '逐步增加责任和期望',
      '提供选择的机会',
      '鼓励独立完成日常任务',
      '庆祝每一个进步'
    ],
    'mild': [
      '培养良好的生活习惯',
      '鼓励参与家庭决策',
      '提供适当的挑战',
      '培养兴趣爱好'
    ],
    'borderline': [
      '给予更多的自主权',
      '鼓励尝试新事物',
      '提供情感支持',
      '建立积极的亲子关系'
    ],
    'normal': [
      '维持良好的沟通',
      '支持个人发展',
      '培养责任感',
      '鼓励独立思考'
    ],
    'good': [
      '尊重个人选择',
      '提供发展资源',
      '培养领导力',
      '鼓励追求卓越'
    ],
    'excellent': [
      '提供挑战性机会',
      '支持创新尝试',
      '培养全球视野',
      '鼓励社会责任'
    ],
    'outstanding': [
      '成为榜样和导师',
      '提供高级资源',
      '支持实现宏伟目标',
      '培养终身学习习惯'
    ]
  }
  return guidance[level] || ['暂无具体指导']
}

// 获取等级信息（使用模板）
const getLevelInfo = (level: string) => {
  // 将中文等级转换为英文键名
  const levelMap: Record<string, string> = {
    '极重度': 'extremely_severe',
    '重度': 'severe',
    '中度': 'moderate',
    '轻度': 'mild',
    '边缘': 'borderline',
    '正常': 'normal',
    '良好': 'good',
    '优秀': 'excellent',
    '非常优秀': 'outstanding'
  }

  const levelKey = levelMap[level] || level
  return SMReportTemplate.levels[levelKey as keyof typeof SMReportTemplate.levels]
}

// 获取训练建议（使用模板）
const getLevelSuggestions = (level: string) => {
  // 将中文等级转换为英文键名
  const levelMap: Record<string, string> = {
    '极重度': 'extremely_severe',
    '重度': 'severe',
    '中度': 'moderate',
    '轻度': 'mild',
    '边缘': 'borderline',
    '正常': 'normal',
    '良好': 'good',
    '优秀': 'excellent',
    '非常优秀': 'outstanding'
  }

  const levelKey = levelMap[level] || level
  return SMReportTemplate.trainingSuggestions[levelKey as keyof typeof SMReportTemplate.trainingSuggestions] || []
}

// 获取家庭训练指导（使用模板）
const getLevelGuidance = (level: string) => {
  // 将中文等级转换为英文键名
  const levelMap: Record<string, string> = {
    '极重度': 'extremely_severe',
    '重度': 'severe',
    '中度': 'moderate',
    '轻度': 'mild',
    '边缘': 'borderline',
    '正常': 'normal',
    '良好': 'good',
    '优秀': 'excellent',
    '非常优秀': 'outstanding'
  }

  const levelKey = levelMap[level] || level
  return SMReportTemplate.familyGuidance[levelKey as keyof typeof SMReportTemplate.familyGuidance] || []
}

// 获取进度条颜色
const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#e6a23c'
  return '#f56c6c'
}

// 根据维度获取题目
const getQuestionsByDimension = (dimension: string) => {
  if (!reportData.value?.answers || !smQuestions.value) {
    return []
  }

  console.log('获取维度题目 - 维度:', dimension, 'smQuestions.value存在:', !!smQuestions.value)

  // 根据答案中的题目ID获取
  const answers = reportData.value.answers

  // 首先尝试从smQuestions中获取该维度的所有题目
  const dimensionQuestions = smQuestions.value.filter(q => q.dimension === dimension)
  console.log('找到维度', dimension, '的题目数量:', dimensionQuestions.length)

  const result = Object.entries(answers)
    .map(([questionId, score]) => {
      const id = parseInt(questionId)
      // 从smQuestions中查找对应的题目
      const question = smQuestions.value.find(q => q.id === id)

      // 只返回匹配当前维度的题目
      if (question && question.dimension === dimension) {
        return {
          id: id,
          title: question.title,
          result: score
        }
      }
      return null
    })
    .filter(item => item !== null) // 过滤掉null值
    .sort((a, b) => a.id - b.id)

  console.log('维度', dimension, '的题目结果:', result)
  console.log('题目示例:', result[0])

  return result
}

// 导出PDF - 使用浏览器打印功能
const exportPDF = async () => {
  const reportElement = document.getElementById('report-content')
  if (!reportElement) {
    ElMessage.error('找不到报告内容，请刷新页面后重试')
    return
  }

  try {
    // 显示使用说明
    const result = await ElMessageBox.confirm(
      '将打开新的打印窗口，请按以下步骤操作：\n\n' +
      '1. 在新窗口中，使用浏览器的打印功能（Ctrl+P）\n' +
      '2. 选择"目标打印机"为"另存为PDF"或"Microsoft Print to PDF"\n' +
      '3. 调整页面设置（建议选择A4纸张）\n' +
      '4. 点击"保存"按钮\n\n' +
      '注意：如果浏览器阻止了弹窗，请允许此网站的弹窗。',
      'PDF导出说明',
      {
        confirmButtonText: '我知道了',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true,
        center: true,
        customClass: 'pdf-export-dialog'
      }
    )

    // 使用新的打印方案
    const { exportToPDFSimple } = await import('@/utils/printHelper')
    await exportToPDFSimple(
      'report-content',
      `S-M评估报告_${student.value?.name}_${new Date().toLocaleDateString()}`
    )

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
    const { exportSMToWord } = await import('@/utils/docxExporter')
    const { SMReportTemplate } = await import('@/utils/reportTemplates')

    // 获取等级信息
    const levelMap: Record<string, string> = {
      '极重度': 'extremely_severe',
      '重度': 'severe',
      '中度': 'moderate',
      '轻度': 'mild',
      '边缘': 'borderline',
      '正常': 'normal',
      '良好': 'good',
      '优秀': 'excellent',
      '非常优秀': 'outstanding'
    }
    const levelKey = levelMap[reportData.value?.level] || 'normal'

    const reportContent = {
      student: {
        name: student.value?.name || '',
        gender: student.value?.gender || '未知',
        age: studentAge.value,
        birthday: student.value?.birthday || ''
      },
      assessment: {
        id: assessId.value?.toString() || '',
        date: assessDate.value,
        raw_score: correctRawScore.value,
        sq_score: reportData.value?.sq_score || 0,
        level: levelKey,
        age_stage: reportData.value?.age_stage?.toString() || ''
      },
      dimensions: {
        communication: { pass: dimensionScores.value[0]?.passCount || 0, total: dimensionScores.value[0]?.totalCount || 0 },
        work: { pass: dimensionScores.value[1]?.passCount || 0, total: dimensionScores.value[1]?.totalCount || 0 },
        movement: { pass: dimensionScores.value[2]?.passCount || 0, total: dimensionScores.value[2]?.totalCount || 0 },
        independent_life: { pass: dimensionScores.value[3]?.passCount || 0, total: dimensionScores.value[3]?.totalCount || 0 },
        self_management: { pass: dimensionScores.value[4]?.passCount || 0, total: dimensionScores.value[4]?.totalCount || 0 },
        group_activity: { pass: dimensionScores.value[5]?.passCount || 0, total: dimensionScores.value[5]?.totalCount || 0 }
      },
      suggestions: SMReportTemplate.trainingSuggestions[levelKey as keyof typeof SMReportTemplate.trainingSuggestions] || [],
      guidance: SMReportTemplate.familyGuidance[levelKey as keyof typeof SMReportTemplate.familyGuidance] || []
    }

    await exportSMToWord(
      reportContent,
      `S-M评估报告_${student.value?.name}_${new Date().toLocaleDateString()}`
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
  // 动态导入量表数据
  try {
    const smQuestionsModule = await import('@/database/sm-questions')
    smQuestions.value = smQuestionsModule.smQuestions
    console.log('S-M题目数据加载成功，总数:', smQuestions.value.length)
    console.log('第七阶段题目示例:', smQuestions.value.filter(q => q.age_stage === 7).slice(0, 3))
  } catch (error) {
    console.error('加载量表数据失败:', error)
    ElMessage.error('加载量表数据失败')
    router.push('/assessment')
    return
  }

  // 获取学生信息
  await studentStore.loadStudents()

  if (!student.value) {
    ElMessage.error('学生信息不存在')
    router.push('/assessment')
    return
  }

  // 加载评估结果
  try {
    if (assessId.value) {
      // 使用API获取评估记录
      const api = new SMAssessmentAPI()
      const assessment = await api.getAssessment(parseInt(assessId.value))

      if (!assessment) {
        ElMessage.error('评估记录不存在')
        router.push('/assessment')
        return
      }

      // 获取评估详情
      const details = await api.getAssessmentDetails(parseInt(assessId.value))

      // 构建answers对象
      const answers: Record<number, number> = {}
      details.forEach(detail => {
        answers[detail.question_id] = parseInt(detail.score) || 0
      })

      console.log('构建的answers对象:', answers)
      console.log('answers的键值对数量:', Object.keys(answers).length)

      // 设置报告数据
      reportData.value = {
        ...assessment,
        answers: answers
      }

      console.log('从数据库加载的S-M评估数据:', reportData.value)
      console.log('answers字段类型:', typeof reportData.value.answers)
      console.log('answers字段内容:', reportData.value.answers)
      console.log('level字段:', reportData.value.level)
      console.log('sq_score字段:', reportData.value.sq_score)
    } else {
      ElMessage.error('评估ID缺失')
      router.push('/assessment')
      return
    }
  } catch (error) {
    console.error('加载评估结果失败:', error)
    ElMessage.error('加载评估结果失败')
    router.push('/assessment')
  }
})
</script>

<style scoped>
.sm-report {
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
.result-card,
.radar-card,
.dimensions-card,
.details-card,
.suggestions-card {
  margin-bottom: 30px;
}

.student-info-card h3,
.result-card h3,
.radar-card h3,
.dimensions-card h3,
.details-card h3,
.suggestions-card h3 {
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

.level-badge {
  padding: 10px 20px;
  border-radius: 20px;
  color: white;
}

.level-extremely-severe { background: #f56c6c; }
.level-severe { background: #e65d6e; }
.level-moderate { background: #e6a23c; }
.level-mild { background: #eebc54; color: #333; }
.level-borderline { background: #f1e05a; color: #333; }
.level-normal { background: #b3e19d; color: #333; }
.level-good { background: #67c23a; }
.level-excellent { background: #30b08f; }
.level-outstanding { background: #13ce66; }

.result-description h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.result-description p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.radar-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.radar-chart {
  min-height: 400px;
}

.dimensions-content {
  margin-top: 20px;
}

.question-details {
  margin-top: 20px;
}

.dimension-questions {
  margin-top: 15px;
}

.suggestions-content {
  margin-top: 20px;
}

.suggestion-item {
  margin-bottom: 25px;
}

.suggestion-item h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.suggestion-item p,
.suggestion-item ul {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.suggestion-item ul {
  padding-left: 20px;
}

.suggestion-item li {
  margin-bottom: 5px;
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

/* PDF导出样式 */
.pdf-exporting {
  position: relative !important;
  z-index: 1 !important;
  background: white !important;
}

.pdf-exporting .el-card {
  break-inside: avoid;
  page-break-inside: avoid;
}

.pdf-exporting .radar-chart {
  break-inside: avoid;
  page-break-inside: avoid;
  position: relative !important;
}

/* 打印样式 */
@media print {
  .report-header {
    display: none;
  }

  .sm-report {
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