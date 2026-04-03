<template>
  <button
    class="primary-button"
    :class="{ 'is-loading': loading }"
    :disabled="disabled || loading"
    :type="type"
  >
    <span>{{ loading ? loadingText : label }}</span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  label: string
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  loading: false,
  loadingText: '处理中...',
  disabled: false,
  type: 'button',
})
</script>

<style scoped>
.primary-button {
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 8px;
  background: #185FA5;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 18px 34px rgba(30, 78, 150, 0.2);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #154f8a;
  box-shadow: 0 24px 40px rgba(30, 78, 150, 0.24);
}

.primary-button:focus-visible {
  outline: 3px solid var(--login-primary-ring, rgba(47, 111, 214, 0.18));
  outline-offset: 2px;
}

.primary-button:disabled {
  background: #c8d8ea;
  color: #ffffff;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
  filter: none;
}
</style>
