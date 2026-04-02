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
  min-height: 50px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--login-primary, #2f6fd6) 0%, var(--login-primary-hover, #275fb8) 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(30, 78, 150, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.02);
  box-shadow: 0 20px 36px rgba(30, 78, 150, 0.22);
}

.primary-button:focus-visible {
  outline: 3px solid var(--login-primary-ring, rgba(47, 111, 214, 0.18));
  outline-offset: 2px;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  box-shadow: none;
  transform: none;
}
</style>
