/**
 * AI 学生级长期记忆 · 总结链路纯函数（v4.1 §5/§6/§8）。
 *
 * 只做无 DB 副作用的数据变换（脱敏/指纹/相似度/提示词构造/结果解析），
 * 可被 jiti 直接单测；DB 操作与模型调用在 stores/ai.ts 的 finalizeAssistantTurn 中编排。
 *
 * 注意：本文件不得 import 任何 `@/` 别名或 DB API，只用相对路径 import 纯数据模块。
 */

// ==================== 脱敏（v4.1 §8） ====================

/** 已知敏感字段黑名单（正则命中即替换为占位符） */
const SENSITIVE_PATTERNS: RegExp[] = [
  /1[3-9]\d{9}/g, // 手机号
  /\d{6,18}/g, // 学号/证件号（6-18 位连续数字）
  /0\d{2,3}-?\d{7,8}/g, // 座机
]

/**
 * 人名指代脱敏：把对话文本中的姓名替换为稳定占位符 [STUDENT]。
 *
 * 简化实现（无 NLP 依赖）：由调用方提供该学生姓名（来自 DB），
 * 精确匹配替换为 [STUDENT]；其余敏感字段用正则脱敏。
 * 代词（他/她/孩子）不替换——由总结提示词的主体锚定语句兜底（§8）。
 */
export function desensitizeForSummary(text: string, studentName?: string): string {
  let out = text
  if (studentName) {
    // 全角/半角空格容忍，避免"小明 "变体漏脱
    out = out.split(studentName).join('[STUDENT]')
  }
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]')
  }
  return out
}

// ==================== 规范化指纹（v4.1 §5） ====================

/**
 * 文本规范化：去空白/全角转半角/小写化。
 * 用于生成去重指纹与 3-gram 相似度比较的基础。
 */
export function normalizeText(text: string): string {
  let out = text
    .replace(/\s+/g, '')
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
  // 去除常见标点（保留中文与字母数字）
  out = out.replace(/[，。！？、；：""''（）《》【】,.!?;:'"()[\]<>]/g, '')
  return out
}

/** 规范化哈希指纹：sha256 前 16 位（无 Node crypto 依赖时用 FNV-1a 32 位） */
export function fingerprintOf(text: string): string {
  const normalized = normalizeText(text)
  // FNV-1a 32-bit
  let hash = 0x811c9dc5
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** 提取中文 3-gram 集合（长度 <3 的返回自身作为单元素集） */
function trigramsOf(text: string): Set<string> {
  const normalized = normalizeText(text)
  const set = new Set<string>()
  if (normalized.length <= 3) {
    set.add(normalized)
    return set
  }
  for (let i = 0; i <= normalized.length - 3; i++) {
    set.add(normalized.slice(i, i + 3))
  }
  return set
}

/** 3-gram Jaccard 相似度（0-1）；用于 possible_duplicate_of 提示（不自动 supersede，v4 §5） */
export function trigramSimilarity(a: string, b: string): number {
  const ga = trigramsOf(a)
  const gb = trigramsOf(b)
  if (ga.size === 0 && gb.size === 0) return 1
  let inter = 0
  for (const t of ga) {
    if (gb.has(t)) inter++
  }
  const union = ga.size + gb.size - inter
  return union === 0 ? 0 : inter / union
}

// ==================== 总结提示词（v4.1 §6.5/§8 主体锚定） ====================

export const MEMORY_SUMMARY_PROMPT_VERSION = 'memory-summary-v1'

/** 专用总结提示词：主体锚定 + 结构化输出约束（不入对话 tool loop） */
export function buildMemorySummaryPrompt(): string {
  return `你是一名特殊教育教师助手，负责从对话中提炼值得长期记住的学生事实。

【主体锚定】以下对话均围绕当前绑定学生 [STUDENT]，无明确其他对象时，代词「他/她/孩子」均指 [STUDENT]。

请判断对话中是否出现了关于 [STUDENT] 的、值得长期记住的新事实。只输出 JSON，不要输出其他内容：
{ "facts": [ { "category": "observation|preference|advice_given|follow_up", "content": "一句话事实（≤200字）", "confidence": "observed|assumed", "keyword_hint": "可选，2-4 个关键词辅助去重" } ] }

规则：
- observation：可观察的事实（行为/表现/评估反映），默认 observed；
- preference：学生偏好或有效策略；
- advice_given：本次给出的建议（供下次复盘）；
- follow_up：待跟进事项（写清期限，如「2 周后复盘」）；
- 只写有明确依据的事实；不确定的用 assumed；
- 没有值得记住的新事实时输出 {"facts": []}；
- 不得写入诊断结论、姓名（用 [STUDENT]）、证件号、联系方式等敏感信息。`
}

// ==================== 结果解析（容错） ====================

export interface MemoryFactDraft {
  category: 'observation' | 'preference' | 'advice_given' | 'follow_up'
  content: string
  confidence: 'observed' | 'assumed'
  keywordHint?: string
}

const VALID_CATEGORIES: MemoryFactDraft['category'][] = [
  'observation',
  'preference',
  'advice_given',
  'follow_up',
]

/** 解析模型返回的 facts JSON（容错：提取首个 {...} 块，脏数据返回 []） */
export function parseMemoryFacts(raw: string): MemoryFactDraft[] {
  if (!raw) return []
  const trimmed = raw.trim()
  // 剥掉可能的 markdown 代码围栏
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed)
  const jsonText = fenced ? fenced[1]! : trimmed
  // 提取首个 JSON 对象
  const start = jsonText.indexOf('{')
  const end = jsonText.lastIndexOf('}')
  if (start < 0 || end <= start) return []
  try {
    const parsed = JSON.parse(jsonText.slice(start, end + 1))
    if (!parsed || !Array.isArray(parsed.facts)) return []
    return parsed.facts
      .filter(
        (f: any) =>
          f &&
          typeof f.content === 'string' &&
          VALID_CATEGORIES.includes(f.category) &&
          f.content.trim().length > 0 &&
          f.content.trim().length <= 200,
      )
      .map((f: any) => ({
        category: f.category,
        content: f.content.trim(),
        confidence: f.confidence === 'assumed' ? ('assumed' as const) : ('observed' as const),
        keywordHint: typeof f.keyword_hint === 'string' ? f.keyword_hint.trim() : undefined,
      }))
  } catch {
    return []
  }
}
