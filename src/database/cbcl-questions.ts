/**
 * CBCL (Achenbach儿童行为量表) 题目库
 * 来源: docs/references/儿童行为量表（CBCL）- 2026数字化题目.md
 * 共113道行为问题 + 8道子题(56a-h)
 */

import type { CBCLQuestion, CBCLOption } from '@/types/cbcl';

// ==========================================
// 选项配置 (3点量表)
// ==========================================

export const CBCL_OPTIONS: CBCLOption[] = [
  { value: 0, label: '无此表现（或偶尔发生，不明显）' },
  { value: 1, label: '有时有（或部分符合）' },
  { value: 2, label: '经常有（或表现明显）' }
];

// ==========================================
// 行为问题题目 (第三部分: 1-113题)
// ==========================================

export const CBCL_QUESTIONS: CBCLQuestion[] = [
  // 1-10
  { id: 1, text: '行为幼稚，与其年龄不符', options: [0, 1, 2] },
  { id: 2, text: '有过敏性躯体症状（填具体表现：______）', options: [0, 1, 2], hasDescription: true },
  { id: 3, text: '喜欢顶嘴或争论', options: [0, 1, 2] },
  { id: 4, text: '有哮喘病', options: [0, 1, 2] },
  { id: 5, text: '行为举止偏向异性（如男孩行为像女孩，或女孩像男孩）', options: [0, 1, 2] },
  { id: 6, text: '随地大便（或不能自控大便）', options: [0, 1, 2] },
  { id: 7, text: '喜欢吹牛或自夸', options: [0, 1, 2] },
  { id: 8, text: '精神不集中，注意力难以持久', options: [0, 1, 2] },
  { id: 9, text: '脑子里总想某些事，无法摆脱（强迫观念，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 10, text: '坐立不安，活动过多（多动）', options: [0, 1, 2] },

  // 11-20
  { id: 11, text: '喜欢缠着大人，过分依赖', options: [0, 1, 2] },
  { id: 12, text: '常说自己感到寂寞或孤独', options: [0, 1, 2] },
  { id: 13, text: '经常迷迷糊糊，容易发懵或走神', options: [0, 1, 2] },
  { id: 14, text: '常常哭闹或大叫', options: [0, 1, 2] },
  { id: 15, text: '虐待动物', options: [0, 1, 2] },
  { id: 16, text: '欺负他人，或对人刻薄恶毒', options: [0, 1, 2] },
  { id: 17, text: '爱做白日梦或经常发呆', options: [0, 1, 2] },
  { id: 18, text: '故意伤害自己或有自杀企图', options: [0, 1, 2] },
  { id: 19, text: '总是需要别人关注自己', options: [0, 1, 2] },
  { id: 20, text: '破坏自己的东西', options: [0, 1, 2] },

  // 21-30
  { id: 21, text: '破坏家里或其他孩子的东西', options: [0, 1, 2] },
  { id: 22, text: '在家不听话', options: [0, 1, 2] },
  { id: 23, text: '在学校不听话', options: [0, 1, 2] },
  { id: 24, text: '不肯好好吃饭', options: [0, 1, 2] },
  { id: 25, text: '不愿与其他孩子相处或玩耍', options: [0, 1, 2] },
  { id: 26, text: '做错事或有不良行为后不感到内疚', options: [0, 1, 2] },
  { id: 27, text: '容易嫉妒别人', options: [0, 1, 2] },
  { id: 28, text: '吃不能作为食物的东西（如吃纸、土等，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 29, text: '除怕上学外，还害怕某些动物、情境或地方（说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 30, text: '害怕上学', options: [0, 1, 2] },

  // 31-40
  { id: 31, text: '害怕自己会有坏念头或做坏事', options: [0, 1, 2] },
  { id: 32, text: '凡事要求十全十美（完美主义）', options: [0, 1, 2] },
  { id: 33, text: '觉得或抱怨没有人喜欢自己', options: [0, 1, 2] },
  { id: 34, text: '觉得别人存心捉弄或针对自己', options: [0, 1, 2] },
  { id: 35, text: '觉得自己没用，有自卑感', options: [0, 1, 2] },
  { id: 36, text: '容易发生意外事故或弄伤自己身体', options: [0, 1, 2] },
  { id: 37, text: '经常和别人打架', options: [0, 1, 2] },
  { id: 38, text: '常常被别人戏弄或欺负', options: [0, 1, 2] },
  { id: 39, text: '喜欢和爱惹麻烦的孩子混在一起', options: [0, 1, 2] },
  { id: 40, text: '听到实际上不存在的声音（幻听，说明内容：______）', options: [0, 1, 2], hasDescription: true },

  // 41-50
  { id: 41, text: '行为冲动或粗鲁', options: [0, 1, 2] },
  { id: 42, text: '喜欢独处，不合群', options: [0, 1, 2] },
  { id: 43, text: '撒谎或骗人', options: [0, 1, 2] },
  { id: 44, text: '咬指甲', options: [0, 1, 2] },
  { id: 45, text: '神经紧绷，容易激动或紧张', options: [0, 1, 2] },
  { id: 46, text: '身体有紧张性动作或抽动（如挤眉弄眼等，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 47, text: '经常做噩梦', options: [0, 1, 2] },
  { id: 48, text: '不受其他孩子欢迎，被排挤', options: [0, 1, 2] },
  { id: 49, text: '经常便秘', options: [0, 1, 2] },
  { id: 50, text: '过度恐惧或盲目担心', options: [0, 1, 2] },

  // 51-56 (56有子题)
  { id: 51, text: '经常感到头晕', options: [0, 1, 2] },
  { id: 52, text: '过度内疚或自责', options: [0, 1, 2] },
  { id: 53, text: '暴饮暴食或吃得过多', options: [0, 1, 2] },
  { id: 54, text: '极易疲劳或总是觉得累', options: [0, 1, 2] },
  { id: 55, text: '身体超重或肥胖', options: [0, 1, 2] },
  { id: 56, text: '查不出医学原因的躯体不适症状：（请在下方勾选具体项）', options: [0, 1, 2] },

  // 56a-56h 子题
  { id: '56a', text: 'a. 疼痛', options: [0, 1, 2], isSubItem: true, parentId: 56 },
  { id: '56b', text: 'b. 头痛', options: [0, 1, 2], isSubItem: true, parentId: 56 },
  { id: '56c', text: 'c. 恶心想吐', options: [0, 1, 2], isSubItem: true, parentId: 56 },
  { id: '56d', text: 'd. 眼睛问题（说明内容，不包括近视：______）', options: [0, 1, 2], isSubItem: true, parentId: 56, hasDescription: true },
  { id: '56e', text: 'e. 皮疹或其他皮肤病', options: [0, 1, 2], isSubItem: true, parentId: 56 },
  { id: '56f', text: 'f. 腹部疼痛或绞痛', options: [0, 1, 2], isSubItem: true, parentId: 56 },
  { id: '56g', text: 'g. 呕吐', options: [0, 1, 2], isSubItem: true, parentId: 56 },
  { id: '56h', text: 'h. 其他（说明内容：______）', options: [0, 1, 2], isSubItem: true, parentId: 56, hasDescription: true },

  // 57-70
  { id: 57, text: '对他人进行身体攻击（如打人、踢人）', options: [0, 1, 2] },
  { id: 58, text: '经常抠鼻子、抠皮肤或身体其他部位（说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 59, text: '在公开场合玩弄自己的生殖器', options: [0, 1, 2] },
  { id: 60, text: '过于频繁地玩弄自己的生殖器', options: [0, 1, 2] },
  { id: 61, text: '学习成绩差', options: [0, 1, 2] },
  { id: 62, text: '动作笨拙，不灵活', options: [0, 1, 2] },
  { id: 63, text: '喜欢和比自己大很多的儿童在一起', options: [0, 1, 2] },
  { id: 64, text: '喜欢和比自己小很多的儿童在一起', options: [0, 1, 2] },
  { id: 65, text: '拒绝说话或不肯开口', options: [0, 1, 2] },
  { id: 66, text: '不断重复某些动作（强迫行为，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 67, text: '曾离家出走', options: [0, 1, 2] },
  { id: 68, text: '经常无故尖叫', options: [0, 1, 2] },
  { id: 69, text: '把心事藏在心里，什么都不愿说', options: [0, 1, 2] },
  { id: 70, text: '看到实际上不存在的东西（幻视，说明内容：______）', options: [0, 1, 2], hasDescription: true },

  // 71-80
  { id: 71, text: '感到局促不安，或容易害羞、难堪', options: [0, 1, 2] },
  { id: 72, text: '玩危险物品（如玩火、玩打火机等）', options: [0, 1, 2] },
  { id: 73, text: '表现出性方面的问题（说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 74, text: '喜欢哗众取宠或大声胡闹', options: [0, 1, 2] },
  { id: 75, text: '害羞或胆小怕事', options: [0, 1, 2] },
  { id: 76, text: '睡眠时间比大多数同龄孩子少', options: [0, 1, 2] },
  { id: 77, text: '睡眠时间比大多数同龄孩子多（不包括赖床，说明多多少：______）', options: [0, 1, 2], hasDescription: true },
  { id: 78, text: '玩弄排泄物（粪便）', options: [0, 1, 2] },
  { id: 79, text: '言语表达有问题（如口吃、吐字不清等，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 80, text: '两眼发直，常常呆呆地看', options: [0, 1, 2] },

  // 81-90
  { id: 81, text: '在家里偷东西', options: [0, 1, 2] },
  { id: 82, text: '在外面偷东西', options: [0, 1, 2] },
  { id: 83, text: '囤积或收藏自己不需要的废品/杂物（说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 84, text: '有怪异的行为（前面未提及的，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 85, text: '有怪异的想法（前面未提及的，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 86, text: '性格固执、经常绷着脸或极易被激怒', options: [0, 1, 2] },
  { id: 87, text: '情绪喜怒无常，变化突然', options: [0, 1, 2] },
  { id: 88, text: '动不动就生气发脾气', options: [0, 1, 2] },
  { id: 89, text: '多疑，对人不信任', options: [0, 1, 2] },
  { id: 90, text: '骂人或说脏话', options: [0, 1, 2] },

  // 91-100
  { id: 91, text: '扬言或威胁要自杀', options: [0, 1, 2] },
  { id: 92, text: '经常说梦话或梦游（说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 93, text: '话太多，喋喋不休', options: [0, 1, 2] },
  { id: 94, text: '经常戏弄或捉弄他人', options: [0, 1, 2] },
  { id: 95, text: '乱发脾气，脾气暴躁', options: [0, 1, 2] },
  { id: 96, text: '对性相关的问题想得太多或过度关注', options: [0, 1, 2] },
  { id: 97, text: '恐吓或威胁他人', options: [0, 1, 2] },
  { id: 98, text: '吸吮手指（如大拇指）', options: [0, 1, 2] },
  { id: 99, text: '过分要求整齐、清洁（洁癖）', options: [0, 1, 2] },
  { id: 100, text: '睡眠质量差（如入睡困难、易醒等，说明内容：______）', options: [0, 1, 2], hasDescription: true },

  // 101-113
  { id: 101, text: '逃学或旷课', options: [0, 1, 2] },
  { id: 102, text: '不够活跃，动作迟钝或显得精力不足', options: [0, 1, 2] },
  { id: 103, text: '经常闷闷不乐，显得悲伤或抑郁', options: [0, 1, 2] },
  { id: 104, text: '说话声音特别大，吵闹', options: [0, 1, 2] },
  { id: 105, text: '饮酒或滥用成瘾物质（如吸烟、用药等，说明内容：______）', options: [0, 1, 2], hasDescription: true },
  { id: 106, text: '故意损坏公物', options: [0, 1, 2] },
  { id: 107, text: '白天尿裤子（遗尿）', options: [0, 1, 2] },
  { id: 108, text: '夜间尿床（遗尿）', options: [0, 1, 2] },
  { id: 109, text: '总是哼哼唧唧地抱怨或哭喊', options: [0, 1, 2] },
  { id: 110, text: '表达出希望成为异性的强烈愿望', options: [0, 1, 2] },
  { id: 111, text: '孤独，不合群', options: [0, 1, 2] },
  { id: 112, text: '总是忧虑重重，满腹心事', options: [0, 1, 2] },
  // 113题 - 父题（显示标题，不直接作答）
  { id: 113, text: '请写出您孩子存在的、但上面未提及的其他问题', options: [0, 1, 2], hasDescription: false },
  // 113题拆分为3个子题，支持多文本输入
  { id: '113a', text: '问题1', options: [0, 1, 2], hasDescription: true, isSubItem: true, parentId: 113 },
  { id: '113b', text: '问题2', options: [0, 1, 2], hasDescription: true, isSubItem: true, parentId: 113 },
  { id: '113c', text: '问题3', options: [0, 1, 2], hasDescription: true, isSubItem: true, parentId: 113 }
];

// ==========================================
// 辅助函数
// ==========================================

/**
 * 获取所有CBCL题目
 * @returns CBCLQuestion[] 包含113道主题 + 8道子题
 */
export function getCBCLQuestions(): CBCLQuestion[] {
  return CBCL_QUESTIONS;
}

/**
 * 获取主题目 (排除子题)
 * @returns CBCLQuestion[] 仅包含1-113题
 */
export function getCBCLMainQuestions(): CBCLQuestion[] {
  return CBCL_QUESTIONS.filter(q => !q.isSubItem);
}

/**
 * 获取子题目 (56a-56h)
 * @returns CBCLQuestion[] 仅包含子题
 */
export function getCBCLSubQuestions(): CBCLQuestion[] {
  return CBCL_QUESTIONS.filter(q => q.isSubItem);
}

/**
 * 根据ID获取题目
 * @param id 题号 (1-113 或 '56a'-'56h')
 * @returns CBCLQuestion | undefined
 */
export function getCBCLQuestionById(id: number | string): CBCLQuestion | undefined {
  return CBCL_QUESTIONS.find(q => q.id === id);
}

/**
 * 获取选项标签
 * @param value 选项值 (0, 1, 2)
 * @returns string 选项标签
 */
export function getCBCLOptionLabel(value: 0 | 1 | 2): string {
  const option = CBCL_OPTIONS.find(opt => opt.value === value);
  return option?.label ?? '';
}

/**
 * 获取题目总数
 * @returns number 题目总数 (113主题 + 8子题 = 121)
 */
export function getCBCLQuestionCount(): { main: number; sub: number; total: number } {
  const main = CBCL_QUESTIONS.filter(q => !q.isSubItem).length;
  const sub = CBCL_QUESTIONS.filter(q => q.isSubItem).length;
  return { main, sub, total: main + sub };
}
