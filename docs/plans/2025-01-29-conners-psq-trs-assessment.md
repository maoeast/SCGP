# Conners PSQ & TRS 量表评估模块实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-step.

**Goal:** 实现 Conners 父母问卷(PSQ-48题)和教师问卷(TRS-28题)的完整评估模块，包含效度检查(PI/NI)、漏填处理、性别区分的常模计算和专业反馈报告。

**架构:** 复用现有 S-M 量表的评估模式，创建独立的数据库表和题目数据。评分逻辑区分性别(男/女)和年龄段(3-5/6-8/9-11/12-14/15-17岁)，使用 Z 分数转 T 分数公式。效度检查使用切分点规则(PI>2.5可疑，NI>2.2可疑)，采用警示而非阻断机制。

**Tech Stack:** Vue 3 + TypeScript + Element Plus + SQL.js + Vite

---

## Task 1: 创建数据库表结构

**Files:**
- Modify: `src/database/init.ts`

**Step 1: 在 init.ts 中添加 Conners PSQ 表创建语句**

在 `init.ts` 的表创建部分添加：

```typescript
// Conners PSQ 表 (父母问卷 48题)
db.run(`
  CREATE TABLE IF NOT EXISTS conners_psq_assess (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    gender TEXT NOT NULL,
    age_months INTEGER NOT NULL,
    raw_scores TEXT NOT NULL,
    dimension_scores TEXT NOT NULL,
    t_scores TEXT NOT NULL,
    pi_score REAL,
    ni_score REAL,
    is_valid INTEGER DEFAULT 1,
    invalid_reason TEXT,
    hyperactivity_index REAL,
    level TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  )
`)
```

**Step 2: 添加 Conners TRS 表创建语句**

```typescript
// Conners TRS 表 (教师问卷 28题)
db.run(`
  CREATE TABLE IF NOT EXISTS conners_trs_assess (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    gender TEXT NOT NULL,
    age_months INTEGER NOT NULL,
    raw_scores TEXT NOT NULL,
    dimension_scores TEXT NOT NULL,
    t_scores TEXT NOT NULL,
    pi_score REAL,
    ni_score REAL,
    is_valid INTEGER DEFAULT 1,
    invalid_reason TEXT,
    hyperactivity_index REAL,
    level TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  )
`)
```

**Step 3: 提交**

```bash
git add src/database/init.ts
git commit -m "feat: add Conners PSQ/TRS database tables"
```

---

## Task 2: 创建 PSQ 题目数据文件

**Files:**
- Create: `src/database/connors-psq-questions.ts`

**Step 1: 创建题目类型定义和数据**

```typescript
export interface ConnersPSQQuestion {
  id: number
  content: string
  dimension: 'conduct' | 'learning' | 'impulsivity' | 'anxiety' | 'hyperactivity_index'
  validityType?: 'PI' | 'NI' | null
}

export const connorsPSQQuestions: ConnersPSQQuestion[] = [
  // 题目 1-48
  { id: 1, content: "扭动身体", dimension: "hyperactivity_index" },
  { id: 2, content: "在不能安静坐着的场合（如上课、用餐等），不能安静地坐着", dimension: "conduct" },
  { id: 3, content: "容易分心或注意力不集中", dimension: "hyperactivity_index" },
  { id: 4, content: "在应该安静的场合(如上课、做作业时)，离开座位", dimension: "hyperactivity_index" },
  { id: 5, content: "在坐立不安或过度活跃", dimension: "hyperactivity_index" },
  { id: 6, content: "容易兴奋或冲动", dimension: "hyperactivity_index" },
  { id: 7, content: "容易被打扰", dimension: "hyperactivity_index" },
  { id: 8, content: "容易发怒或脾气爆发", dimension: "impulsivity", validityType: "NI" },
  { id: 9, content: "哭泣", dimension: "anxiety" },
  { id: 10, content: "情绪波动大，喜怒无常", dimension: "anxiety" },
  { id: 11, content: "打架", dimension: "conduct" },
  { id: 12, content: "发脾气", dimension: "anxiety", validityType: "NI" },
  { id: 13, content: "情绪在高兴和悲伤间快速切换", dimension: "impulsivity" },
  { id: 14, content: "好争吵", dimension: "conduct", validityType: "NI" },
  { id: 15, content: "表现出孤独、孤僻的行为", dimension: "anxiety" },
  { id: 16, content: "重复性的、持续性的抽动或抽搐(如眨眼、面部扭曲)", dimension: "impulsivity" },
  { id: 17, content: "害怕新环境、新事物或陌生人", dimension: "anxiety" },
  { id: 18, content: "容易害怕或紧张", dimension: "anxiety" },
  { id: 19, content: "容易慌乱或手足无措", dimension: "anxiety" },
  { id: 20, content: "持续性的、持续的抽动或抽搐", dimension: "impulsivity" },
  { id: 21, content: "破坏东西", dimension: "conduct" },
  { id: 22, content: "表现出自我伤害的行为", dimension: "conduct" },
  { id: 23, content: "看起来不开心、抑郁或悲伤", dimension: "anxiety" },
  { id: 24, content: "难以集中注意力", dimension: "learning" },
  { id: 25, content: "厌学或不喜欢上学", dimension: "learning" },
  { id: 26, content: "被认为不是好学生", dimension: "learning" },
  { id: 27, content: "害怕在公共场合说话或表现", dimension: "anxiety" },
  { id: 28, content: "紧张或焦躁", dimension: "anxiety" },
  { id: 29, content: "对新环境或新事物的适应慢", dimension: "anxiety" },
  { id: 30, content: "表现出强迫性的行为或想法", dimension: "anxiety" },
  { id: 31, content: "表现出恐惧或害怕", dimension: "anxiety" },
  { id: 32, content: "情绪变化快速和剧烈", dimension: "impulsivity", validityType: "NI" },
  { id: 33, content: "受到惊吓时容易哭泣", dimension: "anxiety" },
  { id: 34, content: "受到挫折时容易哭泣", dimension: "anxiety" },
  { id: 35, content: "与兄弟姐妹相处得好", dimension: "conduct", validityType: "PI" },
  { id: 36, content: "努力做好事", dimension: "conduct", validityType: "PI" },
  { id: 37, content: "嫉妒心强", dimension: "conduct" },
  { id: 38, content: "在安静的时候显得不开心", dimension: "anxiety" },
  { id: 39, content: "表现得不成熟，行为像个更小的孩子", dimension: "conduct", validityType: "NI" },
  { id: 40, content: "受欢迎", dimension: "conduct", validityType: "PI" },
  { id: 41, content: "与其他儿童相处好", dimension: "conduct", validityType: "PI" },
  { id: 42, content: "有某些特别的、固定的恐惧对象或事物", dimension: "anxiety" },
  { id: 43, content: "挑食", dimension: "anxiety" },
  { id: 44, content: "有睡眠问题(如入睡困难、夜惊)", dimension: "anxiety" },
  { id: 45, content: "有头疼或胃疼的抱怨", dimension: "anxiety" },
  { id: 46, content: "有恶心或反胃的抱怨", dimension: "anxiety" },
  { id: 47, content: "有呕吐的抱怨", dimension: "anxiety" },
  { id: 48, content: "在家庭圈子里有被欺骗的感觉", dimension: "anxiety" },
]

// PI 题目列表
export const PSQ_PI_QUESTIONS = [35, 36, 40, 41]

// NI 题目列表
export const PSQ_NI_QUESTIONS = [8, 14, 32, 39]

// 维度题目映射
export const PSQ_DIMENSION_QUESTIONS = {
  conduct: [2, 11, 14, 21, 22, 35, 36, 37, 39, 40, 41],
  learning: [24, 25, 26],
  impulsivity: [13, 16, 20, 32],
  anxiety: [9, 10, 12, 15, 17, 18, 19, 23, 27, 28, 29, 30, 31, 33, 34, 38, 42, 43, 44, 45, 46, 47, 48],
  hyperactivity_index: [1, 3, 4, 5, 6, 7]
}
```

**Step 2: 提交**

```bash
git add src/database/connors-psq-questions.ts
git commit -m "feat: add Conners PSQ questions data (48 questions)"
```

---

## Task 3: 创建 TRS 题目数据文件

**Files:**
- Create: `src/database/connors-trs-questions.ts`

**Step 1: 创建题目数据**

```typescript
export interface ConnersTRSQuestion {
  id: number
  content: string
  dimension: 'conduct' | 'hyperactivity' | 'inattention' | 'hyperactivity_index'
  validityType?: 'PI' | 'NI' | null
}

export const connorsTRSQuestions: ConnersTRSQuestion[] = [
  { id: 1, content: "扭动不停", dimension: "hyperactivity", validityType: "PI" },
  { id: 2, content: "在不适当的场合跑来跑去或爬上爬下", dimension: "hyperactivity" },
  { id: 3, content: "容易发怒", dimension: "hyperactivity", validityType: "NI" },
  { id: 4, content: "难以静坐，过度活跃", dimension: "hyperactivity" },
  { id: 5, content: "容易兴奋或冲动", dimension: "conduct", validityType: "PI" },
  { id: 6, content: "容易被打扰", dimension: "inattention", validityType: "PI" },
  { id: 7, content: "在应该安静的场合离开座位", dimension: "hyperactivity", validityType: "PI" },
  { id: 8, content: "期待轮流或等待有困难", dimension: "inattention", validityType: "PI" },
  { id: 9, content: "注意力不集中", dimension: "inattention" },
  { id: 10, content: "坐立不安", dimension: "conduct", validityType: "PI" },
  { id: 11, content: "发脾气", dimension: "conduct", validityType: "NI" },
  { id: 12, content: "跟随指示有困难", dimension: "inattention" },
  { id: 13, content: "难以维持持续的注意力", dimension: "inattention" },
  { id: 14, content: "坐立不安或过度活跃", dimension: "hyperactivity", validityType: "PI" },
  { id: 15, content: "情绪变化快速", dimension: "conduct", validityType: "NI" },
  { id: 16, content: "好争吵", dimension: "conduct" },
  { id: 17, content: "破坏东西", dimension: "conduct" },
  { id: 18, content: "表现得孤僻", dimension: "inattention" },
  { id: 19, content: "行为霸道或专横", dimension: "conduct" },
  { id: 20, content: "情绪在高兴和悲伤间快速切换", dimension: "conduct" },
  { id: 21, content: "拒绝承担错误", dimension: "conduct" },
  { id: 22, content: "缺乏领导力", dimension: "conduct" },
  { id: 23, content: "不与同伴一起玩", dimension: "conduct" },
  { id: 24, content: "不与同伴一起学习", dimension: "inattention" },
  { id: 25, content: "与其他儿童相处好", dimension: "conduct", validityType: "PI" },
  { id: 26, content: "努力学习，有进步", dimension: "inattention", validityType: "PI" },
  { id: 27, content: "易于领导", dimension: "conduct", validityType: "PI" },
  { id: 28, content: "努力完成作业", dimension: "inattention", validityType: "PI" },
]

// PI 题目列表
export const TRS_PI_QUESTIONS = [1, 5, 6, 7, 8, 10, 14, 25, 26, 27, 28]

// NI 题目列表
export const TRS_NI_QUESTIONS = [3, 11, 15]

// 维度题目映射
export const TRS_DIMENSION_QUESTIONS = {
  conduct: [5, 10, 11, 16, 17, 19, 20, 21, 22, 23],
  hyperactivity: [2, 4, 14],
  inattention: [6, 8, 9, 12, 13, 18, 24, 26, 28],
  hyperactivity_index: [1, 7]
}
```

**Step 2: 提交**

```bash
git add src/database/connors-trs-questions.ts
git commit -m "feat: add Conners TRS questions data (28 questions)"
```

---

## Task 4: 创建常模数据和评分函数

**Files:**
- Create: `src/database/connors-norms.ts`

**Step 1: 创建常模数据结构**

```typescript
// 年龄段分组
export type AgeGroup = '3-5' | '6-8' | '9-11' | '12-14' | '15-17'
export type Gender = 'male' | 'female'

// 维度常模数据
export interface DimensionNorm {
  mean: number
  sd: number
}

// PSQ 常模数据 (基于文档中的数据)
export const connorsPSQNorms: Record<Gender, Record<AgeGroup, Record<string, DimensionNorm>>> = {
  male: {
    '3-5': {
      conduct: { mean: 0.53, sd: 0.39 },
      learning: { mean: 0.50, sd: 0.33 },
      impulsivity: { mean: 0.07, sd: 0.15 },
      anxiety: { mean: 1.01, sd: 0.65 },
      hyperactivity_index: { mean: 0.6, sd: 0.61 }
    },
    '6-8': {
      conduct: { mean: 0.50, sd: 0.40 },
      learning: { mean: 0.64, sd: 0.45 },
      impulsivity: { mean: 0.13, sd: 0.23 },
      anxiety: { mean: 0.93, sd: 0.60 },
      hyperactivity_index: { mean: 0.51, sd: 0.51 }
    },
    '9-11': {
      conduct: { mean: 0.53, sd: 0.38 },
      learning: { mean: 0.54, sd: 0.52 },
      impulsivity: { mean: 0.18, sd: 0.26 },
      anxiety: { mean: 0.92, sd: 0.60 },
      hyperactivity_index: { mean: 0.42, sd: 0.47 }
    },
    '12-14': {
      conduct: { mean: 0.49, sd: 0.41 },
      learning: { mean: 0.66, sd: 0.57 },
      impulsivity: { mean: 0.22, sd: 0.44 },
      anxiety: { mean: 0.82, sd: 0.54 },
      hyperactivity_index: { mean: 0.58, sd: 0.59 }
    },
    '15-17': {
      conduct: { mean: 0.47, sd: 0.44 },
      learning: { mean: 0.62, sd: 0.55 },
      impulsivity: { mean: 0.13, sd: 0.26 },
      anxiety: { mean: 0.70, sd: 0.51 },
      hyperactivity_index: { mean: 0.59, sd: 0.58 }
    }
  },
  female: {
    '3-5': {
      conduct: { mean: 0.49, sd: 0.35 },
      learning: { mean: 0.62, sd: 0.57 },
      impulsivity: { mean: 0.10, sd: 0.17 },
      anxiety: { mean: 1.15, sd: 0.77 },
      hyperactivity_index: { mean: 0.51, sd: 0.59 }
    },
    '6-8': {
      conduct: { mean: 0.41, sd: 0.28 },
      learning: { mean: 0.45, sd: 0.38 },
      impulsivity: { mean: 0.19, sd: 0.27 },
      anxiety: { mean: 0.95, sd: 0.59 },
      hyperactivity_index: { mean: 0.57, sd: 0.66 }
    },
    '9-11': {
      conduct: { mean: 0.40, sd: 0.36 },
      learning: { mean: 0.43, sd: 0.38 },
      impulsivity: { mean: 0.17, sd: 0.28 },
      anxiety: { mean: 0.80, sd: 0.59 },
      hyperactivity_index: { mean: 0.49, sd: 0.57 }
    },
    '12-14': {
      conduct: { mean: 0.39, sd: 0.40 },
      learning: { mean: 0.44, sd: 0.45 },
      impulsivity: { mean: 0.23, sd: 0.28 },
      anxiety: { mean: 0.72, sd: 0.55 },
      hyperactivity_index: { mean: 0.54, sd: 0.53 }
    },
    '15-17': {
      conduct: { mean: 0.37, sd: 0.33 },
      learning: { mean: 0.35, sd: 0.38 },
      impulsivity: { mean: 0.19, sd: 0.25 },
      anxiety: { mean: 0.60, sd: 0.55 },
      hyperactivity_index: { mean: 0.51, sd: 0.53 }
    }
  }
}

// TRS 常模数据
export const connorsTRSNorms: Record<Gender, Record<AgeGroup, Record<string, DimensionNorm>>> = {
  male: {
    '3-5': {
      conduct: { mean: 0.45, sd: 0.80 },
      hyperactivity: { mean: 0.79, sd: 0.89 },
      inattention: { mean: 0.92, sd: 1.00 },
      hyperactivity_index: { mean: 0.81, sd: 0.96 }
    },
    '6-8': {
      conduct: { mean: 0.32, sd: 0.43 },
      hyperactivity: { mean: 0.60, sd: 0.65 },
      inattention: { mean: 0.76, sd: 0.74 },
      hyperactivity_index: { mean: 0.58, sd: 0.61 }
    },
    '9-11': {
      conduct: { mean: 0.50, sd: 0.66 },
      hyperactivity: { mean: 0.70, sd: 0.78 },
      inattention: { mean: 0.85, sd: 0.73 },
      hyperactivity_index: { mean: 0.67, sd: 0.65 }
    },
    '12-14': {
      conduct: { mean: 0.23, sd: 0.38 },
      hyperactivity: { mean: 0.41, sd: 0.49 },
      inattention: { mean: 0.71, sd: 0.63 },
      hyperactivity_index: { mean: 0.44, sd: 0.43 }
    },
    '15-17': {
      conduct: { mean: 0.22, sd: 0.37 },
      hyperactivity: { mean: 0.34, sd: 0.44 },
      inattention: { mean: 0.68, sd: 0.67 },
      hyperactivity_index: { mean: 0.41, sd: 0.45 }
    }
  },
  female: {
    '3-5': {
      conduct: { mean: 0.53, sd: 0.68 },
      hyperactivity: { mean: 0.69, sd: 0.56 },
      inattention: { mean: 0.72, sd: 0.71 },
      hyperactivity_index: { mean: 0.74, sd: 0.67 }
    },
    '6-8': {
      conduct: { mean: 0.28, sd: 0.37 },
      hyperactivity: { mean: 0.28, sd: 0.38 },
      inattention: { mean: 0.47, sd: 0.64 },
      hyperactivity_index: { mean: 0.36, sd: 0.45 }
    },
    '9-11': {
      conduct: { mean: 0.28, sd: 0.49 },
      hyperactivity: { mean: 0.38, sd: 0.51 },
      inattention: { mean: 0.49, sd: 0.53 },
      hyperactivity_index: { mean: 0.38, sd: 0.48 }
    },
    '12-14': {
      conduct: { mean: 0.15, sd: 0.23 },
      hyperactivity: { mean: 0.19, sd: 0.27 },
      inattention: { mean: 0.32, sd: 0.42 },
      hyperactivity_index: { mean: 0.18, sd: 0.24 }
    },
    '15-17': {
      conduct: { mean: 0.33, sd: 0.68 },
      hyperactivity: { mean: 0.32, sd: 0.63 },
      inattention: { mean: 0.45, sd: 0.47 },
      hyperactivity_index: { mean: 0.36, sd: 0.62 }
    }
  }
}
```

**Step 2: 添加评分计算函数**

```typescript
/**
 * 根据月龄获取年龄段
 */
export function getAgeGroup(ageMonths: number): AgeGroup {
  const age = Math.floor(ageMonths / 12)
  if (age >= 3 && age <= 5) return '3-5'
  if (age >= 6 && age <= 8) return '6-8'
  if (age >= 9 && age <= 11) return '9-11'
  if (age >= 12 && age <= 14) return '12-14'
  return '15-17'
}

/**
 * 计算 Conners T 分数
 * Z 分数 = (原始分 - 均值) / 标准差
 * T 分数 = 50 + 10 × Z 分数
 */
export function calculateConnersTScore(
  rawScore: number,
  gender: Gender,
  ageMonths: number,
  dimension: string,
  scaleType: 'psq' | 'trs'
): number {
  const norms = scaleType === 'psq' ? connorsPSQNorms : connorsTRSNorms
  const ageGroup = getAgeGroup(ageMonths)

  const normData = norms[gender][ageGroup][dimension]
  if (!normData) {
    console.warn(`No norm data for ${gender} ${ageGroup} ${dimension}`)
    return 50
  }

  // Z 分数
  const zScore = (rawScore - normData.mean) / normData.sd

  // T 分数
  const tScore = 50 + 10 * zScore

  return Math.round(tScore * 10) / 10  // 保留一位小数
}

/**
 * 计算评定等级
 */
export function determineConnersLevel(tScores: Record<string, number>): string {
  // 使用多动指数或最高T分
  const scores = Object.values(tScores)
  const maxScore = Math.max(...scores)

  if (maxScore < 60) return 'normal'
  if (maxScore < 70) return 'borderline'
  return 'clinical'
}
```

**Step 3: 提交**

```bash
git add src/database/connors-norms.ts
git commit -m "feat: add Conners norm data and scoring functions"
```

---

## Task 5: 创建效度检查和评分逻辑

**Files:**
- Create: `src/database/connors-scoring.ts`

**Step 1: 创建漏填处理和维度计算函数**

```typescript
import {
  PSQ_DIMENSION_QUESTIONS,
  PSQ_PI_QUESTIONS,
  PSQ_NI_QUESTIONS,
  TRS_DIMENSION_QUESTIONS,
  TRS_PI_QUESTIONS,
  TRS_NI_QUESTIONS
} from './connors-psq-questions'
import { calculateConnersTScore, getAgeGroup } from './connors-norms'

const MISSING_TOLERANCE = 0.1  // 10% 漏填容忍度

interface DimensionScoreResult {
  rawScore: number
  isAdjusted: boolean
  isValid: boolean
  missingCount: number
}

/**
 * 安全除法函数
 */
const safeDiv = (num: number, den: number): number => {
  if (den === 0 || isNaN(den) || !isFinite(den)) return 0
  if (isNaN(num) || !isFinite(num)) return 0
  return num / den
}

/**
 * 计算平均分，带防御性检查
 */
const calcAvg = (qids: number[], answers: Record<number, number | null>): number => {
  const validScores = qids
    .map(id => answers[id])
    .filter((s): s is number => s !== null && s !== undefined && !isNaN(s))

  if (validScores.length === 0 || qids.length === 0) return 0

  const sum = validScores.reduce((a, b) => a + b, 0)
  return safeDiv(sum, validScores.length)
}

/**
 * 处理单个维度的漏填
 */
function processDimensionWithMissing(
  answers: Record<number, number | null>,
  questionIds: number[]
): DimensionScoreResult {
  const totalQuestions = questionIds.length
  const answeredScores: number[] = []
  let missingCount = 0

  for (const qid of questionIds) {
    const score = answers[qid]
    if (score === null || score === undefined) {
      missingCount++
    } else {
      answeredScores.push(score)
    }
  }

  const missingRatio = missingCount / totalQuestions

  // 漏填过多
  if (missingRatio > MISSING_TOLERANCE) {
    return {
      rawScore: 0,
      isAdjusted: false,
      isValid: false,
      missingCount
    }
  }

  // 漏填在容忍范围内，用平均分填补
  if (missingCount > 0) {
    const actualSum = answeredScores.reduce((a, b) => a + b, 0)
    const actualCount = answeredScores.length
    const avgScore = actualSum / actualCount
    const adjustedScore = (actualSum * totalQuestions) / actualCount

    return {
      rawScore: Math.round(adjustedScore * 100) / 100,
      isAdjusted: true,
      isValid: true,
      missingCount
    }
  }

  // 无漏填
  return {
    rawScore: answeredScores.reduce((a, b) => a + b, 0),
    isAdjusted: false,
    isValid: true,
    missingCount: 0
  }
}

/**
 * 计算各维度分数
 */
export function calculateDimensionScores(
  answers: Record<number, number | null>,
  scaleType: 'psq' | 'trs'
): Record<string, DimensionScoreResult> {
  const dimensionQuestions = scaleType === 'psq' ? PSQ_DIMENSION_QUESTIONS : TRS_DIMENSION_QUESTIONS
  const results: Record<string, DimensionScoreResult> = {}

  for (const [dim, questionIds] of Object.entries(dimensionQuestions)) {
    results[dim] = processDimensionWithMissing(answers, questionIds)
  }

  return results
}
```

**Step 2: 添加效度检查函数**

```typescript
interface ValidityCheckResult {
  isValid: boolean
  piScore: number
  piThreshold: number
  piStatus: 'pass' | 'warning'
  niScore: number
  niThreshold: number
  niStatus: 'pass' | 'warning'
  invalidReason?: string
}

/**
 * 效度检查 (PI/NI)
 */
export function checkConnersValidity(
  answers: Record<number, number | null>,
  scaleType: 'psq' | 'trs'
): ValidityCheckResult {
  const piQuestions = scaleType === 'psq' ? PSQ_PI_QUESTIONS : TRS_PI_QUESTIONS
  const niQuestions = scaleType === 'psq' ? PSQ_NI_QUESTIONS : TRS_NI_QUESTIONS

  const piScore = calcAvg(piQuestions, answers)
  const niScore = calcAvg(niQuestions, answers)

  // 切分点
  const piThreshold = 2.5
  const niThreshold = 2.2

  // 判定状态 (分数高才可疑)
  const piStatus = piScore > piThreshold ? 'warning' : 'pass'
  const niStatus = niScore > niThreshold ? 'warning' : 'pass'

  const notices: string[] = []

  if (piStatus === 'warning') {
    notices.push(`正向指标得分显著偏高(PI=${piScore.toFixed(2)})，建议结合访谈核实`)
  }

  if (niStatus === 'warning') {
    notices.push(`负向指标得分显著偏高(NI=${niScore.toFixed(2)})，需立即关注或核实`)
  }

  return {
    isValid: notices.length === 0,
    piScore: Number(piScore.toFixed(2)),
    piThreshold,
    piStatus,
    niScore: Number(niScore.toFixed(2)),
    niThreshold,
    niStatus,
    invalidReason: notices.join('; ')
  }
}
```

**Step 3: 添加完整评分流程**

```typescript
interface ConnersScoreResult {
  dimensionScores: Record<string, DimensionScoreResult>
  tScores: Record<string, number>
  validity: ValidityCheckResult
  level: string
}

/**
 * 完整评分流程
 */
export async function calculateConnersScores(
  answers: Record<number, number | null>,
  student: { gender: string; birthday: string },
  scaleType: 'psq' | 'trs'
): Promise<ConnersScoreResult> {
  // 1. 漏填处理 & 维度分数计算
  const dimensionScores = calculateDimensionScores(answers, scaleType)

  // 2. 效度检查
  const validity = checkConnersValidity(answers, scaleType)

  // 3. 始终计算T分 (不阻断)
  const tScores: Record<string, number> = {}
  const ageMonths = getAgeInMonths(student.birthday)
  const gender: Gender = student.gender === '男' ? 'male' : 'female'

  for (const [dim, result] of Object.entries(dimensionScores)) {
    if (result.isValid) {
      tScores[dim] = calculateConnersTScore(
        result.rawScore,
        gender,
        ageMonths,
        dim,
        scaleType
      )
    }
  }

  // 4. 评定等级
  const level = determineConnersLevel(tScores)

  return {
    dimensionScores,
    tScores,
    validity,
    level
  }
}

/**
 * 计算月龄
 */
function getAgeInMonths(birthday: string): number {
  const birth = new Date(birthday)
  const today = new Date()

  let months = (today.getFullYear() - birth.getFullYear()) * 12
  months += today.getMonth() - birth.getMonth()

  if (today.getDate() < birth.getDate()) {
    months--
  }

  return Math.max(0, months)
}
```

**Step 4: 提交**

```bash
git add src/database/connors-scoring.ts
git commit -m "feat: add Conners scoring logic with validity check and missing value handling"
```

---

## Task 6: 添加数据库 API

**Files:**
- Modify: `src/database/api.ts`

**Step 1: 在 api.ts 中添加 Conners API 类**

在现有 API 类之后添加：

```typescript
/**
 * Conners PSQ 数据库 API
 */
export class ConnersPSQAPI {
  private db: Database

  constructor() {
    this.db = getDatabase()
  }

  /**
   * 创建评估记录
   */
  createAssessment(data: {
    student_id: number
    gender: string
    age_months: number
    raw_scores: string
    dimension_scores: string
    t_scores: string
    pi_score: number
    ni_score: number
    is_valid: number
    invalid_reason?: string
    hyperactivity_index: number
    level: string
    start_time: string
    end_time: string
  }): number {
    this.db.run(`
      INSERT INTO conners_psq_assess (
        student_id, gender, age_months, raw_scores, dimension_scores, t_scores,
        pi_score, ni_score, is_valid, invalid_reason, hyperactivity_index, level,
        start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.gender,
      data.age_months,
      data.raw_scores,
      data.dimension_scores,
      data.t_scores,
      data.pi_score,
      data.ni_score,
      data.is_valid,
      data.invalid_reason || null,
      data.hyperactivity_index,
      data.level,
      data.start_time,
      data.end_time
    ])

    const result = this.db.run('SELECT last_insert_rowid() as id')
    return result[0].id
  }

  /**
   * 获取评估记录
   */
  getAssessment(id: number) {
    const result = this.db.run(`
      SELECT * FROM conners_psq_assess WHERE id = ?
    `, [id])
    return result[0]
  }

  /**
   * 获取学生的所有评估记录
   */
  getStudentAssessments(studentId: number) {
    return this.db.run(`
      SELECT * FROM conners_psq_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}

/**
 * Conners TRS 数据库 API
 */
export class ConnersTRSAPI {
  private db: Database

  constructor() {
    this.db = getDatabase()
  }

  createAssessment(data: {
    student_id: number
    gender: string
    age_months: number
    raw_scores: string
    dimension_scores: string
    t_scores: string
    pi_score: number
    ni_score: number
    is_valid: number
    invalid_reason?: string
    hyperactivity_index: number
    level: string
    start_time: string
    end_time: string
  }): number {
    this.db.run(`
      INSERT INTO conners_trs_assess (
        student_id, gender, age_months, raw_scores, dimension_scores, t_scores,
        pi_score, ni_score, is_valid, invalid_reason, hyperactivity_index, level,
        start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.student_id,
      data.gender,
      data.age_months,
      data.raw_scores,
      data.dimension_scores,
      data.t_scores,
      data.pi_score,
      data.ni_score,
      data.is_valid,
      data.invalid_reason || null,
      data.hyperactivity_index,
      data.level,
      data.start_time,
      data.end_time
    ])

    const result = this.db.run('SELECT last_insert_rowid() as id')
    return result[0].id
  }

  getAssessment(id: number) {
    const result = this.db.run(`
      SELECT * FROM conners_trs_assess WHERE id = ?
    `, [id])
    return result[0]
  }

  getStudentAssessments(studentId: number) {
    return this.db.run(`
      SELECT * FROM conners_trs_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}
```

**Step 2: 提交**

```bash
git add src/database/api.ts
git commit -m "feat: add Conners PSQ/TRS database API"
```

---

## Task 7: 更新反馈配置

**Files:**
- Modify: `src/config/feedbackConfig.js`

**Step 1: 在 ASSESSMENT_LIBRARY 中添加 Conners 配置**

在现有配置之后添加完整的 Conners 配置（见前面设计的完整配置，包含总分规则、维度建议、总结展望、专家寄语等）

```javascript
// 在 ASSESSMENT_LIBRARY 中添加:
"conners": {
  name: "Conners 儿童行为问卷",
  // ... 完整配置内容见前面设计
}
```

**Step 2: 提交**

```bash
git add src/config/feedbackConfig.js
git commit -m "feat: add Conners feedback configuration with professional suggestions"
```

---

## Task 8: 创建 PSQ 评估页面

**Files:**
- Create: `src/views/assessment/conners-psq/Assessment.vue`

**Step 1: 创建评估页面组件**

```vue
<template>
  <div class="conners-assessment">
    <!-- 温馨提示对话框 -->
    <el-dialog v-model="showWelcomeDialog" title="填写说明" width="500px" :close-on-click-modal="false" :show-close="false">
      <div class="welcome-content">
        <div class="welcome-section">
          <h4>📋 问卷说明</h4>
          <p>本问卷共48题，用于评估3-17岁儿童的行为表现。请根据孩子<strong>最近6个月</strong>的情况回答。</p>
        </div>
        <div class="welcome-section">
          <h4>⏱️ 评分标准</h4>
          <ul class="scale-legend">
            <li><strong>A. 无</strong> - 完全没有此行为</li>
            <li><strong>B. 稍有</strong> - 偶尔出现，轻微</li>
            <li><strong>C. 相当多</strong> - 经常出现，明显</li>
            <li><strong>D. 很多</strong> - 频繁出现，严重</li>
          </ul>
        </div>
        <div class="welcome-section">
          <h4>💡 填写建议</h4>
          <p>• 请独立完成，不要与他人讨论</p>
          <p>• 如不确定，请凭第一印象选择</p>
          <p>• 允许漏填1-2题，系统会自动处理</p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="startAssessment">我已了解，开始填写</el-button>
      </template>
    </el-dialog>

    <!-- 评估头部 -->
    <el-card class="assessment-header">
      <div class="header-content">
        <div class="student-info">
          <h3>Conners 父母问卷 (PSQ)</h3>
          <div class="info-row">
            <span>学生：{{ student?.name }}</span>
            <span>性别：{{ student?.gender }}</span>
            <span>年龄：{{ studentAge }}岁</span>
          </div>
        </div>
        <div class="progress-info">
          <el-progress :percentage="progressPercentage" />
          <div class="progress-text">已完成：{{ currentIndex + 1 }} / {{ totalQuestions }}</div>
        </div>
      </div>
    </el-card>

    <!-- 题目卡片 -->
    <el-card class="question-card" v-if="currentQuestion">
      <template #header>
        <div class="question-header">
          <span class="question-number">第 {{ currentIndex + 1 }} 题</span>
          <el-tag size="small">{{ getDimensionName(currentQuestion.dimension) }}</el-tag>
        </div>
      </template>

      <div class="question-content">
        <div class="question-title">{{ currentQuestion.content }}</div>

        <div class="answer-options">
          <el-radio-group v-model="currentAnswer" @change="handleAnswer">
            <el-radio :label="0" size="large">
              <span class="option-label">A. 无</span>
            </el-radio>
            <el-radio :label="1" size="large">
              <span class="option-label">B. 稍有</span>
            </el-radio>
            <el-radio :label="2" size="large">
              <span class="option-label">C. 相当多</span>
            </el-radio>
            <el-radio :label="3" size="large">
              <span class="option-label">D. 很多</span>
            </el-radio>
          </el-radio-group>
        </div>

        <div class="skip-option">
          <el-button text @click="skipQuestion">
            <el-icon><QuestionFilled /></el-icon>
            不确定/跳过此题
          </el-button>
        </div>
      </div>

      <div class="question-footer">
        <el-button :disabled="currentIndex === 0" @click="previousQuestion">上一题</el-button>
      </div>
    </el-card>

    <!-- 完成对话框 -->
    <el-dialog v-model="showCompleteDialog" title="问卷填写完成" width="400px">
      <div class="complete-content">
        <el-icon class="success-icon" color="#67C23A" size="60"><CircleCheck /></el-icon>
        <h3>感谢您的填写！</h3>
        <p>系统正在计算评估结果...</p>
      </div>
      <template #footer>
        <el-button @click="saveAndExit">保存并退出</el-button>
        <el-button type="primary" @click="viewReport">查看报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheck, QuestionFilled } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { connorsPSQQuestions } from '@/database/connors-psq-questions'
import { calculateConnersScores } from '@/database/connors-scoring'
import { ConnersPSQAPI } from '@/database/api'

const router = useRouter()
const route = useRoute()
const studentStore = useStudentStore()

const showWelcomeDialog = ref(true)
const showCompleteDialog = ref(false)
const currentIndex = ref(0)
const answers = ref<Record<number, number | null>>({})
const currentAnswer = ref<number | null>(null)
const startTime = ref(new Date().toISOString())

const studentId = ref(route.query.studentId as string)
const student = computed(() => studentStore.students.find(s => s.id === parseInt(studentId.value)))

const studentAge = computed(() => {
  if (!student.value?.birthday) return 0
  const birth = new Date(student.value.birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
})

const totalQuestions = computed(() => connorsPSQQuestions.length)
const currentQuestion = computed(() => connorsPSQQuestions[currentIndex.value])
const progressPercentage = computed(() =>
  Math.round(((currentIndex.value + 1) / totalQuestions.value) * 100)
)

const getDimensionName = (dim: string) => {
  const map: Record<string, string> = {
    conduct: '品行问题',
    learning: '学习问题',
    impulsivity: '冲动-多动',
    anxiety: '焦虑',
    hyperactivity_index: '多动指数'
  }
  return map[dim] || dim
}

const handleAnswer = (value: number) => {
  answers.value[currentQuestion.value.id] = value
  setTimeout(() => nextQuestion(), 200)
}

const skipQuestion = () => {
  answers.value[currentQuestion.value.id] = null
  setTimeout(() => nextQuestion(), 200)
}

const nextQuestion = () => {
  if (currentIndex.value < totalQuestions.value - 1) {
    currentIndex.value++
    currentAnswer.value = null
  } else {
    completeAssessment()
  }
}

const previousQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    currentAnswer.value = null
  }
}

const startAssessment = () => {
  showWelcomeDialog.value = false
}

const completeAssessment = async () => {
  try {
    const result = await calculateConnersScores(
      answers.value,
      { gender: student.value.gender, birthday: student.value.birthday },
      'psq'
    )

    const api = new ConnersPSQAPI()
    const assessId = api.createAssessment({
      student_id: parseInt(studentId.value),
      gender: student.value.gender,
      age_months: studentAge.value * 12,
      raw_scores: JSON.stringify(answers.value),
      dimension_scores: JSON.stringify(result.dimensionScores),
      t_scores: JSON.stringify(result.tScores),
      pi_score: result.validity.piScore,
      ni_score: result.validity.niScore,
      is_valid: result.validity.isValid ? 1 : 0,
      invalid_reason: result.validity.invalidReason,
      hyperactivity_index: result.tScores.hyperactivity_index || 0,
      level: result.level,
      start_time: startTime.value,
      end_time: new Date().toISOString()
    })

    assessId.value = assessId.toString()
    showCompleteDialog.value = true
  } catch (error) {
    console.error('完成评估失败:', error)
    ElMessage.error('提交失败，请重试')
  }
}

const saveAndExit = () => {
  router.push('/assessment')
}

const viewReport = () => {
  router.push({
    path: '/assessment/conners-psq/report',
    query: { assessId: assessId.value, studentId: studentId.value }
  })
}

onMounted(async () => {
  await studentStore.loadStudents()
  if (!student.value) {
    ElMessage.error('学生信息不存在')
    router.push('/assessment')
  }
})
</script>

<style scoped>
.conners-assessment {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.welcome-content {
  padding: 0;
}

.welcome-section {
  margin-bottom: 15px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.welcome-section h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.scale-legend {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}

.scale-legend li {
  padding: 6px 0;
  border-bottom: 1px dashed #eee;
}

.assessment-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
}

.student-info h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.info-row {
  display: flex;
  gap: 20px;
  color: #606266;
}

.progress-info {
  flex: 1;
  max-width: 300px;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  color: #606266;
}

.question-card {
  min-height: 350px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-number {
  font-weight: bold;
  color: #303133;
}

.question-content {
  padding: 20px 0;
}

.question-title {
  font-size: 18px;
  color: #303133;
  line-height: 1.6;
  margin-bottom: 30px;
}

.answer-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.option-label {
  font-weight: 500;
  font-size: 15px;
}

.skip-option {
  margin-top: 20px;
  text-align: center;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #dcdfe6;
}

.complete-content {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  margin-bottom: 15px;
}
</style>
```

**Step 2: 提交**

```bash
git add src/views/assessment/conners-psq/Assessment.vue
git commit -m "feat: add Conners PSQ assessment page"
```

---

## Task 9: 创建 PSQ 报告页面

**Files:**
- Create: `src/views/assessment/conners-psq/Report.vue`

**Step 1: 创建报告页面组件**

```vue
<template>
  <div class="conners-report">
    <el-card class="report-header">
      <template #header>
        <div class="header-content">
          <h2>Conners 父母问卷评估报告</h2>
          <el-button type="success" :icon="Document" @click="exportWord">导出Word</el-button>
        </div>
      </template>
    </el-card>

    <div class="report-content">
      <!-- 学生基本信息 -->
      <el-card class="student-info-card">
        <template #header><h3>学生基本信息</h3></template>
        <el-row :gutter="20">
          <el-col :span="6">
            <span class="label">姓名：</span>
            <span class="value">{{ student?.name }}</span>
          </el-col>
          <el-col :span="6">
            <span class="label">性别：</span>
            <span class="value">{{ student?.gender }}</span>
          </el-col>
          <el-col :span="6">
            <span class="label">年龄：</span>
            <span class="value">{{ studentAge }}岁</span>
          </el-col>
          <el-col :span="6">
            <span class="label">评估日期：</span>
            <span class="value">{{ assessDate }}</span>
          </el-col>
        </el-row>
      </el-card>

      <!-- 问卷质量检查 -->
      <el-card class="validity-card" v-if="reportData">
        <template #header><h3>📊 问卷质量检查</h3></template>
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="validity-item" :class="reportData.pi_status">
              <div class="validity-label">正向指标 (PI)</div>
              <div class="validity-score">
                {{ reportData.pi_score }}
                <span class="threshold">/ ≤{{ reportData.pi_threshold }} 参考范围</span>
              </div>
              <el-tag :type="reportData.pi_status === 'pass' ? 'success' : 'warning'">
                {{ reportData.pi_status === 'pass' ? '在范围内' : '需留意' }}
              </el-tag>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="validity-item" :class="reportData.ni_status">
              <div class="validity-label">负向指标 (NI)</div>
              <div class="validity-score">
                {{ reportData.ni_score }}
                <span class="threshold">/ ≤{{ reportData.ni_threshold }} 参考范围</span>
              </div>
              <el-tag :type="reportData.ni_status === 'pass' ? 'success' : 'warning'">
                {{ reportData.ni_status === 'pass' ? '在范围内' : '需留意' }}
              </el-tag>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 评估结果 -->
      <el-card class="result-card">
        <template #header><h3>评估结果</h3></template>
        <div class="result-summary">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="score-item">
                <div class="score-label">多动指数T分</div>
                <div class="score-value">{{ hyperactivityTScore }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="score-item">
                <div class="score-label">评定等级</div>
                <div class="score-value level-badge" :class="getLevelClass(reportData?.level)">
                  {{ getLevelText(reportData?.level) }}
                </div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 各维度得分 -->
      <el-card class="dimensions-card">
        <template #header><h3>各维度得分情况</h3></template>
        <el-table :data="dimensionScores" style="width: 100%">
          <el-table-column prop="dimension" label="评估维度" width="150" />
          <el-table-column prop="rawScore" label="原始分" width="100" />
          <el-table-column prop="tScore" label="T分" width="100">
            <template #default="scope">
              <el-tag :type="getTScoreType(scope.row.tScore)">
                {{ scope.row.tScore }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="interpretation" label="结果解读" />
        </el-table>
      </el-card>

      <!-- 总体建议 -->
      <el-card class="suggestions-card">
        <template #header><h3>总体建议</h3></template>
        <div class="suggestions-content">
          <div class="suggestion-item">
            <p>{{ totalScoreAdvice }}</p>
          </div>
        </div>
      </el-card>

      <!-- 专家寄语 -->
      <el-card class="expert-card">
        <div class="expert-content">
          <el-icon color="#409eff" size="24"><InfoFilled /></el-icon>
          <p>{{ expertMessage }}</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, InfoFilled } from '@element-plus/icons-vue'
import { useStudentStore } from '@/stores/student'
import { ConnersPSQAPI } from '@/database/api'
import { ASSESSMENT_LIBRARY } from '@/config/feedbackConfig'
import { connorsPSQQuestions } from '@/database/connors-psq-questions'

const route = useRoute()
const router = useRouter()
const studentStore = useStudentStore()
const connorsConfig = ASSESSMENT_LIBRARY.conners

const reportData = ref<any>(null)
const assessId = ref(route.query.assessId as string)
const studentId = ref(route.query.studentId as string)

const student = computed(() => studentStore.students.find(s => s.id === parseInt(studentId.value)))
const studentAge = computed(() => {
  if (!student.value?.birthday) return 0
  const birth = new Date(student.value.birthday)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
})

const assessDate = computed(() => {
  if (!reportData.value?.end_time) return new Date().toLocaleDateString()
  return new Date(reportData.value.end_time).toLocaleDateString()
})

const hyperactivityTScore = computed(() => {
  const tScores = JSON.parse(reportData.value?.t_scores || '{}')
  return tScores.hyperactivity_index?.toFixed(1) || 'N/A'
})

const dimensionScores = computed(() => {
  if (!reportData.value) return []

  const rawScores = JSON.parse(reportData.value.raw_scores || '{}')
  const tScores = JSON.parse(reportData.value.t_scores || '{}')

  const dimensionMap: Record<string, string> = {
    conduct: '品行问题',
    learning: '学习问题',
    impulsivity: '冲动-多动',
    anxiety: '焦虑',
    hyperactivity_index: '多动指数'
  }

  return Object.keys(dimensionMap).map(dim => {
    const tScore = tScores[dim] || 50
    return {
      dimension: dimensionMap[dim],
      rawScore: rawScores[dim] || 0,
      tScore: tScore,
      interpretation: getInterpretation(tScore)
    }
  })
})

const getInterpretation = (tScore: number) => {
  if (tScore < 60) return '正常范围'
  if (tScore < 70) return '需关注'
  return '需专业支持'
}

const getTScoreType = (tScore: number) => {
  if (tScore < 60) return 'success'
  if (tScore < 70) return 'warning'
  return 'danger'
}

const getLevelText = (level: string) => {
  const map: Record<string, string> = {
    'normal': '正常范围',
    'borderline': '部分维度需关注',
    'clinical': '需专业支持'
  }
  return map[level] || level
}

const getLevelClass = (level: string) => {
  const map: Record<string, string> = {
    'normal': 'level-normal',
    'borderline': 'level-warning',
    'clinical': 'level-danger'
  }
  return map[level] || ''
}

const totalScoreAdvice = computed(() => {
  if (!reportData.value) return ''
  const tScore = parseFloat(hyperactivityTScore.value)
  const rule = connorsConfig.total_score_rules.find(r => {
    const [min, max] = r.range
    return tScore >= min && tScore <= max
  })
  if (!rule) return ''
  return replacePlaceholders(rule.content)
})

const expertMessage = computed(() => {
  return replacePlaceholders(connorsConfig.expert_message)
})

const replacePlaceholders = (text: string): string => {
  if (!text) return ''
  return text.replace(/\[儿童姓名\]/g, student.value?.name || '该儿童')
}

const exportWord = async () => {
  // TODO: 实现 Word 导出
}

onMounted(async () => {
  await studentStore.loadStudents()
  if (!student.value) {
    router.push('/assessment')
    return
  }

  const api = new ConnersPSQAPI()
  const assessment = api.getAssessment(parseInt(assessId.value))
  if (!assessment) {
    router.push('/assessment')
    return
  }
  reportData.value = assessment
})
</script>

<style scoped>
.conners-report {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.report-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  color: #303133;
}

.report-content {
  max-width: 1000px;
  margin: 0 auto;
}

.student-info-card,
.validity-card,
.result-card,
.dimensions-card,
.suggestions-card,
.expert-card {
  margin-bottom: 20px;
}

.student-info-card h3,
.validity-card h3,
.result-card h3,
.dimensions-card h3,
.suggestions-card h3 {
  margin: 0;
  color: #303133;
}

.label {
  font-weight: bold;
  color: #606266;
  margin-right: 8px;
}

.value {
  color: #303133;
}

.validity-item {
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
}

.validity-item.pass {
  background: #f5f7fa;
  border-color: #c0ccda;
}

.validity-item.warning {
  background: #fef9e7;
  border-color: #f7ba2a;
}

.validity-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.validity-score {
  font-size: 28px;
  font-weight: 600;
  margin: 12px 0;
  color: #303133;
}

.validity-score .threshold {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
}

.score-item {
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.score-label {
  font-size: 16px;
  color: #606266;
  margin-bottom: 10px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
}

.level-badge {
  padding: 10px 20px;
  border-radius: 20px;
  color: white;
}

.level-normal { background: #67c23a; }
.level-warning { background: #e6a23c; }
.level-danger { background: #f56c6c; }

.suggestions-content {
  line-height: 1.8;
}

.suggestions-content p {
  margin: 0;
  color: #606266;
}

.expert-content {
  display: flex;
  gap: 15px;
  align-items: flex-start;
  padding: 20px;
  background: linear-gradient(135deg, #e8f4ff 0%, #f0f9ff 100%);
  border-radius: 8px;
}

.expert-content p {
  margin: 0;
  line-height: 1.8;
  color: #303133;
  font-style: italic;
}
</style>
```

**Step 2: 提交**

```bash
git add src/views/assessment/conners-psq/Report.vue
git commit -m "feat: add Conners PSQ report page"
```

---

## Task 10: 更新路由配置

**Files:**
- Modify: `src/router/index.ts`

**Step 1: 添加 Conners PSQ 和 TRS 路由**

在现有路由配置中添加：

```typescript
{
  path: '/assessment/conners-psq/assessment/:studentId',
  name: 'ConnersPSQAssessment',
  component: () => import('@/views/assessment/conners-psq/Assessment.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/assessment/conners-psq/report/:assessId',
  name: 'ConnersPSQReport',
  component: () => import('@/views/assessment/conners-psq/Report.vue'),
  meta: { requiresAuth: true }
},
```

**Step 2: 提交**

```bash
git add src/router/index.ts
git commit -m "feat: add Conners PSQ routes"
```

---

## Task 11: 更新评估选择页面

**Files:**
- Modify: `src/views/assessment/AssessmentSelect.vue`

**Step 1: 在评估卡片中添加 Conners 选项**

```vue
<el-card class="scale-card connors-card" @click="showConnersDialog = true">
  <div class="card-icon">🎯</div>
  <h3>Conners 量表</h3>
  <p>儿童行为评估量表（父母/教师版）</p>
</el-card>

<el-dialog v-model="showConnersDialog" title="选择 Conners 量表版本" width="500px">
  <div class="conners-options">
    <el-card class="version-option" shadow="hover" @click="goToConners('psq')">
      <div class="option-icon">👨‍👩‍👧‍👦</div>
      <h4>父母问卷 (PSQ)</h4>
      <p>48题 | 由父母或主要抚养人填写</p>
    </el-card>
    <el-card class="version-option" shadow="hover" @click="goToConners('trs')">
      <div class="option-icon">👨‍🏫</div>
      <h4>教师问卷 (TRS)</h4>
      <p>28题 | 由班主任或任课教师填写</p>
    </el-card>
  </div>
</el-dialog>
```

**Step 2: 提交**

```bash
git add src/views/assessment/AssessmentSelect.vue
git commit -m "feat: add Conners scale selection to assessment page"
```

---

## Task 12: 更新数据库版本号

**Files:**
- Modify: `src/database/init.ts`

**Step 1: 更新数据库版本**

在 `init.ts` 顶部的版本常量中更新：

```typescript
export const DATABASE_VERSION = 5  // 从 4.1.2 升级到 5
```

**Step 2: 提交**

```bash
git add src/database/init.ts
git commit -m "chore: bump database version to 5 for Conners tables"
```

---

## Task 13: 创建 TRS 评估页面

**Files:**
- Create: `src/views/assessment/conners-trs/Assessment.vue`

**Step 1: 复制 PSQ 评估页面并修改为 TRS 版本**

将 PSQ 评估页面复制为 TRS 版本，主要修改：
- 标题改为 "Conners 教师问卷 (TRS)"
- 导入 `connorsTRSQuestions` 替代 `connorsPSQQuestions`
- 题目总数为 28 题
- API 使用 `ConnersTRSAPI`

**Step 2: 提交**

```bash
git add src/views/assessment/conners-trs/Assessment.vue
git commit -m "feat: add Conners TRS assessment page"
```

---

## Task 14: 创建 TRS 报告页面

**Files:**
- Create: `src/views/assessment/conners-trs/Report.vue`

**Step 1: 复制 PSQ 报告页面并修改为 TRS 版本**

将 PSQ 报告页面复制为 TRS 版本，主要修改：
- 标题改为 "Conners 教师问卷评估报告"
- API 使用 `ConnersTRSAPI`
- 维度名称适配 (inattention 替代 anxiety)

**Step 2: 提交**

```bash
git add src/views/assessment/conners-trs/Report.vue
git commit -m "feat: add Conners TRS report page"
```

---

## Task 15: 添加 TRS 路由

**Files:**
- Modify: `src/router/index.ts`

**Step 1: 添加 TRS 路由**

```typescript
{
  path: '/assessment/conners-trs/assessment/:studentId',
  name: 'ConnersTRSAssessment',
  component: () => import('@/views/assessment/conners-trs/Assessment.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/assessment/conners-trs/report/:assessId',
  name: 'ConnersTRSReport',
  component: () => import('@/views/assessment/conners-trs/Report.vue'),
  meta: { requiresAuth: true }
},
```

**Step 2: 提交**

```bash
git add src/router/index.ts
git commit -m "feat: add Conners TRS routes"
```

---

## Task 16: 更新 PROJECT_CONTEXT.md

**Files:**
- Modify: `PROJECT_CONTEXT.md`

**Step 1: 在已完成功能中添加 Conners 量表**

在 "已完成功能" 部分添加：

```markdown
- [x] Conners 父母问卷 (PSQ-48题)
- [x] Conners 教师问卷 (TRS-28题)
```

在 "下一步优先事项" 中更新：

```markdown
### 🔴 优先级 P0 - 必须立即验证

**1. Conners 量表完整流程测试**
- 创建不同年龄段和性别的学生
- 完成 PSQ 和 TRS 评估
- 验证 T 分计算
- 验证效度检查
- 查看报告内容
```

**Step 2: 提交**

```bash
git add PROJECT_CONTEXT.md
git commit -m "docs: update PROJECT_CONTEXT for Conners implementation"
```

---

## Task 17: 最终提交

**Step 1: 确保所有更改已提交**

```bash
git status
```

**Step 2: 如果有未提交的文件，提交它们**

**Step 3: 推送到远程仓库（如果需要）**

```bash
git push origin electron-package
```

---

## 测试清单

完成实施后，进行以下测试：

### 功能测试
- [ ] PSQ 评估页面可以正常加载
- [ ] TRS 评估页面可以正常加载
- [ ] 可以选择答案并切换题目
- [ ] 可以跳过题目（漏填）
- [ ] 提交后能正确计算分数
- [ ] 效度检查正确触发 (PI>2.5, NI>2.2)
- [ ] 报告页面正确显示数据
- [ ] 占位符正确替换为学生姓名

### 数据库测试
- [ ] PSQ 表正确创建
- [ ] TRS 表正确创建
- [ ] 评估数据正确保存
- [ ] 可以查询历史评估

### 评分测试
- [ ] T 分计算正确（区分性别和年龄）
- [ ] 漏填处理正确
- [ ] 效度检查逻辑正确（PI高=可疑，NI高=可疑）
- [ ] 评定等级正确

### UI/UX 测试
- [ ] 温馨提示对话框正常显示
- [ ] 进度条正确更新
- [ ] 完成对话框正常显示
- [ ] 报告页面样式正常

---

**预计实施时间:** 约 2-3 小时（按任务顺序执行）

**依赖技能:** @superpowers:subagent-driven-development（本会话中执行）或 @superpowers:executing-plans（新会话中执行）
