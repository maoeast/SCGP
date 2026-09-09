#!/usr/bin/env node
/**
 * convert-cpep3-data.mjs — CPEP-3 源数据 → src/database/cpep3-questions.ts
 *
 * 输入（export/CPEP-3/）：
 *   cpep3_items.json            139 题题库
 *   cpep3_pg_month_norms.json   分能区「通过数 → 发展当量月龄区间」常模（102 行）
 *   cpep3_gn_fz_month_norms.json「总通过数 → 总发展当量月龄区间」常模（96 行）
 *
 * 转换内容（对应设计文档 §1.4 修正项）：
 *   1. domainName「手言协调」→「手眼协调」（源库录入错别字，LYCode=E 与 11A-1 同域）
 *   2. 4 道源库录入不全的施测题（6B 仅 P；17C/*22B/55 仅 P,E）经人工补录恢复标准 P/E/F（2026-09-09 用户确认，
 *      6B 三档判据由用户提供；见 MANUAL_SCORE_LEVEL_SUPPLEMENTS）
 *   3. gn 表 developmentalQuotient 字段名语义纠正 → totalPassCount（值域 0-95 即总通过项目数）
 *   4. 28 道题 taskName 剥离源软件错误粘贴的施测指示语（2026-09-09 复核：PEP-3 官方计分无 NA 选项/
 *      无 prorating，该指示语是厂商套话，彻底丢弃不保留 hidden metadata；forbidden-pattern 见 verifier 5g）
 * 另：评分描述截断清单仅打印（源库录入时截断，不阻塞计分）。
 *
 * 用法：node scripts/convert-cpep3-data.mjs   （幂等，重新生成同内容）
 * 门禁：node scripts/verify-cpep3-item-bank.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = resolve(root, 'export/CPEP-3')
const outFile = resolve(root, 'src/database/cpep3-questions.ts')

const items = JSON.parse(readFileSync(resolve(srcDir, 'cpep3_items.json'), 'utf8'))
const pgNorms = JSON.parse(readFileSync(resolve(srcDir, 'cpep3_pg_month_norms.json'), 'utf8'))
const gnNorms = JSON.parse(readFileSync(resolve(srcDir, 'cpep3_gn_fz_month_norms.json'), 'utf8'))

// ---------- 修正项 1：能区名错别字 ----------
const DOMAIN_NAME_FIXES = { '手言协调': '手眼协调' }

// ---------- 修正项 4：剥离源软件错误粘贴的施测指示语（PEP-3 官方计分无 NA 规则） ----------
const NA_INSTRUCTION_MARK = '于有年龄规定'

function stripNaInstruction(taskName) {
  const idx = taskName.indexOf(NA_INSTRUCTION_MARK)
  if (idx < 0) return { taskName, stripped: false }
  let name = taskName.slice(0, idx).trim()
  // 26 题形如「<题干>-<指示语>」；2 题（81/82）直接拼接无分隔符——切割后清理尾部残留连字符
  name = name.replace(/[-－]\s*$/, '').trim()
  return { taskName: name, stripped: true }
}

// ---------- 修正项 5：人工补录缺失评分档（2026-09-09 用户确认） ----------
// 源库 4 道施测题评分档录入不全（6B 仅 P；17C/*22B/55 仅 P,E），导致施测时只能选 P（或无 F 可选），
// 会让通过数虚高。按 PEP-3 三级计分语义补录：
//   6B 三档判据为用户提供（2026-09-09）；其余 F 档参照同组题官方句式（「不能或也不试着去…」/「在3次试X中…一次也没有试着…」）起草。
const MANUAL_SCORE_LEVEL_SUPPLEMENTS = {
  '6B': {
    E: '孩子出现明确的模仿意图，并发出部分、近似或不完整的声音反应(如只发出目标声音的一部分或相近音，或经重复示范后才出现声音尝试)。',
    F: '经充分示范和合理等待后，孩子没有出现与目标声音相关的发声模仿行为(无关发声、笑声、尖叫等与目标无明显对应关系的声音不计为模仿)。',
  },
  '17C': {
    F: '在3次试踢中孩子一次也没有试着去踢球。',
  },
  '*22B': {
    F: '孩子不能双脚原地上下跳动，也不试着去做此动作。',
  },
  '55': {
    F: '孩子不能协调地同时使用双手，也不试着去这样做。',
  },
}
// ---------- 修正项 6：37 条截断评分描述补全（2026-09-09 ChatGPT 辅助补全 + 用户定稿确认） ----------
// 来源: export/CPEP-3/CPEP-3 截断评分描述 37 条最终定稿.md（key = codeNo|level）
// 另含错字规范（联入→嵌入）、重复字删除（才能取得）、*8A-2 P/E 串栏修复
const MANUAL_DESC_FIXES = {
  '4|F': '即使再次示范之后，孩子也不能或者也不试着去按铃。',
  '5A|P': '孩子能模仿测试者，在桌子上把胶泥搓成长条。',
  '5A|F': '孩子甚至不设法去模仿或不能用所描述的方法去搓胶泥。',
  '6A|F': '孩子不能或也不试着去把手偶套在手上或者用手指去操作它。',
  '*8A-2|P': '孩子不需要示范就能把三个拼块完全嵌入到对应的位置上。',
  '*8A-2|F': '孩子甚至在示范后也不能或不试着把其中任何一块嵌入对应的位置。',
  '10|S': '孩子不能或者也不试着越过中线去得到拼图块。如果孩子不愿意拼图，则可在晚些时候使用其它材料（如蜡笔或积木块）给此项评分。这些材料的放置方法是：孩子必须跨过中线才能取得并使用。',
  '11B|P': '在两次试问中孩子能正确辨认出大块是大的、小块是小的。',
  '11B|F': '在两次试问之中孩子不能正确辨认任何一块，或者也不试着去这样做。',
  '14B|F': '孩子不能正确辨认任何一种颜色或者他也不试着去这样做。',
  '15A-1|F': '孩子不能正确地依顺序复述出两位数或三位数，或者他也不试着去这样做。',
  '16-1|P': '孩子能明显地对声音做出某种反应，并正确地辨认声音方位。这种反应可能是语言的（如问“这是什么声音”）或非语言的（如眨眼睛，改变面部表情，跳起来，喊叫等等，并把头转向声音的方向）。',
  '16-1|F': '孩子完全没有口语或非口语的表示，表明他听到了声音。',
  '17C|E': '孩子在3次之中都未能设法把球踢出去（例如轻拍或用脚碰球）。',
  '18|S': '孩子没有展示利脚。',
  '*22B|E': '孩子未能设法用双脚跳（例如弯下膝盖，但是一只脚也没有离开地面）。',
  '24|E': '孩子用大拇指至少触碰其中一个手指头，而不考虑正确顺序。',
  '24|F': '孩子动了他的手指头，但未能用拇指去触碰任何一个手指头，或者孩子不试图去做。',
  '35|F': '孩子不能或者也不试着去画三角形（如他所画的图形一点也不像三角形等）。',
  '43-1|F': '孩子不能或也不试图递给你任何一件物品。',
  '43-2|F': '孩子不能或者也不试图递给你任何一件物品。',
  '48|S': '孩子对你的声音做出不适当的反应，没有以任何语言的或非语言的方式表明他已经听见你的声音。',
  '51|F': '孩子不能正确地至少数到3，或也不试着去数。',
  '*52|F': '孩子不能正确辨认任何一个数字；或者他也不试着去这样做。',
  '53B|F': '孩子不能正确地算出任何一道题；或者他也不试着去做。',
  '55|E': '孩子不能一贯协调地使用双手（如知道必要的动作，但有时仍不能协调地同时使用双手）。',
  '61|F': '孩子甚至在充分示范之后仍不能部分地将任何卡片分类；或者也不试着这样做。',
  '62|F': '没有下一步该做什么的概念，或对常规的做法完全不理解。',
  '*63C|P': '孩子至少能正确辨认其中14幅图片。',
  '*63C|F': '孩子不能正确地辨认任何一张图片，或者也不试着这样做。',
  '65|F': '孩子连某个单词的一部分也不能复述或者他也不试着去这样做。',
  '67|E': '孩子至少能复述出其中一句话；或者不管顺序是否正确，他能复述其中一句话中的4个词（如“看见飞机空中飞”，“康康和一辆车”等）。',
  '74|M': '即使存在互动方面的兴趣，（孩子的）视线接触也转瞬即逝。',
  '75|A': '孩子的视觉兴趣及敏感性在正常范围内。',
  '76|S': '孩子对室外的声响或测试者在室内发出的一般声响（例如备测试材料、玩具收拾等）特别敏感或容易被分散注意力；或做出不适当的反应。孩子也可能对这些声音极端没有反应。',
  '78|A': '孩子不会不适当地品尝物品、把物品放入嘴内或舔一舔物品。',
  '78|S': '孩子显示出不适当的品尝或舔物品的行为。',

// *8A-2 E 档：P/E 串栏修复（定稿第 5 条注释的合并理解：原 P 后半段 + E 半句合并）
  '*8A-2|E': '孩子至少能把其中一块嵌入对应的位置，或者他需要示范才试着或完成此项任务。',
}

const LEVEL_ORDER = { P: 0, E: 1, F: 2 }

// 能区定义（发展区 7 + 病理区 5，按施测顺序）
const DEV_DOMAINS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const DOMAIN_META = [
  { code: 'A', name: '模仿', kind: 'developmental' },
  { code: 'B', name: '知觉', kind: 'developmental' },
  { code: 'C', name: '精细动作', kind: 'developmental' },
  { code: 'D', name: '粗大动作', kind: 'developmental' },
  { code: 'E', name: '手眼协调', kind: 'developmental' },
  { code: 'F', name: '认知表现', kind: 'developmental' },
  { code: 'G', name: '口语认知', kind: 'developmental' },
  { code: 'H', name: '情感', kind: 'pathological' },
  { code: 'I', name: '人际关系', kind: 'developmental' }, // placeholder，下面修正
  { code: 'J', name: '物品喜好', kind: 'pathological' },
  { code: 'K', name: '感觉', kind: 'pathological' },
  { code: 'L', name: '语言', kind: 'pathological' },
]
// I 是病理区（人际关系）
DOMAIN_META[8].kind = 'pathological'

// ---------- 题目转换 ----------
// 施测题统一计分（任务书 §2.2 固定映射）：P=2 / E=1 / F=0
//（规则层常模换算输入仍为 P 通过计数，E 不计入通过数——分值与通过计数是两层，见 docs/cpep3-report-design-v1.0.md §0）
// 观察题严重度分：A=0 / M=1 / S=2（docs/maladaptive-score-direction-audit.md 方向已核实）
const LEVEL_SCORES_ADMINISTERED = { P: 2, E: 1, F: 0 }
const LEVEL_SCORES_RATED = { A: 0, M: 1, S: 2 }

let typoFixes = 0
let naStripped = 0
const truncatedDescriptions = []

const questions = items.map((it) => {
  const domainName = DOMAIN_NAME_FIXES[it.domainName] || it.domainName
  if (DOMAIN_NAME_FIXES[it.domainName]) typoFixes++

  // 修正项 4：剥离施测指示语
  const strippedResult = stripNaInstruction(it.taskName)
  if (strippedResult.stripped) naStripped++

  // 修正项 6：应用截断补全（含 *8A-2 串栏修复）
  for (const sl of it.scoreLevels) {
    const fix = MANUAL_DESC_FIXES[`${it.codeNo}|${sl.level}`]
    if (fix) sl.desc = fix
  }

  // 截断检测：中文句末/括号闭合结尾视为完整（补全后应仅剩极少量无伤大雅的）
  for (const sl of it.scoreLevels) {
    const d = (sl.desc || '').trim()
    if (d && !/[。！？”）)]/.test(d.slice(-1))) {
      truncatedDescriptions.push({ codeNo: it.codeNo, level: sl.level, tail: d.slice(-20) })
    }
  }

  const scoreByLevel = {}
  for (const sl of it.scoreLevels) {
    scoreByLevel[sl.level] =
      it.itemType === 'administered'
        ? LEVEL_SCORES_ADMINISTERED[sl.level]
        : LEVEL_SCORES_RATED[sl.level]
  }

  // 修正项 5：合并人工补录档位（仅施测题；补录档 desc 计分随标准档）
  const supplements = it.itemType === 'administered' ? MANUAL_SCORE_LEVEL_SUPPLEMENTS[it.codeNo] : undefined
  if (supplements) {
    for (const [level, desc] of Object.entries(supplements)) {
      if (it.scoreLevels.some((sl) => sl.level === level)) continue // 已有档不覆盖
      it.scoreLevels.push({ level, desc })
      scoreByLevel[level] = LEVEL_SCORES_ADMINISTERED[level]
    }
    it.scoreLevels.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
  }

  return {
    id: it.id,
    codeNo: it.codeNo,
    domainCode: it.domainCode,
    domainName,
    itemType: it.itemType,
    taskName: strippedResult.taskName,
    materialDesc: it.materialDesc,
    procedureDesc: it.procedureDesc,
    standardDesc: it.standardDesc,
    scoreLevels: it.scoreLevels.map((sl) => ({
      level: sl.level,
      desc: sl.desc,
      score: scoreByLevel[sl.level],
    })),
  }
})

// ---------- 常模转换 ----------
const pgNormRows = pgNorms.map((r) => ({
  domainCode: r.domainCode,
  domainName: DOMAIN_NAME_FIXES[r.domainName] || r.domainName,
  monthRange: r.monthRange,
  passCount: r.passCount,
}))
const gnNormRows = gnNorms.map((r) => ({
  totalPassCount: r.developmentalQuotient, // 字段名语义纠正（修正项 3）
  monthRange: r.monthRange,
}))

// ---------- 生成 TS ----------
const header = `import type {
  Cpep3QuestionData,
  Cpep3DomainMeta,
  Cpep3PgNormRow,
  Cpep3GnNormRow,
} from '@/types/cpep_3'

/**
 * CPEP-3（PEP-3 心理教育量表·中文修订版）题库与常模。
 * 由 scripts/convert-cpep3-data.mjs 从 export/CPEP-3/ 生成——勿手改，改数据后重跑转换脚本。
 * 源: export/CPEP-3/{cpep3_items,cpep3_pg_month_norms,cpep3_gn_fz_month_norms}.json
 * 已应用修正（设计文档 §1.4）: 「手言协调」→「手眼协调」；gn 表 developmentalQuotient→totalPassCount 语义纠正；
 * 28 题 taskName 剥离源软件错误粘贴的施测指示语（PEP-3 官方计分无 NA 规则，forbidden-pattern 见 verifier 5g）；
 * 4 道源库录入不全的施测题已人工补录恢复标准 P/E/F 三档（6B 判据由用户提供，2026-09-09）。
 * 施测题计分（任务书 §2.2）: P=2 / E=1 / F=0（常模换算输入仍为 P 通过计数，E 不计通过）；观察题严重度分: A=0 / M=1 / S=2。
 */

export const CPEP3_DOMAIN_DEFINITIONS: Cpep3DomainMeta[] = ${JSON.stringify(DOMAIN_META, null, 2)}

export const CPEP3_QUESTIONS: Cpep3QuestionData[] = `

const questionsTs = JSON.stringify(questions, null, 2)
const normsTs = `

export const CPEP3_PG_MONTH_NORMS: Cpep3PgNormRow[] = ${JSON.stringify(pgNormRows, null, 2)}

export const CPEP3_GN_FZ_MONTH_NORMS: Cpep3GnNormRow[] = ${JSON.stringify(gnNormRows, null, 2)}
`

writeFileSync(outFile, header + questionsTs + normsTs, 'utf8')

console.log(`生成 ${outFile}`)
console.log(`  题目: ${questions.length}（typo 修正 ${typoFixes} 处，NA 指示语剥离 ${naStripped} 题）`)
console.log(`  pg 常模: ${pgNormRows.length} 行 / gn 常模: ${gnNormRows.length} 行`)
console.log(`\n评分描述截断清单（${truncatedDescriptions.length} 条，源库录入时截断，计分不受影响，建议对照纸质手册人工补录）:`)
for (const t of truncatedDescriptions) {
  console.log(`  ${t.codeNo}(${t.level}): …${t.tail}`)
}
