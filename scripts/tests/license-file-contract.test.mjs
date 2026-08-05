import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

// 激活文件导入解析契约：
// - .lic（纯激活码一行）与 .txt（生成工具摘要文件，含「激活码: SPED-...」行）均可导入
// - 提取只做格式校验，签名验证仍由 LicenseManager 原有链完成

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

const { extractLicenseKeyFromText, isLikelyLicenseKey } = jiti('../../src/utils/license-file.ts')

// 示例激活码：仅用于格式测试，不参与签名验证
const SAMPLE_KEY = 'SPED-abcde-fghij-klmno-pqrst-uvwxy-ABCDE-FGHIJ-KLMNO-PQRST-UVWXY-12345-67890-+/=01-23456-789ab-cdefg-hijk'

test('pure .lic content (single license key line) is extracted as-is', () => {
  assert.equal(extractLicenseKeyFromText(SAMPLE_KEY), SAMPLE_KEY)
  assert.equal(extractLicenseKeyFromText(`${SAMPLE_KEY}\n`), SAMPLE_KEY)
  assert.equal(extractLicenseKeyFromText(`  ${SAMPLE_KEY}  `), SAMPLE_KEY)
})

test('generator .txt summary file format is extracted', () => {
  const txtContent = [
    '激活码类型: 正式版',
    '机器码: ABC123DEF456',
    '有效期: 365天',
    '创建时间: 2026/8/4 10:00:00',
    '过期时间: 2027/8/4 10:00:00',
    '授权能力包: sensory_integration, emotional',
    '',
    '激活码:',
    SAMPLE_KEY,
    '',
  ].join('\n')

  assert.equal(extractLicenseKeyFromText(txtContent), SAMPLE_KEY)
})

test('noisy surrounding text still yields the license key', () => {
  const noisy = `客户微信转发内容……\n附件如下：\n${SAMPLE_KEY}\n（请查收）`
  assert.equal(extractLicenseKeyFromText(noisy), SAMPLE_KEY)
})

test('empty or keyless text throws a friendly error', () => {
  assert.throws(() => extractLicenseKeyFromText(''), /激活文件内容为空/)
  assert.throws(() => extractLicenseKeyFromText('   \n  '), /激活文件内容为空/)
  assert.throws(() => extractLicenseKeyFromText('这里没有任何激活码'), /未在文件中找到有效激活码/)
})

test('placeholder-like SPED- text is rejected, not extracted', () => {
  // 占位符「SPED-XXXX-XXXX...」去分组后不足 10 字符，应被跳过并报错
  assert.throws(() => extractLicenseKeyFromText('格式：SPED-XXXX-XXXX...'), /未在文件中找到有效激活码/)
})

test('isLikelyLicenseKey guards prefix, charset and minimum length', () => {
  assert.equal(isLikelyLicenseKey(SAMPLE_KEY), true)
  assert.equal(isLikelyLicenseKey('SPED-' + 'a'.repeat(10)), true)
  assert.equal(isLikelyLicenseKey('SPED-' + 'a'.repeat(9)), false)
  assert.equal(isLikelyLicenseKey('SPED-xxxx...'), false)
  assert.equal(isLikelyLicenseKey('NOTSPED-abcdefghij'), false)
  assert.equal(isLikelyLicenseKey('sped-abcdefghij'), false)
  assert.equal(isLikelyLicenseKey(''), false)
})
