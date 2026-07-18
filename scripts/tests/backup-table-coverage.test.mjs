import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const backupSource = readFileSync(resolve(projectRoot, 'src/utils/backup.ts'), 'utf8')
const initSource = readFileSync(resolve(projectRoot, 'src/database/init.ts'), 'utf8')

function extractCreatedTables(source) {
  return new Set(
    Array.from(source.matchAll(/CREATE TABLE IF NOT EXISTS\s+([`"']?)([a-zA-Z0-9_]+)\1/g))
      .map((match) => match[2]),
  )
}

function extractExcludedBackupTables(source) {
  const match = source.match(/const EXCLUDED_BACKUP_TABLES = new Set\(\[\s*([\s\S]*?)\s*\]\)/)
  assert.ok(match, 'EXCLUDED_BACKUP_TABLES must stay explicit and reviewable')
  return new Set(
    Array.from(match[1].matchAll(/'([^']+)'/g))
      .map((item) => item[1]),
  )
}

const createdTables = extractCreatedTables(initSource)
const excludedBackupTables = extractExcludedBackupTables(backupSource)

test('backup export enumerates runtime tables instead of a hard-coded allowlist', () => {
  assert.match(backupSource, /FROM sqlite_master/)
  assert.match(backupSource, /WHERE type = 'table'/)
  assert.match(backupSource, /name NOT LIKE 'sqlite_%'/)
  assert.match(backupSource, /tableNames: backupTables/)
  assert.match(backupSource, /redactBackupTableRows\(tableName, tableData\)/)
})

test('backup excludes only transient table-rebuild scratch tables', () => {
  assert.deepEqual([...excludedBackupTables].sort(), [
    'equipment_training_records_new',
    'task_step_new',
    'train_log_new',
    'train_plan_detail_new',
  ])

  for (const tableName of excludedBackupTables) {
    assert.match(tableName, /_new$/, `${tableName} should be a temporary rebuild table`)
  }
})

test('backup coverage keeps resource, favorite, AI, and assessment tables in scope', () => {
  const mustBackupTables = [
    'student',
    'system_config',
    'report_record',
    'training_records',
    'equipment_training_records',
    'sys_training_resource',
    'sys_tags',
    'sys_resource_tag_map',
    'sys_favorites',
    'teaching_material',
    'teaching_material_favorite',
    'ai_agent',
    'ai_agent_skill',
    'ai_chat_session',
    'ai_chat_message',
    'ai_provider',
    'ai_provider_model',
    'sm_assess',
    'weefim_assess',
    'csirs_assess',
    'conners_psq_assess',
    'conners_trs_assess',
    'sdq_assess',
    'srs2_assess',
    'cbcl_assess',
    'fine_motor_assess',
    'cnbsr2016_assess',
    'gmfm_88_assess',
    'tgmd_3_assess',
    'brief_assess',
    'crt_assess',
    'cognitive_self_assess',
  ]

  for (const tableName of mustBackupTables) {
    assert.ok(createdTables.has(tableName), `${tableName} should exist in runtime schema`)
    assert.equal(excludedBackupTables.has(tableName), false, `${tableName} must not be excluded from backup`)
  }
})

test('v4 backup carries resource archives but does not carry provider secrets', () => {
  assert.match(backupSource, /const BACKUP_VERSION = '4\.0'/)
  assert.match(backupSource, /providerSecretsIncluded: false/)
  assert.match(backupSource, /window\.electronAPI\?\.packResourceArchive/)
  assert.match(backupSource, /resourceArchive: \{/)
  assert.match(backupSource, /window\.electronAPI\.unpackResourceArchive/)
})
