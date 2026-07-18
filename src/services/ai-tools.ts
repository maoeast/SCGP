/**
 * AI 智能体 function calling：工具注册表 + 渲染端 dispatcher。
 *
 * Phase 2 骨架：tool 执行循环放渲染进程，Main 只透传 tools + 解析 tool_calls。
 * 本文件负责：
 * - 定义首批工具的 OpenAI 兼容 schema（AI_TOOLS）；
 * - dispatchTool：按名字本地执行工具（new XxxAPI() 直读 sql.js），结果序列化为 JSON 字符串回传给模型。
 *
 * 安全：tool 只读本地数据库，不经网络、不经 Main 解密；模型只拿到工具返回的 JSON 文本。
 * 明文 API Key 永远不进本文件。
 */
import { StudentAPI, TrainingSessionAPI, ReportAPI, EquipmentAPI } from '@/database/api'
import { AIApi } from '@/database/ai-api'
import { exportWordDocument } from '@/utils/export-word'
import { buildAIReportWordPayload, type AIReportInput } from '@/utils/ai-report-word-builder'

// ==================== 类型 ====================

export interface AiToolFunction {
  name: string
  description: string
  /** JSON Schema（OpenAI function parameters） */
  parameters: Record<string, any>
}

export interface AiToolDef {
  type: 'function'
  function: AiToolFunction
}

export interface AiToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** 工具执行结果：content 为给模型的 JSON 字符串 */
export interface ToolResult {
  ok: boolean
  content: string
}

/** 供 UI 展示的一次工具调用步骤 */
export interface ToolStep {
  name: string
  label: string
  ok: boolean
}

// ==================== 工具 schema（OpenAI tools 数组）====================

export const AI_TOOLS: AiToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'list_students',
      description: '获取学生列表（按创建时间倒序）。返回每个学生的 id、姓名、性别、生日、学号、诊断、当前班级。用于回答「有哪些学生」「列出学生」类问题。',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '返回上限，默认 50，最大 100' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_student',
      description: '按 id 获取单个学生的完整档案信息。',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: '学生 ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_students',
      description: '按姓名、诊断或学号关键词模糊搜索学生。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '搜索关键词' },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_assessment',
      description: '获取某学生的评估/报告记录列表（按时间倒序）。返回每条的报告类型、结论摘要（title）、模块、时间。不返回量表详细分数。',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'number', description: '学生 ID' },
          limit: { type: 'number', description: '返回上限，默认 10，最大 50' },
        },
        required: ['student_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_training_sessions',
      description: '获取统一训练场次记录（training_session 主表，含游戏/器材/情绪等多来源）。可按学生、模块过滤，按时间倒序。',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'number', description: '按学生过滤' },
          module_code: { type: 'string', description: '按模块过滤，如 sensory / emotional / social / life_skills' },
          limit: { type: 'number', description: '返回上限，默认 20，最大 100' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_equipment',
      description: '查询训练器材库（感觉统合训练器材）。可按关键词或感官分类过滤。返回每件器材的名称、感官分类、描述与能力标签（ability_tags）。用于结合评估报告的能力短板，向老师推荐合适的训练器材。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '按名称/描述/能力标签模糊搜索' },
          category: {
            type: 'string',
            description: '感官分类，如 tactile(触觉)/visual(视觉)/auditory(听觉)/proprioceptive(本体觉)/integration(统合) 等',
          },
          limit: { type: 'number', description: '返回上限，默认 30，最大 100' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ai_usage',
      description: '获取本月 AI 用量统计（累计 token 数、assistant 消息条数、计费周期）。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description:
        '当用户需要生成可下载的 Word 报告（如训练计划、评估总结、IEP 等）时调用。应先用查库工具（get_student / get_assessment / list_training_sessions 等）采集该学生数据，再把结构化内容填入本工具参数，导出为 .docx 文件。约束：sections 总数 ≤ 8、每个 table 的 rows ≤ 20、每段 text ≤ 500 字。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '报告标题' },
          subtitle: { type: 'string', description: '副标题（可选）' },
          report_type: {
            type: 'string',
            enum: ['general', 'iep_plan', 'training_plan', 'assessment_summary'],
            description: '报告类型，预留；默认 general',
          },
          student_name: { type: 'string', description: '学生姓名，用于生成文件名' },
          meta: {
            type: 'array',
            description: '基本信息键值对，渲染为报告顶部的「基本信息」表',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['label', 'value'],
            },
          },
          sections: {
            type: 'array',
            description: '报告正文段落，按顺序渲染',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['paragraph', 'list', 'table', 'kv_table'],
                  description: '段落类型',
                },
                heading: { type: 'string', description: '小节标题（可选）' },
                text: { type: 'string', description: 'type=paragraph 时的正文' },
                items: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'type=list 时的条目',
                },
                columns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'type=table 时的列名',
                },
                rows: {
                  type: 'array',
                  items: { type: 'array', items: { type: 'string' } },
                  description: 'type=table 时的数据行（二维字符串数组）',
                },
                rows_kv: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      value: { type: 'string' },
                    },
                    required: ['label', 'value'],
                  },
                  description: 'type=kv_table 时的键值行',
                },
              },
              required: ['type'],
            },
          },
        },
        required: ['title', 'sections'],
      },
    },
  },
]

// ==================== 工具元信息（UI 文案）====================

const TOOL_LABELS: Record<string, string> = {
  list_students: '查询学生列表',
  get_student: '查询学生详情',
  search_students: '搜索学生',
  get_assessment: '查询评估记录',
  list_training_sessions: '查询训练记录',
  list_equipment: '查询训练器材',
  get_ai_usage: '查询本月用量',
  generate_report: '生成报告',
}

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] || name
}

/**
 * 按 tool_code 白名单过滤工具 schema（Phase 5：按 agent 挂载）。
 * - null / [] → 返回全量 AI_TOOLS（安全兜底：绑定解析失败时绝不静默清空工具）。
 * - 否则仅保留 function.name 命中白名单的工具；白名单中的孤儿 code（无对应 def）忽略。
 */
export function filterTools(toolCodes: string[] | null): AiToolDef[] {
  if (!toolCodes || toolCodes.length === 0) return AI_TOOLS
  const allow = new Set(toolCodes)
  return AI_TOOLS.filter((t) => allow.has(t.function.name))
}

// ==================== 体积护栏 ====================

const MAX_RESULT_CHARS = 6000

function serialize(data: unknown): ToolResult {
  const json = JSON.stringify(data, null, 2)
  if (json.length > MAX_RESULT_CHARS) {
    return {
      ok: true,
      content: json.slice(0, MAX_RESULT_CHARS) + `\n...[结果已截断，原始长度 ${json.length} 字符]`,
    }
  }
  return { ok: true, content: json }
}

function fail(message: string, extra?: Record<string, any>): ToolResult {
  return { ok: false, content: JSON.stringify({ error: true, message, ...extra }) }
}

/** 幂等确保单例 db 已初始化（store 已 ensureDb，此处双保险） */
async function ensureDbReady(): Promise<void> {
  const { initDatabase } = await import('@/database/init')
  await initDatabase()
}

function clampLimit(raw: any, def: number, max: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(Math.floor(n), max)
}

// ==================== dispatcher ====================

/**
 * 按工具名执行，返回给模型的 JSON 字符串。
 * @param name 工具名
 * @param argsJson 模型给出的参数 JSON 字符串（OpenAI tool_call.function.arguments）
 */
export async function dispatchTool(
  name: string,
  argsJson: string,
  allowed?: Set<string>,
): Promise<ToolResult> {
  // Phase 5：白名单防御——模型若幻觉出该 agent 未挂载的工具名，直接拒绝。
  // （理论上只发了过滤后的 schema，模型不应看到其他工具；此处双保险。）
  if (allowed && !allowed.has(name)) {
    return fail(`该智能体未挂载工具：${name}`)
  }
  let args: Record<string, any> = {}
  try {
    args = argsJson ? JSON.parse(argsJson) : {}
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return fail('工具参数必须是 JSON 对象')
    }
  } catch {
    return fail(`工具参数解析失败（期望 JSON 对象），原始入参：${argsJson}`)
  }

  try {
    await ensureDbReady()

    switch (name) {
      case 'list_students': {
        const limit = clampLimit(args.limit, 50, 100)
        const rows = await new StudentAPI().getAllStudents()
        const students = rows.slice(0, limit).map((s: any) => ({
          id: s.id,
          name: s.name,
          gender: s.gender,
          birthday: s.birthday,
          student_no: s.student_no,
          disorder: s.disorder,
          current_class_name: s.current_class_name,
        }))
        return serialize({ total: rows.length, returned: students.length, students })
      }

      case 'get_student': {
        if (!args.id) return fail('缺少参数 id')
        const s = await new StudentAPI().getStudentById(Number(args.id))
        if (!s) return fail(`未找到 id=${args.id} 的学生`)
        // 显式字段映射（C07 tool result 口径，见 PROJECT_CONTEXT §81）：保留现有全字段（单学生档案
        // 场景 AI 合理需要），仅避免 SELECT * 在 student 表未来加列时把新列自动外发给 provider。
        // 不做脱敏——name/disorder 是 AI 给出建议的必要输入，知情同意由 C07 首次发送门禁层兜底。
        const student = {
          id: s.id,
          name: s.name,
          gender: s.gender,
          birthday: s.birthday,
          student_no: s.student_no,
          disorder: s.disorder,
          avatar_path: s.avatar_path,
          current_class_id: s.current_class_id,
          current_class_name: s.current_class_name,
          created_at: s.created_at,
          updated_at: s.updated_at,
        }
        return serialize(student)
      }

      case 'search_students': {
        if (!args.keyword) return fail('缺少参数 keyword')
        const rows = await new StudentAPI().searchStudents(String(args.keyword))
        const students = rows.map((s: any) => ({
          id: s.id,
          name: s.name,
          gender: s.gender,
          student_no: s.student_no,
          disorder: s.disorder,
          current_class_name: s.current_class_name,
        }))
        return serialize({ matched: students.length, students })
      }

      case 'get_assessment': {
        if (!args.student_id) return fail('缺少参数 student_id')
        const limit = clampLimit(args.limit, 10, 50)
        const rows = new ReportAPI().getReportList({ student_id: Number(args.student_id), limit })
        const assessments = rows.map((r: any) => ({
          id: r.id,
          report_type: r.report_type,
          title: r.title,
          module_code: r.module_code,
          created_at: r.created_at,
          assess_id: r.assess_id,
        }))
        return serialize({ total: assessments.length, assessments })
      }

      case 'list_training_sessions': {
        const limit = clampLimit(args.limit, 20, 100)
        const opts: { studentId?: number; moduleCode?: string; limit: number } = { limit }
        if (args.student_id) opts.studentId = Number(args.student_id)
        if (args.module_code) opts.moduleCode = String(args.module_code)
        const rows = new TrainingSessionAPI().listSessions(opts)
        const sessions = rows.map((r: any) => ({
          id: r.id,
          student_id: r.student_id,
          student_name: r.student_name,
          module_code: r.module_code,
          entry_code: r.entry_code,
          resource_name: r.resource_name,
          started_at: r.started_at,
          ended_at: r.ended_at,
          duration_ms: r.duration_ms,
          completion_status: r.completion_status,
          accuracy_rate: r.accuracy_rate,
        }))
        return serialize({ total: sessions.length, sessions })
      }

      case 'list_equipment': {
        const limit = clampLimit(args.limit, 30, 100)
        const opts: { keyword?: string; category?: string } = {}
        if (args.keyword) opts.keyword = String(args.keyword)
        if (args.category && args.category !== 'all') opts.category = String(args.category)
        const rows = new EquipmentAPI().getEquipment(opts)
        const equipment = rows.slice(0, limit).map((e: any) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          description: e.description,
          ability_tags: e.ability_tags,
        }))
        return serialize({ total: rows.length, returned: equipment.length, equipment })
      }

      case 'get_ai_usage': {
        const usage = new AIApi().getMonthUsage()
        return serialize(usage)
      }

      case 'generate_report': {
        // 首个有副作用（触发文件下载）的工具：导出 Word 后只回传小状态 JSON，
        // 绝不把 docx 内容塞进 tool result（serialize 有 6000 字符截断，模型也无需回读全文）。
        const payload = buildAIReportWordPayload(args as AIReportInput)
        await exportWordDocument(payload)
        return serialize({
          ok: true,
          fileName: `${payload.filename}.docx`,
          sectionCount: payload.sections.length,
        })
      }

      default:
        return fail(`未知工具：${name}`)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return fail(`工具 ${name} 执行出错：${message}`)
  }
}
