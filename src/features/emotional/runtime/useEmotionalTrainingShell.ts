import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import type { EmotionalCompileContext, EmotionalCompiledSessionConfig, EmotionalEngineNavigationHandlers } from '@/features/emotional/engine/types'
import type { PersistEmotionalSessionResult } from '@/types/emotional'

type EmotionalResourceType = 'emotion_scene' | 'care_scene'

type DbLike = {
  get: (sql: string, params?: any[]) => any
}

type EmotionalInteractionEngineHandle = {
  cancelIfNeeded: () => Promise<void>
  handleExit: () => Promise<void>
}

type TrainingResourceRow = {
  id: number
  name: string
  description?: string
  cover_image?: string
  meta_data?: string | null
}

export interface EmotionalTrainingShellResource<
  TMeta extends Record<string, any>,
  TResourceType extends EmotionalResourceType,
> {
  id: number
  name: string
  description?: string
  coverImage?: string
  resourceType: TResourceType
  metadata: TMeta
}

interface EmotionalTrainingShellOptions<
  TMeta extends Record<string, any>,
  TResourceType extends EmotionalResourceType,
> {
  resourceType: TResourceType
  selectorPath: string
  introActionLabel: string
  normalizeResource: (metadata: unknown, resourceName: string) => TMeta
  compileSession: (meta: TMeta, context: EmotionalCompileContext) => EmotionalCompiledSessionConfig
}

const RESOURCE_MESSAGES: Record<EmotionalResourceType, { missingSelected: string; missingAvailable: string }> = {
  emotion_scene: {
    missingSelected: '指定的情绪场景不存在或已停用，请返回场景选择页重新选择。',
    missingAvailable: '当前没有可用的情绪场景资源，请先在资源中心录入 MVP 场景。',
  },
  care_scene: {
    missingSelected: '指定的表达关心资源不存在或已停用，请返回情境选择页重新选择。',
    missingAvailable: '当前没有可用的表达关心资源，请先在资源中心录入 MVP 场景。',
  },
}

function getActiveDb(): DbLike {
  const db = (window as Window & { db?: DbLike }).db
  if (!db) {
    throw new Error('Database is not initialized on window.db')
  }
  return db
}

function getSingleQueryString(value: unknown) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

function getSingleQueryNumber(value: unknown) {
  const numeric = Number(getSingleQueryString(value) || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

export function useEmotionalTrainingShell<
  TMeta extends Record<string, any>,
  TResourceType extends EmotionalResourceType,
>(options: EmotionalTrainingShellOptions<TMeta, TResourceType>) {
  const route = useRoute()
  const router = useRouter()

  const engineRef = ref<EmotionalInteractionEngineHandle | null>(null)
  const resource = ref<EmotionalTrainingShellResource<TMeta, TResourceType> | null>(null)
  const sessionConfig = ref<EmotionalCompiledSessionConfig | null>(null)
  const loadError = ref('')

  const inheritedQuery = computed(() => ({ ...route.query }))
  const studentId = computed(() => getSingleQueryNumber(route.query.studentId))
  const studentName = computed(() => getSingleQueryString(route.query.studentName))
  const launchSource = computed(() => getSingleQueryString(route.query.from))
  const studentLabel = computed(() => studentName.value || `学生 #${studentId.value}`)

  const engineNavigation: EmotionalEngineNavigationHandlers = {
    async completeSessionSummary(persisted: PersistEmotionalSessionResult) {
      await router.replace({
        path: '/emotional/session-summary',
        query: {
          ...inheritedQuery.value,
          resourceId: String(resource.value?.id || ''),
          trainingRecordId: String(persisted.trainingRecordId),
          sessionId: String(persisted.sessionId),
        },
      })
    },
    async exitTraining() {
      if (launchSource.value === 'dashboard') {
        await router.push('/dashboard')
        return
      }

      if (launchSource.value === 'plan') {
        await router.push('/training-plan')
        return
      }

      await router.push({
        path: options.selectorPath,
        query: inheritedQuery.value,
      })
    },
  }

  function mapResourceRow(row: TrainingResourceRow) {
    const parsedMetadata = row.meta_data ? JSON.parse(row.meta_data) : {}

    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      coverImage: row.cover_image || undefined,
      resourceType: options.resourceType,
      metadata: options.normalizeResource(parsedMetadata, row.name),
    } satisfies EmotionalTrainingShellResource<TMeta, TResourceType>
  }

  async function loadResource() {
    loadError.value = ''
    resource.value = null
    sessionConfig.value = null

    if (!studentId.value) {
      loadError.value = '缺少学生 ID，无法开始训练。'
      return
    }

    try {
      const db = getActiveDb()
      const resourceId = getSingleQueryNumber(route.query.resourceId)
      const baseSql = `
        SELECT id, name, description, cover_image, meta_data
        FROM sys_training_resource
        WHERE module_code = 'emotional'
          AND resource_type = ?
          AND is_active = 1
      `

      let resolvedRow = resourceId > 0
        ? db.get(`${baseSql} AND id = ? LIMIT 1`, [options.resourceType, resourceId])
        : null

      if (resourceId > 0 && !resolvedRow) {
        loadError.value = RESOURCE_MESSAGES[options.resourceType].missingSelected
        return
      }

      if (!resolvedRow) {
        resolvedRow = db.get(`${baseSql} ORDER BY id ASC LIMIT 1`, [options.resourceType])
      }

      if (!resolvedRow) {
        loadError.value = RESOURCE_MESSAGES[options.resourceType].missingAvailable
        return
      }

      const mappedResource = mapResourceRow(resolvedRow as TrainingResourceRow)
      resource.value = mappedResource
      sessionConfig.value = options.compileSession(mappedResource.metadata, {
        studentId: studentId.value,
        resourceId: mappedResource.id,
        resourceName: mappedResource.name,
        resourceDescription: mappedResource.description,
        coverImage: mappedResource.coverImage,
      })
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '训练资源加载失败。'
    }
  }

  async function cancelIfNeeded() {
    await engineRef.value?.cancelIfNeeded()
  }

  async function handleExit() {
    await engineRef.value?.handleExit()
  }

  onBeforeRouteLeave(async () => {
    await cancelIfNeeded()
    return true
  })

  onMounted(() => {
    void loadResource()
  })

  return {
    selectorPath: options.selectorPath,
    introActionLabel: options.introActionLabel,
    engineRef,
    resource,
    sessionConfig,
    loadError,
    studentLabel,
    inheritedQuery,
    engineNavigation,
    handleExit,
    cancelIfNeeded,
  }
}
