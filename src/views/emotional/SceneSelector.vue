<template>
  <div class="page-container scgp-admin-page">
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

    <div class="main-content scgp-page-panel">
      <div class="toolbar scgp-content-toolbar">
        <div class="toolbar-copy scgp-content-toolbar__group">
          <el-tag size="large" effect="light">{{ studentName || `学生 #${studentId}` }}</el-tag>
          <span class="scene-count">
            {{ isEmotionSceneSelector ? `筛后 ${filteredScenes.length} / ${scenes.length} 个情绪场景` : `筛后 ${filteredScenes.length} / ${scenes.length} 个关心情境` }}
          </span>
        </div>

        <div class="toolbar-actions scgp-content-toolbar__group">
          <el-button :icon="RefreshRight" plain @click="loadScenes">刷新</el-button>
          <el-button type="primary" plain @click="goToResourceCenter">前往资源中心</el-button>
        </div>
      </div>

      <el-skeleton v-if="loading" animated :rows="8" />

      <template v-else>
        <el-card shadow="never" class="filter-summary-card">
          <div class="filter-summary-head">
            <div class="filter-summary-copy">
              <div class="filter-summary-title-row">
                <h3 class="filter-summary-title">{{ filterPanelTitle }}</h3>
                <span class="filter-summary-count">{{ filteredScenes.length }} / {{ scenes.length }}</span>
              </div>
              <p class="filter-summary-subtitle">{{ activeFilterSummaryShort }}</p>
            </div>

            <div class="filter-summary-actions">
              <el-button plain @click="showAdvancedFilters = true">
                高级筛选
                <template v-if="activeFilterChipCount > 0">（{{ activeFilterChipCount }}）</template>
              </el-button>
              <el-button
                v-if="hasActiveFilters"
                text
                @click="clearFilters"
              >
                清空筛选
              </el-button>
            </div>
          </div>

          <div
            v-if="activeFilterChips.length > 0"
            class="filter-chip-row"
          >
            <el-tag
              v-for="chip in activeFilterChips"
              :key="chip.key"
              closable
              effect="plain"
              class="filter-chip"
              @close="removeFilterChip(chip)"
            >
              {{ chip.label }}
            </el-tag>
          </div>

          <div v-else class="filter-empty-state">
            {{ filterEmptyStateText }}
          </div>

          <div class="preset-section">
            <div class="preset-section-head">
              <span class="preset-section-title">快捷入口</span>
              <span class="preset-section-hint">{{ presetSectionHint }}</span>
            </div>

            <div class="preset-grid">
              <button
                v-for="preset in quickPresets"
                :key="preset.key"
                type="button"
                class="preset-card"
                :class="{ 'is-active': isPresetActive(preset) }"
                @click="applyPreset(preset)"
              >
                <span class="preset-label">{{ preset.label }}</span>
                <span class="preset-description">{{ preset.description }}</span>
                <span class="preset-count">{{ preset.count }} 个{{ isEmotionSceneSelector ? '场景' : '情境' }}</span>
              </button>
            </div>
          </div>
        </el-card>

        <el-drawer
          v-model="showAdvancedFilters"
          title="高级筛选"
          size="480px"
          class="filter-drawer"
        >
          <div class="drawer-copy">
            <p class="drawer-title">{{ advancedFilterTitle }}</p>
            <p class="drawer-subtitle">{{ advancedFilterSubtitle }}</p>
          </div>

          <div class="filter-section">
            <div class="filter-label-row">
              <span class="filter-label">适用年龄（Who）</span>
              <span class="filter-hint">{{ ageFilterHint }}</span>
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

          <div v-if="isEmotionSceneSelector" class="filter-section">
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

          <div v-if="isEmotionSceneSelector" class="filter-section">
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

          <div v-if="isCareSceneSelector" class="filter-section">
            <div class="filter-label-row">
              <span class="filter-label">接收者情绪（How it feels）</span>
              <span class="filter-hint">按对方当下的核心情绪筛选，更适合表达关心教学。</span>
            </div>
            <el-checkbox-group v-model="selectedReceiverEmotions" class="matrix-group">
              <el-checkbox-button
                v-for="option in availableReceiverEmotionOptions"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }} · {{ receiverEmotionCounts[option.value] || 0 }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>

          <div v-if="isCareSceneSelector" class="filter-section">
            <div class="filter-label-row">
              <span class="filter-label">关心方式（How to respond）</span>
              <span class="filter-hint">按表达策略筛选：共情、建议、行动。</span>
            </div>
            <el-checkbox-group v-model="selectedCareTypes" class="matrix-group">
              <el-checkbox-button
                v-for="option in availableCareTypeOptions"
                :key="option.value"
                :label="option.value"
              >
                {{ option.label }} · {{ careTypeCounts[option.value] || 0 }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>

          <div class="filter-summary">
            <span>{{ activeFilterSummary }}</span>
          </div>

          <template #footer>
            <div class="drawer-footer">
              <el-button v-if="hasActiveFilters" plain @click="clearFilters">清空筛选</el-button>
              <el-button type="primary" @click="showAdvancedFilters = false">完成</el-button>
            </div>
          </template>
        </el-drawer>

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
                  lazy
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
                  <el-tag v-if="isEmotionSceneSelector && scene.sceneDomain !== '未分类'" size="small" effect="plain">{{ scene.sceneDomain }}</el-tag>
                  <el-tag v-if="isEmotionSceneSelector && scene.themeCategory !== '未分类'" size="small" type="success" effect="plain">{{ scene.themeCategory }}</el-tag>
                  <el-tag v-if="isCareSceneSelector && scene.receiverName" size="small" effect="plain">{{ scene.receiverName }}</el-tag>
                  <el-tag v-if="isCareSceneSelector && scene.specificEmotionLabel" size="small" type="danger" effect="plain">{{ scene.specificEmotionLabel }}</el-tag>
                  <el-tag v-else-if="isCareSceneSelector && scene.receiverEmotionLabel" size="small" type="danger" effect="plain">{{ scene.receiverEmotionLabel }}</el-tag>
                  <el-tag v-if="isCareSceneSelector && scene.careTypeLabel" size="small" type="success" effect="plain">{{ scene.careTypeLabel }}</el-tag>
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { RefreshRight } from '@element-plus/icons-vue'
import { StudentAPI } from '@/database/api'
import { ResourceAPI } from '@/database/resource-api'
import { ModuleCode, type ResourceItem } from '@/types/module'
import type { EmotionalBaseEmotion, EmotionalCareType, EmotionalSceneDomain } from '@/types/emotional'
import { getEmotionCatalogEntry } from '@/features/emotional/emotion-catalog'
import {
  CARE_TYPE_OPTIONS,
  EMOTION_COLOR_PRESETS,
  normalizeCareSceneEditorModel,
  normalizeEmotionSceneEditorModel,
} from '@/views/resource-center/editors/emotional-resource-contract'
import { isDisplayImageLike, resolvePresetResourceUrl } from '@/utils/preset-resource'

interface SceneCard {
  id: number
  title: string
  description?: string
  receiverName?: string
  specificEmotionLabel?: string
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
  receiverEmotion?: EmotionalBaseEmotion
  receiverEmotionLabel?: string
  careType?: EmotionalCareType
  careTypeLabel?: string
}

interface SceneFilterPreset {
  key: string
  label: string
  description: string
  ageRanges: string[]
  domains: EmotionalSceneDomain[]
  themes: string[]
  receiverEmotions: EmotionalBaseEmotion[]
  careTypes: EmotionalCareType[]
  count: number
}

interface ActiveFilterChip {
  key: string
  group: 'age' | 'domain' | 'theme' | 'receiverEmotion' | 'careType'
  value: string
  label: string
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

const CARE_TYPE_LABEL_MAP: Record<EmotionalCareType, string> = CARE_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {} as Record<EmotionalCareType, string>)

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const scenes = ref<SceneCard[]>([])
const studentAgeYears = ref<number | null>(null)
const selectedAgeRanges = ref<string[]>([])
const selectedDomains = ref<EmotionalSceneDomain[]>([])
const selectedThemes = ref<string[]>([])
const selectedReceiverEmotions = ref<EmotionalBaseEmotion[]>([])
const selectedCareTypes = ref<EmotionalCareType[]>([])
const showAdvancedFilters = ref(false)

const inheritedQuery = computed(() => ({ ...route.query }))
const studentId = computed(() => Number(Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId || 0))
const studentName = computed(() => {
  const value = route.query.studentName
  return Array.isArray(value) ? value[0] : value || ''
})

const isEmotionSceneSelector = computed(() => route.name === 'EmotionSceneSelector')
const isCareSceneSelector = computed(() => !isEmotionSceneSelector.value)
const resourceType = computed<'emotion_scene' | 'care_scene'>(() => (
  isEmotionSceneSelector.value ? 'emotion_scene' : 'care_scene'
))
const trainingPath = computed(() => (
  isEmotionSceneSelector.value
    ? '/emotional/emotion-scene'
    : '/emotional/care-expression'
))
const pageTitle = computed(() => (
  isEmotionSceneSelector.value ? '选择情绪场景' : '选择关心情境'
))
const pageSubtitle = computed(() => (
  isEmotionSceneSelector.value
    ? '老师先选择一个具体生活场景，再带学生进入情绪识别与推理训练。'
    : '老师先选择一个需要表达关心的情境，再带学生进入沉浸式双视角练习。'
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
    : (
        scenes.value.length > 0 && hasActiveFilters.value
          ? '当前筛选条件下没有匹配的关心情境，请调整年龄、接收者情绪或关心方式。'
          : '当前没有可用的表达关心资源，请先在资源中心配置。'
      )
))
const studentAgeLabel = computed(() => (
  studentAgeYears.value === null ? '' : `${studentAgeYears.value}岁`
))
const hasActiveFilters = computed(() => (
  selectedAgeRanges.value.length > 0
  || selectedDomains.value.length > 0
  || selectedThemes.value.length > 0
  || selectedReceiverEmotions.value.length > 0
  || selectedCareTypes.value.length > 0
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
const receiverEmotionCounts = computed<Record<string, number>>(() => scenes.value.reduce((acc, scene) => {
  if (scene.receiverEmotion) {
    acc[scene.receiverEmotion] = (acc[scene.receiverEmotion] || 0) + 1
  }
  return acc
}, {} as Record<string, number>))
const careTypeCounts = computed<Record<string, number>>(() => scenes.value.reduce((acc, scene) => {
  if (scene.careType) {
    acc[scene.careType] = (acc[scene.careType] || 0) + 1
  }
  return acc
}, {} as Record<string, number>))
const availableAgeRanges = computed(() => Object.keys(ageCounts.value).sort(sortAgeRanges))
const availableDomainOptions = computed(() => SCENE_DOMAIN_ORDER
  .filter((domain) => (domainCounts.value[domain] || 0) > 0)
  .map((domain) => ({ value: domain, label: domain })))
const availableThemes = computed(() => SCENE_THEME_ORDER.filter((theme) => (themeCounts.value[theme] || 0) > 0))
const availableReceiverEmotionOptions = computed(() => Object.keys(receiverEmotionCounts.value)
  .map((value) => {
    const emotion = value as EmotionalBaseEmotion
    const meta = getEmotionCatalogEntry(emotion, emotion)
    return {
      value: emotion,
      label: meta.label,
    }
  }))
const availableCareTypeOptions = computed(() => CARE_TYPE_OPTIONS.filter((option) => (careTypeCounts.value[option.value] || 0) > 0))
const recommendedAgeRanges = computed(() => {
  const ageYears = studentAgeYears.value
  if (ageYears === null) {
    return []
  }

  return availableAgeRanges.value.filter((ageRange) => matchesAgeRange(ageRange, ageYears))
})
const filteredScenes = computed(() => scenes.value.filter((scene) => {
  return matchesSceneFilters(scene, {
    ageRanges: selectedAgeRanges.value,
    domains: selectedDomains.value,
    themes: selectedThemes.value,
    receiverEmotions: selectedReceiverEmotions.value,
    careTypes: selectedCareTypes.value,
  })
}).sort(sortScenesByResourceCode))
const filterPanelTitle = computed(() => (
  isEmotionSceneSelector.value ? '场景筛选' : '关心情境筛选'
))
const filterEmptyStateText = computed(() => (
  isEmotionSceneSelector.value
    ? '当前未限制场域和主题，可直接从下方快捷入口开始。'
    : '当前未限制接收者情绪和关心方式，可直接从下方快捷入口开始。'
))
const presetSectionHint = computed(() => (
  isEmotionSceneSelector.value
    ? '优先覆盖最常用的进入方式，减少翻动 80 张卡片前的操作成本。'
    : '先按常见关心目标进入，再决定是否展开完整筛选。'
))
const advancedFilterTitle = computed(() => (
  isEmotionSceneSelector.value ? '年龄 + 场域 + 主题交叉筛选' : '年龄 + 接收者情绪 + 关心方式交叉筛选'
))
const advancedFilterSubtitle = computed(() => (
  isEmotionSceneSelector.value
    ? '这里保留完整筛选矩阵；顶部区域只展示摘要和快捷入口。'
    : '这里保留完整筛选矩阵；顶部区域只展示摘要和快捷入口。'
))
const ageFilterHint = computed(() => (
  isEmotionSceneSelector.value ? '按当前学生年龄筛选更合适的情绪场景。' : '按当前学生年龄筛选更合适的关心情境。'
))
const activeFilterSummary = computed(() => {
  if (!hasActiveFilters.value) {
    return isEmotionSceneSelector.value
      ? `当前展示全部 ${filteredScenes.value.length} 个情绪场景。`
      : `当前展示全部 ${filteredScenes.value.length} 个关心情境。`
  }

  const ageText = selectedAgeRanges.value.length > 0 ? selectedAgeRanges.value.join('、') : '全部年龄'

  if (isEmotionSceneSelector.value) {
    const domainText = selectedDomains.value.length > 0 ? selectedDomains.value.join('、') : '全部场域'
    const themeText = selectedThemes.value.length > 0 ? selectedThemes.value.join('、') : '全部主题'
    return `当前筛选：年龄 [${ageText}] + 空间 [${domainText}] + 主题 [${themeText}]，共匹配 ${filteredScenes.value.length} 个场景。`
  }

  const emotionText = selectedReceiverEmotions.value.length > 0
    ? selectedReceiverEmotions.value.map((emotion) => getEmotionCatalogEntry(emotion, emotion).label).join('、')
    : '全部情绪'
  const careTypeText = selectedCareTypes.value.length > 0
    ? selectedCareTypes.value.map((careType) => CARE_TYPE_LABEL_MAP[careType]).join('、')
    : '全部方式'
  return `当前筛选：年龄 [${ageText}] + 接收者情绪 [${emotionText}] + 关心方式 [${careTypeText}]，共匹配 ${filteredScenes.value.length} 个情境。`
})
const activeFilterSummaryShort = computed(() => {
  if (!hasActiveFilters.value) {
    return isEmotionSceneSelector.value
      ? '当前展示全部场景，可先用快捷入口定位常见教学情境。'
      : '当前展示全部关心情境，可先用快捷入口定位常见安慰与支持练习。'
  }

  const parts: string[] = []
  if (selectedAgeRanges.value.length > 0) {
    parts.push(`年龄 ${selectedAgeRanges.value.join('、')}`)
  }
  if (isEmotionSceneSelector.value && selectedDomains.value.length > 0) {
    parts.push(`场域 ${selectedDomains.value.join('、')}`)
  }
  if (isEmotionSceneSelector.value && selectedThemes.value.length > 0) {
    parts.push(`主题 ${selectedThemes.value.join('、')}`)
  }
  if (isCareSceneSelector.value && selectedReceiverEmotions.value.length > 0) {
    parts.push(`情绪 ${selectedReceiverEmotions.value.map((emotion) => getEmotionCatalogEntry(emotion, emotion).label).join('、')}`)
  }
  if (isCareSceneSelector.value && selectedCareTypes.value.length > 0) {
    parts.push(`方式 ${selectedCareTypes.value.map((careType) => CARE_TYPE_LABEL_MAP[careType]).join('、')}`)
  }

  return isEmotionSceneSelector.value
    ? `当前按 ${parts.join(' / ')} 筛选，已匹配 ${filteredScenes.value.length} 个场景。`
    : `当前按 ${parts.join(' / ')} 筛选，已匹配 ${filteredScenes.value.length} 个情境。`
})
const activeFilterChips = computed<ActiveFilterChip[]>(() => ([
  ...selectedAgeRanges.value.map((value) => ({
    key: `age:${value}`,
    group: 'age' as const,
    value,
    label: `年龄 ${value}`,
  })),
  ...selectedDomains.value.map((value) => ({
    key: `domain:${value}`,
    group: 'domain' as const,
    value,
    label: `场域 ${value}`,
  })),
  ...selectedThemes.value.map((value) => ({
    key: `theme:${value}`,
    group: 'theme' as const,
    value,
    label: `主题 ${value}`,
  })),
  ...selectedReceiverEmotions.value.map((value) => ({
    key: `receiverEmotion:${value}`,
    group: 'receiverEmotion' as const,
    value,
    label: `情绪 ${getEmotionCatalogEntry(value, value).label}`,
  })),
  ...selectedCareTypes.value.map((value) => ({
    key: `careType:${value}`,
    group: 'careType' as const,
    value,
    label: `方式 ${CARE_TYPE_LABEL_MAP[value]}`,
  })),
]))
const activeFilterChipCount = computed(() => activeFilterChips.value.length)
const quickPresets = computed<SceneFilterPreset[]>(() => {
  const presets: Array<Omit<SceneFilterPreset, 'count'>> = isEmotionSceneSelector.value
    ? [
        {
          key: 'all',
          label: '全部场景',
          description: '取消限制，直接浏览完整场景库。',
          ageRanges: [],
          domains: [],
          themes: [],
          receiverEmotions: [],
          careTypes: [],
        },
        {
          key: 'recommended-age',
          label: studentAgeLabel.value ? `同龄推荐 ${studentAgeLabel.value}` : '同龄推荐',
          description: '优先回到当前学生年龄段适配的场景。',
          ageRanges: [...recommendedAgeRanges.value],
          domains: [],
          themes: [],
          receiverEmotions: [],
          careTypes: [],
        },
        {
          key: 'campus',
          label: '校园常见',
          description: '先看课堂、同伴与校园规则相关情境。',
          ageRanges: [],
          domains: ['校园'],
          themes: [],
          receiverEmotions: [],
          careTypes: [],
        },
        {
          key: 'family',
          label: '家庭日常',
          description: '聚焦家庭互动、照护与居家生活情境。',
          ageRanges: [],
          domains: ['家庭'],
          themes: [],
          receiverEmotions: [],
          careTypes: [],
        },
        {
          key: 'peer-conflict',
          label: '同伴冲突',
          description: '直接进入边界、争抢和冲突主题。',
          ageRanges: [],
          domains: [],
          themes: ['同伴冲突与边界'],
          receiverEmotions: [],
          careTypes: [],
        },
        {
          key: 'safety',
          label: '害怕与安全',
          description: '优先练习恐惧、安全和风险识别场景。',
          ageRanges: [],
          domains: [],
          themes: ['害怕与安全'],
          receiverEmotions: [],
          careTypes: [],
        },
      ]
    : [
        {
          key: 'all',
          label: '全部情境',
          description: '取消限制，直接浏览完整关心情境库。',
          ageRanges: [],
          domains: [],
          themes: [],
          receiverEmotions: [],
          careTypes: [],
        },
        {
          key: 'recommended-age',
          label: studentAgeLabel.value ? `同龄推荐 ${studentAgeLabel.value}` : '同龄推荐',
          description: '优先回到当前学生年龄段适配的关心情境。',
          ageRanges: [...recommendedAgeRanges.value],
          domains: [],
          themes: [],
          receiverEmotions: [],
          careTypes: [],
        },
        {
          key: 'sad',
          label: '接住难过',
          description: '聚焦难过、失落时的安慰与支持表达。',
          ageRanges: [],
          domains: [],
          themes: [],
          receiverEmotions: ['sad'],
          careTypes: [],
        },
        {
          key: 'scared',
          label: '接住害怕',
          description: '聚焦害怕、不安时的安全感回应。',
          ageRanges: [],
          domains: [],
          themes: [],
          receiverEmotions: ['scared'],
          careTypes: [],
        },
        {
          key: 'empathy',
          label: '先共情',
          description: '优先练习安慰、理解和情绪接纳类表达。',
          ageRanges: [],
          domains: [],
          themes: [],
          receiverEmotions: [],
          careTypes: ['empathy'],
        },
        {
          key: 'action',
          label: '先行动',
          description: '优先练习帮助、陪伴和实际支持类表达。',
          ageRanges: [],
          domains: [],
          themes: [],
          receiverEmotions: [],
          careTypes: ['action'],
        },
      ]

  return presets
    .filter((preset) => preset.key !== 'recommended-age' || preset.ageRanges.length > 0)
    .map((preset) => ({
      ...preset,
      count: countScenesForFilters({
        ageRanges: preset.ageRanges,
        domains: preset.domains,
        themes: preset.themes,
        receiverEmotions: preset.receiverEmotions,
        careTypes: preset.careTypes,
      }),
    }))
    .filter((preset) => preset.count > 0 || preset.key === 'all' || preset.key === 'recommended-age')
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

function parseAgeRange(ageRange: string) {
  const match = ageRange.match(/^(\d+)\s*-\s*(\d+)$/)
  if (!match) {
    return { min: Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }
  }

  return {
    min: Number(match[1]),
    max: Number(match[2]),
  }
}

function sortAgeRanges(left: string, right: string) {
  const leftRange = parseAgeRange(left)
  const rightRange = parseAgeRange(right)
  if (leftRange.min !== rightRange.min) {
    return leftRange.min - rightRange.min
  }
  if (leftRange.max !== rightRange.max) {
    return leftRange.max - rightRange.max
  }
  return left.localeCompare(right, 'zh-CN')
}

function parseSceneCodeNumber(sceneCode: string): number {
  const match = sceneCode.trim().match(/(\d+)$/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function sortScenesByResourceCode(left: SceneCard, right: SceneCard) {
  const leftNumber = parseSceneCodeNumber(left.resourceCode)
  const rightNumber = parseSceneCodeNumber(right.resourceCode)
  if (leftNumber !== rightNumber) {
    return leftNumber - rightNumber
  }
  return left.resourceCode.localeCompare(right.resourceCode, 'zh-CN')
}

function matchesSceneFilters(
  scene: SceneCard,
  filters: {
    ageRanges: string[]
    domains: EmotionalSceneDomain[]
    themes: string[]
    receiverEmotions: EmotionalBaseEmotion[]
    careTypes: EmotionalCareType[]
  }
) {
  const matchesAge = filters.ageRanges.length === 0 || (
    !!scene.ageRange && filters.ageRanges.includes(scene.ageRange)
  )
  const matchesDomain = filters.domains.length === 0 || filters.domains.includes(scene.sceneDomain as EmotionalSceneDomain)
  const matchesTheme = filters.themes.length === 0 || filters.themes.includes(scene.themeCategory)
  const matchesReceiverEmotion = filters.receiverEmotions.length === 0 || (
    !!scene.receiverEmotion && filters.receiverEmotions.includes(scene.receiverEmotion)
  )
  const matchesCareType = filters.careTypes.length === 0 || (
    !!scene.careType && filters.careTypes.includes(scene.careType)
  )
  return matchesAge && matchesDomain && matchesTheme && matchesReceiverEmotion && matchesCareType
}

function countScenesForFilters(filters: {
  ageRanges: string[]
  domains: EmotionalSceneDomain[]
  themes: string[]
  receiverEmotions: EmotionalBaseEmotion[]
  careTypes: EmotionalCareType[]
}) {
  return scenes.value.filter((scene) => matchesSceneFilters(scene, filters)).length
}

function areSameSelection<T>(left: T[], right: T[]) {
  if (left.length !== right.length) {
    return false
  }

  const leftSorted = [...left].sort()
  const rightSorted = [...right].sort()
  return leftSorted.every((value, index) => value === rightSorted[index])
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
  const looksLikeUrl = isDisplayImageLike(trimmed)

  if (looksLikeUrl) {
    return {
      coverImageUrl: resolvePresetResourceUrl(trimmed),
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
    description: 'description' in metadata ? metadata.description || resource.description : resource.description,
    receiverName: 'name' in metadata ? metadata.name || metadata.receiverName : undefined,
    specificEmotionLabel: 'specificEmotionLabel' in metadata ? metadata.specificEmotionLabel : undefined,
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
    receiverEmotion: 'receiverEmotion' in metadata ? metadata.receiverEmotion : undefined,
    receiverEmotionLabel: 'receiverEmotion' in metadata && metadata.receiverEmotion
      ? getEmotionCatalogEntry(metadata.receiverEmotion, metadata.receiverEmotion).label
      : undefined,
    careType: 'careType' in metadata ? metadata.careType : undefined,
    careTypeLabel: 'careType' in metadata && metadata.careType ? CARE_TYPE_LABEL_MAP[metadata.careType] : undefined,
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

    const student = await studentApi.getStudentById(studentId.value)
    studentAgeYears.value = calculateAge(student?.birthday || '')
    if (selectedAgeRanges.value.length === 0 && recommendedAgeRanges.value.length > 0) {
      selectedAgeRanges.value = [...recommendedAgeRanges.value]
    }
  } finally {
    loading.value = false
  }
}

function launchScene(resourceId: number) {
  const scene = filteredScenes.value.find((item) => item.id === resourceId)
  const nextQuery: LocationQueryRaw = {
    ...inheritedQuery.value,
    resourceId: String(resourceId),
  }

  if (isEmotionSceneSelector.value) {
    nextQuery.sceneCode = scene?.resourceCode || ''
  }

  router.push({
    path: trainingPath.value,
    query: nextQuery,
  })
}

function clearFilters() {
  selectedAgeRanges.value = []
  selectedDomains.value = []
  selectedThemes.value = []
  selectedReceiverEmotions.value = []
  selectedCareTypes.value = []
}

function applyRecommendedAgeFilters() {
  selectedAgeRanges.value = [...recommendedAgeRanges.value]
}

function applyPreset(preset: SceneFilterPreset) {
  selectedAgeRanges.value = [...preset.ageRanges]
  selectedDomains.value = [...preset.domains]
  selectedThemes.value = [...preset.themes]
  selectedReceiverEmotions.value = [...preset.receiverEmotions]
  selectedCareTypes.value = [...preset.careTypes]
}

function isPresetActive(preset: SceneFilterPreset) {
  return areSameSelection(selectedAgeRanges.value, preset.ageRanges)
    && areSameSelection(selectedDomains.value, preset.domains)
    && areSameSelection(selectedThemes.value, preset.themes)
    && areSameSelection(selectedReceiverEmotions.value, preset.receiverEmotions)
    && areSameSelection(selectedCareTypes.value, preset.careTypes)
}

function removeFilterChip(chip: ActiveFilterChip) {
  if (chip.group === 'age') {
    selectedAgeRanges.value = selectedAgeRanges.value.filter((value) => value !== chip.value)
    return
  }

  if (chip.group === 'domain') {
    selectedDomains.value = selectedDomains.value.filter((value) => value !== chip.value)
    return
  }

  if (chip.group === 'theme') {
    selectedThemes.value = selectedThemes.value.filter((value) => value !== chip.value)
    return
  }

  if (chip.group === 'receiverEmotion') {
    selectedReceiverEmotions.value = selectedReceiverEmotions.value.filter((value) => value !== chip.value)
    return
  }

  if (chip.group === 'careType') {
    selectedCareTypes.value = selectedCareTypes.value.filter((value) => value !== chip.value)
  }

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

watch(
  () => [resourceType.value, studentId.value] as const,
  ([nextResourceType, nextStudentId], [prevResourceType, prevStudentId]) => {
    if (nextResourceType === prevResourceType && nextStudentId === prevStudentId) {
      return
    }

    showAdvancedFilters.value = false
    clearFilters()
    loadScenes()
  }
)
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
  margin-bottom: 20px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border: 1px solid #edf2f7;
}

.filter-summary-card {
  margin-bottom: 20px;
  border-radius: 22px;
  border: 1px solid #e5edf6;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 30%),
    linear-gradient(135deg, #fffdf8 0%, #f8fbff 100%);
}

.filter-summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.filter-summary-copy {
  flex: 1;
  min-width: 0;
}

.filter-summary-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}

.filter-summary-title {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.filter-summary-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.filter-summary-subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
  font-size: 13px;
}

.filter-summary-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid #e6ecf5;
}

.preview-toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-toggle-copy strong {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.preview-toggle-copy span {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.filter-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-chip {
  background: rgba(255, 255, 255, 0.82);
}

.filter-empty-state {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.74);
  color: #64748b;
  font-size: 13px;
  border: 1px dashed #d7e3f1;
}

.preset-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 12px;
}

.preset-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.preset-section-hint {
  font-size: 12px;
  color: #94a3b8;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #dbe7f3;
  background: rgba(255, 255, 255, 0.82);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.preset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  border-color: #bfdbfe;
}

.preset-card.is-active {
  border-color: #60a5fa;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 251, 235, 0.95) 100%);
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.22);
}

.preset-label {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.preset-description {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.preset-count {
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.drawer-copy {
  margin-bottom: 16px;
}

.drawer-title {
  margin: 0 0 6px;
  color: #1f2937;
  font-size: 15px;
  font-weight: 600;
}

.drawer-subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.7;
  font-size: 13px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
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
  .toolbar-copy,
  .toolbar-actions,
  .scene-topline,
  .filter-summary-head,
  .filter-summary-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .preset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
