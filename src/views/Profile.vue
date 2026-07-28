<template>
  <div class="page-container scgp-admin-page profile-page">
    <div class="page-header profile-page__header">
      <div class="header-left">
        <h1>个人资料</h1>
        <p class="subtitle">管理当前账号的基础信息、密码和最近登录记录。</p>
      </div>

      <div class="header-right">
        <el-button plain :loading="loadingLogs" @click="loadLoginLogs">
          <i class="fas fa-rotate"></i>
          刷新日志
        </el-button>
      </div>
    </div>

    <section class="scgp-stats-grid profile-stats" aria-label="个人资料概览">
      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">当前账号</div>
        <div class="summary-card__value summary-card__value--compact">{{ profileForm.username || '-' }}</div>
      </article>

      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">当前角色</div>
        <div class="summary-card__value summary-card__value--compact">{{ roleName }}</div>
      </article>

      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">激活状态</div>
        <div class="summary-card__value summary-card__value--compact">{{ activationLabel }}</div>
      </article>

      <article class="summary-card scgp-summary-card">
        <div class="summary-card__label">最近登录</div>
        <div class="summary-card__value summary-card__value--compact">{{ latestLoginLabel }}</div>
      </article>
    </section>

    <section class="scgp-page-panel profile-ai-history">
      <div class="scgp-content-toolbar">
        <div class="scgp-content-toolbar__main">
          <h2 class="scgp-content-toolbar__title">AI 聊天记录</h2>
          <p class="scgp-content-toolbar__description">查看、续聊或删除当前账号与 AI 智能体的历史会话。</p>
        </div>
        <el-button type="primary" @click="router.push({ name: 'AiChatHistory' })">
          <i class="fas fa-comments"></i>
          查看聊天记录
        </el-button>
      </div>
    </section>

    <section class="profile-grid">
      <section class="scgp-page-panel profile-panel">
        <div class="scgp-content-toolbar">
          <div class="scgp-content-toolbar__main">
            <h2 class="scgp-content-toolbar__title">基本信息</h2>
            <p class="scgp-content-toolbar__description">
              用户名保持只读，姓名和头像将同步更新到当前登录账号。
            </p>
          </div>

          <span class="scgp-pill-tag scgp-pill-tag--purple profile-pill">{{ roleName }}</span>
        </div>

        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-width="100px"
          class="profile-form"
        >
          <el-row :gutter="16" class="profile-form__account-row">
            <el-col :xs="24" :sm="12">
              <el-form-item label="用户名">
                <el-input v-model="profileForm.username" disabled>
                  <template #prepend>
                    <i class="fas fa-user"></i>
                  </template>
                </el-input>
                <div class="form-tip">用户名不可修改。</div>
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12">
              <el-form-item label="角色">
                <el-input v-model="roleName" disabled>
                  <template #prepend>
                    <i class="fas fa-shield-halved"></i>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="姓名" prop="name">
            <el-input v-model="profileForm.name" placeholder="请输入您的姓名">
              <template #prepend>
                <i class="fas fa-id-card"></i>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="头像">
            <div class="profile-avatar-field">
              <AvatarPicker
                v-model="profileForm.avatar_path"
                :presets="teacherAvatarPresets"
                preset-label="教师预置头像"
                :fallback-name="profileForm.name"
              />
              <div class="form-tip">可选择预置头像，也可上传图片或拍照。</div>
            </div>
          </el-form-item>

          <el-form-item class="profile-form__actions">
            <el-button type="primary" :loading="saving" @click="handleSaveProfile">
              <i class="fas fa-save"></i>
              保存修改
            </el-button>
            <el-button @click="loadProfile">
              <i class="fas fa-rotate-left"></i>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </section>

      <section class="scgp-page-panel profile-panel">
        <div class="scgp-content-toolbar">
          <div class="scgp-content-toolbar__main">
            <h2 class="scgp-content-toolbar__title">修改密码</h2>
            <p class="scgp-content-toolbar__description">
              新密码长度不少于 6 位，修改成功后会自动退出并要求重新登录。
            </p>
          </div>
        </div>

        <el-form
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-width="100px"
          class="password-form"
        >
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
            <div class="form-tip">密码长度不能少于 6 个字符。</div>
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

          <el-form-item class="profile-form__actions">
            <el-button type="warning" :loading="changingPassword" @click="handleChangePassword">
              <i class="fas fa-rotate"></i>
              修改密码
            </el-button>
            <el-button @click="resetPasswordForm">
              <i class="fas fa-rotate-left"></i>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </section>
    </section>

    <section class="scgp-page-panel profile-panel profile-panel--logs">
      <div class="scgp-content-toolbar">
        <div class="scgp-content-toolbar__main">
          <h2 class="scgp-content-toolbar__title">登录日志</h2>
          <p class="scgp-content-toolbar__description">默认显示最近 20 条登录记录，用于排查当前账号的登录情况。</p>
        </div>

        <div class="scgp-content-toolbar__actions">
          <span class="profile-log-count">共 {{ loginLogs.length }} 条</span>
        </div>
      </div>

      <div v-if="loadingLogs" class="loading-wrapper">
        <el-skeleton :rows="5" animated />
      </div>

      <el-table
        v-else
        :data="loginLogs"
        class="scgp-records-table profile-log-table"
        stripe
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { UserAPI } from '@/database/api'
import AvatarPicker from '@/components/common/AvatarPicker.vue'
import { TEACHER_AVATAR_PRESETS } from '@/utils/avatar-presets'

const authStore = useAuthStore()
const userAPI = new UserAPI()
const router = useRouter()
const teacherAvatarPresets = TEACHER_AVATAR_PRESETS

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
  avatar_path: '',
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

const activationLabel = computed(() => {
  if (authStore.activationInfo.isActivated) {
    return authStore.activationInfo.isInTrial ? '试用中' : '已激活'
  }
  if (authStore.activationInfo.isInTrial) {
    return '试用中'
  }
  return '未激活'
})

const latestLoginLabel = computed(() => {
  if (!loginLogs.value.length) {
    return '暂无记录'
  }
  return formatLoginTime(loginLogs.value[0].login_time)
})

// 个人信息表单验证规则
const profileRules: FormRules = {
  name: [
    { required: true, message: '请输入您的姓名', trigger: 'blur' }
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
    profileForm.avatar_path = authStore.user.avatar_path || ''
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
        avatar_path: profileForm.avatar_path || null,
      })

      authStore.updateCurrentUser({
        name: profileForm.name,
        avatar_path: profileForm.avatar_path || null,
      })

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
  gap: 20px;
}

.profile-stats {
  margin: 0;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.profile-panel {
  padding: 22px;
}

.profile-ai-history {
  padding: 20px 22px;
}

.profile-panel--logs {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-pill {
  align-self: flex-start;
}

.profile-form,
.password-form {
  padding-top: 18px;
}

.profile-avatar-field {
  width: 100%;
}

.profile-form__account-row {
  margin-bottom: 0;
}

.profile-form__actions :deep(.el-form-item__content) {
  gap: 12px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.profile-log-count {
  color: #606266;
  font-size: 13px;
}

.profile-log-table {
  width: 100%;
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
  padding: 6px 0;
}

@media (max-width: 768px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-panel {
    padding: 18px;
  }
}
</style>
