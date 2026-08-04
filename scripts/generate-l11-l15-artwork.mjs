/**
 * L11-L15 生活自理游戏美术资产生成脚本
 *
 * 为 5 个新游戏生成 gpt-image-2 美术资产：
 *   - L11 洗脸（FaceWashGame）
 *   - L12 倒水（PourWaterGame）
 *   - L13 过马路（RoadCrossGame）
 *   - L14 叠衣（FoldClothesGame）
 *   - L15 扫地（SweepFloorGame）
 *
 * 两组产物：
 *   1. scenes/    — 场景底图（2:1 或 1:1）
 *   2. progress/  — 链式状态进度图（1:1，浅绿底，每张基于上一张生成保证一致性）
 *
 * 注：L12 倒水改用 CSS 程序化水位层，不再生成进度图（5 张省略）。
 * 其余 L11/L13/L14/L15 共 16 张进度图仍由本脚本生成。
 *
 * 一致性策略：同一游戏的进度图使用链式生成（input 参考前一张），
 * 保证同场景、同角色、同道具在不同状态下视觉完全一致。
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

// 输出目录
const SCENES_DIR = resolve(projectRoot, 'assets/resources/images/self-care/scenes')
const PROGRESS_DIR = resolve(projectRoot, 'assets/resources/images/self-care/progress')
const STATE_FILE = resolve(projectRoot, '.thincoder/l11-l15-progress-state.json')

// ========== 风格前缀 ==========

const SCENE_STYLE_PREFIX =
  '儿童认知训练软件用的扁平场景插画，儿童绘本卡通风格，圆润可爱造型，粗描边线条，柔和明快的配色，画面整洁。' +
  '禁止文字、禁止水印、禁止人物（除非特别说明）。'

const PROGRESS_STYLE_PREFIX =
  '儿童认知训练软件用的扁平贴纸插画，儿童绘本卡通风格，圆润可爱造型，粗描边线条，柔和明快的配色。' +
  '禁止文字、禁止水印。背景为单一纯色浅绿色(#EAF6EE)，无任何装饰。'

// 链式一致性约束
const CONSISTENCY_FACE =
  '严格保持输入图中的场景完全一致：同样的卡通洗脸池、同样的镜子、同样的配色和线条风格。' +
  '只按描述改变脸部区域的清洁状态，其他一切保持不变。'

const CONSISTENCY_ROAD =
  '严格保持输入图中的场景完全一致：同样的斑马线、同样的交通灯柱、同样的配色和线条风格。' +
  '只按描述改变交通灯颜色和小人位置，其他一切保持不变。'

const CONSISTENCY_FOLD =
  '严格保持输入图中的衣物完全一致：同样的卡通T恤、同样的颜色和线条风格。' +
  '只按描述改变衣物的折叠程度，其他一切保持不变。'

const CONSISTENCY_SWEEP =
  '严格保持输入图中的场景完全一致：同样的卡通房间地板、同样的家具边角、同样的配色和线条。' +
  '只按描述改变地面垃圾碎屑的数量和分布，其他一切保持不变。'

// ========== 组 1：场景底图 ==========

const SCENE_JOBS = [
  {
    kind: 'facewash-basin-scene',
    game: 'facewash',
    name: '洗脸台场景',
    size: '2:1',
    prompt: `${SCENE_STYLE_PREFIX}一个温馨的家用洗脸台场景：白色陶瓷水槽居中，上方一面圆形镜子映出一张卡通笑脸轮廓（脸上有泡泡），水龙头在左侧开着涓涓细水。台面放着一瓶洗面奶和一条小毛巾。背景浅蓝色卫生间墙面。画面整洁明亮。`,
  },
  {
    kind: 'pourwater-table-scene',
    game: 'pourwater',
    name: '倒水桌面场景',
    size: '2:1',
    prompt: `${SCENE_STYLE_PREFIX}一个简洁的厨房桌面场景：浅木色桌面占据画面下半部分，桌面左侧放着一个蓝色卡通水壶（带手柄），右侧放着一个透明玻璃杯（空的）。水壶壶嘴对着杯口方向。背景是浅黄色厨房墙面，上方有一扇小窗。画面整洁明亮。`,
  },
  {
    kind: 'roadcross-intersection-scene',
    game: 'roadcross',
    name: '马路交叉口场景',
    size: '2:1',
    prompt: `${SCENE_STYLE_PREFIX}一个卡通城市人行横道场景：画面下方是灰色马路和白色斑马线条纹，马路对面是浅绿色人行道和卡通小树。右侧竖立一根交通信号灯杆（红黄绿三盏灯，当前全灭）。左侧人行道边站着一个小黄色等候标志。天空浅蓝色，有一两朵白云。`,
  },
  {
    kind: 'foldclothes-bed-scene',
    game: 'foldclothes',
    name: '叠衣床铺场景',
    size: '2:1',
    prompt: `${SCENE_STYLE_PREFIX}一个整洁的儿童卧室场景：画面中央是一张铺好浅蓝色床单的小床，床的右侧有一个打开的木色衣柜。床面上空旷整洁（后续叠加衣物）。背景是浅暖黄色墙面，墙上贴着一颗卡通星星贴纸。地面为浅色木地板。`,
  },
  {
    kind: 'sweepfloor-room-scene',
    game: 'sweepfloor',
    name: '扫地房间场景',
    size: '2:1',
    prompt: `${SCENE_STYLE_PREFIX}一个卡通客厅地面场景，俯视角度：浅色木地板铺满画面，左下角可见一个卡通圆形地毯边缘，右上角可见一个沙发脚。地板上散落着若干彩色纸屑、小纸团和饼干碎。画面中部偏右放着一个绿色畚箕。整体干净明亮的绘本风格。`,
  },
]

// ========== 组 2：链式进度图（每个游戏一条链） ==========
// 每条链：第一张独立生成（seed），后续以 from 引用前一张图保证一致性
// game 字段用于分组输出和 manifest

const PROGRESS_CHAINS = [
  // --- L11 洗脸：脏脸 → 洗额头 → 洗脸颊 → 洗下巴 → 洗完干净 ---
  {
    game: 'facewash',
    consistency: CONSISTENCY_FACE,
    jobs: [
      {
        key: 'facewash-dirty',
        from: null, // seed
        desc: '一张卡通圆脸特写，正面视角，大眼睛微笑。脸上额头、左右脸颊、下巴四个区域各有一小块浅棕色污渍（泥巴/食物残渣），清晰可辨四块脏区。脸型圆润，腮红可爱。居中放置占满画面。',
      },
      {
        key: 'facewash-forehead-clean',
        from: 'facewash-dirty',
        desc: '额头区域的污渍被洗掉了，额头干净光滑，其他三处（左右脸颊、下巴）污渍不变。',
      },
      {
        key: 'facewash-cheeks-clean',
        from: 'facewash-forehead-clean',
        desc: '左右脸颊区域的污渍也被洗掉了，只剩下巴一处有污渍。额头和脸颊干净。',
      },
      {
        key: 'facewash-all-clean',
        from: 'facewash-cheeks-clean',
        desc: '下巴的污渍也洗掉了，整张脸完全干净，皮肤白净光滑，笑容更加灿烂。',
      },
    ],
  },
  // --- L12 倒水：改用 CSS 程序化水位层，不再生成进度图 ---
  // --- L13 过马路：红灯等待 → 绿灯亮 → 走到中间 → 安全到对面 ---
  {
    game: 'roadcross',
    consistency: CONSISTENCY_ROAD,
    jobs: [
      {
        key: 'roadcross-redlight',
        from: null,
        desc: '卡通人行横道场景：斑马线横贯画面中部，右侧交通灯亮红灯（红色圆灯发光）。斑马线这一侧（画面下方人行道）站着一个卡通小人偶，双手放身侧乖乖等待。画面居中。',
      },
      {
        key: 'roadcross-greenlight',
        from: 'roadcross-redlight',
        desc: '交通灯变为绿灯（绿色圆灯发光，红灯灭）。小人偶仍站在人行道上，抬起一只脚准备迈步。',
      },
      {
        key: 'roadcross-crossing',
        from: 'roadcross-greenlight',
        desc: '小人偶已走到斑马线中间位置，正在行走姿态（一脚在前一脚在后）。绿灯仍亮着。',
      },
      {
        key: 'roadcross-safe',
        from: 'roadcross-crossing',
        desc: '小人偶已安全到达马路对面的人行道上，开心地举起双手欢呼。绿灯仍亮着。',
      },
    ],
  },
  // --- L14 叠衣：摊开 → 左折 → 右折 → 下折 → 叠好 ---
  {
    game: 'foldclothes',
    consistency: CONSISTENCY_FOLD,
    jobs: [
      {
        key: 'foldclothes-spread',
        from: null,
        desc: '一件黄色卡通T恤完全平铺展开在浅色平面上，正面朝上，领口在上方，双袖左右展开，下摆在下方。T恤居中占满画面。',
      },
      {
        key: 'foldclothes-left',
        from: 'foldclothes-spread',
        desc: 'T恤的左袖和左半边身体已经向中线内折（折线在肩膀到下摆的中线左侧三分之一处），右半边不变，仍展开。',
      },
      {
        key: 'foldclothes-right',
        from: 'foldclothes-left',
        desc: 'T恤的右袖和右半边身体也向中线内折，现在是一个窄长条形状，双袖都折到背面。',
      },
      {
        key: 'foldclothes-bottom',
        from: 'foldclothes-right',
        desc: 'T恤下半部分向上对折到领口处，变成一个整齐的小方块。叠好的T恤小巧规整。',
      },
    ],
  },
  // --- L15 扫地：很脏 → 扫左边 → 扫中间 → 扫右边 → 扫干净 ---
  {
    game: 'sweepfloor',
    consistency: CONSISTENCY_SWEEP,
    jobs: [
      {
        key: 'sweepfloor-messy',
        from: null,
        desc: '俯视卡通房间地板：浅色木地板上散落着很多垃圾碎屑——彩色纸屑、小纸团、饼干碎、橡皮擦碎末，分布在地板的左中右三个区域。画面右下角有一把卡通竹扫帚斜放。画面整体占满。',
      },
      {
        key: 'sweepfloor-left-done',
        from: 'sweepfloor-messy',
        desc: '地板左侧区域已经被扫干净了（木地板露出干净纹路），中间和右侧的垃圾碎屑不变。扫帚移到左侧偏中的位置。',
      },
      {
        key: 'sweepfloor-mid-done',
        from: 'sweepfloor-left-done',
        desc: '中间区域也被扫干净了，现在只有右侧还有垃圾碎屑。扫帚移到中间偏右的位置。左侧和中间地板干净。',
      },
      {
        key: 'sweepfloor-all-clean',
        from: 'sweepfloor-mid-done',
        desc: '整个地板全部扫干净了，所有垃圾碎屑都扫到了右下角的绿色畚箕里。地板一尘不染闪亮。扫帚靠在畚箕旁边。',
      },
    ],
  },
]

// ========== API 工具函数 ==========

function loadApiKey() {
  const configPath = resolve(projectRoot, 'AIimages/config.json')
  if (!existsSync(configPath)) throw new Error(`缺少 API 配置: ${configPath}（需包含 api_key）`)
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  if (!config.api_key) throw new Error('AIimages/config.json 中缺少 api_key')
  return config.api_key
}

function progressPath(key) {
  return resolve(PROGRESS_DIR, `${key}.png`)
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

// ---- 断点续传状态 ----
function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return {} }
}

function saveState(state) {
  mkdirSync(dirname(STATE_FILE), { recursive: true })
  writeFileAtomic(STATE_FILE, JSON.stringify(state, null, 2))
}

// ---- 提交生图任务 ----
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

// 带 input 参考图的链式提交
async function submitChainJob(apiKey, prompt, inputImagePath) {
  const image = readFileSync(inputImagePath)
  const dataUrl = `data:image/png;base64,${image.toString('base64')}`
  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1:1',
      resolution: '2k',
      input: [{ type: 'image', image: dataUrl }],
    }),
    signal: AbortSignal.timeout(60000),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`提交失败 (${res.status}): ${JSON.stringify(body)}`)
  const taskId = body?.data?.[0]?.task_id
  if (!taskId) throw new Error(`响应缺少 task_id: ${JSON.stringify(body)}`)
  return taskId
}

// ---- 轮询任务状态 ----
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
      await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000))
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
    await new Promise((r) => setTimeout(r, 4000))
  }
  throw new Error(`[${key}] 任务超时（5 分钟）`)
}

// ---- 下载并校验 PNG ----
async function downloadImage(url, filePath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`下载失败 (${res.status}): ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(`下载内容不是有效 PNG（${buf.length} bytes）`)
  }
  writeFileAtomic(filePath, buf)
}

// ========== 场景图批量生成（并行提交） ==========

async function runSceneJobs(apiKey) {
  mkdirSync(SCENES_DIR, { recursive: true })

  const pending = SCENE_JOBS.filter((job) => !existsSync(resolve(SCENES_DIR, `${job.kind}.png`)))
  const skipped = SCENE_JOBS.length - pending.length
  if (skipped > 0) console.log(`[scenes] 跳过已存在的 ${skipped} 张`)
  if (pending.length === 0) {
    console.log('[scenes] 无待生成任务')
    writeSceneManifest()
    return 0
  }

  console.log(`[scenes] 提交 ${pending.length} 个场景图任务（串行，避免代理并发限制）...`)
  const submissions = []
  for (const job of pending) {
    const taskId = await submitJob(apiKey, job.prompt, job.size)
    submissions.push({ job, taskId })
    console.log(`  [${job.kind}] 已提交 → ${taskId}`)
  }
  console.log('[scenes] 全部提交完成，开始轮询...')

  const state = loadState()
  let count = 0
  for (const { job, taskId } of submissions) {
    const url = await pollTask(apiKey, job.kind, taskId, state)
    const filePath = resolve(SCENES_DIR, `${job.kind}.png`)
    await downloadImage(url, filePath)
    console.log(`[scenes] ✅ ${job.name} → scenes/${job.kind}.png`)
    count += 1
  }

  writeSceneManifest()
  return count
}

function writeSceneManifest() {
  const manifestPath = resolve(SCENES_DIR, 'manifest.json')
  const existing = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { items: [] }
  const known = new Set(existing.items.map((i) => i.kind))

  // 追加 L11-L15 场景到现有 manifest
  for (const job of SCENE_JOBS) {
    if (!known.has(job.kind)) {
      existing.items.push({ kind: job.kind, game: job.game, name: job.name, size: job.size, file: `${job.kind}.png` })
    }
  }
  existing.generated_at = new Date().toISOString()
  existing.model = 'gpt-image-2'
  writeFileAtomic(manifestPath, JSON.stringify(existing, null, 2))
}

// ========== 链式进度图串行生成 ==========

async function runProgressChains(apiKey) {
  mkdirSync(PROGRESS_DIR, { recursive: true })
  const state = loadState()
  let totalCount = 0

  for (const chain of PROGRESS_CHAINS) {
    const { game, consistency, jobs } = chain
    const pending = jobs.filter((job) => !existsSync(progressPath(job.key)))
    if (pending.length === 0) {
      console.log(`[progress/${game}] 全部已存在，跳过`)
      continue
    }
    console.log(`[progress/${game}] 待生成 ${pending.length} 张（链式串行）：${pending.map((j) => j.key).join(' → ')}`)

    for (const job of pending) {
      const prompt = job.from === null
        ? `${PROGRESS_STYLE_PREFIX}${job.desc}`
        : `${PROGRESS_STYLE_PREFIX}${consistency}【变化】${job.desc}。居中放置占满画面。`

      let taskId = state[job.key]
      if (taskId) {
        console.log(`[progress/${game}] 续传 ${job.key}（task ${taskId.slice(0, 18)}...）`)
      } else if (job.from === null) {
        // Seed：无参考图
        console.log(`[progress/${game}] 生成 seed: ${job.key}...`)
        taskId = await submitJob(apiKey, prompt, '1:1')
        state[job.key] = taskId
        saveState(state)
      } else {
        // Chain：引用前一张
        const inputPath = progressPath(job.from)
        if (!existsSync(inputPath)) {
          throw new Error(`[${job.key}] 依赖图缺失: ${inputPath}（链式生成须按序执行）`)
        }
        console.log(`[progress/${game}] 生成 ${job.key}（基于 ${job.from}）...`)
        taskId = await submitChainJob(apiKey, prompt, inputPath)
        state[job.key] = taskId
        saveState(state)
      }

      const url = await pollTask(apiKey, job.key, taskId, state)
      await downloadImage(url, progressPath(job.key))
      delete state[job.key]
      saveState(state)
      console.log(`[progress/${game}] ✅ ${job.key} → progress/${job.key}.png`)
      totalCount += 1
    }
  }

  writeProgressManifest()
  return totalCount
}

function writeProgressManifest() {
  const manifestPath = resolve(PROGRESS_DIR, 'manifest.json')
  const allJobs = PROGRESS_CHAINS.flatMap((chain) =>
    chain.jobs.map((job) => ({
      kind: job.key,
      game: chain.game,
      name: job.key,
      size: '1:1',
      file: `${job.key}.png`,
      from: job.from,
    })),
  )
  const manifest = {
    generated_at: new Date().toISOString(),
    model: 'gpt-image-2',
    style: '儿童绘本贴纸风格',
    note: 'L11-L15 游戏进度状态图：链式生成保证同游戏内视觉一致性。浅绿底(#EAF6EE)，后续色键去底。',
    chains: PROGRESS_CHAINS.map((c) => ({ game: c.game, steps: c.jobs.map((j) => j.key) })),
    items: allJobs,
  }
  writeFileAtomic(manifestPath, JSON.stringify(manifest, null, 2))
}

// ========== 主流程 ==========

async function main() {
  const apiKey = loadApiKey()

  console.log('[L11-L15 Artwork] 开始生成美术资产...')
  console.log(`[L11-L15 Artwork] 场景图 ${SCENE_JOBS.length} 张，进度图 ${PROGRESS_CHAINS.reduce((n, c) => n + c.jobs.length, 0)} 张`)
  console.log('')

  // 第一步：并行生成场景底图
  const scenesCount = await runSceneJobs(apiKey)
  console.log('')

  // 第二步：串行生成链式进度图（必须按依赖顺序）
  const progressCount = await runProgressChains(apiKey)
  console.log('')

  const total = scenesCount + progressCount
  console.log(`[L11-L15 Artwork] 全部完成：scenes ${scenesCount} 张，progress ${progressCount} 张，合计 ${total} 张`)
  console.log('[L11-L15 Artwork] 下一步：node scripts/resize-selfcare-images.mjs（缩图 + 色键去底）')
}

main().catch((error) => {
  console.error('[L11-L15 Artwork] 失败:', error instanceof Error ? error.message : error)
  process.exit(1)
})
