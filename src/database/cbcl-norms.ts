/**
 * CBCL (Achenbach儿童行为量表) 常模配置
 * 来源: docs/references/儿童行为量表（CBCL）自动计分引擎.js
 * 包含6个常模组 (性别 × 年龄) 的因子配置
 */

import type {
  CBCLGender,
  CBCLNormGroup,
  CBCLFactorNorms,
  CBCLSocialNorm,
  CBCLTotalScoreLimit
} from '@/types/cbcl';

// ==========================================
// A. 行为问题总分粗分上限
// 超过此分需警惕
// ==========================================

export const CBCL_TOTAL_SCORE_LIMITS: CBCLTotalScoreLimit = {
  'boy_4_5': 42,
  'boy_6_11': 40,
  'boy_12_16': 42,
  'girl_4_5': 45,
  'girl_6_11': 41,
  'girl_12_16': 37
};

// ==========================================
// B. 社会能力因子临界下限
// 低于此分需警惕 (越高越好)
// 注意: 4-5岁无社会能力常模
// ==========================================

export const CBCL_SOCIAL_NORMS: Record<string, CBCLSocialNorm> = {
  'boy_6_11':   { activity: 3.0, social: 3.0, school: 2.0 },
  'boy_12_16':  { activity: 3.0, social: 3.5, school: 2.0 },
  'girl_6_11':  { activity: 2.5, social: 3.5, school: 3.0 },
  'girl_12_16': { activity: 3.0, social: 3.0, school: 3.0 }
};

// ==========================================
// C. 行为问题因子配置
// ==========================================

// ------------------------------------------------------
// 6-11岁 男孩 (Boys 6-11) 行为问题因子条目映射及常模阈值
// ------------------------------------------------------
const FACTORS_BOY_6_11: CBCLFactorNorms = {
  '分裂样': {
    items: [11, 29, 30, 40, 47, 50, 59, 70, 75],
    p69: 2,
    p98: 5
  },
  '抑郁': {
    items: [12, 14, 18, 31, 32, 33, 34, 35, 45, 50, 52, 71, 88, 89, 91, 103, 112],
    p69: 3,
    p98: 13
  },
  '交往不良': {
    items: [13, 65, 69, 71, 75, 80, 86, 103],
    p69: 3,
    p98: 5
  },
  '强迫性': {
    items: [9, 13, 17, 46, 47, 50, 54, 66, 76, 80, 83, 84, 85, 92, 93, 100],
    p69: 3,
    p98: 6
  },
  '体诉': {
    items: [49, 51, 54, '56a', '56b', '56c', '56d', '56e', '56f', '56g', 77],
    p69: 1,
    p98: 4
  },
  '社交退缩': {
    items: [25, 34, 38, 42, 48, 64, 102, 111],
    p69: 2,
    p98: 6
  },
  '多动': {
    items: [1, 8, 10, 13, 17, 20, 41, 61, 62, 64, 79, 80, 93, 104],
    p69: 4,
    p98: 10
  },
  '攻击性': {
    items: [3, 7, 16, 19, 22, 23, 25, 27, 37, 43, 48, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104],
    p69: 9,
    p98: 22
  },
  '违纪': {
    items: [21, 22, 23, 39, 43, 67, 72, 81, 82, 90, 101, 106],
    p69: 4,
    p98: 8
  }
};

// ------------------------------------------------------
// 6-11岁 女孩 (Girls 6-11) 行为问题因子条目映射及常模阈值
// ------------------------------------------------------
const FACTORS_GIRL_6_11: CBCLFactorNorms = {
  '体诉': {
    items: [36, 46, 50, 51, 54, '56a', '56b', '56c', '56d', '56e', '56f', '56g', 80, 102, 112],
    p69: 2,
    p98: 7
  },
  '分裂样': {
    items: [5, 11, 30, 31, 32, 40, 51, 52, 99, 112],
    p69: 1,
    p98: 5
  },
  '交往不良': {
    items: [13, 42, 65, 69, 71, 75, 80, 86, 87, 88, 89, 102, 103],
    p69: 3,
    p98: 13
  },
  '不成熟': {
    items: [1, 11, 14, 19, 64, 108, 109],
    p69: 1,
    p98: 5
  },
  '强迫性': {
    items: [7, 9, 17, 31, 66, 83, 84, 85, 104],
    p69: 2,
    p98: 6
  },
  '敌意性': {
    items: [1, 12, 20, 21, 25, 33, 34, 35, 37, 38, 48, 62, 64, 11],
    p69: 4,
    p98: 9
  },
  '违纪': {
    items: [20, 21, 23, 39, 43, 61, 67, 72, 81, 82, 101, 105, 106],
    p69: 1,
    p98: 8
  },
  '攻击性': {
    items: [3, 10, 16, 19, 22, 27, 34, 37, 41, 45, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104],
    p69: 9,
    p98: 22
  },
  '多动': {
    items: [1, 8, 10, 23, 41, 44, 45, 61, 62, 74],
    p69: 1,
    p98: 10
  }
};

// ------------------------------------------------------
// 12-16岁 男孩 (Boys 12-16) 行为问题因子条目映射及常模阈值
// ------------------------------------------------------
const FACTORS_BOY_12_16: CBCLFactorNorms = {
  '焦虑强迫': {
    items: [9, 12, 14, 27, 29, 30, 31, 32, 33, 34, 35, 45, 47, 50, 52, 71, 76, 100, 112],
    p69: 4,
    p98: 14
  },
  '体诉': {
    items: [30, 51, '56a', '56b', '56c', '56d', '56e', '56f', '56g'],
    p69: 0,
    p98: 4
  },
  '分裂样': {
    items: [17, 29, 40, 47, 70, 80, 84, 85, 96],
    p69: 1,
    p98: 4
  },
  '抑郁退缩': {
    items: [42, 54, 65, 69, 71, 75, 77, 80, 86, 88, 102, 103, 111],
    p69: 4,
    p98: 11
  },
  '不成熟': {
    items: [1, 8, 10, 11, 13, 17, 25, 38, 48, 62, 64, 80, 83, 98],
    p69: 3,
    p98: 9
  },
  '违纪': {
    items: [1, 8, 22, 23, 26, 39, 41, 43, 61, 63, 67, 69, 81, 82, 90, 101, 105],
    p69: 2,
    p98: 12
  },
  '攻击性': {
    items: [3, 10, 16, 19, 22, 27, 34, 37, 41, 45, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104],
    p69: 6,
    p98: 22
  },
  '残忍': {
    items: [15, 16, 20, 21, 25, 34, 37, 57, 81, 97, 106],
    p69: 0,
    p98: 4
  }
};

// ------------------------------------------------------
// 12-16岁 女孩 (Girls 12-16) 行为问题因子条目映射及常模阈值
// ------------------------------------------------------
const FACTORS_GIRL_12_16: CBCLFactorNorms = {
  '体诉': {
    items: [36, 49, 50, 51, 54, '56a', '56b', '56c', '56d', '56e', '56f', '56g', 80, 102, 112],
    p69: 2,
    p98: 7
  },
  '分裂样': {
    items: [5, 11, 30, 31, 32, 40, 51, 52, 99, 112],
    p69: 1,
    p98: 5
  },
  '交往不良': {
    items: [13, 42, 65, 69, 71, 75, 80, 86, 87, 88, 89, 102, 103, 111, 112],
    p69: 3,
    p98: 13
  },
  '不成熟': {
    items: [1, 11, 14, 19, 64, 108, 109],
    p69: 1,
    p98: 5
  },
  '强迫性': {
    items: [7, 9, 17, 31, 66, 83, 84, 85, 104],
    p69: 2,
    p98: 6
  },
  '敌意性': {
    items: [1, 12, 20, 21, 25, 33, 34, 35, 37, 38, 48, 62, 64, 11],
    p69: 4,
    p98: 9
  },
  '违纪': {
    items: [20, 21, 23, 39, 43, 61, 67, 72, 81, 82, 101, 105, 106],
    p69: 1,
    p98: 8
  },
  '攻击性': {
    items: [3, 10, 16, 19, 22, 27, 34, 37, 41, 45, 57, 68, 86, 87, 88, 89, 90, 93, 94, 95, 97, 104],
    p69: 9,
    p98: 22
  },
  '多动': {
    items: [1, 8, 10, 23, 41, 44, 45, 61, 62, 74],
    p69: 1,
    p98: 10
  }
};

// ==========================================
// 因子常模汇总
// ==========================================

export const CBCL_FACTOR_NORMS: Record<string, CBCLFactorNorms> = {
  'boy_6_11': FACTORS_BOY_6_11,
  'girl_6_11': FACTORS_GIRL_6_11,
  'boy_12_16': FACTORS_BOY_12_16,
  'girl_12_16': FACTORS_GIRL_12_16
  // Note: 4-5岁年龄组无详细因子常模
};

// ==========================================
// 辅助函数
// ==========================================

/**
 * 根据性别和年龄确定常模组
 * @param gender 性别 'boy' | 'girl'
 * @param ageMonths 年龄(月) 用于精确判断
 * @returns CBCLNormGroup 常模组标识
 */
export function determineNormGroup(gender: CBCLGender, ageMonths: number): CBCLNormGroup {
  // 4-5岁: 48-71个月
  if (ageMonths >= 48 && ageMonths <= 71) {
    return gender === 'boy' ? 'boy_4_5' : 'girl_4_5';
  }
  // 6-11岁: 72-143个月
  if (ageMonths >= 72 && ageMonths <= 143) {
    return gender === 'boy' ? 'boy_6_11' : 'girl_6_11';
  }
  // 12-16岁: 144-192个月
  if (ageMonths >= 144 && ageMonths <= 192) {
    return gender === 'boy' ? 'boy_12_16' : 'girl_12_16';
  }

  // 默认返回最接近的组别 (边界处理)
  if (ageMonths < 48) {
    return gender === 'boy' ? 'boy_4_5' : 'girl_4_5';
  }
  return gender === 'boy' ? 'boy_12_16' : 'girl_12_16';
}

/**
 * 根据性别和年龄(岁)确定常模组
 * @param gender 性别 'boy' | 'girl'
 * @param age 年龄(岁)
 * @returns CBCLNormGroup 常模组标识
 */
export function determineNormGroupByYear(gender: CBCLGender, age: number): CBCLNormGroup {
  if (age >= 4 && age <= 5) {
    return gender === 'boy' ? 'boy_4_5' : 'girl_4_5';
  }
  if (age >= 6 && age <= 11) {
    return gender === 'boy' ? 'boy_6_11' : 'girl_6_11';
  }
  return gender === 'boy' ? 'boy_12_16' : 'girl_12_16';
}

/**
 * 获取常模配置
 * @param gender 性别
 * @param age 年龄(岁)
 * @returns 因子常模配置 | null
 */
export function getNormConfig(gender: CBCLGender, age: number): CBCLFactorNorms | null {
  const normGroup = determineNormGroupByYear(gender, age);
  return CBCL_FACTOR_NORMS[normGroup] || null;
}

/**
 * 获取社会能力常模
 * @param gender 性别
 * @param age 年龄(岁)
 * @returns 社会能力常模 | null
 */
export function getSocialNorm(gender: CBCLGender, age: number): CBCLSocialNorm | null {
  const normGroup = determineNormGroupByYear(gender, age);
  return CBCL_SOCIAL_NORMS[normGroup] || null;
}

/**
 * 获取总分上限
 * @param gender 性别
 * @param age 年龄(岁)
 * @returns 总分上限值
 */
export function getTotalScoreLimit(gender: CBCLGender, age: number): number {
  const normGroup = determineNormGroupByYear(gender, age);
  return CBCL_TOTAL_SCORE_LIMITS[normGroup] || 999;
}

/**
 * 获取所有因子名称
 * @param normGroup 常模组
 * @returns 因子名称数组
 */
export function getFactorNames(normGroup: string): string[] {
  const norms = CBCL_FACTOR_NORMS[normGroup];
  return norms ? Object.keys(norms) : [];
}

/**
 * 获取指定因子的题目列表
 * @param normGroup 常模组
 * @param factorName 因子名称
 * @returns 题目ID数组
 */
export function getFactorItems(normGroup: string, factorName: string): (number | string)[] {
  const norms = CBCL_FACTOR_NORMS[normGroup];
  return norms?.[factorName]?.items || [];
}

/**
 * 获取指定因子的阈值
 * @param normGroup 常模组
 * @param factorName 因子名称
 * @returns { p69: number, p98: number } | null
 */
export function getFactorThresholds(normGroup: string, factorName: string): { p69: number; p98: number } | null {
  const norms = CBCL_FACTOR_NORMS[normGroup];
  const factor = norms?.[factorName];
  return factor ? { p69: factor.p69, p98: factor.p98 } : null;
}

/**
 * 评估因子得分
 * @param rawScore 原始分
 * @param p69 第69百分位阈值
 * @param p98 第98百分位阈值
 * @returns { status: string, level: number }
 */
export function evaluateFactorScore(
  rawScore: number,
  p69: number,
  p98: number
): { status: '正常' | '边缘/需关注' | '可能异常'; level: 0 | 1 | 2 } {
  if (rawScore >= p98) {
    return { status: '可能异常', level: 2 };
  }
  if (rawScore >= p69) {
    return { status: '边缘/需关注', level: 1 };
  }
  return { status: '正常', level: 0 };
}

/**
 * 获取所有常模组列表
 * @returns 常模组标识数组
 */
export function getAllNormGroups(): CBCLNormGroup[] {
  return ['boy_4_5', 'boy_6_11', 'boy_12_16', 'girl_4_5', 'girl_6_11', 'girl_12_16'];
}

/**
 * 获取有详细因子配置的常模组
 * @returns 常模组标识数组 (不含4-5岁组)
 */
export function getDetailedNormGroups(): string[] {
  return ['boy_6_11', 'boy_12_16', 'girl_6_11', 'girl_12_16'];
}

/**
 * 检查常模组是否有详细因子配置
 * @param normGroup 常模组
 * @returns boolean
 */
export function hasDetailedFactors(normGroup: string): boolean {
  return normGroup in CBCL_FACTOR_NORMS;
}
