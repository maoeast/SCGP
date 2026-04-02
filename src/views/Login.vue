<template>
  <div class="login-shell">
    <div class="login-layout">
      <div class="login-layout__brand">
        <SchoolPanel
          :logo-src="systemConfigStore.displayLogoPath"
          :system-name="systemConfigStore.systemName || defaultSystemName"
          :school-name="systemConfigStore.schoolName"
          :brand-title="systemConfigStore.brandPanelTitle"
          :brand-subtitle="systemConfigStore.brandPanelSubtitle"
          :brand-description="systemConfigStore.brandPanelDescription"
        />
      </div>

      <div class="login-layout__form">
        <LoginCard
          v-model:username="loginForm.username"
          v-model:password="loginForm.password"
          v-model:remember="loginForm.remember"
          :loading="isLogging"
          :error-message="loginError"
          @submit="handleLogin"
          @emergency-reset="handleEmergencyReset"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import LoginCard from '@/components/login/LoginCard.vue'
import SchoolPanel from '@/components/login/SchoolPanel.vue'
import { UserAPI } from '@/database/api'
import { useAuthStore } from '@/stores/auth'
import { useSystemConfigStore } from '@/stores/systemConfig'

const REMEMBERED_USERNAME_KEY = 'scgp_login_username'
const defaultSystemName = '星愿能力发展训练系统'

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
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--login-page-bg, linear-gradient(135deg, #eef4fb 0%, #f6f9fc 100%));
}

.login-layout {
  width: min(1180px, 100%);
  min-height: min(760px, calc(100vh - 40px));
  display: grid;
  grid-template-columns: minmax(340px, 40fr) minmax(420px, 60fr);
  border: 1px solid var(--login-border, #dbe5f0);
  border-radius: 30px;
  overflow: hidden;
  background: var(--login-surface, #ffffff);
  box-shadow: 0 28px 60px rgba(24, 57, 111, 0.12);
}

.login-layout__brand {
  min-width: 0;
}

.login-layout__form {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(24px, 4vw, 48px);
  background:
    radial-gradient(circle at top left, rgba(47, 111, 214, 0.05), transparent 28%),
    linear-gradient(180deg, var(--login-surface-soft, #f7fafd) 0%, var(--login-surface, #ffffff) 100%);
}

@media (max-width: 1024px) {
  .login-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .login-layout__form {
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
  }

  .login-layout__form {
    padding: 18px;
  }
}
</style>
