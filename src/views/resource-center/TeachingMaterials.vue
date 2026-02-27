<template>
  <div class="teaching-materials">
    <!-- 左侧分类侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <el-icon><FolderOpened /></el-icon>
        <span>资源分类</span>
      </div>

      <div class="category-list">
        <div
          class="category-item"
          :class="{ active: resourceStore.currentCategory === null }"
          @click="selectCategory(null)"
        >
          <el-icon><Folder /></el-icon>
          <span>全部资源</span>
          <span class="count">({{ resourceStore.resources.length }})</span>
        </div>
        <div
          v-for="category in resourceStore.categories"
          :key="category.id"
          class="category-item"
          :class="{ active: resourceStore.currentCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          <el-icon :style="{ color: category.color }">
            <component :is="getCategoryIcon(category.icon)" />
          </el-icon>
          <span>{{ category.name }}</span>
          <span class="count">
            ({{ getResourceCountByCategory(category.id) }})
          </span>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="resourceStore.searchKeyword"
            placeholder="搜索资源..."
            clearable
            :prefix-icon="Search"
            style="width: 280px"
            @input="handleSearch"
          />
          <el-button
            :type="resourceStore.showFavoritesOnly ? 'warning' : 'default'"
            :icon="Star"
            @click="resourceStore.toggleFavoritesView"
          >
            {{ resourceStore.showFavoritesOnly ? '全部资源' : '我的收藏' }}
          </el-button>
        </div>
        <div class="toolbar-right" v-if="!readOnly">
          <el-button type="primary" :icon="Upload" @click="showUploadDialog = true">
            上传资源
          </el-button>
          <el-button :icon="Download" @click="showBatchImportDialog = true">
            批量导入
          </el-button>
        </div>
      </div>

      <!-- 分类标题 -->
      <div class="content-header">
        <h3>{{ resourceStore.currentCategoryName }}</h3>
        <p v-if="resourceStore.currentCategory">
          {{ getCategoryDescription(resourceStore.currentCategory) }}
        </p>
      </div>

      <!-- 加载状态 -->
      <div v-if="resourceStore.isLoading" class="loading-state">
        <el-icon class="is-loading" :size="48"><Loading /></el-icon>
        <p>加载中...</p>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="resourceStore.error" class="error-state">
        <el-icon :size="48"><WarningFilled /></el-icon>
        <p>{{ resourceStore.error }}</p>
        <el-button type="primary" @click="resourceStore.clearError()">关闭</el-button>
      </div>

      <!-- 资源列表 -->
      <div v-else-if="filteredResources.length > 0" class="resource-list">
        <div
          v-for="resource in filteredResources"
          :key="resource.id"
          class="resource-card"
          @click="openResource(resource)"
        >
          <div class="resource-icon">
            <el-icon :size="24" :style="{ color: getFileIconColor(resource.type) }">
              <component :is="getFileIcon(resource.type)" />
            </el-icon>
          </div>
          <div class="resource-info">
            <h4>{{ resource.title }}</h4>
            <p class="description">{{ resource.description || '暂无描述' }}</p>
            <div class="resource-meta">
              <span class="type">{{ resource.type.toUpperCase() }}</span>
              <span class="size">{{ formatFileSize(resource.size_kb) }}</span>
              <span class="date">{{ formatDate(resource.updated_at) }}</span>
            </div>
            <div v-if="resource.tags" class="tags">
              <el-tag
                v-for="tag in resource.tags.split(',')"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          <div class="resource-actions" @click.stop>
            <el-button
              :type="resource.is_favorite ? 'warning' : 'default'"
              circle
              size="small"
              @click="toggleFavorite(resource)"
              :title="resource.is_favorite ? '取消收藏' : '收藏'"
            >
              <el-icon><Star /></el-icon>
            </el-button>
            <el-button
              type="primary"
              circle
              size="small"
              @click="openResource(resource)"
              title="预览"
            >
              <el-icon><View /></el-icon>
            </el-button>
            <el-button
              type="success"
              circle
              size="small"
              @click="showResourceDetail(resource)"
              title="详情"
            >
              <el-icon><InfoFilled /></el-icon>
            </el-button>
            <el-button
              v-if="!readOnly"
              type="danger"
              circle
              size="small"
              @click="deleteResource(resource)"
              title="删除"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-icon :size="64"><FolderOpened /></el-icon>
        <h3>暂无资源</h3>
        <p>该分类下还没有资源{{ readOnly ? '' : '，点击"上传资源"添加第一个资源' }}</p>
        <el-button
          v-if="!readOnly"
          type="primary"
          :icon="Upload"
          @click="showUploadDialog = true"
        >
          上传资源
        </el-button>
      </div>
    </div>

    <!-- 上传资源对话框 - 仅非只读模式 -->
    <el-dialog
      v-if="!readOnly"
      v-model="showUploadDialog"
      title="上传资源"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="资源标题" required>
          <el-input
            v-model="uploadForm.title"
            placeholder="请输入资源标题"
          />
        </el-form-item>
        <el-form-item label="资源分类" required>
          <el-select v-model="uploadForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="category in resourceStore.categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资源文件" required>
          <input
            type="file"
            @change="handleFileSelect"
            style="width: 100%"
          />
          <p v-if="selectedFile" class="file-info">
            已选择: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size / 1024) }})
          </p>
        </el-form-item>
        <el-form-item label="标签">
          <el-input
            v-model="uploadForm.tags"
            placeholder="多个标签用逗号分隔"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入资源描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpload" :disabled="!canUpload">
          上传
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 - 仅非只读模式 -->
    <el-dialog
      v-if="!readOnly"
      v-model="showBatchImportDialog"
      title="批量导入资源"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="batch-import-content">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          <template #title>
            <strong>导入说明</strong>
          </template>
          <ol style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>请下载CSV模板文件，按照格式填写资源信息</li>
            <li>将资源文件放置在 assets/resources/ 对应的文件夹中</li>
            <li>上传填写好的CSV文件进行批量导入</li>
          </ol>
        </el-alert>

        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <el-button type="primary" :icon="Download" @click="downloadTemplate">
            下载CSV模板
          </el-button>
          <el-button :icon="MagicStick" @click="importSampleData">
            导入示例数据
          </el-button>
        </div>

        <el-form-item label="CSV文件">
          <input
            type="file"
            accept=".csv"
            @change="handleCsvChange"
            ref="csvInput"
            style="width: 100%"
          />
          <p v-if="csvFile" class="file-info">
            已选择: {{ csvFile.name }} ({{ formatFileSize(csvFile.size / 1024) }})
          </p>
        </el-form-item>

        <!-- 导入结果显示 -->
        <div v-if="batchImportResult" class="import-result">
          <h4>导入结果</h4>
          <div class="result-summary" :class="{ 'has-errors': batchImportResult.errors.length > 0 }">
            <p><strong>成功导入：</strong>{{ batchImportResult.success }} 个资源</p>
            <p><strong>导入失败：</strong>{{ batchImportResult.failed }} 个资源</p>
          </div>
          <div v-if="batchImportResult.errors.length > 0" class="error-details">
            <el-collapse>
              <el-collapse-item title="错误详情" name="errors">
                <ul class="error-list">
                  <li v-for="(error, index) in batchImportResult.errors.slice(0, 20)" :key="index">
                    {{ error }}
                  </li>
                  <li v-if="batchImportResult.errors.length > 20">
                    ... 还有 {{ batchImportResult.errors.length - 20 }} 个错误
                  </li>
                </ul>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBatchImportDialog = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="!csvFile || isImporting"
          :loading="isImporting"
          @click="handleBatchImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 资源详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="资源详情"
      width="600px"
      v-if="selectedResource"
    >
      <div class="detail-content">
        <div class="detail-icon">
          <el-icon :size="40" :style="{ color: getFileIconColor(selectedResource.type) }">
            <component :is="getFileIcon(selectedResource.type)" />
          </el-icon>
        </div>
        <div class="detail-info">
          <h4>{{ selectedResource.title }}</h4>
          <p class="description">{{ selectedResource.description || '暂无描述' }}</p>
          <div class="detail-meta">
            <div class="meta-item">
              <label>文件类型:</label>
              <span>{{ selectedResource.type.toUpperCase() }}</span>
            </div>
            <div class="meta-item">
              <label>文件大小:</label>
              <span>{{ formatFileSize(selectedResource.size_kb) }}</span>
            </div>
            <div class="meta-item">
              <label>所属分类:</label>
              <span>{{ getCategoryName(selectedResource.category) }}</span>
            </div>
            <div class="meta-item">
              <label>上传时间:</label>
              <span>{{ formatDate(selectedResource.created_at) }}</span>
            </div>
            <div class="meta-item">
              <label>更新时间:</label>
              <span>{{ formatDate(selectedResource.updated_at) }}</span>
            </div>
            <div v-if="selectedResource.tags" class="meta-item">
              <label>标签:</label>
              <div class="tags">
                <el-tag
                  v-for="tag in selectedResource.tags.split(',')"
                  :key="tag"
                  size="small"
                  type="info"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button type="primary" @click="openResource(selectedResource)">
          打开资源
        </el-button>
      </template>
    </el-dialog>

    <!-- 文件预览对话框 - 关键组件，必须保留 -->
    <FilePreview
      :show="showPreviewDialog"
      :file="previewFile"
      @close="closePreview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FolderOpened, Folder, Search, Star, Upload, Download,
  View, InfoFilled, Delete, Loading, WarningFilled, MagicStick,
  Document, VideoPlay, Headset, Picture, Files
} from '@element-plus/icons-vue'
import { useResourceStore } from '@/stores/resource'
import { resourceImporter } from '@/utils/resource-importer'
import { formatFileSize as formatFileSizeUtil } from '@/database/resource-data'
import FilePreview from '@/components/FilePreview.vue'

// ========== Props ==========
interface Props {
  readOnly?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  readOnly: false
})

// ========== 状态 ==========
const resourceStore = useResourceStore()

// 对话框状态
const showUploadDialog = ref(false)
const showDetailDialog = ref(false)
const showBatchImportDialog = ref(false)
const showPreviewDialog = ref(false)

// 选中状态
const selectedResource = ref<any>(null)
const selectedFile = ref<File | null>(null)
const previewFile = ref<any>(null)

// 批量导入状态
const csvFile = ref<File | null>(null)
const csvInput = ref<HTMLInputElement>()
const batchImportResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)
const isImporting = ref(false)

// 上传表单
const uploadForm = ref({
  title: '',
  category: 0,
  tags: '',
  description: ''
})

// ========== 计算属性 ==========
const filteredResources = computed(() => resourceStore.filteredResources)

const canUpload = computed(() => {
  return uploadForm.value.title &&
         uploadForm.value.category !== undefined &&
         uploadForm.value.category !== null &&
         selectedFile.value
})

// ========== 工具方法 ==========

// 格式化文件大小
function formatFileSize(size: number): string {
  return formatFileSizeUtil(size)
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 获取文件图标
function getFileIcon(type: string) {
  const iconMap: Record<string, any> = {
    pdf: Document,
    doc: Document,
    docx: Document,
    xls: Document,
    xlsx: Document,
    ppt: Document,
    pptx: Document,
    mp4: VideoPlay,
    avi: VideoPlay,
    mov: VideoPlay,
    mp3: Headset,
    wav: Headset,
    jpg: Picture,
    jpeg: Picture,
    png: Picture,
    gif: Picture,
    default: Files
  }
  return iconMap[type.toLowerCase()] || iconMap.default
}

// 获取文件图标颜色
function getFileIconColor(type: string): string {
  const colorMap: Record<string, string> = {
    pdf: '#e74c3c',
    doc: '#2196F3',
    docx: '#2196F3',
    xls: '#4CAF50',
    xlsx: '#4CAF50',
    ppt: '#ff5722',
    pptx: '#ff5722',
    mp4: '#9c27b0',
    avi: '#9c27b0',
    mov: '#9c27b0',
    mp3: '#ff9800',
    wav: '#ff9800',
    jpg: '#00bcd4',
    jpeg: '#00bcd4',
    png: '#00bcd4',
    gif: '#00bcd4',
    default: '#607d8b'
  }
  return colorMap[type.toLowerCase()] || colorMap.default
}

// 获取分类图标
function getCategoryIcon(icon: string): any {
  const iconMap: Record<string, any> = {
    'folder': Folder,
    'file': Document,
    'video': VideoPlay,
    'music': Headset,
    'image': Picture,
    'default': Folder
  }
  return iconMap[icon] || iconMap.default
}

// ========== 分类与搜索 ==========

function selectCategory(categoryId: number | null) {
  resourceStore.setCategory(categoryId)
}

function handleSearch(e: Event) {
  const target = e.target as HTMLInputElement
  resourceStore.setSearchKeyword(target.value)
}

function getResourceCountByCategory(categoryId: number): number {
  return resourceStore.resources.filter(r => r.category === categoryId).length
}

function getCategoryDescription(categoryId: number): string {
  const category = resourceStore.categories.find(c => c.id === categoryId)
  return category ? category.description : ''
}

function getCategoryName(categoryId: number): string {
  const category = resourceStore.categories.find(c => c.id === categoryId)
  return category ? category.name : '未知分类'
}

// ========== 上传处理 ==========

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    // 自动填充标题
    if (!uploadForm.value.title) {
      uploadForm.value.title = selectedFile.value.name.replace(/\.[^/.]+$/, '')
    }
  }
}

async function handleUpload() {
  if (!canUpload.value) {
    ElMessage.warning('请填写完整信息并选择文件')
    return
  }

  try {
    // 动态导入 resourceManager
    const managerModule = await import('@/utils/resource-manager')
    const { resourceManager } = managerModule

    // 保存文件到本地文件系统
    const filePath = await resourceManager.saveFile(
      selectedFile.value!,
      uploadForm.value.category
    )

    // 保存资源信息到数据库
    const resource = {
      title: uploadForm.value.title,
      type: selectedFile.value!.name.split('.').pop() || 'unknown',
      category: uploadForm.value.category,
      path: filePath,
      size_kb: Math.round(selectedFile.value!.size / 1024),
      tags: uploadForm.value.tags,
      description: uploadForm.value.description
    }

    const success = await resourceStore.addResource(resource)

    if (success) {
      // 重置表单
      uploadForm.value = {
        title: '',
        category: 0,
        tags: '',
        description: ''
      }
      selectedFile.value = null
      showUploadDialog.value = false
      ElMessage.success('资源上传成功！')
    } else {
      ElMessage.error('资源保存失败，请重试！')
    }
  } catch (error) {
    console.error('[TeachingMaterials] 上传失败:', error)
    ElMessage.error('上传失败，请重试！')
  }
}

// ========== 批量导入 ==========

function handleCsvChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    csvFile.value = target.files[0]
    batchImportResult.value = null
  }
}

async function downloadTemplate() {
  try {
    const templatePath = 'assets/resources/resource-import-template.csv'

    if (window.electronAPI && window.electronAPI.readFile) {
      const content = await window.electronAPI.readFile(templatePath)
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resource-import-template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      // 开发环境，创建示例CSV
      const csvContent = `文件路径,分类ID,标题,标签,描述,大小KB
docs/S-M量表评估指南.pdf,1,S-M量表评估指南,S-M,评估,S-M量表详细评估指南
docs/WeeFIM评估手册.pdf,1,WeeFIM评估手册,WeeFIM,功能独立性,WeeFIM量表的详细评估方法
videos/洗手七步法示范.mp4,2,洗手七步法示范,洗手,卫生示范,标准洗手七步法完整示范视频`

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resource-import-template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('下载模板失败，请重试！')
  }
}

async function importSampleData() {
  try {
    isImporting.value = true
    batchImportResult.value = await resourceImporter.importSampleTemplate()

    if (batchImportResult.value.success > 0) {
      await resourceStore.loadResources()
      ElMessage.success(`成功导入 ${batchImportResult.value.success} 条示例数据`)
    }
  } catch (error) {
    console.error('导入示例数据失败:', error)
    ElMessage.error('导入示例数据失败，请重试！')
  } finally {
    isImporting.value = false
  }
}

async function handleBatchImport() {
  if (!csvFile.value) return

  try {
    isImporting.value = true
    batchImportResult.value = null

    // 读取CSV文件内容
    const text = await csvFile.value.text()

    // 执行导入
    const result = await resourceImporter.importFromCSV(text)
    batchImportResult.value = result

    // 如果有成功导入的资源，刷新资源列表
    if (result.success > 0) {
      await resourceStore.loadResources()
    }

    // 显示友好的提示消息
    if (result.failed === 0) {
      ElMessage.success(`导入成功！成功导入 ${result.success} 条资源记录`)
    } else {
      ElMessage.warning(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
    }

  } catch (error) {
    console.error('批量导入失败:', error)
    ElMessage.error('批量导入失败，请检查文件格式是否正确！')
  } finally {
    isImporting.value = false
  }
}

// ========== 资源操作 ==========

async function openResource(resource: any) {
  // 检查文件类型，决定是预览还是下载
  const type = resource.type.toLowerCase()
  const previewableTypes = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
    'mp4', 'avi', 'mov', 'wmv', 'webm', 'ogg',
    'mp3', 'wav', 'flac', 'aac'
  ]

  if (previewableTypes.includes(type)) {
    // 可预览的文件类型，打开预览对话框
    previewFile.value = resource
    showPreviewDialog.value = true
  } else {
    // 不可预览的文件类型，直接下载或使用系统默认程序打开
    await resourceStore.openResource(resource)
  }
}

function closePreview() {
  showPreviewDialog.value = false
  previewFile.value = null
}

function toggleFavorite(resource: any) {
  resourceStore.toggleFavorite(resource.id)
}

function showResourceDetail(resource: any) {
  selectedResource.value = resource
  showDetailDialog.value = true
}

function deleteResource(resource: any) {
  if (props.readOnly) return

  ElMessageBox.confirm(
    `确定要删除资源"${resource.title}"吗？此操作不可恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const success = resourceStore.deleteResource(resource.id)
    if (success) {
      ElMessage.success('资源已删除')
    } else {
      ElMessage.error('删除失败，请重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// ========== 生命周期 ==========

onMounted(() => {
  resourceStore.init()
})

// 暴露刷新方法给父组件
defineExpose({
  loadResources: () => resourceStore.loadResources()
})
</script>

<style scoped>
.teaching-materials {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  gap: 16px;
}

/* 左侧分类侧边栏 */
.sidebar {
  width: 250px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.sidebar-header {
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

.category-list {
  flex: 1;
  overflow-y: auto;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background: #f0f2f5;
}

.category-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.category-item .el-icon {
  margin-right: 10px;
  width: 16px;
}

.category-item span:nth-child(2) {
  flex: 1;
}

.category-item .count {
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

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-header {
  margin-bottom: 16px;
}

.content-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #303133;
}

.content-header p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

/* 加载与错误状态 */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #909399;
}

.loading-state p,
.error-state p {
  margin-top: 12px;
}

.error-state {
  color: #f56c6c;
}

/* 资源卡片列表 */
.resource-list {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-right: 8px;
}

.resource-card {
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 12px;
}

.resource-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
}

.resource-icon {
  width: 48px;
  height: 48px;
  background: #f0f2f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.resource-info {
  flex: 1;
  min-width: 0;
}

.resource-info h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-info .description {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #909399;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.resource-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #c0c4cc;
  margin-bottom: 8px;
}

.tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.resource-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #909399;
}

.empty-state h3 {
  margin: 16px 0 8px 0;
  font-size: 16px;
  color: #606266;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 13px;
}

/* 文件信息 */
.file-info {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

/* 导入结果 */
.import-result {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin-top: 16px;
}

.import-result h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
}

.result-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 8px;
}

.result-summary p {
  margin: 0;
  font-size: 13px;
}

.result-summary.has-errors {
  color: #e6a23c;
}

.error-details {
  margin-top: 12px;
}

.error-list {
  margin: 0;
  padding-left: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.error-list li {
  color: #f56c6c;
  font-size: 13px;
  margin-bottom: 4px;
}

/* 详情弹窗 */
.detail-content {
  display: flex;
  gap: 20px;
}

.detail-icon {
  width: 80px;
  height: 80px;
  background: #f0f2f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
}

.detail-info h4 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #303133;
}

.detail-info .description {
  margin: 0 0 16px 0;
  color: #606266;
  line-height: 1.6;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.meta-item {
  display: flex;
  gap: 8px;
}

.meta-item label {
  color: #909399;
  min-width: 70px;
}

.meta-item span {
  color: #303133;
}
</style>
