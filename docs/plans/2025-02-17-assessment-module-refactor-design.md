# 评估模块重构设计方案

> **文档类型**: 技术架构设计文档
> **创建日期**: 2026-02-17
> **版本**: v1.0
> **状态**: 设计阶段

---

## 目录

1. [背景与问题分析](#1-背景与问题分析)
2. [设计目标](#2-设计目标)
3. [核心架构设计](#3-核心架构设计)
4. [数据结构定义](#4-数据结构定义)
5. [组件设计](#5-组件设计)
6. [量表实现示例](#6-量表实现示例)
7. [路由与导航](#7-路由与导航)
8. [数据库扩展](#8-数据库扩展)
9. [迁移策略](#9-迁移策略)
10. [实施计划](#10-实施计划)

---

## 1. 背景与问题分析

### 1.1 当前架构

**现状**：
- 量表列表硬编码在 `AssessmentSelect.vue` 中
- 每个量表有独立的 `Assessment.vue` 和 `Report.vue` 组件
- 添加新量表需要：
  - 修改选择页面添加卡片
  - 创建 2 个新组件（评估页 + 报告页）
  - 添加路由配置
  - 实现评分计算逻辑

**现有量表**：
| 量表代码 | 名称 | 题目数 | 适用年龄 |
|:--------|:-----|:------|:---------|
| `sm` | S-M 社会生活能力量表 | 132 | 6月-14岁 |
| `weefim` | WeeFIM 功能独立性量表 | 18 | 0-18岁 |
| `csirs` | CSIRS 感觉统合量表 | 58 | 3-12岁 |
| `conners-psq` | Conners 父母问卷 | 48 | 3-17岁 |
| `conners-trs` | Conners 教师问卷 | 28 | 3-17岁 |

### 1.2 架构局限

| 局限点 | 说明 | 影响 |
|:------|:-----|:-----|
| **硬编码量表列表** | 量表卡片写死在模板中 | 无法动态添加量表 |
| **组件分散** | 每个量表独立组件 | 代码重复，维护困难 |
| **缺乏统一配置** | 题目、评分、报告逻辑分散 | 配置不一致，易出错 |
| **扩展性差** | 添加新量表需修改多处 | 开发成本高 |
| **类型安全弱** | 缺少统一的类型定义 | 容易出现配置错误 |

### 1.3 未来需求

计划新增的评估量表：
- **情绪调节能力评估** - 评估儿童情绪识别、表达、调节能力
- **社交能力评估** - 评估人际交往、沟通合作能力
- **感官统合专项评估** - 针对特定感官系统的深入评估
- **认知能力评估** - 注意力、记忆力、执行功能评估

---

## 2. 设计目标

### 2.1 核心目标

1. **可扩展性** - 添加新量表只需创建配置文件，无需修改核心代码
2. **可维护性** - 量表配置集中管理，易于查找和修改
3. **可复用性** - 通用组件避免代码重复
4. **类型安全** - TypeScript 接口确保配置正确性
5. **向后兼容** - 渐进式迁移，不破坏现有功能

### 2.2 非功能目标

- **性能** - 支持按需加载量表，减小初始包大小
- **灵活性** - 支持多种题型和评分方式
- **国际化** - 为将来多语言支持预留接口
- **测试友好** - 评分逻辑独立，易于单元测试

---

## 3. 核心架构设计

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        评估模块架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    ScaleRegistry                           │  │
│  │  (量表注册表 - 单例模式)                                     │  │
│  │  - register(metadata)    - 注册量表                         │  │
│  │  - getScale(id)          - 获取量表                         │  │
│  │  - getAllScales()        - 获取所有量表                     │  │
│  │  - getScalesByCategory() - 按分类筛选                       │  │
│  │  - getScalesByAge()      - 按年龄筛选                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   ScaleMetadata                            │  │
│  │  (量表元数据接口)                                            │  │
│  │  - 基本信息: id, name, code, description                    │  │
│  │  - 题目配置: questions, questionCount                       │  │
│  │  - 评分配置: dimensions, scoringType, calculator           │  │
│  │  - 报告配置: reportType, reportTemplate                    │  │
│  │  - UI配置: icon, themeColor, category                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│          ┌──────────────────┼──────────────────┐                │
│          ▼                  ▼                  ▼                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │  通用组件    │   │  量表实现    │   │  工具类      │           │
│  │             │   │             │   │             │           │
│  │ · 选择器     │   │ · sm-scale  │   │ · 计算器     │           │
│  │ · 评估页面   │   │ · weefim    │   │ · 验证器     │           │
│  │ · 报告页面   │   │ · csirs     │   │ · 导出器     │           │
│  │ · 题目渲染   │   │ · emotional │   │             │           │
│  │             │   │ · social    │   │             │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 设计模式

| 模式 | 应用场景 | 说明 |
|:-----|:---------|:-----|
| **注册表模式** | ScaleRegistry | 集中管理量表，支持动态注册和查询 |
| **策略模式** | ScaleCalculator | 不同量表使用不同的评分计算策略 |
| **工厂模式** | QuestionRenderer | 根据题型创建不同的渲染组件 |
| **模板方法** | AssessmentFlow | 定义评估流程框架，子类实现细节 |
| **组合模式** | ScaleMetadata | 量表由多个部分组合而成 |

---

## 4. 数据结构定义

### 4.1 核心类型定义

```typescript
// src/types/assessment.ts

/**
 * 量表元数据接口
 */
export interface ScaleMetadata {
  // ============ 基本信息 ============
  id: string                          // 量表唯一标识
  code: string                        // 量表代码: 'sm' | 'weefim' | 'csirs' | 'emotional'
  name: string                        // 量表名称
  subtitle: string                    // 副标题
  description: string                 // 描述

  // ============ 适用范围 ============
  minAge: number                      // 最小年龄（月）
  maxAge: number                      // 最大年龄（月）
  estimatedTime: number               // 预估时间（分钟）

  // ============ 题目配置 ============
  questionCount: number               // 题目数量
  questions: ScaleQuestion[]          // 题目列表

  // ============ 评分配置 ============
  dimensions: ScaleDimension[]        // 评分维度
  scoringType: ScoringType            // 评分类型
  calculator: ScaleCalculator         // 评分计算器

  // ============ 报告配置 ============
  reportType: string                  // 报告类型
  reportTemplate: ReportTemplate      // 报告模板

  // ============ UI配置 ============
  icon: string                        // 图标名称
  themeColor: string                  // 主题色
  category: ScaleCategory             // 量表分类

  // ============ 路由配置 ============
  assessmentRoute: string             // 评估路由
  reportRoute: string                 // 报告路由

  // ============ 扩展配置 ============
  config?: Record<string, any>        // 其他自定义配置
}

/**
 * 题目定义
 */
export interface ScaleQuestion {
  id: string                          // 题目ID
  text: string                        // 题目文本
  type: QuestionType                  // 题目类型
  dimension?: string                  // 所属维度

  // 选项配置
  options?: QuestionOption[]          // 选项列表（选择题）
  min?: number                        // 最小值（滑块题）
  max?: number                        // 最大值（滑块题）
  step?: number                       // 步长（滑块题）
  unit?: string                       // 单位

  // 题目属性
  required: boolean                   // 是否必答
  condition?: QuestionCondition       // 显示条件
  metadata?: Record<string, any>      // 额外元数据
}

/**
 * 题目选项
 */
export interface QuestionOption {
  value: any                          // 选项值
  label: string                       // 选项标签
  score?: number                      // 对应分数（用于自动计分）
  description?: string                // 选项说明
}

/**
 * 题目显示条件
 */
export interface QuestionCondition {
  dependsOn: string                   // 依赖的题目ID
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains'
  value: any                          // 条件值
}

/**
 * 评分维度
 */
export interface ScaleDimension {
  id: string                          // 维度ID
  name: string                        // 维度名称
  description?: string                // 维度说明
  questionIds?: string[]              // 包含的题目ID
  weight?: number                     // 权重
}

/**
 * 题目类型
 */
export type QuestionType =
  | 'single-choice'    // 单选题
  | 'multiple-choice'  // 多选题
  | 'rating'           // 评分题（Likert 量表）
  | 'slider'           // 滑块题
  | 'text'             // 文本输入题
  | 'matrix'           // 矩阵题（表格形式）
  | 'ranking'          // 排序题
  | 'semantic-differential' // 语义差异量表

/**
 * 量表分类
 */
export enum ScaleCategory {
  DEVELOPMENTAL = 'developmental',    // 发展性评估（S-M, WeeFIM）
  SENSORY = 'sensory',                // 感觉统合（CSIRS）
  BEHAVIORAL = 'behavioral',          // 行为评估（Conners）
  EMOTIONAL = 'emotional',            // 情绪调节
  SOCIAL = 'social',                  // 社交能力
  COGNITIVE = 'cognitive'             // 认知能力
}

/**
 * 评分类型
 */
export enum ScoringType {
  AGE_NORMED = 'age-normed',          // 年龄常模（需要年龄对照表）
  RAW_SCORE = 'raw-score',            // 原始分
  T_SCORE = 't-score',                // T分数
  PERCENTILE = 'percentile',          // 百分位
  STANDARD_SCORE = 'standard-score',  // 标准分（均值100，标准差15）
  Z_SCORE = 'z-score'                 // Z分数
}

/**
 * 评分计算结果
 */
export interface RawScoreResult {
  totalScore: number                  // 总分
  dimensionScores: Record<string, number>  // 各维度分数
  maxScore: number                    // 最高分
  answeredQuestions: number           // 已答题目数
  skippedQuestions: string[]          // 跳过的题目ID
}

/**
 * 标准分结果
 */
export interface StandardScoreResult {
  standardScore: number               // 标准分
  percentile: number                  // 百分位
  level: string                       // 等级（如：优秀/良好/一般/较差）
  interpretation: string              // 解释说明
}

/**
 * 分数解释
 */
export interface ScoreInterpretation {
  level: string                       // 等级
  description: string                 // 描述
  suggestions: string[]               // 建议
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean                      // 是否有效
  errors: ValidationError[]           // 错误列表
  warnings: ValidationWarning[]      // 警告列表
}

export interface ValidationError {
  questionId: string                  // 题目ID
  message: string                     // 错误信息
}

export interface ValidationWarning {
  questionId: string                  // 题目ID
  message: string                     // 警告信息
}

/**
 * 报告模板
 */
export interface ReportTemplate {
  type: string                        // 报告类型
  sections: ReportSection[]           // 报告章节
  charts: ChartConfig[]               // 图表配置
}

/**
 * 报告章节
 */
export interface ReportSection {
  id: string                          // 章节ID
  title: string                       // 标题
  type: 'text' | 'table' | 'chart' | 'list'
  content: any                        // 内容
  order: number                       // 顺序
}

/**
 * 图表配置
 */
export interface ChartConfig {
  id: string                          // 图表ID
  type: 'radar' | 'bar' | 'line' | 'pie'
  title: string                       // 标题
  data: any                           // 数据
  options?: any                       // ECharts 配置
}

/**
 * 量表评分计算器接口
 */
export interface ScaleCalculator {
  // 计算原始分
  calculateRawScore(answers: Record<string, any>): RawScoreResult

  // 计算标准分
  calculateStandardScore(rawScore: number, age: number, gender?: string): StandardScoreResult

  // 生成分数解释
  interpretScore(score: number, age: number, gender?: string): ScoreInterpretation

  // 验证答案有效性
  validateAnswers(answers: Record<string, any>): ValidationResult
}

/**
 * 评估会话
 */
export interface AssessmentSession {
  id: string                          // 会话ID
  scaleId: string                     // 量表ID
  studentId: number                   // 学生ID
  startTime: string                   // 开始时间
  endTime?: string                    // 结束时间
  status: 'in-progress' | 'completed' | 'abandoned'
  answers: Record<string, any>        // 答案
  currentQuestionIndex?: number       // 当前题目索引
}

/**
 * 评估结果
 */
export interface AssessmentResult {
  id: string                          // 结果ID
  sessionId: string                   // 会话ID
  scaleId: string                     // 量表ID
  studentId: number                   // 学生ID
  completedAt: string                 // 完成时间

  // 分数
  rawScore: RawScoreResult            // 原始分
  standardScore?: StandardScoreResult // 标准分

  // 解释
  interpretation?: ScoreInterpretation // 分数解释

  // 答案详情
  answers: Record<string, any>        // 所有答案

  // 元数据
  metadata?: Record<string, any>      // 其他元数据
}
```

### 4.2 量表注册表接口

```typescript
/**
 * 量表注册表接口
 */
export interface IScaleRegistry {
  /**
   * 注册量表
   */
  register(metadata: ScaleMetadata): void

  /**
   * 批量注册量表
   */
  registerBatch(metadataList: ScaleMetadata[]): void

  /**
   * 获取量表
   */
  getScale(id: string): ScaleMetadata | undefined

  /**
   * 通过代码获取量表
   */
  getScaleByCode(code: string): ScaleMetadata | undefined

  /**
   * 获取所有量表
   */
  getAllScales(): ScaleMetadata[]

  /**
   * 按分类筛选量表
   */
  getScalesByCategory(category: ScaleCategory): ScaleMetadata[]

  /**
   * 按年龄筛选量表
   */
  getScalesByAge(age: number): ScaleMetadata[]

  /**
   * 检查量表是否已注册
   */
  has(id: string): boolean

  /**
   * 注销量表
   */
  unregister(id: string): boolean

  /**
   * 清空所有量表
   */
  clear(): void
}
```

---

## 5. 组件设计

### 5.1 组件层次结构

```
评估模块组件层次
│
├── ScaleSelector.vue (量表选择器)
│   └── ScaleCard.vue (量表卡片)
│
├── UniversalAssessment.vue (通用评估页面)
│   ├── AssessmentHeader.vue (评估头部)
│   ├── QuestionRenderer.vue (题目渲染器)
│   │   ├── SingleChoiceQuestion.vue
│   │   ├── MultipleChoiceQuestion.vue
│   │   ├── RatingQuestion.vue
│   │   ├── SliderQuestion.vue
│   │   ├── MatrixQuestion.vue
│   │   └── RankingQuestion.vue
│   ├── AssessmentProgress.vue (进度条)
│   └── AssessmentNavigation.vue (导航控制)
│
├── UniversalReport.vue (通用报告页面)
│   ├── ReportHeader.vue (报告头部)
│   ├── ReportSummary.vue (报告摘要)
│   ├── ReportChart.vue (报告图表)
│   ├── ReportDetails.vue (详细数据)
│   └── ReportSuggestions.vue (建议)
│
└── AssessmentHistory.vue (评估历史)
    └── HistoryItem.vue (历史记录项)
```

### 5.2 核心组件设计

#### 5.2.1 ScaleSelector.vue

```vue
<template>
  <div class="scale-selector">
    <!-- 筛选器 -->
    <div class="filters" v-if="showFilters">
      <el-select v-model="selectedCategory" placeholder="选择分类" clearable>
        <el-option label="全部" value="" />
        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
      </el-select>
      <el-input-number v-model="filterAge" placeholder="输入年龄筛选" />
    </div>

    <!-- 量表卡片网格 -->
    <div class="scale-cards">
      <el-card
        v-for="scale in filteredScales"
        :key="scale.id"
        class="scale-card"
        :class="`${scale.code}-card`"
        shadow="hover"
        @click="selectScale(scale)"
      >
        <div class="scale-icon" :style="{ background: scale.themeColor }">
          <el-icon size="60">
            <component :is="scale.icon" />
          </el-icon>
        </div>
        <h3 class="scale-title">{{ scale.name }}</h3>
        <p class="scale-subtitle">({{ scale.subtitle }})</p>
        <div class="scale-info">
          <ul>
            <li>适用年龄：{{ formatAgeRange(scale.minAge, scale.maxAge) }}</li>
            <li>题目数量：{{ scale.questionCount }}道</li>
            <li>评估维度：{{ formatDimensions(scale.dimensions) }}</li>
            <li>评估时间：约{{ scale.estimatedTime }}分钟</li>
          </ul>
        </div>
        <el-button :type="getButtonType(scale.code)" size="large" class="scale-btn">
          开始评估
        </el-button>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { scaleRegistry } from '@/services/ScaleRegistry'
import type { ScaleMetadata, ScaleCategory } from '@/types/assessment'

const router = useRouter()
const showFilters = ref(true)
const selectedCategory = ref<string>('')
const filterAge = ref<number>()

const filteredScales = computed<ScaleMetadata[]>(() => {
  let scales = scaleRegistry.getAllScales()

  if (selectedCategory.value) {
    scales = scales.filter(s => s.category === selectedCategory.value)
  }

  if (filterAge.value) {
    scales = scales.filter(s =>
      filterAge.value! >= s.minAge && filterAge.value! <= s.maxAge
    )
  }

  return scales
})

const selectScale = (scale: ScaleMetadata) => {
  router.push({
    path: '/assessment/select-student',
    query: { scale: scale.code }
  })
}

const formatAgeRange = (min: number, max: number): string => {
  const formatMonth = (m: number) => m < 12 ? `${m}个月` : `${m / 12}岁`
  return `${formatMonth(min)} - ${formatMonth(max)}`
}

const formatDimensions = (dimensions: ScaleDimension[]): string => {
  return dimensions.map(d => d.name).join('、')
}
</script>
```

#### 5.2.2 UniversalAssessment.vue

```vue
<template>
  <div class="universal-assessment">
    <!-- 欢迎对话框 -->
    <WelcomeDialog
      v-if="showWelcome"
      :scale="scale"
      @start="startAssessment"
    />

    <!-- 评估头部 -->
    <AssessmentHeader
      :scale="scale"
      :student="student"
      :progress="progress"
    />

    <!-- 题目卡片 -->
    <QuestionRenderer
      :question="currentQuestion"
      :answer="currentAnswer"
      @update="updateAnswer"
    />

    <!-- 导航控制 -->
    <AssessmentNavigation
      :can-prev="canGoPrev"
      :can-next="canGoNext"
      :is-last="isLastQuestion"
      @prev="prevQuestion"
      @next="nextQuestion"
      @submit="submitAssessment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { scaleRegistry } from '@/services/ScaleRegistry'
import type { ScaleMetadata, ScaleQuestion, AssessmentSession } from '@/types/assessment'

const route = useRoute()
const router = useRouter()

const scaleCode = route.query.scale as string
const scale = ref<ScaleMetadata>()
const session = ref<AssessmentSession>()
const currentIndex = ref(0)
const answers = ref<Record<string, any>>({})
const showWelcome = ref(true)

onMounted(() => {
  const metadata = scaleRegistry.getScaleByCode(scaleCode)
  if (!metadata) {
    router.push('/assessment')
    return
  }
  scale.value = metadata
  initSession()
})

const currentQuestion = computed<ScaleQuestion>(() => {
  return scale.value!.questions[currentIndex.value]
})

const progress = computed(() => ({
  current: currentIndex.value + 1,
  total: scale.value!.questions.length,
  percentage: ((currentIndex.value + 1) / scale.value!.questions.length) * 100
}))

const updateAnswer = (answer: any) => {
  answers.value[currentQuestion.value.id] = answer
}

const nextQuestion = () => {
  if (currentIndex.value < scale.value!.questions.length - 1) {
    currentIndex.value++
  }
}

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const submitAssessment = async () => {
  // 计算分数
  const calculator = scale.value!.calculator
  const rawScore = calculator.calculateRawScore(answers.value)

  // 保存结果
  // ...

  // 跳转到报告页面
  router.push({
    path: scale.value!.reportRoute,
    query: { sessionId: session.value!.id }
  })
}
</script>
```

#### 5.2.3 QuestionRenderer.vue

```vue
<template>
  <div class="question-renderer">
    <!-- 单选题 -->
    <SingleChoiceQuestion
      v-if="question.type === 'single-choice'"
      :question="question"
      :value="value"
      @update="emitUpdate"
    />

    <!-- 多选题 -->
    <MultipleChoiceQuestion
      v-else-if="question.type === 'multiple-choice'"
      :question="question"
      :value="value"
      @update="emitUpdate"
    />

    <!-- 评分题 -->
    <RatingQuestion
      v-else-if="question.type === 'rating'"
      :question="question"
      :value="value"
      @update="emitUpdate"
    />

    <!-- 滑块题 -->
    <SliderQuestion
      v-else-if="question.type === 'slider'"
      :question="question"
      :value="value"
      @update="emitUpdate"
    />

    <!-- 矩阵题 -->
    <MatrixQuestion
      v-else-if="question.type === 'matrix'"
      :question="question"
      :value="value"
      @update="emitUpdate"
    />

    <!-- 排序题 -->
    <RankingQuestion
      v-else-if="question.type === 'ranking'"
      :question="question"
      :value="value"
      @update="emitUpdate"
    />

    <!-- 文本题 -->
    <TextQuestion
      v-else-if="question.type === 'text'"
      :question="question"
      :value="value"
      @update="emitUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import type { ScaleQuestion } from '@/types/assessment'

interface Props {
  question: ScaleQuestion
  value: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  update: [value: any]
}>()

const emitUpdate = (value: any) => {
  emit('update', value)
}
</script>
```

---

## 6. 量表实现示例

### 6.1 S-M 量表配置

```typescript
// src/services/scales/sm-scale.ts

import { scaleRegistry } from '../ScaleRegistry'
import { SMCalculator } from './SMCalculator'
import { smQuestions } from './sm-questions'
import type { ScaleMetadata } from '@/types/assessment'
import { ScaleCategory, ScoringType } from '@/types/assessment'

/**
 * S-M 量表元数据
 */
export const smScale: ScaleMetadata = {
  // 基本信息
  id: 'scale-sm',
  code: 'sm',
  name: '婴儿-初中生社会生活能力量表',
  subtitle: 'S-M量表',
  description: '评估儿童社会生活能力发展水平，包括独立生活能力、运动能力、作业、交往、自我管理、集体活动等维度。',

  // 适用范围
  minAge: 6,       // 6个月
  maxAge: 168,     // 14岁（168个月）
  estimatedTime: 35,

  // 题目配置
  questionCount: 132,
  questions: smQuestions,

  // 评分配置
  dimensions: [
    { id: 'SH', name: '独立生活能力', description: '自理日常生活能力' },
    { id: 'L', name: '运动能力', description: '基本运动技能' },
    { id: 'M', name: '作业', description: '手眼协调和操作能力' },
    { id: 'C', name: '交往', description: '与他人交往能力' },
    { id: 'S', name: '自我管理', description: '自我管理和责任感' },
    { id: 'G', name: '集体活动', description: '参与集体活动能力' }
  ],
  scoringType: ScoringType.AGE_NORMED,
  calculator: new SMCalculator(),

  // 报告配置
  reportType: 'sm',
  reportTemplate: {
    type: 'sm',
    sections: [
      { id: 'summary', title: '评估摘要', type: 'text', content: '', order: 1 },
      { id: 'scores', title: '各维度得分', type: 'table', content: {}, order: 2 },
      { id: 'chart', title: '能力发展图', type: 'chart', content: {}, order: 3 },
      { id: 'suggestions', title: '训练建议', type: 'list', content: [], order: 4 }
    ],
    charts: [
      {
        id: 'radar',
        type: 'radar',
        title: '六大能力维度',
        data: {},
        options: {}
      }
    ]
  },

  // UI配置
  icon: 'User',
  themeColor: '#409EFF',
  category: ScaleCategory.DEVELOPMENTAL,

  // 路由配置
  assessmentRoute: '/assessment/sm/assessment',
  reportRoute: '/assessment/sm/report',

  // 自定义配置
  config: {
    ageStages: [
      { stage: 1, name: '6月-1岁', ageRange: [6, 12] },
      { stage: 2, name: '1-2岁', ageRange: [13, 24] },
      { stage: 3, name: '2-3岁', ageRange: [25, 36] },
      { stage: 4, name: '3-4岁', ageRange: [37, 48] },
      { stage: 5, name: '4-5岁', ageRange: [49, 60] },
      { stage: 6, name: '5-6岁', ageRange: [61, 72] },
      { stage: 7, name: '6-7岁', ageRange: [73, 84] },
      { stage: 8, name: '7-8岁', ageRange: [85, 96] },
      { stage: 9, name: '8-9岁', ageRange: [97, 108] },
      { stage: 10, name: '9-10岁', ageRange: [109, 120] },
      { stage: 11, name: '10-11岁', ageRange: [121, 132] },
      { stage: 12, name: '11-12岁', ageRange: [133, 144] },
      { stage: 13, name: '12-13岁', ageRange: [145, 156] },
      { stage: 14, name: '13-14岁', ageRange: [157, 168] }
    ]
  }
}

// 注册量表
scaleRegistry.register(smScale)
```

### 6.2 情绪调节量表配置（新增）

```typescript
// src/services/scales/emotional-scale.ts

import { scaleRegistry } from '../ScaleRegistry'
import { EmotionalCalculator } from './EmotionalCalculator'
import { emotionalQuestions } from './emotional-questions'
import type { ScaleMetadata } from '@/types/assessment'
import { ScaleCategory, ScoringType } from '@/types/assessment'

/**
 * 情绪调节能力评估量表元数据
 */
export const emotionalScale: ScaleMetadata = {
  // 基本信息
  id: 'scale-emotional',
  code: 'emotional',
  name: '儿童情绪调节能力评估量表',
  subtitle: '情绪调节量表',
  description: '评估儿童在情绪识别、情绪表达和情绪调节三个方面的发展水平，为情绪教育干预提供依据。',

  // 适用范围
  minAge: 36,      // 3岁
  maxAge: 144,     // 12岁（144个月）
  estimatedTime: 20,

  // 题目配置
  questionCount: 40,
  questions: emotionalQuestions,

  // 评分配置
  dimensions: [
    { id: 'recognition', name: '情绪识别', description: '识别自己和他人的情绪' },
    { id: 'expression', name: '情绪表达', description: '恰当表达自己的情绪' },
    { id: 'regulation', name: '情绪调节', description: '管理和调节情绪反应' }
  ],
  scoringType: ScoringType.RAW_SCORE,
  calculator: new EmotionalCalculator(),

  // 报告配置
  reportType: 'emotional',
  reportTemplate: {
    type: 'emotional',
    sections: [
      { id: 'summary', title: '评估摘要', type: 'text', content: '', order: 1 },
      { id: 'dimension-scores', title: '各维度得分', type: 'table', content: {}, order: 2 },
      { id: 'profile-chart', title: '情绪能力剖面图', type: 'chart', content: {}, order: 3 },
      { id: 'strengths', title: '优势能力', type: 'list', content: [], order: 4 },
      { id: 'improvement', title: '待提升能力', type: 'list', content: [], order: 5 },
      { id: 'strategies', title: '干预策略建议', type: 'list', content: [], order: 6 }
    ],
    charts: [
      {
        id: 'radar',
        type: 'radar',
        title: '情绪调节能力三维图',
        data: {},
        options: {}
      },
      {
        id: 'bar',
        type: 'bar',
        title: '各维度得分对比',
        data: {},
        options: {}
      }
    ]
  },

  // UI配置
  icon: 'Sunny',
  themeColor: '#E6A23C',
  category: ScaleCategory.EMOTIONAL,

  // 路由配置
  assessmentRoute: '/assessment/emotional/assessment',
  reportRoute: '/assessment/emotional/report',

  // 自定义配置
  config: {
    ageGroups: [
      { group: 'preschool', name: '学龄前', ageRange: [36, 72] },
      { group: 'lower-elementary', name: '小学低年级', ageRange: [73, 108] },
      { group: 'upper-elementary', name: '小学高年级', ageRange: [109, 144] }
    ],
    strategies: {
      recognition: [
        '情绪卡片识别训练',
        '表情观察游戏',
        '情绪词汇学习'
      ],
      expression: [
        '情绪日记',
        '角色扮演',
        '艺术表达活动'
      ],
      regulation: [
        '深呼吸练习',
        '正念训练',
        '情绪角设置',
        '问题解决技巧训练'
      ]
    }
  }
}

// 注册量表
scaleRegistry.register(emotionalScale)
```

### 6.3 评分计算器示例

```typescript
// src/services/scales/SMCalculator.ts

import type {
  ScaleCalculator,
  RawScoreResult,
  StandardScoreResult,
  ScoreInterpretation,
  ValidationResult
} from '@/types/assessment'

/**
 * S-M 量表评分计算器
 */
export class SMCalculator implements ScaleCalculator {
  /**
   * 计算原始分
   */
  calculateRawScore(answers: Record<string, any>): RawScoreResult {
    // 按维度汇总分数
    const dimensionScores: Record<string, number> = {
      SH: 0, L: 0, M: 0, C: 0, S: 0, G: 0
    }

    let answeredCount = 0
    const skipped: string[] = []

    // 遍历答案，计算各维度得分
    for (const [questionId, answer] of Object.entries(answers)) {
      if (answer === null || answer === undefined) {
        skipped.push(questionId)
        continue
      }

      // 根据题目ID确定所属维度
      const dimension = this.getQuestionDimension(questionId)
      if (dimension && typeof answer === 'number') {
        dimensionScores[dimension] += answer
        answeredCount++
      }
    }

    const totalScore = Object.values(dimensionScores).reduce((sum, score) => sum + score, 0)

    return {
      totalScore,
      dimensionScores,
      maxScore: 132,  // S-M量表满分
      answeredQuestions: answeredCount,
      skippedQuestions: skipped
    }
  }

  /**
   * 计算标准分（年龄常模）
   */
  calculateStandardScore(rawScore: number, age: number): StandardScoreResult {
    // 获取年龄段
    const ageStage = this.getAgeStage(age)

    // 查找常模数据
    const normData = this.getNormData(ageStage)

    // 计算标准分
    const standardScore = this.calculateStandardScoreFromNorm(rawScore, normData)

    // 计算百分位
    const percentile = this.calculatePercentile(standardScore)

    // 确定等级
    const level = this.determineLevel(standardScore)

    return {
      standardScore,
      percentile,
      level,
      interpretation: this.getInterpretation(level)
    }
  }

  /**
   * 生成分数解释
   */
  interpretScore(score: number, age: number): ScoreInterpretation {
    const ageStage = this.getAgeStage(age)
    const result = this.calculateStandardScore(score, age)

    return {
      level: result.level,
      description: this.getInterpretation(result.level),
      suggestions: this.getSuggestions(result.level, ageStage)
    }
  }

  /**
   * 验证答案有效性
   */
  validateAnswers(answers: Record<string, any>): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // 检查必答题是否已答
    // 检查答案范围是否合法
    // ...

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // ============ 私有方法 ============

  private getQuestionDimension(questionId: string): string | null {
    // 根据题目ID前缀判断维度
    // SH-001 -> SH, L-001 -> L, etc.
    const prefix = questionId.split('-')[0]
    const validDimensions = ['SH', 'L', 'M', 'C', 'S', 'G']
    return validDimensions.includes(prefix) ? prefix : null
  }

  private getAgeStage(age: number): number {
    // 将年龄转换为阶段编号（1-14）
    if (age < 12) return 1
    if (age < 24) return 2
    // ... 省略其他阶段
    return 14
  }

  private getNormData(stage: number): any {
    // 返回该阶段的常模数据
    // { mean: 100, sd: 15, norms: [...] }
    return {}
  }

  private calculateStandardScoreFromNorm(raw: number, norm: any): number {
    // 使用常模数据计算标准分
    return 100
  }

  private calculatePercentile(standardScore: number): number {
    // 将标准分转换为百分位
    return 50
  }

  private determineLevel(standardScore: number): string {
    if (standardScore >= 115) return '优秀'
    if (standardScore >= 105) return '良好'
    if (standardScore >= 95) return '中等'
    if (standardScore >= 85) return '中下'
    return '较差'
  }

  private getInterpretation(level: string): string {
    const interpretations: Record<string, string> = {
      '优秀': '该学生在社会生活能力方面表现突出，大部分年龄组内的任务都能独立完成。',
      '良好': '该学生在社会生活能力方面表现较好，能够完成大部分年龄组内的任务。',
      '中等': '该学生在社会生活能力方面表现正常，能够完成年龄组内的基本任务。',
      '中下': '该学生在社会生活能力方面有待提高，部分年龄组内的任务需要辅助完成。',
      '较差': '该学生在社会生活能力方面明显落后，需要专业的康复训练和支持。'
    }
    return interpretations[level] || ''
  }

  private getSuggestions(level: string, stage: number): string[] {
    // 根据等级和阶段返回针对性建议
    return []
  }
}
```

---

## 7. 路由与导航

### 7.1 新路由结构

```typescript
// src/router/assessment-routes.ts

import type { RouteRecordRaw } from 'vue-router'

/**
 * 评估模块路由配置
 */
export const assessmentRoutes: RouteRecordRaw[] = [
  // 量表选择页面（重构）
  {
    path: '/assessment',
    name: 'AssessmentSelect',
    component: () => import('@/views/assessment/ScaleSelector.vue'),
    meta: {
      title: '选择评估量表',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },

  // 学生选择页面（保持不变）
  {
    path: '/assessment/select-student',
    name: 'SelectStudent',
    component: () => import('@/views/assessment/SelectStudent.vue'),
    meta: {
      title: '选择学生',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },

  // ========== 通用评估路由 ==========
  {
    path: '/assessment/universal/:scaleCode',
    name: 'UniversalAssessment',
    component: () => import('@/views/assessment/UniversalAssessment.vue'),
    meta: {
      title: '评估进行中',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },

  {
    path: '/assessment/universal/:scaleCode/report',
    name: 'UniversalReport',
    component: () => import('@/views/assessment/UniversalReport.vue'),
    meta: {
      title: '评估报告',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },

  // ========== 兼容旧路由 ==========
  // S-M 量表
  {
    path: '/assessment/sm/assessment',
    name: 'SMOAssessment',
    component: () => import('@/views/assessment/sm/Assessment.vue'),
    meta: {
      title: 'S-M量表评估',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },
  {
    path: '/assessment/sm/report',
    name: 'SMReport',
    component: () => import('@/views/assessment/sm/Report.vue'),
    meta: {
      title: 'S-M量表评估报告',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },

  // WeeFIM 量表
  {
    path: '/assessment/weefim/assessment',
    name: 'WeeFIMAssessment',
    component: () => import('@/views/assessment/weefim/Assessment.vue'),
    meta: {
      title: 'WeeFIM量表评估',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },
  {
    path: '/assessment/weefim/report',
    name: 'WeeFIMReport',
    component: () => import('@/views/assessment/weefim/Report.vue'),
    meta: {
      title: 'WeeFIM量表评估报告',
      requiresAuth: true,
      roles: ['admin', 'teacher']
    }
  },

  // ... 其他量表路由
]
```

### 7.2 导航流程

```
评估流程导航
│
├── 量表选择页 (/assessment)
│   └── 点击量表卡片 → 跳转到学生选择页
│
├── 学生选择页 (/assessment/select-student?scale=xxx)
│   └── 选择学生 → 跳转到评估页面
│
├── 评估页面 (/assessment/universal/:scaleCode?studentId=xxx)
│   ├── 欢迎对话框 → 开始评估
│   ├── 逐题作答 → 下一题
│   ├── 完成所有题目 → 提交
│   └── 计算分数 → 跳转到报告页
│
├── 报告页面 (/assessment/universal/:scaleCode/report?sessionId=xxx)
│   ├── 查看评估结果
│   ├── 查看分数详情
│   ├── 查看图表分析
│   ├── 查看建议
│   └── 导出报告
│
└── 评估历史 (/assessment/history?studentId=xxx)
    ├── 查看历史评估记录
    └── 点击记录 → 查看报告
```

---

## 8. 数据库扩展

### 8.1 评估相关表结构

```sql
-- =====================================================
-- 评估会话表 (新增)
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scale_id TEXT NOT NULL,              -- 量表ID
  student_id INTEGER NOT NULL,         -- 学生ID
  start_time TEXT NOT NULL,            -- 开始时间
  end_time TEXT,                       -- 结束时间
  status TEXT NOT NULL DEFAULT 'in-progress',  -- 状态
  current_question_index INTEGER,      -- 当前题目索引
  class_id INTEGER,                    -- 班级ID（快照）
  class_name TEXT,                     -- 班级名称（快照）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id) REFERENCES student(id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_student
  ON assessment_sessions(student_id);

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_scale
  ON assessment_sessions(scale_id);

-- =====================================================
-- 评估答案表 (新增)
-- =====================================================
CREATE TABLE IF NOT EXISTS assessment_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,         -- 会话ID
  question_id TEXT NOT NULL,           -- 题目ID
  answer_value TEXT,                   -- 答案值（JSON）
  answered_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_session
  ON assessment_answers(session_id);

-- =====================================================
-- 评估结果表 (扩展)
-- =====================================================
-- 添加字段到现有的 report_record 表
ALTER TABLE report_record ADD COLUMN assessment_session_id TEXT;
ALTER TABLE report_record ADD COLUMN raw_score INTEGER;
ALTER TABLE report_record ADD COLUMN standard_score REAL;
ALTER TABLE report_record ADD COLUMN percentile INTEGER;
ALTER TABLE report_record ADD COLUMN score_level TEXT;
ALTER TABLE report_record ADD COLUMN dimension_scores TEXT;  -- JSON

-- =====================================================
-- 量表配置表 (可选 - 用于动态配置)
-- =====================================================
CREATE TABLE IF NOT EXISTS scale_configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scale_id TEXT NOT NULL UNIQUE,       -- 量表ID
  scale_code TEXT NOT NULL UNIQUE,     -- 量表代码
  config_json TEXT NOT NULL,           -- 配置JSON（ScaleMetadata序列化）
  is_active INTEGER DEFAULT 1,         -- 是否启用
  version TEXT,                        -- 版本号
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 8.2 数据访问层

```typescript
// src/database/assessment-api.ts

import { DatabaseAPI } from './api'
import type {
  AssessmentSession,
  AssessmentResult,
  ScaleMetadata
} from '@/types/assessment'

/**
 * 评估会话API
 */
export class AssessmentSessionAPI extends DatabaseAPI {
  /**
   * 创建评估会话
   */
  createSession(session: Omit<AssessmentSession, 'id'>): number {
    const result = this.execute(`
      INSERT INTO assessment_sessions
      (scale_id, student_id, start_time, status, class_id, class_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      session.scaleId,
      session.studentId,
      session.startTime,
      session.status,
      session.metadata?.classId || null,
      session.metadata?.className || null
    ])
    return this.getLastInsertId()
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): AssessmentSession | null {
    const result = this.execute(`
      SELECT * FROM assessment_sessions WHERE id = ?
    `, [sessionId])
    return result?.[0] || null
  }

  /**
   * 更新会话
   */
  updateSession(sessionId: string, updates: Partial<AssessmentSession>): boolean {
    const fields: string[] = []
    const values: any[] = []

    if (updates.endTime !== undefined) {
      fields.push('end_time = ?')
      values.push(updates.endTime)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.currentQuestionIndex !== undefined) {
      fields.push('current_question_index = ?')
      values.push(updates.currentQuestionIndex)
    }

    if (fields.length === 0) return false

    values.push(sessionId)
    const result = this.execute(`
      UPDATE assessment_sessions
      SET ${fields.join(', ')}
      WHERE id = ?
    `, values)

    return result.changes > 0
  }

  /**
   * 保存答案
   */
  saveAnswer(sessionId: string, questionId: string, answer: any): void {
    const answerJson = JSON.stringify(answer)
    this.execute(`
      INSERT OR REPLACE INTO assessment_answers
      (session_id, question_id, answer_value)
      VALUES (?, ?, ?)
    `, [sessionId, questionId, answerJson])
  }

  /**
   * 获取会话所有答案
   */
  getSessionAnswers(sessionId: string): Record<string, any> {
    const rows = this.query(`
      SELECT question_id, answer_value
      FROM assessment_answers
      WHERE session_id = ?
    `, [sessionId])

    const answers: Record<string, any> = {}
    for (const row of rows) {
      answers[row.question_id] = JSON.parse(row.answer_value)
    }
    return answers
  }
}
```

---

## 9. 迁移策略

### 9.1 渐进式迁移计划

#### 阶段 1：基础架构搭建（不破坏现有功能）

**目标**：创建新的架构基础设施，保持现有功能完全可用

**任务清单**：
- [ ] 创建 `src/types/assessment.ts` 类型定义文件
- [ ] 创建 `ScaleRegistry.ts` 量表注册表
- [ ] 创建通用组件骨架：
  - [ ] `QuestionRenderer.vue`
  - [ ] `AssessmentHeader.vue`
  - [ ] `AssessmentNavigation.vue`
  - [ ] `WelcomeDialog.vue`
- [ ] 添加新路由，保留旧路由
- [ ] 创建评估会话数据表

**验证标准**：
- 现有所有量表功能正常
- 新路由可访问，不影响旧路由
- TypeScript 编译无错误

---

#### 阶段 2：S-M 量表迁移（验证架构）

**目标**：将 S-M 量表迁移到新架构，验证设计可行性

**任务清单**：
- [ ] 创建 `src/services/scales/` 目录
- [ ] 实现 `sm-scale.ts`（量表元数据配置）
- [ ] 实现 `sm-questions.ts`（题目数据）
- [ ] 实现 `SMCalculator.ts`（评分计算器）
- [ ] 创建 `ScaleSelector.vue`（替换旧的 AssessmentSelect.vue）
- [ ] 创建 `UniversalAssessment.vue`
- [ ] 创建 `UniversalReport.vue`
- [ ] 并行运行新旧版本，对比结果

**验证标准**：
- 新旧版本评估结果一致
- 报告生成正确
- UI 体验无降低

---

#### 阶段 3：其他现有量表迁移

**目标**：将所有现有量表迁移到新架构

**任务清单**：
- [ ] 迁移 WeeFIM 量表
- [ ] 迁移 CSIRS 量表
- [ ] 迁移 Conners PSQ 量表
- [ ] 迁移 Conners TRS 量表
- [ ] 测试所有量表的完整流程

**验证标准**：
- 所有量表功能正常
- 评估准确性与原版一致
- 报告格式正确

---

#### 阶段 4：新增量表实现

**目标**：使用新架构实现新增量表

**任务清单**：
- [ ] 实现情绪调节量表
- [ ] 实现社交能力量表
- [ ] 实现感官统合专项评估
- [ ] 实现认知能力评估

**验证标准**：
- 新量表可正常使用
- 评分逻辑正确
- 报告生成正常

---

#### 阶段 5：完全切换与清理

**目标**：完全切换到新架构，清理旧代码

**任务清单**：
- [ ] 更新所有路由到新架构
- [ ] 删除旧的硬编码组件
- [ ] 删除旧的路由配置
- [ ] 更新文档
- [ ] 代码审查与优化

**验证标准**：
- 旧代码完全清理
- 无 TypeScript 错误
- 所有测试通过

---

### 9.2 向后兼容策略

1. **保留旧路由**
   - 旧的路由继续可用，至少保留 2 个版本迭代周期
   - 新旧版本并行运行

2. **功能标记**
   - 使用功能开关控制新架构的启用
   - 允许用户选择使用新旧版本

3. **数据兼容**
   - 新旧版本使用相同的数据库表
   - 评估结果格式保持兼容

4. **渐进式迁移**
   - 一次迁移一个量表
   - 每次迁移后充分测试

---

## 10. 实施计划

### 10.1 时间估算

| 阶段 | 任务 | 预计工时 | 依赖 |
|:-----|:-----|:---------|:-----|
| 阶段 1 | 基础架构搭建 | 2-3 天 | 无 |
| 阶段 2 | S-M 量表迁移 | 2-3 天 | 阶段 1 |
| 阶段 3 | 其他量表迁移 | 3-4 天 | 阶段 2 |
| 阶段 4 | 新增量表实现 | 4-5 天 | 阶段 3 |
| 阶段 5 | 完全切换与清理 | 1-2 天 | 阶段 4 |
| **总计** | | **12-17 天** | |

### 10.2 优先级建议

**P0 - 必须完成**：
- 类型定义完整
- ScaleRegistry 实现
- 至少一个量表的完整迁移（验证架构）

**P1 - 高优先级**：
- 所有现有量表迁移
- 通用组件完善

**P2 - 中优先级**：
- 新增量表实现
- 性能优化

**P3 - 低优先级**：
- 国际化支持
- 高级图表功能

---

## 附录

### A. 术语表

| 术语 | 说明 |
|:-----|:-----|
| **量表** | 标准化评估工具，如 S-M、WeeFIM 等 |
| **维度** | 量表评估的各个方面，如"交往"、"独立生活能力" |
| **常模** | 基于大样本建立的参照标准，用于解释分数 |
| **原始分** | 直接从答案计算得到的分数 |
| **标准分** | 根据常模转换后的分数，便于比较 |
| **百分位** | 表示在常模群体中的位置 |

### B. 参考资料

1. S-M 量表手册
2. WeeFIM 量表手册
3. CSIRS 量表手册
4. Conners 量表手册
5. 心理测量学原理

### C. 变更历史

| 版本 | 日期 | 变更内容 |
|:-----|:-----|:---------|
| v1.0 | 2026-02-17 | 初始版本 |

---

**文档状态**: 设计阶段，待评审

**下一步**：
1. 团队评审设计方案
2. 确定实施优先级和时间表
3. 创建 GitHub Issues 跟踪实施进度
