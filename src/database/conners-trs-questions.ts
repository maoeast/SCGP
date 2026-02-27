/**
 * Conners 教师问卷 (TRS) 题目数据
 * 共 28 题，评估 3-17 岁儿童在学校的行为表现
 * 基于 Conners 1978 年教师用量表
 */

export interface ConnersTRSQuestion {
  id: number
  content: string
  dimension: 'conduct' | 'hyperactivity' | 'inattention_passivity' | 'hyperactivity_index'
}

export const connorsTRSQuestions: ConnersTRSQuestion[] = [
  { id: 1, content: "扭动不停", dimension: "hyperactivity_index" },
  { id: 2, content: "在不应出声的场合制造噪音", dimension: "hyperactivity" },
  { id: 3, content: "提出要求必须立即得到满足", dimension: "hyperactivity" },
  { id: 4, content: "动作粗鲁（唐突无礼）", dimension: "conduct" },
  { id: 5, content: "暴怒及不能预料的行为", dimension: "conduct" },
  { id: 6, content: "对批评过份敏感", dimension: "conduct" },
  { id: 7, content: "容易分心或注意不集中成为问题", dimension: "inattention_passivity" },
  { id: 8, content: "妨害其他儿童", dimension: "conduct" },
  { id: 9, content: "白日梦", dimension: "inattention_passivity" },
  { id: 10, content: "撅嘴和生气", dimension: "conduct" },
  { id: 11, content: "情绪变化迅速和激烈", dimension: "conduct" },
  { id: 12, content: "好争吵", dimension: "conduct" },
  { id: 13, content: "能顺从权威", dimension: "hyperactivity_index" },
  { id: 14, content: "坐立不定，经常「忙碌」", dimension: "hyperactivity" },
  { id: 15, content: "易兴奋，易冲动", dimension: "hyperactivity" },
  { id: 16, content: "过份要求教师的注意", dimension: "hyperactivity" },
  { id: 17, content: "好像不为集体所接受", dimension: "inattention_passivity" },
  { id: 18, content: "好像容易被其他小孩领导", dimension: "inattention_passivity" },
  { id: 19, content: "缺少公平合理竞赛的意识", dimension: "inattention_passivity" },
  { id: 20, content: "好像缺乏领导能力", dimension: "inattention_passivity" },
  { id: 21, content: "做事有始无终", dimension: "conduct" },
  { id: 22, content: "稚气和不成熟", dimension: "inattention_passivity" },
  { id: 23, content: "抵赖错误或归罪他人", dimension: "conduct" },
  { id: 24, content: "不能与其他儿童相处", dimension: "inattention_passivity" },
  { id: 25, content: "与同学不合作", dimension: "inattention_passivity" },
  { id: 26, content: "在努力中答易泄气", dimension: "inattention_passivity" },
  { id: 27, content: "与教师不合作", dimension: "conduct" },
  { id: 28, content: "学习困难", dimension: "inattention_passivity" }
]

// 维度题目映射（基于文档）
export const TRS_DIMENSION_QUESTIONS = {
 品行行为: [4, 5, 6, 10, 11, 12, 23, 27],
  多动: [1, 2, 3, 14, 15, 16],
  不注意被动: [7, 9, 18, 20, 21, 22, 26, 28],
  多动指数: [1, 5, 7, 8, 10, 11, 14, 15, 21, 26]
}

// 英文维度映射（用于代码兼容）
export const TRS_DIMENSION_QUESTIONS_EN = {
  conduct: [4, 5, 6, 10, 11, 12, 23, 27],
  hyperactivity: [1, 2, 3, 14, 15, 16],
  inattention_passivity: [7, 9, 18, 20, 21, 22, 26, 28],
  hyperactivity_index: [1, 5, 7, 8, 10, 11, 14, 15, 21, 26]
}
