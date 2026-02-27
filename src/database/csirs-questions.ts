// src/database/csirs-questions.ts
// CSIRS量表58道题目数据(2025优化版)

import type { CSIRSQuestion, CSIRSDimension } from '@/types/csirs';

// 维度定义
export const csirsDimensions: CSIRSDimension[] = [
  {
    id: 1,
    name: '前庭觉调节与运动规划',
    name_en: 'vestibular',
    question_start: 1,
    question_end: 14
  },
  {
    id: 2,
    name: '触觉调节与情绪行为',
    name_en: 'tactile',
    question_start: 15,
    question_end: 35
  },
  {
    id: 3,
    name: '身体感知与动作协调',
    name_en: 'proprioception',
    question_start: 36,
    question_end: 47
  },
  {
    id: 4,
    name: '视听知觉与学业表现',
    name_en: 'learning',
    question_start: 48,
    question_end: 55,
    min_age: 6
  },
  {
    id: 5,
    name: '执行功能与社会适应',
    name_en: 'executive',
    question_start: 56,
    question_end: 58,
    min_age: 10
  }
];

// 58道题目(2025优化版)
export const csirsQuestions: CSIRSQuestion[] = [
  // 一、前庭觉调节与运动规划 (1-14题)
  {
    id: 1,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '热衷于强烈的旋转活动（如转椅、旋转木马），长时间玩耍后很少表现出眩晕感。'
  },
  {
    id: 2,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '喜欢长时间原地旋转或不知疲倦地绕圈奔跑，且极少出现头晕不适。'
  },
  {
    id: 3,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '即使视线良好，行走时仍常无意中碰撞到家具、门框或身边的人。'
  },
  {
    id: 4,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '在双手配合活动中（如一手拿碗一手拿勺），辅助手（非优势手）常被忽略或配合不协调。'
  },
  {
    id: 5,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '动作不够灵巧，易跌倒；被牵拉或抱起时身体显得沉重，缺乏主动配合的肌肉张力。'
  },
  {
    id: 6,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '趴在地上或床上时（俯卧），头、颈、胸部难以长时间维持抬离地面的姿势（抗重力伸展困难）。'
  },
  {
    id: 7,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '活动量显著高于同龄人，难以抑制攀爬跑动的冲动，常规提醒很难让他静下来。'
  },
  {
    id: 8,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '难以保持身体静止，手脚总是在动或摆弄物品；常规的管教很难让他长时间维持安静。'
  },
  {
    id: 9,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '常以推挤、碰撞等冲动方式与人互动，或因缺乏分寸感而被误认为是故意捣乱。'
  },
  {
    id: 10,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '经常自言自语，习惯性重复刚听到的话（仿说），或反复背诵视频/广告中的台词。'
  },
  {
    id: 11,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '尚未建立稳定的惯用手优势，经常左右手混用，或显得两只手操作都不够灵活。'
  },
  {
    id: 12,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '左右方向感混淆，常穿反衣物鞋子，或听口令做动作时分不清左右。'
  },
  {
    id: 13,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '对高度变化或不稳定的平面（如镂空楼梯、自动扶梯）表现出明显恐惧，动作异常缓慢。'
  },
  {
    id: 14,
    dimension: '前庭觉调节与运动规划',
    dimension_en: 'vestibular',
    age_min: 36,
    age_max: 156,
    title: '物品管理混乱，难以将物品归位；面对整理任务显得无从下手，缺乏条理性。'
  },

  // 二、触觉调节与情绪行为 (15-35题)
  {
    id: 15,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '在熟悉的人面前情绪易失控（如发脾气），但在陌生环境中表现得退缩或过度焦虑。'
  },
  {
    id: 16,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '对新环境适应困难，进入陌生场合常表现出强烈的不安，急切想要离开。'
  },
  {
    id: 17,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '对食物质地（如特定蔬菜纤维、软皮）非常敏感，导致饮食种类受限或强烈抗拒尝试。'
  },
  {
    id: 18,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '在社交场合表现拘谨、不安，倾向于独自玩耍，回避与同龄人的群体互动。'
  },
  {
    id: 19,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '过度依赖特定照料者（如母亲），难以分离；但在感到不安时寻求紧密的身体搂抱（深压觉）。'
  },
  {
    id: 20,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '情绪反应强度大，观看视频或听故事时容易过度兴奋（尖叫、大笑）或过度恐惧。'
  },
  {
    id: 21,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '对黑暗或独处表现出与其年龄不符的强烈恐惧，时刻需要成人的陪伴。'
  },
  {
    id: 22,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '睡眠节律紊乱（入睡难、起床气重），对转换环境（如去学校/回家）有明显的抗拒或拖延。'
  },
  {
    id: 23,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '体质较弱或对身体不适过度敏感，常出现原因不明的拒绝上学行为（回避性行为）。'
  },
  {
    id: 24,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '习惯性吸吮手指、咬指甲（寻求口部刺激），但对剪指甲等触觉护理表现出强烈抗拒。'
  },
  {
    id: 25,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '对睡眠环境（如床铺、被褥触感）有固着要求，改变环境会导致严重的入睡困难。'
  },
  {
    id: 26,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '对个人物品边界感极强，他人触碰其物品时会引发激烈的情绪反应。'
  },
  {
    id: 27,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '回避涉及身体接触的游戏，对日常清洁（洗脸、洗澡）表现出与其年龄不符的痛苦或抗拒。'
  },
  {
    id: 28,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '对背后的动静或靠近高度警觉，表现出防御性的保护行为。'
  },
  {
    id: 29,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '排斥接触沙子、泥土、颜料等"脏"的介质，手上沾到东西会急于擦掉（类似洁癖）。'
  },
  {
    id: 30,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '互动时回避眼神接触，倾向于用拉手、指物等肢体动作代替语言表达需求。'
  },
  {
    id: 31,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '痛觉反应异常，对疼痛表现得过于迟钝（不知痛）或过于夸张（痛觉过敏）。'
  },
  {
    id: 32,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '对他人的呼唤常无反应（听觉注册差），显得过度沉浸在自己的世界，偶尔出现不合时宜的笑。'
  },
  {
    id: 33,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '异常安静被动，或沉迷于重复性、非功能性的物品摆弄方式（如转轮子、排列物品）。'
  },
  {
    id: 34,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '情绪激动时易出现咬人行为，或因控制不好力度经常无意中弄坏物品。'
  },
  {
    id: 35,
    dimension: '触觉调节与情绪行为',
    dimension_en: 'tactile',
    age_min: 36,
    age_max: 156,
    title: '性格退缩易哭泣，习惯性通过触摸生殖器官来寻求自我安抚或缓解焦虑。'
  },

  // 三、身体感知与动作协调 (36-47题)
  {
    id: 36,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '在进行精细的生活自理动作（如拉拉链、系鞋带）时，动作显得吃力、缓慢且不流畅。'
  },
  {
    id: 37,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '思维缺乏灵活性（固执），在集体活动中难以融入，倾向于独处。'
  },
  {
    id: 38,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '进食时常掉落食物，或有流口水现象（口腔肌肉控制力弱）。'
  },
  {
    id: 39,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '说话发音含糊不清（构音障碍），或语言表达能力明显滞后于同龄人。'
  },
  {
    id: 40,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '体能耐力差，行动迟缓，完成任务时显得缺乏活力或启动困难。'
  },
  {
    id: 41,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '回避翻跟头、打滚等导致身体位置大幅改变的活动，对爬高表现退缩。'
  },
  {
    id: 42,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '生活自理能力滞后，难独立完成洗手、如厕清洁或使用剪刀等工具操作。'
  },
  {
    id: 43,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '工具使用困难（如握笔、用筷子姿势异常），在大动作游戏（攀爬、秋千）中显得力不从心。'
  },
  {
    id: 44,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '对轻微的伤痛反应强烈，在生活中表现出对他人的高度依赖，缺乏独立性。'
  },
  {
    id: 45,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '在搭建积木、拼装玩具或球类运动（抛接球）中，手眼协调和空间判断表现不佳。'
  },
  {
    id: 46,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '强烈抗拒爬高或走平衡木等需要高度平衡控制的活动。'
  },
  {
    id: 47,
    dimension: '身体感知与动作协调',
    dimension_en: 'proprioception',
    age_min: 36,
    age_max: 156,
    title: '在不熟悉的环境中，难以建立方位感，容易迷路或分不清方向。'
  },

  // 四、视听知觉与学业表现 (48-55题, 6岁以上)
  {
    id: 48,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '智力表现正常，但在特定的阅读理解或数学运算上存在显著困难（学习障碍倾向）。'
  },
  {
    id: 49,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '阅读抄写时常出现跳行、漏字，或书写时部首颠倒、像镜面字（b/d不分）。'
  },
  {
    id: 50,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '课堂专注力维持困难，难以保持坐姿，易被周围环境干扰而东张西望。'
  },
  {
    id: 51,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '握笔书写或涂色时控制力弱，笔迹潦草、速度慢，常无法控制在格子或边框内。'
  },
  {
    id: 52,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '长时间用眼（如看书）易感疲劳酸痛，对逻辑性强或符号类的学习（如数学）表现出强烈畏难。'
  },
  {
    id: 53,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '能认读文字，但理解其含义有困难（阅读理解差），难以组织长句子表达想法。'
  },
  {
    id: 54,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '难以从复杂的背景中快速找出指定图形（视觉背景辨别困难）。'
  },
  {
    id: 55,
    dimension: '视听知觉与学业表现',
    dimension_en: 'learning',
    age_min: 72,
    age_max: 156,
    title: '难以独立完成学校作业或老师指令，在学习过程中常表现出强烈的挫败感。'
  },

  // 五、执行功能与社会适应 (56-58题, 10岁以上)
  {
    id: 56,
    dimension: '执行功能与社会适应',
    dimension_en: 'executive',
    age_min: 120,
    age_max: 156,
    title: '在使用工具或进行家务劳动时，动作笨拙，难以胜任精细或复杂的实操任务。'
  },
  {
    id: 57,
    dimension: '执行功能与社会适应',
    dimension_en: 'executive',
    age_min: 120,
    age_max: 156,
    title: '个人物品和空间管理混乱，难以维持整洁，整理收纳对其来说极具挑战。'
  },
  {
    id: 58,
    dimension: '执行功能与社会适应',
    dimension_en: 'executive',
    age_min: 120,
    age_max: 156,
    title: '对挫折或压力的情绪反应过于激烈，难以自我平复，容易陷入消极思维。'
  }
];

// 根据年龄获取题目
export function getQuestionsByAge(ageInMonths: number): CSIRSQuestion[] {
  const ageYears = Math.floor(ageInMonths / 12);

  if (ageYears < 6) {
    // 6岁以下: 只答前50题
    return csirsQuestions.filter(q => q.id <= 50);
  } else if (ageYears < 10) {
    // 6-9岁: 答前55题
    return csirsQuestions.filter(q => q.id <= 55);
  } else {
    // 10岁以上: 答全部58题
    return csirsQuestions;
  }
}

// 获取适用的维度列表
export function getDimensionsByAge(ageInMonths: number): CSIRSDimension[] {
  const ageYears = Math.floor(ageInMonths / 12);
  return csirsDimensions.filter(d => !d.min_age || ageYears >= d.min_age);
}
