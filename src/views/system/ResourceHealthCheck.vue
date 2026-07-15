<template>
  <section class="system-card scgp-surface resource-health-card">
    <div class="scgp-section-heading">
      <h3>资源文件体检</h3>
      <p>
        扫描本地托管的资源文件（上传图片、教具文件），找出未被任何资源或教具引用的孤儿文件。
        体检为只读，确认后才清理。
      </p>
    </div>

    <div class="system-card__body">
      <el-button type="primary" :loading="scanning" @click="handleScan">
        {{ scanning ? '体检中...' : report ? '重新体检' : '开始体检' }}
      </el-button>

      <template v-if="report">
        <div class="resource-health-stats">
          <div class="resource-health-stat">
            <span class="resource-health-stat__label">磁盘托管文件</span>
            <span class="resource-health-stat__value">
              {{ report.totalDiskFiles }} 个 / {{ formatBytes(report.totalDiskBytes) }}
            </span>
          </div>
          <div class="resource-health-stat">
            <span class="resource-health-stat__label">孤儿文件</span>
            <span
              class="resource-health-stat__value"
              :class="{ 'resource-health-stat__value--orphan': report.orphans.length > 0 }"
            >
              {{ report.orphans.length }} 个 / {{ formatBytes(report.totalBytes) }}
            </span>
          </div>
        </div>

        <div v-if="report.orphans.length === 0" class="resource-health-ok">
          ✅ 未发现孤儿文件，磁盘文件与引用一致。
        </div>

        <template v-else>
          <div class="scgp-warning-block">
            清理将物理删除选中的孤儿文件，操作不可恢复。请确认这些文件确无用途后再清理。
          </div>

          <div class="resource-health-toolbar">
            <el-checkbox :model-value="allSelected" :indeterminate="indeterminate" @change="toggleAll">
              全选
            </el-checkbox>
            <span class="resource-health-count">
              已选 {{ selectedRows.length }} / {{ report.orphans.length }}
            </span>
          </div>

          <el-table
            ref="tableRef"
            :data="report.orphans"
            size="small"
            border
            max-height="320"
            @selection-change="onSelectionChange"
          >
            <el-table-column type="selection" width="42" />
            <el-table-column prop="rel" label="文件路径" min-width="280" show-overflow-tooltip />
            <el-table-column label="大小" width="90">
              <template #default="{ row }">{{ formatBytes(row.size) }}</template>
            </el-table-column>
          </el-table>

          <div class="resource-health-actions">
            <el-button
              type="danger"
              :loading="purging"
              :disabled="selectedRows.length === 0"
              @click="handlePurge"
            >
              {{ purging ? '清理中...' : `清理选中（释放 ${formatBytes(selectedBytes)}）` }}
            </el-button>
          </div>
        </template>
      </template>

      <p v-else-if="scanError" class="resource-health-error">{{ scanError }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ElTable } from 'element-plus'
import {
  findOrphans,
  purgeOrphans,
  type DiskFile,
  type OrphanReport,
} from '@/utils/resource-reconcile'

const scanning = ref(false)
const purging = ref(false)
const report = ref<OrphanReport | null>(null)
const scanError = ref('')
const tableRef = ref<InstanceType<typeof ElTable>>()
const selectedRows = ref<DiskFile[]>([])

const selectedBytes = computed(() => selectedRows.value.reduce((sum, f) => sum + f.size, 0))

const allSelected = computed(
  () =>
    report.value !== null &&
    report.value.orphans.length > 0 &&
    selectedRows.value.length === report.value.orphans.length,
)

const indeterminate = computed(
  () =>
    selectedRows.value.length > 0 &&
    report.value !== null &&
    selectedRows.value.length < report.value.orphans.length,
)

const onSelectionChange = (rows: DiskFile[]) => {
  selectedRows.value = rows
}

const toggleAll = () => {
  tableRef.value?.toggleAllSelection()
}

const handleScan = async () => {
  scanning.value = true
  scanError.value = ''
  try {
    report.value = await findOrphans()
    selectedRows.value = []
    // 默认全选孤儿，方便一键清理；用户可反选
    await nextTick()
    if (report.value.orphans.length > 0) {
      tableRef.value?.toggleAllSelection()
    }
  } catch (error) {
    console.error('[资源体检] 体检失败:', error)
    scanError.value = `体检失败：${(error as Error).message}`
    report.value = null
  } finally {
    scanning.value = false
  }
}

const handlePurge = async () => {
  const targets = selectedRows.value
  if (targets.length === 0) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `将物理删除 ${targets.length} 个孤儿文件（约 ${formatBytes(selectedBytes.value)}），操作不可恢复。确认继续？`,
      '确认清理孤儿文件',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true,
      },
    )
  } catch {
    return // 用户取消
  }

  purging.value = true
  try {
    const result = await purgeOrphans(targets)
    if (result.failed.length > 0) {
      ElMessage.warning(
        `已清理 ${result.deleted} 个（释放 ${formatBytes(result.freedBytes)}），${result.failed.length} 个删除失败`,
      )
    } else {
      ElMessage.success(`已清理 ${result.deleted} 个文件，释放 ${formatBytes(result.freedBytes)}`)
    }
    // 重新体检刷新报告
    await handleScan()
  } catch (error) {
    console.error('[资源体检] 清理失败:', error)
    ElMessage.error(`清理失败：${(error as Error).message}`)
  } finally {
    purging.value = false
  }
}

/** 字节量可读化（B/KB/MB/GB） */
const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 || value >= 100 ? 0 : 1)} ${units[unit]}`
}
</script>

<style scoped>
/* 与 System.vue 的 .system-card 视觉一致（scoped 隔离下需自带） */
.system-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
}

.system-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.resource-health-card {
  width: 100%;
}

.resource-health-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #f7f9fc;
  border: 1px solid rgba(217, 226, 238, 0.9);
}

.resource-health-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-health-stat__label {
  color: var(--scgp-muted);
  font-size: 12px;
}

.resource-health-stat__value {
  color: var(--scgp-text);
  font-size: 15px;
  font-weight: 600;
}

.resource-health-stat__value--orphan {
  color: #e0533d;
}

.resource-health-ok {
  color: #2c8a5b;
  font-size: 14px;
}

.resource-health-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
}

.resource-health-count {
  color: var(--scgp-muted);
  font-size: 12px;
}

.resource-health-actions {
  display: flex;
  gap: 10px;
}

.resource-health-error {
  margin: 0;
  color: #e0533d;
  font-size: 13px;
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
</style>
