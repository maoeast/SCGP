<!--
  ⚠️ DEPRECATED: 此文件已废弃

  该组件已被重构并迁移至新的资源中心架构：
  - 主入口: src/views/admin/ResourceCenter.vue
  - 教学资料 Tab: src/views/resource-center/TeachingMaterials.vue
  - 训练资源 Tab: src/views/resource-center/TrainingResources.vue

  路由已重定向: /resources -> /resource-center

  保留此文件仅用于向后兼容，请勿再使用。
  重构日期: 2026-02-22
-->
<template>
  <div class="resources-page">
    <!-- 顶部工具栏 -->
    <div class="page-header">
      <h1>资料库</h1>
      <div class="header-actions">
        <div class="search-box">
          <i class="fas fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="搜索资源..."
            v-model="resourceStore.searchKeyword"
            @input="handleSearch"
          />
        </div>
        <button
          class="btn btn-primary"
          @click="showUploadDialog = true"
        >
          <i class="fas fa-plus"></i>
          上传资源
        </button>
        <button
          class="btn btn-secondary"
          @click="showBatchImportDialog = true"
        >
          <i class="fas fa-file-import"></i>
          批量导入
        </button>
        <button
          class="btn"
          :class="{ 'active': resourceStore.showFavoritesOnly }"
          @click="resourceStore.toggleFavoritesView"
        >
          <i class="fas fa-star"></i>
          {{ resourceStore.showFavoritesOnly ? '全部资源' : '我的收藏' }}
        </button>
      </div>
    </div>

    <div class="resources-content">
      <!-- 侧边栏分类 -->
      <div class="sidebar">
        <h3>资源分类</h3>
        <ul class="category-list">
          <li
            class="category-item"
            :class="{ active: resourceStore.currentCategory === null }"
            @click="selectCategory(null)"
          >
            <i class="fas fa-folder"></i>
            <span>全部资源</span>
            <span class="count">({{ resourceStore.resources.length }})</span>
          </li>
          <li
            v-for="category in resourceStore.categories"
            :key="category.id"
            class="category-item"
            :class="{ active: resourceStore.currentCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <i
              :class="`fas fa-${category.icon}`"
              :style="{ color: category.color }"
            ></i>
            <span>{{ category.name }}</span>
            <span class="count">
              ({{ getResourceCountByCategory(category.id) }})
            </span>
          </li>
        </ul>
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 分类标题 -->
        <div class="content-header">
          <h2>{{ resourceStore.currentCategoryName }}</h2>
          <p v-if="resourceStore.currentCategory">
            {{ getCategoryDescription(resourceStore.currentCategory) }}
          </p>
        </div>

        <!-- 加载状态 -->
        <div v-if="resourceStore.isLoading" class="loading-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>加载中...</p>
        </div>

        <!-- 错误提示 -->
        <div v-else-if="resourceStore.error" class="error-state">
          <i class="fas fa-circle-exclamation"></i>
          <p>{{ resourceStore.error }}</p>
          <button @click="resourceStore.clearError()" class="btn btn-secondary">
            关闭
          </button>
        </div>

        <!-- 资源列表 -->
        <div v-else-if="filteredResources.length > 0" class="resource-list">
          <div
            v-for="resource in filteredResources"
            :key="resource.id"
            class="resource-card"
            @click="openResource(resource)"
          >
            <div class="resource-icon">
              <i
                :class="['fas', getFileIcon(resource.type)]"
                :style="{ color: getFileIconColor(resource.type) }"
              ></i>
            </div>
            <div class="resource-info">
              <h4>{{ resource.title }}</h4>
              <p class="description">{{ resource.description || '暂无描述' }}</p>
              <div class="resource-meta">
                <span class="type">{{ resource.type.toUpperCase() }}</span>
                <span class="size">{{ formatFileSize(resource.size_kb) }}</span>
                <span class="date">{{ formatDate(resource.updated_at) }}</span>
              </div>
              <div v-if="resource.tags" class="tags">
                <span
                  v-for="tag in resource.tags.split(',')"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="resource-actions" @click.stop>
              <button
                class="btn-icon"
                :class="{ active: resource.is_favorite }"
                @click="toggleFavorite(resource)"
                :title="resource.is_favorite ? '取消收藏' : '收藏'"
              >
                <i class="fas fa-star" :style="{ color: resource.is_favorite ? '#ffc107' : '#ffca28' }"></i>
              </button>
              <button
                class="btn-icon"
                @click="openResource(resource)"
                title="预览"
              >
                <i class="fas fa-eye" style="color: #2196F3"></i>
              </button>
              <button
                class="btn-icon"
                @click="showResourceDetail(resource)"
                title="详情"
              >
                <i class="fas fa-circle-info" style="color: #4CAF50"></i>
              </button>
              <button
                class="btn-icon btn-delete"
                @click="deleteResource(resource)"
                title="删除"
              >
                <i class="fas fa-trash-alt" style="color: #f56c6c"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <i class="fas fa-folder-open"></i>
          <h3>暂无资源</h3>
          <p>该分类下还没有资源，点击"上传资源"添加第一个资源</p>
          <button
            class="btn btn-primary"
            @click="showUploadDialog = true"
          >
            上传资源
          </button>
        </div>
      </div>
    </div>

    <!-- 上传资源对话框 -->
    <div v-if="showUploadDialog" class="modal-overlay" @click.self="showUploadDialog = false">
      <div class="modal">
        <div class="modal-header">
          <h3>上传资源</h3>
          <button class="btn-icon" @click="showUploadDialog = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleUpload">
            <div class="form-group">
              <label>资源标题 *</label>
              <input
                type="text"
                v-model="uploadForm.title"
                required
                placeholder="请输入资源标题"
              />
            </div>
            <div class="form-group">
              <label>资源分类 *</label>
              <select v-model="uploadForm.category" required>
                <option value="">请选择分类</option>
                <option
                  v-for="category in resourceStore.categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>资源文件 *</label>
              <input
                type="file"
                @change="handleFileSelect"
                required
              />
              <p v-if="selectedFile" class="file-info">
                已选择: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size / 1024) }})
              </p>
            </div>
            <div class="form-group">
              <label>标签</label>
              <input
                type="text"
                v-model="uploadForm.tags"
                placeholder="多个标签用逗号分隔"
              />
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea
                v-model="uploadForm.description"
                rows="3"
                placeholder="请输入资源描述"
              ></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button
            class="btn"
            @click="showUploadDialog = false"
          >
            取消
          </button>
          <button
            class="btn btn-primary"
            @click="handleUpload"
            :disabled="!canUpload"
          >
            上传
          </button>
        </div>
      </div>
    </div>

    <!-- 批量导入对话框 -->
    <div v-if="showBatchImportDialog" class="modal-overlay" @click.self="showBatchImportDialog = false">
      <div class="modal batch-import-modal">
        <div class="modal-header">
          <h3>批量导入资源</h3>
          <button class="btn-icon" @click="showBatchImportDialog = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="batch-import-content">
            <div class="import-instructions mb-4">
              <h4>导入说明</h4>
              <ol>
                <li>请下载CSV模板文件，按照格式填写资源信息</li>
                <li>将资源文件放置在 assets/resources/ 对应的文件夹中</li>
                <li>上传填写好的CSV文件进行批量导入</li>
              </ol>
            </div>

            <div class="batch-import-actions mb-4">
              <button class="btn btn-primary" @click="downloadTemplate">
                <i class="fas fa-arrow-down-to-bracket mr-2"></i>下载CSV模板
              </button>
              <button class="btn btn-secondary" @click="importSampleData">
                <i class="fas fa-magic mr-2"></i>导入示例数据
              </button>
            </div>

            <div class="form-group">
              <label>CSV文件</label>
              <input
                type="file"
                accept=".csv"
                @change="handleCsvChange"
                ref="csvInput"
              />
              <p v-if="csvFile" class="file-info">
                已选择: {{ csvFile.name }} ({{ formatFileSize(csvFile.size / 1024) }})
              </p>
            </div>

            <!-- 导入结果显示 -->
            <div v-if="batchImportResult" class="import-result mt-4">
              <h4>导入结果</h4>
              <div class="result-summary" :class="{ 'has-errors': batchImportResult.errors.length > 0 }">
                <p><strong>成功导入：</strong>{{ batchImportResult.success }} 个资源</p>
                <p><strong>导入失败：</strong>{{ batchImportResult.failed }} 个资源</p>
              </div>
              <div v-if="batchImportResult.errors.length > 0" class="error-details">
                <el-collapse>
                  <el-collapse-item title="错误详情" name="errors">
                    <ul class="error-list">
                      <li v-for="(error, index) in batchImportResult.errors.slice(0, 20)" :key="index">
                        {{ error }}
                      </li>
                      <li v-if="batchImportResult.errors.length > 20">
                        ... 还有 {{ batchImportResult.errors.length - 20 }} 个错误
                      </li>
                    </ul>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showBatchImportDialog = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!csvFile || isImporting"
            @click="handleBatchImport"
          >
            <i class="fas fa-arrow-up-from-bracket mr-2"></i>{{ isImporting ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 资源详情对话框 -->
    <div v-if="showDetailDialog && selectedResource" class="modal-overlay" @click.self="showDetailDialog = false">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h3>资源详情</h3>
          <button class="btn-icon" @click="showDetailDialog = false">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-content">
            <div class="detail-icon">
              <i
                :class="['fas', getFileIcon(selectedResource.type)]"
                :style="{ color: getFileIconColor(selectedResource.type) }"
              ></i>
            </div>
            <div class="detail-info">
              <h4>{{ selectedResource.title }}</h4>
              <p class="description">{{ selectedResource.description || '暂无描述' }}</p>
              <div class="detail-meta">
                <div class="meta-item">
                  <label>文件类型:</label>
                  <span>{{ selectedResource.type.toUpperCase() }}</span>
                </div>
                <div class="meta-item">
                  <label>文件大小:</label>
                  <span>{{ formatFileSize(selectedResource.size_kb) }}</span>
                </div>
                <div class="meta-item">
                  <label>所属分类:</label>
                  <span>{{ getCategoryName(selectedResource.category) }}</span>
                </div>
                <div class="meta-item">
                  <label>上传时间:</label>
                  <span>{{ formatDate(selectedResource.created_at) }}</span>
                </div>
                <div class="meta-item">
                  <label>更新时间:</label>
                  <span>{{ formatDate(selectedResource.updated_at) }}</span>
                </div>
                <div v-if="selectedResource.tags" class="meta-item">
                  <label>标签:</label>
                  <div class="tags">
                    <span
                      v-for="tag in selectedResource.tags.split(',')"
                      :key="tag"
                      class="tag"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn"
            @click="showDetailDialog = false"
          >
            关闭
          </button>
          <button
            class="btn btn-primary"
            @click="openResource(selectedResource)"
          >
            打开资源
          </button>
        </div>
      </div>
    </div>

    <!-- 文件预览对话框 -->
    <FilePreview
      :show="showPreviewDialog"
      :file="previewFile"
      @close="closePreview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useResourceStore } from '@/stores/resource';
import { getFileIcon, getFileIconColor, formatFileSize } from '@/database/resource-data';
import FilePreview from '@/components/FilePreview.vue';
import { resourceImporter } from '@/utils/resource-importer';

const resourceStore = useResourceStore();

// 状态
const showUploadDialog = ref(false);
const showDetailDialog = ref(false);
const selectedResource = ref<any>(null);
const selectedFile = ref<File | null>(null);
const showPreviewDialog = ref(false);
const previewFile = ref<any>(null);
const showBatchImportDialog = ref(false);
const batchImportResult = ref<{ success: number; failed: number; errors: string[] } | null>(null);
const isImporting = ref(false);
const csvFile = ref<File | null>(null);

// 上传表单
const uploadForm = ref({
  title: '',
  category: 0,
  tags: '',
  description: ''
});

// 计算属性
const filteredResources = computed(() => resourceStore.filteredResources);

const canUpload = computed(() => {
  return uploadForm.value.title &&
         uploadForm.value.category !== undefined &&
         uploadForm.value.category !== null &&
         selectedFile.value;
});

// 方法
function handleSearch(e: Event) {
  const target = e.target as HTMLInputElement;
  resourceStore.setSearchKeyword(target.value);
}

function selectCategory(categoryId: number | null) {
  resourceStore.setCategory(categoryId);
}

function getResourceCountByCategory(categoryId: number): number {
  return resourceStore.resources.filter(r => r.category === categoryId).length;
}

function getCategoryDescription(categoryId: number): string {
  const category = resourceStore.categories.find(c => c.id === categoryId);
  return category ? category.description : '';
}

function getCategoryName(categoryId: number): string {
  const category = resourceStore.categories.find(c => c.id === categoryId);
  return category ? category.name : '未知分类';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
    // 自动填充标题
    if (!uploadForm.value.title) {
      uploadForm.value.title = selectedFile.value.name.replace(/\.[^/.]+$/, '');
    }
  }
}

async function handleUpload() {
  console.log('[Resources.vue] handleUpload 被调用')
  console.log('[Resources.vue] canUpload:', canUpload.value)
  console.log('[Resources.vue] selectedFile:', selectedFile.value)
  console.log('[Resources.vue] uploadForm:', uploadForm.value)

  if (!canUpload.value) {
    alert('请填写完整信息并选择文件');
    return;
  }

  try {
    console.log('[Resources.vue] 开始动态导入 resourceManager...')
    // 动态导入 resourceManager
    const managerModule = await import('@/utils/resource-manager');
    const { resourceManager } = managerModule;
    console.log('[Resources.vue] resourceManager 导入成功')

    // 保存文件到本地文件系统
    console.log('[Resources.vue] 开始调用 saveFile...')
    const filePath = await resourceManager.saveFile(
      selectedFile.value!,
      uploadForm.value.category
    );
    console.log('[Resources.vue] saveFile 返回:', filePath)

    // 保存资源信息到数据库
    const resource = {
      title: uploadForm.value.title,
      type: selectedFile.value!.name.split('.').pop() || 'unknown',
      category: uploadForm.value.category,
      path: filePath,
      size_kb: Math.round(selectedFile.value!.size / 1024),
      tags: uploadForm.value.tags,
      description: uploadForm.value.description
    };

    console.log('[Resources.vue] 准备保存到数据库:', resource)
    const success = await resourceStore.addResource(resource);
    console.log('[Resources.vue] 数据库保存结果:', success)

    if (success) {
      // 重置表单
      uploadForm.value = {
        title: '',
        category: 0,
        tags: '',
        description: ''
      };
      selectedFile.value = null;
      showUploadDialog.value = false;

      // 显示成功提示
      alert('资源上传成功！');
    } else {
      console.error('[Resources.vue] 数据库保存失败')
      alert('资源保存失败，请重试！');
    }
  } catch (error) {
    console.error('[Resources.vue] 上传失败:', error);
    alert('上传失败，请重试！\n错误: ' + error);
  }
}

// 批量导入相关函数
function handleCsvChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    csvFile.value = target.files[0];
    batchImportResult.value = null;
  }
}

function handleCsvRemove() {
  csvFile.value = null;
  batchImportResult.value = null;
}

async function downloadTemplate() {
  try {
    const templatePath = 'assets/resources/resource-import-template.csv';

    if (window.electronAPI && window.electronAPI.readFile) {
      const content = await window.electronAPI.readFile(templatePath);
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resource-import-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // 开发环境，创建示例CSV
      const csvContent = `文件路径,分类ID,标题,标签,描述,大小KB
docs/S-M量表评估指南.pdf,1,S-M量表评估指南,S-M,评估,S-M量表详细评估指南
docs/WeeFIM评估手册.pdf,1,WeeFIM评估手册,WeeFIM,功能独立性,WeeFIM量表的详细评估方法
docs/生活自理训练教案模板.docx,1,生活自理训练教案模板,教案,生活自理,标准化的生活自理训练课程教案模板
videos/洗手七步法示范.mp4,2,洗手七步法示范,洗手,卫生示范,标准洗手七步法完整示范视频
videos/刷牙技能示范.mp4,2,刷牙技能示范,刷牙,口腔护理,正确的刷牙方法和步骤示范
videos/穿衣技能训练.mp4,2,穿衣技能训练,穿衣,自理能力,穿脱衣服的技能训练示范
ppt/个人卫生习惯培养.pptx,3,个人卫生习惯培养,卫生,习惯,培养学生良好个人卫生习惯的教学课件
ppt/饮食技能训练.pptx,3,饮食技能训练,饮食,技能训练,独立进食能力训练教学课件
ppt/社交技能课程.pptx,3,社交技能课程,社交,技能,学生社交能力培养课程
cases/自闭症儿童评估案例.pdf,4,自闭症儿童评估案例,自闭症,评估案例,自闭症儿童S-M量表评估实例分析
cases/多动症训练方案.docx,4,多动症训练方案,多动症,训练方案,注意力缺陷多动障碍学生的训练计划案例
images/洗手步骤图集.zip,5,洗手步骤图集,洗手,步骤图,洗手各个步骤的详细图解
images/表情识别卡片.jpg,5,表情识别卡片,表情,社交卡片,用于情绪识别训练的表情卡片集
audio/语音提示音库.mp3,6,语音提示音库,语音提示,音频,训练过程中使用的语音提示音合集
audio/背景音乐合集.zip,6,背景音乐合集,背景音乐,放松,适合训练时播放的轻松背景音乐`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resource-import-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('下载模板失败:', error);
    alert('下载模板失败，请重试！');
  }
}

async function importSampleData() {
  try {
    isImporting.value = true;
    batchImportResult.value = await resourceImporter.importSampleTemplate();

    if (batchImportResult.value.success > 0) {
      await resourceStore.loadResources();
    }
  } catch (error) {
    console.error('导入示例数据失败:', error);
    alert('导入示例数据失败，请重试！');
  } finally {
    isImporting.value = false;
  }
}

async function handleBatchImport() {
  if (!csvFile.value) return;

  try {
    isImporting.value = true;
    batchImportResult.value = null;

    // 读取CSV文件内容
    const text = await csvFile.value.text();

    // 执行导入
    const result = await resourceImporter.importFromCSV(text);
    batchImportResult.value = result;

    // 如果有成功导入的资源，刷新资源列表
    if (result.success > 0) {
      await resourceStore.loadResources();
    }

    // 显示导入结果
    const report = resourceImporter.generateImportReport(result);
    console.log(report);

    // 显示友好的提示消息
    if (result.failed === 0) {
      alert(`✅ 导入成功！\n\n成功导入 ${result.success} 条资源记录`);
    } else {
      alert(`⚠️ 导入完成\n\n成功: ${result.success} 条\n失败: ${result.failed} 条\n\n请查看控制台了解详情`);
    }

  } catch (error) {
    console.error('批量导入失败:', error);
    alert('批量导入失败，请检查文件格式是否正确！');
  } finally {
    isImporting.value = false;
  }
}

async function openResource(resource: any) {
  // 检查文件类型，决定是预览还是下载
  const type = resource.type.toLowerCase();
  const previewableTypes = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
    'mp4', 'avi', 'mov', 'wmv', 'webm', 'ogg',
    'mp3', 'wav', 'ogg', 'flac', 'aac'
  ];

  if (previewableTypes.includes(type)) {
    // 可预览的文件类型，打开预览对话框
    previewFile.value = resource;
    showPreviewDialog.value = true;
  } else {
    // 不可预览的文件类型，直接下载或使用系统默认程序打开
    await resourceStore.openResource(resource);
  }
}

function closePreview() {
  showPreviewDialog.value = false;
  previewFile.value = null;
}

function toggleFavorite(resource: any) {
  resourceStore.toggleFavorite(resource.id);
}

function showResourceDetail(resource: any) {
  selectedResource.value = resource;
  showDetailDialog.value = true;
}

function deleteResource(resource: any) {
  if (confirm(`确定要删除资源"${resource.title}"吗？此操作不可恢复。`)) {
    const success = resourceStore.deleteResource(resource.id);
    if (success) {
      alert('资源已删除');
    } else {
      alert('删除失败，请重试');
    }
  }
}

// 生命周期
onMounted(() => {
  resourceStore.init();
});
</script>

<style scoped>
.resources-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 12px;
  color: #999;
}

.search-box input {
  padding: 8px 12px 8px 36px;
  border: 1px solid #ddd;
  border-radius: 20px;
  width: 300px;
  outline: none;
  transition: border-color 0.3s;
}

.search-box input:focus {
  border-color: #42b983;
}

.resources-content {
  display: flex;
  flex: 1;
  gap: 20px;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
}

.sidebar h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 5px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.category-item:hover {
  background: #e9ecef;
}

.category-item.active {
  background: #42b983;
  color: white;
}

.category-item i {
  margin-right: 10px;
  width: 16px;
}

.category-item span {
  flex: 1;
}

.category-item .count {
  font-size: 0.9em;
  opacity: 0.7;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  margin-bottom: 20px;
}

.content-header h2 {
  margin-top: 0;
  margin-bottom: 5px;
  color: #2c3e50;
}

.content-header p {
  margin: 0;
  color: #666;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
}

.loading-state i,
.error-state i {
  font-size: 48px;
  margin-bottom: 15px;
}

.error-state p {
  text-align: center;
  max-width: 500px;
  white-space: pre-line;
  line-height: 1.6;
  color: #e74c3c;
  margin-bottom: 15px;
}

.resource-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  overflow-y: auto;
  padding-right: 10px;
}

.resource-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  gap: 15px;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.resource-icon {
  width: 48px;
  height: 48px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.resource-icon i {
  font-size: 24px;
  color: #42b983;
}

.resource-info {
  flex: 1;
  min-width: 0;
}

.resource-info h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-info .description {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 0.9em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.resource-meta {
  display: flex;
  gap: 15px;
  font-size: 0.85em;
  color: #999;
  margin-bottom: 10px;
}

.tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.resource-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #e0e0e0;
}

.btn-icon.active {
  background: #ffc107;
  color: white;
}

.btn-icon.btn-delete:hover {
  background: #fee;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #999;
}

.empty-state i {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px 0;
}

.empty-state p {
  margin: 0 0 20px 0;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.detail-modal {
  max-width: 700px;
}

.batch-import-modal {
  max-width: 800px;
}

.import-instructions {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #42b983;
}

.import-instructions h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
}

.import-instructions ol {
  margin: 0;
  padding-left: 20px;
}

.import-instructions li {
  margin-bottom: 5px;
}

.batch-import-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.import-result {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
}

.import-result h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
}

.result-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.result-summary.has-errors {
  color: #e6a23c;
}

.result-summary p {
  margin: 0;
}

.error-details {
  margin-top: 10px;
}

.error-list {
  margin: 0;
  padding-left: 20px;
  max-height: 200px;
  overflow-y: auto;
}

.error-list li {
  color: #f56c6c;
  margin-bottom: 5px;
  font-size: 14px;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #42b983;
}

.file-info {
  margin-top: 5px;
  font-size: 0.9em;
  color: #666;
}

.detail-content {
  display: flex;
  gap: 30px;
}

.detail-icon {
  width: 80px;
  height: 80px;
  background: #f0f0f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-icon i {
  font-size: 40px;
  color: #42b983;
}

.detail-info {
  flex: 1;
}

.detail-info h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.detail-info .description {
  margin: 0 0 20px 0;
  color: #666;
  line-height: 1.6;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.meta-item {
  display: flex;
  gap: 10px;
}

.meta-item label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

/* 按钮样式 */
.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:hover {
  background: #f0f0f0;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.btn-primary:hover {
  background: #45a049;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>