<template>
  <div class="selector-root">
    <div class="selector-header">
      <div>
        <h2 class="step-title">{{ title }}</h2>
        <p class="step-subtitle">{{ subtitle }}</p>
      </div>
      <el-tag effect="light" class="hint-tag">提示等级 {{ hintLevel }}</el-tag>
    </div>

    <div class="emotion-grid">
      <button
        v-for="emotion in visibleOptions"
        :key="emotion.value"
        type="button"
        class="emotion-card"
        :class="getCardClass(emotion)"
        @click="$emit('select', emotion.value)"
      >
        <div class="emotion-badge" :style="{ backgroundColor: emotion.colorHex }">
          <span class="emotion-emoji">{{ emotion.emoji }}</span>
        </div>
        <div class="emotion-copy">
          <span class="emotion-label">{{ emotion.label }}</span>
          <span class="emotion-zone">{{ emotion.zoneLabel }}</span>
        </div>
      </button>
    </div>

    <el-alert
      v-if="hintLevel >= 3"
      type="info"
      :closable="false"
      show-icon
      title="试试从这个颜色提示开始"
      description="先关注最符合场景线索的情绪按钮，我们一起慢慢完成。"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface EmotionOptionView {
  value: string
  label: string
  emoji: string
  colorHex: string
  zoneLabel: string
  isCorrect: boolean
}

const props = defineProps<{
  title: string
  subtitle: string
  options: EmotionOptionView[]
  hintLevel: 0 | 1 | 2 | 3
}>()

defineEmits<{
  (e: 'select', value: string): void
}>()

const visibleOptions = computed(() => {
  if (props.hintLevel < 3) {
    return props.options
  }
  return props.options.filter((option) => option.isCorrect)
})

function getCardClass(option: EmotionOptionView) {
  const isWrong = !option.isCorrect
  return {
    'emotion-card--muted': props.hintLevel === 1 && isWrong,
    'emotion-card--highlight': props.hintLevel >= 2 && option.isCorrect,
  }
}
</script>

<style scoped>
.selector-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.selector-header {
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

.emotion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.emotion-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 96px;
  padding: 18px;
  border-radius: 22px;
  border: 2px solid #dcdfe6;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.emotion-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.08);
}

.emotion-card--muted {
  opacity: 0.48;
}

.emotion-card--highlight {
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.22), 0 10px 28px rgba(103, 194, 58, 0.15);
}

.emotion-badge {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emotion-emoji {
  font-size: 28px;
}

.emotion-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.emotion-label {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.emotion-zone {
  font-size: 13px;
  color: #909399;
}
</style>
