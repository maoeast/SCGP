# 评估选择页面布局重构计划

## 1. 背景与当前现实

当前评估入口已经存在统一评估主链，但入口页和学生选择页仍是硬编码实现，且授权口径没有和当前平台现实完全收口：

- `src/views/assessment/AssessmentSelect.vue`
  - 12 张量表卡片全部写死在模板里。
- `src/views/assessment/SelectStudent.vue`
  - 量表 code、标题、标签文案再次硬编码一份。
- `src/router/index.ts`
  - `/assessment` 仍带 `meta.moduleCode = 'sensory'`，这会把整个评估入口当成“感官统合专页”。
  - `/assessment/select-student` 和 `/assessment/unified/:scaleCode/:studentId` 没有量表级授权校验。
- `src/stores/auth.ts`
  - `authStore.hasModuleAccess()` 只对顶层业务模块 `sensory / emotional / social / cognitive / life_skills` 生效。
  - 如果把 `fine-motor`、`soothing-aids` 这类 training entry code 直接传进去，会返回 `true`，不能拿来做授权判断。

这次重构只收口“评估入口展示与直链授权”：

- 做：
  - 评估入口布局分组
  - 评估入口按授权过滤
  - 学生选择页复用同一份量表目录
  - 直链授权阻断
- 不做：
  - `AssessmentContainer` 答题流程改造
  - Driver 评分逻辑改造
  - 报告页 UI 改版
  - 数据库 schema 迁移
  - 历史 `report_record.module_code` 语义清洗

说明：

- 本计划中的“入口展示授权”不等于“历史报告记录 module_code 归属”。
- 当前仓库里后者本来就没有完全统一，这次不顺手扩大范围。

## 2. 重构目标

1. 将评估入口按 6 个业务分类切成固定 Tab，但 Tab 标识必须对齐真实 `TRAINING_ENTRY_CODES`。
2. 允许同一量表在多个 Tab 中展示，但授权判断始终基于顶层业务模块。
3. 让 `/assessment` 从“感官统合专页”收口为“跨模块公共评估入口”。
4. 阻断未授权量表的直链进入，不能只做卡片隐藏。
5. 建立单一量表目录，避免 `AssessmentSelect.vue` 和 `SelectStudent.vue` 双份硬编码继续漂移。

## 3. 核心决策

### 3.1 `/assessment` 改为跨模块公共评估入口

当前 `/assessment` 被路由守卫按 `sensory` 模块整体拦截，这和“生活自理 / 社交沟通量表也应可见”的目标冲突。

本期决策：

- 去掉 `/assessment` 路由上的静态 `meta.moduleCode = 'sensory'`
- `/assessment` 页面只保留角色校验，不做整页模块拦截
- 量表级授权改为在：
  - `AssessmentSelect.vue`
  - `SelectStudent.vue`
  - `UnifiedAssessment` 进入前
  统一判断

### 3.2 Tab id 必须使用真实 training entry code

本期固定 6 个 Tab，但 id 必须直接使用当前仓库真实 code：

| Tab 文案 | Tab id |
| :--- | :--- |
| 感官统合 | `sensory-integration` |
| 情绪调节 | `emotional-regulation` |
| 情绪安抚 | `soothing-aids` |
| 社交沟通 | `social-communication` |
| 精细动作 | `fine-motor` |
| 生活自理 | `life-skills` |

不要再使用 `sensory / emotional / social / soothing` 这类伪 id。

### 3.3 授权判断始终使用顶层业务模块

Tab 是 training entry 视角，授权是 top-level module 视角，两者不能混用。

本期约束：

- `authStore.hasModuleAccess()` 只接收顶层模块 code
- 量表配置中不再使用单个 `requiredModule: string`
- 改为显式声明：
  - `accessModulesAnyOf: BusinessModuleCode[]`

即：

- 量表显示在哪些 Tab：看 `entryTabs`
- 量表是否授权可见：看 `accessModulesAnyOf`

### 3.4 单一量表目录是本期唯一真源

新增共享目录文件，建议放在：

- `src/features/assessment/assessment-scale-catalog.ts`

该文件负责承载：

- 量表基础 UI 元数据
- 所属 Tab
- 授权模块
- 页面文案

以下页面不得再各自维护独立量表列表：

- `src/views/assessment/AssessmentSelect.vue`
- `src/views/assessment/SelectStudent.vue`

## 4. 推荐量表目录口径

### 4.1 目录结构

```ts
import type { Component } from 'vue'
import type { TrainingEntryCode } from '@/utils/training-entry'

type AssessmentScaleCode =
  | 'sm'
  | 'weefim'
  | 'csirs'
  | 'conners-psq'
  | 'conners-trs'
  | 'sdq'
  | 'srs2'
  | 'cbcl'
  | 'cnbsr2016'
  | 'fine_motor'
  | 'gmfm_88'
  | 'tgmd_3'

type BusinessModuleCode = 'sensory' | 'emotional' | 'social' | 'life_skills' | 'cognitive'

export interface AssessmentScaleCatalogItem {
  code: AssessmentScaleCode
  title: string
  subtitle: string
  icon: Component
  buttonType: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  iconClass: string
  ageRange: string
  questionCount: string
  dimensions: string
  timeEstimate: string
  studentSelectorTitle: string
  studentSelectorTag: {
    type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
    label: string
    description: string
  }
  entryTabs: TrainingEntryCode[]
  accessModulesAnyOf: BusinessModuleCode[]
}
```

说明：

- `entryTabs` 只填真实 training entry code
- `accessModulesAnyOf` 只填顶层业务模块
- 暂不把历史 `report_record.module_code` 推断规则并入本目录，避免本次布局改造扩大为数据语义重构

### 4.2 推荐目录映射

| 量表 | code | 展示 Tab (`entryTabs`) | UI 授权 (`accessModulesAnyOf`) |
| :--- | :--- | :--- | :--- |
| CSIRS | `csirs` | `sensory-integration` | `sensory` |
| TGMD-3 | `tgmd_3` | `sensory-integration` | `sensory` |
| GMFM-88 | `gmfm_88` | `sensory-integration` | `sensory` |
| CBCL | `cbcl` | `emotional-regulation`, `soothing-aids` | `emotional` |
| Conners PSQ | `conners-psq` | `emotional-regulation`, `soothing-aids` | `emotional` |
| Conners TRS | `conners-trs` | `emotional-regulation` | `emotional` |
| SDQ | `sdq` | `emotional-regulation`, `social-communication` | `emotional`, `social` |
| SRS-2 | `srs2` | `social-communication` | `social` |
| FMDA | `fine_motor` | `fine-motor` | `sensory` |
| WeeFIM | `weefim` | `life-skills` | `life_skills` |
| S-M量表 | `sm` | `life-skills`, `social-communication` | `life_skills` |
| 儿心量表Ⅱ | `cnbsr2016` | `sensory-integration`, `fine-motor`, `social-communication`, `life-skills` | `sensory` |

补充说明：

- `SDQ`
  - 入口展示按“情绪调节 + 社交沟通”处理。
  - UI 授权允许 `emotional` 或 `social` 任一命中。
- `S-M量表`
  - 可以出现在 `social-communication` Tab 中，方便按领域浏览。
  - 但解锁口径仍维持 `life_skills`，不把它提升为 `social` 授权量表。
- `CNBSR2016`
  - 本期不采用“任意核心模块即可解锁”的口径。
  - 入口授权先严格维持 `sensory`，与当前平台对它的主定位保持一致。

## 5. 实施步骤

### 步骤 1：新增共享目录与访问工具

新增：

- `src/features/assessment/assessment-scale-catalog.ts`

建议同时导出：

- `ASSESSMENT_SCALE_CATALOG`
- `ASSESSMENT_TABS`
- `getAssessmentScaleCatalogItem(code)`
- `isAssessmentScaleAuthorized(item, hasModuleAccess)`
- `getVisibleAssessmentScalesForTab(tabId, hasModuleAccess)`

约束：

- `AssessmentSelect.vue` 与 `SelectStudent.vue` 都只能消费该目录
- 不允许继续各自维护 `validScales`、标题映射、标签映射等本地常量

### 步骤 2：收口路由授权策略

调整 `src/router/index.ts`：

1. 去掉 `/assessment` 上的 `meta.moduleCode = 'sensory'`
2. 为以下路径增加量表级校验：
   - `/assessment/select-student?scale=...`
   - `/assessment/unified/:scaleCode/:studentId`
3. 校验失败时：
   - 非法量表 code：回退 `/assessment`
   - 合法但未授权：提示“该量表未授权”，然后回退 `/assessment`

实现建议：

- 不把量表授权规则塞进 router meta
- 由共享工具基于 `scale` query / `scaleCode` param 统一判断

### 步骤 3：重构 `AssessmentSelect.vue`

改造点：

- 用共享目录替代模板内 12 张硬编码卡片
- 用 `el-tabs` 做固定 6 Tab 切换
- 每个 Tab 内部根据：
  - `entryTabs`
  - `accessModulesAnyOf`
  过滤出可见量表
- 卡片点击逻辑保持不变，仍进入 `/assessment/select-student?scale=...`

状态规则：

- Tab 固定显示 6 个，不按授权动态增删
- 当前 Tab 下无量表时，显示 `el-empty`
- 首次进入页面时：
  - 默认选中第一个“有可见量表”的 Tab
  - 如果全部为空，则默认选中 `sensory-integration`

### 步骤 4：重构 `SelectStudent.vue`

改造点：

- 删除本地 `validScales`
- 删除本地标题映射和标签映射
- 改为从共享目录读取：
  - 页面标题
  - `module-tag`
  - scale 是否存在
  - scale 是否授权

页面行为：

- query 中 scale 不合法：直接回退 `/assessment`
- scale 合法但未授权：提示后回退 `/assessment`
- 只有合法且已授权时，允许继续选学生并进入统一评估容器

### 步骤 5：统一评估容器入口兜底

虽然主要入口会经过选择页，但仍要防直链：

- `UnifiedAssessment` 进入时再次校验 `scaleCode`
- 未授权时直接阻断，不允许只靠 UI 隐藏

说明：

- 这一步只做进入前校验
- 不改 `AssessmentContainer.vue` 内部问卷、评分、持久化流程

## 6. 样式与交互要求

### 6.1 样式复用

以下样式尽量复用现有实现：

- `.scale-cards`
- `.scale-card`
- `.scale-icon`
- `.scale-title`
- `.scale-subtitle`
- `.scale-info`
- `.scale-btn`

新增样式只处理：

- `el-tabs` 容器与页头间距
- Tab 内容区与卡片网格的上下边距
- 空状态与当前面板的视觉一致性

### 6.2 交互要求

- 不显示锁图标，不显示“未授权”占位卡片
- 未授权量表必须直接从卡片列表中消失
- 但当前 Tab 仍保留，用空状态说明“该分类下暂无可用量表或相关模块未授权”

## 7. 非目标与风险控制

### 7.1 本期明确不做

- 不改量表答题内容
- 不改 Driver 评分逻辑
- 不改报告页入口和报告页布局
- 不改历史 `report_record.module_code` 的自动推断
- 不把评估入口改造成配置驱动的完整插件式注册表系统

### 7.2 已知风险

1. `SDQ / S-M / CNBSR2016` 都存在“多领域展示”和“单一模块授权”不完全一一对应的情况。
2. 当前仓库里部分量表历史报告记录的 `module_code` 口径并不统一，不能拿旧迁移脚本直接反推新的 UI 授权设计。
3. 如果后续业务要求把某些量表改成“多模块任一解锁”，应只改共享目录，不要回到页面里写分支。

## 8. 验收标准

1. 点击 6 个 Tab，能按 `entryTabs` 正确筛选量表。
2. `CBCL / SDQ / S-M / CNBSR2016` 等多归属量表能在多个 Tab 中正常显示。
3. 移除 `sensory` 授权后，`csirs / tgmd_3 / gmfm_88 / fine_motor / cnbsr2016` 从所有相关 Tab 中消失。
4. 仅保留 `life_skills` 授权时：
   - 可以进入 `/assessment`
   - 能看到 `WeeFIM / S-M`
   - 不能通过直链进入未授权量表
5. 仅保留 `social` 授权时：
   - 可以进入 `/assessment`
   - 能看到 `SRS-2`
   - 能看到 `SDQ`
   - 不能看到只依赖 `emotional` 的 `CBCL / Conners-*`
6. `/assessment/select-student?scale=xxx`
   - 非法 scale 会被回退
   - 未授权 scale 会被拦截
7. `/assessment/unified/:scaleCode/:studentId`
   - 非法 scale 会被回退
   - 未授权 scale 会被拦截
8. `AssessmentSelect.vue` 与 `SelectStudent.vue` 中不再保留第二份量表元数据常量。

## 9. 受影响文件

- `src/features/assessment/assessment-scale-catalog.ts` 新增
- `src/views/assessment/AssessmentSelect.vue`
- `src/views/assessment/SelectStudent.vue`
- `src/router/index.ts`

可选但本期不必修改：

- `src/views/assessment/AssessmentContainer.vue`
- `src/database/api.ts`
- `src/strategies/assessment/*Driver.ts`
