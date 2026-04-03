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
                <div v-if="systemLogoPreviewUrl" class="logo-preview">
                  <img :src="systemLogoPreviewUrl" alt="Logo预览" />
                  <el-button type="danger" size="small" @click="removeSystemLogo" class="remove-btn">
                    删除
                  </el-button>
                </div>
                <el-upload
                  v-else
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/*"
                  :on-change="handleSystemLogoChange"
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
          <h3>登录页品牌与主题</h3>
          <p>配置登录页主色、品牌区文案与学校入口展示信息。</p>
        </div>
        <div class="system-settings-section__body">
          <el-form :model="settings" label-width="150px" class="settings-form">
            <el-form-item label="登录页 Logo">
              <div class="logo-upload">
                <div v-if="loginLogoPreviewUrl" class="logo-preview logo-preview--square">
                  <img :src="loginLogoPreviewUrl" alt="登录页Logo预览" />
                  <el-button type="danger" size="small" @click="removeLoginLogo" class="remove-btn">
                    删除
                  </el-button>
                </div>
                <el-upload
                  v-else
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/*"
                  :on-change="handleLoginLogoChange"
                >
                  <el-button plain>选择登录页 Logo</el-button>
                </el-upload>
                <span class="system-settings-help">推荐尺寸：160x160 像素，支持 PNG、JPG 格式。</span>
              </div>
            </el-form-item>
            <el-form-item label="主题预设">
              <el-select v-model="settings.loginThemeVariant" class="system-settings-field">
                <el-option
                  v-for="option in loginThemeOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="主色">
              <div class="system-settings-inline">
                <el-color-picker v-model="settings.themePrimaryColor" />
                <el-input v-model="settings.themePrimaryColor" class="system-settings-color-input" />
                <span class="system-settings-help">建议使用蓝色系，按钮与聚焦态会同步更新。</span>
              </div>
            </el-form-item>
            <el-form-item label="品牌说明">
              <el-input
                v-model="settings.brandPanelDescription"
                type="textarea"
                :rows="4"
                placeholder="请输入登录页品牌区说明文案"
              />
            </el-form-item>
          </el-form>

          <section class="login-theme-preview">
            <div class="login-theme-preview__brand">
              <span class="login-theme-preview__badge">{{ currentThemeLabel }}</span>
              <div v-if="loginLogoPreviewUrl" class="login-theme-preview__logo">
                <img :src="loginLogoPreviewUrl" alt="登录页品牌Logo预览" />
              </div>
              <h4>{{ settings.systemName }}</h4>
              <p class="login-theme-preview__subtitle">{{ settings.schoolName || 'XX学校' }}</p>
              <p class="login-theme-preview__description">{{ settings.brandPanelDescription }}</p>
            </div>

            <div class="login-theme-preview__card">
              <span class="login-theme-preview__eyebrow">登录按钮预览</span>
              <button type="button" class="login-theme-preview__button">登录系统</button>
            </div>
          </section>
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { initDatabase } from '@/database/init'
import { useSystemConfigStore } from '@/stores/systemConfig'
import {
  DEFAULT_LOGIN_PRIMARY_COLOR,
  LOGIN_THEME_PRESETS,
  applyLoginThemeVariables,
  normalizeHexColor,
  normalizeLoginThemeVariant,
} from '@/utils/login-theme'

const systemConfigStore = useSystemConfigStore()

const saving = ref(false)

const systemLogoPreviewUrl = ref('')
const systemLogoFile = ref<File | null>(null)
const loginLogoPreviewUrl = ref('')
const loginLogoFile = ref<File | null>(null)

const settings = reactive({
  systemName: '星愿能力发展训练系统',
  systemVersion: '1.0.0',
  schoolName: '',
  loginThemeVariant: 'classic-blue',
  themePrimaryColor: DEFAULT_LOGIN_PRIMARY_COLOR,
  brandPanelDescription: '统一进入学生管理、能力评估、训练计划、训练记录与报告生成，让一线工作更聚焦。',
  autoBackup: true,
  backupInterval: 7,
  defaultReportFormat: 'pdf',
  includeStudentAvatar: true,
  reportHeader: '',
})

const loginThemeOptions = Object.entries(LOGIN_THEME_PRESETS).map(([value, preset]) => ({
  value,
  label: preset.label,
}))

const originalThemeSnapshot = ref({
  variant: systemConfigStore.loginThemeVariant,
  primaryColor: systemConfigStore.themePrimaryColor,
})

const currentThemeLabel = computed(() => {
  return LOGIN_THEME_PRESETS[normalizeLoginThemeVariant(settings.loginThemeVariant)]?.label || '湖蓝'
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
          systemLogoPreviewUrl.value = value
          break
        case 'login_logo_path':
          loginLogoPreviewUrl.value = value
          break
        case 'login_theme_variant':
          settings.loginThemeVariant = normalizeLoginThemeVariant(value)
          break
        case 'theme_primary_color':
          settings.themePrimaryColor = normalizeHexColor(value, DEFAULT_LOGIN_PRIMARY_COLOR)
          break
        case 'brand_panel_description':
          settings.brandPanelDescription = value
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

    originalThemeSnapshot.value = {
      variant: normalizeLoginThemeVariant(settings.loginThemeVariant),
      primaryColor: normalizeHexColor(settings.themePrimaryColor, DEFAULT_LOGIN_PRIMARY_COLOR),
    }
  } catch (error) {
    console.error('加载系统设置失败:', error)
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    if (systemLogoFile.value) {
      systemLogoPreviewUrl.value = await readFileAsDataUrl(systemLogoFile.value)
    }

    if (loginLogoFile.value) {
      loginLogoPreviewUrl.value = await readFileAsDataUrl(loginLogoFile.value)
    }

    const db = await initDatabase()

    const configMap: Record<string, string> = {
      system_name: settings.systemName,
      school_name: settings.schoolName,
      logo_path: systemLogoPreviewUrl.value,
      login_logo_path: loginLogoPreviewUrl.value,
      auto_backup: settings.autoBackup.toString(),
      backup_interval: settings.backupInterval.toString(),
      login_theme_variant: normalizeLoginThemeVariant(settings.loginThemeVariant),
      theme_primary_color: normalizeHexColor(settings.themePrimaryColor, DEFAULT_LOGIN_PRIMARY_COLOR),
      brand_panel_description: settings.brandPanelDescription,
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
    originalThemeSnapshot.value = {
      variant: systemConfigStore.loginThemeVariant,
      primaryColor: systemConfigStore.themePrimaryColor,
    }

    ElMessage.success('系统设置保存成功')
    systemLogoFile.value = null
    loginLogoFile.value = null
  } catch (error) {
    console.error('保存系统设置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

const ensureImageFile = (selectedFile: File) => {
  if (!selectedFile.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return false
  }
  if (selectedFile.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过2MB')
    return false
  }
  return true
}

const readFileAsDataUrl = (file: File) => {
  const reader = new FileReader()
  return new Promise<string>((resolve, reject) => {
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const handleSystemLogoChange = (file: any) => {
  const selectedFile = file.raw
  if (!ensureImageFile(selectedFile)) {
    return
  }

  systemLogoFile.value = selectedFile
  const reader = new FileReader()
  reader.onload = (e) => {
    systemLogoPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(selectedFile)
}

const handleLoginLogoChange = (file: any) => {
  const selectedFile = file.raw
  if (!ensureImageFile(selectedFile)) {
    return
  }

  loginLogoFile.value = selectedFile
  const reader = new FileReader()
  reader.onload = (e) => {
    loginLogoPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(selectedFile)
}

const removeSystemLogo = () => {
  systemLogoPreviewUrl.value = ''
  systemLogoFile.value = null
}

const removeLoginLogo = () => {
  loginLogoPreviewUrl.value = ''
  loginLogoFile.value = null
}

onMounted(() => {
  loadSettings()
})

watch(
  () => [settings.loginThemeVariant, settings.themePrimaryColor],
  ([variant, primaryColor]) => {
    applyLoginThemeVariables({
      variant: normalizeLoginThemeVariant(variant),
      primaryColor: normalizeHexColor(primaryColor, DEFAULT_LOGIN_PRIMARY_COLOR),
    })
  },
)

onUnmounted(() => {
  applyLoginThemeVariables(originalThemeSnapshot.value)
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

.system-settings-field {
  width: 240px;
}

.system-settings-color-input {
  width: 160px;
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

.logo-preview--square img {
  max-width: 128px;
  max-height: 128px;
}

.logo-preview .remove-btn {
  position: absolute;
  top: 5px;
  right: 5px;
}

.login-theme-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 18px;
  margin-top: 6px;
}

.login-theme-preview__brand,
.login-theme-preview__card {
  border: 1px solid var(--login-border, #dbe5f0);
  border-radius: 18px;
  overflow: hidden;
}

.login-theme-preview__brand {
  padding: 24px;
  color: #ffffff;
  background:
    linear-gradient(160deg, var(--login-brand-start, #1f4f9b) 0%, var(--login-brand-end, #17396f) 100%);
}

.login-theme-preview__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  margin-top: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.login-theme-preview__logo img {
  max-width: 56px;
  max-height: 56px;
  object-fit: contain;
}

.login-theme-preview__badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--login-brand-badge-bg, rgba(236, 244, 255, 0.14));
  color: var(--login-brand-badge-text, #dceaff);
  font-size: 12px;
  font-weight: 600;
}

.login-theme-preview__brand h4 {
  margin: 14px 0 8px;
  font-size: 22px;
}

.login-theme-preview__subtitle,
.login-theme-preview__description {
  margin: 0;
  line-height: 1.7;
}

.login-theme-preview__subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.login-theme-preview__description {
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.login-theme-preview__card {
  padding: 24px;
  background: linear-gradient(180deg, var(--login-surface-soft, #f7fafd) 0%, #ffffff 100%);
}

.login-theme-preview__eyebrow {
  color: var(--login-primary, #2f6fd6);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.login-theme-preview__button {
  width: 100%;
  min-height: 48px;
  margin-top: 18px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--login-primary, #2f6fd6) 0%, var(--login-primary-hover, #275fb8) 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

@media (max-width: 960px) {
  .login-theme-preview {
    grid-template-columns: 1fr;
  }
}
</style>
