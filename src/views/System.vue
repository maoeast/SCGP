<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>系统管理</h1>
        <p class="subtitle">用户管理、数据备份与系统配置</p>
      </div>
    </div>

    <!-- 选项卡 -->
    <el-tabs v-model="activeTab" class="system-tabs">
      <!-- 用户管理 -->
      <el-tab-pane label="用户管理" name="users">
        <UserManagement />
      </el-tab-pane>

      <!-- 数据备份与恢复 -->
      <el-tab-pane label="数据备份" name="backup">
        <div class="backup-section">
          <h2>
            <i class="fas fa-database"></i>
            数据备份与恢复
          </h2>
          <div class="backup-cards">
            <!-- 备份卡片 -->
            <div class="backup-card">
              <div class="card-header">
                <h3>数据备份</h3>
                <p>将系统数据导出为加密备份文件</p>
              </div>
              <div class="card-body">
                <button @click="handleBackup" class="btn btn-primary" :disabled="isBackingUp">
                  <i class="fas fa-arrow-down-to-bracket"></i>
                  {{ isBackingUp ? '备份中...' : '立即备份' }}
                </button>
                <p class="help-text">备份文件包含所有学生信息、评估记录和训练数据</p>
              </div>
            </div>

            <!-- 恢复卡片 -->
            <div class="backup-card">
              <div class="card-header">
                <h3>数据恢复</h3>
                <p>从备份文件恢复系统数据</p>
              </div>
              <div class="card-body">
                <div class="upload-area">
                  <input
                    ref="fileInput"
                    type="file"
                    accept=".dat"
                    @change="handleFileSelect"
                    style="display: none"
                  />
                  <button @click="$refs.fileInput.click()" class="btn btn-secondary">
                    <i class="fas fa-arrow-up-from-bracket"></i>
                    选择备份文件
                  </button>
                  <span v-if="selectedFile" class="file-name">{{ selectedFile.name }}</span>
                </div>
                <div v-if="backupInfo" class="backup-info">
                  <h4>备份文件信息</h4>
                  <ul>
                    <li>记录数：{{ backupInfo.totalRecords }}</li>
                    <li>表数量：{{ backupInfo.tableCount }}</li>
                    <li>系统：{{ backupInfo.systemName }}</li>
                  </ul>
                </div>
                <button
                  v-if="selectedFile"
                  @click="handleRestore"
                  class="btn btn-danger"
                  :disabled="isRestoring"
                >
                  <i class="fas fa-clock-rotate-left"></i>
                  {{ isRestoring ? '恢复中...' : '恢复数据' }}
                </button>
                <p class="help-text warning">警告：恢复数据将覆盖当前所有数据，请谨慎操作</p>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 系统设置 -->
      <el-tab-pane label="系统设置" name="settings">
        <SystemSettings />
      </el-tab-pane>

      <!-- 开发者调试（仅开发环境显示） -->
      <el-tab-pane v-if="isDevMode" label="开发者调试" name="devtools">
        <div class="devtools-section">
          <h2>
            <i class="fas fa-wrench"></i>
            开发者工具
          </h2>
          <div class="devtools-cards">
            <!-- 清空数据卡片 -->
            <div class="devtools-card danger">
              <div class="card-header">
                <h3>清空所有数据</h3>
                <p>删除所有数据并重新初始化系统</p>
              </div>
              <div class="card-body">
                <button @click="handleClearAllData" class="btn btn-danger" :disabled="isClearing">
                  <i class="fas fa-trash"></i>
                  {{ isClearing ? '清空中...' : '清空所有数据' }}
                </button>
                <p class="help-text warning">
                  警告：此操作将清空所有学生、评估、训练记录等数据，且无法恢复！
                </p>
              </div>
            </div>

            <!-- 数据统计卡片 -->
            <div class="devtools-card info">
              <div class="card-header">
                <h3>数据统计</h3>
                <p>查看当前数据库中的数据量</p>
              </div>
              <div class="card-body">
                <div v-if="dataStats" class="stats-list">
                  <div class="stat-item">
                    <span class="stat-label">学生数量:</span>
                    <span class="stat-value">{{ dataStats.studentCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">评估记录 (S-M):</span>
                    <span class="stat-value">{{ dataStats.smAssessCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">评估记录 (WeeFIM):</span>
                    <span class="stat-value">{{ dataStats.weefimAssessCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">训练记录:</span>
                    <span class="stat-value">{{ dataStats.trainLogCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">用户数量:</span>
                    <span class="stat-value">{{ dataStats.userCount }}</span>
                  </div>
                </div>
                <button @click="handleLoadStats" class="btn btn-secondary">
                  <i class="fas fa-refresh"></i>
                  刷新统计
                </button>
              </div>
            </div>

            <!-- Phase 2.0 重构工具 -->
            <div class="devtools-card success">
              <div class="card-header">
                <h3>Phase 2.0 架构迁移</h3>
                <p>Schema 迁移与验证工具</p>
              </div>
              <div class="card-body">
                <div class="migration-tools">
                  <button @click="goToSchemaMigration" class="btn btn-primary">
                    <i class="fas fa-database"></i>
                    Schema 迁移
                  </button>
                  <button @click="goToMigrationVerification" class="btn btn-success">
                    <i class="fas fa-check-circle"></i>
                    迁移验证
                  </button>
                </div>
                <p class="help-text info">
                  Phase 2.0 重构工具：执行数据库架构迁移和验证
                </p>
              </div>
            </div>

            <!-- Phase 3.5 模块开发者工具 -->
            <div class="devtools-card primary">
              <div class="card-header">
                <h3>模块开发者工具</h3>
                <p>查看和管理已注册的模块</p>
              </div>
              <div class="card-body">
                <div class="migration-tools">
                  <button @click="goToModuleDevTools" class="btn btn-primary">
                    <i class="fas fa-cubes"></i>
                    模块管理
                  </button>
                  <button @click="goToBenchmarkRunner" class="btn btn-info">
                    <i class="fas fa-gauge-high"></i>
                    性能测试
                  </button>
                </div>
                <p class="help-text info">
                  Phase 3.5 开发者工具：管理模块、测试 IEP 策略、性能基准测试
                </p>
              </div>
            </div>

            <!-- 班级管理测试工具 -->
            <div class="devtools-card success">
              <div class="card-header">
                <h3>班级管理测试工具</h3>
                <p>测试数据生成与验证工具</p>
              </div>
              <div class="card-body">
                <div class="migration-tools">
                  <button @click="goToClassManagementTest" class="btn btn-warning">
                    <i class="fas fa-flask"></i>
                    测试工具
                  </button>
                  <button @click="goToClassSnapshotVerification" class="btn btn-info">
                    <i class="fas fa-shield-alt"></i>
                    快照验证
                  </button>
                  <button @click="goToClassTestLite" class="btn btn-secondary">
                    <i class="fas fa-vial"></i>
                    轻量测试
                  </button>
                </div>
                <p class="help-text success">
                  测试工具：测试数据生成、学年升级模拟、快照验证、轻量测试
                </p>
              </div>
            </div>

            <!-- 软件更新 -->
            <div class="devtools-card primary">
              <div class="card-header">
                <h3>软件更新</h3>
                <p>检查并安装应用更新</p>
              </div>
              <div class="card-body">
                <UpdatePanel />
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 关于系统 -->
      <el-tab-pane label="关于" name="about">
        <div class="about-section">
          <h2>
            <i class="fas fa-circle-info"></i>
            关于系统
          </h2>
          <div class="about-card">
            <div class="about-info">
              <h3>{{ systemName }}</h3>
              <p>版本：{{ systemVersion }}</p>
              <p>激活状态：{{ activationStatus }}</p>
              <p>机器码：{{ machineCode }}</p>
              <button @click="copyMachineCode" class="btn btn-sm btn-outline">
                <i class="fas fa-copy"></i>
                复制机器码
              </button>
              <p class="copyright">{{ copyright }}</p>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { backupManager } from '@/utils/backup'
import { ElMessageBox } from 'element-plus'
import UserManagement from './system/UserManagement.vue'
import SystemSettings from './system/SystemSettings.vue'
import UpdatePanel from './updates/UpdatePanel.vue'

const router = useRouter()

const authStore = useAuthStore()

// 当前选项卡
const activeTab = ref('users')

// 备份相关
const isBackingUp = ref(false)
const isRestoring = ref(false)
const selectedFile = ref<File | null>(null)
const backupInfo = ref<any>(null)
const fileInput = ref<HTMLInputElement>()

// 系统信息（从 package.json 读取）
const systemName = ref('')
const systemVersion = ref('')
const copyright = ref('')

// 开发者工具相关
const isClearing = ref(false)
const dataStats = ref<any>(null)

// 检测是否为开发环境
const isDevMode = computed(() => {
  return (
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.port === '5173'
  )
})

// 从 package.json 加载系统信息
const loadPackageInfo = async () => {
  try {
    // 直接使用静态数据（与 package.json 保持一致）
    // 因为在打包后的 Electron 环境中，无法动态读取 package.json
    systemName.value = '感官综合训练与评估'
    systemVersion.value = '1.0.0'
    copyright.value = '©2013-2026 杭州炫灿科技有限公司'
  } catch (error) {
    console.error('加载 package.json 失败:', error)
    // 使用默认值
    systemName.value = '感官综合训练与评估'
    systemVersion.value = '1.0.0'
    copyright.value = '©2013-2026 杭州炫灿科技有限公司'
  }
}

// 计算属性
const activationStatus = computed(() => {
  if (authStore.activationInfo.isActivated) {
    return authStore.activationInfo.isInTrial ? '试用期内' : '已激活'
  }
  return '未激活'
})

const machineCode = computed(() => authStore.activationInfo.machineCode)

// 备份数据
const handleBackup = async () => {
  try {
    isBackingUp.value = true
    await backupManager.downloadBackup()
    alert('备份成功！')
  } catch (error) {
    console.error('备份失败:', error)
    alert('备份失败，请重试')
  } finally {
    isBackingUp.value = false
  }
}

// 选择文件
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    selectedFile.value = file

    // 读取备份信息
    try {
      const content = await backupManager.loadBackupFromFile(file)
      backupInfo.value = backupManager.getBackupInfo(content)
    } catch (error) {
      console.error('读取备份文件失败:', error)
      backupInfo.value = null
      alert('备份文件格式错误')
    }
  }
}

// 恢复数据
const handleRestore = async () => {
  if (!selectedFile.value) return

  if (!confirm('恢复数据将覆盖当前所有数据，确定继续吗？')) return

  try {
    isRestoring.value = true
    const content = await backupManager.loadBackupFromFile(selectedFile.value)
    await backupManager.importData(content, { overwrite: true })
    alert('数据恢复成功！')
    selectedFile.value = null
    backupInfo.value = null
  } catch (error) {
    console.error('恢复失败:', error)
    alert('恢复失败：' + (error as Error).message)
  } finally {
    isRestoring.value = false
  }
}

// 复制机器码
const copyMachineCode = async () => {
  try {
    await navigator.clipboard.writeText(machineCode.value)
    alert('机器码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 清空所有数据
const handleClearAllData = async () => {
  try {
    // 第一步确认
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

    // 第二步确认 - 输入验证
    try {
      const { value } = await ElMessageBox.prompt('请输入 "DELETE" 来确认此操作：', '二次确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'text',
      })

      // 手动验证输入
      if (value !== 'DELETE') {
        await ElMessageBox.alert('输入错误，操作已取消', '验证失败', { type: 'warning' })
        return
      }
    } catch {
      return // 用户取消
    }

    // 设置清空标志
    sessionStorage.setItem('__CLEAR_ALL_DATA__', 'true')

    console.log('✅ 用户确认清空，准备重新加载页面...')

    // 直接重新加载页面，让页面在加载时清空数据
    window.location.reload()
  } catch (error) {
    // 用户取消操作，不显示错误
    if ((error as any) !== 'cancel' && (error as any)?.message !== 'cancel') {
      console.error('清空数据失败:', error)
    }
  }
}

// 加载数据统计
const handleLoadStats = async () => {
  try {
    const { getDatabase } = await import('@/database/init')
    const db = getDatabase()

    const getResult = (table: string) => {
      try {
        return db.all(`SELECT COUNT(*) as count FROM ${table}`)[0]?.count || 0
      } catch {
        return 0
      }
    }

    dataStats.value = {
      studentCount: getResult('student'),
      smAssessCount: getResult('sm_assess'),
      weefimAssessCount: getResult('weefim_assess'),
      trainLogCount: getResult('train_log'),
      userCount: getResult('user'),
    }
  } catch (error) {
    console.error('加载统计失败:', error)
    // 数据库可能未初始化，显示空统计
    dataStats.value = {
      studentCount: 0,
      smAssessCount: 0,
      weefimAssessCount: 0,
      trainLogCount: 0,
      userCount: 0,
    }
  }
}

// Phase 2.0 重构工具导航
const goToSchemaMigration = () => {
  router.push({ name: 'SchemaMigration' })
}

const goToMigrationVerification = () => {
  router.push({ name: 'MigrationVerification' })
}

// Phase 3.5 开发者工具导航
const goToModuleDevTools = () => {
  router.push('/module-devtools')
}

const goToBenchmarkRunner = () => {
  router.push('/benchmark-runner')
}

// 班级管理测试工具导航
const goToClassManagementTest = () => {
  router.push('/class-management-test')
}

const goToClassSnapshotVerification = () => {
  router.push('/class-snapshot-verification')
}

const goToClassTestLite = () => {
  router.push('/class-test-lite')
}

// 初始化
onMounted(() => {
  loadPackageInfo()
  // 如果在开发模式，自动加载统计
  if (isDevMode.value) {
    handleLoadStats()
  }
})
</script>

<style scoped>
/* Tab 样式 */
.system-tabs {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.el-tabs__content) {
  padding-top: 20px;
}

/* 备份区域样式 */
.backup-section h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.backup-section h2 i {
  color: #667eea;
}

.backup-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.backup-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.card-header {
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.card-header h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 18px;
}

.card-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 按钮样式 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  align-self: flex-start;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 帮助文本 */
.help-text {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.help-text.warning {
  color: #dc3545;
}

.help-text.info {
  color: #409eff;
}

/* 文件上传 */
.upload-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-name {
  color: #666;
  font-size: 14px;
}

/* 备份信息 */
.backup-info {
  padding: 12px;
  background: #f0f0f0;
  border-radius: 4px;
}

.backup-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.backup-info ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.backup-info li {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

/* 关于区域 */
.about-section h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.about-section h2 i {
  color: #667eea;
}

.about-card {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.about-info h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.about-info p {
  margin: 8px 0;
  color: #666;
}

.about-info .copyright {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
  font-size: 13px;
  color: #999;
}

/* 开发者工具区域样式 */
.devtools-section h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.devtools-section h2 i {
  color: #f39c12;
}

.devtools-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.devtools-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.devtools-card.danger {
  border-color: #dc3545;
}

.devtools-card.danger .card-header {
  background: #fee;
}

.devtools-card.info {
  border-color: #17a2b8;
}

.devtools-card.info .card-header {
  background: #e8f8f9;
}

.devtools-card.success {
  border-color: #67c23a;
}

.devtools-card.success .card-header {
  background: #f0f9ff;
}

.devtools-card.primary {
  border-color: #409eff;
}

.devtools-card.primary .card-header {
  background: #ecf5ff;
}

.btn-info {
  background: #409eff;
  color: white;
}

.btn-info:hover {
  background: #337ecc;
}

/* 迁移工具按钮组 */
.migration-tools {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.migration-tools button {
  flex: 1;
}

/* 统计列表样式 */
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  color: #333;
  font-weight: 600;
  font-size: 16px;
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
</style>
