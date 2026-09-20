# 模拟演示数据生成脚本（seed-demo-data）

面向视频录制与客户演示：向 SCGP 的 `database.sqlite` 写入一批真实感的模拟数据（学生 / 班级 / 教师 / 评估 / 计划 / 训练记录 / AI 助手数据），并支持跨环境导出导入。

## 快速开始

```bash
# 1. 生成演示数据（42 名学生、19 个班、5 名教师、约 284 次评估、57 个计划、约 1050 条训练会话、AI 对话与记忆；默认种子下均为确定值）
node scripts/seed-demo-data.mjs seed --db <你的 database.sqlite 路径> --summary

# 2. 导出演示数据（供其他机器导入）
node scripts/seed-demo-data.mjs export --db <路径> --out demo-data.json

# 3. 在另一台机器导入
node scripts/seed-demo-data.mjs import --db <路径> --in demo-data.json
```

`database.sqlite` 位于应用 userData 目录（Windows 一般为 `%APPDATA%/scgp/database.sqlite`，或截图系统隔离目录）。目标库必须是应用初始化过的（表结构完整，含 abc/atec/cpep3/ai_student_memory 等 2026-08 后新增表）。

## 数据规模（v2，2026-09-20 重锚 2026-2027 学年）

| 数据 | 规模 |
|---|---|
| 学生 | 42 人（男 23 / 女 19，预置头像，诊断：学习障碍 10 / 言语障碍 8 / 发育迟缓 7 / 孤独症谱系 7 / 智力障碍 6 / 多重障碍 4）；每生含**监护人三件套**（父/母亲 + 虚构 13x 电话）、19 位学籍号（G24 开头）、按诊断配**健康备注**（17 条训练安全相关，如孤独症→噪音敏感、多重障碍→癫痫史需陪同，其余留空） |
| 班级 | 当前学年 12 班（幼儿园小/中/大班 + 小学一~六年级 + 初中一~三年级，2026-2027 active）+ 上一学年 7 个历史班（演示学年升级/调班历史） |
| 教师 | 5 人（`teacher01`~`teacher05`，密码统一 `admin123`，带头像） |
| 评估 | 每生 2-5 个量表，**17 个量表全覆盖**（sm / weefim / csirs / cnbsr2016 / fine_motor / crt / srs2 / conners-psq / conners-trs / sdq / cbcl / brief / abc / atec / cpep_3 / gmfm_88 / tgmd_3），约一半量表做**前测+后测**（2026-03 前测 → 训练 → 2026-07 后测，趋势页可见进步） |
| 计划 | 每生 1 个本学期进行中计划（2026-09 起）+ 约 1/3 学生 1 个上学期完成计划 |
| 训练记录 | 上学期训练期 + 9 月开学两周新鲜记录（约 260 条）：感官游戏 / 器材 / 情绪场景 / 情绪游戏 / 认知游戏 / **生活自理任务（task_training，约 120 条，默认种子实测 124 条）**，entry_code 全覆盖 7 个训练入口；同步写入 `training_session` 统一主表 |
| AI 助手 | 4 条对话会话（一人一策 / 成长看得见 / 沟通有方 / 心晴陪伴 × 真实感特教问答）+ 8 条已确认学生 AI 记忆（含置顶与安全级） |
| 演示彩蛋 | 2 名跳级 + 1 名留级学生（触发「月龄-年级核对」软提示，学生 10030/10033/10039）+ 跨学年升级历史 20 条 |

生日全部按 2026-2027 学年 8/31 资格日口径反推（`src/types/class.ts` 的 `getExpectedGradeLevel`），常规学生年龄-年级匹配，仅 3 个刻意演示案例例外。

## 客户端分发包（推荐）

客户体验无需 Node 环境，直接用**整库替换**：

```bash
node scripts/build-demo-dist.mjs
```

产物：`output/SCGP演示数据包-<日期>.zip`（`database.sqlite` + `导入说明.md`）。

流程：客户安装应用 → 启动一次后退出 → 备份原库 → 用包内 `database.sqlite` 覆盖
`C:\Users\<用户名>\AppData\Roaming\scgp\database.sqlite` → 重启登录（admin/admin123）。

包内为**纯净演示库**（42 名演示学生 + 553 条预置训练资源，无 fixture 数据）。底库由隔离 userData 启动 Electron dev 自动生成最新 schema（userData 放系统临时目录，避免 vite watcher EBUSY），seed 后校验通过打包。schema 需与安装版本配套（升级应用后重新生成分发包）。

## 设计要点

- **报告符合学生状态**：每个诊断类型配有「量表画像」（如学习障碍 → csirs 视听知觉维度 T 分偏低、crt 中低；孤独症谱系 → ABC/ATEC 中度、srs2 社交沟通偏高），评估分数按画像生成，level 字段与分数严格对应各 driver 的官方判定规则（abc/atec 直接复用 `getABCLevel`/`getATECLevel` 阈值），报告页文字自然与诊断呼应。
- **纵向进步**：前测按画像症状全开，后测按症状减轻生成，趋势页可展示「训练带来进步」。
- **幂等**：演示数据使用固定高段位 id（学生 10001+、班级 20001-20019、评估 40001+、AI 会话 61001+…），重复执行 seed / import 会先清理旧演示数据再写入，不会误伤原有数据。
- **可复现**：固定随机种子（`--seed` 可换），同种子生成结果一致。
- **无新增依赖**：仅使用项目已有的 `sql.js`；教师密码用 node `crypto` 实现与 `src/utils/password-security.ts` 相同的 PBKDF2-SHA256(600k)。

## 数据文件

- `scripts/seed-demo-data.mjs`：CLI 主脚本（seed / export / import）
- `scripts/seed-demo-data/data.mjs`：数据定义（学生/班级/教师/画像/AI 数据）+ 17 个量表分数生成器

## 已知边界

- `sm` / `cnbsr2016` / `fine_motor` / `abc` / `atec` / `gmfm_88` / `tgmd_3` 未生成答题明细（detail 表为空，报告页明细区为空，主报告正常）；`csirs` / `weefim` / `cpep3` 已生成完整明细（cpep3 走旧记录形态，报告页只读重算）。
- 演示数据不包含：资源文件本体（图片等，应用启动后经 resource:// 读取预置资源）、AI 附件、器材批次（batch）、评估质量字段（total_duration 等留空）。
- 修复的关联产品 bug（验证时发现）：趋势路由 slug 参数化（`assessment/:urlSlug/trend/:studentId`）、趋势页性别判断、csirs 报告页同路由参数切换不刷新。
