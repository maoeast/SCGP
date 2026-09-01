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
 * 题目来源：孤独症（自闭症）行为量表（ABC量表），Krug 1978
 * 本版本对原始题目表述进行了现代化优化，使其更易于当代教师和家长理解
 * 计分说明：回答"是"得题目权重分数，回答"不是"得0分
 * 总分：0-158分，筛查分57分，诊断分67分
 */
export const ABC_QUESTIONS: ABCQuestion[] = [
  // 感觉维度 (Sensory) - 共14题
  { id: 'abc_1', text: '喜欢原地转圈，或长时间让自己旋转', dimension: 'sensory', weight: 4 },
  { id: 'abc_6', text: '难以分辨物体的特征（如大小、颜色、位置等）', dimension: 'sensory', weight: 2 },
  { id: 'abc_10', text: '叫他时常常没反应，好像听不见似的', dimension: 'sensory', weight: 3 },
  { id: 'abc_13', text: '伸手去拿东西时，经常够不到（对距离判断不准）', dimension: 'sensory', weight: 2 },
  { id: 'abc_21', text: '对很大的声音（如鞭炮、关门声）没有吃惊反应', dimension: 'sensory', weight: 3 },
  { id: 'abc_26', text: '摔倒、受伤或打针时，好像不觉得疼', dimension: 'sensory', weight: 3 },
  { id: 'abc_34', text: '强光照眼睛时也不眨眼', dimension: 'sensory', weight: 1 },
  { id: 'abc_39', text: '在嘈杂环境中常常捂住耳朵', dimension: 'sensory', weight: 4 },
  { id: 'abc_44', text: '在正常光线下会眯眼、闭眼或皱眉', dimension: 'sensory', weight: 3 },
  { id: 'abc_49', text: '对周围环境缺乏警觉，不注意潜在危险', dimension: 'sensory', weight: 2 },
  { id: 'abc_51', text: '喜欢闻、摸或用嘴尝周围的东西', dimension: 'sensory', weight: 3 },
  { id: 'abc_52', text: '陌生人来了也不看一眼', dimension: 'sensory', weight: 3 },
  { id: 'abc_55', text: '2岁前就发现发育比同龄孩子慢', dimension: 'sensory', weight: 1 },
  { id: 'abc_57', text: '会长时间盯着一个地方发呆', dimension: 'sensory', weight: 4 },

  // 交往维度 (Relating) - 共12题
  { id: 'abc_3', text: '很少主动与人接触或交流', dimension: 'relating', weight: 4 },
  { id: 'abc_7', text: '不会对人微笑、点头或打招呼', dimension: 'relating', weight: 2 },
  { id: 'abc_15', text: '和别人在一起时，叫他名字也没反应', dimension: 'relating', weight: 2 },
  { id: 'abc_17', text: '看不懂别人的面部表情（如高兴、生气等）', dimension: 'relating', weight: 3 },
  { id: 'abc_24', text: '主动避开与别人的眼神接触', dimension: 'relating', weight: 4 },
  { id: 'abc_25', text: '不喜欢被人接触或拥抱', dimension: 'relating', weight: 4 },
  { id: 'abc_33', text: '玩游戏时不会模仿其他小朋友', dimension: 'relating', weight: 3 },
  { id: 'abc_38', text: '无法与其他小朋友建立友谊', dimension: 'relating', weight: 4 },
  { id: 'abc_47', text: '会一直盯着人看，眼神很专注', dimension: 'relating', weight: 4 },
  { id: 'abc_2', text: '刚学会的简单事情很快就忘了', dimension: 'relating', weight: 2 },
  { id: 'abc_4', text: '听不懂简单的指令（如"坐下""过来"等）', dimension: 'relating', weight: 1 },
  { id: 'abc_20', text: '听不懂带方位词的指令（如"把球放在盒子上/里"）', dimension: 'relating', weight: 1 },

  // 躯体运动维度 (Body and Object Use) - 共18题
  { id: 'abc_5', text: '不会正常玩玩具（只会转动、乱扔或揉捏）', dimension: 'body_object', weight: 2 },
  { id: 'abc_9', text: '长时间手里拿着某样东西不放', dimension: 'body_object', weight: 3 },
  { id: 'abc_12', text: '长时间地前后摇晃身体', dimension: 'body_object', weight: 4 },
  { id: 'abc_16', text: '经常出现前冲、转圈、踮脚走路、手指轻弹等重复动作', dimension: 'body_object', weight: 4 },
  { id: 'abc_22', text: '经常拍打自己的手', dimension: 'body_object', weight: 4 },
  { id: 'abc_27', text: '身体很僵硬，抱起来很费劲', dimension: 'body_object', weight: 3 },
  { id: 'abc_28', text: '抱着他时感觉肌肉很松软，不会往你身上靠', dimension: 'body_object', weight: 2 },
  { id: 'abc_29', text: '想要什么东西时，只会用手势比划，不用语言表达', dimension: 'body_object', weight: 2 },
  { id: 'abc_30', text: '经常踮着脚尖走路', dimension: 'body_object', weight: 2 },
  { id: 'abc_31', text: '会咬人、撞人或踢人', dimension: 'body_object', weight: 2 },
  { id: 'abc_35', text: '会撞头、咬自己的手等自我伤害行为', dimension: 'body_object', weight: 2 },
  { id: 'abc_40', text: '经常旋转或撞击物体', dimension: 'body_object', weight: 4 },
  { id: 'abc_50', text: '特别喜欢单调重复的活动（如反复走来走去、蹦跳、拍打）', dimension: 'body_object', weight: 4 },
  { id: 'abc_53', text: '有固定的仪式行为，必须按特定顺序做事（如必须走固定路线，东西必须摆在固定位置，否则就不配合）', dimension: 'body_object', weight: 4 },
  { id: 'abc_54', text: '经常把玩具或家里的东西弄坏', dimension: 'body_object', weight: 2 },
  { id: 'abc_14', text: '改变熟悉的环境或作息时，反应特别强烈', dimension: 'body_object', weight: 3 },
  { id: 'abc_23', text: '容易发脾气，经常情绪失控', dimension: 'body_object', weight: 3 },
  { id: 'abc_36', text: '想要什么东西完全等不了，必须马上得到', dimension: 'body_object', weight: 2 },

  // 语言维度 (Language) - 共13题
  { id: 'abc_8', text: '人称代词用混了（你我不分）', dimension: 'language', weight: 3 },
  { id: 'abc_11', text: '说话没有抑扬顿挫，语调平平或怪异', dimension: 'language', weight: 4 },
  { id: 'abc_18', text: '说话时很少用"是""我"这类词', dimension: 'language', weight: 2 },
  { id: 'abc_19', text: '在某方面有特殊能力（如记忆力、计算等），与整体发展不匹配', dimension: 'language', weight: 4 },
  { id: 'abc_32', text: '反复说同样的短句', dimension: 'language', weight: 3 },
  { id: 'abc_37', text: '说不出5个以上常见物品的名称', dimension: 'language', weight: 1 },
  { id: 'abc_42', text: '一天主动提出的要求不超过5次', dimension: 'language', weight: 2 },
  { id: 'abc_43', text: '容易受惊或经常焦虑不安', dimension: 'language', weight: 3 },
  { id: 'abc_46', text: '反复发出同样的声音或说同样的词', dimension: 'language', weight: 3 },
  { id: 'abc_48', text: '像鹦鹉学舌一样重复别人的话', dimension: 'language', weight: 4 },
  { id: 'abc_56', text: '日常交流只用15-30个短句（不到15句也算）', dimension: 'language', weight: 3 },
  { id: 'abc_41', text: '大小便训练很困难，难以学会自己控制', dimension: 'language', weight: 1 },
  { id: 'abc_45', text: '没人帮忙就不会自己穿衣服', dimension: 'language', weight: 1 },
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
