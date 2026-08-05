import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { webcrypto } from 'node:crypto'

// HTML 离线激活码生成器契约：
// 1. 模板必须内联 Web Crypto 签名逻辑（RSASSA-PKCS1-v1_5 + SHA-256），与主程序验证端同算法
// 2. 必须支持导出 .lic 激活文件（Blob + <a download>）
// 3. 封装格式与 generate-license.js 一致：[4B 长度][JSON][签名] → base64 → SPED- 分组
// 4. 交叉验证：浏览器路径签名（Node webcrypto 模拟）与现有 Node crypto.sign 输出一致，
//    且能被公钥验证、能被主程序验证端格式解析

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..', '..')
const distDir = resolve(projectRoot, 'license-generator-dist')

const templatePath = resolve(distDir, 'generator.template.html')
const privateKeyPath = resolve(distDir, '.keys', 'private.pem')
const publicKeyPath = resolve(distDir, '.keys', 'public.pem')

const templateSource = readFileSync(templatePath, 'utf8')
const privateKeyPem = readFileSync(privateKeyPath, 'utf8')
const publicKeyPem = readFileSync(publicKeyPath, 'utf8')

test('template keeps the private key injection placeholder', () => {
  assert.match(templateSource, /\{\{PRIVATE_KEY_PEM\}\}/)
  assert.ok(privateKeyPem.includes('-----BEGIN PRIVATE KEY-----'), '私钥应为 PKCS#8 PEM')
})

test('template implements Web Crypto signing identical to the verifier', () => {
  assert.match(templateSource, /importKey\(\s*'pkcs8'/)
  assert.match(templateSource, /RSASSA-PKCS1-v1_5/)
  assert.match(templateSource, /SHA-256/)
  assert.match(templateSource, /crypto\.subtle\.sign/)
  assert.match(templateSource, /setUint32\(0, dataBuffer\.length, false\)/)
  assert.match(templateSource, /SPED-/)
  // 5 字符分组（与 generate-license.js formatLicenseKey 一致）
  assert.match(templateSource, /i \+= 5/)
})

test('template exports the .lic activation file via blob download', () => {
  assert.match(templateSource, /Blob\(\[formattedKey/)
  assert.match(templateSource, /createObjectURL/)
  assert.match(templateSource, /anchor\.download = filename/)
  assert.match(templateSource, /\.lic/)
})

test('browser-path signature matches Node generator signature and verifies with the public key', async () => {
  const licenseData = {
    t: 'trial',
    v: '1.0',
    c: 1754294400000,
    e: 1754899200000,
    m: '*',
    am: ['sensory_integration', 'emotional'],
  }
  const payload = JSON.stringify(licenseData)
  const dataBuffer = Buffer.from(payload, 'utf8')

  // 浏览器路径：Web Crypto（HTML 模板同款算法，PKCS#8 PEM → DER）
  const privateKeyDer = Buffer.from(
    privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\n/g, ''),
    'base64',
  )
  const privateKey = await webcrypto.subtle.importKey(
    'pkcs8',
    privateKeyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const webSignature = Buffer.from(
    await webcrypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, dataBuffer),
  )

  // 现有 Node 生成端：crypto.sign + RSA_PKCS1_PADDING
  const nodeSignature = crypto.sign('sha256', dataBuffer, {
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  })

  assert.deepEqual(webSignature, nodeSignature, '浏览器签名必须与 Node 生成端签名一致')
  assert.equal(
    crypto.verify('sha256', dataBuffer, publicKeyPem, webSignature),
    true,
    '浏览器签名必须能被公钥验证（主程序验证端同公钥）',
  )

  // 完整封装格式闭环：模拟 HTML 生成 → 模拟主程序解析验证
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(dataBuffer.length, 0)
  const combined = Buffer.concat([lengthBuffer, dataBuffer, webSignature])
  const base64Key = combined.toString('base64')

  const groups = base64Key.match(/.{1,5}/g)
  const formattedKey = 'SPED-' + groups.join('-')

  // 主程序 license-manager 等价解析路径
  const stripped = formattedKey.replace(/^SPED-/i, '').replace(/-/g, '')
  const decoded = Buffer.from(stripped, 'base64')
  const dataLength = decoded.readUInt32BE(0)
  const parsedPayload = decoded.slice(4, 4 + dataLength).toString('utf8')
  const signature = decoded.slice(4 + dataLength)

  assert.equal(parsedPayload, payload)
  assert.equal(crypto.verify('sha256', Buffer.from(parsedPayload), publicKeyPem, signature), true)
})
