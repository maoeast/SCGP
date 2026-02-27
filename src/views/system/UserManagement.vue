<template>
  <div class="user-management-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>用户管理</h1>
      <el-button type="primary" :icon="Plus" @click="showAddDialog">
        <i class="fas fa-plus"></i> 新增用户
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon blue">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">用户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon orange">
              <i class="fas fa-user-shield"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.admin }}</div>
              <div class="stat-label">管理员</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon green">
              <i class="fas fa-chalkboard-user"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.teacher }}</div>
              <div class="stat-label">教师</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon purple">
              <i class="fas fa-user-check"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.active }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 用户列表 -->
    <el-card class="table-card">
      <el-table :data="userList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column label="角色" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'primary'" size="small">
              {{ scope.row.role === 'admin' ? '管理员' : '教师' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column label="状态" width="80">
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
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.id !== 1"
              type="primary"
              size="small"
              @click="handleEdit(scope.row)"
            >
              <i class="fas fa-edit"></i> 编辑
            </el-button>
            <el-button
              v-if="scope.row.id !== 1"
              type="warning"
              size="small"
              @click="handleResetPassword(scope.row)"
            >
              <i class="fas fa-key"></i> 重置密码
            </el-button>
            <el-button
              :type="scope.row.is_active ? 'warning' : 'success'"
              size="small"
              @click="handleToggleActive(scope.row)"
              :disabled="scope.row.id === 1"
            >
              <i class="fas" :class="scope.row.is_active ? 'fa-lock' : 'fa-unlock'"></i>
              {{ scope.row.is_active ? '禁用' : '启用' }}
            </el-button>
            <el-button
              v-if="scope.row.id !== 1"
              type="danger"
              size="small"
              @click="handleDelete(scope.row)"
            >
              <i class="fas fa-trash"></i> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑用户对话框 -->
    <el-dialog
      v-model="showDialog"
      :title="dialogMode === 'add' ? '新增用户' : '编辑用户'"
      width="500px"
      append-to-body
      @close="resetForm"
    >
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="80px">
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
        <el-form-item label="密码" prop="password" v-if="dialogMode === 'add'">
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
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="showPasswordDialog" title="重置密码" width="400px" append-to-body>
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="80px">
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
        <el-button type="primary" @click="handlePasswordSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { UserAPI } from '@/database/api'

const userAPI = new UserAPI()

// 数据
const userList = ref<any[]>([])
const stats = ref({
  total: 0,
  admin: 0,
  teacher: 0,
  active: 0,
  inactive: 0
})
const loading = ref(false)
const submitting = ref(false)

// 对话框状态
const showDialog = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const showPasswordDialog = ref(false)
const currentUserId = ref<number | null>(null)

// 表单数据
const formData = reactive({
  username: '',
  name: '',
  password: '',
  role: 'teacher' as 'admin' | 'teacher',
  email: ''
})

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 表单引用
const formRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

// 表单验证规则
const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const passwordRules: FormRules = {
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

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载用户列表
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

// 显示新增对话框
const showAddDialog = () => {
  dialogMode.value = 'add'
  resetForm()
  showDialog.value = true
}

// 编辑用户
const handleEdit = (user: any) => {
  dialogMode.value = 'edit'
  Object.assign(formData, {
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email || ''
  })
  currentUserId.value = user.id
  showDialog.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      if (dialogMode.value === 'add') {
        // 新增用户
        await userAPI.createUser({
          username: formData.username,
          password: formData.password,
          role: formData.role,
          name: formData.name,
          email: formData.email || undefined
        })
        ElMessage.success('用户添加成功')
      } else {
        // 编辑用户
        await userAPI.updateUser(currentUserId.value!, {
          username: formData.username,
          role: formData.role,
          name: formData.name,
          email: formData.email || undefined
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

// 重置密码
const handleResetPassword = (user: any) => {
  currentUserId.value = user.id
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  showPasswordDialog.value = true
}

// 提交密码重置
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

// 启用/禁用用户
const handleToggleActive = async (user: any) => {
  const action = user.is_active ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户"${user.name}"吗？`,
      `${action}确认`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
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

// 删除用户
const handleDelete = async (user: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户"${user.name}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
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

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    username: '',
    name: '',
    password: '',
    role: 'teacher',
    email: ''
  })
  currentUserId.value = null
  formRef.value?.resetFields()
}

// 初始化
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.user-management-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h1 {
  margin: 0;
  color: #303133;
}

.stats-row {
  margin: 0;
}

.stat-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.orange {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.green {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.purple {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.table-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-button i) {
  font-size: 12px;
}
</style>
