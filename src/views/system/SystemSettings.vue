<template>
  <div class="system-settings-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>系统设置</h1>
      <el-button type="primary" :icon="Check" @click="handleSave" :loading="saving">
        <i class="fas fa-save"></i> 保存设置
      </el-button>
    </div>

    <!-- 设置卡片 -->
    <el-card class="settings-card">
      <!-- 基本设置 -->
      <div class="setting-section">
        <h3>
          <i class="fas fa-cog"></i>
          基本设置
        </h3>
        <el-form :model="settings" label-width="150px" class="settings-form">
          <el-form-item label="系统Logo">
            <div class="logo-upload">
              <div class="logo-preview" v-if="logoPreviewUrl">
                <img :src="logoPreviewUrl" alt="Logo预览" />
                <el-button type="danger" size="small" @click="removeLogo" class="remove-btn">
                  删除
                </el-button>
              </div>
              <el-upload
                v-else
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="handleLogoChange"
              >
                <el-button type="primary">选择Logo图片</el-button>
              </el-upload>
              <span class="help-text">推荐尺寸：240x48像素，支持PNG、JPG格式</span>
            </div>
          </el-form-item>
          <el-form-item label="系统名称">
            <el-input v-model="settings.systemName" placeholder="请输入系统名称" />
          </el-form-item>
          <el-form-item label="系统版本">
            <el-input v-model="settings.systemVersion" disabled />
          </el-form-item>
          <el-form-item label="学校名称">
            <el-input v-model="settings.schoolName" placeholder="请输入学校名称" />
          </el-form-item>
        </el-form>
      </div>

      <el-divider />

      <!-- 备份设置 -->
      <div class="setting-section">
        <h3>
          <i class="fas fa-database"></i>
          备份设置
        </h3>
        <el-form :model="settings" label-width="150px" class="settings-form">
          <el-form-item label="自动备份">
            <el-switch v-model="settings.autoBackup" active-text="开启" inactive-text="关闭" />
            <span class="help-text">开启后将按设定间隔自动备份数据</span>
          </el-form-item>
          <el-form-item label="备份间隔（天）">
            <el-input-number
              v-model="settings.backupInterval"
              :min="1"
              :max="30"
              :disabled="!settings.autoBackup"
            />
            <span class="help-text">系统每隔指定天数自动执行备份</span>
          </el-form-item>
        </el-form>
      </div>

      <el-divider />

      <!-- 报告设置 -->
      <div class="setting-section">
        <h3>
          <i class="fas fa-chart-column"></i>
          报告设置
        </h3>
        <el-form :model="settings" label-width="150px" class="settings-form">
          <el-form-item label="默认报告格式">
            <el-radio-group v-model="settings.defaultReportFormat">
              <el-radio value="pdf">PDF</el-radio>
              <el-radio value="word">Word</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="包含学生头像">
            <el-switch
              v-model="settings.includeStudentAvatar"
              active-text="是"
              inactive-text="否"
            />
          </el-form-item>
          <el-form-item label="报告页眉">
            <el-input v-model="settings.reportHeader" placeholder="请输入报告页眉文字" />
          </el-form-item>
        </el-form>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { initDatabase } from '@/database/init'
import { useSystemConfigStore } from '@/stores/systemConfig'

const systemConfigStore = useSystemConfigStore()

const saving = ref(false)

// Logo相关
const logoPreviewUrl = ref('')
const logoFile = ref<File | null>(null)

// 系统设置
const settings = reactive({
  systemName: '感官综合训练与评估',
  systemVersion: '1.0.0',
  schoolName: '',
  autoBackup: true,
  backupInterval: 7,
  defaultReportFormat: 'pdf',
  includeStudentAvatar: true,
  reportHeader: '',
})

// 加载系统设置
const loadSettings = async () => {
  try {
    const db = await initDatabase()

    // 从数据库加载配置
    const configs = db.all(`
      SELECT key, value FROM system_config
    `)

    configs.forEach((config: any) => {
      const key = config.key
      const value = config.value

      switch (key) {
        case 'system_name':
          settings.systemName = value
          break
        case 'system_version':
          settings.systemVersion = value
          break
        case 'school_name':
          settings.schoolName = value
          break
        case 'logo_path':
          logoPreviewUrl.value = value
          break
        case 'auto_backup':
          settings.autoBackup = value === 'true'
          break
        case 'backup_interval':
          settings.backupInterval = parseInt(value) || 7
          break
        case 'default_report_format':
          settings.defaultReportFormat = value || 'pdf'
          break
        case 'include_student_avatar':
          settings.includeStudentAvatar = value === 'true'
          break
        case 'report_header':
          settings.reportHeader = value
          break
      }
    })
  } catch (error) {
    console.error('加载系统设置失败:', error)
  }
}

// 保存系统设置
const handleSave = async () => {
  saving.value = true
  try {
    // 如果有新的logo文件，先保存logo
    if (logoFile.value) {
      await saveLogo()
    }

    const db = await initDatabase()

    // 更新配置到数据库
    const configMap: Record<string, string> = {
      system_name: settings.systemName,
      school_name: settings.schoolName,
      logo_path: logoPreviewUrl.value,
      auto_backup: settings.autoBackup.toString(),
      backup_interval: settings.backupInterval.toString(),
      default_report_format: settings.defaultReportFormat,
      include_student_avatar: settings.includeStudentAvatar.toString(),
      report_header: settings.reportHeader,
    }

    for (const [key, value] of Object.entries(configMap)) {
      // 检查配置是否存在
      const existing = db.get('SELECT id FROM system_config WHERE key = ?', [key])

      if (existing) {
        // 更新现有配置
        db.run('UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [
          value,
          key,
        ])
      } else {
        // 插入新配置
        db.run(
          'INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value],
        )
      }
    }

    // 显式保存数据库到存储
    if (db.saveToStorage) {
      await db.saveToStorage()
      console.log('✅ 数据库已显式保存')
    }

    // 更新 store 中的系统配置
    await systemConfigStore.loadConfig()

    ElMessage.success('系统设置保存成功')
    logoFile.value = null // 清除临时文件
  } catch (error) {
    console.error('保存系统设置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 处理Logo选择
const handleLogoChange = (file: any) => {
  const selectedFile = file.raw
  // 验证文件类型
  if (!selectedFile.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  // 验证文件大小（限制2MB）
  if (selectedFile.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过2MB')
    return
  }

  logoFile.value = selectedFile
  // 显示预览
  const reader = new FileReader()
  reader.onload = (e) => {
    logoPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(selectedFile)
}

// 保存Logo到本地
const saveLogo = async () => {
  if (!logoFile.value) return

  try {
    // 读取文件为base64
    const reader = new FileReader()
    const promise = new Promise<string>((resolve, reject) => {
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(logoFile.value!)
    })

    const base64 = await promise
    logoPreviewUrl.value = base64
  } catch (error) {
    console.error('保存Logo失败:', error)
    throw error
  }
}

// 删除Logo
const removeLogo = () => {
  logoPreviewUrl.value = ''
  logoFile.value = null
}

// 初始化
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.system-settings-page {
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

.settings-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.setting-section {
  padding: 10px 0;
}

.setting-section h3 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-section h3 i {
  color: #667eea;
}

.settings-form {
  max-width: 600px;
}

.help-text {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

.logo-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.logo-preview {
  position: relative;
  display: inline-block;
}

.logo-preview img {
  max-width: 240px;
  max-height: 48px;
  object-fit: contain;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.logo-preview .remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-divider) {
  margin: 30px 0;
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
</style>
