/**
 * 网格/表格视图模式偏好持久化（localStorage，按页面 key 区分）
 */
export type ViewMode = 'grid' | 'table'

const STORAGE_PREFIX = 'scgp.'

export function restoreViewMode(pageKey: string): ViewMode {
  return localStorage.getItem(`${STORAGE_PREFIX}${pageKey}.viewMode`) === 'table' ? 'table' : 'grid'
}

export function persistViewMode(pageKey: string, mode: ViewMode): void {
  localStorage.setItem(`${STORAGE_PREFIX}${pageKey}.viewMode`, mode)
}
