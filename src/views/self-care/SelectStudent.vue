<template>
  <StudentSelector
    :title="pageTitle"
    :back-route="backRoute"
    :module-tag="selfCareModuleTag"
    @select="handleSelectStudent"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import StudentSelector from '@/components/common/StudentSelector.vue'
import { SelfCareTaskAPI } from '@/database/self-care-task-api'
import {
  TASK_TRAINING_ENTRY_CODE,
  TASK_TRAINING_MODULE_CODE,
} from '@/features/self-care/task-training-contract'

interface Student {
  id: number
  name: string
}

const route = useRoute()
const router = useRouter()
const api = new SelfCareTaskAPI()

const taskId = computed(() => {
  const raw = Array.isArray(route.params.taskId) ? route.params.taskId[0] : route.params.taskId
  const parsed = Number.parseInt(String(raw || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const task = computed(() => {
  if (taskId.value === null) {
    return null
  }

  return api.getTaskById(taskId.value)
})

const pageTitle = computed(() => {
  const taskName = task.value?.name || getSingleQueryValue(route.query.resourceName) || '自理任务'
  return `${taskName} · 选择学生`
})

const backRoute = computed(() => {
  if (taskId.value === null) {
    return '/self-care/tasks'
  }

  return `/self-care/tasks/${taskId.value}/edit`
})

const selfCareModuleTag = computed(() => ({
  type: 'warning' as const,
  label: '生活自理',
  description: '选择学生后回到自理任务入口壳页，继续承接任务训练启动链。',
}))

function getSingleQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }

  return typeof value === 'string' ? value : ''
}

function ensureTask() {
  if (taskId.value === null) {
    ElMessage.warning('缺少自理任务标识，无法开始训练')
    router.replace('/self-care/tasks')
    return false
  }

  if (!task.value) {
    ElMessage.warning('未找到对应自理任务，请返回任务列表重新选择')
    router.replace('/self-care/tasks')
    return false
  }

  return true
}

function handleSelectStudent(student: Student) {
  if (!ensureTask()) {
    return
  }

  router.push({
    path: '/self-care/tasks',
    query: {
      entry: TASK_TRAINING_ENTRY_CODE,
      module: TASK_TRAINING_MODULE_CODE,
      taskId: String(taskId.value),
      resourceId: String(task.value!.id),
      resourceName: task.value!.name,
      studentId: String(student.id),
      studentName: student.name || '',
    },
  })
}

onMounted(() => {
  ensureTask()
})

watch(
  () => route.params.taskId,
  () => {
    ensureTask()
  }
)
</script>

<style scoped>
/* 使用 StudentSelector 组件的样式，无需额外样式 */
</style>
