/**
 * 统一领域 → ability_tag 关键词（recommendation engine 打分层）
 *
 * 锁定决策 #1：混合匹配粒度 —— 障碍领域→训练域(category)粗筛（已在 ability-taxonomy 完成）
 * + 领域→能力标签关键词 OR 命中打分排序（本文件）。
 *
 * 打分口径（recommendation-engine.ts 实现）：
 * - 对每件候选器材的每个 tag，检查是否【包含】本领域任一关键词（子串匹配，容错自由文本）。
 * - score = 命中关键词数（可按弱势 severity 加权）。
 * - 跨域同名词（如"手眼协调"）误配风险：由粗筛先域内收窄，打分只在正确域内排序，风险可控。
 *
 * 关键词为中文 ability_tag 子串，覆盖该领域常见能力描述。
 *
 * @module features/recommendation/domain-tag-keywords
 */

import type { UnifiedDomain } from './ability-taxonomy'

/**
 * 统一领域 → ability_tag 关键词列表。
 * 关键词尽量短而通用，便于子串命中自由文本 tag。
 */
export const DOMAIN_TAG_KEYWORDS: Record<UnifiedDomain, string[]> = {
  cognitive: [
    '认知',
    '记忆',
    '注意',
    '专注',
    '思维',
    '逻辑',
    '推理',
    '分类',
    '配对',
    '排序',
    '数概念',
    '执行功能',
    '问题解决',
    '空间认知',
    '概念',
  ],
  language: [
    '语言',
    '表达',
    '理解',
    '词汇',
    '沟通',
    '命名',
    '句子',
    '听觉理解',
    '言语',
  ],
  gross_motor: [
    '大运动',
    '平衡',
    '协调',
    '核心',
    '爬',
    '走',
    '跑',
    '跳',
    '投掷',
    '粗大运动',
  ],
  fine_motor: [
    '精细',
    '精细动作',
    '手眼协调',
    '抓握',
    '捏',
    '穿珠',
    '剪纸',
    '握笔',
    '双手协调',
    '手部力量',
    '灵活性',
    '手部',
  ],
  social: [
    '社交',
    '互动',
    '轮流',
    '合作',
    '眼神',
    '分享',
    '同伴',
    '规则',
    '社交沟通',
    '集体',
    '交往',
  ],
  emotional: [
    '情绪',
    '情绪识别',
    '情绪表达',
    '情绪调节',
    '挫折',
    '容忍',
    '自我意识',
    '共情',
    '同理',
    '心情',
  ],
  sensory_integration: [
    '感觉统合',
    '前庭',
    '本体觉',
    '本体',
    '触觉',
    '视觉',
    '听觉',
    '嗅觉',
    '味觉',
    '感觉调节',
    '统合',
    '感觉',
    '感官',
  ],
  life_skills: [
    '生活自理',
    '自理',
    '穿衣',
    '进食',
    '吃饭',
    '如厕',
    '洗漱',
    '洗手',
    '整理',
    '独立性',
    '日常',
    '家务',
  ],
  soothing: [
    '安抚',
    '安坐',
    '自我调节',
    '放松',
    '情绪降温',
    '减压',
    '镇定',
    '调节',
    '平静',
  ],
}

/**
 * 取某领域命中 resource tags 的关键词列表（命中理由展示用）。
 *
 * @param domain 统一领域
 * @param tags 资源 tags
 * @returns 命中的关键词（去重）
 */
export function matchDomainKeywords(
  domain: UnifiedDomain,
  tags: readonly string[]
): string[] {
  const keywords = DOMAIN_TAG_KEYWORDS[domain] || []
  const matched = new Set<string>()

  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.length === 0) {
      continue
    }
    for (const keyword of keywords) {
      if (tag.includes(keyword)) {
        matched.add(keyword)
      }
    }
  }

  return Array.from(matched)
}
