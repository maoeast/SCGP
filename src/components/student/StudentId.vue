<template>
  <span class="student-id" :class="{ 'student-id--empty': !props.id?.trim() }">
    {{ displayValue }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatStudentId } from '@/utils/student-display'

const props = withDefaults(defineProps<{
  id?: string
  full?: boolean
}>(), {
  id: '',
  full: false,
})

const displayValue = computed(() => formatStudentId(props.id, props.full))
</script>

<style scoped>
.student-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  color: var(--color-text-tertiary, var(--el-text-color-secondary, #909399));
  letter-spacing: 0.02em;
}

.student-id--empty {
  letter-spacing: 0;
}
</style>
