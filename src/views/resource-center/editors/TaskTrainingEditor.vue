<template>
  <div class="task-training-editor">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="自理任务步骤编辑器"
      description="任务训练继续挂 life_skills 授权，步骤结构统一保存到 meta_data.steps[]，本期不恢复旧 task_step 表。"
    />

    <el-alert
      v-if="validationErrors.length > 0"
      type="warning"
      :closable="false"
      show-icon
      title="当前还有未完成项"
      class="validation-alert"
    >
      <template #default>
        <ul class="validation-list">
          <li v-for="error in validationErrors" :key="error">{{ error }}</li>
        </ul>
      </template>
    </el-alert>

    <el-form
      label-position="top"
      require-asterisk-position="right"
      class="editor-form"
    >
      <el-card shadow="never" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>任务基础信息</span>
            <el-tag size="small" type="success">结构化元数据</el-tag>
          </div>
        </template>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <el-form-item label="旧任务编码">
              <el-input
                :model-value="modelValue.legacyTaskCode || ''"
                placeholder="例如 EAT_SPOON_001"
                @update:model-value="updateOptionalField('legacyTaskCode', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="训练入口">
              <el-input :model-value="modelValue.trainingEntryCode" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="6">
            <el-form-item label="一级分类 ID">
              <el-input
                :model-value="toInputNumber(modelValue.category?.parentId)"
                placeholder="例如 1"
                @update:model-value="updateCategoryNumber('parentId', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="6">
            <el-form-item label="一级分类名称">
              <el-input
                :model-value="modelValue.category?.parentName || ''"
                placeholder="例如 进食技能"
                @update:model-value="updateCategoryText('parentName', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="6">
            <el-form-item label="二级分类 ID">
              <el-input
                :model-value="toInputNumber(modelValue.category?.childId)"
                placeholder="例如 11"
                @update:model-value="updateCategoryNumber('childId', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="6">
            <el-form-item label="二级分类名称">
              <el-input
                :model-value="modelValue.category?.childName || ''"
                placeholder="例如 使用勺子"
                @update:model-value="updateCategoryText('childName', $event)"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <el-form-item label="能力项编码">
              <el-input
                :model-value="modelValue.abilityItem?.id || ''"
                placeholder="例如 feed_01"
                @update:model-value="updateAbilityText('id', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="能力项名称">
              <el-input
                :model-value="modelValue.abilityItem?.name || ''"
                placeholder="例如 独立进食"
                @update:model-value="updateAbilityText('name', $event)"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <el-card shadow="never" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>任务步骤</span>
            <el-button type="primary" plain @click="addStep">新增步骤</el-button>
          </div>
        </template>

        <div class="step-list">
          <el-card
            v-for="(step, stepIndex) in modelValue.steps"
            :key="step.id"
            shadow="never"
            class="step-card"
          >
            <template #header>
              <div class="card-header">
                <span>步骤 {{ step.seq }}</span>
                <div class="step-actions">
                  <el-tag size="small" effect="plain">{{ step.id }}</el-tag>
                  <el-button
                    text
                    type="danger"
                    :disabled="modelValue.steps.length <= 1"
                    @click="removeStep(stepIndex)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col :xs="24" :md="8">
                <el-form-item label="步骤 ID">
                  <el-input
                    :model-value="step.id"
                    placeholder="例如 step_1"
                    @update:model-value="updateStepField(stepIndex, 'id', $event)"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="16">
                <el-form-item label="步骤说明" required :error="!step.text.trim() ? '请填写步骤说明' : ''">
                  <el-input
                    :model-value="step.text"
                    placeholder="例如 拿起勺子"
                    @update:model-value="updateStepField(stepIndex, 'text', $event)"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16">
              <el-col :xs="24" :md="8">
                <el-form-item label="图片路径">
                  <el-input
                    :model-value="step.imagePath || ''"
                    placeholder="resource://images/self-care/step-1.png"
                    @update:model-value="updateStepMediaField(stepIndex, 'imagePath', $event)"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="视频路径">
                  <el-input
                    :model-value="step.videoPath || ''"
                    placeholder="resource://videos/self-care/step-1.mp4"
                    @update:model-value="updateStepMediaField(stepIndex, 'videoPath', $event)"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="音频路径">
                  <el-input
                    :model-value="step.audioPath || ''"
                    placeholder="resource://audio/self-care/step-1.mp3"
                    @update:model-value="updateStepMediaField(stepIndex, 'audioPath', $event)"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
        </div>
      </el-card>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  TaskTrainingAbilityItemMeta,
  TaskTrainingCategoryMeta,
  TaskTrainingResourceMeta,
  TaskTrainingStep,
} from '@/features/self-care/task-training-contract'
import {
  createTaskTrainingStep,
  validateTaskTrainingEditorModel,
} from '@/features/self-care/task-training-contract'
import { normalizePresetResourcePathForStorage } from '@/utils/preset-resource'

interface Props {
  modelValue: TaskTrainingResourceMeta
  resourceName?: string
}

const props = withDefaults(defineProps<Props>(), {
  resourceName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: TaskTrainingResourceMeta): void
}>()

const validationErrors = computed(() =>
  validateTaskTrainingEditorModel(reindexSteps({
    ...props.modelValue,
    steps: props.modelValue.steps.map((step) => ({ ...step })),
  }))
)

function emitModel(nextModel: TaskTrainingResourceMeta) {
  emit('update:modelValue', reindexSteps(nextModel))
}

function reindexSteps(model: TaskTrainingResourceMeta): TaskTrainingResourceMeta {
  return {
    ...model,
    steps: model.steps.map((step, index) => ({
      ...step,
      id: (step.id || `step_${index + 1}`).trim(),
      seq: index + 1,
    })),
  }
}

function updateOptionalField<K extends keyof TaskTrainingResourceMeta>(key: K, value: string) {
  emitModel({
    ...props.modelValue,
    [key]: value.trim() ? value.trim() : undefined,
  })
}

function toInputNumber(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : ''
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function updateCategory(nextCategory: TaskTrainingCategoryMeta | undefined) {
  emitModel({
    ...props.modelValue,
    category: nextCategory && Object.values(nextCategory).some((item) => item !== undefined)
      ? nextCategory
      : undefined,
  })
}

function updateCategoryNumber(key: keyof Pick<TaskTrainingCategoryMeta, 'parentId' | 'childId'>, value: string) {
  updateCategory({
    ...(props.modelValue.category || {}),
    [key]: toOptionalNumber(value),
  })
}

function updateCategoryText(
  key: keyof Pick<TaskTrainingCategoryMeta, 'parentName' | 'childName'>,
  value: string,
) {
  updateCategory({
    ...(props.modelValue.category || {}),
    [key]: value.trim() || undefined,
  })
}

function updateAbility(nextAbility: TaskTrainingAbilityItemMeta | undefined) {
  emitModel({
    ...props.modelValue,
    abilityItem: nextAbility && (nextAbility.id || nextAbility.name)
      ? nextAbility
      : undefined,
  })
}

function updateAbilityText(key: keyof TaskTrainingAbilityItemMeta, value: string) {
  updateAbility({
    ...(props.modelValue.abilityItem || { id: '', name: '' }),
    [key]: value.trim(),
  })
}

function replaceStep(stepIndex: number, nextStep: TaskTrainingStep) {
  const nextSteps = [...props.modelValue.steps]
  nextSteps[stepIndex] = nextStep
  emitModel({
    ...props.modelValue,
    steps: nextSteps,
  })
}

function updateStepField<K extends keyof Pick<TaskTrainingStep, 'id' | 'text'>>(
  stepIndex: number,
  key: K,
  value: TaskTrainingStep[K],
) {
  const currentStep = props.modelValue.steps[stepIndex]
  if (!currentStep) return
  replaceStep(stepIndex, {
    ...currentStep,
    [key]: typeof value === 'string' ? value : currentStep[key],
  })
}

function updateStepMediaField(
  stepIndex: number,
  key: keyof Pick<TaskTrainingStep, 'imagePath' | 'videoPath' | 'audioPath'>,
  value: string,
) {
  const currentStep = props.modelValue.steps[stepIndex]
  if (!currentStep) return
  const normalized = normalizePresetResourcePathForStorage(value)
  replaceStep(stepIndex, {
    ...currentStep,
    [key]: normalized || undefined,
  })
}

function addStep() {
  emitModel({
    ...props.modelValue,
    steps: [...props.modelValue.steps, createTaskTrainingStep(props.modelValue.steps.length)],
  })
}

function removeStep(stepIndex: number) {
  if (props.modelValue.steps.length <= 1) return
  const nextSteps = [...props.modelValue.steps]
  nextSteps.splice(stepIndex, 1)
  emitModel({
    ...props.modelValue,
    steps: nextSteps,
  })
}
</script>

<style scoped>
.task-training-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-card,
.step-card {
  border-radius: 16px;
}

.validation-alert {
  margin-bottom: 4px;
}

.validation-list {
  margin: 0;
  padding-left: 18px;
  color: #c45656;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .card-header,
  .step-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
