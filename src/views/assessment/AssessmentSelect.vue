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
            <p class="scgp-content-toolbar__description">按业务方向切换量表入口，分类区仅显示当前授权下的可用数量。</p>
          </div>
          <div class="scgp-content-toolbar__actions">
            <span class="assessment-toolbar-tip">共 {{ totalAvailableScaleCount }} 项可用量表</span>
          </div>
        </div>

        <div class="assessment-category-chips" role="group" aria-label="评估分类">
          <button
            v-for="tab in tabPanels"
            :key="tab.id"
            type="button"
            class="assessment-category-chip"
            :class="{
              'is-active': activeTab === tab.id,
              'is-empty': tab.count === 0,
            }"
            :aria-pressed="activeTab === tab.id"
            @click="handleTabSelect(tab.id)"
          >
            <span class="assessment-category-chip__label">{{ tab.label }}</span>
            <span class="assessment-category-chip__count">{{ tab.count }}</span>
          </button>
        </div>
      </section>

      <section class="assessment-selection-panel" :style="getTabThemeStyle(activePanel.id)">
        <div class="scgp-content-toolbar assessment-results-toolbar">
          <div class="scgp-content-toolbar__main">
            <div class="assessment-results-toolbar__heading">
              <h2 class="scgp-content-toolbar__title">{{ activePanel.label }}</h2>
              <span
                class="assessment-results-chip"
                title="仅显示当前账号已获授权的量表"
              >
                已按授权过滤
              </span>
            </div>
            <p class="scgp-content-toolbar__description">
              当前分类共 {{ activePanel.count }} 项可用量表，点击卡片即可进入学生选择并开始评估。
            </p>
          </div>
        </div>

        <section class="assessment-guidance" :class="{ 'is-expanded': isNoticeExpanded }">
          <div class="assessment-guidance__summary">
            <span class="assessment-guidance__dot" aria-hidden="true" />
            <p>开始评估前先确认评估对象、场地状态和填写角色，避免把入口分类误当成评分依据。</p>
            <button
              type="button"
              class="assessment-guidance__link"
              @click="isNoticeExpanded = !isNoticeExpanded"
            >
              <span>{{ isNoticeExpanded ? '收起' : '展开' }}</span>
              <el-icon :size="12">
                <component :is="isNoticeExpanded ? ArrowUp : ArrowDown" />
              </el-icon>
            </button>
          </div>

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
            role="button"
            tabindex="0"
            @click="selectScale(scale.code)"
            @keydown.self="handleAssessmentCardKeydown($event, scale.code)"
          >
            <div class="assessment-card__header">
              <span class="assessment-card__icon">
                <el-icon :size="18">
                  <component :is="scale.icon" />
                </el-icon>
              </span>

              <div class="assessment-card__content">
                <div class="assessment-card__title-row">
                  <h3>{{ scale.title }}</h3>
                  <p class="assessment-card__subtitle">{{ scale.subtitle }}</p>
                </div>

                <div class="assessment-card__meta" role="list" aria-label="量表摘要信息">
                  <span
                    v-for="item in getScaleMetaItems(scale)"
                    :key="item.key"
                    class="assessment-card__meta-item"
                    role="listitem"
                  >
                    <span class="assessment-card__meta-label">{{ item.label }}</span>
                    <span class="assessment-card__meta-value">{{ item.value }}</span>
                  </span>
                </div>
              </div>
            </div>

            <p class="assessment-card__dimension">{{ scale.dimensions }}</p>

            <div class="assessment-card__footer">
              <button
                type="button"
                class="assessment-card__action"
                @click.stop="selectScale(scale.code)"
              >
                开始评估
              </button>
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
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import {
  ASSESSMENT_TABS,
  getDefaultAssessmentTab,
  getVisibleAssessmentScalesForTab,
  type AssessmentScaleCatalogItem,
  type AssessmentScaleCode,
} from '@/features/assessment/assessment-scale-catalog'
import { useAuthStore } from '@/stores/auth'
import type { TrainingEntryCode } from '@/utils/training-entry'
import {
  isAssessmentCardActivationKey,
  reconcileAssessmentActiveTab,
} from './assessment-select-state'

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

interface AssessmentScaleMetaItem {
  key: 'age' | 'questions' | 'duration'
  label: string
  value: string
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
  getDefaultAssessmentTab(
    (moduleCode) => authStore.hasModuleAccess(moduleCode),
    (entitlementCode) => authStore.hasEntitlementAccess(entitlementCode)
  )
)
const hasUserSelectedTab = ref(false)
const isNoticeExpanded = ref(false)

const tabPanels = computed<AssessmentTabPanel[]>(() =>
  ASSESSMENT_TABS.map((tab) => {
    const scales = getVisibleAssessmentScalesForTab(
      tab.id,
      (moduleCode) => authStore.hasModuleAccess(moduleCode),
      (entitlementCode) => authStore.hasEntitlementAccess(entitlementCode)
    )
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

const handleTabSelect = (tabId: TrainingEntryCode) => {
  hasUserSelectedTab.value = true
  activeTab.value = tabId
}

const handleAssessmentCardKeydown = (event: KeyboardEvent, scaleCode: AssessmentScaleCode) => {
  if (!isAssessmentCardActivationKey(event.key)) {
    return
  }

  event.preventDefault()
  selectScale(scaleCode)
}

watch(
  tabPanels,
  (panels) => {
    const nextTab = reconcileAssessmentActiveTab({
      currentTab: activeTab.value,
      hasUserSelectedTab: hasUserSelectedTab.value,
      panels,
    })

    if (nextTab !== activeTab.value) {
      activeTab.value = nextTab
    }
  },
  { immediate: true }
)

function getTabThemeStyle(tabId: TrainingEntryCode): Record<string, string> {
  const theme = TAB_THEME_MAP[tabId]
  return {
    '--assessment-accent': theme.accent,
    '--assessment-accent-soft': theme.soft,
    '--assessment-accent-border': theme.border,
  }
}

function normalizeScaleMetaValue(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : '—'
}

function getScaleMetaItems(scale: AssessmentScaleCatalogItem): AssessmentScaleMetaItem[] {
  return [
    { key: 'age', label: '年龄', value: normalizeScaleMetaValue(scale.ageRange) },
    { key: 'questions', label: '题量', value: normalizeScaleMetaValue(scale.questionCount) },
    { key: 'duration', label: '时长', value: normalizeScaleMetaValue(scale.timeEstimate) },
  ]
}
</script>

<style scoped>
.assessment-select-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  padding-bottom: 14px;
}

.assessment-results-toolbar .scgp-content-toolbar__title {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.assessment-results-toolbar .scgp-content-toolbar__description {
  font-size: 14px;
}

.assessment-results-toolbar__heading {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.assessment-toolbar-tip {
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

.assessment-results-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.assessment-category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 22px 22px;
}

.assessment-category-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 0 8px 0 14px;
  border: 1px solid #d7e0eb;
  border-radius: 999px;
  background: #fff;
  color: #5f6f84;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.assessment-category-chip:hover {
  border-color: #b8c6d8;
  color: #32455e;
}

.assessment-category-chip:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 3px;
}

.assessment-category-chip.is-active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.12);
}

.assessment-category-chip.is-empty {
  opacity: 0.74;
}

.assessment-category-chip__label {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.assessment-category-chip__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f3f6fa;
  color: inherit;
  font-size: 12px;
  font-weight: 700;
}

.assessment-category-chip.is-active .assessment-category-chip__count {
  border: 1px solid #bfdbfe;
  background: #fff;
}

.assessment-guidance {
  margin: 0 22px 14px;
  padding: 0;
}

.assessment-guidance__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  padding: 4px 0;
}

.assessment-guidance__summary p {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: #5c6d84;
  font-size: 13px;
  line-height: 1.5;
}

.assessment-guidance__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #3b82f6;
}

.assessment-guidance__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.assessment-guidance__link:hover {
  color: #1d4ed8;
}

.assessment-guidance__link:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
  border-radius: 8px;
}

.assessment-guidance__list {
  margin: 0;
  padding: 2px 0 0 20px;
  color: #55667d;
  font-size: 13px;
  line-height: 1.7;
}

.assessment-guidance__list li + li {
  margin-top: 4px;
}

.assessment-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 0 22px 22px;
}

.assessment-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
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

.assessment-card:focus-visible {
  outline: 2px solid var(--assessment-accent);
  outline-offset: 3px;
}

.assessment-card__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.assessment-card__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
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

.assessment-card__title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.assessment-card__title-row h3 {
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
}

.assessment-card__meta {
  display: flex;
  align-items: stretch;
  border: 1px solid #e3eaf3;
  border-radius: 14px;
  background: #fbfcfe;
  overflow: hidden;
}

.assessment-card__meta-item {
  min-width: 0;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 9px 12px;
}

.assessment-card__meta-item + .assessment-card__meta-item {
  border-left: 0.5px solid #d9e2ec;
}

.assessment-card__meta-label {
  color: #8a97aa;
  font-size: 12px;
  line-height: 1.4;
}

.assessment-card__meta-value {
  color: #5f6f84;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease, color 0.18s ease;
}

.assessment-card__action:hover {
  border-color: #93c5fd;
  background: #dbeafe;
}

.assessment-card__action:active {
  transform: scale(0.99);
}

.assessment-card__action:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.assessment-empty-panel {
  margin: 0 22px 22px;
}

@media (max-width: 1200px) {
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

  .assessment-category-chips,
  .assessment-card-grid {
    padding-left: 18px;
    padding-right: 18px;
  }

  .assessment-guidance {
    margin-left: 18px;
    margin-right: 18px;
  }

  .assessment-results-toolbar__heading {
    align-items: flex-start;
  }

  .assessment-guidance__summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .assessment-guidance__link {
    margin-left: 16px;
  }

  .assessment-guidance__list {
    padding-left: 18px;
  }

  .assessment-card {
    min-height: 0;
  }

  .assessment-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .assessment-card__content,
  .assessment-card__meta {
    width: 100%;
  }
}
</style>
