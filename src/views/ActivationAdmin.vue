<template>
  <div class="activation-admin">
    <div class="header">
      <h1>激活管理</h1>
      <p>激活码生成和管理工具（仅限开发环境）</p>
    </div>

    <el-card class="card" header="生成激活码">
      <el-alert
        title="激活码生成工具已迁移"
        type="info"
        description="请使用 license-generator-dist 文件夹下的专用工具生成激活码"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <div class="tool-info">
        <h3>📁 工具位置</h3>
        <p>项目根目录下的 <code>license-generator-dist</code> 文件夹</p>

        <h3>🚀 使用方法</h3>
        <div class="usage-section">
          <h4>1. 生成试用码（7天）</h4>
          <el-tag type="warning">双击运行</el-tag>
          <code>1-生成试用码.bat</code>
          <p>或命令行：<code>node generate-license.js --trial</code></p>
        </div>

        <div class="usage-section">
          <h4>2. 生成正式激活码（绑定机器）</h4>
          <el-tag type="success">双击运行</el-tag>
          <code>2-生成正式码.bat</code>
          <p>或命令行：<code>node generate-license.js --machine &lt;机器码&gt; --days &lt;天数&gt;</code></p>
        </div>

        <div class="usage-section">
          <h4>3. 生成永久激活码</h4>
          <p>命令行：<code>node generate-license.js --machine &lt;机器码&gt; --permanent</code></p>
        </div>

        <el-divider />

        <div class="note-section">
          <h3>⚠️ 重要提示</h3>
          <ul>
            <li>试用码不绑定机器，任何人都可以使用</li>
            <li>正式码严格绑定机器硬件，换机器需重新生成</li>
            <li>私钥文件（.keys文件夹）请妥善保管，不要泄露</li>
            <li>每次生成会自动保存到 .txt 文件</li>
          </ul>
        </div>
      </div>
    </el-card>

    <el-card class="card" header="当前机器信息">
      <div class="info-item">
        <label>机器码：</label>
        <span class="machine-code">{{ currentMachineCode }}</span>
        <el-button size="small" @click="copyMachineCode">复制</el-button>
      </div>
      <div class="info-item">
        <label>激活状态：</label>
        <el-tag :type="activationStatus.canUse ? 'success' : 'danger'">
          {{ activationStatus.message }}
        </el-tag>
      </div>
      <div v-if="activationStatus.daysRemaining" class="info-item">
        <label>剩余天数：</label>
        <span>{{ activationStatus.daysRemaining }} 天</span>
      </div>
    </el-card>

    <el-card class="card" header="激活历史">
      <el-table :data="activationHistory" style="width: 100%">
        <el-table-column prop="activationCode" label="激活码" width="200" />
        <el-table-column prop="machineCode" label="机器码" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isValid" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isValid ? 'success' : 'danger'">
              {{ row.isValid ? '有效' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expiresAt" label="过期时间" width="180">
          <template #default="{ row }">
            {{ row.expiresAt ? formatDate(row.expiresAt) : '永久' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              @click="invalidateActivation(row)"
              v-if="row.isValid"
            >
              作废
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="card" header="快速操作">
      <el-button @click="clearAllActivations">清除所有激活记录</el-button>
      <el-button @click="resetTrial">重置试用期</el-button>
      <el-button @click="exportActivationData">导出激活数据</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { activationManager } from '@/utils/activation-manager'
import { DatabaseAPI } from '@/database/api'

const currentMachineCode = ref('')
const activationHistory = ref<any[]>([])
const activationStatus = ref({
  canUse: false,
  type: 'trial',
  daysRemaining: 0,
  message: ''
})

const api = new DatabaseAPI()

onMounted(async () => {
  // 获取当前机器码
  currentMachineCode.value = await activationManager.getMachineCode()

  // 检查激活状态
  const status = await activationManager.checkActivationStatus()
  activationStatus.value = status

  // 加载激活历史
  loadActivationHistory()
})

function copyMachineCode() {
  navigator.clipboard.writeText(currentMachineCode.value).then(() => {
    ElMessage.success('机器码已复制到剪贴板')
  })
}

function getTypeTagType(type: string): string {
  const types = {
    full: 'success',
    education: 'warning',
    enterprise: 'danger',
    trial: 'info'
  }
  return types[type as keyof typeof types] || 'info'
}

function getTypeText(type: string): string {
  const texts = {
    full: '永久激活',
    education: '教育版',
    enterprise: '企业版',
    trial: '试用版'
  }
  return texts[type as keyof typeof texts] || type
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function loadActivationHistory() {
  try {
    const records = api.query(`
      SELECT
        activation_code,
        machine_code,
        license_data,
        is_valid,
        expires_at,
        created_at
      FROM activation
      ORDER BY created_at DESC
    `)

    activationHistory.value = records.map(record => ({
      activationCode: record.activation_code,
      machineCode: record.machine_code,
      type: JSON.parse(record.license_data).type || 'trial',
      isValid: !!record.is_valid,
      expiresAt: record.expires_at,
      createdAt: record.created_at
    }))
  } catch (error) {
    console.error('加载激活历史失败:', error)
  }
}

async function invalidateActivation(row: any) {
  try {
    await ElMessageBox.confirm('确定要作废这个激活码吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    api.execute(
      'UPDATE activation SET is_valid = 0, updated_at = CURRENT_TIMESTAMP WHERE activation_code = ?',
      [row.activationCode]
    )

    ElMessage.success('激活码已作废')
    loadActivationHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('作废激活码失败:', error)
      ElMessage.error('作废激活码失败')
    }
  }
}

async function clearAllActivations() {
  try {
    await ElMessageBox.confirm('确定要清除所有激活记录吗？这将使所有用户都需要重新激活。', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    api.execute('UPDATE activation SET is_valid = 0, updated_at = CURRENT_TIMESTAMP')

    // 清除首次运行时间以重置试用期
    api.execute('DELETE FROM system_config WHERE key = ?', ['first_run_time'])

    ElMessage.success('所有激活记录已清除')
    loadActivationHistory()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清除激活记录失败:', error)
      ElMessage.error('清除激活记录失败')
    }
  }
}

async function resetTrial() {
  try {
    await ElMessageBox.confirm('确定要重置试用期吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 清除首次运行时间
    api.execute('DELETE FROM system_config WHERE key = ?', ['first_run_time'])

    ElMessage.success('试用期已重置')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置试用期失败:', error)
      ElMessage.error('重置试用期失败')
    }
  }
}

function exportActivationData() {
  try {
    const data = {
      activationHistory: activationHistory.value,
      currentMachine: {
        machineCode: currentMachineCode.value,
        status: activationStatus.value
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activation-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('激活数据已导出')
  } catch (error) {
    console.error('导出激活数据失败:', error)
    ElMessage.error('导出激活数据失败')
  }
}
</script>

<style scoped>
.activation-admin {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  margin-bottom: 30px;
  text-align: center;
}

.header h1 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.header p {
  color: #666;
}

.card {
  margin-bottom: 20px;
}

.form-group {
  display: inline-block;
  margin-right: 20px;
  margin-bottom: 10px;
}

.form-group label {
  margin-right: 10px;
  font-weight: 500;
}

.generated-code {
  margin-top: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.code-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-family: monospace;
  font-size: 16px;
  margin-top: 10px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.info-item label {
  width: 100px;
  font-weight: 500;
}

.machine-code {
  font-family: monospace;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 10px;
}

.tool-info {
  padding: 20px;
}

.tool-info h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 18px;
}

.tool-info h4 {
  margin-top: 15px;
  margin-bottom: 10px;
  color: #34495e;
  font-size: 16px;
}

.tool-info p {
  margin: 8px 0;
  color: #666;
}

.tool-info code {
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e74c3c;
  font-size: 14px;
  display: inline-block;
  margin: 5px 0;
}

.usage-section {
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.note-section {
  margin: 20px 0;
  padding: 15px;
  background: #fff3cd;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.note-section ul {
  margin: 10px 0;
  padding-left: 20px;
}

.note-section li {
  margin: 8px 0;
  color: #856404;
}
</style>