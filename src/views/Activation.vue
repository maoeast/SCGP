<template>
  <div class="activation-container">
    <div class="activation-card">
      <div class="activation-header">
        <h1 class="not-activated-title">软件未激活</h1>
        <p v-if="systemConfigStore.schoolName">{{ systemConfigStore.schoolName }}</p>
      </div>

      <!-- 机器码 - 放在首行最显眼位置 -->
      <div class="machine-code-section">
        <div class="machine-code-header">
          <i class="fas fa-microchip"></i>
          <h3>您的机器码</h3>
        </div>
        <div class="machine-code-display">
          <code class="machine-code-text">{{ authStore.activationInfo.machineCode || '正在获取...' }}</code>
          <button @click="copyMachineCode" class="copy-machine-btn" title="复制机器码">
            <i class="fas fa-copy"></i>
            复制
          </button>
        </div>
        <p class="machine-code-hint">请将机器码发送给软件供应商获取激活码</p>
      </div>

      <!-- 激活表单 -->
      <div v-if="!authStore.activationInfo.isActivated || showActivationForm" class="activation-form">
        <h3>输入激活码</h3>
        <form @submit.prevent="handleActivation">
          <div class="form-group">
            <div class="input-with-button">
              <input
                v-model="activationCode"
                type="text"
                placeholder="请输入激活码（格式：SPED-XXXX...）"
                required
              />
              <button type="button" @click="pasteActivationCode" class="paste-btn" title="粘贴激活码">
                <i class="fas fa-paste"></i>
                粘贴
              </button>
            </div>
          </div>

          <button type="submit" class="activate-btn" :disabled="isActivating">
            {{ isActivating ? '验证中...' : '验证激活码' }}
          </button>
        </form>

        <div class="activation-info">
          <h4>关于激活</h4>
          <ul>
            <li>激活码与设备绑定，不可转移</li>
            <li>支持永久激活和限时激活（如1年、3年）</li>
            <li>激活数据使用 RSA 数字签名加密存储</li>
            <li>请妥善保管您的激活码</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSystemConfigStore } from '@/stores/systemConfig'

const router = useRouter()
const authStore = useAuthStore()
const systemConfigStore = useSystemConfigStore()

const activationCode = ref('')
const isActivating = ref(false)
const showActivationForm = ref(false)

// 在组件挂载时检查激活状态
onMounted(async () => {
  // 加载系统配置
  systemConfigStore.loadConfig()
  await authStore.checkActivation()

  console.log('激活状态:', {
    isActivated: authStore.activationInfo.isActivated,
    machineCode: authStore.activationInfo.machineCode,
    expiresAt: authStore.activationInfo.expiresAt
  })

  // 如果已激活，自动跳转到登录页
  if (authStore.activationInfo.isActivated) {
    router.push('/login')
  }
})

// 处理激活
const handleActivation = async () => {
  try {
    isActivating.value = true
    const result = await authStore.validateActivationCodeWithMessage(activationCode.value)

    if (result.success) {
      alert('激活成功！')
      router.push('/login')
    } else {
      alert(`激活失败：${result.message}`)
    }
  } catch (error) {
    console.error('激活失败:', error)
    alert(`激活失败：${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    isActivating.value = false
  }
}

// 复制机器码
const copyMachineCode = async () => {
  try {
    await navigator.clipboard.writeText(authStore.activationInfo.machineCode)
    alert('机器码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 粘贴激活码
const pasteActivationCode = async () => {
  try {
    const text = await navigator.clipboard.readText()
    activationCode.value = text.trim()
  } catch (error) {
    console.error('粘贴失败:', error)
    alert('粘贴失败，请手动输入激活码')
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
/* 定义CSS变量 */
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --accent-color: #e74c3c;
}

.activation-container {
  min-height: 100vh;
  /* 创建比容器大得多的背景，用于流动动画 */
  background: linear-gradient(
    -45deg,
    #3498db,
    #2ecc71,
    #3498db,
    #2980b9,
    #27ae60,
    #3498db
  );
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
.activation-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at 20% 50%,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 50%
  ),
  radial-gradient(
    circle at 80% 80%,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 50%
  );
  pointer-events: none;
  animation: overlayFloat 20s ease-in-out infinite;
}

/* 覆盖层浮动动画 */
@keyframes overlayFloat {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.activation-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  width: 100%;
  max-width: 600px;
  padding: 40px;
  position: relative;
  z-index: 1;
  /* 卡片微妙的悬浮动画 */
  animation: cardFloat 6s ease-in-out infinite;
}

/* 卡片悬浮动画 */
@keyframes cardFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.activation-header {
  text-align: center;
  margin-bottom: 30px;
}

.activation-header h1 {
  font-size: 32px;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
  font-weight: 700;
}

/* 未激活标题样式 - 醒目的橙红色 */
.not-activated-title {
  background: linear-gradient(135deg, #e74c3c, #f39c12) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}

.activation-header p {
  color: #666;
  font-size: 16px;
}

/* 机器码区域 - 放在最前面 */
.machine-code-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 30px;
  color: white;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.machine-code-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.machine-code-header i {
  font-size: 24px;
}

.machine-code-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.machine-code-display {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.2);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
}

.machine-code-text {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  word-break: break-all;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.copy-machine-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.copy-machine-btn:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.copy-machine-btn:active {
  transform: translateY(0);
}

.machine-code-hint {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
  text-align: center;
}

.activation-form {
  margin-bottom: 30px;
}

.activation-form h3 {
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

/* 输入框带按钮的容器 */
.input-with-button {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.input-with-button input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
}

.input-with-button input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
}

.paste-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
  background-size: 200% 200%;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  animation: btnGradient 3s ease infinite;
}

.paste-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.5);
}

.paste-btn:active {
  transform: translateY(0);
}

.form-group input {
  width: 100%;
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

.input-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #3498db;
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-hint i {
  font-size: 14px;
}

.activate-btn {
  width: 100%;
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

.activate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(52, 152, 219, 0.5);
}

.activate-btn:active:not(:disabled) {
  transform: translateY(0);
}

.activate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  animation: none;
}

.activation-info {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.activation-info h4 {
  margin-bottom: 16px;
  color: #333;
}

.activation-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.activation-info li {
  padding: 8px 0;
  color: #666;
  position: relative;
  padding-left: 20px;
}

.activation-info li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #3498db;
  font-size: 18px;
}

@media (max-width: 480px) {
  .activation-card {
    padding: 30px 20px;
    animation: none; /* 移动设备上禁用浮动动画以提升性能 */
  }

  .activation-container::before {
    animation: none; /* 移动设备上禁用覆盖层动画 */
  }

  .machine-code-display {
    flex-direction: column;
    align-items: stretch;
  }

  .machine-code-text {
    font-size: 16px;
    text-align: center;
    margin-bottom: 12px;
  }

  .copy-machine-btn {
    justify-content: center;
  }

  .input-with-button {
    flex-direction: column;
  }

  .paste-btn {
    justify-content: center;
  }
}
</style>
