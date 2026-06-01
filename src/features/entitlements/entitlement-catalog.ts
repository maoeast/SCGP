export const ENTITLEMENT_CODES = Object.freeze([
  'sensory_integration',
  'emotional',
  'social_communication',
  'fine_motor',
  'soothing_aids',
  'life_skills',
  'cognitive',
] as const)

export type EntitlementCode = typeof ENTITLEMENT_CODES[number]

export type EntitlementStatus = 'active' | 'placeholder'
export type EntitlementUiStrategy = 'hide' | 'lock'

export interface EntitlementDefinition {
  code: EntitlementCode
  name: string
  status: EntitlementStatus
  uiStrategy: EntitlementUiStrategy
  description: string
}

type LegacyModuleCode = 'sensory' | 'emotional' | 'social' | 'life_skills' | 'cognitive'
type EntitlementOrigin =
  | 'direct_license_entitlement'
  | 'legacy_sensory_mapping'
  | 'legacy_emotional_mapping'
  | 'legacy_social_mapping'
  | 'legacy_life_skills_mapping'
  | 'legacy_cognitive_mapping'

export interface EffectiveEntitlementResolution {
  effectiveEntitlements: EntitlementCode[]
  entitlementDebugOrigins: Partial<Record<EntitlementCode, EntitlementOrigin[]>>
  unknownCodes: string[]
}

function createEntitlementDefinition(definition: EntitlementDefinition): Readonly<EntitlementDefinition> {
  return Object.freeze({ ...definition })
}

export const ENTITLEMENT_DEFINITIONS = Object.freeze({
  sensory_integration: createEntitlementDefinition({
    code: 'sensory_integration',
    name: '感统训练',
    status: 'active',
    uiStrategy: 'hide',
    description: '对应感官统合训练主链授权能力包。',
  }),
  emotional: createEntitlementDefinition({
    code: 'emotional',
    name: '情绪发展',
    status: 'active',
    uiStrategy: 'hide',
    description: '对应情绪行为与情绪调节主链授权能力包。',
  }),
  social_communication: createEntitlementDefinition({
    code: 'social_communication',
    name: '社交沟通',
    status: 'active',
    uiStrategy: 'hide',
    description: '对应社交沟通主链授权能力包。',
  }),
  fine_motor: createEntitlementDefinition({
    code: 'fine_motor',
    name: '精细动作',
    status: 'active',
    uiStrategy: 'hide',
    description: '对应精细动作独立授权能力包，数据归属仍保持 sensory。',
  }),
  soothing_aids: createEntitlementDefinition({
    code: 'soothing_aids',
    name: '安抚系统',
    status: 'active',
    uiStrategy: 'hide',
    description: '对应安抚教具与情绪安抚独立授权能力包，数据归属仍保持 emotional。',
  }),
  life_skills: createEntitlementDefinition({
    code: 'life_skills',
    name: '生活自理',
    status: 'active',
    uiStrategy: 'hide',
    description: '对应生活自理训练主链授权能力包。',
  }),
  cognitive: createEntitlementDefinition({
    code: 'cognitive',
    name: '认知发展',
    status: 'placeholder',
    uiStrategy: 'lock',
    description: '预留授权能力包占位，不代表认知发展模块已完整交付。',
  }),
} satisfies Record<EntitlementCode, Readonly<EntitlementDefinition>>)

export const LEGACY_MODULE_ENTITLEMENT_MAP = Object.freeze({
  sensory: Object.freeze(['sensory_integration', 'fine_motor'] as const),
  emotional: Object.freeze(['emotional', 'soothing_aids'] as const),
  social: Object.freeze(['social_communication'] as const),
  life_skills: Object.freeze(['life_skills'] as const),
  cognitive: Object.freeze(['cognitive'] as const),
} satisfies Record<LegacyModuleCode, readonly EntitlementCode[]>)

const LEGACY_MODULE_ORIGINS = Object.freeze({
  sensory: 'legacy_sensory_mapping',
  emotional: 'legacy_emotional_mapping',
  social: 'legacy_social_mapping',
  life_skills: 'legacy_life_skills_mapping',
  cognitive: 'legacy_cognitive_mapping',
} satisfies Record<LegacyModuleCode, EntitlementOrigin>)

export function isEntitlementCode(value: unknown): value is EntitlementCode {
  return typeof value === 'string'
    && (ENTITLEMENT_CODES as readonly string[]).includes(value)
}

export function isLegacyEntitlementModuleCode(value: unknown): value is LegacyModuleCode {
  return typeof value === 'string'
    && value in LEGACY_MODULE_ENTITLEMENT_MAP
}

export function getEntitlementDefinition(code: EntitlementCode): Readonly<EntitlementDefinition> {
  return ENTITLEMENT_DEFINITIONS[code]
}

export function resolveLegacyModuleEntitlements(moduleCode: string): readonly EntitlementCode[] {
  if (!isLegacyEntitlementModuleCode(moduleCode)) {
    return Object.freeze([] as EntitlementCode[])
  }

  return LEGACY_MODULE_ENTITLEMENT_MAP[moduleCode]
}

export function canAccessModuleByEntitlements(
  moduleCode: string,
  effectiveEntitlements: readonly EntitlementCode[] | null | undefined
): boolean {
  if (!isLegacyEntitlementModuleCode(moduleCode)) {
    return true
  }

  const allowedEntitlementSet = new Set<EntitlementCode>(effectiveEntitlements || [])
  return LEGACY_MODULE_ENTITLEMENT_MAP[moduleCode].some((entitlementCode) =>
    allowedEntitlementSet.has(entitlementCode)
  )
}

export function resolveEffectiveEntitlementDetails(
  rawCodes: readonly string[] | null | undefined
): EffectiveEntitlementResolution {
  const effectiveCodeSet = new Set<EntitlementCode>()
  const originSets = new Map<EntitlementCode, Set<EntitlementOrigin>>()
  const unknownCodes: string[] = []

  const addCode = (code: EntitlementCode, origin: EntitlementOrigin) => {
    effectiveCodeSet.add(code)

    if (!originSets.has(code)) {
      originSets.set(code, new Set())
    }

    originSets.get(code)!.add(origin)
  }

  for (const rawCode of rawCodes || []) {
    if (typeof rawCode !== 'string') {
      continue
    }

    const normalizedCode = rawCode.trim()
    if (!normalizedCode) {
      continue
    }

    if (isLegacyEntitlementModuleCode(normalizedCode)) {
      const mappedOrigin = LEGACY_MODULE_ORIGINS[normalizedCode]
      for (const entitlementCode of LEGACY_MODULE_ENTITLEMENT_MAP[normalizedCode]) {
        addCode(entitlementCode, mappedOrigin)
      }
      continue
    }

    if (isEntitlementCode(normalizedCode)) {
      addCode(normalizedCode, 'direct_license_entitlement')
      continue
    }

    unknownCodes.push(normalizedCode)
  }

  const effectiveEntitlements = ENTITLEMENT_CODES.filter((code) => effectiveCodeSet.has(code))
  const entitlementDebugOrigins = ENTITLEMENT_CODES.reduce<Partial<Record<EntitlementCode, EntitlementOrigin[]>>>(
    (accumulator, code) => {
      const origins = originSets.get(code)
      if (origins && origins.size > 0) {
        accumulator[code] = Array.from(origins)
      }
      return accumulator
    },
    {}
  )

  return {
    effectiveEntitlements,
    entitlementDebugOrigins,
    unknownCodes,
  }
}

export function resolveEffectiveEntitlements(rawCodes: readonly string[] | null | undefined): EntitlementCode[] {
  return resolveEffectiveEntitlementDetails(rawCodes).effectiveEntitlements
}
