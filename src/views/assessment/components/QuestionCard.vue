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

      <!-- 选项列表 -->
      <div class="answer-options">
        <!-- 使用 Radio Group（适用于单选） -->
        <el-radio-group
          v-if="optionsLayout === 'vertical'"
          v-model="selectedValue"
          @change="handleAnswerChange"
          class="vertical-options"
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
import { Microphone } from '@element-plus/icons-vue'
import type { ScaleQuestion } from '@/types/assessment'

interface Props {
  question: ScaleQuestion
  answer: number | string | null
  questionIndex: number
  totalCount?: number
  optionsLayout?: 'vertical' | 'horizontal'
  enableSpeech?: boolean
  showQuestionId?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  optionsLayout: 'vertical',
  enableSpeech: true,
  showQuestionId: true
})

const emit = defineEmits<{
  (e: 'answer', value: number | string): void
}>()

// 内部选中值
const selectedValue = ref<number | string | null>(null)

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

// 监听外部答案变化
watch(() => props.answer, (newVal) => {
  selectedValue.value = newVal ?? null
}, { immediate: true })

// 处理答案变化
function handleAnswerChange(value: number | string) {
  emit('answer', value)
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
}
</style>
