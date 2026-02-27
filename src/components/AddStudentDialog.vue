<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>{{ props.editingStudent ? '编辑学生' : '添加学生' }}</h2>
        <button class="btn-close" @click="$emit('close')">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="dialog-body">
        <div class="form-group">
          <label for="name">姓名 <span class="required">*</span></label>
          <input
            id="name"
            v-model="studentForm.name"
            type="text"
            required
            placeholder="请输入学生姓名"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="gender">性别 <span class="required">*</span></label>
            <select id="gender" v-model="studentForm.gender" required>
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>

          <div class="form-group">
            <label for="birthday">出生日期 <span class="required">*</span></label>
            <input
              id="birthday"
              v-model="studentForm.birthday"
              type="date"
              required
              :max="new Date().toISOString().split('T')[0]"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="studentNo">学号</label>
          <input
            id="studentNo"
            v-model="studentForm.student_no"
            type="text"
            placeholder="可选，自动生成"
          />
        </div>

        <div class="form-group">
          <label for="disorder">诊断类型</label>
          <select id="disorder" v-model="studentForm.disorder">
            <option value="">请选择</option>
            <option value="视力障碍（盲、低视力（一级至四级））">视力障碍（盲、低视力（一级至四级））</option>
            <option value="听力障碍（聋（一级）、重听（二级至四级））">听力障碍（聋（一级）、重听（二级至四级））</option>
            <option value="言语障碍（失语、构音障碍、嗓音障碍、言语流畅度障碍（口吃））">言语障碍（失语、构音障碍、嗓音障碍、言语流畅度障碍（口吃））</option>
            <option value="智力障碍">智力障碍</option>
            <option value="肢体障碍（脑瘫、脊髓损伤、截肢、先天性肢体畸形）">肢体障碍（脑瘫、脊髓损伤、截肢、先天性肢体畸形）</option>
            <option value="精神障碍（孤独症谱系障碍（ASD）、注意缺陷多动障碍（ADHD）、情绪行为障碍（EBD））">精神障碍（孤独症谱系障碍（ASD）、注意缺陷多动障碍（ADHD）、情绪行为障碍（EBD））</option>
            <option value="多重障碍">多重障碍</option>
            <option value="学习障碍">学习障碍</option>
            <option value="发育迟缓（0-6岁婴幼儿）">发育迟缓（0-6岁婴幼儿）</option>
          </select>
        </div>

        <div class="form-group">
          <label for="classId">所属班级</label>
          <select id="classId" v-model="studentForm.classId">
            <option value="">暂不分班</option>
            <option v-for="cls in availableClasses" :key="cls.id" :value="cls.id">
              {{ cls.name }}
            </option>
          </select>
          <small v-if="availableClasses.length === 0" class="text-muted">
            当前学年无可用班级，请先创建班级
          </small>
        </div>

        <div class="form-group">
          <label>头像</label>
          <div class="avatar-upload">
            <div class="avatar-preview" v-if="avatarPreview">
              <img :src="avatarPreview" alt="头像预览" />
              <button type="button" class="btn-remove" @click="removeAvatar">
                <i class="fas fa-xmark"></i>
              </button>
            </div>
            <div class="avatar-placeholder" v-else-if="!studentForm.name">
              <i class="fas fa-user"></i>
            </div>
            <div class="avatar-text" v-else>
              {{ studentForm.name.charAt(0) }}
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              @change="handleAvatarChange"
              style="display: none"
            />
            <div class="avatar-buttons">
              <button type="button" class="btn-upload" @click="showCameraMenu">
                <i class="fas fa-camera"></i>
                头像
              </button>
              <div v-if="cameraMenuVisible" class="camera-menu">
                <button type="button" @click="openCamera">
                  <i class="fas fa-camera"></i>
                  拍照
                </button>
                <button type="button" @click="$refs.avatarInput.click()">
                  <i class="fas fa-arrow-up-from-bracket"></i>
                  本地上传
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <div class="dialog-footer">
        <button type="button" class="btn-secondary" @click="$emit('close')">
          取消
        </button>
        <button type="submit" class="btn-primary" @click="handleSubmit" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <!-- 摄像头对话框 -->
    <div v-if="showCameraDialog" class="dialog-overlay">
      <div class="camera-dialog">
        <div class="dialog-header">
          <h2>拍照</h2>
          <button @click="closeCameraDialog" class="btn-close">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="camera-body">
          <video
            ref="cameraVideo"
            autoplay
            playsinline
            v-show="!photoTaken"
          ></video>
          <canvas
            ref="cameraCanvas"
            v-show="photoTaken"
            class="camera-preview"
          ></canvas>
          <div class="camera-controls">
            <button
              v-if="!photoTaken"
              @click="takePhoto"
              class="btn-capture"
            >
              <i class="fas fa-camera"></i>
              拍照
            </button>
            <div v-else class="photo-actions">
              <button @click="retakePhoto" class="btn-secondary">
                <i class="fas fa-redo"></i>
                重拍
              </button>
              <button @click="confirmPhoto" class="btn-primary">
                <i class="fas fa-check"></i>
                确认
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useStudentStore } from '@/stores/student'
import { classAPI } from '@/database/class-api'
import { getCurrentAcademicYear } from '@/types/class'
import type { ClassInfo } from '@/types/class'

const emit = defineEmits<{
  close: []
  saved: []
}>()

const props = defineProps<{
  editingStudent?: any
}>()

const studentStore = useStudentStore()

// 响应式数据
const saving = ref(false)
const avatarPreview = ref('')
const avatarInput = ref<HTMLInputElement>()
const cameraMenuVisible = ref(false)
const showCameraDialog = ref(false)
const photoTaken = ref(false)
const cameraVideo = ref<HTMLVideoElement>()
const cameraCanvas = ref<HTMLCanvasElement>()
const cameraStream = ref<MediaStream | null>(null)
const availableClasses = ref<ClassInfo[]>([])

const studentForm = ref({
  name: '',
  gender: '',
  birthday: '',
  student_no: '',
  disorder: '',
  classId: null as number | null
})

// 方法
const handleAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const removeAvatar = () => {
  avatarPreview.value = ''
  if (avatarInput.value) {
    avatarInput.value.value = ''
  }
}

// 头像菜单相关
const showCameraMenu = () => {
  cameraMenuVisible.value = !cameraMenuVisible.value
}

// 关闭摄像头对话框
const closeCameraDialog = async () => {
  showCameraDialog.value = false
  photoTaken.value = false
  cameraMenuVisible.value = false
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop())
    cameraStream.value = null
  }
}

// 打开摄像头
const openCamera = async () => {
  try {
    // 先检查是否有摄像头设备
    const devices = await navigator.mediaDevices.enumerateDevices()
    const hasCamera = devices.some(device => device.kind === 'videoinput')

    if (!hasCamera) {
      ElMessage.warning('未检测到摄像头设备，请使用文件上传方式')
      cameraMenuVisible.value = false
      // 自动触发文件上传
      setTimeout(() => {
        document.querySelector('.avatar-uploader input')?.click()
      }, 100)
      return
    }

    showCameraDialog.value = true
    cameraMenuVisible.value = false
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    })
    cameraStream.value = stream
    if (cameraVideo.value) {
      cameraVideo.value.srcObject = stream
    }
  } catch (error: any) {
    console.error('无法访问摄像头:', error)
    closeCameraDialog()

    // 根据错误类型提供不同的提示
    if (error.name === 'NotFoundError') {
      ElMessage.warning('未找到摄像头设备，请使用文件上传方式')
    } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      ElMessage.warning('摄像头权限被拒绝，请在浏览器设置中允许访问摄像头，或使用文件上传方式')
    } else if (error.name === 'NotReadableError') {
      ElMessage.error('摄像头被其他应用占用，请关闭其他使用摄像头的程序后重试')
    } else {
      ElMessage.error(`无法访问摄像头: ${error.message || '未知错误'}`)
    }

    // 自动切换到文件上传
    setTimeout(() => {
      document.querySelector('.avatar-uploader input')?.click()
    }, 500)
  }
}

// 拍照
const takePhoto = () => {
  if (cameraVideo.value && cameraCanvas.value) {
    const video = cameraVideo.value
    const canvas = cameraCanvas.value
    const context = canvas.getContext('2d')

    if (context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)
      photoTaken.value = true
    }
  }
}

// 重拍
const retakePhoto = () => {
  photoTaken.value = false
}

// 确认照片
const confirmPhoto = () => {
  if (cameraCanvas.value) {
    avatarPreview.value = cameraCanvas.value.toDataURL('image/jpeg', 0.8)
    closeCameraDialog()
  }
}

const handleSubmit = async () => {
  try {
    saving.value = true

    // 如果没有填写学号，自动生成
    if (!studentForm.value.student_no) {
      studentForm.value.student_no = `STU${Date.now()}`
    }

    // 如果没有头像且有姓名，生成文字头像
    let finalAvatarPath = avatarPreview.value
    if (!finalAvatarPath && studentForm.value.name) {
      // 创建一个canvas来生成文字头像
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const context = canvas.getContext('2d')

      if (context) {
        // 背景色
        context.fillStyle = '#4CAF50'
        context.fillRect(0, 0, 200, 200)

        // 文字
        context.fillStyle = 'white'
        context.font = 'bold 80px Arial'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(studentForm.value.name.charAt(0), 100, 100)

        finalAvatarPath = canvas.toDataURL('image/png')
      }
    }

    if (props.editingStudent) {
      // 编辑模式
      await studentStore.updateStudent(props.editingStudent.id, {
        ...studentForm.value,
        avatar_path: finalAvatarPath || ''
      })
    } else {
      // 添加模式 - 先排除 classId（不属于 student 表字段）
      const { classId, ...studentData } = studentForm.value
      const studentId = await studentStore.addStudent({
        ...studentData,
        avatar_path: finalAvatarPath || ''
      })

      // 如果选择了班级，将学生分配到班级
      if (classId && studentForm.value.name) {
        try {
          const academicYear = getCurrentAcademicYear()
          const enrollmentDate = new Date().toISOString().split('T')[0]
          classAPI.assignStudentToClass(
            studentId,
            studentForm.value.name,
            classId,
            academicYear,
            enrollmentDate
          )
        } catch (error: any) {
          console.warn('班级分配失败:', error)
          // 班级分配失败不影响学生创建
          alert('学生添加成功，但班级分配失败：' + error.message)
        }
      }
    }

    emit('saved')
  } catch (error) {
    console.error(props.editingStudent ? '更新学生失败:' : '添加学生失败:', error)
    alert((props.editingStudent ? '更新失败：' : '添加失败：') + error.message)
  } finally {
    saving.value = false
  }
}

// 初始化表单数据
const initializeForm = () => {
  if (props.editingStudent) {
    studentForm.value = {
      name: props.editingStudent.name || '',
      gender: props.editingStudent.gender || '',
      birthday: props.editingStudent.birthday || '',
      student_no: props.editingStudent.student_no || '',
      disorder: props.editingStudent.disorder || '',
      classId: null
    }
    avatarPreview.value = props.editingStudent.avatar_path || ''
  } else {
    // 重置表单
    studentForm.value = {
      name: '',
      gender: '',
      birthday: '',
      student_no: '',
      disorder: '',
      classId: null
    }
  }
}

// 加载可用班级列表
const loadAvailableClasses = () => {
  try {
    const academicYear = getCurrentAcademicYear()
    availableClasses.value = classAPI.getClasses({
      academicYear,
      status: 1  // 只显示激活的班级
    })
  } catch (error) {
    console.error('加载班级列表失败:', error)
    availableClasses.value = []
  }
}

// 生命周期
onMounted(() => {
  initializeForm()
  loadAvailableClasses()
})

onUnmounted(() => {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop())
  }
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h2 {
  font-size: 20px;
  color: #333;
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  color: #999;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333;
}

.dialog-body {
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.required {
  color: #f44336;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #4CAF50;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-preview,
.avatar-placeholder,
.avatar-text {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.avatar-text {
  background: #4CAF50;
  color: white;
  font-size: 36px;
  font-weight: bold;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder i {
  font-size: 32px;
  color: #999;
}

.btn-remove {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #f44336;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-buttons {
  position: relative;
}

.btn-upload {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px dashed #ddd;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-upload:hover {
  background: #e0e0e0;
}

.camera-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 5px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 10;
}

.camera-menu button {
  display: block;
  width: 100%;
  padding: 10px 15px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

.camera-menu button:hover {
  background: #f5f5f5;
}

.camera-dialog {
  background: white;
  border-radius: 10px;
  width: 90%;
  max-width: 700px;
}

.camera-body {
  padding: 20px;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.camera-body video,
.camera-preview {
  width: 100%;
  max-width: 640px;
  height: auto;
  border-radius: 5px;
}

.camera-controls {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  width: 100%;
}

.btn-capture {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f44336;
  color: white;
  border: 4px solid white;
  cursor: pointer;
  font-size: 24px;
  transition: all 0.3s;
}

.btn-capture:hover {
  transform: scale(1.1);
}

.photo-actions {
  display: flex;
  gap: 15px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f5f5f5;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.text-muted {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .avatar-upload {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>