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
        <div class="status-item status-item--progress">
          <span class="status-label">进度</span>
          <div class="step-dots" :aria-label="`当前第 ${displayStepIndex} 步，共 ${totalDisplaySteps} 步`">
            <div
              v-for="item in progressItems"
              :key="item.index"
              class="step-dot"
              :class="{
                'step-dot--done': item.isDone,
                'step-dot--current': item.isCurrent,
              }"
            >
              <span v-if="item.isDone">✓</span>
              <span v-else>{{ item.index + 1 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="workspace-shell">
        <SceneSupportPanel
          v-if="sceneMetadata"
          :metadata="sceneMetadata"
          :resource-label="resourceLabel"
          :active-perspective="activePerspective"
        />

        <div class="workspace-main">
          <CareStepGuidePanel
            v-if="isCareScene && sceneMetadata"
            :receiver-name="sceneMetadata.receiverName"
            :emotion-chips="sceneMetadata.emotionChips"
            :comfort-tip="sceneMetadata.comfortTip"
            :current-step="careGuideStep"
            :selected-emotion-chip="selectedEmotionChip"
            :chip-enabled="currentRendererKey === 'care_utterance'"
            @select-emotion-chip="handleEmotionChipSelect"
          />

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
      </div>
    </template>

    <el-skeleton v-else animated :rows="8" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import CareStepGuidePanel from '@/components/emotional/engine/CareStepGuidePanel.vue'
import SceneSupportPanel from '@/components/emotional/engine/SceneSupportPanel.vue'
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
const selectedEmotionChip = ref('')
const activeConfigSignature = ref('')
const autoAdvanceTimer = ref<number | null>(null)
const isTransitioning = ref(false)

const currentStep = computed(() => session.currentStep.value as EmotionalCompiledStep | null)
const currentHintLevel = computed(() => session.currentHintLevel.value)
const currentRendererKey = computed(() => currentStep.value ? getRendererKey(currentStep.value) : null)
const currentRendererComponent = computed(() => currentRendererKey.value ? emotionalRendererMap[currentRendererKey.value] : null)
const displayStepIndex = computed(() => session.currentIndex.value + 1)
const totalDisplaySteps = computed(() => props.sessionConfig?.steps.length || 0)
const isCareScene = computed(() => props.sessionConfig?.subModule === 'care_scene')
const sceneMetadata = computed(() => {
  const introStep = props.sessionConfig?.steps.find((step) => step.phase === 'scene_intro')
  return introStep?.metadata as SceneIntroStepMetadata | null
})
const activePerspective = computed<'sender' | 'receiver'>(() => {
  if (currentStep.value?.perspective === 'receiver' || currentRendererKey.value === 'receiver_preference') {
    return 'receiver'
  }

  return 'sender'
})
const progressItems = computed(() => Array.from({ length: totalDisplaySteps.value }, (_, index) => ({
  index,
  isDone: index < session.currentIndex.value,
  isCurrent: index === session.currentIndex.value,
})))
const careGuideStep = computed<1 | 2 | 3>(() => {
  if (!isCareScene.value) {
    return 1
  }

  if (currentRendererKey.value === 'scene_intro') {
    return 1
  }

  if (currentRendererKey.value === 'care_utterance' && !selectedEmotionChip.value) {
    return 2
  }

  return 3
})
const stepKey = computed(() => {
  const selectionKey = selectionState.value ? `${selectionState.value.kind}:${selectionState.value.canAdvance}` : 'none'
  return `${currentStep.value?.key || 'empty'}:${currentHintLevel.value}:${selectionKey}:${selectedEmotionChip.value || 'no-chip'}`
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
      receiverName: sceneMetadata.value?.receiverName,
      selectedEmotionChip: selectedEmotionChip.value,
      requiresEmotionChip: isCareScene.value,
    }
  }

  if (currentRendererKey.value === 'receiver_preference') {
    return {
      step: currentStep.value,
      hintLevel: currentHintLevel.value,
      selectionState: selectionState.value?.kind === 'receiver_preference' ? selectionState.value : null,
      receiverName: sceneMetadata.value?.receiverName,
      selectedEmotionChip: selectedEmotionChip.value,
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
  selectedEmotionChip.value = ''
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

function handleEmotionChipSelect(value: string) {
  selectedEmotionChip.value = value
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
  background: linear-gradient(135deg, #fff7d9 0%, #ffe8c5 100%);
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.status-item--progress {
  margin-left: auto;
  min-width: 220px;
}

.status-label {
  font-size: 12px;
  color: #909399;
}

.step-dots {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.step-dot {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 2px solid #d9d6d2;
  background: #f3efe9;
  color: #9b938b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.step-dot--current {
  border-color: #f1b562;
  background: linear-gradient(135deg, #ffe2ae 0%, #ffd08d 100%);
  color: #7a4b16;
  box-shadow: 0 0 0 4px rgba(241, 181, 98, 0.16);
}

.step-dot--done {
  border-color: #67c23a;
  background: #67c23a;
  color: #fff;
}

.workspace-shell {
  display: grid;
  grid-template-columns: minmax(520px, 1.2fr) minmax(360px, 0.95fr);
  gap: 20px;
  align-items: start;
}

.workspace-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stage-card {
  border-radius: 28px;
  border: 1px solid #ebeef5;
  min-height: 560px;
  background: #fff;
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

@media (max-width: 1180px) {
  .workspace-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .status-item--progress {
    margin-left: 0;
    min-width: 0;
  }
}
</style>
