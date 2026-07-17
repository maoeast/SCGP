/**
 * 知识型技能的持久化 payload 结构与注入拼接规则。
 *
 * 兼容 Phase 5B 的旧 `{ content }` 结构；新结构把 SKILL.md 主体与 references
 * 分开保存，以便每个智能体只注入当前需要的参考资料。
 */
export interface KnowledgeSkillReference {
  id: string
  title: string
  content: string
}

export interface KnowledgeSkillMetadata {
  sourceType?: 'builtin' | 'custom'
  sourceUrl?: string
  license?: string
  evidenceLevel?: string
  riskLevel?: string
  audience?: string
}

export interface KnowledgeSkillPayload {
  /** Phase 5B 兼容字段：旧技能的完整正文。 */
  content?: string
  /** 新技能的 SKILL.md 主体（不含 frontmatter）。 */
  body?: string
  references?: KnowledgeSkillReference[]
  metadata?: KnowledgeSkillMetadata
}

/** 容错读取 references，脏数据不阻断聊天。 */
export function getKnowledgeSkillReferences(payload: Record<string, any> | null): KnowledgeSkillReference[] {
  if (!payload || !Array.isArray(payload.references)) return []
  return payload.references
    .filter((item: any) => item && typeof item.id === 'string' && typeof item.title === 'string')
    .map((item: any) => ({
      id: item.id,
      title: item.title,
      content: typeof item.content === 'string' ? item.content : '',
    }))
    .filter((item) => !!item.content.trim())
}

/**
 * 构造本次应注入的技能正文。
 * - referenceIds 为 null / undefined：兼容旧绑定，注入全部 references；
 * - referenceIds 为 []：仅注入主体；
 * - 有具体 id：仅注入被勾选的 references。
 */
export function buildKnowledgeSkillContent(
  payload: Record<string, any> | null,
  referenceIds?: string[] | null,
): string {
  if (!payload) return ''
  const body = String(payload.body ?? payload.content ?? '').trim()
  if (!body) return ''

  const references = getKnowledgeSkillReferences(payload)
  const selected =
    referenceIds == null
      ? references
      : references.filter((reference) => referenceIds.includes(reference.id))

  return [body, ...selected.map((reference) => `# ${reference.title}\n\n${reference.content.trim()}`)]
    .filter(Boolean)
    .join('\n\n---\n\n')
    .trim()
}
