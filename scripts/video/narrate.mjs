/**
 * SCGP 入门视频 — 旁白生成（narrate.mjs）
 *
 * 用 msedge-tts（项目已有依赖）为每个场景生成中文旁白 mp3，
 * 并保存句子边界元数据（sentenceBoundary），供 align 阶段生成精确字幕。
 *
 * 用法：
 *   node scripts/video/narrate.mjs              # 为所有场景生成（跳过已存在）
 *   node scripts/video/narrate.mjs --force      # 强制重新生成
 *
 * 产物：output/videos/tts/<scene-id>.mp3 + <scene-id>.metadata.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..', '..');
const STORYBOARD = JSON.parse(fs.readFileSync(path.join(__dirname, 'storyboard.json'), 'utf8'));
const TTS_DIR = path.join(ROOT_DIR, 'output', 'videos', 'tts');

function log(message) { console.log(`  ${message}`); }

/**
 * 生成一句旁白：mp3 + 句子边界元数据（JSON: { offsetUs, durationUs, text }[]）
 * msedge-tts 的 Offset/Duration 单位为 100ns；这里统一转成 微秒。
 */
async function generateNarration(scene, force) {
  const mp3Path = path.join(TTS_DIR, `${scene.id}.mp3`);
  const metaPath = path.join(TTS_DIR, `${scene.id}.metadata.json`);
  if (!force && fs.existsSync(mp3Path) && fs.existsSync(metaPath)) {
    log(`跳过 ${scene.id}（已存在）`);
    return { mp3Path, metaPath };
  }

  const tts = new MsEdgeTTS();
  await tts.setMetadata(STORYBOARD.project.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
    sentenceBoundaryEnabled: true,
  });

  const sentences = [];
  const { audioStream, metadataStream } = tts.toStream(scene.narration);

  const collectStream = (stream, timeoutMs = 30_000, rawChunks = false) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(rawChunks ? chunks : Buffer.concat(chunks));
      };
      const fail = (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      };
      const timer = setTimeout(() => fail(new Error(`TTS 流 ${timeoutMs / 1000}s 无数据/未结束`)), timeoutMs);
      stream.on('data', (d) => chunks.push(d));
      stream.on('error', fail);
      stream.on('end', done);
      stream.on('close', done);
    });

  let audioBuffer;
  let metaChunks;
  try {
    [audioBuffer, metaChunks] = await Promise.all([
      collectStream(audioStream),
      metadataStream ? collectStream(metadataStream, 30_000, true) : Promise.resolve([]),
    ]);
  } catch (error) {
    throw new Error(`场景 ${scene.id} TTS 失败: ${error.message}`);
  }

  if (audioBuffer.length === 0) throw new Error(`场景 ${scene.id}: TTS 未返回音频数据`);

  // metadata 是流式 JSON：每个 data chunk 是一个完整对象，逐 chunk 解析
  const entries = [];
  for (const chunk of metaChunks) {
    try {
      const obj = JSON.parse(chunk.toString('utf8'));
      if (obj?.Metadata) entries.push(...obj.Metadata);
    } catch { /* 忽略碎片 */ }
  }
  for (const entry of entries) {
    if (entry.Type === 'SentenceBoundary') {
      sentences.push({
        offsetUs: Math.round(entry.Data.Offset / 100),
        durationUs: Math.round(entry.Data.Duration / 100),
        text: entry.Data.text?.Text || '',
      });
    }
  }

  fs.mkdirSync(TTS_DIR, { recursive: true });
  fs.writeFileSync(mp3Path, audioBuffer);
  fs.writeFileSync(metaPath, JSON.stringify(sentences, null, 2));
  fs.writeFileSync(path.join(TTS_DIR, `${scene.id}.metadata.raw.txt`), metaChunks.map((c) => c.toString('utf8')).join(''));
  log(`生成 ${scene.id}: ${mp3Path}（${(audioBuffer.length / 1024).toFixed(0)} KB, ${sentences.length} 句边界）`);
  return { mp3Path, metaPath };
}

async function main() {
  const force = process.argv.includes('--force');
  console.log('🎙  SCGP 旁白生成（msedge-tts）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const scene of STORYBOARD.scenes) {
    await generateNarration(scene, force);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 旁白全部就绪');
}

main().catch((error) => { console.error('❌ 旁白生成失败:', error); process.exit(1); });
