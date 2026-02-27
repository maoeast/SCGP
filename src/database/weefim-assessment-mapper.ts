// WeeFIM评估建议到水平评级的映射系统

export interface AssessmentCriteria {
  keywords: string[];
  level: number;
  confidence: number;  // 置信度 0-1
}

export interface DomainAssessmentMapping {
  domain: string;
  questionIds: number[];
  criteria: AssessmentCriteria[];
}

// 关键词到评分的映射
const assessmentMappings: DomainAssessmentMapping[] = [
  {
    domain: '自我照顾',
    questionIds: [1, 2, 3, 4, 5, 6], // 进食、梳洗修饰、洗澡、穿上衣、穿裤子、上厕所
    criteria: [
      {
        keywords: ['独立完成', '无需协助', '完全自主', '熟练', '符合正常习惯'],
        level: 7,
        confidence: 0.9
      },
      {
        keywords: ['大部分独立', '轻微协助', '较小协助', '偶尔提醒', '基本独立'],
        level: 6,
        confidence: 0.85
      },
      {
        keywords: ['偶尔需要', '少量辅助', '提醒', '大部分情况下', '监护'],
        level: 5,
        confidence: 0.8
      },
      {
        keywords: ['中度协助', '部分完成', '需要帮助', '自己完成部分'],
        level: 4,
        confidence: 0.85
      },
      {
        keywords: ['大量协助', '完成大部分', '少量简单', '他人完成'],
        level: 3,
        confidence: 0.9
      },
      {
        keywords: ['极少量', '大部分依赖', '只能少量', '基本依赖'],
        level: 2,
        confidence: 0.85
      },
      {
        keywords: ['完全不能', '完全依赖', '无自主能力', '毫无反应'],
        level: 1,
        confidence: 0.95
      }
    ]
  },
  {
    domain: '括约肌控制',
    questionIds: [7, 8], // 排尿控制、排便控制
    criteria: [
      {
        keywords: ['完全自主控制', '白天晚上都不', '及时表达', '自行去厕所'],
        level: 7,
        confidence: 0.95
      },
      {
        keywords: ['白天能控制', '偶尔晚上', '能表达但有时来不及', '基本自主'],
        level: 6,
        confidence: 0.9
      },
      {
        keywords: ['基本能控制', '偶尔失禁', '晚上较频繁', '需要提醒'],
        level: 5,
        confidence: 0.85
      },
      {
        keywords: ['需要定时提醒', '较多失禁', '中度协助', '仍会有'],
        level: 4,
        confidence: 0.9
      },
      {
        keywords: ['使用尿布', '经常失禁', '不能表达需求', '需要大量协助'],
        level: 3,
        confidence: 0.95
      },
      {
        keywords: ['几乎无能力', '完全依赖', '使用导尿管', '极差'],
        level: 2,
        confidence: 0.9
      },
      {
        keywords: ['完全不能控制', '无意识', '毫无控制', '完全失禁'],
        level: 1,
        confidence: 0.95
      }
    ]
  },
  {
    domain: '转移',
    questionIds: [9, 10, 11], // 床椅转移、轮椅转移、进出浴盆/淋浴间
    criteria: [
      {
        keywords: ['独立完成', '无需协助', '起身移动坐下', '自主转移'],
        level: 7,
        confidence: 0.9
      },
      {
        keywords: ['独立大部分', '较小辅助', '轻扶一下', '基本独立'],
        level: 6,
        confidence: 0.85
      },
      {
        keywords: ['偶尔需要', '少量辅助', '提醒', '调整位置'],
        level: 5,
        confidence: 0.8
      },
      {
        keywords: ['需要中度协助', '帮忙起身', '引导移动', '自己完成部分'],
        level: 4,
        confidence: 0.85
      },
      {
        keywords: ['大量协助', '他人完成大部分', '配合动作', '仅能简单'],
        level: 3,
        confidence: 0.9
      },
      {
        keywords: ['极少量', '大部分依赖', '只能少量', '基本不能'],
        level: 2,
        confidence: 0.85
      },
      {
        keywords: ['完全不能', '完全依赖', '无自主', '毫无能力'],
        level: 1,
        confidence: 0.95
      }
    ]
  },
  {
    domain: '行走',
    questionIds: [12, 13], // 步行/上下楼梯、使用轮椅
    criteria: [
      {
        keywords: ['独立行走', '至少50米', '跨越障碍', '姿势正常', '无需协助'],
        level: 7,
        confidence: 0.9
      },
      {
        keywords: ['独立大部分', '较小协助', '需要扶手', '基本正常'],
        level: 6,
        confidence: 0.85
      },
      {
        keywords: ['偶尔需要', '少量辅助', '防止摔倒', '需要时间'],
        level: 5,
        confidence: 0.8
      },
      {
        keywords: ['需要扶持', '距离较短', '中度协助', '上下楼梯困难'],
        level: 4,
        confidence: 0.85
      },
      {
        keywords: ['助行器', '密切监护', '距离短', '不稳定'],
        level: 3,
        confidence: 0.9
      },
      {
        keywords: ['极少量', '大部分依赖', '只能少量', '需要抱或轮椅'],
        level: 2,
        confidence: 0.85
      },
      {
        keywords: ['完全不能', '完全依赖', '无自主行走', '毫无能力'],
        level: 1,
        confidence: 0.95
      }
    ]
  },
  {
    domain: '沟通',
    questionIds: [14, 15], // 理解、表达
    criteria: [
      {
        keywords: ['理解复杂', '抽象概念', '多步骤', '与同龄人相当', '清晰准确'],
        level: 7,
        confidence: 0.9
      },
      {
        keywords: ['理解大部分', '简单抽象', '稍有困难', '表达大部分', '流畅'],
        level: 6,
        confidence: 0.85
      },
      {
        keywords: ['理解简单', '需要重复', '手势帮助', '表达基本', '简单想法'],
        level: 5,
        confidence: 0.8
      },
      {
        keywords: ['理解基本', '常用简单', '理解困难', '简单词语', '不够清晰'],
        level: 4,
        confidence: 0.85
      },
      {
        keywords: ['仅能理解', '非常简单', '具体指令', '单个词语', '基本需求'],
        level: 3,
        confidence: 0.9
      },
      {
        keywords: ['非常有限', '简单手势', '表达有限', '示意需求'],
        level: 2,
        confidence: 0.85
      },
      {
        keywords: ['几乎不能', '毫无反应', '不能理解', '不能表达'],
        level: 1,
        confidence: 0.95
      }
    ]
  },
  {
    domain: '社会认知',
    questionIds: [16, 17, 18], // 社会交往、解决问题、记忆
    criteria: [
      {
        keywords: ['主动互动', '遵守规则', '建立关系', '独立解决', '逻辑思维', '完全记住'],
        level: 7,
        confidence: 0.9
      },
      {
        keywords: ['主动互动', '基本遵守', '解决大部分', '需要提示', '记住大部分'],
        level: 6,
        confidence: 0.85
      },
      {
        keywords: ['简单互动', '需要指导', '违反规则', '解决简单', '需要较多帮助', '偶尔提醒'],
        level: 5,
        confidence: 0.8
      },
      {
        keywords: ['有限互动', '理解有限', '经常提醒', '详细指导', '独立解决差'],
        level: 4,
        confidence: 0.85
      },
      {
        keywords: ['极少量互动', '基本不理解', '不能独立', '几乎不能', '只能极少', '经常需要'],
        level: 3,
        confidence: 0.9
      },
      {
        keywords: ['很少参与', '反应淡漠', '几乎无能力', '基本依赖', '记忆力极差'],
        level: 2,
        confidence: 0.85
      },
      {
        keywords: ['完全不参与', '无社交反应', '完全不具备', '完全依赖', '完全没有'],
        level: 1,
        confidence: 0.95
      }
    ]
  }
];

// 评估文本分析器
export class AssessmentAnalyzer {

  // 分析评估文本并返回各项目的水平评分
  static analyzeAssessmentText(assessmentText: string): Record<number, number> {
    const results: Record<number, number> = {};
    const text = assessmentText.toLowerCase();

    // 初始化所有题目为默认值1分
    for (let i = 1; i <= 18; i++) {
      results[i] = 1;
    }

    // 对每个领域进行分析
    assessmentMappings.forEach(mapping => {
      const domainScore = this.analyzeDomain(text, mapping);

      // 将领域分数分配给相应题目
      mapping.questionIds.forEach(questionId => {
        results[questionId] = domainScore;
      });
    });

    return results;
  }

  // 分析单个领域的文本
  private static analyzeDomain(text: string, mapping: DomainAssessmentMapping): number {
    let bestMatch = {
      level: 1,
      confidence: 0
    };

    // 检查每个评分标准
    mapping.criteria.forEach(criteria => {
      let matchCount = 0;
      let totalKeywords = criteria.keywords.length;

      // 计算匹配的关键词数量
      criteria.keywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      });

      // 计算匹配率
      const matchRate = matchCount / totalKeywords;
      const finalConfidence = matchRate * criteria.confidence;

      // 如果匹配度更高，则更新最佳匹配
      if (finalConfidence > bestMatch.confidence) {
        bestMatch = {
          level: criteria.level,
          confidence: finalConfidence
        };
      }
    });

    // 如果没有找到好的匹配，返回默认的中间值
    if (bestMatch.confidence < 0.3) {
      return 4; // 返回中度帮助作为默认值
    }

    return bestMatch.level;
  }

  // 基于总体评估水平推断各项目评分
  static inferScoresFromOverallLevel(overallLevel: string): Record<number, number> {
    const baseScores = {
      '极强': 6,
      '良好': 5,
      '中等': 4,
      '较弱': 3,
      '非常弱': 2,
      '极度弱': 1
    };

    const baseScore = baseScores[overallLevel as keyof typeof baseScores] || 4;
    const results: Record<number, number> = {};

    // 为每个题目设置基础分数，并添加一些随机性以体现个体差异
    for (let i = 1; i <= 18; i++) {
      let variation = 0;

      // 根据题目类型添加适当的变异
      if (i <= 13) { // 运动功能题目
        variation = Math.random() > 0.5 ? 1 : -1;
      } else { // 认知功能题目
        variation = Math.random() > 0.6 ? 1 : 0;
      }

      results[i] = Math.max(1, Math.min(7, baseScore + variation));
    }

    return results;
  }

  // 结合评估文本和总体水平的综合分析
  static comprehensiveAnalysis(
    assessmentText: string,
    overallLevel: string,
    domainSuggestions?: {
      self_care?: string[];
      bladder_control?: string[];
      bowel_control?: string[];
      transfer?: string[];
      locomotion?: string[];
      communication?: string[];
      social_cognition?: string[];
    }
  ): Record<number, number> {
    // 首先基于文本分析
    const textBasedScores = this.analyzeAssessmentText(assessmentText);

    // 基于总体水平的推断
    const levelBasedScores = this.inferScoresFromOverallLevel(overallLevel);

    // 如果有具体的领域建议，进行加权调整
    if (domainSuggestions) {
      // 自我照顾调整
      if (domainSuggestions.self_care && domainSuggestions.self_care.length > 0) {
        const selfCareText = domainSuggestions.self_care.join(' ');
        const selfCareAdjustment = this.analyzeDomain(
          selfCareText.toLowerCase(),
          assessmentMappings[0]
        );
        [1, 2, 3, 4, 5, 6].forEach(id => {
          textBasedScores[id] = Math.round((textBasedScores[id] + selfCareAdjustment) / 2);
        });
      }

      // 沟通调整
      if (domainSuggestions.communication && domainSuggestions.communication.length > 0) {
        const communicationText = domainSuggestions.communication.join(' ');
        const communicationAdjustment = this.analyzeDomain(
          communicationText.toLowerCase(),
          assessmentMappings[4]
        );
        [14, 15].forEach(id => {
          textBasedScores[id] = Math.round((textBasedScores[id] + communicationAdjustment) / 2);
        });
      }

      // 社会认知调整
      if (domainSuggestions.social_cognition && domainSuggestions.social_cognition.length > 0) {
        const socialText = domainSuggestions.social_cognition.join(' ');
        const socialAdjustment = this.analyzeDomain(
          socialText.toLowerCase(),
          assessmentMappings[5]
        );
        [16, 17, 18].forEach(id => {
          textBasedScores[id] = Math.round((textBasedScores[id] + socialAdjustment) / 2);
        });
      }
    }

    // 综合文本分析和水平推断（各占50%权重）
    const finalScores: Record<number, number> = {};
    for (let i = 1; i <= 18; i++) {
      finalScores[i] = Math.round((textBasedScores[i] + levelBasedScores[i]) / 2);
      finalScores[i] = Math.max(1, Math.min(7, finalScores[i])); // 确保分数在1-7范围内
    }

    return finalScores;
  }
}

// 导出映射数据供其他模块使用
export { assessmentMappings };