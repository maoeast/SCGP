# AGENTS.md

> 职责：SCGP 仓库级代理入口，统一启动顺序、执行边界、验证要求与交接方式。
> 何时读：进入仓库时；尤其续接任务、处理脏工作区、跨文件改动、合并回主线前。
> 本文件是唯一代理配置源：Claude Code 经根目录 `CLAUDE.md` 的 `@AGENTS.md` 加载，Codex 直接读。改规则只改这一处。

本文件只放**规则与边界**；事实查询去 `docs/INDEX.md`（文档导航）和代码本身。文档冲突时优先级：当前代码 > `.continue-here.md` > `AGENTS.md` > `docs/INDEX.md` > 其他文档；引用历史文档必须标注"历史 / 草案 / 旧交付稿"。

---

## 1. 项目身份

- 当前产品：`SCGP / 星愿能力发展平台`；历史名（`SIC-ADS` 等）只用于旧文档与兼容代码
- 技术栈：`Electron + Vue 3 + TypeScript + Vite + SQL.js`，本地优先、零额外原生依赖
- 当前最完整业务主链是 `sensory`；`emotional` 持续补全；`social` / `life_skills` 尚未完整交付——不要把目标态当现状

---

## 2. 启动顺序

新会话最小启动：

1. `AGENTS.md`
2. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
3. `README.md`

续接任务（用户说"继续 / 续接 / 接着上次"）：

1. `AGENTS.md` → `.continue-here.md` → `PROJECT_CONTEXT.md`
2. 查 Git 现场：`git stash list` / `git status --short --branch` / `git log --oneline -5` / 当前分支
3. 有 `wip(...)` stash 先与用户确认是否 `git stash pop`

> 按需深读清单（产品需求、技术规范、PRD、差距分析、emotional 模块等）见 `docs/INDEX.md`，不要在会话开头一次性全读。

Handoff：`.continue-here.md` 记当前唯一下一步（优先更新）；`HANDOFF.md` 仅在切大专题 / 里程碑时同步。

---

## 3. 架构事实（不要误判为已完成）

- DB 主线：渲染进程内 `sql.js` + `SQLWrapper` 防抖保存；持久化经 IPC 交 Electron Main 原子写入
- 资源协议 `resource://`，主模型 `sys_training_resource + sys_tags + sys_resource_tag_map`
- 评估主链 `AssessmentContainer + ScaleDriver`；模块系统已有 `ModuleRegistry`
- 路由仍是静态路由表，不是注册表动态装配
- 授权事实来源 `authStore.effectiveEntitlements`（entitlement-first）；`allowedModules` / 许可证 `am` 仅保留兼容与调试语义，不是最终判权来源
- **未完成**：DB Worker 主链、Image Worker 主链、注册表动态路由、完整多模块平台

当前优先技术债：备份 / 恢复未覆盖全 schema、资源文件生命周期未收口、资源收藏未完成、评估入口仍硬编码、命名残留旧阶段名、开发 / 迁移工具仍混在主路由树。

---

## 4. Git 与脏工作区

本仓库常处于 dirty worktree。开工前必看：当前分支、`git status`、是否有 stash、最近 5 个提交。

- 默认只做当前任务相关的窄范围改动，不顺手整理无关图片 / 产物 / 配置 / 历史噪音
- 同文件若有未说明的现有改动，先读上下文再协作，不直接覆盖；发现与任务冲突的未解释改动，暂停并说明
- 小步提交，不大爆炸；不把无关改动混入当前修复；提交 / 推送只在用户明确要求时进行；本项目单人开发，默认直接提交 `main`，仅在用户要求或高风险改动（大规模重构 / 合并分支 / 可能破坏主线的实验）时才开分支
- 合并回主线、脏工作区高风险验证优先用隔离 worktree

---

## 5. 执行与编码规则

标准流程：明确目标 / 边界 / 成功标准 → 读上下文与代码 → 查 Git 现场 → 给计划 → 最小影响面实施 → 跑最相关验证 → 查 diff → 简洁结论 + 下一步。

以下任务默认先计划再编码：跨文件改动、重构、新专题接入、多步骤修复、文档与实现同步、用户提到"多 agent"。不采用要先说明原因。

**必须做：**

- 新 Vue 组件用 `<script setup lang="ts">`；路径用 `@/`；样式沿用现有 `scoped` CSS
- 新 Pinia store 跟随模块既有风格，不顺手统一重构
- 异步流程、IPC、数据库写入、资源文件操作必须有明确错误处理
- 新评估能力接入 `AssessmentContainer + ScaleDriver`；新资源能力接入统一资源模型；新模块沿用平台底座

**禁止清单（Do NOT introduce，除非任务明确要求）：**

- `sqlite3` / `better-sqlite3` 等原生编译数据库依赖（数据层锁定 `sql.js`）
- `sharp` 等原生图像依赖；任何破坏"零额外原生依赖"路线的运行时依赖
- 新状态管理库（项目已用 Pinia）
- 把未完成的目标态当现状去改

---

## 6. 验证

- 不信口头保证，只信可复现证据；没验证不得称"已修复 / 已完成 / 可用"
- 改 TS / Vue / 路由 / Store / DB API 后至少跑一次 `npm run type-check`
- 优先用：`npm run type-check` / `npm run type-check:emotional` / `npm run build:web`
- 专题补充：`npx jiti tests/entitlement-catalog.test.ts`、`node --test scripts/tests/training-route-access.test.mjs`
- 仅确有必要时用 `npm run build:electron` 及打包 / 安装器命令
- 不要默认跑 `npm run lint`（含 `--fix`）或大范围 `prettier --write`，避免格式噪音混入功能改动

完整命令清单见 `package.json` 的 `scripts`。

---

## 7. 高风险主题

涉及以下主题先回代码确认当前事实来源、入口、验证方式，不沿用旧 mental model，只在专题范围内改：

- 授权链 / 激活 / 更新源 / 打包发布
- 训练记录主表 / 跨入口统一训练链
- 器材推荐 entitlement 过滤（必须用 domain→entitlement 级，而非模块级，避免能力包串扰）

---

## 8. 输出与交接

- 简洁直接少空话；不要"Great question!"之类废话；回复用中文，代码注释随周边；路径用 `path:line`
- 先给方案再写代码；不确定时列选项不猜测；重大变更先问，小优化可直接执行
- 输出说三态：已实现 / 未实现 / 过渡态，不把目标态写成现状
- 交接优先紧凑 restart artifact 而非长总结：先更新 `.continue-here.md`，必要时补 `HANDOFF.md`；内容压成 Current State / Next Action / Blockers / Key Decisions / Relevant Files
- 用户要"下个会话 prompt"时给可复制短 prompt，不长篇回顾

---

## 9. 文档维护

- 改入口文档时同步检查：`AGENTS.md`（唯一规则源）、`CLAUDE.md`（保持为 `@AGENTS.md` 引用，不回填正文）、`HANDOFF.md`、`README.md`、`docs/INDEX.md`；`PROJECT_CONTEXT.md` 仅全局背景有实质变化时改
- `docs/archive/` 放已完成 / 历史文档（codex-handoffs、superpowers 等），不进主索引、不作为当前事实来源
- 历史框架残留（GSD、superpowers 插件、`.planning/`）已清除，不要再引入

---

> 一句话：先按对的顺序读、先看 Git 现场、先确认代码事实；脏工作区只做窄范围改动，优先计划与验证，遵守禁止清单，结束留紧凑交接。代理规则只维护 `AGENTS.md` 一处。
