<template>
  <section class="login-card">
    <div class="login-card__header">
      <span class="login-card__eyebrow">账号登录</span>
      <h2>欢迎回来</h2>
      <p>请输入账号和密码，进入当前学校的评估与训练工作区。</p>
    </div>

    <form class="login-card__form" @submit.prevent="emit('submit')">
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
        loading-text="登录中..."
      />
    </form>

    <div class="login-card__footer">
      <span>如无法登录，请联系系统管理员确认账号状态。</span>
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
  errorMessage?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
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
</script>

<style scoped>
.login-card {
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: clamp(28px, 3vw, 38px);
  border: 1px solid var(--login-border, #dbe5f0);
  border-radius: 26px;
  background: var(--login-surface, #ffffff);
  box-shadow: 0 24px 46px rgba(20, 55, 110, 0.08);
  box-sizing: border-box;
}

.login-card__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-card__eyebrow {
  color: var(--login-primary, #2f6fd6);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-card__header h2 {
  margin: 0;
  color: var(--login-text, #1f2937);
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.login-card__header p {
  margin: 0;
  color: var(--login-muted, #5f6b7a);
  font-size: 14px;
  line-height: 1.7;
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--login-muted, #5f6b7a);
  font-size: 12px;
  line-height: 1.6;
}

.login-card__link {
  border: none;
  padding: 0;
  background: transparent;
  color: var(--login-primary, #2f6fd6);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.login-card__link:hover {
  color: var(--login-primary-hover, #275fb8);
}

@media (max-width: 768px) {
  .login-card {
    padding: 24px 20px;
    border-radius: 22px;
  }

  .login-card__header h2 {
    font-size: 26px;
  }
}
</style>
