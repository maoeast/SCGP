<template>
  <el-card class="scene-panel" shadow="never">
    <div class="scene-panel__header">
      <div class="scene-panel__eyebrow">
        <el-tag effect="light" class="scene-panel__tag">{{ resourceLabel }}</el-tag>
        <span class="scene-panel__helper">训练过程中可以一直看这张图</span>
      </div>
      <h2 class="scene-panel__title">{{ metadata.title }}</h2>
      <p class="scene-panel__description">{{ sceneDescription }}</p>
    </div>

    <div class="scene-panel__visual" :style="{ background: panelGradient }">
      <img
        v-if="sceneImageUrl"
        :src="sceneImageUrl"
        :alt="metadata.title"
        class="scene-panel__image"
      />
      <div v-else class="scene-panel__emoji-shell" aria-hidden="true">
        <span class="scene-panel__emoji">{{ sceneEmoji }}</span>
      </div>

      <div class="scene-panel__overlay">
        <span class="scene-panel__overlay-label">当前场景</span>
        <strong>{{ metadata.title }}</strong>
      </div>
    </div>

    <div v-if="metadata.clues?.length" class="scene-panel__section">
      <p class="scene-panel__section-title">场景线索</p>
      <div class="scene-panel__clues">
        <span
          v-for="clue in metadata.clues"
          :key="clue"
          class="scene-panel__clue"
        >
          {{ clue }}
        </span>
      </div>
    </div>

    <div
      v-if="metadata.variant === 'care_scene' && roleDescription"
      class="scene-panel__section"
    >
      <p class="scene-panel__section-title">当前视角</p>
      <div class="scene-panel__role-strip">
        <div
          class="scene-panel__role-card"
          :class="{ 'scene-panel__role-card--active': activePerspective === 'sender' }"
        >
          <span class="scene-panel__role-emoji">🙂</span>
          <div>
            <strong>我</strong>
            <span>说话的人</span>
          </div>
        </div>
        <div class="scene-panel__role-arrow">→</div>
        <div
          class="scene-panel__role-card"
          :class="{ 'scene-panel__role-card--active': activePerspective === 'receiver' }"
        >
          <span class="scene-panel__role-emoji">🧑</span>
          <div>
            <strong>{{ receiverDisplayName }}</strong>
            <span>听的人</span>
          </div>
        </div>
      </div>
      <p class="scene-panel__role-description">{{ roleDescription }}</p>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SceneIntroStepMetadata } from '@/features/emotional/engine/types'

const props = defineProps<{
  metadata: SceneIntroStepMetadata
  resourceLabel: string
  activePerspective?: 'sender' | 'receiver'
}>()

function resolveVisualSource(value?: string) {
  if (!value) {
    return { imageUrl: '', emoji: '' }
  }

  const trimmed = value.trim()
  const looksLikeUrl = trimmed.includes('://')
    || trimmed.startsWith('/')
    || trimmed.startsWith('data:')
    || /\.(png|jpe?g|gif|webp|svg)$/i.test(trimmed)

  if (looksLikeUrl) {
    return { imageUrl: trimmed, emoji: '' }
  }

  return { imageUrl: '', emoji: trimmed }
}

const primaryVisual = computed(() => resolveVisualSource(
  props.metadata.sceneVisual.imageUrl || props.metadata.sceneVisual.coverImage,
))

const fallbackVisual = computed(() => resolveVisualSource(props.metadata.sceneVisual.coverImage))

const sceneImageUrl = computed(() => primaryVisual.value.imageUrl || fallbackVisual.value.imageUrl || '')
const sceneEmoji = computed(() => primaryVisual.value.emoji || fallbackVisual.value.emoji || (props.metadata.variant === 'care_scene' ? '💌' : '🎭'))

const panelGradient = computed(() => {
  const hex = props.metadata.sceneVisual.emotionColorHex || '#67C23A'
  return `linear-gradient(145deg, ${hex}18 0%, ${hex}55 55%, #ffffff 100%)`
})

const sceneDescription = computed(() => {
  if (props.metadata.description) {
    return props.metadata.description
  }

  return props.metadata.variant === 'care_scene'
    ? '请一直看着这张情境图，边观察边练习怎样说会更让人舒服。'
    : '请一直看着这张场景图，边观察边判断对方的情绪、原因和合适回应。'
})

const roleDescription = computed(() => {
  if (props.activePerspective === 'receiver') {
    return props.metadata.receiverPerspectiveText || '现在试着站在对方的位置，感受哪句话听起来更舒服。'
  }

  if (props.metadata.variant === 'care_scene') {
    return props.metadata.speakerPerspectiveText || '现在从“我来表达关心”的角度，想一想怎么说更合适。'
  }

  return ''
})

const receiverDisplayName = computed(() => props.metadata.receiverName || '这位小朋友')
</script>

<style scoped>
.scene-panel {
  border-radius: 32px;
  border: 1px solid #ebeef5;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
}

.scene-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px;
}

.scene-panel__header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scene-panel__eyebrow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.scene-panel__tag {
  width: fit-content;
}

.scene-panel__helper {
  font-size: 13px;
  color: #909399;
}

.scene-panel__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.3;
  color: #303133;
}

.scene-panel__description {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  color: #606266;
}

.scene-panel__visual {
  position: relative;
  min-height: 420px;
  border-radius: 30px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-panel__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.scene-panel__emoji-shell {
  width: 100%;
  height: 100%;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-panel__emoji {
  font-size: clamp(88px, 14vw, 168px);
  line-height: 1;
}

.scene-panel__overlay {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #303133;
}

.scene-panel__overlay-label {
  font-size: 12px;
  color: #909399;
}

.scene-panel__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scene-panel__section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}

.scene-panel__clues {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.scene-panel__clue {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #dce7f7;
  font-size: 15px;
  line-height: 1.5;
  color: #303133;
}

.scene-panel__role-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.scene-panel__role-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px 14px;
  border-radius: 20px;
  border: 2px solid #dcdfe6;
  background: #fff;
}

.scene-panel__role-card--active {
  border-color: #f0b26a;
  box-shadow: 0 0 0 3px rgba(240, 178, 106, 0.18);
}

.scene-panel__role-card strong,
.scene-panel__role-card span {
  display: block;
}

.scene-panel__role-card span {
  margin-top: 4px;
  font-size: 13px;
  color: #909399;
}

.scene-panel__role-emoji {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fef3c7 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.scene-panel__role-arrow {
  text-align: center;
  font-size: 22px;
  color: #909399;
}

.scene-panel__role-description {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: #606266;
}

@media (max-width: 960px) {
  .scene-panel :deep(.el-card__body) {
    padding: 20px;
  }

  .scene-panel__visual,
  .scene-panel__emoji-shell {
    min-height: 320px;
  }

  .scene-panel__role-strip {
    grid-template-columns: 1fr;
  }

  .scene-panel__role-arrow {
    display: none;
  }
}
</style>
