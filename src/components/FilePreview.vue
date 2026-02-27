<template>
  <div class="file-preview-modal" v-if="show" @click.self="close">
    <div class="modal-content" :class="{ 'media-modal': isMediaFile }">
      <div class="modal-header">
        <h3>{{ file?.title || '文件预览' }}</h3>
        <button class="btn-icon" @click="close">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body" :class="bodyClass">
        <!-- PDF 预览 -->
        <div v-if="isPDF" class="pdf-preview">
          <iframe
            v-if="pdfUrl"
            :src="pdfUrl"
            width="100%"
            height="100%"
            frameborder="0"
          ></iframe>
          <div v-else class="pdf-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载PDF...</p>
          </div>
        </div>

        <!-- Word/Excel/PPT 预览 -->
        <div v-else-if="isOfficeDoc" class="office-preview">
          <div class="office-header">
            <p class="file-info">
              <i class="fas" :class="getFileIcon(file?.type)"></i>
              <span>{{ file?.title }} ({{ file?.type?.toUpperCase() }})</span>
            </p>
          </div>
          <div class="office-content">
            <iframe
              v-if="officeUrl"
              :src="officeUrl"
              width="100%"
              height="600px"
              frameborder="0"
            ></iframe>
            <div v-else class="office-actions">
              <div class="action-card">
                <i class="fas fa-arrow-down-to-bracket"></i>
                <h4>下载文件</h4>
                <p>请下载后使用相应软件打开</p>
                <button class="btn btn-primary" @click="downloadFile">
                  <i class="fas fa-arrow-down-to-bracket"></i>
                  下载文件
                </button>
              </div>
              <div v-if="hasOfficeSupport" class="action-card">
                <i class="fas fa-arrow-up-right-from-square"></i>
                <h4>使用Office打开</h4>
                <p>尝试在本地Office应用中打开</p>
                <button class="btn btn-primary" @click="openWithOffice">
                  <i class="fas fa-arrow-up-right-from-square"></i>
                  在Office中打开
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 图片预览 -->
        <div v-else-if="isImage" class="image-preview">
          <img :src="imageUrl" :alt="file?.title" @error="imageError = true" />
          <div v-if="imageError" class="error-message">
            <i class="fas fa-triangle-exclamation"></i>
            <p>图片加载失败</p>
          </div>
        </div>

        <!-- 视频预览 -->
        <div v-else-if="isVideo" class="video-preview">
          <video controls :src="videoUrl" width="100%">
            您的浏览器不支持视频播放。
          </video>
        </div>

        <!-- 音频预览 -->
        <div v-else-if="isAudio" class="audio-preview">
          <div class="audio-player">
            <div class="audio-cover">
              <i class="fas fa-music"></i>
            </div>
            <h4>{{ file?.title }}</h4>
            <audio controls :src="audioUrl" style="width: 100%">
              您的浏览器不支持音频播放。
            </audio>
          </div>
        </div>

        <!-- 不支持的文件类型 -->
        <div v-else class="unsupported-preview">
          <div class="unsupported-content">
            <i class="fas" :class="getFileIcon(file?.type)"></i>
            <h4>无法预览此文件类型</h4>
            <p>{{ file?.title }} ({{ file?.type?.toUpperCase() }})</p>
            <p class="hint">请下载文件后使用相应的软件打开</p>
            <button class="btn btn-primary" @click="downloadFile">
              <i class="fas fa-arrow-down-to-bracket"></i>
              下载文件
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="downloadFile" v-if="!isMediaFile">
          <i class="fas fa-arrow-down-to-bracket"></i>
          下载文件
        </button>
        <button class="btn btn-primary" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { formatFileSize } from '@/database/resource-data'

interface FileItem {
  id: number
  title: string
  type: string
  path: string
  size_kb: number
}

interface Props {
  show: boolean
  file: FileItem | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// 状态
const imageError = ref(false)
const officeUrl = ref('')
const pdfUrl = ref('')
const realFileUrl = ref('')

// 计算属性
const isPDF = computed(() => props.file?.type?.toLowerCase() === 'pdf')
const isOfficeDoc = computed(() => {
  const type = props.file?.type?.toLowerCase()
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(type || '')
})
const isImage = computed(() => {
  const type = props.file?.type?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(type || '')
})
const isVideo = computed(() => {
  const type = props.file?.type?.toLowerCase()
  return ['mp4', 'avi', 'mov', 'wmv', 'webm', 'ogg'].includes(type || '')
})
const isAudio = computed(() => {
  const type = props.file?.type?.toLowerCase()
  return ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(type || '')
})

const isMediaFile = computed(() => isImage.value || isVideo.value || isAudio.value)

const bodyClass = computed(() => {
  if (isMediaFile.value) return 'media-body'
  if (isPDF.value) return 'pdf-body'
  if (isOfficeDoc.value) return 'office-body'
  return ''
})

const imageUrl = computed(() => {
  return realFileUrl.value || ''
})

const videoUrl = computed(() => {
  return realFileUrl.value || ''
})

const audioUrl = computed(() => {
  return realFileUrl.value || ''
})

const hasOfficeSupport = computed(() => {
  // 检测是否在Windows或Mac系统上
  return navigator.platform.includes('Win') || navigator.platform.includes('Mac')
})

// 方法
function close() {
  emit('close')
  imageError.value = false
  officeUrl.value = ''
  pdfUrl.value = ''
}

function getFileIcon(type?: string): string {
  const iconMap: Record<string, string> = {
    pdf: 'fa-file-pdf',
    doc: 'fa-file-word',
    docx: 'fa-file-word',
    xls: 'fa-file-excel',
    xlsx: 'fa-file-excel',
    ppt: 'fa-file-powerpoint',
    pptx: 'fa-file-powerpoint',
    jpg: 'fa-file-image',
    jpeg: 'fa-file-image',
    png: 'fa-file-image',
    gif: 'fa-file-image',
    mp4: 'fa-file-video',
    avi: 'fa-file-video',
    mov: 'fa-file-video',
    mp3: 'fa-file-audio',
    wav: 'fa-file-audio'
  }
  return iconMap[type?.toLowerCase() || ''] || 'fa-file'
}

async function downloadFile() {
  if (!props.file) return

  try {
    // 动态导入 resourceManager
    const managerModule = await import('@/utils/resource-manager')
    const { resourceManager } = managerModule

    // 使用系统默认程序打开文件（可以触发下载）
    resourceManager.openWithSystem(props.file.path)
  } catch (error) {
    console.error('打开文件失败:', error)
    // 回退方案：创建一个下载链接（使用完整的资源路径）
    const cleanPath = props.file.path.startsWith('/') ? props.file.path.slice(1) : props.file.path
    const fullPath = `/assets/resources/${cleanPath}`
    const a = document.createElement('a')
    a.href = fullPath
    a.download = props.file.title
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

function openWithOffice() {
  if (!props.file) return

  // 使用Office URI Scheme
  const type = props.file.type?.toLowerCase()
  let scheme = ''

  if (type === 'doc' || type === 'docx') {
    scheme = 'ms-word:ofe|u|'
  } else if (type === 'xls' || type === 'xlsx') {
    scheme = 'ms-excel:ofe|u|'
  } else if (type === 'ppt' || type === 'pptx') {
    scheme = 'ms-powerpoint:ofe|u|'
  }

  if (scheme) {
    // 尝试使用Office URI Scheme
    window.location.href = scheme + encodeURIComponent(window.location.origin + props.file.path)

    // 延迟检测是否成功打开
    setTimeout(() => {
      // 如果还在当前页面，说明失败，回退到下载
      if (!window.document.hasFocus()) {
        downloadFile()
      }
    }, 1000)
  } else {
    downloadFile()
  }
}

// 监听文件变化，初始化预览
watch(() => props.file, async (newFile) => {
  if (!newFile) return

  // 重置状态
  imageError.value = false
  officeUrl.value = ''
  pdfUrl.value = ''
  realFileUrl.value = ''

  try {
    // 动态导入 resourceManager
    const managerModule = await import('@/utils/resource-manager')
    const { resourceManager } = managerModule

    // 获取真实的文件URL
    realFileUrl.value = await resourceManager.getFileUrl(newFile.path)

    // PDF预览 - 在Electron环境下直接用系统程序打开
    if (isPDF.value && window.electronAPI) {
      // Electron环境下不支持iframe预览本地PDF，自动打开系统默认程序
      const fullPath = `${resourceManager.getResourcesPath()}/${newFile.path}`
      await window.electronAPI.openFile(fullPath)
      close()
    }
    // 开发环境下不尝试预览PDF，保持pdfUrl为空，显示下载提示

    // Office文档预览 - 在Electron环境下直接用系统程序打开
    if (isOfficeDoc.value && window.electronAPI) {
      // Electron环境下不支持iframe预览Office文档，自动打开系统默认程序
      const fullPath = `${resourceManager.getResourcesPath()}/${newFile.path}`
      await window.electronAPI.openFile(fullPath)
      close()
    }
    // 开发环境下不尝试预览Office文档，保持officeUrl为空，显示下载提示
  } catch (error) {
    console.error('获取文件URL失败:', error)
    // 回退方案：使用文件路径作为URL
    realFileUrl.value = newFile.path
  }
})
</script>

<style scoped>
.file-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.media-modal {
  max-width: 1200px;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-body {
  padding: 0;
}

.office-body {
  padding: 20px;
}

.media-body {
  padding: 0;
  background: #000;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: #f8f9fa;
}

/* PDF预览 */
.pdf-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #666;
}

.pdf-loading i {
  font-size: 48px;
  margin-bottom: 15px;
}

/* Office文档预览 */
.office-preview {
  width: 100%;
}

.office-header {
  margin-bottom: 20px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #666;
}

.office-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.action-card {
  text-align: center;
  padding: 30px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  transition: all 0.3s;
}

.action-card:hover {
  border-color: #42b983;
  background: #f8f9fa;
}

.action-card i {
  font-size: 48px;
  color: #42b983;
  margin-bottom: 15px;
}

.action-card h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.action-card p {
  margin: 0 0 20px 0;
  color: #666;
}

/* 图片预览 */
.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #e74c3c;
}

.error-message i {
  font-size: 48px;
  margin-bottom: 15px;
}

/* 视频预览 */
.video-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-preview video {
  max-width: 100%;
  max-height: 100%;
}

/* 音频预览 */
.audio-preview {
  width: 100%;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-player {
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.audio-cover {
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-cover i {
  font-size: 80px;
  color: white;
}

.audio-player h4 {
  margin: 0 0 30px 0;
  color: #2c3e50;
}

/* 不支持的文件类型 */
.unsupported-preview {
  width: 100%;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unsupported-content {
  text-align: center;
  max-width: 400px;
}

.unsupported-content i {
  font-size: 64px;
  color: #ddd;
  margin-bottom: 20px;
}

.unsupported-content h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.unsupported-content p {
  margin: 5px 0 20px 0;
  color: #666;
}

.unsupported-content .hint {
  font-size: 0.9em;
  color: #999;
}

/* 按钮样式 */
.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.btn:hover {
  background: #f0f0f0;
}

.btn-primary {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.btn-primary:hover {
  background: #3aa876;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-preview-modal {
    padding: 10px;
  }

  .modal-content {
    max-width: 100%;
    max-height: 100vh;
  }

  .office-actions {
    grid-template-columns: 1fr;
  }
}
</style>