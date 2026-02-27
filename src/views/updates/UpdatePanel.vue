<template>
  <div class="update-panel">
    <el-card header="软件更新">
      <!-- 版本信息 -->
      <el-descriptions :column="2" border class="version-info">
        <el-descriptions-item label="当前版本">
          <el-tag type="info">{{ updateState.currentVersion || '加载中...' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最新版本">
          <el-tag v-if="updateState.latestVersion" type="success">
            {{ updateState.latestVersion }}
          </el-tag>
          <span v-else class="text-placeholder">未检查</span>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button
          type="primary"
          @click="handleCheckUpdate"
          :loading="updateState.isChecking"
          :disabled="updateState.isDownloading"
        >
          <el-icon><Refresh /></el-icon>
          检查更新
        </el-button>
      </div>

      <!-- 更新状态 -->
      <div v-if="hasUpdate" class="update-status">
        <el-alert type="success" :closable="false" show-icon>
          <template #title>
            发现新版本 {{ updateState.latestVersion }}
          </template>

          <!-- 更新日志 -->
          <div v-if="updateState.releaseNotes" class="release-notes">
            <div class="notes-label">更新内容：</div>
            <div class="notes-content" v-html="formattedReleaseNotes"></div>
          </div>

          <!-- 操作按钮 -->
          <div class="actions">
            <el-button type="primary" @click="handleDownloadUpdate" :disabled="updateState.isDownloading">
              <el-icon><Download /></el-icon>
              下载更新
            </el-button>
            <el-button @click="handleSkipVersion" :disabled="updateState.isDownloading">
              <el-icon><Hide /></el-icon>
              跳过此版本
            </el-button>
          </div>
        </el-alert>
      </div>

      <!-- 下载进度 -->
      <div v-if="updateState.isDownloading" class="download-progress">
        <el-alert type="info" :closable="false">
          <template #title>
            正在下载更新... {{ updateState.downloadProgress }}%
          </template>
          <el-progress
            :percentage="updateState.downloadProgress"
            :status="updateState.error ? 'exception' : undefined"
          >
            <span>{{ updateState.downloadSpeed }}</span>
          </el-progress>
        </el-alert>
      </div>

      <!-- 下载完成 -->
      <div v-if="updateState.updateDownloaded" class="downloaded">
        <el-alert type="success" :closable="false" show-icon>
          <template #title>更新已下载完成</template>
          <p>重启应用以完成安装</p>
          <div class="actions">
            <el-button type="primary" @click="handleQuitAndInstall">
              <el-icon><Right /></el-icon>
              立即重启
            </el-button>
          </div>
        </el-alert>
      </div>

      <!-- 已是最新版本 -->
      <div v-if="!hasUpdate && updateState.latestVersion && !updateState.isChecking" class="up-to-date">
        <el-alert type="success" :closable="false" show-icon>
          当前已是最新版本
        </el-alert>
      </div>

      <!-- 错误提示 -->
      <div v-if="updateState.error" class="error-message">
        <el-alert type="error" :closable="false" show-icon>
          {{ updateState.error }}
        </el-alert>
      </div>

      <!-- 跳过的版本 -->
      <div v-if="updateState.skippedVersion" class="skipped-version">
        <el-alert type="warning" :closable="false">
          <template #title>
            已跳过版本 {{ updateState.skippedVersion }}
          </template>
          <el-button link type="primary" @click="handleClearSkip">
            清除跳过设置
          </el-button>
        </el-alert>
      </div>

      <el-divider />

      <!-- 自动更新设置 -->
      <div class="auto-update-setting">
        <el-switch
          v-model="autoUpdateEnabled"
          @change="handleAutoUpdateChange"
          :loading="isSettingAutoUpdate"
        />
        <span class="setting-label">自动检查更新（启动时）</span>
      </div>

      <!-- 操作日志 -->
      <div class="operation-log">
        <el-collapse>
          <el-collapse-item title="操作日志" name="log">
            <div class="log-content">
              <div v-for="(log, index) in operationLogs" :key="index" class="log-item">
                <span class="log-time">{{ log.time }}</span>
                <span :class="['log-type', log.type]">[{{ log.type }}]</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
              <el-empty v-if="operationLogs.length === 0" description="暂无日志" :image-size="60" />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Refresh, Download, Hide, Right } from '@element-plus/icons-vue'
import { useUpdateService, updateState } from '@/services/UpdateService'

const {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  skipVersion,
  setAutoUpdate
} = useUpdateService()

// 自动更新开关
const autoUpdateEnabled = ref(updateState.autoUpdate)
const isSettingAutoUpdate = ref(false)

// 操作日志
interface OperationLog {
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}
const operationLogs = ref<OperationLog[]>([])

// 添加日志
function addLog(type: OperationLog['type'], message: string) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  operationLogs.value.unshift({ time, type, message })
  // 只保留最近 20 条
  if (operationLogs.value.length > 20) {
    operationLogs.value = operationLogs.value.slice(0, 20)
  }
}

// 是否有可用更新
const hasUpdate = computed(() => {
  return (
    updateState.updateAvailable &&
    updateState.latestVersion !== updateState.skippedVersion
  )
})

// 格式化更新日志
const formattedReleaseNotes = computed(() => {
  if (!updateState.releaseNotes) return ''
  return updateState.releaseNotes
    .replace(/### (.*)/g, '<strong>$1</strong>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/\n/g, '<br>')
})

// 检查更新
async function handleCheckUpdate() {
  addLog('info', '开始检查更新...')
  const hasUpdate = await checkForUpdates()

  if (hasUpdate) {
    addLog('success', `发现新版本 ${updateState.latestVersion}`)
  } else if (!updateState.error) {
    addLog('success', `当前已是最新版本 ${updateState.currentVersion}`)
  } else {
    addLog('error', `检查更新失败: ${updateState.error}`)
  }
}

// 下载更新
async function handleDownloadUpdate() {
  addLog('info', '开始下载更新...')
  await downloadUpdate()

  if (updateState.error) {
    addLog('error', `下载失败: ${updateState.error}`)
  }
}

// 退出并安装
async function handleQuitAndInstall() {
  addLog('info', '准备重启并安装更新...')
  const success = await quitAndInstall()
  if (success) {
    addLog('success', '应用将重启...')
  } else {
    addLog('error', `重启失败: ${updateState.error}`)
  }
}

// 跳过版本
async function handleSkipVersion() {
  if (updateState.latestVersion) {
    await skipVersion(updateState.latestVersion)
    addLog('info', `已跳过版本 ${updateState.latestVersion}`)
  }
}

// 清除跳过设置
async function handleClearSkip() {
  await skipVersion('')
  addLog('info', '已清除跳过设置')
}

// 自动更新开关变更
async function handleAutoUpdateChange(enabled: boolean) {
  isSettingAutoUpdate.value = true
  const success = await setAutoUpdate(enabled)
  if (success) {
    addLog('info', `自动更新已${enabled ? '启用' : '禁用'}`)
  } else {
    // 恢复开关状态
    autoUpdateEnabled.value = !enabled
    addLog('error', '设置自动更新失败')
  }
  isSettingAutoUpdate.value = false
}

// 监听下载完成
watch(() => updateState.updateDownloaded, (downloaded) => {
  if (downloaded) {
    addLog('success', '更新下载完成')
  }
})

// 监听下载进度
watch(() => updateState.downloadProgress, (progress) => {
  if (progress > 0 && progress < 100 && updateState.isDownloading) {
    addLog('info', `下载进度: ${progress}%`)
  }
})
</script>

<style scoped>
.update-panel {
  padding: 0;
}

.version-info {
  margin-bottom: 20px;
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.update-status {
  margin-bottom: 15px;
}

.release-notes {
  margin: 15px 0;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
}

.notes-label {
  font-weight: bold;
  margin-bottom: 8px;
}

.notes-content {
  line-height: 1.6;
}

.notes-content :deep(strong) {
  display: block;
  margin-top: 8px;
}

.notes-content :deep(li) {
  margin-left: 20px;
}

.download-progress {
  margin-bottom: 15px;
}

.downloaded {
  margin-bottom: 15px;
}

.downloaded p {
  margin: 10px 0;
}

.up-to-date {
  margin-bottom: 15px;
}

.error-message {
  margin-bottom: 15px;
}

.skipped-version {
  margin-bottom: 15px;
}

.auto-update-setting {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.setting-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.operation-log {
  margin-top: 15px;
}

.log-content {
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.log-time {
  color: var(--el-text-color-secondary);
  min-width: 60px;
}

.log-type {
  font-weight: bold;
  min-width: 50px;
}

.log-type.info {
  color: var(--el-color-info);
}

.log-type.success {
  color: var(--el-color-success);
}

.log-type.warning {
  color: var(--el-color-warning);
}

.log-type.error {
  color: var(--el-color-danger);
}

.log-message {
  flex: 1;
  color: var(--el-text-color-regular);
}
</style>
