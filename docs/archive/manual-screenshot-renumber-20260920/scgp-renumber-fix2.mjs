/**
 * 补正：S148 是 09-10 的重拍件（占用新槽位 148），其旧内容（旧场景 148）应归位到新 S150。
 * 前一轮批量搬移按通用规则把 S146→S148、S148→S150，覆盖了重拍件并错置了 S150，此处回正。
 * 完成后做 217 槽位全量断言。
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import crypto from 'node:crypto'

const ROOT = 'F:/Projects/SCGP'
const PARENT = '3e871e6~1'
const DIR = `${ROOT}/docs/user-manual/screenshots`
const REL = 'docs/user-manual/screenshots'
const INS = [80, 81, 176, 177, 190, 210]
const insSet = new Set(INS)
const RECAPTURE_AT = new Map([[40, 40], [41, 41], [148, 146]]) // 新槽位 ← 旧编号（重拍件）
const id = (x) => `S${String(x).padStart(3, '0')}`
const p = (x) => `${DIR}/${id(x)}.png`
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const fileSha = (x) => sha(fs.readFileSync(p(x)))
const buf = (ref, x) => Buffer.from(execSync(`git show ${ref}:${REL}/${id(x)}.png`, { cwd: ROOT, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 }))
const k = (n) => INS.filter((x) => x <= n).length
const oldToNew = (n) => { let t = n; for (let i = 0; i < 12; i += 1) { const nx = n + k(t); if (nx === t) break; t = nx } return t }

// --- 补正两步 ---
fs.writeFileSync(p(148), buf('HEAD', 148))          // 恢复 09-10 重拍件
fs.writeFileSync(p(150), buf(PARENT, 148))          // 旧场景 148 的原始内容 → 新 150
console.log('已补正：S148 ← HEAD 重拍件；S150 ← 父提交 S148（旧场景 148）')

// --- 全量断言 ---
const expected = new Map()
for (let n = 1; n <= 211; n += 1) {
  const t = oldToNew(n)
  expected.set(t, RECAPTURE_AT.has(t) ? fileSha(t) : sha(buf(PARENT, n)))
}
for (const x of INS) expected.set(x, fileSha(x))
// 重拍件按 HEAD 校验
expected.set(148, sha(buf('HEAD', 148)))
expected.set(40, sha(buf('HEAD', 40)))
expected.set(41, sha(buf('HEAD', 41)))
// 旧 148 的内容归位到 150
expected.set(150, sha(buf(PARENT, 148)))

const bad = []
for (let x = 1; x <= 217; x += 1) {
  if (!fs.existsSync(p(x))) { bad.push(`${id(x)} 缺失`); continue }
  if (fileSha(x) !== expected.get(x)) bad.push(`${id(x)} 内容不符`)
}
const files = fs.readdirSync(DIR).filter((f) => /^S\d{3}\.png$/.test(f))
console.log(bad.length === 0
  ? `✅ 217/217 槽位内容与期望一致；目录文件数 ${files.length}`
  : `❌ ${bad.length} 处异常：${bad.join(', ')}`)
