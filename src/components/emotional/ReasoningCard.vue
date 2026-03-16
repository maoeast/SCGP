<template>
  <div class="reasoning-root">
    <div class="reasoning-header">
      <div>
        <h2 class="step-title">{{ title }}</h2>
        <p class="step-subtitle">{{ subtitle }}</p>
      </div>
      <el-tag effect="light" class="hint-tag">提示等级 {{ hintLevel }}</el-tag>
    </div>

    <div class="option-list">
      <button
        v-for="option in visibleOptions"
        :key="option.value"
        type="button"
        class="option-card"
        :class="getCardClass(option)"
        @click="$emit('select', option.value)"
      >
        <div class="option-visual">
          <span class="option-icon">{{ option.icon }}</span>
        </div>
        <div class="option-copy">
          <span class="option-label">{{ option.label }}</span>
          <span v-if="option.supportText" class="option-support">{{ option.supportText }}</span>
        </div>
      </button>
    </div>

    <el-alert
      v-if="hintLevel >= 2"
      type="info"
      :closable="false"
      show-icon
      :title="hintLevel === 2 ? '我们先缩小一点范围' : '试试先选这个方向'"
      :description="hintLevel === 2 ? '已经暂时隐藏一部分不太合适的选项。' : '现在只保留了更可能的答案，我们继续。'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ReasoningOptionView {
  value: string
  label: string
  supportText?: string
  icon: string
  isCorrect: boolean
  isAcceptable: boolean
}

const props = defineProps<{
  title: string
  subtitle: string
  options: ReasoningOptionView[]
  hintLevel: 0 | 1 | 2 | 3
}>()

defineEmits<{
  (e: 'select', value: string): void
}>()

const visibleOptions = computed(() => {
  if (props.hintLevel === 0 || props.hintLevel === 1) {
    return props.options
  }

  if (props.hintLevel === 2) {
    const correct = props.options.filter((option) => option.isCorrect || option.isAcceptable)
    const wrong = props.options.filter((option) => !option.isCorrect && !option.isAcceptable)
    const retainedWrong = wrong.slice(0, Math.ceil(wrong.length / 2))
    return [...correct, ...retainedWrong]
  }

  return props.options.filter((option) => option.isCorrect || option.isAcceptable)
})

function getCardClass(option: ReasoningOptionView) {
  const isWrong = !option.isCorrect && !option.isAcceptable
  return {
    'option-card--muted': props.hintLevel === 1 && isWrong,
    'option-card--highlight': props.hintLevel >= 2 && (option.isCorrect || option.isAcceptable),
  }
}
</script>

<style scoped>
.reasoning-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.reasoning-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.step-title {
  margin: 0;
  font-size: 28px;
  color: #303133;
}

.step-subtitle {
  margin: 8px 0 0;
  color: #606266;
  font-size: 15px;
  line-height: 1.7;
}

.hint-tag {
  white-space: nowrap;
}

.option-list {
  display: grid;
  gap: 16px;
}

.option-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  padding: 18px;
  width: 100%;
  border-radius: 24px;
  border: 2px solid #dcdfe6;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.option-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(64, 158, 255, 0.10);
}

.option-card--muted {
  opacity: 0.45;
}

.option-card--highlight {
  border-color: rgba(103, 194, 58, 0.72);
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.16);
}

.option-visual {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #e0f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-icon {
  font-size: 30px;
}

.option-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-label {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.6;
}

.option-support {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
</style>
