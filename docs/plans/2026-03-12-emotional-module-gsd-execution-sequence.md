# 情绪行为调节模块 GSD 实际执行顺序

## 1. 文档目标

本文档给出情绪行为调节模块在 SCGP 项目中的推荐 GSD 执行顺序，目标是：

1. 尽量复用已经沉淀的 PRD、页面设计、数据设计文档。
2. 只在必要处使用完整 Phase 流程。
3. 将绝大多数具体实现任务降解为 `gsd-quick`，减少 token 消耗。

本文档默认以下文档已存在：

- `docs/planning/2026-03-12-emotional-module-prd.md`
- `docs/architecture/2026-03-12-emotional-module-page-and-route-design.md`
- `docs/architecture/2026-03-12-emotional-module-data-design.md`
- `docs/plans/2026-03-12-emotional-module-implementation-plan.md`

当前已对齐的实际阶段编号：

- `Phase 2.2: Emotional Behavior Regulation Module`

## 2. 总体策略

情绪模块建议采用：

1. 一次正式规划
2. 多次 `gsd-quick` 执行
3. 阶段末统一验证

不推荐：

1. 每个子任务都重新 `gsd-plan-phase`
2. 每个页面都开完整流程
3. 每改一点都做 phase 验证

## 3. 执行顺序概览

```text
gsd-progress
-> gsd-plan-phase 2.2
-> gsd-quick：入口与路由
-> gsd-quick：资源类型与种子数据
-> gsd-quick：情绪与场景训练页
-> gsd-quick：表达关心训练页
-> gsd-quick：记录表与 API
-> gsd-quick：记录页
-> gsd-quick：报告页
-> gsd-validate-phase
```

## 4. 详细执行步骤

## 步骤 0：开始前检查

目的：

- 确认当前项目状态
- 确认当前推荐下一步

建议命令：

```bash
$gsd-progress
```

输出预期：

- 当前 phase 状态
- 是否已存在相关计划
- 当前推荐动作

## 步骤 1：正式规划本模块

目的：

- 用现有 PRD 和设计文档生成正式的 phase 计划

建议命令：

```bash
$gsd-plan-phase 2.2 --prd docs/planning/2026-03-12-emotional-module-prd.md --skip-research
```

说明：

1. 当前已对齐到 `.planning/ROADMAP.md` 中的 `Phase 2.2`。
2. 由于 PRD、页面设计和数据设计已完成，优先使用 `--skip-research`，避免重复研究浪费 token。

完成条件：

- 生成该 phase 的 `PLAN.md`
- 任务被拆解成可执行子项

## 步骤 2：模块入口与路由骨架

目的：

- 让情绪模块从现有系统中可进入

建议命令：

```bash
$gsd-quick 为 emotional 模块补充正式入口、路由骨架和 Menu 页面，复用 games/select-student 作为学生选择流程
```

应完成内容：

1. `ModuleRegistry` 调整
2. 路由新增
3. `src/views/emotional/Menu.vue`
4. 模块入口打通

完成标志：

- 可从系统入口进入情绪模块菜单页

## 步骤 3：资源类型与演示内容接入

目的：

- 打通场景资源的数据来源

建议命令：

```bash
$gsd-quick --full 为 emotional 模块新增 emotion_scene 和 care_scene 资源类型，接入 ResourceAPI，并补首批演示数据结构
```

应完成内容：

1. 资源类型约定
2. `meta_data` 结构定义
3. 首批情绪场景演示数据
4. 首批表达关心演示数据

完成标志：

- 前端可加载演示资源

## 步骤 4：情绪与场景训练主流程

目的：

- 实现第一个子模块完整闭环

建议命令：

```bash
$gsd-quick --full 实现 emotional 模块的 EmotionSceneTraining 页面，支持场景展示、五种情绪选择、推理问题、应对方案、即时反馈和本地会话汇总
```

应完成内容：

1. 场景展示
2. 情绪识别
3. 阶梯式提示
4. 社交推理
5. 问题解决
6. 单次训练结果汇总

完成标志：

- 单个学生可以完整跑完一个情绪场景会话

## 步骤 5：表达关心训练主流程

目的：

- 实现第二个子模块完整闭环

建议命令：

```bash
$gsd-quick --full 实现 emotional 模块的 CareExpressionTraining 页面，支持共情式、建议式、行动式话术训练，支持表达者和接收者双视角
```

应完成内容：

1. 场景展示
2. 三类话术训练
3. 使用效果说明
4. 表达者视角反馈
5. 接收者视角比较

完成标志：

- 单个学生可以完整跑完一个表达关心会话

## 步骤 6：训练记录落库

目的：

- 让训练不只是页面演示，而是正式数据闭环

建议命令：

```bash
$gsd-quick --full 为 emotional 模块新增训练会话表和训练明细表，扩展 training_records 写入 module_code=emotional，并实现保存/查询 API
```

应完成内容：

1. migration
2. `emotional_training_session`
3. `emotional_training_detail`
4. API 封装
5. 页面接入保存逻辑

完成标志：

- 训练后刷新或重启仍可查询会话数据

## 步骤 7：训练记录页

目的：

- 让教师可以查看情绪模块的历史记录

建议命令：

```bash
$gsd-quick 实现 emotional 模块训练记录页，支持按学生、子模块、日期筛选，并查看单次会话摘要
```

应完成内容：

1. `src/views/emotional/Records.vue`
2. 筛选与列表
3. 单次记录摘要

完成标志：

- 教师可查看情绪模块历史训练记录

## 步骤 8：专属报告页

目的：

- 让老师和家长查看趋势与偏好

建议命令：

```bash
$gsd-quick --full 实现 emotional 模块专属报告页，使用 ECharts 展示正确率趋势、场景掌握分布、话术偏好和视角对比
```

应完成内容：

1. `src/views/emotional/Report.vue`
2. 图表查询接口
3. ECharts 图表
4. 报告摘要文案

完成标志：

- 可按学生查看情绪模块专属报告

## 步骤 9：阶段验证

目的：

- 在一轮主要功能完成后做统一查漏补缺

建议命令：

```bash
$gsd-validate-phase 2.2
```

如果需要会话式验收，可补：

```bash
$gsd-verify-work
```

说明：

1. 当前已对齐到 `Phase 2.2`。
2. 这一步应该放在主功能基本完成后，而不是每做完一个页面就执行。

## 5. 推荐的任务切分粒度

对情绪模块，建议每次 `gsd-quick` 只覆盖一个足够明确的目标。

好的切分：

1. 入口与路由
2. 资源类型与种子数据
3. 情绪与场景训练页
4. 表达关心训练页
5. 数据落库
6. 记录页
7. 报告页

不好的切分：

1. “把情绪模块全部做完”
2. “把前后端和报告全做了”
3. “把情绪模块连同二期功能一次性完成”

## 6. 中断与恢复建议

如果某一步没有完成，当天应执行：

```bash
$gsd-pause-work
```

下一次继续前先执行：

```bash
$gsd-resume-work
```

如果只是想看当前状态，可执行：

```bash
$gsd-progress
```

## 7. 旁支需求的处理方式

如果在开发过程中冒出以下需求：

- 教师自定义情绪场景
- 语音播报
- 报告导出 PDF
- 家长模式

不建议立刻插入当前主线。

建议命令：

```bash
$gsd-add-todo 后续为 emotional 模块增加教师自定义场景能力
```

这样可以避免主线程和当前 phase 不断膨胀。

## 8. 低 Token 执行要点

执行情绪模块时，想省 token，请坚持以下约束：

1. 不重复口述 PRD，直接引用现有文档。
2. 只规划一次，不反复重跑 `gsd-plan-phase`。
3. 默认使用 `gsd-quick` 而不是全流程。
4. 完成一个子任务就收口，不在一个线程里无限追加新需求。
5. 中断时使用 `pause`，不要靠超长聊天历史续命。

## 9. 推荐的实际执行模板

可以按下面模板使用：

```text
Day 1
gsd-progress
gsd-plan-phase 2.2 --prd docs/planning/2026-03-12-emotional-module-prd.md --skip-research
gsd-quick 入口与路由
gsd-pause-work

Day 2
gsd-resume-work
gsd-quick 资源类型与演示数据
gsd-quick --full 情绪与场景训练页
gsd-pause-work

Day 3
gsd-resume-work
gsd-quick --full 表达关心训练页
gsd-quick --full 训练记录落库
gsd-pause-work

Day 4
gsd-resume-work
gsd-quick 记录页
gsd-quick --full 报告页
gsd-validate-phase 2.2
```

## 10. 最终建议

情绪模块的最佳 GSD 推进方式不是“全程重流程”，而是：

1. 文档先行
2. 一次规划
3. 多次 Quick 执行
4. 最后统一验证

这套方式对 SCGP 当前的代码规模和上下文复杂度最稳，也最省 token。
