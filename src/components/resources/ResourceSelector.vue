<template>
  <div class="resource-selector">
    <div class="category-filters">
      <el-button :type="selectedCategory === 'all' ? 'primary' : 'default'" size="small" @click="selectCategory('all')">
        All ({{ categoryCounts.all }})
      </el-button>
      <el-button v-for="cat in categoryButtons" :key="cat.key" :type="selectedCategory === cat.key ? 'primary' : 'default'" size="small" @click="selectCategory(cat.key)">
        {{ cat.label }} ({{ categoryCounts[cat.key] || 0 }})
      </el-button>
    </div>
    <el-input v-model="searchKeyword" placeholder="Search..." prefix-icon="Search" clearable size="small" class="search-input" @input="handleSearch" />
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>
    <div v-else-if="filteredResources.length === 0" class="empty-container">
      <el-empty description="No resources" />
    </div>
    <div v-else class="resource-list">
      <div v-for="item in filteredResources" :key="item.id" class="resource-item" :class="{ selected: selectedResource?.id === item.id }" @click="selectResource(item)">
        <img :src="getResourceImage(item)" :alt="item.name" class="resource-image" />
        <div class="resource-info">
          <div class="resource-name">{{ item.name }}</div>
          <div class="resource-category">{{ getCategoryLabel(item.category) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled } from '@element-plus/icons-vue'
import type { ModuleCode, ResourceItem, ResourceQueryOptions } from '@/types/module'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/equipment'
import { getEquipmentImageUrl } from '@/assets/images/equipment/images'
import { ResourceAPI } from '@/database/resource-api'

// 简洁的中文标签映射（用于分类按钮）
const SIMPLE_CATEGORY_LABELS: Record<string, string> = {
  tactile: '触觉',
  olfactory: '嗅觉',
  visual: '视觉',
  auditory: '听觉',
  gustatory: '味觉',
  proprioceptive: '本体觉',
  integration: '感官综合'
}

interface Props {
  moduleCode?: ModuleCode
  resourceType?: string
  modelValue?: ResourceItem | null
  category?: string
  keyword?: string
  tags?: string[]
  favoritesOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  moduleCode: 'sensory' as any,
  resourceType: 'equipment',
  modelValue: null,
  category: 'all',
  keyword: '',
  tags: undefined,
  favoritesOnly: false
})

const emit = defineEmits<{
  'update:modelValue': [value: ResourceItem | null]
  'update:category': [value: string]
  'update:keyword': [value: string]
}>()

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
  const buttons: { key: string; label: string; color: string }[] = []
  // 遍历 categoryCounts，跳过 'all'
  for (const [key, count] of Object.entries(categoryCounts.value)) {
    if (key !== 'all' && count > 0) {
      buttons.push({
        key,
        label: SIMPLE_CATEGORY_LABELS[key] || key,
        color: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] || '#909399'
      })
    }
  }
  return buttons
})

const filteredResources = computed(() => {
  let items = resources.value
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
  // 使用 legacy_id 获取图片（图片文件使用旧表 ID 命名）
  // 如果没有 legacy_id，使用新表 ID
  const id = item.legacyId ?? item.id
  return getEquipmentImageUrl(item.category as any, id, item.name)
}

const getCategoryLabel = (category: string | undefined) => {
  if (!category) return ''
  // 对于卡片中的标签，使用简洁版本
  return SIMPLE_CATEGORY_LABELS[category] || CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
}

const loadData = async () => {
  loading.value = true
  try {
    api.value = new ResourceAPI()
    const queryOptions: ResourceQueryOptions = {
      moduleCode: props.moduleCode,
      resourceType: props.resourceType,
      category: selectedCategory.value !== 'all' ? selectedCategory.value : undefined,
      keyword: searchKeyword.value || undefined,
      tags: props.tags,
      favoritesOnly: props.favoritesOnly
    }
    const data = api.value.getResources(queryOptions)
    resources.value = data
    const counts = api.value.getCategoryCounts(props.moduleCode, props.resourceType)
    categoryCounts.value = counts
  } catch (error: any) {
    console.error('Load failed:', error)
    ElMessage.error('Failed to load resources')
  } finally {
    loading.value = false
  }
}

watch(() => [props.moduleCode, props.resourceType, props.category, props.tags], () => {
  selectedCategory.value = props.category || 'all'
  loadData()
}, { deep: true })

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

.category-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  margin-bottom: 12px;
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
