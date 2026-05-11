<template>
  <div class="page-container scgp-admin-page plan-list-page">
    <div class="page-header">
      <div class="header-left">
        <h1>训练计划</h1>
        <p class="subtitle">IEP 个性化教育计划管理，承接评估结果与跨模块训练资源编排 · 共 {{ filteredPlans.length }} 个计划</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleCreatePlan">
          <el-icon><Plus /></el-icon>
          新建计划
        </el-button>
      </div>
    </div>

    <section class="filter-section scgp-filter-surface plan-filter-section">
      <div class="filter-toolbar">
        <div class="status-pill-list" role="tablist" aria-label="计划状态筛选">
          <button
            v-for="tab in statusTabs"
            :key="tab.value || 'all'"
            type="button"
            class="status-pill"
            :class="{ 'is-active': filterStatus === tab.value }"
            @click="filterStatus = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="filter-toolbar__divider" aria-hidden="true" />

        <div class="compact-selects">
          <el-select v-model="filterModule" class="compact-select" placeholder="归属模块" clearable @change="handleFilterChange">
            <el-option
              v-for="option in trainingPlanFilterModuleOptions"
              :key="option.value || 'all-modules'"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <el-select
            v-model="filterStudentId"
            class="compact-select"
            placeholder="学生"
            clearable
            filterable
            @change="handleFilterChange"
          >
            <el-option
              v-for="student in studentList"
              :key="student.id"
              :label="student.name"
              :value="student.id"
            />
          </el-select>
        </div>

        <div class="filter-toolbar__divider" aria-hidden="true" />

        <div class="plan-search">
          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="搜索计划名称…"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </section>

    <section class="stats-row" aria-label="训练计划统计概览">
      <article class="summary-card">
        <div class="summary-card__label">计划总数</div>
        <div class="summary-card__value">
          <span class="summary-card__number">{{ summaryStats.total }}</span>
          <span class="summary-card__unit">个</span>
        </div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">执行中</div>
        <div class="summary-card__value">
          <span class="summary-card__number">{{ summaryStats.active }}</span>
          <span class="summary-card__unit">个</span>
        </div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">待开始</div>
        <div class="summary-card__value">
          <span class="summary-card__number">{{ summaryStats.pending }}</span>
          <span class="summary-card__unit">个</span>
        </div>
      </article>
      <article class="summary-card">
        <div class="summary-card__label">涉及学生数</div>
        <div class="summary-card__value">
          <span class="summary-card__number">{{ summaryStats.students }}</span>
          <span class="summary-card__unit">人</span>
        </div>
      </article>
    </section>

    <section class="plan-list main-content scgp-page-panel" v-loading="loading">
      <el-empty v-if="filteredPlans.length === 0" description="暂无训练计划">
        <el-button type="primary" @click="handleCreatePlan">创建第一个计划</el-button>
      </el-empty>

      <div v-else class="plan-cards">
        <article
          v-for="plan in filteredPlans"
          :key="plan.id"
          class="plan-card"
          :class="{ 'plan-card--active': plan.status === 'active' }"
        >
          <div class="plan-card__main" @click="handleViewPlan(plan)">
            <div class="plan-card__summary">
              <span class="plan-status-badge" :class="getStatusBadgeClass(plan.status)">
                {{ getStatusLabel(plan.status) }}
              </span>
              <h3 class="plan-card__title" :title="plan.name">{{ plan.name }}</h3>
              <p class="plan-card__module">{{ getModuleLabel(plan.module_code) }}</p>
            </div>

            <div class="plan-card__meta">
              <div class="plan-card__student-row">
                <StudentAvatar
                  :name="studentLookup[plan.student_id]?.name || plan.student_name"
                  :gender="studentLookup[plan.student_id]?.gender"
                  :avatar-url="studentLookup[plan.student_id]?.avatar_path"
                  size="sm"
                />
                <span class="plan-card__student-name">{{ studentLookup[plan.student_id]?.name || plan.student_name || `学生 #${plan.student_id}` }}</span>
                <DiagnosisTag :type="studentLookup[plan.student_id]?.disorder" />
              </div>

              <div class="plan-card__date-row">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDateRange(plan.start_date, plan.end_date) }}</span>
              </div>

              <div class="plan-progress">
                <div class="plan-progress__meta">
                  <span>计划进度</span>
                  <strong>{{ getPlanProgress(plan) }}%</strong>
                </div>
                <div class="plan-progress__track" aria-hidden="true">
                  <div class="plan-progress__fill" :style="{ width: `${getPlanProgress(plan)}%` }" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="plan.status === 'active'" class="today-training-section" @click.stop>
            <div class="today-training__header">
              <div class="today-training__title">
                <el-icon><Sunny /></el-icon>
                <span>今日训练推荐</span>
              </div>
              <span class="today-training__count">{{ getPlanResourceCount(plan.id) }} 项</span>
            </div>

            <div v-if="getPlanResourceCount(plan.id) === 0" class="no-resources-hint">
              暂未添加训练资源
            </div>

            <div v-else class="resource-recommendations">
              <el-tooltip
                v-for="resource in getVisiblePlanResources(plan.id)"
                :key="resource.resource_id"
                placement="top"
                :show-after="300"
              >
                <template #content>
                  <div class="resource-tooltip">
                    <div class="tooltip-name">{{ resource.resource_name }}</div>
                    <div class="tooltip-info" v-if="resource.frequency">
                      建议频次：每周 {{ resource.frequency }} 次
                    </div>
                    <div class="tooltip-info" v-if="resource.duration_minutes">
                      建议时长：{{ resource.duration_minutes }} 分钟
                    </div>
                    <div class="tooltip-notes" v-if="resource.notes">
                      教学提示：{{ resource.notes }}
                    </div>
                    <div class="tooltip-action">
                      点击开始训练 →
                    </div>
                  </div>
                </template>
                <button
                  type="button"
                  class="resource-recommendation-item"
                  :class="{ 'is-completed': isResourceCompletedToday(plan.student_id, resource.resource_id) }"
                  @click.stop="handleLaunchTraining(plan, resource)"
                >
                  <span class="resource-thumb-shell" :class="{ 'has-image': Boolean(getPlanResourceCoverImage(resource)) }">
                    <img
                      v-if="getPlanResourceCoverImage(resource)"
                      :src="getPlanResourceCoverImage(resource)"
                      :alt="resource.resource_name"
                      class="resource-thumb"
                    />
                    <span v-else class="resource-thumb-fallback">{{ getResourceInitial(resource.resource_name) }}</span>
                    <span
                      v-if="isResourceCompletedToday(plan.student_id, resource.resource_id)"
                      class="resource-completed-badge"
                    >
                      <el-icon><Check /></el-icon>
                    </span>
                  </span>
                  <span class="resource-recommendation-item__name" :title="resource.resource_name">{{ resource.resource_name }}</span>
                </button>
              </el-tooltip>

              <button
                v-if="getOverflowResourceCount(plan.id) > 0"
                type="button"
                class="resource-overflow-indicator"
                :title="`还有 ${getOverflowResourceCount(plan.id)} 个资源，点击查看详情`"
                @click.stop="handleViewPlan(plan)"
              >
                +{{ getOverflowResourceCount(plan.id) }}
              </button>
            </div>
          </div>

          <div class="plan-card__footer">
            <span class="plan-card__resource-count">{{ getPlanResourceCount(plan.id) }} 个资源</span>
            <div class="plan-card__actions">
              <el-button
                v-if="plan.status === 'draft'"
                class="plan-primary-action"
                @click.stop="handleStartPlan(plan)"
              >
                开始执行
              </el-button>

              <el-dropdown
                trigger="click"
                popper-class="plan-card__menu-dropdown"
                @command="handlePlanMenuCommand(plan, $event)"
              >
                <el-button class="plan-card__menu-button" text circle @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>
                    <el-dropdown-item command="delete" class="plan-card__menu-item--danger">
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- 新建/编辑计划弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="editingPlan ? '编辑计划' : '新建计划'"
      width="900px"
      :close-on-click-modal="false"
      class="plan-dialog"
    >
      <el-tabs v-model="activeTab">
        <!-- 基本信息 Tab -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="planForm" :rules="planRules" ref="planFormRef" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="计划名称" prop="name">
                  <el-input v-model="planForm.name" placeholder="请输入计划名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="归属模块" prop="module_code">
                  <el-select v-model="planForm.module_code" placeholder="请选择模块" style="width: 100%">
                    <el-option
                      v-for="option in trainingPlanModuleOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="关联学生" prop="student_id">
              <el-select
                v-model="planForm.student_id"
                placeholder="请选择学生"
                filterable
                style="width: 100%"
              >
                <el-option
                  v-for="student in studentList"
                  :key="student.id"
                  :label="student.name"
                  :value="student.id"
                >
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <el-avatar :size="24" :src="student.avatar_path">
                      {{ student.name?.charAt(0) }}
                    </el-avatar>
                    <span>{{ student.name }}</span>
                    <span style="color: #909399; font-size: 12px;">
                      {{ student.student_no || '' }}
                    </span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="计划周期" prop="dateRange">
              <el-date-picker
                v-model="planForm.dateRange"
                type="daterange"
                v-bind="standardDateRangePickerProps"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="计划描述">
              <el-input
                v-model="planForm.description"
                type="textarea"
                :rows="2"
                placeholder="请输入计划描述（可选）"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 目标设定 Tab -->
        <el-tab-pane label="目标设定" name="goals">
          <div class="goals-section">
            <div class="goal-group">
              <div class="goal-header">
                <h4>长期目标</h4>
                <el-button type="primary" text size="small" @click="addLongTermGoal">
                  <el-icon><Plus /></el-icon> 添加目标
                </el-button>
              </div>
              <div class="goal-list">
                <div
                  v-for="(goal, index) in planForm.long_term_goals"
                  :key="'lt-' + index"
                  class="goal-item"
                >
                  <el-input
                    v-model="planForm.long_term_goals[index]"
                    placeholder="请输入长期目标，如：提高触觉敏感度"
                  >
                    <template #prefix>
                      <el-tag type="warning" size="small">长期</el-tag>
                    </template>
                    <template #append>
                      <el-button :icon="Delete" @click="removeLongTermGoal(index)" />
                    </template>
                  </el-input>
                </div>
                <el-empty
                  v-if="planForm.long_term_goals.length === 0"
                  description="暂无长期目标"
                  :image-size="60"
                />
              </div>
            </div>

            <div class="goal-group">
              <div class="goal-header">
                <h4>短期目标</h4>
                <el-button type="primary" text size="small" @click="addShortTermGoal">
                  <el-icon><Plus /></el-icon> 添加目标
                </el-button>
              </div>
              <div class="goal-list">
                <div
                  v-for="(goal, index) in planForm.short_term_goals"
                  :key="'st-' + index"
                  class="goal-item"
                >
                  <el-input
                    v-model="planForm.short_term_goals[index]"
                    placeholder="请输入短期目标，如：能独立完成大笼球游戏"
                  >
                    <template #prefix>
                      <el-tag type="success" size="small">短期</el-tag>
                    </template>
                    <template #append>
                      <el-button :icon="Delete" @click="removeShortTermGoal(index)" />
                    </template>
                  </el-input>
                </div>
                <el-empty
                  v-if="planForm.short_term_goals.length === 0"
                  description="暂无短期目标"
                  :image-size="60"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 资源编排 Tab -->
        <el-tab-pane label="资源编排" name="resources">
          <div class="resources-section">
            <!-- 已选资源列表 -->
            <div class="selected-resources">
              <div class="section-header">
                <h4>已选训练资源 ({{ selectedResources.length }})</h4>
                <el-button type="primary" @click="showResourceSelector">
                  <el-icon><Plus /></el-icon>
                  添加资源
                </el-button>
              </div>

              <el-empty
                v-if="selectedResources.length === 0"
                description="暂未添加训练资源"
                :image-size="80"
              />

              <div v-else class="resource-cards">
                <div
                  v-for="(resource, index) in selectedResources"
                  :key="resource.resource_id"
                  class="resource-card"
                >
                  <img
                    :src="getResourceImage(resource)"
                    :alt="resource.resource_name"
                    class="resource-cover"
                  />
                  <div class="resource-info">
                    <div class="resource-name">{{ resource.resource_name }}</div>
                    <div class="resource-meta">
                      <el-tag size="small" type="info">
                        {{ getResourceTypeLabel(resource.resource_type) }}
                      </el-tag>
                      <el-tag size="small">
                        {{ getModuleLabel(resource.module_code) }}
                      </el-tag>
                      <el-tag
                        v-if="resource.resource_type === 'equipment'"
                        size="small"
                        effect="plain"
                      >
                        {{ getPlanResourceCatalogGroupLabel(resource) }}
                      </el-tag>
                    </div>
                    <div class="resource-config">
                      <el-row :gutter="12">
                        <el-col :span="8">
                          <el-input-number
                            v-model="resource.frequency"
                            :min="1"
                            :max="7"
                            size="small"
                            placeholder="频次"
                            controls-position="right"
                          />
                          <span class="config-label">次/周</span>
                        </el-col>
                        <el-col :span="8">
                          <el-input-number
                            v-model="resource.duration_minutes"
                            :min="5"
                            :max="120"
                            :step="5"
                            size="small"
                            placeholder="时长"
                            controls-position="right"
                          />
                          <span class="config-label">分钟</span>
                        </el-col>
                        <el-col :span="8">
                          <el-button
                            type="danger"
                            text
                            size="small"
                            @click="removeResource(index)"
                          >
                            <el-icon><Delete /></el-icon>
                            移除
                          </el-button>
                        </el-col>
                      </el-row>
                      <el-input
                        v-model="resource.notes"
                        placeholder="教学提示（可选）"
                        size="small"
                        class="notes-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="info" @click="handleSavePlan('draft')" v-if="!editingPlan">
          保存为草稿
        </el-button>
        <el-button type="primary" @click="handleSavePlan(editingPlan?.status || 'draft')">
          {{ editingPlan ? '保存修改' : '创建计划' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 资源选择器弹窗 -->
    <el-dialog
      v-model="resourceSelectorVisible"
      title="选择训练资源"
      width="800px"
      class="resource-selector-dialog"
    >
      <div class="resource-selector-content">
        <!-- 模块筛选 -->
        <div class="module-filter">
          <el-radio-group v-model="resourceFilterModule" @change="loadResourcesForSelection">
            <el-radio-button value="all">全部模块</el-radio-button>
            <el-radio-button value="sensory">感官训练</el-radio-button>
            <el-radio-button value="emotional">情绪调节</el-radio-button>
            <el-radio-button value="social">社交互动</el-radio-button>
            <el-radio-button value="emotion_scene">情绪场景</el-radio-button>
            <el-radio-button value="care_scene">表达关心</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 资源类型筛选 -->
        <div class="type-filter">
          <el-radio-group v-model="resourceFilterType" @change="loadResourcesForSelection">
            <el-radio-button value="">全部类型</el-radio-button>
            <el-radio-button value="equipment">器材</el-radio-button>
            <el-radio-button value="game">游戏</el-radio-button>
            <el-radio-button value="flashcard">闪卡</el-radio-button>
            <el-radio-button :value="TASK_TRAINING_RESOURCE_TYPE">自理任务</el-radio-button>
          </el-radio-group>
        </div>

        <div v-if="resourceFilterType === 'equipment'" class="catalog-group-filter">
          <el-radio-group v-model="resourceFilterCatalogGroup">
            <el-radio-button value="all">全部分组</el-radio-button>
            <el-radio-button
              v-for="group in equipmentCatalogGroupOptions"
              :key="group.value"
              :value="group.value"
            >
              {{ group.label }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 搜索 -->
        <el-input
          v-model="resourceSearchKeyword"
          placeholder="搜索资源名称..."
          clearable
          @input="debouncedResourceSearch"
          class="resource-search"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 资源列表 -->
        <div class="resource-selection-list" v-loading="resourceLoading">
          <el-empty v-if="filteredAvailableResources.length === 0" description="暂无可用资源" />

          <div v-else class="resource-grid">
            <div
              v-for="resource in filteredAvailableResources"
              :key="resource.id"
              class="resource-option"
              :class="{ selected: isResourceSelected(resource.id) }"
              @click="toggleResourceSelection(resource)"
            >
              <img
                :src="getResourceItemImage(resource)"
                :alt="resource.name"
                class="option-cover"
              />
              <div class="option-info">
                <div class="option-name">{{ resource.name }}</div>
                <div class="option-meta">
                  <el-tag size="small" type="info">
                    {{ getResourceTypeLabel(resource.resourceType) }}
                  </el-tag>
                  <el-tag
                    v-if="resource.resourceType === 'equipment'"
                    size="small"
                    effect="plain"
                  >
                    {{ getEquipmentResourceCatalogGroupLabel(resource) }}
                  </el-tag>
                </div>
              </div>
              <div class="selection-indicator" v-if="isResourceSelected(resource.id)">
                <el-icon><Check /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="selected-count">已选择 {{ tempSelectedResources.length }} 个资源</span>
        <el-button @click="resourceSelectorVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResourceSelection">
          确认添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 计划详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      :title="currentPlan?.name || '计划详情'"
      size="600px"
    >
      <div v-if="currentPlan" class="plan-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="学生">{{ currentPlan.student_name }}</el-descriptions-item>
          <el-descriptions-item label="模块">{{ getModuleLabel(currentPlan.module_code) }}</el-descriptions-item>
          <el-descriptions-item label="周期">
            {{ formatDateRange(currentPlan.start_date, currentPlan.end_date) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentPlan.status)">
              {{ getStatusLabel(currentPlan.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述" v-if="currentPlan.description">
            {{ currentPlan.description }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 目标 -->
        <div class="detail-section" v-if="parsedLongTermGoals.length || parsedShortTermGoals.length">
          <h4>训练目标</h4>
          <div v-if="parsedLongTermGoals.length" class="goal-list-detail">
            <div class="goal-label">长期目标：</div>
            <ul>
              <li v-for="(goal, i) in parsedLongTermGoals" :key="'lt-' + i">{{ goal }}</li>
            </ul>
          </div>
          <div v-if="parsedShortTermGoals.length" class="goal-list-detail">
            <div class="goal-label">短期目标：</div>
            <ul>
              <li v-for="(goal, i) in parsedShortTermGoals" :key="'st-' + i">{{ goal }}</li>
            </ul>
          </div>
        </div>

        <!-- 资源列表 -->
        <div class="detail-section">
          <h4>训练资源</h4>
          <div v-if="planResources.length === 0" class="empty-resources">
            暂无训练资源
          </div>
          <div v-else class="detail-resource-list">
            <div
              v-for="resource in planResources"
              :key="resource.id"
              class="detail-resource-item"
              :class="{ 'detail-resource-item--interactive': canStartPlanResource(resource) }"
              @click="handleLaunchCurrentPlanResource(resource)"
            >
              <img :src="getResourceImage(resource)" class="detail-resource-cover" />
              <div class="detail-resource-info">
                <div class="detail-resource-name-row">
                  <div class="detail-resource-name">{{ resource.resource_name }}</div>
                  <el-tag size="small" effect="plain">
                    {{ getResourceTypeLabel(resource.resource_type) }}
                  </el-tag>
                </div>
                <div class="detail-resource-config">
                  <span v-if="resource.frequency">每周 {{ resource.frequency }} 次</span>
                  <span v-if="resource.duration_minutes">，每次 {{ resource.duration_minutes }} 分钟</span>
                </div>
                <div v-if="resource.notes" class="detail-resource-notes">
                  教学提示：{{ resource.notes }}
                </div>
              </div>
              <div class="detail-resource-actions">
                <el-button
                  :type="getPlanResourceActionType(resource)"
                  plain
                  size="small"
                  :disabled="!canStartPlanResource(resource)"
                  @click.stop="handleLaunchCurrentPlanResource(resource)"
                >
                  {{ getPlanResourceActionLabel(resource) }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus, Search, Calendar, Delete, Check, Sunny, MoreFilled
} from '@element-plus/icons-vue'
import { PlanAPI, type TrainingPlan, type PlanStatus, type PlanResourceMap } from '@/database/plan-api'
import { ResourceAPI } from '@/database/resource-api'
import { StudentAPI } from '@/database/api'
import {
  TASK_TRAINING_MODULE_CODE,
  TASK_TRAINING_RESOURCE_TYPE,
} from '@/features/self-care/task-training-contract'
import type { ResourceItem } from '@/types/module'
import { ModuleCode } from '@/types/module'
import {
  EQUIPMENT_CATALOG_GROUPS,
  EQUIPMENT_CATALOG_GROUP_LABELS,
  getEquipmentCatalogGroupLabel,
  resolveEquipmentCatalogGroupCode,
  type EquipmentCatalogGroupCode,
} from '@/utils/equipment-catalog-group'
import { buildTrainingLaunchRoute } from '@/utils/training-launch'
import { resolveResourceCoverImage, resolveResourceItemCoverImage } from '@/utils/resource-cover'
import {
  TRAINING_PLAN_FILTER_MODULE_OPTIONS,
  TRAINING_PLAN_MODULE_OPTIONS,
  getTrainingPlanModuleLabel,
  matchesTrainingPlanModule,
  normalizeTrainingPlanModuleCode,
  type TrainingPlanFilterModuleCode,
  type TrainingPlanModuleCode,
} from '@/utils/training-plan-module'
import { STANDARD_DATE_RANGE_PICKER_PROPS } from '@/utils/date-picker'
import StudentAvatar from '@/components/student/StudentAvatar.vue'
import DiagnosisTag from '@/components/student/DiagnosisTag.vue'

// 类型定义
interface Student {
  id: number
  name: string
  gender?: 'male' | 'female' | '男' | '女'
  disorder?: string
  student_no?: string
  avatar_path?: string
}

interface SelectedResource extends PlanResourceMap {
  resource_name: string
  resource_type: string
  cover_image?: string
  module_code?: string
}

// 状态
const loading = ref(false)
const plans = ref<TrainingPlan[]>([])
const studentList = ref<Student[]>([])
const planResourceCounts = ref<Record<number, number>>({})

// 筛选状态
const filterStatus = ref('')
const filterModule = ref<TrainingPlanFilterModuleCode>('')
const filterStudentId = ref<number | ''>('')
const searchKeyword = ref('')
const statusTabs = [
  { label: '全部', value: '' },
  { label: '执行中', value: 'active' },
  { label: '待开始', value: 'draft' },
  { label: '已完成', value: 'completed' },
] as const

// 弹窗状态
const createDialogVisible = ref(false)
const editingPlan = ref<TrainingPlan | null>(null)
const activeTab = ref('basic')
const planFormRef = ref<FormInstance>()

// 表单数据
const planForm = ref({
  name: '',
  student_id: null as number | null,
  module_code: 'all' as TrainingPlanModuleCode,
  dateRange: [] as string[],
  description: '',
  long_term_goals: [] as string[],
  short_term_goals: [] as string[]
})

// 表单验证规则
const planRules: FormRules = {
  name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  student_id: [{ required: true, message: '请选择关联学生', trigger: 'change' }],
  module_code: [{ required: true, message: '请选择归属模块', trigger: 'change' }],
  dateRange: [{ required: true, message: '请选择计划周期', trigger: 'change' }]
}

// 已选资源
const selectedResources = ref<SelectedResource[]>([])

// 资源选择器状态
const resourceSelectorVisible = ref(false)
const resourceFilterModule = ref<'all' | ModuleCode>('all')
const resourceFilterType = ref('')
const resourceFilterCatalogGroup = ref<'all' | EquipmentCatalogGroupCode>('all')
const resourceSearchKeyword = ref('')
const resourceLoading = ref(false)
const availableResources = ref<ResourceItem[]>([])
const tempSelectedResources = ref<ResourceItem[]>([])

// 详情抽屉
const detailDrawerVisible = ref(false)
const currentPlan = ref<TrainingPlan | null>(null)
const planResources = ref<PlanResourceMap[]>([])

// 计划资源缓存（用于列表展示）
const planResourcesMap = ref<Record<number, PlanResourceMap[]>>({})

// 今日已完成资源缓存（学生ID + 资源ID -> 是否完成）
const todayCompletedResources = ref<Set<string>>(new Set())

const EXTRA_RESOURCE_TYPE_LABELS: Record<string, string> = {
  emotion_scene: '情绪场景',
  care_scene: '表达关心',
  [TASK_TRAINING_RESOURCE_TYPE]: '自理任务',
}

// API 实例
const planApi = new PlanAPI()
const studentApi = new StudentAPI()
const router = useRouter()
const trainingPlanFilterModuleOptions = TRAINING_PLAN_FILTER_MODULE_OPTIONS
const trainingPlanModuleOptions = TRAINING_PLAN_MODULE_OPTIONS
const standardDateRangePickerProps = STANDARD_DATE_RANGE_PICKER_PROPS

// 计算属性
const filteredPlans = computed(() => {
  let result = plans.value

  if (filterStatus.value) {
    result = result.filter(p => p.status === filterStatus.value)
  }

  if (filterModule.value) {
    result = result.filter(p => matchesTrainingPlanModule(p.module_code, filterModule.value))
  }

  if (filterStudentId.value !== '') {
    result = result.filter(p => p.student_id === filterStudentId.value)
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      (p.description && p.description.toLowerCase().includes(keyword))
    )
  }

  return result
})

const summaryStats = computed(() => {
  const source = filteredPlans.value
  return {
    total: source.length,
    active: source.filter(plan => plan.status === 'active').length,
    pending: source.filter(plan => plan.status === 'draft').length,
    students: new Set(source.map(plan => plan.student_id)).size,
  }
})

const studentLookup = computed<Record<number, Student>>(() =>
  studentList.value.reduce((acc, student) => {
    acc[student.id] = student
    return acc
  }, {} as Record<number, Student>)
)

const equipmentCatalogGroupOptions = computed(() =>
  EQUIPMENT_CATALOG_GROUPS.map((value) => ({
    value,
    label: EQUIPMENT_CATALOG_GROUP_LABELS[value],
  }))
)

const filteredAvailableResources = computed(() => {
  if (resourceFilterType.value !== 'equipment' || resourceFilterCatalogGroup.value === 'all') {
    return availableResources.value
  }

  return availableResources.value.filter((resource) =>
    resource.resourceType === 'equipment'
    && resolveEquipmentCatalogGroupCode(resource) === resourceFilterCatalogGroup.value
  )
})

const parsedLongTermGoals = computed(() => {
  if (!currentPlan.value?.long_term_goals) return []
  try {
    return JSON.parse(currentPlan.value.long_term_goals)
  } catch {
    return []
  }
})

const parsedShortTermGoals = computed(() => {
  if (!currentPlan.value?.short_term_goals) return []
  try {
    return JSON.parse(currentPlan.value.short_term_goals)
  } catch {
    return []
  }
})

// 数据加载方法
async function loadPlans() {
  loading.value = true
  try {
    plans.value = planApi.getAllPlans()
    // 加载每个计划的资源数量和资源列表
    for (const plan of plans.value) {
      const stats = planApi.getPlanStats(plan.id)
      planResourceCounts.value[plan.id] = stats.total_resources

      // 缓存资源列表（仅执行中的计划需要）
      if (plan.status === 'active') {
        planResourcesMap.value[plan.id] = planApi.getPlanResources(plan.id)
      }
    }

    // 加载今日已完成资源
    await loadTodayCompletedResources()
  } catch (error) {
    console.error('加载计划列表失败:', error)
    ElMessage.error('加载计划列表失败')
  } finally {
    loading.value = false
  }
}

// 加载今日已完成的训练资源
async function loadTodayCompletedResources() {
  try {
    todayCompletedResources.value = planApi.getTodayCompletedResources()
  } catch (error) {
    console.error('加载今日训练记录失败:', error)
  }
}

async function loadStudents() {
  try {
    const students = await studentApi.getAllStudents()
    studentList.value = students || []
  } catch (error) {
    console.error('加载学生列表失败:', error)
  }
}

function getPlanResourceCount(planId: number): number {
  return planResourceCounts.value[planId] || 0
}

function getVisiblePlanResources(planId: number): PlanResourceMap[] {
  const resources = getPlanResources(planId)
  if (resources.length <= 4) {
    return resources
  }
  return resources.slice(0, 3)
}

function getOverflowResourceCount(planId: number): number {
  const resources = getPlanResources(planId)
  return resources.length > 4 ? resources.length - 3 : 0
}

// 工具方法
function getStatusType(status: PlanStatus): 'info' | 'warning' | 'success' | '' {
  const typeMap: Record<PlanStatus, 'info' | 'warning' | 'success' | ''> = {
    draft: 'info',
    active: 'warning',
    completed: 'success',
    archived: ''
  }
  return typeMap[status] || 'info'
}

function getStatusLabel(status: PlanStatus): string {
  const labelMap: Record<PlanStatus, string> = {
    draft: '草稿',
    active: '执行中',
    completed: '已完成',
    archived: '已归档'
  }
  return labelMap[status] || status
}

function getStatusBadgeClass(status: PlanStatus): string {
  const classMap: Record<PlanStatus, string> = {
    active: 'plan-status-badge--active',
    draft: 'plan-status-badge--draft',
    completed: 'plan-status-badge--completed',
    archived: 'plan-status-badge--archived',
  }
  return classMap[status] || 'plan-status-badge--draft'
}

function getModuleLabel(moduleCode?: string): string {
  return getTrainingPlanModuleLabel(moduleCode)
}

function getResourceTypeLabel(type?: string): string {
  const labelMap: Record<string, string> = {
    equipment: '器材',
    game: '游戏',
    flashcard: '闪卡',
    document: '文档'
  }
  if (!type) return '未分类'
  return EXTRA_RESOURCE_TYPE_LABELS[type] || labelMap[type] || type
}

function getEquipmentResourceCatalogGroupLabel(resource: ResourceItem): string {
  return getEquipmentCatalogGroupLabel(resource)
}

function getPlanResourceCatalogGroupLabel(resource: PlanResourceMap): string {
  return getEquipmentCatalogGroupLabel({
    moduleCode: resource.module_code,
    category: resource.category,
    metadata: resource.meta_data,
  })
}

function canStartPlanResource(resource: PlanResourceMap): boolean {
  return Boolean(resource.resource_type)
}

function getPlanResourceActionLabel(resource: PlanResourceMap): string {
  switch (resource.resource_type) {
    case 'equipment':
      return '开始录入'
    case 'document':
    case 'video':
      return '打开预览'
    case 'game':
    case 'flashcard':
    case 'emotion_scene':
    case 'care_scene':
      return '开始训练'
    default:
      return '打开'
  }
}

function getPlanResourceActionType(resource: PlanResourceMap): 'primary' | 'success' | 'info' {
  switch (resource.resource_type) {
    case 'equipment':
      return 'success'
    case 'document':
    case 'video':
      return 'info'
    default:
      return 'primary'
  }
}

function handleLaunchCurrentPlanResource(resource: PlanResourceMap) {
  if (!currentPlan.value || !canStartPlanResource(resource)) {
    return
  }

  void handleLaunchTraining(currentPlan.value, resource)
}

// 获取计划资源列表（从缓存）
function getPlanResources(planId: number): PlanResourceMap[] {
  return planResourcesMap.value[planId] || []
}

// 检查资源今日是否已完成
function isResourceCompletedToday(studentId: number, resourceId: number): boolean {
  return todayCompletedResources.value.has(`${studentId}-${resourceId}`)
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return '-'
  return `${start} → ${end}`
}

function getPlanProgress(plan: TrainingPlan): number {
  if (plan.status === 'draft') return 0
  if (plan.status === 'completed' || plan.status === 'archived') return 100
  if (!plan.start_date || !plan.end_date) return 0
  const start = new Date(plan.start_date).getTime()
  const end = new Date(plan.end_date).getTime()
  const now = Date.now()

  if (now < start) return 0
  if (now > end) return 100

  return Math.round(((now - start) / (end - start)) * 100)
}

function getPlanResourceCoverImage(resource: PlanResourceMap): string {
  const resolved = resolveResourceCoverImage({
    resourceType: resource.resource_type,
    name: resource.resource_name,
    category: resource.category,
    coverImage: resource.cover_image,
    legacyId: Number(resource.legacy_id || 0) || undefined,
    metadata: resource.meta_data,
  })

  if (!resolved) {
    return ''
  }

  if (!resolved.includes('/') && !resolved.startsWith('data:') && !resolved.startsWith('blob:') && !resolved.includes('://')) {
    return ''
  }

  return resolved
}

function getResourceInitial(name?: string | null): string {
  const trimmed = String(name || '').trim()
  return trimmed ? trimmed.charAt(0) : '训'
}

function getResourceImage(resource: PlanResourceMap): string {
  const resolved = resolveResourceCoverImage({
    resourceType: resource.resource_type,
    name: resource.resource_name,
    category: resource.category,
    coverImage: resource.cover_image,
    legacyId: Number(resource.legacy_id || 0) || undefined,
    metadata: resource.meta_data,
  })

  if (resolved) {
    if (!String(resolved).includes('/') && !String(resolved).startsWith('data:') && !String(resolved).includes('://')) {
      return buildEmojiThumbnail(String(resolved))
    }
    return resolved
  }
  // 使用默认图片逻辑
  return buildEmojiThumbnail('📦')
}

function getResourceItemImage(resource: ResourceItem): string {
  const resolved = resolveResourceItemCoverImage(resource)
  if (resolved) {
    if (!String(resolved).includes('/') && !String(resolved).startsWith('data:') && !String(resolved).includes('://')) {
      return buildEmojiThumbnail(String(resolved))
    }
    return resolved
  }
  return buildEmojiThumbnail('📦')
}

// 筛选处理
function handleFilterChange() {
  // 筛选由计算属性自动处理
}

function buildEmojiThumbnail(symbol: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="24" fill="#fff7ed" />
      <text x="48" y="56" font-size="40" text-anchor="middle">${symbol}</text>
    </svg>
  `
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function handleSearch() {
  // 搜索由计算属性自动处理
}

function handlePlanMenuCommand(plan: TrainingPlan, command: string) {
  if (command === 'edit') {
    handleEditPlan(plan)
    return
  }

  if (command === 'delete') {
    handleDeletePlan(plan)
  }
}

// 目标管理
function addLongTermGoal() {
  planForm.value.long_term_goals.push('')
}

function removeLongTermGoal(index: number) {
  planForm.value.long_term_goals.splice(index, 1)
}

function addShortTermGoal() {
  planForm.value.short_term_goals.push('')
}

function removeShortTermGoal(index: number) {
  planForm.value.short_term_goals.splice(index, 1)
}

// 计划操作
function handleCreatePlan() {
  editingPlan.value = null
  activeTab.value = 'basic'
  planForm.value = {
    name: '',
    student_id: null,
    module_code: 'all',
    dateRange: [],
    description: '',
    long_term_goals: [],
    short_term_goals: []
  }
  selectedResources.value = []
  createDialogVisible.value = true
}

function handleEditPlan(plan: TrainingPlan) {
  editingPlan.value = plan
  activeTab.value = 'basic'

  // 解析目标
  let longTermGoals: string[] = []
  let shortTermGoals: string[] = []
  try {
    longTermGoals = plan.long_term_goals ? JSON.parse(plan.long_term_goals) : []
  } catch {}
  try {
    shortTermGoals = plan.short_term_goals ? JSON.parse(plan.short_term_goals) : []
  } catch {}

  planForm.value = {
    name: plan.name,
    student_id: plan.student_id,
    module_code: normalizeTrainingPlanModuleCode(plan.module_code) || 'all',
    dateRange: [plan.start_date, plan.end_date],
    description: plan.description || '',
    long_term_goals: longTermGoals,
    short_term_goals: shortTermGoals
  }

  // 加载已选资源
  const resources = planApi.getPlanResources(plan.id)
  selectedResources.value = resources as SelectedResource[]

  createDialogVisible.value = true
}

async function handleSavePlan(targetStatus: PlanStatus = 'draft') {
  if (!planFormRef.value) return

  try {
    await planFormRef.value.validate()
  } catch {
    ElMessage.warning('请填写必填项')
    return
  }

  if (!planForm.value.dateRange || planForm.value.dateRange.length < 2) {
    ElMessage.warning('请选择计划周期')
    return
  }

  try {
    // 过滤空目标
    const longTermGoals = planForm.value.long_term_goals.filter(g => g.trim())
    const shortTermGoals = planForm.value.short_term_goals.filter(g => g.trim())

    if (editingPlan.value) {
      // 更新计划
      planApi.updatePlan(editingPlan.value.id, {
        name: planForm.value.name,
        module_code: planForm.value.module_code,
        start_date: planForm.value.dateRange[0] ?? '',
        end_date: planForm.value.dateRange[1] ?? '',
        description: planForm.value.description,
        long_term_goals: longTermGoals.length > 0 ? longTermGoals : null,
        short_term_goals: shortTermGoals.length > 0 ? shortTermGoals : null
      })

      // 更新资源
      // 先删除所有旧资源
      const oldResources = planApi.getPlanResources(editingPlan.value.id)
      for (const res of oldResources) {
        planApi.removeResourceFromPlan(editingPlan.value.id, res.resource_id)
      }

      // 添加新资源
      for (const res of selectedResources.value) {
        planApi.addResourceToPlan({
          plan_id: editingPlan.value.id,
          resource_id: res.resource_id,
          frequency: res.frequency || undefined,
          duration_minutes: res.duration_minutes || undefined,
          notes: res.notes || undefined
        })
      }

      ElMessage.success('计划更新成功')
    } else {
      // 创建计划
      const planId = planApi.createPlan({
        name: planForm.value.name,
        student_id: planForm.value.student_id!,
        module_code: planForm.value.module_code,
        start_date: planForm.value.dateRange[0] ?? '',
        end_date: planForm.value.dateRange[1] ?? '',
        description: planForm.value.description,
        long_term_goals: longTermGoals.length > 0 ? longTermGoals : null,
        short_term_goals: shortTermGoals.length > 0 ? shortTermGoals : null
      })

      // 添加资源
      for (const res of selectedResources.value) {
        planApi.addResourceToPlan({
          plan_id: planId,
          resource_id: res.resource_id,
          frequency: res.frequency || undefined,
          duration_minutes: res.duration_minutes || undefined,
          notes: res.notes || undefined
        })
      }

      ElMessage.success('计划创建成功')
    }

    createDialogVisible.value = false
    loadPlans()
  } catch (error) {
    console.error('保存计划失败:', error)
    ElMessage.error('保存计划失败')
  }
}

function handleViewPlan(plan: TrainingPlan) {
  currentPlan.value = plan
  planResources.value = planApi.getPlanResources(plan.id)
  detailDrawerVisible.value = true
}

/**
 * 智能跳转：根据资源类型启动不同的训练入口
 *
 * 路由传参说明：
 * - equipment: /equipment/quick-entry/:studentId?equipmentId=xxx&planId=xxx&from=plan
 * - game: /games/play?studentId=xxx&gameId=xxx&from=plan
 * - document/video: 直接打开预览
 */
async function handleLaunchTraining(plan: TrainingPlan, resource: PlanResourceMap) {
  const { student_id } = plan
  const { resource_id, resource_type, resource_name } = resource

  if (!resource_type) {
    ElMessage.warning('当前资源缺少启动类型，无法直接开始训练')
    return
  }

  if (resource_type === 'document' || resource_type === 'video') {
    await handlePreviewResource(resource)
    return
  }

  const target = buildTrainingLaunchRoute({
    studentId: student_id,
    studentName: plan.student_name || undefined,
    planId: plan.id,
    source: 'plan',
    moduleCode: plan.module_code,
    resourceId: resource_id,
    resourceType: resource_type,
    resourceName: resource_name,
    resourceModuleCode: resource.module_code,
  })

  if (!target) {
    ElMessage.warning(`暂不支持「${resource_type}」类型的训练入口`)
    return
  }

  detailDrawerVisible.value = false
  router.push(target)
  ElMessage.success(`正在启动「${resource_name}」训练...`)
}

// 预览文档/视频资源
async function handlePreviewResource(resource: PlanResourceMap) {
  try {
    const { resourceManager } = await import('@/utils/resource-manager')

    // 获取资源路径（需要从数据库查询）
    const resourceApi = new ResourceAPI()
    const fullResource = resourceApi.getResourceById(resource.resource_id)

    if (!fullResource) {
      ElMessage.error('资源不存在')
      return
    }

    // 使用系统默认程序打开
    const resourcePath = (fullResource.metadata?.path as string | undefined)
      || fullResource.legacySource
      || ''
    await resourceManager.openWithSystem(resourcePath)
    ElMessage.success(`已打开「${resource.resource_name}」`)
  } catch (error) {
    console.error('打开资源失败:', error)
    ElMessage.error('打开资源失败')
  }
}

async function handleStartPlan(plan: TrainingPlan) {
  try {
    await ElMessageBox.confirm(
      `确定要将计划「${plan.name}」设为执行中吗？`,
      '开始执行',
      { type: 'warning' }
    )

    planApi.updatePlanStatus(plan.id, 'active')
    ElMessage.success('计划已开始执行')
    loadPlans()
  } catch {}
}

async function handleDeletePlan(plan: TrainingPlan) {
  try {
    await ElMessageBox.confirm(
      `确定要删除计划「${plan.name}」吗？此操作可以恢复。`,
      '确认删除',
      { type: 'warning' }
    )

    planApi.deletePlan(plan.id)
    ElMessage.success('计划已删除')
    loadPlans()
  } catch {}
}

// 资源选择器
function showResourceSelector() {
  tempSelectedResources.value = []
  resourceSelectorVisible.value = true
  loadResourcesForSelection()
}

async function loadResourcesForSelection() {
  resourceLoading.value = true
  try {
    const api = new ResourceAPI()
    const moduleCode = resourceFilterModule.value === 'all' ? 'sensory' : resourceFilterModule.value

    const queryOptions: any = {
      moduleCode: moduleCode as ModuleCode,
      resourceType: resourceFilterType.value || undefined,
      keyword: resourceSearchKeyword.value || undefined
    }

    // 如果选择全部模块，需要分别查询
    if (resourceFilterModule.value === 'all') {
      const allResources: ResourceItem[] = []
      const modules: ModuleCode[] = [
        ModuleCode.SENSORY,
        ModuleCode.EMOTIONAL,
        ModuleCode.SOCIAL,
        TASK_TRAINING_MODULE_CODE as ModuleCode,
      ]

      for (const mod of modules) {
        queryOptions.moduleCode = mod
        const data = api.getResources(queryOptions)
        allResources.push(...data)
      }

      availableResources.value = allResources
    } else {
      availableResources.value = api.getResources(queryOptions)
    }
  } catch (error) {
    console.error('加载资源失败:', error)
    ElMessage.error('加载资源失败')
  } finally {
    resourceLoading.value = false
  }
}

let searchDebounce: number | null = null
function debouncedResourceSearch() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    loadResourcesForSelection()
  }, 300) as unknown as number
}

function isResourceSelected(resourceId: number): boolean {
  return tempSelectedResources.value.some(r => r.id === resourceId) ||
         selectedResources.value.some(r => r.resource_id === resourceId)
}

function toggleResourceSelection(resource: ResourceItem) {
  const index = tempSelectedResources.value.findIndex(r => r.id === resource.id)
  if (index >= 0) {
    tempSelectedResources.value.splice(index, 1)
  } else {
    // 检查是否已在已选列表中
    if (!selectedResources.value.some(r => r.resource_id === resource.id)) {
      tempSelectedResources.value.push(resource)
    }
  }
}

function confirmResourceSelection() {
  const addedCount = tempSelectedResources.value.length
  for (const resource of tempSelectedResources.value) {
    selectedResources.value.push({
      id: 0,
      plan_id: editingPlan.value?.id || 0,
      resource_id: resource.id,
      resource_name: resource.name,
      resource_type: resource.resourceType,
      cover_image: resource.coverImage,
      legacy_id: resource.legacyId ?? null,
      meta_data: resource.metadata ? JSON.stringify(resource.metadata) : null,
      module_code: resource.moduleCode,
      category: resource.category,
      frequency: 3,
      duration_minutes: 15,
      notes: '',
      sort_order: selectedResources.value.length,
      created_at: new Date().toISOString()
    })
  }

  tempSelectedResources.value = []
  resourceSelectorVisible.value = false
  ElMessage.success(`已添加 ${addedCount} 个资源`)
}

function removeResource(index: number) {
  selectedResources.value.splice(index, 1)
}

watch(resourceFilterType, (newType) => {
  if (newType !== 'equipment') {
    resourceFilterCatalogGroup.value = 'all'
  }
})

// 初始化
onMounted(() => {
  loadPlans()
  loadStudents()
})
</script>

<style scoped>
.plan-filter-section {
  margin-bottom: 20px;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.status-pill-list {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 0;
}

.status-pill-list::-webkit-scrollbar {
  height: 6px;
}

.status-pill-list::-webkit-scrollbar-thumb {
  background: rgba(164, 157, 146, 0.55);
  border-radius: 999px;
}

.status-pill {
  border: 1px solid rgba(191, 200, 214, 0.95);
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-text-secondary, #606266);
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 14px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.22s ease;
}

.status-pill:hover {
  color: var(--scgp-text);
  border-color: #afcfff;
  transform: translateY(-1px);
}

.status-pill.is-active {
  color: #2f74d0;
  border-color: #66a8ff;
  background: #edf4ff;
  box-shadow: 0 10px 20px rgba(102, 168, 255, 0.12);
}

.filter-toolbar__divider {
  width: 1px;
  height: 32px;
  background: #dcdfe6;
  flex-shrink: 0;
}

.compact-selects {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compact-selects :deep(.el-select) {
  width: 170px;
}

.compact-selects :deep(.el-input__wrapper) {
  min-height: 40px;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(220, 223, 230, 0.9) inset;
}

.plan-search {
  width: 180px;
  margin-left: auto;
}

.plan-search :deep(.el-input__wrapper) {
  min-height: 40px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(220, 223, 230, 0.9) inset;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  min-height: 108px;
  padding: 20px 22px;
  border-radius: 12px;
  background: var(--color-background-secondary, #ffffff);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.summary-card__label {
  color: var(--color-text-secondary, #606266);
  font-size: 13px;
}

.summary-card__value {
  display: inline-flex;
  align-items: flex-end;
  gap: 8px;
}

.summary-card__number {
  color: var(--scgp-text);
  font-size: clamp(34px, 2.8vw, 42px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.summary-card__unit {
  color: var(--color-text-secondary, #606266);
  font-size: 14px;
  line-height: 1.2;
  padding-bottom: 4px;
}

.plan-list {
  min-height: 420px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.94);
}

.plan-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.plan-card {
  display: flex;
  flex-direction: column;
  min-height: 268px;
  border-radius: 12px;
  border: 0.5px solid #e4e7ed;
  background: #fff;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.plan-card:hover {
  border-color: #cadcf3;
  box-shadow: 0 10px 24px rgba(120, 147, 181, 0.12);
  transform: translateY(-1px);
}

.plan-card--active {
  border-color: #185fa5;
}

.plan-card__main {
  cursor: pointer;
  padding: 16px 16px 0;
}

.plan-card__summary {
  position: relative;
  padding-right: 80px;
  margin-bottom: 14px;
}

.plan-status-badge {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  border: 0.5px solid transparent;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.plan-status-badge--active {
  background: #e1f5ee;
  color: #085041;
  border-color: #9fe1cb;
}

.plan-status-badge--draft,
.plan-status-badge--archived {
  background: #f1efe8;
  color: #5f5e5a;
  border-color: #d3d1c7;
}

.plan-status-badge--completed {
  background: #e6f1fb;
  color: #0c447c;
  border-color: #b5d4f4;
}

.plan-card__title {
  margin: 0;
  color: var(--scgp-text);
  font-size: 16px;
  line-height: 1.45;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-card__module {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--color-text-secondary, #606266);
}

.plan-card__meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
}

.plan-card__student-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.plan-card__student-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--scgp-text);
}

.plan-card__date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary, #606266);
}

.plan-card__date-row .el-icon {
  color: var(--color-text-tertiary, #909399);
  font-size: 14px;
}

.plan-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-progress__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--color-text-secondary, #606266);
}

.plan-progress__meta strong {
  color: #185fa5;
  font-size: 11px;
  font-weight: 600;
}

.plan-progress__track {
  height: 4px;
  border-radius: 999px;
  background: #ebeef5;
  overflow: hidden;
}

.plan-progress__fill {
  height: 100%;
  border-radius: inherit;
  background: #185fa5;
}

.today-training-section {
  margin: 0 16px 0;
  padding: 10px 12px;
  border-radius: var(--border-radius-md, 8px);
  background: var(--color-background-secondary, #ffffff);
}

.today-training__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.today-training__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #185fa5;
}

.today-training__title .el-icon {
  font-size: 15px;
}

.today-training__count {
  font-size: 12px;
  color: var(--color-text-secondary, #606266);
}

.resource-recommendations {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resource-recommendation-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: var(--border-radius-md, 8px);
  border: 0.5px solid var(--color-border-secondary, #dcdfe6);
  background: var(--color-background-primary, #ffffff);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.resource-recommendation-item:hover {
  border-color: #b5d4f4;
  box-shadow: 0 6px 16px rgba(24, 95, 165, 0.12);
  transform: translateY(-1px);
}

.resource-recommendation-item.is-completed {
  background: #f6fbff;
  border-color: #b5d4f4;
}

.resource-thumb-shell,
.resource-overflow-indicator {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}

.resource-thumb-shell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #e6f1fb;
  border: 0.5px solid #b5d4f4;
  color: #185fa5;
}

.resource-thumb-shell.has-image {
  background: #ffffff;
}

.resource-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.resource-thumb-fallback {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.resource-completed-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #185fa5;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(24, 95, 165, 0.24);
}

.resource-completed-badge .el-icon {
  font-size: 10px;
}

.resource-recommendation-item__name {
  max-width: 6em;
  font-size: 12px;
  color: var(--color-text-secondary, #606266);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-overflow-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid var(--color-border-secondary, #dcdfe6);
  background: var(--color-background-primary, #ffffff);
  color: var(--color-text-secondary, #606266);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.resource-overflow-indicator:hover {
  border-color: #b5d4f4;
  color: #185fa5;
}

.no-resources-hint {
  font-size: 12px;
  color: var(--color-text-secondary, #606266);
}

.resource-tooltip {
  max-width: 280px;
}

.tooltip-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.tooltip-info {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.tooltip-notes {
  font-size: 12px;
  color: #909399;
  margin: 6px 0;
  padding: 6px;
  background: #f5f7fa;
  border-radius: 4px;
}

.tooltip-action {
  font-size: 12px;
  color: #409eff;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #dcdfe6;
}

.plan-card__footer {
  margin-top: auto;
  padding: 12px 16px 14px;
  border-top: 0.5px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.plan-card__resource-count {
  font-size: 12px;
  color: var(--color-text-tertiary, #909399);
}

.plan-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-primary-action {
  min-height: 28px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 0.5px solid #b5d4f4;
  background: #e6f1fb;
  color: #185fa5;
  font-size: 11px;
  font-weight: 600;
}

.plan-primary-action:hover {
  border-color: #9bc5ef;
  background: #dcecff;
  color: #0f4c8d;
}

.plan-card__menu-button {
  color: #909399;
}

.plan-card__menu-button:hover {
  color: #185fa5;
}

:deep(.plan-card__menu-dropdown .plan-card__menu-item--danger) {
  color: #f56c6c;
}

:deep(.plan-card__menu-dropdown .plan-card__menu-item--danger:hover) {
  color: #f56c6c;
  background: #fef0f0;
}

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-search {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .filter-toolbar {
    align-items: stretch;
  }

  .filter-toolbar__divider {
    display: none;
  }

  .compact-selects {
    width: 100%;
    flex-wrap: wrap;
  }

  .compact-selects :deep(.el-select) {
    width: 100%;
  }

  .status-pill-list {
    width: 100%;
  }

  .plan-cards {
    grid-template-columns: 1fr;
  }

  .plan-card__footer {
    flex-wrap: wrap;
  }
}

@media (max-width: 560px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .plan-list {
    padding: 16px;
  }

  .plan-card__summary {
    padding-right: 0;
  }

  .plan-status-badge {
    position: static;
    margin-bottom: 8px;
  }

  .plan-card__title {
    margin-top: 2px;
  }
}

/* 弹窗样式 */
.plan-dialog :deep(.el-dialog__body) {
  padding-top: 0;
}

.goals-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.goal-group {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.goal-header h4 {
  margin: 0;
  font-size: 15px;
  color: #303133;
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-item {
  display: flex;
  gap: 8px;
}

/* 资源编排样式 */
.resources-section {
  min-height: 300px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  margin: 0;
  font-size: 15px;
  color: #303133;
}

.resource-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.resource-cover {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.resource-info {
  flex: 1;
}

.resource-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.resource-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.resource-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-config .el-row {
  align-items: center;
}

.config-label {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.notes-input {
  margin-top: 8px;
}

/* 资源选择器弹窗 */
.resource-selector-content {
  min-height: 400px;
}

.module-filter,
.type-filter,
.catalog-group-filter {
  margin-bottom: 16px;
}

.resource-search {
  margin-bottom: 16px;
}

.resource-selection-list {
  max-height: 400px;
  overflow-y: auto;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.resource-option {
  position: relative;
  padding: 12px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.resource-option:hover {
  border-color: #409eff;
}

.resource-option.selected {
  border-color: #67c23a;
  background: #f0f9eb;
}

.option-cover {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 8px;
}

.option-info {
  text-align: center;
}

.option-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.option-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.selected-count {
  margin-right: auto;
  color: #909399;
}

/* 详情抽屉 */
.plan-detail {
  padding: 0 20px;
}

.detail-section {
  margin-top: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: #303133;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.goal-list-detail {
  margin-bottom: 12px;
}

.goal-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}

.goal-list-detail ul {
  margin: 0;
  padding-left: 20px;
}

.goal-list-detail li {
  margin-bottom: 4px;
  font-size: 13px;
  color: #303133;
}

.empty-resources {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.detail-resource-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.detail-resource-item--interactive {
  cursor: pointer;
}

.detail-resource-item--interactive:hover {
  border-color: #b5d4f4;
  box-shadow: 0 8px 18px rgba(24, 95, 165, 0.08);
  transform: translateY(-1px);
}

.detail-resource-cover {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.detail-resource-info {
  flex: 1;
}

.detail-resource-name-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.detail-resource-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.detail-resource-config {
  font-size: 12px;
  color: #606266;
}

.detail-resource-notes {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.detail-resource-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
</style>
