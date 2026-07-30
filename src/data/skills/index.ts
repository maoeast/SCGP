/**
 * 内置知识型技能数据源（Phase 5B）。
 *
 * 用 Vite import.meta.glob 在 build 时把 src/data/skills/<技能名>/SKILL.md 与
 * references/*.md 读成字符串（?raw eager，与项目既有 ?raw 模式一致：见
 * src/database/emotional-resource-data.ts、src/assets/images/equipment/images.ts）。
 * 解析 frontmatter，保留主体与 references 的独立结构，导出 BUILTIN_KNOWLEDGE_SKILLS 供
 * init.ts 写入 ai_skill(kind='knowledge')。
 *
 * 空目录（用户尚未拷入技能文件夹）时 glob 返回 {} → 导出 []，不报错、type-check 不挂；
 * 用户把技能文件夹拷进 src/data/skills/ 后重启即生效（init.ts 的 upsert 会刷新正文）。
 */
export interface BuiltinKnowledgeSkill {
  /** 技能 code（取自 SKILL.md frontmatter 的 name 字段，如 'speech-therapist'）。 */
  code: string
  /** 展示名（优先取 frontmatter display_name，未配置时回退 name）。 */
  name: string
  /** 技能简介（取自 frontmatter description） */
  description: string
  /** SKILL.md 主体（去 frontmatter）。 */
  body: string
  /** 可按 agent 绑定配置选择的参考资料。 */
  references: Array<{ id: string; title: string; content: string }>
  /** 供技能库治理展示的来源与风险元数据。 */
  metadata: {
    sourceType: 'builtin'
    sourceUrl: string
    license: string
    evidenceLevel: string
    riskLevel: string
    audience: string
  }
}

// build 时静态读取每个技能的主文件与参考文件（eager：直接拿到字符串，非懒加载）
// 单层目录匹配：./<技能名>/SKILL.md、./<技能名>/references/*.md
const mainModules = import.meta.glob<{ default: string }>('./*/SKILL.md', {
  eager: true,
  query: '?raw',
})
const refModules = import.meta.glob<{ default: string }>('./*/references/*.md', {
  eager: true,
  query: '?raw',
})
// 技能根目录直接散放的 md（如 developmental-screening-assessment 的领域参考文件，
// 不在 references/ 子目录）；与 SKILL.md 去重（main glob 已处理主体）
const rootRefModules = import.meta.glob<{ default: string }>('./*/*.md', {
  eager: true,
  query: '?raw',
})

/** 极简 frontmatter 解析：取首部常用单行字段，body 为剩余正文。 */
function parseFrontmatter(md: string): {
  name: string
  displayName: string
  description: string
  license: string
  evidenceLevel: string
  riskLevel: string
  audience: string
  body: string
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md)
  if (!match) {
    return {
      name: '',
      displayName: '',
      description: '',
      license: '',
      evidenceLevel: '未标注',
      riskLevel: '常规',
      audience: '教师',
      body: md,
    }
  }
  const fm = match[1] ?? ''
  const body = md.slice(match[0].length)
  const pickLine = (key: string): string => {
    const line = new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(fm)
    if (!line) return ''
    let v = (line[1] ?? '').trim()
    // 去首尾成对引号
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    return v
  }
  return {
    name: pickLine('name'),
    displayName: pickLine('display_name'),
    description: pickLine('description'),
    license: pickLine('license'),
    evidenceLevel: pickLine('evidence_level') || '未标注',
    riskLevel: pickLine('risk_level') || '常规',
    audience: pickLine('audience') || '教师',
    body,
  }
}

/** 从 glob key（'./speech-therapist/SKILL.md'）提取技能目录名 */
function skillDirFromPath(p: string): string | null {
  const m = /^\.\/([^/]+)\//.exec(p)
  return m ? (m[1] ?? '') : null
}

/** 从 references glob key 提取文件名（去扩展名），用于拼接小标题 */
function refTitleFromPath(p: string): string {
  const base = p.split('/').pop() || p
  return base.replace(/\.md$/i, '')
}

/** 引用 id 在同一技能目录内稳定，用于 ai_agent_skill.config 中按需勾选。 */
function refIdFromPath(p: string): string {
  const segments = p.split('/')
  return segments.slice(2).join('/').replace(/\.md$/i, '')
}

// 按目录聚合主文件 + references
const dirMap = new Map<
  string,
  { main: string | null; refs: Array<{ id: string; title: string; content: string }> }
>()
for (const [path, mod] of Object.entries(mainModules)) {
  const dir = skillDirFromPath(path)
  if (!dir) continue
  if (!dirMap.has(dir)) dirMap.set(dir, { main: null, refs: [] })
  dirMap.get(dir)!.main = mod?.default ?? ''
}
for (const [path, mod] of Object.entries(refModules)) {
  const dir = skillDirFromPath(path)
  if (!dir) continue
  if (!dirMap.has(dir)) dirMap.set(dir, { main: null, refs: [] })
  const title = refTitleFromPath(path)
  if (/^readme$/i.test(title)) continue // 跳过 README（索引页，无实质方法论）
  dirMap.get(dir)!.refs.push({ id: refIdFromPath(path), title, content: mod?.default ?? '' })
}
// 技能根目录散放的 md（非 SKILL.md / README）也并入 references（覆盖 developmental 等非标准结构）
for (const [path, mod] of Object.entries(rootRefModules)) {
  const base = path.split('/').pop() || ''
  if (/^skill\.md$/i.test(base) || /^readme\.md$/i.test(base)) continue
  const dir = skillDirFromPath(path)
  if (!dir) continue
  if (!dirMap.has(dir)) dirMap.set(dir, { main: null, refs: [] })
  dirMap.get(dir)!.refs.push({
    id: refIdFromPath(path),
    title: base.replace(/\.md$/i, ''),
    content: mod?.default ?? '',
  })
}

export const BUILTIN_KNOWLEDGE_SKILLS: BuiltinKnowledgeSkill[] = Array.from(dirMap.entries())
  .map(([, data]) => {
    if (!data.main) return null
    const fm = parseFrontmatter(data.main)
    const references = data.refs
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
    return {
      code: fm.name,
      name: fm.displayName || fm.name,
      description: fm.description,
      body: fm.body.trim(),
      references,
      metadata: {
        sourceType: 'builtin',
        sourceUrl: '',
        license: fm.license,
        evidenceLevel: fm.evidenceLevel,
        riskLevel: fm.riskLevel,
        audience: fm.audience,
      },
    }
  })
  .filter((s): s is BuiltinKnowledgeSkill => !!s)
  .sort((a, b) => a.code.localeCompare(b.code))
