<template>
  <section class="login-card">
    <!-- Noise texture overlay -->
    <div class="login-card__noise" aria-hidden="true"></div>

    <div class="login-card__header">
      <p class="login-card__greeting">让每一个愿望都能闪闪发光</p>
      <h2>用户登录</h2>
      <p>请输入账号和密码进入系统</p>
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
  --card-opacity: var(--login-card-bg-opacity, 0.52);
  position: relative;
  width: min(464px, 100%);
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 28px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, var(--card-opacity)) 0%,
    rgba(245, 248, 255, var(--card-opacity)) 100%
  );
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  box-shadow:
    0 28px 70px rgba(10, 19, 44, 0.18),
    0 10px 24px rgba(10, 19, 44, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  box-sizing: border-box;
  overflow: hidden;
}

/* Noise texture overlay for premium glass feel */
.login-card__noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 180px 180px;
  border-radius: inherit;
  z-index: 0;
}

.login-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-card__greeting {
  margin: 0 0 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  letter-spacing: 0.02em;
}

.login-card__header h2 {
  margin: 0;
  color: var(--login-text, #1f2937);
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.login-card__header p:last-child {
  margin: 0;
  color: var(--login-muted, #5f6b7a);
  font-size: 14px;
  line-height: 1.6;
  max-width: 20em;
}

.login-card__form {
  position: relative;
  z-index: 1;
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
  accent-color: var(--login-primary, #4FB3BF);
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
  .login-card {
    padding: 24px;
    border-radius: 22px;
  }

  .login-card__header h2 {
    font-size: 22px;
  }
}
</style>
