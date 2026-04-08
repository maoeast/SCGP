import fs from 'node:fs/promises'
import path from 'node:path'

const REPO_ROOT = process.cwd()
const EMOTION_SCENE_REFERENCE_DIR = path.join(REPO_ROOT, 'docs', 'references', 'emotion-scene')
const EXPORT_PATH = path.join(REPO_ROOT, 'docs', 'references', 'current-emotion-scenes-export.json')
const NEW24_PATH = path.join(EMOTION_SCENE_REFERENCE_DIR, 'emotion-scenes-new24.json')
const RENumbered_PATH = path.join(EMOTION_SCENE_REFERENCE_DIR, 'emotion-scenes-new24-renumbered.json')
const MERGED_PATH = path.join(EMOTION_SCENE_REFERENCE_DIR, 'emotion-scenes-merged-candidate.json')
const REMOVED_PATH = path.join(EMOTION_SCENE_REFERENCE_DIR, 'emotion-scenes-removed-24.json')

const REPLACEMENT_NUMBERS = [
  50, 51, 52, 53, 54, 55, 56,
  64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
]

function fail(message) {
  throw new Error(message)
}

async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8')
  try {
    return JSON.parse(text)
  } catch {
    return readBrokenTopLevelObjects(text, filePath)
  }
}

function readBrokenTopLevelObjects(text, filePath) {
  const items = []
  let inString = false
  let escaped = false
  let depth = 0
  let start = -1

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (ch === '\\') {
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (ch === '{') {
      if (depth === 0) {
        start = i
      }
      depth += 1
      continue
    }

    if (ch === '}') {
      depth -= 1
      if (depth === 0 && start >= 0) {
        items.push(JSON.parse(text.slice(start, i + 1)))
        start = -1
      }
    }
  }

  if (items.length === 0) {
    fail(`${path.basename(filePath)} 无法修复为对象数组`)
  }

  return items
}

function getSceneNumber(sceneCode) {
  const match = /^scene-(\d+)$/.exec(String(sceneCode || '').trim())
  return match ? Number(match[1]) : null
}

function compareBySceneCode(a, b) {
  return (getSceneNumber(a.sceneCode) || 0) - (getSceneNumber(b.sceneCode) || 0)
}

function normalizeEmotionValue(value) {
  return value === 'anger' ? 'angry' : value
}

function normalizeScene(scene) {
  return {
    ...scene,
    targetEmotion: normalizeEmotionValue(scene.targetEmotion),
    emotionOptions: Array.isArray(scene.emotionOptions)
      ? scene.emotionOptions.map((value) => normalizeEmotionValue(value))
      : scene.emotionOptions,
  }
}

async function main() {
  const currentScenes = await readJson(EXPORT_PATH)
  const new24Scenes = await readJson(NEW24_PATH)

  if (!Array.isArray(currentScenes)) {
    fail('current-emotion-scenes-export.json 不是数组')
  }
  if (!Array.isArray(new24Scenes)) {
    fail('emotion-scenes-new24.json 不是数组')
  }
  if (new24Scenes.length !== REPLACEMENT_NUMBERS.length) {
    fail(`专家新场景数量应为 ${REPLACEMENT_NUMBERS.length}，当前是 ${new24Scenes.length}`)
  }

  const currentByNumber = new Map()
  for (const scene of currentScenes) {
    const number = getSceneNumber(scene.sceneCode)
    if (!number) {
      fail(`现有场景存在非法 sceneCode: ${scene.sceneCode}`)
    }
    if (currentByNumber.has(number)) {
      fail(`现有场景存在重复 sceneCode: scene-${number}`)
    }
    currentByNumber.set(number, scene)
  }

  const removedScenes = REPLACEMENT_NUMBERS.map((number) => {
    const scene = currentByNumber.get(number)
    if (!scene) {
      fail(`现有导出中缺少待替换场景: scene-${number}`)
    }
    return normalizeScene(scene)
  })

  const renumberedNew24 = new24Scenes.map((scene, index) => ({
    ...normalizeScene(scene),
    sceneCode: `scene-${REPLACEMENT_NUMBERS[index]}`,
  }))

  const replacementMap = new Map(
    renumberedNew24.map((scene) => {
      const number = getSceneNumber(scene.sceneCode)
      return [number, scene]
    })
  )

  const mergedScenes = currentScenes
    .map((scene) => {
      const number = getSceneNumber(scene.sceneCode)
      return replacementMap.get(number) || normalizeScene(scene)
    })
    .sort(compareBySceneCode)

  const mergedCodes = mergedScenes.map((scene) => scene.sceneCode)
  const uniqueCodes = new Set(mergedCodes)
  if (uniqueCodes.size !== mergedCodes.length) {
    fail('合并结果中存在重复 sceneCode')
  }
  if (mergedScenes.length !== currentScenes.length) {
    fail(`合并结果数量异常: 期望 ${currentScenes.length}，实际 ${mergedScenes.length}`)
  }

  await fs.writeFile(RENumbered_PATH, `${JSON.stringify(renumberedNew24, null, 2)}\n`, 'utf8')
  await fs.writeFile(MERGED_PATH, `${JSON.stringify(mergedScenes, null, 2)}\n`, 'utf8')
  await fs.writeFile(REMOVED_PATH, `${JSON.stringify(removedScenes, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    currentCount: currentScenes.length,
    replacementCount: renumberedNew24.length,
    mergedCount: mergedScenes.length,
    renumberedPath: RENumbered_PATH,
    mergedPath: MERGED_PATH,
    removedPath: REMOVED_PATH,
    replacementCodes: REPLACEMENT_NUMBERS.map((number) => `scene-${number}`),
  }, null, 2))
}

main().catch((error) => {
  console.error('合并失败:', error)
  process.exitCode = 1
})
