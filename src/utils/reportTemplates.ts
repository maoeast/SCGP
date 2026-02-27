/**
 * 评估报告模板工具
 * 用于生成标准化的评估报告
 */

export interface SMReportData {
  student: {
    name: string;
    gender: 'male' | 'female';
    age: number;
    birthday: string;
  };
  assessment: {
    id: string;
    date: string;
    raw_score: number;
    sq_score: number;
    level: string;
    age_stage: string;
  };
  dimensions: {
    communication: { pass: number; total: number };
    work: { pass: number; total: number };
    movement: { pass: number; total: number };
    independent_life: { pass: number; total: number };
    self_management: { pass: number; total: number };
    group_activity: { pass: number; total: number };
  };
  answers: Record<number, number>;
}

export interface WeeFIMReportData {
  student: {
    name: string;
    gender: 'male' | 'female';
    age: number;
    birthday: string;
  };
  assessment: {
    id: string;
    date: string;
    total_score: number;
    motor_score: number;
    cognitive_score: number;
    level: {
      level: number | string;  // 支持数字或字符串
      motor_level?: number;
      cognitive_level?: number;
      range?: string;
      description?: string;
    };
  };
  categories: {
    selfcare: { score: number; items: Array<{ title: string; score: number }> };
    sphincter: { score: number; items: Array<{ title: string; score: number }> };
    transfer: { score: number; items: Array<{ title: string; score: number }> };
    locomotion: { score: number; items: Array<{ title: string; score: number }> };
    communication: { score: number; items: Array<{ title: string; score: number }> };
    social_cognition: { score: number; items: Array<{ title: string; score: number }> };
  };
  answers: Record<number, number>;
}

/**
 * S-M量表评估报告模板
 */
export const SMReportTemplate = {
  // 报告标题
  title: '婴儿-初中生社会生活能力量表评估报告',
  subtitle: 'S-M量表评估报告',

  // 结果等级映射
  levels: {
    extremely_severe: {
      text: '极重度',
      description: '社会生活能力严重不足，在多个领域都需要大量的支持和帮助。',
      trainingFocus: '重点培养基本的自我照料能力，如进食、如厕等。',
      color: '#f56c6c'
    },
    severe: {
      text: '重度',
      description: '社会生活能力显著不足，需要持续的支持和指导。',
      trainingFocus: '重点提升基本生活技能和简单的社交互动。',
      color: '#e65d6e'
    },
    moderate: {
      text: '中度',
      description: '社会生活能力中度不足，在某些领域需要支持。',
      trainingFocus: '重点加强日常生活自理能力和基础的社交技能。',
      color: '#e6a23c'
    },
    mild: {
      text: '轻度',
      description: '社会生活能力轻度不足，在特定情况下可能需要支持。',
      trainingFocus: '重点提升复杂的生活技能和社交适应能力。',
      color: '#eebc54'
    },
    borderline: {
      text: '边缘',
      description: '社会生活能力处于边缘水平，接近正常但仍有不足。',
      trainingFocus: '重点巩固现有能力，提升独立完成任务的信心。',
      color: '#f1e05a'
    },
    normal: {
      text: '正常',
      description: '社会生活能力在正常范围内，能够独立完成大部分日常活动。',
      trainingFocus: '维持和提升现有的生活技能，培养更高阶的能力。',
      color: '#b3e19d'
    },
    good: {
      text: '良好',
      description: '社会生活能力良好，在大多数情况下表现独立。',
      trainingFocus: '鼓励探索新技能，培养领导力和创造力。',
      color: '#67c23a'
    },
    excellent: {
      text: '优秀',
      description: '社会生活能力优秀，表现出超越同龄人的独立能力。',
      trainingFocus: '提供挑战性任务，培养综合能力和创新思维。',
      color: '#30b08f'
    },
    outstanding: {
      text: '非常优秀',
      description: '社会生活能力非常优秀，表现出卓越的独立能力和适应能力。',
      trainingFocus: '提供高级挑战，培养专业技能和社会责任感。',
      color: '#13ce66'
    }
  },

  // 训练建议模板
  trainingSuggestions: {
    extremely_severe: [
      '采用任务分解法，将复杂技能分解为简单步骤',
      '使用视觉提示和物理辅助帮助完成动作',
      '建立固定的日常生活规律',
      '及时奖励和强化积极行为'
    ],
    severe: [
      '继续使用任务分解和视觉支持',
      '逐步减少物理辅助，增加口头提示',
      '在安全环境中练习生活技能',
      '培养简单的沟通技能'
    ],
    moderate: [
      '练习多步骤的生活技能',
      '培养时间管理和组织能力',
      '参与小组活动，提升社交技能',
      '学习解决简单问题'
    ],
    mild: [
      '学习独立完成复杂的生活任务',
      '培养批判性思维和决策能力',
      '参与社区活动，增强社会适应',
      '学习情绪管理和压力应对'
    ],
    borderline: [
      '在熟悉环境中巩固技能',
      '逐步尝试在新环境中应用技能',
      '培养主动性和责任感',
      '增强自信心和独立性'
    ],
    normal: [
      '学习高级生活技能',
      '培养兴趣爱好和特长',
      '参与志愿服务，培养社会责任感',
      '学习职业规划技能'
    ],
    good: [
      '挑战更复杂的任务',
      '培养领导力和团队合作能力',
      '学习创新思维和问题解决',
      '参与竞技活动'
    ],
    excellent: [
      '设定个人成长目标',
      '学习专业技能',
      '参与创新项目',
      '培养国际化视野'
    ],
    outstanding: [
      '制定长期发展规划',
      '参与社会实践和研究',
      '培养战略思维',
      '追求卓越成就'
    ]
  },

  // 家庭指导建议
  familyGuidance: {
    extremely_severe: [
      '创造安全、有序的家庭环境',
      '建立可预测的日常作息',
      '使用清晰的指令和视觉提示',
      '保持耐心和一致性'
    ],
    severe: [
      '继续提供结构化的环境',
      '鼓励参与简单的家务活动',
      '使用正向行为支持策略',
      '与专业团队保持密切沟通'
    ],
    moderate: [
      '逐步增加责任和期望',
      '提供选择的机会',
      '鼓励独立完成日常任务',
      '庆祝每一个进步'
    ],
    mild: [
      '培养良好的生活习惯',
      '鼓励参与家庭决策',
      '提供适当的挑战',
      '培养兴趣爱好'
    ],
    borderline: [
      '给予更多的自主权',
      '鼓励尝试新事物',
      '提供情感支持',
      '建立积极的亲子关系'
    ],
    normal: [
      '维持良好的沟通',
      '支持个人发展',
      '培养责任感',
      '鼓励独立思考'
    ],
    good: [
      '尊重个人选择',
      '提供发展资源',
      '培养领导力',
      '鼓励追求卓越'
    ],
    excellent: [
      '提供挑战性机会',
      '支持创新尝试',
      '培养全球视野',
      '鼓励社会责任'
    ],
    outstanding: [
      '成为榜样和导师',
      '提供高级资源',
      '支持实现宏伟目标',
      '培养终身学习习惯'
    ]
  },

  // 维度名称映射
  dimensions: {
    communication: '交往',
    work: '作业',
    movement: '运动能力',
    independent_life: '独立生活能力',
    self_management: '自我管理',
    group_activity: '集体活动'
  }
};

/**
 * WeeFIM量表评估报告模板
 */
export const WeeFIMReportTemplate = {
  // 报告标题
  title: '改良儿童功能独立性评估量表报告',
  subtitle: 'WeeFIM量表评估报告',

  // 独立性等级映射
  independenceLevels: {
    1: {
      text: '完全依赖',
      description: '需要他人完成所有任务（>25%协助）',
      detail: '学生完全依赖他人，需要他人完成所有任务。需要全面的护理和支持。',
      color: '#f56c6c'
    },
    2: {
      text: '最大依赖',
      description: '需要最大协助（25-50%协助）',
      detail: '学生需要最大程度的协助，仅能完成极少部分任务。需要持续的监督和物理帮助。',
      color: '#e65d6e'
    },
    3: {
      text: '中度依赖',
      description: '需要中度协助（>50%协助）',
      detail: '学生需要中度的协助，能够完成部分任务但需要大量帮助。需要定时的支持和指导。',
      color: '#e6a23c'
    },
    4: {
      text: '最小依赖',
      description: '需要最小协助（<25%协助）',
      detail: '学生需要最小的协助，基本能够独立完成任务，仅在特定情况下需要帮助。',
      color: '#eebc54'
    },
    5: {
      text: '监督/准备',
      description: '需要监督或准备',
      detail: '学生需要监督或准备，能够独立完成任务但需要他人准备或监督。',
      color: '#b3e19d'
    },
    6: {
      text: '基本独立',
      description: '需要辅助设备或额外时间',
      detail: '学生基本独立，可能需要辅助设备或额外时间完成某些任务。',
      color: '#67c23a'
    },
    7: {
      text: '完全独立',
      description: '完全独立，无需协助',
      detail: '学生完全独立，能够在合理时间内安全地完成所有任务，无需任何协助。',
      color: '#13ce66'
    }
  },

  // 功能独立性水平等级（基于总分）
  functionalLevels: {
    '极强': {
      text: '功能独立性极强',
      range: '126-108分',
      description: '儿童功能独立性极强，在日常生活活动和认知功能方面都能独立完成各种任务，与同龄人相比表现优秀。',
      detail: '所有项目都能独立完成，无需任何协助。学生表现出完全的自主性和独立性。',
      color: '#13ce66',
      suggestions: [
        '继续鼓励儿童保持并拓展新的技能',
        '给予更多具有挑战性的任务，进一步提升能力',
        '在家庭和学校环境中，给予更多自主空间',
        '培养独立决策和解决复杂问题的能力'
      ]
    },
    '良好': {
      text: '功能独立性良好',
      range: '107-90分',
      description: '儿童功能独立性良好，能独立完成大部分日常活动和认知任务，但在某些较为复杂的项目上可能需要一些轻微协助或提示。',
      detail: '大部分项目能独立完成，个别项目需要监督或准备。学生在日常活动中表现出高度的自主性。',
      color: '#67c23a',
      suggestions: [
        '针对薄弱环节进行有针对性的训练',
        '加强复杂衣物的穿戴练习',
        '进行更深入的沟通和问题解决训练',
        '多提供实践机会，巩固和强化已有的能力'
      ]
    },
    '中等': {
      text: '功能独立性中等',
      range: '89-72分',
      description: '儿童功能独立性中等，在日常生活和认知功能上既有一定的自主能力，又在多个方面需要不同程度的协助。',
      detail: '部分项目需要最小或中度辅助。学生能够独立完成大部分任务，但在某些复杂任务中需要协助。',
      color: '#eebc54',
      suggestions: [
        '制定系统的康复或训练计划',
        '重点提升自我照顾、移动、沟通等关键领域能力',
        '采用循序渐进的方式，从简单任务开始，逐步增加难度',
        '家庭和学校应给予更多支持和鼓励，营造积极的学习环境'
      ]
    },
    '较弱': {
      text: '功能独立性较弱',
      range: '71-54分',
      description: '儿童功能独立性较弱，在日常生活活动和认知功能方面存在明显的功能障碍，需要较多的协助才能完成基本任务。',
      detail: '多数项目需要中度或最大辅助。学生需要持续的支持才能完成日常活动。',
      color: '#e6a23c',
      suggestions: [
        '寻求专业的康复治疗师或特殊教育教师的帮助',
        '进行全面的评估和制定个性化的干预方案',
        '注重基础技能的训练',
        '采用多种教学方法和辅助工具，提高儿童的学习效果'
      ]
    },
    '非常弱': {
      text: '功能独立性非常弱',
      range: '53-36分',
      description: '儿童功能独立性非常弱，大部分日常生活和认知任务都依赖他人完成。',
      detail: '大部分项目需要最大辅助或完全依赖。学生在大多数活动中需要大量帮助。',
      color: '#e65d6e',
      suggestions: [
        '着重关注儿童的基本需求满足，确保其生活质量',
        '积极开展康复训练，从最基础的动作和认知训练入手',
        '保持耐心，给予儿童充分的时间和积极的反馈',
        '家庭和社会应提供全方位的支持，为儿童创造舒适、安全的生活环境'
      ]
    },
    '极度弱': {
      text: '功能独立性极度弱',
      range: '35-18分',
      description: '儿童功能独立性极度弱，几乎完全依赖他人照顾。',
      detail: '所有项目都需要完全依赖他人。学生无法独立完成任何任务。',
      color: '#f56c6c',
      suggestions: [
        '保证儿童的基本生活需求外，持续进行康复训练',
        '虽然进步可能较为缓慢，但任何微小的进步都对儿童意义重大',
        '训练内容从简单的感觉刺激、被动运动等开始',
        '关注儿童的心理需求，给予足够的关爱和陪伴'
      ]
    }
  },

  // 评分等级映射
  scoreLevels: {
    7: { text: '完全独立', assistance: '无需协助' },
    6: { text: '基本独立', assistance: '需要辅助设备' },
    5: { text: '监督', assistance: '需要口头提示' },
    4: { text: '最小依赖', assistance: '需要最小协助' },
    3: { text: '中度依赖', assistance: '需要中度协助' },
    2: { text: '最大依赖', assistance: '需要最大协助' },
    1: { text: '完全依赖', assistance: '完全依赖' }
  },

  // 评估类别映射
  categories: {
    selfcare: {
      name: '自我照顾',
      maxScore: 42,
      items: [
        '进食', '梳洗', '洗澡', '穿上衣', '穿下衣', '如厕'
      ]
    },
    sphincter: {
      name: '括约肌控制',
      maxScore: 14,
      items: [
        '膀胱管理', '肠道管理'
      ]
    },
    transfer: {
      name: '转移',
      maxScore: 21,
      items: [
        '床、椅、轮椅间转移', '坐厕转移', '浴缸、淋浴间转移'
      ]
    },
    locomotion: {
      name: '行走',
      maxScore: 14,
      items: [
        '步行/轮椅', '楼梯'
      ]
    },
    communication: {
      name: '交流',
      maxScore: 14,
      items: [
        '理解', '表达'
      ]
    },
    social_cognition: {
      name: '社会认知',
      maxScore: 21,
      items: [
        '社会交往', '解决问题', '记忆'
      ]
    }
  },

  // 康复建议模板
  rehabilitationSuggestions: {
    shortTerm: [
      '提高日常生活活动的独立性',
      '改善转移和行走能力',
      '增强交流和认知能力',
      '提升社会参与度'
    ],
    longTerm: [
      '实现最大程度的功能独立性',
      '提高生活质量',
      '促进全面发展和学习',
      '增强社会适应能力'
    ],
    training: [
      '制定个性化的康复训练计划',
      '采用任务导向的训练方法',
      '结合日常生活活动进行练习',
      '使用辅助技术设备提高独立性',
      '定期评估和调整训练方案'
    ],
    environment: [
      '改造家庭环境，提高安全性',
      '安装必要的辅助设施',
      '调整家具布局便于活动',
      '提供适应性工具和设备',
      '创造结构化的学习环境'
    ]
  },

  // 转介建议选项
  referralOptions: [
    { value: 'pt', label: '物理治疗师', description: '改善运动功能和转移能力' },
    { value: 'ot', label: '作业治疗师', description: '提高日常生活活动能力' },
    { value: 'st', label: '言语治疗师', description: '改善交流和吞咽功能' },
    { value: 'psych', label: '心理治疗师', description: '提供心理支持和行为干预' },
    { value: 'special_edu', label: '特殊教育老师', description: '制定个性化教育计划' },
    { value: 'social_worker', label: '社会工作者', description: '提供社会资源和支持' }
  ]
};

// 中文等级名称到英文键名的映射
const chineseToEnglishLevelMap: Record<string, string> = {
  '极重度': 'extremely_severe',
  '重度': 'severe',
  '中度': 'moderate',
  '轻度': 'mild',
  '边缘': 'borderline',
  '正常': 'normal',
  '高常': 'good',
  '优秀': 'excellent',
  '非常优秀': 'outstanding',
  '未知': 'normal' // 未知等级默认为正常
};

/**
 * 生成S-M量表评估报告
 */
export function generateSMReport(data: SMReportData): string {
  // 获取等级信息，转换中文等级名称为英文键名
  const chineseLevelName = data.assessment.level;
  const levelKey = chineseToEnglishLevelMap[chineseLevelName] || 'normal';
  const level = SMReportTemplate.levels[levelKey as keyof typeof SMReportTemplate.levels] || SMReportTemplate.levels.normal;

  // 如果找不到对应的等级，使用正常等级作为默认值
  const safeLevel = level || SMReportTemplate.levels.normal;

  return `
${SMReportTemplate.title}

一、基本信息
姓名：${data.student.name}
性别：${data.student.gender}
年龄：${data.student.age}岁
评估日期：${data.assessment.date}

二、评估结果
粗分：${data.assessment.raw_score}
标准分：${data.assessment.sq_score}
评定等级：${safeLevel.text}

结果说明：${safeLevel.description}

三、各维度得分
交往：${data.dimensions.communication.pass}/${data.dimensions.communication.total}
作业：${data.dimensions.work.pass}/${data.dimensions.work.total}
运动能力：${data.dimensions.movement.pass}/${data.dimensions.movement.total}
独立生活能力：${data.dimensions.independent_life.pass}/${data.dimensions.independent_life.total}
自我管理：${data.dimensions.self_management.pass}/${data.dimensions.self_management.total}
集体活动：${data.dimensions.group_activity.pass}/${data.dimensions.group_activity.total}

四、训练重点
${safeLevel.trainingFocus}

五、训练建议
${(SMReportTemplate.trainingSuggestions[levelKey as keyof typeof SMReportTemplate.trainingSuggestions] || []).join('\n')}

六、家庭训练指导
${(SMReportTemplate.familyGuidance[levelKey as keyof typeof SMReportTemplate.familyGuidance] || []).join('\n')}
  `.trim();
}

/**
 * 生成WeeFIM量表评估报告
 */
export function generateWeeFIMReport(data: WeeFIMReportData): string {
  // 获取等级信息，支持数字和字符串两种格式
  let levelText = '';
  let levelDesc = '';
  let levelDetail = '';
  let suggestions: string[] = [];

  if (typeof data.assessment.level.level === 'string') {
    // 如果是字符串（如'极强'、'良好'等），使用functionalLevels
    const functionalLevel = WeeFIMReportTemplate.functionalLevels[data.assessment.level.level as keyof typeof WeeFIMReportTemplate.functionalLevels];
    if (functionalLevel) {
      levelText = functionalLevel.text;
      levelDesc = `${functionalLevel.range} - ${functionalLevel.description}`;
      levelDetail = functionalLevel.detail;
      suggestions = functionalLevel.suggestions;
    } else {
      // 兼容旧格式
      const independenceLevel = WeeFIMReportTemplate.independenceLevels[7];
      levelText = independenceLevel.text;
      levelDesc = independenceLevel.description;
      levelDetail = independenceLevel.detail;
    }
  } else {
    // 如果是数字（1-7），使用independenceLevels
    const independenceLevel = WeeFIMReportTemplate.independenceLevels[data.assessment.level.level as keyof typeof WeeFIMReportTemplate.independenceLevels] ||
      WeeFIMReportTemplate.independenceLevels[7];
    levelText = independenceLevel.text;
    levelDesc = independenceLevel.description;
    levelDetail = independenceLevel.detail;
  }

  // 生成各领域详细得分
  const generateCategoryDetails = (category: { score: number; items: Array<{ title: string; score: number }> }) => {
    return category.items.map(item => {
      const level = WeeFIMReportTemplate.scoreLevels[item.score as keyof typeof WeeFIMReportTemplate.scoreLevels];
      return `  - ${item.title}：${item.score}/7分（${level.text}）`;
    }).join('\n');
  };

  return `
${WeeFIMReportTemplate.title}

===============================================================================

一、基本信息
-------------------------------------------------------------------------------
姓名：${data.student.name}
性别：${data.student.gender}
年龄：${data.student.age}岁
评估日期：${data.assessment.date}
评估编号：${data.assessment.id}

===============================================================================

二、评估结果总览
-------------------------------------------------------------------------------
总得分：${data.assessment.total_score}/126 分
运动功能得分：${data.assessment.motor_score}/91 分
认知功能得分：${data.assessment.cognitive_score}/35 分

===============================================================================

三、独立性等级评定
-------------------------------------------------------------------------------
功能独立性水平：${levelText}

分数范围：${levelDesc}

等级说明：
${levelDetail}

===============================================================================

四、各领域得分详情
-------------------------------------------------------------------------------
1. 自我照顾（得分：${data.categories.selfcare.score}/42）
${generateCategoryDetails(data.categories.selfcare)}

2. 括约肌控制（得分：${data.categories.sphincter.score}/14）
${generateCategoryDetails(data.categories.sphincter)}

3. 转移（得分：${data.categories.transfer.score}/21）
${generateCategoryDetails(data.categories.transfer)}

4. 行走（得分：${data.categories.locomotion.score}/14）
${generateCategoryDetails(data.categories.locomotion)}

5. 交流（得分：${data.categories.communication.score}/14）
${generateCategoryDetails(data.categories.communication)}

6. 社会认知（得分：${data.categories.social_cognition.score}/21）
${generateCategoryDetails(data.categories.social_cognition)}

===============================================================================

五、康复建议
-------------------------------------------------------------------------------
${suggestions.length > 0 ? `基于当前功能水平的专业建议：\n${suggestions.map(item => `- ${item}`).join('\n')}\n` : ''}

1. 短期目标（1-3个月）：
${WeeFIMReportTemplate.rehabilitationSuggestions.shortTerm.map(item => `- ${item}`).join('\n')}

2. 长期目标（6-12个月）：
${WeeFIMReportTemplate.rehabilitationSuggestions.longTerm.map(item => `- ${item}`).join('\n')}

3. 训练建议：
${WeeFIMReportTemplate.rehabilitationSuggestions.training.map(item => `- ${item}`).join('\n')}

4. 环境改造建议：
${WeeFIMReportTemplate.rehabilitationSuggestions.environment.map(item => `- ${item}`).join('\n')}

===============================================================================

六、专业转介建议
-------------------------------------------------------------------------------
根据评估结果，建议考虑以下专业服务：
${WeeFIMReportTemplate.referralOptions.map(option => `- ${option.label}：${option.description}`).join('\n')}

===============================================================================

七、评估频率建议
-------------------------------------------------------------------------------
- 功能独立性极度弱/非常弱：每月评估1次，密切跟踪进展
- 功能独立性较弱：每2个月评估1次
- 功能独立性中等：每3个月评估1次
- 功能独立性良好/极强：每6个月评估1次

===============================================================================

报告生成日期：${new Date().toLocaleDateString()}
本报告基于改良儿童功能独立性量表（WeeFIM）评估结果生成
  `.trim();
}