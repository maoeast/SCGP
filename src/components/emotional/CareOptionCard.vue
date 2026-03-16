<template>
  <button
    type="button"
    class="care-card"
    :class="{
      'care-card--muted': muted,
      'care-card--highlight': highlighted,
    }"
    @click="$emit('select')"
  >
    <div class="care-card__visual">
      <span class="care-card__icon">{{ icon }}</span>
    </div>
    <div class="care-card__content">
      <span class="care-card__type">{{ typeLabel }}</span>
      <span class="care-card__text">{{ text }}</span>
      <span v-if="supportText" class="care-card__support">{{ supportText }}</span>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  typeLabel: string
  text: string
  supportText?: string
  icon: string
  muted?: boolean
  highlighted?: boolean
}>()

defineEmits<{
  (e: 'select'): void
}>()
</script>

<style scoped>
.care-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  padding: 18px;
  border-radius: 24px;
  border: 2px solid #dcdfe6;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.care-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(64, 158, 255, 0.10);
}

.care-card--muted {
  opacity: 0.45;
}

.care-card--highlight {
  border-color: rgba(103, 194, 58, 0.72);
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.16);
}

.care-card__visual {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #e0f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.care-card__icon {
  font-size: 30px;
}

.care-card__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.care-card__type {
  font-size: 12px;
  font-weight: 700;
  color: #909399;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.care-card__text {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.6;
}

.care-card__support {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
}
</style>
