/**
 * 报告中心目录授权过滤 — 单元测试
 *
 * 运行：npx jiti tests/report-center-catalog.test.ts
 *
 * 覆盖：
 *  1. 全授权 → 全部 15 个量表卡片可见
 *  2. 仅 sensory_integration 授权 → 仅 4 个感官量表可见（csirs/tgmd_3/gmfm_88/cnbsr2016）
 *  3. 仅 cognitive 授权 → 仅 3 个认知量表可见（brief/crt/cognitive_self）
 *  4. 未传 entitlement checker → 全部不可见（所有量表均声明 accessEntitlementsAnyOf，entitlement-first）
 *  5. 空授权 → 全部不可见
 */
import assert from 'node:assert/strict'
import { createJiti } from 'jiti'
import {
  resolveEffectiveEntitlementDetails,
  type EntitlementCode,
} from '../src/features/entitlements/entitlement-catalog.ts'

// report-center-catalog 内部使用 `@/` alias（项目约定），jiti CLI 不解析 paths；
// 这里用 createJiti + alias 自包含配置（相对 cwd 的绝对路径），npx jiti 直接可跑
const jiti = createJiti(import.meta.url, {
  alias: { '@': `${process.cwd()}/src/` },
})
const {
  ASSESSMENT_REPORT_CATALOG,
  getAuthorizedAssessmentReportCatalog,
} = await jiti.import('../src/features/assessment/report-center-catalog.ts')

const allowAllModules = () => true

function byEntitlements(codes: EntitlementCode[]) {
  return (code: string) => codes.includes(code as EntitlementCode)
}

// 1. 全授权 → 全量
{
  const result = getAuthorizedAssessmentReportCatalog(allowAllModules, byEntitlements([
    'sensory_integration',
    'emotional',
    'soothing_aids',
    'social_communication',
    'fine_motor',
    'life_skills',
    'cognitive',
  ]))
  assert.deepEqual(
    result.map((item) => item.code).sort(),
    ASSESSMENT_REPORT_CATALOG.map((item) => item.code).sort(),
    '全授权应返回全部量表',
  )
}

// 2. 仅 sensory_integration → csirs/tgmd_3/gmfm_88/cnbsr2016（4 个）
{
  const result = getAuthorizedAssessmentReportCatalog(allowAllModules, byEntitlements(['sensory_integration']))
  assert.deepEqual(
    result.map((item) => item.code).sort(),
    ['csirs', 'tgmd_3', 'gmfm_88', 'cnbsr2016'].sort(),
    '仅 sensory_integration 授权应只显示感官统合 4 个量表',
  )
}

// 3. 真实感官 bundle（legacy sensory → sensory_integration + fine_motor）→ 5 个（+ FMDA）
{
  const bundle = resolveEffectiveEntitlementDetails(['sensory'])
  const result = getAuthorizedAssessmentReportCatalog(allowAllModules, byEntitlements(bundle.effectiveEntitlements))
  assert.deepEqual(
    result.map((item) => item.code).sort(),
    ['csirs', 'tgmd_3', 'gmfm_88', 'cnbsr2016', 'fine_motor'].sort(),
    '感官能力包授权应显示感官 4 量表 + FMDA',
  )
}

// 4. 仅 cognitive → brief/crt/cognitive_self/cnbsr2016（cnbsr2016 同时声明 cognitive）
{
  const result = getAuthorizedAssessmentReportCatalog(allowAllModules, byEntitlements(['cognitive']))
  assert.deepEqual(
    result.map((item) => item.code).sort(),
    ['brief', 'crt', 'cognitive_self', 'cnbsr2016'].sort(),
    '仅认知授权应只显示声明 cognitive 的量表',
  )
}

// 5. 未传 entitlement checker → 全部不可见（entitlement-first 兜底）
{
  const result = getAuthorizedAssessmentReportCatalog(allowAllModules)
  assert.equal(result.length, 0, '未传 entitlement checker 时不应显示任何量表')
}

// 6. 空授权 → 全部不可见
{
  const result = getAuthorizedAssessmentReportCatalog(allowAllModules, byEntitlements([]))
  assert.equal(result.length, 0, '空授权不应显示任何量表')
}

console.log('report center catalog test passed')
