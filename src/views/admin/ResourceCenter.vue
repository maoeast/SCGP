<template>
  <div class="page-container scgp-admin-page resource-center-page">
    <div class="page-header resource-center-header">
      <div class="header-left">
        <h1>资源管理</h1>
        <p class="subtitle">统一管理训练资源与教学资料，在同一入口完成浏览、维护、导入与素材目录管理。</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="resource-tabs scgp-underlined-tabs" @tab-change="handleTabChange">
      <el-tab-pane label="训练资源" name="training">
        <template #label>
          <span class="tab-label scgp-tab-label">
            <el-icon><Box /></el-icon>
            <span>训练资源</span>
          </span>
        </template>
      </el-tab-pane>

      <el-tab-pane label="教学资料" name="teaching">
        <template #label>
          <span class="tab-label scgp-tab-label">
            <el-icon><FolderOpened /></el-icon>
            <span>教学资料</span>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <div class="resource-center-body scgp-page-panel scgp-page-panel--flush">
      <TrainingResources v-if="activeTab === 'training'" :read-only="!isAdmin" />
      <TeachingMaterials v-if="activeTab === 'teaching'" :read-only="!isAdmin" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Box, FolderOpened } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import TrainingResources from '@/views/resource-center/TrainingResources.vue'
import TeachingMaterials from '@/views/resource-center/TeachingMaterials.vue'

type ResourceCenterTab = 'training' | 'teaching'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<ResourceCenterTab>('training')

const isAdmin = computed(() => authStore.isAdmin)

function handleTabChange(tabName: string) {
  if (!['training', 'teaching'].includes(tabName)) {
    return
  }

  router.replace({
    query: { ...route.query, tab: tabName },
  })
}

function restoreTabFromUrl() {
  const tabParam = route.query.tab as string
  if (tabParam === 'training' || tabParam === 'teaching') {
    activeTab.value = tabParam
  }
}

onMounted(() => {
  restoreTabFromUrl()
})

watch(() => route.query.tab, (newTab) => {
  if (newTab === 'training' || newTab === 'teaching') {
    activeTab.value = newTab
  }
})
</script>

<style scoped>
.resource-center-page {
  gap: 14px;
  padding-top: 18px;
}

.resource-center-header {
  margin-bottom: 0;
}

.resource-center-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.resource-center-body > * {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .resource-center-page {
    gap: 12px;
    padding: 14px 16px 16px;
  }
}
</style>
