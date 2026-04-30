export type AccessScope = 'global' | 'module'

export interface AccessControlledItem {
  accessScope: AccessScope
  moduleCode?: string | null
}

export type ModuleAccessChecker = (moduleCode: string) => boolean

export function isAccessControlledItemVisible(
  item: AccessControlledItem,
  hasModuleAccess: ModuleAccessChecker,
): boolean {
  if (item.accessScope === 'global') {
    return true
  }

  if (!item.moduleCode) {
    return false
  }

  return hasModuleAccess(item.moduleCode)
}

export function filterVisibleAccessControlledItems<T extends AccessControlledItem>(
  items: readonly T[],
  hasModuleAccess: ModuleAccessChecker,
): T[] {
  return items.filter((item) => isAccessControlledItemVisible(item, hasModuleAccess))
}
