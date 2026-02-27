import { app, BrowserWindow, ipcMain, dialog, shell, protocol } from 'electron'
import path from 'path'
import { promises as fs } from 'fs'
import fsSync from 'fs'  // 添加同步 fs 模块
import crypto from 'crypto'
import os from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// 在 ES 模块中获取 __dirname 和 __filename
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ========== 软件更新功能 ==========
// 延迟加载 electron-updater
let initUpdateHandlers = null
let updateHandlersLoaded = false

async function loadUpdateHandlers() {
  if (updateHandlersLoaded) return
  try {
    const updateHandlersModule = await import('./handlers/update.js')
    initUpdateHandlers = updateHandlersModule.initUpdateHandlers
    updateHandlersLoaded = true
    console.log('[Update] 更新处理器模块已加载')
  } catch (error) {
    console.warn('[Update] electron-updater 未安装或更新处理器模块加载失败:', error.message)
    console.warn('[Update] 自动更新功能将不可用，请安装 electron-updater: npm install electron-updater --save')
  }
}

// 更可靠的开发环境检测：通过 app.isPackaged 或命令行参数判断
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development'
if (isDev) {
  console.log('Electron 运行模式: 开发模式')
  // 开发环境：忽略自签名证书错误（用于 HTTPS 开发服务器）
  app.commandLine.appendSwitch('ignore-certificate-errors')
  app.commandLine.appendSwitch('allow-insecure-localhost', 'true')
}

/**
 * 安全日志输出 - 防止 EPIPE (broken pipe) 错误
 * 当 stdout/stderr 管道断开时，console.log 会抛出 EPIPE 异常
 * 此函数包装所有日志调用以防止应用崩溃
 */
function safeLog(...args) {
  try {
    console.log(...args)
  } catch (e) {
    // 忽略 EPIPE 错误，静默失败
    if (e.code !== 'EPIPE') {
      // 非 EPIPE 错误尝试写入 stderr
      try { console.error('safeLog error:', e.message) } catch {}
    }
  }
}

function safeError(...args) {
  try {
    console.error(...args)
  } catch (e) {
    // 完全静默失败
  }
}

// ========== Phase 2.1: resource:// 协议注册 ==========

/**
 * 安全路径校验 - 防止目录遍历攻击
 * @param {string} requestPath - 请求的路径
 * @returns {boolean} - 路径是否安全
 */
function isValidResourcePath(requestPath) {
  if (!requestPath || typeof requestPath !== 'string') {
    return false
  }

  // 解码 URL 编码的路径
  const decodedPath = decodeURIComponent(requestPath)

  // 检查路径遍历攻击
  if (decodedPath.includes('..') || decodedPath.includes('\\') || decodedPath.includes('~')) {
    console.warn('[Security] 检测到潜在的路径遍历攻击:', decodedPath)
    return false
  }

  // 允许字母、数字、中文、下划线、连字符、点、空格和斜杠
  // \u4e00-\u9fff 匹配中文汉字，\u3000-\u303f 匹配中文标点
  const validPathPattern = /^[\u4e00-\u9fff\u3000-\u303fa-zA-Z0-9_./\-\s]+$/
  if (!validPathPattern.test(decodedPath)) {
    console.warn('[Security] 检测到非法字符:', decodedPath)
    return false
  }

  return true
}

/**
 * 资源存储根目录（基于 userData）
 */
const getResourceRoot = () => {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'resources')
}


// 初始化资源根目录
async function initResourceDir() {
  const resourceRoot = getResourceRoot()
  try {
    await fs.mkdir(resourceRoot, { recursive: true })
    console.log('[Resource] 资源根目录已创建:', resourceRoot)
  } catch (error) {
    console.error('[Resource] 创建资源根目录失败:', error)
  }
}


// 保持对窗口对象的全局引用，如果不这样做，当JavaScript对象被垃圾回收时，窗口将自动关闭
let mainWindow = null

function createWindow() {
  // 创建浏览器窗口（全屏模式）
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    fullscreen: true, // 全屏模式
    autoHideMenuBar: true, // 隐藏菜单栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: false,
      // 修复 Element Plus 输入框焦点问题
      webviewTag: false,
      // 确保输入框正常工作
      nativeWindowOpen: true,
      // 仅开发环境启用开发者工具，生产环境禁用
      devTools: isDev
    },
    icon: path.join(__dirname, '../build/icon.ico'), // 应用图标
    show: false // 先不显示，等加载完成后再显示
  })

  // 加载应用
  if (isDev) {
    // 开发环境：加载 Vite 开发服务器（使用 HTTPS）
    console.log('[Electron] 正在加载 https://localhost:5173')
    mainWindow.loadURL('https://localhost:5173').catch(err => {
      console.error('[Electron] 加载失败:', err.message)
    })
    // 打开开发者工具以便调试
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境：加载打包后的 dist/index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 监听加载完成事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] 页面加载完成')
    mainWindow.show()
    mainWindow.focus()
  })

  // 监听加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] 页面加载失败:', errorCode, errorDescription)
  })

  // 当窗口准备好时显示（备用）
  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] 窗口 ready-to-show')
    mainWindow.show()
    mainWindow.focus()
  })

  // 监听键盘事件 - F11 切换全屏，ESC 退出全屏
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
      event.preventDefault()
    }
    if (input.key === 'Escape' && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false)
      event.preventDefault()
    }
  })

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS上，应用及其菜单栏通常会保持活动状态，直到用户使用Cmd +Q明确退出
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常会重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

/**
 * 获取系统预置资源目录（assets/resources）
 * 开发环境：项目根目录/assets/resources
 * 生产环境：应用资源目录/resources
 */
const getPresetResourceRoot = () => {
  if (isDev) {
    return path.join(__dirname, '..', 'assets', 'resources')
  } else {
    // 生产环境：使用 process.resourcesPath
    return path.join(process.resourcesPath, 'assets', 'resources')
  }
}

// 应用准备就绪时创建窗口
app.whenReady().then(async () => {
  // 注册自定义协议
  // 支持 resource:// 协议，按以下优先级查找文件：
  // 1. userData/resources/ - 用户上传的资源
  // 2. assets/resources/ - 系统预置资源
  protocol.registerFileProtocol('resource', async (request, callback) => {
    const rawPath = request.url.slice(10) // 去掉 'resource://'

    if (!isValidResourcePath(rawPath)) {
      console.warn('[Resource] 无效路径:', rawPath)
      callback({ error: -2 })
      return
    }

    // 解码 URL 编码的路径
    const decodedPath = decodeURIComponent(rawPath)

    // 关键修复：清理开头的斜杠，确保是相对路径
    // 否则 path.resolve() 会将 /images/... 视为绝对路径
    const cleanPath = decodedPath.replace(/^[\\/]+/, '')
    console.log('[Resource] 请求资源:', decodedPath, '→ 清理后:', cleanPath)

    // 优先查找用户数据目录
    const userDataRoot = getResourceRoot()
    const userDataPath = path.join(userDataRoot, cleanPath)
    const resolvedUserDataPath = path.resolve(userDataPath)

    // 安全检查：确保路径不超出根目录
    if (resolvedUserDataPath.startsWith(userDataRoot)) {
      try {
        await fs.access(resolvedUserDataPath)
        console.log('[Resource] 从 userData 加载:', resolvedUserDataPath)
        callback({ path: resolvedUserDataPath })
        return
      } catch {
        // 文件不存在，继续查找预置资源
      }
    }

    // 查找系统预置资源
    const presetRoot = getPresetResourceRoot()
    const presetPath = path.join(presetRoot, cleanPath)
    const resolvedPresetPath = path.resolve(presetPath)

    // 安全检查：确保路径不超出预置资源目录
    if (resolvedPresetPath.startsWith(presetRoot)) {
      try {
        await fs.access(resolvedPresetPath)
        console.log('[Resource] 从预置资源加载:', resolvedPresetPath)
        callback({ path: resolvedPresetPath })
        return
      } catch {
        // 预置资源也不存在
      }
    }

    // 两个位置都没找到
    console.warn('[Resource] 资源未找到:', cleanPath)
    console.warn('[Resource] 查找路径:', resolvedUserDataPath, resolvedPresetPath)
    console.warn('[Resource] 资源根目录:', { userDataRoot, presetRoot })
    callback({ error: -6 }) // FILE_NOT_FOUND
  })
  console.log('[Protocol] resource:// 协议已注册')

  // 初始化资源根目录
  await initResourceDir()

  // ========== 初始化软件更新功能 ==========
  await loadUpdateHandlers()
  if (initUpdateHandlers) {
    try {
      initUpdateHandlers()
    } catch (error) {
      console.error('[Update] 更新处理器初始化失败:', error)
    }
  }

  // 创建窗口
  createWindow()
})

// IPC 处理程序
ipcMain.handle('app-path', async (event, name) => {
  return app.getPath(name)
})

// 保存文件
ipcMain.handle('save-file', async (event, filePath, buffer) => {
  if (isDev) {
    console.log('[Electron] save-file 被调用:', {
      filePath,
      bufferLength: buffer?.byteLength || buffer?.length || 0
    })
  }
  try {
    // 确保目录存在
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    // 写入文件
    await fs.writeFile(filePath, new Uint8Array(buffer))

    return true
  } catch (error) {
    if (isDev) console.error('[Electron] 保存文件失败:', error)
    return false
  }
})

// 读取文件为Base64
ipcMain.handle('read-file-as-base64', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath)
    return data.toString('base64')
  } catch (error) {
    if (isDev) console.error('读取文件失败:', error)
    return ''
  }
})

// 检查文件是否存在
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
})

// 删除文件
ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    if (isDev) console.error('删除文件失败:', error)
    return false
  }
})

// ========== Phase 2.3: 资源文件管理 IPC ==========

/**
 * 保存资源文件（带安全校验）
 * 用于保存用户上传的图片、文档等资源
 */
ipcMain.handle('SAVE_ASSET', async (event, fileName, buffer) => {
  if (isDev) {
    console.log('[IPC SAVE_ASSET] 调用:', {
      fileName,
      bufferSize: buffer?.byteLength || buffer?.length || 0
    })
  }

  try {
    // 安全校验：文件名
    if (!fileName || typeof fileName !== 'string') {
      console.error('[Security] 文件名无效')
      return { success: false, error: '文件名无效' }
    }

    // 只允许安全字符（字母、数字、中文、下划线、连字符、点和斜杠）
    const safeFileNamePattern = /^[a-zA-Z0-9_./-]+$/
    if (!safeFileNamePattern.test(fileName)) {
      console.error('[Security] 文件名包含非法字符:', fileName)
      return { success: false, error: '文件名包含非法字符' }
    }

    // 解析文件路径，防止目录遍历
    if (fileName.includes('..') || fileName.includes('\\') || fileName.includes('~')) {
      console.error('[Security] 检测到路径遍历攻击:', fileName)
      return { success: false, error: '检测到安全风险' }
    }

    // 构建目标路径（使用资源根目录）
    const resourceRoot = getResourceRoot()
    const targetPath = path.join(resourceRoot, fileName)

    // 二次校验：确保解析后的路径仍在资源根目录下
    const normalizedTarget = path.normalize(targetPath)
    const normalizedRoot = path.normalize(resourceRoot)
    if (!normalizedTarget.startsWith(normalizedRoot)) {
      console.error('[Security] 路径解析后超出资源根目录:', normalizedTarget)
      return { success: false, error: '路径安全校验失败' }
    }

    // 确保目录存在
    const targetDir = path.dirname(targetPath)
    await fs.mkdir(targetDir, { recursive: true })

    // 写入文件
    await fs.writeFile(targetPath, new Uint8Array(buffer))

    if (isDev) {
      console.log('[IPC SAVE_ASSET] 保存成功:', targetPath)
    }

    return {
      success: true,
      path: targetPath,
      url: `resource:///${fileName}`
    }
  } catch (error) {
    if (isDev) console.error('[IPC SAVE_ASSET] 保存失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 删除资源文件（带安全校验）
 * 用于删除用户上传的资源
 */
ipcMain.handle('DELETE_ASSET', async (event, fileName) => {
  if (isDev) {
    console.log('[IPC DELETE_ASSET] 调用:', fileName)
  }

  try {
    // 安全校验：文件名
    if (!fileName || typeof fileName !== 'string') {
      console.error('[Security] 文件名无效')
      return { success: false, error: '文件名无效' }
    }

    // 只允许安全字符
    const safeFileNamePattern = /^[a-zA-Z0-9_./-]+$/
    if (!safeFileNamePattern.test(fileName)) {
      console.error('[Security] 文件名包含非法字符:', fileName)
      return { success: false, error: '文件名包含非法字符' }
    }

    // 解析文件路径，防止目录遍历
    if (fileName.includes('..') || fileName.includes('\\') || fileName.includes('~')) {
      console.error('[Security] 检测到路径遍历攻击:', fileName)
      return { success: false, error: '检测到安全风险' }
    }

    // 构建目标路径
    const resourceRoot = getResourceRoot()
    const targetPath = path.join(resourceRoot, fileName)

    // 二次校验：确保路径在资源根目录下
    const normalizedTarget = path.normalize(targetPath)
    const normalizedRoot = path.normalize(resourceRoot)
    if (!normalizedTarget.startsWith(normalizedRoot)) {
      console.error('[Security] 路径解析后超出资源根目录:', normalizedTarget)
      return { success: false, error: '路径安全校验失败' }
    }

    // 检查文件是否存在
    try {
      await fs.access(targetPath)
    } catch {
      // 文件不存在，视为已删除
      return { success: true, message: '文件不存在' }
    }

    // 删除文件
    await fs.unlink(targetPath)

    if (isDev) {
      console.log('[IPC DELETE_ASSET] 删除成功:', targetPath)
    }

    return { success: true }
  } catch (error) {
    if (isDev) console.error('[IPC DELETE_ASSET] 删除失败:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 列出资源目录内容
 */
ipcMain.handle('LIST_ASSETS', async (event, subDir = '') => {
  if (isDev) {
    console.log('[IPC LIST_ASSETS] 调用:', subDir)
  }

  try {
    // 安全校验子目录
    if (subDir && typeof subDir === 'string') {
      // 只允许字母、数字、下划线、连字符
      const safeDirPattern = /^[a-zA-Z0-9_\-]+$/
      if (!safeDirPattern.test(subDir)) {
        return { success: false, error: '目录名包含非法字符' }
      }

      // 防止路径遍历
      if (subDir.includes('..') || subDir.includes('\\') || subDir.includes('~')) {
        return { success: false, error: '检测到安全风险' }
      }
    }

    const resourceRoot = getResourceRoot()
    const targetDir = subDir ? path.join(resourceRoot, subDir) : resourceRoot

    // 校验路径
    const normalizedTarget = path.normalize(targetDir)
    const normalizedRoot = path.normalize(resourceRoot)
    if (!normalizedTarget.startsWith(normalizedRoot)) {
      return { success: false, error: '路径安全校验失败' }
    }

    // 读取目录
    const items = await fs.readdir(targetDir, { withFileTypes: true })

    return {
      success: true,
      items: items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        isFile: item.isFile(),
        path: subDir ? `${subDir}/${item.name}` : item.name
      }))
    }
  } catch (error) {
    if (isDev) console.error('[IPC LIST_ASSETS] 读取失败:', error)
    return { success: false, error: error.message, items: [] }
  }
})

// 获取文件URL
ipcMain.handle('get-file-url', async (event, filePath) => {
  return `file://${filePath}`
})

// 确保目录存在
ipcMain.handle('ensure-dir', async (event, dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  } catch (error) {
    if (isDev) console.error('创建目录失败:', error)
    return false
  }
})

// 读取目录
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true })
    return items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      isFile: item.isFile()
    }))
  } catch (error) {
    if (isDev) console.error('读取目录失败:', error)
    return []
  }
})

// 使用系统默认程序打开文件
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    const result = await shell.openPath(filePath)
    // shell.openPath 返回打开文件的错误信息，如果成功则返回空字符串
    return {
      success: result === '',
      error: result || null
    }
  } catch (error) {
    if (isDev) console.error('打开文件失败:', error)
    return {
      success: false,
      error: error.message || '未知错误'
    }
  }
})

// 选择单个文件
ipcMain.handle('select-file', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  return result.canceled ? null : result.filePaths[0]
})

// 选择多个文件
ipcMain.handle('select-files', async (event, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }]
  })
  return result.canceled ? [] : result.filePaths
})

// 选择文件夹
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// ========== 数据库备份专用接口 ==========

// 获取用户数据目录
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData')
})

// 加载数据库文件（用于初始化）
ipcMain.handle('db:load', async () => {
  const dbPath = path.join(app.getPath('userData'), 'database.sqlite')

  if (isDev) {
    safeLog(`[IPC db:load] 正在尝试读取: ${dbPath}`)
  }

  try {
    if (fsSync.existsSync(dbPath)) {
      const buffer = fsSync.readFileSync(dbPath)
      if (isDev) {
        safeLog(`[IPC db:load] 文件读取成功，大小: ${buffer.length} bytes`)
      }
      // 直接返回 Buffer (会被自动转换为 Uint8Array 传给渲染进程)
      return buffer
    } else {
      if (isDev) {
        safeLog('[IPC db:load] 数据库文件不存在，返回 null')
      }
      // 返回 null，由 database-loader 创建有效的内存数据库
      return null
    }
  } catch (error) {
    safeError('[IPC db:load] 读取数据库文件失败:', error)
    throw error
  }
})

// 写入数据库文件（二进制数据）
ipcMain.handle('write-database-file', async (event, filePath, data) => {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    // 将数据转换为Buffer并写入
    const buffer = Buffer.from(data)
    await fs.writeFile(filePath, buffer)

    if (isDev) safeLog('数据库文件已保存到:', filePath)
    return { success: true }
  } catch (error) {
    if (isDev) safeError('写入数据库文件失败:', error)
    return { success: false, error: error.message }
  }
})

// 读取数据库文件（二进制数据）
ipcMain.handle('read-database-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath)
    if (isDev) safeLog('数据库文件已读取:', filePath)
    return { success: true, data: new Uint8Array(data) }
  } catch (error) {
    if (isDev) safeError('读取数据库文件失败:', error)
    return { success: false, error: error.message }
  }
})

// 检查数据库文件是否存在
ipcMain.handle('database-file-exists', async (event, filePath) => {
  try {
    await fs.access(filePath)
    const stats = await fs.stat(filePath)
    return {
      exists: true,
      size: stats.size,
      modifiedTime: stats.mtime.toISOString()
    }
  } catch {
    return { exists: false }
  }
})

// 删除数据库备份文件
ipcMain.handle('delete-database-backup', async (event, filePath) => {
  try {
    // 先检查文件是否存在
    await fs.access(filePath)
    // 文件存在，执行删除
    await fs.unlink(filePath)
    if (isDev) safeLog('数据库备份文件已删除:', filePath)
    return { success: true }
  } catch (error) {
    // 如果是 ENOENT 错误（文件不存在），视为成功
    if (error.code === 'ENOENT') {
      if (isDev) safeLog('数据库备份文件不存在，跳过删除:', filePath)
      return { success: true }
    }
    // 其他错误才返回失败
    if (isDev) safeError('删除数据库备份失败:', error)
    return { success: false, error: error.message }
  }
})

// ========== Phase 1.4: 原子写入持久化 ==========
/**
 * 原子写入数据库
 * 流程：写入 .tmp -> fs.fsync -> 原子 rename
 * 确保断电时数据不丢失
 */
ipcMain.handle('save-database-atomic', async (event, dbBuffer, dbName = 'database.sqlite') => {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, dbName)
  const tmpPath = dbPath + '.tmp'

  if (isDev) {
    safeLog('[AtomicWrite] 开始原子写入:', {
      dbPath,
      tmpPath,
      bufferSize: dbBuffer?.byteLength || 0
    })
  }

  try {
    // 1. 写入临时文件
    if (isDev) safeLog('[AtomicWrite] 步骤 1: 写入 .tmp 文件...')
    await fs.writeFile(tmpPath, Buffer.from(dbBuffer))

    // 2. 打开文件句柄并调用 fsync（确保数据刷入磁盘）
    if (isDev) safeLog('[AtomicWrite] 步骤 2: 调用 fsync...')
    const fileHandle = await fs.open(tmpPath, 'r+')
    try {
      await fileHandle.sync()
      if (isDev) safeLog('[AtomicWrite] ✅ fsync 成功')
    } finally {
      await fileHandle.close()
    }

    // 3. 原子替换（重命名操作在 POSIX 系统上是原子的）
    if (isDev) safeLog('[AtomicWrite] 步骤 3: 原子 rename...')
    await fs.rename(tmpPath, dbPath)

    if (isDev) {
      safeLog('[AtomicWrite] ✅ 原子写入成功！')
      // 获取文件信息
      const stats = await fs.stat(dbPath)
      safeLog('[AtomicWrite] 📊 文件大小:', stats.size, 'bytes')
      safeLog('[AtomicWrite] 🕐 修改时间:', stats.mtime.toISOString())
    }

    return { success: true }
  } catch (error) {
    if (isDev) {
      safeError('[AtomicWrite] ❌ 原子写入失败:', error)
      safeError('[AtomicWrite] 🔧 .tmp 文件保留在:', tmpPath, '，可手动恢复')
    }
    return {
      success: false,
      error: error.message,
      tmpPath // 返回 tmp 路径以便手动恢复
    }
  }
})

/**
 * 检查数据库文件状态
 */
ipcMain.handle('get-database-stats', async (event, dbName = 'database.sqlite') => {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, dbName)

  try {
    const stats = await fs.stat(dbPath)
    return {
      exists: true,
      size: stats.size,
      modifiedTime: stats.mtime.toISOString(),
      createdTime: stats.birthtime.toISOString()
    }
  } catch {
    return { exists: false }
  }
})

// ========== 获取应用安装目录（用于资源文件管理）==========
ipcMain.handle('get-app-path', () => {
  if (isDev) {
    const devPath = path.join(__dirname, '..')
    console.log('[Electron] 开发环境路径:', devPath)
    return devPath
  }
  // 生产环境：返回应用安装目录的 resources 文件夹
  // Windows: D:\self-Care-ats\resources
  // macOS: app.app/Contents/Resources
  // Linux: /opt/self-care-ats/resources
  if (process.platform === 'darwin') {
    // macOS: .app 包内的 resources 目录
    return path.join(process.resourcesPath)
  } else {
    // Windows/Linux: 安装目录下的 resources 文件夹
    return path.join(path.dirname(process.execPath), 'resources')
  }
})

// ========== 获取机器码（用于激活系统）==========
ipcMain.handle('get-machine-id', async () => {
  // 注意：Electron 官方已弃用 app.getMachineId()，我们使用 UUID 作为替代方案
  // 在实际生产环境中，可以使用 machine-id 或 node-machine-id 等库获取硬件唯一标识

  // 基于系统信息生成唯一机器码
  const machineInfo = `${os.hostname()}-${os.platform()}-${os.arch()}`
  const machineId = crypto.createHash('sha256').update(machineInfo).digest('hex')

  return machineId
})

// ========== 获取应用版本信息 ==========
ipcMain.handle('get-app-version', async () => {
  return app.getVersion()
})

// ========== 获取 Electron 版本信息 ==========
ipcMain.handle('get-electron-version', async () => {
  return process.versions.electron
})
