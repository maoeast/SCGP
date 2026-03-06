/**
 * SRS-2 (社交反应量表第二版) 常模数据与T分数转换引擎
 *
 * 此文件包含 SRS-2 学龄版的常模参照T分数转换表及逻辑，
 * 涵盖总分和所有5个分量表。
 * 数据结构经过优化，以便根据性别和年龄进行快速查找。
 *
 * 数据来源：基于标准的 SRS-2 评分手册。
 * 注意：这些是用于开发的代表性数据点。实际临床使用必须
 * 参考官方 SRS-2 手册以获取完整和准确的数据。
 */

// 假设您的 Gender 类型定义在其他文件，如: type Gender = '男' | '女';
// 如果是独立文件测试，可以取消下面这行的注释:
// export type Gender = '男' | '女';
import type { Gender } from '@/types/student'

// ==========================================
// 1. 类型定义 (Type Definitions)
// ==========================================

export type TScoreMap = Record<number, number> // 映射: 原始分 -> T分
export type AgeStratifiedTScoreMap = Record<number, TScoreMap> // 映射: 最大月龄 -> TScoreMap

export interface TScoreTable {
  male: AgeStratifiedTScoreMap
  female: AgeStratifiedTScoreMap
}

// 5个子维度的标识码
export type SubscaleCode = 'awareness' | 'cognition' | 'communication' | 'motivation' | 'repetitive'


// ==========================================
// 2. 常模字典 (T-Score Conversion Tables)
// 数据结构: 性别 -> 年龄段(最大月龄) -> 原始分锚点 -> T分
// ==========================================

/**
 * SRS-2 总原始分 -> T分转换表 (Total Score Norms)
 */
export const TOTAL_SCORE_NORMS: TScoreTable = {
  male: {
    72: { 0: 30, 10: 35, 20: 40, 30: 45, 40: 50, 50: 55, 60: 60, 65: 62, 70: 65, 80: 70, 90: 75, 100: 80, 110: 85, 120: 90 },
    108: { 0: 30, 10: 34, 20: 39, 30: 44, 40: 49, 50: 54, 60: 59, 65: 61, 70: 64, 80: 69, 90: 74, 100: 79, 110: 84, 120: 89 },
    216: { 0: 30, 10: 33, 20: 38, 30: 43, 40: 48, 50: 53, 60: 58, 65: 60, 70: 63, 80: 68, 90: 73, 100: 78, 110: 83, 120: 88 }
  },
  female: {
    72: { 0: 30, 10: 36, 20: 42, 30: 48, 40: 54, 50: 60, 60: 66, 65: 69, 70: 72, 80: 78, 90: 84, 100: 90 },
    108: { 0: 30, 10: 35, 20: 41, 30: 47, 40: 53, 50: 59, 60: 65, 65: 68, 70: 71, 80: 77, 90: 83, 100: 89 },
    216: { 0: 30, 10: 34, 20: 40, 30: 46, 40: 52, 50: 58, 60: 64, 65: 67, 70: 70, 80: 76, 90: 82, 100: 88 }
  }
}

/**
 * SRS-2 各子维度原始分 -> T分转换表 (Subscale Norms)
 */
export const SUBSCALE_NORMS: Record<SubscaleCode, TScoreTable> = {
  awareness: {
    male: {
      72: { 0: 35, 2: 40, 4: 45, 6: 50, 8: 55, 10: 60, 12: 65, 14: 70, 16: 75, 18: 80, 20: 85, 22: 90 },
      108: { 0: 34, 2: 39, 4: 44, 6: 49, 8: 54, 10: 59, 12: 64, 14: 69, 16: 74, 18: 79, 20: 84, 22: 89 },
      216: { 0: 33, 2: 38, 4: 43, 6: 48, 8: 53, 10: 58, 12: 63, 14: 68, 16: 73, 18: 78, 20: 83, 22: 88 }
    },
    female: {
      72: { 0: 38, 2: 43, 4: 48, 6: 53, 8: 58, 10: 63, 12: 68, 14: 73, 16: 78, 18: 83, 20: 88, 22: 90 },
      108: { 0: 37, 2: 42, 4: 47, 6: 52, 8: 57, 10: 62, 12: 67, 14: 72, 16: 77, 18: 82, 20: 87, 22: 90 },
      216: { 0: 36, 2: 41, 4: 46, 6: 51, 8: 56, 10: 61, 12: 66, 14: 71, 16: 76, 18: 81, 20: 86, 22: 90 }
    }
  },
  cognition: {
    male: {
      72: { 0: 33, 3: 40, 6: 45, 9: 50, 12: 55, 15: 60, 18: 65, 21: 70, 24: 75, 27: 80, 30: 85, 33: 90 },
      108: { 0: 32, 3: 39, 6: 44, 9: 49, 12: 54, 15: 59, 18: 64, 21: 69, 24: 74, 27: 79, 30: 84, 33: 89 },
      216: { 0: 31, 3: 38, 6: 43, 9: 48, 12: 53, 15: 58, 18: 63, 21: 68, 24: 73, 27: 78, 30: 83, 33: 88 }
    },
    female: {
      72: { 0: 36, 3: 43, 6: 48, 9: 53, 12: 58, 15: 63, 18: 68, 21: 73, 24: 78, 27: 83, 30: 88, 33: 90 },
      108: { 0: 35, 3: 42, 6: 47, 9: 52, 12: 57, 15: 62, 18: 67, 21: 72, 24: 77, 27: 82, 30: 87, 33: 90 },
      216: { 0: 34, 3: 41, 6: 46, 9: 51, 12: 56, 15: 61, 18: 66, 21: 71, 24: 76, 27: 81, 30: 86, 33: 90 }
    }
  },
  communication: {
    male: {
      72: { 0: 30, 5: 35, 10: 40, 15: 45, 20: 50, 25: 55, 30: 60, 35: 65, 40: 70, 45: 75, 50: 80, 55: 85, 60: 90 },
      108: { 0: 30, 5: 34, 10: 39, 15: 44, 20: 49, 25: 54, 30: 59, 35: 64, 40: 69, 45: 74, 50: 79, 55: 84, 60: 89 },
      216: { 0: 30, 5: 33, 10: 38, 15: 43, 20: 48, 25: 53, 30: 58, 35: 63, 40: 68, 45: 73, 50: 78, 55: 83, 60: 88 }
    },
    female: {
      72: { 0: 32, 5: 37, 10: 42, 15: 47, 20: 52, 25: 57, 30: 62, 35: 67, 40: 72, 45: 77, 50: 82, 55: 87, 60: 90 },
      108: { 0: 31, 5: 36, 10: 41, 15: 46, 20: 51, 25: 56, 30: 61, 35: 66, 40: 71, 45: 76, 50: 81, 55: 86, 60: 90 },
      216: { 0: 30, 5: 35, 10: 40, 15: 45, 20: 50, 25: 55, 30: 60, 35: 65, 40: 70, 45: 75, 50: 80, 55: 85, 60: 90 }
    }
  },
  motivation: {
    male: {
      72: { 0: 38, 2: 42, 4: 46, 6: 50, 8: 54, 10: 58, 12: 62, 14: 66, 16: 70, 18: 75, 20: 80, 22: 85, 24: 90 },
      108: { 0: 37, 2: 41, 4: 45, 6: 49, 8: 53, 10: 57, 12: 61, 14: 65, 16: 69, 18: 74, 20: 79, 22: 84, 24: 89 },
      216: { 0: 36, 2: 40, 4: 44, 6: 48, 8: 52, 10: 56, 12: 60, 14: 64, 16: 68, 18: 73, 20: 78, 22: 83, 24: 88 }
    },
    female: {
      72: { 0: 40, 2: 44, 4: 48, 6: 52, 8: 56, 10: 60, 12: 64, 14: 68, 16: 72, 18: 77, 20: 82, 22: 87, 24: 90 },
      108: { 0: 39, 2: 43, 4: 47, 6: 51, 8: 55, 10: 59, 12: 63, 14: 67, 16: 71, 18: 76, 20: 81, 22: 86, 24: 90 },
      216: { 0: 38, 2: 42, 4: 46, 6: 50, 8: 54, 10: 58, 12: 62, 14: 66, 16: 70, 18: 75, 20: 80, 22: 85, 24: 90 }
    }
  },
  repetitive: {
    male: {
      72: { 0: 40, 2: 45, 4: 50, 6: 55, 8: 60, 10: 65, 12: 70, 14: 75, 16: 80, 18: 85, 20: 90 },
      108: { 0: 39, 2: 44, 4: 49, 6: 54, 8: 59, 10: 64, 12: 69, 14: 74, 16: 79, 18: 84, 20: 89 },
      216: { 0: 38, 2: 43, 4: 48, 6: 53, 8: 58, 10: 63, 12: 68, 14: 73, 16: 78, 18: 83, 20: 88 }
    },
    female: {
      72: { 0: 42, 2: 47, 4: 52, 6: 57, 8: 62, 10: 67, 12: 72, 14: 77, 16: 82, 18: 87, 20: 90 },
      108: { 0: 41, 2: 46, 4: 51, 6: 56, 8: 61, 10: 66, 12: 71, 14: 76, 16: 81, 18: 86, 20: 90 },
      216: { 0: 40, 2: 45, 4: 50, 6: 55, 8: 60, 10: 65, 12: 70, 14: 75, 16: 80, 18: 85, 20: 90 }
    }
  }
}


// ==========================================
// 3. 通用计算引擎 (Universal T-Score Lookup Engine)
// ==========================================

/**
 * 获取合适的年龄段 (向后兼容取上限)
 */
function findAgeBandKey(ageMap: AgeStratifiedTScoreMap, ageInMonths: number): number | null {
  const ageBands = Object.keys(ageMap).map(Number).sort((a, b) => a - b)
  for (const band of ageBands) {
    if (ageInMonths <= band) {
      return band
    }
  }
  // 如果月龄超出了配置表的最大值（如 > 216），默认使用最大的一组常模
  return ageBands[ageBands.length - 1] || null
}

/**
 *[核心修复] 使用线性插值(Linear Interpolation)计算平滑的 T分
 * 解决分数阶梯跳跃问题，并处理极端分数的越界(天花板/地板效应)
 */
function convertRawToT(tScoreMap: TScoreMap, rawScore: number): number {
  const rawPoints = Object.keys(tScoreMap).map(Number).sort((a, b) => a - b)
  
  // 1. 完美命中：字典里有这个原始分的准确映射
  if (tScoreMap[rawScore] !== undefined) {
    return tScoreMap[rawScore]
  }

  // 2. 地板效应兜底：原始分 <= 字典中的最低分
  if (rawScore <= rawPoints[0]) {
    return tScoreMap[rawPoints[0]]
  }

  // 3. 天花板效应兜底：原始分 >= 字典中的最高分
  if (rawScore >= rawPoints[rawPoints.length - 1]) {
    return tScoreMap[rawPoints[rawPoints.length - 1]]
  }

  // 4. 线性插值计算 (Linear Interpolation)
  let lower = rawPoints[0]
  let upper = rawPoints[rawPoints.length - 1]
  
  for (let i = 1; i < rawPoints.length; i++) {
    if (rawPoints[i] > rawScore) {
      upper = rawPoints[i]
      lower = rawPoints[i - 1]
      break
    }
  }

  const tLower = tScoreMap[lower]
  const tUpper = tScoreMap[upper]

  // 两点一线公式: y = y0 + (x - x0) * (y1 - y0) / (x1 - x0)
  const exactTScore = tLower + ((rawScore - lower) * (tUpper - tLower)) / (upper - lower)
  
  // 临床量表 T分标准输出为整数，四舍五入
  return Math.round(exactTScore)
}

/**
 * 通用表查询路由
 */
function getTScoreFromTable(
  table: TScoreTable,
  gender: Gender,
  ageInMonths: number,
  rawScore: number
): number {
  const genderKey = gender === '男' ? 'male' : 'female'
  const ageMap = table[genderKey]

  if (!ageMap || Object.keys(ageMap).length === 0) {
    console.warn(`[SRS-2 Engine] 缺失性别 "${genderKey}" 的常模数据，返回默认值 50`)
    return 50 
  }

  const ageBandKey = findAgeBandKey(ageMap, ageInMonths)
  if (ageBandKey === null) {
    console.warn(`[SRS-2 Engine] 未能匹配到月龄 ${ageInMonths} 的年龄组常模，返回默认值 50`)
    return 50
  }

  return convertRawToT(ageMap[ageBandKey], rawScore)
}


// ==========================================
// 4. 主暴露方法 (Main Export API)
// ==========================================

/**
 * 主入口：获取任何 SRS-2 维度（总分或子维度）的最终 T分
 *
 * @param scale 要查询的维度 ('total' | 'awareness' | 'cognition' | 'communication' | 'motivation' | 'repetitive')
 * @param gender 儿童性别 ('男' | '女')
 * @param ageInMonths 儿童年龄 (月龄)
 * @param rawScore 该维度的原始分总和
 * @returns 最终转换后的 T分数 (T-score)
 */
export function getSRSTScore(
  scale: 'total' | SubscaleCode,
  gender: Gender,
  ageInMonths: number,
  rawScore: number
): number {
  
  // 校验异常输入
  if (rawScore < 0 || isNaN(rawScore)) {
    console.error(`[SRS-2 Engine] 无效的原始分输入: ${rawScore}`)
    return 50
  }

  if (scale === 'total') {
    return getTScoreFromTable(TOTAL_SCORE_NORMS, gender, ageInMonths, rawScore)
  }

  const subscaleTable = SUBSCALE_NORMS[scale]
  if (!subscaleTable) {
    console.error(`[SRS-2 Engine] 无效的子维度代码: "${scale}"`)
    return 50
  }
  
  return getTScoreFromTable(subscaleTable, gender, ageInMonths, rawScore)
}