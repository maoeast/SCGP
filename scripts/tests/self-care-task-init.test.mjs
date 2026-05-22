import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('init database wires built-in self-care task seed sync after base data init', () => {
  const source = readFileSync(resolve(projectRoot, 'src/database/init.ts'), 'utf8');

  assert.match(source, /upsertSelfCareTaskSeedResources\(db\)/);
  assert.match(source, /resolveSelfCareTaskSeedMode/);
  assert.match(source, /SELF_CARE_TASK_SEED_RESOURCES/);
  assert.match(source, /SELF_CARE_TASK_SEED_SUMMARY/);
});

test('init database self-care seed sync supports overwrite and missing-only style modes', () => {
  const source = readFileSync(resolve(projectRoot, 'src/database/init.ts'), 'utf8');

  assert.match(source, /mode === 'missing-only' \|\| mode === 'preserve'/);
  assert.match(source, /UPDATE sys_training_resource/);
  assert.match(source, /INSERT INTO sys_training_resource/);
  assert.match(source, /legacyTaskCode/);
});
