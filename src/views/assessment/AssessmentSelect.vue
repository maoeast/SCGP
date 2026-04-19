<template>
  <div class="page-container scgp-admin-page">
    <div class="page-header">
      <div class="header-left">
        <h1>评估中心</h1>
        <p class="subtitle">按分类浏览量表，快速筛出当前最适合的标准化评估入口。</p>
      </div>
    </div>

    <div class="main-content scgp-page-panel assessment-select-panel">
      <section class="assessment-category-panel">
        <div class="scgp-content-toolbar assessment-category-toolbar">
          <div class="scgp-content-toolbar__main">
            <h2 class="scgp-content-toolbar__title">评估分类</h2>
            <p class="scgp-content-toolbar__description">顶部分类块显示当前授权下的可用量表数量，切换后右侧内容保持同一套检索与操作逻辑。</p>
          </div>
          <div class="scgp-content-toolbar__actions">
            <span class="assessment-toolbar-tip">共 {{ totalAvailableScaleCount }} 项可用量表</span>
          </div>
        </div>

        <div class="assessment-category-grid">
          <button
            v-for="tab in tabPanels"
            :key="tab.id"
            type="button"
            class="assessment-category-tile"
            :class="{
              'is-active': activeTab === tab.id,
              'is-empty': tab.count === 0,
            }"
            :style="getTabThemeStyle(tab.id)"
            @click="activeTab = tab.id"
          >
            <div class="assessment-category-tile__main">
              <strong>{{ tab.label }}</strong>
              <span>{{ tab.count === 0 ? '暂无可用量表' : `当前可用 ${tab.count} 项` }}</span>
            </div>
            <span class="assessment-category-tile__count">{{ tab.count }}</span>
          </button>
        </div>
      </section>

      <section class="assessment-selection-panel" :style="getTabThemeStyle(activePanel.id)">
        <div class="scgp-content-toolbar assessment-results-toolbar">
          <div class="scgp-content-toolbar__main">
            <h2 class="scgp-content-toolbar__title">{{ activePanel.label }}</h2>
            <p class="scgp-content-toolbar__description">
              <template v-if="hasSearchKeyword">
                当前匹配 {{ filteredScales.length }} 项，分类总量 {{ activePanel.count }} 项。
              </template>
              <template v-else>
                当前分类共 {{ activePanel.count }} 项可用量表，支持按名称、缩写、年龄和评估维度快速检索。
              </template>
            </p>
          </div>
          <div class="scgp-content-toolbar__actions">
            <span class="assessment-results-chip">{{ hasSearchKeyword ? '搜索结果' : '已按授权过滤' }}</span>
            <el-button v-if="hasSearchKeyword" link type="primary" @click="clearFilters">清空搜索</el-button>
          </div>
        </div>

        <div class="assessment-filter-bar">
          <div class="assessment-search">
            <el-input
              v-model="searchKeyword"
              clearable
              placeholder="搜索量表名称、缩写、适用年龄或评估维度"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>

        <div v-if="filteredScales.length > 0" class="assessment-card-grid">
          <article
            v-for="scale in filteredScales"
            :key="`${activePanel.id}-${scale.code}`"
            class="assessment-card"
            @click="selectScale(scale.code)"
          >
            <div class="assessment-card__header">
              <div class="assessment-card__identity">
                <span class="assessment-card__icon">
                  <el-icon :size="18">
                    <component :is="scale.icon" />
                  </el-icon>
                </span>
                <div class="assessment-card__titles">
                  <h3>{{ scale.title }}</h3>
                  <p>{{ scale.subtitle }}</p>
                </div>
              </div>

              <span class="assessment-card__time">{{ scale.timeEstimate }}</span>
            </div>

            <div class="assessment-card__meta">
              <span class="assessment-card__badge">适用 {{ scale.ageRange }}</span>
              <span class="assessment-card__badge">题量 {{ scale.questionCount }}</span>
            </div>

            <p class="assessment-card__dimension">{{ scale.dimensions }}</p>

            <div class="assessment-card__footer">
              <span class="assessment-card__hint">{{ scale.studentSelectorTag.description }}</span>
              <el-button type="primary" class="assessment-card__action" @click.stop="selectScale(scale.code)">
                开始评估
              </el-button>
            </div>
          </article>
        </div>

        <div v-else class="scgp-empty-panel assessment-empty-panel">
          <el-empty
            class="scgp-empty-state"
            :description="emptyStateDescription"
          >
            <el-button v-if="hasSearchKeyword" type="primary" plain @click="clearFilters">
              清空搜索
            </el-button>
          </el-empty>
        </div>
      </section>

      <el-card class="notice-card scgp-page-panel" shadow="never">
        <div class="scgp-content-toolbar notice-toolbar">
          <div class="scgp-content-toolbar__main">
            <h2 class="scgp-content-toolbar__title">评估说明</h2>
            <p class="scgp-content-toolbar__description">开始评估前，请先确认评估对象、场地状态和填写角色，避免把入口筛选误当成评分依据。</p>
          </div>
          <div class="scgp-content-toolbar__actions notice-actions">
            <span class="notice-actions__tag">统一入口</span>
          </div>
        </div>

        <ol class="notice-list">
          <li>评估环境保持安静、舒适，尽量减少外界干扰。</li>
          <li>根据学生真实状态作答，入口筛选仅帮助定位量表，不替代专业判断。</li>
          <li>如需中途退出，可在学生选择后继续原有评估流程。</li>
        </ol>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import {
  ASSESSMENT_TABS,
  getDefaultAssessmentTab,
  getVisibleAssessmentScalesForTab,
  type AssessmentScaleCatalogItem,
  type AssessmentScaleCode,
} from '@/features/assessment/assessment-scale-catalog'
import { useAuthStore } from '@/stores/auth'
import type { TrainingEntryCode } from '@/utils/training-entry'

interface AssessmentTabPanel {
  id: TrainingEntryCode
  label: string
  count: number
  scales: AssessmentScaleCatalogItem[]
}

interface AssessmentTabTheme {
  accent: string
  soft: string
  border: string
}

const TAB_THEME_MAP: Record<TrainingEntryCode, AssessmentTabTheme> = {
  'sensory-integration': {
    accent: '#c97947',
    soft: '#fff2e8',
    border: '#f1ceb8',
  },
  'emotional-regulation': {
    accent: '#cb6d77',
    soft: '#fff0f2',
    border: '#f0c6cc',
  },
  'soothing-aids': {
    accent: '#8f74c7',
    soft: '#f5f0ff',
    border: '#d9cbf2',
  },
  'social-communication': {
    accent: '#4b7dbd',
    soft: '#edf4ff',
    border: '#c7d9f1',
  },
  'fine-motor': {
    accent: '#3d9a87',
    soft: '#eaf8f4',
    border: '#c4e7df',
  },
  'life-skills': {
    accent: '#a17c31',
    soft: '#fff7e8',
    border: '#ead7a9',
  },
}

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<TrainingEntryCode>(
  getDefaultAssessmentTab((moduleCode) => authStore.hasModuleAccess(moduleCode))
)
const searchKeyword = ref('')

const tabPanels = computed<AssessmentTabPanel[]>(() =>
  ASSESSMENT_TABS.map((tab) => {
    const scales = getVisibleAssessmentScalesForTab(tab.id, (moduleCode) => authStore.hasModuleAccess(moduleCode))
    return {
      ...tab,
      count: scales.length,
      scales,
    }
  })
)

const totalAvailableScaleCount = computed(() =>
  new Set(tabPanels.value.flatMap((tab) => tab.scales.map((scale) => scale.code))).size
)

const activePanel = computed<AssessmentTabPanel>(() =>
  tabPanels.value.find((tab) => tab.id === activeTab.value) || tabPanels.value[0]!
)

const normalizedSearchKeyword = computed(() =>
  searchKeyword.value.trim().toLowerCase()
)

const hasSearchKeyword = computed(() =>
  normalizedSearchKeyword.value.length > 0
)

const filteredScales = computed(() =>
  activePanel.value.scales.filter((scale) => matchesScaleSearch(scale, normalizedSearchKeyword.value))
)

const emptyStateDescription = computed(() => {
  if (hasSearchKeyword.value) {
    return '当前搜索条件下暂无匹配量表'
  }

  return '该分类下暂无可用量表或相关模块未授权'
})

const selectScale = (scaleType: AssessmentScaleCode) => {
  router.push({
    path: '/assessment/select-student',
    query: { scale: scaleType },
  })
}

const clearFilters = () => {
  searchKeyword.value = ''
}

function getTabThemeStyle(tabId: TrainingEntryCode): Record<string, string> {
  const theme = TAB_THEME_MAP[tabId]
  return {
    '--assessment-accent': theme.accent,
    '--assessment-accent-soft': theme.soft,
    '--assessment-accent-border': theme.border,
  }
}

function matchesScaleSearch(scale: AssessmentScaleCatalogItem, keyword: string): boolean {
  if (!keyword) {
    return true
  }

  const haystack = [
    scale.title,
    scale.subtitle,
    scale.ageRange,
    scale.questionCount,
    scale.dimensions,
    scale.timeEstimate,
    scale.studentSelectorTag.label,
    scale.studentSelectorTag.description,
  ].join(' ').toLowerCase()

  return haystack.includes(keyword)
}
</script>

<style scoped>
.assessment-select-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.assessment-category-panel,
.assessment-selection-panel {
  border: 1px solid #e6ebf2;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 255, 0.98) 100%);
  box-shadow: 0 16px 34px rgba(143, 169, 204, 0.12);
  overflow: hidden;
}

.assessment-category-toolbar,
.assessment-results-toolbar,
.notice-toolbar {
  margin-bottom: 0;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(230, 235, 242, 0.9);
}

.assessment-toolbar-tip,
.assessment-results-chip,
.notice-actions__tag {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(188, 205, 229, 0.9);
  background: #f8fbff;
  color: #5c708b;
  font-size: 12px;
  font-weight: 600;
}

.assessment-category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 18px 22px 22px;
}

.assessment-category-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 96px;
  padding: 18px;
  border: 1px solid #e1e8f1;
  border-radius: 18px;
  background: #fff;
  color: #303133;
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease;
}

.assessment-category-tile:hover {
  transform: translateY(-2px);
  border-color: var(--assessment-accent-border);
  box-shadow: 0 14px 28px rgba(143, 169, 204, 0.16);
}

.assessment-category-tile.is-active {
  border-color: var(--assessment-accent-border);
  background: linear-gradient(180deg, var(--assessment-accent-soft) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow: 0 16px 30px rgba(143, 169, 204, 0.18);
}

.assessment-category-tile.is-empty {
  opacity: 0.78;
}

.assessment-category-tile__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.assessment-category-tile__main strong {
  color: #223246;
  font-size: 16px;
  font-weight: 700;
}

.assessment-category-tile__main span {
  color: #66768a;
  font-size: 12px;
  line-height: 1.5;
}

.assessment-category-tile.is-active .assessment-category-tile__main strong,
.assessment-category-tile.is-active .assessment-category-tile__count {
  color: var(--assessment-accent);
}

.assessment-category-tile__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 38px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(248, 251, 255, 0.95);
  color: #51627b;
  font-size: 14px;
  font-weight: 700;
}

.assessment-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(230, 235, 242, 0.9);
}

.assessment-search {
  max-width: 520px;
}

.assessment-search :deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: 16px;
  box-shadow: 0 0 0 1px rgba(220, 223, 230, 0.95) inset;
}

.assessment-search :deep(.el-input__wrapper:hover),
.assessment-search :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--assessment-accent-border) inset,
    0 0 0 3px rgba(95, 137, 217, 0.08);
}

.assessment-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 18px 22px 22px;
}

.assessment-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 240px;
  padding: 18px;
  border: 1px solid #dfe7f1;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 255, 0.98) 100%);
  box-shadow: 0 14px 28px rgba(143, 169, 204, 0.1);
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.assessment-card:hover {
  transform: translateY(-3px);
  border-color: var(--assessment-accent-border);
  box-shadow: 0 18px 34px rgba(143, 169, 204, 0.16);
}

.assessment-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.assessment-card__identity {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.assessment-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  border: 1px solid var(--assessment-accent-border);
  background: var(--assessment-accent-soft);
  color: var(--assessment-accent);
}

.assessment-card__titles {
  min-width: 0;
}

.assessment-card__titles h3 {
  margin: 0;
  color: #243449;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.5;
}

.assessment-card__titles p {
  margin: 4px 0 0;
  color: #768499;
  font-size: 13px;
  line-height: 1.5;
}

.assessment-card__time {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f7f9fc;
  color: #617186;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.assessment-card__meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.assessment-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(221, 229, 239, 0.96);
  background: #fff;
  color: #5f6f84;
  font-size: 12px;
}

.assessment-card__dimension {
  margin: 0;
  color: #55657b;
  font-size: 13px;
  line-height: 1.7;
  display: -webkit-box;
  min-height: 44px;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.assessment-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
}

.assessment-card__hint {
  color: #7b8798;
  font-size: 12px;
  line-height: 1.6;
}

.assessment-card__action {
  flex-shrink: 0;
  min-width: 108px;
  min-height: 40px;
  border-radius: 999px;
}

.assessment-empty-panel {
  margin: 18px 22px 22px;
}

.notice-card {
  border-radius: 22px;
}

.notice-list {
  margin: 0;
  padding: 0 22px 22px 40px;
  color: #596a80;
  font-size: 13px;
  line-height: 1.8;
}

.notice-list li + li {
  margin-top: 4px;
}

@media (max-width: 1200px) {
  .assessment-category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .assessment-card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .assessment-select-panel {
    gap: 18px;
  }

  .assessment-category-toolbar,
  .assessment-results-toolbar,
  .notice-toolbar {
    padding: 18px 18px 14px;
  }

  .assessment-category-grid,
  .assessment-filter-bar,
  .assessment-card-grid {
    padding-left: 18px;
    padding-right: 18px;
  }

  .assessment-category-grid {
    grid-template-columns: 1fr;
  }

  .assessment-card {
    min-height: 0;
  }

  .assessment-card__header,
  .assessment-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .assessment-card__action {
    width: 100%;
  }

  .notice-list {
    padding-left: 36px;
    padding-right: 18px;
  }
}
</style>
