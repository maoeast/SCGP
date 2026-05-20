# SCGP 授权能力包阶段 1 实施计划：影子映射层

> 文档类型：实施计划  
> 当前状态：待执行  
> 创建日期：2026-05-20  
> 上游方案：`docs/planning/2026-05-20-entitlement-module-refactor-review-proposal.md`  
> 目标：先建立授权能力包目录、兼容展开和 Store 缓存，不改变现有 UI 行为

## 1. 背景

首轮架构评审已通过“授权能力包”和 `module_code` 解耦方案。阶段 1 不直接改造菜单、路由、资源中心、报告生成或训练入口，只增加一层影子映射能力，用于验证旧激活码兼容和新授权能力包模型。

当前事实：

- 旧授权模块为 `sensory`、`emotional`、`social`、`cognitive`、`life_skills`。
- 新授权能力包为 `sensory_integration`、`emotional`、`social_communication`、`fine_motor`、`soothing_aids`、`life_skills`、`cognitive`。
- 旧 `sensory` 需要兼容展开为 `sensory_integration + fine_motor`。
- 旧 `emotional` 需要兼容展开为 `emotional + soothing_aids`。
- `cognitive` 是预留位，不代表认知发展模块已交付。

## 2. 阶段目标

阶段 1 只解决三个问题：

1. 建立统一授权能力包目录。
2. 在激活码验签后计算 `effectiveEntitlements`。
3. 用测试确认旧模块和新授权能力包能同时被识别。

阶段 1 不做以下事项：

- 不改变现有菜单显示。
- 不替换路由守卫逻辑。
- 不改资源中心过滤。
- 不改报告生成过滤。
- 不改发码工具 UI。
- 不迁移数据库字段。

## 3. 建议文件范围

新增：

- `src/features/entitlements/entitlement-catalog.ts`
- `src/features/entitlements/useEntitlementResolver.ts`
- `src/features/entitlements/__tests__/entitlement-catalog.test.ts`

修改：

- `src/stores/auth.ts`

如项目当前测试目录结构不支持 feature 内测试，可按现有测试约定放到 `tests/` 下，但测试名称仍应明确指向 entitlement catalog。

## 4. 授权目录设计

`entitlement-catalog.ts` 应提供：

```ts
export const ENTITLEMENT_CODES = Object.freeze([
  'sensory_integration',
  'emotional',
  'social_communication',
  'fine_motor',
  'soothing_aids',
  'life_skills',
  'cognitive',
] as const)

export type EntitlementCode = typeof ENTITLEMENT_CODES[number]
```

目录定义包含：

- `code`
- `name`
- `status: 'active' | 'placeholder'`
- `uiStrategy: 'hide' | 'lock'`
- `description`

映射配置必须用 `Object.freeze()` 冻结。

## 5. 兼容展开规则

阶段 1 固定兼容规则：

| 输入 code | 输出授权能力包 |
| --- | --- |
| `sensory` | `sensory_integration`、`fine_motor` |
| `emotional` | `emotional`、`soothing_aids` |
| `social` | `social_communication` |
| `life_skills` | `life_skills` |
| `cognitive` | `cognitive` |
| 新授权能力包 code | 原样保留 |
| 未知 code | 忽略，并在 DEV 记录诊断信息 |

不得让未知 code 自动获得权限。

## 6. Store 改造

`src/stores/auth.ts` 保留现有 `allowedModules` 和 `hasModuleAccess()`，新增：

```ts
effectiveEntitlements: EntitlementCode[]
entitlementDebugOrigins: Partial<Record<EntitlementCode, string[]>>
hasEntitlementAccess(code: EntitlementCode): boolean
```

实现要求：

- 只有在激活码解密和签名验证通过后，才能计算 `effectiveEntitlements`。
- `hasEntitlementAccess()` 只读取 `effectiveEntitlements`，不得实时展开旧模块。
- full access 仍走明确分支。
- 未知 code 默认返回 `false`。
- `entitlementDebugOrigins` 仅用于 DEV 诊断，不参与生产授权判断。

## 7. Resolver 占位

`useEntitlementResolver.ts` 在阶段 1 可以先提供纯函数能力，不接入页面：

- `resolveTrainingEntryEntitlement(entryCode)`
- `resolveLegacyModuleEntitlements(moduleCode)`
- `isEntitlementCode(value)`

后续阶段再扩展到 Resource、Scale、TrainingEntry、Report。

## 8. 测试要求

至少覆盖：

1. `['sensory']` 展开为 `['sensory_integration', 'fine_motor']`。
2. `['emotional']` 展开为 `['emotional', 'soothing_aids']`。
3. `['social']` 展开为 `['social_communication']`。
4. `['life_skills']` 保持 `['life_skills']`。
5. `['cognitive']` 保持 `['cognitive']`，且定义状态为 `placeholder`。
6. 新 code 例如 `['fine_motor']` 原样保留。
7. 未知 code 不进入 `effectiveEntitlements`。
8. 混合输入去重，例如 `['sensory', 'fine_motor']` 只产生一个 `fine_motor`。
9. `hasEntitlementAccess()` 对未知 code 返回 `false`。

## 9. 验收标准

阶段 1 完成后应满足：

- 现有 UI 行为不变化。
- 旧激活码不会丢失既有能力。
- 新授权能力包 code 可被主程序识别。
- 授权映射集中在 `src/features/entitlements/`。
- 页面侧没有新增散落映射。
- 单元测试能证明兼容展开和默认拒绝策略。

## 10. 后续衔接

阶段 1 通过后，再进入：

1. 阶段 2：训练入口授权改造。
2. 阶段 3：能力评估授权改造。
3. 阶段 4：资源中心和报告生成过滤。
4. 阶段 5：发码工具和文档改造。
