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
let appResourcesRootCache: Promise<string> | null = null

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

/**
 * 应用预置资源根目录（{installDir}/resources），进程内缓存。
 * 用于 assets/ 前缀的只读预置资源（如 SFX 解压的视频）。
 * 非 Electron 环境返回 '/app-resources' 占位。
 */
export function getAppResourcesRoot(): Promise<string> {
  if (!appResourcesRootCache) {
    appResourcesRootCache = (async () => {
      if (!window.electronAPI) {
        return '/app-resources'
      }
      return window.electronAPI.getAppResourcesPath()
    })()
  }
  return appResourcesRootCache
}

/**
 * 把相对路径解析为绝对路径。
 * - assets/ 前缀 → {installDir}/resources/{relativePath}（只读预置资源）
 * - 其他 → {userData}/resources/{relativePath}（可写托管资源）
 */
export async function resolveAbsolutePath(relativePath: string): Promise<string> {
  const normalized = normalizeRelativePath(relativePath)

  if (normalized.startsWith('assets/')) {
    const appRoot = await getAppResourcesRoot()
    return joinFileSystemPath(appRoot, normalized)
  }

  const managedRoot = await getManagedRoot()
  return joinFileSystemPath(managedRoot, normalized)
}

/**
 * 删除托管相对路径对应的物理文件。
 * 非 Electron 环境直接返回 true；删除失败返回 false（调用方决定是否记日志）。
 * 注意：assets/ 前缀的预置资源不可删除，直接返回 false。
 */
export async function deleteManagedFile(relativePath: string): Promise<boolean> {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized.startsWith('assets/')) {
    console.warn('[ResourceFileService] 预置资源不可删除:', relativePath)
    return false
  }

  if (!window.electronAPI) {
    return true
  }

  const absolutePath = await resolveAbsolutePath(relativePath)
  return window.electronAPI.deleteFile(absolutePath)
}
