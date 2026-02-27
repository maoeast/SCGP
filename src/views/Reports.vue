<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>报告生成</h1>
        <p class="subtitle">查看和管理评估报告，支持导出PDF</p>
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

    <!-- 筛选区域 -->
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
              <el-option label="S-M量表评估报告" value="sm" />
              <el-option label="WeeFIM量表评估报告" value="weefim" />
              <el-option label="CSIRS感觉统合评估报告" value="csirs" />
              <el-option label="Conners父母问卷报告(PSQ)" value="conners-psq" />
              <el-option label="Conners教师问卷报告(TRS)" value="conners-trs" />
              <el-option label="IEP评估报告" value="iep" />
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

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon blue">
              <i class="fas fa-file-lines"></i>
            </div>
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
            <div class="stat-icon orange">
              <i class="fas fa-clipboard-check"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.sm_count }}</div>
              <div class="stat-label">S-M评估</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon green">
              <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.weefim_count }}</div>
              <div class="stat-label">WeeFIM评估</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon pink">
              <i class="fas fa-puzzle-piece"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.csirs_count || 0 }}</div>
              <div class="stat-label">CSIRS评估</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon purple">
              <i class="fas fa-child"></i>
            </div>
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
            <div class="stat-icon indigo">
              <i class="fas fa-chalkboard-user"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.conners_trs_count || 0 }}</div>
              <div class="stat-label">Conners TRS</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 报告列表 -->
    <el-card class="report-list-card">
      <template #header>
        <div class="list-header">
          <span>报告列表</span>
          <el-tag type="info">共 {{ reportList.length }} 条记录</el-tag>
        </div>
      </template>

      <el-table
        :data="reportList"
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="报告标题" min-width="250" />
        <el-table-column label="学生姓名" width="120">
          <template #default="scope">
            {{ scope.row.student_name }}
          </template>
        </el-table-column>
        <el-table-column label="报告类型" width="150">
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
            <el-button
              type="primary"
              size="small"
              @click="viewReport(scope.row)"
            >
              <i class="fas fa-eye"></i> 查看
            </el-button>
            <el-button
              type="success"
              size="small"
              @click="downloadReport(scope.row)"
            >
              <i class="fas fa-download"></i> 下载
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="deleteReport(scope.row)"
            >
              <i class="fas fa-trash"></i> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty
        v-if="!loading && reportList.length === 0"
        description="暂无报告记录"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { ReportAPI } from '@/database/api'

const router = useRouter()
const studentStore = useStudentStore()

// 筛选条件
const filters = ref({
  student_id: '',
  report_type: ''
})

const dateRange = ref<[string, string] | null>(null)

// 数据
const students = ref<any[]>([])
const reportList = ref<any[]>([])
const statistics = ref({
  total: 0,
  sm_count: 0,
  weefim_count: 0,
  csirs_count: 0,
  conners_psq_count: 0,
  conners_trs_count: 0,
  iep_count: 0,
  training_count: 0
})
const loading = ref(false)
const migrating = ref(false)

// 获取报告类型标签类型
const getReportTypeTagType = (type: string) => {
  const typeMap: Record<string, any> = {
    'sm': 'warning',
    'weefim': 'success',
    'csirs': 'danger',
    'conners-psq': 'primary',
    'conners-trs': 'info',
    'iep': 'danger',
    'training': 'primary'
  }
  return typeMap[type] || 'info'
}

// 获取报告类型名称
const getReportTypeName = (type: string) => {
  const nameMap: Record<string, string> = {
    'sm': 'S-M量表评估报告',
    'weefim': 'WeeFIM量表评估报告',
    'csirs': 'CSIRS感觉统合评估报告',
    'conners-psq': 'Conners父母问卷报告(PSQ)',
    'conners-trs': 'Conners教师问卷报告(TRS)',
    'iep': 'IEP评估报告',
    'training': '训练报告'
  }
  return nameMap[type] || '未知类型'
}

// 格式化日期
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

// 加载学生列表
const loadStudents = async () => {
  try {
    await studentStore.loadStudents()
    students.value = studentStore.students
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

// 加载报告列表
const loadReports = async () => {
  loading.value = true
  try {
    const api = new ReportAPI()

    // 构建筛选条件
    const params: any = {}
    if (filters.value.student_id) {
      params.student_id = filters.value.student_id
    }
    if (filters.value.report_type) {
      params.report_type = filters.value.report_type
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1] + ' 23:59:59'
    }

    // 获取报告列表
    reportList.value = api.getReportList(params)

    // 获取统计
    const statsParams = filters.value.student_id ? { student_id: filters.value.student_id } : undefined
    statistics.value = api.getReportStatistics(statsParams?.student_id)

    console.log('报告列表已加载:', reportList.value.length)
  } catch (error) {
    console.error('加载报告列表失败:', error)
    ElMessage.error('加载报告列表失败')
  } finally {
    loading.value = false
  }
}

// 筛选处理
const handleFilter = () => {
  loadReports()
}

// 查看报告
const viewReport = (report: any) => {
  const routeMap: Record<string, string> = {
    'sm': `/assessment/sm/report?assessId=${report.assess_id}&studentId=${report.student_id}`,
    'weefim': `/assessment/weefim/report?assessId=${report.assess_id}&studentId=${report.student_id}`,
    'csirs': `/assessment/csirs/report/${report.assess_id}`,
    'conners-psq': `/assessment/conners-psq/report/${report.assess_id}`,
    'conners-trs': `/assessment/conners-trs/report/${report.assess_id}`,
    'iep': `/games/report?recordId=${report.training_record_id}&studentId=${report.student_id}`,
    'training': `/training/plans/${report.plan_id}` // 训练报告暂时跳转到计划详情
  }

  const route = routeMap[report.report_type]
  if (route) {
    router.push(route)
  } else {
    ElMessage.warning('该类型报告暂未实现')
  }
}

// 下载报告
const downloadReport = (report: any) => {
  // 打开新窗口查看报告,用户可以在报告页面下载
  viewReport(report)
  ElMessage.info('请在报告页面点击"导出PDF"或"导出Word"按钮下载报告')
}

// 删除报告
const deleteReport = async (report: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除报告"${report.title}"吗？`,
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

// 迁移历史数据
const migrateData = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将为所有已有的评估记录创建对应的报告记录。\n\n' +
      '• 支持的量表：S-M、WeeFIM、CSIRS、Conners PSQ、Conners TRS\n' +
      '• 只会迁移没有报告记录的评估数据\n' +
      '• 迁移后可以在报告列表中查看和导出\n' +
      '• 这是一个安全操作，不会删除任何数据',
      '迁移历史数据',
      {
        confirmButtonText: '开始迁移',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )

    migrating.value = true

    const api = new ReportAPI()
    const result = api.migrateAssessmentRecordsToReportRecords()

    if (result.total > 0) {
      const msg = [
        '数据迁移完成！',
        `S-M评估: ${result.sm_migrated} 条`,
        `WeeFIM评估: ${result.weefim_migrated} 条`,
        `CSIRS评估: ${result.csirs_migrated} 条`,
        `Conners PSQ: ${result.conners_psq_migrated} 条`,
        `Conners TRS: ${result.conners_trs_migrated} 条`,
        `总计: ${result.total} 条`
      ].join('\n')
      ElMessage.success(msg)
      // 刷新报告列表
      await loadReports()
    } else {
      ElMessage.info('没有需要迁移的数据')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('数据迁移失败:', error)
      ElMessage.error('数据迁移失败')
    }
  } finally {
    migrating.value = false
  }
}

// 初始化
onMounted(async () => {
  await loadStudents()
  await loadReports()
})
</script>

<style scoped>
/* 筛选项 */
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

.stat-card {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
