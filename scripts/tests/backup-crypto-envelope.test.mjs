import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

const backupCrypto = jiti('../../src/utils/backup-crypto.ts')
const legacyBackupCrypto = jiti('../../src/utils/legacy-backup-crypto.ts')

const STRONG_PASSWORD = 'correct horse battery staple'

test('v4 backup envelope round-trips plaintext with the same password', async () => {
  const plaintext = JSON.stringify({
    version: '4.0',
    timestamp: 1700000000000,
    tables: { system_config: [] },
    metadata: { systemName: 'SCGP / 星愿能力发展平台', totalRecords: 0, tableCount: 1 },
  })

  const encrypted = await backupCrypto.encryptBackupEnvelope(plaintext, STRONG_PASSWORD)
  const envelope = JSON.parse(encrypted)

  assert.equal(envelope.format, 'scgp-backup')
  assert.equal(envelope.cryptoVersion, 1)
  assert.equal(envelope.iterations, 310000)
  assert.equal(envelope.cipher, 'AES-256-GCM')
  assert.equal(envelope.kdf, 'PBKDF2-SHA-256')
  assert.ok(!encrypted.includes('system_config'), 'envelope must not expose plaintext table names')
  assert.ok(!encrypted.includes('SPED-PASSWORD-SECURITY-KEY-2025'), 'envelope must not carry the legacy fixed secret')

  const decrypted = await backupCrypto.decryptBackupEnvelope(encrypted, STRONG_PASSWORD)
  assert.equal(decrypted, plaintext)
})

test('v4 backup envelope rejects weak, wrong, and tampered passwords/data', async () => {
  await assert.rejects(
    () => backupCrypto.encryptBackupEnvelope('payload', 'short'),
    (error) => error.code === 'weak_password',
  )

  const encrypted = await backupCrypto.encryptBackupEnvelope('payload', STRONG_PASSWORD)

  await assert.rejects(
    () => backupCrypto.decryptBackupEnvelope(encrypted, 'wrong password value'),
    (error) => error.code === 'decrypt_failed',
  )

  const tampered = JSON.parse(encrypted)
  tampered.ciphertext = `${tampered.ciphertext.slice(0, -4)}AAAA`
  await assert.rejects(
    () => backupCrypto.decryptBackupEnvelope(JSON.stringify(tampered), STRONG_PASSWORD),
    (error) => error.code === 'decrypt_failed',
  )
})

test('v4 backup envelope uses random salt and iv for repeated exports', async () => {
  const first = JSON.parse(await backupCrypto.encryptBackupEnvelope('same payload', STRONG_PASSWORD))
  const second = JSON.parse(await backupCrypto.encryptBackupEnvelope('same payload', STRONG_PASSWORD))

  assert.notEqual(first.salt, second.salt)
  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.ciphertext, second.ciphertext)
})

test('legacy v3 backup fixture remains readable through the compatibility path', async () => {
  const fixturePath = resolve(projectRoot, 'scripts/tests/fixtures/backup-v3-minimal.scgp')
  const fixture = (await readFile(fixturePath, 'utf8')).trim()
  const decrypted = legacyBackupCrypto.decryptLegacyBackupData(fixture)
  const json = typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted)
  const backupData = JSON.parse(json)

  assert.equal(backupData.version, '3.0')
  assert.equal(backupData.metadata.systemName, 'SCGP / 星愿能力发展平台')
})
