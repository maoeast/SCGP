<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/equipment/menu' }">器材训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="selectStudentRoute">
          {{ currentEntry?.name || '选择入口' }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>快速录入</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentEntry?.name || '器材训练' }} - 快速录入</h1>
        <p class="subtitle">
          <span v-if="student">当前学生：<strong>{{ student.name }}</strong></span>
          <span v-else>加载中...</span>
        </p>
      </div>
      <div class="header-right">
        <!-- 模块快捷切换器 -->
        <div class="module-switcher">
          <el-icon class="switcher-icon"><Switch /></el-icon>
          <span class="switcher-label">切换入口</span>
          <el-select
            v-model="currentEntryCode"
            size="default"
            class="module-select"
            @change="handleEntryChange"
          >
            <el-option
              v-for="entry in availableEntries"
              :key="entry.code"
              :label="entry.name"
              :value="entry.code"
            >
              <div class="module-option">
                <el-icon :size="16">
                  <component :is="getModuleIcon(entry.icon)" />
                </el-icon>
                <span>{{ entry.name }}</span>
                <el-tag size="small" type="info" class="resource-count-tag">
                  {{ getModuleResourceCount(entry.code) }}项
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </div>
        <el-tag v-if="launchSource" type="success" size="small">{{ sourceTagLabel }}</el-tag>
        <el-button @click="goBackToStudentList" :icon="ArrowLeft">
          {{ launchSource ? sourceBackLabel : '返回列表' }}
        </el-button>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 左侧：器材选择器 -->
      <div v-if="currentEntry" class="selector-section">
        <ResourceSelector
          v-model="selectedResource"
          v-model:category="selectedCategory"
          :module-code="currentModuleCode"
          :equipment-training-entry="currentEntryCode"
          resource-type="equipment"
        />
      </div>

      <!-- 右侧：录入表单 -->
      <div class="form-section">
        <el-card v-if="selectedResource" class="form-card">
          <template #header>
            <div class="card-header">
              <div class="equipment-info">
                <span class="equipment-name">{{ selectedResource.name }}</span>
                <el-tag :type="getCategoryTagType(selectedResource)" size="small">
                  {{ getCategoryLabel(selectedResource) }}
                </el-tag>
              </div>
            </div>
          </template>

          <DataEntryForm
            :equipment="selectedResource"
            :student-id="studentId"
            :loading="submitting"
            @submit="handleSubmit"
          />
        </el-card>

        <el-empty
          v-else
          description="请从左侧选择一个器材"
          :image-size="200"
        />
      </div>
    </div>

    <!-- 保存成功引导对话框 -->
    <el-dialog
      v-model="successDialogVisible"
      title="录入成功"
      width="420px"
      :close-on-click-modal="false"
      center
    >
      <div class="success-content">
        <el-icon class="success-icon" :size="48"><CircleCheck /></el-icon>
        <p class="success-text">训练记录已成功保存！</p>
        <p class="student-info" v-if="student">
          学生：<strong>{{ student.name }}</strong>
        </p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="continueWithSameStudent" :icon="Plus">
            继续为该生录入
          </el-button>
          <el-button type="primary" @click="backToStudentList" :icon="User">
            返回学生列表
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheck, Plus, User, ArrowLeft, MagicStick, Sunny, ChatDotRound, Switch } from '@element-plus/icons-vue'
import ResourceSelector from '@/components/resources/ResourceSelector.vue'
import DataEntryForm from '@/components/equipment/DataEntryForm.vue'
import type { ResourceItem } from '@/types/module'
import { ModuleCode } from '@/types/module'
import { EquipmentTrainingAPI, StudentAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import { useAuthStore } from '@/stores/auth'
import {
  getEquipmentCatalogGroupTagType,
} from '@/utils/equipment-catalog-group'
import {
  getAllEquipmentTrainingEntries,
  getEquipmentTrainingEntry,
  matchesEquipmentTrainingEntry,
  resolveEquipmentTrainingEntryCodeFromResource,
  resolveEquipmentTrainingEntryRouteCode,
  type EquipmentTrainingEntryCode,
} from '@/utils/equipment-training-entry'
import { resolveEquipmentSourceCategory } from '@/utils/physical-equipment-source-category'

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

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
let isRedirectingToMenu = false

// 当前入口组代码（器材训练内部入口，必须显式确定）
const currentEntryCode = ref<EquipmentTrainingEntryCode | null>(
  resolveEquipmentTrainingEntryRouteCode(route.query.entry, route.query.module)
)

const currentEntry = computed(() => {
  return currentEntryCode.value ? getEquipmentTrainingEntry(currentEntryCode.value) : null
})

const currentModuleCode = computed<ModuleCode>(() => currentEntry.value?.moduleCode || ModuleCode.SENSORY)

const selectStudentRoute = computed(() => {
  if (!currentEntryCode.value || !currentEntry.value) {
    return { path: '/equipment/menu' }
  }

  return {
    path: '/equipment/select-student',
    query: {
      entry: currentEntryCode.value,
      module: currentEntry.value.moduleCode
    }
  }
})

const availableEntries = computed(() => {
  return getAllEquipmentTrainingEntries().filter((entry) => authStore.hasModuleAccess(entry.moduleCode))
})

// 学生相关状态
const studentId = ref<number>(parseInt(route.params.studentId as string) || 0)
const student = ref<Student | null>(null)
const studentLoading = ref(false)

// 器材选择相关状态
const selectedResource = ref<ResourceItem | null>(null)
const selectedCategory = ref<string>('all')

// 提交状态
const submitting = ref(false)

// 成功对话框
const successDialogVisible = ref(false)

// 从计划跳转的上下文
const launchSource = ref<string>((route.query.from as string) || '')
const fromPlan = computed(() => launchSource.value === 'plan')
const fromDashboard = computed(() => launchSource.value === 'dashboard')
const preselectedEquipmentId = ref<number | null>(
  route.query.equipmentId ? parseInt(route.query.equipmentId as string) : null
)
const planId = ref<number | null>(
  route.query.planId ? parseInt(route.query.planId as string) : null
)
const resourceName = ref<string>(route.query.resourceName as string || '')
const sourceTagLabel = computed(() => fromDashboard.value ? '来自首页日程' : '来自训练计划')
const sourceBackLabel = computed(() => fromDashboard.value ? '返回首页' : '返回计划')

// 获取模块图标组件
const getModuleIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    MagicStick,
    Sunny,
    ChatDotRound,
    Operation: MagicStick,
    MoonNight: Sunny,
    House: User,
  }
  return iconMap[iconName] || MagicStick
}

// 获取入口组资源数量
const getModuleResourceCount = (entryCode: EquipmentTrainingEntryCode): number => {
  try {
    const api = new ResourceAPI()
    const resources = api.getResources({
      moduleCode: getEquipmentTrainingEntry(entryCode).moduleCode,
      resourceType: 'equipment'
    })
    return resources.filter((resource) => matchesEquipmentTrainingEntry(resource, entryCode)).length
  } catch {
    return 0
  }
}

// 获取分类标签
const getCategoryLabel = (resource: ResourceItem) => {
  return resolveEquipmentSourceCategory(resource)
}

// 获取分类 Tag 类型
const getCategoryTagType = (resource: ResourceItem) => {
  return getEquipmentCatalogGroupTagType(resource)
}

function resolveEntryFromRoute(): EquipmentTrainingEntryCode | null {
  return resolveEquipmentTrainingEntryRouteCode(route.query.entry, route.query.module)
}

function resolveEntryFromPreselectedEquipment(syncRoute = false): EquipmentTrainingEntryCode | null {
  if (!preselectedEquipmentId.value) {
    return null
  }

  try {
    const api = new ResourceAPI()
    const resource = api.getResourceById(preselectedEquipmentId.value)
    if (!resource) {
      return null
    }

    const resolvedEntryCode = resolveEquipmentTrainingEntryCodeFromResource(resource)
    currentEntryCode.value = resolvedEntryCode

    if (syncRoute) {
      syncRouteEntry(resolvedEntryCode)
    }

    return resolvedEntryCode
  } catch (error) {
    console.error('根据器材资源解析入口失败:', error)
    return null
  }
}

function ensureCurrentEntry(): EquipmentTrainingEntryCode | null {
  const routeEntryCode = resolveEntryFromRoute()
  if (routeEntryCode) {
    currentEntryCode.value = routeEntryCode
    return routeEntryCode
  }

  const resourceEntryCode = resolveEntryFromPreselectedEquipment(true)
  if (resourceEntryCode) {
    return resourceEntryCode
  }

  if (!isRedirectingToMenu) {
    isRedirectingToMenu = true
    ElMessage.warning('缺少明确的器材训练入口，请先从器材训练菜单选择入口组')
    router.replace('/equipment/menu')
  }
  return null
}

function syncRouteEntry(entryCode: EquipmentTrainingEntryCode) {
  router.replace({
    path: `/equipment/quick-entry/${studentId.value}`,
    query: {
      entry: entryCode,
      module: getEquipmentTrainingEntry(entryCode).moduleCode,
      ...(launchSource.value && { from: launchSource.value }),
      ...(preselectedEquipmentId.value && { equipmentId: preselectedEquipmentId.value }),
      ...(planId.value && { planId: planId.value }),
      ...(resourceName.value && { resourceName: resourceName.value })
    }
  })
}

// 处理入口切换
const handleEntryChange = (newEntryCode: EquipmentTrainingEntryCode) => {
  currentEntryCode.value = newEntryCode

  // 清空当前选择
  selectedResource.value = null
  selectedCategory.value = 'all'

  syncRouteEntry(newEntryCode)
  ElMessage.success(`已切换到 ${getEquipmentTrainingEntry(newEntryCode).name}`)
}

// 加载学生信息
const loadStudent = async () => {
  if (!studentId.value) return

  studentLoading.value = true
  try {
    const api = new StudentAPI()
    student.value = await api.getStudentById(studentId.value)

    if (!student.value) {
      ElMessage.error('未找到该学生')
      goBackToStudentList()
    }
  } catch (error: any) {
    console.error('加载学生信息失败:', error)
    ElMessage.error('加载学生信息失败')
    goBackToStudentList()
  } finally {
    studentLoading.value = false
  }
}

// 处理表单提交
const handleSubmit = async (data: any) => {
  if (!selectedResource.value || !currentEntryCode.value || !currentEntry.value) return

  submitting.value = true
  try {
    const api = new EquipmentTrainingAPI()
    api.createRecord({
      student_id: studentId.value,
      equipment_id: selectedResource.value.id,
      entry_code: currentEntryCode.value,
      score: data.score,
      prompt_level: data.promptLevel,
      duration_seconds: data.durationSeconds,
      notes: data.notes,
      training_date: new Date().toISOString(),
      module_code: currentEntry.value.moduleCode
    })

    if (data.saveAndContinue) {
      // 保存并继续：不弹窗，直接清空选择继续录入
      ElMessage.success('保存成功')
      selectedResource.value = null
      selectedCategory.value = 'all'
    } else {
      // 仅保存：显示成功对话框
      successDialogVisible.value = true
    }
  } catch (error: any) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    submitting.value = false
  }
}

// 继续为同一学生录入
const continueWithSameStudent = () => {
  successDialogVisible.value = false
  // 清空选择，保留学生上下文
  selectedResource.value = null
  selectedCategory.value = 'all'
}

// 返回学生列表（器材训练学生选择页）
const backToStudentList = () => {
  successDialogVisible.value = false
  if (fromDashboard.value) {
    router.push('/dashboard')
  } else if (fromPlan.value) {
    router.push('/training-plan')
  } else if (!currentEntryCode.value || !currentEntry.value) {
    router.push('/equipment/menu')
  } else {
    router.push({
      path: '/equipment/select-student',
      query: {
        entry: currentEntryCode.value,
        module: currentModuleCode.value
      }
    })
  }
}

// 顶部返回按钮：根据来源决定返回位置
const goBackToStudentList = () => {
  if (fromDashboard.value) {
    router.push('/dashboard')
  } else if (fromPlan.value) {
    router.push('/training-plan')
  } else if (!currentEntryCode.value || !currentEntry.value) {
    router.push('/equipment/menu')
  } else {
    router.push({
      path: '/equipment/select-student',
      query: {
        entry: currentEntryCode.value,
        module: currentModuleCode.value
      }
    })
  }
}

// 自动预选器材（从计划跳转时）
const autoSelectEquipment = async () => {
  if (!preselectedEquipmentId.value) return

  try {
    const api = new ResourceAPI()
    const resource = api.getResourceById(preselectedEquipmentId.value)

    if (resource) {
      const resourceEntryCode = resolveEquipmentTrainingEntryCodeFromResource(resource)
      if (resourceEntryCode !== currentEntryCode.value) {
        currentEntryCode.value = resourceEntryCode
        syncRouteEntry(resourceEntryCode)
      }
      selectedResource.value = resource as unknown as ResourceItem
      selectedCategory.value = resolveEquipmentSourceCategory(resource)
      ElMessage.success(`已自动选择器材「${resource.name}」`)
    } else {
      ElMessage.warning(`未找到预设器材，请手动选择`)
    }
  } catch (error) {
    console.error('自动选择器材失败:', error)
    ElMessage.warning('自动选择器材失败，请手动选择')
  }
}

// 初始化
onMounted(async () => {
  if (!studentId.value) {
    ElMessage.error('缺少学生ID')
    goBackToStudentList()
    return
  }

  if (!ensureCurrentEntry()) {
    return
  }

  await loadStudent()

  // 如果从计划跳转且指定了器材ID，自动选择
  if (preselectedEquipmentId.value) {
    // 稍微延迟一下，等待 ResourceSelector 组件加载完成
    setTimeout(() => {
      autoSelectEquipment()
    }, 500)
  }
})

watch(
  () => [route.query.entry, route.query.module],
  ([entry, module]) => {
    const resolvedEntryCode = resolveEquipmentTrainingEntryRouteCode(entry, module)
    if (resolvedEntryCode) {
      currentEntryCode.value = resolvedEntryCode
    }
  }
)
</script>

<style scoped>
.content-wrapper {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
}

.selector-section {
  flex: 1;
  overflow-y: auto;
}

.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.form-card {
  height: fit-content;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.equipment-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.equipment-name {
  font-size: 16px;
  font-weight: 500;
}

/* 模块切换器样式 */
.module-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  border: 1px solid #c2e7b0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.module-switcher:hover {
  background: linear-gradient(135deg, #e1f3d8 0%, #d4edda 100%);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.2);
}

.switcher-icon {
  color: #67c23a;
  font-size: 18px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.switcher-label {
  font-size: 14px;
  font-weight: 500;
  color: #67c23a;
}

.module-select {
  width: 160px;
}

.module-select :deep(.el-input__wrapper) {
  background-color: #fff;
  border-color: #67c23a;
  box-shadow: 0 0 0 1px #67c23a inset;
}

.module-select :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #85ce61 inset;
}

.module-select :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #85ce61 inset, 0 0 0 3px rgba(103, 194, 58, 0.2);
}

.module-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.resource-count-tag {
  margin-left: auto;
}

/* 成功对话框样式 */
.success-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  color: #67c23a;
  margin-bottom: 16px;
}

.success-text {
  font-size: 16px;
  color: #303133;
  margin: 0 0 8px 0;
}

.student-info {
  font-size: 14px;
  color: #606266;
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
