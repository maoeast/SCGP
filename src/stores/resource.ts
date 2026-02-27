import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ResourceAPI } from '@/database/api';
import { resourceCategories } from '@/database/resource-data';
import { useAuthStore } from './auth';

export const useResourceStore = defineStore('resource', () => {
  // 状态
  const resources = ref<any[]>([]);
  const currentCategory = ref<number | null>(null);
  const searchKeyword = ref('');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const showFavoritesOnly = ref(false);

  // API实例
  const api = new ResourceAPI();
  const authStore = useAuthStore();

  // 计算属性
  const filteredResources = computed(() => {
    let filtered = resources.value;

    // 按分类筛选
    if (currentCategory.value !== null) {
      filtered = filtered.filter(r => r.category === currentCategory.value);
    }

    // 按搜索关键词筛选
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(keyword) ||
        (r.tags && r.tags.toLowerCase().includes(keyword)) ||
        (r.description && r.description.toLowerCase().includes(keyword))
      );
    }

    // 只显示收藏
    if (showFavoritesOnly.value) {
      filtered = filtered.filter(r => r.is_favorite);
    }

    return filtered;
  });

  const categories = computed(() => resourceCategories);

  const currentCategoryName = computed(() => {
    if (currentCategory.value === null) return '全部资源';
    const category = resourceCategories.find(c => c.id === currentCategory.value);
    return category ? category.name : '未知分类';
  });

  // 操作方法
  async function loadResources() {
    isLoading.value = true;
    error.value = null;
    try {
      if (showFavoritesOnly.value) {
        // 加载收藏的资源
        resources.value = api.getFavoriteResources(authStore.user?.id || 0);
      } else {
        // 加载所有资源
        resources.value = api.getAllResources();
      }
    } catch (err) {
      error.value = '加载资源失败';
      console.error('加载资源失败:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function loadResourcesByCategory(categoryId: number) {
    isLoading.value = true;
    error.value = null;
    try {
      resources.value = api.getResourcesByCategory(categoryId);
    } catch (err) {
      error.value = '加载资源失败';
      console.error('加载分类资源失败:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function searchResources(keyword: string) {
    isLoading.value = true;
    error.value = null;
    try {
      resources.value = api.searchResources(keyword);
    } catch (err) {
      error.value = '搜索失败';
      console.error('搜索资源失败:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function addResource(resource: {
    title: string;
    type: string;
    category: number;
    path: string;
    size_kb?: number;
    tags?: string;
    description?: string;
  }) {
    try {
      const id = api.addResource(resource);
      if (id > 0) {
        // 添加到本地状态
        resources.value.unshift({
          id,
          ...resource,
          is_favorite: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return true;
      }
      return false;
    } catch (err) {
      error.value = '添加资源失败';
      console.error('添加资源失败:', err);
      return false;
    }
  }

  async function updateResource(id: number, updates: any) {
    try {
      const success = api.updateResource(id, updates);
      if (success) {
        // 更新本地状态
        const index = resources.value.findIndex(r => r.id === id);
        if (index !== -1) {
          resources.value[index] = {
            ...resources.value[index],
            ...updates,
            updated_at: new Date().toISOString()
          };
        }
      }
      return success;
    } catch (err) {
      error.value = '更新资源失败';
      console.error('更新资源失败:', err);
      return false;
    }
  }

  async function deleteResource(id: number) {
    try {
      const success = api.deleteResource(id);
      if (success) {
        // 从本地状态中移除
        resources.value = resources.value.filter(r => r.id !== id);
      }
      return success;
    } catch (err) {
      error.value = '删除资源失败';
      console.error('删除资源失败:', err);
      return false;
    }
  }

  async function toggleFavorite(resourceId: number) {
    try {
      const isFavorited = api.toggleFavorite(authStore.user?.id || 0, resourceId);

      // 更新本地状态
      const resource = resources.value.find(r => r.id === resourceId);
      if (resource) {
        resource.is_favorite = isFavorited ? 1 : 0;
      }

      return isFavorited;
    } catch (err) {
      error.value = '操作失败';
      console.error('切换收藏状态失败:', err);
      return false;
    }
  }

  function setCategory(categoryId: number | null) {
    currentCategory.value = categoryId;
    showFavoritesOnly.value = false;
    // 不再重新加载资源，只更新当前分类状态
    // 筛选逻辑由 filteredResources 计算属性处理
  }

  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword;
    showFavoritesOnly.value = false;
    // 不再重新加载资源，只更新搜索关键词状态
    // 筛选逻辑由 filteredResources 计算属性处理
  }

  function toggleFavoritesView() {
    showFavoritesOnly.value = !showFavoritesOnly.value;
    currentCategory.value = null;
    searchKeyword.value = '';
    // 不再重新加载资源，只更新收藏筛选状态
    // 筛选逻辑由 filteredResources 计算属性处理
  }

  async function openResource(resource: any) {
    // 在Electron环境中，使用shell打开外部文件
    if (window.electronAPI && window.electronAPI.openFile) {
      // 需要获取完整的文件路径
      const { resourceManager } = await import('@/utils/resource-manager');
      const fullPath = `${resourceManager.getResourcesPath()}/${resource.path}`;

      const result = await window.electronAPI.openFile(fullPath);

      // 检查打开结果
      if (!result.success) {
        // 根据文件类型给出友好的错误提示
        const fileType = resource.type.toLowerCase();
        let softwareHint = '';

        switch (fileType) {
          case 'pdf':
            softwareHint = '请安装 PDF 阅读器（如 Adobe Acrobat Reader 或福昕阅读器）';
            break;
          case 'doc':
          case 'docx':
            softwareHint = '请安装 Microsoft Word 或 WPS Office';
            break;
          case 'xls':
          case 'xlsx':
            softwareHint = '请安装 Microsoft Excel 或 WPS Office';
            break;
          case 'ppt':
          case 'pptx':
            softwareHint = '请安装 Microsoft PowerPoint 或 WPS Office';
            break;
          case 'mp4':
          case 'avi':
          case 'mov':
          case 'wmv':
            softwareHint = '请安装视频播放器（如 VLC Media Player 或 Windows Media Player）';
            break;
          case 'mp3':
          case 'wav':
          case 'flac':
            softwareHint = '请安装音频播放器';
            break;
          default:
            softwareHint = '请安装相应的软件来打开此文件';
        }

        // 显示错误提示
        const errorMessage = result.error || '系统无法打开此文件';
        error.value = `打开文件失败：${errorMessage}\n\n${softwareHint}`;

        // 10秒后自动清除错误提示
        setTimeout(() => {
          clearError();
        }, 10000);
      }
    } else {
      // 在浏览器环境中，获取文件URL并下载
      const { resourceManager } = await import('@/utils/resource-manager');
      const fileUrl = await resourceManager.getFileUrl(resource.path);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${resource.title}.${resource.type}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function clearError() {
    error.value = null;
  }

  // 初始化
  function init() {
    loadResources();
  }

  return {
    // 状态
    resources,
    currentCategory,
    searchKeyword,
    isLoading,
    error,
    showFavoritesOnly,

    // 计算属性
    filteredResources,
    categories,
    currentCategoryName,

    // 方法
    loadResources,
    loadResourcesByCategory,
    searchResources,
    addResource,
    updateResource,
    deleteResource,
    toggleFavorite,
    setCategory,
    setSearchKeyword,
    toggleFavoritesView,
    openResource,
    clearError,
    init
  };
});