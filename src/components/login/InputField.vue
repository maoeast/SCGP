<template>
  <label class="input-field">
    <span class="input-field__label">{{ label }}</span>
    <span class="input-field__control">
      <i v-if="iconClass" :class="iconClass" class="input-field__icon" aria-hidden="true"></i>
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        class="input-field__input"
        @input="handleInput"
      />
    </span>
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  label: string
  placeholder?: string
  type?: string
  autocomplete?: string
  iconClass?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  placeholder: '',
  type: 'text',
  autocomplete: 'off',
  iconClass: '',
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.input-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-field__label {
  color: var(--login-text, #1f2937);
  font-size: 14px;
  font-weight: 600;
}

.input-field__control {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field__icon {
  position: absolute;
  left: 16px;
  color: var(--login-muted, #5f6b7a);
  font-size: 15px;
  pointer-events: none;
}

.input-field__input {
  width: 100%;
  min-height: 52px;
  padding: 0 16px 0 44px;
  border: 1px solid var(--login-border, #dbe5f0);
  border-radius: 16px;
  background: var(--login-surface-soft, #f7fafd);
  color: var(--login-text, #1f2937);
  font-size: 15px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  box-sizing: border-box;
}

.input-field__input::placeholder {
  color: #98a4b3;
}

.input-field__input:hover {
  border-color: var(--login-primary-border, #a8c8f1);
}

.input-field__input:focus {
  outline: none;
  border-color: var(--login-primary, #2f6fd6);
  box-shadow: 0 0 0 4px var(--login-primary-ring, rgba(47, 111, 214, 0.18));
}

.input-field__input:disabled {
  background: #f7fafd;
  cursor: not-allowed;
}
</style>
