<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>{{ props.editingStudent ? '编辑学生' : '添加学生' }}</h2>
        <button class="btn-close" @click="$emit('close')">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <form @submit.prevent="submitStudentForm" class="dialog-body">
        <div class="form-row">
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

          <div class="form-group">
            <label for="studentNo">学号</label>
            <input
              id="studentNo"
              v-model="studentForm.student_no"
              type="text"
              placeholder="可选，留空则自动生成"
            />
          </div>
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
            <el-date-picker
              id="birthday"
              v-model="studentForm.birthday"
              type="date"
              v-bind="standardDatePickerProps"
              class="form-date-picker"
              :disabled-date="disableFutureDates"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="disorder">诊断类型</label>
            <select id="disorder" v-model="studentForm.disorder">
              <option value="">请选择</option>
              <option v-for="option in diagnosisOptions" :key="option" :value="option">
                {{ option }}
              </option>
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
              当前学年暂无可用班级，请先创建班级。
            </small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="guardian_name">监护人姓名</label>
            <input id="guardian_name" v-model="studentForm.guardian_name" type="text" placeholder="如：陈爱国" />
          </div>
          <div class="form-group">
            <label for="guardian_relation">与学生关系</label>
            <select id="guardian_relation" v-model="studentForm.guardian_relation">
              <option value="">请选择</option>
              <option v-for="rel in GUARDIAN_RELATIONS" :key="rel" :value="rel">{{ rel }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="guardian_phone">监护人电话</label>
            <input id="guardian_phone" v-model="studentForm.guardian_phone" type="tel" placeholder="用于家长沟通与紧急联系" />
          </div>
          <div class="form-group">
            <label for="registry_no">学籍号</label>
            <input id="registry_no" v-model="studentForm.registry_no" type="text" placeholder="全国学籍号（G 开头 19 位）" />
          </div>
        </div>

        <div class="form-group">
          <label for="health_notes">健康备注</label>
          <textarea
            id="health_notes"
            v-model="studentForm.health_notes"
            rows="2"
            placeholder="既往病史 / 过敏史 / 用药情况等训练安全须知（选填）"
          ></textarea>
        </div>

        <div class="form-group">
          <label>头像</label>
          <AvatarPicker
            v-model="avatarPreview"
            :presets="studentAvatarPresets"
            preset-label="学生预置头像"
            :fallback-name="studentForm.name"
            :fallback-tone="studentForm.gender === '女' ? 'student-female' : 'student-male'"
          >
            <template #preview="{ avatarUrl }">
              <StudentAvatar
                :name="studentForm.name"
                :gender="studentForm.gender || undefined"
                :avatar-url="avatarUrl"
                size="lg"
              />
            </template>
          </AvatarPicker>
        </div>
        <div class="dialog-footer">
          <button type="button" class="btn-secondary" @click="$emit('close')">取消</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </form>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useStudentStore } from '@/stores/student'
import { classAPI } from '@/database/class-api'
import { ClassChangeReason, getCurrentAcademicYear } from '@/types/class'
import type { ClassInfo } from '@/types/class'
import { STANDARD_DATE_PICKER_PROPS, disableFutureDates } from '@/utils/date-picker'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import AvatarPicker from '@/components/common/AvatarPicker.vue'
import { STUDENT_AVATAR_PRESETS } from '@/utils/avatar-presets'
import { DIAGNOSIS_OPTIONS } from '@/utils/student-display'

const emit = defineEmits<{
  close: []
  saved: []
}>()

type StudentGender = '\u7537' | '\u5973'

interface EditableStudent {
  id: number
  name?: string
  gender?: StudentGender
  birthday?: string
  student_no?: string
  disorder?: string
  avatar_path?: string
  current_class_id?: number | null
  current_class_name?: string | null
  guardian_name?: string | null
  guardian_relation?: string | null
  guardian_phone?: string | null
  health_notes?: string | null
  registry_no?: string | null
}

interface StudentFormState {
  name: string
  gender: StudentGender | ''
  birthday: string
  student_no: string
  disorder: string
  classId: number | null
  guardian_name: string
  guardian_relation: string
  guardian_phone: string
  health_notes: string
  registry_no: string
}

const props = defineProps<{
  editingStudent?: EditableStudent
}>()

const studentStore = useStudentStore()
const standardDatePickerProps = STANDARD_DATE_PICKER_PROPS
const diagnosisOptions = DIAGNOSIS_OPTIONS
const studentAvatarPresets = STUDENT_AVATAR_PRESETS
const GUARDIAN_RELATIONS = ['父亲', '母亲', '祖父', '祖母', '外祖父', '外祖母', '其他亲属', '监护人']

const saving = ref(false)
const avatarPreview = ref('')
const availableClasses = ref<ClassInfo[]>([])
// 编辑打开时学生当前班级所属学年（调班按该学年写历史行）。
// 由 loadAvailableClasses 完成后调用 resolveEditingEnrollmentYear 填充；
// 若学生停留在往年班级（不在当前学年班级列表），置 null 表示「跨学年调班需走学生分班页」
const editingEnrollmentYear = ref<string | null>(getCurrentAcademicYear())

/** 编辑模式下解析学生当前班级的学年；返回 null 表示跨学年场景，弹窗不支持调班 */
const resolveEditingEnrollmentYear = (): string | null => {
  if (!props.editingStudent?.current_class_id) return getCurrentAcademicYear()
  const currentClass = availableClasses.value.find((c) => c.id === props.editingStudent?.current_class_id)
  // 学生所在班不在当前学年列表（往年班/已停用）→ 跨学年场景
  return currentClass ? currentClass.academicYear : null
}

function createEmptyStudentForm(): StudentFormState {
  return {
    name: '',
    gender: '',
    birthday: '',
    student_no: '',
    disorder: '',
    classId: null,
    guardian_name: '',
    guardian_relation: '',
    guardian_phone: '',
    health_notes: '',
    registry_no: ''
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误'
}

function normalizeDiagnosisValue(value?: string): string {
  const normalized = value?.replace(/\s+/g, '').trim() || ''
  if (!normalized) return ''
  if (normalized.includes('视力障碍')) return '视力障碍'
  if (normalized.includes('听力障碍')) return '听力障碍'
  if (normalized.includes('言语障碍') || normalized.includes('语言障碍')) return '言语障碍'
  if (normalized.includes('智力障碍')) return '智力障碍'
  if (normalized.includes('肢体障碍')) return '肢体障碍'
  if (normalized.includes('精神障碍') || normalized.includes('ASD') || normalized.includes('ADHD') || normalized.includes('EBD')) return '精神障碍'
  if (normalized.includes('多重障碍')) return '多重障碍'
  if (normalized.includes('学习障碍')) return '学习障碍'
  if (normalized.includes('发育迟缓')) return '发育迟缓'
  return value?.trim() || ''
}

const studentForm = ref<StudentFormState>({
  name: '',
  gender: '',
  birthday: '',
  student_no: '',
  disorder: '',
  classId: null as number | null,
  guardian_name: '',
  guardian_relation: '',
  guardian_phone: '',
  health_notes: '',
  registry_no: ''
})

const submitStudentForm = async () => {
  try {
    saving.value = true

    if (!studentForm.value.name.trim()) {
      ElMessage.error('请输入学生姓名')
      return
    }

    const normalizedGender = studentForm.value.gender
    if (normalizedGender !== '男' && normalizedGender !== '女') {
      ElMessage.error('请选择性别')
      return
    }

    if (!studentForm.value.birthday) {
      ElMessage.error('请选择出生日期')
      return
    }

    if (!studentForm.value.student_no) {
      studentForm.value.student_no = `STU${Date.now()}`
    }

    studentForm.value.disorder = normalizeDiagnosisValue(studentForm.value.disorder)
    const finalAvatarPath = avatarPreview.value

    if (props.editingStudent) {
      // 编辑模式调班前置检查（必须在 updateStudent 之前——确认框取消/阻断时不得已落库基础字段）
      const originalClassId = props.editingStudent.current_class_id ?? null
      const newClassId = studentForm.value.classId
      const classChanged = newClassId !== originalClassId
      if (classChanged && editingEnrollmentYear.value === null) {
        // 学生停留在往年班级（跨学年）：弹窗只支持同学年调班，学年升级/跨学年调班走学生分班页
        alert('该学生当前班级属于往一学年，调班请到「学生分班」页完成学年升级或跨学年调班操作。')
        return
      }
      if (classChanged && !newClassId) {
        // 从有班改为「暂不分班」：退出班级是破坏性操作，先确认（未确认前不落库任何字段）
        try {
          await ElMessageBox.confirm(
            `确定将学生从「${props.editingStudent.current_class_name ?? '当前班级'}」退出吗？该学生的班级历史将关闭。`,
            '暂不分班',
            { confirmButtonText: '确定退出', cancelButtonText: '取消', type: 'warning' }
          )
        } catch {
          return // 用户取消，不保存任何改动
        }
      }

      const { classId: _classId, ...studentData } = studentForm.value
      await studentStore.updateStudent(props.editingStudent.id, {
        ...studentData,
        gender: normalizedGender,
        avatar_path: finalAvatarPath || '',
      })

      // 编辑模式调班：与学生分班页同走 assignStudentToClass
      //（同学年内 = UPDATE 现有历史行 + 显式人数对账；跨学年场景已在上方阻断）
      if (classChanged && props.editingStudent.name) {
        const today = new Date()
        const enrollmentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const studentName = studentForm.value.name // 用表单最新姓名，改名+调班同次保存时历史行不写旧名（R2 N1）
        if (!newClassId) {
          try {
            await classAPI.removeStudentFromClass(props.editingStudent.id, ClassChangeReason.ADJUST)
          } catch (error: unknown) {
            console.warn('退出班级失败:', error)
            alert('学生信息已保存，但退出班级失败：' + getErrorMessage(error))
          }
        } else {
          try {
            await classAPI.assignStudentToClass(
              props.editingStudent.id,
              studentName,
              newClassId,
              editingEnrollmentYear.value as string,
              enrollmentDate
            )
          } catch (error: unknown) {
            console.warn('调班失败:', error)
            alert('学生信息已保存，但调班失败：' + getErrorMessage(error))
          }
        }
      }
    } else {
      const { classId, ...studentData } = studentForm.value
      const studentId = await studentStore.addStudent({
        ...studentData,
        gender: normalizedGender,
        avatar_path: finalAvatarPath || '',
      })

      if (classId && studentForm.value.name) {
        try {
          const academicYear = getCurrentAcademicYear()
          const enrollmentDate = new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10)
          await classAPI.assignStudentToClass(
            studentId,
            studentForm.value.name,
            classId,
            academicYear,
            enrollmentDate
          )
        } catch (error: unknown) {
          console.warn('班级分配失败:', error)
          alert('学生添加成功，但班级分配失败：' + getErrorMessage(error))
        }
      }
    }

    emit('saved')
  } catch (error: unknown) {
    console.error(props.editingStudent ? '更新学生失败:' : '添加学生失败:', error)
    alert((props.editingStudent ? '更新失败：' : '添加失败：') + getErrorMessage(error))
  } finally {
    saving.value = false
  }
}

const initializeForm = () => {
  if (props.editingStudent) {
    // 回显学生当前班级（编辑前下拉为空的根因：此前硬编码 classId: null）
    studentForm.value = {
      name: props.editingStudent.name || '',
      gender: props.editingStudent.gender || '',
      birthday: props.editingStudent.birthday || '',
      student_no: props.editingStudent.student_no || '',
      disorder: normalizeDiagnosisValue(props.editingStudent.disorder),
      classId: props.editingStudent.current_class_id ?? null,
      guardian_name: props.editingStudent.guardian_name || '',
      guardian_relation: props.editingStudent.guardian_relation || '',
      guardian_phone: props.editingStudent.guardian_phone || '',
      health_notes: props.editingStudent.health_notes || '',
      registry_no: props.editingStudent.registry_no || ''
    }
    avatarPreview.value = props.editingStudent.avatar_path || ''
    // 学年由 resolveEditingEnrollmentYear 在班级列表加载后解析（initializeForm 时列表未加载，
    // 在这里查 availableClasses 永远落空——评审 R1#1 的时序缺陷）
  } else {
    studentForm.value = createEmptyStudentForm()
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
  // 学年解析必须在班级列表加载之后（评审 R1#1：initializeForm 时列表为空，find 恒落空）
  editingEnrollmentYear.value = resolveEditingEnrollmentYear()
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
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

.form-date-picker {
  width: 100%;
}

.form-date-picker :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 5px;
  box-shadow: 0 0 0 1px #ddd inset;
  padding: 0 15px;
}

.form-date-picker :deep(.el-input__wrapper:hover),
.form-date-picker :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4CAF50 inset;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-preview-shell {
  position: relative;
  display: inline-flex;
}

.btn-remove {
  position: absolute;
  top: -6px;
  right: -6px;
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
  background: #409eff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #337ecc;
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
