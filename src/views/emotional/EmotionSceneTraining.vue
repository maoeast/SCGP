<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/emotion-scene/select', query: inheritedQuery }">选择场景</el-breadcrumb-item>
        <el-breadcrumb-item>情绪与场景训练</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>情绪与场景训练</h1>
        <p class="subtitle">单屏单任务，引导学生完成场景理解、情绪识别、原因推理和回应选择。</p>
      </div>
      <div class="header-right">
        <el-button plain @click="handleExit">结束训练</el-button>
      </div>
    </div>

    <div class="main-content">
      <el-alert
        v-if="loadError"
        type="warning"
        :closable="false"
        show-icon
        title="暂时无法加载训练资源"
        :description="loadError"
      />

      <EmotionalInteractionEngine
        v-else-if="resource && sessionConfig"
        ref="engineRef"
        :session-config="sessionConfig"
        :student-label="studentLabel"
        :resource-label="resource.name"
        intro-action-label="开始识别情绪"
        :navigation="engineNavigation"
      />

      <el-skeleton v-else animated :rows="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import EmotionalInteractionEngine from '@/components/emotional/engine/EmotionalInteractionEngine.vue'
import { compileEmotionScene } from '@/features/emotional/adapters'
import type { EmotionalCompiledSessionConfig } from '@/features/emotional/engine/types'
import type { EmotionSceneResourceMeta, PersistEmotionalSessionResult } from '@/types/emotional'

interface EmotionSceneResourceRecord {
  id: number
  name: string
  description?: string
  coverImage?: string
  resourceType: 'emotion_scene'
  metadata: EmotionSceneResourceMeta & Record<string, any>
}

type DbLike = {
  get: (sql: string, params?: any[]) => any
  all?: (sql: string, params?: any[]) => any[]
}

type EmotionalInteractionEngineHandle = {
  cancelIfNeeded: () => Promise<void>
  handleExit: () => Promise<void>
}

const route = useRoute()
const router = useRouter()

const engineRef = ref<EmotionalInteractionEngineHandle | null>(null)
const resource = ref<EmotionSceneResourceRecord | null>(null)
const sessionConfig = ref<EmotionalCompiledSessionConfig | null>(null)
const loadError = ref('')

const inheritedQuery = computed(() => ({ ...route.query }))
const studentId = computed(() => Number(Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId || 0))
const launchSource = computed(() => {
  const value = route.query.from
  return Array.isArray(value) ? value[0] : value || ''
})
const studentName = computed(() => {
  const value = route.query.studentName
  return Array.isArray(value) ? value[0] : value || ''
})
const studentLabel = computed(() => studentName.value || `学生 #${studentId.value}`)

const sceneMeta = computed(() => (resource.value?.metadata || {}) as EmotionSceneResourceMeta & Record<string, any>)

const engineNavigation = {
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
      path: '/emotional/emotion-scene/select',
      query: inheritedQuery.value,
    })
  },
}

function getActiveDb(): DbLike {
  const db = (window as Window & { db?: DbLike }).db
  if (!db) {
    throw new Error('Database is not initialized on window.db')
  }
  return db
}

function mapResourceRow(row: any): EmotionSceneResourceRecord {
  let metadata = {} as EmotionSceneResourceMeta & Record<string, any>
  if (row.meta_data) {
    metadata = JSON.parse(row.meta_data)
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    coverImage: row.cover_image || undefined,
    resourceType: 'emotion_scene',
    metadata,
  }
}

async function loadResource() {
  if (!studentId.value) {
    loadError.value = '缺少学生 ID，无法开始训练。'
    return
  }

  const db = getActiveDb()
  const resourceId = Number(Array.isArray(route.query.resourceId) ? route.query.resourceId[0] : route.query.resourceId || 0)
  const sql = `
    SELECT id, name, description, cover_image, meta_data
    FROM sys_training_resource
    WHERE module_code = 'emotional'
      AND resource_type = 'emotion_scene'
      AND is_active = 1
  `
  let resolvedRow = resourceId > 0
    ? db.get(`${sql} AND id = ? LIMIT 1`, [resourceId])
    : null

  if (resourceId > 0 && !resolvedRow) {
    loadError.value = '指定的情绪场景不存在或已停用，请返回场景选择页重新选择。'
    return
  }

  if (!resolvedRow && typeof db.all === 'function') {
    const rows = db.all(`${sql} ORDER BY id ASC LIMIT 1`)
    resolvedRow = rows?.[0] || null
  }

  if (!resolvedRow) {
    loadError.value = '当前没有可用的情绪场景资源，请先在资源中心录入 MVP 场景。'
    return
  }

  resource.value = mapResourceRow(resolvedRow)
  sessionConfig.value = compileEmotionScene(sceneMeta.value, {
    studentId: studentId.value,
    resourceId: resource.value.id,
    resourceName: resource.value.name,
    resourceDescription: resource.value.description,
    coverImage: resource.value.coverImage,
  })
}

async function handleExit() {
  await engineRef.value?.handleExit()
}

onBeforeRouteLeave(async () => {
  await engineRef.value?.cancelIfNeeded()
  return true
})

onMounted(() => {
  loadResource()
})
</script>

<style scoped>
.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.main-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
