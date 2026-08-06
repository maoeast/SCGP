/**
 * 差分更新验证脚本（只读分析，不实施任何改动）
 *
 * 对比新旧版本的 blockmap（electron-builder v2 格式：gzip 压缩的 JSON，
 * files[0].checksums 为 base64 的 block 哈希数组），按 electron-updater 的
 * block 级差分算法统计差分下载量：
 * - 相同哈希的 block 从本地旧文件拷贝，不下载
 * - 不同哈希的 block 需从服务器 Range 下载
 *
 * 用法: node scripts/analyze-differential.mjs <旧exe路径> <新exe路径>
 */
import { readFileSync, statSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import path from 'node:path'

const [, , oldExe, newExe] = process.argv
if (!oldExe || !newExe) {
  console.error('用法: node scripts/analyze-differential.mjs <旧 exe> <新 exe>')
  process.exit(1)
}

function parseBlockmap(exePath) {
  const bm = exePath.replace(/\.exe$/, '.exe.blockmap')
  if (!existsSync(bm)) throw new Error(`缺少 blockmap: ${bm}`)
  const json = JSON.parse(gunzipSync(readFileSync(bm)).toString('utf8'))
  if (Number(json.version) !== 2 || !json.files?.[0]?.checksums) {
    throw new Error(`不支持的 blockmap 格式: ${bm} (version=${json.version})`)
  }
  return { checksums: json.files[0].checksums, fileSize: statSync(exePath).size }
}

const oldBm = parseBlockmap(oldExe)
const newBm = parseBlockmap(newExe)

// blockSize 推断：总大小 / block 数（electron-updater 用同一规则反推）
const oldBlockSize = oldBm.fileSize / oldBm.checksums.length
const newBlockSize = newBm.fileSize / newBm.checksums.length

const oldSet = new Set(oldBm.checksums)
let same = 0
let diffBytes = 0
for (const c of newBm.checksums) {
  if (oldSet.has(c)) same++
  else diffBytes += newBlockSize
}
// 最后一块不满 blockSize，修正
const lastBlockPartial = newBm.fileSize - (newBm.checksums.length - 1) * newBlockSize
// 若最后一块是差异块，用实际大小
const lastIsDiff = !oldSet.has(newBm.checksums[newBm.checksums.length - 1])
if (lastIsDiff) {
  diffBytes = diffBytes - newBlockSize + lastBlockPartial
}

console.log('=== 差分更新分析（block 级，electron-updater 算法） ===')
console.log(`旧: ${path.basename(oldExe)} (${(oldBm.fileSize / 1048576).toFixed(1)} MB, ${oldBm.checksums.length} blocks, block≈${Math.round(oldBlockSize / 1024)}KB)`)
console.log(`新: ${path.basename(newExe)} (${(newBm.fileSize / 1048576).toFixed(1)} MB, ${newBm.checksums.length} blocks, block≈${Math.round(newBlockSize / 1024)}KB)`)
console.log(`相同 block: ${same} / ${newBm.checksums.length} (${((same / newBm.checksums.length) * 100).toFixed(1)}%)`)
console.log(`差分下载: ${(diffBytes / 1048576).toFixed(1)} MB`)
console.log(`对比全量: ${(newBm.fileSize / 1048576).toFixed(1)} MB → 差分 ${((diffBytes / newBm.fileSize) * 100).toFixed(1)}%`)
