/**
 * 手册截图编号契约：新增图用「后缀编号」，既有编号零漂移
 *
 * 背景（2026-09-21 用户拍板，事故见基线档 §4.1）：手册图注、approvals、物理文件名与 docx
 * 内嵌图都以编号为键；中部插行重编号要同时动 217 处图注（docx 手改封面、禁止整份重生成），
 * 09-10 那次手工插行还因「物理文件没跟着改名」造成 S082 起整体错位。
 *
 * 约定：新图插在**本章节末尾**，编号 = 插入位置前一张的 id + 单个大写字母后缀（S011A、S011B…），
 * 该行**不占用顺序号** → 既有编号、正文占位/图注、approvals、图片文件、docx 全不动。
 *
 * 运行：node --test scripts/tests/manual-screenshot-id-contract.test.mjs
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  deriveScreenshotPlanEntries,
  USER_MANUAL_SCREENSHOT_COUNT,
  userManualScreenshotPlan,
} from '../manual/user-manual-screenshot-plan.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const readRepoFile = (rel) => readFileSync(resolve(projectRoot, rel), 'utf8')

test('1. 新增图只以后缀追加：既有 S001…S217 未被重编号', () => {
  const ids = userManualScreenshotPlan.map((entry) => entry.id)
  assert.equal(USER_MANUAL_SCREENSHOT_COUNT, userManualScreenshotPlan.length)

  const baseIds = ids.filter((id) => !/[A-Z]$/u.test(id))
  assert.equal(baseIds.length, 217, '顺序号部分必须仍是 217 个')
  baseIds.forEach((id, index) => {
    assert.equal(id, `S${String(index + 1).padStart(3, '0')}`, `第 ${index + 1} 个顺序号漂移`)
  })

  // 后缀行登记在此：新增后缀图时同步补上（漏登即失败，防惄惄重编号）
  assert.deepEqual(
    ids.filter((id) => /[A-Z]$/u.test(id)),
    ['S011A'],
    '后缀编号集合与预期不符：要么忘了登记新图，要么发生了重编号',
  )
})

test('2. 后缀行不占用顺序号：插入后既有编号零漂移', () => {
  const entries = deriveScreenshotPlanEntries([
    '1.1|首页概览|全部|首页上部|P0',
    '1.1|今日工作区|全部|今日工作区|P0',
    '1.1|训练进度卡片|全部|训练进度卡片|P1|S002A',
    '1.2|个人资料|全部|资料页上部|P0',
    '1.2|最近登录日志|全部|登录日志区|P1|S003A',
    '1.3|学生列表|全部|统计与卡片|P0',
  ])

  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['S001', 'S002', 'S002A', 'S003', 'S003A', 'S004'],
    '后缀行不得消耗顺序号，后续行编号必须保持原值',
  )
  assert.equal(entries[2].title, '训练进度卡片')
  assert.equal(entries[2].status, '待采集')
  assert.equal(entries[5].id, 'S004', '后缀行之后的顺序号只 +1')
})

test('3. 非法显式 id 必须被拒（格式/重复/缺基号/基号在后）', () => {
  assert.throws(
    () => deriveScreenshotPlanEntries(['1.1|A|全部|全窗口|P0', '1.1|B|全部|全窗口|P0|S001AA']),
    /Invalid explicit screenshot id/u,
    '两个字母后缀必须被拒',
  )
  assert.throws(
    () => deriveScreenshotPlanEntries(['1.1|A|全部|全窗口|P0', '1.1|B|全部|全窗口|P0|S1A']),
    /Invalid explicit screenshot id/u,
    '位数不足必须被拒',
  )
  assert.throws(
    () => deriveScreenshotPlanEntries(['1.1|A|全部|全窗口|P0', '1.1|B|全部|全窗口|P0|s001a']),
    /Invalid explicit screenshot id/u,
    '小写后缀必须被拒',
  )
  assert.throws(
    () => deriveScreenshotPlanEntries(['1.1|A|全部|全窗口|P0', '1.1|B|全部|全窗口|P0|S009A']),
    /has no base row/u,
    '基号不存在必须被拒',
  )
  assert.throws(
    () => deriveScreenshotPlanEntries(['1.1|A|全部|全窗口|P0|S002A', '1.1|B|全部|全窗口|P0', '1.1|C|全部|全窗口|P0']),
    /must come after its base row/u,
    '后缀行出现在基号之前必须被拒',
  )
  assert.throws(
    () => deriveScreenshotPlanEntries(['1.1|A|全部|全窗口|P0', '1.1|B|全部|全窗口|P0|S001A', '1.1|C|全部|全窗口|P0|S001A']),
    /Duplicate screenshot id/u,
    '重复编号必须被拒',
  )
  assert.throws(
    () => deriveScreenshotPlanEntries(['1.1|A|全部|全窗口|P0|S001A|多余列']),
    /Invalid screenshot plan row/u,
    '列数异常必须被拒',
  )
})

test('4. 编号消费方全部接受后缀编号（漏改一处即失败）', () => {
  // 计划模块自己的显式后缀模式（不带 ?，因为它要求后缀必须显式给出）
  assert.ok(
    readRepoFile('scripts/manual/user-manual-screenshot-plan.mjs').includes('S\\d{3}[A-Z]'),
    '计划模块必须接受后缀编号（Sxxx + 大写字母）',
  )

  const consumers = [
    'scripts/manual/sync-user-manual-screenshot-plan.mjs',
    'scripts/manual/validate-user-manual.mjs',
    'scripts/manual/generate-user-manual.mjs',
    'scripts/manual/user-manual-screenshot-approvals.mjs',
    'scripts/manual/user-manual-screenshot-scenario-contract.mjs',
  ]
  for (const rel of consumers) {
    assert.ok(
      readRepoFile(rel).includes('S\\d{3}[A-Z]?'),
      `${rel} 必须接受后缀编号（S\\d{3}[A-Z]?），否则插行仍会漂移或被静默丢弃`,
    )
  }
})

test('5. 后缀编号可走完其余环节（无位置派生的强约束）', () => {
  // scenarios / capture / promote / verify 以字符串 id 为键，不按位置派生编号
  for (const rel of [
    'scripts/manual/user-manual-screenshot-scenarios.mjs',
    'scripts/manual/capture-user-manual-screenshots.mjs',
    'scripts/manual/promote-user-manual-screenshots.mjs',
    'scripts/manual/verify-user-manual-approved-screenshots.mjs',
  ]) {
    assert.doesNotMatch(
      readRepoFile(rel),
      /\bS\d\{3\}\b/u,
      `${rel} 不得内联三位编号假设（id 一律按字符串透传）`,
    )
  }
})

test('6. 校验链按计划 id 驱动，且 docx 允许落后（pending 登记）', () => {
  const validate = readRepoFile('scripts/manual/validate-user-manual.mjs')
  // 不得再用「第 N 个 = S{N}」的数字阶梯；必须按 planIds 位置比对
  assert.ok(validate.includes('planIds'), 'validate 必须按计划 id 列表比对')
  assert.doesNotMatch(
    validate,
    /`S\$\{String\(index\)\.padStart/u,
    'validate 不得再用数字阶梯生成编号',
  )
  assert.ok(
    validate.includes('docx-pending-figures.json'),
    'validate 必须读取 docx 待插入登记',
  )
  assert.ok(
    readRepoFile('scripts/manual/verify-user-manual-approved-screenshots.mjs').includes('docx-pending-figures.json'),
    'verify 必须与 validate 共用同一份 docx 待插入登记',
  )
  const registry = JSON.parse(readRepoFile('docs/user-manual/docx-pending-figures.json'))
  assert.equal(registry.schemaVersion, 1)
  assert.ok(Array.isArray(registry.pending), 'pending 必须是数组')
})
