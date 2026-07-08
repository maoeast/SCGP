# AGENTS.md

> 职责：SCGP 仓库级代理入口，统一项目事实来源、启动顺序、执行边界、验证要求和交接方式。  
> 何时阅读：每次进入仓库时；尤其是续接未完成任务、处理脏工作区、做跨文件改动、合并回主线之前。  
> 不负责：替代 `.continue-here.md` 记录当前任务细节，或替代当前代码确认真实实现状态。

本文件面向 Codex、Claude Code 一类代码代理。目标不是提供“全部背景”，而是让代理在这个长期演进、文档较多、脏工作区常见的仓库中，先按对的顺序建立事实，再按对的方式执行。

---

## 1. 项目身份与命名

- 当前正式产品名称：`SCGP / 星愿能力发展平台`
- 历史阶段名称：
  - `生活自理适应综合训练系统`
  - `感官能力发展系统 (SIC-ADS)`

命名规则：

- 讨论当前产品、当前实现、当前平台时，统一使用 `SCGP`
- 历史名称只用于旧文档、旧规划、兼容代码和演进追溯
- 不要把历史文档里的名称和范围直接当成当前事实

---

## 2. 默认启动顺序

### 2.1 新会话的最小启动顺序

如果只是进入仓库建立当前事实，默认按这个顺序读：

1. `AGENTS.md`
2. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
3. `README.md`

只有在任务确实需要更多细节时，再按需补读：

4. `docs/planning/2026-03-13-scgp-current-prd.md`
5. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
6. `重构实施技术规范.md`
7. `PROJECT_CONTEXT.md`

### 2.2 续接未完成任务的默认顺序

如果用户说“继续执行 / 续接 / 读取 `.continue-here.md` / 接着上次做”，默认按这个顺序：

1. `AGENTS.md`
2. `.continue-here.md`
3. `PROJECT_CONTEXT.md`

然后立刻检查当前 Git 现场：

4. `git stash list`
5. `git status --short --branch`
6. `git log --oneline -5`
7. 当前分支名

说明：

- `.continue-here.md` 是当前唯一有效续接入口，优先级高于历史日志
- `PROJECT_CONTEXT.md` 是全局补充摘要，不是每次新会话的默认首读大文档
- 续接任务前先看 Git 现场，是为了避免把旧 handoff 当成当前真实工作区状态

### 2.3 Handoff 文件的使用

- `HANDOFF.md` 适合做阶段切换、主题切换、跨会话调度
- `.continue-here.md` 适合记录当前唯一有效的下一步
- 默认优先更新 `.continue-here.md`
- 只有在明显切换大专题、里程碑或需要重新组织入口时，再同步 `HANDOFF.md`

---

## 3. 当前产品与架构事实

### 3.1 当前产品现实

当前代码主线已经具备以下可运行能力：

- 学生管理
- 能力评估
- 游戏训练
- 器材训练
- 训练记录
- 训练计划
- 报告生成
- 资源中心
- 系统管理
- 班级管理与学生分班
- 本地账号登录、激活、更新接入、备份恢复

必须持续记住的现实：

- `sensory` 是当前最完整的业务主链
- `emotional` 已有可运行链路，但仍处于持续补全中
- `social`、`life_skills` 等仍不是完整可交付模块
- 不要把未来模块目标态写成当前已实现现状

### 3.2 当前架构事实

- 技术栈：`Electron + Vue 3 + TypeScript + Vite + SQL.js`
- 数据库主线：渲染进程内 `sql.js` + `SQLWrapper` 防抖保存
- 持久化主线：渲染进程导出数据库，经 IPC 交给 Electron Main 原子写入
- 资源协议：`resource://`
- 资源主模型：`sys_training_resource + sys_tags + sys_resource_tag_map`
- 评估主链：`AssessmentContainer + ScaleDriver`
- 模块系统：已有 `ModuleRegistry`
- 路由现实：仍以静态路由表为主，不是注册表动态装配

不要误判为当前已完成：

- 数据库 Worker 主链
- Image Worker 主链
- 注册表驱动的动态路由
- 完整可交付的多模块平台

### 3.3 当前重要口径

- 当前前端授权事实来源是 `authStore.effectiveEntitlements`
- `allowedModules` / 许可证 `am` 当前只保留原始授权 code、兼容与调试语义
- 路由拦截、菜单可见性、训练入口判权与模块访问都应沿用 `entitlement-first`
- 不要再把 `allowedModules` 当作最终访问判权事实来源

---

## 4. 文档事实来源优先级

当前文档优先级：

1. 当前代码
2. `AGENTS.md`
3. `docs/planning/2026-03-23-scgp-context-bootstrap.md`
4. `README.md`
5. `.continue-here.md`（仅在续接当前任务时）
6. `PROJECT_CONTEXT.md`
7. `docs/planning/2026-03-13-scgp-current-prd.md`
8. `docs/reports/2026-03-13-scgp-prd-gap-analysis.md`
9. 当前仍在执行的 `docs/plans/*.md`

以下文档默认不是当前事实来源，只能作为背景参考：

- `docs/planning/prd.md`
- 历史实施计划、历史设计稿、历史审计
- `docs/logs/*.md`
- 旧阶段交付型手册

规则：

- 如果文档写“已完成”，但代码仍是过渡态，以代码为准
- 引用历史文档时，必须明确标注“历史 / 草案 / 旧计划 / 旧交付稿”
- 如果任务明确指向 `emotional`，补充读取 `docs/planning/2026-03-16-emotional-module-prd.md`
- 读取 PRD 时，必须区分“目标态”和“当前代码现实”

---

## 5. Git 与脏工作区工作流

这个仓库经常处于 dirty worktree 状态。代理必须把“先看现场，再窄范围操作”当成硬约束。

### 5.1 开工前必须确认

- 当前分支
- 当前 `git status`
- 是否存在 `stash`
- 最近 5 个提交

### 5.2 dirty worktree 规则

- 默认只做当前任务相关的窄范围改动
- 不要顺手整理无关图片、打包产物、更新配置或历史噪音
- 如果同一文件里存在用户未说明的现有改动，先读清上下文再协作，不要直接覆盖
- 如果发现与你的任务直接冲突的未解释改动，暂停并说明冲突点

### 5.3 提交与集成

- 默认先本地验证，再考虑提交
- 默认做小步提交，不做大爆炸提交
- 不要把无关改动混入当前修复或功能
- 如需合并回主线，优先在隔离 worktree 中完成，而不是在脏主工作区直接操作

### 5.4 worktree 规则

以下场景优先使用隔离 worktree：

- 合并分支回 `main`
- 在脏工作区上做高风险验证
- 需要确认集成结果而不想污染当前工作区

---

## 6. 默认执行工作流

### 6.1 标准流程

1. 明确目标、边界、成功标准
2. 读取上下文与当前代码
3. 检查 Git 现场
4. 给出计划
5. 以最小影响面实施
6. 运行最相关验证
7. 检查 diff
8. 产出简洁结论与下一步

### 6.2 计划规则

以下任务默认先计划，再编码：

- 跨文件改动
- 重构
- 新专题接入
- 多步骤修复
- 文档与实现需要同步调整
- 用户明确提到“多 agent / 多agent”

如果不采用多 agent 或计划式推进，需要先说明原因。

### 6.3 编码规则

- 保持本地优先、零额外原生运行时依赖路线
- 不要默认引入新的原生编译依赖
- 新评估能力优先接入统一评估容器和 `ScaleDriver`
- 新资源能力优先接入统一资源模型
- 新模块扩展优先沿用平台底座，不要回到单体垂直页面堆叠
- 只改当前任务相关文件，不顺手重构无关内容

---

## 7. 验证规则

### 7.1 通用原则

- 不相信口头保证，只相信可复现证据
- 没有验证，不得声称“已修复 / 已完成 / 可用”
- 每次改动后至少运行一项最相关验证

### 7.2 本仓库常用验证入口

优先使用：

- `npm run type-check`
- `npm run type-check:emotional`
- `npm run build:web`

按专题补充：

- `npx jiti tests/entitlement-catalog.test.ts`
- `node --test scripts/tests/training-route-access.test.mjs`
- 其他 `tests/`、`scripts/tests/` 下的专题验证

只在确有必要时使用：

- `npm run build:electron`
- 打包、更新、安装器相关命令

### 7.3 lint / format 规则

- 不要默认跑 `eslint --fix` 或大范围 `prettier --write`
- 只有当任务明确涉及格式、风格或该改动范围足够小且可控时，才使用自动修复
- 避免把大面积格式噪音混入功能改动

---

## 8. 多 agent、专项流程与高风险主题

### 8.1 多 agent 默认适用场景

- 跨文件重构
- 阶段性实施
- 平台债收口
- 文档、实现、验证并行推进

### 8.2 授权与更新相关主题

当任务涉及以下主题时，默认视为高风险主题，必须先确认当前实现与当前口径：

- 授权链
- 激活
- 更新源
- 打包发布
- 训练记录主表
- 跨入口统一训练链

规则：

- 不要沿用旧 mental model 直接下结论
- 先回代码确认当前事实来源、当前入口和当前验证方式
- 只在当前专题范围内改动，不混入无关资源或脏文件

### 8.3 合并回主线

- 合并前先验证当前分支和目标主线状态
- 在脏仓库上，优先使用隔离 worktree 完成合并与验证
- 如遇推送异常、旧 SHA 或 ref 锁问题，先核对远端状态再重试

---

## 9. 输出与交接风格

### 9.1 输出风格

- 简洁、直接、少空话
- 优先说明：
  - 当前已实现
  - 当前未实现
  - 当前过渡态
- 避免把目标态写成现状

### 9.2 交接风格

当一次工作需要停在半途或用户明确要求交接时，优先产出紧凑 restart artifact，而不是长总结。

默认优先：

1. 更新 `.continue-here.md`
2. 必要时补 `HANDOFF.md`

交接内容尽量压缩为：

- Current State
- Next Action
- Blockers
- Key Decisions
- Relevant Files

### 9.3 新会话续接提示

如果用户要求“给我下个会话的 prompt / 继续用的 prompt”，优先给一段可复制的短 prompt，而不是长篇回顾。

---

## 10. 一句话规则

> 先按对的顺序读，先看 Git 现场，先确认代码事实；在脏工作区里只做窄范围改动，优先计划和验证，结束时留下紧凑可续接的交接。  
