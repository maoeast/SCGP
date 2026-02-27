<template>
  <div class="page-container">
    <!-- 面包屑导航 -->
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/equipment/menu' }">器材训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/equipment/select-student', query: { module: currentModuleCode } }">
          {{ currentModule?.name || '选择学生' }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>快速录入</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>{{ currentModule?.name || '器材训练' }} - 快速录入</h1>
        <p class="subtitle">
          <span v-if="student">当前学生：<strong>{{ student.name }}</strong></span>
          <span v-else>加载中...</span>
        </p>
      </div>
      <div class="header-right">
        <!-- 模块快捷切换器 -->
        <div class="module-switcher">
          <el-icon class="switcher-icon"><Switch /></el-icon>
          <span class="switcher-label">切换模块</span>
          <el-select
            v-model="currentModuleCode"
            size="default"
            class="module-select"
            @change="handleModuleChange"
          >
            <el-option
              v-for="mod in activeModules"
              :key="mod.code"
              :label="mod.name"
              :value="mod.code"
            >
              <div class="module-option">
                <el-icon :size="16">
                  <component :is="getModuleIcon(mod.code)" />
                </el-icon>
                <span>{{ mod.name }}</span>
                <el-tag size="small" type="info" class="resource-count-tag">
                  {{ getModuleResourceCount(mod.code) }}项
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </div>
        <el-tag v-if="fromPlan" type="success" size="small">来自训练计划</el-tag>
        <el-button @click="goBackToStudentList" :icon="ArrowLeft">
          {{ fromPlan ? '返回计划' : '返回列表' }}
        </el-button>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 左侧：器材选择器 -->
      <div class="selector-section">
        <ResourceSelector
          v-model="selectedResource"
          v-model:category="selectedCategory"
          :module-code="currentModuleCode"
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
                <el-tag :type="getCategoryTagType(selectedResource.category)" size="small">
                  {{ getCategoryLabel(selectedResource.category) }}
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
import type { ResourceItem, ModuleMetadata } from '@/types/module'
import { ModuleCode } from '@/types/module'
import { EquipmentTrainingAPI, StudentAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import { ModuleRegistry } from '@/core/module-registry'

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

// 简洁的中文标签映射
const SIMPLE_CATEGORY_LABELS: Record<string, string> = {
  tactile: '触觉',
  olfactory: '嗅觉',
  visual: '视觉',
  auditory: '听觉',
  gustatory: '味觉',
  proprioceptive: '本体觉',
  integration: '感官综合'
}

// 分类对应的 Tag 类型
const CATEGORY_TAG_TYPES: Record<string, '' | 'success' | 'warning' | 'danger' | 'info' | 'primary'> = {
  tactile: 'danger',
  olfactory: 'success',
  visual: 'primary',
  auditory: 'warning',
  gustatory: 'info',
  proprioceptive: '',
  integration: 'success'
}

const route = useRoute()
const router = useRouter()

// 当前模块代码（从 URL 参数获取，默认 sensory）
const currentModuleCode = ref<string>(
  (route.query.module as string) || ModuleCode.SENSORY
)

// 获取当前模块信息
const currentModule = computed(() => {
  return ModuleRegistry.getModule(currentModuleCode.value as ModuleCode)
})

// 获取所有活跃模块
const activeModules = computed(() => {
  return ModuleRegistry.getActiveModules()
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
const fromPlan = ref(route.query.from === 'plan')
const preselectedEquipmentId = ref<number | null>(
  route.query.equipmentId ? parseInt(route.query.equipmentId as string) : null
)
const planId = ref<number | null>(
  route.query.planId ? parseInt(route.query.planId as string) : null
)
const resourceName = ref<string>(route.query.resourceName as string || '')

// 获取模块图标组件
const getModuleIcon = (moduleCode: string) => {
  const iconMap: Record<string, any> = {
    [ModuleCode.SENSORY]: MagicStick,     // 感官统合 - 魔法棒
    [ModuleCode.EMOTIONAL]: Sunny,        // 情绪调节 - 太阳
    [ModuleCode.SOCIAL]: ChatDotRound     // 社交沟通 - 对话
  }
  return iconMap[moduleCode] || MagicStick
}

// 获取模块资源数量
const getModuleResourceCount = (moduleCode: string): number => {
  try {
    const api = new ResourceAPI()
    const resources = api.getResources({
      moduleCode: moduleCode as ModuleCode,
      resourceType: 'equipment'
    })
    return resources.length
  } catch {
    return 0
  }
}

// 获取分类标签
const getCategoryLabel = (category: string) => {
  return SIMPLE_CATEGORY_LABELS[category] || category
}

// 获取分类 Tag 类型
const getCategoryTagType = (category: string) => {
  return CATEGORY_TAG_TYPES[category] || ''
}

// 处理模块切换
const handleModuleChange = (newModuleCode: string) => {
  // 清空当前选择
  selectedResource.value = null
  selectedCategory.value = 'all'

  // 更新 URL（保持学生ID不变）
  router.replace({
    path: `/equipment/quick-entry/${studentId.value}`,
    query: {
      module: newModuleCode,
      ...(fromPlan.value && { from: 'plan' }),
      ...(preselectedEquipmentId.value && { equipmentId: preselectedEquipmentId.value }),
      ...(planId.value && { planId: planId.value })
    }
  })

  ElMessage.success(`已切换到 ${currentModule.value?.name || '器材训练'}`)
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
  if (!selectedResource.value) return

  submitting.value = true
  try {
    const api = new EquipmentTrainingAPI()
    api.createRecord({
      student_id: studentId.value,
      equipment_id: selectedResource.value.id,
      score: data.score,
      prompt_level: data.promptLevel,
      duration_seconds: data.durationSeconds,
      notes: data.notes,
      training_date: new Date().toISOString()
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
  // 如果从计划跳转，返回计划列表
  if (fromPlan.value) {
    router.push('/training-plan')
  } else {
    router.push({
      path: '/equipment/select-student',
      query: { module: currentModuleCode.value }
    })
  }
}

// 顶部返回按钮：根据来源决定返回位置
const goBackToStudentList = () => {
  // 如果从计划跳转，返回计划列表
  if (fromPlan.value) {
    router.push('/training-plan')
  } else {
    router.push({
      path: '/equipment/select-student',
      query: { module: currentModuleCode.value }
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
      selectedResource.value = resource as unknown as ResourceItem
      // 设置分类筛选
      if (resource.category) {
        selectedCategory.value = resource.category
      }
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

  await loadStudent()

  // 如果从计划跳转且指定了器材ID，自动选择
  if (preselectedEquipmentId.value) {
    // 稍微延迟一下，等待 ResourceSelector 组件加载完成
    setTimeout(() => {
      autoSelectEquipment()
    }, 500)
  }
})
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
