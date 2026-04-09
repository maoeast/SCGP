<template>
  <ReasoningCard
    title="你觉得他现在应该怎么办呀？"
    subtitle="请选择对他人更有帮助、更让人舒服的做法。"
    :options="solutionOptions"
    :hint-level="hintLevel"
    @select="handleSelect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ReasoningCard from '@/components/emotional/ReasoningCard.vue'
import { getOptionVisualState, getVisibleOptionsByHint } from '@/components/emotional/engine/runtime/visibility'
import type {
  SolutionChoiceOptionMetadata,
  SolutionChoiceStep,
} from '@/features/emotional/engine/types'

const props = defineProps<{
  step: SolutionChoiceStep
  hintLevel: 0 | 1 | 2 | 3
}>()

const emit = defineEmits<{
  (e: 'select', payload: { value: string; label?: string }): void
}>()

const solutionOptions = computed(() => getVisibleOptionsByHint(props.step.options || [], props.hintLevel).map((option) => {
  const metadata = option.metadata as SolutionChoiceOptionMetadata | undefined
  const visualState = getOptionVisualState(option, props.hintLevel)

  return {
    value: option.value,
    label: option.label,
    supportText: metadata?.explanation || '',
    icon: option.isCorrect ? '💌' : option.isAcceptable ? '👍' : '🚫',
    isCorrect: !!option.isCorrect,
    isAcceptable: !!option.isAcceptable,
    muted: visualState.muted,
    highlighted: visualState.highlighted,
  }
}))

function handleSelect(value: string) {
  const option = solutionOptions.value.find((item) => item.value === value)
  emit('select', { value, label: option?.label })
}
</script>
