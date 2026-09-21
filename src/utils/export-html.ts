import { saveAs } from 'file-saver'
import {
  cleanText,
  getWordExportReceiver,
  type WordExportPayload,
  type WordSection,
} from './export-word'

/**
 * HTML 报告导出——与 Word 导出共用同一 WordExportPayload。
 *
 * 目标：内联样式单文件 HTML（不依赖外部资源；头像转 data: URL 内嵌），
 * 样式对齐 Word 版观感（同一套配色/字体/表格样式常量）。
 * 下载走 getWordExportReceiver 拦截钩子（手册截图场景捕获），无钩子时 file-saver 落盘 .html。
 */

// 与 export-word.ts 同源的观感常量
const FONT_FAMILY = "'Microsoft YaHei', 'PingFang SC', sans-serif"
const TEXT_COLOR = '#333333'
const MUTED_COLOR = '#666666'
const HEADER_FILL = '#F5F7FA'
const BORDER_COLOR = '#CCCCCC'

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** 文本段落：Word 版同款 <br>→换行、去标签、去 Markdown 记号后按行拆段 */
function paragraphHtml(text: string): string {
  const normalized = cleanText(text)
  if (!normalized) return ''
  return normalized
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

function headingHtml(text: string, level: 1 | 2): string {
  const trimmed = cleanText(text)
  return trimmed ? `<h${level}>${escapeHtml(trimmed)}</h${level}>` : ''
}

function metaTableHtml(rows: Array<{ label: string; value: string }>): string {
  const body = rows
    .map(
      (row) =>
        `<tr><th class="meta-label">${escapeHtml(cleanText(row.label))}</th>` +
        `<td>${cellValueHtml(row.value)}</td></tr>`,
    )
    .join('')
  return `<table class="meta-table"><tbody>${body}</tbody></table>`
}

/** 单元格值：多行文本按 \n 拆段（对齐 Word 版 createCellParagraphs 行为） */
function cellValueHtml(value: string): string {
  const lines = cleanText(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return ''
  return lines.map((line) => `<p class="cell-line">${escapeHtml(line)}</p>`).join('')
}

function tableHtml(section: Extract<WordSection, { type: 'table' }>): string {
  const head = section.columns
    .map((column) => `<th>${escapeHtml(cleanText(column))}</th>`)
    .join('')
  const body = section.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cleanText(cell))}</td>`).join('')}</tr>`,
    )
    .join('')
  return `<table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function sectionHtml(section: WordSection): string {
  const heading = headingHtml(section.heading ?? '', 2)
  switch (section.type) {
    case 'paragraph':
      return heading + section.paragraphs.map((p) => paragraphHtml(p)).join('')
    case 'list':
      return (
        heading +
        `<ul>${section.items
          .map((item) => cleanText(item))
          .filter((item) => item)
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')}</ul>`
      )
    case 'kv-table':
      return heading + metaTableHtml(section.rows)
    case 'table':
      return heading + tableHtml(section)
  }
}

/** 头像 <img>：URL 转 data: URL 内嵌（失败静默不输出） */
async function avatarImgHtml(url?: string): Promise<string> {
  const trimmed = url?.trim() || ''
  if (!trimmed) return ''
  try {
    const response = await fetch(trimmed)
    if (!response.ok) return ''
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (bytes.length < 4) return ''
    // 仅内嵌 png/jpg（与 Word 版 detect 同一白名单）
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8
    if (!isPng && !isJpg) return ''
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const mime = isPng ? 'image/png' : 'image/jpeg'
    return (
      `<img class="avatar" src="data:${mime};base64,${btoa(binary)}" alt="学生头像" />`
    )
  } catch {
    return ''
  }
}

function buildHtmlDocument(payload: WordExportPayload, avatarImg: string): string {
  const subtitleHtml = payload.subtitle
    ? `<p class="subtitle">${escapeHtml(cleanText(payload.subtitle))}</p>`
    : ''
  const metaHtml =
    payload.meta && payload.meta.length > 0
      ? `${headingHtml('基本信息', 1)}${metaTableHtml(payload.meta)}`
      : ''
  const sectionsHtml = payload.sections.map((section) => sectionHtml(section)).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(cleanText(payload.title))}</title>
<style>
  body { margin: 0; padding: 40px 48px; font-family: ${FONT_FAMILY}; color: ${TEXT_COLOR}; font-size: 14px; line-height: 1.8; }
  .report-header { text-align: center; color: ${MUTED_COLOR}; font-size: 12px; padding-bottom: 8px; border-bottom: 1px solid ${BORDER_COLOR}; margin-bottom: 24px; }
  h1 { font-size: 20px; text-align: center; margin: 8px 0 16px; }
  h2 { font-size: 16px; margin: 24px 0 8px; }
  .title-block { position: relative; }
  .avatar { position: absolute; right: 0; top: 0; width: 94px; height: 132px; object-fit: cover; border: 1px solid ${BORDER_COLOR}; }
  .subtitle { text-align: center; color: ${MUTED_COLOR}; font-size: 13px; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  th, td { border: 1px solid ${BORDER_COLOR}; padding: 6px 10px; text-align: left; vertical-align: top; font-size: 13px; }
  .meta-table .meta-label { width: 28%; background: ${HEADER_FILL}; font-weight: bold; }
  .data-table thead th { background: ${HEADER_FILL}; font-weight: bold; text-align: center; }
  ul { margin: 8px 0 16px; padding-left: 24px; }
  li { margin: 4px 0; }
</style>
</head>
<body>
${cleanText(payload.headerText || '') ? `<div class="report-header">${escapeHtml(cleanText(payload.headerText))}</div>` : ''}
<div class="title-block">
${avatarImg}
<h1>${escapeHtml(cleanText(payload.title))}</h1>
</div>
${subtitleHtml}
${metaHtml}
${sectionsHtml}
</body>
</html>`
}

/**
 * 导出 HTML 报告：同一 WordExportPayload → 内联样式单文件 .html。
 * 优先走 getWordExportReceiver 拦截钩子（手册截图），否则 file-saver 下载。
 */
export async function exportHtmlDocument(payload: WordExportPayload): Promise<void> {
  const avatarImg = await avatarImgHtml(payload.avatarUrl)
  const html = buildHtmlDocument(payload, avatarImg)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const fileName = `${payload.filename}.html`
  const receiver = getWordExportReceiver()
  if (receiver) {
    await receiver(blob, fileName)
    return
  }
  saveAs(blob, fileName)
}
