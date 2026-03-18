<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="960px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="handleVisibilityChange"
    @closed="resetDialogState"
  >
    <div class="pack-dialog">
      <div class="mode-header">
        <el-segmented
          v-model="dialogMode"
          :options="modeOptions"
        />
        <div class="mode-meta" v-if="dialogMode === 'export'">
          当前可导出 <strong>{{ exportableResources.length }}</strong> 条情绪资源
        </div>
      </div>

      <div v-if="dialogMode === 'import'" class="mode-panel">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="导入标准 JSON 或 Excel 资源包"
          description="导入前会先执行契约归一化和校验，再根据 sceneCode 决定 skip / update / copy。"
        />

        <div class="toolbar-row">
          <div class="file-select">
            <input
              ref="fileInputRef"
              type="file"
              accept=".json,.xlsx,.xls"
              class="hidden-file-input"
              @change="handleFileChange"
            />
            <el-button type="primary" @click="triggerFileSelection" :loading="parsing">
              选择资源包
            </el-button>
            <span class="file-name">{{ selectedFile?.name || '尚未选择文件' }}</span>
          </div>

          <el-radio-group v-model="duplicateStrategy" size="large">
            <el-radio-button label="跳过重复" value="skip" />
            <el-radio-button label="更新已有" value="update" />
            <el-radio-button label="导入副本" value="copy" />
          </el-radio-group>
        </div>

        <el-alert
          v-if="parseError"
          type="error"
          :closable="false"
          show-icon
          :title="parseError"
          class="panel-alert"
        />

        <div v-if="previewRows.length > 0" class="summary-row">
          <el-tag type="info">格式：{{ importFormatLabel }}</el-tag>
          <el-tag type="success">可执行：{{ actionableCount }}</el-tag>
          <el-tag type="warning">冲突：{{ duplicateCount }}</el-tag>
          <el-tag type="danger">阻塞：{{ blockedCount }}</el-tag>
        </div>

        <el-table
          v-if="previewRows.length > 0"
          :data="previewRows"
          stripe
          max-height="420"
          class="preview-table"
        >
          <el-table-column label="资源" min-width="220">
            <template #default="{ row }">
              <div class="resource-cell">
                <strong>{{ row.targetName }}</strong>
                <span>{{ row.item.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="类型" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">
                {{ getTypeLabel(row.item.resourceType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="sceneCode" min-width="180">
            <template #default="{ row }">
              <div class="scene-code-cell">
                <code>{{ row.targetSceneCode }}</code>
                <span v-if="row.targetSceneCode !== row.item.sceneCode" class="scene-code-source">
                  原始: {{ row.item.sceneCode }}
                </span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="冲突检测" min-width="180">
            <template #default="{ row }">
              <div v-if="row.duplicateResource" class="duplicate-cell">
                <strong>{{ row.duplicateResource.name }}</strong>
                <span>#{{ row.duplicateResource.id }} / {{ row.duplicateResource.isActive ? '启用中' : '已禁用' }}</span>
              </div>
              <span v-else class="muted-text">无冲突</span>
            </template>
          </el-table-column>

          <el-table-column label="动作" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="getActionTagType(row.action)" effect="light">
                {{ getActionLabel(row.action) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="校验" min-width="260">
            <template #default="{ row }">
              <div v-if="row.issues.length > 0" class="issue-list">
                <span
                  v-for="issue in row.issues"
                  :key="issue"
                  class="issue-item"
                >
                  {{ issue }}
                </span>
              </div>
              <span v-else class="muted-text">通过</span>
            </template>
          </el-table-column>
        </el-table>

        <div v-else class="empty-panel">
          请选择一个 JSON / Excel 资源包以生成导入预览。
        </div>
      </div>

      <div v-else class="mode-panel">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="导出当前筛选范围内的情绪资源"
          description="JSON 会输出标准 pack envelope，Excel 会输出多 Sheet 关系化结构，便于校外交流和离线维护。"
        />

        <div class="toolbar-row export-row">
          <el-radio-group v-model="exportFormat" size="large">
            <el-radio-button label="JSON 包" value="json" />
            <el-radio-button label="Excel 工作簿" value="excel" />
          </el-radio-group>

          <el-button plain @click="handleTemplateDownload" :loading="templateLoading">
            下载 Excel 模板
          </el-button>
        </div>

        <div class="summary-row">
          <el-tag type="warning">情绪场景：{{ emotionSceneCount }}</el-tag>
          <el-tag type="success">表达关心：{{ careSceneCount }}</el-tag>
        </div>

        <el-table
          :data="exportPreviewRows"
          stripe
          max-height="420"
          class="preview-table"
        >
          <el-table-column label="资源名称" min-width="220">
            <template #default="{ row }">
              <div class="resource-cell">
                <strong>{{ row.name }}</strong>
                <span>{{ row.description || '无描述' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="类型" width="120" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">
                {{ getTypeLabel(row.resourceType) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="sceneCode" min-width="180">
            <template #default="{ row }">
              <code>{{ getSceneCodeFromResource(row) || '缺失' }}</code>
            </template>
          </el-table-column>

          <el-table-column label="分类" width="140" align="center">
            <template #default="{ row }">
              <el-tag size="small" type="info" effect="plain">
                {{ row.category || '未分类' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="footer-actions">
        <el-button @click="handleVisibilityChange(false)">取消</el-button>
        <el-button
          v-if="dialogMode === 'import'"
          type="primary"
          :disabled="!canExecuteImport"
          :loading="importing"
          @click="handleImport"
        >
          开始导入
        </el-button>
        <el-button
          v-else
          type="primary"
          :disabled="exportableResources.length === 0"
          :loading="exporting"
          @click="handleExport"
        >
          导出资源包
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { saveAs } from 'file-saver'
import { ModuleCode, type ResourceItem } from '@/types/module'
import { ResourceAPI } from '@/database/resource-api'
import {
  buildCopyIdentity,
  cloneMetadataForCopy,
  createEmotionalExcelPackBuffer,
  createEmotionalExcelTemplateBuffer,
  createEmotionalJsonPackBlob,
  getSceneCodeFromResource,
  isEmotionalResourceItem,
  parseEmotionalPackFile,
  type DuplicateStrategy,
  type EmotionalPackFormat,
  type EmotionalPackImportItem,
} from '@/utils/emotional-resource-pack'

type DialogMode = 'import' | 'export'
type PreviewAction = 'create' | 'update' | 'copy' | 'skip' | 'blocked'

interface PreviewRow {
  item: EmotionalPackImportItem
  duplicateResource: ResourceItem | null
  action: PreviewAction
  targetName: string
  targetSceneCode: string
  issues: string[]
}

interface Props {
  modelValue: boolean
  initialMode: DialogMode
  exportableResources: ResourceItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'completed'): void
}>()

const dialogMode = ref<DialogMode>(props.initialMode)
const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const parsing = ref(false)
const importing = ref(false)
const exporting = ref(false)
const templateLoading = ref(false)
const parseError = ref('')
const importFormat = ref<EmotionalPackFormat | null>(null)
const exportFormat = ref<EmotionalPackFormat>('json')
const duplicateStrategy = ref<DuplicateStrategy>('skip')
const importItems = ref<EmotionalPackImportItem[]>([])
const previewRows = ref<PreviewRow[]>([])
const existingResources = ref<ResourceItem[]>([])

const modeOptions = [
  { label: '导入', value: 'import' },
  { label: '导出', value: 'export' },
]

const dialogTitle = computed(() => dialogMode.value === 'import' ? '导入情绪资源包' : '导出情绪资源包')
const importFormatLabel = computed(() => importFormat.value === 'excel' ? 'Excel Workbook' : 'JSON Pack')
const actionableCount = computed(() => previewRows.value.filter((row) => row.action !== 'blocked' && row.action !== 'skip').length)
const duplicateCount = computed(() => previewRows.value.filter((row) => !!row.duplicateResource).length)
const blockedCount = computed(() => previewRows.value.filter((row) => row.action === 'blocked').length)
const canExecuteImport = computed(() => previewRows.value.some((row) => row.action === 'create' || row.action === 'update' || row.action === 'copy'))
const exportableResources = computed(() => props.exportableResources)
const exportPreviewRows = computed(() => props.exportableResources.slice(0, 50))
const emotionSceneCount = computed(() => props.exportableResources.filter((row) => row.resourceType === 'emotion_scene').length)
const careSceneCount = computed(() => props.exportableResources.filter((row) => row.resourceType === 'care_scene').length)

watch(() => props.initialMode, (value) => {
  dialogMode.value = value
})

watch(() => props.modelValue, async (visible) => {
  if (!visible) return
  if (dialogMode.value === 'import') {
    await loadExistingResources()
  }
})

watch(dialogMode, async (mode) => {
  if (mode === 'import' && props.modelValue) {
    await loadExistingResources()
    rebuildPreviewRows()
  }
})

watch(duplicateStrategy, () => {
  rebuildPreviewRows()
})

function handleVisibilityChange(value: boolean) {
  emit('update:modelValue', value)
}

function resetDialogState() {
  selectedFile.value = null
  parsing.value = false
  importing.value = false
  exporting.value = false
  templateLoading.value = false
  parseError.value = ''
  importFormat.value = null
  duplicateStrategy.value = 'skip'
  importItems.value = []
  previewRows.value = []
}

function getTypeLabel(resourceType: string) {
  return resourceType === 'emotion_scene' ? '情绪场景' : '表达关心'
}

function getActionLabel(action: PreviewAction) {
  switch (action) {
    case 'create':
      return '新建'
    case 'update':
      return '更新'
    case 'copy':
      return '副本'
    case 'skip':
      return '跳过'
    default:
      return '阻塞'
  }
}

function getActionTagType(action: PreviewAction) {
  switch (action) {
    case 'create':
      return 'success'
    case 'update':
      return 'warning'
    case 'copy':
      return 'info'
    case 'skip':
      return ''
    default:
      return 'danger'
  }
}

async function loadExistingResources() {
  const api = new ResourceAPI()
  existingResources.value = api.getAllResourcesForAdmin({
    moduleCode: ModuleCode.EMOTIONAL,
  }).filter((resource) => isEmotionalResourceItem(resource))
}

function triggerFileSelection() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''

  if (!file) return

  selectedFile.value = file
  parseError.value = ''
  parsing.value = true

  try {
    await loadExistingResources()
    const result = await parseEmotionalPackFile(file)
    importFormat.value = result.format
    importItems.value = result.items
    rebuildPreviewRows()
  } catch (error) {
    console.error('[EmotionalResourcePackDialog] 解析导入文件失败:', error)
    parseError.value = error instanceof Error ? error.message : '解析导入文件失败'
    importItems.value = []
    previewRows.value = []
  } finally {
    parsing.value = false
  }
}

function rebuildPreviewRows() {
  const existingKeyMap = new Map<string, ResourceItem>()
  const existingNames = new Set<string>()
  const existingSceneCodes = new Set<string>()

  existingResources.value.forEach((resource) => {
    const sceneCode = getSceneCodeFromResource(resource)
    existingNames.add(resource.name)
    if (sceneCode) {
      existingSceneCodes.add(sceneCode)
      existingKeyMap.set(`${resource.resourceType}::${sceneCode}`, resource)
    }
  })

  previewRows.value = importItems.value.map((item) => {
    const duplicateResource = existingKeyMap.get(`${item.resourceType}::${item.sceneCode}`) || null
    const issues = [...item.validationErrors]

    if (issues.length > 0) {
      return {
        item,
        duplicateResource,
        action: 'blocked',
        targetName: item.name,
        targetSceneCode: item.sceneCode,
        issues,
      }
    }

    if (!duplicateResource) {
      existingNames.add(item.name)
      existingSceneCodes.add(item.sceneCode)
      return {
        item,
        duplicateResource: null,
        action: 'create',
        targetName: item.name,
        targetSceneCode: item.sceneCode,
        issues,
      }
    }

    if (duplicateStrategy.value === 'skip') {
      return {
        item,
        duplicateResource,
        action: 'skip',
        targetName: item.name,
        targetSceneCode: item.sceneCode,
        issues,
      }
    }

    if (duplicateStrategy.value === 'update') {
      return {
        item,
        duplicateResource,
        action: 'update',
        targetName: item.name,
        targetSceneCode: item.sceneCode,
        issues: duplicateResource.isActive ? issues : [...issues, '目标资源当前已禁用，导入时会自动恢复'],
      }
    }

    const copyIdentity = buildCopyIdentity(item.name, item.sceneCode, existingNames, existingSceneCodes)
    existingNames.add(copyIdentity.name)
    existingSceneCodes.add(copyIdentity.sceneCode)

    return {
      item,
      duplicateResource,
      action: 'copy',
      targetName: copyIdentity.name,
      targetSceneCode: copyIdentity.sceneCode,
      issues,
    }
  })
}

async function handleImport() {
  if (!canExecuteImport.value) return

  importing.value = true
  const api = new ResourceAPI()
  const counts = {
    created: 0,
    updated: 0,
    copied: 0,
    skipped: 0,
    failed: 0,
  }

  try {
    for (const row of previewRows.value) {
      try {
        if (row.action === 'blocked') {
          counts.failed += 1
          continue
        }

        if (row.action === 'skip') {
          counts.skipped += 1
          continue
        }

        if (row.action === 'update' && row.duplicateResource) {
          // `updateResource()` only resolves active rows, so restore first when the
          // duplicate target is currently disabled.
          if (!row.duplicateResource.isActive) {
            api.restoreResource(row.duplicateResource.id)
          }

          const updated = api.updateResource(row.duplicateResource.id, {
            name: row.targetName,
            category: row.item.category,
            description: row.item.description,
            coverImage: row.item.coverImage,
            tags: row.item.tags,
            metadata: row.item.metadata,
          })

          if (!updated) {
            throw new Error(`更新资源失败: #${row.duplicateResource.id}`)
          }

          counts.updated += 1
          continue
        }

        const metadata = row.action === 'copy'
          ? cloneMetadataForCopy(row.item.metadata, row.targetName, row.targetSceneCode, row.item.tags)
          : row.item.metadata

        api.addResource({
          moduleCode: ModuleCode.EMOTIONAL,
          resourceType: row.item.resourceType,
          name: row.targetName,
          category: row.item.category,
          description: row.item.description,
          coverImage: row.item.coverImage,
          tags: row.item.tags,
          metadata,
        })

        if (row.action === 'copy') {
          counts.copied += 1
        } else {
          counts.created += 1
        }
      } catch (error) {
        console.error('[EmotionalResourcePackDialog] 导入单条资源失败:', error)
        counts.failed += 1
      }
    }

    await loadExistingResources()
    ElMessage.success(
      `导入完成：新建 ${counts.created}，更新 ${counts.updated}，副本 ${counts.copied}，跳过 ${counts.skipped}，失败 ${counts.failed}`
    )
    emit('completed')
    handleVisibilityChange(false)
  } finally {
    importing.value = false
  }
}

async function handleExport() {
  if (props.exportableResources.length === 0) {
    ElMessage.warning('当前筛选范围内没有可导出的情绪资源')
    return
  }

  exporting.value = true

  try {
    const dateStamp = new Date().toISOString().slice(0, 10)
    if (exportFormat.value === 'excel') {
      const buffer = createEmotionalExcelPackBuffer(props.exportableResources)
      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `scgp-emotional-pack-${dateStamp}.xlsx`
      )
    } else {
      saveAs(
        createEmotionalJsonPackBlob(props.exportableResources),
        `scgp-emotional-pack-${dateStamp}.json`
      )
    }

    ElMessage.success('资源包导出成功')
    handleVisibilityChange(false)
  } catch (error) {
    console.error('[EmotionalResourcePackDialog] 导出资源包失败:', error)
    ElMessage.error('资源包导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleTemplateDownload() {
  templateLoading.value = true

  try {
    const buffer = createEmotionalExcelTemplateBuffer()
    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'scgp-emotional-pack-template.xlsx'
    )
    ElMessage.success('Excel 模板已下载')
  } catch (error) {
    console.error('[EmotionalResourcePackDialog] 下载模板失败:', error)
    ElMessage.error('下载模板失败')
  } finally {
    templateLoading.value = false
  }
}
</script>

<style scoped>
.pack-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.mode-meta {
  font-size: 14px;
  color: #606266;
}

.mode-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.export-row {
  align-items: center;
}

.file-select {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hidden-file-input {
  display: none;
}

.file-name {
  color: #606266;
  font-size: 13px;
}

.panel-alert {
  margin-top: -4px;
}

.summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-table {
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.resource-cell,
.duplicate-cell,
.scene-code-cell,
.issue-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource-cell span,
.duplicate-cell span,
.scene-code-source {
  font-size: 12px;
  color: #909399;
}

.issue-item {
  font-size: 12px;
  color: #f56c6c;
}

.muted-text {
  color: #909399;
  font-size: 12px;
}

.empty-panel {
  padding: 32px 16px;
  text-align: center;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  color: #909399;
  background: #fafafa;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
