/**
 * CBCL (Achenbach儿童行为量表) TypeScript类型定义
 * 适用于4-16岁儿童的行为评估
 */

// ==========================================
// 基础类型定义
// ==========================================

/** 性别类型 */
export type CBCLGender = 'boy' | 'girl';

/** 年龄组 */
export type CBCLAgeGroup = '4_5' | '6_11' | '12_16';

/** 常模组 (性别 × 年龄) */
export type CBCLNormGroup =
  | 'boy_4_5'
  | 'boy_6_11'
  | 'boy_12_16'
  | 'girl_4_5'
  | 'girl_6_11'
  | 'girl_12_16';

/** 选项值 (3点量表) */
export type CBCLOptionValue = 0 | 1 | 2;

// ==========================================
// 题目相关类型
// ==========================================

/** CBCL题目接口 */
export interface CBCLQuestion {
  /** 题号 (1-113, 或子题如 '56a', '56b' 等) */
  id: number | string;
  /** 题目文本 */
  text: string;
  /** 选项分值 */
  options: CBCLOptionValue[];
  /** 是否有填空说明 */
  hasDescription?: boolean;
  /** 是否为子题 (如56a-56h) */
  isSubItem?: boolean;
  /** 父题号 (对于子题) */
  parentId?: number;
}

/** 选项标签配置 */
export interface CBCLOption {
  value: CBCLOptionValue;
  label: string;
}

// ==========================================
// 常模相关类型
// ==========================================

/** 因子常模配置 */
export interface CBCLFactorNorm {
  /** 包含的题目 */
  items: (number | string)[];
  /** 第69百分位阈值 (边缘/正常分界) */
  p69: number;
  /** 第98百分位阈值 (异常/边缘分界) */
  p98: number;
}

/** 社会能力常模阈值 */
export interface CBCLSocialNorm {
  /** 活动能力临界值 */
  activity: number;
  /** 社交情况临界值 */
  social: number;
  /** 学校情况临界值 */
  school: number;
}

/** 总分上限配置 */
export interface CBCLTotalScoreLimit {
  [normGroup: string]: number;
}

/** 因子常模组 */
export interface CBCLFactorNorms {
  [factorName: string]: CBCLFactorNorm;
}

// ==========================================
// 社会能力数据类型 (第二部分)
// ==========================================

/** 文本输入项结构 (a, b, c + none选项) */
export interface CBCLTextItem {
  a: string;      // 第一个文本输入
  b: string;      // 第二个文本输入
  c: string;      // 第三个文本输入
  none: boolean;  // "无/没有"选项
}

/** 一般信息 (Part 1) */
export interface CBCLGeneralInfo {
  /** 填表者 */
  reporter: 'father' | 'mother' | 'other';
  /** 其他人关系 (当reporter为other时填写) */
  other_relation?: string;
  /** 父亲职业 */
  father_occupation: string;
  /** 母亲职业 */
  mother_occupation: string;
}

/** 社会能力文本输入数据 */
export interface CBCLSocialTexts {
  /** I. 体育运动 */
  sports: CBCLTextItem;
  /** II. 课余爱好 */
  hobbies: CBCLTextItem;
  /** III. 参加组织 */
  organizations: CBCLTextItem;
  /** IV. 劳动实践 */
  labor: CBCLTextItem;
}

/** 学校表现条件字段 */
export interface CBCLSchoolConditions {
  /** 是否在特殊教育班级 */
  is_special_ed: boolean;
  /** 特教班级性质 (当is_special_ed为true时填写) */
  special_ed_type?: string;
  /** 是否留过级 */
  is_retained: boolean;
  /** 留级年级 (当is_retained为true时填写) */
  retained_grade?: string;
  /** 留级理由 (当is_retained为true时填写) */
  retained_reason?: string;
  /** 是否有学习或其他问题 */
  has_problems: boolean;
  /** 问题内容 (当has_problems为true时填写) */
  problem_content?: string;
  /** 问题何时开始 (当has_problems为true时填写) */
  problem_start?: string;
  /** 问题是否已解决 */
  is_solved?: boolean;
  /** 何时解决 (当is_solved为true时填写) */
  solved_when?: string;
}

/** 社会能力表单数据 */
export interface CBCLSocialCompetenceData {
  // ===== Part 1: 一般信息 =====
  /** 填表者 */
  reporter: 'father' | 'mother' | 'other';
  /** 其他人关系 */
  other_relation?: string;
  /** 父亲职业 */
  father_occupation: string;
  /** 母亲职业 */
  mother_occupation: string;

  // ===== Part 2: 社会能力文本输入 =====
  /** I. 体育运动 - 文本输入 */
  sports: CBCLTextItem;
  /** II. 课余爱好 - 文本输入 */
  hobbies: CBCLTextItem;
  /** III. 参加组织 - 文本输入 */
  organizations: CBCLTextItem;
  /** IV. 劳动实践 - 文本输入 */
  labor: CBCLTextItem;

  // ===== I-IV 计分字段 (由文本自动计算) =====
  // I. 体育运动
  I_count: number;      // 爱好数量 (0-3) - 自动计算
  I_time: number;       // 时间投入 (0-3)
  I_level: number;      // 水平评价 (0-3)

  // II. 课余爱好
  II_count: number;     // 爱好数量 (0-3) - 自动计算
  II_time: number;      // 时间投入 (0-3)
  II_level: number;     // 水平评价 (0-3)

  // III. 参加组织
  III_count: number;    // 参加数量 (0-3) - 自动计算
  III_active: number;   // 活跃程度 (0-3)

  // IV. 劳动实践
  IV_count: number;     // 参与数量 (0-3) - 自动计算
  IV_quality: number;   // 完成质量 (0-3)

  // ===== V. 交友情况 =====
  V_friends: number;    // 朋友数量 (0-3)
  V_meet: number;       // 见面频率 (0-3)

  // ===== VI. 与同龄孩子相比 =====
  VI_a: number;         // 与兄弟姐妹相处 (0-2, -1表示无)
  VI_b: number;         // 与其他儿童相处 (0-2)
  VI_c: number;         // 对待父母态度 (0-2)
  VI_d: number;         // 独立做事表现 (0-2)

  // ===== VII. 学习表现 =====
  VII_math: number;     // 数学成绩 (0-3)
  VII_chinese: number;  // 语文成绩 (0-3)
  VII_english: number;  // 英语成绩 (0-3)
  VII_other: number;    // 其他科目 (0-3)
  VII_notInSchool: boolean;  // 未上学

  // VII. 条件字段
  VII_isSpecial: boolean;       // 是否特教班级
  VII_specialType?: string;     // 特教性质
  VII_isRetained: boolean;      // 是否留级
  VII_retainedGrade?: string;   // 留级年级
  VII_retainedReason?: string;  // 留级理由
  VII_hasProblem: boolean;      // 是否有学习问题
  VII_problemContent?: string;  // 问题内容
  VII_problemStart?: string;    // 问题开始时间
  VII_isSolved?: boolean;       // 是否已解决
  VII_solvedWhen?: string;      // 解决时间
}

// ==========================================
// 行为问题数据类型 (第三部分)
// ==========================================

/** 行为问题答案 */
export interface CBCLBehaviorAnswers {
  [questionId: string]: CBCLOptionValue;
}

/** 行为因子原始分 */
export interface CBCLBehaviorRawScores {
  [factorName: string]: number;
}

/** 因子T分数 */
export interface CBCLFactorTScores {
  [factorName: string]: number;
}

/** 因子评估结果 */
export interface CBCLFactorResult {
  /** 原始分 */
  rawScore: number;
  /** T分数 */
  tScore: number;
  /** 评估状态 */
  status: '正常' | '边缘/需关注' | '可能异常';
  /** 等级 (0:绿, 1:黄, 2:红) */
  level: 0 | 1 | 2;
  /** 第69百分位阈值 */
  p69Limit: number;
  /** 第98百分位阈值 */
  p98Limit: number;
}

// ==========================================
// 社会能力结果类型
// ==========================================

/** 社会能力因子结果 */
export interface CBCLSocialFactorResult {
  /** 原始分 */
  score: number;
  /** 状态描述 */
  status: string;
  /** 等级 (0:绿, 1:黄, 2:红) */
  level: 0 | 1 | 2;
  /** T分数 (代表值: 50=正常, 35=边缘, 30=异常) */
  tScore: number;
}

/** 社会能力评估结果 */
export interface CBCLSocialCompetenceResult {
  /** 常模组 */
  group: CBCLNormGroup | null;
  /** 活动能力 */
  activity: CBCLSocialFactorResult;
  /** 社交情况 */
  social: CBCLSocialFactorResult;
  /** 学校情况 */
  school: CBCLSocialFactorResult;
  /** 原始分记录 */
  rawScores: {
    factorActivity: number;
    factorSocial: number;
    factorSchool: number;
  };
}

// ==========================================
// 综合结果类型
// ==========================================

/** CBCL完整评估结果 */
export interface CBCLScoreResult {
  /** 学生信息 */
  student: {
    gender: CBCLGender;
    age: number;
    ageMonths?: number;
  };
  /** 时间戳 */
  timestamp: string;

  /** 常模组 */
  normGroup: CBCLNormGroup;

  // 社会能力结果
  socialCompetence: CBCLSocialCompetenceResult | null;

  // 行为问题结果
  behaviorProblems: {
    /** 总原始分 */
    totalRawScore: number;
    /** 总分上限 */
    totalLimit: number;
    /** 总分是否异常 */
    isTotalAbnormal: boolean;
    /** 各因子结果 */
    factorResults: { [factorName: string]: CBCLFactorResult };
    /** 异常因子列表 */
    abnormalFactors: string[];
  };

  // 宽带量表 (Broad Band)
  broadBand?: {
    /** 内化问题总分 */
    internalizingRaw: number;
    internalizingTScore?: number;
    /** 外化问题总分 */
    externalizingRaw: number;
    externalizingTScore?: number;
  };

  /** 综合建议 */
  overallSuggestion: string;
}

// ==========================================
// 评估记录类型 (用于数据库存储)
// ==========================================

/** CBCL评估记录 */
export interface CBCLAssessmentRecord {
  id?: number;
  student_id: number;
  assess_date: string;
  assessor: string;
  // 社会能力原始数据
  social_data: CBCLSocialCompetenceData;
  // 行为问题答案
  behavior_answers: CBCLBehaviorAnswers;
  // 计算结果
  result: CBCLScoreResult;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// 反馈配置相关类型
// ==========================================

/** 反馈等级配置 */
export interface CBCLFeedbackLevel {
  /** T分数范围 [min, max] */
  range_t_score: [number, number];
  /** 严重程度 */
  severity: 'success' | 'warning' | 'danger';
  /** 标题 */
  title: string;
  /** 总结文本 */
  summary: string;
  /** 专家建议 */
  expert_advice: string;
}

/** 因子反馈配置 */
export interface CBCLFactorFeedback {
  label: string;
  levels: CBCLFeedbackLevel[];
}

/** CBCL反馈配置 */
export interface CBCLFeedbackConfig {
  total_scale: {
    label: string;
    description: string;
    levels: CBCLFeedbackLevel[];
  };
  social_competence: {
    label: string;
    description: string;
    levels: CBCLFeedbackLevel[];
  };
  syndromes: {
    [factorKey: string]: CBCLFactorFeedback;
  };
  broad_band?: {
    internalizing?: CBCLFactorFeedback;
    externalizing?: CBCLFactorFeedback;
  };
}

// ==========================================
// 辅助函数类型
// ==========================================

/** 获取常模配置函数 */
export type GetNormConfigFn = (gender: CBCLGender, age: number) => CBCLFactorNorms | null;

/** 确定常模组函数 */
export type DetermineNormGroupFn = (gender: CBCLGender, ageMonths: number) => CBCLNormGroup;

/** 计算社会能力函数 */
export type CalculateSocialCompetenceFn = (
  gender: CBCLGender,
  age: number,
  data: CBCLSocialCompetenceData
) => CBCLSocialCompetenceResult | null;

/** 计算行为问题函数 */
export type CalculateBehaviorProblemsFn = (
  gender: CBCLGender,
  age: number,
  answers: CBCLBehaviorAnswers
) => CBCLScoreResult['behaviorProblems'] & { group: CBCLNormGroup; suggestion: string };

/** 完整评估函数 */
export type EvaluateCBCLFn = (
  studentInfo: { gender: CBCLGender; age: number },
  part2Data: CBCLSocialCompetenceData,
  part3Answers: CBCLBehaviorAnswers
) => CBCLScoreResult;
