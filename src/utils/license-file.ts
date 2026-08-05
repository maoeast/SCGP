/**
 * 激活文件导入解析
 *
 * 兼容两类激活文件：
 * - .lic（生成工具导出的激活密钥文件，内容为纯激活码一行）
 * - .txt（生成工具自动保存的摘要记录文件，内含「激活码: SPED-...」行）
 *
 * 解析只做格式提取，不做签名验证；签名验证仍走 LicenseManager 原有链。
 */

const LICENSE_KEY_PREFIX = 'SPED-'
const LICENSE_KEY_PATTERN = /SPED-[A-Za-z0-9+/=]+(?:-[A-Za-z0-9+/=]+)*/g

/**
 * 判断一段文本是否本身就是完整激活码（去除前后空白后）。
 * 与 LicenseManager.validateFormat 的口径一致：SPED- 前缀、base64 字符集、去分组后长度 >= 10。
 */
export function isLikelyLicenseKey(value: string): boolean {
  if (!value || !value.startsWith(LICENSE_KEY_PREFIX)) {
    return false
  }
  const remainder = value.slice(LICENSE_KEY_PREFIX.length).replace(/-/g, '')
  return /^[A-Za-z0-9+/=]+$/.test(remainder) && remainder.length >= 10
}

/**
 * 从任意文本中提取激活码。
 * 优先整串命中（.lic 纯激活码）；否则扫描文本中的 SPED- 序列（.txt 摘要文件），
 * 取第一个通过格式校验的候选。
 */
export function extractLicenseKeyFromText(text: string): string {
  if (!text || !text.trim()) {
    throw new Error('激活文件内容为空')
  }

  const trimmed = text.trim()
  if (isLikelyLicenseKey(trimmed)) {
    return trimmed
  }

  for (const match of trimmed.matchAll(LICENSE_KEY_PATTERN)) {
    const candidate = match[0]
    if (isLikelyLicenseKey(candidate)) {
      return candidate
    }
  }

  throw new Error('未在文件中找到有效激活码（SPED- 开头）')
}

/** 读取激活文件（.lic / .txt / 任意文本）并提取激活码。 */
export async function extractLicenseKeyFromFile(file: File): Promise<string> {
  if (!file) {
    throw new Error('未选择激活文件')
  }
  const text = await file.text()
  return extractLicenseKeyFromText(text)
}
