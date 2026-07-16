/**
 * AI 聊天附件管理（Phase 3 vision）
 *
 * 职责：把用户在聊天面板选择的图片 File 落盘到
 * userData/resources/uploaded/ai-attachments/{sessionId}/，并提供 base64 dataUrl（送模型）
 * 与 resource:// 展示 URL。仿 teaching-material-file-manager.ts 范式，复用 resource-file-service 原语。
 *
 * - 落 uploaded/ 前缀 → 自动进 A4 备份 + 被孤儿 GC 扫描（GC 引用由 resource-reconcile 扫
 *   ai_chat_message.attachments 列，见 Phase 3 Step 5）。
 * - dataUrl 不落库（仅 send 期上送模型）；落库只存 {rel,fileName,fileType,sizeBytes} 元信息。
 */
import type { AiAttachmentRef } from '@/database/ai-api'
import {
  normalizeRelativePath,
  resolveAbsolutePath,
  deleteManagedFile,
} from '@/utils/resource-file-service'

/** 浏览器 File → base64 dataUrl（FileReader，对大文件分块，零手写 base64） */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

/** 浏览器 File → Uint8Array（FileReader.readAsArrayBuffer，用于文档落盘） */
function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error || new Error('读取文档失败'))
    reader.readAsArrayBuffer(file)
  })
}

/** dataUrl 的 base64 段 → bytes（用于落盘） */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const ILLEGAL_NAME_CHARS = /[<>:"/\\|?*]/g

/** 文件名消毒（删 Windows 非法字符；图片文件名极少含控制字符，saveFile 失败有兜底错误） */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(ILLEGAL_NAME_CHARS, '_').trim() || 'image.bin'
}

/** 取扩展名（小写，无点） */
function getFileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName)
  return match?.[1]?.toLowerCase() || 'bin'
}

/** 拼托管相对路径：uploaded/ai-attachments/{sessionId}/{ts}-{sanitized} */
function buildAttachmentRelativePath(sessionId: number, fileName: string): string {
  const timestamp = Date.now()
  return normalizeRelativePath(`uploaded/ai-attachments/${sessionId}/${timestamp}-${fileName}`)
}

class AiAttachmentManager {
  /**
   * 保存一张图片：落盘 + 返回元信息与 dataUrl。
   * - dataUrl：当轮上送模型用（不落库）
   * - ref：落 ai_chat_message.attachments（不含 dataUrl）
   */
  async saveAttachment(
    file: File,
    sessionId: number,
  ): Promise<{ ref: AiAttachmentRef; dataUrl: string }> {
    const dataUrl = await readFileAsDataUrl(file)
    const fileName = sanitizeFileName(file.name || 'image.bin')
    const fileType = getFileExtension(file.name || 'image.bin')
    const relativePath = buildAttachmentRelativePath(sessionId, fileName)

    if (window.electronAPI) {
      const absolutePath = await resolveAbsolutePath(relativePath)
      const directoryPath = absolutePath.replace(/[\\/][^\\/]+$/, '')
      await window.electronAPI.ensureDir(directoryPath)
      const success = await window.electronAPI.saveFile(absolutePath, dataUrlToBytes(dataUrl))
      if (!success) {
        throw new Error(`图片保存失败: ${fileName}`)
      }
    }

    const ref: AiAttachmentRef = {
      rel: relativePath,
      fileName,
      fileType,
      sizeBytes: file.size,
    }
    return { ref, dataUrl }
  }

  /**
   * 保存一份文档（Phase 4）：落盘到 uploaded/ai-attachments/{sessionId}/（与图片同前缀，
   * 自动进 A4 备份 + 孤儿 GC），并调 Main 抽取纯文本。
   * - text：拼进当轮 user 消息内容上送模型（不另存 dataUrl）
   * - ref：落 ai_chat_message.attachments（与图片 ref 同列，GC 扫描不区分类型）
   * 抽取失败（扫描件/不支持格式）抛错，由调用方决定是否中断整轮发送。
   */
  async saveDocument(
    file: File,
    sessionId: number,
  ): Promise<{ ref: AiAttachmentRef; text: string; truncated: boolean }> {
    const fileName = sanitizeFileName(file.name || 'document.bin')
    const fileType = getFileExtension(file.name || 'document.bin')
    const relativePath = buildAttachmentRelativePath(sessionId, fileName)

    if (!window.electronAPI) {
      throw new Error('文档处理需要在桌面端环境运行。')
    }

    const bytes = await readFileAsBytes(file)
    const absolutePath = await resolveAbsolutePath(relativePath)
    const directoryPath = absolutePath.replace(/[\\/][^\\/]+$/, '')
    await window.electronAPI.ensureDir(directoryPath)
    const saved = await window.electronAPI.saveFile(absolutePath, bytes)
    if (!saved) {
      throw new Error(`文档保存失败: ${fileName}`)
    }

    const result = await window.electronAPI.extractDocumentText(absolutePath)
    if (!result.success || !result.text) {
      throw new Error(
        result.error || `文档《${fileName}》无法提取文本，可能是扫描件或不支持的格式。`,
      )
    }

    const ref: AiAttachmentRef = {
      rel: relativePath,
      fileName,
      fileType,
      sizeBytes: file.size,
    }
    return { ref, text: result.text, truncated: !!result.truncated }
  }

  /**
   * 按元信息重读 base64 dataUrl（供「最近1轮带图」重发历史图）。
   * 非 Electron 环境无法重读，返回空串（调用方应跳过该图）。
   */
  async readAsDataUrl(ref: AiAttachmentRef): Promise<string> {
    if (!window.electronAPI) return ''
    const absolutePath = await resolveAbsolutePath(ref.rel)
    const base64 = await window.electronAPI.readFileAsBase64(absolutePath)
    if (!base64) return ''
    return `data:image/${ref.fileType};base64,${base64}`
  }

  /** 展示 URL（resource:// 协议，渲染层拦截可显图） */
  getFileUrl(ref: AiAttachmentRef): string {
    return `resource://${normalizeRelativePath(ref.rel)}`
  }

  /** 删除物理文件（失败仅返回 false，调用方记日志不阻断） */
  async deleteAttachment(ref: AiAttachmentRef): Promise<boolean> {
    return deleteManagedFile(ref.rel)
  }
}

export const aiAttachmentManager = new AiAttachmentManager()
