import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)

function loadAccessVisibility() {
  return jiti('../../src/utils/access-visibility.ts')
}

test('global entries stay visible even without module access', () => {
  const { isAccessControlledItemVisible } = loadAccessVisibility()

  const visible = isAccessControlledItemVisible(
    {
      accessScope: 'global',
      moduleCode: 'sensory',
    },
    () => false,
  )

  assert.equal(visible, true)
})

test('module entries are visible when the module is authorized', () => {
  const { isAccessControlledItemVisible } = loadAccessVisibility()

  const visible = isAccessControlledItemVisible(
    {
      accessScope: 'module',
      moduleCode: 'emotional',
    },
    (moduleCode) => moduleCode === 'emotional',
  )

  assert.equal(visible, true)
})

test('module entries are hidden when the module is not authorized', () => {
  const { isAccessControlledItemVisible } = loadAccessVisibility()

  const visible = isAccessControlledItemVisible(
    {
      accessScope: 'module',
      moduleCode: 'sensory',
    },
    () => false,
  )

  assert.equal(visible, false)
})

test('entitlement entries require the matching capability package', () => {
  const { isAccessControlledItemVisible } = loadAccessVisibility()

  assert.equal(
    isAccessControlledItemVisible(
      {
        accessScope: 'entitlement',
        moduleCode: 'sensory',
        entitlementCode: 'fine_motor',
      },
      () => true,
      (entitlementCode) => entitlementCode === 'fine_motor',
    ),
    true,
  )

  assert.equal(
    isAccessControlledItemVisible(
      {
        accessScope: 'entitlement',
        moduleCode: 'sensory',
        entitlementCode: 'fine_motor',
      },
      () => true,
      (entitlementCode) => entitlementCode === 'sensory_integration',
    ),
    false,
  )
})

test('entitlement-any entries are visible when any capability package is authorized', () => {
  const { isAccessControlledItemVisible } = loadAccessVisibility()

  assert.equal(
    isAccessControlledItemVisible(
      {
        accessScope: 'entitlement-any',
        moduleCode: 'emotional',
        entitlementCodes: ['emotional', 'social_communication'],
      },
      () => false,
      (entitlementCode) => entitlementCode === 'social_communication',
    ),
    true,
  )
})
