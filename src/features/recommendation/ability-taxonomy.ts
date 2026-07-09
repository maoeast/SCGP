/**
 * 统一障碍领域本体（recommendation engine）
 *
 * 评估侧 12 个量表各有自己的 dimensions，缺乏跨量表统一"障碍领域"。
 * 本文件定义对齐 7 个器材可覆盖 entitlement 的统一领域本体，
 * 并为每个领域标注其器材查询口径（moduleCode + tr.category 列表）。
 *
 * 设计要点：
 * - 无配套器材的领域（大运动/纯语言语义）标记 equipmentSupported=false，面板提示"暂无配套器材"。
 * - language 无独立 entitlement 包 → 归 cognitive（共享认知器材与授权）。
 * - 每个领域的器材查询口径是 category-driven（见 equipment-entitlement.ts 的判权说明）。
 *
 * @module features/recommendation/ability-taxonomy
 */

import { ModuleCode } from '@/types/module'
import type { EntitlementCode } from '@/features/entitlements/entitlement-catalog'

/** 统一障碍领域（对齐 7 个器材可覆盖 entitlement） */
export const UNIFIED_DOMAINS = [
  'cognitive',
  'language',
  'gross_motor',
  'fine_motor',
  'social',
  'emotional',
  'sensory_integration',
  'life_skills',
  'soothing',
] as const

export type UnifiedDomain = typeof UNIFIED_DOMAINS[number]

/** 器材查询口径（store 用 ResourceAPI.getResources 按 category 精确查询） */
export interface EquipmentQuerySpec {
  moduleCode: ModuleCode
  /** 该领域下的 tr.category 值列表（ResourceAPI.getResources 按 category 精确匹配，逐个取后并集） */
  categories: string[]
}

export interface UnifiedDomainDefinition {
  domain: UnifiedDomain
  /** 中文展示名 */
  label: string
  /** 映射到的唯一 entitlement（无器材包的为 null） */
  entitlement: EntitlementCode | null
  /** 是否有配套器材 */
  equipmentSupported: boolean
  /** 器材查询口径（equipmentSupported=false 时为 null） */
  equipmentQuery: EquipmentQuerySpec | null
}

/**
 * 感觉统合域的 7 个旧感官 category
 * （moduleCode=sensory, resourceType=equipment）
 */
export const SENSORY_EQUIPMENT_CATEGORIES = [
  'tactile',
  'olfactory',
  'gustatory',
  'visual',
  'auditory',
  'proprioceptive',
  'integration',
] as const

export const UNIFIED_DOMAIN_DEFINITIONS: Record<UnifiedDomain, UnifiedDomainDefinition> = {
  cognitive: {
    domain: 'cognitive',
    label: '认知',
    entitlement: 'cognitive',
    equipmentSupported: true,
    equipmentQuery: { moduleCode: ModuleCode.COGNITIVE, categories: ['cognitive'] },
  },
  language: {
    // 无独立 entitlement 包 → 归 cognitive（共享认知器材与授权）
    domain: 'language',
    label: '语言',
    entitlement: 'cognitive',
    equipmentSupported: true,
    equipmentQuery: { moduleCode: ModuleCode.COGNITIVE, categories: ['cognitive'] },
  },
  gross_motor: {
    // 无器材包 → 标记 equipmentSupported=false，面板提示，不阻塞链路
    domain: 'gross_motor',
    label: '大运动',
    entitlement: null,
    equipmentSupported: false,
    equipmentQuery: null,
  },
  fine_motor: {
    domain: 'fine_motor',
    label: '精细动作',
    entitlement: 'fine_motor',
    equipmentSupported: true,
    equipmentQuery: { moduleCode: ModuleCode.SENSORY, categories: ['fine-motor'] },
  },
  social: {
    domain: 'social',
    label: '社交',
    entitlement: 'social_communication',
    equipmentSupported: true,
    equipmentQuery: { moduleCode: ModuleCode.SOCIAL, categories: ['social-communication'] },
  },
  emotional: {
    domain: 'emotional',
    label: '情绪行为',
    entitlement: 'emotional',
    equipmentSupported: true,
    equipmentQuery: { moduleCode: ModuleCode.EMOTIONAL, categories: ['emotional-regulation'] },
  },
  sensory_integration: {
    domain: 'sensory_integration',
    label: '感觉统合',
    entitlement: 'sensory_integration',
    equipmentSupported: true,
    equipmentQuery: {
      moduleCode: ModuleCode.SENSORY,
      categories: [...SENSORY_EQUIPMENT_CATEGORIES],
    },
  },
  life_skills: {
    domain: 'life_skills',
    label: '生活自理',
    entitlement: 'life_skills',
    equipmentSupported: true,
    equipmentQuery: { moduleCode: ModuleCode.LIFE_SKILLS, categories: ['daily-living'] },
  },
  soothing: {
    domain: 'soothing',
    label: '安抚调节',
    entitlement: 'soothing_aids',
    equipmentSupported: true,
    equipmentQuery: { moduleCode: ModuleCode.EMOTIONAL, categories: ['soothing-aids'] },
  },
}

export function getUnifiedDomainDefinition(domain: UnifiedDomain): UnifiedDomainDefinition {
  return UNIFIED_DOMAIN_DEFINITIONS[domain]
}

export function isUnifiedDomain(value: unknown): value is UnifiedDomain {
  return typeof value === 'string' && (UNIFIED_DOMAINS as readonly string[]).includes(value)
}

/** 取所有"有配套器材"的领域 */
export function getEquipmentSupportedDomains(): UnifiedDomain[] {
  return UNIFIED_DOMAINS.filter((d) => UNIFIED_DOMAIN_DEFINITIONS[d].equipmentSupported)
}

/** 单个器材查询组（按 moduleCode+category 去重；同一 category 可被多域共享，如 cognitive×language） */
export interface EquipmentFetchGroup {
  moduleCode: ModuleCode
  category: string
  /** 共享该 category 的统一领域（候选器材需在每个领域下各挂一份） */
  domains: UnifiedDomain[]
}

/**
 * 汇总给定领域的器材查询组（按 moduleCode+category 去重）。
 * 同一 category 若被多个领域共享（cognitive 与 language 都查 cognitive 类目），
 * 只取一次，但 domains 列出所有共享领域，避免重复查询又能正确服务每个弱势领域。
 */
export function collectEquipmentFetchGroups(
  domains: readonly UnifiedDomain[],
): EquipmentFetchGroup[] {
  const keyToGroup = new Map<string, EquipmentFetchGroup>()
  for (const domain of domains) {
    const definition = UNIFIED_DOMAIN_DEFINITIONS[domain]
    if (!definition.equipmentQuery) {
      continue
    }
    for (const category of definition.equipmentQuery.categories) {
      const key = `${definition.equipmentQuery.moduleCode}::${category}`
      let group = keyToGroup.get(key)
      if (!group) {
        group = {
          moduleCode: definition.equipmentQuery.moduleCode,
          category,
          domains: [],
        }
        keyToGroup.set(key, group)
      }
      if (!group.domains.includes(domain)) {
        group.domains.push(domain)
      }
    }
  }
  return Array.from(keyToGroup.values())
}
