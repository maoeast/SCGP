// S-M量表常模数据和粗分-标准分换算表

export interface SMNorm {
  age_month: number;
  mean: number;  // 平均分
  sd: number;    // 标准差
}

// 粗分-标准分换算表（基于官方数据）
export interface SMRawToSQ {
  age_months: number;  // 年龄（月）
  age_label: string;   // 年龄标签
  raw_ranges: {
    [key: number]: string;  // 标准分对应的粗分范围
  };
}

// 评定等级定义
export interface SMEvaluationLevel {
  min_score: number;  // 最低标准分
  max_score: number;  // 最高标准分
  level: string;      // 等级描述
}

// S-M量表年龄分段与对应的月龄（与CSV文件一致）
export const smAgeRanges = [
  { label: '6月龄', min: 0, max: 11, months: 6 },      // 0-11个月（不满1岁）
  { label: '1岁', min: 12, max: 17, months: 12 },       // 12-17个月（1岁0个月-1岁5个月）
  { label: '1.5岁', min: 18, max: 23, months: 18 },    // 18-23个月（1岁6个月-1岁11个月）
  { label: '2岁', min: 24, max: 29, months: 24 },       // 24-29个月（2岁0个月-2岁5个月）
  { label: '2.5岁', min: 30, max: 35, months: 30 },    // 30-35个月（2岁6个月-2岁11个月）
  { label: '3岁', min: 36, max: 47, months: 36 },       // 36-47个月（3岁0个月-3岁11个月）
  { label: '4岁', min: 48, max: 59, months: 48 },       // 48-59个月（4岁0个月-4岁11个月）
  { label: '5岁', min: 60, max: 71, months: 60 },       // 60-71个月（5岁0个月-5岁11个月）
  { label: '6~7岁', min: 72, max: 95, months: 72 },    // 72-95个月（6岁0个月-7岁11个月）
  { label: '8~9岁', min: 96, max: 119, months: 96 },   // 96-119个月（8岁0个月-9岁11个月）
  { label: '10~11岁', min: 120, max: 143, months: 120 }, // 120-143个月（10岁0个月-11岁11个月）
  { label: '12~14岁', min: 144, max: 179, months: 144 }  // 144-179个月（12岁0个月-14岁11个月）
];

// 评定结果标准（修正：高分表示优秀，低分表示严重障碍）
export const SMEvaluationLevels: SMEvaluationLevel[] = [
  { min_score: 0, max_score: 5, level: '极重度' },
  { min_score: 6, max_score: 6, level: '重度' },
  { min_score: 7, max_score: 7, level: '中度' },
  { min_score: 8, max_score: 8, level: '轻度' },
  { min_score: 9, max_score: 9, level: '边缘' },
  { min_score: 10, max_score: 10, level: '正常' },
  { min_score: 11, max_score: 11, level: '高常' },
  { min_score: 12, max_score: 20, level: '优秀' }  // 12分及以上都是优秀
];

// 粗分-标准分换算表（官方数据）
export const smRawToSQTable: SMRawToSQ[] = [
  {
    age_months: 6,
    age_label: '6月龄',
    raw_ranges: {
      5: '',
      6: '',
      7: '',
      8: '',
      9: '<4',
      10: '4~10',
      11: '11~14',
      12: '15~18',
      13: '>18'
    }
  },
  {
    age_months: 12,
    age_label: '1岁',
    raw_ranges: {
      5: '',
      6: '',
      7: '',
      8: '<3',
      9: '3~9',
      10: '10~25',
      11: '26~33',
      12: '34~40',
      13: '>40'
    }
  },
  {
    age_months: 18,
    age_label: '1.5岁',
    raw_ranges: {
      5: '',
      6: '',
      7: '',
      8: '<8',
      9: '8~17',
      10: '18~37',
      11: '38~47',
      12: '48~57',
      13: '>57'
    }
  },
  {
    age_months: 24,
    age_label: '2岁',
    raw_ranges: {
      5: '',
      6: '<2',
      7: '2~11',
      8: '12~20',
      9: '21~29',
      10: '30~48',
      11: '49~58',
      12: '59~67',
      13: '>67'
    }
  },
  {
    age_months: 30,
    age_label: '2.5岁',
    raw_ranges: {
      5: '<4',
      6: '4~15',
      7: '16~23',
      8: '24~32',
      9: '33~53',
      10: '54~63',
      11: '64~73',
      12: '>73'
    }
  },
  {
    age_months: 36,
    age_label: '3岁',
    raw_ranges: {
      5: '',
      6: '<6',
      7: '6~17',
      8: '18~28',
      9: '29~40',
      10: '41~65',
      11: '66~76',
      12: '77~88',
      13: '>88'
    }
  },
  {
    age_months: 48,
    age_label: '4岁',
    raw_ranges: {
      5: '<5',
      6: '5~16',
      7: '17~28',
      8: '29~40',
      9: '41~51',
      10: '52~74',
      11: '75~88',
      12: '89~100',
      13: '>100'
    }
  },
  {
    age_months: 60,
    age_label: '5岁',
    raw_ranges: {
      5: '<9',
      6: '9~22',
      7: '23~37',
      8: '38~51',
      9: '52~65',
      10: '66~95',
      11: '96~109',
      12: '110~123',
      13: '>123'
    }
  },
  {
    age_months: 78, // 6.5岁，代表6-7岁
    age_label: '6~7岁',
    raw_ranges: {
      5: '<30',
      6: '30~42',
      7: '43~54',
      8: '55~67',
      9: '68~80',
      10: '81~106',
      11: '107~119',
      12: '120~131',
      13: '>131'
    }
  },
  {
    age_months: 102, // 8.5岁，代表8-9岁
    age_label: '8~9岁',
    raw_ranges: {
      5: '<38',
      6: '38~52',
      7: '53~66',
      8: '67~80',
      9: '81~95',
      10: '96~124',
      11: '>124',
      12: '',
      13: ''
    }
  },
  {
    age_months: 132, // 11岁，代表10-11岁
    age_label: '10~11岁',
    raw_ranges: {
      5: '<63',
      6: '63~74',
      7: '75~86',
      8: '87~97',
      9: '98~109',
      10: '110~122',
      11: '>122',
      12: '',
      13: ''
    }
  },
  {
    age_months: 156, // 13岁，代表12-14岁
    age_label: '12~14岁',
    raw_ranges: {
      5: '<70',
      6: '70~80',
      7: '81~91',
      8: '92~102',
      9: '103~113',
      10: '114~126',
      11: '>126',
      12: '',
      13: ''
    }
  }
];

// 根据月龄获取对应的换算表
export function getConversionTable(ageInMonths: number): SMRawToSQ | null {
  // 找到最接近的年龄分段
  for (let i = 0; i < smAgeRanges.length; i++) {
    const range = smAgeRanges[i];
    const table = smRawToSQTable[i];
    if (range && table && ageInMonths <= range.max) {
      return table;
    }
  }
  return smRawToSQTable[smRawToSQTable.length - 1] ?? null; // 返回最大年龄段的表
}

// 根据粗分计算标准分
export function calculateSQScore(rawScore: number, ageInMonths: number): number {
  console.log('📊 calculateSQScore - 输入: 粗分=', rawScore, ', 月龄=', ageInMonths);

  const table = getConversionTable(ageInMonths);
  if (!table) {
    console.log('⚠️ 未找到换算表，返回默认值10');
    return 10; // 默认正常分
  }

  console.log('📊 使用换算表:', table.age_label);

  // 查找标准分（从13分开始向下查找）
  for (let sq = 13; sq >= 5; sq--) {
    const range = table.raw_ranges[sq];
    if (!range) continue;

    console.log('  检查标准分', sq, '范围:', range);

    if (range.startsWith('<')) {
      const min = parseInt(range.substring(1));
      if (rawScore < min) {
        console.log('  ✅ 匹配! 粗分', rawScore, '< 最小值', min);
        return sq;
      }
    } else if (range.startsWith('>')) {
      const min = parseInt(range.substring(1));
      if (rawScore > min) {
        console.log('  ✅ 匹配! 粗分', rawScore, '> 最小值', min);
        return sq;
      }
    } else if (range.includes('~')) {
      const [min, max] = range.split('~').map(n => parseInt(n));
      if (min !== undefined && max !== undefined && rawScore >= min && rawScore <= max) {
        console.log('  ✅ 匹配! 粗分', rawScore, '在范围', min, '~', max, '内');
        return sq;
      }
    }
  }

  console.log('⚠️ 未找到匹配范围，返回默认值10');
  return 10; // 默认正常分
}

// 根据标准分获取评定等级
export function getEvaluationLevel(sqScore: number): string {
  for (const level of SMEvaluationLevels) {
    if (sqScore >= level.min_score && sqScore <= level.max_score) {
      return level.level;
    }
  }
  return '未知'; // 如果没有匹配的范围
}

// 根据粗分获取评定等级
export function getEvaluationLevelByRawScore(rawScore: number, ageInMonths: number): string {
  const sqScore = calculateSQScore(rawScore, ageInMonths);
  return getEvaluationLevel(sqScore);
}

// 初始化常模数据
export function initSMNorms(db: any) {
  // 插入年龄分段数据
  smAgeRanges.forEach((range, index) => {
    db.run(`
      INSERT INTO sm_norm (age_month, mean, sd)
      VALUES (?, ?, ?)
    `, [range.months, 0, 0]); // mean和sd暂时设为0，因为官方换算表没有提供
  });

  // 插入换算表数据（简化存储，实际使用时根据年龄查找）
  smRawToSQTable.forEach(table => {
    Object.entries(table.raw_ranges).forEach(([sqScore, rawRange]) => {
      if (rawRange) { // 只插入有数据的记录
        db.run(`
          INSERT INTO sm_raw_to_sq (raw_score, sq_score, level)
          VALUES (?, ?, ?)
        `, [parseInt(sqScore), parseInt(sqScore), rawRange]);
      }
    });
  });

  console.log(`已插入 ${smAgeRanges.length} 条年龄分段数据和换算表数据`);
}
