<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">选择训练</el-breadcrumb-item>
        <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>{{ pageTitle }}</h1>
        <p class="subtitle">{{ pageSubtitle }}</p>
      </div>

      <div class="header-right">
        <el-button plain @click="goBackToMenu">返回情绪模块</el-button>
      </div>
    </div>

    <div class="main-content">
      <div class="toolbar">
        <div class="toolbar-copy">
          <el-tag size="large" effect="light">{{ studentName || `学生 #${studentId}` }}</el-tag>
          <span class="scene-count">共 {{ scenes.length }} 个可选场景</span>
        </div>

        <div class="toolbar-actions">
          <el-button :icon="RefreshRight" plain @click="loadScenes">刷新</el-button>
          <el-button type="primary" plain @click="goToResourceCenter">前往资源中心</el-button>
        </div>
      </div>

      <el-skeleton v-if="loading" animated :rows="8" />

      <template v-else>
        <el-empty
          v-if="scenes.length === 0"
          :description="emptyDescription"
        >
          <el-button type="primary" @click="goToResourceCenter">去配置资源</el-button>
        </el-empty>

        <el-row v-else :gutter="20" class="gallery-grid">
          <el-col
            v-for="scene in scenes"
            :key="scene.id"
            :xs="24"
            :sm="12"
            :lg="8"
            :xl="6"
          >
            <el-card
              shadow="hover"
              class="scene-card"
              @click="launchScene(scene.id)"
            >
              <div class="scene-cover" :style="{ background: scene.coverGradient }">
                <el-tag class="emotion-badge" effect="dark" :style="{ backgroundColor: scene.colorHex }">
                  {{ scene.colorLabel }}
                </el-tag>

                <el-image
                  v-if="scene.coverImageUrl"
                  :src="scene.coverImageUrl"
                  fit="cover"
                  class="cover-image"
                >
                  <template #error>
                    <div class="cover-fallback">
                      <span class="cover-emoji">{{ scene.coverEmoji }}</span>
                    </div>
                  </template>
                </el-image>

                <div v-else class="cover-fallback">
                  <span class="cover-emoji">{{ scene.coverEmoji }}</span>
                </div>
              </div>

              <div class="scene-body">
                <div class="scene-topline">
                  <h3 class="scene-title">{{ scene.title }}</h3>
                  <el-tag size="small" effect="plain">难度 {{ scene.difficultyLevel }}</el-tag>
                </div>

                <p class="scene-description">{{ scene.description || defaultDescription }}</p>

                <div class="scene-meta">
                  <el-tag size="small" type="warning" effect="plain">{{ scene.resourceTypeLabel }}</el-tag>
                  <el-tag size="small" effect="plain">{{ scene.resourceCode }}</el-tag>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshRight } from '@element-plus/icons-vue'
import { ResourceAPI } from '@/database/resource-api'
import { ModuleCode, type ResourceItem } from '@/types/module'
import type { EmotionalBaseEmotion } from '@/types/emotional'
import { EMOTION_COLOR_PRESETS } from '@/views/resource-center/editors/emotional-resource-contract'

interface SceneCard {
  id: number
  title: string
  description?: string
  coverImageUrl?: string
  coverEmoji: string
  coverGradient: string
  colorHex: string
  colorLabel: string
  difficultyLevel: 1 | 2 | 3
  resourceCode: string
  resourceTypeLabel: string
}

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const scenes = ref<SceneCard[]>([])

const inheritedQuery = computed(() => ({ ...route.query }))
const studentId = computed(() => Number(Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId || 0))
const studentName = computed(() => {
  const value = route.query.studentName
  return Array.isArray(value) ? value[0] : value || ''
})

const isEmotionSceneSelector = computed(() => route.name === 'EmotionSceneSelector')
const resourceType = computed<'emotion_scene' | 'care_scene'>(() => (
  isEmotionSceneSelector.value ? 'emotion_scene' : 'care_scene'
))
const trainingPath = computed(() => (
  isEmotionSceneSelector.value ? '/emotional/emotion-scene' : '/emotional/care-expression'
))
const pageTitle = computed(() => (
  isEmotionSceneSelector.value ? '选择情绪场景' : '选择关心情境'
))
const pageSubtitle = computed(() => (
  isEmotionSceneSelector.value
    ? '老师先选择一个具体生活场景，再带学生进入情绪识别与推理训练。'
    : '老师先选择一个需要表达关心的情境，再带学生进入双视角练习。'
))
const defaultDescription = computed(() => (
  isEmotionSceneSelector.value ? '点击卡片开始情绪与场景训练。' : '点击卡片开始表达关心训练。'
))
const emptyDescription = computed(() => (
  isEmotionSceneSelector.value
    ? '当前没有可用的情绪场景资源，请先在资源中心配置。'
    : '当前没有可用的表达关心资源，请先在资源中心配置。'
))

function deriveEmotionColor(
  emotion: EmotionalBaseEmotion | undefined,
  colorHex?: string,
  colorLabel?: string
) {
  if (emotion && EMOTION_COLOR_PRESETS[emotion]) {
    return {
      colorHex: colorHex || EMOTION_COLOR_PRESETS[emotion].hex,
      colorLabel: colorLabel || EMOTION_COLOR_PRESETS[emotion].label,
    }
  }

  return {
    colorHex: colorHex || '#909399',
    colorLabel: colorLabel || '未分区',
  }
}

function resolveCover(value: string | undefined, fallbackEmoji: string) {
  if (!value) {
    return {
      coverImageUrl: undefined,
      coverEmoji: fallbackEmoji,
    }
  }

  const trimmed = value.trim()
  const looksLikeUrl = trimmed.includes('://') || trimmed.startsWith('/') || trimmed.startsWith('data:') || /\.(png|jpe?g|gif|webp|svg)$/i.test(trimmed)

  if (looksLikeUrl) {
    return {
      coverImageUrl: trimmed,
      coverEmoji: fallbackEmoji,
    }
  }

  return {
    coverImageUrl: undefined,
    coverEmoji: trimmed,
  }
}

function mapResourceToSceneCard(resource: ResourceItem): SceneCard {
  const metadata = (resource.metadata || {}) as Record<string, any>
  const sceneTitle = String(metadata.title || resource.name || '')
  const sceneEmotion = (metadata.targetEmotion || metadata.receiverEmotion) as EmotionalBaseEmotion | undefined
  const { colorHex, colorLabel } = deriveEmotionColor(sceneEmotion, metadata.emotionColorHex, metadata.emotionColorLabel)
  const cover = resolveCover(
    (resource.coverImage || metadata.imageUrl || '') as string,
    isEmotionSceneSelector.value ? '🎭' : '💌'
  )

  return {
    id: resource.id,
    title: sceneTitle,
    description: resource.description,
    coverImageUrl: cover.coverImageUrl,
    coverEmoji: cover.coverEmoji,
    coverGradient: `linear-gradient(135deg, ${colorHex}18 0%, ${colorHex}55 100%)`,
    colorHex,
    colorLabel,
    difficultyLevel: metadata.difficultyLevel === 2 || metadata.difficultyLevel === 3 ? metadata.difficultyLevel : 1,
    resourceCode: String(metadata.sceneCode || `resource_${resource.id}`),
    resourceTypeLabel: isEmotionSceneSelector.value ? '情绪与场景' : '表达关心',
  }
}

async function loadScenes() {
  if (!studentId.value) {
    await router.replace({
      path: '/games/select-student',
      query: {
        module: 'emotional',
        targetPath: route.path,
        subModule: resourceType.value,
      },
    })
    return
  }

  loading.value = true
  try {
    const api = new ResourceAPI()
    const resources = api.getResources({
      moduleCode: ModuleCode.EMOTIONAL,
      resourceType: resourceType.value,
    })

    scenes.value = resources.map(mapResourceToSceneCard)
  } finally {
    loading.value = false
  }
}

function launchScene(resourceId: number) {
  router.push({
    path: trainingPath.value,
    query: {
      ...inheritedQuery.value,
      resourceId: String(resourceId),
    },
  })
}

function goBackToMenu() {
  router.push({
    path: '/emotional/menu',
    query: inheritedQuery.value,
  })
}

function goToResourceCenter() {
  router.push({
    path: '/resource-center',
    query: {
      module: 'emotional',
    },
  })
}

onMounted(() => {
  loadScenes()
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
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border: 1px solid #edf2f7;
}

.toolbar-copy,
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scene-count {
  color: #606266;
  font-size: 14px;
}

.gallery-grid {
  row-gap: 20px;
}

.scene-card {
  cursor: pointer;
  border-radius: 22px;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.scene-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.scene-cover {
  position: relative;
  min-height: 180px;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emotion-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  z-index: 2;
}

.cover-image {
  width: 100%;
  height: 180px;
}

.cover-fallback {
  width: 100%;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-emoji {
  font-size: 64px;
  filter: drop-shadow(0 6px 18px rgba(255, 255, 255, 0.45));
}

.scene-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 14px;
}

.scene-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.scene-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.5;
  color: #1f2937;
}

.scene-description {
  margin: 0;
  min-height: 44px;
  color: #6b7280;
  line-height: 1.7;
  font-size: 13px;
}

.scene-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .toolbar,
  .toolbar-copy,
  .toolbar-actions,
  .scene-topline {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
