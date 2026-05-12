<template>
  <div
    ref="rootRef"
    class="task-execution-page"
    :class="{ 'is-keyboard-active': notesInputFocused }"
    v-loading="loading"
  >
    <div class="task-execution-shell" :style="{ '--keyboard-inset': `${viewportInsetBottom}px` }">
      <template v-if="task && currentStep">
        <section class="task-execution-workspace">
          <div class="task-execution-stage">
            <div class="task-stage-figure">
              <div class="task-stage-title">
                <h1 class="task-stage-title__text">{{ task?.name || '自理训练任务' }}</h1>
              </div>
              <div
                class="task-stage-figure__blur"
                :class="{ 'is-empty': !hasCurrentStepImage }"
                :style="hasCurrentStepImage ? { backgroundImage: `url(${currentStepImageUrl})` } : undefined"
              />
              <img
                v-if="hasCurrentStepImage"
                :src="currentStepImageUrl"
                :alt="currentStep.text || `步骤 ${currentStep.seq}`"
                class="task-stage-figure__image"
              >
              <div v-else class="task-stage-figure__empty">
                <span>当前步骤暂无配图</span>
              </div>

              <div
                class="task-stage-media-controls"
                :data-audio-src="currentStepAudioUrl"
                :data-video-src="currentStepVideoUrl"
                :data-replay-token="audioReplayToken"
              >
                <button
                  type="button"
                  class="media-control media-control--ghost"
                  :disabled="!hasCurrentStepAudio"
                  @click="handleAudioReplay"
                >
                  重播
                </button>
                <button
                  type="button"
                  class="media-control media-control--ghost"
                  :class="{ 'is-selected': audioMuted && hasCurrentStepAudio }"
                  :disabled="!hasCurrentStepAudio"
                  @click="handleAudioToggleMute"
                >
                  {{ audioMuted ? '取消静音' : '静音' }}
                </button>
                <span v-if="hasCurrentStepVideo" class="media-control__status">视频</span>
              </div>

              <div class="task-stage-caption">
                <div class="task-stage-caption__body">
                  <span class="task-stage-caption__step">步骤 {{ currentStep.seq }}</span>
                  <p>{{ currentStep.text || '当前步骤暂未填写说明' }}</p>
                </div>
              </div>
            </div>

            <nav ref="stepNavRef" class="task-step-nav" aria-label="步骤导航">
              <button
                v-for="step in steps"
                :key="step.seq"
                type="button"
                class="task-step-nav__item"
                :class="{ 'is-active': step.seq === currentStep?.seq }"
                @click="handleStepJump(step.seq)"
              >
                <span class="task-step-nav__index">{{ step.seq }}</span>
                <span class="task-step-nav__label">
                  {{ buildStepShortLabel(step.text || step.id || `步骤 ${step.seq}`) }}
                </span>
              </button>
            </nav>
          </div>

          <aside class="task-execution-sidebar">
            <header class="task-sidebar-student">
              <div class="task-sidebar-student__copy">
                <span>正在训练</span>
                <strong>{{ studentName }}</strong>
              </div>
              <button type="button" class="task-sidebar__back-button" @click="handleSwitchClick">
                切换
              </button>
            </header>

            <section class="task-sidebar-panel task-sidebar-panel--summary">
              <div class="task-sidebar-panel__header">
                <h2>执行概览</h2>
              </div>
              <div class="task-execution-summary">
                <div class="task-summary-block">
                  <span>已记录步骤</span>
                  <strong>{{ stepResults.length }} / {{ steps.length }}</strong>
                </div>
                <div class="task-summary-block">
                  <span>独立完成</span>
                  <strong>{{ completionCounts.independent }}</strong>
                </div>
                <div class="task-summary-block">
                  <span>口头提示</span>
                  <strong>{{ completionCounts.prompt }}</strong>
                </div>
                <div class="task-summary-block">
                  <span>协助完成</span>
                  <strong>{{ completionCounts.assist }}</strong>
                </div>
                <div class="task-summary-block">
                  <span>未完成</span>
                  <strong>{{ completionCounts.unable }}</strong>
                </div>
              </div>
            </section>

            <section class="task-sidebar-panel task-sidebar-panel--field">
              <h2>完成等级</h2>
              <div class="task-choice-grid">
                <button
                  v-for="option in completionOptions"
                  :key="option.value"
                  type="button"
                  class="task-choice-card"
                  :class="{ 'is-selected': stepForm.completionLevel === option.value }"
                  @click="stepForm.completionLevel = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </section>

            <section class="task-sidebar-panel task-sidebar-panel--field">
              <h2>错误等级</h2>
              <div class="task-choice-grid">
                <button
                  v-for="option in errorOptions"
                  :key="option.value"
                  type="button"
                  class="task-choice-card"
                  :class="{ 'is-selected': stepForm.errorType === option.value }"
                  @click="stepForm.errorType = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </section>

            <section class="task-sidebar-panel task-sidebar-panel--notes">
              <h2>教师备注</h2>
              <el-input
                v-model="stepForm.teacherNotes"
                class="task-notes-input"
                type="textarea"
                :rows="3"
                resize="none"
                placeholder="记录本步提示、错误点或行为观察"
                @focus="handleNotesFocus"
                @blur="handleNotesBlur"
              />
            </section>

            <div class="task-execution-actions">
              <button
                type="button"
                class="task-action-button task-action-button--secondary"
                :disabled="currentStepIndex <= 0"
                @click="handlePrevStep"
              >
                上一步
              </button>
              <button
                type="button"
                class="task-action-button task-action-button--warning"
                :disabled="saving"
                @click="handleInterrupt"
              >
                {{ saving ? '保存中' : '中断保存' }}
              </button>
              <button
                type="button"
                class="task-action-button task-action-button--primary"
                :disabled="saving"
                @click="handleNextOrFinish"
              >
                {{ currentStepIndex >= steps.length - 1 ? '完成训练' : '下一步' }}
              </button>
            </div>
          </aside>
        </section>
      </template>

      <el-empty v-else description="未找到对应自理任务或学生上下文">
        <el-button type="primary" @click="router.replace('/self-care/tasks')">返回任务列表</el-button>
      </el-empty>
    </div>

    <div
      v-if="isExitConfirmVisible"
      class="exit-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-confirm-title"
      @click.self="closeExitConfirm"
    >
      <div class="exit-confirm__card">
        <div class="exit-confirm__icon">!</div>
        <h2 id="exit-confirm-title" class="exit-confirm__title">训练还在进行中，确定要退出吗？</h2>
        <p class="exit-confirm__description">
          当前进度尚未完成，现在退出会回到学生选择页面。你也可以继续留在这里，完成本轮观察与答题。
        </p>

        <div class="exit-confirm__actions">
          <button type="button" class="exit-confirm__button exit-confirm__button--secondary" @click="closeExitConfirm">
            继续训练
          </button>
          <button type="button" class="exit-confirm__button exit-confirm__button--danger" @click="confirmExit">
            确认退出
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
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
import { resolvePresetResourceUrl } from '@/utils/preset-resource'

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
const rootRef = ref<HTMLElement | null>(null)
const stepNavRef = ref<HTMLElement | null>(null)
const notesInputFocused = ref(false)
const viewportInsetBottom = ref(0)
const audioMuted = ref(false)
const audioReplayToken = ref(0)
const isExitConfirmVisible = ref(false)

let removeViewportListener: (() => void) | null = null

const completionOptions: Array<{ label: string; value: TaskTrainingCompletionLevel }> = [
  { label: '独立完成', value: 'independent' },
  { label: '口头提示', value: 'prompt' },
  { label: '协助完成', value: 'assist' },
  { label: '未完成', value: 'unable' },
]

const errorOptions: Array<{ label: string; value: TaskTrainingErrorType }> = [
  { label: '无', value: 0 },
  { label: '轻度', value: 1 },
  { label: '中度', value: 2 },
  { label: '重度', value: 3 },
]

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

const currentStepImageUrl = computed(() => {
  const value = currentStep.value?.imagePath
  return typeof value === 'string' && value.trim() ? resolvePresetResourceUrl(value) : ''
})

const currentStepAudioUrl = computed(() => {
  const value = currentStep.value?.audioPath
  return typeof value === 'string' && value.trim() ? resolvePresetResourceUrl(value) : ''
})

const currentStepVideoUrl = computed(() => {
  const value = currentStep.value?.videoPath
  return typeof value === 'string' && value.trim() ? resolvePresetResourceUrl(value) : ''
})

const hasCurrentStepImage = computed(() => Boolean(currentStepImageUrl.value))
const hasCurrentStepAudio = computed(() => Boolean(currentStepAudioUrl.value))
const hasCurrentStepVideo = computed(() => Boolean(currentStepVideoUrl.value))

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

function buildStepShortLabel(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return '未命名步骤'
  return normalized.length > 18 ? `${normalized.slice(0, 18)}…` : normalized
}

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

function blurActiveElement() {
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }
}

function centerActiveStepNav() {
  const container = stepNavRef.value
  if (!container) return

  const active = container.querySelector<HTMLElement>('.task-step-nav__item.is-active')
  if (!active) return

  const nextLeft = active.offsetLeft - (container.clientWidth - active.clientWidth) / 2
  container.scrollTo({
    left: Math.max(0, nextLeft),
    behavior: 'smooth',
  })
}

function syncViewportInset() {
  if (typeof window === 'undefined' || !window.visualViewport) {
    viewportInsetBottom.value = 0
    return
  }

  const visualViewport = window.visualViewport
  const inset = Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
  viewportInsetBottom.value = inset
}

function handleNotesFocus() {
  notesInputFocused.value = true
  syncViewportInset()
}

function handleNotesBlur() {
  notesInputFocused.value = false
  viewportInsetBottom.value = 0
}

function handleAudioReplay() {
  if (!hasCurrentStepAudio.value) return
  audioReplayToken.value += 1
}

function handleAudioToggleMute() {
  if (!hasCurrentStepAudio.value) return
  audioMuted.value = !audioMuted.value
}

function handleStepJump(targetSeq: number) {
  const index = steps.value.findIndex((step) => step.seq === targetSeq)
  if (index < 0 || index === currentStepIndex.value) {
    return
  }

  upsertCurrentStepResult()
  currentStepIndex.value = index
  executionStatus.value = 'in_progress'
  syncFormFromCurrentStep()
}

function handlePrevStep() {
  blurActiveElement()
  upsertCurrentStepResult()
  if (currentStepIndex.value > 0) {
    currentStepIndex.value -= 1
    executionStatus.value = 'in_progress'
    syncFormFromCurrentStep()
  }
}

function handleNextOrFinish() {
  blurActiveElement()
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
  blurActiveElement()
  executionStatus.value = 'interrupted'
  void persistSession('interrupted')
}

function handleAbort() {
  blurActiveElement()
  router.push(`/self-care/tasks/${taskId.value || ''}/select-student`)
}

function handleSwitchClick() {
  if (saving.value) {
    return
  }

  isExitConfirmVisible.value = true
}

function closeExitConfirm() {
  isExitConfirmVisible.value = false
}

function confirmExit() {
  isExitConfirmVisible.value = false
  handleAbort()
}

watch(() => currentStepIndex.value, async () => {
  await nextTick()
  centerActiveStepNav()
})

onMounted(async () => {
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

  if (window.visualViewport) {
    const handler = () => syncViewportInset()
    window.visualViewport.addEventListener('resize', handler)
    window.visualViewport.addEventListener('scroll', handler)
    removeViewportListener = () => {
      window.visualViewport?.removeEventListener('resize', handler)
      window.visualViewport?.removeEventListener('scroll', handler)
    }
  }

  await nextTick()
  centerActiveStepNav()
})

onBeforeUnmount(() => {
  removeViewportListener?.()
})
</script>

<style scoped>
.task-execution-page {
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  padding: 24px;
  color: #2d2418;
  background:
    linear-gradient(135deg, rgba(136, 176, 132, 0.16), transparent 32%),
    linear-gradient(180deg, #fff9ed 0%, #f4ead9 100%);
}

.task-execution-shell {
  --keyboard-inset: 0px;
  width: 100%;
  height: 100%;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.task-execution-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(400px, 24vw, 480px);
  gap: 20px;
  height: 100%;
  min-height: 0;
}

.task-execution-stage {
  display: grid;
  grid-template-rows: minmax(0, 1fr) 64px;
  gap: 12px;
  min-width: 0;
  min-height: 0;
}

.task-stage-figure {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(69, 57, 38, 0.18);
  border-radius: 18px;
  background: #241f19;
  box-shadow: 0 16px 36px rgba(48, 38, 24, 0.18);
}

.task-stage-title {
  position: absolute;
  z-index: 4;
  top: 14px;
  left: 14px;
  max-width: min(72%, 760px);
  padding: 10px 14px;
  border: 1px solid rgba(255, 234, 201, 0.34);
  border-radius: 16px;
  background: rgba(41, 30, 19, 0.56);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 24px rgba(17, 12, 8, 0.22);
}

.task-stage-title__text {
  margin: 0;
  overflow: hidden;
  color: #fff7ea;
  font-size: clamp(18px, 1.9vw, 28px);
  font-weight: 900;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-stage-figure__blur {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  filter: blur(24px);
  opacity: 0.78;
  transform: scale(1.08);
}

.task-stage-figure__blur.is-empty {
  background:
    linear-gradient(135deg, rgba(144, 175, 138, 0.42), transparent 42%),
    linear-gradient(180deg, #514535 0%, #2e2923 100%);
  filter: none;
  opacity: 1;
}

.task-stage-figure__image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.task-stage-figure__empty {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(255, 255, 255, 0.86);
  font-size: 22px;
  font-weight: 800;
}

.task-stage-media-controls {
  position: absolute;
  z-index: 3;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 14px;
  background: rgba(35, 29, 23, 0.54);
  backdrop-filter: blur(10px);
}

.media-control,
.media-control__status {
  min-height: 44px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
}

.media-control {
  min-width: 58px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  color: #fff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.16);
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2), 0 8px 14px rgba(0, 0, 0, 0.18);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.media-control:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.24), 0 4px 8px rgba(0, 0, 0, 0.18);
}

.media-control.is-selected {
  border-color: rgba(255, 224, 154, 0.92);
  background: rgba(219, 151, 50, 0.62);
}

.media-control:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.media-control__status {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.14);
}

.task-stage-caption {
  position: absolute;
  z-index: 2;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: 33.333%;
  padding: 14px 16px 16px;
  color: #fff;
  background: linear-gradient(180deg, transparent 0%, rgba(26, 22, 18, 0.82) 20%);
}

.task-stage-caption__body {
  max-height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
}

.task-stage-caption__step {
  display: inline-flex;
  margin-bottom: 6px;
  padding: 4px 8px;
  border-radius: 8px;
  color: #2f261c;
  font-size: 12px;
  font-weight: 900;
  background: rgba(255, 220, 143, 0.94);
}

.task-stage-caption p {
  margin: 0;
  font-size: clamp(16px, 1.5vw, 22px);
  font-weight: 800;
  line-height: 1.55;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.42);
}

.task-step-nav {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  min-height: 64px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 2px 8px;
  scrollbar-width: none;
  white-space: nowrap;
}

.task-step-nav::-webkit-scrollbar {
  display: none;
}

.task-step-nav__item {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  min-height: 48px;
  max-width: 260px;
  padding: 0 14px;
  border: 1px solid rgba(95, 75, 45, 0.22);
  border-radius: 12px;
  color: #5b4a32;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 4px 0 rgba(127, 91, 45, 0.22), 0 8px 16px rgba(71, 54, 31, 0.1);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.task-step-nav__item:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 rgba(127, 91, 45, 0.24), 0 4px 8px rgba(71, 54, 31, 0.1);
}

.task-step-nav__item.is-active {
  border-color: #566f45;
  color: #263a24;
  background: #dbe8cf;
  box-shadow: 0 5px 0 #9eb58a, 0 10px 18px rgba(65, 86, 47, 0.16);
}

.task-step-nav__index {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #fff;
  font-weight: 900;
  background: #6e5535;
}

.task-step-nav__item.is-active .task-step-nav__index {
  background: #45633d;
}

.task-step-nav__label {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
}

.task-execution-sidebar {
  display: grid;
  grid-template-rows: 56px auto auto auto minmax(0, 1fr) 56px;
  gap: 7px;
  min-width: 0;
  min-height: 0;
  padding: 10px;
  border: 1px solid rgba(93, 72, 43, 0.28);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 252, 244, 0.94), rgba(242, 226, 199, 0.94)),
    #f6ead6;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.38), 0 16px 28px rgba(58, 43, 25, 0.16);
  transition: transform 0.18s ease;
}

.task-execution-page.is-keyboard-active .task-execution-sidebar {
  transform: translateY(calc(var(--keyboard-inset, 0px) * -0.35));
}

.task-sidebar-student,
.task-sidebar__back-button,
.task-choice-card,
.task-action-button {
  min-height: 44px;
  border: 1px solid rgba(91, 68, 39, 0.26);
  color: #3b2b1b;
  font-weight: 900;
  cursor: pointer;
  transform: translateY(0);
  box-shadow: 0 6px 0 rgba(133, 97, 54, 0.34), 0 10px 20px rgba(75, 54, 31, 0.12);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.task-sidebar-student {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 56px;
  padding: 8px 10px;
  border-radius: 12px;
  background: #f6deb5;
}

.task-sidebar-student__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-sidebar-student__copy span {
  color: #7c6b55;
  font-size: 11px;
  font-weight: 800;
}

.task-sidebar-student__copy strong {
  overflow: hidden;
  color: #332719;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.05;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-sidebar__back-button:active,
.task-choice-card:active,
.task-action-button:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 3px 0 rgba(133, 97, 54, 0.34), 0 6px 12px rgba(75, 54, 31, 0.12);
}

.task-sidebar__back-button {
  flex: 0 0 auto;
  min-width: 72px;
  border-radius: 12px;
  background: #fff1d5;
}

.task-sidebar-panel {
  min-height: 0;
  padding: 7px;
  border: 1px solid rgba(111, 87, 55, 0.18);
  border-radius: 14px;
  background: rgba(255, 252, 246, 0.68);
}

.task-sidebar-panel h2,
.task-sidebar-panel__header h2 {
  margin: 0;
  color: #493824;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.2;
}

.task-sidebar-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.task-sidebar-panel__header span {
  flex: 0 0 auto;
  color: #6b7652;
  font-size: 12px;
  font-weight: 800;
}

.task-execution-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
}

.task-summary-block {
  display: flex;
  min-height: 52px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px;
  border: 1px solid rgba(94, 70, 38, 0.18);
  border-radius: 11px;
  background: #fff5df;
  box-shadow: 0 4px 0 rgba(151, 111, 60, 0.18);
}

.task-summary-block span {
  overflow: hidden;
  color: #7c6b55;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-summary-block strong {
  color: #3b2c1b;
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
}

.task-sidebar-panel--field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.task-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.task-choice-card {
  min-height: 48px;
  padding: 0 8px;
  border-radius: 12px;
  background: #f5dfb8;
}

.task-choice-card.is-selected {
  border-color: #45633d;
  color: #20371f;
  background: linear-gradient(180deg, #dcebd0 0%, #bdd5a9 100%);
  box-shadow: 0 6px 0 #8fac77, 0 12px 20px rgba(57, 83, 44, 0.18);
}

.task-sidebar-panel--notes {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 6px;
}

.task-notes-input {
  flex: 1;
  min-height: 0;
}

.task-notes-input :deep(.el-textarea__inner) {
  height: 100%;
  min-height: 96px !important;
  max-height: 100%;
  overflow-y: auto;
  border: 1px solid rgba(87, 65, 38, 0.24);
  border-radius: 12px;
  color: #332719;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 2px 6px rgba(71, 51, 29, 0.08);
}

.task-execution-actions {
  display: grid;
  grid-template-columns: 0.82fr 1fr 1fr;
  gap: 7px;
  align-items: stretch;
}

.task-action-button {
  min-height: 48px;
  padding: 0 8px;
  border-radius: 12px;
  font-size: 14px;
}

.task-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.task-action-button--secondary {
  background: #eadcc7;
}

.task-action-button--warning {
  background: #f3c977;
}

.task-action-button--primary {
  border-color: #3d6042;
  color: #fff;
  background: linear-gradient(180deg, #5f8d5b 0%, #416f43 100%);
  box-shadow: 0 6px 0 #2c4f31, 0 10px 20px rgba(48, 84, 52, 0.2);
}

.exit-confirm {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(20, 16, 12, 0.72);
  backdrop-filter: blur(6px);
}

.exit-confirm__card {
  width: min(100%, 470px);
  padding: 28px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.98));
  box-shadow:
    0 28px 80px rgba(15, 23, 42, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  text-align: center;
}

.exit-confirm__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 999px;
  color: #7c2d12;
  font-size: 26px;
  font-weight: 900;
  background: linear-gradient(135deg, #fde68a 0%, #fb923c 100%);
  box-shadow: 0 16px 36px rgba(251, 146, 60, 0.32);
}

.exit-confirm__title {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.45;
}

.exit-confirm__description {
  margin: 12px 0 0;
  color: #475569;
  font-size: 14px;
  line-height: 1.8;
}

.exit-confirm__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
}

.exit-confirm__button {
  border: 0;
  border-radius: 18px;
  padding: 14px 16px;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.exit-confirm__button:hover {
  transform: translateY(-1px);
}

.exit-confirm__button:active {
  transform: scale(0.98);
}

.exit-confirm__button--secondary {
  color: #1e3a8a;
  background: #dbeafe;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.3);
}

.exit-confirm__button--danger {
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  box-shadow: 0 14px 26px rgba(239, 68, 68, 0.26);
}

@media (max-width: 1020px) {
  .task-execution-page {
    height: auto;
    min-height: 100vh;
    overflow: auto;
    padding: 12px;
  }

  .task-execution-workspace {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 24px);
  }

  .task-execution-stage {
    grid-template-rows: auto minmax(420px, 58vh) 64px;
  }

  .task-stage-title {
    max-width: calc(100% - 28px);
  }

  .task-execution-sidebar {
    grid-template-rows: auto;
  }

  .exit-confirm__card {
    padding: 24px;
    border-radius: 24px;
  }

  .exit-confirm__title {
    font-size: 21px;
  }

  .exit-confirm__actions {
    grid-template-columns: 1fr;
  }
}
</style>
