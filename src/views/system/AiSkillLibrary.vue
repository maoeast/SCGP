<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAiStore } from '@/stores/ai'
import type { AiSkill } from '@/database/ai-api'

const aiStore = useAiStore()
const dialogVisible = ref(false)
const editing = ref(false)
const selectedSkill = ref<AiSkill | null>(null)

const form = reactive({
  id: 0,
  code: '',
  name: '',
  description: '',
  body: '',
  sourceUrl: '',
  license: 'SCGP-local',
  evidenceLevel: '实践经验',
  riskLevel: '常规',
  audience: '教师',
  enabled: true,
})

const isBuiltin = computed(() => selectedSkill.value?.sourceType === 'builtin')
const referenceCount = (skill: AiSkill) =>
  Array.isArray(skill.knowledgePayload?.references) ? skill.knowledgePayload.references.length : 0

function resetForm() {
  form.id = 0
  form.code = ''
  form.name = ''
  form.description = ''
  form.body = ''
  form.sourceUrl = ''
  form.license = 'SCGP-local'
  form.evidenceLevel = '实践经验'
  form.riskLevel = '常规'
  form.audience = '教师'
  form.enabled = true
}

function openCreate() {
  editing.value = false
  selectedSkill.value = null
  resetForm()
  dialogVisible.value = true
}

function openView(skill: AiSkill) {
  editing.value = skill.sourceType === 'custom'
  selectedSkill.value = skill
  form.id = skill.id
  form.code = skill.code.replace(/^knowledge_custom_/, '')
  form.name = skill.name
  form.description = skill.description
  form.body = String(skill.knowledgePayload?.body ?? skill.knowledgePayload?.content ?? '')
  form.sourceUrl = skill.sourceUrl
  form.license = skill.license || '未标注'
  form.evidenceLevel = skill.evidenceLevel || '未标注'
  form.riskLevel = skill.riskLevel || '常规'
  form.audience = skill.audience || '教师'
  form.enabled = skill.enabled
  dialogVisible.value = true
}

async function save() {
  if (isBuiltin.value) return
  try {
    await aiStore.saveKnowledgeSkill({ ...form })
    ElMessage.success(editing.value ? '本地知识技能已更新' : '本地知识技能已创建')
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
  }
}

async function toggleEnabled(skill: AiSkill, value: boolean) {
  try {
    await aiStore.setKnowledgeSkillEnabled(skill.id, value)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
  }
}

async function remove(skill: AiSkill) {
  try {
    await ElMessageBox.confirm(`确定删除本地知识技能「${skill.name}」吗？已挂载它的智能体将自动解绑。`, '删除确认', {
      type: 'warning',
    })
    await aiStore.deleteKnowledgeSkill(skill.id)
    ElMessage.success('本地知识技能已删除')
  } catch {
    /* 取消或已提示错误 */
  }
}
</script>

<template>
  <el-card shadow="never" class="skill-library-card">
    <template #header>
      <div class="card-header">
        <div>
          <span>知识技能库</span>
          <div class="header-hint">内置技能由项目文件维护；本地技能可在此创建、编辑与启停。</div>
        </div>
        <el-button class="skill-create-button" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </template>

    <el-table :data="aiStore.allKnowledgeSkills" stripe>
      <el-table-column prop="name" label="名称" min-width="150" />
      <el-table-column label="来源" width="100">
        <template #default="{ row }">
          <el-tag :type="row.sourceType === 'custom' ? 'success' : 'info'" size="small">
            {{ row.sourceType === 'custom' ? '本地自定义' : '内置' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="audience" label="适用角色" width="100" show-overflow-tooltip />
      <el-table-column prop="riskLevel" label="风险" width="90" show-overflow-tooltip />
      <el-table-column label="引用资料" width="90">
        <template #default="{ row }">{{ referenceCount(row) }}</template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-switch :model-value="row.enabled" @change="toggleEnabled(row, Boolean($event))" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openView(row)">
            {{ row.sourceType === 'custom' ? '编辑' : '查看' }}
          </el-button>
          <el-button v-if="row.sourceType === 'custom'" link type="danger" size="small" @click="remove(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog
    v-model="dialogVisible"
    :title="isBuiltin ? '查看内置知识技能' : editing ? '编辑本地知识技能' : '新增本地知识技能'"
    width="720px"
  >
    <el-alert
      v-if="isBuiltin"
      title="内置技能的正文来自 src/data/skills，应用启动时会同步覆盖数据库内容。"
      type="info"
      :closable="false"
      show-icon
      class="skill-alert"
    />
    <el-form label-width="100px">
      <el-form-item label="编号">
        <el-input v-model="form.code" :disabled="editing || isBuiltin" placeholder="如 classroom-support" />
      </el-form-item>
      <el-form-item label="名称"><el-input v-model="form.name" :disabled="isBuiltin" /></el-form-item>
      <el-form-item label="简介">
        <el-input v-model="form.description" :disabled="isBuiltin" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="适用角色"><el-input v-model="form.audience" :disabled="isBuiltin" /></el-form-item>
      <el-form-item label="风险等级"><el-input v-model="form.riskLevel" :disabled="isBuiltin" /></el-form-item>
      <el-form-item label="证据说明"><el-input v-model="form.evidenceLevel" :disabled="isBuiltin" /></el-form-item>
      <el-form-item label="许可"><el-input v-model="form.license" :disabled="isBuiltin" /></el-form-item>
      <el-form-item label="来源链接"><el-input v-model="form.sourceUrl" :disabled="isBuiltin" /></el-form-item>
      <el-form-item label="知识正文">
        <el-input v-model="form.body" :disabled="isBuiltin" type="textarea" :rows="14" />
      </el-form-item>
      <el-form-item v-if="isBuiltin" label="引用资料">
        <span>{{ referenceCount(selectedSkill!) }} 项；在智能体编辑框中按需勾选注入。</span>
      </el-form-item>
      <el-form-item v-else label="启用"><el-switch v-model="form.enabled" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button v-if="!isBuiltin" type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.skill-library-card {
  border: 1px solid var(--scgp-border, #e6ebf2);
  border-radius: var(--scgp-radius-xl, 22px);
  box-shadow: var(--scgp-shadow-soft, 0 18px 44px rgba(143, 169, 204, 0.12));
}

/* 新增按钮与「智能体管理 → 新增」同规格（min-height 32px + 内边距 14px） */
.skill-create-button {
  min-height: 32px;
  padding-inline: 14px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.skill-alert {
  margin-bottom: 16px;
}
</style>
