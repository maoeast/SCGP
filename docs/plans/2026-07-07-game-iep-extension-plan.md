# 游戏训练 IEP 报告闭环 — 扩展方案

status: draft
last_updated: 2026-07-07
encoding: UTF-8
范围：把"游戏训练"的 IEP 报告闭环从「感官统合 + 社交沟通」两类，按可量化原则扩展到其余四类（精细动作 / 生活自理 / 安抚教具 / 情绪调节）中"适合"的游戏。
上游依据：`docs/plans/2026-07-07-scgp-spec-gap-remediation.md`（D 项已落地社交闭环）。

---

## 1. 现状（已核实）

| 训练类别 | 入口/容器 | 游戏 | 落库表 | IEP 闭环 |
|---|---|---|---|---|
| 感官统合训练 | `GamePlay.vue`（经典） | sensory tasks | `training_records` + `report_record` → `/games/report` | ✅ 有 |
| 社交沟通 | `GameContainer.vue` | S01–S06 | `game_emotion_records` + `training_records` + `report_record` | ✅ 有（`runSocialIepChain`，`GameContainer.vue:1019`） |
| 精细动作 | `GameContainer.vue` | F01–F05 | 仅 `game_emotion_records` | ❌ 无 |
| 生活自理 | `GameContainer.vue` | L01–L05 | 仅 `game_emotion_records` | ❌ 无 |
| 安抚教具 | `GameContainer.vue` | C01–C05 | 仅 `game_emotion_records` | ❌ 无 |
| 情绪调节 | `GameContainer.vue` | G01/03/04/07/08/09 | 仅 `game_emotion_records` | ❌ 无 |

触发守卫（`GameContainer.vue:1132` 与 `:1168`）：`status==='completed' && gameDefinition.moduleCode === ModuleCode.SOCIAL && primaryStudentId>0`。**只有社交模块过这条门**，其余四类走 `EmotionalGamesAPI.persistSession`（`emotional-games-api.ts:764/889`），只写 `game_emotion_records`，完成后回大厅。

> 注：情绪调节另有一条"沉浸式情绪场景"（emotion_scene / care_scene，`EmotionalTrainingRecordAPI`，`emotional-api.ts:225/344`），会写 `training_records + report_record`，但它属"情绪与场景"沉浸训练，不在本方案的"游戏训练"范畴。

---

## 2. 核心判定原则

IEP 报告骨架是 `training_records` 的 `accuracy_rate(0-1) + avg_response_time(ms) + duration(秒)` 三列 + 文字评估段。一个游戏"适合生成 IEP"的充要条件：

> **游戏能产出衡量"技能习得"的量化指标（正确率 / 精度 / 反应时 / 完成度），而不是衡量"情绪状态 / 安抚过程"的开放性指标。**

由此把 21 个非社交游戏（F5 + L5 + C5 + G6）分四层：

- **判定关键区分**：同样一个"清除率/覆盖率"比值，在精细动作（手眼协调技能）里是技能指标 → 适合；在情绪释放（擦冰发泄）里是情绪过程指标 → 不适合。语义决定归属，不只看字段是否存在。

---

## 3. 扩展决策（分层）

### Tier 1 — 立即扩展（指标最干净：标准正确率 + 反应时 + 时长齐全）

| gameCode | 中文名 | accuracy 源 | reaction 源 | duration 源 |
|---|---|---|---|---|
| F03_RECYCLING | 分拣小能手 | `accuracy_ratio` (0-1) ✓ | `average_sort_ms` ✓ | （缺，用会话时长兜底） |
| L03_BRUSH_TEETH | 刷牙小卫士 | `directional_accuracy_score` (0-1) ✓ | `average_swipe_ms` ✓ | `duration_seconds` (秒) ✓ |
| L05_PACK_BAG | 上学包包装一装 | `context_understanding_score` (0-100，需÷100) ✓ | `average_selection_ms` ✓ | `total_duration_seconds` (秒) ✓ |

### Tier 2 — 扩展（accuracy 可由 correct/total 派生，reaction + duration 齐）

| gameCode | 中文名 | accuracy 派生 | reaction 源 | duration 源 |
|---|---|---|---|---|
| F04_TRACK_BUILD | 轨道修补匠 | `correct_placements/(correct+wrong)_placements` | `average_placement_ms` ✓ | `average_layout_ms`（或会话时长） |
| L01_WASH_HANDS | 洗手小能手 | `correct_action_count/(correct+wrong)_action` | `average_action_ms` ✓ | `total_duration_seconds` (秒) ✓ |
| L02_DRESS_UP | 我会穿衣服 | `completed_item_count/(completed+wrong)_placements` | `average_selection_ms` ✓ | `total_duration_seconds` (秒) ✓ |
| L04_SET_TABLE | 摆桌子帮帮忙 | `completed_places/(completed+wrong)_placements` | `average_placement_ms` ✓ | `total_duration_seconds` (秒) ✓ |

### Tier 3 — 可选/谨慎（有近似指标，但非经典"正确率"，语义偏精度/抑制/匹配）

| gameCode | 中文名 | 可用指标 | 谨慎理由 |
|---|---|---|---|
| F02_STAR_TRACE | 连线小星座 | `path_precision_ratio` (0-1) + `average_constellation_ms` | 是"轨迹精度比"非"对错"；可做，报告口径需调 |
| F01_CLOUD_ERASE | 云朵擦擦擦 | `cleared_ratio_peak` (0-1) | "覆盖率峰值"非正确率；手眼协调技能，可做 |
| F05_BALLOONS | 刺破慢气球 | `successful_pops` + `window_response_ms` + `early_taps` | 核心是"抑制控制"，`early_taps`（过早点击）才是关键，需专属评估段 |
| G07_MONSTER | 喂食情绪小怪兽 | `correct_drops/(correct+wrong)_drops` | 唯一有匹配正确率的 G 游戏；属情绪匹配认知，**可做但归"情绪调节"口径**，建议二期再议 |

### Tier 4 — 不扩展（开放性安抚/调节，或缺陷，IEP 无有意义数据可写）

| gameCode / 组 | 中文名 | 不扩展理由 |
|---|---|---|
| C01–C05（安抚教具整组） | 蒲公英/水塘/八音盒/沙漏/温度计 | 全部 `category:'calming'/'reflection'`，纯安抚放松；水塘"不会自动结束"、沙漏是等待、八音盒是自由敲击，无技能指标 |
| G01_BALLOON | 深呼吸热气球 | 呼吸调节，指标是 `successful_cycles/perfect_cycles`，无正确率 |
| G03_FOREST | 音量魔法森林 | 音量调节，指标是 `stable_voice_ms/target_hits`，无正确率 |
| G04_WIPE_ICE | 擦亮坏心情 | 情绪释放，虽有 `cleared_ratio_peak`，但语义是"发泄过程"非技能 |
| G08_ENERGY_BALL | 表情能量球 | 字段最少（仅 `completedLevels/finalEnergy/difficulty`），且是唯一不带 badge 的 payload，IEP 价值最低 |
| G09_EXPRESSION_DETECTIVE | 表情侦探 | **缺陷**：组件声明了 `complete` 事件但全文件无 `emit(...)`（`ExpressionDetectiveGame.vue`），根本无法完成落库 |

---

## 4. 前置阻塞与关键陷阱（实施前必须处理）

### 4.1 G09 缺陷（阻塞 Tier 3+ 的"情绪调节"完整闭环）
`ExpressionDetectiveGame.vue` 第 156 行 `defineEmits(['complete', ...])`，但 `completeWave()`（~403 行）只切 `gamePhase`、不 emit。结果该游戏无法触发 `handleGameComplete`，无法落库、无法出报告。**修复**：在通关处补 `emit('complete', { performanceData: { ... } })`，字段建议对齐表情识别口径（`accuracy`/`matchPercent`/`totalScore`/`average_reaction_ms`）。此修复独立于本方案，应先做。

### 4.2 字段命名完全不统一（核心陷阱）
`runSocialIepChain`（`GameContainer.vue:1031-1036`）期望的标准字段 `accuracy`/`accuracyRate`、`avgResponseTime`/`avgResponseTimeMs`/`reactionTime`、`durationMs`，**21 个游戏没有一个直接用这些名字**。最接近的只有 F03 的 `accuracy_ratio`、L03 的 `directional_accuracy_score`。

→ **必须建立归一化层**（见 5.1），按 gameCode 把原生字段映射到标准指标，绝不能在 chain / generator / report 三处各自重复提取。

### 4.3 单位与字段名陷阱
- **时长单位**：所有 L 类用 `total_duration_seconds`（**秒**），但 `runSocialIepChain` 的 `resolveDurationSeconds` 按"是否 >10000 判 ms"兜底——对 L 类会误判。L03 的字段名甚至是 `duration_seconds`，与其他 L 的 `total_duration_seconds` **不一致**。
- **accuracy 量纲**：F03/F02 是 0-1 小数；L05 的 `context_understanding_score` 是 **0-100**（需 ÷100）；L03 `directional_accuracy_score` 是 0-1。
- **buildDefaultPerformanceData 兜底**（`GameContainer.vue:936`）：游戏未给真实数据时只产 `{ event }`，IEP 会得到全 0 空壳。归一化层必须能识别空壳并降级（不出报告或出"未采集到量化指标"提示）。

### 4.4 双人游戏
F/L 全是 `maxPlayers:1`，无双人 IEP 重复问题（仅社交 S01/S06 双人，已由现有"只为主学生生成一份"处理）。

---

## 5. 实现方案（分层落地）

### 5.1 数据提取层：统一归一化适配器（新增，建议）

新建 `src/utils/game-performance-normalizer.ts`，导出：

```ts
interface NormalizedGameMetrics {
  accuracy: number | null        // 0-1，null 表示该游戏无正确率口径
  avgResponseTimeMs: number | null
  durationSec: number
  extra: Record<string, any>     // 透传 gameCode 专属指标供生成器用（如 early_taps、path_precision_ratio）
  hasRealData: boolean           // false 表示是 {event} 空壳
}
export function normalizeGameMetrics(
  gameCode: string,
  performanceData: Record<string, any>,
  sessionDurationMs: number,
): NormalizedGameMetrics
```

内部维护一张 **gameCode → 提取规则** 表（集中字段命名差异/单位换算/量纲归一）。`runSocialIepChain` 与未来 `runModuleIepChain`、`IEPGenerator`、`IEPReport.vue` 全部只调这一个函数，杜绝三处各提各的。

### 5.2 落库链路层：泛化 `runSocialIepChain`

把 `GameContainer.vue:1019` 的 `runSocialIepChain` 泛化为 `runModuleIepChain(studentId, gameCode, performanceData, sessionDurationMs)`：
- **触发守卫放宽**（`:1132`/`:1168`）：由 `moduleCode === SOCIAL` 改为基于 `trainingEntryCode ∈ {'social-communication','fine-motor','life-skills'}`（注意：不能用 moduleCode，因为 EMOTIONAL 同时含 G 与 C，C 不该出 IEP）。
- `entry_code` / `module_code` 按 gameCode 所属模块填（fine-motor → module_code 用 `sensory`，对齐 F 类 `ModuleCode.SENSORY`；life-skills → `life_skills`）。
- `task_id` 仍为 `null`（INTEGER 列），gameCode 放 `raw_data.gameCode`，与社交链路一致（`IEPReport` 按 `recordId` 取记录，不依赖 task_id）。
- `duration`/`accuracy_rate`/`avg_response_time` 三列 NOT NULL → 用归一化结果，缺指标给 0（accuracy 给 null 时存 0 但在 `raw_data` 标记 `accuracyAvailable:false` 供渲染层隐藏该卡）。

### 5.3 生成器层：`IEPGenerator` 新增模块分支

`src/utils/iep-generator.ts`（沿用现有结构，不重构），仿 `generateSocialReport`（`:134`）新增：
- `static generateFineMotorReport(studentName, gameCode, performanceData): IEPReport`
  - `getFineMotorGameName(gameCode)`：F01–F05 中文名。
  - `generateFineMotorSections(gameCode, performanceData)`：按 gameCode 维度——F02 轨迹精度 / F03 分类正确率与反应时 / F04 旋转拼接 / F05 抑制控制（`early_taps` 专属段）/ F01 手眼协调覆盖；建议围绕"手眼协调、动作稳定、抑制控制"。
- `static generateLifeSkillsReport(studentName, gameCode, performanceData): IEPReport`
  - `getLifeSkillGameName(gameCode)`：L01–L05 中文名。
  - `generateLifeSkillsSections(gameCode, performanceData)`：L01 卫生自理步骤 / L02 穿衣顺序 / L03 刷牙路径与方向准确度 / L04 空间定位 / L05 情境计划与执行功能；建议围绕"自理步骤完成度、顺序理解、执行功能"。
- 类型放宽：`src/types/games.ts` 的 `IEPReport.taskId` 已在 D 项放宽为可选，新分支不带 taskId，沿用即可。

### 5.4 渲染层：`IEPReport.vue` 分支路由

`src/views/games/IEPReport.vue` 的 `loadReport`（仿 D 项 social 分支）：取到 `training_records` 后按 `module_code`（或 `raw_data.gameCode` 前缀 F/L）路由到对应 generator；统计卡（准确率/反应时/时长）改为统一读归一化结果（或 `raw_data` 标记的 availability），反应时/准确率缺失则隐藏该卡；导出 Word/PDF 沿用，社交内容自动随之导出。

---

## 6. 实施顺序与依赖

| 阶段 | 内容 | 依赖 |
|---|---|---|
| Phase 0 | 修 G09 `emit` 缺陷（独立 bug，先修） | 无 |
| Phase 1 | 建归一化适配器（5.1）+ Tier 1 三游戏（F03/L03/L05）全链路（5.2/5.3/5.4） | 5.1 先行 |
| Phase 2 | Tier 2 四游戏（F04/L01/L02/L04），复用 Phase 1 的链路与生成器框架 | Phase 1 |
| Phase 3（可选） | Tier 3（F02/F01/F05/G07），需各自调报告口径 | Phase 1 |

每个 Phase 内：归一化表加该 gameCode → 生成器加该 gameCode sections → 守卫放行该 trainingEntryCode → IEPReport 路由。建议每游戏一次端到端验证。

---

## 7. 不扩展项的产品口径（建议）

C 类（安抚教具整组）+ G01/G03/G04/G08/G09：**不出 IEP，保留现有徽章 + `game_emotion_records` 训练记录**。这些游戏的价值在"过程体验/情绪调节"，不在"技能评估"，硬塞 IEP 会得到空壳报告，反而稀释 IEP 的诊断意义。建议在游戏完成页对这些类目显示"已记录训练 + 获得徽章"，不出现"生成报告"入口，避免用户预期错位。

---

## 8. 验证基线

- 每个 Phase 改完跑 `npm run type-check`（CLAUDE.md 验证基线）。
- 涉及 DB 写入的链路（5.2）补手工 E2E：`npm run electron:dev` → 进对应训练入口 → 选学生 → 玩该游戏 → 完成 → 核对 ①`training_records` 新增一行（`module_code` 正确、`task_id` 为 null、`raw_data.gameCode` 存在）；②`report_record` 新增一行 `report_type='iep'`；③自动跳 IEPReport 且展示该游戏专属评估；④缺指标时对应统计卡隐藏；⑤报告可导出 Word。
- Phase 0 的 G09 修复单独验证：完成后能正常落库（`game_emotion_records` 新增）。

---

## 9. 风险与备注

- **字段/单位陷阱**：见 §4.2/4.3。归一化层是本方案的质量护栏，不可省略。
- **量纲**：accuracy 全部归一到 0-1（L05 的 0-100、L03 的 0-1、派生比值都要统一）；duration 全部归一到秒；reaction 统一 ms。
- **空壳降级**：`buildDefaultPerformanceData` 的 `{event}` 兜底必须被识别，避免出"全 0"的误导性报告。
- **不触碰**：训练资源体系（`sys_training_resource` / `training-resource-ui.ts`）、感官经典链路（`GamePlay.vue`，保持现状）、沉浸式情绪场景链路（`emotional-api.ts`，保持现状）。
- **风格约束**（CLAUDE.md）：`<script setup lang="ts">`、scoped CSS、`@/` 路径、DB/IPC 写入错误处理、不新增原生依赖、不无关重构；现有稳定代码不因风格偏好重写。
- **本方案不改变社交与感官现有闭环**，仅在其侧新增 fine-motor / life-skills（及可选 emotional-matching）分支。
