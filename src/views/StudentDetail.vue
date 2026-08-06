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

          <article class="fact-card fact-card--wide">
            <span class="fact-card__label">学号</span>
            <StudentId class="fact-card__value fact-card__value--mono" :id="student?.student_no" :full="true" />
          </article>

          <!-- AI 记忆（服务团队共享；管理员启用后显示；内嵌确认流） -->
          <article v-if="aiStore.memoryEnabled" class="fact-card fact-card--wide fact-card--memory">
            <div class="fact-card__memory-head">
              <span class="fact-card__label">AI 记忆</span>
              <span class="fact-card__memory-count">
                待确认 {{ memoryPendingCount }} · 已确认 {{ memoryConfirmedCount }}
              </span>
            </div>
            <StudentMemoryPanel :student-id="student?.id ?? 0" compact />
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

        <div class="overview-card__notes">
          <article class="overview-note">
            <span class="overview-note__label">所属班级</span>
            <strong class="overview-note__value">{{ currentClassLabel }}</strong>
          </article>

          <article class="overview-note">
            <span class="overview-note__label">诊断类型</span>
            <DiagnosisTag class="overview-note__tag" :type="student?.disorder" />
          </article>

          <article class="overview-note">
            <span class="overview-note__label">使用方式</span>
            <strong class="overview-note__value">点击上方概览卡或下方标签切换记录视图</strong>
          </article>
        </div>
      </article>
    </section>

    <section v-if="student?.id" class="main-content student-detail-main">
      <div class="records-shell">
        <div class="records-shell__header">
          <div class="records-shell__title">
            <h2>相关记录</h2>
            <p>按学生维度查看评估、器材训练和游戏训练历史，支持直接跳转到明细页。</p>
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
import { ArrowLeft, Edit } from '@element-plus/icons-vue'
import AddStudentDialog from '@/components/AddStudentDialog.vue'
import DiagnosisTag from '@/components/student/DiagnosisTag.vue'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import StudentId from '@/components/student/StudentId.vue'
import { EquipmentTrainingAPI, GameTrainingAPI } from '@/database/api'
import { EmotionalGamesAPI } from '@/database/emotional-games-api'
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

type DetailTab = 'assessments' | 'equipment' | 'games'

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

const currentClassLabel = computed(() => student.value?.current_class_name || '未分班')
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
const activeTabCount = computed(() =>
  detailMetrics.value.find((metric) => metric.key === activeTab.value)?.value ?? 0,
)

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

    assessmentCount.value = getStudentAssessmentRecords(studentId).length

    try {
      const equipmentApi = new EquipmentTrainingAPI()
      equipmentCount.value = equipmentApi.getStudentRecords(studentId).length
    } catch (error) {
      console.error('加载器材训练记录失败:', error)
      equipmentCount.value = 0
    }

    try {
      const gameApi = new GameTrainingAPI()
      const emotionalGamesApi = new EmotionalGamesAPI()
      gameCount.value = gameApi.getStudentTrainingRecords(studentId).length + emotionalGamesApi.getStudentRecords(studentId).length
    } catch (error) {
      console.error('加载游戏训练记录失败:', error)
      gameCount.value = 0
    }

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
}

.fact-card__memory-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.fact-card__memory-count {
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

.fact-card__value--mono {
  font-size: 13px;
  line-height: 1.5;
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

.overview-card__notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.overview-note {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  min-height: 92px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--detail-border);
  background: #fbfcfe;
}

.overview-note__label {
  color: var(--detail-soft);
  font-size: 12px;
}

.overview-note__value {
  color: var(--detail-text);
  font-size: 15px;
  line-height: 1.5;
}

.overview-note__tag {
  width: fit-content;
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

  .stats-grid,
  .overview-card__notes {
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
  .stats-grid,
  .overview-card__notes {
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
