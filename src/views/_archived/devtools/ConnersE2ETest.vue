<template>
  <div class="conners-e2e-test">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span>🔬 Conners PSQ 端到端验证测试</span>
          <el-tag type="info">Phase 4 验收</el-tag>
        </div>
      </template>
      <el-alert
        title="验证目标"
        type="info"
        :closable="false"
        show-icon
      >
        <p>1. 创建 8 岁男学生测试账号</p>
        <p>2. 模拟填写 48 道题目</p>
        <p>3. 验证 T 分计算公式: T = 50 + 10 × (Raw - Mean) / SD</p>
        <p>4. 验证数据库保存和报告页面跳转</p>
      </el-alert>
    </el-card>

    <!-- 测试控制面板 -->
    <el-card class="control-panel">
      <template #header>
        <span>测试控制</span>
      </template>
      <div class="test-controls">
        <el-button
          type="primary"
          @click="runFullTest"
          :loading="testing"
          size="large"
        >
          🚀 执行完整验证测试
        </el-button>
        <el-button
          type="success"
          @click="runScoreCalculationOnly"
          :disabled="testing"
        >
          📊 仅测试算分逻辑
        </el-button>
        <el-button
          type="warning"
          @click="clearTestStudent"
          :disabled="testing"
        >
          🗑️ 清理测试数据
        </el-button>
      </div>
    </el-card>

    <!-- 测试学生信息 -->
    <el-card v-if="testStudent" class="student-card">
      <template #header>
        <span>👤 测试学生信息</span>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="姓名">{{ testStudent.name }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ testStudent.gender }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ testStudent.ageMonths }} 个月 ({{ Math.floor(testStudent.ageMonths / 12) }} 岁)</el-descriptions-item>
        <el-descriptions-item label="出生日期">{{ testStudent.birthday }}</el-descriptions-item>
        <el-descriptions-item label="学生ID">{{ testStudent.id }}</el-descriptions-item>
        <el-descriptions-item label="年龄段">{{ testStudent.ageGroup }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 常模数据展示 -->
    <el-card v-if="normsData" class="norms-card">
      <template #header>
        <span>📋 常模数据 (男, 6-8岁, PSQ)</span>
      </template>
      <el-table :data="normsData" border size="small">
        <el-table-column prop="dimension" label="维度" width="150" />
        <el-table-column prop="mean" label="均值 (Mean)" width="120" />
        <el-table-column prop="sd" label="标准差 (SD)" width="120" />
      </el-table>
    </el-card>

    <!-- 模拟答案配置 -->
    <el-card class="answers-config-card">
      <template #header>
        <span>📝 模拟答案配置</span>
      </template>
      <el-form :inline="true">
        <el-form-item label="答案模式">
          <el-select v-model="answerMode" style="width: 200px">
            <el-option label="随机答案" value="random" />
            <el-option label="全选A (0分)" value="all-a" />
            <el-option label="全选B (1分)" value="all-b" />
            <el-option label="全选C (2分)" value="all-c" />
            <el-option label="全选D (3分)" value="all-d" />
            <el-option label="临界模式 (混合)" value="borderline" />
          </el-select>
        </el-form-item>
        <el-form-item label="预期等级">
          <el-tag :type="getExpectedLevelType()">
            {{ getExpectedLevelText() }}
          </el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 测试结果 -->
    <el-card v-if="testResult" class="result-card">
      <template #header>
        <div class="card-header">
          <span>📊 测试结果</span>
          <el-tag :type="testResult.success ? 'success' : 'danger'">
            {{ testResult.success ? '✅ 通过' : '❌ 失败' }}
          </el-tag>
        </div>
      </template>

      <!-- 原始分结果 -->
      <div v-if="testResult.dimensionScores" class="result-section">
        <h4>Step 1: 各维度原始分</h4>
        <el-table :data="testResult.dimensionScores" border size="small">
          <el-table-column prop="name" label="维度" width="120" />
          <el-table-column prop="totalScore" label="总分" width="80" />
          <el-table-column prop="itemCount" label="题目数" width="80" />
          <el-table-column prop="avgScore" label="平均分 (Raw)" width="120" />
        </el-table>
      </div>

      <!-- T分计算验证 -->
      <div v-if="testResult.tScoreVerification" class="result-section">
        <h4>Step 2: T分计算验证 (手动核对)</h4>
        <el-table :data="testResult.tScoreVerification" border size="small">
          <el-table-column prop="dimension" label="维度" width="120" />
          <el-table-column prop="rawScore" label="Raw" width="80" />
          <el-table-column prop="mean" label="Mean" width="80" />
          <el-table-column prop="sd" label="SD" width="80" />
          <el-table-column prop="zScore" label="Z = (R-M)/SD" width="140" />
          <el-table-column prop="tScoreFormula" label="T = 50+10×Z" width="140" />
          <el-table-column prop="tScore" label="最终T分" width="100">
            <template #default="{ row }">
              <el-tag :type="row.tScore < 60 ? 'success' : row.tScore < 70 ? 'warning' : 'danger'">
                {{ row.tScore }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 最终结果 -->
      <div v-if="testResult.finalResult" class="result-section">
        <h4>Step 3: 最终评估结果</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="多动指数 T 分">
            <el-tag :type="getLevelType(testResult.finalResult.tScore)">
              {{ testResult.finalResult.tScore }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="评定等级">
            <el-tag :type="getLevelType(testResult.finalResult.tScore)">
              {{ testResult.finalResult.level }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="评估ID" v-if="testResult.assessmentId">
            {{ testResult.assessmentId }}
          </el-descriptions-item>
          <el-descriptions-item label="数据库保存">
            <el-tag :type="testResult.savedToDb ? 'success' : 'danger'">
              {{ testResult.savedToDb ? '✅ 成功' : '❌ 失败' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 操作按钮 -->
      <div v-if="testResult.success && testResult.assessmentId" class="action-buttons">
        <el-button type="primary" @click="viewReport">
          📄 查看报告页面
        </el-button>
        <el-button type="success" @click="viewInStudentDetail">
          👤 在学生详情中查看
        </el-button>
      </div>
    </el-card>

    <!-- 日志输出 -->
    <el-card class="log-card">
      <template #header>
        <div class="card-header">
          <span>📜 控制台日志 (请打开浏览器 DevTools 查看)</span>
          <el-button size="small" @click="openDevTools">打开 DevTools</el-button>
        </div>
      </template>
      <el-alert type="info" :closable="false">
        <p>请在浏览器中按 <strong>F12</strong> 或 <strong>Ctrl+Shift+I</strong> 打开开发者工具，切换到 <strong>Console</strong> 标签查看详细的 T 分计算过程日志。</p>
      </el-alert>
      <div class="log-preview">
        <pre>{{ logOutput }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DatabaseAPI } from '@/database/api'
import { getDriverByScaleCode } from '@/strategies/assessment'
import { connersPSQNorms, getAgeGroup, type Gender, type AgeGroup } from '@/database/conners-norms'
import type { StudentContext, ScaleAnswer, ScoreResult, DimensionScore } from '@/types/assessment'

// 维度名称映射（从 ConnersPSQDriver 复制）
const PSQ_DIMENSION_NAMES: Record<string, string> = {
  conduct: '品行问题',
  learning: '学习问题',
  psychosomatic: '心身障碍',
  impulsivity_hyperactivity: '冲动-多动',
  anxiety: '焦虑',
  hyperactivity_index: '多动指数'
}

const router = useRouter()

// 状态
const testing = ref(false)
const testStudent = ref<StudentContext | null>(null)
const testResult = ref<any>(null)
const logOutput = ref('')
const answerMode = ref('borderline') // 默认使用临界模式

// 常模数据
const normsData = computed(() => {
  const norms = connersPSQNorms.male['6-8']
  return Object.entries(norms).map(([dim, data]) => ({
    dimension: PSQ_DIMENSION_NAMES[dim] || dim,
    mean: data.mean.toFixed(2),
    sd: data.sd.toFixed(2)
  }))
})

// 获取预期等级
function getExpectedLevelType(): string {
  const mode = answerMode.value
  if (mode === 'all-a') return 'success'
  if (mode === 'all-d') return 'danger'
  return 'warning'
}

function getExpectedLevelText(): string {
  const mode = answerMode.value
  if (mode === 'all-a') return '正常 (< 60)'
  if (mode === 'all-d') return '临床显著 (≥ 70)'
  if (mode === 'borderline') return '临界 (60-69)'
  return '待计算'
}

// 获取等级类型
function getLevelType(tScore: number): string {
  if (tScore < 60) return 'success'
  if (tScore < 70) return 'warning'
  return 'danger'
}

// 计算 8 岁学生的生日
function calculateBirthdayFor8YearOld(): string {
  const today = new Date()
  const birthYear = today.getFullYear() - 8
  const birthMonth = today.getMonth()
  const birthDay = today.getDate()
  return `${birthYear}-${String(birthMonth + 1).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
}

// 创建测试学生
async function createTestStudent(): Promise<StudentContext> {
  const db = new DatabaseAPI()
  const birthday = calculateBirthdayFor8YearOld()

  // 检查是否已存在测试学生
  const existingStudents = db.query(
    "SELECT * FROM student WHERE name = 'Conners测试学生-8岁男'"
  )

  if (existingStudents.length > 0) {
    const s = existingStudents[0]
    const ageMonths = calculateAgeInMonths(s.birthday)
    testStudent.value = {
      id: s.id,
      name: s.name,
      gender: s.gender,
      birthday: s.birthday,
      ageInMonths: ageMonths
    }
    return testStudent.value!
  }

  // 创建新学生
  await db.executeAsync(
    `INSERT INTO student (name, gender, birthday, student_no)
     VALUES (?, ?, ?, ?)`,
    ['Conners测试学生-8岁男', '男', birthday, 'TEST-8M-001']
  )

  const result = await db.queryOneAsync('SELECT last_insert_rowid() as id')
  const studentId = result?.id || 0

  const ageMonths = 8 * 12 // 96 个月
  testStudent.value = {
    id: studentId,
    name: 'Conners测试学生-8岁男',
    gender: '男',
    birthday,
    ageInMonths: ageMonths
  }

  appendLog(`✅ 创建测试学生: ID=${studentId}, 8岁男, 96个月`)
  return testStudent.value!
}

// 计算月龄
function calculateAgeInMonths(birthday: string): number {
  const birth = new Date(birthday)
  const today = new Date()
  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months--
  return Math.max(0, months)
}

// 生成模拟答案
function generateMockAnswers(): Record<string, ScaleAnswer> {
  const answers: Record<string, ScaleAnswer> = {}
  const driver = getDriverByScaleCode('conners-psq')
  const questions = driver!.getQuestions({} as StudentContext)

  for (const q of questions) {
    let score: number

    switch (answerMode.value) {
      case 'all-a':
        score = 0
        break
      case 'all-b':
        score = 1
        break
      case 'all-c':
        score = 2
        break
      case 'all-d':
        score = 3
        break
      case 'borderline':
        // 临界模式：混合答案，预期 T 分在 60-70 之间
        // 根据维度调整答案，使多动指数接近临界值
        if (q.dimension === 'hyperactivity_index') {
          score = Math.random() > 0.3 ? 2 : 1 // 多动指数维度稍高
        } else if (q.dimension === 'conduct' || q.dimension === 'impulsivity_hyperactivity') {
          score = Math.random() > 0.5 ? 1 : 2
        } else {
          score = Math.floor(Math.random() * 3) // 0-2
        }
        break
      default: // random
        score = Math.floor(Math.random() * 4)
    }

    answers[q.id] = {
      questionId: q.id,
      score,
      timestamp: Date.now()
    }
  }

  appendLog(`📝 生成 ${questions.length} 道题目的模拟答案 (模式: ${answerMode.value})`)
  return answers
}

// 执行算分逻辑（不保存数据库）
async function runScoreCalculationOnly() {
  testing.value = true
  testResult.value = null
  logOutput.value = ''

  try {
    // 确保有测试学生
    if (!testStudent.value) {
      await createTestStudent()
    }

    // 生成模拟答案
    const answers = generateMockAnswers()

    // 获取驱动器
    const driver = getDriverByScaleCode('conners-psq')
    if (!driver) {
      throw new Error('无法获取 ConnersPSQDriver')
    }

    appendLog('🔬 开始计算评分...')
    console.log('\n' + '='.repeat(60))
    console.log('🔬 Conners PSQ 算分逻辑测试 (仅计算，不保存)')
    console.log('='.repeat(60))

    // 计算评分
    const scoreResult = driver.calculateScore(answers, testStudent.value!)

    // 构建验证结果
    const tScoreVerification = buildTScoreVerification(scoreResult, testStudent.value!)

    testResult.value = {
      success: true,
      dimensionScores: scoreResult.dimensions.map((d: DimensionScore) => ({
        name: d.name,
        totalScore: d.passedCount,
        itemCount: d.itemCount,
        avgScore: d.rawScore.toFixed(2)
      })),
      tScoreVerification,
      finalResult: {
        tScore: scoreResult.tScore,
        level: scoreResult.level
      },
      savedToDb: false,
      assessmentId: null
    }

    appendLog(`✅ 算分完成: T分=${scoreResult.tScore}, 等级=${scoreResult.level}`)
    ElMessage.success('算分测试完成，请查看控制台日志')

  } catch (error: any) {
    appendLog(`❌ 错误: ${error.message}`)
    testResult.value = {
      success: false,
      error: error.message
    }
    ElMessage.error(`测试失败: ${error.message}`)
  } finally {
    testing.value = false
  }
}

// 构建 T 分验证表格
function buildTScoreVerification(scoreResult: ScoreResult, student: StudentContext) {
  const gender: Gender = 'male'
  const ageGroup: AgeGroup = getAgeGroup(student.ageInMonths)
  const norms = connersPSQNorms[gender][ageGroup]

  return scoreResult.dimensions.map((dim: DimensionScore) => {
    const norm = norms[dim.code]
    const rawScore = dim.rawScore
    const mean = norm?.mean || 0
    const sd = norm?.sd || 1
    const zScore = (rawScore - mean) / sd
    const tScoreCalc = 50 + 10 * zScore

    return {
      dimension: dim.name,
      rawScore: rawScore.toFixed(2),
      mean: mean.toFixed(2),
      sd: sd.toFixed(2),
      zScore: zScore.toFixed(4),
      tScoreFormula: `50 + 10 × ${zScore.toFixed(4)} = ${tScoreCalc.toFixed(1)}`,
      tScore: dim.standardScore
    }
  })
}

// 执行完整测试
async function runFullTest() {
  testing.value = true
  testResult.value = null
  logOutput.value = ''

  try {
    // Step 1: 创建测试学生
    appendLog('📌 Step 1: 创建测试学生...')
    const student = await createTestStudent()

    // Step 2: 生成模拟答案
    appendLog('📌 Step 2: 生成模拟答案...')
    const answers = generateMockAnswers()

    // Step 3: 获取驱动器并计算评分
    appendLog('📌 Step 3: 计算评分...')
    const driver = getDriverByScaleCode('conners-psq')
    if (!driver) {
      throw new Error('无法获取 ConnersPSQDriver')
    }

    console.log('\n' + '='.repeat(60))
    console.log('🔬 Conners PSQ 完整端到端测试')
    console.log('='.repeat(60))

    const scoreResult = driver.calculateScore(answers, student)

    // Step 4: 保存到数据库
    appendLog('📌 Step 4: 保存评估结果到数据库...')
    const assessmentId = await saveAssessment(student, scoreResult, answers)

    // 构建验证结果
    const tScoreVerification = buildTScoreVerification(scoreResult, student)

    testResult.value = {
      success: true,
      dimensionScores: scoreResult.dimensions.map((d: DimensionScore) => ({
        name: d.name,
        totalScore: d.passedCount,
        itemCount: d.itemCount,
        avgScore: d.rawScore.toFixed(2)
      })),
      tScoreVerification,
      finalResult: {
        tScore: scoreResult.tScore,
        level: scoreResult.level
      },
      savedToDb: assessmentId > 0,
      assessmentId
    }

    appendLog(`✅ 完整测试成功! 评估ID: ${assessmentId}`)
    ElMessage.success('端到端测试完成！')

  } catch (error: any) {
    appendLog(`❌ 错误: ${error.message}`)
    console.error('测试失败:', error)
    testResult.value = {
      success: false,
      error: error.message
    }
    ElMessage.error(`测试失败: ${error.message}`)
  } finally {
    testing.value = false
  }
}

// 保存评估结果
async function saveAssessment(
  student: StudentContext,
  scoreResult: ScoreResult,
  answers: Record<string, ScaleAnswer>
): Promise<number> {
  const db = new DatabaseAPI()

  // 序列化维度分数
  const dimensionScores: Record<string, any> = {}
  const rawScores: Record<string, number> = {}
  const tScores: Record<string, number> = {}

  for (const dim of scoreResult.dimensions) {
    dimensionScores[dim.code] = {
      rawScore: dim.rawScore,
      tScore: dim.standardScore,
      itemCount: dim.itemCount
    }
    rawScores[dim.code] = dim.rawScore
    tScores[dim.code] = dim.standardScore
  }

  const now = new Date().toISOString()

  await db.executeAsync(
    `INSERT INTO conners_psq_assess (
      student_id, gender, age_months,
      raw_scores, dimension_scores, t_scores,
      pi_score, ni_score, is_valid,
      hyperactivity_index, level,
      start_time, end_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.id,
      student.gender,
      student.ageInMonths,
      JSON.stringify(rawScores),
      JSON.stringify(dimensionScores),
      JSON.stringify(tScores),
      0, // pi_score (1978版无此字段)
      0, // ni_score (1978版无此字段)
      1, // is_valid
      scoreResult.tScore,
      scoreResult.levelCode,
      now,
      now
    ]
  )

  const result = await db.queryOneAsync('SELECT last_insert_rowid() as id')
  return result?.id || 0
}

// 清理测试数据
async function clearTestStudent() {
  try {
    await ElMessageBox.confirm(
      '确定要删除测试学生和相关的评估记录吗？',
      '确认清理',
      { type: 'warning' }
    )

    const db = new DatabaseAPI()

    // 删除评估记录
    if (testStudent.value) {
      await db.executeAsync(
        'DELETE FROM conners_psq_assess WHERE student_id = ?',
        [testStudent.value.id]
      )
      appendLog('🗑️ 已删除评估记录')

      // 删除学生
      await db.executeAsync(
        'DELETE FROM student WHERE id = ?',
        [testStudent.value.id]
      )
      appendLog('🗑️ 已删除测试学生')
    }

    testStudent.value = null
    testResult.value = null
    ElMessage.success('测试数据已清理')

  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`清理失败: ${error.message}`)
    }
  }
}

// 查看报告
function viewReport() {
  if (testResult.value?.assessmentId) {
    router.push(`/assessment/conners-psq/report/${testResult.value.assessmentId}`)
  }
}

// 在学生详情中查看
function viewInStudentDetail() {
  if (testStudent.value) {
    router.push(`/student/${testStudent.value.id}`)
  }
}

// 打开开发者工具
function openDevTools() {
  ElMessage.info('请按 F12 或 Ctrl+Shift+I 打开开发者工具')
}

// 追加日志
function appendLog(message: string) {
  const timestamp = new Date().toLocaleTimeString()
  logOutput.value += `[${timestamp}] ${message}\n`
  console.log(message)
}

// 初始化
onMounted(async () => {
  // 尝试加载已存在的测试学生
  try {
    const db = new DatabaseAPI()
    const students = db.query(
      "SELECT * FROM student WHERE name = 'Conners测试学生-8岁男'"
    )
    if (students.length > 0) {
      const s = students[0]
      testStudent.value = {
        id: s.id,
        name: s.name,
        gender: s.gender,
        birthday: s.birthday,
        ageInMonths: calculateAgeInMonths(s.birthday)
      }
      appendLog('📋 已加载现有测试学生')
    }
  } catch (error) {
    console.error('初始化失败:', error)
  }
})
</script>

<style scoped>
.conners-e2e-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-card {
  margin-bottom: 20px;
}

.test-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.result-section {
  margin-bottom: 20px;
}

.result-section h4 {
  margin-bottom: 10px;
  color: #303133;
}

.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.log-preview {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.el-alert p {
  margin: 4px 0;
  font-size: 13px;
}
</style>
