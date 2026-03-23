<template>
  <EmotionSelector
    title="你觉得他现在是什么心情？"
    subtitle="请根据场景线索，选择最符合的情绪。"
    :options="emotionSelectorOptions"
    :hint-level="hintLevel"
    @select="handleSelect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmotionSelector from '@/components/emotional/EmotionSelector.vue'
import { getOptionVisualState } from '@/components/emotional/engine/runtime/visibility'
import type { EmotionChoiceStep } from '@/features/emotional/engine/types'
import type { EmotionalBaseEmotion } from '@/types/emotional'

const EMOTION_META: Record<EmotionalBaseEmotion, { label: string; emoji: string; colorHex: string; zoneLabel: string }> = {
  happy: { label: '开心', emoji: '😊', colorHex: '#67C23A', zoneLabel: '绿色区' },
  sad: { label: '失落', emoji: '😢', colorHex: '#409EFF', zoneLabel: '蓝色区' },
  embarrassed: { label: '尴尬', emoji: '😳', colorHex: '#E6A23C', zoneLabel: '黄色区' },
  angry: { label: '生气', emoji: '😠', colorHex: '#F56C6C', zoneLabel: '红色区' },
  scared: { label: '害怕', emoji: '😨', colorHex: '#F56C6C', zoneLabel: '红色区' },
}

const props = defineProps<{
  step: EmotionChoiceStep
  hintLevel: 0 | 1 | 2 | 3
}>()

const emit = defineEmits<{
  (e: 'select', payload: { value: string; label?: string }): void
}>()

const emotionSelectorOptions = computed(() => {
  const baseOptions = props.hintLevel >= 3
    ? (props.step.options || []).filter((option) => option.isCorrect)
    : (props.step.options || [])

  return baseOptions.map((option) => {
  const meta = EMOTION_META[option.value as EmotionalBaseEmotion]
  const visualState = getOptionVisualState(option, props.hintLevel)

  return {
    value: option.value,
    label: meta?.label || option.label,
    emoji: meta?.emoji || '🙂',
    colorHex: meta?.colorHex || '#dcdfe6',
    zoneLabel: meta?.zoneLabel || '提示区',
    isCorrect: !!option.isCorrect,
    muted: visualState.muted,
    highlighted: visualState.highlighted,
  }
  })
})

function handleSelect(value: string) {
  const option = emotionSelectorOptions.value.find((item) => item.value === value)
  emit('select', { value, label: option?.label })
}
</script>
