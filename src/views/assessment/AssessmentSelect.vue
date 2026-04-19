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
            <p class="scgp-content-toolbar__description">按业务方向切换量表入口，分类块只显示当前授权下的可用数量。</p>
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
              当前分类共 {{ activePanel.count }} 项可用量表，点击卡片即可进入学生选择并开始评估。
            </p>
          </div>
          <div class="scgp-content-toolbar__actions">
            <span class="assessment-results-chip">已按授权过滤</span>
          </div>
        </div>

        <section class="assessment-guidance">
          <button
            type="button"
            class="assessment-guidance__toggle"
            @click="isNoticeExpanded = !isNoticeExpanded"
          >
            <span class="assessment-guidance__icon">
              <el-icon :size="18"><InfoFilled /></el-icon>
            </span>
            <span class="assessment-guidance__copy">
              <strong>评估说明</strong>
              <span>开始评估前先确认评估对象、场地状态和填写角色，避免把入口分类误当成评分依据。</span>
            </span>
            <span class="assessment-guidance__state">
              {{ isNoticeExpanded ? '收起' : '展开说明' }}
              <el-icon :size="14">
                <component :is="isNoticeExpanded ? ArrowUp : ArrowDown" />
              </el-icon>
            </span>
          </button>

          <ol v-if="isNoticeExpanded" class="assessment-guidance__list">
            <li>评估环境保持安静、舒适，尽量减少外界干扰。</li>
            <li>根据学生真实状态作答，入口分类仅帮助定位量表，不替代专业判断。</li>
            <li>如需中途退出，可在学生选择后继续原有评估流程。</li>
          </ol>
        </section>

        <div v-if="visibleScales.length > 0" class="assessment-card-grid">
          <article
            v-for="scale in visibleScales"
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
                  <div class="assessment-card__title-row">
                    <h3>{{ scale.title }}</h3>
                    <p class="assessment-card__subtitle">{{ scale.subtitle }}</p>
                  </div>

                  <div class="assessment-card__meta">
                    <span class="assessment-card__badge">适用 {{ scale.ageRange }}</span>
                    <span class="assessment-card__badge">题量 {{ scale.questionCount }}</span>
                  </div>
                </div>
              </div>

              <span class="assessment-card__time">{{ scale.timeEstimate }}</span>
            </div>

            <p class="assessment-card__dimension">{{ scale.dimensions }}</p>

            <div class="assessment-card__footer">
              <el-button type="primary" class="assessment-card__action" @click.stop="selectScale(scale.code)">
                开始评估
              </el-button>
            </div>
          </article>
        </div>

        <div v-else class="scgp-empty-panel assessment-empty-panel">
          <el-empty class="scgp-empty-state" :description="emptyStateDescription" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, ArrowUp, InfoFilled } from '@element-plus/icons-vue'
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
const isNoticeExpanded = ref(true)

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

const visibleScales = computed(() =>
  activePanel.value.scales
)

const emptyStateDescription = computed(() =>
  '该分类下暂无可用量表或相关模块未授权'
)

const selectScale = (scaleType: AssessmentScaleCode) => {
  router.push({
    path: '/assessment/select-student',
    query: { scale: scaleType },
  })
}

function getTabThemeStyle(tabId: TrainingEntryCode): Record<string, string> {
  const theme = TAB_THEME_MAP[tabId]
  return {
    '--assessment-accent': theme.accent,
    '--assessment-accent-soft': theme.soft,
    '--assessment-accent-border': theme.border,
  }
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
  overflow: hidden;
}

.assessment-category-panel {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 251, 255, 0.92) 100%);
  box-shadow: 0 10px 24px rgba(143, 169, 204, 0.08);
}

.assessment-selection-panel {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.98) 100%);
  box-shadow: 0 18px 38px rgba(143, 169, 204, 0.14);
}

.assessment-category-toolbar,
.assessment-results-toolbar {
  margin-bottom: 0;
  padding: 20px 22px 16px;
  border-bottom: 1px solid rgba(230, 235, 242, 0.9);
}

.assessment-category-toolbar .scgp-content-toolbar__title {
  font-size: 15px;
  font-weight: 600;
}

.assessment-category-toolbar .scgp-content-toolbar__description {
  font-size: 12px;
}

.assessment-results-toolbar {
  padding-top: 22px;
  padding-bottom: 18px;
}

.assessment-results-toolbar .scgp-content-toolbar__title {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.assessment-results-toolbar .scgp-content-toolbar__description {
  font-size: 14px;
}

.assessment-toolbar-tip,
.assessment-results-chip {
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
  border-color: #a8c6f8;
  background: linear-gradient(180deg, #edf4ff 0%, #deebff 100%);
  box-shadow: 0 16px 30px rgba(95, 137, 217, 0.18);
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
  color: #2f5fb4;
}

.assessment-category-tile.is-active .assessment-category-tile__main span {
  color: #5b75a2;
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

.assessment-category-tile.is-active .assessment-category-tile__count {
  border: 1px solid rgba(168, 198, 248, 0.88);
  background: rgba(255, 255, 255, 0.94);
}

.assessment-guidance {
  margin: 0 22px 18px;
  border: 1px solid #dbe6f6;
  border-radius: 20px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.assessment-guidance__toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.assessment-guidance__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #e2edff;
  color: #3f68c7;
}

.assessment-guidance__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.assessment-guidance__copy strong {
  color: #223246;
  font-size: 14px;
  font-weight: 700;
}

.assessment-guidance__copy span {
  color: #5c6d84;
  font-size: 12px;
  line-height: 1.6;
}

.assessment-guidance__state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: #4b67a0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.assessment-guidance__list {
  margin: 0;
  padding: 0 22px 18px 68px;
  color: #55667d;
  font-size: 13px;
  line-height: 1.8;
}

.assessment-guidance__list li + li {
  margin-top: 4px;
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
  gap: 12px;
  min-height: 0;
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.assessment-card__title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.assessment-card__titles h3 {
  margin: 0;
  color: #243449;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.5;
}

.assessment-card__subtitle {
  margin: 0;
  color: #6c7a90;
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
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
  color: #8190a4;
  font-size: 12px;
  line-height: 1.6;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.assessment-card__footer {
  display: flex;
  align-items: stretch;
  margin-top: auto;
}

.assessment-card__action {
  width: 100%;
  min-height: 40px;
  border-radius: 999px;
}

.assessment-empty-panel {
  margin: 18px 22px 22px;
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
  .assessment-results-toolbar {
    padding: 18px 18px 14px;
  }

  .assessment-category-grid,
  .assessment-card-grid {
    padding-left: 18px;
    padding-right: 18px;
  }

  .assessment-guidance {
    margin-left: 18px;
    margin-right: 18px;
  }

  .assessment-guidance__toggle {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .assessment-guidance__state {
    margin-left: 52px;
  }

  .assessment-guidance__list {
    padding: 0 18px 18px 36px;
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
}
</style>
