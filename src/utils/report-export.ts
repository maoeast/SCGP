import { initDatabase } from '@/database/init'
import { resolveStudentAvatarUrl } from '@/utils/student-display'
import { exportWordDocument, type WordExportPayload } from './export-word'
import { exportHtmlDocument } from './export-html'

/**
 * 报告导出统一分发层。
 *
 * 职责（系统设置→报告设置三项做实）：
 * 1. 页眉：读 report_header 注入 payload.headerText（Word 走 docx Header，HTML 走页眉条；空值不渲染）
 * 2. 头像：开关开启时按 studentId 查 avatar_path → resolveStudentAvatarUrl 过滤 → 注入 payload.avatarUrl
 *    （页面多数只查 id/name，头像统一由本层查库，避免 19 页各自改 SQL；字节加载在导出引擎内做，失败静默跳过）
 * 3. 默认格式：default_report_format 语义 word/html；存量 'pdf' 兼容读作 word（DB 值不改）
 * 4. AI 链不经过本层，固定 exportWordDocument
 */

/** 系统设置→报告设置的三个配置键 */
export type ReportExportFormat = 'word' | 'html'

const REPORT_HEADER_KEY = 'report_header'
export { REPORT_HEADER_KEY }
const INCLUDE_STUDENT_AVATAR_KEY = 'include_student_avatar'
const DEFAULT_REPORT_FORMAT_KEY = 'default_report_format'

/**
 * 默认格式归一化：word/html 之外的历史值（'pdf' 等）一律映射为 word。
 * DB 中的存量 'pdf' 值不迁移、不改写，仅在读取层兼容。
 */
export function normalizeReportExportFormat(value: unknown): ReportExportFormat {
  return value === 'html' ? 'html' : 'word'
}

async function readSystemConfigValue(key: string): Promise<string> {
  const db = await initDatabase()
  const row = db.get('SELECT value FROM system_config WHERE key = ?', [key]) as
    | { value?: string | null }
    | undefined
  return row?.value ?? ''
}

export interface ReportExportOptions {
  /** 学生 ID：头像开关开启时用于查询 avatar_path；无学生（如 AI 报告）不传 */
  studentId?: number | string | null
  /** 已解析好的头像 URL（直接注入 payload，跳过查库；可选，页面已持有时用） */
  avatarUrl?: string | null
  /** 显式指定导出格式（不读默认设置；如需强制 Word 的场景用） */
  format?: ReportExportFormat
}

async function resolveAvatarUrlFromSettings(options: ReportExportOptions): Promise<string> {
  const includeAvatar = (await readSystemConfigValue(INCLUDE_STUDENT_AVATAR_KEY)) === 'true'
  if (!includeAvatar) return ''
  if (options.avatarUrl !== undefined && options.avatarUrl !== null) return options.avatarUrl
  const studentId = options.studentId
  if (studentId === undefined || studentId === null || studentId === '') return ''

  const db = await initDatabase()
  const row = db.get('SELECT avatar_path FROM student WHERE id = ?', [studentId]) as
    | { avatar_path?: string | null }
    | undefined
  return resolveStudentAvatarUrl(row?.avatar_path ?? '')
}

/**
 * 统一报告导出入口：读设置（页眉/头像开关/默认格式）→ 补全 payload → 按格式分发。
 * Word 链复用 exportWordDocument（页眉 Header + 头像 ImageRun）；HTML 链走 exportHtmlDocument。
 */
export async function exportReport(
  payload: WordExportPayload,
  options: ReportExportOptions = {},
): Promise<void> {
  const [headerText, avatarUrl, rawFormat] = await Promise.all([
    readSystemConfigValue(REPORT_HEADER_KEY),
    resolveAvatarUrlFromSettings(options),
    readSystemConfigValue(DEFAULT_REPORT_FORMAT_KEY),
  ])

  const format = options.format ?? normalizeReportExportFormat(rawFormat)

  await (format === 'html'
    ? exportHtmlDocument({ ...payload, headerText, avatarUrl })
    : exportWordDocument({ ...payload, headerText, avatarUrl }))
}
