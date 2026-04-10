<template>
  <section class="result-step">
    <div class="result-shell">
      <h1 class="result-title">恭喜你，今天的小考验全都通过啦，为你鼓掌！</h1>
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
          <span class="meta-label">{{ secondaryMetaLabel }}</span>
          <strong>{{ secondaryMetaValue }}</strong>
        </div>
        <div v-if="isCareScene && specificEmotionLabel" class="meta-card">
          <span class="meta-label">对方感受</span>
          <strong>{{ specificEmotionLabel }}</strong>
        </div>
        <div v-if="isCareScene" class="meta-card">
          <span class="meta-label">站在对方这边</span>
          <strong>{{ receiverPerspectiveText }}</strong>
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

const saveState = ref<'idle' | 'saving' | 'saved' | 'skipped' | 'error'>('idle')
const saveError = ref('')

const starSlots = [1, 2, 3] as const
const CARE_TYPE_LABELS: Record<string, string> = {
  empathy: '共情式',
  advice: '建议式',
  action: '行动式',
}

const earnedStars = computed(() => store.calculateStars())
const totalHintCount = computed(() => store.hintLevelPerStep.reduce((sum, level) => sum + level, 0))
const isCareScene = computed(() => store.scene?.variant === 'care_scene')
const summaryText = computed(() => {
  if (isCareScene.value) {
    const feelingLabel = specificEmotionLabel.value ? `“${specificEmotionLabel.value}”` : '这份感受'

    if (store.careSessionOutcome === 'preferred') {
      return store.receiverComfortMatched === false
        ? `你已经说出了很温柔的话，也接住了对方${feelingLabel}。下次再多站在对方这边想一想，会更完整。`
        : `你已经很会用温柔的话接住对方${feelingLabel}，真替TA开心。`
    }

    if (store.careSessionOutcome === 'acceptable') {
      return `你已经找到可以接受的说法了。下次如果先更轻一点、更贴近对方${feelingLabel}，会更贴心。`
    }

    return `你已经开始练习站在别人那边想、理解对方${feelingLabel}了。休息一下，下次我们再试着说得更温柔一点。`
  }

  if (earnedStars.value === 3) {
    return '你真的很用心哦，顺利通过了所有的考验，真为你骄傲！'
  }

  if (earnedStars.value === 2) {
    return '你已经抓住了大部分关键线索，再多观察一点点，就能拿到满星。'
  }

  return '休息一下吧，下次我们再一起玩，你会变得更厉害哦！'
})

const saveStatusText = computed(() => {
  if (saveState.value === 'saving') {
    return '正在写入训练记录...'
  }

  if (saveState.value === 'skipped') {
    return '待接入正式记录'
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
    'is-skipped': saveState.value === 'skipped',
    'is-error': saveState.value === 'error',
    'is-saved': saveState.value === 'saved',
  }
})

const secondaryMetaLabel = computed(() => {
  return isCareScene.value ? '本次关心方式' : '提示次数'
})

const secondaryMetaValue = computed(() => {
  if (isCareScene.value) {
    return store.selectedCareChoiceType ? CARE_TYPE_LABELS[store.selectedCareChoiceType] || '已完成选择' : '等待完成'
  }

  return `${totalHintCount.value} 次`
})

const specificEmotionLabel = computed(() => (
  isCareScene.value ? store.scene?.specific_emotion_label || '' : ''
))

const receiverPerspectiveText = computed(() => {
  if (!isCareScene.value) {
    return ''
  }

  if (store.receiverComfortMatched === true) {
    return '接住了对方'
  }

  if (store.receiverComfortMatched === false) {
    return '还可以再想想'
  }

  return '等待完成'
})

async function persistRecord(): Promise<void> {
  if (!store.supportsRecordPersistence) {
    saveState.value = 'skipped'
    return
  }

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
  color: #2b2118;
  background: rgb(255 248 235 / 0.8);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.72),
    0 24px 52px rgb(122 88 36 / 0.18);
  backdrop-filter: blur(10px);
}

.result-title {
  margin: 0 0 14px;
  font-size: clamp(34px, 5vw, 60px);
  line-height: 1.08;
  color: #2b2118;
}

.result-description {
  margin: 0 auto;
  max-width: 36em;
  font-size: 18px;
  line-height: 1.85;
  color: rgb(64 47 33 / 0.82);
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
  color: #9a7b55;
  background: rgb(255 255 255 / 0.78);
  box-shadow:
    inset 0 0 0 1px rgb(244 230 210 / 0.8),
    0 18px 34px rgb(122 88 36 / 0.1);
}

.star-chip.is-earned {
  color: #f59e0b;
  background: #ffe5a3;
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.48),
    0 24px 42px rgb(245 158 11 / 0.32);
  animation: star-pop 720ms cubic-bezier(0.2, 0.9, 0.22, 1) both;
  animation-delay: var(--star-delay);
}

.star-icon {
  font-size: clamp(56px, 10vw, 100px);
  line-height: 1;
  text-shadow: none;
}

.result-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
  background: rgb(255 255 255 / 0.62);
  box-shadow: inset 0 0 0 1px rgb(244 230 210 / 0.7);
}

.meta-card.is-saving {
  background: rgb(254 240 138 / 0.38);
}

.meta-card.is-saved {
  background: rgb(134 239 172 / 0.28);
}

.meta-card.is-skipped {
  background: rgb(254 240 138 / 0.26);
}

.meta-card.is-error {
  background: rgb(254 202 202 / 0.38);
}

.meta-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(120 87 53 / 0.72);
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
  color: #2b2118;
  background: #f7c948;
  box-shadow: 0 20px 40px rgb(245 158 11 / 0.24);
}

.result-button.is-secondary {
  color: #2b2118;
  background: rgb(255 255 255 / 0.68);
  box-shadow:
    inset 0 0 0 1px rgb(244 230 210 / 0.7),
    0 20px 40px rgb(122 88 36 / 0.18);
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
