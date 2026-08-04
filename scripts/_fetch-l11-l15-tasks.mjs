/**
 * 精简版：仅轮询已提交的 task_id 并下载 PNG。
 * 用法：node scripts/_fetch-l11-l15-tasks.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API_BASE = 'https://api.apimart.ai/v1'
const apiKey = JSON.parse(readFileSync(resolve(root, 'AIimages/config.json'), 'utf8')).api_key

const SCENES_DIR = resolve(root, 'assets/resources/images/self-care/scenes')
mkdirSync(SCENES_DIR, { recursive: true })

// L12 倒水场景图的已提交 task_id
const SCENE_TASKS = [
  { key: 'pourwater-table-scene', taskId: 'task_01KZ5M3G0QZ3A6NMJDBPMK1Z3K' },
]

async function pollAndDownload(key, taskId, outDir) {
  const outPath = resolve(outDir, `${key}.png`)
  if (existsSync(outPath)) { console.log(`[${key}] 已存在，跳过`); return }

  console.log(`[${key}] 轮询 ${taskId} ...`)
  const deadline = Date.now() + 10 * 60 * 1000
  let consecutive = 0

  while (Date.now() < deadline) {
    let data
    try {
      const r = await fetch(`${API_BASE}/tasks/${taskId}?language=zh`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(20000),
      })
      const body = await r.json()
      data = body?.data
      consecutive = 0
    } catch (e) {
      consecutive++
      if (consecutive >= 30) throw new Error(`[${key}] 连续失败 ${consecutive} 次: ${e.message}`)
      await sleep(2000 + Math.random() * 3000)
      continue
    }

    if (data?.status === 'completed') {
      const url = data?.result?.images?.[0]?.url?.[0]
      if (!url) throw new Error(`[${key}] 完成但无 URL`)
      console.log(`[${key}] 完成，下载中...`)
      await downloadPng(url, outPath)
      console.log(`[${key}] ✓ 已保存`)
      return
    }
    if (data?.status === 'failed' || data?.status === 'cancelled') {
      throw new Error(`[${key}] 任务 ${data.status}`)
    }
    process.stdout.write(`  [${key}] ${data?.progress ?? 0}%\r`)
    await sleep(4000)
  }
  throw new Error(`[${key}] 超时`)
}

async function downloadPng(url, filePath) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length < 100) throw new Error(`太小: ${buf.length} bytes`)
      const tmp = filePath + '.tmp'
      writeFileSync(tmp, buf)
      renameSync(tmp, filePath)
      return
    } catch (e) {
      console.log(`  下载重试 ${attempt + 1}: ${e.message}`)
      await sleep(3000)
    }
  }
  throw new Error(`下载 ${url} 失败`)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ---- main ----
console.log('=== 拉取 L12 倒水场景图 ===')
for (const { key, taskId } of SCENE_TASKS) {
  await pollAndDownload(key, taskId, SCENES_DIR)
}
console.log('\n=== 场景图全部完成 ===')
