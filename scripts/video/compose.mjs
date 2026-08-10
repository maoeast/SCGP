/**
 * SCGP 入门视频 — 合成引擎（compose.mjs）
 *
 * 每场景：raw 底片 + 旁白 mp3 + SRT 字幕 → 对齐时长 → ffmpeg 烧录字幕混流 → 场景 mp4
 * 全部场景合成后按顺序拼接为章节 mp4。
 *
 * 用法：
 *   node scripts/video/compose.mjs              # 合成全部场景 + 拼接
 *   node scripts/video/compose.mjs --scene s2   # 只合成单个场景
 *
 * 产物：output/videos/scene-<n>-<id>.mp4 / output/videos/<project.name>.mp4
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..', '..');
const STORYBOARD = JSON.parse(fs.readFileSync(path.join(__dirname, 'storyboard.json'), 'utf8'));
const FFMPEG = STORYBOARD.project.ffmpeg;
const WORK_DIR = path.join(ROOT_DIR, 'output', 'videos');
const RAW_DIR = path.join(WORK_DIR, 'raw');
const TTS_DIR = path.join(WORK_DIR, 'tts');
const SCENE_DIR = path.join(WORK_DIR, 'scene');

const NARRATION_START_S = 0.6;   // 旁白在场景开头后 0.6s 开始
const TAIL_PAD_S = 1.4;          // 旁白结束后保留的尾留
const MAX_EXTRA_S = 2.0;         // 底片比目标长超过该值时截断

function log(message) { console.log(`  ${message}`); }
function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    const tail = (result.stderr || '').split('\n').filter(Boolean).slice(-15).join('\n');
    throw new Error(`${cmd} ${args.join(' ')}\n${tail}`);
  }
  return result.stdout;
}

function probeDuration(filePath) {
  const out = run(FFMPEG.replace('ffmpeg.exe', 'ffprobe.exe'), [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath,
  ]);
  return Number(out.trim());
}

/** sentenceBoundary 元数据（微秒）→ SRT 文本（时间 = 边界偏移 + 旁白起始偏移） */
function buildSrt(meta, narrationStartS) {
  const lines = [];
  meta.forEach((s, i) => {
    const startUs = s.offsetUs + narrationStartS * 1_000_000;
    const endUs = startUs + s.durationUs;
    lines.push(String(i + 1));
    lines.push(`${fmtSrt(startUs)} --> ${fmtSrt(endUs)}`);
    lines.push(s.text.trim());
    lines.push('');
  });
  return lines.join('\n');
}

function fmtSrt(us) {
  const totalMs = Math.floor(us / 1000);
  const ms = totalMs % 1000;
  const totalS = Math.floor(totalMs / 1000);
  const s = totalS % 60;
  const m = Math.floor(totalS / 60) % 60;
  const h = Math.floor(totalS / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/** Windows subtitles filter 路径转义：正斜杠 + 冒号反斜杠 */
function escapeFilterPath(p) {
  const normalized = p.replace(/\\/g, '/');
  return normalized.replace(/:/g, '\\:');
}

async function composeScene(scene, index) {
  const rawPath = path.join(RAW_DIR, `${scene.id}.mp4`);
  const mp3Path = path.join(TTS_DIR, `${scene.id}.mp3`);
  const metaPath = path.join(TTS_DIR, `${scene.id}.metadata.json`);
  if (!fs.existsSync(rawPath) || !fs.existsSync(mp3Path) || !fs.existsSync(metaPath)) {
    throw new Error(`${scene.id}: 缺少 raw 底片或旁白（${rawPath} / ${mp3Path}）`);
  }

  const rawDuration = probeDuration(rawPath);
  const voiceDuration = probeDuration(mp3Path);
  const targetDuration = voiceDuration + NARRATION_START_S + TAIL_PAD_S;
  log(`场景 ${scene.id}: 底片 ${rawDuration.toFixed(2)}s / 旁白 ${voiceDuration.toFixed(2)}s / 目标 ${targetDuration.toFixed(2)}s`);

  // 时长对齐
  let videoFilter = '';
  if (rawDuration < targetDuration) {
    videoFilter = `tpad=stop_mode=clone:stop_duration=${(targetDuration - rawDuration).toFixed(3)}`;
    log(`  补帧 ${(targetDuration - rawDuration).toFixed(2)}s`);
  } else if (rawDuration - targetDuration > MAX_EXTRA_S) {
    videoFilter = `trim=duration=${targetDuration.toFixed(3)},setpts=PTS-STARTPTS`;
    log(`  截断 ${(rawDuration - targetDuration).toFixed(2)}s`);
  }

  // 字幕
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const srtPath = path.join(SCENE_DIR, `${scene.id}.srt`);
  fs.mkdirSync(SCENE_DIR, { recursive: true });
  fs.writeFileSync(srtPath, buildSrt(meta, NARRATION_START_S), 'utf8');

  const outPath = path.join(SCENE_DIR, `${String(index + 1).padStart(2, '0')}-${scene.id}.mp4`);
  // 字幕用相对文件名 + cwd 定位，避免 Windows 盘符冒号在 filter 参数里的转义地狱
  const srtFileName = path.basename(srtPath);

  const filters = [];
  if (videoFilter) filters.push(`[0:v]${videoFilter}[v0]`);
  if (filters.length === 0) filters.push(`[0:v]null[v0]`);
  filters.push(`[v0]subtitles=filename=${srtFileName}[v]`);
  filters.push(`[1:a]adelay=${Math.round(NARRATION_START_S * 1000)}|${Math.round(NARRATION_START_S * 1000)}[a]`);
  const filterComplex = filters.join(';');

  run(FFMPEG, [
    '-y',
    '-i', rawPath,
    '-i', mp3Path,
    '-filter_complex', filterComplex,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outPath,
  ], { cwd: SCENE_DIR });
  log(`  合成完成: ${outPath}（${probeDuration(outPath).toFixed(2)}s）`);
  return outPath;
}

async function main() {
  const sceneArg = process.argv.find((a) => a.startsWith('--scene='));
  const scenes = sceneArg
    ? STORYBOARD.scenes.filter((s) => s.id === sceneArg.split('=')[1])
    : STORYBOARD.scenes;

  console.log('🎞  SCGP 视频合成引擎');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const outputs = [];
  for (let i = 0; i < scenes.length; i++) {
    const index = STORYBOARD.scenes.findIndex((s) => s.id === scenes[i].id);
    outputs.push(await composeScene(scenes[i], index));
  }

  if (!sceneArg) {
    // 拼接章节
    const chapterPath = path.join(WORK_DIR, `${STORYBOARD.project.name}.mp4`);
    const listPath = path.join(SCENE_DIR, 'concat-list.txt');
    fs.writeFileSync(listPath, outputs.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'), 'utf8');
    run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', chapterPath]);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 章节视频: ${chapterPath}（${probeDuration(chapterPath).toFixed(2)}s）`);
  }
}

main().catch((error) => { console.error('❌ 合成失败:', error.message); process.exit(1); });
