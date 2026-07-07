import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  TeachingMaterialsAPI,
  type TeachingMaterialCreateInput,
  type TeachingMaterialItem,
} from '@/database/teaching-materials-api'
import {
  getAccessibleTeachingMaterialDimensions,
  getTeachingMaterialFileCategoryLabel,
  getTeachingMaterialDimensionLabel,
  getTeachingMaterialModuleCode,
  resolveTeachingMaterialFileCategory,
  type TeachingMaterialFileCategoryCode,
  type TeachingMaterialDimensionCode,
} from '@/utils/resource-center-business'
import { teachingMaterialFileManager } from '@/utils/teaching-material-file-manager'

export const useTeachingMaterialsStore = defineStore('teaching-materials', () => {
  const authStore = useAuthStore()
  const api = new TeachingMaterialsAPI()

  const materials = ref<TeachingMaterialItem[]>([])
  const currentDimension = ref<TeachingMaterialDimensionCode | null>(null)
  const currentFileCategory = ref<TeachingMaterialFileCategoryCode>('all')
  const searchKeyword = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const showFavoritesOnly = ref(false)

  const dimensions = computed(() => getAccessibleTeachingMaterialDimensions(authStore.hasModuleAccess))

  const currentDimensionName = computed(() => {
    if (!currentDimension.value) {
      return '全部资料'
    }

    return getTeachingMaterialDimensionLabel(currentDimension.value)
  })

  const currentFileCategoryName = computed(() => getTeachingMaterialFileCategoryLabel(currentFileCategory.value))

  const scopedMaterials = computed(() => {
    let result = materials.value

    if (currentDimension.value) {
      result = result.filter((item) => item.dimensionCode === currentDimension.value)
    }

    if (showFavoritesOnly.value) {
      result = result.filter((item) => item.isFavorite)
    }

    return result
  })

  const fileCategoryCounts = computed<Record<TeachingMaterialFileCategoryCode, number>>(() => {
    const counts: Record<TeachingMaterialFileCategoryCode, number> = {
      all: scopedMaterials.value.length,
      video: 0,
      image: 0,
      document: 0,
      audio: 0,
      archive: 0,
      other: 0,
    }

    scopedMaterials.value.forEach((item) => {
      counts[resolveTeachingMaterialFileCategory(item.fileType)] += 1
    })

    return counts
  })

  const filteredMaterials = computed(() => {
    let result = scopedMaterials.value

    if (currentFileCategory.value !== 'all') {
      result = result.filter((item) => resolveTeachingMaterialFileCategory(item.fileType) === currentFileCategory.value)
    }

    if (searchKeyword.value) {
      const keyword = searchKeyword.value.trim().toLowerCase()
      result = result.filter((item) => {
        const tagText = item.tags.join(' ').toLowerCase()
        return item.title.toLowerCase().includes(keyword)
          || item.fileName.toLowerCase().includes(keyword)
          || tagText.includes(keyword)
          || (item.description || '').toLowerCase().includes(keyword)
      })
    }

    return result
  })

  async function loadMaterials() {
    isLoading.value = true
    error.value = null

    try {
      const moduleCodes = Array.from(new Set(dimensions.value.map((code) => getTeachingMaterialModuleCode(code))))
      if (moduleCodes.length === 0) {
        materials.value = []
        return
      }

      materials.value = api.getMaterials({
        userId: authStore.user?.id,
        allowedModuleCodes: moduleCodes,
      })
    } catch (loadError) {
      console.error('[TeachingMaterialsStore] loadMaterials failed:', loadError)
      error.value = '加载教学资料失败'
    } finally {
      isLoading.value = false
    }
  }

  async function addMaterialRecord(input: TeachingMaterialCreateInput): Promise<boolean> {
    try {
      const id = api.addMaterial(input)
      if (!id) {
        return false
      }

      await loadMaterials()
      return true
    } catch (addError) {
      console.error('[TeachingMaterialsStore] addMaterialRecord failed:', addError)
      error.value = '保存教学资料失败'
      return false
    }
  }

  async function deleteMaterial(id: number): Promise<boolean> {
    const material = materials.value.find((item) => item.id === id)

    try {
      const success = api.deleteMaterial(id)
      if (!success) {
        return false
      }

      materials.value = materials.value.filter((item) => item.id !== id)

      if (material) {
        await teachingMaterialFileManager.deleteManagedFile(material.filePath)
      }

      return true
    } catch (deleteError) {
      console.error('[TeachingMaterialsStore] deleteMaterial failed:', deleteError)
      error.value = '删除教学资料失败'
      return false
    }
  }

  async function toggleFavorite(materialId: number): Promise<boolean> {
    try {
      const userId = authStore.user?.id || 0
      const isFavorite = api.toggleFavorite(userId, materialId)
      const material = materials.value.find((item) => item.id === materialId)
      if (material) {
        material.isFavorite = isFavorite
      }
      return isFavorite
    } catch (favoriteError) {
      console.error('[TeachingMaterialsStore] toggleFavorite failed:', favoriteError)
      error.value = '收藏操作失败'
      return false
    }
  }

  async function openMaterial(material: TeachingMaterialItem): Promise<boolean> {
    try {
      return await teachingMaterialFileManager.openManagedFile(material.filePath)
    } catch (openError) {
      console.error('[TeachingMaterialsStore] openMaterial failed:', openError)
      error.value = '打开资料失败'
      return false
    }
  }

  function setDimension(dimensionCode: TeachingMaterialDimensionCode | null) {
    currentDimension.value = dimensionCode
    currentFileCategory.value = 'all'
    showFavoritesOnly.value = false
  }

  function setFileCategory(fileCategory: TeachingMaterialFileCategoryCode) {
    currentFileCategory.value = fileCategory
  }

  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword
    showFavoritesOnly.value = false
  }

  function toggleFavoritesView() {
    showFavoritesOnly.value = !showFavoritesOnly.value
    currentDimension.value = null
    currentFileCategory.value = 'all'
    searchKeyword.value = ''
  }

  function clearError() {
    error.value = null
  }

  function init() {
    loadMaterials()
  }

  return {
    materials,
    currentDimension,
    currentDimensionName,
    currentFileCategory,
    currentFileCategoryName,
    dimensions,
    fileCategoryCounts,
    searchKeyword,
    isLoading,
    error,
    showFavoritesOnly,
    filteredMaterials,
    loadMaterials,
    addMaterialRecord,
    deleteMaterial,
    toggleFavorite,
    openMaterial,
    setDimension,
    setFileCategory,
    setSearchKeyword,
    toggleFavoritesView,
    clearError,
    init,
  }
})
