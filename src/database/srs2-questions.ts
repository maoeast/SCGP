/**
 * SRS-2 (社交反应量表第二版) 题目数据
 *
 * 学龄版 65 题，适用于 6-18 岁儿童
 * 4 点计分：0 = 从不，1 = 偶尔，2 = 经常，3 = 总是
 *
 * @module database/srs2-questions
 */

import type { ScaleQuestion } from '@/types/assessment'

/**
 * SRS-2 子维度代码
 */
export type SRS2DimensionCode = 'awareness' | 'cognition' | 'communication' | 'motivation' | 'repetitive'

/**
 * SRS-2 题目原始数据
 */
export interface SRS2QuestionData {
  id: number
  text: string
  helpText?: string
  dimension: SRS2DimensionCode
  isReversed: boolean  // 是否为反向计分题
}

/**
 * SRS-2 65 道题目（学龄版）
 *
 * 反向计分题（20道）：3, 7, 11, 12, 15, 17, 21, 22, 26, 32, 38, 40, 44, 45, 48, 52, 55, 58
 * 这些题目为正向/能力描述，选"总是"代表能力强，需反向计分：3→0, 2→1, 1→2, 0→3
 */
export const SRS2_QUESTIONS: SRS2QuestionData[] = [
  // 1-10 题
  { id: 1, text: '在社交场合（如聚会、学校）与独处时相比，他/她是否表现得明显更烦躁？', dimension: 'communication', isReversed: false },
  { id: 2, text: '他/她的面部表情与他当时说的话是否不符？（例如：说悲伤的事却在笑）', dimension: 'communication', isReversed: false },
  { id: 3, text: '与别人互动时，他/她表现得很自信吗？', helpText: '指能够自然大方地交流，而不是畏缩或过度紧张。', dimension: 'cognition', isReversed: true },
  { id: 4, text: '当受到压力时，是否会表现出某些固定、奇特的行为方式？（例如：一旦紧张就转圈圈、摆手等）', dimension: 'motivation', isReversed: false },
  { id: 5, text: '他/她是否很难意识到自己正在被别人利用或欺负？（即显得比较"天真"，看不出别人的坏心眼）', dimension: 'awareness', isReversed: false },
  { id: 6, text: '相比与人相处，他/她是否更宁愿一个人待着？', dimension: 'communication', isReversed: false },
  { id: 7, text: '他/她能意识到别人的想法或感觉吗？（即拥有同理心）', dimension: 'awareness', isReversed: true },
  { id: 8, text: '他的行为方式是否显得独特、奇怪？（让旁人觉得格格不入）', dimension: 'repetitive', isReversed: false },
  { id: 9, text: '他/她是否特别粘大人，对父母/照顾者十分依赖？', dimension: 'motivation', isReversed: false },
  { id: 10, text: '他/她是否只能理解话语的字面意思，听不懂"话里有话"？（例如：听不懂玩笑、反语或隐喻）', dimension: 'cognition', isReversed: false },

  // 11-20 题
  { id: 11, text: '他/她拥有自信心吗？', dimension: 'motivation', isReversed: true },
  { id: 12, text: '他/她能够清楚地向别人传达自己的感受吗？', dimension: 'cognition', isReversed: true },
  { id: 13, text: '与同伴交谈时，他/她是否显得笨拙？（例如：不懂得轮流说话，总是抢话或不接话）', dimension: 'communication', isReversed: false },
  { id: 14, text: '他/她是否很难与别人协调一致？（例如：玩游戏时跟不上大家的节奏或规则）', dimension: 'repetitive', isReversed: false },
  { id: 15, text: '他/她能理解别人的语气语调及面部表情的意思吗？（也就是俗称的"会察言观色"）', dimension: 'awareness', isReversed: true },
  { id: 16, text: '他/她是否回避目光接触，或者目光接触的方式很不自然？（如：盯着人看或完全不看）', dimension: 'motivation', isReversed: false },
  { id: 17, text: '当事情不公平的时候，他/她能意识到吗？', dimension: 'awareness', isReversed: true },
  { id: 18, text: '即使他很努力，是否仍然很难交到朋友？', dimension: 'repetitive', isReversed: false },
  { id: 19, text: '在谈话中，如果很难理解别人的意思，他/她是否会感到受挫或生气？', dimension: 'communication', isReversed: false },
  { id: 20, text: '是否有异于常人的感官兴趣？（例如：喜欢喃喃自语、盯着旋转的物体看、闻物品的味道）', dimension: 'repetitive', isReversed: false },

  // 21-30 题
  { id: 21, text: '他/她能够模仿别人的动作吗？（这是学习社交的重要基础）', dimension: 'cognition', isReversed: true },
  { id: 22, text: '他/她能与同龄人正常、恰当地玩耍吗？', dimension: 'motivation', isReversed: true },
  { id: 23, text: '除非大人要求，否则他/她不愿意主动加入集体活动吗？', dimension: 'communication', isReversed: false },
  { id: 24, text: '相比其他孩子，他/她是否很难接受常规流程的改变？（例如：换了一条路回家就发脾气）', dimension: 'repetitive', isReversed: false },
  { id: 25, text: '他/她是否不介意与别人"步调不一致"？（即：大家都在做操，他在乱跑，但他并不觉得尴尬）', dimension: 'motivation', isReversed: false },
  { id: 26, text: '当别人伤心时，他/她会尝试去安慰别人吗？', dimension: 'awareness', isReversed: true },
  { id: 27, text: '他/她是否避免与同伴或成人开始进行社会交往？（如：从不主动打招呼）', dimension: 'communication', isReversed: false },
  { id: 28, text: '他/她是否重复做某事，或重复谈论同一个话题？', dimension: 'repetitive', isReversed: false },
  { id: 29, text: '他/她是否被其他孩子认为"古怪"或"奇特"？', dimension: 'motivation', isReversed: false },
  { id: 30, text: '在一个复杂、嘈杂的环境中（如多人聚会），他/她是否会变得不高兴？', dimension: 'motivation', isReversed: false },

  // 31-40 题
  { id: 31, text: '他/她一旦开始想一件事情，是否就会固执地坚持想下去？（思维无法转移）', dimension: 'repetitive', isReversed: false },
  { id: 32, text: '他/她的个人卫生习惯好吗？（注：这是考察社会适应力）', dimension: 'cognition', isReversed: true },
  { id: 33, text: '在交往时，即使他努力尝试礼貌，是否仍然显得笨拙或无礼？（例如：想夸人结果说了难听的话）', dimension: 'motivation', isReversed: false },
  { id: 34, text: '他/她是否会逃避那些想要亲近他的人？', dimension: 'motivation', isReversed: false },
  { id: 35, text: '他/她是否很难维持正常的、有来有往的交谈？', dimension: 'communication', isReversed: false },
  { id: 36, text: '他/她与成人交流是否有困难？', dimension: 'communication', isReversed: false },
  { id: 37, text: '他/她与同龄人交流是否有困难？', dimension: 'communication', isReversed: false },
  { id: 38, text: '当别人的情绪改变时，他/她能做出恰当的反应吗？（如：朋友从高兴变伤心了，他也会收敛笑容）', dimension: 'awareness', isReversed: true },
  { id: 39, text: '他/她是否有不寻常的、狭隘的兴趣？（例如：只喜欢背列车时刻表、只聊恐龙）', dimension: 'repetitive', isReversed: false },
  { id: 40, text: '他/她富有想象力，会玩假装游戏吗（但不脱离实际）？（例如：过家家）', dimension: 'cognition', isReversed: true },

  // 41-50 题
  { id: 41, text: '他/她是否会毫无目的地在两个地方之间来回走动？', dimension: 'communication', isReversed: false },
  { id: 42, text: '他/她是否对声音、质地（触觉）或特殊气味过度敏感？', dimension: 'repetitive', isReversed: false },
  { id: 43, text: '他/她是否很容易与抚养者（如父母）分开？', dimension: 'motivation', isReversed: false },
  { id: 44, text: '他/她能理解事物的时间和因果关系吗？（同龄人能做到的程度）', dimension: 'cognition', isReversed: true },
  { id: 45, text: '他/她能注意别人正在看什么或听什么吗？（即：共同注意力）', dimension: 'awareness', isReversed: true },
  { id: 46, text: '他/她的面部表情是否过度严肃？', dimension: 'communication', isReversed: false },
  { id: 47, text: '他/她是否表现得很傻，或突然莫名其妙地大笑？', dimension: 'communication', isReversed: false },
  { id: 48, text: '他/她有幽默感吗？能听懂笑话吗？', dimension: 'cognition', isReversed: true },
  { id: 49, text: '他/她是否只对极少数任务完成得很好，但大多数日常任务却做不好？（能力发展极不平衡）', dimension: 'motivation', isReversed: false },
  { id: 50, text: '是否有重复的奇怪行为？（如：拍手、摇晃身体）', dimension: 'motivation', isReversed: false },

  // 51-60 题
  { id: 51, text: '他/她是否不能直接回答问题，或者答非所问？', dimension: 'communication', isReversed: false },
  { id: 52, text: '当他说话声音太大或制造噪音时，他自己能察觉到吗？', dimension: 'awareness', isReversed: true },
  { id: 53, text: '他/她说话的语调是否奇怪？（例如：像机器人一样平淡，或像在演讲一样夸张）', dimension: 'communication', isReversed: false },
  { id: 54, text: '他/她对人的反应，是否像把人当做物体一样（没有感情）？', dimension: 'motivation', isReversed: false },
  { id: 55, text: '他/她能意识到自己离别人太近，或侵犯了别人的个人空间吗？', dimension: 'awareness', isReversed: true },
  { id: 56, text: '他/她是否会直接从两个正在谈话的人中间穿过去？（不懂社交礼仪）', dimension: 'communication', isReversed: false },
  { id: 57, text: '他/她是否经常被别的小朋友嘲弄或取笑？', dimension: 'repetitive', isReversed: false },
  { id: 58, text: '他/她是否过于关注事物的局部细节，而忽视了整体？（例如：讲故事只记得人物穿什么鞋，忘了故事讲什么）', dimension: 'cognition', isReversed: true },
  { id: 59, text: '他/她是否显得多疑？', dimension: 'repetitive', isReversed: false },
  { id: 60, text: '他/她是否感情淡漠，不怎么表达自己的感受？', dimension: 'awareness', isReversed: false },

  // 61-65 题
  { id: 61, text: '他/她是否很固执，很难改变自己的想法？', dimension: 'motivation', isReversed: false },
  { id: 62, text: '他/她做事情的原因是否很特别，或不合逻辑？', dimension: 'repetitive', isReversed: false },
  { id: 63, text: '他/她与人接触的方式是否特别？（例如：碰一下别人然后不说话就跑开）', dimension: 'communication', isReversed: false },
  { id: 64, text: '在社交场合中，他/她是否显得特别紧张？', dimension: 'cognition', isReversed: false },
  { id: 65, text: '他/她是否会无目的地凝视或注视某处？（发呆、眼神放空）', dimension: 'communication', isReversed: false }
]

/**
 * SRS-2 选项配置
 * 4 点计分：0-3
 */
export const SRS2_OPTIONS = [
  { value: 0, label: '不符合', score: 0 },
  { value: 1, label: '有时符合', score: 1 },
  { value: 2, label: '经常符合', score: 2 },
  { value: 3, label: '几乎总是符合', score: 3 }
]

/**
 * SRS-2 维度名称映射
 */
export const SRS2_DIMENSION_NAMES: Record<SRS2DimensionCode, string> = {
  awareness: '社交知觉',
  cognition: '社交认知',
  communication: '社交沟通',
  motivation: '社交动机',
  repetitive: '刻板行为'
}

/**
 * SRS-2 维度题目映射
 * 每个维度包含的题目 ID 列表
 */
export const SRS2_DIMENSION_QUESTIONS: Record<SRS2DimensionCode, number[]> = {
  awareness: [1, 5, 7, 15, 17, 26, 38, 45, 52, 55, 60],      // 11 题
  cognition: [3, 10, 12, 21, 32, 40, 44, 48, 58, 64],        // 10 题
  communication: [2, 6, 13, 19, 23, 27, 35, 36, 37, 41, 46, 47, 51, 53, 56, 63, 65], // 17 题
  motivation: [4, 9, 11, 16, 22, 25, 29, 30, 33, 34, 43, 49, 50, 54, 61],  // 15 题
  repetitive: [8, 14, 18, 20, 24, 28, 31, 39, 42, 57, 59, 62]  // 12 题
}

/**
 * 反向计分转换
 * 0 → 3, 1 → 2, 2 → 1, 3 → 0
 */
export function reverseScore(score: number): number {
  return 3 - score
}

/**
 * 获取反向计分题的题号列表
 */
export const SRS2_REVERSED_QUESTIONS = SRS2_QUESTIONS
  .filter(q => q.isReversed)
  .map(q => q.id)

/**
 * 检查某题是否为反向计分题
 */
export function isReversedQuestion(questionId: number): boolean {
  return SRS2_REVERSED_QUESTIONS.includes(questionId)
}

/**
 * 转换为 ScaleQuestion 格式（供前端渲染使用）
 *
 * 关键设计：
 * - content: 使用正确的字段名（修复空白Bug）
 * - dimension: 设为空字符串（临床盲测，避免"启动效应"）
 * - helpText: 添加6个月时效提示（符合心理测量规范）
 */
export function getSRS2ScaleQuestions(): ScaleQuestion[] {
  return SRS2_QUESTIONS.map(q => ({
    id: q.id,
    content: q.text,
    dimension: '', // 临床盲测：隐藏维度信息，避免评估者主观偏向
    helpText: q.helpText
      ? `${q.helpText}（请根据受试者过去6个月的实际表现进行选择）`
      : '请根据受试者过去6个月的实际表现进行选择。',
    options: SRS2_OPTIONS,
    isReversed: q.isReversed,
    metadata: {
      originalDimension: q.dimension // 保留原始维度用于后台计算
    }
  }))
}

/**
 * SRS-2 T分数临床等级阈值
 * T < 60: 正常
 * T 60-65: 轻度
 * T 66-75: 中度
 * T >= 76: 重度
 */
export const SRS2_SEVERITY_THRESHOLDS = {
  normal: { min: 0, max: 59 },
  mild: { min: 60, max: 65 },
  moderate: { min: 66, max: 75 },
  severe: { min: 76, max: 200 }
}

/**
 * 根据 T分数确定临床等级
 */
export function getSeverityFromTScore(tScore: number): 'normal' | 'mild' | 'moderate' | 'severe' {
  if (tScore >= 76) return 'severe'
  if (tScore >= 66) return 'moderate'
  if (tScore >= 60) return 'mild'
  return 'normal'
}
