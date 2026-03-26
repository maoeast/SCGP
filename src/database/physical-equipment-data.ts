import emotionalRegulationRaw from '../../docs/references/physical-equipment/emotional-regulation/2026-03-26-emotional-regulation-equipment-draft.csv?raw'
import socialCommunicationRaw from '../../docs/references/physical-equipment/social-communication/2026-03-26-social-communication-equipment-draft.csv?raw'
import fineMotorRaw from '../../docs/references/physical-equipment/fine-motor/2026-03-26-fine-motor-equipment-draft.csv?raw'
import soothingAidsRaw from '../../docs/references/physical-equipment/soothing-aids/2026-03-26-soothing-aids-equipment-draft.csv?raw'
import {
  createPhysicalEquipmentSeedResources,
  PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE,
  type PhysicalEquipmentSeedInput,
  type PhysicalEquipmentSeedResource,
  type PhysicalEquipmentSeedSummary,
} from './physical-equipment-parser'

const sourceInputs: PhysicalEquipmentSeedInput[] = [
  {
    domain: 'emotional-regulation',
    sourcePath: 'docs/references/physical-equipment/emotional-regulation/2026-03-26-emotional-regulation-equipment-draft.csv',
    raw: emotionalRegulationRaw,
  },
  {
    domain: 'social-communication',
    sourcePath: 'docs/references/physical-equipment/social-communication/2026-03-26-social-communication-equipment-draft.csv',
    raw: socialCommunicationRaw,
  },
  {
    domain: 'fine-motor',
    sourcePath: 'docs/references/physical-equipment/fine-motor/2026-03-26-fine-motor-equipment-draft.csv',
    raw: fineMotorRaw,
  },
  {
    domain: 'soothing-aids',
    sourcePath: 'docs/references/physical-equipment/soothing-aids/2026-03-26-soothing-aids-equipment-draft.csv',
    raw: soothingAidsRaw,
  },
]

const parsed = createPhysicalEquipmentSeedResources(sourceInputs)

export { PHYSICAL_EQUIPMENT_SEED_LEGACY_SOURCE }

export const PHYSICAL_EQUIPMENT_SEED_RESOURCES: PhysicalEquipmentSeedResource[] = parsed.resources

export const PHYSICAL_EQUIPMENT_SEED_SUMMARY: PhysicalEquipmentSeedSummary = parsed.summary
