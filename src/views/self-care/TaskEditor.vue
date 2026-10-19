<template>
  <div class="page-container scgp-admin-page self-care-task-editor-page" v-loading="loading">
    <div class="page-header self-care-task-editor-header">
      <div class="header-left">
        <h1>{{ isEditMode ? '编辑任务' : '新建任务' }}</h1>
        <p class="subtitle">填写任务内容，再按顺序添加步骤。</p>
      </div>
      <div class="header-right">
        <el-button @click="goBack">返回</el-button>
      </div>
    </div>

    <section class="main-content scgp-page-panel self-care-task-editor-panel">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        class="self-care-task-editor-form"
      >
        <el-card shadow="never" class="editor-card">
          <template #header>
            <div class="editor-card__header">
              <span>基本信息</span>
              <span class="editor-card__hint">先给任务起个名字</span>
            </div>
          </template>

          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="名称" prop="name">
                <el-input
                  v-model="form.name"
                  maxlength="50"
                  show-word-limit
                  placeholder="例如：用勺子吃饭"
                />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :md="12">
              <el-form-item label="分类" prop="category">
                <el-select
                  v-model="form.category"
                  filterable
                  allow-create
                  default-first-option
                  placeholder="选一个分类"
                >
                  <el-option
                    v-for="item in categoryOptions"
                    :key="item.key"
                    :label="item.label"
                    :value="item.label"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="说明">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="写下孩子要练习什么"
            />
          </el-form-item>

          <el-form-item label="文件夹">
            <div class="file-field">
              <el-input :model-value="mediaFolder || '未选择文件夹'" readonly />
              <el-button @click="chooseMediaFolder">选文件夹</el-button>
            </div>
            <div class="field-hint">选文件时会从这里打开</div>
          </el-form-item>

          <el-form-item label="封面">
            <div class="file-field">
              <el-input :model-value="coverFileName || (form.coverImage ? '已添加封面' : '未添加封面')" readonly />
              <el-button :loading="choosingCover" @click="chooseCover">选图片</el-button>
              <el-button v-if="form.coverImage" text @click="clearCover">移除</el-button>
            </div>
          </el-form-item>

          <el-form-item label="标签">
            <div class="tag-editor">
              <div class="tag-editor__list">
                <el-tag
                  v-for="tag in form.tags"
                  :key="tag"
                  closable
                  class="tag-editor__tag"
                  @close="removeTag(tag)"
                >
                  {{ tag }}
                </el-tag>
                <span v-if="form.tags.length === 0" class="tag-editor__empty">还没添加标签</span>
              </div>

              <div class="tag-editor__actions">
                <el-input
                  v-model="newTag"
                  placeholder="例如：手眼配合"
                  @keyup.enter="addTag"
                />
                <el-button plain @click="addTag">添加</el-button>
              </div>
            </div>
          </el-form-item>
        </el-card>

        <el-card shadow="never" class="editor-card">
          <template #header>
            <div class="editor-card__header">
              <span>操作步骤</span>
              <span class="editor-card__hint">按实际操作顺序填写</span>
            </div>
          </template>

          <TaskTrainingEditor
            v-model="form.metadata"
            :resource-name="form.name"
            :media-folder="mediaFolder"
            :show-errors="showStepErrors"
            simple-mode
          />
        </el-card>

        <div class="editor-actions">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">
            {{ isEditMode ? '保存' : '创建' }}
          </el-button>
        </div>
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { SelfCareTaskAPI } from '@/database/self-care-task-api'
import { SELF_CARE_CATEGORY_FILTERS } from '@/features/self-care/task-gallery'
import {
  createTaskTrainingEditorModel,
  normalizeTaskTrainingEditorModel,
  validateTaskTrainingEditorModel,
} from '@/features/self-care/task-training-contract'
import TaskTrainingEditor from '@/views/resource-center/editors/TaskTrainingEditor.vue'

const router = useRouter()
const route = useRoute()
const api = new SelfCareTaskAPI()
const categoryOptions = SELF_CARE_CATEGORY_FILTERS.filter((item) => item.key !== 'all')

const taskId = computed(() => {
  const raw = Array.isArray(route.params.taskId) ? route.params.taskId[0] : route.params.taskId
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
})
const isEditMode = computed(() => taskId.value !== null)

const loading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const newTag = ref('')
const mediaFolder = ref('')
const coverFileName = ref('')
const choosingCover = ref(false)
const showStepErrors = ref(false)

const form = reactive({
  name: '',
  category: '',
  description: '',
  coverImage: '',
  tags: [] as string[],
  metadata: createTaskTrainingEditorModel(''),
})

const rules: FormRules = {
  name: [
    { required: true, message: '请填写名称', trigger: 'blur' },
    { min: 2, max: 50, message: '名称请写 2 到 50 字', trigger: 'blur' },
  ],
  category: [
    { required: true, message: '请填写分类', trigger: 'blur' },
  ],
}

function goBack() {
  router.push('/self-care/tasks')
}

async function chooseMediaFolder() {
  if (!window.electronAPI?.selectFolder) {
    ElMessage.warning('当前无法选择文件夹')
    return
  }
  try {
    const selected = await window.electronAPI.selectFolder()
    if (selected) mediaFolder.value = selected
  } catch (error) {
    console.error('[TaskEditor] 选择文件夹失败:', error)
    ElMessage.error('选择文件夹失败')
  }
}

async function chooseCover() {
  if (!window.electronAPI?.selectSelfCareMedia) {
    ElMessage.warning('请在桌面版中添加图片')
    return
  }
  choosingCover.value = true
  try {
    const selected = await window.electronAPI.selectSelfCareMedia('image', mediaFolder.value)
    if (selected) {
      form.coverImage = selected.path
      coverFileName.value = selected.fileName
    }
  } catch (error) {
    console.error('[TaskEditor] 添加封面失败:', error)
    ElMessage.error('添加封面失败')
  } finally {
    choosingCover.value = false
  }
}

function clearCover() {
  form.coverImage = ''
  coverFileName.value = ''
}

function addTag() {
  const normalized = newTag.value.trim()
  if (!normalized || form.tags.includes(normalized)) {
    newTag.value = ''
    return
  }

  form.tags.push(normalized)
  newTag.value = ''
}

function removeTag(tag: string) {
  const index = form.tags.indexOf(tag)
  if (index !== -1) {
    form.tags.splice(index, 1)
  }
}

function applyTask(task: Awaited<ReturnType<SelfCareTaskAPI['getTaskById']>>) {
  if (!task) return
  form.name = task.name
  form.category = task.category || ''
  form.description = task.description || ''
  form.coverImage = task.coverImage || ''
  coverFileName.value = ''
  form.tags = [...(task.tags || [])]
  form.metadata = normalizeTaskTrainingEditorModel(task.metadata, task.name)
}

async function loadTask() {
  if (!isEditMode.value || taskId.value === null) {
    form.metadata = createTaskTrainingEditorModel(form.name)
    return
  }

  loading.value = true
  try {
    const task = api.getTaskById(taskId.value)
    if (!task) {
      ElMessage.error('找不到这个任务')
      goBack()
      return
    }

    applyTask(task)
  } catch (error) {
    console.error('[TaskEditor] 加载任务失败:', error)
    ElMessage.error('打开任务失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!formRef.value) return
  showStepErrors.value = true

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const normalizedMetadata = normalizeTaskTrainingEditorModel(form.metadata, form.name)
  const missingStepIndex = normalizedMetadata.steps.findIndex((step) => !step.text.trim())
  if (missingStepIndex !== -1) {
    ElMessage.error(`请填写第 ${missingStepIndex + 1} 步`)
    return
  }
  const errors = validateTaskTrainingEditorModel(normalizedMetadata)
  if (errors.length > 0) {
    ElMessage.error(errors[0] || '请补全操作步骤')
    return
  }

  saving.value = true
  try {
    if (isEditMode.value && taskId.value !== null) {
      const updated = api.updateTask(taskId.value, {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        coverImage: form.coverImage,
        tags: form.tags,
        metadata: normalizedMetadata,
      })
      if (!updated) throw new Error('任务不存在')
      ElMessage.success('已保存')
    } else {
      api.createTask({
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        coverImage: form.coverImage,
        tags: form.tags,
        metadata: normalizedMetadata,
      })
      ElMessage.success('已创建')
    }

    goBack()
  } catch (error) {
    console.error('[TaskEditor] 保存任务失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadTask()
})
</script>

<style scoped>
.self-care-task-editor-panel {
  padding: 20px;
}

.self-care-task-editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-card {
  border-radius: 18px;
}

.editor-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.editor-card__hint {
  color: #909399;
  font-size: 13px;
}

.tag-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.file-field {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.field-hint {
  color: #909399;
  font-size: 12px;
}

.tag-editor__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.tag-editor__tag {
  margin-right: 0;
}

.tag-editor__empty {
  color: #909399;
  font-size: 13px;
}

.tag-editor__actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .self-care-task-editor-panel {
    padding: 16px;
  }

  .editor-card__header,
  .tag-editor__actions,
  .file-field,
  .editor-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
