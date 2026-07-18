#!/usr/bin/env node
/**
 * SCGP 打包产物校验
 *
 * 防止 release/latest.yml 被误写成 exe 内容（曾发生：519.9M exe 二进制冒充 yaml，
 * 客户端拿 exe 当 yaml 解析、更新失败）。校验 latest.yml 是合法 yaml，且
 * sha512 / size / version 与 exe 实际一致。
 *
 * 用法: npm run release:verify
 */
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const releaseDir = path.join(repoRoot, 'release')

const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const version = pkg.version

const exeName = `scgp-setup-${version}.exe`
const exePath = path.join(releaseDir, exeName)
const blockmapPath = path.join(releaseDir, `${exeName}.blockmap`)
const ymlPath = path.join(releaseDir, 'latest.yml')

let failures = 0
const check = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) failures++
}

console.log(`版本: ${version}\n`)

// 1. 文件存在
check(existsSync(exePath), `exe 存在: release/${exeName}`)
check(existsSync(blockmapPath), `blockmap 存在: release/${exeName}.blockmap`)
check(existsSync(ymlPath), 'latest.yml 存在')

if (!existsSync(ymlPath)) {
  console.log('\n❌ latest.yml 不存在，无法校验')
  process.exit(1)
}

// 2. latest.yml 是 yaml 不是 exe（防今天的坑）
const ymlStat = statSync(ymlPath)
check(
  ymlStat.size < 2048,
  `latest.yml 是小 yaml（${ymlStat.size} 字节 < 2KB），不是被 exe 内容覆盖`,
)

const ymlText = readFileSync(ymlPath, 'utf8')
const versionField = ymlText.match(/^version:\s*(.+)$/m)
check(!!versionField, 'latest.yml 有 version 字段')
if (versionField) {
  check(
    versionField[1].trim() === version,
    `latest.yml version (${versionField[1].trim()}) == package.json (${version})`,
  )
}

// 3. sha512 + size 与 exe 实际一致
if (existsSync(exePath)) {
  const exeStat = statSync(exePath)

  const sizeField = ymlText.match(/size:\s*(\d+)/)
  if (sizeField) {
    check(
      Number(sizeField[1]) === exeStat.size,
      `exe size (${exeStat.size}) == latest.yml (${sizeField[1]})`,
    )
  } else {
    check(false, 'latest.yml 缺 size 字段')
  }

  const shaField = ymlText.match(/sha512:\s*(\S+)/)
  if (!shaField) {
    check(false, 'latest.yml 缺 sha512 字段')
  } else {
    const actual = await new Promise((resolve) => {
      const h = createHash('sha512')
      createReadStream(exePath)
        .on('data', (d) => h.update(d))
        .on('end', () => resolve(h.digest('base64')))
    })
    check(actual === shaField[1], 'exe sha512 == latest.yml sha512')
  }
}

console.log('')
if (failures === 0) {
  console.log(`✅ 产物校验通过（版本 ${version}），可上传部署`)
} else {
  console.log(
    `❌ ${failures} 项校验失败。若 latest.yml 损坏，按 SKILL（release-deploy）里的模板重建（用 exe 真实 sha512/size）。`,
  )
  process.exit(1)
}
