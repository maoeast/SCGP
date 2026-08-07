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
      description="未找到该小游戏记录"
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
            <p>当前详情来自自定义小游戏记录表，已接入训练记录面板展示。</p>
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

function parseDateTime(value: string | number | Date) {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === 'number') {
    return new Date(value)
  }

  const normalized = value.trim()
  const sqliteUtcDateTime = normalized.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?)$/)
  if (sqliteUtcDateTime) {
    return new Date(`${sqliteUtcDateTime[1]}T${sqliteUtcDateTime[2]}Z`)
  }

  return new Date(normalized)
}

function formatDateTime(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'

  const date = parseDateTime(value)
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
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) {
    return '-'
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }

  return `${(ms / 1000).toFixed(1)}秒`
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

function formatCountPair(current: unknown, total: unknown, suffix = '题') {
  const currentValue = Number(current)
  const totalValue = Number(total)
  if (!Number.isFinite(currentValue) || !Number.isFinite(totalValue)) {
    return '-'
  }

  return `${currentValue}/${totalValue}${suffix}`
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

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function formatPlainStringList(value: unknown) {
  const labels = normalizeStringArray(value)
  return labels.length > 0 ? labels.join(' / ') : '-'
}

const emotionMirrorScenarioLabelMap: Record<string, string> = {
  'sticker-gift': '好友送来星星贴纸',
  'tower-fell': '积木塔倒下来',
  'marker-snatched': '画笔被抢走了',
  'thunder-window': '窗外突然打雷',
  'slide-turn': '终于轮到滑滑梯',
  'balloon-flew-away': '气球飞走了',
  'surprise-box': '盒子里跳出小灯球',
  'public-praise': '老师当众表扬',
  'puzzle-pushed': '拼图被推乱了',
  'dog-bark': '陌生小狗突然叫',
  'mask-jump': '朋友戴上奇怪面具',
  'birthday-song': '大家一起唱生日快乐',
}

const emotionMirrorEmotionLabelMap: Record<string, string> = {
  happy: '开心',
  sad: '难过',
  angry: '生气',
  scared: '害怕',
  surprised: '惊讶',
  shy: '害羞',
}

const giftMatchRecipientLabelMap: Record<string, string> = {
  linlin: '琳琳',
  haohao: '浩浩',
  mimi: '咪咪',
  dongdong: '东东',
  xiaoyu: '小雨',
  qiqi: '琪琪',
  leilei: '乐乐',
  nana: '娜娜',
}

const giftMatchGiftLabelMap: Record<string, string> = {
  storybook: '图画书',
  soccerBall: '足球',
  stickerSet: '星星贴纸',
  puzzleBox: '拼图盒',
  paintKit: '画笔盒彩绘',
  plushBear: '抱抱小熊',
  musicBox: '音乐盒',
  toyTrain: '小火车',
}

const giftMatchThemeLabelMap: Record<string, string> = {
  'sunny-party': '暖阳分享派对',
  'garden-table': '花园礼物桌',
  'rainbow-room': '彩虹庆祝屋',
}

const recyclingItemLabelMap: Record<string, string> = {
  newspaper: '旧报纸',
  'cardboard-box': '纸盒',
  'drawing-paper': '卡纸',
  'plastic-bottle': '塑料瓶',
  'yogurt-cup': '酸奶杯',
  'plastic-tray': '塑料盒',
  'banana-peel': '香蕉皮',
  'apple-core': '苹果核',
  'vegetable-leaf': '菜叶',
}

const recyclingBinLabelMap: Record<string, string> = {
  paper: '纸类桶',
  plastic: '塑料桶',
  food: '厨余桶',
}

const moodMeterMoodLabelMap: Record<string, string> = {
  calm: '平静',
  shy: '有点紧张',
  sad: '难过',
  angry: '生气',
  overwhelmed: '很乱很满',
}

const moodMeterSupportLabelMap: Record<string, string> = {
  'slow-breath': '慢慢呼吸 3 次',
  'quiet-corner': '先去安静角落',
  'hug-pillow': '抱一抱抱枕',
  'count-down': '跟着数到 5',
  'soft-music': '听一段轻音乐',
  'squeeze-ball': '捏一捏解压球',
  'ask-help': '告诉老师我需要帮忙',
  stretch: '伸一伸肩膀和手臂',
}

const washHandsStepLabelMap: Record<string, string> = {
  'open-water': '打开水龙头',
  'wet-hands': '双手打湿',
  soap: '按洗手液',
  scrub: '左右搓洗',
  rinse: '冲掉泡泡',
  'close-water': '关掉水龙头',
}

function formatEmotionMirrorScenarioList(value: unknown) {
  const labels = normalizeStringArray(value).map((scenarioId) => {
    return emotionMirrorScenarioLabelMap[scenarioId] || '其他观察场景'
  })

  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatEmotionMirrorEmotionList(value: unknown) {
  const labels = normalizeStringArray(value).map((emotionId) => {
    return emotionMirrorEmotionLabelMap[emotionId] || '其他情绪'
  })

  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatGiftMatchRecipientList(value: unknown) {
  const labels = normalizeStringArray(value).map((recipientId) => {
    return giftMatchRecipientLabelMap[recipientId] || '其他小伙伴'
  })

  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatGiftMatchGiftList(value: unknown) {
  const labels = normalizeStringArray(value).map((giftId) => {
    return giftMatchGiftLabelMap[giftId] || '其他礼物'
  })

  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatGiftMatchPairList(value: unknown) {
  const labels = normalizeStringArray(value)
    .map((item) => {
      const [recipientId, giftId] = item.split(':')
      if (!recipientId || !giftId) {
        return ''
      }

      const recipientLabel = giftMatchRecipientLabelMap[recipientId] || '其他小伙伴'
      const giftLabel = giftMatchGiftLabelMap[giftId] || '其他礼物'
      return `${recipientLabel} ← ${giftLabel}`
    })
    .filter(Boolean)

  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatGiftMatchTheme(value: unknown) {
  const key = String(value || '').trim()
  if (!key) {
    return '-'
  }

  return giftMatchThemeLabelMap[key] || key
}

function formatRecyclingItemList(value: unknown) {
  const labels = normalizeStringArray(value).map((itemId) => recyclingItemLabelMap[itemId] || '其他物品')
  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatRecyclingBinList(value: unknown) {
  const labels = normalizeStringArray(value).map((binId) => recyclingBinLabelMap[binId] || '其他分类桶')
  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatMappedStringList(value: unknown, labelMap: Record<string, string>, fallback = '其他项') {
  const labels = normalizeStringArray(value).map((itemId) => labelMap[itemId] || fallback)
  return labels.length > 0 ? labels.join(' / ') : '-'
}

function formatResponseTimeList(value: unknown, itemLabel = '题') {
  if (!Array.isArray(value) || value.length === 0) {
    return '-'
  }

  const labels = value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 0)
    .map((item, index) => `第${index + 1}${itemLabel} ${formatResponseTime(item)}`)

  return labels.length > 0 ? labels.join(' / ') : '-'
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

  return '小游戏训练'
}

const summaryCards = computed<DetailRow[]>(() => {
  if (!record.value) return []

  const avgResponseTime =
    typeof record.value.avg_response_time === 'number' && Number.isFinite(record.value.avg_response_time)
      ? formatResponseTime(record.value.avg_response_time)
      : '-'

  return [
    { label: '训练状态', value: getStatusLabel(record.value.completion_status) },
    { label: '训练时长', value: formatDuration(record.value.duration) },
    { label: '估算正确率', value: formatPercent(record.value.accuracy_rate) },
    { label: '平均响应', value: avgResponseTime },
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
    case 'C02_PUDDLE':
      return [
        { label: '波纹次数', value: formatNullableNumber(raw.ripple_count, '次') },
        { label: '柔波命中', value: formatCountPair(raw.prompt_hits, raw.guided_prompt_count, '次') },
        { label: '双波纹', value: formatNullableNumber(raw.dual_touch_ripples, '次') },
        { label: '平均应答', value: formatResponseTime((raw.average_prompt_response_ms as number) ?? (raw.average_hold_ms as number)) },
      ]
    case 'C03_XYLOPHONE':
      return [
        { label: '总敲击数', value: formatNullableNumber(raw.note_tap_count, '次') },
        { label: '引导命中', value: formatCountPair(raw.prompt_hits, raw.guided_prompt_count, '次') },
        { label: '录制次数', value: formatNullableNumber(raw.recorded_phrase_count, '次') },
        { label: '回放次数', value: formatNullableNumber(raw.playback_count, '次') },
      ]
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
    case 'F02_STAR_TRACE':
      return [
        { label: '完成星座', value: formatCountPair(raw.completed_constellations, raw.target_constellation_count, '段') },
        { label: '命中星点', value: formatCountPair(raw.checkpoint_hits, raw.target_checkpoint_count, '点') },
        { label: '轨迹精度', value: formatPercent(raw.path_precision_ratio) },
        { label: '平均耗时', value: formatResponseTime(raw.average_constellation_ms as number) },
      ]
    case 'F03_RECYCLING':
      return [
        { label: '完成分拣', value: formatCountPair(raw.sorted_items, raw.target_item_count, '件') },
        { label: '错误投放', value: formatNullableNumber(raw.wrong_drops, '次') },
        { label: '漏掉物品', value: formatNullableNumber(raw.missed_items, '次') },
        { label: '平均分拣', value: formatResponseTime(raw.average_sort_ms as number) },
      ]
    case 'F04_TRACK_BUILD':
      return [
        { label: '修补轨道', value: formatCountPair(raw.correct_placements, raw.target_gap_count, '段') },
        { label: '完成线路', value: formatCountPair(raw.completed_layout_count, raw.target_layout_count, '条') },
        { label: '旋转调整', value: formatNullableNumber(raw.rotation_adjustments, '次') },
        { label: '平均修补', value: formatResponseTime(raw.average_placement_ms as number) },
      ]
    case 'F05_BALLOONS':
      return [
        { label: '成功刺破', value: formatNullableNumber(raw.successful_pops, '次') },
        { label: '过早点按', value: formatNullableNumber(raw.early_taps, '次') },
        { label: '漏掉窗口', value: formatNullableNumber(raw.missed_windows, '次') },
        { label: '最长连击', value: formatNullableNumber(raw.max_streak, '次') },
      ]
    case 'C05_MOOD_METER':
      return [
        { label: '当前心情', value: String(raw.selected_mood_label || '-') },
        { label: '温度区间', value: String(raw.selected_temperature_label || '-') },
        { label: '安抚选择', value: String(raw.support_card_label || '-') },
        { label: '匹配程度', value: formatPercent(raw.support_fit_score) },
      ]
    case 'L06_STEADY_SPOON':
      return [
        { label: '完成勺数', value: formatCountPair(raw.delivered_scoops, raw.target_scoops, '勺') },
        { label: '泼洒次数', value: formatNullableNumber(raw.spill_events, '次') },
        { label: '稳定送勺', value: formatPercent(raw.stable_motion_ratio) },
        { label: '平均送达', value: formatResponseTime(raw.average_delivery_ms as number) },
      ]
    case 'L07_BODY_SIGNAL':
      return [
        { label: '识别信号', value: formatCountPair(raw.recognized_signals, raw.target_rounds, '次') },
        { label: '认错次数', value: formatNullableNumber(raw.wrong_signal_choices, '次') },
        { label: '请求完成', value: formatNullableNumber(raw.requests_completed, '次') },
        { label: '平均响应', value: formatResponseTime(raw.average_response_ms as number) },
      ]
    case 'L08_TOWEL_TWIST':
      return [
        { label: '完成拧动', value: formatCountPair(raw.completed_twists, raw.target_twists, '次') },
        { label: '方向错误', value: formatNullableNumber(raw.direction_mismatches, '次') },
        { label: '协调占比', value: formatPercent(raw.coordinated_motion_ratio) },
        { label: '平均拧动', value: formatResponseTime(raw.average_twist_ms as number) },
      ]
    case 'L09_HOME_SOUND':
      return [
        { label: '来源匹配', value: formatNullableNumber(raw.source_matches, '次') },
        { label: '安全应对', value: formatNullableNumber(raw.safe_responses, '次') },
        { label: '错误选择', value: formatNullableNumber(raw.wrong_source_choices, '次') },
        { label: '平均响应', value: formatResponseTime(raw.average_response_ms as number) },
      ]
    case 'L10_MARKET_PAY':
      return [
        { label: '精确付款', value: formatCountPair(raw.exact_payments, raw.target_purchases, '件') },
        { label: '少付核对', value: formatNullableNumber(raw.underpayment_checks, '次') },
        { label: '多付核对', value: formatNullableNumber(raw.overpayment_checks, '次') },
        { label: '平均付款', value: formatResponseTime(raw.average_payment_ms as number) },
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
    case 'S02_EMOTION_MIRROR':
      return [
        { label: '完成题目', value: formatCountPair(raw.completed_rounds, raw.target_round_count) },
        { label: '首答命中', value: formatNullableNumber(raw.first_try_correct_count, '题') },
        { label: '重试次数', value: formatNullableNumber(raw.wrong_attempts, '次') },
        { label: '平均反应', value: formatResponseTime(raw.average_response_ms as number) },
      ]
    case 'S03_STORY_SEQ':
      return [
        { label: '完成故事', value: formatCountPair(raw.completed_stories, raw.target_story_count, '段') },
        { label: '排序成功', value: formatCountPair(raw.correct_steps, raw.target_step_count, '步') },
        { label: '首轮命中', value: formatNullableNumber(raw.first_try_steps, '步') },
        { label: '平均排序', value: formatResponseTime(raw.average_step_ms as number) },
      ]
    case 'S01_BURGER':
      return [
        { label: '完成订单', value: formatCountPair(raw.completed_orders, raw.target_order_count, '个') },
        { label: '正确放置', value: formatCountPair(raw.correct_placements, raw.target_layer_count, '层') },
        { label: '误放次数', value: formatNullableNumber(raw.wrong_placements, '次') },
        { label: '平均放置', value: formatResponseTime(raw.average_turn_ms as number) },
      ]
    case 'S04_GIFT_MATCH':
      return [
        { label: '完成配对', value: formatCountPair(raw.correct_matches, raw.pair_target_count, '组') },
        { label: '首次命中', value: formatNullableNumber(raw.first_try_matches, '组') },
        { label: '错误拖放', value: formatNullableNumber(raw.wrong_matches, '次') },
        { label: '平均配对', value: formatResponseTime(raw.average_match_ms as number) },
      ]
    case 'S05_ECHO_PARROT':
      return [
        { label: '完成回合', value: formatCountPair(raw.completed_rounds, raw.target_round_count, '轮') },
        { label: '首轮模仿', value: formatNullableNumber(raw.first_try_rounds, '轮') },
        { label: '短句重试', value: formatNullableNumber(raw.short_attempts, '次') },
        { label: '平均回应', value: formatResponseTime(raw.average_response_ms as number) },
      ]
    case 'S06_EXPRESSION_DUEL':
      return [
        { label: '平均相似度', value: formatPercent(raw.average_similarity_ratio) },
        { label: '最高相似度', value: formatPercent(raw.best_similarity_ratio) },
        { label: '完成回合', value: formatCountPair(raw.completed_rounds, raw.target_round_count, '轮') },
        { label: '平均模仿', value: formatResponseTime(raw.average_mimic_duration_ms as number) },
      ]
    default:
      return []
  }
})

const rawRows = computed<DetailRow[]>(() => {
  if (!record.value) return []

  const raw = record.value.raw_data || {}

  switch (record.value.game_code) {
    case 'C02_PUDDLE':
      return [
        { label: '波纹次数', value: formatNullableNumber(raw.ripple_count, '次') },
        { label: '柔波命中', value: formatCountPair(raw.prompt_hits, raw.guided_prompt_count, '次') },
        { label: '错过光圈', value: formatNullableNumber(raw.prompt_misses, '次') },
        { label: '双波纹', value: formatNullableNumber(raw.dual_touch_ripples, '次') },
        { label: '最大同时触点', value: formatNullableNumber(raw.max_concurrent_touches, '点') },
        { label: '长按扩散', value: formatNullableNumber(raw.hold_generated_ripples, '次') },
        { label: '平均按住', value: formatResponseTime(raw.average_hold_ms as number) },
        { label: '平均应答', value: formatResponseTime(raw.average_prompt_response_ms as number) },
        { label: '按住样本', value: formatResponseTimeList(raw.hold_samples_ms, '次') },
        { label: '应答记录', value: formatResponseTimeList(raw.prompt_response_times_ms, '次') },
        { label: '光圈半径', value: formatNullableNumber(raw.prompt_radius_px, ' px') },
        { label: '自由轻点模式', value: formatBooleanLabel(raw.free_play_mode) },
        { label: '场景主题', value: String(raw.session_theme_title || '-') },
      ]
    case 'C03_XYLOPHONE':
      return [
        { label: '总敲击数', value: formatNullableNumber(raw.note_tap_count, '次') },
        { label: '不同音条', value: formatNullableNumber(raw.unique_note_count, '种') },
        { label: '录制次数', value: formatNullableNumber(raw.recorded_phrase_count, '次') },
        { label: '回放次数', value: formatNullableNumber(raw.playback_count, '次') },
        { label: '引导命中', value: formatCountPair(raw.prompt_hits, raw.guided_prompt_count, '次') },
        { label: '提示失误', value: formatNullableNumber(raw.prompt_misses, '次') },
        { label: '完成提示序列', value: formatNullableNumber(raw.guided_sequence_completions, '组') },
        { label: '平均提示应答', value: formatResponseTime(raw.average_prompt_response_ms as number) },
        { label: '平均敲击间隔', value: formatResponseTime(raw.average_tap_interval_ms as number) },
        { label: '提示应答记录', value: formatResponseTimeList(raw.prompt_response_times_ms, '次') },
        { label: '敲击间隔记录', value: formatResponseTimeList(raw.tap_intervals_ms, '次') },
        { label: '最近旋律', value: formatPlainStringList(raw.recorded_note_labels) },
        { label: '最近提示序列', value: formatPlainStringList(raw.last_guided_sequence_labels) },
        { label: '手动完成', value: formatBooleanLabel(raw.manual_complete) },
        { label: '场景主题', value: String(raw.session_theme_title || '-') },
      ]
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
    case 'F02_STAR_TRACE':
      return [
        { label: '完成星座', value: formatCountPair(raw.completed_constellations, raw.target_constellation_count, '段') },
        { label: '命中星点', value: formatCountPair(raw.checkpoint_hits, raw.target_checkpoint_count, '点') },
        { label: '在轨样本', value: formatNullableNumber(raw.on_path_samples, '次') },
        { label: '偏离样本', value: formatNullableNumber(raw.off_path_samples, '次') },
        { label: '平均偏移', value: formatNullableNumber(raw.average_deviation_px, ' px') },
        { label: '总轨迹长', value: formatNullableNumber(raw.trace_distance_px, ' px') },
        { label: '重来次数', value: formatNullableNumber(raw.aborted_traces, '次') },
        { label: '各轮耗时', value: formatResponseTimeList(raw.constellation_durations_ms, '段') },
        { label: '星座清单', value: formatPlainStringList(raw.constellation_titles) },
        { label: '已完成星座', value: formatPlainStringList(raw.completed_constellation_titles) },
        { label: '夜空主题', value: String(raw.session_theme_title || '-') },
      ]
    case 'F03_RECYCLING':
      return [
        { label: '完成分拣', value: formatCountPair(raw.sorted_items, raw.target_item_count, '件') },
        { label: '错误投放', value: formatNullableNumber(raw.wrong_drops, '次') },
        { label: '漏掉物品', value: formatNullableNumber(raw.missed_items, '次') },
        { label: '总拖拽数', value: formatNullableNumber(raw.total_drags, '次') },
        { label: '平均分拣', value: formatResponseTime(raw.average_sort_ms as number) },
        { label: '各次耗时', value: formatResponseTimeList(raw.sort_times_ms, '次') },
        { label: '掉落物品', value: formatRecyclingItemList(raw.queue_item_ids) },
        { label: '已分拣物品', value: formatRecyclingItemList(raw.sorted_item_ids) },
        { label: '投放分类桶', value: formatRecyclingBinList(raw.sorted_bin_ids) },
        { label: '分类桶', value: formatPlainStringList(raw.bin_labels) },
        { label: '掉落速度', value: `${formatNullableNumber(raw.fall_speed_min_px, ' px/s')} - ${formatNullableNumber(raw.fall_speed_max_px, ' px/s')}` },
        { label: '场景主题', value: String(raw.session_theme_title || '-') },
      ]
    case 'F04_TRACK_BUILD':
      return [
        { label: '修补轨道', value: formatCountPair(raw.correct_placements, raw.target_gap_count, '段') },
        { label: '完成线路', value: formatCountPair(raw.completed_layout_count, raw.target_layout_count, '条') },
        { label: '错误放置', value: formatNullableNumber(raw.wrong_placements, '次') },
        { label: '旋转调整', value: formatNullableNumber(raw.rotation_adjustments, '次') },
        { label: '选取轨道件', value: formatNullableNumber(raw.piece_selections, '次') },
        { label: '平均修补', value: formatResponseTime(raw.average_placement_ms as number) },
        { label: '平均线路', value: formatResponseTime(raw.average_layout_ms as number) },
        { label: '各段耗时', value: formatResponseTimeList(raw.placement_times_ms, '段') },
        { label: '各线耗时', value: formatResponseTimeList(raw.layout_durations_ms, '条') },
        { label: '线路清单', value: formatPlainStringList(raw.layout_titles) },
        { label: '已完成线路', value: formatPlainStringList(raw.completed_layout_titles) },
        { label: '已放轨道件', value: formatPlainStringList(raw.placed_piece_labels) },
        { label: '控制模式', value: String(raw.control_mode || '-') },
        { label: '场景主题', value: String(raw.session_theme_title || '-') },
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
    case 'C05_MOOD_METER':
      return [
        { label: '当前心情', value: String(raw.selected_mood_label || '-') },
        { label: '温度区间', value: String(raw.selected_temperature_label || '-') },
        { label: '安抚卡', value: String(raw.support_card_label || '-') },
        { label: '匹配程度', value: formatPercent(raw.support_fit_score) },
        { label: '提示次数', value: formatNullableNumber(raw.prompt_count, '次') },
        { label: '最高提示', value: formatNullableNumber(raw.highest_prompt_level, '级') },
        { label: '各次选择', value: formatResponseTimeList(raw.choice_times_ms, '次') },
        { label: '可选心情', value: formatMappedStringList(raw.available_mood_ids, moodMeterMoodLabelMap, '其他心情') },
        { label: '可选安抚卡', value: formatMappedStringList(raw.available_support_ids, moodMeterSupportLabelMap, '其他安抚方式') },
      ]
    case 'L06_STEADY_SPOON':
      return [
        { label: '目标勺数', value: formatNullableNumber(raw.target_scoops, '勺') },
        { label: '完成勺数', value: formatNullableNumber(raw.delivered_scoops, '勺') },
        { label: '泼洒次数', value: formatNullableNumber(raw.spill_events, '次') },
        { label: '稳定送勺占比', value: formatPercent(raw.stable_motion_ratio) },
        { label: '路径偏移', value: formatPercent(raw.path_deviation_ratio) },
        { label: '重新抓握', value: formatNullableNumber(raw.regrasp_count, '次') },
        { label: '提示次数', value: formatNullableNumber(raw.hint_count, '次') },
        { label: '各次送达', value: formatResponseTimeList(raw.delivery_times_ms, '次') },
        { label: '平均送达', value: formatResponseTime(raw.average_delivery_ms as number) },
        { label: '总耗时', value: formatNullableNumber(raw.total_duration_seconds, '秒') },
      ]
    case 'L07_BODY_SIGNAL':
      return [
        { label: '目标轮数', value: formatNullableNumber(raw.target_rounds, '轮') },
        { label: '识别信号', value: formatNullableNumber(raw.recognized_signals, '次') },
        { label: '认错次数', value: formatNullableNumber(raw.wrong_signal_choices, '次') },
        { label: '请求完成', value: formatNullableNumber(raw.requests_completed, '次') },
        { label: '松手次数', value: formatNullableNumber(raw.request_hold_breaks, '次') },
        { label: '提示次数', value: formatNullableNumber(raw.hint_count, '次') },
        { label: '各次响应', value: formatResponseTimeList(raw.response_times_ms, '次') },
        { label: '平均响应', value: formatResponseTime(raw.average_response_ms as number) },
        { label: '总耗时', value: formatNullableNumber(raw.total_duration_seconds, '秒') },
      ]
    case 'L08_TOWEL_TWIST':
      return [
        { label: '目标拧动', value: formatNullableNumber(raw.target_twists, '次') },
        { label: '完成拧动', value: formatNullableNumber(raw.completed_twists, '次') },
        { label: '方向错误', value: formatNullableNumber(raw.direction_mismatches, '次') },
        { label: '松手次数', value: formatNullableNumber(raw.grip_releases, '次') },
        { label: '协调占比', value: formatPercent(raw.coordinated_motion_ratio) },
        { label: '提示次数', value: formatNullableNumber(raw.hint_count, '次') },
        { label: '各次拧动', value: formatResponseTimeList(raw.twist_times_ms, '次') },
        { label: '平均拧动', value: formatResponseTime(raw.average_twist_ms as number) },
        { label: '总耗时', value: formatNullableNumber(raw.total_duration_seconds, '秒') },
      ]
    case 'L09_HOME_SOUND':
      return [
        { label: '目标轮数', value: formatNullableNumber(raw.target_rounds, '轮') },
        { label: '来源匹配', value: formatNullableNumber(raw.source_matches, '次') },
        { label: '来源选错', value: formatNullableNumber(raw.wrong_source_choices, '次') },
        { label: '安全应对', value: formatNullableNumber(raw.safe_responses, '次') },
        { label: '不安全选择', value: formatNullableNumber(raw.unsafe_response_choices, '次') },
        { label: '重播次数', value: formatNullableNumber(raw.replay_count, '次') },
        { label: '提示次数', value: formatNullableNumber(raw.hint_count, '次') },
        { label: '各次响应', value: formatResponseTimeList(raw.response_times_ms, '次') },
        { label: '平均响应', value: formatResponseTime(raw.average_response_ms as number) },
        { label: '总耗时', value: formatNullableNumber(raw.total_duration_seconds, '秒') },
      ]
    case 'L10_MARKET_PAY':
      return [
        { label: '目标件数', value: formatNullableNumber(raw.target_purchases, '件') },
        { label: '完成件数', value: formatNullableNumber(raw.completed_purchases, '件') },
        { label: '精确付款', value: formatNullableNumber(raw.exact_payments, '次') },
        { label: '少付核对', value: formatNullableNumber(raw.underpayment_checks, '次') },
        { label: '多付核对', value: formatNullableNumber(raw.overpayment_checks, '次') },
        { label: '错误核对', value: formatNullableNumber(raw.incorrect_payment_checks, '次') },
        { label: '纠错动作', value: formatNullableNumber(raw.correction_actions, '次') },
        { label: '投放硬币', value: formatNullableNumber(raw.coins_placed, '枚') },
        { label: '提示次数', value: formatNullableNumber(raw.hint_count, '次') },
        { label: '各次付款', value: formatResponseTimeList(raw.payment_times_ms, '次') },
        { label: '平均付款', value: formatResponseTime(raw.average_payment_ms as number) },
        { label: '总耗时', value: formatNullableNumber(raw.total_duration_seconds, '秒') },
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
    case 'S02_EMOTION_MIRROR':
      return [
        { label: '本轮完成', value: formatCountPair(raw.completed_rounds, raw.target_round_count) },
        { label: '每题选项', value: formatNullableNumber(raw.option_count, '张') },
        { label: '首答命中', value: formatNullableNumber(raw.first_try_correct_count, '题') },
        { label: '总选择次数', value: formatNullableNumber(raw.total_selections, '次') },
        { label: '估算正确率', value: formatPercent(raw.accuracy_ratio) },
        { label: '平均反应', value: formatResponseTime(raw.average_response_ms as number) },
        { label: '各题反应', value: formatResponseTimeList(raw.response_times_ms) },
        { label: '出题场景', value: formatEmotionMirrorScenarioList(raw.scenario_ids) },
        { label: '目标情绪', value: formatEmotionMirrorEmotionList(raw.scenario_emotions) },
      ]
    case 'S03_STORY_SEQ':
      return [
        { label: '完成故事', value: formatCountPair(raw.completed_stories, raw.target_story_count, '段') },
        { label: '完成步数', value: formatCountPair(raw.correct_steps, raw.target_step_count, '步') },
        { label: '总拖拽数', value: formatNullableNumber(raw.total_drags, '次') },
        { label: '排序失误', value: formatNullableNumber(raw.wrong_steps, '次') },
        { label: '平均排序', value: formatResponseTime(raw.average_step_ms as number) },
        { label: '各步耗时', value: formatResponseTimeList(raw.response_times_ms, '步') },
        { label: '故事清单', value: formatPlainStringList(raw.story_titles) },
        { label: '目标顺序', value: formatPlainStringList(raw.story_target_orders) },
        { label: '已完成故事', value: formatPlainStringList(raw.completed_story_titles) },
        { label: '已接步骤', value: formatPlainStringList(raw.placed_step_labels) },
        { label: '排序记录', value: formatPlainStringList(raw.placement_logs) },
        { label: '故事主题', value: String(raw.session_theme_title || '-') },
      ]
    case 'S01_BURGER':
      return [
        { label: '完成订单', value: formatCountPair(raw.completed_orders, raw.target_order_count, '个') },
        { label: '完成层数', value: formatCountPair(raw.completed_layer_count, raw.target_layer_count, '层') },
        { label: '首轮命中', value: formatNullableNumber(raw.first_try_layers, '层') },
        { label: '总放置数', value: formatNullableNumber(raw.total_actions, '次') },
        { label: '平均放置', value: formatResponseTime(raw.average_turn_ms as number) },
        { label: '各次耗时', value: formatResponseTimeList(raw.turn_times_ms, '次') },
        { label: '参与学生', value: formatPlainStringList(raw.participant_names) },
        { label: '订单清单', value: formatPlainStringList(raw.recipe_titles) },
        { label: '已完成订单', value: formatPlainStringList(raw.completed_recipe_titles) },
        { label: '已放配料', value: formatPlainStringList(raw.completed_layer_labels) },
        { label: '轮流摘要', value: formatPlainStringList(raw.participant_turn_summary) },
        { label: '放置记录', value: formatPlainStringList(raw.turn_log_labels) },
        { label: '厨房主题', value: String(raw.session_theme_title || '-') },
        { label: '起始学生', value: String(raw.starting_player_name || '-') },
      ]
    case 'S04_GIFT_MATCH':
      return [
        { label: '完成配对', value: formatCountPair(raw.correct_matches, raw.pair_target_count, '组') },
        { label: '礼物总数', value: formatNullableNumber(raw.gift_count, '份') },
        { label: '干扰礼物', value: formatNullableNumber(raw.distractor_gift_count, '份') },
        { label: '总拖拽数', value: formatNullableNumber(raw.total_drags, '次') },
        { label: '估算准确率', value: formatPercent(raw.accuracy_ratio as number) },
        { label: '平均配对', value: formatResponseTime(raw.average_match_ms as number) },
        { label: '各次耗时', value: formatResponseTimeList(raw.match_times_ms) },
        { label: '分享伙伴', value: formatGiftMatchRecipientList(raw.recipient_ids) },
        { label: '目标礼物', value: formatGiftMatchGiftList(raw.expected_gift_ids) },
        { label: '配对顺序', value: formatGiftMatchPairList(raw.matched_pairs) },
        { label: '派对主题', value: formatGiftMatchTheme(raw.session_theme) },
      ]
    case 'S05_ECHO_PARROT':
      return [
        { label: '完成回合', value: formatCountPair(raw.completed_rounds, raw.target_round_count, '轮') },
        { label: '首轮模仿', value: formatNullableNumber(raw.first_try_rounds, '轮') },
        { label: '模仿尝试', value: formatNullableNumber(raw.voice_attempt_count, '次') },
        { label: '提示重播', value: formatNullableNumber(raw.prompt_replays, '次') },
        { label: '短句重试', value: formatNullableNumber(raw.short_attempts, '次') },
        { label: '平均回应', value: formatResponseTime(raw.average_response_ms as number) },
        { label: '平均发声', value: formatResponseTime(raw.average_voice_ms as number) },
        { label: '最长连续发声', value: formatResponseTime(raw.max_continuous_voice_ms as number) },
        { label: '峰值音量', value: formatNullableNumber(raw.mapped_peak_db, ' dB') },
        { label: '噪声基线', value: formatNullableNumber(raw.noise_floor_dbfs, ' dBFS') },
        { label: '发声阈值', value: formatNullableNumber(raw.voice_threshold_dbfs, ' dBFS') },
        { label: '麦克风授权', value: raw.mic_permission_granted ? '是' : '否' },
        { label: '目标短句', value: formatPlainStringList(raw.target_phrase_labels) },
        { label: '已完成短句', value: formatPlainStringList(raw.completed_phrase_labels) },
        { label: '动物清单', value: formatPlainStringList(raw.animal_labels) },
        { label: '场景主题', value: String(raw.session_theme_title || '-') },
      ]
    case 'S06_EXPRESSION_DUEL':
      return [
        { label: '完成回合', value: formatCountPair(raw.completed_rounds, raw.target_round_count, '轮') },
        { label: '平均相似度', value: formatPercent(raw.average_similarity_ratio) },
        { label: '最高相似度', value: formatPercent(raw.best_similarity_ratio) },
        { label: '最低相似度', value: formatPercent(raw.lowest_similarity_ratio) },
        { label: '提前达标', value: formatNullableNumber(raw.early_success_rounds, '轮') },
        { label: '平均模仿时长', value: formatResponseTime(raw.average_mimic_duration_ms as number) },
        { label: '各轮模仿时长', value: formatResponseTimeList(raw.mimic_duration_ms_list, '轮') },
        { label: '参与学生', value: formatPlainStringList(raw.participant_names) },
        { label: '左右得分', value: raw.participant_scores ? `左 ${formatNullableNumber(raw.participant_scores.left, '分')} / 右 ${formatNullableNumber(raw.participant_scores.right, '分')}` : '-' },
        { label: '教师加分', value: raw.teacher_bonus_scores ? `左 ${formatNullableNumber(raw.teacher_bonus_scores.left, '分')} / 右 ${formatNullableNumber(raw.teacher_bonus_scores.right, '分')}` : '-' },
        { label: '镜头模式', value: String(raw.camera_mode || '-') },
        { label: '镜头设备', value: String(raw.camera_device_label || '-') },
        { label: '检测镜头数', value: formatNullableNumber(raw.detected_camera_count, '个') },
        { label: '轮次记录', value: formatPlainStringList(raw.round_logs) },
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
    console.error('加载小游戏记录失败:', error)
    ElMessage.error('加载小游戏记录失败')
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
