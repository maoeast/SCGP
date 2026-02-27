/**
 * 媒体资源 URL 处理工具
 * 统一处理图片、视频等资源路径，适配开发和 Electron 打包环境
 */

/**
 * 获取媒体资源的正确 URL
 * @param path 原始路径
 * @returns 处理后的 URL
 */
export function getMediaUrl(path: string): string {
  // 如果是 base64 数据，直接返回
  if (path.startsWith('data:')) {
    return path
  }

  // 如果是 file:// 协议的完整路径，直接返回
  if (path.startsWith('file://')) {
    return path
  }

  // 如果是 http(s) 协议的远程资源，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // 如果是 public 目录下的资源（tasks/ 开头），直接返回相对路径
  // 适配 Electron 打包后的 file:// 协议
  if (path.startsWith('tasks/')) {
    return path
  }

  // 如果是 /tasks/ 开头的绝对路径，转换为相对路径
  if (path.startsWith('/tasks/')) {
    return path.slice(1) // 去掉开头的 /
  }

  // 如果是模拟数据路径（/resources/ 开头），返回空（无封面）
  if (path.startsWith('/resources/')) {
    return ''
  }

  // 如果是本地文件路径（assets/ 开头），直接返回
  if (path.startsWith('assets/')) {
    return path
  }

  // 其他情况直接返回原路径
  return path
}

/**
 * 获取默认封面图片路径
 * @returns 默认封面图片路径
 */
export function getDefaultCoverImage(): string {
  return 'tasks/default-task-cover.jpg'
}
