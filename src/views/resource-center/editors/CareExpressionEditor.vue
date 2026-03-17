<template>
  <div class="care-editor">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="表达关心可视化编辑器"
      description="按“基础信息 - 表达者视角 - 接收者视角”分区配置，保存时会自动按当前契约归一化。"
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
            <span>基础信息区</span>
            <el-tag size="small" type="success">必填优先</el-tag>
          </div>
        </template>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <el-form-item label="场景编码" required :error="sceneCodeError">
              <el-input
                :model-value="modelValue.sceneCode"
                placeholder="例如 care_scene_exam_fail_001"
                @update:model-value="updateField('sceneCode', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="情境标题" required :error="titleError">
              <el-input
                :model-value="modelValue.title"
                :placeholder="resourceName || '请输入情境标题'"
                @update:model-value="updateField('title', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="情境图片 URL">
              <el-input
                :model-value="modelValue.imageUrl"
                placeholder="resource:// 或封面图路径"
                @update:model-value="updateField('imageUrl', $event)"
              >
                <template #append>
                  <el-button disabled>上传占位</el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="主导类型">
              <el-select
                :model-value="modelValue.careType"
                style="width: 100%"
                @update:model-value="updateField('careType', $event)"
              >
                <el-option
                  v-for="option in careTypeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="难度等级">
              <el-segmented
                :model-value="modelValue.difficultyLevel"
                :options="difficultyOptions"
                @change="updateField('difficultyLevel', $event as 1 | 2 | 3)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="接收者情绪">
              <el-select
                :model-value="modelValue.receiverEmotion"
                style="width: 100%"
                @update:model-value="handleEmotionChange"
              >
                <el-option
                  v-for="emotion in emotionOptions"
                  :key="emotion.value"
                  :label="emotion.label"
                  :value="emotion.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="能力层级">
              <el-select
                :model-value="modelValue.abilityLevel"
                clearable
                style="width: 100%"
                placeholder="请选择能力层级"
                @update:model-value="updateField('abilityLevel', $event)"
              >
                <el-option label="初阶" value="primary" />
                <el-option label="中阶" value="middle" />
                <el-option label="高阶" value="advanced" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <el-form-item label="表达者视角提示" required :error="speakerPromptError">
              <el-input
                :model-value="modelValue.speakerPerspectiveText"
                type="textarea"
                :rows="3"
                placeholder="请输入表达者视角引导语"
                @update:model-value="updateField('speakerPerspectiveText', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="接收者视角提示" required :error="receiverPromptError">
              <el-input
                :model-value="modelValue.receiverPerspectiveText"
                type="textarea"
                :rows="3"
                placeholder="请输入接收者视角引导语"
                @update:model-value="updateField('receiverPerspectiveText', $event)"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="color-preview" :style="{ borderColor: colorMeta.hex, background: `${colorMeta.hex}12` }">
          <span class="color-dot" :style="{ backgroundColor: colorMeta.hex }"></span>
          <strong>{{ colorMeta.label }}</strong>
          <span>{{ colorMeta.hex }}</span>
        </div>
      </el-card>

      <el-card shadow="never" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>表达者视角配置</span>
            <el-button type="primary" plain @click="addUtterance">新增话术</el-button>
          </div>
        </template>

        <div class="stack-list">
          <el-card
            v-for="(utterance, utteranceIndex) in modelValue.utterances"
            :key="utterance.id"
            shadow="never"
            class="nested-card"
          >
            <template #header>
              <div class="card-header">
                <span>话术 {{ utteranceIndex + 1 }}</span>
                <div class="header-actions">
                  <el-checkbox
                    :model-value="modelValue.preferredUtteranceIds.includes(utterance.id)"
                    @update:model-value="togglePreferredUtterance(utterance.id, $event)"
                  >
                    推荐话术
                  </el-checkbox>
                  <el-button
                    text
                    type="danger"
                    :disabled="modelValue.utterances.length <= 1"
                    @click="removeUtterance(utteranceIndex)"
                  >
                    删除话术
                  </el-button>
                </div>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col :xs="24" :md="8">
                <el-form-item label="话术编号">
                  <el-input
                    :model-value="utterance.id"
                    @update:model-value="updateUtteranceField(utteranceIndex, 'id', $event)"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="话术类型">
                  <el-select
                    :model-value="utterance.type"
                    style="width: 100%"
                    @update:model-value="updateUtteranceField(utteranceIndex, 'type', $event)"
                  >
                    <el-option
                      v-for="option in careTypeOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="反应表情">
                  <el-select
                    :model-value="utterance.receiverReactionEmoji || ''"
                    clearable
                    allow-create
                    default-first-option
                    filterable
                    style="width: 100%"
                    placeholder="选择或输入 emoji"
                    @update:model-value="updateUtteranceOptionalField(utteranceIndex, 'receiverReactionEmoji', $event || '')"
                  >
                    <el-option
                      v-for="emoji in emojiOptions"
                      :key="emoji"
                      :label="emoji"
                      :value="emoji"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="话术文字" :error="!utterance.text.trim() ? '请填写话术文字' : ''">
              <el-input
                :model-value="utterance.text"
                placeholder="请输入老师希望学生练习的话术"
                @update:model-value="updateUtteranceField(utteranceIndex, 'text', $event)"
              />
            </el-form-item>

            <el-form-item label="使用效果说明" :error="!utterance.effect.trim() ? '请填写效果说明' : ''">
              <el-input
                :model-value="utterance.effect"
                type="textarea"
                :rows="2"
                placeholder="说明这句话会让对方有什么感受"
                @update:model-value="updateUtteranceField(utteranceIndex, 'effect', $event)"
              />
            </el-form-item>

            <el-form-item label="接收者反应文字">
              <el-input
                :model-value="utterance.receiverReactionText || ''"
                placeholder="例如：听到后会觉得被理解"
                @update:model-value="updateUtteranceOptionalField(utteranceIndex, 'receiverReactionText', $event)"
              />
            </el-form-item>
          </el-card>
        </div>
      </el-card>

      <el-card shadow="never" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>接收者视角配置</span>
            <el-button type="primary" plain @click="addReceiverOption">新增选项</el-button>
          </div>
        </template>

        <div class="stack-list">
          <el-card
            v-for="(option, optionIndex) in modelValue.receiverOptions"
            :key="option.id"
            shadow="never"
            class="nested-card"
          >
            <template #header>
              <div class="card-header">
                <span>接收者选项 {{ optionIndex + 1 }}</span>
                <el-button
                  text
                  type="danger"
                  :disabled="modelValue.receiverOptions.length <= 1"
                  @click="removeReceiverOption(optionIndex)"
                >
                  删除选项
                </el-button>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col :xs="24" :md="8">
                <el-form-item label="选项编号">
                  <el-input
                    :model-value="option.id"
                    @update:model-value="updateReceiverOptionField(optionIndex, 'id', $event)"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="是否最舒服">
                  <el-switch
                    :model-value="option.isComforting"
                    inline-prompt
                    active-text="是"
                    inactive-text="否"
                    @update:model-value="setComfortingOption(optionIndex, $event)"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="话术文字" :error="!option.text.trim() ? '请填写话术文字' : ''">
              <el-input
                :model-value="option.text"
                placeholder="请输入接收者视角下听到的话"
                @update:model-value="updateReceiverOptionField(optionIndex, 'text', $event)"
              />
            </el-form-item>

            <el-form-item label="原因解释" :error="!option.reasonText.trim() ? '请填写原因解释' : ''">
              <el-input
                :model-value="option.reasonText"
                type="textarea"
                :rows="2"
                placeholder="说明为什么这句话听起来更舒服或更有压力"
                @update:model-value="updateReceiverOptionField(optionIndex, 'reasonText', $event)"
              />
            </el-form-item>
          </el-card>
        </div>
      </el-card>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  CareSceneReceiverOption,
  CareSceneResourceMeta,
  CareSceneUtterance,
  EmotionalBaseEmotion,
} from '@/types/emotional'
import {
  CARE_TYPE_OPTIONS,
  createCareSceneReceiverOption,
  createCareSceneUtterance,
  EMOTION_COLOR_PRESETS,
  validateCareSceneEditorModel,
} from './emotional-resource-contract'

interface Props {
  modelValue: CareSceneResourceMeta
  resourceName?: string
}

const props = withDefaults(defineProps<Props>(), {
  resourceName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: CareSceneResourceMeta): void
}>()

const emojiOptions = ['🙂', '😊', '😌', '🤗', '🥹', '💛', '👍', '🌤️']

const emotionOptions: Array<{ value: EmotionalBaseEmotion; label: string }> = [
  { value: 'happy', label: '开心' },
  { value: 'sad', label: '失落' },
  { value: 'embarrassed', label: '尴尬' },
  { value: 'angry', label: '生气' },
  { value: 'scared', label: '害怕' },
]

const difficultyOptions = [
  { label: '1 级', value: 1 },
  { label: '2 级', value: 2 },
  { label: '3 级', value: 3 },
]

const careTypeOptions = CARE_TYPE_OPTIONS
const colorMeta = computed(() => EMOTION_COLOR_PRESETS[props.modelValue.receiverEmotion || 'sad'])
const validationErrors = computed(() => validateCareSceneEditorModel(props.modelValue))
const titleError = computed(() => (!props.modelValue.title.trim() ? '请填写情境标题' : ''))
const sceneCodeError = computed(() => (!props.modelValue.sceneCode.trim() ? '请填写场景编码' : ''))
const speakerPromptError = computed(() => (
  !props.modelValue.speakerPerspectiveText.trim() ? '请填写表达者视角提示' : ''
))
const receiverPromptError = computed(() => (
  !props.modelValue.receiverPerspectiveText.trim() ? '请填写接收者视角提示' : ''
))

function emitModel(nextModel: CareSceneResourceMeta) {
  emit('update:modelValue', nextModel)
}

function updateField<K extends keyof CareSceneResourceMeta>(key: K, value: CareSceneResourceMeta[K]) {
  emitModel({
    ...props.modelValue,
    [key]: value,
  })
}

function handleEmotionChange(value: EmotionalBaseEmotion) {
  const color = EMOTION_COLOR_PRESETS[value]
  emitModel({
    ...props.modelValue,
    receiverEmotion: value,
    emotionColorToken: color.token,
    emotionColorHex: color.hex,
    emotionColorLabel: color.label,
  })
}

function addUtterance() {
  emitModel({
    ...props.modelValue,
    utterances: [...props.modelValue.utterances, createCareSceneUtterance(props.modelValue.utterances.length)],
  })
}

function removeUtterance(utteranceIndex: number) {
  if (props.modelValue.utterances.length <= 1) return

  const nextUtterances = [...props.modelValue.utterances]
  const removed = nextUtterances.splice(utteranceIndex, 1)[0]
  const nextPreferredIds = props.modelValue.preferredUtteranceIds.filter((id) => id !== removed?.id)

  emitModel({
    ...props.modelValue,
    utterances: nextUtterances,
    preferredUtteranceIds:
      nextPreferredIds.length > 0 ? nextPreferredIds : nextUtterances.slice(0, 1).map((item) => item.id),
  })
}

function updateUtteranceField<K extends keyof CareSceneUtterance>(
  utteranceIndex: number,
  key: K,
  value: CareSceneUtterance[K]
) {
  const nextUtterances = [...props.modelValue.utterances]
  const currentUtterance = nextUtterances[utteranceIndex]
  if (!currentUtterance) return

  const previousId = currentUtterance.id
  nextUtterances[utteranceIndex] = {
    ...currentUtterance,
    [key]: value,
  }

  let nextPreferredIds = [...props.modelValue.preferredUtteranceIds]
  if (key === 'id' && typeof value === 'string' && previousId !== value) {
    nextPreferredIds = nextPreferredIds.map((id) => (id === previousId ? value : id))
  }

  emitModel({
    ...props.modelValue,
    utterances: nextUtterances,
    preferredUtteranceIds: nextPreferredIds,
  })
}

function updateUtteranceOptionalField<K extends keyof CareSceneUtterance>(
  utteranceIndex: number,
  key: K,
  value: string
) {
  updateUtteranceField(utteranceIndex, key, (value.trim() ? value : undefined) as CareSceneUtterance[K])
}

function togglePreferredUtterance(utteranceId: string, checked: boolean | string | number) {
  const isChecked = Boolean(checked)
  const nextPreferredIds = [...props.modelValue.preferredUtteranceIds]
  const targetIndex = nextPreferredIds.indexOf(utteranceId)

  if (isChecked && targetIndex === -1) {
    nextPreferredIds.push(utteranceId)
  } else if (!isChecked && targetIndex !== -1) {
    nextPreferredIds.splice(targetIndex, 1)
  }

  emitModel({
    ...props.modelValue,
    preferredUtteranceIds: nextPreferredIds,
  })
}

function addReceiverOption() {
  emitModel({
    ...props.modelValue,
    receiverOptions: [...props.modelValue.receiverOptions, createCareSceneReceiverOption(props.modelValue.receiverOptions.length)],
  })
}

function removeReceiverOption(optionIndex: number) {
  if (props.modelValue.receiverOptions.length <= 1) return

  const nextOptions = [...props.modelValue.receiverOptions]
  nextOptions.splice(optionIndex, 1)

  if (!nextOptions.some((option) => option.isComforting) && nextOptions[0]) {
    nextOptions[0] = {
      ...nextOptions[0],
      isComforting: true,
    }
  }

  emitModel({
    ...props.modelValue,
    receiverOptions: nextOptions,
  })
}

function updateReceiverOptionField<K extends keyof CareSceneReceiverOption>(
  optionIndex: number,
  key: K,
  value: CareSceneReceiverOption[K]
) {
  const nextOptions = [...props.modelValue.receiverOptions]
  const currentOption = nextOptions[optionIndex]
  if (!currentOption) return

  nextOptions[optionIndex] = {
    ...currentOption,
    [key]: value,
  }

  emitModel({
    ...props.modelValue,
    receiverOptions: nextOptions,
  })
}

function setComfortingOption(optionIndex: number, checked: boolean | string | number) {
  const isChecked = Boolean(checked)
  const nextOptions = props.modelValue.receiverOptions.map((option, index) => ({
    ...option,
    isComforting: isChecked ? index === optionIndex : index === 0 ? true : option.isComforting,
  }))

  if (!isChecked && nextOptions[optionIndex]) {
    nextOptions[optionIndex] = {
      ...nextOptions[optionIndex],
      isComforting: false,
    }
  }

  if (!nextOptions.some((option) => option.isComforting) && nextOptions[0]) {
    nextOptions[0] = {
      ...nextOptions[0],
      isComforting: true,
    }
  }

  emitModel({
    ...props.modelValue,
    receiverOptions: nextOptions,
  })
}
</script>

<style scoped>
.care-editor {
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
.nested-card {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid;
  border-radius: 12px;
  color: #606266;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.stack-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .card-header,
  .header-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
