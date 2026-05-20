export type AccessScope = 'global' | 'module' | 'entitlement' | 'entitlement-any'

export interface AccessControlledItem {
  accessScope: AccessScope
  moduleCode?: string | null
  entitlementCode?: string | null
  entitlementCodes?: readonly string[] | null
}

export type ModuleAccessChecker = (moduleCode: string) => boolean
export type EntitlementAccessChecker = (entitlementCode: string) => boolean

export function isAccessControlledItemVisible(
  item: AccessControlledItem,
  hasModuleAccess: ModuleAccessChecker,
  hasEntitlementAccess: EntitlementAccessChecker,
): boolean {
  if (item.accessScope === 'global') {
    return true
  }

  if (item.accessScope === 'entitlement') {
    if (!item.entitlementCode) {
      return false
    }

    return hasEntitlementAccess(item.entitlementCode)
  }

  if (item.accessScope === 'entitlement-any') {
    if (!item.entitlementCodes || item.entitlementCodes.length === 0) {
      return false
    }

    return item.entitlementCodes.some((entitlementCode) => hasEntitlementAccess(entitlementCode))
  }

  if (!item.moduleCode) {
    return false
  }

  return hasModuleAccess(item.moduleCode)
}

export function filterVisibleAccessControlledItems<T extends AccessControlledItem>(
  items: readonly T[],
  hasModuleAccess: ModuleAccessChecker,
  hasEntitlementAccess: EntitlementAccessChecker,
): T[] {
  return items.filter((item) => isAccessControlledItemVisible(item, hasModuleAccess, hasEntitlementAccess))
}
