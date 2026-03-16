<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">情绪行为调节</el-breadcrumb-item>
        <el-breadcrumb-item>表达关心训练</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>表达关心训练</h1>
        <p class="subtitle">围绕“我怎么说”和“别人听起来怎么样”，练习共情、建议和行动支持。</p>
      </div>
      <div class="header-right">
        <el-button plain @click="handleExit">结束训练</el-button>
      </div>
    </div>

    <div class="main-content">
      <el-alert
        v-if="loadError"
        type="warning"
        :closable="false"
        show-icon
        title="暂时无法加载训练资源"
        :description="loadError"
      />

      <template v-else-if="resource && sessionConfig && currentStep">
        <div class="status-strip">
          <div class="status-item">
            <span class="status-label">学生</span>
            <strong>{{ studentName || `学生 #${studentId}` }}</strong>
          </div>
          <div class="status-item">
            <span class="status-label">情境</span>
            <strong>{{ resource.name }}</strong>
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
            <el-card :key="currentStep.key + currentHintLevel" class="stage-card" shadow="never">
              <template v-if="currentPhase === 'scene_intro'">
                <div class="intro-stage">
                  <PerspectiveSwitchView
                    active-side="sender"
                    title="先看清现在是谁在说，谁在听"
                    :description="sceneIntroText"
                  />

                  <div class="scene-hero">
                    <div class="scene-visual">
                      <span class="scene-emoji">{{ sceneEmoji }}</span>
                    </div>
                    <div class="scene-copy">
                      <el-tag effect="light" class="scene-tag">{{ resource.name }}</el-tag>
                      <h2 class="scene-title">{{ sceneTitle }}</h2>
                      <p class="scene-description">{{ resource.description || '请先观察情境，再决定怎么表达关心。' }}</p>
                    </div>
                  </div>

                  <div class="action-bar">
                    <el-button type="primary" size="large" @click="advanceFromIntro">
                      开始选择关心表达
                    </el-button>
                  </div>
                </div>
              </template>

              <template v-else-if="currentPhase === 'solution' && utteranceCards.length > 0">
                <div class="care-stage">
                  <PerspectiveSwitchView
                    active-side="sender"
                    title="现在轮到我来说"
                    :description="speakerPromptText"
                  />

                  <div class="option-list">
                    <CareOptionCard
                      v-for="option in visibleUtteranceCards"
                      :key="option.value"
                      :type-label="option.typeLabel"
                      :text="option.label"
                      :support-text="option.supportText"
                      :icon="option.icon"
                      :muted="option.muted"
                      :highlighted="option.highlighted"
                      @select="handleUtteranceSelect(option.value)"
                    />
                  </div>

                  <el-card v-if="selectedUtteranceEffect" class="effect-card" shadow="never">
                    <template #header>
                      <span>这句话带来的感觉</span>
                    </template>
                    <div class="effect-grid">
                      <div class="effect-copy">
                        <p class="effect-text">{{ selectedUtteranceEffect.effect }}</p>
                        <p class="reaction-line">
                          <span class="reaction-emoji">{{ selectedUtteranceEffect.receiverReactionEmoji || '🙂' }}</span>
                          <span>{{ selectedUtteranceEffect.receiverReactionText || '对方会更容易感受到你的关心。' }}</span>
                        </p>
                      </div>
                      <div class="effect-actions" v-if="canAdvanceFromUtterance">
                        <el-button type="primary" size="large" @click="continueFromUtterance">
                          看看对方听起来更舒服的是哪句
                        </el-button>
                      </div>
                    </div>
                  </el-card>
                </div>
              </template>

              <template v-else-if="currentPhase === 'perspective_taking' && receiverCards.length > 0">
                <div class="care-stage">
                  <PerspectiveSwitchView
                    active-side="receiver"
                    title="现在换到对方来听"
                    :description="receiverPromptText"
                  />

                  <div class="option-list">
                    <CareOptionCard
                      v-for="option in visibleReceiverCards"
                      :key="option.value"
                      type-label="听起来最舒服"
                      :text="option.label"
                      :support-text="option.supportText"
                      :icon="option.icon"
                      :muted="option.muted"
                      :highlighted="option.highlighted"
                      @select="handleReceiverSelect(option.value)"
                    />
                  </div>

                  <el-card v-if="selectedReceiverReason" class="effect-card" shadow="never">
                    <template #header>
                      <span>为什么这句更舒服</span>
                    </template>
                    <div class="effect-grid">
                      <div class="effect-copy">
                        <p class="effect-text">{{ selectedReceiverReason.reasonText }}</p>
                        <p class="reaction-line">
                          <span class="reaction-emoji">{{ selectedReceiverReason.isComforting ? '😊' : '😕' }}</span>
                          <span>{{ selectedReceiverReason.isComforting ? '这句话更容易让人放松下来。' : '这句话可能会让对方更有压力。' }}</span>
                        </p>
                      </div>
                      <div class="effect-actions" v-if="canAdvanceFromReceiver">
                        <el-button type="primary" size="large" @click="completeCareSession">
                          完成训练
                        </el-button>
                      </div>
                    </div>
                  </el-card>
                </div>
              </template>

              <template v-else>
                <div class="empty-stage">
                  <el-empty description="当前步骤暂未配置可交互内容" />
                </div>
              </template>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import CareOptionCard from '@/components/emotional/CareOptionCard.vue'
import PerspectiveSwitchView from '@/components/emotional/PerspectiveSwitchView.vue'
import { useEmotionalSession } from '@/composables/useEmotionalSession'
import type {
  CareSceneResourceMeta,
  EmotionalFeedbackCode,
  EmotionalSessionConfig,
} from '@/types/emotional'

interface CareSceneResourceRecord {
  id: number
  name: string
  description?: string
  coverImage?: string
  resourceType: 'care_scene'
  metadata: CareSceneResourceMeta & Record<string, any>
}

interface DbLike {
  get: (sql: string, params?: any[]) => any
  all?: (sql: string, params?: any[]) => any[]
}

const CARE_TYPE_META = {
  empathy: { label: '共情式', icon: '💞' },
  advice: { label: '建议式', icon: '🧭' },
  action: { label: '行动式', icon: '🤝' },
} as const

const route = useRoute()
const router = useRouter()
const session = useEmotionalSession()

const resource = ref<CareSceneResourceRecord | null>(null)
const sessionConfig = ref<EmotionalSessionConfig | null>(null)
const feedbackMessage = ref<{ title: string; description: string; type: 'success' | 'info' } | null>(null)
const loadError = ref('')
const selectedUtteranceEffect = ref<CareSceneResourceMeta['utterances'][number] | null>(null)
const selectedReceiverReason = ref<CareSceneResourceMeta['receiverOptions'][number] | null>(null)
const canAdvanceFromUtterance = ref(false)
const canAdvanceFromReceiver = ref(false)

const inheritedQuery = computed(() => ({ ...route.query }))
const studentId = computed(() => Number(Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId || 0))
const studentName = computed(() => {
  const value = route.query.studentName
  return Array.isArray(value) ? value[0] : value || ''
})

const currentStep = computed(() => session.currentStep.value)
const currentPhase = computed(() => session.currentPhase.value)
const currentHintLevel = computed(() => session.currentHintLevel.value)
const careMeta = computed(() => (resource.value?.metadata || {}) as CareSceneResourceMeta & Record<string, any>)
const sceneEmoji = computed(() => resource.value?.coverImage || '💌')
const sceneTitle = computed(() => careMeta.value.title || resource.value?.name || '表达关心场景')
const totalDisplaySteps = computed(() => sessionConfig.value?.steps.length || 0)
const displayStepIndex = computed(() => session.currentIndex.value + 1)
const progressPercentage = computed(() => {
  if (!sessionConfig.value || sessionConfig.value.steps.length === 0) return 0
  return Math.round((displayStepIndex.value / sessionConfig.value.steps.length) * 100)
})

const sceneIntroText = computed(() => careMeta.value.speakerPerspectiveText || '先观察情境，再判断怎样表达关心更合适。')
const speakerPromptText = computed(() => careMeta.value.speakerPerspectiveText || '请选择你想对对方说的话。')
const receiverPromptText = computed(() => careMeta.value.receiverPerspectiveText || '请选择你觉得听起来最舒服的一句话。')

function getActiveDb(): DbLike {
  const db = (window as Window & { db?: DbLike }).db
  if (!db) {
    throw new Error('Database is not initialized on window.db')
  }
  return db
}

function mapResourceRow(row: any): CareSceneResourceRecord {
  const metadata = row.meta_data ? JSON.parse(row.meta_data) : {}
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    coverImage: row.cover_image || undefined,
    resourceType: 'care_scene',
    metadata,
  }
}

function getVisibleOptions<T extends { isCorrect?: boolean; isAcceptable?: boolean }>(options: T[]) {
  if (currentHintLevel.value === 0 || currentHintLevel.value === 1) {
    return options
  }

  if (currentHintLevel.value === 2) {
    const correct = options.filter((option) => option.isCorrect || option.isAcceptable)
    const wrong = options.filter((option) => !option.isCorrect && !option.isAcceptable)
    return [...correct, ...wrong.slice(0, Math.ceil(wrong.length / 2))]
  }

  return options.filter((option) => option.isCorrect || option.isAcceptable)
}

const utteranceCards = computed(() => {
  const step = currentStep.value
  if (!step || currentPhase.value !== 'solution' || !step.options) return []

  return step.options.map((option) => {
    const utterance = careMeta.value.utterances.find((item) => item.id === option.value)
    const typeMeta = CARE_TYPE_META[utterance?.type || 'empathy']
    return {
      value: option.value,
      label: option.label,
      supportText: utterance?.effect || '',
      icon: typeMeta.icon,
      typeLabel: typeMeta.label,
      isCorrect: !!option.isCorrect,
      isAcceptable: !!option.isAcceptable,
      muted: currentHintLevel.value === 1 && !option.isCorrect && !option.isAcceptable,
      highlighted: currentHintLevel.value >= 2 && (!!option.isCorrect || !!option.isAcceptable),
      utterance,
    }
  })
})

const visibleUtteranceCards = computed(() => getVisibleOptions(utteranceCards.value))

const receiverCards = computed(() => {
  const step = currentStep.value
  if (!step || currentPhase.value !== 'perspective_taking' || !step.options) return []

  return step.options.map((option) => {
    const receiver = careMeta.value.receiverOptions.find((item) => item.id === option.value)
    return {
      value: option.value,
      label: option.label,
      supportText: receiver?.reasonText || '',
      icon: receiver?.isComforting ? '😊' : '💭',
      isCorrect: !!option.isCorrect,
      isAcceptable: !!option.isAcceptable,
      muted: currentHintLevel.value === 1 && !option.isCorrect && !option.isAcceptable,
      highlighted: currentHintLevel.value >= 2 && (!!option.isCorrect || !!option.isAcceptable),
      receiver,
    }
  })
})

const visibleReceiverCards = computed(() => getVisibleOptions(receiverCards.value))

function buildSessionConfig(meta: CareSceneResourceMeta): EmotionalSessionConfig {
  const steps: EmotionalSessionConfig['steps'] = [
    {
      key: 'care_intro',
      phase: 'scene_intro',
      stepType: 'care_utterance',
      interactive: false,
      title: meta.title,
      metadata: {
        speakerPerspectiveText: meta.speakerPerspectiveText,
      },
    },
    {
      key: 'care_utterance_choice',
      phase: 'solution',
      stepType: 'care_utterance',
      promptText: meta.speakerPerspectiveText,
      perspective: 'sender',
      options: meta.utterances.map((utterance) => ({
        value: utterance.id,
        label: utterance.text,
        isCorrect: meta.preferredUtteranceIds.includes(utterance.id),
        isAcceptable: utterance.type === 'advice',
        metadata: {
          type: utterance.type,
          effect: utterance.effect,
          receiverReactionText: utterance.receiverReactionText,
          receiverReactionEmoji: utterance.receiverReactionEmoji,
        },
      })),
      correctValues: meta.preferredUtteranceIds,
      acceptableValues: meta.utterances.filter((item) => item.type === 'advice').map((item) => item.id),
    },
    {
      key: 'receiver_preference_choice',
      phase: 'perspective_taking',
      stepType: 'receiver_preference',
      promptText: meta.receiverPerspectiveText,
      perspective: 'receiver',
      options: meta.receiverOptions.map((option) => ({
        value: option.id,
        label: option.text,
        isCorrect: option.isComforting,
        isAcceptable: option.isComforting,
        metadata: {
          reasonText: option.reasonText,
        },
      })),
      correctValues: meta.receiverOptions.filter((option) => option.isComforting).map((option) => option.id),
    },
  ]

  return {
    studentId: studentId.value,
    resourceId: resource.value!.id,
    resourceType: 'care_scene',
    subModule: 'care_scene',
    steps,
    buildSummary: ({ latestResults }) => {
      const selectedUtterance = latestResults.find((item) => item.stepType === 'care_utterance')
      return {
        dominantChoiceType: careMeta.value.utterances.find((item) => item.id === selectedUtterance?.selectedValue)?.type || null,
      }
    },
  }
}

function setGentleFeedback(code: EmotionalFeedbackCode, isAdvance: boolean) {
  if (isAdvance) {
    feedbackMessage.value = {
      title: '你已经表达出了关心',
      description: code === 'acceptable' ? '这是一个可以帮助对方的表达，我们继续换个角度看看。' : '现在看看对方听起来最舒服的是哪一种说法。',
      type: 'success',
    }
    return
  }

  const descriptions = [
    '我们先看看对方现在的感受，再试一次。',
    '我先帮你把不太合适的话术变淡一点。',
    '现在已经缩小范围了，我们继续试试。',
    '试试从保留下来的表达开始，对方会更容易接受。',
  ] as const

  feedbackMessage.value = {
    title: '我们再温柔地试一次',
    description: descriptions[currentHintLevel.value] ?? descriptions[0] ?? '',
    type: 'info',
  }
}

async function loadResource() {
  if (!studentId.value) {
    loadError.value = '缺少学生 ID，无法开始训练。'
    return
  }

  const db = getActiveDb()
  const resourceId = Number(Array.isArray(route.query.resourceId) ? route.query.resourceId[0] : route.query.resourceId || 0)
  const sql = `
    SELECT id, name, description, cover_image, meta_data
    FROM sys_training_resource
    WHERE module_code = 'emotional'
      AND resource_type = 'care_scene'
      AND is_active = 1
  `

  let resolvedRow = resourceId > 0 ? db.get(`${sql} AND id = ? LIMIT 1`, [resourceId]) : null
  if (!resolvedRow && typeof db.all === 'function') {
    const rows = db.all(`${sql} ORDER BY id ASC LIMIT 1`)
    resolvedRow = rows?.[0] || null
  }

  if (!resolvedRow) {
    loadError.value = '当前没有可用的表达关心资源，请先在资源中心录入 MVP 场景。'
    return
  }

  resource.value = mapResourceRow(resolvedRow)
  sessionConfig.value = buildSessionConfig(careMeta.value)
  session.startSession(sessionConfig.value)
}

function advanceFromIntro() {
  feedbackMessage.value = null
  session.advanceStep()
}

function handleUtteranceSelect(value: string) {
  const selected = utteranceCards.value.find((item) => item.value === value)
  if (!selected) return

  const submitResult = session.submitStep({
    selectedValue: value,
    selectedLabel: selected.label,
    perspective: 'sender',
  })

  selectedUtteranceEffect.value = selected.utterance || null
  canAdvanceFromUtterance.value = submitResult.canAdvance
  setGentleFeedback(submitResult.result.feedbackCode || 'retry', submitResult.canAdvance)
}

function continueFromUtterance() {
  feedbackMessage.value = null
  selectedUtteranceEffect.value = null
  canAdvanceFromUtterance.value = false
  session.advanceStep()
}

function handleReceiverSelect(value: string) {
  const selected = receiverCards.value.find((item) => item.value === value)
  if (!selected) return

  const submitResult = session.submitStep({
    selectedValue: value,
    selectedLabel: selected.label,
    perspective: 'receiver',
  })

  selectedReceiverReason.value = selected.receiver || null
  canAdvanceFromReceiver.value = submitResult.canAdvance
  setGentleFeedback(submitResult.result.feedbackCode || 'retry', submitResult.canAdvance)
}

async function completeCareSession() {
  const persisted = await session.completeSession()
  await router.replace({
    path: '/emotional/session-summary',
    query: {
      ...inheritedQuery.value,
      resourceId: String(resource.value?.id || ''),
      trainingRecordId: String(persisted.trainingRecordId),
      sessionId: String(persisted.sessionId),
    },
  })
}

async function handleExit() {
  if (session.isActive.value && session.attempts.value.length > 0 && !session.persistedIds.value) {
    await session.cancelSession()
  }
  await router.push({
    path: '/emotional/menu',
    query: inheritedQuery.value,
  })
}

onBeforeRouteLeave(async () => {
  if (session.isActive.value && session.attempts.value.length > 0 && !session.persistedIds.value) {
    await session.cancelSession()
  }
  return true
})

onMounted(() => {
  loadResource()
})
</script>

<style scoped>
.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.main-content {
  padding: 24px;
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

.intro-stage,
.care-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.scene-hero {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
  gap: 24px;
  align-items: center;
}

.scene-visual {
  min-height: 180px;
  border-radius: 30px;
  background: linear-gradient(135deg, #fde68a 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-emoji {
  font-size: 76px;
}

.scene-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scene-title {
  margin: 0;
  font-size: 32px;
  color: #303133;
}

.scene-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: #606266;
}

.scene-tag {
  width: fit-content;
}

.option-list {
  display: grid;
  gap: 16px;
}

.effect-card {
  border-radius: 22px;
  background: #fafafa;
}

.effect-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.effect-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.effect-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: #303133;
}

.reaction-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
}

.reaction-emoji {
  font-size: 24px;
}

.effect-actions {
  display: flex;
  justify-content: flex-end;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
}

.feedback-panel {
  border-radius: 18px;
}

.empty-stage {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
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

@media (max-width: 960px) {
  .scene-hero {
    grid-template-columns: 1fr;
  }
}
</style>
