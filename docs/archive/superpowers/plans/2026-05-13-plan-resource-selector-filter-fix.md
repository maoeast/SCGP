# 训练计划资源选择筛选修复实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 修复“训练计划 > 新建计划 > 资源编排 > 添加资源”弹窗中的模块/类型筛选口径，使模块列表与产品预期一致，且类型只保留“游戏 / 器材”。

**架构：** 把计划页里过时的硬编码筛选口径抽离成一个纯 TypeScript 工具模块，由它统一定义筛选项、资源归类规则和过滤逻辑。`PlanList.vue` 只负责绑定 UI 与调用该工具，测试直接覆盖该纯逻辑模块，避免在 SFC 上做脆弱回归。

**技术栈：** Vue 3、TypeScript、Node 内置 `assert`、现有 `ResourceAPI` / 训练资源业务分组工具

---

### 任务 1：固定筛选口径回归测试

**文件：**
- 创建：`tests/plan-resource-selector-filter.test.ts`
- 依赖：`src/views/plan/plan-resource-selector-filter.ts`

- [ ] **步骤 1：编写失败的测试**

```ts
import assert from 'node:assert/strict'

import {
  PLAN_RESOURCE_SELECTOR_MODULE_OPTIONS,
  PLAN_RESOURCE_SELECTOR_TYPE_OPTIONS,
  filterPlanResourceSelectorItems,
} from '../src/views/plan/plan-resource-selector-filter.ts'

assert.deepEqual(
  PLAN_RESOURCE_SELECTOR_MODULE_OPTIONS.map((item) => item.label),
  ['全部模块', '自理训练', '生活自理', '情绪场景', '表达关心', '感官训练', '情绪调节', '安抚教具', '社交沟通', '精细动作']
)

assert.deepEqual(
  PLAN_RESOURCE_SELECTOR_TYPE_OPTIONS.map((item) => item.label),
  ['全部类型', '游戏', '器材']
)
```

- [ ] **步骤 2：运行测试验证失败**

运行：`node --experimental-strip-types tests/plan-resource-selector-filter.test.ts`

预期：FAIL，报错找不到 `plan-resource-selector-filter.ts` 或导出不匹配。

- [ ] **步骤 3：补充资源归类与过滤断言**

```ts
assert.equal(filterPlanResourceSelectorItems(resources, { moduleFilter: 'task-training', typeFilter: 'all' }).length, 1)
assert.equal(filterPlanResourceSelectorItems(resources, { moduleFilter: 'life-skills', typeFilter: 'all' }).length, 2)
assert.equal(filterPlanResourceSelectorItems(resources, { moduleFilter: 'all', typeFilter: 'game' }).length, 4)
assert.equal(filterPlanResourceSelectorItems(resources, { moduleFilter: 'all', typeFilter: 'equipment' }).length, 2)
```

- [ ] **步骤 4：再次运行测试验证仍然失败**

运行：`node --experimental-strip-types tests/plan-resource-selector-filter.test.ts`

预期：FAIL，失败点来自未实现逻辑，而不是测试语法错误。

### 任务 2：实现计划页资源筛选工具

**文件：**
- 创建：`src/views/plan/plan-resource-selector-filter.ts`
- 复用：`src/utils/resource-center-business.ts`
- 复用：`src/features/self-care/task-training-contract.ts`

- [ ] **步骤 1：定义模块/类型筛选项与筛选值类型**

```ts
export const PLAN_RESOURCE_SELECTOR_MODULE_OPTIONS = [
  { value: 'all', label: '全部模块' },
  { value: 'task-training', label: '自理训练' },
  { value: 'life-skills', label: '生活自理' },
  { value: 'emotion-scene', label: '情绪场景' },
  { value: 'care-scene', label: '表达关心' },
  { value: 'sensory-training', label: '感官训练' },
  { value: 'emotional-regulation', label: '情绪调节' },
  { value: 'soothing-aids', label: '安抚教具' },
  { value: 'social-communication', label: '社交沟通' },
  { value: 'fine-motor', label: '精细动作' },
] as const
```

- [ ] **步骤 2：实现资源归类规则**

```ts
if (resource.resourceType === TASK_TRAINING_RESOURCE_TYPE) return 'task-training'
if (resource.resourceType === 'emotion_scene') return 'emotion-scene'
if (resource.resourceType === 'care_scene') return 'care-scene'

switch (resolveTrainingResourceBusinessGroupCode(resource)) {
  case 'life-skills': return 'life-skills'
  case 'sensory-training': return 'sensory-training'
  case 'emotional-regulation': return 'emotional-regulation'
  case 'soothing-aids': return 'soothing-aids'
  case 'social-communication': return 'social-communication'
  case 'fine-motor': return 'fine-motor'
}
```

- [ ] **步骤 3：实现只保留“游戏 / 器材”的显示类型归一化**

```ts
export function resolvePlanResourceSelectorDisplayType(resource: Pick<ResourceItem, 'resourceType'>): 'game' | 'equipment' | null {
  const displayType = resolveTrainingResourceDisplayType(resource)
  return displayType === 'game' || displayType === 'equipment' ? displayType : null
}
```

- [ ] **步骤 4：实现统一过滤函数**

```ts
export function filterPlanResourceSelectorItems(
  resources: ResourceItem[],
  filters: { moduleFilter: PlanResourceSelectorModuleFilter; typeFilter: PlanResourceSelectorTypeFilter }
): ResourceItem[] {
  return resources.filter((resource) => {
    const displayType = resolvePlanResourceSelectorDisplayType(resource)
    if (!displayType) return false
    if (filters.typeFilter !== 'all' && displayType !== filters.typeFilter) return false
    if (filters.moduleFilter === 'all') return true
    return resolvePlanResourceSelectorModuleFilter(resource) === filters.moduleFilter
  })
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`node --experimental-strip-types tests/plan-resource-selector-filter.test.ts`

预期：PASS，并输出自定义通过日志。

### 任务 3：回接计划页弹窗

**文件：**
- 修改：`src/views/plan/PlanList.vue`
- 测试：`tests/plan-resource-selector-filter.test.ts`

- [ ] **步骤 1：用统一配置替换弹窗里的旧硬编码筛选项**

```vue
<el-radio-button
  v-for="option in planResourceSelectorModuleOptions"
  :key="option.value"
  :value="option.value"
>
  {{ option.label }}
</el-radio-button>
```

- [ ] **步骤 2：把类型筛选改为仅“全部类型 / 游戏 / 器材”**

```vue
<el-radio-button
  v-for="option in planResourceSelectorTypeOptions"
  :key="option.value"
  :value="option.value"
>
  {{ option.label }}
</el-radio-button>
```

- [ ] **步骤 3：把脚本状态和计算属性接到筛选工具**

```ts
const resourceFilterModule = ref<PlanResourceSelectorModuleFilter>('all')
const resourceFilterType = ref<PlanResourceSelectorTypeFilter>('all')

const filteredAvailableResources = computed(() =>
  filterPlanResourceSelectorItems(availableResources.value, {
    moduleFilter: resourceFilterModule.value,
    typeFilter: resourceFilterType.value,
  }).filter((resource) => {
    if (resourceFilterType.value !== 'equipment' || resourceFilterCatalogGroup.value === 'all') {
      return true
    }
    return resolveEquipmentCatalogGroupCode(resource) === resourceFilterCatalogGroup.value
  })
)
```

- [ ] **步骤 4：简化资源加载逻辑，按模块码抓取后交给统一过滤函数处理**

```ts
const modules: ModuleCode[] = [
  ModuleCode.SENSORY,
  ModuleCode.EMOTIONAL,
  ModuleCode.SOCIAL,
  TASK_TRAINING_MODULE_CODE as ModuleCode,
]

availableResources.value = modules.flatMap((moduleCode) =>
  api.getResources({ moduleCode, keyword: resourceSearchKeyword.value || undefined })
)
```

- [ ] **步骤 5：运行回归测试与类型检查**

运行：`node --experimental-strip-types tests/plan-resource-selector-filter.test.ts`

预期：PASS

运行：`npm run type-check`

预期：PASS
