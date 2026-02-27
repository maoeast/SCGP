<template>
  <div class="class-test-container">
    <div class="test-header">
      <h1>班级管理模块测试工具</h1>
      <p>用于测试班级创建、学生分班、学年升级等功能</p>
    </div>

    <!-- 测试操作区 -->
    <div class="test-sections">
      <!-- 1. 基础数据生成 -->
      <div class="test-section">
        <h2>
          <i class="fas fa-database"></i>
          基础数据生成
        </h2>
        <p class="section-desc">创建测试班级和学生分班数据</p>

        <div class="control-group">
          <label>学年</label>
          <el-select v-model="testConfig.academicYear" style="width: 150px">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year"
              :value="year"
            />
          </el-select>
        </div>

        <div class="control-group">
          <label>年级范围</label>
          <el-checkbox-group v-model="testConfig.grades">
            <el-checkbox :value="1">1年级</el-checkbox>
            <el-checkbox :value="2">2年级</el-checkbox>
            <el-checkbox :value="3">3年级</el-checkbox>
            <el-checkbox :value="4">4年级</el-checkbox>
            <el-checkbox :value="5">5年级</el-checkbox>
            <el-checkbox :value="6">6年级</el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="control-group">
          <label>每年级班级数</label>
          <el-input-number v-model="testConfig.classesPerGrade" :min="1" :max="10" />
        </div>

        <div class="control-group">
          <label>每班学生数</label>
          <el-input-number v-model="testConfig.studentsPerClass" :min="1" :max="50" />
        </div>

        <button @click="generateTestData" :disabled="loading" class="btn btn-primary">
          <i class="fas fa-plus"></i>
          生成测试数据
        </button>
      </div>

      <!-- 2. 学年升级测试 -->
      <div class="test-section">
        <h2>
          <i class="fas fa-arrow-up"></i>
          学年升级测试
        </h2>
        <p class="section-desc">模拟学生升学和毕业流程</p>

        <div class="control-group">
          <label>源学年</label>
          <el-select v-model="upgradeConfig.fromYear" style="width: 150px">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year"
              :value="year"
            />
          </el-select>
        </div>

        <div class="control-group">
          <label>目标学年</label>
          <el-select v-model="upgradeConfig.toYear" style="width: 150px">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year"
              :value="year"
            />
          </el-select>
        </div>

        <div class="control-group">
          <label>升级日期</label>
          <el-date-picker
            v-model="upgradeConfig.upgradeDate"
            type="date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </div>

        <button @click="simulateUpgrade" :disabled="loading" class="btn btn-warning">
          <i class="fas fa-graduation-cap"></i>
          执行学年升级
        </button>
      </div>

      <!-- 3. 学生分班测试 -->
      <div class="test-section">
        <h2>
          <i class="fas fa-user-plus"></i>
          学生分班测试
        </h2>
        <p class="section-desc">测试学生入班和转班功能</p>

        <div class="control-group">
          <label>学生ID</label>
          <el-input-number v-model="assignmentConfig.studentId" :min="1" />
        </div>

        <div class="control-group">
          <label>目标班级ID</label>
          <el-input-number v-model="assignmentConfig.classId" :min="1" />
        </div>

        <div class="control-group">
          <label>学年</label>
          <el-select v-model="assignmentConfig.academicYear" style="width: 150px">
            <el-option
              v-for="year in availableYears"
              :key="year"
              :label="year"
              :value="year"
            />
          </el-select>
        </div>

        <button @click="testStudentAssignment" :disabled="loading" class="btn btn-success">
          <i class="fas fa-check"></i>
          分配学生到班级
        </button>
      </div>

      <!-- 4. 数据查询测试 -->
      <div class="test-section">
        <h2>
          <i class="fas fa-search"></i>
          数据查询测试
        </h2>
        <p class="section-desc">查询班级和学生信息</p>

        <div class="button-group">
          <button @click="loadAllClasses" class="btn btn-info">
            <i class="fas fa-list"></i>
            加载所有班级
          </button>
          <button @click="loadClassHistory" class="btn btn-info">
            <i class="fas fa-history"></i>
            查看班级变更历史
          </button>
          <button @click="generateReport" class="btn btn-info">
            <i class="fas fa-chart-bar"></i>
            生成统计报告
          </button>
        </div>
      </div>
    </div>

    <!-- 结果显示区 -->
    <div class="test-results">
      <!-- 操作日志 -->
      <div class="result-section">
        <h3>
          <i class="fas fa-terminal"></i>
          操作日志
        </h3>
        <div class="log-container" ref="logContainer">
          <div v-for="(log, index) in logs" :key="index" :class="['log-entry', `log-${log.type}`]">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="result-section" v-if="testData.length > 0">
        <h3>
          <i class="fas fa-table"></i>
          测试数据
          <span class="count">({{ testData.length }} 条)</span>
        </h3>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>班级名称</th>
                <th>学年</th>
                <th>年级</th>
                <th>在籍人数</th>
                <th>容量</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in testData" :key="item.id">
                <td>{{ item.id }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.academicYear }}</td>
                <td>{{ item.gradeLevel }}年级</td>
                <td>{{ item.currentEnrollment }}</td>
                <td>{{ item.maxStudents }}</td>
                <td>
                  <span :class="['status-badge', `status-${item.status}`]">
                    {{ item.status === 1 ? '启用' : '停用' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 统计报告 -->
      <div class="result-section" v-if="statistics">
        <h3>
          <i class="fas fa-chart-pie"></i>
          统计报告
        </h3>
        <div class="statistics-grid">
          <div class="stat-card">
            <div class="stat-label">总班级数</div>
            <div class="stat-value">{{ statistics.totalClasses }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">总学生数</div>
            <div class="stat-value">{{ statistics.totalStudents }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">平均班级人数</div>
            <div class="stat-value">{{ statistics.avgStudentsPerClass }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">满班率</div>
            <div class="stat-value">{{ statistics.fullClassRate }}%</div>
          </div>
        </div>
        <div class="classes-by-year">
          <h4>按学年统计</h4>
          <div v-for="(count, year) in statistics.classesByYear" :key="year" class="year-stat">
            <span class="year-label">{{ year }}:</span>
            <span class="year-count">{{ count }} 个班级</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ClassAPI } from '@/database/class-api'
import { ClassTestDataGenerator, generateTestStudentsForGrade } from '@/database/test/class-test-data'
import type { ClassInfo, StudentClassHistory } from '@/types/class'
import { getCurrentAcademicYear } from '@/types/class'

// API 实例
let classAPI: ClassAPI | null = null

// UI 状态
const loading = ref(false)
const logs = ref<Array<{ type: string; message: string; time: string }>>([])
const logContainer = ref<HTMLElement>()

// 测试配置
const availableYears = ['2023-2024', '2024-2025', '2025-2026']

const testConfig = reactive({
  academicYear: getCurrentAcademicYear(),
  grades: [1, 2, 3, 4, 5, 6] as number[],
  classesPerGrade: 3,
  studentsPerClass: 20
})

const upgradeConfig = reactive({
  fromYear: '2023-2024',
  toYear: '2024-2025',
  upgradeDate: new Date().toISOString().split('T')[0]
})

const assignmentConfig = reactive({
  studentId: 1,
  classId: 1,
  academicYear: getCurrentAcademicYear()
})

// 测试数据
const testData = ref<ClassInfo[]>([])
const classHistory = ref<StudentClassHistory[]>([])
const statistics = ref<any>(null)

/**
 * 添加日志
 */
function addLog(type: string, message: string) {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  logs.value.push({ type, message, time })

  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

/**
 * 初始化 ClassAPI
 */
onMounted(() => {
  try {
    classAPI = new ClassAPI()
    addLog('info', 'ClassAPI 初始化成功')
  } catch (error: any) {
    addLog('error', `ClassAPI 初始化失败: ${error.message}`)
  }
})

/**
 * 生成测试数据
 */
async function generateTestData() {
  if (!classAPI) {
    ElMessage.error('ClassAPI 未初始化')
    return
  }

  loading.value = true
  addLog('info', `开始生成测试数据...`)

  try {
    const generator = new ClassTestDataGenerator(classAPI, {
      academicYears: [testConfig.academicYear],
      gradesPerYear: testConfig.grades as any[],
      classesPerGrade: testConfig.classesPerGrade,
      studentsPerClass: testConfig.studentsPerClass,
      maxStudents: 50
    })

    const result = await generator.generateFullTestData()

    addLog('success', `测试数据生成完成！`)
    addLog('info', `创建班级: ${result.classesCreated}`)
    addLog('info', `学生分班: ${result.assignmentsCreated}`)

    ElMessage.success('测试数据生成成功')

    // 自动加载生成的数据
    loadAllClasses()
  } catch (error: any) {
    addLog('error', `生成失败: ${error.message}`)
    ElMessage.error(`生成失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 模拟学年升级
 */
function simulateUpgrade() {
  if (!classAPI) {
    ElMessage.error('ClassAPI 未初始化')
    return
  }

  loading.value = true
  addLog('info', `开始学年升级: ${upgradeConfig.fromYear} → ${upgradeConfig.toYear}`)

  try {
    const generator = new ClassTestDataGenerator(classAPI)
    const result = generator.simulateGradeUpgrade(
      upgradeConfig.fromYear as any,
      upgradeConfig.toYear as any,
      upgradeConfig.upgradeDate
    )

    addLog('success', `学年升级完成！`)
    addLog('info', `升级学生: ${result.upgraded} 人`)
    addLog('info', `毕业学生: ${result.graduated} 人`)

    ElMessage.success('学年升级成功')

    loadAllClasses()
  } catch (error: any) {
    addLog('error', `升级失败: ${error.message}`)
    ElMessage.error(`升级失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 测试学生分班
 */
function testStudentAssignment() {
  if (!classAPI) {
    ElMessage.error('ClassAPI 未初始化')
    return
  }

  loading.value = true
  addLog('info', `分配学生 ${assignmentConfig.studentId} 到班级 ${assignmentConfig.classId}`)

  try {
    // 获取班级信息
    const classInfo = classAPI.getClass(assignmentConfig.classId)
    const studentName = `测试学生${assignmentConfig.studentId}`

    classAPI.assignStudentToClass(
      assignmentConfig.studentId,
      studentName,
      assignmentConfig.classId,
      assignmentConfig.academicYear as any,
      new Date().toISOString().split('T')[0]
    )

    addLog('success', `学生分班成功！`)
    addLog('info', `${studentName} 已分配到 ${classInfo.name}`)

    ElMessage.success('学生分班成功')
  } catch (error: any) {
    addLog('error', `分班失败: ${error.message}`)
    ElMessage.error(`分班失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 加载所有班级
 */
function loadAllClasses() {
  if (!classAPI) return

  addLog('info', '加载所有班级...')

  try {
    testData.value = classAPI.getAllClasses()
    addLog('success', `加载了 ${testData.value.length} 个班级`)
  } catch (error: any) {
    addLog('error', `加载失败: ${error.message}`)
  }
}

/**
 * 查看班级变更历史
 */
function loadClassHistory() {
  if (!classAPI) return

  addLog('info', '加载班级变更历史...')

  try {
    classHistory.value = classAPI.getAllClassHistory()
    addLog('success', `加载了 ${classHistory.value.length} 条历史记录`)
  } catch (error: any) {
    addLog('error', `加载失败: ${error.message}`)
  }
}

/**
 * 生成统计报告
 */
function generateReport() {
  if (!classAPI) return

  addLog('info', '生成统计报告...')

  try {
    const generator = new ClassTestDataGenerator(classAPI)
    const report = generator.generateTestReport()

    // 计算统计数据
    const avgStudentsPerClass = report.totalClasses > 0
      ? (report.totalStudents / report.totalClasses).toFixed(1)
      : '0'

    const fullClasses = report.studentsByClass.filter(c => c.count >= 50).length
    const fullClassRate = report.totalClasses > 0
      ? ((fullClasses / report.totalClasses) * 100).toFixed(1)
      : '0'

    statistics.value = {
      totalClasses: report.totalClasses,
      totalStudents: report.totalStudents,
      avgStudentsPerClass,
      fullClassRate,
      classesByYear: report.classesByYear
    }

    addLog('success', '统计报告生成完成')
  } catch (error: any) {
    addLog('error', `生成失败: ${error.message}`)
  }
}
</script>

<style scoped>
.class-test-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.test-header {
  text-align: center;
  margin-bottom: 30px;
}

.test-header h1 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.test-header p {
  color: #6c757d;
}

.test-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.test-section {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.test-section h2 {
  font-size: 18px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-desc {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 16px;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #495057;
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #1e7e34;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background-color: #117a8b;
}

.test-results {
  display: grid;
  gap: 20px;
}

.result-section {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.result-section h3 {
  font-size: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count {
  font-size: 14px;
  color: #6c757d;
  font-weight: normal;
}

.log-container {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.log-entry {
  margin-bottom: 4px;
  display: flex;
  gap: 8px;
}

.log-time {
  color: #858585;
}

.log-info {
  color: #d4d4d4;
}

.log-success {
  color: #4ec9b0;
}

.log-error {
  color: #f48771;
}

.log-warning {
  color: #dcdcaa;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.data-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status-1 {
  background-color: #d4edda;
  color: #155724;
}

.status-0 {
  background-color: #f8d7da;
  color: #721c24;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.classes-by-year h4 {
  font-size: 14px;
  margin-bottom: 12px;
  color: #495057;
}

.year-stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #dee2e6;
}

.year-stat:last-child {
  border-bottom: none;
}

.year-label {
  font-weight: 500;
  color: #495057;
}

.year-count {
  color: #6c757d;
}
</style>
