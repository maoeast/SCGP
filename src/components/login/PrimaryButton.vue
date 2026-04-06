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
  background: linear-gradient(135deg, var(--login-primary-gradient-start, #E6B93C), var(--login-primary-gradient-end, #E38B3A));
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 8px 24px var(--login-button-shadow, rgba(227, 139, 58, 0.3));
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
  box-shadow: 0 12px 32px var(--login-button-shadow, rgba(227, 139, 58, 0.4));
}

.primary-button:focus-visible {
  outline: 3px solid var(--login-primary-ring, rgba(227, 139, 58, 0.18));
  outline-offset: 2px;
}

.primary-button:disabled {
  background: linear-gradient(90deg, var(--login-button-disabled-start, #d4c9a8), var(--login-button-disabled-end, #c9b896));
  color: #ffffff;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
  filter: none;
}
</style>
