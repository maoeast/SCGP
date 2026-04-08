#!/usr/bin/env node

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const sqljs = await import('sql.js')
const initSqlJs = sqljs.default ?? sqljs.initSqlJs

const SQL = await initSqlJs({
  locateFile: (file) => path.join(projectRoot, 'node_modules', 'sql.js', 'dist', file),
})

const schemaSql = fs.readFileSync(path.join(projectRoot, 'src/db/schema.sql'), 'utf8')
const legacyScenes = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'docs/references/current-emotion-scenes-export.json'), 'utf8'),
)
const characterNameMap = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'docs/references/emotion-scene-character-names.json'), 'utf8'),
)

const EMOTION_META = {
  calm: { label: '平静', colorHex: '#7BCFA0', colorLabel: '绿色' },
  happy: { label: '开心', colorHex: '#F7C948', colorLabel: '黄色' },
  sad: { label: '难过', colorHex: '#5B8DEF', colorLabel: '蓝色' },
  angry: { label: '生气', colorHex: '#E5484D', colorLabel: '红色' },
  scared: { label: '害怕', colorHex: '#7E57C2', colorLabel: '紫色' },
  embarrassed: { label: '尴尬', colorHex: '#E64980', colorLabel: '玫红色' },
  shy: { label: '害羞', colorHex: '#F6B7A9', colorLabel: '蜜桃粉' },
  proud: { label: '自豪', colorHex: '#F59E0B', colorLabel: '金橙色' },
}

const DEFAULT_CHARACTER_NAME = '小朋友'
const NAME_SENTENCE_PREFIXES = [
  '为什么',
  '怎么',
  '现在',
  '最',
  '会',
  '觉得',
  '感到',
  '需要',
  '想',
  '在',
  '很',
  '期待',
  '表现',
  '看起来',
  '应该',
  '要',
  '能',
]

const db = new SQL.Database()
db.exec(schemaSql)

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeArray(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter((item) => item.length > 0)
    : []
}

function normalizeEmotion(value, fallback) {
  const normalized = normalizeText(value)
  return Object.hasOwn(EMOTION_META, normalized) ? normalized : fallback
}

function normalizeHintCeiling(value) {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : null
}

function extractLeadingName(text) {
  if (!(text.startsWith('小') || text.startsWith('阿'))) {
    return null
  }

  const candidates = [text.slice(0, 3), text.slice(0, 2)]
  for (const candidate of candidates) {
    if (candidate.length < 2) {
      continue
    }

    const rest = text.slice(candidate.length)
    if (NAME_SENTENCE_PREFIXES.some((prefix) => rest.startsWith(prefix))) {
      return candidate
    }
  }

  return null
}

function deriveNames(scene) {
  const texts = Array.isArray(scene.prompts)
    ? scene.prompts.map((prompt) => normalizeText(prompt.questionText)).filter((text) => text.length > 0)
    : []

  const names = new Set()
  for (const text of texts) {
    const match = extractLeadingName(text)
    if (match) {
      names.add(match)
    }
  }

  return Array.from(names)
}

function deriveCharacterName(scene) {
  const mapped = typeof characterNameMap?.[scene.sceneCode] === 'string'
    ? characterNameMap[scene.sceneCode].trim()
    : ''
  return mapped || DEFAULT_CHARACTER_NAME
}

function applyNamePlaceholder(text, names) {
  let result = text
  for (const name of names) {
    result = result.split(name).join('{name}')
  }
  return result.replace(/(?<!其)(他|她)/g, '{name}')
}

function scalar(sql, params = []) {
  const result = db.exec(sql, params)
  return result[0]?.values?.[0]?.[0] ?? null
}

function rows(sql, params = []) {
  const result = db.exec(sql, params)
  const columns = result[0]?.columns || []
  const values = result[0]?.values || []
  return values.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])))
}

function reportCheck(name, details) {
  console.log(`PASS ${name} ${details}`)
}

function migrateScenes() {
  let clueCount = 0
  let stepCount = 0
  let optionCount = 0

  db.run('BEGIN')

  try {
    db.run('PRAGMA foreign_keys = ON')

    for (const scene of legacyScenes) {
      const names = deriveNames(scene)
      const characterName = deriveCharacterName(scene)
      const targetEmotion = normalizeEmotion(scene.targetEmotion, 'happy')

      db.run(
        `
          INSERT INTO scenes (
            scene_code,
            title,
            description,
            background_image_url,
            target_emotion,
            character_name,
            difficulty_level,
            scene_domain,
            age_range,
            ability_level,
            tags,
            recommended_hint_ceiling
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          normalizeText(scene.sceneCode),
          normalizeText(scene.title, normalizeText(scene.sceneCode)),
          normalizeText(scene.description) || null,
          normalizeText(scene.imageUrl).replace(/\\/g, '/') || null,
          targetEmotion,
          characterName,
          scene.difficultyLevel === 2 || scene.difficultyLevel === 3 ? scene.difficultyLevel : 1,
          normalizeText(scene.sceneDomain) || null,
          normalizeText(scene.ageRange) || null,
          normalizeText(scene.abilityLevel) || null,
          normalizeArray(scene.tags).length > 0 ? JSON.stringify(normalizeArray(scene.tags)) : null,
          normalizeHintCeiling(scene.recommendedHintCeiling),
        ],
      )

      const sceneId = scalar('SELECT last_insert_rowid() AS id')

      normalizeArray(scene.emotionClues).forEach((clue, index) => {
        db.run('INSERT INTO clues (scene_id, content, display_order) VALUES (?, ?, ?)', [sceneId, clue, index + 1])
        clueCount += 1
      })

      db.run(
        'INSERT INTO steps (scene_id, step_index, question_id, question_text, step_type) VALUES (?, ?, ?, ?, ?)',
        [sceneId, 1, `${scene.sceneCode}:emotion`, '你觉得{name}现在是什么心情？', 'emotion'],
      )
      stepCount += 1
      const emotionStepId = scalar('SELECT last_insert_rowid() AS id')

      const emotionValues = Array.from(
        new Set(normalizeArray(scene.emotionOptions).map((value) => normalizeEmotion(value, targetEmotion))),
      )
      if (!emotionValues.includes(targetEmotion)) {
        emotionValues.unshift(targetEmotion)
      }

      emotionValues.forEach((emotion) => {
        const meta = EMOTION_META[emotion]
        db.run(
          `
            INSERT INTO options (
              step_id,
              option_code,
              content,
              icon_name,
              color_hex,
              color_label,
              is_correct,
              is_acceptable,
              feedback_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            emotionStepId,
            emotion,
            meta.label,
            emotion,
            meta.colorHex,
            meta.colorLabel,
            emotion === targetEmotion ? 1 : 0,
            null,
            emotion === targetEmotion
              ? '答对了，继续观察场景里的线索吧。'
              : '再仔细看一看画面和线索哦。',
          ],
        )
        optionCount += 1
      })

      const prompts = Array.isArray(scene.prompts) ? scene.prompts : []
      const causePrompt = prompts.find((prompt) => prompt.questionType === 'cause') || prompts[0]
      const needPrompt = prompts.find((prompt) => prompt.questionType === 'need')

      for (const [stepIndex, prompt, stepType, fallbackQuestion] of [
        [2, causePrompt, 'reason', '请结合场景线索继续思考。'],
        [3, needPrompt, 'need', '请想一想现在最需要什么。'],
      ]) {
        if (!prompt) {
          continue
        }

        db.run(
          'INSERT INTO steps (scene_id, step_index, question_id, question_text, step_type) VALUES (?, ?, ?, ?, ?)',
          [
            sceneId,
            stepIndex,
            normalizeText(prompt.questionId, `${scene.sceneCode}:${stepType}`),
            applyNamePlaceholder(normalizeText(prompt.questionText, fallbackQuestion), names),
            stepType,
          ],
        )
        stepCount += 1
        const stepId = scalar('SELECT last_insert_rowid() AS id')

        ;(Array.isArray(prompt.options) ? prompt.options : []).forEach((option, index) => {
          db.run(
            `
              INSERT INTO options (
                step_id,
                option_code,
                content,
                is_correct,
                is_acceptable,
                feedback_text
              ) VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              stepId,
              normalizeText(option.id, `prompt_option_${index + 1}`),
              normalizeText(option.text, `选项 ${index + 1}`),
              option.isCorrect === true ? 1 : 0,
              option.isAcceptable === true ? 1 : null,
              normalizeText(option.feedbackText, '请根据场景线索再想一想。'),
            ],
          )
          optionCount += 1
        })
      }

      db.run(
        'INSERT INTO steps (scene_id, step_index, question_id, question_text, step_type) VALUES (?, ?, ?, ?, ?)',
        [sceneId, 4, `${scene.sceneCode}:response`, '下面哪种回应更合适？', 'response'],
      )
      stepCount += 1
      const responseStepId = scalar('SELECT last_insert_rowid() AS id')

      ;(Array.isArray(scene.solutions) ? scene.solutions : []).forEach((solution, index) => {
        const suitability = normalizeText(solution.suitability, index === 0 ? 'optimal' : 'acceptable')
        db.run(
          `
            INSERT INTO options (
              step_id,
              option_code,
              content,
              is_correct,
              is_acceptable,
              feedback_text
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            responseStepId,
            normalizeText(solution.id, `solution_${index + 1}`),
            normalizeText(solution.text, `回应 ${index + 1}`),
            suitability === 'optimal' ? 1 : 0,
            suitability === 'acceptable' ? 1 : 0,
            normalizeText(solution.explanation, '这是一个可以继续讨论的回应方式。'),
          ],
        )
        optionCount += 1
      })
    }

    db.run('COMMIT')
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }

  return {
    sceneCount: legacyScenes.length,
    clueCount,
    stepCount,
    optionCount,
  }
}

function expectedOptionCount(scene) {
  const targetEmotion = normalizeEmotion(scene.targetEmotion, 'happy')
  const emotionValues = Array.from(
    new Set(normalizeArray(scene.emotionOptions).map((value) => normalizeEmotion(value, targetEmotion))),
  )
  if (!emotionValues.includes(targetEmotion)) {
    emotionValues.unshift(targetEmotion)
  }

  return (
    emotionValues.length
    + (Array.isArray(scene.prompts?.[0]?.options) ? scene.prompts[0].options.length : 0)
    + (Array.isArray(scene.prompts?.[1]?.options) ? scene.prompts[1].options.length : 0)
    + (Array.isArray(scene.solutions) ? scene.solutions.length : 0)
  )
}

const migrationResult = migrateScenes()
const expectedCounts = {
  scenes: legacyScenes.length,
  clues: legacyScenes.reduce((sum, scene) => sum + normalizeArray(scene.emotionClues).length, 0),
  steps: legacyScenes.length * 4,
  options: legacyScenes.reduce((sum, scene) => sum + expectedOptionCount(scene), 0),
}

assert.equal(migrationResult.sceneCount, expectedCounts.scenes)
assert.equal(migrationResult.clueCount, expectedCounts.clues)
assert.equal(migrationResult.stepCount, expectedCounts.steps)
assert.equal(migrationResult.optionCount, expectedCounts.options)
reportCheck(
  'migration-result',
  `scenes=${migrationResult.sceneCount} clues=${migrationResult.clueCount} steps=${migrationResult.stepCount} options=${migrationResult.optionCount}`,
)

assert.equal(scalar('SELECT COUNT(*) FROM scenes'), expectedCounts.scenes)
assert.equal(scalar('SELECT COUNT(*) FROM clues'), expectedCounts.clues)
assert.equal(scalar('SELECT COUNT(*) FROM steps'), expectedCounts.steps)
assert.equal(scalar('SELECT COUNT(*) FROM options'), expectedCounts.options)
assert.equal(scalar('SELECT COUNT(*) FROM hints'), 0)
reportCheck(
  'table-counts',
  `scenes=${expectedCounts.scenes} clues=${expectedCounts.clues} steps=${expectedCounts.steps} options=${expectedCounts.options} hints=0`,
)

assert.equal(
  rows(`
    SELECT s.scene_code, COUNT(*) AS step_count
    FROM scenes s
    JOIN steps st ON st.scene_id = s.id
    GROUP BY s.scene_code
    HAVING COUNT(*) <> 4
  `).length,
  0,
)
reportCheck('scene-step-shape', 'every scene has exactly 4 steps')

const stepTypeMap = Object.fromEntries(
  rows(`
    SELECT step_type, COUNT(*) AS count
    FROM steps
    GROUP BY step_type
    ORDER BY step_type
  `).map((row) => [row.step_type, Number(row.count)]),
)

assert.deepEqual(stepTypeMap, {
  emotion: legacyScenes.length,
  need: legacyScenes.length,
  reason: legacyScenes.length,
  response: legacyScenes.length,
})
reportCheck('step-type-counts', JSON.stringify(stepTypeMap))

assert.equal(
  scalar(`SELECT COUNT(*) FROM scenes WHERE background_image_url IS NOT NULL AND instr(background_image_url, '\\') > 0`),
  0,
)
reportCheck('path-normalization', 'all stored scene paths use forward slashes')

assert.equal(
  scalar(`
    SELECT COUNT(*)
    FROM options o
    JOIN steps s ON s.id = o.step_id
    WHERE s.step_type = 'emotion'
      AND (o.color_hex IS NULL OR o.color_label IS NULL)
  `),
  0,
)
reportCheck('emotion-option-colors', 'all generated emotion options include color metadata')

assert.equal(
  scalar(`SELECT COUNT(*) FROM steps WHERE question_id IS NULL OR trim(question_id) = ''`),
  0,
)
reportCheck('question-ids', 'all generated steps have question_id')

const sceneOneSteps = rows(`
  SELECT s.scene_code, s.character_name, st.step_index, st.question_text, st.step_type
  FROM scenes s
  JOIN steps st ON st.scene_id = s.id
  WHERE s.scene_code = 'scene-1'
  ORDER BY st.step_index
`)

assert.equal(sceneOneSteps.length, 4)
assert.equal(sceneOneSteps[0]?.character_name, deriveCharacterName({ sceneCode: 'scene-1' }))
assert.equal(sceneOneSteps[0]?.question_text, '你觉得{name}现在是什么心情？')
assert.match(String(sceneOneSteps[1]?.question_text || ''), /\{name\}/)
assert.match(String(sceneOneSteps[2]?.question_text || ''), /\{name\}/)
assert.equal(sceneOneSteps[3]?.question_text, '下面哪种回应更合适？')
reportCheck('scene-1-sample', JSON.stringify(sceneOneSteps))

assert.equal(
  scalar(`SELECT COUNT(*) FROM scenes WHERE character_name IS NULL OR trim(character_name) = ''`),
  0,
)
reportCheck('character-names', 'all scenes have a non-empty character_name')

console.log('PASS verify-emotion-scene-phase1 complete')
