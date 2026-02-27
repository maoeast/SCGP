/**
 * Electron API 类型定义
 *
 * 此文件定义了通过 preload.js 暴露给渲染进程的 Electron API 接口
 * 所有与主进程的通信都通过这些类型安全的方法进行
 */

export interface ElectronAPI {
  // ========== 路径相关 ==========
  /**
   * 获取系统路径
   * @param name - 路径名称，如 'userData', 'appData', 'home' 等
   * @returns Promise<string> - 系统路径
   */
  getPath: (name: string) => Promise<string>

  // ========== 文件操作 ==========
  /**
   * 保存文件
   * @param filePath - 文件路径
   * @param buffer - 文件内容（Uint8Array）
   * @returns Promise<boolean> - 是否成功
   */
  saveFile: (filePath: string, buffer: Uint8Array) => Promise<boolean>

  /**
   * 读取文件为 Base64
   * @param filePath - 文件路径
   * @returns Promise<string> - Base64 编码的文件内容
   */
  readFileAsBase64: (filePath: string) => Promise<string>

  /**
   * 检查文件是否存在
   * @param filePath - 文件路径
   * @returns Promise<boolean> - 是否存在
   */
  fileExists: (filePath: string) => Promise<boolean>

  /**
   * 删除文件
   * @param filePath - 文件路径
   * @returns Promise<boolean> - 是否成功
   */
  deleteFile: (filePath: string) => Promise<boolean>

  /**
   * 获取文件的 file:// 协议 URL
   * @param filePath - 文件路径
   * @returns Promise<string> - file:// URL
   */
  getFileUrl: (filePath: string) => Promise<string>

  // ========== 目录操作 ==========
  /**
   * 确保目录存在（不存在则创建）
   * @param dirPath - 目录路径
   * @returns Promise<boolean> - 是否成功
   */
  ensureDir: (dirPath: string) => Promise<boolean>

  /**
   * 读取目录内容
   * @param dirPath - 目录路径
   * @returns Promise<DirItem[]> - 目录项列表
   */
  readDir: (dirPath: string) => Promise<DirItem[]>

  // ========== 系统操作 ==========
  /**
   * 使用系统默认程序打开文件
   * @param filePath - 文件路径
   * @returns Promise<boolean> - 是否成功
   */
  openFile: (filePath: string) => Promise<boolean>

  /**
   * 选择单个文件
   * @param filters - 文件过滤器
   * @returns Promise<string | null> - 文件路径或 null
   */
  selectFile: (filters?: FileFilter[]) => Promise<string | null>

  /**
   * 选择多个文件
   * @param filters - 文件过滤器
   * @returns Promise<string[]> - 文件路径数组
   */
  selectFiles: (filters?: FileFilter[]) => Promise<string[]>

  /**
   * 选择文件夹
   * @returns Promise<string | null> - 文件夹路径或 null
   */
  selectFolder: () => Promise<string | null>

  // ========== 系统信息 ==========
  /**
   * 获取机器唯一标识码（用于软件激活）
   * @returns Promise<string> - 机器码
   */
  getMachineId: () => Promise<string>

  /**
   * 获取应用版本号
   * @returns Promise<string> - 版本号
   */
  getAppVersion: () => Promise<string>

  /**
   * 获取 Electron 版本号
   * @returns Promise<string> - Electron 版本
   */
  getElectronVersion: () => Promise<string>

  // ========== 数据库备份专用 API ==========
  /**
   * 获取用户数据目录路径
   * @returns Promise<string> - 用户数据目录路径
   */
  getUserDataPath: () => Promise<string>

  /**
   * 加载数据库文件（用于初始化）
   * @returns Promise<Uint8Array | null> - 数据库 Buffer，不存在时返回 null
   */
  loadDatabaseFile: () => Promise<Uint8Array | null>

  /**
   * 写入数据库文件
   * @param filePath - 文件路径
   * @param data - 数据库二进制数据
   * @returns Promise<{ success: boolean; error?: string }>
   */
  writeDatabaseFile: (
    filePath: string,
    data: Uint8Array
  ) => Promise<DatabaseOperationResult>

  /**
   * 读取数据库文件
   * @param filePath - 文件路径
   * @returns Promise<{ success: boolean; data?: Uint8Array; error?: string }>
   */
  readDatabaseFile: (
    filePath: string
  ) => Promise<DatabaseOperationResult & { data?: Uint8Array }>

  /**
   * 检查数据库文件是否存在
   * @param filePath - 文件路径
   * @returns Promise<{ exists: boolean; size?: number; modifiedTime?: string }>
   */
  databaseFileExists: (
    filePath: string
  ) => Promise<DatabaseExistsResult>

  /**
   * 删除数据库备份文件
   * @param filePath - 文件路径
   * @returns Promise<{ success: boolean; error?: string }>
   */
  deleteDatabaseBackup: (
    filePath: string
  ) => Promise<DatabaseOperationResult>

  // ========== Phase 1.4: 原子写入持久化 ==========
  /**
   * 原子写入数据库（预防断电数据丢失）
   * 流程：写入 .tmp → fs.fsync → 原子 rename
   * @param dbBuffer - 数据库二进制数据
   * @param dbName - 数据库名称（默认 'database.sqlite'）
   * @returns Promise<{ success: boolean; error?: string; tmpPath?: string }>
   */
  saveDatabaseAtomic: (
    dbBuffer: Uint8Array,
    dbName?: string
  ) => Promise<DatabaseOperationResult & { tmpPath?: string }>

  /**
   * 获取数据库文件状态
   * @param dbName - 数据库名称（默认 'database.sqlite'）
   * @returns Promise<{ exists: boolean; size?: number; modifiedTime?: string; createdTime?: string }>
   */
  getDatabaseStats: (
    dbName?: string
  ) => Promise<DatabaseExistsResult & { createdTime?: string }>

  // ========== 软件更新 API ==========
  /**
   * 通用 IPC 调用方法
   * @param channel - IPC 通道名称
   * @param args - 参数列表
   * @returns Promise<any> - IPC 调用结果
   */
  invoke: (channel: string, ...args: any[]) => Promise<any>

  /**
   * 监听主进程事件
   * @param channel - 事件通道名称
   * @param callback - 回调函数
   */
  on: (channel: string, callback: (...args: any[]) => void) => void

  /**
   * 取消监听主进程事件
   * @param channel - 事件通道名称
   * @param callback - 回调函数
   */
  off: (channel: string, callback: (...args: any[]) => void) => void

  /**
   * 发送消息到主进程
   * @param channel - 事件通道名称
   * @param args - 参数列表
   */
  send: (channel: string, ...args: any[]) => void
}

// ========== 辅助类型定义 ==========

/**
 * 文件过滤器
 */
export interface FileFilter {
  name: string
  extensions: string[]
}

/**
 * 目录项
 */
export interface DirItem {
  name: string
  isDirectory: boolean
  isFile: boolean
}

/**
 * 数据库操作结果
 */
export interface DatabaseOperationResult {
  success: boolean
  error?: string
}

/**
 * 数据库存在性检查结果
 */
export interface DatabaseExistsResult {
  exists: boolean
  size?: number
  modifiedTime?: string
}

/**
 * Window 接口扩展：声明 window.electronAPI 的类型
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// 导出类型以便在其他文件中使用
export {}
