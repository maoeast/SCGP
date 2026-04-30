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

function getTabPaneBlock(source, tabName) {
  const tabMarker = `name="${tabName}"`
  const markerIndex = source.indexOf(tabMarker)
  assert.notEqual(markerIndex, -1, `missing tab pane ${tabName}`)

  const startIndex = source.lastIndexOf('<el-tab-pane', markerIndex)
  assert.notEqual(startIndex, -1, `missing start tag for ${tabName}`)

  const endIndex = source.indexOf('</el-tab-pane>', markerIndex)
  assert.notEqual(endIndex, -1, `missing end tag for ${tabName}`)

  return source.slice(startIndex, endIndex + '</el-tab-pane>'.length)
}

test('software update panel lives under the about tab instead of devtools', async () => {
  const systemView = await readRepoFile('src/views/System.vue')
  const aboutTab = getTabPaneBlock(systemView, 'about')
  const devtoolsTab = getTabPaneBlock(systemView, 'devtools')

  assert.match(aboutTab, /<UpdatePanel\s*\/>/, 'about tab should render UpdatePanel')
  assert.doesNotMatch(devtoolsTab, /<UpdatePanel\s*\/>/, 'devtools tab should not render UpdatePanel')
})

test('preload forwards update event object and payload to renderer listeners', async () => {
  const preloadSource = await readRepoFile('electron/preload.mjs')

  assert.match(
    preloadSource,
    /callback\(_event,\s*\.\.\.args\)/,
    'preload should forward both the Electron event and payload arguments',
  )
})
