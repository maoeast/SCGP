<template>
  <div class="page-container scgp-admin-page student-detail-page" v-loading="loading">
    <div class="page-header student-detail-header">
      <div class="header-left">
        <div class="student-detail-heading">
          <el-button class="back-button" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>

          <div class="header-copy">
            <h1>学生详情</h1>
            <p class="subtitle">
              {{ student?.name || '当前学生' }} · 查看基本资料、分班状态与评估训练记录
            </p>
          </div>
        </div>
      </div>

      <div class="header-right">
        <el-button :icon="Calendar" @click="goAssessment">发起评估</el-button>
        <el-button :icon="DataLine" @click="goEquipmentRecord">记训练</el-button>
        <el-button type="primary" :icon="Edit" @click="editStudent">
          编辑信息
        </el-button>
      </div>
    </div>

    <section class="detail-hero">
      <article class="profile-card">
        <div class="profile-card__hero">
          <div class="profile-card__avatar-shell">
            <StudentAvatar
              :name="student?.name"
              :gender="student?.gender"
              :avatar-url="student?.avatar_path"
              size="lg"
            />
          </div>

          <div class="profile-card__identity">
            <h2>{{ student?.name || '未命名' }}</h2>

            <div class="profile-card__meta">
              <StudentId :id="student?.student_no" :full="true" />
              <DiagnosisTag :type="student?.disorder" />
              <span
                class="class-pill"
                :class="{ 'class-pill--unassigned': !student?.current_class_name }"
              >
                {{ currentClassLabel }}
              </span>
            </div>
            <!-- 月龄-年级对应性软提示：跳级（年龄未达常规）≥1 级即出现；留级≥2 级才出现（特教延迟入学属正常仅作核对） -->
            <p v-if="gradeAgeHint" class="grade-age-hint" role="note">
              <el-icon><WarningFilled /></el-icon>
              {{ gradeAgeHint }}
            </p>
          </div>
        </div>

        <div class="profile-card__facts">
          <article
            v-for="fact in detailFacts"
            :key="fact.label"
            class="fact-card"
          >
            <span class="fact-card__label">{{ fact.label }}</span>
            <strong class="fact-card__value">{{ fact.value }}</strong>
          </article>

          <!-- AI 记忆置顶摘要：展示已确认置顶/关键记忆，教师无需翻面板即可看到关键信息（用户 2026-09-19 约定） -->
          <div
            v-if="aiStore.memoryEnabled && pinnedMemories.length > 0"
            class="memory-highlights fact-card--wide"
          >
            <div
              v-for="memory in pinnedMemories"
              :key="memory.id"
              class="memory-highlights__item"
            >
              <span
                class="memory-highlights__badge"
                :class="{ 'memory-highlights__badge--safety': memory.priority === 'safety_critical' }"
              >
                {{ memory.priority === 'safety_critical' ? '关键' : '置顶' }}
              </span>
              <span class="memory-highlights__content">{{ memory.content }}</span>
            </div>
          </div>

          <!-- AI 记忆（服务团队共享；管理员启用后显示；数量卡入口，点击切到下方相关记录的 AI 记忆标签） -->
          <article
            v-if="aiStore.memoryEnabled"
            class="fact-card fact-card--wide fact-card--memory"
            role="button"
            tabindex="0"
            @click="openMemoryTab"
            @keydown.enter.prevent="openMemoryTab"
            @keydown.space.prevent="openMemoryTab"
          >
            <div class="fact-card__memory-head">
              <span class="fact-card__label">AI 记忆</span>
              <span class="fact-card__memory-link">点击查看 →</span>
            </div>
            <strong class="fact-card__memory-total">{{ memoryPendingCount + memoryConfirmedCount }}</strong>
            <span class="fact-card__memory-count">
              待确认 {{ memoryPendingCount }} · 已确认 {{ memoryConfirmedCount }}
            </span>
          </article>
        </div>
      </article>

      <article class="overview-card">
        <div class="overview-card__intro">
          <div class="overview-card__copy">
            <h2>{{ activeTabMeta.title }}</h2>
            <p>{{ activeTabMeta.description }}</p>
          </div>

          <div class="overview-card__focus">
            <span class="overview-card__focus-label">当前查看</span>
            <strong class="overview-card__focus-value">{{ activeTabMeta.badge }}</strong>
            <span class="overview-card__focus-meta">{{ activeTabCount }} 条记录</span>
          </div>
        </div>

        <div class="stats-grid">
          <button
            v-for="metric in detailMetrics"
            :key="metric.key"
            type="button"
            :class="[
              'stat-card',
              `stat-card--${metric.tone}`,
              { 'is-active': activeTab === metric.key },
            ]"
            @click="activeTab = metric.key"
          >
            <div class="stat-card__top">
              <span class="stat-card__glyph">{{ metric.glyph }}</span>
              <span class="stat-card__action">点击查看</span>
            </div>
            <div class="stat-card__number">{{ metric.value }}</div>
            <div class="stat-card__label">{{ metric.label }}</div>
            <div class="stat-card__hint">{{ metric.hint }}</div>
          </button>
        </div>

        <!-- 所属班级/诊断类型/使用方式三卡已删（用户 2026-09-19 约定）：班级与诊断已在左侧学生信息区展示，使用方式自明 -->

        <!-- 训练画像摘要条（用户 2026-09-19 约定）：最近活动一屏可见 -->
        <div class="activity-strip">
          <span class="activity-strip__item">
            <span class="activity-strip__label">最近评估</span>
            <strong class="activity-strip__value">{{ latestAssessmentLabel }}</strong>
          </span>
          <span class="activity-strip__divider" aria-hidden="true"></span>
          <span class="activity-strip__item">
            <span class="activity-strip__label">最近训练</span>
            <strong class="activity-strip__value">{{ latestTrainingLabel }}</strong>
          </span>
          <span class="activity-strip__divider" aria-hidden="true"></span>
          <span class="activity-strip__item">
            <span class="activity-strip__label">本月训练</span>
            <strong class="activity-strip__value">{{ monthlyTrainingCount }} 次</strong>
          </span>
        </div>
      </article>
    </section>

    <section
      v-if="student?.id"
      ref="recordsSectionRef"
      class="main-content student-detail-main"
    >
      <div class="records-shell">
        <div class="records-shell__header">
          <div class="records-shell__title">
            <h2>相关记录</h2>
            <p>按学生维度查看评估、器材训练、游戏训练历史与 AI 记忆，支持直接跳转到明细页。</p>
          </div>

          <div class="records-shell__summary">
            <span class="records-shell__summary-label">当前查看</span>
            <strong class="records-shell__summary-value">{{ activeTabMeta.badge }}</strong>
            <span class="records-shell__summary-meta">{{ activeTabCount }} 条记录</span>
          </div>
        </div>

        <el-tabs v-model="activeTab" class="records-tabs" stretch>
          <el-tab-pane :label="`评估记录 (${assessmentCount})`" name="assessments" lazy>
            <AssessmentRecordsPanel :student-id="student.id" :table-max-height="520" />
          </el-tab-pane>

          <el-tab-pane :label="`器材训练 (${equipmentCount})`" name="equipment" lazy>
            <EquipmentRecordsPanel
              :student-id="student.id"
              :hide-student-filter="true"
              :table-max-height="520"
              @view-detail="viewEquipmentRecord"
            />
          </el-tab-pane>

          <el-tab-pane :label="`游戏训练 (${gameCount})`" name="games" lazy>
            <GameRecordsPanel
              :student-id="student.id"
              :hide-student-filter="true"
              :table-max-height="520"
              @view-detail="viewGameRecord"
            />
          </el-tab-pane>

          <el-tab-pane v-if="aiStore.memoryEnabled" :label="`AI 记忆 (${memoryPendingCount + memoryConfirmedCount})`" name="memory" lazy>
            <StudentMemoryPanel :student-id="student.id" @updated="refreshMemoryCounts" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </section>

    <AddStudentDialog
      v-if="showEditDialog"
      :editing-student="student || undefined"
      @close="showEditDialog = false"
      @saved="handleStudentUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Calendar, DataLine, Edit, WarningFilled } from '@element-plus/icons-vue'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import DiagnosisTag from '@/components/student/DiagnosisTag.vue'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import StudentId from '@/components/student/StudentId.vue'
import { EquipmentTrainingAPI, GameTrainingAPI, TrainingSessionAPI } from '@/database/api'
import { classAPI } from '@/database/class-api'
import { EmotionalGamesAPI } from '@/database/emotional-games-api'
import { checkGradeAgeMatch } from '@/types/class'
import { TASK_TRAINING_RESOURCE_TYPE } from '@/features/self-care/task-training-contract'
import { useStudentStore, type Student } from '@/stores/student'
import { useAiStore } from '@/stores/ai'
import { formatStudentDate, getStudentAge } from '@/utils/student-display'
import { getTrainingEntry } from '@/utils/training-entry'
import AssessmentRecordsPanel from '@/views/student-detail/components/AssessmentRecordsPanel.vue'
import { getStudentAssessmentRecords } from '@/views/student-detail/assessment-records'
import EquipmentRecordsPanel from '@/views/training-records/components/EquipmentRecordsPanel.vue'
import GameRecordsPanel from '@/views/training-records/components/GameRecordsPanel.vue'
import StudentMemoryPanel from '@/views/student-detail/components/StudentMemoryPanel.vue'

type DetailTab = 'assessments' | 'equipment' | 'games' | 'memory'

const TAB_META: Record<DetailTab, { title: string; badge: string; description: string }> = {
  assessments: {
    title: '评估与量表记录',
    badge: '评估记录',
    description: '集中查看量表结果、评估时间与报告入口，快速回顾学生的发展基线。',
  },
  equipment: {
    title: '器材训练记录',
    badge: '器材训练',
    description: '回顾器材训练中的得分、提示等级、训练时长与评语表现。',
  },
  games: {
    title: '游戏训练记录',
    badge: '游戏训练',
    description: '查看游戏或情绪训练中的正确率、平均响应时间与训练详情。',
  },
  memory: {
    title: 'AI 记忆',
    badge: 'AI 记忆',
    description: '查看 AI 总结的学生记忆候选，确认后注入后续对话；支持优先级标记与删除。',
  },
}

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()
const aiStore = useAiStore()

const loading = ref(false)
const student = ref<Student | null>(null)
const activeTab = ref<DetailTab>('assessments')
const showEditDialog = ref(false)

const assessmentCount = ref(0)
const equipmentCount = ref(0)
const gameCount = ref(0)
const memoryPendingCount = ref(0)
const memoryConfirmedCount = ref(0)
const assessmentRecords = ref<ReturnType<typeof getStudentAssessmentRecords>>([])
const trainingTimestamps = ref<string[]>([])
const latestAssessmentRecord = ref<{ id: string; scaleLabel: string; createdAt: string } | null>(null)

const currentClassLabel = computed(() => student.value?.current_class_name || '未分班')

// 月龄-年级对应性软提示（不对称阈值——跳级 gap≥+1 即提示、留级 gap≤-2 才提示）：
// 年级数字经班级 API 按 current_class_id 反查
// （Student 类型含 current_class_id，getAllStudents 已查询该列；按 id 匹配比按名可靠——自定义班级名无全局唯一校验）
const currentClassGradeLevel = ref<number | null>(null)
const currentClassAcademicYear = ref<string | null>(null)
const gradeAgeHint = computed(() => {
  if (!student.value?.birthday || !student.value?.current_class_name) return ''
  return checkGradeAgeMatch(
    student.value.birthday,
    currentClassGradeLevel.value,
    currentClassAcademicYear.value ?? undefined
  ).message
})
function resolveCurrentClassGradeLevel() {
  currentClassGradeLevel.value = null
  currentClassAcademicYear.value = null
  if (!student.value?.current_class_id) return
  try {
    // 按学生表的 current_class_id 精确匹配（比按名反查可靠）；老师权限看不到该班级时降级为无提示
    const matched = classAPI.getClasses().find((cls) => cls.id === student.value?.current_class_id)
    currentClassGradeLevel.value = matched?.gradeLevel ?? null
    currentClassAcademicYear.value = matched?.academicYear ?? null
  } catch (error) {
    console.error('反查班级年级失败（年级核对提示降级跳过）:', error)
  }
}
const detailFacts = computed(() => [
  { label: '性别', value: student.value?.gender || '未设置' },
  { label: '年龄', value: student.value?.birthday ? `${getStudentAge(student.value.birthday)}岁` : '-' },
  { label: '出生日期', value: formatStudentDate(student.value?.birthday) },
  { label: '创建时间', value: formatStudentDate(student.value?.created_at) },
])
const detailMetrics = computed(() => [
  {
    key: 'assessments' as const,
    label: '评估记录',
    value: assessmentCount.value,
    hint: '量表结果与报告回顾',
    glyph: '评',
    tone: 'assessment',
  },
  {
    key: 'equipment' as const,
    label: '器材训练',
    value: equipmentCount.value,
    hint: '器材使用与训练反馈',
    glyph: '器',
    tone: 'equipment',
  },
  {
    key: 'games' as const,
    label: '游戏训练',
    value: gameCount.value,
    hint: '游戏表现与情绪会话',
    glyph: '游',
    tone: 'games',
  },
])
const activeTabMeta = computed(() => TAB_META[activeTab.value])
const activeTabCount = computed(() => {
  if (activeTab.value === 'memory') return memoryPendingCount.value + memoryConfirmedCount.value
  return detailMetrics.value.find((metric) => metric.key === activeTab.value)?.value ?? 0
})

// AI 记忆置顶摘要：已确认的置顶/关键记忆（最多 2 条，安全关键优先）
// 依赖 memoryVersion：面板内确认/置顶操作后强制重算（DB 查询非响应式）
// 排序直接依赖 listStudentMemories 的 DB 返回顺序（safety_critical 优先），不再 JS 重排
const pinnedMemories = computed(() => {
  void memoryVersion.value
  try {
    return aiStore
      .listStudentMemories(student.value?.id ?? 0, ['confirmed'])
      .filter((m) => m.priority === 'pinned' || m.priority === 'safety_critical')
      .slice(0, 2)
  } catch {
    return []
  }
})

// ===== 训练画像摘要条（用户 2026-09-19 约定）：最近评估/最近训练/本月训练 =====

function formatRelativeDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const latestAssessmentLabel = computed(() =>
  latestAssessmentRecord.value
    ? `${latestAssessmentRecord.value.scaleLabel} · ${formatRelativeDay(latestAssessmentRecord.value.createdAt)}`
    : '暂无',
)

const latestTrainingLabel = computed(() => {
  const timestamps = trainingTimestamps.value.filter(Boolean).sort()
  const latest = timestamps[timestamps.length - 1]
  return latest ? formatRelativeDay(latest) : '暂无'
})

const monthlyTrainingCount = computed(() => {
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return trainingTimestamps.value.filter((iso) => typeof iso === 'string' && iso.startsWith(monthPrefix)).length
})

// ===== 快捷操作（用户 2026-09-19 约定）：发起评估 / 记训练（问 AI 已删——右下角有全局 AI 助手悬浮窗，避免重复入口） =====

function goAssessment() {
  if (!student.value?.id) return
  // 走既有“先选量表→再选学生”流程（advisor：select-student 页需 scale 参数且无量表入口，直接跳会死胡同）
  router.push({ path: '/assessment' })
}

function goEquipmentRecord() {
  if (!student.value?.id) return
  router.push({
    path: `/equipment/records/${student.value.id}`,
  })
}

// AI 记忆数量卡点击：切到 memory 标签并滚动到相关记录区（advisor #2 跳转补齐）
const recordsSectionRef = ref<HTMLElement>()
function openMemoryTab() {
  activeTab.value = 'memory'
  recordsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 面板内确认/拒绝/删除后刷新数量卡（advisor #1 计数同步）
// memoryVersion 供 pinnedMemories 依赖以在置顶/确认操作后重算摘要（advisor r1 #3）
const memoryVersion = ref(0)
function refreshMemoryCounts() {
  if (!student.value?.id) return
  try {
    memoryPendingCount.value = aiStore.listStudentMemories(student.value.id, ['pending']).length
    memoryConfirmedCount.value = aiStore.listStudentMemories(student.value.id, ['confirmed']).length
    memoryVersion.value += 1
  } catch (error) {
    console.error('刷新 AI 记忆计数失败:', error)
  }
}

function goBack() {
  router.back()
}

function editStudent() {
  showEditDialog.value = true
}

async function handleStudentUpdated() {
  showEditDialog.value = false
  await loadStudentDetail()
  ElMessage.success('学生信息更新成功')
}

function viewEquipmentRecord(record: any) {
  const entry = getTrainingEntry(record.entry_code, record.module_code)

  router.push({
    path: `/equipment/records/${student.value?.id}`,
    query: {
      entry: entry.code,
      module: entry.moduleCode,
      recordId: String(record.id),
    },
  })
}

function viewGameRecord(record: any) {
  if (record.resource_type === TASK_TRAINING_RESOURCE_TYPE) {
    router.push({
      path: `/self-care/execute/${record.resource_id}/${record.student_id}`,
      query: {
        studentName: String(student.value?.name || '').trim() || undefined,
      },
    })
    return
  }

  if (record.record_source === 'emotional_game') {
    router.push({
      path: '/emotional/game-record',
      query: {
        recordId: String(record.id),
        studentId: String(record.student_id),
      },
    })
    return
  }

  const entry = getTrainingEntry(record.entry_code, record.module_code)

  if (entry.moduleCode === 'emotional') {
    router.push({
      path: '/emotional/session-summary',
      query: {
        studentId: String(record.student_id),
        trainingRecordId: String(record.id),
      },
    })
    return
  }

  router.push({
    path: '/games/report',
    query: {
      recordId: String(record.id),
      studentId: String(record.student_id),
    },
  })
}

async function loadStudentDetail() {
  try {
    loading.value = true
    const studentId = Number(route.params.id)

    if (!studentId) {
      ElMessage.error('缺少学生 ID')
      router.back()
      return
    }

    student.value = studentStore.students.find((item) => item.id === studentId) || null

    if (!student.value) {
      ElMessage.error('未找到该学生信息')
      router.back()
      return
    }

    // 月龄-年级核对提示需要年级数字，按班级 id 反查（失败降级跳过，不影响页面）
    resolveCurrentClassGradeLevel()

    assessmentRecords.value = getStudentAssessmentRecords(studentId)
    assessmentCount.value = assessmentRecords.value.length

    // 最近评估：取时间最新的一条（源函数已按时间降序返回，直接取首条）
    const latest = assessmentRecords.value.find((r) => r.createdAt) || null
    if (latest) {
      latestAssessmentRecord.value = {
        id: latest.id,
        scaleLabel: latest.scaleLabel,
        createdAt: latest.createdAt,
      }
    } else {
      latestAssessmentRecord.value = null
    }

    // 最近训练/本月训练：四路全量口径（用户 2026-09-19 拍板方案 a）——器材（训练日期优先于创建时间，
    // 补录语义正确）+ 游戏 + 情绪游戏 + 认知游戏统一会话。
    // ⚠️ 口径说明：相关记录的「游戏训练」标签列表在详情页嵌入时不显示认知会话（GameRecordsPanel 需
    // entryCode='cognitive' 才聚合该路），故页头计数可能高于标签列表行数——属已知取舍，非缺陷。
    const timestamps: string[] = []
    try {
      const equipmentApi = new EquipmentTrainingAPI()
      const equipmentRecords = equipmentApi.getStudentRecords(studentId)
      for (const record of equipmentRecords) {
        const semanticTime = record.training_date || record.created_at
        if (semanticTime) timestamps.push(semanticTime)
      }
      equipmentCount.value = equipmentRecords.length
    } catch (error) {
      console.error('加载器材训练记录失败:', error)
      equipmentCount.value = 0
    }

    try {
      const gameApi = new GameTrainingAPI()
      const emotionalGamesApi = new EmotionalGamesAPI()
      const trainingSessionApi = new TrainingSessionAPI()
      const gameRecords = gameApi.getStudentTrainingRecords(studentId)
      const emotionalRecords = emotionalGamesApi.getStudentRecords(studentId)
      // 认知游戏统一会话（与 GameRecordsPanel 同源，仅该模块存 training_sessions）
      const cognitiveSessions = trainingSessionApi.listSessions({
        studentId,
        sessionFamily: 'cognitive_game',
        limit: 200,
      })
      gameCount.value =
        gameRecords.length + emotionalRecords.length + cognitiveSessions.length
      for (const record of gameRecords) {
        if (record.created_at) timestamps.push(record.created_at)
      }
      for (const record of emotionalRecords) {
        if (record.created_at) timestamps.push(record.created_at)
      }
      for (const session of cognitiveSessions) {
        if (session.created_at) timestamps.push(session.created_at)
      }
    } catch (error) {
      console.error('加载游戏训练记录失败:', error)
      gameCount.value = 0
    }
    trainingTimestamps.value = timestamps

    // AI 记忆计数（待确认/已确认；仅服务团队可见；权限在 store 层过滤）
    try {
      memoryPendingCount.value = aiStore.listStudentMemories(studentId, ['pending']).length
      memoryConfirmedCount.value = aiStore.listStudentMemories(studentId, ['confirmed']).length
    } catch (error) {
      console.error('加载 AI 记忆计数失败:', error)
      memoryPendingCount.value = 0
      memoryConfirmedCount.value = 0
    }
  } catch (error) {
    console.error('加载学生详情失败:', error)
    ElMessage.error('加载学生详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await studentStore.loadStudents()
  await loadStudentDetail()
})

watch(
  () => route.params.id,
  async () => {
    await loadStudentDetail()
  },
)
</script>

<style scoped>
.student-detail-page {
  --detail-text: #303133;
  --detail-muted: #606266;
  --detail-soft: #909399;
  --detail-border: #e6ebf2;
  --detail-panel: #ffffff;
  --detail-shadow: 0 18px 44px rgba(143, 169, 204, 0.12);
  --detail-blue: #5f89d9;
  --detail-blue-soft: #edf4ff;
  --detail-coral: #da8166;
  --detail-coral-soft: #fff1ea;
  --detail-teal: #2f9f93;
  --detail-teal-soft: #e8f7f4;
  gap: 20px;
  background:
    radial-gradient(circle at top right, rgba(102, 168, 255, 0.15), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #f5f7fa 34%, #f5f7fa 100%);
}

.student-detail-header {
  margin-bottom: 0;
}

.student-detail-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.back-button {
  min-height: 40px;
  border-radius: 999px;
  border-color: #dbe5f0;
  background: rgba(255, 255, 255, 0.82);
  color: var(--detail-muted);
}

.back-button:hover {
  color: var(--detail-blue);
  border-color: #bfd4f6;
  background: #ffffff;
}

.header-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-copy h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  color: var(--detail-text);
}

.detail-hero {
  display: grid;
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
  gap: 20px;
}

.profile-card,
.overview-card {
  position: relative;
  border-radius: 22px;
  background: var(--detail-panel);
  box-shadow: var(--detail-shadow);
  overflow: hidden;
}

.profile-card::before,
.overview-card::before {
  content: '';
  position: absolute;
  pointer-events: none;
  inset: auto auto 100% 100%;
}

.profile-card::before {
  top: -100px;
  right: -40px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(95, 137, 217, 0.18), rgba(95, 137, 217, 0));
}

.overview-card::before {
  top: -120px;
  right: -70px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(47, 159, 147, 0.16), rgba(47, 159, 147, 0));
}

.profile-card__hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.94) 0%, rgba(237, 244, 255, 0.88) 60%, rgba(255, 241, 234, 0.9) 100%);
  border-bottom: 1px solid rgba(230, 235, 242, 0.8);
}

.profile-card__avatar-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
}

.profile-card__identity {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.profile-card__identity h2 {
  margin: 0;
  color: var(--detail-text);
  font-size: 28px;
  line-height: 1.1;
}

.profile-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.class-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(47, 159, 147, 0.2);
  background: rgba(47, 159, 147, 0.12);
  color: #0d6a61;
  font-size: 12px;
  line-height: 1;
}

.class-pill--unassigned {
  border-color: #e4e7ed;
  background: #f4f4f5;
  color: #909399;
}

/* 月龄-年级对应性软提示：小字警示，不阻断 */
.grade-age-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 6px 0 0;
  color: #b8860b;
  font-size: 12px;
  line-height: 1.5;
}

.grade-age-hint .el-icon {
  flex-shrink: 0;
}

.profile-card__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 20px 24px 24px;
}

.fact-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--detail-border);
  background: #fbfcfe;
}

.fact-card--wide {
  grid-column: 1 / -1;
}

.fact-card--memory {
  background: linear-gradient(180deg, #f6f9ff 0%, #fbfcfe 100%);
  border-color: var(--detail-border);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.fact-card--memory:hover,
.fact-card--memory:focus-visible {
  border-color: var(--detail-blue, #4a7dff);
  box-shadow: 0 4px 12px rgba(74, 125, 255, 0.12);
  outline: none;
}

.fact-card__memory-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.fact-card__memory-link {
  font-size: 12px;
  color: var(--detail-blue, #4a7dff);
  white-space: nowrap;
}

.fact-card__memory-total {
  display: block;
  margin-top: 6px;
  color: var(--detail-text);
  font-size: 28px;
  line-height: 1.2;
}

.fact-card__memory-count {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--detail-soft);
  white-space: nowrap;
}

.fact-card__label {
  color: var(--detail-soft);
  font-size: 12px;
}

.fact-card__value {
  color: var(--detail-text);
  font-size: 16px;
  line-height: 1.35;
}

.overview-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}

.overview-card__intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

/* 训练画像摘要条：最近评估/最近训练/本月训练 一屏可见 */
.activity-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding: 12px 18px;
  border-radius: 14px;
  border: 1px solid var(--detail-border);
  background: #fbfcfe;
}

.activity-strip__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.activity-strip__label {
  font-size: 12px;
  color: var(--detail-soft);
  white-space: nowrap;
}

.activity-strip__value {
  font-size: 14px;
  color: var(--detail-text);
  white-space: nowrap;
}

.activity-strip__divider {
  width: 1px;
  height: 18px;
  background: var(--detail-border);
}

/* AI 记忆置顶摘要：关键记忆在左侧信息区直接可见 */
.memory-highlights {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-highlights__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--detail-blue-soft);
  background: var(--detail-blue-soft);
}

.memory-highlights__badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  color: var(--detail-blue);
  background: #ffffff;
  border: 1px solid var(--detail-blue);
}

.memory-highlights__badge--safety {
  color: #d03050;
  border-color: #f3c2cb;
  background: #fdf1f3;
}

.memory-highlights__content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--detail-text);
}

.overview-card__copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.overview-card__copy h2 {
  margin: 0;
  color: var(--detail-text);
  font-size: 28px;
  line-height: 1.1;
}

.overview-card__copy p {
  margin: 0;
  max-width: 660px;
  color: var(--detail-muted);
  line-height: 1.6;
}

.overview-card__focus {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 152px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #f7fafc;
  border: 1px solid var(--detail-border);
}

.overview-card__focus-label,
.records-shell__summary-label {
  color: var(--detail-soft);
  font-size: 12px;
}

.overview-card__focus-value,
.records-shell__summary-value {
  color: var(--detail-text);
  font-size: 20px;
  line-height: 1.2;
}

.overview-card__focus-meta,
.records-shell__summary-meta {
  color: var(--detail-muted);
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 170px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid var(--detail-border);
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stat-card__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
}

.stat-card__action {
  color: var(--detail-soft);
  font-size: 12px;
}

.stat-card__number {
  color: var(--detail-text);
  font-size: clamp(34px, 3.2vw, 46px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
}

.stat-card__label {
  color: var(--detail-text);
  font-size: 15px;
  font-weight: 600;
}

.stat-card__hint {
  color: var(--detail-muted);
  font-size: 13px;
  line-height: 1.5;
}

.stat-card--assessment .stat-card__glyph {
  background: var(--detail-blue-soft);
  color: var(--detail-blue);
}

.stat-card--equipment .stat-card__glyph {
  background: var(--detail-coral-soft);
  color: var(--detail-coral);
}

.stat-card--games .stat-card__glyph {
  background: var(--detail-teal-soft);
  color: var(--detail-teal);
}

.stat-card--assessment.is-active {
  border-color: #cbd8fb;
  background: linear-gradient(180deg, #f3f7ff 0%, #ffffff 100%);
  box-shadow: 0 18px 32px rgba(95, 137, 217, 0.16);
}

.stat-card--equipment.is-active {
  border-color: #f4ccb9;
  background: linear-gradient(180deg, #fff5f1 0%, #ffffff 100%);
  box-shadow: 0 18px 32px rgba(218, 129, 102, 0.14);
}

.stat-card--games.is-active {
  border-color: #bfe8e2;
  background: linear-gradient(180deg, #eefbf8 0%, #ffffff 100%);
  box-shadow: 0 18px 32px rgba(47, 159, 147, 0.15);
}

.student-detail-main {
  padding: 24px;
  border-radius: 22px;
  box-shadow: var(--detail-shadow);
}

.records-shell {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.records-shell__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.records-shell__title {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.records-shell__title h2 {
  margin: 0;
  color: var(--detail-text);
  font-size: 24px;
  line-height: 1.15;
}

.records-shell__title p {
  margin: 0;
  color: var(--detail-muted);
  line-height: 1.6;
}

.records-shell__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 152px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #f7fafc;
  border: 1px solid var(--detail-border);
}

.records-tabs {
  margin-top: 2px;
}

.records-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.records-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.records-tabs :deep(.el-tabs__nav) {
  width: 100%;
  padding: 6px;
  border-radius: 999px;
  background: #f7f9fc;
}

.records-tabs :deep(.el-tabs__item) {
  height: auto;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 999px;
  color: var(--detail-muted);
  font-size: 14px;
  font-weight: 600;
  transition: color 0.2s ease, background 0.2s ease;
}

.records-tabs :deep(.el-tabs__item.is-active) {
  color: var(--detail-blue);
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(143, 169, 204, 0.14);
}

.records-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

@media (max-width: 1200px) {
  .detail-hero {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .student-detail-page {
    gap: 16px;
    padding: 16px;
  }

  .student-detail-header {
    flex-direction: column;
    gap: 14px;
  }

  .student-detail-heading {
    width: 100%;
    flex-direction: column;
    gap: 12px;
  }

  .header-right {
    width: 100%;
  }

  .header-right :deep(.el-button) {
    width: 100%;
  }

  .header-copy h1,
  .profile-card__identity h2,
  .overview-card__copy h2 {
    font-size: 24px;
  }

  .profile-card__hero,
  .overview-card,
  .student-detail-main {
    padding: 18px;
  }

  .profile-card__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-card__avatar-shell {
    width: 96px;
    height: 96px;
  }

  .profile-card__facts,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .profile-card__facts {
    padding: 18px;
  }

  .overview-card__intro,
  .records-shell__header {
    flex-direction: column;
  }

  .overview-card__focus,
  .records-shell__summary {
    width: 100%;
    min-width: 0;
  }

  .records-tabs :deep(.el-tabs__item) {
    font-size: 13px;
    padding-inline: 10px;
  }
}
</style>
