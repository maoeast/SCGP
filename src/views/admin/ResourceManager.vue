<!--
  ⚠️ DEPRECATED: 此文件已废弃

  该组件已被重构并迁移至新的资源中心架构：
  - 主入口: src/views/admin/ResourceCenter.vue
  - 训练资源 Tab: src/views/resource-center/TrainingResources.vue
  - 教学资料 Tab: src/views/resource-center/TeachingMaterials.vue

  路由已重定向: /admin/resources -> /resource-center

  保留此文件仅用于向后兼容，请勿再使用。
  重构日期: 2026-02-22
-->
<template>
  <div class="resource-manager">
    <!-- 左侧筛选面板 -->
    <div class="filter-panel">
      <div class="filter-header">
        <el-icon><Filter /></el-icon>
        <span>筛选条件</span>
      </div>

      <!-- 搜索框 -->
      <div class="filter-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索资源名称..."
          clearable
          :prefix-icon="Search"
          @input="handleSearchDebounced"
        />
      </div>

      <!-- 业务模块 -->
      <div class="filter-section">
        <div class="section-title">业务模块</div>
        <el-radio-group v-model="selectedModule" @change="handleFilterChange">
          <el-radio-button
            v-for="module in availableModules"
            :key="module.code"
            :value="module.code"
          >
            {{ module.name }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 资源类型 -->
      <div class="filter-section">
        <div class="section-title">资源类型</div>
        <el-radio-group v-model="selectedType" @change="handleFilterChange">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button
            v-for="type in resourceTypes"
            :key="type.code"
            :value="type.code"
          >
            {{ type.name }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 状态筛选 -->
      <div class="filter-section">
        <div class="section-title">状态筛选</div>
        <el-checkbox-group v-model="selectedStatus" @change="handleFilterChange">
          <el-checkbox value="active">启用中</el-checkbox>
          <el-checkbox value="disabled">已禁用</el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 统计信息 -->
      <div class="filter-footer">
        <el-divider />
        <div class="stats-info">
          <span>共 <strong>{{ totalResources }}</strong> 条资源</span>
          <span class="stats-detail">
            系统: {{ systemCount }} | 自定义: {{ customCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>资源管理</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" :icon="Plus" @click="handleCreate">
            新建资源
          </el-button>
        </div>
      </div>

      <!-- 资源列表 -->
      <el-table
        :data="filteredResources"
        v-loading="loading"
        stripe
        highlight-current-row
        @row-click="handleRowClick"
        class="resource-table"
      >
        <!-- 缩略图列 -->
        <el-table-column label="封面" width="80" align="center">
          <template #default="{ row }">
            <div class="thumbnail-cell" @click.stop="handlePreviewImage(row)">
              <!-- 器材类 - 显示实际图片 -->
              <el-image
                v-if="row.resourceType === 'equipment' && getThumbnailUrl(row)"
                :src="getThumbnailUrl(row)"
                fit="cover"
                class="thumbnail-img"
                :preview-src-list="[getThumbnailUrl(row)]"
                :hide-on-click-modal="true"
              >
                <template #error>
                  <div class="thumbnail-placeholder">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <!-- 其他类型 - 显示图标 -->
              <div v-else class="thumbnail-icon" :class="getTypeIconClass(row.resourceType)">
                <el-icon :size="24">
                  <component :is="getTypeIcon(row.resourceType)" />
                </el-icon>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 资源名称 -->
        <el-table-column label="资源名称" min-width="180">
          <template #default="{ row }">
            <div class="name-cell">
              <span class="resource-name">{{ row.name }}</span>
              <span v-if="row.description" class="resource-desc">{{ row.description }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 分类 -->
        <el-table-column label="分类" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 来源 -->
        <el-table-column label="来源" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.isCustom ? 'success' : 'info'"
              size="small"
              effect="light"
            >
              <el-icon v-if="!row.isCustom" class="tag-icon"><Lock /></el-icon>
              <el-icon v-else class="tag-icon"><Star /></el-icon>
              {{ row.isCustom ? '自定义' : '系统' }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 状态开关 -->
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.isActive"
              @change="(val: boolean) => handleStatusChange(row, val)"
              :loading="row.statusLoading"
              size="small"
            />
          </template>
        </el-table-column>

        <!-- 标签 -->
        <el-table-column label="标签" min-width="150">
          <template #default="{ row }">
            <div class="tags-cell">
              <el-tag
                v-for="tag in row.tags.slice(0, 3)"
                :key="tag"
                size="small"
                type="warning"
                effect="plain"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
              <el-tag
                v-if="row.tags.length > 3"
                size="small"
                type="info"
                effect="plain"
              >
                +{{ row.tags.length - 3 }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-cell">
              <el-button
                type="primary"
                link
                :icon="Edit"
                @click.stop="handleEdit(row)"
              >
                编辑
              </el-button>
              <!-- 根据状态显示删除/恢复按钮 -->
              <el-button
                v-if="row.isActive"
                type="danger"
                link
                :icon="Delete"
                :disabled="!row.isCustom"
                @click.stop="handleDelete(row)"
              >
                <el-tooltip
                  v-if="!row.isCustom"
                  content="系统预置资源不可删除，仅支持编辑描述和标签"
                  placement="top"
                >
                  <span>删除</span>
                </el-tooltip>
                <span v-else>删除</span>
              </el-button>
              <el-button
                v-else
                type="success"
                link
                :icon="RefreshRight"
                @click.stop="handleRestore(row)"
              >
                恢复
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalResources"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editingResource?.isCustom ? '编辑资源' : '编辑资源（系统预置）'"
      width="600px"
      :close-on-click-modal="false"
      @closed="resetEditForm"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <!-- 封面预览 -->
        <el-form-item label="封面图片">
          <div class="cover-preview">
            <div class="preview-image" v-if="getThumbnailUrl(editingResource)">
              <el-image
                :src="getThumbnailUrl(editingResource)"
                fit="contain"
                class="preview-img"
                :preview-src-list="[getThumbnailUrl(editingResource)]"
              />
            </div>
            <div v-else class="preview-placeholder">
              <el-icon :size="48"><Picture /></el-icon>
              <span>暂无封面</span>
            </div>
            <el-button
              v-if="editingResource?.isCustom"
              type="primary"
              link
              :icon="Upload"
              class="upload-btn"
            >
              更换封面
            </el-button>
          </div>
        </el-form-item>

        <!-- 资源名称 -->
        <el-form-item label="资源名称" prop="name">
          <el-input
            v-model="editForm.name"
            :disabled="!editingResource?.isCustom"
            :placeholder="editingResource?.isCustom ? '请输入资源名称' : '系统资源名称不可修改'"
          >
            <template #suffix v-if="!editingResource?.isCustom">
              <el-icon class="lock-icon"><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <!-- 所属分类 -->
        <el-form-item label="所属分类" prop="category">
          <el-select
            v-model="editForm.category"
            :disabled="!editingResource?.isCustom"
            placeholder="请选择分类"
            style="width: 100%"
          >
            <el-option
              v-for="cat in categoryOptions"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>

        <!-- 详细描述 -->
        <el-form-item label="详细描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入资源描述"
          />
        </el-form-item>

        <!-- 能力标签 -->
        <el-form-item label="能力标签">
          <div class="tags-editor">
            <div class="selected-tags">
              <el-tag
                v-for="tag in editForm.tags"
                :key="tag"
                closable
                type="warning"
                @close="removeTag(tag)"
                class="selected-tag"
              >
                {{ tag }}
              </el-tag>
              <span v-if="editForm.tags.length === 0" class="no-tags">
                暂无标签
              </span>
            </div>
            <div class="tag-input-row">
              <el-select
                v-model="newTag"
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入标签"
                style="width: 200px"
                @change="addTag"
              >
                <el-option
                  v-for="tag in availableTags.filter(t => !editForm.tags.includes(t))"
                  :key="tag"
                  :label="tag"
                  :value="tag"
                />
              </el-select>
            </div>
            <div class="suggested-tags">
              <span class="suggest-label">常用标签：</span>
              <el-tag
                v-for="tag in getSuggestedTags().filter(t => !editForm.tags.includes(t))"
                :key="tag"
                size="small"
                effect="plain"
                class="suggest-tag"
                @click="addTag(tag)"
              >
                + {{ tag }}
              </el-tag>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveEdit" :loading="saving">
          保存修改
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="400px"
    >
      <div class="delete-confirm">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <p>确定要删除资源 <strong>"{{ deletingResource?.name }}"</strong> 吗？</p>
        <p class="delete-hint">此操作将禁用该资源，可在筛选"已禁用"后恢复。</p>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete" :loading="deleting">
          确认删除
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Filter, Search, Plus, Edit, Delete, RefreshRight,
  Picture, Lock, Star, Upload, WarningFilled,
  Document, VideoPlay, FolderOpened, Box, Files
} from '@element-plus/icons-vue'
import { ResourceAPI } from '@/database/resource-api'
import type { ResourceItem, ModuleCode } from '@/types/module'
import { getEquipmentImageUrl } from '@/assets/images/equipment/images'

// ========== 数据定义 ==========

// 可用模块列表
const availableModules = [
  { code: 'sensory', name: '感官训练' },
  { code: 'emotional', name: '情绪调节' },
  { code: 'social', name: '社交沟通' },
  { code: 'life_skills', name: '生活自理' },
  { code: 'cognitive', name: '认知训练' }
]

// 资源类型列表
const resourceTypes = [
  { code: 'equipment', name: '器材' },
  { code: 'document', name: '文档' },
  { code: 'video', name: '视频' },
  { code: 'flashcard', name: '闪卡' }
]

// 分类映射
const CATEGORY_LABELS: Record<string, string> = {
  tactile: '触觉',
  vestibular: '前庭觉',
  proprioceptive: '本体觉',
  visual: '视觉',
  auditory: '听觉',
  olfactory: '嗅觉',
  gustatory: '味觉',
  oral: '口腔',
  praxis: '动作计划',
  bilateralmotor: '双侧协调',
  selfcare: '生活自理',
  mobility: '移动能力',
  communication: '沟通能力',
  cognition: '认知能力',
  social: '社交能力',
  emotional: '情绪管理'
}

// ========== 响应式状态 ==========

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)

// 筛选状态
const searchKeyword = ref('')
const selectedModule = ref('sensory')
const selectedType = ref('')
const selectedStatus = ref<string[]>(['active'])
const currentPage = ref(1)
const pageSize = ref(20)

// 资源列表
const allResources = ref<ResourceItem[]>([])
const availableTags = ref<string[]>([])

// 编辑状态
const editDialogVisible = ref(false)
const editingResource = ref<ResourceItem | null>(null)
const editFormRef = ref<FormInstance>()
const editForm = reactive({
  name: '',
  category: '',
  description: '',
  tags: [] as string[]
})
const newTag = ref('')

// 删除状态
const deleteDialogVisible = ref(false)
const deletingResource = ref<ResourceItem | null>(null)

// ========== 计算属性 ==========

// 筛选后的资源列表
const filteredResources = computed(() => {
  let result = allResources.value

  // 状态筛选
  if (selectedStatus.value.includes('active') && !selectedStatus.value.includes('disabled')) {
    result = result.filter(r => r.isActive)
  } else if (!selectedStatus.value.includes('active') && selectedStatus.value.includes('disabled')) {
    result = result.filter(r => !r.isActive)
  }

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value

  return result.slice(start, end)
})

// 总资源数
const totalResources = computed(() => allResources.value.length)

// 系统资源数
const systemCount = computed(() => allResources.value.filter(r => !r.isCustom).length)

// 自定义资源数
const customCount = computed(() => allResources.value.filter(r => r.isCustom).length)

// 分类选项
const categoryOptions = computed(() => {
  return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label
  }))
})

// 编辑表单校验规则
const editRules: FormRules = {
  name: [
    { required: true, message: '请输入资源名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称长度 2-50 个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ]
}

// ========== 工具方法 ==========

// 获取缩略图 URL
function getThumbnailUrl(resource: ResourceItem | null): string {
  if (!resource) return ''

  // 器材类资源使用 legacy_id 加载图片
  if (resource.resourceType === 'equipment') {
    const legacyId = resource.legacyId
    if (legacyId) {
      const category = resource.category || 'tactile'
      return getEquipmentImageUrl(category as any, legacyId, resource.name)
    }
  }

  // 其他资源使用 cover_image
  if (resource.coverImage) {
    return resource.coverImage
  }

  return ''
}

// 获取资源类型图标
function getTypeIcon(type: string) {
  const iconMap: Record<string, any> = {
    equipment: Box,
    document: Document,
    video: VideoPlay,
    flashcard: Picture,
    default: Files
  }
  return iconMap[type] || iconMap.default
}

// 获取资源类型图标样式类
function getTypeIconClass(type: string) {
  const classMap: Record<string, string> = {
    equipment: 'type-equipment',
    document: 'type-document',
    video: 'type-video',
    flashcard: 'type-flashcard',
    default: 'type-default'
  }
  return classMap[type] || classMap.default
}

// 获取分类标签
function getCategoryLabel(category: string | undefined): string {
  if (!category) return '未分类'
  return CATEGORY_LABELS[category] || category
}

// 获取建议标签
function getSuggestedTags(): string[] {
  const commonTags = [
    '手眼协调', '平衡能力', '注意力', '精细动作',
    '大运动', '触觉感知', '视觉追踪', '听觉辨别'
  ]
  return commonTags
}

// 防抖搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null
function handleSearchDebounced() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadResources()
  }, 300)
}

// ========== 数据加载 ==========

// 加载资源列表
async function loadResources() {
  loading.value = true
  try {
    const api = new ResourceAPI()

    // 构建查询选项
    const options: any = {
      moduleCode: selectedModule.value as ModuleCode
    }

    if (selectedType.value) {
      options.resourceType = selectedType.value
    }

    if (searchKeyword.value) {
      options.keyword = searchKeyword.value
    }

    // 使用管理专用方法查询所有资源（包括禁用的）
    const resources = api.getAllResourcesForAdmin(options)

    allResources.value = resources

    // 加载可用标签
    loadAvailableTags()

    console.log(`[ResourceManager] 加载资源成功: ${resources.length} 条`)
  } catch (error) {
    console.error('[ResourceManager] 加载资源失败:', error)
    ElMessage.error('加载资源失败')
  } finally {
    loading.value = false
  }
}

// 加载可用标签
function loadAvailableTags() {
  try {
    const api = new ResourceAPI()
    // 从数据库获取所有标签
    const result = api.query(`
      SELECT DISTINCT t.name
      FROM sys_tags t
      WHERE t.domain = 'ability'
      ORDER BY t.usage_count DESC
      LIMIT 50
    `, [])

    availableTags.value = result.map((row: any) => row.name)
  } catch (error) {
    console.error('[ResourceManager] 加载标签失败:', error)
  }
}

// ========== 事件处理 ==========

// 筛选条件变化
function handleFilterChange() {
  currentPage.value = 1
  loadResources()
}

// 分页变化
function handlePageChange(page: number) {
  currentPage.value = page
}

// 每页数量变化
function handlePageSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
}

// 行点击
function handleRowClick(row: ResourceItem) {
  console.log('[ResourceManager] 行点击:', row.name)
}

// 图片预览
function handlePreviewImage(row: ResourceItem) {
  if (row.resourceType !== 'equipment') return
  // el-image 组件自带预览功能
}

// 状态切换
async function handleStatusChange(resource: ResourceItem, active: boolean) {
  resource.statusLoading = true
  try {
    const api = new ResourceAPI()

    if (active) {
      api.restoreResource(resource.id)
      ElMessage.success(`已启用: ${resource.name}`)
    } else {
      api.deleteResource(resource.id)
      ElMessage.success(`已禁用: ${resource.name}`)
    }

    // 更新本地状态
    resource.isActive = active
  } catch (error) {
    console.error('[ResourceManager] 状态切换失败:', error)
    ElMessage.error('状态切换失败')
    // 回滚状态
    resource.isActive = !active
  } finally {
    resource.statusLoading = false
  }
}

// 新建资源
function handleCreate() {
  ElMessage.info('新建资源功能开发中...')
  // TODO: 实现新建资源弹窗
}

// 编辑资源
function handleEdit(resource: ResourceItem) {
  editingResource.value = resource
  editForm.name = resource.name
  editForm.category = resource.category || ''
  editForm.description = resource.description || ''
  editForm.tags = [...(resource.tags || [])]
  editDialogVisible.value = true
}

// 保存编辑
async function handleSaveEdit() {
  if (!editFormRef.value) return

  try {
    await editFormRef.value.validate()
  } catch {
    return
  }

  if (!editingResource.value) return

  saving.value = true
  try {
    const api = new ResourceAPI()

    // 根据是否为自定义资源决定更新哪些字段
    const updateData: any = {
      description: editForm.description,
      tags: editForm.tags
    }

    // 自定义资源可以更新名称和分类
    if (editingResource.value.isCustom) {
      updateData.name = editForm.name
      updateData.category = editForm.category
    }

    const success = api.updateResource(editingResource.value.id, updateData)

    if (success) {
      // 更新本地数据
      const index = allResources.value.findIndex(r => r.id === editingResource.value!.id)
      if (index !== -1) {
        allResources.value[index] = {
          ...allResources.value[index],
          name: editForm.name,
          category: editForm.category,
          description: editForm.description,
          tags: editForm.tags
        }
      }

      ElMessage.success('保存成功')
      editDialogVisible.value = false
    }
  } catch (error) {
    console.error('[ResourceManager] 保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 重置编辑表单
function resetEditForm() {
  editForm.name = ''
  editForm.category = ''
  editForm.description = ''
  editForm.tags = []
  editingResource.value = null
}

// 添加标签
function addTag(tag: string) {
  if (!tag || editForm.tags.includes(tag)) {
    newTag.value = ''
    return
  }
  editForm.tags.push(tag)
  newTag.value = ''
}

// 移除标签
function removeTag(tag: string) {
  const index = editForm.tags.indexOf(tag)
  if (index !== -1) {
    editForm.tags.splice(index, 1)
  }
}

// 删除资源
function handleDelete(resource: ResourceItem) {
  if (!resource.isCustom) {
    ElMessage.warning('系统预置资源不可删除')
    return
  }
  deletingResource.value = resource
  deleteDialogVisible.value = true
}

// 确认删除
async function confirmDelete() {
  if (!deletingResource.value) return

  deleting.value = true
  try {
    const api = new ResourceAPI()
    const success = api.deleteResource(deletingResource.value.id)

    if (success) {
      // 更新本地状态
      const index = allResources.value.findIndex(r => r.id === deletingResource.value!.id)
      if (index !== -1) {
        allResources.value[index].isActive = false
      }

      ElMessage.success('删除成功')
      deleteDialogVisible.value = false
    }
  } catch (error) {
    console.error('[ResourceManager] 删除失败:', error)
    ElMessage.error('删除失败')
  } finally {
    deleting.value = false
  }
}

// 恢复资源
async function handleRestore(resource: ResourceItem) {
  try {
    const api = new ResourceAPI()
    const success = api.restoreResource(resource.id)

    if (success) {
      // 更新本地状态
      resource.isActive = true
      ElMessage.success(`已恢复: ${resource.name}`)
    }
  } catch (error) {
    console.error('[ResourceManager] 恢复失败:', error)
    ElMessage.error('恢复失败')
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  loadResources()
})
</script>

<style scoped>
.resource-manager {
  display: flex;
  height: calc(100vh - 120px);
  background: #f5f7fa;
  gap: 16px;
}

/* 左侧筛选面板 */
.filter-panel {
  width: 240px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.filter-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 10px;
}

.filter-section :deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-section :deep(.el-radio-button) {
  margin: 0;
}

.filter-section :deep(.el-radio-button__inner) {
  border-radius: 4px !important;
  border: 1px solid #dcdfe6 !important;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
}

.filter-section :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #409eff;
  border-color: #409eff;
  box-shadow: none;
}

.filter-section :deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-footer {
  margin-top: auto;
}

.stats-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.stats-detail {
  font-size: 12px;
  color: #909399;
}

/* 主内容区 */
.main-content {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

/* 资源表格 */
.resource-table {
  flex: 1;
  overflow: auto;
}

.thumbnail-cell {
  width: 64px;
  height: 64px;
  cursor: pointer;
}

.thumbnail-img {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  border-radius: 6px;
  color: #c0c4cc;
}

.thumbnail-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.type-equipment {
  background: #ecf5ff;
  color: #409eff;
}

.type-document {
  background: #fdf6ec;
  color: #e6a23c;
}

.type-video {
  background: #f4ecff;
  color: #a855f7;
}

.type-flashcard {
  background: #edf7f2;
  color: #67c23a;
}

.type-default {
  background: #f0f2f5;
  color: #909399;
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-name {
  font-weight: 500;
  color: #303133;
}

.resource-desc {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.tag-icon {
  margin-right: 4px;
  font-size: 12px;
}

.tags-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-item {
  margin: 0;
}

.action-cell {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  margin-top: 16px;
}

/* 编辑弹窗 */
.cover-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}

.preview-img {
  width: 100%;
  height: 100%;
}

.preview-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px dashed #dcdfe6;
  color: #c0c4cc;
  gap: 8px;
}

.upload-btn {
  margin-top: 4px;
}

.lock-icon {
  color: #909399;
}

.tags-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.selected-tag {
  margin: 0;
}

.no-tags {
  color: #c0c4cc;
  font-size: 13px;
}

.tag-input-row {
  display: flex;
  gap: 8px;
}

.suggested-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.suggest-label {
  font-size: 12px;
  color: #909399;
}

.suggest-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.suggest-tag:hover {
  background: #e6a23c;
  color: white;
  border-color: #e6a23c;
}

/* 删除确认弹窗 */
.delete-confirm {
  text-align: center;
  padding: 20px 0;
}

.warning-icon {
  font-size: 48px;
  color: #e6a23c;
  margin-bottom: 16px;
}

.delete-hint {
  font-size: 13px;
  color: #909399;
  margin-top: 8px;
}
</style>
