/**
 * Image Worker Bridge (A2)
 *
 * 主线程 ↔ Image Worker 的桥接层。
 *
 * 使用方式：
 * ```ts
 * import { compressImageViaWorker, isImageWorkerSupported } from '@/utils/image-worker-bridge'
 *
 * if (isImageWorkerSupported()) {
 *   const result = await compressImageViaWorker(file, { maxWidth: 800 })
 * }
 * ```
 *
 * 浏览器要求：OffscreenCanvas + convertToBlob
 * 不支持的浏览器请回退到 image-processor.ts 的主线程路径。
 *
 * @module image-worker-bridge
 */

import ImageWorker from '@/workers/image.worker.ts?worker'
import type { CompressResult } from './image-processor'

/** 与 image-processor.ts 保持一致的选项，仅多一个 timeout */
interface CompressOptions {
  quality?: number
  maxWidth?: number
  maxHeight?: number
  format?: 'jpeg' | 'png' | 'webp'
  /** 单张处理超时（ms），默认 30000 */
  timeout?: number
}

/** 检测当前浏览器是否支持 Image Worker（OffscreenCanvas + convertToBlob） */
export function isImageWorkerSupported(): boolean {
  try {
    if (typeof OffscreenCanvas === 'undefined') return false
    const canvas = new OffscreenCanvas(1, 1)
    return typeof canvas.convertToBlob === 'function'
  } catch {
    return false
  }
}

/** 单例 worker 实例，惰性创建 */
let workerInstance: Worker | null = null
let workerSupported: boolean | null = null

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new ImageWorker()
  }
  return workerInstance
}

/** 请求计数器，用于生成唯一 id */
let requestId = 0

/**
 * 通过 Worker 压缩单张图片
 *
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns CompressResult（与 image-processor.ts 的 compressImage 返回结构一致）
 */
export async function compressImageViaWorker(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  // 懒检测：仅首次调用时检查
  if (workerSupported === null) {
    workerSupported = isImageWorkerSupported()
  }
  if (!workerSupported) {
    return {
      success: false,
      originalSize: file.size,
      compressedSize: 0,
      compressionRatio: 1,
      format: 'unknown',
      error: 'Image Worker 不支持（OffscreenCanvas.convertToBlob 不可用）',
    }
  }

  const id = `img-${++requestId}-${Date.now()}`
  const timeout = options.timeout ?? 30000

  try {
    const buffer = await file.arrayBuffer()
    const worker = getWorker()

    const result = await new Promise<CompressResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`图片处理超时 (${timeout}ms)`))
      }, timeout)

      const onMessage = (event: MessageEvent) => {
        const msg = event.data
        if (msg?.id !== id) return

        clearTimeout(timer)
        worker.removeEventListener('message', onMessage)

        if (msg.success) {
          const { blob, originalSize, compressedSize, format } = msg.data
          resolve({
            success: true,
            blob,
            originalSize,
            compressedSize,
            compressionRatio: originalSize > 0 ? (compressedSize / originalSize) : 1,
            format,
          })
        } else {
          resolve({
            success: false,
            originalSize: file.size,
            compressedSize: 0,
            compressionRatio: 1,
            format: 'unknown',
            error: msg.error || 'Worker 处理失败',
          })
        }
      }

      worker.addEventListener('message', onMessage)
      worker.postMessage({
        type: 'process',
        id,
        payload: {
          buffer,
          options: {
            maxWidth: options.maxWidth ?? 1920,
            maxHeight: options.maxHeight ?? 1080,
            quality: options.quality ?? 0.8,
            format: options.format ?? 'webp',
          },
          originalSize: file.size,
        },
      }, [buffer]) // transfer ArrayBuffer 所有权给 Worker（零拷贝）
    })

    return result
  } catch (error: any) {
    return {
      success: false,
      originalSize: file.size,
      compressedSize: 0,
      compressionRatio: 1,
      format: 'unknown',
      error: error.message || 'Worker 通信失败',
    }
  }
}

/**
 * 销毁 Worker 实例
 */
export function destroyImageWorker(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
}
