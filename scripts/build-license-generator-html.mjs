/**
 * 构建 SCGP 激活码生成器 HTML 离线版（license-generator-dist/scgp-license-generator.html）
 *
 * 用法:
 *   node scripts/build-license-generator-html.mjs
 *
 * 说明:
 * - 从 license-generator-dist/.keys/private.pem 读取 PKCS#8 私钥，注入模板占位符 {{PRIVATE_KEY_PEM}}
 * - 产物为 standalone 单文件，双击即可在浏览器（Chrome/Edge 等 Chromium 内核）中离线生成激活码
 * - 产物内嵌签名私钥，仅供售后实施人员内部使用；产物不入库（见 .gitignore）
 * - 模板改动后需重新运行本脚本
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(here, '..', 'license-generator-dist')
const templatePath = resolve(distDir, 'generator.template.html')
const privateKeyPath = resolve(distDir, '.keys', 'private.pem')
const outputPath = resolve(distDir, 'scgp-license-generator.html')

const template = readFileSync(templatePath, 'utf8')
const privateKey = readFileSync(privateKeyPath, 'utf8').trim()

if (!template.includes('{{PRIVATE_KEY_PEM}}')) {
  throw new Error(`模板缺少 {{PRIVATE_KEY_PEM}} 占位符: ${templatePath}`)
}
if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
  throw new Error(`私钥文件无效（应为 PKCS#8 PEM）: ${privateKeyPath}`)
}

const html = template.replace('{{PRIVATE_KEY_PEM}}', privateKey)

if (html.includes('{{PRIVATE_KEY_PEM}}')) {
  throw new Error('注入失败：产物中仍存在占位符')
}

writeFileSync(outputPath, html, 'utf8')
console.log(`[build-license-generator-html] 已生成: ${outputPath}`)
console.log('[build-license-generator-html] 提示：产物内嵌签名私钥，请勿外传，勿提交版本库')
