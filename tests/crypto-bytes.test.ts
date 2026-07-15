import assert from 'node:assert/strict'

import {
  encryptBytes,
  decryptBytes,
  encryptData,
  decryptData,
  md5Bytes,
} from '../src/utils/crypto.ts'

// 辅助：生成 n 个随机字节（含 0x00 / 0xFF 边界）
function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    arr[i] = Math.floor(Math.random() * 256)
  }
  return arr
}

// ---- round-trip：多种尺寸（覆盖 AES 块边界 16/17、空、大块）----
for (const size of [0, 1, 15, 16, 17, 255, 1024, 4096]) {
  const original = randomBytes(size)
  const payload = encryptBytes(original)
  const restored = decryptBytes(payload)
  assert.ok(restored !== null, `size=${size} 解密不应返回 null`)
  assert.equal(restored!.length, original.length, `size=${size} 长度应一致`)
  assert.deepEqual(
    Array.from(restored!),
    Array.from(original),
    `size=${size} 字节应逐位一致`,
  )
}

// ---- 显式 key round-trip ----
{
  const data = randomBytes(100)
  const payload = encryptBytes(data, 'custom-key-xyz')
  assert.deepEqual(Array.from(decryptBytes(payload, 'custom-key-xyz')!), Array.from(data))
}

// ---- 错误 key 不得还原原数据 ----
// AES-CBC 无 MAC，错误 key 可能产生合法 padding 的垃圾而非 null；只要求不等于原明文。
{
  const data = randomBytes(100)
  const payload = encryptBytes(data, 'custom-key-xyz')
  const wrong = decryptBytes(payload, 'wrong-key')
  const wrongEqualsOriginal =
    wrong !== null && JSON.stringify(Array.from(wrong)) === JSON.stringify(Array.from(data))
  assert.equal(wrongEqualsOriginal, false, '错误 key 不应还原原数据')
}

// ---- 边界字节：全 0xFF / 含 0x00（防被误当 UTF-8 字符串处理）----
{
  const data = new Uint8Array([0xff, 0x00, 0xfe, 0x01, 0x80, 0x7f, 0xff, 0xff, 0x00, 0x00])
  assert.deepEqual(Array.from(decryptBytes(encryptBytes(data))!), Array.from(data))
}

// ---- 密文形态：base64 字符串，非原明文、非数组 toString ----
{
  const data = new Uint8Array([1, 2, 3, 4, 5])
  const payload = encryptBytes(data)
  assert.equal(typeof payload, 'string')
  assert.ok(payload.length > 0)
  assert.ok(!payload.includes(','), '密文不应含逗号（非数组 toString）')
  assert.ok(payload !== Array.from(data).join(), '密文不应等于明文')
}

// ---- 与 encryptData/decryptData 各自自洽（两条加密路径独立、正确）----
{
  const obj = { a: 1, b: '中文' }
  assert.deepEqual(decryptData(encryptData(obj)), obj)

  const bytes = randomBytes(64)
  assert.deepEqual(Array.from(decryptBytes(encryptBytes(bytes))!), Array.from(bytes))
}

// ---- 空 payload 确定 → null；非法 payload 不抛错 ----
assert.equal(decryptBytes(''), null)
const junk = decryptBytes('not-a-valid-ciphertext')
assert.ok(junk === null || junk instanceof Uint8Array, '非法 payload 不应抛错')

// ---- md5Bytes：确定性、同入同出、异入异出、32 字符 hex ----
{
  const a = new Uint8Array([1, 2, 3])
  const b = new Uint8Array([1, 2, 3])
  const c = new Uint8Array([1, 2, 4])
  const ha = md5Bytes(a)
  assert.equal(typeof ha, 'string')
  assert.equal(ha.length, 32, 'MD5 hex 应为 32 字符')
  assert.equal(ha, md5Bytes(b), '相同输入应得相同 MD5')
  assert.notEqual(ha, md5Bytes(c), '不同输入应得不同 MD5')
}

console.log('crypto-bytes test passed')
