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
          <span class="scene-count">
            {{ isEmotionSceneSelector ? `筛后 ${filteredScenes.length} / ${scenes.length} 个情绪场景` : `共 ${filteredScenes.length} 个可选场景` }}
          </span>
        </div>

        <div class="toolbar-actions">
          <el-button :icon="RefreshRight" plain @click="loadScenes">刷新</el-button>
          <el-button type="primary" plain @click="goToResourceCenter">前往资源中心</el-button>
        </div>
      </div>

      <el-skeleton v-if="loading" animated :rows="8" />

      <template v-else>
        <el-card
          v-if="isEmotionSceneSelector"
          shadow="never"
          class="filter-matrix-card"
        >
          <div class="filter-matrix-head">
            <div>
              <h3 class="filter-matrix-title">交叉筛选矩阵</h3>
              <p class="filter-matrix-subtitle">先按场域空间筛“情绪发生在哪”，再按情景主题筛“发生了什么事”。</p>
            </div>
            <el-button
              v-if="hasActiveFilters"
              plain
              @click="clearFilters"
            >
              清空筛选
            </el-button>
          </div>

          <div class="filter-section">
            <div class="filter-label-row">
              <span class="filter-label">适用年龄（Who）</span>
              <span class="filter-hint">按当前学生年龄筛选更合适的情绪场景。</span>
              <el-button
                v-if="studentAgeLabel && recommendedAgeRanges.length > 0"
                size="small"
                text
                @click="applyRecommendedAgeFilters"
              >
                按学生年龄推荐：{{ studentAgeLabel }}
              </el-button>
            </div>
            <el-checkbox-group v-model="selectedAgeRanges" class="matrix-group">
              <el-checkbox-button
                v-for="ageRange in availableAgeRanges"
                :key="ageRange"
                :label="ageRange"
              >
                {{ ageRange }}岁 · {{ ageCounts[ageRange] || 0 }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>

          <div class="filter-section">
            <div class="filter-label-row">
              <span class="filter-label">物理空间（Where）</span>
              <span class="filter-hint">家庭 / 校园 / 公共商业与社区 / 交通出行 / 医疗康复 / 自然生态 / 数字虚拟</span>
            </div>
            <el-checkbox-group v-model="selectedDomains" class="matrix-group">
              <el-checkbox-button
                v-for="option in availableDomainOptions"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }} · {{ domainCounts[option.value] || 0 }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>

          <div class="filter-section">
            <div class="filter-label-row">
              <span class="filter-label">情景主题（What / Why）</span>
              <span class="filter-hint">同伴冲突与边界 / 害怕与安全 / 社交尴尬 / 失落挫折 / 快乐体验 / 成长成就 / 害羞与被关注 / 平静专注</span>
            </div>
            <el-checkbox-group v-model="selectedThemes" class="matrix-group">
              <el-checkbox-button
                v-for="theme in availableThemes"
                :key="theme"
                :label="theme"
              >
                {{ theme }} · {{ themeCounts[theme] || 0 }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>

          <div class="filter-summary">
            <span>{{ activeFilterSummary }}</span>
          </div>
        </el-card>

        <el-empty
          v-if="filteredScenes.length === 0"
          :description="emptyDescription"
        >
          <el-button type="primary" @click="goToResourceCenter">去配置资源</el-button>
        </el-empty>

        <el-row v-else :gutter="20" class="gallery-grid">
          <el-col
            v-for="scene in filteredScenes"
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
                  <el-tag v-if="scene.ageRange" size="small" type="info" effect="plain">{{ scene.ageRange }}岁</el-tag>
                  <el-tag size="small" effect="plain">{{ scene.sceneDomain }}</el-tag>
                  <el-tag size="small" type="success" effect="plain">{{ scene.themeCategory }}</el-tag>
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
import { StudentAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import { ModuleCode, type ResourceItem } from '@/types/module'
import type { EmotionalBaseEmotion, EmotionalSceneDomain } from '@/types/emotional'
import {
  EMOTION_COLOR_PRESETS,
  normalizeCareSceneEditorModel,
  normalizeEmotionSceneEditorModel,
} from '@/views/resource-center/editors/emotional-resource-contract'

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
  ageRange?: string
  sceneDomain: EmotionalSceneDomain | '未分类'
  themeCategory: string
}

const SCENE_DOMAIN_ORDER: EmotionalSceneDomain[] = [
  '家庭',
  '校园',
  '公共商业与社区',
  '交通出行',
  '医疗康复',
  '自然生态',
  '数字虚拟',
]

const SCENE_THEME_ORDER = [
  '同伴冲突与边界',
  '害怕与安全',
  '社交尴尬',
  '失落挫折',
  '快乐体验',
  '成长成就',
  '害羞与被关注',
  '平静专注',
] as const

const AGE_RANGE_ORDER = [
  '4-6',
  '7-12',
  '13-17',
] as const

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const scenes = ref<SceneCard[]>([])
const studentAgeYears = ref<number | null>(null)
const selectedAgeRanges = ref<string[]>([])
const selectedDomains = ref<EmotionalSceneDomain[]>([])
const selectedThemes = ref<string[]>([])

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
    ? (
        scenes.value.length > 0 && hasActiveFilters.value
          ? '当前筛选条件下没有匹配的情绪场景，请调整年龄、场域空间或情景主题。'
          : '当前没有可用的情绪场景资源，请先在资源中心配置。'
      )
    : '当前没有可用的表达关心资源，请先在资源中心配置。'
))
const studentAgeLabel = computed(() => (
  studentAgeYears.value === null ? '' : `${studentAgeYears.value}岁`
))
const hasActiveFilters = computed(() => (
  selectedAgeRanges.value.length > 0 || selectedDomains.value.length > 0 || selectedThemes.value.length > 0
))
const ageCounts = computed<Record<string, number>>(() => scenes.value.reduce((acc, scene) => {
  if (scene.ageRange) {
    acc[scene.ageRange] = (acc[scene.ageRange] || 0) + 1
  }
  return acc
}, {} as Record<string, number>))
const domainCounts = computed<Record<string, number>>(() => scenes.value.reduce((acc, scene) => {
  acc[scene.sceneDomain] = (acc[scene.sceneDomain] || 0) + 1
  return acc
}, {} as Record<string, number>))
const themeCounts = computed<Record<string, number>>(() => scenes.value.reduce((acc, scene) => {
  acc[scene.themeCategory] = (acc[scene.themeCategory] || 0) + 1
  return acc
}, {} as Record<string, number>))
const availableAgeRanges = computed(() => AGE_RANGE_ORDER.filter((ageRange) => ageCounts.value[ageRange] > 0))
const availableDomainOptions = computed(() => SCENE_DOMAIN_ORDER
  .filter((domain) => domainCounts.value[domain] > 0)
  .map((domain) => ({ value: domain, label: domain })))
const availableThemes = computed(() => SCENE_THEME_ORDER.filter((theme) => themeCounts.value[theme] > 0))
const recommendedAgeRanges = computed(() => {
  if (studentAgeYears.value === null) {
    return []
  }

  return availableAgeRanges.value.filter((ageRange) => matchesAgeRange(ageRange, studentAgeYears.value))
})
const filteredScenes = computed(() => scenes.value.filter((scene) => {
  const matchesAge = selectedAgeRanges.value.length === 0 || (
    !!scene.ageRange && selectedAgeRanges.value.includes(scene.ageRange)
  )
  const matchesDomain = selectedDomains.value.length === 0 || selectedDomains.value.includes(scene.sceneDomain as EmotionalSceneDomain)
  const matchesTheme = selectedThemes.value.length === 0 || selectedThemes.value.includes(scene.themeCategory)
  return matchesAge && matchesDomain && matchesTheme
}))
const activeFilterSummary = computed(() => {
  if (!hasActiveFilters.value) {
    return `当前展示全部 ${filteredScenes.value.length} 个情绪场景。`
  }

  const ageText = selectedAgeRanges.value.length > 0 ? selectedAgeRanges.value.join('、') : '全部年龄'
  const domainText = selectedDomains.value.length > 0 ? selectedDomains.value.join('、') : '全部场域'
  const themeText = selectedThemes.value.length > 0 ? selectedThemes.value.join('、') : '全部主题'
  return `当前筛选：年龄 [${ageText}] + 空间 [${domainText}] + 主题 [${themeText}]，共匹配 ${filteredScenes.value.length} 个场景。`
})

function calculateAge(birthday: string): number | null {
  if (!birthday) {
    return null
  }

  const birth = new Date(birthday)
  if (Number.isNaN(birth.getTime())) {
    return null
  }

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return age >= 0 ? age : null
}

function matchesAgeRange(ageRange: string, ageYears: number): boolean {
  const match = ageRange.match(/^(\d+)\s*-\s*(\d+)$/)
  if (!match) {
    return false
  }

  const minAge = Number(match[1])
  const maxAge = Number(match[2])
  return ageYears >= minAge && ageYears <= maxAge
}

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
  const metadata = resource.resourceType === 'care_scene'
    ? normalizeCareSceneEditorModel(resource.metadata, resource.name)
    : normalizeEmotionSceneEditorModel(resource.metadata, resource.name)
  const sceneTitle = String(metadata.title || resource.name || '')
  const sceneEmotion = ('targetEmotion' in metadata ? metadata.targetEmotion : metadata.receiverEmotion) as EmotionalBaseEmotion | undefined
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
    ageRange: 'ageRange' in metadata ? metadata.ageRange : undefined,
    sceneDomain: ('sceneDomain' in metadata && metadata.sceneDomain ? metadata.sceneDomain : '未分类') as EmotionalSceneDomain | '未分类',
    themeCategory: resource.category || '未分类',
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
    const studentApi = new StudentAPI()
    const resources = api.getResources({
      moduleCode: ModuleCode.EMOTIONAL,
      resourceType: resourceType.value,
    })

    scenes.value = resources.map(mapResourceToSceneCard)

    if (isEmotionSceneSelector.value) {
      const student = await studentApi.getStudentById(studentId.value)
      studentAgeYears.value = calculateAge(student?.birthday || '')
      if (selectedAgeRanges.value.length === 0 && recommendedAgeRanges.value.length > 0) {
        selectedAgeRanges.value = [...recommendedAgeRanges.value]
      }
    }
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

function clearFilters() {
  selectedAgeRanges.value = []
  selectedDomains.value = []
  selectedThemes.value = []
}

function applyRecommendedAgeFilters() {
  selectedAgeRanges.value = [...recommendedAgeRanges.value]
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

.filter-matrix-card {
  margin-bottom: 20px;
  border-radius: 22px;
  border: 1px solid #e5edf6;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 30%),
    linear-gradient(135deg, #fffdf8 0%, #f8fbff 100%);
}

.filter-matrix-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.filter-matrix-title {
  margin: 0 0 6px;
  font-size: 18px;
  color: #1f2937;
}

.filter-matrix-subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
  font-size: 13px;
}

.filter-section + .filter-section {
  margin-top: 18px;
}

.filter-label-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 10px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.filter-hint {
  font-size: 12px;
  color: #94a3b8;
}

.matrix-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-summary {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.75);
  color: #475569;
  font-size: 13px;
  line-height: 1.7;
  border: 1px dashed #d7e3f1;
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
  .scene-topline,
  .filter-matrix-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
