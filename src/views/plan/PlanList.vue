<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>训练计划</h1>
        <p class="subtitle">IEP 个性化教育计划管理，承接评估结果，编排跨模块训练资源</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleCreatePlan">
          <el-icon><Plus /></el-icon>
          新建计划
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filterStatus" placeholder="计划状态" clearable @change="handleFilterChange">
            <el-option label="全部状态" value="" />
            <el-option label="草稿" value="draft" />
            <el-option label="执行中" value="active" />
            <el-option label="已完成" value="completed" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterModule" placeholder="归属模块" clearable @change="handleFilterChange">
            <el-option label="全部模块" value="" />
            <el-option label="综合计划" value="all" />
            <el-option label="感官训练" value="sensory" />
            <el-option label="情绪调节" value="emotional" />
            <el-option label="社交互动" value="social" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索计划名称..."
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
      </el-row>
    </div>

    <!-- 计划列表 -->
    <div class="plan-list" v-loading="loading">
      <el-empty v-if="filteredPlans.length === 0" description="暂无训练计划">
        <el-button type="primary" @click="handleCreatePlan">创建第一个计划</el-button>
      </el-empty>

      <div v-else class="plan-cards">
        <div
          v-for="plan in filteredPlans"
          :key="plan.id"
          class="plan-card"
          :class="{ 'active-plan': plan.status === 'active' }"
        >
          <!-- 卡片主体：点击查看详情 -->
          <div class="card-main" @click="handleViewPlan(plan)">
            <div class="card-header">
              <div class="plan-name">{{ plan.name }}</div>
              <el-tag :type="getStatusType(plan.status)" size="small">
                {{ getStatusLabel(plan.status) }}
              </el-tag>
            </div>

            <div class="card-body">
              <div class="info-row">
                <el-icon><User /></el-icon>
                <span>{{ plan.student_name || `学生 #${plan.student_id}` }}</span>
              </div>
              <div class="info-row">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDateRange(plan.start_date, plan.end_date) }}</span>
                <!-- 进度条 -->
                <el-progress
                  v-if="plan.status === 'active'"
                  :percentage="getPlanProgress(plan)"
                  :stroke-width="6"
                  :show-text="false"
                  class="progress-bar"
                />
              </div>
              <div class="info-row">
                <el-icon><Collection /></el-icon>
                <span>{{ getModuleLabel(plan.module_code) }}</span>
              </div>
            </div>
          </div>

          <!-- 今日训练推荐区域（仅执行中的计划显示） -->
          <div v-if="plan.status === 'active'" class="today-training-section" @click.stop>
            <div class="section-title">
              <el-icon><Sunny /></el-icon>
              <span>今日训练推荐</span>
              <el-tag size="small" type="info">{{ getPlanResourceCount(plan.id) }} 项</el-tag>
            </div>
            <div class="resource-icons">
              <el-tooltip
                v-for="resource in getPlanResources(plan.id)"
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
                <div
                  class="resource-icon-wrapper"
                  :class="{
                    'completed-today': isResourceCompletedToday(plan.student_id, resource.resource_id),
                    [getResourceTypeClass(resource.resource_type)]: true
                  }"
                  @click="handleLaunchTraining(plan, resource)"
                >
                  <img
                    :src="getResourceImage(resource)"
                    :alt="resource.resource_name"
                    class="resource-thumb"
                  />
                  <div class="type-indicator">
                    <el-icon v-if="resource.resource_type === 'equipment'"><Basketball /></el-icon>
                    <el-icon v-else-if="resource.resource_type === 'game'"><VideoPlay /></el-icon>
                    <el-icon v-else><Document /></el-icon>
                  </div>
                  <!-- 今日完成标记 -->
                  <div v-if="isResourceCompletedToday(plan.student_id, resource.resource_id)" class="completed-badge">
                    <el-icon><Check /></el-icon>
                  </div>
                </div>
              </el-tooltip>

              <!-- 无资源提示 -->
              <div v-if="getPlanResourceCount(plan.id) === 0" class="no-resources-hint">
                暂未添加训练资源
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="resource-count">
              <el-icon><FolderOpened /></el-icon>
              <span>{{ getPlanResourceCount(plan.id) }} 个资源</span>
            </div>
            <div class="actions">
              <el-button
                v-if="plan.status === 'draft'"
                type="success"
                size="small"
                @click.stop="handleStartPlan(plan)"
              >
                开始执行
              </el-button>
              <el-button text size="small" @click.stop="handleEditPlan(plan)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text size="small" @click.stop="handleDeletePlan(plan)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

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
                    <el-option label="综合计划" value="all" />
                    <el-option label="感官训练" value="sensory" />
                    <el-option label="情绪调节" value="emotional" />
                    <el-option label="社交互动" value="social" />
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
            <el-radio-button label="all">全部模块</el-radio-button>
            <el-radio-button label="sensory">感官训练</el-radio-button>
            <el-radio-button label="emotional">情绪调节</el-radio-button>
            <el-radio-button label="social">社交互动</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 资源类型筛选 -->
        <div class="type-filter">
          <el-radio-group v-model="resourceFilterType" @change="loadResourcesForSelection">
            <el-radio-button label="">全部类型</el-radio-button>
            <el-radio-button label="equipment">器材</el-radio-button>
            <el-radio-button label="game">游戏</el-radio-button>
            <el-radio-button label="flashcard">闪卡</el-radio-button>
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
          <el-empty v-if="availableResources.length === 0" description="暂无可用资源" />

          <div v-else class="resource-grid">
            <div
              v-for="resource in availableResources"
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
                    {{ getResourceTypeLabel(resource.resource_type) }}
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
            <div v-for="resource in planResources" :key="resource.id" class="detail-resource-item">
              <img :src="getResourceImage(resource)" class="detail-resource-cover" />
              <div class="detail-resource-info">
                <div class="detail-resource-name">{{ resource.resource_name }}</div>
                <div class="detail-resource-config">
                  <span v-if="resource.frequency">每周 {{ resource.frequency }} 次</span>
                  <span v-if="resource.duration_minutes">，每次 {{ resource.duration_minutes }} 分钟</span>
                </div>
                <div v-if="resource.notes" class="detail-resource-notes">
                  教学提示：{{ resource.notes }}
                </div>
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
  Plus, Search, User, Calendar, Collection, FolderOpened, Edit, Delete, Check,
  Sunny, Basketball, VideoPlay, Document
} from '@element-plus/icons-vue'
import { PlanAPI, type TrainingPlan, type PlanStatus, type PlanResourceMap } from '@/database/plan-api'
import { ResourceAPI } from '@/database/resource-api'
import { DatabaseAPI, StudentAPI } from '@/database/api'
import type { ResourceItem, ModuleCode } from '@/types/module'
import { getEquipmentImageUrl } from '@/assets/images/equipment/images'

// 类型定义
interface Student {
  id: number
  name: string
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
const filterModule = ref('')
const searchKeyword = ref('')

// 弹窗状态
const createDialogVisible = ref(false)
const editingPlan = ref<TrainingPlan | null>(null)
const activeTab = ref('basic')
const planFormRef = ref<FormInstance>()

// 表单数据
const planForm = ref({
  name: '',
  student_id: null as number | null,
  module_code: 'all',
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
const resourceFilterModule = ref('all')
const resourceFilterType = ref('')
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

// API 实例
const planApi = new PlanAPI()
const dbApi = new DatabaseAPI()
const studentApi = new StudentAPI()
const router = useRouter()

// 计算属性
const filteredPlans = computed(() => {
  let result = plans.value

  if (filterStatus.value) {
    result = result.filter(p => p.status === filterStatus.value)
  }

  if (filterModule.value) {
    result = result.filter(p => p.module_code === filterModule.value)
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      (p.description && p.description.toLowerCase().includes(keyword))
    )
  }

  return result
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

function getModuleLabel(moduleCode: string): string {
  const labelMap: Record<string, string> = {
    all: '综合计划',
    sensory: '感官训练',
    emotional: '情绪调节',
    social: '社交互动'
  }
  return labelMap[moduleCode] || moduleCode
}

function getResourceTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    equipment: '器材',
    game: '游戏',
    flashcard: '闪卡',
    document: '文档'
  }
  return labelMap[type] || type
}

// 获取计划资源列表（从缓存）
function getPlanResources(planId: number): PlanResourceMap[] {
  return planResourcesMap.value[planId] || []
}

// 检查资源今日是否已完成
function isResourceCompletedToday(studentId: number, resourceId: number): boolean {
  return todayCompletedResources.value.has(`${studentId}-${resourceId}`)
}

// 获取资源类型的 CSS 类名
function getResourceTypeClass(type: string): string {
  const classMap: Record<string, string> = {
    equipment: 'type-equipment',
    game: 'type-game',
    flashcard: 'type-flashcard',
    document: 'type-document'
  }
  return classMap[type] || ''
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return '-'
  return `${start} ~ ${end}`
}

function getPlanProgress(plan: TrainingPlan): number {
  if (!plan.start_date || !plan.end_date) return 0
  const start = new Date(plan.start_date).getTime()
  const end = new Date(plan.end_date).getTime()
  const now = Date.now()

  if (now < start) return 0
  if (now > end) return 100

  return Math.round(((now - start) / (end - start)) * 100)
}

function getResourceImage(resource: PlanResourceMap): string {
  if (resource.cover_image) {
    return resource.cover_image
  }
  // 使用默认图片逻辑
  return getEquipmentImageUrl('tactile', 1, resource.resource_name || '')
}

function getResourceItemImage(resource: ResourceItem): string {
  const id = resource.legacyId ?? resource.id
  return getEquipmentImageUrl(resource.category as any, id, resource.name)
}

// 筛选处理
function handleFilterChange() {
  // 筛选由计算属性自动处理
}

function handleSearch() {
  // 搜索由计算属性自动处理
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
    module_code: plan.module_code,
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
        module_code: planForm.value.module_code as any,
        start_date: planForm.value.dateRange[0],
        end_date: planForm.value.dateRange[1],
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
        module_code: planForm.value.module_code as any,
        start_date: planForm.value.dateRange[0],
        end_date: planForm.value.dateRange[1],
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
function handleLaunchTraining(plan: TrainingPlan, resource: PlanResourceMap) {
  const { student_id } = plan
  const { resource_id, resource_type, resource_name } = resource

  // 关闭详情抽屉（如果打开的话）
  detailDrawerVisible.value = false

  switch (resource_type) {
    case 'equipment':
      // 器材类型：跳转到器材录入页，自动预选学生和器材
      router.push({
        path: `/equipment/quick-entry/${student_id}`,
        query: {
          equipmentId: resource_id,
          planId: plan.id,
          from: 'plan',
          resourceName: resource_name
        }
      })
      ElMessage.success(`正在启动「${resource_name}」训练...`)
      break

    case 'game':
      // 游戏类型：跳转到游戏页面
      router.push({
        path: '/games/play',
        query: {
          studentId: student_id,
          gameId: resource_id,
          planId: plan.id,
          from: 'plan'
        }
      })
      ElMessage.success(`正在启动游戏「${resource_name}」...`)
      break

    case 'flashcard':
      // 闪卡类型：跳转到闪卡游戏
      router.push({
        path: '/games/play',
        query: {
          studentId: student_id,
          flashcardId: resource_id,
          planId: plan.id,
          from: 'plan'
        }
      })
      ElMessage.success(`正在启动闪卡「${resource_name}」...`)
      break

    case 'document':
    case 'video':
      // 文档/视频类型：直接打开预览（使用 openResource 方法）
      handlePreviewResource(resource)
      break

    default:
      ElMessage.warning(`暂不支持「${resource_type}」类型的训练入口`)
  }
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
    await resourceManager.openWithSystem(fullResource.path || '')
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
      const modules: ModuleCode[] = ['sensory', 'emotional', 'social']

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
  for (const resource of tempSelectedResources.value) {
    selectedResources.value.push({
      id: 0,
      plan_id: editingPlan.value?.id || 0,
      resource_id: resource.id,
      resource_name: resource.name,
      resource_type: resource.resource_type,
      cover_image: resource.cover_image,
      module_code: resource.module_code,
      frequency: 3,
      duration_minutes: 15,
      notes: '',
      sort_order: selectedResources.value.length,
      created_at: new Date().toISOString()
    })
  }

  tempSelectedResources.value = []
  resourceSelectorVisible.value = false
  ElMessage.success(`已添加 ${tempSelectedResources.value.length || selectedResources.value.length} 个资源`)
}

function removeResource(index: number) {
  selectedResources.value.splice(index, 1)
}

// 初始化
onMounted(() => {
  loadPlans()
  loadStudents()
})
</script>

<style scoped>
/* 计划列表 */
.plan-list {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
}

.plan-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.plan-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.plan-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.plan-card.active-plan {
  border-color: #67c23a;
  background: linear-gradient(to bottom, #f0f9eb, #fff);
}

.card-main {
  cursor: pointer;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-body {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.info-row .el-icon {
  color: #909399;
}

.progress-bar {
  flex: 1;
  margin-left: 8px;
}

/* 今日训练推荐区域 */
.today-training-section {
  margin: 12px 0;
  padding: 12px;
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  border-radius: 8px;
  border: 1px solid #c2e7b0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #67c23a;
}

.section-title .el-icon {
  font-size: 16px;
}

.resource-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resource-icon-wrapper {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.resource-icon-wrapper:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.resource-icon-wrapper.type-equipment {
  border-color: #409eff;
}

.resource-icon-wrapper.type-game {
  border-color: #e6a23c;
}

.resource-icon-wrapper.type-flashcard {
  border-color: #909399;
}

.resource-icon-wrapper.type-document {
  border-color: #67c23a;
}

.resource-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.type-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
}

.completed-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: badge-pop 0.3s ease;
}

@keyframes badge-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.resource-icon-wrapper.completed-today {
  opacity: 0.7;
}

.resource-icon-wrapper.completed-today::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(103, 194, 58, 0.2);
  pointer-events: none;
}

.no-resources-hint {
  font-size: 12px;
  color: #909399;
  padding: 8px 0;
}

/* 资源提示框样式 */
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

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.resource-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.actions {
  display: flex;
  gap: 8px;
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
.type-filter {
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
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
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

.detail-resource-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
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
</style>
