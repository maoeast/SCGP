<template>
  <section class="option-board">
    <div v-if="!currentStep" class="option-board-empty">
      当前步骤还没有可用选项。
    </div>

    <div
      v-else
      class="option-grid"
      :class="{
        'is-emotion': currentStep.step_type === 'emotion',
        'is-text': currentStep.step_type !== 'emotion',
      }"
    >
      <template v-if="currentStep.step_type === 'emotion'">
        <ImageOptionCard
          v-for="option in currentStep.options"
          :key="option.id"
          :option="option"
          @feedback="$emit('feedback', $event)"
        />
      </template>

      <template v-else>
        <TextOptionBlock
          v-for="option in currentStep.options"
          :key="option.id"
          :option="option"
          @feedback="$emit('feedback', $event)"
        />
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'

import ImageOptionCard from './ImageOptionCard.vue'
import TextOptionBlock from './TextOptionBlock.vue'

defineEmits<{
  feedback: [payload: {
    text: string
    tone: 'success' | 'error'
    durationMs: number
  }]
}>()

const store = useTrainingStore()

const currentStep = computed(() => store.currentStepData)
</script>

<style scoped>
.option-board {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.option-board-empty {
  width: min(100%, 520px);
  padding: 28px;
  border-radius: 24px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  color: rgb(255 255 255 / 86%);
  background: rgb(15 23 42 / 42%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 12%);
}

.option-grid {
  width: min(100%, 1120px);
  display: grid;
  gap: 20px;
}

.option-grid.is-emotion {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  align-items: stretch;
  justify-items: center;
}

.option-grid.is-text {
  grid-template-columns: minmax(0, 1fr);
  max-width: 980px;
}

@media (max-width: 900px) {
  .option-grid {
    gap: 16px;
  }

  .option-grid.is-emotion {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .option-grid.is-emotion {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
