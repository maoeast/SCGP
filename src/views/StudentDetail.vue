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

    <!-- 2026-09-20 上下分层重构（用户确认）：废弃左右分栏，改为「全宽档案 Hero + 下方相关记录 Tab 区」。
         原 overview-card 三统计卡与「当前查看」摘要块已删——类型与条数由 Tab 标签承载，汇总由各面板自带，不再重复。
         原 activity-strip（2026-09-19 约定「最近活动一屏可见」）不属冗余，迁入档案区底部保留。 -->
    <article class="profile-hero">
      <div class="profile-hero__main">
        <!-- 左侧焦点：头像 + 姓名 + 身份标签 + 健康安全警示 -->
        <div class="profile-hero__identity">
          <div class="profile-hero__avatar-shell">
            <StudentAvatar
              :name="student?.name"
              :gender="student?.gender"
              :avatar-url="student?.avatar_path"
              size="lg"
            />
          </div>

          <div class="profile-hero__who">
            <h2>{{ student?.name || '未命名' }}</h2>

            <div class="profile-hero__tags">
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

            <!-- 医学状态 + 照护要求双警示条（2026-09-21 T24）：health_notes=医学状态（医学事实，红警示），
                 care_instructions=照护要求（行为指令，琥珀色）；只填其一只显示那一段，都空整块不渲染。
                 历史沿革：2026-09-20 用户拍板降级方案为 healthNotes 自由文本单条透出、不在前端拆分；
                 本次引入结构化 care_instructions 列后升级为双段展示（原约定脉络保留于此） -->
            <div v-if="healthNotes || careInstructions" class="health-alert-group">
              <div v-if="healthNotes" class="health-alert health-alert--medical" role="alert">
                <el-icon class="health-alert__icon"><WarningFilled /></el-icon>
                <p class="health-alert__text">
                  <strong>医学状态</strong>
                  <span>{{ healthNotes }}</span>
                </p>
              </div>
              <div v-if="careInstructions" class="health-alert health-alert--care" role="note">
                <el-icon class="health-alert__icon"><Bell /></el-icon>
                <p class="health-alert__text">
                  <strong>照护要求</strong>
                  <span>{{ careInstructions }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧元数据紧凑网格：3 列（创建时间等次要信息置灰）；监护人信息（2026-09-20 档案补全）并入网格 -->
        <dl class="profile-hero__meta">
          <div
            v-for="item in heroMeta"
            :key="item.label"
            class="meta-item"
            :class="{ 'meta-item--muted': item.muted }"
          >
            <dt class="meta-item__label">{{ item.label }}</dt>
            <dd class="meta-item__value">{{ item.value }}</dd>
          </div>
        </dl>
      </div>

      <div class="profile-hero__aside">
        <!-- AI 记忆置顶摘要：展示已确认置顶/关键记忆，教师无需翻面板即可看到关键信息（用户 2026-09-19 约定） -->
        <div
          v-if="aiStore.memoryEnabled && pinnedMemories.length > 0"
          class="memory-highlights"
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

        <div class="profile-hero__aside-row">
          <!-- 训练画像摘要条（用户 2026-09-19 约定）：最近评估/最近训练/本月训练 一屏可见（随 2026-09-20 重构迁入档案区） -->
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

          <!-- AI 记忆快捷入口卡已删（2026-09-20 用户确认：与下方「AI 记忆」Tab 重复，Tab 标签自带计数）；
               置顶/关键记忆摘要（上方 memory-highlights）保留 -->
        </div>
      </div>
    </article>

    <section v-if="student?.id" class="main-content student-detail-main">
      <!-- 「相关记录」标题与「当前查看」摘要块已删（2026-09-20 用户确认）：Tab 标签自带类型与条数，
           摘要信息与档案区/面板内汇总重复 -->
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
import { ArrowLeft, Bell, Calendar, DataLine, Edit, WarningFilled } from '@element-plus/icons-vue'
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

// 监护人信息：有任一字段即展示（监护人/医学状态是训练安全与家长沟通的关键档案）
const guardianInfo = computed(() => {
  const s = student.value
  if (!s?.guardian_name && !s?.guardian_phone) return null
  const relation = s.guardian_relation ? `（${s.guardian_relation}）` : ''
  return { name: `${s.guardian_name || '未填写'}${relation}`, phone: s.guardian_phone || '未填写' }
})

const guardianDisplay = computed(() => {
  const guardian = guardianInfo.value
  return guardian ? `${guardian.name} · ${guardian.phone}` : '未填写'
})

// 顶部档案区元数据网格（2026-09-20 重构，替代原 detailFacts 纵向堆叠 + 监护人/健康宽卡）：
// 6 项 3 列紧凑排布；创建时间为次要信息置灰展示；医学状态/照护要求独立为姓名下方警示条（见模板）
const heroMeta = computed(() => [
  { label: '性别', value: student.value?.gender || '未设置', muted: false },
  { label: '年龄', value: student.value?.birthday ? `${getStudentAge(student.value.birthday)}岁` : '-', muted: false },
  { label: '出生日期', value: formatStudentDate(student.value?.birthday), muted: false },
  { label: '学籍号', value: student.value?.registry_no || '-', muted: false },
  { label: '创建时间', value: formatStudentDate(student.value?.created_at), muted: true },
  { label: '监护人', value: guardianDisplay.value, muted: false },
])

const healthNotes = computed(() => student.value?.health_notes?.trim() || '')
const careInstructions = computed(() => student.value?.care_instructions?.trim() || '')

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

// AI 记忆快捷入口卡已删（2026-09-20 用户确认：与下方「AI 记忆」Tab 重复）——openMemoryTab / recordsSectionRef 随之移除

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
    // 补录语义正确）+ 游戏 + 情绪游戏 + 认知游戏统一会话，全部进活动条时间戳
    // （认知会话查询上限 200 条、按最新优先，对"最近/本月"计数无实际影响——advisor r3 #1）
    // gameCount（Tab 标签计数）另用口径（T25 用户 2026-09-20 确认方案 a）：只数「游戏 + 情绪游戏」两路，
    // 与嵌入 GameRecordsPanel 的可见行数严格一致（认知会话不在该面板表格展示）——标签数 = 行数，不再出现对不上。
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
      // 认知游戏统一会话：仅进活动条时间戳（最近训练/本月训练），不计入 gameCount（T25 方案 a：
      // GameRecordsPanel 未传 entryCode 时不聚合该路，标签计数须与表格可见行数一致）
      const cognitiveSessions = trainingSessionApi.listSessions({
        studentId,
        sessionFamily: 'cognitive_game',
        limit: 200,
      })
      gameCount.value = gameRecords.length + emotionalRecords.length
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

// 仅响应同路由换学生（/students/:id → 另一个 id）；离开本页（目标路由无 id 参数）时
// pre-watcher 理论上会被父级重渲染卸载跳过，但显式判空短路更稳，不依赖调度细节（advisor r1 #3）
watch(
  () => route.params.id,
  async (newId) => {
    if (!newId) return
    await loadStudentDetail()
  },
)
</script>

<style scoped>
.student-detail-page {
  --detail-text: #303133;
  --detail-muted: #606266;
  --detail-soft: #909399;
  --detail-faint: #a8abb2;
  --detail-border: #e6ebf2;
  --detail-panel: #ffffff;
  --detail-shadow: 0 18px 44px rgba(143, 169, 204, 0.12);
  --detail-blue: #5f89d9;
  --detail-blue-soft: #edf4ff;
  --detail-danger: #d03050;
  --detail-danger-soft: #fdf1f3;
  --detail-danger-border: #f3c2cb;
  /* T24 照护要求警示条：琥珀/橙色系（与医学状态红色区分） */
  --detail-care: #d48806;
  --detail-care-soft: #fdf6ec;
  --detail-care-border: #f0d9a8;
  --detail-care-text: #ad6800;
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

/* ═══ 2026-09-20 重构：全宽档案 Hero（原 detail-hero 左右分栏已废弃） ═══ */
.profile-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: 22px;
  background: var(--detail-panel);
  box-shadow: var(--detail-shadow);
  overflow: hidden;
}

.profile-hero::before {
  content: '';
  position: absolute;
  pointer-events: none;
  top: -100px;
  right: -40px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(95, 137, 217, 0.14), rgba(95, 137, 217, 0));
}

.profile-hero__main {
  display: grid;
  grid-template-columns: minmax(320px, 5fr) minmax(0, 6fr);
  gap: 24px;
  align-items: start;
}

/* —— 左侧焦点：头像 + 姓名 + 标签 + 警示 —— */
.profile-hero__identity {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  min-width: 0;
}

.profile-hero__avatar-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  border-radius: 28px;
  background: rgba(237, 244, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.profile-hero__who {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.profile-hero__who h2 {
  margin: 0;
  color: var(--detail-text);
  font-size: 26px;
  line-height: 1.15;
}

.profile-hero__tags {
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
  margin: 0;
  color: #b8860b;
  font-size: 12px;
  line-height: 1.5;
}

.grade-age-hint .el-icon {
  flex-shrink: 0;
}

/* 健康警示双条（2026-09-21 T24）：医学状态红色警示 + 照护要求琥珀色，样式同骨架分色区分 */
.health-alert-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--detail-danger-border);
  border-left: 4px solid var(--detail-danger);
  background: var(--detail-danger-soft);
}

/* 照护要求段：琥珀/橙色系（与医学状态红色区分），沿用同一卡片骨架 */
.health-alert--care {
  border-color: var(--detail-care-border);
  border-left-color: var(--detail-care);
  background: var(--detail-care-soft);
}

.health-alert__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--detail-danger);
  font-size: 18px;
}

.health-alert--care .health-alert__icon {
  color: var(--detail-care);
}

.health-alert__text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 6px;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
}

.health-alert__text strong {
  color: var(--detail-danger);
  font-weight: 700;
}

.health-alert--care .health-alert__text strong {
  color: var(--detail-care-text);
}

.health-alert__text span {
  color: #9f3a4d;
}

.health-alert--care .health-alert__text span {
  color: #8a5a16;
}

/* —— 右侧元数据紧凑网格：3 列，次要信息置灰 —— */
.profile-hero__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
  margin: 0;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--detail-border);
  background: #fbfcfe;
}

.meta-item__label {
  color: var(--detail-soft);
  font-size: 12px;
}

.meta-item__value {
  margin: 0;
  color: var(--detail-text);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

/* 次要信息（创建时间等）置灰 */
.meta-item--muted .meta-item__value {
  color: var(--detail-faint);
  font-weight: 500;
}

/* —— 档案区底部：置顶记忆 + 最近活动 + AI 记忆入口 —— */
.profile-hero__aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--detail-border);
}

.profile-hero__aside-row {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 12px;
}

/* AI 记忆置顶摘要：关键记忆在档案区直接可见 */
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

/* 训练画像摘要条：最近评估/最近训练/本月训练（2026-09-19 约定，随重构迁入档案区） */
.activity-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  flex: 1 1 320px;
  gap: 10px 18px;
  min-width: 0;
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

/* AI 记忆数量入口卡样式已随元素删除（2026-09-20 用户确认：与下方 AI 记忆 Tab 重复） */

/* ═══ 相关记录 Tab 区（2026-09-20 重构：紧贴档案区，标题/摘要块已删） ═══ */
.student-detail-main {
  padding: 24px;
  border-radius: 22px;
  box-shadow: var(--detail-shadow);
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
  .profile-hero__main {
    grid-template-columns: 1fr;
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
  .profile-hero__who h2 {
    font-size: 24px;
  }

  .profile-hero {
    padding: 18px;
  }

  .profile-hero__identity {
    flex-direction: column;
  }

  .profile-hero__avatar-shell {
    width: 96px;
    height: 96px;
  }

  .profile-hero__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-hero__aside-row {
    flex-direction: column;
  }

  .records-tabs :deep(.el-tabs__item) {
    font-size: 13px;
    padding-inline: 10px;
  }
}
</style>
