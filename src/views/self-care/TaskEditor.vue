<template>
  <div class="page-container scgp-admin-page self-care-task-editor-page" v-loading="loading">
    <div class="page-header self-care-task-editor-header">
      <div class="header-left">
        <h1>{{ isEditMode ? '编辑自理任务' : '新建自理任务' }}</h1>
        <p class="subtitle">
          任务资源继续保存到 `sys_training_resource`，授权继续挂接 `life_skills`。
        </p>
      </div>
      <div class="header-right">
        <el-button @click="goBack">返回任务列表</el-button>
      </div>
    </div>

    <section class="main-content scgp-page-panel self-care-task-editor-panel">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
        class="self-care-task-editor-form"
      >
        <el-card shadow="never" class="editor-card">
          <template #header>
            <div class="editor-card__header">
              <span>资源基础信息</span>
              <el-tag size="small" type="primary">{{ isEditMode ? '编辑模式' : '新建模式' }}</el-tag>
            </div>
          </template>

          <el-row :gutter="16">
            <el-col :xs="24" :md="12">
              <el-form-item label="任务名称" prop="name">
                <el-input
                  v-model="form.name"
                  maxlength="50"
                  show-word-limit
                  placeholder="例如：使用勺子进食"
                />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :md="12">
              <el-form-item label="所属分类" prop="category">
                <el-input
                  v-model="form.category"
                  placeholder="例如：selfcare"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="任务描述">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="补充教学目标、执行提示或适用说明"
            />
          </el-form-item>

          <el-form-item label="封面路径">
            <el-input
              v-model="form.coverImage"
              placeholder="resource://images/self-care/cover.png"
            />
          </el-form-item>

          <el-form-item label="能力标签">
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
                <span v-if="form.tags.length === 0" class="tag-editor__empty">暂无标签</span>
              </div>

              <div class="tag-editor__actions">
                <el-input
                  v-model="newTag"
                  placeholder="输入标签后回车"
                  @keyup.enter="addTag"
                />
                <el-button plain @click="addTag">添加标签</el-button>
              </div>
            </div>
          </el-form-item>
        </el-card>

        <el-card shadow="never" class="editor-card">
          <template #header>
            <div class="editor-card__header">
              <span>任务步骤配置</span>
              <span class="editor-card__hint">与资源中心共用同一套任务元数据编辑器</span>
            </div>
          </template>

          <TaskTrainingEditor
            v-model="form.metadata"
            :resource-name="form.name"
          />
        </el-card>

        <div class="editor-actions">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">
            {{ isEditMode ? '保存修改' : '创建任务' }}
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
import {
  createTaskTrainingEditorModel,
  normalizeTaskTrainingEditorModel,
  validateTaskTrainingEditorModel,
} from '@/features/self-care/task-training-contract'
import TaskTrainingEditor from '@/views/resource-center/editors/TaskTrainingEditor.vue'

const router = useRouter()
const route = useRoute()
const api = new SelfCareTaskAPI()

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
    { required: true, message: '请输入任务名称', trigger: 'blur' },
    { min: 2, max: 50, message: '任务名称长度需为 2-50 个字符', trigger: 'blur' },
  ],
  category: [
    { required: true, message: '请输入任务分类', trigger: 'blur' },
  ],
}

function goBack() {
  router.push('/self-care/tasks')
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
      ElMessage.error('未找到对应的自理任务')
      goBack()
      return
    }

    applyTask(task)
  } catch (error) {
    console.error('[TaskEditor] 加载任务失败:', error)
    ElMessage.error('加载任务失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const normalizedMetadata = normalizeTaskTrainingEditorModel(form.metadata, form.name)
  const errors = validateTaskTrainingEditorModel(normalizedMetadata)
  if (errors.length > 0) {
    ElMessage.error(errors[0] || '任务步骤配置未完成')
    return
  }

  saving.value = true
  try {
    if (isEditMode.value && taskId.value !== null) {
      api.updateTask(taskId.value, {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        coverImage: form.coverImage || undefined,
        tags: form.tags,
        metadata: normalizedMetadata,
      })
      ElMessage.success('任务已保存')
    } else {
      api.createTask({
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        coverImage: form.coverImage || undefined,
        tags: form.tags,
        metadata: normalizedMetadata,
      })
      ElMessage.success('任务已创建')
    }

    goBack()
  } catch (error) {
    console.error('[TaskEditor] 保存任务失败:', error)
    ElMessage.error('保存任务失败')
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
  .editor-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
