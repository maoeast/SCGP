<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h1>报告中心</h1>
        <p class="subtitle">查看和管理评估、训练与情绪模块报告。</p>
      </div>
      <div class="header-right">
        <el-button
          type="warning"
          :icon="RefreshRight"
          @click="migrateData"
          :loading="migrating"
        >
          {{ migrating ? '迁移中...' : '迁移历史数据' }}
        </el-button>
      </div>
    </div>

    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="filter-item">
            <label>学生：</label>
            <el-select
              v-model="filters.student_id"
              placeholder="全部学生"
              clearable
              @change="handleFilter"
            >
              <el-option
                v-for="student in students"
                :key="student.id"
                :label="student.name"
                :value="student.id"
              />
            </el-select>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="filter-item">
            <label>报告类型：</label>
            <el-select
              v-model="filters.report_type"
              placeholder="全部类型"
              clearable
              @change="handleFilter"
            >
              <el-option label="S-M 评估报告" value="sm" />
              <el-option label="WeeFIM 评估报告" value="weefim" />
              <el-option label="CSIRS 评估报告" value="csirs" />
              <el-option label="Conners PSQ 报告" value="conners-psq" />
              <el-option label="Conners TRS 报告" value="conners-trs" />
              <el-option label="SDQ 评估报告" value="sdq" />
              <el-option label="SRS-2 评估报告" value="srs2" />
              <el-option label="CBCL 评估报告" value="cbcl" />
              <el-option label="情绪行为调节模块报告" value="emotional" />
              <el-option label="IEP 报告" value="iep" />
              <el-option label="训练报告" value="training" />
            </el-select>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="filter-item">
            <label>时间范围：</label>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="handleFilter"
            />
          </div>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleFilter">
            <i class="fas fa-search"></i> 查询
          </el-button>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon blue"><i class="fas fa-file-lines"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.total }}</div>
              <div class="stat-label">报告总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon orange"><i class="fas fa-clipboard-check"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.sm_count }}</div>
              <div class="stat-label">S-M</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon green"><i class="fas fa-chart-line"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.weefim_count }}</div>
              <div class="stat-label">WeeFIM</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pink"><i class="fas fa-puzzle-piece"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.csirs_count || 0 }}</div>
              <div class="stat-label">CSIRS</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon purple"><i class="fas fa-child"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.conners_psq_count || 0 }}</div>
              <div class="stat-label">Conners PSQ</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon indigo"><i class="fas fa-chalkboard-user"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.conners_trs_count || 0 }}</div>
              <div class="stat-label">Conners TRS</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="stats-row secondary-stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon amber"><i class="fas fa-face-smile"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.sdq_count }}</div>
              <div class="stat-label">SDQ</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon cyan"><i class="fas fa-people-arrows"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.srs2_count }}</div>
              <div class="stat-label">SRS-2</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon teal"><i class="fas fa-brain"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.cbcl_count }}</div>
              <div class="stat-label">CBCL</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon emerald"><i class="fas fa-heart-circle-check"></i></div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.emotional_count }}</div>
              <div class="stat-label">情绪模块</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="report-list-card">
      <template #header>
        <div class="list-header">
          <span>报告列表</span>
          <el-tag type="info">共 {{ reportList.length }} 条记录</el-tag>
        </div>
      </template>

      <el-table :data="reportList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="报告标题" min-width="250" />
        <el-table-column label="学生姓名" width="120">
          <template #default="scope">
            {{ scope.row.student_name }}
          </template>
        </el-table-column>
        <el-table-column label="报告类型" width="170">
          <template #default="scope">
            <el-tag :type="getReportTypeTagType(scope.row.report_type)">
              {{ getReportTypeName(scope.row.report_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="viewReport(scope.row)">
              <i class="fas fa-eye"></i> 查看
            </el-button>
            <el-button type="success" size="small" @click="downloadReport(scope.row)">
              <i class="fas fa-download"></i> 下载
            </el-button>
            <el-button type="danger" size="small" @click="deleteReport(scope.row)">
              <i class="fas fa-trash"></i> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-if="!loading && reportList.length === 0"
        description="暂无报告记录"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { ReportAPI } from '@/database/api'

const router = useRouter()
const studentStore = useStudentStore()

const filters = ref({
  student_id: '',
  report_type: ''
})

const dateRange = ref<[string, string] | null>(null)

const students = ref<any[]>([])
const reportList = ref<any[]>([])
const statistics = ref({
  total: 0,
  sm_count: 0,
  weefim_count: 0,
  csirs_count: 0,
  conners_psq_count: 0,
  conners_trs_count: 0,
  sdq_count: 0,
  srs2_count: 0,
  cbcl_count: 0,
  emotional_count: 0,
  iep_count: 0,
  training_count: 0
})
const loading = ref(false)
const migrating = ref(false)

const getReportTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    sm: 'warning',
    weefim: 'success',
    csirs: 'danger',
    'conners-psq': 'primary',
    'conners-trs': 'info',
    sdq: 'warning',
    srs2: 'primary',
    cbcl: 'success',
    emotional: 'warning',
    iep: 'danger',
    training: 'primary'
  }
  return typeMap[type] || 'info'
}

const getReportTypeName = (type: string) => {
  const nameMap: Record<string, string> = {
    sm: 'S-M 评估报告',
    weefim: 'WeeFIM 评估报告',
    csirs: 'CSIRS 评估报告',
    'conners-psq': 'Conners PSQ 报告',
    'conners-trs': 'Conners TRS 报告',
    sdq: 'SDQ 评估报告',
    srs2: 'SRS-2 评估报告',
    cbcl: 'CBCL 评估报告',
    emotional: '情绪行为调节模块报告',
    iep: 'IEP 报告',
    training: '训练报告'
  }
  return nameMap[type] || '未知类型'
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadStudents = async () => {
  try {
    await studentStore.loadStudents()
    students.value = studentStore.students
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

const loadReports = async () => {
  loading.value = true
  try {
    const api = new ReportAPI()

    const params: any = {}
    if (filters.value.student_id) {
      params.student_id = filters.value.student_id
    }
    if (filters.value.report_type) {
      params.report_type = filters.value.report_type
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = `${dateRange.value[1]} 23:59:59`
    }

    reportList.value = api.getReportList(params)
    const selectedStudentId = filters.value.student_id ? Number(filters.value.student_id) : undefined
    statistics.value = api.getReportStatistics(selectedStudentId)
  } catch (error) {
    console.error('加载报告列表失败:', error)
    ElMessage.error('加载报告列表失败')
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  loadReports()
}

const viewReport = (report: any) => {
  const routeMap: Record<string, string> = {
    sm: `/assessment/sm/report?assessId=${report.assess_id}&studentId=${report.student_id}`,
    weefim: `/assessment/weefim/report?assessId=${report.assess_id}&studentId=${report.student_id}`,
    csirs: `/assessment/csirs/report/${report.assess_id}`,
    'conners-psq': `/assessment/conners-psq/report/${report.assess_id}`,
    'conners-trs': `/assessment/conners-trs/report/${report.assess_id}`,
    sdq: `/assessment/sdq/report/${report.assess_id}`,
    srs2: `/assessment/srs2/report/${report.assess_id}`,
    cbcl: `/assessment/cbcl/report/${report.assess_id}`,
    emotional: `/emotional/report?studentId=${report.student_id}&reportId=${report.id}`,
    iep: `/games/report?recordId=${report.training_record_id}&studentId=${report.student_id}`,
    training: `/training/plans/${report.plan_id}`,
  }

  const target = routeMap[report.report_type]
  if (target) {
    router.push(target)
    return
  }
  ElMessage.warning('该类型报告暂未实现')
}

const downloadReport = (report: any) => {
  viewReport(report)
  ElMessage.info('请在报告页面执行下载或导出操作')
}

const deleteReport = async (report: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除报告“${report.title}”吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const api = new ReportAPI()
    api.deleteReportRecord(report.id)
    ElMessage.success('删除成功')
    loadReports()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除报告失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const migrateData = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将为历史评估数据创建对应的报告记录，不会删除已有数据。',
      '迁移历史数据',
      {
        confirmButtonText: '开始迁移',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    migrating.value = true
    const api = new ReportAPI()
    const result = api.migrateAssessmentRecordsToReportRecords()

    if (result.total > 0) {
      ElMessage.success(`历史数据迁移完成，共处理 ${result.total} 条记录`)
      await loadReports()
    } else {
      ElMessage.info('没有需要迁移的数据')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('迁移数据失败:', error)
      ElMessage.error('迁移失败')
    }
  } finally {
    migrating.value = false
  }
}

onMounted(async () => {
  await loadStudents()
  await loadReports()
})
</script>

<style scoped>
.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-item label {
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.stats-row {
  margin-top: 0;
}

.secondary-stats-row {
  margin-top: 20px;
}

.stat-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.orange {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.green {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.teal {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.pink {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-icon.indigo {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.amber {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.stat-icon.cyan {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
}

.stat-icon.emerald {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.report-list-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-button i) {
  font-size: 12px;
}
</style>
