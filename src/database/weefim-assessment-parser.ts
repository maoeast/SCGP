// WeeFIM评估建议解析工具
import { AssessmentAnalyzer } from './weefim-assessment-mapper';

// 预定义的评估建议模板
export const ASSESSMENT_TEMPLATES = {
  // 总体水平建议
  general: {
    '极强': [
      '能独立完成各种任务',
      '与同龄人相比表现优秀',
      '功能独立性极强',
      '继续鼓励儿童保持并拓展新的技能',
      '给予更多具有挑战性的任务',
      '培养独立决策和解决复杂问题的能力'
    ],
    '良好': [
      '能独立完成大部分日常活动',
      '某些项目需要轻微协助或提示',
      '功能独立性良好',
      '针对薄弱环节进行有针对性的训练',
      '加强复杂衣物的穿戴练习',
      '进行更深入的沟通和问题解决训练'
    ],
    '中等': [
      '既有一定的自主能力',
      '又需要不同程度的协助',
      '功能独立性中等',
      '制定系统的康复或训练计划',
      '采用循序渐进的方式',
      '家庭和学校应给予更多支持和鼓励'
    ],
    '较弱': [
      '存在明显的功能障碍',
      '需要较多的协助才能完成基本任务',
      '功能独立性较弱',
      '寻求专业的康复治疗师帮助',
      '制定个性化的干预方案',
      '注重基础技能的训练'
    ],
    '非常弱': [
      '大部分日常和认知任务都依赖他人完成',
      '功能独立性非常弱',
      '着重关注儿童的基本需求满足',
      '从最基础的动作和认知训练入手',
      '家庭和社会应提供全方位的支持'
    ],
    '极度弱': [
      '几乎完全依赖他人照顾',
      '功能独立性极度弱',
      '持续进行康复训练',
      '从简单的感觉刺激、被动运动开始',
      '关注儿童的心理需求'
    ]
  },

  // 各领域具体建议
  domains: {
    self_care: {
      high: ['独立完成', '无需协助', '能熟练操作', '符合正常习惯'],
      medium: ['需要轻微协助', '偶尔提醒', '基本能完成', '较小帮助'],
      low: ['需要大量协助', '依赖他人', '只能完成简单', '需要帮助']
    },
    bladder_bowel: {
      high: ['完全自主控制', '白天晚上都不失禁', '能及时表达需求'],
      medium: ['基本能控制', '偶尔失禁', '需要提醒'],
      low: ['经常失禁', '需要使用尿布', '不能表达需求']
    },
    transfer: {
      high: ['独立转移', '无需协助', '能自主完成'],
      medium: ['需要轻微扶持', '基本能完成', '较小协助'],
      low: ['需要大量帮助', '依赖他人', '不能独立完成']
    },
    locomotion: {
      high: ['独立行走50米', '无需协助', '姿势正常'],
      medium: ['需要辅助工具', '短距离行走', '需要监护'],
      low: ['无法独立行走', '依赖轮椅', '需要抱']
    },
    communication: {
      high: ['理解复杂指令', '表达清晰流畅', '与同龄人相当'],
      medium: ['理解简单指令', '表达基本需求', '需要手势辅助'],
      low: ['仅能理解简单词句', '表达困难', '主要依靠手势']
    },
    social_cognition: {
      high: ['主动社交互动', '遵守社交规则', '能独立解决问题'],
      medium: ['能参与简单互动', '需要指导', '解决简单问题'],
      low: ['社交困难', '不理解规则', '不能独立解决问题']
    }
  }
};

// 评估文本解析器
export class WeeFIMAssessmentParser {

  // 解析评估文本并提取关键信息
  static parseAssessmentText(text: string): {
    overallLevel: string;
    domainAssessments: Record<string, string[]>;
    extractedScores: Record<number, number>;
  } {
    const overallLevel = this.extractOverallLevel(text);
    const domainAssessments = this.extractDomainAssessments(text);
    const extractedScores = AssessmentAnalyzer.comprehensiveAnalysis(
      text,
      overallLevel,
      domainAssessments
    );

    return {
      overallLevel,
      domainAssessments,
      extractedScores
    };
  }

  // 提取总体水平
  private static extractOverallLevel(text: string): string {
    const lowerText = text.toLowerCase();

    // 根据关键词判断总体水平
    if (lowerText.includes('极强') || lowerText.includes('表现优秀') || lowerText.includes('完全独立')) {
      return '极强';
    }
    if (lowerText.includes('良好') || lowerText.includes('大部分独立') || lowerText.includes('轻微协助')) {
      return '良好';
    }
    if (lowerText.includes('中等') || lowerText.includes('既有自主') || lowerText.includes('需要协助')) {
      return '中等';
    }
    if (lowerText.includes('较弱') || lowerText.includes('功能障碍') || lowerText.includes('较多协助')) {
      return '较弱';
    }
    if (lowerText.includes('非常弱') || lowerText.includes('大部分依赖') || lowerText.includes('基本需求')) {
      return '非常弱';
    }
    if (lowerText.includes('极度弱') || lowerText.includes('完全依赖') || lowerText.includes('几乎完全')) {
      return '极度弱';
    }

    // 默认返回中等
    return '中等';
  }

  // 提取各领域评估
  private static extractDomainAssessments(text: string): Record<string, string[]> {
    const assessments: Record<string, string[]> = {};
    const sentences = text.split(/[。！？；]/); // 按句子分割

    // 自我照顾相关
    assessments.self_care = sentences.filter(s =>
      s.includes('进食') || s.includes('梳洗') || s.includes('洗澡') ||
      s.includes('穿衣') || s.includes('如厕') || s.includes('自我照顾')
    );

    // 括约肌控制相关
    const bladder_bowel = sentences.filter(s =>
      s.includes('排尿') || s.includes('排便') || s.includes('失禁') ||
      s.includes('控制') || s.includes('括约肌')
    );
    assessments.bladder_control = bladder_bowel;
    assessments.bowel_control = bladder_bowel;

    // 转移相关
    assessments.transfer = sentences.filter(s =>
      s.includes('转移') || s.includes('床椅') || s.includes('轮椅') ||
      s.includes('浴盆') || s.includes('淋浴')
    );

    // 行走相关
    assessments.locomotion = sentences.filter(s =>
      s.includes('步行') || s.includes('行走') || s.includes('楼梯') ||
      s.includes('轮椅') || s.includes('移动')
    );

    // 沟通相关
    assessments.communication = sentences.filter(s =>
      s.includes('理解') || s.includes('表达') || s.includes('沟通') ||
      s.includes('语言') || s.includes('交流')
    );

    // 社会认知相关
    assessments.social_cognition = sentences.filter(s =>
      s.includes('社会') || s.includes('交往') || s.includes('解决问题') ||
      s.includes('记忆') || s.includes('认知')
    );

    return assessments;
  }

  // 将评估建议转换为具体的评分
  static convertRecommendationsToScores(
    recommendations: string[],
    questionIds: number[]
  ): Record<number, number> {
    const text = recommendations.join(' ');
    const results: Record<number, number> = {};

    // 使用评估分析器分析文本
    const analyzedScores = AssessmentAnalyzer.analyzeAssessmentText(text);

    // 将分析结果分配给相关题目
    questionIds.forEach(id => {
      // 找到最相关的分数
      results[id] = analyzedScores[id] || 4; // 默认中等水平
    });

    return results;
  }

  // 生成评估报告
  static generateAssessmentReport(parsedData: {
    overallLevel: string;
    domainAssessments: Record<string, string[]>;
    extractedScores: Record<number, number>;
  }): {
    summary: string;
    domainScores: Record<string, number[]>;
    recommendations: string[];
  } {
    const { overallLevel, domainAssessments, extractedScores } = parsedData;

    // 计算各领域平均分
    const domainScores = {
      self_care: [1, 2, 3, 4, 5, 6].map(id => extractedScores[id] || 1),
      bladder_control: [7, 8].map(id => extractedScores[id] || 1),
      transfer: [9, 10, 11].map(id => extractedScores[id] || 1),
      locomotion: [12, 13].map(id => extractedScores[id] || 1),
      communication: [14, 15].map(id => extractedScores[id] || 1),
      social_cognition: [16, 17, 18].map(id => extractedScores[id] || 1)
    };

    // 生成总体摘要
    const summary = `根据评估建议分析，该儿童功能独立性水平为：${overallLevel}。` +
      `各领域评分已根据评估文本中的描述进行了量化转换。`;

    // 生成建议
    const recommendations = ASSESSMENT_TEMPLATES.general[overallLevel as keyof typeof ASSESSMENT_TEMPLATES.general] || [];

    return {
      summary,
      domainScores,
      recommendations
    };
  }
}

// 使用示例
export function parseWeeFIMAssessment(assessmentText: string): {
  scores: Record<number, number>;
  report: {
    summary: string;
    domainScores: Record<string, number[]>;
    recommendations: string[];
  };
} {
  const parsedData = WeeFIMAssessmentParser.parseAssessmentText(assessmentText);
  const report = WeeFIMAssessmentParser.generateAssessmentReport(parsedData);

  return {
    scores: parsedData.extractedScores,
    report
  };
}

// 测试函数
export function testAssessmentParser() {
  const testText = `
    儿童功能独立性中等，在日常生活和认知功能上既有一定的自主能力，又在多个方面需要不同程度的协助。
    在进食方面，能独立完成大部分动作，但偶尔需要提醒。
    穿衣时需要中度协助，特别是扣扣子和拉拉链时。
    能够基本控制排尿，但偶尔会有尿失禁情况。
    在沟通方面，能理解简单的指令，但表达时需要手势辅助。
    社会交往能力有待提高，需要他人引导才能参与互动。
  `;

  const result = parseWeeFIMAssessment(testText);
  console.log('解析结果：', result);
  return result;
}