<template>
  <div class="login-dev-reset">
    <button type="button" class="login-dev-reset__link" @click="emit('reset')">
      重置管理员密码
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (event: 'reset'): void
}>()
</script>

<style scoped>
.login-dev-reset {
  display: flex;
  width: min(464px, 100%);
  justify-content: flex-start;
  padding: 0 6px;
  box-sizing: border-box;
}

.login-dev-reset__link {
  border: none;
  padding: 0;
  background: transparent;
  color: transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: default;
}

.login-dev-reset__link:hover {
  color: var(--login-muted, #5f6b7a);
}
</style>
