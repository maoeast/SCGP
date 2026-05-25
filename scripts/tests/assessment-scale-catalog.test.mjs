import test from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
    '@element-plus/icons-vue': `${projectRoot}/scripts/tests/fixtures/element-plus-icons-vue.mock.js`,
  },
})

function loadAssessmentScaleCatalog() {
  return jiti('../../src/features/assessment/assessment-scale-catalog.ts')
}

test('assessment scale visibility uses capability packages when configured', () => {
  const {
    getAssessmentScaleCatalogItem,
    isAssessmentScaleAuthorized,
    getVisibleAssessmentScalesForTab,
  } = loadAssessmentScaleCatalog()

  const fineMotorScale = getAssessmentScaleCatalogItem('fine_motor')
  assert.ok(fineMotorScale)

  assert.equal(
    isAssessmentScaleAuthorized(
      fineMotorScale,
      (moduleCode) => moduleCode === 'sensory',
      (entitlementCode) => entitlementCode === 'sensory_integration',
    ),
    false,
  )

  assert.equal(
    isAssessmentScaleAuthorized(
      fineMotorScale,
      () => false,
      (entitlementCode) => entitlementCode === 'fine_motor',
    ),
    true,
  )

  const visibleFineMotorScales = getVisibleAssessmentScalesForTab(
    'fine-motor',
    () => false,
    (entitlementCode) => entitlementCode === 'fine_motor',
  ).map((scale) => scale.code)

  assert.deepEqual(visibleFineMotorScales, ['cnbsr2016', 'fine_motor'])
})
