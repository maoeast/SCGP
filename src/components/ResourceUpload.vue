<template>
  <div class="resource-upload">
    <!-- 拖放上传区域 -->
    <div
      class="upload-area"
      :class="{ 'is-dragging': isDragging }"
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @dragend.prevent="isDragging = false"
      @click="triggerFileInput"
    >
      <el-icon v-if="!uploading" :size="48" color="#909399">
        <UploadFilled />
      </el-icon>
      <div class="upload-content">
        <p class="upload-text">拖放文件到此处，或点击上传</p>
        <p class="upload-hint">支持 JPG、PNG、WebP 格式，最大 10MB</p>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style="display: none"
        @change="handleFileSelect"
      />
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="upload-progress">
      <el-progress :percentage="uploadProgress" :status="uploadStatus" />
      <p class="progress-text">{{ progressText }}</p>
    </div>

    <!-- 文件列表 -->
    <div v-if="fileList.length > 0" class="file-list">
      <div v-for="(file, index) in fileList" :key="index" class="file-item">
        <!-- 预览图 -->
        <el-image
          :src="file.preview"
          fit="cover"
          class="file-preview"
          :preview-src="file.preview"
        />
        <!-- 文件信息 -->
        <div class="file-info">
          <p class="file-name">{{ file.name }}</p>
          <p class="file-size">
            {{ formatFileSize(file.originalSize) }} → {{ formatFileSize(file.compressedSize) }}
            <span :class="['compression-ratio', file.compressionRatio < 1 ? 'success' : 'warning']">
              ({{ ((1 - file.compressionRatio) * 100).toFixed(1) }}%)
            </span>
          </p>
        </div>
        <!-- 操作按钮 -->
        <div class="file-actions">
          <el-button
            v-if="file.success"
            type="primary"
            size="small"
            @click="saveFile(file)"
          >
            保存
          </el-button>
          <el-button
            v-if="file.success"
            type="success"
            size="small"
            @click="useFile(file)"
          >
            使用
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="removeFile(index)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { compressImage, formatFileSize, generateUniqueFileName } from '@/utils/image-processor'

// Props
interface Props {
  accept?: string // 接受的文件类型，默认 image/*
  maxSize?: number // 最大文件大小（MB），默认 10
  maxWidth?: number // 图片最大宽度，默认 1920
  maxHeight?: number // 图片最大高度，默认 1080
  quality?: number // 压缩质量 0.1-1.0，默认 0.8
  enableWebP?: boolean // 是否启用 WebP，默认 true
}

const props = withDefaults(defineProps<Props>(), {
  accept: 'image/*',
  maxSize: 10,
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  enableWebP: true
})

// Emits
const emit = defineEmits<{
  'file-selected': [files: File[]]
  'upload-complete': [results: UploadResult[]]
  'file-save': [file: UploadResult]
  'file-use': [file: UploadResult]
}>()

// Refs
const fileInputRef = ref<HTMLInputElement>()

// State
const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const progressText = ref('')

interface UploadResult {
  file: File
  success: boolean
  blob?: Blob
  dataUrl?: string
  fileName?: string
  preview?: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
  format: string
  error?: string
}

const fileList = ref<UploadResult[]>([])

// Methods
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    await processFiles(Array.from(files))
  }
  // 重置 input 以允许重复选择同一文件
  target.value = ''
}

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    await processFiles(Array.from(files))
  }
}

const processFiles = async (files: File[]) => {
  // 验证文件
  const validFiles = files.filter(file => {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      ElMessage.error(`不支持的文件类型: ${file.name}`)
      return false
    }

    // 检查文件大小
    const maxSizeBytes = props.maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      ElMessage.error(`文件过大: ${file.name} (最大 ${props.maxSize}MB)`)
      return false
    }

    return true
  })

  if (validFiles.length === 0) {
    return
  }

  emit('file-selected', validFiles)

  // 处理文件
  uploading.value = true
  uploadProgress.value = 0
  progressText.value = '正在处理...'

  const results: UploadResult[] = []

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i]
    progressText.value = `正在处理 ${i + 1}/${validFiles.length}...`

    const result = await compressImage(file, {
      quality: props.quality,
      maxWidth: props.maxWidth,
      maxHeight: props.maxHeight,
      enableWebP: props.enableWebP
    })

    results.push({
      file,
      success: result.success,
      blob: result.blob,
      dataUrl: result.dataUrl,
      preview: URL.createObjectURL(file),
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio,
      format: result.format,
      error: result.error
    })

    uploadProgress.value = Math.round(((i + 1) / validFiles.length) * 100)
  }

  fileList.value = results
  uploading.value = false
  progressText.value = `完成 ${results.filter(r => r.success).length}/${results.length}`

  emit('upload-complete', results)
}

const saveFile = async (file: UploadResult) => {
  if (!file.blob || !file.dataUrl) {
    return
  }

  try {
    // 转换 Blob 为 ArrayBuffer
    const arrayBuffer = await file.blob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 生成唯一文件名
    const originalName = file.file.name
    const ext = `.${file.format === 'jpeg' ? 'jpg' : file.format}`
    const uniqueName = generateUniqueFileName(originalName).replace(/\.[^.]+$/, ext)

    // 调用 IPC 保存
    const result = await window.api.invoke('SAVE_ASSET', uniqueName, buffer)

    if (result.success) {
      ElMessage.success('保存成功')
      emit('file-save', { ...file, fileName: uniqueName, savedPath: result.path })
    } else {
      ElMessage.error(`保存失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`保存失败: ${error.message}`)
  }
}

const useFile = (file: UploadResult) => {
  emit('file-use', file)
}

const removeFile = (index: number) => {
  fileList.value.splice(index, 1)
}

// Computed
const uploadStatus = computed(() => {
  const failedCount = fileList.value.filter(f => !f.success).length
  if (failedCount > 0) return 'exception'
  return 'success'
})

// Expose formatFileSize for template
const { formatFileSize: formatFileSizeFn } = { formatFileSize }
</script>

<style scoped>
.resource-upload {
  width: 100%;
}

.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #fafafa;
}

.upload-area:hover {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.upload-area.is-dragging {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.upload-content {
  margin-top: 16px;
}

.upload-text {
  font-size: 16px;
  color: #303133;
  margin: 0 0 8px;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.upload-progress {
  margin-top: 20px;
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
}

.file-list {
  margin-top: 20px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: #fff;
}

.file-preview {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  margin-right: 12px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 4px;
}

.file-size {
  font-size: 12px;
  color: #606266;
  margin: 0;
}

.compression-ratio {
  margin-left: 8px;
}

.compression-ratio.success {
  color: #67c23a;
}

.compression-ratio.warning {
  color: #e6a23c;
}

.file-actions {
  display: flex;
  gap: 8px;
}
</style>
