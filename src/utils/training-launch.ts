import { ResourceAPI } from '@/database/resource-api'
import { ModuleCode } from '@/types/module'
import { resolveEquipmentTrainingEntryCodeFromResource } from '@/utils/equipment-training-entry'
import { resolveTrainingEntryCodeFromResource } from '@/utils/training-entry'

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

function resolveEquipmentEntryQuery(
  context: TrainingLaunchContext,
  launchModuleCode: string
): string | undefined {
  try {
    const resourceApi = new ResourceAPI()
    const resource = resourceApi.getResourceById(context.resourceId, launchModuleCode as ModuleCode)
    if (!resource) {
      return undefined
    }

    return resolveEquipmentTrainingEntryCodeFromResource(resource)
  } catch (error) {
    console.warn('[buildTrainingLaunchRoute] 解析器材训练入口失败:', error)
    return undefined
  }
}

function resolveTrainingEntryQuery(
  context: TrainingLaunchContext,
  launchModuleCode: string
): string | undefined {
  try {
    const resourceApi = new ResourceAPI()
    const resource = resourceApi.getResourceById(context.resourceId, launchModuleCode as ModuleCode)
    if (!resource) {
      return undefined
    }

    return resolveTrainingEntryCodeFromResource(resource)
  } catch (error) {
    console.warn('[buildTrainingLaunchRoute] 解析训练入口失败:', error)
    return undefined
  }
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
          ['entry', resolveEquipmentEntryQuery(context, launchModuleCode)],
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
          ['entry', resolveTrainingEntryQuery(context, launchModuleCode)],
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
