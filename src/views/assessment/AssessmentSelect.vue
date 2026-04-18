<template>
  <div class="page-container scgp-admin-page">
    <div class="page-header">
      <div class="header-left">
        <h1>评估中心</h1>
        <p class="subtitle">选择合适的量表进行标准化评估</p>
      </div>
    </div>

    <div class="main-content scgp-page-panel assessment-select-panel">
      <el-tabs v-model="activeTab" class="assessment-tabs">
        <el-tab-pane
          v-for="tab in tabPanels"
          :key="tab.id"
          :label="tab.label"
          :name="tab.id"
        >
          <div class="tab-panel">
            <div v-if="tab.scales.length > 0" class="scale-cards">
              <el-card
                v-for="scale in tab.scales"
                :key="`${tab.id}-${scale.code}`"
                class="scale-card"
                shadow="hover"
                @click="selectScale(scale.code)"
              >
                <div class="scale-icon" :class="scale.iconClass">
                  <el-icon size="60">
                    <component :is="scale.icon" />
                  </el-icon>
                </div>
                <h3 class="scale-title">{{ scale.title }}</h3>
                <p class="scale-subtitle">{{ scale.subtitle }}</p>
                <div class="scale-info">
                  <ul>
                    <li>适用年龄：{{ scale.ageRange }}</li>
                    <li>题目数量：{{ scale.questionCount }}</li>
                    <li>{{ scale.dimensions }}</li>
                    <li>评估时间：{{ scale.timeEstimate }}</li>
                  </ul>
                </div>
                <el-button
                  :type="scale.buttonType"
                  size="large"
                  class="scale-btn"
                  @click.stop="selectScale(scale.code)"
                >
                  开始评估
                </el-button>
              </el-card>
            </div>

            <div v-else class="tab-empty scgp-empty-panel">
              <el-empty
                class="scgp-empty-state"
                description="该分类下暂无可用量表或相关模块未授权"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <el-card class="notice-card scgp-page-panel" shadow="never">
        <template #header>
          <div class="notice-header">
            <el-icon><InfoFilled /></el-icon>
            <span>评估说明</span>
          </div>
        </template>
        <div class="notice-content">
          <h4>注意事项：</h4>
          <ol>
            <li>请确保评估环境安静、舒适，避免干扰</li>
            <li>评估前请准备好学生的基本信息（姓名、年龄等）</li>
            <li>根据学生的实际情况如实作答，不要主观臆断</li>
            <li>如果需要中途退出，系统会自动保存评估进度</li>
            <li>评估完成后，系统将自动生成评估报告</li>
          </ol>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { InfoFilled } from '@element-plus/icons-vue'
import {
  ASSESSMENT_TABS,
  getDefaultAssessmentTab,
  getVisibleAssessmentScalesForTab,
  type AssessmentScaleCode,
} from '@/features/assessment/assessment-scale-catalog'
import { useAuthStore } from '@/stores/auth'
import type { TrainingEntryCode } from '@/utils/training-entry'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<TrainingEntryCode>(
  getDefaultAssessmentTab((moduleCode) => authStore.hasModuleAccess(moduleCode))
)

const tabPanels = computed(() =>
  ASSESSMENT_TABS.map((tab) => ({
    ...tab,
    scales: getVisibleAssessmentScalesForTab(tab.id, (moduleCode) => authStore.hasModuleAccess(moduleCode)),
  }))
)

const selectScale = (scaleType: AssessmentScaleCode) => {
  router.push({
    path: '/assessment/select-student',
    query: { scale: scaleType },
  })
}
</script>

<style scoped>
.assessment-select-panel {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.assessment-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.assessment-tabs :deep(.el-tabs__nav-wrap::after) {
  background: rgba(214, 224, 236, 0.9);
}

.assessment-tabs :deep(.el-tabs__item) {
  height: auto;
  padding: 14px 18px;
  font-weight: 600;
}

.tab-panel {
  padding-top: 24px;
}

.scale-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
}

.scale-card {
  cursor: pointer;
  border: 1px solid #e6ebf2;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 255, 0.98) 100%);
  box-shadow: 0 16px 34px rgba(143, 169, 204, 0.12);
  transition: transform 0.3s, box-shadow 0.3s;
  text-align: center;
  padding: 30px;
}

.scale-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 22px 42px rgba(143, 169, 204, 0.18);
}

.scale-icon {
  margin: 0 auto 20px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sm-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.weefim-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.csirs-icon {
  background: linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%);
  color: white;
}

.conners-psq-icon {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: white;
}

.conners-trs-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.sdq-icon {
  background: linear-gradient(135deg, #f09329 0%, #ff6b6b 100%);
  color: white;
}

.srs2-icon {
  background: linear-gradient(135deg, #5b86e5 0%, #36d1dc 100%);
  color: white;
}

.cbcl-icon {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.dev-behavior-icon {
  background: linear-gradient(135deg, #ff9966 0%, #ff5e62 100%);
  color: white;
}

.tgmd-icon {
  background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
  color: white;
}

.gmfm-icon {
  background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
  color: white;
}

.fmda-icon {
  background: linear-gradient(135deg, #654ea3 0%, #eaafc8 100%);
  color: white;
}

.scale-title {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #303133;
}

.scale-subtitle {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #909399;
}

.scale-info {
  text-align: left;
  margin-bottom: 30px;
}

.scale-info ul {
  list-style: none;
  padding: 0;
}

.scale-info li {
  padding: 8px 0;
  color: #606266;
  position: relative;
  padding-left: 20px;
}

.scale-info li::before {
  content: '•';
  color: #409eff;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.scale-btn {
  width: 200px;
  height: 50px;
  font-size: 18px;
}

.tab-empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  border: 1px dashed rgba(196, 208, 223, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 249, 253, 0.96) 100%);
}

.notice-card {
  border-radius: 22px;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #409eff;
}

.notice-content h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

.notice-content ol {
  padding-left: 20px;
}

.notice-content li {
  padding: 5px 0;
  color: #606266;
}

@media (max-width: 768px) {
  .tab-panel {
    padding-top: 20px;
  }

  .scale-cards {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .scale-card {
    padding: 22px 18px;
  }

  .scale-icon {
    width: 96px;
    height: 96px;
  }

  .scale-title {
    font-size: 20px;
  }

  .scale-subtitle {
    font-size: 16px;
  }

  .scale-btn {
    width: 100%;
  }
}
</style>
