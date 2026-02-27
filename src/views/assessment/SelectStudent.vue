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

interface ModuleTag {
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  label: string
  description: string
}

const router = useRouter()
const route = useRoute()

// 有效的量表类型
const validScales = ['sm', 'weefim', 'csirs', 'conners-psq', 'conners-trs'] as const
type ScaleType = typeof validScales[number]

// 当前量表类型
const scaleType = computed<ScaleType>(() => {
  return validScales.includes(route.query.scale as ScaleType)
    ? route.query.scale as ScaleType
    : 'sm'
})

// 页面标题
const pageTitle = computed(() => {
  const titles: Record<ScaleType, string> = {
    'sm': '选择评估学生 - S-M量表',
    'weefim': '选择评估学生 - WeeFIM量表',
    'csirs': '选择评估学生 - CSIRS量表',
    'conners-psq': '选择评估学生 - Conners父母问卷',
    'conners-trs': '选择评估学生 - Conners教师问卷'
  }
  return titles[scaleType.value]
})

// 模块标签配置
const currentModuleTag = computed<ModuleTag>(() => {
  const tags: Record<ScaleType, ModuleTag> = {
    'sm': {
      type: 'primary',
      label: 'S-M 社会生活能力',
      description: '评估儿童社会生活能力发展水平'
    },
    'weefim': {
      type: 'success',
      label: 'WeeFIM 功能独立性',
      description: '评估儿童功能独立性发展水平'
    },
    'csirs': {
      type: 'warning',
      label: 'CSIRS 感觉统合',
      description: '评估儿童感觉统合能力'
    },
    'conners-psq': {
      type: 'danger',
      label: 'Conners 父母问卷',
      description: '评估儿童在家中的行为表现'
    },
    'conners-trs': {
      type: 'info',
      label: 'Conners 教师问卷',
      description: '评估儿童在学校中的行为表现'
    }
  }
  return tags[scaleType.value]
})

// 处理学生选择
const handleSelectStudent = (student: Student) => {
  // 验证学生ID
  if (!student?.id) {
    return
  }

  // Phase 4 重构：所有量表使用统一的评估容器
  // 路由格式: /assessment/unified/:scaleCode/:studentId
  router.push(`/assessment/unified/${scaleType.value}/${student.id}`)
}

// 处理返回
const handleBack = () => {
  router.push('/assessment')
}
</script>

<style scoped>
/* 使用 StudentSelector 组件的样式，无需额外样式 */
</style>
