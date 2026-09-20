/**
 * 一次性数据修正：ABC 遗留演示行的 dimension_scores
 *
 * 背景（2026-09-20 修复 ABC 报告维度表时发现）：
 * 2026-09 前的演示数据把维度分写成对象 `{ name, rawScore }`，并包含题库里没有题目的
 * 「生活自理」维度且把它计入了总分——造成报告页「得分」列渲染成 JSON、占比 NaN，
 * 以及表内四维之和 ≠ 总分（如学生 10013：88 = 71 + 17）。
 * 读取期兜底已在 `normalizeABCDimensionScores`（报告页）与 flat-number 归一化（AI 趋势）落地，
 * 本脚本把**存量行本身**改成自洽的契约形状：题库 4 维数字 + 总分 = 各维之和 + 等级按 getABCLevel 重算。
 *
 * 运行（默认 dry-run，只打印不写库）：
 *   npx jiti scripts/fix-legacy-abc-dimension-scores.ts
 * 落库（先自动备份到同目录 `.bak-<时间戳>`，**运行前必须关闭 SCGP 应用**——
 * 应用内 sql.js 持有内存副本，边跑边写会被它的下次保存覆盖或互相污染）：
 *   npx jiti scripts/fix-legacy-abc-dimension-scores.ts --apply
 *
 * 幂等：无变化不写库；真实评估行（数字形状、总分/等级自洽）不会被改动。
 */
import { copyFileSync, existsSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ABC_SUBSCALE_MAX_SCORES,
  getABCLevel,
  normalizeABCDimensionScores,
  type ABCDimensionCode,
} from '../src/database/abc-questions.ts'

type SqlDatabase = { exec: (sql: string) => any[]; run: (sql: string, params: any[]) => void; export: () => Uint8Array }

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const dbArg = args.find((arg) => arg.startsWith('--db='))
const dbPath =
  (dbArg ? dbArg.slice('--db='.length) : '') ||
  join(process.env.APPDATA ?? '', 'scgp', 'database.sqlite')

/** 题库里真实存在题目的维度（满分 > 0）；满分 0 的维度视为已下线，不写回 */
const BANK_CODES = (Object.keys(ABC_SUBSCALE_MAX_SCORES) as ABCDimensionCode[]).filter(
  (code) => ABC_SUBSCALE_MAX_SCORES[code] > 0,
)

interface Plan {
  id: number
  studentId: number
  reason: string[]
  beforeTotal: number
  afterTotal: number
  beforeLevel: string
  afterLevel: string
  afterJson: string
}

function buildTarget(parsed: unknown): { scores: number[]; total: number; level: string; json: string } {
  const normalized = normalizeABCDimensionScores(parsed)
  const scores = BANK_CODES.map((code) => normalized[code])
  const total = scores.reduce((sum, score) => sum + score, 0)
  const payload: Record<string, number> = {}
  BANK_CODES.forEach((code, index) => {
    payload[code] = scores[index]
  })
  return { scores, total, level: getABCLevel(total), json: JSON.stringify(payload) }
}

async function main() {
  if (!existsSync(dbPath)) {
    console.error(`✗ 找不到数据库：${dbPath}`)
    process.exitCode = 1
    return
  }
  console.log(`数据库：${dbPath}（${statSync(dbPath).size} 字节）`)
  console.log(apply ? '模式：APPLY（会写库，先备份）' : '模式：dry-run（只读）')

  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs({ locateFile: (file: string) => `node_modules/sql.js/dist/${file}` })
  const db = new SQL.Database(readFileSync(dbPath)) as SqlDatabase

  const rows = db.exec(
    'SELECT id, student_id, dimension_scores, total_score, level FROM abc_assess ORDER BY id',
  )[0]
  const plans: Plan[] = []
  let scanned = 0

  for (const value of rows?.values ?? []) {
    scanned += 1
    const [id, studentId, rawJson, storedTotal, storedLevel] = value as [
      number,
      number,
      string,
      number,
      string,
    ]
    const parsed = rawJson ? JSON.parse(rawJson) : null
    const target = buildTarget(parsed)
    const reasons: string[] = []

    const legacyShape = Object.values((parsed ?? {}) as Record<string, unknown>).some(
      (v) => v !== null && typeof v === 'object',
    )
    if (legacyShape) reasons.push('对象形状')

    const nonBankNonZero = Object.entries((parsed ?? {}) as Record<string, unknown>).some(
      ([key, v]) =>
        !BANK_CODES.includes(key as ABCDimensionCode) && typeof v === 'number' && v !== 0,
    )
    if (nonBankNonZero) reasons.push('含题库外维度分且计入总分')

    if (storedTotal !== target.total) reasons.push(`总分 ${storedTotal} ≠ 各维之和 ${target.total}`)
    if (storedLevel !== target.level) reasons.push(`等级 ${storedLevel} ≠ ${target.level}`)

    if (reasons.length > 0) {
      plans.push({
        id,
        studentId,
        reason: reasons,
        beforeTotal: storedTotal,
        afterTotal: target.total,
        beforeLevel: storedLevel,
        afterLevel: target.level,
        afterJson: target.json,
      })
    }
  }

  console.log(`\n扫描 ${scanned} 行，需修正 ${plans.length} 行`)
  for (const plan of plans) {
    console.log(
      `  #${plan.id} 学生 ${plan.studentId}：总分 ${plan.beforeTotal} → ${plan.afterTotal}｜` +
        `等级 ${plan.beforeLevel} → ${plan.afterLevel}｜原因：${plan.reason.join('、')}`,
    )
  }

  if (plans.length === 0) {
    console.log('\n无需修改（已是契约形状且总分/等级自洽）。')
    return
  }
  if (!apply) {
    console.log('\n（dry-run 结束，未写库；加 --apply 落库，落库前请先关闭 SCGP 应用）')
    return
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)
  const backupPath = `${dbPath}.bak-${stamp}`
  copyFileSync(dbPath, backupPath)
  console.log(`\n已备份：${backupPath}`)

  for (const plan of plans) {
    db.run('UPDATE abc_assess SET dimension_scores = ?, total_score = ?, level = ? WHERE id = ?', [
      plan.afterJson,
      plan.afterTotal,
      plan.afterLevel,
      plan.id,
    ])
  }

  const tempPath = `${dbPath}.tmp-${stamp}`
  writeFileSync(tempPath, Buffer.from(db.export()))
  renameSync(tempPath, dbPath)
  console.log(`已写入 ${plans.length} 行；数据库大小 ${statSync(dbPath).size} 字节`)
}

await main()
