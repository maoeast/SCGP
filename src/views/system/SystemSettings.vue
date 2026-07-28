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
            <el-form-item label="背景媒体">
              <div class="background-media-editor">
                <div class="background-media-editor__heading">
                  <strong>{{ currentThemeLabel }}背景</strong>
                  <span class="system-settings-help">登录页优先播放 MP4，视频加载或播放失败时使用图片兜底。</span>
                </div>
                <div class="background-media-grid">
                  <div class="background-media-card">
                    <span class="background-media-card__label">背景视频（MP4）</span>
                    <video
                      v-if="currentBackgroundPreview.video"
                      :src="currentBackgroundPreview.video"
                      class="background-media-preview background-media-preview--video"
                      controls
                      muted
                      loop
                      preload="metadata"
                    ></video>
                    <el-upload
                      v-else
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="video/mp4,.mp4"
                      :on-change="handleBackgroundVideoChange"
                    >
                      <el-button plain>选择 MP4 视频</el-button>
                    </el-upload>
                    <el-button
                      v-if="currentBackgroundPreview.video"
                      type="danger"
                      link
                      @click="removeCurrentBackground('video')"
                    >
                      删除视频
                    </el-button>
                    <span class="system-settings-help">建议 1920x1080，单个文件不超过 100MB。</span>
                  </div>
                  <div class="background-media-card">
                    <span class="background-media-card__label">图片兜底</span>
                    <img
                      v-if="currentBackgroundPreview.image"
                      :src="currentBackgroundPreview.image"
                      class="background-media-preview"
                      alt="登录背景图片预览"
                    />
                    <el-upload
                      v-else
                      :auto-upload="false"
                      :show-file-list="false"
                      accept="image/*"
                      :on-change="handleBackgroundImageChange"
                    >
                      <el-button plain>选择背景图片</el-button>
                    </el-upload>
                    <el-button
                      v-if="currentBackgroundPreview.image"
                      type="danger"
                      link
                      @click="removeCurrentBackground('image')"
                    >
                      删除图片
                    </el-button>
                    <span class="system-settings-help">支持 PNG、JPG、WEBP，单个文件不超过 4MB。</span>
                  </div>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="主色">
              <div class="system-settings-inline">
                <el-color-picker
                  v-model="settings.themePrimaryColor"
                  :disabled="!canEditPrimaryColor"
                />
                <el-input
                  v-model="settings.themePrimaryColor"
                  class="system-settings-color-input"
                  :disabled="!canEditPrimaryColor"
                />
                <span class="system-settings-help">
                  {{ isLoginThemeDebugMode && currentThemeVariant !== 'custom'
                    ? '开发调试模式：可临时调整预设主色，实时观察按钮、输入框聚焦态与交互阴影。'
                    : currentThemeVariant === 'custom'
                    ? '自定义主色会同步更新按钮、输入框聚焦态与交互阴影。'
                    : '预置主题使用固定主色，切换主题时会同步更新全部交互颜色。' }}
                </span>
              </div>
            </el-form-item>
            <el-form-item label="卡片透明度">
              <div class="system-settings-inline">
                <el-slider
                  v-model="settings.loginCardBgOpacity"
                  :min="30"
                  :max="100"
                  :step="1"
                  :show-tooltip="true"
                  :format-tooltip="(val: number) => val + '%'"
                  style="width: 240px"
                />
                <span class="system-settings-help">调整登录卡片的背景透明度，值越小越透明。</span>
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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { initDatabase } from '@/database/init'
import { useSystemConfigStore } from '@/stores/systemConfig'
import {
  DEFAULT_LOGIN_PRIMARY_COLOR,
  LOGIN_THEME_PRESETS,
  applyLoginThemeVariables,
  getEffectiveLoginPrimaryColor,
  normalizeHexColor,
  normalizeLoginThemeVariant,
  type LoginThemeVariant,
} from '@/utils/login-theme'
import {
  cloneLoginBackgrounds,
  createBundledLoginBackgrounds,
  createDefaultLoginBackgrounds,
  deleteLoginBackgroundFile,
  getLoginBackgroundUrl,
  hasLoginBackgroundMedia,
  LOGIN_BACKGROUND_PRESET_VERSION,
  LOGIN_BACKGROUND_VARIANTS,
  parseLoginBackgrounds,
  saveLoginBackgroundFile,
  serializeLoginBackgrounds,
  type LoginBackgroundKind,
  type LoginBackgrounds,
} from '@/utils/login-background'

const systemConfigStore = useSystemConfigStore()

const saving = ref(false)
const isHydratingSettings = ref(false)
const isLoginThemeDebugMode = import.meta.env.DEV

const systemLogoPreviewUrl = ref('')
const systemLogoFile = ref<File | null>(null)
const loginLogoPreviewUrl = ref('')
const loginLogoFile = ref<File | null>(null)

type BackgroundFileMap = Record<LoginThemeVariant, Record<LoginBackgroundKind, File | null>>
type BackgroundPreviewMap = Record<LoginThemeVariant, Record<LoginBackgroundKind, string>>

const createBackgroundFileMap = (): BackgroundFileMap => ({
  'warm-glow': { image: null, video: null },
  'calm-blue': { image: null, video: null },
  'lush-green': { image: null, video: null },
  custom: { image: null, video: null },
})

const createBackgroundPreviewMap = (backgrounds: LoginBackgrounds): BackgroundPreviewMap => ({
  'warm-glow': {
    image: getLoginBackgroundUrl(backgrounds['warm-glow'].image),
    video: getLoginBackgroundUrl(backgrounds['warm-glow'].video),
  },
  'calm-blue': {
    image: getLoginBackgroundUrl(backgrounds['calm-blue'].image),
    video: getLoginBackgroundUrl(backgrounds['calm-blue'].video),
  },
  'lush-green': {
    image: getLoginBackgroundUrl(backgrounds['lush-green'].image),
    video: getLoginBackgroundUrl(backgrounds['lush-green'].video),
  },
  custom: {
    image: getLoginBackgroundUrl(backgrounds.custom.image),
    video: getLoginBackgroundUrl(backgrounds.custom.video),
  },
})

const backgroundFiles = reactive<BackgroundFileMap>(createBackgroundFileMap())
const backgroundPreviews = reactive<BackgroundPreviewMap>(
  createBackgroundPreviewMap(createDefaultLoginBackgrounds()),
)

const settings = reactive({
  systemName: '星愿能力发展训练系统',
  systemVersion: '1.0.1',
  schoolName: '',
  loginThemeVariant: 'warm-glow',
  themePrimaryColor: DEFAULT_LOGIN_PRIMARY_COLOR,
  brandPanelDescription: '从能力基线到情绪感知，用智能化的数据记录，守护孩子点滴进步。',
  loginBackgrounds: createDefaultLoginBackgrounds(),
  loginCardBgOpacity: 92,
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

const currentThemeVariant = computed(() => normalizeLoginThemeVariant(settings.loginThemeVariant))
const currentThemeLabel = computed(() => LOGIN_THEME_PRESETS[currentThemeVariant.value].label)
const currentBackgroundPreview = computed(() => backgroundPreviews[currentThemeVariant.value])
const canEditPrimaryColor = computed(
  () => isLoginThemeDebugMode || currentThemeVariant.value === 'custom',
)
const customThemePrimaryColor = ref(DEFAULT_LOGIN_PRIMARY_COLOR)

const originalThemeSnapshot = ref({
  variant: systemConfigStore.loginThemeVariant,
  primaryColor: systemConfigStore.themePrimaryColor,
  customBgImage: systemConfigStore.loginCustomBgImage,
  cardBgOpacity: systemConfigStore.loginCardOpacity,
  backgrounds: createDefaultLoginBackgrounds(),
})

const loadSettings = async () => {
  isHydratingSettings.value = true
  try {
    settings.systemVersion = window.electronAPI
      ? await window.electronAPI.getAppVersion()
      : settings.systemVersion

    const db = await initDatabase()

    const configs = db.all(`
      SELECT key, value FROM system_config
    `)

    let serializedBackgrounds = ''
    let backgroundPresetVersion = ''
    let legacyCustomBgImage = ''

    configs.forEach((config: any) => {
      const key = config.key
      const value = config.value

      switch (key) {
        case 'system_name':
          settings.systemName = value
          break
        case 'system_version':
          if (!window.electronAPI) {
            settings.systemVersion = value
          }
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
        case 'login_theme_backgrounds':
          serializedBackgrounds = value || ''
          break
        case 'login_theme_backgrounds_preset_version':
          backgroundPresetVersion = value || ''
          break
        case 'login_custom_bg_image':
          legacyCustomBgImage = value || ''
          break
        case 'login_card_opacity':
          settings.loginCardBgOpacity = Math.round((parseFloat(value) || 0.92) * 100)
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

    let loadedBackgrounds = parseLoginBackgrounds(serializedBackgrounds)
    if (!loadedBackgrounds.custom.image && legacyCustomBgImage) {
      loadedBackgrounds.custom.image = legacyCustomBgImage
    }
    if (!backgroundPresetVersion && !hasLoginBackgroundMedia(loadedBackgrounds)) {
      loadedBackgrounds = createBundledLoginBackgrounds()
    }
    settings.loginBackgrounds = loadedBackgrounds
    settings.themePrimaryColor = getEffectiveLoginPrimaryColor(
      normalizeLoginThemeVariant(settings.loginThemeVariant),
      settings.themePrimaryColor,
      isLoginThemeDebugMode,
    )
    if (currentThemeVariant.value === 'custom') {
      customThemePrimaryColor.value = settings.themePrimaryColor
    }
    syncBackgroundPreviews()

    originalThemeSnapshot.value = {
      variant: normalizeLoginThemeVariant(settings.loginThemeVariant),
      primaryColor: normalizeHexColor(settings.themePrimaryColor, DEFAULT_LOGIN_PRIMARY_COLOR),
      customBgImage: loadedBackgrounds.custom.image,
      cardBgOpacity: settings.loginCardBgOpacity / 100,
      backgrounds: cloneLoginBackgrounds(loadedBackgrounds),
    }
  } catch (error) {
    console.error('加载系统设置失败:', error)
  } finally {
    // Flush variant watchers while hydration is still active so saved debug
    // colors are not replaced by a preset default after the async load.
    await nextTick()
    isHydratingSettings.value = false
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

    const nextBackgrounds = cloneLoginBackgrounds(settings.loginBackgrounds)
    const backgroundRefsToDelete: string[] = []
    const normalizedThemeVariant = normalizeLoginThemeVariant(settings.loginThemeVariant)
    const effectivePrimaryColor = getEffectiveLoginPrimaryColor(
      normalizedThemeVariant,
      settings.themePrimaryColor,
      isLoginThemeDebugMode,
    )
    settings.themePrimaryColor = effectivePrimaryColor

    for (const variant of LOGIN_BACKGROUND_VARIANTS) {
      for (const kind of ['image', 'video'] as LoginBackgroundKind[]) {
        const pendingFile = backgroundFiles[variant][kind]
        const oldRef = originalThemeSnapshot.value.backgrounds[variant][kind]

        if (pendingFile) {
          nextBackgrounds[variant][kind] = await saveLoginBackgroundFile(
            pendingFile,
            variant,
            kind,
          )
          if (oldRef && oldRef !== nextBackgrounds[variant][kind]) {
            backgroundRefsToDelete.push(oldRef)
          }
        } else if (!nextBackgrounds[variant][kind] && oldRef) {
          backgroundRefsToDelete.push(oldRef)
        }
      }
    }

    const db = await initDatabase()

    const configMap: Record<string, string> = {
      system_name: settings.systemName,
      school_name: settings.schoolName,
      logo_path: systemLogoPreviewUrl.value,
      login_logo_path: loginLogoPreviewUrl.value,
      auto_backup: settings.autoBackup.toString(),
      backup_interval: settings.backupInterval.toString(),
      login_theme_variant: normalizedThemeVariant,
      theme_primary_color: effectivePrimaryColor,
      brand_panel_description: settings.brandPanelDescription,
      login_theme_backgrounds: serializeLoginBackgrounds(nextBackgrounds),
      login_theme_backgrounds_preset_version: LOGIN_BACKGROUND_PRESET_VERSION,
      login_custom_bg_image: nextBackgrounds.custom.image,
      login_card_opacity: (settings.loginCardBgOpacity / 100).toFixed(2),
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

    for (const oldRef of backgroundRefsToDelete) {
      const deleted = await deleteLoginBackgroundFile(oldRef)
      if (!deleted) {
        console.warn('[SystemSettings] 旧登录背景文件清理失败:', oldRef)
      }
    }

    await systemConfigStore.loadConfig()
    settings.loginBackgrounds = cloneLoginBackgrounds(nextBackgrounds)
    originalThemeSnapshot.value = {
      variant: systemConfigStore.loginThemeVariant,
      primaryColor: systemConfigStore.themePrimaryColor,
      customBgImage: systemConfigStore.loginCustomBgImage,
      cardBgOpacity: systemConfigStore.loginCardOpacity,
      backgrounds: cloneLoginBackgrounds(nextBackgrounds),
    }

    ElMessage.success('系统设置保存成功')
    systemLogoFile.value = null
    loginLogoFile.value = null
    clearPendingBackgroundFiles()
    syncBackgroundPreviews()
  } catch (error) {
    console.error('保存系统设置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

const ensureImageFile = (selectedFile: File) => {
  if (!selectedFile) {
    return false
  }
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

const ensureBackgroundFile = (selectedFile: File, kind: LoginBackgroundKind) => {
  if (!selectedFile) {
    return false
  }

  if (kind === 'video') {
    const isMp4 = selectedFile.type === 'video/mp4' || /\.mp4$/i.test(selectedFile.name)
    if (!isMp4) {
      ElMessage.error('背景视频仅支持 MP4 文件')
      return false
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      ElMessage.error('背景视频不能超过 100MB')
      return false
    }
    return true
  }

  if (!selectedFile.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return false
  }
  if (selectedFile.size > 4 * 1024 * 1024) {
    ElMessage.error('背景图片不能超过 4MB')
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

const revokePreviewUrl = (value: string) => {
  if (value.startsWith('blob:')) {
    URL.revokeObjectURL(value)
  }
}

const syncBackgroundPreviews = () => {
  for (const variant of LOGIN_BACKGROUND_VARIANTS) {
    for (const kind of ['image', 'video'] as LoginBackgroundKind[]) {
      revokePreviewUrl(backgroundPreviews[variant][kind])
      backgroundPreviews[variant][kind] = getLoginBackgroundUrl(
        settings.loginBackgrounds[variant][kind],
      )
    }
  }
}

const clearPendingBackgroundFiles = () => {
  for (const variant of LOGIN_BACKGROUND_VARIANTS) {
    backgroundFiles[variant].image = null
    backgroundFiles[variant].video = null
  }
}

const handleBackgroundFileChange = (file: any, kind: LoginBackgroundKind) => {
  const selectedFile = file?.raw as File | undefined
  if (!selectedFile || !ensureBackgroundFile(selectedFile, kind)) {
    return
  }

  const variant = currentThemeVariant.value
  revokePreviewUrl(backgroundPreviews[variant][kind])
  backgroundFiles[variant][kind] = selectedFile
  backgroundPreviews[variant][kind] = URL.createObjectURL(selectedFile)
  settings.loginBackgrounds[variant][kind] = backgroundPreviews[variant][kind]
}

const handleBackgroundImageChange = (file: any) => {
  handleBackgroundFileChange(file, 'image')
}

const handleBackgroundVideoChange = (file: any) => {
  handleBackgroundFileChange(file, 'video')
}

const removeCurrentBackground = (kind: LoginBackgroundKind) => {
  const variant = currentThemeVariant.value
  revokePreviewUrl(backgroundPreviews[variant][kind])
  backgroundPreviews[variant][kind] = ''
  backgroundFiles[variant][kind] = null
  settings.loginBackgrounds[variant][kind] = ''
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
  () => settings.loginThemeVariant,
  (variant) => {
    if (isHydratingSettings.value) {
      return
    }

    const normalizedVariant = normalizeLoginThemeVariant(variant)
    settings.themePrimaryColor = normalizedVariant === 'custom'
      ? customThemePrimaryColor.value
      : LOGIN_THEME_PRESETS[normalizedVariant].primary
  },
)

watch(
  () => settings.themePrimaryColor,
  (primaryColor) => {
    if (currentThemeVariant.value === 'custom') {
      customThemePrimaryColor.value = normalizeHexColor(
        primaryColor,
        DEFAULT_LOGIN_PRIMARY_COLOR,
      )
    }
  },
)

watch(
  () => [
    settings.loginThemeVariant,
    settings.themePrimaryColor,
    settings.loginCardBgOpacity,
    serializeLoginBackgrounds(settings.loginBackgrounds),
  ],
  ([variant, primaryColor, cardOpacity]) => {
    const normalizedVariant = normalizeLoginThemeVariant(variant as string)
    applyLoginThemeVariables({
      variant: normalizedVariant,
      primaryColor: normalizeHexColor(primaryColor as string, DEFAULT_LOGIN_PRIMARY_COLOR),
      customBgImage: settings.loginBackgrounds[normalizedVariant].image,
      cardBgOpacity: (cardOpacity as number) / 100,
      allowPresetPrimaryColorOverride: isLoginThemeDebugMode,
    })
  },
  { immediate: true },
)

onUnmounted(() => {
  for (const variant of LOGIN_BACKGROUND_VARIANTS) {
    for (const kind of ['image', 'video'] as LoginBackgroundKind[]) {
      revokePreviewUrl(backgroundPreviews[variant][kind])
    }
  }

  const snapshot = originalThemeSnapshot.value
  applyLoginThemeVariables({
    variant: snapshot.variant,
    primaryColor: snapshot.primaryColor,
    customBgImage: snapshot.customBgImage,
    cardBgOpacity: snapshot.cardBgOpacity,
    allowPresetPrimaryColorOverride: isLoginThemeDebugMode,
  })
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

.background-media-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(100%, 660px);
}

.background-media-editor__heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.background-media-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.background-media-card {
  min-height: 196px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--scgp-border, #dfe6ee);
  border-radius: 8px;
  background: var(--scgp-surface-soft, #f8fafc);
  box-sizing: border-box;
}

.background-media-card__label {
  color: var(--scgp-text, #243447);
  font-size: 13px;
  font-weight: 600;
}

.background-media-preview {
  width: 100%;
  height: 116px;
  border-radius: 6px;
  background: #e9eef5;
  object-fit: cover;
}

.background-media-preview--video {
  object-position: center;
}

@media (max-width: 720px) {
  .background-media-grid {
    grid-template-columns: 1fr;
  }
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
