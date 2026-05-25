import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

test('sensory game seed includes the first three camera hand games', () => {
  const { SENSORY_GAME_SEED } = jiti('../../src/data/sensory-game-seed.ts')

  const names = SENSORY_GAME_SEED.map((game) => game.name)
  assert.equal(SENSORY_GAME_SEED.length >= 10, true)
  assert.equal(names.includes('空气木琴'), true)
  assert.equal(names.includes('木块磁贴拼图'), true)
  assert.equal(names.includes('森林手势魔法屋'), true)
})

test('TaskID reserves stable ids for sensory camera hand games', () => {
  const { TaskID } = jiti('../../src/types/games.ts')

  assert.equal(TaskID.HAND_XYLOPHONE, 8)
  assert.equal(TaskID.HAND_WOOD_BLOCKS, 9)
  assert.equal(TaskID.HAND_GESTURE_GARDEN, 10)
})

test('GamePlay wires the three hand games into the sensory runtime', () => {
  const source = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

  assert.match(source, /HandXylophoneGame/)
  assert.match(source, /WoodBlockPuzzleGame/)
  assert.match(source, /GestureGardenGame/)
  assert.match(source, /TaskID\.HAND_XYLOPHONE/)
  assert.match(source, /TaskID\.HAND_WOOD_BLOCKS/)
  assert.match(source, /TaskID\.HAND_GESTURE_GARDEN/)
})
