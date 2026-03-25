<template>
  <div class="migration-verification-page">
    <div class="container">
      <h1>Phase 1.5 - 数据迁移验证</h1>

      <div class="info-banner">
        <el-icon class="info-icon"><InfoFilled /></el-icon>
        <div class="info-content">
          <strong>验证功能：</strong>
          执行全面的数据迁移验证，包括完整性、一致性和边界情况检查。
        </div>
      </div>

      <!-- 诊断状态 -->
      <div v-if="diagnosticResult" :class="['diagnostic-section', diagnosticResult.issues.length === 0 ? 'success' : 'warning']">
        <h3>{{ diagnosticResult.issues.length === 0 ? '✅ 数据库状态正常' : '⚠️ 需要先执行迁移' }}</h3>
        <div class="diagnostic-grid">
          <div class="diagnostic-item">
            <span class="label">sys_ 表存在：</span>
            <span :class="['value', diagnosticResult.sysTablesExist ? 'success' : 'error']">
              {{ diagnosticResult.sysTablesExist ? '✅ 是' : '❌ 否' }}
            </span>
          </div>
          <div class="diagnostic-item">
            <span class="label">equipment_catalog：</span>
            <span class="value">{{ diagnosticResult.equipmentCount }} 条</span>
          </div>
          <div class="diagnostic-item">
            <span class="label">sys_training_resource：</span>
            <span class="value">{{ diagnosticResult.resourceCount }} 条</span>
          </div>
          <div class="diagnostic-item">
            <span class="label">sys_tags：</span>
            <span class="value">{{ diagnosticResult.tagCount }} 个</span>
          </div>
        </div>
        <div v-if="diagnosticResult.issues.length > 0" class="diagnostic-issues">
          <div class="issues-title">发现问题：</div>
          <ul class="issues-list">
            <li v-for="(issue, index) in diagnosticResult.issues" :key="index">{{ issue }}</li>
          </ul>
          <div class="recommendations-title">建议操作：</div>
          <ul class="recommendations-list">
            <li v-for="(rec, index) in diagnosticResult.recommendations" :key="index">{{ rec }}</li>
          </ul>
          <el-button type="primary" @click="goToMigrationPage">
            🚀 前往 Schema 迁移页面
          </el-button>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="actions">
        <el-button type="primary" :loading="loading" @click="handleRunAll" :disabled="!canRunVerification">
          🔍 运行完整验证
        </el-button>
        <el-button :loading="loading" @click="handleVerifyCounts" :disabled="!canRunVerification">
          📊 验证数量匹配
        </el-button>
        <el-button :loading="loading" @click="handleVerifyIntegrity" :disabled="!canRunVerification">
          🔗 验证关联完整性
        </el-button>
        <el-button :loading="loading" @click="handleCompareData" :disabled="!canRunVerification">
          ⚖️ 数据一致性对比
        </el-button>
        <el-button type="success" :loading="loading" @click="handleExportReport" :disabled="!verificationResult">
          📄 导出报告
        </el-button>
        <el-button @click="handleRunDiagnostics">
          🔄 重新诊断
        </el-button>
      </div>

      <!-- 验证结果概览 -->
      <div v-if="verificationResult" class="overview-section">
        <h3>验证概览</h3>
        <div class="overview-grid">
          <div class="overview-card">
            <div class="card-label">总体结果</div>
            <div :class="['card-value', verificationResult.passed ? 'success' : 'error']">
              {{ verificationResult.passed ? '✅ 通过' : '❌ 失败' }}
            </div>
          </div>
          <div class="overview-card">
            <div class="card-label">总检查项</div>
            <div class="card-value">{{ verificationResult.summary.total }}</div>
          </div>
          <div class="overview-card">
            <div class="card-label">通过</div>
            <div class="card-value success">{{ verificationResult.summary.passed }}</div>
          </div>
          <div class="overview-card">
            <div class="card-label">失败</div>
            <div class="card-value error">{{ verificationResult.summary.failed }}</div>
          </div>
          <div class="overview-card">
            <div class="card-label">警告</div>
            <div class="card-value warning">{{ verificationResult.summary.warnings }}</div>
          </div>
        </div>
      </div>

      <!-- 详细数据统计 -->
      <div v-if="verificationResult" class="details-section">
        <h3>数据统计</h3>
        <div class="details-grid">
          <div class="detail-item">
            <span class="label">equipment_catalog 原始数量：</span>
            <span class="value">{{ verificationResult.details.equipmentCount }}</span>
          </div>
          <div class="detail-item">
            <span class="label">sys_training_resource 迁移数量：</span>
            <span class="value">{{ verificationResult.details.resourceCount }}</span>
          </div>
          <div class="detail-item">
            <span class="label">sys_tags 标签数量：</span>
            <span class="value">{{ verificationResult.details.tagCount }}</span>
          </div>
          <div class="detail-item">
            <span class="label">标签映射数量：</span>
            <span class="value">{{ verificationResult.details.tagMappingCount }}</span>
          </div>
          <div class="detail-item">
            <span class="label">收藏夹数量：</span>
            <span class="value">{{ verificationResult.details.favoriteCount }}</span>
          </div>
          <div class="detail-item">
            <span class="label">孤儿资源：</span>
            <span :class="['value', verificationResult.details.orphanedResources > 0 ? 'error' : '']">
              {{ verificationResult.details.orphanedResources }}
            </span>
          </div>
          <div class="detail-item">
            <span class="label">孤儿标签：</span>
            <span :class="['value', verificationResult.details.orphanedTags > 0 ? 'warning' : '']">
              {{ verificationResult.details.orphanedTags }}
            </span>
          </div>
          <div class="detail-item">
            <span class="label">重复标签：</span>
            <span :class="['value', verificationResult.details.duplicateTags > 0 ? 'error' : '']">
              {{ verificationResult.details.duplicateTags }}
            </span>
          </div>
        </div>
      </div>

      <!-- 检查详情 -->
      <div v-if="verificationResult && verificationResult.checks.length > 0" class="checks-section">
        <h3>检查详情</h3>
        <el-collapse>
          <el-collapse-item
            v-for="(check, index) in verificationResult.checks"
            :key="index"
            :name="index"
          >
            <template #title>
              <div class="check-title">
                <span :class="['check-icon', getCheckIconClass(check)]">
                  {{ getCheckIcon(check) }}
                </span>
                <span class="check-name">{{ check.name }}</span>
                <span :class="['check-badge', getSeverityClass(check.severity)]">
                  {{ check.severity }}
                </span>
              </div>
            </template>
            <div class="check-content">
              <div class="check-description">{{ check.description }}</div>
              <div class="check-values">
                <div class="check-value">
                  <span class="value-label">预期：</span>
                  <span class="value-data">{{ formatValue(check.expected) }}</span>
                </div>
                <div class="check-value">
                  <span class="value-label">实际：</span>
                  <span :class="['value-data', check.passed ? 'success' : 'error']">
                    {{ formatValue(check.actual) }}
                  </span>
                </div>
              </div>
              <div :class="['check-status', check.passed ? 'passed' : 'failed']">
                {{ check.passed ? '✅ 通过' : '❌ 失败' }}
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 建议与推荐 -->
      <div v-if="verificationResult && verificationResult.recommendations.length > 0" class="recommendations-section">
        <h3>建议与推荐</h3>
        <div class="recommendations-list">
          <div
            v-for="(rec, index) in verificationResult.recommendations"
            :key="index"
            :class="['recommendation-item', getRecommendationClass(rec)]"
          >
            {{ rec }}
          </div>
        </div>
      </div>

      <!-- 双写验证测试 -->
      <div class="dual-write-section">
        <h3>双写验证测试（可选）</h3>
        <div class="dual-write-controls">
          <el-switch
            v-model="dualWriteEnabled"
            active-text="启用双写模式"
            inactive-text="禁用双写模式"
            @change="handleDualWriteToggle"
          />
          <el-button
            v-if="dualWriteEnabled"
            type="warning"
            size="small"
            @click="handleTestDualWrite"
          >
            测试双写
          </el-button>
        </div>
        <div v-if="dualWriteResult" class="dual-write-result">
          <div class="result-item">
            <span class="label">旧表 ID：</span>
            <span class="value">{{ dualWriteResult.oldId }}</span>
          </div>
          <div class="result-item">
            <span class="label">新表 ID：</span>
            <span class="value">{{ dualWriteResult.newId }}</span>
          </div>
          <div class="result-item">
            <span class="label">状态：</span>
            <span :class="['value', dualWriteResult.success ? 'success' : 'error']">
              {{ dualWriteResult.success ? '✅ 成功' : '❌ 失败' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 日志输出 -->
      <div class="log-section">
        <div class="log-header">
          <h3>执行日志</h3>
          <el-button size="small" text @click="clearLogs">清除日志</el-button>
        </div>
        <div ref="logContainer" class="log-container">
          <div
            v-for="(log, index) in logs"
            :key="index"
            :class="['log-entry', 'log-' + log.level]"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
type VerificationReport = any
type DualWriteResult = any

// 状态
const loading = ref(false)
const logs = ref<Array<{ time: string; level: string; message: string }>>([])
const verificationResult = ref<VerificationReport | null>(null)
const dualWriteEnabled = ref(false)
const dualWriteResult = ref<DualWriteResult | null>(null)
const diagnosticResult = ref<any>(null)

const logContainer = ref<HTMLElement>()

// 计算属性：是否可以运行验证
const canRunVerification = computed(() => {
  return diagnosticResult.value && diagnosticResult.value.sysTablesExist
})

// 日志函数
function addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
  const time = new Date().toLocaleTimeString()
  logs.value.push({ time, level, message })

  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })

  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
  console[consoleMethod](`[${time}] [${level.toUpperCase()}] ${message}`)
}

function clearLogs() {
  logs.value = []
}

// 格式化值
function formatValue(val: any): string {
  if (val === null || val === undefined) return 'N/A'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

// 获取检查图标
function getCheckIcon(check: any): string {
  return check.passed ? '✓' : '✗'
}

function getCheckIconClass(check: any): string {
  return check.passed ? 'icon-passed' : 'icon-failed'
}

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'critical': return 'badge-critical'
    case 'warning': return 'badge-warning'
    default: return 'badge-info'
  }
}

function getRecommendationClass(rec: string): string {
  if (rec.includes('❌')) return 'rec-error'
  if (rec.includes('⚠️')) return 'rec-warning'
  return 'rec-success'
}

// 初始化数据库
async function initDatabase() {
  try {
    // 使用主应用的数据库（SQLWrapper），确保能看到完整的62条器材数据
    const { getDatabase, initDatabase: initMainDb } = await import('@/database/init')

    // 确保主数据库已初始化
    await initMainDb()

    // 获取主应用的数据库实例（SQLWrapper 包装的）
    const sqlWrapper = getDatabase()

    // 获取原始 sql.js Database 对象（供迁移脚本使用）
    const db = sqlWrapper.getRawDB()

    addLog('success', '数据库初始化成功')
    return db
  } catch (error: any) {
    addLog('error', `数据库初始化失败: ${error.message}`)
    throw error
  }
}

// 运行完整验证
async function handleRunAll() {
  try {
    loading.value = true
    clearLogs()
    verificationResult.value = null

    addLog('info', '开始运行完整验证...')

    const db = await initDatabase()
    const { verifyMigration, formatVerificationReport } = await import('@/database/migration/migration-verification')

    const report = verifyMigration(db)

    verificationResult.value = report

    addLog('success', '==========================================')
    addLog('success', '验证报告')
    addLog('success', '==========================================')
    addLog(report.passed ? 'success' : 'error', `总体结果: ${report.passed ? '✅ 通过' : '❌ 失败'}`)
    addLog('info', `总检查项: ${report.summary.total}`)
    addLog('success', `通过: ${report.summary.passed}`)
    addLog('error', `失败: ${report.summary.failed}`)
    addLog('warn', `警告: ${report.summary.warnings}`)

    // 输出格式化报告到控制台
    console.log(formatVerificationReport(report))

    ElMessage.success(report.passed ? '验证通过！' : '验证失败，请查看详情')
  } catch (error: any) {
    addLog('error', `验证失败: ${error.message}`)
    ElMessage.error(`验证出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 验证数量匹配
async function handleVerifyCounts() {
  try {
    loading.value = true
    addLog('info', '验证数量匹配...')

    const db = await initDatabase()

    const equipmentCount = db.exec('SELECT COUNT(*) FROM equipment_catalog WHERE is_active = 1')[0]?.values[0]?.[0] || 0
    const resourceCount = db.exec(`SELECT COUNT(*) FROM sys_training_resource WHERE legacy_source = 'equipment_catalog' AND is_active = 1`)[0]?.values[0]?.[0] || 0

    const passed = equipmentCount === resourceCount

    addLog('info', `equipment_catalog: ${equipmentCount} 条`)
    addLog('info', `sys_training_resource: ${resourceCount} 条`)
    addLog(passed ? 'success' : 'error', `结果: ${passed ? '✅ 匹配' : '❌ 不匹配'}`)

    ElMessage.success(passed ? '数量匹配验证通过' : '数量不匹配')
  } catch (error: any) {
    addLog('error', `验证失败: ${error.message}`)
    ElMessage.error(`验证出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 验证关联完整性
async function handleVerifyIntegrity() {
  try {
    loading.value = true
    addLog('info', '验证关联完整性...')

    const db = await initDatabase()

    const orphanedResources = db.exec(`
      SELECT COUNT(*) FROM sys_training_resource r
      WHERE r.legacy_source = 'equipment_catalog'
      AND NOT EXISTS (SELECT 1 FROM equipment_catalog e WHERE e.id = r.legacy_id)
    `)[0]?.values[0]?.[0] || 0

    const orphanedTags = db.exec(`
      SELECT COUNT(*) FROM sys_tags t
      WHERE NOT EXISTS (SELECT 1 FROM sys_resource_tag_map m WHERE m.tag_id = t.id)
    `)[0]?.values[0]?.[0] || 0

    addLog('info', `孤儿资源: ${orphanedResources} 条`)
    addLog('info', `孤儿标签: ${orphanedTags} 个`)

    const passed = orphanedResources === 0 && orphanedTags === 0
    addLog(passed ? 'success' : 'warn', `结果: ${passed ? '✅ 完整' : '⚠️ 存在孤儿记录'}`)

    ElMessage.success(passed ? '关联完整性验证通过' : '存在孤儿记录')
  } catch (error: any) {
    addLog('error', `验证失败: ${error.message}`)
    ElMessage.error(`验证出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 数据一致性对比
async function handleCompareData() {
  try {
    loading.value = true
    addLog('info', '开始数据一致性对比...')

    const { CompatibilityAdapter } = await import('@/database/migration/compatibility-adapter')
    const adapter = new CompatibilityAdapter(false)

    const result = await adapter.compareData()

    addLog('info', `总记录数: ${result.summary.totalRecords}`)
    addLog('success', `匹配记录: ${result.summary.matchedRecords}`)
    addLog('error', `不匹配记录: ${result.summary.mismatchedRecords}`)
    addLog('warn', `新表缺失: ${result.summary.missingInNew}`)
    addLog('warn', `旧表缺失: ${result.summary.missingInOld}`)

    const report = adapter.generateComparisonReport(result)
    console.log(report)

    ElMessage.success(result.match ? '数据一致性验证通过' : '数据存在差异')
  } catch (error: any) {
    addLog('error', `对比失败: ${error.message}`)
    ElMessage.error(`对比出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 导出报告
async function handleExportReport() {
  try {
    if (!verificationResult.value) {
      ElMessage.warning('请先运行验证')
      return
    }

    const { formatVerificationReport } = await import('@/database/migration/migration-verification')
    const reportText = formatVerificationReport(verificationResult.value)

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `migration-verification-report-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addLog('success', '报告导出成功')
    ElMessage.success('报告导出成功')
  } catch (error: any) {
    addLog('error', `导出失败: ${error.message}`)
    ElMessage.error(`导出出错: ${error.message}`)
  }
}

// 双写模式切换
async function handleDualWriteToggle(enabled: boolean) {
  addLog('info', `双写模式: ${enabled ? '启用' : '禁用'}`)
  // 可以在这里设置全局双写标志
}

// 测试双写
async function handleTestDualWrite() {
  try {
    loading.value = true
    addLog('info', '测试双写...')

    const { CompatibilityAdapter } = await import('@/database/migration/compatibility-adapter')
    const adapter = new CompatibilityAdapter(true)

    const testData = {
      category: '测试',
      sub_category: '测试分类',
      name: `测试器材_${Date.now()}`,
      description: '用于测试双写功能的器材',
      ability_tags: ['测试', '双写'],
      image_url: '/images/test.jpg',
      is_active: 1
    }

    const result = await adapter.dualWriteEquipment(testData)
    dualWriteResult.value = result

    addLog('info', `旧表 ID: ${result.oldId}`)
    addLog('info', `新表 ID: ${result.newId}`)

    if (result.success) {
      addLog('success', '双写测试成功')
      ElMessage.success('双写测试成功')
    } else {
      addLog('error', `双写测试失败: ${result.error}`)
      ElMessage.error(`双写测试失败: ${result.error}`)
    }
  } catch (error: any) {
    addLog('error', `测试失败: ${error.message}`)
    ElMessage.error(`测试出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 运行诊断
async function handleRunDiagnostics() {
  try {
    loading.value = true
    addLog('info', '运行数据库诊断...')

    const db = await initDatabase()
    const { runDiagnostics, printDiagnosticReport } = await import('@/database/migration/diagnostic')

    const result = runDiagnostics()
    diagnosticResult.value = result

    printDiagnosticReport(result)

    addLog('info', `sys_ 表存在: ${result.sysTablesExist ? '✅' : '❌'}`)
    addLog('info', `equipment_catalog: ${result.equipmentCount} 条`)
    addLog('info', `sys_training_resource: ${result.resourceCount} 条`)
    addLog('info', `sys_tags: ${result.tagCount} 个`)

    if (result.issues.length > 0) {
      addLog('warn', `发现 ${result.issues.length} 个问题`)
      result.issues.forEach((issue: string) => {
        addLog('warn', `  - ${issue}`)
      })
    } else {
      addLog('success', '数据库状态正常，可以运行验证')
    }

    ElMessage.success(result.issues.length === 0 ? '诊断通过' : '发现问题，请查看详情')
  } catch (error: any) {
    addLog('error', `诊断失败: ${error.message}`)
    ElMessage.error(`诊断出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 前往迁移页面
function goToMigrationPage() {
  window.location.hash = '#/schema-migration'
}

onMounted(async () => {
  addLog('info', 'Phase 1.5 迁移验证工具已加载')
  // 自动运行诊断
  await handleRunDiagnostics()
})
</script>

<style scoped>
.migration-verification-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 24px;
}

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #f4f4f5;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.info-icon {
  color: #409eff;
  font-size: 20px;
  flex-shrink: 0;
}

.info-content {
  color: #606266;
  font-size: 14px;
}

.diagnostic-section {
  margin-bottom: 24px;
  border-radius: 8px;
  padding: 16px;
  border: 2px solid;
}

.diagnostic-section.warning {
  background: #fdf6ec;
  border-color: #e6a23c;
}

.diagnostic-section.success {
  background: #f0f9ff;
  border-color: #67c23a;
}

.diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.diagnostic-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  font-size: 14px;
}

.diagnostic-item .label {
  font-weight: 500;
  color: #606266;
}

.diagnostic-item .value {
  font-weight: 600;
  color: #303133;
}

.diagnostic-item .value.success {
  color: #67c23a;
}

.diagnostic-item .value.error {
  color: #f56c6c;
}

.diagnostic-issues {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
}

.issues-title,
.recommendations-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.issues-list,
.recommendations-list {
  margin: 8px 0 16px 0;
  padding-left: 20px;
}

.issues-list li {
  color: #e6a23c;
  margin: 4px 0;
}

.recommendations-list li {
  color: #606266;
  margin: 4px 0;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.overview-section,
.details-section,
.checks-section,
.recommendations-section,
.dual-write-section {
  margin-bottom: 24px;
}

h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 18px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.overview-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.card-value.success {
  color: #67c23a;
}

.card-value.error {
  color: #f56c6c;
}

.card-value.warning {
  color: #e6a23c;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
}

.detail-item .value {
  font-weight: 600;
}

.detail-item .value.error {
  color: #f56c6c;
}

.detail-item .value.warning {
  color: #e6a23c;
}

.check-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.check-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.check-icon.icon-passed {
  background: #f0f9ff;
  color: #67c23a;
}

.check-icon.icon-failed {
  background: #fef0f0;
  color: #f56c6c;
}

.check-name {
  flex: 1;
  font-weight: 500;
}

.check-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-critical {
  background: #fef0f0;
  color: #f56c6c;
}

.badge-warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.badge-info {
  background: #f4f4f5;
  color: #909399;
}

.check-content {
  padding: 12px 0;
}

.check-description {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.check-values {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.check-value {
  font-size: 13px;
}

.value-label {
  color: #909399;
}

.value-data {
  font-weight: 600;
  color: #303133;
}

.value-data.success {
  color: #67c23a;
}

.value-data.error {
  color: #f56c6c;
}

.check-status {
  padding: 8px;
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
}

.check-status.passed {
  background: #f0f9ff;
  color: #67c23a;
}

.check-status.failed {
  background: #fef0f0;
  color: #f56c6c;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
}

.rec-error {
  background: #fef0f0;
  color: #f56c6c;
  border-left: 4px solid #f56c6c;
}

.rec-warning {
  background: #fdf6ec;
  color: #e6a23c;
  border-left: 4px solid #e6a23c;
}

.rec-success {
  background: #f0f9ff;
  color: #67c23a;
  border-left: 4px solid #67c23a;
}

.dual-write-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.dual-write-result {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.result-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.result-item .value.success {
  color: #67c23a;
}

.result-item .value.error {
  color: #f56c6c;
}

.log-section {
  margin-top: 24px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-container {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.log-entry {
  padding: 4px 0;
  display: flex;
  gap: 8px;
  line-height: 1.5;
}

.log-time {
  color: #858585;
  min-width: 80px;
}

.log-level {
  color: #569cd6;
  min-width: 70px;
}

.log-message {
  color: #d4d4d4;
  flex: 1;
  word-break: break-all;
}

.log-entry.log-error .log-message {
  color: #f48771;
}

.log-entry.log-warn .log-message {
  color: #dcdcaa;
}

.log-entry.log-success .log-message {
  color: #6a9955;
}
</style>
