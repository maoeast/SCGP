#!/usr/bin/env node
/**
 * 从 koboyo.com 下载手绘 SVG 图标到项目资产目录。
 *
 * 用途：SCGP 游戏训练 / 器材训练 / 训练记录入口卡片与游戏卡片图标。
 * 来源：https://koboyo.com/icons （92,967 个免费手绘 SVG，个人与商用免费，无需署名）
 * 直链格式：https://koboyo.com/icons/svg/{slug}.svg
 *
 * 运行：node scripts/fetch-koboyo-icons.mjs
 * 输出：src/assets/icons/entries/{entryCode}.svg
 *       src/assets/icons/games/{gameCode}.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { get as httpsGet } from 'node:https'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASE_URL = 'https://koboyo.com/icons/svg'

/** 入口图标：TrainingEntryCode -> koboyo slug */
export const ENTRY_ICON_SLUGS = {
  'sensory-integration': 'chubby-playground-swing',
  'emotional-regulation': 'face-closed-eyes-smile',
  'social-communication': 'blank-speech-bubble',
  'fine-motor': 'chubby-jigsaw-puzzle',
  'soothing-aids': 'teddy-bear',
  'life-skills': 'home-outline',
  'cognitive': 'brain',
}

/** 游戏图标：CustomGameCode -> koboyo slug */
export const GAME_ICON_SLUGS = {
  G01_BALLOON: 'balloon',
  G03_FOREST: 'music-note-cluster',
  G04_WIPE_ICE: 'chubby-hazy-sun',
  G07_MONSTER: 'chubby-teddy-bear',
  G08_ENERGY_BALL: 'crystal-ball-2',
  G09_EXPRESSION_DETECTIVE: 'audit-magnifier',
  F01_CLOUD_ERASE: 'chubby-cloud',
  F02_STAR_TRACE: 'chubby-star',
  F03_RECYCLING: 'chubby-recycling-bin',
  F04_TRACK_BUILD: 'chubby-railway-track',
  F05_BALLOONS: 'balloon-2',
  S01_BURGER: 'chubby-burger-layers',
  S02_EMOTION_MIRROR: 'content-soft-smile',
  S03_STORY_SEQ: 'open-book',
  S04_GIFT_MATCH: 'gift',
  S05_ECHO_PARROT: 'chubby-parrot',
  S06_EXPRESSION_DUEL: 'drama',
  C01_DANDELION: 'chubby-dandelion',
  C02_PUDDLE: 'chubby-water-drop',
  C03_XYLOPHONE: 'chubby-toy-xylophone',
  C04_HOURGLASS: 'chubby-hourglass',
  C05_MOOD_METER: 'chubby-face-thermometer',
  L06_STEADY_SPOON: 'chubby-hand-steadying-spoon',
  L07_BODY_SIGNAL: 'lightbulb',
  L08_TOWEL_TWIST: 'chubby-towel',
  L09_HOME_SOUND: 'alarm-bell',
  L10_MARKET_PAY: 'coin',
  K01_MEMORY_MATCH: 'deck-cards-2',
  K02_MISSING_ITEM: 'person-magnifier-finding-nothing',
  K03_PATTERN_NEXT: 'chubby-shapes',
  K04_ODD_ONE_OUT: 'chubby-diamond',
  K05_NUMBER_SENSE: 'big-number-tile',
  K06_SIZE_ORDER: 'ruler',
  K07_SPOT_DIFF: 'axolotl-magnifying-glass',
  K08_MAZE_RUN: 'chubby-square-maze',
  K09_ECHO_SEQ: 'chubby-speaker-volume',
  K10_STORY_ORDER: 'chubby-papyrus-scroll',
}

/**
 * 感官统合 DB 资源型游戏图标：SensoryGameSeed.mode -> koboyo slug。
 * 这些游戏来自 sys_training_resource（resourceType='game'、moduleCode='sensory'），
 * metadata 无 gameCode，以稳定的 mode 字段为标识。
 */
export const SENSORY_GAME_ICON_SLUGS = {
  color: 'chubby-brand-palette',          // 颜色配对
  shape: 'chubby-triangle',               // 形状识别
  icon: 'apple',                          // 物品配对
  track: 'target',                        // 视觉追踪
  diff: 'ear',                            // 声音辨别
  command: 'headphone',                   // 听指令做动作
  rhythm: 'chubby-drum-toy',              // 节奏模仿
  'hand-xylophone': 'chubby-xylophone',   // 空气木琴
  'wood-blocks': 'chubby-blocks',         // 木块磁贴拼图
  'bubble-pop': 'bubbles',                // 打泡泡
  'air-conductor': 'solid-magic-wand',    // 空中魔法指挥棒
}

function fetchSvg(slug, attempt = 1) {
  return new Promise((resolvePromise, reject) => {
    const url = `${BASE_URL}/${slug}.svg`
    const req = httpsGet(url, { headers: { 'User-Agent': 'scgp-icon-fetch/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume()
        return reject(new Error(`${slug}: redirect ${res.statusCode} -> ${res.headers.location}`))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`${slug}: HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolvePromise(Buffer.concat(chunks)))
    })
    req.on('error', (err) => reject(new Error(`${slug}: ${err.message}`)))
    req.setTimeout(20000, () => {
      req.destroy(new Error(`${slug}: timeout`))
    })
  })
}

async function download(slug, targetPath) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const body = await fetchSvg(slug, attempt)
      const text = body.toString('utf-8')
      if (!text.trimStart().startsWith('<svg')) {
        throw new Error(`${slug}: response is not an SVG`)
      }
      writeFileSync(targetPath, body)
      return { slug, path: targetPath, bytes: body.length }
    } catch (err) {
      if (attempt === 3) {
        throw err
      }
      await new Promise((r) => setTimeout(r, 800 * attempt))
    }
  }
  throw new Error(`${slug}: unreachable`)
}

async function main() {
  const entriesDir = resolve(ROOT, 'src/assets/icons/entries')
  const gamesDir = resolve(ROOT, 'src/assets/icons/games')
  mkdirSync(entriesDir, { recursive: true })
  mkdirSync(gamesDir, { recursive: true })

  const tasks = [
    ...Object.entries(ENTRY_ICON_SLUGS).map(([code, slug]) => ({
      slug,
      path: resolve(entriesDir, `${code}.svg`),
    })),
    ...Object.entries(GAME_ICON_SLUGS).map(([code, slug]) => ({
      slug,
      path: resolve(gamesDir, `${code}.svg`),
    })),
    ...Object.entries(SENSORY_GAME_ICON_SLUGS).map(([mode, slug]) => ({
      slug,
      path: resolve(gamesDir, `SENSORY_${mode}.svg`),
    })),
  ]

  const ok = []
  const failed = []
  for (const task of tasks) {
    try {
      const result = await download(task.slug, task.path)
      ok.push(result)
      console.log(`ok   ${task.slug} -> ${result.bytes} bytes`)
    } catch (err) {
      failed.push(task.slug)
      console.error(`FAIL ${task.slug}: ${err.message}`)
    }
  }

  console.log(`\n下载完成：成功 ${ok.length} / ${tasks.length}`)
  if (failed.length > 0) {
    console.error(`失败：${failed.join(', ')}`)
    process.exitCode = 1
  }
}

main()
