import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { hashFile, loadScreenshotApprovals } from './user-manual-screenshot-approvals.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const manualDir = path.join(repoRoot, 'docs', 'user-manual')

function parseArgs(argv) {
  const options = { index: path.join(manualDir, 'screenshot-approvals.json'), screenshotDir: path.join(manualDir, 'screenshots'), docx: null }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--approval-index') options.index = path.resolve(repoRoot, argv[++index] || '')
    else if (value === '--screenshot-dir') options.screenshotDir = path.resolve(repoRoot, argv[++index] || '')
    else if (value === '--docx') options.docx = path.resolve(repoRoot, argv[++index] || '')
    else throw new Error(`Unknown argument: ${value}`)
  }
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const approvals = loadScreenshotApprovals(repoRoot, options.index)
  for (const entry of approvals) {
    const imagePath = path.join(options.screenshotDir, `${entry.id}.png`)
    if (!fs.existsSync(imagePath) || hashFile(imagePath) !== entry.sha256) throw new Error(`Promoted screenshot failed verification: ${entry.id}`)
  }
  let embedded = 0
  if (options.docx) {
    const zip = await JSZip.loadAsync(fs.readFileSync(options.docx))
    const mediaHashes = new Set(await Promise.all(Object.values(zip.files)
      .filter((file) => /^word\/media\/.*\.png$/u.test(file.name))
      .map(async (file) => crypto.createHash('sha256').update(await file.async('nodebuffer')).digest('hex'))))
    for (const entry of approvals) {
      if (!mediaHashes.has(entry.sha256)) throw new Error(`DOCX does not embed approved screenshot: ${entry.id}`)
    }
    embedded = approvals.length
  }
  console.log(JSON.stringify({ approvals: approvals.length, embedded, docx: options.docx ? path.relative(repoRoot, options.docx) : null }, null, 2))
}

main()
