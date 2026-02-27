<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>{{ systemConfigStore.systemName || '感官综合训练与评估' }}</h1>
        <p v-if="systemConfigStore.schoolName">{{ systemConfigStore.schoolName }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="loginForm.username" type="text" placeholder="请输入用户名" required />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input v-model="loginForm.password" type="password" placeholder="请输入密码" required />
        </div>

        <div class="form-options">
          <label class="checkbox">
            <input v-model="loginForm.remember" type="checkbox" />
            <span>记住密码</span>
          </label>
        </div>

        <button type="submit" class="login-btn" :disabled="isLogging">
          {{ isLogging ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="login-footer">
        <p class="emergency-reset" @click="handleEmergencyReset">重置管理员密码</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSystemConfigStore } from '@/stores/systemConfig'
import { UserAPI } from '@/database/api'

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

const handleLogin = async () => {
  try {
    isLogging.value = true

    const success = await authStore.login(loginForm.value.username, loginForm.value.password)

    if (success) {
      // 登录成功，跳转到首页
      const redirect = router.currentRoute.value.query.redirect as string
      router.push(redirect || '/dashboard')
    } else {
      alert('用户名或密码错误')
    }
  } catch (error) {
    console.error('登录失败:', error)
    alert('登录失败，请重试')
  } finally {
    isLogging.value = false
  }
}

// 紧急重置管理员密码
const handleEmergencyReset = async () => {
  const confirmed = confirm('警告：此操作将把管理员密码重置为默认密码（admin123），确定要继续吗？')

  if (!confirmed) {
    return // 用户取消，不执行任何操作
  }

  try {
    await userAPI.resetUserPassword(1, 'admin123')
    alert('管理员密码已重置为：admin123\n请使用此密码登录后及时修改')
  } catch (error) {
    console.error('重置密码失败:', error)
    alert('重置密码失败')
  }
}

// 加载系统配置并检查激活状态
onMounted(async () => {
  // 先加载系统配置
  systemConfigStore.loadConfig()

  // 延迟检查激活状态，避免打断用户输入
  // 使用 nextTick 确保视图已完全渲染
  await import('vue').then(({ nextTick }) => nextTick())

  // 检查激活状态，如果未激活则跳转到激活页面
  // 只在首次加载且用户未开始输入时跳转
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
/* 定义CSS变量 */
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --accent-color: #e74c3c;
}

.login-container {
  min-height: 100vh;
  /* 创建比容器大得多的背景，用于流动动画 */
  background: linear-gradient(-45deg, #3498db, #2ecc71, #3498db, #2980b9, #27ae60, #3498db);
  background-size: 400% 400%;
  /* 流动动画：15秒完成一次循环 */
  animation: gradientFlow 15s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 添加流动的渐变动画 */
@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 添加半透明覆盖层，增加层次感 */
.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
  animation: overlayFloat 20s ease-in-out infinite;
}

/* 覆盖层浮动动画 */
@keyframes overlayFloat {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  width: 100%;
  max-width: 450px;
  padding: 40px;
  position: relative;
  z-index: 1;
  /* 卡片微妙的悬浮动画 */
  animation: cardFloat 6s ease-in-out infinite;
}

/* 卡片悬浮动画 */
@keyframes cardFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 28px;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
  font-weight: 700;
}

.login-header p {
  color: #666;
  font-size: 16px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.checkbox input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3498db;
}

.form-options a {
  color: #3498db;
  text-decoration: none;
  font-size: 14px;
}

.form-options a:hover {
  text-decoration: underline;
}

.login-btn {
  padding: 14px;
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
  background-size: 200% 200%;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    background-position 0.5s;
  animation: btnGradient 3s ease infinite;
}

/* 按钮渐变流动动画 */
@keyframes btnGradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(52, 152, 219, 0.5);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  animation: none;
}

.login-footer {
  margin-top: 30px;
  text-align: center;
}

.login-footer p {
  font-size: 12px;
  color: #999;
  margin: 5px 0;
}

.emergency-reset {
  color: rgba(255, 255, 255, 0.3) !important;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.3s;
  text-decoration: none !important;
}

.emergency-reset:hover {
  color: rgba(255, 255, 255, 0.5) !important;
}

@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
    animation: none; /* 移动设备上禁用浮动动画以提升性能 */
  }

  .login-header h1 {
    font-size: 24px;
  }

  .login-container::before {
    animation: none; /* 移动设备上禁用覆盖层动画 */
  }
}
</style>
