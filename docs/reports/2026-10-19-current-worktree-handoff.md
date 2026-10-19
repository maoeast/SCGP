# 2026-10-19 仓库现状与接手快照

> 类型：2026-10-19 发布前的时点快照。这里的“未提交 / 未发布”只表示该次核对时的状态；后续提交与同版本发布已完成，见 [当日最新发布报告](./2026-10-19-v1.1.5-self-care-emotional-public-rebuild-release.md)。接手仍须重新运行 Git 命令。

## 1. Git 与发布边界

| 项目 | 2026-10-19 核对结果 |
| --- | --- |
| 分支 | `main`，跟踪 `origin/main` |
| HEAD | `4165e52`，2026-10-17 01:11:23 +08，1.1.5 激活页覆盖发布记录 |
| 最近代码提交 | `cbce1b4`，2026-10-17 01:05:14 +08，激活页更新 |
| stash | 无 |
| 工作区 | 非干净；下列改动尚未提交、推送或打入安装包 |
| 已发布安装包 | 1.1.5，同版本覆盖发布的范围以 [10 月 17 日发布报告](./2026-10-17-v1.1.5-activation-rebuild-release.md) 为准 |

核对时已有代码改动：

- 生活自理媒体选择相关：`electron/main.mjs`、`electron/preload.cjs`、`electron/preload.mjs`、`src/features/self-care/self-care-routes.ts`、`src/types/electron.d.ts`、`src/views/resource-center/editors/TaskTrainingEditor.vue`、`src/views/self-care/TaskEditor.vue`。
- 情绪场景姓名相关：`src/features/emotional/immersive/compileEmotionSceneImmersive.ts`。
- 未跟踪目录：`designs/scgp-product-intro/`、`designs/scgp-video-library/`。视频课堂已独立部署，发布和验证边界见 `designs/scgp-video-library/README.md`；目录仍未纳入 Git。
- `.continue-here.md` 原本已包含多轮未提交交接内容。本次将整理前全文原样存入 `docs/logs/2026-10-19-previous-continue-here.md`，根目录只留当前续接摘要。

## 2. 当前可运行链路与近期改动

### 生活自理任务编辑，本地未提交

入口是 `/self-care/tasks/new` 和 `/self-care/tasks/:taskId/edit`，主页面为 `src/views/self-care/TaskEditor.vue`，步骤编辑组件为 `src/views/resource-center/editors/TaskTrainingEditor.vue`。本地改动把页面主要字段改成教师可读的短名称与提示，分类可选；封面和步骤的图片、视频、语音可调用 Electron 文件选择器。选择文件夹只设置文件选择对话框的起始位置，不会批量导入文件夹。选中的文件由 Main 进程复制到 `userData/resources/uploaded/self-care/`，表单存放 `resource://` 路径。

已验证 `npm run type-check`、`npm run build:web`、Electron 主进程和 preload 语法、`git diff --check`；浏览器中检查了登录后的页面和分类选项。在隔离 Electron 数据目录中程序化选择 PNG 后，封面和步骤图片的复制、创建任务、重载、数据库引用及 SHA-256 一致性通过。未人工点击系统原生文件对话框，视频与语音文件未逐项实测。这些改动尚未打包发布。

### 情绪场景主角姓名，本地未提交

训练入口 `src/components/training/TrainingSession.vue` 从资源元数据生成沉浸式训练数据；`src/components/training/SceneIntroStep.vue` 显示 `scene.character_name`。之前编译器把该字段固定为“小朋友”，而姓名对照表仍完整保存在 `docs/references/emotion-scene-character-names.json`。现由 `src/features/emotional/immersive/compileEmotionSceneImmersive.ts` 按 `sceneCode` 查表，未知编码继续回退“小朋友”。

现有 81 个预置场景与姓名表一一对应；对 81 个场景逐一运行训练数据编译均通过，`scene-1` 为小明、`scene-17` 为小华、`scene-3` 为小雪。`npm run type-check`、`npm run build:web`、`git diff --check` 通过。用户随后回复“好了”；本会话没有独立完成桌面版逐页人工验收。没有修改资源库，也不需要迁移已保存的资源。

## 3. 接手时的阅读与取舍

1. 按 `AGENTS.md` 先读启动入口，再看 `.continue-here.md`；需要专题背景时用 `docs/INDEX.md` 找文档，直接回代码确认实现。
2. 重新查看 `git status --short --branch`、`git stash list`、`git log --oneline -5`。保留上述未提交改动和未跟踪视频目录，不把它们误认为已发布的 1.1.5。
3. 当前没有已授权的后续代码、提交或发布任务。旧教程产品缺口详见 [修复交接](../plans/2026-10-15-training-video-product-issues-repair-handoff.md)，属于按需参考，不自动执行。
4. `PROJECT_CONTEXT.md` 的大量分节保留各日期的阶段记录。凡标为 2026-04、2026-08 等时间点的“当前”“下一步”，应按历史快照理解，以本次 Git 现场、`.continue-here.md` 与代码为准。
