export const PHYSICAL_EQUIPMENT_DOMAINS = [
  'emotional-regulation',
  'social-communication',
  'fine-motor',
  'soothing-aids',
] as const

export type PhysicalEquipmentDomain = typeof PHYSICAL_EQUIPMENT_DOMAINS[number]

export type PhysicalEquipmentImportStatus = 'draft' | 'reviewed' | 'ready'

export interface PhysicalEquipmentResourceMeta {
  kind: 'physical_equipment'
  resourceCode: string
  domain: PhysicalEquipmentDomain
  sourceCategory: string
  sourceBox?: string
  sourceSequence?: number
  sourceVariant?: string
  sourceFile: string
  sourceRow: number
  imageFile?: string
  suggestedAssetPath?: string
  notes?: string
  status: PhysicalEquipmentImportStatus
}
