import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertApprovedArtifact, hashFile, loadScreenshotApprovals } from './user-manual-screenshot-approvals.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const defaultIndex = path.join(repoRoot, 'docs', 'user-manual', 'screenshot-approvals.json')
const defaultDestination = path.join(repoRoot, 'docs', 'user-manual', 'screenshots')

function parseArgs(argv) {
  const options = { ids: [], index: defaultIndex, destination: defaultDestination, dryRun: false, allowFormalOutput: false }
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i]
    if (value === '--ids') options.ids = String(argv[++i] || '').split(',').filter(Boolean)
    else if (value === '--approval-index') options.index = path.resolve(repoRoot, argv[++i] || '')
    else if (value === '--destination-dir') options.destination = path.resolve(repoRoot, argv[++i] || '')
    else if (value === '--dry-run') options.dryRun = true
    else if (value === '--allow-formal-output') options.allowFormalOutput = true
    else throw new Error(`Unknown argument: ${value}`)
  }
  return options
}

function withinRepo(target) {
  const relative = path.relative(repoRoot, target)
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!withinRepo(options.destination)) throw new Error('Destination must stay inside the repository')
  if (options.destination === defaultDestination && !options.dryRun && !options.allowFormalOutput) {
    throw new Error('Writing formal screenshots requires --allow-formal-output')
  }
  const approvals = loadScreenshotApprovals(repoRoot, options.index)
    .filter((entry) => options.ids.length === 0 || options.ids.includes(entry.id))
  if (approvals.length === 0) throw new Error('No approved screenshots selected')
  const results = approvals.map((entry) => {
    assertApprovedArtifact(entry)
    const destination = path.join(options.destination, `${entry.id}.png`)
    if (!options.dryRun) {
      fs.mkdirSync(options.destination, { recursive: true })
      if (fs.existsSync(destination) && hashFile(destination) !== entry.sha256) {
        throw new Error(`Destination already differs: ${entry.id}`)
      }
      if (!fs.existsSync(destination)) fs.copyFileSync(entry.artifactPath, destination)
      if (hashFile(destination) !== entry.sha256) throw new Error(`Copied screenshot hash mismatch: ${entry.id}`)
    }
    return entry.id
  })
  console.log(JSON.stringify({ mode: options.dryRun ? 'dry-run' : 'promoted', screenshots: results.length, destination: path.relative(repoRoot, options.destination) }, null, 2))
}

main()
