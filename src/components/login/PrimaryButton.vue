<template>
  <button
    class="primary-button"
    :class="{ 'is-loading': loading, 'is-active': active }"
    :disabled="disabled || loading"
    :type="type"
  >
    <span class="primary-button__label">{{ loading ? loadingText : label }}</span>
    <span v-if="active && !disabled && !loading" class="primary-button__shimmer"></span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  label: string
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  /** When true, button transitions to bright gradient with breathing glow */
  active?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  loadingText: '处理中...',
  disabled: false,
  type: 'button',
  active: false,
})
</script>

<style scoped>
.primary-button {
  position: relative;
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(
    135deg,
    var(--login-primary-gradient-start, #4FB3BF),
    var(--login-primary-gradient-end, #3A98A3)
  );
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 8px 24px var(--login-button-shadow, rgba(58, 152, 163, 0.3));
  transition:
    transform 0.18s ease,
    box-shadow 0.3s ease,
    background 0.4s ease;
}

.primary-button.is-active:not(:disabled) {
  background: linear-gradient(
    135deg,
    var(--login-primary-gradient-start, #4FB3BF),
    var(--login-primary-gradient-end, #3A98A3)
  );
  box-shadow: 0 8px 28px var(--login-button-shadow, rgba(58, 152, 163, 0.4));
  animation: btn-breathe 2.4s ease-in-out infinite;
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.08);
  box-shadow: 0 12px 32px var(--login-button-shadow, rgba(58, 152, 163, 0.4));
}

.primary-button.is-active:hover:not(:disabled) {
  box-shadow: 0 12px 36px var(--login-button-shadow, rgba(58, 152, 163, 0.5));
}

.primary-button:focus-visible {
  outline: 3px solid var(--login-primary-ring, rgba(58, 152, 163, 0.18));
  outline-offset: 2px;
}

.primary-button:disabled {
  background: linear-gradient(
    90deg,
    var(--login-button-disabled-start, #d4c9a8),
    var(--login-button-disabled-end, #c9b896)
  );
  color: #ffffff;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
  filter: none;
  animation: none;
}

.primary-button__label {
  position: relative;
  z-index: 1;
}

/* Shimmer flow effect */
.primary-button__shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.18) 50%,
    transparent 70%
  );
  animation: shimmer 2.8s ease-in-out infinite;
}

@keyframes btn-breathe {
  0%, 100% {
    box-shadow: 0 8px 28px var(--login-button-shadow, rgba(58, 152, 163, 0.35));
  }
  50% {
    box-shadow: 0 12px 36px var(--login-button-shadow, rgba(58, 152, 163, 0.5));
  }
}

@keyframes shimmer {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
</style>
