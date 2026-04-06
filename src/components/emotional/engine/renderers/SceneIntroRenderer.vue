<template>
  <div class="intro-stage">
    <el-tag effect="light" class="intro-tag">{{ resourceLabel }}</el-tag>
    <h2 class="intro-title">先看左侧大图，再开始</h2>
    <p class="intro-description">{{ defaultDescription }}</p>

    <div class="intro-tips">
      <div class="intro-tip">
        <span class="intro-tip__badge">1</span>
        <span>先安静观察场景里发生了什么。</span>
      </div>
      <div class="intro-tip">
        <span class="intro-tip__badge">2</span>
        <span>答题时可以一直看左侧图片和线索，不用着急记住全部内容。</span>
      </div>
      <div class="intro-tip">
        <span class="intro-tip__badge">3</span>
        <span>{{ metadata.variant === 'care_scene' ? '想一想怎样说会更让人舒服。' : '想一想对方现在是什么心情、为什么会这样。' }}</span>
      </div>
    </div>

    <div class="action-bar">
      <el-button type="primary" size="large" @click="$emit('advance')">
        {{ actionLabel }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SceneIntroStepMetadata } from '@/features/emotional/engine/types'

const props = defineProps<{
  metadata: SceneIntroStepMetadata
  resourceLabel: string
  actionLabel: string
}>()

defineEmits<{
  (e: 'advance'): void
}>()

const defaultDescription = computed(() => props.metadata.variant === 'care_scene'
  ? '请先观察左侧情境图，再进入表达关心练习。'
  : '请先观察左侧场景图，再进入情绪判断。')
</script>

<style scoped>
.intro-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 4px;
}

.intro-tag {
  width: fit-content;
}

.intro-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.35;
  color: #303133;
}

.intro-description {
  margin: 0;
  font-size: 17px;
  line-height: 1.9;
  color: #606266;
}

.intro-tips {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.intro-tip {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, #fff8e1 0%, #eef7ff 100%);
  color: #303133;
  line-height: 1.8;
}

.intro-tip__badge {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #409eff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
}
</style>
