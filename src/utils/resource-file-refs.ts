/**
 * 资源文件引用解析（A4 资源文件生命周期）
 *
 * 统一「托管 / 预置」路径判定，供删除/替换/备份/GC 共用。
 *
 * - 托管（managed）：用户上传的文件，可删、进备份。前缀 uploaded/、teaching-materials/
 * - 预置（preset）：随包内置资源，永不删、不进备份。前缀 docs/、images/、videos/、audio/
 *
 * 判定依据见 docs/plans/2026-07-15-a4-resource-file-lifecycle-plan.md §2.7：
 * 活写盘链路 C 写 teaching-materials/、链路 D 写 uploaded/ai-scenes/；
 * 预置前缀来自 assets/resources。
 */

/** 托管前缀：用户文件，可删 / 进备份 */
export const MANAGED_PREFIXES = ['uploaded/', 'teaching-materials/'] as const
/** 预置前缀：随包内置，永不删 / 不进备份 */
export const PRESET_PREFIXES = ['docs/', 'images/', 'videos/', 'audio/'] as const

/**
 * 把资源引用归一成相对路径。
 *
 * - `resource://` / `resource:///` / 前导斜杠 → 相对路径
 * - 非资源引用（emoji / http / data / blob / file / ftp / 空）→ `''`
 *
 * 归一后仍可能是托管、预置或未知前缀；再用 isManagedResourcePath / isPresetResourcePath 判定。
 */
export function normalizeResourceUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  let s = value.trim()
  if (!s) {
    return ''
  }

  // resource:// 或 resource:/// 前缀 → 取相对路径部分
  const matched = s.match(/^resource:\/{2,3}(.*)$/i)
  if (matched) {
    s = matched[1] ?? ''
  }

  // 统一分隔符 + 去前导斜杠
  s = s.replace(/\\/g, '/').replace(/^\/+/, '')

  if (!s) {
    return ''
  }

  // 非资源引用（外链 / 内联数据 / emoji 标记）→ 空
  if (/^(emoji:|https?:|data:|blob:|ftp:|file:)/i.test(s)) {
    return ''
  }

  return s
}

/** 是否命中托管前缀（用户文件，可删 / 进备份） */
export function isManagedResourcePath(relativePath: string): boolean {
  if (!relativePath) {
    return false
  }
  return (MANAGED_PREFIXES as readonly string[]).some((prefix) => relativePath.startsWith(prefix))
}

/** 是否命中预置前缀（随包内置，永不删） */
export function isPresetResourcePath(relativePath: string): boolean {
  if (!relativePath) {
    return false
  }
  return (PRESET_PREFIXES as readonly string[]).some((prefix) => relativePath.startsWith(prefix))
}

/** 递归收集对象 / 数组中的所有字符串值（用于扫 meta_data JSON） */
function collectStrings(value: unknown, acc: string[]): void {
  if (value == null) {
    return
  }
  if (typeof value === 'string') {
    acc.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, acc)
    }
    return
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectStrings((value as Record<string, unknown>)[key], acc)
    }
  }
}

/** 容错解析 JSON 字符串；非字符串 / 解析失败返回 null */
function safeParseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * 从一行资源数据抽取所有「托管」相对路径（去重）。
 *
 * 扫描 `cover_image` 字段 + `meta_data`（JSON 字符串或已解析对象）内的所有字符串值，
 * 归一后只保留命中托管前缀的路径。
 *
 * 用于 hardDeleteResource / updateResource 钩子判定要清哪些物理文件。
 */
export function extractResourceFileRefs(row: {
  cover_image?: unknown
  meta_data?: unknown
} | null | undefined): string[] {
  if (!row) {
    return []
  }

  const strings: string[] = []
  collectStrings(row.cover_image, strings)

  if (row.meta_data != null) {
    const parsed = typeof row.meta_data === 'string' ? safeParseJson(row.meta_data) : row.meta_data
    collectStrings(parsed, strings)
  }

  const refs = new Set<string>()
  for (const raw of strings) {
    const rel = normalizeResourceUrl(raw)
    if (rel && isManagedResourcePath(rel)) {
      refs.add(rel)
    }
  }

  return Array.from(refs)
}
