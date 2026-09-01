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
import { SCORE_ADAPTERS, SUPPORTED_SCALE_CODES, UNSUPPORTED_SCALE_CODES, type LongitudinalScorePayload, type ScoreAdapter, type ScoreSnapshot } from './assessment-score-adapters'
import { buildStudentProfile, strengthToScore, strengthLabel } from './assessment-profile'

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
  /**
   * 类型化的工具产物（路线 C）：供 UI 渲染富组件（如图表）。
   * content 仍给模型做文字解读；artifact 只回传 UI 层，不进模型上下文。
   * 未产生富产物的工具，该字段为 undefined。
   */
  artifact?: ToolArtifact
}

/**
 * 工具产物联合类型：每种富产物一个分支。
 * 新增产物类型时扩展此联合 + AiChatTranscript/AiArtifactCard dispatcher。
 */
export type ToolArtifact = AssessmentTrendArtifact | ProfileRadarArtifact

/** 评估纵向趋势产物：驱动 echarts 线图渲染。 */
export interface AssessmentTrendArtifact {
  kind: 'assessment_trend'
  /** 量表代码（如 csirs / srs2）。 */
  scaleCode: string
  /** 量表中文名。 */
  scaleName: string
  /** 升序快照（最早在前），驱动 x 轴与数据线。 */
  snapshots: LongitudinalScorePayload['snapshots']
  /** 总分语义说明，图表上方展示，帮助教师正确解读高低分。 */
  scoreNote: string
}

/** 跨量表学生画像雷达产物：驱动 echarts 雷达图渲染。 */
export interface ProfileRadarArtifact {
  kind: 'profile_radar'
  /** 学生信息。 */
  student: { id: number; name: string }
  /** 雷达轴：各发展领域（仅有评估数据的领域）。 */
  axes: Array<{ domain: string; domainLabel: string }>
  /** 雷达值：每个领域的强弱量化分（0-100，50=正常，>50 偏强，<50 偏弱）。 */
  values: Array<{ domain: string; strengthScore: number; strengthLabel: string }>
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
      name: 'get_assessment_trend',
      description: '获取某学生「同一量表历次评估」的纵向分数序列（按时间升序），用于纵向对比分析。返回每次的日期、年龄、代表性总分、评定等级与各维度分数。区别于 get_assessment（只返回报告列表摘要）：本工具返回可量化的分数，能支撑「进步/退步维度」「趋势解读」类分析。支持 15 个量表：csirs / conners_psq / conners_trs / srs2 / sdq / cbcl / brief / weefim / cnbsr2016 / fine_motor / gmfm_88 / tgmd_3 / sm / abc / atec。不支持 crt / cognitive_self（实验性占位常模，纵向对比会误导）。',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'number', description: '学生 ID' },
          scale_code: {
            type: 'string',
            description: '量表代码',
            enum: SUPPORTED_SCALE_CODES,
          },
          limit: { type: 'number', description: '返回最近 N 次评估（默认全部，最大 50）' },
        },
        required: ['student_id', 'scale_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_student_profile',
      description: '获取某学生「跨量表横向立体画像」：聚合该学生所有已测标准化量表的最近一次评估，按五大发展领域（感觉统合/情绪调节/社交沟通/认知发展/生活自理）分组，给出各领域强弱、跨量表一致性发现与干预优先级建议。区别于 get_assessment_trend（单量表纵向）：本工具横向综合多量表，用于「这个孩子整体面貌如何」「各领域发展均衡吗」「优先干预哪个领域」类问题。注意：只聚合该学生有评估记录的量表；未测领域会在 untestedScales 明确列出，下结论时必须考虑覆盖盲区，不要基于不全数据下全局判断。',
      parameters: {
        type: 'object',
        properties: {
          student_id: { type: 'number', description: '学生 ID' },
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
  get_assessment_trend: '查询量表纵向分数',
  get_student_profile: '生成跨量表画像',
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

function serialize(data: unknown, artifact?: ToolArtifact): ToolResult {
  const json = JSON.stringify(data, null, 2)
  if (json.length > MAX_RESULT_CHARS) {
    return {
      ok: true,
      content: json.slice(0, MAX_RESULT_CHARS) + `\n...[结果已截断，原始长度 ${json.length} 字符]`,
      // 截断时仍保留 artifact（富产物体积独立于 content，不受文本截断影响）
      artifact,
    }
  }
  return { ok: true, content: json, artifact }
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

      case 'get_assessment_trend': {
        // 纵向分数通道：读取某学生某量表的历次评分，归一化为升序快照。
        // 与 get_assessment（报告列表摘要）互补——本工具返回可量化分数，支撑纵向分析。
        if (!args.student_id) return fail('缺少参数 student_id')
        if (!args.scale_code) return fail('缺少参数 scale_code')
        // 教师数据隔离：先校验学生可见性（非任教班级学生返回未找到）
        const scopedStudent = await new StudentAPI().getStudentById(Number(args.student_id))
        if (!scopedStudent) return fail(`未找到 id=${args.student_id} 的学生或无权访问该学生`)
        const scaleCode = String(args.scale_code)
        const adapter = SCORE_ADAPTERS[scaleCode]
        if (!adapter) {
          if (UNSUPPORTED_SCALE_CODES.includes(scaleCode)) {
            return fail(`${scaleCode} 为实验性占位常模量表，纵向对比会因常模漂移产生误导，暂不支持。请改用其他标准化量表（${SUPPORTED_SCALE_CODES.join(' / ')}）。`)
          }
          return fail(`不支持的量表代码：${scaleCode}（当前支持 ${SUPPORTED_SCALE_CODES.join(' / ')}）`)
        }
        let snapshots = adapter.getLongitudinalScores(Number(args.student_id))
        const limit = args.limit != null ? clampLimit(args.limit, snapshots.length, 50) : null
        if (limit != null) snapshots = snapshots.slice(-limit) // 取最近 N 次（slice 负索引：尾部）
        const payload: LongitudinalScorePayload = {
          scaleCode: adapter.scaleCode,
          scaleName: adapter.scaleName,
          count: snapshots.length,
          snapshots,
          scoreNote: adapter.scoreNote,
        }
        // 路线 C：快照有 2 次及以上才产 artifact（单点无法成趋势线）
        const artifact: ToolArtifact | undefined =
          snapshots.length >= 2
            ? {
                kind: 'assessment_trend',
                scaleCode: payload.scaleCode,
                scaleName: payload.scaleName,
                snapshots: payload.snapshots,
                scoreNote: payload.scoreNote,
              }
            : undefined
        return serialize(payload, artifact)
      }

      case 'get_student_profile': {
        // 路线 D：跨量表横向立体画像。聚合该学生所有已测标准化量表的最近一次评估。
        // 授权差异：未授权量表前端测不了 → DB 无记录 → 自动跳过；只返回有数据的量表。
        // 部分测试：未测量表在 untestedScales 明确列出，AI 下结论时需考虑覆盖盲区。
        if (!args.student_id) return fail('缺少参数 student_id')
        const sid = Number(args.student_id)

        const student = await new StudentAPI().getStudentById(sid)
        if (!student) return fail(`未找到 id=${sid} 的学生`)

        // 遍历所有适配器，收集有评估记录的量表（升序快照序列）
        const scaleData: Array<{ scaleCode: string; adapter: ScoreAdapter; snapshots: ScoreSnapshot[] }> = []
        for (const [code, adapter] of Object.entries(SCORE_ADAPTERS)) {
          const snapshots = adapter.getLongitudinalScores(sid)
          if (snapshots && snapshots.length > 0) scaleData.push({ scaleCode: code, adapter, snapshots })
        }

        const profile = buildStudentProfile(
          { id: sid, name: student.name, gender: student.gender ?? '' },
          scaleData,
          SUPPORTED_SCALE_CODES,
        )

        // 领域 ≥ 3 才产雷达图 artifact（多边形至少 3 条边；不足时 AI 只输出文字画像）
        const artifact: ToolArtifact | undefined =
          profile.domains.length >= 3
            ? {
                kind: 'profile_radar',
                student: { id: sid, name: student.name },
                axes: profile.domains.map((d) => ({ domain: d.domain, domainLabel: d.domainLabel })),
                values: profile.domains.map((d) => ({
                  domain: d.domain,
                  strengthScore: strengthToScore(d.strength),
                  strengthLabel: strengthLabel(d.strength),
                })),
              }
            : undefined

        return serialize(profile, artifact)
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
