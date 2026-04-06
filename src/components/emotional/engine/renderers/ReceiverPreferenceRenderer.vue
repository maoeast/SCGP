<template>
  <div class="care-stage">
    <div class="care-stage__header">
      <h2 class="care-stage__title">现在换到对方来听</h2>
      <p class="care-stage__description">{{ stageDescription }}</p>
    </div>

    <div class="option-list">
      <CareOptionCard
        v-for="option in receiverCards"
        :key="option.value"
        type-label="听起来最舒服"
        :text="option.label"
        :support-text="option.supportText"
        :icon="option.icon"
        :muted="option.muted"
        :highlighted="option.highlighted"
        :selected="option.selected"
        :disabled="option.disabled"
        @select="handleSelect(option.value)"
      />
    </div>

    <el-card v-if="selectedMetadata" class="effect-card" shadow="never">
      <template #header>
        <span>为什么这句更舒服</span>
      </template>
      <div class="effect-grid">
        <div class="effect-copy">
          <p class="effect-text">{{ selectedMetadata.reasonText }}</p>
          <p class="reaction-line">
            <span class="reaction-emoji">{{ selectedMetadata.isComforting ? '😊' : '🤔' }}</span>
            <span>{{ selectedMetadata.isComforting ? '这句话更容易让人放松下来。' : '这句话可能会让对方更有压力。' }}</span>
          </p>
        </div>
        <div class="effect-actions" v-if="selectionState?.canAdvance">
          <el-button type="primary" size="large" @click="$emit('continue')">
            完成训练
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CareOptionCard from '@/components/emotional/CareOptionCard.vue'
import { getOptionVisualState, getVisibleOptionsByHint } from '@/components/emotional/engine/runtime/visibility'
import type {
  ReceiverPreferenceOptionMetadata,
  ReceiverPreferenceSelectionState,
  ReceiverPreferenceStep,
} from '@/features/emotional/engine/types'

const props = defineProps<{
  step: ReceiverPreferenceStep
  hintLevel: 0 | 1 | 2 | 3
  selectionState?: ReceiverPreferenceSelectionState | null
  receiverName?: string
  selectedEmotionChip?: string
}>()

const emit = defineEmits<{
  (e: 'select', payload: { value: string; label?: string; perspective?: 'receiver' }): void
  (e: 'continue'): void
}>()

const receiverCards = computed(() => getVisibleOptionsByHint(props.step.options || [], props.hintLevel).map((option) => {
  const metadata = option.metadata as ReceiverPreferenceOptionMetadata | undefined
  const visualState = getOptionVisualState(option, props.hintLevel)
  const isLocked = !!props.selectionState?.canAdvance
  const isSelected = props.selectionState?.selectedValue === option.value

  return {
    value: option.value,
    label: option.label,
    supportText: metadata?.reasonText || '',
    icon: metadata?.isComforting ? '😊' : '💭',
    muted: isLocked ? !isSelected : visualState.muted,
    highlighted: isLocked ? isSelected : visualState.highlighted,
    selected: isSelected,
    disabled: isLocked && !isSelected,
  }
}))

const selectedMetadata = computed(() => props.selectionState?.metadata || null)
const receiverDisplayName = computed(() => props.receiverName || props.step.metadata.receiverName || '这位小朋友')
const stageDescription = computed(() => {
  if (props.selectedEmotionChip) {
    return `如果你是${receiverDisplayName.value}，现在有点“${props.selectedEmotionChip}”，哪句话听起来会更舒服？`
  }

  return props.step.promptText || props.step.metadata.receiverPerspectiveText
})

function handleSelect(value: string) {
  if (props.selectionState?.canAdvance) {
    return
  }
  const option = receiverCards.value.find((item) => item.value === value)
  emit('select', { value, label: option?.label, perspective: 'receiver' })
}
</script>

<style scoped>
.care-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.care-stage__header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.care-stage__title {
  margin: 0;
  font-size: 30px;
  color: #303133;
}

.care-stage__description {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: #606266;
}

.option-list {
  display: grid;
  gap: 16px;
}

.effect-card {
  border-radius: 22px;
  background: #fafafa;
}

.effect-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.effect-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.effect-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
}

.reaction-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
}

.reaction-emoji {
  font-size: 24px;
}

.effect-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
