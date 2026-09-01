/**
 * ATEC 孤独症治疗评估量表题库
 * Autism Treatment Evaluation Checklist
 *
 * 77题，分为4个分量表：
 * 1. Speech/Language/Communication（表达/语言沟通）- 14题
 * 2. Sociability（社交能力）- 20题
 * 3. Sensory/Cognitive Awareness（感知/认知能力）- 18题
 * 4. Health/Physical/Behavior（健康/生理/行为）- 25题
 *
 * 计分方式（各分量表评分等级不同）：
 * - I 表达/语言沟通：反向计分 N=2, S=1, V=0（总分0-28）
 * - II 社交能力：正向计分 N=0, S=1, V=2（总分0-40）
 * - III 感知/认知能力：反向计分 N=2, S=1, V=0（总分0-36）
 * - IV 健康/生理/行为：4级计分 N=0, MI=1, MO=2, V=3（总分0-75）
 *
 * 总分范围：0-179分
 * 分数越高表示症状越严重或问题越多
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
  speech: '表达/语言沟通',
  sociability: '社交能力',
  sensory: '感知/认知能力',
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
 * 题目来源：孤独症治疗评估量表（ATEC）
 * 本版本对原始题目表述进行了现代化优化，使其更易于当代教师和家长理解
 */
export const ATEC_QUESTIONS: ATECQuestion[] = [
  // I. 表达/语言沟通 - 14题（反向计分：能力型题目）
  { id: 'atec_1', text: '知道自己的名字', subscale: 'speech' },
  { id: 'atec_2', text: '对"不"或"停"有反应', subscale: 'speech' },
  { id: 'atec_3', text: '能够听从一些指令', subscale: 'speech' },
  { id: 'atec_4', text: '能一次说1个字（如：不、吃、水等）', subscale: 'speech' },
  { id: 'atec_5', text: '能一次说2个字（如：不要、回家）', subscale: 'speech' },
  { id: 'atec_6', text: '能一次说3个字（如：还要水）', subscale: 'speech' },
  { id: 'atec_7', text: '知道10个或以上的词', subscale: 'speech' },
  { id: 'atec_8', text: '会说包含4个或4个以上字的句子', subscale: 'speech' },
  { id: 'atec_9', text: '能说清楚他/她想要什么', subscale: 'speech' },
  { id: 'atec_10', text: '问一些有意义的问题', subscale: 'speech' },
  { id: 'atec_11', text: '说话趋于有意义或相关联', subscale: 'speech' },
  { id: 'atec_12', text: '能经常使用几个连贯的句子', subscale: 'speech' },
  { id: 'atec_13', text: '可以进行比较好的交谈', subscale: 'speech' },
  { id: 'atec_14', text: '有与他/她年龄相当的交流能力', subscale: 'speech' },

  // II. 社交能力 - 20题（正向计分：问题型题目）
  { id: 'atec_15', text: '像把自己关在贝壳里——你难以接触他/她', subscale: 'sociability' },
  { id: 'atec_16', text: '忽视其他人', subscale: 'sociability' },
  { id: 'atec_17', text: '喊他时没有或很少有回应', subscale: 'sociability' },
  { id: 'atec_18', text: '不合作，抵触', subscale: 'sociability' },
  { id: 'atec_19', text: '没有目光交流', subscale: 'sociability' },
  { id: 'atec_20', text: '宁愿一个人待着', subscale: 'sociability' },
  { id: 'atec_21', text: '缺乏感情表现', subscale: 'sociability' },
  { id: 'atec_22', text: '看到父母无相应地反应', subscale: 'sociability' },
  { id: 'atec_23', text: '逃避与他人接触', subscale: 'sociability' },
  { id: 'atec_24', text: '不模仿', subscale: 'sociability' },
  { id: 'atec_25', text: '不喜欢被拥抱', subscale: 'sociability' },
  { id: 'atec_26', text: '不会分享或炫耀', subscale: 'sociability' },
  { id: 'atec_27', text: '不会挥手表示"再见"', subscale: 'sociability' },
  { id: 'atec_28', text: '不讨喜或不顺从', subscale: 'sociability' },
  { id: 'atec_29', text: '容易发脾气', subscale: 'sociability' },
  { id: 'atec_30', text: '缺乏朋友或玩伴', subscale: 'sociability' },
  { id: 'atec_31', text: '很少笑', subscale: 'sociability' },
  { id: 'atec_32', text: '对别人的感受不敏感', subscale: 'sociability' },
  { id: 'atec_33', text: '不在乎自己是否被喜欢', subscale: 'sociability' },
  { id: 'atec_34', text: '对父母的离开无所谓', subscale: 'sociability' },

  // III. 感知/认知能力 - 18题（反向计分：能力型题目）
  { id: 'atec_35', text: '对自己的名字有反应', subscale: 'sensory' },
  { id: 'atec_36', text: '对表扬有反应', subscale: 'sensory' },
  { id: 'atec_37', text: '喜欢看人和东西', subscale: 'sensory' },
  { id: 'atec_38', text: '喜欢看图片（和电视）', subscale: 'sensory' },
  { id: 'atec_39', text: '会画画、涂色和制作', subscale: 'sensory' },
  { id: 'atec_40', text: '适当地玩玩具', subscale: 'sensory' },
  { id: 'atec_41', text: '有恰当的面部表情', subscale: 'sensory' },
  { id: 'atec_42', text: '能明白电视里讲的故事', subscale: 'sensory' },
  { id: 'atec_43', text: '能明白解释', subscale: 'sensory' },
  { id: 'atec_44', text: '能意识到周围环境', subscale: 'sensory' },
  { id: 'atec_45', text: '能意识到危险', subscale: 'sensory' },
  { id: 'atec_46', text: '表现出想象力', subscale: 'sensory' },
  { id: 'atec_47', text: '能自发的活动', subscale: 'sensory' },
  { id: 'atec_48', text: '能自己穿衣服', subscale: 'sensory' },
  { id: 'atec_49', text: '表现出好奇和兴趣', subscale: 'sensory' },
  { id: 'atec_50', text: '会大胆的探究（新奇的东西）', subscale: 'sensory' },
  { id: 'atec_51', text: '能注意到周围环境并做出相应地反应，而不是与世隔绝', subscale: 'sensory' },
  { id: 'atec_52', text: '会循着别人看的地方看', subscale: 'sensory' },

  // IV. 健康/生理/行为 - 25题（4级计分：问题严重程度）
  { id: 'atec_53', text: '尿床', subscale: 'health' },
  { id: 'atec_54', text: '会弄湿裤子或尿布', subscale: 'health' },
  { id: 'atec_55', text: '（大便）会弄脏裤子或尿布', subscale: 'health' },
  { id: 'atec_56', text: '腹泻', subscale: 'health' },
  { id: 'atec_57', text: '便秘', subscale: 'health' },
  { id: 'atec_58', text: '睡眠有问题', subscale: 'health' },
  { id: 'atec_59', text: '吃得太多/太少', subscale: 'health' },
  { id: 'atec_60', text: '极端挑食', subscale: 'health' },
  { id: 'atec_61', text: '多动', subscale: 'health' },
  { id: 'atec_62', text: '无精打采', subscale: 'health' },
  { id: 'atec_63', text: '自己打自己或自伤', subscale: 'health' },
  { id: 'atec_64', text: '打别人或伤害别人', subscale: 'health' },
  { id: 'atec_65', text: '具有破坏性', subscale: 'health' },
  { id: 'atec_66', text: '对声音过敏', subscale: 'health' },
  { id: 'atec_67', text: '焦虑/害怕', subscale: 'health' },
  { id: 'atec_68', text: '不快乐/哭闹', subscale: 'health' },
  { id: 'atec_69', text: '抽搐', subscale: 'health' },
  { id: 'atec_70', text: '强迫性的说话', subscale: 'health' },
  { id: 'atec_71', text: '机械、刻板', subscale: 'health' },
  { id: 'atec_72', text: '大喊或尖叫', subscale: 'health' },
  { id: 'atec_73', text: '要求以同样的方式从事活动', subscale: 'health' },
  { id: 'atec_74', text: '经常表现出不安', subscale: 'health' },
  { id: 'atec_75', text: '对疼痛不敏感', subscale: 'health' },
  { id: 'atec_76', text: '容易成瘾或沉迷于一些事物或话题', subscale: 'health' },
  { id: 'atec_77', text: '重复性动作（如：自我刺激行为、摇摆等）', subscale: 'health' },
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
  speech: 28,      // 14题，反向计分 0-2分
  sociability: 40, // 20题，正向计分 0-2分
  sensory: 36,     // 18题，反向计分 0-2分
  health: 75,      // 25题，4级计分 0-3分
}

/**
 * ATEC 总分范围
 */
export const ATEC_TOTAL_MAX_SCORE = 179 // 28 + 40 + 36 + 75

/**
 * ATEC 严重程度等级
 */
export type ATECLevel = 'minimal' | 'mild' | 'moderate' | 'severe'

/**
 * 根据总分判断严重程度
 * @param totalScore 总分（0-179）
 * @returns 严重程度等级
 */
export function getATECLevel(totalScore: number): ATECLevel {
  // 注：ATEC 没有官方严重程度截断值，以下为参考性分段
  if (totalScore < 40) return 'minimal'
  if (totalScore < 70) return 'mild'
  if (totalScore < 120) return 'moderate'
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
 * 注意：ATEC 的评分选项因分量表而异，需要在 Driver 中动态处理
 */
export function getATECScaleQuestions(): ScaleQuestion[] {
  return ATEC_QUESTIONS.map(q => {
    // I. 表达/语言沟通 - 反向计分（能力型）
    if (q.subscale === 'speech') {
      return {
        id: q.id,
        content: q.text,
        dimension: q.subscale,
        options: [
          { label: '不符合', value: 0, score: 2 },      // N = 2分
          { label: '有点符合', value: 1, score: 1 },    // S = 1分
          { label: '非常符合', value: 2, score: 0 },    // V = 0分
        ],
      }
    }

    // II. 社交能力 - 正向计分（问题型）
    if (q.subscale === 'sociability') {
      return {
        id: q.id,
        content: q.text,
        dimension: q.subscale,
        options: [
          { label: '不符合', value: 0, score: 0 },      // N = 0分
          { label: '有点符合', value: 1, score: 1 },    // S = 1分
          { label: '非常符合', value: 2, score: 2 },    // V = 2分
        ],
      }
    }

    // III. 感知/认知能力 - 反向计分（能力型）
    if (q.subscale === 'sensory') {
      return {
        id: q.id,
        content: q.text,
        dimension: q.subscale,
        options: [
          { label: '不符合', value: 0, score: 2 },      // N = 2分
          { label: '有点符合', value: 1, score: 1 },    // S = 1分
          { label: '非常符合', value: 2, score: 0 },    // V = 0分
        ],
      }
    }

    // IV. 健康/生理/行为 - 4级计分（问题严重程度）
    return {
      id: q.id,
      content: q.text,
      dimension: q.subscale,
      options: [
        { label: '不是问题', value: 0, score: 0 },      // N = 0分
        { label: '小问题', value: 1, score: 1 },        // MI = 1分
        { label: '有点问题', value: 2, score: 2 },      // MO = 2分
        { label: '有严重问题', value: 3, score: 3 },    // V = 3分
      ],
    }
  })
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
