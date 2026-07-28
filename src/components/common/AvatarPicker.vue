<template>
  <div class="avatar-picker">
    <div class="avatar-picker__preview-shell">
      <slot name="preview" :avatar-url="displayAvatarUrl">
        <div class="avatar-picker__preview" :class="`avatar-picker__preview--${props.fallbackTone}`">
          <img v-if="displayAvatarUrl" :src="displayAvatarUrl" :alt="`${props.fallbackName || '用户'}头像`" />
          <span v-else>{{ fallbackInitial }}</span>
        </div>
      </slot>
    </div>

    <div class="avatar-picker__content">
      <div class="avatar-picker__presets" role="radiogroup" :aria-label="props.presetLabel">
        <button
          v-for="preset in props.presets"
          :key="preset.id"
          type="button"
          class="avatar-picker__preset"
          :class="{ 'is-selected': preset.path === props.modelValue }"
          role="radio"
          :aria-checked="preset.path === props.modelValue"
          :title="preset.label"
          @click="selectPreset(preset.path)"
        >
          <img :src="resolveAvatarUrl(preset.path)" :alt="preset.label" />
          <span class="avatar-picker__preset-check" aria-hidden="true">
            <i class="fas fa-check"></i>
          </span>
        </button>
      </div>

      <div class="avatar-picker__actions">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="avatar-picker__file-input"
          @change="handleFileChange"
        />
        <button type="button" class="avatar-picker__action" @click="triggerFilePicker">
          <i class="fas fa-arrow-up-from-bracket" aria-hidden="true"></i>
          <span>本地上传</span>
        </button>
        <button type="button" class="avatar-picker__action" @click="openCamera">
          <i class="fas fa-camera" aria-hidden="true"></i>
          <span>拍照</span>
        </button>
        <button
          v-if="props.modelValue"
          type="button"
          class="avatar-picker__action avatar-picker__action--danger"
          @click="removeAvatar"
        >
          <i class="fas fa-trash-can" aria-hidden="true"></i>
          <span>移除</span>
        </button>
      </div>
    </div>

    <el-dialog
      v-model="cameraDialogVisible"
      title="拍照"
      width="min(680px, calc(100vw - 32px))"
      append-to-body
      :close-on-click-modal="false"
      @closed="closeCamera"
    >
      <div class="avatar-picker__camera-body">
        <video
          v-show="!photoTaken"
          ref="cameraVideo"
          class="avatar-picker__camera-media"
          autoplay
          playsinline
        ></video>
        <canvas
          v-show="photoTaken"
          ref="cameraCanvas"
          class="avatar-picker__camera-media"
        ></canvas>
      </div>

      <template #footer>
        <div class="avatar-picker__camera-actions">
          <el-button v-if="photoTaken" @click="retakePhoto">
            <i class="fas fa-rotate-left" aria-hidden="true"></i>
            重拍
          </el-button>
          <el-button v-if="photoTaken" type="primary" @click="confirmPhoto">
            <i class="fas fa-check" aria-hidden="true"></i>
            确认
          </el-button>
          <el-button v-else type="primary" @click="takePhoto">
            <i class="fas fa-camera" aria-hidden="true"></i>
            拍照
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { AvatarPreset } from '@/utils/avatar-presets'
import { resolveAvatarUrl } from '@/utils/avatar-presets'
import { compressImage } from '@/utils/image-processor'

const MAX_AVATAR_DIMENSION = 512
const AVATAR_QUALITY = 0.82

const props = withDefaults(defineProps<{
  modelValue?: string
  presets: readonly AvatarPreset[]
  presetLabel: string
  fallbackName?: string
  fallbackTone?: 'neutral' | 'student-male' | 'student-female'
}>(), {
  modelValue: '',
  fallbackName: '',
  fallbackTone: 'neutral',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const cameraDialogVisible = ref(false)
const photoTaken = ref(false)
const cameraVideo = ref<HTMLVideoElement | null>(null)
const cameraCanvas = ref<HTMLCanvasElement | null>(null)
const cameraStream = ref<MediaStream | null>(null)

const displayAvatarUrl = computed(() => resolveAvatarUrl(props.modelValue))
const fallbackInitial = computed(() => props.fallbackName.trim().charAt(0).toUpperCase() || '?')

function selectPreset(path: string) {
  emit('update:modelValue', path)
}

function removeAvatar() {
  emit('update:modelValue', '')
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function triggerFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('请选择图片文件')
    }

    const result = await compressImage(file, {
      maxWidth: MAX_AVATAR_DIMENSION,
      maxHeight: MAX_AVATAR_DIMENSION,
      quality: AVATAR_QUALITY,
      format: 'jpeg',
      enableWebP: false,
    })

    if (!result.success || !result.dataUrl) {
      throw new Error(result.error || '图片压缩失败')
    }

    emit('update:modelValue', result.dataUrl)
  } catch (error) {
    console.error('处理头像图片失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '处理头像图片失败')
  } finally {
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

async function openCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前环境不支持摄像头访问，请使用本地上传')
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    if (!devices.some((device) => device.kind === 'videoinput')) {
      ElMessage.warning('未检测到摄像头设备，请使用本地上传方式')
      return
    }

    cameraDialogVisible.value = true
    await nextTick()

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    })
    cameraStream.value = stream

    if (cameraVideo.value) {
      cameraVideo.value.srcObject = stream
    }
  } catch (error) {
    closeCamera()

    const errorName = typeof error === 'object' && error !== null && 'name' in error
      ? String(error.name)
      : ''
    if (errorName === 'NotFoundError') {
      ElMessage.warning('未找到摄像头设备，请使用本地上传方式')
    } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      ElMessage.warning('摄像头权限被拒绝，请在系统设置中允许访问摄像头，或使用本地上传')
    } else if (errorName === 'NotReadableError') {
      ElMessage.error('摄像头被其他应用占用，请关闭后重试')
    } else {
      ElMessage.error(error instanceof Error ? error.message : '无法访问摄像头')
    }
  }
}

function takePhoto() {
  const video = cameraVideo.value
  const canvas = cameraCanvas.value
  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    ElMessage.warning('摄像头尚未准备完成，请稍后再试')
    return
  }

  const scale = Math.min(1, MAX_AVATAR_DIMENSION / Math.max(video.videoWidth, video.videoHeight))
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) {
    ElMessage.error('无法处理拍摄照片')
    return
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  photoTaken.value = true
}

function retakePhoto() {
  photoTaken.value = false
}

function confirmPhoto() {
  const canvas = cameraCanvas.value
  if (!canvas || !photoTaken.value) return

  emit('update:modelValue', canvas.toDataURL('image/jpeg', AVATAR_QUALITY))
  cameraDialogVisible.value = false
}

function closeCamera() {
  photoTaken.value = false
  cameraDialogVisible.value = false
  if (cameraVideo.value) {
    cameraVideo.value.srcObject = null
  }
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach((track) => track.stop())
    cameraStream.value = null
  }
}

onBeforeUnmount(closeCamera)
</script>

<style scoped>
.avatar-picker {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-width: 0;
}

.avatar-picker__preview-shell {
  flex: 0 0 auto;
}

.avatar-picker__preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdfe6;
  font-size: 34px;
  font-weight: 700;
}

.avatar-picker__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-picker__preview--neutral {
  background: #edf4ff;
  color: #486a93;
}

.avatar-picker__preview--student-male {
  background: #e6f1fb;
  color: #185fa5;
}

.avatar-picker__preview--student-female {
  background: #fbeaf0;
  color: #993556;
}

.avatar-picker__content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
}

.avatar-picker__presets {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 44px));
  gap: 8px;
}

.avatar-picker__preset {
  position: relative;
  width: 44px;
  height: 44px;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 50%;
  background: #f5f7fa;
  cursor: pointer;
}

.avatar-picker__preset:hover,
.avatar-picker__preset:focus-visible {
  border-color: #86b7fe;
  outline: none;
}

.avatar-picker__preset.is-selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.18);
}

.avatar-picker__preset img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-picker__preset-check {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 9px;
}

.avatar-picker__preset.is-selected .avatar-picker__preset-check {
  display: inline-flex;
}

.avatar-picker__actions,
.avatar-picker__camera-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-picker__action {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 5px;
  background: #fff;
  color: #606266;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.avatar-picker__action:hover {
  border-color: #86b7fe;
  color: #409eff;
}

.avatar-picker__action--danger:hover {
  border-color: #fbc4c4;
  color: #f56c6c;
}

.avatar-picker__file-input {
  display: none;
}

.avatar-picker__camera-body {
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-radius: 6px;
  background: #111827;
}

.avatar-picker__camera-media {
  display: block;
  width: 100%;
  max-width: 640px;
  max-height: min(58vh, 480px);
  object-fit: contain;
}

@media (max-width: 640px) {
  .avatar-picker {
    align-items: center;
    flex-direction: column;
  }

  .avatar-picker__content {
    width: 100%;
  }

  .avatar-picker__presets {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .avatar-picker__preset {
    width: 100%;
    aspect-ratio: 1;
    height: auto;
  }
}
</style>
