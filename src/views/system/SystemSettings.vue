<template>
  <div class="system-settings-page scgp-records-stack">
    <div class="scgp-content-toolbar">
      <div class="scgp-content-toolbar__main">
        <h2 class="scgp-content-toolbar__title">系统设置</h2>
        <p class="scgp-content-toolbar__description">
          维护平台基础信息、备份策略与报告输出默认项。
        </p>
      </div>
      <div class="scgp-content-toolbar__actions">
        <el-button type="primary" :icon="Check" :loading="saving" @click="handleSave">
          保存设置
        </el-button>
      </div>
    </div>

    <section class="system-settings-panel scgp-page-panel">
      <section class="system-settings-section">
        <div class="scgp-section-heading">
          <h3>基本设置</h3>
        </div>
        <div class="system-settings-section__body">
          <el-form :model="settings" label-width="150px" class="settings-form">
            <el-form-item label="系统 Logo">
              <div class="logo-upload">
                <div v-if="logoPreviewUrl" class="logo-preview">
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
                  <el-button plain>选择 Logo 图片</el-button>
                </el-upload>
                <span class="system-settings-help">推荐尺寸：240x48 像素，支持 PNG、JPG 格式。</span>
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
      </section>

      <section class="system-settings-section">
        <div class="scgp-section-heading">
          <h3>备份设置</h3>
        </div>
        <div class="system-settings-section__body">
          <el-form :model="settings" label-width="150px" class="settings-form">
            <el-form-item label="自动备份">
              <div class="system-settings-inline">
                <el-switch v-model="settings.autoBackup" active-text="开启" inactive-text="关闭" />
                <span class="system-settings-help">开启后将按设定间隔自动备份数据。</span>
              </div>
            </el-form-item>
            <el-form-item label="备份间隔（天）">
              <div class="system-settings-inline">
                <el-input-number
                  v-model="settings.backupInterval"
                  :min="1"
                  :max="30"
                  :disabled="!settings.autoBackup"
                />
                <span class="system-settings-help">系统每隔指定天数自动执行备份。</span>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </section>

      <section class="system-settings-section">
        <div class="scgp-section-heading">
          <h3>报告设置</h3>
        </div>
        <div class="system-settings-section__body">
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
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { initDatabase } from '@/database/init'
import { useSystemConfigStore } from '@/stores/systemConfig'

const systemConfigStore = useSystemConfigStore()

const saving = ref(false)

const logoPreviewUrl = ref('')
const logoFile = ref<File | null>(null)

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

const loadSettings = async () => {
  try {
    const db = await initDatabase()

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

const handleSave = async () => {
  saving.value = true
  try {
    if (logoFile.value) {
      await saveLogo()
    }

    const db = await initDatabase()

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
      const existing = db.get('SELECT id FROM system_config WHERE key = ?', [key])

      if (existing) {
        db.run('UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [
          value,
          key,
        ])
      } else {
        db.run(
          'INSERT INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, value],
        )
      }
    }

    if (db.saveToStorage) {
      await db.saveToStorage()
      console.log('✅ 数据库已显式保存')
    }

    await systemConfigStore.loadConfig()

    ElMessage.success('系统设置保存成功')
    logoFile.value = null
  } catch (error) {
    console.error('保存系统设置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

const handleLogoChange = (file: any) => {
  const selectedFile = file.raw
  if (!selectedFile.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  if (selectedFile.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过2MB')
    return
  }

  logoFile.value = selectedFile
  const reader = new FileReader()
  reader.onload = (e) => {
    logoPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(selectedFile)
}

const saveLogo = async () => {
  if (!logoFile.value) return

  try {
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

const removeLogo = () => {
  logoPreviewUrl.value = ''
  logoFile.value = null
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.system-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 22px;
}

.system-settings-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.system-settings-section__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-form {
  max-width: 680px;
}

.system-settings-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.system-settings-help {
  color: var(--scgp-muted);
  font-size: 12px;
  line-height: 1.6;
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

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
</style>
