import { getEquipmentImageUrl } from '@/assets/images/equipment/images'
import { getPhysicalEquipmentImageUrl } from '@/assets/images/physical-equipment/images'
import type { EquipmentCategory } from '@/types/equipment'
import type { ResourceItem } from '@/types/module'
import type { PhysicalEquipmentDomain, PhysicalEquipmentResourceMeta } from '@/types/physical-equipment'

interface ResourceCoverLike {
  resourceType?: string
  name?: string
  category?: string
  coverImage?: string | null
  legacyId?: number
  metadata?: unknown
}

interface ParsedPhysicalEquipmentMeta {
  domain: PhysicalEquipmentDomain
  resourceCode: string
}

function parsePhysicalEquipmentMeta(metadata: unknown): ParsedPhysicalEquipmentMeta | null {
  let normalized = metadata

  if (typeof normalized === 'string') {
    try {
      normalized = JSON.parse(normalized)
    } catch {
      return null
    }
  }

  if (!normalized || typeof normalized !== 'object') {
    return null
  }

  const candidate = normalized as Partial<PhysicalEquipmentResourceMeta>
  if (candidate.kind !== 'physical_equipment') {
    return null
  }

  const domain = typeof candidate.domain === 'string' ? candidate.domain as PhysicalEquipmentDomain : ''
  const resourceCode = typeof candidate.resourceCode === 'string' ? candidate.resourceCode.trim() : ''

  if (!domain || !resourceCode) {
    return null
  }

  return { domain, resourceCode }
}

export function resolveResourceCoverImage(resource: ResourceCoverLike | null | undefined): string {
  if (!resource) {
    return ''
  }

  if (resource.resourceType === 'equipment') {
    const physicalMeta = parsePhysicalEquipmentMeta(resource.metadata)
    if (physicalMeta) {
      return getPhysicalEquipmentImageUrl(physicalMeta.domain, physicalMeta.resourceCode, resource.name || '')
    }

    if (resource.legacyId) {
      return getEquipmentImageUrl((resource.category || 'tactile') as EquipmentCategory, resource.legacyId, resource.name || '')
    }
  }

  return resource.coverImage || ''
}

export function resolveResourceItemCoverImage(resource: ResourceItem | null | undefined): string {
  return resolveResourceCoverImage(resource || null)
}
