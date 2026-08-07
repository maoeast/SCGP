import type { TeachingMaterialDimensionCode } from '@/utils/resource-center-business'
import {
  deleteManagedFile as serviceDeleteManagedFile,
  normalizeRelativePath,
  resolveAbsolutePath,
} from '@/utils/resource-file-service'

export interface TeachingMaterialStoredFile {
  fileName: string
  fileType: string
  filePath: string
  fileSizeBytes: number
}

class TeachingMaterialFileManager {
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
    return serviceDeleteManagedFile(relativePath)
  }

  async openManagedFile(relativePath: string): Promise<boolean> {
    if (!window.electronAPI) {
      window.open(this.getFileUrl(relativePath), '_blank')
      return true
    }

    const absolutePath = await resolveAbsolutePath(relativePath)
    const result: any = await window.electronAPI.openFile(absolutePath)
    if (typeof result === 'boolean') {
      return result
    }

    return result?.success === true
  }

  getFileUrl(relativePath: string): string {
    // resource:// 协议的两级查找根（userData/resources、presetRoot=assets/resources）
    // 已覆盖 assets/ 语义：预置视频 seed 的 filePath 带 assets/resources/ 前缀，
    // 直接拼接会与 presetRoot 重复（assets/resources/assets/resources/...）→ 404 静默失败。
    // 这里剥离 assets/resources/ 前缀：预置 → resource://videos/...（presetRoot 命中）；
    // 托管（teaching-materials/... 无前缀）→ 原样（userDataRoot 命中）。
    return `resource://${normalizeRelativePath(relativePath).replace(/^assets\/resources\//, '')}`
  }

  async resolveManagedAbsolutePath(relativePath: string): Promise<string> {
    return resolveAbsolutePath(relativePath)
  }

  private async saveBytes(
    bytes: Uint8Array,
    originalFileName: string,
    dimensionCode: TeachingMaterialDimensionCode
  ): Promise<TeachingMaterialStoredFile> {
    const fileName = sanitizeFileName(originalFileName || 'material.bin')
    const relativePath = buildManagedRelativePath(dimensionCode, fileName)

    if (window.electronAPI) {
      const absolutePath = await resolveAbsolutePath(relativePath)
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
