<!-- 器材训练记录页面 -->
<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>器材训练记录</h1>
        <p class="subtitle">查看学生的器材训练历史与表现</p>
      </div>
      <div class="header-right">
        <el-button type="success" :icon="Document" @click="exportAllIEP" :disabled="!studentId || records.length === 0">
          导出报告
        </el-button>
        <el-button type="primary" :icon="Plus" @click="goToQuickEntry" :disabled="!studentId">
          新增记录
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select
            v-model="studentId"
            placeholder="选择学生"
            clearable
            filterable
            @change="onStudentChange"
            style="width: 100%"
          >
            <el-option
              v-for="student in validStudents"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select
            v-model="filters.category"
            placeholder="选择分类"
            clearable
            @change="loadRecords"
            :disabled="!studentId"
            style="width: 100%"
          >
            <el-option label="全部分类" value="" />
            <el-option label="触觉系统" value="tactile" />
            <el-option label="嗅觉系统" value="olfactory" />
            <el-option label="视觉系统" value="visual" />
            <el-option label="听觉系统" value="auditory" />
            <el-option label="味觉系统" value="gustatory" />
            <el-option label="本体觉系统" value="proprioceptive" />
            <el-option label="感官综合" value="integration" />
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="loadRecords"
            :disabled="!studentId"
            style="width: 100%"
          />
        </el-col>
        <el-col :span="4">
          <el-button :icon="Refresh" @click="resetFilters" :disabled="!studentId">重置筛选</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 未选择学生提示 -->
    <div v-if="!studentId" class="empty-student">
      <el-empty description="请先选择学生查看训练记录" :image-size="200">
        <template #image>
          <el-icon :size="120" color="#c0c4cc"><User /></el-icon>
        </template>
      </el-empty>
    </div>

    <!-- 记录列表 -->
    <div v-else v-loading="loading" class="records-list">
      <el-card
        v-for="record in records"
        :key="record.id"
        class="record-card"
        shadow="hover"
      >
        <div class="record-header">
          <div class="equipment-info">
            <img :src="getEquipmentImage(record)" :alt="record.equipment_name" class="equipment-icon" />
            <div>
              <div class="equipment-name">{{ record.equipment_name }}</div>
              <div class="equipment-meta">
                <el-tag size="small" :type="getCategoryTagType(record.category)">
                  {{ getCategoryLabel(record.category) }}
                </el-tag>
                <span class="record-date">{{ formatDate(record.training_date) }}</span>
              </div>
            </div>
          </div>
          <div class="score-display">
            <el-rate
              :model-value="record.score"
              disabled
              show-score
              :colors="['#f56c6c', '#e6a23c', '#67c23a']"
            />
            <div class="prompt-level">{{ getPromptLevelLabel(record.prompt_level) }}</div>
          </div>
        </div>

        <div v-if="record.notes" class="record-notes">
          <el-icon><Document /></el-icon>
          <span>{{ record.notes }}</span>
        </div>

        <div class="record-actions">
          <el-button text type="primary" :icon="Document" @click="viewIEP(record)">
            查看评语
          </el-button>
          <el-button text type="danger" :icon="Delete" @click="deleteRecord(record)">
            删除
          </el-button>
        </div>
      </el-card>

      <el-empty
        v-if="!loading && records.length === 0"
        description="暂无训练记录"
        :image-size="200"
      >
        <el-button type="primary" @click="goToQuickEntry">新增记录</el-button>
      </el-empty>
    </div>

    <!-- IEP 评语对话框 -->
    <el-dialog
      v-model="iepDialogVisible"
      title="IEP 训练评语"
      width="600px"
    >
      <div v-loading="generatingIEP" class="iep-content">
        <div class="iep-section">
          <h4>表现评估</h4>
          <p>{{ currentIEP.performance }}</p>
        </div>
        <div class="iep-section">
          <h4>训练建议</h4>
          <ul>
            <li v-for="suggestion in currentIEP.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
        <el-divider />
        <div class="iep-section">
          <h4>完整评语</h4>
          <p class="full-comment">{{ currentIEP.generatedComment }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="iepDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportIEP">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Document, Delete, User } from '@element-plus/icons-vue'
import type { EquipmentTrainingRecordWithEquipment } from '@/types/equipment'
import type { EquipmentCategory } from '@/types/equipment'
import { EquipmentTrainingAPI, StudentAPI } from '@/database/api'
import { IEPGenerator } from '@/utils/iep-generator'
import { getEquipmentDomainName } from '@/utils/iep-templates'
import { exportEquipmentIEPToWord, type EquipmentIEPExportData } from '@/utils/docxExporter'
import { getEquipmentImageUrl } from '@/assets/images/equipment/images'

const route = useRoute()
const router = useRouter()

// 类型定义
interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
  student_no?: string
  disorder?: string
  avatar_path?: string
}

// 状态
const studentId = ref<number | null>(null)
const students = ref<Student[]>([])
const loading = ref(false)
const records = ref<EquipmentTrainingRecordWithEquipment[]>([])
const studentInfo = ref<Student | null>(null)
const filters = reactive({
  category: '',
  dateRange: null as [string, string] | null
})

// IEP 对话框
const iepDialogVisible = ref(false)
const generatingIEP = ref(false)
const currentIEP = ref<any>(null)

// 过滤有效的学生
const validStudents = computed(() => {
  return students.value.filter((student) =>
    student &&
    typeof student === 'object' &&
    student.id != null &&
    student.name
  )
})

// 获取分类标签
const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    tactile: '触觉',
    olfactory: '嗅觉',
    visual: '视觉',
    auditory: '听觉',
    gustatory: '味觉',
    proprioceptive: '本体觉',
    integration: '感官综合'
  }
  return labels[category] || category
}

// 获取分类标签类型
const getCategoryTagType = (category: string) => {
  const types: Record<string, any> = {
    tactile: 'danger',
    olfactory: 'success',
    visual: 'primary',
    auditory: 'warning',
    gustatory: 'info',
    proprioceptive: '',
    integration: 'success'
  }
  return types[category] || ''
}

// 获取辅助等级标签
const getPromptLevelLabel = (level: number) => {
  const labels: Record<number, string> = {
    1: '独立完成',
    2: '口头提示',
    3: '视觉提示',
    4: '手触引导',
    5: '身体辅助'
  }
  return labels[level] || ''
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取器材图片 URL
const getEquipmentImage = (record: EquipmentTrainingRecordWithEquipment) => {
  const id = record.legacy_id || record.equipment_id
  return getEquipmentImageUrl(record.category as EquipmentCategory, id, record.equipment_name)
}

// 加载学生列表
const loadStudents = async () => {
  try {
    const api = new StudentAPI()
    students.value = await api.getAllStudents()
  } catch (error: any) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

// 加载学生信息
const loadStudentInfo = async () => {
  if (!studentId.value) {
    studentInfo.value = null
    return
  }

  try {
    const api = new StudentAPI()
    studentInfo.value = await api.getStudentById(studentId.value)
  } catch (error: any) {
    console.error('加载学生信息失败:', error)
    studentInfo.value = null
  }
}

// 学生选择变化
const onStudentChange = (newStudentId: number | null) => {
  // 关键修复：用新的学生ID更新路由，保持状态一致性
  if (newStudentId) {
    router.replace({
      name: 'EquipmentRecords',
      params: { studentId: newStudentId }
    })
    // loadRecords() 会由 watch(route.params.studentId) 自动触发
  } else {
    // 清空选择，跳转到无参数的页面
    router.replace({ name: 'EquipmentRecords', params: {} })
  }
}

// 加载记录
const loadRecords = async () => {
  if (!studentId.value) {
    records.value = []
    return
  }

  loading.value = true
  try {
    const api = new EquipmentTrainingAPI()
    const data = api.getStudentRecords(studentId.value)

    // 解析 ability_tags JSON 字符串为数组
    const parsedData = data.map(record => ({
      ...record,
      ability_tags: record.ability_tags ? JSON.parse(record.ability_tags) : []
    }))

    // 应用筛选
    let filtered = parsedData
    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category)
    }
    if (filters.dateRange) {
      const [start, end] = filters.dateRange
      filtered = filtered.filter(r => {
        const date = r.training_date.split('T')[0]
        return date >= start && date <= end
      })
    }

    // 按日期倒序排列
    records.value = filtered.sort((a, b) =>
      new Date(b.training_date).getTime() - new Date(a.training_date).getTime()
    )
  } catch (error: any) {
    ElMessage.error('加载记录失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 重置筛选
const resetFilters = () => {
  filters.category = ''
  filters.dateRange = null
  loadRecords()
}

// 确保 ability_tags 是数组类型
const ensureArray = (value: any): string[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// 查看 IEP
const viewIEP = async (record: EquipmentTrainingRecordWithEquipment) => {
  generatingIEP.value = true
  iepDialogVisible.value = true
  currentIEP.value = null

  try {
    const report = IEPGenerator.generateEquipmentReport({
      studentName: record.student_name || '学生',
      equipment: {
        id: record.equipment_id,
        name: record.equipment_name,
        category: record.category,
        sub_category: record.sub_category,
        description: record.description || '',
        ability_tags: ensureArray(record.ability_tags)
      },
      score: record.score,
      promptLevel: record.prompt_level,
      duration_seconds: record.duration_seconds,
      training_date: record.training_date,
      notes: record.notes
    })

    currentIEP.value = report
  } catch (error: any) {
    ElMessage.error('生成评语失败：' + error.message)
    currentIEP.value = {
      performance: '生成评语时出错',
      suggestions: [],
      generatedComment: '暂时无法生成评语，请稍后重试'
    }
  } finally {
    generatingIEP.value = false
  }
}

// 导出所有记录的 IEP 报告
const exportAllIEP = async () => {
  if (records.value.length === 0) {
    ElMessage.warning('暂无记录可导出')
    return
  }

  if (!studentInfo.value) {
    ElMessage.warning('学生信息加载中，请稍后重试')
    return
  }

  try {
    ElMessage.info('正在生成报告...')

    // 计算分类统计
    const categoryBreakdown: Record<string, number> = {}
    records.value.forEach(r => {
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1
    })

    // 计算平均分
    const totalScore = records.value.reduce((sum, r) => sum + r.score, 0)
    const averageScore = records.value.length > 0 ? totalScore / records.value.length : 0

    // 计算年龄
    const calculateAge = (birthday: string) => {
      if (!birthday) return 0
      const birth = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    // 准备导出数据
    const exportData: EquipmentIEPExportData = {
      student: {
        name: studentInfo.value.name,
        gender: studentInfo.value.gender === '男' ? '男' : '女',
        age: calculateAge(studentInfo.value.birthday),
        birthday: studentInfo.value.birthday
      },
      reportDate: new Date().toLocaleDateString('zh-CN'),
      records: await Promise.all(records.value.map(async (record) => {
        const report = IEPGenerator.generateEquipmentReport({
          studentName: record.student_name || '学生',
          equipment: {
            id: record.equipment_id,
            name: record.equipment_name,
            category: record.category,
            sub_category: record.sub_category,
            description: record.description || '',
            ability_tags: ensureArray(record.ability_tags)
          },
          score: record.score,
          promptLevel: record.prompt_level,
          duration_seconds: record.duration_seconds,
          training_date: record.training_date,
          notes: record.notes
        })

        return {
          equipmentName: record.equipment_name,
          categoryName: getCategoryLabel(record.category),
          score: record.score,
          promptLevel: getPromptLevelLabel(record.prompt_level),
          trainingDate: new Date(record.training_date).toLocaleDateString('zh-CN'),
          notes: record.notes,
          performance: report.performance,
          suggestions: report.suggestions
        }
      })),
      summary: {
        totalRecords: records.value.length,
        categoryBreakdown,
        averageScore
      }
    }

    // 生成文件名
    const filename = `${studentInfo.value.name}_器材训练IEP报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`

    // 导出 Word
    await exportEquipmentIEPToWord(exportData, filename)

    ElMessage.success('报告导出成功')
  } catch (error: any) {
    ElMessage.error('导出失败：' + error.message)
  }
}

// 导出当前查看的单条记录 IEP
const exportIEP = async () => {
  if (!currentIEP.value || !studentInfo.value) {
    ElMessage.warning('请先选择一条记录查看评语')
    return
  }

  try {
    ElMessage.info('正在生成报告...')

    // 计算分类统计
    const categoryBreakdown: Record<string, number> = {}
    records.value.forEach(r => {
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1
    })

    // 计算平均分
    const totalScore = records.value.reduce((sum, r) => sum + r.score, 0)
    const averageScore = records.value.length > 0 ? totalScore / records.value.length : 0

    // 计算年龄
    const calculateAge = (birthday: string) => {
      if (!birthday) return 0
      const birth = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    // 准备导出数据 - 导出所有筛选后的记录
    const exportData: EquipmentIEPExportData = {
      student: {
        name: studentInfo.value.name,
        gender: studentInfo.value.gender === '男' ? '男' : '女',
        age: calculateAge(studentInfo.value.birthday),
        birthday: studentInfo.value.birthday
      },
      reportDate: new Date().toLocaleDateString('zh-CN'),
      records: await Promise.all(records.value.map(async (record) => {
        const report = IEPGenerator.generateEquipmentReport({
          studentName: record.student_name || '学生',
          equipment: {
            id: record.equipment_id,
            name: record.equipment_name,
            category: record.category,
            sub_category: record.sub_category,
            description: record.description || '',
            ability_tags: ensureArray(record.ability_tags)
          },
          score: record.score,
          promptLevel: record.prompt_level,
          duration_seconds: record.duration_seconds,
          training_date: record.training_date,
          notes: record.notes
        })

        return {
          equipmentName: record.equipment_name,
          categoryName: getCategoryLabel(record.category),
          score: record.score,
          promptLevel: getPromptLevelLabel(record.prompt_level),
          trainingDate: new Date(record.training_date).toLocaleDateString('zh-CN'),
          notes: record.notes,
          performance: report.performance,
          suggestions: report.suggestions
        }
      })),
      summary: {
        totalRecords: records.value.length,
        categoryBreakdown,
        averageScore
      }
    }

    // 生成文件名
    const filename = `${studentInfo.value.name}_器材训练IEP报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`

    // 导出 Word
    await exportEquipmentIEPToWord(exportData, filename)

    ElMessage.success('报告导出成功')
    iepDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error('导出失败：' + error.message)
  }
}

// 删除记录
const deleteRecord = async (record: EquipmentTrainingRecordWithEquipment) => {
  try {
    await ElMessageBox.confirm('确定要删除这条训练记录吗？', '提示', {
      type: 'warning'
    })

    const api = new EquipmentTrainingAPI()
    api.deleteRecord(record.id)
    ElMessage.success('删除成功')
    loadRecords()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

// 导航
const goToQuickEntry = () => {
  if (!studentId.value) return
  router.push(`/equipment/quick-entry/${studentId.value}`)
}

onMounted(async () => {
  // 加载学生列表
  await loadStudents()

  // 从路由参数获取学生 ID
  const paramStudentId = route.params.studentId
  if (paramStudentId) {
    studentId.value = parseInt(paramStudentId as string)
    await loadStudentInfo()
    loadRecords()
  }
})

// 监听路由参数变化，自动加载记录
watch(
  () => route.params.studentId,
  async (newStudentId) => {
    if (newStudentId) {
      const id = parseInt(newStudentId as string)
      // 只有当 studentId 真正变化时才更新
      if (studentId.value !== id) {
        studentId.value = id
        await loadStudentInfo()
        loadRecords()
      }
    } else {
      // 路由参数被清空
      studentId.value = null
      studentInfo.value = null
      records.value = []
    }
  }
)
</script>

<style scoped>
/* 未选择学生提示 */
.empty-student {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  padding: 60px;
}

/* 筛选区域下拉框宽度 */
.filter-section :deep(.el-select) {
  width: 100%;
}

/* 记录列表 */
.records-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-card {
  border-radius: 8px;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.equipment-info {
  display: flex;
  gap: 12px;
  flex: 1;
}

.equipment-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
}

.equipment-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
}

.equipment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #909399;
}

.score-display {
  text-align: right;
}

.prompt-level {
  font-size: 12px;
  color: #67c23a;
  margin-top: 4px;
}

.record-notes {
  display: flex;
  gap: 8px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
}

.iep-content h4 {
  color: #303133;
  margin-bottom: 8px;
}

.iep-section {
  margin-bottom: 20px;
}

.iep-section p {
  color: #606266;
  line-height: 1.8;
}

.iep-section ul {
  list-style: none;
  padding: 0;
}

.iep-section ul li {
  color: #606266;
  line-height: 1.8;
  padding-left: 20px;
  position: relative;
}

.iep-section ul li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: #409eff;
}

.full-comment {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  line-height: 1.8;
}
</style>
