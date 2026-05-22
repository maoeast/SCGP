import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import createJiti from 'jiti';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
});

function loadSeedModule() {
  return jiti('../../src/data/self-care-task-seed.ts');
}

test('self-care task seed exports 31 built-in task resources with normalized metadata', () => {
  const {
    SELF_CARE_TASK_SEED_RESOURCES,
    SELF_CARE_TASK_SEED_SUMMARY,
  } = loadSeedModule();

  assert.equal(SELF_CARE_TASK_SEED_SUMMARY.totalTasks, 31);
  assert.equal(SELF_CARE_TASK_SEED_RESOURCES.length, 31);
  assert.equal(SELF_CARE_TASK_SEED_SUMMARY.totalSteps > 200, true);

  const spoonTask = SELF_CARE_TASK_SEED_RESOURCES.find((item) => item.legacyTaskCode === 'EAT_SPOON_001');
  assert.ok(spoonTask);
  assert.equal(spoonTask.category, '使用勺子');
  assert.equal(spoonTask.coverImage, 'images/tasks/EAT_SPOON_001_cover.jpg');
  assert.equal(spoonTask.metadata.trainingEntryCode, 'life-skills');
  assert.equal(spoonTask.metadata.steps.length, 8);
  assert.equal(spoonTask.metadata.steps[0]?.imagePath, 'resource://images/tasks/EAT_SPOON_001/1.png');
  assert.deepEqual(spoonTask.metadata.abilityItem, {
    id: 'feed_01',
    name: '独立进食',
  });
});

test('self-care task seed mode validates explicit values and falls back to a supported mode', () => {
  const { resolveSelfCareTaskSeedMode } = loadSeedModule();

  assert.equal(resolveSelfCareTaskSeedMode('overwrite'), 'overwrite');
  assert.equal(resolveSelfCareTaskSeedMode('preserve'), 'preserve');
  assert.equal(resolveSelfCareTaskSeedMode('missing-only'), 'missing-only');
  assert.equal(['overwrite', 'missing-only'].includes(resolveSelfCareTaskSeedMode('unexpected-mode')), true);
});
