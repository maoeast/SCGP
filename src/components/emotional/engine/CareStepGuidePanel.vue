<template>
  <el-card class="guide-panel" shadow="never">
    <div class="guide-panel__header">
      <span class="guide-panel__eyebrow">步骤引导区</span>
      <h3 class="guide-panel__title">我们一步一步来关心 {{ receiverDisplayName }}</h3>
      <p class="guide-panel__subtitle">先看清场景，再想想感受，最后选一句更让人舒服的话。</p>
    </div>

    <div class="guide-steps">
      <section
        v-for="step in stepCards"
        :key="step.index"
        class="guide-step"
        :class="step.className"
      >
        <div class="guide-step__icon-shell">
          <span class="guide-step__icon">{{ step.icon }}</span>
        </div>

        <div class="guide-step__body">
          <div class="guide-step__topline">
            <span class="guide-step__label">{{ step.label }}</span>
            <span
              v-if="step.status === 'done'"
              class="guide-step__done"
              aria-label="已完成"
            >
              ✓
            </span>
          </div>
          <strong class="guide-step__title">{{ step.title }}</strong>
          <p class="guide-step__description">{{ step.description }}</p>

          <div v-if="step.index === 2" class="guide-step__chips">
            <button
              v-for="chip in emotionChipList"
              :key="chip"
              type="button"
              class="guide-chip"
              :class="{
                'guide-chip--selected': chip === selectedEmotionChip,
                'guide-chip--disabled': !chipEnabled && chip !== selectedEmotionChip,
              }"
              :disabled="!chipEnabled && chip !== selectedEmotionChip"
              @click="$emit('select-emotion-chip', chip)"
            >
              {{ chip }}
            </button>
          </div>

          <p
            v-if="step.index === 2 && selectedEmotionChip"
            class="guide-step__selection"
          >
            你觉得 {{ receiverDisplayName }} 现在有点“{{ selectedEmotionChip }}”，我们继续想想怎么说。
          </p>
        </div>
      </section>
    </div>

    <div class="guide-tip">
      <span class="guide-tip__tag">小提示</span>
      <p class="guide-tip__text">{{ comfortTipText }}</p>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  receiverName?: string
  emotionChips?: string[]
  comfortTip?: string
  currentStep: 1 | 2 | 3
  selectedEmotionChip?: string
  chipEnabled?: boolean
}>()

defineEmits<{
  (e: 'select-emotion-chip', value: string): void
}>()

const receiverDisplayName = computed(() => props.receiverName || '这位小朋友')
const emotionChipList = computed(() => props.emotionChips?.length
  ? props.emotionChips
  : ['难过', '想哭', '紧张', '需要帮助'])

const comfortTipText = computed(() => props.comfortTip || `和${receiverDisplayName.value}说话时，先看着TA、声音轻一点，TA会更容易感受到你的关心。`)

function resolveStatus(index: 1 | 2 | 3) {
  if (index < props.currentStep) {
    return 'done'
  }

  if (index === props.currentStep) {
    return 'current'
  }

  return 'upcoming'
}

const stepCards = computed(() => {
  const step2Done = props.currentStep === 3 || !!props.selectedEmotionChip

  return [
    {
      index: 1 as const,
      label: '步骤 1',
      icon: '👀',
      title: '先观察场景发生了什么',
      description: '先看看图片里谁需要帮助，发生了什么事。',
      status: resolveStatus(1),
    },
    {
      index: 2 as const,
      label: '步骤 2',
      icon: '💛',
      title: `想想${receiverDisplayName.value}现在的感受`,
      description: '点一个最像现在心情的词，我们再继续。',
      status: step2Done ? 'done' : resolveStatus(2),
    },
    {
      index: 3 as const,
      label: '步骤 3',
      icon: '💬',
      title: `想一想怎么说会让${receiverDisplayName.value}舒服一点`,
      description: props.selectedEmotionChip
        ? `现在带着“${props.selectedEmotionChip}”这个感受，选一句更贴心的话。`
        : '先选好感受，再去挑一句更贴心的话。',
      status: resolveStatus(3),
    },
  ].map((step) => ({
    ...step,
    className: {
      'guide-step--done': step.status === 'done',
      'guide-step--current': step.status === 'current',
      'guide-step--upcoming': step.status === 'upcoming',
    },
  }))
})
</script>

<style scoped>
.guide-panel {
  border-radius: 28px;
  border: 1px solid #f1e3cf;
  background: linear-gradient(180deg, #fffdf9 0%, #fff7ec 100%);
}

.guide-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
}

.guide-panel__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.guide-panel__eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #c08c4a;
}

.guide-panel__title {
  margin: 0;
  font-size: 24px;
  line-height: 1.35;
  color: #6f4b28;
}

.guide-panel__subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #8a7158;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.guide-step {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
  transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
}

.guide-step--current {
  background: linear-gradient(135deg, #fff1cf 0%, #ffe3ba 100%);
  border: 1px solid #efc17a;
  box-shadow: 0 10px 24px rgba(242, 170, 76, 0.14);
}

.guide-step--done {
  background: #eef9ef;
  border: 1px solid #c8e8c9;
}

.guide-step--upcoming {
  background: #f7f0e7;
  border: 1px solid #eee1cf;
  opacity: 0.72;
  transform: scale(0.98);
}

.guide-step__icon-shell {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffdca9 0%, #ffc98b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.guide-step--done .guide-step__icon-shell {
  background: linear-gradient(135deg, #d6f0d8 0%, #bce2c0 100%);
}

.guide-step__icon {
  font-size: 24px;
}

.guide-step__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.guide-step__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.guide-step__label {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #a06b35;
}

.guide-step__done {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #67c23a;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.guide-step__title {
  font-size: 18px;
  line-height: 1.6;
  color: #5f4122;
}

.guide-step__description {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #8a7158;
}

.guide-step__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.guide-chip {
  min-height: 48px;
  min-width: 88px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 2px solid #f0cf9f;
  background: #fff8ee;
  color: #8b5c2e;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.guide-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(242, 170, 76, 0.16);
}

.guide-chip--selected {
  background: #ffd89a;
  border-color: #f3a847;
  color: #6f4519;
  box-shadow: 0 0 0 3px rgba(243, 168, 71, 0.16);
}

.guide-chip--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.guide-chip:disabled:hover {
  transform: none;
  box-shadow: none;
}

.guide-step__selection {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #7b5f46;
}

.guide-tip {
  padding: 16px 18px;
  border-radius: 20px;
  background: #fff3c8;
  border: 1px solid #f3df9d;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.guide-tip__tag {
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.64);
  color: #9a6a27;
  font-size: 12px;
}

.guide-tip__text {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: #6f532e;
}
</style>
