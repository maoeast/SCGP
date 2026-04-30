import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..')

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8')
}

async function readPackageJson() {
  return JSON.parse(await readRepoFile('package.json'))
}

test('update handlers default to generic self-hosted provider instead of GitHub releases', async () => {
  const updateHandlerSource = await readRepoFile('electron/handlers/update.js')

  assert.match(updateHandlerSource, /provider:\s*'generic'/, 'default provider should be generic')
  assert.match(
    updateHandlerSource,
    /https:\/\/upadate\.hzxckj308\.com\/scgp\/win/,
    'default self-hosted update URL should point to upadate.hzxckj308.com',
  )
  assert.doesNotMatch(updateHandlerSource, /owner:\s*'maoeast'/, 'GitHub owner should not remain in defaults')
  assert.doesNotMatch(updateHandlerSource, /repo:\s*'Self-Care-ATS'/, 'GitHub repo should not remain in defaults')
})

test('update handlers expose a clear error when the self-hosted update URL is missing', async () => {
  const updateHandlerSource = await readRepoFile('electron/handlers/update.js')

  assert.match(updateHandlerSource, /未配置自有更新源/, 'missing self-hosted URL should produce a clear error message')
})

test('windows installer artifact name stays aligned with updater metadata path', async () => {
  const packageJson = await readPackageJson()

  assert.equal(
    packageJson.build?.win?.artifactName,
    'scgp-setup-${version}.${ext}',
    'windows installer artifact name should stay stable and ASCII-only for updater metadata',
  )

  assert.deepEqual(
    packageJson.build?.publish,
    [
      {
        provider: 'generic',
        url: 'https://upadate.hzxckj308.com/scgp/win',
      },
    ],
    'electron-builder publish config should target the self-hosted update URL',
  )
})
