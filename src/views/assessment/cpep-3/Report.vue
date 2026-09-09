<template>
  <div class="cpep3-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-row">
          <div class="header-left">
            <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
            <h2>C-PEP-3 儿童心理教育评估报告</h2>
          </div>
          <el-tag v-if="assessment" type="primary" size="large">CPEP-3</el-tag>
          <div class="header-actions">
            <el-button v-if="assessment?.student_id" :icon="Clock" @click="viewHistory">查看趋势</el-button>
            <el-button :icon="ChatDotRound" @click="openAiInterpretation">AI解读</el-button>
            <el-button type="primary" :icon="Download" :disabled="!assessment" @click="exportWord">导出Word</el-button>
          </div>
        </div>
      </template>

      <!-- 1. 基本信息 -->
      <div v-if="studentInfo" class="student-info">
        <div class="info-item">
          <span class="label">学生姓名</span>
          <span class="value">{{ studentInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">性别</span>
          <span class="value">{{ studentInfo.gender || '未填写' }}</span>
        </div>
        <div class="info-item">
          <span class="label">出生日期</span>
          <span class="value">{{ studentInfo.birthday || '未填写' }}</span>
        </div>
        <div class="info-item">
          <span class="label">评估日期</span>
          <span class="value">{{ formatDateTime(assessment?.start_time || assessment?.created_at) }}</span>
        </div>
        <div class="info-item">
          <span class="label">实际年龄 CA</span>
          <span class="value">{{ formatCaAge }}</span>
        </div>
        <div class="info-item">
          <span class="label">报告版本</span>
          <span class="value">{{ snapshot?.reportVersion || '旧版记录（请重测生成完整报告）' }}</span>
          <el-tag v-if="snapshot" size="small" type="success">快照已存档</el-tag>
        </div>
        <div class="info-item">
          <span class="label">计分口径</span>
          <span class="value">P=2 · E=1 · F=0（E 萌发不计通过数）</span>
        </div>
      </div>

      <el-alert
        v-if="ceilingWarning"
        class="age-alert"
        type="warning"
        :closable="false"
        :title="ceilingWarning"
      />
      <el-alert
        v-if="!snapshot"
        class="age-alert"
        type="info"
        :closable="false"
        title="该记录为报告快照功能上线前的旧版记录，下方结果由明细表只读重算展示；如需完整报告（含 Emerging Skills 与 IEP 建议），请重新施测。"
      />
    </el-card>

    <template v-if="assessment">
      <!-- 2. 评估说明 -->
      <el-card class="note-card">
        <template #header>
          <h3>评估说明</h3>
        </template>
        <p class="note-paragraph">
          本评估用于了解儿童当前发展特点、学习优势、发展中技能及教育支持需求，主要服务于个别化教育计划（IEP）和教学干预设计。本报告不作为独立医学诊断依据。
        </p>
      </el-card>

      <!-- 3. 整体发展概况 -->
      <el-card class="overview-card">
        <template #header>
          <div class="card-header-row">
            <h3>整体发展概况</h3>
            <span class="header-note">基于本次评估数据自动生成</span>
          </div>
        </template>
        <p class="note-paragraph">{{ reportSummary }}</p>
      </el-card>

      <!-- 4. 六大发展领域（协康会 12 能区结构中的 7 个发展能区） -->
      <el-card class="domain-card">
        <template #header>
          <h3>发展能区明细（7 区 · 施测题）</h3>
        </template>

        <el-table :data="developmentalRows" border stripe>
          <el-table-column prop="name" label="能区" min-width="100" />
          <el-table-column label="通过 / 萌发 / 未表现 / 总题" min-width="150">
            <template #default="{ row }">
              <span class="pass-text">{{ row.pCount }}</span> / {{ row.eCount }} / {{ row.fCount }} / {{ row.maxRawScore }}
            </template>
          </el-table-column>
          <el-table-column label="发展当量月龄" min-width="110">
            <template #default="{ row }">{{ row.monthRange ? `${row.monthRange}月` : '不适用' }}</template>
          </el-table-column>
          <el-table-column label="完成度" min-width="90">
            <template #default="{ row }">{{ row.completionPct }}%</template>
          </el-table-column>
          <el-table-column label="百分位" min-width="150">
            <template #default="{ row }">
              <span class="norm-missing">当前系统未配置该指标的标准化常模换算数据。</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 5. 发展剖面图（完成度百分比，非百分位） -->
      <el-card class="domain-card">
        <template #header>
          <div class="card-header-row">
            <h3>发展剖面</h3>
            <span class="header-note">纵轴为完成度（得分比例 = 通过数/总题数），非百分位；能区下方标注发展当量月龄区间</span>
          </div>
        </template>
        <div ref="profileChartEl" class="profile-chart" />
      </el-card>

      <!-- 6. 适应不良行为观察（单独卡，不与发展剖面同图） -->
      <el-card class="domain-card">
        <template #header>
          <div class="card-header-row">
            <h3>适应不良行为观察（5 区 · 观察题）</h3>
            <span class="header-note">信息来源：评估师现场观察记录；描述性呈现，不做分级判读</span>
          </div>
        </template>

        <el-table :data="maladaptiveRows" border stripe>
          <el-table-column prop="name" label="能区" min-width="100" />
          <el-table-column label="适当 (A)" min-width="85">
            <template #default="{ row }">{{ row.counts.A }}</template>
          </el-table-column>
          <el-table-column label="轻微 (M)" min-width="85">
            <template #default="{ row }">{{ row.counts.M }}</template>
          </el-table-column>
          <el-table-column label="严重 (S)" min-width="85">
            <template #default="{ row }">{{ row.counts.S }}</template>
          </el-table-column>
          <el-table-column label="严重度分" min-width="90">
            <template #default="{ row }">{{ row.severityScore }}</template>
          </el-table-column>
          <el-table-column label="观察概况" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">{{ row.note }}</template>
          </el-table-column>
        </el-table>
        <p class="note-paragraph note-inline">
          严重度分 = Σ(A=0/M=1/S=2)，分值越高表示观察到的适应不良行为越多、需要的教学支持越多（计分方向已按量表原始定义核实）。该指标不进行常模对比与分级判读。
        </p>
      </el-card>

      <!-- 7. 照顾者报告（无数据源，明示） -->
      <el-card class="domain-card">
        <template #header>
          <h3>照顾者报告</h3>
        </template>
        <p class="note-paragraph">
          信息来源：家长/主要照顾者报告（问题行为 / 个人自理 / 适应性行为三部分）。<strong>当前系统未配置 CPEP-3 照顾者报告量表，本区暂无数据</strong>；现场观察记录见上方「适应不良行为观察」，请注意两者信息来源不同，不可互相替代。
        </p>
      </el-card>

      <!-- 8. 相对优势 -->
      <el-card class="domain-card">
        <template #header>
          <h3>相对优势</h3>
        </template>
        <ul v-if="strengths.length" class="goal-list">
          <li v-for="s in strengths" :key="s.domainCode">{{ s.summary }}</li>
        </ul>
        <p v-else class="note-paragraph">本次评估未识别出通过率过半的能区；建议从萌发技能与基础技能入手安排教学。</p>
      </el-card>

      <!-- 9. Emerging Skills -->
      <el-card class="domain-card">
        <template #header>
          <div class="card-header-row">
            <h3>Emerging Skills（萌发技能）</h3>
            <span class="header-note">全部来自本次评估评为 E（萌发）的项目，共 {{ emergingSkills.length }} 项</span>
          </div>
        </template>
        <el-table v-if="emergingSkills.length" :data="emergingSkills" border stripe size="small">
          <el-table-column prop="teachingDomain" label="领域" width="120" />
          <el-table-column prop="skillName" label="技能" min-width="200" show-overflow-tooltip />
          <el-table-column prop="suggestedGoal" label="教学意义" min-width="300" />
        </el-table>
        <p v-else class="note-paragraph">本次评估无 E（萌发）评级项目。</p>
      </el-card>

      <!-- 10. 当前需要支持的技能 -->
      <el-card class="domain-card">
        <template #header>
          <div class="card-header-row">
            <h3>当前需要支持的技能</h3>
            <span class="header-note">F 项按「与萌发技能相邻」优先排序，共展示 {{ supportNeeds.length }} 项</span>
          </div>
        </template>
        <el-table v-if="supportNeeds.length" :data="supportNeeds" border stripe size="small">
          <el-table-column prop="domainName" label="领域" width="120" />
          <el-table-column prop="taskName" label="技能" min-width="200" show-overflow-tooltip />
          <el-table-column label="优先级" width="130">
            <template #default="{ row }">
              <el-tag :type="row.priority === 'adjacent_to_emerging' ? 'warning' : 'info'" size="small">
                {{ row.priority === 'adjacent_to_emerging' ? '与萌发技能相邻' : '暂缓引入' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="suggestedGoal" label="建议" min-width="280" show-overflow-tooltip />
        </el-table>
        <p v-else class="note-paragraph">本次评估无「当前未表现」项目。</p>
      </el-card>

      <!-- 11. IEP 优先教学目标 -->
      <el-card class="domain-card">
        <template #header>
          <div class="card-header-row">
            <h3>IEP 优先教学目标</h3>
            <span class="header-note">全部源自萌发技能（E 项）；目标需教师确认后方可纳入正式 IEP</span>
          </div>
        </template>
        <div v-if="iepPlan.priority.length" class="goal-cards">
          <div v-for="(goal, idx) in iepPlan.priority" :key="idx" class="goal-card">
            <div class="goal-head">
              <el-tag type="primary" size="small">优先 {{ idx + 1 }}</el-tag>
              <strong>{{ goal.domainName }}</strong>
            </div>
            <div class="goal-body">
              <p><span class="goal-label">当前表现</span>{{ goal.currentPerformance }}</p>
              <p><span class="goal-label">建议目标</span>{{ goal.goalText }}</p>
              <p><span class="goal-label">达成标准</span>{{ goal.criteria }}</p>
              <p><span class="goal-label">提示策略</span>{{ goal.promptLevel }}</p>
              <p><span class="goal-label">训练场景</span>{{ goal.setting }}</p>
            </div>
          </div>
        </div>
        <p v-else class="note-paragraph">本次评估无萌发技能，暂无法生成基于 E 项的优先目标；建议先夯实基础技能并复测。</p>
      </el-card>

      <!-- 12. 次级训练目标 -->
      <el-card class="domain-card">
        <template #header>
          <h3>次级训练目标</h3>
        </template>
        <ul v-if="iepPlan.secondary.length" class="goal-list">
          <li v-for="(goal, idx) in iepPlan.secondary" :key="idx">{{ goal.goalText }}</li>
        </ul>
        <p v-else class="note-paragraph">本次评估无对应的次级训练目标。</p>
      </el-card>

      <!-- 13. 家庭泛化建议 -->
      <el-card class="domain-card">
        <template #header>
          <h3>家庭泛化建议</h3>
        </template>
        <ul class="goal-list">
          <li v-for="(tip, idx) in iepPlan.familyGeneralization" :key="idx">{{ tip }}</li>
        </ul>
        <p v-if="iepPlan.caregiverNote" class="note-paragraph note-inline">{{ iepPlan.caregiverNote }}</p>
        <p v-else class="note-paragraph note-inline">当前系统未配置 CPEP-3 照顾者报告量表，本区暂无数据。</p>
      </el-card>

      <!-- 14. 结果解读说明与限制 -->
      <el-card class="note-card">
        <template #header>
          <h3>结果解读说明与限制</h3>
        </template>
        <ul class="note-list">
          <li v-for="(item, idx) in limitationItems" :key="idx">{{ item }}</li>
        </ul>
        <p v-if="reportLimitations" class="note-paragraph">{{ reportLimitations }}</p>
      </el-card>

      <!-- 逐题作答明细 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header-row">
            <h3>逐题作答明细</h3>
            <span class="header-note">{{ detailRows.length }} 题</span>
          </div>
        </template>

        <el-table :data="pagedDetailRows" border stripe size="small">
          <el-table-column prop="codeNo" label="题号" width="90" />
          <el-table-column prop="domainName" label="能区" width="110" />
          <el-table-column prop="taskName" label="任务" min-width="220" show-overflow-tooltip />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ itemTypeLabel(row.item_type) }}</template>
          </el-table-column>
          <el-table-column label="评级" width="80">
            <template #default="{ row }">
              <el-tag :type="levelTagType(row.level)" size="small">{{ levelDisplayText(row.level) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="detailRows.length > detailPageSize" class="pager-row">
          <el-pagination
            v-model:current-page="detailPage"
            :page-size="detailPageSize"
            :total="detailRows.length"
            layout="prev, pager, next"
          />
        </div>
      </el-card>

      <!-- 评估用时信息（旧记录无数据时整卡不渲染） -->
      <AssessmentTimingInfo
        :total-duration="assessment?.total_duration"
        :avg-response-time="assessment?.avg_response_time"
      />
    </template>

    <el-card v-else class="loading-card">
      <el-empty description="报告数据加载中" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ChatDotRound, Clock, Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { getDatabase } from '@/database/init'
import { CPEP3_QUESTIONS, CPEP3_DOMAIN_DEFINITIONS } from '@/database/cpep3-questions'
import { buildCpep3WordPayload } from '@/utils/assessment-word-builders'
import { exportWordDocument } from '@/utils/export-word'
import { openAiAssistant } from '@/features/ai/assistant-launcher'
import type {
  Cpep3EmergingSkill,
  Cpep3IepPlan,
  Cpep3ProfileView,
  Cpep3ReportSnapshot,
  Cpep3Strength,
  Cpep3SubtestResult,
  Cpep3SupportNeed,
} from '@/types/cpep_3'
import AssessmentTimingInfo from '../components/AssessmentTimingInfo.vue'

interface Cpep3AssessmentRecord {
  id: number
  student_id: number
  student_name?: string
  age_months: number
  ca_year: number
  ca_month: number
  ca_day: number
  ca_months_decimal: number
  total_pass_count: number
  total_emerging_count: number
  total_mental_age: number
  total_month_range: string
  domain_results: string
  report_snapshot: string | null
  report_version: string | null
  scoring_version: string | null
  start_time?: string
  end_time?: string
  created_at: string
  total_duration?: number | null
  avg_response_time?: number | null
}

interface DetailRow {
  id: number
  code_no: string
  dimension: string
  item_type: 'administered' | 'rated'
  level: string
  score: number
  /** 展示扩展字段（loadReport 时从 CPEP3_QUESTIONS 补齐） */
  codeNo?: string
  taskName?: string
  domainName?: string
}

const route = useRoute()
const router = useRouter()

const assessment = ref<Cpep3AssessmentRecord | null>(null)
const snapshot = ref<Cpep3ReportSnapshot | null>(null)
const detailRows = ref<DetailRow[]>([])
const detailPage = ref(1)
const detailPageSize = 20

const assessId = computed(() => {
  const raw = route.params.assessId || route.query.assessId
  const normalized = Array.isArray(raw) ? raw[0] : raw
  return Number(normalized)
})

const studentInfo = computed(() => {
  if (!assessment.value) return null
  return {
    name: assessment.value.student_name || '未命名学生',
    gender: (assessment.value as Record<string, unknown>).gender as string | undefined,
    birthday: (assessment.value as Record<string, unknown>).birthday as string | undefined,
  }
})

const domainResults = computed<Cpep3SubtestResult[]>(() => {
  // 快照优先（历史不可变）；无快照旧行从 domain_results JSON 只读重算展示层
  if (snapshot.value) return snapshot.value.subtestResults
  if (!assessment.value?.domain_results) return []
  try {
    const parsed = JSON.parse(assessment.value.domain_results)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item: any) => item?.dataType !== 'assessment_status')
      .map((item: any) => normalizeLegacyDomainResult(item))
  } catch {
    return []
  }
})

/** 旧版 domain_results（Cpep3DomainResult 形态）→ Cpep3SubtestResult 只读重算（不改库） */
function normalizeLegacyDomainResult(item: Record<string, unknown>): Cpep3SubtestResult {
  const code = String(item.domainCode)
  const isDevelopmental = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(code)
  const ratedCounts = (item.ratedCounts ?? undefined) as { A: number; M: number; S: number } | undefined
  // 旧行无 maxRawScore 字段：从题库按能区补齐（完成度展示需要）
  const itemTotal = CPEP3_QUESTIONS.filter((q) => q.domainCode === code).length
  const pCount = Number(item.passCount ?? 0)
  const eCount = Number(item.emergingCount ?? 0)
  return {
    domainCode: code as Cpep3SubtestResult['domainCode'],
    name: String(item.domainName ?? code),
    category: isDevelopmental ? 'developmental' : 'maladaptive',
    rawScore: isDevelopmental ? pCount : Number(item.severityScore ?? 0),
    maxRawScore: Number(item.maxRawScore ?? itemTotal),
    pCount,
    eCount,
    fCount: isDevelopmental ? Math.max(0, itemTotal - pCount - eCount) : 0,
    percentile: null,
    developmentalAgeMonths: (item.developmentalAgeMonths as number | undefined) ?? null,
    developmentalAgeRange: (item.monthRange as string | undefined) || null,
    standardScore: null,
    classification: null,
    ratedCounts,
  }
}

const snapshotSummary = computed(() => snapshot.value?.summary ?? '')

/** 整体概况：快照优先；旧行用总通过/总萌发/总发展当量拼装 */
const reportSummary = computed(() => {
  if (snapshotSummary.value) return snapshotSummary.value
  if (!assessment.value) return ''
  const a = assessment.value
  return `本次 C-PEP-3 评估中，儿童在 95 个施测项目中共通过 ${a.total_pass_count} 项，另有 ${a.total_emerging_count} 项萌发技能，总发展当量约 ${a.total_month_range} 个月（常模查表区间）。本结果服务于个别化教育计划（IEP）制定，不构成医学诊断。`
})

const reportLimitations = computed(() => snapshot.value?.limitations ?? '')

const ceilingWarning = computed(() => {
  if (assessment.value?.ca_months_decimal === undefined) return ''
  if (assessment.value.ca_months_decimal > 89) {
    return `超出 CPEP-3 常模年龄范围（24-89 月），比率型派生指标存在天花板效应，请优先解读发展当量月龄与技能剖面。`
  }
  const maxPass: Record<string, number> = { A: 10, B: 11, C: 10, D: 11, E: 14, F: 20, G: 19 }
  const ceiling = domainResults.value.find(
    (r) => r.category === 'developmental' && (r.pCount ?? 0) >= (maxPass[r.domainCode] ?? Infinity),
  )
  if (ceiling) {
    return `${ceiling.name}能区通过数已达量表上限，该能区发展当量受测量天花板限制，解释时请谨慎。`
  }
  return ''
})

const formatCaAge = computed(() => {
  if (!assessment.value) return '-'
  const { ca_year, ca_month, ca_day } = assessment.value
  const parts: string[] = []
  if (ca_year > 0) parts.push(`${ca_year}岁`)
  if (ca_month > 0) parts.push(`${ca_month}个月`)
  if (ca_day > 0 || parts.length === 0) parts.push(`${ca_day}天`)
  return parts.join('')
})

const developmentalRows = computed(() => {
  return domainResults.value
    .filter((r) => r.category === 'developmental')
    .map((r) => ({
      domainCode: r.domainCode,
      name: r.name,
      pCount: r.pCount,
      eCount: r.eCount,
      fCount: r.fCount,
      maxRawScore: r.maxRawScore,
      monthRange: r.developmentalAgeRange ?? '',
      completionPct: r.maxRawScore > 0 ? Number(((r.pCount / r.maxRawScore) * 100).toFixed(1)) : 0,
    }))
})

const maladaptiveRows = computed(() => {
  if (snapshot.value) {
    return snapshot.value.maladaptiveOverview.map((m) => ({
      code: m.domainCode,
      name: m.domainName,
      counts: m.ratedCounts,
      severityScore: m.severityScore,
      note: m.note,
    }))
  }
  return domainResults.value
    .filter((r) => r.category === 'maladaptive')
    .map((r) => ({
      code: r.domainCode,
      name: r.name,
      counts: r.ratedCounts ?? { A: 0, M: 0, S: 0 },
      severityScore: r.rawScore,
      note: `A 适当 ${r.ratedCounts?.A ?? 0} 项 / M 轻微 ${r.ratedCounts?.M ?? 0} 项 / S 严重 ${r.ratedCounts?.S ?? 0} 项；严重度分 ${r.rawScore}。`,
    }))
})

const strengths = computed<Cpep3Strength[]>(() => snapshot.value?.strengths ?? [])
const emergingSkills = computed<Cpep3EmergingSkill[]>(() => snapshot.value?.emergingSkills ?? [])
const supportNeeds = computed<Cpep3SupportNeed[]>(() => snapshot.value?.supportNeeds ?? [])
const iepPlan = computed<Cpep3IepPlan>(() => snapshot.value?.iepPlan ?? { priority: [], secondary: [], familyGeneralization: [], caregiverNote: '' })
const profileView = computed<Cpep3ProfileView | null>(() => snapshot.value?.profile ?? null)

/** 结果解读说明与限制逐条（UI li 与 Word 导出共用同一数据源） */
const limitationItems = computed<string[]>(() => {
  const items = [
    '「发展当量月龄」换算依据 CPEP-3 中文版（香港协康会）配套常模表；原始区间（如 22-29 月）完整保留展示，单一月龄中值为系统派生估计，非官方精确 DA。',
    '百分位与标准分：当前系统未配置该指标的标准化常模换算数据，报告不提供、也不推算此类数值。',
    '「Emerging Skills」全部来自本次评估评为 E（萌发）的项目，由规则自动提取，非人工或 AI 判断。',
    'IEP 目标为候选建议，目标行为、提示等级、场景与达成标准均可记录测量；正式 IEP 须由教师确认后制定。',
    '「萌发技能（E）」不计入通过数；分值口径 P=2/E=1/F=0 仅用于档案记录，常模换算输入为通过数。',
  ]
  if (assessment.value?.ca_months_decimal !== undefined) {
    items.push('CA 按测试日与出生日期的年月日借位精确计算（月按 30 天）。')
  }
  return items
})

const pagedDetailRows = computed(() => {
  const start = (detailPage.value - 1) * detailPageSize
  return detailRows.value.slice(start, start + detailPageSize)
})

/** 家长视图档位文案（任务书 §十八：F 不直译「失败」） */
function levelDisplayText(level: string): string {
  if (level === 'P') return '通过'
  if (level === 'E') return '萌发'
  if (level === 'F') return '未表现'
  if (level === 'A') return '适当'
  if (level === 'M') return '轻微'
  if (level === 'S') return '严重'
  return level
}

function itemTypeLabel(type: string) {
  return type === 'administered' ? '施测' : '观察'
}

function levelTagType(level: string): 'success' | 'warning' | 'info' | 'danger' {
  if (level === 'P') return 'success'
  if (level === 'E') return 'warning'
  if (level === 'A') return 'success'
  if (level === 'M') return 'warning'
  if (level === 'S') return 'danger'
  return 'info'
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goBack() {
  router.back()
}

const viewHistory = () => {
  if (assessment.value?.student_id) {
    router.push(`/assessment/cpep_3/trend/${assessment.value.student_id}`)
  }
}

// AI 解读（对齐既有报告页模式：打开 special_ed_teacher 智能体 + 引导语提示）
function openAiInterpretation() {
  if (!assessment.value) {
    ElMessage.warning('评估数据未加载完成')
    return
  }
  openAiAssistant('special_ed_teacher')
  setTimeout(() => {
    ElMessage.success('AI助手已打开，你可以询问"解读这名学生的CPEP-3评估结果"')
  }, 500)
}

// 导出 Word（快照优先组装；旧版记录同样可导出——只读重算层内容一并呈现）
async function exportWord() {
  if (!assessment.value) {
    ElMessage.warning('评估数据未加载完成')
    return
  }
  try {
    const payload = buildCpep3WordPayload({
      studentName: studentInfo.value?.name || '未命名学生',
      gender: studentInfo.value?.gender,
      birthday: studentInfo.value?.birthday,
      assessmentDate: assessment.value.start_time || assessment.value.created_at || '',
      caAgeText: formatCaAge.value,
      reportVersion: snapshot.value?.reportVersion || '',
      scoringNote: 'P=2 · E=1 · F=0（E 萌发不计通过数）',
      summary: reportSummary.value,
      developmentalRows: developmentalRows.value.map((r) => ({
        name: r.name,
        pCount: r.pCount,
        eCount: r.eCount,
        fCount: r.fCount,
        total: r.maxRawScore,
        monthRange: r.monthRange,
        completionPct: r.completionPct,
      })),
      maladaptiveRows: maladaptiveRows.value.map((r) => ({
        name: r.name,
        counts: r.counts,
        severityScore: r.severityScore,
        note: r.note,
      })),
      caregiverNote: iepPlan.value.caregiverNote || '当前系统未配置 CPEP-3 照顾者报告量表，本区暂无数据。',
      strengths: strengths.value.map((s) => s.summary),
      emergingSkills: emergingSkills.value.map((s) => ({
        teachingDomain: s.teachingDomain,
        skillName: s.skillName,
        suggestedGoal: s.suggestedGoal,
      })),
      supportNeeds: supportNeeds.value.map((s) => ({
        domainName: s.domainName,
        taskName: s.taskName,
        priorityLabel: s.priority === 'adjacent_to_emerging' ? '与萌发技能相邻' : '暂缓引入',
        suggestedGoal: s.suggestedGoal,
      })),
      iepPriority: iepPlan.value.priority.map((g) => ({
        domainName: g.domainName,
        currentPerformance: g.currentPerformance,
        goalText: g.goalText,
        criteria: g.criteria,
        promptLevel: g.promptLevel,
        setting: g.setting,
      })),
      iepSecondary: iepPlan.value.secondary.map((g) => g.goalText),
      familyGeneralization: iepPlan.value.familyGeneralization,
      limitations: limitationItems.value,
      dynamicDisclaimer: reportLimitations.value,
      ageApplicabilityWarning: ceilingWarning.value,
      detailRows: detailRows.value.map((d) => ({
        codeNo: d.codeNo ?? d.code_no,
        domainName: d.domainName ?? d.dimension,
        taskName: d.taskName ?? '',
        typeLabel: itemTypeLabel(d.item_type),
        levelLabel: levelDisplayText(d.level),
      })),
    })
    await exportWordDocument(payload)
    ElMessage.success('Word 文档导出成功')
  } catch (error: any) {
    console.error('导出 Word 失败:', error)
    ElMessage.error(`导出 Word 失败: ${error?.message || '未知错误'}`)
  }
}

// ========== 发展剖面图（echarts，裸 init，对齐 AssessmentTrendPage 用法） ==========
const profileChartEl = ref<HTMLElement | null>(null)
let profileChart: echarts.ECharts | null = null

function renderProfileChart() {
  if (!profileChartEl.value) return
  if (!profileChart) profileChart = echarts.init(profileChartEl.value)
  const domains = developmentalRows.value
  profileChart.setOption({
    grid: { left: 48, right: 16, top: 30, bottom: 64 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const arr = params as Array<{ name: string; value: number; dataIndex: number }>
        const first = arr[0]
        if (!first) return ''
        const row = domains[first.dataIndex]
        const da = row?.monthRange ? `发展当量 ${row.monthRange} 月` : '发展当量：不适用'
        return `${row?.name}<br/>完成度 ${first.value}%（通过 ${row?.pCount}/${row?.maxRawScore}）<br/>${da}`
      },
    },
    xAxis: {
      type: 'category',
      data: domains.map((d) => d.name),
      axisLabel: { interval: 0, rotate: 24, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      name: '完成度（%）',
      nameTextStyle: { fontSize: 11 },
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        type: 'bar',
        data: domains.map((d) => d.completionPct),
        barMaxWidth: 44,
        itemStyle: { color: '#5B8FF9', borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'top',
          formatter: (p: { dataIndex: number }) => {
            const row = domains[p.dataIndex]
            return row?.monthRange ? `${row.monthRange}月` : ''
          },
          fontSize: 10,
          color: '#86909c',
        },
      },
    ],
  })
}

async function loadReport() {
  if (!assessId.value || Number.isNaN(assessId.value)) return

  try {
    const db = getDatabase()
    const assessRows = db.all(
      `
        SELECT
          a.*, s.name AS student_name
         FROM cpep3_assess a
         LEFT JOIN student s ON s.id = a.student_id
         WHERE a.id = ?
       `,
      [assessId.value],
    ) as any[]

    if (!assessRows.length) {
      ElMessage.warning('未找到该评估记录')
      return
    }
    const row = assessRows[0]
    // 补充学生性别/出生日期（任务书 §十七 §1 基本信息字段）
    if (row.student_id) {
      const studentRow = db.get('SELECT gender, birthday FROM student WHERE id = ?', [row.student_id]) as any
      if (studentRow) {
        row.gender = studentRow.gender
        row.birthday = studentRow.birthday
      }
    }
    assessment.value = row

    // 快照解析（不可变历史；同前缀版本族均接受——旧小版本快照仍须原样呈现，不得静默丢弃）
    if (row.report_snapshot) {
      try {
        const parsed = JSON.parse(row.report_snapshot)
        snapshot.value = typeof parsed?.reportVersion === 'string' && parsed.reportVersion.startsWith('cpep3-report-v')
          ? parsed
          : null
      } catch {
        snapshot.value = null
      }
    } else {
      snapshot.value = null
    }

    const details = db.all(
      'SELECT id, code_no, dimension, item_type, level, score FROM cpep3_assess_detail WHERE assess_id = ? ORDER BY question_id ASC',
      [assessId.value],
    ) as DetailRow[]

    const questionByCode = new Map(CPEP3_QUESTIONS.map((q) => [q.codeNo, q]))
    const domainNameByCode = new Map(CPEP3_DOMAIN_DEFINITIONS.map((d) => [d.code, d.name]))
    detailRows.value = details.map((d) => {
      const q = questionByCode.get(d.code_no)
      return {
        ...d,
        codeNo: d.code_no,
        taskName: q?.taskName ?? '',
        domainName: d.dimension ? (domainNameByCode.get(d.dimension as never) ?? d.dimension) : '',
      }
    })

    await nextTick()
    if (developmentalRows.value.length > 0) renderProfileChart()
  } catch (error) {
    console.error('[cpep3 Report] 加载报告失败:', error)
    ElMessage.error('报告数据加载失败')
  }
}

onMounted(loadReport)
watch(assessId, () => {
  detailPage.value = 1
  loadReport()
})

onBeforeUnmount(() => {
  profileChart?.dispose()
  profileChart = null
})
</script>

<style scoped>
.cpep3-report {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.student-info {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.info-item .value {
  font-size: 14px;
  font-weight: 600;
}

.age-alert {
  margin-top: 12px;
}

.card-header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.header-note {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-header-row h3 {
  margin: 0;
}

.note-paragraph {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
}

.note-inline {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
}

.note-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}

.norm-missing {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.profile-chart {
  width: 100%;
  height: 320px;
}

.goal-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.goal-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.goal-body p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.goal-label {
  display: inline-block;
  min-width: 68px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.goal-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.pager-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.loading-card {
  min-height: 240px;
}

@media (max-width: 768px) {
  .student-info {
    gap: 12px;
  }
}
</style>
