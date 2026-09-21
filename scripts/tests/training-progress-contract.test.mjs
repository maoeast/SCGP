/**
 * 首页看板「训练进度概览」契约守卫
 *
 * 1. 扫描源必须是统一训练主表 `training_session`
 *    历史事故：旧实现（getWeeklyTrainingTrend）直扫 legacy 表 `training_records`，
 *    实测只覆盖 1047 条统一会话中的 810 条（≈77%）——器材 / 情绪小游戏写各自的旧表、
 *    认知内联游戏只写统一主表，趋势图天然漏掉约 1/4 的训练。
 * 2. 时间必须取 `started_at`（会话发生），不得取 `created_at`（入库时刻，UTC）。
 *    历史事故：相邻的异常面板用本地时间串去比 UTC 存储的 `created_at`，+08 时区存在
 *    约 8 小时窗口偏移——本卡片不得复制该写法。
 * 3. 分桶/聚合必须走纯函数 `buildTrainingProgress`（口径单一真源，可单测）；
 *    禁止在 API / 视图里内联窗口天数或时间解析。
 * 4. 不得使用 SQLite 的 'localtime' 修饰符（wasm 构建的时区行为不可靠且不可单测）。
 * 5. 视图必须用 `hasData` 判空态、用 `summary.todayCount` 作为日程进度条分子。
 *
 * 运行：node --test scripts/tests/training-progress-contract.test.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: { '@': `${projectRoot}/src` },
})

const readRepoFile = (rel) => readFileSync(resolve(projectRoot, rel), 'utf8')

/** 取出某个方法的源码体（同文件其他查询可合法直扫 legacy 表，不能整文件断言） */
function readMethodSource(source, signature) {
  const match = source.match(new RegExp(`${signature}\\([\\s\\S]*?\\n  \\}`))
  assert.ok(match, `dashboard-api 中未找到 ${signature} 方法`)
  return match[0]
}

test('1. 进度概览以统一主表 training_session 为唯一数据源', () => {
  const source = readRepoFile('src/database/dashboard-api.ts')
  const method = readMethodSource(source, 'async getTrainingProgress')
  const dayDetail = readMethodSource(source, 'async getTrainingDayDetail')

  for (const [name, body] of [['getTrainingProgress', method], ['getTrainingDayDetail', dayDetail]]) {
    assert.match(body, /FROM training_session ts/, `${name} 必须以 training_session 为主表`)
    assert.doesNotMatch(body, /FROM training_records\b/, `${name} 不得直扫 legacy 表 training_records`)
    assert.doesNotMatch(body, /game_emotion_records|equipment_training_records/, `${name} 不得直扫旧分表`)
  }

  assert.doesNotMatch(
    source,
    /getWeeklyTrainingTrend/,
    '旧方法 getWeeklyTrainingTrend 必须删除（其口径已由 getTrainingProgress 取代）',
  )
})

test('2. 时间取 started_at 且不得使用 localtime 修饰符', () => {
  const source = readRepoFile('src/database/dashboard-api.ts')
  const method = readMethodSource(source, 'async getTrainingProgress')

  assert.match(method, /datetime\(ts\.started_at\)/, '窗口过滤必须基于 started_at')
  assert.doesNotMatch(method, /created_at/, '不得用 created_at 做趋势窗口（入库时刻≠会话发生）')
  assert.doesNotMatch(method, /'localtime'/, "不得使用 SQLite 'localtime'（wasm 时区行为不可靠）")
  assert.doesNotMatch(source, /'localtime'/, `dashboard-api 不应再出现 'localtime' 修饰符`)
})

test('3. 窗口与聚合走规则模块（dashboard-api / 视图不得内联口径）', () => {
  const source = readRepoFile('src/database/dashboard-api.ts')
  const method = readMethodSource(source, 'async getTrainingProgress')
  const rules = jiti('../../src/database/training-progress-rules.ts')

  assert.match(method, /buildTrainingProgress\(/, '聚合必须交纯函数 buildTrainingProgress')
  assert.match(method, /resolveTrainingProgressWindow\(/, '窗口边界必须由规则模块计算')
  assert.match(method, /toSqlUtcDateTime\(/, '窗口边界必须以 UTC 文本传参')
  assert.match(method, /DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS/, '默认窗口天数必须来自规则模块常量')
  assert.match(method, /normalizeTrainingProgressWindowDays\(/, '窗口取值必须归一化')

  assert.deepEqual([...rules.TRAINING_PROGRESS_WINDOW_OPTIONS], [7, 30], '窗口枚举为 7 / 30 天')
  assert.equal(rules.DEFAULT_TRAINING_PROGRESS_WINDOW_DAYS, 7)
  assert.equal(rules.COMPLETED_TRAINING_STATUS, 'completed')

  // 规则模块必须保持零别名依赖：tests/training-progress.test.ts 直跑 jiti（无 @ 别名）
  const rulesSource = readRepoFile('src/database/training-progress-rules.ts')
  assert.doesNotMatch(rulesSource, /from '@\//, '规则模块不得依赖 @ 别名（jiti 单测直跑会挂）')
  assert.doesNotMatch(rulesSource, /queryAsync|DatabaseAPI/, '规则模块不得直接访问数据库')
})

test('4. 视图契约：换源字段、空态、进度条分子、柱状图注册', () => {
  const view = readRepoFile('src/views/Dashboard.vue')

  assert.doesNotMatch(view, /weeklyTrend/, '视图不得再引用已删除的 weeklyTrend')
  assert.match(view, /snapshot\.trainingProgress|trainingProgress\.value/, '视图必须消费 trainingProgress')
  assert.match(view, /hasData/, '空态必须用 hasData 判定（旧判断恒不成立，是死代码）')
  assert.doesNotMatch(
    view,
    /weeklyTrend\.length === 0|trend\.length === 0/,
    '旧空态判断（数组恒有 7 个点）必须删除',
  )
  assert.match(view, /todayCount/, '日程进度条分子必须取 summary.todayCount')
  assert.match(view, /getTrainingDayDetail\(/, '日趋势下钻必须走 getTrainingDayDetail')
  assert.match(view, /BarChart/, '组合图需要注册 BarChart（此前只注册了 LineChart）')
  assert.match(
    view,
    /TRAINING_PROGRESS_WINDOW_OPTIONS/,
    '窗口切换选项必须来自规则模块常量',
  )
  assert.doesNotMatch(
    view,
    /windowDays\s*[:=]\s*[73]\d*\b/,
    '视图不得内联窗口天数',
  )
})

test('5. 文档同步：口径档在册、布局档不再引用旧字段', () => {
  const index = readRepoFile('docs/INDEX.md')
  assert.match(index, /2026-09-21-首页训练进度概览-判定口径\.md/, '新口径档必须登记进 docs/INDEX.md')

  const layout = readRepoFile('docs/planning/2026-09-21-首页看板下半部-布局重排.md')
  assert.doesNotMatch(layout, /weeklyTrend/, '布局档不得再引用已删除的 weeklyTrend 字段')
})
