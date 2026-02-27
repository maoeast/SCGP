/**
 * Electron Auto-Update Handlers
 *
 * 处理来自渲染进程的更新相关 IPC 请求
 * 基于 electron-updater 实现
 */

import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import fs from 'fs'
import path from 'path'

// 默认更新配置
const DEFAULT_FEED_CONFIG = {
  provider: 'github',
  owner: 'maoeast',
  repo: 'Self-Care-ATS'
}

// 加载更新配置
let feedConfig = { ...DEFAULT_FEED_CONFIG }

function loadUpdateConfig() {
  const configPath = path.join(app.getPath('userData'), 'update-config.json')

  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8')
      const userConfig = JSON.parse(configData)
      feedConfig = { ...DEFAULT_FEED_CONFIG, ...userConfig }
      console.log('[Update] 已加载用户更新配置:', feedConfig)
    } else {
      // 创建默认配置文件
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_FEED_CONFIG, null, 2))
      console.log('[Update] 已创建默认更新配置')
    }
  } catch (error) {
    console.error('[Update] 配置文件读取失败，使用默认配置:', error)
  }
}

// 初始化 autoUpdater
function initializeAutoUpdater() {
  loadUpdateConfig()

  // 配置更新服务器
  autoUpdater.setFeedURL(feedConfig)

  // 配置自动下载（设为 false，需要用户确认后才下载）
  autoUpdater.autoDownload = false

  // 配置自动安装为 App 更新后（Mac）
  autoUpdater.autoInstallOnAppQuit = false

  // ===== 事件监听器 =====

  // 当发现可用更新时
  autoUpdater.on('update-available', (info) => {
    console.log('[Update] 发现可用更新:', info)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update:update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      })
    }
  })

  // 当没有可用更新时
  autoUpdater.on('update-not-available', (info) => {
    console.log('[Update] 已是最新版本:', info.version)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update:update-not-available', {
        version: info.version
      })
    }
  })

  // 下载进度
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent)
    const speedMB = (progress.bytesPerSecond / 1024 / 1024).toFixed(2)
    console.log(`[Update] 下载进度: ${percent}% (${speedMB} MB/s)`)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update:download-progress', {
        percent,
        transferred: progress.transferred,
        total: progress.total,
        speed: speedMB
      })
    }
  })

  // 更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Update] 更新下载完成:', info)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update:update-downloaded', {
        version: info.version
      })
    }
  })

  // 错误处理
  autoUpdater.on('error', (error) => {
    console.error('[Update] 更新错误:', error)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update:error', {
        message: error.message || '未知错误',
        code: error.code
      })
    }
  })
}

// ===== IPC 处理器 =====

/**
 * 检查更新
 */
ipcMain.handle('update:check-for-updates', async () => {
  try {
    console.log('[Update] 开始检查更新...')
    const result = await autoUpdater.checkForUpdates()
    return {
      success: true,
      updateAvailable: result !== null,
      versionInfo: result ? result.updateInfo : null
    }
  } catch (error) {
    console.error('[Update] 检查更新失败:', error)
    return {
      success: false,
      error: error.message || '检查更新失败'
    }
  }
})

/**
 * 下载更新
 */
ipcMain.handle('update:download-update', async () => {
  try {
    console.log('[Update] 开始下载更新...')
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    console.error('[Update] 下载更新失败:', error)
    return {
      success: false,
      error: error.message || '下载更新失败'
    }
  }
})

/**
 * 退出并安装更新
 */
ipcMain.handle('update:quit-and-install', async () => {
  try {
    console.log('[Update] 准备退出并安装更新...')

    // 通知渲染进程准备退出
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update:before-quit')
    }

    // 给渲染进程一些时间保存数据（5秒超时）
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 5000)

      // 监听渲染进程的确认消息
      ipcMain.once('update:ready-to-quit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    // 退出并安装
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true)
    })

    return { success: true }
  } catch (error) {
    console.error('[Update] 退出安装失败:', error)
    return {
      success: false,
      error: error.message || '退出安装失败'
    }
  }
})

/**
 * 获取当前版本
 */
ipcMain.handle('update:get-current-version', () => {
  return app.getVersion()
})

/**
 * 跳过指定版本（保存到本地配置）
 */
ipcMain.handle('update:skip-version', async (_event, version) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'update-config.json')

    let config = { ...DEFAULT_FEED_CONFIG }
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      config = JSON.parse(data)
    }

    // 保存跳过的版本
    config.skippedVersion = version
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log('[Update] 已跳过版本:', version)
    return { success: true }
  } catch (error) {
    console.error('[Update] 跳过版本失败:', error)
    return {
      success: false,
      error: error.message || '跳过版本失败'
    }
  }
})

/**
 * 获取跳过的版本
 */
ipcMain.handle('update:get-skipped-version', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'update-config.json')

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(data)
      return {
        success: true,
        skippedVersion: config.skippedVersion || ''
      }
    }

    return { success: true, skippedVersion: '' }
  } catch (error) {
    return { success: false, skippedVersion: '' }
  }
})

/**
 * 设置自动更新开关
 */
ipcMain.handle('update:set-auto-update', async (_event, enabled) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'update-config.json')

    let config = { ...DEFAULT_FEED_CONFIG }
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      config = JSON.parse(data)
    }

    // 保存自动更新设置
    config.autoUpdate = enabled
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    console.log('[Update] 自动更新已', enabled ? '启用' : '禁用')
    return { success: true }
  } catch (error) {
    console.error('[Update] 设置自动更新失败:', error)
    return {
      success: false,
      error: error.message || '设置失败'
    }
  }
})

/**
 * 获取自动更新设置
 */
ipcMain.handle('update:get-auto-update', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'update-config.json')

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(data)
      return {
        success: true,
        enabled: config.autoUpdate !== false // 默认启用
      }
    }

    return { success: true, enabled: true }
  } catch (error) {
    return { success: false, enabled: true }
  }
})

/**
 * 渲染进程确认可以安全退出
 */
ipcMain.on('update:ready-to-quit', () => {
  // 处理器在 quit-and-install 中已经设置
})

// 初始化（在 app ready 后调用）
export function initUpdateHandlers() {
  initializeAutoUpdater()
  console.log('[Update] 更新处理器已初始化')
}
