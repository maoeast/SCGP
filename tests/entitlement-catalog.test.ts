import assert from 'node:assert/strict'

import {
  ENTITLEMENT_DEFINITIONS,
  isEntitlementCode,
  resolveEffectiveEntitlementDetails,
} from '../src/features/entitlements/entitlement-catalog.ts'

const sensoryResolution = resolveEffectiveEntitlementDetails(['sensory'])
assert.deepEqual(sensoryResolution.effectiveEntitlements, ['sensory_integration', 'fine_motor'])
assert.deepEqual(sensoryResolution.entitlementDebugOrigins.sensory_integration, ['legacy_sensory_mapping'])
assert.deepEqual(sensoryResolution.entitlementDebugOrigins.fine_motor, ['legacy_sensory_mapping'])

const emotionalResolution = resolveEffectiveEntitlementDetails(['emotional'])
assert.deepEqual(emotionalResolution.effectiveEntitlements, ['emotional', 'soothing_aids'])
assert.deepEqual(emotionalResolution.entitlementDebugOrigins.emotional, ['legacy_emotional_mapping'])
assert.deepEqual(emotionalResolution.entitlementDebugOrigins.soothing_aids, ['legacy_emotional_mapping'])

const mixedResolution = resolveEffectiveEntitlementDetails(['sensory', 'fine_motor', 'social', 'fine_motor'])
assert.deepEqual(mixedResolution.effectiveEntitlements, [
  'sensory_integration',
  'social_communication',
  'fine_motor',
])
assert.deepEqual(mixedResolution.entitlementDebugOrigins.fine_motor, [
  'legacy_sensory_mapping',
  'direct_license_entitlement',
])

assert.equal(ENTITLEMENT_DEFINITIONS.cognitive.status, 'placeholder')
assert.equal(ENTITLEMENT_DEFINITIONS.cognitive.uiStrategy, 'lock')

const unknownResolution = resolveEffectiveEntitlementDetails(['unknown_bundle', 'cognitive'])
assert.deepEqual(unknownResolution.effectiveEntitlements, ['cognitive'])
assert.deepEqual(unknownResolution.unknownCodes, ['unknown_bundle'])
assert.equal(isEntitlementCode('unknown_bundle'), false)
assert.equal(isEntitlementCode('cognitive'), true)

console.log('entitlement catalog test passed')
