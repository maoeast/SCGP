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

      <!-- 跳过提示 (当题目被跳过时显示) -->
      <div v-if="isSkipped" class="skip-notice">
        <el-icon :size="20" color="#909399"><CircleCheck /></el-icon>
        <span class="skip-text">此题不适用，已自动跳过</span>
      </div>

      <!-- 说明内容输入框 (仅当题目有 hasDescription 标记且选择了非0选项时显示) -->
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
        <!-- 使用 Radio Group（适用于单选） -->
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

        <!-- 使用 Radio Button（适用于横向排列） -->
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
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Microphone, InfoFilled, CircleCheck } from '@element-plus/icons-vue'
import type { ScaleQuestion } from '@/types/assessment'

// 答案对象接口（支持说明内容）
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
  isSkipped?: boolean  // 新增：是否跳过此题
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

// 内部选中值
const selectedValue = ref<number | string | null>(null)
// 说明内容
const descriptionText = ref('')

// 语音播放状态
const isPlaying = ref(false)
let speechSynthesis: SpeechSynthesis | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

// 年龄阶段标签
const ageStageLabel = computed(() => {
  const stage = props.question.metadata?.age_stage
  if (!stage) return null
  return `第${stage}阶段`
})

// 是否显示说明内容输入框
const showDescriptionInput = computed(() => {
  // 只有题目标记了 hasDescription 且选择了非0选项时才显示
  return props.question.metadata?.hasDescription === true &&
         selectedValue.value !== null &&
         selectedValue.value !== 0 &&
         selectedValue.value !== '0'
})

// 监听外部答案变化
watch(() => props.answer, (newVal) => {
  if (newVal && typeof newVal === 'object' && 'value' in newVal) {
    // 如果答案是对象格式，提取 value 和 description
    selectedValue.value = newVal.value
    descriptionText.value = newVal.description || ''
  } else {
    // 简单值格式
    selectedValue.value = newVal ?? null
    descriptionText.value = ''
  }
}, { immediate: true })

// 监听跳过状态变化 - 如果跳过时没有答案，自动设置答案为0
watch(() => props.isSkipped, (isSkipped) => {
  if (isSkipped && selectedValue.value === null) {
    selectedValue.value = 0
    emit('answer', 0)
  }
}, { immediate: true })

// 处理答案变化
function handleAnswerChange(value: number | string) {
  // 如果题目需要说明内容，发送对象格式
  if (props.question.metadata?.hasDescription) {
    // 如果选择的是0（无此表现），清空说明内容
    if (value === 0 || value === '0') {
      descriptionText.value = ''
    }
    emit('answer', {
      value,
      description: descriptionText.value
    })
  } else {
    // 普通题目，直接发送值
    emit('answer', value)
  }
}

// 处理说明内容失焦（自动保存）
function handleDescriptionBlur() {
  // 只有当有选项值时才发送
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
  currentUtterance = new SpeechSynthesisUtterance(props.question.content)
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

// 组件销毁时停止播放
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

/* 垂直排列选项 - 优化版 */
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

/* 横向排列选项 - 优化版 */
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

/* 选项文字 */
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

/* 跳过提示样式 */
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

/* 跳过时选项区域样式 */
.answer-options.is-skipped {
  opacity: 0.5;
  pointer-events: none;
}

/* 说明内容输入框样式 */
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
