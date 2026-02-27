<template>
  <div class="records-panel">
    <!-- 筛选区 -->
    <div class="filter-section">
      <div class="filter-left">
        <el-select
          v-model="selectedStudentId"
          placeholder="选择学生"
          clearable
          filterable
          style="width: 200px"
          @change="loadRecords"
        >
          <el-option
            v-for="student in students"
            :key="student.id"
            :label="student.name"
            :value="student.id"
          />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="loadRecords"
        />
        <el-select
          v-model="selectedCategory"
          placeholder="选择分类"
          clearable
          style="width: 140px"
          @change="loadRecords"
        >
          <el-option
            v-for="cat in categories"
            :key="cat.value"
            :label="cat.label"
            :value="cat.value"
          />
        </el-select>
      </div>
      <div class="filter-right">
        <el-button :icon="Refresh" @click="loadRecords">刷新</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="records"
      stripe
      style="width: 100%"
      max-height="500"
    >
      <el-table-column prop="student_name" label="学生姓名" width="100" />
      <el-table-column label="器材名称" min-width="150">
        <template #default="{ row }">
          <div class="equipment-cell">
            <el-avatar
              v-if="row.equipment_image"
              :src="row.equipment_image"
              :size="32"
              shape="square"
            />
            <span>{{ row.equipment_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="getCategoryTagType(row.category)">
            {{ getCategoryLabel(row.category) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="得分" width="100">
        <template #default="{ row }">
          <el-rate
            v-model="row.score"
            disabled
            :max="5"
            size="small"
          />
        </template>
      </el-table-column>
      <el-table-column label="提示等级" width="90">
        <template #default="{ row }">
          <el-tag :type="getPromptLevelType(row.prompt_level)" size="small">
            {{ getPromptLevelLabel(row.prompt_level) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="训练时长" width="90">
        <template #default="{ row }">
          {{ formatDuration(row.duration_seconds) }}
        </template>
      </el-table-column>
      <el-table-column prop="training_date" label="训练日期" width="110" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            link
            @click="$emit('view-detail', row.id)"
          >
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空状态 -->
    <el-empty
      v-if="!loading && records.length === 0"
      description="暂无器材训练记录"
    />

    <!-- 统计信息 -->
    <div v-if="records.length > 0" class="stats-section">
      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="总记录数">{{ records.length }}</el-descriptions-item>
        <el-descriptions-item label="平均得分">
          {{ avgScore.toFixed(1) }} 分
        </el-descriptions-item>
        <el-descriptions-item label="总训练时长">
          {{ totalDuration }}
        </el-descriptions-item>
        <el-descriptions-item label="涉及器材">
          {{ equipmentCount }} 种
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { EquipmentTrainingAPI, StudentAPI } from '@/database/api'

interface Props {
  moduleCode: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'view-detail', recordId: number): void
}>()

// 分类选项
const categories = [
  { value: 'tactile', label: '触觉' },
  { value: 'olfactory', label: '嗅觉' },
  { value: 'visual', label: '视觉' },
  { value: 'auditory', label: '听觉' },
  { value: 'gustatory', label: '味觉' },
  { value: 'proprioceptive', label: '本体觉' },
  { value: 'integration', label: '综合' }
]

const CATEGORY_LABELS: Record<string, string> = {
  tactile: '触觉',
  olfactory: '嗅觉',
  visual: '视觉',
  auditory: '听觉',
  gustatory: '味觉',
  proprioceptive: '本体觉',
  integration: '综合'
}

const CATEGORY_TAG_TYPES: Record<string, string> = {
  tactile: 'danger',
  olfactory: 'success',
  visual: 'primary',
  auditory: 'warning',
  gustatory: 'info',
  proprioceptive: '',
  integration: 'success'
}

// 状态
const loading = ref(false)
const records = ref<any[]>([])
const students = ref<any[]>([])
const selectedStudentId = ref<number | undefined>()
const dateRange = ref<[string, string] | null>(null)
const selectedCategory = ref<string | undefined>()

// 统计计算
const avgScore = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, r) => acc + r.score, 0)
  return sum / records.value.length
})

const totalDuration = computed(() => {
  const total = records.value.reduce((acc, r) => acc + (r.duration_seconds || 0), 0)
  return formatDuration(total)
})

const equipmentCount = computed(() => {
  const uniqueIds = new Set(records.value.map(r => r.equipment_id))
  return uniqueIds.size
})

// 格式化时长
const formatDuration = (seconds: number) => {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${remainingSeconds}秒`
}

// 获取分类标签
const getCategoryLabel = (category: string) => {
  return CATEGORY_LABELS[category] || category
}

// 获取分类 Tag 类型
const getCategoryTagType = (category: string) => {
  return CATEGORY_TAG_TYPES[category] || ''
}

// 获取提示等级标签
const getPromptLevelLabel = (level: number) => {
  const labels: Record<number, string> = {
    1: '完全独立',
    2: '少量提示',
    3: '部分提示',
    4: '大量提示',
    5: '完全辅助'
  }
  return labels[level] || `等级${level}`
}

// 获取提示等级类型
const getPromptLevelType = (level: number) => {
  if (level <= 2) return 'success'
  if (level <= 3) return 'warning'
  return 'danger'
}

// 加载学生列表
const loadStudents = async () => {
  try {
    const api = new StudentAPI()
    students.value = await api.getAllStudents()
  } catch (error) {
    console.error('加载学生列表失败:', error)
  }
}

// 加载记录
const loadRecords = () => {
  loading.value = true
  try {
    const api = new EquipmentTrainingAPI()

    // 获取指定模块的器材训练记录
    let allRecords: any[] = []

    if (selectedStudentId.value) {
      // 获取指定学生的记录
      const student = students.value.find(s => s.id === selectedStudentId.value)
      const studentRecords = api.getStudentRecords(selectedStudentId.value, {
        start_date: dateRange.value?.[0],
        end_date: dateRange.value?.[1]
      })

      // 筛选模块
      const moduleRecords = studentRecords.filter((r: any) => r.module_code === props.moduleCode)

      allRecords = moduleRecords.map((r: any) => ({
        ...r,
        student_name: student?.name || '未知'
      }))
    } else {
      // 获取所有学生的记录
      for (const student of students.value) {
        const studentRecords = api.getStudentRecords(student.id, {
          start_date: dateRange.value?.[0],
          end_date: dateRange.value?.[1]
        })

        // 筛选模块
        const moduleRecords = studentRecords.filter((r: any) => r.module_code === props.moduleCode)

        allRecords.push(...moduleRecords.map((r: any) => ({
          ...r,
          student_name: student.name
        })))
      }
    }

    // 分类筛选
    if (selectedCategory.value) {
      allRecords = allRecords.filter((r: any) => r.category === selectedCategory.value)
    }

    // 按训练日期倒序排列
    allRecords.sort((a: any, b: any) => {
      return new Date(b.training_date).getTime() - new Date(a.training_date).getTime()
    })

    records.value = allRecords
  } catch (error) {
    console.error('加载记录失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadStudents()
  loadRecords()
})
</script>

<style scoped>
.records-panel {
  padding: 0;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.filter-left {
  display: flex;
  gap: 12px;
}

.equipment-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-section {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}
</style>
