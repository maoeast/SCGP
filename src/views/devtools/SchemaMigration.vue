<template>
  <div class="schema-migration-page">
    <div class="container">
      <h1>Schema Migration - 2.0 架构迁移</h1>

      <div class="warning-banner">
        <el-icon class="warning-icon"><Warning /></el-icon>
        <div class="warning-content">
          <strong>重要提示：</strong>此操作将修改数据库结构，请确保已备份！
        </div>
      </div>

      <!-- 状态显示 -->
      <div class="status-section">
        <div class="status-item">
          <span class="label">数据库状态：</span>
          <span :class="['status', dbStatusClass]">{{ dbStatusText }}</span>
        </div>
        <div class="status-item">
          <span class="label">迁移状态：</span>
          <span :class="['status', migrationStatusClass]">{{ migrationStatusText }}</span>
        </div>
        <div class="status-item">
          <span class="label">FTS5 支持：</span>
          <span :class="['status', fts5StatusClass]">{{ fts5StatusText }}</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button
          type="primary"
          :loading="loading"
          :disabled="!dbReady || migrationCompleted"
          @click="handleMigrate"
        >
          1. 执行迁移
        </el-button>
        <el-button
          type="success"
          :loading="loading"
          :disabled="!migrationCompleted"
          @click="handleVerify"
        >
          2. 验证结果
        </el-button>
        <el-button
          type="danger"
          :loading="loading"
          :disabled="!migrationCompleted"
          @click="handleRollback"
        >
          3. 回滚迁移
        </el-button>
        <el-button
          @click="handleExport"
          :disabled="!dbReady"
        >
          导出数据库
        </el-button>
      </div>

      <!-- 迁移步骤 -->
      <div v-if="migrationSteps.length > 0" class="steps-section">
        <h3>迁移步骤</h3>
        <el-timeline>
          <el-timeline-item
            v-for="(step, index) in migrationSteps"
            :key="index"
            :type="getStepType(step.status)"
            :icon="getStepIcon(step.status)"
          >
            <div class="step-content">
              <div class="step-title">{{ step.step }}</div>
              <div class="step-status" :class="'status-' + step.status">{{ step.status }}</div>
              <div v-if="step.details" class="step-details">
                {{ formatStepDetails(step.details) }}
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- 验证结果 -->
      <div v-if="verificationResult" class="verification-section">
        <h3>验证结果</h3>
        <div class="verification-grid">
          <div class="verification-item">
            <span class="label">equipment_catalog 原始数量：</span>
            <span class="value">{{ verificationResult.equipmentCount }}</span>
          </div>
          <div class="verification-item">
            <span class="label">sys_training_resource 迁移数量：</span>
            <span class="value">{{ verificationResult.resourceCount }}</span>
          </div>
          <div class="verification-item">
            <span class="label">sys_tags 标签数量：</span>
            <span class="value">{{ verificationResult.tagCount }}</span>
          </div>
          <div class="verification-item">
            <span class="label">sys_favorites 收藏数量：</span>
            <span class="value">{{ verificationResult.favoriteCount }}</span>
          </div>
          <div class="verification-item full-width">
            <span class="label">数量对比：</span>
            <span :class="['value', verificationResult.passed ? 'success' : 'error']">
              {{ verificationResult.passed ? '✅ 通过' : '❌ 不匹配' }}
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'

// 状态
const loading = ref(false)
const dbReady = ref(false)
const migrationCompleted = ref(false)
const logs = ref<Array<{ time: string; level: string; message: string }>>([])
const migrationSteps = ref<Array<{ step: string; status: string; details?: any }>>([])
const verificationResult = ref<any>(null)
const fts5Supported = ref<boolean | null>(null)

const logContainer = ref<HTMLElement>()

// 计算属性
const dbStatusText = computed(() => dbReady.value ? '已连接' : '未初始化')
const dbStatusClass = computed(() => dbReady.value ? 'success' : 'error')
const migrationStatusText = computed(() => {
  if (!migrationCompleted.value) return '未执行'
  return verificationResult.value?.passed ? '成功' : '失败'
})
const migrationStatusClass = computed(() => {
  if (!migrationCompleted.value) return 'pending'
  return verificationResult.value?.passed ? 'success' : 'error'
})
const fts5StatusText = computed(() => {
  if (fts5Supported.value === null) return '未知'
  return fts5Supported.value ? '支持' : '不支持'
})
const fts5StatusClass = computed(() => {
  if (fts5Supported.value === null) return 'pending'
  return fts5Supported.value ? 'success' : 'warning'
})

// 日志函数
function addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
  const time = new Date().toLocaleTimeString()
  logs.value.push({ time, level, message })

  // 自动滚动到底部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })

  // 同时输出到控制台
  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
  console[consoleMethod](`[${time}] [${level.toUpperCase()}] ${message}`)
}

function clearLogs() {
  logs.value = []
}

// 格式化步骤详情
function formatStepDetails(details: any): string {
  if (typeof details === 'object') {
    return JSON.stringify(details, null, 2)
  }
  return String(details)
}

// 获取步骤类型
function getStepType(status: string): 'success' | 'warning' | 'danger' | 'primary' {
  if (status === '成功' || status === '通过') return 'success'
  if (status === '失败') return 'danger'
  if (status === '不支持（降级）') return 'warning'
  return 'primary'
}

// 获取步骤图标
function getStepIcon(status: string) {
  // 可以根据状态返回不同的图标
  return undefined
}

// 初始化数据库
async function initDatabase() {
  try {
    addLog('info', '正在初始化数据库...')

    // 使用主应用的数据库（SQLWrapper），确保能看到完整的62条器材数据
    const { getDatabase, initDatabase: initMainDb } = await import('@/database/init')

    // 确保主数据库已初始化
    await initMainDb()

    // 获取主应用的数据库实例（SQLWrapper 包装的）
    const sqlWrapper = getDatabase()

    // 获取原始 sql.js Database 对象（供迁移脚本使用）
    const rawDb = sqlWrapper.getRawDB()

    addLog('success', '数据库加载成功')

    // 检查表是否存在
    try {
      const tables = rawDb.exec("SELECT name FROM sqlite_master WHERE type='table'")
      const tableNames = tables[0]?.values.map((row: any[]) => row[0]) || []
      addLog('info', `当前数据库包含 ${tableNames.length} 个表: ${tableNames.join(', ')}`)

      // 检查是否有 equipment_catalog 表
      const hasEquipmentCatalog = tableNames.includes('equipment_catalog')
      if (hasEquipmentCatalog) {
        const count = rawDb.exec('SELECT COUNT(*) FROM equipment_catalog')
        const countValue = count[0]?.values[0]?.[0] || 0
        addLog('info', `equipment_catalog 表包含 ${countValue} 条记录`)
      } else {
        addLog('warn', 'equipment_catalog 表不存在，迁移可能会失败')
      }
    } catch (error) {
      addLog('warn', '无法检查表结构')
    }

    dbReady.value = true
    addLog('success', '数据库初始化完成')

    // 同时返回 SQLWrapper 和原始 Database 实例
    return { db: rawDb, sqlWrapper }
  } catch (error: any) {
    addLog('error', `数据库初始化失败: ${error.message}`)
    throw error
  }
}

// 执行迁移
async function handleMigrate() {
  try {
    loading.value = true
    clearLogs()
    migrationSteps.value = []
    verificationResult.value = null

    addLog('info', '==========================================')
    addLog('info', '  开始执行 Schema 迁移')
    addLog('info', '==========================================')

    // 初始化数据库
    const { db, sqlWrapper } = await initDatabase()

    // 动态导入迁移模块
    addLog('info', '加载迁移模块...')
    const { migrateSchema } = await import('@/database/migration/schema-migration')

    // 创建日志回调
    const onLog = (level: 'info' | 'warn' | 'error' | 'success', message: string) => {
      addLog(level, message)
    }

    // 执行迁移
    addLog('info', '开始执行迁移...')
    const result = await migrateSchema(db, {
      forceBackup: true,
      skipVerification: false,
      onLog
    })

    // 更新状态
    migrationSteps.value = result.steps
    fts5Supported.value = result.summary.fts5Supported

    if (result.success) {
      migrationCompleted.value = true
      addLog('success', '==========================================')
      addLog('success', '  迁移执行完成！')
      addLog('success', '==========================================')

      // 保存数据库（使用项目的存储机制）
      try {
        const data = db.export()
        const { indexedDBStorage } = await import('@/database/indexeddb-storage')
        await indexedDBStorage.save(data)
        addLog('success', '数据库已保存到 IndexedDB')

        // 如果在 Electron 环境，也保存到本地文件
        if ((window as any).electronAPI) {
          try {
            const electronAPI = (window as any).electronAPI
            const userDataPath = await electronAPI.getUserDataPath()
            const backupPath = `${userDataPath}/database_backup.db`
            const result = await electronAPI.writeDatabaseFile(backupPath, data)
            if (result.success) {
              addLog('success', '数据库已同步到本地文件')
            }
          } catch (e) {
            addLog('warn', '同步到本地文件失败: ' + (e as Error).message)
          }
        }
      } catch (error) {
        addLog('warn', '保存数据库失败: ' + (error as Error).message)
      }

      ElMessage.success('迁移执行成功！')
    } else {
      addLog('error', '迁移执行失败')
      if (result.errors.length > 0) {
        result.errors.forEach((err, i) => {
          addLog('error', `错误 ${i + 1}: ${err}`)
        })
      }
      ElMessage.error('迁移执行失败，请查看日志')
    }
  } catch (error: any) {
    addLog('error', `迁移过程出错: ${error.message}`)
    ElMessage.error(`迁移出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 验证结果
async function handleVerify() {
  try {
    loading.value = true
    addLog('info', '开始验证迁移结果...')

    const { db } = await initDatabase()

    // 统计原始数量
    const equipmentResult = db.exec('SELECT COUNT(*) as count FROM equipment_catalog')
    const equipmentCount = equipmentResult[0]?.values[0]?.[0] || 0

    // 统计迁移后的数量
    const resourceResult = db.exec(`
      SELECT COUNT(*) as count FROM sys_training_resource
      WHERE legacy_source = 'equipment_catalog'
    `)
    const resourceCount = resourceResult[0]?.values[0]?.[0] || 0

    // 统计标签数量
    const tagResult = db.exec('SELECT COUNT(*) as count FROM sys_tags')
    const tagCount = tagResult[0]?.values[0]?.[0] || 0

    // 统计收藏夹数量
    const favoriteResult = db.exec('SELECT COUNT(*) as count FROM sys_favorites')
    const favoriteCount = favoriteResult[0]?.values[0]?.[0] || 0

    verificationResult.value = {
      equipmentCount,
      resourceCount,
      tagCount,
      favoriteCount,
      passed: equipmentCount === resourceCount && resourceCount > 0
    }

    addLog('info', '========== 验证结果 ==========')
    addLog('info', `equipment_catalog 原始数量: ${equipmentCount}`)
    addLog('info', `sys_training_resource 迁移数量: ${resourceCount}`)
    addLog('info', `sys_tags 标签数量: ${tagCount}`)
    addLog('info', `sys_favorites 收藏数量: ${favoriteCount}`)
    addLog('info', `数量对比: ${equipmentCount === resourceCount ? '✅ 通过' : '❌ 不匹配'}`)

    if (verificationResult.value.passed) {
      ElMessage.success('验证通过！')
    } else {
      ElMessage.warning('验证失败：数量不匹配')
    }
  } catch (error: any) {
    addLog('error', `验证失败: ${error.message}`)
    ElMessage.error(`验证出错: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 回滚迁移
async function handleRollback() {
  try {
    await ElMessageBox.confirm(
      '确定要回滚迁移吗？这将删除所有 sys_ 表及其数据。',
      '确认回滚',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    addLog('info', '开始回滚迁移...')

    const { db } = await initDatabase()

    // 动态导入迁移模块
    const { rollbackMigration } = await import('@/database/migration/schema-migration')

    rollbackMigration(db)

    // 保存数据库
    try {
      const data = db.export()
      const { indexedDBStorage } = await import('@/database/indexeddb-storage')
      await indexedDBStorage.save(data)
      addLog('success', '数据库已保存到 IndexedDB')

      // 如果在 Electron 环境，也保存到本地文件
      if ((window as any).electronAPI) {
        try {
          const electronAPI = (window as any).electronAPI
          const userDataPath = await electronAPI.getUserDataPath()
          const backupPath = `${userDataPath}/database_backup.db`
          const result = await electronAPI.writeDatabaseFile(backupPath, data)
          if (result.success) {
            addLog('success', '数据库已同步到本地文件')
          }
        } catch (e) {
          addLog('warn', '同步到本地文件失败')
        }
      }
    } catch (error) {
      addLog('warn', '保存数据库失败: ' + (error as Error).message)
    }

    migrationCompleted.value = false
    verificationResult.value = null
    fts5Supported.value = null

    addLog('success', '回滚完成')
    ElMessage.success('回滚成功！')
  } catch (error: any) {
    if (error !== 'cancel') {
      addLog('error', `回滚失败: ${error.message}`)
      ElMessage.error(`回滚出错: ${error.message}`)
    }
  } finally {
    loading.value = false
  }
}

// 导出数据库
async function handleExport() {
  try {
    const { db } = await initDatabase()
    const data = db.export()

    // 创建下载链接
    const blob = new Blob([data], { type: 'application/x-sqlite3' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sic-ads-db-${Date.now()}.sqlite`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addLog('success', '数据库导出成功')
    ElMessage.success('数据库导出成功！')
  } catch (error: any) {
    addLog('error', `导出失败: ${error.message}`)
    ElMessage.error(`导出出错: ${error.message}`)
  }
}

onMounted(async () => {
  addLog('info', 'Schema Migration 工具已加载')
  addLog('info', '正在初始化数据库连接...')

  try {
    await initDatabase()
    addLog('success', '数据库连接已就绪，可以开始迁移')
  } catch (error) {
    addLog('error', '数据库初始化失败: ' + (error as Error).message)
  }
})
</script>

<style scoped>
.schema-migration-page {
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

.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.warning-icon {
  color: #f56c6c;
  font-size: 20px;
  flex-shrink: 0;
}

.warning-content {
  color: #606266;
  font-size: 14px;
}

.status-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.label {
  font-weight: 600;
  color: #606266;
}

.status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.status.success {
  background: #f0f9ff;
  color: #67c23a;
}

.status.error {
  background: #fef0f0;
  color: #f56c6c;
}

.status.pending {
  background: #f4f4f5;
  color: #909399;
}

.status.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.steps-section,
.verification-section {
  margin-bottom: 20px;
}

h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}

.step-content {
  padding: 8px 0;
}

.step-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.step-status {
  font-size: 13px;
  margin-bottom: 4px;
}

.step-status.status-成功,
.step-status.status-通过 {
  color: #67c23a;
}

.step-status.status-失败 {
  color: #f56c6c;
}

.step-details {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.verification-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.verification-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.verification-item.full-width {
  grid-column: 1 / -1;
}

.verification-item .value {
  font-weight: 600;
}

.verification-item .value.success {
  color: #67c23a;
}

.verification-item .value.error {
  color: #f56c6c;
}

.log-section {
  margin-top: 20px;
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
  max-height: 400px;
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
