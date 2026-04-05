import type { ScaleOption, ScaleQuestion } from '@/types/assessment'

export type GmfmDimensionCode = 'A' | 'B' | 'C' | 'D' | 'E'

export interface GmfmDimensionDefinition {
  code: GmfmDimensionCode
  label: string
  fullLabel: string
  itemCount: number
  maxScore: number
}

export interface GmfmQuestionData {
  id: number
  itemCode: string
  dimension: GmfmDimensionCode
  dimensionName: string
  title: string
  orderInDimension: number
}

export const GMFM_DIMENSIONS: GmfmDimensionDefinition[] = [
  { code: 'A', label: '卧位与翻身', fullLabel: 'A区 卧位与翻身', itemCount: 17, maxScore: 51 },
  { code: 'B', label: '坐位', fullLabel: 'B区 坐位', itemCount: 20, maxScore: 60 },
  { code: 'C', label: '爬与跪', fullLabel: 'C区 爬与跪', itemCount: 14, maxScore: 42 },
  { code: 'D', label: '站立', fullLabel: 'D区 站立', itemCount: 13, maxScore: 39 },
  { code: 'E', label: '走、跑、跳', fullLabel: 'E区 走、跑、跳', itemCount: 24, maxScore: 72 },
]

const GMFM_SCORE_OPTIONS: ScaleOption[] = [
  { value: 0, label: '0分', description: '无起始动作：孩子无法表现出该动作的任何部分。', score: 0 },
  { value: 1, label: '1分', description: '有起始动作：孩子能表现出动作的极少部分（完成度 < 10%）。', score: 1 },
  { value: 2, label: '2分', description: '部分完成：孩子能完成该动作的一部分，但不够完整（完成度在 10% ~ 99% 之间）。', score: 2 },
  { value: 3, label: '3分', description: '完整完成：孩子能完全独立、按照标准完成该动作。', score: 3 },
  { value: 'NT', label: 'NT', description: '未测试：孩子哭闹、抗拒或客观条件无法测试，按 0 分计。', score: 0 },
]

function createDimensionQuestions(
  dimension: GmfmDimensionCode,
  dimensionName: string,
  titles: string[],
  startId: number,
): GmfmQuestionData[] {
  return titles.map((title, index) => ({
    id: startId + index,
    itemCode: `${dimension}${index + 1}`,
    dimension,
    dimensionName,
    title,
    orderInDimension: index + 1,
  }))
}

export const GMFM_QUESTIONS: GmfmQuestionData[] = [
  ...createDimensionQuestions('A', '卧位与翻身', [
    '仰卧：头中线位',
    '仰卧：手到中线，手指交叉',
    '仰卧：抬头45°',
    '仰卧：右髋右膝屈曲',
    '仰卧：左髋左膝屈曲',
    '仰卧：伸手抓右侧玩具',
    '仰卧：伸手抓左侧玩具',
    '仰卧：翻至右侧卧',
    '仰卧：翻至左侧卧',
    '俯卧：抬头直立',
    '俯卧：前臂支撑，抬头直立',
    '俯卧：前臂支撑，右臂伸出',
    '俯卧：前臂支撑，左臂伸出',
    '俯卧：翻至仰卧（右）',
    '俯卧：翻至仰卧（左）',
    '右侧卧：翻至俯卧',
    '左侧卧：翻至俯卧',
  ], 1),
  ...createDimensionQuestions('B', '坐位', [
    '仰卧，检查者握手：拉起坐，头控制',
    '仰卧：翻身至坐位（右）',
    '仰卧：翻身至坐位（左）',
    '坐在垫上，检查者支撑：直立坐',
    '坐在垫上：坐稳5秒',
    '坐在垫上：小腿前伸玩玩具',
    '坐在垫上：向前触地',
    '坐在垫上：触右侧地面',
    '坐在垫上：触左侧地面',
    '坐在垫上：坐至俯卧（右）',
    '坐在垫上：坐至俯卧（左）',
    '坐在垫上：坐至四肢爬行位',
    '坐在垫上：手臂不支撑坐3秒',
    '坐在垫上：手臂不支撑，转向右后方',
    '坐在垫上：手臂不支撑，转向左后方',
    '坐在长凳上：无支撑坐10秒',
    '坐在长凳上：右侧，右手触地',
    '坐在长凳上：左侧，左手触地',
    '坐在长凳上：从地面捡物',
    '坐在长凳上：站起',
  ], 18),
  ...createDimensionQuestions('C', '爬与跪', [
    '俯卧：向前爬行1.8米',
    '四肢爬行位：维持重心',
    '四肢爬行位：坐到垫上（右）',
    '四肢爬行位：坐到垫上（左）',
    '俯卧：向前爬行1.8米（腹部离地）',
    '四肢爬行：向前爬1.8米',
    '四肢爬行：向前爬1.8米（交替模式）',
    '四肢爬行：爬上4级台阶',
    '四肢爬行：爬下4级台阶',
    '坐在垫上：高跪位',
    '高跪位：高跪行走10步（无支撑）',
    '高跪位：从地面站起（右膝在前）',
    '高跪位：从地面站起（左膝在前）',
    '高跪位：单膝跪（右膝）',
  ], 38),
  ...createDimensionQuestions('D', '站立', [
    '地面：扶物站起',
    '站立：双手扶持，站10秒',
    '站立：单手扶持，站10秒',
    '站立：无支撑，站20秒',
    '站立：无支撑，抬起一脚10秒（左）',
    '站立：无支撑，抬起一脚10秒（右）',
    '坐在小凳上：无支撑站起',
    '站立：蹲下捡物后站起',
    '站立：坐在地面上',
    '地面：站起',
    '站立：右脚前，双脚站20秒',
    '站立：左脚前，双脚站20秒',
    '站立：单脚站10秒（右脚）',
  ], 52),
  ...createDimensionQuestions('E', '走、跑、跳', [
    '扶物：向右侧行走5步',
    '扶物：向左侧行走5步',
    '双手被牵：向前走10步',
    '单手被牵：向前走10步',
    '无支撑：向前走10步',
    '无支撑：向前走10步，停下',
    '无支撑：向前走10步，转身回来',
    '无支撑：向后退10步',
    '无支撑：两线间走10步（20cm）',
    '无支撑：跨越膝关节高障碍（右脚领先）',
    '无支撑：跨越膝关节高障碍（左脚领先）',
    '无支撑：跑4.5米，停下',
    '无支撑：右脚单脚跳10次',
    '无支撑：左脚单脚跳10次',
    '无支撑：跑4.5米，捡物，跑回',
    '无支撑：交替上4级台阶（扶栏）',
    '无支撑：交替下4级台阶（扶栏）',
    '无支撑：交替上4级台阶（无扶栏）',
    '无支撑：交替下4级台阶（无扶栏）',
    '无支撑：站立向前跳30cm',
    '无支撑：右脚单脚跳10步',
    '无支撑：左脚单脚跳10步',
    '无支撑：跑过4.5米，踢球',
    '无支撑：两脚同时跳20次',
  ], 65),
]

export function getGmfm88ScaleQuestions(): ScaleQuestion[] {
  return GMFM_QUESTIONS.map((question) => ({
    id: question.id,
    dimension: question.dimension,
    dimensionName: question.dimensionName,
    content: `${question.itemCode}. ${question.title}`,
    options: GMFM_SCORE_OPTIONS,
    metadata: {
      itemCode: question.itemCode,
      orderInDimension: question.orderInDimension,
      scoreType: 'gmfm_88',
    },
  }))
}
