<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: selectorPath, query: inheritedQuery }">选择场景</el-breadcrumb-item>
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

      <EmotionalInteractionEngine
        v-else-if="resource && sessionConfig"
        ref="engineRef"
        :session-config="sessionConfig"
        :student-label="studentLabel"
        :resource-label="resource.name"
        :intro-action-label="introActionLabel"
        :navigation="engineNavigation"
      />

      <el-skeleton v-else animated :rows="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
import EmotionalInteractionEngine from '@/components/emotional/engine/EmotionalInteractionEngine.vue'
import { compileEmotionScene } from '@/features/emotional/adapters'
import { useEmotionalTrainingShell } from '@/features/emotional/runtime/useEmotionalTrainingShell'
import { normalizeEmotionSceneEditorModel } from '@/views/resource-center/editors/emotional-resource-contract'

const selectorPath = '/emotional/emotion-scene/select'

const {
  introActionLabel,
  engineRef,
  resource,
  sessionConfig,
  loadError,
  studentLabel,
  inheritedQuery,
  engineNavigation,
  handleExit,
} = useEmotionalTrainingShell({
  resourceType: 'emotion_scene',
  selectorPath,
  introActionLabel: '开始识别情绪',
  normalizeResource: normalizeEmotionSceneEditorModel,
  compileSession: compileEmotionScene,
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
</style>
