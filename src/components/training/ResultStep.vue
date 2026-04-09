<template>
  <section class="result-step">
    <div class="result-shell">
      <span class="result-kicker">Step 5 · 训练完成</span>
      <h1 class="result-title">太棒了，今天的观察训练完成了。</h1>
      <p class="result-description">
        {{ summaryText }}
      </p>

      <div class="star-stage" aria-label="训练星级评价">
        <div
          v-for="starIndex in starSlots"
          :key="starIndex"
          class="star-chip"
          :class="{ 'is-earned': starIndex <= earnedStars }"
          :style="{ '--star-delay': `${(starIndex - 1) * 300}ms` }"
        >
          <span class="star-icon" aria-hidden="true">★</span>
        </div>
      </div>

      <div class="result-meta">
        <div class="meta-card">
          <span class="meta-label">场景名称</span>
          <strong>{{ store.scene?.title || '当前训练场景' }}</strong>
        </div>
        <div class="meta-card">
          <span class="meta-label">提示次数</span>
          <strong>{{ totalHintCount }} 次</strong>
        </div>
        <div class="meta-card" :class="saveStateClass">
          <span class="meta-label">记录状态</span>
          <strong>{{ saveStatusText }}</strong>
        </div>
      </div>

      <div class="result-actions">
        <button type="button" class="result-button is-secondary" @click="store.exitTraining()">
          <span class="result-button-icon" aria-hidden="true">←</span>
          返回场景选择
        </button>
        <button type="button" class="result-button is-primary" @click="store.restartTraining()">
          <span class="result-button-icon" aria-hidden="true">↺</span>
          再练一次
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'

const store = useTrainingStore()

const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const saveError = ref('')

const starSlots = [1, 2, 3] as const

const earnedStars = computed(() => store.calculateStars())
const totalHintCount = computed(() => store.hintLevelPerStep.reduce((sum, level) => sum + level, 0))
const summaryText = computed(() => {
  if (earnedStars.value === 3) {
    return '你几乎没有依赖提示就完成了整条训练链，观察和判断都很稳定。'
  }

  if (earnedStars.value === 2) {
    return '你已经抓住了大部分关键线索，再多观察一点点，就能拿到满星。'
  }

  return '你坚持完成了所有题目，下一轮再继续练习，就会更熟练。'
})

const saveStatusText = computed(() => {
  if (saveState.value === 'saving') {
    return '正在写入训练记录...'
  }

  if (saveState.value === 'error') {
    return saveError.value || '训练记录保存失败'
  }

  if (saveState.value === 'saved') {
    return '已保存'
  }

  return '等待保存'
})

const saveStateClass = computed(() => {
  return {
    'is-saving': saveState.value === 'saving',
    'is-error': saveState.value === 'error',
    'is-saved': saveState.value === 'saved',
  }
})

async function persistRecord(): Promise<void> {
  saveState.value = 'saving'
  saveError.value = ''

  try {
    await store.saveRecord()
    saveState.value = 'saved'
  } catch (error) {
    console.error('Failed to save immersive training record:', error)
    saveState.value = 'error'
    saveError.value = error instanceof Error ? error.message : '训练记录保存失败'
  }
}

onMounted(() => {
  void persistRecord()
})
</script>

<style scoped>
.result-step {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 10px 28px;
}

.result-shell {
  width: min(100%, 1100px);
  padding: 40px 36px 34px;
  border-radius: 40px;
  text-align: center;
  color: #fff;
  background:
    radial-gradient(circle at top, rgb(254 240 138 / 0.3), transparent 34%),
    radial-gradient(circle at 20% 20%, rgb(251 191 36 / 0.18), transparent 24%),
    linear-gradient(145deg, rgb(21 94 117 / 0.9) 0%, rgb(37 99 235 / 0.82) 45%, rgb(124 58 237 / 0.78) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.16),
    0 28px 64px rgb(15 23 42 / 0.26);
}

.result-kicker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #0f172a;
  background: linear-gradient(135deg, #fef08a 0%, #fde68a 45%, #ffffff 100%);
  box-shadow: 0 14px 28px rgb(254 240 138 / 0.2);
}

.result-title {
  margin: 18px 0 14px;
  font-size: clamp(34px, 5vw, 60px);
  line-height: 1.08;
}

.result-description {
  margin: 0 auto;
  max-width: 36em;
  font-size: 18px;
  line-height: 1.85;
  color: rgb(255 255 255 / 0.88);
  text-wrap: balance;
}

.star-stage {
  margin: 34px 0 28px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.star-chip {
  min-height: 178px;
  padding: 24px 18px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(255 255 255 / 0.58);
  background: rgb(255 255 255 / 0.12);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

.star-chip.is-earned {
  color: #7c2d12;
  background: linear-gradient(180deg, #fff7cc 0%, #fde68a 44%, #f59e0b 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.52),
    0 24px 42px rgb(245 158 11 / 0.24);
  animation: star-pop 720ms cubic-bezier(0.2, 0.9, 0.22, 1) both;
  animation-delay: var(--star-delay);
}

.star-icon {
  font-size: clamp(56px, 10vw, 100px);
  line-height: 1;
  text-shadow: 0 10px 28px rgb(255 255 255 / 0.3);
}

.result-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.meta-card {
  min-height: 96px;
  padding: 18px 20px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  text-align: left;
  background: rgb(15 23 42 / 0.22);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

.meta-card.is-saving {
  background: rgb(8 145 178 / 0.22);
}

.meta-card.is-saved {
  background: rgb(22 163 74 / 0.2);
}

.meta-card.is-error {
  background: rgb(220 38 38 / 0.18);
}

.meta-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.66);
}

.meta-card strong {
  font-size: 20px;
  line-height: 1.45;
}

.result-actions {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.result-button {
  min-height: 74px;
  border: 0;
  border-radius: 999px;
  padding: 18px 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.result-button:hover {
  transform: translateY(-2px);
}

.result-button:active {
  transform: scale(0.97);
}

.result-button.is-primary {
  color: #0f172a;
  background: linear-gradient(135deg, #fef08a 0%, #86efac 52%, #7dd3fc 100%);
  box-shadow: 0 20px 40px rgb(125 211 252 / 0.24);
}

.result-button.is-secondary {
  color: #fff;
  background: rgb(15 23 42 / 0.28);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.18),
    0 20px 40px rgb(15 23 42 / 0.16);
}

@keyframes star-pop {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.68) rotate(-10deg);
  }

  58% {
    opacity: 1;
    transform: translateY(-10px) scale(1.08) rotate(3deg);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

.result-button-icon {
  flex: 0 0 auto;
  font-size: 0.95em;
  line-height: 1;
}

@media (max-width: 900px) {
  .result-step {
    padding: 8px 0 16px;
  }

  .result-shell {
    padding: 28px 18px 22px;
    border-radius: 28px;
  }

  .star-stage,
  .result-meta,
  .result-actions {
    grid-template-columns: 1fr;
  }

  .star-chip {
    min-height: 132px;
  }

  .meta-card {
    min-height: 0;
  }
}
</style>
