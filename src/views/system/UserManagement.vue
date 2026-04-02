<template>
  <div class="system-user-management scgp-records-stack">
    <div class="scgp-content-toolbar">
      <div class="scgp-content-toolbar__main">
        <h2 class="scgp-content-toolbar__title">用户管理</h2>
        <p class="scgp-content-toolbar__description">
          管理系统账号、角色权限与启用状态 · 共 {{ stats.total }} 个账号
        </p>
      </div>
      <div class="scgp-content-toolbar__actions">
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          新增用户
        </el-button>
      </div>
    </div>

    <section class="stats-row system-user-stats" aria-label="用户统计概览">
      <article class="summary-card scgp-summary-card scgp-summary-card--muted">
        <div class="summary-card__label">用户总数</div>
        <div class="summary-card__value summary-card__value--compact">{{ stats.total }}</div>
      </article>
      <article class="summary-card scgp-summary-card scgp-summary-card--muted">
        <div class="summary-card__label">管理员</div>
        <div class="summary-card__value summary-card__value--compact">{{ stats.admin }}</div>
      </article>
      <article class="summary-card scgp-summary-card scgp-summary-card--muted">
        <div class="summary-card__label">教师</div>
        <div class="summary-card__value summary-card__value--compact">{{ stats.teacher }}</div>
      </article>
      <article class="summary-card scgp-summary-card scgp-summary-card--muted">
        <div class="summary-card__label">活跃用户</div>
        <div class="summary-card__value summary-card__value--compact">{{ stats.active }}</div>
      </article>
    </section>

    <section class="system-user-table scgp-page-panel scgp-page-panel--flush">
      <el-table :data="userList" class="system-user-table__inner" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column label="角色" width="100">
          <template #default="scope">
            <span
              class="scgp-pill-tag"
              :class="scope.row.role === 'admin' ? 'scgp-pill-tag--purple' : 'scgp-pill-tag--green'"
            >
              {{ scope.row.role === 'admin' ? '管理员' : '教师' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="状态" width="88">
          <template #default="scope">
            <el-tag :type="scope.row.is_active ? 'success' : 'info'" size="small">
              {{ scope.row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.last_login) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="scope">
            <div class="system-user-actions">
              <el-button
                v-if="scope.row.id !== 1"
                type="primary"
                plain
                size="small"
                @click="handleEdit(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="scope.row.id !== 1"
                plain
                size="small"
                @click="handleResetPassword(scope.row)"
              >
                重置密码
              </el-button>
              <el-dropdown
                trigger="click"
                @command="handleActionMenuCommand(scope.row, $event)"
              >
                <el-button class="system-user-actions__more" plain size="small" circle>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :disabled="scope.row.id === 1" command="toggle">
                      {{ scope.row.is_active ? '禁用账号' : '启用账号' }}
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="scope.row.role !== 'admin' && scope.row.id !== 1"
                      command="delete"
                      class="system-user-actions__danger"
                    >
                      删除账号
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="showDialog"
      :title="dialogMode === 'add' ? '新增用户' : '编辑用户'"
      width="500px"
      append-to-body
      @close="resetForm"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'add'" label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="教师" value="teacher" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPasswordDialog" title="重置密码" width="400px" append-to-body>
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="80px">
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handlePasswordSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { MoreFilled, Plus } from '@element-plus/icons-vue'
import { UserAPI } from '@/database/api'

const userAPI = new UserAPI()

const userList = ref<any[]>([])
const stats = ref({
  total: 0,
  admin: 0,
  teacher: 0,
  active: 0,
  inactive: 0,
})
const loading = ref(false)
const submitting = ref(false)

const showDialog = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const showPasswordDialog = ref(false)
const currentUserId = ref<number | null>(null)

const formData = reactive({
  username: '',
  name: '',
  password: '',
  role: 'teacher' as 'admin' | 'teacher',
  email: '',
})

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: '',
})

const formRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' },
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' },
  ],
}

const passwordRules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' },
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
      trigger: 'blur',
    },
  ],
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadUsers = async () => {
  loading.value = true
  try {
    userList.value = await userAPI.getAllUsers()
    stats.value = await userAPI.getUserStats()
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  dialogMode.value = 'add'
  resetForm()
  showDialog.value = true
}

const handleEdit = (user: any) => {
  dialogMode.value = 'edit'
  Object.assign(formData, {
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email || '',
  })
  currentUserId.value = user.id
  showDialog.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      if (dialogMode.value === 'add') {
        await userAPI.createUser({
          username: formData.username,
          password: formData.password,
          role: formData.role,
          name: formData.name,
          email: formData.email || undefined,
        })
        ElMessage.success('用户添加成功')
      } else {
        await userAPI.updateUser(currentUserId.value!, {
          username: formData.username,
          role: formData.role,
          name: formData.name,
          email: formData.email || undefined,
        })
        ElMessage.success('用户更新成功')
      }

      showDialog.value = false
      await loadUsers()
    } catch (error: any) {
      console.error('操作失败:', error)
      ElMessage.error(error.message || '操作失败，请重试')
    } finally {
      submitting.value = false
    }
  })
}

const handleResetPassword = (user: any) => {
  currentUserId.value = user.id
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  showPasswordDialog.value = true
}

const handlePasswordSubmit = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      await userAPI.resetUserPassword(currentUserId.value!, passwordForm.newPassword)
      ElMessage.success('密码重置成功')
      showPasswordDialog.value = false
    } catch (error: any) {
      console.error('重置密码失败:', error)
      ElMessage.error(error.message || '重置密码失败，请重试')
    } finally {
      submitting.value = false
    }
  })
}

const handleToggleActive = async (user: any) => {
  const action = user.is_active ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户"${user.name}"吗？`,
      `${action}确认`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await userAPI.toggleUserActive(user.id, !user.is_active)
    ElMessage.success(`${action}成功`)
    await loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
      ElMessage.error(error.message || `${action}失败`)
    }
  }
}

const handleDelete = async (user: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户"${user.name}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await userAPI.deleteUser(user.id)
    ElMessage.success('删除成功')
    await loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleActionMenuCommand = (user: any, command: string) => {
  if (command === 'toggle') {
    handleToggleActive(user)
    return
  }

  if (command === 'delete') {
    handleDelete(user)
  }
}

const resetForm = () => {
  Object.assign(formData, {
    username: '',
    name: '',
    password: '',
    role: 'teacher',
    email: '',
  })
  currentUserId.value = null
  formRef.value?.resetFields()
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.system-user-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.system-user-table {
  overflow: hidden;
}

.system-user-table__inner {
  width: 100%;
}

.system-user-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.system-user-actions__more {
  min-width: 32px;
}

:deep(.system-user-actions__danger) {
  color: #c45656;
}

:deep(.system-user-table__inner .el-table__header th) {
  background: #fbfcfe;
  color: #606266;
  font-weight: 600;
}

:deep(.system-user-table__inner .el-table__body td) {
  padding-top: 14px;
  padding-bottom: 14px;
}

@media (max-width: 1100px) {
  .system-user-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .system-user-stats {
    grid-template-columns: 1fr;
  }

  .system-user-actions {
    flex-wrap: wrap;
  }
}
</style>
