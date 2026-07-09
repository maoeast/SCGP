/**
 * 器材 → entitlement 解析（recommendation engine）
 *
 * 锁定决策 #4：每件器材映射到【唯一】entitlement，硬过滤用 hasEntitlementAccess。
 * 禁用模块级 canAccessModuleByEntitlements（太粗：sensory 模块含 sensory_integration + fine_motor，
 * 只开感统训练会误放精细动作器材）。
 *
 * 关键坑（必须 category-driven，不能用 moduleCode）：
 * - fine-motor 器材 moduleCode=sensory（见 DOMAIN_MODULE_MAP fine-motor→SENSORY）。
 * - 若按 moduleCode 判权，fine-motor 器材会被误判为 sensory_integration，导致只开感统包时误放精细动作器材。
 * - 因此本解析只看 resource.category：物理 6 域 category 直接映射，7 个感官 category 归 sensory_integration。
 *
 * @module features/recommendation/equipment-entitlement
 */

import type { EntitlementCode } from '@/features/entitlements/entitlement-catalog'
import type { ResourceItem } from '@/types/module'
import { SENSORY_EQUIPMENT_CATEGORIES } from './ability-taxonomy'

/** 物理 6 域 tr.category → 唯一 entitlement */
const PHYSICAL_CATEGORY_ENTITLEMENT: Record<string, EntitlementCode> = {
  'emotional-regulation': 'emotional',
  'social-communication': 'social_communication',
  'fine-motor': 'fine_motor',
  'soothing-aids': 'soothing_aids',
  'daily-living': 'life_skills',
  'cognitive': 'cognitive',
}

/**
 * 按【器材 category】解析其唯一 entitlement。
 *
 * @param resource 器材资源（只需 category 字段）
 * @returns entitlement code；无法识别时返回 null（调用方应丢弃，避免误放）
 */
export function resolveEquipmentEntitlement(
  resource: Pick<ResourceItem, 'category'>
): EntitlementCode | null {
  const category = resource.category
  if (!category || typeof category !== 'string') {
    return null
  }

  const physicalHit = PHYSICAL_CATEGORY_ENTITLEMENT[category]
  if (physicalHit) {
    return physicalHit
  }

  if ((SENSORY_EQUIPMENT_CATEGORIES as readonly string[]).includes(category)) {
    return 'sensory_integration'
  }

  return null
}

/**
 * 判断器材是否可被当前授权访问（硬过滤入口）。
 *
 * @param resource 器材资源
 * @param hasEntitlement entitlement 判定函数（store 注入 authStore.hasEntitlementAccess）
 */
export function isEquipmentAccessible(
  resource: Pick<ResourceItem, 'category'>,
  hasEntitlement: (code: string) => boolean
): boolean {
  const entitlement = resolveEquipmentEntitlement(resource)
  if (!entitlement) {
    return false
  }
  return hasEntitlement(entitlement)
}
