/**
 * BRIEF 执行功能量表 — 题库与计分数据（DRAFT）
 *
 * ⚠️ DRAFT 说明（重要，需专业人员审核后方可用于临床）：
 * - 本题库为「自编题目 + 本地常模」策略的初版，按 BRIEF-P（学前 2-5 岁）/ BRIEF-2（学龄 5-18 岁）
 *   的**维度构造**自编中文行为描述题目，**非**原版 BRIEF 题目（PAR 版权），规避版权问题。
 * - 题目内容与常模转换均为草稿，需经具备资质的专业人员完成心理测量学审核与本地常模采集后
 *   才能作为正式评估工具使用。当前仅作为平台「筛查 / 发育监测 / 转介建议」用途（非诊断）。
 * - v1 暂用全正向计分（得分越高 = 执行功能困难越多）；原版 BRIEF 含少量反向计分题，后续可补。
 *
 * 维度构造来源（构造本身为公开学术知识，非版权题目）：
 * - BRIEF-P（2-5 岁）5 个临床量表：抑制 / 转换 / 情感控制 / 工作记忆 / 计划与组织
 *   复合指数：抑制性自我控制 ISCI、灵活性 FLEX、元认知 EMC、全局执行复合 GEC
 * - BRIEF-2（5-18 岁）9 个临床量表：抑制 / 自我监控 / 转换 / 情感控制 / 任务发起 /
 *   工作记忆 / 计划与组织 / 任务监控 / 物品组织
 *   复合指数：行为调节 BRI、情感调节 ERI、认知调节 CRI、全局执行复合 GEC
 *
 * @module database/brief-data
 */

/** 版本：学前 BRIEF-P / 学龄 BRIEF-2，按学生年龄在 Driver 内选取 */
export type BriefVersion = 'preschool' | 'school'

/** 临床量表维度定义 */
export interface BriefDimensionDef {
  /** runtime 维度 code（与 DimensionScore.code 一致，供 scale-dimension-mapping 使用） */
  code: string
  /** 维度中文名 */
  name: string
  version: BriefVersion
  description: string
}

/** 复合指数定义（由若干临床量表聚合） */
export interface BriefCompositeDef {
  code: string
  name: string
  version: BriefVersion
  memberScaleCodes: string[]
  description: string
}

/** 题目定义 */
export interface BriefQuestion {
  id: number
  version: BriefVersion
  /** runtime 维度 code */
  dimension: string
  dimensionName: string
  /** 行为描述题干（家长/教师报告：该行为出现的频率） */
  content: string
}

/** 评分选项（BRIEF 采用 1-3 三点计分） */
export interface BriefScoringOption {
  score: number
  label: string
  description: string
}

/** T 分等级（T 分越高 = 执行功能困难越多） */
export interface BriefLevel {
  minT: number
  level: string
  levelCode: string
  description: string
}

/** 按等级的反馈建议 */
export interface BriefRecommendation {
  level: string
  general_comment: string
  suggestions: string[]
}

// ============================================================================
// 临床量表维度
// ============================================================================

export const briefDimensions: BriefDimensionDef[] = [
  // ---- BRIEF-P 学前（2-5 岁）----
  { code: 'inhibit_p', name: '抑制', version: 'preschool', description: '控制冲动、等待与停止的能力' },
  { code: 'shift_p', name: '转换', version: 'preschool', description: '在不同活动、话题与情境间灵活转换' },
  { code: 'emotional_control_p', name: '情感控制', version: 'preschool', description: '调节情绪强度与平复情绪' },
  { code: 'working_memory_p', name: '工作记忆', version: 'preschool', description: '在活动中持有并使用信息' },
  { code: 'plan_organize_p', name: '计划与组织', version: 'preschool', description: '为任务做准备与安排先后' },

  // ---- BRIEF-2 学龄（5-18 岁）----
  { code: 'inhibit', name: '抑制', version: 'school', description: '控制冲动与言行' },
  { code: 'self_monitor', name: '自我监控', version: 'school', description: '意识到自身行为对他人与任务的影响' },
  { code: 'shift', name: '转换', version: 'school', description: '在任务、情境与心态间灵活转换' },
  { code: 'emotional_control', name: '情感控制', version: 'school', description: '调节情绪反应' },
  { code: 'initiate', name: '任务发起', version: 'school', description: '主动开始任务与产生想法' },
  { code: 'working_memory', name: '工作记忆', version: 'school', description: '在完成任务时持有与操作信息' },
  { code: 'plan_organize', name: '计划与组织', version: 'school', description: '规划步骤与组织资源' },
  { code: 'task_monitor', name: '任务监控', version: 'school', description: '检查并跟进自身任务进度' },
  { code: 'organization_of_materials', name: '物品组织', version: 'school', description: '管理物品与环境的秩序' },
]

// ============================================================================
// 复合指数（由临床量表聚合；T 分在 Driver 内先按量表算，再聚合为复合）
// ============================================================================

export const briefComposites: BriefCompositeDef[] = [
  // BRIEF-P
  { code: 'isci', name: '抑制性自我控制', version: 'preschool', memberScaleCodes: ['inhibit_p'], description: '抑制与自我控制聚合' },
  { code: 'flex', name: '灵活性', version: 'preschool', memberScaleCodes: ['shift_p', 'emotional_control_p'], description: '转换与情感调节聚合' },
  { code: 'emc', name: '元认知', version: 'preschool', memberScaleCodes: ['working_memory_p', 'plan_organize_p'], description: '工作记忆与计划组织聚合' },
  { code: 'gec_p', name: '全局执行复合', version: 'preschool', memberScaleCodes: ['inhibit_p', 'shift_p', 'emotional_control_p', 'working_memory_p', 'plan_organize_p'], description: '所有临床量表总聚合' },

  // BRIEF-2
  { code: 'bri', name: '行为调节指数', version: 'school', memberScaleCodes: ['inhibit', 'self_monitor'], description: '抑制与自我监控聚合' },
  { code: 'eri', name: '情感调节指数', version: 'school', memberScaleCodes: ['shift', 'emotional_control'], description: '转换与情感控制聚合' },
  { code: 'cri', name: '认知调节指数', version: 'school', memberScaleCodes: ['initiate', 'working_memory', 'plan_organize', 'task_monitor', 'organization_of_materials'], description: '发起/记忆/计划/监控/物品组织聚合' },
  { code: 'gec', name: '全局执行复合', version: 'school', memberScaleCodes: ['inhibit', 'self_monitor', 'shift', 'emotional_control', 'initiate', 'working_memory', 'plan_organize', 'task_monitor', 'organization_of_materials'], description: '所有临床量表总聚合' },
]

// ============================================================================
// 题库（DRAFT：每个临床量表 3 道自编题目，构造对齐，全正向计分）
// ============================================================================

export const briefQuestions: BriefQuestion[] = [
  // ---- BRIEF-P 学前 ----
  { id: 1, version: 'preschool', dimension: 'inhibit_p', dimensionName: '抑制', content: '孩子很难在需要时停下来或等待（如排队、轮流）' },
  { id: 2, version: 'preschool', dimension: 'inhibit_p', dimensionName: '抑制', content: '孩子经常还没听完指令就急着行动' },
  { id: 3, version: 'preschool', dimension: 'inhibit_p', dimensionName: '抑制', content: '孩子会打断别人说话或正在进行的游戏' },

  { id: 4, version: 'preschool', dimension: 'shift_p', dimensionName: '转换', content: '孩子从一个活动转到另一个活动时很困难或哭闹' },
  { id: 5, version: 'preschool', dimension: 'shift_p', dimensionName: '转换', content: '孩子对日常变化（如换路线、换座位）反应强烈' },
  { id: 6, version: 'preschool', dimension: 'shift_p', dimensionName: '转换', content: '孩子会反复纠结同一件事，难以转移注意力' },

  { id: 7, version: 'preschool', dimension: 'emotional_control_p', dimensionName: '情感控制', content: '孩子的情绪容易突然爆发或大起大落' },
  { id: 8, version: 'preschool', dimension: 'emotional_control_p', dimensionName: '情感控制', content: '孩子遇到小挫折也会大哭或大闹' },
  { id: 9, version: 'preschool', dimension: 'emotional_control_p', dimensionName: '情感控制', content: '孩子很难从坏情绪里平复下来' },

  { id: 10, version: 'preschool', dimension: 'working_memory_p', dimensionName: '工作记忆', content: '孩子听完两三步指令后，只能记住第一步' },
  { id: 11, version: 'preschool', dimension: 'working_memory_p', dimensionName: '工作记忆', content: '孩子做事做到一半就忘了原本要做什么' },
  { id: 12, version: 'preschool', dimension: 'working_memory_p', dimensionName: '工作记忆', content: '孩子很难同时记住几样东西（如"拿杯子再去叫妈妈"）' },

  { id: 13, version: 'preschool', dimension: 'plan_organize_p', dimensionName: '计划与组织', content: '孩子做事情没有先后，常常手忙脚乱' },
  { id: 14, version: 'preschool', dimension: 'plan_organize_p', dimensionName: '计划与组织', content: '孩子很难为一件稍复杂的事做准备' },
  { id: 15, version: 'preschool', dimension: 'plan_organize_p', dimensionName: '计划与组织', content: '孩子收拾玩具或物品时需要大量帮助' },

  // ---- BRIEF-2 学龄 ----
  { id: 16, version: 'school', dimension: 'inhibit', dimensionName: '抑制', content: '孩子在课堂上管不住嘴，经常脱口而出或插话' },
  { id: 17, version: 'school', dimension: 'inhibit', dimensionName: '抑制', content: '孩子难以控制冲动，会做出危险或不当举动' },
  { id: 18, version: 'school', dimension: 'inhibit', dimensionName: '抑制', content: '孩子很难排队等待或轮流' },

  { id: 19, version: 'school', dimension: 'self_monitor', dimensionName: '自我监控', content: '孩子意识不到自己的行为影响到了别人' },
  { id: 20, version: 'school', dimension: 'self_monitor', dimensionName: '自我监控', content: '孩子不明白为什么同学会对他生气' },
  { id: 21, version: 'school', dimension: 'self_monitor', dimensionName: '自我监控', content: '孩子做事时不清楚自己做得对不对' },

  { id: 22, version: 'school', dimension: 'shift', dimensionName: '转换', content: '孩子转换科目或任务时明显拖延或抗拒' },
  { id: 23, version: 'school', dimension: 'shift', dimensionName: '转换', content: '孩子对计划外的变化反应过激' },
  { id: 24, version: 'school', dimension: 'shift', dimensionName: '转换', content: '孩子会卡在某个想法上难以转换' },

  { id: 25, version: 'school', dimension: 'emotional_control', dimensionName: '情感控制', content: '孩子遇到不顺就情绪失控' },
  { id: 26, version: 'school', dimension: 'emotional_control', dimensionName: '情感控制', content: '孩子情绪波动大，容易激动或低落' },
  { id: 27, version: 'school', dimension: 'emotional_control', dimensionName: '情感控制', content: '孩子被批评后很难恢复平静' },

  { id: 28, version: 'school', dimension: 'initiate', dimensionName: '任务发起', content: '孩子开始做作业或任务总需要反复催促' },
  { id: 29, version: 'school', dimension: 'initiate', dimensionName: '任务发起', content: '孩子面对任务不知从何下手' },
  { id: 30, version: 'school', dimension: 'initiate', dimensionName: '任务发起', content: '孩子需要别人帮他"开个头"才能开始' },

  { id: 31, version: 'school', dimension: 'working_memory', dimensionName: '工作记忆', content: '孩子记不住多步指令，常漏步骤' },
  { id: 32, version: 'school', dimension: 'working_memory', content: '孩子读到题目后半段就忘了前半段', dimensionName: '工作记忆' },
  { id: 33, version: 'school', dimension: 'working_memory', dimensionName: '工作记忆', content: '孩子边做边忘，需要不断提醒' },

  { id: 34, version: 'school', dimension: 'plan_organize', dimensionName: '计划与组织', content: '孩子做作业没有计划，东一下西一下' },
  { id: 35, version: 'school', dimension: 'plan_organize', dimensionName: '计划与组织', content: '孩子不会把大任务拆成小步骤' },
  { id: 36, version: 'school', dimension: 'plan_organize', dimensionName: '计划与组织', content: '孩子常常漏带东西或记错时间' },

  { id: 37, version: 'school', dimension: 'task_monitor', dimensionName: '任务监控', content: '孩子不检查作业，常犯粗心错误' },
  { id: 38, version: 'school', dimension: 'task_monitor', dimensionName: '任务监控', content: '孩子完成任务的途中跑题' },
  { id: 39, version: 'school', dimension: 'task_monitor', dimensionName: '任务监控', content: '孩子不清楚自己有没有完成任务' },

  { id: 40, version: 'school', dimension: 'organization_of_materials', dimensionName: '物品组织', content: '孩子的书桌、书包总是很乱' },
  { id: 41, version: 'school', dimension: 'organization_of_materials', dimensionName: '物品组织', content: '孩子经常找不到自己的东西' },
  { id: 42, version: 'school', dimension: 'organization_of_materials', dimensionName: '物品组织', content: '孩子的物品没有固定归放位置' },
]

// ============================================================================
// 计分选项（1-3 三点：从不 / 有时 / 经常；得分越高 = 困难越多）
// ============================================================================

export const briefScoring: BriefScoringOption[] = [
  { score: 1, label: '从不', description: '该项行为从不出现' },
  { score: 2, label: '有时', description: '该项行为偶尔出现' },
  { score: 3, label: '经常', description: '该项行为经常出现' },
]

// ============================================================================
// T 分等级（T 分越高 = 执行功能困难越多；阈值参考 BRIEF 临床惯例，常模为 DRAFT）
// ============================================================================

export const briefLevels: BriefLevel[] = [
  { minT: 0, level: '良好', levelCode: 'typical', description: '执行功能总体在典型范围' },
  { minT: 60, level: '轻度风险', levelCode: 'slightly_elevated', description: '部分维度略高于典型，建议关注' },
  { minT: 65, level: '中度风险', levelCode: 'elevated', description: '存在较明显的执行功能困难，建议进一步评估' },
  { minT: 70, level: '显著风险', levelCode: 'clinically_significant', description: '执行功能困难显著，建议转介专业评估与干预' },
]

// ============================================================================
// 按等级的反馈建议
// ============================================================================

export const briefRecommendations: BriefRecommendation[] = [
  {
    level: '良好',
    general_comment: '该儿童执行功能各维度总体处于典型范围，日常学习与生活的自我管理能力发展良好。',
    suggestions: [
      '继续保持现有的日常作息与学习习惯，提供适度挑战以巩固执行功能',
      '在家庭与学校创设需要计划、等待与转换的自然情境，给予正向反馈',
    ],
  },
  {
    level: '轻度风险',
    general_comment: '个别维度略高于典型，提示在特定执行功能环节存在轻微困难，可由家庭与学校协同给予支持。',
    suggestions: [
      '针对得分偏高的维度，在日常生活中提供结构化提示与可视化清单',
      '将多步任务拆解为小步骤并逐步退除辅助',
      '关注情绪与转换困难信号，提前预告变化以降低不适应',
    ],
  },
  {
    level: '中度风险',
    general_comment: '该儿童存在较明显的执行功能困难，可能影响学习与社交，建议进一步专业评估并制定针对性支持计划。',
    suggestions: [
      '建议结合学校表现与专业评估，制定执行功能专项支持计划',
      '在工作记忆、计划组织等弱势维度提供外部脚手架（清单、计时、分步）',
      '与教师协同建立一致的课堂支持策略（座位、指令拆分、提醒）',
    ],
  },
  {
    level: '显著风险',
    general_comment: '该儿童执行功能困难显著，已在多个维度明显影响日常功能，建议尽快转介专业评估与系统干预。',
    suggestions: [
      '建议转介具备资质的心理 / 发育行为专业机构进行系统评估',
      '在专业指导下制定个体化干预方案，并定期追踪进展',
      '家庭与学校共同营造低负荷、高结构的环境，优先稳定情绪与基本作息',
    ],
  },
]
