function createToneDataUri(
  frequency: number,
  durationMs: number,
  {
    sampleRate = 22050,
    volume = 0.35,
  }: {
    sampleRate?: number
    volume?: number
  } = {},
): string {
  const frameCount = Math.max(1, Math.floor(sampleRate * (durationMs / 1000)))
  const buffer = new ArrayBuffer(44 + frameCount * 2)
  const view = new DataView(buffer)

  function writeAscii(offset: number, text: string): void {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + frameCount * 2, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, frameCount * 2, true)

  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / frameCount
    const envelope = Math.sin(Math.PI * progress)
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate)
    const value = Math.max(-1, Math.min(1, sample * envelope * volume))
    view.setInt16(44 + index * 2, Math.floor(value * 0x7fff), true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return `data:audio/wav;base64,${btoa(binary)}`
}

export const TRAINING_CORRECT_SFX = createToneDataUri(880, 220, { volume: 0.28 })
export const TRAINING_ERROR_SFX = createToneDataUri(220, 170, { volume: 0.32 })

export const TRAINING_ERROR_FEEDBACK_MS = 150
export const TRAINING_ERROR_RESET_MS = 320
export const TRAINING_SUCCESS_FEEDBACK_MS = 5000
