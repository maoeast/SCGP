<template>
  <div class="game-grid-container">
    <!-- 游戏头部 -->
    <div class="game-header" v-if="!gameEnded">
      <div class="target-display">
        <div class="target-label">请找出相同的：</div>
        <div class="target-sample" v-if="currentTarget">
          <!-- 颜色模式 -->
          <div
            v-if="mode === 'color'"
            class="target-color"
            :style="{ backgroundColor: currentTarget.color ? GAME_COLORS[currentTarget.color] : '#ccc' }"
          ></div>
          <!-- 形状模式 -->
          <div
            v-else-if="mode === 'shape'"
            class="target-shape"
            :class="`shape-${currentTarget.shape}`"
            :style="{ backgroundColor: currentTarget.color ? GAME_COLORS[currentTarget.color] : '#ccc' }"
          ></div>
          <!-- 图标模式 -->
          <div v-else-if="mode === 'icon'" class="target-icon">
            {{ currentTarget.icon ? GAME_ICONS[currentTarget.icon] : '' }}
          </div>
        </div>
      </div>

      <div class="game-stats">
        <div class="stat">
          <span class="label">进度：</span>
          <span class="value">{{ currentRound }} / {{ totalRounds }}</span>
        </div>
        <div class="stat">
          <span class="label">时间：</span>
          <span class="value" :class="{ warning: timeLeft <= 10 }">{{ timeLeft }}s</span>
        </div>
        <div class="stat">
          <span class="label">得分：</span>
          <span class="value">{{ score }}</span>
        </div>
      </div>
    </div>

    <!-- 游戏网格 -->
    <div
      class="game-grid"
      :class="`grid-${gridSize}x${gridSize}`"
      v-if="!gameEnded"
    >
      <div
        v-for="item in gridItems"
        :key="item.id"
        class="grid-item"
        :class="{
          selected: item.isSelected,
          correct: item.isTarget && showResult,
          wrong: !item.isTarget && showResult && item.isSelected
        }"
        @click="handleItemClick(item)"
      >
        <!-- 颜色模式 -->
        <div
          v-if="mode === 'color'"
          class="item-color"
          :style="{ backgroundColor: GAME_COLORS[item.color!] }"
        ></div>

        <!-- 形状模式 -->
        <div
          v-else-if="mode === 'shape'"
          class="item-shape"
          :class="`shape-${item.shape}`"
          :style="{ backgroundColor: item.color ? GAME_COLORS[item.color] : '#ccc' }"
        ></div>

        <!-- 图标模式 -->
        <div v-else-if="mode === 'icon'" class="item-icon">
          {{ GAME_ICONS[item.icon!] }}
        </div>
      </div>
    </div>

    <!-- 结果界面 -->
    <div class="game-result" v-if="gameEnded">
      <h2>🎉 训练完成！</h2>
      <div class="result-stats">
        <div class="result-item">
          <span class="label">总轮次：</span>
          <span class="value">{{ totalRounds }}</span>
        </div>
        <div class="result-item">
          <span class="label">正确次数：</span>
          <span class="value">{{ correctCount }}</span>
        </div>
        <div class="result-item">
          <span class="label">准确率：</span>
          <span class="value">{{ (accuracy * 100).toFixed(1) }}%</span>
        </div>
        <div class="result-item">
          <span class="label">平均反应时：</span>
          <span class="value">{{ avgResponseTime }}ms</span>
        </div>
      </div>
      <button class="btn-primary" disabled>
        正在生成详细报告...
      </button>
    </div>

    <!-- 反馈动画 -->
    <div v-if="feedback" class="feedback" :class="feedback.type">
      {{ feedback.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GameGridMode, GridSize, DistractorLevel, GridItem, TrialData, GameSessionData } from '@/types/games'
import { GAME_COLORS, GAME_SHAPES, GAME_ICONS, TaskID } from '@/types/games'

// Props
interface Props {
  studentId: number
  taskId: TaskID
  mode: GameGridMode
  gridSize?: GridSize
  distractorLevel?: DistractorLevel
  timeLimit?: number
  rounds?: number
}

const props = withDefaults(defineProps<Props>(), {
  gridSize: 2,
  distractorLevel: 'medium',
  timeLimit: 60, // 秒 - 特殊儿童需要更长时间
  rounds: 8 // 减少轮次，避免疲劳
})

// Emits
const emit = defineEmits<{
  finish: [data: GameSessionData]
}>()

// 状态
const currentRound = ref(0)
const timeLeft = ref(props.timeLimit)
const score = ref(0)
const gridItems = ref<GridItem[]>([])
const currentTarget = ref<GridItem | null>(null)
const showResult = ref(false)
const gameEnded = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// 数据记录
const trialStartTime = ref(0)
const trials = ref<TrialData[]>([])
const roundTimeout = ref<number | null>(null)
const timerInterval = ref<number | null>(null)

// 计算属性
const totalRounds = computed(() => props.rounds)
const correctCount = computed(() => trials.value.filter(t => t.isCorrect).length)
const accuracy = computed(() => correctCount.value / trials.value.length || 0)
const avgResponseTime = computed(() => {
  const valid = trials.value.filter(t => t.responseTime > 0)
  if (valid.length === 0) return 0
  return Math.round(valid.reduce((sum, t) => sum + t.responseTime, 0) / valid.length)
})

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!
}

const sessionData = computed<GameSessionData>(() => {
  const correct = trials.value.filter(t => t.isCorrect).length
  const omission = trials.value.filter(t => t.isOmission).length
  const commission = trials.value.filter(t => t.isCommission).length

  // 计算冲动分数（基于误报和极短反应时）
  const fastCommissions = trials.value.filter(t => t.isCommission && t.responseTime < 500)
  const impulsivityScore = trials.value.length > 0
    ? (fastCommissions.length / trials.value.length) * 100
    : 0

  // 计算疲劳指数（后半程/前半程准确率）
  const midPoint = Math.floor(trials.value.length / 2)
  const firstHalf = trials.value.slice(0, midPoint)
  const secondHalf = trials.value.slice(midPoint)
  const firstHalfAcc = firstHalf.length > 0 ? firstHalf.filter(t => t.isCorrect).length / firstHalf.length : 0
  const secondHalfAcc = secondHalf.length > 0 ? secondHalf.filter(t => t.isCorrect).length / secondHalf.length : 0
  const fatigueIndex = firstHalfAcc > 0 ? secondHalfAcc / firstHalfAcc : 1

  return {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: trials.value[0]?.timestamp || Date.now(),
    endTime: Date.now(),
    duration: props.timeLimit * props.rounds,
    trials: trials.value,
    totalTrials: trials.value.length,
    correctTrials: correct,
    accuracy: accuracy.value,
    avgResponseTime: avgResponseTime.value,
    errors: {
      omission,
      commission
    },
    behavior: {
      impulsivityScore: Math.round(impulsivityScore),
      fatigueIndex: Number(fatigueIndex.toFixed(2))
    }
  }
})

/**
 * 开始新的一轮
 */
function startNewRound() {
  if (currentRound.value >= props.rounds) {
    endGame()
    return
  }

  // 重置状态
  showResult.value = false
  feedback.value = null

  // 生成目标
  const target = generateTarget()
  currentTarget.value = target

  // 生成选项（包含目标和干扰项）
  const distractorCount = (props.gridSize * props.gridSize) - 1
  gridItems.value = generateOptions(target, distractorCount)

  // 记录开始时间
  trialStartTime.value = Date.now()

  // 设置超时（漏报）- 根据网格大小和难度调整时间
  // 2x2: 8秒/轮, 3x3: 10秒/轮, 4x4: 12秒/轮
  const timePerRound = Math.max(
    (props.timeLimit / props.rounds) * 1000,
    (6 + props.gridSize * 2) * 1000
  )
  roundTimeout.value = window.setTimeout(() => {
    handleTimeout()
  }, timePerRound)

  currentRound.value++
}

/**
 * 生成目标
 */
function generateTarget(): GridItem {
  // 使用完整的颜色和形状数组（12种颜色，8种形状，30种图标）
  const colors = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'cyan', 'lime', 'coral', 'teal', 'indigo'] as const
  const shapes = ['circle', 'square', 'triangle', 'hexagon', 'star', 'trapezoid', 'diamond', 'rightTriangle'] as const
  const icons = [
    'apple', 'car', 'dog', 'cat', 'star', 'heart', 'ball', 'flower', 'moon', 'sun', 'fish', 'bird',
    'tomato', 'kiwi', 'lemon', 'strawberry', 'corn', 'carrot', 'mushroom', 'hamburger', 'lollipop',
    'cow', 'rabbit', 'swan', 'duck', 'frog', 'shrimp', 'butterfly', 'tiger', 'sunflower', 'basketball', 'football'
  ] as const

  const id = Date.now()

  if (props.mode === 'color') {
    const color = pickRandom(colors)
    return { id, type: 'color', color, isTarget: true, isSelected: false }
  } else if (props.mode === 'shape') {
    const shape = pickRandom(shapes)
    const color = pickRandom(colors)
    return { id, type: 'shape', shape, color, isTarget: true, isSelected: false }
  } else {
    const icon = pickRandom(icons)
    return { id, type: 'icon', icon, isTarget: true, isSelected: false }
  }
}

/**
 * 生成选项
 */
function generateOptions(target: GridItem, count: number): GridItem[] {
  const items: GridItem[] = [target]
  const usedValues = new Set<string>()

  // 记录已使用的值
  if (target.type === 'color') {
    usedValues.add(target.color!)
  } else if (target.type === 'shape') {
    usedValues.add(`${target.color}-${target.shape}`)
  } else {
    usedValues.add(target.icon!)
  }

  // 使用完整的颜色、形状和图标数组（12种颜色，8种形状，30种图标）
  const colors = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'cyan', 'lime', 'coral', 'teal', 'indigo'] as const
  const shapes = ['circle', 'square', 'triangle', 'hexagon', 'star', 'trapezoid', 'diamond', 'rightTriangle'] as const
  const icons = [
    'apple', 'car', 'dog', 'cat', 'star', 'heart', 'ball', 'flower', 'moon', 'sun', 'fish', 'bird',
    'tomato', 'kiwi', 'lemon', 'strawberry', 'corn', 'carrot', 'mushroom', 'hamburger', 'lollipop',
    'cow', 'rabbit', 'swan', 'duck', 'frog', 'shrimp', 'butterfly', 'tiger', 'sunflower', 'basketball', 'football'
  ] as const

  // 生成干扰项 - 添加安全限制防止无限循环
  let attempts = 0
  const maxAttempts = count * 20 // 最大尝试次数

  while (items.length < count + 1 && attempts < maxAttempts) {
    attempts++
    let item: GridItem
    let key: string

    if (props.mode === 'color') {
      const color = pickRandom(colors)
      key = color
      item = { id: Date.now() + items.length, type: 'color', color, isTarget: false, isSelected: false }
    } else if (props.mode === 'shape') {
      const shape = pickRandom(shapes)
      const color = pickRandom(colors)
      key = `${color}-${shape}`
      item = { id: Date.now() + items.length, type: 'shape', shape, color, isTarget: false, isSelected: false }
    } else {
      const icon = pickRandom(icons)
      key = icon
      item = { id: Date.now() + items.length, type: 'icon', icon, isTarget: false, isSelected: false }
    }

    // 避免重复
    if (!usedValues.has(key)) {
      usedValues.add(key)
      items.push(item)
    }
  }

  // 如果无法生成足够的唯一干扰项，允许重复颜色和形状组合（但确保只有一个目标）
  // 颜色模式下：必须排除目标颜色，确保只有一个正确答案
  // 形状模式下：可以重复使用颜色或形状，但不能同时重复（即不能重复"颜色+形状"组合）
  while (items.length < count + 1) {
    if (props.mode === 'color') {
      // 颜色模式：从剩余未使用的颜色中选择，如果都用完了则随机但不使用目标颜色
      const availableColors = colors.filter(c => !usedValues.has(c))
      const fallbackColors = colors.filter(c => c !== target.color)
      const color = availableColors.length > 0
        ? pickRandom(availableColors)
        : pickRandom(fallbackColors.length > 0 ? fallbackColors : colors)
      usedValues.add(color)
      items.push({
        id: Date.now() + items.length,
        type: 'color',
        color,
        isTarget: false,
        isSelected: false
      })
    } else if (props.mode === 'shape') {
      // 形状模式：确保不重复目标的颜色+形状组合
      let color = pickRandom(colors)
      let shape = pickRandom(shapes)
      let key = `${color}-${shape}`
      let safetyCounter = 0
      do {
        color = pickRandom(colors)
        shape = pickRandom(shapes)
        key = `${color}-${shape}`
        safetyCounter++
      } while (usedValues.has(key) && safetyCounter < 100)
      usedValues.add(key)
      items.push({
        id: Date.now() + items.length,
        type: 'shape',
        color,
        shape,
        isTarget: false,
        isSelected: false
      })
    } else {
      // 图标模式：确保不重复目标图标
      let icon = pickRandom(icons)
      let safetyCounter = 0
      do {
        icon = pickRandom(icons)
        safetyCounter++
      } while (usedValues.has(icon) && safetyCounter < 100)
      usedValues.add(icon)
      items.push({
        id: Date.now() + items.length,
        type: 'icon',
        icon,
        isTarget: false,
        isSelected: false
      })
    }
  }

  // 打乱顺序
  return items.sort(() => Math.random() - 0.5)
}

/**
 * 播放音效
 * @param type 音效类型: 'success' | 'error' | 'timeout'
 */
function playSound(type: 'success' | 'error' | 'timeout') {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === 'success') {
      // 正确音效：愉快的上升音调
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
    } else if (type === 'error') {
      // 错误音效：低沉的下降音调
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.15)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } else if (type === 'timeout') {
      // 超时音效：短促的提示音
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    }
  } catch (error) {
    console.warn('音效播放失败:', error)
  }
}

/**
 * 处理点击事件
 */
function handleItemClick(item: GridItem) {
  if (showResult.value || item.isSelected) return

  const responseTime = Date.now() - trialStartTime.value
  const isCorrect = item.isTarget

  item.isSelected = true
  showResult.value = true

  if (isCorrect) {
    // 正确
    score.value += 10
    playSound('success')
    showFeedback('success', '✓ 正确！')

    trials.value.push({
      trialId: currentRound.value,
      target: currentTarget.value!,
      options: gridItems.value,
      userChoice: item.id,
      isCorrect: true,
      responseTime,
      isOmission: false,
      isCommission: false,
      timestamp: Date.now()
    })
  } else {
    // 错误（误报）
    playSound('error')
    showFeedback('error', '✕ 再试试看')

    trials.value.push({
      trialId: currentRound.value,
      target: currentTarget.value!,
      options: gridItems.value,
      userChoice: item.id,
      isCorrect: false,
      responseTime,
      isOmission: false,
      isCommission: true,
      timestamp: Date.now()
    })
  }

  // 延迟后进入下一轮 - 特殊儿童需要更长时间看清反馈
  setTimeout(() => {
    startNewRound()
  }, 2500)
}

/**
 * 处理超时（漏报）
 */
function handleTimeout() {
  if (showResult.value) return

  showResult.value = true

  trials.value.push({
    trialId: currentRound.value,
    target: currentTarget.value!,
    options: gridItems.value,
    userChoice: null,
    isCorrect: false,
    responseTime: (props.timeLimit / props.rounds) * 1000,
    isOmission: true,
    isCommission: false,
    timestamp: Date.now()
  })

  playSound('timeout')
  showFeedback('error', '⏱ 时间到')

  setTimeout(() => {
    startNewRound()
  }, 1500)
}

/**
 * 显示反馈
 */
function showFeedback(type: 'success' | 'error', message: string) {
  feedback.value = { type, message }
  setTimeout(() => {
    feedback.value = null
  }, 2000) // 延长反馈显示时间，特殊儿童需要更多时间理解
}

/**
 * 结束游戏
 */
function endGame() {
  if (gameEnded.value) return
  gameEnded.value = true
  clearInterval(timerInterval.value!)
  emit('finish', sessionData.value)
}

/**
 * 启动游戏
 */
function startGame() {
  startNewRound()

  // 启动倒计时
  timerInterval.value = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

// 生命周期
onMounted(() => {
  startGame()
})

onUnmounted(() => {
  if (roundTimeout.value) clearTimeout(roundTimeout.value)
  if (timerInterval.value) clearInterval(timerInterval.value)
})
</script>

<style scoped>
.game-grid-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* 游戏头部 */
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.target-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.target-label {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.target-sample {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.target-color,
.target-shape,
.target-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
}

.target-icon {
  font-size: 48px;
}

.game-stats {
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat .label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat .value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.stat .value.warning {
  color: #e74c3c;
}

/* 游戏网格 */
.game-grid {
  display: grid;
  gap: 15px;
  margin-bottom: 20px;
}

.game-grid.grid-2x2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 150px);
}

.game-grid.grid-3x3 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 120px);
}

.game-grid.grid-4x4 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 110px);
  gap: 12px;
}

.game-grid.grid-4x4 .grid-item {
  min-height: 100px;
}

.game-grid.grid-4x4 .item-color,
.game-grid.grid-4x4 .item-shape {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.game-grid.grid-4x4 .item-icon {
  font-size: 36px;
}

.grid-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.grid-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.grid-item.selected {
  transform: scale(0.95);
}

.grid-item.correct {
  border: 3px solid #2ecc71;
}

.grid-item.wrong {
  border: 3px solid #e74c3c;
}

.item-color,
.item-shape {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
}

.shape-circle {
  border-radius: 50%;
}

.shape-triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.shape-hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

.shape-star {
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.shape-trapezoid {
  clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
}

.shape-diamond {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}

.shape-rightTriangle {
  clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
}

.item-icon {
  font-size: 48px;
}

/* 结果界面 */
.game-result {
  text-align: center;
  padding: 40px;
}

.game-result h2 {
  font-size: 32px;
  color: #2ecc71;
  margin-bottom: 30px;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 30px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-item .label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.result-item .value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.btn-primary {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 反馈动画 */
.feedback {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px 40px;
  font-size: 24px;
  font-weight: 700;
  border-radius: 12px;
  animation: fadeInOut 1s ease;
  z-index: 1000;
}

.feedback.success {
  background: #2ecc71;
  color: white;
}

.feedback.error {
  background: #e74c3c;
  color: white;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
  85% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
}
</style>
