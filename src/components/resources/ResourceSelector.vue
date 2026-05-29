<template>
  <div class="resource-selector">
    <div class="filter-bar">
      <el-select v-model="selectedCategory" size="small" class="category-select" @change="selectCategory">
        <el-option label="全部" value="all">
          <span>全部</span>
          <span class="category-count">{{ categoryCounts.all }}</span>
        </el-option>
        <el-option v-for="cat in categoryButtons" :key="cat.key" :label="cat.label" :value="cat.key">
          <span>{{ cat.label }}</span>
          <span class="category-count">{{ categoryCounts[cat.key] || 0 }}</span>
        </el-option>
      </el-select>
      <el-input v-model="searchKeyword" placeholder="搜索..." prefix-icon="Search" clearable size="small" class="search-input" @input="handleSearch" />
    </div>
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>
    <div v-else-if="filteredResources.length === 0" class="empty-container">
      <el-empty description="暂无资源" />
    </div>
    <div v-else class="resource-list">
      <div v-for="item in filteredResources" :key="item.id" class="resource-item" :class="{ selected: selectedResource?.id === item.id }" @click="selectResource(item)">
        <!-- 游戏：显示 Emoji -->
        <div v-if="isGameResource(item)" class="resource-emoji" :style="getEmojiStyle(item)">
          {{ getEmoji(item) }}
        </div>
        <!-- 器材：显示图片 -->
        <img v-else :src="getResourceImage(item)" :alt="item.name" class="resource-image" />
        <div class="resource-info">
          <div class="resource-name">{{ item.name }}</div>
          <div class="resource-category">{{ getItemCategoryLabel(item) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ModuleCode, ResourceItem, ResourceQueryOptions } from '@/types/module'
import { useAuthStore } from '@/stores/auth'
import { isAccessControlledItemVisible } from '@/utils/access-visibility'
import { CATEGORY_LABELS } from '@/types/equipment'
import { ResourceAPI } from '@/database/resource-api'
import { type EquipmentCatalogGroupCode, resolveEquipmentCatalogGroupCode } from '@/utils/equipment-catalog-group'
import {
  type EquipmentTrainingEntryCode,
  matchesEquipmentTrainingEntry,
} from '@/utils/equipment-training-entry'
import {
  type TrainingEntryCode,
  matchesTrainingEntryResource,
} from '@/utils/training-entry'
import {
  buildEquipmentSourceCategoryCounts,
  resolveEquipmentSourceCategory,
  sortEquipmentSourceCategoryKeys,
} from '@/utils/physical-equipment-source-category'
import { adaptTrainingResourceAccessControlledItem } from '@/utils/resource-center-business'
import { resolveResourceItemCoverImage } from '@/utils/resource-cover'

// 游戏分类中文标签
const GAME_CATEGORY_LABELS: Record<string, string> = {
  visual: '视觉训练',
  audio: '听觉训练',
  tactile: '触觉训练',
  motor: '体感训练',
  construction: '结构搭建',
  coordination: '手眼协调',
  inhibition: '抑制控制',
  sorting: '分类整理',
  tracing: '轨迹描摹',
}

const SENSORY_GAME_ORDER = [1, 2, 3, 4, 5, 6, 8, 9, 10, 7]
const SENSORY_GAME_ORDER_BY_TASK_ID = new Map(
  SENSORY_GAME_ORDER.map((taskId, index) => [taskId, index])
)

interface Props {
  moduleCode?: ModuleCode
  resourceType?: string
  modelValue?: ResourceItem | null
  category?: string
  keyword?: string
  tags?: string[]
  favoritesOnly?: boolean
  equipmentCatalogGroups?: EquipmentCatalogGroupCode[]
  equipmentTrainingEntry?: EquipmentTrainingEntryCode | null
  trainingEntry?: TrainingEntryCode | null
}

const props = withDefaults(defineProps<Props>(), {
  moduleCode: 'sensory' as any,
  resourceType: 'equipment',
  modelValue: null,
  category: 'all',
  keyword: '',
  tags: undefined,
  favoritesOnly: false,
  equipmentCatalogGroups: undefined,
  equipmentTrainingEntry: null,
  trainingEntry: null
})

const emit = defineEmits<{
  'update:modelValue': [value: ResourceItem | null]
  'update:category': [value: string]
  'update:keyword': [value: string]
}>()

const authStore = useAuthStore()
const api = ref<ResourceAPI>()
const loading = ref(false)
const resources = ref<ResourceItem[]>([])
const categoryCounts = ref<Record<string, number>>({ all: 0 })
const selectedResource = ref<ResourceItem | null>(props.modelValue)
const searchKeyword = ref(props.keyword || '')
const selectedCategory = ref(props.category)
const debounceTimer = ref<number | null>(null)

// 动态生成分类按钮（从 categoryCounts 获取）
const categoryButtons = computed(() => {
  const buttons: { key: string; label: string }[] = []
  const entries = Object.entries(categoryCounts.value)
  const categoryEntries = props.resourceType === 'equipment'
    ? sortEquipmentSourceCategoryKeys(
        entries
          .filter(([key, count]) => key !== 'all' && count > 0)
          .map(([key]) => key)
      ).map((key) => [key, categoryCounts.value[key] || 0] as const)
    : entries.filter(([key, count]) => key !== 'all' && count > 0)

  for (const [key, count] of categoryEntries) {
    if (key !== 'all' && count > 0) {
      buttons.push({
        key,
        label: props.resourceType === 'equipment'
          ? key
          : GAME_CATEGORY_LABELS[key] || key,
      })
    }
  }
  return buttons
})

const filteredResources = computed(() => {
  let items = resources.value

  if (props.resourceType === 'equipment' && selectedCategory.value !== 'all') {
    items = items.filter((item) => resolveEquipmentSourceCategory(item) === selectedCategory.value)
  }

  if (props.tags && props.tags.length > 0) {
    items = items.filter(item => item.tags?.some(tag => props.tags!.includes(tag)))
  }
  return items
})

const selectCategory = (category: string) => {
  selectedCategory.value = category
  emit('update:category', category)
}

const debouncedSearch = (keyword: string) => {
  if (debounceTimer.value !== null) {
    clearTimeout(debounceTimer.value)
  }
  debounceTimer.value = setTimeout(() => {
    searchKeyword.value = keyword
    emit('update:keyword', keyword)
    loadData()
  }, 300) as unknown as number
}

const handleSearch = () => {
  debouncedSearch(searchKeyword.value)
}

const selectResource = (item: ResourceItem) => {
  selectedResource.value = item
  emit('update:modelValue', item)
}

const getResourceImage = (item: ResourceItem) => {
  return resolveResourceItemCoverImage(item)
}

const getItemCategoryLabel = (item: ResourceItem) => {
  if (props.resourceType === 'equipment') {
    return resolveEquipmentSourceCategory(item)
  }

  const category = item.category
  if (!category) return ''
  return GAME_CATEGORY_LABELS[category] || CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
}

// ========== 游戏资源相关函数 ==========

/**
 * 判断是否为游戏资源
 */
const isGameResource = (item: ResourceItem): boolean => {
  return item.resourceType === 'game' || props.resourceType === 'game'
}

/**
 * 获取游戏 Emoji
 */
const getEmoji = (item: ResourceItem): string => {
  const taskId = typeof item.metadata?.taskId === 'number' ? item.metadata.taskId : item.legacyId
  if (taskId === 10) {
    return '🎈'
  }

  // 优先从 metadata 获取 emoji
  if (item.metadata?.emoji) {
    return item.metadata.emoji
  }
  // 从 cover_image 获取（可能是 emoji）
  if (item.coverImage && isEmoji(item.coverImage)) {
    return item.coverImage
  }
  return '🎮' // 默认 emoji
}

/**
 * 获取 Emoji 背景样式
 */
const getEmojiStyle = (item: ResourceItem): Record<string, string> => {
  // 从 metadata 获取背景渐变色
  const color = item.metadata?.color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  return {
    background: color
  }
}

/**
 * 判断字符串是否为 Emoji
 */
const isEmoji = (str: string): boolean => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
  return emojiRegex.test(str)
}

const buildCategoryCounts = (items: ResourceItem[]): Record<string, number> => {
  const counts: Record<string, number> = { all: items.length }

  for (const item of items) {
    const category = typeof item.category === 'string' ? item.category.trim() : ''
    if (!category) {
      continue
    }

    counts[category] = (counts[category] || 0) + 1
  }

  return counts
}

const sortGameResources = (items: ResourceItem[]): ResourceItem[] => {
  if (props.resourceType !== 'game' || props.trainingEntry !== 'sensory-integration') {
    return items
  }

  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftTaskId = typeof left.item.metadata?.taskId === 'number'
        ? left.item.metadata.taskId
        : left.item.legacyId
      const rightTaskId = typeof right.item.metadata?.taskId === 'number'
        ? right.item.metadata.taskId
        : right.item.legacyId

      const leftOrder = typeof leftTaskId === 'number'
        ? (SENSORY_GAME_ORDER_BY_TASK_ID.get(leftTaskId) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER
      const rightOrder = typeof rightTaskId === 'number'
        ? (SENSORY_GAME_ORDER_BY_TASK_ID.get(rightTaskId) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }

      return left.index - right.index
    })
    .map(({ item }) => item)
}

const loadData = async () => {
  loading.value = true
  try {
    api.value = new ResourceAPI()
    const queryOptions: ResourceQueryOptions = {
      moduleCode: props.moduleCode,
      resourceType: props.resourceType,
      category: props.resourceType !== 'equipment' && selectedCategory.value !== 'all'
        ? selectedCategory.value
        : undefined,
      keyword: searchKeyword.value || undefined,
      tags: props.tags,
      favoritesOnly: props.favoritesOnly
    }
    let data = api.value.getResources(queryOptions)
    if (props.trainingEntry) {
      data = data.filter((item) => matchesTrainingEntryResource(item, props.trainingEntry))
    } else if (props.resourceType === 'equipment' && props.equipmentTrainingEntry) {
      data = data.filter((item) => matchesEquipmentTrainingEntry(item, props.equipmentTrainingEntry))
    } else if (props.resourceType === 'equipment' && props.equipmentCatalogGroups && props.equipmentCatalogGroups.length > 0) {
      const allowedGroups = new Set(props.equipmentCatalogGroups)
      data = data.filter((item) => allowedGroups.has(resolveEquipmentCatalogGroupCode(item)))
    }

    data = data.filter((item) =>
      isAccessControlledItemVisible(
        adaptTrainingResourceAccessControlledItem(item),
        authStore.hasModuleAccess,
        authStore.hasEntitlementAccess,
      )
    )

    data = sortGameResources(data)

    resources.value = data
    categoryCounts.value = props.resourceType === 'equipment'
      ? buildEquipmentSourceCategoryCounts(data)
      : buildCategoryCounts(data)
  } catch (error: any) {
    console.error('Load failed:', error)
    ElMessage.error('Failed to load resources')
  } finally {
    loading.value = false
  }
}

watch(
  () => [
    props.moduleCode,
    props.resourceType,
    props.category,
    props.tags,
    props.equipmentCatalogGroups,
    props.equipmentTrainingEntry,
    props.trainingEntry
  ],
  () => {
    selectedCategory.value = props.category || 'all'
    loadData()
  },
  { deep: true }
)

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  if (debounceTimer.value !== null) {
    clearTimeout(debounceTimer.value)
  }
})

watch(selectedResource, (newVal) => {
  emit('update:modelValue', newVal)
})
</script>

<style scoped>
.resource-selector {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.category-select {
  flex-shrink: 0;
  width: 160px;
}

.search-input {
  flex: 1;
}

.category-count {
  float: right;
  color: #909399;
  font-size: 12px;
}

.resource-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
}

.resource-item:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.resource-item.selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.resource-image {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
}

.resource-emoji {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.resource-info {
  flex: 1;
}

.resource-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.resource-category {
  font-size: 12px;
  color: #606266;
}

.loading-container,
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
</style>
