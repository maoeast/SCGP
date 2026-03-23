<template>
  <ReasoningCard
    :title="step.promptText || '请继续想一想'"
    subtitle="先观察场景，再从图文选项中选择更合适的答案。"
    :options="reasoningOptions"
    :hint-level="hintLevel"
    @select="handleSelect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ReasoningCard from '@/components/emotional/ReasoningCard.vue'
import { getOptionVisualState, getVisibleOptionsByHint } from '@/components/emotional/engine/runtime/visibility'
import type {
  ReasoningQuestionOptionMetadata,
  ReasoningQuestionStep,
} from '@/features/emotional/engine/types'

const props = defineProps<{
  step: ReasoningQuestionStep
  hintLevel: 0 | 1 | 2 | 3
}>()

const emit = defineEmits<{
  (e: 'select', payload: { value: string; label?: string }): void
}>()

const reasoningOptions = computed(() => getVisibleOptionsByHint(props.step.options || [], props.hintLevel).map((option) => {
  const metadata = option.metadata as ReasoningQuestionOptionMetadata | undefined
  const questionType = props.step.metadata.questionType
  const visualState = getOptionVisualState(option, props.hintLevel)

  return {
    value: option.value,
    label: option.label,
    supportText: metadata?.feedbackText || '',
    icon: questionType === 'cause' ? '🧩' : questionType === 'need' ? '🫶' : '💭',
    isCorrect: !!option.isCorrect,
    isAcceptable: !!option.isAcceptable,
    muted: visualState.muted,
    highlighted: visualState.highlighted,
  }
}))

function handleSelect(value: string) {
  const option = reasoningOptions.value.find((item) => item.value === value)
  emit('select', { value, label: option?.label })
}
</script>
