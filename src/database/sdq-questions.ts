/**
 * SDQ (长处和困难问卷) 题目数据
 *
 * 父母版 25 题，适用于 3-16 岁儿童
 * 3 点计分：0 = 不符合，1 = 有点符合，2 = 完全符合
 *
 * @module database/sdq-questions
 */

import type { ScaleQuestion } from '@/types/assessment'

/**
 * SDQ 题目原始数据
 */
export interface SDQQuestionData {
  id: number
  content: string
  dimension: 'emotional' | 'conduct' | 'hyperactivity' | 'peer' | 'prosocial'
  isReversed: boolean  // 是否为反向计分题
}

/**
 * SDQ 25 道题目（父母版）
 *
 * 反向计分题（5道）：7, 11, 14, 21, 25
 * 这些题目为正向描述，需要反向计分：0→2, 1→1, 2→0
 */
export const SDQ_QUESTIONS: SDQQuestionData[] = [
  { id: 1, content: '会体谅别人的感受', dimension: 'prosocial', isReversed: false },
  { id: 2, content: '坐不住，过于好动', dimension: 'hyperactivity', isReversed: false },
  { id: 3, content: '经常抱怨头痛、肚子痛或身体不舒服', dimension: 'emotional', isReversed: false },
  { id: 4, content: '很乐于与他人分享', dimension: 'prosocial', isReversed: false },
  { id: 5, content: '经常发脾气或大闹', dimension: 'conduct', isReversed: false },
  { id: 6, content: '比较孤独，通常自己玩', dimension: 'peer', isReversed: false },
  { id: 7, content: '通常听大人的话', dimension: 'conduct', isReversed: true },  // 反向
  { id: 8, content: '很多事情都觉得担心', dimension: 'emotional', isReversed: false },
  { id: 9, content: '如果有人受伤、难过或生病，都乐意帮忙', dimension: 'prosocial', isReversed: false },
  { id: 10, content: '经常坐立不安或扭动身体', dimension: 'hyperactivity', isReversed: false },
  { id: 11, content: '至少有一个好朋友', dimension: 'peer', isReversed: true },  // 反向
  { id: 12, content: '经常和别人吵架', dimension: 'conduct', isReversed: false },
  { id: 13, content: '经常不快乐、心情低落或流泪', dimension: 'emotional', isReversed: false },
  { id: 14, content: '一般来说，受其他小孩喜欢', dimension: 'peer', isReversed: true },  // 反向
  { id: 15, content: '容易分心，难以集中注意力', dimension: 'hyperactivity', isReversed: false },
  { id: 16, content: '在陌生的新环境中会紧张', dimension: 'emotional', isReversed: false },
  { id: 17, content: '对年纪小的孩子和善', dimension: 'prosocial', isReversed: false },
  { id: 18, content: '经常撒谎或欺骗', dimension: 'conduct', isReversed: false },
  { id: 19, content: '被别的孩子作弄或欺负', dimension: 'peer', isReversed: false },
  { id: 20, content: '经常主动帮别人（父母、老师或其他小孩）', dimension: 'prosocial', isReversed: false },
  { id: 21, content: '做事前会先想一想', dimension: 'hyperactivity', isReversed: true },  // 反向
  { id: 22, content: '会从家里偷东西', dimension: 'conduct', isReversed: false },
  { id: 23, content: '跟年纪大的孩子相处得比较好', dimension: 'peer', isReversed: false },
  { id: 24, content: '很多恐惧，容易受惊吓', dimension: 'emotional', isReversed: false },
  { id: 25, content: '做事能够坚持到最后，注意力持久', dimension: 'hyperactivity', isReversed: true }  // 反向
]

/**
 * 维度名称映射
 */
export const SDQ_DIMENSION_NAMES: Record<string, string> = {
  emotional: '情绪症状',
  conduct: '品行问题',
  hyperactivity: '多动',
  peer: '同伴交往问题',
  prosocial: '亲社会行为'
}

/**
 * 维度包含的题号
 */
export const SDQ_DIMENSION_QUESTIONS: Record<string, number[]> = {
  emotional: [3, 8, 13, 16, 24],
  conduct: [5, 7, 12, 18, 22],
  hyperactivity: [2, 10, 15, 21, 25],
  peer: [6, 11, 14, 19, 23],
  prosocial: [1, 4, 9, 17, 20]
}

/**
 * 3 点评分选项
 */
export const SDQ_OPTIONS = [
  { value: 0, label: '不符合', description: '完全没有这种情况', score: 0 },
  { value: 1, label: '有点符合', description: '偶尔出现或部分符合', score: 1 },
  { value: 2, label: '完全符合', description: '经常出现或完全符合', score: 2 }
]

/**
 * 获取 ScaleQuestion 格式的题目列表
 */
export function getSDQScaleQuestions(): ScaleQuestion[] {
  return SDQ_QUESTIONS.map(q => ({
    id: q.id,
    dimension: q.dimension,
    dimensionName: SDQ_DIMENSION_NAMES[q.dimension],
    content: q.content,
    options: SDQ_OPTIONS,
    metadata: {
      isReversed: q.isReversed
    }
  }))
}

/**
 * 反向计分转换
 * 0 → 2, 1 → 1, 2 → 0
 */
export function reverseScore(score: number): number {
  return 2 - score
}

/**
 * 获取反向计分题的题号列表
 */
export const SDQ_REVERSED_QUESTIONS = SDQ_QUESTIONS
  .filter(q => q.isReversed)
  .map(q => q.id)

/**
 * 检查某题是否为反向计分题
 */
export function isReversedQuestion(questionId: number): boolean {
  return SDQ_REVERSED_QUESTIONS.includes(questionId)
}

/**
 * SDQ 划界分配置（父母版，4-17岁）
 * 亲社会行为分数越高越好，其他维度分数越低越好
 */
export const SDQ_THRESHOLDS: Record<string, { normal: number; borderline: number }> = {
  emotional: { normal: 3, borderline: 4 },      // 0-3正常, 4边缘, 5-10异常
  conduct: { normal: 2, borderline: 3 },        // 0-2正常, 3边缘, 4-10异常
  hyperactivity: { normal: 5, borderline: 6 },  // 0-5正常, 6边缘, 7-10异常
  peer: { normal: 3, borderline: 4 },           // 0-3正常, 4边缘, 5-10异常
  prosocial: { normal: 6, borderline: 5 },      // 6-10正常, 5边缘, 0-4异常（反向）
  total_difficulties: { normal: 13, borderline: 16 }  // 0-13正常, 14-16边缘, 17-40异常
}
