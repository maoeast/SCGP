/**
 * L12 倒水小帮手场景图生成脚本
 *
 * 倒水游戏的水位由 CSS 程序化渲染，因此这里只生成场景底图。
 * 生成结果保存到 assets/resources/images/self-care/scenes/，运行时通过
 * resource:// 协议加载。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, renameSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// 透明代理（Clash Verge）环境下 Node fetch 需要显式设置代理
if (!process.env.https_proxy && !process.env.HTTPS_PROXY) {
  process.env.https_proxy = 'http://127.0.0.1:7897'
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API_BASE = 'https://api.apimart.ai/v1'
const SCENES_DIR = resolve(projectRoot, 'assets/resources/images/self-care/scenes')
const STATE_FILE = resolve(projectRoot, '.thincoder/pour-water-artwork-state.json')

const SCENE_STYLE_PREFIX =
  '儿童认知训练软件用的扁平场景插画，儿童绘本卡通风格，圆润可爱造型，粗描边线条，柔和明快的配色，画面整洁。' +
  '禁止文字、禁止水印、禁止人物。'

const SCENE_JOBS = [
  {
    kind: 'pourwater-table-scene',
    game: 'pourwater',
    name: '倒水桌面场景',
    size: '2:1',
    prompt: `${SCENE_STYLE_PREFIX}一个简洁的厨房桌面场景：浅木色桌面占据画面下半部分，桌面左侧放着一个蓝色卡通水壶（带手柄），右侧放着一个透明玻璃杯（空的）。水壶壶嘴对着杯口方向。背景是浅黄色厨房墙面，上方有一扇小窗。画面整洁明亮。`,
  },
]

function loadApiKey() {
  const configPath = resolve(projectRoot, 'AIimages/config.json')
  if (!existsSync(configPath)) throw new Error(`缺少 API 配置: ${configPath}（需包含 api_key）`)
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  if (!config.api_key) throw new Error('AIimages/config.json 中缺少 api_key')
  return config.api_key
}

// 原子写：先写临时文件再 rename，避免中断留下半截内容
function writeFileAtomic(filePath, content) {
  const tmp = `${filePath}.tmp`
  writeFileSync(tmp, content)
  if (existsSync(filePath)) {
    try { rmSync(filePath) } catch { /* ignore */ }
  }
  renameSync(tmp, filePath)
}

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return {} }
}

function saveState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true })
  writeFileAtomic(STATE_FILE, JSON.stringify(state, null, 2))
}

async function submitJob(apiKey, prompt, size) {
  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, n: 1, size: size || '1:1', resolution: '2k' }),
    signal: AbortSignal.timeout(30000),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`提交失败 (${res.status}): ${JSON.stringify(body)}`)
  const taskId = body?.data?.[0]?.task_id
  if (!taskId) throw new Error(`响应缺少 task_id: ${JSON.stringify(body)}`)
  return taskId
}

async function pollTask(apiKey, key, taskId, state) {
  const deadline = Date.now() + 8 * 60 * 1000
  let failures = 0
  while (Date.now() < deadline) {
    let res
    try {
      res = await fetch(`${API_BASE}/tasks/${taskId}?language=zh`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(20000),
      })
    } catch {
      failures += 1
      if (failures >= 15) throw new Error(`[${key}] 轮询连续失败 ${failures} 次，可重跑脚本续传`)
      if (failures % 5 === 0) process.stdout.write(`[${key}] 轮询失败 ${failures} 次，继续重试...\n`)
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 3000 + Math.random() * 2000))
      continue
    }

    failures = 0
    const body = await res.json()
    const data = body?.data
    if (data?.status === 'completed') {
      const url = data?.result?.images?.[0]?.url?.[0]
      if (!url) throw new Error(`[${key}] 任务完成但缺少图片 URL`)
      return url
    }
    if (data?.status === 'failed' || data?.status === 'cancelled') {
      delete state[key]
      saveState(state)
      throw new Error(`[${key}] 任务${data.status}: ${JSON.stringify(data?.error || data).slice(0, 500)}`)
    }

    process.stdout.write(`[${key}] 等待生成... ${data?.progress ?? 0}%\n`)
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 4000))
  }
  throw new Error(`[${key}] 任务超时`)
}

async function downloadImage(url, filePath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`下载失败 (${res.status}): ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`下载内容不是有效 PNG（${buf.length} bytes）`)
  }
  writeFileAtomic(filePath, buf)
}

function writeSceneManifest() {
  const manifestPath = resolve(SCENES_DIR, 'manifest.json')
  const manifest = {
    generated_at: new Date().toISOString(),
    model: 'gpt-image-2',
    style: '儿童绘本贴纸风格',
    note: '生活自理游戏场景底图：替代 StageArt 背景 SVG，绘本贴纸风 + 场景化底色。缩图后运行时用 resource:// 加载。',
    items: SCENE_JOBS.map((job) => ({
      kind: job.kind,
      game: job.game,
      name: job.name,
      size: job.size,
      file: `${job.kind}.png`,
    })),
  }
  writeFileAtomic(manifestPath, JSON.stringify(manifest, null, 2))
}

async function runSceneJobs(apiKey) {
  mkdirSync(SCENES_DIR, { recursive: true })
  const state = loadState()
  let count = 0

  for (const job of SCENE_JOBS) {
    const filePath = resolve(SCENES_DIR, `${job.kind}.png`)
    if (existsSync(filePath)) {
      console.log(`[${job.kind}] 已存在，跳过`)
      continue
    }

    let taskId = state[job.kind]
    if (taskId) {
      console.log(`[${job.kind}] 续传 ${taskId.slice(0, 18)}...`)
    } else {
      taskId = await submitJob(apiKey, job.prompt, job.size)
      state[job.kind] = taskId
      saveState(state)
      console.log(`[${job.kind}] 已提交 → ${taskId}`)
    }

    const url = await pollTask(apiKey, job.kind, taskId, state)
    await downloadImage(url, filePath)
    delete state[job.kind]
    saveState(state)
    console.log(`[${job.kind}] ✅ 已保存到 scenes/${job.kind}.png`)
    count += 1
  }

  writeSceneManifest()
  return count
}

async function main() {
  const apiKey = loadApiKey()
  console.log('[L12 Artwork] 开始生成倒水场景图...')
  const count = await runSceneJobs(apiKey)
  console.log(`[L12 Artwork] 完成：新增 ${count} 张场景图`)
}

main().catch((error) => {
  console.error('[L12 Artwork] 失败:', error instanceof Error ? error.message : error)
  process.exit(1)
})
