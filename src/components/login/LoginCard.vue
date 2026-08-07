<template>
  <section class="login-card">
    <div class="login-card__header">
      <p class="login-card__greeting">让每一个愿望都能闪闪发光</p>
      <h2>用户登录</h2>
    </div>

    <form class="login-card__form" @submit.prevent="handleSubmit">
      <InputField
        ref="usernameFieldRef"
        :model-value="username"
        label="用户名"
        placeholder="请输入用户名"
        autocomplete="username"
        icon-class="fas fa-user"
        @update:model-value="emit('update:username', $event)"
      />

      <InputField
        :model-value="password"
        label="密码"
        type="password"
        placeholder="请输入密码"
        autocomplete="current-password"
        icon-class="fas fa-lock"
        @update:model-value="emit('update:password', $event)"
      />

      <div class="login-card__meta">
        <label class="login-card__check">
          <input
            :checked="remember"
            type="checkbox"
            @change="handleRememberChange"
          />
          <span>记住账号</span>
        </label>
      </div>

      <div v-if="errorMessage" class="login-card__error">
        {{ errorMessage }}
      </div>

      <PrimaryButton
        type="submit"
        label="登录系统"
        :loading="loading"
        :disabled="submitDisabled"
        :active="isButtonActive"
        loading-text="登录中..."
      />
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import InputField from './InputField.vue'
import PrimaryButton from './PrimaryButton.vue'

interface Props {
  username: string
  password: string
  remember: boolean
  loading?: boolean
  submitDisabled?: boolean
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  submitDisabled: false,
  errorMessage: '',
})

const emit = defineEmits<{
  (event: 'update:username', value: string): void
  (event: 'update:password', value: string): void
  (event: 'update:remember', value: boolean): void
  (event: 'submit'): void
}>()

type InputFieldExpose = {
  focusInput: () => boolean
}

const usernameFieldRef = ref<InputFieldExpose | null>(null)

/** Button shows active state when password has content */
const isButtonActive = computed(() => props.password.trim().length > 0)

const handleRememberChange = (event: Event) => {
  emit('update:remember', (event.target as HTMLInputElement).checked)
}

const handleSubmit = () => {
  if (props.loading || props.submitDisabled) {
    return
  }

  emit('submit')
}

const focusUsernameInput = () => {
  return usernameFieldRef.value?.focusInput() ?? false
}

defineExpose({
  focusUsernameInput,
})
</script>

<style scoped>
.login-card {
  /* 去除独立卡片外壳：无边框/圆角/背景/阴影/模糊，由外层 .login-layout 统一承载毛玻璃质感 */
  width: min(464px, 100%);
  display: flex;
  flex-direction: column;
  gap: 26px;
  box-sizing: border-box;
}

.login-card__header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-card__greeting {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 600;
  color: #1E293B;
  letter-spacing: 0.01em;
}

.login-card__header h2 {
  margin: 0;
  color: var(--login-text, #1f2937);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.login-card__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--login-muted, #5f6b7a);
  font-size: 13px;
}

.login-card__check input {
  width: 16px;
  height: 16px;
  accent-color: var(--login-primary, #3C9BA6);
}

.login-card__error {
  padding: 12px 14px;
  border: 1px solid #f2c6c2;
  border-radius: 14px;
  background: #fdf2f1;
  color: #8b3c36;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .login-card__header h2 {
    font-size: 22px;
  }
}
</style>
