<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>资源中心</h1>
        <p class="subtitle">统一管理系统康复资源与教师教学资料</p>
      </div>
      <div class="header-right">
        <el-tag :type="isAdmin ? 'danger' : 'info'" size="small">
          {{ isAdmin ? '管理员模式' : '只读模式' }}
        </el-tag>
      </div>
    </div>

    <!-- Tab 切换区 -->
    <el-tabs v-model="activeTab" class="resource-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="训练资源" name="training">
        <template #label>
          <span class="tab-label">
            <el-icon><Box /></el-icon>
            训练资源
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane label="教学资料" name="teaching">
        <template #label>
          <span class="tab-label">
            <el-icon><FolderOpened /></el-icon>
            教学资料
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 内容区 -->
    <div class="tab-content">
      <TrainingResources
        v-if="activeTab === 'training'"
        :read-only="!isAdmin"
        ref="trainingResourcesRef"
      />
      <TeachingMaterials
        v-if="activeTab === 'teaching'"
        :read-only="!isAdmin"
        ref="teachingMaterialsRef"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Box, FolderOpened } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import TrainingResources from '@/views/resource-center/TrainingResources.vue'
import TeachingMaterials from '@/views/resource-center/TeachingMaterials.vue'

// ========== 路由与状态 ==========
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// ========== 响应式状态 ==========
const activeTab = ref('training')
const trainingResourcesRef = ref()
const teachingMaterialsRef = ref()

// ========== 计算属性 ==========

// 判断是否为管理员
const isAdmin = computed(() => {
  return authStore.isAdmin
})

// ========== 方法 ==========

// Tab 切换处理
function handleTabChange(tabName: string) {
  // 更新 URL 参数，但不触发导航
  router.replace({
    query: { ...route.query, tab: tabName }
  })
}

// 从 URL 恢复 Tab 状态
function restoreTabFromUrl() {
  const tabParam = route.query.tab as string
  if (tabParam && ['training', 'teaching'].includes(tabParam)) {
    activeTab.value = tabParam
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  restoreTabFromUrl()
})

// 监听路由变化
watch(() => route.query.tab, (newTab) => {
  if (newTab && ['training', 'teaching'].includes(newTab as string)) {
    activeTab.value = newTab as string
  }
})
</script>

<style scoped>
.header-right .el-tag {
  align-self: flex-end;
}

/* Tab 样式 */
.resource-tabs {
  background: white;
  padding: 0 20px;
  border-bottom: 1px solid #ebeef5;
}

.resource-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.resource-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.resource-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  padding: 0 24px;
  height: 48px;
  line-height: 48px;
}

.resource-tabs :deep(.el-tabs__item.is-active) {
  font-weight: 600;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 内容区 */
.tab-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 确保子组件能正确填充 */
.tab-content > * {
  flex: 1;
  overflow: hidden;
}
</style>
