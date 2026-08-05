/** Executable capture scenarios for all SCGP user-manual screenshots. */

import { userManualScreenshotPlan } from './user-manual-screenshot-plan.mjs'

export const USER_MANUAL_SCREENSHOT_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
})

export const userManualScreenshotFixtureProfiles = Object.freeze({
  unactivated: [
    '使用独立 Electron userData 目录',
    '设备保持未激活状态',
    '机器码和激活码仅使用脱敏演示值',
  ],
  'activated-public': [
    '使用已激活的独立 Electron userData 目录',
    '退出所有账号并清除记住账号状态',
  ],
  'admin-full': [
    '使用管理员演示账号并启用全部当前可交付能力包',
    '演示数据库包含脱敏学生、计划、训练、报告和资源数据',
  ],
  'teacher-full': [
    '使用教师演示账号并启用与管理员相同的业务能力包',
    '演示数据库包含脱敏学生、计划、训练、报告和资源数据',
  ],
  'admin-no-ai': [
    '使用管理员演示账号',
    '所有 AI 智能体均处于停用状态',
  ],
  'admin-no-schedule': [
    '使用管理员演示账号',
    '当前日期没有生效中的训练计划安排',
  ],
  students: [
    '使用已登录的全能力演示账号',
    '至少准备 3 名脱敏学生，覆盖不同性别、诊断标签和班级',
    '其中 1 名学生具备评估、器材和游戏训练记录',
  ],
  classes: [
    '使用管理员演示账号',
    '准备当前学年、历史学年、2 个班级、2 名教师和至少 3 名学生',
    '至少保留 1 名未分班学生和 1 条班级变更历史',
  ],
  assessments: [
    '使用已登录的全能力演示账号',
    '准备适龄学生、CNBS 超龄学生和 15 项量表的脱敏完成记录',
    '准备 1 条未完成评估进度和可生成推荐的完成记录',
  ],
  plans: [
    '使用已登录的全能力演示账号',
    '准备草稿、已启用和评估推荐生成的计划各 1 条',
    '计划中包含游戏与器材资源以及当天训练安排',
  ],
  emotions: [
    '使用已登录的全能力演示账号并启用情绪能力包',
    '准备情绪场景、表达关心场景和已有情绪训练记录',
    '场景素材只包含脱敏演示人物和文本',
  ],
  games: [
    '使用已登录的全能力演示账号并启用相关游戏能力包',
    '准备经典游戏、注册表游戏、摄像头游戏、麦克风游戏和双人游戏',
    '准备正常完成与 teacher_exit 中断记录',
  ],
  equipment: [
    '使用已登录的全能力演示账号',
    '准备已启用器材、训练入口和已有器材训练记录',
    '所有新增或删除操作只作用于可丢弃演示记录',
  ],
  'self-care': [
    '使用已登录的全能力演示账号并启用生活自理能力包',
    '准备至少 2 个自理任务，其中 1 个包含多步骤与媒体',
    '准备可丢弃的自理训练记录',
  ],
  records: [
    '使用已登录的全能力演示账号',
    '至少准备 2 条游戏记录和 2 条器材记录',
    '记录覆盖不同学生、日期、完成状态和训练入口',
  ],
  reports: [
    '使用已登录的全能力演示账号',
    '准备评估报告、情绪报告和可删除的演示报告记录',
    '导出目录使用本轮临时目录',
  ],
  resources: [
    '使用具备完整资源数据的演示数据库',
    '准备系统预置、自定义、已启用、已禁用和可恢复资源',
    '准备教学材料、收藏项和可导入的临时文件',
  ],
  ai: [
    '使用已登录的演示账号',
    '使用脱敏模型配置或本地脚本化响应，不暴露真实 API Key',
    '准备已启用智能体、最近会话、完整历史和可导出的回答',
  ],
  system: [
    '使用管理员演示账号',
    '准备管理员、教师、停用账号和可删除演示账号',
    '系统配置只使用脱敏品牌与临时媒体',
  ],
  backup: [
    '使用管理员演示账号和独立 userData',
    '准备兼容版本的加密备份文件与可丢弃数据库副本',
    '资源目录包含可识别的演示孤儿文件',
  ],
  update: [
    '使用管理员演示账号和独立 userData',
    '通过受控状态注入或测试更新源准备互斥更新状态',
    '禁止执行真实重启安装或覆盖正式版本',
  ],
})

export const userManualScreenshotCaptureTargets = Object.freeze({
  window: { selector: null, description: '完整 Electron 窗口' },
  shell: { selector: '#app', description: '应用壳层、导航和内容区' },
  main: { selector: 'main, .page-container, .main-content', description: '页面主内容区' },
  toolbar: { selector: '.toolbar, .filter-bar, .page-header', description: '工具栏及相邻结果区' },
  card: { selector: '.el-card, .resource-card, .student-card, .plan-card', description: '目标卡片及必要上下文' },
  dialog: { selector: '.el-overlay:has(.el-dialog), .el-dialog', description: '完整应用内对话框' },
  drawer: { selector: '.el-drawer', description: '完整抽屉及其标题和操作区' },
  popover: { selector: '.el-popper:not([style*="display: none"])', description: '当前展开的菜单或浮层' },
  form: { selector: 'form, .el-form', description: '表单及主要操作按钮' },
  tabs: { selector: '.el-tabs', description: '标签页标题和当前内容区' },
  report: { selector: '.report-page, .report-container, main', description: '报告主区域' },
  'report-section': { selector: '.report-page section, .report-section, main', description: '报告指定章节及标题' },
  immersive: { selector: '.immersive-shell, .game-container, .training-container, main', description: '沉浸式训练主体' },
  toast: { selector: '.el-message, .el-notification', description: '通知及其页面上下文' },
  'native-dialog': { selector: null, description: '操作系统或 Electron 原生提示框' },
})

const rows = String.raw`
S001|/dashboard|admin|admin-full|auto|read-only|shell|使用管理员账号登录并进入系统首页|管理员侧边导航完整；顶部用户区可见；首页内容和 AI 浮动入口可见
S002|/dashboard|teacher|teacher-full|auto|read-only|shell|使用教师账号登录并进入系统首页|管理员专属入口不可见；教师可用业务入口和首页内容可见
S003|/activation|implementation|unactivated|auto|isolated-state|main|启动未激活实例并停留在激活初始页|机器码区域、复制按钮、激活码输入框和验证按钮完整可见
S004|/activation|implementation|unactivated|auto|isolated-state|dialog|输入无效演示激活码并点击验证|校验失败提示可见；真实机器码和激活码均未暴露
S005|/login|public|activated-public|auto|read-only|window|启动已激活实例并退出登录|品牌区、用户名、密码、记住账号和登录按钮可见
S006|/login|public|activated-public|auto|read-only|main|输入错误演示凭据并提交登录|登录错误提示与用户名密码输入区同时可见
S007|/dashboard|either|admin-full|auto|read-only|popover|点击顶部用户区域展开菜单|个人资料、AI 聊天记录和退出登录入口完整可见
S008|/dashboard|either|admin-full|auto|read-only|main|进入包含完整演示数据的首页并等待加载完成|评估焦点、数据指标和已启用 AI 智能体卡片可见
S009|/dashboard|either|plans|auto|read-only|main|进入首页并定位今日工作区域|当天计划、训练资源名称和启动入口可见
S010|/dashboard|either|admin-no-ai|auto|isolated-state|card|进入首页并定位 AI 智能体区域|无可用 AI 智能体空状态可见；页面无错误状态
S011|/dashboard|either|admin-no-schedule|auto|isolated-state|card|进入首页并定位今日工作区域|无当天训练安排空状态可见；其他首页区域正常
S012|/profile|either|admin-full|auto|read-only|main|从用户菜单进入个人资料页|基本资料、预设头像、上传和拍照入口可见
S013|/profile|either|admin-full|auto|read-only|main|滚动到最近登录日志区域|日志字段和脱敏记录可见；最多展示范围说明可辨识
S014|/profile|either|admin-full|auto|read-only|form|滚动到修改密码区域|旧密码、新密码、确认密码、规则和保存按钮可见
S015|/students|either|students|auto|read-only|main|进入学生管理并等待卡片加载|统计、筛选工具栏、至少 3 张学生卡片和主要操作可见
S016|/students|either|students|auto|read-only|toolbar|输入演示关键词并组合性别、诊断和班级筛选|筛选条件与匹配结果同时可见
S017|/students/{studentId}|either|students|auto|read-only|main|打开具备完整记录的演示学生详情|基本信息和脱敏学生标识可见
S018|/students/{studentId}|either|students|auto|read-only|tabs|定位学生详情记录标签区域|评估记录、器材训练和游戏训练标签及数量可见
S019|/students|either|students|auto|demo-write|form|点击新增学生并保持在表单上半部|姓名、学号、性别、出生日期等主要字段可见
S020|/students|either|students|auto|demo-write|form|在新增学生表单中展开头像选择区域|预设头像、上传图片和拍照入口可见
S021|/students|either|students|auto|demo-write|form|滚动新增学生表单到下半部|诊断类型、所属班级、头像和保存按钮可见
S022|/students|either|students|auto|demo-write|form|从学生卡片进入编辑并等待资料回填|已有资料、头像和保存入口完整可见
S023|/students|either|students|auto|isolated-state|dialog|对可删除演示学生触发删除操作|学生标识、风险说明、取消和确认按钮可见
S024|/students|either|students|auto|read-only|dialog|点击批量导入学生|模板下载、文件选择和开始导入入口可见
S025|/class-management|admin|classes|auto|read-only|main|进入班级管理|学年筛选、班级列表和管理操作可见
S026|/class-management|admin|classes|auto|demo-write|dialog|点击新建班级|班级名称、年级、学年、教师等创建字段可见
S027|/class-management|admin|classes|auto|demo-write|dialog|点击批量创建班级|批量创建规则、数量或命名字段和确认操作可见
S028|/class-management|admin|classes|auto|demo-write|dialog|对演示班级点击编辑|班级资料已回填且保存入口可见
S029|/class-management|admin|classes|auto|isolated-state|dialog|对可删除演示班级触发删除|班级名称、风险说明、取消和确认按钮可见
S030|/class-management|admin|classes|auto|read-only|dialog|打开学年管理|当前与历史学年列表及管理入口可见
S031|/class-management|admin|classes|auto|demo-write|dialog|在学年管理中点击新增或编辑|学年名称、日期或状态字段及保存按钮可见
S032|/class-management|admin|classes|auto|read-only|main|打开班级学生列表|学生列表和当前可见入口完整；图注标明分班操作需前往分班管理
S033|/class-management|admin|classes|auto|demo-write|dialog|打开班级教师分配并选择教师|教师候选区、已选教师和保存操作可见
S034|/student-class-assignment|admin|classes|auto|read-only|toolbar|进入分班管理标签并设置学年或状态筛选|筛选条件、未分班学生和班级信息可见
S035|/student-class-assignment|admin|classes|auto|demo-write|dialog|选择单个演示学生并点击分班或调班|学生、目标班级和确认操作可见
S036|/student-class-assignment|admin|classes|auto|demo-write|dialog|勾选多个演示学生并点击批量分班|已选数量、目标班级和批量确认操作可见
S037|/student-class-assignment|admin|classes|auto|read-only|tabs|切换到班级视图|班级分组、人数和学生列表可见
S038|/student-class-assignment|admin|classes|auto|isolated-state|dialog|打开学年升级或毕业操作|升级目标、毕业规则、影响范围和取消操作可见
S039|/student-class-assignment|admin|classes|auto|read-only|dialog|打开班级变更历史|学生、原班级、新班级、时间等历史字段可见
S040|/assessment|either|assessments|auto|read-only|main|进入能力评估目录|分类标签和当前授权量表卡片可见
S041|/assessment|either|assessments|auto|read-only|main|点击一个评估分类|选中分类和过滤后的量表卡片同时可见
S042|/assessment/select-student?scale=sm|either|assessments|auto|read-only|main|从 S-M 量表点击开始评估|学生选择列表、年龄信息和开始入口可见
S043|/assessment/select-student?scale=cnbsr2016|either|assessments|auto|read-only|toast|选择 CNBS 超龄演示学生并尝试开始|超龄阻断提示与对应学生项同时可见
S044|/assessment/unified/sm/{studentId}|either|assessments|auto|read-only|main|为适龄学生打开 S-M 评估|量表名称、学生信息、欢迎说明和开始按钮可见
S045|/assessment/unified/sm/{studentId}|either|assessments|auto|demo-write|form|开始 S-M 并进入一项标准问卷题|题目、选项、进度和导航操作可见
S046|/assessment/unified/cnbsr2016/{studentId}|either|assessments|auto|demo-write|form|开始 CNBS 并进入操作项目|项目说明和当前评分控件可见
S047|/assessment/unified/tgmd_3/{studentId}|either|assessments|auto|demo-write|form|开始 TGMD-3 并进入动作项目|动作标准、试次和评分控件可见
S048|/assessment/unified/crt/{studentId}|either|assessments|auto|demo-write|form|开始 CRT 并进入图形题|图形题干、选项、进度和选择状态可见
S049|/assessment/unified/cognitive_self/{studentId}|either|assessments|auto|demo-write|form|开始综合认知自测并进入图形题|图形、选项和 DRAFT 标识可见
S050|/assessment/unified/cbcl/{studentId}|either|assessments|auto|demo-write|form|前进到 CBCL 社会能力必填项并留空提交|必填校验、字段和题目上下文可见
S051|/assessment/unified/sm/{studentId}|either|assessments|auto|demo-write|dialog|打开已有未完成进度的同一评估|继续评估和重新开始两个选择可见
S052|/assessment/unified/sm/{studentId}|either|assessments|assisted|demo-write|dialog|在演示评估中完成最后一题并提交|评估完成标题、后续操作和关闭入口可见
S053|/assessment/unified/sm/{studentId}|either|assessments|assisted|demo-write|drawer|完成评估后打开推荐抽屉|推荐内容和生成计划草稿按钮可见
S054|/training-plan|either|assessments|assisted|demo-write|card|从推荐抽屉生成草稿后手动进入训练计划|新生成的草稿计划、来源标识和草稿状态可见
S055|/students/{studentId}|either|assessments|auto|read-only|tabs|进入学生详情并打开评估记录标签|评估记录列表和查看报告入口可见
S056|/assessment/sm/report?assessId={smAssessId}&studentId={studentId}|either|assessments|auto|read-only|report|打开 S-M 演示报告并停留在上部|总分、等级和结果解释可见
S057|/assessment/sm/report?assessId={smAssessId}&studentId={studentId}|either|assessments|auto|read-only|report-section|滚动 S-M 报告到维度分析|雷达图和维度表完整可见
S058|/assessment/weefim/report?assessId={weefimAssessId}&studentId={studentId}|either|assessments|auto|read-only|report|打开 WeeFIM 演示报告并停留在上部|总分和独立性等级可见
S059|/assessment/weefim/report?assessId={weefimAssessId}&studentId={studentId}|either|assessments|auto|read-only|report-section|滚动到 WeeFIM 领域明细|领域标题、得分和解释可见
S060|/assessment/csirs/report/{csirsAssessId}|either|assessments|auto|read-only|report|打开 CSIRS 演示报告并停留在上部|总体结果和核心摘要可见
S061|/assessment/csirs/report/{csirsAssessId}|either|assessments|auto|read-only|report-section|滚动到 CSIRS 维度分析|雷达图和维度详情可见
S062|/assessment/conners-psq/report/{connersPsqAssessId}|either|assessments|auto|read-only|report|打开 Conners PSQ 报告上部|质量检查和总体结果可见
S063|/assessment/conners-psq/report/{connersPsqAssessId}|either|assessments|auto|read-only|report-section|滚动到 Conners PSQ 因子区|雷达图和因子详情可见
S064|/assessment/conners-trs/report/{connersTrsAssessId}|either|assessments|auto|read-only|report|打开 Conners TRS 报告上部|质量检查和总体结果可见
S065|/assessment/conners-trs/report/{connersTrsAssessId}|either|assessments|auto|read-only|report-section|滚动到 Conners TRS 因子区|雷达图和因子详情可见
S066|/assessment/sdq/report/{sdqAssessId}|either|assessments|auto|read-only|report|打开 SDQ 报告上部|困难总分和亲社会结果可见
S067|/assessment/sdq/report/{sdqAssessId}|either|assessments|auto|read-only|report-section|滚动到 SDQ 分量表区域|各分量表得分和解释可见
S068|/assessment/srs2/report/{srs2AssessId}|either|assessments|auto|read-only|report|打开 SRS-2 报告上部|总分和总体解释可见
S069|/assessment/srs2/report/{srs2AssessId}|either|assessments|auto|read-only|report-section|滚动到 SRS-2 维度与限制说明|维度表和免责声明可见
S070|/assessment/cbcl/report/{cbclAssessId}|either|assessments|auto|read-only|report|打开 CBCL 报告上部|社会能力结果和免责声明可见
S071|/assessment/cbcl/report/{cbclAssessId}|either|assessments|auto|read-only|report-section|滚动到 CBCL 行为剖面|图表和因子表可见
S072|/assessment/cnbsr2016/report/{cnbsAssessId}|either|assessments|auto|read-only|report|打开儿心量表Ⅱ报告上部|CA、MA、DQ 和提示可见
S073|/assessment/cnbsr2016/report/{cnbsAssessId}|either|assessments|auto|read-only|report-section|滚动到儿心量表Ⅱ五能区|五能区结果及分数可见
S074|/assessment/tgmd_3/report/{tgmdAssessId}|either|assessments|auto|read-only|report|打开 TGMD-3 报告上部|总体结果和分测验结果可见
S075|/assessment/tgmd_3/report/{tgmdAssessId}|either|assessments|auto|read-only|report-section|滚动到 TGMD-3 技能结果|13 项技能区和得分可见
S076|/assessment/gmfm_88/report/{gmfmAssessId}|either|assessments|auto|read-only|report|打开 GMFM-88 报告上部|总体结果和摘要可见
S077|/assessment/gmfm_88/report/{gmfmAssessId}|either|assessments|auto|read-only|report-section|滚动到 GMFM-88 能区结果|五大能区结果可见
S078|/assessment/fine_motor/report/{fmdaAssessId}|either|assessments|auto|read-only|report|打开 FMDA 报告上部|总体结果和领域雷达图可见
S079|/assessment/fine_motor/report/{fmdaAssessId}|either|assessments|auto|read-only|report-section|滚动到 FMDA 领域解读|领域说明和 IEP 目标可见
S080|/assessment/brief/report/{briefAssessId}|either|assessments|auto|read-only|report|打开 BRIEF 报告|结果主体和 DRAFT 提示可见
S081|/assessment/crt/report/{crtAssessId}|either|assessments|auto|read-only|report|打开 CRT 报告上部|结果和分组情况可见
S082|/assessment/crt/report/{crtAssessId}|either|assessments|auto|read-only|report-section|滚动到 CRT 限制说明|筛查定位和免责声明可见
S083|/assessment/cognitive-self/report/{cognitiveAssessId}|either|assessments|auto|read-only|report|打开综合认知自测报告|结果主体和 DRAFT 提示可见
S084|/training-plan|either|plans|auto|read-only|main|进入训练计划页|统计、筛选工具栏和计划卡片可见；不存在表格视图
S085|/training-plan|either|plans|auto|read-only|toolbar|组合状态、能力入口、学生和计划名称筛选|筛选条件与匹配计划卡片可见
S086|/training-plan|either|plans|auto|demo-write|form|点击新建计划并停留在基本信息标签|名称、学生、能力入口和日期字段可见
S087|/training-plan|either|plans|auto|demo-write|tabs|在计划编辑器切换到训练目标|长期目标和短期目标输入区可见
S088|/training-plan|either|plans|auto|demo-write|dialog|在资源编排步骤点击选择训练资源|模块、类型、关键词和多选结果可见
S089|/training-plan|either|plans|auto|demo-write|tabs|选择至少两项资源并返回资源编排标签|已选资源、频次、时长和教学提示可见
S090|/training-plan|either|plans|auto|read-only|drawer|打开草稿计划详情|草稿详情完整可见；抽屉内不出现编辑按钮
S091|/training-plan|either|plans|auto|read-only|popover|展开草稿计划卡片操作菜单|编辑入口和相邻可用操作可见
S092|/training-plan|either|plans|auto|demo-write|dialog|对草稿计划点击启用|计划名称、启用确认或启用操作可见
S093|/training-plan|either|plans|auto|read-only|card|定位执行中且当天有效的计划卡片|今日训练推荐和资源启动入口可见
S094|/emotional/menu|either|emotions|auto|read-only|main|进入情绪行为首页|情绪与场景和表达关心两个方向卡片可见
S095|/emotional/emotion-scene/select|either|emotions|auto|read-only|main|从情绪与场景方向开始且不预选学生|带训练方向的学生选择状态可见
S096|/emotional/emotion-scene/select?studentId={studentId}|either|emotions|auto|read-only|toolbar|选择学生后设置年龄、空间和主题筛选|三类筛选条件和结果数量可见
S097|/emotional/care-expression/select?studentId={studentId}|either|emotions|auto|read-only|toolbar|选择学生后设置年龄、情绪和关心方式筛选|三类筛选条件和结果数量可见
S098|/emotional/emotion-scene/select?studentId={studentId}|either|emotions|auto|read-only|main|应用筛选并定位一张可用情境卡片|场景缩略图、标题、标签和开始入口可见
S099|/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}|either|emotions|assisted|demo-write|immersive|启动演示情境并进入首个问题|场景画面、问题和作答区域可见
S100|/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}|either|emotions|assisted|demo-write|immersive|在训练中开启荧光笔并完成一处圈画|圈画工具、当前模式和画面标记可见
S101|/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}|either|emotions|assisted|demo-write|drawer|在训练中打开教师干预控制台|当前提示、流程控制和关闭入口可见
S102|/emotional/emotion-scene?studentId={studentId}&sceneId={sceneId}|either|emotions|assisted|demo-write|immersive|通过教师控制台强制结算演示情绪训练|星级、记录状态、返回和再练一次入口可见
S103|/emotional/report?studentId={studentId}|either|emotions|auto|read-only|report|打开有记录学生的情绪报告上部|摘要、正确率趋势和 Word 导出入口可见
S104|/emotional/report?studentId={studentId}|either|emotions|auto|read-only|report-section|滚动情绪报告到下部|偏好、场景掌握和干预建议可见
S105|/games/menu|either|games|auto|read-only|main|进入游戏训练|授权过滤后的能力入口卡片可见
S106|/games/select-student?entryCode=sensory-integration|either|games|auto|read-only|main|选择感官统合游戏入口|学生列表、所选能力入口和继续操作可见
S107|/games/lobby/{studentId}?entry=sensory-integration|either|games|auto|read-only|main|选择学生并进入游戏大厅|可用游戏卡片、分类和开始入口可见
S108|/games/lobby/{studentId}?entry=sensory-integration|either|games|auto|read-only|main|打开一项经典感官游戏|经典游戏的网格、时长和轮次设置可见
S109|/games/lobby/{studentId}?entry=cognitive|either|games|auto|read-only|main|打开一项注册表认知游戏|注册表游戏的难度设置和开始按钮可见
S110|/emotional/games/energy-ball?studentId={studentId}|either|games|assisted|isolated-state|main|在隔离环境拒绝摄像头权限并重新进入游戏|权限阻断卡、系统设置入口和重新检测可见；无摄像头预览
S111|/emotional/games/forest?studentId={studentId}|either|games|assisted|isolated-state|main|在隔离环境拒绝麦克风权限并重新进入游戏|权限阻断卡和重新检测可见；无音量检测器
S112|/emotional/games/burger?studentId={studentId}|either|games|assisted|demo-write|main|启动双人游戏并停留在参与者确认|两名学生信息和参与设置可见
S113|/emotional/games/pattern-next?studentId={studentId}|either|games|assisted|demo-write|immersive|开始一项代表性游戏并进入运行状态|游戏主体完整可见；无关导航隐藏
S114|/emotional/games/pattern-next?studentId={studentId}|either|games|assisted|demo-write|main|正常完成代表性游戏|完成状态、成绩摘要和后续操作可见
S115|/emotional/games/pattern-next?studentId={studentId}|either|games|assisted|isolated-state|dialog|游戏运行中点击教师结束本局|中断风险说明、取消和确认按钮可见
S116|/training-records/cognitive?type=game|either|games|auto|read-only|main|打开训练记录并筛选 teacher_exit 演示记录|已中断状态和对应记录行可见；无伪造中断结果页
S117|/emotional/game-record?recordId={gameRecordId}|either|games|auto|read-only|main|打开一条自定义小游戏记录|学生、游戏、时长、状态和特定指标可见
S118|/games/report?studentId={studentId}&recordId={gameRecordId}|either|games|auto|read-only|report|打开符合条件的游戏 IEP 报告|报告内容和当前实际导出入口可见
S119|/equipment/menu|either|equipment|auto|read-only|main|进入器材训练|授权允许的能力入口卡片可见
S120|/equipment/select-student?entry=sensory-integration|either|equipment|auto|read-only|main|选择一个器材训练入口|学生列表和所选入口信息可见
S121|/equipment/quick-entry/{studentId}?entry=sensory-integration|either|equipment|auto|read-only|main|进入器材快速录入并打开资源选择|按入口过滤的器材列表、封面、说明和标签可见
S122|/equipment/quick-entry/{studentId}?entry=sensory-integration|either|equipment|auto|demo-write|form|选定器材并填写评分表单|评分、辅助等级、时长和备注可见；无日期输入框
S123|/equipment/quick-entry/{studentId}?entry=sensory-integration|either|equipment|assisted|demo-write|toast|提交一条可丢弃器材记录|保存成功反馈和当前录入上下文可见
S124|/equipment/records/{studentId}?entry=sensory-integration|either|equipment|auto|read-only|main|进入器材记录并定位一张记录卡片|记录内容、查看评语和删除操作可见
S125|/equipment/records/{studentId}?entry=sensory-integration|either|equipment|auto|read-only|dialog|从演示记录打开 IEP 训练评语|评语内容和导出入口可见
S126|/equipment/records/{studentId}?entry=sensory-integration|either|equipment|auto|isolated-state|dialog|对可删除器材记录点击删除|记录标识、风险说明、取消和确认按钮可见
S127|/self-care/tasks|either|self-care|auto|read-only|main|进入自理训练任务列表|分类和任务卡片可见
S128|/self-care/tasks|either|self-care|auto|read-only|main|选择一个任务分类|选中分类和过滤后的任务卡片可见
S129|/self-care/tasks/new|either|self-care|auto|demo-write|form|点击新建自理任务并停留在编辑页上部|任务名称、说明和基础资源信息可见
S130|/self-care/tasks/new|either|self-care|auto|demo-write|form|滚动到分类与能力项区域|分类、能力目标和结构化元数据字段可见
S131|/self-care/tasks/new|either|self-care|auto|demo-write|form|滚动到步骤编辑区域并新增一步|步骤内容、顺序和媒体选择入口可见
S132|/self-care/tasks/{taskId}/edit|either|self-care|auto|demo-write|form|打开已有自理任务编辑页|已有字段和步骤已回填；保存按钮可见
S133|/self-care/tasks/{taskId}/select-student|either|self-care|auto|read-only|main|从任务卡片点击开始训练|任务名称、学生列表和选择操作可见
S134|/self-care/execute/{taskId}/{studentId}|either|self-care|assisted|demo-write|immersive|选择学生并开始多步骤任务|当前步骤、媒体、提示和评分操作可见
S135|/self-care/execute/{taskId}/{studentId}|either|self-care|assisted|demo-write|immersive|推进到最后一步但不提交|最后一步内容、评分和完成训练按钮可见
S136|/training-records/life-skills?type=game|either|self-care|assisted|demo-write|toast|完成训练并等待自动跳转到记录页|保存成功通知和新增自理训练记录同时可见
S137|/training-records/menu|either|records|auto|read-only|main|进入训练记录|授权过滤后的能力入口卡片可见
S138|/training-records/sensory-integration?type=game|either|records|auto|read-only|tabs|进入感官统合记录并选择游戏标签|游戏训练记录表格、列名和至少两条记录可见
S139|/training-records/sensory-integration?type=equipment|either|records|auto|read-only|tabs|切换到器材训练记录标签|器材训练记录表格、列名和至少两条记录可见
S140|/training-records/sensory-integration?type=game|either|records|auto|read-only|main|组合学生、日期或状态筛选游戏记录|筛选条件和游戏结果表格可见
S141|/training-records/sensory-integration?type=equipment|either|records|auto|read-only|main|组合学生、日期或分类筛选器材记录|筛选条件和器材结果表格可见
S142|/reports|either|reports|auto|read-only|main|进入报告中心|统计、筛选和报告列表可见
S143|/reports|either|reports|auto|read-only|main|组合报告类型、学生和日期筛选|筛选条件和匹配报告列表可见
S144|/reports|either|reports|auto|read-only|main|定位一条支持操作的演示报告|查看、下载和删除操作可见
S145|/reports|either|reports|auto|isolated-state|dialog|对可删除演示报告点击删除|报告标识、风险说明、取消和确认按钮可见
S146|/assessment/sm/report?assessId={smAssessId}&studentId={studentId}|either|reports|auto|read-only|report|打开支持 Word 导出的评估报告|报告标题和 Word 导出按钮可见
S147|/emotional/report?studentId={studentId}|either|reports|auto|read-only|report|打开情绪报告|报告标题和 Word 导出按钮可见
S148|/resource-center?tab=training|teacher|resources|auto|read-only|main|使用教师账号进入训练资源标签|筛选和资源列表可见；管理员维护按钮不可见
S149|/resource-center?tab=training|either|resources|auto|read-only|main|组合模块、类型、状态或关键词筛选|筛选条件和匹配资源结果可见
S150|/resource-center?tab=training|either|resources|auto|read-only|card|定位一项器材资源卡片|封面、说明和标签在列表详情区域可见；无独立详情页
S151|/resource-center?tab=training|admin|resources|auto|demo-write|dialog|使用管理员账号点击新建自定义资源|创建字段、资源类型和保存操作可见
S152|/resource-center?tab=training|admin|resources|auto|read-only|dialog|打开系统预置资源编辑|系统字段锁定状态和允许编辑字段可见
S153|/resource-center?tab=training|admin|resources|auto|demo-write|dialog|选择情绪资源包并进入导入预览|包信息、待导入统计和确认操作可见
S154|/resource-center?tab=training|admin|resources|auto|read-only|dialog|对情绪资源触发导出预览|导出范围、统计和目标说明可见
S155|/resource-center?tab=training|admin|resources|auto|demo-write|card|定位可启停的演示训练资源并切换状态|资源状态开关和更新后的状态可见
S156|/resource-center?tab=training|admin|resources|auto|isolated-state|dialog|对可删除自定义资源点击删除|资源名称、软删除说明、取消和确认按钮可见
S157|/resource-center?tab=training|admin|resources|auto|demo-write|main|筛选已禁用资源并定位可恢复项|已禁用状态、筛选条件和恢复入口可见
S158|/resource-center?tab=teaching|either|resources|auto|read-only|main|切换到教学资料标签|筛选工具、材料列表和卡片可见
S159|/resource-center?tab=teaching|either|resources|auto|demo-write|card|定位一张教学材料卡片并切换收藏|打开、详情、收藏操作和收藏状态可见
S160|/resource-center?tab=teaching|either|resources|auto|read-only|dialog|点击教学材料详情|标题、来源、标签、说明和打开操作可见
S161|/resource-center?tab=teaching|either|resources|auto|read-only|main|点击我的收藏|收藏筛选状态和已收藏材料列表可见
S162|/resource-center?tab=teaching|admin|resources|auto|read-only|main|使用管理员账号定位教学材料管理工具|上传、批量导入和来源目录信息可见
S163|/resource-center?tab=teaching|admin|resources|auto|demo-write|dialog|点击上传资料并选择临时演示文件|标题、分类、文件待上传状态和上传按钮可见
S164|/resource-center?tab=teaching|admin|resources|auto|demo-write|dialog|点击批量导入并选择临时目录和 CSV|批量导入步骤、已选路径和执行按钮可见
S165|/resource-center?tab=teaching|admin|resources|assisted|demo-write|toast|执行可丢弃教学材料批量导入|成功失败统计通知和更新后的材料列表可见
S166|/dashboard|either|ai|auto|read-only|card|进入登录后首页并定位右下角|独立圆形 AI 浮动入口可见且不遮挡主要操作
S167|/dashboard|either|ai|auto|read-only|drawer|点击 AI 浮动入口|助手抽屉、消息区、输入区和关闭入口完整可见
S168|/dashboard|either|ai|auto|read-only|popover|在 AI 抽屉展开智能体选择器|可用智能体名称、专长或状态可见
S169|/dashboard|either|ai|auto|read-only|popover|在 AI 抽屉展开模型选择器|当前模型和可选模型清单可见；无 API Key
S170|/dashboard|either|ai|auto|read-only|drawer|选择一个内置智能体并保持新会话|开场问题、输入区、报告和附件工具可见
S171|/dashboard|either|ai|auto|read-only|drawer|打开 AI 抽屉的最近会话区域|最近会话标题、时间和继续入口可见
S172|/profile/ai-chat-history|either|ai|auto|read-only|main|从用户菜单进入完整会话历史|历史筛选、会话列表和查看删除操作可见
S173|/dashboard|either|ai|assisted|demo-write|drawer|通过原生文件选择器选取临时附件并返回抽屉|附件名称、大小、待发送预览和移除入口可见
S174|/dashboard|either|ai|auto|isolated-state|dialog|在未确认外发告知的隔离账号首次发送消息|隐私告知、数据范围、取消和确认操作可见
S175|/dashboard|either|ai|auto|read-only|drawer|定位一条已完成的 AI 回答并展开操作|编辑相关入口和单条导出 Word 操作可见
S176|/dashboard|either|ai|auto|demo-write|drawer|对用户消息点击编辑|编辑提示、原消息回填和保存并重新生成入口可见
S177|/dashboard|either|ai|auto|read-only|drawer|展开输入区工具列|AI 生成报告入口位于附件按钮上方且可见
S178|/dashboard|either|ai|assisted|demo-write|drawer|用脚本化响应执行一次报告工具|工具执行状态、回答内容和导出结果可见
S179|/system?tab=ai-agent|admin|ai|auto|read-only|main|使用管理员账号进入 AI 智能体设置并停留上部|模型服务基础配置字段可见；密钥已掩码
S180|/system?tab=ai-agent|admin|ai|auto|demo-write|dialog|定位模型列表并打开一个演示模型编辑|模型清单、模型字段和保存操作可见
S181|/system?tab=ai-agent|admin|ai|auto|read-only|main|滚动到服务配置下部|AI 开关、额度、连接测试和边界提示可见
S182|/system?tab=ai-agent|admin|ai|auto|demo-write|main|滚动到智能体管理区|智能体网格、启停状态和标题栏新增按钮可见
S183|/system?tab=ai-agent|admin|ai|auto|demo-write|dialog|打开一个自定义智能体编辑|名称、角色、技能选择和保存操作可见
S184|/system?tab=ai-agent|admin|ai|auto|demo-write|dialog|在智能体编辑中切换到知识与提示词区域|知识引用资料、系统提示词和边界说明可见
S185|/system?tab=ai-agent|admin|ai|auto|read-only|main|滚动到管理员会话审计并打开预览|审计列表、账号、时间和会话预览可见
S186|/system?tab=users|admin|system|auto|read-only|main|进入系统管理用户标签|账号表格、角色、状态和操作列可见
S187|/system?tab=users|admin|system|auto|demo-write|dialog|点击新建用户|用户名、姓名、角色、密码和保存操作可见
S188|/system?tab=users|admin|system|auto|demo-write|dialog|对演示教师账号点击编辑|用户名禁用、可编辑资料回填和保存入口可见
S189|/system?tab=users|admin|system|auto|demo-write|dialog|对演示账号点击重置密码|新密码字段、规则和确认操作可见
S190|/system?tab=users|admin|system|auto|read-only|popover|展开演示账号操作菜单|启停和删除操作可见
S191|/system?tab=users|admin|system|auto|isolated-state|dialog|对可删除演示账号点击删除|账号名称、风险说明、取消和确认按钮可见
S192|/system?tab=backup|admin|backup|auto|read-only|main|进入数据备份标签|手动备份、恢复和资源体检区域可见
S193|/system?tab=backup|admin|backup|auto|demo-write|dialog|点击立即备份并进入第一个口令提示|单个备份口令输入框和确认操作可见
S194|/system?tab=backup|admin|backup|auto|demo-write|dialog|提交第一个口令并进入再次确认|单个确认口令输入框和返回确认操作可见
S195|/system?tab=backup|admin|backup|assisted|read-only|main|通过文件选择器选取演示备份并等待校验|备份版本、表统计和校验结果可见
S196|/system?tab=backup|admin|backup|native|isolated-state|native-dialog|对已校验备份点击恢复并停留在覆盖确认|原生确认框、覆盖风险和取消确认操作可见
S197|/system?tab=backup|admin|backup|assisted|isolated-state|toast|在可丢弃数据库中完成恢复并等待页面重载|恢复完成通知和恢复区域可见
S198|/system?tab=backup|admin|backup|auto|read-only|main|运行资源文件体检|孤儿文件统计、列表和扫描范围说明可见
S199|/system?tab=backup|admin|backup|auto|isolated-state|dialog|对演示孤儿文件点击清理|文件数量、风险说明、取消和确认按钮可见
S200|/system?tab=backup|admin|backup|assisted|isolated-state|toast|确认清理演示孤儿文件并再次扫描|清理结果通知和复检后的统计可见
S201|/system?tab=settings|admin|system|auto|read-only|main|进入系统设置标签|系统名称、基础参数和保存入口可见
S202|/system?tab=settings|admin|system|auto|demo-write|main|滚动到登录品牌设置上部|主题选择、图片和视频背景媒体入口可见
S203|/system?tab=settings|admin|system|auto|demo-write|main|滚动到登录品牌设置下部|主色、透明度和说明字段可见
S204|/system?tab=settings|admin|system|auto|read-only|main|滚动到备份与报告配置|配置字段和自动备份未接主链等边界提示可见
S205|/system?tab=about|admin|system|auto|read-only|card|进入关于标签|产品名、版本、激活状态和能力包摘要可见
S206|/system?tab=about|admin|system|auto|isolated-state|form|点击重新激活或更新授权并展开表单|激活码输入、验证操作和当前授权说明可见
S207|/system?tab=about|admin|update|auto|isolated-state|card|加载更新空闲状态|当前版本、自动检查开关和检查更新入口可见
S208|/system?tab=about|admin|update|auto|isolated-state|card|注入发现新版本状态|新版本号、更新日志和下载操作可见
S209|/system?tab=about|admin|update|assisted|isolated-state|card|注入下载中状态并固定在中间进度|下载百分比和进度条可见；不连接正式更新源
S210|/system?tab=about|admin|update|auto|isolated-state|card|注入下载完成状态|下载完成说明和重启安装入口可见；不得点击重启
S211|/system?tab=about|admin|update|auto|isolated-state|main|注入已跳过版本并展开更新操作日志|跳过状态、版本信息和操作日志可见
`.trim().split(/\r?\n/u)

const planById = new Map(userManualScreenshotPlan.map((item) => [item.id, item]))

function splitItems(value) {
  return value.split('；').map((item) => item.trim()).filter(Boolean)
}

function collectRouteVariables(route) {
  return [...route.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)].map((match) => match[1])
}

export const userManualScreenshotScenarios = rows.map((row, index) => {
  const parts = row.split('|')
  if (parts.length !== 9) {
    throw new Error(`Invalid screenshot scenario row ${index + 1}: ${row}`)
  }

  const [id, route, actor, fixture, captureMode, safety, target, actions, assertions] = parts
  const plan = planById.get(id)
  if (!plan) throw new Error(`Screenshot scenario ${id} has no matching plan row`)

  return {
    ...plan,
    filename: `${id}.png`,
    outputPath: `docs/user-manual/screenshots/${id}.png`,
    route,
    routeVariables: collectRouteVariables(route),
    actor,
    fixture,
    preconditions: userManualScreenshotFixtureProfiles[fixture] ?? [],
    actions: splitItems(actions),
    assertions: splitItems(assertions),
    capture: {
      mode: captureMode,
      safety,
      target,
      viewport: USER_MANUAL_SCREENSHOT_VIEWPORT,
    },
    placement: {
      markdownToken: `[图 ${id}]`,
      chapter: plan.chapter,
      caption: plan.title,
    },
  }
})

export const USER_MANUAL_SCREENSHOT_SCENARIO_COUNT = userManualScreenshotScenarios.length
