<template>
  <div class="task-execution-page" v-loading="loading">
    <div class="task-execution-shell">
      <header class="task-execution-header">
        <div>
          <p class="task-execution-eyebrow">自理训练执行中</p>
          <h1 class="task-execution-title">{{ task?.name || '自理任务' }}</h1>
          <p class="task-execution-subtitle">
            {{ studentName }} · 第 {{ currentStep?.seq || 0 }} / {{ steps.length }} 步
          </p>
        </div>

        <div class="task-execution-header__actions">
          <el-tag type="warning" effect="light">{{ studentName }}</el-tag>
          <el-button @click="handleAbort">退出</el-button>
        </div>
      </header>

      <template v-if="task && currentStep">
        <section class="task-execution-stage">
          <el-card shadow="never" class="task-execution-card task-execution-card--step">
            <template #header>
              <div class="task-execution-card__header">
                <span>当前步骤</span>
                <el-tag effect="plain">{{ currentStep.id }}</el-tag>
              </div>
            </template>

            <div class="task-step-panel">
              <div class="task-step-panel__index">{{ currentStep.seq }}</div>
              <div class="task-step-panel__body">
                <h2>步骤 {{ currentStep.seq }}</h2>
                <p>{{ currentStep.text || '当前步骤暂未填写说明' }}</p>

                <div
                  v-if="currentStep.imagePath || currentStep.videoPath || currentStep.audioPath"
                  class="task-step-panel__media"
                >
                  <el-tag v-if="currentStep.imagePath" effect="plain">图片</el-tag>
                  <el-tag v-if="currentStep.videoPath" effect="plain">视频</el-tag>
                  <el-tag v-if="currentStep.audioPath" effect="plain">音频</el-tag>
                </div>
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="task-execution-card">
            <template #header>
              <div class="task-execution-card__header">
                <span>本步记录</span>
                <el-tag type="success" effect="plain">会写入 training_records + training_session</el-tag>
              </div>
            </template>

            <el-form label-position="top">
              <el-form-item label="完成等级">
                <el-radio-group v-model="stepForm.completionLevel">
                  <el-radio-button value="independent">独立完成</el-radio-button>
                  <el-radio-button value="prompt">口头提示</el-radio-button>
                  <el-radio-button value="assist">协助完成</el-radio-button>
                  <el-radio-button value="unable">未完成</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="错误类型">
                <el-radio-group v-model="stepForm.errorType">
                  <el-radio-button :value="0">无</el-radio-button>
                  <el-radio-button :value="1">轻度</el-radio-button>
                  <el-radio-button :value="2">中度</el-radio-button>
                  <el-radio-button :value="3">重度</el-radio-button>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="教师备注">
                <el-input
                  v-model="stepForm.teacherNotes"
                  type="textarea"
                  :rows="3"
                  placeholder="记录本步提示、错误点或行为观察"
                />
              </el-form-item>
            </el-form>
          </el-card>
        </section>

        <section class="task-execution-footer">
          <el-card shadow="never" class="task-execution-card">
            <template #header>
              <div class="task-execution-card__header">
                <span>执行概览</span>
                <el-tag effect="plain">{{ executionStatus }}</el-tag>
              </div>
            </template>

            <div class="task-execution-summary">
              <div>
                <span>已记录步骤</span>
                <strong>{{ stepResults.length }} / {{ steps.length }}</strong>
              </div>
              <div>
                <span>独立完成</span>
                <strong>{{ completionCounts.independent }}</strong>
              </div>
              <div>
                <span>需提示</span>
                <strong>{{ completionCounts.prompt }}</strong>
              </div>
              <div>
                <span>需协助</span>
                <strong>{{ completionCounts.assist }}</strong>
              </div>
              <div>
                <span>未完成</span>
                <strong>{{ completionCounts.unable }}</strong>
              </div>
            </div>
          </el-card>

          <div class="task-execution-actions">
            <el-button :disabled="currentStepIndex <= 0" @click="handlePrevStep">上一步</el-button>
            <el-button type="warning" plain :loading="saving" @click="handleInterrupt">中断并保存</el-button>
            <el-button type="primary" :loading="saving" @click="handleNextOrFinish">
              {{ currentStepIndex >= steps.length - 1 ? '完成训练' : '下一步' }}
            </el-button>
          </div>
        </section>
      </template>

      <el-empty v-else description="未找到对应自理任务或学生上下文">
        <el-button type="primary" @click="router.replace('/self-care/tasks')">返回任务列表</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { SelfCareTaskAPI } from '@/database/self-care-task-api'
import { SelfCareTrainingAPI } from '@/database/self-care-training-api'
import type {
  TaskTrainingCompletionLevel,
  TaskTrainingErrorType,
  TaskTrainingExecutionResult,
  TaskTrainingExecutionStatus,
  TaskTrainingStep,
  TaskTrainingStepResult,
} from '@/features/self-care/task-training-contract'

const route = useRoute()
const router = useRouter()
const taskApi = new SelfCareTaskAPI()
const trainingApi = new SelfCareTrainingAPI()

const loading = ref(false)
const saving = ref(false)
const startedAt = ref(Date.now())
const executionStatus = ref<TaskTrainingExecutionStatus>('idle')
const currentStepIndex = ref(0)
const stepResults = ref<TaskTrainingStepResult[]>([])

const stepForm = reactive<{
  completionLevel: TaskTrainingCompletionLevel
  errorType: TaskTrainingErrorType
  teacherNotes: string
}>({
  completionLevel: 'independent',
  errorType: 0,
  teacherNotes: '',
})

const taskId = computed(() => {
  const raw = Array.isArray(route.params.taskId) ? route.params.taskId[0] : route.params.taskId
  const parsed = Number.parseInt(String(raw || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const studentId = computed(() => {
  const raw = Array.isArray(route.params.studentId) ? route.params.studentId[0] : route.params.studentId
  const parsed = Number.parseInt(String(raw || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const task = computed(() => (
  taskId.value === null ? null : taskApi.getTaskById(taskId.value)
))

const steps = computed<TaskTrainingStep[]>(() => task.value?.metadata.steps || [])

const currentStep = computed(() => steps.value[currentStepIndex.value] || null)

const studentName = computed(() => {
  const raw = Array.isArray(route.query.studentName) ? route.query.studentName[0] : route.query.studentName
  return typeof raw === 'string' && raw.trim() ? raw.trim() : `学生 #${studentId.value || ''}`
})

const completionCounts = computed(() => {
  const base = {
    independent: 0,
    prompt: 0,
    assist: 0,
    unable: 0,
  }

  for (const step of stepResults.value) {
    base[step.completionLevel] += 1
  }

  return base
})

function resetStepForm(fromStep?: TaskTrainingStepResult | null) {
  stepForm.completionLevel = fromStep?.completionLevel || 'independent'
  stepForm.errorType = fromStep?.errorType ?? 0
  stepForm.teacherNotes = fromStep?.teacherNotes || ''
}

function syncFormFromCurrentStep() {
  const step = currentStep.value
  if (!step) {
    resetStepForm(null)
    return
  }

  const existing = stepResults.value.find((item) => item.seq === step.seq) || null
  resetStepForm(existing)
}

function upsertCurrentStepResult() {
  const step = currentStep.value
  if (!step) {
    return
  }

  const nextResult: TaskTrainingStepResult = {
    seq: step.seq,
    stepId: step.id,
    completionLevel: stepForm.completionLevel,
    errorType: stepForm.errorType,
    teacherNotes: stepForm.teacherNotes.trim() || null,
    recordedAt: new Date().toISOString(),
  }

  const existingIndex = stepResults.value.findIndex((item) => item.seq === step.seq)
  if (existingIndex >= 0) {
    stepResults.value.splice(existingIndex, 1, nextResult)
  } else {
    stepResults.value.push(nextResult)
  }
}

function buildExecutionResult(): TaskTrainingExecutionResult {
  const sortedResults = [...stepResults.value].sort((a, b) => a.seq - b.seq)
  const completedStepCount = sortedResults.filter((item) => item.completionLevel !== 'unable').length
  const maxErrorType = sortedResults.reduce<TaskTrainingErrorType>(
    (max, item) => ((item.errorType ?? 0) > max ? (item.errorType ?? 0) : max),
    0,
  )

  return {
    trainingMode: 'step_task',
    stepCount: steps.value.length,
    completedStepCount,
    errorType: maxErrorType,
    teacherNotes: sortedResults
      .map((item) => item.teacherNotes?.trim())
      .filter((item): item is string => Boolean(item))
      .join('；') || null,
    stepResults: sortedResults,
  }
}

async function persistSession(
  completionStatus: 'completed' | 'cancelled' | 'interrupted' | 'aborted'
) {
  if (taskId.value === null || studentId.value === null || !task.value) {
    ElMessage.warning('缺少训练上下文，无法保存')
    return
  }

  upsertCurrentStepResult()
  saving.value = true

  try {
    const result = await trainingApi.saveTrainingSession({
      studentId: studentId.value,
      resourceId: task.value.id,
      startedAt: startedAt.value,
      endedAt: Date.now(),
      completionStatus,
      executionResult: buildExecutionResult(),
    })

    ElMessage.success(
      completionStatus === 'completed'
        ? '自理训练已完成并保存'
        : '自理训练已中断并保存'
    )

    router.replace({
      path: '/training-records/life-skills',
      query: {
        type: 'game',
        studentId: String(studentId.value),
        trainingRecordId: String(result.trainingRecordId),
      },
    })
  } catch (error) {
    console.error('[TaskExecution] 保存自理训练失败:', error)
    ElMessage.error('保存自理训练失败')
  } finally {
    saving.value = false
  }
}

function ensureContext() {
  if (taskId.value === null || studentId.value === null) {
    ElMessage.warning('缺少任务或学生参数，无法开始训练')
    router.replace('/self-care/tasks')
    return false
  }

  if (!task.value || steps.value.length === 0) {
    ElMessage.warning('未找到有效任务步骤，请返回任务列表重新选择')
    router.replace('/self-care/tasks')
    return false
  }

  return true
}

function handlePrevStep() {
  upsertCurrentStepResult()
  if (currentStepIndex.value > 0) {
    currentStepIndex.value -= 1
    executionStatus.value = 'in_progress'
    syncFormFromCurrentStep()
  }
}

function handleNextOrFinish() {
  upsertCurrentStepResult()
  executionStatus.value = 'in_progress'

  if (currentStepIndex.value >= steps.value.length - 1) {
    executionStatus.value = 'completed'
    void persistSession('completed')
    return
  }

  currentStepIndex.value += 1
  syncFormFromCurrentStep()
}

function handleInterrupt() {
  executionStatus.value = 'interrupted'
  void persistSession('interrupted')
}

function handleAbort() {
  router.push(`/self-care/tasks/${taskId.value || ''}/select-student`)
}

onMounted(() => {
  loading.value = true
  try {
    if (!ensureContext()) {
      return
    }

    startedAt.value = Date.now()
    executionStatus.value = 'in_progress'
    syncFormFromCurrentStep()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.task-execution-page {
  min-height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(255, 224, 178, 0.32), transparent 34%),
    linear-gradient(180deg, #fffaf3 0%, #fff6e8 100%);
}

.task-execution-shell {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.task-execution-header,
.task-execution-card__header,
.task-execution-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-execution-header {
  padding: 22px 24px;
  border: 1px solid #f2d6a2;
  border-radius: 26px;
  background: rgba(255, 253, 248, 0.92);
  backdrop-filter: blur(8px);
}

.task-execution-eyebrow,
.task-execution-subtitle {
  margin: 0;
}

.task-execution-eyebrow {
  color: #c17b09;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.task-execution-title {
  margin: 8px 0;
  color: #7c4700;
  font-size: 28px;
}

.task-execution-subtitle {
  color: #8e6a33;
  line-height: 1.7;
}

.task-execution-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.task-execution-stage {
  display: grid;
  grid-template-columns: minmax(340px, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.task-execution-card {
  border-radius: 24px;
  border-color: #f0dfbc;
  background: rgba(255, 255, 255, 0.9);
}

.task-execution-card--step {
  min-height: 100%;
}

.task-step-panel {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.task-step-panel__index {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #efb85e 0%, #de7f18 100%);
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(222, 127, 24, 0.18);
}

.task-step-panel__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.task-step-panel__body h2,
.task-step-panel__body p {
  margin: 0;
}

.task-step-panel__body h2 {
  color: #7b4d08;
  font-size: 22px;
}

.task-step-panel__body p {
  color: #5f6268;
  line-height: 1.9;
  font-size: 15px;
}

.task-step-panel__media {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.task-execution-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.task-execution-summary div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 16px;
  background: #fff9ef;
}

.task-execution-summary span {
  color: #9a7a40;
  font-size: 12px;
}

.task-execution-summary strong {
  color: #6e4204;
  font-size: 20px;
}

.task-execution-footer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-execution-actions {
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .task-execution-page {
    padding: 16px;
  }

  .task-execution-stage {
    grid-template-columns: 1fr;
  }

  .task-execution-header,
  .task-execution-card__header,
  .task-execution-actions,
  .task-step-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .task-step-panel__index {
    width: 56px;
    height: 56px;
    font-size: 24px;
  }
}
</style>
