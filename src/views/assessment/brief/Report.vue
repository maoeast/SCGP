<!-- src/views/assessment/brief/Report.vue -->
<template>
  <div class="brief-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>BRIEF 执行功能问卷评估报告<el-tag size="small" type="warning" class="draft-tag">自编 DRAFT</el-tag></h2>
          </div>
          <div class="header-actions">
            <el-button :icon="Clock" @click="viewHistory">查看历史</el-button>
          </div>
        </div>
      </template>

      <div class="overview" v-if="assessData">
        <div class="score-item">
          <div class="score-label">全局执行复合 T 分</div>
          <div class="score-value">{{ assessData.total_t_score ?? 50 }}</div>
          <div class="score-range">均值 50，标准差 10</div>
          <div class="score-level">{{ assessData.level }}</div>
        </div>
        <div class="score-item">
          <div class="score-label">原始总分</div>
          <div class="score-value">{{ assessData.total_raw_score ?? 0 }}</div>
          <div class="score-range">版本：{{ versionLabel }}</div>
        </div>
      </div>
    </el-card>

    <el-card v-if="dimensionRows.length" class="dimension-card">
      <template #header><h3>维度 T 分详情</h3></template>
      <el-table :data="dimensionRows" style="width: 100%">
        <el-table-column prop="name" label="维度" width="180" />
        <el-table-column prop="rawScore" label="原始分" width="100" align="center" />
        <el-table-column prop="tScore" label="T 分" width="100" align="center">
          <template #default="{ row }">
            <span :class="getTClass(row.tScore)">{{ row.tScore }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="levelName" label="等级" width="140" align="center" />
      </el-table>
    </el-card>

    <el-card class="disclaimer">
      <div class="disclaimer-content">
        <el-icon><WarningFilled /></el-icon>
        <p>
          <strong>重要提示：</strong>本量表为「自编题目 + 占位常模」的草稿版，结果仅供教育支持与发展监测参考，
          不能作为医学诊断依据。如结果提示显著风险，请前往正规医院发育行为儿科或精神心理科就诊。
        </p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, WarningFilled, Clock } from '@element-plus/icons-vue'
import { BRIEFAssessmentAPI } from '@/database/api'
import { openAiAssistant } from '@/features/ai/assistant-launcher'

const route = useRoute()
const router = useRouter()
const assessData = ref<any>(null)

const versionLabel = computed(() => {
  const v = assessData.value?.version
  return v === 'preschool' ? '学前版 BRIEF-P' : v === 'school' ? '学龄版 BRIEF-2' : '—'
})

const dimensionRows = computed(() => {
  const raw = assessData.value?.dimension_scores
  if (!raw) return []
  try {
    const obj = JSON.parse(raw) as Record<string, {
      name: string
      rawScore: number
      tScore: number
      levelName?: string
    }>
    return Object.entries(obj).map(([code, v]) => ({
      code,
      name: v.name,
      rawScore: v.rawScore,
      tScore: v.tScore,
      levelName: v.levelName ?? '',
    }))
  } catch {
    return []
  }
})

function getTClass(t: number): string {
  if (t >= 65) return 't-high'
  if (t >= 60) return 't-elevated'
  return 't-typical'
}

function goBack() {
  router.back()
}

const viewHistory = () => {
  if (assessData.value?.student_id) {
    router.push(`/assessment/brief/trend/${assessData.value.student_id}`)
  }
}


const openAiInterpretation = () => {
  if (!assessData.value) {
    ElMessage.warning('评估数据未加载完成')
    return
  }

  openAiAssistant('special_ed_teacher')

  setTimeout(() => {
    ElMessage.success('AI助手已打开，你可以询问"解读这名学生的BRIEF评估结果"')
  }, 500)
}


onMounted(() => {
  const assessId = Number(route.params.assessId)
  if (!assessId) {
    ElMessage.error('缺少评估记录 ID')
    return
  }
  const api = new BRIEFAssessmentAPI()
  const data = api.getAssessment(assessId)
  if (!data) {
    ElMessage.error('未找到评估记录')
    return
  }
  assessData.value = data
})
</script>

<style scoped>
.brief-report {
  padding: 16px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.draft-tag {
  margin-left: 8px;
}
.overview {
  display: flex;
  gap: 48px;
  flex-wrap: wrap;
}
.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 140px;
}
.score-label {
  color: #909399;
  font-size: 13px;
}
.score-value {
  font-size: 30px;
  font-weight: 600;
  color: #303133;
}
.score-range {
  font-size: 12px;
  color: #c0c4cc;
}
.score-level {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}
.dimension-card {
  margin-top: 16px;
}
.t-typical {
  color: #67c23a;
}
.t-elevated {
  color: #e6a23c;
}
.t-high {
  color: #f56c6c;
}
.disclaimer {
  margin-top: 16px;
}
.disclaimer-content {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: #e6a23c;
}
.disclaimer-content p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}
</style>
