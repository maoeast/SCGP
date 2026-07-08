# 认知发展（cognitive）器材资源 + 器材训练模块接入计划

> status: **draft / 未实施**（2026-07-08 交接，摸底已完成，代码未动）
> created: 2026-07-08
> 来源: 用户任务 —— 资源中心新增「认知发展」业务分组（器材）+ 器材训练新增「认知发展」模块
> 性质: 这是**计划/目标态**文档，不是现状。所有"当前是 X"均以代码现实为准（已在 2026-07-08 摸底核对）。

---

## 0. 任务定义

在「资源中心 → 训练资源 → 业务分组」新增「认知发展」业务分组（展示类型 = 器材），从外部 CSV + images 导入 52 条器材资源（名称/详细描述/能力标签/图片），并在「器材训练」新增「认知发展」模块，复用已有 6 个器材训练模块（sensory-integration / emotional-regulation / social-communication / fine-motor / soothing-aids / life-skills）的运行逻辑。

成功标准：资源中心能看到并筛选「认知发展」分组下的 52 条器材资源（带图）；器材训练出现「认知发展」入口卡片，进入后能对认知资源做快速录入并落 `equipment_training_records` + `training_session`；`npm run type-check` exit 0。

---

## 1. 数据源（已确认，2026-07-08）

### 1.1 CSV
- 路径: `G:\SCGP_Rec\认知\认知能力发展课程资源包功能描述.csv`
- 编码: **UTF-8 with BOM**（parser 已处理 BOM，无需手工去）
- 行数: 53 行 = 1 表头 + **52 条数据**（序号 1–52）
- 表头: `序号,箱号,类别名称,产品名称,教育目标与功能描述,能力标签`
- 字段映射:
  - `产品名称` → 资源名称（name）
  - `教育目标与功能描述` → 详细描述（description）
  - `能力标签` → 能力标签（中文顿号「、」分隔多标签，parser 已支持）
  - `序号` → 对应 images 文件名；也用于生成 resourceCode
  - `箱号` → 用于生成 resourceCode（box 号）
  - `类别名称` → sourceCategory（8 类：基础配对类/物品认知类/人物与身体类/动作与场景类/特征与逻辑类/情绪与社交类/综合认知活动类/教学支持类）
- 已知数据问题:
  - **序号 16 与 17 产品名都是「交通工具」**（描述不同，箱号都是 7）→ 因序号不同，会生成两条不同 resourceCode，不会误去重。但两条箱号=7、序号=16/17 → resourceCode 分别 `cognitive-box07-seq016` / `cognitive-box07-seq017`，正常。
  - `箱号` 最大 23，`序号` 最大 52。

### 1.2 images
- 路径: `G:\SCGP_Rec\认知\images\`
- 数量: **52 张**，命名 `1.png` ~ `52.png`，文件名 = CSV 序号，全 `.png`
- 体积: 多在 50K–700K，**`22.png` = 7.5MB（异常偏大，必须压缩）**

---

## 2. 代码摸底结论（已完成，新会话无需重新摸底）

### 2.0 最关键全局结论：`cognitive` 是「类型已存在、但占位未激活」

| 维度 | 现状 | 含义 |
|------|------|------|
| `ModuleCode.COGNITIVE` | ✅ 已定义 `src/types/module.ts:37` | 顶层模块 code 已有 |
| `BUSINESS_MODULE_CODES` 含 cognitive | ✅ `src/stores/auth.ts:42` | `hasModuleAccess('cognitive')` 授权后可通过 |
| entitlement `cognitive` | ⚠️ `status:'placeholder'` + `uiStrategy:'lock'` `src/features/entitlements/entitlement-catalog.ts:86-92` | **头号坑**：不改状态，即便授权，器材训练卡片与资源中心分组可能不显示 |
| `TrainingEntryCode` 含 cognitive | ❌ 只有 6 个 | 本次新增第 7 个 |
| `PHYSICAL_EQUIPMENT_DOMAINS` 含 cognitive | ❌ 只有 5 个 | 本次新增第 6 个 |
| 资源中心业务分组含 cognitive-development | ❌ | 本次新增 |
| catalogGroup 含 cognitive-development | ❌ | 本次新增（equipment 资源真正归类依据） |

→ 结论：cognitive 不是从零新建，而是「把占位项激活 + 在 4 个枚举/集合补项 + 接入资源」。

### 2.1 器材训练入口（集中定义点）

- **真源**: `src/utils/training-entry.ts`（`src/utils/equipment-training-entry.ts` 只是 re-export 兼容包装层，无独立数据）
- 入口对象结构（`TrainingEntryDefinition` `training-entry.ts:19-28`）: `code | name | description | moduleCode | requiredEntitlement | catalogGroups[] | icon | themeColor`
- 现有 6 个定义在 `TRAINING_ENTRY_DEFINITIONS`（`training-entry.ts:35-96`）
- 消费方（定义改完多数自动生效，仅 icon 映射手动）:
  - `src/views/equipment/EquipmentMenu.vue:70-87`（`getModuleIcon` iconMap 硬编码 6 个图标）
  - `src/views/equipment/QuickEntry.vue:232-242`（同 iconMap）
  - `src/views/equipment/Records.vue`（同模式）
  - 路由守卫 `src/router/index.ts:1309-1311` + `TRAINING_ENTRY_REQUIRED_ENTITLEMENTS:153-155` 均从入口定义派生，**无需改**

### 2.2 资源中心业务分组（写死常量，非 DB 驱动）

- **真源**: `src/utils/resource-center-business.ts`
  - `TRAINING_RESOURCE_BUSINESS_GROUP_CODES:139-147`（当前 7 个）
  - `TRAINING_RESOURCE_BUSINESS_GROUP_LABELS:152-160`
  - `TRAINING_RESOURCE_BUSINESS_GROUP_MODULE_MAP:162-170`
  - 展示类型 `TrainingResourceDisplayType` 只两种 `'equipment' | 'game'`（:150），**无「教具」类型**；器材 = `equipment`
- 渲染: `src/views/resource-center/TrainingResources.vue`（分组单选 :24-33 由 `getAccessibleTrainingResourceBusinessGroups` 驱动；展示类型 :37-48 硬编码 equipment/game）

### 2.3 catalogGroup 层（equipment 资源真正归类依据，必改）

- **真源**: `src/utils/equipment-catalog-group.ts`
  - `EQUIPMENT_CATALOG_GROUPS:4-11` / `_LABELS:15-22` / `_TAG_TYPES:24-31`
  - `mapPhysicalDomainToGroup:90-103`、`resolveEquipmentCatalogGroupCode:105-141`
  - ⚠️ `resolveEquipmentCatalogGroupCode` 默认 fallback 到 sensory —— **cognitive 必须显式加分支，否则资源全错归「感官训练」**
- ⚠️ `src/views/resource-center/TeachingMaterials.vue`（教具页）也复用 `EQUIPMENT_CATALOG_GROUPS`（`resource-center-business.ts:19` `TEACHING_MATERIAL_DIMENSION_CODES = EQUIPMENT_CATALOG_GROUPS`）→ 加 cognitive-development 后教具页左侧分类也会多一项，需确认是否符合预期。

### 2.4 CSV 导入链路（parser 已支持本 CSV 格式）

- **parser**: `src/database/physical-equipment-parser.ts`
  - 中文草稿 CSV 走 `parseDraftRows:216-250`；表头匹配（:222-224）类别用 `['类别名称','套装类别','类别模块']`、描述用 `['教育目标与功能描述','教育目标与功能描述 ']`、标签用 `['能力标签','核心能力标签']` —— **用户 CSV 列头全部命中**
  - `splitTags:119-126` 正则 `/[|、，,；;]/` —— **顿号「、」已支持**
  - BOM 已处理（`normalizeHeader:90-92`、`parseRows:253-255`）
  - `buildResource:271-312`：`resourceType` 恒 `'equipment'`；`moduleCode` 取 CSV 列或 `DOMAIN_MODULE_MAP[domain]`；`category` = domain
  - resourceCode 自动生成 `buildGeneratedResourceCode:142-152`：`{domain}-box{xx}-seq{yyy}[-variant]`
- **seed 数据**: `src/database/physical-equipment-data.ts`（:48 把 CSV `?raw` import 后交 parser；当前 5 个 sourceInput）
- **运行时灌库**: `src/database/init.ts` → `insertPhysicalEquipmentResourceData:2398-2608`
- **离线导入脚本（可选）**: `scripts/import-physical-equipment-resources.cjs`（:156-173 只列 4 个 domain，不含 daily-living、不含 cognitive）—— 先例 daily-living 只走 init 不走 cjs，cognitive 可照办
- ⚠️ `init.ts:2417` 现有资源查询 `module_code IN ('sensory','emotional','social','life_skills')` **需加 `'cognitive'`**，否则去重/幂等扫描不到认知模块

### 2.5 能力标签机制（已通用，无需改）

- 表: `sys_tags`（domain + name + usage_count + is_preset）+ `sys_resource_tag_map`
- API: `src/database/resource-api.ts` `getAbilityTags:375` / `addResource:440-479` / `addTagToResource:651-681`（标签不存在则建）
- seed 入库: `init.ts:2514-2555` 用 `ensureTag(tagName)`；注意 seed 写 `is_preset=1`，运行时新建写 `is_preset=0`（不影响功能）
- **用户 CSV「能力标签」列无需额外解析代码**，走 parser → init 即可

### 2.6 器材资源图片（最 tricky，必处理）

- 解析链路: `src/utils/resource-cover.ts:52-69` → `getPhysicalEquipmentImageUrl`
- **真源**: `src/assets/images/physical-equipment/images.ts`
  - :3 `import.meta.glob('./**/*.webp', { eager: true })` —— **只 glob webp，png 不在结果里**
  - `getPhysicalEquipmentImageUrl:27-39`：查 `./${domain}/${resourceCode}.webp`，命中返回 url，**否则返回 `generatePlaceholderUrl`（彩色首字母方块）**
  - `DOMAIN_COLORS:5-11` 只有 5 个 domain
- **结论**: 用户 `images/*.png` 必须做两件事，否则全部显示占位符:
  1. **png → webp**（建议 128×128 或 256×256，单张 <80KB；`22.png` 7.5MB 必须压缩，否则 Electron 打包体积暴涨，因 eager glob 会全打进 bundle）
  2. **改名 `序号.png` → `{resourceCode}.webp`**（resourceCode 由 parser 按 `cognitive-box{xx}-seq{yyy}` 生成；需建立 `序号 → resourceCode` 映射批量改名）
- 图片目录: `src/assets/images/physical-equipment/cognitive/`（新建；现有 5 个 domain 子目录 emotional-regulation/social-communication/fine-motor/soothing-aids/daily-living）
- 不走 `resource://` 协议（那是 game/emotion_scene 的 coverImage 路径），无需注册 preset

### 2.7 字段口径汇总（认知发展器材资源）

| 字段 | 取值 | 备注 |
|------|------|------|
| `module_code` | `cognitive` | = `ModuleCode.COGNITIVE`；需在 `DOMAIN_MODULE_MAP` 加映射 |
| `resource_type` | `equipment` | parser 恒定 |
| `category` | `cognitive` | = domain |
| `metadata.domain` | `cognitive` | 需加 `PHYSICAL_EQUIPMENT_DOMAINS` 枚举 |
| `metadata.resourceCode` | `cognitive-box{xx}-seq{yyy}` | parser 自动生成 |
| `metadata.kind` | `physical_equipment` | 固定 |
| `legacy_source` | `physical_equipment_seed_2026_03_26` | 常量 |
| catalogGroup（运行时） | `cognitive-development` | 需在 `EQUIPMENT_CATALOG_GROUPS` 新增 |
| business group（资源中心） | `cognitive-development` | 需在 `TRAINING_RESOURCE_BUSINESS_GROUP_CODES` 新增 |
| entry_code | （无 DB 列） | 运行时由 catalogGroup 反推到 `cognitive` 入口 |
| entitlement | `cognitive` | 需从 placeholder/lock → active |

---

## 3. 改动文件清单（按子系统）

### A. 类型/枚举层（必改，否则 TS 编译不过）
- 【改】`src/types/physical-equipment.ts` —— `PHYSICAL_EQUIPMENT_DOMAINS:1-9` 加 `'cognitive'`
- 【改】`src/features/entitlements/entitlement-catalog.ts` —— `cognitive:86-92` 改 `status:'active'`、`uiStrategy:'hide'`

### B. 训练入口层
- 【改】`src/utils/training-entry.ts` —— `TRAINING_ENTRY_CODES:8-15` / `TRAINING_ENTRY_DEFINITIONS:35-96` / `LEGACY_ENTRY_ALIASES:98-110` / `CATALOG_GROUP_ENTRY_MAP:112-119` 加 cognitive；`resolveTrainingEntryCodeFromGameResource`/`resolveTrainingEntryCodeFromResource:220-256` switch 加 cognitive 分支（否则错归感官）
- 【改】`src/utils/equipment-training-entry.ts` —— `ROUTE_ENTRY_ALIASES:34-42` 加 `'cognitive'`
- 【改】`src/views/equipment/EquipmentMenu.vue:70-87` —— iconMap 加 cognitive 图标
- 【改】`src/views/equipment/QuickEntry.vue:232-242` —— iconMap 加 cognitive 图标
- 【改】`src/views/equipment/Records.vue` —— iconMap（若有）

### C. 资源中心业务分组层
- 【改】`src/utils/equipment-catalog-group.ts` —— `EQUIPMENT_CATALOG_GROUPS:4-11` / `_LABELS:15-22` / `_TAG_TYPES:24-31` / `mapPhysicalDomainToGroup:90-103` / `resolveEquipmentCatalogGroupCode:105-141` 加 cognitive
- 【改】`src/utils/resource-center-business.ts` —— `TRAINING_RESOURCE_BUSINESS_GROUP_CODES:139-147` / `_LABELS:152-160` / `_MODULE_MAP:162-170` / `resolveTrainingResourceBusinessGroupCode:218-250` 加 cognitive-development

### D. CSV 导入链路
- 【改】`src/database/physical-equipment-parser.ts` —— `DOMAIN_MODULE_MAP:48-54` 加 `'cognitive': ModuleCode.COGNITIVE`；`createEmptySummary:314-333` 的 byDomain 加 cognitive
- 【改】`src/database/physical-equipment-data.ts` —— `sourceInputs` 加第 6 项 cognitive CSV（`?raw` import）
- 【新增】`docs/references/physical-equipment/cognitive/cognitive-equipment-draft.csv` —— 用户的 52 条 CSV（拷入，保持草稿列头）
- 【改】`src/database/init.ts:2417` —— module_code 白名单 IN 查询加 `'cognitive'`
- 【改·可选】`scripts/import-physical-equipment-resources.cjs:156-173,282` —— 若需对现有库离线导入则加 cognitive

### E. 图片资源
- 【新增目录】`src/assets/images/physical-equipment/cognitive/` —— 放 52 张 `{resourceCode}.webp`
- 【改】`src/assets/images/physical-equipment/images.ts:5-11` —— `DOMAIN_COLORS` 加 `'cognitive': '#xxxxxx'`
- 【新增·可选】png→webp + 改名辅助脚本（见 §5）

### F. 无需改（自动派生）
- `src/router/index.ts`（守卫 + entitlement 表从入口定义派生）
- `src/database/resource-api.ts`（tag/addResource 通用）
- `src/views/resource-center/TrainingResources.vue`（`availableModules:740-746` 已含 cognitive；分组从工具函数派生）

---

## 4. 关键坑（务必注意）

1. **cognitive entitlement 默认 locked**（§2.0）—— 不改 status，授权后器材卡片/资源分组仍可能不显示。头号坑。
2. **认知资源会错归「感官训练」** —— `resolveEquipmentCatalogGroupCode` 与 `resolveTrainingEntryCodeFromResource` 默认 fallback sensory，cognitive 必须显式加分支。
3. **png 图片不显示** —— `images.ts:3` glob 只认 webp，png 全走占位符。必须转 webp。
4. **图片文件名 ≠ 序号.png** —— 运行时查图用 `{resourceCode}.webp`，需 `序号 → resourceCode` 映射改名（或 CSV 加显式 resourceCode 列走 template 路径 `parser.ts:189-206`）。
5. **22.png 7.5MB** —— 必须压缩到 <80KB，否则 eager glob 打进 bundle 致打包体积暴涨。
6. **init.ts module_code 白名单要同步**（§2.4）—— 不补 `'cognitive'` 则每次 init 重复插入认知资源（幂等失效）。
7. **教具页连带影响** —— `TeachingMaterials.vue` 复用 `EQUIPMENT_CATALOG_GROUPS`，加 cognitive-development 后教具页左侧分类也多一项，需确认预期。
8. **能力标签顿号分隔已支持**（走 physical-equipment 链路）；勿走 TeachingMaterials 的 `resource-importer.ts:297-305`（其 split 正则不含顿号）。
9. **CSV 列头拼写核对** —— parser 类别列头候选含「类别名称」（命中）；若实际是「类别」单字则不命中（影响 sourceCategory，不影响 category=domain）。
10. **重名资源（序号 16/17「交通工具」）** —— 序号不同 → 不同 resourceCode，正常两条件；不会误去重。
11. **is_preset 语义差异** —— seed 写 1、运行时新建写 0，不影响功能。
12. **daily-living 先例** —— daily-living 只走 init 不走 cjs，cognitive 可同样只走 init；对已有库需手动触发一次 init 或补 cjs。

---

## 5. 建议实施顺序

1. **枚举/类型层**（A）—— 先让 TS 能编译过 cognitive domain。
2. **CSV 落库**（D 的 parser + data + 新 CSV + init 白名单）—— 让 52 条资源能被 parser 解析、init 灌库。
3. **图片处理**（E）—— png→webp 压缩 + `序号→resourceCode` 改名 + 拷到 cognitive/ 目录 + DOMAIN_COLORS。建议写一次性脚本：读 CSV 拿 (序号,箱号) → 算 resourceCode → 调用 sharp/外部工具转 webp 改名。注意零原生依赖约束（见下）。
4. **资源归类**（C）—— catalogGroup + business group，让资源正确归到「认知发展」。
5. **训练入口**（B）—— 让器材训练出现「认知发展」入口卡片 + icon。
6. **entitlement 激活**（A 的 catalog）—— placeholder→active，让授权后可见。
7. **验证**（§6）。

> **零原生依赖约束**: CLAUDE.md/AGENTS.md 禁止新增 `sharp` 等原生编译依赖。png→webp 转换不能在运行时依赖 sharp。建议：(a) 用一次性 Node 脚本 + 项目已有的工具，或 (b) 在仓库外用 ImageMagick/在线工具批量转好后只提交 webp 文件，脚本不入运行时依赖。需在实施时确认当前仓库是否有可用的图片转换能力（查 package.json devDependencies）。

---

## 6. 验证要求

- `npm run type-check` exit 0（必跑，因改了多个类型/枚举）
- parser 单元验证：用 jiti 跑一次性断言，确认 52 条全部解析、resourceCode 规则、标签拆分（顿号）、序号 16/17 不误去重；过后即删（参照 IEP Phase 做法）
- 运行时（用户真机或 electron:dev）:
  - 资源中心 → 训练资源 → 业务分组出现「认知发展」，选中后展示 52 条器材资源，图片正常显示（非占位符）
  - 资源详情：名称/描述/能力标签正确
  - 器材训练 → 出现「认知发展」入口卡片（图标正确）→ 进入 → 选认知资源快速录入 → 落 `equipment_training_records` + `training_session`
  - 训练记录菜单/统计按 entry_code=cognitive 正确归类
- 不声称"已完成"直到真机 E2E 通过（本环境无法驱动交互式 Electron）

---

## 7. 待决策点（实施前与用户确认）

1. **entitlement cognitive 是否正式激活**（placeholder→active）？这等于正式开放「认知发展」模块授权，是产品口径决策。
2. **cognitive 入口的 icon / themeColor** 选哪个 Element Plus 图标 / 颜色？（现有 6 个各有配，参考 `training-entry.ts:35-96`）
3. **图片转换方式**：仓库内一次性脚本（用什么库？需查现有 devDependencies）还是仓库外转换后只提交 webp？
4. **是否需要 cjs 离线导入**（对已有用户库灌数据），还是只走 init（仅新建库自动有）？
5. **教具页连带出现「认知发展」分类**是否可接受？（§4 坑 7）
6. **resourceCode 策略**：用 parser 自动生成（`cognitive-box{xx}-seq{yyy}`，需序号→resourceCode 改名图）还是在 CSV 加显式 resourceCode 列走 template 路径（图名直接 = resourceCode，省去映射）？
