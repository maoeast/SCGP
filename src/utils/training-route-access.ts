const GAME_ENTRY_MODULE_MAP = Object.freeze({
  sensory: 'sensory',
  'sensory-training': 'sensory',
  'sensory-integration': 'sensory',
  emotional: 'emotional',
  'emotional-regulation': 'emotional',
  social: 'social',
  'social-communication': 'social',
  'fine-motor': 'sensory',
  'soothing-aids': 'emotional',
  life_skills: 'life_skills',
  'life-skills': 'life_skills',
} satisfies Record<string, string>)

const EQUIPMENT_ROUTE_MODULE_MAP = Object.freeze({
  'sensory-training': 'sensory',
  'sensory-integration': 'sensory',
  'emotional-regulation': 'emotional',
  'social-communication': 'social',
  'fine-motor': 'sensory',
  'soothing-aids': 'emotional',
  'life-skills': 'life_skills',
} satisfies Record<string, string>)

const UNIQUE_EQUIPMENT_MODULE_MAP = Object.freeze({
  social: 'social',
  life_skills: 'life_skills',
} satisfies Record<string, string>)

interface ResolveRouteModuleCodeOptions {
  path: string
  metaModuleCode?: unknown
  queryEntry?: unknown
  queryModule?: unknown
  paramsEntryCode?: unknown
  paramsModuleCode?: unknown
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function hasExplicitTrainingContext(entryValue: unknown, moduleValue: unknown): boolean {
  return normalizeString(entryValue).length > 0 || normalizeString(moduleValue).length > 0
}

function resolveGameRouteModuleCode(entryValue: unknown, moduleValue: unknown): string {
  const normalizedEntry = normalizeString(entryValue)
  if (normalizedEntry && normalizedEntry in GAME_ENTRY_MODULE_MAP) {
    return GAME_ENTRY_MODULE_MAP[normalizedEntry as keyof typeof GAME_ENTRY_MODULE_MAP]
  }

  const normalizedModule = normalizeString(moduleValue)
  if (normalizedModule && normalizedModule in GAME_ENTRY_MODULE_MAP) {
    return GAME_ENTRY_MODULE_MAP[normalizedModule as keyof typeof GAME_ENTRY_MODULE_MAP]
  }

  return ''
}

function resolveEquipmentRouteModuleCode(entryValue: unknown, moduleValue: unknown): string {
  const normalizedEntry = normalizeString(entryValue)
  if (normalizedEntry && normalizedEntry in EQUIPMENT_ROUTE_MODULE_MAP) {
    return EQUIPMENT_ROUTE_MODULE_MAP[normalizedEntry as keyof typeof EQUIPMENT_ROUTE_MODULE_MAP]
  }

  const normalizedModule = normalizeString(moduleValue)
  if (normalizedModule && normalizedModule in UNIQUE_EQUIPMENT_MODULE_MAP) {
    return UNIQUE_EQUIPMENT_MODULE_MAP[normalizedModule as keyof typeof UNIQUE_EQUIPMENT_MODULE_MAP]
  }

  switch (normalizedModule) {
    case 'sensory':
    case 'emotional':
    case 'social':
    case 'life_skills':
    case 'cognitive':
    case 'resource':
      return normalizedModule
    default:
      return ''
  }
}

export function resolveRouteModuleCode(options: ResolveRouteModuleCodeOptions): string {
  const fromMeta = normalizeString(options.metaModuleCode)
  if (fromMeta) {
    return fromMeta
  }

  if (options.path.startsWith('/emotional')) {
    return 'emotional'
  }

  if (options.path.startsWith('/equipment')) {
    return resolveEquipmentRouteModuleCode(options.queryEntry, options.queryModule)
  }

  if (options.path.startsWith('/games')) {
    if (!hasExplicitTrainingContext(options.queryEntry, options.queryModule)) {
      return ''
    }

    return resolveGameRouteModuleCode(options.queryEntry, options.queryModule)
  }

  if (options.path.startsWith('/training-records')) {
    const routeEntryCode = normalizeString(options.paramsEntryCode) || normalizeString(options.paramsModuleCode)
    return routeEntryCode ? resolveGameRouteModuleCode(routeEntryCode, undefined) : ''
  }

  return ''
}
