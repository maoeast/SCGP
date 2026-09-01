/**
 * ATEC 孤独症治疗评估量表题库
 * Autism Treatment Evaluation Checklist
 *
 * 77题，分为4个分量表：
 * 1. Speech/Language/Communication（言语/语言/交流）- 14题
 * 2. Sociability（社交能力）- 20题
 * 3. Sensory/Cognitive Awareness（感觉/认知意识）- 18题
 * 4. Health/Physical/Behavior（健康/生理/行为）- 25题
 *
 * 计分方式：每题0-2分（Not true=0, Somewhat true=1, Very true=2）
 * 总分范围：0-154分
 * 分数越高表示症状越严重
 */

import type { ScaleQuestion } from '@/types/assessment'

/**
 * ATEC 分量表代码
 */
export type ATECSubscaleCode = 'speech' | 'sociability' | 'sensory' | 'health'

/**
 * ATEC 分量表名称
 */
export const ATEC_SUBSCALE_NAMES: Record<ATECSubscaleCode, string> = {
  speech: '言语/语言/交流',
  sociability: '社交能力',
  sensory: '感觉/认知意识',
  health: '健康/生理/行为',
}

/**
 * ATEC 题目接口
 */
export interface ATECQuestion {
  id: string
  text: string
  subscale: ATECSubscaleCode
}

/**
 * ATEC 完整题库（77题）
 * 注意：以下题目内容为示例框架，需要根据实际ATEC量表填充完整题目
 */
export const ATEC_QUESTIONS: ATECQuestion[] = [
  // I. Speech/Language/Communication（言语/语言/交流）- 14题
  { id: 'atec_1', text: '知道自己的名字', subscale: 'speech' },
  { id: 'atec_2', text: '能回应口头指令', subscale: 'speech' },
  { id: 'atec_3', text: '能使用一个词', subscale: 'speech' },
  { id: 'atec_4', text: '能使用两个词的短语', subscale: 'speech' },
  { id: 'atec_5', text: '能使用句子', subscale: 'speech' },
  { id: 'atec_6', text: '知道10个或更多词', subscale: 'speech' },
  { id: 'atec_7', text: '能进行有意义的对话', subscale: 'speech' },
  { id: 'atec_8', text: '能用手势或点头表达需求', subscale: 'speech' },
  { id: 'atec_9', text: '能主动发起交流', subscale: 'speech' },
  { id: 'atec_10', text: '能理解他人的情绪', subscale: 'speech' },
  { id: 'atec_11', text: '能适当使用"是"和"否"', subscale: 'speech' },
  { id: 'atec_12', text: '说话时眼神接触适当', subscale: 'speech' },
  { id: 'atec_13', text: '能表达自己的感受', subscale: 'speech' },
  { id: 'atec_14', text: '语调和音量适当', subscale: 'speech' },

  // II. Sociability（社交能力）- 20题
  { id: 'atec_15', text: '似乎与人隔绝，活在自己的世界里', subscale: 'sociability' },
  { id: 'atec_16', text: '忽视其他人', subscale: 'sociability' },
  { id: 'atec_17', text: '几乎不注意他人', subscale: 'sociability' },
  { id: 'atec_18', text: '不合作或反抗', subscale: 'sociability' },
  { id: 'atec_19', text: '不会模仿他人', subscale: 'sociability' },
  { id: 'atec_20', text: '不喜欢被拥抱或触摸', subscale: 'sociability' },
  { id: 'atec_21', text: '不会分享或展示物品', subscale: 'sociability' },
  { id: 'atec_22', text: '不会挥手告别', subscale: 'sociability' },
  { id: 'atec_23', text: '不会微笑回应他人', subscale: 'sociability' },
  { id: 'atec_24', text: '不会主动接近他人', subscale: 'sociability' },
  { id: 'atec_25', text: '不会寻求帮助', subscale: 'sociability' },
  { id: 'atec_26', text: '不理解社交规则', subscale: 'sociability' },
  { id: 'atec_27', text: '更喜欢独自玩耍', subscale: 'sociability' },
  { id: 'atec_28', text: '缺乏同理心', subscale: 'sociability' },
  { id: 'atec_29', text: '不会参与团体活动', subscale: 'sociability' },
  { id: 'atec_30', text: '不会交朋友', subscale: 'sociability' },
  { id: 'atec_31', text: '不会假装游戏', subscale: 'sociability' },
  { id: 'atec_32', text: '避免眼神接触', subscale: 'sociability' },
  { id: 'atec_33', text: '对他人的存在无反应', subscale: 'sociability' },
  { id: 'atec_34', text: '情感表达不恰当', subscale: 'sociability' },

  // III. Sensory/Cognitive Awareness（感觉/认知意识）- 18题
  { id: 'atec_35', text: '能适当回应自己的名字', subscale: 'sensory' },
  { id: 'atec_36', text: '能分辨不同的声音', subscale: 'sensory' },
  { id: 'atec_37', text: '能注意到环境变化', subscale: 'sensory' },
  { id: 'atec_38', text: '触觉反应过敏或迟钝', subscale: 'sensory' },
  { id: 'atec_39', text: '对疼痛反应异常', subscale: 'sensory' },
  { id: 'atec_40', text: '对某些声音过度敏感', subscale: 'sensory' },
  { id: 'atec_41', text: '视觉追踪困难', subscale: 'sensory' },
  { id: 'atec_42', text: '不会适当地看物品', subscale: 'sensory' },
  { id: 'atec_43', text: '喜欢旋转物体', subscale: 'sensory' },
  { id: 'atec_44', text: '对质地或材料过度挑剔', subscale: 'sensory' },
  { id: 'atec_45', text: '嗅觉或味觉异常', subscale: 'sensory' },
  { id: 'atec_46', text: '注意力持续时间短', subscale: 'sensory' },
  { id: 'atec_47', text: '容易分心', subscale: 'sensory' },
  { id: 'atec_48', text: '学习新技能困难', subscale: 'sensory' },
  { id: 'atec_49', text: '理解因果关系困难', subscale: 'sensory' },
  { id: 'atec_50', text: '记忆力差', subscale: 'sensory' },
  { id: 'atec_51', text: '问题解决能力弱', subscale: 'sensory' },
  { id: 'atec_52', text: '执行多步骤指令困难', subscale: 'sensory' },

  // IV. Health/Physical/Behavior（健康/生理/行为）- 25题
  { id: 'atec_53', text: '睡眠问题', subscale: 'health' },
  { id: 'atec_54', text: '饮食问题（挑食、偏食）', subscale: 'health' },
  { id: 'atec_55', text: '消化问题（便秘、腹泻）', subscale: 'health' },
  { id: 'atec_56', text: '过度活跃', subscale: 'health' },
  { id: 'atec_57', text: '嗜睡或缺乏活力', subscale: 'health' },
  { id: 'atec_58', text: '发脾气或暴怒', subscale: 'health' },
  { id: 'atec_59', text: '攻击性行为', subscale: 'health' },
  { id: 'atec_60', text: '自伤行为', subscale: 'health' },
  { id: 'atec_61', text: '焦虑或恐惧', subscale: 'health' },
  { id: 'atec_62', text: '情绪不稳定', subscale: 'health' },
  { id: 'atec_63', text: '不恰当的笑或哭', subscale: 'health' },
  { id: 'atec_64', text: '重复性行为或刻板动作', subscale: 'health' },
  { id: 'atec_65', text: '对变化的抵抗', subscale: 'health' },
  { id: 'atec_66', text: '强迫性行为', subscale: 'health' },
  { id: 'atec_67', text: '不寻常的依恋物品', subscale: 'health' },
  { id: 'atec_68', text: '协调性差', subscale: 'health' },
  { id: 'atec_69', text: '肌肉张力异常', subscale: 'health' },
  { id: 'atec_70', text: '过度兴奋', subscale: 'health' },
  { id: 'atec_71', text: '注意力缺陷', subscale: 'health' },
  { id: 'atec_72', text: '冲动行为', subscale: 'health' },
  { id: 'atec_73', text: '破坏性行为', subscale: 'health' },
  { id: 'atec_74', text: '不适当的行为', subscale: 'health' },
  { id: 'atec_75', text: '缺乏安全意识', subscale: 'health' },
  { id: 'atec_76', text: '过度依赖', subscale: 'health' },
  { id: 'atec_77', text: '整体健康状况差', subscale: 'health' },
]

/**
 * ATEC 各分量表包含的题目ID
 */
export const ATEC_SUBSCALE_QUESTIONS: Record<ATECSubscaleCode, string[]> = {
  speech: ATEC_QUESTIONS.filter(q => q.subscale === 'speech').map(q => q.id),
  sociability: ATEC_QUESTIONS.filter(q => q.subscale === 'sociability').map(q => q.id),
  sensory: ATEC_QUESTIONS.filter(q => q.subscale === 'sensory').map(q => q.id),
  health: ATEC_QUESTIONS.filter(q => q.subscale === 'health').map(q => q.id),
}

/**
 * ATEC 各分量表的最大分数
 */
export const ATEC_SUBSCALE_MAX_SCORES: Record<ATECSubscaleCode, number> = {
  speech: 28,      // 14题 × 2分
  sociability: 40, // 20题 × 2分
  sensory: 36,     // 18题 × 2分
  health: 50,      // 25题 × 2分
}

/**
 * ATEC 严重程度等级
 */
export type ATECLevel = 'minimal' | 'mild' | 'moderate' | 'severe'

/**
 * 根据总分判断严重程度
 * @param totalScore 总分（0-154）
 * @returns 严重程度等级
 */
export function getATECLevel(totalScore: number): ATECLevel {
  if (totalScore < 30) return 'minimal'
  if (totalScore < 50) return 'mild'
  if (totalScore < 104) return 'moderate'
  return 'severe'
}

/**
 * 获取等级名称
 */
export const ATEC_LEVEL_NAMES: Record<ATECLevel, string> = {
  minimal: '轻微',
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
}

/**
 * 将 ATEC 题库转换为 ScaleQuestion 格式
 */
export function getATECScaleQuestions(): ScaleQuestion[] {
  return ATEC_QUESTIONS.map(q => ({
    id: q.id,
    content: q.text,
    dimension: q.subscale,
    options: [
      { label: '否', value: 0, score: 0 },
      { label: '部分是', value: 1, score: 1 },
      { label: '完全是', value: 2, score: 2 },
    ],
  }))
}

/**
 * 计算分量表得分
 */
export function calculateSubscaleScore(
  answers: Record<string, number>,
  subscale: ATECSubscaleCode
): number {
  const questionIds = ATEC_SUBSCALE_QUESTIONS[subscale]
  return questionIds.reduce((sum, id) => {
    return sum + (answers[id] || 0)
  }, 0)
}
