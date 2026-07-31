/**
 * 认知游戏物品贴纸图生成脚本
 *
 * 调用 APIMart（https://api.apimart.ai/v1）gpt-image-2 模型，生成儿童绘本贴纸风格底图。
 * 两组产物：
 * 1. 排排队（K06_SIZE_ORDER）专用：
 *    - 4+4 大小维度物品：1:1 正方形（运行时 CSS 等比缩放）
 *    - 4+4 长短维度物品：2:1 横向，物品从左端贯穿到右端（运行时 cover+left 裁右端）
 *    → assets/resources/images/cognitive/size-order/
 * 2. 通用物品池（K02 少了什么 / K04 哪个不同类 共用）：1:1 正方形贴纸
 *    → assets/resources/images/cognitive/items/
 *
 * 用法：node scripts/generate-size-order-artwork.mjs
 * 依赖：AIimages/config.json 中的 api_key（与现有场景图工作流共用）
 * 幂等：已存在的 png 自动跳过（改 prompt 需先删除对应 png）
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API_BASE = 'https://api.apimart.ai/v1'

// 统一风格前缀：儿童绘本贴纸风 + 纯色背景 + 无干扰
const STYLE_PREFIX = '儿童认知训练软件用的扁平贴纸插画，儿童绘本卡通风格，圆润可爱造型，粗描边线条，柔和明快的配色，画面干净整洁。禁止文字、禁止水印、禁止阴影、禁止边框、禁止其他物品、禁止复杂背景。背景为单一纯色浅绿色(#EAF6EE)，无任何装饰。'

// ========== 组 1：排排队专用（大小 + 长短） ==========
const SIZE_ORDER_JOBS = [
  // 大小维度（1:1，物品居中占满）
  { kind: 'apple', name: '苹果', size: '1:1', prompt: `${STYLE_PREFIX}一个红色的圆苹果，带一片绿色小叶子和棕色小果柄，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'tree', name: '大树', size: '1:1', prompt: `${STYLE_PREFIX}一棵绿色的卡通大树，深棕色树干，圆蓬蓬的树冠，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'elephant', name: '小象', size: '1:1', prompt: `${STYLE_PREFIX}一头浅蓝色的卡通小象，大圆耳朵，圆润身体，长鼻子，正面站立，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'house', name: '房子', size: '1:1', prompt: `${STYLE_PREFIX}一座橙红色屋顶的卡通小房子，浅黄色墙面，一扇方形窗户和一扇小门，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'turtle', name: '乌龟', size: '1:1', prompt: `${STYLE_PREFIX}一只绿色卡通小乌龟，深绿色带花纹的圆龟壳，短短的四肢和小脑袋，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'sun', name: '太阳', size: '1:1', prompt: `${STYLE_PREFIX}一个黄色卡通太阳，圆圆的脸带可爱表情，周围一圈金黄色光芒，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'bear', name: '小熊', size: '1:1', prompt: `${STYLE_PREFIX}一只棕色卡通小熊，圆圆的耳朵和圆润的身体，浅色肚皮，正面站立，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'watermelon', name: '西瓜', size: '1:1', prompt: `${STYLE_PREFIX}一个大西瓜，深绿色表皮带深色条纹，圆滚滚的，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  // 长短维度（2:1 横向，物品从左贯穿到右）
  { kind: 'pencil', name: '铅笔', size: '2:1', prompt: `${STYLE_PREFIX}一支黄色卡通铅笔，水平横放，笔尖朝右，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，铅笔在垂直方向居中。` },
  { kind: 'rope', name: '麻绳', size: '2:1', prompt: `${STYLE_PREFIX}一条棕黄色卡通麻绳，微微波浪形盘绕，水平横放，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，麻绳在垂直方向居中。` },
  { kind: 'carrot', name: '胡萝卜', size: '2:1', prompt: `${STYLE_PREFIX}一根橙红色卡通胡萝卜，绿色叶子在左端，尖端朝右，水平横放，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，胡萝卜在垂直方向居中。` },
  { kind: 'banana', name: '香蕉', size: '2:1', prompt: `${STYLE_PREFIX}一根黄色卡通香蕉，弯弯的月牙形，水平横放，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，香蕉在垂直方向居中。` },
  { kind: 'cucumber', name: '黄瓜', size: '2:1', prompt: `${STYLE_PREFIX}一根绿色卡通黄瓜，表面带几个小疙瘩，水平横放，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，黄瓜在垂直方向居中。` },
  { kind: 'snake', name: '小蛇', size: '2:1', prompt: `${STYLE_PREFIX}一条绿色卡通小蛇，身体呈波浪形弯曲，有圆圆的脑袋，水平横放，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，小蛇在垂直方向居中。` },
  { kind: 'sausage', name: '香肠', size: '2:1', prompt: `${STYLE_PREFIX}一根红色卡通香肠，圆润饱满，两端圆头，水平横放，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，香肠在垂直方向居中。` },
  { kind: 'toothbrush', name: '牙刷', size: '2:1', prompt: `${STYLE_PREFIX}一支蓝色卡通牙刷，刷柄长条状，刷头一端有白色刷毛，水平横放，从画面最左端一直延伸到最右端，长度贯穿整个画面的宽度，牙刷在垂直方向居中。` },
]

// ========== 组 2：通用物品池（K02 少了什么 / K04 哪个不同类 共用，1:1） ==========
const ITEM_JOBS = [
  { kind: 'cat', name: '小猫', prompt: `${STYLE_PREFIX}一只橘黄色的卡通小猫，圆圆的脑袋和竖起的尖耳朵，可爱表情，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'dog', name: '小狗', prompt: `${STYLE_PREFIX}一只棕色的卡通小狗，垂耳朵，圆圆的脑袋和身体，吐着舌头，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'rabbit', name: '兔子', prompt: `${STYLE_PREFIX}一只白色的卡通小兔子，长长的耳朵，圆圆的脑袋，红眼睛，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'rose', name: '玫瑰', prompt: `${STYLE_PREFIX}一朵粉红色的卡通玫瑰花，层层叠叠的花瓣，绿色花茎和叶子，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'sunflower', name: '向日葵', prompt: `${STYLE_PREFIX}一朵黄色的卡通向日葵，深棕色花心，一圈黄色花瓣，绿色花茎和叶子，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'tulip', name: '郁金香', prompt: `${STYLE_PREFIX}一朵粉紫色的卡通郁金香，杯状花瓣，绿色花茎和一片叶子，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'lily', name: '百合', prompt: `${STYLE_PREFIX}一朵白色的卡通百合花，六片舒展的花瓣，黄色花蕊，绿色花茎，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'bread', name: '面包', prompt: `${STYLE_PREFIX}一个金黄色的卡通面包，圆鼓鼓的半球形，表面有烘烤纹路，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'pear', name: '梨', prompt: `${STYLE_PREFIX}一个黄绿色的卡通梨子，上小下大的梨形身体，棕色小果柄和一片叶子，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'grape', name: '葡萄', prompt: `${STYLE_PREFIX}一串紫色的卡通葡萄，一颗颗圆润的葡萄粒簇在一起，绿色小叶子在顶部，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'tomato', name: '番茄', prompt: `${STYLE_PREFIX}一个红色的卡通番茄，圆润饱满，顶部带绿色小蒂和叶子，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'potato', name: '土豆', prompt: `${STYLE_PREFIX}一个土黄色的卡通土豆，椭圆形的圆润身体，表面有几个小芽眼，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'car', name: '小汽车', prompt: `${STYLE_PREFIX}一辆红色的卡通小汽车，圆润的车身，两个圆形车轮，车窗玻璃，侧面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'bus', name: '公交车', prompt: `${STYLE_PREFIX}一辆黄色的卡通公交车，长方形的车身，多个方形车窗，圆润的轮廓，侧面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'bike', name: '自行车', prompt: `${STYLE_PREFIX}一辆蓝色的卡通自行车，两个圆形车轮，车架和车把，侧面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'cup', name: '杯子', prompt: `${STYLE_PREFIX}一个天蓝色的卡通马克杯，圆柱形杯身，弯弯的杯柄，杯口一圈白边，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'chair', name: '椅子', prompt: `${STYLE_PREFIX}一把橙色的卡通椅子，方形坐面和靠背，四条圆腿，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'towel', name: '毛巾', prompt: `${STYLE_PREFIX}一条叠好的浅蓝色卡通毛巾，方方正正，表面有两条白色条纹，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'plane', name: '飞机', prompt: `${STYLE_PREFIX}一架白色的卡通客机，流线型机身，机翼和尾翼，蓝色舷窗，侧上方视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'bird', name: '小鸟', prompt: `${STYLE_PREFIX}一只黄色的卡通小鸟，圆圆的脑袋和身体，尖尖的小嘴，小翅膀，侧身站立，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'butterfly', name: '蝴蝶', prompt: `${STYLE_PREFIX}一只紫色和橙色相间的卡通蝴蝶，两对大翅膀带花纹，展开飞舞姿态，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'kite', name: '风筝', prompt: `${STYLE_PREFIX}一个菱形的彩色卡通风筝，红黄蓝拼色，长长的飘带尾巴，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'fish', name: '小鱼', prompt: `${STYLE_PREFIX}一条蓝色的卡通小鱼，椭圆形的身体，扇形尾巴，圆眼睛，侧身游动姿态，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'boat', name: '小船', prompt: `${STYLE_PREFIX}一艘木头色的卡通小船，弯弯的船身，白色小风帆，水面没有波浪，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'duck', name: '鸭子', prompt: `${STYLE_PREFIX}一只黄色的卡通小鸭子，圆圆的脑袋和身体，橙色扁嘴，侧身站立，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'lifebuoy', name: '救生圈', prompt: `${STYLE_PREFIX}一个红白相间的卡通救生圈，圆环形，四条红白分区，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'leaf', name: '树叶', prompt: `${STYLE_PREFIX}一片绿色的卡通枫叶，清晰的叶脉纹路，红色叶柄，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'rock', name: '石头', prompt: `${STYLE_PREFIX}一块灰色的卡通大石头，圆润的不规则形状，表面有简单的裂纹纹理，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'star', name: '星星', prompt: `${STYLE_PREFIX}一颗黄色的卡通五角星，圆润饱满的星角，开心表情，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'ball', name: '皮球', prompt: `${STYLE_PREFIX}一个红白相间的卡通皮球，圆圆的，表面有几条拼色弧线，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'book', name: '书本', prompt: `${STYLE_PREFIX}一本蓝色封面的卡通书本，微微翻开，白色书页，正面视角，居中放置，占满整个正方形画面，边缘留少量空隙。` },
  { kind: 'flower', name: '花朵', prompt: `${STYLE_PREFIX}一朵粉红色的卡通小花，五片圆花瓣，黄色花心，绿色花茎和两片叶子，居中放置，占满整个正方形画面，边缘留少量空隙。` },
]

const SIZE_ORDER_DIR = resolve(projectRoot, 'assets/resources/images/cognitive/size-order')
const ITEMS_DIR = resolve(projectRoot, 'assets/resources/images/cognitive/items')

// 通用物品池可直接复用的排排队图（复制，保持两目录独立）
const COPY_FROM_SIZE_ORDER = ['apple', 'banana', 'tree', 'carrot', 'house']

function loadApiKey() {
  const configPath = resolve(projectRoot, 'AIimages/config.json')
  if (!existsSync(configPath)) {
    throw new Error(`缺少 API 配置: ${configPath}（需包含 api_key）`)
  }
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  if (!config.api_key) {
    throw new Error('AIimages/config.json 中缺少 api_key')
  }
  return config.api_key
}

async function submitJob(apiKey, job) {
  const response = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: job.prompt,
      n: 1,
      size: job.size || '1:1',
      resolution: job.resolution || '2k',
    }),
  })

  const body = await response.json()
  if (!response.ok) {
    throw new Error(`[${job.kind}] 提交失败 (${response.status}): ${JSON.stringify(body)}`)
  }

  const taskId = body?.data?.[0]?.task_id
  if (!taskId) {
    throw new Error(`[${job.kind}] 响应缺少 task_id: ${JSON.stringify(body)}`)
  }

  return taskId
}

async function pollTask(apiKey, job, taskId) {
  const deadline = Date.now() + 5 * 60 * 1000
  while (Date.now() < deadline) {
    const response = await fetch(`${API_BASE}/tasks/${taskId}?language=zh`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const body = await response.json()
    const data = body?.data

    if (data?.status === 'completed') {
      const url = data?.result?.images?.[0]?.url?.[0]
      if (!url) {
        throw new Error(`[${job.kind}] 任务完成但缺少图片 URL: ${JSON.stringify(data)}`)
      }
      return url
    }

    if (data?.status === 'failed' || data?.status === 'cancelled') {
      throw new Error(`[${job.kind}] 任务${data.status}: ${JSON.stringify(data?.error || data)}`)
    }

    process.stdout.write(`[${job.kind}] 等待生成... (${data?.progress ?? 0}%)\n`)
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 4000))
  }

  throw new Error(`[${job.kind}] 任务超时（5 分钟）`)
}

async function downloadImage(url, filePath) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`图片下载失败 (${response.status}): ${url}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(filePath, buffer)
}

async function runJobGroup(apiKey, label, jobs, outputDir, extraNote) {
  mkdirSync(outputDir, { recursive: true })

  const pendingJobs = jobs.filter((job) => !existsSync(resolve(outputDir, `${job.kind}.png`)))
  const skippedJobs = jobs.length - pendingJobs.length
  if (skippedJobs > 0) {
    console.log(`[${label}] 跳过已存在的 ${skippedJobs} 张（如需重新生成请先删除对应 png）`)
  }
  if (pendingJobs.length === 0) {
    console.log(`[${label}] 无待生成任务`)
    return 0
  }

  console.log(`[${label}] 提交 ${pendingJobs.length} 个生图任务（model: gpt-image-2, resolution: 2k）...`)
  const submissions = await Promise.all(pendingJobs.map(async (job) => ({
    job,
    taskId: await submitJob(apiKey, job),
  })))
  console.log(`[${label}] 全部任务已提交，开始轮询...`)

  const results = []
  for (const { job, taskId } of submissions) {
    const url = await pollTask(apiKey, job, taskId)
    const filePath = resolve(outputDir, `${job.kind}.png`)
    await downloadImage(url, filePath)
    console.log(`[${label}] ✅ ${job.name} → ${filePath}`)
    results.push({ kind: job.kind, name: job.name, size: job.size || '1:1', file: `${job.kind}.png` })
  }

  writeFileSync(resolve(outputDir, 'manifest.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    model: 'gpt-image-2',
    style: '儿童绘本贴纸风格',
    note: extraNote,
    items: results,
  }, null, 2))

  console.log(`[${label}] 完成，共 ${results.length} 张 → ${outputDir}`)
  return results.length
}

async function copySharedItems() {
  mkdirSync(ITEMS_DIR, { recursive: true })
  let copied = 0
  for (const kind of COPY_FROM_SIZE_ORDER) {
    const src = resolve(SIZE_ORDER_DIR, `${kind}.png`)
    const dest = resolve(ITEMS_DIR, `${kind}.png`)
    if (existsSync(src) && !existsSync(dest)) {
      copyFileSync(src, dest)
      copied += 1
      console.log(`[items] ⏩ 复用排排队图 ${kind}.png`)
    }
  }
  return copied
}

async function main() {
  const apiKey = loadApiKey()

  const sizeOrderCount = await runJobGroup(
    apiKey,
    'size-order',
    SIZE_ORDER_JOBS,
    SIZE_ORDER_DIR,
    '大小物品 1:1 等比缩放；长短物品 2:1 横向贯穿，运行时 object-fit:cover + object-position:left 裁右端',
  )

  const copiedCount = await copySharedItems()
  const itemsCount = await runJobGroup(
    apiKey,
    'items',
    ITEM_JOBS,
    ITEMS_DIR,
    '通用物品池：K02 少了什么 / K04 哪个不同类 共用，1:1 正方形贴纸，运行时等比缩放',
  )

  console.log(`[CognitiveArtwork] 全部完成：size-order ${sizeOrderCount} 张，items 复用 ${copiedCount} 张 + 新增 ${itemsCount} 张`)
}

main().catch((error) => {
  console.error('[CognitiveArtwork] 失败:', error instanceof Error ? error.message : error)
  process.exit(1)
})
