<template>
  <el-dialog
    v-model="dialogVisible"
    title="关于"
    width="500px"
    center
    :close-on-click-modal="false"
  >
    <div class="about-content">
      <!-- 应用图标和名称 -->
      <div class="app-info">
        <div class="app-icon">🧠</div>
        <h2>SCGP / 星愿能力发展平台</h2>
        <p class="version">版本 {{ updateState.currentVersion }}</p>
        <p class="copyright">© 2013-2026 杭州炫灿科技有限公司</p>
      </div>

      <el-divider />

      <!-- 更新状态 -->
      <div class="update-section">
        <el-button
          class="check-btn"
          @click="handleCheckUpdate"
          :loading="updateState.isChecking"
          :disabled="updateState.isDownloading"
        >
          <el-icon><Refresh /></el-icon>
          检查更新
        </el-button>

        <!-- 检查结果提示 -->
        <div v-if="updateMessage" class="update-message">
          <el-alert
            :type="updateMessageType"
            :closable="false"
            show-icon
          >
            {{ updateMessage }}
          </el-alert>
        </div>

        <!-- 有更新可用 -->
        <div v-if="hasUpdate && !updateState.updateDownloaded" class="update-available">
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
            <div class="update-actions">
              <el-button type="primary" @click="handleDownloadUpdate">
                立即更新
              </el-button>
              <el-button @click="handleSkipVersion">跳过此版本</el-button>
              <el-button @click="dialogVisible = false">稍后</el-button>
            </div>
          </el-alert>
        </div>

        <!-- 下载中 -->
        <div v-if="updateState.isDownloading" class="downloading">
          <el-alert type="info" :closable="false">
            <template #title>正在下载更新... {{ updateState.downloadProgress }}%</template>
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
            <div class="update-actions">
              <el-button type="primary" @click="handleQuitAndInstall">
                立即重启
              </el-button>
              <el-button @click="dialogVisible = false">稍后手动重启</el-button>
            </div>
          </el-alert>
        </div>

        <!-- 错误提示 -->
        <div v-if="updateState.error" class="error-message">
          <el-alert type="error" :closable="false" show-icon>
            {{ updateState.error }}
            <el-button link type="primary" @click="handleCheckUpdate">
              重试
            </el-button>
          </el-alert>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button
          v-if="updateState.latestVersion && !updateState.isChecking"
          link
          @click="showReleaseNotes = true"
        >
          查看更新日志
        </el-button>
      </div>
    </template>

    <!-- 更新日志对话框 -->
    <el-dialog
      v-model="showReleaseNotes"
      title="更新日志"
      width="600px"
      append-to-body
    >
      <div class="full-release-notes">
        <div v-if="updateState.releaseNotes" v-html="formattedReleaseNotes"></div>
        <el-empty v-else description="暂无更新日志" />
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { useUpdateService, updateState } from '@/services/UpdateService'

const { checkForUpdates, downloadUpdate, quitAndInstall, skipVersion } =
  useUpdateService()

// 对话框显示状态
const dialogVisible = defineModel<boolean>({ required: true })

// 更新日志对话框
const showReleaseNotes = ref(false)

// 更新提示消息
const updateMessage = ref('')

// 消息类型
const updateMessageType = ref<'success' | 'info' | 'warning' | 'error'>('info')

// 是否有可用更新（且未跳过）
const hasUpdate = computed(() => {
  return (
    updateState.updateAvailable &&
    updateState.latestVersion !== updateState.skippedVersion
  )
})

// 格式化更新日志（Markdown 转 HTML）
const formattedReleaseNotes = computed(() => {
  if (!updateState.releaseNotes) return ''

  return updateState.releaseNotes
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/\n/g, '<br>')
})

// 监听更新状态变化，自动显示消息
watch(
  () => [updateState.updateAvailable, updateState.latestVersion, updateState.isChecking],
  ([available, latest, checking]) => {
    if (!checking && !available && latest && !updateState.error) {
      updateMessage.value = `当前已是最新版本 ${latest}`
      updateMessageType.value = 'success'
    } else if (!checking && !available && !latest) {
      updateMessage.value = ''
    }
  }
)

// 检查更新
async function handleCheckUpdate() {
  updateMessage.value = '正在检查更新...'
  updateMessageType.value = 'info'

  const hasUpdate = await checkForUpdates()

  if (!hasUpdate && !updateState.error) {
    updateMessage.value = `当前已是最新版本 ${updateState.currentVersion}`
    updateMessageType.value = 'success'
  } else if (hasUpdate) {
    updateMessage.value = ''
  }
}

// 下载更新
async function handleDownloadUpdate() {
  await downloadUpdate()
  updateMessage.value = ''
}

// 退出并安装
async function handleQuitAndInstall() {
  const success = await quitAndInstall()
  if (success) {
    dialogVisible.value = false
  }
}

// 跳过此版本
async function handleSkipVersion() {
  if (updateState.latestVersion) {
    await skipVersion(updateState.latestVersion)
    updateMessage.value = `已跳过版本 ${updateState.latestVersion}`
    updateMessageType.value = 'info'
  }
}
</script>

<style scoped>
.about-content {
  padding: 20px 0;
}

.app-info {
  text-align: center;
}

.app-icon {
  font-size: 64px;
  margin-bottom: 10px;
}

.app-info h2 {
  margin: 10px 0;
  font-size: 22px;
  color: var(--el-text-color-primary);
}

.version {
  margin: 8px 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.copyright {
  margin: 5px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.update-section {
  margin-top: 20px;
}

.check-btn {
  width: 100%;
  margin-bottom: 15px;
}

.update-message {
  margin-top: 15px;
}

.update-available {
  margin-top: 15px;
}

.release-notes {
  margin: 15px 0;
  padding: 10px;
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

.notes-content :deep(h3) {
  font-size: 14px;
  margin: 10px 0 5px;
}

.notes-content :deep(li) {
  margin-left: 20px;
}

.update-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  justify-content: center;
}

.downloading {
  margin-top: 15px;
}

.downloaded {
  margin-top: 15px;
}

.downloaded p {
  margin: 10px 0;
}

.error-message {
  margin-top: 15px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.full-release-notes {
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.8;
}

.full-release-notes :deep(h3) {
  margin-top: 15px;
  margin-bottom: 10px;
}

.full-release-notes :deep(li) {
  margin-left: 20px;
  margin-bottom: 5px;
}
</style>
