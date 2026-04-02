<template>
  <StudentSelector
    :title="selectStudentTitle"
    back-route="/equipment/menu"
    :module-tag="equipmentModuleTag"
    @select="handleStudentSelect"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import StudentSelector from '@/components/common/StudentSelector.vue'
import {
  getEquipmentTrainingEntry,
  resolveEquipmentTrainingEntryRouteCode,
} from '@/utils/equipment-training-entry'

const route = useRoute()
const router = useRouter()
let isRedirectingToMenu = false

const entryCode = computed(() => resolveEquipmentTrainingEntryRouteCode(route.query.entry, route.query.module))

const currentEntry = computed(() => {
  return entryCode.value ? getEquipmentTrainingEntry(entryCode.value) : null
})

const moduleName = computed(() => currentEntry.value?.name || '器材训练')

// 选择学生标题
const selectStudentTitle = computed(() => `选择学生 - ${moduleName.value}`)

// 器材训练模块标签配置
const equipmentModuleTag = {
  type: 'warning' as const,
  label: '器材训练',
  description: '选择学生进行器材训练'
}

function redirectToMenu() {
  if (isRedirectingToMenu) {
    return
  }

  isRedirectingToMenu = true
  router.replace('/equipment/menu')
}

function ensureEntrySelection() {
  if (!entryCode.value || !currentEntry.value) {
    ElMessage.warning('缺少明确的器材训练入口，请先从器材训练菜单选择入口组')
    redirectToMenu()
    return false
  }

  return true
}

// 处理学生选择
const handleStudentSelect = (student: { id: number }) => {
  if (!ensureEntrySelection()) {
    return
  }

  router.push({
    path: `/equipment/quick-entry/${student.id}`,
    query: {
      entry: entryCode.value,
      module: currentEntry.value!.moduleCode
    }
  })
}

onMounted(() => {
  ensureEntrySelection()
})

watch(
  () => [route.query.entry, route.query.module],
  () => {
    ensureEntrySelection()
  }
)
</script>
