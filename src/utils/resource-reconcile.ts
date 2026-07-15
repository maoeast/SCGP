/**
 * 资源文件孤儿回收（A4 Phase 3 §5.1）
 *
 * 历史遗留 + 未来漂移的孤儿物理文件清理（维护动作，非自动）。
 *
 * - 托管路径规则见 docs/plans/2026-07-15-a4-resource-file-lifecycle-plan.md §2.7：
 *   可删/进备份前缀 = `uploaded/`、`teaching-materials/`；预置（docs/images/videos/audio/）永不删。
 * - dry-run 优先：先 `findOrphans()` 展示报告，用户确认后才 `purgeOrphans()`。
 * - 不做启动自动清理（避免误删 + 性能抖动）。
 *
 * 复用：`extractResourceFileRefs`（扫 sys_training_resource 行）/ `normalizeResourceUrl` +
 * `isManagedResourcePath`（判定 teaching_material.file_path）/ `deleteManagedFile`（删托管文件）。
 */

import { getDatabase } from '@/database/init'
import {
  extractResourceFileRefs,
  normalizeResourceUrl,
  isManagedResourcePath,
} from './resource-file-refs'
import { deleteManagedFile } from './resource-file-service'

/** 磁盘上的托管子树（与 main.mjs MANAGED_SUBDIRS + resource-file-refs MANAGED_PREFIXES 一致） */
const MANAGED_SUBTREES = ['uploaded', 'teaching-materials'] as const

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

/**
 * 收集 DB 中被引用的「托管」相对路径集（同步）。
 *
 * 扫描 `sys_training_resource`（cover_image + meta_data）与 `teaching_material.file_path`，
 * 归一后只保留命中托管前缀的路径。
 *
 * 注意：`sys_training_resource` **不过滤 is_active** —— 软删资源保留文件以便恢复，
 * 其文件必须算「在用」，否则一软删就被 GC 误清。
 */
export function collectReferencedPaths(): Set<string> {
  const db = getDatabase()
  const refs = new Set<string>()

  // sys_training_resource：cover_image + meta_data（含软删行，文件保留以便恢复）
  try {
    const resourceRows = db.all(
      'SELECT cover_image, meta_data FROM sys_training_resource'
    ) as Array<{ cover_image?: unknown; meta_data?: unknown }>
    for (const row of resourceRows) {
      for (const rel of extractResourceFileRefs(row)) {
        refs.add(rel)
      }
    }
  } catch (error) {
    console.warn('[resource-reconcile] 读取 sys_training_resource 引用失败:', error)
  }

  // teaching_material：file_path 为无 resource:// 前缀的相对路径
  try {
    const materialRows = db.all(
      'SELECT file_path FROM teaching_material'
    ) as Array<{ file_path?: unknown }>
    for (const row of materialRows) {
      const rel = normalizeResourceUrl(row.file_path)
      if (rel && isManagedResourcePath(rel)) {
        refs.add(rel)
      }
    }
  } catch (error) {
    console.warn('[resource-reconcile] 读取 teaching_material 引用失败:', error)
  }

  return refs
}

/**
 * 收集磁盘上的托管文件（异步）。
 *
 * 通过 `walk-dir` IPC 递归列 `userData/resources` 下的 `uploaded` + `teaching-materials` 子树。
 * 子目录不存在视为空；非 Electron 环境返回空数组。
 */
export async function collectDiskPaths(): Promise<DiskFile[]> {
  const files: DiskFile[] = []
  if (!window.electronAPI) {
    return files
  }

  for (const sub of MANAGED_SUBTREES) {
    const res = await window.electronAPI.walkDir(sub)
    if (!res?.success || !Array.isArray(res.files)) {
      continue
    }
    for (const f of res.files) {
      // walk-dir 返回的 rel 已带子树前缀（如 uploaded/...）；再兜底归一 + 托管校验
      if (isManagedResourcePath(f.rel)) {
        files.push({ rel: f.rel, size: f.size ?? 0 })
      }
    }
  }

  return files
}

/**
 * 孤儿体检报告（dry-run，只读）。
 *
 * 孤儿 = 磁盘托管文件 − DB 引用集。不删除任何文件。
 */
export async function findOrphans(): Promise<OrphanReport> {
  const referenced = collectReferencedPaths()
  const disk = await collectDiskPaths()

  const orphans: DiskFile[] = []
  let totalDiskBytes = 0
  for (const f of disk) {
    totalDiskBytes += f.size
    if (!referenced.has(f.rel)) {
      orphans.push(f)
    }
  }

  const totalBytes = orphans.reduce((sum, f) => sum + f.size, 0)
  return {
    orphans,
    totalBytes,
    totalDiskFiles: disk.length,
    totalDiskBytes,
  }
}

/**
 * 清理孤儿文件（执行）。
 *
 * 逐个 `deleteManagedFile`；每个目标先过 `isManagedResourcePath` 校验，防误删预置 / 路径越界。
 * 单文件失败不阻断其余（记入 failed）。
 *
 * 建议传 `findOrphans().orphans` 中用户确认的子集。
 */
export async function purgeOrphans(targets: DiskFile[]): Promise<PurgeResult> {
  let deleted = 0
  let freedBytes = 0
  const failed: Array<{ rel: string }> = []

  for (const target of targets) {
    if (!isManagedResourcePath(target.rel)) {
      failed.push({ rel: target.rel })
      continue
    }
    const ok = await deleteManagedFile(target.rel)
    if (ok) {
      deleted++
      freedBytes += target.size ?? 0
    } else {
      failed.push({ rel: target.rel })
    }
  }

  return { deleted, failed, freedBytes }
}
