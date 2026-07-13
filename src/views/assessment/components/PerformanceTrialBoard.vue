<!-- src/views/assessment/components/PerformanceTrialBoard.vue -->
<!--
  绩效题答题板（trial-level reaction time）。

  与 QuestionCard 的区别：本题板为「试次级绩效题」专用——
  - 内置 useTrialTimer：刺激（题干图 + 选项）渲染完成后打 onsetAt 时间戳，
    点击选项时 performance.now() - onsetAt 得到真反应时，随 emit 回流。
  - 不给即时对错反馈（标准化要求）；选中后即锁定本题、emit 答案。
  - 不支持说明内容 / 跳过 / 回看（绩效题线性单次作答）。
  计时逻辑自包含，AssessmentContainer 无需为计时改动。
-->
<template>
  <el-card class="performance-board">
    <template #header>
      <div class="board-header">
        <span class="question-number">第 {{ questionIndex + 1 }} 题</span>
        <span v-if="totalCount" class="question-total">/ 共 {{ totalCount }} 题</span>
        <el-tag
          v-if="question.dimensionName || question.dimension"
          size="small"
          type="info"
          class="dimension-tag"
        >
          {{ question.dimensionName || question.dimension }}
        </el-tag>
        <el-tag size="small" type="success" class="pace-tag">⚡ 看准后尽快作答</el-tag>
      </div>
    </template>

    <div class="board-content">
      <!-- 题干：目标图案 -->
      <div v-if="question.imagePath" class="question-image-stem">
        <div class="target-label">🎯 目标图案</div>
        <img :src="resolveImage(question.imagePath)" :alt="question.content" />
        <div v-if="question.content" class="question-image-caption">{{ question.content }}</div>
      </div>

      <!-- 选项网格 -->
      <div class="answer-options" :class="{ 'is-locked': answered }">
        <div class="image-options-grid" :class="optionsGridClass">
          <div
            v-for="option in question.options"
            :key="option.value"
            class="image-option"
            :class="{ 'is-selected': selectedValue === option.value }"
            @click="handleSelect(option.value)"
          >
            <img v-if="option.imagePath" :src="resolveImage(option.imagePath)" :alt="option.label" />
            <span v-else class="image-option-fallback">{{ option.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ScaleQuestion } from '@/types/assessment'
import { resolvePresetResourceUrl } from '@/utils/preset-resource'
import { useTrialTimer } from '@/views/assessment/composables/useTrialTimer'

interface Props {
  question: ScaleQuestion
  questionIndex: number
  totalCount?: number
  isSkipped?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  isSkipped: false,
})

const emit = defineEmits<{
  (e: 'answer', value: { value: number | string; reactionTimeMs: number | null }): void
}>()

const selectedValue = ref<number | string | null>(null)
const answered = ref(false)
const trialTimer = useTrialTimer()

/** 选项数量决定网格列数（4 选项 → 2×2，6 选项 → 3×2） */
const optionsGridClass = computed(() => {
  const n = props.question.options.length
  if (n <= 4) return 'cols-2'
  return 'cols-3'
})

function resolveImage(path?: string): string {
  return path ? resolvePresetResourceUrl(path) : ''
}

/**
 * 开始一个新试次：重置选中态并打刺激呈现时间戳。
 * 用 requestAnimationFrame 延后一帧，确保题干图 / 选项已渲染到 DOM，
 * RT 零点锚定「刺激可见」而非「数据就绪」（仿 BalloonTapGame 入靶打点范式）。
 */
function startTrial() {
  selectedValue.value = null
  answered.value = false
  trialTimer.reset()
  requestAnimationFrame(() => trialTimer.startTrial())
}

function handleSelect(value: number | string) {
  if (answered.value || props.isSkipped) return
  const rt = trialTimer.recordResponse()
  selectedValue.value = value
  answered.value = true
  emit('answer', { value, reactionTimeMs: rt })
}

onMounted(startTrial)
watch(() => props.question, startTrial)
</script>

<style scoped>
.performance-board {
  margin-bottom: 20px;
}

.board-header {
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

.question-total {
  font-size: 13px;
  color: #909399;
}

.dimension-tag,
.pace-tag {
  margin-left: auto;
}

.board-content {
  padding: 10px 0;
}

/* ====== 题干目标图 ====== */
.question-image-stem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.target-label {
  font-size: 15px;
  font-weight: 600;
  color: #409eff;
}

.question-image-stem img {
  max-width: 240px;
  width: 100%;
  border: 2px solid #d6e4ff;
  border-radius: 12px;
  background: #fff;
  padding: 8px;
}

.question-image-caption {
  font-size: 15px;
  color: #606266;
  text-align: center;
}

/* ====== 选项网格 ====== */
.answer-options {
  transition: opacity 0.2s ease;
}

.answer-options.is-locked {
  opacity: 0.75;
}

.image-options-grid {
  display: grid;
  gap: 16px;
  max-width: 560px;
  margin: 0 auto;
}

.image-options-grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.image-options-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.image-option {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  aspect-ratio: 1 / 1;
  border: 2px solid #e4e7ed;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.image-option:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.15);
}

.image-option.is-selected {
  border-color: #67c23a;
  background: #f0f9eb;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
}

.image-option img {
  max-width: 100%;
  max-height: 100%;
}

.image-option-fallback {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

@media (max-width: 768px) {
  .image-options-grid.cols-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
