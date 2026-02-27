<!-- 数据录入表单组件 -->
<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    label-width="100px"
    label-position="left"
  >
    <!-- 器材信息展示 -->
    <div class="equipment-display">
      <img :src="equipmentData.image" :alt="equipmentData.name" class="display-image" />
      <div class="display-info">
        <div class="display-name">{{ equipmentData.name }}</div>
        <div class="display-desc">{{ equipmentData.description || '暂无描述' }}</div>
        <div v-if="equipmentData.tags?.length" class="ability-tags">
          <el-tag
            v-for="tag in equipmentData.tags"
            :key="tag"
            size="small"
            type="info"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>
    </div>

    <el-divider />

    <!-- 评分 (1-5 星) -->
    <el-form-item label="训练评分" prop="score" required>
      <div class="score-input">
        <el-rate
          v-model="formData.score"
          :max="5"
          :colors="['#f56c6c', '#e6a23c', '#67c23a']"
          show-text
          :texts="['1分 - 需要大量支持', '2分 - 需要较多支持', '3分 - 中等表现', '4分 - 表现良好', '5分 - 表现优异']"
          size="large"
        />
      </div>
    </el-form-item>

    <!-- 辅助等级 (5级) -->
    <el-form-item label="辅助等级" prop="promptLevel" required>
      <el-radio-group v-model="formData.promptLevel" size="large">
        <el-radio :value="1" border>独立完成</el-radio>
        <el-radio :value="2" border>口头提示</el-radio>
        <el-radio :value="3" border>视觉提示</el-radio>
        <el-radio :value="4" border>手触引导</el-radio>
        <el-radio :value="5" border>身体辅助</el-radio>
      </el-radio-group>
      <div class="prompt-desc">
        {{ getPromptLevelDescription(formData.promptLevel) }}
      </div>
    </el-form-item>

    <!-- 训练时长 (可选) -->
    <el-form-item label="训练时长">
      <el-input-number
        v-model="formData.durationSeconds"
        :min="0"
        :max="7200"
        :step="30"
        :precision="0"
        controls-position="right"
      />
      <span class="unit-label">秒</span>
    </el-form-item>

    <!-- 备注 (可选) -->
    <el-form-item label="训练备注">
      <el-input
        v-model="formData.notes"
        type="textarea"
        :rows="3"
        placeholder="记录训练过程中的观察、学生反应、调整策略等..."
        maxlength="500"
        show-word-limit
      />
    </el-form-item>

    <!-- 操作按钮 -->
    <el-form-item>
      <div class="action-buttons">
        <el-button type="primary" :loading="loading" @click="handleSubmit(false)">
          保存记录
        </el-button>
        <el-button type="success" :loading="loading" @click="handleSubmit(true)">
          保存并继续
        </el-button>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { EquipmentCatalog } from '@/types/equipment'
import type { ResourceItem } from '@/types/module'
import { getEquipmentImageUrl } from '@/assets/images/equipment/images'

// Props - 支持旧和新两种类型
interface Props {
  equipment: EquipmentCatalog | ResourceItem
  studentId: number
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 兼容层：统一处理两种类型的 equipment
const equipmentData = computed(() => {
  const eq = props.equipment
  // 检查是否是 ResourceItem（有 moduleCode 字段）
  const isResourceItem = 'moduleCode' in eq

  return {
    name: eq.name,
    description: eq.description,
    // 图片：ResourceItem 用 coverImage，EquipmentCatalog 用 image_url
    image: isResourceItem
      ? getEquipmentImageUrl(
          eq.category,
          (eq as ResourceItem).legacyId ?? eq.id,
          eq.name
        )
      : (eq as EquipmentCatalog).image_url,
    // 标签：ResourceItem 用 tags，EquipmentCatalog 用 ability_tags
    tags: isResourceItem
      ? (eq as ResourceItem).tags || []
      : (eq as EquipmentCatalog).ability_tags || [],
    category: eq.category
  }
})

// Emits
const emit = defineEmits<{
  submit: [data: {
    score: number
    promptLevel: number
    durationSeconds?: number
    notes?: string
    saveAndContinue: boolean
  }]
}>()

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  score: 3,
  promptLevel: 1,
  durationSeconds: undefined as number | undefined,
  notes: ''
})

// 表单验证规则
const formRules: FormRules = {
  score: [
    { required: true, message: '请选择训练评分', trigger: 'change' }
  ],
  promptLevel: [
    { required: true, message: '请选择辅助等级', trigger: 'change' }
  ]
}

// 获取辅助等级描述
const getPromptLevelDescription = (level: number) => {
  const descriptions: Record<number, string> = {
    1: '学生能够独立完成训练操作，无需任何辅助',
    2: '需要口头提示或指令引导完成操作',
    3: '需要视觉提示（手势、图片、示范）辅助完成',
    4: '需要手触引导或肢体接触辅助完成',
    5: '需要身体辅助或完全由老师操作完成'
  }
  return descriptions[level] || ''
}

// 提交表单
const handleSubmit = async (saveAndContinue: boolean) => {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (valid) {
      emit('submit', {
        score: formData.score,
        promptLevel: formData.promptLevel,
        durationSeconds: formData.durationSeconds,
        notes: formData.notes || undefined,
        saveAndContinue
      })
    }
  })
}

// 重置表单
const resetForm = () => {
  formData.score = 3
  formData.promptLevel = 1
  formData.durationSeconds = undefined
  formData.notes = ''
  formRef.value?.clearValidate()
}

// 暴露重置方法
defineExpose({
  resetForm
})
</script>

<style scoped>
.equipment-display {
  display: flex;
  gap: 16px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 8px;
}

.display-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.display-info {
  flex: 1;
  min-width: 0;
}

.display-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.display-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 8px;
}

.ability-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.score-input {
  width: 100%;
}

.prompt-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
  line-height: 1.5;
}

.unit-label {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  width: 100%;
}

.action-buttons .el-button {
  flex: 1;
}
</style>
