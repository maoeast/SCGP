/// <reference types="vite/client" />

/**
 * 全局 Window 接口扩展
 */
declare global {
  interface Window {
    electronAPI?: {
      // 应用路径
      getPath: (name: string) => Promise<string>

      // 文件操作
      saveFile: (filePath: string, buffer: ArrayBuffer | Uint8Array) => Promise<boolean>
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

      // 数据库备份专用 API
      getUserDataPath: () => Promise<string>
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
    }
  }
}

export {}
