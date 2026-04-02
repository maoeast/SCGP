<template>
  <div class="page-container scgp-admin-page system-page">
    <div class="page-header system-page__header">
      <div class="header-left">
        <h1>系统管理</h1>
        <p class="subtitle">集中管理用户权限、数据备份、系统配置与本机运行状态。</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="system-tabs scgp-underlined-tabs">
      <el-tab-pane label="用户管理" name="users">
        <div class="system-tab-panel scgp-tab-panel">
          <UserManagement />
        </div>
      </el-tab-pane>

      <el-tab-pane label="数据备份" name="backup">
        <div class="system-tab-panel scgp-tab-panel">
          <div class="scgp-content-toolbar">
            <div class="scgp-content-toolbar__main">
              <h2 class="scgp-content-toolbar__title">数据备份与恢复</h2>
              <p class="scgp-content-toolbar__description">
                导出当前系统数据，或从备份文件恢复学生、评估与训练记录。
              </p>
            </div>
          </div>

          <div class="system-card-grid">
            <section class="system-card scgp-surface">
              <div class="scgp-section-heading">
                <h3>数据备份</h3>
                <p>将当前系统数据导出为备份文件，便于迁移、归档或恢复。</p>
              </div>

              <div class="system-card__body">
                <el-button type="primary" :loading="isBackingUp" @click="handleBackup">
                  {{ isBackingUp ? '备份中...' : '立即备份' }}
                </el-button>
                <p class="system-help-text">备份文件包含学生信息、评估记录、训练记录与系统配置。</p>
              </div>
            </section>

            <section class="system-card scgp-surface">
              <div class="scgp-section-heading">
                <h3>数据恢复</h3>
                <p>选择备份文件并检查内容概览，再执行完整恢复。</p>
              </div>

              <div class="system-card__body">
                <div class="system-upload-row">
                  <input
                    ref="fileInput"
                    type="file"
                    accept=".dat"
                    @change="handleFileSelect"
                    style="display: none"
                  />
                  <el-button plain @click="triggerFileSelect">选择备份文件</el-button>
                  <span v-if="selectedFile" class="system-file-name">{{ selectedFile.name }}</span>
                </div>

                <div v-if="backupInfo" class="system-backup-info">
                  <h4>备份文件信息</h4>
                  <ul>
                    <li>记录数：{{ backupInfo.totalRecords }}</li>
                    <li>表数量：{{ backupInfo.tableCount }}</li>
                    <li>系统：{{ backupInfo.systemName }}</li>
                  </ul>
                </div>

                <div class="scgp-warning-block">
                  恢复数据将覆盖当前所有数据，请确认备份文件来源和版本无误后再执行。
                </div>

                <el-button
                  v-if="selectedFile"
                  type="danger"
                  :loading="isRestoring"
                  @click="handleRestore"
                >
                  {{ isRestoring ? '恢复中...' : '恢复数据' }}
                </el-button>
              </div>
            </section>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="系统设置" name="settings">
        <div class="system-tab-panel scgp-tab-panel">
          <SystemSettings />
        </div>
      </el-tab-pane>

      <el-tab-pane v-if="isDevMode" label="开发者调试" name="devtools">
        <div class="system-tab-panel scgp-tab-panel">
          <div class="scgp-content-toolbar">
            <div class="scgp-content-toolbar__main">
              <h2 class="scgp-content-toolbar__title">开发者调试</h2>
              <p class="scgp-content-toolbar__description">
                提供本机维护与更新入口，高风险操作应仅在确认环境后执行。
              </p>
            </div>
          </div>

          <div class="system-card-grid">
            <section class="system-card scgp-surface system-card--danger">
              <div class="scgp-section-heading">
                <h3>清空所有数据</h3>
                <p>删除所有业务数据并在刷新后重新初始化系统，仅保留默认基础状态。</p>
              </div>
              <div class="system-card__body">
                <div class="scgp-warning-block">
                  此操作不可恢复，将清空学生、评估、训练记录、计划及大部分本地配置。
                </div>
                <el-button type="danger" :loading="isClearing" @click="handleClearAllData">
                  {{ isClearing ? '清空中...' : '清空所有数据' }}
                </el-button>
              </div>
            </section>

            <section class="system-card scgp-surface">
              <div class="scgp-section-heading">
                <h3>软件更新</h3>
                <p>检查当前版本状态并在可用时安装应用更新。</p>
              </div>
              <div class="system-card__body">
                <UpdatePanel />
              </div>
            </section>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="关于" name="about">
        <div class="system-tab-panel scgp-tab-panel">
          <div class="scgp-content-toolbar">
            <div class="scgp-content-toolbar__main">
              <h2 class="scgp-content-toolbar__title">关于系统</h2>
              <p class="scgp-content-toolbar__description">查看当前安装信息、激活状态与设备机器码。</p>
            </div>
          </div>

          <section class="system-card scgp-surface system-about-card">
            <div class="system-about-card__header">
              <h3>{{ systemName }}</h3>
              <el-button plain @click="copyMachineCode">复制机器码</el-button>
            </div>

            <dl class="system-about-list">
              <div class="system-about-list__row">
                <dt>版本</dt>
                <dd>{{ systemVersion }}</dd>
              </div>
              <div class="system-about-list__row">
                <dt>激活状态</dt>
                <dd>{{ activationStatus }}</dd>
              </div>
              <div class="system-about-list__row">
                <dt>机器码</dt>
                <dd class="system-about-list__value">{{ machineCode }}</dd>
              </div>
            </dl>

            <p class="system-about-card__copyright">{{ copyright }}</p>
          </section>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { backupManager } from '@/utils/backup'
import UserManagement from './system/UserManagement.vue'
import SystemSettings from './system/SystemSettings.vue'
import UpdatePanel from './updates/UpdatePanel.vue'

const authStore = useAuthStore()

const activeTab = ref('users')

const isBackingUp = ref(false)
const isRestoring = ref(false)
const selectedFile = ref<File | null>(null)
const backupInfo = ref<any>(null)
const fileInput = ref<HTMLInputElement>()

const systemName = ref('')
const systemVersion = ref('')
const copyright = ref('')

const isClearing = ref(false)
const isDevMode = computed(() => {
  return (
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.port === '5173'
  )
})

const loadPackageInfo = async () => {
  try {
    systemName.value = '感官综合训练与评估'
    systemVersion.value = '1.0.0'
    copyright.value = '©2013-2026 杭州炫灿科技有限公司'
  } catch (error) {
    console.error('加载 package.json 失败:', error)
    systemName.value = '感官综合训练与评估'
    systemVersion.value = '1.0.0'
    copyright.value = '©2013-2026 杭州炫灿科技有限公司'
  }
}

const activationStatus = computed(() => {
  if (authStore.activationInfo.isActivated) {
    return authStore.activationInfo.isInTrial ? '试用期内' : '已激活'
  }
  return '未激活'
})

const machineCode = computed(() => authStore.activationInfo.machineCode)

const handleBackup = async () => {
  try {
    isBackingUp.value = true
    await backupManager.downloadBackup()
    ElMessage.success('备份成功')
  } catch (error) {
    console.error('备份失败:', error)
    ElMessage.error('备份失败，请重试')
  } finally {
    isBackingUp.value = false
  }
}

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) {
    return
  }

  selectedFile.value = file

  try {
    const content = await backupManager.loadBackupFromFile(file)
    backupInfo.value = backupManager.getBackupInfo(content)
  } catch (error) {
    console.error('读取备份文件失败:', error)
    backupInfo.value = null
    ElMessage.error('备份文件格式错误')
  }
}

const handleRestore = async () => {
  if (!selectedFile.value) return

  if (!confirm('恢复数据将覆盖当前所有数据，确定继续吗？')) return

  try {
    isRestoring.value = true
    const content = await backupManager.loadBackupFromFile(selectedFile.value)
    await backupManager.importData(content, { overwrite: true })
    ElMessage.success('数据恢复成功')
    selectedFile.value = null
    backupInfo.value = null
  } catch (error) {
    console.error('恢复失败:', error)
    ElMessage.error('恢复失败：' + (error as Error).message)
  } finally {
    isRestoring.value = false
  }
}

const copyMachineCode = async () => {
  try {
    await navigator.clipboard.writeText(machineCode.value)
    ElMessage.success('机器码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请重试')
  }
}

const handleClearAllData = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将清空所有数据，包括：\n\n' +
        '• 所有学生信息\n' +
        '• 所有评估记录（S-M、WeeFIM）\n' +
        '• 所有训练计划和记录\n' +
        '• 所有用户数据（保留默认管理员）\n' +
        '• 所有资源文件引用\n\n' +
        '系统将重新初始化，此操作不可撤销！',
      '⚠️ 危险操作警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error',
        dangerouslyUseHTMLString: false,
        distinguishCancelAndClose: true,
      },
    )

    try {
      const promptResult = await ElMessageBox.prompt('请输入 "DELETE" 来确认此操作：', '二次确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'text',
      })
      const value = typeof (promptResult as { value?: unknown }).value === 'string'
        ? (promptResult as { value: string }).value
        : ''

      if (value !== 'DELETE') {
        await ElMessageBox.alert('输入错误，操作已取消', '验证失败', { type: 'warning' })
        return
      }
    } catch {
      return
    }

    sessionStorage.setItem('__CLEAR_ALL_DATA__', 'true')

    console.log('✅ 用户确认清空，准备重新加载页面...')

    window.location.reload()
  } catch (error) {
    if ((error as any) !== 'cancel' && (error as any)?.message !== 'cancel') {
      console.error('清空数据失败:', error)
    }
  }
}

onMounted(() => {
  loadPackageInfo()
})
</script>

<style scoped>
.system-tabs {
  flex: 1;
  min-height: 0;
  padding: 0 4px 18px;
}

:deep(.el-tabs__content) {
  padding-top: 18px;
}

.system-page {
  gap: 14px;
  padding-top: 18px;
}

.system-page__header {
  margin-bottom: 0;
}

.system-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.system-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.system-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
}

.system-card--danger {
  border-color: #f2c3c3;
}

.system-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.system-help-text {
  margin: 0;
  color: var(--scgp-muted);
  font-size: 12px;
  line-height: 1.6;
}

.system-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.system-file-name {
  color: var(--scgp-muted);
  font-size: 13px;
  word-break: break-all;
}

.system-backup-info {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #f7f9fc;
  border: 1px solid rgba(217, 226, 238, 0.9);
}

.system-backup-info h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--scgp-text);
}

.system-backup-info ul {
  margin: 0;
  padding-left: 18px;
  list-style-type: disc;
}

.system-backup-info li {
  margin-bottom: 4px;
  color: var(--scgp-muted);
  font-size: 12px;
}

.system-about-card {
  padding: 20px 22px;
}

.system-about-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(217, 226, 238, 0.9);
}

.system-about-card__header h3 {
  margin: 0;
  color: var(--scgp-text);
  font-size: 18px;
}

.system-about-list {
  margin: 0;
}

.system-about-list__row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(244, 246, 250, 0.95);
}

.system-about-list__row:last-child {
  border-bottom: none;
}

.system-about-list dt {
  color: var(--scgp-muted);
  font-size: 13px;
}

.system-about-list dd {
  margin: 0;
  color: var(--scgp-text);
  font-size: 14px;
}

.system-about-list__value {
  word-break: break-all;
}

.system-about-card__copyright {
  margin: 18px 0 0;
  padding-top: 16px;
  border-top: 1px solid rgba(217, 226, 238, 0.9);
  font-size: 13px;
  color: var(--scgp-muted);
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

@media (max-width: 768px) {
  .system-page {
    gap: 12px;
    padding: 14px 16px 16px;
  }

  .system-card-grid {
    grid-template-columns: 1fr;
  }

  .system-about-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .system-about-list__row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
