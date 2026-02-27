<template>
  <div class="worker-test">
    <div class="test-container">
      <h2>Database Worker 连接测试</h2>

      <div class="status-section">
        <div class="status-item">
          <span class="label">Worker 状态:</span>
          <span :class="['status', isConnected ? 'success' : 'error']">
            {{ isConnected ? '已连接' : '未连接' }}
          </span>
        </div>

        <div class="status-item" v-if="isConnected">
          <span class="label">内存使用:</span>
          <span class="value">{{ memoryUsage }} bytes</span>
        </div>

        <div class="status-item" v-if="isConnected">
          <span class="label">队列状态:</span>
          <span class="value">队列: {{ queueStatus.queueLength }}, 待处理: {{ queueStatus.pendingCount }}</span>
        </div>
      </div>

      <div class="actions">
        <button
          @click="handleInit"
          :disabled="isConnected"
          class="btn btn-primary"
        >
          1. 初始化 Worker
        </button>

        <button
          @click="handlePing"
          :disabled="!isConnected"
          class="btn"
        >
          2. 健康检查 (PING)
        </button>

        <button
          @click="handleSelectOne"
          :disabled="!isConnected"
          class="btn"
        >
          3. 执行 SELECT 1
        </button>

        <button
          @click="handleBatchQuery"
          :disabled="!isConnected"
          class="btn"
        >
          4. 批量查询测试
        </button>

        <button
          @click="handleClose"
          :disabled="!isConnected"
          class="btn btn-danger"
        >
          5. 关闭 Worker
        </button>
      </div>

      <div class="results">
        <h3>执行结果</h3>
        <div class="result-log" ref="logContainer">
          <div
            v-for="(log, index) in logs"
            :key="index"
            :class="['log-entry', log.type]"
          >
            <span class="timestamp">{{ log.timestamp }}</span>
            <span class="message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted, nextTick } from 'vue'
import { getDatabaseBridge, destroyDatabaseBridge } from '@/workers/db-bridge'

// 状态
const isConnected = ref(false)
const memoryUsage = ref(0)
const queueStatus = reactive({ queueLength: 0, pendingCount: 0 })
const logs = ref<Array<{ type: string; timestamp: string; message: string }>>([])
const logContainer = ref<HTMLElement | null>(null)

// DatabaseBridge 实例
let bridge: ReturnType<typeof getDatabaseBridge> | null = null

/**
 * 添加日志
 */
function addLog(type: 'info' | 'success' | 'error', message: string) {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.push({ type, timestamp, message })

  // 自动滚动到底部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

/**
 * 更新队列状态
 */
function updateStatus() {
  if (bridge) {
    const status = bridge.getQueueStatus()
    queueStatus.queueLength = status.queueLength
    queueStatus.pendingCount = status.pendingCount
  }
}

/**
 * 1. 初始化 Worker
 */
async function handleInit() {
  try {
    addLog('info', '正在初始化 Worker...')

    bridge = getDatabaseBridge()
    await bridge.init()

    isConnected.value = true
    addLog('success', 'Worker 初始化成功')

    // 执行健康检查
    const health = await bridge.ping()
    memoryUsage.value = health.memoryUsage
    addLog('success', `健康检查通过，内存使用: ${health.memoryUsage} bytes`)
  } catch (error: any) {
    addLog('error', `初始化失败: ${error.message}`)
    console.error(error)
  }
}

/**
 * 2. 健康检查
 */
async function handlePing() {
  try {
    addLog('info', '发送 PING...')

    const health = await bridge!.ping()
    memoryUsage.value = health.memoryUsage

    addLog('success', `PING 成功, ready=${health.ready}, memory=${health.memoryUsage} bytes`)
    updateStatus()
  } catch (error: any) {
    addLog('error', `PING 失败: ${error.message}`)
  }
}

/**
 * 3. 执行 SELECT 1
 */
async function handleSelectOne() {
  try {
    addLog('info', '执行 SELECT 1...')

    const result = await bridge!.query('SELECT 1 as value')

    addLog('success', `查询成功: ${JSON.stringify(result.rows)}`)
    updateStatus()
  } catch (error: any) {
    addLog('error', `SELECT 1 失败: ${error.message}`)
  }
}

/**
 * 4. 批量查询测试
 */
async function handleBatchQuery() {
  try {
    addLog('info', '执行批量查询（10 次 SELECT 1）...')

    const operations = Array.from({ length: 10 }, (_, i) => ({
      sql: 'SELECT ? as iteration',
      params: [i + 1]
    }))

    const startTime = performance.now()
    const results = await bridge!.batchQuery(operations)
    const duration = performance.now() - startTime

    addLog('success', `批量查询成功: ${results.length} 个结果, 耗时: ${duration.toFixed(2)}ms`)
    addLog('info', `第一个结果: ${JSON.stringify(results[0].rows)}`)
    updateStatus()
  } catch (error: any) {
    addLog('error', `批量查询失败: ${error.message}`)
  }
}

/**
 * 5. 关闭 Worker
 */
async function handleClose() {
  try {
    addLog('info', '正在关闭 Worker...')

    await bridge!.close()
    destroyDatabaseBridge()

    isConnected.value = false
    memoryUsage.value = 0
    bridge = null

    addLog('success', 'Worker 已关闭')
  } catch (error: any) {
    addLog('error', `关闭失败: ${error.message}`)
  }
}

// 清理
onUnmounted(() => {
  if (bridge && isConnected.value) {
    bridge.close().catch(console.error)
    destroyDatabaseBridge()
  }
})
</script>

<style scoped>
.worker-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}

h2 {
  margin-top: 0;
  color: #333;
}

h3 {
  margin-bottom: 10px;
  color: #666;
}

.status-section {
  background: white;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-weight: 600;
  color: #666;
}

.value {
  color: #333;
}

.status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.status.success {
  background: #d4edda;
  color: #155724;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.btn {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border-color: #dc3545;
}

.btn-danger:hover:not(:disabled) {
  background: #a71d2a;
}

.results {
  background: white;
  border-radius: 6px;
  padding: 15px;
}

.result-log {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  max-height: 300px;
  overflow-y: auto;
}

.log-entry {
  padding: 4px 0;
  display: flex;
  gap: 10px;
}

.log-entry .timestamp {
  color: #858585;
  min-width: 80px;
}

.log-entry.info .message {
  color: #569cd6;
}

.log-entry.success .message {
  color: #6a9955;
}

.log-entry.error .message {
  color: #f48771;
}
</style>
