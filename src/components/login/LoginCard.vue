<template>
  <section class="login-card">
    <div class="login-card__header">
      <h2>用户登录</h2>
      <p>请输入账号和密码进入系统</p>
    </div>

    <form class="login-card__form" @submit.prevent="handleSubmit">
      <InputField
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
        loading-text="登录中..."
      />
    </form>

    <div class="login-card__footer">
      <button type="button" class="login-card__link" @click="emit('emergency-reset')">
        重置管理员密码
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
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
  (event: 'emergency-reset'): void
}>()

const handleRememberChange = (event: Event) => {
  emit('update:remember', (event.target as HTMLInputElement).checked)
}

const handleSubmit = () => {
  if (props.loading || props.submitDisabled) {
    return
  }

  emit('submit')
}
</script>

<style scoped>
.login-card {
  --card-opacity: var(--login-card-bg-opacity, 0.94);
  width: min(464px, 100%);
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 28px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, var(--card-opacity)) 0%,
    rgba(248, 250, 255, var(--card-opacity)) 100%
  );
  backdrop-filter: blur(14px);
  box-shadow: 0 28px 70px rgba(10, 19, 44, 0.18), 0 10px 24px rgba(10, 19, 44, 0.1);
  box-sizing: border-box;
}

.login-card__header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-card__header h2 {
  margin: 0;
  color: var(--login-text, #1f2937);
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.login-card__header p {
  margin: 0;
  color: var(--login-muted, #5f6b7a);
  font-size: 14px;
  line-height: 1.6;
  max-width: 20em;
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
  accent-color: var(--login-primary, #2f6fd6);
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

.login-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 20px;
}

.login-card__link {
  border: none;
  padding: 0;
  background: transparent;
  color: var(--login-muted, #5f6b7a);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.login-card__link:hover {
  color: var(--login-primary, #2f6fd6);
}

@media (max-width: 768px) {
  .login-card {
    padding: 24px;
    border-radius: 22px;
  }

  .login-card__header h2 {
    font-size: 22px;
  }
}
</style>
