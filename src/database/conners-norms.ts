/**
 * Conners 量表常模数据和评分函数
 * 区分性别(男/女)和年龄段(3-5/6-8/9-11/12-14/15-17岁)
 * 使用 Z 分数转 T 分数公式: T = 50 + 10 × Z
 * 基于 Conners 1978 年修订版常模数据
 */

// 年龄段分组
export type AgeGroup = '3-5' | '6-8' | '9-11' | '12-14' | '15-17'
export type Gender = 'male' | 'female'

// 维度常模数据
export interface DimensionNorm {
  mean: number
  sd: number
}

// PSQ 常模数据 (基于文档第82-237行的数据)
// 维度顺序：品行问题、学习问题、心身障碍、冲动-多动、焦虑、多动指数
export const connersPSQNorms: Record<Gender, Record<AgeGroup, Record<string, DimensionNorm>>> = {
  male: {
    '3-5': {
      conduct: { mean: 0.53, sd: 0.39 },           // 品行问题
      learning: { mean: 0.50, sd: 0.33 },          // 学习问题
      psychosomatic: { mean: 0.07, sd: 0.15 },     // 心身障碍
      impulsivity_hyperactivity: { mean: 1.01, sd: 0.65 }, // 冲动-多动
      anxiety: { mean: 0.61, sd: 0.40 },           // 焦虑 (修正: 0.60→0.61, 0.61→0.40)
      hyperactivity_index: { mean: 0.72, sd: 0.40 } // 多动指数
    },
    '6-8': {
      conduct: { mean: 0.50, sd: 0.40 },
      learning: { mean: 0.64, sd: 0.45 },
      psychosomatic: { mean: 0.13, sd: 0.23 },
      impulsivity_hyperactivity: { mean: 0.93, sd: 0.60 },
      anxiety: { mean: 0.51, sd: 0.69 },            // 焦虑 SD修正: 0.51→0.69
      hyperactivity_index: { mean: 0.51, sd: 0.46 } // 多动指数 Mean修正: 0.69→0.51
    },
    '9-11': {
      conduct: { mean: 0.53, sd: 0.38 },
      learning: { mean: 0.54, sd: 0.52 },
      psychosomatic: { mean: 0.18, sd: 0.26 },
      impulsivity_hyperactivity: { mean: 0.92, sd: 0.60 },
      anxiety: { mean: 0.42, sd: 0.47 },
      hyperactivity_index: { mean: 0.66, sd: 0.44 }
    },
    '12-14': {
      conduct: { mean: 0.49, sd: 0.41 },
      learning: { mean: 0.66, sd: 0.57 },
      psychosomatic: { mean: 0.22, sd: 0.44 },
      impulsivity_hyperactivity: { mean: 0.82, sd: 0.54 },
      anxiety: { mean: 0.58, sd: 0.59 },
      hyperactivity_index: { mean: 0.62, sd: 0.45 }
    },
    '15-17': {
      conduct: { mean: 0.47, sd: 0.44 },
      learning: { mean: 0.62, sd: 0.55 },
      psychosomatic: { mean: 0.13, sd: 0.26 },
      impulsivity_hyperactivity: { mean: 0.70, sd: 0.51 },
      anxiety: { mean: 0.59, sd: 0.58 },
      hyperactivity_index: { mean: 0.51, sd: 0.41 }
    }
  },
  female: {
    '3-5': {
      conduct: { mean: 0.49, sd: 0.35 },
      learning: { mean: 0.62, sd: 0.57 },
      psychosomatic: { mean: 0.10, sd: 0.17 },
      impulsivity_hyperactivity: { mean: 1.15, sd: 0.77 },
      anxiety: { mean: 0.51, sd: 0.59 },
      hyperactivity_index: { mean: 0.78, sd: 0.56 }
    },
    '6-8': {
      conduct: { mean: 0.41, sd: 0.28 },
      learning: { mean: 0.45, sd: 0.38 },
      psychosomatic: { mean: 0.19, sd: 0.27 },
      impulsivity_hyperactivity: { mean: 0.95, sd: 0.59 },
      anxiety: { mean: 0.57, sd: 0.59 },            // 焦虑 SD修正: 0.66→0.59
      hyperactivity_index: { mean: 0.66, sd: 0.35 } // 多动指数 Mean修正: 0.59→0.66
    },
    '9-11': {
      conduct: { mean: 0.40, sd: 0.36 },
      learning: { mean: 0.43, sd: 0.38 },
      psychosomatic: { mean: 0.17, sd: 0.28 },
      impulsivity_hyperactivity: { mean: 0.80, sd: 0.59 },
      anxiety: { mean: 0.49, sd: 0.57 },
      hyperactivity_index: { mean: 0.52, sd: 0.34 }
    },
    '12-14': {
      conduct: { mean: 0.39, sd: 0.40 },
      learning: { mean: 0.44, sd: 0.45 },
      psychosomatic: { mean: 0.23, sd: 0.28 },
      impulsivity_hyperactivity: { mean: 0.72, sd: 0.55 },
      anxiety: { mean: 0.54, sd: 0.53 },
      hyperactivity_index: { mean: 0.49, sd: 0.34 }
    },
    '15-17': {
      conduct: { mean: 0.37, sd: 0.33 },
      learning: { mean: 0.35, sd: 0.38 },
      psychosomatic: { mean: 0.19, sd: 0.25 },
      impulsivity_hyperactivity: { mean: 0.60, sd: 0.55 },
      anxiety: { mean: 0.51, sd: 0.53 },
      hyperactivity_index: { mean: 0.42, sd: 0.34 }
    }
  }
}

// TRS 常模数据 (基于文档第304-373行的数据)
// 维度顺序：品行问题、多动、不注意-被动、多动指数
export const connersTRSNorms: Record<Gender, Record<AgeGroup, Record<string, DimensionNorm>>> = {
  male: {
    '3-5': {
      conduct: { mean: 0.45, sd: 0.80 },           // 品行问题
      hyperactivity: { mean: 0.79, sd: 0.89 },      // 多动
      inattention_passivity: { mean: 0.92, sd: 1.00 }, // 不注意-被动
      hyperactivity_index: { mean: 0.81, sd: 0.96 } // 多动指数
    },
    '6-8': {
      conduct: { mean: 0.32, sd: 0.43 },
      hyperactivity: { mean: 0.60, sd: 0.65 },
      inattention_passivity: { mean: 0.76, sd: 0.74 },
      hyperactivity_index: { mean: 0.58, sd: 0.61 }
    },
    '9-11': {
      conduct: { mean: 0.50, sd: 0.66 },
      hyperactivity: { mean: 0.70, sd: 0.78 },
      inattention_passivity: { mean: 0.85, sd: 0.73 },
      hyperactivity_index: { mean: 0.67, sd: 0.65 }
    },
    '12-14': {
      conduct: { mean: 0.23, sd: 0.38 },
      hyperactivity: { mean: 0.41, sd: 0.49 },
      inattention_passivity: { mean: 0.71, sd: 0.63 },
      hyperactivity_index: { mean: 0.44, sd: 0.43 }
    },
    '15-17': {
      conduct: { mean: 0.22, sd: 0.37 },
      hyperactivity: { mean: 0.34, sd: 0.44 },
      inattention_passivity: { mean: 0.68, sd: 0.67 },
      hyperactivity_index: { mean: 0.41, sd: 0.45 }
    }
  },
  female: {
    '3-5': {
      conduct: { mean: 0.53, sd: 0.68 },
      hyperactivity: { mean: 0.69, sd: 0.56 },
      inattention_passivity: { mean: 0.72, sd: 0.71 },
      hyperactivity_index: { mean: 0.74, sd: 0.67 }
    },
    '6-8': {
      conduct: { mean: 0.28, sd: 0.37 },
      hyperactivity: { mean: 0.28, sd: 0.38 },
      inattention_passivity: { mean: 0.47, sd: 0.64 },
      hyperactivity_index: { mean: 0.36, sd: 0.45 }
    },
    '9-11': {
      conduct: { mean: 0.28, sd: 0.49 },
      hyperactivity: { mean: 0.38, sd: 0.51 },
      inattention_passivity: { mean: 0.49, sd: 0.53 },
      hyperactivity_index: { mean: 0.38, sd: 0.48 }
    },
    '12-14': {
      conduct: { mean: 0.15, sd: 0.23 },
      hyperactivity: { mean: 0.19, sd: 0.27 },
      inattention_passivity: { mean: 0.32, sd: 0.42 },
      hyperactivity_index: { mean: 0.18, sd: 0.24 }
    },
    '15-17': {
      conduct: { mean: 0.33, sd: 0.68 },
      hyperactivity: { mean: 0.32, sd: 0.63 },
      inattention_passivity: { mean: 0.45, sd: 0.47 },
      hyperactivity_index: { mean: 0.36, sd: 0.62 }
    }
  }
}

/**
 * 根据月龄获取年龄段
 */
export function getAgeGroup(ageMonths: number): AgeGroup {
  const age = Math.floor(ageMonths / 12)
  if (age >= 3 && age <= 5) return '3-5'
  if (age >= 6 && age <= 8) return '6-8'
  if (age >= 9 && age <= 11) return '9-11'
  if (age >= 12 && age <= 14) return '12-14'
  return '15-17'
}

/**
 * 计算 Conners T 分数
 * Z 分数 = (原始分 - 均值) / 标准差
 * T 分数 = 50 + 10 × Z 分数
 */
export function calculateConnersTScore(
  rawScore: number,
  gender: Gender,
  ageMonths: number,
  dimension: string,
  scaleType: 'psq' | 'trs'
): number {
  const norms = scaleType === 'psq' ? connersPSQNorms : connersTRSNorms
  const ageGroup = getAgeGroup(ageMonths)

  const normData = norms[gender][ageGroup][dimension]
  if (!normData) {
    console.warn(`No norm data for ${gender} ${ageGroup} ${dimension}`)
    return 50
  }

  // Z 分数
  const zScore = (rawScore - normData.mean) / normData.sd

  // T 分数
  const tScore = 50 + 10 * zScore

  const finalTScore = Math.round(tScore * 10) / 10  // 保留一位小数

  // 🔬 T 分计算过程日志 - 用于验证算分精度
  console.log(`%c[Conners T分计算] ${scaleType.toUpperCase()} - ${dimension}`, 'color: #4CAF50; font-weight: bold;')
  console.table({
    '维度': dimension,
    '性别': gender === 'male' ? '男' : '女',
    '年龄(月)': ageMonths,
    '年龄段': ageGroup,
    '原始分(Raw)': rawScore.toFixed(2),
    '常模均值(Mean)': normData.mean.toFixed(2),
    '常模标准差(SD)': normData.sd.toFixed(2),
    'Z分数': `(${rawScore.toFixed(2)} - ${normData.mean.toFixed(2)}) / ${normData.sd.toFixed(2)} = ${zScore.toFixed(4)}`,
    'T分公式': `50 + 10 × ${zScore.toFixed(4)} = ${tScore.toFixed(2)}`,
    '最终T分': finalTScore
  })

  return finalTScore
}

/**
 * 计算评定等级
 */
export function determineConnersLevel(tScores: Record<string, number>): string {
  // 使用多动指数或最高T分
  const scores = Object.values(tScores)
  const maxScore = Math.max(...scores)

  if (maxScore < 60) return 'normal'
  if (maxScore < 70) return 'borderline'
  return 'clinical'
}
