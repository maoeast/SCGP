/**
 * 首页看板「训练进度概览」聚合口径 — 单元测试（纯函数，无 DB 依赖）
 *
 * 运行：npx jiti tests/training-progress.test.ts
 *
 * 覆盖：
 *  1. 窗口：最近 N 个本地自然日（含今天），恒 N 个点、日期升序、零值天补齐
 *  2. 本地日分桶：跨午夜边界 / ISO-Z（UTC 时刻）落本地日 / 演示裸文本按本地时刻理解
 *  3. 坏时间戳：计入 skippedRowCount，但不污染会话数与图表
 *  4. 窗口外行（未来 / 更早）不进聚合
 *  5. 时长：非法值与负值按 0，绝不产生 NaN
 *  6. 完成率：completed/总数；无会话 → null（不猜 0）
 *  7. 模块分布：次数倒序、share 合计 1（展示名由 API 层填充，纯函数层不涉）
 *  8. 汇总：学生去重、todayCount、activeDayCount
 *  9. 环比：上一等长窗口指标；无上一期数据 → null
 * 10. 窗口天数归一化：非法值落到默认 7，30 天出 30 个点
 */
import assert from 'node:assert/strict'
import {
  buildTrainingProgress,
  DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS,
  normalizeTrainingProgressWindowDays,
  parseTrainingInstant,
  resolveTrainingProgressWindow,
  TRAINING_PROGRESS_WINDOW_OPTIONS,
  type TrainingProgressSessionRow,
} from '../src/database/training-progress-rules.ts'

/** 参考时刻：本地 2026-09-21 15:00（窗口 = 09-15 … 09-21） */
const NOW = new Date(2026, 8, 21, 15, 0, 0)

function row(overrides: Partial<TrainingProgressSessionRow> = {}): TrainingProgressSessionRow {
  return {
    startedAt: '2026-09-21T06:00:00.000Z',
    durationMs: 600000,
    studentId: 1,
    moduleCode: 'sensory',
    completionStatus: 'completed',
    ...overrides,
  }
}

function build(rows: TrainingProgressSessionRow[], options: { windowDays?: number; previousRows?: unknown[] } = {}) {
  return buildTrainingProgress({
    windowRows: rows,
    previousRows: (options.previousRows ?? []) as never,
    windowDays: options.windowDays ?? DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS,
    now: NOW,
  })
}

// ---------- 1. 窗口点数与顺序 ----------
{
  const result = build([])
  assert.equal(result.windowDays, 7)
  assert.equal(result.points.length, 7, '默认窗口必须恒为 7 个点（含零值天）')
  assert.deepEqual(
    result.points.map((point) => point.date),
    ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'],
    '日期必须升序、以今天结尾',
  )
  assert.equal(result.hasData, false, '无会话时 hasData 为 false（空态真源）')
  assert.equal(result.summary.completionRate, null, '无会话时完成率为 null，不猜 0')

  const range = resolveTrainingProgressWindow(7, NOW)
  assert.equal(range.start.getHours(), 0, '窗口起点必须是本地零点')
  assert.equal(range.end.getDate(), 22, '窗口右边界是明天本地零点')
  assert.equal(range.previousStart.getDate(), 8, '上一窗口起点 = 09-08')
}

// ---------- 2. 本地日分桶 ----------
{
  const result = build([
    // 本地 09-21 23:59（UTC 15:59）→ 归 09-21
    row({ startedAt: '2026-09-21T15:59:00.000Z', durationMs: 60000 }),
    // 本地 09-22 00:01（UTC 16:01）→ 已越过窗口右边界，不进聚合
    row({ startedAt: '2026-09-21T16:01:00.000Z', durationMs: 60000 }),
    // 本地 09-21 07:00 = UTC 09-20T23:00Z → 必须归 09-21（不是 UTC 的 09-20）
    row({ startedAt: '2026-09-20T23:00:00.000Z', durationMs: 60000 }),
    // 演示种子裸文本（本地时刻语义）
    row({ startedAt: '2026-09-20 10:00:00', durationMs: 60000 }),
    // 带显式偏移：UTC+08:00 的 09:00 → 本地 09:00
    row({ startedAt: '2026-09-19T09:00:00+08:00', durationMs: 60000 }),
  ])

  const byDate = new Map(result.points.map((point) => [point.date, point.count]))
  assert.equal(byDate.get('2026-09-21'), 2, 'UTC 前一日 23:00Z 的行必须落在本地 09-21')
  assert.equal(byDate.get('2026-09-20'), 1, '裸文本 2026-09-20 10:00:00 应归本地 09-20')
  assert.equal(byDate.get('2026-09-19'), 1, '带 +08:00 偏移的行按真实时刻归日')
  assert.equal(result.summary.sessionCount, 4, '越过右边界（本地 09-22）的行不得计入')
  assert.equal(result.skippedRowCount, 0)
}

// ---------- 3. 坏时间戳 ----------
{
  const result = build([
    row({ startedAt: '不是时间' }),
    row({ startedAt: '' }),
    row({ startedAt: null }),
    row({ startedAt: undefined }),
    row({ startedAt: '2026-09-21T06:00:00.000Z' }),
  ])

  assert.equal(result.skippedRowCount, 4, '四类坏时间戳全部计入 skippedRowCount')
  assert.equal(result.summary.sessionCount, 1, '坏行不得进入聚合')
  assert.equal(result.hasData, true)
}

// ---------- 4. 窗口外行 ----------
{
  const result = build([
    row({ startedAt: '2026-09-01T06:00:00.000Z' }), // 早于窗口
    row({ startedAt: '2027-01-01T06:00:00.000Z' }), // 远未来
    row({ startedAt: '2026-09-21T06:00:00.000Z' }), // 窗口内
  ])

  assert.equal(result.summary.sessionCount, 1, '窗口外的行不得计入')
  assert.equal(result.summary.activeDayCount, 1)
}

// ---------- 5. 时长健壮性 ----------
{
  const result = build([
    row({ durationMs: -5000 }),
    row({ durationMs: 'abc' }),
    row({ durationMs: null }),
    row({ durationMs: 900000 }),
  ])

  assert.equal(result.summary.durationMs, 900000, '非法/负时长按 0，不产生 NaN')
  assert.ok(Number.isFinite(result.summary.durationMs))
  assert.equal(result.points[6].durationMs, 900000)
}

// ---------- 6. 完成率 ----------
{
  const mixed = build([
    row({ completionStatus: 'completed' }),
    row({ completionStatus: 'interrupted' }),
    row({ completionStatus: 'completed' }),
    row({ completionStatus: null }),
  ])
  assert.equal(mixed.summary.sessionCount, 4)
  assert.equal(mixed.summary.completedCount, 2, '非法完成态不计入分子')
  assert.equal(mixed.summary.completionRate, 0.5)
  assert.equal(mixed.points[6].completedCount, 2, '日点也带完成数')
}

// ---------- 7. 模块分布 ----------
{
  const result = build([
    row({ moduleCode: 'sensory' }),
    row({ moduleCode: 'sensory' }),
    row({ moduleCode: 'emotional', durationMs: 1200000 }),
    row({ moduleCode: 'cognitive' }),
    row({ moduleCode: 'unknown-module-code' }),
  ])

  assert.deepEqual(
    result.modules.map((slice) => slice.count),
    [2, 1, 1, 1],
    '模块按次数倒序',
  )
  assert.equal(result.modules[0].moduleCode, 'sensory')
  assert.equal(
    'moduleLabel' in result.modules[0],
    false,
    '纯函数层不管展示名（由 API 层按 training-plan-module 单一真源填充）',
  )
  assert.equal(
    Math.abs(result.modules.reduce((sum, slice) => sum + slice.share, 0) - 1) < 1e-9,
    true,
    'share 合计为 1',
  )
  assert.equal(result.modules[0].studentCount, 1, '模块内学生去重')
}

// ---------- 8. 汇总 ----------
{
  const result = build([
    row({ studentId: 1 }),
    row({ studentId: 1 }),
    row({ studentId: 2, startedAt: '2026-09-18T06:00:00.000Z' }),
    row({ studentId: 3, startedAt: '2026-09-16T06:00:00.000Z' }),
  ])

  assert.equal(result.summary.sessionCount, 4)
  assert.equal(result.summary.studentCount, 3, '参与学生按 student_id 去重')
  assert.equal(result.summary.todayCount, 2, 'todayCount 只数今天（与窗口长度无关）')
  assert.equal(result.summary.activeDayCount, 3, '有训练的天数 = 3')
}

// ---------- 9. 环比（上一等长窗口） ----------
{
  const withPrevious = build(
    [row({ studentId: 1 })],
    { previousRows: [{ durationMs: 600000, studentId: 1, completionStatus: 'completed' }, { durationMs: 300000, studentId: 2, completionStatus: 'aborted' }] },
  )
  assert.ok(withPrevious.summary.previous, '有上一期数据时必须给出环比基准')
  assert.equal(withPrevious.summary.previous!.sessionCount, 2)
  assert.equal(withPrevious.summary.previous!.durationMs, 900000)
  assert.equal(withPrevious.summary.previous!.studentCount, 2)
  assert.equal(withPrevious.summary.previous!.completionRate, 0.5)

  assert.equal(build([row()]).summary.previous, null, '没有上一期数据时必须为 null（视图不得显示 +0%）')
}

// ---------- 10. 窗口归一化 ----------
{
  assert.deepEqual([...TRAINING_PROGRESS_WINDOW_OPTIONS], [7, 30])
  assert.equal(normalizeTrainingProgressWindowDays(30), 30)
  assert.equal(normalizeTrainingProgressWindowDays('30'), 30, '数字字符串可归一')
  assert.equal(normalizeTrainingProgressWindowDays(14), 7, '非法窗口值落到默认 7 天')
  assert.equal(normalizeTrainingProgressWindowDays(null), 7)

  const month = build([row()], { windowDays: 30 })
  assert.equal(month.points.length, 30, '30 天窗口出 30 个点')
  assert.equal(month.points[0].date, '2026-08-23', '30 天窗口起点 = 今天 - 29 天')
  assert.equal(month.points[29].date, '2026-09-21')
}

// ---------- 11. 时间解析单测 ----------
{
  assert.equal(parseTrainingInstant('2026-09-21T06:00:00.000Z'), Date.UTC(2026, 8, 21, 6))
  assert.equal(parseTrainingInstant('2026-09-21 06:00:00'), new Date(2026, 8, 21, 6).getTime())
  assert.equal(parseTrainingInstant('  '), null)
  assert.equal(parseTrainingInstant(42), null)
  assert.equal(parseTrainingInstant('2026-09-21T06:00'), new Date(2026, 8, 21, 6).getTime(), '无秒无时区的 ISO 按本地时刻理解')
}

console.log('training-progress test passed (11 场景)')
