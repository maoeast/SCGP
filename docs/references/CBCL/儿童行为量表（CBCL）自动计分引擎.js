/**
 * 儿童行为量表 (CBCL) 数字化自动计分引擎
 * 适用场景: 特教学校日常筛查评测 (非临床诊断)
 * 数据来源: 中国常模修订版
 */

// ==========================================
// 1. 常模与因子配置字典
// ==========================================
const CBCL_CONFIG = {
  // A. 行为问题总分粗分上限 (超过此分需警惕)
  totalScoreLimit: {
    'boy_4_5': 42, 'boy_6_11': 40, 'boy_12_16': 42,
    'girl_4_5': 45, 'girl_6_11': 41, 'girl_12_16': 37
  },
  // B. 社会能力因子临界下限 (低于此分需警惕) - 越高越好
  socialNorms: {
    'boy_6_11':   { activity: 3.0, social: 3.0, school: 2.0 }, // 
    'boy_12_16':  { activity: 3.0, social: 3.5, school: 2.0 }, // 
    'girl_6_11':  { activity: 2.5, social: 3.5, school: 3.0 }, // 
    'girl_12_16': { activity: 3.0, social: 3.0, school: 3.0 }  // 
  },
  // C. 行为问题因子配置 
  // ------------------------------------------------------
  // 6-11岁 男孩 (Boys 6-11) 行为问题因子条目映射及常模阈值
  // ------------------------------------------------------
  factors_boy_6_11: {
    '分裂样': { items: [11, 29, 30, 40, 47, 50, 59, 70, 75], p69: 2, p98: 5 },
    '抑郁': { items: [12, 14, 18, 31, 32, 33, 34, 35, 45, 50, 52, 71, 88, 89, 91, 103, 112], p69: 3, p98: 13 },
    '交往不良': { items: [13, 65, 69, 71, 75, 80, 86, 103], p69: 3, p98: 5 },
    '强迫性': { items: [9, 13, 17, 46, 47, 50, 54, 66, 76, 80, 83, 84, 85, 92, 93, 100], p69: 3, p98: 6 },
    '体诉': { items: [49, 51, 54, '56a', '56b', '56c', '56d', '56e', '56f', '56g', 77], p69: 1, p98: 4 },
    '社交退缩': { items: [25, 34, 38, 42, 48, 64, 102, 111], p69: 2, p98: 6 },
    '多动': { items: [1, 8, 10, 13, 17, 20, 41, 61, 62, 64, 79, 80, 93, 104], p69: 4, p98: 10 },
    '攻击性': { items: [3, 7, 16, 19, 22, 23, 25, 27, 37, 43, 48, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104], p69: 9, p98: 22 },
    '违纪': { items: [21, 22, 23, 39, 43, 67, 72, 81, 82, 90, 101, 106], p69: 4, p98: 8 }
  },

  // ------------------------------------------------------
  // 6-11岁 女孩 (Girls 6-11) 行为问题因子条目映射及常模阈值
  // [专家修复]: 修正了原文档中违纪与攻击性列的排版错位
  // ------------------------------------------------------
  factors_girl_6_11: {
    '体诉': { items: [36, 46, 50, 51, 54, '56a', '56b', '56c', '56d', '56e', '56f', '56g', 80, 102, 112], p69: 2, p98: 7 },
    '分裂样': { items: [5, 11, 30, 31, 32, 40, 51, 52, 99, 112], p69: 1, p98: 5 },
    '交往不良': { items: [13, 42, 65, 69, 71, 75, 80, 86, 87, 88, 89, 102, 103], p69: 3, p98: 13 },
    '不成熟': { items: [1, 11, 14, 19, 64, 108, 109], p69: 1, p98: 5 },
    '强迫性': { items: [7, 9, 17, 31, 66, 83, 84, 85, 104], p69: 2, p98: 6 },
    '敌意性': { items: [1, 12, 20, 21, 25, 33, 34, 35, 37, 38, 48, 62, 64, 11], p69: 4, p98: 9 },
    '违纪': { items: [20, 21, 23, 39, 43, 61, 67, 72, 81, 82, 101, 105, 106], p69: 1, p98: 8 },
    '攻击性': { items: [3, 10, 16, 19, 22, 27, 34, 37, 41, 45, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104], p69: 9, p98: 22 },
    '多动': { items: [1, 8, 10, 23, 41, 44, 45, 61, 62, 74], p69: 1, p98: 10 }
  },

  // ------------------------------------------------------
  // 12-16岁 男孩 (Boys 12-16) 行为问题因子条目映射及常模阈值
  // ------------------------------------------------------
  factors_boy_12_16: {
    '焦虑强迫': { items: [9, 12, 14, 27, 29, 30, 31, 32, 33, 34, 35, 45, 47, 50, 52, 71, 76, 100, 112], p69: 4, p98: 14 },
    '体诉': { items: [30, 51, '56a', '56b', '56c', '56d', '56e', '56f', '56g'], p69: 0, p98: 4 },
    '分裂样': { items: [17, 29, 40, 47, 70, 80, 84, 85, 96], p69: 1, p98: 4 },
    '抑郁退缩': { items: [42, 54, 65, 69, 71, 75, 77, 80, 86, 88, 102, 103, 111], p69: 4, p98: 11 },
    '不成熟': { items: [1, 8, 10, 11, 13, 17, 25, 38, 48, 62, 64, 80, 83, 98], p69: 3, p98: 9 },
    '违纪': { items: [1, 8, 22, 23, 26, 39, 41, 43, 61, 63, 67, 69, 81, 82, 90, 101, 105], p69: 2, p98: 12 },
    '攻击性': { items: [3, 10, 16, 19, 22, 27, 34, 37, 41, 45, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104], p69: 6, p98: 22 },
    '残忍': { items: [15, 16, 20, 21, 25, 34, 37, 57, 81, 97, 106], p69: 0, p98: 4 }
  },

  // ------------------------------------------------------
  // 12-16岁 女孩 (Girls 12-16) 行为问题因子条目映射及常模阈值
  // [专家修复]: 修正了违纪/攻击性/多动列的阈值错位
  // ------------------------------------------------------
  factors_girl_12_16: {
    '体诉': { items: [36, 49, 50, 51, 54, '56a', '56b', '56c', '56d', '56e', '56f', '56g', 80, 102, 112], p69: 2, p98: 7 },
    '分裂样': { items: [5, 11, 30, 31, 32, 40, 51, 52, 99, 112], p69: 1, p98: 5 },
    '交往不良': { items: [13, 42, 65, 69, 71, 75, 80, 86, 87, 88, 89, 102, 103, 111, 112], p69: 3, p98: 13 },
    '不成熟': { items: [1, 11, 14, 19, 64, 108, 109], p69: 1, p98: 5 },
    '强迫性': { items: [7, 9, 17, 31, 66, 83, 84, 85, 104], p69: 2, p98: 6 },
    '敌意性': { items: [1, 12, 20, 21, 25, 33, 34, 35, 37, 38, 48, 62, 64, 11], p69: 4, p98: 9 },
    '违纪': { items: [20, 21, 23, 39, 43, 61, 67, 72, 81, 82, 101, 105, 106], p69: 1, p98: 8 },
    '攻击性': { items: [3, 10, 16, 19, 22, 27, 34, 37, 41, 45, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104], p69: 9, p98: 22 },
    '多动': { items: [1, 8, 10, 23, 41, 44, 45, 61, 62, 74], p69: 1, p98: 10 }
  }
};

// ==========================================
// 2. 辅助计算函数
// ==========================================
// 计算平均分（自动忽略未知/未填项）
const calcAvg = (arr) => {
  const validItems = arr.filter(v => v !== null && v !== undefined && v >= 0);
  if (validItems.length === 0) return 0;
  return validItems.reduce((a, b) => a + b, 0) / validItems.length;
};

// ==========================================
// 3. 第二部分：社会能力计算引擎 (已升级)
// ==========================================
/**
 * @param {String} gender - 'boy' / 'girl'
 * @param {Number} age - 年龄
 * @param {Object} p2 - 原始数据
 */
function calculateSocialCompetence(gender, age, p2) {
  try {
    // 1. 确定常模组别
    let ageGroup = '';
    if (age >= 6 && age <= 11) ageGroup = '6_11';
    else if (age >= 12 && age <= 16) ageGroup = '12_16';
    
    // 4-5岁通常不计社会能力分(或常模不同)，此处做防御性处理
    const groupKey = (ageGroup) ? `${gender}_${ageGroup}` : null;
    const norms = groupKey ? CBCL_CONFIG.socialNorms[groupKey] : null;
    // 2. 算分逻辑 (I-IV: 活动能力, V-VI: 社交情况, VII: 学校情况)
    const getActivityScore = (count, level1, level2) => {
      let baseScore = count >= 3 ? 2 : (count === 2 ? 1 : 0);
      let avgLevel = calcAvg([level1, level2]);
      return baseScore + avgLevel;
    };
    // 因子1: 活动能力 (Activity)
    const scoreI = getActivityScore(p2.I_count, p2.I_time, p2.I_level);
    const scoreII = getActivityScore(p2.II_count, p2.II_time, p2.II_level);
    const scoreIII = getActivityScore(p2.III_count, p2.III_active, -1);
    const scoreIV = p2.IV_count > 0 ? calcAvg([p2.IV_quality]) : 0;
    const factorActivity = parseFloat((scoreI + scoreII + scoreIII + scoreIV).toFixed(2));
    // 因子2: 社交情况 (Social)
    const scoreV1 = p2.V_friends >= 4 ? 2 : (p2.V_friends >= 2 ? 1 : 0);
    const scoreV2 = p2.V_meet >= 3 ? 2 : (p2.V_meet >= 1 ? 1 : 0);
    const scoreVI_abc = calcAvg([p2.VI_a, p2.VI_b, p2.VI_c]);
    const scoreVI_d = p2.VI_d >= 0 ? p2.VI_d : 0;
    const factorSocial = parseFloat((scoreV1 + scoreV2 + scoreVI_abc + scoreVI_d).toFixed(2));
    // 因子3: 学校情况 (School)
    const scoreVII_1 = calcAvg([p2.VII_math, p2.VII_chinese, p2.VII_english, p2.VII_other]);
    // 注意：布尔值在这里是 否=1, 是=0
	const scoreVII_234 = (p2.VII_isSpecial ? 0 : 1) + (p2.VII_isRetained ? 0 : 1) + (p2.VII_hasProblem ? 0 : 1);
    const factorSchool = parseFloat((scoreVII_1 + scoreVII_234).toFixed(2));
    // 3. 常模比对评估 (低于临界值则标记异常)
    const evaluateFactor = (val, limit) => {
      if (!limit) return { score: val, status: '未配置常模', level: 0 };
      if (val < limit) return { score: val, status: '异常 (低于正常下限)', level: 2 }; // 红色
      return { score: val, status: '正常', level: 0 }; // 绿色
    };
    return {
      group: groupKey,
      activity: evaluateFactor(factorActivity, norms ? norms.activity : null),
      social: evaluateFactor(factorSocial, norms ? norms.social : null),
      school: evaluateFactor(factorSchool, norms ? norms.school : null),
      rawScores: { factorActivity, factorSocial, factorSchool } // 保留原始分供参考
    };
  } catch (error) {
    console.error("社会能力计分出错:", error);
    return null;
  }
}

// ==========================================
// 4. 第三部分：行为问题计算引擎
// ==========================================
/**
 * @param {String} gender - 'boy' 或 'girl'
 * @param {Number} age - 年龄数字
 * @param {Object} answers - 113道题的答案对象 { "1": 0, "56a": 2, ... }
 */
function calculateBehaviorProblems(gender, age, answers) {
  // 1. 判断所属组别
  let ageGroup = '';
  if (age >= 4 && age <= 5) ageGroup = '4_5';
  else if (age >= 6 && age <= 11) ageGroup = '6_11';
  else if (age >= 12 && age <= 16) ageGroup = '12_16';
  else return { error: "年龄不在适用范围(4-16岁)" };

  const groupKey = `${gender}_${ageGroup}`;
  const factorDict = CBCL_CONFIG[`factors_${groupKey}`];

  // 2. 计算总粗分 (遍历所有题目答案)
  let totalRawScore = 0;
  for (let key in answers) {
    // 排除填空文本题，只统计分数类型 (0, 1, 2)
    const val = answers[key];
    if (typeof val === 'number') {
      totalRawScore += val;
    }
  }

  // 3. 校验总粗分是否超标
  const totalLimit = CBCL_CONFIG.totalScoreLimit[groupKey] || 999; 
  const isTotalAbnormal = totalRawScore > totalLimit;

  // 4. 计算各因子得分并评估
  let factorResults = {};
  let abnormalFactors = [];

  if (factorDict) {
    for (let factorName in factorDict) {
      const config = factorDict[factorName];
      let rawScore = 0;
      
      // 遍历该因子包含的所有条目 (Item)
      config.items.forEach(item => {
        // 安全访问：确保 answers 中存在该题的作答
        const val = answers[item];
        if (typeof val === 'number') {
          rawScore += val;
        }
      });

      // 评估状态：
      // - 正常: < p69
      // - 边缘: >= p69 且 < p98
      // - 异常: >= p98
      let status = '正常';
      let level = 0; // 0:绿, 1:黄, 2:红

      if (rawScore >= config.p98) {
        status = '可能异常 (>=98百分位)';
        level = 2;
        abnormalFactors.push(factorName);
      } else if (rawScore >= config.p69) {
        status = '边缘/需关注 (69-98百分位)';
        level = 1;
      }

      factorResults[factorName] = {
        score: rawScore,
        status: status,
        level: level,
        p69_limit: config.p69,
        p98_limit: config.p98
      };
    }
  } else {
    // 如果是 4-5 岁或其他未配置的组别
    factorResults = { message: "当前年龄段的因子详情尚未配置 (仅计算总分)" };
  }

  return {
    group: groupKey,
    totalRawScore,
    totalLimit,
    isTotalAbnormal,
    factorResults,
    abnormalFactors,
    suggestion: abnormalFactors.length > 0 || isTotalAbnormal 
      ? '⚠️ 筛查提示：检测到显著行为/情绪指标，建议由专业心理教师介入评估。' 
      : '✅ 筛查提示：各项指标均在常模正常范围内。'
  };
}

// ==========================================
// 5. 整合暴露的主函数
// ==========================================
function evaluateCBCL(studentInfo, part2Data, part3Answers) {
  // 注意：现在 calculateSocialCompetence 也需要 studentInfo 中的性别和年龄
  const socialRes = calculateSocialCompetence(studentInfo.gender, studentInfo.age, part2Data);
  const behaviorRes = calculateBehaviorProblems(studentInfo.gender, studentInfo.age, part3Answers);
  // 综合筛查建议
  let overallSuggestion = '';
  // 检查行为问题 (Level 2 为红色异常)
  const behaviorIssues = behaviorRes.abnormalFactors && behaviorRes.abnormalFactors.length > 0;
  const isTotalHigh = behaviorRes.isTotalAbnormal;
  
  // 检查社会能力 (Level 2 为红色异常)
  let socialIssues = false;
  if (socialRes) {
    socialIssues = (socialRes.activity.level === 2) || (socialRes.social.level === 2) || (socialRes.school.level === 2);
  }
  if (behaviorIssues || isTotalHigh || socialIssues) {
    overallSuggestion = '⚠️ 筛查预警：';
    if (socialIssues) overallSuggestion += '【社会适应】能力低于常模下限，需关注社交技能发展；';
    if (behaviorIssues || isTotalHigh) overallSuggestion += '【行为/情绪】存在显著困扰指标，建议心理辅导介入。';
  } else {
    overallSuggestion = '✅ 评估结果：社会适应能力与行为表现均在常模正常范围内。';
  }
  return {
    student: studentInfo,
    timestamp: new Date().toISOString(),
    evaluation: {
      socialCompetence: socialRes,
      behaviorProblems: behaviorRes,
      overallSuggestion
    }
  };
}

// 导出
export { evaluateCBCL, calculateSocialCompetence, calculateBehaviorProblems };
