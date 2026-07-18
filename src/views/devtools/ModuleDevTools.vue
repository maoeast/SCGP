<template>
  <div class="module-devtools">
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <div class="flex items-center">
          <el-icon class="mr-2" :size="20">
            <Setting />
          </el-icon>
          <span class="text-large font-600">模块开发者工具</span>
          <el-tag v-if="!isDevEnvironment" type="warning" size="small" class="ml-3">
            生产环境
          </el-tag>
        </div>
      </template>
    </el-page-header>

    <!-- 警告提示 -->
    <el-alert
      v-if="!isDevEnvironment"
      title="警告"
      type="warning"
      description="此工具仅在开发环境中可用。在生产环境中无法修改模块配置。"
      :closable="false"
      class="mt-4"
    />

    <!-- 主要内容区域 -->
    <div class="content-wrapper">
      <!-- 左侧：模块列表 -->
      <div class="module-list-section">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>已注册模块 ({{ modules.length }})</span>
              <el-button
                text
                type="primary"
                @click="refreshModules"
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>

          <!-- 模块列表 -->
          <div class="module-list">
            <div
              v-for="module in modules"
              :key="module.code"
              class="module-item"
              :class="{ 'is-active': selectedModule?.code === module.code }"
              @click="selectModule(module)"
            >
              <div class="module-icon" :style="{ backgroundColor: module.themeColor }">
                <el-icon>
                  <component :is="module.icon" />
                </el-icon>
              </div>
              <div class="module-info">
                <div class="module-name">{{ module.name }}</div>
                <div class="module-code">{{ module.code }}</div>
              </div>
              <div class="module-status">
                <el-tag
                  :type="getStatusType(module.status)"
                  size="small"
                >
                  {{ getStatusLabel(module.status) }}
                </el-tag>
              </div>
            </div>

            <!-- 空状态 -->
            <el-empty
              v-if="modules.length === 0"
              description="暂无已注册模块"
              :image-size="80"
            />
          </div>
        </el-card>
      </div>

      <!-- 右侧：模块详情和配置 -->
      <div class="module-detail-section">
        <template v-if="selectedModule">
          <!-- 模块基本信息 -->
          <el-card shadow="never" class="mb-4">
            <template #header>
              <div class="card-header">
                <span>模块详情</span>
                <el-switch
                  v-if="isDevEnvironment && selectedModule.code !== 'sensory'"
                  v-model="moduleEnabled"
                  active-text="启用"
                  inactive-text="禁用"
                  @change="toggleModuleStatus"
                />
              </div>
            </template>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="模块名称">
                {{ selectedModule.name }}
              </el-descriptions-item>
              <el-descriptions-item label="模块代码">
                <el-tag size="small">{{ selectedModule.code }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="版本">
                {{ selectedModule.version }}
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusType(selectedModule.status)">
                  {{ getStatusLabel(selectedModule.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="主题色" :span="2">
                <div class="flex items-center">
                  <div
                    class="color-preview"
                    :style="{ backgroundColor: selectedModule.themeColor }"
                  />
                  <span class="ml-2">{{ selectedModule.themeColor }}</span>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">
                {{ selectedModule.description }}
              </el-descriptions-item>
              <el-descriptions-item
                v-if="selectedModule.dependencies && selectedModule.dependencies.length > 0"
                label="依赖模块"
                :span="2"
              >
                <el-tag
                  v-for="dep in selectedModule.dependencies"
                  :key="dep"
                  size="small"
                  class="mr-1"
                >
                  {{ dep }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 模块功能列表 -->
          <el-card shadow="never" class="mb-4">
            <template #header>
              <span>功能列表 ({{ selectedModule.features.length }})</span>
            </template>

            <el-table :data="selectedModule.features" size="small">
              <el-table-column prop="name" label="功能名称" width="150" />
              <el-table-column prop="code" label="功能代码" width="150" />
              <el-table-column prop="description" label="描述" />
              <el-table-column prop="route" label="路由" width="180">
                <template #default="{ row }">
                  <el-tag v-if="row.route" size="small" type="info">
                    {{ row.route }}
                  </el-tag>
                  <span v-else class="text-gray-400">-</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="getFeatureStatusType(row.status)"
                    size="small"
                  >
                    {{ getFeatureStatusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <!-- 模块配置 -->
          <el-card shadow="never" class="mb-4">
            <template #header>
              <div class="card-header">
                <span>模块配置 (localStorage)</span>
                <div>
                  <el-button
                    v-if="isDevEnvironment"
                    text
                    type="primary"
                    size="small"
                    @click="editConfig"
                  >
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-button>
                  <el-button
                    v-if="isDevEnvironment"
                    text
                    type="danger"
                    size="small"
                    @click="resetConfig"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                    重置
                  </el-button>
                </div>
              </div>
            </template>

            <div class="config-viewer">
              <el-input
                v-if="moduleConfig"
                type="textarea"
                :rows="10"
                :model-value="JSON.stringify(moduleConfig.config, null, 2)"
                readonly
              />
              <el-empty v-else description="暂无配置" :image-size="60" />
            </div>
          </el-card>
        </template>

        <!-- 未选择模块 -->
        <el-empty v-else description="请从左侧选择一个模块" />
      </div>
    </div>

    <!-- 配置编辑对话框 -->
    <el-dialog
      v-model="configEditDialogVisible"
      title="编辑模块配置"
      width="600px"
    >
      <el-input
        v-model="configEditText"
        type="textarea"
        :rows="15"
        placeholder="输入有效的 JSON 配置"
      />
      <template #footer>
        <el-button @click="configEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting, Refresh, Edit, RefreshLeft
} from '@element-plus/icons-vue'
import { ModuleRegistry } from '@/core/module-registry'
import { ModuleCode, type ModuleMetadata } from '@/types/module'

const router = useRouter()

// ========== 状态 ==========

const isDevEnvironment = computed(() => import.meta.env.DEV)
const modules = ref<ModuleMetadata[]>([])
const selectedModule = ref<ModuleMetadata | null>(null)
const moduleConfig = ref<any>(null)
const moduleEnabled = ref(true)

// 配置编辑
const configEditDialogVisible = ref(false)
const configEditText = ref('')

// ========== 生命周期 ==========

onMounted(() => {
  loadModules()
})

// ========== 数据加载 ==========

function loadModules() {
  modules.value = ModuleRegistry.getAllModules()
}

function refreshModules() {
  loadModules()
  ElMessage.success('已刷新模块列表')
}

// ========== 模块选择 ==========

function selectModule(module: ModuleMetadata) {
  selectedModule.value = module
  loadModuleConfig(module.code)

  // 获取模块配置中的启用状态
  const config = ModuleRegistry.getModuleConfig(module.code)
  // 默认启用 active 模块
  moduleEnabled.value = module.status === 'active'
}

function loadModuleConfig(moduleCode: ModuleCode) {
  const config = ModuleRegistry.getModuleConfig(moduleCode)
  moduleConfig.value = config
}

// ========== 模块状态控制 ==========

function toggleModuleStatus(enabled: boolean) {
  if (!isDevEnvironment.value) {
    ElMessage.warning('仅在开发环境中可以修改模块状态')
    return
  }

  if (!selectedModule.value) return

  const newStatus = enabled ? 'active' : 'deprecated'

  ElMessageBox.confirm(
    `确定要${enabled ? '启用' : '禁用'}模块 "${selectedModule.value.name}" 吗？`,
    '确认操作',
    {
      type: 'warning'
    }
  ).then(() => {
    // 更新模块配置
    ModuleRegistry.updateModuleConfig(selectedModule.value!.code, {
      enabled
    })

    // 注意：这里我们修改的是模块元数据的 status
    // 在实际应用中，可能需要通过 ModuleRegistry 提供的方法来更新
    // 目前 ModuleRegistry 没有提供 updateModuleStatus 方法，所以我们只更新配置
    ElMessage.success(`模块已${enabled ? '启用' : '禁用'}`)
  }).catch(() => {
    // 用户取消，恢复开关状态
    moduleEnabled.value = !enabled
  })
}

// ========== 配置编辑 ==========

function editConfig() {
  if (!moduleConfig.value) {
    ElMessage.warning('暂无配置可编辑')
    return
  }

  configEditText.value = JSON.stringify(moduleConfig.value.config, null, 2)
  configEditDialogVisible.value = true
}

function saveConfig() {
  if (!selectedModule.value) return

  try {
    const newConfig = JSON.parse(configEditText.value)
    ModuleRegistry.updateModuleConfig(selectedModule.value.code, newConfig)

    // 重新加载配置
    loadModuleConfig(selectedModule.value.code)

    configEditDialogVisible.value = false
    ElMessage.success('配置已保存')
  } catch (error: any) {
    ElMessage.error(`配置无效: ${error.message}`)
  }
}

function resetConfig() {
  if (!selectedModule.value) return

  ElMessageBox.confirm(
    '确定要重置模块配置为默认值吗？此操作不可撤销。',
    '确认重置',
    {
      type: 'warning'
    }
  ).then(() => {
    ModuleRegistry.resetModuleConfig(selectedModule.value!.code)
    loadModuleConfig(selectedModule.value!.code)
    ElMessage.success('配置已重置')
  }).catch(() => {
    // 用户取消
  })
}

// ========== 辅助函数 ==========

function getStatusType(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'experimental': return 'warning'
    case 'deprecated': return 'info'
    default: return 'info'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active': return '活跃'
    case 'experimental': return '实验'
    case 'deprecated': return '废弃'
    default: return status
  }
}

function getFeatureStatusType(status: string) {
  switch (status) {
    case 'active': return 'success'
    case 'coming_soon': return 'warning'
    case 'deprecated': return 'info'
    default: return 'info'
  }
}

function getFeatureStatusLabel(status: string) {
  switch (status) {
    case 'active': return '已启用'
    case 'coming_soon': return '即将推出'
    case 'deprecated': return '已废弃'
    default: return status
  }
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.module-devtools {
  padding: 20px;
  height: 100%;
  background-color: #f5f7fa;
}

.content-wrapper {
  display: flex;
  gap: 16px;
  margin-top: 20px;
  height: calc(100vh - 140px);
}

/* 左侧模块列表 */
.module-list-section {
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e4e7ed;
}

.module-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.module-item.is-active {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.module-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-code {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.module-status {
  flex-shrink: 0;
}

/* 右侧模块详情 */
.module-detail-section {
  flex: 1;
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.color-preview {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.config-viewer {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 响应式 */
@media (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
    height: auto;
  }

  .module-list-section {
    width: 100%;
  }
}
</style>
