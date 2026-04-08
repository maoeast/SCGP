#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const scenesPath = path.join(projectRoot, 'docs/references/current-emotion-scenes-export.json')
const namesPath = path.join(projectRoot, 'docs/references/emotion-scene-character-names.json')
const defaultName = '\u5C0F\u670B\u53CB'
const nameSentencePrefixes = [
  '\u4E3A\u4EC0\u4E48',
  '\u600E\u4E48',
  '\u73B0\u5728',
  '\u6700',
  '\u4F1A',
  '\u89C9\u5F97',
  '\u611F\u5230',
  '\u9700\u8981',
  '\u60F3',
  '\u5728',
  '\u5F88',
  '\u671F\u5F85',
  '\u8868\u73B0',
  '\u770B\u8D77\u6765',
  '\u5E94\u8BE5',
  '\u8981',
  '\u80FD',
]

const scenes = JSON.parse(fs.readFileSync(scenesPath, 'utf8'))
const existingMap = fs.existsSync(namesPath)
  ? JSON.parse(fs.readFileSync(namesPath, 'utf8'))
  : {}

if (!Array.isArray(scenes)) {
  throw new Error('current-emotion-scenes-export.json is not a JSON array')
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function extractLeadingName(text) {
  if (!(text.startsWith('\u5C0F') || text.startsWith('\u963F'))) {
    return null
  }

  const candidates = [text.slice(0, 2), text.slice(0, 3)]
  for (const candidate of candidates) {
    if (candidate.length < 2) {
      continue
    }

    const rest = text.slice(candidate.length)
    if (nameSentencePrefixes.some((prefix) => rest.startsWith(prefix))) {
      return candidate
    }
  }

  return null
}

function detectSceneCharacterName(scene) {
  const prompts = Array.isArray(scene?.prompts) ? scene.prompts : []
  const names = Array.from(
    new Set(
      prompts
        .map((prompt) => extractLeadingName(normalizeText(prompt?.questionText)))
        .filter((value) => typeof value === 'string' && value.length > 0),
    ),
  )

  return names.length === 1 ? names[0] : ''
}

const nextMap = {}
for (const scene of scenes) {
  const sceneCode = typeof scene?.sceneCode === 'string' ? scene.sceneCode.trim() : ''
  if (!sceneCode) {
    continue
  }

  const existingName = typeof existingMap?.[sceneCode] === 'string'
    ? existingMap[sceneCode].trim()
    : ''
  const detectedName = detectSceneCharacterName(scene)
  const preservedName = existingName && existingName !== defaultName ? existingName : ''

  nextMap[sceneCode] = preservedName || detectedName || defaultName
}

fs.writeFileSync(namesPath, `${JSON.stringify(nextMap, null, 2)}\n`, 'utf8')

const total = Object.keys(nextMap).length
const customized = Object.values(nextMap).filter((value) => value !== defaultName).length
const fallbackCount = total - customized

console.log(`refreshed ${path.relative(projectRoot, namesPath)}`)
console.log(`total=${total} customized=${customized} defaulted=${fallbackCount}`)
