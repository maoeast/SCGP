export type ResourceRestoreStatus = 'restored' | 'partial' | 'skipped' | 'failed'

export interface ResourceRestoreFailure {
  rel?: string
  error: string
}

export interface ResourceRestoreResult {
  status: ResourceRestoreStatus
  restored: number
  failed: ResourceRestoreFailure[]
  reason?: string
}

export interface BackupImportResult {
  database: 'restored'
  resources: ResourceRestoreResult
  backupVersion: string
  requiresUpgrade: boolean
  totalRecords: number
  providerSecretsIncluded?: boolean
}

export interface ResourceArchiveUnpackLikeResult {
  success: boolean
  error?: string
  restored?: number
  failed?: ResourceRestoreFailure[]
}

export function skippedResourceRestore(reason: string): ResourceRestoreResult {
  return {
    status: 'skipped',
    restored: 0,
    failed: [],
    reason,
  }
}

export function failedResourceRestore(reason: string, error: string): ResourceRestoreResult {
  return {
    status: 'failed',
    restored: 0,
    failed: [{ error }],
    reason,
  }
}

export function classifyResourceUnpackResult(result: ResourceArchiveUnpackLikeResult): ResourceRestoreResult {
  const restored = Number(result.restored || 0)
  const failed = Array.isArray(result.failed) ? result.failed : []

  if (!result.success) {
    return {
      status: 'failed',
      restored,
      failed: failed.length > 0 ? failed : [{ error: result.error || '资源文件解包失败' }],
      reason: 'unpack_failed',
    }
  }

  if (failed.length > 0) {
    return {
      status: 'partial',
      restored,
      failed,
      reason: 'partial_restore',
    }
  }

  return {
    status: 'restored',
    restored,
    failed: [],
  }
}
