<template>
  <div class="intro-stage">
    <PerspectiveSwitchView
      v-if="metadata.variant === 'care_scene' && metadata.speakerPerspectiveText"
      active-side="sender"
      title="先看清现在是谁在说，谁在听"
      :description="metadata.speakerPerspectiveText"
    />

    <div class="scene-hero">
      <div class="scene-visual" :style="{ background: activeSceneGradient }">
        <span class="scene-emoji">{{ sceneEmoji }}</span>
      </div>
      <div class="scene-copy">
        <el-tag effect="light" class="scene-tag">{{ resourceLabel }}</el-tag>
        <h2 class="scene-title">{{ metadata.title }}</h2>
        <p class="scene-description">{{ metadata.description || defaultDescription }}</p>
      </div>
    </div>

    <el-card v-if="metadata.clues?.length" class="clue-card" shadow="never">
      <template #header>
        <span>场景线索</span>
      </template>
      <div class="clue-list">
        <el-tag
          v-for="clue in metadata.clues"
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
      <el-button type="primary" size="large" @click="$emit('advance')">
        {{ actionLabel }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PerspectiveSwitchView from '@/components/emotional/PerspectiveSwitchView.vue'
import type { SceneIntroStepMetadata } from '@/features/emotional/engine/types'

const props = defineProps<{
  metadata: SceneIntroStepMetadata
  resourceLabel: string
  actionLabel: string
}>()

defineEmits<{
  (e: 'advance'): void
}>()

const sceneEmoji = computed(() => props.metadata.sceneVisual.coverImage || '🎭')
const activeSceneGradient = computed(() => {
  const hex = props.metadata.sceneVisual.emotionColorHex || '#67C23A'
  return `linear-gradient(135deg, ${hex}22 0%, ${hex}55 100%)`
})
const defaultDescription = computed(() => props.metadata.variant === 'care_scene'
  ? '请先观察情境，再决定怎样表达关心更合适。'
  : '请先观察场景，再进入情绪判断。')
</script>

<style scoped>
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

@media (max-width: 960px) {
  .scene-hero {
    grid-template-columns: 1fr;
  }

  .scene-visual {
    min-height: 180px;
  }
}
</style>
