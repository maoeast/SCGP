/**
 * 更新服务 - 前端
 *
 * 封装更新相关的 IPC 调用，提供响应式状态
 */

import { reactive, computed, onMounted, onUnmounted } from 'vue'

// 更新状态接口
export interface UpdateState {
  // 版本信息
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean

  // 更新状态
  isChecking: boolean
  isDownloading: boolean
  downloadProgress: number // 0-100
  downloadSpeed: string
  updateDownloaded: boolean

  // 错误信息
  error: string | null

  // 配置
  autoUpdate: boolean
  skippedVersion: string

  // 更新日志
  releaseNotes: string
  releaseDate: string
}

// 全局响应式状态
const state = reactive<UpdateState>({
  currentVersion: '',
  latestVersion: '',
  updateAvailable: false,

  isChecking: false,
  isDownloading: false,
  downloadProgress: 0,
  downloadSpeed: '',
  updateDownloaded: false,

  error: null,

  autoUpdate: true,
  skippedVersion: '',

  releaseNotes: '',
  releaseDate: ''
})

// 事件监听器清理函数
let cleanupListeners: (() => void) | null = null

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  const listeners: Array<() => void> = []

  // 发现可用更新
  const handlerUpdateAvailable = (_event: any, data: { version: string; releaseNotes: string; releaseDate: string }) => {
    console.log('[UpdateService] 发现可用更新:', data)
    state.latestVersion = data.version
    state.releaseNotes = data.releaseNotes || ''
    state.releaseDate = data.releaseDate || ''
    state.updateAvailable = true
    state.isChecking = false
    state.error = null
  }
  window.electronAPI.on('update:update-available', handlerUpdateAvailable)
  listeners.push(() => window.electronAPI.off('update:update-available', handlerUpdateAvailable))

  // 没有可用更新
  const handlerUpdateNotAvailable = (_event: any, data: { version: string }) => {
    console.log('[UpdateService] 已是最新版本:', data.version)
    state.latestVersion = data.version
    state.updateAvailable = false
    state.isChecking = false
    state.error = null
  }
  window.electronAPI.on('update:update-not-available', handlerUpdateNotAvailable)
  listeners.push(() => window.electronAPI.off('update:update-not-available', handlerUpdateNotAvailable))

  // 下载进度
  const handlerDownloadProgress = (_event: any, data: { percent: number; speed: string }) => {
    console.log('[UpdateService] 下载进度:', data.percent + '%')
    state.downloadProgress = data.percent
    state.downloadSpeed = data.speed
    state.isDownloading = true
  }
  window.electronAPI.on('update:download-progress', handlerDownloadProgress)
  listeners.push(() => window.electronAPI.off('update:download-progress', handlerDownloadProgress))

  // 更新下载完成
  const handlerUpdateDownloaded = (_event: any, data: { version: string }) => {
    console.log('[UpdateService] 更新下载完成:', data.version)
    state.updateDownloaded = true
    state.isDownloading = false
    state.downloadProgress = 100
  }
  window.electronAPI.on('update:update-downloaded', handlerUpdateDownloaded)
  listeners.push(() => window.electronAPI.off('update:update-downloaded', handlerUpdateDownloaded))

  // 错误处理
  const handlerError = (_event: any, data: { message: string; code?: string }) => {
    console.error('[UpdateService] 更新错误:', data)
    state.error = formatErrorMessage(data)
    state.isChecking = false
    state.isDownloading = false
  }
  window.electronAPI.on('update:error', handlerError)
  listeners.push(() => window.electronAPI.off('update:error', handlerError))

  // 准备退出通知
  const handlerBeforeQuit = () => {
    console.log('[UpdateService] 准备退出...')
    // 通知主进程可以安全退出
    window.electronAPI.send('update:ready-to-quit')
  }
  window.electronAPI.on('update:before-quit', handlerBeforeQuit)
  listeners.push(() => window.electronAPI.off('update:before-quit', handlerBeforeQuit))

  // 返回清理函数
  cleanupListeners = () => {
    listeners.forEach((cleanup) => cleanup())
    cleanupListeners = null
  }
}

/**
 * 格式化错误消息
 */
function formatErrorMessage(data: { message: string; code?: string }): string {
  const errorMessages: Record<string, string> = {
    ERR_INTERNET_DISCONNECTED: '网络连接失败，请检查网络后重试',
    ERR_GITHUB_REQUEST_FAILED: '无法连接更新服务器，请稍后重试',
    ERR_DOWNLOAD_FAIL: '下载失败，请检查网络或稍后重试',
    ERR_UPDATE_FILE_NOT_FOUND: '更新文件损坏，请重新下载',
    ERR_OUT_OF_SPACE: '磁盘空间不足，请清理后重试',
    ERR_PERMISSIONS: '权限不足，请以管理员身份运行'
  }

  if (data.code && errorMessages[data.code]) {
    return errorMessages[data.code]
  }

  return data.message || '未知错误'
}

/**
 * 检查更新
 */
export async function checkForUpdates(): Promise<boolean> {
  if (state.isChecking || state.isDownloading) {
    return false
  }

  state.isChecking = true
  state.error = null

  try {
    const result = await window.electronAPI.invoke('update:check-for-updates')

    if (result.success) {
      state.currentVersion = await window.electronAPI.invoke('update:get-current-version')
      return result.updateAvailable
    } else {
      state.error = result.error || '检查更新失败'
      state.isChecking = false
      return false
    }
  } catch (error: any) {
    console.error('[UpdateService] 检查更新失败:', error)
    state.error = error.message || '检查更新失败'
    state.isChecking = false
    return false
  }
}

/**
 * 下载更新
 */
export async function downloadUpdate(): Promise<boolean> {
  if (state.isDownloading || state.updateDownloaded) {
    return false
  }

  state.isDownloading = true
  state.error = null
  state.downloadProgress = 0

  try {
    const result = await window.electronAPI.invoke('update:download-update')

    if (!result.success) {
      state.error = result.error || '下载更新失败'
      state.isDownloading = false
      return false
    }

    return true
  } catch (error: any) {
    console.error('[UpdateService] 下载更新失败:', error)
    state.error = error.message || '下载更新失败'
    state.isDownloading = false
    return false
  }
}

/**
 * 退出并安装更新
 */
export async function quitAndInstall(): Promise<boolean> {
  try {
    const result = await window.electronAPI.invoke('update:quit-and-install')
    return result.success
  } catch (error: any) {
    console.error('[UpdateService] 退出安装失败:', error)
    state.error = error.message || '退出安装失败'
    return false
  }
}

/**
 * 跳过指定版本
 */
export async function skipVersion(version: string): Promise<boolean> {
  try {
    const result = await window.electronAPI.invoke('update:skip-version', version)
    if (result.success) {
      state.skippedVersion = version
      state.updateAvailable = false
    }
    return result.success
  } catch (error: any) {
    console.error('[UpdateService] 跳过版本失败:', error)
    return false
  }
}

/**
 * 获取自动更新设置
 */
export async function getAutoUpdateSetting(): Promise<boolean> {
  try {
    const result = await window.electronAPI.invoke('update:get-auto-update')
    if (result.success) {
      state.autoUpdate = result.enabled
    }
    return result.enabled
  } catch (error) {
    console.error('[UpdateService] 获取自动更新设置失败:', error)
    return true
  }
}

/**
 * 设置自动更新开关
 */
export async function setAutoUpdate(enabled: boolean): Promise<boolean> {
  try {
    const result = await window.electronAPI.invoke('update:set-auto-update', enabled)
    if (result.success) {
      state.autoUpdate = enabled
    }
    return result.success
  } catch (error: any) {
    console.error('[UpdateService] 设置自动更新失败:', error)
    return false
  }
}

/**
 * 初始化更新服务
 */
export async function initUpdateService(): Promise<void> {
  // 获取当前版本
  state.currentVersion = await window.electronAPI.invoke('update:get-current-version')

  // 获取跳过的版本
  const skipResult = await window.electronAPI.invoke('update:get-skipped-version')
  if (skipResult.success) {
    state.skippedVersion = skipResult.skippedVersion
  }

  // 获取自动更新设置
  await getAutoUpdateSetting()

  // 设置事件监听器
  setupEventListeners()

  // 如果启用了自动更新，延迟检查（30秒后）
  if (state.autoUpdate) {
    setTimeout(async () => {
      await checkForUpdates()
    }, 30000)
  }

  console.log('[UpdateService] 更新服务已初始化')
}

/**
 * 清理更新服务
 */
export function cleanupUpdateService() {
  if (cleanupListeners) {
    cleanupListeners()
  }
}

/**
 * 使用更新服务的 Composable
 */
export function useUpdateService() {
  onMounted(async () => {
    if (!state.currentVersion) {
      await initUpdateService()
    }
  })

  onUnmounted(() => {
    // 不清理，因为事件监听器是全局的
  })

  // 计算属性
  const hasUpdate = computed(() => state.updateAvailable && state.latestVersion !== state.skippedVersion)
  const canDownload = computed(() => state.updateAvailable && !state.isDownloading && !state.updateDownloaded)
  const canInstall = computed(() => state.updateDownloaded)

  return {
    // 状态
    state,

    // 计算属性
    hasUpdate,
    canDownload,
    canInstall,

    // 方法
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
    skipVersion,
    setAutoUpdate
  }
}

// 导出状态供其他组件使用
export { state as updateState }
