<template>
  <div class="login-shell">
    <GalaxyBackground
      class="login-shell__background"
      :variant="loginThemeVariant"
      :custom-bg-image="systemConfigStore.loginCustomBgImage"
    />
    <div class="login-shell__veil"></div>

    <div class="login-layout">
      <div class="login-layout__brand">
        <SchoolPanel
          :logo-src="systemConfigStore.displayLoginLogoPath"
          :system-name="systemConfigStore.systemName || defaultSystemName"
          :school-name="systemConfigStore.schoolName || defaultSchoolName"
          :brand-description="systemConfigStore.brandPanelDescription"
        />
      </div>

      <div class="login-layout__form">
        <LoginCard
          v-model:username="loginForm.username"
          v-model:password="loginForm.password"
          v-model:remember="loginForm.remember"
          :loading="isLogging"
          :submit-disabled="isLoginButtonDisabled"
          :error-message="loginError"
          @submit="handleLogin"
          @emergency-reset="handleEmergencyReset"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import GalaxyBackground from '@/components/login/GalaxyBackground.vue'
import LoginCard from '@/components/login/LoginCard.vue'
import SchoolPanel from '@/components/login/SchoolPanel.vue'
import { UserAPI } from '@/database/api'
import { useAuthStore } from '@/stores/auth'
import { useSystemConfigStore } from '@/stores/systemConfig'
import { normalizeLoginThemeVariant } from '@/utils/login-theme'

const REMEMBERED_USERNAME_KEY = 'scgp_login_username'
const defaultSystemName = '星愿能力发展训练系统'
const defaultSchoolName = 'XX学校'
const defaultTagline = '为学校及康复团队，提供科学、稳定、持续的评估训练方案'

const router = useRouter()
const authStore = useAuthStore()
const systemConfigStore = useSystemConfigStore()
const userAPI = new UserAPI()

const loginForm = ref({
  username: '',
  password: '',
  remember: false,
})

const isLogging = ref(false)
const loginError = ref('')
const isLoginButtonDisabled = ref(true)

const loginThemeVariant = computed(() =>
  normalizeLoginThemeVariant(systemConfigStore.loginThemeVariant),
)

const restoreRememberedUsername = () => {
  const rememberedUsername = localStorage.getItem(REMEMBERED_USERNAME_KEY)
  if (rememberedUsername) {
    loginForm.value.username = rememberedUsername
    loginForm.value.remember = true
  }
}

const persistRememberedUsername = () => {
  if (loginForm.value.remember && loginForm.value.username.trim()) {
    localStorage.setItem(REMEMBERED_USERNAME_KEY, loginForm.value.username.trim())
    return
  }
  localStorage.removeItem(REMEMBERED_USERNAME_KEY)
}

const handleLogin = async () => {
  loginError.value = ''

  try {
    isLogging.value = true

    const success = await authStore.login(loginForm.value.username.trim(), loginForm.value.password)

    if (success) {
      persistRememberedUsername()
      const redirect = router.currentRoute.value.query.redirect as string
      router.push(redirect || '/dashboard')
      return
    }

    loginError.value = '用户名或密码错误，请检查后重试。'
  } catch (error) {
    console.error('登录失败:', error)
    loginError.value = '登录失败，请稍后重试。'
  } finally {
    isLogging.value = false
  }
}

const handleEmergencyReset = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将把管理员密码重置为默认密码 admin123，仅用于紧急恢复登录。',
      '确认重置管理员密码',
      {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await userAPI.resetUserPassword(1, 'admin123')
    ElMessage.success('管理员密码已重置为 admin123，请登录后尽快修改。')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error('重置管理员密码失败')
    }
  }
}

watch(
  [() => loginForm.value.username, () => loginForm.value.password],
  ([username, password]) => {
    isLoginButtonDisabled.value = !username.trim() || !password.trim()
  },
  { immediate: true },
)

onMounted(async () => {
  await systemConfigStore.loadConfig()
  restoreRememberedUsername()

  await nextTick()

  const hasStartedTyping = loginForm.value.username !== '' || loginForm.value.password !== ''

  if (!hasStartedTyping) {
    await authStore.checkActivation()
    if (!authStore.isActivated) {
      router.replace('/activation')
    }
  }
})
</script>

<style scoped>
.login-shell {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  padding: 18px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--login-shell-bg, #0b0718);
}

.login-shell__background,
.login-shell__veil {
  position: absolute;
  inset: 0;
}

.login-shell__veil {
  pointer-events: none;
  z-index: 0;
  background: var(--login-shell-veil,
    radial-gradient(circle at 20% 14%, rgba(255, 246, 214, 0.04), transparent 18%),
    radial-gradient(circle at 84% 18%, rgba(255, 202, 224, 0.05), transparent 14%),
    linear-gradient(135deg, rgba(8, 8, 18, 0.04) 0%, rgba(11, 7, 24, 0.14) 100%)
  );
}

.login-layout {
  position: relative;
  z-index: 1;
  width: min(1200px, 100%);
  min-height: min(736px, calc(100vh - 36px));
  display: grid;
  grid-template-columns: minmax(400px, 45fr) minmax(440px, 55fr);
  border: 1px solid var(--login-layout-border, rgba(255, 255, 255, 0.16));
  border-radius: 32px;
  overflow: hidden;
  background: var(--login-layout-bg, rgba(13, 7, 24, 0.34));
  backdrop-filter: blur(10px);
  box-shadow: var(--login-layout-shadow, 0 36px 100px rgba(2, 6, 23, 0.42));
}

.login-layout__brand {
  min-width: 0;
  background: var(--login-brand-panel-bg, #f2c94c);
}

.login-layout__form {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(32px, 4.8vw, 60px) clamp(32px, 4.8vw, 64px) clamp(32px, 4.8vw, 60px) clamp(28px, 4vw, 48px);
  background: var(--login-form-pane-bg,
    radial-gradient(circle at left center, rgba(255, 216, 131, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 251, 246, 0.92) 0%, rgba(255, 255, 255, 0.97) 100%)
  );
}

@media (max-width: 1024px) {
  .login-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .login-layout__form {
    justify-content: center;
    padding-top: 0;
  }
}

@media (max-width: 768px) {
  .login-shell {
    padding: 12px;
  }

  .login-layout {
    width: 100%;
    border-radius: 24px;
    background: rgba(14, 12, 30, 0.34);
  }

  .login-layout__form {
    padding: 18px;
  }
}
</style>
