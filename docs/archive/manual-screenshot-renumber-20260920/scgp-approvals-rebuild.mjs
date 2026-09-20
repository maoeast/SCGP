/**
 * 重建 screenshot-approvals.json：sha256 按修复后的实际文件重算，runId 还原为真实采集来源
 * （09-10 重编号把 131 条统一刷成 renumber-20260910，丢失了原始 run 溯源）。
 * 来源：3e871e6~1 的 approvals（旧 211 条真实 runId）+ 现行 approvals（09-10 的 6 张新采 + 3 张重拍）。
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import crypto from 'node:crypto'

const ROOT = 'F:/Projects/SCGP'
const PARENT = '3e871e6~1'
const INS = [80, 81, 176, 177, 190, 210]
const insSet = new Set(INS)
const id = (x) => `S${String(x).padStart(3, '0')}`
const dir = `${ROOT}/docs/user-manual/screenshots`
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const fileSha = (x) => sha(fs.readFileSync(`${dir}/${id(x)}.png`))
const k = (n) => INS.filter((x) => x <= n).length
const oldToNew = (n) => { let t = n; for (let i = 0; i < 12; i += 1) { const nx = n + k(t); if (nx === t) break; t = nx } return t }

const parent = JSON.parse(execSync(`git show ${PARENT}:docs/user-manual/screenshot-approvals.json`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
const current = JSON.parse(fs.readFileSync(`${ROOT}/docs/user-manual/screenshot-approvals.json`, 'utf8'))
const parentById = new Map(parent.approvals.map((e) => [e.id, e]))
const curById = new Map(current.approvals.map((e) => [e.id, e]))

// 09-10 的重拍件占用的新槽位（其 runId 取现行记录）
const RECAPTURED_SLOTS = new Set([40, 41, 148])

const approvals = []
for (let p = 1; p <= 217; p += 1) {
  let runId
  if (insSet.has(p) || RECAPTURED_SLOTS.has(p)) {
    runId = curById.get(id(p))?.runId
  } else {
    const src = [...parentById.keys()].find((oldId) => oldToNew(Number(oldId.slice(1))) === p)
    runId = src ? parentById.get(src).runId : undefined
  }
  if (!runId) throw new Error(`${id(p)} 无法确定 runId`)
  approvals.push({ id: id(p), runId, sha256: fileSha(p) })
}

const out = { schemaVersion: 1, updatedAt: new Date().toISOString(), approvals }
fs.writeFileSync(`${ROOT}/docs/user-manual/screenshot-approvals.json`, `${JSON.stringify(out, null, 2)}\n`)

const dist = new Map()
for (const e of approvals) dist.set(e.runId, (dist.get(e.runId) || 0) + 1)
console.log(`已重建 approvals：${approvals.length} 条`)
console.log('runId 分布（前 12）:')
for (const [r, c] of [...dist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${r.padEnd(42)} ${c} 条`)
console.log(`  … 共 ${dist.size} 个 run`)
