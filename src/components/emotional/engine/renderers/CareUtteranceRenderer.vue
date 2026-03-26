<template>
  <div class="care-stage">
    <PerspectiveSwitchView
      active-side="sender"
      title="现在轮到我来说"
      :description="step.promptText || step.metadata.speakerPerspectiveText"
    />

    <div class="option-list">
      <CareOptionCard
        v-for="option in utteranceCards"
        :key="option.value"
        :type-label="option.typeLabel"
        :text="option.label"
        :support-text="option.supportText"
        :icon="option.icon"
        :muted="option.muted"
        :highlighted="option.highlighted"
        :selected="option.selected"
        @select="handleSelect(option.value)"
      />
    </div>

    <el-card v-if="selectedMetadata" class="effect-card" shadow="never">
      <template #header>
        <span>这句话带来的感受</span>
      </template>
      <div class="effect-grid">
        <div class="effect-copy">
          <p class="effect-text">{{ selectedMetadata.effect }}</p>
          <p class="reaction-line">
            <span class="reaction-emoji">{{ selectedMetadata.receiverReactionEmoji || '🙂' }}</span>
            <span>{{ selectedMetadata.receiverReactionText || '对方会更容易感受到你的关心。' }}</span>
          </p>
        </div>
        <div class="effect-actions" v-if="selectionState?.canAdvance">
          <el-button type="primary" size="large" @click="$emit('continue')">
            看看对方听起来更舒服的是哪句
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CareOptionCard from '@/components/emotional/CareOptionCard.vue'
import PerspectiveSwitchView from '@/components/emotional/PerspectiveSwitchView.vue'
import { getOptionVisualState, getVisibleOptionsByHint } from '@/components/emotional/engine/runtime/visibility'
import type {
  CareUtteranceOptionMetadata,
  CareUtteranceSelectionState,
  CareUtteranceStep,
} from '@/features/emotional/engine/types'

const CARE_TYPE_META = {
  empathy: { label: '共情式', icon: '💞' },
  advice: { label: '建议式', icon: '💡' },
  action: { label: '行动式', icon: '👐' },
} as const

const props = defineProps<{
  step: CareUtteranceStep
  hintLevel: 0 | 1 | 2 | 3
  selectionState?: CareUtteranceSelectionState | null
}>()

const emit = defineEmits<{
  (e: 'select', payload: { value: string; label?: string; perspective?: 'sender' }): void
  (e: 'continue'): void
}>()

const utteranceCards = computed(() => getVisibleOptionsByHint(props.step.options || [], props.hintLevel).map((option) => {
  const metadata = option.metadata as CareUtteranceOptionMetadata | undefined
  const typeMeta = CARE_TYPE_META[metadata?.utteranceType || 'empathy']
  const visualState = getOptionVisualState(option, props.hintLevel)
  const isSelected = props.selectionState?.selectedValue === option.value

  return {
    value: option.value,
    label: option.label,
    supportText: metadata?.effect || '',
    icon: typeMeta.icon,
    typeLabel: typeMeta.label,
    muted: visualState.muted,
    highlighted: visualState.highlighted || isSelected,
    selected: isSelected,
  }
}))

const selectedMetadata = computed(() => props.selectionState?.metadata || null)

function handleSelect(value: string) {
  const option = utteranceCards.value.find((item) => item.value === value)
  emit('select', { value, label: option?.label, perspective: 'sender' })
}
</script>

<style scoped>
.care-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
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
