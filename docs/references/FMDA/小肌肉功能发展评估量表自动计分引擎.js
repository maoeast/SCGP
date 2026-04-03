/**
 * 学前儿童精细动作评估 数字化自动计分引擎
 * 适用场景: 特教学校日常筛查、IEP目标自动提取
 * 评分标准: 2分(掌握), 1分(部分/萌芽), 0分(未掌握)
 */

// ==========================================
// 1. 量表结构与评估阈值配置
// ==========================================
const FINE_MOTOR_CONFIG = {
  // A. 领域结构定义 (假设数据库中 item_id 是连续分配的)
  // 您可以根据实际数据库的 ID 范围进行调整
  domains: {
    'hand_grasp': { id: 1, name: '手部抓握', itemIds: Array.from({length: 15}, (_, i) => i + 1) }, // 1-15
    'finger_dexterity': { id: 2, name: '手指灵活性', itemIds: Array.from({length: 16}, (_, i) => i + 16) }, // 16-31
    'bilateral_coordination': { id: 3, name: '双手协调', itemIds: Array.from({length: 15}, (_, i) => i + 32) }, // 32-46
    'vmi': { id: 4, name: '视动整合', itemIds: Array.from({length: 20}, (_, i) => i + 47) }, // 47-66
    'pre_writing': { id: 5, name: '前书写技能', itemIds: Array.from({length: 12}, (_, i) => i + 67) }, // 67-78
    'self_care': { id: 6, name: '生活自理精细动作', itemIds: Array.from({length: 10}, (_, i) => i + 79) } // 79-88
  },

  // B. 诊断阈值配置 (基于得分率 Percentage of Mastery)
  // 特教常用标准：>=80%为独立掌握，40-79%为发展中，<40%为迟缓
  thresholds: {
    age_appropriate: { minRate: 0.80, level: 0, status: 'age_appropriate', text: '发展适龄' }, // 绿色
    emerging: { minRate: 0.40, level: 1, status: 'emerging', text: '发展萌芽/轻度落后' }, // 黄色
    delayed: { minRate: 0.00, level: 2, status: 'delayed', text: '显著迟缓' } // 红色
  }
};

// ==========================================
// 2. 辅助计算函数
// ==========================================

/**
 * 根据得分率获取评估等级
 * @param {Number} rate - 得分率 (0.00 - 1.00)
 */
const evaluateLevel = (rate) => {
  if (rate >= FINE_MOTOR_CONFIG.thresholds.age_appropriate.minRate) return FINE_MOTOR_CONFIG.thresholds.age_appropriate;
  if (rate >= FINE_MOTOR_CONFIG.thresholds.emerging.minRate) return FINE_MOTOR_CONFIG.thresholds.emerging;
  return FINE_MOTOR_CONFIG.thresholds.delayed;
};

// ==========================================
// 3. 领域分数计算引擎
// ==========================================
/**
 * @param {Object} answers - 答卷对象格式: { "item_1": 2, "item_2": 2, "item_3": 1, "item_4": 0 ... }
 * 注：包含老师手打的分数，以及系统 Basal/Ceiling 自动填充的分数
 */
function calculateDomainScores(answers) {
  let domainResults = {};
  let totalRawScore = 0;
  let totalMaxScore = 0;

  for (const [domainKey, domainConfig] of Object.entries(FINE_MOTOR_CONFIG.domains)) {
    let domainRawScore = 0;
    let validItemCount = 0;

    // 遍历该领域的所有题目
    domainConfig.itemIds.forEach(itemId => {
      const score = answers[`item_${itemId}`];
      // 确保该题有打分记录 (0, 1, 2)
      if (score !== undefined && score !== null) {
        domainRawScore += score;
        validItemCount += 1;
      }
    });

    // 计算该领域的最高可能得分 (每题满分2分)
    const domainMaxScore = validItemCount * 2;
    // 计算得分率 (处理除以0的异常)
    const masteryRate = domainMaxScore > 0 ? (domainRawScore / domainMaxScore) : 0;
    
    // 评估等级判定
    const evaluation = evaluateLevel(masteryRate);

    domainResults[domainKey] = {
      domain_id: domainConfig.id,
      name: domainConfig.name,
      rawScore: domainRawScore,
      maxScore: domainMaxScore,
      masteryRate: parseFloat(masteryRate.toFixed(2)), // 保留两位小数，如 0.85
      status: evaluation.status,
      level: evaluation.level,
      text: evaluation.text
    };

    totalRawScore += domainRawScore;
    totalMaxScore += domainMaxScore;
  }

  return {
    domainResults,
    totalRawScore,
    totalMaxScore,
    totalMasteryRate: totalMaxScore > 0 ? parseFloat((totalRawScore / totalMaxScore).toFixed(2)) : 0
  };
}

// ==========================================
// 4. 智能 IEP 目标提取引擎 (核心特教逻辑)
// ==========================================
/**
 * 从答卷中提取出最适合作为近期干预目标的题目 ID
 * @param {Object} answers 
 * @param {Object} autoFilledFlags - 记录哪些题是系统自动补全的 { "item_1": true, "item_40": true }
 */
function extractIEPTargets(answers, autoFilledFlags = {}) {
  let targets = {
    priority_1: [], // 优先目标：得分为 1 分的题目 (发展萌芽期，最容易干预成功)
    priority_2: []  // 次要目标：得分为 0 分，但不是被 Ceiling 自动填充的题目 (即能力天花板边缘的题)
  };

  for (const [key, score] of Object.entries(answers)) {
    const itemId = key.replace('item_', '');
    const isAutoFilled = autoFilledFlags[key] === true;

    if (score === 1) {
      targets.priority_1.push(parseInt(itemId));
    } else if (score === 0 && !isAutoFilled) {
      // 只有老师亲手打出 0 分的题才纳入目标，系统因为“上限拦截”自动补全的 0 分题太难，不予考虑
      targets.priority_2.push(parseInt(itemId));
    }
  }

  return targets;
}

// ==========================================
// 5. 整合暴露的主函数 (供前端 Vue 或 Node.js 调用)
// ==========================================
/**
 * @param {Object} studentInfo - { name: '张三', ageMonths: 52 }
 * @param {Object} answers - { "item_1": 2, "item_2": 1... }
 * @param {Object} autoFilledFlags - { "item_1": true... }
 */
function evaluateFineMotor(studentInfo, answers, autoFilledFlags = {}) {
  try {
    // 1. 计算各领域得分
    const scoreData = calculateDomainScores(answers);
    
    // 2. 提取 IEP 目标 ID
    const iepTargets = extractIEPTargets(answers, autoFilledFlags);

    // 3. 总体评估状态判定
    const overallEval = evaluateLevel(scoreData.totalMasteryRate);

    // 4. 寻找优势领域与弱势领域
    let domainsArr = Object.values(scoreData.domainResults);
    domainsArr.sort((a, b) => b.masteryRate - a.masteryRate); // 按得分率降序排列
    
    const strengthDomain = domainsArr[0]; // 得分率最高的领域
    const weaknessDomain = domainsArr[domainsArr.length - 1]; // 得分率最低的领域

    // 5. 生成系统简评
    let overallSuggestion = `✅ 评估完成。该儿童总体精细动作得分率为 ${(scoreData.totalMasteryRate * 100).toFixed(0)}%，处于【${overallEval.text}】阶段。`;
    if (overallEval.level > 0) {
      overallSuggestion += ` 其中，【${strengthDomain.name}】表现相对较好，而【${weaknessDomain.name}】是目前最显著的发展短板，需作为下一阶段 IEP 的干预重点。`;
    }

    return {
      student: studentInfo,
      timestamp: new Date().toISOString(),
      evaluation: {
        overall: {
          rawScore: scoreData.totalRawScore,
          maxScore: scoreData.totalMaxScore,
          masteryRate: scoreData.totalMasteryRate,
          status: overallEval.status,
          level: overallEval.level,
          text: overallEval.text,
          suggestion: overallSuggestion
        },
        strengthsAndWeaknesses: {
          strength: strengthDomain.name,
          weakness: weaknessDomain.name
        },
        domains: scoreData.domainResults,
        iep_target_item_ids: iepTargets
      }
    };
  } catch (error) {
    console.error("精细动作评估计分出错:", error);
    return null;
  }
}

// 导出
export { evaluateFineMotor, calculateDomainScores, extractIEPTargets };