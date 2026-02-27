/**
 * SIC-ADS 图片处理工具
 *
 * Phase 2.2: 基于 Canvas 的图片压缩和格式转换
 * 零原生依赖，使用浏览器 Canvas API
 *
 * 功能：
 * 1. 图片压缩（保持原格式或转换为 WebP）
 * 2. 尺寸调整
 * 3. 格式转换（JPEG/PNG → WebP）
 * 4. 质量控制（0.1-1.0）
 */

interface CompressOptions {
  quality?: number        // 压缩质量 0.1-1.0，默认 0.8
  maxWidth?: number      // 最大宽度，默认 1920
  maxHeight?: number     // 最大高度，默认 1080
  format?: 'jpeg' | 'png' | 'webp'  // 输出格式，默认保持原格式
  enableWebP?: boolean  // 是否启用 WebP（如果浏览器支持）
}

interface CompressResult {
  success: boolean
  blob?: Blob
  dataUrl?: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
  format: string
  error?: string
}

/**
 * 检测 WebP 支持
 */
function supportsWebP(): boolean {
  const canvas = document.createElement('canvas')
  // 检测 toDataURL 是否支持 image/webp
  canvas.toDataURL('image/webp').startsWith('data:image/webp')
  return true
} catch {
  return false
}
}

/**
 * 加载图片为 Image 对象
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 压缩图片
 * @param file - 原始文件
 * @param options - 压缩选项
 * @returns Promise<CompressResult>
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<CompressResult> {
  try {
    // 默认选项
    const opts: Required<CompressOptions> = {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      format: undefined, // 保持原格式
      enableWebP: true,
      ...options
    }

    // 加载图片
    const img = await loadImage(file)

    // 计算目标尺寸（保持宽高比）
    let targetWidth = img.width
    let targetHeight = img.height

    if (targetWidth > opts.maxWidth || targetHeight > opts.maxHeight) {
      const widthRatio = opts.maxWidth / targetWidth
      const heightRatio = opts.maxHeight / targetHeight
      const ratio = Math.min(widthRatio, heightRatio)

      targetWidth = Math.floor(targetWidth * ratio)
      targetHeight = Math.floor(targetHeight * ratio)
    }

    // 创建 Canvas
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法获取 Canvas 上下文')
    }

    // 绘制图片
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    // 确定输出格式
    let outputFormat = opts.format
    if (!outputFormat) {
      // 尝试使用 WebP（如果启用且支持）
      if (opts.enableWebP && supportsWebP()) {
        outputFormat = 'webp'
      } else {
        // 根据原文件类型决定
        const fileType = file.type
        if (fileType === 'image/png') {
          outputFormat = 'png'
        } else {
          outputFormat = 'jpeg'
        }
      }
    }

    // 转换为 Blob
    const mimeFormat = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`
    const dataUrl = canvas.toDataURL(mimeFormat, opts.quality)

    // 转换 dataURL 为 Blob
    const blob = await (await fetch(dataUrl)).blob()

    // 获取原始大小
    const originalSize = file.size
    const compressedSize = blob.size
    const compressionRatio = originalSize > 0 ? (compressedSize / originalSize) : 1

    return {
      success: true,
      blob,
      dataUrl,
      originalSize,
      compressedSize,
      compressionRatio,
      format: outputFormat
    }
  } catch (error: any) {
    return {
      success: false,
      originalSize: file.size,
      compressedSize: 0,
      compressionRatio: 1,
      format: 'unknown',
      error: error.message
    }
  }
}

/**
 * 批量压缩图片
 * @param files - 文件列表
 * @param options - 压缩选项
 * @returns Promise<CompressResult[]>
 */
export async function compressImages(files: File[], options: CompressOptions = {}): Promise<CompressResult[]> {
  const results: CompressResult[] = []

  for (const file of files) {
    // 只处理图片文件
    if (!file.type.startsWith('image/')) {
      results.push({
        success: false,
        originalSize: file.size,
        compressedSize: 0,
        compressionRatio: 1,
        format: 'unknown',
        error: '非图片文件'
      })
      continue
    }

    const result = await compressImage(file, options)
    results.push(result)
  }

  return results
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * 生成唯一文件名
 * @param originalName - 原始文件名
 * @returns 唯一文件名（带时间戳）
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)

  // 提取文件扩展名
  const lastDotIndex = originalName.lastIndexOf('.')
  const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName
  const ext = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : ''

  // 组合：原名_时间戳_随机.扩展名
  return `${nameWithoutExt}_${timestamp}_${randomStr}${ext}`
}
