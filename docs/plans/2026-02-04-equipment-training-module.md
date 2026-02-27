# 器材训练模块设计文档

**日期**: 2026-02-04
**版本**: 1.0
**状态**: 设计评审通过

---

## 1. 需求概述

### 1.1 功能目标

在现有感官训练游戏系统基础上，新增**器材训练记录模块**，用于数字化记录学生在资源教室内使用 63 种感统器材的训练表现，并基于记录自动生成 IEP 进度报告。

### 1.2 核心业务流程

1. **进入模块**：老师从侧边栏"训练记录"点击"器材训练"进入
2. **筛选器材**：展示 7 大套装分类，点击展示器材卡片
3. **详情查阅**：录入前查看"教育目标与功能"
4. **数据录入**：评分(1-5星)、辅助等级(5级)、备注
5. **IEP 报告**：自动生成评语初稿，可编辑后导出 Word/PDF

### 1.3 设计原则

- **快速录入**：3秒内找到目标器材
- **连续操作**：支持一次训练多个器材的批量录入
- **历史参考**：显示该学生上次在相同器材上的得分
- **多模态反馈**：音效和动画确认操作成功

---

## 2. 数据库设计

### 2.1 器材主数据表 `equipment_catalog`

```sql
CREATE TABLE equipment_catalog (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,              -- 7大套装: 触觉/嗅觉/视觉/听觉/味觉/本体觉/综合箱
  sub_category TEXT NOT NULL,           -- 子套装名称
  name TEXT NOT NULL,                   -- 产品名称
  description TEXT,                     -- 教育目标与功能
  ability_tags TEXT,                    -- 能力标签 JSON: ["触觉调节", "情绪稳定"]
  image_url TEXT,                       -- 器材图片URL
  is_active INTEGER DEFAULT 1,          -- 是否启用
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 器材训练记录表 `equipment_training_records`

```sql
CREATE TABLE equipment_training_records (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,

  -- 训练数据
  score INTEGER NOT NULL,               -- 1-5 星评分
  prompt_level INTEGER NOT NULL,        -- 辅助等级: 1-5
  duration_seconds INTEGER,             -- 训练时长(秒)
  notes TEXT,                           -- 手动备注

  -- IEP 评语（生成后可编辑）
  generated_comment TEXT,               -- 根据模板生成的评语，老师可修改

  -- 元数据
  training_date TEXT NOT NULL,
  teacher_name TEXT,
  environment TEXT,                     -- 训练环境: 资源教室/个训室等
  batch_id INTEGER,                     -- 关联批量记录(可选)

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment_catalog(id)
);

-- 索引优化
CREATE INDEX idx_equipment_training_student ON equipment_training_records(student_id);
CREATE INDEX idx_equipment_training_date ON equipment_training_records(training_date);
CREATE INDEX idx_equipment_training_equipment ON equipment_training_records(equipment_id);
CREATE INDEX idx_equipment_training_batch ON equipment_training_records(batch_id);
```

### 2.3 批量记录表 `equipment_training_batches` (可选)

```sql
CREATE TABLE equipment_training_batches (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  batch_name TEXT,                      -- 批次名称
  training_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

---

## 3. 类型定义

### 3.1 器材相关类型

```typescript
// src/types/equipment.ts

/**
 * 7大感官套装分类
 */
export type EquipmentCategory =
  | 'tactile'        // 触觉系统套装
  | 'olfactory'      // 嗅觉系统套装
  | 'visual'         // 视觉系统套装
  | 'auditory'       // 听觉系统套装
  | 'gustatory'      // 味觉系统套装
  | 'proprioceptive' // 本体觉系统套装
  | 'integration'    // 感官综合箱套装

/**
 * 辅助等级 (5级)
 */
export enum PromptLevel {
  INDEPENDENT = 1,      // 独立
  VERBAL = 2,            // 口头提示
  VISUAL = 3,            // 视觉提示
  TOUCH = 4,             // 手触提示
  PHYSICAL = 5           // 身体辅助
}

export const PROMPT_LEVEL_LABELS: Record<PromptLevel, string> = {
  1: '独立',
  2: '口头提示',
  3: '视觉提示',
  4: '手触提示',
  5: '身体辅助'
}

/**
 * 器材主数据
 */
export interface EquipmentCatalog {
  id: number
  category: EquipmentCategory
  sub_category: string
  name: string
  description: string
  ability_tags: string[]      // 能力标签
  image_url: string
  is_active: number
  created_at: string
}

/**
 * 器材训练记录
 */
export interface EquipmentTrainingRecord {
  id: number
  student_id: number
  equipment_id: number
  score: number               // 1-5
  prompt_level: PromptLevel
  duration_seconds?: number
  notes?: string
  generated_comment?: string  // IEP评语
  training_date: string
  teacher_name?: string
  environment?: string
  batch_id?: number
  created_at: string
}

/**
 * 批量记录
 */
export interface EquipmentTrainingBatch {
  id: number
  student_id: number
  batch_name: string
  training_date: string
  notes?: string
  created_at: string
}

/**
 * 带历史记录的器材卡片数据
 */
export interface EquipmentWithHistory extends EquipmentCatalog {
  last_score?: number         // 该学生上次评分
  last_prompt_level?: PromptLevel
  last_date?: string
}
```

---

## 4. IEP 评语模板设计

### 4.1 DAO 逻辑框架

评语生成遵循 **Domain + Action + Outcome** 逻辑：

- **Domain (领域)**: 感官系统分类（触觉/视觉/听觉等）
- **Action (动作)**: 器材名称 + 辅助等级（如：在口头提示下操作感官手环）
- **Outcome (结果)**: 教育目标是否达成（能力标签）

### 4.2 模板结构

```typescript
// src/utils/equipment-iep-templates.ts

export const equipmentIEPTemplates: Record<EquipmentCategory, IEPTemplate> = {
  tactile: {
    // 基于评分的评语模板
    performance: {
      high: "{name}在【{domain}】领域表现优异。在练习【{equipment}】时，学生能够{action}。最终表现出良好的耐受度，达成了{outcome}的预期目标。",
      medium: "{name}在【{domain}】领域表现良好。在练习【{equipment}】时，学生{action}。整体表现稳定，部分达成了{outcome}的目标，建议继续巩固。",
      low: "{name}在【{domain}】领域需要更多支持。在练习【{equipment}】时，学生{action}。建议调整辅助策略，循序渐进地提升{outcome}能力。"
    },
    // 辅助等级对应的动作描述
    actionDescriptions: {
      1: "独立完成操作",
      2: "在口头提示下完成任务",
      3: "需要视觉提示辅助",
      4: "在手触引导下完成操作",
      5: "需要身体辅助才能完成"
    },
    // 默认训练建议
    suggestions: [
      "在日常生活中提供触觉丰富的探索机会。",
      "使用渐进式脱敏方法，从轻微触觉刺激开始。",
      "结合深压觉活动帮助调节情绪唤醒度。"
    ]
  },
  // 其他分类类似...
}

interface IEPTemplate {
  performance: {
    high: string
    medium: string
    low: string
  }
  actionDescriptions: Record<PromptLevel, string>
  suggestions: string[]
}
```

### 4.3 评语生成函数

```typescript
export function generateEquipmentIEPComment(
  studentName: string,
  equipment: EquipmentCatalog,
  score: number,
  promptLevel: PromptLevel
): string {
  const template = equipmentIEPTemplates[equipment.category]

  // 确定表现等级
  const level = score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low'

  // 填充占位符
  let comment = template.performance[level]
    .replace(/{name}/g, studentName)
    .replace(/{domain}/g, getDomainLabel(equipment.category))
    .replace(/{equipment}/g, equipment.name)
    .replace(/{action}/g, template.actionDescriptions[promptLevel])
    .replace(/{outcome}/g, equipment.ability_tags.join('、'))

  return comment
}
```

---

## 5. UI/UX 设计

### 5.1 页面结构

```
侧边栏
└── 训练记录
    ├── 游戏训练分析 (现有)
    └── 器材训练记录 (新增)
        ├── 快速录入     ← 默认入口
        └── 历史记录     ← 查看和编辑过往记录
```

### 5.2 快速录入页面布局

**路由**: `/equipment/training/quick-entry`

**组件结构**:
```
EquipmentQuickEntry.vue
├── StudentSelector (学生选择器)
├── DateSelector (日期选择器)
├── EquipmentSelector
│   ├── SearchBox (搜索框)
│   ├── CategoryTabs (7大分类横向滚动)
│   ├── QuickAccessBar (常用器材快捷区)
│   └── EquipmentGrid (器材卡片网格)
│       └── EquipmentCard
│           ├── 器材图片
│           ├── 名称
│           └── 📌 上次评分标签
└── TrainingForm
    ├── EquipmentDetail (教育目标/能力标签)
    ├── ScoreInput (1-5星评分)
    ├── PromptLevelSelect (辅助等级下拉)
    ├── DurationInput (训练时长)
    ├── NotesInput (备注)
    ├── IEPCommentPreview (评语预览/编辑)
    └── ActionButtons (保存并继续 / 保存完成)
```

### 5.3 关键交互流程

1. **页面加载**:
   - 自动加载今天日期
   - 如果有会话记忆，自动加载上次学生

2. **器材检索** (3秒内找到):
   - 搜索框实时过滤（支持拼音/关键词）
   - 分类图标横向滚动快速切换
   - 常用器材快捷区（基于历史记录）

3. **选择器材**:
   - 点击卡片 → 展开录入表单
   - 显示"教育目标"和"能力标签"
   - 显示该学生上次评分（如果有）

4. **录入数据**:
   - 点击星星评分 → 触发音效反馈
   - 选择辅助等级 → 自动生成 IEP 评语
   - 评语可编辑

5. **保存操作**:
   - "保存并继续添加" → 播放成功音效 + 动画 + 重置表单
   - "保存完成" → 返回历史记录页面

### 5.4 UX 细节

| 场景 | 设计 |
|:-----|:-----|
| **3秒检索** | 搜索框 + 常用器材 + 分类图标 |
| **连续录入** | "保存并继续"按钮，支持 Enter 快捷键 |
| **历史参考** | 器材卡片显示"📌 上次: ★★★☆" |
| **成功反馈** | 音效 + 绿色勾选 + Toast 提示 |
| **评语预览** | 500ms 自动生成，支持编辑 |
| **错误处理** | 红色边框 + 抖动动画 |

---

## 6. API 设计

### 6.1 EquipmentAPI

```typescript
class EquipmentAPI {
  // 获取所有器材
  getAllEquipment(): EquipmentCatalog[]

  // 按分类获取器材
  getEquipmentByCategory(category: EquipmentCategory): EquipmentCatalog[]

  // 获取器材详情
  getEquipmentById(id: number): EquipmentCatalog | null

  // 搜索器材
  searchEquipment(keyword: string): EquipmentCatalog[]

  // 获取常用器材（基于历史记录）
  getFrequentEquipment(studentId: number, limit?: number): EquipmentWithHistory[]
}

class EquipmentTrainingAPI {
  // 创建训练记录
  createRecord(record: Omit<EquipmentTrainingRecord, 'id' | 'created_at'>): number

  // 批量创建记录
  createBatchRecords(records: Omit<EquipmentTrainingRecord, 'id' | 'created_at'>[]): number[]

  // 获取学生训练记录
  getStudentRecords(studentId: number, options?: {
    startDate?: string
    endDate?: string
    equipmentId?: number
  }): EquipmentTrainingRecord[]

  // 获取该学生在某器材上的上次记录
  getLastRecord(studentId: number, equipmentId: number): EquipmentTrainingRecord | null

  // 更新记录
  updateRecord(id: number, data: Partial<EquipmentTrainingRecord>): void

  // 删除记录
  deleteRecord(id: number): void

  // 生成 IEP 评语
  generateIEPComment(record: EquipmentTrainingRecord, student: Student): string
}
```

---

## 7. 路由配置

```typescript
// src/router/index.ts

{
  path: '/equipment',
  component: Layout,
  meta: { title: '器材训练', icon: 'box' },
  children: [
    {
      path: 'quick-entry',
      name: 'EquipmentQuickEntry',
      component: () => import('@/views/equipment/QuickEntry.vue'),
      meta: { title: '快速录入' }
    },
    {
      path: 'history',
      name: 'EquipmentHistory',
      component: () => import('@/views/equipment/History.vue'),
      meta: { title: '训练记录' }
    },
    {
      path: 'iep/:studentId',
      name: 'EquipmentIEP',
      component: () => import('@/views/equipment/IEPReport.vue'),
      meta: { title: 'IEP 报告' }
    }
  ]
}
```

---

## 8. 数据迁移

### 8.1 器材数据初始化

从 `docs/感官综合发展资源功能描述.xlsx` 导入 62 种器材数据。

```typescript
// src/database/init-equipment-data.ts

export const EQUIPMENT_DATA: Omit<EquipmentCatalog, 'id' | 'created_at'>[] = [
  // 触觉系统套装 (24种)
  {
    category: 'tactile',
    sub_category: '小型触觉探索套件',
    name: '感官手环',
    description: '提供不同纹理的触觉输入，辅助学生缓解触觉防御，平复情绪。',
    ability_tags: ['触觉调节', '情绪稳定'],
    image_url: '/equipment/tactile/sensory-bracelet.jpg',
    is_active: 1
  },
  // ... 其余61种
]
```

---

## 9. 实施计划

### Phase 1: 数据库与类型 (1天)
- [ ] 创建数据库表和索引
- [ ] 定义 TypeScript 类型
- [ ] 导入器材数据

### Phase 2: API 层 (1天)
- [ ] 实现 EquipmentAPI
- [ ] 实现 EquipmentTrainingAPI
- [ ] 实现 IEP 评语生成器

### Phase 3: 快速录入页面 (2天)
- [ ] EquipmentQuickEntry.vue 主页面
- [ ] EquipmentSelector 组件
- [ ] TrainingForm 组件
- [ ] IEPCommentPreview 组件

### Phase 4: 历史记录页面 (1天)
- [ ] EquipmentHistory.vue
- [ ] 记录列表和筛选
- [ ] 记录编辑功能

### Phase 5: IEP 报告生成 (1天)
- [ ] IEP 报告预览页面
- [ ] Word/PDF 导出功能
- [ ] 批量生成支持

### Phase 6: 优化与测试 (1天)
- [ ] 音效和动画
- [ ] 性能优化
- [ ] 完整流程测试

**总计**: 约 7 个工作日

---

## 10. 风险与注意事项

1. **器材图片**: 需要准备 62 种器材的图片资源
2. **评语质量**: IEP 模板需要特教老师审核调整
3. **数据迁移**: 确保 Excel 数据完整导入
4. **性能考虑**: 器材数量多，需要优化列表渲染性能

---

---

## 11. 细节优化（加分项）

### 11.1 Batch ID 自动管理

**需求**：连续录入的器材记录应自动归入同一个"训练单元"

**实现逻辑**：
```typescript
// 在 QuickEntry.vue 中
const currentBatchId = ref<number | null>(null)

// 点击"保存并继续添加"
function saveAndContinue() {
  if (!currentBatchId.value) {
    // 首次保存，创建新的 batch
    currentBatchId.value = EquipmentTrainingAPI.createBatch({
      student_id: selectedStudent.value.id,
      batch_name: `${selectedStudent.value.name} - ${today}`,
      training_date: today
    })
  }
  // 使用当前 batch_id 保存记录
  EquipmentTrainingAPI.createRecord({
    ...recordData,
    batch_id: currentBatchId.value
  })
}

// 点击"保存完成"或切换学生
function saveCompleteOrSwitchStudent() {
  // 保存记录，然后重置 batch_id
  currentBatchId.value = null
}
```

**效果**：生成 IEP 报告时，同一 batch_id 的记录会被组合成一个"训练单元"

---

### 11.2 "一键复用上次"微交互

**UI 位置**：在器材卡片或表单顶部

```
┌─────────────────────────────────────────────────────────┐
│  器材详情: 感官手环                                       │
│                                                          │
│  📌 上次记录: 2024-01-28                                 │
│  评分: ★★★☆☆  辅助等级: 口头提示                          │
│  [一键复用上次]                                           │  ← 新增按钮
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ⭐ 完成质量    🤝 辅助等级                                │
│  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

**实现逻辑**：
```typescript
function reuseLastRecord() {
  const last = EquipmentTrainingAPI.getLastRecord(
    selectedStudent.value.id,
    selectedEquipment.value.id
  )
  if (last) {
    form.score = last.score
    form.prompt_level = last.prompt_level
    form.duration_seconds = last.duration_seconds || 900
    // 不复制备注，让老师重新填写
    showSuccess('已复用上次记录，请修改备注')
  }
}
```

---

### 11.3 图片懒加载与缓存

**需求**：63 张图片可能影响 Electron 渲染性能

**实现方案**：

1. **图片命名规范**：
```
/public/equipment/{category}/{id}.jpg
例：/public/equipment/tactile/1.jpg  (感官手环)
    /public/equipment/tactile/2.jpg  (感官石)
```

2. **Vue 组件懒加载**：
```vue
<template>
  <img
    :src="placeholder"
    :data-src="equipment.image_url"
    class="equipment-image lazy"
    @error="handleImageError"
    loading="lazy"
  />
</template>

<script setup lang="ts">
// 占位符生成（颜色 + 首字母）
const placeholder = computed(() => {
  const firstChar = equipment.value.name.charAt(0)
  const color = CATEGORY_COLORS[equipment.value.category]
  return generateColorPlaceholder(color, firstChar)
})

function handleImageError(e: Event) {
  // 图片加载失败时，显示占位符
  (e.target as HTMLImageElement).src = placeholder.value
}
</script>

<style scoped>
.equipment-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  background: #f0f0f0;
}
</style>
```

3. **占位符生成函数**：
```typescript
const CATEGORY_COLORS: Record<EquipmentCategory, string> = {
  tactile: '#FF6B6B',       // 触觉 - 红色
  olfactory: '#4ECDC4',     // 嗅觉 - 青色
  visual: '#45B7D1',        // 视觉 - 蓝色
  auditory: '#FFA07A',      // 听觉 - 橙色
  gustatory: '#98D8C8',     // 味觉 - 绿色
  proprioceptive: '#F7DC6F',// 本体觉 - 黄色
  integration: '#BB8FCE'    // 综合 - 紫色
}

function generateColorPlaceholder(color: string, char: string): string {
  // 生成 SVG Data URI（彩色背景 + 首字母）
  const svg = `
    <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="120" fill="${color}"/>
      <text x="100" y="70" font-size="48" text-anchor="middle" fill="white" font-family="Arial">${char}</text>
    </svg>
  `.trim()
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
```

---

### 11.4 触控友好度

**需求**：老师可能使用 Surface 等触控设备

**实现**：
```scss
// 星级评分按钮
.star-button {
  width: 44px;      // 最小触控区域
  height: 44px;
  min-width: 44px;  // 防止压缩
  padding: 8px;
  cursor: pointer;
  // 增加点击反馈
  &:active {
    transform: scale(0.95);
  }
}

// 辅助等级选择器
.prompt-level-option {
  min-height: 44px;
  padding: 12px 16px;
  // 触控更大的热区
  @media (hover: none) {
    padding: 16px 20px;
  }
}
```

---

### 11.5 临时占位符方案

**状态**：63 张图片素材未准备好

**临时方案**：使用颜色占位符 + 器材首字母

```typescript
// 临时图片 URL 生成
export function getPlaceholderImageUrl(equipment: EquipmentCatalog): string {
  const color = CATEGORY_COLORS[equipment.category]
  const char = equipment.name.charAt(0)
  return generateColorPlaceholder(color, char)
}

// 在导入数据时使用
export const EQUIPMENT_DATA: Omit<EquipmentCatalog, 'id' | 'created_at'>[] = [
  {
    // ...
    image_url: getPlaceholderImageUrl({ category: 'tactile', name: '感官手环' })
  }
]
```

**迁移路径**：准备真实图片后，仅需更新 `image_url` 字段

---

## 12. 更新的实施计划

### Phase 1: 数据库与类型 (1天)
- [x] 创建数据库表和索引
- [x] 定义 TypeScript 类型
- [x] 导入器材数据（使用临时占位符）

### Phase 2: API 层 (1天)
- [ ] 实现 EquipmentAPI
- [ ] 实现 EquipmentTrainingAPI
- [ ] 实现 IEP 评语生成器
- [ ] **新增**：Batch ID 管理逻辑

### Phase 3: 快速录入页面 (2天)
- [ ] EquipmentQuickEntry.vue 主页面
- [ ] EquipmentSelector 组件（含懒加载）
- [ ] TrainingForm 组件（触控优化）
- [ ] IEPCommentPreview 组件
- [ ] **新增**："一键复用上次"功能

### Phase 4: 历史记录页面 (1天)
- [ ] EquipmentHistory.vue
- [ ] 记录列表和筛选
- [ ] 记录编辑功能

### Phase 5: IEP 报告生成 (1天)
- [ ] IEP 报告预览页面
- [ ] Word/PDF 导出功能
- [ ] 批量生成支持
- [ ] **新增**：按 batch_id 分组展示

### Phase 6: 优化与测试 (1天)
- [ ] 音效和动画
- [ ] 性能优化（图片懒加载）
- [ ] 触控适配测试
- [ ] 完整流程测试

**总计**: 约 7 个工作日

---

**文档结束**
