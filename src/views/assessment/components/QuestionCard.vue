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
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.question-actions {
  margin-bottom: 20px;
}

/* 垂直排列选项 */
.vertical-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vertical-options .option-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.2s;
  margin-right: 0;
  height: auto;
}

.vertical-options .option-item:hover {
  border-color: #409eff;
  background: #f0f7ff;
}

.vertical-options .option-item.is-checked {
  border-color: #409eff;
  background: #ecf5ff;
}

.vertical-options :deep(.el-radio__label) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 8px;
}

/* 横向排列选项 */
.horizontal-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.horizontal-options .answer-option {
  flex: 1;
  min-width: 120px;
}

.horizontal-options .option-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
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
    flex-direction: column;
  }

  .horizontal-options .answer-option {
    min-width: auto;
  }
}
</style>
