# CSIRS儿童感觉统合能力发展评定量表实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 实现3-12岁儿童感觉统合能力发展评定量表(CSIRS)评估模块，支持根据年龄筛选题目、5级评分、完整报告生成、语音朗读、数据导出、历史对比和训练推荐功能。

**架构:** 复用现有S-M量表的评估流程模式，创建独立的数据库表结构和题目数据，使用Vue 3 + TypeScript + Element Plus构建前端界面。

**技术栈:** Vue 3, TypeScript, Element Plus, SQLite (sql.js), ECharts (图表)

---

## Task 1: 创建CSIRS类型定义文件

**Files:**
- Create: `src/types/csirs.ts`

**Step 1: 创建类型定义文件**

```typescript
// src/types/csirs.ts
// CSIRS量表类型定义

export interface CSIRSQuestion {
  id: number;
  dimension: string;      // 维度名称
  dimension_en: string;   // 维度英文标识
  age_min: number;        // 最小月龄
  age_max: number;        // 最大月龄
  title: string;          // 题目描述(2025优化版)
  audio?: string;         // 语音文件路径(可选)
}

export interface CSIRSDimension {
  id: number;             // 维度ID (1-5)
  name: string;           // 维度中文名
  name_en: string;        // 维度英文标识
  question_start: number; // 起始题号
  question_end: number;   // 结束题号
  min_age?: number;       // 最小适用年龄(岁)
}

export interface CSIRSConversionTable {
  age_years: number;      // 年龄(岁)
  dimensions: {
    vestibular: number[];     // 前庭觉调节与运动规划原始分范围
    tactile: number[];        // 触觉调节与情绪行为原始分范围
    proprioception: number[]; // 身体感知与动作协调原始分范围
    learning?: number[];      // 视听知觉与学业表现(6岁+)
    executive?: number[];     // 执行功能与社会适应(10岁+)
  };
}

export interface CSIRSAnswer {
  question_id: number;
  score: number;          // 1-5分
  answer_time?: number;   // 答题用时(毫秒)
}

export interface CSIRSAssessment {
  id: number;
  student_id: number;
  student_name: string;
  age_months: number;
  raw_scores: Record<string, number>;     // 各维度原始分
  t_scores: Record<string, number>;       // 各维度T分
  total_t_score: number;
  level: string;          // 等级评定
  start_time: string;
  end_time?: string;
  answers: CSIRSAnswer[];
}

export interface CSIRSHistoryItem {
  assess_id: number;
  date: string;
  age_months: number;
  t_scores: Record<string, number>;
  total_t_score: number;
  level: string;
}

// 等级评定标准
export interface CSIRSEvaluationLevel {
  min_t: number;
  max_t: number;
  level: string;
  description: string;
  color: string;
}
```

**Step 2: 提交**

```bash
git add src/types/csirs.ts
git commit -m "feat: add CSIRS type definitions"
```

---

## Task 2: 创建CSIRS题目数据文件

**Files:**
- Create: `src/database/csirs-questions.ts`

**Step 1: 创建题目数据文件**

```typescript
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
```

**Step 2: 提交**

```bash
git add src/database/csirs-questions.ts
git commit -m "feat: add CSIRS 58 questions data (2025 optimized version)"
```

---

## Task 3: 创建CSIRS原始分到T分转换表

**Files:**
- Create: `src/database/csirs-conversion.ts`

**Step 1: 创建转换表数据文件**

```typescript
// src/database/csirs-conversion.ts
// CSIRS量表原始分到T分转换表

import type { CSIRSConversionTable, CSIRSEvaluationLevel } from '@/types/csirs';

// 原始分到T分转换表 (基于官方常模数据)
export const csirsConversionTables: CSIRSConversionTable[] = [
  {
    age_years: 3,
    dimensions: {
      vestibular: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45], // T分 10-46
      tactile: [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],
      proprioception: [23, 24, 24, 25, 26, 27, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41]
    }
  },
  {
    age_years: 4,
    dimensions: {
      vestibular: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
      tactile: [45, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73],
      proprioception: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42]
    }
  },
  {
    age_years: 5,
    dimensions: {
      vestibular: [29, 30, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
      tactile: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],
      proprioception: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42]
    }
  },
  {
    age_years: 6,
    dimensions: {
      vestibular: [30, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
      tactile: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76],
      proprioception: [31, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
      learning: [10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 19, 20, 21] // 8题
    }
  },
  {
    age_years: 7,
    dimensions: {
      vestibular: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
      tactile: [52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74],
      proprioception: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
      learning: [11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 18, 18, 19, 20, 21, 22, 23]
    }
  },
  {
    age_years: 8,
    dimensions: {
      vestibular: [31, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
      tactile: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68],
      proprioception: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
      learning: [9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 15, 16, 16, 17, 18, 19, 20]
    }
  },
  {
    age_years: 9,
    dimensions: {
      vestibular: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
      tactile: [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62],
      proprioception: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
      learning: [10, 11, 11, 12, 12, 13, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    }
  },
  {
    age_years: 10,
    dimensions: {
      vestibular: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
      tactile: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65],
      proprioception: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
      learning: [8, 8, 9, 9, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      executive: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45] // 3题
    }
  },
  {
    age_years: 11,
    dimensions: {
      vestibular: [30, 31, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
      tactile: [47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66],
      proprioception: [27, 28, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38],
      learning: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      executive: [37, 38, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52]
    }
  },
  {
    age_years: 12,
    dimensions: {
      vestibular: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
      tactile: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70],
      proprioception: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
      learning: [12, 13, 13, 14, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      executive: [13, 13, 14, 15, 15, 16, 16, 17, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
    }
  }
];

// 等级评定标准
export const csirsEvaluationLevels: CSIRSEvaluationLevel[] = [
  { min_t: 0, max_t: 29, level: '严重偏低', description: '需要专业干预和支持', color: '#F56C6C' },
  { min_t: 30, max_t: 39, level: '偏低', description: '建议进行感觉统合训练', color: '#E6A23C' },
  { min_t: 40, max_t: 60, level: '正常', description: '感觉统合能力发展良好', color: '#67C23A' },
  { min_t: 61, max_t: 70, level: '优秀', description: '感觉统合能力发展优秀', color: '#409EFF' },
  { min_t: 71, max_t: 100, level: '非常优秀', description: '感觉统合能力发展非常突出', color: '#909399' }
];

// 根据原始分计算T分
export function calculateTScore(rawScore: number, ageYears: number, dimension: string): number {
  const table = csirsConversionTables.find(t => t.age_years === ageYears);
  if (!table) return 50; // 默认值

  const scores = table.dimensions[dimension as keyof typeof table.dimensions];
  if (!scores || !Array.isArray(scores)) return 50;

  // 找到原始分在数组中的位置，计算T分
  // 数组索引0对应T分10，索引1对应T分11，以此类推
  for (let i = 0; i < scores.length; i++) {
    if (rawScore <= scores[i]) {
      return 10 + i;
    }
  }

  // 超出范围，返回最大T分
  return 10 + scores.length;
}

// 根据T分获取等级
export function getEvaluationLevel(tScore: number): CSIRSEvaluationLevel {
  const level = csirsEvaluationLevels.find(l => tScore >= l.min_t && tScore <= l.max_t);
  return level || csirsEvaluationLevels[2]; // 默认返回正常
}

// 获取转换表
export function getConversionTable(ageYears: number): CSIRSConversionTable | null {
  return csirsConversionTables.find(t => t.age_years === ageYears) || null;
}
```

**Step 2: 提交**

```bash
git add src/database/csirs-conversion.ts
git commit -m "feat: add CSIRS raw score to T-score conversion tables"
```

---

## Task 4: 更新数据库初始化文件添加CSIRS表

**Files:**
- Modify: `src/database/init.ts:300-310`

**Step 1: 在init.ts中添加CSIRS评估表定义**

在 `report_record` 表定义后添加：

```typescript
// CSIRS感觉统合评估主表
CREATE TABLE IF NOT EXISTS csirs_assess (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  age_months INTEGER NOT NULL,
  raw_scores JSON NOT NULL,
  t_scores JSON NOT NULL,
  total_t_score REAL NOT NULL DEFAULT 50,
  level TEXT NOT NULL DEFAULT '正常',
  start_time TEXT NOT NULL,
  end_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES student(id)
);

// CSIRS评估详情表
CREATE TABLE IF NOT EXISTS csirs_assess_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assess_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  dimension TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
  answer_time INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assess_id) REFERENCES csirs_assess(id)
);
```

**Step 2: 提交**

```bash
git add src/database/init.ts
git commit -m "feat: add CSIRS assessment tables to database schema"
```

---

## Task 5: 创建CSIRS评估页面视图

**Files:**
- Create: `src/views/assessment/csirs/Assessment.vue`
- Modify: `src/router/index.ts:30-35`

**Step 1: 创建CSIRS评估主页面**

```vue
<!-- src/views/assessment/csirs/Assessment.vue -->
<template>
  <div class="csirs-assessment">
    <!-- 欢迎对话框 -->
    <el-dialog
      v-model="showWelcomeDialog"
      title=""
      width="580px"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      class="welcome-dialog"
      draggable
    >
      <div class="welcome-content">
        <h2>儿童感觉统合能力发展评定量表 (CSIRS)</h2>
        <p class="welcome-intro">本量表用于评估3-12岁儿童的感觉统合能力发展状况，包括前庭觉、触觉、本体感、学习能力和执行功能五个维度。</p>

        <div class="welcome-sections">
          <div class="welcome-section">
            <h4><span class="section-icon">📋</span> 评分说明</h4>
            <p>请根据孩子<strong>最近一个月</strong>的实际表现进行评分：</p>
            <ul>
              <li><strong>A (5分)</strong> - 从不：从来没有这种情况</li>
              <li><strong>B (4分)</strong> - 很少：偶尔出现（每月1-2次）</li>
              <li><strong>C (3分)</strong> - 有时候：有时出现（每周1-2次）</li>
              <li><strong>D (2分)</strong> - 常常：经常出现（每天都会）</li>
              <li><strong>E (1分)</strong> - 总是：每次都这样</li>
            </ul>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">⏱️</span> 评估时间</h4>
            <p>约15-20分钟，请确保在安静、无干扰的环境下进行评估。</p>
          </div>

          <div class="welcome-section">
            <h4><span class="section-icon">👨‍👩‍👧</span> 评估人</h4>
            <p>建议由最了解孩子的家长或主要照顾者填写。</p>
          </div>
        </div>

        <p class="welcome-footer">请根据孩子的实际情况真实填写，感谢您的配合！</p>
      </div>
      <template #footer>
        <el-button type="primary" size="large" @click="startAssessment">
          我已了解，开始评估
        </el-button>
      </template>
    </el-dialog>

    <!-- 评估头部 -->
    <el-card class="assessment-header">
      <div class="header-content">
        <div class="student-info">
          <h3>CSIRS感觉统合评估</h3>
          <div class="info-row">
            <span>学生：{{ student?.name }}</span>
            <span>年龄：{{ studentAge }}岁</span>
            <span>题目：{{ filteredQuestions.length }}题</span>
            <span v-if="currentDimension">当前维度：{{ currentDimension }}</span>
          </div>
        </div>
        <div class="progress-info">
          <el-progress
            :percentage="progressPercentage"
            :format="progressFormat"
            :stroke-width="20"
          />
          <div class="progress-text">
            已完成：{{ currentIndex + 1 }} / {{ filteredQuestions.length }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 题目卡片 -->
    <el-card class="question-card" v-if="currentQuestion">
      <div class="question-header">
        <span class="question-number">第 {{ currentIndex + 1 }} 题</span>
        <span class="question-dimension">{{ currentQuestion.dimension }}</span>
      </div>

      <div class="question-content">
        <div class="question-title">
          {{ currentQuestion.title }}
        </div>

        <!-- 语音播放按钮 -->
        <div class="question-actions">
          <el-button
            type="info"
            :icon="Microphone"
            @click="playAudio"
            :loading="isPlaying"
          >
            {{ isPlaying ? '播放中...' : '朗读题目' }}
          </el-button>
        </div>

        <!-- 答案选项 -->
        <div class="answer-options">
          <el-radio-group v-model="currentAnswer" @change="handleAnswer">
            <el-radio-button
              v-for="option in answerOptions"
              :key="option.value"
              :label="option.value"
              class="answer-option"
            >
              <span class="option-label">{{ option.label }}</span>
              <span class="option-desc">{{ option.desc }}</span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 导航按钮 -->
      <div class="question-nav">
        <el-button
          :disabled="currentIndex === 0"
          @click="previousQuestion"
          size="large"
        >
          上一题
        </el-button>
        <el-button
          type="primary"
          :disabled="!currentAnswer"
          @click="nextQuestion"
          size="large"
        >
          {{ isLastQuestion ? '完成评估' : '下一题' }}
        </el-button>
      </div>
    </el-card>

    <!-- 完成确认对话框 -->
    <el-dialog
      v-model="showConfirmDialog"
      title="确认完成"
      width="400px"
    >
      <p>您已完成所有题目，是否提交评估结果？</p>
      <template #footer>
        <el-button @click="showConfirmDialog = false">返回检查</el-button>
        <el-button type="primary" @click="submitAssessment">提交评估</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Microphone } from '@element-plus/icons-vue'
import { csirsQuestions, getQuestionsByAge } from '@/database/csirs-questions'
import { calculateTScore, getEvaluationLevel } from '@/database/csirs-conversion'
import { db } from '@/database/api'
import type { CSIRSQuestion, CSIRSAnswer } from '@/types/csirs'

const router = useRouter()
const route = useRoute()

// 状态
const showWelcomeDialog = ref(true)
const showConfirmDialog = ref(false)
const student = ref<any>(null)
const currentIndex = ref(0)
const answers = ref<CSIRSAnswer[]>([])
const currentAnswer = ref<number | null>(null)
const isPlaying = ref(false)
const startTime = ref(Date.now())
const assessId = ref<number | null>(null)

// 答案选项
const answerOptions = [
  { value: 5, label: 'A', desc: '从不' },
  { value: 4, label: 'B', desc: '很少' },
  { value: 3, label: 'C', desc: '有时候' },
  { value: 2, label: 'D', desc: '常常' },
  { value: 1, label: 'E', desc: '总是' }
]

// 根据年龄筛选题目
const filteredQuestions = computed(() => {
  if (!student.value) return []
  return getQuestionsByAge(student.value.age_months)
})

// 当前题目
const currentQuestion = computed(() => {
  return filteredQuestions.value[currentIndex.value]
})

// 当前维度
const currentDimension = computed(() => {
  return currentQuestion.value?.dimension
})

// 进度
const progressPercentage = computed(() => {
  return ((currentIndex.value + 1) / filteredQuestions.value.length) * 100
})

// 学生年龄
const studentAge = computed(() => {
  if (!student.value) return 0
  return Math.floor(student.value.age_months / 12)
})

// 是否最后一题
const isLastQuestion = computed(() => {
  return currentIndex.value === filteredQuestions.value.length - 1
})

// 进度格式
const progressFormat = (percentage: number) => {
  return `${Math.round(percentage)}%`
}

// 开始评估
const startAssessment = () => {
  showWelcomeDialog.value = false
  startTime.value = Date.now()
}

// 播放语音
const playAudio = () => {
  isPlaying.value = true
  const utterance = new SpeechSynthesisUtterance(currentQuestion.value?.title)
  utterance.lang = 'zh-CN'
  utterance.onend = () => {
    isPlaying.value = false
  }
  speechSynthesis.speak(utterance)
}

// 处理答案
const handleAnswer = () => {
  const answerTime = Date.now() - startTime.value
  answers.value.push({
    question_id: currentQuestion.value!.id,
    score: currentAnswer.value!,
    answer_time: answerTime
  })
  // 自动进入下一题
  setTimeout(() => {
    nextQuestion()
  }, 300)
}

// 下一题
const nextQuestion = () => {
  if (isLastQuestion.value) {
    showConfirmDialog.value = true
  } else {
    currentIndex.value++
    currentAnswer.value = null
    startTime.value = Date.now()
  }
}

// 上一题
const previousQuestion = () => {
  if (currentIndex.value > 0) {
    // 移除最后一题的答案
    answers.value.pop()
    currentIndex.value--
    // 恢复上一题的答案
    const lastAnswer = answers.value.find(a => a.question_id === filteredQuestions.value[currentIndex.value].id)
    currentAnswer.value = lastAnswer?.score || null
  }
}

// 提交评估
const submitAssessment = async () => {
  try {
    const ageYears = studentAge.value
    const ageMonths = student.value.age_months

    // 计算各维度原始分
    const dimensionScores: Record<string, number[]> = {}

    for (const answer of answers.value) {
      const question = csirsQuestions.find(q => q.id === answer.question_id)
      if (question) {
        if (!dimensionScores[question.dimension_en]) {
          dimensionScores[question.dimension_en] = []
        }
        dimensionScores[question.dimension_en].push(answer.score)
      }
    }

    // 计算原始分总和
    const rawScores: Record<string, number> = {}
    const tScores: Record<string, number> = {}

    for (const [dimension, scores] of Object.entries(dimensionScores)) {
      rawScores[dimension] = scores.reduce((sum, score) => sum + score, 0)
      tScores[dimension] = calculateTScore(rawScores[dimension], ageYears, dimension)
    }

    // 计算总T分
    const totalTScore = Object.values(tScores).reduce((sum, score) => sum + score, 0) / Object.keys(tScores).length

    // 获取等级
    const level = getEvaluationLevel(totalTScore)

    // 创建评估记录
    const result = await db.execute(`
      INSERT INTO csirs_assess (student_id, age_months, raw_scores, t_scores, total_t_score, level, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      student.value.id,
      ageMonths,
      JSON.stringify(rawScores),
      JSON.stringify(tScores),
      totalTScore,
      level.level,
      new Date(startTime.value).toISOString(),
      new Date().toISOString()
    ])

    assessId.value = result.lastId

    // 插入详情记录
    for (const answer of answers.value) {
      const question = csirsQuestions.find(q => q.id === answer.question_id)
      await db.execute(`
        INSERT INTO csirs_assess_detail (assess_id, question_id, dimension, score, answer_time)
        VALUES (?, ?, ?, ?, ?)
      `, [assessId.value, answer.question_id, question?.dimension || '', answer.score, answer.answer_time || 0])
    }

    ElMessage.success('评估完成！')

    // 跳转到报告页面
    router.push(`/assessment/csirs/report/${assessId.value}`)
  } catch (error) {
    console.error('提交评估失败:', error)
    ElMessage.error('提交评估失败，请重试')
  }
}

// 获取学生信息
onMounted(async () => {
  const studentId = route.params.studentId || route.query.studentId
  if (studentId) {
    const result = await db.execute('SELECT * FROM student WHERE id = ?', [studentId])
    student.value = result.data[0]
  }
})

onUnmounted(() => {
  speechSynthesis.cancel()
})
</script>

<style scoped>
.csirs-assessment {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.welcome-content h2 {
  text-align: center;
  color: #409EFF;
  margin-bottom: 20px;
}

.welcome-intro {
  text-align: center;
  color: #606266;
  margin-bottom: 30px;
}

.welcome-sections {
  margin: 30px 0;
}

.welcome-section {
  margin-bottom: 25px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.welcome-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.section-icon {
  margin-right: 8px;
}

.welcome-section ul {
  margin: 10px 0;
  padding-left: 20px;
}

.welcome-section li {
  margin: 8px 0;
  color: #606266;
}

.welcome-footer {
  text-align: center;
  color: #909399;
  margin-top: 20px;
}

.assessment-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.student-info h3 {
  margin: 0 0 10px 0;
}

.info-row span {
  margin-right: 20px;
  color: #606266;
}

.progress-info {
  flex: 1;
  min-width: 300px;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  color: #909399;
}

.question-card {
  min-height: 400px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.question-number {
  font-size: 18px;
  font-weight: bold;
  color: #409EFF;
}

.question-dimension {
  padding: 4px 12px;
  background: #ecf5ff;
  color: #409EFF;
  border-radius: 4px;
  font-size: 14px;
}

.question-content {
  margin: 30px 0;
}

.question-title {
  font-size: 20px;
  line-height: 1.8;
  color: #303133;
  margin-bottom: 30px;
}

.question-actions {
  margin-bottom: 30px;
}

.answer-options {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.answer-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.option-label {
  font-size: 18px;
  font-weight: bold;
}

.option-desc {
  font-size: 12px;
  color: #909399;
}

.question-nav {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}
</style>
```

**Step 2: 更新路由配置**

在 `src/router/index.ts` 中添加：

```typescript
// 在评估相关页面部分添加
const CSIRSAssessment = () => import('@/views/assessment/csirs/Assessment.vue')
const CSIRSReport = () => import('@/views/assessment/csirs/Report.vue')

// 在routes数组中添加
{
  path: '/assessment/csirs/:studentId',
  component: CSIRSAssessment,
  meta: { requiresAuth: true }
},
{
  path: '/assessment/csirs/report/:assessId',
  component: CSIRSReport,
  meta: { requiresAuth: true }
}
```

**Step 3: 提交**

```bash
git add src/views/assessment/csirs/ src/router/index.ts
git commit -m "feat: add CSIRS assessment page and routes"
```

---

## Task 6: 更新评估选择页面添加CSIRS入口

**Files:**
- Modify: `src/views/assessment/AssessmentSelect.vue`

**Step 1: 在AssessmentSelect.vue中添加CSIRS卡片**

在WeeFIM卡片后添加：

```vue
<!-- CSIRS量表卡片 -->
<el-card
  class="scale-card csirs-card"
  shadow="hover"
  @click="selectScale('csirs')"
>
  <div class="scale-icon csirs-icon">
    <el-icon size="60"><Sunny /></el-icon>
  </div>
  <h3 class="scale-title">儿童感觉统合能力发展评定量表</h3>
  <p class="scale-subtitle">(CSIRS量表)</p>
  <div class="scale-info">
    <ul>
      <li>适用年龄：3 - 12岁</li>
      <li>题目数量：58道</li>
      <li>评估维度：前庭觉、触觉、本体感、学习能力、执行功能</li>
      <li>评估时间：约15-20分钟</li>
    </ul>
  </div>
  <el-button type="warning" size="large" class="scale-btn">
    开始评估
  </el-button>
</el-card>
```

**Step 2: 更新selectScale方法**

```typescript
const selectScale = (scale: string) => {
  if (scale === 'csirs') {
    router.push('/assessment/select-student?scale=csirs')
  } else if (scale === 'sm') {
    router.push('/assessment/select-student?scale=sm')
  } else if (scale === 'weefim') {
    router.push('/assessment/select-student?scale=weefim')
  }
}
```

**Step 3: 添加CSIRS卡片样式**

```css
.csirs-icon {
  background: linear-gradient(135deg, #FF6B6B 0%, #FFD93D 100%);
}
```

**Step 4: 提交**

```bash
git add src/views/assessment/AssessmentSelect.vue
git commit -m "feat: add CSIRS scale card to assessment selection page"
```

---

## Task 7: 更新SelectStudent页面支持CSIRS

**Files:**
- Modify: `src/views/assessment/SelectStudent.vue`

**Step 1: 在SelectStudent.vue中添加CSIRS处理**

```typescript
// 在script中添加CSIRS量表类型检查
const currentScale = computed(() => {
  const scale = route.query.scale as string
  return scale || 'sm' // 默认S-M量表
})

const scaleTitle = computed(() => {
  switch (currentScale.value) {
    case 'csirs':
      return 'CSIRS感觉统合评估'
    case 'weefim':
      return 'WeeFIM功能独立性评估'
    default:
      return 'S-M社会生活能力评估'
  }
})

const startAssessment = (student: any) => {
  if (currentScale.value === 'csirs') {
    router.push(`/assessment/csirs/${student.id}`)
  } else if (currentScale.value === 'weefim') {
    router.push(`/assessment/weefim/${student.id}`)
  } else {
    router.push(`/assessment/sm/${student.id}`)
  }
}
```

**Step 2: 提交**

```bash
git add src/views/assessment/SelectStudent.vue
git commit -m "feat: add CSIRS support to student selection page"
```

---

## Task 8: 创建CSIRS评估报告页面

**Files:**
- Create: `src/views/assessment/csirs/Report.vue`

**Step 1: 创建报告页面组件**

```vue
<!-- src/views/assessment/csirs/Report.vue -->
<template>
  <div class="csirs-report">
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <span class="page-title">CSIRS感觉统合评估报告</span>
      </template>
    </el-page-header>

    <el-card v-if="assessment" class="report-content">
      <!-- 基本信息 -->
      <div class="report-section">
        <h3>基本信息</h3>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="学生姓名">{{ assessment.student_name }}</el-descriptions-item>
          <el-descriptions-item label="评估年龄">{{ studentAge }}岁</el-descriptions-item>
          <el-descriptions-item label="评估时间">{{ formatDate(assessment.end_time) }}</el-descriptions-item>
          <el-descriptions-item label="总T分">
            <span :style="{ color: levelInfo.color, fontSize: '20px', fontWeight: 'bold' }">
              {{ assessment.total_t_score.toFixed(1) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="评定等级">
            <el-tag :type="getTagType(levelInfo.level)" size="large">
              {{ levelInfo.level }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="建议">{{ levelInfo.description }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 各维度得分 -->
      <div class="report-section">
        <h3>各维度T分</h3>
        <div id="dimension-chart" style="width: 100%; height: 400px;"></div>
      </div>

      <!-- 各维度详细分析 -->
      <div class="report-section">
        <h3>各维度详细分析</h3>
        <el-table :data="dimensionDetails" border>
          <el-table-column prop="name" label="维度" width="200" />
          <el-table-column prop="rawScore" label="原始分" width="100" />
          <el-table-column prop="tScore" label="T分" width="100">
            <template #default="{ row }">
              <span :style="{ color: getScoreColor(row.tScore), fontWeight: 'bold' }">
                {{ row.tScore }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="level" label="等级" width="120">
            <template #default="{ row }">
              <el-tag :type="getTagType(row.level)" size="small">
                {{ row.level }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="suggestion" label="建议" />
        </el-table>
      </div>

      <!-- 操作按钮 -->
      <div class="report-actions">
        <el-button type="primary" @click="exportPDF">
          <el-icon><Download /></el-icon>
          导出PDF报告
        </el-button>
        <el-button @click="exportExcel">
          <el-icon><Document /></el-icon>
          导出Excel数据
        </el-button>
        <el-button @click="viewHistory">
          <el-icon><Clock /></el-icon>
          历史评估对比
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Document, Clock } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { csirsDimensions } from '@/database/csirs-questions'
import { getEvaluationLevel } from '@/database/csirs-conversion'
import { db } from '@/database/api'
import type { CSIRSAssessment } from '@/types/csirs'

const router = useRouter()
const route = useRoute()

const assessment = ref<CSIRSAssessment | null>(null)

// 学生年龄
const studentAge = computed(() => {
  if (!assessment.value) return 0
  return Math.floor(assessment.value.age_months / 12)
})

// 等级信息
const levelInfo = computed(() => {
  if (!assessment.value) return { level: '正常', description: '', color: '#67C23A' }
  return getEvaluationLevel(assessment.value.total_t_score)
})

// 各维度详情
const dimensionDetails = computed(() => {
  if (!assessment.value) return []

  const tScores = assessment.value.t_scores
  const rawScores = assessment.value.raw_scores

  return csirsDimensions
    .filter(d => !d.min_age || studentAge.value >= d.min_age)
    .map(d => {
      const tScore = tScores[d.name_en] || 50
      const rawScore = rawScores[d.name_en] || 0
      const level = getEvaluationLevel(tScore)

      return {
        name: d.name,
        rawScore,
        tScore,
        level: level.level,
        suggestion: getSuggestion(d.name_en, tScore)
      }
    })
})

// 获取建议
const getSuggestion = (dimension: string, tScore: number): string => {
  const level = getEvaluationLevel(tScore)
  if (tScore >= 40) {
    return '该维度发展良好，继续保持'
  } else if (tScore >= 30) {
    return '建议进行相应的感觉统合训练'
  } else {
    return '需要专业干预和支持'
  }
}

// 获取分数颜色
const getScoreColor = (score: number): string => {
  if (score >= 40) return '#67C23A'
  if (score >= 30) return '#E6A23C'
  return '#F56C6C'
}

// 获取标签类型
const getTagType = (level: string): string => {
  switch (level) {
    case '非常优秀':
    case '优秀':
      return 'success'
    case '正常':
      return ''
    case '偏低':
      return 'warning'
    case '严重偏低':
      return 'danger'
    default:
      return 'info'
  }
}

// 格式化日期
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 返回
const goBack = () => {
  router.back()
}

// 导出PDF
const exportPDF = () => {
  ElMessage.info('PDF导出功能开发中')
}

// 导出Excel
const exportExcel = () => {
  ElMessage.info('Excel导出功能开发中')
}

// 查看历史
const viewHistory = () => {
  router.push(`/assessment/csirs/history/${assessment.value?.student_id}`)
}

// 绘制图表
const drawChart = () => {
  nextTick(() => {
    const chartDom = document.getElementById('dimension-chart')
    if (!chartDom || !assessment.value) return

    const myChart = echarts.init(chartDom)
    const tScores = assessment.value.t_scores

    const data = csirsDimensions
      .filter(d => !d.min_age || studentAge.value >= d.min_age)
      .map(d => ({
        name: d.name,
        value: tScores[d.name_en] || 50
      }))

    const option = {
      title: {
        text: '感觉统合能力雷达图',
        left: 'center'
      },
      radar: {
        indicator: data.map(d => ({ name: d.name, max: 80 })),
        shape: 'polygon',
        axisName: {
          fontSize: 14
        }
      },
      series: [{
        type: 'radar',
        data: [{
          value: data.map(d => d.value),
          name: 'T分',
          areaStyle: {
            color: 'rgba(64, 158, 255, 0.3)'
          }
        }]
      }]
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => myChart.resize())
  })
}

// 加载评估数据
onMounted(async () => {
  const assessId = route.params.assessId

  try {
    // 加载评估数据
    const result = await db.execute(`
      SELECT a.*, s.name as student_name
      FROM csirs_assess a
      JOIN student s ON a.student_id = s.id
      WHERE a.id = ?
    `, [assessId])

    if (result.data.length === 0) {
      ElMessage.error('评估记录不存在')
      router.back()
      return
    }

    const data = result.data[0]
    assessment.value = {
      ...data,
      raw_scores: JSON.parse(data.raw_scores),
      t_scores: JSON.parse(data.t_scores),
      answers: []
    }

    drawChart()
  } catch (error) {
    console.error('加载评估数据失败:', error)
    ElMessage.error('加载评估数据失败')
  }
})
</script>

<style scoped>
.csirs-report {
  padding: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
}

.report-content {
  margin-top: 20px;
}

.report-section {
  margin-bottom: 30px;
}

.report-section h3 {
  margin-bottom: 15px;
  color: #303133;
  border-left: 4px solid #409EFF;
  padding-left: 10px;
}

.report-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}
</style>
```

**Step 2: 提交**

```bash
git add src/views/assessment/csirs/Report.vue
git commit -m "feat: add CSIRS assessment report page with radar chart"
```

---

## Task 9: 在学生详情页添加CSIRS评估入口

**Files:**
- Modify: `src/views/StudentDetail.vue`

**Step 1: 查找学生详情页的评估操作区域**

搜索 `StudentDetail.vue` 中的评估相关按钮，在S-M评估按钮后添加CSIRS评估按钮。

```vue
<el-button
  type="warning"
  @click="startCSIRSAssessment"
>
  CSIRS评估
</el-button>
```

**Step 2: 添加方法**

```typescript
const startCSIRSAssessment = () => {
  router.push(`/assessment/csirs/${student.value.id}`)
}
```

**Step 3: 提交**

```bash
git add src/views/StudentDetail.vue
git commit -m "feat: add CSIRS assessment entry in student detail page"
```

---

## Task 10: 创建CSIRS历史对比页面

**Files:**
- Create: `src/views/assessment/csirs/History.vue`

**Step 1: 创建历史对比页面**

```vue
<!-- src/views/assessment/csirs/History.vue -->
<template>
  <div class="csirs-history">
    <el-page-header @back="goBack" title="返回">
      <template #content>
        <span class="page-title">CSIRS历史评估对比</span>
      </template>
    </el-page-header>

    <el-card v-if="student" class="student-info">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="学生姓名">{{ student.name }}</el-descriptions-item>
        <el-descriptions-item label="评估次数">{{ historyList.length }}次</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="historyList.length > 0" class="chart-card">
      <div id="trend-chart" style="width: 100%; height: 400px;"></div>
    </el-card>

    <el-card class="history-table">
      <h3>评估历史记录</h3>
      <el-table :data="historyList" border>
        <el-table-column prop="date" label="评估日期" width="180" />
        <el-table-column prop="age" label="评估年龄" width="100" />
        <el-table-column prop="total_t_score" label="总T分" width="100">
          <template #default="{ row }">
            <span :style="{ color: getScoreColor(row.total_t_score), fontWeight: 'bold' }">
              {{ row.total_t_score.toFixed(1) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="等级" width="120">
          <template #default="{ row }">
            <el-tag :type="getTagType(row.level)" size="small">
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewReport(row.assess_id)">
              查看报告
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { csirsDimensions } from '@/database/csirs-questions'
import { getEvaluationLevel } from '@/database/csirs-conversion'
import { db } from '@/database/api'
import type { CSIRSHistoryItem } from '@/types/csirs'

const router = useRouter()
const route = useRoute()

const student = ref<any>(null)
const historyList = ref<CSIRSHistoryItem[]>([])

// 获取分数颜色
const getScoreColor = (score: number): string => {
  if (score >= 40) return '#67C23A'
  if (score >= 30) return '#E6A23C'
  return '#F56C6C'
}

// 获取标签类型
const getTagType = (level: string): string => {
  switch (level) {
    case '非常优秀':
    case '优秀':
      return 'success'
    case '正常':
      return ''
    case '偏低':
      return 'warning'
    case '严重偏低':
      return 'danger'
    default:
      return 'info'
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 查看报告
const viewReport = (assessId: number) => {
  router.push(`/assessment/csirs/report/${assessId}`)
}

// 绘制趋势图
const drawTrendChart = () => {
  nextTick(() => {
    const chartDom = document.getElementById('trend-chart')
    if (!chartDom || historyList.value.length === 0) return

    const myChart = echarts.init(chartDom)

    // 准备数据
    const dates = historyList.value.map(h => h.date)
    const dimensions = csirsDimensions.filter(d => !d.min_age || Math.floor(historyList.value[0].age_months / 12) >= d.min_age)

    const series = dimensions.map(d => ({
      name: d.name,
      type: 'line',
      data: historyList.value.map(h => h.t_scores[d.name_en] || 50)
    }))

    const option = {
      title: {
        text: '感觉统合能力发展趋势',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: dimensions.map(d => d.name),
        bottom: 0
      },
      xAxis: {
        type: 'category',
        data: dates
      },
      yAxis: {
        type: 'value',
        name: 'T分',
        min: 0,
        max: 80
      },
      series
    }

    myChart.setOption(option)

    window.addEventListener('resize', () => myChart.resize())
  })
}

// 加载历史数据
onMounted(async () => {
  const studentId = route.params.studentId

  try {
    // 加载学生信息
    const studentResult = await db.execute('SELECT * FROM student WHERE id = ?', [studentId])
    student.value = studentResult.data[0]

    // 加载历史评估
    const historyResult = await db.execute(`
      SELECT id, age_months, t_scores, total_t_score, level, created_at
      FROM csirs_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])

    historyList.value = historyResult.data.map(row => ({
      assess_id: row.id,
      date: new Date(row.created_at).toLocaleDateString('zh-CN'),
      age_months: row.age_months,
      t_scores: JSON.parse(row.t_scores),
      total_t_score: row.total_t_score,
      level: row.level
    }))

    drawTrendChart()
  } catch (error) {
    console.error('加载历史数据失败:', error)
    ElMessage.error('加载历史数据失败')
  }
})
</script>

<style scoped>
.csirs-history {
  padding: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
}

.student-info,
.chart-card,
.history-table {
  margin-top: 20px;
}

.history-table h3 {
  margin-bottom: 15px;
  color: #303133;
  border-left: 4px solid #409EFF;
  padding-left: 10px;
}
</style>
```

**Step 2: 添加路由**

```typescript
const CSIRSHistory = () => import('@/views/assessment/csirs/History.vue')

// 在routes中添加
{
  path: '/assessment/csirs/history/:studentId',
  component: CSIRSHistory,
  meta: { requiresAuth: true }
}
```

**Step 3: 提交**

```bash
git add src/views/assessment/csirs/History.vue src/router/index.ts
git commit -m "feat: add CSIRS assessment history comparison page"
```

---

## 测试和验证

### 测试步骤

1. **数据库测试**
   - 启动应用，检查数据库是否正确创建 `csirs_assess` 和 `csirs_assess_detail` 表
   - 验证表结构是否符合定义

2. **题目筛选测试**
   - 创建不同年龄的学生（4岁、7岁、11岁）
   - 进入CSIRS评估，验证题目数量是否正确（50、55、58题）

3. **评估流程测试**
   - 完成一次完整的评估流程
   - 验证答案保存和T分计算是否正确

4. **报告生成测试**
   - 查看评估报告，验证雷达图显示
   - 检查各维度T分和等级评定

5. **历史对比测试**
   - 对同一学生进行多次评估
   - 查看历史对比页面，验证趋势图

### 验收标准

- [ ] 数据库表结构正确
- [ ] 题目根据年龄正确筛选
- [ ] 评估流程完整可用
- [ ] T分计算准确
- [ ] 报告页面显示正常
- [ ] 历史对比功能正常

---

## 文件清单

### 新建文件
1. `src/types/csirs.ts` - 类型定义
2. `src/database/csirs-questions.ts` - 题目数据
3. `src/database/csirs-conversion.ts` - 转换表数据
4. `src/views/assessment/csirs/Assessment.vue` - 评估页面
5. `src/views/assessment/csirs/Report.vue` - 报告页面
6. `src/views/assessment/csirs/History.vue` - 历史对比页面

### 修改文件
1. `src/database/init.ts` - 添加数据库表定义
2. `src/router/index.ts` - 添加路由配置
3. `src/views/assessment/AssessmentSelect.vue` - 添加CSIRS卡片
4. `src/views/assessment/SelectStudent.vue` - 添加CSIRS支持
5. `src/views/StudentDetail.vue` - 添加评估入口

---

## 后续功能扩展

以下功能可在后续迭代中添加：

1. **PDF/Word报告导出** - 使用现有的报告导出工具
2. **Excel数据导出** - 使用xlsx技能导出评估数据
3. **训练推荐** - 根据评估结果推荐相关训练游戏
4. **语音文件集成** - 为每道题目添加专业配音
5. **评估进度保存** - 支持中断后继续评估
