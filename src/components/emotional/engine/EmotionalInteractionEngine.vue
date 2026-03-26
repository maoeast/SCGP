<template>
  <div class="engine-root">
    <template v-if="currentStep && currentRendererComponent">
      <div class="status-strip">
        <div class="status-item">
          <span class="status-label">学生</span>
          <strong>{{ studentLabel }}</strong>
        </div>
        <div class="status-item">
          <span class="status-label">场景</span>
          <strong>{{ resourceLabel }}</strong>
        </div>
        <div class="status-item">
          <span class="status-label">进度</span>
          <strong>{{ displayStepIndex }} / {{ totalDisplaySteps }}</strong>
        </div>
      </div>

      <el-progress
        :percentage="progressPercentage"
        :stroke-width="12"
        :show-text="false"
        class="stage-progress"
      />

      <div class="workspace-shell">
        <Transition name="stage-fade" mode="out-in">
          <el-card :key="stepKey" class="stage-card" shadow="never">
            <component
              :is="currentRendererComponent"
              v-bind="currentRendererProps"
              @advance="handleAdvance"
              @select="handleSelect"
              @continue="handleContinue"
            />
          </el-card>
        </Transition>

        <el-alert
          v-if="feedbackMessage"
          :title="feedbackMessage.title"
          :description="feedbackMessage.description"
          :type="feedbackMessage.type"
          :closable="false"
          show-icon
          class="feedback-panel"
        />
      </div>
    </template>

    <el-skeleton v-else animated :rows="8" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useEmotionalSession } from '@/composables/useEmotionalSession'
import { buildFeedbackMessage } from '@/components/emotional/engine/runtime/feedback'
import {
  getDefaultIntroActionLabel,
  getPostSubmitBehavior,
} from '@/components/emotional/engine/runtime/navigation'
import {
  emotionalRendererMap,
  getRendererKey,
} from '@/components/emotional/engine/runtime/rendererMap'
import type {
  CareUtteranceSelectionState,
  EmotionalCompiledSessionConfig,
  EmotionalCompiledStep,
  EmotionalEngineNavigationHandlers,
  EmotionalEngineSubmitInput,
  EmotionalFeedbackMessage,
  EmotionalRendererSelectionState,
  ReceiverPreferenceSelectionState,
  SceneIntroStepMetadata,
} from '@/features/emotional/engine/types'

const props = withDefaults(defineProps<{
  sessionConfig: EmotionalCompiledSessionConfig | null
  studentLabel: string
  resourceLabel: string
  introActionLabel?: string
  autoAdvanceDelayMs?: number
  navigation: EmotionalEngineNavigationHandlers
}>(), {
  introActionLabel: undefined,
  autoAdvanceDelayMs: 700,
})

const session = useEmotionalSession()

const feedbackMessage = ref<EmotionalFeedbackMessage | null>(null)
const selectionState = ref<EmotionalRendererSelectionState | null>(null)
const activeConfigSignature = ref('')
const autoAdvanceTimer = ref<number | null>(null)
const isTransitioning = ref(false)

const currentStep = computed(() => session.currentStep.value as EmotionalCompiledStep | null)
const currentHintLevel = computed(() => session.currentHintLevel.value)
const currentRendererKey = computed(() => currentStep.value ? getRendererKey(currentStep.value) : null)
const currentRendererComponent = computed(() => currentRendererKey.value ? emotionalRendererMap[currentRendererKey.value] : null)
const displayStepIndex = computed(() => session.currentIndex.value + 1)
const totalDisplaySteps = computed(() => props.sessionConfig?.steps.length || 0)
const progressPercentage = computed(() => {
  if (!props.sessionConfig?.steps.length) {
    return 0
  }

  return Math.round((displayStepIndex.value / props.sessionConfig.steps.length) * 100)
})
const stepKey = computed(() => {
  const selectionKey = selectionState.value ? `${selectionState.value.kind}:${selectionState.value.canAdvance}` : 'none'
  return `${currentStep.value?.key || 'empty'}:${currentHintLevel.value}:${selectionKey}`
})

const currentRendererProps = computed(() => {
  if (!currentStep.value || !props.sessionConfig) {
    return {}
  }

  if (currentRendererKey.value === 'scene_intro') {
    return {
      metadata: currentStep.value.metadata as SceneIntroStepMetadata,
      resourceLabel: props.resourceLabel,
      actionLabel: props.introActionLabel || getDefaultIntroActionLabel(props.sessionConfig.subModule),
    }
  }

  if (currentRendererKey.value === 'care_utterance') {
    return {
      step: currentStep.value,
      hintLevel: currentHintLevel.value,
      selectionState: selectionState.value?.kind === 'care_utterance' ? selectionState.value : null,
    }
  }

  if (currentRendererKey.value === 'receiver_preference') {
    return {
      step: currentStep.value,
      hintLevel: currentHintLevel.value,
      selectionState: selectionState.value?.kind === 'receiver_preference' ? selectionState.value : null,
    }
  }

  return {
    step: currentStep.value,
    hintLevel: currentHintLevel.value,
  }
})

watch(() => props.sessionConfig, (config) => {
  if (!config) {
    return
  }

  const signature = `${config.subModule}:${config.resourceId}:${config.studentId}`
  if (signature === activeConfigSignature.value) {
    return
  }

  activeConfigSignature.value = signature
  clearAutoAdvance()
  selectionState.value = null
  feedbackMessage.value = null
  isTransitioning.value = false
  session.startSession(config)
}, { immediate: true })

onBeforeUnmount(() => {
  clearAutoAdvance()
})

function clearAutoAdvance() {
  if (autoAdvanceTimer.value !== null) {
    window.clearTimeout(autoAdvanceTimer.value)
    autoAdvanceTimer.value = null
  }
}

function clearTransientState() {
  clearAutoAdvance()
  selectionState.value = null
  feedbackMessage.value = null
  isTransitioning.value = false
}

function buildSelectionState(
  step: EmotionalCompiledStep,
  canAdvance: boolean,
): EmotionalRendererSelectionState | null {
  const latestAttempt = session.attempts.value[session.attempts.value.length - 1]
  const selectedOption = step.options?.find((option) => option.value === latestAttempt?.selectedValue)

  if (step.stepType === 'care_utterance') {
    return {
      kind: 'care_utterance',
      canAdvance,
      feedbackCode: latestAttempt?.feedbackCode || 'retry',
      selectedValue: latestAttempt?.selectedValue || null,
      metadata: selectedOption?.metadata || null,
    } as CareUtteranceSelectionState
  }

  if (step.stepType === 'receiver_preference') {
    return {
      kind: 'receiver_preference',
      canAdvance,
      feedbackCode: latestAttempt?.feedbackCode || 'retry',
      selectedValue: latestAttempt?.selectedValue || null,
      metadata: selectedOption?.metadata || null,
    } as ReceiverPreferenceSelectionState
  }

  return null
}

function handleAdvance() {
  clearTransientState()
  session.advanceStep()
}

async function handleSelect(payload: EmotionalEngineSubmitInput) {
  const step = currentStep.value
  const config = props.sessionConfig
  if (!step || !config || isTransitioning.value) {
    return
  }

  const submitResult = session.submitStep({
    selectedValue: payload.value,
    selectedLabel: payload.label,
    perspective: payload.perspective || step.perspective,
  })

  const feedbackCode = submitResult.result.feedbackCode || 'retry'
  feedbackMessage.value = buildFeedbackMessage(
    config.subModule,
    step.stepType,
    submitResult.canAdvance,
    feedbackCode,
    session.currentHintLevel.value,
  )

  selectionState.value = buildSelectionState(step, submitResult.canAdvance)

  if (!submitResult.canAdvance) {
    return
  }

  const behavior = getPostSubmitBehavior(step)
  if (behavior === 'auto') {
    scheduleAutoAdvance()
  }
}

function scheduleAutoAdvance() {
  clearAutoAdvance()
  isTransitioning.value = true
  autoAdvanceTimer.value = window.setTimeout(async () => {
    await advanceOrComplete()
  }, props.autoAdvanceDelayMs)
}

async function advanceOrComplete() {
  const hasNext = session.advanceStep()
  if (!hasNext) {
    await completeSession()
    return
  }

  clearTransientState()
}

async function handleContinue() {
  if (!selectionState.value?.canAdvance) {
    return
  }

  if (selectionState.value.kind === 'receiver_preference') {
    clearTransientState()
    await completeSession()
    return
  }

  await advanceOrComplete()
}

async function completeSession() {
  clearAutoAdvance()
  isTransitioning.value = true
  const persisted = await session.completeSession()
  await props.navigation.completeSessionSummary(persisted)
}

async function cancelIfNeeded() {
  clearAutoAdvance()
  if (session.isActive.value && session.attempts.value.length > 0 && !session.persistedIds.value) {
    await session.cancelSession()
  }
}

async function handleExit() {
  await cancelIfNeeded()
  await props.navigation.exitTraining()
}

defineExpose({
  cancelIfNeeded,
  handleExit,
})
</script>

<style scoped>
.engine-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fff8e1 0%, #eef7ff 100%);
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.status-label {
  font-size: 12px;
  color: #909399;
}

.stage-progress {
  margin-bottom: 8px;
}

.workspace-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stage-card {
  border-radius: 28px;
  border: 1px solid #ebeef5;
  min-height: 560px;
}

.feedback-panel {
  border-radius: 18px;
}

.stage-fade-enter-active,
.stage-fade-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.stage-fade-enter-from,
.stage-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
