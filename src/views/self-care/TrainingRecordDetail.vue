<template>
  <div class="record-detail-page scgp-admin-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">生活自理 / 历史训练</p>
        <h1>自理训练记录详情</h1>
        <p class="subtitle">查看已保存的逐步表现、错误等级和教师备注</p>
      </div>
      <el-button @click="goBack">返回训练记录</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <template v-else-if="record">
      <section class="summary-grid" aria-label="本次训练概览">
        <div class="summary-card"><span>学生</span><strong>{{ record.studentName }}</strong></div>
        <div class="summary-card"><span>任务</span><strong>{{ record.resourceName }}</strong></div>
        <div class="summary-card"><span>训练时间</span><strong>{{ formatDate(record.timestamp) }}</strong></div>
        <div class="summary-card"><span>实际时长</span><strong>{{ formatDuration(record.durationMs) }}</strong></div>
      </section>

      <section class="detail-card">
        <h2>步骤登记概览</h2>
        <p class="summary-line">已完成 {{ record.completedStepCount }} / {{ record.stepCount }} 步。独立 {{ record.completionBreakdown.independent }}、口头提示 {{ record.completionBreakdown.prompt }}、协助 {{ record.completionBreakdown.assist }}、未完成 {{ record.completionBreakdown.unable }}。</p>
        <p class="source-note">完成比例包含提示和协助。下方等级、错误和备注来自本次保存的记录；步骤文字取自当前任务，任务修改后可能与当时不同。</p>
      </section>

      <section class="detail-card">
        <h2>逐步历史结果</h2>
        <el-empty v-if="record.stepResults.length === 0" description="这条历史记录没有保存逐步结果" />
        <div v-else class="step-list">
          <article v-for="step in record.stepResults" :key="`${step.seq}-${step.stepId || ''}`" class="step-item">
            <div class="step-heading">
              <strong>第 {{ step.seq }} 步</strong>
              <span v-if="stepTitle(step.stepId)" class="step-title">{{ stepTitle(step.stepId) }}</span>
            </div>
            <div class="step-values">
              <span>完成等级：{{ completionLabel(step.completionLevel) }}</span>
              <span>错误等级：{{ errorLabel(step.errorType) }}</span>
            </div>
            <p class="step-note">教师备注：{{ step.teacherNotes || '未填写' }}</p>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SelfCareTrainingAPI, type SelfCareTrainingRecordDetail } from '@/database/self-care-training-api'
import { SelfCareTaskAPI } from '@/database/self-care-task-api'
import type { TaskTrainingCompletionLevel, TaskTrainingErrorType } from '@/features/self-care/task-training-contract'

const route = useRoute()
const router = useRouter()
const trainingApi = new SelfCareTrainingAPI()
const taskApi = new SelfCareTaskAPI()
const record = ref<SelfCareTrainingRecordDetail | null>(null)
const error = ref('')

const currentStepNames = computed(() => {
  const task = record.value ? taskApi.getTaskById(record.value.resourceId) : null
  return new Map(task?.metadata.steps.map((step) => [step.id, step.text]) || [])
})

function stepTitle(stepId?: string) {
  return stepId ? currentStepNames.value.get(stepId) || '' : ''
}

function completionLabel(value: TaskTrainingCompletionLevel) {
  return ({ independent: '独立完成', prompt: '口头提示', assist: '协助完成', unable: '未完成' })[value] || '未记录'
}

function errorLabel(value?: TaskTrainingErrorType) {
  return ({ 0: '无', 1: '轻度', 2: '中度', 3: '重度' })[value ?? 0] || '未记录'
}

function formatDuration(value: number) {
  const seconds = Math.round(Math.max(0, value) / 1000)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}分 ${seconds % 60}秒` : `${seconds}秒`
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? '时间未记录' : date.toLocaleString('zh-CN', { hour12: false })
}

function goBack() {
  router.push({ path: '/training-records/life-skills', query: { type: 'game', studentId: record.value?.studentId?.toString() } })
}

watch(() => route.params.recordId, (value) => {
  const id = Number(Array.isArray(value) ? value[0] : value)
  record.value = null
  error.value = ''
  if (!Number.isInteger(id) || id <= 0) {
    error.value = '训练记录编号无效'
    return
  }
  try {
    record.value = trainingApi.getTrainingRecordDetail(id)
    if (!record.value) error.value = '未找到这条自理训练记录'
  } catch (cause) {
    console.error('[TrainingRecordDetail] 加载失败:', cause)
    error.value = '读取历史记录失败，请返回列表重试'
  }
}, { immediate: true })
</script>

<style scoped>
.record-detail-page { padding: 28px 32px 56px; max-width: 1280px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 24px; }
.page-header h1 { margin: 4px 0 6px; font-size: 26px; color: #17233c; }
.eyebrow { margin: 0; color: #5582b9; font-size: 13px; font-weight: 600; }
.subtitle, .source-note { color: #718096; font-size: 14px; line-height: 1.7; }
.subtitle { margin: 0; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
.summary-card, .detail-card { background: #fff; border: 1px solid #e3eaf3; border-radius: 14px; box-shadow: 0 4px 16px rgba(29, 67, 105, .04); }
.summary-card { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.summary-card span { color: #8491a5; font-size: 13px; }
.summary-card strong { color: #17233c; font-size: 18px; overflow-wrap: anywhere; }
.detail-card { padding: 22px 26px; margin-bottom: 18px; }
.detail-card h2 { margin: 0 0 16px; color: #17233c; font-size: 19px; }
.summary-line { margin: 0 0 8px; color: #33445e; }
.source-note { margin: 0; }
.step-list { display: grid; gap: 12px; }
.step-item { padding: 16px 18px; border: 1px solid #e7edf5; border-radius: 10px; background: #fbfdff; }
.step-heading { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; color: #243956; }
.step-title { color: #536883; }
.step-values { display: flex; gap: 28px; color: #405370; font-size: 14px; }
.step-note { margin: 10px 0 0; color: #5e7189; font-size: 14px; }
@media (max-width: 900px) { .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .record-detail-page { padding: 18px; } .summary-grid { grid-template-columns: 1fr; } .page-header { flex-direction: column; } }
</style>
