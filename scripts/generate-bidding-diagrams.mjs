/**
 * Generate high-definition SVG & PNG diagrams for SCGP Bidding Specifications.
 *
 * Output:
 * - docs/bidding/diagrams/scgp-platform-entitlement-architecture.svg
 * - docs/bidding/diagrams/scgp-platform-entitlement-architecture.png
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const diagramsDir = path.join(repoRoot, 'docs', 'bidding', 'diagrams')

if (!fs.existsSync(diagramsDir)) {
  fs.mkdirSync(diagramsDir, { recursive: true })
}

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="880" viewBox="0 0 1240 880" role="img" aria-labelledby="diagram-title diagram-desc">
  <title id="diagram-title">SCGP 星愿能力发展平台 — 通用教学底座与七大特教专业能力包架构选配图</title>
  <desc id="diagram-desc">通用教学支撑底座全版本标配，七大特教专业能力包（感官统合、情绪发展、社交沟通、精细动作、安抚系统、生活自理、认知发展）基于离线许可按需独立授权开通。</desc>

  <defs>
    <filter id="shadow-sm" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.06"/>
    </filter>
    <filter id="shadow-md" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.08"/>
    </filter>
    <linearGradient id="header-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="bridge-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="50%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
    <style>
      .main-title { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 26px; font-weight: 800; fill: #0f172a; }
      .main-subtitle { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 14px; font-weight: 500; fill: #475569; }
      .badge-text { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 12px; font-weight: 700; fill: #ffffff; }
      .section-title { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 16px; font-weight: 700; }
      .card-title { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 15px; font-weight: 700; }
      .card-sub { font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; font-weight: 600; fill: #64748b; }
      .body-text { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 12px; font-weight: 400; fill: #334155; line-height: 1.5; }
      .body-bold { font-weight: 700; fill: #0f172a; }
      .bridge-text { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; font-size: 13px; font-weight: 700; fill: #ffffff; letter-spacing: 0.5px; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1240" height="880" fill="#f8fafc" rx="16"/>

  <!-- Top Title Bar -->
  <g transform="translate(40, 28)">
    <rect x="0" y="0" width="6" height="42" rx="3" fill="#2563eb"/>
    <text x="18" y="24" class="main-title">SCGP 星愿能力发展平台 — 通用教学底座与七大特教专业能力包架构选配图</text>
    <text x="18" y="44" class="main-subtitle">基础平台底座全版本共享标配 ｜ 七大特教专业能力包基于离线许可（License）按需独立授权 ｜ 互不串扰、灵活选配</text>
  </g>

  <!-- ================= TIER 1: BASE PLATFORM CHASSIS ================= -->
  <g transform="translate(40, 95)">
    <!-- Container Box -->
    <rect x="0" y="0" width="1160" height="210" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" filter="url(#shadow-md)"/>

    <!-- Header Strip -->
    <rect x="0" y="0" width="1160" height="42" rx="12" fill="url(#header-grad)"/>
    <rect x="0" y="22" width="1160" height="20" fill="url(#header-grad)"/> <!-- square bottom corners -->
    <text x="24" y="27" class="badge-text" font-size="14">【全版本标配】SCGP 通用数字化教学支撑底座（共享中枢）</text>
    <rect x="990" y="9" width="146" height="24" rx="12" fill="#ffffff" fill-opacity="0.2"/>
    <text x="1063" y="25" text-anchor="middle" class="badge-text" font-size="11">离线单机 100% 可用</text>

    <!-- 6 Sub-Cards inside Base Platform -->
    <!-- Card 1.1 -->
    <g transform="translate(20, 56)">
      <rect x="0" y="0" width="176" height="136" rx="8" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.2"/>
      <circle cx="22" cy="24" r="10" fill="#0284c7"/>
      <text x="22" y="28" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">1</text>
      <text x="38" y="28" class="card-title" fill="#0369a1" font-size="13">学生档案与教务</text>
      <text x="12" y="52" class="body-text">• 多维学籍与障碍标签</text>
      <text x="12" y="72" class="body-text">• 摄像头现场免冠拍照</text>
      <text x="12" y="92" class="body-text">• 学年管理与智能分班</text>
      <text x="12" y="112" class="body-text">• Excel 名册一键批量导入</text>
    </g>

    <!-- Card 1.2 -->
    <g transform="translate(208, 56)">
      <rect x="0" y="0" width="176" height="136" rx="8" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1.2"/>
      <circle cx="22" cy="24" r="10" fill="#16a34a"/>
      <text x="22" y="28" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">2</text>
      <text x="38" y="28" class="card-title" fill="#15803d" font-size="13">IEP 评训全闭环</text>
      <text x="12" y="52" class="body-text">• 测评薄弱项自动推导</text>
      <text x="12" y="72" class="body-text">• 长短期教学目标拆解</text>
      <text x="12" y="92" class="body-text">• 训练计划一键转草稿</text>
      <text x="12" y="112" class="body-text">• 教师人工复核与确认</text>
    </g>

    <!-- Card 1.3 -->
    <g transform="translate(396, 56)">
      <rect x="0" y="0" width="176" height="136" rx="8" fill="#fdf4ff" stroke="#f5d0fe" stroke-width="1.2"/>
      <circle cx="22" cy="24" r="10" fill="#c026d3"/>
      <text x="22" y="28" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">3</text>
      <text x="38" y="28" class="card-title" fill="#a21caf" font-size="13">AI 特教专家智囊</text>
      <text x="12" y="52" class="body-text">• 6位特教垂直智能体</text>
      <text x="12" y="72" class="body-text">• 学生专属脱敏长期记忆</text>
      <text x="12" y="92" class="body-text">• 本地病历与教案解析</text>
      <text x="12" y="112" class="body-text">• 一键导出 Word 教学设计</text>
    </g>

    <!-- Card 1.4 -->
    <g transform="translate(584, 56)">
      <rect x="0" y="0" width="176" height="136" rx="8" fill="#fffbeb" stroke="#fde68a" stroke-width="1.2"/>
      <circle cx="22" cy="24" r="10" fill="#d97706"/>
      <text x="22" y="28" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">4</text>
      <text x="38" y="28" class="card-title" fill="#b45309" font-size="13">今日日程与看板</text>
      <text x="12" y="52" class="body-text">• 首页工作日程直达课堂</text>
      <text x="12" y="72" class="body-text">• 近7/30天趋势多维下钻</text>
      <text x="12" y="92" class="body-text">• 连续缺训与中断预警</text>
      <text x="12" y="112" class="body-text">• 评估到期周期复评提醒</text>
    </g>

    <!-- Card 1.5 -->
    <g transform="translate(772, 56)">
      <rect x="0" y="0" width="176" height="136" rx="8" fill="#fef2f2" stroke="#fecaca" stroke-width="1.2"/>
      <circle cx="22" cy="24" r="10" fill="#dc2626"/>
      <text x="22" y="28" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">5</text>
      <text x="38" y="28" class="card-title" fill="#b91c1c" font-size="13">公文级报告导出</text>
      <text x="12" y="52" class="body-text">• Word(.docx) / HTML双擎</text>
      <text x="12" y="72" class="body-text">• 学校官方名称页眉注入</text>
      <text x="12" y="92" class="body-text">• 证件照自研防撕裂排版</text>
      <text x="12" y="112" class="body-text">• 15项量表直通 AI 解读</text>
    </g>

    <!-- Card 1.6 -->
    <g transform="translate(960, 56)">
      <rect x="0" y="0" width="180" height="136" rx="8" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>
      <circle cx="22" cy="24" r="10" fill="#475569"/>
      <text x="22" y="28" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">6</text>
      <text x="38" y="28" class="card-title" fill="#334155" font-size="13">数据安全与管理</text>
      <text x="12" y="52" class="body-text">• 12位口令一键加密备份</text>
      <text x="12" y="72" class="body-text">• 全量原子恢复杜绝坏块</text>
      <text x="12" y="92" class="body-text">• 教师/管理员双角色权限</text>
      <text x="12" y="112" class="body-text">• 校园品牌与校名定制</text>
    </g>
  </g>

  <!-- ================= TIER 2: MIDDLE CONNECTOR & LICENSE BRIDGE ================= -->
  <g transform="translate(40, 320)">
    <!-- Bridge Bar -->
    <rect x="180" y="0" width="800" height="38" rx="19" fill="url(#bridge-grad)" filter="url(#shadow-sm)"/>
    <text x="580" y="24" text-anchor="middle" class="bridge-text">
      🔑 离线许可（License）验签认证 ➔ 动态按需激活能力包 ➔ 菜单与资源自动化隔离过滤
    </text>

    <!-- Branch Lines to Cards -->
    <!-- Center drop lines -->
    <path d="M 310,38 L 310,65" stroke="#0d9488" stroke-width="2" stroke-dasharray="3,3"/>
    <path d="M 580,38 L 580,65" stroke="#0d9488" stroke-width="2"/>
    <path d="M 850,38 L 850,65" stroke="#0d9488" stroke-width="2" stroke-dasharray="3,3"/>
  </g>

  <!-- ================= TIER 3: SEVEN SPECIAL EDUCATION ENTITLEMENT PACKAGES ================= -->
  <!-- Label for Tier 3 -->
  <g transform="translate(40, 375)">
    <rect x="0" y="0" width="4" height="22" rx="2" fill="#0d9488"/>
    <text x="12" y="17" class="section-title" fill="#0f172a">七大特教专业能力授权包（按学校采购需要灵活选配）</text>
    <text x="440" y="16" class="body-text" fill="#64748b">每个能力包均配有专属的标准化评测量表、互动训练课程、实训工具与数据报表</text>
  </g>

  <!-- Row 1: 4 Cards (y = 405) -->
  <!-- Package 1: 感官统合 -->
  <g transform="translate(40, 405)">
    <rect x="0" y="0" width="275" height="215" rx="10" fill="#ffffff" stroke="#99f6e4" stroke-width="1.8" filter="url(#shadow-sm)"/>
    <rect x="0" y="0" width="275" height="34" rx="10" fill="#ccfbf1"/>
    <rect x="0" y="20" width="275" height="14" fill="#ccfbf1"/>
    <text x="14" y="23" class="card-title" fill="#0f766e">1. 感官统合能力包</text>
    <text x="165" y="22" class="card-sub">sensory_integration</text>

    <text x="14" y="56" class="body-text"><tspan class="body-bold">◆ 实体器材：</tspan>感统器械库管理联动</text>
    <text x="14" y="78" class="body-text">• 五级辅助等级量化记录（1-5分）</text>
    <text x="14" y="100" class="body-text">• 自动生成器材 IEP 评语（支持Word）</text>
    <text x="14" y="124" class="body-text"><tspan class="body-bold">◆ 互动游戏：</tspan>11款基础感知统合游戏</text>
    <text x="14" y="146" class="body-text">• 视觉追踪 / 声音辨析 / 节奏模仿</text>
    <text x="14" y="170" class="body-text"><tspan class="body-bold">◆ 权威量表：</tspan>CSIRS 感统 / TGMD-3</text>
    <text x="14" y="192" class="body-text">• GMFM-88 粗大运动功能评估</text>
  </g>

  <!-- Package 2: 情绪发展 -->
  <g transform="translate(335, 405)">
    <rect x="0" y="0" width="275" height="215" rx="10" fill="#ffffff" stroke="#fecdd3" stroke-width="1.8" filter="url(#shadow-sm)"/>
    <rect x="0" y="0" width="275" height="34" rx="10" fill="#ffe4e6"/>
    <rect x="0" y="20" width="275" height="14" fill="#ffe4e6"/>
    <text x="14" y="23" class="card-title" fill="#be123c">2. 情绪发展能力包</text>
    <text x="195" y="22" class="card-sub">emotional</text>

    <text x="14" y="56" class="body-text"><tspan class="body-bold">◆ 情绪情境：</tspan>校园场景面部表情识别</text>
    <text x="14" y="78" class="body-text">• 肢体动作观察与情绪起因推理</text>
    <text x="14" y="100" class="body-text">• 表达关心共情实练与同理心习得</text>
    <text x="14" y="124" class="body-text"><tspan class="body-bold">◆ 教师控制台：</tspan>随堂荧光笔实时圈画</text>
    <text x="14" y="146" class="body-text">• 聚焦眼泪等线索 / 沉浸全屏防干扰</text>
    <text x="14" y="170" class="body-text"><tspan class="body-bold">◆ 报告与量表：</tspan>情绪进步报告(Word)</text>
    <text x="14" y="192" class="body-text">• Conners / SDQ 长处 / CBCL 行为</text>
  </g>

  <!-- Package 3: 社交沟通 -->
  <g transform="translate(630, 405)">
    <rect x="0" y="0" width="275" height="215" rx="10" fill="#ffffff" stroke="#fed7aa" stroke-width="1.8" filter="url(#shadow-sm)"/>
    <rect x="0" y="0" width="275" height="34" rx="10" fill="#ffedd5"/>
    <rect x="0" y="20" width="275" height="14" fill="#ffedd5"/>
    <text x="14" y="23" class="card-title" fill="#c2410c">3. 社交沟通能力包</text>
    <text x="150" y="22" class="card-sub">social_communication</text>

    <text x="14" y="56" class="body-text"><tspan class="body-bold">◆ 同伴合作：</tspan>双人同屏合作互动游戏</text>
    <text x="14" y="78" class="body-text">• “合作造汉堡”锻炼等待与分工</text>
    <text x="14" y="100" class="body-text">• 培养同伴社交参照与轮流规则</text>
    <text x="14" y="124" class="body-text"><tspan class="body-bold">◆ 沟通策略：</tspan>辅助沟通 AAC 支持</text>
    <text x="14" y="146" class="body-text">• 视觉提示卡片 PECS 与微课素材</text>
    <text x="14" y="170" class="body-text"><tspan class="body-bold">◆ 权威量表：</tspan>SRS-2 社交反应量表</text>
    <text x="14" y="192" class="body-text">• ABC / ATEC / PEP-3 孤独症评估</text>
  </g>

  <!-- Package 4: 精细动作 -->
  <g transform="translate(925, 405)">
    <rect x="0" y="0" width="275" height="215" rx="10" fill="#ffffff" stroke="#c7d2fe" stroke-width="1.8" filter="url(#shadow-sm)"/>
    <rect x="0" y="0" width="275" height="34" rx="10" fill="#e0e7ff"/>
    <rect x="0" y="20" width="275" height="14" fill="#e0e7ff"/>
    <text x="14" y="23" class="card-title" fill="#4338ca">4. 精细动作能力包</text>
    <text x="190" y="22" class="card-sub">fine_motor</text>

    <text x="14" y="56" class="body-text"><tspan class="body-bold">◆ 权威评估：</tspan>FMDA 小肌肉发展评估</text>
    <text x="14" y="78" class="body-text">• 0~6岁 88 项细化精细动作测查</text>
    <text x="14" y="100" class="body-text">• 自动折算精细动作发育商与发育年龄</text>
    <text x="14" y="124" class="body-text"><tspan class="body-bold">◆ 互动游戏：</tspan>手眼协调进阶游戏</text>
    <text x="14" y="146" class="body-text">• 空气木琴 / 打泡泡 / 云朵擦擦擦</text>
    <text x="14" y="170" class="body-text"><tspan class="body-bold">◆ 课堂应用：</tspan>针对握笔前准备训练</text>
    <text x="14" y="192" class="body-text">• 手指分化与手部肌力协调控制</text>
  </g>

  <!-- Row 2: 3 Cards (y = 638) -->
  <!-- Package 5: 安抚系统 -->
  <g transform="translate(40, 638)">
    <rect x="0" y="0" width="372" height="215" rx="10" fill="#ffffff" stroke="#bae6fd" stroke-width="1.8" filter="url(#shadow-sm)"/>
    <rect x="0" y="0" width="372" height="34" rx="10" fill="#e0f2fe"/>
    <rect x="0" y="20" width="372" height="14" fill="#e0f2fe"/>
    <text x="14" y="23" class="card-title" fill="#0369a1">5. 安抚系统能力包</text>
    <text x="260" y="22" class="card-sub">soothing_aids</text>

    <text x="14" y="56" class="body-text"><tspan class="body-bold">◆ 呼吸调控：</tspan>“深呼吸热气球”视觉跟随深呼吸训练</text>
    <text x="14" y="78" class="body-text">• 引导情绪焦虑或过激学生跟随节律平复生理唤醒水平</text>
    <text x="14" y="102" class="body-text"><tspan class="body-bold">◆ 声音自控：</tspan>“音量魔法森林”麦克风声控感知交互</text>
    <text x="14" y="124" class="body-text">• 训练学生将大喊大叫转变为受控的平静语调与音量</text>
    <text x="14" y="148" class="body-text"><tspan class="body-bold">◆ 危机预防：</tspan>低刺激温和界面，提供非药物即时舒缓</text>
    <text x="14" y="170" class="body-text">• 有效预防自伤与攻击性危机，打造温馨安全的安抚角</text>
    <text x="14" y="192" class="body-text"><tspan class="body-bold">◆ 适用场所：</tspan>情绪宣泄室、感官放松室（白室）、随堂安抚角</text>
  </g>

  <!-- Package 6: 生活自理 -->
  <g transform="translate(434, 638)">
    <rect x="0" y="0" width="372" height="215" rx="10" fill="#ffffff" stroke="#a7f3d0" stroke-width="1.8" filter="url(#shadow-sm)"/>
    <rect x="0" y="0" width="372" height="34" rx="10" fill="#d1fae5"/>
    <rect x="0" y="20" width="372" height="14" fill="#d1fae5"/>
    <text x="14" y="23" class="card-title" fill="#047857">6. 生活自理能力包</text>
    <text x="270" y="22" class="card-sub">life_skills</text>

    <text x="14" y="56" class="body-text"><tspan class="body-bold">◆ 任务分析法：</tspan>小步子图文分解教学（如洗手多步骤）</text>
    <text x="14" y="78" class="body-text">• 清晰动作图解，无音视频感官干扰，降低认知负荷</text>
    <text x="14" y="102" class="body-text"><tspan class="body-bold">◆ 校本自主建任务：</tspan>内置可视化自理任务与步骤编辑器 ★</text>
    <text x="14" y="124" class="body-text">• 教师可自由新增/编辑自理任务，配置步骤说明与配图</text>
    <text x="14" y="148" class="body-text"><tspan class="body-bold">◆ 量化评分与归档：</tspan>四级辅助水平与 0-3 级错误等级</text>
    <text x="14" y="170" class="body-text">• 弹性中断保存，全息成长轨迹展现自理独立进阶</text>
    <text x="14" y="192" class="body-text"><tspan class="body-bold">◆ 权威量表：</tspan>S-M 社会生活能力 / WeeFIM 功能独立性</text>
  </g>

  <!-- Package 7: 认知发展 -->
  <g transform="translate(828, 638)">
    <rect x="0" y="0" width="372" height="215" rx="10" fill="#ffffff" stroke="#e9d5ff" stroke-width="1.8" filter="url(#shadow-sm)"/>
    <rect x="0" y="0" width="372" height="34" rx="10" fill="#f3e8ff"/>
    <rect x="0" y="20" width="372" height="14" fill="#f3e8ff"/>
    <text x="14" y="23" class="card-title" fill="#7e22ce">7. 认知发展能力包</text>
    <text x="285" y="22" class="card-sub">cognitive</text>

    <text x="14" y="56" class="body-text"><tspan class="body-bold">◆ 权威测评：</tspan>BRIEF 儿童执行功能评估量表</text>
    <text x="14" y="78" class="body-text">• CRT 瑞文图形推理测验（60题非语言智力筛查）</text>
    <text x="14" y="102" class="body-text">• 儿心量表Ⅱ（CNBS-R2016，五大能区自动换算 DQ）</text>
    <text x="14" y="124" class="body-text"><tspan class="body-bold">◆ 注意力与思维游戏：</tspan>瞬时记忆翻牌 / 规律推理匹配</text>
    <text x="14" y="148" class="body-text">• 针对性改善注意力分散，提升视觉辨别与工作记忆容量</text>
    <text x="14" y="170" class="body-text"><tspan class="body-bold">◆ 目标推荐：</tspan>测验薄弱项自动生成认知 IEP 教学建议</text>
    <text x="14" y="192" class="body-text"><tspan class="body-bold">◆ 适用场所：</tspan>启智认知训练室、注意力训练室、资源教室</text>
  </g>
</svg>
`

async function main() {
  const svgPath = path.join(diagramsDir, 'scgp-platform-entitlement-architecture.svg')
  const pngPath = path.join(diagramsDir, 'scgp-platform-entitlement-architecture.png')

  fs.writeFileSync(svgPath, svgContent, 'utf8')
  console.log(`[Diagram] SVG written: ${svgPath}`)

  // Render to PNG via Playwright
  console.log('[Diagram] Launching Playwright Chromium...')
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1240, height: 880 },
    deviceScaleFactor: 2, // 2x DPI for crisp print-quality rendering in Word
  })

  await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
    svg { display: block; width: 1240px; height: 880px; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`)

  await page.waitForTimeout(500) // Ensure fonts & SVG render fully

  const svgElement = page.locator('svg')
  await svgElement.screenshot({
    path: pngPath,
    omitBackground: false,
  })

  await browser.close()
  console.log(`[Diagram] High-res PNG written: ${pngPath} (${fs.statSync(pngPath).size} bytes)`)
}

main().catch((err) => {
  console.error('Failed to generate bidding diagrams:', err)
  process.exit(1)
})
