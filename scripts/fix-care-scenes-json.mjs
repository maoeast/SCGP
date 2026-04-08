/**
 * One-time script: fix malformed care_scenes_database.json
 * and update all imageUrl to preset resource paths.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'

const raw = readFileSync('./care_scenes_database.json', 'utf8')

// Extract all scene objects using a state machine
function extractScenes(text) {
  const scenes = []
  let i = 0
  while (i < text.length) {
    // Find next top-level object containing sceneCode
    let objStart = -1
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') {
        const lookahead = text.substring(j, Math.min(j + 40, text.length))
        if (lookahead.includes('"sceneCode"')) {
          objStart = j
          break
        }
      }
    }
    if (objStart === -1) break

    // Find matching closing brace (respect strings)
    let depth = 0
    let inStr = false
    let endPos = -1
    for (let j = objStart; j < text.length; j++) {
      const ch = text[j]
      if (inStr) {
        if (ch === '\\') { j++; continue }
        if (ch === '"') inStr = false
        continue
      }
      if (ch === '"') { inStr = true; continue }
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) { endPos = j; break }
      }
    }
    if (endPos === -1) break

    const objStr = text.substring(objStart, endPos + 1)
    try {
      scenes.push(JSON.parse(objStr))
    } catch (e) {
      console.error(`Parse error at pos ${objStart}: ${e.message}`)
    }
    i = endPos + 1
  }
  return scenes
}

const scenes = extractScenes(raw)
console.log(`Extracted ${scenes.length} scenes`)

// Build file mapping: scene number -> local file
const localFiles = readdirSync('./assets/care_scenes/').sort()
const fileMap = new Map()
for (const f of localFiles) {
  const m = f.match(/^care-scene-(\d+)_/)
  if (m) fileMap.set(parseInt(m[1]), f)
}
console.log(`Local files: ${localFiles.length}`)

// Update imageUrl
let updated = 0
let noFile = 0
for (const s of scenes) {
  const num = parseInt(s.sceneCode.replace('care-scene-', ''))
  const local = fileMap.get(num)
  if (local) {
    s.imageUrl = `images/care-scenes/${local}`
    updated++
  } else {
    console.warn(`NO FILE for ${s.sceneCode}`)
    noFile++
  }
}
console.log(`Updated: ${updated}, No file: ${noFile}`)

// Write clean JSON
const clean = JSON.stringify(scenes, null, 2)
writeFileSync('./care_scenes_database.json', clean, 'utf8')
console.log(`Written clean JSON: ${clean.length} bytes`)

// Verify
const verify = JSON.parse(readFileSync('./care_scenes_database.json', 'utf8'))
console.log(`Verification: ${verify.length} scenes`)
console.log(`All preset paths: ${verify.every(s => s.imageUrl.startsWith('images/care-scenes/'))}`)
console.log(`No old /assets/ refs: ${verify.every(s => !s.imageUrl.includes('/assets/'))}`)

// Verify all imageUrls match actual files
const missing = verify.filter(s => !fileMap.has(parseInt(s.sceneCode.replace('care-scene-', ''))))
console.log(`Scenes without matching local file: ${missing.length}`)
if (missing.length > 0) {
  missing.forEach(s => console.log(`  ${s.sceneCode} -> ${s.imageUrl}`))
}
