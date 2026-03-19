export type TrainingLaunchSource = 'plan' | 'dashboard'

export interface TrainingLaunchContext {
  studentId: number
  studentName?: string
  planId?: number
  source?: TrainingLaunchSource
  moduleCode?: string
  resourceId: number
  resourceType: string
  resourceName?: string
  resourceModuleCode?: string
}

export interface TrainingLaunchRoute {
  path: string
  query?: Record<string, string>
}

export interface TrainingLaunchResolution {
  route: TrainingLaunchRoute | null
  requiredModuleCode: string
  authorized: boolean
}

function stringifyQueryValue(value: string | number | undefined | null): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return String(value)
}

function buildQuery(entries: Array<[string, string | undefined]>): Record<string, string> {
  const query: Record<string, string> = {}

  for (const [key, value] of entries) {
    if (value !== undefined) {
      query[key] = value
    }
  }

  return query
}

export function getTrainingLaunchModuleCode(context: TrainingLaunchContext): string {
  return context.resourceModuleCode || context.moduleCode || 'sensory'
}

export function buildTrainingLaunchRoute(context: TrainingLaunchContext): TrainingLaunchRoute | null {
  const launchModuleCode = getTrainingLaunchModuleCode(context)
  const baseEntries: Array<[string, string | undefined]> = [
    ['planId', stringifyQueryValue(context.planId)],
    ['from', stringifyQueryValue(context.source)],
  ]

  switch (context.resourceType) {
    case 'equipment':
      return {
        path: `/equipment/quick-entry/${context.studentId}`,
        query: buildQuery([
          ...baseEntries,
          ['module', launchModuleCode],
          ['equipmentId', String(context.resourceId)],
          ['resourceName', stringifyQueryValue(context.resourceName)],
        ]),
      }

    case 'game':
    case 'flashcard':
      return {
        path: '/games/play',
        query: buildQuery([
          ...baseEntries,
          ['module', launchModuleCode],
          ['studentId', String(context.studentId)],
          ['resourceId', String(context.resourceId)],
        ]),
      }

    case 'emotion_scene':
      return {
        path: '/emotional/emotion-scene',
        query: buildQuery([
          ...baseEntries,
          ['studentId', String(context.studentId)],
          ['studentName', stringifyQueryValue(context.studentName)],
          ['resourceId', String(context.resourceId)],
        ]),
      }

    case 'care_scene':
      return {
        path: '/emotional/care-expression',
        query: buildQuery([
          ...baseEntries,
          ['studentId', String(context.studentId)],
          ['studentName', stringifyQueryValue(context.studentName)],
          ['resourceId', String(context.resourceId)],
        ]),
      }

    default:
      return null
  }
}

export function resolveTrainingLaunch(
  context: TrainingLaunchContext,
  hasModuleAccess?: (moduleCode: string) => boolean
): TrainingLaunchResolution {
  const requiredModuleCode = getTrainingLaunchModuleCode(context)
  const authorized = hasModuleAccess ? hasModuleAccess(requiredModuleCode) : true

  if (!authorized) {
    return {
      route: null,
      requiredModuleCode,
      authorized: false,
    }
  }

  return {
    route: buildTrainingLaunchRoute(context),
    requiredModuleCode,
    authorized: true,
  }
}
