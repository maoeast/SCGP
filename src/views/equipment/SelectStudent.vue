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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StudentSelector from '@/components/common/StudentSelector.vue'
import {
  getEquipmentTrainingEntry,
  resolveEquipmentTrainingEntryCode,
} from '@/utils/equipment-training-entry'

const route = useRoute()
const router = useRouter()

const currentEntry = computed(() => {
  return getEquipmentTrainingEntry(route.query.entry, route.query.module)
})

const entryCode = computed(() => resolveEquipmentTrainingEntryCode(route.query.entry, route.query.module))

const moduleName = computed(() => currentEntry.value.name || '器材训练')

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
    query: {
      entry: entryCode.value,
      module: currentEntry.value.moduleCode
    }
  })
}
</script>
