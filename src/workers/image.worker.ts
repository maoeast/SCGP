/**
 * Image Worker — 图片压缩/缩放 Web Worker (A2)
 *
 * 使用 OffscreenCanvas 在 Worker 线程中处理图片，
 * 避免主线程 Canvas 操作导致的 UI 卡顿。
 *
 * 协议：
 * - 主线程发送 { type: 'process', id, payload: { buffer, options } }
 * - Worker 处理后回复 { id, success, data?: { blob, ... }, error? }
 *
 * 浏览器要求：OffscreenCanvas + convertToBlob (Chrome 97+, Edge 97+, Firefox 105+)
 * 不支持的浏览器应回退到主线程 image-processor.ts。
 *
 * @module image.worker
 */

interface ProcessOptions {
  /** 最大宽度（默认 1920） */
  maxWidth?: number
  /** 最大高度（默认 1080） */
  maxHeight?: number
  /** 输出质量 0.1-1.0（默认 0.8） */
  quality?: number
  /** 输出格式（默认 'webp'） */
  format?: 'jpeg' | 'png' | 'webp'
}

interface ProcessPayload {
  buffer: ArrayBuffer
  options: ProcessOptions
  originalSize: number
}

interface WorkerMessage {
  type: string
  id: string
  payload: ProcessPayload
}

interface WorkerResponse {
  id: string
  success: boolean
  data?: {
    blob: Blob
    originalSize: number
    compressedSize: number
    format: string
  }
  error?: string
}

function respond(id: string, success: boolean, data?: WorkerResponse['data'], error?: string): void {
  const response: WorkerResponse = { id, success, data, error }
  self.postMessage(response)
}

async function handleProcess(id: string, payload: ProcessPayload): Promise<void> {
  const { buffer, options, originalSize } = payload
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'webp',
  } = options

  try {
    // 步骤 1: 解码图片为 ImageBitmap（在 Worker 中完成，不阻塞主线程）
    const imageBitmap = await createImageBitmap(new Blob([buffer], { type: 'image/*' }))

    // 步骤 2: 计算目标尺寸（保持宽高比）
    let targetWidth = imageBitmap.width
    let targetHeight = imageBitmap.height

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const widthRatio = maxWidth / targetWidth
      const heightRatio = maxHeight / targetHeight
      const ratio = Math.min(widthRatio, heightRatio)
      targetWidth = Math.floor(targetWidth * ratio)
      targetHeight = Math.floor(targetHeight * ratio)
    }

    // 步骤 3: 在 OffscreenCanvas 上绘制缩放后的图片
    const canvas = new OffscreenCanvas(targetWidth, targetHeight)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法获取 OffscreenCanvas 2D 上下文')
    }
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)

    // 释放 ImageBitmap（不再需要）
    imageBitmap.close()

    // 步骤 4: 导出为 Blob
    const mimeType = `image/${format}` as 'image/webp' | 'image/jpeg' | 'image/png'
    const blob = await canvas.convertToBlob({ type: mimeType, quality })

    respond(id, true, {
      blob,
      originalSize,
      compressedSize: blob.size,
      format,
    })
  } catch (err: any) {
    respond(id, false, undefined, err.message || '图片处理失败')
  }
}

// Worker 入口
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data

  switch (type) {
    case 'process':
      handleProcess(id, payload)
      break
    default:
      respond(id, false, undefined, `未知的消息类型: ${type}`)
  }
}
