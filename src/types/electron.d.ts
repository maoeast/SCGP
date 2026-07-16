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

  // ========== Phase 2: 资源文件归档（备份 zip） ==========
  /**
   * 打包托管资源文件为 zip（仅 uploaded/ + teaching-materials/ 子树）
   * @returns Promise<ResourceArchivePackResult> - 加密前的 zip 字节 + 清单
   */
  packResourceArchive: () => Promise<ResourceArchivePackResult>

  /**
   * 解包资源 zip 到 userData/resources（仅写托管子目录，防遍历）
   * @param zipBytes - zip 字节
   * @returns Promise<ResourceArchiveUnpackResult> - 恢复/失败统计
   */
  unpackResourceArchive: (zipBytes: Uint8Array) => Promise<ResourceArchiveUnpackResult>

  /**
   * 递归列目录（相对 userData/resources）
   * @param relSubpath - 相对子路径（可选）
   * @returns Promise<WalkDirResult> - 文件列表（相对路径 + 字节大小）
   */
  walkDir: (relSubpath?: string) => Promise<WalkDirResult>

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

  /**
   * 查询系统级媒体权限状态
   * @param permission - 权限类型（麦克风/摄像头）
   * @returns Promise<MediaPermissionStatusResult> - 当前系统权限状态
   */
  getMediaPermissionStatus: (
    permission: MediaPermissionKind
  ) => Promise<MediaPermissionStatusResult>

  /**
   * 打开系统权限设置页
   * @param permission - 权限类型（麦克风/摄像头）
   * @returns Promise<OpenMediaPermissionSettingsResult> - 是否成功打开设置页
   */
  openMediaPermissionSettings: (
    permission: MediaPermissionKind
  ) => Promise<OpenMediaPermissionSettingsResult>

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
   * TTS 语音合成（通过 Electron Main 进程内嵌 msedge-tts）
   * @param text - 要合成的文本
   * @param options - 可选参数：voice、rate、pitch
   * @returns Promise<TTSResult> - 合成结果，success 时 audio 为 MP3 音频 Uint8Array
   */
  ttsSynthesize: (
    text: string,
    options?: { voice?: string; rate?: string; pitch?: string }
  ) => Promise<TTSResult & { audioBase64?: string }>

  /**
   * AI 智能体对话（多 provider 代理；主进程解密 Key 后调用）
   * @param payload - encKey 为密文，由渲染进程从 ai_provider 行读出后传入
   */
  aiChat: (payload: {
    encKey: string
    messages: Array<
      | { role: 'user' | 'system'; content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> }
      | { role: 'assistant'; content?: string; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }
      | { role: 'tool'; content: string; tool_call_id: string }
    >
    systemPrompt?: string
    model?: string
    baseUrl?: string
    stream?: boolean
    supportsThinking?: boolean
    providerName?: string
    tools?: Array<{ type: 'function'; function: { name: string; description?: string; parameters?: Record<string, any> } }>
  }) => Promise<{
    success: boolean
    content?: string
    usage?: {
      promptTokens: number
      completionTokens: number
      promptCacheHitTokens: number
      promptCacheMissTokens: number
    }
    error?: string
    errorKind?: string
    httpStatus?: number
    toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  }>

  /**
   * Phase 4：抽取文档文本（PDF / Word .docx / Excel .xlsx → 纯文本，供 AI 阅读）
   * @param filePath - 文档绝对路径
   * @returns 成功返回 { text, truncated?, pageCount? }；失败返回 { success:false, error }
   */
  extractDocumentText: (filePath: string) => Promise<{
    success: boolean
    text?: string
    truncated?: boolean
    pageCount?: number
    error?: string
  }>

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
 * 资源归档清单项（Phase 2 备份）
 */
export interface ResourceArchiveManifestItem {
  rel: string
  size: number
}

/**
 * 打包资源归档结果
 */
export interface ResourceArchivePackResult {
  success: boolean
  error?: string
  zipBytes: Uint8Array | null
  manifest: ResourceArchiveManifestItem[]
  fileCount: number
  totalBytes: number
}

/**
 * 解包资源归档结果
 */
export interface ResourceArchiveUnpackResult {
  success: boolean
  error?: string
  restored: number
  failed: { rel: string; error: string }[]
}

/**
 * 递归列目录文件项
 */
export interface WalkDirFile {
  rel: string
  size: number
}

/**
 * 递归列目录结果
 */
export interface WalkDirResult {
  success: boolean
  error?: string
  files: WalkDirFile[]
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
 * TTS 语音合成结果
 */
export interface TTSResult {
  success: boolean
  audioBase64?: string
  error?: string
}

export type MediaPermissionKind = 'microphone' | 'camera'

export type MediaPermissionAccessStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'

export interface MediaPermissionStatusResult {
  success: boolean
  permission: MediaPermissionKind
  status: MediaPermissionAccessStatus
  platform: string
  canOpenSettings: boolean
  error?: string
}

export interface OpenMediaPermissionSettingsResult {
  success: boolean
  opened: boolean
  platform: string
  error?: string
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
