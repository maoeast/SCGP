<template>
  <StudentSelector
    :title="pageTitle"
    back-route="/assessment"
    :module-tag="currentModuleTag"
    @select="handleSelectStudent"
    @back="handleBack"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import StudentSelector from '@/components/common/StudentSelector.vue'
import { getAssessmentScaleCatalogItem } from '@/features/assessment/assessment-scale-catalog'

// 类型定义
interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
}

const router = useRouter()
const route = useRoute()

const currentScaleItem = computed(() => {
  const scaleCode = Array.isArray(route.query.scale) ? route.query.scale[0] : route.query.scale
  return getAssessmentScaleCatalogItem(scaleCode)
})

const pageTitle = computed(() => {
  return currentScaleItem.value?.studentSelectorTitle || '选择评估学生'
})

const currentModuleTag = computed(() => {
  return currentScaleItem.value?.studentSelectorTag
})

const handleSelectStudent = (student: Student) => {
  if (!student?.id || !currentScaleItem.value) {
    return
  }

  router.push(`/assessment/unified/${currentScaleItem.value.code}/${student.id}`)
}

const handleBack = () => {
  router.push('/assessment')
}
</script>

<style scoped>
/* 使用 StudentSelector 组件的样式，无需额外样式 */
</style>
