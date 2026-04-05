<template>
  <el-card class="question-card">
    <template #header>
      <div class="question-header">
        <span class="question-number">第 {{ questionIndex + 1 }} 题</span>
        <span class="question-id" v-if="showQuestionId">(题号: {{ question.id }})</span>
        <el-tag
          v-if="question.dimensionName || question.dimension"
          size="small"
          type="info"
          class="dimension-tag"
        >
          {{ question.dimensionName || question.dimension }}
        </el-tag>
        <el-tag
          v-if="ageStageLabel"
          size="small"
          type="warning"
          class="stage-tag"
        >
          {{ ageStageLabel }}
        </el-tag>
      </div>
    </template>

    <div class="question-content">
      <!-- CNBS-R2016 专用布局 -->
      <template v-if="isCnbsr2016Layout">
        <!-- 题目名称大标题 -->
        <div class="cnbs-title">
          {{ question.content }}
        </div>

        <!-- 操作方法 / 通过要求 分两栏 -->
        <div class="cnbs-info-grid">
          <div class="cnbs-info-card cnbs-prompt-card">
            <div class="cnbs-info-label">
              <span class="cnbs-label-icon">📋</span>
              <span>操作方法</span>
            </div>
            <div class="cnbs-info-text">{{ cnbsr2016Prompt }}</div>
          </div>
          <div class="cnbs-info-card cnbs-criteria-card">
            <div class="cnbs-info-label">
              <span class="cnbs-label-icon">✓</span>
              <span>通过要求</span>
            </div>
            <div class="cnbs-info-text">{{ cnbsr2016PassCriteria }}</div>
          </div>
        </div>

        <!-- 跳过提示 -->
        <div v-if="isSkipped" class="skip-notice">
          <el-icon :size="20" color="#909399"><CircleCheck /></el-icon>
          <span class="skip-text">此题不适用，已自动跳过</span>
        </div>

        <!-- 通过/不通过 横排双列 -->
        <div class="cnbs-answer-row" :class="{ 'is-skipped': isSkipped }">
          <div
            class="cnbs-option cnbs-option-pass"
            :class="{ 'is-selected': selectedValue === 1 }"
            @click="!isSkipped && handleCnbsAnswer(1)"
          >
            <span class="cnbs-option-icon">✓</span>
            <span class="cnbs-option-label">通过</span>
          </div>
          <div
            class="cnbs-option cnbs-option-fail"
            :class="{ 'is-selected': selectedValue === 0 }"
            @click="!isSkipped && handleCnbsAnswer(0)"
          >
            <span class="cnbs-option-icon">✗</span>
            <span class="cnbs-option-label">不通过</span>
          </div>
        </div>
      </template>

      <!-- 通用布局（非 CNBS-R2016） -->
      <template v-else>
        <!-- 题目内容 -->
        <div class="question-title">
          {{ question.content }}
        </div>

        <!-- 语音播放按钮 -->
        <div class="question-actions" v-if="enableSpeech">
          <el-button
            type="info"
            :icon="Microphone"
            @click="playAudio"
            :loading="isPlaying"
            plain
          >
            {{ isPlaying ? '播放中...' : '朗读题目' }}
          </el-button>
        </div>

        <!-- 跳过提示 -->
        <div v-if="isSkipped" class="skip-notice">
          <el-icon :size="20" color="#909399"><CircleCheck /></el-icon>
          <span class="skip-text">此题不适用，已自动跳过</span>
        </div>

        <!-- 说明内容输入框 -->
        <div v-if="showDescriptionInput && !isSkipped" class="description-section">
          <el-divider />
          <div class="description-label">
            <el-icon><InfoFilled /></el-icon>
            <span>请填写具体说明内容：</span>
          </div>
          <el-input
            v-model="descriptionText"
            type="textarea"
            :rows="3"
            placeholder="请详细描述具体情况..."
            maxlength="500"
            show-word-limit
            @blur="handleDescriptionBlur"
            class="description-input"
          />
          <div class="description-hint">
            提示：选择"无此表现"时无需填写说明
          </div>
        </div>

        <!-- 选项列表 -->
        <div class="answer-options" :class="{ 'is-skipped': isSkipped }">
          <!-- 垂直排列 -->
          <el-radio-group
            v-if="optionsLayout === 'vertical'"
            v-model="selectedValue"
            @change="handleAnswerChange"
            class="vertical-options"
            :disabled="isSkipped"
          >
            <el-radio
              v-for="option in question.options"
              :key="option.value"
              :value="option.value"
              size="large"
              class="option-item"
            >
              <span class="option-label">{{ option.label }}</span>
              <span class="option-desc" v-if="option.description">
                {{ option.description }}
              </span>
            </el-radio>
          </el-radio-group>

          <!-- 横向排列 -->
          <el-radio-group
            v-else
            v-model="selectedValue"
            @change="handleAnswerChange"
            class="horizontal-options"
            :disabled="isSkipped"
          >
            <el-radio-button
              v-for="option in question.options"
              :key="option.value"
              :value="option.value"
              class="answer-option"
            >
              <div class="option-content">
                <span class="option-label">{{ option.label }}</span>
                <span class="option-desc" v-if="option.description">
                  {{ option.description }}
                </span>
              </div>
            </el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- CNBS-R2016: 底部朗读按钮 -->
      <div v-if="isCnbsr2016Layout && enableSpeech" class="cnbs-bottom-row">
        <el-button
          type="info"
          :icon="Microphone"
          @click="playAudio"
          :loading="isPlaying"
          plain
          size="default"
        >
          {{ isPlaying ? '播放中...' : '朗读题目' }}
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Microphone, InfoFilled, CircleCheck } from '@element-plus/icons-vue'
import type { ScaleQuestion } from '@/types/assessment'

export interface AnswerWithDescription {
  value: number | string
  description?: string
}

interface Props {
  question: ScaleQuestion
  answer: number | string | AnswerWithDescription | null
  questionIndex: number
  totalCount?: number
  optionsLayout?: 'vertical' | 'horizontal'
  enableSpeech?: boolean
  showQuestionId?: boolean
  isSkipped?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  optionsLayout: 'vertical',
  enableSpeech: true,
  showQuestionId: true,
  isSkipped: false
})

const emit = defineEmits<{
  (e: 'answer', value: number | string | AnswerWithDescription): void
}>()

const selectedValue = ref<number | string | null>(null)
const descriptionText = ref('')
const isPlaying = ref(false)
let speechSynthesis: SpeechSynthesis | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

// CNBS-R2016 专用检测
const isCnbsr2016Layout = computed(() => {
  return Boolean(props.question.metadata?.prompt !== undefined || props.question.metadata?.pass_criteria !== undefined)
})

const cnbsr2016Prompt = computed(() => {
  return props.question.metadata?.prompt || ''
})

const cnbsr2016PassCriteria = computed(() => {
  return props.question.metadata?.pass_criteria || ''
})

// 年龄阶段标签
const ageStageLabel = computed(() => {
  const stage = props.question.metadata?.age_stage
  if (!stage) return null
  return `第${stage}阶段`
})

// 是否显示说明内容输入框
const showDescriptionInput = computed(() => {
  return props.question.metadata?.hasDescription === true &&
         selectedValue.value !== null &&
         selectedValue.value !== 0 &&
         selectedValue.value !== '0'
})

// CNBS-R2016 答案处理
function handleCnbsAnswer(value: 0 | 1) {
  selectedValue.value = value
  emit('answer', value)
}

// 监听外部答案变化
watch(() => props.answer, (newVal) => {
  if (newVal && typeof newVal === 'object' && 'value' in newVal) {
    selectedValue.value = newVal.value
    descriptionText.value = newVal.description || ''
  } else {
    selectedValue.value = newVal ?? null
    descriptionText.value = ''
  }
}, { immediate: true })

// 监听跳过状态变化
watch(() => props.isSkipped, (isSkipped) => {
  if (isSkipped && selectedValue.value === null) {
    selectedValue.value = 0
    emit('answer', 0)
  }
}, { immediate: true })

// 处理答案变化
function handleAnswerChange(value: number | string) {
  if (props.question.metadata?.hasDescription) {
    if (value === 0 || value === '0') {
      descriptionText.value = ''
    }
    emit('answer', {
      value,
      description: descriptionText.value
    })
  } else {
    emit('answer', value)
  }
}

// 处理说明内容失焦
function handleDescriptionBlur() {
  if (selectedValue.value !== null && props.question.metadata?.hasDescription) {
    emit('answer', {
      value: selectedValue.value,
      description: descriptionText.value
    })
  }
}

// 语音播放
function playAudio() {
  if (isPlaying.value) {
    stopAudio()
    return
  }

  if (!('speechSynthesis' in window)) {
    console.warn('浏览器不支持语音合成')
    return
  }

  speechSynthesis = window.speechSynthesis
  // CNBS-R2016: 朗读标题 + 操作方法 + 通过要求
  let textToSpeak = props.question.content
  if (isCnbsr2016Layout.value) {
    const parts = [props.question.content]
    if (cnbsr2016Prompt.value) parts.push(`操作方法：${cnbsr2016Prompt.value}`)
    if (cnbsr2016PassCriteria.value) parts.push(`通过要求：${cnbsr2016PassCriteria.value}`)
    textToSpeak = parts.join('。')
  }

  currentUtterance = new SpeechSynthesisUtterance(textToSpeak)
  currentUtterance.lang = 'zh-CN'
  currentUtterance.rate = 0.9

  currentUtterance.onstart = () => {
    isPlaying.value = true
  }

  currentUtterance.onend = () => {
    isPlaying.value = false
  }

  currentUtterance.onerror = () => {
    isPlaying.value = false
  }

  speechSynthesis.speak(currentUtterance)
}

function stopAudio() {
  if (speechSynthesis) {
    speechSynthesis.cancel()
  }
  isPlaying.value = false
}

onBeforeUnmount(() => {
  stopAudio()
})
</script>

<style scoped>
.question-card {
  margin-bottom: 20px;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.question-number {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.question-id {
  font-size: 13px;
  color: #909399;
}

.dimension-tag,
.stage-tag {
  margin-left: auto;
}

.question-content {
  padding: 10px 0;
}

/* ====== CNBS-R2016 专用样式 ====== */

.cnbs-title {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f0f5ff 0%, #e6f0ff 100%);
  border-radius: 12px;
  border-left: 5px solid #409eff;
  line-height: 1.5;
}

.cnbs-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.cnbs-info-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fafafa;
  border: 1px solid #ebeef5;
}

.cnbs-prompt-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
}

.cnbs-criteria-card {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border-color: #fdba74;
}

.cnbs-info-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.cnbs-prompt-card .cnbs-info-label {
  color: #16a34a;
}

.cnbs-criteria-card .cnbs-info-label {
  color: #ea580c;
}

.cnbs-label-icon {
  font-size: 14px;
}

.cnbs-info-text {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.7;
}

.cnbs-answer-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 500px;
  margin: 0 auto;
}

.cnbs-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  border-radius: 14px;
  border: 3px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.cnbs-option:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.cnbs-option-pass {
  border-color: #86efac;
}

.cnbs-option-pass:hover {
  background: #f0fdf4;
  border-color: #4ade80;
}

.cnbs-option-pass.is-selected {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: #22c55e;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
}

.cnbs-option-fail {
  border-color: #fca5a5;
}

.cnbs-option-fail:hover {
  background: #fef2f2;
  border-color: #f87171;
}

.cnbs-option-fail.is-selected {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #ef4444;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
}

.cnbs-option-icon {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.cnbs-option-pass .cnbs-option-icon {
  color: #22c55e;
}

.cnbs-option-fail .cnbs-option-icon {
  color: #ef4444;
}

.cnbs-option-label {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.cnbs-option.is-selected .cnbs-option-label {
  font-weight: 700;
}

.cnbs-answer-row.is-skipped {
  opacity: 0.5;
  pointer-events: none;
}

.cnbs-bottom-row {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-start;
}

/* ====== 通用布局样式 ====== */

.question-title {
  font-size: 18px;
  line-height: 1.8;
  color: #303133;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 12px;
  border-left: 4px solid #409eff;
  font-weight: 500;
}

.question-actions {
  margin-bottom: 20px;
}

.vertical-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.vertical-options .option-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 20px 24px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  transition: all 0.3s ease;
  margin-right: 0;
  height: auto;
  background: white;
}

.vertical-options .option-item:hover {
  border-color: #409eff;
  background: #f5f9ff;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.vertical-options .option-item.is-checked {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.vertical-options :deep(.el-radio__label) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  padding-left: 12px;
  width: 100%;
}

.vertical-options :deep(.el-radio__input) {
  transform: scale(1.2);
}

.vertical-options .option-label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  min-width: 100px;
}

.vertical-options .option-desc {
  font-size: 14px;
  color: #606266;
  flex: 1;
  line-height: 1.6;
}

.horizontal-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.horizontal-options .answer-option {
  width: 100%;
}

.horizontal-options :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 16px 12px;
  border-radius: 10px;
  border: 2px solid #dcdfe6;
  transition: all 0.3s ease;
}

.horizontal-options :deep(.el-radio-button.is-active .el-radio-button__inner) {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.horizontal-options .option-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.horizontal-options .option-label {
  font-size: 16px;
  font-weight: 600;
}

.horizontal-options .option-desc {
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.option-label {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.option-desc {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.skip-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  margin: 16px 0;
  background: #f5f7fa;
  border-radius: 12px;
  border: 2px dashed #dcdfe6;
}

.skip-text {
  font-size: 16px;
  color: #909399;
  font-weight: 500;
}

.answer-options.is-skipped {
  opacity: 0.5;
  pointer-events: none;
}

.description-section {
  margin: 20px 0;
  padding: 16px 20px;
  background: #f0f9ff;
  border-radius: 12px;
  border: 1px solid #b3d8ff;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.description-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #409eff;
}

.description-input :deep(.el-textarea__inner) {
  border-radius: 8px;
  resize: none;
}

.description-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
  text-align: right;
}

@media (max-width: 768px) {
  .cnbs-info-grid {
    grid-template-columns: 1fr;
  }

  .cnbs-answer-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .horizontal-options {
    grid-template-columns: 1fr;
  }

  .vertical-options .option-item {
    padding: 16px;
  }

  .vertical-options :deep(.el-radio__label) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .vertical-options .option-label {
    min-width: auto;
  }

  .description-section {
    padding: 12px 16px;
  }
}
</style>
