<template>
  <div class="teaching-materials scgp-split-layout">
    <div class="sidebar scgp-side-panel">
      <div class="sidebar-header scgp-side-panel__header">
        <el-icon><FolderOpened /></el-icon>
        <span>业务维度</span>
      </div>

      <div class="dimension-list scgp-side-panel__body">
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

    <div class="main-content scgp-content-panel">
      <div class="toolbar scgp-content-toolbar">
        <div class="toolbar-left scgp-content-toolbar__group">
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

        <div v-if="!readOnly" class="toolbar-right scgp-content-toolbar__group">
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

      <div class="content-header scgp-content-heading">
        <div>
          <h3>{{ materialsStore.currentDimensionName }}</h3>
          <p>{{ getCurrentDescription() }}</p>
        </div>
        <div v-if="sourceFolderPath" class="source-folder">
          <span class="source-label">素材目录</span>
          <span class="source-path">{{ sourceFolderPath }}</span>
        </div>
      </div>

      <div class="file-category-filter scgp-inline-filter">
        <span class="filter-label">资料类型</span>
        <el-radio-group
          :model-value="materialsStore.currentFileCategory"
          size="small"
          @change="selectFileCategory"
        >
          <el-radio-button
            v-for="category in fileCategoryOptions"
            :key="category"
            :value="category"
          >
            {{ getFileCategoryLabel(category) }} ({{ getMaterialCountByCategory(category) }})
          </el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="materialsStore.isLoading" class="state-panel scgp-state-panel">
        <el-icon class="is-loading" :size="48"><Loading /></el-icon>
        <p>正在加载教学资料...</p>
      </div>

      <div v-else-if="materialsStore.error" class="state-panel error-state scgp-state-panel scgp-state-panel--danger">
        <el-icon :size="48"><WarningFilled /></el-icon>
        <p>{{ materialsStore.error }}</p>
        <el-button type="primary" @click="materialsStore.clearError()">关闭</el-button>
      </div>

      <div v-else-if="filteredMaterials.length > 0" class="material-grid scgp-card-grid">
        <article
          v-for="material in filteredMaterials"
          :key="material.id"
          class="material-card"
        >
          <div
            class="material-thumbnail"
            :class="{ 'is-video': isVideoMaterial(material) }"
            @click="handleThumbnailClick(material)"
          >
            <img
              :src="`resource://images/teaching-materials/${material.dimensionCode}/${material.id}.jpg`"
              :alt="material.title"
              class="thumbnail-image"
              @error="handleImageError"
            />
            <div class="thumbnail-fallback">
              <el-icon :size="32" :style="{ color: getFileIconColor(material.fileType) }">
                <component :is="getFileIcon(material.fileType)" />
              </el-icon>
            </div>

            <div v-if="isVideoMaterial(material)" class="thumbnail-play-btn" aria-hidden="true">
              <el-icon :size="26"><VideoPlay /></el-icon>
            </div>

            <div v-if="material.sequenceOrder" class="sequence-badge">
              {{ String(material.sequenceOrder).padStart(2, '0') }}
            </div>

            <button
              class="favorite-icon"
              :class="{ active: material.isFavorite }"
              @click.stop="toggleFavorite(material)"
            >
              <el-icon><Star /></el-icon>
            </button>

            <div
              v-if="materialsStore.currentFileCategory === 'all'"
              class="file-type-badge"
            >
              {{ material.fileType.toUpperCase() }}
            </div>
          </div>

          <div class="material-body">
            <h4 class="material-title">{{ material.title }}</h4>

            <p v-if="material.description" class="description">
              {{ material.description }}
            </p>

            <div class="meta-row">
              <span>{{ formatFileSize(material.fileSizeBytes) }}</span>
              <span>·</span>
              <span>{{ formatDateShort(material.updatedAt) }}</span>
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
              text
              circle
              size="small"
              @click="openMaterial(material)"
            >
              <el-icon><View /></el-icon>
            </el-button>
            <el-button
              text
              circle
              size="small"
              @click="showMaterialDetail(material)"
            >
              <el-icon><InfoFilled /></el-icon>
            </el-button>
            <el-button
              v-if="!readOnly"
              text
              circle
              size="small"
              @click="deleteMaterial(material)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </article>
      </div>

      <div v-else class="state-panel empty-state scgp-state-panel">
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

    <el-dialog
      v-model="videoPreviewVisible"
      :title="videoPreviewMaterial?.title || '视频预览'"
      width="720px"
      class="material-video-dialog"
      destroy-on-close
      append-to-body
      @closed="videoPreviewMaterial = null"
    >
      <video
        v-if="videoPreviewUrl"
        :src="videoPreviewUrl"
        class="material-video-player"
        controls
        autoplay
      />
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
  'cognitive-development': '按认知发展主链组织教学与认知训练支持材料。',
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

function formatDateShort(value?: string): string {
  if (!value) {
    return '未知'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

const VIDEO_FILE_TYPES = ['mp4', 'avi', 'mov', 'wmv', 'webm', 'mkv', 'm4v']

function isVideoMaterial(material: TeachingMaterialItem): boolean {
  return VIDEO_FILE_TYPES.includes(String(material.fileType).toLowerCase())
}

/** 视频内嵌预览状态：卡片封面点击后在本应用内直接播放 */
const videoPreviewMaterial = ref<TeachingMaterialItem | null>(null)
const videoPreviewVisible = computed({
  get: () => videoPreviewMaterial.value !== null,
  set: (value: boolean) => {
    if (!value) {
      videoPreviewMaterial.value = null
    }
  },
})
const videoPreviewUrl = computed(() => {
  return videoPreviewMaterial.value
    ? teachingMaterialFileManager.getFileUrl(videoPreviewMaterial.value.filePath)
    : ''
})

function handleThumbnailClick(material: TeachingMaterialItem) {
  if (isVideoMaterial(material)) {
    videoPreviewMaterial.value = material
  }
}

function getFileIcon(type: string) {
  const lowerType = type.toLowerCase()
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(lowerType)) {
    return Document
  }
  if (VIDEO_FILE_TYPES.includes(lowerType)) {
    return VideoPlay
  }
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'].includes(lowerType)) {
    return Headset
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(lowerType)) {
    return Files
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
  if (VIDEO_FILE_TYPES.includes(lowerType)) return '#7c3aed'
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'].includes(lowerType)) return '#10b981'
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(lowerType)) return '#f59e0b'
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(lowerType)) return '#06b6d4'
  return '#6b7280'
}

function handleImageError(event: Event) {
  // 图片加载失败时显示占位符
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.nextElementSibling
  if (placeholder && placeholder.classList.contains('thumbnail-fallback')) {
    (placeholder as HTMLElement).style.display = 'flex'
  }
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
  height: 100%;
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
}

.sidebar-header {
  margin-bottom: 16px;
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
  overflow: hidden;
}

.toolbar {
  margin-bottom: 16px;
}

.content-header {
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
  min-height: 0;
}

.material-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.material-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.material-card:hover .material-actions {
  opacity: 1;
}

.material-thumbnail {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: #f5f7fa;
  overflow: hidden;
}

.material-thumbnail.is-video {
  cursor: pointer;
}

.thumbnail-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.material-thumbnail.is-video:hover .thumbnail-play-btn {
  opacity: 1;
  background: rgba(0, 0, 0, 0.65);
  transform: translate(-50%, -50%) scale(1.08);
}

.material-video-player {
  display: block;
  width: 100%;
  max-height: 70vh;
  background: #000;
  border-radius: 8px;
}

.thumbnail-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.9;
}

.sequence-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.favorite-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-icon:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.favorite-icon.active {
  background: rgba(245, 158, 11, 0.9);
  color: #fff;
}

.file-type-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  text-transform: uppercase;
}

.material-body {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.material-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.description {
  margin: 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #a0aec0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.material-actions {
  position: absolute;
  bottom: 14px;
  right: 14px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.material-actions .el-button {
  width: 32px;
  height: 32px;
  padding: 0;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e7eb;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.material-actions .el-button:hover {
  color: #303133;
  border-color: #d1d5db;
  background: #fff;
}

@media (hover: none) {
  .material-actions {
    opacity: 1;
  }
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
