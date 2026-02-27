const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的API给渲染进程
// 防御性编程：所有与主进程的通信都通过 IPC (进程间通信) 进行，确保渲染进程无法直接访问 Node.js
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用路径
  getPath: (name) => ipcRenderer.invoke('app-path', name),

  // 文件操作
  saveFile: (filePath, buffer) => ipcRenderer.invoke('save-file', filePath, buffer),
  readFileAsBase64: (filePath) => ipcRenderer.invoke('read-file-as-base64', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', filePath),

  // 目录操作
  ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', dirPath),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),

  // 系统操作
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  selectFiles: (filters) => ipcRenderer.invoke('select-files', filters),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // 获取机器码（用于激活系统）
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),

  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 获取 Electron 版本
  getElectronVersion: () => ipcRenderer.invoke('get-electron-version'),

  // ========== 资源文件管理专用API ==========
  // 获取应用安装目录
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // ========== 数据库备份专用API ==========
  // 获取用户数据目录
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // 加载数据库文件（用于初始化）
  // 直接返回 Buffer | null
  loadDatabaseFile: () => ipcRenderer.invoke('db:load'),

  // 写入数据库文件
  writeDatabaseFile: (filePath, data) => ipcRenderer.invoke('write-database-file', filePath, data),

  // 读取数据库文件
  readDatabaseFile: (filePath) => ipcRenderer.invoke('read-database-file', filePath),

  // 检查数据库文件是否存在
  databaseFileExists: (filePath) => ipcRenderer.invoke('database-file-exists', filePath),

  // 删除数据库备份
  deleteDatabaseBackup: (filePath) => ipcRenderer.invoke('delete-database-backup', filePath),

  // ========== Phase 1.4: 原子写入持久化 ==========
  // 原子写入数据库（预防断电数据丢失）
  saveDatabaseAtomic: (dbBuffer, dbName) => ipcRenderer.invoke('save-database-atomic', dbBuffer, dbName),

  // 获取数据库文件状态
  getDatabaseStats: (dbName) => ipcRenderer.invoke('get-database-stats', dbName)
})

// 注意：由于我们已启用 contextIsolation，上面的 fallback 代码实际上不会执行
// 保留这段代码仅用于在极端情况下的容错处理
if (!process.contextIsolated) {
  console.error('⚠️ 警告：contextIsolation 未启用，这是严重的安全风险！')
  window.electronAPI = {
    getPath: (name) => Promise.resolve('/mock/path'),
    saveFile: (filePath, buffer) => Promise.resolve(true),
    readFileAsBase64: (filePath) => Promise.resolve(''),
    fileExists: (filePath) => Promise.resolve(true),
    deleteFile: (filePath) => Promise.resolve(true),
    getFileUrl: (filePath) => Promise.resolve(filePath),
    ensureDir: (dirPath) => Promise.resolve(true),
    readDir: (dirPath) => Promise.resolve([]),
    openFile: (filePath) => Promise.resolve(true),
    selectFile: (filters) => Promise.resolve(null),
    selectFiles: (filters) => Promise.resolve([]),
    selectFolder: () => Promise.resolve(null),
    getMachineId: () => Promise.resolve('mock-machine-id'),
    getAppVersion: () => Promise.resolve('0.0.0'),
    getElectronVersion: () => Promise.resolve('0.0.0'),
    // 数据库备份API模拟
    getUserDataPath: () => Promise.resolve('/mock/userdata'),
    loadDatabaseFile: () => Promise.resolve(null),  // 直接返回 null
    writeDatabaseFile: (filePath, data) => Promise.resolve({ success: true }),
    readDatabaseFile: (filePath) => Promise.resolve({ success: false }),
    databaseFileExists: (filePath) => Promise.resolve({ exists: false }),
    deleteDatabaseBackup: (filePath) => Promise.resolve({ success: true }),
    // Phase 1.4 原子写入API模拟
    saveDatabaseAtomic: (dbBuffer, dbName) => Promise.resolve({ success: true }),
    getDatabaseStats: (dbName) => Promise.resolve({ exists: false })
  }
}
