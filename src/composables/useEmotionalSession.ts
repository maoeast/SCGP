import { computed, ref, shallowRef } from 'vue'
import { EmotionalTrainingAPI } from '../database/emotional-api'
import type {
  EmotionalFeedbackCode,
  EmotionalPerspective,
  EmotionalSessionConfig,
  EmotionalSessionPhase,
  EmotionalSessionStatus,
  EmotionalStepResult,
  EmotionalStepSubmitPayload,
  EmotionalTrainingSummaryRawData,
} from '../types/emotional'

function now() {
  return Date.now()
}

function deriveStepOutcome(
  step: EmotionalSessionConfig['steps'][number],
  payload: EmotionalStepSubmitPayload,
) {
  if (typeof payload.isCorrect === 'boolean') {
    return {
      isCorrect: payload.isCorrect,
      isAcceptable: payload.isAcceptable ?? payload.isCorrect,
    }
  }

  const correctValues = new Set(step.correctValues || step.options?.filter((option) => option.isCorrect).map((option) => option.value) || [])
  const acceptableValues = new Set(step.acceptableValues || step.options?.filter((option) => option.isAcceptable).map((option) => option.value) || [])
  const isCorrect = correctValues.has(payload.selectedValue)
  const isAcceptable = isCorrect || acceptableValues.has(payload.selectedValue)

  return {
    isCorrect,
    isAcceptable,
  }
}

export function useEmotionalSession() {
  const api = new EmotionalTrainingAPI()

  const status = ref<EmotionalSessionStatus>('idle')
  const sessionConfig = shallowRef<EmotionalSessionConfig | null>(null)
  const currentIndex = ref(0)
  const currentStepStartedAt = ref<number | null>(null)
  const sessionStartedAt = ref<number | null>(null)
  const sessionEndedAt = ref<number | null>(null)
  const currentHintLevel = ref<0 | 1 | 2 | 3>(0)
  const currentRetryCount = ref(0)
  const totalHintCount = ref(0)
  const totalRetryCount = ref(0)
  const lastError = ref<string | null>(null)
  const latestResults = ref<Record<string, EmotionalStepResult>>({})
  const attempts = ref<EmotionalStepResult[]>([])
  const persistedIds = ref<{ trainingRecordId: number; sessionId: number; detailIds: number[] } | null>(null)

  const steps = computed(() => sessionConfig.value?.steps || [])
  const currentStep = computed(() => steps.value[currentIndex.value] || null)
  const currentPhase = computed<EmotionalSessionPhase | null>(() => currentStep.value?.phase || null)
  const isActive = computed(() => status.value === 'running')
  const questionSteps = computed(() => steps.value.filter((step) => step.stepType))
  const completedStepCount = computed(() => Object.keys(latestResults.value).length)

  function resetRuntimeState() {
    currentIndex.value = 0
    currentStepStartedAt.value = null
    sessionStartedAt.value = null
    sessionEndedAt.value = null
    currentHintLevel.value = 0
    currentRetryCount.value = 0
    totalHintCount.value = 0
    totalRetryCount.value = 0
    lastError.value = null
    latestResults.value = {}
    attempts.value = []
    persistedIds.value = null
    status.value = 'idle'
  }

  function startStepTimer() {
    currentStepStartedAt.value = now()
  }

  function startSession(config: EmotionalSessionConfig) {
    resetRuntimeState()
    sessionConfig.value = config
    sessionStartedAt.value = config.startedAt || now()
    status.value = 'running'
    startStepTimer()
  }

  function getCurrentResponseTimeMs() {
    if (!currentStepStartedAt.value) return 0
    return Math.max(0, now() - currentStepStartedAt.value)
  }

  function escalatePrompting() {
    const nextHintLevel = Math.min(3, currentHintLevel.value + 1) as 0 | 1 | 2 | 3
    if (nextHintLevel > currentHintLevel.value) {
      totalHintCount.value += 1
    }
    currentHintLevel.value = nextHintLevel
    currentRetryCount.value += 1
    totalRetryCount.value += 1

    return {
      hintLevel: currentHintLevel.value,
      retryCount: currentRetryCount.value,
    }
  }

  function resetPromptingForNextStep() {
    currentHintLevel.value = 0
    currentRetryCount.value = 0
  }

  function submitStep(payload: EmotionalStepSubmitPayload) {
    const step = currentStep.value
    if (!step) {
      throw new Error('No active emotional session step')
    }

    const responseTimeMs = getCurrentResponseTimeMs()
    const outcome = deriveStepOutcome(step, payload)
    const result: EmotionalStepResult = {
      stepKey: step.key,
      stepType: step.stepType,
      phase: step.phase,
      selectedValue: payload.selectedValue,
      selectedLabel: payload.selectedLabel,
      isCorrect: outcome.isCorrect,
      isAcceptable: outcome.isAcceptable,
      hintLevel: currentHintLevel.value,
      retryCount: currentRetryCount.value,
      responseTimeMs,
      feedbackCode: payload.feedbackCode || (outcome.isCorrect ? 'correct' : outcome.isAcceptable ? 'acceptable' : 'retry'),
      perspective: payload.perspective || step.perspective || 'none',
      recordedAt: now(),
    }

    attempts.value.push(result)
    latestResults.value = {
      ...latestResults.value,
      [step.key]: result,
    }

    if (!outcome.isCorrect && !outcome.isAcceptable) {
      const promptState = escalatePrompting()
      startStepTimer()
      return {
        result,
        canAdvance: false,
        promptState,
      }
    }

    return {
      result,
      canAdvance: true,
      promptState: {
        hintLevel: currentHintLevel.value,
        retryCount: currentRetryCount.value,
      },
    }
  }

  function goToStep(index: number) {
    if (!sessionConfig.value) return
    if (index < 0 || index >= steps.value.length) return

    currentIndex.value = index
    resetPromptingForNextStep()
    startStepTimer()
  }

  function advanceStep() {
    if (currentIndex.value >= steps.value.length - 1) {
      return false
    }
    goToStep(currentIndex.value + 1)
    return true
  }

  function goBackStep() {
    if (currentIndex.value <= 0) {
      return false
    }
    goToStep(currentIndex.value - 1)
    return true
  }

  function buildSummary(): EmotionalTrainingSummaryRawData {
    if (!sessionConfig.value) {
      throw new Error('No emotional session config to summarize')
    }

    const latestAttemptList = Object.values(latestResults.value)
    const correctCount = latestAttemptList.filter((item) => item.isCorrect || item.isAcceptable).length

    const baseSummary: EmotionalTrainingSummaryRawData = {
      subModule: sessionConfig.value.subModule,
      resourceId: sessionConfig.value.resourceId,
      resourceType: sessionConfig.value.resourceType,
      sessionType: sessionConfig.value.subModule,
      correctCount,
      questionCount: questionSteps.value.length,
      hintCount: totalHintCount.value,
      retryCount: totalRetryCount.value,
      dominantChoiceType: null,
      preferredPerspective: null,
    }

    const perspectiveCounts = latestAttemptList.reduce<Record<string, number>>((acc, item) => {
      acc[item.perspective] = (acc[item.perspective] || 0) + 1
      return acc
    }, {})

    if ((perspectiveCounts.sender || 0) > (perspectiveCounts.receiver || 0)) {
      baseSummary.preferredPerspective = 'sender'
    } else if ((perspectiveCounts.receiver || 0) > 0) {
      baseSummary.preferredPerspective = 'receiver'
    }

    const customSummary = sessionConfig.value.buildSummary?.({
      config: sessionConfig.value,
      latestResults: latestAttemptList,
      attempts: attempts.value,
      totalHintCount: totalHintCount.value,
      totalRetryCount: totalRetryCount.value,
    })

    return {
      ...baseSummary,
      ...customSummary,
    }
  }

  function buildDetailRows() {
    if (!sessionConfig.value) {
      throw new Error('No emotional session config to build detail rows')
    }

    const stepIndexMap = new Map(sessionConfig.value.steps.map((step, index) => [step.key, index]))

    return attempts.value.map((attempt) => {
      const step = sessionConfig.value?.steps.find((item) => item.key === attempt.stepKey)
      return {
        session_id: 0,
        student_id: sessionConfig.value!.studentId,
        resource_id: sessionConfig.value!.resourceId,
        step_type: attempt.stepType,
        step_index: stepIndexMap.get(attempt.stepKey) ?? 0,
        prompt_id: step?.promptId || null,
        selected_value: attempt.selectedValue,
        selected_label: attempt.selectedLabel || null,
        is_correct: attempt.isCorrect ? 1 : 0,
        is_acceptable: attempt.isAcceptable ? 1 : 0,
        hint_level: attempt.hintLevel,
        retry_count: attempt.retryCount,
        response_time_ms: attempt.responseTimeMs,
        feedback_code: attempt.feedbackCode || null,
        perspective: attempt.perspective,
      }
    })
  }

  async function persistSession(completionStatus: 'completed' | 'cancelled' | 'interrupted') {
    if (!sessionConfig.value || !sessionStartedAt.value) {
      throw new Error('No active emotional session to persist')
    }

    status.value = 'persisting'
    sessionEndedAt.value = sessionEndedAt.value || now()

    try {
      const summary = buildSummary()
      const result = await api.persistSession({
        studentId: sessionConfig.value.studentId,
        resourceId: sessionConfig.value.resourceId,
        resourceType: sessionConfig.value.resourceType,
        subModule: sessionConfig.value.subModule,
        startedAt: sessionStartedAt.value,
        endedAt: sessionEndedAt.value,
        completionStatus,
        summary,
        details: buildDetailRows(),
      })

      persistedIds.value = result
      status.value = completionStatus === 'completed' ? 'completed' : 'cancelled'
      return result
    } catch (error) {
      status.value = 'error'
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  async function completeSession() {
    sessionEndedAt.value = now()
    return persistSession('completed')
  }

  async function cancelSession() {
    sessionEndedAt.value = now()
    return persistSession('cancelled')
  }

  return {
    status,
    sessionConfig,
    currentIndex,
    currentStep,
    currentPhase,
    currentHintLevel,
    currentRetryCount,
    totalHintCount,
    totalRetryCount,
    completedStepCount,
    attempts,
    latestResults,
    lastError,
    persistedIds,
    isActive,
    steps,
    startSession,
    submitStep,
    advanceStep,
    goBackStep,
    goToStep,
    escalatePrompting,
    completeSession,
    cancelSession,
    resetRuntimeState,
  }
}
