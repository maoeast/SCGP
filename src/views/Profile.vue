<template>
  <div class="profile-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>个人资料</h1>
      <p class="subtitle">管理您的个人信息和密码</p>
    </div>

    <!-- 个人信息卡片 -->
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <i class="fas fa-user-circle"></i>
          <span>基本信息</span>
        </div>
      </template>

      <el-form :model="profileForm" :rules="profileRules" ref="profileFormRef" label-width="100px" class="profile-form">
        <el-form-item label="用户名">
          <el-input v-model="profileForm.username" disabled>
            <template #prepend>
              <i class="fas fa-user"></i>
            </template>
          </el-input>
          <div class="form-tip">用户名不可修改</div>
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="profileForm.name" placeholder="请输入您的姓名">
            <template #prepend>
              <i class="fas fa-id-card"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="角色">
          <el-input v-model="roleName" disabled>
            <template #prepend>
              <i class="fas fa-shield-halved"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="profileForm.email" placeholder="请输入邮箱（可选）">
            <template #prepend>
              <i class="fas fa-envelope"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSaveProfile">
            <i class="fas fa-save"></i> 保存修改
          </el-button>
          <el-button @click="loadProfile">
            <i class="fas fa-rotate-left"></i> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 修改密码卡片 -->
    <el-card class="password-card">
      <template #header>
        <div class="card-header">
          <i class="fas fa-key"></i>
          <span>修改密码</span>
        </div>
      </template>

      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px" class="password-form">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input
            v-model="passwordForm.oldPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
          >
            <template #prepend>
              <i class="fas fa-lock"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          >
            <template #prepend>
              <i class="fas fa-key"></i>
            </template>
          </el-input>
          <div class="form-tip">密码长度不能少于 6 个字符</div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          >
            <template #prepend>
              <i class="fas fa-check-double"></i>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="warning" :loading="changingPassword" @click="handleChangePassword">
            <i class="fas fa-rotate"></i> 修改密码
          </el-button>
          <el-button @click="resetPasswordForm">
            <i class="fas fa-rotate-left"></i> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 登录日志卡片 -->
    <el-card class="logs-card">
      <template #header>
        <div class="card-header">
          <i class="fas fa-clock-rotate-left"></i>
          <span>登录日志</span>
        </div>
      </template>

      <div v-if="loadingLogs" class="loading-wrapper">
        <el-skeleton :rows="5" animated />
      </div>

      <el-table
        v-else
        :data="loginLogs"
        stripe
        style="width: 100%"
        :empty-text="loginLogs.length === 0 ? '暂无登录记录' : ''"
      >
        <el-table-column prop="login_time" label="登录时间" width="180">
          <template #default="{ row }">
            {{ formatLoginTime(row.login_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP地址" width="140">
          <template #default="{ row }">
            {{ row.ip_address || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="failure_reason" label="备注">
          <template #default="{ row }">
            {{ row.failure_reason || '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { UserAPI } from '@/database/api'

const authStore = useAuthStore()
const userAPI = new UserAPI()

// 表单引用
const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

// 加载状态
const saving = ref(false)
const changingPassword = ref(false)
const loadingLogs = ref(false)

// 登录日志
const loginLogs = ref<any[]>([])

// 个人信息表单
const profileForm = reactive({
  username: '',
  name: '',
  email: ''
})

// 密码表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 角色名称
const roleName = computed(() => {
  return authStore.user?.role === 'admin' ? '管理员' : '教师'
})

// 个人信息表单验证规则
const profileRules: FormRules = {
  name: [
    { required: true, message: '请输入您的姓名', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

// 密码表单验证规则
const passwordRules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 加载个人信息
const loadProfile = () => {
  if (authStore.user) {
    profileForm.username = authStore.user.username
    profileForm.name = authStore.user.name || ''
    profileForm.email = authStore.user.email || ''
  }
}

// 保存个人信息
const handleSaveProfile = async () => {
  if (!profileFormRef.value) return

  await profileFormRef.value.validate(async (valid) => {
    if (!valid) return

    saving.value = true
    try {
      await userAPI.updateUser(authStore.user!.id, {
        username: profileForm.username,
        name: profileForm.name,
        email: profileForm.email || undefined
      })

      // 更新 store 中的用户信息
      authStore.user!.name = profileForm.name
      authStore.user!.email = profileForm.email

      ElMessage.success('个人信息保存成功')
    } catch (error: any) {
      console.error('保存个人信息失败:', error)
      ElMessage.error(error.message || '保存失败，请重试')
    } finally {
      saving.value = false
    }
  })
}

// 修改密码
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    changingPassword.value = true
    try {
      // 验证当前密码是否正确
      const currentPasswordValid = await authStore.login(profileForm.username, passwordForm.oldPassword)

      if (!currentPasswordValid) {
        ElMessage.error('当前密码错误，请重新输入')
        passwordForm.oldPassword = ''
        return
      }

      // 修改密码
      await userAPI.resetUserPassword(authStore.user!.id, passwordForm.newPassword)
      ElMessage.success('密码修改成功，请使用新密码重新登录')

      // 清空密码表单
      resetPasswordForm()

      // 延迟后退出登录
      setTimeout(() => {
        authStore.logout()
        window.location.href = '/login'
      }, 1500)
    } catch (error: any) {
      console.error('修改密码失败:', error)
      ElMessage.error(error.message || '修改密码失败，请重试')
    } finally {
      changingPassword.value = false
    }
  })
}

// 重置密码表单
const resetPasswordForm = () => {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordFormRef.value?.clearValidate()
}

// 加载登录日志
const loadLoginLogs = async () => {
  if (!authStore.user) return

  loadingLogs.value = true
  try {
    loginLogs.value = await userAPI.getUserLoginLogs(authStore.user.id, 20)
  } catch (error) {
    console.error('加载登录日志失败:', error)
  } finally {
    loadingLogs.value = false
  }
}

// 格式化登录时间
const formatLoginTime = (time: string) => {
  if (!time) return '-'
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 初始化
onMounted(() => {
  loadProfile()
  loadLoginLogs()
})
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 32px;
  background: linear-gradient(135deg, #3498db, #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  font-weight: 700;
}

.page-header .subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-header i {
  color: #3498db;
}

.info-card,
.password-card,
.logs-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.profile-form,
.password-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-input-group__prepend) {
  background-color: #f5f7fa;
  border-color: #dcdfe6;
}

:deep(.el-input-group__prepend i) {
  color: #909399;
  width: 16px;
  text-align: center;
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

:deep(.el-button i) {
  font-size: 14px;
}

.loading-wrapper {
  padding: 20px 0;
}

@media (max-width: 768px) {
  .profile-page {
    padding: 10px;
  }

  .profile-form,
  .password-form {
    padding: 10px;
  }
}
</style>
