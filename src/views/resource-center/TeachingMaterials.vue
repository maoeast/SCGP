<template>
  <div class="teaching-materials">
    <div class="sidebar">
      <div class="sidebar-header">
        <el-icon><FolderOpened /></el-icon>
        <span>业务维度</span>
      </div>

      <div class="dimension-list">
        <div
          class="dimension-item"
          :class="{ active: materialsStore.currentDimension === null }"
          @click="selectDimension(null)"
        >
          <el-icon><Folder /></el-icon>
          <span>全部资料</span>
          <span class="count">({{ materialsStore.materials.length }})</span>
        </div>

        <div
          v-for="dimension in materialsStore.dimensions"
          :key="dimension"
          class="dimension-item"
          :class="{ active: materialsStore.currentDimension === dimension }"
          @click="selectDimension(dimension)"
        >
          <el-icon><Folder /></el-icon>
          <span>{{ getDimensionLabel(dimension) }}</span>
          <span class="count">({{ getMaterialCountByDimension(dimension) }})</span>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="materialsStore.searchKeyword"
            placeholder="搜索教学资料..."
            clearable
            :prefix-icon="Search"
            style="width: 280px"
            @input="handleSearch"
          />

          <el-button
            :type="materialsStore.showFavoritesOnly ? 'warning' : 'default'"
            :icon="Star"
            @click="materialsStore.toggleFavoritesView"
          >
            {{ materialsStore.showFavoritesOnly ? '全部资料' : '我的收藏' }}
          </el-button>
        </div>

        <div v-if="!readOnly" class="toolbar-right">
          <el-button :icon="FolderOpened" @click="chooseSourceFolder">
            {{ sourceFolderPath ? '更换素材目录' : '选择素材目录' }}
          </el-button>
          <el-button :icon="Download" @click="downloadTemplate">
            下载CSV模板
          </el-button>
          <el-button type="primary" :icon="Upload" @click="showUploadDialog = true">
            上传资料
          </el-button>
          <el-button type="primary" plain :icon="FolderOpened" @click="showBatchImportDialog = true">
            批量导入
          </el-button>
        </div>
      </div>

      <div class="content-header">
        <div>
          <h3>{{ materialsStore.currentDimensionName }}</h3>
          <p>{{ getCurrentDescription() }}</p>
        </div>
        <div v-if="sourceFolderPath" class="source-folder">
          <span class="source-label">素材目录</span>
          <span class="source-path">{{ sourceFolderPath }}</span>
        </div>
      </div>

      <div class="file-category-filter">
        <span class="filter-label">资料类型</span>
        <el-radio-group
          :model-value="materialsStore.currentFileCategory"
          size="small"
          @change="selectFileCategory"
        >
          <el-radio-button
            v-for="category in fileCategoryOptions"
            :key="category"
            :label="category"
          >
            {{ getFileCategoryLabel(category) }} ({{ getMaterialCountByCategory(category) }})
          </el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="materialsStore.isLoading" class="state-panel">
        <el-icon class="is-loading" :size="48"><Loading /></el-icon>
        <p>正在加载教学资料...</p>
      </div>

      <div v-else-if="materialsStore.error" class="state-panel error-state">
        <el-icon :size="48"><WarningFilled /></el-icon>
        <p>{{ materialsStore.error }}</p>
        <el-button type="primary" @click="materialsStore.clearError()">关闭</el-button>
      </div>

      <div v-else-if="filteredMaterials.length > 0" class="material-grid">
        <article
          v-for="material in filteredMaterials"
          :key="material.id"
          class="material-card"
        >
          <div class="material-icon">
            <el-icon :size="28" :style="{ color: getFileIconColor(material.fileType) }">
              <component :is="getFileIcon(material.fileType)" />
            </el-icon>
          </div>

          <div class="material-body">
            <div class="material-top">
              <h4>{{ material.title }}</h4>
              <div class="material-badges">
                <el-tag size="small" effect="plain">
                  {{ getDimensionLabel(material.dimensionCode) }}
                </el-tag>
                <el-tag size="small" type="success" effect="plain">
                  {{ getFileCategoryLabel(resolveFileCategory(material.fileType)) }}
                </el-tag>
              </div>
            </div>

            <p class="description">{{ material.description || '暂无描述' }}</p>

            <div class="meta-row">
              <span>{{ material.fileType.toUpperCase() }}</span>
              <span>{{ formatFileSize(material.fileSizeBytes) }}</span>
              <span>{{ formatDate(material.updatedAt) }}</span>
            </div>

            <div v-if="material.tags.length > 0" class="tags">
              <el-tag
                v-for="tag in material.tags"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>

          <div class="material-actions">
            <el-button
              :type="material.isFavorite ? 'warning' : 'default'"
              circle
              size="small"
              @click="toggleFavorite(material)"
            >
              <el-icon><Star /></el-icon>
            </el-button>
            <el-button
              type="primary"
              circle
              size="small"
              @click="openMaterial(material)"
            >
              <el-icon><View /></el-icon>
            </el-button>
            <el-button
              type="success"
              circle
              size="small"
              @click="showMaterialDetail(material)"
            >
              <el-icon><InfoFilled /></el-icon>
            </el-button>
            <el-button
              v-if="!readOnly"
              type="danger"
              circle
              size="small"
              @click="deleteMaterial(material)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </article>
      </div>

      <div v-else class="state-panel empty-state">
        <el-icon :size="64"><FolderOpened /></el-icon>
        <h3>暂无教学资料</h3>
        <p>{{ getEmptyStateDescription() }}</p>
        <el-button
          v-if="!readOnly"
          type="primary"
          :icon="FolderOpened"
          @click="showBatchImportDialog = true"
        >
          批量导入
        </el-button>
      </div>
    </div>

    <el-dialog
      v-if="!readOnly"
      v-model="showUploadDialog"
      title="上传教学资料"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetUploadForm"
    >
      <el-form :model="uploadForm" label-width="92px">
        <el-form-item label="资料标题" required>
          <el-input v-model="uploadForm.title" placeholder="请输入资料标题" />
        </el-form-item>

        <el-form-item label="业务维度" required>
          <el-select v-model="uploadForm.dimensionCode" placeholder="请选择业务维度" style="width: 100%">
            <el-option
              v-for="dimension in materialsStore.dimensions"
              :key="dimension"
              :label="getDimensionLabel(dimension)"
              :value="dimension"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="资料文件" required>
          <input type="file" @change="handleFileSelect" style="width: 100%" />
          <p v-if="selectedFile" class="file-info">
            已选择：{{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          </p>
        </el-form-item>

        <el-form-item label="标签">
          <el-input v-model="uploadForm.tags" placeholder="多个标签用逗号分隔" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="uploadForm.description" type="textarea" :rows="3" placeholder="请输入资料描述" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!canUpload" @click="handleUpload">上传</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-if="!readOnly"
      v-model="showBatchImportDialog"
      title="批量导入教学资料"
      width="760px"
      :close-on-click-modal="false"
    >
      <div class="batch-import-content">
        <el-alert type="info" :closable="false">
          <template #title>
            <strong>导入规则</strong>
          </template>
          <p>1. 先选择客户交付的素材目录。</p>
          <p>2. 再上传描述文件清单的 CSV。</p>
          <p>3. 系统会先校验文件存在，再复制到受管目录并落库。</p>
          <p>4. 缺失文件不会写入数据库。</p>
        </el-alert>

        <div class="import-toolbar">
          <el-button :icon="FolderOpened" @click="chooseSourceFolder">
            {{ sourceFolderPath ? '更换素材目录' : '选择素材目录' }}
          </el-button>
          <el-button :icon="Download" @click="downloadTemplate">下载CSV模板</el-button>
        </div>

        <div class="selected-source">
          <strong>当前素材目录：</strong>
          <span>{{ sourceFolderPath || '尚未选择' }}</span>
        </div>

        <el-form-item label="CSV 文件">
          <input
            ref="csvInput"
            type="file"
            accept=".csv,text/csv"
            @change="handleCsvChange"
            style="width: 100%"
          />
          <p v-if="csvFile" class="file-info">
            已选择：{{ csvFile.name }} ({{ formatFileSize(csvFile.size) }})
          </p>
        </el-form-item>

        <div v-if="batchImportResult" class="import-result">
          <h4>导入结果</h4>
          <p>成功导入：{{ batchImportResult.success }}</p>
          <p>失败数量：{{ batchImportResult.failed }}</p>

          <div v-if="batchImportResult.errors.length > 0" class="error-list">
            <p v-for="(error, index) in batchImportResult.errors.slice(0, 20)" :key="`${index}-${error}`">
              {{ error }}
            </p>
            <p v-if="batchImportResult.errors.length > 20">
              还有 {{ batchImportResult.errors.length - 20 }} 条错误未展开。
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showBatchImportDialog = false">取消</el-button>
        <el-button
          type="primary"
          :loading="isImporting"
          :disabled="!csvFile || !sourceFolderPath"
          @click="handleBatchImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showDetailDialog"
      title="教学资料详情"
      width="620px"
      v-if="selectedMaterial"
    >
      <div class="detail-content">
        <div class="detail-icon">
          <el-icon :size="42" :style="{ color: getFileIconColor(selectedMaterial.fileType) }">
            <component :is="getFileIcon(selectedMaterial.fileType)" />
          </el-icon>
        </div>

        <div class="detail-body">
          <h4>{{ selectedMaterial.title }}</h4>
          <p class="description">{{ selectedMaterial.description || '暂无描述' }}</p>

          <div class="detail-meta">
            <div class="meta-item">
              <label>业务维度</label>
              <span>{{ getDimensionLabel(selectedMaterial.dimensionCode) }}</span>
            </div>
            <div class="meta-item">
              <label>文件类型</label>
              <span>{{ selectedMaterial.fileType.toUpperCase() }}</span>
            </div>
            <div class="meta-item">
              <label>资料类别</label>
              <span>{{ getFileCategoryLabel(resolveFileCategory(selectedMaterial.fileType)) }}</span>
            </div>
            <div class="meta-item">
              <label>文件大小</label>
              <span>{{ formatFileSize(selectedMaterial.fileSizeBytes) }}</span>
            </div>
            <div class="meta-item">
              <label>更新时间</label>
              <span>{{ formatDate(selectedMaterial.updatedAt) }}</span>
            </div>
            <div class="meta-item meta-item-full">
              <label>受管路径</label>
              <span>{{ selectedMaterial.filePath }}</span>
            </div>
            <div v-if="selectedMaterial.tags.length > 0" class="meta-item meta-item-full">
              <label>标签</label>
              <div class="tags">
                <el-tag
                  v-for="tag in selectedMaterial.tags"
                  :key="tag"
                  size="small"
                  type="info"
                  effect="plain"
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
        <el-button type="primary" @click="openMaterial(selectedMaterial)">打开资料</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Delete,
  Document,
  Download,
  Files,
  Folder,
  FolderOpened,
  Headset,
  InfoFilled,
  Loading,
  Picture,
  Search,
  Star,
  Upload,
  VideoPlay,
  View,
  WarningFilled,
} from '@element-plus/icons-vue'
import { useTeachingMaterialsStore } from '@/stores/teaching-materials'
import { resourceImporter } from '@/utils/resource-importer'
import { teachingMaterialFileManager } from '@/utils/teaching-material-file-manager'
import {
  TEACHING_MATERIAL_FILE_CATEGORY_CODES,
  getTeachingMaterialFileCategoryLabel,
  getTeachingMaterialDimensionLabel,
  resolveTeachingMaterialFileCategory,
  type TeachingMaterialFileCategoryCode,
  type TeachingMaterialDimensionCode,
} from '@/utils/resource-center-business'
import type { TeachingMaterialItem } from '@/database/teaching-materials-api'

interface Props {
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
})

const materialsStore = useTeachingMaterialsStore()
const readOnly = computed(() => props.readOnly)

const filteredMaterials = computed(() => materialsStore.filteredMaterials)
const fileCategoryOptions = TEACHING_MATERIAL_FILE_CATEGORY_CODES
const showUploadDialog = ref(false)
const showBatchImportDialog = ref(false)
const showDetailDialog = ref(false)
const selectedMaterial = ref<TeachingMaterialItem | null>(null)
const selectedFile = ref<File | null>(null)
const csvFile = ref<File | null>(null)
const csvInput = ref<HTMLInputElement>()
const isImporting = ref(false)
const batchImportResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)
const sourceFolderPath = ref(localStorage.getItem('teaching-material-source-folder') || '')

const uploadForm = ref<{
  title: string
  dimensionCode: TeachingMaterialDimensionCode | ''
  tags: string
  description: string
}>({
  title: '',
  dimensionCode: '',
  tags: '',
  description: '',
})

const canUpload = computed(() => {
  return !!uploadForm.value.title.trim()
    && !!uploadForm.value.dimensionCode
    && !!selectedFile.value
})

const DIMENSION_DESCRIPTIONS: Record<TeachingMaterialDimensionCode, string> = {
  'sensory-training': '按感官训练主链组织教案、手册、示范资料。',
  'emotional-regulation': '按情绪调节主链组织教学与支持材料。',
  'social-communication': '按社交沟通主链组织课程与案例资料。',
  'life-skills': '按生活自理主链组织训练步骤和支持材料。',
  'fine-motor': '按精细动作主链组织练习和辅具资料。',
  'soothing-aids': '按安抚教具体系组织使用说明与支持材料。',
}

function getDimensionLabel(dimensionCode: TeachingMaterialDimensionCode): string {
  return getTeachingMaterialDimensionLabel(dimensionCode)
}

function getFileCategoryLabel(categoryCode: TeachingMaterialFileCategoryCode): string {
  return getTeachingMaterialFileCategoryLabel(categoryCode)
}

function resolveFileCategory(fileType: string): Exclude<TeachingMaterialFileCategoryCode, 'all'> {
  return resolveTeachingMaterialFileCategory(fileType)
}

function getCurrentDescription(): string {
  const categorySuffix = materialsStore.currentFileCategory === 'all'
    ? ''
    : ` 当前按${materialsStore.currentFileCategoryName}筛选。`

  if (materialsStore.showFavoritesOnly) {
    return `当前显示收藏教学资料，可继续按资料类型筛选。${categorySuffix}`
  }

  if (!materialsStore.currentDimension) {
    return `教学资料按 6 个业务维度管理，并支持视频、图片、文档等类型筛选。授权仍然回落到真实 moduleCode。${categorySuffix}`
  }

  return `${DIMENSION_DESCRIPTIONS[materialsStore.currentDimension]}${categorySuffix}`
}

function selectDimension(dimensionCode: TeachingMaterialDimensionCode | null) {
  materialsStore.setDimension(dimensionCode)
}

function selectFileCategory(categoryCode: string | number | boolean) {
  materialsStore.setFileCategory(categoryCode as TeachingMaterialFileCategoryCode)
}

function handleSearch(event: Event) {
  const target = event.target as HTMLInputElement
  materialsStore.setSearchKeyword(target.value)
}

function getMaterialCountByDimension(dimensionCode: TeachingMaterialDimensionCode): number {
  return materialsStore.materials.filter((item) => item.dimensionCode === dimensionCode).length
}

function getMaterialCountByCategory(categoryCode: TeachingMaterialFileCategoryCode): number {
  return materialsStore.fileCategoryCounts[categoryCode]
}

function getEmptyStateDescription(): string {
  if (materialsStore.showFavoritesOnly) {
    if (materialsStore.currentFileCategory !== 'all') {
      return `当前还没有收藏的${materialsStore.currentFileCategoryName}资料。`
    }

    return '当前还没有收藏的教学资料。'
  }

  if (materialsStore.currentFileCategory !== 'all') {
    return `当前筛选维度下暂无${materialsStore.currentFileCategoryName}资料。`
  }

  if (materialsStore.currentDimension) {
    return '当前维度下还没有可用资料。'
  }

  return '当前还没有可用教学资料。'
}

function formatFileSize(sizeBytes?: number): string {
  const size = Math.max(0, Number(sizeBytes || 0))
  if (size < 1024) {
    return `${size} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = size / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`
}

function formatDate(value?: string): string {
  if (!value) {
    return '未知'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getFileIcon(type: string) {
  const lowerType = type.toLowerCase()
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(lowerType)) {
    return Document
  }
  if (['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv', 'm4v'].includes(lowerType)) {
    return VideoPlay
  }
  if (['mp3', 'wav', 'flac', 'aac'].includes(lowerType)) {
    return Headset
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(lowerType)) {
    return Picture
  }
  return Files
}

function getFileIconColor(type: string): string {
  const lowerType = type.toLowerCase()
  if (['pdf'].includes(lowerType)) return '#d14343'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(lowerType)) return '#3b82f6'
  if (['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv', 'm4v'].includes(lowerType)) return '#7c3aed'
  if (['mp3', 'wav', 'flac', 'aac'].includes(lowerType)) return '#ea580c'
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(lowerType)) return '#0ea5e9'
  return '#64748b'
}

async function chooseSourceFolder() {
  if (!window.electronAPI?.selectFolder) {
    ElMessage.warning('当前环境不支持目录选择')
    return
  }

  const selectedPath = await window.electronAPI.selectFolder()
  if (selectedPath) {
    sourceFolderPath.value = selectedPath
    localStorage.setItem('teaching-material-source-folder', selectedPath)
  }
}

function downloadTemplate() {
  const content = resourceImporter.createTemplateCsv()
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'teaching-material-import-template.csv'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] || null
  selectedFile.value = file

  if (file && !uploadForm.value.title) {
    uploadForm.value.title = file.name.replace(/\.[^.]+$/, '')
  }
}

async function handleUpload() {
  if (!canUpload.value || !selectedFile.value || !uploadForm.value.dimensionCode) {
    ElMessage.warning('请补全上传信息')
    return
  }

  try {
    const storedFile = await teachingMaterialFileManager.saveBrowserFile(
      selectedFile.value,
      uploadForm.value.dimensionCode
    )

    const success = await materialsStore.addMaterialRecord({
      title: uploadForm.value.title.trim(),
      dimensionCode: uploadForm.value.dimensionCode,
      fileName: storedFile.fileName,
      fileType: storedFile.fileType,
      filePath: storedFile.filePath,
      fileSizeBytes: storedFile.fileSizeBytes,
      tags: splitTagInput(uploadForm.value.tags),
      description: uploadForm.value.description.trim() || undefined,
    })

    if (!success) {
      await teachingMaterialFileManager.deleteManagedFile(storedFile.filePath)
      ElMessage.error('上传资料失败')
      return
    }

    ElMessage.success('教学资料上传成功')
    showUploadDialog.value = false
    resetUploadForm()
  } catch (uploadError) {
    console.error('[TeachingMaterials] upload failed:', uploadError)
    ElMessage.error('上传资料失败')
  }
}

function resetUploadForm() {
  uploadForm.value = {
    title: '',
    dimensionCode: '',
    tags: '',
    description: '',
  }
  selectedFile.value = null
}

function handleCsvChange(event: Event) {
  const target = event.target as HTMLInputElement
  csvFile.value = target.files?.[0] || null
  batchImportResult.value = null
}

async function handleBatchImport() {
  if (!csvFile.value || !sourceFolderPath.value) {
    ElMessage.warning('请先选择素材目录和 CSV 文件')
    return
  }

  isImporting.value = true
  batchImportResult.value = null

  try {
    const csvText = await csvFile.value.text()
    const result = await resourceImporter.importFromCSV(csvText, sourceFolderPath.value)
    batchImportResult.value = result

    if (result.success > 0) {
      await materialsStore.loadMaterials()
    }

    if (result.failed === 0) {
      ElMessage.success(`批量导入完成，共导入 ${result.success} 条资料`)
    } else {
      ElMessage.warning(`批量导入完成，成功 ${result.success} 条，失败 ${result.failed} 条`)
    }
  } catch (importError) {
    console.error('[TeachingMaterials] batch import failed:', importError)
    ElMessage.error('批量导入失败')
  } finally {
    isImporting.value = false
  }
}

async function toggleFavorite(material: TeachingMaterialItem) {
  await materialsStore.toggleFavorite(material.id)
}

async function openMaterial(material: TeachingMaterialItem) {
  const success = await materialsStore.openMaterial(material)
  if (!success) {
    ElMessage.error('打开资料失败')
  }
}

function showMaterialDetail(material: TeachingMaterialItem) {
  selectedMaterial.value = material
  showDetailDialog.value = true
}

async function deleteMaterial(material: TeachingMaterialItem) {
  try {
    await ElMessageBox.confirm(
      `确认删除资料“${material.title}”吗？`,
      '删除确认',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }

  const success = await materialsStore.deleteMaterial(material.id)
  if (success) {
    ElMessage.success('资料已删除')
  } else {
    ElMessage.error('删除资料失败')
  }
}

function splitTagInput(value: string): string[] {
  return value
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index)
}

onMounted(() => {
  materialsStore.init()
})

defineExpose({
  loadResources: () => materialsStore.loadMaterials(),
})
</script>

<style scoped>
.teaching-materials {
  display: flex;
  height: 100%;
  gap: 16px;
  background: #f5f7fa;
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.dimension-list {
  flex: 1;
  overflow-y: auto;
}

.dimension-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dimension-item:hover {
  background: #f5f7fa;
}

.dimension-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.dimension-item .el-icon {
  margin-right: 10px;
}

.dimension-item span:nth-child(2) {
  flex: 1;
}

.count {
  font-size: 12px;
  color: #909399;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.content-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.content-header h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #303133;
}

.content-header p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.file-category-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.source-folder {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 360px;
  text-align: right;
}

.source-label {
  font-size: 12px;
  color: #909399;
}

.source-path {
  font-size: 12px;
  color: #606266;
  word-break: break-all;
}

.state-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.error-state {
  color: #f56c6c;
}

.empty-state h3 {
  margin: 16px 0 8px;
  color: #606266;
}

.empty-state p {
  margin: 0 0 16px;
}

.material-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-right: 8px;
}

.material-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fafbfc;
}

.material-icon {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f0f2f5;
}

.material-body {
  flex: 1;
  min-width: 0;
}

.material-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.material-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.material-top h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.description {
  margin: 0 0 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.meta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.material-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.batch-import-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.selected-source {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 13px;
  color: #606266;
  word-break: break-all;
}

.import-result {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.import-result h4 {
  margin: 0 0 12px;
}

.import-result p {
  margin: 0 0 8px;
}

.error-list {
  margin-top: 12px;
  max-height: 220px;
  overflow-y: auto;
  font-size: 13px;
  color: #f56c6c;
}

.file-info {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
}

.detail-content {
  display: flex;
  gap: 20px;
}

.detail-icon {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #f0f2f5;
}

.detail-body {
  flex: 1;
}

.detail-body h4 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #303133;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.meta-item {
  display: flex;
  gap: 8px;
}

.meta-item label {
  min-width: 64px;
  color: #909399;
}

.meta-item span {
  color: #303133;
  word-break: break-all;
}

.meta-item-full {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .teaching-materials {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .content-header {
    flex-direction: column;
  }

  .source-folder {
    max-width: none;
    text-align: left;
  }

  .detail-content {
    flex-direction: column;
  }

  .detail-meta {
    grid-template-columns: 1fr;
  }
}
</style>
