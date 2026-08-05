/**
 * 跨量表学生画像聚合 — 单元测试
 *
 * 运行：npx jiti tests/assessment-profile.test.ts
 *
 * 覆盖纯函数聚合逻辑（无 DB 依赖）：
 *  1. buildStudentProfile 按领域分组、取最近一次（升序末项）
 *  2. 未测量表计入 untestedScales（透明列出覆盖盲区）
 *  3. 领域强弱聚合：weak 优先（保守不掩盖短板）
 *  4. strengthToScore 量化分（strong=80/normal=60/weak=30/mixed=50）
 *  5. buildScaleConclusion 结论生成（含 scoreNote 语义 + 强弱方向建议）
 *  6. 领域固定顺序（sensory→life_skills），保证雷达图轴稳定
 *  7. 空数据防御：无任何量表时 domains 为空、不抛错
 */
import assert from 'node:assert/strict'
import {
  buildStudentProfile,
  buildScaleConclusion,
  strengthToScore,
  strengthLabel,
  SCALE_DOMAIN_MAP,
  DOMAIN_LABELS,
  type StudentProfile,
} from '../src/services/assessment-profile.ts'
import type { ScoreAdapter, ScoreSnapshot } from '../src/services/assessment-score-adapters.ts'

// ---------- 测试辅助：构造 adapter + 快照 ----------
function makeAdapter(scaleCode: string, scaleName: string, scoreNote: string): ScoreAdapter {
  return { scaleCode, scaleName, scoreNote, getLongitudinalScores: () => [] }
}

function makeSnap(assessId: number, date: string, totalScore: number, level: string): ScoreSnapshot {
  return { assessId, date, ageMonths: 60, totalScore, level, dimensionScores: {} }
}

// ---------- 1. 按领域分组 + 取最近一次 ----------
{
  const profile = buildStudentProfile(
    { id: 1, name: '小明', gender: 'M' },
    [
      // csirs 两次评估 → 取最近一次（2026-06）
      {
        scaleCode: 'csirs',
        adapter: makeAdapter('csirs', 'CSIRS', '分高=好'),
        snapshots: [
          makeSnap(11, '2026-01-01', 40, '正常'),
          makeSnap(12, '2026-06-01', 35, '偏低'),
        ],
      },
      {
        scaleCode: 'srs2',
        adapter: makeAdapter('srs2', 'SRS-2', '分高=差'),
        snapshots: [makeSnap(21, '2026-03-01', 62, 'mild')],
      },
    ],
    ['csirs', 'srs2', 'weefim'],
  )
  assert.equal(profile.domains.length, 2, '应有 2 个领域')
  const sensory = profile.domains.find((d) => d.domain === 'sensory')!
  assert.ok(sensory, 'csirs 应归入 sensory 领域')
  assert.equal(sensory.scales.length, 1)
  assert.equal(sensory.scales[0]!.latestSnapshot.assessId, 12, '应取最近一次评估（升序末项）')
  assert.equal(sensory.scales[0]!.latestSnapshot.totalScore, 35)
  const social = profile.domains.find((d) => d.domain === 'social')!
  assert.ok(social, 'srs2 应归入 social 领域')
  assert.equal(social.scales[0]!.scaleCode, 'srs2')
}

// ---------- 2. 未测量表计入 untestedScales ----------
{
  const profile = buildStudentProfile(
    { id: 2, name: '小红', gender: 'F' },
    [{ scaleCode: 'sm', adapter: makeAdapter('sm', 'S-M', '分高=好'), snapshots: [makeSnap(1, '2026-01-01', 100, '良好')] }],
    ['sm', 'weefim', 'csirs', 'srs2'],
  )
  assert.deepEqual(profile.untestedScales.sort(), ['csirs', 'srs2', 'weefim'], '未测量表应透明列出')
  assert.equal(profile.domains.length, 1)
  assert.equal(profile.domains[0]!.domain, 'life_skills')
}

// ---------- 3. 领域强弱聚合：weak 优先 ----------
{
  const profile = buildStudentProfile(
    { id: 3, name: '小刚', gender: 'M' },
    [
      {
        scaleCode: 'csirs',
        adapter: makeAdapter('csirs', 'CSIRS', ''),
        snapshots: [makeSnap(1, '2026-01-01', 45, '优秀')], // strong
      },
      {
        scaleCode: 'cnbsr2016',
        adapter: makeAdapter('cnbsr2016', 'CNBS', ''),
        snapshots: [makeSnap(2, '2026-01-01', 65, '发育迟缓')], // weak
      },
    ],
    ['csirs', 'cnbsr2016'],
  )
  const sensory = profile.domains.find((d) => d.domain === 'sensory')!
  assert.equal(sensory.strength, 'mixed', '同领域 strong + weak 应聚合为 mixed')
}

// ---------- 4. strengthToScore / strengthLabel 量化分 ----------
{
  assert.equal(strengthToScore('strong'), 80)
  assert.equal(strengthToScore('normal'), 60)
  assert.equal(strengthToScore('weak'), 30)
  assert.equal(strengthToScore('mixed'), 50)
  assert.equal(strengthLabel('strong'), '偏强')
  assert.equal(strengthLabel('normal'), '正常')
  assert.equal(strengthLabel('weak'), '偏弱')
  assert.equal(strengthLabel('mixed'), '混合')
}

// ---------- 5. buildScaleConclusion 结论生成 ----------
{
  const latest = makeSnap(1, '2026-01-15T08:00:00Z', 68, '临床显著')
  const c = buildScaleConclusion('srs2', '社交反应量表', '分越高社交缺损越严重', latest)
  assert.match(c.summary, /社交反应量表/)
  assert.match(c.summary, /总分 68/)
  assert.match(c.summary, /临床显著/)
  assert.match(c.summary, /分越高社交缺损越严重/, 'scoreNote 语义应包含在结论中')
  assert.ok(c.advice.length > 0, '应有建议')
  assert.match(c.advice[0]!, /短板|干预/, 'weak 等级应给短板/干预方向建议')
}

// ---------- 6. 领域固定顺序 ----------
{
  const profile = buildStudentProfile(
    { id: 4, name: '小芳', gender: 'F' },
    [
      { scaleCode: 'weefim', adapter: makeAdapter('weefim', 'WeeFIM', ''), snapshots: [makeSnap(1, '2026-01-01', 100, '正常')] },
      { scaleCode: 'srs2', adapter: makeAdapter('srs2', 'SRS-2', ''), snapshots: [makeSnap(2, '2026-01-01', 50, '正常')] },
      { scaleCode: 'csirs', adapter: makeAdapter('csirs', 'CSIRS', ''), snapshots: [makeSnap(3, '2026-01-01', 40, '正常')] },
    ],
    ['csirs', 'srs2', 'weefim'],
  )
  assert.deepEqual(
    profile.domains.map((d) => d.domain),
    ['sensory', 'social', 'life_skills'],
    '领域应按固定顺序（sensory→emotional→social→cognitive→life_skills），与输入顺序无关',
  )
}

// ---------- 7. 空数据防御 ----------
{
  const profile = buildStudentProfile({ id: 5, name: '无数据', gender: 'M' }, [], ['csirs', 'srs2'])
  assert.equal(profile.domains.length, 0, '无评估时领域应为空')
  assert.deepEqual(profile.untestedScales.sort(), ['csirs', 'srs2'])
}

// ---------- 8. 领域映射完整性 ----------
{
  // 13 个支持量表都应映射到领域（遗漏会导致画像静默丢数据）
  const SUPPORTED = ['csirs', 'conners_psq', 'conners_trs', 'srs2', 'sdq', 'cbcl', 'brief', 'weefim', 'cnbsr2016', 'fine_motor', 'gmfm_88', 'tgmd_3', 'sm']
  const unmapped = SUPPORTED.filter((c) => !SCALE_DOMAIN_MAP[c])
  assert.deepEqual(unmapped, [], `所有支持量表都应映射领域，未映射：${unmapped.join(',')}`)
  // 五个领域标签齐全
  assert.equal(Object.keys(DOMAIN_LABELS).length, 5)
}

console.log('assessment-profile test passed (8 场景)')
