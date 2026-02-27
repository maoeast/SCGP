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
      <el-table-column prop="student_name" label="学生姓名" width="120" />
      <el-table-column label="任务" width="100">
        <template #default="{ row }">
          <el-tag size="small">任务{{ row.task_id }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="训练时间" width="180">
        <template #default="{ row }">
          {{ formatTimestamp(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column label="时长" width="100">
        <template #default="{ row }">
          {{ formatDuration(row.duration) }}
        </template>
      </el-table-column>
      <el-table-column label="正确率" width="120">
        <template #default="{ row }">
          <el-progress
            :percentage="Math.round(row.accuracy_rate * 100)"
            :stroke-width="10"
            :color="getAccuracyColor(row.accuracy_rate)"
          />
        </template>
      </el-table-column>
      <el-table-column label="平均响应" width="100">
        <template #default="{ row }">
          {{ row.avg_response_time }}ms
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ row.created_at }}
        </template>
      </el-table-column>
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
      description="暂无游戏训练记录"
    />

    <!-- 统计信息 -->
    <div v-if="records.length > 0" class="stats-section">
      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="总记录数">{{ records.length }}</el-descriptions-item>
        <el-descriptions-item label="平均正确率">
          {{ avgAccuracy }}%
        </el-descriptions-item>
        <el-descriptions-item label="平均响应时间">
          {{ avgResponseTime }}ms
        </el-descriptions-item>
        <el-descriptions-item label="总训练时长">
          {{ totalDuration }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { GameTrainingAPI, StudentAPI } from '@/database/api'

interface Props {
  moduleCode: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'view-detail', recordId: number): void
}>()

// 状态
const loading = ref(false)
const records = ref<any[]>([])
const students = ref<any[]>([])
const selectedStudentId = ref<number | undefined>()
const dateRange = ref<[string, string] | null>(null)

// 统计计算
const avgAccuracy = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, r) => acc + r.accuracy_rate, 0)
  return Math.round((sum / records.value.length) * 100)
})

const avgResponseTime = computed(() => {
  if (records.value.length === 0) return 0
  const sum = records.value.reduce((acc, r) => acc + r.avg_response_time, 0)
  return Math.round(sum / records.value.length)
})

const totalDuration = computed(() => {
  const total = records.value.reduce((acc, r) => acc + r.duration, 0)
  return formatDuration(total)
})

// 格式化时间戳
const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 格式化时长
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${remainingSeconds}秒`
}

// 获取正确率颜色
const getAccuracyColor = (rate: number) => {
  if (rate >= 0.8) return '#67c23a'
  if (rate >= 0.6) return '#e6a23c'
  return '#f56c6c'
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
    const api = new GameTrainingAPI()
    // 获取指定模块的训练记录
    let allRecords = api.getStudentTrainingRecords(selectedStudentId.value || 0, undefined, props.moduleCode)

    // 如果没有选择学生，获取所有学生的记录
    if (!selectedStudentId.value) {
      allRecords = []
      for (const student of students.value) {
        const studentRecords = api.getStudentTrainingRecords(student.id, undefined, props.moduleCode)
        allRecords.push(...studentRecords.map((r: any) => ({
          ...r,
          student_name: student.name
        })))
      }
    } else {
      const student = students.value.find(s => s.id === selectedStudentId.value)
      allRecords = allRecords.map((r: any) => ({
        ...r,
        student_name: student?.name || '未知'
      }))
    }

    // 日期筛选
    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      const startDate = new Date(dateRange.value[0]).getTime()
      const endDate = new Date(dateRange.value[1] + ' 23:59:59').getTime()
      allRecords = allRecords.filter((r: any) => {
        return r.timestamp >= startDate && r.timestamp <= endDate
      })
    }

    // 按时间倒序排列
    allRecords.sort((a: any, b: any) => b.timestamp - a.timestamp)

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

.stats-section {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}
</style>
