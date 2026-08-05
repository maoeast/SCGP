# SCGP 用户手册截图执行清单

> 状态：212 项场景已编排、审核并嵌入正式 Word 用户手册。本文件由 `scripts/manual/generate-user-manual-screenshot-runbook.mjs` 生成，请勿手工维护表格。

## 1. 执行基线

- 总场景：212；P0 117，P1 74，P2 21。
- 采集方式：Electron 自动 187，Electron 辅助 24，原生人工 1。
- 安全分级：只读 122，演示写入 64，隔离状态 26。
- 固定视口：1920×1080，DPR 1。
- 每项只允许生成一个同名文件；不得把同一图片复制到多个编号。
- `auto` 使用 Playwright Electron 自动导航与截图；`assisted` 允许人工完成设备、文件选择、长流程或脚本化响应准备，再由 Playwright 截图；`native` 使用 Windows 桌面级截图。
- `demo-write` 只能写入可丢弃演示数据库；`isolated-state` 必须使用独立 `userData`、临时资源和受控状态，禁止触碰当前开发数据、正式更新源或真实安装流程。
- 路由模板中的 `{studentId}`、`{taskId}`、`{...AssessId}` 等变量由对应数据配置加载后解析，不得硬编码正式业务数据。
- 图片写入 `docs/user-manual/screenshots/Sxxx.png`，正文生成时按唯一的 `[图 Sxxx]` 锚点替换，不依赖模糊标题匹配。
- 当前 `capture-user-manual-screenshots.mjs` 只实现 S001、S003、S005、S017、S023、S057、S123、S173、S196、S208 的实际处理器；其余场景需按优先级逐批补齐处理器后再执行。
- 现有 `screenshot-scenes.mjs` 与 `capture-*-screenshots.mjs` 属旧说明书脚本，不得作为本清单的当前执行器。

## 2. 运行命令与产物

```powershell
npm run manual:screenshots:check
npm run manual:screenshots:pilot
node scripts/manual/capture-user-manual-screenshots.mjs --ids S017 --run-id audit-s017
```

- 默认产物位于 `output/manual-screenshot-capture/runs/<run-id>/`，包含截图、隔离 `userData`、临时文件、日志和 `manifest.json`。
- 逐图审核通过后，先写入 `docs/user-manual/screenshot-approvals.json`，再由 `promote-user-manual-screenshots.mjs` 校验 SHA-256 后写入 `docs/user-manual/screenshots/`；Word 生成时使用 `--include-approved-screenshots` 嵌入已批准图片。

## 3. 数据配置

| 配置代码 | 前置条件 |
|---|---|
| `unactivated` | 使用独立 Electron userData 目录；设备保持未激活状态；机器码和激活码仅使用脱敏演示值 |
| `activated-public` | 使用已激活的独立 Electron userData 目录；退出所有账号并清除记住账号状态 |
| `admin-full` | 使用管理员演示账号并启用全部当前可交付能力包；演示数据库包含脱敏学生、计划、训练、报告和资源数据 |
| `teacher-full` | 使用教师演示账号并启用与管理员相同的业务能力包；演示数据库包含脱敏学生、计划、训练、报告和资源数据 |
| `admin-no-ai` | 使用管理员演示账号；所有 AI 智能体均处于停用状态 |
| `admin-no-schedule` | 使用管理员演示账号；当前日期没有生效中的训练计划安排 |
| `students` | 使用已登录的全能力演示账号；至少准备 3 名脱敏学生，覆盖不同性别、诊断标签和班级；其中 1 名学生具备评估、器材和游戏训练记录 |
| `classes` | 使用管理员演示账号；准备当前学年、历史学年、2 个班级、2 名教师和至少 3 名学生；至少保留 1 名未分班学生和 1 条班级变更历史 |
| `assessments` | 使用已登录的全能力演示账号；准备适龄学生、CNBS 超龄学生和 15 项量表的脱敏完成记录；准备 1 条未完成评估进度和可生成推荐的完成记录 |
| `plans` | 使用已登录的全能力演示账号；准备草稿、已启用和评估推荐生成的计划各 1 条；计划中包含游戏与器材资源以及当天训练安排 |
| `emotions` | 使用已登录的全能力演示账号并启用情绪能力包；准备情绪场景、表达关心场景和已有情绪训练记录；场景素材只包含脱敏演示人物和文本 |
| `games` | 使用已登录的全能力演示账号并启用相关游戏能力包；准备经典游戏、注册表游戏、摄像头游戏、麦克风游戏和双人游戏；准备正常完成与 teacher_exit 中断记录 |
| `equipment` | 使用已登录的全能力演示账号；准备已启用器材、训练入口和已有器材训练记录；所有新增或删除操作只作用于可丢弃演示记录 |
| `self-care` | 使用已登录的全能力演示账号并启用生活自理能力包；准备至少 2 个自理任务，其中 1 个包含多步骤与媒体；准备可丢弃的自理训练记录 |
| `records` | 使用已登录的全能力演示账号；至少准备 2 条游戏记录和 2 条器材记录；记录覆盖不同学生、日期、完成状态和训练入口 |
| `reports` | 使用已登录的全能力演示账号；准备评估报告、情绪报告和可删除的演示报告记录；导出目录使用本轮临时目录 |
| `resources` | 使用具备完整资源数据的演示数据库；准备系统预置、自定义、已启用、已禁用和可恢复资源；准备教学材料、收藏项和可导入的临时文件 |
| `ai` | 使用已登录的演示账号；使用脱敏模型配置或本地脚本化响应，不暴露真实 API Key；准备已启用智能体、最近会话、完整历史和可导出的回答 |
| `system` | 使用管理员演示账号；准备管理员、教师、停用账号和可删除演示账号；系统配置只使用脱敏品牌与临时媒体 |
| `backup` | 使用管理员演示账号和独立 userData；准备兼容版本的加密备份文件与可丢弃数据库副本；资源目录包含可识别的演示孤儿文件 |
| `update` | 使用管理员演示账号和独立 userData；通过受控状态注入或测试更新源准备互斥更新状态；禁止执行真实重启安装或覆盖正式版本 |

## 4. 裁切目标

| 目标代码 | 选择器候选 | 含义 |
|---|---|---|
| `window` | 整窗口/桌面 | 完整 Electron 窗口 |
| `shell` | #app | 应用壳层、导航和内容区 |
| `main` | main, .page-container, .main-content | 页面主内容区 |
| `toolbar` | .toolbar, .filter-bar, .page-header | 工具栏及相邻结果区 |
| `card` | .el-card, .resource-card, .student-card, .plan-card | 目标卡片及必要上下文 |
| `dialog` | .el-overlay:has(.el-dialog), .el-dialog | 完整应用内对话框 |
| `drawer` | .el-drawer | 完整抽屉及其标题和操作区 |
| `popover` | .el-popper:not([style*="display: none"]) | 当前展开的菜单或浮层 |
| `form` | form, .el-form | 表单及主要操作按钮 |
| `tabs` | .el-tabs | 标签页标题和当前内容区 |
| `report` | .report-page, .report-container, main | 报告主区域 |
| `report-section` | .report-page section, .report-section, main | 报告指定章节及标题 |
| `immersive` | .immersive-shell, .game-container, .training-container, main | 沉浸式训练主体 |
| `toast` | .el-message, .el-notification | 通知及其页面上下文 |
| `native-dialog` | 整窗口/桌面 | 操作系统或 Electron 原生提示框 |

## 5. 分章执行清单

### 第 1 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S001** | P0 / 待采集 | 管理员首页完整壳层 | `/dashboard` | 管理员 | `admin-full` | 使用管理员账号登录并进入系统首页 | 管理员侧边导航完整；顶部用户区可见；首页内容和 AI 浮动入口可见 | Electron 自动 | 只读 | `shell` | `S001.png` → `[图 S001]` |
| **S002** | P0 / 待采集 | 教师角色过滤后的导航 | `/dashboard` | 教师 | `teacher-full` | 使用教师账号登录并进入系统首页 | 管理员专属入口不可见；教师可用业务入口和首页内容可见 | Electron 自动 | 只读 | `shell` | `S002.png` → `[图 S002]` |

### 第 2 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S003** | P0 / 待采集 | 软件激活初始页 | `/activation` | 管理员或实施人员 | `unactivated` | 启动未激活实例并停留在激活初始页 | 机器码区域、复制按钮、激活码输入框和验证按钮完整可见 | Electron 自动 | 隔离状态 | `main` | `S003.png` → `[图 S003]` |
| **S004** | P2 / 待采集 | 激活码校验失败 | `/activation` | 管理员或实施人员 | `unactivated` | 输入无效演示激活码并点击验证 | 校验失败提示可见；真实机器码和激活码均未暴露 | Electron 自动 | 隔离状态 | `dialog` | `S004.png` → `[图 S004]` |
| **S005** | P0 / 待采集 | 登录页正常状态 | `/login` | 未登录用户 | `activated-public` | 启动已激活实例并退出登录 | 品牌区、用户名、密码、记住账号和登录按钮可见 | Electron 自动 | 只读 | `window` | `S005.png` → `[图 S005]` |
| **S006** | P1 / 待采集 | 登录凭据错误提示 | `/login` | 未登录用户 | `activated-public` | 输入错误演示凭据并提交登录 | 登录错误提示与用户名密码输入区同时可见 | Electron 自动 | 只读 | `main` | `S006.png` → `[图 S006]` |
| **S007** | P0 / 待采集 | 用户菜单完整入口 | `/dashboard` | 教师或管理员 | `admin-full` | 点击顶部用户区域展开菜单 | 个人资料、AI 聊天记录和退出登录入口完整可见 | Electron 自动 | 只读 | `popover` | `S007.png` → `[图 S007]` |

### 第 3 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S008** | P0 / 待采集 | 有数据的首页概览 | `/dashboard` | 教师或管理员 | `admin-full` | 进入包含完整演示数据的首页并等待加载完成 | 评估焦点、数据指标和已启用 AI 智能体卡片可见 | Electron 自动 | 只读 | `main` | `S008.png` → `[图 S008]` |
| **S009** | P0 / 待采集 | 今日工作与资源启动 | `/dashboard` | 教师或管理员 | `plans` | 进入首页并定位今日工作区域 | 当天计划、训练资源名称和启动入口可见 | Electron 自动 | 只读 | `main` | `S009.png` → `[图 S009]` |
| **S010** | P1 / 待采集 | 无可用 AI 智能体空状态 | `/dashboard` | 教师或管理员 | `admin-no-ai` | 进入首页并定位 AI 智能体区域 | 无可用 AI 智能体空状态可见；页面无错误状态 | Electron 自动 | 隔离状态 | `card` | `S010.png` → `[图 S010]` |
| **S011** | P1 / 待采集 | 无今日训练安排空状态 | `/dashboard` | 教师或管理员 | `admin-no-schedule` | 进入首页并定位今日工作区域 | 无当天训练安排空状态可见；其他首页区域正常 | Electron 自动 | 隔离状态 | `card` | `S011.png` → `[图 S011]` |
| **S012** | P0 / 待采集 | 个人资料与头像 | `/profile` | 教师或管理员 | `admin-full` | 从用户菜单进入个人资料页 | 基本资料、预设头像、上传和拍照入口可见 | Electron 自动 | 只读 | `main` | `S012.png` → `[图 S012]` |
| **S013** | P1 / 待采集 | 最近登录日志 | `/profile` | 教师或管理员 | `admin-full` | 滚动到最近登录日志区域 | 日志字段和脱敏记录可见；最多展示范围说明可辨识 | Electron 自动 | 只读 | `main` | `S013.png` → `[图 S013]` |
| **S014** | P0 / 待采集 | 修改密码 | `/profile` | 教师或管理员 | `admin-full` | 滚动到修改密码区域 | 旧密码、新密码、确认密码、规则和保存按钮可见 | Electron 自动 | 只读 | `form` | `S014.png` → `[图 S014]` |

### 第 4 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S015** | P0 / 待采集 | 学生管理卡片列表 | `/students` | 教师或管理员 | `students` | 进入学生管理并等待卡片加载 | 统计、筛选工具栏、至少 3 张学生卡片和主要操作可见 | Electron 自动 | 只读 | `main` | `S015.png` → `[图 S015]` |
| **S016** | P1 / 待采集 | 学生筛选结果 | `/students` | 教师或管理员 | `students` | 输入演示关键词并组合性别、诊断和班级筛选 | 筛选条件与匹配结果同时可见 | Electron 自动 | 只读 | `toolbar` | `S016.png` → `[图 S016]` |
| **S017** | P0 / 待采集 | 学生详情基本信息 | `/students/{studentId}` | 教师或管理员 | `students` | 打开具备完整记录的演示学生详情 | 基本信息和脱敏学生标识可见 | Electron 自动 | 只读 | `main` | `S017.png` → `[图 S017]` |
| **S018** | P1 / 待采集 | 学生详情记录标签 | `/students/{studentId}` | 教师或管理员 | `students` | 定位学生详情记录标签区域 | 评估记录、器材训练和游戏训练标签及数量可见 | Electron 自动 | 只读 | `tabs` | `S018.png` → `[图 S018]` |
| **S019** | P0 / 待采集 | 新增学生主要字段 | `/students` | 教师或管理员 | `students` | 点击新增学生并保持在表单上半部 | 姓名、学号、性别、出生日期等主要字段可见 | Electron 自动 | 演示写入 | `form` | `S019.png` → `[图 S019]` |
| **S020** | P1 / 待采集 | 学生头像选择器 | `/students` | 教师或管理员 | `students` | 在新增学生表单中展开头像选择区域 | 预设头像、上传图片和拍照入口可见 | Electron 自动 | 演示写入 | `form` | `S020.png` → `[图 S020]` |
| **S021** | P1 / 待采集 | 新增学生补充字段 | `/students` | 教师或管理员 | `students` | 滚动新增学生表单到下半部 | 诊断类型、所属班级、头像和保存按钮可见 | Electron 自动 | 演示写入 | `form` | `S021.png` → `[图 S021]` |
| **S022** | P0 / 待采集 | 编辑学生 | `/students` | 教师或管理员 | `students` | 从学生卡片进入编辑并等待资料回填 | 已有资料、头像和保存入口完整可见 | Electron 自动 | 演示写入 | `form` | `S022.png` → `[图 S022]` |
| **S023** | P2 / 待采集 | 删除学生确认 | `/students` | 教师或管理员 | `students` | 对可删除演示学生触发删除操作 | 学生标识、风险说明、取消和确认按钮可见 | Electron 自动 | 隔离状态 | `dialog` | `S023.png` → `[图 S023]` |
| **S024** | P2 / 待采集 | 批量导入占位界面 | `/students` | 教师或管理员 | `students` | 点击批量导入并停留在占位界面 | 模板下载和文件选择可见；不得呈现导入成功状态 | Electron 自动 | 只读 | `dialog` | `S024.png` → `[图 S024]` |

### 第 5 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S025** | P0 / 待采集 | 班级与学年列表 | `/class-management` | 管理员 | `classes` | 进入班级管理 | 学年筛选、班级列表和管理操作可见 | Electron 自动 | 只读 | `main` | `S025.png` → `[图 S025]` |
| **S026** | P0 / 待采集 | 新建班级表单 | `/class-management` | 管理员 | `classes` | 点击新建班级 | 班级名称、年级、学年、教师等创建字段可见 | Electron 自动 | 演示写入 | `dialog` | `S026.png` → `[图 S026]` |
| **S027** | P0 / 待采集 | 批量创建班级表单 | `/class-management` | 管理员 | `classes` | 点击批量创建班级 | 批量创建规则、数量或命名字段和确认操作可见 | Electron 自动 | 演示写入 | `dialog` | `S027.png` → `[图 S027]` |
| **S028** | P1 / 待采集 | 编辑班级回填表单 | `/class-management` | 管理员 | `classes` | 对演示班级点击编辑 | 班级资料已回填且保存入口可见 | Electron 自动 | 演示写入 | `dialog` | `S028.png` → `[图 S028]` |
| **S029** | P2 / 待采集 | 删除班级确认 | `/class-management` | 管理员 | `classes` | 对可删除演示班级触发删除 | 班级名称、风险说明、取消和确认按钮可见 | Electron 自动 | 隔离状态 | `dialog` | `S029.png` → `[图 S029]` |
| **S030** | P1 / 待采集 | 学年管理列表 | `/class-management` | 管理员 | `classes` | 打开学年管理 | 当前与历史学年列表及管理入口可见 | Electron 自动 | 只读 | `dialog` | `S030.png` → `[图 S030]` |
| **S031** | P1 / 待采集 | 新增或编辑学年 | `/class-management` | 管理员 | `classes` | 在学年管理中点击新增或编辑 | 学年名称、日期或状态字段及保存按钮可见 | Electron 自动 | 演示写入 | `dialog` | `S031.png` → `[图 S031]` |
| **S032** | P2 / 待采集 | 班级学生列表过渡态 | `/class-management` | 管理员 | `classes` | 打开班级学生列表 | 学生列表和当前可见入口完整；图注标明分班操作需前往分班管理 | Electron 自动 | 只读 | `main` | `S032.png` → `[图 S032]` |
| **S033** | P0 / 待采集 | 班级教师分配 | `/class-management` | 管理员 | `classes` | 打开班级教师分配并选择教师 | 教师候选区、已选教师和保存操作可见 | Electron 自动 | 演示写入 | `dialog` | `S033.png` → `[图 S033]` |
| **S034** | P0 / 待采集 | 分班管理筛选 | `/student-class-assignment` | 管理员 | `classes` | 进入分班管理标签并设置学年或状态筛选 | 筛选条件、未分班学生和班级信息可见 | Electron 自动 | 只读 | `toolbar` | `S034.png` → `[图 S034]` |
| **S035** | P0 / 待采集 | 单个学生分班或调班 | `/student-class-assignment` | 管理员 | `classes` | 选择单个演示学生并点击分班或调班 | 学生、目标班级和确认操作可见 | Electron 自动 | 演示写入 | `dialog` | `S035.png` → `[图 S035]` |
| **S036** | P0 / 待采集 | 批量学生分班 | `/student-class-assignment` | 管理员 | `classes` | 勾选多个演示学生并点击批量分班 | 已选数量、目标班级和批量确认操作可见 | Electron 自动 | 演示写入 | `dialog` | `S036.png` → `[图 S036]` |
| **S037** | P1 / 待采集 | 班级视图 | `/student-class-assignment` | 管理员 | `classes` | 切换到班级视图 | 班级分组、人数和学生列表可见 | Electron 自动 | 只读 | `tabs` | `S037.png` → `[图 S037]` |
| **S038** | P1 / 待采集 | 学年升级与毕业规则 | `/student-class-assignment` | 管理员 | `classes` | 打开学年升级或毕业操作 | 升级目标、毕业规则、影响范围和取消操作可见 | Electron 自动 | 隔离状态 | `dialog` | `S038.png` → `[图 S038]` |
| **S039** | P1 / 待采集 | 班级变更历史 | `/student-class-assignment` | 管理员 | `classes` | 打开班级变更历史 | 学生、原班级、新班级、时间等历史字段可见 | Electron 自动 | 只读 | `dialog` | `S039.png` → `[图 S039]` |

### 第 6 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S040** | P0 / 待采集 | 评估分类与量表卡片 | `/assessment` | 教师或管理员 | `assessments` | 进入能力评估目录 | 分类标签和当前授权量表卡片可见 | Electron 自动 | 只读 | `main` | `S040.png` → `[图 S040]` |
| **S041** | P1 / 待采集 | 分类过滤后的量表 | `/assessment` | 教师或管理员 | `assessments` | 点击一个评估分类 | 选中分类和过滤后的量表卡片同时可见 | Electron 自动 | 只读 | `main` | `S041.png` → `[图 S041]` |
| **S042** | P0 / 待采集 | 评估学生选择 | `/assessment/select-student?scale=sm` | 教师或管理员 | `assessments` | 从 S-M 量表点击开始评估 | 学生选择列表、年龄信息和开始入口可见 | Electron 自动 | 只读 | `main` | `S042.png` → `[图 S042]` |
| **S043** | P2 / 待采集 | CNBS 超龄阻断提示 | `/assessment/select-student?scale=cnbsr2016` | 教师或管理员 | `assessments` | 选择 CNBS 超龄演示学生并尝试开始 | 超龄阻断提示与对应学生项同时可见 | Electron 自动 | 只读 | `toast` | `S043.png` → `[图 S043]` |
| **S044** | P0 / 待采集 | 量表欢迎说明 | `/assessment/unified/sm/{studentId}` | 教师或管理员 | `assessments` | 为适龄学生打开 S-M 评估 | 量表名称、学生信息、欢迎说明和开始按钮可见 | Electron 自动 | 只读 | `main` | `S044.png` → `[图 S044]` |
| **S045** | P0 / 待采集 | 标准问卷答题 | `/assessment/unified/sm/{studentId}` | 教师或管理员 | `assessments` | 开始 S-M 并进入一项标准问卷题 | 题目、选项、进度和导航操作可见 | Electron 自动 | 演示写入 | `form` | `S045.png` → `[图 S045]` |
| **S046** | P0 / 待采集 | CNBS 操作项目评分 | `/assessment/unified/cnbsr2016/{studentId}` | 教师或管理员 | `assessments` | 开始 CNBS 并进入操作项目 | 项目说明和当前评分控件可见 | Electron 自动 | 演示写入 | `form` | `S046.png` → `[图 S046]` |
| **S047** | P0 / 待采集 | TGMD-3 动作项目评分 | `/assessment/unified/tgmd_3/{studentId}` | 教师或管理员 | `assessments` | 开始 TGMD-3 并进入动作项目 | 动作标准、试次和评分控件可见 | Electron 自动 | 演示写入 | `form` | `S047.png` → `[图 S047]` |
| **S048** | P0 / 待采集 | CRT 图形推理题 | `/assessment/unified/crt/{studentId}` | 教师或管理员 | `assessments` | 开始 CRT 并进入图形题 | 图形题干、选项、进度和选择状态可见 | Electron 自动 | 演示写入 | `form` | `S048.png` → `[图 S048]` |
| **S049** | P0 / 待采集 | 综合认知自测图形题 | `/assessment/unified/cognitive_self/{studentId}` | 教师或管理员 | `assessments` | 开始综合认知自测并进入图形题 | 图形、选项和 DRAFT 标识可见 | Electron 自动 | 演示写入 | `form` | `S049.png` → `[图 S049]` |
| **S050** | P2 / 待采集 | CBCL 社会能力必填校验 | `/assessment/unified/cbcl/{studentId}` | 教师或管理员 | `assessments` | 前进到 CBCL 社会能力必填项并留空提交 | 必填校验、字段和题目上下文可见 | Electron 自动 | 演示写入 | `form` | `S050.png` → `[图 S050]` |
| **S051** | P0 / 待采集 | 继续评估或重新开始 | `/assessment/unified/sm/{studentId}` | 教师或管理员 | `assessments` | 打开已有未完成进度的同一评估 | 继续评估和重新开始两个选择可见 | Electron 自动 | 演示写入 | `dialog` | `S051.png` → `[图 S051]` |
| **S052** | P0 / 待采集 | 评估完成窗口 | `/assessment/unified/sm/{studentId}` | 教师或管理员 | `assessments` | 在演示评估中完成最后一题并提交 | 评估完成标题、后续操作和关闭入口可见 | Electron 辅助 | 演示写入 | `dialog` | `S052.png` → `[图 S052]` |
| **S053** | P0 / 待采集 | 推荐抽屉与计划草稿按钮 | `/assessment/unified/sm/{studentId}` | 教师或管理员 | `assessments` | 完成评估后打开推荐抽屉 | 推荐内容和生成计划草稿按钮可见 | Electron 辅助 | 演示写入 | `drawer` | `S053.png` → `[图 S053]` |
| **S054** | P0 / 待采集 | 推荐生成的计划草稿 | `/training-plan` | 教师或管理员 | `assessments` | 从推荐抽屉生成草稿后手动进入训练计划 | 新生成的草稿计划、来源标识和草稿状态可见 | Electron 辅助 | 演示写入 | `card` | `S054.png` → `[图 S054]` |
| **S055** | P1 / 待采集 | 学生详情评估记录入口 | `/students/{studentId}` | 教师或管理员 | `assessments` | 进入学生详情并打开评估记录标签 | 评估记录列表和查看报告入口可见 | Electron 自动 | 只读 | `tabs` | `S055.png` → `[图 S055]` |
| **S056** | P1 / 待采集 | S-M 报告总览 | `/assessment/sm/report?assessId={smAssessId}&studentId={studentId}` | 教师或管理员 | `assessments` | 打开 S-M 演示报告并停留在上部 | 总分、等级和结果解释可见 | Electron 自动 | 只读 | `report` | `S056.png` → `[图 S056]` |
| **S057** | P1 / 待采集 | S-M 报告维度分析 | `/assessment/sm/report?assessId={smAssessId}&studentId={studentId}` | 教师或管理员 | `assessments` | 滚动 S-M 报告到维度分析 | 雷达图和维度表完整可见 | Electron 自动 | 只读 | `report-section` | `S057.png` → `[图 S057]` |
| **S058** | P1 / 待采集 | WeeFIM 报告总览 | `/assessment/weefim/report?assessId={weefimAssessId}&studentId={studentId}` | 教师或管理员 | `assessments` | 打开 WeeFIM 演示报告并停留在上部 | 总分和独立性等级可见 | Electron 自动 | 只读 | `report` | `S058.png` → `[图 S058]` |
| **S059** | P1 / 待采集 | WeeFIM 报告领域明细 | `/assessment/weefim/report?assessId={weefimAssessId}&studentId={studentId}` | 教师或管理员 | `assessments` | 滚动到 WeeFIM 领域明细 | 领域标题、得分和解释可见 | Electron 自动 | 只读 | `report-section` | `S059.png` → `[图 S059]` |
| **S060** | P1 / 待采集 | CSIRS 报告总览 | `/assessment/csirs/report/{csirsAssessId}` | 教师或管理员 | `assessments` | 打开 CSIRS 演示报告并停留在上部 | 总体结果和核心摘要可见 | Electron 自动 | 只读 | `report` | `S060.png` → `[图 S060]` |
| **S061** | P1 / 待采集 | CSIRS 报告维度分析 | `/assessment/csirs/report/{csirsAssessId}` | 教师或管理员 | `assessments` | 滚动到 CSIRS 维度分析 | 雷达图和维度详情可见 | Electron 自动 | 只读 | `report-section` | `S061.png` → `[图 S061]` |
| **S062** | P1 / 待采集 | Conners PSQ 报告总览 | `/assessment/conners-psq/report/{connersPsqAssessId}` | 教师或管理员 | `assessments` | 打开 Conners PSQ 报告上部 | 质量检查和总体结果可见 | Electron 自动 | 只读 | `report` | `S062.png` → `[图 S062]` |
| **S063** | P1 / 待采集 | Conners PSQ 因子详情 | `/assessment/conners-psq/report/{connersPsqAssessId}` | 教师或管理员 | `assessments` | 滚动到 Conners PSQ 因子区 | 雷达图和因子详情可见 | Electron 自动 | 只读 | `report-section` | `S063.png` → `[图 S063]` |
| **S064** | P1 / 待采集 | Conners TRS 报告总览 | `/assessment/conners-trs/report/{connersTrsAssessId}` | 教师或管理员 | `assessments` | 打开 Conners TRS 报告上部 | 质量检查和总体结果可见 | Electron 自动 | 只读 | `report` | `S064.png` → `[图 S064]` |
| **S065** | P1 / 待采集 | Conners TRS 因子详情 | `/assessment/conners-trs/report/{connersTrsAssessId}` | 教师或管理员 | `assessments` | 滚动到 Conners TRS 因子区 | 雷达图和因子详情可见 | Electron 自动 | 只读 | `report-section` | `S065.png` → `[图 S065]` |
| **S066** | P1 / 待采集 | SDQ 报告总览 | `/assessment/sdq/report/{sdqAssessId}` | 教师或管理员 | `assessments` | 打开 SDQ 报告上部 | 困难总分和亲社会结果可见 | Electron 自动 | 只读 | `report` | `S066.png` → `[图 S066]` |
| **S067** | P1 / 待采集 | SDQ 分量表详情 | `/assessment/sdq/report/{sdqAssessId}` | 教师或管理员 | `assessments` | 滚动到 SDQ 分量表区域 | 各分量表得分和解释可见 | Electron 自动 | 只读 | `report-section` | `S067.png` → `[图 S067]` |
| **S068** | P1 / 待采集 | SRS-2 报告总览 | `/assessment/srs2/report/{srs2AssessId}` | 教师或管理员 | `assessments` | 打开 SRS-2 报告上部 | 总分和总体解释可见 | Electron 自动 | 只读 | `report` | `S068.png` → `[图 S068]` |
| **S069** | P1 / 待采集 | SRS-2 维度与免责声明 | `/assessment/srs2/report/{srs2AssessId}` | 教师或管理员 | `assessments` | 滚动到 SRS-2 维度与限制说明 | 维度表和免责声明可见 | Electron 自动 | 只读 | `report-section` | `S069.png` → `[图 S069]` |
| **S070** | P1 / 待采集 | CBCL 社会能力与免责声明 | `/assessment/cbcl/report/{cbclAssessId}` | 教师或管理员 | `assessments` | 打开 CBCL 报告上部 | 社会能力结果和免责声明可见 | Electron 自动 | 只读 | `report` | `S070.png` → `[图 S070]` |
| **S071** | P1 / 待采集 | CBCL 行为剖面与因子 | `/assessment/cbcl/report/{cbclAssessId}` | 教师或管理员 | `assessments` | 滚动到 CBCL 行为剖面 | 图表和因子表可见 | Electron 自动 | 只读 | `report-section` | `S071.png` → `[图 S071]` |
| **S072** | P1 / 待采集 | 儿心量表Ⅱ总体结果 | `/assessment/cnbsr2016/report/{cnbsAssessId}` | 教师或管理员 | `assessments` | 打开儿心量表Ⅱ报告上部 | CA、MA、DQ 和提示可见 | Electron 自动 | 只读 | `report` | `S072.png` → `[图 S072]` |
| **S073** | P1 / 待采集 | 儿心量表Ⅱ五能区结果 | `/assessment/cnbsr2016/report/{cnbsAssessId}` | 教师或管理员 | `assessments` | 滚动到儿心量表Ⅱ五能区 | 五能区结果及分数可见 | Electron 自动 | 只读 | `report-section` | `S073.png` → `[图 S073]` |
| **S074** | P1 / 待采集 | TGMD-3 总体结果 | `/assessment/tgmd_3/report/{tgmdAssessId}` | 教师或管理员 | `assessments` | 打开 TGMD-3 报告上部 | 总体结果和分测验结果可见 | Electron 自动 | 只读 | `report` | `S074.png` → `[图 S074]` |
| **S075** | P1 / 待采集 | TGMD-3 技能结果 | `/assessment/tgmd_3/report/{tgmdAssessId}` | 教师或管理员 | `assessments` | 滚动到 TGMD-3 技能结果 | 13 项技能区和得分可见 | Electron 自动 | 只读 | `report-section` | `S075.png` → `[图 S075]` |
| **S076** | P1 / 待采集 | GMFM-88 总体结果 | `/assessment/gmfm_88/report/{gmfmAssessId}` | 教师或管理员 | `assessments` | 打开 GMFM-88 报告上部 | 总体结果和摘要可见 | Electron 自动 | 只读 | `report` | `S076.png` → `[图 S076]` |
| **S077** | P1 / 待采集 | GMFM-88 能区结果 | `/assessment/gmfm_88/report/{gmfmAssessId}` | 教师或管理员 | `assessments` | 滚动到 GMFM-88 能区结果 | 五大能区结果可见 | Electron 自动 | 只读 | `report-section` | `S077.png` → `[图 S077]` |
| **S078** | P1 / 待采集 | FMDA 总体与领域雷达 | `/assessment/fine_motor/report/{fmdaAssessId}` | 教师或管理员 | `assessments` | 打开 FMDA 报告上部 | 总体结果和领域雷达图可见 | Electron 自动 | 只读 | `report` | `S078.png` → `[图 S078]` |
| **S079** | P1 / 待采集 | FMDA 领域解读与 IEP 目标 | `/assessment/fine_motor/report/{fmdaAssessId}` | 教师或管理员 | `assessments` | 滚动到 FMDA 领域解读 | 领域说明和 IEP 目标可见 | Electron 自动 | 只读 | `report-section` | `S079.png` → `[图 S079]` |
| **S080** | P2 / 待采集 | BRIEF DRAFT 报告 | `/assessment/brief/report/{briefAssessId}` | 教师或管理员 | `assessments` | 打开 BRIEF 报告 | 结果主体和 DRAFT 提示可见 | Electron 自动 | 只读 | `report` | `S080.png` → `[图 S080]` |
| **S081** | P2 / 待采集 | CRT 结果与分组情况 | `/assessment/crt/report/{crtAssessId}` | 教师或管理员 | `assessments` | 打开 CRT 报告上部 | 结果和分组情况可见 | Electron 自动 | 只读 | `report` | `S081.png` → `[图 S081]` |
| **S082** | P2 / 待采集 | CRT 筛查免责声明 | `/assessment/crt/report/{crtAssessId}` | 教师或管理员 | `assessments` | 滚动到 CRT 限制说明 | 筛查定位和免责声明可见 | Electron 自动 | 只读 | `report-section` | `S082.png` → `[图 S082]` |
| **S083** | P2 / 待采集 | 综合认知自测 DRAFT | `/assessment/cognitive-self/report/{cognitiveAssessId}` | 教师或管理员 | `assessments` | 打开综合认知自测报告 | 结果主体和 DRAFT 提示可见 | Electron 自动 | 只读 | `report` | `S083.png` → `[图 S083]` |

### 第 7 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S084** | P0 / 待采集 | 训练计划卡片列表 | `/training-plan` | 教师或管理员 | `plans` | 进入训练计划页 | 统计、筛选工具栏和计划卡片可见；不存在表格视图 | Electron 自动 | 只读 | `main` | `S084.png` → `[图 S084]` |
| **S085** | P1 / 待采集 | 计划筛选结果 | `/training-plan` | 教师或管理员 | `plans` | 组合状态、能力入口、学生和计划名称筛选 | 筛选条件与匹配计划卡片可见 | Electron 自动 | 只读 | `toolbar` | `S085.png` → `[图 S085]` |
| **S086** | P0 / 待采集 | 计划基本信息 | `/training-plan` | 教师或管理员 | `plans` | 点击新建计划并停留在基本信息标签 | 名称、学生、能力入口和日期字段可见 | Electron 自动 | 演示写入 | `form` | `S086.png` → `[图 S086]` |
| **S087** | P0 / 待采集 | 长短期训练目标 | `/training-plan` | 教师或管理员 | `plans` | 在计划编辑器切换到训练目标 | 长期目标和短期目标输入区可见 | Electron 自动 | 演示写入 | `tabs` | `S087.png` → `[图 S087]` |
| **S088** | P0 / 待采集 | 训练资源选择器 | `/training-plan` | 教师或管理员 | `plans` | 在资源编排步骤点击选择训练资源 | 模块、类型、关键词和多选结果可见 | Electron 自动 | 演示写入 | `dialog` | `S088.png` → `[图 S088]` |
| **S089** | P0 / 待采集 | 已选资源参数编排 | `/training-plan` | 教师或管理员 | `plans` | 选择至少两项资源并返回资源编排标签 | 已选资源、频次、时长和教学提示可见 | Electron 自动 | 演示写入 | `tabs` | `S089.png` → `[图 S089]` |
| **S090** | P0 / 待采集 | 计划草稿详情 | `/training-plan` | 教师或管理员 | `plans` | 打开草稿计划详情 | 草稿详情完整可见；抽屉内不出现编辑按钮 | Electron 自动 | 只读 | `drawer` | `S090.png` → `[图 S090]` |
| **S091** | P1 / 待采集 | 计划卡片编辑入口 | `/training-plan` | 教师或管理员 | `plans` | 展开草稿计划卡片操作菜单 | 编辑入口和相邻可用操作可见 | Electron 自动 | 只读 | `popover` | `S091.png` → `[图 S091]` |
| **S092** | P0 / 待采集 | 启用计划 | `/training-plan` | 教师或管理员 | `plans` | 对草稿计划点击启用 | 计划名称、启用确认或启用操作可见 | Electron 自动 | 演示写入 | `dialog` | `S092.png` → `[图 S092]` |
| **S093** | P0 / 待采集 | 今日训练资源启动 | `/training-plan` | 教师或管理员 | `plans` | 定位执行中且当天有效的计划卡片 | 今日训练推荐和资源启动入口可见 | Electron 自动 | 只读 | `card` | `S093.png` → `[图 S093]` |

### 第 8 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S094** | P0 / 待采集 | 情绪训练方向 | `/emotional/menu` | 教师或管理员 | `emotions` | 进入情绪行为首页 | 情绪与场景和表达关心两个方向卡片可见 | Electron 自动 | 只读 | `main` | `S094.png` → `[图 S094]` |
| **S095** | P0 / 待采集 | 情绪训练学生选择 | `/emotional/emotion-scene/select` | 教师或管理员 | `emotions` | 从情绪与场景方向开始且不预选学生 | 带训练方向的学生选择状态可见 | Electron 自动 | 只读 | `main` | `S095.png` → `[图 S095]` |
| **S096** | P0 / 待采集 | 情绪场景筛选 | `/emotional/emotion-scene/select?studentId={studentId}` | 教师或管理员 | `emotions` | 选择学生后设置年龄、空间和主题筛选 | 三类筛选条件和结果数量可见 | Electron 自动 | 只读 | `toolbar` | `S096.png` → `[图 S096]` |
| **S097** | P0 / 待采集 | 表达关心筛选 | `/emotional/care-expression/select?studentId={studentId}` | 教师或管理员 | `emotions` | 选择学生后设置年龄、情绪和关心方式筛选 | 三类筛选条件和结果数量可见 | Electron 自动 | 只读 | `toolbar` | `S097.png` → `[图 S097]` |
| **S098** | P0 / 待采集 | 筛选后的情境卡片 | `/emotional/emotion-scene/select?studentId={studentId}` | 教师或管理员 | `emotions` | 应用筛选并定位一张可用情境卡片 | 场景缩略图、标题、标签和开始入口可见 | Electron 自动 | 只读 | `main` | `S098.png` → `[图 S098]` |
| **S099** | P0 / 待采集 | 沉浸式训练主画面 | `/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}` | 教师或管理员 | `emotions` | 启动演示情境并进入首个问题 | 场景画面、问题和作答区域可见 | Electron 辅助 | 演示写入 | `immersive` | `S099.png` → `[图 S099]` |
| **S100** | P1 / 待采集 | 荧光笔圈画模式 | `/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}` | 教师或管理员 | `emotions` | 在训练中开启荧光笔并完成一处圈画 | 圈画工具、当前模式和画面标记可见 | Electron 辅助 | 演示写入 | `immersive` | `S100.png` → `[图 S100]` |
| **S101** | P1 / 待采集 | 教师干预控制台 | `/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}` | 教师或管理员 | `emotions` | 在训练中打开教师干预控制台 | 当前提示、流程控制和关闭入口可见 | Electron 辅助 | 演示写入 | `drawer` | `S101.png` → `[图 S101]` |
| **S102** | P0 / 待采集 | 情绪训练结果页 | `/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}` | 教师或管理员 | `emotions` | 通过教师控制台强制结算演示情绪训练 | 星级、记录状态、返回和再练一次入口可见 | Electron 辅助 | 演示写入 | `immersive` | `S102.png` → `[图 S102]` |
| **S103** | P0 / 待采集 | 情绪报告摘要与趋势 | `/emotional/report?studentId={studentId}` | 教师或管理员 | `emotions` | 打开有记录学生的情绪报告上部 | 摘要、正确率趋势和 Word 导出入口可见 | Electron 自动 | 只读 | `report` | `S103.png` → `[图 S103]` |
| **S104** | P1 / 待采集 | 情绪报告偏好与建议 | `/emotional/report?studentId={studentId}` | 教师或管理员 | `emotions` | 滚动情绪报告到下部 | 偏好、场景掌握和干预建议可见 | Electron 自动 | 只读 | `report-section` | `S104.png` → `[图 S104]` |

### 第 9 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S105** | P0 / 待采集 | 游戏能力入口 | `/games/menu` | 教师或管理员 | `games` | 进入游戏训练 | 授权过滤后的能力入口卡片可见 | Electron 自动 | 只读 | `main` | `S105.png` → `[图 S105]` |
| **S106** | P0 / 待采集 | 游戏学生选择 | `/games/select-student?entryCode=sensory-integration` | 教师或管理员 | `games` | 选择感官统合游戏入口 | 学生列表、所选能力入口和继续操作可见 | Electron 自动 | 只读 | `main` | `S106.png` → `[图 S106]` |
| **S107** | P0 / 待采集 | 游戏大厅 | `/games/lobby/{studentId}?entry=sensory-integration` | 教师或管理员 | `games` | 选择学生并进入游戏大厅 | 可用游戏卡片、分类和开始入口可见 | Electron 自动 | 只读 | `main` | `S107.png` → `[图 S107]` |
| **S108** | P0 / 待采集 | 经典感官游戏参数 | `/games/lobby/{studentId}?entry=sensory-integration` | 教师或管理员 | `games` | 打开一项经典感官游戏 | 经典游戏的网格、时长和轮次设置可见 | Electron 自动 | 只读 | `main` | `S108.png` → `[图 S108]` |
| **S109** | P0 / 待采集 | 注册表游戏难度设置 | `/games/lobby/{studentId}?entry=cognitive` | 教师或管理员 | `games` | 打开一项注册表认知游戏 | 注册表游戏的难度设置和开始按钮可见 | Electron 自动 | 只读 | `main` | `S109.png` → `[图 S109]` |
| **S110** | P0 / 待采集 | 摄像头权限阻断 | `/emotional/games/energy-ball?studentId={studentId}` | 教师或管理员 | `games` | 在隔离环境拒绝摄像头权限并重新进入游戏 | 权限阻断卡、系统设置入口和重新检测可见；无摄像头预览 | Electron 辅助 | 隔离状态 | `main` | `S110.png` → `[图 S110]` |
| **S111** | P0 / 待采集 | 麦克风权限阻断 | `/emotional/games/forest?studentId={studentId}` | 教师或管理员 | `games` | 在隔离环境拒绝麦克风权限并重新进入游戏 | 权限阻断卡和重新检测可见；无音量检测器 | Electron 辅助 | 隔离状态 | `main` | `S111.png` → `[图 S111]` |
| **S112** | P1 / 待采集 | 双人学生确认 | `/emotional/games/burger?studentId={studentId}` | 教师或管理员 | `games` | 启动双人游戏并停留在参与者确认 | 两名学生信息和参与设置可见 | Electron 辅助 | 演示写入 | `main` | `S112.png` → `[图 S112]` |
| **S113** | P0 / 待采集 | 游戏运行画面 | `/emotional/games/pattern-next?studentId={studentId}` | 教师或管理员 | `games` | 开始一项代表性游戏并进入运行状态 | 游戏主体完整可见；无关导航隐藏 | Electron 辅助 | 演示写入 | `immersive` | `S113.png` → `[图 S113]` |
| **S114** | P1 / 待采集 | 游戏正常完成结果 | `/emotional/games/pattern-next?studentId={studentId}` | 教师或管理员 | `games` | 正常完成代表性游戏 | 完成状态、成绩摘要和后续操作可见 | Electron 辅助 | 演示写入 | `main` | `S114.png` → `[图 S114]` |
| **S115** | P2 / 待采集 | 教师结束确认 | `/emotional/games/pattern-next?studentId={studentId}` | 教师或管理员 | `games` | 游戏运行中点击教师结束本局 | 中断风险说明、取消和确认按钮可见 | Electron 辅助 | 隔离状态 | `dialog` | `S115.png` → `[图 S115]` |
| **S116** | P1 / 待采集 | 训练记录已中断状态 | `/training-records/cognitive?type=game` | 教师或管理员 | `games` | 打开训练记录并筛选 teacher_exit 演示记录 | 已中断状态和对应记录行可见；无伪造中断结果页 | Electron 自动 | 只读 | `main` | `S116.png` → `[图 S116]` |
| **S117** | P0 / 待采集 | 自定义小游戏记录详情 | `/emotional/game-record?recordId={gameRecordId}` | 教师或管理员 | `games` | 打开一条自定义小游戏记录 | 学生、游戏、时长、状态和特定指标可见 | Electron 自动 | 只读 | `main` | `S117.png` → `[图 S117]` |
| **S118** | P0 / 待采集 | 游戏 IEP 报告 | `/games/report?studentId={studentId}&recordId={gameRecordId}` | 教师或管理员 | `games` | 打开符合条件的游戏 IEP 报告 | 报告内容和当前实际导出入口可见 | Electron 自动 | 只读 | `report` | `S118.png` → `[图 S118]` |

### 第 10 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S119** | P0 / 待采集 | 器材训练入口菜单 | `/equipment/menu` | 教师或管理员 | `equipment` | 进入器材训练 | 授权允许的能力入口卡片可见 | Electron 自动 | 只读 | `main` | `S119.png` → `[图 S119]` |
| **S120** | P0 / 待采集 | 器材训练学生选择 | `/equipment/select-student?entry=sensory-integration` | 教师或管理员 | `equipment` | 选择一个器材训练入口 | 学生列表和所选入口信息可见 | Electron 自动 | 只读 | `main` | `S120.png` → `[图 S120]` |
| **S121** | P0 / 待采集 | 器材列表与说明 | `/equipment/quick-entry/{studentId}?entry=sensory-integration` | 教师或管理员 | `equipment` | 进入器材快速录入并打开资源选择 | 按入口过滤的器材列表、封面、说明和标签可见 | Electron 自动 | 只读 | `main` | `S121.png` → `[图 S121]` |
| **S122** | P0 / 待采集 | 器材快速录入 | `/equipment/quick-entry/{studentId}?entry=sensory-integration` | 教师或管理员 | `equipment` | 选定器材并填写评分表单 | 评分、辅助等级、时长和备注可见；无日期输入框 | Electron 自动 | 演示写入 | `form` | `S122.png` → `[图 S122]` |
| **S123** | P0 / 待采集 | 器材记录提交成功 | `/equipment/quick-entry/{studentId}?entry=sensory-integration` | 教师或管理员 | `equipment` | 提交一条可丢弃器材记录 | 保存成功反馈和当前录入上下文可见 | Electron 辅助 | 演示写入 | `toast` | `S123.png` → `[图 S123]` |
| **S124** | P0 / 待采集 | 器材记录卡片与操作 | `/equipment/records/{studentId}?entry=sensory-integration` | 教师或管理员 | `equipment` | 进入器材记录并定位一张记录卡片 | 记录内容、查看评语和删除操作可见 | Electron 自动 | 只读 | `main` | `S124.png` → `[图 S124]` |
| **S125** | P0 / 待采集 | 器材 IEP 训练评语 | `/equipment/records/{studentId}?entry=sensory-integration` | 教师或管理员 | `equipment` | 从演示记录打开 IEP 训练评语 | 评语内容和导出入口可见 | Electron 自动 | 只读 | `dialog` | `S125.png` → `[图 S125]` |
| **S126** | P2 / 待采集 | 器材记录删除确认 | `/equipment/records/{studentId}?entry=sensory-integration` | 教师或管理员 | `equipment` | 对可删除器材记录点击删除 | 记录标识、风险说明、取消和确认按钮可见 | Electron 自动 | 隔离状态 | `dialog` | `S126.png` → `[图 S126]` |

### 第 11 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S127** | P0 / 待采集 | 自理任务列表 | `/self-care/tasks` | 教师或管理员 | `self-care` | 进入自理训练任务列表 | 分类和任务卡片可见 | Electron 自动 | 只读 | `main` | `S127.png` → `[图 S127]` |
| **S128** | P1 / 待采集 | 自理任务分类筛选 | `/self-care/tasks` | 教师或管理员 | `self-care` | 选择一个任务分类 | 选中分类和过滤后的任务卡片可见 | Electron 自动 | 只读 | `main` | `S128.png` → `[图 S128]` |
| **S129** | P0 / 待采集 | 自理任务资源基础信息 | `/self-care/tasks/new` | 教师或管理员 | `self-care` | 点击新建自理任务并停留在编辑页上部 | 任务名称、说明和基础资源信息可见 | Electron 自动 | 演示写入 | `form` | `S129.png` → `[图 S129]` |
| **S130** | P0 / 待采集 | 自理任务分类与能力项 | `/self-care/tasks/new` | 教师或管理员 | `self-care` | 滚动到分类与能力项区域 | 分类、能力目标和结构化元数据字段可见 | Electron 自动 | 演示写入 | `form` | `S130.png` → `[图 S130]` |
| **S131** | P0 / 待采集 | 自理任务步骤与媒体 | `/self-care/tasks/new` | 教师或管理员 | `self-care` | 滚动到步骤编辑区域并新增一步 | 步骤内容、顺序和媒体选择入口可见 | Electron 自动 | 演示写入 | `form` | `S131.png` → `[图 S131]` |
| **S132** | P1 / 待采集 | 编辑已有自理任务 | `/self-care/tasks/{taskId}/edit` | 教师或管理员 | `self-care` | 打开已有自理任务编辑页 | 已有字段和步骤已回填；保存按钮可见 | Electron 自动 | 演示写入 | `form` | `S132.png` → `[图 S132]` |
| **S133** | P0 / 待采集 | 自理训练学生选择 | `/self-care/tasks/{taskId}/select-student` | 教师或管理员 | `self-care` | 从任务卡片点击开始训练 | 任务名称、学生列表和选择操作可见 | Electron 自动 | 只读 | `main` | `S133.png` → `[图 S133]` |
| **S134** | P0 / 待采集 | 自理任务执行 | `/self-care/execute/{taskId}/{studentId}` | 教师或管理员 | `self-care` | 选择学生并开始多步骤任务 | 当前步骤、媒体、提示和评分操作可见 | Electron 辅助 | 演示写入 | `immersive` | `S134.png` → `[图 S134]` |
| **S135** | P0 / 待采集 | 最后一步与完成训练 | `/self-care/execute/{taskId}/{studentId}` | 教师或管理员 | `self-care` | 推进到最后一步但不提交 | 最后一步内容、评分和完成训练按钮可见 | Electron 辅助 | 演示写入 | `immersive` | `S135.png` → `[图 S135]` |
| **S136** | P0 / 待采集 | 自理训练保存结果 | `/training-records/life-skills?type=game` | 教师或管理员 | `self-care` | 完成训练并等待自动跳转到记录页 | 保存成功通知和新增自理训练记录同时可见 | Electron 辅助 | 演示写入 | `toast` | `S136.png` → `[图 S136]` |

### 第 12 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S137** | P0 / 待采集 | 训练记录能力入口 | `/training-records/menu` | 教师或管理员 | `records` | 进入训练记录 | 授权过滤后的能力入口卡片可见 | Electron 自动 | 只读 | `main` | `S137.png` → `[图 S137]` |
| **S138** | P0 / 待采集 | 游戏训练记录标签 | `/training-records/sensory-integration?type=game` | 教师或管理员 | `records` | 进入感官统合记录并选择游戏标签 | 游戏训练记录表格、列名和至少两条记录可见 | Electron 自动 | 只读 | `tabs` | `S138.png` → `[图 S138]` |
| **S139** | P0 / 待采集 | 器材训练记录标签 | `/training-records/sensory-integration?type=equipment` | 教师或管理员 | `records` | 切换到器材训练记录标签 | 器材训练记录表格、列名和至少两条记录可见 | Electron 自动 | 只读 | `tabs` | `S139.png` → `[图 S139]` |
| **S140** | P1 / 待采集 | 游戏记录筛选结果 | `/training-records/sensory-integration?type=game` | 教师或管理员 | `records` | 组合学生、日期或状态筛选游戏记录 | 筛选条件和游戏结果表格可见 | Electron 自动 | 只读 | `main` | `S140.png` → `[图 S140]` |
| **S141** | P1 / 待采集 | 器材记录筛选结果 | `/training-records/sensory-integration?type=equipment` | 教师或管理员 | `records` | 组合学生、日期或分类筛选器材记录 | 筛选条件和器材结果表格可见 | Electron 自动 | 只读 | `main` | `S141.png` → `[图 S141]` |

### 第 13 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S142** | P0 / 待采集 | 报告中心全貌 | `/reports` | 教师或管理员 | `reports` | 进入报告中心 | 统计、筛选和报告列表可见 | Electron 自动 | 只读 | `main` | `S142.png` → `[图 S142]` |
| **S143** | P1 / 待采集 | 报告筛选结果 | `/reports` | 教师或管理员 | `reports` | 组合报告类型、学生和日期筛选 | 筛选条件和匹配报告列表可见 | Electron 自动 | 只读 | `main` | `S143.png` → `[图 S143]` |
| **S144** | P0 / 待采集 | 报告行操作 | `/reports` | 教师或管理员 | `reports` | 定位一条支持操作的演示报告 | 查看、下载和删除操作可见 | Electron 自动 | 只读 | `main` | `S144.png` → `[图 S144]` |
| **S145** | P2 / 待采集 | 删除报告确认 | `/reports` | 教师或管理员 | `reports` | 对可删除演示报告点击删除 | 报告标识、风险说明、取消和确认按钮可见 | Electron 自动 | 隔离状态 | `dialog` | `S145.png` → `[图 S145]` |
| **S146** | P0 / 待采集 | 评估报告 Word 导出 | `/assessment/sm/report?assessId={smAssessId}&studentId={studentId}` | 教师或管理员 | `reports` | 打开支持 Word 导出的评估报告 | 报告标题和 Word 导出按钮可见 | Electron 自动 | 只读 | `report` | `S146.png` → `[图 S146]` |
| **S147** | P0 / 待采集 | 情绪报告 Word 导出 | `/emotional/report?studentId={studentId}` | 教师或管理员 | `reports` | 打开情绪报告 | 报告标题和 Word 导出按钮可见 | Electron 自动 | 只读 | `report` | `S147.png` → `[图 S147]` |

### 第 14 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S148** | P0 / 待采集 | 教师只读训练资源列表 | `/resource-center?tab=training` | 教师 | `resources` | 使用教师账号进入训练资源标签 | 筛选和资源列表可见；管理员维护按钮不可见 | Electron 自动 | 只读 | `main` | `S148.png` → `[图 S148]` |
| **S149** | P1 / 待采集 | 训练资源筛选 | `/resource-center?tab=training` | 教师或管理员 | `resources` | 组合模块、类型、状态或关键词筛选 | 筛选条件和匹配资源结果可见 | Electron 自动 | 只读 | `main` | `S149.png` → `[图 S149]` |
| **S150** | P0 / 待采集 | 器材封面、说明与标签 | `/resource-center?tab=training` | 教师或管理员 | `resources` | 定位一项器材资源卡片 | 封面、说明和标签在列表详情区域可见；无独立详情页 | Electron 自动 | 只读 | `card` | `S150.png` → `[图 S150]` |
| **S151** | P0 / 待采集 | 新建自定义训练资源 | `/resource-center?tab=training` | 管理员 | `resources` | 使用管理员账号点击新建自定义资源 | 创建字段、资源类型和保存操作可见 | Electron 自动 | 演示写入 | `dialog` | `S151.png` → `[图 S151]` |
| **S152** | P1 / 待采集 | 系统预置资源编辑锁定态 | `/resource-center?tab=training` | 管理员 | `resources` | 打开系统预置资源编辑 | 系统字段锁定状态和允许编辑字段可见 | Electron 自动 | 只读 | `dialog` | `S152.png` → `[图 S152]` |
| **S153** | P1 / 待采集 | 情绪资源包导入预览 | `/resource-center?tab=training` | 管理员 | `resources` | 选择情绪资源包并进入导入预览 | 包信息、待导入统计和确认操作可见 | Electron 自动 | 演示写入 | `dialog` | `S153.png` → `[图 S153]` |
| **S154** | P1 / 待采集 | 情绪资源包导出预览 | `/resource-center?tab=training` | 管理员 | `resources` | 对情绪资源触发导出预览 | 导出范围、统计和目标说明可见 | Electron 自动 | 只读 | `dialog` | `S154.png` → `[图 S154]` |
| **S155** | P0 / 待采集 | 训练资源启停 | `/resource-center?tab=training` | 管理员 | `resources` | 定位可启停的演示训练资源并切换状态 | 资源状态开关和更新后的状态可见 | Electron 自动 | 演示写入 | `card` | `S155.png` → `[图 S155]` |
| **S156** | P2 / 待采集 | 自定义资源软删除确认 | `/resource-center?tab=training` | 管理员 | `resources` | 对可删除自定义资源点击删除 | 资源名称、软删除说明、取消和确认按钮可见 | Electron 自动 | 隔离状态 | `dialog` | `S156.png` → `[图 S156]` |
| **S157** | P1 / 待采集 | 已禁用资源筛选与恢复 | `/resource-center?tab=training` | 管理员 | `resources` | 筛选已禁用资源并定位可恢复项 | 已禁用状态、筛选条件和恢复入口可见 | Electron 自动 | 演示写入 | `main` | `S157.png` → `[图 S157]` |
| **S158** | P0 / 待采集 | 教学材料列表与筛选 | `/resource-center?tab=teaching` | 教师或管理员 | `resources` | 切换到教学资料标签 | 筛选工具、材料列表和卡片可见 | Electron 自动 | 只读 | `main` | `S158.png` → `[图 S158]` |
| **S159** | P0 / 待采集 | 教学材料操作与收藏状态 | `/resource-center?tab=teaching` | 教师或管理员 | `resources` | 定位一张教学材料卡片并切换收藏 | 打开、详情、收藏操作和收藏状态可见 | Electron 自动 | 演示写入 | `card` | `S159.png` → `[图 S159]` |
| **S160** | P1 / 待采集 | 教学材料详情弹窗 | `/resource-center?tab=teaching` | 教师或管理员 | `resources` | 点击教学材料详情 | 标题、来源、标签、说明和打开操作可见 | Electron 自动 | 只读 | `dialog` | `S160.png` → `[图 S160]` |
| **S161** | P0 / 待采集 | 我的收藏 | `/resource-center?tab=teaching` | 教师或管理员 | `resources` | 点击我的收藏 | 收藏筛选状态和已收藏材料列表可见 | Electron 自动 | 只读 | `main` | `S161.png` → `[图 S161]` |
| **S162** | P1 / 待采集 | 教学材料管理工具与来源目录 | `/resource-center?tab=teaching` | 管理员 | `resources` | 使用管理员账号定位教学材料管理工具 | 上传、批量导入和来源目录信息可见 | Electron 自动 | 只读 | `main` | `S162.png` → `[图 S162]` |
| **S163** | P0 / 待采集 | 单个教学材料上传 | `/resource-center?tab=teaching` | 管理员 | `resources` | 点击上传资料并选择临时演示文件 | 标题、分类、文件待上传状态和上传按钮可见 | Electron 自动 | 演示写入 | `dialog` | `S163.png` → `[图 S163]` |
| **S164** | P1 / 待采集 | 教学材料批量导入 | `/resource-center?tab=teaching` | 管理员 | `resources` | 点击批量导入并选择临时目录和 CSV | 批量导入步骤、已选路径和执行按钮可见 | Electron 自动 | 演示写入 | `dialog` | `S164.png` → `[图 S164]` |
| **S165** | P1 / 待采集 | 教学材料导入结果 | `/resource-center?tab=teaching` | 管理员 | `resources` | 执行可丢弃教学材料批量导入 | 成功失败统计通知和更新后的材料列表可见 | Electron 辅助 | 演示写入 | `toast` | `S165.png` → `[图 S165]` |

### 第 15 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S166** | P0 / 待采集 | AI 浮动入口 | `/dashboard` | 教师或管理员 | `ai` | 进入登录后首页并定位右下角 | 独立圆形 AI 浮动入口可见且不遮挡主要操作 | Electron 自动 | 只读 | `card` | `S166.png` → `[图 S166]` |
| **S167** | P0 / 待采集 | AI 助手抽屉 | `/dashboard` | 教师或管理员 | `ai` | 点击 AI 浮动入口 | 助手抽屉、消息区、输入区和关闭入口完整可见 | Electron 自动 | 只读 | `drawer` | `S167.png` → `[图 S167]` |
| **S168** | P0 / 待采集 | 智能体选择器 | `/dashboard` | 教师或管理员 | `ai` | 在 AI 抽屉展开智能体选择器 | 可用智能体名称、专长或状态可见 | Electron 自动 | 只读 | `popover` | `S168.png` → `[图 S168]` |
| **S169** | P0 / 待采集 | 模型选择器 | `/dashboard` | 教师或管理员 | `ai` | 在 AI 抽屉展开模型选择器 | 当前模型和可选模型清单可见；无 API Key | Electron 自动 | 只读 | `popover` | `S169.png` → `[图 S169]` |
| **S170** | P0 / 待采集 | 开场问题与输入区 | `/dashboard` | 教师或管理员 | `ai` | 选择一个内置智能体并保持新会话 | 开场问题、输入区、报告和附件工具可见 | Electron 自动 | 只读 | `drawer` | `S170.png` → `[图 S170]` |
| **S171** | P1 / 待采集 | 最近会话 | `/dashboard` | 教师或管理员 | `ai` | 打开 AI 抽屉的最近会话区域 | 最近会话标题、时间和继续入口可见 | Electron 自动 | 只读 | `drawer` | `S171.png` → `[图 S171]` |
| **S172** | P1 / 待采集 | 完整会话历史 | `/profile/ai-chat-history` | 教师或管理员 | `ai` | 从用户菜单进入完整会话历史 | 历史筛选、会话列表和查看删除操作可见 | Electron 自动 | 只读 | `main` | `S172.png` → `[图 S172]` |
| **S173** | P0 / 待采集 | AI 附件待发送状态 | `/dashboard` | 教师或管理员 | `ai` | 通过原生文件选择器选取临时附件并返回抽屉 | 附件名称、大小、待发送预览和移除入口可见 | Electron 辅助 | 演示写入 | `drawer` | `S173.png` → `[图 S173]` |
| **S174** | P0 / 待采集 | AI 外发隐私告知 | `/dashboard` | 教师或管理员 | `ai` | 在未确认外发告知的隔离账号首次发送消息 | 隐私告知、数据范围、取消和确认操作可见 | Electron 自动 | 隔离状态 | `dialog` | `S174.png` → `[图 S174]` |
| **S175** | P0 / 待采集 | 消息编辑与单条导出 | `/dashboard` | 教师或管理员 | `ai` | 定位一条已完成的 AI 回答并展开操作 | 编辑相关入口和单条导出 Word 操作可见 | Electron 自动 | 只读 | `drawer` | `S175.png` → `[图 S175]` |
| **S176** | P1 / 待采集 | 保存并重新生成编辑态 | `/dashboard` | 教师或管理员 | `ai` | 对用户消息点击编辑 | 编辑提示、原消息回填和保存并重新生成入口可见 | Electron 自动 | 演示写入 | `drawer` | `S176.png` → `[图 S176]` |
| **S177** | P1 / 待采集 | AI 生成报告入口 | `/dashboard` | 教师或管理员 | `ai` | 展开输入区工具列 | AI 生成报告入口位于附件按钮上方且可见 | Electron 自动 | 只读 | `drawer` | `S177.png` → `[图 S177]` |
| **S178** | P1 / 待采集 | AI 报告工具执行结果 | `/dashboard` | 教师或管理员 | `ai` | 用脚本化响应执行一次报告工具 | 工具执行状态、回答内容和导出结果可见 | Electron 辅助 | 演示写入 | `drawer` | `S178.png` → `[图 S178]` |
| **S179** | P0 / 待采集 | 模型服务基础配置 | `/system?tab=ai-agent` | 管理员 | `ai` | 使用管理员账号进入 AI 智能体设置并停留上部 | 模型服务基础配置字段可见；密钥已掩码 | Electron 自动 | 只读 | `main` | `S179.png` → `[图 S179]` |
| **S180** | P0 / 待采集 | 模型清单与模型编辑 | `/system?tab=ai-agent` | 管理员 | `ai` | 定位模型列表并打开一个演示模型编辑 | 模型清单、模型字段和保存操作可见 | Electron 自动 | 演示写入 | `dialog` | `S180.png` → `[图 S180]` |
| **S181** | P0 / 待采集 | AI 开关、额度与连接测试 | `/system?tab=ai-agent` | 管理员 | `ai` | 滚动到服务配置下部 | AI 开关、额度、连接测试和边界提示可见 | Electron 自动 | 只读 | `main` | `S181.png` → `[图 S181]` |
| **S182** | P0 / 待采集 | 智能体网格与启停 | `/system?tab=ai-agent` | 管理员 | `ai` | 滚动到智能体管理区 | 智能体网格、启停状态和标题栏新增按钮可见 | Electron 自动 | 演示写入 | `main` | `S182.png` → `[图 S182]` |
| **S183** | P0 / 待采集 | 自定义智能体编辑与技能 | `/system?tab=ai-agent` | 管理员 | `ai` | 打开一个自定义智能体编辑 | 名称、角色、技能选择和保存操作可见 | Electron 自动 | 演示写入 | `dialog` | `S183.png` → `[图 S183]` |
| **S184** | P1 / 待采集 | 知识引用资料与提示词 | `/system?tab=ai-agent` | 管理员 | `ai` | 在智能体编辑中切换到知识与提示词区域 | 知识引用资料、系统提示词和边界说明可见 | Electron 自动 | 演示写入 | `dialog` | `S184.png` → `[图 S184]` |
| **S185** | P1 / 待采集 | 管理员会话审计 | `/system?tab=ai-agent` | 管理员 | `ai` | 滚动到管理员会话审计并打开预览 | 审计列表、账号、时间和会话预览可见 | Electron 自动 | 只读 | `main` | `S185.png` → `[图 S185]` |

### 第 16 章

| ID | 优先级 / 状态 | 页面状态 | 路由模板 | 执行角色 | 数据配置 | 操作步骤 | 可见断言 | 采集 | 安全 | 裁切 | 输出与插入 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S186** | P0 / 待采集 | 用户管理列表 | `/system?tab=users` | 管理员 | `system` | 进入系统管理用户标签 | 账号表格、角色、状态和操作列可见 | Electron 自动 | 只读 | `main` | `S186.png` → `[图 S186]` |
| **S187** | P0 / 待采集 | 新建用户 | `/system?tab=users` | 管理员 | `system` | 点击新建用户 | 用户名、姓名、角色、密码和保存操作可见 | Electron 自动 | 演示写入 | `dialog` | `S187.png` → `[图 S187]` |
| **S188** | P0 / 待采集 | 编辑用户 | `/system?tab=users` | 管理员 | `system` | 对演示教师账号点击编辑 | 用户名禁用、可编辑资料回填和保存入口可见 | Electron 自动 | 演示写入 | `dialog` | `S188.png` → `[图 S188]` |
| **S189** | P0 / 待采集 | 重置密码 | `/system?tab=users` | 管理员 | `system` | 对演示账号点击重置密码 | 新密码字段、规则和确认操作可见 | Electron 自动 | 演示写入 | `dialog` | `S189.png` → `[图 S189]` |
| **S190** | P0 / 待采集 | 账号启停与删除菜单 | `/system?tab=users` | 管理员 | `system` | 展开演示账号操作菜单 | 启停和删除操作可见 | Electron 自动 | 只读 | `popover` | `S190.png` → `[图 S190]` |
| **S191** | P2 / 待采集 | 删除用户确认 | `/system?tab=users` | 管理员 | `system` | 对可删除演示账号点击删除 | 账号名称、风险说明、取消和确认按钮可见 | Electron 自动 | 隔离状态 | `dialog` | `S191.png` → `[图 S191]` |
| **S192** | P0 / 待采集 | 数据备份主界面 | `/system?tab=backup` | 管理员 | `backup` | 进入数据备份标签 | 手动备份、恢复和资源体检区域可见 | Electron 自动 | 只读 | `main` | `S192.png` → `[图 S192]` |
| **S193** | P0 / 待采集 | 设置备份口令 | `/system?tab=backup` | 管理员 | `backup` | 点击立即备份并进入第一个口令提示 | 单个备份口令输入框和确认操作可见 | Electron 自动 | 演示写入 | `dialog` | `S193.png` → `[图 S193]` |
| **S194** | P0 / 待采集 | 再次确认备份口令 | `/system?tab=backup` | 管理员 | `backup` | 提交第一个口令并进入再次确认 | 单个确认口令输入框和返回确认操作可见 | Electron 自动 | 演示写入 | `dialog` | `S194.png` → `[图 S194]` |
| **S195** | P0 / 待采集 | 备份文件校验结果 | `/system?tab=backup` | 管理员 | `backup` | 通过文件选择器选取演示备份并等待校验 | 备份版本、表统计和校验结果可见 | Electron 辅助 | 只读 | `main` | `S195.png` → `[图 S195]` |
| **S196** | P2 / 待采集 | 恢复覆盖确认 | `/system?tab=backup` | 管理员 | `backup` | 对已校验备份点击恢复并停留在覆盖确认 | 原生确认框、覆盖风险和取消确认操作可见 | 原生人工 | 隔离状态 | `native-dialog` | `S196.png` → `[图 S196]` |
| **S197** | P0 / 待采集 | 恢复完成通知 | `/system?tab=backup` | 管理员 | `backup` | 在可丢弃数据库中完成恢复并等待页面重载 | 恢复完成通知和恢复区域可见 | Electron 辅助 | 隔离状态 | `toast` | `S197.png` → `[图 S197]` |
| **S198** | P0 / 待采集 | 资源文件体检结果 | `/system?tab=backup` | 管理员 | `backup` | 运行资源文件体检 | 孤儿文件统计、列表和扫描范围说明可见 | Electron 自动 | 只读 | `main` | `S198.png` → `[图 S198]` |
| **S199** | P2 / 待采集 | 孤儿文件清理确认 | `/system?tab=backup` | 管理员 | `backup` | 对演示孤儿文件点击清理 | 文件数量、风险说明、取消和确认按钮可见 | Electron 自动 | 隔离状态 | `dialog` | `S199.png` → `[图 S199]` |
| **S200** | P1 / 待采集 | 孤儿文件清理结果 | `/system?tab=backup` | 管理员 | `backup` | 确认清理演示孤儿文件并再次扫描 | 清理结果通知和复检后的统计可见 | Electron 辅助 | 隔离状态 | `toast` | `S200.png` → `[图 S200]` |
| **S201** | P0 / 待采集 | 系统基础信息 | `/system?tab=settings` | 管理员 | `system` | 进入系统设置标签 | 系统名称、基础参数和保存入口可见 | Electron 自动 | 只读 | `main` | `S201.png` → `[图 S201]` |
| **S202** | P1 / 待采集 | 登录主题与背景媒体 | `/system?tab=settings` | 管理员 | `system` | 滚动到登录品牌设置上部 | 主题选择、图片和视频背景媒体入口可见 | Electron 自动 | 演示写入 | `main` | `S202.png` → `[图 S202]` |
| **S203** | P1 / 待采集 | 登录主色、透明度与说明 | `/system?tab=settings` | 管理员 | `system` | 滚动到登录品牌设置下部 | 主色、透明度和说明字段可见 | Electron 自动 | 演示写入 | `main` | `S203.png` → `[图 S203]` |
| **S204** | P2 / 待采集 | 备份与报告配置 | `/system?tab=settings` | 管理员 | `system` | 滚动到备份与报告配置 | 配置字段和自动备份未接主链等边界提示可见 | Electron 自动 | 只读 | `main` | `S204.png` → `[图 S204]` |
| **S205** | P0 / 待采集 | 关于、激活与能力包摘要 | `/system?tab=about` | 管理员 | `system` | 进入关于标签 | 产品名、版本、激活状态和能力包摘要可见 | Electron 自动 | 只读 | `card` | `S205.png` → `[图 S205]` |
| **S206** | P0 / 待采集 | 重新激活或更新授权 | `/system?tab=about` | 管理员 | `system` | 点击重新激活或更新授权并展开表单 | 激活码输入、验证操作和当前授权说明可见 | Electron 自动 | 隔离状态 | `form` | `S206.png` → `[图 S206]` |
| **S207** | P0 / 待采集 | 软件更新空闲状态 | `/system?tab=about` | 管理员 | `update` | 加载更新空闲状态 | 当前版本、自动检查开关和检查更新入口可见 | Electron 自动 | 隔离状态 | `card` | `S207.png` → `[图 S207]` |
| **S208** | P0 / 待采集 | 发现新版本与更新日志 | `/system?tab=about` | 管理员 | `update` | 注入发现新版本状态 | 新版本号、更新日志和下载操作可见 | Electron 自动 | 隔离状态 | `card` | `S208.png` → `[图 S208]` |
| **S209** | P1 / 待采集 | 软件下载进度 | `/system?tab=about` | 管理员 | `update` | 注入下载中状态并固定在中间进度 | 下载百分比和进度条可见；不连接正式更新源 | Electron 辅助 | 隔离状态 | `card` | `S209.png` → `[图 S209]` |
| **S210** | P1 / 待采集 | 更新下载完成 | `/system?tab=about` | 管理员 | `update` | 注入下载完成状态 | 下载完成说明和重启安装入口可见；不得点击重启 | Electron 自动 | 隔离状态 | `card` | `S210.png` → `[图 S210]` |
| **S211** | P2 / 待采集 | 已跳过版本与操作日志 | `/system?tab=about` | 管理员 | `update` | 注入已跳过版本并展开更新操作日志 | 跳过状态、版本信息和操作日志可见 | Electron 自动 | 隔离状态 | `main` | `S211.png` → `[图 S211]` |
