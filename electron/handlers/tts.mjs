/**
 * Electron TTS IPC Handlers
 *
 * 使用 msedge-tts 在主进程合成语音，通过 IPC 返回音频数据给渲染进程。
 * 客户零配置，只需联网。
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural'
const DEFAULT_FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export function initTTSHandlers(ipcMain) {
  ipcMain.handle('tts:synthesize', async (_event, payload) => {
    const tts = new MsEdgeTTS()
    try {
      const text = typeof payload?.text === 'string' ? payload.text.trim() : ''
      if (!text) {
        return { success: false, error: '文本为空' }
      }

      const voice = payload.voice || DEFAULT_VOICE

      await tts.setMetadata(voice, DEFAULT_FORMAT)

      const prosody = {}
      if (payload.rate) prosody.rate = payload.rate
      if (payload.pitch) prosody.pitch = payload.pitch

      const { audioStream } = tts.toStream(text, Object.keys(prosody).length > 0 ? prosody : undefined)
      const audioBuffer = await streamToBuffer(audioStream)

      return {
        success: true,
        audioBase64: audioBuffer.toString('base64'),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    } finally {
      tts.close()
    }
  })

  console.log('[TTS] TTS 处理器已注册')
}
