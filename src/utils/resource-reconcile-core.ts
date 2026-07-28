import {
  extractResourceFileRefs,
  normalizeResourceUrl,
  isManagedResourcePath,
} from './resource-file-refs'

/** 磁盘文件描述（托管相对路径 + 字节大小） */
export interface DiskFile {
  rel: string
  size: number
}

/** 孤儿体检报告（dry-run，只读） */
export interface OrphanReport {
  /** 孤儿文件（磁盘存在但无 DB 引用） */
  orphans: DiskFile[]
  /** 孤儿占用字节 */
  totalBytes: number
  /** 磁盘托管文件总数（含在用 + 孤儿） */
  totalDiskFiles: number
  /** 磁盘托管文件总字节（含在用 + 孤儿） */
  totalDiskBytes: number
}

/** 清理结果 */
export interface PurgeResult {
  /** 成功删除数 */
  deleted: number
  /** 失败项（含路径校验未过 + 删除失败） */
  failed: Array<{ rel: string }>
  /** 实际释放字节（仅成功删除项） */
  freedBytes: number
}

export interface ResourceReferenceRows {
  resourceRows?: Array<{ cover_image?: unknown; meta_data?: unknown }>
  materialRows?: Array<{ file_path?: unknown }>
  messageRows?: Array<{ attachments?: unknown }>
  configRows?: Array<{ value?: unknown }>
}

export function collectReferencedPathsFromRows(rows: ResourceReferenceRows): Set<string> {
  const refs = new Set<string>()

  for (const row of rows.resourceRows || []) {
    for (const rel of extractResourceFileRefs(row)) {
      refs.add(rel)
    }
  }

  for (const row of rows.materialRows || []) {
    const rel = normalizeResourceUrl(row.file_path)
    if (rel && isManagedResourcePath(rel)) {
      refs.add(rel)
    }
  }

  for (const row of rows.messageRows || []) {
    let parsed: unknown
    try {
      parsed = typeof row.attachments === 'string' ? JSON.parse(row.attachments) : null
    } catch {
      continue
    }
    if (!Array.isArray(parsed)) continue
    for (const item of parsed as Array<{ rel?: unknown }>) {
      const rel = normalizeResourceUrl(item?.rel)
      if (rel && isManagedResourcePath(rel)) {
        refs.add(rel)
      }
    }
  }

  for (const row of rows.configRows || []) {
    let parsed: unknown
    try {
      parsed = typeof row.value === 'string' ? JSON.parse(row.value) : null
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object') continue

    for (const media of Object.values(parsed as Record<string, unknown>)) {
      if (!media || typeof media !== 'object') continue
      for (const value of Object.values(media as Record<string, unknown>)) {
        const rel = normalizeResourceUrl(value)
        if (rel && isManagedResourcePath(rel)) {
          refs.add(rel)
        }
      }
    }
  }

  return refs
}

export function buildOrphanReport(referenced: Set<string>, disk: DiskFile[]): OrphanReport {
  const orphans: DiskFile[] = []
  let totalDiskBytes = 0

  for (const f of disk) {
    totalDiskBytes += f.size
    if (!referenced.has(f.rel)) {
      orphans.push(f)
    }
  }

  return {
    orphans,
    totalBytes: orphans.reduce((sum, f) => sum + f.size, 0),
    totalDiskFiles: disk.length,
    totalDiskBytes,
  }
}
