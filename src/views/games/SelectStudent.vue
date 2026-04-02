<template>
  <StudentSelector
    :title="pageTitle"
    back-route="/games/menu"
    :module-tag="currentModuleTag"
    @select="handleSelectStudent"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StudentSelector from '@/components/common/StudentSelector.vue'
import {
  getTrainingEntry,
  resolveTrainingEntryCode,
} from '@/utils/training-entry'

interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
}

interface ModuleTag {
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  label: string
  description: string
}

const router = useRouter()
const route = useRoute()

// 当前训练入口
const currentEntryCode = ref(resolveTrainingEntryCode(route.query.entry, route.query.module))
const currentEntry = computed(() => getTrainingEntry(currentEntryCode.value))
const emotionalTargetPaths = new Set([
  '/emotional/menu',
  '/emotional/emotion-scene/select',
  '/emotional/emotion-scene',
  '/emotional/care-expression/select',
  '/emotional/care-expression',
  '/emotional/games/balloon',
  '/emotional/games/forest',
])

const emotionalSubModuleTargetMap: Record<string, string> = {
  emotion_scene: '/emotional/emotion-scene/select',
  care_scene: '/emotional/care-expression/select',
  emotion_games_balloon: '/emotional/games/balloon',
  emotion_games_forest: '/emotional/games/forest',
}

function resolveEmotionalTargetPath() {
  const rawTargetPath = Array.isArray(route.query.targetPath)
    ? route.query.targetPath[0]
    : route.query.targetPath

  if (typeof rawTargetPath === 'string' && emotionalTargetPaths.has(rawTargetPath)) {
    return rawTargetPath
  }

  const rawSubModule = Array.isArray(route.query.subModule)
    ? route.query.subModule[0]
    : route.query.subModule

  if (typeof rawSubModule === 'string' && emotionalSubModuleTargetMap[rawSubModule]) {
    return emotionalSubModuleTargetMap[rawSubModule]
  }

  return '/emotional/menu'
}

// 获取当前模块信息
const currentModule = computed(() => currentEntry.value)

const pageTitle = computed(() => `${currentModule.value?.name || '游戏训练'} · 选择学生`)

const currentModuleTag = computed<ModuleTag>(() => ({
  type: currentEntry.value?.moduleCode === 'emotional' ? 'warning' : 'primary',
  label: currentModule.value?.name || '游戏训练',
  description: '选择学生后进入对应训练入口，开始游戏训练。',
}))

// 选择学生 - 跳转到游戏大厅
const handleSelectStudent = (student: Student) => {
  console.log('[SelectStudent] 选择学生:', student.id, '入口:', currentEntryCode.value)

  const hasExplicitEmotionalTarget = Boolean(route.query.targetPath || route.query.subModule)

  if (currentEntryCode.value === 'emotional-regulation' && !hasExplicitEmotionalTarget) {
    router.push({
      path: `/games/lobby/${student.id}`,
      query: {
        entry: currentEntryCode.value,
        module: currentEntry.value.moduleCode,
        studentName: student.name || '',
      },
    })
    return
  }

  // 跳转到游戏大厅
  router.push({
    path: currentEntryCode.value === 'emotional-regulation'
      ? resolveEmotionalTargetPath()
      : `/games/lobby/${student.id}`,
    query: currentEntryCode.value === 'emotional-regulation'
      ? {
          entry: currentEntryCode.value,
          module: currentEntry.value.moduleCode,
          studentId: String(student.id),
          studentName: student.name || ''
        }
      : {
          entry: currentEntryCode.value,
          module: currentEntry.value.moduleCode
        }
  })
}
</script>
