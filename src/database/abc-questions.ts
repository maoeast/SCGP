/**
 * ABC 孤独症儿童行为评定量表题库
 * Autism Behavior Checklist
 *
 * 57题，分为5个因子：
 * 1. 感觉 (Sensory)
 * 2. 交往 (Relating)
 * 3. 躯体运动 (Body and Object Use)
 * 4. 语言 (Language)
 * 5. 生活自理 (Social and Self-Help)
 *
 * 计分方式：加权计分（不同题目权重1-4分不等）
 * 总分范围：0-158分
 * 截断值：传统67-68分，研究显示49-62分可能更优
 * 分数越高表示孤独症症状越严重
 */

import type { ScaleQuestion } from '@/types/assessment'

/**
 * ABC 维度代码
 */
export type ABCDimensionCode = 'sensory' | 'relating' | 'body_object' | 'language' | 'social_self_help'

/**
 * ABC 维度名称
 */
export const ABC_DIMENSION_NAMES: Record<ABCDimensionCode, string> = {
  sensory: '感觉',
  relating: '交往',
  body_object: '躯体运动',
  language: '语言',
  social_self_help: '生活自理',
}

/**
 * ABC 题目接口（扩展原始 ScaleQuestion）
 */
export interface ABCQuestion {
  id: string
  text: string
  dimension: ABCDimensionCode
  weight: number // 加权分数：1-4分
}

/**
 * ABC 完整题库（57题）
 * 注意：以下题目内容为示例框架，需要根据实际ABC量表填充完整题目
 */
export const ABC_QUESTIONS: ABCQuestion[] = [
  // 感觉维度 (Sensory) - 约15题
  { id: 'abc_1', text: '对某些声音表现出异常反应（如捂住耳朵）', dimension: 'sensory', weight: 3 },
  { id: 'abc_2', text: '对疼痛的反应异常（反应过度或反应不足）', dimension: 'sensory', weight: 2 },
  { id: 'abc_3', text: '旋转物体或自己旋转', dimension: 'sensory', weight: 4 },
  { id: 'abc_4', text: '对某些质地或材料表现出异常反应', dimension: 'sensory', weight: 2 },
  { id: 'abc_5', text: '奇怪的触摸或嗅闻物品的方式', dimension: 'sensory', weight: 3 },

  // 交往维度 (Relating) - 约12题
  { id: 'abc_6', text: '不能建立眼神接触', dimension: 'relating', weight: 4 },
  { id: 'abc_7', text: '对他人漠不关心，似乎不知道他人存在', dimension: 'relating', weight: 4 },
  { id: 'abc_8', text: '不会主动与其他儿童一起玩', dimension: 'relating', weight: 3 },
  { id: 'abc_9', text: '不会用手势或表情表达需求', dimension: 'relating', weight: 3 },
  { id: 'abc_10', text: '不喜欢被拥抱或触摸', dimension: 'relating', weight: 2 },

  // 躯体运动维度 (Body and Object Use) - 约12题
  { id: 'abc_11', text: '手部拍打、扭转或其他重复性动作', dimension: 'body_object', weight: 4 },
  { id: 'abc_12', text: '摇晃身体', dimension: 'body_object', weight: 3 },
  { id: 'abc_13', text: '踮着脚尖走路', dimension: 'body_object', weight: 2 },
  { id: 'abc_14', text: '玩弄手指或物品的特殊方式', dimension: 'body_object', weight: 3 },
  { id: 'abc_15', text: '对物品的排列或位置有强迫性要求', dimension: 'body_object', weight: 3 },

  // 语言维度 (Language) - 约13题
  { id: 'abc_16', text: '无语言或语言发育明显延迟', dimension: 'language', weight: 4 },
  { id: 'abc_17', text: '重复别人的话（鹦鹉学舌）', dimension: 'language', weight: 3 },
  { id: 'abc_18', text: '人称代词混淆（如用"你"指代"我"）', dimension: 'language', weight: 3 },
  { id: 'abc_19', text: '不会用"是"或"否"回答问题', dimension: 'language', weight: 2 },
  { id: 'abc_20', text: '声调、节奏或语速异常', dimension: 'language', weight: 2 },

  // 生活自理维度 (Social and Self-Help) - 约5题
  { id: 'abc_21', text: '不会适当地使用玩具或物品', dimension: 'social_self_help', weight: 2 },
  { id: 'abc_22', text: '不会模仿成人的行为', dimension: 'social_self_help', weight: 3 },
  { id: 'abc_23', text: '不会遵守简单的社交规则', dimension: 'social_self_help', weight: 2 },
  { id: 'abc_24', text: '不会参与假装游戏或想象性游戏', dimension: 'social_self_help', weight: 3 },
  { id: 'abc_25', text: '对日常生活技能的学习困难', dimension: 'social_self_help', weight: 2 },

  // 以下为占位题目，实际应用时需要替换为完整的57题
  { id: 'abc_26', text: '[题目26 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_27', text: '[题目27 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_28', text: '[题目28 - 待补充]', dimension: 'relating', weight: 2 },
  { id: 'abc_29', text: '[题目29 - 待补充]', dimension: 'relating', weight: 2 },
  { id: 'abc_30', text: '[题目30 - 待补充]', dimension: 'body_object', weight: 2 },
  { id: 'abc_31', text: '[题目31 - 待补充]', dimension: 'body_object', weight: 2 },
  { id: 'abc_32', text: '[题目32 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_33', text: '[题目33 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_34', text: '[题目34 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_35', text: '[题目35 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_36', text: '[题目36 - 待补充]', dimension: 'relating', weight: 2 },
  { id: 'abc_37', text: '[题目37 - 待补充]', dimension: 'relating', weight: 2 },
  { id: 'abc_38', text: '[题目38 - 待补充]', dimension: 'body_object', weight: 2 },
  { id: 'abc_39', text: '[题目39 - 待补充]', dimension: 'body_object', weight: 2 },
  { id: 'abc_40', text: '[题目40 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_41', text: '[题目41 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_42', text: '[题目42 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_43', text: '[题目43 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_44', text: '[题目44 - 待补充]', dimension: 'relating', weight: 2 },
  { id: 'abc_45', text: '[题目45 - 待补充]', dimension: 'relating', weight: 2 },
  { id: 'abc_46', text: '[题目46 - 待补充]', dimension: 'body_object', weight: 2 },
  { id: 'abc_47', text: '[题目47 - 待补充]', dimension: 'body_object', weight: 2 },
  { id: 'abc_48', text: '[题目48 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_49', text: '[题目49 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_50', text: '[题目50 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_51', text: '[题目51 - 待补充]', dimension: 'sensory', weight: 2 },
  { id: 'abc_52', text: '[题目52 - 待补充]', dimension: 'relating', weight: 2 },
  { id: 'abc_53', text: '[题目53 - 待补充]', dimension: 'body_object', weight: 2 },
  { id: 'abc_54', text: '[题目54 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_55', text: '[题目55 - 待补充]', dimension: 'language', weight: 2 },
  { id: 'abc_56', text: '[题目56 - 待补充]', dimension: 'social_self_help', weight: 2 },
  { id: 'abc_57', text: '[题目57 - 待补充]', dimension: 'social_self_help', weight: 2 },
]

/**
 * ABC 各维度包含的题目ID
 */
export const ABC_DIMENSION_QUESTIONS: Record<ABCDimensionCode, string[]> = {
  sensory: ABC_QUESTIONS.filter(q => q.dimension === 'sensory').map(q => q.id),
  relating: ABC_QUESTIONS.filter(q => q.dimension === 'relating').map(q => q.id),
  body_object: ABC_QUESTIONS.filter(q => q.dimension === 'body_object').map(q => q.id),
  language: ABC_QUESTIONS.filter(q => q.dimension === 'language').map(q => q.id),
  social_self_help: ABC_QUESTIONS.filter(q => q.dimension === 'social_self_help').map(q => q.id),
}

/**
 * ABC 严重程度等级
 */
export type ABCLevel = 'normal' | 'borderline' | 'mild' | 'moderate' | 'severe'

/**
 * 根据总分判断严重程度
 * @param totalScore 总分
 * @returns 严重程度等级
 */
export function getABCLevel(totalScore: number): ABCLevel {
  if (totalScore < 49) return 'normal'
  if (totalScore < 62) return 'borderline'
  if (totalScore < 80) return 'mild'
  if (totalScore < 100) return 'moderate'
  return 'severe'
}

/**
 * 获取等级名称
 */
export const ABC_LEVEL_NAMES: Record<ABCLevel, string> = {
  normal: '正常范围',
  borderline: '边缘范围',
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
}

/**
 * 将 ABC 题库转换为 ScaleQuestion 格式
 */
export function getABCScaleQuestions(): ScaleQuestion[] {
  return ABC_QUESTIONS.map(q => ({
    id: q.id,
    content: q.text,
    dimension: q.dimension,
    options: [
      { label: '否', value: 0, score: 0 },
      { label: '是', value: 1, score: q.weight }, // 选"是"时得到该题的权重分
    ],
  }))
}
