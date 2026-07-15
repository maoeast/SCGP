/**
 * 资源文件服务（A4 资源文件生命周期）
 *
 * 面向「托管相对路径」的文件落盘原语：解析绝对路径、删除托管文件。
 * 唯一正确根 = userData/resources（见 docs/plans/2026-07-15-a4-resource-file-lifecycle-plan.md §2.1）。
 *
 * 由 teaching-material-file-manager.ts 复用（去重），并供 resource-api 删除/替换钩子、
 * Phase 2/3 备份与 GC 共用。
 */

/** 归一化相对路径：统一正斜杠、去前导斜杠、折叠重复分隔符 */
export function normalizeRelativePath(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
}

/** 按基础路径的操作系统风格拼接（Windows basePath 用反斜杠） */
export function joinFileSystemPath(basePath: string, relativePath: string): string {
  const separator = basePath.includes('\\') ? '\\' : '/'
  const cleanedBase = basePath.replace(/[\\/]+$/, '')
  const cleanedRelative = relativePath
    .replace(/^[\\/]+/, '')
    .replace(/[\\/]+/g, separator)

  return `${cleanedBase}${separator}${cleanedRelative}`
}

let managedRootCache: Promise<string> | null = null

/**
 * 托管根目录绝对路径（userData/resources），进程内缓存。
 * 非 Electron 环境返回 '/resources' 占位（与原 TeachingMaterialFileManager 行为一致）。
 */
export function getManagedRoot(): Promise<string> {
  if (!managedRootCache) {
    managedRootCache = (async () => {
      if (!window.electronAPI) {
        return '/resources'
      }
      const userDataPath = await window.electronAPI.getUserDataPath()
      return joinFileSystemPath(userDataPath, 'resources')
    })()
  }
  return managedRootCache
}

/** 把托管相对路径解析为 userData/resources 下的绝对路径 */
export async function resolveAbsolutePath(relativePath: string): Promise<string> {
  const managedRoot = await getManagedRoot()
  return joinFileSystemPath(managedRoot, normalizeRelativePath(relativePath))
}

/**
 * 删除托管相对路径对应的物理文件。
 * 非 Electron 环境直接返回 true；删除失败返回 false（调用方决定是否记日志）。
 */
export async function deleteManagedFile(relativePath: string): Promise<boolean> {
  if (!window.electronAPI) {
    return true
  }
  const absolutePath = await resolveAbsolutePath(relativePath)
  return window.electronAPI.deleteFile(absolutePath)
}
