<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/equipment/menu' }">器材训练</el-breadcrumb-item>
        <el-breadcrumb-item>选择学生</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>选择学生</h1>
        <p class="subtitle">{{ moduleName }} - 选择需要训练的学生</p>
      </div>
    </div>

    <!-- 学生选择器 -->
    <div class="main-content">
      <StudentSelector
        :title="selectStudentTitle"
        :module-tag="equipmentModuleTag"
        @select="handleStudentSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StudentSelector from '@/components/common/StudentSelector.vue'
import { ModuleRegistry } from '@/core/module-registry'
import type { ModuleMetadata } from '@/types/module'

// 获取路由参数中的模块代码
const route = useRoute()
const router = useRouter()

const moduleCode = computed(() => route.query.module as string || 'sensory')

// 获取模块信息
const currentModule = computed(() => {
  return ModuleRegistry.getModule(moduleCode.value as any)
})

// 模块名称
const moduleName = computed(() => currentModule.value?.name || '器材训练')

// 选择学生标题
const selectStudentTitle = computed(() => `选择学生 - ${moduleName.value}`)

// 器材训练模块标签配置
const equipmentModuleTag = {
  type: 'warning' as const,
  label: '器材训练',
  description: '选择学生进行器材训练'
}

// 处理学生选择
const handleStudentSelect = (student: { id: number }) => {
  router.push({
    path: `/equipment/quick-entry/${student.id}`,
    query: { module: moduleCode.value }
  })
}
</script>

