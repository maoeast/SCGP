<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">情绪行为调节</el-breadcrumb-item>
        <el-breadcrumb-item>训练记录</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>训练记录</h1>
        <p class="subtitle">查看情绪与场景、表达关心两类训练的关键表现指标。</p>
      </div>
      <div class="header-right">
        <el-button plain @click="goToMenu">返回模块入口</el-button>
      </div>
    </div>

    <div class="main-content">
      <el-row :gutter="16" class="summary-row">
        <el-col :span="6">
          <el-card class="summary-card" shadow="never">
            <span class="summary-label">训练总次数</span>
            <strong class="summary-value">{{ recordList.length }}</strong>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card" shadow="never">
            <span class="summary-label">平均正确率</span>
            <strong class="summary-value">{{ averageAccuracy }}%</strong>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card" shadow="never">
            <span class="summary-label">平均提示等级</span>
            <strong class="summary-value">{{ averageHintLevel }}</strong>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card" shadow="never">
            <span class="summary-label">累计训练时长</span>
            <strong class="summary-value">{{ totalDurationLabel }}</strong>
          </el-card>
        </el-col>
      </el-row>

      <el-card class="filter-card" shadow="never">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-select v-model="selectedStudentId" placeholder="全部学生" clearable @change="loadRecords">
              <el-option
                v-for="student in studentOptions"
                :key="student.id"
                :label="student.name"
                :value="student.id"
              />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="selectedSubModule" placeholder="全部类型" clearable @change="loadRecords">
              <el-option label="情绪与场景" value="emotion_scene" />
              <el-option label="表达关心" value="care_scene" />
            </el-select>
          </el-col>
          <el-col :span="10">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="loadRecords"
            />
          </el-col>
        </el-row>
      </el-card>

      <el-card class="table-card" shadow="never">
        <el-table :data="recordList" v-loading="loading" stripe>
          <el-table-column prop="studentName" label="学生" width="120" />
          <el-table-column prop="resourceName" label="训练场景" min-width="180" />
          <el-table-column label="类型" width="140">
            <template #default="{ row }">
              <el-tag :type="row.subModule === 'emotion_scene' ? 'success' : 'warning'">
                {{ row.subModule === 'emotion_scene' ? '情绪与场景' : '表达关心' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="训练时长" width="120">
            <template #default="{ row }">
              {{ formatDuration(row.durationMs) }}
            </template>
          </el-table-column>
          <el-table-column prop="questionCount" label="总题数" width="100" />
          <el-table-column label="正确率" width="120">
            <template #default="{ row }">
              {{ Math.round(row.accuracyRate * 100) }}%
            </template>
          </el-table-column>
          <el-table-column label="平均提示层级" width="140">
            <template #default="{ row }">
              {{ row.averageHintLevel }}
            </template>
          </el-table-column>
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="goToReport(row.studentId)">
                查看报告
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!loading && recordList.length === 0" description="暂无情绪模块训练记录" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EmotionalTrainingAPI, type EmotionalSessionRecordItem } from '@/database/emotional-api'

const route = useRoute()
const router = useRouter()
const api = new EmotionalTrainingAPI()

const inheritedQuery = computed(() => ({ ...route.query }))
const selectedStudentId = ref<number | undefined>(
  Number(Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId || 0) || undefined
)
const selectedSubModule = ref<string>('')
const dateRange = ref<[string, string] | null>(null)
const studentOptions = ref<Array<{ id: number; name: string }>>([])
const recordList = ref<EmotionalSessionRecordItem[]>([])
const loading = ref(false)

const averageAccuracy = computed(() => {
  if (recordList.value.length === 0) return 0
  const total = recordList.value.reduce((sum, item) => sum + item.accuracyRate, 0)
  return Math.round((total / recordList.value.length) * 100)
})

const averageHintLevel = computed(() => {
  if (recordList.value.length === 0) return 0
  const total = recordList.value.reduce((sum, item) => sum + item.averageHintLevel, 0)
  return (total / recordList.value.length).toFixed(1)
})

const totalDurationLabel = computed(() => {
  const total = recordList.value.reduce((sum, item) => sum + item.durationMs, 0)
  return formatDuration(total)
})

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  }
  return `${seconds}秒`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goToMenu() {
  router.push({
    path: '/emotional/menu',
    query: inheritedQuery.value,
  })
}

function goToReport(studentId: number) {
  router.push({
    path: '/emotional/report',
    query: {
      ...inheritedQuery.value,
      studentId: String(studentId),
    },
  })
}

function loadStudentOptions() {
  studentOptions.value = api.getStudentsWithEmotionalSessions()
}

function loadRecords() {
  loading.value = true
  try {
    recordList.value = api.getRecordList({
      studentId: selectedStudentId.value,
      subModule: selectedSubModule.value || undefined,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1] ? `${dateRange.value[1]} 23:59:59` : undefined,
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStudentOptions()
  loadRecords()
})
</script>

<style scoped>
.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.main-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row {
  margin-bottom: 4px;
}

.summary-card,
.filter-card,
.table-card {
  border-radius: 20px;
}

.summary-label {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  color: #303133;
}
</style>
