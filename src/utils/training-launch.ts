import { ResourceAPI } from '@/database/resource-api'
import { ModuleCode, type ResourceItem } from '@/types/module'
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

function resolveLaunchResource(
  context: TrainingLaunchContext,
  launchModuleCode: string
): ResourceItem | null {
  const resourceApi = new ResourceAPI()
  return resourceApi.getResourceById(context.resourceId, launchModuleCode as ModuleCode)
}

function resolveEquipmentEntryQuery(
  context: TrainingLaunchContext,
  launchModuleCode: string
): string | undefined {
  try {
    const resource = resolveLaunchResource(context, launchModuleCode)
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
    const resource = resolveLaunchResource(context, launchModuleCode)
    if (!resource) {
      return undefined
    }

    return resolveTrainingEntryCodeFromResource(resource)
  } catch (error) {
    console.warn('[buildTrainingLaunchRoute] 解析训练入口失败:', error)
    return undefined
  }
}

function resolveEmotionalSceneCodeQuery(
  context: TrainingLaunchContext,
  launchModuleCode: string
): string | undefined {
  try {
    const resource = resolveLaunchResource(context, launchModuleCode)
    if (!resource) {
      return undefined
    }

    const metadata = resource.metadata as {
      sceneCode?: unknown
      scene_code?: unknown
      sceneId?: unknown
      scene_id?: unknown
    } | undefined

    const candidates = [
      metadata?.sceneCode,
      metadata?.scene_code,
      metadata?.sceneId,
      metadata?.scene_id,
    ]

    const sceneCode = candidates.find((value): value is string => (
      typeof value === 'string' && value.trim().length > 0
    ))

    return sceneCode?.trim()
  } catch (error) {
    console.warn('[buildTrainingLaunchRoute] 解析情绪场景编码失败:', error)
    return undefined
  }
}

function resolveGameLaunchRoute(
  context: TrainingLaunchContext,
  launchModuleCode: string,
  baseEntries: Array<[string, string | undefined]>
): TrainingLaunchRoute {
  const baseQueryEntries: Array<[string, string | undefined]> = [
    ...baseEntries,
    ['entry', resolveTrainingEntryQuery(context, launchModuleCode)],
    ['module', launchModuleCode],
    ['studentId', String(context.studentId)],
    ['studentName', stringifyQueryValue(context.studentName)],
    ['resourceId', String(context.resourceId)],
  ]

  try {
    const resource = resolveLaunchResource(context, launchModuleCode)
    const metadata = resource?.metadata as {
      entryPath?: unknown
      taskId?: unknown
      mode?: unknown
      difficultyLocked?: unknown
    } | undefined

    const resourceEntryCode = resource
      ? resolveTrainingEntryCodeFromResource(resource)
      : undefined
    const resourceModuleCode = resource?.moduleCode || launchModuleCode
    const entryPath = typeof metadata?.entryPath === 'string' && metadata.entryPath.trim().startsWith('/')
      ? metadata.entryPath.trim()
      : ''
    const mode = typeof metadata?.mode === 'string' && metadata.mode.trim()
      ? metadata.mode.trim()
      : undefined
    const taskId = typeof metadata?.taskId === 'number'
      ? metadata.taskId
      : resource?.legacyId
    const difficultyLocked = typeof metadata?.difficultyLocked === 'boolean'
      ? String(metadata.difficultyLocked)
      : undefined

    if (entryPath) {
      return {
        path: entryPath,
        query: buildQuery([
          ...baseEntries,
          ['entry', stringifyQueryValue(resourceEntryCode)],
          ['module', resourceModuleCode],
          ['studentId', String(context.studentId)],
          ['studentName', stringifyQueryValue(context.studentName)],
          ['resourceId', String(context.resourceId)],
          ['difficulty', '1'],
          ['difficultyLocked', difficultyLocked],
        ]),
      }
    }

    return {
      path: '/games/play',
      query: buildQuery([
        ...baseQueryEntries,
        ['taskId', stringifyQueryValue(taskId)],
        ['mode', mode],
      ]),
    }
  } catch (error) {
    console.warn('[buildTrainingLaunchRoute] 解析游戏训练入口失败:', error)
    return {
      path: '/games/play',
      query: buildQuery(baseQueryEntries),
    }
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
      return resolveGameLaunchRoute(context, launchModuleCode, baseEntries)

    case 'flashcard':
      return {
        path: '/games/play',
        query: buildQuery([
          ...baseEntries,
          ['entry', resolveTrainingEntryQuery(context, launchModuleCode)],
          ['module', launchModuleCode],
          ['studentId', String(context.studentId)],
          ['studentName', stringifyQueryValue(context.studentName)],
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
          ['sceneCode', resolveEmotionalSceneCodeQuery(context, launchModuleCode)],
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
          ['sceneCode', resolveEmotionalSceneCodeQuery(context, launchModuleCode)],
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
