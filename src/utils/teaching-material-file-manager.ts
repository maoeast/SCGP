import type { TeachingMaterialDimensionCode } from '@/utils/resource-center-business'

export interface TeachingMaterialStoredFile {
  fileName: string
  fileType: string
  filePath: string
  fileSizeBytes: number
}

class TeachingMaterialFileManager {
  private managedRootPromise: Promise<string> | null = null

  async saveBrowserFile(
    file: File,
    dimensionCode: TeachingMaterialDimensionCode
  ): Promise<TeachingMaterialStoredFile> {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    return this.saveBytes(bytes, file.name, dimensionCode)
  }

  async importExternalFile(
    sourceAbsolutePath: string,
    dimensionCode: TeachingMaterialDimensionCode,
    preferredFileName?: string
  ): Promise<TeachingMaterialStoredFile> {
    if (!window.electronAPI) {
      throw new Error('当前环境不支持外部文件导入')
    }

    const exists = await window.electronAPI.fileExists(sourceAbsolutePath)
    if (!exists) {
      throw new Error(`文件不存在: ${sourceAbsolutePath}`)
    }

    const fileName = preferredFileName || getFileName(sourceAbsolutePath)
    const base64 = await window.electronAPI.readFileAsBase64(sourceAbsolutePath)
    if (!base64) {
      throw new Error(`无法读取文件: ${sourceAbsolutePath}`)
    }

    return this.saveBytes(base64ToBytes(base64), fileName, dimensionCode)
  }

  async deleteManagedFile(relativePath: string): Promise<boolean> {
    if (!window.electronAPI) {
      return true
    }

    const absolutePath = await this.resolveManagedAbsolutePath(relativePath)
    return window.electronAPI.deleteFile(absolutePath)
  }

  async openManagedFile(relativePath: string): Promise<boolean> {
    if (!window.electronAPI) {
      window.open(this.getFileUrl(relativePath), '_blank')
      return true
    }

    const absolutePath = await this.resolveManagedAbsolutePath(relativePath)
    const result: any = await window.electronAPI.openFile(absolutePath)
    if (typeof result === 'boolean') {
      return result
    }

    return result?.success === true
  }

  getFileUrl(relativePath: string): string {
    return `resource://${normalizeRelativePath(relativePath)}`
  }

  async resolveManagedAbsolutePath(relativePath: string): Promise<string> {
    const managedRoot = await this.getManagedRootPath()
    return joinFileSystemPath(managedRoot, normalizeRelativePath(relativePath))
  }

  private async saveBytes(
    bytes: Uint8Array,
    originalFileName: string,
    dimensionCode: TeachingMaterialDimensionCode
  ): Promise<TeachingMaterialStoredFile> {
    const fileName = sanitizeFileName(originalFileName || 'material.bin')
    const relativePath = buildManagedRelativePath(dimensionCode, fileName)

    if (window.electronAPI) {
      const absolutePath = await this.resolveManagedAbsolutePath(relativePath)
      const directoryPath = absolutePath.replace(/[\\/][^\\/]+$/, '')
      await window.electronAPI.ensureDir(directoryPath)

      const success = await window.electronAPI.saveFile(absolutePath, bytes)
      if (!success) {
        throw new Error(`文件保存失败: ${fileName}`)
      }
    }

    return {
      fileName,
      fileType: getFileExtension(fileName),
      filePath: relativePath,
      fileSizeBytes: bytes.byteLength,
    }
  }

  private async getManagedRootPath(): Promise<string> {
    if (!this.managedRootPromise) {
      this.managedRootPromise = (async () => {
        if (!window.electronAPI) {
          return '/resources'
        }

        const userDataPath = await window.electronAPI.getUserDataPath()
        return joinFileSystemPath(userDataPath, 'resources')
      })()
    }

    return this.managedRootPromise
  }
}

function buildManagedRelativePath(
  dimensionCode: TeachingMaterialDimensionCode,
  originalFileName: string
): string {
  const timestamp = Date.now()
  return normalizeRelativePath(`teaching-materials/${dimensionCode}/${timestamp}-${originalFileName}`)
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim() || 'material.bin'
}

function normalizeRelativePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
}

function joinFileSystemPath(basePath: string, relativePath: string): string {
  const separator = basePath.includes('\\') ? '\\' : '/'
  const cleanedBase = basePath.replace(/[\\/]+$/, '')
  const cleanedRelative = relativePath
    .replace(/^[\\/]+/, '')
    .replace(/[\\/]+/g, separator)

  return `${cleanedBase}${separator}${cleanedRelative}`
}

function getFileName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const segments = normalized.split('/')
  return segments[segments.length - 1] || 'material.bin'
}

function getFileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName)
  return match?.[1]?.toLowerCase() || 'bin'
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export const teachingMaterialFileManager = new TeachingMaterialFileManager()
