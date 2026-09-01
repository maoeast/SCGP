<!-- src/views/system/AssessmentQualityBoard.vue -->
<!--
  评估质量统计看板（Phase 2，admin-only）

  宽松质控配套的管理侧出口：
  - 汇总卡：17 量表的评估数 / 已追踪数 / very_fast / fast / suspicious 计数
  - 疑似明细：quality_note 非空的记录清单，可跳转对应报告页
  - 只读，不做任何处置动作（数据供管理者人工研判）

  量表名从 assessment-scale-catalog 派生（单一真源），不在此重复维护。
-->
<template>
  <div class="quality-board">
    <div class="board-header">
      <div>
        <h2>评估质量看板</h2>
        <p class="subtitle">
          汇总各量表的作答用时与质量标记（Phase 1 起记录；此前旧记录无数据属正常）
        </p>
      </div>
      <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="legend"
      title="标记说明"
    >
      <p>极快（very_fast）：平均每题 &lt; 3 秒；偏快（fast）：平均每题 &lt; 5 秒；疑似（suspicious）：作答模式疑似随机（仅儿童自答测验类启用）。</p>
      <p>标记仅作参考，不构成对评估有效性的判定；请结合施测情境人工研判。</p>
    </el-alert>

    <!-- 汇总表 -->
    <el-card shadow="never" class="summary-card">
      <template #header><span>各量表质量汇总</span></template>
      <el-table :data="summary" v-loading="loading" size="default">
        <el-table-column label="量表" min-width="220">
          <template #default="{ row }">
            <span>{{ scaleTitle(row.scaleCode) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="评估数" width="90" align="right" />
        <el-table-column prop="tracked" label="已追踪" width="90" align="right" />
        <el-table-column label="追踪率" width="90" align="right">
          <template #default="{ row }">
            {{ row.total > 0 ? Math.round((row.tracked / row.total) * 100) + '%' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="极快" width="80" align="right">
          <template #default="{ row }">
            <span :class="{ 'num-warn': row.veryFast > 0 }">{{ row.veryFast }}</span>
          </template>
        </el-table-column>
        <el-table-column label="偏快" width="80" align="right">
          <template #default="{ row }">
            <span :class="{ 'num-warn': row.fast > 0 }">{{ row.fast }}</span>
          </template>
        </el-table-column>
        <el-table-column label="疑似" width="80" align="right">
          <template #default="{ row }">
            <span :class="{ 'num-danger': row.suspicious > 0 }">{{ row.suspicious }}</span>
          </template>
        </el-table-column>
        <el-table-column label="平均总用时" width="110" align="right">
          <template #default="{ row }">{{ formatDuration(row.avgTotalDuration) }}</template>
        </el-table-column>
        <el-table-column label="平均每题" width="100" align="right">
          <template #default="{ row }">{{ formatSeconds(row.avgResponseTimeMean) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 疑似明细 -->
    <el-card shadow="never" class="flags-card">
      <template #header><span>质量标记明细（最近 {{ flags.length }} 条）</span></template>
      <el-empty v-if="!loading && flags.length === 0" description="暂无质量标记记录" />
      <el-table v-else :data="flags" v-loading="loading" size="default">
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="量表" min-width="200">
          <template #default="{ row }">{{ scaleTitle(row.scaleCode) }}</template>
        </el-table-column>
        <el-table-column prop="studentName" label="学生" width="120" />
        <el-table-column label="用时" width="100" align="right">
          <template #default="{ row }">{{ formatDuration(row.totalDuration) }}</template>
        </el-table-column>
        <el-table-column label="平均每题" width="100" align="right">
          <template #default="{ row }">{{ formatSeconds(row.avgResponseTime) }}</template>
        </el-table-column>
        <el-table-column label="标记" width="150">
          <template #default="{ row }">
            <el-tag
              v-for="note in parseNotes(row.qualityNote)"
              :key="note"
              :type="noteTagType(note)"
              size="small"
              effect="light"
              class="note-tag"
            >
              {{ noteLabel(note) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goReport(row)">查看报告</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import {
  AssessmentQualityAPI,
  type ScaleQualitySummary,
  type QualityFlagRow,
} from '@/database/assessment-quality-api'
import { getAssessmentScaleCatalogItem } from '@/features/assessment/assessment-scale-catalog'
import { buildAssessmentReportRoute } from '@/features/assessment/report-routes'
import type { AssessmentScaleCode } from '@/features/assessment/assessment-scale-catalog'

const router = useRouter()
const api = new AssessmentQualityAPI()

const loading = ref(false)
const summary = ref<ScaleQualitySummary[]>([])
const flags = ref<QualityFlagRow[]>([])

async function loadData() {
  loading.value = true
  try {
    // API 是同步 SQL（sql.js 渲染进程内），包一层 Promise 让 loading 生效一帧
    await Promise.resolve()
    summary.value = api.getQualitySummary()
    flags.value = api.getQualityFlags(100)
  } catch (error) {
    console.error('[AssessmentQualityBoard] 加载质量数据失败:', error)
    summary.value = []
    flags.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

function scaleTitle(code: string): string {
  const item = getAssessmentScaleCatalogItem(code as AssessmentScaleCode)
  return item ? `${item.title}${item.subtitle ?? ''}` : code
}

function parseNotes(note: string | null): string[] {
  if (!note) return []
  return note.split('+').filter(Boolean)
}

function noteTagType(note: string): 'danger' | 'warning' | 'info' {
  if (note === 'suspicious') return 'danger'
  if (note === 'very_fast') return 'warning'
  return 'info'
}

function noteLabel(note: string): string {
  if (note === 'very_fast') return '极快'
  if (note === 'fast') return '偏快'
  if (note === 'suspicious') return '疑似随机'
  return note
}

function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '-'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return mins <= 0 ? `${secs}秒` : `${mins}分${secs}秒`
}

function formatSeconds(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '-'
  return `${seconds.toFixed(1)}秒`
}

function formatDateTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function goReport(row: QualityFlagRow) {
  // cognitive_self 的报告参数形态从 catalog 派生，统一走 buildAssessmentReportRoute
  const route = buildAssessmentReportRoute({
    scaleType: row.scaleCode as AssessmentScaleCode,
    assessId: row.assessId,
    studentId: row.studentId,
  })
  router.push(route)
}
</script>

<style scoped>
.quality-board {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.board-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.legend {
  margin-bottom: 16px;
}

.legend p {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
}

.summary-card {
  margin-bottom: 16px;
}

.note-tag {
  margin-right: 4px;
}

.num-warn {
  color: #e6a23c;
  font-weight: 600;
}

.num-danger {
  color: #f56c6c;
  font-weight: 600;
}
</style>
