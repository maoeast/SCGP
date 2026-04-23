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
import { ElMessage } from 'element-plus'
import StudentSelector from '@/components/common/StudentSelector.vue'
import {
  getCnbsr2016UnsupportedAgeMessage,
  isCnbsr2016AgeSupported,
} from '@/config/cnbsr2016-thresholds'
import { getAssessmentScaleCatalogItem } from '@/features/assessment/assessment-scale-catalog'
import { calculateAgeInMonths } from '@/types/assessment'

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

function formatAge(ageInMonths: number): string {
  const years = Math.floor(ageInMonths / 12)
  const months = ageInMonths % 12

  if (years <= 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
}

const handleSelectStudent = (student: Student) => {
  if (!student?.id || !currentScaleItem.value) {
    return
  }

  if (currentScaleItem.value.code === 'cnbsr2016') {
    const ageInMonths = calculateAgeInMonths(student.birthday)
    if (!isCnbsr2016AgeSupported(ageInMonths)) {
      ElMessage.error(`${student.name} 当前为${formatAge(ageInMonths)}（${ageInMonths}个月）。${getCnbsr2016UnsupportedAgeMessage(ageInMonths)}`)
      return
    }
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
