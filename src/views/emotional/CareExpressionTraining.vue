<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/care-expression/select', query: inheritedQuery }">选择情境</el-breadcrumb-item>
        <el-breadcrumb-item>表达关心训练</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>表达关心训练</h1>
        <p class="subtitle">围绕“我怎么说”和“别人听起来怎么样”，练习共情、建议和行动支持。</p>
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
        intro-action-label="开始选择关心表达"
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
import { compileCareScene } from '@/features/emotional/adapters'
import type { EmotionalCompiledSessionConfig } from '@/features/emotional/engine/types'
import type { CareSceneResourceMeta, PersistEmotionalSessionResult } from '@/types/emotional'
import { normalizeCareSceneEditorModel } from '@/views/resource-center/editors/emotional-resource-contract'

interface CareSceneResourceRecord {
  id: number
  name: string
  description?: string
  coverImage?: string
  resourceType: 'care_scene'
  metadata: CareSceneResourceMeta & Record<string, any>
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
const resource = ref<CareSceneResourceRecord | null>(null)
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

const careMeta = computed(() => (resource.value?.metadata || {}) as CareSceneResourceMeta & Record<string, any>)

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
      path: '/emotional/care-expression/select',
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

function mapResourceRow(row: any): CareSceneResourceRecord {
  let metadata = {} as CareSceneResourceMeta & Record<string, any>
  if (row.meta_data) {
    metadata = normalizeCareSceneEditorModel(JSON.parse(row.meta_data), row.name)
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    coverImage: row.cover_image || undefined,
    resourceType: 'care_scene',
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
      AND resource_type = 'care_scene'
      AND is_active = 1
  `

  let resolvedRow = resourceId > 0 ? db.get(`${sql} AND id = ? LIMIT 1`, [resourceId]) : null
  if (resourceId > 0 && !resolvedRow) {
    loadError.value = '指定的表达关心资源不存在或已停用，请返回情境选择页重新选择。'
    return
  }

  if (!resolvedRow && typeof db.all === 'function') {
    const rows = db.all(`${sql} ORDER BY id ASC LIMIT 1`)
    resolvedRow = rows?.[0] || null
  }

  if (!resolvedRow) {
    loadError.value = '当前没有可用的表达关心资源，请先在资源中心录入 MVP 场景。'
    return
  }

  resource.value = mapResourceRow(resolvedRow)
  sessionConfig.value = compileCareScene(careMeta.value, {
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
