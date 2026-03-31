<template>
  <span class="diagnosis-tag" :class="{ 'diagnosis-tag--muted': !palette }" :style="tagStyle">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getDiagnosisDisplay, getDiagnosisStyle } from '@/utils/student-display'

const props = defineProps<{
  type?: string
}>()

const palette = computed(() => getDiagnosisStyle(props.type))
const label = computed(() => getDiagnosisDisplay(props.type))
const tagStyle = computed(() => {
  if (!palette.value) return undefined
  return {
    background: palette.value.background,
    color: palette.value.color,
    borderColor: palette.value.border,
  }
})
</script>

<style scoped>
.diagnosis-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  border: 0.5px solid transparent;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.diagnosis-tag--muted {
  background: #F4F4F5;
  color: #909399;
  border-color: #E4E7ED;
}
</style>
