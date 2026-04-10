<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: selectorPath, query: inheritedQuery }">选择情境</el-breadcrumb-item>
        <el-breadcrumb-item>表达关心训练</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>表达关心训练</h1>
        <p class="subtitle">围绕“我怎么说”和“别人听起来怎么样”，练习共情、建议和行动支持。</p>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          plain
          :disabled="!resource"
          @click="goToImmersivePreview"
        >
          预览沉浸式版
        </el-button>
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
import { useRouter } from 'vue-router'

import EmotionalInteractionEngine from '@/components/emotional/engine/EmotionalInteractionEngine.vue'
import { compileCareScene } from '@/features/emotional/adapters'
import { useEmotionalTrainingShell } from '@/features/emotional/runtime/useEmotionalTrainingShell'
import { normalizeCareSceneEditorModel } from '@/views/resource-center/editors/emotional-resource-contract'

const selectorPath = '/emotional/care-expression/select'
const router = useRouter()

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
  resourceType: 'care_scene',
  selectorPath,
  introActionLabel: '开始选择关心表达',
  normalizeResource: normalizeCareSceneEditorModel,
  compileSession: compileCareScene,
})

function goToImmersivePreview(): void {
  if (!resource.value) {
    return
  }

  void router.push({
    path: '/emotional/care-expression/immersive',
    query: {
      ...inheritedQuery.value,
      resourceId: String(resource.value.id),
      sceneCode: resource.value.metadata.sceneCode || '',
    },
  })
}
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
