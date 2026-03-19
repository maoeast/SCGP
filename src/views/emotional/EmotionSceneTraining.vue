<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/emotion-scene/select', query: inheritedQuery }">选择场景</el-breadcrumb-item>
        <el-breadcrumb-item>情绪与场景训练</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>情绪与场景训练</h1>
        <p class="subtitle">单屏单任务，引导学生完成场景理解、情绪识别、原因推理和回应选择。</p>
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
            <span class="status-label">场景</span>
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
                  <div class="scene-hero">
                    <div class="scene-visual" :style="{ background: activeSceneGradient }">
                      <span class="scene-emoji">{{ sceneEmoji }}</span>
                    </div>
                    <div class="scene-copy">
                      <el-tag effect="light" class="scene-tag">{{ resource.name }}</el-tag>
                      <h2 class="scene-title">{{ sceneTitle }}</h2>
                      <p class="scene-description">{{ resource.description || '请先观察场景，再进入情绪判断。' }}</p>
                    </div>
                  </div>

                  <el-card class="clue-card" shadow="never">
                    <template #header>
                      <span>场景线索</span>
                    </template>
                    <div class="clue-list">
                      <el-tag
                        v-for="clue in sceneClues"
                        :key="clue"
                        effect="plain"
                        size="large"
                        class="clue-tag"
                      >
                        {{ clue }}
                      </el-tag>
                    </div>
                  </el-card>

                  <div class="action-bar">
                    <el-button type="primary" size="large" @click="advanceFromIntro">
                      开始识别情绪
                    </el-button>
                  </div>
                </div>
              </template>

              <template v-else-if="currentPhase === 'emotion_recognition' && emotionSelectorOptions.length > 0">
                <EmotionSelector
                  :title="'你觉得他现在是什么心情？'"
                  :subtitle="'请根据场景线索，选择最符合的情绪。'"
                  :options="emotionSelectorOptions"
                  :hint-level="currentHintLevel"
                  @select="handleEmotionSelect"
                />
              </template>

              <template v-else-if="currentPhase === 'reasoning' && currentReasoningOptions.length > 0">
                <ReasoningCard
                  :title="currentStep.promptText || '请继续想一想'"
                  :subtitle="'先观察场景，再从图文选项中选择更合适的答案。'"
                  :options="currentReasoningOptions"
                  :hint-level="currentHintLevel"
                  @select="handleReasoningSelect"
                />
              </template>

              <template v-else-if="currentPhase === 'solution' && currentReasoningOptions.length > 0">
                <ReasoningCard
                  :title="'下面哪种回应更合适？'"
                  :subtitle="'请选择对他人更有帮助、更让人舒服的做法。'"
                  :options="currentReasoningOptions"
                  :hint-level="currentHintLevel"
                  @select="handleReasoningSelect"
                />
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
import EmotionSelector from '@/components/emotional/EmotionSelector.vue'
import ReasoningCard from '@/components/emotional/ReasoningCard.vue'
import { useEmotionalSession } from '@/composables/useEmotionalSession'
import type {
  EmotionalBaseEmotion,
  EmotionalFeedbackCode,
  EmotionalSessionConfig,
  EmotionalSessionOption,
  EmotionSceneResourceMeta,
} from '@/types/emotional'

interface EmotionSceneResourceRecord {
  id: number
  name: string
  description?: string
  coverImage?: string
  resourceType: 'emotion_scene'
  metadata: EmotionSceneResourceMeta & Record<string, any>
}

type DbLike = {
  get: (sql: string, params?: any[]) => any
  all?: (sql: string, params?: any[]) => any[]
}

const EMOTION_META: Record<EmotionalBaseEmotion, { label: string; emoji: string; colorHex: string; zoneLabel: string }> = {
  happy: { label: '开心', emoji: '🟢', colorHex: '#67C23A', zoneLabel: '绿色区' },
  sad: { label: '失落', emoji: '🔵', colorHex: '#409EFF', zoneLabel: '蓝色区' },
  embarrassed: { label: '尴尬', emoji: '🟡', colorHex: '#E6A23C', zoneLabel: '黄色区' },
  angry: { label: '生气', emoji: '🔴', colorHex: '#F56C6C', zoneLabel: '红色区' },
  scared: { label: '害怕', emoji: '🔴', colorHex: '#F56C6C', zoneLabel: '红色区' },
}

const route = useRoute()
const router = useRouter()
const session = useEmotionalSession()

const resource = ref<EmotionSceneResourceRecord | null>(null)
const sessionConfig = ref<EmotionalSessionConfig | null>(null)
const feedbackMessage = ref<{ title: string; description: string; type: 'success' | 'info' } | null>(null)
const isTransitioning = ref(false)
const loadError = ref('')

const inheritedQuery = computed(() => ({ ...route.query }))
const studentId = computed(() => Number(Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId || 0))
const launchSource = computed(() => {
  const value = route.query.from
  return Array.isArray(value) ? value[0] : value || ''
})
const studentName = computed(() => {
  const value = route.query.studentName
  return Array.isArray(value) ? value[0] : value || ''
})

const currentStep = computed(() => session.currentStep.value)
const currentPhase = computed(() => session.currentPhase.value)
const currentHintLevel = computed(() => session.currentHintLevel.value)

const sceneMeta = computed(() => (resource.value?.metadata || {}) as EmotionSceneResourceMeta & Record<string, any>)
const sceneEmoji = computed(() => resource.value?.coverImage || '🎭')
const sceneTitle = computed(() => sceneMeta.value.title || resource.value?.name || '情绪场景')
const sceneClues = computed(() => sceneMeta.value.emotionClues || [])
const activeSceneGradient = computed(() => {
  const hex = sceneMeta.value.emotionColorHex || '#67C23A'
  return `linear-gradient(135deg, ${hex}22 0%, ${hex}55 100%)`
})

const totalDisplaySteps = computed(() => sessionConfig.value?.steps.length || 0)
const displayStepIndex = computed(() => session.currentIndex.value + 1)
const progressPercentage = computed(() => {
  if (!sessionConfig.value || sessionConfig.value.steps.length === 0) return 0
  return Math.round((displayStepIndex.value / sessionConfig.value.steps.length) * 100)
})

function buildReasoningVisual(step: typeof currentStep.value, option: EmotionalSessionOption) {
  if (currentPhase.value === 'solution') {
    if (option.isCorrect) return '💚'
    if (option.isAcceptable) return '💛'
    return '🧩'
  }

  const type = step?.metadata?.questionType
  if (type === 'cause') return '🔍'
  if (type === 'need') return '🫶'
  if (type === 'empathy') return '💭'
  return '💡'
}

function getVisibleReasoningOptions(options: EmotionalSessionOption[]) {
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

const emotionSelectorOptions = computed(() => {
  const step = currentStep.value
  if (!step || currentPhase.value !== 'emotion_recognition') return []

  return (step.options || []).map((option) => {
    const meta = EMOTION_META[option.value as EmotionalBaseEmotion]
    return {
      value: option.value,
      label: meta?.label || option.label,
      emoji: meta?.emoji || '🙂',
      colorHex: meta?.colorHex || '#dcdfe6',
      zoneLabel: meta?.zoneLabel || '提示区',
      isCorrect: !!option.isCorrect,
    }
  })
})

const currentReasoningOptions = computed(() => {
  const step = currentStep.value
  if (!step || !step.options || !['reasoning', 'solution'].includes(currentPhase.value || '')) {
    return []
  }

  return getVisibleReasoningOptions(step.options).map((option) => ({
    value: option.value,
    label: option.label,
    supportText: option.metadata?.feedbackText || option.metadata?.explanation || '',
    icon: buildReasoningVisual(step, option),
    isCorrect: !!option.isCorrect,
    isAcceptable: !!option.isAcceptable,
  }))
})

function setGentleFeedback(code: EmotionalFeedbackCode, isAdvance: boolean) {
  if (isAdvance) {
    feedbackMessage.value = {
      title: '做得很好',
      description: code === 'acceptable' ? '这是一个可以接受的答案，我们继续下一步。' : '你已经完成当前步骤，我们继续往下看。',
      type: 'success',
    }
    return
  }

  const level = currentHintLevel.value
  const descriptions = [
    '我们再看看场景里的线索，慢慢来。',
    '我先帮你把明显不太合适的选项变淡一点。',
    '这次我再缩小一点范围，你已经越来越接近了。',
    '试试从保留下来的这个方向开始，我们一起完成。',
  ] as const
  feedbackMessage.value = {
    title: '我们再试一次',
    description: descriptions[level] ?? descriptions[0] ?? '',
    type: 'info',
  }
}

function buildSessionConfig(meta: EmotionSceneResourceMeta): EmotionalSessionConfig {
  const steps: EmotionalSessionConfig['steps'] = [
    {
      key: 'scene_intro',
      phase: 'scene_intro' as const,
      stepType: 'emotion_choice' as const,
      interactive: false,
      title: meta.title,
      metadata: {
        clues: meta.emotionClues,
      },
    },
    {
      key: 'emotion_choice',
      phase: 'emotion_recognition' as const,
      stepType: 'emotion_choice' as const,
      promptText: '你觉得他现在是什么心情？',
      options: meta.emotionOptions.map((emotion) => ({
        value: emotion,
        label: EMOTION_META[emotion]?.label || emotion,
        isCorrect: emotion === meta.targetEmotion,
      })),
      correctValues: [meta.targetEmotion],
    },
    ...meta.prompts.map((prompt) => ({
      key: prompt.questionId,
      phase: 'reasoning' as const,
      stepType: 'reasoning_question' as const,
      promptId: prompt.questionId,
      promptText: prompt.questionText,
      metadata: {
        questionType: prompt.questionType,
      },
      options: prompt.options.map((option) => ({
        value: option.id,
        label: option.text,
        isCorrect: option.isCorrect,
        isAcceptable: option.isAcceptable,
        metadata: {
          feedbackText: option.feedbackText,
        },
      })),
      correctValues: prompt.options.filter((option) => option.isCorrect).map((option) => option.id),
      acceptableValues: prompt.options.filter((option) => option.isAcceptable).map((option) => option.id),
    })),
    {
      key: 'solution_choice',
      phase: 'solution' as const,
      stepType: 'solution_choice' as const,
      promptText: '下面哪种回应更合适？',
      options: meta.solutions.map((solution) => ({
        value: solution.id,
        label: solution.text,
        isCorrect: solution.suitability === 'optimal',
        isAcceptable: solution.suitability === 'acceptable',
        metadata: {
          explanation: solution.explanation,
        },
      })),
      correctValues: meta.solutions.filter((solution) => solution.suitability === 'optimal').map((solution) => solution.id),
      acceptableValues: meta.solutions.filter((solution) => solution.suitability === 'acceptable').map((solution) => solution.id),
    },
  ]

  return {
    studentId: studentId.value,
    resourceId: resource.value!.id,
    resourceType: 'emotion_scene',
    subModule: 'emotion_scene',
    steps,
  }
}

function getActiveDb(): DbLike {
  const db = (window as Window & { db?: DbLike }).db
  if (!db) {
    throw new Error('Database is not initialized on window.db')
  }
  return db
}

function mapResourceRow(row: any): EmotionSceneResourceRecord {
  let metadata = {} as EmotionSceneResourceMeta & Record<string, any>
  if (row.meta_data) {
    metadata = JSON.parse(row.meta_data)
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    coverImage: row.cover_image || undefined,
    resourceType: 'emotion_scene',
    metadata,
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
      AND resource_type = 'emotion_scene'
      AND is_active = 1
  `
  let resolvedRow = resourceId > 0
    ? db.get(`${sql} AND id = ? LIMIT 1`, [resourceId])
    : null

  if (resourceId > 0 && !resolvedRow) {
    loadError.value = '指定的情绪场景不存在或已停用，请返回场景选择页重新选择。'
    return
  }

  if (!resolvedRow && typeof db.all === 'function') {
    const rows = db.all(`${sql} ORDER BY id ASC LIMIT 1`)
    resolvedRow = rows?.[0] || null
  }

  if (!resolvedRow) {
    loadError.value = '当前没有可用的情绪场景资源，请先在资源中心录入 MVP 场景。'
    return
  }

  resource.value = mapResourceRow(resolvedRow)
  sessionConfig.value = buildSessionConfig(sceneMeta.value)
  session.startSession(sessionConfig.value)
}

function advanceFromIntro() {
  feedbackMessage.value = null
  session.advanceStep()
}

async function handleStepResult(selectedValue: string, selectedLabel?: string) {
  if (!currentStep.value || isTransitioning.value) return

  const submitResult = session.submitStep({
    selectedValue,
    selectedLabel,
  })

  setGentleFeedback(submitResult.result.feedbackCode || 'retry', submitResult.canAdvance)

  if (!submitResult.canAdvance) {
    return
  }

  isTransitioning.value = true
  window.setTimeout(async () => {
    const hasNext = session.advanceStep()
    if (!hasNext) {
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
      return
    }

    feedbackMessage.value = null
    isTransitioning.value = false
  }, 700)
}

function handleEmotionSelect(value: string) {
  const option = emotionSelectorOptions.value.find((item) => item.value === value)
  handleStepResult(value, option?.label)
}

function handleReasoningSelect(value: string) {
  const option = currentReasoningOptions.value.find((item) => item.value === value)
  handleStepResult(value, option?.label)
}

async function handleExit() {
  if (session.isActive.value && session.attempts.value.length > 0 && !session.persistedIds.value) {
    await session.cancelSession()
  }

  if (launchSource.value === 'dashboard') {
    await router.push('/dashboard')
    return
  }

  if (launchSource.value === 'plan') {
    await router.push('/training-plan')
    return
  }

  await router.push({
    path: '/emotional/emotion-scene/select',
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

.intro-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.scene-hero {
  display: grid;
  grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
  gap: 24px;
  align-items: center;
}

.scene-visual {
  min-height: 220px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-emoji {
  font-size: 84px;
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

.clue-card {
  border-radius: 22px;
  background: #fafafa;
}

.clue-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.clue-tag {
  font-size: 15px;
  padding: 8px 14px;
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

  .scene-visual {
    min-height: 180px;
  }
}
</style>
