<!-- src/views/assessment/components/PerformanceTrialBoard.vue -->
<!--
  绩效题答题板（trial-level reaction time）。

  与 QuestionCard 的区别：本题板为「试次级绩效题」专用——
  - 内置 useTrialTimer：刺激（题干图 + 选项）渲染完成后打 onsetAt 时间戳，
    选项作答时 performance.now() - onsetAt 得到真反应时，随 emit 回流。
  - 不给即时对错反馈（标准化要求）；选中后即锁定本题、emit 答案。
  - 不支持说明内容 / 跳过 / 回看（绩效题线性单次作答）。
  计时逻辑自包含，AssessmentContainer 无需为计时改动。

  v4 增强（视知觉图形匹配筛查任务）：
  - 优先监听 pointerdown（记录 pointerType），避免 click 与 touchstart 双触发；
  - 练习题（metadata.isPractice）显示"练习不计分"标记；
  - 超时流程：30s 提示 → 再 10s 记"已超时未作答"（不 emit 答案，由 Driver 记 omitted）。
-->
<template>
  <!-- 无外层 el-card：题号/进度/维度/练习等状态 Tag 由 AssessmentContainer 合并 Header 统一承载。
       本组件只负责"目标卡片（左） + 选项网格（右）"的匹配测试范式布局与试次级计时。 -->
  <div class="performance-board">
    <!-- 左右布局：目标卡片（左）与选项网格（右）并排，两者垂直居中对齐 -->
    <div class="trial-layout">
      <!-- 目标卡片：指导语置于顶部作为正式指导条；目标图案视觉加权（卡片留白/背景/边框）。
           注意：可见刺激框仍是 160×160 / 图元 88px（大小恒常性约束，禁止缩放）。 -->
      <div v-if="question.imagePath" class="target-card">
        <div v-if="question.content" class="target-instruction">{{ question.content }}</div>
        <div class="target-figure">
          <div class="target-badge">🎯 目标图案</div>
          <div class="stimulus-box stimulus-box--target">
            <img :src="resolveImage(question.imagePath)" :alt="question.content" />
          </div>
          <div class="target-hint">从右侧选项中选出完全相同的一项</div>
        </div>
      </div>

      <!-- 选项区：可见刺激框与目标同规格；卡片仅作透明点击热区 -->
      <div class="trial-options">
        <!-- 超时提示 -->
        <div v-if="timeoutState === 'warning'" class="timeout-banner timeout-banner--warning">
          ⏳ 作答时间较长，请尽快选择
        </div>
        <div v-else-if="timeoutState === 'timedout'" class="timeout-banner timeout-banner--timedout">
          ⏰ 本题已超时未作答，请点击「下一题」继续
        </div>

        <div class="answer-options" :class="{ 'is-locked': answered, 'is-timedout': timeoutState === 'timedout' }">
          <div class="image-options-grid" :class="optionsGridClass">
            <div
              v-for="option in question.options"
              :key="option.value"
              class="image-option"
              :class="{ 'is-selected': selectedValue === option.value }"
              @pointerdown="handlePointerDown(option.value, $event)"
            >
              <div class="stimulus-box">
                <img v-if="option.imagePath" :src="resolveImage(option.imagePath)" :alt="option.label" />
                <span v-else class="image-option-fallback">{{ option.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ScaleQuestion } from '@/types/assessment'
import { resolvePresetResourceUrl } from '@/utils/preset-resource'
import { useTrialTimer } from '@/views/assessment/composables/useTrialTimer'

/** 超时：30 秒提示，再 10 秒记超时（v4 §5.3） */
const TIMEOUT_MS = 30_000
const GRACE_MS = 10_000

interface Props {
  question: ScaleQuestion
  questionIndex: number
  totalCount?: number
  isSkipped?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  totalCount: 0,
  isSkipped: false,
})

const emit = defineEmits<{
  (e: 'answer', value: { value: number | string; reactionTimeMs: number | null; meta?: Record<string, any> }): void
}>()

const selectedValue = ref<number | string | null>(null)
const answered = ref(false)
const trialTimer = useTrialTimer()

const timeoutState = ref<'idle' | 'warning' | 'timedout'>('idle')
let warningTimer: number | undefined
let graceTimer: number | undefined

const isPractice = computed(() => props.question.metadata?.isPractice === true)

/** 选项数量决定网格列数（4 选项 → 2×2，6 选项 → 3×2） */
const optionsGridClass = computed(() => {
  const n = props.question.options.length
  if (n <= 4) return 'cols-2'
  return 'cols-3'
})

function resolveImage(path?: string): string {
  return path ? resolvePresetResourceUrl(path) : ''
}

function clearTimers() {
  if (warningTimer !== undefined) {
    window.clearTimeout(warningTimer)
    warningTimer = undefined
  }
  if (graceTimer !== undefined) {
    window.clearTimeout(graceTimer)
    graceTimer = undefined
  }
}

/**
 * 开始一个新试次：重置选中态、超时状态并打刺激呈现时间戳。
 * 用 requestAnimationFrame 延后一帧，确保题干图 / 选项已渲染到 DOM，
 * RT 零点锚定「刺激可见」而非「数据就绪」。
 */
function startTrial() {
  selectedValue.value = null
  answered.value = false
  timeoutState.value = 'idle'
  clearTimers()
  trialTimer.reset()
  requestAnimationFrame(() => {
    trialTimer.startTrial()
    // 计时起点：渲染完成 + 选项可点击后开始超时倒计时
    warningTimer = window.setTimeout(() => {
      timeoutState.value = 'warning'
      graceTimer = window.setTimeout(() => {
        timeoutState.value = 'timedout'
      }, GRACE_MS)
    }, TIMEOUT_MS)
  })
}

/** 首次有效 pointerdown 即锁定（比 click 更接近真实触碰开始） */
function handlePointerDown(value: number | string, event: PointerEvent) {
  if (answered.value || props.isSkipped || timeoutState.value === 'timedout') return
  const rt = trialTimer.recordResponse()
  selectedValue.value = value
  answered.value = true
  clearTimers()
  emit('answer', {
    value,
    reactionTimeMs: rt,
    meta: {
      pointerType: event.pointerType ?? 'unknown',
      anticipatory: rt !== null && rt < 300,
    },
  })
}

onMounted(startTrial)
watch(() => props.question, startTrial)
onUnmounted(clearTimers)
</script>

<style scoped>
.performance-board {
  padding: 24px 0;
}

/* ====== 左右布局：目标卡片（左） + 选项网格（右） ====== */
.trial-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
}

/* ====== 目标卡片（左）：通过卡片包装提升视觉权重 ====== */
.target-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  flex-shrink: 0;
  width: 280px;
  padding: 20px;
  background: linear-gradient(180deg, #f5f9ff 0%, #ffffff 100%);
  border: 2px solid #b3d4ff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
}

.target-instruction {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  color: #303133;
  text-align: center;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 8px;
}

.target-figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.target-badge {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.target-hint {
  font-size: 13px;
  color: #909399;
  text-align: center;
}

/* ====== 统一可见刺激框：目标与全部选项完全同规格（160×160，边框/背景/圆角/内边距一致）。
   图形在框内固定像素渲染并居中，禁止按容器缩放 —— 消除大小恒常性干扰。 ====== */
.stimulus-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 2px solid #d6e4ff;
  border-radius: 12px;
  background: #fff;
}

.stimulus-box--target {
  border-color: #409eff;
  background: #fff;
}

.stimulus-box img {
  /* 图元渲染规格：内容区 112×112，SVG 图元占 viewBox 78.6% → 图元外径 ≈ 88px */
  display: block;
  width: 112px;
  height: 112px;
}

.trial-options {
  flex: 1;
  max-width: 500px;
}

@media (max-width: 900px) {
  .trial-layout {
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .target-card {
    width: auto;
    max-width: 360px;
  }
}

/* ====== 超时提示 ====== */
.timeout-banner {
  margin: 0 0 14px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  text-align: center;
}

.timeout-banner--warning {
  color: #b88230;
  background: #fdf6ec;
  border: 1px solid #f5dab1;
}

.timeout-banner--timedout {
  color: #c45656;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
}

/* ====== 选项网格 ====== */
.answer-options {
  transition: opacity 0.2s ease;
}

.answer-options.is-locked {
  opacity: 0.75;
}

.answer-options.is-timedout {
  opacity: 0.55;
}

.image-options-grid {
  display: grid;
  gap: 14px;
  max-width: 520px;
  margin: 0 auto;
}

.image-options-grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.image-options-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.image-option {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 透明点击热区：240×240 交互范围（160 可见框 + 四周 40px），可见刺激框不随热区变化 */
  padding: 40px;
  border-radius: 14px;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition: background 0.2s ease;
}

.image-option:hover {
  background: rgba(64, 158, 255, 0.06);
}

.image-option:hover .stimulus-box {
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.18);
}

.image-option.is-selected {
  background: rgba(103, 194, 58, 0.08);
}

.image-option.is-selected .stimulus-box {
  border-color: #67c23a;
  background: #f0f9eb;
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
}

.image-option-fallback {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

@media (max-width: 768px) {
  .image-options-grid.cols-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
