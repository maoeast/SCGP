import test from 'node:test'
import assert from 'node:assert/strict'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url, {
  alias: {
    '@': new URL('../../src/', import.meta.url).pathname,
  },
})

const poseAudio = jiti('../../src/composables/usePoseAudio.ts')

test('Air Conductor audio profile uses a low-stimulation pentatonic range and gentler filter sweep', () => {
  const scale = poseAudio.createPentatonicScale()

  assert.deepEqual(scale, [
    'C3',
    'D3',
    'E3',
    'G3',
    'A3',
    'C4',
    'D4',
    'E4',
    'G4',
    'A4',
    'C5',
    'D5',
    'E5',
  ])
  assert.equal(poseAudio.mapHeightToScaleIndex(0), 0)
  assert.equal(poseAudio.mapHeightToScaleIndex(0.52), scale.length - 1)
  assert.equal(poseAudio.mapHeightToScaleIndex(1), scale.length - 1)

  assert.equal(poseAudio.mapHorizontalToFilterFrequency(0), 320)
  assert.equal(poseAudio.mapHorizontalToFilterFrequency(1), 2200)
  assert.equal(poseAudio.mapHorizontalToFilterFrequency(0.5) > 320, true)
  assert.equal(poseAudio.mapHorizontalToFilterFrequency(0.5) < 2200, true)
})

test('Air Conductor synth and effect presets prefer soft sine tones with slower attack envelopes', () => {
  const leftSynth = poseAudio.createAirConductorSynthOptions('left')
  const rightSynth = poseAudio.createAirConductorSynthOptions('right')
  const effects = poseAudio.createAirConductorEffectOptions()
  const harmonySynth = poseAudio.createAirConductorHarmonySynthOptions()
  const compressor = poseAudio.createAirConductorCompressorOptions()

  assert.equal(leftSynth.oscillator.type, 'sine')
  assert.equal(rightSynth.oscillator.type, 'sine')
  assert.equal(leftSynth.envelope.attack >= 0.1 && leftSynth.envelope.attack <= 0.12, true)
  assert.equal(rightSynth.envelope.attack >= 0.1 && rightSynth.envelope.attack <= 0.12, true)
  assert.equal(leftSynth.envelope.release >= 1, true)
  assert.equal(rightSynth.envelope.release >= 1, true)

  assert.equal(effects.outputGain, 0.52)
  assert.equal(effects.filterBaseFrequency, 900)
  assert.equal(effects.filterMaxFrequency, 2200)
  assert.equal(effects.delayWet, 0.08)
  assert.equal(effects.harmonyWet, 0.22)

  assert.equal(harmonySynth.volume, -16)
  assert.equal(harmonySynth.oscillator.type, 'sine')
  assert.equal(harmonySynth.envelope.attack >= 0.1, true)
  assert.equal(harmonySynth.envelope.release >= 1, true)

  assert.equal(compressor.threshold, -18)
  assert.equal(compressor.ratio, 4)
  assert.equal(compressor.attack <= 0.02, true)
  assert.equal(compressor.release >= 0.2, true)
})

test('Air Conductor filter mapping stays logarithmic instead of rushing into the high end linearly', () => {
  const lowQuarter = poseAudio.mapHorizontalToFilterFrequency(0.25)
  const middle = poseAudio.mapHorizontalToFilterFrequency(0.5)
  const upperQuarter = poseAudio.mapHorizontalToFilterFrequency(0.75)

  assert.equal(lowQuarter, 518)
  assert.equal(middle, 839)
  assert.equal(upperQuarter, 1359)
  assert.equal(middle - lowQuarter < upperQuarter - middle, true)
})
