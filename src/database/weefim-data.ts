// WeeFIM量表数据（18道题目）

export interface WeeFIMCategory {
  id: number;
  name: string;
  description: string;
}

export interface WeeFIMQuestion {
  id: number;
  category_id: number;
  title: string;
  dimension: string;  // 运动或认知
  audio?: string;
}

// WeeFIM量表分类
export const weefimCategories: WeeFIMCategory[] = [
  { id: 1, name: '自我照顾', description: '进食、梳洗修饰、洗澡、穿衣、如厕等日常生活能力' },
  { id: 2, name: '括约肌控制', description: '排尿管理、排便管理' },
  { id: 3, name: '转移', description: '床椅转移、如厕转移、浴盆转移' },
  { id: 4, name: '行走', description: '步行/轮椅、楼梯' },
  { id: 5, name: '沟通', description: '理解、表达' },
  { id: 6, name: '社会认知', description: '社会交往、问题解决、记忆' }
];

// WeeFIM量表18道题目
export const weefimQuestions: WeeFIMQuestion[] = [
  // 自我照顾（6题）- 运动功能
  { id: 1, category_id: 1, title: '进食', dimension: '运动功能' },
  { id: 2, category_id: 1, title: '梳洗修饰', dimension: '运动功能' },
  { id: 3, category_id: 1, title: '洗澡', dimension: '运动功能' },
  { id: 4, category_id: 1, title: '穿上衣', dimension: '运动功能' },
  { id: 5, category_id: 1, title: '穿裤子', dimension: '运动功能' },
  { id: 6, category_id: 1, title: '上厕所', dimension: '运动功能' },

  // 括约肌控制（2题）- 运动功能
  { id: 7, category_id: 2, title: '排尿控制', dimension: '运动功能' },
  { id: 8, category_id: 2, title: '排便控制', dimension: '运动功能' },

  // 转移（3题）- 运动功能
  { id: 9, category_id: 3, title: '床椅转移', dimension: '运动功能' },
  { id: 10, category_id: 3, title: '轮椅转移', dimension: '运动功能' },
  { id: 11, category_id: 3, title: '进出浴盆/淋浴间', dimension: '运动功能' },

  // 行走（2题）- 运动功能
  { id: 12, category_id: 4, title: '步行/上下楼梯', dimension: '运动功能' },
  { id: 13, category_id: 4, title: '使用轮椅', dimension: '运动功能' },

  // 沟通（2题）- 认知功能
  { id: 14, category_id: 5, title: '理解（听觉/视觉/两者）', dimension: '认知功能' },
  { id: 15, category_id: 5, title: '表达（言语/非言语/两者）', dimension: '认知功能' },

  // 社会认知（3题）- 认知功能
  { id: 16, category_id: 6, title: '社会交往', dimension: '认知功能' },
  { id: 17, category_id: 6, title: '解决问题', dimension: '认知功能' },
  { id: 18, category_id: 6, title: '记忆', dimension: '认知功能' }
];

// 评分标准（1-7分详细说明）
export interface WeeFIMScoring {
  score: number;
  level: string;
  description: string;
}

export const weefimScoring: WeeFIMScoring[] = [
  {
    score: 7,
    level: '完全独立',
    description: '能独立完成各项活动，无需他人协助、提醒或准备，在合理时间内完成'
  },
  {
    score: 6,
    level: '基本独立',
    description: '能独立完成大部分活动，但在准备活动、使用辅助设备或完成时间上需要较小的协助'
  },
  {
    score: 5,
    level: '监护或准备',
    description: '在大部分情况下能独立完成，但偶尔需要他人提醒或少量身体辅助'
  },
  {
    score: 4,
    level: '中度帮助',
    description: '需要中度协助才能完成，他人帮忙部分动作，自己能完成另一部分'
  },
  {
    score: 3,
    level: '重度帮助',
    description: '需要大量协助，他人完成大部分动作，仅能完成少量简单动作'
  },
  {
    score: 2,
    level: '极重度帮助',
    description: '只能进行极少量的自主动作，大部分依赖他人完成'
  },
  {
    score: 1,
    level: '完全依赖',
    description: '完全不能自主完成，完全依赖他人'
  }
];

// 功能独立性等级划分（基于官方标准）
export interface WeeFIMLevel {
  range: string;
  level: string;
  description: string;
}

export const weefimLevels: WeeFIMLevel[] = [
  {
    range: '126-126',
    level: '完全独立',
    description: '所有项目均能完全独立完成，无需任何辅助。'
  },
  {
    range: '125-108',
    level: '基本独立',
    description: '能独立完成绝大部分项目，仅个别项目需辅助器具或额外时间。'
  },
  {
    range: '107-90',
    level: '极轻度依赖',
    description: '绝大多数项目能独立完成，仅个别较复杂项目需轻微协助或提示。'
  },
  {
    range: '89-72',
    level: '轻度依赖',
    description: '多数项目能独立完成，部分项目需最小至中度协助。'
  },
  {
    range: '71-54',
    level: '中度依赖',
    description: '约半数项目需中度协助，部分项目需较多协助。'
  },
  {
    range: '53-36',
    level: '重度依赖',
    description: '多数项目需大量协助，仅少数简单动作能部分自主完成。'
  },
  {
    range: '35-18',
    level: '极重度依赖',
    description: '几乎所有日常生活与认知任务都完全依赖他人照顾。'
  }
];

// 评语建议类型
export interface WeeFIMRecommendation {
  level: string;
  general_comment: string;
  suggestions: string[];
  domain_suggestions?: {
    self_care?: string[];
    bladder_control?: string[];
    bowel_control?: string[];
    transfer?: string[];
    locomotion?: string[];
    communication?: string[];
    social_cognition?: string[];
  };
}

// 评语建议（基于官方标准更新）
export const weefimRecommendations: WeeFIMRecommendation[] = [
  {
    level: '完全独立',
    general_comment: '该儿童能完全独立完成所有日常生活活动与认知任务，无需他人协助，建议继续保持并拓展更具挑战性的能力。',
    suggestions: [
      '继续鼓励儿童保持并拓展新的技能',
      '给予更多具有挑战性的任务，进一步提升能力',
      '在家庭和学校环境中，给予更多自主空间',
      '培养独立决策和解决复杂问题的能力'
    ]
  },
  {
    level: '基本独立',
    general_comment: '该儿童能独立完成绝大部分日常活动与认知任务，仅在极少数复杂项目上偶需辅助器具或少量提示。',
    suggestions: [
      '针对个别需要辅助的项目进行有针对性的训练',
      '逐步减少辅助器具的使用，提升自主完成度',
      '多提供实践机会，巩固和强化已有的能力',
      '在家庭和学校环境中创造更多独立完成任务的机会'
    ]
  },
  {
    level: '极轻度依赖',
    general_comment: '该儿童绝大多数项目能独立完成，仅个别较复杂项目需要轻微协助或提示。',
    suggestions: [
      '针对薄弱环节进行有针对性的训练',
      '加强复杂衣物穿戴、深入沟通与问题解决等较难项目的练习',
      '多提供实践机会，巩固和强化已有的能力',
      '在家庭和学校环境中创造更多独立完成任务的机会'
    ]
  },
  {
    level: '轻度依赖',
    general_comment: '该儿童多数项目能独立完成，部分项目需要最小到中度协助。',
    suggestions: [
      '制定系统的训练计划，重点提升需要协助的项目',
      '采用循序渐进的方式，从简单任务开始逐步增加难度',
      '针对自我照顾、移动、沟通等关键领域进行专项训练',
      '家庭和学校应给予适当支持，鼓励独立完成'
    ]
  },
  {
    level: '中度依赖',
    general_comment: '该儿童约半数项目需要中度协助，部分项目需要较多协助才能完成。',
    suggestions: [
      '制定系统的康复或训练计划',
      '重点提升自我照顾、移动、沟通等关键领域能力',
      '采用循序渐进的方式，从简单任务开始，逐步增加难度',
      '家庭和学校应给予更多支持和鼓励，营造积极的学习环境'
    ]
  },
  {
    level: '重度依赖',
    general_comment: '该儿童多数项目需要大量协助，仅少数简单动作能部分自主完成。',
    suggestions: [
      '寻求专业康复治疗师或特殊教育教师的帮助，制定个性化干预方案',
      '注重基础技能的训练，采用多种教学方法和辅助工具',
      '从最基础的动作和认知训练入手，积极开展康复训练',
      '保持耐心，给予儿童充分的时间和积极的反馈'
    ]
  },
  {
    level: '极重度依赖',
    general_comment: '该儿童几乎所有日常生活与认知任务都完全依赖他人照顾。',
    suggestions: [
      '保证儿童的基本生活需求，持续进行康复训练',
      '训练内容从简单的感觉刺激、被动运动等开始',
      '家庭和社会应提供全方位的支持，创造舒适、安全的生活环境',
      '关注儿童的心理需求，给予足够的关爱和陪伴'
    ]
  }
];

// 根据分数获取评分等级和描述
export function getWeeFIMLevelAndDescription(score: number): WeeFIMLevel {
  // 按分数从高到低查找
  for (const level of weefimLevels) {
    const [high, low] = level.range.split('-').map(Number);
    if (high !== undefined && low !== undefined && score <= high && score >= low) {
      return level;
    }
  }
  // 如果没有找到，返回最低等级
  return weefimLevels[weefimLevels.length - 1] ?? weefimLevels[0]!;
}

// 计算各维度得分
export function calculateWeeFIMScores(answers: Record<number, number>): {
  total_score: number;
  motor_score: number;
  cognitive_score: number;
  level: WeeFIMLevel;
  recommendation: WeeFIMRecommendation;
} {
  // 计算运动功能得分（前13题）
  const motorQuestions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  let motor_score = 0;
  motorQuestions.forEach(qid => {
    motor_score += answers[qid] || 1;  // 默认最低分1分
  });

  // 计算认知功能得分（后5题）
  const cognitiveQuestions = [14, 15, 16, 17, 18];
  let cognitive_score = 0;
  cognitiveQuestions.forEach(qid => {
    cognitive_score += answers[qid] || 1;  // 默认最低分1分
  });

  // 计算总分
  const total_score = motor_score + cognitive_score;

  // 确定功能等级
  const level = getWeeFIMLevelAndDescription(total_score);

  // 获取评语建议
  const recommendation = weefimRecommendations.find(r => r.level === level.level)
    ?? weefimRecommendations[weefimRecommendations.length - 1]
    ?? weefimRecommendations[0]!;

  return {
    total_score,
    motor_score,
    cognitive_score,
    level,
    recommendation
  };
}

// 初始化WeeFIM数据
export function initWeeFIMData(db: any) {
  // 插入分类数据
  weefimCategories.forEach(category => {
    db.run(`
      INSERT INTO weefim_category (id, name, description)
      VALUES (?, ?, ?)
    `, [category.id, category.name, category.description]);
  });

  // 插入题目数据
  weefimQuestions.forEach(question => {
    db.run(`
      INSERT INTO weefim_question (id, category_id, title, dimension)
      VALUES (?, ?, ?, ?)
    `, [question.id, question.category_id, question.title, question.dimension]);
  });

  console.log(`已插入 ${weefimCategories.length} 个WeeFIM分类和 ${weefimQuestions.length} 道题目`);
}
