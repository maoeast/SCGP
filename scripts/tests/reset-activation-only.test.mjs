import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import { resetActivationOnly } from '../reset-activation-only.mjs'

const sqlJsModule = await import('sql.js')
const initSqlJs = sqlJsModule.default || sqlJsModule.initSqlJs
const SQL = await initSqlJs({
  locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
})

function buildDatabaseBuffer() {
  const db = new SQL.Database()

  db.run(`
    CREATE TABLE activation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_code TEXT NOT NULL,
      activation_code TEXT NOT NULL,
      is_valid INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT
    );

    CREATE TABLE system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
  `)

  db.run(`
    INSERT INTO activation (machine_code, activation_code, is_valid) VALUES
    ('MACHINE-A', 'CODE-1', 1),
    ('MACHINE-B', 'CODE-2', 1);

    INSERT INTO system_config (key, value) VALUES
    ('first_run_time', '2026-01-01T00:00:00.000Z'),
    ('system_name', 'SCGP');

    INSERT INTO student (name) VALUES ('测试学生');
  `)

  const buffer = Buffer.from(db.export())
  db.close()
  return buffer
}

function getCount(db, sql) {
  const stmt = db.prepare(sql)
  try {
    assert.equal(stmt.step(), true)
    const row = stmt.getAsObject()
    return Number(Object.values(row)[0] || 0)
  } finally {
    stmt.free()
  }
}

test('resetActivationOnly clears activation and local storage but preserves business data by default', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'scgp-reset-activation-'))
  const userDataDir = path.join(tempRoot, 'scgp')
  const localStorageDir = path.join(userDataDir, 'Local Storage')
  const dbPath = path.join(userDataDir, 'database.sqlite')

  await fs.mkdir(localStorageDir, { recursive: true })
  await fs.writeFile(dbPath, buildDatabaseBuffer())
  await fs.writeFile(path.join(localStorageDir, 'leveldb-placeholder.txt'), 'cache')

  const summary = await resetActivationOnly({ userDataDir })

  assert.equal(summary.activationRowsBefore, 2)
  assert.equal(summary.activationRowsAfter, 0)
  assert.equal(summary.firstRunTimeRowsBefore, 1)
  assert.equal(summary.firstRunTimeRowsAfter, 1)
  assert.equal(typeof summary.localStorageBackupPath, 'string')

  const db = new SQL.Database(new Uint8Array(await fs.readFile(dbPath)))
  assert.equal(getCount(db, 'SELECT COUNT(*) FROM activation WHERE is_valid = 1'), 0)
  assert.equal(getCount(db, "SELECT COUNT(*) FROM system_config WHERE key = 'first_run_time'"), 1)
  assert.equal(getCount(db, 'SELECT COUNT(*) FROM student'), 1)
  db.close()
})

test('resetActivationOnly can also delete first_run_time when resetTrial is enabled', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'scgp-reset-activation-trial-'))
  const userDataDir = path.join(tempRoot, 'scgp')
  const dbPath = path.join(userDataDir, 'database.sqlite')

  await fs.mkdir(userDataDir, { recursive: true })
  await fs.writeFile(dbPath, buildDatabaseBuffer())

  const summary = await resetActivationOnly({ userDataDir, resetTrial: true })

  assert.equal(summary.activationRowsAfter, 0)
  assert.equal(summary.firstRunTimeRowsAfter, 0)
})
