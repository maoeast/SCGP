/// <reference types="vite/client" />

/**
 * 全局 Window 接口扩展
 */
declare module '*.sql?raw' {
  const content: string
  export default content
}

declare module 'sql.js' {
  const initSqlJs: any
  export default initSqlJs
  export const SQL: any
}

declare module 'sql.js/dist/sql-wasm.js' {
  const sqlWasm: any
  export default sqlWasm
}

declare global {
  interface Window {
    electronAPI: {
      // 应用路径
      getPath: (name: string) => Promise<string>
      getAppPath: () => Promise<string>

      // 文件操作
      saveFile: (filePath: string, buffer: ArrayBuffer | Uint8Array) => Promise<boolean>
      readFile: (filePath: string) => Promise<string>
      readFileAsBase64: (filePath: string) => Promise<string>
      fileExists: (filePath: string) => Promise<boolean>
      deleteFile: (filePath: string) => Promise<boolean>
      getFileUrl: (filePath: string) => Promise<string>

      // 目录操作
      ensureDir: (dirPath: string) => Promise<boolean>
      readDir: (dirPath: string) => Promise<Array<{
        name: string
        isDirectory: boolean
        isFile: boolean
      }>>

      // 系统操作
      openFile: (filePath: string) => Promise<string | boolean>
      selectFile: (filters?: Array<{ name: string; extensions: string[] }>) => Promise<string | null>
      selectFiles: (filters?: Array<{ name: string; extensions: string[] }>) => Promise<string[]>
      selectFolder: () => Promise<string | null>

      // 机器码
      getMachineId: () => Promise<string>
      getAppVersion: () => Promise<string>
      getElectronVersion: () => Promise<string>

      // 数据库备份专用 API
      getUserDataPath: () => Promise<string>
      loadDatabaseFile: () => Promise<Uint8Array | null>
      writeDatabaseFile: (filePath: string, data: Uint8Array) => Promise<{
        success: boolean
        error?: string
      }>
      readDatabaseFile: (filePath: string) => Promise<{
        success: boolean
        data?: Uint8Array
        error?: string
      }>
      databaseFileExists: (filePath: string) => Promise<{
        exists: boolean
        size?: number
        modifiedTime?: string
      }>
      deleteDatabaseBackup: (filePath: string) => Promise<{
        success: boolean
        error?: string
      }>
      saveDatabaseAtomic: (dbBuffer: Uint8Array, dbName?: string) => Promise<{
        success: boolean
        error?: string
        tmpPath?: string
      }>
      getDatabaseStats: (dbName?: string) => Promise<{
        exists: boolean
        size?: number
        modifiedTime?: string
        createdTime?: string
      }>

      // Phase 2: 资源文件归档（备份 zip）
      packResourceArchive: () => Promise<{
        success: boolean
        error?: string
        zipBytes: Uint8Array | null
        manifest: Array<{ rel: string; size: number }>
        fileCount: number
        totalBytes: number
      }>
      unpackResourceArchive: (zipBytes: Uint8Array) => Promise<{
        success: boolean
        error?: string
        restored: number
        failed: Array<{ rel: string; error: string }>
      }>
      walkDir: (relSubpath?: string) => Promise<{
        success: boolean
        error?: string
        files: Array<{ rel: string; size: number }>
      }>

      // TTS 语音合成
      ttsSynthesize: (
        text: string,
        options?: { voice?: string; rate?: string; pitch?: string }
      ) => Promise<{
        success: boolean
        audioBase64?: string
        error?: string
      }>

      // AI 智能体（多 provider 代理；主进程解密 Key 后调用，渲染进程只传密文）
      protectAiApiKey: (plainKey: string) => Promise<{
        success: boolean
        keyEnc?: string
        error?: string
        errorKind?: string
      }>
      migrateAiApiKey: (encKey: string) => Promise<{
        success: boolean
        keyEnc?: string
        migrated?: boolean
        error?: string
        errorKind?: string
      }>
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
          totalTokens: number
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

      // 通用 IPC / 更新能力
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, callback: (...args: any[]) => void) => void
      off: (channel: string, callback: (...args: any[]) => void) => void
      send: (channel: string, ...args: any[]) => void
    }
  }
}

export {}
