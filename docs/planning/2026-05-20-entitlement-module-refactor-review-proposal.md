# SCGP 授权能力包拆分评审方案

> 文档类型：方案评审稿  
> 当前状态：已完成首轮架构评审，建议进入阶段 1 影子映射层实施  
> 创建日期：2026-05-20  
> 适用范围：软件激活、模块授权、跨入口功能可见性、发码工具  
> 不适用范围：立即重写业务数据模型、迁移历史训练记录、实现认知发展完整业务模块

## 0. 首轮架构评审结论

2026-05-20 已收到架构评审反馈，结论为方案通过，建议立即按“阶段 1：影子映射层”开始实施。评审意见已采纳为以下约束：

1. `effectiveEntitlements` 只能在激活码解密、签名验证通过后计算，并写入 Pinia Store state，作为前端授权事实来源。
2. `hasEntitlementAccess()` 不得在调用时实时展开复杂映射，只能读取已经计算好的 `effectiveEntitlements`。
3. 授权判断默认拒绝未知 code。除明确声明为非授权受控的旧入口外，未知授权能力包不得放行。
4. 授权目录和映射配置使用 `Object.freeze()` 冻结，降低运行时被误改或注入篡改的风险。
5. 授权能力包使用 `const` 数组和 TypeScript 联合类型定义，避免页面侧传入散乱字符串。
6. 增加 `uiStrategy: 'hide' | 'lock'`。顶级未授权入口默认隐藏；具体功能可按产品策略显示锁定态。
7. DEV 环境保留 `debugOrigin`，记录每个有效授权来自“直接授权”还是“旧模块兼容展开”。
8. CBCL、Conners 系列归入 `emotional`，不跟随 `soothing_aids`。
9. 儿心量表Ⅱ第一阶段不拆多授权，继续按单一入口处理。
10. `cognitive` 在发码工具中显示为“预留（暂不可用）”，主程序可识别但不得把认知发展写成已交付模块。

## 1. 背景

SCGP 当前已经从早期单一感官训练系统演进为多入口平台。现有主线能力包括学生管理、能力评估、游戏训练、器材训练、训练记录、训练计划、报告生成、资源中心、系统管理、自理训练、情绪行为等。

与此同时，商业授权口径也从“是否激活系统”演进到“客户购买了哪些能力包”。当前代码已经具备模块授权基础，但授权粒度仍混合了两类概念：

- 顶层业务模块：`sensory`、`emotional`、`social`、`cognitive`、`life_skills`
- 训练入口：`sensory-integration`、`emotional-regulation`、`social-communication`、`fine-motor`、`soothing-aids`、`life-skills`

这两类概念在用户侧看起来都像“模块”，但在代码和数据里承担的职责不同。如果继续混用，会导致发码、菜单显示、资源过滤、记录查看、报告生成的授权口径不一致。

## 2. 当前实现事实

以下结论来自当前代码和现行规划文档，不是目标态推测。

### 2.1 当前顶层授权模块

`src/stores/auth.ts` 中的 `BUSINESS_MODULE_CODES` 当前只认以下 5 个顶层业务模块：

```ts
sensory
emotional
social
cognitive
life_skills
```

`hasModuleAccess(moduleCode)` 只会对这 5 个值执行授权判断。如果传入 `fine-motor`、`soothing-aids` 等训练入口 code，当前实现会把它们视为非受控值并返回 `true`。

### 2.2 当前训练入口到业务模块的映射

`src/utils/training-entry.ts` 当前定义了 6 个训练入口：

| 训练入口 | 当前显示语义 | 当前归属业务模块 |
| --- | --- | --- |
| `sensory-integration` | 感官统合训练 | `sensory` |
| `emotional-regulation` | 情绪调节 | `emotional` |
| `social-communication` | 社交沟通 | `social` |
| `fine-motor` | 精细动作 | `sensory` |
| `soothing-aids` | 安抚教具 / 情绪安抚 | `emotional` |
| `life-skills` | 生活自理 | `life_skills` |

因此，当前现实是：

- 激活 `sensory` 会同时放开感官统合和精细动作入口。
- 激活 `emotional` 会同时放开情绪调节和安抚教具入口。
- 自理训练顶层入口和 `task_training` 自理任务训练挂在 `life_skills`。
- `cognitive` 目前是预留授权位，没有完整业务主链。

### 2.3 相关现行文档

当前已有文档已经指出了“训练入口”和“顶层授权模块”不能混用：

- `docs/planning/2026-04-13-assessment-layout-refactor-plan.md`
  - 明确 `fine-motor`、`soothing-aids` 是 training entry code，不是顶层授权模块。
  - 明确授权判断应使用 `accessModulesAnyOf`。
- `docs/planning/2026-04-19-wave1-auth-activation-hardening-plan.md`
  - 关注认证和激活安全链路，提到激活缓存不应作为授权事实来源。
- `license-generator-dist/README.md`
  - 当前发码工具按 5 个顶层业务模块发码。

## 3. 问题陈述

当前问题不是“缺少授权系统”，而是授权语义与产品售卖口径开始分叉。

产品侧希望按以下能力包控制访问：

- 感统训练
- 情绪发展
- 社交沟通
- 精细动作
- 安抚系统
- 生活自理
- 认知发展（占位保留，后续再接入）

代码侧当前按以下顶层业务模块控制：

- `sensory`
- `emotional`
- `social`
- `cognitive`
- `life_skills`

其中“精细动作”和“安抚系统”在产品侧可能需要成为独立售卖或独立授权能力包，但代码侧目前分别归在 `sensory` 和 `emotional` 下。

如果继续使用当前口径，会出现以下问题：

1. 销售发码无法单独控制“精细动作”和“安抚系统”。
2. 用户看到的菜单入口与激活码模块名不完全一致。
3. 跨入口页面需要重复写映射逻辑，例如游戏训练、器材训练、训练记录、资源中心、报告生成。
4. 后续加入认知发展时，可能继续扩大这种混用。
5. 直接修改 `module_code` 又会破坏历史数据归属和资源模型。

## 4. 设计目标

本方案目标是建立一层独立授权能力包模型，使产品授权粒度与业务数据归属解耦。

目标包括：

1. 支持按感统训练、情绪发展、社交沟通、精细动作、安抚系统、生活自理控制访问。
2. 保留认知发展授权占位，但不把它写成已交付模块。
3. 不直接重写现有 `sys_training_resource.module_code`、历史训练记录和报告记录。
4. 让游戏训练、器材训练、训练记录、能力评估、报告生成、资源中心都能统一消费同一套授权判断。
5. 兼容旧激活码，避免已发码客户升级后丢失既有能力。
6. 为发码工具提供清晰、可审计的授权包列表。

## 5. 非目标

本方案不做以下事项：

- 不把 `fine-motor` 改成新的数据库 `module_code`。
- 不把 `soothing-aids` 改成新的数据库 `module_code`。
- 不迁移历史训练记录、历史报告记录的 `module_code`。
- 不实现认知发展完整功能。
- 不改变当前资源主模型 `sys_training_resource + sys_tags + sys_resource_tag_map`。
- 不引入远程授权服务或在线验权。

## 6. 推荐方案：新增授权能力包层

推荐新增独立的授权能力包（Entitlement Package）层。

### 6.1 核心原则

`module_code` 继续表达数据和业务归属。

`entitlementCode` 表达客户购买和激活的能力包。

两者通过显式映射连接，不再隐式等同。

### 6.2 授权能力包建议定义

| 授权能力包 code | 中文名 | 当前状态 | 说明 |
| --- | --- | --- | --- |
| `sensory_integration` | 感统训练 | 当前可用 | 对应感官统合训练入口 |
| `emotional` | 情绪发展 | 当前可用 | 对应情绪行为、情绪调节入口 |
| `social_communication` | 社交沟通 | 当前可用 / 部分入口 | 对应社交沟通训练入口和相关评估 |
| `fine_motor` | 精细动作 | 当前可用 | 当前数据仍归属 `sensory`，但授权可独立 |
| `soothing_aids` | 安抚系统 | 当前可用 | 当前数据仍归属 `emotional`，但授权可独立 |
| `life_skills` | 生活自理 | 当前可用 | 对应自理训练、生活自理任务训练 |
| `cognitive` | 认知发展 | 占位保留 | 等后续认知功能模块接入 |

命名建议使用下划线风格，原因是现有激活码中已使用 `life_skills`，保持一致性优先于前端路由中的短横线风格。

## 7. 功能入口授权策略

### 7.1 自理训练

自理训练应整体要求 `life_skills`。

依据：

- `src/features/self-care/task-training-contract.ts` 固定 `TASK_TRAINING_MODULE_CODE = 'life_skills'`
- `src/features/self-care/task-training-contract.ts` 固定 `TASK_TRAINING_ENTRY_CODE = 'life-skills'`
- 自理训练是明确的新顶层入口，不应跟感官或情绪授权绑定。

### 7.2 情绪行为

情绪行为应整体要求 `emotional`。

依据：

- `src/router/index.ts` 中 `/emotional` 顶层路由当前 `meta.moduleCode = 'emotional'`
- 情绪场景训练、表达关心训练、情绪小游戏、情绪报告都在 `emotional` 业务空间下。

### 7.3 能力评估

能力评估不应整体要求某一个授权包，而应按量表过滤。

建议映射：

| 量表 | 展示入口 | 授权能力包 |
| --- | --- | --- |
| CSIRS | 感统训练 | `sensory_integration` |
| TGMD-3 | 感统训练 | `sensory_integration` |
| GMFM-88 | 感统训练 | `sensory_integration` |
| 小肌肉功能发展评估量表 | 精细动作 | `fine_motor` |
| CBCL | 情绪发展 | `emotional` |
| Conners-PSQ | 情绪发展 | `emotional` |
| Conners-TRS | 情绪发展 | `emotional` |
| SDQ | 情绪发展、社交沟通 | `emotional` 或 `social_communication` |
| SRS-2 | 社交沟通 | `social_communication` |
| WeeFIM | 生活自理 | `life_skills` |
| S-M 量表 | 生活自理、社交沟通 | `life_skills` |
| 儿心量表Ⅱ | 感统训练、精细动作、社交沟通、生活自理 | 建议暂维持 `sensory_integration`，后续单独评审 |

已确认口径：

- CBCL 和 Conners 系列属于通用情绪行为筛查，跟随 `emotional`，不跟随 `soothing_aids`。
- 儿心量表Ⅱ包含多个发展领域，但历史上更接近综合基础评估。第一阶段不要拆成多个授权包。

### 7.4 游戏训练

游戏训练应按训练入口过滤，而不是整体授权。

建议映射：

| 训练入口 | 授权能力包 |
| --- | --- |
| `sensory-integration` | `sensory_integration` |
| `emotional-regulation` | `emotional` |
| `social-communication` | `social_communication` |
| `fine-motor` | `fine_motor` |
| `soothing-aids` | `soothing_aids` |
| `life-skills` | `life_skills` |

如果一个游戏未来跨多个训练入口，应显式声明 `requiredEntitlementsAnyOf` 或 `requiredEntitlementsAllOf`，不要通过 `module_code` 推断。

### 7.5 器材训练

器材训练也应按训练入口过滤。

当前器材入口已经通过 `src/utils/equipment-training-entry.ts` 和 `src/utils/training-entry.ts` 统一到 6 个 entry。改造时应复用同一套 entry 到 entitlement 的映射。

### 7.6 训练记录

训练记录应按记录的 `entry_code` 或可推断训练入口过滤。

优先级建议：

1. 记录自身的 `entry_code`
2. 资源 metadata 中的 `trainingEntryCode` 或 `entryCode`
3. 资源分类和 `module_code` 兼容推断
4. 无法推断时按历史默认策略处理，并在 UI 上避免显示到未授权入口

风险：

- 旧记录可能缺少 `entry_code`。
- 如果只看 `module_code = sensory`，会无法区分感统训练和精细动作。

### 7.7 报告生成

报告生成应按报告来源授权过滤。

建议策略：

- 评估报告：沿用量表到授权能力包的映射。
- 游戏训练报告：沿用训练入口到授权能力包的映射。
- 器材训练报告：沿用训练入口到授权能力包的映射。
- 综合报告：只展示当前用户已授权能力包覆盖的数据来源。

不要用单一 `report_record.module_code` 直接决定所有报告可见性，因为历史报告记录的 `module_code` 口径并不完全统一。

### 7.8 资源中心

资源中心应按资源可推断的授权能力包过滤。

建议优先级：

1. resource metadata 中的 `trainingEntryCode` 或 `entryCode`
2. `resource_type` 专用规则，例如 `task_training` 固定 `life_skills`
3. 资源分类映射，例如精细动作分类对应 `fine_motor`
4. `module_code` 兼容推断，例如 `emotional` 默认 `emotional`

资源中心是风险最高的入口之一，因为资源既有模块归属，又有分类、标签和历史数据。建议在第一阶段只做可见性过滤，不做数据迁移。

## 8. 旧激活码兼容策略

为了避免旧客户升级后失去已有能力，建议建立旧模块到新授权能力包的兼容展开。

| 旧授权模块 | 兼容展开为 |
| --- | --- |
| `sensory` | `sensory_integration`、`fine_motor` |
| `emotional` | `emotional`、`soothing_aids` |
| `social` | `social_communication` |
| `life_skills` | `life_skills` |
| `cognitive` | `cognitive` |

兼容策略建议分两层：

1. 激活读取层：激活码解密和签名验证通过后，读取 `am` 字段并展开为 `effectiveEntitlements`。
2. 发码工具层：新发码直接写入新授权能力包 code。

是否继续在新码里写旧模块 code，需要评审决定。

推荐做法：

- 新码只写新授权能力包 code。
- 主程序同时兼容旧模块 code 和新能力包 code。
- 发码工具提供清晰说明：旧模块名已转为兼容输入，不再作为推荐发码项。

安全约束：

- 未通过验签的激活数据不得参与 `effectiveEntitlements` 计算。
- `effectiveEntitlements` 写入 Store state 后，页面授权判断只读该结果。
- 旧模块兼容展开只在统一函数中执行一次，不允许页面、路由、资源列表重复实现。

## 9. 数据模型建议

### 9.1 新增前端授权目录

建议新增：

```text
src/features/entitlements/entitlement-catalog.ts
src/features/entitlements/useEntitlementResolver.ts
```

职责：

- 定义所有授权能力包 code。
- 定义中文名、状态、说明。
- 定义旧模块到新授权能力包的兼容展开。
- 定义训练入口到授权能力包的映射。
- 定义 UI 策略，例如 `hide` 或 `lock`。
- 提供统一判断函数。

示例接口：

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

export interface EntitlementDefinition {
  code: EntitlementCode
  name: string
  status: 'active' | 'placeholder'
  uiStrategy: 'hide' | 'lock'
  description: string
}
```

### 9.2 授权 Store 建议

`src/stores/auth.ts` 可保留 `allowedModules` 兼容字段，但新增：

```ts
effectiveEntitlements: EntitlementCode[]
entitlementDebugOrigins: Record<EntitlementCode, string[]>
hasEntitlementAccess(entitlementCode: EntitlementCode): boolean
```

迁移期内：

- `hasModuleAccess()` 保留，供未改造入口继续使用。
- 新入口逐步改为 `hasEntitlementAccess()`。
- 最终减少直接调用 `hasModuleAccess()` 的场景。

实现约束：

- `hasEntitlementAccess()` 必须默认拒绝未知授权能力包。
- `hasEntitlementAccess()` 只能检查 `effectiveEntitlements`，不得在函数内部展开旧模块兼容映射。
- 全量授权继续走明确的 full access 分支。
- `entitlementDebugOrigins` 仅在 `import.meta.env.DEV` 下用于诊断，不作为生产授权判断依据。

### 9.3 激活数据结构建议

当前激活码中使用 `am` 字段保存授权列表。

兼容期可不改字段名，仍使用 `am`，但内容从旧模块 code 扩展到新授权能力包 code。

原因：

- 减少激活码格式变更。
- 避免发码工具和主程序同时大改。
- RSA 签名结构无需调整。

## 10. 发码工具改造建议

`license-generator-dist` 应从“顶层模块发码”改成“授权能力包发码”。

建议 UI 展示：

- 感统训练
- 情绪发展
- 社交沟通
- 精细动作
- 安抚系统
- 生活自理
- 认知发展（预留，暂不可用）

发码工具需要说明：

- 旧 `sensory` 兼容为感统训练 + 精细动作。
- 旧 `emotional` 兼容为情绪发展 + 安抚系统。
- 认知发展当前只是预留授权包，不代表系统已交付认知模块。
- 认知发展在发码工具中应显示为“预留（暂不可用）”，默认不勾选。

## 11. 分阶段实施建议

### 阶段 1：建立授权能力包目录和影子映射层

目标：

- 新增统一授权目录。
- 不改 UI 行为。
- 用单元测试确认旧模块展开逻辑正确。
- 在 Store 中计算并缓存 `effectiveEntitlements`。
- 在 DEV 环境记录 `debugOrigin`。

验收：

- `sensory` 展开为 `sensory_integration + fine_motor`。
- `emotional` 展开为 `emotional + soothing_aids`。
- `life_skills` 仍保持 `life_skills`。
- `cognitive` 保留但状态为占位。
- `hasEntitlementAccess()` 对未知 code 默认返回 `false`。
- 现有 UI 行为不发生变化。
- 控制台或单元测试可验证旧 `am: ['sensory']` 展开为 `['sensory_integration', 'fine_motor']`。

### 阶段 2：改造训练入口授权

目标：

- 游戏训练、器材训练、训练记录使用 entry 到 entitlement 的映射。

验收：

- 仅授权 `fine_motor` 时，只显示精细动作相关入口。
- 仅授权 `sensory_integration` 时，不显示精细动作入口。
- 仅授权 `soothing_aids` 时，只显示安抚系统相关入口，不自动显示情绪调节入口。

### 阶段 3：改造能力评估授权

目标：

- `assessment-scale-catalog.ts` 从 `accessModulesAnyOf` 迁移到 `accessEntitlementsAnyOf`。

验收：

- 小肌肉功能发展评估量表跟随 `fine_motor`。
- WeeFIM 跟随 `life_skills`。
- SRS-2 跟随 `social_communication`。
- 未授权量表直链仍被拦截。

### 阶段 4：改造资源中心和报告生成

目标：

- 资源中心和报告生成按授权能力包过滤内容。

验收：

- 未授权能力包的数据不出现在资源列表、报告入口和记录入口中。
- 历史数据不迁移，但可通过兼容推断归到正确能力包。

### 阶段 5：更新发码工具和文档

目标：

- 发码工具改为新授权能力包列表。
- 文档和发码说明统一。

验收：

- 新生成激活码中 `am` 写入新授权能力包 code。
- 主程序能识别新码。
- 主程序仍能识别旧码。

## 12. 风险与缓解

### 12.1 历史数据缺少 entry_code

风险：

旧记录或旧资源可能只有 `module_code`，无法精确区分感统训练与精细动作、情绪调节与安抚系统。

缓解：

- 第一阶段只做可见性过滤，不做数据迁移。
- 兼容推断缺失时优先保持旧行为。
- 对无法推断的数据增加内部诊断日志或管理端提示。

### 12.2 旧激活码权限变化

风险：

如果新模型不兼容旧码，客户升级后可能失去功能。

缓解：

- 旧 `sensory` 自动展开为 `sensory_integration + fine_motor`。
- 旧 `emotional` 自动展开为 `emotional + soothing_aids`。
- 兼容逻辑写在统一授权目录中，不散落在页面里。

### 12.3 认知发展被误认为已交付

风险：

发码工具显示 `cognitive` 后，销售或客户可能认为认知发展模块已完整可用。

缓解：

- 文案标记为“预留”或“占位”。
- 默认不勾选，或勾选时提示“当前仅保留授权位”。
- 产品文档中不得把认知发展写成已交付模块。

### 12.4 页面重复实现授权判断

风险：

如果各页面自行维护映射，会再次出现口径漂移。

缓解：

- 所有页面只调用 `hasEntitlementAccess()`。
- 训练入口、量表、资源、报告的映射集中维护。
- 新增测试覆盖核心映射。

## 13. 评审重点

请评审方重点确认以下问题：

1. 是否同意把“授权能力包”和 `module_code` 解耦？
2. 是否同意 `fine_motor` 从销售授权角度独立出来，但数据归属仍保留在 `sensory`？
3. 是否同意 `soothing_aids` 从销售授权角度独立出来，但数据归属仍保留在 `emotional`？
4. CBCL、Conners 等情绪相关量表已确认随 `emotional` 授权开放，不随 `soothing_aids`。
5. 儿心量表Ⅱ第一阶段已确认继续挂在单一授权入口，不拆多授权。
6. 新激活码是否只写新授权能力包 code，旧模块 code 仅做兼容？
7. `cognitive` 在发码工具中应默认隐藏、禁用，还是显示为占位？

## 14. 推荐结论

推荐采用“新增授权能力包层”的方案。

该方案的核心收益是：

- 能满足产品侧更细的授权售卖口径。
- 不破坏当前数据库和历史数据归属。
- 可以兼容旧激活码。
- 能把游戏训练、器材训练、训练记录、能力评估、报告生成、资源中心统一到同一套授权判断。
- 为后续认知发展模块预留清晰接入口。

不推荐直接把 `fine-motor`、`soothing-aids` 改成新的 `module_code`。那会把授权问题变成数据迁移问题，风险和成本都明显更高。
