/**
 * 报告导出统一分发层（report-export / export-html / export-word 页眉头像扩展）测试
 *
 * 运行：npx jiti tests/report-export.test.ts
 *
 * 背景（2026-09-21，T26）：系统设置→报告设置三项（页眉/头像/默认格式）此前只存不用。
 * 本次做实：exportReport 统一分发（19 个 Report.vue），Word 导出注入 docx Header + 头像
 * ImageRun，新增内联样式 HTML 导出，默认格式语义 pdf/word → word/html（存量 'pdf' 兼容读作
 * word，DB 值不改）。AI 链（ai-tools.ts/AiAssistant.vue）不经本层，固定 exportWordDocument。
 *
 * 覆盖：
 *  1. normalizeReportExportFormat：'pdf'→'word'（存量兼容）、'html'/'word' 直通、脏值→'word'
 *  2. HTML 导出：同一 payload 生成内联样式单文件 .html，含页眉文本、头像 <img>（data: URL 内嵌）
 *  3. HTML 导出：cleanText 语义（Markdown 记号清除）、HTML 转义
 *  4. 头像过滤链：legacy 生成头像（短 data: png）静默跳过；开关关闭不查不嵌
 *  5. Word 导出：页眉文字注入 word/header1.xml（含底部分隔线）；空页眉不产生 header1.xml
 *  6. Word 导出：头像开 → word/media/ 有 png；'pdf' 存量值分发到 .docx
 *  7. 拦截钩子 getWordExportReceiver：HTML 与 Word 同走 window.__SCGP_MANUAL_CAPTURE_EXPORT_WORD__
 *
 * 测试经 jiti alias 把 '@/database/init' 指到内存夹具（init.ts 依赖 vite 的 ?raw 导入，
 * node 下不可加载）；initDatabase 动态读 globalThis 夹具表，模拟 system_config / student 查询。
 */
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'
import { unzipSync } from 'fflate'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const ROOT = process.cwd().replace(/\\/g, '/')

// ---------- 夹具：内存版 initDatabase（动态读 globalThis，可逐场景切换） ----------
const FIXTURE_PATH = path.join(os.tmpdir(), 'report-export-db-fixture.test.mjs').replace(/\\/g, '/')
fs.writeFileSync(
  FIXTURE_PATH,
  `export async function initDatabase() {
  const rows = globalThis.__REPORT_EXPORT_TEST_DB__ || []
  const avatars = globalThis.__REPORT_EXPORT_TEST_AVATARS__ || {}
  return {
    get(sql, params = []) {
      const m = sql.match(/FROM (\\w+)/)
      const table = m ? m[1] : ''
      if (table === 'system_config') {
        const hit = rows.find(([k]) => k === params[0])
        return hit ? { value: hit[1] } : undefined
      }
      if (table === 'student') {
        const id = String(params[0])
        return id in avatars ? { avatar_path: avatars[id] } : undefined
      }
      return undefined
    },
  }
}
`,
)

// 合法 data: png 且长度 >12000（绕过 legacy 生成头像判定，见 student-display.ts）
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const REAL_AVATAR = `data:image/png;base64,${TINY_PNG_B64.slice(0, -2)}${'A'.repeat(12196)}==`

// node 无 window：提供拦截钩子（与手册截图脚本同款契约）
const captured: Array<{ blob: Blob; fileName: string }> = []
;(globalThis as any).window = {
  __SCGP_MANUAL_CAPTURE_EXPORT_WORD__: async (blob: Blob, fileName: string) => {
    captured.push({ blob, fileName })
  },
}

const jiti = createJiti(import.meta.url, {
  alias: { '@': path.resolve(ROOT, 'src'), '@/database/init': FIXTURE_PATH },
})
const { exportReport, normalizeReportExportFormat } = (await jiti.import(`${ROOT}/src/utils/report-export.ts`)) as {
  exportReport: (payload: unknown, options?: unknown) => Promise<void>
  normalizeReportExportFormat: (value: unknown) => 'word' | 'html'
}

const PAYLOAD = {
  title: '测试评估报告',
  subtitle: '副标题',
  filename: 'test-report',
  meta: [{ label: '姓名', value: '小明' }],
  sections: [
    { type: 'paragraph', heading: '一、概况', paragraphs: ['第一段**加粗**文字'] },
    { type: 'list', items: ['建议甲', '建议乙'] },
    { type: 'kv-table', rows: [{ label: '总分', value: '88' }] },
    { type: 'table', columns: ['维度', '得分'], rows: [['感觉', '38']] },
  ],
}

function setConfig(rows: Array<[string, string]>) {
  ;(globalThis as any).__REPORT_EXPORT_TEST_DB__ = rows
}

async function textOf(i: number): Promise<string> {
  return captured[i].blob.text()
}

async function unzipAt(i: number) {
  return unzipSync(new Uint8Array(await captured[i].blob.arrayBuffer()))
}

// ---------- 1. normalizeReportExportFormat：'pdf' 存量兼容（验收标准 5） ----------
{
  assert.equal(normalizeReportExportFormat('pdf'), 'word', "存量 'pdf' 值兼容读作 word")
  assert.equal(normalizeReportExportFormat('html'), 'html')
  assert.equal(normalizeReportExportFormat('word'), 'word')
  assert.equal(normalizeReportExportFormat(undefined), 'word', '空值默认 word')
  assert.equal(normalizeReportExportFormat(''), 'word', '脏值归 word')
  assert.equal(normalizeReportExportFormat('PDF'), 'word', '大小写不符的历史脏值归 word')
  console.log('1. normalizeReportExportFormat (pdf→word 兼容) OK')
}

// ---------- 2. HTML 导出：页眉 + 头像 + 内联样式单文件 ----------
{
  setConfig([
    ['report_header', '星愿能力发展平台'],
    ['include_student_avatar', 'true'],
    ['default_report_format', 'html'],
  ])
  ;(globalThis as any).__REPORT_EXPORT_TEST_AVATARS__ = { 7: REAL_AVATAR, 8: 'data:image/png;base64,AAAA' }
  await exportReport(PAYLOAD, { studentId: 7 })

  assert.equal(captured[0].fileName, 'test-report.html', 'HTML 导出文件后缀 .html')
  const html = await textOf(0)
  assert.ok(html.includes('<!DOCTYPE html>'), '完整 HTML 文档')
  assert.ok(html.includes('星愿能力发展平台'), '页眉文本渲染进 HTML 页眉条')
  assert.ok(html.includes('class="avatar" src="data:image/png'), '头像转 data: URL 内嵌 <img>')
  assert.ok(html.includes('<h1>测试评估报告</h1>'), '标题渲染')
  assert.ok(html.includes('<table class="data-table"'), '数据表渲染')
  assert.ok(html.includes('<table class="meta-table"'), '基本信息 kv 表渲染')
  console.log('2. HTML 导出（页眉条/头像 img/内联样式单文件）OK')
}

// ---------- 3. cleanText 与 HTML 转义语义 ----------
{
  const html = await textOf(0)
  assert.ok(html.includes('第一段加粗文字') && !html.includes('**'), 'Markdown 记号清除（与 Word 版同源 cleanText）')
  assert.ok(!html.includes('<script'), '不含未转义脚本注入面')
  console.log('3. cleanText / 转义语义 OK')
}

// ---------- 4. 头像降级链：legacy 头像过滤 + 开关关闭 ----------
{
  // legacy 生成头像（短 data: png）→ 静默跳过
  await exportReport({ ...PAYLOAD, filename: 'legacy-avatar' }, { studentId: 8 })
  const legacyHtml = await textOf(1)
  assert.ok(!legacyHtml.includes('class="avatar"'), 'legacy 生成头像不渲染')

  // 开关关闭 → 不嵌头像
  setConfig([
    ['report_header', 'H'],
    ['include_student_avatar', 'false'],
    ['default_report_format', 'html'],
  ])
  await exportReport({ ...PAYLOAD, filename: 'avatar-off' }, { studentId: 7 })
  const offHtml = await textOf(2)
  assert.ok(!offHtml.includes('class="avatar"'), '头像开关关闭时不渲染头像')
  console.log('4. 头像降级链（legacy 过滤/开关关闭）OK')
}

// ---------- 5/6. Word 导出：页眉注入 / 空页眉不渲染 / 头像 media / 'pdf'→.docx ----------
{
  // 'pdf' 存量值 → word 链（.docx），页眉注入，头像关
  setConfig([
    ['report_header', '页眉兼容测试'],
    ['include_student_avatar', 'false'],
    ['default_report_format', 'pdf'],
  ])
  await exportReport({ ...PAYLOAD, filename: 'pdf-legacy' }, { studentId: 7 })
  assert.equal(captured[3].fileName, 'pdf-legacy.docx', "存量 'pdf' 分发到 Word 导出（.docx）")
  const files3 = await unzipAt(3)
  assert.ok(files3['word/header1.xml'], '页眉文字非空 → 注入 word/header1.xml')
  const headerXml = new TextDecoder().decode(files3['word/header1.xml'])
  assert.ok(headerXml.includes('页眉兼容测试'), '页眉文字进入 header1.xml')
  assert.ok(headerXml.includes('w:pBdr'), '页眉含底部分隔线')
  assert.ok(
    !Object.keys(files3).some((k) => k.startsWith('word/media/')),
    '头像开关关闭 → 不嵌图',
  )

  // word + 头像开 + 空页眉 → media 有图、不产生 header1.xml
  setConfig([
    ['report_header', ''],
    ['include_student_avatar', 'true'],
    ['default_report_format', 'word'],
  ])
  await exportReport({ ...PAYLOAD, filename: 'word-avatar' }, { studentId: 7 })
  const files4 = await unzipAt(4)
  assert.ok(
    Object.keys(files4).some((k) => k.startsWith('word/media/') && k.endsWith('.png')),
    '头像开启 → word/media/ 嵌入 png',
  )
  assert.ok(!files4['word/header1.xml'], '空页眉不渲染（不产生 header1.xml）')
  console.log('5. Word 页眉注入 / 空页眉不渲染 OK')
  console.log("6. Word 头像 media 嵌入 / 'pdf'→.docx 分发 OK")
}

// ---------- 7. 拦截钩子同走 + 未显式指定格式时读默认设置 ----------
{
  assert.equal(captured.length, 5, 'HTML 与 Word 导出均走 window 拦截钩子（手册截图契约）')
  console.log('7. 拦截钩子（HTML/Word 同走 receiver）OK')
}

console.log('\n全部通过：report-export.test.ts（7 组断言组）')
