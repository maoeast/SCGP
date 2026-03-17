<template>
  <div class="emotion-editor">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="情绪与场景可视化编辑器"
      description="按“基础信息 - 社交推理 - 问题解决”分区填写，保存时会自动按当前情绪模块契约归一化。"
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
                placeholder="例如 emotion_scene_birthday_001"
                @update:model-value="updateField('sceneCode', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="场景标题" required :error="titleError">
              <el-input
                :model-value="modelValue.title"
                :placeholder="resourceName || '请输入场景标题'"
                @update:model-value="updateField('title', $event)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="场景图片 URL">
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
            <el-form-item label="目标情绪">
              <el-select
                :model-value="modelValue.targetEmotion"
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
            <el-form-item label="难度等级">
              <el-segmented
                :model-value="modelValue.difficultyLevel"
                :options="difficultyOptions"
                @change="updateField('difficultyLevel', $event as 1 | 2 | 3)"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="8">
            <el-form-item label="适用年龄">
              <el-input
                :model-value="modelValue.ageRange || ''"
                placeholder="例如 6-9"
                @update:model-value="updateOptionalField('ageRange', $event)"
              />
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

        <div class="color-preview" :style="{ borderColor: colorMeta.hex, background: `${colorMeta.hex}12` }">
          <span class="color-dot" :style="{ backgroundColor: colorMeta.hex }"></span>
          <strong>{{ colorMeta.label }}</strong>
          <span>{{ colorMeta.hex }}</span>
        </div>

        <el-form-item label="情绪线索" required :error="cluesError">
          <div class="tag-editor">
            <div class="tag-list">
              <el-tag
                v-for="(clue, index) in modelValue.emotionClues"
                :key="`${clue}-${index}`"
                closable
                effect="plain"
                size="large"
                class="tag-item"
                @close="removeClue(index)"
              >
                {{ clue || `线索 ${index + 1}` }}
              </el-tag>
            </div>

            <div class="tag-input-row">
              <el-input
                v-model="newClue"
                placeholder="输入新的情绪线索后按回车"
                @keyup.enter="appendClue"
              />
              <el-button type="primary" plain @click="appendClue">添加线索</el-button>
            </div>

            <div class="clue-inline-list">
              <div v-for="(clue, index) in modelValue.emotionClues" :key="`clue-inline-${index}`" class="inline-item">
                <el-input
                  :model-value="clue"
                  :placeholder="`线索 ${index + 1}`"
                  @update:model-value="updateClue(index, $event)"
                />
                <el-button
                  text
                  type="danger"
                  :disabled="modelValue.emotionClues.length <= 1"
                  @click="removeClue(index)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>社交推理配置区</span>
            <el-button type="primary" plain @click="addPrompt">新增推理问题</el-button>
          </div>
        </template>

        <div class="stack-list">
          <el-card
            v-for="(prompt, promptIndex) in modelValue.prompts"
            :key="prompt.questionId"
            shadow="never"
            class="nested-card"
          >
            <template #header>
              <div class="card-header">
                <span>推理问题 {{ promptIndex + 1 }}</span>
                <el-button
                  text
                  type="danger"
                  :disabled="modelValue.prompts.length <= 1"
                  @click="removePrompt(promptIndex)"
                >
                  删除问题
                </el-button>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col :xs="24" :md="8">
                <el-form-item label="问题编号">
                  <el-input
                    :model-value="prompt.questionId"
                    placeholder="例如 prompt_1"
                    @update:model-value="updatePromptField(promptIndex, 'questionId', $event)"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="问题类型">
                  <el-select
                    :model-value="prompt.questionType"
                    style="width: 100%"
                    @update:model-value="updatePromptField(promptIndex, 'questionType', $event)"
                  >
                    <el-option
                      v-for="option in reasoningTypeOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="正确答案">
                  <el-radio-group
                    :model-value="getCorrectOptionId(prompt)"
                    @update:model-value="setCorrectOption(promptIndex, $event)"
                  >
                    <el-radio
                      v-for="option in prompt.options"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ option.id }}
                    </el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item
              label="题目文字"
              :error="!prompt.questionText.trim() ? '请填写题目文字' : ''"
            >
              <el-input
                :model-value="prompt.questionText"
                placeholder="请输入问题内容，例如：他为什么会这样？"
                @update:model-value="updatePromptField(promptIndex, 'questionText', $event)"
              />
            </el-form-item>

            <el-card shadow="never" class="inner-card">
              <template #header>
                <div class="card-header">
                  <span>动态选项列表</span>
                  <el-button type="primary" plain @click="addPromptOption(promptIndex)">新增选项</el-button>
                </div>
              </template>

              <div class="stack-list">
                <div
                  v-for="(option, optionIndex) in prompt.options"
                  :key="option.id"
                  class="option-block"
                >
                  <div class="option-head">
                    <strong>选项 {{ optionIndex + 1 }}</strong>
                    <div class="option-actions">
                      <el-radio
                        :model-value="getCorrectOptionId(prompt)"
                        :value="option.id"
                        @change="setCorrectOption(promptIndex, option.id)"
                      >
                        正确答案
                      </el-radio>
                      <el-button
                        text
                        type="danger"
                        :disabled="prompt.options.length <= 2"
                        @click="removePromptOption(promptIndex, optionIndex)"
                      >
                        删除
                      </el-button>
                    </div>
                  </div>

                  <el-row :gutter="16">
                    <el-col :xs="24" :md="8">
                      <el-form-item label="选项编号">
                        <el-input
                          :model-value="option.id"
                          @update:model-value="updatePromptOptionField(promptIndex, optionIndex, 'id', $event)"
                        />
                      </el-form-item>
                    </el-col>

                    <el-col :xs="24" :md="16">
                      <el-form-item label="选项文字" :error="!option.text.trim() ? '请填写选项文字' : ''">
                        <el-input
                          :model-value="option.text"
                          placeholder="请输入选项文字"
                          @update:model-value="updatePromptOptionField(promptIndex, optionIndex, 'text', $event)"
                        />
                      </el-form-item>
                    </el-col>
                  </el-row>

                  <el-form-item label="反馈解释" :error="!option.feedbackText.trim() ? '请填写反馈解释' : ''">
                    <el-input
                      :model-value="option.feedbackText"
                      type="textarea"
                      :rows="2"
                      placeholder="学生选择该项后展示的温和反馈"
                      @update:model-value="updatePromptOptionField(promptIndex, optionIndex, 'feedbackText', $event)"
                    />
                  </el-form-item>
                </div>
              </div>
            </el-card>
          </el-card>
        </div>
      </el-card>

      <el-card shadow="never" class="editor-card">
        <template #header>
          <div class="card-header">
            <span>问题解决配置区</span>
            <el-button type="primary" plain @click="addSolution">新增应对方案</el-button>
          </div>
        </template>

        <div class="stack-list">
          <el-card
            v-for="(solution, solutionIndex) in modelValue.solutions"
            :key="solution.id"
            shadow="never"
            class="nested-card"
          >
            <template #header>
              <div class="card-header">
                <span>应对方案 {{ solutionIndex + 1 }}</span>
                <el-button
                  text
                  type="danger"
                  :disabled="modelValue.solutions.length <= 1"
                  @click="removeSolution(solutionIndex)"
                >
                  删除方案
                </el-button>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col :xs="24" :md="8">
                <el-form-item label="方案编号">
                  <el-input
                    :model-value="solution.id"
                    @update:model-value="updateSolutionField(solutionIndex, 'id', $event)"
                  />
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="适宜度判定">
                  <el-select
                    :model-value="solution.suitability"
                    style="width: 100%"
                    @update:model-value="updateSolutionField(solutionIndex, 'suitability', $event)"
                  >
                    <el-option
                      v-for="option in solutionRankOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :xs="24" :md="8">
                <el-form-item label="方案图片 URL">
                  <el-input
                    :model-value="solution.imageUrl || ''"
                    placeholder="可留到后续补充"
                    @update:model-value="updateSolutionOptionalField(solutionIndex, 'imageUrl', $event)"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="方案文字" :error="!solution.text.trim() ? '请填写方案文字' : ''">
              <el-input
                :model-value="solution.text"
                placeholder="请输入应对方案内容"
                @update:model-value="updateSolutionField(solutionIndex, 'text', $event)"
              />
            </el-form-item>

            <el-form-item label="效果说明" :error="!solution.explanation.trim() ? '请填写效果说明' : ''">
              <el-input
                :model-value="solution.explanation"
                type="textarea"
                :rows="2"
                placeholder="说明为什么这样回应更好或更不合适"
                @update:model-value="updateSolutionField(solutionIndex, 'explanation', $event)"
              />
            </el-form-item>
          </el-card>
        </div>
      </el-card>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  EmotionalBaseEmotion,
  EmotionScenePrompt,
  EmotionScenePromptOption,
  EmotionSceneResourceMeta,
  EmotionSceneSolution,
} from '@/types/emotional'
import {
  createEmotionScenePrompt,
  createEmotionScenePromptOption,
  createEmotionSceneSolution,
  EMOTION_COLOR_PRESETS,
  REASONING_TYPE_OPTIONS,
  SOLUTION_RANK_OPTIONS,
  validateEmotionSceneEditorModel,
} from './emotional-resource-contract'

interface Props {
  modelValue: EmotionSceneResourceMeta
  resourceName?: string
}

const props = withDefaults(defineProps<Props>(), {
  resourceName: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: EmotionSceneResourceMeta): void
}>()

const newClue = ref('')

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

const reasoningTypeOptions = REASONING_TYPE_OPTIONS
const solutionRankOptions = SOLUTION_RANK_OPTIONS

const colorMeta = computed(() => EMOTION_COLOR_PRESETS[props.modelValue.targetEmotion])
const validationErrors = computed(() => validateEmotionSceneEditorModel(props.modelValue))
const titleError = computed(() => (!props.modelValue.title.trim() ? '请填写场景标题' : ''))
const sceneCodeError = computed(() => (!props.modelValue.sceneCode.trim() ? '请填写场景编码' : ''))
const cluesError = computed(() => (
  props.modelValue.emotionClues.length === 0 || props.modelValue.emotionClues.every((item) => !item.trim())
    ? '请至少填写 1 条情绪线索'
    : ''
))

function emitModel(nextModel: EmotionSceneResourceMeta) {
  emit('update:modelValue', nextModel)
}

function updateField<K extends keyof EmotionSceneResourceMeta>(key: K, value: EmotionSceneResourceMeta[K]) {
  emitModel({
    ...props.modelValue,
    [key]: value,
  })
}

function updateOptionalField<K extends keyof EmotionSceneResourceMeta>(key: K, value: string) {
  emitModel({
    ...props.modelValue,
    [key]: value.trim() ? value : undefined,
  })
}

function handleEmotionChange(value: EmotionalBaseEmotion) {
  const color = EMOTION_COLOR_PRESETS[value]
  const nextEmotionOptions = props.modelValue.emotionOptions.includes(value)
    ? props.modelValue.emotionOptions
    : [value, ...props.modelValue.emotionOptions]

  emitModel({
    ...props.modelValue,
    targetEmotion: value,
    emotionOptions: nextEmotionOptions,
    emotionColorToken: color.token,
    emotionColorHex: color.hex,
    emotionColorLabel: color.label,
  })
}

function appendClue() {
  if (!newClue.value.trim()) return
  emitModel({
    ...props.modelValue,
    emotionClues: [...props.modelValue.emotionClues, newClue.value.trim()],
  })
  newClue.value = ''
}

function updateClue(index: number, value: string) {
  const nextClues = [...props.modelValue.emotionClues]
  nextClues[index] = value
  emitModel({
    ...props.modelValue,
    emotionClues: nextClues,
  })
}

function removeClue(index: number) {
  if (props.modelValue.emotionClues.length <= 1) return
  const nextClues = [...props.modelValue.emotionClues]
  nextClues.splice(index, 1)
  emitModel({
    ...props.modelValue,
    emotionClues: nextClues,
  })
}

function replacePrompt(promptIndex: number, nextPrompt: EmotionScenePrompt) {
  const nextPrompts = [...props.modelValue.prompts]
  nextPrompts[promptIndex] = nextPrompt
  emitModel({
    ...props.modelValue,
    prompts: nextPrompts,
  })
}

function updatePromptField<K extends keyof EmotionScenePrompt>(
  promptIndex: number,
  key: K,
  value: EmotionScenePrompt[K]
) {
  const prompt = props.modelValue.prompts[promptIndex]
  if (!prompt) return
  replacePrompt(promptIndex, {
    ...prompt,
    [key]: value,
  })
}

function addPrompt() {
  emitModel({
    ...props.modelValue,
    prompts: [...props.modelValue.prompts, createEmotionScenePrompt(props.modelValue.prompts.length)],
  })
}

function removePrompt(promptIndex: number) {
  if (props.modelValue.prompts.length <= 1) return
  const nextPrompts = [...props.modelValue.prompts]
  nextPrompts.splice(promptIndex, 1)
  emitModel({
    ...props.modelValue,
    prompts: nextPrompts,
  })
}

function getCorrectOptionId(prompt: EmotionScenePrompt): string {
  return prompt.options.find((option) => option.isCorrect)?.id || prompt.options[0]?.id || ''
}

function setCorrectOption(promptIndex: number, optionId: string) {
  const prompt = props.modelValue.prompts[promptIndex]
  if (!prompt) return
  const nextOptions = prompt.options.map((option) => ({
    ...option,
    isCorrect: option.id === optionId,
  }))
  replacePrompt(promptIndex, {
    ...prompt,
    options: nextOptions,
  })
}

function addPromptOption(promptIndex: number) {
  const prompt = props.modelValue.prompts[promptIndex]
  if (!prompt) return
  const nextOptions = [...prompt.options, createEmotionScenePromptOption(prompt.options.length, false)]
  replacePrompt(promptIndex, {
    ...prompt,
    options: nextOptions,
  })
}

function removePromptOption(promptIndex: number, optionIndex: number) {
  const prompt = props.modelValue.prompts[promptIndex]
  if (!prompt || prompt.options.length <= 2) return

  const nextOptions = [...prompt.options]
  nextOptions.splice(optionIndex, 1)

  if (!nextOptions.some((option) => option.isCorrect) && nextOptions[0]) {
    nextOptions[0] = {
      ...nextOptions[0],
      isCorrect: true,
    }
  }

  replacePrompt(promptIndex, {
    ...prompt,
    options: nextOptions,
  })
}

function updatePromptOptionField<K extends keyof EmotionScenePromptOption>(
  promptIndex: number,
  optionIndex: number,
  key: K,
  value: EmotionScenePromptOption[K]
) {
  const prompt = props.modelValue.prompts[promptIndex]
  if (!prompt) return

  const nextOptions = [...prompt.options]
  const currentOption = nextOptions[optionIndex]
  if (!currentOption) return

  nextOptions[optionIndex] = {
    ...currentOption,
    [key]: value,
  }

  replacePrompt(promptIndex, {
    ...prompt,
    options: nextOptions,
  })
}

function addSolution() {
  emitModel({
    ...props.modelValue,
    solutions: [...props.modelValue.solutions, createEmotionSceneSolution(props.modelValue.solutions.length)],
  })
}

function removeSolution(solutionIndex: number) {
  if (props.modelValue.solutions.length <= 1) return
  const nextSolutions = [...props.modelValue.solutions]
  nextSolutions.splice(solutionIndex, 1)
  emitModel({
    ...props.modelValue,
    solutions: nextSolutions,
  })
}

function updateSolutionField<K extends keyof EmotionSceneSolution>(
  solutionIndex: number,
  key: K,
  value: EmotionSceneSolution[K]
) {
  const nextSolutions = [...props.modelValue.solutions]
  const currentSolution = nextSolutions[solutionIndex]
  if (!currentSolution) return

  nextSolutions[solutionIndex] = {
    ...currentSolution,
    [key]: value,
  }

  emitModel({
    ...props.modelValue,
    solutions: nextSolutions,
  })
}

function updateSolutionOptionalField<K extends keyof EmotionSceneSolution>(
  solutionIndex: number,
  key: K,
  value: string
) {
  updateSolutionField(solutionIndex, key, (value.trim() ? value : undefined) as EmotionSceneSolution[K])
}
</script>

<style scoped>
.emotion-editor {
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
.nested-card,
.inner-card {
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

.color-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid;
  border-radius: 12px;
  color: #606266;
  margin-bottom: 16px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.tag-editor,
.stack-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  margin-right: 0;
}

.tag-input-row {
  display: flex;
  gap: 12px;
}

.clue-inline-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inline-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.option-block {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fafafa;
}

.option-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.option-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 768px) {
  .tag-input-row,
  .inline-item,
  .option-head,
  .card-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .option-actions {
    justify-content: space-between;
  }
}
</style>
