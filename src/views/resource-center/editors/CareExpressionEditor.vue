<template>
  <div class="care-editor">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="表达关心可视化编辑器"
      description="当前阶段先稳定 sender / receiver 基础配置、颜色映射和保存契约；话术列表与接收者选项的精细编辑会在 Phase 7 继续展开。"
    />

    <div class="editor-grid">
      <el-form-item label="场景编码" class="editor-item">
        <el-input
          :model-value="modelValue.sceneCode"
          placeholder="例如 care_scene_exam_fail_001"
          @update:model-value="updateField('sceneCode', $event)"
        />
      </el-form-item>

      <el-form-item label="场景标题" class="editor-item">
        <el-input
          :model-value="modelValue.title"
          :placeholder="resourceName || '请输入情境标题'"
          @update:model-value="updateField('title', $event)"
        />
      </el-form-item>

      <el-form-item label="图片地址" class="editor-item">
        <el-input
          :model-value="modelValue.imageUrl"
          placeholder="resource:// 或封面图路径"
          @update:model-value="updateField('imageUrl', $event)"
        />
      </el-form-item>

      <el-form-item label="难度等级" class="editor-item">
        <el-segmented
          :model-value="modelValue.difficultyLevel"
          :options="difficultyOptions"
          @change="updateField('difficultyLevel', $event as 1 | 2 | 3)"
        />
      </el-form-item>

      <el-form-item label="主导类型" class="editor-item">
        <el-select
          :model-value="modelValue.careType"
          style="width: 100%"
          @update:model-value="updateField('careType', $event)"
        >
          <el-option label="共情式" value="empathy" />
          <el-option label="建议式" value="advice" />
          <el-option label="行动式" value="action" />
        </el-select>
      </el-form-item>

      <el-form-item label="接收者情绪" class="editor-item">
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

      <el-form-item label="适用年龄" class="editor-item">
        <el-input
          :model-value="modelValue.ageRange || ''"
          placeholder="例如 6-9"
          @update:model-value="updateOptionalField('ageRange', $event)"
        />
      </el-form-item>

      <el-form-item label="能力层级" class="editor-item">
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
    </div>

    <el-form-item label="表达者提示">
      <el-input
        :model-value="modelValue.speakerPerspectiveText"
        type="textarea"
        :rows="3"
        placeholder="请输入表达者视角引导语"
        @update:model-value="updateField('speakerPerspectiveText', $event)"
      />
    </el-form-item>

    <el-form-item label="接收者提示">
      <el-input
        :model-value="modelValue.receiverPerspectiveText"
        type="textarea"
        :rows="3"
        placeholder="请输入接收者视角引导语"
        @update:model-value="updateField('receiverPerspectiveText', $event)"
      />
    </el-form-item>

    <div class="color-preview" :style="{ borderColor: colorMeta.hex, background: `${colorMeta.hex}12` }">
      <span class="color-dot" :style="{ backgroundColor: colorMeta.hex }"></span>
      <strong>{{ colorMeta.label }}</strong>
      <span>{{ colorMeta.hex }}</span>
    </div>

    <el-card class="contract-card" shadow="never">
      <template #header>
        <div class="contract-header">
          <span>结构摘要</span>
          <el-tag size="small" type="warning">Phase 7 继续细化</el-tag>
        </div>
      </template>

      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">话术条目</span>
          <strong>{{ modelValue.utterances.length }}</strong>
        </div>
        <div class="summary-item">
          <span class="summary-label">接收者选项</span>
          <strong>{{ modelValue.receiverOptions.length }}</strong>
        </div>
        <div class="summary-item">
          <span class="summary-label">推荐话术</span>
          <strong>{{ modelValue.preferredUtteranceIds.length }}</strong>
        </div>
      </div>

      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="复杂话术结构已保留在当前模型中"
        description="本阶段先保证 utterances / receiverOptions / preferredUtteranceIds 的加载与保存稳定，下一阶段再开放可视化增删与细化编辑。"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CareSceneResourceMeta, EmotionalBaseEmotion } from '@/types/emotional'
import { EMOTION_COLOR_PRESETS } from './emotional-resource-contract'

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

const colorMeta = computed(() => EMOTION_COLOR_PRESETS[props.modelValue.receiverEmotion || 'sad'])

function updateField<K extends keyof CareSceneResourceMeta>(key: K, value: CareSceneResourceMeta[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}

function updateOptionalField<K extends keyof CareSceneResourceMeta>(key: K, value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value.trim() ? value : undefined,
  })
}

function handleEmotionChange(value: EmotionalBaseEmotion) {
  const color = EMOTION_COLOR_PRESETS[value]
  emit('update:modelValue', {
    ...props.modelValue,
    receiverEmotion: value,
    emotionColorToken: color.token,
    emotionColorHex: color.hex,
    emotionColorLabel: color.label,
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

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.editor-item {
  margin-bottom: 0;
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

.contract-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contract-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  padding: 12px;
  border-radius: 12px;
  background: #f5f7fa;
}

.summary-label {
  display: block;
  margin-bottom: 6px;
  color: #909399;
  font-size: 12px;
}

@media (max-width: 768px) {
  .editor-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
