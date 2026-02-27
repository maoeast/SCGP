/**
 * Conners 父母问卷 (PSQ) 题目数据
 * 共 48 题，评估 3-17 岁儿童的行为表现
 * 基于 Conners 1978 年父母用量表修订版
 */

export interface ConnersPSQQuestion {
  id: number
  content: string
  dimension: 'conduct' | 'learning' | 'psychosomatic' | 'impulsivity_hyperactivity' | 'anxiety' | 'hyperactivity_index'
}

export const connorsPSQQuestions: ConnersPSQQuestion[] = [
  { id: 1, content: "某种小动作（如咬指甲、吸手指、拉头发、拉衣服上的布毛）", dimension: "psychosomatic" },
  { id: 2, content: "对大人粗鲁无礼", dimension: "conduct" },
  { id: 3, content: "在交朋友或保持友谊上存在问题", dimension: "conduct" },
  { id: 4, content: "易兴奋，易冲动", dimension: "impulsivity_hyperactivity" },
  { id: 5, content: "爱指手划脚", dimension: "impulsivity_hyperactivity" },
  { id: 6, content: "吸吮或咬嚼（拇指、衣服、毯子）", dimension: "hyperactivity_index" },
  { id: 7, content: "容易或经常哭叫", dimension: "anxiety" },
  { id: 8, content: "脾气很大", dimension: "anxiety" },
  { id: 9, content: "白日梦", dimension: "impulsivity_hyperactivity" },
  { id: 10, content: "学习困难", dimension: "learning" },
  { id: 11, content: "扭动不发", dimension: "impulsivity_hyperactivity" },
  { id: 12, content: "惧怕（新环境、陌生人、陌生地方、上学）", dimension: "anxiety" },
  { id: 13, content: "坐立不定，经常「忙碌」", dimension: "impulsivity_hyperactivity" },
  { id: 14, content: "破坏性", dimension: "conduct" },
  { id: 15, content: "撒谎或捏造情节", dimension: "conduct" },
  { id: 16, content: "怕羞", dimension: "anxiety" },
  { id: 17, content: "造成的麻烦比同龄孩子多", dimension: "conduct" },
  { id: 18, content: "说话与同龄儿童不同（像要儿说话、口吃、别人不易听懂）", dimension: "impulsivity_hyperactivity" },
  { id: 19, content: "抵赖错误或归罪他人", dimension: "conduct" },
  { id: 20, content: "好争吵", dimension: "conduct" },
  { id: 21, content: "撅嘴和生气", dimension: "anxiety" },
  { id: 22, content: "偷窃", dimension: "conduct" },
  { id: 23, content: "不服从或勉强服从", dimension: "conduct" },
  { id: 24, content: "优虑比别人多（忧虑、孤独、疾病、死亡）", dimension: "psychosomatic" },
  { id: 25, content: "做事有始无终", dimension: "learning" },
  { id: 26, content: "感情易受损害", dimension: "psychosomatic" },
  { id: 27, content: "欺凌别人", dimension: "conduct" },
  { id: 28, content: "不能停止重复性活动", dimension: "impulsivity_hyperactivity" },
  { id: 29, content: "残忍", dimension: "conduct" },
  { id: 30, content: "稚气或不成熟（自己会的事要人帮忙，依缠别人，常需别人鼓励、支持）", dimension: "impulsivity_hyperactivity" },
  { id: 31, content: "容易分心或注意不集中成为一个问题", dimension: "learning" },
  { id: 32, content: "头痛", dimension: "psychosomatic" },
  { id: 33, content: "情绪变化迅速剧烈", dimension: "conduct" },
  { id: 34, content: "不喜欢或不遵从纪律或约束", dimension: "impulsivity_hyperactivity" },
  { id: 35, content: "经常打架", dimension: "conduct" },
  { id: 36, content: "与兄弟姐妹不能很好相处", dimension: "learning" },
  { id: 37, content: "在努力中容易泄气", dimension: "learning" },
  { id: 38, content: "妨害其他儿童", dimension: "conduct" },
  { id: 39, content: "基本上是一个不愉快的小孩", dimension: "anxiety" },
  { id: 40, content: "有饮食问题（食欲不佳、进食中常跑开）", dimension: "psychosomatic" },
  { id: 41, content: "胃痛", dimension: "psychosomatic" },
  { id: 42, content: "有睡眠问题（不能人睡、早醒、夜间起床）", dimension: "psychosomatic" },
  { id: 43, content: "其他疼痛", dimension: "psychosomatic" },
  { id: 44, content: "呕吐或恶心", dimension: "psychosomatic" },
  { id: 45, content: "感到在家庭圈子中被欺骗", dimension: "psychosomatic" },
  { id: 46, content: "自夸和吹牛", dimension: "anxiety" },
  { id: 47, content: "让自己受别人欺骗", dimension: "anxiety" },
  { id: 48, content: "有大便问题（腹泻、排便不规则、便秘）", dimension: "psychosomatic" }
]

// 维度题目映射（基于文档）
export const PSQ_DIMENSION_QUESTIONS = {
 品行问题: [2, 8, 14, 19, 20, 21, 22, 23, 27, 33, 34, 39],
  学习问题: [10, 25, 31, 37],
  心身障碍: [32, 41, 43, 44, 48],
  冲动多动: [4, 5, 11, 13],
  焦虑: [12, 16, 24, 47],
  多动指数: [4, 7, 11, 13, 14, 25, 31, 33, 37, 38]
}

// 英文维度映射（用于代码兼容）
export const PSQ_DIMENSION_QUESTIONS_EN = {
  conduct: [2, 8, 14, 19, 20, 21, 22, 23, 27, 33, 34, 39],
  learning: [10, 25, 31, 37],
  psychosomatic: [32, 41, 43, 44, 48],
  impulsivity_hyperactivity: [4, 5, 11, 13],
  anxiety: [12, 16, 24, 47],
  hyperactivity_index: [4, 7, 11, 13, 14, 25, 31, 33, 37, 38]
}
