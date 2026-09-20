/**
 * 一次性修复：2026-09-10 重编号只改 approvals、未改文件名，导致图/图注系统性错位。
 * 依据：3e871e6~1（211 行 plan）→ 3e871e6（217 行 plan）的 6 处插行 S080/S081/S176/S177/S190/S210。
 * 规则：新槽位 p 的内容 = 旧场景 n 的图，n = p - k(p)，k(p) = 位置 ≤ p 的插行数。
 *      old n → new t：t = n + k(t)，即 80..173→+2、174..185→+4、186..204→+5、205..211→+6。
 * 期望内容全部由父提交（3e871e6~1）推导，不依赖当前工作区的乱序状态。
 * 用法：node scgp-renumber-fix.mjs [--apply]（默认 dry-run）
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import crypto from 'node:crypto'

const APPLY = process.argv.includes('--apply')
const ROOT = 'F:/Projects/SCGP'
const PARENT = '3e871e6~1'
const DIR = `${ROOT}/docs/user-manual/screenshots`
const REL = 'docs/user-manual/screenshots'
const INS = [80, 81, 176, 177, 190, 210]
const insSet = new Set(INS)
const RECAPTURED = new Set([40, 41, 146]) // 09-10 重拍；146 → 归位到 148
const id = (x) => `S${String(x).padStart(3, '0')}`
const path = (x) => `${DIR}/${id(x)}.png`
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const curSha = (x) => sha(fs.readFileSync(path(x)))
const parentSha = (x) => sha(Buffer.from(execSync(`git show ${PARENT}:${REL}/${id(x)}.png`, { cwd: ROOT, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 })))
const parentBuf = (x) => Buffer.from(execSync(`git show ${PARENT}:${REL}/${id(x)}.png`, { cwd: ROOT, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 }))
const k = (p) => INS.filter((x) => x <= p).length
// t = n + k(t) 的不动点迭代（k 依赖 t，故不能一次算出）
const oldToNew = (n) => {
  let t = n
  for (let i = 0; i < 12; i += 1) {
    const next = n + k(t)
    if (next === t) break
    t = next
  }
  return t
}

// ---- 期望终态 ----
const expected = new Map()
for (let n = 1; n <= 211; n += 1) {
  const t = oldToNew(n)
  expected.set(t, RECAPTURED.has(n) ? curSha(t) : parentSha(n))
}
for (const x of INS) expected.set(x, curSha(x)) // 本次新采，保持不动
if (expected.size !== 217) throw new Error(`期望表条数异常: ${expected.size}`)

// ---- 操作清单（降序，先腾出目的地） ----
const ops = []
for (let p = 217; p >= 1; p -= 1) {
  if (insSet.has(p) || p <= 79 || (p >= 212 && p <= 217)) continue
  const src = p - k(p)
  if (src < 1 || src > 211) continue
  ops.push({ src, dst: p, type: insSet.has(src) ? 'restore' : 'move' })
}
console.log(`操作清单：move ${ops.filter((o) => o.type === 'move').length} 条，restore ${ops.filter((o) => o.type === 'restore').length} 条`)
console.log('restore 明细：', ops.filter((o) => o.type === 'restore').map((o) => `${id(o.src)}(git历史) → ${id(o.dst)}`).join('  '))

// 前置：目的地若已占位，必须是自己会被搬走（同批 src）或内容已在别处
for (const o of ops) {
  if (!fs.existsSync(path(o.dst))) continue
  if (o.dst >= 212 && o.dst <= 217) continue
  const freedByOwnMove = ops.some((x) => x.src === o.dst)
  const safeElsewhere = [...expected.entries()].some(([q, h]) => q !== o.dst && h === curSha(o.dst) && fs.existsSync(path(q)) && curSha(q) === h)
  if (!freedByOwnMove && !safeElsewhere) throw new Error(`目的地 ${id(o.dst)} 会被覆盖且其内容无处安放，中止`)
}

if (!APPLY) {
  console.log('\n=== DRY-RUN（未改动任何文件）===')
  const already = [...expected.entries()].filter(([p, h]) => fs.existsSync(path(p)) && curSha(p) === h).length
  console.log(`当前槽位内容与期望一致：${already} / 217`)
  process.exit(0)
}

// ---- 执行 ----
let moved = 0, restored = 0, removedDup = 0
for (const o of ops) {
  if (o.type === 'move') {
    if (fs.existsSync(path(o.dst)) && curSha(o.dst) === expected.get(o.dst)) continue // 已就位
    if (fs.existsSync(path(o.src)) && fs.existsSync(path(o.dst))) { fs.unlinkSync(path(o.dst)); removedDup += 1 }
    fs.renameSync(path(o.src), path(o.dst))
    moved += 1
  } else {
    if (fs.existsSync(path(o.dst)) && curSha(o.dst) === expected.get(o.dst)) continue
    if (fs.existsSync(path(o.dst))) { fs.unlinkSync(path(o.dst)); removedDup += 1 }
    fs.writeFileSync(path(o.dst), parentBuf(o.src))
    restored += 1
  }
}
console.log(`执行完成：move ${moved}、restore ${restored}、清理冗余副本 ${removedDup}`)

// ---- 终态断言 ----
let bad = []
for (let p = 1; p <= 217; p += 1) {
  if (!fs.existsSync(path(p))) { bad.push(`${id(p)} 缺失`); continue }
  if (curSha(p) !== expected.get(p)) bad.push(`${id(p)} 内容不符`)
}
const files = fs.readdirSync(DIR).filter((f) => /^S\d{3}\.png$/.test(f))
console.log(bad.length === 0 ? `✅ 217/217 槽位内容与期望完全一致；目录文件数 ${files.length}` : `❌ ${bad.length} 处异常：\n${bad.slice(0, 20).join('\n')}`)
