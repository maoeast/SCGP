<template>
  <div class="page-container scgp-admin-page emotional-game-record-page" v-loading="loading">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/training-records/menu' }">训练记录</el-breadcrumb-item>
        <el-breadcrumb-item :to="trainingRecordsRoute">
          {{ recordEntryName }}
        </el-breadcrumb-item>
        <el-breadcrumb-item>小游戏记录详情</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div v-if="record" class="page-header emotional-game-record-header">
      <div class="header-left">
        <div class="record-heading">
          <StudentAvatar
            :name="student?.name || record.student_id?.toString()"
            :gender="student?.gender"
            :avatar-url="student?.avatar_path"
            size="lg"
          />

          <div class="record-heading__copy">
            <h1>{{ record.task_name }}</h1>
            <p class="subtitle">
              {{ student?.name || `学生 ${record.student_id}` }} · {{ getStatusLabel(record.completion_status) }} ·
              {{ formatDateTime(record.created_at || record.timestamp) }}
            </p>
            <div class="record-heading__meta">
              <el-tag size="small" effect="plain" type="warning">{{ recordEntryName }}</el-tag>
              <el-tag size="small" effect="plain">{{ getDifficultyLabel(record.difficulty_level) }}</el-tag>
              <el-tag size="small" effect="plain" :type="getStatusType(record.completion_status)">
                {{ getStatusLabel(record.completion_status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="header-right">
        <el-button @click="goBack">返回上一页</el-button>
        <el-button type="primary" plain @click="goToTrainingRecords">{{ recordEntryName }}记录</el-button>
      </div>
    </div>

    <el-empty
      v-else-if="!loading"
      description="未找到该情绪小游戏记录"
      class="record-empty"
    />

    <template v-else />

    <template v-if="record">
      <section class="summary-grid">
        <article v-for="item in summaryCards" :key="item.label" class="summary-card scgp-surface">
          <span class="summary-card__label">{{ item.label }}</span>
          <strong class="summary-card__value">{{ item.value }}</strong>
        </article>
      </section>

      <section class="detail-grid">
        <article class="detail-card scgp-surface">
          <div class="detail-card__header">
            <h2>训练摘要</h2>
            <p>当前详情来自情绪小游戏独立记录表，已接入训练记录面板展示。</p>
          </div>

          <div class="detail-list">
            <div v-for="item in highlightRows" :key="item.label" class="detail-row">
              <span class="detail-row__label">{{ item.label }}</span>
              <strong class="detail-row__value">{{ item.value }}</strong>
            </div>
          </div>
        </article>

        <article class="detail-card scgp-surface">
          <div class="detail-card__header">
            <h2>关键表现</h2>
            <p>按小游戏类型提炼本次训练里最有解释力的关键指标。</p>
          </div>

          <div class="metric-grid">
            <article v-for="item in metricCards" :key="item.label" class="metric-card">
              <span class="metric-card__label">{{ item.label }}</span>
              <strong class="metric-card__value">{{ item.value }}</strong>
            </article>
          </div>
        </article>
      </section>

      <section class="raw-section scgp-surface">
        <div class="raw-section__header">
          <h2>补充记录</h2>
          <p>用于查看本次训练保存的补充信息。</p>
        </div>

        <div class="raw-grid">
          <div v-for="item in rawRows" :key="item.label" class="raw-row">
            <span class="raw-row__label">{{ item.label }}</span>
            <span class="raw-row__value">{{ item.value }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import { StudentAPI } from '@/database/api'
import { EmotionalGamesAPI, type EmotionalGameTrainingRecordItem } from '@/database/emotional-games-api'
import { getCustomGameDefinition } from '@/data/custom-game-registry'
import { getTrainingEntry } from '@/utils/training-entry'

type DetailRow = {
  label: string
  value: string
}

const route = useRoute()
const router = useRouter()
const studentApi = new StudentAPI()
const emotionalGamesApi = new EmotionalGamesAPI()

const loading = ref(false)
const student = ref<any | null>(null)
const record = ref<EmotionalGameTrainingRecordItem | null>(null)

const recordEntry = computed(() => {
  if (!record.value) {
    return null
  }

  return getTrainingEntry(record.value.entry_code, record.value.module_code)
})

const recordEntryName = computed(() => recordEntry.value?.name || '训练记录')
const recordGameDefinition = computed(() => {
  if (!record.value) {
    return null
  }

  return getCustomGameDefinition(record.value.game_code)
})

const trainingRecordsRoute = computed(() => ({
  path: `/training-records/${recordEntry.value?.code || 'emotional-regulation'}`,
  query: { type: 'game' },
}))

const recordId = computed(() => {
  const raw = Array.isArray(route.query.recordId) ? route.query.recordId[0] : route.query.recordId
  const parsed = Number(raw || 0)
  return Number.isFinite(parsed) ? parsed : 0
})

function formatDateTime(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatDuration(ms: number | null | undefined) {
  const safeMs = Math.max(0, Number(ms || 0))
  const seconds = Math.floor(safeMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}分 ${remainingSeconds}秒`
  }

  return `${remainingSeconds}秒`
}

function formatResponseTime(ms: number | null | undefined) {
  const safeMs = Number(ms)
  if (!Number.isFinite(safeMs) || safeMs < 0) {
    return '-'
  }

  if (safeMs < 1000) {
    return `${Math.round(safeMs)}ms`
  }

  return `${(safeMs / 1000).toFixed(1)}秒`
}

function formatPercent(rate: number | null | undefined) {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return '-'
  }

  return `${Math.round(Math.max(0, Math.min(1, rate)) * 100)}%`
}

function formatNullableNumber(value: unknown, suffix = '') {
  const safeValue = Number(value)
  if (!Number.isFinite(safeValue)) {
    return '-'
  }

  return `${safeValue}${suffix}`
}

function formatArrayCount(value: unknown, suffix = '项') {
  if (!Array.isArray(value)) {
    return '-'
  }

  return `${value.length}${suffix}`
}

function formatAverageArrayDuration(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return '-'
  }

  const normalized = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 0)

  if (!normalized.length) {
    return '-'
  }

  const average = normalized.reduce((sum, item) => sum + item, 0) / normalized.length
  return formatResponseTime(average)
}

function formatBooleanLabel(value: unknown) {
  if (typeof value !== 'boolean') {
    return '-'
  }

  return value ? '是' : '否'
}

function formatEventLabel(value: unknown) {
  switch (String(value || '')) {
    case 'timer_end':
      return '自然结束'
    case 'game_complete':
      return '正常完成'
    case 'user_exit':
      return '主动退出'
    case 'teacher_exit':
      return '教师结束'
    case 'system_interrupt':
      return '系统中断'
    default:
      return String(value || '-')
  }
}

const rawFieldLabelMap: Record<string, string> = {
  event: '结束方式',
  completed_by_timer_end: '是否自然结束',
  planned_duration_ms: '预设时长',
  elapsed_ms: '实际用时',
  calm_taps: '安静提醒次数',
  progress_ratio: '完成进度',
  difficulty_level: '难度级别',
}

function getRawFieldLabel(key: string) {
  return rawFieldLabelMap[key] || key
}

function formatRawFieldValue(key: string, value: unknown) {
  switch (key) {
    case 'event':
      return formatEventLabel(value)
    case 'completed_by_timer_end':
      return formatBooleanLabel(value)
    case 'planned_duration_ms':
    case 'elapsed_ms':
      return formatDuration(value as number)
    case 'calm_taps':
      return formatNullableNumber(value, '次')
    case 'progress_ratio':
      return formatPercent(value as number)
    case 'difficulty_level':
      return getDifficultyLabel(value)
    default:
      return Array.isArray(value) ? JSON.stringify(value) : String(value ?? '-')
  }
}

function getStatusLabel(status?: string) {
  if (status === 'aborted') return '已中断'
  return '已完成'
}

function getStatusType(status?: string) {
  return status === 'completed' ? 'success' : 'warning'
}

function getDifficultyLabel(value: unknown) {
  const difficulty = Number(value || 1)
  if (difficulty === 3) return '困难'
  if (difficulty === 2) return '中等'
  return '简单'
}

function getGameFocusLabel() {
  const metadata = recordGameDefinition.value?.metadata
  if (typeof metadata?.therapeuticGoal === 'string' && metadata.therapeuticGoal.trim()) {
    return metadata.therapeuticGoal.trim()
  }

  const tags = recordGameDefinition.value?.tags
  if (Array.isArray(tags)) {
    const visibleTags = tags
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .slice(0, 2)
    if (visibleTags.length > 0) {
      return visibleTags.join(' / ')
    }
  }

  return '情绪调节训练'
}

const summaryCards = computed<DetailRow[]>(() => {
  if (!record.value) return []

  return [
    { label: '训练状态', value: getStatusLabel(record.value.completion_status) },
    { label: '训练时长', value: formatDuration(record.value.duration) },
    { label: '估算正确率', value: formatPercent(record.value.accuracy_rate) },
    { label: '平均响应', value: formatResponseTime(record.value.avg_response_time) },
  ]
})

const highlightRows = computed<DetailRow[]>(() => {
  if (!record.value) return []

  return [
    { label: '学生', value: student.value?.name || `学生 ${record.value.student_id}` },
    { label: '游戏名称', value: record.value.task_name },
    { label: '训练重点', value: getGameFocusLabel() },
    { label: '开始时间', value: formatDateTime(record.value.timestamp) },
    { label: '落库时间', value: formatDateTime(record.value.created_at) },
    { label: '难度级别', value: getDifficultyLabel(record.value.difficulty_level) },
  ]
})

const metricCards = computed<DetailRow[]>(() => {
  if (!record.value) return []

  const raw = record.value.raw_data || {}

  switch (record.value.game_code) {
    case 'C01_DANDELION':
    case 'G01_BALLOON':
      return [
        { label: '成功循环', value: formatNullableNumber(raw.successful_cycles, '次') },
        { label: '完美循环', value: formatNullableNumber(raw.perfect_cycles, '次') },
        { label: '失败释放', value: formatNullableNumber(raw.failed_releases, '次') },
        { label: '最长吸气', value: formatDuration(raw.longest_inhale_ms) },
      ]
    case 'G03_FOREST':
      return [
        { label: '目标命中', value: formatNullableNumber(raw.target_hits, '次') },
        { label: '警告次数', value: formatNullableNumber(raw.warning_count, '次') },
        { label: '稳定发声', value: formatDuration(raw.stable_voice_ms) },
        { label: '唤醒动物', value: formatNullableNumber(raw.animals_awakened, '只') },
      ]
    case 'G04_WIPE_ICE':
    case 'F01_CLOUD_ERASE':
      return [
        { label: '擦拭笔画', value: formatNullableNumber(raw.total_strokes, '次') },
        { label: '最高清理率', value: formatPercent(raw.cleared_ratio_peak) },
        { label: '回潮次数', value: formatNullableNumber(raw.regen_events, '次') },
        { label: '网格清理', value: `${formatNullableNumber(raw.fully_cleared_cells)}/${formatNullableNumber(raw.grid_cells_total)}` },
      ]
    case 'F05_BALLOONS':
      return [
        { label: '成功刺破', value: formatNullableNumber(raw.successful_pops, '次') },
        { label: '过早点按', value: formatNullableNumber(raw.early_taps, '次') },
        { label: '漏掉窗口', value: formatNullableNumber(raw.missed_windows, '次') },
        { label: '最长连击', value: formatNullableNumber(raw.max_streak, '次') },
      ]
    case 'G07_MONSTER':
      return [
        { label: '正确投喂', value: formatNullableNumber(raw.correct_drops, '次') },
        { label: '错误投喂', value: formatNullableNumber(raw.wrong_drops, '次') },
        { label: '总拖拽数', value: formatNullableNumber(raw.total_drags, '次') },
        { label: '怪兽数量', value: formatNullableNumber(raw.monster_count, '只') },
      ]
    case 'C04_HOURGLASS':
      return [
        { label: '结束方式', value: formatEventLabel(raw.event) },
        { label: '预设时长', value: formatDuration(raw.planned_duration_ms) },
        { label: '安静提醒', value: formatNullableNumber(raw.calm_taps, '次') },
        { label: '完成进度', value: formatPercent(raw.progress_ratio) },
      ]
    default:
      return []
  }
})

const rawRows = computed<DetailRow[]>(() => {
  if (!record.value) return []

  const raw = record.value.raw_data || {}

  switch (record.value.game_code) {
    case 'C01_DANDELION':
    case 'G01_BALLOON':
      return [
        { label: '主题标题', value: String(raw.session_theme_title || '-') },
        { label: '主题编码', value: String(raw.session_theme_key || '-') },
        { label: '目标编码', value: String(raw.session_objective_code || '-') },
        { label: '自动释放', value: formatNullableNumber(raw.auto_release_count, '次') },
        { label: '云层碰撞', value: formatNullableNumber(raw.cloud_contacts, '次') },
        { label: '吸气样本数', value: formatArrayCount(raw.inhale_samples_ms) },
      ]
    case 'G03_FOREST':
      return [
        { label: '最大连续命中', value: formatDuration(raw.max_continuous_target_ms) },
        { label: '峰值音量', value: formatNullableNumber(raw.mapped_peak_db, ' dB') },
        { label: '萤火波次', value: formatNullableNumber(raw.firefly_wave_count, '次') },
        { label: '目标时长', value: formatDuration(raw.difficulty_goal_ms) },
        { label: '麦克风授权', value: raw.mic_permission_granted ? '是' : '否' },
        { label: '校准兜底', value: raw.calibration_fallback_used ? '使用过' : '未使用' },
      ]
    case 'G04_WIPE_ICE':
    case 'F01_CLOUD_ERASE':
      return [
        { label: '笔刷半径', value: formatNullableNumber(raw.brush_radius_px, ' px') },
        { label: '滑动距离', value: formatNullableNumber(raw.stroke_distance_px, ' px') },
        { label: '静止回潮', value: formatDuration(raw.idle_recover_ms) },
        { label: '最大层数', value: formatNullableNumber(raw.max_strength_layers, '层') },
        { label: '目标清理率', value: formatPercent(raw.target_ratio) },
        { label: '主题编码', value: String(raw.theme_key || '-') },
      ]
    case 'F05_BALLOONS':
      return [
        { label: '目标气球', value: formatNullableNumber(raw.target_balloon_count, '只') },
        { label: '休息气球放行', value: formatNullableNumber(raw.calm_skips, '次') },
        { label: '误点休息球', value: formatNullableNumber(raw.wrong_rest_taps, '次') },
        { label: '进圈后平均响应', value: formatAverageArrayDuration(raw.window_response_ms) },
        { label: '平均上浮速度', value: formatNullableNumber(raw.average_balloon_speed_px, ' px/s') },
        { label: '目标区位置', value: `${formatPercent(raw.pop_zone_top_ratio)} - ${formatPercent(raw.pop_zone_bottom_ratio)}` },
        { label: '主题编码', value: String(raw.theme_key || '-') },
      ]
    case 'G07_MONSTER':
      return [
        { label: '反弹次数', value: formatNullableNumber(raw.bounce_count, '次') },
        { label: '工具数量', value: formatNullableNumber(raw.tool_count, '个') },
        { label: '传送带速度', value: formatNullableNumber(raw.conveyor_speed_px, ' px/s') },
        { label: '传送距离', value: formatNullableNumber(raw.conveyor_distance_px, ' px') },
        { label: '庆祝状态', value: String(raw.celebration_state || '-') },
        { label: '喂食顺序', value: Array.isArray(raw.feed_order) ? raw.feed_order.join(' / ') || '-' : '-' },
      ]
    case 'C04_HOURGLASS':
      return [
        { label: '是否自然结束', value: formatBooleanLabel(raw.completed_by_timer_end) },
        { label: '预设时长', value: formatDuration(raw.planned_duration_ms) },
        { label: '实际用时', value: formatDuration(raw.elapsed_ms) },
        { label: '安静提醒次数', value: formatNullableNumber(raw.calm_taps, '次') },
        { label: '完成进度', value: formatPercent(raw.progress_ratio) },
        { label: '当前难度', value: getDifficultyLabel(raw.difficulty_level) },
      ]
    default:
      return Object.entries(raw).map(([key, value]) => ({
        label: getRawFieldLabel(key),
        value: formatRawFieldValue(key, value),
      }))
  }
})

async function loadRecord() {
  if (!recordId.value) {
    ElMessage.error('缺少记录 ID')
    return
  }

  try {
    loading.value = true
    record.value = emotionalGamesApi.getRecordById(recordId.value)

    if (!record.value) {
      return
    }

    student.value = await studentApi.getStudentById(record.value.student_id)
  } catch (error) {
    console.error('加载情绪小游戏记录失败:', error)
    ElMessage.error('加载情绪小游戏记录失败')
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  router.push(trainingRecordsRoute.value)
}

function goToTrainingRecords() {
  router.push(trainingRecordsRoute.value)
}

onMounted(() => {
  loadRecord()
})
</script>

<style scoped>
.emotional-game-record-page {
  gap: 20px;
}

.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.emotional-game-record-header {
  margin-bottom: 0;
}

.record-heading {
  display: flex;
  align-items: center;
  gap: 16px;
}

.record-heading__copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-heading__copy h1 {
  margin: 0;
  color: #303133;
  font-size: 30px;
  line-height: 1.08;
}

.record-heading__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.record-empty {
  min-height: 360px;
  border-radius: 24px;
  background: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card,
.detail-card,
.raw-section {
  padding: 22px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card__label {
  color: #909399;
  font-size: 13px;
}

.summary-card__value {
  color: #303133;
  font-size: clamp(24px, 2.4vw, 34px);
  line-height: 1.08;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 20px;
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-card__header h2,
.raw-section__header h2 {
  margin: 0;
  color: #303133;
  font-size: 22px;
}

.detail-card__header p,
.raw-section__header p {
  margin: 8px 0 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
}

.detail-list {
  display: grid;
  gap: 12px;
}

.detail-row,
.raw-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e7edf5;
}

.detail-row__label,
.raw-row__label {
  color: #606266;
  font-size: 13px;
}

.detail-row__value,
.raw-row__value {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.metric-grid,
.raw-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 110px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid #e4ebf3;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.metric-card__label {
  color: #7b8796;
  font-size: 12px;
}

.metric-card__value {
  color: #303133;
  font-size: 24px;
  line-height: 1.15;
}

@media (max-width: 1100px) {
  .summary-grid,
  .detail-grid,
  .metric-grid,
  .raw-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .emotional-game-record-page {
    gap: 16px;
    padding: 16px;
  }

  .record-heading,
  .emotional-game-record-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid,
  .detail-grid,
  .metric-grid,
  .raw-grid {
    grid-template-columns: 1fr;
  }

  .detail-row,
  .raw-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-row__value,
  .raw-row__value {
    text-align: left;
  }
}
</style>
