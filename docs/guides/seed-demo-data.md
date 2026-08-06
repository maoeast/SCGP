# 模拟演示数据生成脚本（seed-demo-data）

面向视频录制与客户演示：向 SCGP 的 `database.sqlite` 写入一批真实感的模拟数据（学生 / 班级 / 教师 / 评估 / 计划 / 训练记录），并支持跨环境导出导入。

## 快速开始

```bash
# 1. 生成演示数据（22 名学生、7 个班、5 名教师、112 次评估、28 个计划、约 450 条训练记录）
node scripts/seed-demo-data.mjs seed --db <你的 database.sqlite 路径> --summary

# 2. 导出演示数据（供其他机器导入）
node scripts/seed-demo-data.mjs export --db <路径> --out demo-data.json

# 3. 在另一台机器导入
node scripts/seed-demo-data.mjs import --db <路径> --in demo-data.json
```

`database.sqlite` 位于应用 userData 目录（Windows 一般为 `%APPDATA%/SCGP/database.sqlite`，或截图系统隔离目录）。目标库必须是应用初始化过的（表结构完整）。

## 数据规模

| 数据 | 规模 |
|---|---|
| 学生 | 22 人（男 15 / 女 7，常见姓名，诊断集中学习障碍 7 / 言语障碍 6 / 多重障碍 5，补充孤独症谱系障碍 2 / 智力障碍 2） |
| 班级 | 7 个：大班、一年级~三年级、初一~初三（2025-2026 当前学年） |
| 教师 | 5 人（`teacher01`~`teacher05`，密码统一 `admin123`） |
| 评估 | 每生 2-5 个量表（sm / weefim / csirs / cnbsr2016 / fine_motor / crt / srs2 / conners-psq / conners-trs / sdq / cbcl / brief），约一半量表做**前测+后测**（2026-03 前测 → 训练 → 2026-07 后测，分数提升体现训练进步，趋势页可见） |
| 计划 | 每生 1 个进行中计划（挂 2-4 个活跃资源）+ 约 1/3 学生 1 个历史完成计划 |
| 训练记录 | 2026-04 ~ 2026-07：游戏 8-14 条 + 器材 3-6 条 + 情绪场景 3-5 条 + 情绪游戏 1-3 条；**entry_code 全部使用训练入口 code**（sensory-integration 等，与 TrainingRecordsMenu 统计一致）；同步写入 `training_session` 统一主表 |
| 报告 | 评估报告（130 次）+ 情绪模块报告（12 条）+ 训练干预报告（22 条，关联进行中计划） |

## 设计要点

- **报告符合学生状态**：每个诊断类型配有「量表画像」（如学习障碍 → csirs 视听知觉维度 T 分偏低、crt 中低；言语障碍 → srs2 社交沟通偏高），评估分数按画像生成，level 字段与分数严格对应各 driver 的官方判定规则，报告页文字自然与诊断呼应。
- **纵向进步**：前测按画像症状全开，后测按症状减轻生成，趋势页可展示「训练带来进步」。
- **幂等**：演示数据使用固定高段位 id（学生 10001+、班级 20001+、评估 40001+…），重复执行 seed / import 会先清理旧演示数据再写入，不会误伤原有数据。
- **可复现**：固定随机种子（`--seed` 可换），同种子生成结果一致。
- **无新增依赖**：仅使用项目已有的 `sql.js`；教师密码用 node `crypto` 实现与 `src/utils/password-security.ts` 相同的 PBKDF2-SHA256(600k)。

## 数据文件

- `scripts/seed-demo-data.mjs`：CLI 主脚本（seed / export / import）
- `scripts/seed-demo-data/data.mjs`：数据定义（学生/班级/教师/画像）+ 各量表分数生成器

## 已知边界

- `sm` / `cnbsr2016` / `fine_motor` 未生成答题明细（detail 表为空，报告页明细区为空，主报告正常）；`csirs` / `weefim` 已生成完整明细。
- 演示数据不包含：资源文件本体（图片等）、AI 对话记录、器材批次（batch）。
- 修复的关联产品 bug（验证时发现）：趋势路由 slug 参数化（`assessment/:urlSlug/trend/:studentId`）、趋势页性别判断、csirs 报告页同路由参数切换不刷新。
