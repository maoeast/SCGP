# SCGP 未实现功能核对报告

> 核对日期：2026-07-30
> 方法：逐项 grep/read 代码验证，不以文档为准
> 状态标记：✅ 已闭环 / 🔄 代码已有待提交 / ⬜ 真未开始 / 🔧 纯配置修正

---

## 一、已闭环（差距文档过时，实际已完成）

| # | 原缺口 | 实际代码状态 |
|----|--------|-------------|
| A3 | 备份未覆盖全 schema | 已闭环，动态全表枚举 `sqlite_master` |
| A6 | 资源收藏查询未实现 | 代码完成（`toggleFavorite`/`getFavoriteResourceIds`），待真机验 |
| A8 | dev/迁移工具混在主路由树 | 已用 `src/router/dev-routes.ts` + `import.meta.env.DEV` 编译期折叠，生产构建自动排除。**`devOnlyRouteNames` 已不存在** |
| B3 | 生活技能模块 | 已进 ModuleRegistry，status `active` |
| B4 | IEP 策略机制 | C10 整条删除退役，`grep IEPStrategy src` → 0 |
| C09 | ModuleRegistry 模块注册 | 6 模块全注册 + 一致性测试锁定 |
| C10 | IEP 策略退役 | 同上 B4 |
| C11 | better-sqlite3 移除 | 已清，`export-resources.cjs` 切 `sql.js` |
| - | 评估入口硬编码 | 已 catalog 驱动，15 量表自动覆盖 |

---

## 二、代码已写、未提交（差一步 commit）

### 认知 P1 三游戏（K02 少了什么 / K09 序列复现 / K10 因果排序）

| 文件 | 状态 | 行数 |
|------|------|------|
| `src/components/emotional/games/MissingItemGame.vue` | untracked | 638 行 |
| `src/components/emotional/games/EchoSeqGame.vue` | untracked | ~500 行 |
| `src/components/emotional/games/StoryOrderGame.vue` | untracked | ~500 行 |
| `src/views/emotional/games/MissingItemPage.vue` | untracked | 33 行 |
| `src/views/emotional/games/EchoSeqPage.vue` | untracked | ~30 行 |
| `src/views/emotional/games/StoryOrderPage.vue` | untracked | ~30 行 |

Registry 条目已在 `src/data/custom-game-registry.ts`（modified, uncommitted）：
- `K02_MISSING_ITEM` @ L885
- `K10_STORY_ORDER` @ L917
- `K09_ECHO_SEQ` @ L1045

路由已在 `src/router/index.ts`（modified, uncommitted）：
- `/emotional/games/missing-item` → `MissingItemGame`
- `/emotional/games/echo-seq` → `EchoSeqGame`
- `/emotional/games/story-order` → `StoryOrderGame`

**TODO**：commit → `npm run type-check` → `npm run build:web` → 真机 UAT

---

## 三、纯配置修正（5 分钟工作量，不改逻辑）

### 3.1 社交模块 registry 声明过期

`src/core/module-registry.ts:383-408`

```typescript
// 当前（过期）：
status: 'experimental',
features: [
  { code: 'games', status: 'coming_soon' },
  { code: 'equipment', status: 'coming_soon' },
]

// 实际代码交付：6 游戏（S01-S06）+ IEP 闭环已打通
// 应改为：
status: 'active',
features: [
  { code: 'games', status: 'active', ... },
  { code: 'equipment', status: 'active', ... },
  { code: 'training_records', status: 'active', ... },
]
```

### 3.2 认知模块 registry 声明过期 + 缺 feature

`src/core/module-registry.ts:410-435`

```typescript
// 当前（过期）：
status: 'experimental',
features: [
  { code: 'training_records', status: 'coming_soon' },
  { code: 'assessment', status: 'coming_soon' },
]
// 完全缺少 'games' feature 条目！

// 实际代码交付：P0 4 游戏已落地 + 评估 3 量表
// 应改为：
status: 'active',
features: [
  { code: 'games', status: 'active', ... },
  { code: 'equipment', status: 'active', ... },  // 52 条器材
  { code: 'assessment', status: 'active', ... },
  { code: 'training_records', status: 'active', ... },
]
```

---

## 四、真正未实现（代码零存在）

| ID | 缺口 | 核实方式 |
|----|------|----------|
| **B1-P2** | 认知 P2 三游戏：K06 排排队 / K07 找不同 / K08 小迷宫 | `grep K06\|K07\|K08` registry → 0 |
| **A2** | Image Worker | `src/workers/` 下无 image worker 文件 |
| **A1** | DB Worker 生产主链 | 文件在 `src/workers/db.worker.ts` 但 `sqljs-loader.ts` 不走 worker，仅 `WorkerTest.vue` devtools 触发 |
| **A4-P3** | 资源文件孤儿 GC | Phase1+2 代码完成（删替清物理 + zip 归档），Phase3 孤儿扫描未开始 |
| **B1-K** | 认知 K 前缀 IEP 报告消费端 | 4 处待补：GameContainer 白名单 + IEPReport 路由 + iep-generator 新方法 + normalizer 规则 |
| **C3** | raven60 接入 | 420 张瑞文图已授权，仅本地 `.gitignore` 保留 |

### 内容质量（非纯代码任务，需专业资源）

| ID | 缺口 | 核实结果 |
|----|------|----------|
| C1 | ~~CRT~~ / BRIEF / CognitiveSelf | **CRT 已接入瑞文 60 题 + 授权图片 + 常模 + IQ 计算，非 DRAFT**。BRIEF 和 CognitiveSelf 的 scaleName 仍标「自编 DRAFT」 |
| C2 | FineMotor / GMFM-88 无独立常模 | 仅有掌握率自算（FineMotor）或原始分（GMFM-88），无外部常模。其余 4 个（CSIRS/SDQ/TGMD-3/CNBSR2016）均有常模 |

**CRT 当前状态（非 DRAFT，已完整接入）**：
- 题目：60 道瑞文图形推理，A-E 五组
- 图片：`resource://images/raven60` 授权图片
- 常模：`src/database/crt-norms.ts`
- 输出：离差 IQ（M=100, SD=15）
- scaleName：`'瑞文图形推理测验（CRT）'`（无 DRAFT 标记）

---

## 五、技术债（可顺带修）

### 5.1 SIC-ADS 命名残留（16 处）

**活跃源码头注释（4 处，建议修）：**

| 文件 | 行 | 内容 |
|------|-----|------|
| `src/core/module-registry.ts` | L2 | `* SIC-ADS 模块注册表` |
| `src/types/module.ts` | L2 | `* SIC-ADS 模块系统类型定义` |
| `src/utils/iep-generator.ts` | L2 | `* SIC-ADS IEP 生成器` |
| `src/utils/image-processor.ts` | L2 | `* SIC-ADS 图片处理工具` |

**migration 历史文件（12 处，历史上下文，可不动）：**

| 文件 | 内容 |
|------|------|
| `src/database/migration/compatibility-adapter.ts:2` | `* SIC-ADS 2.0 兼容性适配器` |
| `src/database/migration/diagnostic.ts:2,116` | `* SIC-ADS 2.0 数据库诊断工具` |
| `src/database/migration/migration-test-data.ts:2,264,300` | `* SIC-ADS 2.0 迁移测试数据` |
| `src/database/migration/migration-verification.ts:2,550,651` | `* SIC-ADS 2.0 迁移验证` |
| `src/database/migration/rollback-migration.sql:2` | `-- SIC-ADS 2.0 迁移回滚脚本` |
| `src/database/migration/schema-migration.ts:2,641` | `* SIC-ADS 2.0 Schema Migration` |

### 5.2 待真机验收

| 项 | 状态 |
|----|------|
| A6 资源收藏 | 代码完成，真机待验 |
| A4 Phase1+2 备份 zip 归档 | 代码完成（crypto + fflate round-trip ✅），真机待验 |
| R2 资源备份恢复 E2E | 待演练 |
| R3 AI 隐私收口 | 待处理 |

---

## 六、建议执行顺序（2026-07-30 更新）

1. ~~**立即 commit**：认知 P1 三游戏~~ ✅ 已提交 `4b9acf2`
2. ~~**顺手 5 分钟**：社交 + 认知 module-registry 声明更新~~ ✅ 已提交 `cb73017`
3. ~~**顺手 5 分钟**：修 4 处活跃源码头 SIC-ADS 注释残留~~ ✅ 已提交 `cb73017`
4. **需要计划**：认知 P2 三游戏（K06/K07/K08）
5. **需要计划**：DB Worker 主链接入 / Image Worker / 孤儿 GC
6. **内容专项**：BRIEF/CognitiveSelf 量表 DRAFT → 正式化（需专业资源）
7. **内容专项**：FineMotor/GMFM-88 常模补充（CSIRS/SDQ/TGMD-3/CNBSR2016/CRT 已有常模）
