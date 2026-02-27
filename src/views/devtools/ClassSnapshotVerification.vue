<template>
  <div class="snapshot-verification-container">
    <div class="verification-header">
      <h1>
        <i class="fas fa-shield-alt"></i>
        班级管理混合快照模式验证
      </h1>
      <p class="subtitle">验证升学场景下业务记录的班级快照不会被篡改</p>
    </div>

    <!-- 验证说明 -->
    <div class="info-section">
      <h3>
        <i class="fas fa-info-circle"></i>
        验证目标
      </h3>
      <p class="info-text">
        确保在升学场景下，业务记录中固化的班级快照（<code>class_id</code> 和 <code>class_name</code>）
        不会因为学生后续的升学操作而被篡改，同时学生档案中的当前班级字段应正确更新。
      </p>
    </div>

    <!-- 验证步骤 -->
    <div class="steps-section">
      <h3>
        <i class="fas fa-list-ol"></i>
        验证步骤
      </h3>
      <div class="steps-grid">
        <div
          v-for="(step, index) in steps"
          :key="index"
          :class="['step-card', `step-status-${getStepStatus(index)}`]"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-content">
            <h4>{{ step.title }}</h4>
            <p>{{ step.description }}</p>
          </div>
          <div class="step-indicator">
            <i v-if="getStepStatus(index) === 'completed'" class="fas fa-check-circle"></i>
            <i v-else-if="getStepStatus(index) === 'failed'" class="fas fa-times-circle"></i>
            <i v-else-if="getStepStatus(index) === 'running'" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-circle"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions-section">
      <button
        @click="startVerification"
        :disabled="running || completed"
        class="btn btn-primary"
      >
        <i class="fas fa-play"></i>
        {{ running ? '验证运行中...' : '开始验证' }}
      </button>

      <button
        @click="cleanupTestData"
        :disabled="running"
        class="btn btn-secondary"
      >
        <i class="fas fa-broom"></i>
        清理测试数据
      </button>

      <button
        @click="exportReport"
        :disabled="!completed"
        class="btn btn-success"
      >
        <i class="fas fa-download"></i>
        导出报告
      </button>
    </div>

    <!-- 验证进度 -->
    <div v-if="running || completed" class="progress-section">
      <h3>
        <i class="fas fa-tasks"></i>
        验证进度
      </h3>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <span class="progress-text">{{ progressPercentage }}%</span>
      </div>
    </div>

    <!-- 实时日志 -->
    <div class="logs-section">
      <h3>
        <i class="fas fa-terminal"></i>
        实时日志
      </h3>
      <div class="log-container" ref="logContainer">
        <div
          v-for="(log, index) in logs"
          :key="index"
          :class="['log-entry', `log-${log.type}`]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-empty">
          点击"开始验证"按钮开始测试...
        </div>
      </div>
    </div>

    <!-- 验证结果 -->
    <div v-if="completed" class="results-section">
      <h3>
        <i class="fas fa-clipboard-check"></i>
        验证结果
      </h3>

      <!-- 最终判定 -->
      <div :class="['final-verdict', report?.summary?.failed === 0 ? 'verdict-pass' : 'verdict-fail']">
        <i :class="report?.summary?.failed === 0 ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
        <span>{{ report?.finalVerdict }}</span>
      </div>

      <!-- 阶段结果 -->
      <div class="phase-results">
        <h4>阶段详情</h4>
        <div
          v-for="(phase, index) in report?.phases"
          :key="index"
          :class="['phase-card', `phase-${phase.success ? 'success' : 'failed'}`]"
        >
          <div class="phase-header">
            <span class="phase-name">{{ phase.phase }}</span>
            <span :class="['phase-badge', phase.success ? 'badge-success' : 'badge-failed']">
              {{ phase.success ? '✓ 通过' : '✗ 失败' }}
            </span>
          </div>
          <div class="phase-message">{{ phase.message }}</div>
          <div v-if="phase.error" class="phase-error">{{ phase.error }}</div>
          <div v-if="phase.data" class="phase-data">
            <details>
              <summary>查看数据</summary>
              <pre>{{ JSON.stringify(phase.data, null, 2) }}</pre>
            </details>
          </div>
        </div>
      </div>

      <!-- 数据一致性对比 -->
      <div v-if="report?.phases?.[3]?.data" class="comparison-section">
        <h4>数据一致性对比</h4>
        <div class="comparison-table">
          <table>
            <thead>
              <tr>
                <th>数据项</th>
                <th>历史快照</th>
                <th>当前档案</th>
                <th>一致性</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>班级ID</td>
                <td><code>{{ report.phases[3].data.historicalRecord.classId }}</code></td>
                <td><code>{{ report.phases[3].data.currentProfile.classId }}</code></td>
                <td>
                  <span :class="report.phases[3].data.historicalRecord.classId !== report.phases[3].data.currentProfile.classId ? 'status-ok' : 'status-error'">
                    {{ report.phases[3].data.historicalRecord.classId !== report.phases[3].data.currentProfile.classId ? '✓ 快照独立' : '✗ 异常' }}
                  </span>
                </td>
              </tr>
              <tr>
                <td>班级名称</td>
                <td><code>{{ report.phases[3].data.historicalRecord.className }}</code></td>
                <td><code>{{ report.phases[3].data.currentProfile.className }}</code></td>
                <td>
                  <span :class="report.phases[3].data.historicalRecord.className !== report.phases[3].data.currentProfile.className ? 'status-ok' : 'status-error'">
                    {{ report.phases[3].data.historicalRecord.className !== report.phases[3].data.currentProfile.className ? '✓ 快照独立' : '✗ 异常' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 核心验收结论 -->
        <div class="verification-conclusion">
          <h5>核心验收结论</h5>
          <ul class="conclusion-list">
            <li :class="report.phases[3].data.verification.snapshotIntact ? 'conclusion-pass' : 'conclusion-fail'">
              <i :class="report.phases[3].data.verification.snapshotIntact ? 'fas fa-check' : 'fas fa-times'"></i>
              历史快照完整性：{{ report.phases[3].data.verification.snapshotIntact ? '✓ 通过' : '✗ 失败' }}
            </li>
            <li :class="report.phases[3].data.verification.studentUpdated ? 'conclusion-pass' : 'conclusion-fail'">
              <i :class="report.phases[3].data.verification.studentUpdated ? 'fas fa-check' : 'fas fa-times'"></i>
              学生档案更新：{{ report.phases[3].data.verification.studentUpdated ? '✓ 通过' : '✗ 失败' }}
            </li>
            <li :class="report.phases[3].data.verification.isolationVerified ? 'conclusion-pass' : 'conclusion-fail'">
              <i :class="report.phases[3].data.verification.isolationVerified ? 'fas fa-check' : 'fas fa-times'"></i>
              数据隔离验证：{{ report.phases[3].data.verification.isolationVerified ? '✓ 通过' : '✗ 失败' }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ClassSnapshotVerifier, verifyClassSnapshotMode } from '@/database/test/class-snapshot-verification'
import type { VerificationReport } from '@/database/test/class-snapshot-verification'

// 验证步骤定义
const steps = [
  {
    title: '建立初始状态',
    description: '创建班级"2025级-启航班"并分配测试学生'
  },
  {
    title: '触发快照记录',
    description: '录入器材训练记录，确认班级快照已固化'
  },
  {
    title: '模拟组织变更',
    description: '执行学年升级，将学生迁移至"2026级-进阶班"'
  },
  {
    title: '核心验收核实',
    description: '验证历史记录的班级信息不变，学生档案的当前班级已更新'
  }
]

// UI 状态
const running = ref(false)
const completed = ref(false)
const currentPhase = ref(-1)
const logs = ref<Array<{ type: string; message: string; time: string }>>([])
const report = ref<VerificationReport | null>(null)
const logContainer = ref<HTMLElement>()

// 计算属性
const progressPercentage = computed(() => {
  if (currentPhase.value < 0) return 0
  return Math.round(((currentPhase.value + 1) / steps.length) * 100)
})

/**
 * 获取步骤状态
 */
function getStepStatus(index: number): string {
  if (currentPhase.value < 0) return 'pending'
  if (index < currentPhase.value) {
    return report.value?.phases?.[index]?.success ? 'completed' : 'failed'
  }
  if (index === currentPhase.value) return 'running'
  return 'pending'
}

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
 * 开始验证
 */
async function startVerification() {
  // 重置状态
  running.value = true
  completed.value = false
  currentPhase.value = -1
  logs.value = []
  report.value = null

  addLog('info', '开始执行班级混合快照模式验证...')

  try {
    // 创建验证器实例
    const verifier = new ClassSnapshotVerifier()

    // 执行各阶段验证
    const phases = [
      () => verifier.phase1_InitialSetup(),
      () => verifier.phase2_TriggerSnapshot(),
      () => verifier.phase3_SimulateUpgrade(),
      () => verifier.phase4_FinalVerification()
    ]

    const phaseResults = []

    for (let i = 0; i < phases.length; i++) {
      currentPhase.value = i
      addLog('info', `\n========== ${steps[i].title} ==========`)

      const result = await phases[i]()
      phaseResults.push(result)

      if (result.success) {
        addLog('success', `✓ ${result.message}`)
        if (result.data) {
          addLog('info', JSON.stringify(result.data, null, 2))
        }
      } else {
        addLog('error', `✗ ${result.message}`)
        if (result.error) {
          addLog('error', `错误: ${result.error}`)
        }
        break
      }
    }

    // 生成报告
    const totalPhases = phaseResults.length
    const passedPhases = phaseResults.filter(r => r.success).length
    const failedPhases = totalPhases - passedPhases

    report.value = {
      phases: phaseResults,
      summary: {
        total: totalPhases,
        passed: passedPhases,
        failed: failedPhases
      },
      finalVerdict: failedPhases === 0
        ? '✅ 验证通过 - 混合快照模式工作正常'
        : '❌ 验证失败 - 混合快照模式存在问题'
    }

    addLog('info', '\n========== 验证报告汇总 ==========')
    addLog('info', `总阶段数: ${totalPhases}`)
    addLog('info', `通过阶段: ${passedPhases}`)
    addLog('info', `失败阶段: ${failedPhases}`)
    addLog(report.value.summary.failed === 0 ? 'success' : 'error', report.value.finalVerdict)

    if (report.value.summary.failed === 0) {
      ElMessage.success('验证通过！混合快照模式工作正常')
    } else {
      ElMessage.error('验证失败！请查看日志了解详情')
    }

  } catch (error: any) {
    addLog('error', `验证过程中发生异常: ${error.message}`)
    ElMessage.error(`验证失败: ${error.message}`)
  } finally {
    running.value = false
    completed.value = true
    currentPhase.value = steps.length - 1
  }
}

/**
 * 清理测试数据
 */
function cleanupTestData() {
  addLog('info', '清理测试数据功能需要手动执行...')
  ElMessage.info('请在浏览器控制台执行 verifier.cleanupTestData()')
}

/**
 * 导出报告
 */
function exportReport() {
  if (!report.value) return

  const reportContent = {
    timestamp: new Date().toISOString(),
    report: report.value,
    logs: logs.value
  }

  const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `class-snapshot-verification-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)

  ElMessage.success('报告导出成功')
}
</script>

<style scoped>
.snapshot-verification-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.verification-header {
  text-align: center;
  margin-bottom: 30px;
}

.verification-header h1 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.subtitle {
  color: #6c757d;
  font-size: 14px;
}

.info-section {
  background: #e7f5ff;
  border-left: 4px solid #007bff;
  border-radius: 4px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.info-section h3 {
  font-size: 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-text {
  color: #495057;
  line-height: 1.6;
  font-size: 14px;
}

.info-text code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #d63384;
}

.steps-section {
  margin-bottom: 24px;
}

.steps-section h3 {
  font-size: 18px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.step-card {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  transition: all 0.2s;
}

.step-status-completed {
  border-color: #28a745;
  background: #f8fff9;
}

.step-status-failed {
  border-color: #dc3545;
  background: #fff8f8;
}

.step-status-running {
  border-color: #ffc107;
  background: #fffbf0;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  font-size: 14px;
  margin-bottom: 4px;
}

.step-content p {
  font-size: 12px;
  color: #6c757d;
  margin: 0;
}

.step-indicator {
  font-size: 20px;
  display: flex;
  align-items: center;
}

.step-status-completed .step-indicator {
  color: #28a745;
}

.step-status-failed .step-indicator {
  color: #dc3545;
}

.step-status-running .step-indicator {
  color: #ffc107;
}

.actions-section {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1e7e34;
}

.progress-section {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.progress-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 24px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
}

.progress-text {
  font-weight: 600;
  color: #495057;
  min-width: 50px;
}

.logs-section {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.logs-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-container {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-empty {
  color: #858585;
  text-align: center;
  padding: 20px;
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

.results-section {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
}

.results-section h3 {
  font-size: 18px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.final-verdict {
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;
}

.verdict-pass {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.verdict-fail {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.phase-results {
  margin-bottom: 24px;
}

.phase-results h4 {
  font-size: 16px;
  margin-bottom: 12px;
}

.phase-card {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.phase-success {
  border-left: 4px solid #28a745;
}

.phase-failed {
  border-left: 4px solid #dc3545;
}

.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.phase-name {
  font-weight: 600;
  font-size: 14px;
}

.phase-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background: #d4edda;
  color: #155724;
}

.badge-failed {
  background: #f8d7da;
  color: #721c24;
}

.phase-message {
  font-size: 14px;
  margin-bottom: 8px;
}

.phase-error {
  color: #dc3545;
  font-size: 13px;
}
</style>
